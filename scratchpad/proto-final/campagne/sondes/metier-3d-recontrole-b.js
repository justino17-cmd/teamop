// Recontrôle adverse metier-3d : en-têtes du tableau « Tous les sites » entre 1000 et 1300 px de fenêtre (liste de 650 à 950 px) : où « Recommandations » se coupe-t-il ?
const O = require('./metier-3d-outils.js'), L = O.L;
(async () => { const c = await O.ouvrir({ profil: 'mac', qui: 'marc', packs: O.METIERS.d3 }), p = c.p; await L.aller(p, 'registre'); await L.calme(p, 600);
  for (const nuit of [false]) for (let w = 1000; w <= 1340; w += 20) { await p.setViewportSize({ width: w, height: 820 }); await L.calme(p, 350);
    const m = await p.evaluate(() => { const tab = document.querySelector('.rg-tab'), th = tab.querySelector('.rg-th'), cw = Math.round(tab.getBoundingClientRect().width); const cols = [...th.children].map(e => { const r = e.getBoundingClientRect(); return { t: e.textContent.trim(), w: Math.round(r.width), sw: e.scrollWidth, ov: getComputedStyle(e).overflow, ws: getComputedStyle(e).whiteSpace }; });
      const lignes = [...tab.querySelectorAll('.rg-ligne')].map(l => [...l.children].map(e => ({ w: Math.round(e.getBoundingClientRect().width), sw: e.scrollWidth }))); const pas = getComputedStyle(th).gridTemplateColumns;
      return { cw, mode: getComputedStyle(th).display, pas, cols: cols.filter(x => x.sw > x.w + 1), lignes: lignes.map(l => l.filter(x => x.sw > x.w + 1).length) }; });
    console.log(w, 'liste', m.cw, m.mode, 'coupés', JSON.stringify(m.cols.map(x => x.t + ' ' + x.sw + '/' + x.w + ' ' + x.ov + '/' + x.ws)), 'lignes', m.lignes.join(','), m.pas); }
  await p.setViewportSize({ width: 1180, height: 820 }); await L.calme(p, 500); await L.capture(c, O.CAP + 'rc-R3-1180-tab.png');
  await p.evaluate(() => document.querySelector('.rg-tab').scrollIntoView({ block: 'start' })); await L.calme(p, 400); await L.capture(c, O.CAP + 'rc-R3-1180-tab2.png');
  await L.fin(c); await L.fermer(); })().catch(async e => { console.log('ERREUR', e.stack); await L.fermer(); process.exit(2); });
