/* ══ LES APPELS — LE CHEF D'ORCHESTRE : LE RELAIS, LES SIGNAUX, LES SONNERIES ÉCHUES, LES APPAREILS PERDUS, LES SALLES ═══════════════════════════════════════
 *
 * `stockage.js` range l'état d'un appel (et chaque changement d'état écrit son événement durable) ; `routes-appels.js` et `routes-salles.js` lisent la demande ; ICI se décide ce qui se passe AUTOUR : à qui l'on
 * relaie un signal, quand une sonnerie est échue, quand un appareil a disparu, qui reçoit un push, ce que les participants d'une salle se disent d'éphémère (une main levée, une réaction, un sondage).
 * Rien d'ici ne lit un média : le service ne voit JAMAIS un octet de voix ni d'image — les pages se les envoient directement (ou par le relais), il ne fait que leur faire passer des messages de mise en relation.
 *
 * ⛔ LE SERVICE NE LIT PAS LE SDP. Un signal est une enveloppe `{ type, donnees }` : on vérifie qui l'envoie (un participant, par l'appareil LIÉ à l'appel), à qui (l'AUTRE participant d'un appel à deux ; un participant
 * PRÉSENT de la salle — admis, pas exclu, pas parti — pour une salle en maille), de quel genre (une liste fermée), quelle taille (16 Ko) et quel débit — jamais ce qu'il y a dedans. Les adresses réseau des
 * appareils (les candidats) n'atteignent que l'appareil lié du destinataire, jamais ses autres sessions (`flux.emettreSession`), et ne sont ni rangées ni journalisées.
 * ⛔ LE RELAIS (coturn) N'EST JAMAIS REMPLACÉ PAR UN SERVEUR D'UN TIERS. Sans secret configuré (avant le geste de Justin, `install-turn.sh`), `GET /api/ice` rend une liste VIDE et dit `relais:false` :
 * l'appel ne passe alors que si les appareils se joignent directement. Aucun STUN public (Google…) n'est jamais proposé en repli — rien ne sort de nos machines.
 * ⛔ LES IDENTIFIANTS DU RELAIS SONT ÉPHÉMÈRES : `username = <échéance en secondes>:<identifiant de la personne>`, `credential = base64(HMAC-SHA1(secret, username))` — le schéma « REST » que coturn
 * vérifie seul (`use-auth-secret`). Le secret ne quitte jamais ce module : ni la réponse, ni le journal, ni /health ne le portent.
 * ⛔ UNE SONNERIE ÉCHUE FAIT UN APPEL MANQUÉ, UNE SEULE FOIS : l'échéance est jugée par l'horloge DU SERVICE (injectée : un banc l'avance au geste), la notification s'écrit dans la transaction du passage
 * `sonne → manque` (`stockage.appelsEchoir`), le push part ensuite — un redémarrage, un second passage ou une restauration ne les refont pas.
 * ⛔ UN APPAREIL QUI DISPARAÎT NE TIENT PAS UN APPEL (ni une personne « occupée ») POUR TOUJOURS. Tout signe d'un appareil lié — chaque signal accepté, dont le POULS que la page envoie toutes les 15 s —
 * est noté en mémoire ; sans signe pendant `perduMs` (45 s), l'appel à deux est fini « connexion perdue » et l'autre l'apprend ; dans une salle, c'est LA PERSONNE qui sort (la salle continue pour les autres).
 * Un redémarrage du service repart d'un état neuf (chacun a `perduMs` pour se manifester) : un déploiement ne coupe pas les appels en cours.
 * ⛔ UN PUSH D'APPEL EST MINIMAL PAR DÉFAUT, COMME CELUI D'UN MESSAGE : « Appel entrant », sans nom — le nom de l'appelant ne part que pour qui a activé l'aperçu (`push.js`, règle du lot 3). Sur iPhone,
 * une page web n'a pas de CallKit : application fermée, un appel est une NOTIFICATION, pas une sonnerie (SERVEUR.md § 5, question 10).
 * ⛔ CE QU'UNE SALLE NE PEUT PAS IMPOSER, ELLE LE DIT. Admettre, verrouiller, exclure, la capacité, l'hôte qui passe la main : le SERVICE les impose (il ne relaie plus rien à qui n'est pas présent). Couper le micro d'autrui
 * et « tout couper » ne sont qu'une DEMANDE (`salle_evt`, `couper_micro`) que la page de chacun honore ou non : un navigateur ne se laisse pas couper son micro à distance, et le serveur ne voit pas un média.
 * ⛔ L'ÉPHÉMÈRE D'UNE SALLE (mains levées, états caméra/micro/écran, sondage, minuteur, épingle) vit en MÉMOIRE et nulle part ailleurs : jamais en base, jamais dans un journal. Il est borné (2 Ko par geste, quelques
 * Ko par salle), oublié quand la salle finit ou que la personne en sort, et rendu à qui entre (`etatSalle`) pour qu'une page qui arrive voie ce qui s'est passé avant elle.
 */
'use strict';
const crypto = require('crypto');

