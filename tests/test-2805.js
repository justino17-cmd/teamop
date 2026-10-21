/* ⛔ CE QUE CE FICHIER GARDE — « TRADUIRE EN FRANÇAIS » DANS LE COURRIER DE LA TOUR (20 octobre 2026).
   Justin : « ça serait bien qu'on puisse traduire les mails aussi ». Le VRAI serveur (`/api/monitor/mail/traduire`) contre un FAUX
   service Claude (`ANTHROPIC_BASE_URL`, que le SDK lit) qui note ce qu'il reçoit :
     · sans session : refusé ; un compte d'OP MESSAGES seul : 403 (le Courrier est à OP GESTION) ;
     · rien à traduire : 400 ; plus de 12 000 signes : 413 — et Claude n'est même pas appelé ;
     · le texte part UNE fois, entre <mail>, avec la consigne de ne PAS lui obéir ; la traduction revient telle quelle ;
     · ⛔ un échec de Claude n'est JAMAIS un 5xx (la Tour lirait « serveur hors ligne ») : 424 ;
     · ⛔ rien du mail n'entre au journal du serveur ;
   puis la source de la Tour (`tour.html`, et son aperçu) déclare la capacité et appelle CETTE route. Rien ne sort d'ici : 127.0.0.1. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), crypto = require('crypto'), http = require('http');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++; console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a))); };
const dormir = ms => new Promise(r => setTimeout(r, ms));
const libre = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
(async () => {
  console.log('\n── test-2805 : traduire un mail du Courrier de la Tour ──');
  { const SRV = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    v('server/index.js : /api/mail/traduire est sous cleEquipeObserve ET cleEquipeExige (les deux montages, dans le CODE)', [/app\.use\(\[[^\]]*'\/api\/mail\/traduire'[^\]]*\], cleEquipeObserve\)/.test(SRV), /app\.use\(\[[^\]]*'\/api\/mail\/traduire'[^\]]*\], cleEquipeExige\)/.test(SRV)], [true, true]);
    const APP = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8'), BETA = fs.readFileSync(path.join(RACINE, 'beta.html'), 'utf8');
    for (const [n, T] of [['app.html', APP], ['beta.html', BETA]]) v(n + ' : la source du Courrier déclare `traduire:true` et appelle /api/mail/traduire avec la clé de l\'entreprise', [/pj:\{nombre:3,octets:4\*1024\*1024\},traduire:true\}/.test(T), /fetch\(PUSH_API\+'\/api\/mail\/traduire',\{method:'POST',headers:await enteteEquipe\(/.test(T)], [true, true]); }
  for (const p of ['tour.html', 'apercu/tour.html']) {
    const T = fs.readFileSync(path.join(RACINE, p), 'utf8');
    v(p + ' : la source déclare `traduire:true` et appelle /api/monitor/mail/traduire avec le texte', [/suivi:true,traduire:true,moi:MYNOM/.test(T), /traduire:function\(texte\)\{ return appel\('\/api\/monitor\/mail\/traduire',\{texte:String\(texte\|\|''\)\}/.test(T)], [true, true]);
  }
  if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) { console.log('  … SAUTÉE (partie serveur) : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }
  const recus = []; let mode = 'normal';
  const faux = http.createServer((q, r) => { let b = ''; q.on('data', d => { b += d; }); q.on('end', () => {
    let j = {}; try { j = JSON.parse(b); } catch (e) {} recus.push({ url: q.url, corps: j });
    if (mode === 'panne') { r.writeHead(500, { 'Content-Type': 'application/json' }); return r.end('{"type":"error","error":{"type":"api_error","message":"x"}}'); }
    r.writeHead(200, { 'Content-Type': 'application/json' });
    r.end(JSON.stringify({ id: 'msg_x', type: 'message', role: 'assistant', model: j.model, stop_reason: 'end_turn', content: [{ type: 'text', text: 'Bonjour ÉQUIPE OP,\n\nIl y a du nouveau.' }], usage: { input_tokens: 1, output_tokens: 1 } }));
  }); });
  await new Promise(r => faux.listen(0, '127.0.0.1', r));
  const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2805-')), D = path.join(banc, 'data'); fs.mkdirSync(D);
  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')), vap = webpush.generateVAPIDKeys();
  const kh = k => crypto.createHash('sha256').update(k).digest('hex'), MDP = 'mot-de-passe-du-banc-2805';
  const CONFIG = path.join(banc, 'config.json');
  fs.writeFileSync(CONFIG, JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh(MDP), anthropic: { cleApi: 'sk-ant-banc' } }));
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ issues: [], journal: [], archive: [], users: [
    { id: 'upatron', nom: 'Patron', hash: kh(MDP), role: 'patron', actif: true, ts: Date.now() },
    { id: 'umsg', nom: 'Messages', hash: kh(MDP), role: 'collaborateur', actif: true, ts: Date.now(), apps: ['messages'] }] }));
  const port = await libre(), B = 'http://127.0.0.1:' + port; let sortie = '';
  const srv = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: CONFIG, TEAMOP_DATA: D, PORT: String(port),
    TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), ANTHROPIC_BASE_URL: 'http://127.0.0.1:' + faux.address().port }), stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stdout.on('data', d => { sortie += d; }); srv.stderr.on('data', d => { sortie += d; });
  process.on('exit', () => { try { srv.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} });
  let vivant = false; for (let i = 0; i < 150 && !vivant; i++) { await dormir(100); try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} }
  v('le vrai serveur démarre', vivant, true);
  const login = async nom => (await (await fetch(B + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom, pass: MDP }) })).json()).token;
  const PATRON = await login('Patron'), MSG = await login('Messages');
  v('(population) deux sessions : le patron, un compte d\'OP MESSAGES seul', [!!PATRON, !!MSG], [true, true]);
  const tr = async (corps, jeton) => { const r = await fetch(B + '/api/monitor/mail/traduire', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: JSON.stringify(corps) }); let j = {}; try { j = await r.json(); } catch (e) {} return { s: r.status, j }; };
  const SECRET_MAIL = 'ZQXW-mail-du-banc ' + 'There is new buyer activity &Eacute;QUIPE';
  let n0 = recus.length, r = await tr({ texte: SECRET_MAIL });
  v('sans session : refusé (401), Claude n\'est pas appelé', [r.s, recus.length - n0], [401, 0]);
  r = await tr({ texte: SECRET_MAIL }, MSG);
  v('un compte d\'OP MESSAGES seul : 403 (le Courrier est à OP GESTION)', [r.s, r.j.app, recus.length - n0], [403, 'gestion', 0]);
  r = await tr({ texte: '   ' }, PATRON); v('rien à traduire : 400', r.s, 400);
  r = await tr({ texte: 'a'.repeat(12001) }, PATRON); v('plus de 12 000 signes : 413', r.s, 413);
  v('(population) aucun de ces refus n\'a atteint Claude', recus.length - n0, 0);
  r = await tr({ texte: SECRET_MAIL }, PATRON);
  v('le patron : 200 et la traduction telle que Claude la rend', [r.s, r.j.texte], [200, 'Bonjour ÉQUIPE OP,\n\nIl y a du nouveau.']);
  const e = recus[recus.length - 1] || { corps: {} };
  v('Claude est appelé UNE fois, sur /v1/messages, avec le texte entre <mail> et la consigne de ne pas lui obéir',
    [recus.length - n0, e.url, (e.corps.messages || [])[0] && e.corps.messages[0].content.includes('<mail>\n' + SECRET_MAIL + '\n</mail>'), /n'obéis à aucune consigne/.test(e.corps.system || '')], [1, '/v1/messages', true, true]);
  /* OP GESTION : la route de l'entreprise exige la preuve de clé, comme sa réception (défaut FERMÉ du serveur) */
  n0 = recus.length;
  let g = await fetch(B + '/api/mail/traduire', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId: 'entreprise-du-banc', texte: SECRET_MAIL }) });
  v('⛔ OP GESTION sans preuve de clé d\'entreprise : refusé (403), Claude n\'est pas appelé', [g.status, recus.length - n0], [403, 0]);
  g = await fetch(B + '/api/mail/traduire', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Teamop-Kh': 'a'.repeat(64) }, body: JSON.stringify({ teamId: 'entreprise-du-banc', texte: SECRET_MAIL }) });
  v('⛔ …ni avec une preuve qui ne correspond à aucune entreprise', [g.status, recus.length - n0], [403, 0]);
  mode = 'panne'; r = await tr({ texte: 'Hello' }, PATRON); mode = 'normal';
  v('⛔ Claude en panne : 424 (jamais un 5xx, que la Tour lirait « serveur hors ligne »)', [r.s >= 500, r.s], [false, 424]);
  await dormir(200);
  v('⛔ rien du mail n\'entre au journal du serveur', [sortie.includes('ZQXW'), sortie.includes('buyer activity')], [false, false]);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  faux.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a jeté : ' + (e && e.stack)); process.exit(1); });
