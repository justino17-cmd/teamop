# OP GESTION par métier — cahier des charges (décisions de Justin, nuit du 22 au 23 octobre 2026)

Source de vérité pour le chantier « métiers ». Cartographie de l'existant : `scratchpad/carte-metiers.md` (packs, masque,
types, relevés, ce qui fuit de l'anti-nuisibles chez les autres) et `scratchpad/carte-demo.md` (la démonstration).

## Ce que Justin a demandé, avec ses mots

- « Je veux que tu fasses bien OP GESTION en fonction des packs métiers qu'on propose. »
- « Dans la Tour, quand le client fait une demande, nous puissions personnaliser l'application avec les catégories qu'il a
  besoin ; il faut faire un système pour moduler l'application par client ; quand un client choisit, qu'il ait bien l'app par
  rapport à son métier. »
- « Sur le site il faudrait faire un système de simulation des applications, qu'ils puissent tester. »
- « Je veux que tu vérifies bien les catégories d'OP GESTION par métier, car là je trouve ça léger : l'anti-nuisible peut
  avoir des fournisseurs. Prends le temps, fais ça bien. »
- « Fais aussi un système : quand ils prennent un abonnement, ils choisissent le métier, et c'est obligatoire ; un système où
  ils cochent les catégories ; et quand ils cochent, que ça explique la catégorie. »
- « Chauffage / climatisation, fais-le aussi. »
- « Rajoute des nouveaux métiers qui auraient besoin de l'application comme ça. »
- Ensuite : « revois tout le style, le design, avec le skill Apple, et les nouvelles fonctionnalités ».

## Ce qui se construit

1. RÉFÉRENTIEL DES MÉTIERS (une seule source, réutilisée partout) : pour chaque métier — existant ou nouveau — les
   rubriques d'OP GESTION utiles (ouvertes par défaut) et pourquoi, les types d'interventions, les relevés et champs
   propres, les prestations, les catégories de produits, les documents, les fonctions propres à créer. Les rubriques se
   jugent métier par métier, sur le travail réel (fournisseurs, bons de commande, stock, véhicules, contrats d'entretien,
   comptabilité…) — jamais un masque recopié d'un métier à l'autre.
2. DESCRIPTION DE CHAQUE RUBRIQUE (« quand ils cochent, que ça explique ») : un titre et 1 ou 2 phrases claires, pour le
   client, par rubrique de NAV ; les mêmes textes dans la page d'abonnement, la Tour et l'application.
3. ABONNEMENT : métier OBLIGATOIRE partout où un abonnement commence (site, espace client, page de paiement) ; le client
   coche ses rubriques (pré-cochées selon son métier, chacune expliquée) ; sa demande porte son choix (liste fermée, validée
   par le serveur) ; la Tour reçoit la demande avec ces cases, Justin ajuste et accepte ; l'application ne montre que les
   rubriques retenues (catégories par client, chantier déjà en cours).
4. LES 13 MÉTIERS ACTUELS ENRICHIS ET DE NOUVEAUX MÉTIERS (recherche à l'appui), y compris leurs pages sur le site
   (`scripts/site-marine.js`, tests/test-835.js).
5. HORS ANTI-NUISIBLES, plus rien de l'anti-nuisibles : « Nuisibles ciblés », « Méthodes », l'étape « Constat » de la clôture
   guidée, les champs N° AMM / matière active / type de traitement, les catégories de produits TP14/TP18…, le « Dossier
   sanitaire », Certibiocide, la colonne CSV « Nuisibles » — chaque métier a ses catégories de produits.
6. CHAUFFAGE / CLIMATISATION COMPLET : parc d'appareils par client (type, marque, modèle, puissance, fluide, charge, mise en
   service, dernière intervention), attestation d'entretien (PDF), fiche d'intervention fluides frigorigènes (type de
   fluide, quantités chargée / récupérée, contrôle d'étanchéité et sa périodicité selon la charge — sans prétendre remplacer
   le Cerfa officiel tant qu'il n'est pas reproduit à l'identique), rappel annuel des contrats d'entretien.
7. DÉMONSTRATION PUBLIQUE (`demo.html`, à part de la bêta, sans réseau ni compte, par métier, non référencée ; OP MESSAGES
   seulement « Bientôt »).
8. PUIS la refonte du design (apple-design + apple-visual-craft), nouvelles fonctions comprises.

Règles qui ne bougent pas : app.html (version publique) et sw.js attendent la phrase de Justin ; tout passe par la bêta ;
les huit étapes de Justin pour chaque partie ; rien ne s'écrit dans les données d'une entreprise au seul chargement
(PACK_METIER_AUTO reste fermé : un pack ne pose ni produits ni fournisseurs tout seul) ; un métier retiré ne supprime aucune
donnée.
