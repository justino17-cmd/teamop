/* test-3155 — LES NOTIFICATIONS DE LA TOUR NE SE DEVINENT PLUS, /api/email NE S'OUVRE PLUS SANS CLÉ, LES CODES DE SÉCURITÉ SONT DURCIS (28 octobre 2026).
 *
 * Revue Trail of Bits du 28 octobre 2026 (B1, I1, I3 partiel). Le VRAI `server/index.js`, isolé sur 127.0.0.1 (l'établi de `banc-serveur-gestion.js`),
 * et un FAUX SERVICE DE PUSH : le serveur envoie vraiment (`web-push`, clés de chiffrement valides), un module chargé AVANT lui (`NODE_OPTIONS`) détourne
 * `https.request` vers 127.0.0.1 pour les seuls noms de banc, et le banc lit CE QUI EST ARRIVÉ et à QUEL abonnement. Rien ne sort.
 *   1. B1 — le préfixe `teamop-controle` est RÉSERVÉ : `/api/subscribe` et `/api/notify` le refusent (400) sous toutes ses écritures (casse, espaces,
 *      largeur nulle, pleine chasse, tableau), et rien ne s'écrit ; un abonnement d'avant au préfixe est retiré au démarrage (le journal dit le NOMBRE) ;
 *      un corps public ne pose jamais `tour: true` ; la route de la Tour est au patron seul ; un envoi de la Tour (Pauline, par le vrai relevé) n'atteint
 *      QUE les abonnements `tour: true` ; la porte publique ne réécrit ni ne retire un appareil de la Tour ; une entreprise s'abonne et reçoit comme avant.
 *   2. l'adresse de push : https, port par défaut, un nom public — refus de l'IP littérale (toutes écritures), du localhost, des noms privés, des identifiants ;
 *      aucun navigateur coupé (FCM, Apple, Mozilla, Windows).
 *   3. I1 — `/api/email` : sans clé configurée (ou courte), aucun courriel ne part, même sans clé dans la requête ; avec la bonne, il part.
 *   4. I3 (part qui ne change pas le parcours) — code à 6 chiffres tiré par `crypto.randomInt`, `teamId` borné, `purpose` de forme fermée, table élaguée et
 *      plafonnée, erreur d'envoi sans le texte du serveur de courriel.
 *   5. la forme du CODE (commentaires retirés) : une seule définition de « qui reçoit les notifications de la Tour », aucun filtre sur le teamId.
 */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), crypto = require('crypto'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
const SRC_BRUT = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
/* le code, sans ses commentaires (ce dépôt en est plein : un motif qui tombe dans un commentaire garde une phrase) */
const SRC = SRC_BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a, d) => { if (a) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d ? '\n      ' + String(d).slice(0, 400) : '')); } };
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 300 s'); console.log('\ntest-3155 : ' + ok + ' ✓ ' + (ko + 1) + ' ✗'); process.exit(1); }, 300000).unref();

