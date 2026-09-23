/* Pilote CDP réutilisable pour les sondes d'OP GESTION.
   ⛔ Copie LOCALE de beta.html (préfixe elanB_, espace bêta), servie sur 127.0.0.1 — jamais
   app.html, jamais teamop.fr : le navigateur piloté expose tout le contenu de la page. */
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), http = require('http');
const { spawn } = require('child_process');
const RACINE = '/home/user/teamop';
const CHROME = '/opt/pw-browsers/chromium';
const COPIE = '/tmp/claude-0/-home-user-teamop/2b5579ae-09a0-571f-9bc9-ac0e61b4c7de/scratchpad/essai/essai.html';

const dormir = ms => new Promise(r => setTimeout(r, ms));
const portLibre = () => new Promise(res => { const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

function cdpClient(ws) {
  let id = 0; const A = new Map(), E = [];
  ws.addEventListener('message', ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.id && A.has(m.id)) { const a = A.get(m.id); A.delete(m.id); m.error ? a.rej(new Error(m.error.message)) : a.res(m.result); }
    else if (m.method) E.forEach(f => { try { f(m); } catch (e) {} }); });
  return { envoyer(me, pa) { const i = ++id;
      return new Promise((res, rej) => { A.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: me, params: pa || {} })); }); },
    sur(f) { E.push(f); } };
}

/* ⛔⛔ UNE COPIE PLUS VIEILLE QUE LA PAGE QU'ELLE DOUBLE REND UN VERDICT SUR UNE AUTRE
   VERSION — pris le 22 septembre 2026, et c'est la règle du dépôt appliquée à son propre
   outil. L'audit total tournait depuis dix minutes sur `723-beta` pendant que la correction
   mesurée vivait en `724-beta` : aucun signe, aucune erreur, juste des chiffres d'hier.
   La copie se RAFRAÎCHIT donc à chaque ouverture, et la version servie est RENDUE pour que
   toute sonde puisse l'affirmer. Une sonde de MUTATION (qui écrit dans la copie exprès)
   passe `{garderCopie:true}` — c'est un geste conscient, plus un oubli silencieux. */
async function ouvrir(opts) {
  const o = opts || {};
  const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'opg-'));
  const pp = await portLibre(), pc = await portLibre();
  if (!o.garderCopie) {
    const src = o.source || path.join(RACINE, 'beta.html');
    fs.mkdirSync(path.dirname(COPIE), { recursive: true });
    fs.copyFileSync(src, COPIE);
  }
  const PAGE = fs.readFileSync(COPIE, 'utf8');
  const version = (PAGE.match(/APP_VERSION\s*=\s*'([^']*)'/) || [])[1] || '?';

  const statique = http.createServer((q, r) => {
    const u = q.url.split('?')[0].split('#')[0];
    if (u === '/' || u === '/essai.html' || u === '/beta.html') {
      r.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' }); return r.end(PAGE); }
    /* `servir` : des fichiers qui ne vivent PAS dans le dépôt (le moteur de lecture d'étiquettes,
       4,8 Mo) — on les sert tels quels, sans Content-Encoding : le moteur décompresse lui-même. */
    for (const [pre, dir] of Object.entries(o.servir || {})) {
      if (!u.startsWith(pre)) continue;
      const f = path.join(dir, u.slice(pre.length));
      if (!f.startsWith(dir)) { r.writeHead(403); return r.end(); }
      return fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); }
        r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.png') ? 'image/png' : 'application/octet-stream', 'Access-Control-Allow-Origin': '*' }); r.end(d); }); }
    const x = path.join(RACINE, u.replace(/^\/+/, ''));
    if (!x.startsWith(RACINE)) { r.writeHead(403); return r.end(); }
    fs.readFile(x, (e, d) => { if (e) { r.writeHead(404); return r.end(); }
      const t = x.endsWith('.js') ? 'text/javascript' : x.endsWith('.css') ? 'text/css'
        : x.endsWith('.png') ? 'image/png' : x.endsWith('.svg') ? 'image/svg+xml'
        : /\.(json|webmanifest)$/.test(x) ? 'application/json' : 'text/html;charset=utf-8';
      r.writeHead(200, { 'Content-Type': t }); r.end(d); });
  });
  await new Promise(res => statique.listen(pp, '127.0.0.1', res));

  const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--remote-debugging-port=' + pc, '--user-data-dir=' + path.join(BANC, 'ch'), 'about:blank'],
    { stdio: ['ignore', 'pipe', 'pipe'] });
  for (let i = 0; i < 150; i++) { await dormir(100);
    try { if ((await fetch('http://127.0.0.1:' + pc + '/json/version')).ok) break; } catch (e) {} }

  const BASE = 'http://127.0.0.1:' + pp;
  const cible = await (await fetch('http://127.0.0.1:' + pc + '/json/new?' + encodeURIComponent(BASE + '/essai.html'), { method: 'PUT' })).json();
  const ws = new WebSocket(cible.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  const c = cdpClient(ws);

  const exceptions = [], consoleErr = [];
  c.sur(m => {
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails;
      exceptions.push(String((d.exception && (d.exception.description || d.exception.value)) || d.text).split('\n').slice(0, 2).join(' | ')); }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
      consoleErr.push((m.params.args || []).map(a => a.value || a.description || '').join(' ').split('\n').slice(0, 2).join(' | ').slice(0, 200));
  });
  await c.envoyer('Runtime.enable'); await c.envoyer('Page.enable');
  /* ⛔ PAS DE SECONDE NAVIGATION. La cible a DÉJÀ été ouverte sur cette adresse par
     /json/new. Renaviguer rechargeait la page une deuxième fois — et le premier chargement
     écrit six clés dans le rangement, donc au second APPAREIL_DEJA_VU vaut VRAI et l'app
     VIDE toutes ses collections de démonstration (app.html, la garde du semis). La sonde
     fabriquait donc une base à 2 enregistrements et aurait pu le prendre pour un défaut. */

  const ev = async (expr) => {
    const r = await c.envoyer('Runtime.evaluate', { expression: '(async()=>{' + expr + '})()', awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
    return r.result.value;
  };
  /* on attend que l'application ait construit sa base */
  /* ⛔ UNE PAGE QUI NE DÉMARRE PAS DOIT LE DIRE. Cette boucle continuait en silence au bout de
     45 s : le 22 septembre 2026, sous la charge de trois navigateurs, la relance de l'audit
     profond est morte à la ligne suivante sur « db is not defined » — une erreur qui ne
     nomme pas la cause. On attend jusqu'à 90 s, puis on s'arrête en la nommant. */
  let pret = false;
  for (let i = 0; i < 300; i++) { await dormir(300);
    try { if (await ev('return typeof db !== "undefined" && !!db')) { pret = true; break; } } catch (e) {} }
  if (!pret) { try { chrome.kill('SIGKILL'); } catch (e) {} try { statique.close(); } catch (e) {}
    throw new Error('la page n’a pas démarré : `db` absent après 90 s (charge de la machine ? erreur au chargement ?)'); }
  /* les fenêtres modales natives bloquent le pilotage : on répond toujours oui */
  await ev('window.confirm=()=>true; window.alert=()=>{}; window.prompt=(q,d)=>d||""; return 1;');

  const fermer = () => { try { chrome.kill('SIGKILL'); } catch (e) {} try { statique.close(); } catch (e) {}
    try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {} };
  return { ev, c, exceptions, consoleErr, fermer, BASE, version };
}
module.exports = { ouvrir, dormir };
