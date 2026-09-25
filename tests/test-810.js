/* ⛔ CE QUE CE FICHIER GARDE — L'ADAPTATEUR DE LA PAGE, FACE AU VRAI SERVEUR.

   Décision de Justin, 25 septembre 2026 : « quand j'envoie la mise à jour, Firebase est
   supprimé ». La synchro d'OP GESTION parle désormais à `server/documents.js` par `docEquipe()`
   (app.html), qui offre les trois gestes que la synchro faisait à Firestore : `get`, `set`,
   `onSnapshot`. `test-809` garde le serveur ; ce banc-ci garde la COUTURE — la règle de
   `CLAUDE.md` : « dès qu'app.html appelle une route neuve, un banc doit faire parler la VRAIE
   fonction de la page au VRAI serveur ». Le 20 septembre, trois coutures justes de chaque côté
   ne se parlaient pas ; relire les deux moitiés ne suffit pas.

   ⛔ ON EXTRAIT LES VRAIES FONCTIONS D'app.html — pas une copie — et on les exécute contre
   `server/index.js` lancé à part, isolé, avec un Firebase de banc sur 127.0.0.1.
   ⚠️ Mesuré au navigateur, deux appareils, en plus de ce banc :
   `scratchpad/sonde-doc-serveur.js` (19 ✓ trois fois ; A → B en ~0,9 s, retour du réseau ~2,7 s). */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), http = require('http'), net = require('net');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b810-'));
let enfant = null, faux = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { if (faux) faux.close(); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 170 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 170000).unref();

console.log('\n── 810 · l\'adaptateur de la page (docEquipe) face au vrai serveur ──');

/* ══ 1. EXTRAIRE LE BLOC DE LA PAGE ════════════════════════════════════════════════════════ */
const bloc = (sig) => { const i = SRC.indexOf(sig); if (i < 0) return '';
  let d = 0, f = -1; for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}') { d--; if (!d) { f = k + 1; break; } } } return SRC.slice(i, f); };
const morceaux = ['async function docPreuve(', 'function docErreur(', 'async function docAppel(', 'function docRefusVu(', 'function docInstantane(', 'function docEquipe('].map(bloc);
v('les six fonctions de l\'adaptateur existent dans la page', morceaux.map(m => m.length > 20), [true, true, true, true, true, true]);
/* ⛔ ET LE DÉMARRAGE DE LA SYNCHRO S'EN SERT — sans quoi l'adaptateur serait un code mort qui a
   l'air d'une sortie de Firebase. On découpe `syncInit` et on regarde ce qu'il FAIT, commentaires
   retirés : il pose `_fbDoc=docEquipe()`, et ne charge plus ni le SDK ni la session anonyme. */
const init = bloc('async function syncInit(').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
vrai('⛔ syncInit pose _fbDoc=docEquipe()', /_fbDoc\s*=\s*docEquipe\(\)/.test(init));
v('⛔ syncInit ne charge plus Firebase (ni SDK, ni session, ni Firestore)', ['loadFirebase(', 'syncAuth(', 'fbApp(', '.firestore(', "collection('elan_teams')", "collection('teamop_config')"].filter(x => init.indexOf(x) >= 0), []);

