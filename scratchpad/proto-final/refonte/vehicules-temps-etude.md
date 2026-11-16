# Dossier d'étude — « Véhicules » et « Temps de travail » (groupe Personnel)

Étude du 16 novembre 2026, avant refonte. Prototype : `apercu/prototype-op-gestion.html` (22 199 lignes, entreprise fictive « Clim Services 17 », date de la démonstration : samedi 31 octobre 2026, 10 h 40).
Rien n'a été modifié dans le dépôt : ce document est le seul fichier ajouté.

Ce que Justin a dit : « Véhicule à refaire » ; « Temps de travail : c'est pas mal, mais mieux amélioré, plus simple, ce serait cool ». Références qu'il aime : Accueil, Planning, Absences et congés, Interventions, Clients, Devis, Comptabilité, Équipe.

Captures citées : `/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/vehicules-temps/` (hors dépôt, peuvent disparaître au redémarrage de la machine ; les sondes qui les refont sont dans le même dossier : `s1.js` à `s19.js`, elles s'appuient sur `scratchpad/proto-final/lib.js`). Dans ce document, « cap/ » veut dire ce dossier.

---

## 0. Le résumé en dix lignes

1. **Aucune des deux rubriques n'est cassée** : 0 erreur JavaScript, 0 débordement latéral sur sept profils (320, 360, 390, 820, 1280/1366/1440 px), les gestes que j'ai joués marchent (plein, nouveau véhicule, contrôle technique fait, correction d'une heure, clôture d'une journée ouverte, confirmation du relevé). Le « moche et mal fait » de Justin n'est donc pas un bug : c'est de la **structure et de l'empilement**.
2. **Les deux écrans ont été bâtis par couches** (un module d'origine, puis un « lot du 10 novembre », puis un lot « temps de travail », puis un lot paie, puis des rustines du 13 novembre) et l'écran final est du HTML retouché par `replace()`/`indexOf()` sur le HTML des couches précédentes. Cela se voit à l'écran : des blocs qui se répètent, des boutons qui font presque la même chose à deux endroits, des phrases écrites pour des moments différents.
3. **Temps de travail** : sur le Mac, la page fait 2 022 px, 69 boutons, onze blocs ; sur iPhone 4 229 px. Devis : 14 boutons, 900 px. L'information « Tom n'a pas fermé sa journée » apparaît **cinq fois** sur la même page. Il n'y a ni chiffres du haut ni onglets, alors que tous les écrans validés par Justin ont les deux.
4. **Véhicules** : l'écran liste est correct mais lourd (bande « À faire maintenant » + 5 chiffres + filtre + 4 cartes à moitié vides + classement) ; **la fiche est un tiroir de 3 253 px (3,6 écrans) avec 12 sections et 45 boutons**. C'est elle qui est « mal faite » : tout y est, rien n'est hiérarchisé.
5. **Le technicien a son véhicule en deux endroits** : la carte « Mon véhicule » (kilométrage, plein, souci) est dans « Ma journée » à 1 600 px du haut, et l'onglet « Camion » de la barre du bas ne parle que du **stock** du camion. Une personne qui cherche « mon plein » ne sait pas où aller.
6. **Ni le gérant ni la secrétaire n'en entendent parler à l'Accueil** : ni le contrôle technique du Peugeot dans 12 jours, ni la révision du Kangoo en retard, ni la journée de Tom restée ouverte, ni les 13 h 05 de Karim, ni la demande de correction de Tom. Ils n'apparaissent qu'à qui ouvre la rubrique.
7. **La secrétaire (rôle « gestion ») n'a accès ni à Véhicules ni à Temps de travail** (menu final : le groupe Personnel n'est pas dans son menu ; mesuré : `aller('vehicules')` la renvoie sur Comptabilité). C'est elle qui prend les rendez-vous garage et prépare la paie dans la vraie vie : décision à prendre avec Justin.
8. **Ce qui doit survivre à la refonte** : la correction d'une heure avec motif obligatoire et trace, la confirmation du relevé par le salarié, le mois verrouillé, le calcul des heures supplémentaires à 25 % / 50 %, les repères légaux (10 h / 48 h / 11 h), la clôture « à l'heure dite » (jamais à l'heure qu'il est), côté véhicules l'échéance qui se ferme en proposant la suivante, la tâche qui se crée et se ferme toute seule, le coût au kilomètre, l'amende à désigner avant une date, l'immobilisation au garage qui prévient le Planning. Voir l'inventaire (§ 2).
9. **Une contradiction à trancher avant d'écrire une ligne de paie** : le commentaire d'ouverture du module pointage dit « OP GESTION ne CALCULE PAS les fiches de paie » ; l'écran Paie de la Comptabilité propose « OP GESTION les calcule » (cotisations, impôt prélevé) — risque juridique et de confiance (§ 5).
10. **Pistes de refonte en une phrase chacune** (§ 7) : Temps de travail = « La journée / La semaine / Le mois » avec une seule bande « à faire » ; Véhicules = une liste de véhicules *vivante* (une ligne = un véhicule et son seul prochain geste) et une fiche courte en quatre blocs ; le technicien a **un** « Mon camion » qui réunit véhicule et stock.

---

## 1. La carte : chaque écran, onglet, fenêtre, feuille

Convention : ligne = ligne du prototype `apercu/prototype-op-gestion.html` ; « base » = module d'origine, « vx » = lot véhicules du 10 novembre (`vx*`), « ptx » = lot temps de travail (`ptx*`), « paie » = lot paie. La fonction qui s'exécute est la **dernière** de la chaîne (chaque couche enveloppe la précédente).

### 1.1 Qui voit quoi (mesuré, `s19.js`)

| rôle | Véhicules | Temps de travail | Mes heures | Mon camion / Ma journée | Paie |
|---|---|---|---|---|---|
| Gérant (Marc) | oui | oui (et « Début de ma journée » pour lui-même) | non | non | Comptabilité › Paie |
| Bureau (Julie, rôle `gestion`) | **non** (renvoyée sur Comptabilité) | **non** | non | non | Comptabilité (selon ses droits) |
| Technicien (Sophie, Karim chef d'équipe, Léa, Tom) | non (mais **sa carte « Mon véhicule »** dans Ma journée) | non (**sa carte « Ma journée de travail »** dans Ma journée) | oui | oui (stock seulement) | ses fiches dans Mes heures |
| Client | non | non | non | non | non |

Karim est « chef d'équipe » mais son menu est celui d'un technicien : il ne voit pas les heures de son équipe.

### 1.2 Véhicules (route `vehicules`, menu Personnel › Véhicules, icône camion, groupe Personnel)

**Écran liste** — `vueVehicules` base l. 9285, enveloppé par `vxPost` (l. 16347) qui retouche le HTML par expressions régulières :
- en-tête : « Personnel / Véhicules / La flotte : les échéances avant qu'elles tombent, ce qu'il y a à bord, qui conduit et ce que chaque véhicule coûte. » ; boutons « Saisir un plein » (`data-ve="plein|"`) et « ＋ Véhicule » (`data-ve="nouveau"`) ;
- **bande « À faire maintenant · 3 »** (`vxBandeHtml` l. 16326) : une ligne par échéance non verte (retard, ≤ 7 j rouge, ≤ 60 j orange pour CT et assurance, ≤ 30 j ou 1 500 km pour entretien et matériel), plus une ligne « Assurance MAAF Pro · 4 véhicules » qui regroupe l'assurance de toute la flotte (`vxGroupes` l. 15700), plus une ligne « Souci » si un technicien en a signalé un. Chaque ligne a deux boutons : « Prendre rendez-vous au garage » / « Renouveler l'assurance » (crée une tâche) et « Contrôle fait » / « Révision faite » / « Assurance renouvelée » (ouvre le panneau « fait ») ;
- **cinq chiffres** : « 3 / 4 en service », « 3 échéances à prévoir » (touche = filtre), « 1 566 € frais en octobre (HT) », « 515 € de stock à bord », « 0,23 €/km coût moyen (12 mois) » ;
- **filtre segmenté** : Tous / À prévoir / Immobilisés (`vehFiltre`) ;
- **cartes véhicule** (grille, une par véhicule) : marque + modèle, plaque en pastille, statut, conducteur · km · énergie, prochaine échéance en bandeau coloré, « N articles à bord · M manquent », « N interventions aujourd'hui », garage, souci, « 1 intervention de Tom concernée » ;
- **classement « Les plus chers au kilomètre »** (`vxClassement` l. ~15770, caché si le filtre n'est pas « Tous »).

**Fiche véhicule** — tiroir « large » (`vehFiche` vx, l. 15808 ; ouverte par une carte, une ligne de la bande, une ligne du classement, un lien de Tâches `vehicules|veh1`, un lien de l'Historique « Ouvrir le véhicule », « Ses camions » de la fiche Équipe) — dans l'ordre d'écran :
1. surtitre plaque · année · énergie, titre marque/modèle, pastilles (statut, garage, « souci signalé »), « ✎ Modifier la fiche » ;
2. bloc « souci signalé par … » + « Souci réglé » (si souci) ; bloc garage « 🔧 Entretien · Renault Pro · rendu prévu … » + « Voir au Planning › » (si au garage) ;
3. Conducteur (lien vers la fiche Équipe) + « Changer de conducteur » + anciens conducteurs datés ;
4. Kilométrage + « Relever le compteur » + dernier relevé ;
5. **Échéances** : assurance, révision, contrôle du matériel, contrôle technique — chacune avec son bouton « fait » ;
6. « Prendre rendez-vous au garage » (ou « Rendez-vous demandé · voir la tâche ») et « Mettre au garage » / « Remettre en service » ;
7. « À bord · N articles · 225 € » + « N sous la dotation : … » + « Voir le stock du camion › » ;
8. « Aujourd'hui et demain avec Sophie » (interventions du conducteur, chacune ouvre la fiche intervention) ;
9. **Matériel de sécurité** : « Tout est présent », « Contrôle fait aujourd'hui », huit cases (extincteur, gilet, triangle, trousse, roue de secours, constat amiable, lampe, câbles), « Manque : … · Les commander » (crée une demande d'achat) ;
10. **Documents** : carte grise, attestation d'assurance, PV de contrôle technique (ajouter une photo ou un PDF, vignette, retirer) ;
11. **« Ce que ça coûte »** : période (Ce mois / 12 mois / Depuis l'achat), 4 tuiles (Total HT, Par mois, Au kilomètre, L aux 100 km), histogramme de 6 mois (carburant, entretien, assurance), phrase explicative, « Exporter les frais (CSV) » ;
12. **« Les frais · N lignes »** : chaque ligne avec « Modifier » / « Supprimer » (ou « Voir dans les achats › », « Voir la note › »), « Saisir un plein ou une facture » ;
13. « Historique du véhicule » (contrôles faits, passages au garage, changements de conducteur, 4 derniers relevés) ;
14. « Amendes et sinistres » + « Amende reçue » + « Sinistre ».

**Panneaux et feuilles** (tous depuis l'écran liste ou la fiche ; la plupart ont « ‹ Retour » vers la fiche) :
| geste | fonction (ligne) | contenu |
|---|---|---|
| ＋ Véhicule | `vxNouveauPanel` 16278 / `vxCreerOk` 16295 | plaque, année, marque (liste), modèle, énergie, km, conducteur, assurance (compagnie, n°, fin), CT, dernière révision (date + km), intervalle de révision (km, mois). 13 champs. |
| Plein ou facture | `vxPleinPanel` 15960 / `vxPleinOk` | véhicule, nature (Carburant / Recharge / Garage-entretien / Péage-parking), montant TTC, litres, prix au litre (calculé), date, km, payé avec (carte entreprise / poche), photo du ticket |
| Contrôle technique / révision / assurance « fait » | `vxFaitPanel` 15875 / `vxFaitOk` | date, km, montant TTC, prochaine échéance **proposée** (+2 ans, +intervalle…) ; crée l'achat, ferme la tâche liée |
| Assurance de la flotte renouvelée | `vxFaitGroupe` | une date et une prime pour les 4 véhicules |
| Relever le compteur | `vxKmPanel` 16011 | contrôle : un compteur ne recule pas, un saut de plus de 3 000 km se confirme |
| Mettre au garage | `vxGaragePanel` 16029 | motif, garage, rendu prévu, véhicule de remplacement, liste des interventions concernées (le Planning le sait) |
| Remettre en service | `vxRetourPanel` 16057 | date de retour, km, montant de la facture (part aux achats, compte 6155) |
| Changer de conducteur | `vxCondPanel` 16107 | nouveau conducteur, à partir du… ; l'ancien est gardé, le stock du camion suit |
| Modifier la fiche | `vxModifPanel` 16120 | marque, modèle, énergie, année, conducteur, assurance, CT, intervalle de révision |
| Frais : Modifier | `vxFraisPanel` 16165 | libellé, date, montant HT |
| Amende reçue | `vxAmendePanel` 16236 | jour, montant, qui conduisait (proposé d'après l'historique), date limite de désignation (+45 j proposée), crée une tâche |
| Sinistre | `vxSinistrePanel` 16253 | jour, conducteur, lieu, tiers, franchise, crée une tâche « Déclarer le sinistre » |
| Signaler un souci (technicien) | `vxSouciPanel` 16209 | type (voyant, pneu, choc, autre), texte, photo ; crée une tâche urgente pour le gérant + une notification |
| Les commander | `vxCommander` 15950 | une demande d'achat « Matériel de sécurité … » (estimation par article) |
| Prendre rendez-vous | `vxRdv` | **ne prend aucun rendez-vous** : crée une tâche pour Marc dans 3 jours, clé identique à la suggestion de Tâches |

**Côté technicien** : carte « Mon véhicule · Renault Trafic L2H1 » (`vxMonCamion` l. 16198, injectée dans `vueMaJournee`, au-dessus de « L'argent que tu as sur toi ») : plaque, statut, compteur, prochaine échéance (ou « Tu prends : véhicule de remplacement » si au garage), « À bord : 3 manquent », boutons « ⛽ Un plein », « Relever le compteur », « ⚠️ Signaler un souci ». Les rappels aux conducteurs à 30 et 7 jours (`vxNotifs` l. 16376) arrivent dans la cloche et « Messages du bureau ».

### 1.3 Mon camion (technicien, route `moncamion`, barre du bas « Camion », `vueMonCamion` l. 14321)
Vue du **stock** seulement : trois gros boutons (J'ai pris à l'atelier / J'ai utilisé / Il me manque), alerte « Bouteille presque vide », « Il manque à bord · 3 » avec « Je l'ai pris » / « Il me manque », « À bord · N articles » avec dotation, « Mes envois » (validés ou refusés par le bureau). Pas un mot du kilométrage, du plein, du contrôle technique. Rattaché à « Dépôts et camions » (autre refonte) par `sxMonLieu`, `lieuManques`, `lieuArticles`.

### 1.4 Temps de travail (route `pointage`, menu Personnel › Temps de travail ; gérant seul)

Fonction : `vuePointage` base l. 9410, enveloppée (dans l'ordre) par : verrou du mois l. 11993 → retrait de l'onglet Paie l. 12156 → lot `ptx` l. 15567 (insère « Aujourd'hui », « Demandes des salariés », le bouton « Valider N semaines en règle », les cartes par personne, la case des rappels, retire « En ce moment »). Résultat à l'écran, de haut en bas :
1. en-tête « Temps de travail / Les heures de chacun, à côté de ce que le planning prévoyait. Les repères du Code du travail sont vérifiés tout seuls. » + bouton « Début de ma journée » (ou « Fin de ma journée · depuis 08:05 ») — le pointage du **gérant lui-même**, sans pause ;
2. bandeau rouge « Tom Leroy n'a pas fermé sa journée du vendredi 30 octobre (début 07:55). Clôturer à l'heure dite » ;
3. bandeau bleu « La paie du mois … est dans Comptabilité › Paie. » ;
4. **carte « Aujourd'hui · samedi 31 octobre »** (`ptxAuj` 15406) : Au travail (qui, depuis quand) · Absent (qui, motif) · Attendus, pas pointés (+ « Rappeler encore » `ptxRappeler` 15421) · À fermer (+ « Lui demander son heure » `ptxDemander` 15424) ;
5. **carte « Demandes des salariés · 1 »** (`ptxSignales` 15431) : le message du salarié, « Corriger : fin à 17:40 » (`ptxCorriger` 15435, un geste, il reconfirmera), « Voir la journée » ;
6. navigation de semaine (‹ Semaine du 26 oct. au 1er nov. ›) + « Valider 4 semaines en règle » (`ptxValiderPanneau` 15397, lot de validation avec « Annuler » dans le toast) ;
7. **carte « À regarder cette semaine · 5 »** (`ptAlertes` 9399) : alertes légales (> 10 h par jour L3121-18, < 11 h de repos L3131-1, > 48 h par semaine L3121-20), journées planifiées sans pointage, journées restées ouvertes ; chaque ligne ouvre la journée ;
8. **le tableau de la semaine** (ordinateur) : une ligne par personne, sept cases (heures + « 07:37–16:42 » ou « prévu 3h30 » ou « Congé payé » ou « ouvert »), total de la semaine, « +5h50 sup. », bouton « Valider » ; **sur téléphone** il est remplacé par des **cartes par personne** (`ptxCartes` 15560 : 7 cases lettre + heures, pastille « Rien à signaler » / « 4 alertes » / « Journée ouverte », « Valider la semaine ») ;
9. note « Touche une case pour voir la journée, la comparer au planning ou la corriger. « Valider » fige la semaine pour la paie ; corriger une journée la remet à valider. » ;
10. **carte à case à cocher « Rappeler les salariés qui n'ont pas pointé »** (09:30 si intervention prévue et rien pointé, 19:00 si journée ouverte).

**Fiche d'une journée** (`ptFicheJour` base 9443, enveloppée l. 11947 par le lot paie) — tiroir : personne, date longue, deux chiffres « pointées » / « prévues au planning » (+ « non planifiées »), **« Pourquoi corriger ? (obligatoire : le salarié le verra sur son relevé) »**, début, fin (sélecteurs d'heure), pause (minutes), note, « Corrections de cette journée » (avant → après, par qui, quand, pourquoi), « Au planning » (interventions du jour, ouvrent la fiche intervention), phrase de règles, liens « Toutes les heures de Sophie ce mois-ci › » et « Son relevé de paie d'octobre › ». **Il n'y a pas de bouton « Enregistrer »** : chaque champ s'enregistre à la sortie (le motif doit être rempli avant, sinon toast « Dis d'abord pourquoi tu corriges »). Si le mois est verrouillé : champs grisés + phrase. Autres panneaux : « Clôturer la journée » (`data-pt="clore"`, fin proposée = fin habituelle d'après les 4 dernières semaines, pause habituelle), « Valider N semaines ? », panneau par personne (`pers`).

### 1.5 Le côté salarié : « Ma journée de travail » (dans Ma journée) et « Mes heures » (route `mesheures`, `vueMesHeures` l. 11927 + lot ptx l. 15578)
- carte **« Ma journée de travail »** (`ptxCarteSalarie` l. 15496, **identique dans Ma journée et dans Mes heures**) : « Tu n'as pas encore commencé. Il est 10:40 · ta première intervention est à 08:30 » + « Je commence ma journée » / « J'ai commencé plus tôt » (heure à venir refusée) ; en cours : « Commencée à 10:40 · 0h00 » + « Pause » / « Je reprends » / « Je termine » (panneau fin + pause proposée, `ptxPanneauFin` 15509, `ptxTerminer` 15516) ; journée de la veille restée ouverte : « Fin d'hier ? » (`ptxFinHier` 15523) ;
- **« Ton relevé d'octobre est prêt. »** : « ✓ Je confirme mes heures » / « Signaler une erreur » (jour au choix, début/fin/pause réels, une phrase → arrive au gérant dans « Demandes des salariés ») ;
- 4 chiffres (heures travaillées, heures supplémentaires, de nuit, absences), **« Semaine par semaine »**, **« Mes journées »** (7 dernières, « Ce n'est pas ça » sur chacune, « Voir tout le mois (21 jours) »), « Heures corrigées par le bureau » (début 07:31 → 07:30, par qui, pourquoi), **« Mes fiches de paie »** (septembre, août ; celle d'octobre « arrivera ici quand elle sera validée »).

### 1.6 Ce qui s'y rattache
- **Paie** — Comptabilité › Paie (`CP.onglet='paiemois'`, route `comptabilite`), 4 sous-onglets : Le mois (8 étapes : les heures sont justes → chacun a confirmé → le mois est verrouillé → les fiches sont calculées → vérifiées et validées → reçues → en comptabilité → déclaration sociale prête ; tableau Salarié / Heures / Sup. 25 % / Sup. 50 % / Nuit / Absences / Corrections / Relevé), Fiches de paie, Salariés, Charges et déclarations. Bascule « Qui fait les fiches de paie ? OP GESTION les calcule / Le cabinet les fait ». Fonctions : `paieVariables` l. 11708, `paieReleve` 11786, `paieEnvoyer` 11831, `paieRecevoir` 11840, `paieBulletin` 12024, `paieBulletinVoir` 11917. Retour par « ‹ Retour · Temps de travail ». Hors périmètre de la refonte (Comptabilité validée), mais **le lien Temps ↔ Paie est une couture à garder** (`paieAller` 12104, `data-paie="aller|paiemois"`).
- **Absences et congés** (validée) : alimente la case « Congé payé » du tableau (`absDe`), le mot « Absent » d'Aujourd'hui, les absences du relevé de paie, la désactivation des rappels. Le technicien y a « Mes congés ».
- **Équipe** (validée) : la fiche d'une personne montre « 40h50 pointées » et les liens « Ses heures › », « Renault Trafic L2H1 · GH-482-KL › », « Stock du camion › ».
- **Planning** : `prevuMin(k,d)` (temps prévu par les interventions) nourrit « prévu 3h30 » ; une pastille « 🔧 camion » apparaît sur les interventions d'un conducteur dont le camion est au garage (`vxGarageDe`), et sur la fiche intervention.
- **Tâches** : `LIENS_SOURCES` (`vxLiens` 15708) suggère les rendez-vous d'échéances et l'assurance de la flotte ; `vxRattacher` rattache une note de frais « Carburant » au camion du technicien ; fermer un rendez-vous dans Tâches propose de noter l'échéance (`vxFaitPanel`).
- **Achats / Comptabilité** : un plein ou une facture crée un achat (compte 6061 carburant, 6155 entretien, 616 assurance, 625 péages), ou une note de frais « à valider » si payé de la poche ; catégorie « Véhicules & carburant » dans la Comptabilité ; la Compta compte une pièce.
- **Historique** : type `vehicule` (« a noté un plein », « a signalé un souci… ») avec bouton « Ouvrir le véhicule ». Les corrections d'heure sont dans la trace de la journée, pas dans l'Historique général.
- **Visites et guide** (`immChap('vehicules'…)` l. 20806, `tourPartie('vehicules'…)` l. 12867, chapitre temps l. 20364) : des textes qui citent ces écrans ; à relire après refonte.

---

## 2. L'inventaire de ce que ces écrans savent faire

Légende fréquence : **J** utile tous les jours / **P** parfois (mensuel, hebdomadaire) / **R** rarement ou jamais. Mon avis s'appuie sur la vie d'une entreprise de 6 personnes, 4 véhicules.

### 2.1 Véhicules — ce que le gérant fait et sait

| capacité | où aujourd'hui | fréq. | pourquoi |
|---|---|---|---|
| Voir ce qui est en retard ou proche (CT, assurance, révision, matériel) | bande « À faire maintenant », cartes, fiche | **P** (une fois par semaine suffit si la rubrique le dit sans qu'on la cherche) | une échéance manquée = véhicule non assuré ou immobilisé ; mais rare à l'échelle d'une semaine |
| Savoir si un camion est en service ou au garage, et qui le conduit | cartes, chiffre « 3 / 4 » | **J** | « qui a quoi ce matin » |
| Marquer une échéance faite en proposant la suivante | « Contrôle fait » → panneau | **P** | quelques fois par an ; la **date suivante proposée** et la **tâche qui se ferme** sont des vraies aides |
| Créer la tâche « prendre rendez-vous » | « Prendre rendez-vous au garage » | **P** | ne prend pas de rendez-vous (voir § 5) |
| Renouveler l'assurance de toute la flotte en une fois | ligne groupée | **R** (1 fois/an) mais précieux ce jour-là : 4 véhicules = 1 geste |
| Saisir un plein / une facture (garage, péage) | « Saisir un plein », fiche | **J** (pour les techniciens) | c'est le geste le plus fréquent de toute la rubrique |
| Relever le compteur (avec contrôle de vraisemblance) | fiche, carte du technicien | **P** (quelques fois par mois) | alimente révision et coût au km |
| Signaler un souci (technicien → bureau, tâche urgente) | Ma journée › Mon véhicule | **P** | rare mais critique |
| Marquer « au garage » (motif, garage, retour, remplaçant) et prévenir le Planning | fiche | **P** | une fois par mois ou moins ; le lien Planning est **la** valeur ajoutée |
| Changer de conducteur (ancien gardé, stock suit) | fiche | **R** | rotation de personnel |
| Voir ce que coûte un véhicule (total, par mois, au km, litres/100 km, histogramme) | fiche › Ce que ça coûte ; classement | **R–P** | utile à la décision « on change le Berlingo ? » deux fois l'an |
| Classement « les plus chers au km » | bas de la liste | **R** | joli, rarement consulté ; redondant avec la fiche |
| Voir le stock à bord, ce qui manque, aller au stock du camion | cartes, fiche, Dépôts et camions | **J** côté technicien, **P** côté gérant | doublon avec Dépôts et camions |
| Matériel de sécurité (8 cases, contrôle, commande) | fiche | **R** (1 fois/semestre) | obligation réelle mais peu fréquente |
| Documents (carte grise, attestation, PV) en photo/PDF | fiche | **R** | utile au contrôle routier : « où est la carte grise ? » |
| Amende à désigner avant une date (+ tâche) | fiche | **R** | à haute valeur (ne pas rater le délai) mais 1–2 fois par an |
| Sinistre (tâche « Déclarer ») | fiche | **R** | idem |
| Modifier la fiche (marque, assurance, CT, intervalle) | fiche | **R** | |
| Créer un véhicule | ＋ Véhicule | **R** | achat de véhicule |
| Exporter les frais en CSV (expert-comptable) | fiche | **R** | redondant : la Compta a déjà les achats |
| Historique du véhicule (contrôles faits, garage, conducteurs, relevés) | fiche | **R** | utile au revendre / litige |
| Rappels au conducteur à 30 et 7 jours | cloche, Ma journée | **P** | automatisme bienvenu |
| Tâches suggérées automatiquement (rendez-vous, assurance flotte) | Tâches | **P** | |
| Note de frais « Carburant » rattachée au camion | `vxRattacher` | automatique | |
| Dotation : un nouveau camion reçoit la dotation « clim » quel que soit le métier | `vxCreerOk` (`dot:'clim'`) | — | à reprendre : prototype figé |

### 2.2 Temps de travail — gérant

| capacité | où | fréq. | pourquoi |
|---|---|---|---|
| Voir qui travaille / est absent / n'a pas pointé aujourd'hui | carte « Aujourd'hui » | **J** | le gérant le regarde le matin |
| Rappeler ceux qui n'ont pas pointé (+ rappel automatique 09:30 / 19:00, réglable) | « Rappeler encore », case | **J** | |
| Clôturer la journée restée ouverte (heure proposée = fin habituelle, jamais « maintenant ») / demander son heure au salarié | « Clôturer à l'heure dite », « Lui demander son heure » | **P** (1–2 fois par semaine) | |
| Traiter la demande de correction d'un salarié en un geste | « Corriger : fin à 17:40 » | **P** | |
| Voir la semaine de l'équipe (heures, prévu vs pointé, absences, supplémentaires) | tableau / cartes | **P** (une fois par semaine, avant de valider) | |
| Repères légaux (10 h, 48 h, 11 h de repos, jours planifiés sans pointage) | « À regarder » | **P** | |
| Corriger une journée à la main, **motif obligatoire**, trace avant/après, le salarié est prévenu et doit reconfirmer | fiche de la journée | **P** | **cœur de confiance** ; à garder tel quel |
| Ajouter une journée oubliée (« Ajouter un pointage ») | fiche d'une journée vide | **P** | |
| Valider une semaine (une personne) / toutes les semaines en règle (avec « Annuler ») | « Valider », « Valider 4 semaines en règle » | **P** (chaque semaine ou chaque mois) | |
| Naviguer d'une semaine à l'autre | ‹ › | **P** | |
| Pointer soi-même (début/fin de journée du gérant) | bouton de l'en-tête | **J** pour un gérant qui pointe ; **R** sinon | mécanique différente de celle du salarié (pas de pause) |
| Calcul des heures supplémentaires (35 h, 25 % jusqu'à 43 h, 50 % au-delà, mandataire exclu), heures de nuit (21 h–6 h) | `ptAlertes`, `paieVariables` | automatique | |
| Planifié ↔ pointé | « prévu 3h30 », fiche | **P** | |
| Verrouiller le mois (plus aucune heure ne bouge) et envoyer au cabinet | Comptabilité › Paie | **P** (mensuel) | |
| Jours fériés, week-end, paniers, primes, frais | paie | **P** | hors Temps de travail |

### 2.3 Temps de travail — salarié

| capacité | fréq. | pourquoi |
|---|---|---|
| « Je commence ma journée » / « J'ai commencé plus tôt » | **J** | |
| Pause / Je reprends | **J** | |
| « Je termine » avec fin et pause proposée | **J** | |
| Fin d'hier oubliée | **P** | |
| Voir ses heures de la semaine / du mois, supplémentaires, nuits, absences | **P** | |
| « Je confirme mes heures » / « Signaler une erreur » / « Ce n'est pas ça » | **P** (mensuel) | |
| Voir les heures corrigées par le bureau et pourquoi | **P** | transparence ; à garder |
| Voir ses fiches de paie | **P** (mensuel) | |
| Rappels automatiques (cloche) | **P** | |

---

## 3. Le modèle de données (et à ne pas casser)

### 3.1 Véhicules (`VEHICULES`, l. 9253 ; `vxInit` l. 15661 complète les champs)
Un véhicule : `id` (`veh1`…), `plaque`, `marque`, `modele`, `annee`, `km`, `conducteur` (clé d'équipe : `sm`, `kb`, `lr`, `tl`, `marc` ; **liste codée en dur dans `vxListeConducteurs`**, Julie exclue), `lieu` (l'identifiant du lieu de stock `v1`… dans `LIEUX`, `type:'vehicule'`, `dot:'clim'`), `statut` (`service` / `atelier` / `hs`), `energie`, `assur {cie, contrat, fin, prime}`, `ct` (date du prochain contrôle), `entretien {km, date, lib}`, `interv {km, mois}` (intervalle de révision), `materiel {fait, ok[]}`, `frais [[date, libellé, HT]]` (frais propres), `hist[]` (échéances faites), `anc[]` (anciens conducteurs datés), `docs {carte, assur, ct}`, `immo {motif, garage, du, retour, remplacement}`, `immoHist[]`, `incidents[]` (amendes, sinistres), `pleins[]` (date, km, litres, TTC), `releves[]` (date, km, qui), `alertes{}` (rappels déjà envoyés), `souci {type, txt, qui, d, photo, tache}`.
D'où vient chaque chiffre :
- **« N articles à bord / M manquent »** : `lieuArticles(v.lieu)` et `lieuManques(v.lieu)` (module Stock). « 515 € de stock à bord » = somme de `lieuValeur(v.lieu)` ; la fiche d'un véhicule dit « 225 € ».
- **« Frais en octobre (HT) 1 566 € »** = somme de `vehMois(v)` = `vehFrais(v)` du mois en cours. `vehFrais` (l. 15720ish, version vx) réunit : les `frais` propres de la fiche, les **achats** dont l'objet ou la justification contient la plaque (`ACHATS`, `fid:'veh'`, `veh`), et les **notes de frais en attente** (`NDF`, `veh`). Vérifié à la main : 544,50 + 515,17 + 318,00 + 188,00 = 1 565,67 → 1 566 €. Les « Carburant · octobre 376,00 € » sont des lignes de démonstration (une par mois) : dans la vraie base chaque plein est une ligne.
- **« Coût au km »** (`vxCalcCout` l. 15737) = (frais hors assurance + prime annuelle/12 × nombre de mois) ÷ (km actuel − km au début de la période connue). La période commence au **premier relevé du compteur** (pas à l'achat) : « Depuis l'achat » veut dire « depuis le premier relevé ». « L aux 100 km » = litres des pleins renseignés ÷ km entre premier et dernier plein ; « — » tant qu'il n'y a pas deux pleins avec litres.
- **Échéances** (`vehEcheances` vx l. ~15685) : assurance, contrôle technique, entretien (date **ou** km restants), contrôle du matériel (6 mois après `materiel.fait`). Paliers (`vxUrg`) : rouge si retard ou ≤ 7 j ; orange si ≤ 60 j (CT, assurance) ou ≤ 30 j ou ≤ 1 500 km (entretien, matériel).
- **Tâches liées** : clé de tâche `veh-<id>-<échéance>` (urgente) ou `vrdv-…` (pas encore à prévoir) ; `vxGroupes` fabrique `veh-flotte-assur-<date>`.
Écritures vers d'autres modules : `ACHATS` (compte 6061/6155/616/625), `NDF`, `TACHES`, `NOTIFS`, `JOURNAL`, `DEM_ACHAT`, `LIEUX`, plus la pastille du Planning (`vxGarageDe`).

### 3.2 Temps de travail
- **`POINTAGES`** (l. 9375…) : `{id, qui, date, debut:'HH:MM', fin:'HH:MM'|null, pause (min), note, corrige}`. Une journée sans `fin` est ouverte ; `ptOuvert` = ouverte **et antérieure à aujourd'hui**. `ptDuree` gère la nuit (fin < début → +24 h). Un pointage a plusieurs lignes possibles par jour (`ptJour` renvoie une liste).
- **`PT_VALIDE`** : `{<qui><lundi>: true}` — la validation est **par personne et par semaine**, et se retire dès qu'une heure bouge (`ptDevalide`).
- **`PT_TRACE`** (l. 11689) : `{pid, qui, date, champ, avant, apres, par, le, motif, sess}` — chaque correction, ce que voit le salarié et ce qui part au cabinet. `le` est écrit en dur « 31/10 · HH:MM » dans le prototype.
- **`PAIE`** (l. 11687) : `{confirmes{qui:{le}}, signales{qui:{msg, le, apres, req}}, primes{}, envoi, bulletins{}, distribue, verrou, format, vus{}}` ; `PAIE_MOIS` = mois du jour ; `PAIE_SAL[k]` (dont `mandataire`) ; `PAIE_FERIES`.
- **`PTX`** : `{rappels, rappele{}, pause{}, src{}, finInt{}, tout}` — réglages et états de l'écran (rappels automatiques, pause en cours, fin proposée).
- **Chiffres** : « 40h50 » = `ptJourMin` sommé sur la semaine ; supplémentaires = `max(0, min(total,43 h) − 35 h)` à 25 % puis `max(0, total − 43 h)` à 50 %, nuls pour un mandataire ; « prévu 3h30 » = durée des interventions du jour (`INTS`, `i.dur`) pour la personne (`prevuMin`) ; absences = `ABSENCES` (`absDe`). Un « semaine à cheval sur deux mois » est comptée sur le mois où elle se termine.
- Rappels automatiques de 09:30 : une notification est **déjà créée au chargement** pour Sophie et Tom (« Rappel automatique : tu n'as pas encore commencé ta journée ») dès qu'une intervention avant 09:30 n'a pas de pointage.

### 3.3 Fonctions partagées (à ne pas casser)
`lieuArticles`, `lieuManques`, `lieuValeur`, `sxMonLieu` (stock) ; `ACHATS`, `NDF`, `DEM_ACHAT` (achats) ; `TACHES`, `LIENS_SOURCES`, `tDetail`, `tFaire` (tâches) ; `notifier`, `NOTIFS`, `journalAjout`, `H_TYPES.vehicule` (cloche, historique) ; `INTS`, `prevuMin` (planning) ; `ABSENCES`, `absDe` ; `H_NOM`, `H_GENS`, `prenomDe`, `rlQui`, `ROLES` ; `foOuvrir` / `ouvrirPanneau` / `foGarder` (tiroirs), `toast` (avec « Annuler »), `dtPoser` / `dtFermer` (sélecteur d'heure : l'heure est gardée « en attente » puis enregistrée aux minutes — rustine l. ~11968, évite qu'une correction en fasse deux) ; `paieAller`, `paieVariables`, `paieReleve` (la Paie lit `POINTAGES`, `PT_TRACE`, `PAIE`). Les visites (`GD_TOURS`, `immChap`) lisent `VEHICULES`, `VX`, `POINTAGES`, `PAIE`, `PT_TRACE`.

---

## 4. Ce que je vois (captures) et la critique honnête, écran par écran

Comparaisons chiffrées (`s17.js`, même profil, mêmes gestes recensés) :

| écran | hauteur Mac | hauteur iPhone | boutons Mac | cartes + chiffres |
|---|---|---|---|---|
| Devis (validé) | 900 | 1 506 | 14 | 6 |
| Clients (validé) | 900 | 1 985 | 12 | 8 |
| Interventions (validé) | 991 | 1 988 | 19 | 2 |
| Équipe (validé) | 1 151 | 2 086 | 21 | 11 |
| Absences et congés (validé) | 1 622 | 2 702 | 19 | 4 |
| **Véhicules** | 1 470 | **3 128** | 23 | 11 |
| **Temps de travail** | 2 022 | **4 229** | **69** | 11 |

Ce que les écrans validés ont en commun (captures `cap/devis-mac-jour.png`, `cap/clients-mac-jour.png`, `cap/ref-interventions-mac.png`, `cap/ref-absences-mac.png`, `cap/ref-equipe-fiche-mac.png`) : un titre et **un bouton principal en haut à droite** (Devis met ses trois boutons sous le titre) ; au plus une ligne grise de sous-titre ; **des onglets segmentés** (« À envoyer · En attente · Acceptés », « À valider · Calendrier · Soldes ») ; **UNE liste ou UNE grille** ; chaque ligne dit une chose et porte un état en pastille ; la fiche est un tiroir qui **commence par l'essentiel** (Équipe : en-tête, trois chiffres, une ligne de liens, puis les sections ; mesuré : 1 950 px et 14 boutons, contre 3 253 px et 45 boutons pour la fiche véhicule). Les chiffres du haut, quand ils existent, sont **le point d'entrée** (ils ouvrent un filtre).

### 4.1 Véhicules — écran liste (`cap/vehicules-mac-jour.png`, `-nuit`, `cap/m-vehicules-iphone-t1.png`, `cap/m-vehicules-ipad-t1.png`)

Ce qui est bien (à garder) : la bande « À faire maintenant » dit quoi faire avec des **mots clairs** (« Prendre rendez-vous au garage », « Révision faite ») ; l'assurance des 4 véhicules en **une** ligne ; la plaque en pastille à chasse fixe ; les statuts en couleur (vert/orange/rouge) ; le nuit est propre.

Ce qui fait dire « c'est moche, c'est mal fait » :
1. **Trois niveaux d'importance pour la même chose.** Une échéance se lit dans la bande, **dans le chiffre « 3 échéances à prévoir »** (qui est un filtre, mais ne ressemble pas à un bouton), **dans le filtre « À prévoir »**, et **à nouveau dans le bandeau coloré de la carte**. Quatre fois la même échéance ; aucune ne se distingue.
2. **L'ordre est inversé** par rapport aux écrans validés : la bande d'action passe avant les chiffres, qui passent avant le filtre, qui passe avant les véhicules. Dans Devis : chiffres → onglets → liste.
3. **Les quatre cartes sont de hauteur égale, imposée par la plus haute** (394 px) : sur trois cartes sur quatre, la moitié basse est du vide (capture Mac). Le Kangoo, au garage, a trois lignes de plus : cela étire les trois autres.
4. **Une carte = 7 informations** (nom, plaque, statut, conducteur · km · énergie, échéance, deux tuiles « articles à bord / interventions aujourd'hui », garage, souci). Un artisan veut « qui l'a ? » et « y a-t-il un problème ? » : deux informations. Les tuiles « 6 articles à bord · 3 manquent » et « 3 interventions aujourd'hui » parlent du stock et du planning, pas du véhicule ; en 3 lignes dans la tuile (« articles à bord · 3 manquent » se coupe sur 3 lignes à 273 px de large).
5. **Mot technique et ponctuation étrange** : « interventions aujourd'hui » dans une tuile à côté de « articles à bord » ; « 1 intervention de Tom concernée » en orange gras sans verbe ; « Immobilisés » (le gérant dit « au garage »), « échéances à prévoir » (il dit « à faire »).
6. **Le pictogramme est le même camion pour tous** (même l'électrique) et ne porte aucune information.
7. **Le classement « Les plus chers au kilomètre »** : quatre barres de la **même couleur marron** (une barre de 0,10 €/km a la même couleur d'alerte qu'une de 0,34 €/km) ; ce n'est pas lisible comme un classement bon/mauvais ; et c'est en bas d'une page déjà longue.
8. **Cinq chiffres** dont deux (« 515 € de stock à bord », « 1 566 € frais en octobre HT ») qui ne servent à aucune décision de la journée ; sur iPad ils se rangent en 2 colonnes avec **un chiffre orphelin** (`cap/m-vehicules-ipad-t1.png`).
9. **iPhone** : 3 128 px ; la bande « À faire maintenant » seule fait environ un écran et demi parce que chaque ligne empile deux gros boutons pleine largeur (`cap/m-vehicules-iphone-t1.png`) ; la barre du bas (pilule) passe sur le milieu de la 3ᵉ ligne ; le bouton « Menu » porte une pastille « 7 » sans explication.
10. Les noms sont tronqués ou coupés : « Renault Kangoo Van E-Tech » passe sur deux lignes dans une carte et casse sa propre plaque en dessous.

### 4.2 Véhicules — fiche (`cap/veh-fiche1-mac-haut.png`, `-700`, `-1400`, `-2100`, `-2800`)
- **3 253 px de haut, 12 sections, 45 boutons, 8 cases à cocher** (`s2.js`) : c'est un dossier, pas une fiche. À titre de comparaison, la fiche Équipe (validée) fait 1 950 px et 14 boutons : elle est longue aussi, mais elle ouvre sur trois chiffres et une ligne de liens.
- **Les titres de section** (Échéances, À bord, Matériel de sécurité, Documents…) sont de **petits textes bleus de 12 px**, de la même couleur que les liens : on ne distingue pas un titre d'un bouton.
- **La ligne « Conducteur »** met l'étiquette au centre d'un bloc de deux lignes (nom + lien) : l'étiquette flotte à mi-hauteur (capture haut). Même défaut sur « Kilométrage » (le chiffre, le lien, puis « Dernier relevé » en trois lignes à droite).
- **Quatre boutons « Contrôle fait » / « Révision faite » / « Assurance renouvelée »** alignés à droite de quatre lignes, dont deux libellés identiques (« Contrôle fait » pour le **matériel** et pour le **contrôle technique**) : on ne sait pas lequel on tape sans relire la ligne. Le premier est noir (le plus urgent), les trois autres blancs.
- **Le bloc « Frais »** : la colonne de droite porte le montant et deux liens bleus « Modifier » « Supprimer » **sur chaque ligne** (12 liens), alors que le geste n'arrive qu'après une erreur de saisie.
- **Les huit cases du matériel de sécurité** sont **dans le milieu de la fiche** à 20 × 20 px (le plancher tactile du dépôt est 44), avec deux boutons au-dessus (« Tout est présent », « Contrôle fait aujourd'hui ») dont l'un est noir (primaire) sans que ce soit le geste le plus utile.
- **Les documents** sont trois lignes « Pas encore ajouté » + boutons « 📷 Ajouter » : trois lignes vides sur toutes les fiches neuves.
- **Ce que ça coûte** : une période à trois états, quatre tuiles dont « L aux 100 km — » (vide tant qu'il n'y a pas deux pleins avec litres), un histogramme dont les mois « mai » et « juin » sont vides parce que **la période connue commence au 23 juin** (le premier relevé) — mais la légende ne dit pas pourquoi ; une phrase longue en gris sous l'histogramme.
- **Deux boutons « Saisir un plein ou une facture »** dans la même page (le haut de l'écran liste et la fiche), un noir au milieu de la page sans lien avec ce qui l'entoure.
- **Historique** et **Amendes et sinistres** : tout en bas, après 3 écrans ; une amende reçue ne se trouve que si l'on sait qu'elle est « à la fin de la fiche ».
- Le titre du tiroir ne dit **jamais l'état en une phrase** (« En règle » / « Assurance dans 41 jours »).
- Nuit : correct (même structure).

### 4.3 Véhicules — panneaux (`cap/veh-nouveau-mac.png`, `veh-plein-mac.png`, `veh-p-garage-mac.png`, `veh-p-*.png`)
- **« Nouveau véhicule »** : 13 champs sur 3 écrans de tiroir, dont des sujets que le gérant ne sait pas au moment de l'achat (n° de contrat, intervalle de révision en km **et** en mois, dernière révision en date **et** km). Le message final promet de « compléter les documents ».
- **« Un plein ou une facture »** : s'ouvre depuis le haut avec « Choisis le véhicule… » en premier (le plus important) ; **onze champs** quand on dépose une facture de garage (litres sans objet) ; le bouton « 📷 Photo du ticket (sans photo, la tâche « Retrouver le ticket » te le rappellera) » est une phrase de 15 mots **dans** un bouton. Côté technicien le véhicule est déjà choisi : c'est le bon chemin ; côté gérant il manque ce raccourci.
- **« Mettre au garage »** : bon contenu (les 4 interventions de Sophie sont listées, « Tu pourras les déplacer au Planning juste après ») ; le motif, le garage, la date, le remplacement forment 4 champs avant d'arriver au bouton.
- **« Contrôle technique passé »** : la prochaine date est **proposée** (+2 ans, avec l'explication « remplace-la par la date écrite sur le PV ») : c'est bien pensé.
- Tous les panneaux « Retour » / « Annuler » sont cohérents (‹ Retour vers la fiche).

### 4.4 Technicien : « Mon véhicule » dans Ma journée et l'onglet « Camion » (`cap/m-` : `tech-majournee-iphone-t3.png`, `tech-moncamion-iphone-t1.png`)
- **Deux cartes « camion » qui ne se parlent pas** : « Mon camion · 3 articles à remettre à bord » (haut de Ma journée, stock) et « Mon véhicule · Renault Trafic » (bas, 1 600 px plus loin : compteur, assurance dans 41 j, 3 manquent, Un plein / Relever le compteur / Signaler un souci). L'onglet « Camion » (barre du bas) ne contient que le stock.
- **La carte « Mon véhicule » est enterrée** : après « Ma journée de travail », les messages, le stock, les habilitations, trois interventions, « Mes tâches » ; or « Un plein » est **le** geste du jour du technicien.
- **Les « Messages du bureau »** (le même rappel automatique) apparaissent **sur Ma journée ET sur Mon camion** (mêmes 3 lignes, même date), alors que le rappel concerne le pointage.
- **« 3 manquent »** (dans Mon véhicule) et « 3 articles à remettre à bord » (dans Mon camion) disent la même chose de deux façons.
- Le bouton « Relever le compteur » passe sur deux lignes dans sa pilule (`cap/tech-majournee-iphone-t3.png`) ; « ⛽ Un plein » et « ⚠️ Signaler un souci » portent un émoji, les autres icônes de l'application sont des traits.

### 4.5 Temps de travail — écran gérant (`cap/pointage-mac-jour.png`, `cap/m-pointage-mac-nuit-t1.png`, `cap/m-pointage-ipad-t1.png`, `cap/m-pointage-iphone-t1…t5.png`)

Ce qui est bien (à garder, c'est ce que Justin veut dire par « pas mal ») : la carte **« Aujourd'hui »** est le meilleur bloc de la page — un état par ligne (Au travail · Absent · Attendus, pas pointés · À fermer), avec le bouton qu'il faut (« Rappeler encore », « Lui demander son heure ») ; la carte « **Demandes des salariés** » avec « Corriger : fin à 17:40 » en **un** bouton ; la grille de la semaine (valeur + horaire dans chaque case, congés en violet, journée ouverte en orange, case liseré rouge si alerte) ; les alertes avec **la phrase de la règle** ; la correction avec motif obligatoire et trace ; la clôture à l'heure habituelle ; « Annuler » dans les toasts de validation.

Ce qui fait « pas assez simple » :
1. **Le même fait est répété cinq fois sur la page** : la journée ouverte de Tom apparaît (a) dans le bandeau rouge du haut, (b) dans « À fermer · 1 » d'Aujourd'hui, (c) dans « À regarder cette semaine » (« Tom Leroy ven. 30 : journée restée ouverte »), (d) dans la case orange « ouvert » de la grille, (e) à l'étape 1 de la Paie (« 1 journée restée ouverte »). La demande de Tom est répétée dans « Demandes » et dans la pastille « Erreur signalée » de la Paie. Quatre alertes de Karim (dont deux pour le même jeudi 29) se lisent en 4 lignes, plus une case rouge, plus « +13h45 sup. ».
2. **Pas de chiffres du haut, pas d'onglets** : l'écran est une pile de 7 blocs de natures différentes (bandeau, bandeau, carte, carte, barre de semaine, carte, grille, note, carte à case) ; sur le Mac : 2 022 px, 69 boutons. Un salarié, une journée, une semaine, un mois ne sont jamais distingués : **la page mélange le « aujourd'hui », « la semaine » et « le mois »** (la paie).
3. **Deux boutons presque identiques à deux endroits** : « Valider 4 semaines en règle » (Temps de travail, valide **seulement la semaine affichée**) et « Valider les semaines sans alerte » (Paie, valide tout le mois). Pour verrouiller octobre il faut avoir validé 30 semaines-personnes (mesuré : « D'abord les heures : 1 journée restée ouverte · 30 semaines pas encore validées (Sophie, Karim, Léa, Tom, Julie, Marc) », `s8.js`) ; « 30 semaines » désigne 6 personnes × 5 semaines — la phrase est incompréhensible pour un gérant.
4. **Le vocabulaire est celui d'un logiciel de paie** : « Clôturer à l'heure dite », « Attendus, pas pointés », « À fermer », « valider la semaine », « figer », « sup. 25 % / 50 % », « relevé », « corrections », « verrouiller », « éléments variables » (dans le code) ; les références « (Code du travail L3121-18) » au milieu de chaque alerte. Un artisan dit « il a oublié de terminer sa journée », « les heures en plus », « confirmer les heures du mois ».
5. **Le tableau de la semaine** (69 boutons) : 42 cases cliquables, 6 « Valider », 6 noms ; il rend **bien** au Mac mais ne tient pas sur un téléphone : il est **remplacé** par des cartes dont la grille de 7 jours **se casse en 4 + 3** (`cap/m-pointage-iphone-t3.png`, `-t4.png`) — le « D » (dimanche) tombe seul sur la deuxième rangée ; les absences s'affichent comme un point « · » violet sans mot. Deux composants pour la même information = deux fois plus de défauts (et le code les fabrique tous les deux, un caché par CSS).
6. **La carte des rappels automatiques** (case à cocher + 3 lignes grises) est un **réglage**, posé à la fin de la page de travail comme une carte de plus, avec la phrase « Repères du Code du travail : généraux, à vérifier avec ton expert-comptable ».
7. **Le bandeau bleu « La paie du mois est dans Comptabilité › Paie »** est un panneau de signalisation posé en travers de la page.
8. **Le bouton « Début de ma journée »** du gérant, en haut à droite, est le **seul** de la rubrique qui concerne l'utilisateur lui-même, mélangé à un outil de supervision ; il n'a ni pause ni « Je termine » (autre mécanique que celle des salariés, `data-pt="debut/fin"` contre `data-ptx="debut|…"`).
9. **iPad** : le menu latéral permanent mange 272 px, la page se met en colonne unique ; « Rappeler encore » et « Lui demander son heure » **passent sous le texte** (`cap/m-pointage-ipad-t1.png`) ; le titre et le bouton « Début de ma journée » se répartissent sur deux lignes.
10. **Pas de chiffre du mois** : à aucun endroit le gérant ne lit « 170 h pointées ce mois-ci, 46 h supplémentaires, 3 journées à corriger » ; il faut ouvrir la Paie.

### 4.6 Temps de travail — fiche d'une journée (`cap/pt-jourSophie-mac.png`, `cap/pt-jour-apres-correction-mac.png`)
- **Il n'y a pas de bouton « Enregistrer »** : le gérant doit **d'abord** écrire un motif (obligatoire, mais le champ est sous un titre de section « Pointage »), **puis** changer une heure ; ensuite rien ne dit « c'est enregistré » sauf la ligne qui apparaît plus bas dans « Corrections de cette journée ». Mesuré (`s8.js`) : sans motif la pause reste à 60 min et un toast refuse ; avec motif elle passe à 75 min, la trace s'ajoute — mais **le toast d'avant (« Dis d'abord pourquoi… ») reste affiché** après la réussite.
- Les deux « chiffres » en haut (« 8h30 pointées / 0h00 prévues au planning / 8h30 non planifiées ») sont justes mais **« non planifiées » est un troisième chiffre** qui n'apparaît que quand il vaut quelque chose.
- Les sélecteurs d'heure sont du bon travail (voir la rustine « l'heure en attente »), mais **le motif n'est jamais montré comme condition** : le champ ressemble à un commentaire facultatif.

### 4.7 Temps de travail — côté salarié (`cap/tech-majournee-iphone-*`, `cap/tech-mesheures-iphone-t1…t4.png`, `cap/tech-p-signaler.png`, `cap/tech-h-journeeEnCours.png`)
Ce qui est bien : « Ma journée de travail » est **simple et clair** : une phrase d'état, un gros bouton noir, « J'ai commencé plus tôt » en lien ; le panneau « Signaler une erreur » (jour, début, fin, pause, une phrase) est direct ; « Je confirme mes heures » est un seul geste.
Ce qui fait « pas assez simple » :
- **La carte « Ma journée de travail » est la même dans Ma journée et dans Mes heures** (le technicien la voit deux fois sur deux onglets voisins) ;
- **« Mes heures » fait 3 004 px** : carte du jour, relevé à confirmer, 4 chiffres, « Semaine par semaine » (5 semaines), « Mes journées » (7 jours × « Ce n'est pas ça »), « Voir tout le mois (21 jours) », heures corrigées, fiches de paie. Sept « Ce n'est pas ça » identiques, à répéter ;
- **« Semaine du 26 oct. — se termine en novembre — +5h50 sup. · sur novembre »** est incompréhensible pour un technicien (la règle de la semaine à cheval) ;
- « Tes heures sup. de la semaine qui finit en novembre seront sur ta paie de novembre » : vrai, mais c'est le mot « sup. » et le conditionnel qui perdent ;
- **Le salarié peut confirmer ses heures du mois alors que sa journée du jour est ouverte** (test : Sophie démarre à 10:40, puis « Je confirme mes heures » passe sans avertissement, toast « tes heures sont confirmées »). Dernier jour du mois, donc plausible ici, mais la règle n'est écrite nulle part.

### 4.8 Cohérence avec les écrans validés — en une phrase par écran
- vs **Devis** : même matière (cartes blanches, pastilles), mais Devis a *un* bloc principal ; Véhicules et Temps en ont 7 à 11.
- vs **Clients** : une carte client dit trois chiffres ; une carte véhicule dit sept choses.
- vs **Interventions** : ses lignes sont une grille « Quand / Intervention / Client / Technicien / État » où **l'état est une pastille unique à droite** — c'est exactement ce que la grille de la semaine ne fait pas (état = couleur de fond de la case).
- vs **Absences et congés** : « À valider · Calendrier · Soldes » ; Temps de travail devrait ressembler à « Aujourd'hui · Semaine · Mois ».
- vs **Équipe** : sa fiche est le modèle d'un tiroir qui ouvre sur trois chiffres et une ligne de liens ; la fiche véhicule ouvre sur un bouton « Modifier la fiche » et sur deux lignes d'étiquettes ; elle est 1,7 fois plus haute (3 253 contre 1 950 px) et porte 3 fois plus de boutons (45 contre 14).
- vs **Comptabilité** : la Paie est rangée dans ses sous-onglets (Le mois / Fiches / Salariés / Charges) — le principe est bon et **doit être imité** pour Temps de travail.

---

## 5. Défauts de fonctionnement rencontrés en jouant chaque geste

Joué : plus de 40 gestes sur Mac, iPhone, iPad (`s2`…`s19`). Pages : 0 erreur JavaScript, 0 débordement latéral à 320, 360, 390, 820, 1366, 1440 px ; aucun champ sous 16 px ; mais :

1. **« Prendre rendez-vous au garage » ne prend aucun rendez-vous** : il crée une tâche « Garage : … » pour **Marc lui-même** dans 3 jours (toast « Tâche créée : prendre rendez-vous au garage pour EK-317-TB »). Le libellé promet plus que le geste. Une fois créée, le bouton devient « Rendez-vous demandé · voir la tâche » même si personne n'a téléphoné.
2. **Le gérant ne voit rien à l'Accueil** (`s18.js`, `cap/accueil-mac-jour.png`) : ni le contrôle technique du Peugeot (12 j), ni la révision du Kangoo en retard de 3 jours, ni la journée de Tom ouverte, ni les 4 alertes légales de Karim, ni la demande de correction de Tom. Les notifications pour **Karim** (« Ton camion a son contrôle technique dans 12 jours ») et **Tom** existent, pas celles du gérant. Les tâches suggérées n'existent qu'une fois la rubrique ouverte.
3. **La secrétaire est renvoyée sur Comptabilité** quand elle tente `vehicules` ou `pointage` : elle n'a pas d'autre écran où voir un camion au garage ou la semaine de l'équipe. Décision de Justin (menu final), mais à rouvrir : c'est elle qui appelle le garage.
4. **Seul le gérant peut corriger/valider ; le chef d'équipe (Karim) voit le rôle « technicien »** et n'a aucune vue de son équipe.
5. **Le toast d'un refus reste affiché après la réussite** (correction de pause, voir 4.6).
6. **« D'abord les heures : … 30 semaines pas encore validées »** : verrouiller le mois est impossible sans avoir validé 30 semaines-personnes ; la phrase n'est pas compréhensible, et le chemin court (« Valider les semaines sans alerte ») est dans une autre rubrique que celle où l'on a vu le problème. Gestes réels pour fermer octobre aujourd'hui : Temps → Valider 4 semaines en règle → (confirmer) → ‹ semaine précédente × 4 avec la même opération → corriger Tom et Karim (≥ 4 gestes chacun) → Comptabilité › Paie → Verrouiller. Environ 20 gestes sans passer par « sans alerte ».
7. **« Valider 4 semaines en règle » valide la semaine affichée seulement** : le libellé dit « semaines » au pluriel, le panneau dit « Valider 4 semaines ? Sophie, Léa, Julie, Marc » (4 personnes, **1 semaine**) : confusion personnes/semaines.
8. **Le gérant qui pointe n'a ni pause ni « Je termine »** : son bouton « Fin de ma journée » met la fin à « maintenant ou début + 1 min » sans passer par le panneau de fin/pause du salarié (autre fonction, `data-pt="fin"`, l. 9456).
9. **Un nouveau véhicule reçoit la dotation « clim » quel que soit le métier** (`vxCreerOk`, `dot:'clim'`), et **la liste de conducteurs est écrite en dur** (`['sm','kb','lr','tl','marc']`, Julie exclue) ; plusieurs dates sont écrites « 31/10 » en dur (`creeLe`, `PT_TRACE.le`) : comportement de prototype, à reprendre dans la vraie base.
10. **La suppression d'une ligne de frais est un lien nu** « Supprimer » (12 par fiche) : le toast propose bien « Annuler », mais un lien à côté de « Modifier » se touche facilement au pouce.
11. **Contradiction de promesse sur la paie** : le commentaire de tête du module pointage (l. 11675 environ) dit que OP GESTION **ne calcule pas** les fiches de paie et ne fait que préparer les éléments variables ; l'écran Comptabilité › Paie propose « OP GESTION les calcule » et le texte de l'étape 4 : « salaire, heures supplémentaires, primes, paniers, cotisations, impôt prélevé ». **À faire trancher et relire par `juriste` avant toute refonte** (CLAUDE.md : tout document juridique reçu par un client passe par `juriste` ; une fiche de paie est un document juridique).
12. **Rappels automatiques** : au chargement, le prototype **écrit déjà** la notification de 09:30 pour Sophie et Tom (l. 15616ff) — cohérent avec « il est 10:40 », mais Sophie n'a pas encore commencé : la carte « Messages du bureau · 1 » se répète sur Ma journée et Mon camion.
13. **Le mot « Immobilisés »** (filtre) et la page « Dépôts et camions » ont **chacune** une bande « À faire maintenant » (`cap/ref-boxes-mac.png`) : deux bandes, deux logiques de priorité, sur deux rubriques voisines qui parlent du même camion.
14. **Vérifié correct** : plein (achat créé, kilométrage mis à jour, KPI 1 566 → 1 636 €), nouveau véhicule (plaque normalisée, lieu « Camion ZZ-999-AA » créé dans Dépôts et camions, fiche ouverte, toast avec « Annuler »), contrôle technique fait (CT 2026-11-12 → 2028-10-31, historique, toast), correction de Tom (heure passée de 16:42 à 17:40, total 32h00 → 32h58, Tom doit reconfirmer), clôture proposée à la fin habituelle (16:48).

---

## 6. Les dix choses qu'on vient faire ici, par ordre de fréquence, et en combien de gestes

Un geste = un tap/clic (sans compter la saisie au clavier) ; menu = 1 geste sur ordinateur, 2 sur téléphone (Menu → rubrique) ; « défilements » comptés à part. Mesuré ou déduit du code.

### 6.1 Le gérant (Marc), Temps de travail
| # | ce qu'il vient faire | gestes aujourd'hui | commentaire |
|---|---|---|---|
| 1 | Voir qui est au travail / absent / en retard ce matin | 1 (ouvrir) ; l'information est en haut : **bon** | pas à l'Accueil |
| 2 | Rappeler ceux qui n'ont pas pointé | 1 | bon |
| 3 | Traiter la demande de correction d'un salarié | 1 (« Corriger : fin à 17:40 ») | très bon |
| 4 | Clôturer la journée oubliée de Tom | 2 (« Clôturer à l'heure dite » → Clôturer) | bon ; vocabulaire « à l'heure dite » |
| 5 | Corriger une heure à la main | 4 à 6 (case → motif → heure (2–3) ) | motif obligatoire non évident, pas de bouton Enregistrer |
| 6 | Savoir si la semaine est en règle (alertes légales) | 0 (visible), mais 5 lignes et 5 répétitions | lecture longue |
| 7 | Valider les semaines en règle | 2 pour la semaine affichée ; ×5 semaines = 10 ; plus 2 par personne en alerte | le chemin court est dans la Paie |
| 8 | Verrouiller le mois et passer à la paie | ≈ 20 (voir § 5.6) ou 3 par « sans alerte » | |
| 9 | Voir les heures du mois d'une personne | 2–3 (case → lien « Toutes les heures de Sophie ce mois-ci ») | |
| 10 | Pointer soi-même | 1 + 1 (« Début » / « Fin ») | sans pause |

### 6.2 Le technicien, Temps de travail
| # | geste | aujourd'hui |
|---|---|---|
| 1 | Je commence ma journée | 1 (Ma journée, en haut) — **bon** |
| 2 | Je termine (fin + pause) | 2 |
| 3 | Pause / Je reprends | 1 |
| 4 | Confirmer mes heures du mois | 1 (dans Mes heures, 1 écran sous la carte du jour) |
| 5 | Signaler une erreur | 4 (Signaler → jour → heures → phrase → Envoyer) |
| 6 | Voir mes heures de la semaine | 1 + 2 défilements |
| 7 | Voir ma fiche de paie | 1 + 5 défilements (bas de Mes heures) + 1 |
| 8 | Corriger une journée précise | 2 (« Ce n'est pas ça ») |

### 6.3 Le gérant, Véhicules
| # | ce qu'il vient faire | gestes |
|---|---|---|
| 1 | Voir si un véhicule a un problème ou est au garage | 1 (ouvrir) ; l'information est dans la bande, **mais pas à l'Accueil** |
| 2 | Marquer un contrôle/une révision fait | 3 (« Contrôle fait » → date proposée → Valider) — bon |
| 3 | Demander un rendez-vous garage | 1 — mais ne prend pas de rendez-vous |
| 4 | Saisir un plein / une facture (pour quelqu'un) | 4 + saisie (« Saisir un plein » → véhicule → montant → Enregistrer) |
| 5 | Mettre un camion au garage | 3 (fiche → Mettre au garage → Valider) |
| 6 | Voir ce que coûte un véhicule | 1 + 2 défilements (fiche) ; le classement est visible sans geste |
| 7 | Changer de conducteur | 3 |
| 8 | Amende reçue | 3 + **3 écrans de défilement** pour trouver le bouton |
| 9 | Renouveler l'assurance de la flotte | 2 |
| 10 | Ajouter un véhicule | 3 + 13 champs |

### 6.4 Le technicien, véhicule
| # | geste | gestes |
|---|---|---|
| 1 | Un plein | 3 + **défilement de 1 600 px** (Ma journée → carte « Mon véhicule » → Un plein → Enregistrer) |
| 2 | Relever le compteur | 3 + défilement |
| 3 | Signaler un souci | 4 + défilement |
| 4 | « J'ai pris à l'atelier » (stock) | 2 (onglet Camion → bouton) |
| 5 | Voir ce que j'ai à bord | 1 (onglet Camion) |

### 6.5 La secrétaire
Elle **n'a aucun de ces écrans**. Dans la vraie vie, elle prend les rendez-vous garage, classe les factures de carburant (Achats), prépare les éléments de paie : c'est une demande à poser à Justin (accès en lecture ? droit « Véhicules » ? rôle « Responsable » ?).

---

## 7. Ce que je recommande d'étudier pour la refonte (pistes, pas des décisions)

À valider avec Justin ; les choix de goût sont à lui.

### 7.1 Temps de travail — « garder le fond, ranger la forme »
1. **Trois onglets, comme Absences et congés** : « Aujourd'hui · Semaine · Mois » (la Paie est déjà dans la Comptabilité ; « Mois » = les chiffres du mois et le chemin vers la Paie, pas la Paie elle-même).
2. **Quatre chiffres du haut** (ils ouvrent un filtre) : « 3 au travail · 2 pas encore pointés · 1 journée à fermer · 5 points à regarder ».
3. **Une seule file « À faire »** pour le gérant (fermer la journée de Tom, répondre à sa demande, vérifier les 13 h de Karim) : chaque fait une seule fois, un seul bouton par ligne.
4. **Une seule vue de la semaine** : le tableau sur ordinateur, **la même grille sur téléphone en défilement horizontal ou une personne à la fois** (au lieu de deux composants), les absences dites par un mot.
5. **Des mots d'artisan** : « Terminer la journée de Tom à 16:48 » ; « Heures en plus » ; « Confirmer le mois » ; plus de références de loi dans la ligne (dans une infobulle « ? »).
6. **La fiche d'une journée avec un vrai bouton « Enregistrer »** et le motif **sous** les heures, avant le bouton ; un retour clair après.
7. **« Ma journée de travail » du gérant = la même carte que celle du salarié** (une mécanique).
8. **Salarié** : un seul « Ma journée de travail » (dans Ma journée), « Mes heures » = ce mois et la confirmation ; les sept « Ce n'est pas ça » deviennent **une** ligne par jour qu'on touche.
9. **Remonter à l'Accueil** : « Tom n'a pas fermé sa journée », « 3 heures à confirmer ».

### 7.2 Véhicules — « une liste vivante et une fiche courte »
1. **Écran liste** : titre + « ＋ Véhicule » en haut à droite (comme Clients) ; **une ligne par véhicule** : nom + plaque, conducteur, **son seul prochain geste** (« CT dans 12 jours — Noter le contrôle »), état ; **trois chiffres du haut** (« 3 en service sur 4 », « 3 à faire », « 0,23 €/km ») ; onglets **Tous · À faire · Au garage** ; plus de bande séparée ni de classement.
2. **Fiche** (comme Équipe) : en-tête + état en une phrase, **trois chiffres** (kilométrage, coût au km, prochain contrôle), une ligne de liens (Stock du camion, Conducteur, Frais), puis **quatre blocs** : « À faire » (échéances), « Au quotidien » (plein, compteur, souci, à bord), « Papiers » (assurance, CT, documents, amendes, sinistres), « Ce que ça coûte ». L'historique et le matériel de sécurité y passent en **sous-onglets** ou **sous un « Voir le détail »**.
3. **Un seul bouton par échéance** et un libellé **qui dit quoi** (« Noter le contrôle technique », « Noter la révision », « Noter le contrôle du matériel »).
4. **Technicien** : un seul « Mon camion » (onglet du bas) qui réunit compteur, plein, souci **et** stock ; « Ma journée » n'en garde qu'une ligne.
5. **Gérant/secrétaire** : une ligne « Véhicules » à l'Accueil dès qu'une échéance est rouge ; décider si la secrétaire voit Véhicules en lecture + « Noter ».
6. **Ne pas redessiner Dépôts et camions ici** : mais convenir d'**une** frontière — le véhicule porte l'état (papiers, kilomètres, coûts, garage), Dépôts et camions porte le stock — et d'**une** bande « À faire maintenant » par sujet.

### 7.3 Ce qui ne doit rien perdre (liste de non-régression)
Correction d'une heure avec motif obligatoire et trace (avant → après, qui, quand, pourquoi) ; le salarié reconfirme après correction ; clôture à l'heure habituelle (jamais à l'heure qu'il est) ; mois verrouillé ; heures supplémentaires 25 %/50 % (mandataire exclu) ; nuit 21 h–6 h ; repères 10 h / 48 h / 11 h ; semaine à cheval sur deux mois ; rappels 09:30 / 19:00 ; demande du salarié → « Corriger : fin à … » en un geste ; validation en lot avec « Annuler » ; liens vers la Paie, Absences, Planning, Équipe ; côté véhicules : échéance fermée → prochaine proposée → tâche fermée → achat créé ; paliers 7/30/60 jours ou 1 500 km ; assurance de flotte groupée ; compteur qui ne recule pas ; pleins (litres, prix, kilométrage) ; payé de la poche → note de frais ; garage → interventions concernées → pastille au Planning ; amende (désignation avant la date) ; sinistre ; souci → tâche urgente → cloche ; documents ; coût au km ; export CSV ; rappels au conducteur 30/7 jours ; clé de tâche `veh-…` / `vrdv-…` (les tâches ne doublent pas).

### 7.4 Pièges à connaître avant de toucher au code
- Les deux écrans sont des **chaînes d'enveloppes** (`vueVehicules = function(){ return vxPost(v0.apply(…)) }`, `vuePointage` enveloppée 3 fois) : remplacer une couche sans la suivante casse la suivante (par exemple `vxPost` retire un bloc par expression régulière sur le HTML d'origine). La refonte doit **remplacer la chaîne** par une seule fonction, et retirer les `replace()`.
- Les gestes passent par des écouteurs `document.addEventListener('click', …)` **en capture** (pour passer avant l'ancien) : plusieurs écouteurs `[data-pt]`, `[data-ve]`, `[data-vx]`, `[data-ptx]`, `[data-paie]` se partagent les mêmes clés ; un `stopImmediatePropagation` (verrou du mois) en dépend.
- Les sondes du lot final (`scratchpad/proto-final/sondes/menu-*.js`, `menu-visites.js`) et la visite guidée citent ces rubriques ; relire les textes de la visite et du guide après toute refonte.
- Pas de photo ni de fichier téléversé dans le prototype (URL locale `URL.createObjectURL`) ; pas de serveur : tout est mémoire de page.

---

## 8. Ce que je n'ai pas fait / limites de cette étude
- Les captures ont été **lues** sur Mac (jour, nuit), iPhone (jour ; nuit : liste des véhicules et Temps de travail non relus pour toutes les tuiles), iPad (jour). Android, Windows et petit (320) ont été **mesurés** (débordement, cibles, champs, erreurs : `s16.js`) mais leurs captures n'ont pas été relues image par image.
- Je n'ai pas joué la totalité des gestes de la Paie (fiches, DSN, distribution) : hors périmètre ; seul le lien Temps ↔ Paie et le verrou ont été exercés.
- Les chiffres de gestes sont des comptes de taps, pas des chronométrages d'utilisateurs.
- Tout a été joué contre `127.0.0.1`, un seul navigateur à la fois, entreprise fictive.
