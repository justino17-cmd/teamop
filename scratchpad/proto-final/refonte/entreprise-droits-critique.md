# Critique de `MON-ENTREPRISE-ET-DROITS.md` (voie entreprise, étape 3 sur 8, 17 novembre 2026)

Deux lectures, en adversaire : (1) la **faisabilité** dans le code tel qu'il est AUJOURD'HUI (la branche contient les fusions de Matériel,
Temps de travail et Boîte mail, que la spécification du matin ne connaissait pas) ; (2) le **novice** (gérant de 55 ans, secrétaire à qui on
retire un droit). Chaque objection dit : ce que la spécification affirmait, ce que j'ai mesuré ou lu, la correction. Les corrections sont écrites
dans la spécification, marquées ⟲O<n>. Mesures : `scratchpad/proto-final/refonte/entreprise-droits-outils/menus-actuels.js` (menus réels),
`gestes.js` (recensement des gestes), `bureau-toutes-cases-avant.js` (NOUVELLE, § O18), calculs de clé (SIRET, IBAN) faits à la main.
Cette étape ne modifie aucune page.

## A. Faisabilité — ce qui était FAUX ou OUBLIÉ (bloquant pour l'application)

**O1 — Julie a 9 lignes, pas 7, depuis la fusion de Matériel.** Mesuré ce soir (`menus-actuels.js`, mode application) : Julie = 9 lignes
(Mes tâches, Interventions, Clients, Devis, Contrats, Comptabilité, Achats et frais, **Stock, Fournisseurs, matériel & produits**) ; Marc 19 ;
Sophie et Karim 6. Le lot 2 de Matériel (`2b2c5e5`) a poussé `ROLES.gestion.routes.push('stock','produits')` et un groupe « Matériel » dans
`LIGNES_ROLE.gestion` (« le bureau voit Stock et Fournisseurs ; ni Dépôts, ni accepter »), en suivant sa recommandation n° 1
(`MATERIEL.md` § 12, **sans réponse de Justin**). La spécification affirmait « Julie = 7 = les menus validés » à six endroits (§ 0.11, 2.1, 2.12,
7.3, sonde `droits-menus`, `derive.js`) et RETIRAIT Stock au Secrétariat (stock 0000). Appliquée telle quelle, elle défait le lot Matériel
fusionné et casse ses sondes (`materiel-stock-gestes.js` ouvre Stock en tant que Julie) sans que personne n'ait décidé. **Correction :**
les valeurs de départ suivent la branche (Secrétariat garde stock 1110), le menu de Julie attendu est 9, et la bascule vers 7 est une VALEUR
(`secr.stock` à 0000) posée au § 7 comme doute n° 8 pour Justin.

**O2 — Trois « routes » qui n'en sont pas, lues par `rlPermis`.** Matériel a ajouté `rlPermis('stockAccepter')`, `rlPermis('stockReglages')`,
`rlPermis('produitsPrixVente')` (`msAccepte`, `msReglages`, `msPrixVente`, ~6 lectures), et ferme « Dépôts et camions » au bureau par l'ABSENCE
de `boxes` dans `ROLES.gestion.routes`. La spécification remplace `rlPermis` par `droitVoit(route)` avec « la route doit être connue » : ces trois noms
ne sont pas connus → `false` pour tout le monde, **le gérant compris** : Matériel perd ses boutons « Accepter », « Réglages » et le prix de vente.
Et dans `ROUTE_DROIT` toute personne qui a `stock › Voir` ouvrirait Dépôts et camions (le bureau aussi). **Correction :** une seconde table
`ACTE_DROIT` (§ 2.6 bis) : `stockAccepter` ⇐ `valstock` ; `stockReglages` et `produitsPrixVente` ⇐ `stock › Supprimer` ; `boxes` exige `stock › Voir` ET
`stock › Supprimer`. Défauts : Secrétariat (stock 1110) = Stock et Fournisseurs sans Dépôts, sans Accepter, sans réglages, sans prix de vente = ce que Matériel livre.
Et la sonde de complétude recense tout argument littéral de `rlPermis(`/`droitVoit(`.

