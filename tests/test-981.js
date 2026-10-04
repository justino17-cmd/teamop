/* ⛔ CE QUE CE FICHIER GARDE — LES APPELS À DEUX PAR LEURS ROUTES : LE VRAI SERVICE, EN HTTP, AVEC SON FLUX (famille 3, étape 7 ; modèle `test-973`).

   `test-980` éprouve ce qui est rangé, le stockage seul ; `test-905` joue la garde de chaque route contre six profils ; `test-983` fait vivre le service (le balayeur, les pushs, l'effacement, la
   restauration). Celui-ci joue les GESTES, de bout en bout, à plusieurs personnes, sur plusieurs appareils, avec l'horloge du service décalée au geste (jamais un sommeil) :

     · ⛔ `GET /api/ice` : sans relais configuré, une liste VIDE et `relais:false` — jamais le serveur d'un tiers ; avec un relais, des identifiants ÉPHÉMÈRES dont le mot de passe est RECALCULÉ ICI avec
       `crypto` (HMAC-SHA1 du secret sur `<échéance>:<identifiant>`, en base64), à deux instants, pour deux personnes — et le secret n'est dans aucune réponse, aucun journal, aucun octet de la base ;
     · lancer : par une conversation directe OU une personne (jamais les deux ni aucune), à DEUX seulement (un groupe : `appel_a_deux`), entre gens qui peuvent s'écrire — un inconnu, un bloqué et une
       personne qui n'existe pas reçoivent la MÊME réponse, au caractère près ; un compte effacé ; occupé (`occupe`, moi ou l'autre) ; les plafonds par personne et par paire, un compte neuf à un tiers ;
     · répondre et raccrocher par l'appareil LIÉ (le second appareil : `appel_pris`, un autre appareil de l'appelante : `appareil_non_lie`) ;
     · ⛔ le SIGNAL : relayé à l'appareil lié de l'AUTRE personne et à personne d'autre (ni ses autres appareils, ni les miens), 16 Ko pile, le destinataire est celui de l'appel, le débit est plafonné,
       un signal envoyé pendant qu'aucun flux n'est ouvert est retenu 30 s puis livré — et jamais un octet de SDP ni de candidat n'est rangé, journalisé ou repris par /health ;
     · l'événement durable `appel` arrive aux deux participants et à personne d'autre, et se REJOUE par Last-Event-ID.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « personne n'a reçu » est précédée d'un marqueur que la même personne reçoit APRÈS — un flux qui n'a rien reçu parce qu'il est mort
   ne prouve pas qu'on ne lui a rien envoyé. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

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
  const svc = await T.lancerService({ horloge: true, config });
  let decal = ZERO - Date.now(); svc.avancer(decal);
  const maintenant = () => Date.now() + decal;
  const chemin = path.join(svc.data, 'msg.db');
  const S = ouvrir({ chemin, scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: maintenant });
  let k = 0;
  const pers = (nom, origine) => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: origine || 'beta', verifie: true });
  const cl = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 60 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
  const sql = (req, ...args) => { const d = T.lireBase(chemin); try { return d.prepare(req).get(...args); } finally { d.close(); } };
  const avancer = (ms) => { decal += ms; svc.avancer(ms); };
  return { svc, S, chemin, pers, cl, sql, avancer, maintenant, fermer: async () => { try { S.fermer(); } catch (x) { /* déjà fermé */ } await svc.arreter(); } };
}
const dit = (rep) => [rep.code, rep.j && rep.j.error];
const octetsBase = (chemin) => { let b = Buffer.alloc(0); for (const s of ['', '-wal', '-shm']) { try { b = Buffer.concat([b, fs.readFileSync(chemin + s)]); } catch (e) { /* absent */ } } return b; };

