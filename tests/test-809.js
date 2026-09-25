/* ⛔ CE QUE CE FICHIER GARDE — LA SORTIE DE FIREBASE : LE DOCUMENT D'ÉQUIPE RANGÉ CHEZ NOUS.

   Décision de Justin, 25 septembre 2026 : « quand j'envoie la mise à jour, Firebase est
   supprimé ». `server/documents.js` range désormais le document de chaque entreprise, tel que
   l'appareil l'a chiffré, et le copie depuis Firebase au premier accès. C'est la synchro d'OP
   GESTION tout entière : un défaut ici, c'est une entreprise qui ne travaille plus ensemble.

   ⛔ LE VRAI SERVEUR, ISOLÉ, ET UN FIREBASE DE BANC. On lance `server/index.js` (configuration,
   données et port à lui) et on lui donne un Firestore et un point d'émission de jeton qui vivent
   sur 127.0.0.1 — `TEAMOP_FIRESTORE_URL` et `TEAMOP_FB_OAUTH_URL`. La vraie signature du jeton
   d'administration est VÉRIFIÉE par le faux Google, avec la clé publique de la paire générée
   ici : un jeton mal signé ne lirait rien. ⚠️ Jamais `api.teamop.fr`, jamais Google.

   ⛔ LES CINQ PROPRIÉTÉS QUI DÉCIDENT SI UNE ENTREPRISE PERD DES DONNÉES LE JOUR DE LA BASCULE :
     1. la copie depuis Firebase est FIDÈLE, champ pour champ, et gardée à part ;
     2. un échec de copie n'est JAMAIS rendu comme « équipe vide » (503, jamais `doc:null`) ;
     3. une écriture qui arrive sur une place vide attend la copie — elle ne l'écrase pas ;
     4. la copie n'a lieu qu'UNE fois, même sous dix lectures simultanées ;
     5. une écriture réveille les appareils à l'écoute, et aucune écriture concurrente ne se perd.
   Et les portes : la même garde que les sauvegardes (`sauvRefus`), la clé partagée refusée, une
   suspension qui n'est pas une coupure, les espaces techniques de la bêta ouverts comme la règle
   `elanB_teams`, et un nom d'espace qui ne peut désigner aucun autre chemin. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), http = require('http');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b809-'));
let enfant = null, faux = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { if (faux) faux.close(); } catch (e) {}
  try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
/* ⛔ UN BANC QUI SE FIGE DOIT TOMBER, PAS PENDRE. Mesuré à sa première exécution : une écoute qui
   se retirait elle-même (`req.on('close')` sur un POST) laissait le banc attendre pour toujours,
   sans une ligne — la CI l'aurait tué au bout de son délai, sans dire pourquoi. */
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 200 s — une écoute ou une copie ne répond plus'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 200000).unref();

console.log('\n── 809 · le document d\'équipe rangé chez nous — la sortie de Firebase ──');

/* ══ 0. LA FORME DES VALEURS FIRESTORE, SANS SERVEUR ═══════════════════════════════════════ */
{
  const d = require(path.join(RACINE, 'server', 'documents.js'));
  const c = d.champsFirestore({ enc: { stringValue: 'QUJD' }, z: { integerValue: '1' }, ts: { integerValue: '1727260000000' },
    ok: { booleanValue: true }, rien: { nullValue: null }, pi: { doubleValue: 3.5 },
    carte: { mapValue: { fields: { a: { stringValue: 'x' } } } }, liste: { arrayValue: { values: [{ integerValue: '2' }] } } });
  v('⛔ un `integerValue` (du TEXTE chez Google) redevient un nombre', [c.z, c.ts], [1, 1727260000000]);
  v('   et les autres formes se déplient', [c.enc, c.ok, c.rien, c.pi, c.carte, c.liste], ['QUJD', true, null, 3.5, { a: 'x' }, [2]]);
}

