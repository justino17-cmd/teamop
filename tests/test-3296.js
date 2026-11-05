/* test-3296 — LE MESSAGE « RÉSEAU » DES VERSIONS D'AVANT LA v800 N'OUVRE PLUS DE DOSSIER (5 novembre 2026).
 *
 * Justin, capture de la Tour : Toka Clim, deux dossiers « api.teamop.fr injoignable sur /api/doc/attendre (Fetch is aborted) » ×8 et
 * « (Load failed) » ×7, marqués « Corrigé » puis rouverts — « il faut trouver le problème, ça revient trop souvent ». Ce texte n'existe plus
 * depuis la v800 : il vient d'appareils restés sur une ancienne version, qui signalent chaque coupure que la synchro renoue seule, pendant
 * que le serveur tourne. Ce banc monte le VRAI serveur, isolé sur 127.0.0.1, et joue `POST /api/monitor/report` :
 *   1. `monPassager` (la vraie fonction, extraite du fichier) : l'ancien texte → passager ; le texte de la v800 (« depuis plus de 2 min »),
 *      une 5xx, une erreur JavaScript → non ;
 *   2. un rapport neuf à l'ancien texte → dossier « transitoire » (Passager), pas « nouveau » ;
 *   3. un dossier « corrigé » à l'ancien texte qui revient → « transitoire », pas rouvert en « nouveau » ;
 *   4. un dossier « nouveau » déjà ouvert à l'ancien texte → passe en « transitoire » au rapport suivant ; un « en cours » ne bouge pas ;
 *   5. ⛔ la contre-épreuve : le texte de la v800 ouvre toujours un dossier « nouveau », et un « corrigé » de la v800 qui revient redevient
 *      « nouveau » — sinon on aurait éteint la surveillance au lieu de la trier.
 */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3296-'));
let enfant = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 90000).unref();
const libre = () => new Promise(r => { const s = require('net').createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });

