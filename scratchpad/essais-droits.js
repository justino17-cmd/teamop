/* Les essais de la matrice des droits (sonde-matrice-droits.js). Chacun : le compte `uT` a TOUT sauf
   `retire`. `base` remet la base dans l'état de départ (appelé avant CHAQUE passage), `prep` prépare
   l'écran s'il le faut, `geste` est ce que le bouton appelle, `mesure` l'expression lue avant et après.
   `dit:true` exige qu'un message de refus soit affiché. */
module.exports = [
  { nom: 'Stock → Ajouter : « ＋ Liste » ne crée aucune fiche', retire: { cat_stock_ajouter: false }, dit: true,
    base: `function(){ db.produits=(db.produits||[]).filter(p=>!/^Essai sonde/.test(p.nom||'')); }`,
    geste: `_plLignes=[{nom:'Essai sonde savon'}]; plValider();`,
    mesure: `db.produits.filter(p=>/^Essai sonde/.test(p.nom||'')).length` },
  { nom: 'Gérer les groupes : « Nouveau groupe » n’enregistre rien', retire: { gererGroupes: false }, dit: true,
    base: `function(){ db.groupes=(db.groupes||[]).filter(g=>g.nom!=='Essai sonde'); }`,
    geste: `const f=document.createElement('form'); f.innerHTML='<input name="nom" value="Essai sonde">'; saveGroupe({preventDefault(){},target:f},'');`,
    mesure: `(db.groupes||[]).filter(g=>g.nom==='Essai sonde').length` },
];
