/* test-3180 — EFFACER L'HISTORIQUE DE SURVEILLANCE (29 octobre 2026).
 *
 * Justin : « je veux supprimer l'historique » (pour « repartir bien »), « oui, que pour moi ». Le VRAI serveur, lancé isolé sur 127.0.0.1 :
 *   1. sans la confirmation écrite (`confirmer: 'EFFACER'`) : 400, rien ne part ; une console inconnue : 400 ;
 *   2. un collaborateur : refusé (le patron seul) ;
 *   3. le patron, console OP GESTION : les problèmes DÉJÀ CLASSÉS d'OP GESTION partent (liste vive ET archive), les OUVERTS restent,
 *      ceux d'OP MESSAGES ne bougent pas ;
 *   4. la Tour (aperçu) porte le bouton, réservé au patron, qui appelle cette route avec la confirmation.
 */
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3180-'));
let enfant = null;
process.on('exit', () => { try { if (enfant) enfant.kill(); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} });
const libre = () => new Promise(r => { const s = require('net').createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });

(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const vap = webpush.generateVAPIDKeys(), MDP = 'mot-de-passe-du-banc-3180', MDP_C = 'collaborateur-3180-long';
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, adminPassHash: sha(MDP) }));
  const N = Date.now();
  const inc = (id, app, statut) => ({ id, app, statut, type: 'erreur', titre: 'Incident ' + id, msg: 'm', count: 1, firstTs: N - 1000, lastTs: N - 500, entreprises: [{ nom: 'Entreprise ' + id }], historique: [] });
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({
    users: [{ id: 'upatron3180', nom: 'Patron', hash: sha(MDP), role: 'patron', actif: true, ts: 1 },
      { id: 'ucollab3180', nom: 'Gaston', hash: sha(MDP_C), role: 'collaborateur', actif: true, ts: 1, apps: ['gestion', 'messages'] }],
    issues: [inc('g1', 'opgestion', 'nouveau'), inc('g2', 'opgestion', 'encours'), inc('g3', 'opgestion', 'corrige'), inc('g4', 'stripe', 'ignore'), inc('m1', 'opmessages', 'ignore'), inc('m2', 'opmessages', 'nouveau')],
    archive: [inc('a1', 'opgestion', 'corrige'), inc('a2', 'opmessages', 'corrige')] }));
  const PORT = await libre();
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
    TEAMOP_MSG_BETA_URL: 'http://127.0.0.1:1', TEAMOP_MSG_PROD_URL: 'http://127.0.0.1:1', TEAMOP_BETA_PAGE_URL: 'http://127.0.0.1:1/beta.html', TEAMOP_APP_PAGE_URL: 'http://127.0.0.1:1/app.html' }), stdio: 'ignore' });
  const B = 'http://127.0.0.1:' + PORT;
  let vivant = false;
  for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  vrai('le vrai serveur démarre', vivant);
  const login = async (nom, pass) => (await (await fetch(B + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom, pass }) })).json()).token;
  const PATRON = await login('Patron', MDP), COLLAB = await login('Gaston', MDP_C);
  vrai('population : le patron et le collaborateur ouvrent la Tour', PATRON && COLLAB);
  const poste = (jeton, corps) => fetch(B + '/api/monitor/issues/effacer-historique', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jeton }, body: JSON.stringify(corps) });
  const ids = async () => (await (await fetch(B + '/api/monitor/issues', { headers: { Authorization: 'Bearer ' + PATRON } })).json()).issues.map(i => i.id).sort();
  try {
    v('population : six problèmes vivants', await ids(), ['g1', 'g2', 'g3', 'g4', 'm1', 'm2']);
    console.log('\n── 3180 · 1. la confirmation ──');
    v('⛔ sans « EFFACER » : 400', (await poste(PATRON, { app: 'gestion' })).status, 400);
    v('⛔ une console inconnue : 400', (await poste(PATRON, { app: 'autre', confirmer: 'EFFACER' })).status, 400);
    v('… et rien n’est parti', await ids(), ['g1', 'g2', 'g3', 'g4', 'm1', 'm2']);
    console.log('\n── 3180 · 2. le patron seul ──');
    const rc = await poste(COLLAB, { app: 'gestion', confirmer: 'EFFACER' });
    vrai('⛔ un collaborateur est refusé (' + rc.status + ')', rc.status === 401 || rc.status === 403);
    v('… et rien n’est parti', await ids(), ['g1', 'g2', 'g3', 'g4', 'm1', 'm2']);
    console.log('\n── 3180 · 3. le patron, console OP GESTION ──');
    const r = await poste(PATRON, { app: 'gestion', confirmer: 'EFFACER' }), j = await r.json();
    v('réponse : 3 effacés (g3, g4 Stripe, a1 de l’archive), 2 ouverts gardés', [r.status, j.effaces, j.ouvertsGardes], [200, 3, 2]);
    v('⛔ les ouverts d’OP GESTION restent, OP MESSAGES ne bouge pas', await ids(), ['g1', 'g2', 'm1', 'm2']);
    await dormir(1500);
    const sur = JSON.parse(fs.readFileSync(path.join(banc, 'monitor.json'), 'utf8'));
    v('⛔ écrit sur le disque : l’archive ne garde que celui d’OP MESSAGES', (sur.archive || []).map(i => i.id), ['a2']);
    console.log('\n── 3180 · 4. le bouton de la Tour (aperçu) ──');
    const T = fs.readFileSync(path.join(RACINE, 'apercu', 'tour.html'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
    vrai('la fonction appelle la route avec la confirmation, et refuse à qui n’est pas le patron', /function incEffacerHistorique\(\)\{\s*if\(MYROLE!=='patron'\)/.test(T) && /apiPost\('\/api\/monitor\/issues\/effacer-historique',\{app:app,confirmer:'EFFACER'\}\)/.test(T));
    vrai('le bouton n’est posé que pour le patron, et seulement s’il y a un historique', /if\(_classes&&MYROLE==='patron'\) zeroBtn\+=/.test(T));
  } catch (e) { vrai('le banc s’est déroulé sans exception (' + e.message + ')', false); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
