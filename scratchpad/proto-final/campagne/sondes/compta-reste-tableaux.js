// Les tableaux de comptabilité (Journal, Balance, Grand livre, Résultat…) tiennent-ils dans leur carte, ou sont-ils coupés — et peut-on atteindre ce qui dépasse ?
// Mesure : pour chaque conteneur de tableau, largeur du contenu / largeur visible, réglage de débordement, et si on peut le faire glisser. usage : node compta-reste-tableaux.js [profil]
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'ipad', c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  for (const o of ['ecritures', 'balance', 'grandlivre', 'resultat', 'fiches', 'salaries', 'fachats']) {
    await X.compta(c, o); await L.calme(p, 600);
    const r = await p.evaluate(() => { const cont = [...document.querySelectorAll('#contenu .carte, #contenu .defile, #contenu .cx-liste, #contenu .cx-ecr, #contenu .tableau')].filter(e => e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 100);
      return cont.slice(0, 3).map(e => { const cs = getComputedStyle(e), avant = e.scrollLeft; e.scrollLeft = 9999; const apres = e.scrollLeft; e.scrollLeft = avant; return { cls: String(e.className).slice(0, 30), sw: e.scrollWidth, cw: e.clientWidth, ox: cs.overflowX, glisse: apres > avant, perdu: Math.round(e.scrollWidth - e.clientWidth) }; }); });
    console.log(`${profil} ${o.padEnd(11)} conteneurs qui dépassent :`, JSON.stringify(r));
    const coupe = r.filter(x => !x.glisse); v(`TB ${profil} ${o} : ce qui dépasse de la carte peut être atteint (glisser le tableau)`, coupe.length === 0, coupe);
    v(`compta-reste-11 · ${profil} ${o} : aucune colonne ne sort de sa carte sans que la page le montre (ici : rien ne dépasse)`, r.length === 0, r.map(x => x.cls + ' ' + x.perdu + ' px cachés'));
    const indice = await p.evaluate(() => { const t = document.querySelector('#contenu table, #contenu .cx-bal, #contenu .cx-gl-l'); return t ? !!document.querySelector('#contenu .defile, #contenu [style*="overflow-x"]') : null; });
    if (r.length) await L.capture(c, X.CAP + `${profil}-tableau-${o}.png`);
  }
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
