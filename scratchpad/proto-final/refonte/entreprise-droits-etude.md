# Étude : « Mon entreprise », les droits d'Équipe qui agissent, « Achats et frais » (voie entreprise, étape 1 sur 8, 16 novembre 2026)

Lu dans le code, aucune page modifiée, aucun navigateur ouvert. Base : `apercu/prototype-op-gestion.html` au commit `8fbcbf1`
(22 814 lignes). ⚠️ Les numéros de ligne bougent : d'autres voies (Matériel, Véhicules, Temps de travail, Boîte mail, atelier)
écrivent dans le même fichier. Chaque point d'appui est donc donné avec le NOM de sa fonction ; la ligne n'est qu'un repère.
Les chiffres de recensement sortent de deux petits scripts relançables : `scratchpad/proto-final/refonte/entreprise-droits-outils/`
(`gestes.js` : toutes les valeurs `data-*` par famille ; `gestes-par-categorie.js` : verbes d'écriture rangés par catégorie de droit, avec `annexe.txt` ; `derive.js` : le menu que donnerait « la case Voir seule »). Lancer depuis la racine du dépôt.

## 0. Ce qu'il faut retenir (douze lignes)

1. **Les réglages de l'entreprise ne sont pas éparpillés : la plupart n'existent NULLE PART.** Nom, adresse, SIRET, TVA, téléphone,
   e-mail, IBAN, logo, tarif horaire, forfaits de déplacement, horaires de travail, expert-comptable : lus partout, modifiables
   nulle part (constantes `ENTREPRISE`, `TARIFS`, `PARAMS`, `CP_EXPERT`). Seuls la fiche légale, les rendez-vous en ligne, la
   facturation automatique, les règles de notes de frais, la validation du stock et les boîtes mail ont un écran, chacun caché
   dans sa rubrique.
2. **« Une facture est bloquée sans SIRET » n'est pas vrai dans le code** : aucune garde n'existe, et le SIRET ne se modifie pas.
   La phrase de « Comment ça marche » (« il manque ton SIRET ou ton adresse dans tes réglages ») promet quatre retenues sur cinq
   qui n'existent pas. « Mon entreprise » devra donc CRÉER la garde, pas seulement rassembler.
3. **Plusieurs phrases renvoient à un écran « Paramètres » qui n'existe pas** (création d'intervention : horaires ; ajout d'un type
   d'intervention ; surtitre de « Rendez-vous en ligne »), et l'atelier de documents dit « Ton entreprise se règle dans OP GESTION »
   alors que rien ne la règle.
4. **Un bug trouvé en passant** : la fiche légale écrit `assur`, `assurc`, `zone` ; le pont vers l'atelier lit `assureur`,
   `assurNum`, `assurZone`. L'assurance saisie n'arrive donc jamais dans l'atelier.
5. **Droits : sur 47 cases affichées dans la fiche d'une personne, aucune « Créer / Modifier / Supprimer » (30) et aucun « droit à
   part » (7) ne fait quoi que ce soit** ; les dix « Voir » n'agissent que pour deux rôles et que pour 7 catégories sur 10.
   La fiche le dit elle-même en petit (« ne sont pas encore appliqués »).
6. **Le menu ne suit pas les cases, il suit un NOM de rôle** : `sessionRole()` range tout le monde dans quatre moules
   (patron, gestion, tech, comptable). Responsable et Secrétariat sont le même moule : mêmes 7 lignes, alors que leurs cases en
   promettent 19 et 17. Un technicien ajusté (`tech*`, Karim) reste technicien.
7. **Il n'existe aucun point de passage unique pour les écritures** (aucun dépôt de données : 29 `TACHES.push`, 17 `INTS.push`,
   16 `ACHATS.push`…). La garde se pose donc au niveau du GESTE : un écouteur en capture sur `window` (click, change, input,
   keydown, pointerdown, contextmenu) + un nettoyage après chaque `rendre()` + `rlPermis()` pour les adresses. Faisable, mesuré
   plus bas : environ 265 gestes d'écriture reliés par `data-*`, 138 écouteurs de clic, environ 74 écouteurs déjà en capture.
8. **Qui a fait quoi est faux dès que quelqu'un d'autre que Marc écrit** : 92 `journalAjout('marc', …)` en dur, plus `MOI = 'marc'`.
   Brancher les droits sans corriger ça, c'est faire dire au journal que Marc a fait ce que Julie a fait.