(async () => {
  const flux = [];
  const M = await monter({
    appels: { relais: { hote: HOTE, port: 3478, portTls: 5349, secret: SECRET_RELAIS, ttlS: 3600 }, parHeure: 6, parPaireHeure: 3, signalMax: 10, signalFenetreMs: MIN, iceParHeure: 3, balayageMs: 1000, perduMs: 600000 },
  });
  const { svc, S, pers, cl, sql, avancer, maintenant } = M;
  const ana = pers('Ana'), ben = pers('Ben'), cleo = pers('Cleo'), dan = pers('Dan'), eve = pers('Eve'), fred = pers('Fred'), zoe = pers('Zoe', 'compte'), inconnue = pers('Nova');
  S.contactLier(ana.id, ben.id); S.contactLier(ana.id, cleo.id); S.contactLier(ben.id, cleo.id); S.contactLier(ana.id, fred.id); S.contactLier(zoe.id, ben.id); S.contactLier(ana.id, eve.id); S.contactLier(ben.id, dan.id);
  const a1 = cl(ana), a2 = cl(ana), b1 = cl(ben), b2 = cl(ben), c1 = cl(cleo), d1 = cl(dan), z1 = cl(zoe), e1 = cl(eve), f1 = cl(fred);
  const ouvrirFlux = async (c) => { const f = await T.flux(c); flux.push(f); return f; };
  try {
    /* ═══════ 1. LE RELAIS : GET /api/ice ═══════ */
    console.log('GET /api/ice : des identifiants éphémères recalculés ici, le secret nulle part, jamais le serveur d\'un tiers');
    {
      const r = await a1.get('/api/ice');
      vrai('population : la réponse porte un STUN et un serveur TURN avec identifiants', r.code === 200 && r.j.relais === true && r.j.serveurs.length === 2 && !!r.j.serveurs[1].username);
      v('   `Cache-Control: no-store` (des identifiants ne se mettent pas en cache) et une durée de vie d\'une heure', [r.h.get('cache-control'), r.j.ttl_s], ['no-store', 3600]);
      const [stun, turn] = r.j.serveurs;
      v('⛔ les adresses sont celles du relais SEUL : stun, turn en UDP et en TCP, turns — jamais le serveur d\'un tiers', [stun.urls, tri(turn.urls)], [['stun:' + HOTE + ':3478'], tri(['turn:' + HOTE + ':3478?transport=udp', 'turn:' + HOTE + ':3478?transport=tcp', 'turns:' + HOTE + ':5349?transport=tcp'])]);
      vrai('   aucun nom d\'hôte dans la réponse que celui du relais (population : ' + JSON.stringify(r.j).match(/[a-z0-9.-]+\.[a-z]{2,}/g).length + ' noms lus)', JSON.stringify(r.j).match(/[a-z0-9.-]+\.[a-z]{2,}/g).every(h => h === HOTE) && JSON.stringify(r.j).match(/[a-z0-9.-]+\.[a-z]{2,}/g).length >= 3);
      const [exp, uid] = turn.username.split(':');
      const attendu = Math.floor(maintenant() / 1000) + 3600;
      v('⛔ le nom d\'utilisateur est « <échéance>:<identifiant de la personne> » : une heure, la personne connectée', [Math.abs(Number(exp) - attendu) <= 3, uid], [true, ana.id]);
      v('⛔ le mot de passe est BASE64(HMAC-SHA1(secret, nom)) RECALCULÉ ICI avec `crypto` — sans passer par le code du service', turn.credential, hmac64(SECRET_RELAIS, turn.username));
      v('   un autre secret donne un autre mot de passe (la preuve ne se satisfait pas de n\'importe quel calcul)', hmac64(SECRET_RELAIS + 'x', turn.username) === turn.credential, false);
      avancer(10 * MIN);
      const r2 = await a1.get('/api/ice'), r3 = await b1.get('/api/ice');
      v('⛔ SECOND PASSAGE, dix minutes plus tard : une autre échéance, un autre mot de passe, toujours juste ; et pour Ben, SON identifiant', [Number(r2.j.serveurs[1].username.split(':')[0]) - Number(exp), r2.j.serveurs[1].credential === hmac64(SECRET_RELAIS, r2.j.serveurs[1].username), r3.j.serveurs[1].username.split(':')[1], r3.j.serveurs[1].credential === hmac64(SECRET_RELAIS, r3.j.serveurs[1].username)], [600, true, ben.id, true]);
      const r4 = await a1.get('/api/ice'), r5 = await a1.get('/api/ice');
      v('⛔ le plafond : trois lectures par heure (réglage du banc) — Ana en a fait trois (la troisième passe), la quatrième est refusée (429 quota_atteint, Retry-After) ; Ben, lui, a le sien', [r4.code, dit(r5), Number(r5.h.get('retry-after')) > 0, r3.code], [200, [429, 'quota_atteint'], true, 200]);
      avancer(HEURE + SEC);
      v('   et une heure plus tard, elle repasse', (await a1.get('/api/ice')).code, 200);
      const cfg = (await T.client(svc.base).get('/api/config')).j, sante = (await T.client(svc.base).get('/health')).j;
      v('/api/config dit qu\'un relais existe et combien de temps sonne un appel — sans le nom du relais ni son secret', [cfg.appels, JSON.stringify(cfg).includes(HOTE), JSON.stringify(cfg).includes(SECRET_RELAIS)], [{ relais: true, sonnerie_s: 45 }, false, false]);
      v('⛔ /health dit « turn: true » et des nombres — ni le secret, ni le nom du relais, ni un appel', [sante.appels.turn, JSON.stringify(sante).includes(SECRET_RELAIS), JSON.stringify(sante).includes(HOTE), Object.keys(sante.appels).sort()], [true, false, false, ['ageS', 'echecs', 'perdus', 'turn']]);
    }
    {
      /* sans relais : une liste vide, et rien d'un tiers */
      const N = await monter({});
      try {
        const p = N.pers('Ana'), c = N.cl(p);
        const r = await c.get('/api/ice');
        v('⛔ SANS relais configuré : `relais:false`, une liste VIDE, durée nulle — aucun serveur STUN public n\'est proposé en repli', [r.code, r.j, r.h.get('cache-control')], [200, { relais: false, ttl_s: 0, serveurs: [] }, 'no-store']);
        v('   /api/config le dit aussi, et /health : turn:false', [(await T.client(N.svc.base).get('/api/config')).j.appels.relais, (await T.client(N.svc.base).get('/health')).j.appels.turn], [false, false]);
      } finally { await N.fermer(); }
    }

    /* ═══════ 2. LANCER ═══════ */
    console.log('\nLancer : une conversation directe ou une personne, à deux, entre gens qui peuvent s\'écrire');
    const directe = S.convDirecteObtenir(ana.id, ben.id).id;
    const groupe = S.convCreerGroupe({ createur: ana.id, nom: 'Équipe', membres: [ben.id, cleo.id], annonces_seules: false, ephemere_s: 0 }).id;
    const groupeAutres = S.convCreerGroupe({ createur: cleo.id, nom: 'Autre', membres: [ben.id], annonces_seules: false, ephemere_s: 0 }).id;
    S.contactEtat(eve.id, ana.id, 'bloque');                // Eve a bloqué Ana
    const fA = await ouvrirFlux(a1), fA2 = await ouvrirFlux(a2), fB1 = await ouvrirFlux(b1), fB2 = await ouvrirFlux(b2), fC = await ouvrirFlux(c1);
    {
      const corps = { type: 'audio', uid: ben.id };
      v('⛔ le corps est lu avec rigueur : ni conversation ni personne, les deux à la fois, un type absent ou inconnu, un identifiant mal formé, SOI-MÊME → 400 `champ_invalide`, et rien n\'est écrit',
        [(await a1.post('/api/appels', { type: 'audio' })).j, (await a1.post('/api/appels', { type: 'audio', conv: directe, uid: ben.id })).j, (await a1.post('/api/appels', { uid: ben.id })).j, (await a1.post('/api/appels', { uid: ben.id, type: 'visio' })).j,
         (await a1.post('/api/appels', { uid: 'p_zz', type: 'audio' })).j, (await a1.post('/api/appels', { conv: 'c_zz', type: 'audio' })).j, (await a1.post('/api/appels', { uid: ana.id, type: 'audio' })).j,
         (await a1.post('/api/appels', { uid: { $ne: 1 }, type: 'audio' })).j, (await a1.post('/api/appels', [corps])).j].map(j => j && j.error),
        new Array(9).fill('champ_invalide'));
      v('   population : aucun appel n\'existe après ces neuf refus', Number(sql('SELECT COUNT(*) AS n FROM appel').n), 0);
      const g = await a1.post('/api/appels', { conv: groupe, type: 'audio' });
      v('⛔ un GROUPE : l\'appel de groupe est l\'étape 8 — refus propre `appel_a_deux` (409), rien d\'écrit', [dit(g), Number(sql('SELECT COUNT(*) AS n FROM appel').n)], [[409, 'appel_a_deux'], 0]);
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
      v('population : aucun appel n\'a été écrit par ces refus', Number(sql('SELECT COUNT(*) AS n FROM appel').n), 0);
      /* un compte effacé (410) : une directe existe avec lui */
      const dF = S.convDirecteObtenir(ana.id, fred.id).id;
      const brut = new DatabaseSync(M.chemin); brut.prepare('UPDATE personne SET suppression_le = ? WHERE id = ?').run(maintenant() - 1, fred.id); brut.close();
      S.compteEffacer(fred.id);
      v('⛔ une conversation directe avec un compte EFFACÉ : 410 `compte_supprime` (et par son identifiant : le 404 de tout inconnu)', [dit(await a1.post('/api/appels', { conv: dF, type: 'audio' })), dit(await a1.post('/api/appels', { uid: fred.id, type: 'audio' }))], [[410, 'compte_supprime'], [404, 'introuvable']]);
    }
    let appel1 = null;
    {
      const r = await a1.post('/api/appels', { conv: directe, type: 'video' });
      appel1 = r.j && r.j.appel;
      v('lancer par la conversation directe : 201 et la vue de l\'appelante (sortante, vidéo, Ben en face, appareil lié)', [r.code, appel1.etat, appel1.sens, appel1.type, appel1.autre.id, appel1.lie, /^a_[0-9a-f]{32}$/.test(appel1.id)], [201, 'sonne', 'sortant', 'video', ben.id, true, true]);
      const eB = await fB1.attendre(e => e.event === 'appel'), eB2 = await fB2.attendre(e => e.event === 'appel');
      v('⛔ Ben l\'apprend sur SES DEUX appareils, par l\'événement durable `appel` (vue entrante, aucun appareil lié) — Cleo, qui n\'y est pas, ne reçoit RIEN', [eB.data.etat, eB.data.sens, eB.data.lie, eB2.data.id === appel1.id], ['sonne', 'entrant', false, true]);
      const m = await a1.post('/api/conversations/' + S.convDirecteObtenir(ana.id, cleo.id).id + '/messages', { cid: 'cid-marqueur-0001', texte: 'marqueur' });
      await fC.attendre(e => e.event === 'message');
      vrai('   (marqueur reçu par Cleo APRÈS : son flux est vivant) et elle n\'a reçu aucun `appel`', m.code === 201 && fC.evenements.filter(e => e.event === 'appel').length === 0);
      const l = (await b1.get('/api/appels')).j, la = (await a1.get('/api/appels')).j;
      v('GET /api/appels : l\'historique est vide (rien de fini), et `actif` reprend l\'appel qui sonne — pour les deux', [l.appels, l.actif && l.actif.id === appel1.id, l.actif && l.actif.sens, la.actif && la.actif.lie], [[], true, 'entrant', true]);
      v('⛔ occupée : Ana, qui est dans un appel, n\'en lance pas un second — 409 `occupe` avec `moi:true`', [dit(await a1.post('/api/appels', { uid: cleo.id, type: 'audio' })), (await a1.post('/api/appels', { uid: cleo.id, type: 'audio' })).j.moi], [[409, 'occupe'], true]);
      const occ = await c1.post('/api/appels', { uid: ben.id, type: 'audio' });
      v('⛔ Ben est dans un appel : Cleo reçoit 409 `occupe` avec `moi:false`, et Ben le lira « manqué » avec UNE notification', [dit(occ), occ.j.moi, Number(sql(`SELECT COUNT(*) AS n FROM notification WHERE uid = ? AND type = 'appel_manque'`, ben.id).n), (await b1.get('/api/appels?filtre=manques')).j.appels.length], [[409, 'occupe'], false, 1, 1]);
      v('   le filtre `filtre=manques` ne garde que les entrants non pris, `filtre=tout` est refusé (400)', [(await b1.get('/api/appels?filtre=manques')).j.appels.map(x => x.etat), dit(await b1.get('/api/appels?filtre=tout'))], [['occupe'], [400, 'champ_invalide']]);
    }

    /* ═══════ 3. RÉPONDRE, ET LES APPAREILS ═══════ */
    console.log('\nRépondre : l\'appareil qui répond est LIÉ, un second reçoit appel_pris, un étranger reçoit le 404 d\'un appel inexistant');
    {
      const id = appel1.id;
      v('⛔ un étranger (Cleo) : 404 introuvable, identique à un appel qui n\'existe pas, au caractère près', [dit(await c1.post('/api/appels/' + id + '/repondre', { accepte: true })), (await c1.post('/api/appels/' + id + '/repondre', { accepte: true })).txt === (await c1.post('/api/appels/a_' + '0'.repeat(32) + '/repondre', { accepte: true })).txt], [[404, 'introuvable'], true]);
      v('l\'appelante ne répond pas à son propre appel : 403 `interdit` ; `accepte` doit être un booléen : 400', [dit(await a1.post('/api/appels/' + id + '/repondre', { accepte: true })), dit(await b1.post('/api/appels/' + id + '/repondre', { accepte: 'oui' })), dit(await b1.post('/api/appels/' + id + '/repondre', {}))], [[403, 'interdit'], [400, 'champ_invalide'], [400, 'champ_invalide']]);
      avancer(6 * SEC);
      const rep = await b1.post('/api/appels/' + id + '/repondre', { accepte: true });
      v('Ben répond depuis son premier appareil : 200, « en cours », l\'appareil est lié', [rep.code, rep.j.etat, rep.j.deja, rep.j.appel.lie], [200, 'en_cours', false, true]);
      const eA = await fA.attendre(e => e.event === 'appel' && e.data.etat === 'en_cours');
      vrai('   Ana l\'apprend par l\'événement, sur son appareil (et sur l\'autre, qui n\'est pas lié)', !!eA && !!(await fA2.attendre(e => e.event === 'appel' && e.data.etat === 'en_cours')));
      v('le même appareil qui répond deux fois : la même vue (`deja:true`)', [(await b1.post('/api/appels/' + id + '/repondre', { accepte: true })).j.deja], [true]);
      v('⛔ son SECOND appareil ne vole pas l\'appel : 409 `appel_pris` (accepter comme refuser)', [dit(await b2.post('/api/appels/' + id + '/repondre', { accepte: true })), dit(await b2.post('/api/appels/' + id + '/repondre', { accepte: false }))], [[409, 'appel_pris'], [409, 'appel_pris']]);
      v('⛔ un autre appareil d\'Ana ne raccroche pas son appel : 403 `appareil_non_lie` (et rien n\'est fini)', [dit(await a2.post('/api/appels/' + id + '/quitter', {})), (await a1.get('/api/appels')).j.actif.etat], [[403, 'appareil_non_lie'], 'en_cours']);
    }

    /* ═══════ 4. LE SIGNAL ═══════ */
    console.log('\nLe signal : relayé à l\'appareil LIÉ de l\'autre personne, et à personne d\'autre');
    {
      const id = appel1.id, sig = (c, a, type, donnees) => c.post('/api/appels/' + id + '/signal', donnees === undefined ? { a, type } : { a, type, donnees });
      const ro = await sig(a1, ben.id, 'offre', { sdp: CANARI_SDP });
      v('Ana envoie son offre : 200', dit(ro), [200, undefined]);
      const recu = await fB1.attendre(e => e.event === 'signal' && e.data.type === 'offre');
      v('⛔ l\'appareil lié de Ben la reçoit, enveloppe intacte : l\'appel, l\'expéditrice, le genre, les données telles quelles', [recu.data.appel, recu.data.de, recu.data.type, recu.data.donnees.sdp === CANARI_SDP], [id, ana.id, 'offre', true]);
      const rr = await sig(b1, ana.id, 'reponse', { sdp: 'v=0\r\no=CANARI-REP-WQXZ\r\n' });
      const recuA = await fA.attendre(e => e.event === 'signal' && e.data.type === 'reponse');
      v('Ben répond : l\'appareil lié d\'Ana la reçoit', [dit(rr), recuA.data.de], [[200, undefined], ben.id]);
      await sig(a1, ben.id, 'candidats', { c: [CANARI_CAND] }); await sig(b1, ana.id, 'etat', { camera: false }); await sig(a1, ben.id, 'pouls');
      /* ⛔ les marqueurs : un message de chacun à l'autre arrive à TOUS les appareils de l'autre — après, un signal parti à tort serait déjà là */
      await a1.post('/api/conversations/' + directe + '/messages', { cid: 'cid-marqueur-0002', texte: 'après les signaux (Ana)' });
      await b1.post('/api/conversations/' + directe + '/messages', { cid: 'cid-marqueur-0003', texte: 'après les signaux (Ben)' });
      await fB2.attendre(e => e.event === 'message' && e.data.texte === 'après les signaux (Ana)'); await fA2.attendre(e => e.event === 'message' && e.data.texte === 'après les signaux (Ben)');
      await fB1.attendre(e => e.event === 'message' && e.data.texte === 'après les signaux (Ana)'); await fA.attendre(e => e.event === 'message' && e.data.texte === 'après les signaux (Ben)');
      const sB2 = fB2.evenements.filter(e => e.event === 'signal').length, sA2 = fA2.evenements.filter(e => e.event === 'signal').length;
      v('⛔ le SECOND appareil de Ben et l\'AUTRE appareil d\'Ana ne reçoivent AUCUN signal (population : leurs flux sont vivants, chacun a reçu le marqueur qui suit)', [sB2, sA2], [0, 0]);
      v('   et l\'appareil lié de Ben a reçu offre, candidats (de Ana) — son propre état ne lui revient pas ; celui d\'Ana : réponse, état (de Ben)', [fB1.evenements.filter(e => e.event === 'signal').map(e => e.data.type), fA.evenements.filter(e => e.event === 'signal').map(e => e.data.type)], [['offre', 'candidats'], ['reponse', 'etat']]);
      vrai('   un `pouls` prouve que l\'appareil est là, mais ne voyage PAS (personne n\'en reçoit)', ![...fA.evenements, ...fB1.evenements].some(e => e.event === 'signal' && e.data.type === 'pouls'));
      /* la validation de l'enveloppe */
      v('⛔ le destinataire est l\'AUTRE participant de CET appel, rien d\'autre : un tiers, soi-même, rien, un type inconnu, des données absentes ou qui ne sont pas un objet → 400',
        [(await sig(a1, cleo.id, 'offre', {})).j.error, (await sig(a1, ana.id, 'offre', {})).j.error, (await sig(a1, undefined, 'offre', {})).j.error, (await sig(a1, ben.id, 'commande', {})).j.error, (await sig(a1, ben.id, 'offre')).j.error, (await sig(a1, ben.id, 'offre', 'texte')).j.error, (await sig(a1, ben.id, 'offre', [1])).j.error, (await sig(a1, ben.id, 'offre', null)).j.error],
        new Array(8).fill('champ_invalide'));
      const taille = (n) => ({ x: 'y'.repeat(n - JSON.stringify({ x: '' }).length) });
      const pile = taille(16384), trop = taille(16385);
      v('⛔ 16 Ko PILE (16 384 octets de JSON) passent ; un octet de plus : 413 `signal_trop_gros`', [Buffer.byteLength(JSON.stringify(pile)), dit(await sig(a1, ben.id, 'candidats', pile)), Buffer.byteLength(JSON.stringify(trop)), dit(await sig(a1, ben.id, 'candidats', trop))], [16384, [200, undefined], 16385, [413, 'signal_trop_gros']]);
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
      fB1.fermer(); await fB1.attendreFerme();
      await sig(a1, ben.id, 'candidats', { c: ['retenu-1'] }); await sig(a1, ben.id, 'candidats', { c: ['retenu-2'] });
      const f1 = await ouvrirFlux(b1);
      await T.attendre(() => f1.evenements.filter(e => e.event === 'signal').length >= 2, 4000, 20);
      v('⛔ les deux signaux retenus arrivent À L\'OUVERTURE du flux, dans l\'ordre', f1.evenements.filter(e => e.event === 'signal').map(e => e.data.donnees.c[0]), ['retenu-1', 'retenu-2']);
      f1.fermer(); await f1.attendreFerme();
      await sig(a1, ben.id, 'candidats', { c: ['périmé'] });
      avancer(31 * SEC);
      const f2 = await ouvrirFlux(b1);
      await b1.post('/api/conversations/' + directe + '/messages', { cid: 'cid-marqueur-0004', texte: 'marqueur après réouverture' });
      await f2.attendre(e => e.event === 'message' && e.data.texte === 'marqueur après réouverture');
      v('⛔ un signal de plus de 30 s n\'est PAS livré (un candidat périmé ne sert à rien, et rien ne s\'accumule : population = le marqueur reçu après la réouverture)', f2.evenements.filter(e => e.event === 'signal').length, 0);
      f2.fermer();
      flux.push(await ouvrirFlux(b1));
    }

    /* ═══════ 6. RACCROCHER, PUIS RIEN NE SIGNALE PLUS ═══════ */
    console.log('\nRaccrocher : l\'appareil lié, une fois ; ensuite plus rien ne se signale ni ne se répond');
    {
      const id = appel1.id;
      avancer(20 * SEC);
      const q = await a1.post('/api/appels/' + id + '/quitter', {});
      v('Ana raccroche depuis l\'appareil lié : 200, « fini » (durée = le temps passé depuis la réponse)', [q.code, q.j.ok, q.j.deja, q.j.appel.etat, q.j.appel.duree_s > 0], [200, true, false, 'fini', true]);
      v('⛔ rejouer le geste (la page raccroche après que l\'autre l\'a fait) : 200 `deja:true`, rien d\'écrit', [(await a1.post('/api/appels/' + id + '/quitter', {})).j.deja, (await b1.post('/api/appels/' + id + '/quitter', {})).j.deja], [true, true]);
      v('⛔ un appel fini ne se signale plus (409 `appel_fini`) ni ne se répond (409 `appel_fini`)', [dit(await a1.post('/api/appels/' + id + '/signal', { a: ben.id, type: 'etat', donnees: {} })), dit(await b1.post('/api/appels/' + id + '/repondre', { accepte: true }))], [[409, 'appel_fini'], [409, 'appel_fini']]);
      const hb = (await b1.get('/api/appels')).j, ha = (await a1.get('/api/appels')).j;
      v('l\'historique des deux porte l\'appel (fini, sortant pour Ana, entrant pour Ben, pas « manqué »), plus rien n\'est actif', [ha.appels.map(x => [x.etat, x.sens, x.manque]), hb.appels.filter(x => x.id === id).map(x => [x.etat, x.sens, x.manque]), ha.actif, hb.actif], [[['fini', 'sortant', false]], [['fini', 'entrant', false]], null, null]);
      v('GET /api/appels ne rend de l\'autre personne que son nom court (identifiant, prénom, nom, avatar) — rien d\'une session ni d\'une adresse', Object.keys(ha.appels[0].autre).sort(), ['avatar', 'id', 'nom', 'prenom']);
    }

    /* ═══════ 7. LES PLAFONDS DE LANCEMENT ═══════ */
    console.log('\nLes plafonds de lancement : par paire, par personne, un compte neuf à un tiers');
    {
      const lancerFinir = async (c, vers) => { const r = await c.post('/api/appels', { uid: vers, type: 'audio' }); if (r.code === 201) await c.post('/api/appels/' + r.j.appel.id + '/quitter', {}); return r; };
      avancer(2 * HEURE);                                      // la fenêtre d'une heure est vide
      const b3 = []; for (let i = 0; i < 4; i++) b3.push((await lancerFinir(a1, ben.id)).code);
      v('⛔ PAR PAIRE : trois appels par heure vers la même personne (réglage du banc), le quatrième est refusé 429 `quota_atteint` avec Retry-After', [b3, (await a1.post('/api/appels', { uid: ben.id, type: 'audio' })).h.get('retry-after') > 0], [[201, 201, 201, 429], true]);
      const autres = []; for (let i = 0; i < 4; i++) autres.push((await lancerFinir(a1, cleo.id)).code);
      v('⛔ PAR PERSONNE : six tentatives par heure en tout (réglage du banc), et UNE TENTATIVE REFUSÉE COMPTE (le plafond de la paire est jugé après celui de la personne) — Ana en a déjà fait cinq vers Ben (trois passées, deux refusées) : le sixième lancement, vers Cleo, passe ; les suivants, vers n\'importe qui, sont refusés (429 quota_atteint)', [autres, (await a1.post('/api/appels', { uid: cleo.id, type: 'audio' })).j.error], [[201, 429, 429, 429], 'quota_atteint']);
      /* un compte neuf (moins de 24 h, hors bêta) a un tiers des limites : 2 au lieu de 6 */
      const z = []; for (let i = 0; i < 3; i++) z.push((await lancerFinir(z1, ben.id)).code);
      v('⛔ un compte NEUF (moins de 24 h, hors bêta) a un tiers du plafond : 2 appels par heure au lieu de 6', z, [201, 201, 429]);
      avancer(HEURE + SEC);
      v('   la fenêtre passée, les limites reviennent', [(await lancerFinir(a1, ben.id)).code, (await lancerFinir(a1, cleo.id)).code], [201, 201]);
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
    console.log(svc.sortie.texte().slice(-1200));
    process.exitCode = 1;
  }
  for (const f of flux) { try { f.fermer(); } catch (e) { /* fermé */ } }
  await M.fermer();
  fin();
})();
