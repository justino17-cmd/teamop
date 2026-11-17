// Détails relevés à la lecture et à l'œil (campagne compta-reste) : chaque contrôle porte le numéro du défaut. « N ✓ · M ✗ ».
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
(async () => {
  const c = await L.ouvrir({ profil: process.argv[2] || 'mac', qui: 'marc' }), p = c.p;
  // 09 — le bandeau « Cet écran est un résumé… Ouvrir dans la Comptabilité » ne se pose pas DANS la Comptabilité sans dire de quelle comptabilité il parle
  const bande = {}; for (const o of ['tva', 'ecritures', 'balance', 'grandlivre', 'resultat', 'normes', 'archives', 'cloture', 'envoi']) { await X.compta(c, o); bande[o] = await p.evaluate(() => { const e = document.querySelector('#contenu .cmpt-pont'); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; }); }
  const dit = Object.values(bande).filter(t => /dans la Comptabilité/.test(t)).length; console.log('bandeaux « dans la Comptabilité » :', dit, 'sur', Object.keys(bande).length);
  v('compta-reste-09 · le bandeau de renvoi ne dit pas « dans la Comptabilité » quand on y est déjà (neuf onglets)', dit === 0, bande);
  const cl = bande.cloture + ' ' + bande.envoi; v('compta-reste-09b · la clôture se dit sous le nom que porte l’onglet (« Clôture du mois »), pas « Fin de mois »', !/Fin de mois/.test(cl), cl);
  // 13 — « N sur M points vérifiés » et les pastilles disent des totaux qui se recoupent
  await X.compta(c, 'normes'); const cf = await p.evaluate(() => { const t = document.querySelector('#contenu .cx-score-g'); const ch = [...document.querySelectorAll('#contenu .cx-score-d .st')].map(e => e.textContent.trim());
    const m = (t.innerText.match(/(\d+) sur (\d+)/) || []); const n = Object.fromEntries(ch.map(s => { const k = s.match(/^(\d+) (.*)$/); return [k[2], +k[1]]; })); const verifies = cxVerifies(cxConformite(cxChiffres(), cxDocs())).length; return { ok: +m[1], sur: +m[2], pastilles: n, verifies }; });
  v('compta-reste-13 · « N sur M » = la somme « en règle + à régler + à surveiller » des pastilles (6 + 8 = 14 ≠ 13)', cf.sur === (cf.pastilles['à régler'] || 0) + (cf.pastilles['à surveiller'] || 0) + cf.ok, cf);
  // 14 — des en-têtes de colonnes en « Title Case » forcée (Entré Le, Salaire De Base, Net Payé)
  await X.compta(c, 'salaries'); const en = await p.evaluate(() => [...document.querySelectorAll('#contenu .pt-entete, #contenu .paie-r.pt-entete span')].map(e => e.innerText).join(' | ') || [...document.querySelectorAll('#contenu [class*="entete"]')].map(e => e.innerText.replace(/\s+/g, ' ')).join(' | '));
  v('compta-reste-14 · les en-têtes de colonnes ne passent pas en majuscules à chaque mot (« Entré Le », « Salaire De Base », « Impôt (Taux) »)', !/Entré Le|Salaire De Base|Impôt \(Taux\)/.test(en), en);
  // 20 — « à payer » : deux totaux pour un même mot
  await X.compta(c, 'fachats', { cat: 'achats' }); const t1 = await p.evaluate(() => (document.querySelector('#contenu .cx-total') || {}).innerText || '');
  await X.compta(c, 'fournisseurs'); const t2 = await p.evaluate(() => (document.querySelector('.cx-kpis4 .kpi:nth-child(3)') || {}).innerText || '');
  const a1 = (t1.match(/à payer\s*([\d\s ,]+)/) || [])[1], a2 = (t2.match(/([\d\s ,]+)\s*€/) || [])[1];
  v('compta-reste-20 · « à payer » vaut le même montant sur la liste des achats et sur « Comptes fournisseurs » (les notes de frais à valider n’y comptent pas)', a1 && a2 && L.cents(a1) === L.cents(a2), { liste: t1.replace(/\s+/g, ' '), fournisseurs: t2.replace(/\s+/g, ' ') });
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
