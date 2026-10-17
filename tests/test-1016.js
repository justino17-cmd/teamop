/* ⛔ CE QUE CE FICHIER GARDE — LE RELAIS DE LA TOUR VERS L'ADMINISTRATION D'OP MESSAGES (17 octobre 2026).

   Justin : « la Tour contrôle OP GESTION, et l'autre côté contrôle OP MESSAGES ; bien tout séparé » — par api.teamop.fr.
   La Tour parle à `/api/monitor/messages/admin/<route>` ; le serveur relaie en boucle locale vers `/api/admin/<route>` du
   service d'OP MESSAGES (contrat : en-tête de `server-msg/admin.js`), qui n'admet une requête qu'avec DEUX preuves : la boucle
   locale sans aucun en-tête de proxy, et le secret dans `X-OPM-Admin`. On joue le VRAI serveur contre un FAUX service qui note
   tout ce qu'il reçoit :
     · il ne reçoit que six routes, en GET, avec les seuls paramètres du contrat — jamais le jeton de la Tour, un cookie, un
       `Origin`, un en-tête de proxy, un paramètre inventé ;
     · le secret de l'instance part, et jamais vers le navigateur ;
     · chaque échec se DIT autrement qu'un vide : sans secret (503), secret refusé (502, pas « aucun compte »), service
       muet (504), réponse qui n'est pas du JSON (502) ; un 400 ou un 429 du service garde son code ;
     · seule la console OP MESSAGES y entre (un compte d'OP GESTION seul : 403) ;
   puis l'outil de configuration (`server/configurer-relais-messages.js`) : il pose, vérifie, retire, ne touche à rien d'autre
   et n'affiche jamais le secret. Rien ne sort d'ici : 127.0.0.1, configuration et données jetables. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), crypto = require('crypto'), http = require('http');
const { spawn, spawnSync } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
const OUTIL = path.join(RACINE, 'server', 'configurer-relais-messages.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++; console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a))); };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const libre = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });

(async () => {
  console.log('\n── test-1016 : le relais de la Tour vers OP MESSAGES ──');
  if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) { console.log('  … SAUTÉE : server/node_modules absent'); console.log('\n0 ✓  0 ✗'); return; }
  const SECRET = crypto.randomBytes(32).toString('hex');
  /* ══ le FAUX service d'OP MESSAGES : il applique la garde du contrat, et il note tout ══ */
  const recus = [];
  let mode = 'normal';
  const faux = http.createServer((q, r) => {
    recus.push({ methode: q.method, url: q.url, entetes: Object.assign({}, q.headers) });
    const json = (code, o) => { r.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); r.end(JSON.stringify(o)); };
    const proxy = ['x-forwarded-for', 'x-real-ip', 'forwarded', 'x-forwarded-proto', 'x-forwarded-host'].some(h => q.headers[h] !== undefined);
    if (q.headers['x-opm-admin'] !== SECRET || proxy || q.method !== 'GET') return json(404, { error: 'introuvable' });
    const u = new URL(q.url, 'http://x');
    if (mode === 'muet') return;   // ne répond jamais : le relais doit couper
    if (mode === 'html') { r.writeHead(200, { 'Content-Type': 'text/html' }); return r.end('<h1>oups</h1>'); }
    if (u.pathname === '/api/admin/sante') return json(200, { instance: 'beta', version: 12, decompte: { espaces: 3 } });
    if (u.pathname === '/api/admin/comptes') {
      if (u.searchParams.get('limite') === '9999') return json(400, { error: 'parametre_invalide', champ: 'limite' });
      return json(200, { total: 1, tout_ouvert: false, items: [{ id: 'p_' + 'a'.repeat(32), origine: 'courriel', etat: 'actif', ident: 'Ana#1234' }], suivant: null });
    }
    if (u.pathname === '/api/admin/incidents') return json(429, { error: 'quota_atteint', retry: 30 });
    return json(404, { error: 'introuvable' });
  });
  await new Promise(r => faux.listen(0, '127.0.0.1', r));
  const PORT_FAUX = faux.address().port;

  /* ══ le VRAI serveur ══ */
  const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b1016-'));
  const D = path.join(banc, 'data'); fs.mkdirSync(D);
  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
  const vap = webpush.generateVAPIDKeys();
  const MDP = 'mot-de-passe-du-banc-1016', MDP_G = 'gestion-seule-1016-mdp';
  const kh = k => crypto.createHash('sha256').update(k).digest('hex');
  const CONFIG = path.join(banc, 'config.json');
  fs.writeFileSync(CONFIG, JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh(MDP), messagesAdmin: { beta: SECRET } }));
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ issues: [], journal: [], archive: [], users: [
    { id: 'upatron', nom: 'Patron', hash: kh(MDP), role: 'patron', actif: true, ts: Date.now() },
    { id: 'ugestion', nom: 'Gestion', hash: kh(MDP_G), role: 'collaborateur', actif: true, ts: Date.now(), apps: ['gestion'] }] }));
  const port = await libre(), B = 'http://127.0.0.1:' + port;
  let sortie = '';
  const srv = spawn(process.execPath, [SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: CONFIG, TEAMOP_DATA: D, PORT: String(port),
    TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_MSG_BETA_URL: 'http://127.0.0.1:' + PORT_FAUX, TEAMOP_MSG_PROD_URL: 'http://127.0.0.1:' + PORT_FAUX }), stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stdout.on('data', d => { sortie += d; }); srv.stderr.on('data', d => { sortie += d; });
  const fin = () => { try { srv.kill('SIGKILL'); } catch (e) {} try { faux.close(); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
  process.on('exit', fin);
  let vivant = false;
  for (let i = 0; i < 150 && !vivant; i++) { await dormir(100); try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} }
  vrai('le vrai serveur démarre', vivant, sortie.slice(0, 300));
  const login = async (nom, pass) => (await (await fetch(B + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom, pass }) })).json()).token;
  const PATRON = await login('Patron', MDP), GESTION = await login('Gestion', MDP_G);
  vrai('(population) deux sessions de la Tour : le patron, et un compte d\'OP GESTION seul', PATRON && GESTION);
  const lire = async (chemin, jeton, entetes) => { const r = await fetch(B + chemin, { headers: Object.assign({ Authorization: 'Bearer ' + jeton }, entetes || {}) });
    const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) {} return { s: r.status, j: j || {}, txt }; };

  /* 1. ce qui part, ce qui revient */
  let n0 = recus.length;
  let r = await lire('/api/monitor/messages/admin/comptes?instance=beta&limite=20&origine=courriel&invente=1&token=abc', PATRON,
    { Cookie: 'session=volee', Origin: 'https://teamop.fr', 'X-Forwarded-For': '203.0.113.9', 'X-OPM': 'page' });
  v('comptes : 200, la réponse du service rendue telle quelle sous « donnees »', [r.s, r.j.ok, r.j.instance, r.j.donnees && r.j.donnees.total], [200, true, 'beta', 1]);
  const e = recus[n0] || { entetes: {}, url: '' };
  v('(population) le service a reçu UNE requête', recus.length - n0, 1);
  v('elle vise la route du contrat, avec SEULEMENT les paramètres du contrat', e.url, '/api/admin/comptes?limite=20&origine=courriel');
  v('elle porte le secret de l\'instance', e.entetes['x-opm-admin'] === SECRET, true);
  v('⛔ rien de la Tour ne passe : ni son jeton, ni cookie, ni Origin, ni en-tête de proxy, ni X-OPM',
    ['authorization', 'cookie', 'origin', 'x-forwarded-for', 'x-real-ip', 'forwarded', 'x-opm'].filter(h => e.entetes[h] !== undefined), []);
  vrai('⛔ le secret ne revient jamais vers le navigateur', !r.txt.includes(SECRET));
  r = await lire('/api/monitor/messages/admin/sante?instance=beta', PATRON);
  v('santé : 200', [r.s, r.j.donnees && r.j.donnees.version], [200, 12]);

  /* 2. ce qui ne passe pas */
  n0 = recus.length;
  r = await lire('/api/monitor/messages/admin/supprimer?instance=beta', PATRON);
  v('une route hors contrat : 404, et le service n\'est même pas appelé', [r.s, recus.length - n0], [404, 0]);
  r = await lire('/api/monitor/messages/admin/sante?instance=autre', PATRON);
  v('une instance inconnue : 400', r.s, 400);
  r = await lire('/api/monitor/messages/admin/sante?instance=prod', PATRON);
  v('une instance sans secret posé : 503 « relais non configuré » — rien n\'est appelé', [r.s, r.j.motif, recus.length - n0], [503, 'sans_secret', 0]);
  r = await lire('/api/monitor/messages/admin/sante?instance=beta', GESTION);
  v('un compte d\'OP GESTION seul : 403, la console OP MESSAGES ne lui est pas ouverte', [r.s, r.j.app], [403, 'messages']);
  r = await fetch(B + '/api/monitor/messages/admin/sante?instance=beta');
  vrai('sans session : refusé', r.status === 401 || r.status === 403, r.status);
  v('(population) aucun de ces refus n\'a atteint le service', recus.length - n0, 0);

  /* 3. les échecs du service se DISENT */
  r = await lire('/api/monitor/messages/admin/comptes?instance=beta&limite=9999', PATRON);
  v('un paramètre refusé par le service : 400, avec le champ', [r.s, r.j.error, r.j.champ], [400, 'parametre_invalide', 'limite']);
  r = await lire('/api/monitor/messages/admin/incidents?instance=beta', PATRON);
  v('le plafond du service : 429, avec le délai', [r.s, r.j.retry], [429, 30]);
  r = await lire('/api/monitor/messages/admin/espaces?instance=beta', PATRON);
  v('⛔ un 404 du service (sa garde) devient 502 « refuse le relais » — jamais une liste vide', [r.s, r.j.motif], [502, 'refuse']);
  mode = 'html';
  r = await lire('/api/monitor/messages/admin/sante?instance=beta', PATRON);
  v('une réponse qui n\'est pas du JSON : 502', [r.s, r.j.motif], [502, 'forme']);
  mode = 'muet';
  const t0 = Date.now();
  r = await lire('/api/monitor/messages/admin/sante?instance=beta', PATRON);
  v('un service muet : 504, et le relais coupe (≈ 4 s)', [r.s, r.j.motif], [504, 'delai']);
  vrai('…en moins de 6 s', Date.now() - t0 < 6000, Date.now() - t0);
  mode = 'normal';
  vrai('⛔ le secret n\'est jamais dans le journal du serveur', !sortie.includes(SECRET));
  fin();

  /* ══ 4. l'outil de configuration ══ */
  const conf = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'b1016c-')), 'config.json');
  fs.writeFileSync(conf, JSON.stringify({ vapidPublicKey: 'pub', autre: { garde: 1 } }));
  const S2 = crypto.randomBytes(32).toString('hex');
  const outil = (args, entree) => spawnSync(process.execPath, [OUTIL].concat(args), { input: entree, encoding: 'utf8', env: Object.assign({}, process.env, { TEAMOP_CONFIG: conf, TEAMOP_MSG_BETA_URL: 'http://127.0.0.1:1' }) });
  let x = outil(['beta'], S2 + '\n');
  const lu = JSON.parse(fs.readFileSync(conf, 'utf8'));
  v('l\'outil pose le secret de l\'instance demandée, et rien d\'autre ne bouge', [x.status, lu.messagesAdmin && lu.messagesAdmin.beta === S2, lu.autre, lu.vapidPublicKey], [0, true, { garde: 1 }, 'pub']);
  vrai('⛔ il n\'affiche jamais le secret (ni en sortie, ni en erreur)', !(x.stdout + x.stderr).includes(S2));
  vrai('il dit l\'empreinte courte, la même que côté OP MESSAGES', (x.stdout || '').includes(crypto.createHash('sha256').update(S2).digest('hex').slice(0, 8)));
  vrai('il éprouve la paire, et dit quand OP MESSAGES ne répond pas', /injoignable/.test(x.stdout || ''), x.stdout);
  vrai('le fichier reste en 0600', (fs.statSync(conf).mode & 0o777) === 0o600, (fs.statSync(conf).mode & 0o777).toString(8));
  x = outil(['beta', '--verifier'], S2 + '\n');
  v('« --verifier » avec la bonne valeur : identique', [x.status, /identique/.test(x.stdout)], [0, true]);
  x = outil(['beta', '--verifier'], 'b'.repeat(64) + '\n');
  v('« --verifier » avec une autre valeur : différent, code 1', [x.status, /différent/.test(x.stdout)], [1, true]);
  x = outil(['beta'], 'pas-un-secret\n');
  v('une valeur qui n\'a pas la forme : refusée, rien n\'est modifié', [x.status, JSON.parse(fs.readFileSync(conf, 'utf8')).messagesAdmin.beta === S2], [1, true]);
  x = outil(['beta', '--retirer'], '');
  v('« --retirer » ferme le relais, le reste demeure', [x.status, JSON.parse(fs.readFileSync(conf, 'utf8')).messagesAdmin, JSON.parse(fs.readFileSync(conf, 'utf8')).autre], [0, undefined, { garde: 1 }]);
  try { fs.rmSync(path.dirname(conf), { recursive: true, force: true }); } catch (e) {}

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
