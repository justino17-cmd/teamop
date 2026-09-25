/* ⛔ CE QUE CE FICHIER GARDE — LES DEUX INTERRUPTEURS DU JOUR J, POSÉS SANS OUVRIR LA CONFIGURATION.

   `server/reglage.js` change `comptes.actif` (le jour J) et `documents.copieFirebase` (à J+30)
   dans `/opt/teamop/config.json` — le fichier qui porte les secrets du serveur. Ce qui doit tenir :
   rien d'autre ne bouge, les droits restent 600, un fichier cassé n'est pas écrasé, et AUCUN secret
   n'apparaît dans ce que le script affiche (Justin recolle ses sorties dans la conversation).
   On l'EXÉCUTE, comme sur le VPS, contre une configuration de banc. */
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');
const SCRIPT = path.join(__dirname, '..', 'server', 'reglage.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'b815-'));
const cfg = path.join(dir, 'config.json');
const SECRET = 'sk_live_SECRET-DE-BANC-815';
const base = { vapidPublicKey: 'pub', vapidPrivateKey: 'priv-SECRET', stripe: { cle: SECRET }, smtp: { pass: 'SMTP-SECRET-815' }, comptes: { autre: 1 } };
const lancer = (arg) => spawnSync(process.execPath, [SCRIPT].concat(arg ? [arg] : []), { env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfg }), encoding: 'utf8' });

console.log('\n── 815 · les interrupteurs du jour J, sans ouvrir la configuration ──');
fs.writeFileSync(cfg, JSON.stringify(base, null, 2), { mode: 0o600 });
let r = lancer('comptes.actif=true');
let c = JSON.parse(fs.readFileSync(cfg, 'utf8'));
v('⛔ allumer les comptes du portail', [r.status, c.comptes.actif], [0, true]);
v('   sans toucher au reste du bloc, ni aux autres blocs', [c.comptes.autre, c.stripe.cle, c.smtp.pass, c.vapidPrivateKey], [1, SECRET, 'SMTP-SECRET-815', 'priv-SECRET']);
v('⛔ les droits restent 600', (fs.statSync(cfg).mode & 0o777).toString(8), '600');
v('⛔ AUCUN secret dans ce que le script affiche', [SECRET, 'SMTP-SECRET', 'priv-SECRET'].filter(x => (r.stdout + r.stderr).indexOf(x) >= 0), []);
v('   il dit l\'avant, l\'après, et le redémarrage', [/comptes\.actif : \(absent\) → true/.test(r.stdout), /systemctl restart teamop-api/.test(r.stdout)], [true, true]);
r = lancer('documents.copieFirebase=false');
c = JSON.parse(fs.readFileSync(cfg, 'utf8'));
v('⛔ couper la copie depuis Google (J+30)', [r.status, c.documents.copieFirebase, c.comptes.actif], [0, false, true]);
for (const a of ['stripe.cle=true', 'comptes.actif=oui', 'comptes.actif', '', '__proto__.x=true']) {
  const avant = fs.readFileSync(cfg, 'utf8');
  r = lancer(a);
  v('⛔ refusé et rien ne bouge : « ' + a + ' »', [r.status, fs.readFileSync(cfg, 'utf8') === avant], [1, true]);
}
fs.writeFileSync(cfg, '{ "cassé": ', { mode: 0o600 });
r = lancer('comptes.actif=true');
v('⛔ une configuration cassée n\'est PAS écrasée par-dessus', [r.status, fs.readFileSync(cfg, 'utf8')], [1, '{ "cassé": ']);
v('   et aucun fichier temporaire ne traîne', fs.readdirSync(dir).filter(f => /tmp/.test(f)), []);
try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
