# Le guide des nouveautés — version finale (17 novembre 2026)

Demande de Justin : « vu que c'est une grosse mise à jour, une grosse refonte totale de l'application, quand les personnes vont arriver, un petit guide pour leur
expliquer les nouvelles fonctionnalités ». Lecteurs : des artisans et leurs équipes, peu à l'aise avec l'informatique, qui connaissaient l'ancienne application et
retrouvent tout déplacé. Le guide d'avant (quatre pages de texte, la liste de tout ce qui change) est remplacé : il datait d'AVANT les refontes.

Ce fichier est la SOURCE des textes : `guide-mots.js` exige que chaque titre et chaque phrase de la page se retrouvent ici mot pour mot.

## Les règles

1. **Six cartes au plus par rôle**, dans l'ordre de ce qui change le plus sa journée. Le gérant, le bureau et le terrain ont un guide ; **le client n'en a pas**
   (son espace n'a pas bougé) et le comptable non plus.
2. Une carte = **un titre de 2 à 5 mots**, **une phrase de 20 mots au plus** (compte sévère : « l'ordre », « d'un » comptent pour deux mots), avec les mots de tous les jours,
   et un bouton **« Voir »** qui ferme le guide et ouvre l'écran dont elle parle. Jamais le nom d'une fonction ni un mot technique (onglet, module, synchro, PDF, DSN…).
3. **La première carte est « Où sont passées mes rubriques ? »** : trois lignes « ancien nom → nouveau nom », seulement pour ce que ce rôle voyait avant. Au téléphone
   la première ligne est « Le bouton « Plus » → Menu, en haut à gauche » (le bouton Plus n'existe plus). « Voir » y ouvre la feuille « Menu » au téléphone, et met la colonne
   de gauche en lumière à l'ordinateur.
4. **Rien qui promette ce que le prototype ne fait pas** : chaque phrase est vérifiée sur l'écran qu'elle décrit (`guide-mots.js` ouvre l'écran et y cherche ce qu'elle promet).
   Une carte dont l'écran est fermé à la personne (case « Voir » décochée dans Équipe, ou « Créer » pour un geste de création) n'est pas écrite pour elle.
5. **Le titre d'une carte porte le mot de l'écran où « Voir » mène** (« Comptabilité : tout au même endroit » → la Comptabilité). `guide-voir.js` le lit sur l'écran d'arrivée.

## Les cartes

### Le gérant (Marc)

| # | Titre | Phrase | « Voir » mène à |
|---|---|---|---|
| 1 | Où sont passées mes rubriques ? | Tableau de bord → Accueil · Factures et paiements → Comptabilité · Boxes → Dépôts et camions | le menu |
| 2 | Comptabilité : tout au même endroit | Factures, paiements, achats, paie et TVA se suivent au même endroit, rangés comme chez ton comptable. | Comptabilité |
| 3 | Stock : où est chaque article | Tape le nom d’un article : tu vois où il est et combien il en reste. | Stock |
| 4 | Tâches : elles arrivent seules | Un devis à relancer, une facture en retard : OP GESTION te propose la tâche, qui se termine seule. | Tâches |
| 5 | Équipe : qui peut faire quoi | Pour chaque personne, tu choisis ce qu’elle voit et peut faire. Son menu s’adapte tout seul. | Équipe |
| 6 | Mon entreprise : réglée une fois | Tes mentions légales, ton logo, ta banque et tes horaires s’écrivent ici une fois, puis servent partout. | Mon entreprise |

### Le bureau (Julie, secrétariat ; le responsable a les mêmes cartes selon ses cases)

| # | Titre | Phrase | « Voir » mène à |
|---|---|---|---|
| 1 | Où sont passées mes rubriques ? | Factures et paiements → Comptabilité · Produits, fournisseurs, bons de commande → Fournisseurs, matériel & produits · Mes demandes → Achats et frais | le menu |
| 2 | Comptabilité : tout au même endroit | Factures, paiements, achats et TVA se suivent au même endroit, rangés comme chez ton comptable. | Comptabilité |
| 3 | Devis : composer en grand | « Composer un devis » ouvre une grande page claire : tu remplis, tu vérifies le prix, tu envoies. | Devis (si la case « Créer » des ventes est cochée) |
| 4 | Achats et frais : les demandes | Les demandes de matériel et les notes de frais de l’équipe sont réunies ici. | Achats et frais |
| 5 | Fournisseurs, matériel & produits | Les commandes, les articles et les fournisseurs sont réunis ici, en trois parties. | Fournisseurs, matériel & produits |
| 6 | Mes tâches : elles arrivent seules | Un devis à relancer, une facture en retard : OP GESTION te propose la tâche, qui se termine seule. | Mes tâches |

### Le technicien (Sophie ; le chef d'équipe a les mêmes cartes selon ses cases)

| # | Titre | Phrase | « Voir » mène à |
|---|---|---|---|
| 1 | Où sont passées mes rubriques ? | Mes notes de frais → Mes frais · Pointage → Mes heures · Boxes → Mon camion (au téléphone : « Plus » → Menu, en haut à gauche, en première ligne) | le menu |
| 2 | Ma journée, dans l’ordre | Tes interventions arrivent dans l’ordre : tu y vas, tu appelles, tu remplis le compte rendu, le client signe. | Ma journée |
| 3 | Mon camion : ce qui manque | Cherche une pièce, vois ce qui manque à bord, et préviens le bureau en un geste. | Mon camion |
| 4 | Mes heures : un seul bouton | Tu relis tes journées et tu confirmes tes heures d’un seul bouton, en fin de mois. | Mes heures |
| 5 | Mes frais : ticket en photo | Photographie ton ticket, ou écris la demande d’achat : le bureau te répond directement dans cet écran. | Mes frais |
| 6 | Mes congés, sur ton téléphone | Tu vois tes jours restants, tu fais ta demande de congé, et la réponse arrive au même endroit. | Mes congés |

## Ce qui n'a PAS de carte, et pourquoi (six au plus)

- **Gérant** : Véhicules et Temps de travail (refaits), Planning et sa carte, Boîte mail, Absences, Statistiques n'ont pas de carte. Les trois premières lignes du menu et les cartes
  ci-dessus couvrent ce qui change le plus la journée ; les autres rubriques se retrouvent dans le menu et par la recherche (qui connaît les ANCIENS noms : « tableau de bord »,
  « boxes », « pointage », « notes de frais »). **Carte prête à échanger** si Justin préfère « Véhicules : une ligne chacun » à « Tâches » ou à « Mon entreprise ».
- **Sécurité** (la double authentification « OP Security ») : pas de carte tant que Justin ne l'a pas confirmée.
- **Bureau** : Stock et Véhicules, qu'il a pourtant, n'ont pas de carte ; Contrats non plus (le Devis couvre « composer en grand »).
- **Technicien** : Mes tâches n'a pas de carte (elle est dans le menu et la barre).

## Comment il s'ouvre, se ferme, se retient

- **Une seule ouverture par compte**, à la première connexion (la marque « vu » est posée à l'OUVERTURE, sous l'identifiant du compte : un rechargement ou une reconnexion ne le rouvre pas).
  Si le rangement de l'appareil est refusé (navigation privée, cadre), la page se souvient en mémoire le temps de la page.
- **Jamais par-dessus une fenêtre ouverte** (fiche, création, recherche, document, atelier, carte en grand — le registre `calOuverts()` dit lesquelles), **ni pendant la visite parlée**, ni sur l'écran
  de connexion. Si une fenêtre est ouverte à ce moment-là, il retente six fois (toutes les 1,5 s) puis laisse : il reste dans « Nouveautés ».
- **Se ferme** par la croix, Échap, un toucher en dehors de la feuille et « Plus tard ». **Se rouvre** par « Nouveautés » au pied du menu (ordinateur) et dans la feuille « Menu » (téléphone),
  et par la recherche (« Nouveautés de cette version »).
- **Téléphone** : une carte par écran, qu'on fait glisser (défilement natif avec accroche : le navigateur gère le doigt), des points de progression, « Plus tard » et « Suivant » (ou « C'est tout » à la dernière
  carte) sur toute la largeur, « Précédent » dès la deuxième, « Voir » en pleine largeur, tout à 44 px au moins. **Ordinateur** : une fenêtre de 540 px, mêmes cartes, flèches ← → du clavier.
- Jour et nuit. Mouvement réduit respecté (pas d'animation, défilement sans glissade).

## Ce qui a été corrigé en même temps

- **La recherche connaît les anciens noms** : « tableau de bord » → Accueil, « boxes » → Dépôts et camions, « notes de frais » → Mes frais, « pointage » → Mes heures, « camion » → Mon camion.
- **La visite parlée et les aides de page** : relues pour les anciens noms et les écrans disparus (Tableau de bord, Boxes de stock, Messagerie, Utilisateurs, Permissions, Paramètres, Produits donnés,
  Consommation produits, Mouvements, bouton Plus…) — aucun reste (« box » ne subsiste que dans le métier de l'hygiène : la carte des box d'appâtage). Voir la liste dans le rapport de l'étape.
- Le point « nouveau » de la ligne Nouveautés disparaît dès l'ouverture ; la ligne n'existe plus pour le client ni le comptable.

## Les sondes

`scratchpad/proto-final/sondes/guide-voir.js` (chaque « Voir »), `guide-mots.js` (mots, promesses, ancien → nouveau, la recherche), `guide-fermer.js` (fermetures, une seule ouverture, jamais par-dessus,
mémoire de page, pas de guide pour le client), `guide-mise-en-page.js` (aucun débordement à 320, 360, 390 px et ailleurs, 44 px, contraste, balayage au doigt), `guide-premiere-connexion.js`
(la vraie connexion avec double authentification), `guide-tout.sh` (toutes, en série), `guide-mutations.js` (18 défauts remis sur des copies).
