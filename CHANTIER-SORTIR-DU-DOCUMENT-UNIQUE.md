# Sortir du document unique — chiffrage

Demandé par Justin le 15 septembre 2026 au soir : *« Je paye un putain de serveur tous les
mois. Alors, mets tout sur ce putain de serveur. »*

Ce fichier n'est pas une décision, c'est ce qu'il faut savoir pour la prendre. Il dit ce que
coûte l'état actuel, ce que le VPS changerait, en combien d'étapes, et ce qu'on perdrait.

---

## 1. Ce qu'on a aujourd'hui, en chiffres

Toute la base d'une entreprise tient dans **un seul document Firestore chiffré**, remplacé
**en entier** à chaque enregistrement.

| | valeur | source |
|---|---|---|
| plafond dur d'un document Firestore | **1 048 576 octets** | limite Google, non négociable |
| budget qu'on s'impose, en clair | 620 Ko | `NUAGE_BUDGET`, `app.html` |
| budget qu'on s'impose, chiffré | 780 Ko | `NUAGE_ENC_MAX` |
| base d'ELAN, chiffrée | **621 Ko** | mesuré le 11 septembre |
| … soit du plafond | **59 %** | |
| écritures Firestore / jour | 2 200 sur 20 000 | console Firebase, 15 septembre |
| lectures Firestore / jour | 12 000 sur 50 000 | idem |
| coût Firebase | ~0,50 €/mois | idem |
| couche de synchro à réécrire | **~480 lignes** | `syncPush` 201, `syncInit` 126, `fusionnerBases` 29, `boxFusionFine` 47, le reste |

**Le coût Firebase n'est pas l'argument.** 0,50 €/mois ne justifie aucun chantier. Ce qui le
justifie, c'est ce que le document unique a coûté en pannes.

## 2. Ce que le document unique a coûté, cette semaine seulement

- **11 septembre** — le document a dépassé la limite. L'écriture n'était jamais acquittée,
  l'application affichait « Connexion requise » plein écran et se rechargeait, **en boucle,
  sur tous les appareils**, alors qu'internet marchait et que la lecture passait.
- **15 septembre** — la compression a élargi l'attente de `syncPush` de ~178 ms à ~433 ms. Une
  réception pendant cette attente, et l'appareil écrivait un instantané périmé : `set()`
  **remplace** le document, donc **le travail du collègue disparaissait pour toute l'équipe**.
  Corrigé en v693 par une garde — mais une garde, ça se contourne un jour. La cause reste le
  remplacement global.
- **En permanence** — les pièces jointes et les photos sont **retirées de la copie poussée**
  (`syncAlleger`) pour tenir dans le plafond : elles restent sur l'appareil qui les a prises et
  ne sont jamais partagées. Le journal est plafonné à 500 entrées, l'archive des interventions
  à 500 aussi. **Ce ne sont pas des choix produit, ce sont des conséquences du plafond.**
- **Sur le terrain** — chaque salve d'enregistrement renvoie **621 Ko** en 4G, même pour avoir
  coché une case.

## 3. Deux façons de le faire, et elles ne coûtent pas la même chose

### Option A — le serveur TRANSPORTE, il ne lit rien *(recommandée)*

Chaque enregistrement (une intervention, une ligne de stock, une fiche produit) part
**chiffré, séparément**, vers le VPS. Le serveur range des blocs qu'il ne peut pas ouvrir,
exactement comme il le fait déjà pour les copies de sauvegarde.

Ce que ça règle :
- ✅ **plus de plafond** — une base peut grandir sans limite ;
- ✅ **plus de remplacement global** — la course du 15 septembre devient *structurellement*
  impossible, au lieu d'être gardée par une condition ;
- ✅ **les pièces jointes et les photos se partagent enfin** ;
- ✅ **on envoie ce qui a changé**, pas 621 Ko à chaque geste ;
- ✅ **la position juridique ne bouge pas** : le serveur ne peut toujours rien lire, donc
  `sous-traitance.html` reste vrai.

