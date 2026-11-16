/* ⛔ CE QUE CE FICHIER GARDE — LES APPELS À DEUX PAR LEURS ROUTES : LE VRAI SERVICE, EN HTTP, AVEC SON FLUX (famille 3, étape 7 ; modèle `test-973`).

   `test-980` éprouve ce qui est rangé, le stockage seul ; `test-905` joue la garde de chaque route contre six profils ; `test-983` fait vivre le service (le balayeur, les pushs, l'effacement, la
   restauration). Celui-ci joue les GESTES, de bout en bout, à plusieurs personnes, sur plusieurs appareils, avec l'horloge du service décalée au geste (jamais un sommeil) :

     · ⛔ `GET /api/ice` : sans relais configuré, une liste VIDE et `relais:false` — jamais le serveur d'un tiers ; avec un relais, des identifiants ÉPHÉMÈRES dont le mot de passe est RECALCULÉ ICI avec
       `crypto` (HMAC-SHA1 du secret sur `<échéance>:<identifiant>`, en base64), à deux instants, pour deux personnes — et le secret n'est dans aucune réponse, aucun journal, aucun octet de la base ;
     · lancer : par une conversation directe OU une personne (jamais les deux ni aucune), à DEUX ici (un groupe sonne depuis l'étape 8 : `test-987` ; la conversation d'une réunion refuse : `appel_a_deux`), entre gens qui peuvent s'écrire — un inconnu, un bloqué et une
       personne qui n'existe pas reçoivent la MÊME réponse, au caractère près ; un compte effacé ; occupé (`occupe`, moi ou l'autre) ; les plafonds par personne et par paire, un compte neuf à un tiers ;
     · répondre et raccrocher par l'appareil LIÉ (le second appareil : `appel_pris`, un autre appareil de l'appelante : `appareil_non_lie`) ;
     · ⛔ le SIGNAL : relayé à l'appareil lié de l'AUTRE personne et à personne d'autre (ni ses autres appareils, ni les miens), 16 Ko pile, le destinataire est celui de l'appel, le débit est plafonné,
       un signal envoyé pendant qu'aucun flux n'est ouvert est retenu 30 s puis livré — et jamais un octet de SDP ni de candidat n'est rangé, journalisé ou repris par /health ;
     · l'événement durable `appel` arrive aux deux participants et à personne d'autre, et se REJOUE par Last-Event-ID.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « personne n'a reçu » est précédée d'un marqueur que la même personne reçoit APRÈS — un flux qui n'a rien reçu parce qu'il est mort
   ne prouve pas qu'on ne lui a rien envoyé. Et le marqueur est EXIGÉ (`marqueur`) : un marqueur jamais arrivé fait tomber le contrôle qu'il devait peupler.

   ⛔ UNE COURSE DE BANC SE JOUE AU GESTE, JAMAIS AU CHRONOMÈTRE (16 novembre 2026). Ce banc tombait sous charge — 8 passages sur 80 avec vingt exécutions en parallèle et douze processus qui
   occupent les cœurs (4 cœurs) — et la CI en est morte deux fois sur « undefined.lie » (39 ✓). Trois courses, toutes dans le BANC et ses outils, aucune dans le service :
     · l'HORLOGE : `avancer()` tronquait le fichier de décalage avant de l'écrire ; le service, qui le relit à chaque `Date.now()`, le lisait VIDE et sautait à l'heure réelle le temps d'un tour de
       balayeur — sonneries « échues », appels « perdus », dans n'importe quelle section (30 lectures vides relevées par une horloge espionne ; zéro depuis). Corrigé à la source (`outils-msg.js` :
       fichier temporaire puis renommage ; `lib-horloge-msg.js` : une lecture illisible garde le dernier décalage), et chaque service démarre DÉJÀ à l'heure du banc (`decalageInitial`) ;
     · la FERMETURE D'UN FLUX : le banc sait son flux fermé avant que le service l'ait vu — un signal envoyé dans l'intervalle part sur une connexion morte au lieu d'être retenu (« retenu-1 » perdu,
       2 passages sur 60). `fermerFlux` attend que /health compte un flux de moins : c'est le service qui dit « fermé », pas le client ;
     · le PORT : deux bancs lancés ensemble tiraient parfois le même port « libre », et l'un parlait au service de l'autre — « unable to open database file » (`outils-msg.js` : `portLibre`
       réserve le port entre processus, `lancerService` regarde que personne n'y écoute avant de lancer).
   Et plus aucune tolérance en secondes réelles : l'échéance des identifiants du relais se juge par ENCADREMENT (l'heure du banc avant et après la requête), sans « ± 3 s » ni « 600 à 603 ».
   ⚠️ CE QUI RESTE LIÉ À L'HEURE RÉELLE, ET SA MARGE — MESURÉE AVANT DE PARIER DESSUS : l'horloge du service est l'heure réelle PLUS le décalage du banc ; entre deux gestes elle avance d'elle-même.
   Trois fenêtres du service en dépendent donc encore (`fenetreReelle` les chronomètre, les imprime dès qu'un contrôle tombe ou avec `BANC_TEMPS=1`, et DIT « machine trop lente » si l'une est
   dépassée). Sous la charge ci-dessus, 300 passages, le pire relevé : de « lancer » à « Ben répond » 0,68 s pour 39 s de marge ; les douze signaux du débit 0,45 s pour 60 s ; de l'envoi des signaux
   retenus à la réouverture du flux 0,07 s pour 30 s. Les plafonds d'attente (8 s pour un événement, 10 s pour le démarrage d'un service) ne disent, eux, que « ce n'est jamais arrivé ».

   ⛔ UNE MESURE QUI ÉCHOUE DIT POURQUOI : aucune lecture d'une réponse ou d'un événement ne tue plus le banc en silence. `vueDe`, `relaisDe` et `evenement` rendent ce qui est attendu ou, à défaut,
   DISENT ce que le service a rendu (code et corps) et laissent tomber le contrôle qui suit ; et si le banc meurt quand même, il imprime ses derniers échanges avec le service (`TRACE`).
   Les outils sont gardés par `test-993` (l'horloge, le renommage, le port, le service légitime) ; `scratchpad/mutations-981-charge.js` remet onze défauts dans le service (chacun fait tomber LE
   contrôle qui tombait sous charge), huit dans les outils, et joue la course de fermeture au geste (l'ancien banc tombe, celui-ci non). Mesures : `scratchpad/charge-banc.sh` (N passages en parallèle sous charge),
   `scratchpad/horloge-espion-msg.js` (les lectures vides du décalage), `scratchpad/ports-collision.js` (les ports tirés à deux). */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const C = T.compteur(), { v, vrai, fin } = C;
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const { tailleSignal } = require(path.join(T.SERVICE, 'routes-appels.js'));
const { appelsConfig } = require(path.join(T.SERVICE, 'config.js'));

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (240 s)'); process.exit(1); }, 240000).unref();

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
const SEC = 1000, MIN = 60000, HEURE = 3600000, JOUR = 86400000;
const ZERO = Date.UTC(2026, 9, 19, 8, 0, 0);
const HOTE = 'turn.exemple.invalid';
const SECRET_RELAIS = crypto.randomBytes(30).toString('base64url');          // tiré ici : ni une valeur de configuration réelle, ni quelque chose qui ressemble à un secret écrit en dur
const CANARI_SDP = 'v=0\r\no=CANARI-SDP-WQXZ 1 1 IN IP4 198.51.100.77\r\ns=-\r\n';
const CANARI_CAND = 'candidate:1 1 udp 2113937151 198.51.100.77 54321 typ host CANARI-CAND-WQXZ';
const hmac64 = (secret, nom) => crypto.createHmac('sha1', secret).update(nom).digest('base64');
const tri = (l) => l.slice().sort();

