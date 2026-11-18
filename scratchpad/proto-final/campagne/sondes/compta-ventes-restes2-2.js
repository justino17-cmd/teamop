// Restes compta-ventes, tour 2 (18 novembre 2026) : le menu « TVA » d'une facture faite à la main ne COUPE plus son libellé (« 10 % · particulier, logement de p » à 320 px),
// et un taux choisi à la main dit sa phrase entière sous le champ. Mesure : le texte de chaque option, dans la police du champ, contre la place du champ.
// Usage : node compta-ventes-restes2-2.js [profil] [nuit]
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'petit', nuit = process.argv[3] === 'nuit', c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  await X.compta(c, 'fventes', { cat: 'ventes' }); await L.toucher(c, '[data-cx="nouveau"]'); await L.toucher(c, '#calque [data-cx="facture"]');
  const m = await p.evaluate(() => { const s = document.getElementById('nf-t'); const cs = getComputedStyle(s), cv = document.createElement('canvas').getContext('2d'); cv.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    const place = s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 24;   // 24 px : la flèche du menu
    return { n: s.options.length, place, options: [...s.options].map(o => ({ t: o.textContent, w: cv.measureText(o.textContent).width })) }; });
  console.log('  place :', Math.round(m.place), 'px ; options :', JSON.stringify(m.options.map(o => [o.t, Math.round(o.w)])));
  L.v('population : les trois taux (20, 10, 5,5)', m.n === 3, m.n);
  for (const o of m.options) L.v('le libellé « ' + o.t + ' » tient dans le champ (' + Math.round(o.w) + ' ≤ ' + Math.round(m.place) + ' px)', o.w <= m.place, Math.round(o.w));
  for (const [v, mot] of [['5.5', /5,5\s%\s: travaux d’amélioration énergétique/], ['10', /10\s%\s: particulier, logement de plus de 2 ans/], ['20', /20\s%\s: client professionnel/]]) {
    await p.selectOption('#nf-t', v); await L.calme(p, 150);
    const h = await p.evaluate(() => document.getElementById('nf-th').textContent);
    L.v('taux ' + v + ' : la phrase entière sous le champ (« ' + h.slice(0, 60) + '… »)', mot.test(h), h);
  }
  const d = await L.deborde(c); L.v('pas de débordement', !d.bouge && d.largeur <= (c.largeurProfil || 9999), JSON.stringify(d));
  await L.capture(c, X.CAP + `restes2-2-${profil}${nuit ? '-nuit' : ''}-tva.png`);
  await L.fermer(c); L.bilan();
})().catch(e => { console.error(e); process.exit(1); });