(async () => {
  let webpush, express;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); express = require(path.join(RACINE, 'server', 'node_modules', 'express')); }
  catch (e) {
    console.log('  … partie exécutée SAUTÉE : server/node_modules absent (cd server && npm i)');
    console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
  }

  /* ══ 1. UN FIREBASE DE BANC ═══════════════════════════════════════════════════════════════ */
  const paire = crypto.generateKeyPairSync('rsa', { modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
  const JETON = 'jeton-de-banc-' + crypto.randomBytes(6).toString('hex');
  const G = { docs: {}, panne: false, lectures: {}, jetonsRefuses: 0, base404: false, muet: false, pendus: [], patch: 200, patchs: [] };
  const champ = x => typeof x === 'number' ? (Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x }) : { stringValue: String(x) };
  const poserDoc = (coll, t, o) => { const f = {}; for (const k of Object.keys(o)) f[k] = champ(o[k]);
    G.docs[coll + '/' + t] = { name: 'projects/elan-gestion/databases/(default)/documents/' + coll + '/' + t, fields: f, updateTime: '2026-09-25T10:00:00.123456Z' }; };
  faux = http.createServer((q, r) => {
    let corps = ''; q.on('data', d => { corps += d; });
    q.on('end', () => {
      if (q.method === 'POST' && q.url === '/token') {
        /* ⛔ ON VÉRIFIE LA SIGNATURE, comme Google : un jeton qui passerait signé n'importe
           comment ne prouverait pas que le serveur sait encore s'authentifier. */
        const assertion = decodeURIComponent((/assertion=([^&]+)/.exec(corps) || [])[1] || '');
        const [h, p, s] = assertion.split('.');
        const bon = !!(h && p && s) && crypto.verify('RSA-SHA256', Buffer.from(h + '.' + p), paire.publicKey, Buffer.from(s, 'base64url'));
        if (!bon) { G.jetonsRefuses++; r.writeHead(400, { 'Content-Type': 'application/json' }); return r.end('{"error":"invalid_grant"}'); }
        r.writeHead(200, { 'Content-Type': 'application/json' }); return r.end(JSON.stringify({ access_token: JETON, expires_in: 3600 }));
      }
      const m = /^\/projects\/([^/]+)\/databases\/\(default\)\/documents\/([^/]+)\/([^/?]+)(\?.*)?$/.exec(q.url);
      /* La version minimale que la Tour pose chez Firestore (`versionsPousserFirestore`). */
      if (q.method === 'PATCH' && m) {
        if (q.headers.authorization !== 'Bearer ' + JETON) { r.writeHead(401); return r.end('{}'); }
        G.patchs.push(decodeURIComponent(m[2]) + '/' + decodeURIComponent(m[3]));
        r.writeHead(G.patch, { 'Content-Type': 'application/json' }); return r.end(G.patch === 200 ? '{"name":"ok"}' : '{"error":{"code":500}}');
      }
      if (q.method === 'GET' && m) {
        const cle = decodeURIComponent(m[2]) + '/' + decodeURIComponent(m[3]);
        G.lectures[cle] = (G.lectures[cle] || 0) + 1;
        if (q.headers.authorization !== 'Bearer ' + JETON) { r.writeHead(401); return r.end('{}'); }
        if (G.panne) { r.writeHead(503); return r.end('{}'); }
        /* Des en-têtes, un début de corps, puis plus rien (`gardien`, C1). */
        if (G.muet) { r.writeHead(200, { 'Content-Type': 'application/json' }); r.write('{"fields":{'); G.pendus.push(r); return; }
        /* Un 404 qui ne parle PAS du document : la base, le projet (`gardien`, C2). */
        if (G.base404) { r.writeHead(404, { 'Content-Type': 'application/json' });
          return r.end(JSON.stringify({ error: { code: 404, status: 'NOT_FOUND', message: 'The database (default) does not exist for project elan-gestion Please visit https://console.cloud.google.com/datastore/setup?project=elan-gestion to add a Cloud Datastore or Cloud Firestore database.' } })); }
        const d = G.docs[cle];
        /* Le vrai message de Firestore pour un document absent — le seul 404 qui dise « neuf ». */
        if (!d) { r.writeHead(404, { 'Content-Type': 'application/json' });
          return r.end(JSON.stringify({ error: { code: 404, status: 'NOT_FOUND', message: 'Document "projects/elan-gestion/databases/(default)/documents/' + cle + '" not found.' } })); }
        r.writeHead(200, { 'Content-Type': 'application/json' }); return r.end(JSON.stringify(d));
      }
      r.writeHead(404); r.end();
    });
  });
  await new Promise(res => faux.listen(0, '127.0.0.1', res));
  const GURL = 'http://127.0.0.1:' + faux.address().port;

  /* ══ 2. L'ANNUAIRE, LES FERMETURES, LA VERSION MINIMALE ═══════════════════════════════════ */
  const kh = k => crypto.createHash('sha256').update(k).digest('hex');
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
  const CLE_PARTAGEE = 'ELAN-GESTION-7F3A9C2E-cloud-2026';
  const E = {};   // t → clé
  const annuaire = {};
  const inscrire = (slug, t, k, ts) => { E[t] = k; annuaire[slug] = { slug, nom: slug, email: slug + '@exemple.fr', t, code: b64({ t, k }), ts }; };
  inscrire('ent-a', 'ent-a1b2', 'CLE-DE-A-QWZX', 1);            // a un document chez Firebase
  inscrire('ent-c', 'ent-c3d4', 'CLE-DE-C-QWZX', 2);            // Firebase en panne, puis jamais écrit
  inscrire('ent-d', 'ent-d5e6', 'CLE-DE-D-QWZX', 3);            // écrit AVANT d'avoir lu
  inscrire('ent-p', 'ent-p7q8', CLE_PARTAGEE, 4);               // clé partagée
  inscrire('ent-f', 'ent-f9g0', 'CLE-DE-F-QWZX', 5);            // fermée (garde son entrée : le pire cas)
  inscrire('ent-s', 'ent-s1t2', 'CLE-DE-S-QWZX', 6);            // suspendue pour impayé
  inscrire('ent-m', 'ent-m3n4', 'CLE-DE-M-QWZX', 7);            // dix lectures en même temps
  inscrire('ent-r', 'ent-r5s6', 'CLE-DE-R-QWZX', 8);            // vingt écritures en même temps
  inscrire('elan-gestion', 'elan-gestion', CLE_PARTAGEE, 9);    // l'espace de repli
  inscrire('ent-u', 'ent-u1v2', 'CLE-DE-U-QWZX', 10);           // Firebase qui se tait après ses en-têtes (C1)
  inscrire('ent-v', 'ent-v3w4', 'CLE-DE-V-QWZX', 11);           // un 404 qui ne nomme pas le document (C2)
  inscrire('ent-x', 'ent-x5y6', 'CLE-DE-X-QWZX', 12);           // la copie attend la porte de version (C4)
  fs.mkdirSync(path.join(banc, 'data'), { recursive: true });
  fs.writeFileSync(path.join(banc, 'data', 'espaces.json'), JSON.stringify(annuaire));
  fs.writeFileSync(path.join(banc, 'data', 'entreprises-fermees.json'), JSON.stringify({ emails: [], espaces: ['ent-f9g0', 'ent-s1t2'], suspendus: ['ent-s1t2'], suspendusLe: {} }));
  /* `minFirestore` : le minimum que Firestore a CONFIRMÉ (voir `VERSION_SANS_FIREBASE`). Sans lui,
     aucune copie n'a lieu — c'est l'objet d'une section plus bas. */
  const VERSIONS = { min: 700, enLigne: 'enLigne', maj: 1, par: 'banc', minFirestore: 748 };
  fs.writeFileSync(path.join(banc, 'data', 'versions.json'), JSON.stringify(VERSIONS));
  const vap = webpush.generateVAPIDKeys();
  const MDP = 'mot-de-passe-du-banc-809';
  const CONFIG = { vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh(MDP) };
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify(CONFIG));
  fs.writeFileSync(path.join(banc, 'firebase-admin.json'), JSON.stringify({ client_email: 'banc@elan-gestion.iam.gserviceaccount.com', private_key: paire.privateKey }));

  /* Le document que la 695 d'ELAN aurait écrit : chiffré, compressé, signé de son auteur. */
  const DOC_A = { enc: crypto.randomBytes(900).toString('base64'), iv: 'aXYtZGUtYmFuYw==', salt: 'RUxBTi1HRVNUSU9OLXNhbHQtdjE=', z: 1,
    ts: 1727260000000, writer: 'dev-banc01', at: '2026-09-25T10:00:00.000Z', by: 'Prénom Nom', ver: '695', verNum: 695 };
  poserDoc('elan_teams', 'ent-a1b2', DOC_A);
  poserDoc('elan_teams', 'ent-d5e6', Object.assign({}, DOC_A, { enc: 'RE9DLUQtT1JJR0lOQUw=', writer: 'dev-banc0d' }));
  poserDoc('elan_teams', 'ent-m3n4', Object.assign({}, DOC_A, { enc: 'TUxUSQ==' }));
  poserDoc('elanB_teams', 'opgestion-beta', Object.assign({}, DOC_A, { enc: 'QkVUQQ==', ver: '747-beta', verNum: 747 }));
  poserDoc('elan_teams', 'ent-u1v2', Object.assign({}, DOC_A, { enc: 'TVVFVA==' }));
  poserDoc('elan_teams', 'ent-x5y6', Object.assign({}, DOC_A, { enc: 'QVRURU5URQ==' }));

  /* ══ 3. LE VRAI SERVEUR ═════════════════════════════════════════════════════════════════════ */
  const PORT = 8900 + (process.pid % 700);
  let journal = '';
  const demarrer = () => {
    enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
      env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: path.join(banc, 'data'), PORT: String(PORT),
        TEAMOP_FB_ADMIN: path.join(banc, 'firebase-admin.json'), TEAMOP_FB_OAUTH_URL: GURL + '/token', TEAMOP_FIRESTORE_URL: GURL,
        TEAMOP_DOC_ATTENTE_MS: '1500', TEAMOP_DOC_COPIE_MS: '2000' }),
      stdio: ['ignore', 'pipe', 'pipe'] });
    enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
  };
  const B = 'http://127.0.0.1:' + PORT;
  const pret = async () => { for (let i = 0; i < 100; i++) { try { const r = await fetch(B + '/health'); if (r.ok) return true; } catch (e) {} await dormir(100); } return false; };
  demarrer();
  vrai('le serveur démarre', await pret());
  const post = async (route, corps) => { const r = await fetch(B + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
    let j = null; const txt = await r.text(); try { j = JSON.parse(txt); } catch (e) {} return { s: r.status, j, txt }; };
  const postBrut = async (route, texte, jeton) => { const r = await fetch(B + route, { method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: texte });
    let j = null; const txt = await r.text(); try { j = JSON.parse(txt); } catch (e) {} return { s: r.status, j, txt }; };
  const tour = async () => { const co = await post('/api/monitor/login', { nom: 'Patron', pass: MDP }); return co.j && co.j.token; };
  const lire = t => post('/api/doc/lire', { t, kh: kh(E[t] || 'x') });
  const ecrire = (t, doc, fusion) => post('/api/doc/ecrire', { t, kh: kh(E[t] || 'x'), doc, fusion });
  const sante = async () => (await (await fetch(B + '/health')).json()).documents || {};
  const neuf = (x) => Object.assign({ enc: 'TkVVRg==', iv: 'aXY=', salt: 'c2Fs', z: 1, ts: Date.now(), writer: 'dev-x', at: new Date().toISOString(), by: 'X', ver: '748', verNum: 748 }, x || {});

  try {
    /* ── la santé ── */
    let s = await sante();
    v('/health : le rangement est monté, la copie depuis Firebase est active, aucun échec',
      [s.actif, s.copieFirebase, s.copiesEchec1h, s.illisibles1h, s.ecrituresEchec1h], [true, true, 0, 0, 0]);
    const h = await (await fetch(B + '/health')).json();
    v('   et aucune route n\'est déclarée deux fois', h.routesDoublons, 0);

    /* ── les portes ── */
    let r = await post('/api/doc/lire', { t: 'ent-a1b2' });
    v('sans preuve de clé : refusé', r.s, 403);
    r = await post('/api/doc/lire', { t: 'ent-a1b2', kh: kh('MAUVAISE') });
    v('mauvaise clé : refusé', r.s, 403);
    v('   et rien du document ne sort', r.txt.indexOf(DOC_A.enc.slice(0, 40)) < 0, true);
    r = await post('/api/doc/lire', { t: 'ent-inconnue', kh: kh('X') });
    v('espace inconnu : 404', r.s, 404);
    r = await lire('ent-p7q8');
    v('⛔ clé partagée (écrite en clair dans app.html) : 409, jamais servie', [r.s, r.j && r.j.motif], [409, 'cle_partagee']);
    r = await lire('elan-gestion');
    v('l\'espace de repli : refusé', r.s, 403);
    r = await lire('ent-f9g0');
    v('⛔ une entreprise FERMÉE : refusée', [r.s, r.j && r.j.motif], [403, 'ferme']);
    r = await lire('ent-s1t2');
    v('⛔ une entreprise SUSPENDUE travaille (décision du 20 septembre) : servie', r.s, 200);
    for (const mauvais of ['../ent-a1b2', 'a/b', 'ent-a1b2.json', '.cache', '']) {
      r = await post('/api/doc/lire', { t: mauvais, kh: kh('X') });
      v('nom d\'espace « ' + mauvais + ' » : refusé avant tout fichier', [400, 404].includes(r.s), true);
    }
    r = await post('/api/doc/lire', { t: 'opgestion-beta' });
    v('⛔ l\'espace de la bêta passe sans preuve, comme la règle elanB_teams', r.s, 200);
    v('   et sa copie vient de SA collection (elanB_teams), jamais de celle des entreprises',
      [r.j && r.j.doc && r.j.doc.enc, G.lectures['elanB_teams/opgestion-beta'] || 0, G.lectures['elan_teams/opgestion-beta'] || 0], ['QkVUQQ==', 1, 0]);

    /* ── 1. la copie est fidèle, gardée à part ── */
    r = await lire('ent-a1b2');
    v('⛔ première lecture : la copie depuis Firebase EST la version 1', [r.s, r.j && r.j.v], [200, 1]);
    v('⛔ champ pour champ identique au document de Firebase (nombres compris)', r.j && r.j.doc, DOC_A);
    const pf = path.join(banc, 'data', 'documents', 'ent-a1b2.firebase.json');
    let orig = null; try { orig = JSON.parse(fs.readFileSync(pf, 'utf8')); } catch (e) {}
    v('⛔ l\'original de Firebase est gardé À PART', orig && orig.champs, DOC_A);
    v('   avec la date de Firebase', orig && orig.majFirebase, '2026-09-25T10:00:00.123456Z');
    r = await lire('ent-a1b2');
    v('une seconde lecture ne redemande rien à Firebase', [r.j && r.j.v, G.lectures['elan_teams/ent-a1b2']], [1, 1]);

    /* ── 2. un échec de copie n'est jamais « vide » ── */
    G.panne = true;
    r = await lire('ent-c3d4');
    v('⛔ Firebase en panne : 503 « copie », JAMAIS une équipe vide', [r.s, r.j && r.j.motif, r.j && ('doc' in r.j)], [503, 'copie', false]);
    s = await sante();
    v('   et la santé le dit (échec récent compté)', s.copiesEchec1h >= 1, true);
    r = await ecrire('ent-c3d4', neuf());
    v('⛔ … et une écriture sur cette place vide est refusée aussi — elle écraserait l\'équipe', [r.s, r.j && r.j.motif], [503, 'copie']);
    G.panne = false;
    r = await lire('ent-c3d4');
    v('Firebase revenu, rien chez lui (404) : là, c\'est une équipe VRAIMENT neuve', [r.s, r.j], [200, { v: 0, doc: null }]);

    /* ── 3. une écriture sur une place vide attend la copie ── */
    r = await ecrire('ent-d5e6', neuf({ enc: 'RUNSSVRVUkUtRA==' }));
    v('⛔ écrire AVANT d\'avoir lu : la copie de Firebase passe d\'abord (version 1), l\'écriture est la 2', [r.s, r.j && r.j.v], [200, 2]);
    let od = null; try { od = JSON.parse(fs.readFileSync(path.join(banc, 'data', 'documents', 'ent-d5e6.firebase.json'), 'utf8')); } catch (e) {}
    v('   et l\'original de Firebase est gardé, pas l\'écriture', od && od.champs && od.champs.enc, 'RE9DLUQtT1JJR0lOQUw=');
    r = await lire('ent-d5e6');
    v('   la lecture rend l\'écriture', r.j && r.j.doc && r.j.doc.enc, 'RUNSSVRVUkUtRA==');
    let prec = null; try { prec = JSON.parse(fs.readFileSync(path.join(banc, 'data', 'documents', 'ent-d5e6.prec.json'), 'utf8')); } catch (e) {}
    v('   la version d\'avant est gardée (.prec)', prec && prec.v, 1);

    /* ── les formes refusées ── */
    r = await ecrire('ent-a1b2', Object.assign(neuf(), { pirate: 'x' }));
    v('champ inconnu : 400', [r.s, r.j && r.j.motif], [400, 'forme']);
    r = await ecrire('ent-a1b2', { iv: 'a', salt: 'b', verNum: 748 });
    v('document sans contenu chiffré : 400', r.s, 400);
    r = await ecrire('ent-a1b2', Object.assign(neuf(), { verNum: undefined }));
    v('sans verNum : 400', r.s, 400);
    r = await ecrire('ent-a1b2', neuf({ verNum: 695, ver: '695' }));
    v('⛔ sous la version minimale (la règle Firestore versionOk) : 426', [r.s, r.j && r.j.motif, r.j && r.j.min], [426, 'version', 700]);
    r = await ecrire('ent-a1b2', neuf({ enc: 'A'.repeat(5600000) }));
    v('trop lourd : refusé avant d\'être rangé', [413].includes(r.s) || r.s === 413, true);
    r = await ecrire('ent-a1b2', { ver: '748', verNum: 748, enc: 'x' }, true);
    v('une fusion ne porte que la version', r.s, 400);
    r = await lire('ent-a1b2');
    v('⛔ aucun refus n\'a touché le document', [r.j && r.j.v, r.j && r.j.doc && r.j.doc.enc], [1, DOC_A.enc]);

    /* ── la fusion de version (`set({ver,verNum},{merge:true})`) ── */
    r = await ecrire('ent-a1b2', { ver: '748', verNum: 748 }, true);
    v('fusion de version : une nouvelle version', [r.s, r.j && r.j.v], [200, 2]);
    r = await lire('ent-a1b2');
    v('   qui garde le contenu et change seulement la version', [r.j.doc.enc === DOC_A.enc, r.j.doc.ver, r.j.doc.verNum, r.j.doc.writer], [true, '748', 748, 'dev-banc01']);
    r = await ecrire('ent-a1b2', { ver: '748', verNum: 748 }, true);
    v('⛔ la même fusion une seconde fois ne fait PAS de version (sinon chaque démarrage réveille tout le monde)', [r.j && r.j.v, r.j && r.j.inchange], [2, true]);

    /* ── 5. l'écoute ── */
    const attendre = (t, vv, signal) => fetch(B + '/api/doc/attendre', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ t, kh: kh(E[t]), v: vv }), signal }).then(x => x.json());
    let t0 = Date.now();
    let a = await attendre('ent-a1b2', 1);
    v('en retard d\'une version : rendu tout de suite, avec le document', [a.v, !!a.doc, Date.now() - t0 < 1000], [2, true, true]);
    t0 = Date.now();
    const enVol = attendre('ent-a1b2', 2);
    await dormir(300);
    const ecrit = await ecrire('ent-a1b2', neuf({ enc: 'UkVWRUlM' }));
    a = await enVol;
    v('⛔ une écriture RÉVEILLE l\'appareil à l\'écoute, avec le nouveau document', [ecrit.j && ecrit.j.v, a.v, a.doc && a.doc.enc], [3, 3, 'UkVWRUlM']);
    v('   tout de suite, pas au bout de l\'attente', Date.now() - t0 < 1400, true);
    t0 = Date.now();
    a = await attendre('ent-a1b2', 3);
    v('sans écriture : rendu au bout de l\'attente, « inchangé »', [a.v, a.inchange, Date.now() - t0 >= 1400], [3, true, true]);
    const ctl = new AbortController();
    const abandon = attendre('ent-a1b2', 3, ctl.signal).catch(() => 'abandonnée');
    await dormir(200); ctl.abort();
    v('une écoute abandonnée (onglet fermé) ne casse rien', await abandon, 'abandonnée');
    r = await lire('ent-a1b2');
    v('   le serveur répond toujours', r.s, 200);

    /* ── 4. une seule copie sous dix lectures simultanées ── */
    const dix = await Promise.all(Array.from({ length: 10 }, () => lire('ent-m3n4')));
    v('⛔ dix lectures en même temps sur une place vide : UNE seule copie depuis Firebase', G.lectures['elan_teams/ent-m3n4'], 1);
    v('   et toutes rendent la version 1', dix.map(x => x.j && x.j.v), Array(10).fill(1));

    /* ── 5 bis. aucune écriture concurrente ne se perd ── */
    G.docs['elan_teams/ent-r5s6'] = undefined;
    const vingt = await Promise.all(Array.from({ length: 20 }, (_, i) => ecrire('ent-r5s6', neuf({ enc: 'RUNSSVQ' + i }))));
    v('⛔ vingt écritures simultanées : vingt versions distinctes, aucune perdue', vingt.map(x => x.j && x.j.v).sort((x, y) => x - y), Array.from({ length: 20 }, (_, i) => i + 1));
    r = await lire('ent-r5s6');
    v('   la dernière rangée est celle qu\'on lit', r.j && r.j.v, 20);

    /* ── le budget PAR IP a son propre seau ── */
    const rafale = await Promise.all(Array.from({ length: 150 }, () => lire('ent-a1b2')));
    v('⛔ 150 lectures en une minute depuis une seule IP (un bureau entier) : aucun 429', rafale.filter(x => x.s === 429).length, 0);

    /* ── C5 : un nom hérité d'Object.prototype n'est pas un champ (`gardien`, mesuré : rangés) ── */
    {
      const avant = (await lire('ent-a1b2')).j;
      const refuses = [];
      for (const k of ['toString', 'constructor', 'valueOf', 'hasOwnProperty', '__proto__']) {
        const texte = JSON.stringify({ t: 'ent-a1b2', kh: kh(E['ent-a1b2']), doc: neuf() }).replace('"verNum":748', '"verNum":748,"' + k + '":"x"');
        const rr = await postBrut('/api/doc/ecrire', texte);
        refuses.push(rr.s + ':' + (rr.j && rr.j.motif));
      }
      v('⛔ toString, constructor, valueOf, hasOwnProperty, __proto__ : refusés comme champs inconnus', refuses, Array(5).fill('400:forme'));
      const apres = (await lire('ent-a1b2')).j;
      v('   et le document n\'a pas bougé', [apres.v, apres.doc.enc], [avant.v, avant.doc.enc]);
    }

    /* ── B1 : la bêta retrouve les bornes de Firestore — un anonyme ne gèle plus le serveur ── */
    r = await post('/api/doc/ecrire', { t: 'opgestion-beta', doc: neuf({ enc: 'B'.repeat(1100000) }) });
    v('⛔ la bêta (sans preuve) : au-delà d\'1 Mio, refusé — la limite qu\'elle vivait chez Firestore', [r.s, r.j && r.j.max], [413, 1048576]);
    r = await ecrire('ent-a1b2', neuf({ enc: 'E'.repeat(1100000) }));
    v('   une entreprise, elle, garde sa place (5,5 Mo)', r.s, 200);
    r = await post('/api/doc/ecrire', { t: 'opgestion-beta', doc: neuf({ enc: 'B'.repeat(900000) }) });
    v('   en dessous d\'1 Mio, la bêta écrit', r.s, 200);
    {
      const vBeta = r.j && r.j.v;
      const attB = () => fetch(B + '/api/doc/attendre', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t: 'opgestion-beta', v: vBeta }) }).then(x => x.json()).catch(() => null);
      const trente = []; for (let i = 0; i < 30; i++) trente.push(attB());
      await dormir(300);
      t0 = Date.now();
      const trenteEtUn = await attB();
      v('⛔ la bêta : 30 attentes au plus — la 31ᵉ répond tout de suite, « inchangé »', [trenteEtUn && trenteEtUn.inchange, Date.now() - t0 < 700], [true, true]);
      t0 = Date.now();
      r = await post('/api/doc/ecrire', { t: 'opgestion-beta', doc: neuf({ enc: 'C'.repeat(900000) }) });
      const tEcr = Date.now() - t0;
      const rendus = await Promise.all(trente);
      v('   une écriture les réveille toutes, avec le même document', rendus.filter(x => x && x.doc && x.doc.enc && x.doc.enc.length === 900000 && x.doc.enc[0] === 'C').length, 30);
      vrai('   sans geler le serveur (' + tEcr + ' ms)', tEcr < 1500);
    }

    /* ── C1 : un Firebase qui se tait après ses en-têtes ne verrouille plus l'entreprise ── */
    G.muet = true;
    t0 = Date.now();
    const pendue = lire('ent-u1v2');
    await dormir(200);
    {
      const tA = Date.now(); r = await lire('ent-a1b2');
      v('   pendant ce temps, une AUTRE entreprise répond', [r.s, Date.now() - tA < 1000], [200, true]);
    }
    r = await pendue;
    v('⛔ Firebase muet après ses en-têtes : la copie abandonne à son délai (503 « copie »), elle ne pend pas',
      [r.s, r.j && r.j.motif, Date.now() - t0 < 4500], [503, 'copie', true]);
    G.muet = false; G.pendus.forEach(x => { try { x.destroy(); } catch (e) {} }); G.pendus = [];
    r = await lire('ent-u1v2');
    v('   et l\'entreprise n\'est pas restée verrouillée : Firebase revenu, la copie passe', [r.s, r.j && r.j.v, r.j && r.j.doc && r.j.doc.enc], [200, 1, 'TVVFVA==']);

    /* ── C2 : un 404 de Google qui ne nomme pas le document ne fait pas une équipe neuve ── */
    G.base404 = true;
    r = await lire('ent-v3w4');
    v('⛔ « la base n\'existe pas » (404 sans document) : 503, JAMAIS une équipe neuve', [r.s, r.j && r.j.motif, !!(r.j && ('doc' in r.j))], [503, 'copie', false]);
    r = await ecrire('ent-v3w4', neuf());
    v('   et une écriture ne s\'y range pas', [r.s, fs.existsSync(path.join(banc, 'data', 'documents', 'ent-v3w4.json'))], [503, false]);
    G.base404 = false;
    r = await lire('ent-v3w4');
    v('   le vrai « document absent » de Firestore, lui, dit « neuve »', [r.s, r.j], [200, { v: 0, doc: null }]);

    /* ── C3 : l'inventaire d'avant l'extinction, réservé au patron ── */
    r = await post('/api/monitor/documents/inventaire', {});
    v('l\'inventaire sans session de Tour : refusé', [401, 403].includes(r.s), true);
    const JT = await tour();
    vrai('le patron ouvre une session de Tour', JT);
    r = await postBrut('/api/monitor/documents/inventaire', '{}', JT);
    v('⛔ l\'inventaire : complet, chaque entreprise de l\'annuaire vue (fermées et repli mises de côté)',
      [r.s, r.j && r.j.complet, r.j && r.j.entreprises, r.j && r.j.echecs, r.j && (r.j.documents + r.j.absents + r.j.ignores)], [200, true, 12, 0, 12]);
    {
      let inv = null; try { inv = JSON.parse(fs.readFileSync(path.join(banc, 'data', 'documents', 'inventaire.json'), 'utf8')); } catch (e) {}
      v('   et il le range : un document, une absente, une fermée, le repli',
        inv && [inv.espaces['ent-a1b2'], inv.espaces['ent-c3d4'], inv.espaces['ent-f9g0'], inv.espaces['elan-gestion']], ['document', 'absent', 'ignore', 'ignore']);
      v('   une entreprise fermée n\'a PAS été recopiée chez nous', fs.existsSync(path.join(banc, 'data', 'documents', 'ent-f9g0.json')), false);
    }
    v('   la copie reste active tant que le réglage ne dit pas le contraire', (await sante()).copieFirebase, true);

    /* ── aucune donnée de client au journal ── */
    v('⛔ le journal du serveur ne nomme aucun espace', /ent-a1b2|ent-d5e6|ent-m3n4|ent-r5s6|ent-u1v2|ent-v3w4|ent-x5y6/.test(journal), false);
    v('   ni l\'auteur d\'un document', /Prénom Nom/.test(journal), false);
    v('   la copie, elle, s\'y dit (sans nom)', /document d'équipe copié depuis Firebase/.test(journal), true);
    v('le faux Google n\'a refusé aucun jeton (la signature est la vraie)', G.jetonsRefuses, 0);

    /* ── le redémarrage : `.prec` et le fichier illisible ── */
    enfant.kill('SIGKILL'); await dormir(300);
    const dossier = path.join(banc, 'data', 'documents');
    fs.unlinkSync(path.join(dossier, 'ent-d5e6.json'));                     // un arrêt ENTRE les deux renommages
    fs.writeFileSync(path.join(dossier, 'ent-a1b2.json'), '{"v":4,"doc":');  // un fichier tronqué, sa version d'avant intacte
    fs.writeFileSync(path.join(dossier, 'ent-m3n4.json'), '{"v":1,"doc":');  // tronqué, et AUCUNE version d'avant
    demarrer(); vrai('le serveur redémarre', await pret());
    r = await lire('ent-d5e6');
    v('⛔ arrêt entre les deux renommages : la version d\'avant (.prec) est servie, pas une équipe vide', [r.s, r.j && r.j.v], [200, 1]);
    v('   et Firebase n\'a PAS été relu (la place n\'était pas vide)', G.lectures['elan_teams/ent-d5e6'], 1);
    r = await lire('ent-a1b2');
    /* ⛔ `gardien` N5 : refuser (503) arrêtait la synchro de TOUTE l'entreprise jusqu'à ce que
       quelqu'un répare le disque. La version d'avant est servie ; l'appareil qui a fait la
       dernière écriture la porte encore et la fusionnera. */
    v('⛔ un fichier abîmé : la version d\'avant (.prec) est servie — jamais une équipe vide ni une recopie de Firebase',
      [r.s, r.j && r.j.v, r.j && r.j.doc && r.j.doc.enc, G.lectures['elan_teams/ent-a1b2']], [200, 3, 'UkVWRUlM', 1]);
    r = await lire('ent-m3n4');
    v('⛔ abîmé SANS version d\'avant : 503 « illisible », jamais une équipe vide ni une recopie', [r.s, r.j && r.j.motif, G.lectures['elan_teams/ent-m3n4']], [503, 'illisible', 1]);
    s = await sante();
    v('   et la santé le dit', s.illisibles1h >= 1, true);
    r = await ecrire('ent-a1b2', neuf({ enc: 'QVBSRVM=' }));
    v('   une écriture repart de la version servie', [r.s, r.j && r.j.v], [200, 4]);

    /* ── N6 : un annuaire illisible rend 503, jamais « espace inconnu » ── */
    enfant.kill('SIGKILL'); await dormir(300);
    const annuairePath = path.join(banc, 'data', 'espaces.json');
    const annuaireBon = fs.readFileSync(annuairePath, 'utf8');
    fs.writeFileSync(annuairePath, '{"ent-a":');
    demarrer(); vrai('le serveur redémarre sur un annuaire abîmé', await pret());
    r = await lire('ent-u1v2');
    v('⛔ annuaire illisible : 503 « annuaire », JAMAIS « espace inconnu » (que les appareils prenaient pour un refus)', [r.s, r.j && r.j.motif], [503, 'annuaire']);
    r = await post('/api/doc/lire', { t: 'opgestion-beta' });
    v('   la bêta, qui ne dépend pas de l\'annuaire, travaille', r.s, 200);

    /* ── C3 : « copieFirebase:false » n'est suivi qu'avec un inventaire complet ── */
    enfant.kill('SIGKILL'); await dormir(300);
    fs.writeFileSync(annuairePath, annuaireBon);
    const invPath = path.join(banc, 'data', 'documents', 'inventaire.json');
    const invBon = fs.readFileSync(invPath, 'utf8');
    fs.unlinkSync(invPath);
    fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify(Object.assign({}, CONFIG, { documents: { copieFirebase: false } })));
    journal = '';
    demarrer(); vrai('le serveur redémarre : copie coupée par le réglage, SANS inventaire', await pret());
    v('⛔ sans inventaire complet, « copieFirebase:false » est ignoré — la copie reste active', (await sante()).copieFirebase, true);
    vrai('   et le journal le dit', /copieFirebase:false IGNORÉ/.test(journal));
    enfant.kill('SIGKILL'); await dormir(300);
    fs.writeFileSync(invPath, invBon);
    {
      /* Une entreprise inscrite APRÈS l'inventaire (donc jamais chez Google : les v748 n'y écrivent
         plus), et une que l'inventaire a vue AVEC un document mais qui n'a plus de fichier ici. */
      const annu = JSON.parse(annuaireBon); E['ent-w7z8'] = 'CLE-DE-W-QWZX';
      annu['entw'] = { slug: 'entw', nom: 'ent-w', email: 'ent-w@exemple.fr', t: 'ent-w7z8', code: b64({ t: 'ent-w7z8', k: E['ent-w7z8'] }), ts: 13 };
      fs.writeFileSync(annuairePath, JSON.stringify(annu));
      for (const suf of ['', '.prec', '.firebase']) { try { fs.unlinkSync(path.join(dossier, 'ent-u1v2' + suf + '.json')); } catch (e) {} }
    }
    demarrer(); vrai('le serveur redémarre : copie coupée, inventaire complet', await pret());
    v('⛔ avec l\'inventaire complet, la copie est vraiment coupée', (await sante()).copieFirebase, false);
    r = await lire('ent-w7z8');
    v('   une entreprise inscrite après l\'inventaire est neuve — sans rien demander à Google', [r.s, r.j, G.lectures['elan_teams/ent-w7z8'] || 0], [200, { v: 0, doc: null }, 0]);
    r = await lire('ent-c3d4');
    v('   une entreprise que l\'inventaire a vue absente de Firebase : neuve', [r.s, r.j && r.j.v], [200, 0]);
    {
      const lu = G.lectures['elan_teams/ent-u1v2'];
      r = await lire('ent-u1v2');
      v('⛔ vue AVEC un document par l\'inventaire, et plus de fichier ici : 503, jamais neuve', [r.s, r.j && r.j.motif, G.lectures['elan_teams/ent-u1v2']], [503, 'copie', lu]);
    }

    /* ── C4 : la copie attend que la porte de version soit fermée CHEZ GOOGLE ── */
    enfant.kill('SIGKILL'); await dormir(300);
    fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify(CONFIG));
    fs.writeFileSync(path.join(banc, 'data', 'versions.json'), JSON.stringify({ min: 700, enLigne: 'enLigne', maj: 1, par: 'banc' }));
    for (const tt of ['ent-x5y6', 'opgestion-beta']) for (const suf of ['', '.prec', '.firebase']) { try { fs.unlinkSync(path.join(dossier, tt + suf + '.json')); } catch (e) {} }
    demarrer(); vrai('le serveur redémarre, sans minimum confirmé chez Firestore', await pret());
    {
      const lx = G.lectures['elan_teams/ent-x5y6'] || 0;
      r = await lire('ent-x5y6');
      v('⛔ tant que Firestore n\'a pas confirmé la v748 minimum, la copie attend (503 « attente_version ») — une v695 pourrait encore y écrire',
        [r.s, r.j && r.j.motif, G.lectures['elan_teams/ent-x5y6'] || 0], [503, 'attente_version', lx]);
    }
    r = await ecrire('ent-x5y6', neuf());
    v('   une écriture non plus', [r.s, r.j && r.j.motif], [503, 'attente_version']);
    v('   et la santé le compte, pour la surveillance', (await sante()).copiesEnAttente1h >= 1, true);
    r = await post('/api/doc/lire', { t: 'opgestion-beta' });
    v('   la bêta n\'attend pas : elle précède toujours la production', [r.s, r.j && r.j.doc && r.j.doc.enc], [200, 'QkVUQQ==']);
    {
      const JT2 = await tour();
      G.patch = 500;
      r = await postBrut('/api/monitor/version-min', JSON.stringify({ min: 748 }), JT2);
      v('la Tour exige la v748, mais Firestore refuse l\'envoi', [r.s, r.j && r.j.firestore && r.j.firestore.fait], [200, false]);
      r = await lire('ent-x5y6');
      v('⛔ un minimum que Firestore n\'a PAS confirmé n\'ouvre pas la copie', [r.s, r.j && r.j.motif], [503, 'attente_version']);
      G.patch = 200;
      r = await postBrut('/api/monitor/version-min', JSON.stringify({ min: 748 }), JT2);
      v('la Tour exige la v748, Firestore confirme', [r.s, r.j && r.j.firestore && r.j.firestore.fait, G.patchs.filter(x => x === 'teamop_config/version').length], [200, true, 2]);
      let vers = null; try { vers = JSON.parse(fs.readFileSync(path.join(banc, 'data', 'versions.json'), 'utf8')); } catch (e) {}
      v('   et le minimum CONFIRMÉ est gardé à part', vers && [vers.min, vers.minFirestore], [748, 748]);
      r = await lire('ent-x5y6');
      v('⛔ alors seulement, la copie passe', [r.s, r.j && r.j.v, r.j && r.j.doc && r.j.doc.enc], [200, 1, 'QVRURU5URQ==']);
    }
  } catch (e) { ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }
  try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {}

  /* ══ 4. LE MODULE SEUL : L'EFFACEMENT (fermer, supprimer, repartir à neuf) ══════════════════ */
  {
    const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'b809m-'));
    const app2 = express(); app2.use(express.json({ limit: '6mb' }));
    const q2 = new Map();
    const mod = require(path.join(RACINE, 'server', 'documents.js')).monterDocuments(app2, {
      DATA_DIR: dir2, config: {}, monStr: (x, n) => String(x == null ? '' : x).slice(0, n),
      sauvRefus: () => null, cleEstPublique: () => false, versionMin: () => 0, versionFirestore: () => 748,
      quotaOk: (m, k, max) => { const n = (m.get(k) || 0) + 1; m.set(k, n); return n <= max; },
      fbLireDocument: async () => ({ existe: true, champs: { enc: 'T1JJRw==', iv: 'aQ==', salt: 'cw==', verNum: 695 } }) });
    const srv2 = await new Promise(res => { const s2 = app2.listen(0, '127.0.0.1', () => res(s2)); });
    const B2 = 'http://127.0.0.1:' + srv2.address().port;
    const p2 = (route, corps) => fetch(B2 + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) }).then(x => x.json());
    await p2('/api/doc/lire', { t: 'ent-z', kh: 'x' });
    const fichiers = () => fs.readdirSync(path.join(dir2, 'documents')).filter(f => f.startsWith('ent-z')).sort();
    v('avant : le document et l\'original de Firebase sont rangés', fichiers(), ['ent-z.firebase.json', 'ent-z.json']);
    const ecoute = p2('/api/doc/attendre', { t: 'ent-z', kh: 'x', v: 1 });
    await dormir(100);
    fs.writeFileSync(path.join(dir2, 'documents', 'ent-z.json.tmp-123-abcd'), '{"v":');   // le reste d'une écriture interrompue
    v('⛔ effacer rend vrai', await mod.effacer('ent-z'), true);
    v('⛔ et plus rien ne reste — ni le document, ni l\'original, ni la version d\'avant', fichiers(), []);
    const rendu = await ecoute;
    v('   l\'appareil qui écoutait est relâché tout de suite', rendu && rendu.inchange, true);
    v('un nom dangereux ne peut rien effacer', [await mod.effacer('../documents'), await mod.effacer('')], [false, false]);
    /* ⛔ ICI LA GARDE DU NOM EST SEULE. Sur le vrai serveur, `sauvRefus` refuse d'abord tout espace
       inconnu — la mutation « nom non contrôlé » y passait donc SANS RIEN CASSER (mesuré : 68 ✓).
       Mais deux chemins ne passent pas par `sauvRefus` : les espaces techniques, et `effacer`,
       appelé par les portes de la Tour. On retire donc la première garde (`sauvRefus` rend `null`
       dans ce module de banc) et on regarde ce que fait un nom qui SORT du dossier. */
    fs.writeFileSync(path.join(dir2, 'victime.json'), '{"a":1}');
    const hors = await fetch(B2 + '/api/doc/lire', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ t: '../victime', kh: 'x' }) });
    v('⛔ « ../victime » : refusé (400) avant de toucher un fichier', hors.status, 400);
    v('⛔ effacer(« ../victime ») ne sort pas du dossier', [await mod.effacer('../victime'), fs.existsSync(path.join(dir2, 'victime.json'))], [false, true]);
    const ailleurs = fs.readdirSync(dir2).filter(f => f !== 'documents' && f !== 'victime.json');
    v('   et rien n\'a été écrit hors du dossier des documents', ailleurs, []);
    srv2.close(); try { fs.rmSync(dir2, { recursive: true, force: true }); } catch (e) {}
  }

  /* ══ 5. LE MODULE SEUL : CE QUE LE VRAI SERVEUR NE PEUT PAS MONTRER ═══════════════════════════ */
  {
    const dir3 = fs.mkdtempSync(path.join(os.tmpdir(), 'b809n-'));
    const app3 = express(); app3.use(express.json({ limit: '6mb' }));
    const fermes = new Set(); let lenteur = 0;
    const mod3 = require(path.join(RACINE, 'server', 'documents.js')).monterDocuments(app3, {
      DATA_DIR: dir3, config: {}, monStr: (x, n) => String(x == null ? '' : x).slice(0, n),
      sauvRefus: (t) => fermes.has(t) ? { code: 403, error: 'espace fermé' } : null, cleEstPublique: () => false, versionMin: () => 0,
      versionFirestore: () => 748,
      quotaOk: () => true,
      fbLireDocument: async () => { if (lenteur) await dormir(lenteur); return { existe: true, champs: { enc: 'T1JJRw==', iv: 'aQ==', salt: 'cw==', verNum: 695 } }; } });
    const srv3 = await new Promise(res => { const s3 = app3.listen(0, '127.0.0.1', () => res(s3)); });
    const B3 = 'http://127.0.0.1:' + srv3.address().port;
    const p3 = (route, corps) => fetch(B3 + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
      .then(async x => ({ s: x.status, j: await x.json().catch(() => null) }));
    const fich = (t) => fs.readdirSync(path.join(dir3, 'documents')).filter(f => f.startsWith(t + '.')).sort();
    const docN = (x) => ({ enc: x, iv: 'aQ==', salt: 'cw==', z: 1, ts: 1, writer: 'w', at: 'a', by: 'b', ver: '748', verNum: 748 });

    /* ── C6 : fermer PENDANT une copie lente ne laisse rien renaître ── */
    lenteur = 600;
    const pl = p3('/api/doc/lire', { t: 'ent-y', kh: 'x' });                 // la copie tient le verrou
    await dormir(100);
    const pe = p3('/api/doc/ecrire', { t: 'ent-y', kh: 'x', doc: docN('RUNSSVQ=') });   // en file derrière elle
    await dormir(100);
    fermes.add('ent-y');                                                     // la Tour ferme l'entreprise…
    const ef = mod3.effacer('ent-y');                                        // …et efface
    const [rl, re, rf] = await Promise.all([pl, pe, ef]);
    lenteur = 0;
    v('⛔ fermée pendant sa copie : l\'écriture en file est refusée par la porte, revérifiée sous le verrou', [re.s, re.j && re.j.motif], [403, 'ferme']);
    v('⛔ et rien ne renaît — ni le document, ni l\'original, ni une version d\'avant', fich('ent-y'), []);
    vrai('   (la lecture en cours a pu finir ; l\'effacement est passé APRÈS elle)', [200, 403].includes(rl.s) && rf === true);

    /* ── B1 : la réponse s'encode UNE fois, quel que soit le nombre d'appareils à l'écoute ── */
    let r3 = await p3('/api/doc/ecrire', { t: 'ent-b', kh: 'x', doc: docN('Z'.repeat(400000)) });
    const vB = r3.j && r3.j.v;
    const vingt = Array.from({ length: 20 }, () => p3('/api/doc/attendre', { t: 'ent-b', kh: 'x', v: vB }));
    await dormir(300);
    const JS = JSON.stringify; let gros = 0;
    JSON.stringify = function () { const o = JS.apply(this, arguments); if (typeof o === 'string' && o.length > 300000) gros++; return o; };
    /* Et on compte les fois où la notification REND LA MAIN (`paquet`, par `setImmediate`) : d'un
       seul bloc, 200 appareils à 5,4 Mo gelaient encore le serveur 4,4 s — mesuré par
       `scratchpad/mesure-b1.js` (0,53 s en paquets). */
    const SI = global.setImmediate; let rendus = 0;
    global.setImmediate = function (f) { if (typeof f === 'function' && /paquet\(/.test(String(f))) rendus++; return SI.apply(this, arguments); };
    try { r3 = await p3('/api/doc/ecrire', { t: 'ent-b', kh: 'x', doc: docN('Y'.repeat(400000)) }); await Promise.all(vingt); }
    finally { JSON.stringify = JS; global.setImmediate = SI; }
    const recus = await Promise.all(vingt);
    v('vingt appareils à l\'écoute reçoivent le nouveau document', recus.filter(x => x.j && x.j.doc && x.j.doc.enc[0] === 'Y').length, 20);
    /* Mesure, taille, rangement sur disque, encodage de la réponse : quatre au plus. L'ancien code en
       faisait vingt-trois — une par appareil, plus l'empreinte d'Express à chaque fois. */
    vrai('⛔ et le document n\'est encodé qu\'UNE fois pour eux tous (' + gros + ' encodages de plus de 300 Ko, pour 20 appareils)', gros <= 4);
    v('⛔ et la notification rend la main entre ses paquets (20 appareils, paquets de 8 : 2 fois)', rendus, 2);
    const cache = mod3._pourBanc.corps.get('ent-b');
    v('   le même tampon sert aussi la lecture suivante', [!!cache, cache && cache.e === mod3._pourBanc.memo.get('ent-b')], [true, true]);

    srv3.close(); try { fs.rmSync(dir3, { recursive: true, force: true }); } catch (e) {}
  }

  /* ══ 6. LES ADRESSES DE BANC NE VISENT QUE 127.0.0.1 (`gardien`, N3) ══════════════════════════
     Une fonction pure, prise dans le fichier réel : posée par erreur sur le VPS, une adresse de
     banc recevrait une assertion signée, ou le jeton d'administration lui-même. */
  {
    const SRV = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
    const ligne = (SRV.match(/^const urlBanc = [^\n]+$/m) || [''])[0];
    vrai('urlBanc existe dans le serveur', ligne.length > 20);
    const urlBanc = new Function(ligne + '\nreturn urlBanc;')();
    const D = 'https://defaut';
    v('⛔ seules les adresses http://127.0.0.1:<port> sont prises',
      ['http://127.0.0.1:8080', 'http://127.0.0.1:8080/token', 'https://evil.example/token', 'http://127.0.0.1.evil.example:80/', 'http://localhost:8080', 'http://127.0.0.1@evil.example/', undefined, '']
        .map(u => urlBanc(u, D) === D ? 'défaut' : 'pris'),
      ['pris', 'pris', 'défaut', 'défaut', 'défaut', 'défaut', 'défaut', 'défaut']);
    v('   et les deux variables passent par elle', [/FB_OAUTH_URL = urlBanc\(process\.env\.TEAMOP_FB_OAUTH_URL/.test(SRV), /FIRESTORE_URL = urlBanc\(process\.env\.TEAMOP_FIRESTORE_URL/.test(SRV),
      (SRV.match(/process\.env\.TEAMOP_(FB_OAUTH|FIRESTORE)_URL/g) || []).length], [true, true, 2]);
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); });
