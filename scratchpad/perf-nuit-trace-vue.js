/* Mesure de la nuit du 5 novembre 2026 — Trace : où va le temps d'un changement de rubrique (styles, mise en page, peinture, JavaScript).
   Bêta locale 127.0.0.1 uniquement ; la base se fabrique par `node scratchpad/base-elan-like.js <fichier.json>`. Voir aussi sonde-demarrage.js. */
/* usage : node trace-vue.js <base.json> <cpu> <vue> [fois] — trace : où va le temps d'un changement de rubrique (styles, mise en page, peinture, JS) */
const fs = require('fs');
const H = require('./perf-nuit-harnais.js');
const [baseF, cpuS, vue, foisS] = process.argv.slice(2);
(async () => {
  const { s, port } = await H.serveur(null); const br = await H.lancer();
  const base = fs.readFileSync(baseF, 'utf8');
  const mob = !process.env.BUREAU;
  const ctx = await br.newContext({ viewport: mob ? { width: 390, height: 844 } : { width: 1280, height: 800 }, isMobile: mob, hasTouch: mob, serviceWorkers: 'block', colorScheme: process.env.NUIT ? 'dark' : 'light' });
  const page = await ctx.newPage(); await page.addInitScript(H.INIT);
  const cdp = await ctx.newCDPSession(page);
  await page.goto('http://127.0.0.1:' + port + '/beta.html', { waitUntil: 'load' }); await H.dormir(800);
  await page.evaluate(b => { localStorage.setItem(STORE_KEY, b); localStorage.setItem('elanB_vierge_v1', '1'); localStorage.setItem('elanB_session', 'u0');
    localStorage.setItem('elanB_onboarded_u0', '1'); localStorage.setItem('elanB_sync_on', '0'); localStorage.setItem('elanB_lang', 'fr'); }, base);
  await page.reload({ waitUntil: 'load' });
  for (let i = 0; i < 100; i++) { if (await page.evaluate(() => window.__tRendu != null)) break; await H.dormir(250); }
  await H.dormir(2500);
  await page.evaluate(() => { window.horsLigneDebut = function () {}; try { _horsLigne = false; } catch (e) {} const h = document.getElementById('hl-ecran'); if (h) h.remove(); try { closeModal(); } catch (e) {} });
  await page.evaluate(v => { rendreVueSure(v, true); }, vue);
  await H.dormir(500);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: +cpuS });
  await br.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'v8.execute'] });
  const N = +(foisS || 5);
  await page.evaluate(async ({ v, n }) => { for (let i = 0; i < n; i++) { rendreVueSure(v, true); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); } }, { v: vue, n: N });
  const buf = await br.stopTracing(); const ev = JSON.parse(buf.toString()).traceEvents;
  const sum = {}, cnt = {}, els = { UpdateLayoutTree: 0, Layout: 0 };
  for (const e of ev) { if (e.ph !== 'X' || !e.dur) continue; sum[e.name] = (sum[e.name] || 0) + e.dur / 1000; cnt[e.name] = (cnt[e.name] || 0) + 1;
    if (e.name === 'UpdateLayoutTree' && e.args && e.args.elementCount) els.UpdateLayoutTree += e.args.elementCount;
    if (e.name === 'Layout' && e.args && e.args.beginData) els.Layout += (e.args.beginData.dirtyObjects || 0); }
  const ks = ['UpdateLayoutTree', 'Layout', 'PrePaint', 'Paint', 'Layerize', 'Commit', 'FunctionCall', 'EvaluateScript', 'ParseHTML', 'HitTest', 'IntersectionObserverController::computeIntersections', 'MinorGC', 'MajorGC', 'RunTask'];
  console.log(vue, '×' + cpuS, (mob ? 'mobile' : 'bureau'), N, 'passages ; par passage :');
  console.log(ks.filter(k => sum[k]).map(k => k + ' ' + Math.round(sum[k] / N * 10) / 10 + ' ms (×' + Math.round(cnt[k] / N * 10) / 10 + ')').join(' | '));
  console.log('éléments restylés par passage', Math.round(els.UpdateLayoutTree / N), '· objets de mise en page sales', Math.round(els.Layout / N));
  await br.close(); s.close();
})().catch(e => { console.error(e); process.exit(1); });
