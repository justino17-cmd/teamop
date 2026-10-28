/* Pilote de la démonstration publique — Chromium en CDP, demo.html servie en 127.0.0.1, RÉSEAU SURVEILLÉ.
   ⛔ Ce navigateur ne vise que 127.0.0.1 (CLAUDE.md : le proxy sortant coupe le reste, et la démonstration n'a de toute façon rien à
   envoyer). La surveillance part AVANT la première navigation : une requête du chargement lui-même ne passe pas à travers.
   Rend { ev, snap, reseau, exterieur, bloques, exceptions, erreurs, goto, fermer, BASE }.
   `reseau` : toutes les requêtes vues ; `exterieur` : celles qui visent autre chose que 127.0.0.1 / data: / blob: — doit rester VIDE ;
   `bloques` : requêtes que la politique de contenu a refusées (le filet) — doit rester vide aussi sur un parcours normal.         */
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), http = require('http');
const { spawn } = require('child_process');
const RACINE = process.env.OPG_RACINE || path.resolve(__dirname, '..', '..');
const CHROME = '/opt/pw-browsers/chromium';
const dormir = ms => new Promise(r => setTimeout(r, ms));
const portLibre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

async function ouvrir(o) {
  o = o || {};
  const page = o.page || 'demo.html';
  const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'opd-'));
  const pp = await portLibre(), pc = await portLibre();
  const statique = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0].split('#')[0]);
    /* `proxyApi` (un port, 127.0.0.1 seulement) : les appels `/api/…` de la page de commande vont au VRAI serveur du dépôt, lancé isolément par la sonde — jamais api.teamop.fr */
    if (o.proxyApi && u.indexOf('/api/') === 0) {
      const p = http.request({ host: '127.0.0.1', port: o.proxyApi, path: q.url, method: q.method, headers: q.headers }, rs => { r.writeHead(rs.statusCode, rs.headers); rs.pipe(r); });
      p.on('error', () => { r.writeHead(502); r.end(); }); return q.pipe(p);
    }
    const x = path.join(RACINE, u === '/' ? page : u.replace(/^\/+/, ''));
    if (!x.startsWith(RACINE)) { r.writeHead(403); return r.end(); }
    fs.readFile(x, (e, d) => { if (e) { r.writeHead(404); return r.end(); }
      const t = x.endsWith('.js') ? 'text/javascript' : x.endsWith('.css') ? 'text/css' : x.endsWith('.png') ? 'image/png' : x.endsWith('.svg') ? 'image/svg+xml'
        : /\.(json|webmanifest)$/.test(x) ? 'application/json' : 'text/html;charset=utf-8';
      r.writeHead(200, { 'Content-Type': t }); r.end(d); });
  });
  await new Promise(res => statique.listen(pp, '127.0.0.1', res));
  const BASE = 'http://127.0.0.1:' + pp;
  const rendu = process.env.CPU ? ['--disable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'];
  const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', ...rendu, '--disable-dev-shm-usage', '--remote-debugging-port=' + pc, '--user-data-dir=' + path.join(BANC, 'ch'), 'about:blank'],
    { stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  const tuer = () => { try { process.kill(-chrome.pid, 'SIGKILL'); } catch (e) { try { chrome.kill('SIGKILL'); } catch (x) { /* déjà mort */ } } };
  for (let i = 0; i < 150; i++) { await dormir(100); try { if ((await fetch('http://127.0.0.1:' + pc + '/json/version')).ok) break; } catch (e) { /* pas encore */ } }
  const cible = await (await fetch('http://127.0.0.1:' + pc + '/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(cible.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  let id = 0; const A = new Map(), E = [];
  ws.addEventListener('message', ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.id && A.has(m.id)) { const a = A.get(m.id); A.delete(m.id); m.error ? a.rej(new Error(m.error.message)) : a.res(m.result); }
    else if (m.method) E.forEach(f => { try { f(m); } catch (e) { /* un écouteur ne doit pas casser le pilote */ } }); });
  const c = { envoyer(me, pa) { const i = ++id; return new Promise((res, rej) => { A.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: me, params: pa || {} })); }); }, sur(f) { E.push(f); } };

  const reseau = [], exterieur = [], bloques = [], exceptions = [], erreurs = [], violations = [];
  const dehors = u => !(/^(data|blob|about):/i.test(u) || u.indexOf(BASE + '/') === 0 || u === BASE);
  c.sur(m => {
    if (m.method === 'Network.requestWillBeSent') { const u = m.params.request.url; reseau.push(u); if (dehors(u)) exterieur.push(m.params.type + ' ' + u); }
    if (m.method === 'Network.loadingFailed' && m.params.blockedReason) bloques.push(m.params.blockedReason + ' ' + (m.params.requestId));
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails;
      exceptions.push(String((d.exception && (d.exception.description || d.exception.value)) || d.text).split('\n').slice(0, 2).join(' | ')); }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
      erreurs.push((m.params.args || []).map(a => a.value || a.description || '').join(' ').split('\n').slice(0, 2).join(' | ').slice(0, 220));
    if (m.method === 'Log.entryAdded' && /Content Security Policy|Refused to/i.test(m.params.entry.text || '')) violations.push(String(m.params.entry.text).slice(0, 220));
  });
  await c.envoyer('Network.enable'); await c.envoyer('Runtime.enable'); await c.envoyer('Page.enable'); await c.envoyer('Log.enable');

  const ev = async (expr) => {
    const r = await c.envoyer('Runtime.evaluate', { expression: '(async()=>{' + expr + '})()', awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
    return r.result.value;
  };
  const S = { ev, c, reseau, exterieur, bloques, exceptions, erreurs, violations, BASE, dormir, fermer: null };
  S.profil = async (largeur, hauteur, mobile, theme) => {
    await c.envoyer('Emulation.setDeviceMetricsOverride', { width: largeur, height: hauteur, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile });
    if (mobile) await c.envoyer('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }).catch(() => {});
    if (theme) await c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  };
  S.goto = async (url) => { await c.envoyer('Page.navigate', { url: url.indexOf('http') === 0 ? url : BASE + url }); await dormir(600); };
  S.attendre = async (expr, ms) => { const fin = Date.now() + (ms || 20000); while (Date.now() < fin) { try { if (await ev('return !!(' + expr + ')')) return true; } catch (e) { /* page en chargement */ } await dormir(250); } return false; };
  S.snap = async (fichier, clip) => { const a = { format: 'png' }; if (clip) a.clip = Object.assign({ scale: 1 }, clip);
    const cap = await c.envoyer('Page.captureScreenshot', a); fs.mkdirSync(path.dirname(fichier), { recursive: true }); fs.writeFileSync(fichier, Buffer.from(cap.data, 'base64')); return fichier; };
  S.fermer = () => { tuer(); try { statique.close(); } catch (e) { /* idem */ } try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) { /* idem */ } };
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.once(sig, () => { tuer(); process.exit(130); });
  process.once('exit', tuer);
  return S;
}
module.exports = { ouvrir, dormir, RACINE };
