#!/usr/bin/env python3
# DÉCISIONS DES MOTS (voie « final-mots », 17 novembre 2026) : la table des synonymes (UN mot par chose) et les LAISSES (un texte qu'on garde malgré une règle, et pourquoi).
# Un jugement, pas une mesure : écrit à la main, relu par mots-interdits.js (les laisses lèvent une règle sur un texte exact). Rejouable : réécrit les champs « synonymes » et « laisses » de final/mots.json.
import json, os
CH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mots.json')
SYN = [
  { 'chose': 'la personne qui dirige l’entreprise', 'motsTrouves': ['patron', 'gérant', 'administrateur'], 'motGarde': 'gérant',
    'note': 'le menu et la fiche Équipe disent « Gérant » ; « patron » est retiré partout. « Administrateur » reste, mais pour une AUTRE chose : le compte qui règle les accès (sécurité, connexion, droits), qui peut être quelqu’un d’autre que le gérant.' },
  { 'chose': 'un message électronique', 'motsTrouves': ['courriel', 'e-mail', 'mail', 'email'], 'motGarde': 'e-mail',
    'note': 'le nom du menu « Boîte mail » est gardé (décidé) ; partout ailleurs « e-mail » (Voir l’e-mail, Confier cet e-mail, E-mails · 3).' },
  { 'chose': 'faire disparaître une donnée', 'motsTrouves': ['supprimer', 'effacer', 'retirer'], 'motGarde': 'supprimer',
    'note': '« retirer » reste pour sortir une ligne d’une liste ou d’une commande sans détruire ; « effacer une signature » reste (on gomme un dessin).' },
  { 'chose': 'le devis court', 'motsTrouves': ['Devis rapide', 'devis simple'], 'motGarde': 'Devis rapide', 'note': 'c’est le nom du bouton ; « simple » n’y est qu’un adjectif.' },
  { 'chose': 'le travail planifié chez un client', 'motsTrouves': ['intervention', 'passage', 'visite', 'rendez-vous'], 'motGarde': 'intervention',
    'note': 'quatre mots, quatre sens gardés : INTERVENTION = le travail (menu, fiche) ; PASSAGE = la venue du technicien (« 2ᵉ passage », « Un autre passage est nécessaire ») ; VISITE = une visite d’un contrat d’entretien (« visite 2 sur 4 ») ; RENDEZ-VOUS = ce que le client demande en ligne. Aucun « RDV » à l’écran.' },
  { 'chose': 'une période en jours', 'motsTrouves': ['j', 'jour', 'jours'], 'motGarde': 'jours (en toutes lettres dans une phrase)', 'note': '« j » reste dans une tuile ou une colonne de tableau (« 20 j », « 10 j restants ») ; dans une phrase : « 2 jours de retard », « dans 61 jours ».' },
  { 'chose': 'sauvegarder une saisie', 'motsTrouves': ['enregistrer', 'sauvegarder'], 'motGarde': 'enregistrer', 'note': '« sauvegarder » n’est écrit nulle part.' },
  { 'chose': 'toucher un bouton', 'motsTrouves': ['toucher', 'cliquer', 'appuyer', 'taper'], 'motGarde': 'toucher', 'note': '« touche » partout ; « clic droit » et « double-clic » ne se lisent que dans les aides du planning (souris).' },
  { 'chose': 'écrire un exemple dans un champ', 'motsTrouves': ['Ex. :', 'Ex.', 'ex.', 'Par exemple :'], 'motGarde': 'ex.', 'note': 'minuscule, sans deux-points : « ex. entretien climatisation ».' },
]
LAISSES = [
  { 'ecran': 'Produits › Photographier une facture', 'texte': 'Essayer avec une facture d’exemple', 'pourquoi': 'une action de démonstration nécessaire : sans appareil photo, c’est le seul moyen d’éprouver le geste ; le libellé dit honnêtement ce que c’est.' },
  { 'ecran': 'Connexion (double authentification)', 'texte': 'Démonstration', 'regle': 'echafaudage', 'pourquoi': 'le bloc « Démonstration » de l’écran de connexion donne les comptes de l’essai : sans serveur, personne ne pourrait se connecter. Écrit par la voie « double authentification », qui le juge nécessaire.' },
  { 'ecran': 'Connexion (double authentification)', 'texte': 'Recommencer la démonstration', 'regle': 'echafaudage', 'pourquoi': 'idem' },
  { 'ecran': 'Temps de travail › Paie', 'texte': 'Recevoir un fichier du cabinet pour essayer', 'pourquoi': 'une action de l’essai : le cabinet de paie n’existe pas ici, ce bouton joue sa réponse.' },
  { 'ecran': 'Équipe › droits d’une personne', 'texte': 'Modif.', 'pourquoi': 'en-têtes de colonnes de 52 px (Voir, Créer, Modif., Suppr.) : le mot entier ne tient pas ; la phrase juste dessous les écrit en entier (« Modifier », « Supprimer »).' },
  { 'ecran': 'Bons de commande, comptabilité', 'texte': 'Qté', 'pourquoi': '« Qté », « Réf. », « N° », « HT », « TTC » sont les mots du métier (bons de commande, factures, devis).' },
  { 'ecran': 'Stock, Produits, Matériel', 'texte': '1 u', 'pourquoi': 'DOUTE À SOUMETTRE À JUSTIN : « u » (unité) pour un article sans unité propre (« 40 u », « en tout 40 u »). Un débutant lit « u » comme une lettre. Remplacer par « pièce(s) » touche le stock, les commandes et dix sondes : à faire en un lot, sur sa phrase.' },
  { 'ecran': 'Comptabilité (cadre)', 'texte': 'Archives & exports', 'pourquoi': 'les noms des espaces de la Comptabilité (« Fiscal & comptable », « Caisse & chèques ») ont été validés par Justin (« Comptabilité, ça c’est bon »).' },
  { 'ecran': 'Boîte mail › aperçus de message', 'texte': 'Objet :', 'regle': 'espace-ordinaire-avant-ponctuation', 'pourquoi': 'un message écrit dans un bloc de texte brut (« pre ») : la typographie de l’écran ne le traverse pas, c’est le texte tel qu’il part.' },
  { 'ecran': 'Messages écrits pour un fournisseur, un client ou un confrère', 'texte': 'Veuillez trouver ci-joint notre bon de commande', 'pourquoi': 'ces messages parlent à leur DESTINATAIRE : ils le vouvoient, comme le client dans son espace ; seul l’écran de l’utilisateur se tutoie.' },
  { 'ecran': 'Espace client', 'texte': 'Prochaine visite', 'pourquoi': 'DOUTE À SOUMETTRE À JUSTIN : dans l’espace client, la carte dit « Prochaine visite » et l’onglet « Interventions ». Un client dit « visite » ; l’entreprise dit « intervention ». Un seul mot serait plus clair ; lequel ?' },
  { 'ecran': 'Tâches › carte', 'texte': 'Prévenir M. Durand 30 min avant la mise en service de sa pompe à chaleur', 'regle': 'phrase-longue', 'pourquoi': 'faux positif du relevé : le texte d’une carte colle le titre de la tâche, la personne et l’échéance sans ponctuation ; le titre seul fait 15 mots.' },
  { 'ecran': 'Frais › justificatif de carburant', 'texte': 'merci de votre visite', 'regle': 'vouvoiement-equipe', 'pourquoi': 'c’est le texte imprimé sur le ticket de la station, lu et recopié tel quel : ce n’est pas OP GESTION qui parle.' },
  { 'ecran': 'Temps de travail, Équipe, Paie', 'texte': '41h50', 'regle': 'doute-h', 'pourquoi': 'DOUTE À SOUMETTRE À JUSTIN : les totaux d’heures s’écrivent « 41h50 » (compact, pour les tuiles et les colonnes), alors que les heures de la journée s’écrivent « 13 h 05 » et les durées « 1 h 30 ». Un seul usage serait plus net, mais les 51 emplois de ptH tiennent dans des tuiles étroites : à décider avec lui avant de toucher la mise en page.' },
  { 'ecran': 'Comptabilité (cadre) › en-tête du pilotage', 'texte': 'La démo', 'regle': 'echafaudage', 'pourquoi': 'DOUTE À SOUMETTRE À JUSTIN : « La démo » et « Tests guidés » sont deux boutons de la Comptabilité (une visite parlée et des essais guidés), pas un reste d’échafaudage : on les garde tant qu’il ne dit pas de les retirer du mode application.' },
]
d = json.load(open(CH)) if os.path.exists(CH) else {}
d['synonymes'] = SYN; d['laisses'] = LAISSES
json.dump(d, open(CH, 'w'), ensure_ascii=False, indent=1); print('synonymes :', len(SYN), '· laisses :', len(LAISSES))
