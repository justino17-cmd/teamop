// Scénarios dirigés de la sonde « injection par les gestes » : là où la saisie générique ne passe pas (formulaires à étapes, champs
// validés, écrans pleine page), on décrit les gestes d'une vraie personne. Une étape = [genre, sélecteur, étiquette|valeur] :
//   aller (écran) · clic (sélecteur) · texte / courriel (sélecteur, étiquette : charge numérotée) · valeur (sélecteur, valeur fixe)
//   choix (sélecteur de liste, valeur) · attendre (ms). Un sélecteur peut viser le panneau ou la page ; la première cible visible gagne.
module.exports = {
  // client neuf + première intervention : nom, contact, courriel, adresse, titre, motif
  creation: [['aller', 'clients'], ['clic', '[data-action="clientNouveau"]'], ['clic', '[data-action="clientNvInt"]'],
    ['texte', '[data-cnv="nom"]', 'nom du client'], ['texte', '[data-cnv="contact"]', 'contact du client'], ['courriel', '[data-cnv="mail"]', 'courriel du client'], ['texte', '[data-cnv="adr"]', 'adresse du client'],
    ['texte', '[data-cchamp="titre"]', 'titre de l’intervention'], ['texte', '[data-cchamp="motif"]', 'ce que le client a dit'], ['clic', '[data-action="cPlusTard"]'], ['attendre', 400], ['clic', '[data-action="cCreer"]'], ['attendre', 700]],
  // « Ta plateforme agréée » (Comptabilité › Conformité › Aux normes) : le nom saisi revient dans le message de confirmation (un toast, écrit en innerHTML)
  plateforme: [['aller', 'factures'], ['clic', '[data-cx="grp|conformite"]'], ['clic', '[data-cx="sec|normes"]'], ['clic', '[data-cx="plateforme"]'],
    ['texte', '#pa-n', 'nom de la plateforme agréée'], ['clic', '[data-cx="plateformeok"]'], ['attendre', 500]],
  // le délai d'un fournisseur (texte libre de sa fiche) : il revient dans le détail d'une tâche « pièces à commander »
  fournisseur: [['aller', 'produits'], ['clic', '[data-pr="vue|fournisseurs"]'], ['attendre', 300], ['clic', '[data-fo="liste"]'], ['clic', '[data-fo^="fiche|"]'],
    ['texte', '[data-fochamp$="|delai"]', 'délai du fournisseur'], ['texte', '[data-fochamp$="|contact"]', 'contact du fournisseur'], ['attendre', 300]],
};
