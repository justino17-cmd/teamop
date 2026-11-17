// Recontrôle « compta-reste » : deux parcours de bout en bout, joués par les vrais boutons, chiffres recalculés au centime.
//  P1 · Marc saisit une facture fournisseur « 1.234,56 » HT à 20 % non payée : elle doit se retrouver, juste, dans Achats (« à payer »), Comptes fournisseurs, TVA, Journal, Balance, Résultat.
//  P2 · la technicienne envoie une note de frais « 62,40 » (formulaire réel), Marc la valide (avec ticket simulé) : elle devient une dépense, la TVA suit, « à payer » ne bouge pas (déjà payée par la salariée).
// usage : node compta-reste-recontrole-parcours.js [profil] [nuit] → « N ✓ · M ✗ »
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', suf = profil + (nuit ? '-nuit' : '');
  const c = await L.ouvrir({ profil, nuit, qui: 'sm' }), p = c.p;
  const mesure = () => p.evaluate(() => { const E = cpEcritures(), d = Math.round(E.reduce((s, e) => s + e.lignes.reduce((t, l) => t + (l.de || 0), 0), 0) * 100), cr = Math.round(E.reduce((s, e) => s + e.lignes.reduce((t, l) => t + (l.cr || 0), 0), 0) * 100), tv = cpTva();
    return { n: ACHATS.length, ens: E.length, d, cr, ded: Math.round((tv.ded || 0) * 100), manque: Math.round((tv.manque || 0) * 100), aPayer: Math.round(tv.aPayer * 100), apayerAchats: Math.round(ACHATS.filter(a => !a.paye).reduce((s, a) => s + cpTTC(a), 0) * 100), ndf: NDF.length }; });
  // ── P2 d'abord (la technicienne, puis le gérant dans la MÊME page : l'état du prototype est en mémoire) ──
  await p.evaluate(() => aller('techfrais')); await L.calme(p, 500);
  const m0 = await mesure();
  v('P2.0 · la technicienne ouvre « Note de frais »', await L.toucher(c, '[data-rl="ndf"]') && await p.evaluate(() => !!document.getElementById('rn-m')));
  await p.selectOption('#rn-o', { label: 'Péage ou parking' }); await p.fill('#rn-m', '62,40'); await p.selectOption('#rn-t', '20');
  await L.toucher(c, '#calque [data-rl="ndfok"]'); const t2 = await X.toasts(p); const m1 = await mesure();
  v('P2.1 · la note part au bureau : une note de plus, et la phrase le dit', m1.ndf === m0.ndf + 1 && /Note envoyée/.test(t2), t2);
  v('P2.1b · rien n’est encore une dépense (le bureau n’a pas validé)', m1.n === m0.n, { avant: m0.n, apres: m1.n });
  await p.evaluate(() => rlChanger('patron', { muet: true })); await L.calme(p, 600); await X.compta(c, 'ndf', { cat: 'ndf' });
  const id = await p.evaluate(() => NDF[0].id), qui = await p.evaluate(() => NDF[0].qui);
  v('P2.2 · Marc voit la note de la technicienne en tête, à 62,40 €', qui === 'sm' && /62,40/.test(await X.texte(p)), { qui });
  await L.toucher(c, `[data-cx="doc|ndf|${id}"]`); const fiche = await X.panneau(p); v('P2.3 · sa fiche dit le montant et la TVA, et propose de valider ou refuser', /62,40/.test(fiche) && /20 %/.test(fiche) && /Valider|Refuser/.test(fiche), fiche.slice(0, 220));
  await L.capture(c, X.CAP + `rc-parcours-p2-fiche-${suf}.png`);
  // pas de ticket : « Valider sans ticket » (si la règle du patron l'autorise) puis confirmation
  const sans = await p.evaluate(() => !!document.querySelector('#calque [data-ac^="ndfsans|"]')), ok = await p.evaluate(() => !!document.querySelector('#calque [data-ac^="ndfok|"]'));
  if (ok) await L.toucher(c, '#calque [data-ac^="ndfok|"]'); else if (sans) { await L.toucher(c, '#calque [data-ac^="ndfsans|"]'); await L.toucher(c, '#calque [data-ac^="ndfoksans|"]'); }
  const m2 = await mesure(); v('P2.4 · validée : la note devient une dépense (une pièce de plus)', m2.n === m1.n + 1, { avant: m1.n, apres: m2.n, sans, ok });
  v('P2.5 · sa TVA de 10,40 € (62,40 TTC à 20 %) est comptée, récupérable ou signalée, au centime', Math.abs((m2.ded - m1.ded) + (m2.manque - m1.manque) - 1040) <= 1, { ded: [m1.ded, m2.ded], manque: [m1.manque, m2.manque] });
  v('P2.6 · « à payer » des achats ne bouge pas (la salariée a avancé l’argent : à lui rembourser, pas un fournisseur à payer)', m2.apayerAchats === m1.apayerAchats, { avant: m1.apayerAchats, apres: m2.apayerAchats });
  v('P2.7 · le journal reste équilibré', m2.d === m2.cr, m2);
  // ── P1 : Marc saisit une dépense « 1.234,56 » HT ──
  await X.compta(c, 'fachats', { cat: 'achats' }); await p.evaluate(() => cxDepense()); await p.waitForTimeout(250);
  await p.fill('#dp-f', 'Fournisseur Parcours Un'); await p.fill('#dp-o', 'Compresseur pour une climatisation'); await p.fill('#dp-h', '1.234,56'); await p.dispatchEvent('#dp-h', 'input');
  await p.evaluate(() => { const r = document.querySelector('input[name="dp-j"][value="facture"]'); if (r) r.click(); }); await p.fill('#dp-r', 'PU-2026-001');
  const live = await p.evaluate(() => document.getElementById('dp-ttc').textContent.replace(/\s/g, '')); v('P1.0 · le total en direct dit 1481,47 € TTC', live === '1481,47€', live);
  await L.capture(c, X.CAP + `rc-parcours-p1-saisie-${suf}.png`);
  const a0 = await mesure(); await p.evaluate(() => document.querySelector('#calque [data-cx="depenseok"]').click()); await p.waitForTimeout(400); const t1 = await X.toasts(p); const a1 = await mesure();
  v('P1.1 · la dépense est rangée et la phrase dit 1 481,47 € TTC et 246,91 € de TVA récupérable', a1.n === a0.n + 1 && /1 481,47/.test(t1) && /246,91/.test(t1), t1);
  v('P1.2 · « à payer » des achats monte de 1 481,47 €', a1.apayerAchats - a0.apayerAchats === 148147, { avant: a0.apayerAchats, apres: a1.apayerAchats });
  v('P1.3 · la TVA déductible monte de 246,91 €', a1.ded - a0.ded === 24691, { ded: [a0.ded, a1.ded] });
  v('P1.4 · le journal compte une écriture de plus et reste équilibré', a1.ens === a0.ens + 1 && a1.d === a1.cr, a1);
  await X.compta(c, 'achats-liste', {}).catch(() => {}); await X.compta(c, 'fachats', { cat: 'achats' }); const tl = await X.texte(p, '#contenu .cx-total'); const apayer = (tl.match(/à payer\s*([\d\s ,]+)/) || [])[1];
  v('P1.5 · le pied de la liste des achats dit le même « à payer » que le calcul', apayer && L.cents(apayer) === a1.apayerAchats, { tl, calcul: a1.apayerAchats });
  await X.compta(c, 'fournisseurs'); const tf = await X.texte(p); const lig = (tf.match(/Fournisseur Parcours Un[^\n]*\n[^\n]*\n?[^\n]*\n?[^\n]*/) || [''])[0]; v('P1.6 · Comptes fournisseurs montre « Fournisseur Parcours Un » avec 1 481,47 € dû', /Fournisseur Parcours Un/.test(tf) && /1\s?481,47/.test(tf.slice(tf.indexOf('Fournisseur Parcours Un'), tf.indexOf('Fournisseur Parcours Un') + 160)), lig.slice(0, 160));
  await L.capture(c, X.CAP + `rc-parcours-p1-fournisseurs-${suf}.png`);
  await X.compta(c, 'balance'); const bal = await p.evaluate(() => { const t = (document.querySelector('#contenu') || {}).innerText || ''; return { ok: /401/.test(t) && /44566/.test(t), extrait: t.replace(/\s+/g, ' ').slice(0, 300) }; });
  v('P1.7 · la Balance porte les comptes 401 (fournisseurs) et 44566 (TVA déductible)', bal.ok, bal.extrait);
  await X.compta(c, 'resultat'); const res = await X.texte(p); v('P1.8 · le Résultat est lisible et sans « NaN » ni « undefined »', res.length > 100 && !/NaN|undefined/.test(res), res.slice(0, 120));
  for (const o of ['tva', 'ecritures', 'grandlivre', 'banque', 'normes', 'cloture']) { await X.compta(c, o); const t = await X.texte(p); v(`P-fin · ${o} : aucun « NaN » ni « undefined » après ces saisies`, t.length > 80 && !/NaN|undefined|\[object/.test(t), t.slice(0, 80)); }
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
