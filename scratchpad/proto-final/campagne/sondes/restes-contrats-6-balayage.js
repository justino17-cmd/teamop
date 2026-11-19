// RESTES CONTRATS, tour 6 : balayage fin de la liste des Contrats, de 1 090 à 1 300 px de FENÊTRE (pas de 10) + iPad paysage (1 180), ordinateur maximisé (1 440, 1 920),
// noms de départ ET noms de 66 signes : « Cabinet dentaire Martin » sur une ligne quand le tableau est affiché, cartes quand la carte est ≤ 920 px, rien coupé ni débordant.
// usage : node restes-contrats-6-balayage.js [nuit] → « N ✓ · M ✗ »
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
(async () => {
  const nuit = process.argv[2] === 'nuit';
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', hash: 'contrats', nuit }), p = c.p; await L.calme(p, 400);
  const larg = []; for (let w = 1090; w <= 1300; w += 10) larg.push(w); larg.push(1180, 1366, 1440, 1600, 1920); larg.sort((a, b) => a - b);
  for (const libre of [0, 1]) {
    if (libre) await p.evaluate(() => { Object.keys(CLIENTS).forEach(i => { CLIENTS[i].nom = 'Syndicat des copropriétaires de la résidence Les Hauts de la Rochelle'; }); CONTRATS.forEach(k => { k.titre = 'Entretien annuel des climatisations de la résidence · bâtiment A, B, C et D · cage 12'; }); });
    for (const w of [...new Set(larg)]) {
      await p.setViewportSize({ width: w, height: 900 }); await L.aller(p, 'accueil'); await L.aller(p, 'contrats'); await L.calme(p, 350);
      const r = await p.evaluate(() => { const car = document.querySelector('#contenu .ctr-liste'), th = [...car.querySelectorAll('thead th')].map(h => Math.round(h.getBoundingClientRect().width));
        const lg = [...car.querySelectorAll('tbody tr')].map(tr => { const b = tr.querySelector('td:nth-child(2) > b'); return Math.round(b.getBoundingClientRect().height / (parseFloat(getComputedStyle(b).lineHeight) || 16)); });
        const coupe = [...car.querySelectorAll('tbody td, tbody b, tbody .ctr-m')].filter(e => e.getBoundingClientRect().width && e.scrollWidth > e.clientWidth + 1).length;
        const hors = [...car.querySelectorAll('tbody *')].filter(e => { const b = e.getBoundingClientRect(), k = car.getBoundingClientRect(); return b.width && (b.right > k.right + 1 || b.left < k.left - 1); }).length;
        const cs = getComputedStyle(car), cont = Math.round(car.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth));
        return { carte: cont, th, cartes: th.slice(2).every(x => x === 0), lg, coupe, hors, defil: car.scrollWidth - car.clientWidth, page: document.documentElement.scrollWidth }; });
      const tag = (libre ? 'noms de 66 signes ' : 'données de départ ') + w + ' (carte utile ' + r.carte + ')';
      v(tag + ' : population', r.lg.length >= 3, r.lg.length);
      v(tag + ' : cartes si carte ≤ 920, tableau sinon', r.carte <= 920 ? r.cartes : !r.cartes, r);
      if (!libre && !r.cartes) v(tag + ' : au plus deux lignes par nom (jamais un mot coupé en trois)', r.lg.every(n => n <= 2), r.lg);
      v(tag + ' : rien ne déborde ni n’est coupé', r.defil <= 1 && r.page <= w + 1 && r.hors === 0, r);
    }
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