const ID_APPEL = /^a_[0-9a-f]{32}$/;
const SIGNAL_OCTETS_MAX = 16384;                                 // « 16 Ko au plus » (SERVEUR.md § 3.3)
const TYPES_SIGNAL = ['offre', 'reponse', 'candidats', 'etat', 'pouls'];
const EVT_OCTETS_MAX = 2048;                                     // « événements éphémères de 2 Ko au plus » (SERVEUR.md § 3.3)
const REACTIONS = ['pouce', 'coeur', 'bravo', 'rire'];            // Pouce, Cœur, Bravo, Rire (THEME-OPMESSAGES) : des mots, la page choisit le dessin
const SONDAGE_CHOIX_MAX = 6, SONDAGE_QUESTION_MAX = 200, SONDAGE_CHOIX_LONG_MAX = 80, MINUTEUR_MAX_S = 3600;
const SALLES_ETAT_MAX = 2000;
/* LES ANNOTATIONS (7 octobre 2026 : « partage d'écran, dessiner sur l'écran, ajouter du texte ») : ce qui est dessiné sur l'écran partagé ou le tableau blanc, en MÉMOIRE comme le reste de
   l'éphémère d'une salle (jamais en base, jamais dans un journal), borné : 400 traits ou textes, 256 Ko de points ; un trait arrive en morceaux pendant qu'on dessine (600 points au plus
   par envoi, 4 000 par trait). Les coordonnées sont des entiers 0..10 000, relatifs à l'image (l'écran partagé ou le tableau), pas aux pixels d'un appareil. */
const ANNOT_ITEMS_MAX = 400, ANNOT_OCTETS_MAX = 262144, ANNOT_POINTS_MAX = 4000, ANNOT_POINTS_ENVOI_MAX = 600, ANNOT_TEXTE_MAX = 200;
const ANNOT_OUTILS = ['stylo', 'surligneur', 'fleche', 'rect', 'ellipse'], ANNOT_COULEURS = ['rouge', 'orange', 'jaune', 'vert', 'bleu', 'violet', 'noir', 'blanc'];
const ID_ANNOT = /^[A-Za-z0-9_-]{6,32}$/;
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

/* Le poids d'un geste éphémère, SANS jamais lever (un objet imbriqué sur des milliers de niveaux fait jeter `JSON.stringify`). → des octets, ou Infinity. */
function tailleEvt(d) {
  const pile = [[d, 1]];
  let noeuds = 0;
  while (pile.length) {
    const [x, niveau] = pile.pop();
    if (x === null || typeof x !== 'object') continue;
    if (niveau > 6 || ++noeuds > 256) return Infinity;
    for (const k of Object.keys(x)) pile.push([x[k], niveau + 1]);
  }
  try { return Buffer.byteLength(JSON.stringify(d), 'utf8'); } catch (e) { return Infinity; }
}

