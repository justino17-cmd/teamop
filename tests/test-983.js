/* ⛔ CE QUE CE FICHIER GARDE — LES APPELS À DEUX VIVENT AVEC LE TEMPS : LA SONNERIE ÉCHUE, L'APPAREIL PERDU, LE REDÉMARRAGE, LE BLOCAGE, L'EFFACEMENT, LES PUSHS (famille 3 + 5, étape 7).

   Le VRAI service, son balayeur qui tourne pour de bon, et une horloge qu'on AVANCE au geste (`svc.avancer`, lib-horloge-msg : les dates avancent, les minuteries non) — jamais un sommeil. Les pushs
   sont DÉCHIFFRÉS (RFC 8291) sur un faux service push : c'est la seule preuve de ce qui part vraiment, et on les reconnaît à leur ÉTIQUETTE (`appel:<identifiant>`), pas à leur rang. Chaque « une seule
   fois » se prouve par un passage du balayeur QUI A EU LIEU APRÈS (l'âge du dernier tour dans /health repart à zéro) ; chaque « ne part pas » par un push qui part APRÈS, par la même route.

     · la sonnerie : le push d'appel part avec une charge MINIMALE (sans nom), `Urgency: high`, 30 s de vie au plus ET ce qui reste de la sonnerie ; il part AVANT la notification d'un message
       (la page d'un onglet caché n'acquitte jamais) ; il ne part PAS si l'appel est fini quand il devrait partir, ni si la page sous les yeux l'a acquitté ;
     · +45 s sans réponse : UN appel manqué, UNE notification durable, UN push (sourdine : la notification, pas le push), jamais deux — ni au passage suivant, ni après un redémarrage ;
     · un redémarrage : une sonnerie échue pendant l'arrêt devient un appel manqué au premier passage (une fois) ; un appel qui COURT n'est pas coupé ;
     · l'appareil PERDU : sans signe de vie pendant `perduMs` l'appel est fini « perdu » et l'autre l'apprend ; les `pouls` le gardent en vie ; un appelant qui disparaît pendant la sonnerie fait manquer l'appel ;
     · un blocage coupe l'appel, sans notification pour celui qui a bloqué ; la demande de suppression d'un compte termine l'appel à l'instant, et l'effacement qui suit anonymise la notification.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « zéro » ci-dessous est précédé de ce qu'il aurait pu compter. */
'use strict';
const path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const P = require('./outils-push');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (240 s)'); process.exit(1); }, 240000).unref();

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
const SEC = 1000, MIN = 60000, HEURE = 3600000, JOUR = 86400000;
const ZERO = Date.UTC(2026, 9, 19, 8, 0, 0);
const PUSH_CFG = { ackMs: 2500, echecsMax: 2, etalementMs: 1500, timeoutMs: 3000, contact: 'mailto:exploitation@exemple.invalid' };
function paireVapid() {
  for (;;) {
    const e = crypto.createECDH('prime256v1'); e.generateKeys();
    const priv = e.getPrivateKey();
    if (priv.length === 32) return { pub: e.getPublicKey().toString('base64url'), priv: priv.toString('base64url') };
  }
}
const dit = (rep) => [rep.code, rep.j && rep.j.error];

