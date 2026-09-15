/* ══ LE RENDU RÉEL, SANS LA TRANSITION QUI MASQUE TOUT ═══════════════════════════════════
   `go()` passe par document.startViewTransition et rend la main AVANT que l'écran soit
   dessiné : chronométrer `go()` ne mesure que l'ordonnancement. On appelle donc
   `rendreVueSure(v)`, qui est le rendu lui-même, synchrone — c'est ce que la transition
   exécute. Et on compte les nœuds APRÈS, pour vérifier qu'on a mesuré quelque chose.
   ⛔ beta.html.  Usage : node perf4.js <base.json> [ralenti] */
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const R = '/home/user/teamop';
const BASE = process.argv[2], RALENTI = +(process.argv[3] || 1);
const srv = http.createServer((q, r) => {
  const x = path.join(R, q.url.split('?')[0]);
  fs.readFile(x, (e, d) => e ? (r.writeHead(404), r.end())
    : (r.writeHead(200, { 'Content-Type': x.endsWith('.js') ? 'text/javascript' : 'text/html;charset=utf-8' }), r.end(d)));
}).listen(8187, '127.0.0.1');

(async () => {
  let base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
  if (base && !Array.isArray(base.produits) && base.db) base = base.db;
  const json = JSON.stringify(base);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  const page = await nav.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => console.log('  ⚠ ' + String(e).slice(0, 140)));
  await page.route('**://api.teamop.fr/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await page.route('**://www.gstatic.com/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* neutralise */' }));
  await page.addInitScript(j => { try {
    localStorage.setItem('elanB_gestion_v2', j); localStorage.setItem('elanB_vierge_v1', '1'); localStorage.setItem('elanB_sync_on', '0');
  } catch (e) {} }, json);
  const cdp = await page.context().newCDPSession(page);
  if (RALENTI > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: RALENTI });
  await page.goto('http://127.0.0.1:8187/beta.html', { timeout: 120000, waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof rendreVueSure === 'function' && typeof save === 'function', { timeout: 60000 });
  await page.evaluate(() => { enterApp((db.users || []).filter(x => x && x.actif !== false)[0]); });
  await page.waitForTimeout(1200);

  const VUES = ['dashboard', 'interventions', 'produits', 'boxes', 'clients', 'mouvements', 'planning', 'devis', 'factures', 'historique', 'parametres', 'registre', 'rapports'];
  const res = await page.evaluate(async VUES => {
    const out = [];
    const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    for (const v of VUES) {
      if (!views[v]) { out.push({ v, err: 'vue absente' }); continue; }
      const t = [];
      for (let i = 0; i < 5; i++) {
        current = v;
        const a = performance.now();
        try { rendreVueSure(v); } catch (e) { out.push({ v, err: String(e).slice(0, 80) }); break; }
        t.push(performance.now() - a);
        await frame();
      }
      if (!t.length) continue;
      const c = document.getElementById('content');
      const noeuds = c ? c.getElementsByTagName('*').length : 0;
      const texte = c ? (c.innerText || '').length : 0;
      t.sort((x, y) => x - y);
      out.push({ v, med: Math.round(t[Math.floor(t.length / 2)]), pire: Math.round(t[t.length - 1]), noeuds, texte });
    }
    return out;
  }, VUES);

  console.log('\n  == ' + (RALENTI > 1 ? 'PROCESSEUR RALENTI x' + RALENTI + ' (telephone de terrain)' : 'pleine vitesse') + ' ==');
  console.log('\n  ecran              mediane     pire     noeuds   caracteres');
  res.forEach(x => x.err
    ? console.log('  ' + x.v.padEnd(16) + '  X ' + x.err)
    : console.log('  ' + x.v.padEnd(16) + String(x.med + ' ms').padStart(9) + String(x.pire + ' ms').padStart(9) + String(x.noeuds).padStart(10) + String(x.texte).padStart(12)));

  const pire = res.filter(x => !x.err).sort((a, b) => b.noeuds - a.noeuds)[0];
  if (pire) {
    await page.evaluate(v => { current = v; rendreVueSure(v); }, pire.v);
    await page.waitForTimeout(400);
    await page.evaluate(() => { window.__f = []; let d = performance.now();
      (function b() { const n = performance.now(); window.__f.push(n - d); d = n; if (window.__f.length < 200) requestAnimationFrame(b); })(); });
    for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 500); await page.waitForTimeout(60); }
    const f = await page.evaluate(() => window.__f.filter(x => x > 0));
    const longs = f.filter(x => x > 50);
    console.log('\n  -- defilement de « ' + pire.v + ' » (' + pire.noeuds + ' noeuds) --');
    console.log('  images mesurees : ' + f.length + ' · plus longue ' + Math.round(Math.max.apply(null, f)) + ' ms'
      + ' · images au-dessus de 50 ms : ' + longs.length);
  }
  await nav.close(); srv.close();
})();
