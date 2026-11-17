// Parcours A « compta-reste » : saisir une facture fournisseur / une dépense (Comptabilité › Achats), jouer les erreurs, recalculer au centime.
// usage : node compta-reste-parcours-a.js [profil]   → « N ✓ · M ✗ », code 1 si un contrôle tombe
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const etat = () => p.evaluate(() => ({ n: ACHATS.length, tva: cpTva(), ens: cpEcritures().length }));
  const ouvrir = async () => { await X.compta(c, 'fachats', { cat: 'achats' }); await p.evaluate(() => cxDepense()); await p.waitForTimeout(250); };
  const remplir = async o => { for (const [id, val] of Object.entries(o)) { if (id === 'pay') await p.evaluate(x => { const r = document.querySelector('input[name="dp-pay"][value="' + x + '"]'); if (r) r.click(); }, val);
      else if (id === 'just') await p.evaluate(x => { const r = document.querySelector('input[name="dp-j"][value="' + x + '"]'); if (r) r.click(); }, val);
      else if (id === 'dp-t' || id === 'dp-n') await p.selectOption('#' + id, String(val)); else await p.fill('#' + id, String(val)); } };
  const valider = async () => { await p.evaluate(() => { const b = document.querySelector('#calque [data-cx="depenseok"]'); if (b) b.click(); }); await p.waitForTimeout(350); return X.toasts(p); };
  // 0. on y arrive comme une personne : « ＋ Nouvelle opération » puis « Facture fournisseur ou dépense »
  await X.compta(c, 'fachats', { cat: 'achats' });
  v('A0 le bouton « Nouvelle opération » ouvre le choix', await L.toucher(c, '[data-cx="nouveau"]') && await p.evaluate(() => !!document.querySelector('#calque [data-cx="depense"]')));
  v('A0 « Facture fournisseur ou dépense » ouvre le formulaire', await L.toucher(c, '#calque [data-cx="depense"]') && await p.evaluate(() => !!document.getElementById('dp-f')));
  await L.capture(c, X.CAP + `${profil}-parcours-a-formulaire.png`);
  // 1. erreurs : champs vides, un à un
  let t = await valider(); v('A1 formulaire vide → « Indique le fournisseur »', /fournisseur/i.test(t), t);
  await remplir({ 'dp-f': 'Clim Pièces Atlantique' }); t = await valider(); v('A1 sans description → refus dit', /ce que c.est|décri|Écris/i.test(t), t);
  await remplir({ 'dp-o': 'Fluide R32, 2 bouteilles' }); t = await valider(); v('A1 sans montant → refus dit', /montant/i.test(t), t);
  for (const bad of ['-50', 'abc', '0']) { await remplir({ 'dp-h': bad }); const av = await etat(); t = await valider(); const ap = await etat();
    v(`A2 montant « ${bad} » : refusé`, ap.n === av.n && !!t, { toast: t, avant: av.n, apres: ap.n }); }
  // 3. la virgule et le point des milliers
  const lire = async txt => { await remplir({ 'dp-h': txt }); await p.dispatchEvent('#dp-h', 'input'); await p.waitForTimeout(80); return p.evaluate(() => document.getElementById('dp-ttc').textContent.replace(/[\s  ]/g, '')); };
  const e1 = await lire('1 234,56'), e2 = await lire('1.234,56'), e3 = await lire('1234.56'), e4 = await lire('12 345,67');
  v('A3 « 1 234,56 » + 20 % = 1481,47 €', e1 === '1481,47€', e1); v('A3 « 1.234,56 » (point des milliers) + 20 % = 1481,47 € (ou refusé)', e2 === '1481,47€' || e2 === '0,00€', e2);
  v('A3 « 1234.56 » + 20 % = 1481,47 €', e3 === '1481,47€', e3); v('A3 « 12 345,67 » + 20 % = 14814,80 €', e4 === '14814,80€', e4);
  // 4. une dépense juste, au centime
  await remplir({ 'dp-h': '100', just: 'facture', 'dp-r': 'T-RESTE-001' });
  const avant = await etat(); t = await valider(); const apres = await etat();
  v('A4 la dépense est rangée (une pièce de plus)', apres.n === avant.n + 1, { avant: avant.n, apres: apres.n, toast: t });
  v('A4 le toast dit où elle est rangée et le montant TTC', /Rangée dans/.test(t) && /120,00/.test(t), t);
  v('A4 sa TVA (20,00 €) s’ajoute à la TVA déductible, au centime', Math.abs(apres.tva.ded - avant.tva.ded - 20) < .005 || Math.abs(apres.tva.manque - avant.tva.manque - 20) < .005, { ded: [avant.tva.ded, apres.tva.ded], manque: [avant.tva.manque, apres.tva.manque] });
  v('A4 la TVA à payer = collectée − déductible', Math.abs(apres.tva.aPayer - (apres.tva.col - apres.tva.ded)) < .005, apres.tva);
  v('A4 le journal compte plus d’écritures', apres.ens > avant.ens, { avant: avant.ens, apres: apres.ens });
  const eq = await p.evaluate(() => { const E = cpEcritures(); let d = 0, cr = 0; E.forEach(e => e.lignes.forEach(l => { d += Math.round((l.de || 0) * 100); cr += Math.round((l.cr || 0) * 100); })); return { d, cr }; });
  v('A4 le journal reste équilibré (débit = crédit, au centime)', eq.d === eq.cr, eq);
  // 5. le doublon
  await ouvrir(); await remplir({ 'dp-f': 'Clim Pièces Atlantique', 'dp-o': 'Même facture', 'dp-h': '10', just: 'facture', 'dp-r': 'T-RESTE-001' }); const n0 = (await etat()).n; t = await valider();
  v('A5 la même facture ne s’enregistre pas deux fois', (await etat()).n === n0 && /Déjà saisie/.test(t), t);
  // 6. date hors octobre
  await ouvrir(); await remplir({ 'dp-f': 'Test date', 'dp-o': 'Date', 'dp-h': '10', 'dp-d': '2026-11-05' }); t = await valider();
  v('A6 une date de novembre est refusée', (await etat()).n === n0, t); v('A6 le refus ne parle pas de « prototype » (mot d’échafaudage)', !/prototype/i.test(t), t);
  // 7. échéance avant la date
  await ouvrir(); await remplir({ 'dp-f': 'Test échéance', 'dp-o': 'Éch', 'dp-h': '10', 'dp-e': '2026-10-01' }); t = await valider(); v('A7 une échéance avant la facture est refusée', (await etat()).n === n0 && /échéance/i.test(t), t);
  // 8. un nom de fournisseur de 60 caractères et une description très longue : la liste tient
  const long = 'Établissements Dupont-Lefèvre & Fils Matériaux Spécialisés'; await ouvrir(); await remplir({ 'dp-f': long, 'dp-o': 'Description très longue '.repeat(6), 'dp-h': '12345.67', 'dp-t': '10' }); t = await valider();
  await X.compta(c, 'fachats', { cat: 'achats' }); const dep = await L.deborde(c); v('A8 un fournisseur de 60 signes et un montant de 12 345,67 € : la page ne glisse pas', !dep.bouge, dep);
  await L.capture(c, X.CAP + `${profil}-parcours-a-liste-longue.png`);
  // 8b. une valeur absurde (une faute de frappe de plus) ne passe pas en silence : deux zéros de trop, ou une écriture scientifique
  for (const gros of ['1e9', '12000000']) { await ouvrir(); await remplir({ 'dp-f': 'Test montant', 'dp-o': 'Montant absurde', 'dp-h': gros }); const av = await etat(); t = await valider(); const ap = await etat();
    v(`A8b un montant de « ${gros} » € n’est pas rangé sans un mot (refusé ou signalé)`, ap.n === av.n, { toast: t, avant: av.n, apres: ap.n }); }
  // 9. échap ferme la fenêtre ; annuler ne crée rien
  await ouvrir(); const n1 = (await etat()).n; await p.keyboard.press('Escape'); await p.waitForTimeout(250); v('A9 Échap ferme le formulaire', await p.evaluate(() => !document.querySelector('#calque .panneau')));
  await ouvrir(); await L.toucher(c, '#calque [data-ferme="1"]'); v('A9 « Annuler » ne crée rien', (await etat()).n === n1);
  console.log('erreurs', c.err.slice(0, 5)); v('A erreurs JavaScript : aucune', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
