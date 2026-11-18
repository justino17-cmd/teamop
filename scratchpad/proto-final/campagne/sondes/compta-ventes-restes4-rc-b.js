// Recontrôle adverse, tour 4 : un prix NÉGATIF est-il saisissable par l'écran (remise) ? ; les autres rôles voient-ils le champ de quantité ?
// Usage : node compta-ventes-restes4-rc-b.js [profil] [nuit]
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const c = await L.ouvrir({ profil: process.argv[2] || 'mac', nuit: process.argv[3] === 'nuit', qui: 'marc' }), p = c.p;
  await p.evaluate(() => { const i = INTS.find(o => o.cli && o.st !== 'annulee' && !o.fact) || INTS[0], F = fiche(i.id);
    FACTURES.filter(f => f.int === i.id).forEach(f => { f.id = 'old-' + f.id; }); i.fact = { mode: 'temps', tva: 10 }; F.debut = '08:00'; F.fin = '09:50'; F.pieces = [];
    factureDepuis(i); FACTURES.find(f => f.id === 'f-' + i.id).id = 'fx-b'; });
  await X.fiche(c, 'fx-b');
  await p.evaluate(() => { const f = FACTURES.find(x => x.id === 'fx-b'); f.lignes = lignesDe(f); f.lignes.push({ d: 'Remise commerciale', q: '1', pu: 10 }); rendre(); }); await L.calme(p, 400);
  const k = await p.evaluate(() => lignesDe(FACTURES.find(x => x.id === 'fx-b')).length - 1);
  const ch = (a, v) => p.locator('[data-' + a + '="' + k + '"]').first().fill(v).then(() => p.locator('[data-' + a + '="' + k + '"]').first().press('Tab')).then(() => L.calme(p, 350));
  await ch('prix', '-10,33'); await ch('fqte', '2,5');
  const l = await p.evaluate(() => { const l = lignesDe(FACTURES.find(x => x.id === 'fx-b')).slice(-1)[0]; return { pu: l.pu, q: l.q, total: totLigne(l), ht: htDe(FACTURES.find(x => x.id === 'fx-b')) }; });
  console.log('  · remise saisie à l’écran :', JSON.stringify(l), 'toast « ' + await X.toasts(p) + ' »');
  L.v('population : un prix négatif a bien été accepté par le champ', l.pu === -10.33 && l.q === '2,5', JSON.stringify(l));
  L.v('« 2,5 × −10,33 € » vaut l’opposé de « 2,5 × 10,33 € » (−25,83 €)', Math.abs(l.total + 25.83) < 0.006, l.total);
  await L.fermer(c); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
