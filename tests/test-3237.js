/* test-3237 — UNE ENTREPRISE, UN NOM DANS LA SURVEILLANCE (2 novembre 2026).
 *
 * Justin, capture à l'appui : « Pour information · Toka Clim · 1 problème » ET « toka-clim-33xz · 1 problème » — deux lignes pour la
 * même entreprise. `tmEnt` (app.html) envoie le nom saisi dans l'application et, quand la base n'est pas encore chargée (écran de
 * connexion, démarrage), l'IDENTIFIANT d'espace à la place ; le serveur l'écrivait tel quel, et la Tour groupe par nom.
 * Ce banc monte le VRAI serveur, isolé sur 127.0.0.1, et ne lit aucune page. Il garde :
 *   1. à l'arrivée (`/api/monitor/report`), le nom écrit est celui de l'ANNUAIRE quand l'espace y est — que le téléphone ait envoyé
 *      l'identifiant ou un autre nom ; l'espace par défaut et un espace inconnu gardent ce qu'ils ont envoyé ;
 *   2. à la lecture (`/api/monitor/issues`), les entrées déjà écrites sous deux noms sont RÉUNIES (compteurs additionnés, dernière
 *      vue la plus récente, personnes fusionnées) ; une autre entreprise n'est pas touchée ; `espaces` n'est toujours pas servi.
 */
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3237-'));
let enfant = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 90000).unref();
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const libre = () => new Promise(r => { const s = require('net').createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });

