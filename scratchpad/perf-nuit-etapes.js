/* Mesure de la nuit du 5 novembre 2026 — Décomposition de rendreVueSure par étape.
   Bêta locale 127.0.0.1 uniquement ; la base se fabrique par `node scratchpad/base-elan-like.js <fichier.json>`. Voir aussi sonde-demarrage.js. */
/* usage : node etapes.js <base.json> <cpu> <vue> — décompose rendreVueSure par étape (minutage dans la page) */
const fs = require('fs');
const H = require('./perf-nuit-harnais.js');
const [baseF, cpuS, vue] = process.argv.slice(2);
(async () => {
  const { s, port } = await H.serveur(null); const br = await H.lancer();
  const base = fs.readFileSync(baseF, 'utf8');
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const page = await ctx.newPage(); await page.addInitScript(H.INIT);
  const cdp = await ctx.newCDPSession(page);
  await page.goto('http://127.0.0.1:' + port + '/beta.html', { waitUntil: 'load' }); await H.dormir(800);
  await page.evaluate(b => { localStorage.setItem(STORE_KEY, b); localStorage.setItem('elanB_vierge_v1', '1'); localStorage.setItem('elanB_session', 'u0');
    localStorage.setItem('elanB_onboarded_u0', '1'); localStorage.setItem('elanB_sync_on', '0'); localStorage.setItem('elanB_lang', 'fr'); }, base);
  await page.reload({ waitUntil: 'load' });
  for (let i = 0; i < 100; i++) { if (await page.evaluate(() => window.__tRendu != null)) break; await H.dormir(250); }
  await H.dormir(2500);
  await page.evaluate(() => { window.horsLigneDebut = function () {}; try { _horsLigne = false; } catch (e) {} const h = document.getElementById('hl-ecran'); if (h) h.remove(); try { closeModal(); } catch (e) {} });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: +cpuS });
  const r = await page.evaluate(async v => {
    const T = {}; const add = (k, d) => { T[k] = (T[k] || []).concat(d); };
    const tm = (k, f) => { const t = performance.now(); try { f(); } catch (e) { T.err = String(e).slice(0, 80); } add(k, performance.now() - t); };
    for (let n = 0; n < 7; n++) {
      try { closeModal(); } catch (e) {}
      tm('vue', () => views[v]());
      tm('fusionRangee', () => { const fr = fusionRangee(v); });
      tm('multiProposer', () => multiProposer(v));
      tm('segInit+obs', () => { segInit(document.getElementById('content')); segObserver(); });
      tm('kpiTailler', () => kpiTailler(document.getElementById('content')));
      const t = performance.now(); void document.body.offsetWidth; add('stylesLayout', performance.now() - t);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
    const m = a => { const b = a.slice(1).sort((x, y) => x - y); return Math.round(b[Math.floor(b.length / 2)] * 10) / 10; };
    const o = {}; for (const k in T) if (Array.isArray(T[k])) o[k] = m(T[k]); else o[k] = T[k]; return o;
  }, vue);
  console.log(vue, '×' + cpuS, JSON.stringify(r));
  await br.close(); s.close();
})().catch(e => { console.error(e); process.exit(1); });
