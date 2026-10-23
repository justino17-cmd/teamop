# Audit apple-design d'OP GESTION — 22 octobre 2026

Justin, 21 octobre 2026 : « Utilise le skill apple-design et audite toute l'interface de mon app avec. Liste chaque
problème trouvé, du plus grave au moins grave, avec le fichier et la ligne, puis corrige-les un par un. »

**Version auditée : la v770 de `main`** (bêta et production). Les numéros de ligne sont ceux de `app.html` sur `main`
(commit `47d133cc`). Les corrections vivent sur la branche `claude/audit-apple-op-gestion` ; la bêta se régénère par
`beta-build.js`. Rien n'atteint la production sans la phrase de Justin.

## Comment l'audit a été fait

- **Au navigateur** (`scratchpad/sonde-apple-audit.js`) : les 42 rubriques, sur un iPhone (Safari 26, nuit, au doigt,
  `hover:none`) et sur un Mac (Safari 26, jour, souris). 3 788 commandes vues, 894 essayées à l'appui (`:active`
  forcé), 6 363 textes, 5 682 transitions relevés. Puis les trois réglages du système un par un : contraste accru,
  transparence réduite, animations réduites.
- **À la lecture** (workflow, agents Sonnet) : six relecteurs, un par famille du skill (réponse, gestes, espace et
  matières, accessibilité, typographie, fondations). 40 constats, chacun repris par un sceptique chargé de le réfuter
  — 36 ont tenu. Puis un critique de complétude : 6 constats de plus, 5 ont tenu.
- **Gravité** : 5 = un réglage d'accessibilité ignoré, ou un geste qui trompe ; 4 = ça a l'air cassé sur un écran
  courant ; 3 = rugosité visible sur un écran courant ; 2 = finition sur un écran moins courant ; 1 = détail.

## La liste, du plus grave au moins grave

