// Recontrôle adverse, tour 5 (2) : la ligne d'acompte après avoir EFFACÉ son prix (le refus du négatif la laisse sans retour), la quantité de l'acompte, l'aperçu d'envoi avec « 90 min ».
// Usage : node compta-ventes-restes5-rc2.js [profil] [nuit]
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' }), p = c.p;
  await p.evaluate(() => { const i = INTS.find(o => o.cli && o.st !== 'annulee' && !o.fact) || INTS[0], F = fiche(i.id);
    FACTURES.filter(f => f.int === i.id).forEach(f => { f.id = 'old-' + f.id; }); i.fact = { mode: 'temps', tva: 10 }; F.debut = '08:00'; F.fin = '09:50'; F.pieces = [];
    factureDepuis(i); FACTURES.find(f => f.id === 'f-' + i.id).id = 'fx-rc5b';
    const f = FACTURES.find(x => x.id === 'fx-rc5b'); f.lignes = lignesDe(f); f.lignes.push({ d: 'Acompte de 30 % déjà facturé', q: '1', pu: -50 }); });
  await X.fiche(c, 'fx-rc5b');
  const lg = () => p.evaluate(() => lignesDe(FACTURES.find(x => x.id === 'fx-rc5b')).map(l => ({ d: l.d, q: l.q, pu: l.pu, total: totLigne(l) })));
  const ht = () => p.evaluate(() => htDe(FACTURES.find(x => x.id === 'fx-rc5b')));
  const toast = () => p.evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.textContent.replace(/\s+/g, ' ').trim() : ''; });
  const ch = async (a, k, v) => { await p.waitForTimeout(2800); const e = p.locator('[data-' + a + '="' + k + '"]').first(); await e.fill(v); await e.press('Tab'); await L.calme(p, 400); };
  const ka = (await lg()).length - 1; const h0 = await ht();
  L.v('population : la ligne d’acompte porte −50 au départ', (await lg())[ka].pu === -50, JSON.stringify((await lg())[ka]));
  // a. quantité « 2 » sur l'acompte
  await ch('fqte', ka, '2'); let r = (await lg())[ka]; console.log('  · acompte × « 2 » :', JSON.stringify(r), '· Total HT', await ht(), '· toast « ' + await toast() + ' »');
  L.v('la quantité de l’acompte ne double pas la déduction (le prix est protégé, la quantité aussi ?)', r.total === -50, JSON.stringify(r));
  await ch('fqte', ka, '1');
  // b. effacer le prix puis retaper le montant avec son signe
  await ch('prix', ka, ''); r = (await lg())[ka]; console.log('  · prix effacé :', JSON.stringify(r), '· Total HT', await ht(), '(avant ' + h0 + ')');
  await ch('prix', ka, '-50'); r = (await lg())[ka]; const t1 = await toast(); console.log('  · « -50 » retapé après effacement :', JSON.stringify(r), '· toast « ' + t1 + ' »');
  L.v('on peut RÉTABLIR la déduction d’un acompte effacé par erreur (prix −50 de nouveau)', r.pu === -50, JSON.stringify(r) + ' · ' + t1);
  await ch('prix', ka, '50'); r = (await lg())[ka]; console.log('  · « 50 » tapé : ligne d’acompte à', JSON.stringify(r), '· Total HT', await ht());
  L.v('une ligne « Acompte déjà facturé » ne peut pas devenir un +50 € facturé en plus, sans un mot', !(r.pu > 0), JSON.stringify(r));
  // c. aperçu et envoi par le vrai bouton
  await p.evaluate(() => { const f = FACTURES.find(x => x.id === 'fx-rc5b'); f.lignes = lignesDe(f).filter(l => l.pu != null && l.pu > 0); rendre(); }); await L.calme(p, 400);
  await ch('fqte', 0, '90 min');
  await L.toucher(c, '[data-action="apercuEnvoi"]'); await L.calme(p, 800);
  const pan = await X.panneau(p).catch(() => ''); const pg = await p.evaluate(() => document.body.innerText.length);
  console.log('  · aperçu (' + pan.length + ' signes) :', pan.slice(0, 400).replace(/\n/g, ' | '));
  L.v('le panneau d’aperçu s’est ouvert (population)', pan.length > 50, pan.length);
  L.v('l’aperçu parle de « 90 min » ou de 1,5 h sans NaN / undefined', pan.length > 50 && !/NaN|undefined|\[object/.test(pan), pan.slice(0, 160));
  await L.capture(c, X.CAP.replace('campagne-compta-ventes/', 'cv-rc5/') + 'rc5b-' + profil + (nuit ? '-nuit' : '') + '.png');
  await L.fermer(c); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