(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … partie exécutée SAUTÉE : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }

  /* ══ 2. FIREBASE DE BANC ET VRAI SERVEUR ═══════════════════════════════════════════════════ */
  const paire = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
  const G = { docs: {}, panne: false, lectures: 0 };
  const champ = x => typeof x === 'number' ? { integerValue: String(x) } : { stringValue: String(x) };
  const poserDoc = (t, o) => { const f = {}; for (const k of Object.keys(o)) f[k] = champ(o[k]); G.docs['elan_teams/' + t] = { fields: f, updateTime: '2026-09-25T09:00:00Z' }; };
  faux = http.createServer((q, r) => { let c = ''; q.on('data', d => { c += d; }); q.on('end', () => {
    if (q.method === 'POST' && q.url === '/token') { r.writeHead(200, { 'Content-Type': 'application/json' }); return r.end('{"access_token":"jeton-810","expires_in":3600}'); }
    const m = /documents\/([^/]+)\/([^/?]+)$/.exec(q.url);
    if (q.method === 'GET' && m) { G.lectures++; if (G.panne) { r.writeHead(503); return r.end('{}'); }
      const d = G.docs[decodeURIComponent(m[1]) + '/' + decodeURIComponent(m[2])];
      if (!d) { r.writeHead(404); return r.end('{}'); } r.writeHead(200, { 'Content-Type': 'application/json' }); return r.end(JSON.stringify(d)); }
    r.writeHead(404); r.end(); }); });
  await new Promise(res => faux.listen(0, '127.0.0.1', res));
  const GURL = 'http://127.0.0.1:' + faux.address().port;

  const kh = k => crypto.createHash('sha256').update(k).digest('hex');
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
  const E = {}, annuaire = {};
  const inscrire = (slug, t, k, ts) => { E[t] = k; annuaire[slug] = { slug, nom: slug, email: slug + '@exemple.fr', t, code: b64({ t, k }), ts }; };
  inscrire('ent-a', 'ent-a810', 'CLE-A-810-QWZX', 1);
  inscrire('ent-p', 'ent-p810', 'CLE-P-810-QWZX', 2);   // Firebase en panne au premier accès
  inscrire('ent-f', 'ent-f810', 'CLE-F-810-QWZX', 3);   // fermée
  inscrire('ent-s', 'ent-s810', 'ELAN-GESTION-7F3A9C2E-cloud-2026', 4);   // encore sur la clé partagée (écrite en clair dans app.html)
  fs.mkdirSync(path.join(banc, 'data'), { recursive: true });
  fs.writeFileSync(path.join(banc, 'data', 'espaces.json'), JSON.stringify(annuaire));
  fs.writeFileSync(path.join(banc, 'data', 'entreprises-fermees.json'), JSON.stringify({ emails: [], espaces: ['ent-f810'], suspendus: [], suspendusLe: {} }));
  fs.writeFileSync(path.join(banc, 'data', 'versions.json'), JSON.stringify({ min: 700, enLigne: 'enLigne', maj: 1, par: 'banc' }));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc' }));
  fs.writeFileSync(path.join(banc, 'fb.json'), JSON.stringify({ client_email: 'banc@exemple.iam', private_key: paire.privateKey }));
  const DOC_A = { enc: 'RE9DLUEtRklSRUJBU0U=', iv: 'aXY=', salt: 'c2Fs', z: 1, ts: 1727000000000, writer: 'dev-695', at: '2026-09-25T09:00:00.000Z', by: 'Tech', ver: '695', verNum: 695 };
  poserDoc('ent-a810', DOC_A);
  poserDoc('ent-p810', Object.assign({}, DOC_A, { enc: 'UEFOTkU=' }));

  const portLibre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
  const PORT = await portLibre();
  const demarrer = () => { enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { stdio: 'ignore',
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: path.join(banc, 'data'), PORT: String(PORT),
      TEAMOP_FB_ADMIN: path.join(banc, 'fb.json'), TEAMOP_FB_OAUTH_URL: GURL + '/token', TEAMOP_FIRESTORE_URL: GURL, TEAMOP_DOC_ATTENTE_MS: '2000' }) }); };
  const B = 'http://127.0.0.1:' + PORT;
  const pret = async () => { for (let i = 0; i < 100; i++) { try { if ((await fetch(B + '/health')).ok) return true; } catch (e) {} await dormir(100); } return false; };
  demarrer(); vrai('le serveur démarre', await pret());
  const MORT = 'http://127.0.0.1:' + (await portLibre());   // un port où personne n'écoute : le réseau coupé

  /* ══ 3. UN « APPAREIL » : les vraies fonctions, avec son stockage et sa fenêtre ════════════ */
  function appareil(t, k) {
    const stock = { elan_sync_team: t, elan_sync_secret: k };
    const ecout = { online: [], visibilitychange: [] };
    const env = {
      localStorage: { getItem: x => (x in stock ? stock[x] : null), setItem: (x, y) => { stock[x] = String(y); }, removeItem: x => { delete stock[x]; } },
      window: { addEventListener: (n, f) => { (ecout[n] = ecout[n] || []).push(f); }, removeEventListener: (n, f) => { ecout[n] = (ecout[n] || []).filter(g => g !== f); } },
      document: { visibilityState: 'visible', addEventListener: (n, f) => { (ecout[n] = ecout[n] || []).push(f); }, removeEventListener: (n, f) => { ecout[n] = (ecout[n] || []).filter(g => g !== f); } },
    };
    const code = 'let PUSH_API=api0;\n'
      + 'function syncTeam(){ return (localStorage.getItem("elan_sync_team")||"").trim(); }\n'
      + 'async function sha256(s){ return h(s); }\n'
      + 'async function sauvKh(){ const t=localStorage.getItem("elan_sync_team"), k=localStorage.getItem("elan_sync_secret"); if(!t||!k) return null; return {t:t,kh:await sha256(k)}; }\n'
      /* L'écran du refus définitif, tel que la page le déclenche : on NOTE ce qu'il reçoit. */
      + 'let _jetonRefus=null; const ecrans=[]; function jetonRefusEcran(){ ecrans.push(_jetonRefus); }\n'
      + morceaux.join('\n')
      + '\nreturn { docEquipe, docErreur, ecrans, api:(u)=>{ PUSH_API=u; } };';
    const f = new Function('localStorage', 'window', 'document', 'api0', 'h', code);
    const x = f(env.localStorage, env.window, env.document, B, kh);
    x.declencher = n => (ecout[n] || []).slice().forEach(g => { try { g(); } catch (e) {} });
    x.stock = stock;
    return x;
  }

  try {
    /* ── l'instantané initial : la copie depuis Firebase, par NOTRE serveur ── */
    const A = appareil('ent-a810', E['ent-a810']), B2 = appareil('ent-a810', E['ent-a810']);
    const dA = A.docEquipe();
    const recusA = [];
    const arreterA = dA.onSnapshot(s => recusA.push({ exists: s.exists, d: s.data(), cache: s.metadata.fromCache }));
    for (let i = 0; i < 50 && !recusA.length; i++) await dormir(100);
    v('⛔ onSnapshot rend le document de Firebase, copié par NOTRE serveur', recusA[0] && recusA[0].d, DOC_A);
    v('   jamais « depuis le cache » (le récepteur de syncInit ignorerait un instantané de cache)', recusA[0] && recusA[0].cache, false);
    const s1 = await dA.get();
    v('get() rend le même document', [s1.exists, s1.data() && s1.data().enc], [true, DOC_A.enc]);

    /* ── l'écriture d'un autre appareil réveille l'écoute ── */
    const dB = B2.docEquipe();
    const t0 = Date.now();
    await dB.set(Object.assign({}, DOC_A, { enc: 'REUtQg==', writer: 'dev-b', ts: 1727000001000, ver: '748', verNum: 748 }));
    for (let i = 0; i < 40 && recusA.length < 2; i++) await dormir(50);
    v('⛔ l\'écriture de B arrive chez A par l\'écoute', recusA[1] && recusA[1].d && recusA[1].d.enc, 'REUtQg==');
    vrai('   tout de suite, pas au bout de l\'attente (' + (Date.now() - t0) + ' ms)', Date.now() - t0 < 1500);

    /* ── la file d'écriture : coupée du réseau, la plus récente l'emporte, rien ne se perd ── */
    const vAvant = (await dA.get())._v;
    A.api(MORT);
    let fait1 = false, fait2 = false, echec = null;
    const p1 = dA.set(Object.assign({}, DOC_A, { enc: 'VjE=', writer: 'dev-a', ts: 1727000002000, ver: '748', verNum: 748 })).then(() => { fait1 = true; }, e => { echec = e; });
    await dormir(3300);   // plusieurs réessais ratés : la file dort dans son délai
    v('coupé du réseau : l\'écriture n\'est ni faite ni refusée — elle attend, comme chez Firestore', [fait1, echec], [false, null]);
    A.api(B);
    const t1 = Date.now();
    const p2 = dA.set(Object.assign({}, DOC_A, { enc: 'VjI=', writer: 'dev-a', ts: 1727000003000, ver: '748', verNum: 748 })).then(() => { fait2 = true; }, e => { echec = e; });
    await Promise.race([Promise.all([p1, p2]), dormir(8000)]);
    v('⛔ le réseau revenu, les DEUX promesses sont tenues', [fait1, fait2, echec], [true, true, null]);
    vrai('⛔ un envoi neuf RÉVEILLE la file au lieu d\'attendre la fin de son délai (' + (Date.now() - t1) + ' ms)', Date.now() - t1 < 1500);
    const apres = await dA.get();
    v('⛔ c\'est la PLUS RÉCENTE qui est rangée — jamais l\'ancienne après la neuve', apres.data().enc, 'VjI=');
    v('   en UNE seule écriture (l\'ancienne, contenue dans la neuve, ne part pas en plus)', apres._v - vAvant, 1);
    /* le retour du réseau SANS envoi neuf : l'événement `online` réveille aussi la file */
    A.api(MORT);
    let fait3 = false;
    const p3 = dA.set(Object.assign({}, DOC_A, { enc: 'VjM=', writer: 'dev-a', ts: 1727000004000, ver: '748', verNum: 748 })).then(() => { fait3 = true; });
    await dormir(3300);
    A.api(B); const t2 = Date.now(); A.declencher('online');
    await Promise.race([p3, dormir(8000)]);
    vrai('⛔ l\'événement « online » réveille la file (' + (Date.now() - t2) + ' ms)', fait3 && Date.now() - t2 < 1500);

    /* ── un RELAIS entre A et le serveur, pour jouer ce qu'une vraie ligne fait : ralentir une
       écriture (4G), ou rendre une version plus basse sans couper (un serveur restauré derrière un
       relais). ⛔ Sans lui, deux mutations passaient (mesuré le 25 septembre) : l'envoi neuf
       n'arrivait jamais PENDANT un vol, et la version basse n'arrivait jamais sans coupure. ── */
    const R = { lenteur: 0, versionBasse: false, compte: {} };
    const relais = http.createServer((q, r) => {
      const u = q.url.split('?')[0]; R.compte[u] = (R.compte[u] || 0) + 1;
      if (R.versionBasse && u === '/api/doc/attendre') { R.versionBasse = false; q.resume(); r.writeHead(200, { 'Content-Type': 'application/json' }); return r.end('{"v":1,"inchange":true}'); }
      const p = http.request({ host: '127.0.0.1', port: PORT, path: q.url, method: q.method, headers: q.headers }, pr => {
        const pause = u === '/api/doc/ecrire' ? R.lenteur : 0;
        setTimeout(() => { r.writeHead(pr.statusCode, pr.headers); pr.pipe(r); }, pause); });
      p.on('error', () => { try { r.writeHead(502); r.end(); } catch (e) {} }); q.pipe(p);
    });
    await new Promise(res => relais.listen(0, '127.0.0.1', res));
    const RL = 'http://127.0.0.1:' + relais.address().port;
    A.api(RL); R.lenteur = 1200;
    const vAvantVol = (await dA.get())._v;
    let f1 = false, f2 = false;
    const q1 = dA.set(Object.assign({}, DOC_A, { enc: 'RU4tVk9M', writer: 'dev-a', ts: 1727000005000, ver: '748', verNum: 748 })).then(() => { f1 = true; });
    await dormir(300);   // la première est EN VOL (le relais la retient 1,2 s)
    const q2 = dA.set(Object.assign({}, DOC_A, { enc: 'UExVUy1ORVVWRQ==', writer: 'dev-a', ts: 1727000006000, ver: '748', verNum: 748 })).then(() => { f2 = true; });
    await Promise.race([Promise.all([q1, q2]), dormir(8000)]);
    R.lenteur = 0;
    const apresVol = await dA.get();
    v('⛔ un envoi neuf PENDANT un vol n\'est pas avalé : c\'est lui qui est rangé en dernier', [f1, f2, apresVol.data().enc], [true, true, 'UExVUy1ORVVWRQ==']);
    v('   en deux écritures (celle en vol, puis la neuve)', apresVol._v - vAvantVol, 2);
    /* la version basse sans coupure : l'écoute doit RELIRE, pas attendre une version qui ne viendra pas */
    const lecturesAvant = R.compte['/api/doc/lire'] || 0;
    /* ⚠️ SANS `online` : ce réveil relit de lui-même, et l'essai passerait sans la branche qu'il
       vise. On laisse l'écoute finir son attente (2 s ici) : la suivante passe par le relais. */
    R.versionBasse = true;
    for (let i = 0; i < 80 && (R.compte['/api/doc/lire'] || 0) === lecturesAvant; i++) await dormir(100);
    v('⛔ une version plus basse sans coupure : l\'écoute RELIT au lieu d\'attendre pour toujours', (R.compte['/api/doc/lire'] || 0) > lecturesAvant, true);
    A.api(B); relais.close();

    /* ── les refus parlent la langue de Firebase ── */
    let e1 = null; await dA.set(Object.assign({}, DOC_A, { verNum: 695, ver: '695' })).catch(e => { e1 = e; });
    v('⛔ sous la version minimale : permission-denied (ce que rendait la règle Firestore)', [e1 && e1.code, e1 && e1.statut], ['permission-denied', 426]);
    /* ⛔ L'ÉCRAN « RATTACHÉ À AUCUNE ENTREPRISE » NE S'AFFICHE QUE SUR UN VRAI REFUS. Cet appareil a
       traversé une coupure réseau (la file), des réessais et une version refusée : aucun ne dit
       « tu n'as pas d'entreprise ». Le mettre là bloquerait un technicien pour une barre de réseau. */
    v('   ni la coupure réseau, ni la version refusée n\'affichent l\'écran du refus définitif', A.ecrans, []);
    const F = appareil('ent-f810', E['ent-f810']); const dF = F.docEquipe();
    let e2 = null; await dF.get().catch(e => { e2 = e; });
    v('⛔ une entreprise fermée : permission-denied', [e2 && e2.code, e2 && e2.statut], ['permission-denied', 403]);
    let e2b = null; await dF.set(Object.assign({}, DOC_A, { ver: '748', verNum: 748 })).catch(e => { e2b = e; });
    v('⛔ son écriture est refusée ET l\'écran du refus définitif est posé (403)', [e2b && e2b.code, F.ecrans.map(x => x.statut)], ['permission-denied', [403]]);
    const X = appareil('ent-a810', 'MAUVAISE-CLE'); const dX = X.docEquipe();
    let errCb = null, cbX = 0;
    dX.onSnapshot(() => { cbX++; }, e => { errCb = e; });
    for (let i = 0; i < 40 && !errCb; i++) await dormir(50);
    v('⛔ mauvaise clé : l\'écoute appelle son rappel d\'erreur, permission-denied, sans rien livrer', [errCb && errCb.code, cbX], ['permission-denied', 0]);
    v('   …et l\'écran du refus définitif est posé (403) — c\'était le rôle de l\'ancien jeton d\'équipe', X.ecrans.map(x => x.statut), [403]);
    const S = appareil('ent-s810', 'ELAN-GESTION-7F3A9C2E-cloud-2026'); const dS = S.docEquipe();
    let errS = null, cbS = 0;
    dS.onSnapshot(() => { cbS++; }, e => { errS = e; });
    for (let i = 0; i < 40 && !errS; i++) await dormir(50);
    v('⛔ une entreprise sur la clé PARTAGÉE : refusée (409), rien livré, et l\'écran le dit', [errS && errS.statut, cbS, S.ecrans.map(x => x.statut + ':' + x.motif)], [409, 0, ['409:cle_partagee']]);
    const contenuAvant = (await dA.get()).data().enc;
    let e3 = null; await dA.set({ ver: '749', verNum: 749 }, { merge: true }).catch(e => { e3 = e; });
    const apresFusion = await dA.get();
    v('la fusion de version ({merge:true}) passe, et garde le contenu', [e3, apresFusion.data().ver, apresFusion.data().enc], [null, '749', contenuAvant]);

    /* ── Firebase en panne au premier accès : JAMAIS un instantané vide ── */
    G.panne = true;
    const P = appareil('ent-p810', E['ent-p810']); const dP = P.docEquipe();
    const recusP = [];
    const arreterP = dP.onSnapshot(s => recusP.push(s.data() ? s.data().enc : null));
    await dormir(2500);
    v('⛔ Firebase en panne : AUCUN instantané livré (ni vide, ni faux)', recusP, []);
    G.panne = false;
    for (let i = 0; i < 100 && !recusP.length; i++) await dormir(100);
    v('⛔ Firebase revenu : le vrai document arrive', recusP[0], 'UEFOTkU=');
    arreterP();

    /* ── le serveur restauré EN ARRIÈRE : l'écoute relit au lieu d'attendre pour toujours ── */
    const nAvant = recusA.length;
    enfant.kill('SIGKILL'); await dormir(300);
    const p = path.join(banc, 'data', 'documents', 'ent-a810.json');
    fs.writeFileSync(p, JSON.stringify({ v: 1, doc: Object.assign({}, DOC_A, { enc: 'UkVTVEFVUkU=' }), maj: Date.now() }));
    demarrer(); vrai('le serveur redémarre', await pret());
    A.declencher('online');
    for (let i = 0; i < 150 && recusA.length === nAvant; i++) await dormir(100);
    v('⛔ après une restauration (version plus basse), l\'écoute relit et livre le document restauré', recusA.length > nAvant && recusA[recusA.length - 1].d.enc, 'UkVTVEFVUkU=');

    /* ── arrêter l'écoute l'arrête vraiment ── */
    arreterA();
    const n0 = recusA.length;
    await dB.set(Object.assign({}, DOC_A, { enc: 'QVBSRVM=', writer: 'dev-b', ts: 1727000009000, ver: '748', verNum: 748 }));
    await dormir(1500);
    v('une écoute arrêtée ne livre plus rien', recusA.length, n0);
  } catch (e) { ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); });
