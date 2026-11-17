# Menu final du prototype OP GESTION — ce qui est DÉCIDÉ (16 novembre 2026)

Demande de Justin : « revois toutes les catégories, qu'elles soient bien logiques, simples, rapides, efficaces à
comprendre pour tout le monde, même pour les gens qui ne sont pas doués avec la technologie ».
Source : trois propositions indépendantes (l'artisan novice, le changement minimal et fidèle, une seule logique pour
tous les rôles et appareils), une synthèse, trois critiques adverses (décisions de Justin, novice, faisabilité).
Ce fichier tranche. Ce qui contredirait une décision explicite de Justin N'EST PAS appliqué (liste en bas).

## Règles
1. Un mot du menu est un mot que l'artisan emploie. Aucun sigle (CRM), aucun anglicisme (Boxes), aucune abréviation
   à point (« Interv. »), aucune esperluette dans un nom NEUF (« Fournisseurs, matériel & produits » garde la sienne :
   c'est son nom du 6 novembre).
2. Un groupe ne porte jamais exactement le nom d'une de ses lignes. Aucun groupe d'une seule ligne.
3. Les mêmes rubriques portent les mêmes noms, les mêmes icônes et vivent dans les mêmes groupes pour tous les rôles.
   Un rôle voit MOINS de lignes, jamais d'autres mots.
4. Ordinateur : colonne de gauche. Téléphone : barre du bas (5 onglets au plus) + un bouton « Menu » en haut à gauche
   (trois traits ET le mot « Menu »), pour TOUS les rôles, qui ouvre la feuille « Menu » (la liste complète, puis le pied).
   L'onglet « Plus » disparaît partout. Le bouton « Mon compte » des autres rôles se fond dans le pied de la feuille « Menu ».
5. Une seule table (CATS) nourrit le menu de l'ordinateur, la feuille « Menu », la recherche, la barre personnalisable
   et les raccourcis. Les menus par rôle s'en déduisent par filtre ; plus de chaînes écrites à la main par rôle.
6. Le mode application (MODE_APP) et le prototype nu montrent le MÊME menu ; seul l'échafaudage de revue diffère.

## Menu du gérant (profil Administrateur)
- (bloc du haut, sans titre) : **Accueil** · **Statistiques** · **Historique**
- **Travail** : Planning · Interventions · Tâches · Absences et congés
- **Clients et ventes** : Clients · Devis · Contrats · Boîte mail
- **Argent** : Comptabilité (avec, en petit gris sous le nom : « Factures, paiements, paie ») · Achats et frais (en petit gris : « Demandes de l’équipe » — 17 novembre 2026, voie entreprise étape 4 : une ligne qui dit ce qu'on y trouve)
- **Matériel** : Stock · Fournisseurs, matériel & produits · Dépôts et camions
- **Personnel** : Équipe · Temps de travail · Véhicules · Mon entreprise (17 novembre 2026, voie entreprise étape 4 : ce que le gérant règle UNE fois, ici ; le gérant seul pour l'instant, la case « L'entreprise et l'équipe » viendra à l'étape des droits)
- **Hygiène anti-nuisibles (3D)** — seulement si le pack 3D est pris : Registre sanitaire · Carte des box · Devis xylophage
- Pied : Jour / Nuit / Auto · Nouveautés · (téléphone) Personnaliser la barre du bas · Se déconnecter (mode application)

Barre du bas du gérant au téléphone (destinations inchangées, celles que Justin a vues le 12 novembre) :
Accueil · Planning · Interventions · Clients · Comptabilité. Mots ENTIERS s'ils tiennent, MESURÉ à 320, 360 et 390 px
(police réduite jusqu'à 10 px permise) ; si un mot ne tient pas sans être coupé : le mot court SANS point (« Compta »,
« Interv ») est interdit pour « Interventions » — préférer deux lignes — et toléré pour « Compta », avec le nom entier
en aria-label. Jamais de texte coupé.
Le gérant garde « Personnaliser la barre du bas » (appui long ou pied de la feuille Menu).

## Menu du bureau (rôle « gestion » : secrétariat, responsable)
- **Travail** : Mes tâches · Interventions
- **Clients et ventes** : Clients · Devis · Contrats
- **Argent** : Comptabilité (même petit gris) · Achats et frais
- **Matériel** : Stock · Fournisseurs, matériel & produits — DÉCIDÉ le 16 novembre (mandat de Justin, `refonte/MATERIEL.md` § 4) et
  appliqué par le lot Matériel : le bureau prépare les commandes, il voit donc le stock et les fournisseurs ; il n'a PAS
  « Dépôts et camions ». Les sondes du menu attendent ce groupe chez le bureau.
- **Personnel** : Véhicules — DÉCIDÉ le 17 novembre (mandat de Justin, `refonte/VEHICULES-TEMPS.md` § 11, recommandation appliquée) : le bureau lit, note un plein,
  un rendez-vous, un contrôle et met au garage ; seul le gérant crée, modifie, change de conducteur, note une amende. C'est la SEULE exception à la règle 2
  (un groupe d'une seule ligne) : À SOUMETTRE À JUSTIN. La case « Temps de travail et véhicules » de l'Équipe la ferme. « Temps de travail » reste fermé au bureau
  (donnée de salaire). Les sondes du menu attendent ce groupe chez le bureau.
- Pied : Jour / Nuit / Auto · Nouveautés · Se déconnecter
- Barre : Comptabilité · Devis · Clients · Tâches · Achats (5 onglets, pas 6 ; pas d'émoji dans un libellé)
- ⛔ **17 novembre 2026, étape 5 de la voie entreprise : ce menu SE DÉDUIT des cases d'Équipe** (`droitVoit`, `ROUTE_DROIT`) — le Secrétariat a donc DIX lignes (les sept validées, Stock et Fournisseurs, Véhicules), le Responsable les vingt du gérant en lecture. Voir `refonte/MON-ENTREPRISE-ET-DROITS.md` § 8.
- Au téléphone, le bureau ouvre sur la Comptabilité en plein écran : le bouton « Menu » (trois traits et le mot) y reste
  visible à côté de « ‹ OP GESTION », comme sur tous les écrans — DÉCIDÉ le 17 novembre (le menu était à deux gestes).
- Le logo « OP GESTION » ramène à l'écran d'ouverture du rôle, pour tous les rôles.

## Menu du technicien
- (sans titre) : Ma journée · Mes tâches · Mes frais · Mes heures · Mon camion · Mes congés
- **Hygiène anti-nuisibles (3D)**, seulement si le pack 3D est pris : Registre sanitaire
- Pied : Jour / Nuit / Auto · Nouveautés · Se déconnecter
- Barre : Journée · Frais · Heures · Tâches · Camion (inchangée ; les noms entiers « Ma journée »… en aria-label)
- « Mes congés » : le technicien voit SES soldes et SES demandes, et peut en faire une (écran vueAbsencesTech, à faire
  lire sur la personne connectée et non sur un technicien fixe) ; l'interrupteur « Prototype · voir l'écran comme »
  disparaît du mode application. Le bureau (gestion) n'a pas la validation des congés : c'est le gérant.

## Client (espace client)
- (sans titre) : Accueil · Mes factures · Mes interventions · Mes devis · Mon contrat
- Barre du bas au téléphone : Accueil · Factures · Devis · Interventions · Contrat

## Comptable (ouvert depuis sa fiche Équipe) : inchangé.

## Renommages (ancien → nouveau), partout où l'ancien s'affiche (menu, surtitres, titres, feuille, recherche, guide, visite, droits)
- Tableau de bord (groupe et rubrique) → Accueil
- CRM, Ventes, Communication (groupes) → Clients et ventes
- Planification, Interventions (groupes) → Travail
- Stock (groupe) → Matériel ; Boxes (rubrique) → Dépôts et camions (la route `boxes` ne change pas)
- Temps & équipe, Administration (groupes) → Personnel
- Achats → Achats et frais
- Absences & congés → Absences et congés
- Mes notes de frais / Mes frais et demandes (technicien) → Mes frais
- Métier 3D (groupe) → Hygiène anti-nuisibles (3D)
- Toutes les catégories (feuille) → Menu (⚠️ trois gestionnaires reconnaissent la feuille à son titre)
- Paiements et encaissements (recherche, droits) → Paiements ; « Équipe et réglages » (droits) → Équipe
- Boutons de création : « ＋ Nouveau client », « ＋ Nouvelle intervention », « ＋ Nouveau contrat » (là où il reste),
  « ＋ Nouvelle absence », « ＋ Nouvelle tâche », « ＋ Nouvelle note de frais » — une seule règle.
  « Composer un devis », « Devis rapide », « Composer un contrat », « Contrat rapide » ne changent pas.

## Ce qui sort du menu
- « Ce que voit le client » : plus de ligne ; on y va par la fiche d'une intervention et la fiche client (la route reste).
- L'onglet « Plus », le doublon « Mes tâches » en tête de la feuille, le bouton « Mon compte ».

## Échafaudage : rien de tout cela ne paraît en mode application
Bande « Tester en tant que », pastilles « faite »/« plus tard », page « À refaire », bandeau « Prototype : rien n'est
enregistré », phrases « Dans ce prototype… », interrupteurs « Prototype · voir l'écran comme » et « simuler la réponse »,
boutons « (pour l'essai) ». Une adresse inconnue ramène à l'écran d'ouverture du rôle avec « Cette page n'existe pas. ».
Le choix Jour / Nuit / Auto se retient d'une ouverture à l'autre. Hors mode application (prototype nu, pour l'équipe),
l'échafaudage reste, mais le menu est le même.

## Les routes ne changent pas
Les clés (`accueil`, `boxes`, `achats`…) restent : favoris, barre personnalisée et adresses déjà en mémoire continuent de marcher.

## NON appliqué — soumis à Justin (16 novembre, sans réponse à ce jour)
1. Une ligne « Factures » au menu (porte vers Comptabilité › Factures) : contredit « une seule catégorie au menu » (7 novembre).
2. Un écran « Mon entreprise » (fiche légale, logo, horaires, rendez-vous en ligne, boîtes mail) : écran neuf.
3. ✅ Le menu de chaque personne déduit de ses cases « Voir » dans Équipe (responsable ≠ secrétariat) : FAIT le 17 novembre 2026 (étape 5), et les cases Créer / Modifier / Supprimer agissent aussi.

## Constats de la lecture du code à vérifier pendant la campagne de tests (annoncés bloquants, non contre-vérifiés)
- Un client créé à la main n'a pas de position : la carte des tournées le place au dépôt et Waze/Plans y envoient le technicien.
- Le technicien et le bureau ne peuvent pas demander un congé (route absente) — traité par « Mes congés » ci-dessus.
- Aucun appareil ni second site modifiable dans la fiche client.
- « ＋ Ajouter une ligne » d'une facture crée une « Ligne libre » qu'on ne peut ni nommer ni supprimer.
- Un contrat créé puis signé n'a pas de date de fin : Statistiques et Tâches plantent ; ses visites ne se facturent pas au prix du contrat.
- Le module « Paiement en ligne » n'est pas relié aux factures d'OP GESTION.
- Le rôle bureau n'a pas Stock / Produits alors que sa fiche le promet ; les cases Créer / Modifier / Supprimer d'Équipe n'agissent pas.
- Accès : mot de passe provisoire unique affiché, « Envoyer un lien » qui n'envoie rien (prototype sans serveur).
- « Registre sanitaire » montré au technicien d'une entreprise sans pack 3D.
