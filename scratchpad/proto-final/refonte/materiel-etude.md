# Étude du groupe « Matériel » — Stock, Fournisseurs/matériel/produits, Dépôts et camions

Dossier d'étude écrit le 16 novembre 2026, AVANT toute refonte. Rien du dépôt n'a été modifié pour l'écrire.
Source : `apercu/prototype-op-gestion.html` (22 199 lignes ; entreprise fictive « Clim Services 17 », date du prototype : samedi 31 octobre 2026).
Méthode : lecture du code (numéros de ligne = ce fichier), puis jeu de chaque écran dans le vrai prototype (Playwright, mode application,
127.0.0.1) sur Mac 1440, iPad 820 et iPhone 390, de jour et de nuit, gérant (Marc), bureau (Julie) et technicienne (Sophie).
Captures : `/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/materiel/` (hors dépôt, 160 fichiers :
`<écran>-<profil>-<jour|nuit>-<qui>.png`, et `-pleine.png` pour la page entière).

⚠️ Lecture indispensable : **ces trois rubriques ne sont pas écrites à un seul endroit.** Le prototype est une pile de « lots »
qui se réaffectent les uns les autres (`vueStock` est définie à la ligne 9077 puis RÉAFFECTÉE à la 14475 ; `vueBoxes` 9227 puis 15006 ;
`prFiche` 8113 puis 14647 ; `lieuFiche` 9126, 14639, 15048…). Ce qui s'affiche est le DERNIER lot. Il y a donc du code mort qui
ressemble à du code vivant (ex. `bxMonCamion` l.15181 : un 2ᵉ « Mon camion », jamais atteint depuis la route `moncamion`, qui sert `vueMonCamion` l.14321).

**Sommaire** : 1 La carte · 2 L'inventaire complet des capacités (Q/H/P/R) · 3 Le modèle de données et ce qu'il ne faut pas casser · 4 Ce que je vois (captures + critique) ·
5 Les défauts de fonctionnement (F1 à F18) · 6 Les dix choses qu'on vient faire, en combien de gestes · Annexe A « Achats et frais » expliqué · Annexe B Ce que l'étude dit à celui qui refait · Limites.

