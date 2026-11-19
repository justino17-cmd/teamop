# Spécification de la refonte du groupe « Matériel » — Stock, Fournisseurs, matériel & produits, Dépôts et camions (+ Mon camion)

Écrite le 16 novembre 2026, pour être appliquée SANS reparler à son auteur. Elle part du dossier d'étude `materiel-etude.md` (même dossier), de trois
propositions indépendantes (le novice, la beauté, la vitesse), et d'un contrôle dans le code d'`apercu/prototype-op-gestion.html` (noms de fonctions et
de classes vérifiés ; les numéros de ligne de l'étude sont décalés d'environ 60 lignes depuis la fusion : chercher par NOM, jamais par numéro).
Rien du dépôt n'a été modifié pour l'écrire.

Ce que Justin a dit, mot pour mot, et qui commande tout : « Stock. Je veux tout refaire parce que c'est moche et c'est mal fait. Fournisseur matériel. Pareil, je veux que
tu refasses tout. Plus compréhensif, plus simple et mieux fait. Dépôt et camion. Pareil, à refaire. C'est mal fait. J'aime pas. » ; « logique, simple, rapide, efficace à
comprendre pour tout le monde, même pour les gens qui ne sont pas doués avec la technologie » ; « il faut que tout soit parfait ». Les écrans qu'il a validés (Accueil, Planning,
Absences et congés, Interventions, Clients, Devis, Comptabilité, Équipe) sont la RÉFÉRENCE : on ne réinvente ni cartes, ni onglets, ni couleurs.

**Sommaire** : 0 Décisions tranchées · 1 Le principe · 2 La grammaire visuelle (classes à réemployer) · 3 Les règles communes (comptage, états, mots, montants, icônes) ·
4 Qui voit quoi · 5 Stock · 6 Dépôts et camions · 7 Fournisseurs, matériel & produits · 8 Mon camion (technicien) · 9 Écrans voisins · 10 Table « avant → après » (rien ne se perd) ·
11 Les dix gestes · 12 Routes et fonctions : garder, réécrire, supprimer · 13 Les sondes à écrire · 14 Ordre d'implantation · 15 Ce qui reste à soumettre à Justin ·
Annexe A « Achats et frais » expliqué · Annexe B Limites.

---------------------------------------------------------------------------------------------------------------------------------

## 0. Les désaccords entre les trois propositions, tranchés (une phrase chacun)

