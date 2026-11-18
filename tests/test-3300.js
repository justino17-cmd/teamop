/* ⛔ CE QUE CE FICHIER GARDE — LA TOUR A UNE VRAIE DÉCONNEXION (18 novembre 2026, fenêtre S2).
   Avant : « Quitter la console » n'effaçait que le stockage de l'appareil ; un jeton copié (30 jours en « rester connecté ») restait valable.
   Le vrai serveur, isolé sur 127.0.0.1, HTTP seulement + la VRAIE `doLogout`/`decoServeur` de tour.html contre lui :
     · le jeton meurt côté serveur (401 après la déconnexion), l'autre session du même compte survit ;
     · le jeton « rester connecté » dure 7 jours, pas 30 ; un jeton ordinaire 24 h ;
     · la route refuse un appel sans jeton (401) ; rien n'est écrit dans le journal en clair (jeton absent) ;
     · l'écran DIT l'échec quand le serveur n'a pas confirmé (réseau coupé) et reste silencieux sur un succès. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), net = require('net'), vm = require('vm');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3300-')); const enfants = [];
const fin = () => { enfants.forEach(e => { try { e.kill('SIGKILL'); } catch (x) {} }); try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin); setTimeout(() => { console.log('  ✗ banc FIGÉ'); fin(); process.exit(1); }, 90000).unref();
const libre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
console.log('\n── 3300 · la déconnexion de la Tour ──');
(async () => {
  let webpush; try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); } catch (e) { console.log('  … SAUTÉ : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  const kh = k => crypto.createHash('sha256').update(k).digest('hex'), MDP = 'mdp-banc-3300';
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true }); fs.writeFileSync(path.join(D, 'clients.json'), '{}'); fs.writeFileSync(path.join(D, 'espaces.json'), '{}');
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh(MDP) }));
  const PORT = await libre(); let journal = '';
  const e = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json') }), stdio: ['ignore', 'pipe', 'pipe'] });
  e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; }); enfants.push(e);
  const B = 'http://127.0.0.1:' + PORT; let vivant = false;
  for (let i = 0; i < 120 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
  vrai('le serveur démarre', vivant, journal.slice(0, 500)); if (!vivant) process.exit(1);
  let n = 0; const ip = () => '10.30.0.' + (++n);
  const login = async rester => (await (await fetch(B + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip() }, body: JSON.stringify({ nom: 'Patron', pass: MDP, rester }) })).json());
  const moi = async t => (await fetch(B + '/api/monitor/moi', { headers: { Authorization: 'Bearer ' + t, 'X-Forwarded-For': ip() } })).status;
  const deco = async t => (await fetch(B + '/api/monitor/logout', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', 'X-Forwarded-For': ip() }, t ? { Authorization: 'Bearer ' + t } : {}) })).status;
  const A = await login(false), Bs = await login(true);
  v('deux sessions vivantes', [await moi(A.token), await moi(Bs.token)], [200, 200]);
  v('sans jeton : 401', await deco(null), 401);
  v('la déconnexion répond 200', await deco(A.token), 200);
  v('⛔ le jeton déconnecté est MORT côté serveur', await moi(A.token), 401);
  v('…et un second appel est un 401 (déjà révoqué)', await deco(A.token), 401);
  v('l’autre session du même compte survit', await moi(Bs.token), 200);
  const sess = JSON.parse(fs.readFileSync(path.join(D, 'tour-sessions.json'), 'utf8'));
  vrai('la révocation est écrite sur le disque (survit au redémarrage)', !sess.some(x => x[0] === A.token) && sess.some(x => x[0] === Bs.token));
  const jours = (sess.find(x => x[0] === Bs.token)[1].exp - Date.now()) / 86400000;
  vrai('« rester connecté » dure 7 jours (pas 30)', jours > 6.9 && jours <= 7.001, jours);
  vrai('aucun jeton dans le journal du serveur', !journal.includes(Bs.token) && !journal.includes(A.token));
  /* la VRAIE quitterConsole+doLogout de tour.html */
  const SRC = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
  const i0 = SRC.indexOf('var _decoEnCours=false;'), i1 = SRC.indexOf('function decoEchecDire'), i2 = SRC.indexOf('\n', i1);
  vrai('(population) les fonctions sont trouvées', i0 > 0 && i1 > i0 && i2 > i1);
  const joue = async (api, token) => {
    const st = {}, ss = {}; let recharge = 0, err = { textContent: '' };
    const store = o => ({ getItem: k => (k in o ? o[k] : null), setItem: (k, x) => { o[k] = String(x); }, removeItem: k => { delete o[k]; } });
    const ctx = { API: api, TOKEN: token, fetch, AbortController, setTimeout, clearTimeout, sessionStorage: store(ss), localStorage: store(st), indexedDB: { deleteDatabase() {} },
      courrierDemonter() {}, opmDemonter() {}, location: { hash: '#x', reload() { recharge++; } }, document: { getElementById: id => id === 'lg-err' ? err : null }, Promise };
    vm.createContext(ctx); vm.runInContext(SRC.slice(i0, i2) + '\nthis.__fin=function(){return quitterConsole();}', ctx);
    ctx.sessionStorage.setItem('tour_token', token);
    ctx.__fin(); for (let k = 0; k < 100 && !recharge; k++) await dormir(50);
    vm.runInContext('decoEchecDire()', ctx);
    return { recharge, msg: err.textContent, jeton: ss.tour_token };
  };
  const C = await login(false);
  const r1 = await joue(B, C.token);
  v('quitterConsole : l’appareil est vidé, la page recharge, rien à dire', [r1.recharge, r1.jeton, r1.msg], [1, undefined, '']);
  v('⛔ …et le jeton est mort côté serveur', await moi(C.token), 401);
  const D2 = await login(false);
  const r2 = await joue('http://127.0.0.1:1', D2.token);
  vrai('serveur injoignable : l’appareil est quand même vidé', r2.recharge === 1 && r2.jeton === undefined);
  vrai('…et l’écran DIT que le serveur n’a pas confirmé', /serveur n’a pas confirmé/.test(r2.msg), r2.msg);
  v('…le jeton, lui, vit encore (on ne prétend pas le contraire)', await moi(D2.token), 200);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
})();