9. **Quatre des sept « droits à part » sont chers à brancher** (`prix` : ~25 endroits qui affichent un prix d'achat ou une marge,
   dans des écrans que d'autres agents refont en ce moment ; `tout` : 320 lectures de `INTS`). Recommandation : en brancher
   quatre, en retirer trois (§ 2.8).
10. **« Achats et frais » se comprend mal parce que son sous-titre parle de « ce que l'équipe demande » sans dire quoi** et que le
    menu ne dit rien sous le nom. Le texte proposé est mot pour mot au § 3.
11. **Chantier chiffré** (§ 2.10) : « Mon entreprise » ≈ 1 journée-agent ; droits ≈ 3 à 4 journées-agent (garde commune, 9 gardes
    de rubrique, menus déduits, attribution, 7 droits, sondes, mutations). Ce qui tombera : les sondes `menu-*` qui figent « Julie
    = 7 lignes ».
12. **Cinq doutes à dire à Justin** sont au § 4 (le premier : la phrase « une facture est bloquée sans SIRET » promettait une
    garde qui n'a jamais existé).

---

## 1. Les réglages de l'entreprise : où ils vivent

### 1.1 Table (nom affiché · chemin de clics · fonction · données · effet réel · modifiable ?)

| # | Réglage | Chemin pour y arriver | Fonction | Données | Effet réel | Modifiable ? |
|---|---|---|---|---|---|---|
| R1 | Nom, adresse, téléphone, e-mail, site, IBAN, BIC, nom du dirigeant | aucun | — | `const ENTREPRISE` (`nom, adr, siret, tva, tel, mail, iban, patron` ; `site`, `bic` n'existent pas) | 89 lectures de `ENTREPRISE.nom`, les 17 en-têtes de PDF, e-mails, bons de commande, bilans, `opdDonnees()` vers l'atelier | **non** |
| R2 | SIRET, n° de TVA | aucun (affichés en gris dans la fiche légale) | `cxFicheLegale` | `ENTREPRISE.siret`, `.tva` | PDF des devis, factures, bilans, registre ; nom du fichier FEC (`cpFecNom`) ; contrôle `cxPdfManque` | **non** |
| R3 | Fiche légale : forme juridique, capital, immatriculation, assurance (assureur, coordonnées, zone), médiateur | Comptabilité › Conformité › Aux normes › « Les mentions obligatoires » › « Compléter ma fiche légale » | `cxFicheLegale` → `data-cx="ficheok"` (`Object.assign(ENTREPRISE, …)`) | `forme, capital, rcs, assur, assurc, zone, mediateur` | écrits au pied des devis (`docDevis` enveloppé) et des factures (`pdfFacture` enveloppé) ; contrôles de conformité | oui |
| R4 | Logo | aucun | — | aucune donnée : étiquette fixe « CS » dans 17 gabarits (`class="logo-ent"`), « CS » dans l'espace client | tous les documents | **non** |
| R5 | Tarif horaire, minimum, arrondi, trois forfaits de déplacement (29,17 / 45 / 62 €) | aucun | — | `const TARIFS` | 17 lectures : facture « au temps », nouvelle intervention, assistant de devis, devis xylophage | **non** |
| R6 | Horaires de travail (7 h → 18 h) | aucun | — | `const PARAMS` | `rdvHeures` (créneaux proposés au client), création d'intervention | **non** |
| R7 | Rendez-vous en ligne (jours et demi-journées ouverts, délais, après devis accepté) | Planning › bouton « Rendez-vous en ligne » | `panneauReglagesRdv`, `[data-rr]` | `RDV_REGLES` | créneaux offerts au client (suite d'un devis accepté) | oui |
| R8 | Facture envoyée toute seule · relances automatiques | Comptabilité › Ventes › Factures et avoirs › bas de page « Le plus simple possible » (2 cases) | `[data-reglage]` | `reglages {auto, relance}` | `auto` : `ACTIONS.terminer` envoie la facture si toutes les lignes ont un prix. `relance` : **n'agit sur rien** | oui |
| R9 | Notes de frais : « sans ticket », prix du kilomètre, budgets par poste | Achats et frais › Notes de frais › « Changer › » (gérant seul, `cxEstPatron`) | `data-axa="regle|kmtarif|budget"` | `NDF_REGLE`, `AX.kmTarif`, `AX.budget` | validation des notes | oui |
| R10 | Les sorties du stock attendent une validation · valider seul ce qui est utilisé chez un client | Stock › « À valider » (cases `data-skvalid`, `data-sxauto`) | `stkVueValider` | `STK_VALID`, `SX.autoUsage` | mouvements en attente ou directs | oui |
| R11 | Habilitations exigées pour certaines interventions | Équipe › « Habilitations exigées… » | `data-eqx="regles"` | `eqxRegles` | alerte à l'affectation | oui (reste dans Équipe) |
| R12 | Boîtes mail : Google, Microsoft, autre (IMAP) ; boîte d'envoi par défaut ; signature ; relance après N jours ; règles de rangement | Boîte mail › « Boîtes connectées » | `mbxPanBoites` | `ML_BOITES`, `MBX` ; le module `prototype-courrier.js` a SES propres « Réglages » (signatures, son, notifications) | lecture et envoi | oui, **deux écrans pour une même boîte** |
| R13 | Métiers de l'entreprise (packs : climatisation, chauffage, plomberie, 3D…) | **aucun en mode application** (le bouton « Métiers » est dans la bande de test, cachée) | `mchPanneau` (« Pour essayer ») | `PACKS_ENT` | catalogue, fournisseurs, types d'intervention, modèles de devis et de contrat, groupe « Hygiène anti-nuisibles (3D) » | non (dit « réglé par TEAM OP ») |
| R14 | Expert-comptable, cabinet de paie | aucun | — | `CP_EXPERT`, `PAIE_CAB` | « Envoyer à ton expert-comptable », paie | **non** |
| R15 | Plateforme agréée (facture électronique) | Comptabilité › Conformité › Aux normes › « La facture électronique » | `cxPlateforme` | `CX_CONF.pa…` | contrôle de conformité | oui |
| R16 | SIREN des clients professionnels | Comptabilité › Conformité › Aux normes | `cxSirenForm` | `CLIENTS[k].siren` | mention sur la facture du client | oui (c'est une donnée CLIENT, pas de l'entreprise : simple lien) |
| R17 | Banque, paiement en ligne | Comptabilité › Trésorerie › Banque / Paiement en ligne (cadre `prototype-paiement.html`) | `data-cx="enlignePlein"` | module à part | encaissement | module, simple lien |
| R18 | Délai de paiement (30 jours), pénalités, indemnité de 40 € | aucun | — | écrits en dur (`f.ech = '30/11'` dans `envoyerFacture`, pied de `pdfFacture`) | échéance de chaque facture | **non** |
| R19 | Numérotation des devis, contrats, factures | aucun | — | `numSuiv`, préfixes `D-2026-`, `CTR-2026-`, `FAC-2026-` en dur | numéros | **non** |
| R20 | En-têtes des documents sur mesure (logo, couleurs, polices, pied) | Devis › « Composer un devis » › fenêtre « Mon entreprise » / « En-tête » de l'atelier | atelier (`page.source`) | rangement de l'atelier ; l'identité PAR DÉFAUT y est **verrouillée** en mode application (« Ton entreprise se règle dans OP GESTION ») | documents composés | partiellement |
| R21 | Places de l'abonnement | Équipe › carte « places utilisées » | `data-eqx="kpi|places"`, `placeok` | `EQ_PLACES` | limite d'invitations | oui (reste dans Équipe) |
| R22 | Apparence Jour / Nuit / Auto, barre du bas personnalisée, vues du planning | pied du menu ; appui long sur la barre ; Planning › « Enregistrer cette vue » | `segMode`, `mbPanneau`, `vueEnregistrer` | `localStorage` : `opg_proto_mode`, `opg_proto_barre`, `opg_proto_vues` | **état de l'appareil**, pas de l'entreprise | oui, et **n'a rien à faire dans « Mon entreprise »** |

Décompte : 22 lignes. **9 ne sont modifiables nulle part** (R1, R2, R4, R5, R6, R14, R18, R19, plus R13 en mode application) ;
**7 vivent dans la rubrique qu'elles règlent** et y restent (R7, R9, R10, R11, R12, R21, R22) ; **6 sont à rassembler ou à créer**
(R1–R6, R14) ; R3, R8, R15 sont déjà des écrans qu'on rend atteignables d'ici.

### 1.2 Les phrases qui renvoient à un écran « Paramètres » ou « réglages » absent

| Où | Texte exact | Verdict |
|---|---|---|
| `ACTIONS_CREA.cAjoutType` (création d'intervention › « Ajouter un type ») | « Il sera proposé pour toutes les prochaines interventions (réglable aussi dans Paramètres). » | écran absent : devient un lien « Mon entreprise › Types d'intervention » si la carte existe, sinon retirer la parenthèse |
| création d'intervention, aide des créneaux (`rdvHeures` / vue « jour ») | « …entre 7 h et 18 h (horaires de l'entreprise, dans Paramètres) » | idem : lien vers la carte « Horaires » |
| `panneauReglagesRdv` | surtitre « Paramètres » au-dessus de « Rendez-vous en ligne » | à remplacer par « Mon entreprise » (ou « Planning ») |
| `ACTIONS.commentAuto` (« Comment ça marche », facture automatique) | « il manque ton SIRET ou ton adresse dans tes réglages » | promesse sans code (§ 1.3) |
| visite « à venir » (`avenir`, rôles) | « Patron : les réglages, l'équipe, les chiffres » | promet des réglages qui n'existent pas : à écrire après « Mon entreprise » |
| atelier (`page.source`, fenêtre « Mon entreprise ») | « Ton entreprise se règle dans OP GESTION. Son nom, son adresse, son SIRET, sa TVA et son IBAN viennent de là » | renvoi dans le vide aujourd'hui ; il devra mener à « Mon entreprise » (message `opd_ouvrir` ou lien du parent) |
| Nouveautés (`NV_PLACE`) | « Boîtes mail (Paramètres) → Boîte mail › Boîtes connectées » | **correct** : c'est la colonne « avant » (la vraie application s'appelait ainsi) |
| `mchPanneau` | « Dans l'application, ce réglage est fait par TEAM OP à l'ouverture du compte. » | exact ; à reprendre tel quel dans la carte « Tes métiers » (lecture seule) |

### 1.3 « Une facture est bloquée sans SIRET » : ce que fait réellement le code

* `ACTIONS.terminer` envoie la facture si et seulement si `reglages.auto` ET `lignesDe(fa).every(l => l.pu != null)`.
* `envoyerFacture`, `ACTIONS.envoyer`, l'envoi d'un devis et l'envoi d'un contrat ne regardent jamais l'identité de l'entreprise.
* `cxMentionsManquantes` (le contrôle « Aux normes ») compte la forme, le capital, l'immatriculation, l'assurance : jamais le
  SIRET, le nom, l'adresse, la TVA. Normal : ils sont toujours pleins, faute de pouvoir les changer.
* Sur les cinq raisons de retenue du « Comment ça marche » (ligne sans prix · pas d'e-mail du client · plafond · premier passage ·
  « Je ne peux pas finir » · SIRET ou adresse manquants), **une** est dans le code. À trancher à la spécification : brancher
  les raisons qui comptent (identité incomplète ; client sans e-mail ; « Je ne peux pas finir »), retirer le plafond et le
  « premier passage » du texte tant qu'ils n'existent pas, ou les construire.

### 1.4 Ce que « Mon entreprise » doit comporter, d'après cet inventaire (matière pour l'étape 2)

* **Identité** (R1, R2, R3, R4) : une seule fiche pour tout ce qui s'imprime. Les champs de R1 sont de simples saisies qui
  écrasent `ENTREPRISE` par `Object.assign`, exactement comme `ficheok` le fait déjà : les 89 lectures, les 17 PDF et
  `opdDonnees()` (rappelé après chaque `rendre()` par `opdSync`) suivent sans aucun câblage neuf. Le logo demande un
  gabarit commun (`logoEnt()`) à la place des 17 « CS ». **Complétude** : nom, adresse, SIRET obligatoires (une fiche
  « complète » est ce que lisent la garde d'envoi et la pastille « à compléter » du menu).
* **Tarifs et déplacements** (R5, R18) et **horaires** (R6) : champs simples sur des constantes déjà lues partout. Ils rendent
  vrais les mots « tarif de l'entreprise » de l'assistant devis et de la facture au temps.
* **Rendez-vous en ligne, facturation automatique, notes de frais, validation du stock** (R7–R10) : à garder dans leur
  rubrique (c'est là qu'on en a besoin), et chacun devient un lien depuis « Mon entreprise » sous une rubrique « Ce qui se fait
  tout seul », avec l'état en clair (« Activé · 3 retenues »). Pas de copie de la case à deux endroits : une case, un endroit.
* **Boîtes mail** (R12) : un lien vers « Boîte mail › Boîtes connectées » (et « Réglages » du module). Ne pas écrire un
  troisième écran ; la voie `mail` refait justement celui-là.
* **Tes métiers** (R13) : lecture seule + « réglé par TEAM OP ».
* **Expert-comptable** (R14) : trois champs.
* **Ce qui n'y entre pas** : R11, R16, R17, R21 (restent dans leur écran, avec un lien si besoin) et R22 (appareil, au pied du menu).

### 1.5 Place au menu : démonstration

Règles de `MENU-FINAL.md` : un groupe n'a jamais une seule ligne ; les mêmes rubriques portent les mêmes noms pour tous les rôles ;
une seule table `CATS` nourrit menu, feuille « Menu », recherche et barre personnalisable. Candidats :

| Place | Pour | Contre |
|---|---|---|
| « Personnel » après « Véhicules » (défaut du mandat) | respecte les trois règles ; quatre lignes (Équipe, Temps de travail, Véhicules, Mon entreprise) ; sort de `CATS` donc de la recherche et de la barre ; `rlPermis('entreprise')` suit la case `admin` | le groupe parle de personnes, pas de l'entreprise |
| Groupe neuf « Entreprise » | nom exact | une seule ligne : interdit par la règle 2 |
| Pied du menu (à côté de « Nouveautés ») | habitude du réglage « en bas » | sort de `CATS` : n'apparaît ni dans la recherche ni dans la barre ; le pied est réservé à ce qui n'est pas une rubrique ; doublon sur téléphone avec la feuille « Menu » |
| Dans « Équipe » (onglet) | une seule ligne de plus évitée | l'écran Équipe est validé par Justin : on n'y touche pas |

**Conclusion : le défaut du mandat tient, aucun meilleur endroit n'est démontrable.** Précisions à la spécification : la case qui
l'ouvre est `admin` (l'ancien libellé « Équipe et réglages » existait avant le renommage en « Équipe ») ; Responsable (case `admin`
en lecture) la VOIT sans pouvoir la modifier ; une pastille « à compléter » sur la ligne tant que SIRET ou adresse manquent ;
tous les « (réglable dans Paramètres) » deviennent des liens vers elle.

### 1.6 Autres trouvailles faites en lisant les réglages (à corriger dans la même étape)

* **Bug du pont atelier** : `opdDonnees()` lit `ENTREPRISE.assureur`, `.assurNum`, `.assurZone`, mais `ficheok` écrit `assur`,
  `assurc`, `zone`. Résultat : l'assurance de la fiche légale n'atteint jamais l'atelier. À corriger en unifiant les noms.
* `ENTREPRISE.site` et `.bic` n'existent pas (`lig(undefined)` rend `''`) : aucun champ ne les écrit.
* Deux écrans de réglages pour une boîte mail (R12) : décision de la voie `mail`, à ne pas dupliquer.

---

## 2. Les droits

### 2.1 Le modèle, tel qu'il est

* `DR_CATS` : 10 catégories (planif, inter, crm, ventes, compta, stock, temps, com, achats, admin) × 4 cases (`v` voir, `c` créer,
  `m` modifier, `s` supprimer) = **40 cases**.
* `DR_SP` : 7 « droits à part » (`tout`, `prix`, `atelier`, `valstock`, `commander`, `corrpt`, `comptes`) = **7 cases**.
* `PROFILS` : admin (tout), `resp` Responsable, `secr` Secrétariat, `tech` Technicien, + `compta` ajouté plus bas. Une personne
  porte `droits = { profil, cats, sp }` ; un `*` après le nom de profil veut dire « ajusté ».
* `EQUIPE` : 6 personnes (Marc admin, Julie `secr`, Sophie/Léa/Tom `tech`, Karim `tech*` avec `atelier` et `valstock`).
* Seul Marc est administrateur : le menu « profil » de la fiche et du formulaire d'invitation exclut `admin`, et la fiche d'un
  administrateur désactive ses cases. **Le gérant ne peut donc pas se retirer ses droits ni se désactiver s'il est le dernier**
  (déjà vrai ; à garder tel quel).
* `sessionRole(p)` : `admin → patron`, `compta → compta`, `tech → tech`, **tout le reste → gestion** (`resp`, `secr`, un profil
  `resp*`…). Le `*` est retiré avant la comparaison : une personne « compta* » ou « tech* » garde le moule de son profil d'origine.
* `ROLES` : `patron, gestion, tech, client` + `compta` ; chaque rôle porte une liste `routes` (complétée par une dizaine de `routes.push`
  dispersés : `taches`, `mesheures`, `absences`, `moncamion`, `boxes`, `achats`, `carteBox`, `registre`, `devisXylo`).
* `rlPermis(route)` : patron → tout sauf 4 écrans de salarié ; sinon `ROLES[ROLE].routes.includes(route) && !drRefuse(route)`.
* `rlLignes()` : le patron lit `CATS` ; les autres lisent `LIGNES_ROLE` (gestion : 7 lignes ; tech : 6 + registre 3D) filtrées par
  `rlPermis`. Barre du bas : `mbRetenue()` (patron) ou `BARRE_ROLE`.
* `drRefuse(route)` : seule lecture de la case « Voir », et seulement si `ROLE` est `gestion` ou `tech`, par une table de 11 + 5
  routes. `mbxAcces` lit `cats.com.v` pour confier un courriel. `drNav` n'existe pas (le nom du mandat désigne `drRefuse` +
  `rlLignes`).

### 2.2 Ce qui AGIT aujourd'hui

| Case | Ce qui se passe | Pour qui |
|---|---|---|
| `compta.v` | retire Comptabilité (et les adresses `facture`, `factures`, `encaissements`) | gestion |
| `ventes.v` | retire Devis, Contrats, `devisXylo`, pages facture/contrat/signature | gestion |
| `crm.v` | retire Clients, fiches client ; pour le technicien `clientvoit` | gestion, tech |
| `inter.v` | retire Interventions et la fiche d'une intervention | gestion |
| `achats.v` | retire Achats et frais | gestion |
| `stock.v` | retire `boxes`, `carteBox` | tech |
| `temps.v` | retire `moncamion`, `mesheures` | tech |
| `com.v` | décide seulement si on peut confier un courriel à la personne | tous |
| accueil du rôle gestion | première rubrique non refusée (la propriété `accueil` est un getter) | gestion |

**Le reste n'agit pas** : `planif.v` (Planning, Tâches, Absences : rien), `admin.v` (Équipe : le gérant seul la voit par le moule),
`inter.v` et `achats.v` pour le technicien (Ma journée, Mes frais : jamais refusés), les 30 cases `c`/`m`/`s`, les 7 droits à part.
Vérifié : `grep` sur `cats.X.c/m/s` et `.sp.` ne trouve que l'affichage de la fiche et de « Qui peut quoi ».
Soit, au mieux, **8 cases sur 47 qui agissent** (7 « Voir », plus `com.v` pour les courriels confiés), pour deux moules sur quatre ; **39 n'agissent pas** (2 « Voir » : Planning-tâches-absences et Équipe ; les 30 « Créer / Modifier / Supprimer » ; les 7 droits à part).

### 2.3 La démonstration du « même moule » (script `derive.js`)

| Personne | Menu aujourd'hui | Ce que « la case Voir seule » donnerait | Promis par les cases, absent du menu |
|---|---|---|---|
| Responsable (`resp`) | 7 lignes (Tâches, Interventions, Clients, Devis, Contrats, Comptabilité, Achats) | **19** (+ Accueil, Statistiques, Historique, Planning, Absences, Boîte mail, Stock, Fournisseurs, Dépôts, Équipe, Temps, Véhicules) | 12 |
| Secrétariat (`secr`) | **les mêmes 7** | **17** (comme ci-dessus, sans Historique ni Équipe) | 10 |
| Technicien (`tech`) | 6 (Ma journée, Mes tâches, Mes frais, Mes heures, Mon camion, Mes congés) | 12 (Planning, Interventions, Clients, Boîte mail, Achats, Stock, Fournisseurs, Dépôts, Temps, Véhicules, Tâches, Congés) | 10 |

⚠️ **Ce tableau montre un piège de conception, pas seulement un manque.** Appliquer « la case Voir » telle quelle donnerait à un
technicien un menu de gérant (Stock, Fournisseurs, Boîte mail…) sur son téléphone, et ses écrans personnels disparaîtraient.
La notion qui manque est celle de la FORME de l'écran : **l'écran d'équipe** (Planning, Interventions, Stock, Temps de travail,
Achats et frais) et **l'écran de la personne** (Ma journée, Mon camion, Mes heures, Mes frais, Mes congés). Les cases disent
quelle catégorie on ouvre ; une règle dit quelle forme on reçoit. Deux candidats, à trancher à l'étape 2 :

* **A.** la forme suit une case déjà présente à l'écran : « Travaille sur le terrain » (formulaire d'invitation, filtre
  « Terrain » : `eqxTerrain`) → écrans de la personne ; sinon écrans d'équipe. Cohérent avec « un rôle est un nom ».
