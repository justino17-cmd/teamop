/* ══ LES APPELS À DEUX — LE CHEF D'ORCHESTRE : LE RELAIS, LES SIGNAUX, LES SONNERIES ÉCHUES, LES APPAREILS PERDUS ══════════════════════════════════
 *
 * `stockage.js` range l'état d'un appel (et chaque changement d'état écrit son événement durable) ; `routes-appels.js` lit la demande ; ICI se décide ce qui se passe AUTOUR : à qui l'on
 * relaie un signal, quand une sonnerie est échue, quand un appareil a disparu, qui reçoit un push. Rien d'ici ne lit un média : le service ne voit JAMAIS un octet de voix ni d'image — les deux
 * pages se les envoient directement (ou par le relais), il ne fait que leur faire passer des messages de mise en relation.
 *
 * ⛔ LE SERVICE NE LIT PAS LE SDP. Un signal est une enveloppe `{ type, donnees }` : on vérifie qui l'envoie (un participant, par l'appareil LIÉ à l'appel), à qui (l'AUTRE participant), de quel genre
 * (une liste fermée), quelle taille (16 Ko) et quel débit — jamais ce qu'il y a dedans. Les adresses réseau des appareils (les candidats) n'atteignent que l'appareil lié de l'autre participant, jamais
 * ses autres sessions (`flux.emettreSession`), et ne sont ni rangées ni journalisées.
 * ⛔ LE RELAIS (coturn) N'EST JAMAIS REMPLACÉ PAR UN SERVEUR D'UN TIERS. Sans secret configuré (avant le geste de Justin, `install-turn.sh`), `GET /api/ice` rend une liste VIDE et dit `relais:false` :
 * l'appel ne passe alors que si les deux appareils se joignent directement. Aucun STUN public (Google…) n'est jamais proposé en repli — rien ne sort de nos machines.
 * ⛔ LES IDENTIFIANTS DU RELAIS SONT ÉPHÉMÈRES : `username = <échéance en secondes>:<identifiant de la personne>`, `credential = base64(HMAC-SHA1(secret, username))` — le schéma « REST » que coturn
 * vérifie seul (`use-auth-secret`). Le secret ne quitte jamais ce module : ni la réponse, ni le journal, ni /health ne le portent.
 * ⛔ UNE SONNERIE ÉCHUE FAIT UN APPEL MANQUÉ, UNE SEULE FOIS : l'échéance est jugée par l'horloge DU SERVICE (injectée : un banc l'avance au geste), la notification s'écrit dans la transaction du passage
 * `sonne → manque` (`stockage.appelsEchoir`), le push part ensuite — un redémarrage, un second passage ou une restauration ne les refont pas.
 * ⛔ UN APPAREIL QUI DISPARAÎT NE TIENT PAS UN APPEL (ni une personne « occupée ») POUR TOUJOURS. Tout signe d'un appareil lié — chaque signal accepté, dont le POULS que la page envoie toutes les 15 s —
 * est noté en mémoire ; sans signe pendant `perduMs` (45 s), l'appel est fini « connexion perdue » et l'autre l'apprend. Une page tuée, un réseau coupé, un onglet suspendu : tous se terminent ainsi,
 * qu'aucune connexion fermée ne le dise ou non. Un redémarrage du service repart d'un état neuf (chacun a `perduMs` pour se manifester) : un déploiement ne coupe pas les appels en cours.
 * ⛔ UN PUSH D'APPEL EST MINIMAL PAR DÉFAUT, COMME CELUI D'UN MESSAGE : « Appel entrant », sans nom — le nom de l'appelant ne part que pour qui a activé l'aperçu (`push.js`, règle du lot 3). Sur iPhone,
 * une page web n'a pas de CallKit : application fermée, un appel est une NOTIFICATION, pas une sonnerie (SERVEUR.md § 5, question 10).
 */
'use strict';
const crypto = require('crypto');

const ID_APPEL = /^a_[0-9a-f]{32}$/;
const SIGNAL_OCTETS_MAX = 16384;                                 // « 16 Ko au plus » (SERVEUR.md § 3.3)
const TYPES_SIGNAL = ['offre', 'reponse', 'candidats', 'etat', 'pouls'];
const ELAGAGE_PERIODE_MS = 3600000;
const RING_ACK_MS = 1500;                                         // une page sous les yeux acquitte la sonnerie en une seconde : au-delà, personne ne la voit, la notification part (push.js : une charge ne raccourcit l'attente que de celle du service)
const RING_PUSH_TTL_S = 30;                                       // « urgency high, durée de vie 30 s » (SERVEUR.md § 3.3)
const erreur = (code) => Object.assign(new Error(code), { code });
const nomAffiche = (p) => (p && ((p.prenom + ' ' + p.nom).trim())) || 'Quelqu\'un';

