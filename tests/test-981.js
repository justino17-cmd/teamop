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
   ne prouve pas qu'on ne lui a rien envoyé.

   ⛔ CE BANC NE PARIE PLUS SUR LE TEMPS RÉEL (17 novembre 2026). Il est mort en CI le 5 et le 16 novembre (« Cannot read properties of undefined (reading 'lie') », 39 ✓) et tombait sous charge, sur du code que
   personne n'avait touché. Quatre causes, chacune REJOUÉE à volonté avant d'être corrigée (les sondes sont nommées dans `REPRISE.md`) :
     · L'HORLOGE DU SERVICE LUE VIDE pendant qu'on l'avançait (l'outil tronquait le fichier puis l'écrivait) : le service retombait sur l'heure RÉELLE, vingt-huit jours après celle du banc, et son balayeur
       finissait la sonnerie (« manquée ») ou l'appel (« perdu »). C'est la mort de la CI, au contrôle près. Corrigé dans l'outil (`outils-msg.js`, `lib-horloge-msg.js` ; gardé par `test-947`) ;
     · LE SERVICE NAISSAIT À L'HEURE RÉELLE, et le banc le reculait après coup : calé une seconde trop tard, il avait déjà balayé « dans le futur ». Il naît maintenant à l'heure du banc (`monter`) ;
     · UN FLUX FERMÉ PAR LE BANC N'EST PAS UN FLUX QUE LE SERVICE SAIT FERMÉ : un signal parti entre les deux est écrit dans le flux mort au lieu d'être retenu. Le banc attend que le SERVICE tienne un flux
       de moins (`/health`), au geste (section 5) ;
     · L'ÉCHÉANCE DU RELAIS se jugeait « à trois secondes près » : elle est ENCADRÉE par l'horloge du banc lue juste avant et juste après la demande (section 1) — exact, quelle que soit la charge.
   ⛔ ET UNE CHUTE DIT CE QUE LE SERVICE A RENDU. Aucune lecture ne tue plus le banc (`champ`) : le contrôle TOMBE, suivi des derniers échanges avec le service (`CARNET`), de l'état de l'appel dans la base, de
   l'horloge du banc et de la vie de chaque service monté ; la PREMIÈRE chute est redite juste avant le total, là où la CI regarde (elle ne montre que les lignes « ✗ » et les huit dernières). */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const C = T.compteur();
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

/* ⛔ UNE LECTURE NE TUE PAS LE BANC : `champ(rep, 'j', 'appel', 'lie')` rend `undefined` dès qu'un maillon manque. Le contrôle TOMBE alors (« attendu / obtenu »), suivi de ce que le service a rendu — au lieu d'un
   « Cannot read properties of undefined » qui arrêtait tout sans rien dire (la CI, 5 et 16 novembre 2026). */
const champ = (o, ...cles) => { for (const k of cles) { if (o === null || o === undefined) return undefined; o = o[k]; } return o; };
const idDe = (rep) => champ(rep, 'j', 'appel', 'id');                                  // l'appel qu'une réponse porte (sinon `undefined` : le geste suivant vise un appel qui n'existe pas, et son contrôle le dit)
const relaisDe = (rep) => champ(rep, 'j', 'serveurs', 1) || {};                         // l'entrée TURN d'une réponse de `/api/ice` : { urls, username, credential }
const echeanceDe = (rep) => Number(String(relaisDe(rep).username || '').split(':')[0]);

/* ⛔ LE CARNET : les derniers échanges avec les services du banc, tels que le service les a RENDUS (le code et le début du corps). Une chute les redit : « Ben·1 POST /api/appels/a_…/repondre → 409
   {"error":"appel_fini"} » se comprend, « undefined.lie » non. Ce sont des données de banc (personnes fictives, service jetable) ; ni cookie ni en-tête n'y entre. */
const CARNET = [], MONTES = [];
const noter = (ou, qui, methode, chemin, rep) => { CARNET.push((ou ? '[' + ou + '] ' : '') + qui + ' ' + methode + ' ' + String(chemin).replace(/([acp]_[0-9a-f]{6})[0-9a-f]{26}/g, '$1…') + ' → ' + rep.code + ' ' + String(rep.txt || '').slice(0, 170)); if (CARNET.length > 40) CARNET.shift(); };
const suivre = (c, ou, qui) => {
  const get = c.get, post = c.post;
  c.qui = qui;
  c.get = async (chemin, e) => { const r = await get(chemin, e); noter(ou, qui, 'GET', chemin, r); return r; };
  c.post = async (chemin, b, e) => { const r = await post(chemin, b, e); noter(ou, qui, 'POST', chemin, r); return r; };
  return c;
};

/* Un service (horloge décalable, calée sur ZERO), sa base ouverte à côté (WAL : deux processus, une base) avec la MÊME horloge, des personnes et leurs clients. `nom` : ce que ce service joue (vide : le principal).
   ⛔ LE SERVICE NAÎT À L'HEURE DU BANC (`decalageInitial`), IL N'Y EST PLUS RECALÉ APRÈS COUP. Avant, il démarrait à l'heure réelle et le banc le reculait de quatre semaines une fois `/health` servi : sur une
   machine chargée, le calage arrivait après le premier passage du balayeur (une seconde après le démarrage), daté « dans le futur » — `ageS` restait alors à zéro et la population de la section 3 bis tombait
   (rejoué : le calage du service de la sonnerie échue retardé de 1,6 s → 86 ✓ 1 ✗). */