* **B.** la forme suit le droit à part `tout` (« Voir les interventions de toute l'équipe, sinon seulement les siennes ») :
  tout = écrans d'équipe, sinon les siens. Seul droit déjà écrit pour dire cela, mais son libellé ne parle que d'interventions.

Recommandation d'étude : **A pour la forme des écrans, `tout` pour filtrer les listes de l'écran d'équipe** (Planning, Interventions).
À valider par la spécification et par la critique.

Autres rubriques qui n'ont qu'une forme (Clients, Devis, Contrats, Comptabilité, Équipe, Véhicules, Boîte mail…) : la case
`Voir` ouvre l'écran, en LECTURE SEULE si `c`/`m`/`s` manquent (comme `axLect()` le fait déjà pour Achats et frais).

### 2.4 Décisions « au nom du rôle » à convertir (la règle du dépôt : un rôle est un nom, une règle est une case)

`ROLE === 'tech'` : 52 lignes · `'patron'` : 23 (+ 6 `!==`) · `'gestion'` : 8 (+ 7) · `'client'` : 25 · `'compta'` : 5.
Parmi elles, les décisions de FORME d'écran du client et du comptable restent (ce sont des applications différentes).
À convertir : `axLect()` (`ROLE === 'gestion'` : Achats et frais en lecture), `cbRO()` (carte des box), `cbPatron()`, `cxEstPatron()`
(règles de notes de frais, paie : 5 lectures), `tkxPerso()`, les 7 `ROLE !== 'gestion'` qui masquent « Voir au planning »
et « Planifier », `rcCreer` et la palette (`ROLE !== 'patron'` : seul le gérant crée par la touche N / D / C / A), `mabarre`
(barre personnalisée du gérant), l'attribution `aComme !== 'marc'` des absences. Ce sont **environ 40 des 128 lignes**.

### 2.5 Qui a fait quoi

* 92 `journalAjout('marc', …)`, 11 `journalAjout(rlQui(), …)`, 9 autres ; `MOI = 'marc'` (15 lectures) ; `T_MOI = 'marc'` ; 275
  occurrences de `'marc'` au total (la plupart sont des données de démonstration, une bonne trentaine sont des acteurs).
* Si une secrétaire peut créer un client et supprimer une tâche, le journal et les « Messages du bureau » doivent dire **elle**.
  Il faut une fonction unique `acteur()` (= `SESSION`, sinon `marc`) et la poser dans les 92 appels : changement mécanique,
  mais à faire AVANT de brancher les gardes, sinon le journal ment dès le premier geste.

### 2.6 Le recensement des gestes d'écriture

**Comment la page relie ses boutons.** Attributs `data-<famille>="verbe|…"` (241 familles) lus par des écouteurs délégués
(`closest('[data-xx]')`) ; une table `ACTIONS` (49 entrées + 10 ajoutées par `ACTIONS.x = function`) atteinte par `data-action` ;
`ACTIONS_CREA` pour la fenêtre de création. Écouteurs : **138 `click`, 59 `change`, 33 `input`, 17 `keydown`, 6 `contextmenu`,
7 `pointerdown`, 16 `mousedown/mouseup/touchend`, 1 `dragstart` + 1 `drop`** ; environ 74 sont déjà posés en capture. Quatre touches
de création (N, D, C, A) passent par `RC_CREER` et la palette.

**Verbes d'écriture distincts reliés par `data-*`** (script `gestes.js`, heuristique sur le nom du verbe ; une ouverture de
formulaire et sa confirmation comptent chacune : on garde les deux, l'ouverture pour la masquer, la confirmation pour la refuser) :

| Catégorie de droit | Créer | Modifier | Supprimer | Écrans |
|---|---|---|---|---|
| Planning, tâches, absences (`planif`) | 1 | 1 | 3 | ⚠️ peu d'attributs : l'essentiel passe par le glisser (`mousedown`/`touchstart` 4184, 4194, 6931, 6938), le menu du clic droit (4306, 6961), `data-tkx*`, des champs en saisie — **~12 portes à recenser à la main** |
| Interventions (`inter`) | 1 | 10 | 0 | + 11 verbes des `ACTIONS` (terminer, pasFini, creerOk, modifIntOk, noteOk, photoSuppr…) |
| Clients (`crm`) | 0 | 0 | 0 | tout passe par `ACTIONS` (clientNouveau, clientEnreg) et les formulaires `ci`, `cnv` |
| Devis, factures, contrats, paiements (`ventes`) | 11 | 10 | 2 | + 12 verbes `ACTIONS` (envoyer, avoirOk, ajoutEncOk, creerContrat…) ; atelier : `opd_*` |
| Comptabilité (`compta`) | 1 | 26 | 1 | dont 13 de la paie |
| Fournisseurs, matériel, stock, dépôts (`stock`) | 12 | 40 | 10 | refaits en ce moment par la voie `materiel` |
| Temps de travail et véhicules (`temps`) | 6 | 34 | 3 | refaits en ce moment par la voie `vehtemps` |
| Boîte mail (`com`) | 5 | 4 | 3 | refaite par la voie `mail` ; le module `prototype-courrier.js` crée interventions et devis depuis un courriel |
| Achats et frais (`achats`) | 0 | 23 | 2 | |
| Équipe (`admin`) | 7 | 9 | 4 | |
| Espace client | 0 | 4 | 0 | rôle `client` : pas concerné |
| **Total** | **~44 + 8 `ACTIONS`** | **~157 + 22 `ACTIONS`** | **~28 + 5 `ACTIONS`** | **≈ 265 verbes** |

Détail famille par famille : **annexe A**. Les écritures de données sont éparses (aucun dépôt) : `TACHES.push` 29, `INTS.push` 17,
`ACHATS.push` 16, `MAILS.push` 7, `PRODUITS.push` 6, `DV.push` 4, `MES_FOURN.push` 4, `POINTAGES.push` 4, `BUREAU.push` 3, `ABSENCES.push` 2,
`VEHICULES.push` 2, `EQUIPE.push` 2, `CONTRATS.push` 1, `DEM_ACHAT.push` 1 ; suppressions : 8 `splice` sur `TACHES`, 9 sur `ACHATS`…
Seules portes de fonction un peu communes : `poser()` (glisser / redimensionner / placer au planning), `stkAppliquer()` (« la seule
porte du stock », dit son commentaire), `envoyerFacture()`, `payer()`, `factureDepuis()`.

### 2.7 Les points de passage communs où poser une garde

| Couche | Où | Ce qu'elle couvre | Limite |
|---|---|---|---|
| **1. La navigation** | `rlPermis(route)` (menu, barre, feuille « Menu », recherche Ctrl+K, raccourcis, `sessionVue`, `rendre()`, `aller()`, `nvVoit`, `rlRefus`) | ce qu'on ouvre | déjà là : il faut l'alimenter par `droitVoit(route)` pour TOUTES les personnes, pas seulement gestion et tech |
| **2. Le geste (capture)** | un écouteur `window.addEventListener(type, fn, true)` pour `click`, `change`, `input`, `keydown`, `pointerdown`, `mousedown`, `touchstart`, `contextmenu`, `dragstart` : table `GESTES` `{ 'famille|verbe' → [catégorie, c/m/s] }` + `data-action` ; refus par `stopImmediatePropagation()` (passe avant les 138 écouteurs de `document`) | tous les boutons, champs, raccourcis, clics droits | **ne voit pas** les appels directs (retours « Annuler » des toasts, guide parlé `immClic`, messages de l'atelier, rappels du module Courrier) |
| **3. L'écran lui-même** | un `rendre()` de plus (le fichier en compte déjà une quinzaine) qui, pour chaque `[data-…]` refusé, retire le bouton (création, suppression) ou le désactive avec une raison, et pose en tête de rubrique « Tu peux regarder cet écran, pas le modifier. » | ce que la personne VOIT | masque l'écran, ne protège pas : c'est la couche 2 qui protège |
| **4. Les portes de fonction** | `poser()`, `stkAppliquer()`, `envoyerFacture()`, `payer()`, `produitCreer`/`prCreer` (à confirmer après la voie `materiel`), `ACTIONS.*` enveloppées | appels sans clic | `if (!droit('inter','m')) return refus()` en première instruction (règle du dépôt : première instruction, jamais « avant la première écriture ») |
| **5. Les ponts** | `opd_client`, `opd_ouvrir` (atelier : créer un client, un devis), `mbx*` du module Courrier (créer une intervention, un devis, un client depuis un message), palette `E.push` « Faire » | créations qui naissent ailleurs | à lister précisément à l'étape 3 ; le pont atelier filtre déjà par `rlPermis('devis'|'contrats')` |

Recommandation : **couches 1 + 2 + 3 en un seul lot (le gros du travail et toute la preuve), couche 4 limitée aux cinq portes
ci-dessus, couche 5 liste fermée.** Aucune garde dans `ouvrirPanneau` ni `foOuvrir` : elles ouvrent aussi bien des lectures.

### 2.8 Droit à part par droit à part : brancher ou retirer

| Droit | Coût de le brancher | Verdict d'étude |
|---|---|---|
| `comptes` (Créer des comptes, dans la limite des places) | 1 porte (`eq inviter`, `inviterok`, `placeok`) | **brancher** : trivial, et c'est le droit qui protège le plus |
| `corrpt` (Corriger les pointages) | `[data-ptc]` (change), `ptx corrige`, `pt ajout|clore` : une quinzaine de verbes déjà recensés dans `temps` | **brancher** (le geste existe déjà, il est nommé) |
| `commander` (Envoyer des commandes aux fournisseurs) | 6 portes (`panneauEnvoi` des bons de commande, `ce envoi`, `cm conf`, `ac commande`) | **brancher**, en DERNIER (module refait par `materiel`) |
| `valstock` (Valider les gestes de stock des autres) + `atelier` (Se servir sans validation) | le circuit existe (`STK_VALID`, onglet « À valider ») : `valstock` = le droit de valider, `atelier` = sortie directe sans validation | **brancher** ensemble, en DERNIER (même module) |
| `prix` (Voir les prix d'achat et les marges) | ~25 endroits affichent un prix d'achat ou une marge (Produits liste et fiche, formulaire « Achat HT », Stock « valeur », Fournisseurs, rapprochement des commandes, Comptabilité › Par intervention, `pdx` courbe) ; 153 lectures de `.pa` | **recommandation : brancher en posant une classe `.pa-prive` sur les ~25 endroits et un nettoyage commun**, mais SEULEMENT après la fin des voies `materiel` et `compta` ; si ce délai est refusé, **retirer** la case de l'écran plutôt que de promettre ce que les écrans trahissent |
| `tout` (Voir les interventions de toute l'équipe) | `INTS` est lu 320 fois ; filtrer à la lecture est impossible | **brancher comme FORME d'écran** (§ 2.3) : sans `tout`, Planning et Interventions d'équipe ne sont pas proposés, la personne reçoit « Ma journée » ; avec `tout`, liste complète. Aucun filtre dans les 320 lectures |

Les cinq premières lignes sont des gardes de geste (couche 2) ; seules `prix` et `tout` demandent un travail propre.
**À retirer si le temps manque, dans cet ordre : `prix`, `valstock`/`atelier`, `commander`.** Une case affichée qui ne fait rien
est un bug qu'un client signalerait (mandat) : aucune des quatre ne reste à l'écran « en attendant ».

### 2.9 Ce que devient la fiche d'une personne (sans la redessiner)

* La phrase grise « Créer, Modifier, Supprimer et les droits à part ne sont pas encore appliqués » disparaît le jour où c'est vrai
  (et le prototype nu garde déjà « ces cases ne changent pas encore » : à retirer aussi, `enApp()` ne doit plus décider).
* Le texte « Décocher “Voir” retire la rubrique… » devient : « Décocher “Voir” cache la rubrique. Décocher “Créer”, “Modifier” ou
  “Supprimer” retire le bouton correspondant. »
* Un profil neuf (Responsable, Secrétariat, Technicien) doit donner, avec les nouvelles règles, les menus que Justin a vus et
  validés pour le gérant et pour la secrétaire (sinon les profils sont à ajuster : § 2.3). **À vérifier case par case à l'étape 2**,
  car `PROFILS.tech` promet aujourd'hui Boîte mail et Stock en « Voir » à un technicien qui n'a ni l'un ni l'autre au menu.
* « Qui peut quoi » et la matrice restent : elles lisent `droits.cats` / `droits.sp`, déjà justes.

### 2.10 Chiffrage du chantier « droits »

| Lot | Contenu | Estimation | Dépend de |
|---|---|---|---|
| D1 | `acteur()` dans les 92 `journalAjout('marc',…)` + `MOI`, `T_MOI`, 12 autres acteurs ; sonde « qui a fait quoi » | ½ journée | rien |
| D2 | `droitVoit(route)` + table route → catégorie (42 routes, § annexe B) ; `rlPermis`, `rlLignes`, `mbRetenue`, `sessionRole` (la forme d'écran ne dépend plus du nom) ; menus et barres déduits ; `sessionVue` ; recherche et palette | 1 journée | décision A/B (§ 2.3) |
| D3 | garde de geste (couche 2) : table `GESTES` (≈ 270 lignes générées puis relues), `ACTIONS` (49 + 10), pointeur / souris / tactile / clic droit / raccourcis | 1 journée | D2 |
| D4 | nettoyage après `rendre()` + bandeau « lecture seule » + états vides (couche 3) | ½ journée | D3 |
| D5 | les 5 portes de fonction + les ponts (atelier, Courrier, palette) (couches 4 et 5) | ½ journée | D3 |
| D6 | droits à part : `comptes`, `corrpt` (D3) · `commander`, `valstock`, `atelier`, `prix` (DERNIERS, après fusion des voies `materiel`, `vehtemps`, `mail`) | ½ journée + ½ journée en dernier | voies en cours |
| D7 | sondes : **une par promesse** (47 cases × « coché / décoché » sur le menu, la barre, la recherche, l'adresse tapée, le geste), mutations (≥ 25), réécriture des sondes `menu-*` qui figent « Julie = 7 lignes » | 1 journée | D2–D6 |
| **Total** | | **≈ 4 à 5 journées-agent** ; les lots D1, D2, D3, D4 sont en séquence ; D5 et la moitié de D6 en parallèle de D4 | |

Sondes qui TOMBERONT et seront à réécrire (elles encodent le moule `gestion` à 7 lignes) : `menu-commun.js`, `menu-nu.js`,
`menu-ordinateur.js`, `menu-telephone.js`, `menu-memoire.js`, `menu-mutations.js`, `menu-renommages.js`, `menu-echafaudage.js`,
`menu-visites.js`, `atelier-roles.js`. À réviser pour qu'elles lisent le menu DÉDUIT, pas une liste figée.

Risques : (1) tout le prototype est un fichier unique que six voies modifient en parallèle : poser les gardes de rubrique des
modules refaits EN DERNIER ; (2) une garde en capture qui avale un clic légitime (le piège de `ev.stopPropagation()` vu pour
l'atelier : la fonction doit recevoir `ev` AVANT les autres écouteurs, et laisser passer `data-ferme`, `data-retour`, les
champs de recherche, les boutons de navigation) ; (3) un menu déduit qui change les lignes d'une personne : la visite parlée
(`immChap`), le guide des nouveautés (`NV_NEUF`, `NV_PLACE`) et la barre personnalisée doivent suivre.

---

## 3. « Achats et frais », mot pour mot

### 3.1 Ce que l'écran dit aujourd'hui

* Menu : « Achats et frais », rien dessous ; barre du bas du bureau : « Achats ».
* En-tête : surtitre « Argent » · titre « Achats et frais » · sous-titre : « Ce que l’équipe demande et les notes de frais à
  valider. Les factures des fournisseurs, leur paiement et les justificatifs sont dans la Comptabilité. »
* Bouton « ＋ Demande » (masqué pour la gestion, qui est en lecture).
* Quatre chiffres : « 3 demandes à décider · 2 à acheter » · « 896 € à payer · dans la Comptabilité › » · « 4 achats sans
  facture · dans la Comptabilité › » · « 3 notes de frais à valider ».
* Deux onglets : « Demandes » et « Notes de frais ».
* Vide : « Aucune demande en attente. Les techniciens demandent depuis leur téléphone : “Il me faut…”. » · « Aucune note de frais à valider. »
* Dans la visite parlée : « Les achats, c’est tout ce que ton équipe te demande de payer : du matériel, des pièces, et les notes de frais. »
* Dans le guide des nouveautés : « Mes demandes et Brouillon → Achats et frais › “Demandes” ».

### 3.2 Pourquoi Justin ne sait pas ce que c'est

Le nom emploie deux mots (« achats », « frais ») qui désignent, dans l'écran, **deux choses que la personne fait venir à elle**, pas
ce que le gérant achète lui-même ; le sous-titre dit « ce que l'équipe demande » sans dire QUOI (du matériel) ; les deux chiffres
du milieu mènent AILLEURS (Comptabilité) alors que le titre promet que tout est là ; et rien n'explique la suite (« ce que je
dois faire »). La rubrique est en réalité **la boîte de réception du gérant pour ce que son équipe lui demande de payer** : deux
files, des demandes de matériel (« Il me faut… ») qu'il accepte ou refuse, et des notes de frais (un ticket) qu'il valide pour
qu'elles soient remboursées avec la paie.

### 3.3 Le texte proposé (le nom reste « Achats et frais »)

**Menu** (ligne grise sous le nom, comme Comptabilité) : `Matériel demandé et frais avancés par l’équipe`
(si trop long sur 258 px : `Demandes de l’équipe et notes de frais`). La barre du bas du bureau garde « Achats ».

**En-tête de l'écran**
* surtitre : `Argent`
* titre : `Achats et frais`
* sous-titre (gérant) : `Ce que ton équipe te demande de payer : du matériel à acheter, et les frais qu’elle a avancés. Tu décides ici ; les factures des fournisseurs sont dans la Comptabilité.`
* sous-titre (lecture seule, personne qui a la case « Voir » sans « Modifier ») : `Ce que l’équipe demande et les frais qu’elle a avancés. Tu peux le regarder ; c’est le gérant qui décide.`

**Quatre chiffres**
1. `3` · `demandes de matériel à décider` (suite : `2 à acheter`)
2. `3` · `notes de frais à valider`
3. `896 €` · `de factures fournisseurs à payer · voir dans la Comptabilité ›`
4. `4` · `achats sans facture · voir dans la Comptabilité ›`
   (l'ordre met d'abord ce que le gérant DÉCIDE ICI, ensuite ce qui est ailleurs)

**Onglets** : `Demandes de matériel` · `Notes de frais` (court sur téléphone : `Matériel` · `Frais`)

**Phrase d'aide sous les onglets, une fois, repliable** (« Comment ça marche ? », ouvre le panneau habituel) :
`1. Un technicien écrit « Il me faut… » ou envoie la photo d’un ticket depuis son téléphone. 2. Ça arrive ici. 3. Toi, tu acceptes ou tu refuses (une phrase toute prête t’évite de taper). Le matériel accepté part en commande ou se prend dans le stock ; la note de frais validée est remboursée avec la paie.`

**États vides**
* Demandes : `Aucune demande de matériel en attente. Quand un technicien écrit « Il me faut… » depuis son téléphone, elle arrive ici.`
* Notes de frais : `Aucune note de frais à valider. Quand un technicien envoie la photo d’un ticket, elle arrive ici.`

**Côté technicien** (même mot, jamais « Achats ») : « Mes frais » et la carte « Il me faut… » restent ; leur sous-texte : `Tu as acheté quelque chose pour le travail ? Envoie la photo du ticket. Il te manque du matériel ? Écris-le : le bureau te répond.`

**À mettre à jour en cascade** : `tourPartie('achats'…)`, `immChap('achats'…)` (phrases : « tout ce que ton équipe te demande de payer »
reste juste), guide `NV_NEUF` / `NV_PLACE`, aide de page, recherche (`E.push` « Achats et frais »).

### 3.4 À contrôler au navigateur à l'étape 7 (relecture)

La ligne grise du menu tient sur 258 px (ordinateur) et dans la feuille « Menu » à 320, 360, 390 px sans passer sur trois lignes ;
le chiffre « 896 € » ne coupe pas ; les onglets tiennent sur 320 px ; lecture seule : aucun bouton de décision visible.

---

## 4. Ce qui est incertain, à dire à Justin (« s'il y a des doutes, tu me dis »)

1. **« Une facture est bloquée sans SIRET » n'a jamais été vrai dans le prototype** : le mandat le donnait pour acquis. « Mon
   entreprise » crée la garde (SIRET, adresse, nom) ; les raisons « plafond » et « premier passage » du texte d'aide n'existent
   pas non plus.
2. **Le technicien reçoit Boîte mail et Stock en « Voir » dans son profil**, alors que son menu validé n'a ni l'un ni l'autre.
   Appliquer la case telle quelle changerait ce que Justin a validé ; il faut un choix (forme d'écran, § 2.3) avant de coder.
3. **Les droits à part `prix` et, dans une moindre mesure, `tout`, demandent un travail disproportionné** : la recommandation
   est de les brancher en dernier ou de les retirer de l'écran, jamais de les laisser affichés sans effet.
4. **Le journal dit « Marc » pour tout** : sans correctif (92 appels), les droits seraient visibles à l'écran mais le journal
   mélangerait les personnes.
5. **Mon entreprise vit dans Personnel** : le mot « Personnel » désigne des gens ; c'est le meilleur endroit sous les règles de
   menu, pas un endroit parfait. Si Justin préfère un autre mot de groupe (« Équipe et entreprise »), c'est un renommage de
   deux textes, pas de code.

---

## Annexe A. Verbes d'écriture reliés par `data-*`, par famille

Notation : `famille` · C créer · M modifier · S supprimer (heuristique sur le nom du verbe ; indicatif, à confirmer par la
sonde de recensement de l'étape 3). Les familles sans verbe d'écriture (≈ 120, lecture, filtres, navigation) sont omises.

```
achats  ac    M: transfert,commande,magasin,refuser,payer,virement,ndfok,refok,virok
achats  axa   M: demok,budgetok,precok,tickok,relach,toutval,nonok,toutok,relancer,renvoyer,precrepok,kmok | S: demannul
achats  rl    M: ndfmodok,ndfok | S: ndfsuppr
admin   eq    C: inviter,renouv,habajout,inviterok,habok | M: relancer
admin   eqx   C: renouvok,regajout | M: modifok,modifx,modifier,placeok,garder,fgarder,profok,cgarder | S: annulinv,desact,desactok,regsuppr
com     mbx   C: addstop,addpas,addfin,add | M: confok,reco | S: decook,rmregle,deco
com     ml    C: ajout | M: reco,confok
compta  cp    M: payer
compta  cx    C: nouveau | M: payer,payerliste,factureok,depenseok,ficheok,sirenok,plateformeok
compta  cxaf  M: relancer,facturer,payer,valider
compta  paie  M: corriger,relancer,import,envoiok,distribuer,verrouok,signalok,confirme,validerfiches,salok,comptabiliser,validertout,verrouiller | S: primesuppr
inter   cbx   M: reco,import
inter   rg    C: plus | M: reco,toutok,zoneok,signer,ok,pdfenvok,fok,prevok
planif  planconf  S: annuler,supprimer
planif  tkxs  C: add | M: selok
stock   bx    C: nouveau,creer
stock   bxl   C: aj | M: rok,inv,invok,modok,nouok,prendre | S: fermerok
stock   ce    C: nouvelle,add | M: modif,cpok,recommander | S: suppr,jeter
stock   cm    C: plus | M: confok,relok,recok | S: annuler
stock   fo    C: ajouter,creer | M: commandes,localok,appliquer,facok | S: retirer
stock   mat   C: ajoute,plus,ajouter | M: oublie,manque,pris,prise,toutpris,envoyer,modifier,mchange | S: retire
stock   pdx   M: decaler,garder,fournenreg,contok
stock   pr    C: nouveau | M: modif,garder | S: retirer,retirerok
stock   sk    M: transfert,inv,invok,fok,reassok
stock   sx    M: toutval,refok,expok,eok,dotok | S: annuler
temps   champ M: debut,fin
temps   pt    C: ajout | M: closok | S: clore
temps   ptx   M: debut,reprendre,termineok,sigok,plustotok,finhierok,corrige,validertous
temps   tt    C: ajout,ajoutok | M: validerun,valider,validerok,validertout,confirmer,termineok,rappelsok
temps   ve    C: nouveau,creer | M: pleinok,kmok
temps   vx    C: creerok | M: modif,commander,faitok,groupeok,pleinok,kmok,garageok,retourok,condok,modifok,frmodok,soucisok,amendeok,sinistreok | S: frdel,docdel
ventes  dv    C: nouveau,creerInt,ligneAj | M: envoyer,relancer,signer,clientRefus | S: supprimer
ventes  dvn   C: nv,creer
ventes  dxb   C: creer,nvtype,zadd | M: garder,attok,reprendre | S: annulerMaj
ventes  dxrb  C: nouveau | M: envoyer
ventes  xy/xyb C: nouveau,creer
ACTIONS (data-action) C: creerOk,nouvelleFacture,ligneAjout,clientNouveau,creerContrat,ajoutEnc,ajoutEncOk,cCreer
        M: envoyer,blocOk,modifierOk,dateOk,noteOk,modifInt,reprise,terminer,envoiMailOk,toutValider,clientEnreg,signerContrat,
           partielOk,relanceOk,avoirOk,modifIntOk,cAjoutTypeOk,vueEnregistrer(Ok : appareil, pas un droit)
        S: noteSuppr,photoSuppr,pieceSuppr,sigEfface,sigCtrEfface
```

Faux positifs connus du script : `ff|avalider` (un filtre), `rr|delai` (réglage), `bc|delai`, `b|debut`. Les écrans sans attribut (planning, absences,
tâches, champs saisis au clavier : `data-ptc`, `data-axest`, `data-cxsiren`, `data-tkx…`) sont à recenser à la main à l'étape 3.

## Annexe B. Route → catégorie de droit (proposition de table pour `droitVoit`)

| Route (clé de `CATS` ou sous-route) | Catégorie, case |
|---|---|
| `accueil`, `statistiques` | `compta.v` (ils montrent l'argent) ; sans cela, la première rubrique permise |
| `historique` | `admin.v` |
| `planning`, `taches`, `absences` | `planif.v` (validation d'une absence : `planif.m`) |
| `interventions`, `inter`, `clientvoit` | `inter.v` (écran d'équipe si la forme le permet, sinon `majournee`) |
| `clients`, `client` | `crm.v` |
| `devis`, `contrats`, `contrat`, `contrat-nouveau`, `signer`, `devisXylo` | `ventes.v` |
| `facture`, `factures`, `encaissements` | `ventes.v` ET `compta.v` (déjà ainsi dans `drRefuse`) |
| `comptabilite` | `compta.v` |
| `boiteMail` | `com.v` |
| `achats`, `techfrais` | `achats.v` |
| `stock`, `produits`, `boxes`, `carteBox`, `moncamion` | `stock.v` |
| `pointage`, `vehicules`, `mesheures` | `temps.v` |
| `equipe`, `entreprise` (neuf) | `admin.v` (`admin.m` pour modifier) |
| `registre` | `inter.v` (+ pack 3D) |
| `majournee` | `inter.v` + forme « terrain » |
| `espaceclient` | rôle client, hors droits |
