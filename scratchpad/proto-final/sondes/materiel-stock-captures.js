// Matériel, étape 2 (Stock) — les captures À REGARDER : chaque écran et chaque feuille de Stock, sur un profil, de jour ou de nuit.
// Usage : node materiel-stock-captures.js <profil> [nuit] [dossier]   → des PNG dans le dossier (hors dépôt) ; rien à conclure ici : ON LES LIT (outil Read).
const L = require('../lib.js'), path = require('path');
const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', DIR = process.argv[4] || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/materiel2';
(async () => {
  const c = await L.ouvrir({ profil, nuit, qui:'marc' }), p = c.p, tag = profil + (nuit ? '-nuit' : '-jour');
  const snap = async nom => { await L.calme(p, 450); await L.capture(c, path.join(DIR, `s-${nom}-${tag}.png`)); };
  const R = (f, a) => p.evaluate(f, a), clic = s => p.evaluate(x => { const e = document.querySelector(x); if (e) e.click(); return !!e; }, s);
  await L.aller(p, 'stock'); await snap('1-articles');
  await R(() => window.scrollTo(0, 99999)); await snap('1b-bas'); await R(() => window.scrollTo(0, 0));
  await clic('[data-ms="maj"]'); await snap('2-quoi');
  await clic('#calque [data-ms="q|sortir"]'); await R(() => { MAT.G.q = ''; }); await clic('#calque [data-ms^="gajoute|"]'); await L.calme(p, 300); await clic('#calque [data-ms="gpour|collegue"]'); await snap('3-sortir');
  await R(() => { document.querySelector('#calque .panneau').scrollTop = 9999; }); await snap('3b-sortir-bas');
  await L.ranger(p); await clic('[data-ms="maj"]'); await clic('#calque [data-ms="q|ranger"]'); await snap('4-ranger-livraison');
  await clic('#calque [data-ms="gorig|comptoir"]'); await clic('#calque [data-ms^="gajoute|"]'); await snap('4b-ranger-comptoir');
  await L.ranger(p); await clic('[data-ms="maj"]'); await clic('#calque [data-ms="q|deplacer"]'); await clic('#calque [data-ms^="gajoute|"]'); await snap('5-deplacer');
  await L.ranger(p); await R(() => matCompter('v1')); await snap('6-compter');
  await L.ranger(p); await R(() => matCompter()); await snap('6b-compter-lieux');
  await L.ranger(p); await clic('[data-ms="envois"]'); await snap('7-envois');
  await clic('#calque [data-ms^="ref|"]'); await snap('7b-refuser');
  await L.ranger(p); await R(() => prFiche('p3')); await snap('8-fiche');
  await R(() => { document.querySelector('#calque .panneau').scrollTop = 9999; }); await snap('8b-fiche-bas');
  await L.ranger(p); await R(() => prFiche('p4')); await clic('#calque [data-ms^="fprixo|"]'); await snap('8c-fiche-fluide-prix');
  await L.ranger(p); await R(() => prFormulaire(null, PACKS_ENT[0], '')); await snap('9-formulaire');
  await L.ranger(p); await R(() => sxRegistre()); await snap('10-registre');
  await L.ranger(p); await R(() => msReglagesVue()); await snap('11-reglages');
  await L.ranger(p); await clic('[data-ms="plus"]'); await snap('12-menu-plus');
  await L.ranger(p); await clic('[data-ms="ou"]'); await snap('12b-menu-ou');
  await L.ranger(p); await clic('[data-ms="onglet|mvts"]'); await snap('13-journal');
  await clic('[data-ms="filtrer"]'); await snap('13b-filtre');
  await L.ranger(p); await R(() => { stkOnglet = 'ensemble'; stkQ = 'zzz'; rendre(); }); await snap('14-rien-trouve'); await R(() => { stkQ = ''; });
  await R(() => { window.__P = PRODUITS.splice(0); stkQ = ''; rendre(); }); await snap('15-stock-vide'); await R(() => { PRODUITS.push(...window.__P); rendre(); });
  await R(() => { MVTS_ATT.splice(0); rendre(); }); await R(() => { stkOnglet = 'mvts'; mvRech = 'zzz'; rendre(); }); await snap('16-journal-vide'); await R(() => { mvRech = ''; stkOnglet = 'ensemble'; });
  console.log('erreurs :', JSON.stringify(c.err)); await L.fin(c); await L.fermer();
})().catch(e => { console.error(e); process.exit(2); });
