// Recontrôle adverse, tour 4 : ce que « 90 min » casse à côté — lignes issues d'un DEVIS (« Main-d'œuvre (2 h) », quantité 1 au prix des 2 h),
// ligne libre ajoutée à la main, deuxième saisie en minutes, (l'arrondi d'un total négatif est inatteignable : un prix négatif est refusé, voir rc-b). Les lectures sont REPORTÉES (constats).
// Usage : node compta-ventes-restes4-rc-a.js [profil] [nuit]
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const c = await L.ouvrir({ profil: process.argv[2] || 'mac', nuit: process.argv[3] === 'nuit', qui: 'marc' }), p = c.p;
  // 1. facture préparée depuis le devis accepté (mode « devis »)
  await p.evaluate(() => { const i = INTS.find(o => o.cli === 'vp' && o.st !== 'annulee') || INTS[0], F = fiche(i.id);
    FACTURES.filter(f => f.int === i.id).forEach(f => { f.id = 'old-' + f.id; }); i.fact = { mode: 'devis', tva: 10 }; F.debut = '08:00'; F.fin = '10:00'; DEVIS[i.cli] = DEVIS[i.cli] || DEVIS.vp; i.cli = 'vp';
    factureDepuis(i); FACTURES.find(f => f.id === 'f-' + i.id).id = 'fx-a'; });
  await X.fiche(c, 'fx-a');
  const lg = () => p.evaluate(() => lignesDe(FACTURES.find(x => x.id === 'fx-a')).map(l => ({ d: l.d, q: l.q, qn: l.qn, pu: l.pu, total: totLigne(l) })));
  const saisir = async (k, v) => { const l = p.locator('[data-fqte="' + k + '"]').first(); await l.fill(v); await l.press('Tab'); await L.calme(p, 350); };
  const L0 = await lg(); console.log('  · lignes du devis :', JSON.stringify(L0));
  let tDevis = '', aDevis = null; const kmo = L0.findIndex(l => /main.d.œuvre/i.test(l.d));
  L.v('population : une ligne de main-d’œuvre issue du devis', kmo >= 0, JSON.stringify(L0.map(l => l.d)));
  if (kmo >= 0) { const l0 = L0[kmo];
    await saisir(kmo, '90 min'); const r = (await lg())[kmo], t = await X.toasts(p); tDevis = t; aDevis = r;
    console.log(`  · devis « ${l0.d} » ${l0.q} × ${l0.pu} € ; « 90 min » → ${r.total} € · toast « ${t} »`);
    L.v('« 90 min » sur une ligne de devis dont le prix couvre déjà sa durée ne multiplie pas ce prix par 1,5', r.total <= l0.pu + 0.005, r.total + ' pour un prix de ligne de ' + l0.pu); }
  await L.capture(c, X.CAP.replace('campagne-compta-ventes/', 'cv-rc4/') + 'rc4-devis-90min.png');
  // 2. ligne libre : « 2h » puis deux saisies en minutes de suite
  await p.evaluate(() => { const f = FACTURES.find(x => x.id === 'fx-a'); f.lignes = lignesDe(f); f.lignes.push({ d: 'Intervention de dépannage', q: '1', pu: 65 }); rendre(); }); await L.calme(p, 400);
  const k2 = (await lg()).length - 1;
  await saisir(k2, '2h'); const a = (await lg())[k2];
  await saisir(k2, '90 min'); const b = (await lg())[k2];
  await saisir(k2, '45 min'); const t2 = await X.toasts(p), d = (await lg())[k2];
  console.log(`  · ligne libre : 2h → ${a.total} · 90 min → ${b.total} · puis 45 min → ${d.total} · toast « ${t2} »`);
  L.v('deux saisies en minutes de suite sur une ligne à l’heure : la seconde passe aussi', Math.abs(d.total - 48.75) < 0.006, d.total + ' · ' + t2);
  // 3. garde : « 90 min » sur une ligne de devis dont le prix couvre déjà la durée est REFUSÉ avec la phrase, la quantité d'avant reste
  L.v('la quantité de la ligne de devis est restée celle d’avant et son total aussi', !!aDevis && aDevis.q === L0[kmo].q && aDevis.total === L0[kmo].pu, JSON.stringify(aDevis));
  L.v('la phrase dite est celle des minutes, pas un silence', /ligne facturée à l’heure/.test(tDevis), tDevis);
  await L.fermer(c); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
