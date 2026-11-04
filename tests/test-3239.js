/* test-3239 — LA BÊTA A LE DEVIS IA D'OFFICE (3 novembre 2026).
 *
 * Justin : « active tout, que la bêta puisse le tester de A à Z ». L'espace bêta (`opgestion-beta`) n'a pas de nom dans l'annuaire :
 * la Tour le cachait de l'onglet Devis IA et personne ne pouvait l'activer. Ce banc monte le VRAI serveur, isolé sur 127.0.0.1, et garde :
 *   1. l'espace bêta est actif d'office, moteur « Au choix » (approfondi proposé), une autre entreprise non ;
 *   2. la Tour le liste sous un nom lisible, et peut le couper — et ce réglage-là survit à un redémarrage ;
 *   3. sans la clé Claude sur le serveur, rien n'est annoncé actif (le Devis IA ne promet pas ce qu'il ne peut pas faire).
 */
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3239-'));
const enfants = [];
const fin = () => { enfants.forEach(x => { try { x.kill('SIGKILL'); } catch (e) {} }); try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 120000).unref();
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const libre = () => new Promise(r => { const s = require('net').createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const MDP = 'mot-de-passe-du-banc-3239';

async function lancer(nom, avecCle) {
  const rep = path.join(banc, nom), D = path.join(rep, 'data');
  fs.mkdirSync(D, { recursive: true });
  if (!fs.existsSync(path.join(rep, 'monitor.json')))
    fs.writeFileSync(path.join(rep, 'monitor.json'), JSON.stringify({ users: [{ id: 'up3239', nom: 'Patron', hash: sha(MDP), role: 'patron', actif: true, ts: 1 }], issues: [], archive: [], journal: [], actions: [] }));
  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(rep, 'config.json'), JSON.stringify(Object.assign({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha(MDP) },
    avecCle ? { anthropic: { cleApi: 'sk-ant-banc-3239-jamais-appelee' } } : {})));
  const PORT = await libre(); let jr = '';
  const e = spawn(process.execPath, [SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(rep, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
    TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:1/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:1', TEAMOP_IDTK_URL: 'http://127.0.0.1:1/idtk',
    TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:1/certs', TEAMOP_MSG_BETA_URL: 'http://127.0.0.1:1', TEAMOP_MSG_PROD_URL: 'http://127.0.0.1:1' }), stdio: ['ignore', 'pipe', 'pipe'] });
  e.stdout.on('data', d => { jr += d; }); e.stderr.on('data', d => { jr += d; }); enfants.push(e);
  const B = 'http://127.0.0.1:' + PORT; let vif = false;
  for (let i = 0; i < 150 && !vif; i++) { try { vif = (await fetch(B + '/health')).ok; } catch (x) {} if (!vif) await dormir(100); }
  const post = async (route, corps, jeton) => { const r = await fetch(B + route, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: JSON.stringify(corps) }); let j = {}; try { j = await r.json(); } catch (x) {} return { s: r.status, j }; };
  const jeton = vif ? (await post('/api/monitor/login', { nom: 'Patron', pass: MDP })).j.token : '';
  const etat = async (t) => (await fetch(B + '/api/devis/etat?team=' + encodeURIComponent(t))).json();
  const tour = async () => (await fetch(B + '/api/monitor/devisia', { headers: { Authorization: 'Bearer ' + jeton } })).json();
  return { vif, post, jeton, etat, tour, D, arreter: () => { try { e.kill('SIGKILL'); } catch (x) {} }, journal: () => jr };
}

(async () => {
  try { require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  console.log('\n── 3239 · 1. la bêta est active d’office ──');
  let S = await lancer('a', true);
  vrai('le vrai serveur démarre, le patron ouvre la Tour', S.vif && S.jeton);
  let e = await S.etat('opgestion-beta');
  v('l’espace bêta : Devis IA actif, moteur « Au choix », approfondi proposé', [e.equipe, e.offre, e.approfondi], [true, 'deux', true]);
  e = await S.etat('une-autre-entreprise-3239');
  v('une autre entreprise, jamais activée : rien', [e.equipe, e.approfondi], [false, false]);
  vrai('rien n’est écrit sur le disque tant que la Tour n’y a pas touché', !fs.existsSync(path.join(S.D, 'devis-acces.json')));

  console.log('\n── 3239 · 2. la Tour la voit sous un nom lisible, et la règle ──');
  let T = await S.tour();
  const ent = (T.entreprises || []).find(x => x.t === 'opgestion-beta');
  v('la Tour liste l’espace bêta dans l’onglet Devis IA, avec son nom', ent && ent.nom, 'Bêta OP GESTION (équipe)');
  v('…et son nom dans la table des noms', (T.noms || {})['opgestion-beta'], 'Bêta OP GESTION (équipe)');
  let r = await S.post('/api/monitor/devisia', { teamId: 'opgestion-beta', actif: false }, S.jeton);
  v('la Tour coupe le Devis IA de la bêta', r.s, 200);
  v('…et l’application ne le voit plus', (await S.etat('opgestion-beta')).equipe, false);
  S.arreter(); await dormir(300);
  S = await lancer('a', true);
  v('⛔ après un redémarrage, le réglage de la Tour reste (la bêta n’est pas réactivée d’office)', (await S.etat('opgestion-beta')).equipe, false);
  r = await S.post('/api/monitor/devisia', { teamId: 'opgestion-beta', actif: true }, S.jeton);
  r = await S.post('/api/monitor/devisia', { teamId: 'opgestion-beta', moteur: 'haiku' }, S.jeton);
  e = await S.etat('opgestion-beta');
  v('la Tour la rallume en « Rapide » : actif, sans approfondi', [e.equipe, e.offre, e.approfondi], [true, 'haiku', false]);
  S.arreter();

  console.log('\n── 3239 · 3. sans clé Claude, rien n’est promis ──');
  const S2 = await lancer('b', false);
  e = await S2.etat('opgestion-beta');
  v('serveur sans clé : la bêta n’est pas annoncée active', [e.actif, e.equipe], [false, false]);
  S2.arreter();

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ' + e.stack); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
