# Retours de Justin sur la version d'étape du 16 novembre 2026 (soir) — mot pour mot, et ce qu'on en fait

Il a regardé la version d'étape publiée (Version 62 de l'artefact du prototype) et a dit :

> « Bon, composer un devis, c'est trop petit. Donc ça, c'est à revoir. Franchement, heureusement, je te dis de tout vérifier,
> tout tester. Je vois que tu fais la moitié des choses comme d'habitude. Ça serait bien que tu fasses ce que je te demande.
> La boîte mail, pareil. Je t'ai dit que je voulais celle qu'on avait déjà, nous, créée actuelle. Juste améliorer et corriger
> les bugs qu'elle avait. C'est toujours pas fait. Comptabilité, ça c'est bon. […] Achat et frais. Ça, je sais pas ce que
> c'est. Donc, j'aimerais bien que tu m'expliques. Stock. Je veux tout refaire parce que c'est moche et c'est mal fait.
> Fournisseur matériel. Pareil, je veux que tu refasses tout. Plus compréhensif, plus simple et mieux fait. Dépôt et camion.
> Pareil, à refaire. C'est mal fait. J'aime pas. Équipe. C'est bien. Temps de travail. C'est pas mal. Mais mieux amélioré,
> plus simple, ce serait cool. Et véhicule à refaire. Donc tu me fais ça. Une fois que tout ça c'est fait, tu me dis.
> Et je veux que tu testes toute cette application. C'est pas compliqué ce que je demande. »

## Ce qui est validé (ne plus y toucher sans raison)
Accueil, Planning, Absences et congés, Interventions, Clients, Devis (la catégorie), Comptabilité (« ça c'est bon »), Équipe (« c'est bien »).

## Les lots qui en sortent
| Lot | Ce que Justin veut | Où est la spécification |
|---|---|---|
| Compositeur en grand | « Composer un devis, c'est trop petit » | plus bas dans ce fichier |
| Boîte mail | le module EXISTANT (OP Courrier, `opcourrier.js`), « juste améliorer et corriger les bugs » — pas l'écran écrit pour le prototype | `refonte/BOITE-MAIL.md` (étude en cours) |
| Matériel | Stock, « Fournisseurs, matériel & produits », « Dépôts et camions » : tout refaire, « plus compréhensif, plus simple et mieux fait » | `refonte/MATERIEL.md` (étude puis trois dessins puis synthèse, en cours) |
| Véhicules | à refaire | `refonte/VEHICULES-TEMPS.md` (en cours) |
| Temps de travail | « pas mal, mais mieux amélioré, plus simple » | `refonte/VEHICULES-TEMPS.md` (en cours) |
| Achats et frais | il ne sait pas ce que c'est : le lui EXPLIQUER (fait dans la conversation) ; si l'écran ne se comprend pas seul, son nom et sa première phrase sont à revoir pendant la campagne | — |
| Tout tester | « je veux que tu testes toute cette application » | `CAMPAGNE.md` |

## Compositeur en grand — spécification
Constat (capture Mac 1440 × 900) : « Composer un devis » ouvre une fenêtre de 1 100 × 800 px posée sur un voile gris, et
l'aperçu du devis y fait 340 px de large : le texte de la page est illisible. C'est une fenêtre dans une fenêtre.
- Dans OP GESTION (mode `?app=1` de l'atelier), le compositeur de devis ET celui de contrat occupent TOUT l'écran : plus de
  voile, plus de cadre flottant. En-tête : « ‹ OP GESTION » (annuler), le titre (« Nouveau devis »), le total, « Créer le devis ».
- Ordinateur : deux colonnes. À gauche (40 % de la largeur, 480 à 620 px), les étapes (client, objet, matériel, textes,
  conditions), qui défilent. À droite (le reste), la PAGE du devis en grand : largeur de page d'au moins 620 px sur un écran de
  1 440 px (texte lisible sans zoom), centrée sur un fond de bureau comme dans l'éditeur, qui défile, avec un réglage de taille
  (Ajuster · 100 %). La page se met à jour à chaque frappe, comme aujourd'hui.
- Tablette (761 à 1 100 px) : mêmes deux colonnes tant que la page garde 480 px ; sinon une colonne et un bouton « Aperçu ».
- Téléphone : plein écran (déjà le cas), étapes en une colonne, bouton « Aperçu » qui montre la page entière en grand.
- Les champs et les boutons du compositeur prennent la taille des écrans d'OP GESTION (champs de 48 px de haut, texte de
  16 à 17 px, titres d'étape de 18 px) : rien ne doit paraître « petit » à côté de la page Devis.
- La page SEULE (l'artefact « Documents sur mesure ») garde sa fenêtre actuelle, sauf si le même agrandissement y est
  manifestement meilleur — à dire dans le rapport, pas à décider en silence.
- L'éditeur qui suit (« atelier ») : vérifier que la page y est affichée « Ajuster à la largeur » par défaut dans OP GESTION,
  et que les panneaux ne la réduisent pas sous 620 px sur un écran de 1 440 px.
- Preuves : mesure de la largeur de la page d'aperçu et de la taille de police réellement rendue (px à l'écran) sur mac,
  mac720, windows, ipad, iphone, android ; captures regardées, jour et nuit.