Ce que ça ne règle pas : le serveur ne peut ni chercher, ni filtrer, ni faire de rapport — il
ne comprend rien à ce qu'il stocke. La fusion reste côté application (mais **enregistrement par
enregistrement**, ce qui est justement ce qu'on veut).

### Option B — le serveur LIT

Les enregistrements arrivent en clair dans une base sur le VPS (SQLite ou Postgres).

En plus de tout ce qui précède : recherche côté serveur, rapports, tableaux de bord, export,
et une vraie concurrence multi-appareils gérée par la base elle-même.

⛔ **Mais TeamOP devient alors un traitant des données de ses clients, au sens propre.** Ça
change le contrat de sous-traitance, les obligations de sauvegarde, la notification en cas de
violation, et le jour où un serveur est compromis, ce sont les fichiers clients d'ELAN qui
partent — pas des blocs illisibles. **Ce n'est pas un détail technique, c'est un changement de
métier.**

**Mon avis : A d'abord.** Elle règle tout ce qui a fait mal cette semaine sans toucher au
juridique. B reste possible ensuite, en connaissance de cause — jamais dans la foulée.

## 4. Les étapes, et ce que chacune coûte

Estimations en journées de travail effectif, à faire **sur la bêta d'abord** (règle du
11 septembre), donc étalées sur 2 à 3 semaines de calendrier.

| # | Étape | Jours | Ce qu'on gagne dès cette étape |
|---|---|---|---|
| 0 | **Sortir les pièces jointes et les photos** vers le VPS, référencées par identifiant | 1–2 | ELAN repasse **très en dessous** du plafond, et les photos se partagent enfin. **Gagnant même si on s'arrête là.** |
| 1 | **Le transport** — routes « poser un enregistrement », « lire ce qui a changé depuis », et un flux temps réel (SSE, sans dépendance nouvelle) | 2–3 | rien de visible, tout est en place et éprouvé |
| 2 | **Le client** — remplacer `syncPush`/`syncInit` par un envoi de deltas, en **double écriture** (VPS *et* Firestore), lecture toujours depuis Firestore | 3–4 | rien ne casse : on peut revenir en arrière à tout moment |
| 3 | **La bascule** — lecture depuis le VPS, Firestore gardé en miroir une semaine | 1 | le plafond disparaît vraiment |
| 4 | **Retirer Firestore** | 0,5 | une dépendance de moins, un compte Google de moins |
| | **Total** | **8 à 11 jours** | |

L'étape 0 est déjà ouverte dans `REPRISE.md` (chantier « sortir les pièces jointes »). C'est
par elle qu'il faut commencer quoi qu'il arrive : elle est utile seule, elle ne casse rien, et
elle rend les trois suivantes moins urgentes.

## 5. Ce qu'on perd, et qu'il faut accepter en le sachant

- ⛔ **Le VPS devient le point unique de panne du travail des clients.** Aujourd'hui, s'il tombe,
  l'API s'arrête mais la synchro continue — c'est Google qui la porte. Après, s'il tombe,
  **personne ne travaille**. Il faut donc : des sauvegardes hors du VPS, une surveillance qui
  réveille, et une réponse écrite à « le serveur est mort, on fait quoi ». Les deux premiers
  existent déjà en partie ; le troisième, non.
- **Il faut de la place et de la sauvegarde disque** — à vérifier sur le VPS avant l'étape 0.
- **Le temps réel est à écrire.** Firestore offrait `onSnapshot` gratuitement. Un flux SSE le
  remplace bien, mais c'est du code à nous, donc à nous de le maintenir.

## 6. Ce que ce chantier NE règle PAS

À ne pas confondre, sinon on croira le problème traité :

- l'ouverture de l'application — **1 801 ms** rien qu'à lire les 3,2 Mo d'`app.html` ;
- `save()` à **90 ms** par geste ;
- la lenteur de frappe — **déjà corrigée** en v693, sans rapport avec le nuage.

---

*Établi le 15 septembre 2026. Les chiffres viennent de mesures datées, pas d'estimations : les
revérifier avant de s'en servir s'ils ont plus de quelques jours.*
