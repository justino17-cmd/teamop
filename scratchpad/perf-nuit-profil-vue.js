/* Mesure de la nuit du 5 novembre 2026 — Profil CPU (temps propre) d'une rubrique rendue plusieurs fois.
   Bêta locale 127.0.0.1 uniquement ; la base se fabrique par `node scratchpad/base-elan-like.js <fichier.json>`. Voir aussi sonde-demarrage.js. */
/* usage : node profil-vue.js <base.json> <cpu> <vue> [fois] — profil CPU (temps propre) de rendreVueSure(vue) répété */
const fs = require('fs');
const H = require('./perf-nuit-harnais.js');
const [baseF, cpuS, vue, foisS] = process.argv.slice(2);
(async () => {
  const { s, port } = await H.serveur(null);
  const br = await H.lancer();
  const base = fs.readFileSync(baseF, 'utf8');
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const page = await ctx.newPage(); await page.addInitScript(H.INIT);
  const cdp = await ctx.newCDPSession(page);
  await page.goto('http://127.0.0.1:' + port + '/' + (process.env.URLP || 'beta.html'), { waitUntil: 'load' }); await H.dormir(800);
  await page.evaluate(b => { localStorage.setItem(STORE_KEY, b); localStorage.setItem('elanB_vierge_v1', '1'); localStorage.setItem('elanB_session', 'u0');
    localStorage.setItem('elanB_onboarded_u0', '1'); localStorage.setItem('elanB_sync_on', '0'); localStorage.setItem('elanB_lang', 'fr'); }, base);
  await page.reload({ waitUntil: 'load' });
  for (let i = 0; i < 100; i++) { if (await page.evaluate(() => window.__tRendu != null)) break; await H.dormir(250); }
  await H.dormir(2500);
  await page.evaluate(() => { window.horsLigneDebut = function () {}; try { _horsLigne = false; } catch (e) {} const h = document.getElementById('hl-ecran'); if (h) h.remove(); try { closeModal(); } catch (e) {} });
  await page.evaluate(v => { rendreVueSure(v, true); rendreVueSure(v, true); }, vue);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: +cpuS });
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  await page.evaluate(async ({ v, n }) => { for (let i = 0; i < n; i++) { rendreVueSure(v, true); void document.body.offsetWidth; await new Promise(r => requestAnimationFrame(r)); } }, { v: vue, n: +(foisS || 10) });
  const { profile } = await cdp.send('Profiler.stop');
  const nodes = new Map(profile.nodes.map(n => [n.id, n])); const self = new Map();
  const dt = profile.timeDeltas; profile.samples.forEach((id, i) => { self.set(id, (self.get(id) || 0) + (dt[i] || 0)); });
  const agg = new Map(); let total = 0;
  for (const [id, us] of self) { const n = nodes.get(id); const cf = n.callFrame; const k = (cf.functionName || '(anonyme)') + ' ' + (cf.url ? cf.url.split('/').pop() : '') + ':' + (cf.lineNumber + 1);
    agg.set(k, (agg.get(k) || 0) + us); total += us; }
  console.log(vue, 'total', Math.round(total / 1000), 'ms /', foisS || 10, 'passages (ralenti ×' + cpuS + ')');
  [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([k, us]) => console.log(String(Math.round(us / 1000)).padStart(6), 'ms', k));
  await br.close(); s.close();
})().catch(e => { console.error(e); process.exit(1); });