**O3 — Lecteurs de `ROLES[x].routes` oubliés, et une phrase fausse.** Relevé (`grep "\.routes"`) : `rlPermis` (11341), `sessionVue` (22472),
`nvVoit` (22888), `mbxAcces` (17778), et **neuf écrivains** qui poussent des routes (12154, 12155, 13288, 14491, 14984, 15864, 18444, 19879, 20264)
plus `LIGNES_ROLE.gestion.push` (14985). La spécification disait « `NV_NEUF`/`NV_PLACE` filtrent par `nvVoit` (donc par `rlPermis`) » : **faux**,
`nvVoit` lit `ROLES[ROLE].routes` ET `drRefuse` lui-même. `mbxAcces` (« qui peut recevoir un courriel confié ») lit
`ROLES[sessionRole(eqDe(k))].routes.includes('boiteMail')` pour UNE AUTRE personne : c'est la vraie raison pour laquelle `droitVoit` doit prendre la
personne en paramètre — la spécification la donnait pour `rlLignes` seulement. Laisser les écrivains en place après D2 = du code mort qui a l'air d'une
garde. **Correction :** liste exacte au § 2.6 ; les neuf écrivains et `LIGNES_ROLE.gestion.push` sont SUPPRIMÉS à D2 ; `nvVoit`, `mbxAcces`, `sessionVue` passent par `droitVoit`.

**O4 — « Une quarantaine de familles » : il y en a 236, et 1 041 verbes.** `gestes.js` (réexécuté) : 236 familles `data-<famille>="verbe|…"`, 1 041 verbes,
dont 250 qu'une heuristique d'écriture marque. Un classement verbe par verbe à la main est ingérable et, surtout, **faux dès demain** : Matériel,
Temps de travail et Boîte mail ajoutent des `data-*` en parallèle (`vx` : 41 verbes, `tt` : 24…). Et la règle 4 (« verbe inconnu = Modifier ») refuserait à
quelqu'un qui n'a que « Voir » d'ouvrir une fiche, de filtrer, de changer d'onglet sur un écran qu'une voie vient d'enrichir. **Correction (§ 2.9) :** la table se fait PAR
FAMILLE (famille → catégorie ; verbes de lecture par motifs nommés ; exceptions c / s listées) ; un verbe INCONNU d'une famille connue suit la famille ; une famille inconnue
prend la catégorie de l'écran ouvert et n'est refusée que si le verbe a la FORME d'une écriture (le même motif que `gestes.js`), sinon elle passe — et dans les deux cas
`droits-table.js` tombe en le nommant. **`droits-table.js` entre dans les contrôles de CHAQUE poussée dès D3** (aujourd'hui il n'est que dans la liste des sondes) : la
complétude est une garantie de la sonde, pas du moment où la table a été faite.

**O5 — Les « trois portes » de la facture sont quatre, et un message peut mentir.** `envoyerFacture` a trois appelants, pas deux : `terminer` (7996),
`ACTIONS.envoyer` (8027) et **`ACTIONS.toutValider`** (`L.forEach(envoyerFacture)`, « N factures envoyées » — oubliée). Si la garde est posée en première instruction
d'`envoyerFacture` SANS rendre de valeur, `envoyer` dit quand même « Facture envoyée au client » et `toutValider` compte des factures qui ne sont pas parties : un
écran qui ment (la règle `_mailboxes` de ce dépôt). Aussi : `terminer` est le geste du TECHNICIEN, qui ne peut rien régler dans « Mon entreprise » — un toast « Il manque ton SIRET »
lu par Sophie ne lui sert à rien. **Correction (§ 1.7) :** UNE porte, `envoyerFacture`, qui RENDS un booléen ; les quatre appelants (avec `apercuEnvoi`, qui montre le bouton) le lisent ;
`terminer` refuse en silence pour le terrain et le gérant lit le manque dans le bandeau et la pastille.