/* Un service (horloge décalable calée sur ZERO), sa base ouverte à côté (WAL) avec la MÊME horloge ; `redemarrer` relance le service sur le MÊME dossier, avec l'horloge là où elle était */
async function monter(config, env) {
  const M = { config, env: env || {}, decal: 0 };
  M.maintenant = () => Date.now() + M.decal;
  const lancer = async (reprise) => {
    const svc = await T.lancerService(Object.assign({ horloge: true, config: M.config, env: M.env }, reprise ? { dossier: M.svc.racine, port: M.svc.port, cle: M.svc.cle, decalageInitial: M.decal } : {}));
    if (!reprise) { M.decal = ZERO - Date.now(); svc.avancer(M.decal); }
    M.svc = svc;
    M.chemin = path.join(svc.data, 'msg.db');
    M.S = ouvrir({ chemin: M.chemin, scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: M.maintenant });
  };
  M.avancer = (ms) => { M.decal += ms; M.svc.avancer(ms); };
  M.sql = (req, ...args) => { const d = T.lireBase(M.chemin); try { return d.prepare(req).get(...args); } finally { d.close(); } };
  M.redemarrer = async (avancerPendantArret) => {
    try { M.S.fermer(); } catch (x) { /* déjà fermé */ }
    await M.svc.arreter(false);
    if (avancerPendantArret) M.decal += avancerPendantArret;
    await lancer(true);
  };
  M.pers = (nom) => M.S.personneCreer({ identifiant: 'beta:' + nom + crypto.randomBytes(3).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
  M.cl = (p) => { const c = T.client(M.svc.base); const j = jeton(); M.S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 60 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
  /* un tour du balayeur QUI A EU LIEU APRÈS maintenant : l'âge du dernier tour (dans /health) repart à zéro */
  M.passage = async () => {
    const c = T.client(M.svc.base);
    return T.attendre(async () => { const h = (await c.get('/health')).j; return h && h.appels && typeof h.appels.ageS === 'number' && h.appels.ageS <= 1 ? h : null; }, 8000, 40);
  };
  M.fermer = async () => { try { M.S.fermer(); } catch (x) { /* déjà fermé */ } await M.svc.arreter(); };
  await lancer(false);
  return M;
}

(async () => {
  const fps = await P.fauxServicePush();
  const PAIRE = paireVapid();
  const CONFIG = { appels: { balayageMs: 300, perduMs: 45000, parHeure: 900, parPaireHeure: 90, entrantsParHeure: 600, iceParHeure: 900, signalMax: 2000 }, balayageMs: 400, push: PUSH_CFG, vapidPublicKey: PAIRE.pub, vapidPrivateKey: PAIRE.priv };
  const M = await monter(CONFIG, { OPMSG_TEST_PUSH: fps.hote });
  const { pers, cl, sql } = M;
  const flux = [];
  const ouvrirFlux = async (c) => { const f = await T.flux(c); flux.push(f); return f; };
  const dev = (nom) => { const x = P.appareil(fps.endpoint(nom)); x.nom = nom; x.chemin = '/push/' + nom; return x; };
  /* tous les pushs reçus par un appareil, déchiffrés ; on les cherche par ce qu'ils DISENT, jamais par leur rang */
  const tous = (x) => fps.envois.filter(y => y.chemin === x.chemin).map(y => ({ charge: JSON.parse(P.dechiffrer(x, y.corps)), entetes: y.entetes, t: y.t }));
  const trouver = (x, pred, plafond = 8000) => T.attendre(() => tous(x).find(pred) || null, plafond, 15);
  const compterPush = (x, pred) => tous(x).filter(pred).length;
  const deAppel = (id, corps) => (p) => p.charge.tag === 'appel:' + id && (corps === undefined || p.charge.corps === corps);
  const nManques = (uid) => Number(sql(`SELECT COUNT(*) AS n FROM notification WHERE uid = ? AND type = 'appel_manque'`, uid).n);
  const textesManques = (S2, uid) => S2.notifListe(uid, 20).filter(x => x.type === 'appel_manque').map(x => x.texte);
  const ana = pers('Ana'), ben = pers('Ben'), cleo = pers('Cleo'), dan = pers('Dan');
  for (const [x, y] of [[ana, ben], [ana, cleo], [cleo, dan], [ben, dan], [cleo, ben]]) M.S.contactLier(x.id, y.id);
  const a = cl(ana), b = cl(ben), c = cl(cleo), d = cl(dan);
  const lancerAppel = (cli, vers, type) => cli.post('/api/appels', { uid: vers, type: type || 'audio' });
  const perdusJournal = () => (M.svc.sortie.texte().match(/"evt":"appel_perdu"/g) || []).length;       // les fins « perdu » vues par le JOURNAL du service (/health ne les compte plus)
  const raccrocher = (cli, id) => cli.post('/api/appels/' + id + '/quitter', {});
  const marqueur = async (cli, vers, mot) => {                       // un message qui, arrivé APRÈS, prouve que rien d'autre n'est parti avant
    const conv = M.S.convDirecteObtenir(cli.moi.id, vers).id;
    const r = await cli.post('/api/conversations/' + conv + '/messages', { cid: 'cid-marqueur-' + crypto.randomBytes(6).toString('hex'), texte: mot });
    return r;
  };
  const A1 = dev('ana-1'), B1 = dev('ben-1'), D1 = dev('dan-1');
  try {
    for (const [cli, ap] of [[a, A1], [b, B1], [d, D1]]) await cli.post('/api/push/abonner', { sub: ap.sub });

    /* ═══════ 1. LE PUSH D'APPEL ═══════ */
    console.log('Le push d\'appel : minimal, urgent, 30 s de vie au plus — et ce qui reste de la sonnerie');
    {
      const r = await lancerAppel(a, ben.id, 'audio');
      const id = r.j.appel.id;
      const p = await trouver(B1, deAppel(id, 'Appel entrant'));
      v('⛔ la charge est MINIMALE : « Appel entrant », rien de l\'appelante ni du type — Ben ne l\'a pas demandé ; la page s\'ouvre sur les appels', p && p.charge, { type: 'appel', titre: 'OP MESSAGES', corps: 'Appel entrant', tag: 'appel:' + id, url: '/#appels', renotify: true });
      v('⛔ `Urgency: high` (la sonnerie doit réveiller l\'appareil) et 30 s de vie au plus — passé ce délai, un appel qui sonne n\'est plus un appel', [p.entetes.urgency, p.entetes.ttl], ['high', '30']);
      await raccrocher(a, id);
      const pm = await trouver(B1, deAppel(id, 'Appel manqué'));
      v('Ana annule : Ben reçoit « Appel manqué » (même étiquette : il REMPLACE la sonnerie dans le tiroir), charge minimale, urgence ordinaire', [pm && pm.charge.corps, pm.charge.renotify, pm.entetes.urgency], ['Appel manqué', true, 'normal']);
      v('⛔ l\'appelante ne reçoit aucun push de son propre appel (population : Ben a reçu les deux siens par la même route)', [compterPush(A1, p2 => /^appel:/.test(p2.charge.tag)), compterPush(B1, deAppel(id))], [0, 2]);
      /* l'aperçu activé : le nom et le type */
      await b.post('/api/moi/maj', { prefs: { apercu_notif: true } });
      const r2 = await lancerAppel(a, ben.id, 'video');
      const id2 = r2.j.appel.id;
      const p2 = await trouver(B1, deAppel(id2, 'Appel vidéo'));
      v('avec l\'APERÇU activé par Ben : « Appel de Ana Banc » et le type', [p2 && p2.charge.titre, p2 && p2.charge.corps], ['Appel de Ana Banc', 'Appel vidéo']);
      await raccrocher(a, id2);
      const p3 = await trouver(B1, deAppel(id2, 'Ana Banc · vidéo'));
      v('   et l\'appel manqué porte le nom et « vidéo »', [p3 && p3.charge.titre, p3 && p3.charge.corps], ['Appel manqué', 'Ana Banc · vidéo']);
      await b.post('/api/moi/maj', { prefs: { apercu_notif: false } });
    }

    console.log('\nLa sonnerie part AVANT la notification d\'un message (une page cachée n\'acquitte jamais) — et ne part pas si l\'appel est déjà fini');
    {
      const fB = await ouvrirFlux(b);                           // un flux ouvert qui n'acquitte rien : un onglet CACHÉ
      const depuisMsg = Date.now();
      const m = await marqueur(c, ben.id, 'un message qui attend son acquittement');
      await new Promise(r => setTimeout(r, 150));
      const r = await lancerAppel(a, ben.id, 'audio');
      const idRing = r.j.appel.id;
      M.avancer(30 * SEC);                                       // 30 s de sonnerie ont passé quand la charge est re-jugée à son départ
      const ring = await trouver(B1, deAppel(idRing, 'Appel entrant'));
      const msg = await trouver(B1, (p) => p.charge.type === 'message' && p.t >= depuisMsg);
      v('⛔ la sonnerie (attente raccourcie à 1,5 s par sa charge) part AVANT la notification du message (attente du service : 2,5 s) — population : les DEUX sont arrivées', [m.code, !!ring, !!msg, ring && msg && ring.t < msg.t], [201, true, true, true]);
      const ttl = Number(ring.entetes.ttl);
      v('⛔ la durée de vie se règle sur ce qui reste de la sonnerie (45 s − 30 s − la seconde et demie d\'attente = 13 à 14 s), pas sur 30 s : la charge est re-jugée à l\'instant de partir', ttl >= 11 && ttl <= 15, true);
      await raccrocher(a, idRing);
      await trouver(B1, deAppel(idRing, 'Appel manqué'));        // l'appel manqué, qui attend 2,5 s comme tout push quand un flux est ouvert
      /* annulé avant le départ : pas de sonnerie */
      const r2 = await lancerAppel(a, ben.id, 'audio');
      const id2 = r2.j.appel.id;
      await raccrocher(a, id2);
      const pm = await trouver(B1, deAppel(id2, 'Appel manqué'));
      v('⛔ un appel annulé AVANT que la sonnerie ne parte ne sonne jamais : « Appel manqué » arrive (population), « Appel entrant » JAMAIS (la charge est re-jugée au départ, la sonnerie n\'est plus valable)', [!!pm, compterPush(B1, deAppel(id2, 'Appel entrant'))], [true, 0]);
      /* PRIS avant le départ (un autre appareil de Ben répond) : pas de sonnerie non plus — et AUCUN « manqué » ne vient la remplacer, puisque l'appel n'est pas manqué. C'est le seul cas où la
         re-vérification au départ est la SEULE garde : un appel annulé est déjà couvert par le « manqué » de même étiquette qui prend la place de la sonnerie (le survivant de la mutation A31). */
      const r4 = await lancerAppel(a, ben.id, 'audio');
      const id4 = r4.j.appel.id;
      const rep4 = await b.post('/api/appels/' + id4 + '/repondre', { accepte: true });
      const depuis4 = Date.now();
      await marqueur(c, ben.id, 'le marqueur qui part après l\'appel pris');
      const mq4 = await trouver(B1, (p) => p.charge.type === 'message' && p.t >= depuis4);
      v('⛔ un appel PRIS avant que la sonnerie ne parte ne sonne JAMAIS : ni « Appel entrant » ni « Appel manqué » (population : Ben a répondu — 200 « en cours » —, et le push d\'un message envoyé APRÈS, qui attendait plus longtemps, est arrivé)', [rep4.code, rep4.j.etat, !!mq4, compterPush(B1, deAppel(id4))], [200, 'en_cours', true, 0]);
      await raccrocher(a, id4);
      /* la page SOUS LES YEUX acquitte : pas de push de sonnerie */
      const r3 = await lancerAppel(a, ben.id, 'audio');
      const id3 = r3.j.appel.id;
      const ev = await fB.attendre(e => e.event === 'appel' && e.data.id === id3 && e.data.etat === 'sonne');
      const ack = await b.post('/api/flux/ack', { gid: Number(ev.id) });
      const depuis3 = Date.now();
      await marqueur(c, ben.id, 'le marqueur qui part après la sonnerie');
      const mq = await trouver(B1, (p) => p.charge.type === 'message' && p.t >= depuis3);
      v('⛔ la page de Ben, sous ses yeux, ACQUITTE la sonnerie : aucun push de sonnerie ne double l\'écran (population : le push d\'un message envoyé APRÈS, qui attendait deux fois plus longtemps, est arrivé)', [ack.code, !!mq, compterPush(B1, deAppel(id3, 'Appel entrant'))], [200, true, 0]);
      await raccrocher(a, id3);
      fB.fermer();
      await trouver(B1, deAppel(id3, 'Appel manqué'));
    }

    /* ═══════ 2. +45 s SANS RÉPONSE ═══════ */
    console.log('\n+45 s sans réponse : UN appel manqué, UNE notification, UN push — jamais deux');
    {
      const avantNotifs = nManques(ben.id);
      const r = await lancerAppel(a, ben.id, 'video');
      const id = r.j.appel.id;
      await trouver(B1, deAppel(id, 'Appel entrant'));
      M.avancer(45 * SEC);
      const manque = await trouver(B1, deAppel(id, 'Appel manqué'));
      v('à +45 s (par l\'horloge du service) : « Appel manqué » arrive à Ben, avec l\'étiquette de la sonnerie', [!!manque, manque && manque.charge.tag], [true, 'appel:' + id]);
      const vb = (await b.get('/api/appels')).j, va = (await a.get('/api/appels')).j;
      v('l\'appel est « manqué » : rouge pour Ben (entrant non pris), pas pour Ana (sortante) ; plus rien n\'est actif', [vb.appels[0].etat, vb.appels[0].manque, va.appels[0].etat, va.appels[0].manque, vb.actif, va.actif], ['manque', true, 'manque', false, null, null]);
      v('⛔ UNE notification durable de plus pour Ben', nManques(ben.id) - avantNotifs, 1);
      M.avancer(10 * SEC); await M.passage();
      M.avancer(10 * SEC); await M.passage();
      v('⛔ deux passages du balayeur de plus (chacun ATTESTÉ par l\'âge du dernier tour) : toujours UNE notification et UN seul push « manqué » pour cet appel — population : la sonnerie (1) et le manqué (1) sont les seuls', [nManques(ben.id) - avantNotifs, compterPush(B1, deAppel(id, 'Appel manqué')), compterPush(B1, deAppel(id))], [1, 1, 2]);
    }
    {
      /* la sourdine coupe le PUSH de l'appel manqué, jamais la notification dans l'application */
      const directe = M.S.convDirecteObtenir(ana.id, ben.id).id;
      await b.post('/api/conversations/' + directe + '/prefs', { muet_jusqua: M.maintenant() + 30 * JOUR });
      const avantNotifs = nManques(ben.id);
      const r = await lancerAppel(a, ben.id, 'audio');
      const id = r.j.appel.id;
      const ring = await trouver(B1, deAppel(id, 'Appel entrant'));
      M.avancer(45 * SEC);
      vrai('population : le balayeur est passé après l\'avance de l\'horloge (son âge repart à zéro)', !!(await M.passage()));
      await T.attendre(() => nManques(ben.id) > avantNotifs, 6000, 20);
      const depuisS = Date.now();
      await marqueur(c, ben.id, 'le marqueur après l\'appel manqué en sourdine');
      const mq = await trouver(B1, (p) => p.charge.type === 'message' && p.t >= depuisS);
      v('⛔ conversation en SOURDINE : la sonnerie sonne encore (un appel n\'est pas un message), la notification de l\'appel manqué s\'écrit, mais le PUSH « manqué » ne part pas (population : la sonnerie est arrivée, et un push envoyé APRÈS, par la même route, aussi)', [!!ring, nManques(ben.id) - avantNotifs, compterPush(B1, deAppel(id, 'Appel manqué')), !!mq], [true, 1, 0, true]);
      await b.post('/api/conversations/' + directe + '/prefs', { muet_jusqua: 0 });
    }

    /* ═══════ 3. UN REDÉMARRAGE ═══════ */
    console.log('\nUn redémarrage : la sonnerie échue pendant l\'arrêt devient un appel manqué UNE fois, un appel qui court n\'est pas coupé');
    {
      const r = await lancerAppel(c, dan.id, 'audio');
      const id = r.j.appel.id;
      await trouver(D1, deAppel(id, 'Appel entrant'));
      const avantNotifs = nManques(dan.id);
      await M.redemarrer(60 * SEC);                                          // l'arrêt dure : la sonnerie est échue quand le service revient
      await T.attendre(() => nManques(dan.id) > avantNotifs, 8000, 20);
      const manque = await trouver(D1, deAppel(id, 'Appel manqué'));
      v('⛔ au premier passage après le redémarrage : l\'appel est « manqué », UNE notification, UN push', [(await d.get('/api/appels')).j.appels[0].etat, nManques(dan.id) - avantNotifs, !!manque], ['manque', 1, true]);
      await M.passage();
      await M.redemarrer(0);
      await M.passage(); await M.passage();
      v('⛔ un SECOND redémarrage, puis d\'autres passages (attestés) : rien n\'est refait — toujours UNE notification, UN push « manqué »', [nManques(dan.id) - avantNotifs, compterPush(D1, deAppel(id, 'Appel manqué'))], [1, 1]);
    }
    {
      /* un appel qui COURT traverse un redémarrage */
      const r = await lancerAppel(a, ben.id, 'audio');
      const id = r.j.appel.id;
      await b.post('/api/appels/' + id + '/repondre', { accepte: true });
      await M.redemarrer(0);
      await M.passage();
      M.avancer(30 * SEC); await M.passage();
      v('⛔ un appel qui COURT n\'est pas coupé par un déploiement : après le redémarrage et 30 s, il est toujours « en cours » pour les deux', [(await a.get('/api/appels')).j.actif.etat, (await b.get('/api/appels')).j.actif.etat], ['en_cours', 'en_cours']);
      await raccrocher(a, id);
    }

    /* ═══════ 4. L'APPAREIL PERDU ═══════ */
    console.log('\nL\'appareil perdu : sans signe de vie pendant 45 s, l\'appel est fini « perdu » — les pouls le gardent en vie');
    {
      const fA = await ouvrirFlux(a);
      const r = await lancerAppel(a, ben.id, 'audio');
      const id = r.j.appel.id;
      await b.post('/api/appels/' + id + '/repondre', { accepte: true });
      const pouls = async (cli, vers) => cli.post('/api/appels/' + id + '/signal', { a: vers, type: 'pouls' });
      let encore = true;
      for (let i = 0; i < 7; i++) { M.avancer(15 * SEC); await pouls(a, ben.id); await pouls(b, ana.id); await M.passage(); const act = (await a.get('/api/appels')).j.actif; encore = encore && !!act && act.etat === 'en_cours'; }
      v('⛔ contre-épreuve : cent cinq secondes d\'appel, un pouls de chaque côté toutes les 15 s (le rythme de la page) — l\'appel court toujours', encore, true);
      const perdusAvant = perdusJournal();
      /* Ben disparaît (réseau coupé, onglet tué) ; Ana, elle, vit */
      for (let i = 0; i < 4; i++) { M.avancer(12 * SEC); await pouls(a, ben.id); await M.passage(); }
      const eA = await fA.attendre(e => e.event === 'appel' && e.data.id === id && e.data.etat === 'fini');
      v('⛔ Ben ne donne plus signe de vie depuis 48 s : l\'appel est fini, motif « perdu », Ana l\'apprend par l\'événement (la personne qui vit n\'a pas à deviner que l\'autre est parti)', [eA.data.etat, eA.data.motif, (await a.get('/api/appels')).j.appels[0].motif], ['fini', 'perdu', 'perdu']);
      const sante = (await T.client(M.svc.base).get('/health')).j;
      const ligneFin = await T.attendre(() => perdusJournal() - perdusAvant >= 1, 4000, 20);
      v('⛔ le JOURNAL du service compte une fin « perdu » de plus (une ligne `appel_perdu`, sans appel ni personne) — et /health, publique, ne la compte plus (R6)', [!!ligneFin, perdusJournal() - perdusAvant, 'perdus' in sante.appels, M.svc.sortie.texte().split('\n').filter(l => l.includes('appel_perdu')).every(l => !l.includes(id) && !l.includes(ana.id))], [true, 1, false, true]);
      const encore2 = await lancerAppel(a, ben.id, 'audio');
      v('⛔ et plus personne n\'est « occupé » à cause de lui : Ana et Ben peuvent de nouveau s\'appeler', [encore2.code, (await raccrocher(a, encore2.j.appel.id)).code], [201, 200]);
      fA.fermer();
    }
    {
      /* l'appelant qui disparaît PENDANT la sonnerie fait manquer l'appel (comme s'il avait raccroché) */
      const N = await monter({ appels: { balayageMs: 300, perduMs: 10000, parHeure: 900, parPaireHeure: 90, entrantsParHeure: 600 }, balayageMs: 400, push: PUSH_CFG, vapidPublicKey: PAIRE.pub, vapidPrivateKey: PAIRE.priv }, { OPMSG_TEST_PUSH: fps.hote });
      try {
        const p1 = N.pers('Ana'), p2 = N.pers('Ben'); N.S.contactLier(p1.id, p2.id);
        const c1 = N.cl(p1), c2 = N.cl(p2);
        const r = await lancerAppel(c1, p2.id, 'audio');
        N.avancer(11 * SEC); await N.passage(); await N.passage();
        const hist = (await c2.get('/api/appels')).j;
        v('⛔ l\'appelante disparaît pendant la sonnerie (aucun signe pendant 10 s, réglage du banc) : l\'appel est fini « perdu » (annulé), Ben l\'a MANQUÉ et en est prévenu une fois', [r.code, hist.appels[0].etat, hist.appels[0].motif, hist.appels[0].manque, Number(N.sql(`SELECT COUNT(*) AS n FROM notification WHERE uid = ? AND type = 'appel_manque'`, p2.id).n)], [201, 'annule', 'perdu', true, 1]);
      } finally { await N.fermer(); }
    }

    /* ═══════ 5. LE BLOCAGE ═══════ */
    console.log('\nUn blocage coupe l\'appel qui sonne ou qui court — sans notification pour celui qui a bloqué');
    {
      const fA = await ouvrirFlux(a);
      const avantNotifs = nManques(ben.id);
      const r = await lancerAppel(a, ben.id, 'audio');
      const id = r.j.appel.id;
      const ring = await trouver(B1, deAppel(id, 'Appel entrant'));
      const bl = await b.post('/api/contacts/bloquer', { uid: ana.id });
      const eA = await fA.attendre(e => e.event === 'appel' && e.data.id === id && e.data.etat !== 'sonne');
      v('Ben bloque Ana pendant la sonnerie : l\'appel est fini (annulé, motif « bloque »), Ana l\'apprend', [bl.code, eA.data.etat, eA.data.motif], [200, 'annule', 'bloque']);
      await M.passage();
      const depuisB = Date.now();
      await marqueur(c, ben.id, 'le marqueur après le blocage');
      const mq = await trouver(B1, (p) => p.charge.type === 'message' && p.t >= depuisB);
      v('⛔ Ben, qui a bloqué, n\'a AUCUNE notification d\'appel manqué ni push « manqué » de la personne qu\'il vient de bloquer (population : la sonnerie, partie avant, est arrivée, et un push envoyé APRÈS aussi)', [!!ring, !!mq, nManques(ben.id) - avantNotifs, compterPush(B1, deAppel(id, 'Appel manqué'))], [true, true, 0, 0]);
      v('⛔ Ana ne peut plus l\'appeler : 404, comme tout inconnu (elle ne sait pas qu\'elle est bloquée)', dit(await lancerAppel(a, ben.id, 'audio')), [404, 'introuvable']);
      await b.post('/api/contacts/debloquer', { uid: ana.id });
      /* un appel qui COURT */
      const r2 = await lancerAppel(a, ben.id, 'audio');
      const id2 = r2.j.appel.id;
      await b.post('/api/appels/' + id2 + '/repondre', { accepte: true });
      await b.post('/api/contacts/bloquer', { uid: ana.id });
      await M.passage();
      v('Ben bloque Ana EN COURS d\'appel : fini des deux côtés (motif « bloque »), et plus aucun signal ne passe (409 `appel_fini`)', [(await b.get('/api/appels')).j.appels[0].etat, (await b.get('/api/appels')).j.appels[0].motif, dit(await a.post('/api/appels/' + id2 + '/signal', { a: ben.id, type: 'etat', donnees: {} }))], ['fini', 'bloque', [409, 'appel_fini']]);
      await b.post('/api/contacts/debloquer', { uid: ana.id });
      fA.fermer();
    }

    /* ═══════ 6. LA SUPPRESSION DU COMPTE ═══════ */
    console.log('\nLa demande de suppression d\'un compte termine son appel à l\'instant ; l\'effacement qui suit anonymise la notification');
    {
      const fD = await ouvrirFlux(d);
      const avantNotifs = nManques(dan.id);
      const r = await lancerAppel(c, dan.id, 'audio');
      const id = r.j.appel.id;
      const q = await c.post('/api/compte/supprimer', { confirmation: 'SUPPRIMER' });
      const e = await fD.attendre(e2 => e2.event === 'appel' && e2.data.id === id && e2.data.etat !== 'sonne');
      v('⛔ Cleo demande la suppression de son compte PENDANT la sonnerie : l\'appel est annulé à l\'instant (motif « compte »), Dan l\'apprend sans attendre 45 s et l\'a MANQUÉ (une notification)', [q.code, e.data.etat, e.data.motif, nManques(dan.id) - avantNotifs], [200, 'annule', 'compte', 1]);
      v('   le texte de la notification nomme encore Cleo (son compte n\'est pas encore effacé : quatorze jours de grâce)', textesManques(M.S, dan.id).slice(0, 1), ['Cleo Banc vous a appelé.']);
      M.avancer(14 * JOUR + HEURE);
      const efface = await T.attendre(() => M.sql('SELECT etat FROM personne WHERE id = ?', cleo.id).etat === 'supprime', 10000, 40);
      vrai('population : le compte de Cleo a été effacé par le service (quatorze jours + une heure plus tard)', !!efface);
      const h = (await d.get('/api/appels')).j;
      v('⛔ l\'effacement anonymise la notification de Dan (« Un compte supprimé vous a appelé. ») et l\'appel reste dans son historique SANS nom', [textesManques(M.S, dan.id).slice(0, 1), h.appels.filter(x => x.id === id).map(x => x.autre)], [['Un compte supprimé vous a appelé.'], [null]]);
      fD.fermer();
    }
    {
      /* un appel en COURS */
      const fB = await ouvrirFlux(b);
      const perdusAvant = perdusJournal();
      vrai('population : le journal a déjà au moins une ligne `appel_perdu` (l\'appareil perdu de la section 4) — un « aucune de plus » sur un journal vide ne prouverait rien', perdusAvant >= 1);
      const r = await lancerAppel(a, ben.id, 'audio');
      const id = r.j.appel.id;
      await b.post('/api/appels/' + id + '/repondre', { accepte: true });
      const q = await a.post('/api/compte/supprimer', { confirmation: 'SUPPRIMER' });
      const e = await fB.attendre(e2 => e2.event === 'appel' && e2.data.id === id && e2.data.etat === 'fini');
      await M.passage();
      const perdusApres = perdusJournal();
      v('⛔ Ana demande la suppression de son compte PENDANT l\'appel : fini à l\'instant (motif « compte », pas « perdu »), Ben l\'apprend ; ses sessions sont coupées (401)', [q.code, e.data.motif, dit(await a.get('/api/appels'))], [200, 'compte', [401, 'session_requise']]);
      v('   et le journal ne compte pas cette fin comme un appareil perdu (aucune ligne `appel_perdu` de plus)', perdusApres - perdusAvant, 0);
      fB.fermer();
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    console.log(M.svc.sortie.texte().slice(-1500));
    process.exitCode = 1;
  }
  for (const f of flux) { try { f.fermer(); } catch (e) { /* fermé */ } }
  await M.fermer();
  await fps.fermer();
  fin();
})();