**Les cinq constats qui comptent** : (1) Stock et Dépôts et camions répondent à la même question (« où est quoi, qu'est-ce qui manque ? ») avec deux tableaux de bord différents ; Produits ouvre sur 24 éléments avant le premier article, Stock sur 33 : Devis, Clients, Interventions ouvrent sur la liste ;
(2) le bureau (Julie) n'a aucune des trois rubriques alors qu'elle réceptionne et prépare les commandes (F1) ; (3) le technicien n'a que « Mon camion » : bon écran, mais un double envoi crée un doublon (F2) et il ne peut pas chercher une pièce ;
(4) « à commander » est compté de cinq façons (F4) et le bandeau du Stock réassortit un camion au garage (F3) ; (5) beaucoup de bonnes idées sont là (réassort en cases, validation « il en restera 6 », bon de commande, franco/moins cher, lecture de facture par photo, registre des fluides) mais enfouies ou noyées.

---------------------------------------------------------------------------------------------------------------------------------

## 1. LA CARTE — chaque écran, onglet, fenêtre, feuille

### 1.0 Qui arrive où

| Rôle (profil) | Menu | Ce qu'il voit du groupe Matériel |
|---|---|---|
| **Gérant** (Marc, `patron`) | groupe « Matériel » (`CATS`, l.7622) : **Stock** (`#stock`), **Fournisseurs, matériel & produits** (`#produits`), **Dépôts et camions** (`#boxes`) | tout |
| **Bureau / secrétariat** (Julie, rôle « Gestion des factures », l.11156) | **aucune des trois** : `ROLES.gestion.routes` ne contient ni `stock`, ni `produits`, ni `boxes` (elle a `achats`, ajouté l.17429) | RIEN. Constaté : `aller('stock')` et `aller('produits')` la renvoient sur l'écran d'ouverture du rôle (Comptabilité). Pourtant les données du prototype disent que Julie réceptionne les commandes (mouvements m2, m3, m6 « Réception de la commande… » par `julie`) et qu'elle prépare les commandes d'après Achats (« Tu vois les demandes pour préparer les commandes »). **Impasse de rôle.** |
| **Technicien** (Sophie, `tech`) | **Mon camion** (`#moncamion`, l.14321, ajouté à `CAT_LIGNES` l.14302 et à `ROLES.tech.routes` l.14303) ; barre du bas : Journée · Frais · Heures · Tâches · Camion | l'écran « Mon camion » seulement ; le reste du matériel lui arrive par la fiche d'intervention (pièces, clôture) et « Ma journée » |
| Client | – | rien |

### 1.1 STOCK — route `stock`, `vueStock` (base l.9077, enveloppée l.14475 autour de `sxVueStock0`)

En-tête : surtitre « Matériel », titre **Stock**, phrase « Où est chaque article — l'atelier, les camions, les réserves chez les clients —, qui l'a pris, et ce qui manque. »,
4 boutons : **Sortie** (`stkForm('sortie')` l.9138) · **Transfert** · **Entrée** (`sxEntree` l.14590, ajouté par le lot stock) · **Réassort des camions · N** (`stkReassort` l.9164 → `bxReassort` l.14958).
4 onglets (`stkOnglet`) :

| Onglet | Fonction | Contenu |
|---|---|---|
| **Vue d'ensemble** (`ensemble`) | `vueStock` l.9077 + 14475 | (a) carte « À faire maintenant » `sxBandeau` l.14459 (4 lignes max parmi `sxAFaire` l.14445 : à valider, pièces prévues non en stock, camion sous dotation, atelier vide, bouteille de fluide presque vide, lieu à compter) ; (b) 4 chiffres : valeur du stock, valeur dans les camions (→ filtre), « à commander › » (→ Commandes), « mouvements à valider » (→ onglet) ; (c) tuiles des lieux (un bouton par lieu → fiche du lieu) ; (d) puces de lieux `sxChips` l.14473 + lien « Gérer les lieux › » (→ `#boxes`) ; (e) filtre Tout / À commander / Dans les camions + recherche ; (f) liste de TOUS les articles groupée par état (Épuisé, À commander, Commandé, En stock, Sur commande), chaque ligne montrant la répartition par lieu (`sk-rep`) et la quantité totale |
| **Mouvements** (`mvts`) | `stkVueMouvements` l.9102 → 14557 | filtre type/lieu, recherche (article, personne, client, bon de remise), période, personne ; journal groupé par jour (`mvLigne` l.14575 : icône ↓ ↑ ⇄ ≠, quantité, d'où → vers où, motif, lien client / bon de commande / bon de remise, qui, quand, « validé ») ; pied : nombre, valeur des sorties, « cassé ou perdu » ; **Exporter** (`sxExport` l.14581, PDF/CSV simulés) ; annuler le dernier geste |
| **Inventaire** (`inventaire`) | `stkVueInventaire` l.9114 → 14517 | choisir un lieu (tuiles avec « jamais compté ») → liste « prévu / compté » triée par valeur, écart en direct, « Tout est juste », comptage par catégorie, validation → une ligne « correction » par écart (`sxInvValider` l.14539) |
| **À valider** (`valider`) | `stkVueValider` l.9110 → 14405 | gestes des techniciens en attente (`MVTS_ATT`) : Valider / Refuser (motif, `sxRefus` l.14422), **Tout valider** (`sxToutValider` l.14413), case « les valider d'office » (`STK_VALID`), règle « laisser passer seul ce que le technicien a utilisé chez un client » (`SX.autoUsage`, `sxAuto` l.14293) |

Fenêtres (panneaux `#calque .panneau`) ouvertes depuis Stock :
- **Sortir du stock / Déplacer du stock** (`stkFormVue` l.9142 → 14493) : De, Vers / Pour qui ?, Pourquoi, Sur quelle intervention, lignes d'articles, « Ajouter un article », mention du bon de remise.
- **Ranger dans le stock** (`sxEntreeVue` l.14595) : Vers, motif (Acheté au comptoir / Retour de chantier / Retour d'un collègue), intervention, lignes ; propose « Ranger le ticket dans les achats » (écrit dans `ACHATS`).
- **Réassort des camions** (`bxTransferts` l.14922) : par camion, ce qui manque à la dotation, case par ligne, « Transférer tout », renvoi vers Commandes pour ce que l'atelier n'a plus.
- **Fiche d'un lieu** (`bxFiche` l.15027, atteinte par `lieuFiche` l.15048) : voir 1.3.
- **Fiche d'un article** (`prFiche` : base l.8113, enveloppée l.14647 puis `pdxFicheApres` l.13836) : voir 1.2.
- **Bon de remise** (`stkBon` l.9175) : document « BON DE REMISE BR-2026-0NN » (qui remet, à qui, quoi).
- **Registre des fluides** (`sxRegistre` l.14744) : chargé / récupéré par kilo, client, appareil, bouteille, technicien ; Exporter en PDF. ⚠️ Accessible seulement depuis la fiche d'un article de la catégorie « Fluides frigorigènes » (lien « Voir le registre des fluides ›», l.14651) ou depuis une intervention : pas depuis le menu ni l'écran Stock.
- **Modifier la dotation** d'un camion (`sxDotVue` l.14623), **Exporter** (l.14581), **Tous les mouvements d'un article** (`data-sx="mvart"`).

### 1.2 FOURNISSEURS, MATÉRIEL & PRODUITS — route `produits`, `vueProduits` (l.8081), 3 « vues » (`prVue`)

Titre « Fournisseurs, matériel & produits » (c'est le nom du 6 novembre, Justin : « une catégorie qui réunit les fournisseurs, les commandes, les produits et le matériel »).
Onglets (segmenté, `data-pr="vue|…"`) : **Matériel & produits N** (`articles`) · **Commandes N** · **Fournisseurs N** (sur iPhone le premier s'appelle « Produits », libellé court).

**Vue « Matériel & produits »** (`articles`) :
- boutons : « Le rangement par métier » (`prRangement` l.8126, fenêtre : les 24 métiers, 285 catégories, 5 056 produits typiques, champ « essayer le rangement » `prRanger` l.8022) ; « ＋ Ajouter » (`prFormulaire` l.8141) ;
- 4 chiffres : nombre d'articles (produits / matériel / sans prix), « à commander › » (→ Commandes), valeur du stock, métiers de l'entreprise ;
- bandeau `foBandeau` l.8274 : « NOUVEAU — Choisis tes fournisseurs, on prépare le reste » (tant qu'aucun fournisseur de l'annuaire n'est choisi ; « Plus tard » le masque) puis **4 raccourcis** : Mes fournisseurs · Importer un fichier de tarifs · Lire une facture fournisseur · Commandes ; message « N articles attendent leur prix » ;
- sélecteur de métier (Tous / Climatisation / Chauffage / Plomberie) + recherche (`pdxChercheOk` l.13629 : sans accent, chaque mot n'importe où) ;
- puces de catégories du métier choisi ; puces d'état `PDX_ETATS` l.13642 (Tous, En stock, À commander, Commandé, Épuisé, Sur commande, Sans prix) ; tri (Rangement du métier, Nom, Marge, Stock restant) ;
- liste : une carte par métier, des groupes par catégorie, une ligne par article (nom, réf · fournisseur, hausse d'achat, état, stock · seuil, prix de vente HT + marge, ou « Matériel — pas facturé », ou « Prix à compléter »).
- fenêtres : **Fiche article** (`prFiche` : état, nature, référence, fournisseur (lien), en stock, où (`prOuEst`), alerte, prix d'achat + évolution, prix chez les autres fournisseurs avec « passer chez lui », prix de vente/marge/TVA, utilisé N interventions / N devis, « tu en utilises ≈ x par semaine / de quoi tenir », bouteilles pour un fluide, derniers mouvements, conseil de prix de vente `pdxPvConseil` l.13827, courbe de prix `pdxCourbe` l.13821, boutons Modifier / Importer ses tarifs / Commander / Sortie / Transfert / Entrée / Retirer) ; **Formulaire article** (métier, catégorie, nom avec rangement automatique, référence, fournisseur, stock initial, unité, seuil, achat HT, vente HT, TVA ; contrôles de doublon, de vente à perte, `pdxDoublon` l.13912, `pdxFormApres` l.13949) ; **Le rangement par métier**.

**Vue « Fournisseurs »** (`fournisseurs`, `vueFournisseurs` l.8988) : une carte par fournisseur (type, délai, franco, 4 chiffres : articles, € commandé ce mois, délai réel moyen, % livré à l'heure ; alerte retard/facture ; boutons « Commander · N articles » et « Importer ses tarifs »), bouton « ＋ Ajouter un fournisseur ». Fenêtres :
- **Mes fournisseurs** `fournListe` l.8290 : les miens + l'annuaire du métier (180 entreprises, `FOURN_DIR`, filtre métier + recherche, « ＋ Le mien ») + « Un fournisseur qui n'est pas dans la liste » (`foLocal` l.8336) ;
- **Fiche fournisseur** `fournFiche` l.8320 (+ `pdxFournApres` l.13878 : franco, port, délai, heure limite, paiement, relance automatique) : site, compte client, e-mail des commandes, remise, délai, catégories couvertes, ses articles, ses commandes ; « Préparer mes articles », « Importer ses tarifs », « Lire une facture », « Ce n'est plus mon fournisseur » ;
- **Préparer mes articles** `fournPreparer` l.8346 : produits typiques du fournisseur à cocher, par catégorie (« Tout cocher ») → articles créés sans prix (« attendent leur prix ») ;
- **Importer un fichier de tarifs** `fournTarifs` l.8405 + `foImportVue` l.8419 + `foAppliquer` l.8441 (CSV, colonnes reconnues seules, marges gardées, prix manquants remplis ; « essayer avec un fichier d'exemple ») ;
- **Lire une facture fournisseur** `fournFacture` l.8471 + `foFactureVue` l.8489 + `foFactureValider` l.8500 (photo/PDF « lue par l'IA » ; stock et prix d'achat mis à jour, hausses signalées ; rapprochement avec la commande ouverte `pdxFacCandidates` l.14154).

**Vue « Commandes »** (`commandes`, `vueCommandes` l.8666) :
- 4 chiffres : à commander (lignes · chez N fournisseurs), en cours (€ HT), à traiter (brouillons, retards, factures), commandé ce mois ;
- **« À commander »** : un panier par fournisseur (`cmdPaniers` l.8626 : articles au seuil d'alerte + pièces des interventions, quantité calculée sur la consommation des 8 dernières semaines `cmdSuggere` l.8613, barre du franco de port `cmdFranco` l.8645, « moins cher chez… » `cmdMoinsCher` l.8642, ✕ retirer, quantité modifiable) ; « Préparer la commande » ; « **Tout préparer · N commandes** » (`pdxToutPanneau` l.14006) ;
- **« Suivi des commandes »** : onglets À traiter / En cours / Terminées / Toutes, recherche, « ＋ Nouvelle commande » (`cmdEdOuvrir` l.8717), « Relancer la commande en retard » (`pdxRelGroupe` l.14038), tableau (n°, fournisseur, HT, livraison, état + alerte) ;
- fenêtres : **Bon de commande** `cmdEdVue` l.8730 (fournisseur, lignes, recherche d'articles, totaux, note, livraison atelier/comptoir/chantier, date souhaitée ; « Enregistrer en brouillon », « Aperçu du PDF » `cmdDoc` l.8770, « Vérifier et envoyer » `cmdEnvoiVue` l.8786 / `cmdEnvoyer` l.8794 avec le courriel prêt `cmdMail` l.8784) ; **Fiche commande** `cmdFiche` l.8826 (5 étapes `cmdEtapes` l.8710, lignes avec reçu/reliquat, journal, boutons selon l'état : Vérifier et envoyer, Modifier, Le fournisseur a confirmé `cmdConfirmer` l.8897, Réceptionner, Relancer `cmdRelance` l.8903, Lire la facture / Rapprocher, Voir le bon, « Ce que voit le fournisseur » `cmdPortail` l.8804, Recommander à l'identique, Annuler / Supprimer le brouillon) ; **Réceptionner** `cmdReception` l.8910 (reçu par ligne, n° de bon de livraison, date du reliquat, où ranger `pdxRangement` l.14089) ; **Rapprocher la facture** `cmdRappro` l.8930 (écarts de prix/quantité, Accepter / Contester `cmdFacturer` l.8941 → courriel prêt).

### 1.3 DÉPÔTS ET CAMIONS — route `boxes`, `vueBoxes` (base l.9227, réaffectée l.15006 ; technicien : renvoie `bxMonCamion`, code mort)

Titre « Dépôts et camions », phrase longue, boutons « Réassort des camions · N » et « ＋ Nouvelle réserve ».
- carte **« À faire maintenant · N »** `bxAFaire` l.14976 (à valider ; pièces prévues sur les interventions qui manquent dans les camions `bxBesoins` l.14894 ; articles à remettre à bord ; réserve chez un client sous sa dotation `bxReservesBasses` l.14908 ; camion au garage ; lieux à compter) — chaque ligne est un bouton qui ouvre l'action ;
- recherche « Où est… ? Chercher un article » (annonce les lieux où il se trouve) ;
- trois groupes de cartes (`bxCarte` l.14994) : **Les camions** (4), **L'atelier** (1), **Les réserves chez les clients** (1, 3D/contrats) : nom, responsable/conducteur/client, nb d'articles, valeur, « N à remettre à bord » ou « Dotation complète », « Au garage », dernier mouvement, « Jamais compté » / « Compté le… », bouton « Compléter · N articles » ; réserves fermées en repli.
- fenêtres : **Fiche d'un lieu** `bxFiche` l.15027 (conducteur, plaque (lien Véhicules), 3 chiffres, ce qui manque à la dotation, boutons Compléter la dotation / Sortie / Transfert / Inventaire / Entrée / Modifier la dotation / Modifier, recherche, liste triée par manque avec « ＋ Ajouter », « Transférer vers un autre lieu », derniers mouvements) ; **Compter un lieu** `bxInv` l.15055 (même chose que l'onglet Inventaire de Stock, en panneau) ; **Modifier un lieu** `bxModifier` l.15091 (nom, responsable, accès, dotation) ; **Fermer / rouvrir une réserve** `bxFermer` l.15124 ; **Nouvelle réserve chez un client** `bxNouveau` l.15141 (client cherché, kit de départ, transfert prêt) ; **Réassort / Préparer les camions avant les visites** `bxTransferts` l.14922, `bxPreparer` l.14963, `bxPreparerReserve` l.14968.

### 1.4 « MON CAMION » du technicien — route `moncamion`, `vueMonCamion` l.14321

Surtitre = son nom, titre **Mon camion**, « Camion de Sophie · GH-482-KL. Ce que tu as à bord, ce qui manque, ce que tu as pris ou utilisé. », carte « Messages du bureau » (`rlNotifsCarte`), **3 gros boutons** : « J'ai pris à l'atelier / Je remplis mon camion », « J'ai utilisé / Chez le client, sur mon intervention », « Il me manque / Je préviens le bureau » ; alerte bouteille de fluide presque vide ; carte « Il manque à bord · N » (par ligne : à bord x sur y · à l'atelier z + bouton « Je l'ai pris ») ; carte « À bord · N articles » (par ligne : x sur dotation y) ; carte « Mes envois · N » (en attente du bureau / validé / refusé avec le motif, « Retirer »).
Fenêtres : **J'ai pris à l'atelier / J'ai utilisé** `sxTForm` l.14343 (préremplies avec ce qui manque ; l'intervention du jour proposée), **Il me manque** `sxManqueVue` l.14380 (écrit une demande dans `DEM_ACHAT` → Achats du bureau).
Ailleurs pour le technicien : raccourci « Mon camion — N articles à remettre à bord » sur **Ma journée** (l.14337) ; **fiche d'intervention** : pièces prévues par le bureau + « Pièces et produits utilisés » (`bxDeclarer` l.15216 : un article du camion posé devient un mouvement à valider), carte **Fluide frigorigène** (`sxCarteFluide` l.14713 : bouteille, kilos chargés, kilos récupérés), « **Il me manque une pièce** » (`pdxPmOuvrir` l.14194 → une tâche « commander » pour le bureau) ; **à la clôture** : « Sortir du stock ce que tu as utilisé ? » (`sxIntProposer` l.14674, cases pré-cochées).

### 1.5 Ce qui se rattache ailleurs (écrans qui LISENT ou ÉCRIVENT ces données)

| Où | Ce qui est lu / écrit | Réf. |
|---|---|---|
| **Accueil** du gérant | carte « Achats à traiter · N » (articles à commander, retards, silences, factures à rapprocher, brouillons) ; ligne « Stock » dans « À faire maintenant » | `pdxAchatsCarte` l.13713, l.14486 |
| **Achats et frais** (Argent) | Demandes de l'équipe → « Transférer 6 kg et commander 4 kg » (lit le stock de l'atelier, écrit une ligne dans une commande), « Tout commander », « Achat en magasin » ; Notes de frais ; budget du mois | `vueAchats` l.17204 (base 9905), `DEM_ACHAT` l.9818 |
| **Comptabilité** | « factures à payer », « achats sans facture » ; une réception de commande / « Ranger le ticket dans les achats » écrit dans `ACHATS` (registre unique que lit la Comptabilité) | l.9805, l.14611 |
| **Tâches** | tâches « commander des pièces » (`TACHES` type `commande`), propositions pour chaque commande qui demande un geste (silence, retard, facture arrivée) | `pdxSuggTaches` l.13726, `tkxBon` l.13505 |
| **Interventions** | pastille « Pièces… » (arrivées/en route/à commander), bandeau « les pièces arrivent après le rendez-vous » + « Décaler l'intervention », pièces prévues (`i.prevues`), `fiche.pieces`, réservations `x.resa` | `pdxPieces` l.13664, `pdxFicheInter` l.13685 |
| **Planning** et **Ma journée** | pastilles « Pièces » | `pdxApres` l.14217 |
| **Devis, contrats, factures, atelier de documents** | le **catalogue** (`CATALOGUE` = articles avec prix de vente, l.8066) : suggestions de lignes, prix repris ; l'atelier (iframe `prototype-documents.html`) reçoit `catalogue` par message `opd_donnees` (l.19470) | l.7226, 7298, 12488 |
| **Véhicules** (Personnel) | `VEHICULES[].lieu` = le lieu-camion ; « articles à bord, N manquent », stock à bord (515 €), tuile « 3 manquent » ; un camion « Au garage » n'est pas réassorti | l.9285, `bxVeh` l.14864 |
| **Clients / Contrats** | une réserve chez un client (`LIEUX.type==='depot'`, `cli`), liée à la visite du contrat | `bxReserveDe` l.15237 |
| **Historique** | chaque geste de stock écrit une ligne (`journalAjout`, type `stock`, `achats`) | l.14313, `bxJ` |
| **Visite guidée, « Tour de l'application », immersion** | des chapitres entiers visent ces écrans PAR SÉLECTEUR CSS | `tourPartie('stock'|'produits'|'boxes')` l.12859-12863 ; `immChap('produits'|'stock'|'boxes')` l.20675, 20698, 20720 (ex. `#contenu .sk-liste`, `#calque .panneau`) |
| **Équipe › droits** | cases « Voir » Stock / Produits / Boxes décident du menu | l.21432 |
| **Recherche** | entrées de recherche du menu | `CATS` |

---------------------------------------------------------------------------------------------------------------------------------

## 2. L'INVENTAIRE COMPLET — ce que ces écrans savent faire (rien de ceci ne doit se perdre en « refaisant »)

Fréquence = mon avis pour une entreprise comme Clim Services 17 (gérant + secrétaire + 4 techniciens, 4 camions, un atelier).
**Q** = utile tous les jours · **H** = chaque semaine · **P** = parfois (mois / trimestre / litige) · **R** = rare ou une fois (démarrage, réglage).
« Verdict » = ce que je ferais de la CAPACITÉ (pas de l'écran) : garder visible, garder rangé, fusionner, ou sortir du chemin.

### 2.1 Stock

| # | Capacité | Où aujourd'hui | Fréq. | Pourquoi / verdict |
|---|---|---|---|---|
| S1 | Où est tel article, combien, dans quel lieu (répartition atelier/camions/réserve sur chaque ligne ; recherche ; puces de lieux) | Stock › ensemble ; Dépôts « Où est… ? » ; fiche article | **Q** | La question n°1 du terrain (« il en reste ? dans quel camion ? »). À garder au premier plan. Existe deux fois (Stock et Dépôts) : à fusionner. |
| S2 | Voir ce qui manque / est à commander (chiffre, filtre « À commander », groupes d'état) | Stock, Produits, Commandes, Accueil | **Q** | Quotidien. Aujourd'hui compté de 4 façons différentes (voir §4 incohérences). |
| S3 | « À faire maintenant » (valider, remettre à bord, commander, compter, bouteille presque vide, pièces prévues absentes) | Stock (4 lignes), Dépôts (6 lignes) | **Q** | La meilleure idée du groupe : l'écran dit quoi faire. Mais écrite deux fois, avec deux mots différents. |
| S4 | Valider les gestes des techniciens (un par un, « Tout valider », refus avec motif, stock restant « il en restera 6 », notification du technicien) | Stock › À valider | **Q** (si la validation est activée) | Cœur du contrôle du gérant. À garder, plus court. |
| S5 | Règle « valider seul ce qu'un technicien a utilisé chez un client » ; interrupteur « Valider les gestes des techniciens » | Stock › À valider (haut de page) | **R** | Ce sont des RÉGLAGES posés au-dessus d'une file de travail. Réglages : à ranger dans les Paramètres/le menu « ⋯ » du Stock. |
| S6 | Réassort des camions selon leur dotation (liste par camion, cases, « Transférer tout », ce que l'atelier n'a plus part dans les commandes) | Stock (bouton + lignes du bandeau), Dépôts, fiche lieu, Accueil | **H** | Gros gain de temps du lundi matin. À garder en 2 taps. Un camion au garage est exclu du compte mais PAS du bandeau de Stock (§5). |
| S7 | Transfert entre lieux (atelier → camion, camion → camion, → réserve) | Stock › Transfert ; fiche lieu ; fiche article | **Q** | Quotidien (souvent via S6 ou via « J'ai pris » du technicien). |
| S8 | Sortie « pour qui ? » (utilisé chez un client, donné à un collègue, cassé, perdu) + **bon de remise** BR-2026-0NN (document) | Stock › Sortie ; fiche lieu ; fiche article | **P** (sortie client : **Q**) | Le bon de remise est unique et utile (preuve de qui a reçu quoi). Le formulaire est trop long : De, Pour qui, Pourquoi, Sur quelle intervention, Ajouter un article. |
| S9 | Entrée directe sans commande (acheté au comptoir, retour de chantier, retour d'un collègue) + « Ranger le ticket dans les achats » | Stock › Entrée (ajouté le 11/11) | **Q** | Très fréquent (courses au comptoir). À garder ; le lien vers la compta est précieux. |
| S10 | Journal des mouvements : filtres (type, lieu, période, personne), recherche (article, personne, client, bon), valeur, « cassé ou perdu », export PDF/CSV | Stock › Mouvements | **P** | Utile en cas de litige/écart, pas tous les jours. Garder, rangé. |
| S11 | Annuler un geste (« photo du stock avant », bouton Annuler sur le toast et dans Mouvements) | partout (`sxToast`, `sxAnnule` l.14282) | **P** | Rassure énormément un public peu à l'aise : à garder PARTOUT. |
| S12 | Inventaire d'un lieu : écart par ligne, valeur de l'écart, « Tout est juste », par catégorie, date du dernier comptage, rappel tous les 90/180 jours | Stock › Inventaire ; Dépôts › Compter ; fiche lieu | **P** (2-4 fois par an) | Existe 3 fois (onglet, panneau Dépôts, fiche lieu). À une seule porte. |
| S13 | Valeur du stock (prix d'achat HT), valeur par lieu, valeur des camions | KPI Stock/Produits, tuiles lieux | **P** | Utile pour le bilan, pas à l'ouverture. |
| S14 | Dotation d'un camion (ce qu'il doit toujours avoir) : modifier, copier celle d'un autre | fiche lieu › Modifier la dotation | **R** | Réglage : une fois par camion. Doit rester facile (le réassort en dépend). |
| S15 | **Fluides frigorigènes** : bouteilles (capacité, poids restant, lieu, état Pleine/Entamée/Vide à rendre), kilos chargés par intervention, kilos récupérés (bouteille de récup.), **registre des fluides** exportable (obligation réglementaire en clim) | fiche article « Fluide… », carte Fluide de l'intervention, Registre | **Q** (clim) / **P** (registre) | Spécifique au métier, juridique. Le registre est aujourd'hui introuvable depuis le menu (3 taps, dans la fiche d'un article). |
| S16 | Sortir du stock à la clôture d'une intervention (pièces cochées d'office, rien ne sort tout seul) | clôture d'une intervention | **Q** | Évite l'oubli ; à garder. Troisième chemin vers la même sortie (voir §3.5). |
| S17 | Statistiques d'usage d'un article (« tu en utilises ≈ 2 par semaine », « de quoi tenir 5 semaines ») | fiche article | **P** | Aide à fixer l'alerte ; alimente les quantités des commandes. |
| S18 | Alerte de lieu jamais compté / bouteille presque vide / camion sous dotation / pièces prévues absentes | bandeaux | **Q** | Les alertes sont bonnes ; leur présentation (bandeaux de 6 lignes) est lourde. |

### 2.2 Fournisseurs, matériel & produits

| # | Capacité | Où | Fréq. | Pourquoi / verdict |
|---|---|---|---|---|
| P1 | Liste des articles rangés par métier › catégorie, avec état, stock · alerte, prix de vente HT, marge | Produits › articles | **Q** | Le catalogue. Trop de filtres empilés au-dessus (§4). |
| P2 | Recherche (sans accent, tous les mots, nom/référence/fournisseur) | idem | **Q** | À garder, et à rendre première. |
| P3 | Fiche article : tout l'article en un panneau (prix d'achat/vente, marge, TVA, utilisé N fois, où il est, prix chez d'autres fournisseurs, bouteilles, derniers mouvements, conseil de prix, courbe) | prFiche | **H** | Dense mais utile ; hiérarchiser. |
| P4 | Ajouter un article, avec **rangement automatique** (« tape le nom, il se range tout seul », unité qui suit), contrôle de doublon, vente à perte | ＋ Ajouter | **P** (démarrage : **Q**) | Atout fort pour un novice. À garder. Le formulaire est long : 11 champs. |
| P5 | **Produit** (avec prix de vente : part sur devis/factures) vs **Matériel** (sans prix de vente : outillage, EPI, jamais facturé) | tout l'écran | **Q** | Concept central, mal nommé (« Matériel & produits », « Produit facturé / Matériel de l'équipe / Prix à compléter »). À rendre évident par un seul choix « Je le vends au client : oui / non ». |
| P6 | Catalogue des devis/factures/interventions tiré de cette liste (un prix changé ici = prix du prochain devis) | `CATALOGUE` | **Q** (invisible) | **À ne pas casser** (§3.3). |
| P7 | Le rangement par métier (24 métiers, 285 catégories, 5 056 produits typiques, « essayer le rangement ») | bouton en-tête | **R** | Information de référence TEAM OP, pas un geste du client : le sortir du haut de l'écran. |
| P8 | Filtres : métier, catégorie, 7 états, 4 tris | barre | **P** | Trois rangées de filtres pour 29 articles. À réduire à : recherche + un seul filtre d'état. |
| P9 | Hausses d'achat signalées (↑ 7,9 %), prix chez d'autres fournisseurs et « passer chez lui », marge | liste/fiche | **P** | Utile pour la marge ; à garder discret. |
| P10 | Retirer un article (avec avertissement s'il reste du stock/une commande), annuler | fiche | **R** | |
| P11 | « Prix à compléter » (articles préparés sans prix) + « N articles attendent leur prix » | bandeau | **R** (démarrage) | |
| F1 | Cartes fournisseurs avec délai réel moyen, % livré à l'heure, € commandé ce mois, alertes | Fournisseurs | **P** | Beau, mais ce ne sont pas des gestes ; le gérant veut surtout « commander chez lui ». |
| F2 | Choisir ses fournisseurs dans l'annuaire du métier (180 entreprises, « ＋ Le mien »), ou en ajouter un local | « Choisir mes fournisseurs », « ＋ Ajouter un fournisseur » | **R** | Démarrage. |
| F3 | Fiche fournisseur : compte client, e-mail des commandes, remise, délai, franco, port, heure limite, paiement, relance automatique ; ses catégories, ses articles | fournFiche | **R** | Réglage, mais l'e-mail des commandes conditionne l'envoi : à rendre évident quand il manque. |
| F4 | **Préparer mes articles** : cocher les produits typiques d'un fournisseur → articles créés rangés, sans prix | fournPreparer | **R** (démarrage) | Précieux pour amorcer le catalogue. |
| F5 | **Importer un fichier de tarifs** CSV (colonnes reconnues, marges gardées) | fournTarifs | **P** | Utile mais vocabulaire technique (« CSV », « FAB-DIS »). |
| F6 | **Lire une facture fournisseur** (photo/PDF lu par l'IA : stock +, prix d'achat à jour, hausse signalée ; rapproche la commande ouverte) | fournFacture | **H** | Très forte valeur : quasi aucun concurrent. Aujourd'hui un petit raccourci parmi 4. |
| C1 | **À commander** : un panier par fournisseur (articles au seuil + pièces des interventions), quantité calculée (consommation 8 semaines, délai, seuil), franco de port (barre + « bientôt sous le seuil »), moins cher chez un autre | Commandes | **Q-H** | Le cœur « intelligent » demandé par Justin le 6/11. |
| C2 | « Préparer la commande » / « Tout préparer · N commandes » / « Nouvelle commande » | idem | **H** | |
| C3 | Bon de commande : lignes, totaux, livraison (atelier / comptoir / chantier), date souhaitée, note, aperçu PDF, brouillon, envoi par e-mail avec PDF | cmdEdVue | **H** | |
| C4 | Suivi : 5 étapes (À commander → Envoyée → Confirmée → Reçue → Facturée), journal par commande, filtres À traiter / En cours / Terminées / Toutes, recherche | table | **H** | |
| C5 | Alertes retard / silence + relance écrite (une, groupée, automatique) | table, fiche | **P** | Très apprécié pour ne pas oublier un fournisseur. |
| C6 | Confirmation du fournisseur (n° de commande fournisseur) | fiche | **P** | |
| C7 | **Réception** : par ligne, partielle, bon de livraison, reliquat suivi avec sa date, où ranger, met de côté pour une intervention | cmdReception | **H** | |
| C8 | **Rapprochement de la facture** (écarts de prix/quantité, accepter → prix d'achat suit et marge gardée ; contester → e-mail prêt) | cmdRappro | **P** | |
| C9 | Recommander à l'identique, annuler, « Ce que voit le fournisseur » (portail, simulé) | fiche | **R** | Le portail fournisseur est une démonstration, pas un geste. |
| C10 | Pièces d'une intervention qui passent en tête, et « le délai arrive après le rendez-vous : décaler l'intervention » | paniers, Interventions | **Q** | Lien fort avec le terrain. |

### 2.3 Dépôts et camions

| # | Capacité | Où | Fréq. | Verdict |
|---|---|---|---|---|
| D1 | Cartes des lieux (4 camions, atelier, réserves chez clients) : articles, valeur, « N à remettre à bord » / « Dotation complète », dernier mouvement, dernier comptage | Dépôts | **Q** | Le gérant regarde « mes camions sont-ils prêts ? ». |
| D2 | Fiche d'un lieu : ce qu'il contient trié par manque, dotation, chercher, ＋ Ajouter, transférer, derniers mouvements, conducteur + plaque | bxFiche | **Q** | |
| D3 | « À faire maintenant » 6 lignes | Dépôts | **Q** | Doublon de S3. |
| D4 | « Avant les visites » : pièces prévues par le bureau sur les interventions des 3 prochains jours, comparées à ce que chaque camion a vraiment | bxBesoins l.14894 | **Q** | Très utile : « Sophie n'aura pas son condensateur demain ». |
| D5 | Compléter un camion / réserve (cases, annuler) | bxTransferts | **H** | |
| D6 | Réserve chez un client (3D, contrats : filtres laissés sur place, lien à la visite) : créer, kit de départ, modifier, fermer/rouvrir | Nouvelle réserve | **R** | Spécifique 3D / contrats d'entretien. À garder sans l'imposer à la clim. |
| D7 | Camion au garage : réassort reporté, « compléter quand même », retour du garage propose de compléter | bxGarage | **P** | |
| D8 | Rôles par lieu (responsable, accès) | Modifier | **R** | |
| D9 | Chercher « Où est… » dans tous les lieux | Dépôts | **Q** | Doublon de S1. |

### 2.4 Technicien (« Mon camion » et alentours)

| # | Capacité | Fréq. | Verdict |
|---|---|---|---|
| T1 | **J'ai pris à l'atelier** (préremplie avec ce qui manque, « Je l'ai pris » ligne par ligne) → part au bureau | **Q** | Très bon : 2 taps. |
| T2 | **J'ai utilisé** (sur mon intervention, pré-choisie) | **Q** | Bon. Trois chemins vers la même chose (Mon camion, clôture, pièces de la fiche). |
| T3 | **Il me manque** (article du catalogue ou texte libre, combien, pour quand, pourquoi) → demande dans Achats du bureau | **H** | Bon. |
| T4 | Voir ce qu'il y a à bord vs dotation (✓ / manque), « Il manque à bord » | **Q** | |
| T5 | Mes envois : en attente / validé / refusé + motif, « Retirer » | **Q** | Rassurant (on sait si le bureau a vu). |
| T6 | Messages du bureau en haut de l'écran (notifications) | **Q** | Mélangé à l'écran camion alors que ce n'est pas du matériel. |
| T7 | Fluide : bouteille, kilos chargés/récupérés (dans la fiche d'intervention) | **Q** (clim) | |
| T8 | « Il me manque une pièce » depuis l'intervention → tâche de commande pour le bureau | **H** | |
| T9 | Raccourci sur Ma journée « Mon camion — N articles à remettre à bord » | **Q** | |

---------------------------------------------------------------------------------------------------------------------------------

## 3. LE MODÈLE DE DONNÉES — et ce qu'on ne doit pas casser

⚠️ Il n'y a pas de base : tout est en mémoire, en variables globales du script (données fictives de « Clim Services 17 »). Les noms ci-dessous sont ceux du code ; une refonte garde ces structures (ou les migre) parce que 20 autres écrans les lisent (compte des occurrences dans le fichier : `PRODUITS` 140 lignes, `stkAt(` 81, `LIEUX` 50, `MES_FOURN` 50, `VEHICULES` 43, `MVTS` 54, `DEM_ACHAT` 29, `prCatalogueMaj(` 27, `lieuManques(` 17, `enCommande(` 17).

### 3.1 Les tables

| Table (variable, ligne) | Champs | Remarques / pièges |
|---|---|---|
| **PRODUITS** (l.8032) : un article | `id`, `p` (métier/pack), `cat`, `nom`, `ref`, `u` (unité), `pa` (achat HT), `pv` (vente HT ; **vide = matériel de l'équipe**), `tva`, `four` (**NOM** du fournisseur, pas son id), `q` (stock TOTAL), `seuil`, `o` (ordre dans le catalogue des devis), `loc` {lieu → quantité hors atelier}, `offres` {fournisseur → prix d'achat}, `paAvant`, `ac` (« prix à compléter »), `retire`, `resa` [{inter, q}] (mis de côté pour une intervention) | `q` est le total ; **l'atelier = `q` − Σ `loc`** (`stkAt` l.9048) : pas de ligne « atelier » stockée. `four` est un nom libre : renommer un fournisseur orpheline ses articles (`foArticles` compare `x.four === f.nom`). La nature « produit / matériel » se déduit de `pv` (`prVend` l.8063), pas d'un champ. |
| **PACKS** (l.8005) | 24 métiers → `nom`, `ic`, `cats` [{`n`, `t` (p produit / m matériel / x les deux), `q`, `k` mots-clés, `ex` [[nom, unité]]}] | 285 catégories, 5 056 produits typiques (lecture seule, « fixé par TEAM OP »). `PACKS_ENT` (l.8029) = les métiers de l'entreprise (réglage de la Tour). `prRanger` (l.8022) = le rangement automatique. |
| **CATALOGUE** (l.8066) | [[nom, prix de vente]] | **dérivé** de PRODUITS (articles avec `pv`, non retirés, des métiers de l'entreprise) ; `prCatalogueMaj()` le remet à jour **en place** (les écrans le lisent par référence). 27 appels dans le fichier : tout geste qui change un nom/prix/retrait/stock doit l'appeler. |
| **MES_FOURN** (l.8225) | `id`, `dir` (id annuaire), `nom`, `packs`, `compte`, `mail`, `tel`, `delai`, `dj` (délai en jours, 0 = comptoir), `remise`, `franco`, `port`, `paiement`, `tarifsLe`, relance auto | **FOURN_DIR** (l.8219) = annuaire TEAM OP, 180 entreprises, lecture seule. |
| **COMMANDES** (l.8581) | `id`, `num` (BC-2026-0NN), `four` (nom), `st` (brouillon / envoyee / confirmee / partielle / recue / facturee / annulee), `lignes` [{`pid`, `q`, `pu`, `recu`, `tva`, `nom`, `ref`, `inter` (id de tâche), `rupture`}], `env`, `cree`, `conf` {le, num}, `prevue`, `recue`, `reliquat`, `fac`, `facLue` {num, pu, q}, `contestee`, `pour` (id intervention), `liv` (atelier / comptoir / chantier), `note`, `lien` (portail), `journal` [[date, texte]] | Statuts lus par `CMD_ST` (l.8577), `cmdOuverte` (l.8596), `enCommande(x)` (l.8598 : quantité attendue d'un article), `cmdAlerte` (l.8603 : retard / silence / facture). |
| **LIEUX** (l.9016) | `id`, `nom`, `type` (atelier / vehicule / depot), `resp`, `tech` (conducteur), `dot` (clé de DOTATION) ou `dotP`, `cli` (client d'une réserve), `note`, `adr`, `acces`, `ferme` | Les camions sont reliés à `VEHICULES[].lieu` (`bxVeh` l.14864). Le « technicien » d'un camion = `tech` (une seule personne par camion). |
| **DOTATION** (l.9023) | clé (`clim`, `plomb`, `dot-<lieu>`) → {id article → quantité cible} | `lieuManques`/`bxManques` = dotation − stock du lieu. |
| **MVTS** (journal, l.9029) et **MVTS_ATT** (en attente, l.9041) | `id`, `d`, `h`, `type` (entree / sortie / transfert / correction), `pid`, `q`, `de`, `vers`, `qui`, `pourQui`, `motif`, `inter`, `bc` (commande), `br` (bon de remise), `valPar`, `bout` (bouteille), `equip` | **`stkAppliquer(m)` (l.9051, réaffectée l.14264) est LA SEULE porte qui change une quantité** ; elle plafonne à ce qui est là. La trace dit ce qui a vraiment bougé. |
| **SX** (l.14236) | `bout` [{id, pid, cap, reste, lieu, rec}] (bouteilles de fluide), `reg` (registre des fluides), `refus` (refus motivés), `invs` (date du dernier comptage), `freq` (fréquence de comptage par lieu), `autoUsage`, filtres | état du lot « stock » du 11/11. |
| **BX** (l.14852) | état d'écran des Dépôts (recherche, fiche ouverte, cases du réassort, comptage en cours) | |
| **DEM_ACHAT** (l.9818) | demandes d'achat de l'équipe : `qui`, `quoi`, `q`, `u`, `pid`, `pourquoi`, `est`, `quand`, `etat` | écrites par « Il me manque » (technicien) ; lues par Achats (bureau). |
| **ACHATS** | écritures d'achat que lit la Comptabilité (« un seul registre ») | écrite par la réception d'une commande, « Ranger le ticket… ». |
| **INTS[].prevues** / **FICHES[id].pieces** | pièces prévues par le bureau / posées par le technicien (par NOM de produit, pas par id) | reconnues par `pdxMemeArticle` (l.13635) / `sxReconnu` (l.14664) : rapprochement par texte → fragile (« Condensateur 5 µF » ≈ « Condensateur permanent 5 µF 450 V »). |
| **TACHES** (type `commande`) | `pieces`, `four`, `inter`, `etat` (acommander / commandee / recue) | écrites par « Il me manque une pièce » (`pdxPmEnvoyer` l.14203) ; fermées toutes seules (`pdxTachesSync`). |

### 3.2 D'où vient chaque chiffre affiché

| Chiffre | Formule | Où |
|---|---|---|
| Valeur du stock (2 306,50 €) | Σ `pa` × max(0, `q`) sur les articles non retirés (un article sans `pa` compte 0) | Stock, Produits |
| Dans les N camions (515 €) | Σ `lieuValeur(camion)` = Σ `pa` × `stkAt(x, camion)` | Stock, Véhicules |
| **« à commander » (5)** | `cmdNbACommander()` = nombre de LIGNES de paniers = pièces demandées par des interventions + `aCommander()` (articles dont `q` − réservé + en commande ≤ `seuil`, `seuil` > 0) | Stock, Produits, Commandes, Accueil |
| **« À commander · 3 »** (puce/groupe) | `prEtat` : `q` ≤ `seuil` ET rien en commande ET `q` > 0 — **un article à 0 est « Épuisé », même s'il est dans le panier** | Produits, Stock |
| Commandes (badge 2) | `cmdDansFiltre(c,'traiter')` : brouillons + alertes (retard, silence, facture) | onglet Commandes |
| En cours (3 · 509,20 €) | commandes envoyée/confirmée/partielle | Commandes |
| Commandé en octobre | Σ HT des commandes envoyées ce mois | Commandes |
| Réassort · 6 | Σ `bxManques` des camions non fermés **et pas au garage** | Stock, Dépôts |
| « N articles » d'un lieu | `lieuArticles` = articles avec `stkAt` > 0 | cartes lieux |
| 94 % livré à l'heure, délai réel moyen | calculés sur les commandes reçues de ce fournisseur | cartes fournisseurs |
| Marge % | (`pv` − `pa`) / `pv` | liste, fiche |
| « tu en utilises ≈ 0,5 par semaine » | sorties des 8 dernières semaines / 8, sinon `PR_CONSO` (table de démonstration, l.8571) | fiche, quantités des commandes |
| Quantité proposée à la commande | `cmdSuggere` l.8613 : de quoi tenir 2 semaines, jamais sous le seuil, plus ce que les interventions demandent | paniers |

### 3.3 Fonctions et objets PARTAGÉS avec d'autres écrans (à ne pas casser)

1. **`stkAppliquer`, `stkAt`, `stkPoser`, `stkR`** : toute quantité. Appelées aussi par Achats (« Transférer 6 kg et commander 4 kg »), Interventions (clôture), la réception de commande (`cmdReceptionner` → `stkJournalEntree` l.9062), la lecture d'une facture (`foFactureValider`).
2. **`prCatalogueMaj()` / `CATALOGUE` / `prixCatalogue`** (l.12488) : Devis, interventions, factures, atelier de documents (message `opd_donnees`, l.19470).
3. **`cmdFiche`, `cmdPreparer`, `cmdReception`, `cmdRappro`, `pdxAller`** : ouvertes depuis Tâches, Accueil, Interventions, Achats, la fiche d'un fournisseur. Leurs identifiants de bouton (`data-cm`, `data-ce`, `data-fo`, `data-pr`, `data-sk`, `data-sx`, `data-bxl`, `data-pdx`) sont appelés depuis d'autres écrans.
4. **`enCommande`, `aCommander`, `cmdPaniers`, `cmdNbACommander`, `cmdAlerte`** : Accueil (« Achats à traiter »), menu (pastilles), Tâches.
5. **`lieuManques`, `bxManques`, `bxVeh`, `LIEUX`, `VEHICULES[].lieu`** : Véhicules, Ma journée, Planning (pastilles de pièces).
6. **`pdxPieces`, `pdxFicheInter`, `pdxApres`, `pdxPmOuvrir`, `bxDeclarer`, `sxCarteFluide`, `sxIntProposer`** : fiche d'intervention, planning, clôture.
7. **`ouvrirPanneau`, `foOuvrir`, `foGarder`, `foRefocus`, `toast`, `journalAjout`, `notifier`, `esc`, `eur`, `eur0`, `foNum`** : briques communes.
8. **Contrats DOM** : « Tour de l'application » (`tourPartie` l.12859-12863) et « immersion » (`immChap` l.20675-20745) visent ces écrans PAR SÉLECTEUR : `#contenu .sk-liste`, `.sx-afaire`, `.sk-lieux`, `.bx-c`, `.bxl-af`, `.pr-vues`, `.pr-pack`, `.pr-pack .pr-l`, `[data-sk="reassort"]`, `[data-sk="fok"]`, `[data-pr^="nouveau|"]`, `[data-pr="garder|"]`, `[data-cm^="recep|"]`, `[data-bxl^="ou|"]`, `[data-bxl="nou"]`, `[data-bxl-ou]`, `#bxl-rok`, `.fo-fc:has([data-cm="preparer|Sanitaire Pro 17"])`, `#calque .panneau`. Une refonte qui renomme ces classes casse la visite guidée sans erreur visible : à refaire dans le même lot.
9. **Menu / droits** : routes `stock`, `produits`, `boxes`, `moncamion` (clés inchangées exigées par MENU-FINAL), cases « Voir » d'Équipe (l.21432), `ROLES.*.routes` (l.11154).
10. **Monkey-patching** : `vueStock`, `vueBoxes`, `prFiche`, `lieuFiche`, `stkFormVue`, `stkAppliquer`, `mvLigne`, `ACTIONS.terminer`, `ACTIONS.pieceAjout`… sont réaffectées par plusieurs lots. En refaisant, il faut remplacer la chaîne ENTIÈRE par une seule définition par fonction, sinon l'ancienne survit sous la nouvelle (cf. `bxMonCamion`, code mort).

---------------------------------------------------------------------------------------------------------------------------------

## 4. CE QUE JE VOIS — captures et critique honnête

Captures (toutes dans `/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/materiel/`) : pour chacun des écrans, `<écran>-<mac|iphone|ipad>-<jour|nuit>-marc.png`
(écrans : `stock-ensemble`, `stock-mouvements`, `stock-inventaire`, `stock-valider`, `produits-articles`, `produits-commandes`, `produits-fournisseurs`, `boxes`, `vehicules`, `achats`) ;
`moncamion`, `majournee`, `techfrais` en iPhone jour/nuit (`-sm.png`) ; les fenêtres : `p-<fenêtre>-<profil>-<jour|nuit>-marc.png` (30 fenêtres × mac jour/nuit, iPhone jour/nuit, iPad jour) et `t-<fenêtre>-iphone-<jour|nuit>-sm.png`
(technicienne) ; les écrans de RÉFÉRENCE validés par Justin : `ref-devis`, `ref-clients`, `ref-interventions` (mac, iphone, ipad, jour et nuit). `-pleine.png` = page entière.
Mesures chiffrées : `mesures.txt`, `mesures2.txt`, `mesures3.txt`, `gestes.txt`, `taches.txt`, `txt-*.txt` (même dossier).

### 4.0 Ce que Justin a validé, mesuré sur les captures de référence (Devis, Clients, Interventions)

Un modèle simple, reconnaissable : **un surtitre (le groupe) · un grand titre · AU PLUS une courte phrase · UNE action principale en noir (en haut à droite pour Clients et Interventions) ·
une seule rangée de 3-5 onglets · puis des cartes aérées ou un tableau lisible · au plus un bandeau, écrit comme une tâche** (« 2 tâches pour toi aujourd'hui »).
La première ligne de données arrive à ~0,3 écran du haut (Clients, Interventions) et ~0,45 (Devis) sur Mac. Les chiffres du haut (Devis) sont 4 tuiles et PAS un bandeau + des raccourcis + des filtres en plus.
Les mots sont ceux du métier (« Dicter un devis », « À envoyer », « En attente », « Acceptés »).

### 4.1 Les trois écrans, mesurés contre ce modèle (Mac 1440×900 / iPhone 390×844)

| Écran | Hauteur de page | 1ʳᵉ ligne de données | Éléments cliquables AVANT la 1ʳᵉ ligne | Total cliquable |
|---|---|---|---|---|
| Devis / Clients / Interventions (référence) | < 1 écran | ~0,3 à 0,5 écran | ~8-12 | ~15-25 |
| **Stock › Vue d'ensemble** | 3 310 px (iPhone 4 701) | **1,3 écran** (iPhone **2,8 écrans**) | **33** (iPhone 35) | 62 |
| **Produits › Matériel & produits** | 3 761 px (iPhone 6 274) | 1,0 écran (iPhone **2,1 écrans**) | **24** (iPhone 26) | 53 |
| Produits › Commandes | 1 961 px | 0,5 écran | 7 | 30 |
| Produits › Fournisseurs | 1 153 px | 0,2 écran | 4 | 18 |
| **Dépôts et camions** | 1 985 px (iPhone 3 569) | 1,0 écran (iPhone **1,9**) | 9 | 19 |
| Stock › Mouvements | 1 531 px | 0,5 écran | 12 | 29 |

(`mesures.txt`, lignes `DENS`.) Autrement dit : sur Stock et sur Produits on traverse **trente éléments avant de toucher la première donnée**, alors que Justin a validé des écrans où la première donnée est là, sous le titre.

### 4.2 Critique écran par écran — pourquoi quelqu'un dirait « c'est moche et c'est mal fait »

**STOCK › Vue d'ensemble** (`stock-ensemble-*`) — *trois écrans empilés en un.*
1. **Hiérarchie** : tout a le même poids. En-tête (4 boutons dont un noir « Réassort… · 6 »), 4 onglets, un grand bandeau de 4 lignes + « 5 autres choses… », 4 tuiles chiffrées, 6 tuiles de lieux, 6 puces de lieux + un lien « Gérer les lieux › », 3 boutons de filtre + une recherche, ENFIN la liste. Aucun de ces blocs ne dit « commence ici ». Le noir est donné à « Réassort des camions » (une action hebdomadaire) pas à « il en reste ? » (la question de tous les jours).
2. **Les lieux sont montrés trois fois** (tuiles, puces, répartition sur chaque ligne d'article : `Atelier 5 · Sophie 2 · Karim 3 · Réserve Hôtel 4`) : 8 boutons mentionnent « Sophie » sur la seule page. Sur un téléphone ces tuiles prennent 3 écrans de haut avant la 1ʳᵉ ligne d'article (2 331 px).
3. **Le bandeau « À faire maintenant »** est la meilleure idée de l'écran, mais il s'écrit en phrases longues et techniques (« Le camion de Sophie a 3 articles sous sa dotation ») avec la liste des articles en petit gris, et ses boutons mentent ou se répètent : « Valider » n'EXÉCUTE pas la validation (il ouvre l'onglet, il faut ensuite « Tout valider » : 3 gestes) ; « Réassort » ×3 (un par camion) à côté du gros « Réassort des camions · 6 » du haut.
4. **Mots** : « dotation », « réassort », « sous sa dotation », « à remettre », « Sur commande » à côté de « Commandé » (deux sens différents, voir §5), « alerte à 3 », « mouvements », « Entrée / Sortie / Transfert » (trois verbes de comptable pour ce qu'un artisan appelle « j'en ai pris », « j'en ai rangé », « je les ai mis dans le camion »).
5. **Chiffres** : 4 tuiles dont deux sont des filtres (515 € « dans les 4 camions », « 5 à commander › ») et une un lien vers un AUTRE onglet d'une AUTRE rubrique (Commandes) ; la valeur du stock (2 306,50 €) est le chiffre le moins utile du jour mais le premier et le plus gros.
6. **Alignement / typographie** : « 1724 € » (sans espace) dans Dépôts/Inventaire contre « 1 724 € » dans la tuile du Stock ; noms d'articles soulignés en pointillé dans Mouvements (on croit à un lien, c'en est un seulement par endroits) ; 29 lignes affichées d'un coup, sans plafond ni regroupement (« En stock · 21 » est un tas de 21 lignes dont personne n'a besoin).
7. **Couleurs** : 5 couleurs de pastilles d'état (rouge, orange, bleu, vert, gris) + pastilles « À valider / À remettre » rouges et orangées + liseré orange « 3 à remettre à bord » sur les tuiles + vert « dotation complète » : l'œil ne sait pas ce qui est grave. De nuit tout est lisible mais plus plat (les tuiles de lieux se fondent dans le fond).
8. **Comparé à Devis / Clients** : eux ouvrent sur le travail (une liste, un onglet, un bouton) ; Stock ouvre sur un tableau de bord.
→ À chercher et qu'on ne trouve pas : « le registre des fluides » (obligation légale, enfoui dans la fiche d'un article de fluide), « le bon de remise », « la valeur du stock par lieu », « changer la dotation d'un camion » (dans la fiche du lieu, 3 gestes).

**STOCK › Mouvements / Inventaire / À valider** (`stock-mouvements-*`, `stock-inventaire-*`, `stock-valider-*`)
- *Mouvements* : 3 filtres + 1 recherche AVANT le journal (4 champs empilés ; sur iPhone la 2ᵉ ligne coupe « Toutes les personnes » à « Toutes les perso… » ; la barre d'onglets du bas recouvre déjà la 1ʳᵉ ligne). Chaque ligne affiche 5 informations sur 3 niveaux, avec un montant en € (valeur) que personne n'a demandé alignée à droite. Aucune ligne « de quoi parle-t-on ? » (« Condensateur 5 µF −1 u » est correct, « Raccord à sertir 16 mm −2 u / Camion de Tom · Inventaire (Camion de Tom) : 2 de moins que prévu » répète le lieu deux fois).
- *Inventaire* : un onglet qui s'ouvre sur UNE phrase et six tuiles « jamais compté » en orange, puis un écran de saisie ligne à ligne. Correct, mais l'onglet occupe une place de premier niveau pour un geste qui se fait 2 à 4 fois par an, et il existe aussi dans Dépôts (« Compter ») et dans la fiche du lieu (« Compter ») : TROIS portes.
- *À valider* : l'écran du jour du gérant est le 4ᵉ onglet, le moins visible (sur iPhone « Valider 2 » est coupé à droite : la barre d'onglets fait 363 px dans une colonne de 356, 326 sur Android, 286 sur petit téléphone — `mesures` `coupés`). Au-dessus de la file de travail, deux RÉGLAGES : une phrase d'explication avec une case « Valider les gestes des techniciens » mal alignée sur sa ligne (case et phrase pas sur la même base), puis une carte « Valider seul ce qu'un technicien a utilisé chez un client » (long libellé de 2 lignes). Un réglage rare au-dessus d'un travail quotidien. Les lignes elles-mêmes sont bonnes (« Il y a 8 aérosols à l'atelier : après validation, il en restera 6 » est exactement le bon langage).

**FOURNISSEURS, MATÉRIEL & PRODUITS › Matériel & produits** (`produits-articles-*`) — *un tableau de bord de démarrage qui reste affiché pour toujours.*
1. Avant le premier article, dans l'ordre : 2 boutons (dont « Le rangement par métier », une page de référence), 3 onglets, 4 tuiles (dont « 3 métiers : Climatisation · Chauffage · Plomberie » : une information que l'on connaît), un grand bandeau « NOUVEAU — Choisis tes fournisseurs » (2 boutons), 4 cartes-raccourcis (Mes fournisseurs, Importer un fichier de tarifs, Lire une facture, Commandes), 4 puces de métier + une recherche, 6 puces d'état + un tri. **24 éléments, un écran entier.**
2. Le bandeau « NOUVEAU » est faux : il reste affiché alors que l'entreprise a 5 fournisseurs (la condition ne regarde que les fournisseurs de l'annuaire, `!nDir`, voir §5). Un bandeau de bienvenue qui ne s'éteint jamais est du bruit.
3. **Les mêmes mots désignent des choses différentes ou plusieurs mots désignent la même** : le titre dit « Fournisseurs, matériel & produits » ; l'onglet dit « Matériel & produits » (iPhone : « Produits ») ; chaque article est « Produit facturé », « Matériel de l'équipe » ou « Prix à compléter » ; la tuile dit « 25 produits, 4 matériel » ; un 3ᵉ onglet, « Fournisseurs », contient aussi ce que le bandeau appelle « Mes fournisseurs ». Un artisan ne sait pas s'il cherche « un produit », « du matériel » ou « une pièce ».
4. La liste est correcte (une carte par métier, des catégories en bleu, état + stock + prix à droite) mais : l'ordre « par rangement de métier » met « Kit cassette 4 voies » (890 €, jamais en stock) avant le « Fluide R32 » que l'on utilise tous les jours ; pas de photo ; pas de quantité modifiable sur la ligne ; chaque ligne affiche 7 informations. Deux niveaux de regroupement (métier › catégorie) pour 29 articles.
5. 3 rangées de filtres pour 29 articles (métier, catégorie, état + tri + recherche) ; les trois codes couleur d'état (« En stock », « Commandé », « Épuisé », « Sur commande », « À commander ») reprennent ceux du Stock (même liste de 5), donc on regarde deux fois la même liste dans deux rubriques.
6. Bon : la recherche, le rangement automatique à la création, les prix partout cohérents avec le devis. Mauvais : le prix de vente affiché sans le prix d'achat sur la ligne alors que « marge 39 % » est là (on devine le reste).

**… › Commandes** (`produits-commandes-*`) — *c'est le meilleur écran du groupe, et il est presque trop dense pour un novice.* Un panier par fournisseur avec la barre du franco de port, des quantités calculées, « moins cher chez… », « Préparer la commande » : très « intelligent » (demande de Justin du 6/11). Mais : phrases longues en petit gris (« en stock 0 · alerte à 3 · 2 pour l'intervention, le reste remonte ton stock (tu en utilises ≈ 0,1 u par semaine · livré en 1 j · de quoi tenir 2 semaines) » : 150 caractères par ligne), mots d'acheteur (« franco de port », « reliquat », « rapprocher », « seuil »), quatre tuiles dont une (« 1 121,20 € commandé en octobre ») sans action, puis un second bloc « Suivi des commandes » avec 4 onglets, une recherche, un gros bouton noir de relance et un tableau. C'est deux écrans en un (« à commander » / « suivi »). Le bouton « Préparer la commande » est noir ×3 : trois boutons principaux identiques au même niveau.

**… › Fournisseurs** (`produits-fournisseurs-*`) — des cartes propres, mais pleines de chiffres de statistique (délai réel moyen en jours à une décimale, % livré à l'heure, € commandé ce mois) pour le seul geste qu'on vient faire (« commander chez lui » / « lui écrire »). Tous cinq sont étiquetés « Fournisseur local » alors que le gérant n'a pas de « fournisseur non local » : c'est le jargon de l'annuaire. Le bouton noir « Commander · 2 articles » n'apparaît que pour 3 fournisseurs sur 5, le noir change de place d'une carte à l'autre. Le coin gauche des cartes laisse un vide sous les petites (Daikin, Frigo) sur grand écran.
**La fiche d'un fournisseur** (`p-four-fiche-*`) : 13 champs (compte, e-mail, remise, **deux** champs de délai — un texte « livré sous 24 h » ET un nombre de jours —, franco, frais de port affichés « 12.5 » avec un point, heure limite, paiement, contact, téléphone, case de relance automatique), vocabulaire d'acheteur professionnel (« franco », « remise sur le prix public »). Complet, mais c'est un formulaire de comptable.
**Les fenêtres d'import** (`p-four-tarifs-*`, `p-four-facture-*`) : « CSV, séparé par des points-virgules, des virgules ou des tabulations », « Excel (.xlsx) et FAB-DIS : dans l'application » : phrases qui s'adressent à un informaticien. Mais l'idée « photographie ta facture » est la plus forte du groupe, et elle est présentée comme 1 carte sur 4.

**DÉPÔTS ET CAMIONS** (`boxes-*`) — *le même tableau de bord que le Stock, une seconde fois.*
1. Un bandeau « À FAIRE MAINTENANT · 6 » (6 lignes de 2 niveaux : sur iPhone 2 écrans) qui répète celui du Stock avec d'autres mots (« 2 mouvements de techniciens à valider » ici, « 2 gestes de technicien attendent ta validation » là) et d'autres lignes. Puis une recherche « Où est… ? » qui répète celle du Stock. Puis des cartes de lieux qui répètent les tuiles du Stock. **Un gérant ne sait plus s'il doit aller dans Stock ou dans Dépôts pour la même question.**
2. Le titre « Dépôts et camions » parle d'un endroit, mais l'écran principal parle d'actions (6 lignes de tâches) : l'image est celle d'une liste de lieux, le contenu celle d'un tableau de bord.
3. Les cartes de lieu sont bonnes (4 chiffres, 1 bouton « Compléter · 3 articles »), mais chaque carte porte jusqu'à 7 lignes de texte (articles, valeur, « 3 à remettre à bord », « Dernier mouvement le 29 oct. », « Jamais compté », bouton) en 3 couleurs ; le 4ᵉ camion (« Au garage ») change de forme (pastille, 4 lignes).
4. La fiche d'un lieu (`p-box-fiche-*`) est, elle, bien faite : ce qui manque d'abord (liseré rouge/orange), 3 chiffres, 1 bouton noir « Compléter la dotation ». C'est le bon modèle.

**« MON CAMION »** (`moncamion-iphone-*`, `t-*-iphone-*`) — *le plus proche de ce que Justin aime.* 3 gros boutons à deux lignes (« J'ai pris à l'atelier / Je remplis mon camion »), puis ce qui manque avec un bouton « Je l'ai pris » par ligne. Défauts : (a) la carte « Messages du bureau » (un rappel qui n'a rien à voir avec le matériel) est placée AVANT les trois gros boutons et pousse « Il manque à bord » sous la barre du bas ; (b) la ligne « Il manque à bord · 3 » garde son bouton « Je l'ai pris » après envoi — on peut l'envoyer deux fois (§5) ; (c) pas de recherche : impossible de savoir où est une pièce (l'atelier, le camion d'un collègue) ; (d) « J'ai utilisé » demande de choisir une intervention dans une liste déroulante tronquée (« 31 oct. · Restaurant Le Vieux Port · Dépan… ») puis un article dans une 2ᵉ liste déroulante.

**LES FENÊTRES** (panneaux à droite sur Mac/iPad, feuilles qui montent sur téléphone) :
- *Sortir du stock* (`p-sortie-*`) : 4 listes déroulantes (De, Pour qui, Pourquoi, Sur quelle intervention) AVANT de choisir l'article, qui se choisit dans une 5ᵉ liste de 26 lignes sans recherche, puis une quantité ; le bouton « Sortir » est grisé sans dire pourquoi. Aucun champ ne dit « de quoi s'agit-il ? ». Les 4 questions sont celles du système, pas celles de la personne (« qu'est-ce que tu sors ? »).
- *Fiche article* (`p-article-fiche-*`, `p-article-fluide-*`) : 13 lignes « étiquette / valeur » de même poids (référence, fournisseur, en stock, où, alerte, prix d'achat, vente, marge, TVA, utilisé, tu en utilises, de quoi tenir…), des interlignes très larges ; l'information qui compte (combien j'en ai, où, est-ce que j'en recommande) est au même niveau que « Référence ».
- *Bon de commande* (`p-cmd-preparer-*`) : bon, lisible, tableau net, un seul bouton noir « Vérifier et envoyer » en bas fixe. C'est une réussite — à conserver tel quel dans l'esprit.
- *Réassort* (`p-reassort-*`) et *Fiche d'un camion* (`p-box-fiche-*`) : bons (cases, +N, « manque 1 »). Le surtitre du Réassort ouvert depuis Stock dit « Dépôts et camions » (la fenêtre vient de l'autre rubrique).
- *Registre des fluides* (`p-registre-*`) : propre, mais il ne dit pas sur quelle période il porte et n'a pas de total par fluide (les deux tuiles « chargés / récupérés » ne distinguent pas R32 de R410A).
- *Nouvelle réserve*, *Modifier*, *Compter* : corrects.

**ACHATS ET FRAIS** (`achats-*`) — voir l'annexe A (la question de Justin) ; visuellement il est proche des écrans validés (cartes de demandes avec le motif entre guillemets, boutons clairs) ; sa carte « budget » grise est la partie la plus lourde.

**VÉHICULES** (`vehicules-*`, pour mémoire : Justin l'a classé « à refaire » séparément) : 4 sous-blocs de chiffres (3/4 en service, échéances, 1 566 € de frais, 515 € de stock, 0,23 €/km) AVANT la liste des 4 véhicules, + « Les plus chers au kilomètre ». Même défaut : un tableau de bord avant la liste.

### 4.3 Défauts transversaux (ce qui fait « mal fait » sur les trois rubriques)

1. **Un tableau de bord avant le travail**, trois fois (bandeaux « À faire », 4 tuiles, raccourcis, tuiles de lieux, puces). Les écrans validés ouvrent sur la liste.
2. **La même information est écrite à plusieurs endroits avec des mots différents** : lieux (5 endroits), « à faire maintenant » (2 versions), inventaire (3 portes), recherche d'article (Stock, Dépôts, Produits), « commander » (Stock, Produits, Commandes, Achats, Accueil, Tâches), valeur du stock (Stock, Produits).
3. **Trois noms pour trois écrans qui se recouvrent** : « Stock » (où est chaque article), « Fournisseurs, matériel & produits » (le catalogue + les commandes + les fournisseurs), « Dépôts et camions » (le stock, lieu par lieu). Un nouvel utilisateur ne peut pas deviner lequel ouvre quoi : « où est la pompe de relevage ? » → Stock ou Dépôts ? « combien coûte-t-elle ? » → Produits. « J'en commande ? » → Produits › Commandes, mais l'alerte est dans Stock.
4. **Des boutons principaux noirs en trop** : 3 « Préparer la commande » + « Tout préparer » ; « Réassort… · 6 » ET trois « Réassort » dans le bandeau.
5. **Les verbes du comptable** (entrée, sortie, transfert, correction, inventaire, réassort, dotation, franco, reliquat, rapprocher, seuil) au lieu des gestes de l'artisan.
6. **Des phrases d'aide en petit gris très longues** sous presque chaque titre (jusqu'à 2 lignes de 150 caractères) — l'inverse du « zéro explication » des écrans validés.
7. **Pictogrammes** : une dizaine d'émojis de couleur (🏬 🚐 📦 🏪 📄 📷 🛒 ❄️ 🔥 🔧) mêlés aux icônes filaires du menu. Les émojis ne rendent pas pareil sur Mac, Windows et Android (Windows en aplat, Apple en relief) : le rendu « soigné » change d'un appareil à l'autre.
8. **Aucune règle sur ce qui est une action et ce qui est un réglage** : l'interrupteur « Valider les gestes des techniciens », la dotation, la fréquence de comptage sont placés dans la file de travail.
9. **Sur téléphone** : les en-têtes (titre, phrase, 3-4 boutons, onglets) mangent 60 % du premier écran ; la barre du bas recouvre le premier bloc ; les onglets débordent ; les feuilles sont correctes.
10. **iPad** (820×1180) : le menu latéral coupe la 3ᵉ ligne du groupe Matériel (« Dépôts et camions », cachée à moitié par le pied Jour/Nuit/Auto) ; l'en-tête de Produits passe sur 2 lignes.
11. **Windows 1366×768** (`*-windows-*`) : le menu latéral n'affiche, à l'ouverture, que Accueil … Clients ; le groupe « Matériel » est sous le pied Jour/Nuit/Auto, donc **plusieurs écrans de défilement DANS le menu** avant de trouver Stock (même défaut, en plus grave, à 1280×720). Les pages elles-mêmes tiennent (aucun débordement) mais Stock n'y montre que le bandeau « À faire maintenant » : la liste est à 1,5 écran. Les émojis (❄️ 🔥 🔧 🏪 📄 📷 🛒) sont ceux de la police du système : je les ai vus rendus par Chromium/Linux, pas par Segoe UI Emoji ni par Apple Color Emoji ; **je ne peux pas garantir à l'œil** leur rendu sur un vrai Windows ou un vrai Mac.
12. **Android 360 / petit téléphone 320** : aucun débordement horizontal de la page, aucun champ sous 16 px (pas de zoom iOS), aucun texte écrasé ; seuls défauts mesurés : barre d'onglets du Stock plus large que sa colonne (363 px contre 326 / 286 : l'onglet « À valider » sort), rangée « Tous · Climatisation · Chauffage · Plomberie » de 381 px qui défile, « Retirer ✕ » à 40×44 px dans les commandes, « Tout » à 43×44 px, libellés tronqués dans les listes déroulantes (« Dépan… »).

---------------------------------------------------------------------------------------------------------------------------------

## 5. LES DÉFAUTS DE FONCTIONNEMENT RENCONTRÉS EN JOUANT CHAQUE GESTE

Méthode : (1) 88 familles de gestes de premier niveau des 10 écrans (Stock ×4 onglets, Produits ×3 vues, Dépôts, Mon camion, Achats), un clic chacune sur une page neuve, avec comparaison avant/après de l'adresse, du titre, du contenu, de la fenêtre et du toast (`gestes.txt`) ;
(2) 30 fenêtres ouvertes par leur fonction réelle ; (3) boucles complètes avec les chiffres relus avant/après (`mesures2.txt`) ; (4) trois rôles ; (5) six profils d'appareil (`mesures`, `s6`).
Résultat net, honnête : **aucune erreur JavaScript, aucun bouton mort, aucun débordement de page** ; les totaux se recalculent juste (voir « ce qui marche » à la fin). Les défauts ci-dessous sont de LOGIQUE et de COHÉRENCE, pas de plantage.

### 5.1 Défauts mesurés (classés du plus grave au plus léger)

| # | Défaut | Preuve | Gravité |
|---|---|---|---|
| **F1** | **Le bureau (Julie, « Gestion des factures ») n'a accès à AUCUNE des trois rubriques** : ni Stock, ni Produits/Commandes, ni Dépôts. `aller('stock')`, `aller('produits')`, `aller('boxes')` la renvoient sur Comptabilité sans message. Pourtant le prototype la montre en train de **réceptionner les commandes** (mouvements m2, m3, m6, « Réception de la commande BC-… » par Julie) et l'écran Achats lui dit « Tu vois les demandes **pour préparer les commandes** » — qu'elle ne peut pas préparer. Elle ne peut pas non plus répondre à « il en reste ? » quand un client appelle. | `mesures3.txt` (`JULIE aller(...)`), `ROLES.gestion.routes` l.11157, `MENU-FINAL.md` (« Le rôle bureau n'a pas Stock / Produits alors que sa fiche le promet ») | **Impasse de rôle** |
| **F2** | **Double envoi** : sur « Mon camion », « Je l'ai pris » (ou « J'ai pris à l'atelier ») laisse la ligne « Il manque à bord » avec son bouton ; un second envoi crée une **seconde demande identique** : deux appuis → `MVTS_ATT` passe de 2 à 4, deux lignes identiques « Filtre à charbon ». Le gérant transférerait deux fois. La ligne ne dit pas « envoyé, en attente du bureau » (c'est écrit plus bas, dans « Mes envois »). | `s6.js` (`DOUBLE PRISE`) | **Donnée fausse** possible |
| **F3** | **Le Stock envoie réassortir un camion immobilisé.** La ligne du bandeau « Le camion de Tom a 4 articles sous sa dotation » (bouton « Réassort ») est affichée ; le bouton du haut « Réassort des camions · 6 » et Dépôts l'excluent parce que le Kangoo de Tom est **au garage**. Trois chiffres pour le même geste : 10 lignes (bandeau 3+3+4), 6 (bouton), 6 (Dépôts) ; la tuile Stock de Tom dit « 4 à remettre à bord », Dépôts dit « Au garage ». | `mesures.txt`, captures `stock-ensemble-*`, `boxes-*` ; `sxAFaire` l.14445 ne lit pas `bxGarage` | Incohérence |
| **F4** | **Cinq nombres différents pour « ce qu'il faut commander »** (même jour, même base) : Stock « **5** à commander › (dont 1 pour une intervention) » ; Produits « **5** à commander › » ; Commandes « **5** à commander · chez 3 fournisseurs » ; Accueil « **5 articles** à commander chez 3 fournisseurs » ; puce « À commander · **3** » (+ « Épuisé · 1 » qui est aussi dans les 5, + une ligne « Cosses fast-on » qui n'est pas du tout au catalogue). « 5 » compte des LIGNES de commande (pièces d'intervention + articles au seuil), « 3 » des articles d'état « À commander ». Le menu d'Achats affiche aussi un **6** sans rapport. | `mesures.txt` (`COH …`) | Incohérence de vocabulaire et de comptage |
| **F5** | Le bandeau « **NOUVEAU — Choisis tes fournisseurs** » reste affiché alors que l'entreprise a déjà 5 fournisseurs : sa condition est `foBienvenue && !nDir` (aucun fournisseur **de l'annuaire** choisi) ; les 5 fournisseurs de la démo sont « locaux ». Ils sont donc étiquetés « Fournisseur local » partout (cartes, liste, fiche). | `foBandeau` l.8274, `COH produits bandeau` | Faux message |
| **F6** | **Le bouton « Valider » du bandeau du Stock ne valide rien** : il ouvre l'onglet « À valider » ; il faut un 2ᵉ geste (« Tout valider ») → 3 gestes depuis le menu. Un « Valider » qui n'agit pas est un faux ami. | `sxAFaire` `b:'Valider', d:'onglet|valider'` l.14448 ; `taches.txt` | Étiquette trompeuse |
| **F7** | « 5 à commander · chez 3 fournisseurs » dans Commandes est un bouton **d'ancre** : sur un grand écran la section « À commander » est déjà à l'écran, le clic ne produit **rien de visible** (c'est la seule famille « sans effet » sur 88). | `gestes.txt` (SANS EFFET) | Mineur |
| **F8** | **Le registre des fluides (obligation légale en clim) est introuvable** : ni dans le menu, ni dans l'écran Stock ; seulement par la fiche d'un article de la catégorie « Fluides frigorigènes » (lien « Voir le registre des fluides › ») ou depuis une intervention. 3 gestes si on sait où chercher, sinon jamais. | `sxRegistre` l.14744, l.14651 | Fonction importante enfouie |
| **F9** | « Sur commande » (article jamais en stock, achat à la demande) et « Commandé » (une commande est en cours) : deux étiquettes voisines pour deux notions ; dans Stock, la ligne « Épuisé » + son voisin « Sur commande · 2 » (Ventilateur extérieur, Kit cassette) portent la même quantité 0 et le même « nulle part ». | `prEtat` l.8069 | Vocabulaire |
| **F10** | **Montants au format différent** : « 1 724 € » (tuile du Stock) mais « 1724 € » (cartes de Dépôts, Inventaire, fiche du lieu) pour la même valeur ; « 12.5 » (point) dans « Frais de port » de la fiche fournisseur contre « 12,50 € » partout ailleurs. | captures `boxes-*`, `p-four-fiche-*` | Cosmétique |
| **F11** | **Fiche fournisseur : deux champs pour la même notion** (« Délai » texte libre « livré sous 24 h » ET « Délai (jours ouvrés, 0 = comptoir) » nombre) ; le texte met le nombre à jour (`pdxDelaiLu`, l.13907) mais PAS l'inverse : modifier le nombre de jours seul laisse un texte faux (« livré sous 24 h » pour 3 jours) que lisent la carte fournisseur et le courriel. | `p-four-fiche-*`, l.13878 | Risque de donnée |
| **F12** | **Les réglages de la validation sont dans la file de travail** (À valider) : un interrupteur et une case à cocher en tête de la liste qu'on vient traiter ; la case est mal alignée avec sa phrase. | `stock-valider-mac-jour-marc.png` | Cosmétique + logique |
| **F13** | **L'onglet « À valider », qui porte le travail du jour, sort de l'écran** sur téléphone : barre d'onglets de 363 px dans 356 (iPhone 390), 326 (Android), 286 (petit) ; « Valider 2 » est coupé à droite ; idem filtre de métier de Produits (381 px). | `s6.js` | Défaut d'affichage |
| **F14** | **Le menu latéral coupe le groupe Matériel** : iPad 820×1180 → « Dépôts et camions » à moitié recouvert par le pied ; Windows 1366×768 → le groupe entier est hors de vue. (Défaut du menu, hors périmètre mais qui touche d'abord ces trois rubriques.) | `stock-ensemble-ipad-*`, `*-windows-*` | Affichage |
| **F15** | **Code mort et textes périmés** : `bxMonCamion` (l.15181, 2ᵉ « Mon camion » jamais atteint par la route), `vueStock`/`vueBoxes`/`prFiche`/`lieuFiche` définies 2 à 3 fois ; la branche `data-pr="cmd"` (l.8168) dit « la catégorie Achats la préparera » alors que les commandes sont dans la même rubrique (elle n'est plus appelée). | code | Dette |
| **F16** | **Le technicien ne peut pas chercher un article** : ni dans l'atelier, ni dans le camion d'un collègue (il voit seulement « à l'atelier : N » sur ce qui lui manque). La question « où est la pièce ? » est la 1ʳᵉ du terrain. | `moncamion-*` | Manque |
| **F17** | **Pas de photo / de code-barres** sur un article, ni de scan : pour un public qui reconnaît une pièce à sa forme. | `prFiche` | Manque |
| **F18** | Le prototype est sans serveur : « Aperçu du PDF », « Envoyer », « Ce que voit le fournisseur », « Exporter en PDF/CSV », « Lire une facture (IA) », « Importer un fichier » sont **simulés** (toasts « Fichier préparé (simulé) »). À dire, pas à corriger. | l.14783 | Rappel |

### 5.2 Ce qui marche (vérifié avec les chiffres relus avant/après)

- **Réassort** : 6 transferts → « dans les 4 camions » 515,00 € → 605,80 € ; le nombre de lignes de « À faire maintenant » passe de 6 à 5 (Dépôts). ✓
- **Tout valider** : 2 gestes validés → stock total 2 306,50 → 2 249,50 €, camions 605,80 → 555,60 €, « mouvements à valider » 2 → 0. ✓
- **Tout préparer · 3 commandes** : une commande sans prix reste décochée d'office, **2 commandes envoyées (208,00 € HT)** ; « à commander » passe de 5 à 2 (les 2 lignes de la commande non envoyée). ✓ (Accueil « Achats à traiter » reste à 3 : aucune nouvelle alerte tant que rien n'est en retard.)
- **Réception BC-2026-039** (6 kg de R410A) : article « En stock » (10 kg), valeur du stock +276,00 € (= 6 × 46 €), la ligne « en retard de 1 jour » disparaît de l'Accueil (3 → 2). ✓
- **88 familles de gestes** : 87 répondent ; 0 erreur console ; fenêtres, toasts « Annuler » ; navigation Stock ↔ Commandes ↔ Dépôts ↔ fiches avec retour.
- Les quantités de commande se calculent sur la consommation, le franco, le « moins cher chez… » : visibles dans la capture `produits-commandes-*`.

---------------------------------------------------------------------------------------------------------------------------------

## 6. LES DIX CHOSES QU'ON VIENT FAIRE LÀ — par ordre de fréquence, et en combien de gestes aujourd'hui

« Geste » = un toucher/clic (le menu compte pour 1 sur Mac ; sur téléphone « Menu » + la ligne = 2 pour le gérant, la barre du bas = 1 pour le technicien). **Mesuré** = joué par script dans le prototype (`taches.txt`, `mesures*.txt`) ; **estimé** = compté sur le code et les captures. Les saisies de texte et les défilements ne sont pas comptés comme gestes mais sont signalés.

| # | Qui | Ce qu'on vient faire | Fréq. | Gestes aujourd'hui | Ce qui coûte |
|---|---|---|---|---|---|
| 1 | Technicien | **Voir ce qui manque dans mon camion** | tous les jours | **1** (barre « Camion ») + défiler d'un demi-écran (mesuré, `moncamion-iphone-*`) | la carte « Messages du bureau » passe avant ; « Il manque à bord » arrive sous le pli |
| 2 | Gérant, bureau, (technicien) | **Savoir s'il en reste / où est tel article** | tous les jours | gérant : **3** (menu Stock + défilement de 1,3 écran + toucher la recherche) + saisie, estimé sur `DENS` ; bureau : **impossible** ; technicien : **impossible** (il ne voit que son camion) | la recherche est sous 33 éléments ; existe aussi dans Dépôts (« Où est… ? ») et Produits |
| 3 | Technicien | **Dire ce que j'ai utilisé chez le client** | tous les jours | à la clôture de l'intervention : **2** (« Terminer », puis « Oui, sortir du stock » — liste pré-cochée) ; par Mon camion : **5-6** (Camion › J'ai utilisé › intervention › article › quantité › Envoyer), estimé sur `sxTForm` | trois chemins vers le même mouvement ; liste déroulante pour l'intervention et pour l'article |
| 4 | Gérant | **Valider ce que les techniciens ont pris/utilisé** | tous les jours (validation activée) | **3** (menu Stock › « Valider » › « Tout valider ») — mesuré | le 1ᵉʳ « Valider » n'en est pas un (§5 F6) |
| 5 | Technicien | **Dire ce que j'ai pris à l'atelier** | tous les jours | **3** (Camion › « J'ai pris » (ou « Je l'ai pris » sur la ligne) › Envoyer) — mesuré | un 2ᵉ appui envoie un doublon (F2) |
| 6 | Gérant (bureau : voudrait) | **Commander ce qui manque** | chaque semaine | un fournisseur : **5** (menu › Commandes › Préparer la commande › Vérifier et envoyer › Envoyer) ; tous : **4** (menu › Commandes › Tout préparer › « Envoyer N commandes ») — mesuré ; bureau : **impossible** | « Commandes » est le 2ᵉ onglet de la rubrique « Fournisseurs, matériel & produits » ; l'alerte est dans Stock |
| 7 | Gérant (bureau : voudrait) | **Réceptionner une livraison** | chaque semaine | **5** (menu › Commandes › la commande › Réceptionner › Valider la réception) — mesuré, quantités préremplies ; bureau : **impossible** | il faut savoir que la commande est dans « En cours » ou « À traiter » |
| 8 | Gérant | **Remplir les camions (réassort)** | chaque semaine (lundi) | **3** (menu Stock › « Réassort » › « Transférer ») — mesuré ; Tom, au garage, apparaît dans le bandeau mais pas dans le total (F3) | trois « Réassort » dans le bandeau + un en haut |
| 9 | Gérant, bureau | **Lire une facture fournisseur** (stock + prix à jour) | chaque semaine | **3** (menu › carte « Lire une facture fournisseur » › photo/PDF) — estimé ; bureau : **impossible** dans cette rubrique (elle passe par la Comptabilité) | une carte parmi quatre raccourcis, sous un grand bandeau |
| 10 | Technicien | **Signaler qu'il me manque une pièce** | chaque semaine | **4** (Camion › Il me manque › article › Envoyer) — estimé ; ou depuis la fiche d'intervention (« Il me manque une pièce ») | deux portes différentes pour la même demande |

Juste derrière (mensuel / trimestriel) : **changer un prix** (menu › [recherche] › ligne › Modifier › champ › Enregistrer = **5-6**, mesuré jusqu'à l'ouverture du formulaire : 3) ·
**ajouter un article** (menu › ＋ Ajouter › 11 champs › Ajouter = **3** gestes mais ~6 saisies, mesuré jusqu'au formulaire : 2) ·
**compter un camion** (menu › Inventaire › lieu › « Tout est juste » = **4**, +1 pour valider — mesuré) ·
**sortir du stock pour un collègue** (menu › Sortie › De / Pour qui / Pourquoi › article › quantité › Sortir = **≈ 7**, estimé) ·
**ouvrir un registre des fluides** (menu › Stock › un article de fluide › « Voir le registre » = **3**, estimé) ·
**changer la dotation d'un camion** (Dépôts › carte › « Modifier » › dotation = **≈ 5**).

Lecture : **les 5 gestes les plus fréquents (n° 1 à 5) font vivre le stock ; les 4 gestes de la semaine (6-9) font vivre les achats.** Aujourd'hui l'écran d'accueil de chaque rubrique est organisé pour le gérant du lundi matin (tableau de bord), pas pour ces dix-là ; le bureau n'en fait aucun, alors qu'il en a trois (2, 6, 7).

---------------------------------------------------------------------------------------------------------------------------------

## ANNEXE A — « Achats et frais » : ce que c'est (la question de Justin du 16 novembre : « je ne sais pas ce que c'est, j'aimerais que tu m'expliques »)

**En une phrase** : *c'est la boîte où le gérant DÉCIDE de ce que l'équipe veut dépenser, avant que l'argent sorte.* Il y a deux onglets (`vueAchats` l.17204) :

1. **Demandes** — ce que l'équipe demande d'acheter : « Il me faut 10 kg de fluide R32 pour lundi » (Tom), « une échelle 3 plans » (Sophie), « une perceuse » (Karim). Pour chaque demande l'application a déjà regardé, et le dit en vert, ce que le gérant va décider :
   - *« L'atelier en a 6 kg sur 10 : on les transfère vers le camion de Tom, et les 4 kg qui manquent partent dans la commande Frigo Distribution 17 »* → bouton **Transférer 6 kg et commander 4 kg** (il écrit dans le Stock ET dans les Commandes) ;
   - ou **Tout commander**, **Achat en magasin** (avec la carte de l'entreprise, rattaché à un budget du mois — « Petit outillage : 46 € déjà dépensés, budget 300 €, il reste 9 € après elle »), **Demander une précision**, **Refuser** (avec un motif qui part en notification à la personne).
2. **Notes de frais** — les repas, péages, parkings, carburant que les techniciens photographient (leur écran « Mes frais ») : le gérant **valide ou refuse** (avec motif) ; une note validée est remboursée avec la paie.

**Pourquoi c'est à part de la Comptabilité** : la Comptabilité garde ce qui est DÉJÀ de l'argent (factures à payer, paiements, paie, TVA, banque, envoi à l'expert-comptable). « Achats et frais » garde ce qui se **décide avant** (demandes, notes à valider). C'est écrit dans le code (l.9816-9817) : « Les Achats gardent ce qui se DÉCIDE avant l’argent ». Les trois tuiles du haut renvoient d'ailleurs vers la Comptabilité (« 896 € à payer · dans la Comptabilité › », « 4 achats sans facture · dans la Comptabilité › »).

**Ce que l'étude en tire pour le groupe Matériel** :
- Une demande d'un article du catalogue (« Fluide R32 ») est du **Stock + Commandes** : elle finit dans « À commander » et dans un transfert vers le camion. Seules les demandes hors catalogue (échelle, perceuse) et les notes de frais sont de « l'argent à autoriser ».
- Résultat : pour **acheter**, un gérant passe par trois rubriques — Achats et frais (décider), Fournisseurs › Commandes (passer la commande), Stock › À valider (le geste du technicien) — et le technicien par deux écrans (Mon camion › Il me manque ; Mes frais pour retrouver sa demande).
- Le bureau (Julie) n'a QUE « Achats et frais » dans ce domaine (lecture : « Tu vois les demandes pour préparer les commandes. C'est le patron qui les décide »), sans accès aux commandes elles-mêmes (F1).
- À trancher par Justin, pas par moi : garder « Achats et frais » comme boîte de décision (nom validé le 16/11 dans `MENU-FINAL.md`), ou rattacher les demandes d'articles à Commandes et ne garder ici que « hors catalogue » + « notes de frais ». Le nom « Achats et frais » ne dit pas « on décide ce qu'on dépense » ; « Demandes et notes de frais » le dirait.

---------------------------------------------------------------------------------------------------------------------------------

## ANNEXE B — Ce que l'étude dit à celui qui va refaire (non décidé, matière pour la suite)

1. **Un seul « où est quoi »**. Stock (Vue d'ensemble), Dépôts et camions et la recherche d'un article répondent à la même question trois fois. Le gérant, le bureau et le technicien posent tous : « il en reste ? où ? ». Cette question mérite UNE porte, ouverte par une recherche, et le technicien et le bureau doivent pouvoir la poser.
2. **Un seul « à faire »**. Les deux bandeaux (Stock 4 lignes / Dépôts 6 lignes), les chiffres des tuiles, le bandeau de Produits et la carte « Achats à traiter » de l'Accueil comptent à peu près la même chose avec cinq règles de comptage (F4). Une règle, une phrase, un endroit.
3. **Les réglages sortent des files de travail** (validation, règle automatique, fréquence de comptage, dotation, rangement par métier, import de tarifs, annuaire de fournisseurs) : ce sont des gestes de démarrage ou rares.
4. **Les verbes de l'artisan** : « j'en ai pris / j'en ai utilisé / j'en ai rangé / il m'en manque » plutôt que sortie / entrée / transfert / correction ; « compter » plutôt qu'inventaire ; « camion prêt ? » plutôt que dotation ; « livraison » plutôt que réception/reliquat ; mots d'acheteur (franco, remise sur le prix public, rapprocher) en pas-à-pas ou en infobulle.
5. **Le rôle bureau** doit voir ce qu'il fait déjà (réception, commandes, recherche) : décision de rôle à prendre (`MENU-FINAL.md` « NON appliqué » n°3).
6. **À ne pas perdre** (cf. §2 et §3.3) : rangement automatique à la création, catalogue → devis/factures, validation avec « il en restera N », réassort en cases avec « Annuler » partout, bon de remise, registre des fluides et bouteilles, franco/moins cher/quantité calculée, relances de commandes, rapprochement des factures, lecture de facture par photo, « Avant les visites », réserves chez les clients (3D), gestes du technicien en 3 touchers.
7. **Contrats techniques à garder ou à réécrire dans le même lot** : routes `stock` / `produits` / `boxes` / `moncamion` ; fonctions et tables de §3.3 ; sélecteurs de la visite guidée (`tourPartie`) et de l'immersion (`immChap`) ; `prCatalogueMaj()` ; une seule définition par fonction (fin des réaffectations en chaîne).
8. **Ce qui est bien et peut servir de modèle** (déjà dans le prototype) : la fiche d'un camion, la feuille « Réassort », « Mon camion », le bon de commande, les lignes de « À valider » (« il en restera 6 »), les alertes (« bouteille presque vide »), le bandeau « Avant les visites ».

---------------------------------------------------------------------------------------------------------------------------------

## LIMITES DE CETTE ÉTUDE (ce que je n'ai pas pu vérifier)

- Les captures viennent de Chromium sous Linux (Playwright) avec des profils d'appareil émulés (largeur, toucher, encoches). **Je n'ai pas vu un vrai iPhone, un vrai Windows ni un vrai Android** : le rendu des émojis, des listes déroulantes natives et de la police système peut y différer.
- Windows n'a été capturé qu'en 1366×768 (Stock, Produits ×3, Dépôts, jour et nuit) ; les 30 fenêtres l'ont été sur Mac, iPhone et iPad.
- Le prototype n'a pas de serveur : envois de courriel, PDF, lecture de facture par IA, import de fichier, portail fournisseur sont simulés ; je n'ai donc rien dit de leur fiabilité réelle.
- La sonde de gestes clique la PREMIÈRE instance de chaque famille de boutons (88 familles) : elle prouve que chaque famille répond, pas que chacune des centaines de lignes (articles, commandes, lieux) répond juste.
- Les fréquences d'usage (§2) et les gestes « estimés » (§6) sont mon avis, à confronter à l'expérience de Justin et d'un vrai gérant.
- Aucun fichier du dépôt (`apercu/`, `app.html`, `beta.html`…) n'a été modifié : seul ce dossier est ajouté.