async function monter(config, nom) {
  let decal = ZERO - Date.now();
  const svc = await T.lancerService({ horloge: true, decalageInitial: decal, config });
  const maintenant = () => Date.now() + decal;
  const chemin = path.join(svc.data, 'msg.db');
  const S = ouvrir({ chemin, scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: maintenant });
  let k = 0;
  const appareils = {};
  const pers = (prenom, origine) => S.personneCreer({ identifiant: 'beta:' + prenom + (++k) + crypto.randomBytes(2).toString('hex'), prenom, nom: 'Banc', origine: origine || 'beta', verifie: true });
  const cl = (p) => { const c = suivre(T.client(svc.base), nom, p.prenom + '·' + (appareils[p.id] = (appareils[p.id] || 0) + 1)); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 60 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
  const anonyme = () => suivre(T.client(svc.base), nom, 'anonyme');
  const sql = (req, ...args) => { const d = T.lireBase(chemin); try { return d.prepare(req).get(...args); } finally { d.close(); } };
  const avancer = (ms) => { decal += ms; svc.avancer(ms); };
  /* combien de flux LE SERVICE tient ouverts à cet instant (`/health`) : ce que le banc a fermé n'est fermé pour le service que lorsqu'il l'a constaté */
  const fluxOuverts = async () => champ(await T.client(svc.base).get('/health'), 'j', 'flux', 'ouverts');
  const M = { nom: nom || 'principal', svc, S, chemin, pers, cl, anonyme, sql, avancer, maintenant, fluxOuverts, mortEnRoute: null };
  /* ⛔ un service MORT EN ROUTE se dit (à sa fermeture, et dans chaque chute). Un port pris par un autre banc lancé en même temps faisait répondre le service de l'AUTRE (401 partout : vu une fois sur 120 passages
     à douze de front) — l'outil s'en garde maintenant (`lancerService` : l'identité du service) ; ceci reste pour un service qui mourrait d'autre chose. */
  M.fermer = async () => { if (M.mortEnRoute === null) M.mortEnRoute = svc.sorti() !== null ? 'code ' + svc.sorti() + ' — ' + svc.sortie.texte().split('\n').filter(l => /"evt":"(exception|rejet|demarrage_refuse)"/.test(l)).slice(-1).join('').slice(0, 160) : false; try { S.fermer(); } catch (x) { /* déjà fermé */ } await svc.arreter(); };
  MONTES.push(M);
  return M;
}
const dit = (rep) => [rep.code, rep.j && rep.j.error];
const octetsBase = (chemin) => { let b = Buffer.alloc(0); for (const s of ['', '-wal', '-shm']) { try { b = Buffer.concat([b, fs.readFileSync(chemin + s)]); } catch (e) { /* absent */ } } return b; };

(async () => {
  const flux = [];
  const M = await monter({
    appels: { relais: { hote: HOTE, port: 3478, portTls: 5349, secret: SECRET_RELAIS, ttlS: 900 }, parHeure: 6, parPaireHeure: 3, signalMax: 10, signalFenetreMs: MIN, iceParHeure: 3, balayageMs: 1000, perduMs: 600000 },
  });
  const { svc, S, pers, cl, sql, avancer, maintenant } = M;
  let appel1 = null;                                                    // l'appel d'Ana à Ben, que les sections 2 à 6 font vivre — déclaré ICI : le diagnostic le lit, et une `let` lue avant sa ligne lève

  /* ⛔ CE QU'UNE CHUTE DIT : les derniers échanges avec le service (ce qu'il a RENDU), l'état de l'appel dans la base (son motif de fin, daté par rapport à son lancement), où en est l'horloge du banc, et si
     chaque service monté vit encore. Ne lève jamais : un diagnostic qui meurt cacherait la chute qu'il devait expliquer. */
  const ecart = (ms) => (ms === null || ms === undefined ? '—' : (ms >= 0 ? '+' : '−') + Math.abs(Math.round(ms / 100) / 10) + ' s');
  const diagnostic = () => {
    const l = [];
    try { for (const e of CARNET.slice(-5)) l.push('rendu par le service : ' + e); } catch (e) { /* rien */ }
    try {
      const id = appel1 && appel1.id, a = id ? sql('SELECT etat, motif, cree, sonne_jusqua, repondu, fin FROM appel WHERE id = ?', id) : null;
      if (a) l.push('l\'appel d\'Ana à Ben, dans la base : « ' + a.etat + ' »' + (a.motif ? ', motif « ' + a.motif + ' »' : '') + ' — depuis son lancement : sonnerie jusqu\'à ' + ecart(Number(a.sonne_jusqua) - Number(a.cree)) + ', répondu ' + ecart(a.repondu === null ? null : Number(a.repondu) - Number(a.cree)) + ', fini ' + ecart(a.fin === null ? null : Number(a.fin) - Number(a.cree)) + ' ; l\'horloge du banc en est à ' + ecart(maintenant() - Number(a.cree)));
    } catch (e) { l.push('(l\'appel n\'a pas pu être relu dans la base : ' + String(e && e.message).slice(0, 80) + ')'); }
    try {
      const vu = (e) => e.event + (e.event === 'appel' ? ':' + champ(e, 'data', 'etat') : e.event === 'signal' ? ':' + champ(e, 'data', 'type') : '');
      if (flux.length) l.push('les flux du banc, et leurs derniers événements : ' + flux.map(f => f.nom + (f.ferme ? ' (fermé)' : '') + ' ' + f.evenements.length + (f.evenements.length ? ' [… ' + f.evenements.slice(-3).map(vu).join(', ') + ']' : '')).join(' ; '));
    } catch (e) { /* rien */ }
    try {
      const morts = MONTES.filter(m => m.mortEnRoute || (m.mortEnRoute === null && m.svc.sorti() !== null));
      l.push('horloge du banc : ZERO ' + ecart(maintenant() - ZERO) + ' ; services montés : ' + MONTES.length + (morts.length ? ' — ⛔ MORT(S) EN ROUTE : ' + morts.map(m => m.nom + ' (' + (m.mortEnRoute || 'code ' + m.svc.sorti()) + ')').join(', ') : ', tous vivants ou fermés par le banc'));
    } catch (e) { /* rien */ }
    return l;
  };
  /* Les contrôles du banc : ceux du compteur commun, plus ce que la chute doit dire. La première chute est gardée pour être redite à la fin (les suivantes en découlent souvent : un appel fini trop tôt en fait tomber six). */
  const chutes = [];
  const chute = (titre) => { const d = diagnostic(); chutes.push({ titre, d }); for (const x of d) console.log('        ' + x); };
  const v = (t, a, b) => { const avant = C.ko; C.v(t, a, b); if (C.ko > avant) chute(t); };
  const vrai = (t, a) => v(t, !!a, true);
  const fin = () => {
    if (chutes.length) { console.log('\n── PREMIÈRE CHUTE : ' + chutes[0].titre.slice(0, 150)); for (const x of chutes[0].d.slice(-5)) console.log('   ' + x.slice(0, 420)); }
    C.fin();
  };
  const ana = pers('Ana'), ben = pers('Ben'), cleo = pers('Cleo'), dan = pers('Dan'), eve = pers('Eve'), fred = pers('Fred'), zoe = pers('Zoe', 'compte'), inconnue = pers('Nova');
  S.contactLier(ana.id, ben.id); S.contactLier(ana.id, cleo.id); S.contactLier(ben.id, cleo.id); S.contactLier(ana.id, fred.id); S.contactLier(zoe.id, ben.id); S.contactLier(ana.id, eve.id); S.contactLier(ben.id, dan.id);
  const a1 = cl(ana), a2 = cl(ana), b1 = cl(ben), b2 = cl(ben), c1 = cl(cleo), d1 = cl(dan), z1 = cl(zoe), e1 = cl(eve), f1 = cl(fred);
  const ouvrirFlux = async (c) => { const f = await T.flux(c); f.nom = c.qui; flux.push(f); return f; };
  try {
    /* ═══════ 1. LE RELAIS : GET /api/ice ═══════ */
    console.log('GET /api/ice : à qui est DANS un appel seulement ; des identifiants éphémères recalculés ici, le secret nulle part, jamais le serveur d\'un tiers');
    const gil = pers('Gil'), hana = pers('Hana'); S.contactLier(gil.id, hana.id);
    const g1 = cl(gil), h1 = cl(hana);
    {
      /* Gil appelle Hana : une sonnerie en cours, la seule situation où des identifiants de relais se donnent. Chaque appel de la section est raccroché avant la suivante. */
      const sonnerie = (c, vers) => c.post('/api/appels', { uid: vers, type: 'audio' });
      const raccroche = (c, r) => c.post('/api/appels/' + idDe(r) + '/quitter', {});
      const sans = [await g1.get('/api/ice'), await c1.get('/api/ice'), await c1.get('/api/ice'), await c1.get('/api/ice'), await c1.get('/api/ice'), await c1.get('/api/ice')];
      v('⛔ AUCUN APPEL : pas d\'identifiants (404 `introuvable`, le même corps pour tous) — et le refus ne consomme RIEN du plafond (cinq refus de suite pour Cleo avec un plafond de trois par heure : toujours 404, jamais 429)',
        [sans.map(dit), new Set(sans.map(x => JSON.stringify(x.j))).size], [new Array(6).fill([404, 'introuvable']), 1]);
      const l1 = await sonnerie(g1, hana.id);
      vrai('population : Gil appelle Hana, la sonnerie court', l1.code === 201 && champ(l1, 'j', 'appel', 'etat') === 'sonne');
      const tiers = await c1.get('/api/ice');
      v('⛔ un TIERS pendant l\'appel des deux autres : le même 404 (participer à CET appel est la condition, pas qu\'un appel existe quelque part)', dit(tiers), [404, 'introuvable']);
      /* ⛔ L'ÉCHÉANCE SE JUGE ENTRE DEUX LECTURES DE L'HORLOGE DU BANC, PRISES AU GESTE : juste avant et juste après la demande. Le service a calculé son échéance entre les deux (c'est la MÊME horloge : celle
         de la machine, plus le décalage que le banc a posé), donc elle tombe entre « avant + 900 » et « après + 900 » — à la seconde près à vide, et toujours juste sur une machine chargée, où la fenêtre
         s'élargit d'elle-même. Avant : « à trois secondes près », et « 600 à 603 » au second passage — un pari sur la durée de huit requêtes (601 lu le 8 octobre 2026, trois sondes tournant à côté). */
      const seconde = () => Math.floor(maintenant() / 1000);
      const avant1 = seconde(), r = await g1.get('/api/ice'), apres1 = seconde();
      const turn = relaisDe(r), stun = champ(r, 'j', 'serveurs', 0) || {};
      vrai('population : la réponse porte un STUN et un serveur TURN avec identifiants', r.code === 200 && champ(r, 'j', 'relais') === true && champ(r, 'j', 'serveurs', 'length') === 2 && !!turn.username);
      v('   `Cache-Control: no-store` (des identifiants ne se mettent pas en cache) et une durée de vie de quinze minutes (le réglage du banc)', [r.h.get('cache-control'), champ(r, 'j', 'ttl_s')], ['no-store', 900]);
      v('⛔ les adresses sont celles du relais SEUL : stun, et DEUX adresses de relais (turn en UDP, turns en TLS) — jamais le serveur d\'un tiers, et pas trois (le navigateur ouvre une allocation par adresse : mesuré par la sonde)', [stun.urls, tri(turn.urls || [])], [['stun:' + HOTE + ':3478'], tri(['turn:' + HOTE + ':3478?transport=udp', 'turns:' + HOTE + ':5349?transport=tcp'])]);
      const noms = JSON.stringify(r.j || {}).match(/[a-z0-9.-]+\.[a-z]{2,}/g) || [];
      vrai('   aucun nom d\'hôte dans la réponse que celui du relais (population : ' + noms.length + ' noms lus)', noms.every(h => h === HOTE) && noms.length >= 3);
      const exp = echeanceDe(r), uid = String(turn.username || '').split(':')[1];
      v('⛔ le nom d\'utilisateur est « <échéance>:<identifiant de la personne> » : quinze minutes après l\'instant de la demande (l\'échéance est encadrée par l\'horloge du banc lue juste avant et juste après), la personne connectée', [exp >= avant1 + 900 && exp <= apres1 + 900, uid], [true, gil.id]);
      v('⛔ le mot de passe est BASE64(HMAC-SHA1(secret, nom)) RECALCULÉ ICI avec `crypto` — sans passer par le code du service', turn.credential, hmac64(SECRET_RELAIS, String(turn.username)));
      v('   un autre secret donne un autre mot de passe (la preuve ne se satisfait pas de n\'importe quel calcul)', hmac64(SECRET_RELAIS + 'x', String(turn.username)) === turn.credential, false);
      const rBen = await h1.get('/api/ice'), turnBen = relaisDe(rBen);
      v('⛔ L\'APPELÉE en reçoit aussi, dès la sonnerie, et c\'est SON identifiant (il répond en relais)', [rBen.code, String(turnBen.username || '').split(':')[1], turnBen.credential === hmac64(SECRET_RELAIS, String(turnBen.username))], [200, hana.id, true]);
      await raccroche(g1, l1);
      v('⛔ L\'APPEL FINI (Gil a annulé) : plus d\'identifiants, ni pour lui ni pour Hana — le même 404', [dit(await g1.get('/api/ice')), dit(await h1.get('/api/ice'))], [[404, 'introuvable'], [404, 'introuvable']]);
      /* une sonnerie ÉCHUE n'est plus un appel : 404 avant même que le balayeur ne l'ait écrite « manquée » */
      const l1b = await sonnerie(g1, hana.id);
      avancer(10 * MIN);
      v('⛔ UNE SONNERIE ÉCHUE (dix minutes plus tard) : plus d\'identifiants non plus', [l1b.code, dit(await g1.get('/api/ice'))], [201, [404, 'introuvable']]);
      const l2 = await sonnerie(g1, hana.id);
      const avant2 = seconde(), r2 = await g1.get('/api/ice'), apres2 = seconde(), r3 = await h1.get('/api/ice');
      const turn2 = relaisDe(r2), turn3 = relaisDe(r3), exp2 = echeanceDe(r2);
      /* l'échéance suit l'horloge du service : le banc l'a avancée de dix minutes, donc la seconde échéance est à dix minutes AU MOINS de la première — et elle est encadrée comme elle */
      v('⛔ SECOND PASSAGE, dix minutes plus tard, dans un appel neuf : une autre échéance (dix minutes plus loin au moins, et encadrée par l\'horloge du banc avant et après la demande), un autre mot de passe, toujours juste ; et pour Hana, SON identifiant',
        [exp2 - exp >= 600, exp2 >= avant2 + 900 && exp2 <= apres2 + 900, turn2.credential !== turn.credential, turn2.credential === hmac64(SECRET_RELAIS, String(turn2.username)), String(turn3.username || '').split(':')[1], turn3.credential === hmac64(SECRET_RELAIS, String(turn3.username))], [true, true, true, true, hana.id, true]);
      const r4 = await g1.get('/api/ice'), r5 = await g1.get('/api/ice');
      v('⛔ le plafond : trois lectures par heure (réglage du banc) — Gil en a fait trois (la troisième passe), la quatrième est refusée (429 quota_atteint, Retry-After) ; Hana, lui, a le sien', [r4.code, dit(r5), Number(r5.h.get('retry-after')) > 0, r3.code], [200, [429, 'quota_atteint'], true, 200]);
      await raccroche(g1, l2);
      avancer(HEURE + SEC);
      const l3 = await sonnerie(g1, hana.id);
      v('   et une heure plus tard, dans un appel neuf, elle repasse', [l3.code, (await g1.get('/api/ice')).code], [201, 200]);
      await raccroche(g1, l3);
      const cfg = (await M.anonyme().get('/api/config')).j || {}, sante = (await M.anonyme().get('/health')).j || {};
      v('/api/config dit qu\'un relais existe et combien de temps sonne un appel — sans le nom du relais ni son secret', [cfg.appels, JSON.stringify(cfg).includes(HOTE), JSON.stringify(cfg).includes(SECRET_RELAIS)], [{ relais: true, sonnerie_s: 45 }, false, false]);
      v('⛔ /health dit « turn: true » et des nombres — ni le secret, ni le nom du relais, ni un appel, ni le nombre d\'appels perdus (R6)', [champ(sante, 'appels', 'turn'), JSON.stringify(sante).includes(SECRET_RELAIS), JSON.stringify(sante).includes(HOTE), Object.keys(sante.appels || {}).sort()], [true, false, false, ['ageS', 'echecs', 'turn']]);
      v('⛔ `appels.relais.ttlS` : quinze minutes (900) par défaut, un entier de 60 à 3600 — 59, 3601, un décimal et un texte sont refusés au démarrage, en nommant le champ',
        [appelsConfig({ appels: { relais: { hote: HOTE, secret: SECRET_RELAIS } } }, 'beta').relais.ttlS, appelsConfig({ appels: { relais: { hote: HOTE, secret: SECRET_RELAIS, ttlS: 3600 } } }, 'beta').relais.ttlS,
          [59, 3601, 900.5, '900', 86400].map(x => { try { appelsConfig({ appels: { relais: { hote: HOTE, secret: SECRET_RELAIS, ttlS: x } } }, 'beta'); return false; } catch (e) { return /ttlS/.test(e.message); } })], [900, 3600, [true, true, true, true, true]]);
    }
    {
      /* sans relais : une liste vide, et rien d'un tiers — pour qui est dans un appel (les autres : 404, comme partout) ; sans TLS : le TCP simple en secours, jamais trois adresses */
      const N = await monter({ appels: { entrantsParHeure: 100 } }, 'sans relais'), N2 = await monter({ appels: { relais: { hote: HOTE, port: 3478, secret: SECRET_RELAIS } } }, 'sans TLS');
      try {
        const duo = async (X) => { const p = X.pers('Ana'), q = X.pers('Ben'); X.S.contactLier(p.id, q.id); const c = X.cl(p); const rr = await c.post('/api/appels', { uid: q.id, type: 'audio' }); return { c, rr }; };
        const { c, rr } = await duo(N);
        const r = await c.get('/api/ice');
        v('⛔ SANS relais configuré : `relais:false`, une liste VIDE, durée nulle — aucun serveur STUN public n\'est proposé en repli', [rr.code, r.code, r.j, r.h.get('cache-control')], [201, 200, { relais: false, ttl_s: 0, serveurs: [] }, 'no-store']);
        v('   /api/config le dit aussi, et /health : turn:false', [champ(await N.anonyme().get('/api/config'), 'j', 'appels', 'relais'), champ(await N.anonyme().get('/health'), 'j', 'appels', 'turn')], [false, false]);
        const d2 = await duo(N2), rice = await d2.c.get('/api/ice');
        v('⛔ SANS TLS (pas de `portTls`) : le TCP simple prend sa place — deux adresses de relais, jamais trois ; et la durée par défaut est de quinze minutes', [d2.rr.code, rice.code, tri(relaisDe(rice).urls || []), champ(rice, 'j', 'ttl_s')], [201, 200, tri(['turn:' + HOTE + ':3478?transport=udp', 'turn:' + HOTE + ':3478?transport=tcp']), 900]);
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
    {
      const r = await a1.post('/api/appels', { conv: directe, type: 'video' });
      /* ⛔ une réponse sans appel ne tue plus le banc (la CI est morte ici le 5 novembre 2026, 39 ✓, sans dire ce que le service avait rendu) : le contrôle tombe, et la chute redit la réponse */
      appel1 = champ(r, 'j', 'appel') || { autre: {} };
      v('lancer par la conversation directe : 201 et la vue de l\'appelante (sortante, vidéo, Ben en face, appareil lié)', [r.code, appel1.etat, appel1.sens, appel1.type, champ(appel1, 'autre', 'id'), appel1.lie, /^a_[0-9a-f]{32}$/.test(appel1.id)], [201, 'sonne', 'sortant', 'video', ben.id, true, true]);
      const eB = await fB1.attendre(e => e.event === 'appel'), eB2 = await fB2.attendre(e => e.event === 'appel');
      v('⛔ Ben l\'apprend sur SES DEUX appareils, par l\'événement durable `appel` (vue entrante, aucun appareil lié) — Cleo, qui n\'y est pas, ne reçoit RIEN', [champ(eB, 'data', 'etat'), champ(eB, 'data', 'sens'), champ(eB, 'data', 'lie'), champ(eB2, 'data', 'id') === appel1.id], ['sonne', 'entrant', false, true]);
      const m = await a1.post('/api/conversations/' + S.convDirecteObtenir(ana.id, cleo.id).id + '/messages', { cid: 'cid-marqueur-0001', texte: 'marqueur' });
      const marqueC = await fC.attendre(e => e.event === 'message');
      vrai('   (marqueur reçu par Cleo APRÈS : son flux est vivant) et elle n\'a reçu aucun `appel`', !!marqueC && m.code === 201 && fC.evenements.filter(e => e.event === 'appel').length === 0);
      const l = (await b1.get('/api/appels')).j || {}, la = (await a1.get('/api/appels')).j || {};
      v('GET /api/appels : l\'historique est vide (rien de fini), et `actif` reprend l\'appel qui sonne — pour les deux', [l.appels, champ(l, 'actif', 'id') === appel1.id, champ(l, 'actif', 'sens'), champ(la, 'actif', 'lie')], [[], true, 'entrant', true]);
      v('⛔ occupée : Ana, qui est dans un appel, n\'en lance pas un second — 409 `occupe` avec `moi:true`', [dit(await a1.post('/api/appels', { uid: cleo.id, type: 'audio' })), champ(await a1.post('/api/appels', { uid: cleo.id, type: 'audio' }), 'j', 'moi')], [[409, 'occupe'], true]);
      const occ = await c1.post('/api/appels', { uid: ben.id, type: 'audio' });
      v('⛔ Ben est dans un appel : Cleo reçoit 409 `occupe` avec `moi:false`, et Ben le lira « manqué » avec UNE notification', [dit(occ), champ(occ, 'j', 'moi'), Number(sql(`SELECT COUNT(*) AS n FROM notification WHERE uid = ? AND type = 'appel_manque'`, ben.id).n), champ(await b1.get('/api/appels?filtre=manques'), 'j', 'appels', 'length')], [[409, 'occupe'], false, 1, 1]);
      v('   le filtre `filtre=manques` ne garde que les entrants non pris, `filtre=tout` est refusé (400)', [(champ(await b1.get('/api/appels?filtre=manques'), 'j', 'appels') || []).map(x => x.etat), dit(await b1.get('/api/appels?filtre=tout'))], [['occupe'], [400, 'champ_invalide']]);
    }

    /* ═══════ 3. RÉPONDRE, ET LES APPAREILS ═══════ */
    console.log('\nRépondre : l\'appareil qui répond est LIÉ, un second reçoit appel_pris, un étranger reçoit le 404 d\'un appel inexistant');
    {
      const id = appel1.id;
      v('⛔ un étranger (Cleo) : 404 introuvable, identique à un appel qui n\'existe pas, au caractère près', [dit(await c1.post('/api/appels/' + id + '/repondre', { accepte: true })), (await c1.post('/api/appels/' + id + '/repondre', { accepte: true })).txt === (await c1.post('/api/appels/a_' + '0'.repeat(32) + '/repondre', { accepte: true })).txt], [[404, 'introuvable'], true]);
      v('l\'appelante ne répond pas à son propre appel : 403 `interdit` ; `accepte` doit être un booléen : 400', [dit(await a1.post('/api/appels/' + id + '/repondre', { accepte: true })), dit(await b1.post('/api/appels/' + id + '/repondre', { accepte: 'oui' })), dit(await b1.post('/api/appels/' + id + '/repondre', {}))], [[403, 'interdit'], [400, 'champ_invalide'], [400, 'champ_invalide']]);
      avancer(6 * SEC);
      /* ⛔ LA SEULE FENÊTRE QUE LE TEMPS RÉEL PEUT ENCORE FERMER, ET ELLE SE DIT : la sonnerie d'Ana dure 45 s d'horloge du service — les 6 s que le banc vient d'avancer, plus le temps RÉEL passé depuis le
         lancement (une vingtaine de requêtes). Mesuré le 17 novembre 2026 : il en reste 38,9 s à vide, et 38,6 s au plus bas sur 60 passages sous charge (douze de front, quatre processus qui occupent
         les cœurs, charge moyenne 13 sur 4 cœurs). Si une machine les mangeait un jour, c'est CE contrôle qui tomberait, en nommant la cause — pas une réponse `appel_fini` trois lignes plus bas. */
      const sonne = sql('SELECT etat, sonne_jusqua FROM appel WHERE id = ?', id);
      vrai('population : l\'appel SONNE encore quand Ben répond, et sa sonnerie n\'est pas échue (45 s de sonnerie ; le banc en a avancé 6, le reste est la marge laissée au temps réel)', !!sonne && sonne.etat === 'sonne' && Number(sonne.sonne_jusqua) > maintenant());
      const rep = await b1.post('/api/appels/' + id + '/repondre', { accepte: true });
      v('Ben répond depuis son premier appareil : 200, « en cours », l\'appareil est lié', [rep.code, champ(rep, 'j', 'etat'), champ(rep, 'j', 'deja'), champ(rep, 'j', 'appel', 'lie')], [200, 'en_cours', false, true]);
      const eA = await fA.attendre(e => e.event === 'appel' && champ(e, 'data', 'etat') === 'en_cours');
      vrai('   Ana l\'apprend par l\'événement, sur son appareil (et sur l\'autre, qui n\'est pas lié)', !!eA && !!(await fA2.attendre(e => e.event === 'appel' && champ(e, 'data', 'etat') === 'en_cours')));
      v('le même appareil qui répond deux fois : la même vue (`deja:true`)', [champ(await b1.post('/api/appels/' + id + '/repondre', { accepte: true }), 'j', 'deja')], [true]);
      v('⛔ son SECOND appareil ne vole pas l\'appel : 409 `appel_pris` (accepter comme refuser)', [dit(await b2.post('/api/appels/' + id + '/repondre', { accepte: true })), dit(await b2.post('/api/appels/' + id + '/repondre', { accepte: false }))], [[409, 'appel_pris'], [409, 'appel_pris']]);
      v('⛔ un autre appareil d\'Ana ne raccroche pas son appel : 403 `appareil_non_lie` (et rien n\'est fini)', [dit(await a2.post('/api/appels/' + id + '/quitter', {})), champ(await a1.get('/api/appels'), 'j', 'actif', 'etat')], [[403, 'appareil_non_lie'], 'en_cours']);
    }

    /* ═══════ 3 bis. UNE SONNERIE ÉCHUE NE SE PREND PLUS, MÊME SI LE BALAYEUR N'EST PAS ENCORE PASSÉ ═══════ */
    console.log('\nUne sonnerie ÉCHUE ne se prend plus, même quand le balayeur n\'est pas encore passé');
    {
      /* un service dont le balayeur ne repasse que dans une minute RÉELLE : entre l'avance de l'horloge et la réponse, personne ne « finit » l'appel à la place de la route (avec le balayeur de ce banc, une seconde,
         la mutation « la route ne juge plus l'échéance » ne tombait que si la réponse arrivait avant son passage — un survivant de fait) */
      const L = await monter({ appels: { balayageMs: 60000, perduMs: 600000, parHeure: 100, parPaireHeure: 100, entrantsParHeure: 600, iceParHeure: 100 } }, 'sonnerie échue');
      try {
        const lia = L.pers('Lia'), leo = L.pers('Leo'); L.S.contactLier(lia.id, leo.id);
        const lc = L.cl(lia), qc = L.cl(leo), anon = T.client(L.svc.base);
        /* le PREMIER passage (une seconde après le démarrage) a eu lieu : le suivant est dans une minute RÉELLE — la marge de ce bloc, qui tient en quatre requêtes */
        const passe = await T.attendre(async () => (typeof champ(await anon.get('/health'), 'j', 'appels', 'ageS') === 'number' ? true : null), 8000, 40);
        const r = await lc.post('/api/appels', { uid: leo.id, type: 'audio' });
        L.avancer(46 * SEC);                                               // la sonnerie (45 s) est échue
        const age = champ(await anon.get('/health'), 'j', 'appels', 'ageS');
        const rep = await qc.post('/api/appels/' + idDe(r) + '/repondre', { accepte: true });
        const liste = (await qc.get('/api/appels')).j || {};
        v('⛔ répondre à une sonnerie ÉCHUE (+46 s ; population : le balayeur est passé UNE fois et n\'est PAS repassé, son dernier tour date de 46 s ou plus) : 409 `appel_fini` — l\'appel n\'est pas pris, il est « manqué » pour Leo, rien n\'est actif',
          [passe, age >= 46, dit(rep), champ(liste, 'appels', 0, 'etat'), champ(liste, 'appels', 0, 'manque'), liste.actif], [true, true, [409, 'appel_fini'], 'manque', true, null]);
      } finally { await L.fermer(); }
    }

    /* ═══════ 4. LE SIGNAL ═══════ */
    console.log('\nLe signal : relayé à l\'appareil LIÉ de l\'autre personne, et à personne d\'autre');
    {
      const id = appel1.id, sig = (c, a, type, donnees) => c.post('/api/appels/' + id + '/signal', donnees === undefined ? { a, type } : { a, type, donnees });
      const ro = await sig(a1, ben.id, 'offre', { sdp: CANARI_SDP });
      v('Ana envoie son offre : 200', dit(ro), [200, undefined]);
      const recu = await fB1.attendre(e => e.event === 'signal' && champ(e, 'data', 'type') === 'offre');
      v('⛔ l\'appareil lié de Ben la reçoit, enveloppe intacte : l\'appel, l\'expéditrice, le genre, les données telles quelles', [champ(recu, 'data', 'appel'), champ(recu, 'data', 'de'), champ(recu, 'data', 'type'), champ(recu, 'data', 'donnees', 'sdp') === CANARI_SDP], [id, ana.id, 'offre', true]);
      const rr = await sig(b1, ana.id, 'reponse', { sdp: 'v=0\r\no=CANARI-REP-WQXZ\r\n' });
      const recuA = await fA.attendre(e => e.event === 'signal' && champ(e, 'data', 'type') === 'reponse');
      v('Ben répond : l\'appareil lié d\'Ana la reçoit', [dit(rr), champ(recuA, 'data', 'de')], [[200, undefined], ben.id]);
      await sig(a1, ben.id, 'candidats', { c: [CANARI_CAND] }); await sig(b1, ana.id, 'etat', { camera: false }); await sig(a1, ben.id, 'pouls');
      /* ⛔ les marqueurs : un message de chacun à l'autre arrive à TOUS les appareils de l'autre — après, un signal parti à tort serait déjà là. Et leur ARRIVÉE entre dans le contrôle : un marqueur jamais
         reçu (un flux mort, une attente qui a atteint son plafond) laissait « aucun signal » passer sur un flux qui n'écoutait plus. */
      await a1.post('/api/conversations/' + directe + '/messages', { cid: 'cid-marqueur-0002', texte: 'après les signaux (Ana)' });
      await b1.post('/api/conversations/' + directe + '/messages', { cid: 'cid-marqueur-0003', texte: 'après les signaux (Ben)' });
      const texte = (t) => (e) => e.event === 'message' && champ(e, 'data', 'texte') === t;
      const marques = [!!(await fB2.attendre(texte('après les signaux (Ana)'))), !!(await fA2.attendre(texte('après les signaux (Ben)'))), !!(await fB1.attendre(texte('après les signaux (Ana)'))), !!(await fA.attendre(texte('après les signaux (Ben)')))];
      const sB2 = fB2.evenements.filter(e => e.event === 'signal').length, sA2 = fA2.evenements.filter(e => e.event === 'signal').length;
      v('⛔ le SECOND appareil de Ben et l\'AUTRE appareil d\'Ana ne reçoivent AUCUN signal (population : leurs flux sont vivants, chacun des quatre a reçu le marqueur qui suit)', [sB2, sA2, marques], [0, 0, [true, true, true, true]]);
      v('   et l\'appareil lié de Ben a reçu offre, candidats (de Ana) — son propre état ne lui revient pas ; celui d\'Ana : réponse, état (de Ben)', [fB1.evenements.filter(e => e.event === 'signal').map(e => champ(e, 'data', 'type')), fA.evenements.filter(e => e.event === 'signal').map(e => champ(e, 'data', 'type'))], [['offre', 'candidats'], ['reponse', 'etat']]);
      vrai('   un `pouls` prouve que l\'appareil est là, mais ne voyage PAS (personne n\'en reçoit)', ![...fA.evenements, ...fB1.evenements].some(e => e.event === 'signal' && champ(e, 'data', 'type') === 'pouls'));
      /* la validation de l'enveloppe */
      v('⛔ le destinataire est l\'AUTRE participant de CET appel, rien d\'autre : un tiers, soi-même, rien, un type inconnu, des données absentes ou qui ne sont pas un objet → 400',
        [await sig(a1, cleo.id, 'offre', {}), await sig(a1, ana.id, 'offre', {}), await sig(a1, undefined, 'offre', {}), await sig(a1, ben.id, 'commande', {}), await sig(a1, ben.id, 'offre'), await sig(a1, ben.id, 'offre', 'texte'), await sig(a1, ben.id, 'offre', [1]), await sig(a1, ben.id, 'offre', null)].map(x => champ(x, 'j', 'error')),
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
      const codes = []; for (let i = 0; i < 12; i++) codes.push((await sig(a1, ben.id, 'candidats', { i })).code);
      v('⛔ le DÉBIT est plafonné par appel et par personne : dix signaux par minute (réglage du banc), les suivants 429 `quota_atteint` ; Ben, lui, a son propre plafond', [codes.filter(c => c === 200).length, codes.filter(c => c === 429).length, (await sig(b1, ana.id, 'etat', { camera: true })).code], [10, 2, 200]);
      avancer(61 * SEC);
      v('   une minute plus tard, le plafond est levé', (await sig(a1, ben.id, 'candidats', { i: 'après' })).code, 200);
      v('⛔ un étranger ne signale rien dans cet appel (404 identique à un appel inexistant), et Ana depuis son AUTRE appareil non plus (403 `appareil_non_lie`)', [dit(await sig(c1, ben.id, 'offre', {})), dit(await sig(a2, ben.id, 'offre', {}))], [[404, 'introuvable'], [403, 'appareil_non_lie']]);
    }

    /* ═══════ 5. RETENU PUIS LIVRÉ ═══════ */
    console.log('\nUn signal envoyé pendant que le flux de Ben est coupé est RETENU, puis livré à son ouverture — et périmé au bout de 30 s');
    {
      const id = appel1.id, sig = (c, a, type, donnees) => c.post('/api/appels/' + id + '/signal', { a, type, donnees });
      /* ⛔ FERMÉ POUR LE BANC N'EST PAS FERMÉ POUR LE SERVICE. `attendreFerme` dit que le lecteur DU BANC est fermé ; le service, lui, ne retient un signal que s'il SAIT qu'aucun flux de cette session n'est
         ouvert — sinon il l'écrit dans le flux mort, et le signal est perdu. Rejoué (`scratchpad/sonde-flux-ferme.js`) : le service gelé le temps de la fermeture, le signal parti sur une connexion déjà
         ouverte — perdu 10 fois sur 10 ; le même geste après avoir attendu que `/health` compte un flux de moins — retenu 10 fois sur 10. On attend donc CE constat, au geste (jamais une durée), et il entre
         dans le contrôle : sans lui, « le périmé n'est pas livré » passerait aussi sur un signal qui n'a jamais été retenu. */
      const fermerPourLeService = async (f) => {
        const avant = await M.fluxOuverts();
        f.fermer(); await f.attendreFerme();
        return !!(await T.attendre(async () => ((await M.fluxOuverts()) === avant - 1 ? true : null), 8000, 10));
      };
      const constat1 = await fermerPourLeService(fB1);
      const retenus = [await sig(a1, ben.id, 'candidats', { c: ['retenu-1'] }), await sig(a1, ben.id, 'candidats', { c: ['retenu-2'] })];
      const f1 = await ouvrirFlux(b1);
      await T.attendre(() => f1.evenements.filter(e => e.event === 'signal').length >= 2, 8000, 20);
      v('⛔ les deux signaux retenus arrivent À L\'OUVERTURE du flux, dans l\'ordre (population : le service avait constaté la fermeture du flux de Ben avant qu\'ils partent, et les a acceptés)', [constat1, retenus.map(x => x.code), f1.evenements.filter(e => e.event === 'signal').map(e => champ(e, 'data', 'donnees', 'c', 0))], [true, [200, 200], ['retenu-1', 'retenu-2']]);
      const constat2 = await fermerPourLeService(f1);
      const perime = await sig(a1, ben.id, 'candidats', { c: ['périmé'] });
      avancer(31 * SEC);
      /* le témoin : un signal FRAIS, retenu lui aussi, envoyé après l'avance — il arrive à la réouverture. Celui de 31 s qui le précède dans la même file n'arrive pas : c'est son ÂGE qui l'écarte, pas une file vide */
      const frais = await sig(a1, ben.id, 'candidats', { c: ['frais'] });
      const f2 = await ouvrirFlux(b1);
      await b1.post('/api/conversations/' + directe + '/messages', { cid: 'cid-marqueur-0004', texte: 'marqueur après réouverture' });
      const marque2 = !!(await f2.attendre(e => e.event === 'message' && champ(e, 'data', 'texte') === 'marqueur après réouverture'));
      v('⛔ un signal de plus de 30 s n\'est PAS livré (un candidat périmé ne sert à rien, et rien ne s\'accumule) — population : il avait bien été retenu (le service avait constaté la fermeture, il l\'a accepté), le signal FRAIS retenu après lui arrive, et le marqueur aussi',
        [constat2, perime.code, frais.code, f2.evenements.filter(e => e.event === 'signal').map(e => champ(e, 'data', 'donnees', 'c', 0)), marque2], [true, 200, 200, ['frais'], true]);
      f2.fermer();
      await ouvrirFlux(b1);
    }

    /* ═══════ 6. RACCROCHER, PUIS RIEN NE SIGNALE PLUS ═══════ */
    console.log('\nRaccrocher : l\'appareil lié, une fois ; ensuite plus rien ne se signale ni ne se répond');
    {
      const id = appel1.id;
      avancer(20 * SEC);
      const q = await a1.post('/api/appels/' + id + '/quitter', {});
      v('Ana raccroche depuis l\'appareil lié : 200, « fini » (durée = le temps passé depuis la réponse)', [q.code, champ(q, 'j', 'ok'), champ(q, 'j', 'deja'), champ(q, 'j', 'appel', 'etat'), champ(q, 'j', 'appel', 'duree_s') > 0], [200, true, false, 'fini', true]);
      /* ⛔ T1 (relecture) : la FIN d'un appel est connue de CHAQUE session des DEUX personnes — l'événement durable `appel` est écrit pour chaque participant et atteint tous leurs flux, y compris ceux qui n'ont
         jamais tenu l'appel (le second appareil d'Ana, le second de Ben) : c'est ce qui permet à ces pages de relire leur historique. */
      /* ⛔ l'attente d'un événement rend l'événement ou RIEN (elle ne lève pas) : un flux qui ne l'a jamais reçu doit faire tomber le contrôle — « .then(() => true) » rendait vrai dans les deux cas */
      const finie = (e) => e.event === 'appel' && champ(e, 'data', 'id') === id && champ(e, 'data', 'etat') === 'fini';
      const fB1neuf = flux[flux.length - 1];
      const bout = await Promise.all([fA, fA2, fB1neuf, fB2].map(f => f.attendre(finie).then(e => !!e, () => false)));
      v('⛔ la fin de l\'appel arrive à TOUTES les sessions des deux personnes : l\'appareil lié d\'Ana, son AUTRE appareil, l\'appareil lié de Ben, son SECOND (population : quatre flux ouverts, chacun a vu le marqueur plus haut)', [bout, [fA, fA2, fB1neuf, fB2].map(f => f.evenements.filter(finie).length > 0)], [[true, true, true, true], [true, true, true, true]]);
      v('⛔ rejouer le geste (la page raccroche après que l\'autre l\'a fait) : 200 `deja:true`, rien d\'écrit', [champ(await a1.post('/api/appels/' + id + '/quitter', {}), 'j', 'deja'), champ(await b1.post('/api/appels/' + id + '/quitter', {}), 'j', 'deja')], [true, true]);
      v('⛔ un appel fini ne se signale plus (409 `appel_fini`) ni ne se répond (409 `appel_fini`)', [dit(await a1.post('/api/appels/' + id + '/signal', { a: ben.id, type: 'etat', donnees: {} })), dit(await b1.post('/api/appels/' + id + '/repondre', { accepte: true }))], [[409, 'appel_fini'], [409, 'appel_fini']]);
      const hb = (await b1.get('/api/appels')).j || {}, ha = (await a1.get('/api/appels')).j || {};
      v('l\'historique des deux porte l\'appel (fini, sortant pour Ana, entrant pour Ben, pas « manqué »), plus rien n\'est actif', [(ha.appels || []).map(x => [x.etat, x.sens, x.manque]), (hb.appels || []).filter(x => x.id === id).map(x => [x.etat, x.sens, x.manque]), ha.actif, hb.actif], [[['fini', 'sortant', false]], [['fini', 'entrant', false]], null, null]);
      v('GET /api/appels ne rend de l\'autre personne que son nom court (identifiant, prénom, nom, avatar) — rien d\'une session ni d\'une adresse', Object.keys(champ(ha, 'appels', 0, 'autre') || {}).sort(), ['avatar', 'id', 'nom', 'prenom']);
    }

    /* ═══════ 7. LES PLAFONDS DE LANCEMENT ═══════ */
    console.log('\nLes plafonds de lancement : par paire, par personne, un compte neuf à un tiers');
    {
      const lancerFinir = async (c, vers) => { const r = await c.post('/api/appels', { uid: vers, type: 'audio' }); if (r.code === 201) await c.post('/api/appels/' + idDe(r) + '/quitter', {}); return r; };
      avancer(2 * HEURE);                                      // la fenêtre d'une heure est vide
      const b3 = []; for (let i = 0; i < 4; i++) b3.push((await lancerFinir(a1, ben.id)).code);
      v('⛔ PAR PAIRE : trois appels par heure vers la même personne (réglage du banc), le quatrième est refusé 429 `quota_atteint` avec Retry-After', [b3, (await a1.post('/api/appels', { uid: ben.id, type: 'audio' })).h.get('retry-after') > 0], [[201, 201, 201, 429], true]);
      const autres = []; for (let i = 0; i < 4; i++) autres.push((await lancerFinir(a1, cleo.id)).code);
      v('⛔ PAR PERSONNE : six tentatives par heure en tout (réglage du banc), et UNE TENTATIVE REFUSÉE COMPTE (le plafond de la paire est jugé après celui de la personne) — Ana en a déjà fait cinq vers Ben (trois passées, deux refusées) : le sixième lancement, vers Cleo, passe ; les suivants, vers n\'importe qui, sont refusés (429 quota_atteint)', [autres, champ(await a1.post('/api/appels', { uid: cleo.id, type: 'audio' }), 'j', 'error')], [[201, 429, 429, 429], 'quota_atteint']);
      /* un compte neuf (moins de 24 h, hors bêta) a un tiers des limites : 2 au lieu de 6 */
      const z = []; for (let i = 0; i < 3; i++) z.push((await lancerFinir(z1, ben.id)).code);
      v('⛔ un compte NEUF (moins de 24 h, hors bêta) a un tiers du plafond : 2 appels par heure au lieu de 6', z, [201, 201, 429]);
      avancer(HEURE + SEC);
      v('   la fenêtre passée, les limites reviennent', [(await lancerFinir(a1, ben.id)).code, (await lancerFinir(a1, cleo.id)).code], [201, 201]);
    }

    /* ═══════ 7 bis. LE PLAFOND PAR PERSONNE APPELÉE (relecture, I4) ═══════ */
    console.log('\n⛔ Le plafond par personne APPELÉE : plusieurs comptes qui font sonner la même personne ne sont arrêtés par aucun plafond d\'appelant');
    {
      const N = await monter({ appels: { parHeure: 50, parPaireHeure: 20, entrantsParHeure: 3 } }, 'plafond par personne appelée');
      try {
        const cible = N.pers('Zed'), etranger = N.pers('Etranger'), autre = N.pers('Autre');
        const appelants = ['Alba', 'Bruno', 'Chloe', 'Dario', 'Elsa'].map(n => N.pers(n));
        for (const p of appelants) N.S.contactLier(p.id, cible.id);
        N.S.contactLier(appelants[0].id, autre.id);
        const cs = appelants.map(p => N.cl(p)), cz = N.cl(cible), ce = N.cl(etranger);
        const lancerFinir = async (c, vers) => { const r = await c.post('/api/appels', { uid: vers, type: 'audio' }); if (r.code === 201) await c.post('/api/appels/' + idDe(r) + '/quitter', {}); return r; };
        const codes = []; for (let i = 0; i < 3; i++) codes.push((await lancerFinir(cs[i], cible.id)).code);
        const r4 = await cs[3].post('/api/appels', { uid: cible.id, type: 'audio' });
        v('⛔ trois appelants DIFFÉRENTS font sonner Zed (le plafond du banc : trois par heure) ; le QUATRIÈME est refusé 429 `appele_sature`, avec l\'attente (Retry-After et `retry`) pour que l\'appelant la lise', [codes, dit(r4), Number(r4.h.get('retry-after')) > 0 && Number(r4.h.get('retry-after')) <= 3600, champ(r4, 'j', 'retry') > 0 && champ(r4, 'j', 'retry') <= 3600], [[201, 201, 201], [429, 'appele_sature'], true, true]);
        const hz = (await cz.get('/api/appels')).j || {};
        v('⛔ le refus n\'écrit RIEN : Zed lit trois appels dans son historique (population : trois, pas quatre), et aucun n\'est actif', [champ(hz, 'appels', 'length'), hz.actif], [3, null]);
        v('   une AUTRE personne appelée n\'est pas touchée (le plafond est par personne appelée) ; et qui ne peut pas joindre Zed reçoit le 404 d\'une personne introuvable — jamais « saturé » (un refus de plafond ne dit rien à qui n\'a pas le droit d\'appeler)', [(await lancerFinir(cs[0], autre.id)).code, dit(await ce.post('/api/appels', { uid: cible.id, type: 'audio' }))], [201, [404, 'introuvable']]);
        /* les appels « occupé » comptent aussi : ils font une notification d'appel manqué chez la personne */
        N.avancer(HEURE + SEC);
        const premier = await cs[0].post('/api/appels', { uid: cible.id, type: 'audio' });
        const prise = await cz.post('/api/appels/' + idDe(premier) + '/repondre', { accepte: true });
        const occupes = [(await cs[1].post('/api/appels', { uid: cible.id, type: 'audio' })), (await cs[2].post('/api/appels', { uid: cible.id, type: 'audio' }))];
        const quatrieme = await cs[3].post('/api/appels', { uid: cible.id, type: 'audio' });
        v('⛔ un appel pris, puis deux « occupé » : ILS COMPTENT (trois reçus) — le quatrième appelant est refusé `appele_sature` et non `occupe`', [premier.code, prise.code, occupes.map(dit), dit(quatrieme)], [201, 200, [[409, 'occupe'], [409, 'occupe']], [429, 'appele_sature']]);
        N.avancer(HEURE + SEC);
        await cs[0].post('/api/appels/' + idDe(premier) + '/quitter', {});
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
    /* ⛔ une mort dit ce qui manquait : sa pile, puis ce que le service venait de rendre et l'état de l'appel (le même diagnostic qu'un contrôle qui tombe), puis la fin du journal du service */
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    chute('le banc est mort : ' + String((e && e.message) || e).split('\n')[0]);
    console.log(svc.sortie.texte().slice(-1200));
    process.exitCode = 1;
  }
  for (const f of flux) { try { f.fermer(); } catch (e) { /* fermé */ } }
  await M.fermer();
  /* ⛔ les services du banc ont VÉCU jusqu'à ce qu'il les ferme. Un service mort en route ne se voit pas tout seul : si son port a été pris par un autre banc lancé au même moment sur la machine, c'est le service de
     l'AUTRE qui répond à sa place (des 401 `session_requise` partout, sur une base qui n'est pas la sienne) — vu une fois sur 120 passages à douze de front, jamais en CI (elle joue une suite à la fois par machine). */
  vrai('population : les cinq services montés par le banc ont vécu jusqu\'à ce qu\'il les ferme (aucun n\'est mort en route, aucun n\'a laissé un autre répondre à sa place)', MONTES.every(m => m.mortEnRoute === false) && (!!process.exitCode || MONTES.length === 5));
  fin();
})();
