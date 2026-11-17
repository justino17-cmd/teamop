// Matériel, étape 3 (Dépôts et camions) — les captures À REGARDER : la page, chaque fiche et chaque feuille, sur un profil, de jour ou de nuit.
// Usage : node materiel-depots-captures.js <profil> [nuit] [dossier]   → des PNG dans le dossier (hors dépôt) ; rien à conclure ici : ON LES LIT (outil Read).
const L = require('../lib.js'), path = require('path');
const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', DIR = process.argv[4] || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/materiel3';
(async () => {
  const c = await L.ouvrir({ profil, nuit, qui:'marc' }), p = c.p, tag = profil + (nuit ? '-nuit' : '-jour');
  const snap = async nom => { await L.calme(p, 450); await L.capture(c, path.join(DIR, `d-${nom}-${tag}.png`)); };
  const R = (f, a) => p.evaluate(f, a), clic = s => p.evaluate(x => { const e = document.querySelector(x); if (e) e.click(); return !!e; }, s);
  await L.aller(p, 'boxes'); await snap('1-page');
  await R(() => window.scrollTo(0, 99999)); await snap('1b-bas'); await R(() => window.scrollTo(0, 0));
  await clic('[data-md="plus"]'); await snap('2-menu-plus'); await L.ranger(p);
  await clic('[data-md="avant"]'); await snap('3-avant-visites'); await L.ranger(p);
  await clic('[data-md="remplir"]'); await snap('4-remplir'); await R(() => { document.querySelector('#calque .panneau').scrollTop = 9999; }); await snap('4b-remplir-bas'); await L.ranger(p);
  await R(() => bxFiche('v1')); await snap('5-fiche-camion'); await R(() => { document.querySelector('#calque .panneau').scrollTop = 9999; }); await snap('5b-fiche-bas');
  await R(() => { document.querySelector('#calque .panneau').scrollTop = 0; }); await clic('#calque [data-md^="fplus|"]'); await snap('5c-fiche-plus'); await L.ranger(p);
  await R(() => bxFiche('atelier')); await snap('6-fiche-atelier'); await L.ranger(p);
  await R(() => bxFiche('d-hp')); await snap('7-fiche-reserve'); await L.ranger(p);
  await R(() => bxFiche('v4')); await snap('8-fiche-garage'); await L.ranger(p);
  await R(() => mdDotation('v1')); await snap('9-dotation'); await R(() => { MD.dot = null; }); await L.ranger(p);
  await R(() => bxModifier('v1')); await snap('10-modifier'); await L.ranger(p);
  await R(() => bxNouveau('')); await snap('11-nouvelle-reserve'); await L.ranger(p);
  await R(() => matCompter('v1')); await snap('12-compter'); await L.ranger(p);
  await R(() => { LIEUX.find(l => l.id === 'd-hp').ferme = AUJ; rendre(); }); await clic('[data-md="plus"]'); await snap('13-plus-fermees'); await L.ranger(p); await R(() => mdFermes()); await snap('13b-fermees'); await R(() => { delete LIEUX.find(l => l.id === 'd-hp').ferme; rendre(); }); await L.ranger(p);
  await R(() => { window.__L = LIEUX.splice(0); rendre(); }); await snap('14-aucun-lieu'); await R(() => { LIEUX.push(...window.__L); rendre(); });
  console.log('erreurs :', JSON.stringify(c.err)); await L.fin(c); await L.fermer();
})().catch(e => { console.error(e); process.exit(2); });
