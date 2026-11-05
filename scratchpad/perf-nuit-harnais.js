/* Harnais des mesures de performance de la nuit du 5 novembre 2026 (voir les sondes sonde-*.js du même jour). Bêta locale, 127.0.0.1, gzip comme GitHub Pages. */
/* Harnais de mesure (nuit du 5 novembre 2026) : bêta locale, 127.0.0.1, gzip comme GitHub Pages, Playwright + CDP. */
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const { chromium } = require('playwright');
const RACINE = process.env.RACINE || require('path').resolve(__dirname, '..');
const PAGE = process.env.PAGE || 'beta.html';
const gzc = new Map();
function serveur(journal) {
  const s = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    let f = (process.env.VARIANTE && (u === '/variante.html')) ? process.env.VARIANTE : path.join(RACINE, u === '/' ? '/index.html' : u === '/essai.html' ? '/beta.html' : u);
    if (!f.startsWith(RACINE) && f !== process.env.VARIANTE) { r.writeHead(403); return r.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { r.writeHead(404); return r.end(); }
      const t = /\.js$/.test(f) ? 'text/javascript' : /\.css$/.test(f) ? 'text/css' : /\.png$/.test(f) ? 'image/png' : /\.svg$/.test(f) ? 'image/svg+xml' : /\.mp3$/.test(f) ? 'audio/mpeg' : /\.(json|webmanifest)$/.test(f) ? 'application/json' : /\.html$/.test(f) ? 'text/html;charset=utf-8' : 'application/octet-stream';
      const h = { 'Content-Type': t, 'Cache-Control': 'max-age=600' };
      let body = d;
      if (/text|javascript|json|svg/.test(t) && /gzip/.test(q.headers['accept-encoding'] || '')) {
        if (!gzc.has(f)) gzc.set(f, zlib.gzipSync(d, { level: 6 }));
        body = gzc.get(f); h['Content-Encoding'] = 'gzip';
      }
      h['Content-Length'] = body.length;
      if (journal) journal.push({ u, taille: body.length, brut: d.length });
      r.writeHead(200, h); r.end(body);
    });
  });
  return new Promise(res => s.listen(0, '127.0.0.1', () => res({ s, port: s.address().port })));
}
const RESEAU = { aucun: null, '4g-faible': { offline: false, latency: 400, downloadThroughput: 1.6e6 / 8, uploadThroughput: 0.75e6 / 8 } };
/* ce qui s'exécute avant la page : l'API répond tout de suite (on compte les appels), les boîtes natives disent oui */
const INIT = `(() => { window.__t0 = performance.now(); window.__fetchs = [];
  const f0 = window.fetch; window.fetch = function (u, o) { const s = String((u && u.url) || u);
    if (/api\\.teamop\\.fr|\\/api\\//.test(s)) { window.__fetchs.push([Math.round(performance.now()), (o && o.method) || 'GET', s.replace(/^https?:\\/\\/[^/]+/, '').slice(0, 90)]);
      return Promise.resolve(new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json' } })); }
    return f0.apply(this, arguments); };
  window.confirm = () => true; window.alert = () => {}; window.prompt = (q, d) => d || '';
  const mo = new MutationObserver(() => { if (window.__tRendu != null) return; const c = document.getElementById('content');
    let u = null; try { u = (0, eval)('typeof currentUser!=="undefined"&&currentUser'); } catch (e) {}
    if (c && c.children.length && u) { window.__tRendu = performance.now(); mo.disconnect(); } });
  mo.observe(document, { childList: true, subtree: true });
})();`;
async function lancer() {
  return chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
}
const med = a => { const b = a.filter(x => x != null && !isNaN(x)).sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : NaN; };
const r1 = x => (x == null || isNaN(x)) ? '—' : Math.round(x * 10) / 10;
const dormir = ms => new Promise(r => setTimeout(r, ms));
module.exports = { serveur, lancer, INIT, RESEAU, med, r1, dormir, RACINE };