/* Un service (horloge décalable, calée sur ZERO), sa base ouverte à côté (WAL : deux processus, une base) avec la MÊME horloge, des personnes et leurs clients */
async function monter(config) {
  /* ⛔ le service DÉMARRE à l'heure du banc (`decalageInitial`) : lancé à l'heure réelle puis reculé, son premier tour de balayeur (une seconde après le démarrage) pouvait passer AVANT le recul sur une
     machine chargée — `dernierTour` restait alors des semaines dans le futur, et l'âge du balayeur lu par la section 3 bis valait zéro au lieu de 46 s. */
  let decal = ZERO - Date.now();
  const svc = await T.lancerService({ horloge: true, config, decalageInitial: decal });
  const maintenant = () => Date.now() + decal;
  const chemin = path.join(svc.data, 'msg.db');
  const S = ouvrir({ chemin, scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: maintenant });
  let k = 0;
  const pers = (nom, origine) => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: origine || 'beta', verifie: true });
  const cl = (p) => { const c = suivre(T.client(svc.base), p.prenom); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 60 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
  const sql = (req, ...args) => { const d = T.lireBase(chemin); try { return d.prepare(req).get(...args); } finally { d.close(); } };
  const avancer = (ms) => { decal += ms; svc.avancer(ms); };
  /* ⛔ FERMER UN FLUX, C'EST ATTENDRE QUE LE SERVICE L'AIT VU FERMÉ. `attendreFerme` dit que le CLIENT a fini de lire ; le service, lui, ne retire le flux qu'à l'événement `close` de sa connexion —
     plus tard, et bien plus tard sur une machine chargée. Un signal envoyé entre les deux est écrit sur une connexion morte au lieu d'être RETENU pour la session (2 passages sur 60 sous charge :
     « retenu-1 » perdu). On attend donc que /health compte un flux de moins — au geste, le plafond de 8 s ne dit que « ce n'est jamais arrivé ». → vrai si le service l'a vu. */
  const anonyme = T.client(svc.base);
  const fluxOuverts = async () => { const h = (await anonyme.get('/health')).j; return h && h.flux ? h.flux.ouverts : NaN; };
  const fermerFlux = async (f) => { const avant = await fluxOuverts(); f.fermer(); await f.attendreFerme(); return !!(await T.attendre(async () => (await fluxOuverts()) < avant, 8000, 10)); };
  return { svc, S, chemin, pers, cl, sql, avancer, maintenant, fluxOuverts, fermerFlux, fermer: async () => { try { S.fermer(); } catch (x) { /* déjà fermé */ } await svc.arreter(); } };
}
const dit = (rep) => [rep.code, rep.j && rep.j.error];

/* ⛔ UNE MESURE QUI ÉCHOUE DIT POURQUOI (la CI est morte deux fois sur « undefined.lie », 5 et 16 novembre 2026, sans dire ce que le service avait rendu).
   · `TRACE` : les derniers échanges de chaque client avec le service (qui, quoi, le code, le début du corps) — imprimés si le banc meurt, quelle que soit la lecture qui l'a tué ;
   · `vueDe` : la vue d'appel d'une réponse — sinon ce que le service a rendu, et une vue VIDE : le contrôle qui suit tombe en nommant ses champs, le banc continue ;
   · `relaisDe` : le serveur de relais d'une réponse de /api/ice — même règle ;
   · `evenement` : l'événement attendu sur un flux — sinon ce que ce flux a reçu à la place (et s'il est fermé), et un événement VIDE.
   Les lignes « ⚠ » ne comptent pas : c'est le contrôle d'après qui tombe, elles disent seulement pourquoi. */
const TRACE = [], TEMPS_REELS = [];
const court = (x) => { let t; try { t = typeof x === 'string' ? x : JSON.stringify(x); } catch (e) { t = String(x); } return String(t === undefined ? '' : t).slice(0, 240); };
const rendu = (rep) => rep ? rep.code + ' ' + court(rep.j || rep.txt || '') : 'aucune réponse';
function suivre(c, nom) {
  for (const m of ['get', 'post']) {
    const f = c[m];
    c[m] = async (chemin, ...reste) => { const rep = await f(chemin, ...reste); TRACE.push(nom + ' ' + m.toUpperCase() + ' ' + chemin + ' → ' + rendu(rep)); if (TRACE.length > 12) TRACE.shift(); return rep; };
  }
  return c;
}
const vueDe = (quoi, rep) => { const a = rep && rep.j && rep.j.appel; if (a && typeof a === 'object') return a; console.log('  ⚠ ' + quoi + ' : pas d\'appel dans la réponse — le service a rendu ' + rendu(rep)); return { autre: {} }; };
const relaisDe = (quoi, rep) => { const l = rep && rep.j && rep.j.serveurs; if (Array.isArray(l) && l[1] && typeof l[1].username === 'string') return l[1]; console.log('  ⚠ ' + quoi + ' : pas de serveur de relais dans la réponse — le service a rendu ' + rendu(rep)); return { urls: [], username: '', credential: '' }; };
async function evenement(f, quoi, pred, plafond) {
  const e = await f.attendre(pred, plafond);
  if (e) return e;
  console.log('  ⚠ ' + quoi + ' : jamais arrivé (flux ' + (f.ferme ? 'FERMÉ' : 'ouvert') + ', ' + f.evenements.length + ' événements reçus ; les derniers : ' + court(f.evenements.slice(-6).map(x => x.event + (x.data && x.data.etat ? ':' + x.data.etat : x.data && x.data.type ? ':' + x.data.type : ''))) + ')');
  return { event: null, absent: true, data: { donnees: {} } };
}
/* ⚠️ une fenêtre du SERVICE qui court aussi sur l'heure réelle (voir l'en-tête) : on note le temps réel passé dedans ; dépassée, le banc DIT que la machine était trop lente pour ce pari — au lieu d'un
   refus du service que rien n'explique. → une fonction à appeler à la fin de la fenêtre. */
const fenetreReelle = (nom, limiteS) => { const debut = Date.now(); return () => { const s = (Date.now() - debut) / 1000; TEMPS_REELS.push(nom + ' : ' + s.toFixed(2) + ' s réelles (limite ' + limiteS + ' s)'); if (s >= limiteS) console.log('  ⚠ machine trop lente : ' + nom + ' a pris ' + s.toFixed(1) + ' s réelles, la fenêtre du service en tolère ' + limiteS); }; };
/* un MARQUEUR : le message qui prouve qu'un flux est vivant APRÈS ce qu'il ne devait pas recevoir → vrai s'il est arrivé (à exiger dans le contrôle) */
const marqueur = async (f, quoi, texte) => !(await evenement(f, quoi, e => e.event === 'message' && (texte === undefined || (e.data && e.data.texte === texte)))).absent;
/* l'échéance d'identifiants de relais lue dans une réponse, jugée par ENCADREMENT : le service l'a calculée entre l'envoi de la requête et sa réponse — ⌊heure/1000⌋ + la durée, pour une heure
   comprise entre `avant` et `apres` (l'heure du banc, la MÊME horloge que celle du service). Aucune tolérance en secondes réelles : un banc ralenti élargit l'encadrement tout seul. */
const echeanceJuste = (exp, avant, apres, ttlS) => Number(exp) >= Math.floor(avant / 1000) + ttlS && Number(exp) <= Math.floor(apres / 1000) + ttlS;
const octetsBase = (chemin) => { let b = Buffer.alloc(0); for (const s of ['', '-wal', '-shm']) { try { b = Buffer.concat([b, fs.readFileSync(chemin + s)]); } catch (e) { /* absent */ } } return b; };

