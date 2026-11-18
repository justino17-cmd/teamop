/* test-3299 — LES MOTS DE PASSE DE LA TOUR EN SCRYPT SALÉ, MIGRATION AU PREMIER LOGIN (18 novembre 2026, S3).
 * Le VRAI serveur, isolé sur 127.0.0.1. Gardé : un compte d'avant (SHA-256 nu) entre UNE fois puis est réécrit en `scrypt$…` ;
 * le nouveau hachage est salé (deux comptes, même mot de passe, deux empreintes) ; un mauvais mot de passe et une forme
 * rangée falsifiée sont refusés ; un compte créé par la Tour naît en scrypt ; un accès bêta d'avant migre de même ;
 * ni mot de passe ni empreinte dans le journal du serveur. */
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, a) => { if (a) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t); } };
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3299-')); let enfant = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 90000).unref();
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const MDP = 'Mdp-Banc-3299-QZX', MDP2 = 'Autre-Mdp-3299-QZX';
(async () => {
  let webpush; try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); } catch (e) { console.log('  (server/node_modules absent : suite sautée)'); console.log('\n0 ✓  0 ✗'); return; }
  const vap = webpush.generateVAPIDKeys(); const D = path.join(banc, 'data'); fs.mkdirSync(D);
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha('x-inutile') }));
  const MON = path.join(banc, 'monitor.json');
  fs.writeFileSync(MON, JSON.stringify({ issues: [], users: [
    { id: 'u1', nom: 'Patron', email: 'patron@banc.fr', hash: sha(MDP), role: 'patron', actif: true, ts: 0 },
    { id: 'u2', nom: 'Second', email: 'second@banc.fr', hash: sha(MDP), role: 'collaborateur', actif: true, ts: 0 } ] }));
  fs.writeFileSync(path.join(D, 'beta-comptes.json'), JSON.stringify([{ id: 'b1', login: 'testeur', nom: 'T', apps: ['gestion'], hash: sha(MDP), actif: true, ts: 1 }]));
  const PORT = 9520 + (process.pid % 200); let journal = '';
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_KEK: 'b8'.repeat(32),
    TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:1/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:1', TEAMOP_IDTK_URL: 'http://127.0.0.1:1/idtk', TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:1/certs' }) });
  enfant.stdout.on('data', d => journal += d); enfant.stderr.on('data', d => journal += d);
  const B = 'http://127.0.0.1:' + PORT;
  for (let i = 0; i < 100; i++) { try { if ((await fetch(B + '/health')).ok) break; } catch (e) {} await new Promise(r => setTimeout(r, 300)); }
  const post = async (u, corps, tete) => { const r = await fetch(B + u, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, tete || {}), body: JSON.stringify(corps) }); let j = {}; try { j = await r.json(); } catch (e) {} return { s: r.status, j }; };
  const users = () => JSON.parse(fs.readFileSync(MON, 'utf8')).users;
  const betas = () => JSON.parse(fs.readFileSync(path.join(D, 'beta-comptes.json'), 'utf8'));

  const dort = ms => new Promise(r => setTimeout(r, ms));   // monSave écrit 500 ms plus tard
  const l1 = await post('/api/monitor/login', { nom: 'Patron', pass: MDP });
  vrai('un compte d\'avant (SHA-256) entre au premier login', l1.s === 200 && l1.j.token);
  await dort(900);
  vrai('…et son hachage est réécrit en scrypt', /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{64}$/.test(users()[0].hash));
  const l2 = await post('/api/monitor/login', { nom: 'Patron', pass: MDP });
  vrai('le second login, sur le nouveau hachage, passe', l2.s === 200);
  vrai('un mauvais mot de passe est refusé (hachage neuf)', (await post('/api/monitor/login', { nom: 'Patron', pass: MDP2 })).s === 403);
  vrai('un mauvais mot de passe est refusé (hachage d\'avant)', (await post('/api/monitor/login', { nom: 'Second', pass: MDP2 })).s === 403);
  vrai('un refus ne réécrit rien', users()[1].hash === sha(MDP));
  const l3 = await post('/api/monitor/login', { nom: 'Second', pass: MDP }); await dort(900);
  vrai('l\'autre compte migre aussi', l3.s === 200 && /^scrypt\$/.test(users()[1].hash));
  vrai('SALÉ : même mot de passe, deux empreintes différentes', users()[0].hash !== users()[1].hash);
  vrai('l\'empreinte rangée, présentée comme mot de passe, est refusée', (await post('/api/monitor/login', { nom: 'Patron', pass: users()[0].hash })).s === 403);
  // compte créé par la Tour
  const T = { Authorization: 'Bearer ' + l2.j.token };
  const cr = await post('/api/monitor/users', { nom: 'Nouveau', email: 'nouveau@banc.fr', pass: MDP2 }, T);
  await dort(900);
  vrai('la Tour crée un compte', cr.s === 200 || cr.s === 201 || cr.j.ok);
  const nu = users().find(u => u.nom === 'Nouveau');
  vrai('un compte créé par la Tour naît en scrypt', nu && /^scrypt\$/.test(nu.hash));
  vrai('…et il entre', (await post('/api/monitor/login', { nom: 'Nouveau', pass: MDP2 })).s === 200);
  // accès bêta d'avant
  const b1 = await post('/api/beta/login', { login: 'testeur', pass: MDP, app: 'gestion' });
  vrai('un accès bêta d\'avant entre', b1.s === 200);
  vrai('…et migre en scrypt', /^scrypt\$/.test(betas()[0].hash));
  vrai('…et un mauvais mot de passe bêta est refusé', (await post('/api/beta/login', { login: 'testeur', pass: MDP2, app: 'gestion' })).s === 403);
  // journaux
  vrai('aucun mot de passe en clair dans le journal ni dans monitor.json', !journal.includes(MDP) && !journal.includes(MDP2) && !fs.readFileSync(MON, 'utf8').includes(MDP));
  vrai('aucune empreinte SHA-256 d\'un mot de passe dans le journal', !journal.includes(sha(MDP)) && !journal.includes(sha(MDP2)));
  vrai('plus aucune empreinte SHA-256 de ces mots de passe dans monitor.json', !fs.readFileSync(MON, 'utf8').includes(sha(MDP)) && !fs.readFileSync(MON, 'utf8').includes(sha(MDP2)));
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); fin(); process.exit(ko ? 1 : 0);
})();
