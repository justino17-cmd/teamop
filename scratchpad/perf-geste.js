/* ══ LE COÛT D'UN GESTE, ET LE COÛT D'OUVRIR ═════════════════════════════════════════════
   Le rendu d'un écran est rapide (mesuré). Reste ce qui se paie AUTREMENT :
     · save() — appelé à chaque modification, refait JSON.stringify de TOUTE la base et écrit
       dans localStorage, qui est SYNCHRONE : l'interface est gelée pendant ce temps ;
     · le démarrage — analyser 3,16 Mo de HTML/JS, puis JSON.parse de la base, puis migrate().
   ⛔ beta.html, jamais app.html.  Usage : node perf2.js <base.json> [ralenti] */
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const R = '/home/user/teamop';
const BASE = process.argv[2], RALENTI = +(process.argv[3] || 1);
const srv = http.createServer((q, r) => {
  const x = path.join(R, q.url.split('?')[0]);
  fs.readFile(x, (e, d) => e ? (r.writeHead(404), r.end())
    : (r.writeHead(200, { 'Content-Type': x.endsWith('.js') ? 'text/javascript' : 'text/html;charset=utf-8' }), r.end(d)));
}).listen(8185, '127.0.0.1');

(async () => {
  let base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
  if (base && !Array.isArray(base.produits) && base.db) base = base.db;
  const json = JSON.stringify(base);

  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  const page = await nav.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => console.log('  ⚠ ' + String(e).slice(0, 140)));
  await page.route('**://api.teamop.fr/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await page.route('**://www.gstatic.com/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* neutralisé */' }));
  await page.addInitScript(j => { try {
    localStorage.setItem('elanB_gestion_v2', j);
    localStorage.setItem('elanB_vierge_v1', '1');
    localStorage.setItem('elanB_sync_on', '0');
  } catch (e) {} }, json);

  const cdp = await page.context().newCDPSession(page);
  if (RALENTI > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: RALENTI });

  await page.goto('http://127.0.0.1:8185/beta.html', { timeout: 120000, waitUntil: 'load' });
  await page.waitForFunction(() => typeof go === 'function' && typeof save === 'function', { timeout: 60000 });

  const dep = await page.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0] || {};
    return {
      reseau: Math.round((n.responseEnd || 0) - (n.requestStart || 0)),
      analyse: Math.round((n.domContentLoadedEventEnd || 0) - (n.responseEnd || 0)),
      total: Math.round(n.domContentLoadedEventEnd || 0),
      charge: Math.round(n.loadEventEnd || 0),
      octets: n.decodedBodySize || 0,
    };
  });

  await page.evaluate(() => { const u = (db.users || []).filter(x => x && x.actif !== false)[0]; enterApp(u); });
  await page.waitForTimeout(1000);

  const r = await page.evaluate(() => {
    const out = {};
    const txt = JSON.stringify(db);
    out.baseKo = Math.round(new TextEncoder().encode(txt).length / 1024);

    const chrono = (f, n) => { const t = []; for (let i = 0; i < n; i++) { const a = performance.now(); f(); t.push(performance.now() - a); }
      t.sort((x, y) => x - y); return { med: Math.round(t[Math.floor(n / 2)]), pire: Math.round(t[n - 1]) }; };

    out.stringify = chrono(() => JSON.stringify(db), 7);
    out.parse = chrono(() => JSON.parse(txt), 7);
    out.ecriture = chrono(() => { try { localStorage.setItem('elanB_banc', txt); } catch (e) {} }, 7);
    try { localStorage.removeItem('elanB_banc'); } catch (e) {}
    /* save() complet : c'est CE chiffre que l'utilisateur ressent à chaque tap. */
    out.save = chrono(() => { try { save(); } catch (e) {} }, 7);
    /* Les étages de save(), un par un. */
    ['estampiller', 'numPlafondRelever', 'ombreRelever'].forEach(f => {
      try { if (typeof window[f] === 'function') out[f] = chrono(() => window[f](), 5); } catch (e) {}
    });
    return out;
  });

  const ko = x => x + ' Ko';
  console.log('\n  ══ ' + (RALENTI > 1 ? 'PROCESSEUR RALENTI ×' + RALENTI : 'pleine vitesse') + ' · base ' + ko(r.baseKo) + ' ══');
  console.log('\n  ── OUVRIR L\'APPLICATION (fichier servi en local, réseau quasi nul) ──');
  console.log('  téléchargement local   : ' + dep.reseau + ' ms   (' + Math.round(dep.octets / 1024) + ' Ko décodés)');
  console.log('  analyse + exécution    : ' + dep.analyse + ' ms');
  console.log('  jusqu\'à DOMContentLoaded : ' + dep.total + ' ms');
  console.log('  jusqu\'à load complet   : ' + dep.charge + ' ms');
  console.log('\n  ── CHAQUE GESTE : save() ──');
  const l = (n, o) => console.log('  ' + n.padEnd(24) + String(o.med + ' ms').padStart(8) + '   (pire ' + o.pire + ' ms)');
  l('save() COMPLET', r.save);
  l('· JSON.stringify(db)', r.stringify);
  l('· localStorage.setItem', r.ecriture);
  if (r.estampiller) l('· estampiller()', r.estampiller);
  if (r.numPlafondRelever) l('· numPlafondRelever()', r.numPlafondRelever);
  if (r.ombreRelever) l('· ombreRelever()', r.ombreRelever);
  l('JSON.parse (au chargement)', r.parse);
  await nav.close(); srv.close();
})();
