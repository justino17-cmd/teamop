/* ══ CE QUE LA VIGIE FAIT VRAIMENT D'UN REJET IndexedDB ═══════════════════════════════════
   On ouvre beta.html dans un vrai navigateur, on intercepte les deux routes de signalement,
   et on jette deux promesses : celle de WebKit (le poll de Firebase Auth) et une VRAIE erreur
   d'application. On regarde ce qui part.
   ⛔ beta.html, jamais app.html : règle du dépôt pour tout navigateur piloté.
   Usage : node sonde-idb.js */
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const R = '/home/user/teamop';
const srv = http.createServer((q, r) => {
  const x = path.join(R, q.url.split('?')[0]);
  fs.readFile(x, (e, d) => e ? (r.writeHead(404), r.end())
    : (r.writeHead(200, { 'Content-Type': x.endsWith('.js') ? 'text/javascript' : 'text/html;charset=utf-8' }), r.end(d)));
}).listen(8182, '127.0.0.1');

const WEBKIT = 'Attempt to get records from database without an in-progress transaction';

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  const p = await nav.newPage();
  const partis = [];
  /* On coupe TOUT vers l'extérieur : rien ne doit joindre api.teamop.fr depuis un banc d'essai. */
  await p.route('**://api.teamop.fr/**', route => {
    const req = route.request();
    if (/\/api\/bug|\/api\/monitor\/report/.test(req.url())) partis.push({ url: req.url().replace(/^https?:\/\/[^/]+/, ''), body: (req.postData() || '').slice(0, 400) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await p.route('**://www.gstatic.com/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '/* neutralisé */' }));

  await p.goto('http://127.0.0.1:8182/beta.html', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => typeof APP_VERSION !== 'undefined', { timeout: 30000 });

  const r = await p.evaluate(async (msg) => {
    const lire = () => { try { return JSON.parse(localStorage.getItem('top_monitor_q') || '[]'); } catch (e) { return []; } };
    try { localStorage.setItem('top_monitor_q', '[]'); } catch (e) {}
    const avant = lire().length;
    /* 1. Le rejet de WebKit, mot pour mot, tel qu'il arrive du poll de Firebase Auth. */
    Promise.reject(Object.assign(new Error(msg), { name: 'UnknownError' }));
    /* 2. Une VRAIE erreur d'application : elle DOIT continuer de passer. */
    Promise.reject(new Error('boum — vraie erreur applicative'));
    await new Promise(r => setTimeout(r, 400));
    return { avant, file: lire().map(x => String(x.msg || x.message || JSON.stringify(x)).slice(0, 120)) };
  }, WEBKIT);

  await new Promise(r => setTimeout(r, 600));
  console.log('\n  ── /api/bug (la console « Erreurs ») ──');
  if (!partis.length) console.log('    (rien envoyé)');
  partis.forEach(x => { let m = ''; try { m = JSON.parse(x.body).msg || ''; } catch (e) { m = x.body; } console.log('    ' + x.url + ' → ' + m.slice(0, 110)); });
  console.log('\n  ── file du moniteur (top_monitor_q) ──');
  if (!r.file.length) console.log('    (file vide)');
  r.file.forEach(m => console.log('    ' + m));
  await nav.close(); srv.close();
})();
