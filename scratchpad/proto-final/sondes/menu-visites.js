// Les visites (la visite parlée et « De A à Z ») citent des rubriques : on les lance pour de bon, on lit ce qu'elles DISENT pendant
// quelques dizaines de secondes, et on cherche les anciens noms (MENU-FINAL.md). Une visite qui meurt sur une erreur se dit.
const { L } = require('./menu-commun.js'), v = L.v;
const VIEUX = [[/tableau de bord/i, 'Tableau de bord'], [/\bBoxes\b/, 'Boxes'], [/Toutes les catégories/, 'Toutes les catégories'], [/Absences (&|&amp;) congés/, 'Absences & congés'], [/Interv\./, 'Interv.'], [/Mes frais et demandes/, 'Mes frais et demandes'], [/Métier 3D/, 'Métier 3D'], [/\bCRM\b/, 'CRM'], [/Planification/, 'Planification'], [/onglet « ?Plus/i, 'onglet Plus']];
async function ecouter(c, tag, secondes) {
  const dit = new Set(); const t0 = Date.now();
  while (Date.now() - t0 < secondes * 1000) { const t = await c.p.evaluate(() => { const b = document.getElementById('gd-bulle'); return b ? b.innerText.replace(/\s+/g, ' ') : ''; }); if (t) dit.add(t); await c.p.waitForTimeout(1500); }
  return [...dit]; }
(async () => {
  // la visite parlée, ouverte comme l'utilisateur le fait : par la palette « Découvrir l'application » (ici, l'appel qu'elle fait)
  { const c = await L.ouvrir({ profil:'mac', qui:'marc' }); await c.p.evaluate(() => immLancer(0)); await L.calme(c.p, 800);
    const actif = await c.p.evaluate(() => GD.actif); v('visite parlée : elle démarre', actif);
    const dit = await ecouter(c, 'imm', 45);
    v('visite parlée : elle parle (au moins deux bulles différentes en 45 s)', dit.length >= 2, dit.length);
    const eu = VIEUX.filter(([re]) => dit.some(t => re.test(t))).map(x => x[1]); v('visite parlée : aucun ancien nom dans ce qu\'elle dit', eu.length === 0, eu);
    v('visite parlée : aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 2)); await L.fin(c); }
  // « De A à Z » du prototype nu : le panneau des étapes, puis la première étape (elle change de rôle et ouvre l'écran)
  { const c = await L.ouvrir({ profil:'mac', app:false, qui:null }); await L.toucher(c, '[data-rl="parcours"]'); await L.calme(c.p, 500);
    const liste = await c.p.evaluate(() => (document.querySelector('#calque .panneau') || {}).innerText || ''); v('De A à Z : le panneau des étapes s\'ouvre', /Une même histoire/.test(liste) && /Y aller/.test(liste), liste.slice(0, 60));
    const eu = VIEUX.filter(([re]) => re.test(liste)).map(x => x[1]); v('De A à Z : aucun ancien nom dans les étapes', eu.length === 0, eu);
    await L.toucher(c, '#calque [data-rl="etape|0"]'); await L.calme(c.p, 700);
    const e = await c.p.evaluate(() => ({ role:ROLE, toast:((document.getElementById('toast') || {}).innerText || '').slice(0, 90), menu:[...document.querySelectorAll('#menu a .m-n')].map(x => x.textContent).join('|') }));
    v('De A à Z : la première étape change de rôle, annonce l\'étape et le menu suit le rôle', /Étape 1/.test(e.toast) && e.role !== 'patron' && e.menu.length > 5, e);
    v('De A à Z : aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 2)); await L.fin(c); }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})();
