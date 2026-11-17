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
  fournisseur: [['aller', 'produits'], ['clic', '[data-pr="vue|fournisseurs"]'], ['attendre', 300], ['clic', '[data-fo="fiche|cpa"]'],
    ['texte', '[data-fochamp$="|delai"]', 'délai du fournisseur'], ['texte', '[data-fochamp$="|tel"]', 'téléphone du fournisseur'], ['attendre', 300], ['aller', 'taches'], ['clic', '[data-tmodif="t2"]'], ['attendre', 500], ['lire', 'détail de la tâche t2']],
  // « Mon entreprise » : la garde d'entrée refuse < > \" ; on essaie ce qu'elle laisse passer (apostrophe, esperluette, entités écrites en toutes lettres) :
  // une entité (&lt;) devient un vrai < quand un attribut est relu par le JavaScript (dataset) puis réécrit dans du HTML
  entreprise: [['aller', 'entreprise'], ['clic', '[data-ent="carte|ident"]'],
    ['valeur', '#en-nom', "Dupont's &lt;img src=x onerror=__xss('nE1')&gt; &amp; Fils"], ['valeur', '#en-patron', "D'Artagnan &lt;img src=x onerror=__xss('nE2')&gt;"],
    ['valeur', '#en-rue', "4 rue de l'Ancre &lt;img src=x onerror=__xss('nE3')&gt;"], ['valeur', '#en-cp', '17000'], ['valeur', '#en-ville', "La Rochelle &lt;img src=x onerror=__xss('nE4')&gt;"], ['valeur', '#en-site', "exemple.fr/&lt;img/src=x/onerror=__xss('nE5')&gt;"],
    ['clic', '[data-ent="identok"]'], ['attendre', 700]],
};