**O6 — Le technicien ne pourrait plus défaire ses propres erreurs.** La table classe « supprimer une note, une photo, une pièce » en `inter › Supprimer` et « effacer une signature »
en `ventes › Supprimer`, et le profil Technicien a `inter 1010` / `ventes 0000`. Or `photoSuppr`, `pieceSuppr` et **`sigEfface`** (« effacer pour refaire ») sont dans la fiche de TERRAIN
(`4612`, `4616`, `4624`) : Sophie ne pourrait plus retirer une photo prise par erreur ni refaire la signature du client — le geste central de son métier. Même risque pour le paiement noté
sur place (`F.paiement`, rangé en `ventes`). **Correction (§ 2.5, 2.12) :** tous les gestes de la fiche de terrain (`photo*`, `piece*`, `note*`, `sig*`, `terminer`, `pasFini`, paiement noté sur place)
sont `inter` (c'est la règle 3 du § 2.2 appliquée jusqu'au bout : la portée suit la forme) ; Technicien `inter` = **1011** (Supprimer = retirer ce qu'il a lui-même mis dans sa fiche) ;
`sigCtrEfface` (contrat, bureau) reste `ventes`.

**O7 — « Travaille sur le terrain » ne se décoche pas pour les quatre de démonstration.** `eqxTerrain = p => EQX_BASE.includes(p.k) || !!p.terrain` : décocher la case sur la fiche de Sophie ne
change rien (elle est dans `EQX_BASE`). Il y a de plus **treize** listes en dur `['sm','kb','lr','tl']` (filtres et chiffres d'Équipe, soldes de congés…) et la case de l'invitation est **toujours cochée**
(9778 et sa jumelle). Sans correction, la forme de l'écran « suit une case » que personne ne peut changer. **Correction (§ 2.3) :** `p.terrain` booléen posé sur chaque personne de démonstration,
`eqxTerrain = p => !!p.terrain` (une seule lecture), `EQX_BASE` et les treize listes supprimés, case d'invitation cochée seulement pour le profil Technicien ; sonde : décocher pour Sophie change son menu à
l'instant, sans recharger.

**O8 — « Bonjour Marc » à Julie.** Mesuré ce soir : l'Accueil ouvert par la coque « gestion » (que le Responsable aura) dit « Bonjour Marc » (`5152`, texte écrit en dur). Le plan « qui a fait quoi » ne voyait que le
JOURNAL. `'marc'` apparaît 266 fois, en trois emplois : donnée de démonstration (reste), acteur (devient `acteur()`), **texte lu** (« Bonjour Marc », noms dans les toasts). **Correction (§ 2.10) :**
le recensement les classe en trois, le troisième lit `prenom(acteur())`, et `rlQui`/`rlQuiMenu` lisent `acteur()` (un seul chemin).

**O9 — (voir la partie novice) la case retirée sans explication.** § B2.

**O10 — Le SIRET de démonstration ne passe pas la clé de contrôle.** La spécification impose « les 9 premiers chiffres passent `cxSirenOk` » à l'enregistrement et fait de « Complète » un état qui en dépend.
Calculé : **123 456 789 00012 échoue** (clé de Luhn du SIREN : somme non multiple de 10) ; l'IBAN de démonstration, lui, passe le modulo 97 (reste 1). Conséquence : la fiche de la société fictive serait « À compléter »
dès le premier jour et « Enregistrer » refuserait SA PROPRE valeur ; et, hors démonstration, certains vrais SIRET (ceux de La Poste, notamment) échouent à la clé. **Correction (§ 1.4) :** la clé AVERTIT, ne bloque pas ;
« Complète » = quatorze chiffres. (Changer le SIRET fictif pour un SIRET valide risquerait de tomber sur celui d'une vraie entreprise : on ne le fait pas.)

**O11 — 17 gabarits `logo-ent`, pas 19.** `grep -o 'class="logo-ent">CS<'` = 17 (deux fois écrit « 19 » : § 1.4 et la sonde `entreprise-destinations`). Une sonde qui compte « 19 » tombe pour de mauvaises raisons ou, pire, on invente deux gabarits
pour l'atteindre. **Correction :** 17, relu par la sonde (population comptée avant le contrôle).

**O12 — `PAIE_CAB` « écrit aussi » : une donnée en deux exemplaires.** `PAIE_CAB` est une COPIE faite au chargement de `CP_EXPERT` (11845). La spécification la fait réécrire à chaque enregistrement. C'est la panne type de ce dépôt (une donnée
en deux exemplaires dont un seul est mis à jour : le jour où une troisième voie écrit `CP_EXPERT` seul, le cabinet de la paie et celui des bilans divergent). **Correction :** `PAIE_CAB` devient trois accesseurs sur `CP_EXPERT`
(`get nom(){ return CP_EXPERT.cab }`…), une seule source ; les lectures ne changent pas.

**O13 — Le garde-fou en capture laisse les écrans mentir.** Refuser un `change` ou un `input` par `preventDefault` ne défait rien : la case est DÉJÀ cochée à l'écran, la valeur déjà tapée, alors que la donnée n'a pas bougé (la règle de ce dépôt : un
refus doit savoir se dire, et un écran ne montre jamais ce que la donnée n'a pas reçu). `data-eqd` (les cases des droits), les cases `data-skvalid`… sont des `change`. **Correction (§ 2.9) :** la garde écoute aussi `click` sur les cases et
boutons radio (là seulement le `preventDefault` défait la coche), et tout refus de `change`/`input` remet l'écran d'aplomb (`checked`/`value` d'avant, à défaut `rendre()`) ; sonde `droits-restauration.js` : l'état VISIBLE après refus égale la donnée.

**O14 — Le nettoyage par `MutationObserver` est le mauvais outil.** Un observateur sur `#contenu` qui retire des nœuds se réveille sur ses propres retraits (boucle à protéger), parcourt le DOM à chaque écriture de `#contenu`
(le coût que ce dépôt a payé le 26 septembre avec `:has()`), et un panneau (`ouvrirPanneau`) naît hors de `#contenu`. **Correction (§ 2.8) :** une FEUILLE DE STYLE générée de la table (`droitsCss(personne)` : une règle
`[data-<famille>^="verbe|"]{display:none!important}` par geste refusé), recalculée à la connexion, au changement de personne et de droits : un écran ou un panneau neuf est nettoyé à sa naissance par le navigateur, `display:none`
sort le bouton de l'ordre de tabulation et de l'arbre d'accessibilité, zéro observateur. Ce qui n'a pas d'attribut reste gardé par la couche 2 et nommé par la sonde.

**O15 — Sondes qui tombent : la liste du matin était incomplète.** Treize sondes étaient annoncées. Il faut ajouter celles qui lisent ou jouent Julie, Stock, la Boîte mail ou les routes : **`mail-roles.js`** (`rlPermis('boiteMail')` pour julie/sm),
**`materiel-stock-gestes.js`** (ouvre Stock en tant que Julie), **`vehtemps-t1-structure.js`** (jusqu'à `qui` julie, sm, kb sur `pointage`), `menu-poste.js` (Julie sur `devis`) — et `menu-commun.js` fige `ATTENDU.julie` à 7 lignes alors que la branche en sert 9 : **elle est
déjà fausse aujourd'hui**, indépendamment de cette voie. La réécriture « lire le menu DÉDUIT » (D7) vise donc 17 sondes, pas 13.

**O16 — Les trois voies fusionnées ne disent pas la même chose du bureau.** `BOITE-MAIL.md` § 5 : « visible pour le gérant et le bureau (`rlPermis('boiteMail')`) » ; la branche : Julie n'a PAS la Boîte mail (`routes` sans `boiteMail`, `mail-roles.js` attend `julie:false`) ; `MENU-FINAL` : pas de Boîte mail au bureau ; la spécification : Secrétariat `com` 0000. Trois sources, deux
réponses. On suit la BRANCHE et les menus validés (Boîte mail : gérant et Responsable seulement), et on le dit au § 7 (doute 8) puisque la décision ouvre aussi la question de Stock.

**O17 — « Gérant » partout, « administrateur » dans le refus.** `rlRefus` dit « demande à l'administrateur de la rouvrir » (phrase déjà validée et couverte par des sondes : on la garde mot pour mot) ; le reste de la spécification dit « le gérant ». Les nouveaux messages prennent le PRÉNOM
(« Demande à Marc ») et jamais un titre : c'est ce que la personne sait.

## B. Le novice

**B1 — « Achats et frais » ne se comprend pas en trois secondes, et l'écran se contredit lui-même.** Justin : « Achat et frais. Ça, je sais pas ce que c'est. » La spécification garde le nom (décidé la veille) et rattrape par une ligne grise (« Demandes de l'équipe », 127 px sur 147)
et un sous-titre. Deux défauts restent. (a) Le sous-titre promet « ce que ton équipe te demande de payer » puis l'écran montre **quatre chiffres dont deux ne sont pas des demandes de l'équipe** (« 896 € de factures fournisseurs », « 4 achats sans facture »), qui mènent AILLEURS
(Comptabilité) : un chiffre qui est une porte vers une autre catégorie dans une rangée de chiffres qui sont des demandes, c'est ce qui perd un gérant de 55 ans. (b) « du matériel et ses notes de frais » : « ses » renvoie à l'équipe, singulier ambigu. **Correction (§ 3) :** deux chiffres (les demandes
de matériel, les notes de frais) puis, sous un titre « Ça se règle dans la Comptabilité », **deux lignes cliquables** (les mêmes portes) ; sous-titre « Le matériel que ton équipe demande, et les frais qu'elle te fait rembourser. ». Et le NOM reste un doute à dire à Justin (§ 7, n° 9), avec l'alternative chiffrée
(« Demandes de l'équipe » comme nom, « Achats et frais » disparaissant du menu) : le coût d'un renommage est la cascade déjà listée, pas du code nouveau.

**B2 — La secrétaire à qui on retire « Supprimer » ne saura pas pourquoi le bouton a disparu.** La spécification ne pose la phrase « Tu peux regarder cet écran, pas le modifier » que si la personne n'a AUCUNE des trois cases `c m s` ; avec une partie seulement elle écrit : « rien (le bouton absent suffit) ».
Mais « le bouton absent » ne se lit pas : Julie, qui supprimait un contact hier, cherche la corbeille et ne la trouve pas, sans un mot. **Correction (§ 2.8 point 7) :** sur chaque écran dont la catégorie est partielle, UNE ligne grise en pied : « Dans cette rubrique, ton compte ne peut pas supprimer. Pour changer ça,
demande à Marc. » (verbes de la catégorie manquants, au maximum deux ; jamais un mot de code) ; sonde `droits-partiel.js`.

**B3 — « Il voit son téléphone » : genre et jargon.** Le libellé de la case « Travaille sur le terrain » dit « Il voit… » (Sophie, Léa) et « Ce qu'elle ne voit pas ». **Correction :** neutre (« Coché : l'application s'ouvre sur sa journée, ses frais, ses heures, son camion et ses congés. Décoché : elle s'ouvre
sur les écrans du bureau. », « Ce que {prénom} ne voit pas : »).

**B4 — « Pour être payé » regroupe deux questions.** La carte 4 mêle l'IBAN (« pour qu'on me paie ») et l'expert-comptable (qui reçoit bilans et paie) : une carte, deux questions, et le titre ne dit rien de la seconde — alors que le rôle de la page est « une question par carte ». **Correction :** « Ta banque et ton comptable »
(aide : « Ton IBAN, pour que tes clients te paient, et le cabinet qui reçoit tes bilans et ta paie. »). Carte 5 : « Tes horaires et tes tarifs » (le champ s'appelle « Tarif horaire » : « prix » et « tarif » ne se mélangent pas dans la même page).

**B5 — Le bandeau mélange « le nom de l'entreprise » et « ton ».** « Il manque le nom de l'entreprise, ton adresse, ton SIRET » : trois formes de possessif en une phrase. → « Il manque le nom de ton entreprise, ton adresse et ton SIRET : une facture ne peut pas partir sans. ».

**B6 — Un champ refusé ne se dit que par un toast.** Sur téléphone le clavier peut cacher la zone du toast et le message disparaît en 3 s ; le champ fautif n'a rien. **Correction (§ 1.9) :** le message est AUSSI écrit sous le champ (`role="alert"`, `aria-describedby`), le focus y est posé, le toast reste.

**B7 — « Mon entreprise » dans « Personnel » : bon endroit, mauvais mot de groupe.** Je confirme le doute n° 5 (le mot désigne des personnes) mais je ne propose pas de changer : c'est le seul groupe sans règle cassée (jamais un groupe d'une ligne, aucun mot de groupe validé touché).
Un gérant de 55 ans cherche « mon entreprise » dans le menu ; la ligne porte son nom, le groupe ne l'aide ni ne le gêne. Pas de changement.

**B8 — Équipe est un écran VALIDÉ (« c'est bien »), et la spécification en change la fiche.** Grille repliée derrière un `<details>`, phrases neuves, libellé « L'entreprise et l'équipe » à la place de « Équipe » (catégorie), retrait de la case « Voir toute l'équipe ». C'est voulu (Justin demande que les droits « agissent vraiment »),
mais il doit le savoir : doute n° 10, et le rapport de l'étape 7 montre l'avant et l'après de la fiche.

## C. Ce que j'ai vérifié et qui TIENT (pour que l'étape 4 n'y retourne pas)

- Les fonctions et lignes citées existent : `drRefuse` (22455), `sessionRole` (22467), `rlLignes` (11385), `LIGNES_ROLE` (11369), `BARRE_ROLE` (11459), `eqFiche` (9752), `envoyerFacture` (8125), `cxFicheLegale` (11126),
  `opdDonnees` (20471), `PARAMS` (8265), `TARIFS` (8266), `CP_EXPERT` (7594), `PAIE_CAB` (11845). `terminer` ne fabrique que la facture automatique (7996) : « Je ne peux pas finir » est vrai par construction.
- Le texte « Comment ça marche » (8110) porte bien « plafond », « premier passage » et « dans tes réglages » : la réécriture du § 1.7 est exacte.
- Les cinq occurrences de « Paramètres » (4854, 8265 commentaire, 12757, 12837, 22884) : le tableau du § 1.8 les couvre toutes (plus la visite 12627, formulée « les réglages »).
- `opd_fermer` (20548) ne connaît que `role`/`absent`/`fin` : le motif `entreprise` du § 1.8 demande d'ÉTENDRE ce test côté prototype aussi (une ligne) ; sinon il retombe en `fin` sans ouvrir Mon entreprise.
- Les 19 routes d'équipe s'ouvrent pour la coque « gestion » sans exception (`bureau-toutes-cases-avant.js`, § O18), donc le Responsable sur la coque « gestion » est faisable sans réécrire de vues.

**O18 — Mesure faite avant le câblage (la spécification la demandait « avant D2 »).** `scratchpad/proto-final/refonte/entreprise-droits-outils/bureau-toutes-cases-avant.js` : Julie (coque gestion), toutes les routes d'équipe ouvertes sans toucher au code de la page, comparées à Marc
sur les mêmes 19 routes : **20 ✓ · 0 ✗** (19 routes + la population). Trois écarts normaux et nommés dans la sonde : « Tâches » s'écrit « Mes tâches » (`LIB_ROLE`) ; sa Comptabilité s'ouvre dans le cadre plein écran `#cpsys` ; la Boîte mail charge son module en différé (50 signes chez les deux). Premier jet : 17 ✓ · 3 ✗ — les trois
écarts ci-dessus, pris pour des défauts avant d'être nommés. Reste à jouer : le contenu de ces écrans pour une personne SANS le droit d'écrire (D3). Contre-épreuve de la sonde : non faite (une exception forcée dans une vue ne l'a pas été) — à faire avec les mutations de D7.

## D. Ce que je n'ai PAS pu vérifier

- Le comportement des gardes en capture sur un vrai doigt (planning : `touchstart`) : la spécification le demande à D3/D7, rien à mesurer sans le code.
- Le rendu du pied « ton compte ne peut pas supprimer » et des cartes de « Mon entreprise » : ce sont des écrans à construire (étapes 4 et 5).
- Si Justin veut que le bureau ait Stock (O1) : sa réponse n'existe pas ; les deux branches sont écrites.