(async () => {
  if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules', 'express'))) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\ntest-3155 : ' + ok + ' ✓ ' + ko + ' ✗'); process.exit(0); }
  const { demarrer } = require('./banc-serveur-gestion.js');

  /* ══ 5. LA FORME DU CODE — d'abord, parce que ce qui suit en dépend ══ */
  console.log('\n── 3155 · 5. la forme du code ──');
  const defs = (nom) => (SRC.match(new RegExp('function ' + nom + '\\(', 'g')) || []).length;
  v('UNE définition de qui reçoit les notifications de la Tour, UNE façon d\'y envoyer', [defs('abonnesDeLaTour'), defs('pousserALaTour')], [1, 1]);
  v('aucun filtre sur la table des abonnements ne lit encore le préfixe de la Tour (hors la fonction de lecture du préfixe elle-même et le nettoyage du démarrage)',
    (SRC.match(/Object\.values\(subs\)\.filter\([^;]*teamop-controle/g) || []).length, 0);
  vrai('la regex d\'avant n\'existe plus, ni écrite ni construite', !/\^teamop-controle\//.test(SRC) && !/\/\^teamop-controle/.test(SRC));
  vrai('« qui reçoit » lit `tour === true`, strictement', /function abonnesDeLaTour\(\) \{ return Object\.values\(subs\)\.filter\(x => x && x\.tour === true && x\.sub && x\.sub\.endpoint\); \}/.test(SRC));
  v('les deux envois de la Tour (mail/agents/conversations/réunions/examen d\'un côté, Pauline de l\'autre) passent par elle',
    (SRC.match(/=> pousserALaTour\(titre, corps, url, '\/tour\.html#(support|messagerie)'\)/g) || []).length, 2);
  vrai('aucun `webpush.sendNotification` ne vise la table sans passer par un filtre nommé (les 3 sites sont : la Tour, notify, l\'ancien envoi par équipe)',
    (SRC.match(/webpush\.sendNotification\(/g) || []).length <= 3, (SRC.match(/webpush\.sendNotification\(/g) || []).length);
  /* le filtre et la lecture du préfixe, EXÉCUTÉS (extraits du fichier réel) sur une table qui contient des attaquants que le démarrage aurait retirés */
  {
    const tranche = (nom) => { const i = SRC_BRUT.indexOf('function ' + nom + '('); if (i < 0) return ''; const fl = SRC_BRUT.indexOf('\n', i); const l1 = SRC_BRUT.slice(i, fl);
      return /\{\s*$/.test(l1) ? SRC_BRUT.slice(i, SRC_BRUT.indexOf('\n}\n', i) + 3) : l1; };
    const ligne = SRC_BRUT.match(/function abonnesDeLaTour\(\) \{[^\n]*\}/);
    const bac = { subs: {}, PUSH_PREFIXE_TOUR: 'teamop-controle', out: null };
    vrai('les fonctions réelles sont retrouvées dans index.js', tranche('teamIdDeLaTour').length > 100 && ligne);
    if (ligne) {
      vm.createContext(bac);
      vm.runInContext(tranche('teamIdDeLaTour') + '\n' + ligne[0] + '\n', bac);
      const e = (id, extra) => Object.assign({ sub: { endpoint: 'https://x.example.net/' + id, keys: {} }, teamId: 'teamop-controle' }, extra || {});
      bac.subs = { a: e('a'), b: e('b', { tour: true }), c: e('c', { tour: 'true' }), d: e('d', { tour: 1 }), f: e('f', { teamId: 't-ent', tour: true }), g: e('g', { teamId: 'teamop-controle-x' }), h: e('h', { tour: false }) };
      const eps = vm.runInContext('abonnesDeLaTour().map(x => x.sub.endpoint.split("/").pop()).sort()', bac);
      v('⛔ « qui reçoit » : seulement tour === true (pas « true », pas 1, pas le préfixe seul) — a, c, d, g, h exclus', eps, ['b', 'f']);
      const cas = ['teamop-controle', 'TeamOP-Controle', '  teamop-controle', 'team op-controle', 'teamop-controle-2', 'teamop​-controle', '﻿teamop-controle', 'ｔｅａｍｏｐ-ｃｏｎｔｒｏｌｅ', 'TEAMOP-CONTROLE-x'];
      v('le préfixe réservé se reconnaît sous toutes ses écritures', cas.map(t => vm.runInContext('teamIdDeLaTour(' + JSON.stringify(t) + ')', bac)), cas.map(() => true));
      v('⛔ S2 — un objet à `toString` piégé fait refuser (true), il ne fait pas jeter', ['{"toString":1}', '{"toString":null,"valueOf":null}'].map(o => vm.runInContext('teamIdDeLaTour(' + o + ')', bac)), [true, true]);
      const non = ['t-ent-3155', 'opmsg-user-abc', 'controle-teamop', 'xteamop-controle', '', null, undefined, 12];
      v('…et ne touche aucun autre identifiant (entreprises, OP MESSAGES)', non.map(t => vm.runInContext('teamIdDeLaTour(' + JSON.stringify(t === undefined ? null : t) + ')', bac)), non.map(() => false));
    }
    /* le balayage des codes et la forme de la clé, exécutés */
    const bac2 = { codes: new Map(), CODE_PURPOSE: null, crypto };
    const src2 = tranche('codesBalayer') + '\n' + tranche('codePlace') + '\n' + tranche('codeCle') + '\n' + tranche('codeTirer');
    const rp = SRC_BRUT.match(/const CODE_PURPOSE = (\/[^\n]*\/);/);
    vrai('le balayage, la clé et le tirage réels sont retrouvés', src2.length > 200 && rp);
    if (rp) {
      vm.createContext(bac2);
      vm.runInContext('const CODE_PURPOSE = ' + rp[1] + ';\n' + src2, bac2);
      vm.runInContext('codes.set("vieux|reset", { code: "1", exp: Date.now() - 1 }); codes.set("frais|reset", { code: "2", exp: Date.now() + 60000 }); codes.set("vieux2|mdp-x", { code: "3", exp: Date.now() - 5000 }); codesBalayer();', bac2);
      v('⛔ le balayage retire les codes échus et garde les vivants', vm.runInContext('Array.from(codes.keys())', bac2), ['frais|reset']);
      const cles = [['t', undefined], ['t', ''], ['t', 'reset'], ['t', 'mdp-abc123'], ['t', 'mdp-a_b.c-D'], ['t', 'mdp-'], ['t', 'mdp-' + 'a'.repeat(41)], ['t', 'autre'], ['t', 'Reset'], ['t', 'reset '], ['t', 'mdp-a|b'], ['t', ['reset']], ['t', { a: 1 }], ['', 'reset'], ['x'.repeat(81), 'reset'], [['a'], 'reset'], [12, 'reset'], [null, 'reset']];
      const sortie = cles.map(c => vm.runInContext('codeCle(' + JSON.stringify(c[0]) + ',' + (c[1] === undefined ? 'undefined' : JSON.stringify(c[1])) + ')', bac2));
      v('⛔ la clé d\'un code : « reset » ou « mdp-<identifiant> » seulement, teamId texte de 80 signes au plus',
        sortie, ['t|reset', 't|reset', 't|reset', 't|mdp-abc123', 't|mdp-a_b.c-D', null, null, null, null, null, null, null, null, null, null, null, null, null]);
      ['email', 'pwd'].forEach(pp => v('⛔ D1 — « ' + pp + ' » (Mon espace) est une clé valide, avec l\'identifiant « acct-<uid> »', vm.runInContext('codeCle("acct-uid1","' + pp + '")', bac2), 'acct-uid1|' + pp));
      /* S1 : la table pleine ÉVINCE le plus ancien au lieu de refuser */
      vm.runInContext('const CODES_PLAFOND = 5000; codes.clear(); for (let i = 0; i < 5000; i++) codes.set("k" + i + "|reset", { code: "1", exp: Date.now() + 60000 + i });', bac2);
      v('⛔ S1 — table pleine : une émission neuve trouve place, en évinçant le plus ancien (celui qui échoit le plus tôt)', vm.runInContext('[codePlace("neuf|reset"), codes.size, codes.has("k0|reset"), codes.has("k1|reset")]', bac2), [true, 4999, false, true]);
      v('…réémettre une clé déjà présente n\'évince personne', vm.runInContext('[codePlace("k5|reset"), codes.size]', bac2), [true, 4999]);
      vm.runInContext('codes.clear(); for (let i = 0; i < 5000; i++) codes.set("v" + i + "|reset", { code: "1", exp: Date.now() - 1 });', bac2);
      v('…et la table pleine de codes échus se vide par le balayage, sans éviction', vm.runInContext('[codePlace("n|reset"), codes.size]', bac2), [true, 0]);
      vm.runInContext('codes.clear()', bac2);
      const tirages = Array.from({ length: 300 }, () => vm.runInContext('codeTirer()', bac2));
      vrai('le tirage : toujours 6 chiffres, entre 100000 et 999999', tirages.every(x => /^[1-9]\d{5}$/.test(x)));
      vrai('…et il varie (300 tirages, plus de 250 valeurs distinctes)', new Set(tirages).size > 250, new Set(tirages).size);
    }
    vrai('aucun `Math.random` ne tire plus un code de confirmation', !/Math\.random\(\)\s*\*\s*900000/.test(SRC) && /function codeTirer\(\) \{ return String\(crypto\.randomInt\(100000, 1000000\)\); \}/.test(SRC));
    v('la place d\'un code (balayage, puis éviction du plus ancien à la saturation) est cherchée aux DEUX émissions (code et code d\'entreprise)', (SRC.match(/if \(!codePlace\(cleCode\)\) return res\.status\(503\)/g) || []).length, 2);
    vrai('…et c\'est `codePlace` qui balaie, puis évince : la table ne refuse plus tout le monde quand elle est pleine', /function codePlace\(cle\) \{\s*codesBalayer\(\);[\s\S]*?codes\.delete\(plusAncien\);/.test(SRC));
    vrai('la lecture (checkcode) passe par la même clé bornée', /const k = codeCle\(teamId, purpose\);\s*\n\s*const c = k \? codes\.get\(k\) : null;/.test(SRC));
  }

  /* ══ le faux service de push + le détournement de https.request, côté serveur ══ */
  const bancDir = fs.mkdtempSync(path.join(os.tmpdir(), 'b3155-'));
  const recusPush = [];
  const fauxPush = http.createServer((q, r) => { q.on('data', () => {}); q.on('end', () => { recusPush.push({ hote: q.headers['x-banc-hote'], chemin: q.url }); r.writeHead(201); r.end(); }); });
  await new Promise(r => fauxPush.listen(0, '127.0.0.1', r));
  const PRELOAD = path.join(bancDir, 'detourne-push.js');
  fs.writeFileSync(PRELOAD, `const https = require('https'), http = require('http'); const orig = https.request;
https.request = function (o, cb) { if (o && typeof o === 'object' && /\\.banc3155\\.net$/.test(String(o.hostname))) {
  return http.request({ hostname: '127.0.0.1', port: ${fauxPush.address().port}, path: o.path, method: o.method, timeout: o.timeout, headers: Object.assign({}, o.headers, { 'x-banc-hote': o.hostname }) }, cb); }
  return orig.apply(this, arguments); };\n`);
  process.on('exit', () => { try { fauxPush.close(); } catch (e) {} try { fs.rmSync(bancDir, { recursive: true, force: true }); } catch (e) {} });

  const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
  const b64u = (b) => Buffer.from(b).toString('base64url');
  const CLES = { p256dh: b64u(ecdh.getPublicKey()), auth: b64u(crypto.randomBytes(16)) };
  const HOTE = 'https://push.banc3155.net';
  const EP = (nom) => HOTE + '/p/' + nom;
  const ABO = (nom) => ({ endpoint: EP(nom), keys: CLES });
  const TEAM = 't-ent-3155';
  const code64 = (t) => Buffer.from(JSON.stringify({ t, k: 'cle-propre-' + t })).toString('base64');
  const JETON = 'jeton-de-banc-' + crypto.randomBytes(24).toString('hex');
  const maint = Date.now(), iso = d => new Date(maint + d).toISOString();
  const releve = () => ({ version: 1, genereLe: iso(0), chauffe: { debut: null, jour: null, plafondDuJour: 10 }, jour: { envoyes: 0, reponses: 0, refus: 0, enAttente: 2 }, recherches: [],
    entreprises: [{ id: 'c1', nom: 'Zébulon-Clim-3155', ville: 'Niort', metier: 'climatisation', etat: 'courriel_pret', email: 'patron@zebulon-clim.fr', majLe: iso(-60e3) }],
    courriels: [{ id: 'o-tour', entrepriseId: 'c1', etat: 'en_attente', objet: 'Objet-3155', texte: 'Texte-3155', quand: iso(-1000), genre: 'sequence', etape: 1, statutBrut: 'pending_review', maj: '2026-10-27T10:00:00' }], reponses: [] });
  const AVANT = {
    [EP('attaquant-ancien')]: { sub: ABO('attaquant-ancien'), teamId: 'teamop-controle', userId: '', userName: '', ts: 1 },
    [EP('attaquant-casse')]: { sub: ABO('attaquant-casse'), teamId: '  TEAMOP-Controle-bis', userId: '', userName: '', ts: 1 },
    [EP('attaquant-faux-tour')]: { sub: ABO('attaquant-faux-tour'), teamId: 'teamop-controle', userId: '', userName: '', ts: 1, tour: 'true' },
    [EP('tour-ancien')]: { sub: ABO('tour-ancien'), teamId: 'teamop-controle', userId: 'u-patron', userName: 'Patron', ts: 1, tour: true },
    ['http://push.banc3155.net/p/ancien-http']: { sub: { endpoint: 'http://push.banc3155.net/p/ancien-http', keys: CLES }, teamId: TEAM, userId: 'u9', userName: 'Vieux', ts: 1 },
    ['https://127.0.0.1/p/ancien-ip']: { sub: { endpoint: 'https://127.0.0.1/p/ancien-ip', keys: CLES }, teamId: TEAM, userId: 'u9', userName: 'Vieux', ts: 1 },
    [EP('entreprise-ancienne')]: { sub: ABO('entreprise-ancienne'), teamId: TEAM, userId: 'u1', userName: 'Karim', ts: 1 } };

  /* ══════════ SERVEUR A : la clé d'API est posée, le jeton de Pauline aussi, des abonnements d'avant sont là ══════════ */
  const CLE_API = crypto.randomBytes(24).toString('hex');
  const A = await demarrer({
    config: { apiKey: CLE_API, pauline: { jetonSha256: sha(JETON) } },
    env: { NODE_OPTIONS: '--require ' + PRELOAD },
    espaces: { 'ent-3155': { t: TEAM, nom: 'Entreprise 3155', email: 'ent@exemple-3155.fr', code: code64(TEAM), ts: Date.now() } },
    avant: (D) => fs.writeFileSync(path.join(D, 'subscriptions.json'), JSON.stringify(AVANT)) });
  vrai('le vrai serveur démarre', A.vivant, A.journal().slice(-400));
  if (!A.vivant) { await A.fin(); process.exit(1); }
  const fichierSubs = () => { try { return JSON.parse(fs.readFileSync(path.join(A.D, 'subscriptions.json'), 'utf8')); } catch (e) { return null; } };
  const noms = () => Object.keys(fichierSubs() || {}).map(x => x.split('/p/')[1]).sort();
  const brutA = async (m, route, corps, entetes) => { const r = await fetch(A.B + route, { method: m, headers: Object.assign({ 'Content-Type': 'application/json', 'X-Forwarded-For': '10.31.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250) }, entetes || {}), body: JSON.stringify(corps) });
    const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) {} return { s: r.status, j: j || {}, txt }; };
  const sub = (c, e) => brutA('POST', '/api/subscribe', c, e);
  const notif = (c) => brutA('POST', '/api/notify', c);

  console.log('\n── 3155 · 1. B1 : les abonnements d\'avant ──');
  await dormir(900);
  v('⛔ au démarrage, les trois abonnements au préfixe SANS tour:true sont retirés (casse et espaces compris, « tour: \'true\' » compris) ; la Tour (tour:true) et l\'entreprise restent',
    noms(), ['entreprise-ancienne', 'tour-ancien']);
  vrai('⛔ D2 — les abonnements d\'avant à une adresse que le filtre refuse (http, IP) sont retirés aussi, et le journal en dit le nombre', /2 abonnement\(s\) à une adresse de push refusée/.test(A.journal()), A.journal().slice(-400));
  vrai('le journal du VPS dit le NOMBRE (3), jamais une adresse de push', /3 abonnement\(s\) au préfixe réservé retiré\(s\)/.test(A.journal()) && !/banc3155|attaquant-/.test(A.journal()), A.journal().slice(-300));

  console.log('\n── 3155 · 1. B1 : le préfixe est réservé ──');
  const avantTable = JSON.stringify(fichierSubs());
  const prefixes = ['teamop-controle', 'TEAMOP-CONTROLE', 'TeamOP-Controle-2', ' teamop-controle', 'team op-controle', 'teamop​-controle', 'ｔｅａｍｏｐ-ｃｏｎｔｒｏｌｅ', ['teamop-controle']];
  let res = [];
  for (const t of prefixes) res.push(await sub({ sub: ABO('att-' + res.length), teamId: t }));
  v('⛔ /api/subscribe refuse le préfixe sous 8 écritures (400, JSON {error})', res.map(r => [r.s, typeof r.j.error]), prefixes.map(() => [400, 'string']));
  res = [];
  for (const t of prefixes) res.push(await notif({ teamId: t, title: 'Hameçonnage', body: 'x' }));
  v('⛔ /api/notify refuse le préfixe sous 8 écritures (400, JSON {error})', res.map(r => [r.s, typeof r.j.error]), prefixes.map(() => [400, 'string']));
  await dormir(700);
  v('rien n\'a été écrit (la table est identique)', JSON.stringify(fichierSubs()), avantTable);
  vrai('…et rien n\'est parti vers un service de push', recusPush.length === 0, JSON.stringify(recusPush));

  console.log('\n── 3155 · 1. B1 : une entreprise s\'abonne et reçoit, comme avant ──');
  const norm = await sub({ sub: ABO('ent-1'), teamId: TEAM, userId: 'u9', userName: 'Zoé', tour: true }, { 'x-teamop-kh': crypto.randomBytes(16).toString('hex') });
  v('un abonnement normal (en-tête x-teamop-kh, corps habituel) passe', [norm.s, norm.j.ok], [200, true]);
  await dormir(600);
  const e1 = (fichierSubs() || {})[EP('ent-1')];
  vrai('⛔ …il est écrit SANS tour:true, même si le corps publique en réclame un', e1 && e1.teamId === TEAM && !('tour' in e1), JSON.stringify(e1));
  const n1 = await notif({ teamId: TEAM, title: 'Bonjour', body: 'Équipe', url: '/app.html' });
  v('/api/notify à l\'entreprise : 2 appareils visés (l\'ancien et le neuf), les 2 reçus', [n1.s, n1.j.sent], [200, 2]);
  await dormir(300);
  v('⛔ …et seuls ces deux appareils-là ont reçu (pas la Tour)', recusPush.map(r => r.chemin).sort(), ['/p/ent-1', '/p/entreprise-ancienne']);
  recusPush.length = 0;
  v('une entreprise inconnue de l\'annuaire garde sa réponse d\'avant (200) — pas de régression', (await sub({ sub: ABO('ent-2'), teamId: 't-inconnue-3155' })).s, 200);
await brutA('POST', '/api/unsubscribe', { endpoint: EP('ent-2') });

  console.log('\n── 3155 · 1. B1 : la route de la Tour ──');
  const R = '/api/monitor/push/abonner', RD = '/api/monitor/push/desabonner';
  v('sans jeton : 403', [(await brutA('POST', R, { sub: ABO('tour-x') })).s, (await brutA('POST', RD, { endpoint: EP('tour-ancien') })).s], [403, 403]);
  v('jeton inventé : 403', (await brutA('POST', R, { sub: ABO('tour-x') }, { Authorization: 'Bearer ' + 'a'.repeat(48) })).s, 403);
  v('⛔ un collaborateur de la Tour (compte actif, pas patron) : 403 — et rien n\'est écrit', [(await brutA('POST', R, { sub: ABO('tour-x') }, { Authorization: 'Bearer ' + A.TA })).s, (await brutA('POST', RD, { endpoint: EP('tour-ancien') }, { Authorization: 'Bearer ' + A.TA })).s], [403, 403]);
  const entPatron = { Authorization: 'Bearer ' + A.TP };
  v('le patron s\'abonne : 200', (await brutA('POST', R, { sub: ABO('tour-neuf'), teamId: 't-ent-3155', tour: false }, entPatron)).j.ok, true);
  await dormir(600);
  const tn = (fichierSubs() || {})[EP('tour-neuf')];
  vrai('⛔ …l\'abonnement porte tour:true et SON teamId (posé par le serveur, jamais lu du corps)', tn && tn.tour === true && tn.teamId === 'teamop-controle' && tn.userName === 'Patron', JSON.stringify(tn));
  v('sans clés de chiffrement : 400', (await brutA('POST', R, { sub: { endpoint: EP('tour-sans-cle') } }, entPatron)).s, 400);
  v('clés de mauvais type : 400', (await brutA('POST', R, { sub: { endpoint: EP('tour-sans-cle'), keys: { p256dh: 1, auth: {} } } }, entPatron)).s, 400);
  v('corps vide ou sub qui n\'est pas un objet : 400', [(await brutA('POST', R, {}, entPatron)).s, (await brutA('POST', R, { sub: 'x' }, entPatron)).s], [400, 400]);

  console.log('\n── 3155 · 1. B1 : la porte publique ne touche pas un appareil de la Tour ──');
  const tentative = await sub({ sub: ABO('tour-neuf'), teamId: TEAM });
  v('⛔ s\'abonner à l\'adresse d\'un appareil de la Tour pour le rétrograder : 400', tentative.s, 400);
  await brutA('POST', '/api/unsubscribe', { endpoint: EP('tour-neuf') });
  await brutA('POST', '/api/unsubscribe', { endpoint: EP('tour-ancien') });
  await dormir(600);
  v('⛔ /api/unsubscribe (public) ne retire pas un appareil de la Tour', noms().filter(x => x.startsWith('tour-')), ['tour-ancien', 'tour-neuf']);
  await brutA('POST', '/api/unsubscribe', { endpoint: EP('ent-1') });
  await dormir(600);
  vrai('…mais retire toujours celui d\'une entreprise', !noms().includes('ent-1'), noms());

  console.log('\n── 3155 · 1. B1 : un envoi de la Tour n\'atteint que la Tour ──');
  const mac = (corps, jeton) => A.http('POST', '/api/pauline/releve', jeton === undefined ? JETON : jeton, corps);
  v('le relevé de Pauline passe (401 sans le bon jeton, sinon 200)', [(await mac(releve(), 'faux-' + JETON)).s, (await mac(releve())).s], [401, 200]);
  await A.attendre(async () => recusPush.length >= 2, 8000);
  await dormir(700);
  v('⛔ la notification de Pauline est arrivée aux DEUX appareils de la Tour — et à aucun autre', recusPush.map(r => r.chemin).sort(), ['/p/tour-ancien', '/p/tour-neuf']);
  recusPush.length = 0;
  /* la désinscription à la Tour : patron seul */
  const d1 = await brutA('POST', RD, { endpoint: EP('tour-neuf') }, entPatron);
  v('le patron retire son appareil de la Tour', [d1.s, d1.j.retire], [200, true]);
  v('…et ne retire pas, par cette route, l\'abonnement d\'une entreprise', (await brutA('POST', RD, { endpoint: EP('entreprise-ancienne') }, entPatron)).j.retire, false);
  await dormir(600);
  vrai('…il est toujours là', noms().includes('entreprise-ancienne') && !noms().includes('tour-neuf'), noms());

  console.log('\n── 3155 · 1 bis. S2 / S3 ──');
  v('⛔ S2 — un `teamId` à `toString` piégé : 400 « réservé », pas 500 (notify)', (await notif({ teamId: { toString: 1 }, title: 'x' })).s, 400);
  v('…ni sur subscribe', (await sub({ sub: { endpoint: EP('piege'), keys: CLES }, teamId: { toString: 1 } })).s, 400);
  const ident = (t) => brutA('POST', '/api/compte/identifiants', { teamId: t, to: 'dest@exemple-3155.fr', login: 'karim', mdp: 'Secret3155', prenom: 'Karim', entreprise: 'X' });
  v('⛔ S3 — un appareil de la Tour est abonné, et « teamop-controle » n\'est PAS pour autant un espace connu (aucun courriel d\'accès officiel)', [(await ident('teamop-controle')).s, (await ident('teamop-controle-bis')).s], [403, 403]);
  vrai('…l\'espace d\'une entreprise réellement abonnée, lui, reste connu (le garde ne coupe pas les vrais)', (await ident(TEAM)).s !== 403);
  vrai('S3 — les deux filtres par équipe (relève du courrier, notify) et les quatre « espace connu » excluent l\'appareil de la Tour', (SRC.match(/abonneEntreprise\(/g) || []).length >= 7 && /function abonneEntreprise\(s, teamId\) \{ return !!s && s\.tour !== true && s\.teamId === teamId; \}/.test(SRC) && !/Object\.values\(subs\)\.(some|filter)\(\w+ => \w+\.teamId === /.test(SRC), (SRC.match(/Object\.values\(subs\)\.(some|filter)\([^\n]*/g) || []).join(' | '));

  console.log('\n── 3155 · 2. l\'adresse de push ──');
  const refus = [
    'http://push.banc3155.net/p/http', 'ftp://push.banc3155.net/x', 'https://127.0.0.1/p/ip', 'https://10.0.0.5/p/ip', 'https://192.168.1.10/p/ip', 'https://169.254.169.254/latest/meta-data/',
    'https://2130706433/p/ip-decimale', 'https://0x7f.1/p/ip-hexa', 'https://0177.0.0.1/p/ip-octale', 'https://[::1]/p/ip6', 'https://[::ffff:127.0.0.1]/p/ip6', 'https://localhost/p/l', 'https://LOCALHOST./p/l', 'https://api.localhost/p/l',
    'https://intranet/p/mono', 'https://serveur.local/p/l', 'https://base.internal/p/l', 'https://box.lan/p/l', 'https://x.home.arpa/p/l', 'https://user:pw@push.banc3155.net/p/id', 'https://push.banc3155.net:8443/p/port',
    'https://127.0.0.1%2epush.banc3155.net/p/pct-ip', 'https://localhost%2epush.banc3155.net/p/pct-l', 'https://169.254.169.254%2epush.banc3155.net/p/pct-meta', 'https://push%2ebanc3155.net/p/pct',
    'https://push.banc3155.net%40127.0.0.1/p/arobase', 'https://push.banc3155.net\\@127.0.0.1/p/antislash', 'https://push.banc3155.net /p/espace', ' https://push.banc3155.net/p/espace-tete', 'https:/push.banc3155.net/p/un-slash',
    'push.banc3155.net/p/sans-schema', '', 'https://', 'https://' + 'a'.repeat(3000) + '.net/', 42, null, { href: 'https://push.banc3155.net/' }, ['https://push.banc3155.net/p/x']];
  const tablePre = JSON.stringify(fichierSubs());
  const sorties = [];
  for (const ep of refus) sorties.push((await sub({ sub: { endpoint: ep, keys: CLES }, teamId: TEAM })).s);
  v('⛔ /api/subscribe refuse les ' + refus.length + ' adresses (http, IP sous toutes ses écritures, localhost, noms privés, identifiants, autre port, illisible)', sorties, refus.map(() => 400));
  const sortiesT = [];
  for (const ep of refus) sortiesT.push((await brutA('POST', R, { sub: { endpoint: ep, keys: CLES } }, entPatron)).s);
  v('⛔ la route de la Tour refuse les mêmes ' + refus.length + ' adresses', sortiesT, refus.map(() => 400));
  await dormir(600);
  v('…et rien n\'a été écrit', JSON.stringify(fichierSubs()), tablePre);
  /* D2 — on range et on appelle l'adresse NORMALISÉE (celle que `new URL` lit), jamais le texte reçu */
  const brutMaj = 'https://PUSH.Banc3155.NET:443/p/Maj-3155';
  v('une adresse en majuscules / avec le port par défaut : acceptée', (await sub({ sub: { endpoint: brutMaj, keys: CLES }, teamId: TEAM })).s, 200);
  await dormir(600);
  vrai('⛔ D2 — …rangée sous sa forme normalisée (hôte en minuscules, sans port), pas sous le texte reçu', Object.keys(fichierSubs() || {}).includes('https://push.banc3155.net/p/Maj-3155') && !Object.keys(fichierSubs() || {}).includes(brutMaj), Object.keys(fichierSubs() || {}));
  const rangee = (fichierSubs() || {})['https://push.banc3155.net/p/Maj-3155'];
  vrai('…et l\'objet appelé porte la même adresse normalisée', rangee && rangee.sub.endpoint === 'https://push.banc3155.net/p/Maj-3155', JSON.stringify(rangee));
  await brutA('POST', '/api/unsubscribe', { endpoint: brutMaj });
  await dormir(600);
  vrai('…et se désabonner avec le texte que le navigateur avait donné la retire', !Object.keys(fichierSubs() || {}).includes('https://push.banc3155.net/p/Maj-3155'), Object.keys(fichierSubs() || {}));
  const bons = ['https://fcm.googleapis.com/fcm/send/dXNlcjpmY20', 'https://web.push.apple.com/QGxT7aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'https://updates.push.services.mozilla.com/wpush/v2/gAAAAA', 'https://wns2-par02p.notify.windows.com/w/?token=BQYAAAA', 'https://fcm.googleapis.com./fcm/send/x'];
  const sb = [];
  for (const ep of bons) sb.push((await sub({ sub: { endpoint: ep, keys: CLES }, teamId: TEAM })).s);
  v('⛔ aucun navigateur coupé : FCM, Apple, Mozilla, Windows passent', sb, bons.map(() => 200));
  for (const ep of bons) await brutA('POST', '/api/unsubscribe', { endpoint: ep });   // ils ne doivent PAS rester : un envoi ultérieur les appellerait pour de vrai
  await dormir(600);
  vrai('…et on les retire aussitôt (aucun envoi du banc ne doit viser un vrai service)', noms().every(x => /^(entreprise-ancienne|tour-ancien)$/.test(x)), noms());

  /* ══ 3. I1 — /api/email ══ */
  console.log('\n── 3155 · 3. I1 : /api/email ──');
  const email = (c) => brutA('POST', '/api/email', Object.assign({ to: 'dest@exemple-3155.fr', subject: 'Objet 3155', text: 'Corps 3155' }, c));
  const nMail = () => A.fact.recus.length;
  let m0 = nMail();
  v('clé configurée : sans clé, 403 ; clé fausse, 403 ; clé d\'un autre type, 403', [(await email({})).s, (await email({ key: 'x'.repeat(48) })).s, (await email({ key: [CLE_API] })).s, (await email({ key: { a: CLE_API } })).s], [403, 403, 403, 403]);
  v('…aucun courriel n\'est parti', nMail() - m0, 0);
  const bon = await email({ key: CLE_API });
  v('la bonne clé : 200 et le courriel part', [bon.s, bon.j.ok, nMail() - m0], [200, true, 1]);

  /* ══ 4. I3 ══ */
  console.log('\n── 3155 · 4. I3 : les codes de sécurité ──');
  const lireCode = async (adr) => { let c = null; await A.attendre(async () => { for (const m of await A.courriels()) { if (!String(m.to || '').includes(adr)) continue; const x = /code de confirmation TeamOP : (\d+)/.exec(String(m.text || '')); if (x) { c = x[1]; return true; } } return false; }, 8000); return c; };
  /* le DERNIER code arrivé à une adresse (deux envois à la même adresse : le premier courriel n'est plus bon) */
  const lireDernier = async (adr) => { let c = null; await A.attendre(async () => { for (const m of (await A.courriels()).slice().reverse()) { if (!String(m.to || '').includes(adr)) continue; const x = /code de confirmation TeamOP : (\d+)/.exec(String(m.text || '')); if (x) { c = x[1]; return true; } } return false; }, 8000); return c; };
  const envoi = (c) => brutA('POST', '/api/sendcode', c);
  const verif = (c) => brutA('POST', '/api/checkcode', c);
  const mail1 = 'u1-3155@exemple-3155.fr';
  const s1 = await envoi({ teamId: TEAM, email: mail1, purpose: 'mdp-abc123' });
  v('sendcode (purpose « mdp-<identifiant> ») : 200', [s1.s, s1.j.ok], [200, true]);
  const code1 = await lireCode(mail1);
  vrai('le code reçu fait 6 chiffres', /^[1-9]\d{5}$/.test(String(code1)), code1);
  v('checkcode avec un mauvais code : 400, puis le bon : ok', [(await verif({ teamId: TEAM, code: '000000', purpose: 'mdp-abc123' })).s, (await verif({ teamId: TEAM, code: code1, purpose: 'mdp-abc123' })).j.ok], [400, true]);
  v('…et le code ne sert qu\'une fois', (await verif({ teamId: TEAM, code: code1, purpose: 'mdp-abc123' })).s, 400);
  const mail2 = 'u2-3155@exemple-3155.fr';
  await envoi({ teamId: TEAM, email: mail2 });
  const code2 = await lireCode(mail2);
  v('sans purpose : « reset » par défaut, des deux côtés', [/^\d{6}$/.test(String(code2)), (await verif({ teamId: TEAM, code: code2 })).j.ok], [true, true]);
  const mail3 = 'u3-3155@exemple-3155.fr';
  await envoi({ teamId: TEAM, email: mail3, purpose: 'reset' });
  const code3 = await lireCode(mail3);
  const essais = [];
  for (let i = 0; i < 6; i++) essais.push((await verif({ teamId: TEAM, code: '000000', purpose: 'reset' })).s);
  v('six mauvais essais : 400 ×5 puis 429 (comme avant)', essais, [400, 400, 400, 400, 400, 429]);
  v('…et le bon code est alors perdu', (await verif({ teamId: TEAM, code: code3, purpose: 'reset' })).s, 400);
  m0 = nMail();
  const mauvais = [{ teamId: TEAM, email: mail1, purpose: 'autre' }, { teamId: TEAM, email: mail1, purpose: 'x'.repeat(5000) }, { teamId: TEAM, email: mail1, purpose: ['reset'] }, { teamId: TEAM, email: mail1, purpose: { a: 1 } },
    { teamId: TEAM, email: mail1, purpose: 'mdp-' }, { teamId: TEAM, email: mail1, purpose: 'mdp-a|b' }, { teamId: 'x'.repeat(81), email: mail1 }, { teamId: ['a'], email: mail1 }, { teamId: 12, email: mail1 },
    { teamId: TEAM, email: 'pas-une-adresse' }, { teamId: TEAM, email: 'a@b.fr' + 'x'.repeat(300) }, { teamId: TEAM, email: ['a@b.fr'] }, { teamId: TEAM }, { email: mail1 }];
  const rm = [];
  for (const c of mauvais) rm.push((await envoi(c)).s);
  v('⛔ purpose hors forme, teamId trop long ou pas du texte, adresse invalide : 400 partout', rm, mauvais.map(() => 400));
  v('…aucun courriel n\'est parti', nMail() - m0, 0);
  v('⛔ checkcode avec une clé hors forme : 400, jamais une erreur', [(await verif({ teamId: TEAM, code: '123456', purpose: 'x'.repeat(5000) })).s, (await verif({ teamId: ['a'], code: '123456' })).s, (await verif({})).s], [400, 400, 400]);
  /* D1 — « Mon espace » (espace.html) change l'adresse et le mot de passe avec purpose « email » / « pwd » et teamId « acct-<uid> » : les VRAIES fonctions de la page, contre le vrai serveur */
  {
    const page = fs.readFileSync(path.join(RACINE, 'espace.html'), 'utf8');
    const fS = /async function _sendCode\(purpose\)\{[^\n]*\n[^\n]*\n[^\n]*\}/.exec(page), fC = /async function _checkCode\(purpose,code\)\{[^\n]*\}[^\n]*\}/.exec(page);
    vrai('D1 — les deux fonctions réelles d\'espace.html sont retrouvées', fS && fC, page.indexOf('_sendCode(purpose)'));
    if (fS && fC) {
      const compte = 'u-espace-3155@exemple-3155.fr';
      const bacP = { auth: { currentUser: { email: compte } }, _myUid: 'uidABC123', fetch: (u, o) => fetch(String(u).replace('https://api.teamop.fr', A.B), Object.assign({}, o, { headers: Object.assign({}, o.headers, { 'X-Forwarded-For': '10.77.' + Math.floor(Math.random() * 250) + '.9' }) })), JSON, console };
      vm.createContext(bacP);
      vm.runInContext(fS[0] + '\n' + fC[0] + '\nthis._s = _sendCode; this._c = _checkCode;', bacP);
      for (const pp of ['email', 'pwd']) {
        let err = null, c = null;
        try { await bacP._s(pp); c = await lireDernier(compte); } catch (e) { err = e; }
        vrai('⛔ D1 — _sendCode(\'' + pp + '\') : le code part (aucune erreur) et il arrive à 6 chiffres', !err && /^[1-9]\d{5}$/.test(String(c)), String(err && (err.message || err)) + ' ' + c);
        let ko1 = null; try { await bacP._c(pp, '000000'); } catch (e) { ko1 = e; }
        let ko2 = null; try { await bacP._c(pp, c); } catch (e) { ko2 = e; }
        vrai('…_checkCode(\'' + pp + '\') : un mauvais code est refusé, le bon passe', ko1 && /incorrect/i.test(ko1.message) && !ko2, JSON.stringify([ko1, ko2]));
        await A.attendre(async () => true, 1);
      }
    }
  }
  /* le code d'entreprise : même table, même forme */
  const se = await brutA('POST', '/api/sendcode-entreprise', { teamId: TEAM, purpose: 'mdp-abc123', login: 'karim' });
  v('sendcode-entreprise (purpose valide) : 200, adresse masquée', [se.s, se.j.ok, /•••/.test(se.j.envoye || '')], [200, true, true]);
  v('⛔ sendcode-entreprise : purpose hors forme / teamId trop long : 400', [(await brutA('POST', '/api/sendcode-entreprise', { teamId: TEAM, purpose: 'x'.repeat(500) })).s, (await brutA('POST', '/api/sendcode-entreprise', { teamId: 'x'.repeat(81) })).s], [400, 400]);
  /* l'erreur d'envoi ne rend plus le message du serveur de courriel */
  A.fact.refuserA = 'inconnu-3155@';
  const er = await envoi({ teamId: TEAM, email: 'inconnu-3155@exemple-3155.fr', purpose: 'reset' });
  v('⛔ un refus du serveur de courriel : 500, message GÉNÉRIQUE', [er.s, typeof er.j.error], [500, 'string']);
  vrai('…sans le texte du serveur, ni l\'adresse, ni « SMTP »', !/Recipient|rejected|User unknown|inconnu-3155|SMTP|550|127\.0\.0\.1/i.test(er.txt), er.txt);
  vrai('…le journal du VPS, lui, garde la famille du refus', /sendcode envoi : SMTP: /.test(A.journal()), A.journal().slice(-300));
  const er2 = await brutA('POST', '/api/sendcode-entreprise', { teamId: TEAM, purpose: 'reset' });
  A.fact.refuserA = 'ent@exemple-3155.fr';
  const er3 = await brutA('POST', '/api/sendcode-entreprise', { teamId: TEAM, purpose: 'reset' });
  vrai('⛔ sendcode-entreprise : pareil (500 générique, sans le texte du serveur)', er2.s === 200 && er3.s === 500 && !/Recipient|rejected|ent@exemple|550|SMTP/i.test(er3.txt), er3.txt);
  A.fact.refuserA = null;
  await A.fin();

  /* ══════════ SERVEUR B : AUCUNE clé d'API dans la configuration — la route ne doit pas s'ouvrir ══════════ */
  console.log('\n── 3155 · 3. I1 : la configuration reconstruite SANS apiKey ──');
  const B = await demarrer({ config: { apiKey: undefined } });
  vrai('le serveur (sans apiKey) démarre', B.vivant, B.journal().slice(-300));
  if (B.vivant) {
    const brutB = async (corps) => { const r = await fetch(B.B + '/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.32.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250) }, body: JSON.stringify(corps) }); const t = await r.text(); let j = {}; try { j = JSON.parse(t); } catch (e) {} return { s: r.status, j }; };
    const cfg = JSON.parse(fs.readFileSync(path.join(B.banc, 'config.json'), 'utf8'));
    vrai('population : la configuration du serveur ne porte vraiment PAS d\'apiKey', !('apiKey' in cfg), Object.keys(cfg));
    const base = { to: 'dest@exemple-3155.fr', subject: 'Relais', text: 'x', html: '<b>x</b>' };
    const sorties = [await brutB(base), await brutB(Object.assign({ key: undefined }, base)), await brutB(Object.assign({ key: '' }, base)), await brutB(Object.assign({ key: null }, base)), await brutB(Object.assign({ key: 'undefined' }, base)), await brutB(Object.assign({ key: 0 }, base))];
    v('⛔ sans apiKey configurée : aucune requête n\'ouvre la route (403 partout, clé absente, vide, nulle…)', sorties.map(x => x.s), sorties.map(() => 403));
    v('⛔ …et AUCUN courriel n\'est parti depuis le SMTP de TeamOP', B.fact.recus.length, 0);
    vrai('…la réponse ne dit pas que la clé n\'est pas posée', sorties.every(x => x.j.error === 'clé invalide'), JSON.stringify(sorties.map(x => x.j)));
  }
  await B.fin();

  /* ══════════ SERVEUR C : une apiKey COURTE est traitée comme absente ══════════ */
  const C = await demarrer({ config: { apiKey: 'court' } });
  if (C.vivant) {
    const r = await fetch(C.B + '/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.33.1.1' }, body: JSON.stringify({ key: 'court', to: 'dest@exemple-3155.fr', subject: 'Relais', text: 'x' }) });
    v('⛔ une apiKey de 5 signes ne suffit pas (même présentée à l\'identique) : 403, aucun courriel', [r.status, C.fact.recus.length], [403, 0]);
  } else vrai('le serveur C démarre', false, C.journal().slice(-300));
  await C.fin();

  console.log('\ntest-3155 : ' + ok + ' ✓ ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); console.log('\ntest-3155 : ' + ok + ' ✓ ' + (ko + 1) + ' ✗'); process.exit(1); });