| # | Grav. | Problème | Où (`app.html`, v770) | Ce que voit l'utilisateur | État |
|---|---|---|---|---|---|
| 1 | 5 | « Augmenter le contraste » ignoré : la règle visait un attribut de MOINS que le thème, elle ne prenait jamais | 7917 (règle), 7151 et 7189 (thèmes) | vitres à 42 % de blanc, liseré blanc invisible sur fond clair | ✅ corrigé (partie A) |
| 2 | 5 | « Réduire la transparence » incomplet : surfaces listées une par une, cinq oubliées, trois voiles écrits en ligne | 7900 (liste), 7713, 3999, 7443, 7630, 25228, 31989, 32196 | le groupe de liste, le segmenté, la recherche, le bouton de repli restent flous | ✅ corrigé (partie A) |
| 3 | 5 | Sept défilements doux en JavaScript ignorent « Réduire les animations » | 19258, 19451, 20151, 25253, 36523, 37843, 44877 | la page glisse sur 3 000 px sous le réglage | ✅ corrigé (partie A) |
| 4 | 5 | La taille du texte choisie dans le téléphone n'est pas suivie : toute la typographie est en px | 3242 (et toute la feuille) | quelqu'un qui lit en gros caractères ne gagne rien | ✅ corrigé (partie Y) |
| 5 | 4 | Glisser une intervention au doigt dans le planning : la carte atterrit décalée du point de prise ; pas de repère d'heure ; prise et dépose sèches | 20603, 20611, 20591 | on dépose à l'aveugle, l'intervention change d'heure toute seule | ✅ corrigé (partie B) |
| 6 | 4 | ~450 ms de taps perdus après chaque navigation (le calque de la transition reçoit les taps) | 2209 | on touche, rien ne répond, on retape | ✅ corrigé (partie C) |
| 7 | 4 | Un simple enregistrement rejoue toute l'entrée de l'écran (fondu, cascade, compteurs à zéro) | 16736, 16466, 16550 | « ▶ Démarrer » fait clignoter toute la liste | ✅ corrigé (partie C) |
| 8 | 4 | Envois d'e-mails sans état « en cours » ni garde du second appui | 17886, 31838, 39092 | un second appui envoie le courriel deux fois | ✅ corrigé (partie D) |
| 9 | 4 | Tiroir du menu (téléphone) : voile qui surgit et s'éteint sec ; un balayage sur le voile change de rubrique au lieu de fermer | 666, 15885 | on veut fermer le menu, on change d'écran | ✅ corrigé (partie E) |
| 10 | 3 | Survol collé sur iPhone : 38 familles restent « survolées » après un toucher (« ＋ Créer », retour, onglets, cloche, menu, tuiles, lignes) | 4422, 4085, 1355, 3581, 450, 1430, 2169, 239, 244 | le bouton reste soulevé jusqu'au toucher suivant | ✅ corrigé (partie F) |
| 11 | 3 | Aucun retour à l'appui sur 36 familles (cases des plannings, barre d'outils du planning, logo et fiche du menu au Mac) ; lignes de liste en 200 ms | 1949–1964, 1777–1792, 1355, 7979, 8008, 7714 | on ne sait pas si le toucher a pris | ✅ corrigé (partie G) |
| 12 | 3 | La fenêtre secondaire (photo, détail d'un traitement) arrive animée et disparaît d'un coup | 24406 | elle clignote en sortant | ✅ corrigé (partie H) |
| 13 | 3 | Roues d'heure : ni entrée ni sortie, voile flouté à 2 px | 25228 | apparition et disparition sèches | ✅ corrigé (partie H) |
| 14 | 3 | Lecture d'un mail et catalogue des bons : posés et retirés sans mouvement | 31698 | coupure sèche | ✅ corrigé (partie H) |
| 15 | 3 | Panneau des notifications sans animation, sans point d'ancrage | 40935 | il surgit au milieu de nulle part | ✅ corrigé (partie H) |
| 16 | 3 | Planning : menu contextuel et carte de survol secs | 20759 | apparition sèche | ✅ corrigé (partie H) |
| 17 | 3 | Feuille « Créer » : une poignée qui ne glisse pas | 6614, 15644 | on tire, rien ne bouge | ✅ corrigé (partie I) |
| 18 | 3 | Le toast n'est pas annoncé aux lecteurs d'écran ; son « Annuler » n'est pas un bouton | 8057, 13911 | VoiceOver ne dit rien | ✅ corrigé (partie J) |
| 19 | 3 | `confirm()` natifs sur des gestes réversibles | 21703 (et suivants) | une boîte du navigateur pour rien | ✅ corrigé (partie K) |
| 20 | 3 | Suppression générique « Supprimer cet élément ? » sans nom ni annulation | 36321 | on ne sait pas quoi on supprime | ✅ corrigé (partie K) |
| 21 | 3 | Photos d'intervention ouvertes dans un onglet (`window.open`) alors qu'une visionneuse existe | 24886, 24921, 24982, 24987 | on sort de l'application | ✅ corrigé (parties L et W) |
| 22 | 3 | Pied de fenêtre opaque à trait dur sur téléphone, sous un en-tête en verre | 712 | deux matières dans une fenêtre | ✅ corrigé (partie M) |
| 23 | 3 | Replier le menu (bureau) : la transition de largeur ne tourne jamais | 5656 | le menu disparaît d'un coup | ✅ corrigé (partie N) |
| 24 | 3 | Changement jour/nuit sec hors du bouton de la barre | 43171 | saut de luminosité | ✅ corrigé (partie O) |
| 25 | 3 | Space Mono (police web) encore appliquée à trois endroits | 28083 | une police étrangère au thème | ✅ corrigé (partie P) |
| 26 | 3 | Vitesse de relâchement mesurée sur un seul échantillon | 15966 | un doigt qui s'arrête relance quand même | ✅ corrigé (partie I) |
| 27 | 3 | Balayage entre rubriques : butée dure au bord au lieu d'une résistance | 15918 | ça cogne au lieu de céder | ✅ corrigé (partie I) |
| 28 | 2 | Le voile de la feuille « Créer » est plus mince que celui des fenêtres | 6602 | deux voiles différents | ✅ corrigé (partie Q) |
| 29 | 2 | Totaux HT/TVA/TTC sans chiffres tabulaires : la ligne tremble à chaque frappe | 38919 | les chiffres dansent | ✅ corrigé (partie R) |
| 30 | 2 | « Annuler ce qui attend le DR ? » : le bouton « Annuler » veut dire « ne pas annuler » | 28960 | piège de libellé | ✅ corrigé (partie K) |
| 31 | 2 | `alert()` natifs dans le flux des bons de commande | 32385 | une boîte du navigateur | ✅ corrigé (partie K) |
| 32 | 2 | Une fenêtre ouverte laisse défiler la page derrière elle | 384 | la page bouge sous la fenêtre | ✅ corrigé (partie S) |
| 33 | 2 | Une validation de formulaire ne marque aucun champ | 17635 | « Date et heure obligatoires », mais lequel ? | ✅ corrigé (partie T) |
| 34 | 2 | Un toast d'erreur a l'habillage d'une confirmation | 13911 | une erreur passe pour un succès | ✅ corrigé (partie J) |
| 35 | 2 | Réorganiser les tuiles du tableau de bord : saut à la prise et à la dépose | 17530 | la tuile saute | ✅ corrigé (partie U) |
| 36 | 2 | Huit transitions animent la largeur ou le rembourrage au lieu de `transform` | 3993, 6334, 6368, 499, 106, 2324 | calcul de mise en page à chaque image | ✅ corrigé (partie V) |

### Écartés après vérification (ce ne sont pas des défauts)

- Délais sur la recherche (170 ms) et l'ouverture de « Créer » : anti-rebond voulu et mesuré (commentaire 8909–8926).
- Orbes de fond animés à l'infini : jamais peints, `body::after{display:none}` du thème final (7345).
- Tracking négatif des étiquettes de la barre d'onglets, tracking positif du grand titre (+0,37 px) : choix écrits,
  et +0,37 pt est la valeur même d'Apple pour un « Large Title » de 34 pt en SF Pro.
- « Pas de retour au balayage depuis une fiche » : le geste retour du système le fait.

## Ce qui a été corrigé, et la preuve

### Partie A — les trois réglages du système (n° 1, 2, 3)
- Contraste accru : la règle prend la même force que les deux thèmes ; tous les jetons de matière deviennent pleins,
  le reflet s'éteint, le liseré prend la teinte du texte tertiaire ; les boutons fantômes, la recherche et le curseur
  des segmentés prennent un trait intérieur ; le lien « ‹ retour » en est exclu (ce n'est pas une surface).
- Transparence réduite : à la SOURCE — jetons opaques et aucun flou de fond, quel que soit l'élément (voiles écrits en
  ligne compris). Quand les deux réglages sont posés, l'opaque l'emporte.
- Animations réduites : `defilDoux()`, un seul passage pour les sept défilements.
- Bancs : `test-2830` (35 contrôles, 7 mutations sur 7 mordent), `test-2831` (47 contrôles, 7 mutations sur 7).
- Sondes : `sonde-contraste-accru.js` (8 ✓ ; 4 ✗ sur la bêta d'origine), `sonde-transparence-reduite.js` (4 ✓ ;
  0 ✓ 4 ✗ sur l'origine), `sonde-defilement-reduit.js` (sur l'origine la page glisse sur 3 048 px, corrigée elle saute).

### Parties B à W
La preuve de chacune (banc, mutations vues tomber, sonde au navigateur avec sa contre-épreuve sur la bêta d'origine,
suite complète) est écrite dans son message de commit, sur la branche.

### Partie X — la relecture adverse des parties K à W
Avant de livrer, le diff K → W a été relu par trois relecteurs indépendants, chaque constat repris par un sceptique
chargé de le réfuter (12 agents) ; puis les correctifs eux-mêmes ont été relus (5 agents). Ce qu'ils ont trouvé, et
qui est corrigé :
- l'« Annuler » d'une suppression devenait muet après une suppression refusée (point 20) ; sans rien à rétablir, il
  le dit ;
- le toast posé par une annulation (« Rétabli ») était retiré dans le même geste — on cache d'abord, on agit ensuite ;
- reprendre une carte du tableau de bord pendant que la précédente se pose (point 35) : l'ordre enregistré différait
  de l'ordre montré ;
- un refus des bons de commande (point 31) partait SOUS le panneau ouvert — le toast passe au-dessus des panneaux
  plein écran, sous la visionneuse ;
- une fenêtre qui se redessine (toucher une teinte) remontait tout en haut (point 32) ; une AUTRE fenêtre se reconnaît
  au début de son texte (lettres et chiffres : un « ✕ » devient une icône entre deux dessins) ;
- le pixel de défilement du voile faisait paraître une barre sur une fenêtre courte, là où le système en dessine ;
- le message d'un champ qui manque (point 33) tombait entre deux champs d'une même rangée ; dans une rangée qui passe
  à la ligne (`.frow`), il reste sous le champ, au retrait de la rangée ;
- la visionneuse de photo (point 21) restait par-dessus l'écran de connexion après une déconnexion ;
- une erreur portait deux signes (la pastille « ! » et l'émoji « ⚠️ ») — elle n'en porte plus qu'un.
Un constat a été réfuté : l'« Annuler » de « Rendre toutes les box » pourrait écraser un changement fait ailleurs sur la
même box dans les 7 s du toast — un cas qu'un utilisateur n'atteint pas en pratique.
- Bancs : `test-2840` (43), `test-2841` (30), `test-2842` (89), `test-2849` (43), `test-2850` (40), `test-2851` (31) ;
  27 mutations sur 27 mordent.
- Sonde : `sonde-relecture.js`, iPhone et Mac, jour et nuit : 30 ✓ ; 17 ✓ 13 ✗ sur la bêta de la partie W.

### Partie Z — les trois restes de la relecture
- **La bulle du navigateur** : un champ « obligatoire » laissé vide arrêtait l'envoi sur la bulle du système, avant notre code
  (54 champs dans 30 formulaires). Le navigateur lève « invalid » sur chaque champ en défaut avant d'abandonner l'envoi : on la
  retient là, et `champManque` désigne les champs du même essai d'un coup, le message nommé par le libellé du champ
  (« « Nom / Raison sociale » est obligatoire »).
- **Six gestes du tableau de bord** (« Modifier », une carte ajoutée, retirée, déplacée, la disposition d'origine, la période)
  le redessinaient sans la barre « Reprendre ». Ils passent par `tdbRedessiner` : la seule fonction qui écrit l'écran, puis la
  place où l'on était.
- **Deux menus écrits en ligne** (le choix d'une box dans Mouvements, le menu du pied) posaient leur fond par `onmouseover`,
  que le toucher d'un iPhone laisse collé. Une classe porte le survol (à la souris seulement) et l'appui.
- Banc : `test-2853` (31). Sonde : `sonde-partie-z.js`, iPhone et Mac, jour et nuit : 41 ✓ sur chacun ; sur la bêta d'avant,
  16 ✗ et 18 ✗.

### Partie Y — la taille du texte suit le téléphone (n° 4)
- Justin, 22 octobre : « corrige tous les problèmes tout de suite ». Toute la typographie est en px (2 157 tailles) et Safari ne
  fait grossir que la police du système : on ne réécrit pas le fichier. Quand le facteur n'est pas 1, la page fait passer
  chaque taille en px par `calc(… * var(--txt,1))` — les feuilles une fois, les styles en ligne par un observateur posé à ce
  moment-là. Au réglage « Normale », rien ne bouge (ni feuille ni observateur), et ce qu'on écrira demain en px suit tout seul.
- « Comme l'appareil » (le défaut) lit, sur iPhone et iPad, la taille de `-apple-system-body` (17 px par défaut ; 19, 21, 23
  aux trois crans au-dessus). Paramètres › Apparence › « Taille du texte » : Comme l'appareil, Normale, Grande (×1,12), Très
  grande (×1,24), La plus grande (×1,35). Jamais sous 1, jamais au-dessus de 1,35. Le menu, la barre du haut et les onglets
  gardent leur taille. Les initiales d'une tuile de liste aussi (elles vivent dans une tuile de taille fixe).
- Banc : `test-2854` (40), 20 mutations sur 20. Sonde : `sonde-taille-texte.js` — le mécanisme (le contenu grossit de 35 %,
  les barres non, un écran dessiné après aussi, le retour à « Normale » rend chaque taille au centième de pixel), puis chaque
  rubrique à ×1 et ×1,35 sur iPhone, petit Android et Mac.

