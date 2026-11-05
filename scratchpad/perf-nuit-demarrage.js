/* Mesure de la nuit du 5 novembre 2026 — Ouverture de la bêta à processeur et réseau ralentis : première visite ou retour (copie du service worker, URLP=essai.html), `trace` en 6e argument pour la décomposition (analyse, compilation, exécution).
   Bêta locale 127.0.0.1 uniquement ; la base se fabrique par `node scratchpad/base-elan-like.js <fichier.json>`. Voir aussi sonde-demarrage.js. */
/* usage : node startup.js <scenario: premiere|retour> <cpu> <reseau: aucun|4g-faible> <runs> [base.json] [trace] */
const fs = require('fs');
const H = require('./perf-nuit-harnais.js');
const [scen, cpuS, net, runsS, baseF, trace] = process.argv.slice(2);
const CPU = +cpuS, RUNS = +runsS;
(async () => {
  const journal = []; const { s, port } = await H.serveur(journal);
  const br = await H.lancer();
  const base = baseF && baseF !== '-' ? fs.readFileSync(baseF, 'utf8') : null;
  const res = [];
  for (let k = 0; k < RUNS; k++) {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'allow' });
    const page = await ctx.newPage(); await page.addInitScript(H.INIT);
    const cdp = await ctx.newCDPSession(page);
    const URL = 'http://127.0.0.1:' + port + '/' + (process.env.URLP || 'beta.html');
    if (scen === 'retour') {
      await page.goto(URL, { waitUntil: 'load' }); await H.dormir(1500);
      await page.evaluate(b => { localStorage.setItem(STORE_KEY, b); localStorage.setItem('elanB_vierge_v1', '1'); localStorage.setItem('elanB_session', 'u0');
        localStorage.setItem('elanB_onboarded_u0', '1'); localStorage.setItem('elanB_sync_on', '0'); localStorage.setItem('elanB_lang', 'fr'); }, base);
      /* attendre que le service worker ait rempli son cache */
      await page.evaluate(async () => { try { await navigator.serviceWorker.ready; } catch (e) {} });
      for (let i = 0; i < 40; i++) { const n = await page.evaluate(async () => { try { const ks = await caches.keys(); let t = 0; for (const k of ks) t += (await (await caches.open(k)).keys()).length; return t; } catch (e) { return -1; } }); if (n > 10) break; await H.dormir(500); }
      await page.reload({ waitUntil: 'load' }); await H.dormir(3000);
    }
    journal.length = 0;
    if (H.RESEAU[net]) await cdp.send('Network.emulateNetworkConditions', H.RESEAU[net]);
    if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    if (trace) await br.startTracing(page, { categories: ['devtools.timeline', 'v8', 'disabled-by-default-v8.compile', 'blink.user_timing', 'loading'] });
    const t0 = Date.now();
    const p = scen === 'retour' ? page.reload({ waitUntil: 'load', timeout: 120000 }) : page.goto(URL, { waitUntil: 'load', timeout: 180000 });
    await p; const tLoad = Date.now() - t0;
    if (scen === 'retour') { for (let i = 0; i < 120; i++) { if (await page.evaluate(() => window.__tRendu != null)) break; await H.dormir(250); } }
    else await H.dormir(1500);
    const m = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; const fcp = (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime;
      return { fcp, dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd, rendu: window.__tRendu, resp: n.responseEnd, fetchs: window.__fetchs.length,
        sw: !!navigator.serviceWorker.controller, tailleDoc: n.encodedBodySize, tailleDocBrut: n.decodedBodySize }; });
    let tr = null;
    if (trace) { const buf = await br.stopTracing(); const ev = JSON.parse(buf.toString()).traceEvents; const sum = {};
      for (const e of ev) { if (e.ph === 'X' && e.dur) { const n = e.name; if (['EvaluateScript', 'v8.compile', 'v8.parseOnBackground', 'ParseHTML', 'Layout', 'UpdateLayoutTree', 'FunctionCall', 'RunTask', 'MajorGC', 'MinorGC', 'Paint', 'v8.compile.code', 'v8.run'].includes(n)) sum[n] = (sum[n] || 0) + e.dur / 1000; } }
      const longs = ev.filter(e => e.ph === 'X' && e.name === 'RunTask' && e.dur > 50000).map(e => Math.round(e.dur / 1000)).sort((a, b) => b - a).slice(0, 6);
      tr = { sum: Object.fromEntries(Object.entries(sum).map(([a, b]) => [a, Math.round(b)])), longs };
    }
    const net_ = journal.reduce((a, j) => a + j.taille, 0);
    if (process.env.DBG) console.log(journal.map(j=>j.u+' '+j.taille).join('\n'));
    res.push({ ...m, tLoad, reqs: journal.length, octets: net_ });
    if (tr) console.log('trace', JSON.stringify(tr));
    await ctx.close();
  }
  const f = k => H.r1(H.med(res.map(r => r[k])));
  console.log(JSON.stringify({ scen, cpu: CPU, net, runs: RUNS, fcp: f('fcp'), dcl: f('dcl'), load: f('load'), tLoad: f('tLoad'), rendu: f('rendu'), reqs: f('reqs'), Ko: Math.round(f('octets') / 1024), fetchs: f('fetchs'), sw: res[0].sw }));
  await br.close(); s.close();
})().catch(e => { console.error(e); process.exit(1); });