/* Les identifiants éphémères du relais pour `uid` à l'instant `maintenantMs`. Pure : le banc recalcule la même chose avec `crypto`, sans passer par cette fonction. */
function identifiantsRelais(relais, uid, maintenantMs) {
  const expire = Math.floor(maintenantMs / 1000) + relais.ttlS;
  const username = expire + ':' + uid;
  return { username, credential: crypto.createHmac('sha1', relais.secret).update(username).digest('base64'), expire };
}

function creerAppels({ stockage, hub, push, config, horloge = Date.now, journaliser = () => {} }) {
  const cfg = config.appels;
  const vus = new Map();                 // "appel|personne" → l'instant du dernier signe de vie de l'appareil lié
  const etat = { dernierTour: null, echecs: 0, perdus: 0, dernierElagage: 0 };
  let minuteur = null, arrete = true;
  const cle = (id, uid) => id + '|' + uid;
  const vivre = (id, uid) => { vus.set(cle(id, uid), horloge()); };
  const reveiller = (uids) => { try { hub.reveiller({ uids: Array.from(new Set(uids)).filter(Boolean) }); } catch (e) { /* un flux qui échoue ne défait rien */ } };
  const pousser = (uid, charge, gid) => { try { if (push) push.pousser(uid, charge, { gid }); } catch (e) { /* un push raté ne défait rien */ } };

  /* ── le relais ── */
  const relaisPose = () => !!cfg.relais;
  function ice(uid) {
    const r = cfg.relais;
    if (!r) return { relais: false, ttl_s: 0, serveurs: [] };
    const id = identifiantsRelais(r, uid, horloge());
    const hote = r.hote;
    /* ⛔ DEUX adresses de relais, pas trois : le navigateur ouvre UNE ALLOCATION par adresse (mesuré par la sonde, contre le vrai coturn : deux par côté avec deux adresses), et chaque allocation RÉSERVE
       sa part de la capacité du relais (`bps-capacity` ÷ `max-bps`) — trois adresses, c'était six allocations par appel relayé. L'UDP d'abord (le chemin des appels) ; en secours, le TLS quand le
       certificat existe (les réseaux d'entreprise qui ne laissent passer que du TLS), sinon le TCP simple — le TCP simple ET le TLS ensemble n'ajoutaient rien : un réseau qui bloque l'UDP et le 5349
       n'ouvre pas non plus le 3478. */
    const urls = ['turn:' + hote + ':' + r.port + '?transport=udp'];
    urls.push(r.portTls ? 'turns:' + hote + ':' + r.portTls + '?transport=tcp' : 'turn:' + hote + ':' + r.port + '?transport=tcp');
    return { relais: true, ttl_s: r.ttlS, serveurs: [{ urls: ['stun:' + hote + ':' + r.port] }, { urls, username: id.username, credential: id.credential }] };
  }

  /* ── les pushs ── */
  function pousserSonnerie({ id, type, appelant, appele, gid }) {
    pousser(appele, {
      type: 'appel', tag: 'appel:' + id, url: '/#appels', renotify: true, urgence: 'high', ttl: RING_PUSH_TTL_S, ackMs: RING_ACK_MS,
      titre: 'OP MESSAGES', corps: 'Appel entrant',
      detail: { titre: 'Appel de ' + nomAffiche(appelant), corps: type === 'video' ? 'Appel vidéo' : 'Appel audio' },
      /* re-jugé à l'instant de partir : l'appel sonne-t-il ENCORE pour cette personne (personne n'a répondu, refusé, ni raccroché) ? et ce qui reste de sa sonnerie borne la durée de vie du push */
      valide: () => {
        const a = stockage.appelAcces(id, appele);
        if (!a || a.etat !== 'sonne') return false;
        const reste = Math.floor((a.sonne_jusqua - horloge()) / 1000);
        return reste > 0 ? { ttl: Math.min(RING_PUSH_TTL_S, reste) } : false;
      },
    }, gid);
  }
  /* Un appel manqué : la notification est déjà écrite (durable) ; ce push suit les règles du lot 3 — personne joignable, appareil abonné (`push.js`), et la SOURDINE de la conversation directe le coupe. Il remplace
     la notification de la sonnerie (même étiquette). */
  function pousserManque(notif, { id, type, appelant }) {
    if (!notif || notif.sourdine) return;
    pousser(notif.uid, {
      type: 'appel', tag: 'appel:' + id, url: '/#appels', renotify: true, titre: 'OP MESSAGES', corps: 'Appel manqué',
      detail: { titre: 'Appel manqué', corps: nomAffiche(appelant) + (type === 'video' ? ' · vidéo' : '') },
    }, notif.gid);
  }
  const personne = (uid) => stockage.personneParId(uid);

  /* ── lancer, répondre, raccrocher ── */
  /* → { vue, occupe }. Lève `occupe_moi` (l'appelant est déjà dans un appel). L'appelé occupé : l'appel est écrit « occupe » (il le lit « Manqué »), `occupe` vaut vrai. */
  function creer({ moi, appele, type, sessionH }) {
    const r = stockage.appelCreer({ appelant: moi.id, appele, type, session: sessionH, sonnerieMs: cfg.sonnerieMs });
    vivre(r.id, moi.id);
    reveiller([appele, moi.id]);
    if (r.occupe) pousserManque(r.notif, { id: r.id, type, appelant: moi });
    else pousserSonnerie({ id: r.id, type, appelant: moi, appele, gid: r.gids[appele] });
    return { vue: r.vue, occupe: r.occupe };
  }
  function repondre({ moi, id, sessionH, accepte }) {
    echoir();                                                 // une sonnerie échue ne se prend plus, même si le balayeur n'est pas encore passé
    const r = stockage.appelRepondre({ id, uid: moi.id, session: sessionH, accepte });
    if (!r.deja) { if (accepte) vivre(id, moi.id); reveiller(Object.keys(r.gids)); }
    return r;
  }
  function quitter({ moi, id, sessionH }) {
    echoir();
    const r = stockage.appelQuitter({ id, uid: moi.id, session: sessionH });
    if (!r.deja) {
      reveiller(Object.keys(r.gids));
      if (r.notif) pousserManque(r.notif, { id, type: r.vue ? r.vue.type : 'audio', appelant: moi });
    }
    vus.delete(cle(id, moi.id));
    return r;
  }

  /* ── le signal ── */
  /* `acces` : le laissez-passer de la garde AP. Lève `appel_fini`, `appareil_non_lie`, `appel_pas_en_cours`. → { relaye } */
  function signal({ moi, acces, sessionH, type, donnees }) {
    const a = stockage.appelAcces(acces.id, moi.id);          // l'état À CET INSTANT (la garde l'a lu un instant plus tôt, rien n'attend entre les deux : une relecture ne coûte rien)
    if (!a) throw erreur('introuvable');
    if (a.etat !== 'sonne' && a.etat !== 'en_cours') throw erreur('appel_fini');
    if (!a.session || a.session !== sessionH) throw erreur('appareil_non_lie');
    vivre(a.id, moi.id);                                      // tout signal accepté prouve que l'appareil est là
    if (type === 'pouls') return { relaye: false };
    if (a.etat !== 'en_cours') throw erreur('appel_pas_en_cours');
    const autre = a.autre ? stockage.appelAcces(a.id, a.autre) : null;
    if (!autre || !autre.session) throw erreur('appel_pas_en_cours');
    hub.emettreSession(autre.session, 'signal', { appel: a.id, de: moi.id, type, donnees: donnees === undefined ? null : donnees });
    return { relaye: true };
  }

  /* ── un blocage coupe l'appel en cours entre les deux personnes ── */
  function bloquer(a, b) {
    const reveil = stockage.appelsFinirEntre(a, b);
    if (reveil.length) reveiller(reveil);
  }

  /* ── la personne demande la suppression de son compte : ses sessions sont coupées à l'instant, l'appel qu'elle tenait ne se tient donc plus — il se TERMINE tout de suite (l'autre l'apprend), au lieu
     d'attendre `perduMs` qu'on le dise « perdu ». Une sonnerie en cours est annulée : l'appelé l'a manquée, comme à tout raccroché de l'appelant. → vrai si un appel a été terminé ── */
  function terminerDe(uid) {
    const id = stockage.appelActifDe(uid);
    if (!id) return false;
    const acces = stockage.appelAcces(id, uid);
    const f = stockage.appelFinir({ id, motif: 'compte' });
    if (f.deja) return false;
    reveiller(Object.keys(f.gids));
    if (f.notif) pousserManque(f.notif, { id, type: acces ? acces.type : 'audio', appelant: personne(uid) });
    vus.delete(cle(id, uid));
    return true;
  }

  /* ── le balayeur ── */
  function echoir() {
    const faits = stockage.appelsEchoir(horloge());
    for (const f of faits) {
      reveiller(Object.keys(f.gids));
      if (f.notif) pousserManque(f.notif, { id: f.id, type: f.type, appelant: personne(f.appelant) });
    }
    return faits.length;
  }
  /* UN PASSAGE. Synchrone, ne lève jamais. → { echus, perdus } */
  function balayer() {
    const t = horloge(), bilan = { echus: 0, perdus: 0 };
    try {
      bilan.echus = echoir();
      const vivants = new Set();
      for (const a of stockage.appelsActifs()) {
        vivants.add(a.id);
        for (const p of a.parts) {
          if (!p.session) continue;                           // l'appelé qui sonne encore n'est lié à aucun appareil : la sonnerie a son échéance
          const k = cle(a.id, p.uid);
          if (!vus.has(k)) vus.set(k, t);                     // jamais vu depuis le démarrage : il a `perduMs` pour se manifester
          const ref = vus.get(k);
          if (t - ref <= cfg.perduMs) continue;
          const f = stockage.appelFinir({ id: a.id, motif: 'perdu', fin: Math.max(ref, a.repondu === null ? a.cree : a.repondu) });
          if (f.deja) break;
          bilan.perdus++; etat.perdus++;
          journaliser('appel_perdu', { n: 1 });                // le JOURNAL le sait (sans appel ni personne) ; /health, publique, ne le dit plus : un compteur d'appels perdus est une activité
          reveiller(Object.keys(f.gids));
          if (f.notif) pousserManque(f.notif, { id: a.id, type: a.type, appelant: personne(p.uid) });
          break;
        }
      }
      for (const k of Array.from(vus.keys())) if (!vivants.has(k.slice(0, k.indexOf('|')))) vus.delete(k);
      if (t - etat.dernierElagage >= ELAGAGE_PERIODE_MS) {
        stockage.appelsElaguer(t - cfg.historiqueJours * 86400000);
        etat.dernierElagage = t;
      }
      etat.echecs = 0;
    } catch (e) {
      etat.echecs++;
      journaliser('appels_echec', { nom: (e && (e.code || e.name)) || 'Erreur' });
    }
    etat.dernierTour = horloge();
    return bilan;
  }
  function planifier(delai) {
    if (arrete) return;
    minuteur = setTimeout(() => { balayer(); planifier(cfg.balayageMs); }, delai);
    if (minuteur.unref) minuteur.unref();
  }
  /* Démarre le balayeur : un premier passage une seconde après le démarrage (un redémarrage rattrape les sonneries échues pendant l'arrêt). Les appels qui couraient avant l'arrêt repartent avec un signe de
     vie « maintenant » (`balayer` l'inscrit au premier passage) : un déploiement ne les coupe pas. */
  function demarrer() { if (!arrete) return; arrete = false; planifier(Math.min(1000, cfg.balayageMs)); }
  function arreter() { arrete = true; if (minuteur) { clearTimeout(minuteur); minuteur = null; } }

  /* ⛔ /health : un booléen et des NOMBRES — jamais un appel, une personne, ni (surtout) combien d'appels sont EN COURS (une activité, et /health est publique). `ageS` : secondes depuis le dernier passage du balayeur.
     ⛔ Plus de `perdus` (relecture, R6) : le nombre d'appels finis « connexion perdue » depuis le démarrage dit à n'importe qui comment se portent les réseaux des gens, et aucun seuil n'avait de sens — le journal
     du service garde une ligne `appel_perdu` par fin (sans appel ni personne), et chaque fin est écrite avec son motif dans l'historique de la personne. */
  function sante() {
    return { turn: relaisPose(), ageS: etat.dernierTour === null ? null : Math.max(0, Math.round((horloge() - etat.dernierTour) / 1000)), echecs: etat.echecs };
  }

  return { ice, creer, repondre, quitter, signal, bloquer, terminerDe, balayer, echoir, demarrer, arreter, sante, relais: relaisPose, etat };
}

module.exports = { creerAppels, identifiantsRelais, ID_APPEL, TYPES_SIGNAL, SIGNAL_OCTETS_MAX };
