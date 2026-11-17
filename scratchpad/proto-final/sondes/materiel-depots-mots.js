// Matériel, étape 3 (Dépôts et camions) — LES MOTS : le textContent (jamais le innerHTML, qui porte le script) de la page, de chaque fiche, de chaque feuille, des menus et des messages
// ne contient AUCUN mot du lexique banni (dotation, réassort, transfert, inventaire, mouvement, seuil…), aucun émoji, aucun préfixe BC-/BR- ; chaque bouton à icône seule porte son nom.
// Usage : node materiel-depots-mots.js → « N ✓ · M ✗ »
const L = require('../lib.js');
const BANNIS = [[/dotation/i, 'dotation'], [/r[ée]assort/i, 'réassort'], [/\btransf[ée]r/i, 'transfert'], [/\binventaire/i, 'inventaire'], [/mouvement/i, 'mouvement'], [/\bseuil\b/i, 'seuil'], [/\bfranco\b/i, 'franco'], [/reliquat/i, 'reliquat'],
  [/rapproch/i, 'rapprocher'], [/\b(Entrée|Sortie)\b/, 'entrée/sortie'], [/Compléter|À remettre|à remettre à bord/, 'compléter / à remettre'], [/Épuisé|Sur commande/, 'état ancien'], [/\bBoxes?\b/, 'boxes'], [/\bBC-\d|\bBR-\d/, 'préfixe de numéro'], [/\bIA\b/, 'IA'], [/Fournisseur local|\bCSV\b|FAB-DIS/, 'sigle'], [/Stock embarqué|Stock principal/, 'ancien titre de fiche']];
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{2714}\u{2716}-\u{27BF}\u{1F000}-\u{1F2FF}]/u;   // « ✕ » (U+2715) est le glyphe de la croix de fermeture, pas un émoji
(async () => {
  const v = L.v, c = await L.ouvrir({ profil:'mac', qui:'marc' }), p = c.p, R = (f, a) => p.evaluate(f, a), vus = [];
  const lire = async nom => { await L.calme(p, 300); const t = await R(() => { const z = document.querySelector('#calque .panneau') || document.getElementById('contenu'); const m = document.querySelector('.ctx'); const to = document.getElementById('toast'); return [z.innerText, m ? m.innerText : '', to && to.classList.contains('on') ? to.innerText : ''].join('\n'); }); vus.push({ nom, t });
    const gestes = await L.gestes(p, '#calque .panneau').catch(() => []); return { t, sansNom:(gestes || []).filter(g => g.sansNom).map(g => g.data) }; };
  await L.aller(p, 'boxes'); await lire('page');
  const ecrans = [['bandeau « Avant les visites »', () => mdAvant()], ['Remplir les camions', () => bxReassort()], ['Remplir un camion', () => bxReassort('v1')], ['Remplir un camion au garage', () => bxReassort('v4')], ['Remplir une réserve', () => bxPreparerReserve('d-hp')],
    ['fiche d\'un camion', () => bxFiche('v1')], ['fiche d\'un camion au garage', () => bxFiche('v4')], ['fiche de l\'atelier', () => bxFiche('atelier')], ['fiche d\'une réserve', () => bxFiche('d-hp')],
    ['ce qu\'il doit y avoir à bord', () => mdDotation('v1')], ['ce qu\'il doit y avoir sur place', () => mdDotation('d-hp')], ['changer le nom ou le conducteur', () => bxModifier('v1')], ['changer le nom ou le responsable', () => bxModifier('d-hp')],
    ['fermer une réserve', () => bxFermer('d-hp')], ['nouvelle réserve', () => bxNouveau('')], ['compter', () => matCompter('v1')], ['compter, choix du lieu', () => matCompter()]];
  const sansNom = [];
  for (const [nom, f] of ecrans) { await R(() => { try { fermerPanneau(); fermerMenu(); } catch (e) {} }); await R(f); const r = await lire(nom); if (r.sansNom.length) sansNom.push(nom + ' : ' + r.sansNom.join(' ; ')); }
  await R(() => { LIEUX.find(l => l.id === 'd-hp').ferme = AUJ; rendre(); mdFermes(); }); await lire('réserves fermées'); await R(() => { delete LIEUX.find(l => l.id === 'd-hp').ferme; rendre(); });
  for (const [nom, sel] of [['menu Plus de la page', '[data-md="plus"]']]) { await R(() => fermerPanneau()); await R(s => document.querySelector(s).click(), sel); await lire(nom); await R(() => fermerMenu()); }
  await R(() => bxFiche('v1')); await R(() => document.querySelector('#calque [data-md^="fplus|"]').click()); await lire('menu Plus d\'un camion'); await R(() => fermerMenu());
  await R(() => bxFiche('d-hp')); await R(() => document.querySelector('#calque [data-md^="fplus|"]').click()); await lire('menu Plus d\'une réserve'); await R(() => fermerMenu()); await R(() => fermerPanneau());
  // les messages : un remplissage, une fermeture, une réouverture, un ajout aux commandes, une liste à bord
  await R(() => { bxReassort(); document.getElementById('md-rok').click(); }); await lire('message : remplir');
  await R(() => { mdCmdAdd('p5', 1); }); await lire('message : ajouter aux commandes');
  await R(() => { bxFermerOk('d-hp'); }); await lire('message : fermer'); await R(() => { mdRouvrir('d-hp'); }); await lire('message : rouvrir');
  await R(() => { mdDotation('v1'); document.querySelector('#calque [data-md="dok"]').click(); }); await lire('message : liste à bord');
  v('population : ' + vus.length + ' écrans, feuilles, menus et messages lus, ' + Math.round(vus.reduce((s, x) => s + x.t.length, 0) / 1000) + ' k signes', vus.length >= 26 && vus.every(x => x.t.trim().length > 20), vus.filter(x => x.t.trim().length <= 20).map(x => x.nom));
  for (const [re, nom] of BANNIS) { const eu = vus.filter(x => re.test(x.t)).map(x => x.nom); v('aucun « ' + nom + ' » à l\'écran', eu.length === 0, eu); }
  const em = vus.filter(x => EMOJI.test(x.t)).map(x => x.nom + ' : ' + (x.t.match(EMOJI) || [''])[0]);
  v('aucun émoji dans ces écrans (les icônes sont filaires)', em.length === 0, em);
  v('chaque bouton à icône seule porte un nom (aria-label ou texte)', sansNom.length === 0, sansNom);
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le parcours a pu se jouer jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 90) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });   // un parcours qui plante est un parcours qui échoue : la mutation ne doit pas rester « vivante » sur un code de sortie 2