(async () => {
  const SRC = fs.readFileSync(SERVEUR, 'utf8');
  console.log('\n── 3296 · 1. monPassager (la vraie fonction) ──');
  const d = SRC.indexOf('function monPassager(');
  vrai('la fonction est trouvée dans server/index.js', d > 0);
  const f = SRC.indexOf('\n}\n', d);
  const monPassager = new Function(SRC.slice(d, f + 2) + '\nreturn monPassager;')();
  const ANCIEN_A = 'api.teamop.fr injoignable sur /api/doc/attendre (Fetch is aborted)';
  const ANCIEN_B = 'api.teamop.fr injoignable sur /api/doc/lire (The network connection was lost.)';
  const V800 = 'api.teamop.fr injoignable depuis plus de 2 min sur cet appareil — /api/doc/lire (échec)';
  const V800_DELAI = 'api.teamop.fr ne répond plus à cet appareil depuis plus de 2 min — /api/doc/lire (pas de réponse en 47 s)';
  v('ancien texte « Fetch is aborted » → passager', monPassager('reseau', ANCIEN_A), true);
  v('ancien texte « network connection was lost » → passager', monPassager('reseau', ANCIEN_B), true);
  v('texte de la v800 (injoignable depuis plus de 2 min) → reste à traiter', monPassager('reseau', V800), false);
  v('texte de la v800 (ne répond plus, délai) → reste à traiter', monPassager('reseau', V800_DELAI), false);
  v('⛔ texte de la v800 nommé « Load failed » par Safari → reste à traiter (2 minutes de panne, pas une coupure renouée)', monPassager('reseau', 'api.teamop.fr injoignable depuis plus de 2 min sur cet appareil — /api/doc/lire (Load failed)'), false);
  v('une 5xx (le réseau marche, le serveur a répondu) → reste à traiter', monPassager('reseau', 'api.teamop.fr a répondu 503 sur /api/doc/lire'), false);
  v('le même texte sous un autre type (une erreur JavaScript qui le cite) → reste à traiter', monPassager('erreur', ANCIEN_A), false);
  v('les transitoires d\'avant restent passagers (ServiceWorker)', monPassager('erreur', 'Failed to update a ServiceWorker for scope'), true);

  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ (partie serveur) : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }

  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const N = Date.now();
  const sig = (m) => 'opgestion|reseau|' + m.slice(0, 120);
  const inc = (id, message, statut) => ({ id, signature: sig(message), app: 'opgestion', statut, type: 'reseau', message, count: 3, firstTs: N - 9000, lastTs: N - 5000,
    entreprises: [{ nom: 'Banc Clim', count: 3, lastTs: N - 5000 }], appareils: { 'iPhone Safari': 3 }, notes: '' });
  const ANCIEN_C = 'api.teamop.fr injoignable sur /api/doc/ecrire (Load failed)';
  const ANCIEN_D = 'api.teamop.fr injoignable sur /health (Failed to fetch)';
  const V800_B = 'api.teamop.fr injoignable depuis plus de 2 min sur cet appareil — /api/doc/attendre (Failed to fetch)';
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ users: [], journal: [], archive: [], actions: [], issues: [
    inc('icorrige', ANCIEN_A, 'corrige'),         // marqué « Corrigé » par Justin, un appareil ancien le renvoie
    inc('inouveau', ANCIEN_B, 'nouveau'),         // ouvert avant la règle
    inc('iencours', ANCIEN_D, 'encours'),         // quelqu'un y travaille : ne bouge pas
    inc('iv800', V800_B, 'corrige') ] }));         // contre-épreuve : une vraie panne de la v800 qui revient
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc-3296' }));
  const PORT = await libre();
  let journalSrv = '';
  enfant = spawn(process.execPath, [SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
    TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_MSG_BETA_URL: 'http://127.0.0.1:1', TEAMOP_MSG_PROD_URL: 'http://127.0.0.1:1' }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', x => { journalSrv += x; }); enfant.stderr.on('data', x => { journalSrv += x; });
  const B = 'http://127.0.0.1:' + PORT;
  let vivant = false;
  for (let i = 0; i < 80 && !vivant; i++) { try { const r = await fetch(B + '/health'); vivant = r.ok; } catch (e) {} if (!vivant) await dormir(150); }
  vrai('le vrai serveur démarre', vivant);
  if (!vivant) { console.log(journalSrv.slice(-1500)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }

  /* l'appareil envoie par sendBeacon : du JSON en text/plain */
  const rapport = (message) => ({ signature: 'reseau|' + message.slice(0, 120), app: 'opgestion', version: '786', categorie: 'planning', type: 'reseau', message, count: 2, entreprise: 'Banc Clim', appareil: 'iPhone Safari' });
  const envoyer = async (liste) => { const r = await fetch(B + '/api/monitor/report', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ reports: liste }) }); return r.status; };
  const ANCIEN_NEUF = 'api.teamop.fr injoignable sur /api/doc/attendre (Load failed: neuf)';
  const V800_NEUF = 'api.teamop.fr ne répond plus à cet appareil depuis plus de 2 min — /api/doc/attendre (pas de réponse en 60 s)';
  v('le rapport est accepté', await envoyer([rapport(ANCIEN_NEUF), rapport(ANCIEN_A), rapport(ANCIEN_B), rapport(ANCIEN_D), rapport(V800_B), rapport(V800_NEUF), rapport(ANCIEN_C)]), 200);
  await dormir(1200);   // monSave écrit 500 ms plus tard
  const M = JSON.parse(fs.readFileSync(path.join(banc, 'monitor.json'), 'utf8'));
  const de = (m) => (M.issues || []).find(i => i.message === m) || {};
  const nb = (M.issues || []).length;
  vrai('population : les sept dossiers sont là (4 d\'avant, 3 neufs) — ' + nb, nb === 7);

  console.log('\n── 3296 · 2. un dossier neuf à l\'ancien texte ──');
  v('ancien texte, dossier neuf → « transitoire » (Passager)', de(ANCIEN_NEUF).statut, 'transitoire');
  v('ancien texte « Load failed » sur /api/doc/ecrire → « transitoire »', de(ANCIEN_C).statut, 'transitoire');
  console.log('\n── 3296 · 3 et 4. les dossiers déjà là ──');
  v('« corrigé » à l\'ancien texte qui revient → « transitoire », pas « nouveau »', de(ANCIEN_A).statut, 'transitoire');
  v('   et son compteur avance (rien n\'est jeté)', de(ANCIEN_A).count, 5);
  v('« nouveau » déjà ouvert à l\'ancien texte → « transitoire »', de(ANCIEN_B).statut, 'transitoire');
  v('« en cours » ne bouge pas', de(ANCIEN_D).statut, 'encours');
  console.log('\n── 3296 · 5. la contre-épreuve : la v800 reste surveillée ──');
  v('texte de la v800, dossier neuf → « nouveau »', de(V800_NEUF).statut, 'nouveau');
  v('« corrigé » de la v800 qui revient → « nouveau »', de(V800_B).statut, 'nouveau');

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
