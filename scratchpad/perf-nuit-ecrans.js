/* Mesure de la nuit du 5 novembre 2026 — Coût d'un changement de rubrique (JavaScript et jusqu'au deuxième affichage), mobile/bureau, jour/nuit, sur une base donnée ; PRE="intView='liste'" pour la liste d'interventions.
   Bêta locale 127.0.0.1 uniquement ; la base se fabrique par `node scratchpad/base-elan-like.js <fichier.json>`. Voir aussi sonde-demarrage.js. */
/* usage : node ecrans.js <base.json> <cpu> <mobile|bureau> <jour|nuit> [vues,...] [passages] */
const fs = require('fs');
const H = require('./perf-nuit-harnais.js');
const [baseF, cpuS, appareil, mode, vuesS, pasS] = process.argv.slice(2);
const VUES = (vuesS && vuesS !== '-' ? vuesS : 'dashboard,interventions,planning,clients,devis,factures,stock,produits,mouvements,historique').split(',');
const N = +(pasS || 5);
(async () => {
  const { s, port } = await H.serveur(null);
  const br = await H.lancer();
  const base = fs.readFileSync(baseF, 'utf8');
  const mob = appareil === 'mobile';
  const ctx = await br.newContext({ viewport: mob ? { width: 390, height: 844 } : { width: 1280, height: 800 }, deviceScaleFactor: mob ? 2 : 1, isMobile: mob, hasTouch: mob,
    colorScheme: mode === 'nuit' ? 'dark' : 'light', serviceWorkers: 'block' });
  const page = await ctx.newPage(); await page.addInitScript(H.INIT);
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  const cdp = await ctx.newCDPSession(page);
  await page.goto('http://127.0.0.1:' + port + '/' + (process.env.URLP || 'beta.html'), { waitUntil: 'load' });
  await H.dormir(800);
  await page.evaluate(b => { localStorage.setItem(STORE_KEY, b); localStorage.setItem('elanB_vierge_v1', '1'); localStorage.setItem('elanB_session', 'u0');
    localStorage.setItem('elanB_onboarded_u0', '1'); localStorage.setItem('elanB_sync_on', '0'); localStorage.setItem('elanB_lang', 'fr'); }, base);
  await page.reload({ waitUntil: 'load' });
  for (let i = 0; i < 100; i++) { if (await page.evaluate(() => window.__tRendu != null)) break; await H.dormir(250); }
  await H.dormir(2500);
  /* neutraliser l'écran « connexion requise » et les fenêtres qui s'ouvrent seules */
  await page.evaluate(() => { window.horsLigneDebut = function () {}; try { _horsLigne = false; } catch (e) {} const h = document.getElementById('hl-ecran'); if (h) h.remove(); try { closeModal(); } catch (e) {} });
  const taille = await page.evaluate(() => ({ ints: db.interventions.length, clis: db.clients.length, user: currentUser && currentUser.role, nodes: document.querySelectorAll('*').length }));
  if (process.env.PRE) await page.evaluate(process.env.PRE);
  if (CPU() > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU() });
  function CPU() { return +cpuS; }
  const out = [];
  for (const v of VUES) {
    const r = await page.evaluate(async ({ v, N }) => {
      const dbl = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const js = [], tot = []; let nodes = 0, html = 0, err = '';
      for (let k = 0; k < N + 1; k++) {
        try { closeModal(); } catch (e) {}
        await dbl();
        const t0 = performance.now();
        try { rendreVueSure(v, true); } catch (e) { err = String(e).slice(0, 100); }
        const t1 = performance.now();
        void document.body.offsetWidth;
        await dbl();
        const t2 = performance.now();
        if (k > 0) { js.push(t1 - t0); tot.push(t2 - t0); }
        const c = document.getElementById('content'); nodes = c.getElementsByTagName('*').length; html = c.innerHTML.length;
      }
      const m = a => { const b = a.slice().sort((x, y) => x - y); return Math.round(b[Math.floor(b.length / 2)] * 10) / 10; };
      return { v, js: m(js), tot: m(tot), nodes, htmlKo: Math.round(html / 1024), err };
    }, { v, N });
    out.push(r);
  }
  console.log(JSON.stringify({ baseF: baseF.split('/').pop(), cpu: +cpuS, appareil, mode, taille, errs: errs.slice(0, 3) }));
  console.log(out.map(r => `${r.v.padEnd(14)} js ${String(r.js).padStart(7)} ms  total ${String(r.tot).padStart(7)} ms  noeuds ${String(r.nodes).padStart(6)}  html ${String(r.htmlKo).padStart(6)} Ko ${r.err}`).join('\n'));
  await br.close(); s.close();
})().catch(e => { console.error(e); process.exit(1); });