function creerAppels({ stockage, hub, push, config, formule = null, horloge = Date.now, journaliser = () => {} }) {
  const cfg = config.appels;
  const vus = new Map();                 // "appel|personne" → l'instant du dernier signe de vie de l'appareil lié
  const salles = new Map();              // identifiant d'appel → l'éphémère de la salle (mains, états, sondage, minuteur, épingle) — MÉMOIRE SEULEMENT
  const etat = { dernierTour: null, echecs: 0, perdus: 0, dernierElagage: 0 };
  let minuteur = null, arrete = true;
  const cle = (id, uid) => id + '|' + uid;
  const vivre = (id, uid) => { vus.set(cle(id, uid), horloge()); };
  const reveiller = (uids) => { try { hub.reveiller({ uids: Array.from(new Set(uids)).filter(Boolean) }); } catch (e) { /* un flux qui échoue ne défait rien */ } };
  const pousser = (uid, charge, gid) => { try { if (push) push.pousser(uid, charge, { gid }); } catch (e) { /* un push raté ne défait rien */ } };
  const capaciteDe = (type) => type === 'video' ? cfg.maxVideo : cfg.maxAudio;

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
  function pousserSonnerie({ id, type, appelant, appele, gid, groupe }) {
    pousser(appele, {
      type: 'appel', tag: 'appel:' + id, url: '/#appels', renotify: true, urgence: 'high', ttl: RING_PUSH_TTL_S, ackMs: RING_ACK_MS,
      titre: 'OP MESSAGES', corps: 'Appel entrant',
      detail: { titre: (groupe ? 'Appel de groupe de ' : 'Appel de ') + nomAffiche(appelant), corps: type === 'video' ? 'Appel vidéo' : 'Appel audio' },
      /* re-jugé à l'instant de partir : l'appel sonne-t-il ENCORE pour cette personne (personne n'a répondu, refusé, ni raccroché) ? et ce qui reste de sa sonnerie borne la durée de vie du push */
      valide: () => {
        const a = stockage.appelAcces(id, appele);
        if (!a) return false;
        const sonne = a.genre === 'deux' ? a.etat === 'sonne' : ((a.etat === 'sonne' || a.etat === 'en_cours') && a.statut === 'invite');
        if (!sonne) return false;
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
  /* les notifications de manqué d'une SALLE : l'appelant est celui qui l'a lancée, quel que soit l'hôte du moment */
  function manquesDe(id, type, notifs) { const a = personne(stockage.appelAppelant(id)); for (const n of notifs || []) pousserManque(n, { id, type, appelant: a }); }

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
  /* ⛔ UN APPEL À PLUSIEURS : `invites` sont déjà jugés par la route (le droit de les joindre, les plafonds). Chaque invité qui peut sonner reçoit sa sonnerie ET son push ; celui qui est déjà dans un appel
     lit « Manqué ». → { vue, occupe } */
  function creerGroupe({ moi, invites, type, sessionH, conv }) {
    const r = stockage.appelCreerGroupe({ appelant: moi.id, invites, type, session: sessionH, sonnerieMs: cfg.sonnerieMs, capacite: capaciteDe(type), conv });
    vivre(r.id, moi.id);
    reveiller(Object.keys(r.gids));
    for (const n of r.notifs) pousserManque(n, { id: r.id, type, appelant: moi });
    for (const u of r.sonnent) pousserSonnerie({ id: r.id, type, appelant: moi, appele: u, gid: r.gids[u], groupe: true });
    return { vue: r.vue, occupe: r.occupe };
  }
  function repondre({ moi, id, sessionH, accepte }) {
    echoir();                                                 // une sonnerie échue ne se prend plus, même si le balayeur n'est pas encore passé
    const r = stockage.appelRepondre({ id, uid: moi.id, session: sessionH, accepte });
    if (!r.deja) { if (accepte) vivre(id, moi.id); reveiller(Object.keys(r.gids)); }
    if (!r.deja && !accepte) oublier(id, moi.id);
    return r;
  }
  /* ENTRER dans une salle (la bannière « Rejoindre » d'un appel de groupe). → { vue, attente, deja, etat, salle } — `salle` : ce qui s'est dit d'éphémère avant l'arrivée */
  function rejoindre({ moi, id, sessionH }) {
    echoir();
    const r = stockage.appelRejoindre({ id, uid: moi.id, session: sessionH });
    suite(id, moi.id, r);
    return r;
  }
  /* ENTRER dans la salle d'une réunion programmée (la première personne qui entre l'ouvre). */
  function rejoindreReunion({ moi, reunion, sessionH, type }) {
    const r = stockage.salleReunionRejoindre({ reunion, uid: moi.id, session: sessionH, type, capacite: capaciteDe(type) });
    suite(r.id, moi.id, r);
    return r;
  }
  function suite(id, uid, r) {
    if (!r.deja) { vivre(id, uid); reveiller(Object.keys(r.gids)); }
    r.salle = etatSalle(id, uid);
  }
  function quitter({ moi, id, sessionH }) {
    echoir();
    const r = stockage.appelQuitter({ id, uid: moi.id, session: sessionH });
    if (!r.deja) {
      reveiller(Object.keys(r.gids));
      if (r.notif) pousserManque(r.notif, { id, type: r.vue ? r.vue.type : 'audio', appelant: moi });
      if (r.notifs && r.notifs.length) manquesDe(id, r.vue ? r.vue.type : 'audio', r.notifs);
      oublier(id, moi.id);
    }
    vus.delete(cle(id, moi.id));
    return r;
  }

  /* ── le signal ── */
  /* `acces` : le laissez-passer de la garde AP. `cible` : le destinataire (salle). Lève `appel_fini`, `appareil_non_lie`, `appel_pas_en_cours`. → { relaye } */
  function signal({ moi, acces, sessionH, type, donnees, cible }) {
    const a = stockage.appelAcces(acces.id, moi.id);          // l'état À CET INSTANT (la garde l'a lu un instant plus tôt, rien n'attend entre les deux : une relecture ne coûte rien)
    if (!a) throw erreur('introuvable');
    if (a.etat !== 'sonne' && a.etat !== 'en_cours') throw erreur('appel_fini');
    if (!a.session || a.session !== sessionH) throw erreur('appareil_non_lie');
    vivre(a.id, moi.id);                                      // tout signal accepté prouve que l'appareil est là
    if (type === 'pouls') return { relaye: false };
    if (a.genre !== 'deux') {
      /* ⛔ UNE SALLE NE RELAIE QU'ENTRE PARTICIPANTS PRÉSENTS : celui qui attend à la porte, qui est parti, qu'on a refusé ou exclu n'envoie ni ne reçoit rien — c'est CE qui fait d'une exclusion une exclusion */
      if (a.statut !== 'present' || typeof cible !== 'string' || cible === moi.id) throw erreur('appel_pas_en_cours');
      const t = stockage.appelAcces(a.id, cible);
      if (!t || t.statut !== 'present' || !t.session) throw erreur('appel_pas_en_cours');
      hub.emettreSession(t.session, 'signal', { appel: a.id, de: moi.id, type, donnees: donnees === undefined ? null : donnees });
      return { relaye: true };
    }
    if (a.etat !== 'en_cours') throw erreur('appel_pas_en_cours');
    const autre = a.autre ? stockage.appelAcces(a.id, a.autre) : null;
    if (!autre || !autre.session) throw erreur('appel_pas_en_cours');
    hub.emettreSession(autre.session, 'signal', { appel: a.id, de: moi.id, type, donnees: donnees === undefined ? null : donnees });
    return { relaye: true };
  }

  /* ── l'éphémère d'une salle : mémoire seulement ── */
  function etatDe(id, creer) {
    let e = salles.get(id);
    if (!e && creer) {
      while (salles.size >= SALLES_ETAT_MAX) salles.delete(salles.keys().next().value);
      e = { mains: new Set(), etats: new Map(), sondage: null, minuteur: null, epingle: null, annot: annotVide() };
      salles.set(id, e);
    }
    return e || null;
  }
  const sondageVue = (s, uid) => s ? { id: s.id, question: s.question, choix: s.choix, comptes: s.choix.map((_, i) => Array.from(s.votes.values()).filter(v => v === i).length), total: s.votes.size, ouvert: s.ouvert, mon_vote: uid && s.votes.has(uid) ? s.votes.get(uid) : null } : null;
  const minuteurVue = (m) => m ? { fin_dans_s: Math.max(0, Math.ceil((m.fin - horloge()) / 1000)), secondes: m.secondes } : null;
  /* ⛔ LES OUTILS DE L'ORGANISATEUR D'UNE SALLE (Perso+, 4 octobre 2026). Une salle les a si c'est la salle d'une RÉUNION (programmée par quelqu'un qui pouvait l'organiser), ou si celui qui a LANCÉ l'appel de groupe est
     Pro ou Perso+ (`formule.peutOrganiser` — la seule définition, bêta comprise : tout y est ouvert). Jugé sur celui qui a lancé l'appel, JAMAIS sur l'hôte du moment (un autre l'est devenu depuis, ce n'est pas lui qui
     paie) ni sur celui qui agit ; un organisateur dont le compte s'est effacé n'en laisse pas : la salle redevient gratuite. Sans formule injectée (les bancs du stockage), tout est ouvert. Une salle qui n'existe pas
     (ou un appel à deux) n'a pas d'outils. LA définition : `routes-salles.js` refuse avec elle, et la page propose avec elle (`etatSalle.outils`). */
  function outilsOuverts(id) {
    const s = stockage.salleOrganisateur(id);
    if (!s) return false;
    if (s.genre === 'reunion') return true;
    if (!formule) return true;
    return !!s.organisateur && formule.peutOrganiser(s.organisateur).ok;
  }
  /* ── les annotations ── */
  function annotVide() { return { support: null, ouvreur: null, permis: 'tous', items: [], octets: 0 }; }
  /* quelqu'un d'autre partage encore son écran : quand un support s'en va, les annotations passent sur le sien (jamais sur le tableau, qui ne s'ouvre que d'un geste) */
  const partageurDe = (e, sauf) => { for (const [u, x] of e.etats) if (u !== sauf && x && x.partage) return u; return null; };
  const annotVue = (a) => a ? { support: a.support, ouvreur: a.ouvreur, permis: a.permis, items: a.items.map(x => Object.assign({}, x)) } : { support: null, ouvreur: null, permis: 'tous', items: [] };
  /* le support change (un partage commence ou finit, le tableau s'ouvre ou se ferme) : tout ce qui était dessiné part avec l'ancien, et TOUS les présents le savent */
  function annotSupport(id, e, support, ouvreur, de) {
    const a = e.annot || (e.annot = annotVide());
    a.support = support; a.ouvreur = ouvreur || null; a.items = []; a.octets = 0;
    diffuser(id, 'salle_evt', { appel: id, de, k: 'annot', op: 'support', support, ouvreur: a.ouvreur, permis: a.permis }, null);
  }
  const entiers = (v, max) => Array.isArray(v) && v.length >= 2 && v.length <= max && v.length % 2 === 0 && v.every(n => Number.isInteger(n) && n >= 0 && n <= 10000);
  /* un geste d'annotation. `d.op` : trait (un morceau de trait — le premier crée, les suivants ajoutent, `fin` le termine), texte, retirer, annuler, effacer (« miens » ou « tous »),
     tableau (ouvrir/fermer le tableau blanc), permis (l'hôte : « tous » ou « hotes »). Effacer pour tous et fermer le tableau : l'hôte, un co-hôte, celui qui partage ou qui a ouvert le tableau. */
  function annoter({ moi, acces, d }) {
    const courant = stockage.appelAcces(acces.id, moi.id) || acces;
    verifierPresent(courant);
    const hote = courant.grade >= 1, e = etatDe(acces.id, true), a = e.annot || (e.annot = annotVide());
    const maitre = hote || a.support === 'ecran:' + moi.id || (a.support === 'tableau' && a.ouvreur === moi.id);
    const op = d && d.op;
    if (op === 'tableau') {
      if (typeof d.actif !== 'boolean') throw erreur('champ_invalide');
      if (d.actif) {
        if (a.support === 'tableau') return { appel: acces.id, de: moi.id, k: 'annot', op: 'support', support: a.support, ouvreur: a.ouvreur, permis: a.permis };   // déjà ouvert : rien ne s'efface
        if (a.permis === 'hotes' && !hote) throw erreur('interdit');
        if (a.support && a.support.startsWith('ecran:') && a.support !== 'ecran:' + moi.id && !hote) throw erreur('annot_occupe');
        annotSupport(acces.id, e, 'tableau', moi.id, moi.id);
      } else {
        if (a.support !== 'tableau') return { appel: acces.id, de: moi.id, k: 'annot', op: 'support', support: a.support, ouvreur: a.ouvreur, permis: a.permis };
        if (!maitre) throw erreur('interdit');
        const u = partageurDe(e, null);
        annotSupport(acces.id, e, u ? 'ecran:' + u : null, u, moi.id);
      }
      return { appel: acces.id, de: moi.id, k: 'annot', op: 'support', support: a.support, ouvreur: a.ouvreur, permis: a.permis };
    }
    if (op === 'permis') {
      if (!hote) throw erreur('interdit');
      if (d.qui !== 'tous' && d.qui !== 'hotes') throw erreur('champ_invalide');
      a.permis = d.qui;
      const ev = { appel: acces.id, de: moi.id, k: 'annot', op: 'permis', permis: a.permis };
      diffuser(acces.id, 'salle_evt', ev, moi.id);
      return ev;
    }
    if (!a.support) throw erreur('rien_a_annoter');
    if (a.permis === 'hotes' && !maitre) throw erreur('interdit');
    let ev = null;
    if (op === 'trait') {
      if (typeof d.id !== 'string' || !ID_ANNOT.test(d.id) || !entiers(d.pts, ANNOT_POINTS_ENVOI_MAX * 2)) throw erreur('champ_invalide');
      const x = a.items.find(i => i.id === d.id);
      if (x) {
        if (x.de !== moi.id || x.fini || x.outil === 'texte') throw erreur('champ_invalide');
        if (x.pts.length + d.pts.length > ANNOT_POINTS_MAX * 2 || a.octets + d.pts.length * 4 > ANNOT_OCTETS_MAX) throw erreur('annot_pleine');
        x.pts = x.pts.concat(d.pts); a.octets += d.pts.length * 4; if (d.fin === true) x.fini = true;
        ev = { appel: acces.id, de: moi.id, k: 'annot', op: 'trait', item: { id: x.id, de: x.de, outil: x.outil, couleur: x.couleur, ep: x.ep, pts: d.pts, fini: x.fini }, suite: true };
      } else {
        if (!ANNOT_OUTILS.includes(d.outil) || !ANNOT_COULEURS.includes(d.couleur) || !Number.isInteger(d.ep) || d.ep < 1 || d.ep > 3) throw erreur('champ_invalide');
        if (a.items.length >= ANNOT_ITEMS_MAX || a.octets + d.pts.length * 4 > ANNOT_OCTETS_MAX) throw erreur('annot_pleine');
        const item = { id: d.id, de: moi.id, outil: d.outil, couleur: d.couleur, ep: d.ep, pts: d.pts.slice(), fini: d.fin === true || d.outil === 'fleche' || d.outil === 'rect' || d.outil === 'ellipse' };
        a.items.push(item); a.octets += d.pts.length * 4;
        ev = { appel: acces.id, de: moi.id, k: 'annot', op: 'trait', item: Object.assign({}, item), suite: false };
      }
    } else if (op === 'texte') {
      const t = typeof d.texte === 'string' ? d.texte.replace(/\s+/g, ' ').trim() : '';
      if (typeof d.id !== 'string' || !ID_ANNOT.test(d.id) || !t || Array.from(t).length > ANNOT_TEXTE_MAX || !entiers(d.pts, 2) || !ANNOT_COULEURS.includes(d.couleur) || !Number.isInteger(d.ep) || d.ep < 1 || d.ep > 3) throw erreur('champ_invalide');
      if (a.items.some(i => i.id === d.id)) throw erreur('champ_invalide');
      if (a.items.length >= ANNOT_ITEMS_MAX || a.octets + t.length * 2 + 8 > ANNOT_OCTETS_MAX) throw erreur('annot_pleine');
      const item = { id: d.id, de: moi.id, outil: 'texte', couleur: d.couleur, ep: d.ep, pts: d.pts.slice(), texte: t, fini: true };
      a.items.push(item); a.octets += t.length * 2 + 8;
      ev = { appel: acces.id, de: moi.id, k: 'annot', op: 'trait', item: Object.assign({}, item), suite: false };
    } else if (op === 'retirer') {
      const i = typeof d.id === 'string' ? a.items.findIndex(x => x.id === d.id) : -1;
      if (i < 0) throw erreur('introuvable');
      if (a.items[i].de !== moi.id && !maitre) throw erreur('interdit');
      const [x] = a.items.splice(i, 1); a.octets = Math.max(0, a.octets - x.pts.length * 4 - (x.texte ? x.texte.length * 2 + 8 : 0));
      ev = { appel: acces.id, de: moi.id, k: 'annot', op: 'retirer', ids: [x.id] };
    } else if (op === 'annuler') {
      let i = -1; for (let j = a.items.length - 1; j >= 0; j--) if (a.items[j].de === moi.id) { i = j; break; }
      if (i < 0) return { appel: acces.id, de: moi.id, k: 'annot', op: 'retirer', ids: [] };
      const [x] = a.items.splice(i, 1); a.octets = Math.max(0, a.octets - x.pts.length * 4 - (x.texte ? x.texte.length * 2 + 8 : 0));
      ev = { appel: acces.id, de: moi.id, k: 'annot', op: 'retirer', ids: [x.id] };
    } else if (op === 'effacer') {
      if (d.qui !== 'miens' && d.qui !== 'tous') throw erreur('champ_invalide');
      if (d.qui === 'tous' && !maitre) throw erreur('interdit');
      const partis = a.items.filter(x => d.qui === 'tous' || x.de === moi.id).map(x => x.id);
      a.items = a.items.filter(x => !partis.includes(x.id)); a.octets = a.items.reduce((n, x) => n + x.pts.length * 4 + (x.texte ? x.texte.length * 2 + 8 : 0), 0);
      ev = { appel: acces.id, de: moi.id, k: 'annot', op: 'retirer', ids: partis };
    } else throw erreur('champ_invalide');
    diffuser(acces.id, 'salle_evt', ev, moi.id);
    return ev;
  }
  /* Ce qui s'est dit avant l'arrivée de `uid` (ou de la page qui relit) : de quoi dessiner mains levées, états des autres, sondage, minuteur, épingle — et si la salle a ses OUTILS d'organisateur. */
  function etatSalle(id, uid) {
    const e = etatDe(id, false), outils = outilsOuverts(id);
    if (!e) return { mains: [], etats: {}, sondage: null, minuteur: null, epingle: null, outils, annot: annotVue(null) };
    if (e.minuteur && e.minuteur.fin <= horloge()) e.minuteur = null;
    const etats = {}; for (const [u, x] of e.etats) etats[u] = x;
    return { mains: Array.from(e.mains), etats, sondage: sondageVue(e.sondage, uid), minuteur: minuteurVue(e.minuteur), epingle: e.epingle, outils, annot: annotVue(e.annot) };
  }
  /* Oublier ce qu'une personne avait posé dans la salle quand elle en sort : sa main, ses états, son vote reste (un vote est un vote), l'épingle qui la désignait. */
  function oublier(id, uid) {
    const e = etatDe(id, false); if (!e) return;
    const avait = e.mains.delete(uid); e.etats.delete(uid);
    const epingle = e.epingle === uid; if (epingle) e.epingle = null;
    if (e.annot && e.annot.support === 'ecran:' + uid) { const u = partageurDe(e, uid); annotSupport(id, e, u ? 'ecran:' + u : null, u, uid); }          // celui qui partageait est parti : ce qu'on avait dessiné sur son écran part avec lui
    if (avait) diffuser(id, 'salle_evt', { appel: id, de: uid, k: 'main', actif: false }, uid);
    if (epingle) diffuser(id, 'salle_evt', { appel: id, de: uid, k: 'epingle', uid: null }, uid);
  }
  /* Les appareils liés des personnes PRÉSENTES, sauf `sauf` : c'est à eux seuls que la salle parle. Un éphémère adressé à une session sans flux est retenu 30 s par le flux (`flux.emettreSession`). */
  function diffuser(id, event, data, sauf) {
    let n = 0;
    for (const s of stockage.salleSessions(id)) { if (s.uid === sauf) continue; hub.emettreSession(s.session, event, data); n++; }
    return n;
  }
  const verifierPresent = (acces) => { if (acces.statut !== 'present') throw erreur('appel_pas_en_cours'); if (acces.etat !== 'sonne' && acces.etat !== 'en_cours') throw erreur('appel_fini'); };
  /* Un geste de participant. `acces` : le laissez-passer de la garde (relu : la personne est-elle encore dedans ?). → l'événement diffusé */
  function main({ moi, acces, actif }) {
    verifierPresent(stockage.appelAcces(acces.id, moi.id) || acces);
    const e = etatDe(acces.id, true);
    if (actif) e.mains.add(moi.id); else e.mains.delete(moi.id);
    const ev = { appel: acces.id, de: moi.id, k: 'main', actif: !!actif };
    diffuser(acces.id, 'salle_evt', ev, moi.id);
    return ev;
  }
  function reaction({ moi, acces, emoji }) {
    verifierPresent(stockage.appelAcces(acces.id, moi.id) || acces);
    if (!REACTIONS.includes(emoji)) throw erreur('champ_invalide');
    const ev = { appel: acces.id, de: moi.id, k: 'reaction', emoji };
    diffuser(acces.id, 'salle_evt', ev, moi.id);
    return ev;
  }
  /* L'état de MON appareil dans la salle : caméra, micro, écran partagé (des booléens). Les autres pages en font l'image de ma tuile. */
  function etatMien({ moi, acces, camera, micro, partage }) {
    verifierPresent(stockage.appelAcces(acces.id, moi.id) || acces);
    const e = etatDe(acces.id, true), x = Object.assign({ camera: false, micro: true, partage: false }, e.etats.get(moi.id) || {});
    if (typeof camera === 'boolean') x.camera = camera;
    if (typeof micro === 'boolean') x.micro = micro;
    const avant = !!(e.etats.get(moi.id) || {}).partage;
    if (typeof partage === 'boolean') x.partage = partage;
    e.etats.set(moi.id, x);
    /* le partage d'écran devient le SUPPORT des annotations (le dernier qui commence à partager) ; quand il s'arrête, ce qui était dessiné dessus s'efface (et le support passe à un autre partage en cours) */
    /* ⛔ un tableau ouvert le reste : un partage qui commence ne l'efface pas (on le ferme d'un geste, et le partage en cours devient alors le support) */
    if (x.partage && !avant && !(e.annot && e.annot.support === 'tableau')) annotSupport(acces.id, e, 'ecran:' + moi.id, moi.id, moi.id);
    else if (!x.partage && avant && e.annot && e.annot.support === 'ecran:' + moi.id) { const u = partageurDe(e, moi.id); annotSupport(acces.id, e, u ? 'ecran:' + u : null, u, moi.id); }
    const ev = { appel: acces.id, de: moi.id, k: 'etat', camera: x.camera, micro: x.micro, partage: x.partage };
    diffuser(acces.id, 'salle_evt', ev, moi.id);
    return ev;
  }
  /* sondage, minuteur, épingle : les opérations de l'hôte (ouvrir, fermer, démarrer, épingler…) et le vote de tous. Le service TIENT le décompte des votes (un nouvel arrivant le voit) et le reste d'un minuteur. */
  function evt({ moi, acces, k, donnees }) {
    const courant = stockage.appelAcces(acces.id, moi.id) || acces;
    verifierPresent(courant);
    const hote = courant.grade >= 1;
    const d = donnees && typeof donnees === 'object' && !Array.isArray(donnees) ? donnees : {};
    const e = etatDe(acces.id, true);
    let ev = null;
    if (k === 'sondage') {
      if (d.op === 'ouvrir') {
        if (!hote) throw erreur('interdit');
        const q = typeof d.question === 'string' ? d.question.replace(/\s+/g, ' ').trim() : '';
        const ch = Array.isArray(d.choix) ? d.choix.map(x => typeof x === 'string' ? x.replace(/\s+/g, ' ').trim() : '') : [];
        if (!q || Array.from(q).length > SONDAGE_QUESTION_MAX || ch.length < 2 || ch.length > SONDAGE_CHOIX_MAX || ch.some(x => !x || Array.from(x).length > SONDAGE_CHOIX_LONG_MAX)) throw erreur('champ_invalide');
        e.sondage = { id: crypto.randomBytes(6).toString('hex'), question: q, choix: ch, votes: new Map(), ouvert: true };
      } else if (d.op === 'voter') {
        const s = e.sondage;
        if (!s || !s.ouvert || d.id !== s.id || !Number.isInteger(d.choix) || d.choix < 0 || d.choix >= s.choix.length) throw erreur('champ_invalide');
        s.votes.set(moi.id, d.choix);
      } else if (d.op === 'fermer') {
        if (!hote) throw erreur('interdit');
        if (!e.sondage) throw erreur('champ_invalide');
        e.sondage.ouvert = false;
      } else throw erreur('champ_invalide');
      ev = { appel: acces.id, de: moi.id, k: 'sondage', sondage: sondageVue(e.sondage, null) };
    } else if (k === 'minuteur') {
      if (!hote) throw erreur('interdit');
      if (d.op === 'demarrer') {
        if (!Number.isInteger(d.secondes) || d.secondes < 1 || d.secondes > MINUTEUR_MAX_S) throw erreur('champ_invalide');
        e.minuteur = { fin: horloge() + d.secondes * 1000, secondes: d.secondes };
      } else if (d.op === 'arreter') e.minuteur = null;
      else throw erreur('champ_invalide');
      ev = { appel: acces.id, de: moi.id, k: 'minuteur', minuteur: minuteurVue(e.minuteur) };
    } else if (k === 'epingle') {
      if (!hote) throw erreur('interdit');
      if (d.op === 'epingler') {
        const t = typeof d.uid === 'string' ? stockage.appelAcces(acces.id, d.uid) : null;
        if (!t || t.statut !== 'present') throw erreur('champ_invalide');
        e.epingle = d.uid;
      } else if (d.op === 'retirer') e.epingle = null;
      else throw erreur('champ_invalide');
      ev = { appel: acces.id, de: moi.id, k: 'epingle', uid: e.epingle };
    } else throw erreur('champ_invalide');
    /* le sondage voyage à TOUS, y compris celui qui l'a posé (son vote, le décompte) ; les autres gestes, à tous les autres */
    diffuser(acces.id, 'salle_evt', ev, k === 'sondage' ? null : moi.id);
    return ev;
  }
  /* ⛔ un geste d'annotation diffuse SANS passer par `evt` : il n'est pas un « événement de 2 Ko » (un trait en cours en fait dix par seconde) — son propre plafond (`routes-salles.js`) */
  /* « Couper le micro » : une DEMANDE, adressée à une personne ou à toutes. Le service la relaie à l'appareil visé ; c'est la page qui l'honore (ou non). */
  function demanderCouperMicro({ moi, acces, cible }) {
    const ev = { appel: acces.id, de: moi.id, k: 'couper_micro', cible: cible === null ? 'tous' : cible };
    if (cible === null) return { ev, atteints: diffuser(acces.id, 'salle_evt', ev, moi.id) };
    const t = stockage.appelAcces(acces.id, cible);
    if (!t || t.statut !== 'present' || !t.session) throw erreur('introuvable');
    hub.emettreSession(t.session, 'salle_evt', ev);
    return { ev, atteints: 1 };
  }

  /* ── les gestes de l'hôte et des co-hôtes : le service les IMPOSE (le stockage les juge dans une transaction), cette couche réveille les pages ── */
  function apres(r) { reveiller(Object.keys(r.gids || {})); return r; }
  function admettre({ moi, id, uid, tous }) { return apres(stockage.salleAdmettre({ id, par: moi.id, uid, tous })); }
  function refuser({ moi, id, uid }) { return apres(stockage.salleRefuser({ id, par: moi.id, uid })); }
  function exclure({ moi, id, uid }) {
    const r = apres(stockage.salleExclure({ id, par: moi.id, uid }));
    if (!r.deja) { oublier(id, uid); vus.delete(cle(id, uid)); }
    return r;
  }
  function verrouiller({ moi, id, actif }) { return apres(stockage.salleVerrou(id, moi.id, actif)); }
  function salleAttente({ moi, id, actif }) { return apres(stockage.salleAttente(id, moi.id, actif)); }
  function partage({ moi, id, actif }) { return apres(stockage.sallePartage(id, moi.id, actif)); }
  function rec({ moi, id, actif }) { return apres(stockage.salleRec(id, moi.id, actif)); }
  function cohote({ moi, id, uid, actif }) { return apres(stockage.salleCohote({ id, par: moi.id, uid, actif })); }
  function terminer({ moi, id }) {
    const r = apres(stockage.salleTerminer({ id, par: moi.id }));
    if (!r.deja) { manquesDe(id, r.vue ? r.vue.type : 'audio', r.notifs); salles.delete(id); }
    return r;
  }

  /* ── un blocage coupe l'appel en cours entre les deux personnes ── */
  function bloquer(a, b) {
    const reveil = stockage.appelsFinirEntre(a, b);
    if (reveil.length) reveiller(reveil);
  }

  /* ── la personne demande la suppression de son compte : ses sessions sont coupées à l'instant, l'appel qu'elle tenait ne se tient donc plus — il se TERMINE tout de suite (l'autre l'apprend), au lieu
     d'attendre `perduMs` qu'on le dise « perdu ». Une sonnerie en cours est annulée : l'appelé l'a manquée, comme à tout raccroché de l'appelant. Une salle : la personne en sort (la salle continue pour les
     autres). → vrai si un appel a été terminé ── */
  function terminerDe(uid) {
    const id = stockage.appelActifDe(uid);
    if (!id) return false;
    const acces = stockage.appelAcces(id, uid);
    if (acces && acces.genre !== 'deux') {
      const f = stockage.appelPartir({ id, uid, motif: 'compte' });
      if (f.deja) return false;
      reveiller(Object.keys(f.gids));
      manquesDe(id, acces.type, f.notifs);
      vus.delete(cle(id, uid)); oublier(id, uid);
      return true;
    }
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
      if (f.groupe) manquesDe(f.id, f.type, f.notifs);
      else if (f.notif) pousserManque(f.notif, { id: f.id, type: f.type, appelant: personne(f.appelant) });
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
        if (a.genre !== 'deux') {
          /* une SALLE : celui dont l'appareil ne donne plus signe de vie SORT (présent ou à la porte) — la salle continue pour les autres, ou finit si c'était le dernier */
          for (const p of a.parts) {
            if (!p.session || (p.statut !== 'present' && p.statut !== 'attente')) continue;
            const k = cle(a.id, p.uid);
            if (!vus.has(k)) vus.set(k, t);
            if (t - vus.get(k) <= cfg.perduMs) continue;
            let f;
            try { f = stockage.appelPartir({ id: a.id, uid: p.uid, motif: 'perdu' }); } catch (e) { continue; }
            if (f.deja) continue;
            bilan.perdus++; etat.perdus++;
            journaliser('appel_perdu', { n: 1 });
            reveiller(Object.keys(f.gids));
            manquesDe(a.id, a.type, f.notifs);
            vus.delete(k); oublier(a.id, p.uid);
          }
          continue;
        }
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
      for (const k of Array.from(salles.keys())) if (!vivants.has(k)) salles.delete(k);          // une salle finie n'a plus d'éphémère
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

  return { ice, creer, creerGroupe, repondre, rejoindre, rejoindreReunion, quitter, signal, bloquer, terminerDe, balayer, echoir, demarrer, arreter, sante, relais: relaisPose, etat,
    main, reaction, etatMien, evt, annoter, demanderCouperMicro, etatSalle, outilsOuverts, admettre, refuser, exclure, verrouiller, salleAttente, partage, rec, cohote, terminer, capaciteDe,
    /* pour les bancs : combien de salles ont un éphémère en mémoire (jamais publié) */
    memoireSalles: () => salles.size };
}

module.exports = { creerAppels, identifiantsRelais, tailleEvt, ID_APPEL, TYPES_SIGNAL, SIGNAL_OCTETS_MAX, EVT_OCTETS_MAX, REACTIONS };
