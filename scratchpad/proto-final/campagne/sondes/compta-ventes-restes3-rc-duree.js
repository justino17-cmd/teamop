// Recontrôle adverse, tour 3 : une durée tapée EN MINUTES sur la main-d'œuvre (« 90 min », « 45 mn ») au prix de l'HEURE ; une pièce préparée retapée avec une autre casse (« 0,5 l »).
// Usage : node compta-ventes-restes3-rc-duree.js [profil]   — les lectures sont REPORTÉES (constats), pas toutes des contrôles.
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const c = await L.ouvrir({ profil: process.argv[2] || 'mac', qui: 'marc' }), p = c.p;
  await p.evaluate(() => { const i = INTS.find(o => o.cli && o.st !== 'annulee' && !o.fact) || INTS[0], F = fiche(i.id);
    FACTURES.filter(f => f.int === i.id).forEach(f => { f.id = 'old-' + f.id; }); i.fact = { mode: 'temps', tva: 10 }; F.debut = '08:00'; F.fin = '09:50';
    F.pieces = [{ nom: 'Nettoyant échangeur', q: '0,5 L', pu: 10.33 }]; factureDepuis(i); FACTURES.find(f => f.id === 'f-' + i.id).id = 'fx-d'; });
  await X.fiche(c, 'fx-d');
  const tot = k => p.evaluate(k2 => { const l = lignesDe(FACTURES.find(x => x.id === 'fx-d'))[k2]; return { q: l.q, qn: l.qn, total: totLigne(l) }; }, k);
  const nl = await p.evaluate(() => lignesDe(FACTURES.find(x => x.id === 'fx-d')).map(l => l.d + ' · ' + l.q + ' · ' + l.pu));
  console.log('  · lignes :', JSON.stringify(nl));
  const saisir = async (k, v) => { const l = p.locator('[data-fqte="' + k + '"]').first(); await l.fill(v); await l.press('Tab'); await L.calme(p, 400); };
  const mo = 0, piece = nl.length - 1;
  const base = await tot(mo); console.log('  · main-d’œuvre au départ', JSON.stringify(base));
  for (const v of ['2 h', '90 min', '45 mn', '1h30', '1,5 h', '90 minutes']) { await saisir(mo, v); const r = await tot(mo); console.log(`  · main-d’œuvre « ${v} » → total ${r.total} €  (qn ${r.qn})`); }
  const bp = await tot(piece); console.log('  · pièce au départ', JSON.stringify(bp));
  for (const v of ['0,5 L', '0,5 l', '0,5L', '1', '2']) { await saisir(piece, v); const r = await tot(piece); console.log(`  · pièce « ${v} » → total ${r.total} €`); }
  await saisir(mo, '90 min'); const r90 = await tot(mo);
  L.v('une durée en minutes au prix de l’heure ne se multiplie pas par 90 (attendu : refusée ou 97,50 €)', r90.total < 1000, r90.total);
  await L.capture(c, X.CAP.replace('campagne-compta-ventes/', 'cv-rc3/') + 'rc3-duree-90min.png');
  await L.fermer(c);
})().catch(e => { console.error(e); process.exit(1); });