(async () => {
  const flux = [];
  const M = await monter({
    appels: { relais: { hote: HOTE, port: 3478, portTls: 5349, secret: SECRET_RELAIS, ttlS: 900 }, parHeure: 6, parPaireHeure: 3, signalMax: 10, signalFenetreMs: MIN, iceParHeure: 3, balayageMs: 1000, perduMs: 600000 },
  });
  const { svc, S, pers, cl, sql, avancer, maintenant } = M;
  const ana = pers('Ana'), ben = pers('Ben'), cleo = pers('Cleo'), dan = pers('Dan'), eve = pers('Eve'), fred = pers('Fred'), zoe = pers('Zoe', 'compte'), inconnue = pers('Nova');
  S.contactLier(ana.id, ben.id); S.contactLier(ana.id, cleo.id); S.contactLier(ben.id, cleo.id); S.contactLier(ana.id, fred.id); S.contactLier(zoe.id, ben.id); S.contactLier(ana.id, eve.id); S.contactLier(ben.id, dan.id);
  const a1 = cl(ana), a2 = cl(ana), b1 = cl(ben), b2 = cl(ben), c1 = cl(cleo), d1 = cl(dan), z1 = cl(zoe), e1 = cl(eve), f1 = cl(fred);
  const ouvrirFlux = async (c) => { const f = await T.flux(c); flux.push(f); return f; };
  try {
    /* ═══════ 1. LE RELAIS : GET /api/ice ═══════ */
    console.log('GET /api/ice : à qui est DANS un appel seulement ; des identifiants éphémères recalculés ici, le secret nulle part, jamais le serveur d\'un tiers');
    const gil = pers('Gil'), hana = pers('Hana'); S.contactLier(gil.id, hana.id);
    const g1 = cl(gil), h1 = cl(hana);
    {
      /* Gil appelle Hana : une sonnerie en cours, la seule situation où des identifiants de relais se donnent. Chaque appel de la section est raccroché avant la suivante. */
      const sonnerie = (c, vers) => c.post('/api/appels', { uid: vers, type: 'audio' });
      const raccroche = (c, r) => c.post('/api/appels/' + vueDe('raccrocher la sonnerie', r).id + '/quitter', {});
      const sans = [await g1.get('/api/ice'), await c1.get('/api/ice'), await c1.get('/api/ice'), await c1.get('/api/ice'), await c1.get('/api/ice'), await c1.get('/api/ice')];
      v('⛔ AUCUN APPEL : pas d\'identifiants (404 `introuvable`, le même corps pour tous) — et le refus ne consomme RIEN du plafond (cinq refus de suite pour Cleo avec un plafond de trois par heure : toujours 404, jamais 429)',
        [sans.map(dit), new Set(sans.map(x => JSON.stringify(x.j))).size], [new Array(6).fill([404, 'introuvable']), 1]);
      const l1 = await sonnerie(g1, hana.id);
      vrai('population : Gil appelle Hana, la sonnerie court', l1.code === 201 && vueDe('Gil appelle Hana', l1).etat === 'sonne');
      const tiers = await c1.get('/api/ice');
      v('⛔ un TIERS pendant l\'appel des deux autres : le même 404 (participer à CET appel est la condition, pas qu\'un appel existe quelque part)', dit(tiers), [404, 'introuvable']);
      const avantR = maintenant(), r = await g1.get('/api/ice'), apresR = maintenant();
      const turn = relaisDe('Gil demande ses identifiants', r), stun = (r.j && Array.isArray(r.j.serveurs) && r.j.serveurs[0]) || { urls: [] };
      vrai('population : la réponse porte un STUN et un serveur TURN avec identifiants', r.code === 200 && r.j.relais === true && r.j.serveurs.length === 2 && !!turn.username);
      v('   `Cache-Control: no-store` (des identifiants ne se mettent pas en cache) et une durée de vie de quinze minutes (le réglage du banc)', [r.h.get('cache-control'), r.j && r.j.ttl_s], ['no-store', 900]);
      v('⛔ les adresses sont celles du relais SEUL : stun, et DEUX adresses de relais (turn en UDP, turns en TLS) — jamais le serveur d\'un tiers, et pas trois (le navigateur ouvre une allocation par adresse : mesuré par la sonde)', [stun.urls, tri(turn.urls)], [['stun:' + HOTE + ':3478'], tri(['turn:' + HOTE + ':3478?transport=udp', 'turns:' + HOTE + ':5349?transport=tcp'])]);
      const hotes = JSON.stringify(r.j).match(/[a-z0-9.-]+\.[a-z]{2,}/g) || [];
      vrai('   aucun nom d\'hôte dans la réponse que celui du relais (population : ' + hotes.length + ' noms lus)', hotes.every(h => h === HOTE) && hotes.length >= 3);
      const [exp, uid] = turn.username.split(':');
      v('⛔ le nom d\'utilisateur est « <échéance>:<identifiant de la personne> » : quinze minutes après l\'heure du service (encadrée par l\'heure du banc avant et après la requête — aucune tolérance en secondes réelles), la personne connectée', [echeanceJuste(exp, avantR, apresR, 900), uid], [true, gil.id]);
      v('⛔ le mot de passe est BASE64(HMAC-SHA1(secret, nom)) RECALCULÉ ICI avec `crypto` — sans passer par le code du service', turn.credential, hmac64(SECRET_RELAIS, turn.username));
      v('   un autre secret donne un autre mot de passe (la preuve ne se satisfait pas de n\'importe quel calcul)', hmac64(SECRET_RELAIS + 'x', turn.username) === turn.credential, false);
      const rBen = await h1.get('/api/ice'), tBen = relaisDe('Hana demande ses identifiants', rBen);
      v('⛔ L\'APPELÉE en reçoit aussi, dès la sonnerie, et c\'est SON identifiant (il répond en relais)', [rBen.code, tBen.username.split(':')[1], tBen.credential === hmac64(SECRET_RELAIS, tBen.username)], [200, hana.id, true]);
      await raccroche(g1, l1);
      v('⛔ L\'APPEL FINI (Gil a annulé) : plus d\'identifiants, ni pour lui ni pour Hana — le même 404', [dit(await g1.get('/api/ice')), dit(await h1.get('/api/ice'))], [[404, 'introuvable'], [404, 'introuvable']]);
      /* une sonnerie ÉCHUE n'est plus un appel : 404 avant même que le balayeur ne l'ait écrite « manquée » */
      const l1b = await sonnerie(g1, hana.id);
      avancer(10 * MIN);
      v('⛔ UNE SONNERIE ÉCHUE (dix minutes plus tard) : plus d\'identifiants non plus', [l1b.code, dit(await g1.get('/api/ice'))], [201, [404, 'introuvable']]);
      const l2 = await sonnerie(g1, hana.id);
      const avantR2 = maintenant(), r2 = await g1.get('/api/ice'), apresR2 = maintenant(), r3 = await h1.get('/api/ice');
      const t2 = relaisDe('Gil redemande ses identifiants', r2), t3 = relaisDe('Hana redemande ses identifiants', r3), exp2 = Number(t2.username.split(':')[0]);
      /* l'échéance suit l'horloge du service : avancée de dix minutes PAR LE BANC, et du temps réel qui passe entre les deux lectures. Exiger 600 s pile faisait tomber le banc sur une machine chargée
         (8 octobre 2026 : 601), « 600 à 603 » pariait encore sur trois secondes réelles : on exige AU MOINS dix minutes de plus que la première (l'horloge a été avancée d'autant, elle ne recule pas), et
         la valeur exacte par l'encadrement de CETTE requête. */
      v('⛔ SECOND PASSAGE, dix minutes plus tard, dans un appel neuf : une autre échéance (au moins dix minutes après la première, et juste pour l\'heure de cette requête), un autre mot de passe, toujours juste ; et pour Hana, SON identifiant', [exp2 - Number(exp) >= 600, echeanceJuste(exp2, avantR2, apresR2, 900), t2.credential !== turn.credential, t2.credential === hmac64(SECRET_RELAIS, t2.username), t3.username.split(':')[1], t3.credential === hmac64(SECRET_RELAIS, t3.username)], [true, true, true, true, hana.id, true]);
      const r4 = await g1.get('/api/ice'), r5 = await g1.get('/api/ice');
      v('⛔ le plafond : trois lectures par heure (réglage du banc) — Gil en a fait trois (la troisième passe), la quatrième est refusée (429 quota_atteint, Retry-After) ; Hana, lui, a le sien', [r4.code, dit(r5), Number(r5.h.get('retry-after')) > 0, r3.code], [200, [429, 'quota_atteint'], true, 200]);
      await raccroche(g1, l2);
      avancer(HEURE + SEC);
      const l3 = await sonnerie(g1, hana.id);
      v('   et une heure plus tard, dans un appel neuf, elle repasse', [l3.code, (await g1.get('/api/ice')).code], [201, 200]);
      await raccroche(g1, l3);
      const cfg = (await T.client(svc.base).get('/api/config')).j, sante = (await T.client(svc.base).get('/health')).j;
      v('/api/config dit qu\'un relais existe et combien de temps sonne un appel — sans le nom du relais ni son secret', [cfg.appels, JSON.stringify(cfg).includes(HOTE), JSON.stringify(cfg).includes(SECRET_RELAIS)], [{ relais: true, sonnerie_s: 45 }, false, false]);
      v('⛔ /health dit « turn: true » et des nombres — ni le secret, ni le nom du relais, ni un appel, ni le nombre d\'appels perdus (R6)', [sante.appels.turn, JSON.stringify(sante).includes(SECRET_RELAIS), JSON.stringify(sante).includes(HOTE), Object.keys(sante.appels).sort()], [true, false, false, ['ageS', 'echecs', 'turn']]);
      v('⛔ `appels.relais.ttlS` : quinze minutes (900) par défaut, un entier de 60 à 3600 — 59, 3601, un décimal et un texte sont refusés au démarrage, en nommant le champ',
        [appelsConfig({ appels: { relais: { hote: HOTE, secret: SECRET_RELAIS } } }, 'beta').relais.ttlS, appelsConfig({ appels: { relais: { hote: HOTE, secret: SECRET_RELAIS, ttlS: 3600 } } }, 'beta').relais.ttlS,
          [59, 3601, 900.5, '900', 86400].map(x => { try { appelsConfig({ appels: { relais: { hote: HOTE, secret: SECRET_RELAIS, ttlS: x } } }, 'beta'); return false; } catch (e) { return /ttlS/.test(e.message); } })], [900, 3600, [true, true, true, true, true]]);
    }
    {
      /* sans relais : une liste vide, et rien d'un tiers — pour qui est dans un appel (les autres : 404, comme partout) ; sans TLS : le TCP simple en secours, jamais trois adresses */
      const N = await monter({ appels: { entrantsParHeure: 100 } }), N2 = await monter({ appels: { relais: { hote: HOTE, port: 3478, secret: SECRET_RELAIS } } });
      try {
        const duo = async (X) => { const p = X.pers('Ana'), q = X.pers('Ben'); X.S.contactLier(p.id, q.id); const c = X.cl(p); const rr = await c.post('/api/appels', { uid: q.id, type: 'audio' }); return { c, rr }; };
        const { c, rr } = await duo(N);
        const r = await c.get('/api/ice');
        v('⛔ SANS relais configuré : `relais:false`, une liste VIDE, durée nulle — aucun serveur STUN public n\'est proposé en repli', [rr.code, r.code, r.j, r.h.get('cache-control')], [201, 200, { relais: false, ttl_s: 0, serveurs: [] }, 'no-store']);
        v('   /api/config le dit aussi, et /health : turn:false', [(await T.client(N.svc.base).get('/api/config')).j.appels.relais, (await T.client(N.svc.base).get('/health')).j.appels.turn], [false, false]);
        const d2 = await duo(N2), rice = await d2.c.get('/api/ice');
        v('⛔ SANS TLS (pas de `portTls`) : le TCP simple prend sa place — deux adresses de relais, jamais trois ; et la durée par défaut est de quinze minutes', [d2.rr.code, rice.code, tri(relaisDe('sans TLS', rice).urls), rice.j && rice.j.ttl_s], [201, 200, tri(['turn:' + HOTE + ':3478?transport=udp', 'turn:' + HOTE + ':3478?transport=tcp']), 900]);
      } finally { await N.fermer(); await N2.fermer(); }
    }

    /* ═══════ 2. LANCER ═══════ */
    console.log('\nLancer : une conversation directe ou une personne, à deux, entre gens qui peuvent s\'écrire');
    const directe = S.convDirecteObtenir(ana.id, ben.id).id;
    const groupeAutres = S.convCreerGroupe({ createur: cleo.id, nom: 'Autre', membres: [ben.id], annonces_seules: false, ephemere_s: 0 }).id;
    S.contactEtat(eve.id, ana.id, 'bloque');                // Eve a bloqué Ana
    const fA = await ouvrirFlux(a1), fA2 = await ouvrirFlux(a2), fB1 = await ouvrirFlux(b1), fB2 = await ouvrirFlux(b2), fC = await ouvrirFlux(c1);
    const appelsAvant = Number(sql('SELECT COUNT(*) AS n FROM appel').n);          // la section 1 a fait quatre appels (Gil vers Hana) pour obtenir des identifiants : les refus d'ici n'en ajoutent AUCUN
    {
      const corps = { type: 'audio', uid: ben.id };
      v('⛔ le corps est lu avec rigueur : ni conversation ni personne, les deux à la fois, un type absent ou inconnu, un identifiant mal formé, SOI-MÊME → 400 `champ_invalide`, et rien n\'est écrit',
        [(await a1.post('/api/appels', { type: 'audio' })).j, (await a1.post('/api/appels', { type: 'audio', conv: directe, uid: ben.id })).j, (await a1.post('/api/appels', { uid: ben.id })).j, (await a1.post('/api/appels', { uid: ben.id, type: 'visio' })).j,
         (await a1.post('/api/appels', { uid: 'p_zz', type: 'audio' })).j, (await a1.post('/api/appels', { conv: 'c_zz', type: 'audio' })).j, (await a1.post('/api/appels', { uid: ana.id, type: 'audio' })).j,
         (await a1.post('/api/appels', { uid: { $ne: 1 }, type: 'audio' })).j, (await a1.post('/api/appels', [corps])).j].map(j => j && j.error),
        new Array(9).fill('champ_invalide'));
      v('   population : aucun appel n\'existe après ces neuf refus', Number(sql('SELECT COUNT(*) AS n FROM appel').n) - appelsAvant, 0);
      /* un GROUPE sonne depuis l'étape 8 (`test-987` joue l'appel de groupe) ; la conversation d'une RÉUNION, elle, n'appelle personne : elle a sa salle (« Rejoindre », `test-988`) */
      const debutR = Date.now() + 3 * 86400000;
      const convReunion = S.reunionCreer({ hote: ana.id, titre: 'Point', lieu: '', debut: debutR, fin: debutR + 3600000, tz: 'Europe/Paris', rep: 'aucune', rappels: [], invites: [ben.id], prochain: debutR }).conv;
      const g = await a1.post('/api/appels', { conv: convReunion, type: 'audio' });
      v('⛔ la conversation d\'une RÉUNION n\'appelle personne : refus propre `appel_a_deux` (409), rien d\'écrit', [dit(g), Number(sql('SELECT COUNT(*) AS n FROM appel').n) - appelsAvant], [[409, 'appel_a_deux'], 0]);
      const hors = await a1.post('/api/appels', { conv: groupeAutres, type: 'audio' }), vide = await a1.post('/api/appels', { conv: 'c_' + '0'.repeat(32), type: 'audio' });
      v('⛔ une conversation où je ne suis PAS, et une qui n\'existe pas : la MÊME réponse (404 introuvable, au caractère près)', [dit(hors), hors.txt === vide.txt], [[404, 'introuvable'], true]);
    }
    {
      /* ⛔ qui peut se joindre : la règle de la messagerie, et SA réponse */
      const inconnu = await a1.post('/api/appels', { uid: d1.moi.id, type: 'audio' });                       // Dan : contact de Ben, pas d'Ana
      const bloque = await a1.post('/api/appels', { uid: eve.id, type: 'audio' });                          // Eve a bloqué Ana
      const fantome = await a1.post('/api/appels', { uid: 'p_' + crypto.randomBytes(16).toString('hex'), type: 'audio' });
      const nova = await a1.post('/api/appels', { uid: inconnue.id, type: 'audio' });
      v('⛔ un inconnu, une personne qui m\'a BLOQUÉE, une personne qui n\'existe pas, une personne sans lien : la MÊME réponse (404 introuvable) — un appel ne dit pas qu\'on a été bloqué', [dit(inconnu), inconnu.txt === bloque.txt, bloque.txt === fantome.txt, fantome.txt === nova.txt], [[404, 'introuvable'], true, true, true]);
      v('   et dans l\'autre sens : Ana a bloqué Eve, qui l\'appelle — le même 404', dit(await e1.post('/api/appels', { uid: ana.id, type: 'audio' })), [404, 'introuvable']);
      v('population : aucun appel n\'a été écrit par ces refus', Number(sql('SELECT COUNT(*) AS n FROM appel').n) - appelsAvant, 0);
      /* un compte effacé (410) : une directe existe avec lui */
      const dF = S.convDirecteObtenir(ana.id, fred.id).id;
      const brut = new DatabaseSync(M.chemin); brut.prepare('UPDATE personne SET suppression_le = ? WHERE id = ?').run(maintenant() - 1, fred.id); brut.close();
      S.compteEffacer(fred.id);
      v('⛔ une conversation directe avec un compte EFFACÉ : 410 `compte_supprime` (et par son identifiant : le 404 de tout inconnu)', [dit(await a1.post('/api/appels', { conv: dF, type: 'audio' })), dit(await a1.post('/api/appels', { uid: fred.id, type: 'audio' }))], [[410, 'compte_supprime'], [404, 'introuvable']]);
    }
    let appel1 = null, sonnerieReelle = () => {}, fB1neuf = null;
    {
      const r = await a1.post('/api/appels', { conv: directe, type: 'video' });
      sonnerieReelle = fenetreReelle('de « lancer » à « Ben répond » (la sonnerie de 45 s, dont 6 s avancées par le banc)', 39);
      /* ⛔ une mesure qui échoue dit pourquoi (`vueDe`) : la CI est morte ici sur « undefined.lie » (5 novembre 2026, 39 ✓), sans dire ce que le service avait rendu */
      appel1 = vueDe('lancer l\'appel', r);
      v('lancer par la conversation directe : 201 et la vue de l\'appelante (sortante, vidéo, Ben en face, appareil lié)', [r.code, appel1.etat, appel1.sens, appel1.type, appel1.autre.id, appel1.lie, /^a_[0-9a-f]{32}$/.test(appel1.id)], [201, 'sonne', 'sortant', 'video', ben.id, true, true]);
      const eB = await evenement(fB1, 'l\'événement `appel` sur le premier appareil de Ben', e => e.event === 'appel'), eB2 = await evenement(fB2, 'l\'événement `appel` sur le second appareil de Ben', e => e.event === 'appel');
      v('⛔ Ben l\'apprend sur SES DEUX appareils, par l\'événement durable `appel` (vue entrante, aucun appareil lié) — Cleo, qui n\'y est pas, ne reçoit RIEN', [eB.data.etat, eB.data.sens, eB.data.lie, eB2.data.id === appel1.id], ['sonne', 'entrant', false, true]);
      const m = await a1.post('/api/conversations/' + S.convDirecteObtenir(ana.id, cleo.id).id + '/messages', { cid: 'cid-marqueur-0001', texte: 'marqueur' });
      const vivantC = await marqueur(fC, 'le marqueur de Cleo', 'marqueur');
      vrai('   (marqueur reçu par Cleo APRÈS : son flux est vivant) et elle n\'a reçu aucun `appel`', m.code === 201 && vivantC && fC.evenements.filter(e => e.event === 'appel').length === 0);
      const l = (await b1.get('/api/appels')).j || {}, la = (await a1.get('/api/appels')).j || {};
      v('GET /api/appels : l\'historique est vide (rien de fini), et `actif` reprend l\'appel qui sonne — pour les deux', [l.appels, l.actif && l.actif.id === appel1.id, l.actif && l.actif.sens, la.actif && la.actif.lie], [[], true, 'entrant', true]);
      v('⛔ occupée : Ana, qui est dans un appel, n\'en lance pas un second — 409 `occupe` avec `moi:true`', [dit(await a1.post('/api/appels', { uid: cleo.id, type: 'audio' })), ((await a1.post('/api/appels', { uid: cleo.id, type: 'audio' })).j || {}).moi], [[409, 'occupe'], true]);
      const occ = await c1.post('/api/appels', { uid: ben.id, type: 'audio' });
      v('⛔ Ben est dans un appel : Cleo reçoit 409 `occupe` avec `moi:false`, et Ben le lira « manqué » avec UNE notification', [dit(occ), (occ.j || {}).moi, Number(sql(`SELECT COUNT(*) AS n FROM notification WHERE uid = ? AND type = 'appel_manque'`, ben.id).n), ((await b1.get('/api/appels?filtre=manques')).j.appels || []).length], [[409, 'occupe'], false, 1, 1]);
      v('   le filtre `filtre=manques` ne garde que les entrants non pris, `filtre=tout` est refusé (400)', [((await b1.get('/api/appels?filtre=manques')).j.appels || []).map(x => x.etat), dit(await b1.get('/api/appels?filtre=tout'))], [['occupe'], [400, 'champ_invalide']]);
    }

    /* ═══════ 3. RÉPONDRE, ET LES APPAREILS ═══════ */
    console.log('\nRépondre : l\'appareil qui répond est LIÉ, un second reçoit appel_pris, un étranger reçoit le 404 d\'un appel inexistant');
    {
      const id = appel1.id;
      v('⛔ un étranger (Cleo) : 404 introuvable, identique à un appel qui n\'existe pas, au caractère près', [dit(await c1.post('/api/appels/' + id + '/repondre', { accepte: true })), (await c1.post('/api/appels/' + id + '/repondre', { accepte: true })).txt === (await c1.post('/api/appels/a_' + '0'.repeat(32) + '/repondre', { accepte: true })).txt], [[404, 'introuvable'], true]);
      v('l\'appelante ne répond pas à son propre appel : 403 `interdit` ; `accepte` doit être un booléen : 400', [dit(await a1.post('/api/appels/' + id + '/repondre', { accepte: true })), dit(await b1.post('/api/appels/' + id + '/repondre', { accepte: 'oui' })), dit(await b1.post('/api/appels/' + id + '/repondre', {}))], [[403, 'interdit'], [400, 'champ_invalide'], [400, 'champ_invalide']]);
      avancer(6 * SEC);
      const rep = await b1.post('/api/appels/' + id + '/repondre', { accepte: true });
      sonnerieReelle();
      /* ⛔ c'est ICI que la CI est morte (« undefined.lie », 39 ✓, 5 et 16 novembre 2026) : le balayeur, passé pendant que l'horloge du service avait sauté à l'heure réelle, avait dit l'appel
         « manqué » — Ben recevait 409 `appel_fini`, sans vue d'appel. `vueDe` dit désormais ce que le service a rendu. */
      v('Ben répond depuis son premier appareil : 200, « en cours », l\'appareil est lié', [rep.code, (rep.j || {}).etat, (rep.j || {}).deja, vueDe('Ben répond', rep).lie], [200, 'en_cours', false, true]);
      const enCours = (e) => e.event === 'appel' && e.data.etat === 'en_cours';
      const eA = await evenement(fA, '« en cours » sur l\'appareil lié d\'Ana', enCours), eA2 = await evenement(fA2, '« en cours » sur l\'autre appareil d\'Ana', enCours);
      vrai('   Ana l\'apprend par l\'événement, sur son appareil (et sur l\'autre, qui n\'est pas lié)', !eA.absent && !eA2.absent);
      v('le même appareil qui répond deux fois : la même vue (`deja:true`)', [((await b1.post('/api/appels/' + id + '/repondre', { accepte: true })).j || {}).deja], [true]);
      v('⛔ son SECOND appareil ne vole pas l\'appel : 409 `appel_pris` (accepter comme refuser)', [dit(await b2.post('/api/appels/' + id + '/repondre', { accepte: true })), dit(await b2.post('/api/appels/' + id + '/repondre', { accepte: false }))], [[409, 'appel_pris'], [409, 'appel_pris']]);
      v('⛔ un autre appareil d\'Ana ne raccroche pas son appel : 403 `appareil_non_lie` (et rien n\'est fini)', [dit(await a2.post('/api/appels/' + id + '/quitter', {})), (((await a1.get('/api/appels')).j || {}).actif || {}).etat], [[403, 'appareil_non_lie'], 'en_cours']);
    }

    /* ═══════ 3 bis. UNE SONNERIE ÉCHUE NE SE PREND PLUS, MÊME SI LE BALAYEUR N'EST PAS ENCORE PASSÉ ═══════ */
    console.log('\nUne sonnerie ÉCHUE ne se prend plus, même quand le balayeur n\'est pas encore passé');
    {
      /* un service dont le balayeur ne repasse que dans une minute RÉELLE : entre l'avance de l'horloge et la réponse, personne ne « finit » l'appel à la place de la route (avec le balayeur de ce banc, une seconde,
         la mutation « la route ne juge plus l'échéance » ne tombait que si la réponse arrivait avant son passage — un survivant de fait) */
      const L = await monter({ appels: { balayageMs: 60000, perduMs: 600000, parHeure: 100, parPaireHeure: 100, entrantsParHeure: 600, iceParHeure: 100 } });
      try {
        const lia = L.pers('Lia'), leo = L.pers('Leo'); L.S.contactLier(lia.id, leo.id);
        const lc = L.cl(lia), qc = L.cl(leo), anon = T.client(L.svc.base);
        await T.attendre(async () => { const h = (await anon.get('/health')).j; return h && h.appels && typeof h.appels.ageS === 'number' ? h : null; }, 8000, 40);   // le PREMIER passage (une seconde après le démarrage) a eu lieu : le suivant est dans une minute
        const r = await lc.post('/api/appels', { uid: leo.id, type: 'audio' });
        L.avancer(46 * SEC);                                               // la sonnerie (45 s) est échue
        const age = (await anon.get('/health')).j.appels.ageS;
        const rep = await qc.post('/api/appels/' + vueDe('Lia appelle Leo', r).id + '/repondre', { accepte: true });
        const liste = (await qc.get('/api/appels')).j || {}; if (!Array.isArray(liste.appels)) liste.appels = [];
        v('⛔ répondre à une sonnerie ÉCHUE (+46 s ; population : le balayeur n\'est PAS repassé, son dernier tour date de 46 s ou plus) : 409 `appel_fini` — l\'appel n\'est pas pris, il est « manqué » pour Leo, rien n\'est actif',
          [age >= 46, dit(rep), liste.appels[0] && liste.appels[0].etat, liste.appels[0] && liste.appels[0].manque, liste.actif], [true, [409, 'appel_fini'], 'manque', true, null]);
      } finally { await L.fermer(); }
    }

    /* ═══════ 4. LE SIGNAL ═══════ */
    console.log('\nLe signal : relayé à l\'appareil LIÉ de l\'autre personne, et à personne d\'autre');
    {
      const id = appel1.id, sig = (c, a, type, donnees) => c.post('/api/appels/' + id + '/signal', donnees === undefined ? { a, type } : { a, type, donnees });
      const ro = await sig(a1, ben.id, 'offre', { sdp: CANARI_SDP });
      v('Ana envoie son offre : 200', dit(ro), [200, undefined]);
      const recu = await evenement(fB1, 'l\'offre d\'Ana sur l\'appareil lié de Ben', e => e.event === 'signal' && e.data.type === 'offre');
      v('⛔ l\'appareil lié de Ben la reçoit, enveloppe intacte : l\'appel, l\'expéditrice, le genre, les données telles quelles', [recu.data.appel, recu.data.de, recu.data.type, recu.data.donnees.sdp === CANARI_SDP], [id, ana.id, 'offre', true]);
      const rr = await sig(b1, ana.id, 'reponse', { sdp: 'v=0\r\no=CANARI-REP-WQXZ\r\n' });
      const recuA = await evenement(fA, 'la réponse de Ben sur l\'appareil lié d\'Ana', e => e.event === 'signal' && e.data.type === 'reponse');
      v('Ben répond : l\'appareil lié d\'Ana la reçoit', [dit(rr), recuA.data.de], [[200, undefined], ben.id]);
      await sig(a1, ben.id, 'candidats', { c: [CANARI_CAND] }); await sig(b1, ana.id, 'etat', { camera: false }); await sig(a1, ben.id, 'pouls');
      /* ⛔ les marqueurs : un message de chacun à l'autre arrive à TOUS les appareils de l'autre — après, un signal parti à tort serait déjà là */
      await a1.post('/api/conversations/' + directe + '/messages', { cid: 'cid-marqueur-0002', texte: 'après les signaux (Ana)' });
      await b1.post('/api/conversations/' + directe + '/messages', { cid: 'cid-marqueur-0003', texte: 'après les signaux (Ben)' });
      const vivants = [await marqueur(fB2, 'le marqueur du second appareil de Ben', 'après les signaux (Ana)'), await marqueur(fA2, 'le marqueur de l\'autre appareil d\'Ana', 'après les signaux (Ben)'),
        await marqueur(fB1, 'le marqueur de l\'appareil lié de Ben', 'après les signaux (Ana)'), await marqueur(fA, 'le marqueur de l\'appareil lié d\'Ana', 'après les signaux (Ben)')];
      const sB2 = fB2.evenements.filter(e => e.event === 'signal').length, sA2 = fA2.evenements.filter(e => e.event === 'signal').length;
      v('⛔ le SECOND appareil de Ben et l\'AUTRE appareil d\'Ana ne reçoivent AUCUN signal (population : leurs flux sont vivants, chacun a reçu le marqueur qui suit — exigé)', [sB2, sA2, vivants], [0, 0, [true, true, true, true]]);
      v('   et l\'appareil lié de Ben a reçu offre, candidats (de Ana) — son propre état ne lui revient pas ; celui d\'Ana : réponse, état (de Ben)', [fB1.evenements.filter(e => e.event === 'signal').map(e => e.data.type), fA.evenements.filter(e => e.event === 'signal').map(e => e.data.type)], [['offre', 'candidats'], ['reponse', 'etat']]);
      vrai('   un `pouls` prouve que l\'appareil est là, mais ne voyage PAS (personne n\'en reçoit)', ![...fA.evenements, ...fB1.evenements].some(e => e.event === 'signal' && e.data.type === 'pouls'));
      /* la validation de l'enveloppe */
      v('⛔ le destinataire est l\'AUTRE participant de CET appel, rien d\'autre : un tiers, soi-même, rien, un type inconnu, des données absentes ou qui ne sont pas un objet → 400',
        [await sig(a1, cleo.id, 'offre', {}), await sig(a1, ana.id, 'offre', {}), await sig(a1, undefined, 'offre', {}), await sig(a1, ben.id, 'commande', {}), await sig(a1, ben.id, 'offre'), await sig(a1, ben.id, 'offre', 'texte'), await sig(a1, ben.id, 'offre', [1]), await sig(a1, ben.id, 'offre', null)].map(x => x.j && x.j.error),
        new Array(8).fill('champ_invalide'));
      const taille = (n) => ({ x: 'y'.repeat(n - JSON.stringify({ x: '' }).length) });
      const pile = taille(16384), trop = taille(16385);
      v('⛔ 16 Ko PILE (16 384 octets de JSON) passent ; un octet de plus : 413 `signal_trop_gros`', [Buffer.byteLength(JSON.stringify(pile)), dit(await sig(a1, ben.id, 'candidats', pile)), Buffer.byteLength(JSON.stringify(trop)), dit(await sig(a1, ben.id, 'candidats', trop))], [16384, [200, undefined], 16385, [413, 'signal_trop_gros']]);
      /* ⛔ R1 (relecture) : un signal IMBRIQUÉ se mesure sans jamais lever. `JSON.stringify` d'un objet à 5 000 niveaux lève « Maximum call stack size exceeded » — la route rendait 500 `erreur_interne` pour 30 Ko de
         corps (sous la limite). Le corps part EN TEXTE : le construire en objet ici lèverait avant même d'envoyer. */
      const chemin = '/api/appels/' + id + '/signal', imbrique = (n) => '{"a":"' + ben.id + '","type":"candidats","donnees":' + '{"x":'.repeat(n) + '1' + '}'.repeat(n) + '}';
      const profonds = [];
      for (const n of [8, 9, 100, 5000]) profonds.push(dit(await a1.post(chemin, imbrique(n))));
      v('⛔ un signal imbriqué : 8 niveaux passent ; 9, 100 et 5 000 (30 Ko de corps) → 413 `signal_trop_gros` — jamais un 500 (avant : 5 000 niveaux = `erreur_interne`)',
        profonds, [[200, undefined], [413, 'signal_trop_gros'], [413, 'signal_trop_gros'], [413, 'signal_trop_gros']]);
      v('   le service vit toujours après le 5 000 niveaux (un signal ordinaire repasse : 200)', (await sig(a1, ben.id, 'candidats', { i: 'apres-profond' })).code, 200);
      /* la mesure elle-même, sans le service : un million de niveaux (construits sans récursion) → Infinity, pas une exception ; 16 384 octets pile → 16 384 ; une liste de 5 000 conteneurs vides (15 Ko : sous la
         borne en octets, mais ce n'est pas un signal) → Infinity */
      let abime = {}; for (let k = 0; k < 1000000; k++) abime = { x: abime };
      let leve = null, mesures = null;
      try { mesures = [tailleSignal(abime), tailleSignal({ x: 'y'.repeat(16384 - JSON.stringify({ x: '' }).length) }), tailleSignal({ c: new Array(5000).fill(0).map(() => ({})) }), tailleSignal({ c: [{ candidate: 'a', sdpMid: '0' }] })]; } catch (e) { leve = String(e); }
      v('⛔ `tailleSignal` : un million de niveaux ne lève PAS (Infinity), 16 384 octets pèsent 16 384, 5 000 conteneurs vides (15 Ko) ne sont pas un signal (Infinity), un vrai lot de candidats pèse ce que dit JSON', [leve, mesures && mesures.map(String)], [null, ['Infinity', '16384', 'Infinity', String(JSON.stringify({ c: [{ candidate: 'a', sdpMid: '0' }] }).length)]]);          // en TEXTE : JSON confond Infinity et NaN avec null
      /* le débit : dix par minute pour cet appel et cette personne (réglage du banc) */
      avancer(2 * MIN);
      const minuteReelle = fenetreReelle('les douze signaux du débit (une fenêtre d\'une minute)', 60);
      const codes = []; for (let i = 0; i < 12; i++) codes.push((await sig(a1, ben.id, 'candidats', { i })).code);
      minuteReelle();
      v('⛔ le DÉBIT est plafonné par appel et par personne : dix signaux par minute (réglage du banc), les suivants 429 `quota_atteint` ; Ben, lui, a son propre plafond', [codes.filter(c => c === 200).length, codes.filter(c => c === 429).length, (await sig(b1, ana.id, 'etat', { camera: true })).code], [10, 2, 200]);
      avancer(61 * SEC);
      v('   une minute plus tard, le plafond est levé', (await sig(a1, ben.id, 'candidats', { i: 'après' })).code, 200);
      v('⛔ un étranger ne signale rien dans cet appel (404 identique à un appel inexistant), et Ana depuis son AUTRE appareil non plus (403 `appareil_non_lie`)', [dit(await sig(c1, ben.id, 'offre', {})), dit(await sig(a2, ben.id, 'offre', {}))], [[404, 'introuvable'], [403, 'appareil_non_lie']]);
    }

    /* ═══════ 5. RETENU PUIS LIVRÉ ═══════ */
    console.log('\nUn signal envoyé pendant que le flux de Ben est coupé est RETENU, puis livré à son ouverture — et périmé au bout de 30 s');
    {
      const id = appel1.id, sig = (c, a, type, donnees) => c.post('/api/appels/' + id + '/signal', { a, type, donnees });
      /* ⛔ le flux de Ben est fermé quand LE SERVICE le dit (`fermerFlux`), pas quand le banc a fini de lire : sans ça, « retenu-1 » partait parfois sur la connexion que le service croyait encore
         ouverte, et se perdait (2 passages sur 60 sous charge) */
      vrai('population : le service a VU le flux de Ben fermé (un flux de moins dans /health) — les signaux qui suivent n\'ont aucun flux où aller', await M.fermerFlux(fB1));
      const envois = [await sig(a1, ben.id, 'candidats', { c: ['retenu-1'] }), await sig(a1, ben.id, 'candidats', { c: ['retenu-2'] })];
      const retenueReelle = fenetreReelle('de l\'envoi des signaux retenus à la réouverture du flux (retenus 30 s)', 30);
      const f1 = await ouvrirFlux(b1);
      retenueReelle();
      await T.attendre(() => f1.evenements.filter(e => e.event === 'signal').length >= 2, 4000, 20);
      v('⛔ les deux signaux retenus (envoyés : 200, 200) arrivent À L\'OUVERTURE du flux, dans l\'ordre', [envois.map(x => x.code), f1.evenements.filter(e => e.event === 'signal').map(e => e.data && e.data.donnees && e.data.donnees.c && e.data.donnees.c[0])], [[200, 200], ['retenu-1', 'retenu-2']]);
      vrai('population : le service a VU ce flux fermé à son tour, avant le signal qui doit se périmer', await M.fermerFlux(f1));
      const perime = await sig(a1, ben.id, 'candidats', { c: ['périmé'] });
      avancer(31 * SEC);
      const f2 = await ouvrirFlux(b1);
      await b1.post('/api/conversations/' + directe + '/messages', { cid: 'cid-marqueur-0004', texte: 'marqueur après réouverture' });
      const vivant = await marqueur(f2, 'le marqueur après la réouverture', 'marqueur après réouverture');
      v('⛔ un signal de plus de 30 s (envoyé : 200) n\'est PAS livré (un candidat périmé ne sert à rien, et rien ne s\'accumule : population = le marqueur reçu après la réouverture — exigé)', [perime.code, f2.evenements.filter(e => e.event === 'signal').length, vivant], [200, 0, true]);
      await M.fermerFlux(f2);
      fB1neuf = await ouvrirFlux(b1);
    }

    /* ═══════ 6. RACCROCHER, PUIS RIEN NE SIGNALE PLUS ═══════ */
    console.log('\nRaccrocher : l\'appareil lié, une fois ; ensuite plus rien ne se signale ni ne se répond');
    {
      const id = appel1.id;
      avancer(20 * SEC);
      const q = await a1.post('/api/appels/' + id + '/quitter', {});
      const vq = vueDe('Ana raccroche', q);
      v('Ana raccroche depuis l\'appareil lié : 200, « fini » (durée = le temps passé depuis la réponse)', [q.code, (q.j || {}).ok, (q.j || {}).deja, vq.etat, vq.duree_s > 0], [200, true, false, 'fini', true]);
      /* ⛔ T1 (relecture) : la FIN d'un appel est connue de CHAQUE session des DEUX personnes — l'événement durable `appel` est écrit pour chaque participant et atteint tous leurs flux, y compris ceux qui n'ont
         jamais tenu l'appel (le second appareil d'Ana, le second de Ben) : c'est ce qui permet à ces pages de relire leur historique. */
      const fin = (e) => e.event === 'appel' && e.data.id === id && e.data.etat === 'fini';
      /* ⛔ `attendre` ne rejette jamais : elle rend `null` au bout de son plafond. L'ancien `.then(() => true, () => false)` valait donc TOUJOURS vrai — une moitié de contrôle qui ne pouvait pas
         tomber (vu le 16 novembre 2026 : « [true, true, true, true] » à côté d'un flux qui n'avait rien reçu). On lit ce qu'elle rend. */
      const noms = ['l\'appareil lié d\'Ana', 'l\'autre appareil d\'Ana', 'l\'appareil lié de Ben', 'le second appareil de Ben'];
      const bout = (await Promise.all([fA, fA2, fB1neuf, fB2].map((f, i) => evenement(f, 'la fin de l\'appel sur ' + noms[i], fin)))).map(e => !e.absent);
      v('⛔ la fin de l\'appel arrive à TOUTES les sessions des deux personnes : l\'appareil lié d\'Ana, son AUTRE appareil, l\'appareil lié de Ben, son SECOND (population : quatre flux ouverts, chacun a vu le marqueur plus haut)', [bout, [fA, fA2, fB1neuf, fB2].map(f => f.evenements.filter(fin).length > 0)], [[true, true, true, true], [true, true, true, true]]);
      v('⛔ rejouer le geste (la page raccroche après que l\'autre l\'a fait) : 200 `deja:true`, rien d\'écrit', [((await a1.post('/api/appels/' + id + '/quitter', {})).j || {}).deja, ((await b1.post('/api/appels/' + id + '/quitter', {})).j || {}).deja], [true, true]);
      v('⛔ un appel fini ne se signale plus (409 `appel_fini`) ni ne se répond (409 `appel_fini`)', [dit(await a1.post('/api/appels/' + id + '/signal', { a: ben.id, type: 'etat', donnees: {} })), dit(await b1.post('/api/appels/' + id + '/repondre', { accepte: true }))], [[409, 'appel_fini'], [409, 'appel_fini']]);
      const hb = (await b1.get('/api/appels')).j || {}, ha = (await a1.get('/api/appels')).j || {};
      for (const h of [ha, hb]) if (!Array.isArray(h.appels)) h.appels = [];
      v('l\'historique des deux porte l\'appel (fini, sortant pour Ana, entrant pour Ben, pas « manqué »), plus rien n\'est actif', [ha.appels.map(x => [x.etat, x.sens, x.manque]), hb.appels.filter(x => x.id === id).map(x => [x.etat, x.sens, x.manque]), ha.actif, hb.actif], [[['fini', 'sortant', false]], [['fini', 'entrant', false]], null, null]);
      v('GET /api/appels ne rend de l\'autre personne que son nom court (identifiant, prénom, nom, avatar) — rien d\'une session ni d\'une adresse', Object.keys((ha.appels[0] || {}).autre || {}).sort(), ['avatar', 'id', 'nom', 'prenom']);
    }

    /* ═══════ 7. LES PLAFONDS DE LANCEMENT ═══════ */
    console.log('\nLes plafonds de lancement : par paire, par personne, un compte neuf à un tiers');
    {
      const lancerFinir = async (c, vers) => { const r = await c.post('/api/appels', { uid: vers, type: 'audio' }); if (r.code === 201) await c.post('/api/appels/' + vueDe('lancer puis raccrocher', r).id + '/quitter', {}); return r; };
      avancer(2 * HEURE);                                      // la fenêtre d'une heure est vide
      const b3 = []; for (let i = 0; i < 4; i++) b3.push((await lancerFinir(a1, ben.id)).code);
      v('⛔ PAR PAIRE : trois appels par heure vers la même personne (réglage du banc), le quatrième est refusé 429 `quota_atteint` avec Retry-After', [b3, (await a1.post('/api/appels', { uid: ben.id, type: 'audio' })).h.get('retry-after') > 0], [[201, 201, 201, 429], true]);
      const autres = []; for (let i = 0; i < 4; i++) autres.push((await lancerFinir(a1, cleo.id)).code);
      v('⛔ PAR PERSONNE : six tentatives par heure en tout (réglage du banc), et UNE TENTATIVE REFUSÉE COMPTE (le plafond de la paire est jugé après celui de la personne) — Ana en a déjà fait cinq vers Ben (trois passées, deux refusées) : le sixième lancement, vers Cleo, passe ; les suivants, vers n\'importe qui, sont refusés (429 quota_atteint)', [autres, ((await a1.post('/api/appels', { uid: cleo.id, type: 'audio' })).j || {}).error], [[201, 429, 429, 429], 'quota_atteint']);
      /* un compte neuf (moins de 24 h, hors bêta) a un tiers des limites : 2 au lieu de 6 */
      const z = []; for (let i = 0; i < 3; i++) z.push((await lancerFinir(z1, ben.id)).code);
      v('⛔ un compte NEUF (moins de 24 h, hors bêta) a un tiers du plafond : 2 appels par heure au lieu de 6', z, [201, 201, 429]);
      avancer(HEURE + SEC);
      v('   la fenêtre passée, les limites reviennent', [(await lancerFinir(a1, ben.id)).code, (await lancerFinir(a1, cleo.id)).code], [201, 201]);
    }

    /* ═══════ 7 bis. LE PLAFOND PAR PERSONNE APPELÉE (relecture, I4) ═══════ */
    console.log('\n⛔ Le plafond par personne APPELÉE : plusieurs comptes qui font sonner la même personne ne sont arrêtés par aucun plafond d\'appelant');
    {
      const N = await monter({ appels: { parHeure: 50, parPaireHeure: 20, entrantsParHeure: 3 } });
      try {
        const cible = N.pers('Zed'), etranger = N.pers('Etranger'), autre = N.pers('Autre');
        const appelants = ['Alba', 'Bruno', 'Chloe', 'Dario', 'Elsa'].map(n => N.pers(n));
        for (const p of appelants) N.S.contactLier(p.id, cible.id);
        N.S.contactLier(appelants[0].id, autre.id);
        const cs = appelants.map(p => N.cl(p)), cz = N.cl(cible), ce = N.cl(etranger);
        const lancerFinir = async (c, vers) => { const r = await c.post('/api/appels', { uid: vers, type: 'audio' }); if (r.code === 201) await c.post('/api/appels/' + vueDe('lancer puis raccrocher', r).id + '/quitter', {}); return r; };
        const codes = []; for (let i = 0; i < 3; i++) codes.push((await lancerFinir(cs[i], cible.id)).code);
        const r4 = await cs[3].post('/api/appels', { uid: cible.id, type: 'audio' });
        v('⛔ trois appelants DIFFÉRENTS font sonner Zed (le plafond du banc : trois par heure) ; le QUATRIÈME est refusé 429 `appele_sature`, avec l\'attente (Retry-After et `retry`) pour que l\'appelant la lise', [codes, dit(r4), Number(r4.h.get('retry-after')) > 0 && Number(r4.h.get('retry-after')) <= 3600, (r4.j || {}).retry > 0 && (r4.j || {}).retry <= 3600], [[201, 201, 201], [429, 'appele_sature'], true, true]);
        const hz = (await cz.get('/api/appels')).j || {};
        v('⛔ le refus n\'écrit RIEN : Zed lit trois appels dans son historique (population : trois, pas quatre), et aucun n\'est actif', [(hz.appels || []).length, hz.actif], [3, null]);
        v('   une AUTRE personne appelée n\'est pas touchée (le plafond est par personne appelée) ; et qui ne peut pas joindre Zed reçoit le 404 d\'une personne introuvable — jamais « saturé » (un refus de plafond ne dit rien à qui n\'a pas le droit d\'appeler)', [(await lancerFinir(cs[0], autre.id)).code, dit(await ce.post('/api/appels', { uid: cible.id, type: 'audio' }))], [201, [404, 'introuvable']]);
        /* les appels « occupé » comptent aussi : ils font une notification d'appel manqué chez la personne */
        N.avancer(HEURE + SEC);
        const premier = await cs[0].post('/api/appels', { uid: cible.id, type: 'audio' });
        const idPremier = vueDe('Alba fait sonner Zed', premier).id;
        const prise = await cz.post('/api/appels/' + idPremier + '/repondre', { accepte: true });
        const occupes = [(await cs[1].post('/api/appels', { uid: cible.id, type: 'audio' })), (await cs[2].post('/api/appels', { uid: cible.id, type: 'audio' }))];
        const quatrieme = await cs[3].post('/api/appels', { uid: cible.id, type: 'audio' });
        v('⛔ un appel pris, puis deux « occupé » : ILS COMPTENT (trois reçus) — le quatrième appelant est refusé `appele_sature` et non `occupe`', [premier.code, prise.code, occupes.map(dit), dit(quatrieme)], [201, 200, [[409, 'occupe'], [409, 'occupe']], [429, 'appele_sature']]);
        N.avancer(HEURE + SEC);
        await cs[0].post('/api/appels/' + idPremier + '/quitter', {});
        v('   une heure plus tard le plafond est levé : Elsa fait sonner Zed', (await lancerFinir(cs[4], cible.id)).code, 201);
        /* la configuration : un entier de 1 à 600, 30 par défaut */
        const refuse = (x) => { try { appelsConfig({ appels: { entrantsParHeure: x } }, 'beta'); return false; } catch (e) { return /entrantsParHeure/.test(e.message); } };
        v('⛔ `appels.entrantsParHeure` : 30 par défaut, un entier de 1 à 600 — zéro, 601, un décimal et un texte sont refusés au démarrage, en nommant le champ', [appelsConfig({}, 'beta').entrantsParHeure, appelsConfig({ appels: { entrantsParHeure: 600 } }, 'beta').entrantsParHeure, [0, 601, 2.5, '30'].map(refuse)], [30, 600, [true, true, true, true]]);
      } finally { await N.fermer(); }
    }

    /* ═══════ 8. RIEN NE SE RANGE, RIEN NE SE JOURNALISE ═══════ */
    console.log('\nRien d\'un signal ne se range, rien d\'un relais ne se journalise');
    {
      const base = octetsBase(M.chemin), sortie = svc.sortie.texte();
      const lu = (quoi) => [['base', base], ['journal du service', Buffer.from(sortie)]].filter(([, b]) => b.includes(quoi)).map(([n]) => n);
      vrai('population : la base pèse de vrais octets et le journal du service a de vraies lignes (' + base.length + ' octets, ' + sortie.split('\n').length + ' lignes)', base.length > 50000 && sortie.split('\n').length >= 3);
      for (const [nom, motif] of [['le SDP (canari)', 'CANARI-SDP-WQXZ'], ['le SDP de la réponse (canari)', 'CANARI-REP-WQXZ'], ['un candidat (canari)', 'CANARI-CAND-WQXZ'], ['l\'adresse réseau d\'un candidat', '198.51.100.77'], ['les candidats retenus', 'retenu-1'], ['le secret du relais', SECRET_RELAIS], ['le nom du relais', HOTE]]) {
        v('⛔ ' + nom + ' : nulle part dans la base ni dans le journal du service', lu(motif), []);
      }
      const ids = [...new Set(sortie.match(/a_[0-9a-f]{32}/g) || [])];
      v('⛔ aucun identifiant d\'appel complet dans le journal du service (population : ' + sortie.split('\n').length + ' lignes lues)', ids, []);
      vrai('aucun identifiant de personne complet dans le journal du service', !/p_[0-9a-f]{32}/.test(sortie));
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    console.log('    les derniers échanges avec le service (du plus ancien au plus récent) :\n' + TRACE.map(l => '      ' + l).join('\n'));
    console.log('    la fin du journal du service :\n' + svc.sortie.texte().slice(-1200));
    process.exitCode = 1;
  }
  /* les fenêtres du service qui courent aussi sur l'heure réelle : leur temps est DIT dès qu'un contrôle est tombé (une machine trop lente pour le pari se lit ici, pas dans un refus inexpliqué) */
  if (process.exitCode || C.ko || process.env.BANC_TEMPS) console.log('    temps réels des fenêtres du service : ' + (TEMPS_REELS.join(' ; ') || 'aucune fenêtre atteinte'));
  for (const f of flux) { try { f.fermer(); } catch (e) { /* fermé */ } }
  await M.fermer();
  fin();
})();
