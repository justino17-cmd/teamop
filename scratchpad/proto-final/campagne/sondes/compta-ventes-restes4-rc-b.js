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
  const avant = await p.evaluate(k => lignesDe(FACTURES.find(x => x.id === 'fx-b'))[k].pu, k);
  await ch('prix', '-10,33');
  const l = await p.evaluate(() => { const l = lignesDe(FACTURES.find(x => x.id === 'fx-b')).slice(-1)[0]; return { pu: l.pu, valeur: null, total: totLigne(l) }; });
  const t = await X.toasts(p), champ = await p.locator('[data-prix="' + k + '"]').first().inputValue();
  console.log('  · prix négatif saisi :', JSON.stringify(l), 'champ « ' + champ + ' » toast « ' + t + ' »');
  L.v('population : la ligne avait un prix (10) avant la saisie', avant === 10, avant);
  L.v('un prix négatif est refusé : le prix d’avant reste', l.pu === 10, JSON.stringify(l));
  L.v('le refus est DIT, avec la voie de l’avoir', /négatif/.test(t) && /avoir/.test(t), t);
  L.v('le champ montre toujours le prix d’avant', champ === '10', champ);
  await ch('prix', 'abc');
  const t2 = await X.toasts(p), l2 = await p.evaluate(k => lignesDe(FACTURES.find(x => x.id === 'fx-b'))[k].pu, k);
  L.v('un texte qui n’est pas un prix est refusé aussi, avec une phrase', l2 === 10 && /en chiffres/.test(t2), l2 + ' · ' + t2);
  // une ligne de déduction (acompte déjà facturé, prix négatif) ne se retourne pas en facturation
  await p.evaluate(() => { const f = FACTURES.find(x => x.id === 'fx-b'); f.lignes = lignesDe(f); f.lignes.push({ d: 'Acompte de 30 % déjà facturé', q: '1', pu: -123.95 }); rendre(); }); await L.calme(p, 400);
  const ka = await p.evaluate(() => lignesDe(FACTURES.find(x => x.id === 'fx-b')).length - 1);
  await p.locator('[data-prix="' + ka + '"]').first().fill('40'); await p.locator('[data-prix="' + ka + '"]').first().press('Tab'); await L.calme(p, 350);
  const ta = await X.toasts(p), pa = await p.evaluate(k => lignesDe(FACTURES.find(x => x.id === 'fx-b'))[k].pu, ka);
  L.v('population : la ligne d’acompte existe et porte −123,95', ka > k && pa !== undefined, ka + ' · ' + pa);
  L.v('retaper « 40 » sur la ligne d’acompte ne la retourne pas en +40 : −123,95 reste, la phrase le dit', pa === -123.95 && /acompte se reprend tel qu/.test(ta), pa + ' · ' + ta);
  await ch('prix', '');
  const l3 = await p.evaluate(k => lignesDe(FACTURES.find(x => x.id === 'fx-b'))[k].pu, k);
  L.v('effacer le champ reste « à chiffrer »', l3 === null, l3);
  await L.fermer(c); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
