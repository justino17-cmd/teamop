// Outils communs des sondes « menu » (16 novembre 2026) : ce que chaque rôle doit trouver, et comment le lire dans la page.
// ⛔ 127.0.0.1 seulement (lib.js sert le dépôt), entreprise fictive. Une sonde compte sa population avant de conclure.
const L = require('../lib.js');
exports.L = L;
exports.G3D = 'Hygiène anti-nuisibles (3D)';
// [groupe, [lignes]] — '' = le bloc du haut, sans titre. L'ordre est celui de MENU-FINAL.md.
exports.ATTENDU = {
  marc:[['', ['Accueil', 'Statistiques', 'Historique']], ['Travail', ['Planning', 'Interventions', 'Tâches', 'Absences et congés']], ['Clients et ventes', ['Clients', 'Devis', 'Contrats', 'Boîte mail']],
    ['Argent', ['Comptabilité', 'Achats et frais']], ['Matériel', ['Stock', 'Fournisseurs, matériel & produits', 'Dépôts et camions']], ['Personnel', ['Équipe', 'Temps de travail', 'Véhicules', 'Mon entreprise']]],
  julie:[['Travail', ['Mes tâches', 'Interventions']], ['Clients et ventes', ['Clients', 'Devis', 'Contrats']], ['Argent', ['Comptabilité', 'Achats et frais']]],
  sm:[['', ['Ma journée', 'Mes tâches', 'Mes frais', 'Mes heures', 'Mon camion', 'Mes congés']]],
  client:[['', ['Accueil', 'Mes factures', 'Mes interventions', 'Mes devis', 'Mon contrat']]]
};
// la route de chaque ligne (les routes ne changent pas), par rôle
exports.ROUTES = {
  marc:{ 'Accueil':'accueil', 'Statistiques':'statistiques', 'Historique':'historique', 'Planning':'planning', 'Interventions':'interventions', 'Tâches':'taches', 'Absences et congés':'absences', 'Clients':'clients', 'Devis':'devis', 'Contrats':'contrats', 'Boîte mail':'boiteMail',
    'Comptabilité':'comptabilite', 'Achats et frais':'achats', 'Stock':'stock', 'Fournisseurs, matériel & produits':'produits', 'Dépôts et camions':'boxes', 'Équipe':'equipe', 'Temps de travail':'pointage', 'Véhicules':'vehicules', 'Mon entreprise':'entreprise', 'Registre sanitaire':'registre', 'Carte des box':'carteBox', 'Devis xylophage':'devisXylo' },
  julie:{ 'Mes tâches':'taches', 'Interventions':'interventions', 'Clients':'clients', 'Devis':'devis', 'Contrats':'contrats', 'Comptabilité':'comptabilite', 'Achats et frais':'achats' },
  sm:{ 'Ma journée':'majournee', 'Mes tâches':'taches', 'Mes frais':'techfrais', 'Mes heures':'mesheures', 'Mon camion':'moncamion', 'Mes congés':'absences', 'Registre sanitaire':'registre' }
};
// lit le menu de l'ordinateur tel que la page le DESSINE : groupes, lignes, ligne surlignée, petit gris
exports.lireMenu = p => p.evaluate(() => { const R = document.querySelector('#menu .m-liste'); if (!R) return null; const G = []; let g = null;
  for (const e of R.children) { if (e.classList.contains('grp')) { g = { t:e.textContent.trim(), L:[] }; G.push(g); continue; }
    if (!g) { g = { t:'', L:[] }; G.push(g); }
    const n = e.querySelector('.m-n'); g.L.push({ l:n ? n.textContent.trim() : e.textContent.trim(), href:e.getAttribute('href') || e.getAttribute('data-ec') || '', on:e.classList.contains('on'), sous:(e.querySelector('.m-sous') || {}).textContent || '', cur:e.getAttribute('aria-current') || '', badge:(e.querySelector('.nb') || {}).textContent || '' }); }
  const logo = document.querySelector('#menu .logo'), pied = [...document.querySelectorAll('#menu .pied > *')].map(e => e.className.split(' ')[0] + ':' + e.textContent.replace(/\s+/g, ' ').trim().slice(0, 40));
  return { G, pied, logo:logo ? logo.getAttribute('href') : null, nbEnfants:document.querySelectorAll('#menu > *').length }; });
// la forme « groupes » attendue → mise à plat pour comparer
exports.aplatir = G => G.map(g => g.t + '=' + g.L.map(l => l.l).join('|')).join(' ‖ ');
exports.aplatirAttendu = A => A.map(([g, L]) => g + '=' + L.join('|')).join(' ‖ ');
// le texte AFFICHÉ (pas le code source de la page) : innerText des zones visibles
exports.texteVisible = (p, zones) => p.evaluate(z => z.map(s => { const e = document.querySelector(s); return e ? e.innerText : ''; }).join('\n'), zones || ['#menu', '#contenu', '#barre-bas', '#calque']);
