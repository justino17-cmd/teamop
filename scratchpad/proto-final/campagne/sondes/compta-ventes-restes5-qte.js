// Restes compta-ventes, tour 5 : le champ Qté d'une ligne de facture se RELIT en entier à l'iPhone et au plus petit écran (« 90 min », « 90 minutes », « 250 mL »),
// et une durée en minutes se compte sur une ligne à l'heure puis sur la suivante. Mesuré sur le texte, pas sur la forme : scrollWidth contre clientWidth du champ.
// Usage : node compta-ventes-restes5-qte.js [profil] [nuit]   (profils utiles : iphone, petit, android, mac)
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const c = await L.ouvrir({ profil: process.argv[2] || 'iphone', nuit: process.argv[3] === 'nuit', qui: 'marc' }), p = c.p;
  await p.evaluate(() => { const i = INTS.find(o => o.cli && o.st !== 'annulee' && !o.fact) || INTS[0], F = fiche(i.id);
    FACTURES.filter(f => f.int === i.id).forEach(f => { f.id = 'old-' + f.id; }); i.fact = { mode: 'temps', tva: 10 }; F.debut = '08:00'; F.fin = '09:50'; F.pieces = [];
    factureDepuis(i); FACTURES.find(f => f.id === 'f-' + i.id).id = 'fx-q'; });
  await X.fiche(c, 'fx-q');
  await p.evaluate(() => { const f = FACTURES.find(x => x.id === 'fx-q'); f.lignes = lignesDe(f); f.lignes.push({ d: 'Intervention de dépannage', q: '1', pu: 65 }); rendre(); }); await L.calme(p, 400);
  const k = await p.evaluate(() => lignesDe(FACTURES.find(x => x.id === 'fx-q')).length - 1);
  const champ = () => p.locator('[data-fqte="' + k + '"]').first();
  const mesure = () => champ().evaluate(e => ({ sw: e.scrollWidth, cw: e.clientWidth, larg: Math.round(e.getBoundingClientRect().width), v: e.value }));
  const saisir = async v => { await champ().fill(v); await champ().press('Tab'); await L.calme(p, 350); };
  const texte = async v => { await champ().fill(v); await L.calme(p, 150); };   // sans Tab : on mesure ce que la personne VOIT en tapant
  let n = 0;
  for (const v of ['1h30', '250 mL', '12 345,5']) { await texte(v); const m = await mesure(); n++;
    console.log('  · « ' + v + ' » : champ ' + m.larg + ' px, texte ' + m.sw + ' / ' + m.cw);
    L.v('« ' + v + ' » se relit en entier dans le champ de quantité', m.sw <= m.cw + 1, JSON.stringify(m)); }
  // le prix aussi : le plus long prix permis (999 999,99) se relit dans sa colonne resserrée
  const pr = p.locator('[data-prix="' + k + '"]').first(); await pr.fill('999999,99'); await L.calme(p, 150); n++;
  const mp = await pr.evaluate(e => ({ sw: e.scrollWidth, cw: e.clientWidth, v: e.value }));
  L.v('« 999999,99 » se relit en entier dans le champ de prix', mp.sw <= mp.cw + 1, JSON.stringify(mp));
  await pr.fill('65'); await pr.press('Tab'); await L.calme(p, 300);
  await saisir('2h'); await saisir('90 minutes'); const m2 = await mesure(); n++;
  L.v('« 90 minutes » s’enregistre « 90 min » et se relit en entier', m2.sw <= m2.cw + 1 && m2.v === '90 min', JSON.stringify(m2));
  await saisir('45 mn'); const m3 = await mesure(); n++;
  L.v('« 45 mn » s’enregistre « 45 min », une seule forme', m3.v === '45 min', JSON.stringify(m3));
  L.v('population : six mesures prises', n === 6, n);
  const deb = await L.deborde(c).catch(() => null); console.log('  · débordement :', JSON.stringify(deb));
  L.v('la page ne déborde pas', !deb || (Array.isArray(deb) ? deb.length === 0 : !deb.deborde), JSON.stringify(deb));
  await p.locator('[data-fqte="' + k + '"]').first().scrollIntoViewIfNeeded(); await L.calme(p, 300);
  await L.capture(c, X.CAP.replace('campagne-compta-ventes/', 'cv-r5/') + 'r5-qte-' + (process.argv[2] || 'iphone') + (process.argv[3] === 'nuit' ? '-nuit' : '') + '.png');
  await L.fermer(c); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
