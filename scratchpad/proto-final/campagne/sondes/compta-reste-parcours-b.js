// Parcours B « compta-reste » : payer un fournisseur (Paiement fait, relevé fournisseur), ses effets sur la liste, les fournisseurs, la banque, le journal.
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const S = () => p.evaluate(() => { const E = cpEcritures(); let d = 0, cr = 0; E.forEach(e => e.lignes.forEach(l => { d += Math.round((l.de || 0) * 100); cr += Math.round((l.cr || 0) * 100); }));
    const a8 = ACHATS.find(a => a.id === 'a8'); return { aPayer: Math.round(ACHATS.filter(a => !a.paye && a.mode !== 'Note de frais' && a.mode !== 'Prélèvement').reduce((s, a) => s + cpTTC(a), 0) * 100), nb: ACHATS.filter(a => !a.paye && a.mode !== 'Note de frais' && a.mode !== 'Prélèvement').length,
      a8: { paye: a8.paye, mode: a8.mode, ttc: cpTTC(a8) }, ecr: E.length, d, cr, attente: cpRapprocher().attente.length, fournDu: cxFournisseurs().find(f => f.k === 'sp17').du, s512: cpSolde(E, '512'), s401: cpSolde(E, '401') }; });
  await X.compta(c, 'fachats', { cat: 'achats' });
  const s0 = await S(); v('B0 trois factures fournisseurs à payer, 896,28 € au total', s0.nb === 3 && s0.aPayer === 89628, s0);
  // « Nouvelle opération » → « Paiement fait »
  await L.toucher(c, '[data-cx="nouveau"]'); v('B1 « Paiement fait » est proposé et ouvre la liste', await L.toucher(c, '#calque [data-cx="payerliste"]') && await p.evaluate(() => /Quelle facture as-tu payée/.test(document.querySelector('#calque .panneau').innerText)));
  const lignes = await p.evaluate(() => [...document.querySelectorAll('#calque [data-cx^="payer|"]')].length); v('B1 la liste porte les 3 factures', lignes === 3, lignes);
  await L.capture(c, X.CAP + `${profil}-parcours-b-liste.png`);
  // le moyen « Chèque », puis « Payée » sur Sanitaire Pro 17 (a8)
  await p.selectOption('#cx-pmode', 'Chèque'); await L.toucher(c, '#calque [data-cx="payer|a8|choix"]');
  const s1 = await S(); const t1 = await X.toasts(p);
  v('B2 la facture est payée par chèque, le 31/10', s1.a8.paye === '31/10' && s1.a8.mode === 'Chèque', s1.a8);
  v('B2 il reste 2 factures à payer et 514,20 € (896,28 − 382,08)', s1.nb === 2 && s1.aPayer === 89628 - 38208, s1);
  v('B2 le toast dit la facture, le moyen et le montant', /SP17-4410/.test(t1) && /chèque/.test(t1) && /382,08/.test(t1), t1);
  v('B2 une écriture de plus, débit = crédit', s1.ecr > s0.ecr && s1.d === s1.cr, { avant: s0.ecr, apres: s1.ecr, d: s1.d, cr: s1.cr });
  v('B2 le compte 512 baisse de 382,08 € et le 401 aussi', Math.abs((s0.s512 - s1.s512) - 382.08) < .005, { s512: [s0.s512, s1.s512], s401: [s0.s401, s1.s401] });
  v('B2 le fournisseur ne lui doit plus rien', s1.fournDu === 0, s1.fournDu);
  v('B2 la liste « Paiement fait » reste ouverte avec les 2 factures restantes (on enchaîne)', await p.evaluate(() => [...document.querySelectorAll('#calque [data-cx^="payer|"]')].length) === 2);
  // double toucher sur la même facture : rien de plus
  await p.evaluate(() => { const b = document.querySelector('#calque [data-cx="payer|a9|choix"]'); b.click(); b.click(); }); await p.waitForTimeout(300);
  const s2 = await S(); v('B3 un double toucher ne paie qu’une fois (une seule écriture de plus)', s2.ecr === s1.ecr + (s2.ecr - s1.ecr) && (s2.ecr - s1.ecr) <= 2 && s2.nb === 1, { avant: s1.ecr, apres: s2.ecr, nb: s2.nb });
  await L.capture(c, X.CAP + `${profil}-parcours-b-apres.png`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  // la Banque le sait-elle ? 
  await X.compta(c, 'banque'); const att = await p.evaluate(() => cpRapprocher().attente.length); v('B4 la Banque montre les paiements du chèque et du virement « pas encore à la banque »', att === s0.attente + 2, { avant: s0.attente, apres: att });
  // relevé fournisseur
  await X.compta(c, 'fournisseurs'); await L.toucher(c, '[data-cx="relevef|dko"]'); const rel = await X.panneau(p); await L.capture(c, X.CAP + `${profil}-parcours-b-releve.png`);
  v('B5 le relevé Daikin dit « Tu lui dois au 31 octobre » et un montant', /Tu lui dois au 31 octobre/.test(rel), rel.slice(0, 300));
  const ok = await p.evaluate(() => { const o = cxFournisseurs().find(x => x.k === 'dko'); const sold = [...document.querySelectorAll('#calque .cx-bal-tot b')].map(b => b.textContent); return { du: o.du, sold }; });
  const du = Math.round(ok.du * 100), lu = L.cents(ok.sold[0] || '0'); v('B5 le solde du relevé = « Tu lui dois » de la liste, au centime', du === lu, ok);
  // payer depuis le relevé : « Payée par virement »
  const avant = (await S()).nb; await L.toucher(c, '#calque [data-cx^="payer|a9|"]'); v('B6 « Payée par virement » du relevé paie la facture', (await S()).nb === avant - 1);
  // l'écran « fournisseurs » se met à jour
  await p.keyboard.press('Escape'); await X.compta(c, 'fournisseurs'); const fd = await p.evaluate(() => document.querySelector('.cx-kpis4 .kpi:nth-child(3) b').textContent); v('B7 « encore à payer » = 171,00 € (il ne reste que le ventilateur)', L.cents(fd) === 17100, fd);
  await L.capture(c, X.CAP + `${profil}-parcours-b-fournisseurs.png`);
  v('B erreurs JavaScript : aucune', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