| # | Désaccord | Tranché | Pourquoi |
|---|---|---|---|
| D1 | Onglets de Stock : « Tout / Ce qui manque / Historique » (novice), « Articles / À valider / Journal » (beauté), « Articles / Ce qui a bougé / Fluides » (vitesse) | **Deux onglets : « Articles » · « Ce qui a bougé »** | « Ce qui manque » refait le panier de Commandes (deux listes du même sujet) ; « À valider » cache dans un onglet ce qu'un bandeau d'une ligne montre déjà ; le registre des fluides est un document légal rangé dans « Plus », pas un onglet que 20 métiers sur 24 n'ont pas. |
| D2 | Chiffres du haut : 4 tuiles dont la valeur (ancien), 3 tuiles (beauté), aucune (vitesse) | **Trois tuiles qui agissent, la valeur descend en pied de liste** | Chaque tuile mène à l'endroit où l'on agit ; la valeur du stock (2 306,50 €) est le chiffre le moins utile du jour, il n'est plus le premier. |
| D3 | Verbes : « J'en ai pris / rangé / déplacé / compté » (novice), « Sortir / Ranger / Déplacer » (beauté), « J'ai pris / utilisé / rangé / perdu » (vitesse) | **Gérant et bureau (qui notent pour l'équipe) : verbes à l'infinitif « Sortir du stock · Ranger dans le stock · Déplacer · Compter ». Technicien (qui note SON geste) : première personne « J'ai utilisé chez un client · J'ai pris à l'atelier · Il me manque une pièce »** | « J'en ai pris » du gérant aurait voulu dire autre chose que « J'ai pris à l'atelier » du technicien (sortie contre transfert) : deux sens pour le même mot. |
| D4 | Fournisseurs : 3 onglets (novice) contre 4 avec « À commander » à part (beauté) | **Trois onglets : « Commandes » · « Articles » · « Fournisseurs »**, « À commander » est le premier bloc de Commandes | Un panier et le suivi de sa commande sont la même histoire ; trois onglets tiennent à 286 px, quatre non (mesuré : 534 px dans 508). |
| D5 | Cartes des lieux : bouton « Remplir » sur chaque carte (novice) contre carte sans bouton (beauté) | **Carte de la grammaire « Clients » (nom, ligne grise, filet, trois chiffres), AUCUN bouton, un toucher ouvre la fiche** | Un geste par carte ; le noir ne « saute » plus d'une carte à l'autre ; remplir TOUS les camions est le bouton du haut, remplir UN camion est dans sa fiche. |
| D6 | Le bureau (Julie) : tout (novice) contre Stock et Fournisseurs sans Dépôts (beauté) | **Stock + Fournisseurs, matériel & produits, sans « Dépôts et camions », sans Accepter/Refuser, sans régler ni retirer** (question 1 pour Justin, la spec tient sans sa réponse) | Elle reçoit et prépare déjà les commandes dans les données ; accepter le geste d'un technicien est une décision de gérant. |
| D7 | Seuil d'alerte calculé tout seul (vitesse) | **Le seuil reste un nombre par article ; la fiche propose « Conseil : prévenir sous 4 » en un toucher** | Changer en silence ce qui déclenche les commandes, c'est changer ce que le client a réglé. On aide, on n'impose pas. |
| D8 | Photo d'article et scan d'étiquette (vitesse, F17) | **Pas dans ce lot** (le carré de 40 px des lignes porte l'icône de la catégorie ; il pourra porter une photo) | Le prototype n'a pas de serveur ; ce serait promettre une fiabilité qu'on ne peut pas montrer (question 3). |
| D9 | « Compléter » (camion) contre « Remplir » | **« Remplir »** (« Remplir les camions », « Remplir ce camion ») | Le verbe qu'on dit à voix haute dans l'atelier. « Réassort » et « dotation » disparaissent de l'écran. |
| D10 | Un « À faire maintenant » de 6 lignes dans Stock ET dans Dépôts | **Supprimés tous les deux.** Une ligne de bandeau par rubrique (envois à accepter dans Stock, « Avant les visites » dans Dépôts, un groupe « À commander » dans Commandes) ; la carte de l'Accueil « Achats à traiter » devient « Matériel » avec UNE ligne par chose | Deux versions comptaient des choses différentes avec deux jeux de mots. |
| D11 | « Le plus simple possible » (la carte d'aide en pied de Devis) | **On la reprend en pied de Stock › Articles, de Dépôts et de Commandes**, 3 à 4 puces d'une phrase ; plus aucune longue phrase grise sous les titres | C'est le ton validé : l'aide est rangée en bas, elle ne précède pas le travail. |
| D12 | Fiche d'un fournisseur : « franco », « remise sur le prix public » | **Mots d'artisan et UNE saisie par notion** (« Livraison gratuite à partir de 150 € », « Livré en [1] jour(s) » OU « Je le retire au comptoir ») | Corrige F10 et F11 (deux champs de délai qui se contredisent). |

---------------------------------------------------------------------------------------------------------------------------------

## 1. Le principe

1. **Une rubrique répond à UNE question et s'ouvre sur son travail**, comme Devis, Clients et Interventions : surtitre, grand titre, au plus une courte phrase, UN seul bouton noir,
   une seule rangée de 2 à 3 onglets, puis la liste. Première ligne de donnée **avant 0,5 écran** (aujourd'hui : Stock 1,3 écran, 2,8 sur iPhone ; Produits 1,0 et 2,1 ; Dépôts 1,0 et 1,9)
   et **au plus 12 éléments touchables avant elle** (aujourd'hui 33, 24 et 9).
   - **Stock** = « Qu'est-ce qu'il me reste, et où ? » — on raisonne par ARTICLE ;
   - **Dépôts et camions** = « Mes camions sont-ils prêts ? » — on raisonne par LIEU ;
   - **Fournisseurs, matériel & produits** = « Qu'est-ce que je commande, chez qui, à quel prix ? » — on raisonne par COMMANDE, ARTICLE, FOURNISSEUR ;
   - **Mon camion** (technicien) = « Qu'est-ce qui me manque ? ».
2. **Chaque information vit à UN endroit, avec UNE règle de comptage et les mêmes mots partout.** Un seul « à commander », un seul « camions à remplir » (un camion au garage est exclu partout),
   une seule fiche d'article, une seule porte pour compter, une seule recherche d'article, une seule feuille pour dire ce qui s'est passé.
3. **Une urgence = une ligne, jamais un tableau de bord.** Tout ce qui est réglage, démarrage ou rare (valider d'office, fréquence de comptage, annuaire des fournisseurs, import de prix,
   rangement par métier, registre des fluides, export) sort du chemin et se range derrière « Plus ».
4. **Les verbes de l'artisan, aucun sigle.** Pas d'entrée, sortie, transfert, correction, inventaire, réassort, dotation, franco, reliquat, rapprocher, seuil, mouvement. (Table §3.4.)
5. **Chaque geste se défait** (« Annuler » dans la barre qui suit, 8 secondes) **et un bouton grisé dit pourquoi** (une ligne dessous). Un bouton qui commence par un verbe EXÉCUTE ce verbe, sinon il s'appelle « Voir ».
6. **Rien d'utile ne disparaît** : tout est regroupé, renommé ou rangé (table §10). Les clés de route (`stock`, `produits`, `boxes`, `moncamion`), les noms de menu validés
   (« Stock », « Fournisseurs, matériel & produits », « Dépôts et camions », « Mon camion ») et les structures de données ne changent pas.

---------------------------------------------------------------------------------------------------------------------------------

## 2. La grammaire visuelle (celle des écrans validés) — classes du prototype à réemployer

Mesurée sur Devis, Clients, Interventions (Mac 1440×900, iPhone 390×844). **Aucune classe ni couleur neuve sans raison écrite ici.** Les numéros sont les lignes actuelles de la feuille de style.

### 2.1 Les pièces

| Pièce | Classe(s) existante(s) | Règle |
|---|---|---|
| En-tête | `.tete` (113) > `div` : `.surtitre` (105) + `h1` ; `.actions` (171) | Surtitre « Matériel » (13 px, 650, majuscules) ; titre 34 px (28 au téléphone) ; **au plus UNE phrase** `.gris` ; actions à droite sur ordinateur, sur la même ligne que le titre au téléphone si ça tient, sinon dessous pleine largeur. |
| Bouton principal | `.btn` (134) : pilule noire 46 px | **UN seul par écran**, en haut. Libellé « ＋ … » pour une création. Tous les autres boutons sont `.btn.gris` (136) ; `.btn.petit` (141) dans une ligne ; `.btn.large` (140) pleine largeur au téléphone ; destructif : `.btn.rouge` (139) ou `.lien` rouge. |
| Tuiles de chiffres | `.kpis` (123) > `button.kpi` (125) : `b` 26 px + `span` 14 px gris ; téléphone 2 colonnes, **ici 3 colonnes par `.kpis.ptx-k3` (482, 501)** | Un chiffre n'est coloré que s'il dit quelque chose : orange `var(--orange)` à faire, vert `var(--vert)` en règle, rouge `var(--rouge)` problème. À zéro, vert + « rien à … ». Chaque tuile est un `button` qui mène là où l'on agit. |
| Onglets | `.seg` (130) > `button[aria-pressed]` | Une seule rangée, 40 px (44 au doigt). Compteur `.pr-nb` (existant) en petite pastille ronde. Doit tenir dans sa colonne à 286 px (sinon deux lignes comme Interventions ; jamais de défilement). |
| Carte | `.carte` (116) ; titre de carte `.carte > h3` (117) | Rayon 22, marges 18 × 20, ombre double, vitre. |
| Liste dans UNE carte | `.carte.dv-liste` (liste de Devis : marges 6 × 8) ; ligne = style de `.dv-l` (71 px, 13 × 12, filet à 9 %) ; titre 15 px gras + sous-ligne `.gris.petit` (14 px) | **Les lignes de Stock, Articles, Journal, Commandes réemploient ce rythme** : on garde leurs noms de classe (`.sk-l`, `.pr-l`, `.cm-l`…) mais on aligne leur style sur `.dv-l`. Pas de classe de plus. Colonne de droite : `.fo-dr` (existante : `b` + `.gris.petit`). |
| Cartes en grille | `.cartes-clients` (2084) > `.carte.client-carte` (2085) ; chiffres `.client-chiffres` (2087) | Nom 17 px gras, une ligne grise, filet, trois chiffres (gras 15 px + légende grise). Réemployée par les lieux (§6) et les fournisseurs (§7.4). |
| Pastille d'état | `.st` (146) + `.st-v` vert · `.st-o` orange · `.st-b` bleu · `.st-r` rouge · `.st-g` gris | **Un point ET un mot, jamais la couleur seule.** Le normal est silencieux (pas de « En stock »). Sens fixes : vert = en règle, orange = à faire, rouge = problème, bleu = en cours, gris = neutre. |
| Bandeau « tâche » | `.carte.dv-focus` (2572) + `.dv-tache` (2574) + `.dv-c` (2565) : coche ronde, titre gras, sous-ligne grise, bouton à droite | **Au plus UN par page**, une ligne. C'est le format de « 2 tâches pour toi aujourd'hui ». |
| Champ | `.champ` (160) + `.saisie` (161), 46 px, 16 px de texte | Pas de liste déroulante pour plus de 6 choix : recherche. Les `select` natifs restent pour « Où », « De », « Vers » (peu de choix, libellé entier). |
| Menu « Plus » | `ouvrirMenu(x, y, titre, items)` (4108), classe `.ctx` ; items `{ic, l, s, fn, danger}` | Le bouton « Plus » est un `.btn.gris`. Au téléphone le menu devient une feuille du bas (déjà le cas pour `.ctx`). |
| Fenêtre | `ouvrirPanneau(html, large)` (7709) : panneau de 520 px à droite sur Mac/iPad, feuille qui monte sur téléphone | Bouton principal noir collé en bas, croix de 44 px, poignée au téléphone, hauteur max 90 %. |
| Lignes de réglage | `.carte` avec `h3` (117) + `.ligne` (166) : étiquette à gauche, valeur ou champ à droite | Pour les groupes « étiquette / valeur » des fiches (un groupe = une carte, titre en `h3`). |
| Texte secondaire | `.gris` `.petit` (14 px) `.mini` (13 px) `.faible` ; nombres `.mono` | |
| Alerte | `.alerte` (172) | Réservée à un vrai problème (rouge). Un avertissement doux = ligne orange `.st-o` + phrase. |
| Lien | `.lien` (143), 44 px | Un nom d'article, de client, de commande est un vrai lien (bleu `var(--lien)`), jamais un pointillé. |
| Carte d'aide | la carte « Le plus simple possible » de `vueDevis` (pied) | Reprise telle quelle, en pied de page. |
| Retour | `rlRetourBouton` (un seul « ‹ Retour » pour tout le prototype) | Les fiches et feuilles n'ajoutent pas de retour à elles. |

### 2.2 Ce qu'on ajoute (rien d'autre)

1. **Icônes filaires** : le jeu `IC` (6945, trait 1,8, viewBox 24) a déjà `stock`, `produits`, `vehicules`, `carteBox`, `registre`, `achats`. **À ajouter** (mêmes règles, un trait unique) :
   `camion`, `atelier`, `reserve` (maison), `article` (boîte), `fluide` (goutte), `photo` (appareil), `sortir` (flèche qui descend), `ranger` (flèche qui monte), `deplacer` (double flèche),
   `compter` (signe égal barré), `coche`, `livraison`. Aucun émoji dans ces rubriques (🏬 🚐 📦 🏪 📄 📷 🛒 ❄️ 🔥 🔧 retirés : ils ne rendent pas pareil sur Mac, Windows et Android) ;
   `LIEU_IC` et les `emo` des cartes passent aux icônes. Tout bouton à icône seule porte `aria-label` ET `title` (un lecteur d'écran ne lit pas une icône).
2. **Un attribut `data-vis="…"`** (pas une classe, aucun style) sur les blocs que la visite guidée et les visites parlées visent (§9.6). Raison : elles ciblent aujourd'hui des classes
   (`.sk-liste`, `.sx-afaire`, `.bx-c`…) : renommer une classe cassait la visite sans erreur visible.
3. **Un état vide commun** : icône filaire 40 px grise, titre 17 px gras, une phrase `.gris`, au plus un bouton — dans une `.carte`. Jamais « Aucune donnée », « Erreur », « N/A ».

### 2.3 Jour et nuit, tous appareils

Aucun jeton neuf : `--surf`, `--trait`, `--encre`, `--doux`, `--fill`/`--on-fill`, `--orange`, `--rouge`, `--vert`, `--bleu`, `--lien` déjà déclinés jour/nuit. De nuit, une pastille garde un texte
lisible (c'est déjà `color-mix` 15 % + texte `var(--c)` éclairci par le thème) : **mesurer 4,5:1 minimum sur `.st-o`, `.st-r`, `.st-b` posés sur `.carte`** (pas de blanc sur orange clair).
Les cartes se détachent du fond de nuit par le filet et l'ombre (les tuiles de lieux s'y fondaient). Ordinateur : Mac 1440×900, Windows 1366×768 et 1280×720 ; tablette 820×1180 ;
téléphones 390, 360, 320 (et 286 de colonne utile) avec encoches posées. Champs ≥ 16 px (pas de zoom iPhone), cibles tactiles ≥ 44 px, la barre du bas ne recouvre jamais la première
ligne ni un bouton collé en bas (rembourrage bas de la liste).

---------------------------------------------------------------------------------------------------------------------------------

## 3. Les règles communes (écrites UNE fois, lues partout)

### 3.1 UN compte de « à commander »

`cmdNbACommander()` (le nombre de LIGNES des paniers : `cmdPaniers()` = articles d'`aCommander()` + pièces demandées par les interventions + demandes d'achat d'article du catalogue) devient
**LA** règle. Elle est lue par : la tuile de Stock, l'onglet « Commandes » (compteur), le groupe « À commander » de Commandes, la carte « Matériel » de l'Accueil, la pastille du menu, les Tâches.
Disparaissent : la puce « À commander · 3 » (état `prEtat`), `sxNbPourInter` en gros chiffre, les chiffres propres de Produits et de Commandes. Le mot est « **N à commander** » (N = lignes de panier),
« dont N pour une intervention » en sous-ligne. ⚠️ Le groupe « À surveiller » de la liste de Stock n'affiche PAS de nombre (il compte des articles, la tuile des lignes : deux unités, pas deux chiffres qui se contredisent).
Les demandes d'achat d'article du catalogue (`DEM_ACHAT` avec `pid`, `etat` en attente) entrent dans le panier avec la mention « Demandé par Tom » ; une fois traitées dans Achats et frais (état ≠ attente) elles en sortent
(sinon « Transférer 6 kg et commander 4 kg » compterait deux fois).

### 3.2 UN compte de « camions à remplir »

Nouvelle fonction **`camionsARemplir()`** → `{ camions:[{l, manques:[…]}], n }` : lieux de type `vehicule`, non fermés (`bxActifs`), **sans** `bxGarage(l.id)`, avec au moins un `bxManques`. `n` = nombre d'ARTICLES qui manquent
(somme des `bxManques`), c'est le chiffre du bouton « Remplir les camions · 6 », de la tuile de Stock, de la carte de l'Accueil et de Véhicules (« 6 articles manquent dans 2 camions »). Un camion au garage a sa pastille « Au garage »
et la phrase « On le remplira à son retour » ; il n'est ni orange ni compté (F3 : Stock le réassortissait, Dépôts non).

### 3.3 États d'un article (4 mots, `matEtat(x)` remplace `prEtat`)

| Condition | Pastille | Couleur |
|---|---|---|
| `enCommande(x) > 0` | « Commandé · arrive le 3/11 » (date de la commande, sinon « en route ») | `st-b` |
| sinon `x.q ≤ 0` et `x.seuil > 0` | « Plus en stock » | `st-r` |
| sinon `x.q ≤ x.seuil` et `x.seuil > 0` | « Bientôt fini » | `st-o` |
| sinon `x.q ≤ 0` et pas de seuil (acheté à la demande, jamais en stock) | « Acheté au besoin » (sans quantité) | `st-g` |
| sinon | rien (le normal est silencieux) | — |

« Sur commande » disparaît comme état (F9) ; « Épuisé » devient « Plus en stock » ; « À commander » comme ÉTAT d'article disparaît (c'est le panier qui dit « à commander »).

### 3.4 Les mots (avant → après), partout où l'ancien s'affiche : écrans, feuilles, toasts, tuiles, journal, courriels préparés, visites, guide, droits d'Équipe

| Avant | Après |
|---|---|
| Mouvements | Ce qui a bougé |
| Entrée / Sortie / Transfert (boutons) | Ranger dans le stock / Sortir du stock / Déplacer |
| Correction, Inventaire | Compter (« écart de comptage » dans le journal) |
| Valider (geste de technicien) / « Tout valider » / « À valider » | Accepter / « Tout accepter » / « À accepter » (« Valider tout seul » → « Accepter tout seul ») |
| Réassort des camions | Remplir les camions |
| Dotation, « sous sa dotation » | « ce qu'il doit y avoir à bord », « il manque 3 articles » |
| À remettre à bord | il manque (la carte et le bandeau ; « Il manque à bord » reste dans Mon camion) |
| Épuisé / À commander (état) / Sur commande | Plus en stock / Bientôt fini / Acheté au besoin |
| Alerte à 3, seuil | « Je te préviens quand il en reste moins de 3 » |
| Franco de port | « Livraison gratuite à partir de 150 € » ; « Plus que 99,60 € pour la livraison gratuite » |
| Reliquat | « Ce qui n'est pas encore arrivé », « Le reste arrive le … » |
| Réceptionner / Valider la réception | « J'ai reçu la livraison » / « Ranger dans le stock » |
| Rapprocher la facture | « Comparer avec la facture » (« Vérifier la facture » dans l'Accueil) |
| Fournisseur local | supprimé |
| CSV, FAB-DIS | « un fichier de prix (un tableau Excel que ton fournisseur t'envoie) » |
| Lire une facture (IA) / « lue par l'IA » | « Photographier une facture » / « lue automatiquement » (le sigle disparaît) |
| Produit facturé / Matériel de l'équipe / Prix à compléter | « Ce que je vends au client » / « Mon matériel (non facturé) » / « Prix à compléter » |
| BC-2026-039, BR-2026-017 (à l'écran) | « Commande 2026-039 », « Bon de remise 2026-017 » ⚠️ l'affichage seulement : les documents PDF et les données gardent leur numéro |
| Où est… ? (Dépôts) | la recherche de Stock |
| Boxes | n'apparaît plus (le menu l'a déjà renommé) |

**Mots gardés** (l'artisan les dit) : stock, atelier, camion, bon de commande, bon de remise, livraison, facture, devis, fournisseur, prix HT. Tutoiement partout. Une phrase = 60 signes de titre au plus.

### 3.5 Les nombres

Un seul formateur `eur()` : « 2 306,50 € » (espace fine insécable, virgule, deux décimales) — fin du « 1724 € » (cartes de Dépôts, comptage, fiche d'un lieu) et du « 12.5 » (frais de port). Quantités : `prNum` (virgule, jamais de point) ;
unités au pluriel juste (`prU`). Durées « 1 jour », dates « mardi 3 novembre » (`jCourt`). Aucun point d'abréviation.

### 3.6 Annuler et toasts

`sxToast(msg, actions)` : « fait + conséquence + Annuler », 8 secondes, posé au-dessus de la barre du bas, `pointer-events:none` sur le texte (un toast n'avale pas le toucher de ce qu'il couvre). `sxAnnule` restaure la photo du stock
d'avant : **toute feuille neuve passe par `stkAppliquer` ET garde cette photo**. Exemples : « 2 envois acceptés · Annuler », « 6 articles mis dans 2 camions · Annuler », « Commande envoyée à Clim Pièces Atlantique · Annuler (jusqu'à l'ouverture du courriel) ».

### 3.7 Une seule fabrique par verbe

| Verbe | Fonction unique | Portes qui l'appellent |
|---|---|---|
| Dire ce qui s'est passé (stock) | `matFeuille(mode, pre)` (remplace `stkFormVue`, `sxEntreeVue`, `sxTForm` pour la partie saisie) | Stock › Mettre à jour ; fiche d'article ; fiche d'un lieu ; Mon camion ; clôture d'intervention ; fiche d'intervention « Pièces et produits utilisés » |
| Compter | `matCompter(lieuId)` (reprend `stkVueInventaire`/`bxInv` + `sxInvValider`) | fiche d'un lieu ; Stock › Plus › Compter un lieu ; Stock › Mettre à jour › J'ai compté |
| Il me manque une pièce | `matManque({inter})` (réunit `sxManqueVue` et `pdxPmOuvrir`/`pdxPmEnvoyer`) | Mon camion ; fiche d'intervention |
| Fiche d'article | `prFiche(id)` (UNE définition) | Stock, Articles, une commande, un lieu, le journal, une recherche |
| Fiche d'un lieu | `bxFiche(id)` (UNE définition, `lieuFiche` n'en est plus qu'un alias) | Dépôts, Stock (filtre), Véhicules, Mon camion (lecture) |

---------------------------------------------------------------------------------------------------------------------------------

## 4. Qui voit quoi

| Capacité | Gérant (Marc) | Bureau (Julie, rôle « gestion ») | Technicien (Sophie) |
|---|---|---|---|
| Menu | groupe « Matériel » : Stock · Fournisseurs, matériel & produits · Dépôts et camions | groupe « Matériel » : **Stock · Fournisseurs, matériel & produits** (jamais d'autres mots, moins de lignes) | « Mon camion » (barre du bas : Camion) |
| Chercher un article, voir où il est, combien | oui | **oui** (aujourd'hui : impossible) | oui, SANS prix, SANS valeur, depuis Mon camion |
| Accepter / refuser les envois des techniciens | oui | non (case à donner dans Équipe) | non |
| Sortir, ranger, déplacer, compter | oui | oui (sauf Dépôts : pas de rubrique) | seulement ses trois gestes (utilisé, pris, il me manque) |
| Préparer, envoyer, recevoir une commande, comparer la facture | oui | **oui** | non (il demande une pièce) |
| Photographier une facture | oui | **oui** | non |
| Changer un prix de vente, retirer un article, ajouter ou retirer un fournisseur | oui | non (prix d'achat et fiche : oui) | non |
| Voir prix d'achat, marge, valeur du stock | oui | oui | **jamais** |
| Réglages du stock, ce qu'il doit y avoir à bord, nouvelle réserve, fermer un lieu | oui | non | non |
| Registre des fluides (lecture, export) | oui | oui | sa bouteille et ses kilos dans l'intervention (inchangé) |

Mise en œuvre : `ROLES.gestion.routes` reçoit `stock`, `produits` ; les actions réservées passent par `rlPermis('…')` (déjà utilisé : `rlPermis('devis')`) avec les clés `stockAccepter`, `stockReglages`, `produitsPrixVente`,
`boxes` — aujourd'hui ces cases d'Équipe « n'agissent pas » (MENU-FINAL, constat 7) : en attendant le chantier « droits d'Équipe qui agissent », le rôle `gestion` porte ces clés en dur et le dit dans son `d:`.
Un bouton qu'un rôle n'a pas est ABSENT, jamais grisé sans raison (si une case manque, infobulle « Ton accès ne le permet pas »). La phrase de l'écran Achats « Tu vois les demandes pour préparer les commandes » devient vraie.

---------------------------------------------------------------------------------------------------------------------------------

## 5. STOCK — route `stock` — « Qu'est-ce qu'il me reste, et où ? »

Rôles : gérant, bureau (§4). Une seule définition de `vueStock` (supprimer les deux anciennes et l'enveloppe `sxVueStock0`).

### 5.1 Page « Articles » (ordinateur)

Ordre, de haut en bas :

1. **En-tête** : surtitre « Matériel » · titre « Stock » · phrase « Ce qu'il te reste, et où il est. » · à droite : `btn` noir « ＋ Mettre à jour le stock » (ouvre la feuille §5.3) + `btn gris` « Plus ▾ » (menu §5.5).
2. **Bandeau « envois à accepter »** — `.carte.dv-focus` d'UNE ligne, seulement si `STK_VALID` ET `MVTS_ATT.length` ET `rlPermis('stockAccepter')` : coche ronde, « **2 envois à accepter** » (gras), sous-ligne « Tom et Sophie » ; à droite
   `btn gris petit` « Voir » (feuille §5.4) et `btn petit` « Tout accepter » (agit : « 2 envois acceptés · Annuler »). Plus de bandeau de 4 lignes, plus de « et 5 autres choses ».
3. **Trois tuiles** `.kpis.ptx-k3`, toujours là : « **5** · à commander » (orange si > 0 ; touche → Fournisseurs › Commandes) · « **2** · livraisons attendues » (commandes envoyées/confirmées non reçues ; orange si l'une est en retard ; touche → Commandes) ·
   « **6** · manquent dans les camions » (`camionsARemplir().n`, orange si > 0 ; touche → Dépôts et camions). À zéro : « 0 » vert, « rien à commander », « aucune livraison attendue », « les camions sont prêts ».
4. **Onglets** `.seg` : « Articles » · « Ce qui a bougé ».
5. **Recherche** (onglet Articles) : `.saisie` « Chercher un article, une référence… » (curseur dedans à l'ouverture sur ordinateur seulement) + `btn gris` « **Partout ▾** » (menu des lieux : Partout · L'atelier · chaque camion en service ou au garage · chaque réserve ouverte).
   Elle REMPLACE : les 6 tuiles de lieux, les 6 puces, « Gérer les lieux › », les 3 filtres Tout/À commander/Dans les camions, et la recherche « Où est… ? » de Dépôts.
6. **Liste** dans UNE carte `.carte.dv-liste`, deux sections `.groupe` seulement :
   - « **À surveiller** » (sans nombre) : les articles de `matEtat` bleu, rouge ou orange, dans cet ordre ;
   - « **Tout le reste** » : de A à Z. Au-dessus de 40 articles, regroupé par catégorie du métier (`PACKS[métier].cats`), groupes repliables.
   Une ligne (71 px) : à gauche une tuile de 40 px (icône filaire de la catégorie) ; au milieu le nom en gras + sous-ligne « Atelier 5 · Sophie 2 · Karim 3 » (les lieux où il y en a, trois au plus puis « +1 lieu ») ; à droite `.fo-dr` : la quantité totale en gras
   (« 10 kg », « 2 lots ») et en dessous la pastille de `matEtat` s'il y en a une. **Pas de prix, pas de référence, pas de valeur dans la ligne.** Quand « Partout » est remplacé par un lieu : la quantité est celle du lieu (« 2 sur 4 » si ce lieu a une quantité prévue).
   Toucher la ligne = la fiche d'article (§5.6).
7. **Pied de liste** (gris, une ligne) : « 29 articles · 2 306,50 € de matériel (prix d'achat HT) » (bureau : oui ; jamais un technicien).
8. **Carte « Le plus simple possible »** (4 puces) : « Tape le nom d'un article : tu vois où il est. » · « Quand un article est bientôt fini, il apparaît dans À commander, avec le bon fournisseur. » · « Ce que ton équipe a pris attend ton accord avant de sortir du stock. » · « Chaque geste se défait avec Annuler. »

**États vides** : stock vide « Ton stock est vide » / « Commence par noter ce que tu as à l'atelier. » [＋ Ajouter un article] [Choisir parmi les articles habituels de mon métier] — recherche sans résultat « Rien trouvé pour « condensat ». » [＋ Ajouter « condensat »] —
lieu sans l'article « Pas de Filtre G4 dans le camion de Karim. Il y en a 3 à l'atelier. ».

**Mesure visée** : première ligne d'article vers 380 px (0,42 écran) sans bandeau, 0,5 avec ; ≤ 12 éléments touchables avant elle ; à 1366×768 six lignes visibles sans défiler.

### 5.2 Page « Articles » (téléphone)

Même ordre, une colonne : barre du haut (Menu, logo) · surtitre + « Stock » avec « ＋ Mettre à jour le stock » **à droite sur la même ligne** (le titre est court : ça tient à 390, 360, 320) · bandeau (texte, puis « Voir » et « Tout accepter » côte à côte, boutons 44 px) ·
trois tuiles en une rangée (`ptx-k3`, chiffre 20 px) · onglets · recherche (flex) + « Partout ▾ » (110 px) sur **la même ligne** · liste. Lignes ≥ 64 px, quantité à droite 18 px gras, sous-ligne sur deux lignes au plus, rien coupé par « … » sans raison.
La barre du bas ne recouvre pas la dernière ligne (rembourrage bas). Première ligne d'article à ≈ 0,5 écran (aujourd'hui 2,8). iPad : mise en page ordinateur ; le menu latéral ne coupe plus « Dépôts et camions » (défaut F14 du menu : pied Jour/Nuit/Auto sous le défilement DU menu — **dépendance : à corriger dans le chantier menu avant la recette**,
sinon on ne voit pas ces écrans sur Windows 1366×768 ni sur iPad).

### 5.3 Feuille « Mettre à jour le stock » (la porte unique des gestes du gérant et du bureau)

Panneau de droite (Mac/iPad), feuille du bas (téléphone). Titre « **Que veux-tu faire ?** ». Quatre grandes lignes de 58 px (icône 28 px + titre gras + phrase grise), en une colonne :

| Ligne | Phrase | Ouvre |
|---|---|---|
| **Sortir du stock** | « Pour un client, pour un collègue, ou parce que c'est cassé ou perdu » | a) |
| **Ranger dans le stock** | « Une livraison, un achat au comptoir, un retour de chantier » | b) |
| **Déplacer** | « D'un lieu à un autre, par exemple de l'atelier à un camion » | c) |
| **Compter** | « Je vérifie ce qu'il y a vraiment dans un lieu » | d) |

Ouverte depuis la fiche d'un article ou d'un lieu, la feuille saute cette étape et arrive déjà remplie (l'article ou le lieu choisi). Toute feuille s'ouvre sur CE QUE LA PERSONNE SAIT : l'**article** d'abord, jamais les 4 listes du système (De, Pour qui, Pourquoi, Intervention).
Le bouton noir collé en bas dit le geste et la quantité (« Noter : j'ai sorti 2 »). Jamais grisé sans raison : une ligne rouge dessous dit quoi (« Choisis un article »). Au-dessus, **une phrase de contrôle** (visible clavier ouvert) : « Tu notes : 2 Condensateurs 5 µF sortis de l'atelier, pour Camping Les Pins. »

**a) Sortir du stock** — 1) « Quel article ? » champ de recherche ; les résultats montrent la quantité À L'ENDROIT choisi ; on touche → une ligne avec « − 1 + » (44 px) ; « ＋ Un autre article ». 2) « Sorti d'où ? » `select` : L'atelier (défaut) ou un camion.
3) « Pour qui ? » trois pastilles `.seg` : « Un client » · « Un collègue » · « Cassé ou perdu » ; un seul champ suit : « Quel client ou quelle intervention ? » (recherche, les interventions du jour d'abord) / « Quel collègue ? » / « Qu'est-ce qui s'est passé ? » (libre ; « cassé » ou « perdu » se dit ici et part dans le résumé du journal).
4) Pour « Un collègue » : case cochée « Faire un bon de remise » (le bon se fabrique comme aujourd'hui : `stkBon`). Écrit un mouvement `sortie` avec `pourQui`/`motif`/`inter`/`br` — mêmes champs qu'aujourd'hui.
**b) Ranger dans le stock** — 1) « D'où ça vient ? » `.seg` : « Une livraison » (liste des commandes attendues ; en toucher une = on est dans « J'ai reçu la livraison », §7.2) · « Un achat au comptoir » · « Un retour (chantier ou collègue) ». Pour « achat au comptoir » : montant + case cochée
« Ranger le ticket dans les achats » (écrit une ligne dans `ACHATS`, comme aujourd'hui). 2) articles et quantités. 3) « Où je le range ? » (L'atelier par défaut). 4) une ligne « Tu as la facture ? Photographie-la, tout se range seul. » (→ §7.2 Photographier une facture). Écrit des `entree`.
**c) Déplacer** — « De » et « Vers » côte à côte avec une double flèche qui les échange, articles et quantités ; si la destination est un camion au garage : « Ce camion est au garage. Tu les mets quand même ? » (jamais un refus muet). Écrit des `transfert`.
**d) Compter** — liste des lieux avec la date du dernier comptage en toutes lettres (« compté il y a 3 mois » ; « pas encore compté » en orange) → `matCompter(lieu)` (§5.7).

Quand l'envoi doit être accepté (`STK_VALID`, geste d'un autre que le gérant) : même enregistrement dans `MVTS_ATT` (comme aujourd'hui), message « Envoyé au gérant · Annuler ».

### 5.4 Feuille « Envois à accepter » (depuis le bandeau)

Une ligne par envoi, en PHRASE, dans l'ordre de `MVTS_ATT` : avatar (`avatar(t)`), « **Tom a pris 2 Aérosols nettoyant à l'atelier pour son camion** », sous-ligne grise « Il y en a 8 à l'atelier : après acceptation, il en restera 6 » (le bon langage existant, repris tel quel ; en orange et gras si « il en restera 0 »),
`btn gris petit` « Accepter » et `lien` rouge « Refuser » → mini-feuille « Pourquoi ? » (trois réponses rapides « Trop cher », « Pas cette semaine », « On en a déjà », + champ libre ; `btn` noir « Refuser » ; le technicien reçoit le motif par `notifier`, comme `sxRefus`). Pied : `btn` noir « Tout accepter ».
Si une ligne ferait tomber un article sous zéro : « Il n'y a que 1 Gants à l'atelier : on en note 1. » (`stkAppliquer` plafonne et la trace dit ce qui a vraiment bougé). Vide : « Rien à accepter » / « Quand un technicien prend ou utilise du matériel, tu le vois ici. ».

### 5.5 Menu « Plus ▾ » de Stock

« Registre des fluides » (seulement si l'entreprise a des bouteilles : `SX.bout.length` ou un article de la catégorie fluides) · « Compter un lieu… » (liste §5.3 d) · « Exporter l'historique » (PDF ou tableur, simulés comme aujourd'hui, le dire) · « Réglages du stock » (feuille ci-dessous) · « Annuler le dernier geste » (grisé s'il n'y en a pas).

**Feuille « Réglages du stock »** (gérant seul) — trois réglages, chacun avec sa phrase, plus jamais au-dessus de la file de travail :
« Je dois accepter ce que les techniciens notent » (interrupteur, `STK_VALID`) ; « Accepter tout seul ce qu'un technicien a utilisé chez un client — seul ce qu'il prend à l'atelier me demande mon accord » (interrupteur, `SX.autoUsage`) ;
« Me rappeler de compter chaque lieu tous les [3] mois » (nombre, `SX.freq` — valeur par défaut globale ; la valeur d'un lieu seul se règle dans « Modifier ce lieu »). Les alertes de bouteille de fluide (reste ≤ 1 kg) restent une constante, pas un réglage de plus.

**Registre des fluides** (feuille large, depuis Plus, la fiche d'un fluide, la fiche d'intervention) : titre « Registre des fluides », « Du 1er janvier au 16 novembre 2026 » avec une liste « Cette année ▾ » (cette année, l'an dernier, choisir) ; **une ligne de totaux PAR fluide** (« R32 : 12,4 kg chargés · 3 kg récupérés » ; « R410A : … » —
les deux tuiles globales qui mélangeaient R32 et R410A disparaissent) ; le tableau : date, client, appareil, fluide, kilos chargés, kilos récupérés, bouteille, technicien ; `btn` noir « Exporter en PDF » (simulé). Chaque ligne client est un lien vers l'intervention. Données : `SX.reg`, `SX.bout` (inchangées). Réponse à F8 : trois touchers depuis le menu (Stock › Plus › Registre des fluides).

### 5.6 Fiche d'un article (UNE seule fenêtre) et « Ajouter / modifier un article »

Panneau 520 px / feuille du bas. Une définition `prFiche` (supprimer les trois), ouverte depuis partout. Du plus utile au moins utile, **plus de tableau de treize lignes de même poids** :

1. **Nom** en grand ; dessous `.gris` « Réf. FR-32 · Frigo Distribution 17 » (le fournisseur est un lien vers sa fiche) ; la catégorie en surtitre.
2. **La réponse** (34 px gras) : « **Il en reste 10 kg** » + la pastille de `matEtat` ; dessous la répartition en phrase : « À l'atelier 5 · dans le camion de Sophie 2 · dans celui de Karim 3 » (chaque lieu se touche → la fiche du lieu) ; puis deux petites phrases : « Je te préviens quand il en reste moins de 3 » (se modifie en touchant ; sous le champ : « Conseil : sous 4, d'après ce que tu utilises » + `lien` « Mettre 4 », calculé par `cmdSuggere`/`PR_CONSO`) et « Tu en utilises environ 2 par semaine : de quoi tenir 5 semaines. ».
3. **Boutons** : noir selon la situation — « Commander » si `matEtat` orange/rouge (ajoute au panier du fournisseur ; sans prix : « Pas de prix : ajoute-le pour que la commande se prépare ») sinon « Sortir du stock » ; puis `btn gris` « Ranger » et « Déplacer » (ouvrent §5.3 déjà remplie). Technicien : lecture seule + « J'ai utilisé » / « Il me manque ».
4. **Section « Prix »** (ouverte ; absente pour le technicien) : « Je l'achète 46,00 € HT » avec la hausse en toutes lettres (« 7,9 % de plus qu'avant ») ; « Je le vends 69,00 € HT » ; « Marge : 33 % » ; « TVA 20 % » ; chaque valeur se corrige en la touchant puis `btn petit` « Enregistrer » (bureau : le prix de vente n'est pas modifiable) ;
   dessous « Chez d'autres fournisseurs : Clim Pièces Atlantique 44,50 € » + `lien` « Passer chez lui » (seulement s'il y en a un de moins cher) ; le conseil devient une ligne : « Pour garder 40 % de marge, vends-le 76,70 € HT » ; la courbe de prix passe dans « Plus de détails ».
5. **Sections repliées par défaut** (accordéons `.ligne-clic` avec ›) : « Où il est » (le détail par lieu avec « Déplacer » sur chaque ligne) · « Derniers gestes » (5 phrases + « Tout voir » → Ce qui a bougé filtré sur l'article) · « Dans tes documents » (« Utilisé dans 6 interventions et 2 devis »).
6. **Fluide** : section « Bouteilles » (capacité, il reste, où, état Pleine / Entamée / Vide à rendre) et le lien « Registre des fluides ›».
7. **Pied** : `btn gris` « Modifier » ; `lien` rouge « Retirer cet article » (avertit s'il reste du stock ou une commande ; « Annuler » ensuite).

**« Ajouter un article » / « Modifier »** : QUATRE champs d'abord (au lieu de onze) : « Nom » (en tapant : « Rangé dans : Climatisation › Pompes à chaleur · Changer » — le rangement automatique `prRanger`, l'atout pour un novice, est GARDÉ ; l'unité suit) ·
« **Je le vends au client ?** » deux grands choix « Oui, je le facture » / « Non, c'est du matériel pour mon équipe » (c'est le concept « produit ou matériel » dit en une question : il remplace les trois étiquettes ; la donnée reste `pv` vide = matériel, `prVend`) · « Prix de vente HT » (seulement si Oui) · « Combien j'en ai » + unité.
Puis « Plus de détails ▾ » : référence, fournisseur, unité, « Me prévenir quand il en reste moins de », prix d'achat HT, TVA, métier. Contrôles gardés : doublon (« Il existe déjà « Condensateur 5 µF ». L'ouvrir ? », `pdxDoublon`), vente à perte (« Tu le vends moins cher que tu l'as acheté »). Bouton noir collé « Ajouter l'article ». Toujours `prCatalogueMaj()` après.

### 5.7 Feuille « Compter » (`matCompter`) — UNE seule porte

« Compter l'atelier » (ou « Compter le camion de Karim »), « dernier comptage il y a 40 jours » ; en haut `btn gris` « Tout est juste » (met tout au prévu) ; « Pour chaque article, dis combien il y en a. Touche seulement ceux qui sont différents. » ; chaque ligne montre « Prévu 3 » et un « − 3 + » ;
l'écart se dit en phrase (« 2 de moins que prévu » ; sa valeur en euros, en petit à droite, jamais pour un technicien) ; « Compter par catégorie » replie les lignes. `btn` noir collé « Enregistrer le comptage » : un comptage sans écart se valide aussi et date le lieu (`SX.invs`) ; chaque écart écrit une ligne `correction` affichée « écart de comptage » (`sxInvValider`). Clavier numérique, champs 16 px.

### 5.8 Onglet « Ce qui a bougé » (le journal)

Une recherche « Chercher un article, une personne, un client, un bon de remise… » + UN `btn gris` « Filtrer · 2 » (feuille : Quoi — Tout / Pris / Rangé / Déplacé / Compté ; Où ; Qui ; Quand — aujourd'hui, 7 jours, ce mois, choisir) : plus de quatre champs empilés.
Liste groupée par jour (« Aujourd'hui », « Hier », « Lundi 2 novembre ») dans une `.carte.dv-liste`. **UNE LIGNE = UNE PHRASE**, rond gris de 32 px avec icône (`sortir`, `ranger`, `deplacer`, `compter`) :
« Sophie a utilisé 1 Condensateur 5 µF chez Camping Les Pins » · « Tom a pris 8 Aérosols nettoyant à l'atelier pour son camion » · « Julie a rangé la livraison 2026-039 : 6 kg de R410A » · « Karim a compté son camion : 2 raccords de moins que prévu » (le lieu n'est jamais écrit deux fois).
À droite l'heure et, au besoin, « accepté par Marc » / pastille `st-o` « À accepter » (touche → feuille §5.4). Noms d'article/client/commande/bon : vrais liens (§2). **Plus de colonne de montants.** Pied : « 38 gestes · 74 € sortis · 12 € cassés ou perdus ». La dernière ligne porte « Annuler ce geste ».
Vide : « Rien n'a bougé pour l'instant. » / « Change la période ou les filtres. ».

---------------------------------------------------------------------------------------------------------------------------------

## 6. DÉPÔTS ET CAMIONS — route `boxes` — « Mes camions sont-ils prêts ? »

Rôles : gérant seulement (le bureau n'a pas cette rubrique ; le conducteur a « Mon camion »). Une définition de `vueBoxes` (supprimer les deux anciennes et le code mort `bxMonCamion`).

### 6.1 Page (ordinateur)

1. **En-tête** : « Matériel » · « Dépôts et camions » · phrase « Ce qu'il y a dans chaque camion et chaque dépôt. Pour chercher un article, va dans [Stock]. » ([Stock] est un `lien`) · `btn` noir « **Remplir les camions · 6** » (6 = `camionsARemplir().n` ; quand tout est rempli le noir devient « ＋ Nouvelle réserve », seulement pour un métier qui en a) + `btn gris` « Plus ▾ »
   (« Compter un lieu… » · « Nouvelle réserve chez un client » · « Réserves fermées (2) » · « Exporter »).
2. **Bandeau « tâche » d'UNE ligne**, seulement s'il y a lieu : « **Avant les visites : 4 pièces prévues manquent dans 3 camions** » (sous-ligne « Sophie, Karim, Tom · Mise en service pompe à chaleur ») → feuille « Avant les visites » (§6.3). C'est `bxBesoins`, la meilleure idée de l'écran ; elle n'est plus une ligne parmi six.
   Les autres lignes de l'ancien « À faire maintenant » deviennent des ÉTATS de carte (à remplir, au garage, à compter, réserve basse).
3. **Cartes** `.cartes-clients` en trois groupes titrés `.groupe` : « Les camions », « L'atelier », « Les réserves chez les clients » (absent s'il n'y en a pas ; les réserves fermées sont dans « Plus »).
   Carte `.client-carte` (la même pour tous, **même hauteur**) :
   - ligne 1 : nom « Camion de Sophie » (17 px gras) + UNE pastille : « Prêt » `st-v` · « Il manque 3 articles » `st-o` · « Au garage » `st-b` ;
   - ligne 2 `.gris` : « Sophie Martin · GH-482-KL » (la plaque est un lien vers Véhicules) ; réserve : « Réserve chez Hôtel de la Plage » ;
   - ligne 3 `.gris.petit`, seulement si non prêt : « Il manque : Filtre à charbon, Fluide R32, Nettoyant échangeur » (deux noms puis « et 1 autre ») ; au garage : « On le remplira à son retour » ; prêt : « Tout est à bord » ;
   - filet + `.client-chiffres` : « 6 » articles · « 225,00 € » en stock · « 12 oct. » compté (orange `Pas encore compté` ou `compté il y a 4 mois` si au-delà de la fréquence de comptage) ;
   - réserve chez un client sous sa quantité prévue : « 1 article à remettre avant la visite du jeudi 5 novembre ».
   - **aucun bouton** : toucher la carte ouvre la fiche (§6.2). Carte de l'atelier : « 26 articles · 1 724,00 € · 3 bientôt finis ».
4. **Carte « Le plus simple possible »** : « Touche un camion pour voir ce qu'il manque. » · « Remplir les camions met tout d'un coup ce que l'atelier a. » · « Ce que l'atelier n'a plus part dans la commande. » · « Chaque geste se défait avec Annuler. »

**Téléphone** : titre sur deux lignes si besoin ; `btn` noir « Remplir les camions · 6 » sur sa propre ligne, pleine largeur, 48 px ; « Plus » en bouton de 46 px à côté ; bandeau (deux lignes si le texte l'exige) ; cartes en UNE colonne (≈ 150 px de haut) ; **première carte à ≈ 0,35 écran** (aujourd'hui 1,9). iPad : deux colonnes ; ordinateur : trois jusqu'à 1 440 px, quatre au-delà. Les pastilles tiennent à 286 px.
**États vides** : aucun lieu « Ajoute ton premier camion » (renvoie à Véhicules) ; tout est prêt : le noir devient « ＋ Nouvelle réserve » et le bandeau disparaît.

### 6.2 Fiche d'un lieu (`bxFiche`, UNE définition ; le bon modèle de l'existant, gardé presque tel quel)

Panneau 520 px / feuille du bas. Surtitre « Camion · GH-482-KL » (ou « Atelier », « Réserve chez un client »), titre « Camion de Sophie », ligne grise « Conducteur : Sophie Martin » (+ plaque, lien Véhicules). **Trois tuiles** : « 6 articles », « 225,00 € », « 3 manquent » (orange).
Boutons : `btn` noir « **Remplir ce camion · 3** » (s'il n'y a rien à remplir, il devient « Sortir du stock ») · `btn gris` « Déplacer » · `btn gris` « Compter » · `btn gris` « Plus ▾ » (« Ce qu'il doit y avoir à bord » · « Changer le nom ou le conducteur » · « Copier la liste d'un autre camion » · « Fermer cette réserve » / « Rouvrir »).
Champ « Chercher dans ce camion ». Une liste, deux groupes `.groupe` : « **Il manque · 3** » en tête (le titre orange ; par ligne le nom, « 2 sur 3 · il manque 1 », « à l'atelier : 6 » en gris, `lien` « ＋ Ajouter » qui met 1 du stock de l'atelier) puis « **À bord · 6** » ; « Pour les visites de demain » (la part d'« Avant les visites » propre à ce camion) ; « Derniers gestes » (5 lignes + « Tout voir »).

### 6.3 Feuilles de Dépôts

- **« Remplir les camions »** (la même en ouvrant un seul camion) : phrase « Voici ce que l'atelier peut mettre dans chaque camion. Décoche ce que tu ne veux pas envoyer. » ; un bloc par camion EN SERVICE avec cases cochées d'office et « +3 » à droite ; ce que l'atelier n'a plus est gris : « Plus à l'atelier : Nettoyant échangeur » + `lien` « Ajouter aux commandes » ; un camion au garage n'y est pas (une ligne en bas dit pourquoi :
  « Le camion de Tom est au garage : on le remplira à son retour. » + `lien` « Le remplir quand même »). `btn` noir collé « Tout mettre dans les camions · 6 » → « 6 articles mis dans 2 camions · Annuler ». Surtitre toujours « Matériel » (il disait « Dépôts et camions » quand on l'ouvrait de Stock). Données : `bxTransferts`/`bxPreparer` (inchangées).
- **« Avant les visites »** : par visite des trois prochains jours : « **Sophie · Mise en service pompe à chaleur · demain 14:00 — il lui manque 1 Condensateur 5 µF. Il est à l'atelier.** » + `btn gris petit` « Le mettre dans son camion » ; si la pièce n'est nulle part : « Il n'y en a plus. » + « Ajouter aux commandes » ; si déjà commandée : « Arrive mardi 3, après la visite » + « Décaler l'intervention » (existant, gardé). Données : `bxBesoins` (inchangée).
- **« Ce qu'il doit y avoir à bord »** (réglage rangé dans Plus) : une ligne par article « doit toujours en avoir [3] » (− 3 +), « ＋ Ajouter un article », « Copier la liste d'un autre camion ». Données : `DOTATION[l.dot]` (inchangée).
- **« Compter »** : `matCompter(lieu)` (§5.7). **« Nouvelle réserve chez un client »** : « Quel client ? » (recherche), « Qu'est-ce qu'on y laisse ? » (kit de départ proposé), lien à la visite du contrat ; fermer/rouvrir sans perdre l'historique ; invisible pour un métier qui n'en a pas.

---------------------------------------------------------------------------------------------------------------------------------

## 7. FOURNISSEURS, MATÉRIEL & PRODUITS — route `produits` — « Qu'est-ce que je commande, chez qui, à quel prix ? »

Rôles : gérant et bureau. Titre exact (validé le 6 novembre) : « Fournisseurs, matériel & produits ». Trois onglets : « **Commandes** · N » · « **Articles** · N » · « **Fournisseurs** · N » (compteurs en petites pastilles rondes qui n'élargissent pas ; N de Commandes = `cmdNbACommander()` si > 0).
**L'onglet ouvert** est celui que l'appareil a quitté la dernière fois ; la première fois : Commandes ; un lien venu d'ailleurs (« 5 à commander ») l'ouvre explicitement sur Commandes. Le bouton noir change avec l'onglet, comme « ＋ Nouveau client » : « ＋ Nouvelle commande » / « ＋ Ajouter un article » / « ＋ Ajouter un fournisseur ».
**En-tête** : ordinateur : noir + `btn gris` « Photographier une facture » (icône appareil photo) + `btn gris` « Plus ▾ » (« Importer les prix d'un fournisseur » · « Choisir parmi les articles habituels de mon métier » · « Voir comment les articles sont rangés par métier » · « Trier par »).
Téléphone : le titre passe sur deux lignes ; dessous UNE rangée : noir (flex) + deux boutons carrés 46 px, appareil photo (`aria-label` « Photographier une facture ») et « Plus » (`aria-label` « Plus d'actions »). Disparaissent : les 2 boutons d'en-tête d'avant, les 4 tuiles (dont « 3 métiers »), le bandeau NOUVEAU, les 4 raccourcis, les 3 rangées de filtres (24 éléments avant la première ligne).

### 7.1 Onglet « Commandes » (`vueCommandes`, une seule définition)

1. **Carte « À commander · 5 »** (si `cmdNbACommander() > 0`) : en-tête « 5 articles chez 3 fournisseurs » + `btn gris` « Tout préparer · 3 » (une commande sans prix reste décochée d'office, comme aujourd'hui, et le dit) ; puis UN bloc par fournisseur (`cmdPaniers`) :
   nom en gras « Clim Pièces Atlantique », sous-ligne « Livraison en 1 jour · 50,40 € HT » ; chaque ligne : article, **une phrase de 60 signes au plus** « Il en reste 0 · pour l'intervention du lundi 2 novembre, Camping Les Pins » (le détail « tu en utilises ≈ 0,1 par semaine… » passe derrière une icône « i » ;
   la mention « Demandé par Tom » pour une demande d'équipe), à droite « − 6 + » (44 px, quantité calculée par `cmdSuggere`) et `lien` « Retirer » 44 px (le ✕ de 40 px disparaît) ; pied : la barre de livraison gratuite (« Plus que 99,60 € pour la livraison gratuite — sinon 12,50 € de port » ; `cmdFranco`) avec `lien` « ＋ Nettoyant échangeur (il t'en reste 7) »,
   la ligne « Chez Frigo Distribution 17 : 2,10 € de moins » + « Le prendre chez lui » (`cmdMoinsCher`) et UN `btn gris` « Préparer la commande » (les trois noirs identiques d'avant disparaissent).
   Un article sans prix : ligne grise « Pas de prix : ajoute-le pour que la commande se prépare ».
2. **Carte « Les commandes »** : `.dv-liste`. Groupes `.groupe` selon ce qu'il y a à FAIRE : « À traiter » (retard, brouillon, facture arrivée, livraison partielle) puis « En route ». Ligne : « **Commande 2026-039 · Frigo Distribution 17** » / sous-ligne « 276,00 € HT · attendue demain » / pastille `st` (Brouillon gris · Envoyée bleu · Confirmée bleu · Livraison partielle orange · **En retard d'1 jour rouge** · Facture à comparer orange) /
   à droite ordinateur : `btn gris petit` « **J'ai reçu la livraison** » (téléphone : « J'ai reçu ») pour envoyée/confirmée ; « Relancer » pour une commande en retard ; « Comparer » pour une facture arrivée. Plus de tuile « commandé en octobre » (sans action : « Commandé en octobre : 1 121,20 € HT » devient une ligne grise du lien suivant).
   `lien` « Voir les commandes terminées (12) » : accordéon ; ordinateur = tableau lisible (n°, fournisseur, montant HT, date, état), téléphone = cartes.
3. **Carte « Le plus simple possible »** : « Un article bientôt fini arrive ici tout seul, avec le bon fournisseur. » · « La quantité se calcule sur ce que tu utilises. » · « Quand la livraison arrive, touche J'ai reçu la livraison : le stock se met à jour. » · « Photographie la facture : les prix se mettent à jour. »

**États vides** : « Aucune commande pour l'instant. » / « Quand un article sera bientôt fini, il apparaîtra ici avec le fournisseur déjà choisi. » ; fournisseur sans e-mail pour les commandes : ligne rouge « Il manque son e-mail pour envoyer la commande » avec le champ pour le mettre ici.

### 7.2 Fenêtres de commande

- **« Préparer la commande » / « Nouvelle commande »** (`cmdEdVue`, c'est le bon de commande que Justin a trouvé réussi : **on garde son allure**) : fournisseur, lignes avec « − 6 + » et la raison en UNE phrase, ✕ → « Retirer », « ＋ Ajouter un article » (recherche), « Où livrer ? » (À l'atelier · Au comptoir · Sur le chantier), « Pour quand ? », une note.
  **UN seul bouton noir collé en bas : « Envoyer à Clim Pièces Atlantique »** — l'aperçu du message et du PDF vivent dans la même feuille (« Voir le message » replié) : l'étape « Vérifier et envoyer » disparaît ; `btn gris` « Enregistrer sans envoyer ». Le PDF et le courriel (`cmdDoc`, `cmdMail`) ne changent pas (documents : à ne pas modifier sans relecture).
- **Fiche d'une commande** (`cmdFiche`) : surtitre « Commande 2026-039 », titre le fournisseur, une phrase « 509,20 € HT · livraison prévue jeudi 5 novembre » ; une frise d'UNE ligne « Préparée · Envoyée · Livrée · Facture comparée » (`cmdEtapes` ; « confirmée » devient une note) ; les lignes avec « reçu 4 sur 6 » ;
  UN seul bouton noir selon l'état : « Envoyer… » (brouillon) · « J'ai reçu la livraison » (envoyée/confirmée) · « Comparer avec la facture » (livrée) ; sous « Plus » : « Modifier », « Le fournisseur a confirmé », « Relancer », « Voir le bon (PDF) », « Recommander la même chose », « Annuler la commande », « Voir ce que voit le fournisseur » (démonstration, marquée comme telle).
- **« J'ai reçu la livraison »** (`cmdReception`) : chaque ligne préremplie à la quantité commandée avec « − + » ; `btn gris` « Tout est arrivé » ; s'il manque quelque chose : « Il en manque 2. On les attend le [date] » ; « Où ranger ? » (L'atelier par défaut) ; une pièce mise de côté dit « Gardée pour l'intervention du lundi 2 novembre » ;
  « Ajouter le numéro du bon de livraison » replié ; `btn` noir collé « Ranger dans le stock » → « Livraison rangée : 6 kg de R410A · Annuler ». Écrit les `entree` et la ligne d'`ACHATS` comme aujourd'hui.
- **« Comparer avec la facture »** (`cmdRappro`) : « La facture dit 276,00 €. La commande dit 276,00 €. C'est bon. » + `btn` noir « Tout est bon » (le prix d'achat suit, la marge est gardée) ou « Le fournisseur a facturé 48,00 € au lieu de 46,00 € pour 6 kg de R410A » (une phrase par écart, orange) + `btn gris` « Contester » (le courriel part prêt).
- **« Photographier une facture »** (`fournFacture`/`foFactureVue`/`foFactureValider`) : deux grandes lignes « Prendre en photo » et « Choisir un fichier » ; résultat lu automatiquement « J'ai lu 4 lignes : 6 kg de R410A à 46 €… » ; les hausses en toutes lettres (« +0,60 € sur le R410A ») ; `btn` noir « Mettre à jour le stock et les prix » ; si une commande ouverte correspond : « C'est la commande 2026-039 ? ». Ouverte depuis l'en-tête (ordinateur et téléphone), la fiche d'un fournisseur, et « Ranger dans le stock ».

### 7.3 Onglet « Articles » (le catalogue)

Un champ « Chercher un article, une référence, un fournisseur » (`pdxChercheOk` : sans accent, tous les mots) + UNE liste « Tout ▾ » (Tout · Ce que je vends au client · Mon matériel (non facturé) · Prix à compléter N) ; si l'entreprise a plusieurs métiers, une seconde « Tous mes métiers ▾ ». Fin des trois rangées de filtres, des 7 pastilles d'état (l'état est l'affaire de Stock), du tri en vue (→ Plus) et du bandeau NOUVEAU.
Un seul bandeau, seulement quand il sert : « 6 articles attendent leur prix » + « Les compléter ». **Liste** dans une `.dv-liste`, un seul niveau de groupe = la CATÉGORIE (le métier devient un filtre ; titres `.groupe` repliables, les articles les plus utilisés d'abord dans chaque groupe : le Fluide R32 avant le Kit cassette à 890 €).
Ligne : tuile 40 px (icône de la catégorie), nom en gras, « Réf. FR-32 · Frigo Distribution 17 », à droite le **prix de vente « 69,00 € »** en gras et « marge 33 % » en petit ; un matériel affiche « Non facturé » ; un article sans prix « Prix à compléter » en orange (au toucher la fiche s'ouvre sur le champ prix) ; ordinateur : « achat 46,00 € » à côté, une colonne de plus. Toucher = la fiche (§5.6).
**Vide** : « Aucun article. » / « Choisis ceux de ton métier, ils se rangent tout seuls. » [Choisir parmi les articles habituels de mon métier] [＋ Ajouter un article]. Données : `PRODUITS`, `PACKS` (« Préparer mes articles » = `fournPreparer` ; « rangement par métier » = `prRangement`, référence TEAM OP dans Plus).

### 7.4 Onglet « Fournisseurs »

`.cartes-clients` : une `.client-carte` par fournisseur, triée par dernière commande, **trois lignes** : nom (17 px gras) ; « Livraison en 1 jour · gratuite dès 150 € » (`.gris`) ; filet + trois chiffres « 8 » articles · « 1 121,20 € » ce mois-ci · « 94 % » à l'heure.
Une pastille seulement quand il y a quelque chose : `st-o` « 2 articles à commander » (le toucher ouvre la fiche, où le noir « Commander chez lui » agit) ou `st-r` « En retard sur la commande 2026-041 ». **Aucun bouton sur la carte** (le noir qui changeait de place d'une carte à l'autre disparaît) ; plus d'étiquette « Fournisseur local » (F5), plus de délai à une décimale (il passe dans la fiche : « Livre à l'heure 94 % du temps, en 1,2 jour en moyenne »).
**Vide** (la vraie « bienvenue », elle s'éteint dès qu'il y a UN fournisseur, de la liste ou non — corrige F5) : « Ajoute tes fournisseurs pour commander en deux touchers. » [Choisir dans la liste de mon métier] [Ajouter un fournisseur].

- **Fiche d'un fournisseur** (`fournFiche`) : nom ; sous-ligne « Contact : Mme Lefèvre · 05 46 00 00 00 » (le numéro se touche pour appeler) ; `btn` noir « Commander chez lui » (ou « Écrire à ce fournisseur » s'il n'y a rien à commander) + `btn gris` « Photographier sa facture » + `btn gris` « Importer ses prix » + « Plus ▾ » (« Choisir parmi ses articles habituels » · « Ce n'est plus mon fournisseur », confirmation).
  Trois cartes `.carte` (titre `h3`, lignes `.ligne`) : **COMMENT LE JOINDRE** (téléphone ; « E-mail pour les commandes » en orange avec « Ajoute-le pour envoyer les commandes » s'il manque, `st-o` ; site) · **COMMENT IL LIVRE** (« Livré en [1] jour(s) » OU case « Je le retire au comptoir » — **UNE seule saisie** : `dj` ; le texte « livré sous 24 h » que lisent la carte et le courriel est GÉNÉRÉ à partir du nombre, l'ancien champ texte n'est plus saisi ni perdu —,
  « Livraison gratuite à partir de [150,00] € », « Sinon, frais de port [12,50] € » (virgule), « Commander avant [16:00] pour être livré le lendemain ») · **MON COMPTE** (« Mon numéro de client », « Ma remise [10] % », « Paiement à [30] jours », interrupteur « Le relancer tout seul si pas de réponse »). Puis sections repliables : « Ses articles », « Ses commandes ». Liens de remise `data-fo`, `data-cm` conservés.
- **« Ajouter un fournisseur »** (feuille, deux onglets `.seg`) : « **Dans la liste de mon métier** » (`FOURN_DIR` : 180 entreprises, filtre métier + recherche, on touche pour choisir ; après le choix, « Choisir parmi ses articles habituels » tout de suite) · « **Un autre** » (nom, e-mail des commandes, téléphone : trois champs, le reste dans « Plus de détails »).
- **« Importer les prix d'un fournisseur »** (`fournTarifs`, `foImportVue`, `foAppliquer`) : trois étapes écrites comme un pas-à-pas : « 1. Choisis ton fichier de prix (un tableau Excel que ton fournisseur t'envoie) » · « 2. Vérifie : 142 articles reconnus, 12 nouveaux, 8 prix changent » · « 3. Mettre à jour mes prix » ; lien « Essayer avec un fichier d'exemple ». Plus de « CSV » ni « FAB-DIS » à l'écran.
- **« Choisir parmi les articles habituels »** (`fournPreparer`) : cocher par catégorie, « Tout cocher », `btn` noir « Créer 14 articles » (ils attendent leur prix).

---------------------------------------------------------------------------------------------------------------------------------

## 8. MON CAMION (technicien) — route `moncamion` — « Qu'est-ce qui me manque ? »

Le plus proche de ce que Justin aime : on le GARDE, on corrige ses cinq défauts (message du bureau avant l'essentiel, double envoi F2, pas de recherche F16, deux listes déroulantes tronquées, trois portes pour un même geste). Une seule définition `vueMonCamion` (supprimer `bxMonCamion`). **Aucun prix, aucune valeur, jamais.**
Même contenu sur tablette/ordinateur en une colonne de 720 px (rare). Barre du bas : Journée · Frais · Heures · Tâches · **Camion** (1 toucher) ; sa pastille rouge compte les envois REFUSÉS (pas les messages).

### 8.1 Écran (premier écran 390×844 : tout l'essentiel sans défiler)

1. Barre du haut (Menu, logo) ; surtitre « Sophie Martin » ; titre « **Mon camion** » ; UNE ligne `.gris` « GH-482-KL · 6 articles à bord » (la longue phrase disparaît). À droite du titre ou dessous : `st st-b` bouton « **1 message du bureau ›** » (ouvre une feuille ; la grande carte « Messages du bureau » qui poussait tout sous le pli disparaît).
   Camion au garage : une ligne bleue « Ton camion est au garage. ».
2. **Champ « Chercher une pièce »** (NOUVEAU : F16) : cherche partout (mon camion, l'atelier, le camion d'un collègue) et répond en phrase : « Condensateur 5 µF : mon camion 2 · atelier 5 · camion de Karim 1 », avec sur la ligne de l'atelier `btn gris petit` « Je l'ai pris ». Quantités seulement.
3. **Trois gros boutons** : `btn large` NOIR « **J'ai utilisé chez un client** » (le geste de tous les jours, pleine largeur, 56 px) puis côte à côte deux `btn gris` « J'ai pris à l'atelier » et « Il me manque une pièce ». (Une seule bascule de noir par écran ; les actions de ligne sont `btn gris petit`.)
4. **Carte « Il manque à bord · 3 »** (seulement s'il manque) : en tête de carte `btn gris petit` « **J'ai tout pris · 3** » (une seule demande pour toutes les lignes que l'atelier a en stock) ; chaque ligne : « Filtre à charbon » / « à bord 2 sur 3 · à l'atelier 6 » / `btn gris petit` « Je l'ai pris ».
   ⚠️ **Après l'envoi la ligne devient grise : « Envoyé au bureau · en attente » + `lien` « Annuler », et le bouton ne se redonne PAS** : un second appui ne peut plus créer une seconde demande (corrige F2 ; règle de données : `matDejaEnvoye(m)` refuse un `MVTS_ATT` identique — même `qui`, `pid`, `de`, `vers`, `type` — tant que le premier attend).
   Rien ne manque : coche verte « Ton camion est complet ».
5. **« À bord · 6 articles ›»** replié (déplie la liste « 2 sur 3 » avec coches, en lecture).
6. **« Mes envois »** — carte visible seulement quand quelque chose attend ou a été refusé : « 2 filtres à charbon · En attente du bureau » `st-b` / « Accepté » `st-v` / « Refusé : trop cher » `st-r` + `lien` « Retirer ».
   Camion sans liste : « Ton camion n'a pas encore de liste. Demande au bureau ce qu'il doit y avoir à bord. ».

### 8.2 Les trois feuilles (même fabrique `matFeuille`, §3.7)

- **« J'ai utilisé chez un client »** : en haut une grande ligne déjà choisie « Dépannage climatisation · Restaurant Le Vieux Port · aujourd'hui 14:00 » avec `lien` « Changer » (liste de ses interventions du jour et d'hier ; plus de liste déroulante tronquée « Dépan… ») ; « Qu'est-ce que tu as utilisé ? » : champ de recherche, dessous « Dans ton camion » (les plus utilisés d'abord) ;
  on touche un article → ligne avec « − 1 + » ; un fluide ajoute « Kilos chargés » et « Kilos récupérés » dans la même feuille (`sxCarteFluide`) ; un article pas dans son camion dit « Pas dans ton camion : l'atelier en a 5 » ; `btn` noir collé « Envoyer : 2 articles ». C'est **la même feuille** que « Pièces et produits utilisés » de la fiche d'intervention et que « Noter les pièces utilisées ? » de « Terminer » (cases déjà cochées d'après les pièces prévues, boutons « C'est bon » / « Modifier ») : trois portes, un écran, un envoi.
- **« J'ai pris à l'atelier »** : les articles qui manquent à bord sont déjà proposés avec « − + » (préremplis à ce qui manque) ; on en ajoute par la recherche ; `btn` noir collé « Envoyer : 3 articles ».
- **« Il me manque une pièce »** (`matManque({inter})`) : « Quelle pièce ? » (recherche dans la liste, ou « Autre chose » avec un champ libre) ; « Combien ? » (− 1 +) ; « Pour quand ? » quatre pastilles `.seg` « Aujourd'hui · Demain · Cette semaine · Sans urgence » ; « Pour quelle intervention ? » (celle du jour déjà choisie, « Changer » ou « Aucune ») ; « Pourquoi ? » (facultatif) ; `btn` noir collé « Prévenir le bureau ».
  Elle écrit UNE demande (`DEM_ACHAT`) qui arrive dans « À commander » du bureau (« Demandé par Tom ») et, si une intervention est choisie, la tâche « commander » (`TACHES` type `commande`) comme aujourd'hui — c'est la seule porte, aussi depuis la fiche d'intervention.

**Messages** : « Envoyé au bureau · Annuler » ; refus du bureau → ligne dans « Mes envois » avec son motif ; hors ligne : « Pas de réseau : ton envoi partira dès que ça revient. » (le dire, ne jamais perdre).

---------------------------------------------------------------------------------------------------------------------------------

## 9. Ce qui change dans les écrans voisins

1. **Fiche d'intervention (bureau)** : la carte « Pièces prévues » devient une liste d'ARTICLES choisis par recherche (on enregistre `{nom, q, pid}` — `pid` est NOUVEAU et optionnel ; `nom` reste pour les anciennes lignes ; `pdxMemeArticle`/`sxReconnu` privilégient `pid` puis retombent sur le rapprochement par texte : plus de « Condensateur 5 µF » ≈ « Condensateur permanent 5 µF 450 V » à la chance).
   Chaque ligne porte UNE pastille : « Prête » `st-v` (dans le camion du technicien ou à l'atelier), « En route · arrive mardi 3 » `st-b`, « À commander » `st-o` + `btn gris petit` « Commander ». Le bandeau « Les pièces arrivent après le rendez-vous · Décaler l'intervention » reste. La carte « Fluide frigorigène » reste (bouteille, kilos chargés/récupérés) avec « Registre des fluides ›». « Il me manque une pièce » et « Noter les pièces utilisées » = les deux feuilles de Mon camion.
2. **Accueil** : la carte « Achats à traiter » (`pdxAchatsCarte`) devient « **Matériel** » avec UNE ligne par chose, chacune menant à SA rubrique, tous les nombres venant des mêmes fonctions que les bandeaux : « 5 articles à commander · Fournisseurs » · « 2 livraisons attendues, dont 1 en retard · Commandes » · « 2 envois à accepter · Stock » · « 6 articles manquent dans 2 camions · Dépôts et camions ». La ligne « Stock » de « À faire maintenant » (`sxAFaire` côté Accueil) disparaît (doublon).
3. **Achats et frais** (`vueAchats`) : le nom ne change pas (décidé le 16 novembre). On ajoute UNE phrase sous le titre « Ce que ton équipe demande d'acheter, et les notes de frais à valider. ». Une demande d'un article du catalogue arrive aussi dans « À commander » (§3.1) et peut être traitée des deux endroits (même geste) ; seules les demandes hors catalogue et les notes de frais restent ici. Annexe A.
4. **Comptabilité** : aucun redessin ; elle lit toujours le même registre `ACHATS` (une livraison reçue, « Ranger le ticket dans les achats »). Les mots « Achats sans facture », « factures à payer » restent. Les montants passent par `eur()`.
5. **Planning, Ma journée, Interventions** : la pastille « Pièces » (`pdxPieces`, `pdxApres`) reprend les trois mots « Prête / En route / À commander ». Le raccourci de Ma journée « Mon camion — 3 articles manquent à bord » est gardé, mêmes mots que la carte.
6. **Véhicules** (chantier voisin, `VEHICULES-TEMPS.md`) : « 6 articles à bord, 3 manquent » lit `camionsARemplir()`/`bxManques` avec « Voir le camion » → `bxFiche` ; un camion au garage n'est jamais compté « à remplir » ; les pièces d'un camion restent liées à la plaque (`VEHICULES[].lieu`).
7. **Tâches** : les tâches « commander des pièces » et les propositions (silence du fournisseur, retard, facture arrivée ; `pdxSuggTaches`, `tkxBon`) gardent leur forme ; leurs libellés prennent « Relancer », « J'ai reçu la livraison », « Comparer avec la facture ».
8. **Historique** (rubrique du menu) : chaque geste écrit toujours sa ligne (`journalAjout`), avec les phrases de « Ce qui a bougé ».
9. **Menu et recherche** : routes et libellés inchangés ; la pastille de « Fournisseurs, matériel & produits » = `cmdNbACommander()` ; (optionnel, dernier lot) la recherche du menu propose aussi les articles (« R32 » → « Fluide R32 · 7,5 kg · atelier 5, Sophie 2,5 »).
10. **Guide des nouveautés** (`nv`, panneau « Nouveautés ») : une carte « Le matériel, refait » : « Stock : tape un article, tu vois où il est » / « Remplir les camions en un toucher » / « Photographie une facture : le stock et les prix se mettent à jour » / « Les techniciens ont enfin une recherche ». Chaque ligne ouvre l'écran (comme les autres cartes du guide).
11. **Visite guidée (`tourPartie` : `stock`, `boxes`, `produits`) et visites parlées (`immChap` : chapitres `produits`, `stock`, `boxes`)** : à réécrire dans le même lot avec les nouveaux textes ET en visant les attributs `data-vis` (liste ci-dessous), pas des classes. `data-vis` à poser :
    `stock-tuiles` (les trois tuiles) · `stock-maj` (« Mettre à jour le stock ») · `stock-liste` · `stock-bandeau` · `stock-lieu` (« Partout ») · `depots-remplir` · `depots-cartes` · `depots-visites` (bandeau) · `four-onglets` · `four-commander` (carte « À commander ») · `four-photo` · `four-articles` · `four-fournisseurs` · `camion-utilise` · `camion-manque` · `camion-cherche`.
    Les chapitres qui parlaient de « réassort », « dotation », « mouvements », « inventaire » prennent les mots du §3.4. Un banc vérifie que chaque cible existe (§13).
12. **Équipe › droits** : les cases « Voir » Stock / Fournisseurs, matériel & produits / Dépôts et camions gardent leur effet sur le menu ; les libellés d'Équipe reprennent les nouveaux noms ; la case « Accepter les envois des techniciens » (`stockAccepter`) est nouvelle (§4).

---------------------------------------------------------------------------------------------------------------------------------

## 10. Table « avant → après » — rien d'utile de l'inventaire ne se perd

Légende : S = Stock, P/F/C = Fournisseurs, matériel & produits (articles / fournisseurs / commandes), D = Dépôts, T = technicien (numérotation de l'étude §2). « Plus » = derrière le bouton « Plus ▾ » de la rubrique.

| # | Capacité d'avant | Où elle vit après | Données / fonction (inchangées sauf mention) |
|---|---|---|---|
| S1 | Où est tel article, combien, par lieu (Stock, Dépôts « Où est… ? », fiche) | **Stock › Articles** : recherche + « Partout » + répartition sur la ligne ; Mon camion (technicien) | `stkAt`, `x.loc` |
| S2 | Voir ce qui manque / à commander | tuile « à commander » + section « À surveiller » + Commandes | `cmdNbACommander` (UNE règle) |
| S3 | « À faire maintenant » (Stock 4 lignes, Dépôts 6) | un bandeau d'une ligne par rubrique + états de carte + carte « Matériel » de l'Accueil | `matEnvoisAAccepter`, `bxBesoins`, `camionsARemplir`, `matAFaire` (Accueil) |
| S4 | Valider un par un, Tout valider, refus avec motif, « il en restera 6 », notification | bandeau + feuille « Envois à accepter » : Accepter / Refuser / Tout accepter | `MVTS_ATT`, `sxToutValider`, `sxRefus` |
| S5 | Règle « valider seul ce qu'un technicien a utilisé », interrupteur de validation | Plus › Réglages du stock | `SX.autoUsage`, `STK_VALID` |
| S6 | Réassort des camions en cases, Annuler, ce que l'atelier n'a plus part dans les commandes | « Remplir les camions » (Dépôts) ; remplir un camion (fiche du lieu) | `bxTransferts`, `bxPreparer`, `bxManques` |
| S7 | Transfert entre lieux | Mettre à jour › Déplacer ; « Déplacer » de la fiche d'article / de lieu | `stkAppliquer` (type `transfert`) |
| S8 | Sortie « pour qui » + bon de remise | Mettre à jour › Sortir du stock | `type:'sortie'`, `stkBon` |
| S9 | Entrée sans commande (comptoir, retour) + « Ranger le ticket dans les achats » | Mettre à jour › Ranger dans le stock | `sxEntree` → `matFeuille`, `ACHATS` |
| S10 | Journal avec filtres, recherche, valeur, « cassé ou perdu », export | Stock › Ce qui a bougé ; export dans Plus | `MVTS`, `sxExport` |
| S11 | Annuler un geste | toast « Annuler » partout + Plus › « Annuler le dernier geste » | `sxAnnule`, `SX.dernier` |
| S12 | Inventaire d'un lieu (écart, « Tout est juste », par catégorie, date, rappel 90 jours) — 3 portes | `matCompter` — UNE feuille ; depuis la fiche d'un lieu, Plus, Mettre à jour | `sxInvValider`, `SX.invs`, `SX.freq` |
| S13 | Valeur du stock, valeur par lieu | pied de liste de Stock, 3 chiffres de la fiche d'un lieu, carte du lieu | `lieuValeur` |
| S14 | Dotation d'un camion, copier celle d'un autre | fiche du lieu › Plus › « Ce qu'il doit y avoir à bord » | `DOTATION`, `sxDotVue` |
| S15 | Fluides : bouteilles, kilos chargés/récupérés, registre exportable | Plus › Registre des fluides (totaux par fluide, période) ; fiche d'un fluide ; carte de l'intervention | `SX.bout`, `SX.reg`, `sxRegistre`, `sxCarteFluide` |
| S16 | Sortir à la clôture d'une intervention | clôture : « Noter les pièces utilisées ? » = feuille `matFeuille` (mêmes cases) | `sxIntProposer` |
| S17 | Usage d'un article (« ≈ 2 par semaine », « de quoi tenir 5 semaines ») | fiche d'article (phrases) + quantités des commandes + « Conseil : sous 4 » | `cmdSuggere`, `PR_CONSO` |
| S18 | Alertes (bouteille presque vide, camion sous dotation, pièce absente, lieu à compter) | états de carte, bandeau « Avant les visites », phrase de la fiche du lieu, ligne de l'Accueil | `sxAFaire` (éclaté), `bxBesoins` |
| P1 | Liste des articles par métier › catégorie, état, stock, prix | **Articles** : un niveau (catégorie), prix de vente + marge ; l'état est dans Stock | `PRODUITS`, `PACKS` |
| P2 | Recherche sans accent | première pièce de Stock et d'Articles | `pdxChercheOk` |
| P3 | Fiche article complète (prix, marge, TVA, utilisé N fois, où, autres fournisseurs, bouteilles, derniers mouvements, conseil, courbe) | UNE fiche hiérarchisée §5.6 (courbe dans « Plus de détails ») | `prFiche`, `pdxPvConseil`, `pdxCourbe` |
| P4 | Ajouter avec rangement automatique, doublon, vente à perte | « Ajouter un article » : 4 champs + « Plus de détails » | `prRanger`, `pdxDoublon`, `pdxFormApres` |
| P5 | Produit vs matériel | « Je le vends au client ? Oui / Non » | `prVend` (déduit de `pv`) |
| P6 | Catalogue des devis / factures / interventions | inchangé, invisible | `prCatalogueMaj()` après tout geste, `CATALOGUE`, message `opd_donnees` |
| P7 | Rangement par métier (24 métiers, 285 catégories, 5 056 produits) | Plus › « Voir comment les articles sont rangés par métier » | `prRangement` |
| P8 | Filtres (métier, catégorie, 7 états, 4 tris) | recherche + « Tout ▾ » + « Tous mes métiers ▾ » ; tri dans Plus ; états dans Stock | |
| P9 | Hausses d'achat, prix chez les autres fournisseurs, « passer chez lui », marge | fiche d'article, section Prix | `x.offres`, `x.paAvant` |
| P10 | Retirer un article avec avertissement | fiche › « Retirer cet article » | `x.retire` |
| P11 | « Prix à compléter » + « N articles attendent leur prix » | filtre « Prix à compléter » + bandeau | `x.ac` |
| F1 | Cartes fournisseurs (délai moyen, % à l'heure, € commandé, alertes) | carte `client-carte` : 3 chiffres ; détail dans la fiche en une phrase | stats calculées sur `COMMANDES` |
| F2 | Choisir ses fournisseurs dans l'annuaire (180) / « Le mien » / local | « Ajouter un fournisseur » › « Dans la liste de mon métier » / « Un autre » | `FOURN_DIR`, `fournListe`, `foLocal` |
| F3 | Fiche fournisseur (compte, e-mail, remise, délai, franco, port, heure limite, paiement, relance auto) | fiche en trois groupes ; e-mail manquant dit ; UN champ de délai | `MES_FOURN` (`dj`) |
| F4 | Préparer mes articles | Plus › « Choisir parmi les articles habituels » ; fiche fournisseur › Plus | `fournPreparer` |
| F5 | Import de tarifs | Plus › « Importer les prix d'un fournisseur » (3 étapes) | `fournTarifs`, `foAppliquer` |
| F6 | Lire une facture (photo/PDF) | « Photographier une facture » : bouton de l'en-tête (et de la fiche d'un fournisseur, de « Ranger ») | `fournFacture`, `foFactureValider`, `pdxFacCandidates` |
| C1 | Paniers par fournisseur, quantité calculée, franco, « moins cher chez », pièces d'interventions en tête | carte « À commander » de Commandes | `cmdPaniers`, `cmdSuggere`, `cmdFranco`, `cmdMoinsCher` |
| C2 | Préparer / Tout préparer / Nouvelle commande | « Préparer la commande » (gris), « Tout préparer » (gris), « ＋ Nouvelle commande » (noir) | `pdxToutPanneau` |
| C3 | Bon de commande : lignes, totaux, livraison, date, note, aperçu PDF, brouillon, envoi | feuille unique : un noir « Envoyer à… », aperçu replié | `cmdEdVue`, `cmdDoc`, `cmdMail`, `cmdEnvoyer` |
| C4 | Suivi en 5 étapes, journal, filtres, recherche | liste « Les commandes » groupée À traiter / En route ; frise de 4 étapes ; journal dans la fiche ; terminées repliées | `cmdEtapes`, `CMD_ST` |
| C5 | Alertes retard/silence + relance | pastille rouge + « Relancer » sur la ligne ; relance groupée via la carte ; tâches | `cmdAlerte`, `cmdRelance`, `pdxRelGroupe` |
| C6 | Confirmation du fournisseur | fiche de commande › Plus › « Le fournisseur a confirmé » | `cmdConfirmer` |
| C7 | Réception partielle, bon de livraison, reliquat avec date, où ranger, mise de côté | « J'ai reçu la livraison » | `cmdReception`, `pdxRangement` |
| C8 | Rapprochement de la facture | « Comparer avec la facture » | `cmdRappro`, `cmdFacturer` |
| C9 | Recommander, annuler, portail fournisseur (démo) | fiche de commande › Plus | `cmdPortail` |
| C10 | Pièces d'intervention en tête + « décaler l'intervention » | inchangé (fiche d'intervention, carte « À commander ») | `pdxPieces`, `pdxFicheInter` |
| D1 | Cartes des lieux | cartes `client-carte` §6.1 | `LIEUX` |
| D2 | Fiche d'un lieu | `bxFiche` §6.2 | |
| D3 | « À faire maintenant » 6 lignes | éclaté : bandeau « Avant les visites » + états de carte + bouton du haut | `bxAFaire` supprimée |
| D4 | « Avant les visites » | bandeau + feuille §6.3 | `bxBesoins` |
| D5 | Compléter un camion/réserve | « Remplir ce camion » / « Remplir les camions » | `bxTransferts` |
| D6 | Réserves chez un client (3D, contrats) : créer, kit, modifier, fermer/rouvrir | Plus › « Nouvelle réserve chez un client » / « Réserves fermées » ; invisibles pour un métier qui n'en a pas | `bxNouveau`, `bxFermer`, `bxReserveDe` |
| D7 | Camion au garage | pastille « Au garage », « Le remplir quand même » | `bxGarage` |
| D8 | Rôles par lieu | fiche du lieu › Plus › « Changer le nom ou le conducteur » | `bxModifier` |
| D9 | Chercher « Où est… » | Stock › recherche | — |
| T1 | J'ai pris à l'atelier (« Je l'ai pris » par ligne) | « J'ai pris à l'atelier » + « J'ai tout pris · 3 » | `sxTForm` → `matFeuille` |
| T2 | J'ai utilisé (3 chemins) | UNE feuille, trois portes | `matFeuille`, `bxDeclarer` |
| T3 | Il me manque (article ou texte libre, combien, pour quand, pourquoi) | « Il me manque une pièce » | `matManque`, `DEM_ACHAT` |
| T4 | À bord contre ce qu'il doit y avoir | carte « Il manque à bord » + « À bord » replié | `lieuManques` |
| T5 | Mes envois (en attente / accepté / refusé + motif / retirer) | carte « Mes envois » | `MVTS_ATT`, `SX.refus` |
| T6 | Messages du bureau | pastille « 1 message du bureau › » → feuille | `rlNotifsCarte` |
| T7 | Fluide (bouteille, kilos) | inchangé dans la fiche d'intervention | `sxCarteFluide` |
| T8 | « Il me manque une pièce » depuis l'intervention | même feuille `matManque({inter})` | `pdxPmOuvrir` |
| T9 | Raccourci de Ma journée | gardé, mêmes mots | |
| — | Bon de remise | gardé : « Bon de remise 2026-017 » (document inchangé) | `stkBon` |
| — | Exporter (PDF/tableur) | Plus de Stock et de Dépôts, de l'onglet journal (simulé, le dire) | `sxExport` |

### Les défauts de l'étude (F1 à F18) : où chacun est réglé

F1 bureau sans rubrique → §4 · F2 double envoi → §8.1 (4) · F3 camion au garage réassorti → §3.2 · F4 cinq comptes de « à commander » → §3.1 · F5 bandeau NOUVEAU éternel / « Fournisseur local » → §7.4 · F6 « Valider » qui ne valide pas → « Tout accepter » agit (§5.1) ·
F7 ancre sans effet → supprimée avec le bandeau · F8 registre des fluides introuvable → Plus › Registre (§5.5) · F9 « Sur commande » / « Commandé » → §3.3 · F10 montants → §3.5 · F11 deux champs de délai → §7.4 · F12 réglages dans la file → §5.5 · F13 onglet qui sort de l'écran → deux onglets, mesurés à 286 px ·
F14 menu coupé → dépendance chantier menu (§5.2) · F15 code mort et doublons → §12 · F16 technicien sans recherche → §8.1 (2) · F17 photo/scan → hors lot (question 3) · F18 prototype sans serveur → dit dans l'écran concerné.

---------------------------------------------------------------------------------------------------------------------------------

## 11. Les dix gestes (objectifs de conception, comptés sur le plan ; la sonde `materiel-gestes` les MESURE)

Un geste = un toucher ou un clic ; le menu compte 1 sur ordinateur, « Menu » + la ligne = 2 pour le gérant sur téléphone, la barre du bas = 1 pour le technicien. Les saisies ne comptent pas.

| # | Qui | Ce qu'on vient faire | Avant | Après (objectif) |
|---|---|---|---|---|
| 1 | Technicien | Voir ce qui manque dans mon camion | 1 + défilement d'un demi-écran | **1**, la carte « Il manque à bord » est visible sans défiler |
| 2 | Gérant, bureau, technicien | Savoir s'il en reste / où est tel article | gérant 3 + 1,3 écran de défilement ; bureau et technicien impossible | gérant/bureau **1** (ordinateur : champ déjà actif) ou **2** (téléphone) + la frappe ; technicien **2** (Camion, champ) |
| 3 | Technicien | Dire ce que j'ai utilisé | clôture 2 ; Mon camion 5 à 6 | clôture **2** (« Terminer », « C'est bon ») ; Mon camion **4** (Camion, « J'ai utilisé », article, « Envoyer ») |
| 4 | Gérant | Accepter ce que les techniciens ont pris | 3 (le premier « Valider » n'agit pas) | **2** (menu, « Tout accepter ») — 3 sur téléphone |
| 5 | Technicien | Dire ce que j'ai pris à l'atelier | 3, risque de doublon | **2** (Camion, « J'ai tout pris · 3 ») ; doublon impossible |
| 6 | Gérant, bureau | Commander ce qui manque | 4 à 5 ; bureau impossible | **3** : menu, « Tout préparer · 3 », « Envoyer 3 commandes » ; un fournisseur : « Préparer », « Envoyer à… » (l'onglet Commandes s'ouvre quand on vient d'un lien ; **4** si l'appareil avait quitté un autre onglet) |
| 7 | Gérant, bureau | Recevoir une livraison | 5 ; bureau impossible | **3** : menu, « J'ai reçu la livraison », « Ranger dans le stock » |
| 8 | Gérant | Remplir les camions | 3, un bouton noir et trois « Réassort » | **3** : menu, « Remplir les camions · 6 », « Tout mettre dans les camions » ; un seul bouton ; le même chiffre partout |
| 9 | Gérant, bureau | Lire une facture fournisseur | 3 à 4, cachée parmi quatre raccourcis ; bureau impossible | **4** (menu, « Photographier une facture », photo, « Mettre à jour ») mais visible dès l'ouverture ; téléphone : l'icône appareil photo de l'en-tête |
| 10 | Technicien | Signaler une pièce manquante | 4 par deux portes | **4** (Camion, « Il me manque une pièce », la pièce, « Prévenir le bureau ») ; **3** depuis la fiche d'intervention ; une seule fenêtre |

Juste derrière : changer un prix **5** (menu, Articles, l'article, le prix, Enregistrer ; 4 si Articles était le dernier onglet) · ajouter un article **3** touchers et **3** saisies (au lieu de onze champs) · compter un camion **5** (Dépôts, la carte, Compter, « Tout est juste », Enregistrer) ·
ouvrir le registre des fluides **3** (Stock, Plus, Registre) · changer ce qu'il doit y avoir à bord **4** (Dépôts, la carte, Plus, « Ce qu'il doit y avoir à bord ») · sortir pour un collègue **6** (Stock, Mettre à jour, Sortir du stock, « Un collègue », nom, Noter) + la recherche de l'article.

---------------------------------------------------------------------------------------------------------------------------------

## 12. Routes et fonctions : garder, réécrire, supprimer

**Règle de méthode (l'étude l'a payée)** : le prototype est une pile de « lots » qui se réaffectent (`vueStock`, `vueBoxes`, `prFiche`, `lieuFiche`, `stkFormVue`, `stkReassort`, `stkAppliquer`, `mvLigne`…). **Refaire = remplacer la chaîne ENTIÈRE par UNE définition par fonction**,
puis `grep "function nom("` avant d'en créer une (une seconde déclaration gagne en silence). Écrire les neuves ET supprimer les anciennes dans le même lot.

### 12.1 GARDER tel quel (contrats avec 20 autres écrans)

- Routes : `stock`, `produits`, `boxes`, `moncamion` (favoris, barre personnalisée, adresses en mémoire, cases « Voir » d'Équipe).
- **Écritures** : `stkAppliquer` (LA SEULE porte qui change une quantité ; plafonne ; la trace dit ce qui a vraiment bougé), `stkAt`, `stkPoser`, `stkR`, `stkBon`, `stkJournalEntree`, `sxAnnule`/`sxToast`, `sxInvValider`, `foAppliquer`, `foFactureValider`, `cmdReceptionner`, `cmdEnvoyer`, `cmdFacturer`.
- **Catalogue** : `prCatalogue`, `prCatalogueMaj` (27 appels : tout geste qui change un nom, un prix, un retrait ou un stock la rappelle), `prVend`, `prRanger`, `prNorm`, `pdxChercheOk`, `pdxDoublon`.
- **Calculs** : `aCommander`, `enCommande`, `cmdPaniers`, `cmdNbACommander` (devient LA règle), `cmdSuggere`, `cmdFranco`, `cmdMoinsCher`, `cmdAlerte`, `cmdEtapes`, `lieuManques`, `bxManques`, `bxBesoins`, `bxVeh`, `bxGarage`, `bxActifs`, `lieuValeur`, `sxJoursInv`, `pdxPieces`, `pdxFicheInter`, `pdxApres`, `bxDeclarer`, `sxCarteFluide`, `sxIntProposer`, `pdxMemeArticle`, `sxReconnu`.
- **Données** : `PRODUITS`, `PACKS`, `CATALOGUE`, `MES_FOURN`, `FOURN_DIR`, `COMMANDES`, `LIEUX`, `DOTATION`, `MVTS`, `MVTS_ATT`, `SX`, `DEM_ACHAT`, `ACHATS`, `TACHES` type `commande`, `INTS[].prevues`, `FICHES[id].pieces`, `VEHICULES[].lieu`. **Aucune n'est renommée ni migrée.** Ajouts autorisés : `prevues[].pid` (optionnel) ; rien d'autre.
- Briques : `ouvrirPanneau`, `foOuvrir`, `foGarder`, `ouvrirMenu`, `toast`, `journalAjout`, `notifier`, `esc`, `eur`, `foNum`, `avatar`, `rlPermis`.

### 12.2 RÉÉCRIRE (affichage et assemblage seulement)

`vueStock` · `stkVueMouvements` → onglet « Ce qui a bougé » (`mvLigne` en phrases) · `stkVueValider` → feuille « Envois à accepter » · `stkVueInventaire`, `bxInv` → `matCompter` · `stkFormVue`, `sxEntreeVue`, `sxEntree`, `stkForm` → `matFeuille` · `sxTForm` (saisie) → `matFeuille` ·
`prFiche` (UNE) · `prFormulaire` · `vueProduits` · `vueFournisseurs` · `vueCommandes` · `fournListe`, `fournFiche`, `fournPreparer`, `fournTarifs`, `fournFacture`, `foImportVue`, `foFactureVue` (mots, pas de logique) · `cmdEdVue` (un seul bouton noir) · `cmdFiche` · `cmdReception` · `cmdRappro` (libellés) ·
`vueBoxes`, `bxCarte`, `bxFiche`, `lieuFiche` (alias), `bxTransferts`/`bxPreparer`/`bxPreparerReserve` (mêmes calculs, habillage « Remplir ») · `bxModifier`, `bxNouveau`, `bxFermer` (libellés) · `vueMonCamion` · `sxManqueVue` + `pdxPmOuvrir`/`pdxPmEnvoyer` → `matManque` · `sxRegistre` (totaux par fluide, période) ·
`pdxAchatsCarte` (carte « Matériel » de l'Accueil) · `tourPartie('stock'|'produits'|'boxes')`, `immChap('stock'|'produits'|'boxes')`, la carte du guide `nv`.

### 12.3 NOUVELLES (petites, une porte chacune)

`camionsARemplir()` (§3.2) · `matEtat(x)` (§3.3, remplace `prEtat`) · `matEnvoisAAccepter()` (lit `MVTS_ATT` + la phrase « il en restera N ») · `matDejaEnvoye(m)` (idempotence, §8.1) · `matAFaire()` (les lignes de la carte « Matériel » de l'Accueil, 4 au plus) ·
`matFeuille(mode, pre)` · `matCompter(lieu)` · `matManque({inter})` · `matLigneArticle(x, lieuF)` (la ligne de Stock) · `matPhrase(m)` (une phrase par geste du journal, la même pour Stock, Historique et l'Accueil) · `delaiTxt(f)` (génère « livré sous 24 h » depuis `dj`).

### 12.4 SUPPRIMER

`bxMonCamion` (code mort : un 2ᵉ « Mon camion » jamais atteint) · `sxAFaire` et `sxBandeau` (le bandeau de 4 lignes de Stock) · `bxAFaire` (les 6 lignes de Dépôts) · `sxChips`, les tuiles `sk-lieu` et le lien « Gérer les lieux › » · `stkReassort`/`bxReassort` en double (un seul « Remplir les camions ») ·
`foBandeau` (le bandeau NOUVEAU) et les 4 raccourcis de Produits · la branche morte `data-pr="cmd"` (texte périmé « la catégorie Achats la préparera ») · l'état « Sur commande » et `prEtat` · `LIEU_IC` (émojis) · les enveloppes `sxVueStock0` et leurs `h.replace(...)` · les définitions en chaîne de `vueStock`, `vueBoxes`, `prFiche`, `lieuFiche`.

### 12.5 Contrats DOM à refaire dans le même lot

La visite guidée et les visites parlées visaient : `#contenu .sk-liste`, `.sx-afaire`, `.sk-lieux`, `.bx-c`, `.bxl-af`, `.pr-vues`, `.pr-pack`, `[data-sk="reassort"]`, `[data-sk="fok"]`, `[data-pr^="nouveau|"]`, `[data-pr="garder|"]`, `[data-cm^="recep|"]`, `[data-bxl^="ou|"]`, `[data-bxl="nou"]`, `#bxl-rok`, `.fo-fc:has([data-cm="preparer|Sanitaire Pro 17"])`, `#calque .panneau`.
Ils passent aux `data-vis` du §9.11. Les identifiants `data-cm`, `data-ce`, `data-fo`, `data-pr`, `data-sk`, `data-sx`, `data-bxl`, `data-pdx` appelés depuis d'autres écrans (Tâches, Accueil, Interventions, Achats) sont gardés OU remplacés partout dans le même lot (grep avant et après).

---------------------------------------------------------------------------------------------------------------------------------

## 13. Les sondes à écrire (outil : `scratchpad/proto-final/lib.js` ; profils mac, mac720, windows, ipad, iphone, android, petit ; jour et nuit ; `qui` marc, julie, sm)

Règles du dépôt qui valent ici : navigateur sur 127.0.0.1 seulement, un seul à la fois, `timeout 300 node …`, aucun processus laissé ; **prouver la population avant de croire un zéro** (compter ce qu'on mesure) ; mesurer un débordement contre la largeur POSÉE du profil ;
attendre deux images et une lecture forcée avant une largeur ; mesurer APRÈS les transitions de vue ; **regarder les captures (outil Read)** — une sonde verte ne dit pas que l'écran est beau.

| Sonde (dossier `sondes/`) | Ce qu'elle joue | Ce qu'elle exige |
|---|---|---|
| `materiel-gestes.js` | les dix gestes du §11, vrais clics, comptés | nombre de touchers ≤ objectif, chaque geste ABOUTIT (le chiffre relu avant/après change comme prévu) |
| `materiel-boucles.js` | boucles complètes avec relevé des chiffres : accepter (stock total, valeur des camions, « à accepter »), remplir les camions, commander (« à commander » 5 → 2), recevoir (stock +276 €), compter, déplacer, sortir, **Annuler de chacun** | les totaux se recalculent juste ; Annuler rend l'état d'avant au centime |
| `materiel-coherence.js` | le même nombre partout : « à commander » (tuile Stock, compteur Commandes, groupe, carte de l'Accueil, pastille du menu, Tâches), « camions à remplir » (Stock, Dépôts, Accueil, Véhicules) | un seul chiffre par notion ; un camion au garage n'est compté nulle part |
| `materiel-doublon.js` | double appui sur « Je l'ai pris », sur « J'ai tout pris », sur « Envoyer » | `MVTS_ATT` ne gagne qu'UNE ligne ; la ligne passe à « Envoyé au bureau » |
| `materiel-roles.js` | marc, julie, sm dans chaque écran | sm : AUCUN `€`, prix d'achat, marge, valeur dans son DOM (matériel et fiche d'article) ; julie : routes Stock et Fournisseurs ouvertes, pas d'« Accepter », pas de modification du prix de vente, pas de Dépôts ; une route fermée ramène sur l'écran d'ouverture avec « Cette page n'existe pas. » |
| `materiel-densite.js` | première ligne de donnée et éléments touchables avant elle, Stock / Articles / Commandes / Fournisseurs / Dépôts / Mon camion × 6 profils | première ligne avant 0,5 écran ; ≤ 12 touchables ; la population (nombre de lignes) comptée d'abord |
| `materiel-appareils.js` | débordement horizontal (contre la largeur posée), onglets dans leur colonne à 286/320/360/390, champs ≥ 16 px (taille CALCULÉE), cibles ≥ 44 px (zone qui répond, pas le rectangle), barre du bas qui ne recouvre rien, encoches posées (`Emulation.setSafeAreaInsetsOverride`), valeurs longues (« 12 345,67 € », noms de 40 signes) | zéro débordement, zéro texte écrasé (< 12 signes par ligne sur 4 lignes) |
| `materiel-mots.js` | le `textContent` (jamais le `innerHTML`, qui porte le script) des trois rubriques, de Mon camion, de chaque feuille, des toasts et des courriels préparés | **aucun** mot du lexique banni : dotation, réassort, franco, reliquat, rapprocher, seuil, inventaire, mouvement, entrée/sortie/transfert (boutons), « Fournisseur local », CSV, FAB-DIS, « IA », « Sur commande », « Épuisé » ; aucun préfixe « BC-/BR- » à l'écran ; aucun émoji ; chaque bouton à icône seule a un nom |
| `materiel-visites.js` | la visite guidée et chaque chapitre `immChap` des trois rubriques | chaque cible `data-vis` existe, est visible, n'est pas recouverte |
| `materiel-nuit.js` | captures de jour ET de nuit des 4 écrans × 3 rôles × 6 profils ; contraste des pastilles `st-o`, `st-r`, `st-b` sur la carte ; les cartes se détachent du fond | ≥ 4,5:1 mesuré au pixel (capture avec `clip`, pas de calcul) |
| `materiel-fonctions.js` | une seule définition par fonction (`function nom(` compté dans le fichier) et aucune réaffectation en chaîne des fonctions du §12.4 | 1 définition ; `bxMonCamion` absent |

**Contre-épreuves (mutations)** : remettre `cmdNbACommander` à 5 comptes, retirer `bxGarage` de `camionsARemplir`, retirer `matDejaEnvoye`, redonner `ROLES.gestion` son ancienne liste, remettre un prix dans le DOM du technicien, ré-affecter `vueStock` — chaque sonde concernée doit TOMBER. Une mutation qui ne casse rien = une sonde qui ne regarde pas au bon endroit.
**Après chaque lot** : `git diff` vide avant commit ; compiler la page ENTIÈRE (`sondes/compiler-pages.js`) — une fusion de lots peut déclarer deux fois le même nom.

---------------------------------------------------------------------------------------------------------------------------------

## 14. Ordre d'implantation (un lot = un commit, avec ses sondes vertes ET ses captures relues)

0. **Lot 0 — les pièces communes** : `matEtat`, `camionsARemplir`, `matEnvoisAAccepter`, `matDejaEnvoye`, `matPhrase`, `eur()` partout, les icônes de `IC`, la carte « Le plus simple possible » extraite en fonction, les `data-vis` ; supprimer le code mort ; une définition par fonction. Rien ne change à l'écran sauf les nombres.
1. **Lot 1 — Mon camion** (sert le technicien pressé) : §8 + `matFeuille`/`matManque` + idempotence ; les trois portes (clôture, fiche d'intervention, Mon camion) pointent sur les mêmes feuilles.
2. **Lot 2 — Stock** : §5 (page, bandeau, feuille « Mettre à jour », « Envois à accepter », Compter, Réglages, Registre, journal, fiche d'article et formulaire). Rôle bureau ouvert à Stock.
3. **Lot 3 — Dépôts et camions** : §6.
4. **Lot 4 — Fournisseurs, matériel & produits** : §7 (Commandes, Articles, Fournisseurs, fenêtres). Rôle bureau ouvert.
5. **Lot 5 — Voisins et guides** : Accueil, fiche d'intervention (`pid`), Achats (phrase), Planning, Véhicules (lecture), visites guidée et parlées, guide des nouveautés, recherche du menu (optionnel).
6. **Lot 6 — Recette** : toutes les sondes du §13 sur les six profils, jour et nuit, trois rôles ; captures REGARDÉES ; corriger ce qu'on voit.

---------------------------------------------------------------------------------------------------------------------------------

## 15. Ce qui reste à soumettre à Justin (trois questions, la spécification tient sans leurs réponses)

1. **Le bureau (Julie) doit-il voir Stock et Fournisseurs, matériel & produits ?** *Recommandation : oui, sans Dépôts et camions, sans « Accepter », sans changer un prix de vente.* Aujourd'hui elle n'a aucune des trois rubriques alors que ses propres données la montrent en train de recevoir des livraisons, et que l'écran Achats lui dit « Tu vois les demandes pour préparer les commandes » sans qu'elle puisse les préparer. Appliqué comme recommandé ; l'enlever = retirer deux routes de `ROLES.gestion`. (Rejoint la question 3 du menu final : le menu de chaque personne déduit de ses cases d'Équipe.)
2. **« Achats et frais » : garder le nom ou le remplacer par « Demandes et notes de frais » ?** *Recommandation : garder le nom décidé le 16 novembre et ajouter la phrase explicative sous le titre* (§9.3). Le nom ne dit pas « je décide ce que l'équipe dépense » ; la phrase le dit. Voir l'annexe A pour l'explication complète.
3. **Photo d'un article et scan d'étiquette : dans ce lot ou plus tard ?** *Recommandation : plus tard.* Le carré de 40 px des lignes est prévu pour une photo ; le prototype n'a pas de serveur et ne peut pas montrer un scan qui marche. À décider quand les techniciens le demandent.

---------------------------------------------------------------------------------------------------------------------------------

## ANNEXE A — « Achats et frais » : ce que c'est (la question de Justin du 16 novembre : « je sais pas ce que c'est, j'aimerais bien que tu m'expliques »)

**En une phrase : c'est la boîte où TU décides de ce que ton équipe veut dépenser, avant que l'argent sorte.** Deux onglets :
1. **Demandes** — ce que l'équipe demande d'acheter : « Il me faut 10 kg de fluide R32 pour lundi » (Tom), « une échelle 3 plans » (Sophie), « une perceuse » (Karim). Pour chaque demande, l'application a déjà regardé et dit ce que tu peux faire : « L'atelier en a 6 kg : on les met dans le camion de Tom, et les 4 kg qui manquent partent dans la commande Frigo Distribution 17 » → bouton « Transférer 6 kg et commander 4 kg » (il écrit dans le Stock ET dans les Commandes) ;
   ou « Tout commander », « Achat en magasin » (avec le budget du mois : « Petit outillage : 46 € déjà dépensés, budget 300 € »), « Demander une précision », « Refuser » (avec un motif qui part au demandeur).
2. **Notes de frais** — les repas, péages, parkings, carburant que les techniciens photographient (leur écran « Mes frais ») : tu valides ou tu refuses ; une note validée est remboursée avec la paie.

**Pourquoi c'est à part de la Comptabilité** : la Comptabilité garde l'argent DÉJÀ sorti (factures à payer, paiements, paie, TVA, banque, envoi à l'expert-comptable). « Achats et frais » garde ce qui se DÉCIDE avant (une demande à autoriser, une note à valider). Le code le dit : « Les Achats gardent ce qui se DÉCIDE avant l'argent ».

**Le rapport avec le matériel** : une demande d'un article du catalogue (« Fluide R32 ») est en réalité du stock et des commandes. Dans la refonte elle arrive aussi dans « À commander » (« Demandé par Tom ») et se traite des deux endroits, par le même geste. Seules les demandes hors catalogue (échelle, perceuse) et les notes de frais restent exclusivement dans « Achats et frais ».

---------------------------------------------------------------------------------------------------------------------------------

## ANNEXE B — Limites

- Les chiffres de gestes (§11) et les mesures visées (0,5 écran, 12 touchables, 4,5:1) sont des OBJECTIFS comptés sur le plan : la sonde les mesure à la livraison.
- Cette spécification a été écrite d'après le code et les captures de l'étude (Chromium sous Linux, profils émulés) : **aucun vrai iPhone, Windows ni Android n'a été vu** ; le rendu de la police système et des listes natives peut y différer. Les icônes filaires remplacent les émojis précisément pour cela.
- Le prototype n'a pas de serveur : l'aperçu PDF, l'envoi du courriel, « Ce que voit le fournisseur », l'export, la lecture d'une facture par photo, l'import de fichier restent SIMULÉS (le dire à l'écran : « simulé ») ; la refonte redessine le geste et le texte, pas leur fiabilité.
- La troisième proposition (vitesse) est arrivée tronquée après son troisième écran ; ses idées reprises ici (carte « Matériel » de l'Accueil, états d'article en 4 mots, conseil de seuil, feuille unique des gestes, « Le plus simple possible ») sont toutes présentes dans le texte reçu ; ses écrans Journal et Fluides sont couverts par §5.5 et §5.8.
- Les liens de fonctions (`pdxPmEnvoyer`, `bxPreparerReserve`…) sont ceux de l'étude : en cas de renommage entre lots, chercher par la phrase de l'écran plutôt que par le nom.
- Ce document ne touche ni `app.html`, ni `beta.html`, ni `apercu/` : il décrit un lot pour la phase d'implantation du prototype.
