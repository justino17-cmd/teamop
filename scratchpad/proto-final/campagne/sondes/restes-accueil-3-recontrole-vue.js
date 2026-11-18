// Captures À REGARDER du recontrôle des restes de l'Accueil, tour 3 : le graphique des 12 mois (390 et 600 px, jour et nuit) et le bilan à 320 px avec une valeur de 7 chiffres.
// node restes-accueil-3-recontrole-vue.js [nuit]
const O = require('./accueil-outils.js'), L = O.L; const nuit = process.argv.includes('nuit');
(async () => {
  const c = await L.ouvrir({ profil: 'iphone', qui: 'marc', nuit }), p = c.p;
  for (const w of [390, 600, 320]) { await p.setViewportSize({ width: w, height: 844 }); await p.waitForTimeout(200); await p.evaluate("stPer='mois'; stK=ST_FIN;"); await L.aller(p, 'statistiques'); await L.calme(p, 500);
    await p.evaluate(() => { const g = document.querySelector('.st-gcont') || document.querySelector('.st-graph'); if (g) g.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(400);
    await L.capture(c, O.CAP + `rr3-vue-graph-${w}${nuit ? '-nuit' : ''}.png`, false); }
  await p.setViewportSize({ width: 320, height: 844 }); await p.waitForTimeout(200); await L.aller(p, 'statistiques'); await L.calme(p, 400); await L.toucher(c, '[data-stbilan="1"]', { delai: 4000 }); await p.waitForTimeout(800);
  await p.evaluate(() => { for (const x of document.querySelectorAll('.bil-t b')) { const i = x.querySelector('i'); x.innerHTML = '1 234 567 €' + (i ? ' <i>' + i.textContent + '</i>' : ''); } const t = document.querySelector('.bil-tuiles'); if (t) t.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(400);
  await L.capture(c, O.CAP + `rr3-vue-bilan7-320${nuit ? '-nuit' : ''}.png`, false);
  await L.fin(c); await L.fermer();
})().catch(e => { console.error(e); process.exit(1); });