(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const T = 'toka-clim-33xz', T2 = 'autre-sarl-9qkw';
  const code64 = (t) => Buffer.from(JSON.stringify({ t, k: 'cle-propre-' + t })).toString('base64');
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({
    'toka-clim': { t: T, nom: 'Toka Clim', email: 'contact@toka-3237.fr', code: code64(T), ts: Date.now() },
    'autre-sarl': { t: T2, nom: 'Autre SARL', email: 'contact@autre-3237.fr', code: code64(T2), ts: Date.now() } }));
  fs.writeFileSync(path.join(D, 'connexions.json'), JSON.stringify({ [T]: [{ ts: Date.now(), ev: 'connexion', login: 'louca', nom: 'Louca', role: 'technicien', version: '785', app: 'gestion' }] }));

  const MDP = 'mot-de-passe-du-banc-3237';
  const N = Date.now();
  const inc = (id, entreprises) => ({ id, signature: 'opgestion|' + id, app: 'opgestion', statut: 'nouveau', type: 'reseau', message: 'Coupure ' + id,
    count: entreprises.reduce((s, e) => s + e.count, 0), firstTs: N - 9000, lastTs: N - 500, entreprises, appareils: { 'iPhone Safari': 1 }, notes: '' });
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({
    users: [{ id: 'upatron3237', nom: 'Patron', hash: sha(MDP), role: 'patron', actif: true, ts: 1 }],
    issues: [
      inc('i1', [{ nom: 'Toka Clim', count: 2, lastTs: N - 5000, gens: [{ login: 'louca', nom: 'Louca', role: 'technicien', count: 2, lastTs: N - 5000 }] },
                 { nom: T, count: 3, lastTs: N - 1000, espaces: [T], gens: [{ login: 'louca', nom: 'Louca', role: 'technicien', count: 3, lastTs: N - 1000 }] }]),
      inc('i2', [{ nom: T, count: 1, lastTs: N - 2000 }]),
      inc('i3', [{ nom: 'Nom tapé dans l’appli', count: 4, lastTs: N - 3000, espaces: [T] }, { nom: 'Autre SARL', count: 1, lastTs: N - 3000 }]),
      inc('i4', [{ nom: 'Entreprise Inconnue', count: 1, lastTs: N - 3000 }]) ],
    archive: [], journal: [], actions: [] }));

  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha(MDP) }));
  const PORT = await libre();
  let journalSrv = '';
  enfant = spawn(process.execPath, [SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
    TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:1/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:1', TEAMOP_IDTK_URL: 'http://127.0.0.1:1/idtk',
    TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:1/certs', TEAMOP_MSG_BETA_URL: 'http://127.0.0.1:1', TEAMOP_MSG_PROD_URL: 'http://127.0.0.1:1' }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { journalSrv += d; }); enfant.stderr.on('data', d => { journalSrv += d; });
  const B = 'http://127.0.0.1:' + PORT;
  let vivant = false;
  for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  vrai('le vrai serveur démarre', vivant);
  if (!vivant) { console.log(journalSrv.slice(0, 800)); process.exit(1); }
  const PATRON = (await (await fetch(B + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom: 'Patron', pass: MDP }) })).json()).token;
  vrai('le patron ouvre la Tour', PATRON);
  const issues = async () => (await (await fetch(B + '/api/monitor/issues', { headers: { Authorization: 'Bearer ' + PATRON } })).json()).issues;
  const de = (l, id) => (l.find(i => i.id === id) || {}).entreprises || [];
  const noms = (l, id) => de(l, id).map(e => e.nom).sort();
  const rapport = (sig, entreprise, espace) => fetch(B + '/api/monitor/report', { method: 'POST', headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ reports: [{ type: 'reseau', app: 'opgestion', signature: sig, message: 'Coupure ' + sig, entreprise, espace, user: 'louca', version: '785', count: 1 }] }) });

  console.log('\n── 3237 · 1. à la lecture : ce qui est déjà écrit sous deux noms se réunit ──');
  let L = await issues();
  v('i1 : « Toka Clim » et « toka-clim-33xz » ne font plus qu’UNE ligne', noms(L, 'i1'), ['Toka Clim']);
  v('i1 : les compteurs s’additionnent (2 + 3)', de(L, 'i1')[0].count, 5);
  v('i1 : la dernière vue est la plus récente', de(L, 'i1')[0].lastTs, N - 1000);
  v('i1 : la même personne n’apparaît qu’une fois, compteurs additionnés', (de(L, 'i1')[0].gens || []).map(g => [g.login, g.count]), [['louca', 5]]);
  v('i2 : l’identifiant seul devient le nom de l’annuaire', noms(L, 'i2'), ['Toka Clim']);
  v('i3 : un autre nom tapé, rattaché à l’espace, devient le nom de l’annuaire ; l’autre entreprise reste', noms(L, 'i3'), ['Autre SARL', 'Toka Clim']);
  v('i4 : une entreprise que l’annuaire ne connaît pas garde son nom', noms(L, 'i4'), ['Entreprise Inconnue']);
  vrai('les identifiants d’espace ne sont toujours pas servis à la Tour', !JSON.stringify(L).includes('"espaces"'));
  v('le fichier n’est pas réécrit par une lecture (i1 a toujours ses deux entrées sur le disque)',
    JSON.parse(fs.readFileSync(path.join(banc, 'monitor.json'), 'utf8')).issues.find(i => i.id === 'i1').entreprises.length, 2);

  console.log('\n── 3237 · 2. à l’arrivée : le nom de l’annuaire, pas celui du téléphone ──');
  await rapport('neuf-id', T, T);
  await rapport('neuf-autre', 'Mon nom à moi', T);
  await rapport('neuf-defaut', 'Repli SARL', 'elan-gestion');
  await rapport('neuf-inconnu', 'Xyz Services', 'inconnu-3237');
  await rapport('neuf-sans', 'Sans Espace SARL', '');
  await dormir(1200);   // monSave écrit le fichier 500 ms après le dernier rapport
  const disque = JSON.parse(fs.readFileSync(path.join(banc, 'monitor.json'), 'utf8')).issues;
  const ecrit = (sig) => ((disque.find(i => i.signature === 'opgestion|' + sig) || {}).entreprises || []).map(e => e.nom);
  v('le téléphone envoie l’identifiant : « Toka Clim » est écrit', ecrit('neuf-id'), ['Toka Clim']);
  v('le téléphone envoie un autre nom avec l’espace : « Toka Clim » est écrit', ecrit('neuf-autre'), ['Toka Clim']);
  v('l’espace par défaut (partagé) ne désigne personne : le nom envoyé reste', ecrit('neuf-defaut'), ['Repli SARL']);
  v('un espace inconnu de l’annuaire : le nom envoyé reste', ecrit('neuf-inconnu'), ['Xyz Services']);
  v('sans espace : le nom envoyé reste', ecrit('neuf-sans'), ['Sans Espace SARL']);
  L = await issues();
  const grp = new Set(); L.forEach(i => (i.entreprises || []).forEach(e => grp.add(e.nom)));
  vrai('dans toute la Surveillance, plus aucune ligne au nom de l’identifiant', !grp.has(T));

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ' + e.stack); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
