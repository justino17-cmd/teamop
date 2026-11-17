// Corrections « compta-reste » (campagne du 17 novembre 2026) : ce que le correcteur a changé, rejoué ET REGARDÉ.
// usage : node compta-reste-corr.js [profil] — « N ✓ · M ✗ », code 1 si un contrôle tombe ; captures dans X.CAP.
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', c = await L.ouvrir({ profil, nuit, qui: 'marc' }), p = c.p;
  const etat = () => p.evaluate(() => ({ n: ACHATS.length, ens: cpEcritures().length }));
  const toasts = async () => { await p.waitForTimeout(300); return X.toasts(p); };
  // 03/04 — un montant ambigu, illisible ou démesuré se refuse avec une phrase ; « 1.234,56 » se lit 1 234,56
  await X.compta(c, 'fachats', { cat: 'achats' }); await p.evaluate(() => cxDepense()); await p.waitForTimeout(250);
  await p.fill('#dp-f', 'Clim Pièces Atlantique'); await p.fill('#dp-o', 'Fluide R32');
  const essai = async txt => { await p.fill('#dp-h', txt); const av = await etat(); await p.evaluate(() => document.querySelector('#calque [data-cx="depenseok"]').click()); const t = await toasts(); return { t, rien: (await etat()).n === av.n }; };
  let r = await essai('1.234'); v('compta-reste-03 · « 1.234 » (mille deux cent trente-quatre ou un virgule deux trois ?) est refusé avec une phrase qui propose les deux écritures', r.rien && /pas clair/.test(r.t) && /1234/.test(r.t), r.t);
  r = await essai('1e9'); v('compta-reste-04 · « 1e9 » est refusé : « ne se lit pas »', r.rien && /ne se lit pas/.test(r.t), r.t);
  r = await essai('12000000'); v('compta-reste-04 · 12 000 000 est refusé : « Vérifie le montant »', r.rien && /Vérifie le montant/.test(r.t), r.t);
  r = await essai('12,345'); v('compta-reste-03 · trois décimales : refusé avec une phrase', r.rien && !!r.t, r.t);
  await p.fill('#dp-h', '1.234,56'); await p.evaluate(() => document.getElementById('dp-h').dispatchEvent(new Event('input', { bubbles: true }))); await p.waitForTimeout(150);
  const ttc = await p.evaluate(() => document.getElementById('dp-ttc').textContent.replace(/\s| | /g, ''));
  v('compta-reste-03 · « 1.234,56 » + 20 % : le total en direct dit 1481,47 €', ttc === '1481,47€', ttc);
  const av = await etat(); await p.evaluate(() => document.querySelector('#calque [data-cx="depenseok"]').click()); const t2 = await toasts();
  const ap = await etat(); const dern = await p.evaluate(() => ACHATS[ACHATS.length - 1].ht);
  v('compta-reste-03 · « 1.234,56 » enregistré : 1 234,56 € HT en comptabilité', ap.n === av.n + 1 && dern === 1234.56, { dern, t2 });
  // 05 — la phrase d'une date hors octobre
  await p.evaluate(() => cxDepense()); await p.waitForTimeout(250); await p.fill('#dp-f', 'Clim Pièces Atlantique'); await p.fill('#dp-o', 'Fluide'); await p.fill('#dp-h', '10'); await p.fill('#dp-d', '2026-11-05');
  await p.evaluate(() => document.querySelector('#calque [data-cx="depenseok"]').click()); const t5 = await toasts();
  v('compta-reste-05 · une date de novembre : « Octobre est le seul mois ouvert… », sans « prototype »', /Octobre est le seul mois ouvert/.test(t5) && !/prototype/i.test(t5), t5);
  await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
  // 20 — le total du bas
  await X.compta(c, 'fachats', { cat: 'achats' }); const tot = await p.evaluate(() => (document.querySelector('#contenu .cx-total') || {}).innerText || '');
  v('compta-reste-20 · le total du bas range les notes de frais à part (« à payer » = Comptes fournisseurs)', /notes de frais à valider/.test(tot), tot.replace(/\s+/g, ' '));
  await L.capture(c, X.CAP + `${profil}${nuit ? '-nuit' : ''}-corr-achats-total.png`);
  // 10 — le bilan des encaissements : même total et même TVA que Paiements et TVA
  await X.compta(c, 'archives', {}); const k = await p.evaluate(() => { const E = cpEncOct(), tv = cpTva(); return { tot: cpR(E.reduce((s, e) => s + e.ttc, 0)), col: tv.col, n: E.length, terrain: cpPaieTerrain().length }; });
  await p.evaluate(() => document.querySelector('[data-action="bilanPdf"]').click()); await p.waitForTimeout(500);
  const bil = await p.evaluate(() => (document.querySelector('.panneau .pdf, #calque .pdf') || {}).innerText || '');
  const f = x => x.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  v('compta-reste-10 · le bilan dit le total encaissé de Paiements (3 085,00 €) et ses ' + k.n + ' paiements', bil.replace(/[\s  ]/g, '').includes(f(k.tot).replace(/ /g, '') + '€') && new RegExp('Détail · ' + k.n + ' paiements', 'i').test(bil), { k, ok: bil.slice(0, 400) });
  const tvaLignes = bil.split('\n').filter(l => /^TVA collectée/.test(l)).map(l => parseFloat(l.split('\t').pop().replace(/[^\d,]/g, '').replace(',', '.')));
  v('compta-reste-10 · la TVA collectée du bilan (somme des lignes) est celle de l’écran TVA', Math.abs(tvaLignes.reduce((s, x) => s + x, 0) - k.col) < 0.011, { tvaLignes, col: k.col });
  v('compta-reste-10 · le bilan nomme les espèces reçues sur place, pas encore sur une facture', k.terrain > 0 && /reçus sur place/.test(bil), bil.slice(0, 300));
  await L.capture(c, X.CAP + `${profil}${nuit ? '-nuit' : ''}-corr-bilan.png`);
  // 13 — Aux normes : le grand chiffre et les pastilles disent la même population
  await X.compta(c, 'normes', {}); const nm = await p.evaluate(() => { const g = (document.querySelector('#contenu .cx-score-g') || {}).innerText || '', m = g.match(/(\d+) sur (\d+)/), pa = [...document.querySelectorAll('#contenu .cx-score-d .st')].map(e => e.textContent.trim()); return { g: g.replace(/\s+/g, ' '), ok: +m[1], sur: +m[2], pa }; });
  const n1 = x => +((nm.pa.find(s => s.includes(x)) || '0').match(/^\d+/) || [0])[0];
  v('compta-reste-13 · « N sur M » = en règle + à régler + à surveiller (les pastilles)', nm.sur === nm.ok + n1('à régler') + n1('à surveiller'), nm);
  await L.capture(c, X.CAP + `${profil}${nuit ? '-nuit' : ''}-corr-normes.png`);
  // 14 — en-têtes
  await X.compta(c, 'salaries', {}); const en = await p.evaluate(() => [...document.querySelectorAll('#contenu .pt-entete span')].map(e => getComputedStyle(e).textTransform).filter(x => x !== 'none').length);
  v('compta-reste-14 · aucun en-tête de colonne en capitales à chaque mot', en === 0, en);
  await L.capture(c, X.CAP + `${profil}${nuit ? '-nuit' : ''}-corr-salaries.png`);
  // 11 — fondu des tableaux qui défilent (ipad) : capture du Journal, de la Balance, puis fin de course (le fondu se retire à droite, apparaît à gauche)
  if (profil === 'ipad') { for (const o of ['ecritures', 'balance', 'fiches']) { await X.compta(c, o, {}); await L.calme(p, 400);
      const e1 = await p.evaluate(() => { const l = document.querySelector('#contenu .cx-liste, #contenu .paie-liste, #contenu .tableau'); return l ? { cls: l.className, droite: l.classList.contains('d-plus-droite'), gauche: l.classList.contains('d-plus-gauche') } : null; });
      v(`compta-reste-11 · ${o} : fondu à droite au départ, pas à gauche`, !!e1 && e1.droite && !e1.gauche, e1); await L.capture(c, X.CAP + `${profil}${nuit ? '-nuit' : ''}-corr-fondu-${o}-debut.png`);
      const e2 = await p.evaluate(() => { const l = document.querySelector('#contenu .cx-liste, #contenu .paie-liste, #contenu .tableau'); l.scrollLeft = 9999; return new Promise(ok => setTimeout(() => ok({ droite: l.classList.contains('d-plus-droite'), gauche: l.classList.contains('d-plus-gauche') }), 200)); });
      v(`compta-reste-11 · ${o} : au bout du défilement, le fondu passe à gauche`, !e2.droite && e2.gauche, e2); await L.capture(c, X.CAP + `${profil}${nuit ? '-nuit' : ''}-corr-fondu-${o}-fin.png`); } }
  const err = await p.evaluate(() => (window.__erreurs || []).length); await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
