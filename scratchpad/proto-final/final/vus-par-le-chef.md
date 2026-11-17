# Vu par le chef de chantier sur ses captures — à corriger par la voie « restes » ou par le dernier passage

Chaque ligne : ce qui a été vu, où, sur quel appareil. Une ligne réglée se coche `[x]` avec le commit ; elle ne s'efface pas.

- [x] (compositeur, restes tour 1 : commit 400cee8 — texte SVG sous `text-rendering:geometricPrecision`, sonde au pixel) **Aperçu d'un devis au téléphone (atelier, « Ton devis, en grand », 100 %)** — iPhone : dans le carré du logo, les
      initiales sont minuscules (« cs » dans un coin) alors que sur Mac on lit « CS 17 » en grand. À mesurer (taille de police
      rendue dans le carré, aux quatre réglages de taille) et à corriger dans `atelier/page.source`.
- [ ] **Stock › Articles au téléphone** — iPhone 390 px : la pastille d'état (« Commandé · arrive le 4/11 ») passe sur deux
      lignes et tasse le nom de l'article sur deux lignes (« Anode / magnésium »). Sous ~430 px, la pastille prend sa propre
      ligne sous le nom.
- [x] **Mes heures** — « Absences : 1 jour (rtt) » : écrire « RTT ». *(restes-1 : `paieAbsTxt` passe par `aTypeBas` ; sonde restes-taches-absences-1.js partie F, mutation F)*
- [x] (TRANCHÉ par le chef le 17/11 à 8 h 20, décision g de `voies.js` : une durée s'écrit collée « 8h05 », comme dans la vraie application et sur une fiche de paie ; « 10 h » dans une phrase ; « 16:47 » pour une heure de la journée — rien à changer) **Les heures** — « 8h05 », « 170h46 », « 40h50 » : la typographie française écrit « 8 h 05 » ; à trancher UNE fois pour
      toute l'application (voie « mots ») et à tenir partout (Temps de travail, Mes heures, Planning, paie).
- [ ] **Boîte mail, bureau** — décision à soumettre à Justin (défaut ordinateur-06) : la secrétaire voit-elle la Boîte mail ?
      Recommandation du chef de chantier : oui, la boîte de l'entreprise seulement, pas la boîte personnelle du gérant.
      (Restes mail, tour 1 : toujours une DÉCISION, rien à corriger côté code — une ligne dans `ROLES.gestion.routes` quand Justin
      tranche ; ligne laissée non cochée exprès. Voir `final/restes-mail-tour1.json`.)
- [x] (compositeur, restes tour 1 : référence avancée à ec8aafd, 56 ✓ · 0 ✗) **Sonde `atelier-seule.js`** — elle compare la page seule « au pixel près » à la Version 11 : les corrections du
      compositeur (prix à deux décimales, aides raccourcies, prestations au catalogue) déplacent des boîtes. À re-baser sur
      l'état corrigé, en gardant la vérification « rien d'autre n'a bougé ».
- [x] (restes coque, tour 1 : commit du lot (5/n), sonde coque-menu-choisie.js, 41 ✓ · 0 ✗ ; la ligne restait à 44 px pendant que le texte en sortait — colonne flex qui défile) **Menu de l'ordinateur (coque, menu, materiel)** — gérant, Mac 1440 × 900, capture du 17/11 à 8 h 15 : l'entrée CHOISIE
      « Fournisseurs, matériel & produits » passe sur TROIS lignes (elle est en gras, donc plus large : non choisie elle tient sur
      deux), et sa troisième ligne (« produits ») est coupée par le pied du menu (Jour · Nuit · Auto) : le menu n'a pas défilé
      assez pour montrer l'entrée entière. Attendu : la même hauteur choisie ou non (le gras ne doit pas changer le retour à la
      ligne), et l'entrée choisie ENTIÈRE dans la zone qui défile. À mesurer sur chaque entrée du menu, les trois rôles, 1280 à
      1440 px de large et 720 à 900 px de haut.
- [ ] **Bandeaux « 2 envois à accepter » (Stock) et « Avant les visites » (Dépôts et camions)** — le rond vide à gauche
      (`.t-etat`, le rond « à faire » des tâches) ressemble à une case à cocher : si on ne peut pas le cocher ici, il trompe.
      À vérifier au doigt et à la souris ; s'il n'agit pas, le remplacer par une icône d'information ou le retirer.
- [ ] **Bandeaux d'alerte teintés** — « Tes factures peuvent partir. Il reste à compléter… » (Mon entreprise, ambre) et
      « 1 compte verrouillé : Léa Roux. » (Équipe, rouge) : de jour sur Mac, la teinte posée sur le verre donne un dégradé
      gris-brun / gris-rose qui paraît terne à côté des cartes blanches. À regarder au pixel (jour et nuit, Mac et iPhone) et à
      éclaircir si le fond réel est bien grisâtre ; ne pas toucher au texte ni au bouton.
- [x] (restes technicien 1 : `VH_EN_REGLE`, « Papiers et entretien : en règle » dans l'en-tête de Mon camion et la ligne de Ma journée, les pièces d'abord quand il en manque ; vehtemps-v5 39 ✓ · 0 ✗) **Mon camion et « Ma journée » de la technicienne (materiel, vehtemps, technicien)** — iPhone et Mac, 17/11 : sous le
      titre « Mon camion », la phrase verte « Tout est en règle. » est posée juste au-dessus de « Il manque à bord · 3 » ; et
      la carte de « Ma journée » dit « Mon camion — Tout est en règle — 3 articles à remettre à bord ». Les deux se
      contredisent pour quelqu'un qui lit vite : « en règle » parle des PAPIERS et de l'entretien du véhicule, pas des pièces.
      Dire ce qui est en règle (« Papiers et entretien : en règle ») ou, s'il manque des pièces, commencer par elles
      (« 3 articles à remettre à bord · papiers en règle »). Une seule fonction pour les deux endroits.
- [ ] (restes contrats, tour 1 : (h) fait sur la page principale et (i) fait pour les contrats, rapides et composés ; (j) numéro de devis et les autres voies : à finir par elles) **Décisions du chef du 17/11, 8 h 55, à APPLIQUER (compositeur, devis-atelier, contrats, mots)** — (h) le mot « atelier »
      ne désigne que le LIEU (le dépôt, dans Matériel). À l'écran, l'endroit où l'on compose un devis ou un contrat ne s'appelle
      plus « l'atelier » : « Composés dans l'atelier » → « Devis composés » ; « Ouverture de l'atelier… » → « Ouverture du
      devis… » (ou « du contrat… ») ; « Composer un devis ouvre l'atelier : … » → « Composer un devis ouvre ton devis en
      grand : … » ; « l'atelier de devis », « l'atelier de contrats » → « la composition du devis », « du contrat ». Recenser
      TOUS les textes d'écran (page principale, `atelier/page.source`, guide, visite parlée, aides, recherche) sans toucher aux
      phrases du dépôt (« J'ai pris à l'atelier »). (i) Un contrat affiche son prix HT et TTC. (j) Supprimer un brouillon de
      devis ne rend pas son numéro.
- [x] (restes planning, tour 2 : appliqué et joué au navigateur sur 7 profils — `final/restes-planning-tour2.json`, sonde `campagne/sondes/restes-planning-2.js` S2 ; « à planifier » et « en retard » restent ceux de toute l'équipe, dit sur l'écran) **Décision du chef du 17/11, 8 h 55, à APPLIQUER (planning)** — (k) les chiffres du bandeau du Planning suivent les
      personnes affichées (Sophie masquée : plus « 9 interventions · 11 h » pour 6 cartes) et le disent quand un filtre est
      posé. Rien d'autre ne bouge sur cet écran validé.
- [x] (restes contrats, tour 1 : tout appliqué et joué au navigateur — `final/restes-contrats-tour1.json`, sonde `campagne/sondes/restes-contrats-1.js`) **Contrats — décisions du chef du 17/11, 9 h, à APPLIQUER (contrats)** : les points que la campagne voulait « soumettre à
      Justin » sont TRANCHÉS (son mandat : « fais tout ce qu'il y a à faire, il faut que tout fonctionne »), sauf mention :
      · **contrats-06** : le PDF que le client lit et signe ne porte plus « Modèle de démonstration, à faire relire avant tout
        usage » : son pied = les coordonnées de l'entreprise. L'avertissement reste, mais côté ENTREPRISE seulement : sous la
        liste des modèles, « Ces modèles sont des exemples : fais-les relire par ton conseil avant de t'en servir. » (à la place
        de « Les modèles seront relus par le juriste… », une phrase d'équipe de développement). Le bouton du haut « Télécharger le
        PDF signé » et son toast « Dans la vraie version… » sont déjà retirés (contrats-12) : vérifier qu'il n'en reste pas.
      · **contrats-07** : À CONSTRUIRE. La fiche d'un contrat dit « Fin le … » dans son en-tête ; un bouton « Renouveler »
        (un an de plus, mêmes conditions, même client : nouvelle échéance, visites de l'année posées « à planifier », une ligne
        à l'Historique ; le courriel de proposition existant reste le premier pas quand le client n'a pas encore dit oui) ; un
        bouton « Mettre fin au contrat » avec une confirmation DANS la page (date de fin = aujourd'hui, les visites non faites
        sortent du planning et le disent, une ligne à l'Historique, plus de relance ni de facture à venir) ; après la dernière
        visite faite (6 sur 6), la fiche PROPOSE la suite. Les droits : les cases de Contrats (créer, modifier, supprimer).
      · **contrats-11** : sous les deux boutons, une phrase : « Contrat rapide : un modèle de ton métier, prêt à envoyer.
        Composer un contrat : le tien, article par article. »
      · **contrats-13** : au téléphone, « Chemin du contrat », « Visites » et « Facturation » passent AVANT le PDF (le PDF
        replié derrière « Lire le contrat », ouvert d'un toucher).
      · **contrats-14** : plus aucune fausse barre d'adresse dessinée (règle du dépôt : « on ne dessine jamais de barre
        d'adresse ») ; côté bureau, une phrase suffit : « C'est la page que ton client ouvre. »
      · **contrats-15** : le mode « chaque mois » AGIT : à la signature, la facture du premier mois se prépare (prix ÷ 12, le
        reste d'arrondi sur le dernier mois) et la carte Facturation liste les douze échéances (la première « préparée », les
        autres « le 1er de chaque mois »). Une option qui ne fait rien est un défaut.
      · **contrats-16** : pas de « Envoyer par e-mail » sous un BROUILLON (il ne ferait pas signer) : « Voir en grand » et
        « Télécharger » seulement ; l'envoi qui fait signer reste le bouton du haut.
      · Doutes du recontrôle, tranchés : une pièce hors contrat posée sur une visite comprise se facture SEULE (casse 2) ;
        le reste d'arrondi du prix d'une visite (1 000 € ÷ 6) est porté par la DERNIÈRE visite, pour que la somme fasse le prix
        du contrat au centime (casse 1) ; les casses 3, 4, 5 du recontrôle se corrigent.
- [ ] **De nuit, le bouton principal ressort à peine (dessin, À SOUMETTRE À JUSTIN — ne rien changer sans lui)** — toute
      l'application, captures du 17/11 (Véhicules, Fournisseurs, Dépôts) : de jour le bouton principal est noir et le secondaire
      blanc ; de nuit les deux sont deux pilules bleu nuit presque pareilles (`--fill:#2c3d63` contre `--surf2` + filet).
      Recommandation : de nuit, le principal en clair (`--fill:#e9eef8; --on-fill:#0b1426`), le miroir exact du jour — une
      ligne de jetons, à essayer sur tous les écrans avant d'adopter (`--fill` sert aussi ailleurs : le recenser).
- [x] (artefact, restes tour 1 : commits efb2eed et 1e42f89 ; sonde artefact-voir-app.js 125 ✓ · 0 ✗, 17 mutations sur 17 ; les deux casses du recontrôle corrigées aussi ; voir `final/restes-artefact-tour1.json`) **Dans l'artefact, le mode application n'est pas atteignable — À CONSTRUIRE (artefact)** — décision du chef du 17/11,
      9 h 15. L'artefact s'ouvre en mode REVUE (la bande « Tester en tant que ») : c'est voulu, Justin y passe d'un rôle à
      l'autre d'un toucher. Mais tout ce qui n'existe qu'en mode APPLICATION (écran de connexion, OP Security, guide à la
      première connexion, aucun échafaudage) lui est invisible : `?app=1` ne passe pas dans un artefact, seul un `#nom` passe.
      À faire, à la source, avec ses sondes dans le bac simulé de l'artefact (`sondes/artefact-bac.js`, la page DANS un cadre,
      sans requête) :
      · dans la bande, un bouton « Voir comme l'application » : il pose l'adresse `#lien-<espace>` (la page sait déjà la lire :
        `MODE_APP`, `opgLien`) ET un drapeau de session rangé sous `try`, puis recharge la page (`location.reload()`). Si le
        rechargement est refusé ou si rien ne se range, le dire (« Impossible ici : ouvre l'adresse … ») sans rien casser ;
      · au démarrage, le drapeau vaut `#lien-…` (l'un OU l'autre suffit) ;
      · en mode application entré par ce bouton, l'écran de connexion porte un lien discret « Revenir au mode test » qui retire
        le drapeau, remet l'adresse nue et recharge ; il n'existe PAS dans la coque (`window.OPG_MODE_APP`) ni avec `?app=1` ;
      · prouver : bouton → écran de connexion ; retour → la bande ; rangement refusé → le `#lien-` seul suffit ; historique
        refusé → pas d'erreur ; mutations qui tombent. Regarder les deux écrans (Mac et iPhone, jour et nuit).
      · les deux casses du recontrôle (`artefact/recontrole.json`) se corrigent aussi : hors artefact et hors cadre verrouillé,
        un cadre voisin sans pont retombe sur le LIEN de téléchargement avec la phrase honnête (« téléchargement demandé ; s'il
        ne démarre pas, ton navigateur le bloque »), comme la page du haut — le texte à copier reste le dernier recours ; et
        chaque `history.replaceState` nu prend son `try` (sept lignes citées).
- [ ] **Artefact : un fichier fabriqué dans un cadre voisin (artefact)** — relu par le chef dans le contrat du pont
      (`downloads.d.ts` 0.2.96 : `data: string | Blob | ArrayBuffer | ArrayBufferView`). Un Blob ou un ArrayBuffer né dans le
      cadre de l'atelier ou de la Comptabilité n'est PAS un « instanceof Blob / ArrayBuffer » de la page du haut, là où vit
      `window.claude` : si le pont teste le type, il répond `bad_request` et rien ne s'enregistre (le doute du recontrôle).
      Règle sûre, à appliquer dans les trois chemins qui passent par `window.parent.claude` : un TEXTE (CSV, FEC) se passe en
      chaîne ; un fichier binaire (PDF, image) se REFAIT avec le constructeur du parent avant l'appel —
      `new window.parent.Blob([await blob.arrayBuffer()], { type })`. Sonde : dans le bac, un pont qui REFUSE tout ce qui
      n'est pas `instanceof` de sa propre fenêtre ; les trois téléchargements des cadres passent quand même.
- [x] (restes technicien 1 : technicien-02, 05, 06 et les quatre casses corrigés, voir final/restes-technicien-tour1.json ; sondes restes-technicien-1.js et -2.js, mutations M1 à M7 qui tombent) **Technicien — décisions du chef du 17/11, 9 h 30, à APPLIQUER (technicien)** : les deux points « à soumettre » de la
      campagne sont tranchés, parce qu'ils ne touchent pas un dessin validé : ce sont les cartes AJOUTÉES par les refontes
      (pointage, Mon camion) qui ont poussé les interventions sous le pli.
      · **technicien-02** : sur « Ma journée », la première intervention du jour doit se voir SANS défiler sur un iPhone
        (aujourd'hui elle commence à y = 832 sur 844 px). Ordre : le bonjour → la carte de pointage, COMPACTE (une phrase et
        son bouton, « J'ai commencé plus tôt » à côté ou dessous en petit) → s'il y en a, une puce d'une ligne « 1 message du
        bureau › » → LES INTERVENTIONS DU JOUR → puis, dessous, les messages du bureau en entier, Mon camion, les habilitations.
        Preuve : sur iphone, android et petit (320 × 568), le haut de la première intervention est au-dessus de la barre du
        bas, pointage commencé ou non, avec ou sans message ; rien d'autre ne change (mêmes gestes, mêmes textes).
        ⚠️ Deux autres voies touchent ces cartes (materiel, vehtemps) : ne change que l'ORDRE et la hauteur de la carte de
        pointage ; fusionne souvent.
      · **technicien-05** : le rappel du matin (« tu n'as pas encore commencé ta journée ») ne se répète pas sur Mes frais ni
        sur Mon camion : il vit sur « Ma journée » (et la pastille de « Heures » le signale ailleurs).
      · Les quatre casses du recontrôle (`campagne/technicien-recontrole.json`) se corrigent : le liseré VERT d'une demande de
        congé REFUSÉE (la couleur suit l'état : refusée = rouge, autres dates = ambre) ; au doigt, le pied du menu (Jour ·
        Nuit · Auto, Nouveautés) à 44 px au moins, tous les rôles ; « C'est quoi ? » n'est plus pré-rempli « Carburant » pour
        un péage ou des gants (le titre du message reprend ce qui est tapé, la plaque seulement pour un plein) ; la fenêtre
        « Il manque encore des choses » sans grands vides. technicien-06 (« Prévenir le bureau » grisé sans raison, Mon
        camion) : à corriger aussi s'il se reproduit encore sur la tête.
- [x] (compta-ventes, restes tour 1 : commits acf640d, 2b473e0 et le suivant, rapport `final/restes-compta-ventes-tour1.json` ; 11, 15, 16, 17, 22 et les cinq casses du recontrôle réglés ; 20 : harnais caché et onglet « exemples », le branchement aux factures d'OP GESTION reste À SOUMETTRE ; 19 : rien changé) **Comptabilité, ventes — décisions du chef du 17/11, 9 h 50, à APPLIQUER (compta-ventes)** : Justin a dit « Comptabilité,
      ça c'est bon » : on ne redessine pas l'écran. Mais ce qui est FAUX, trompeur ou d'échafaudage se corrige :
      · **11** : sur la fiche d'une facture ET sur son PDF, trois colonnes « Prix unitaire HT · Qté · Total HT » (une seule
        fonction pour le total de ligne, celle du total de la facture). « Prix HT » qui veut dire tantôt l'unité, tantôt la
        ligne, n'est pas acceptable sur une facture.
      · **15** : au téléphone, les onglets d'un espace (Ventes : … « Comptes clients », « Contrats » ; Trésorerie : …
        « Paiement en ligne ») ne défilent plus de côté sans indice : ils tiennent sur l'écran (deux lignes s'il le faut).
        Règle du dépôt : une destination qu'on ne voit pas n'existe pas.
      · **16** et **17** : au téléphone seulement, gagner de la hauteur SANS redessiner — la phrase d'explication sur une
        ligne (le reste derrière « Comment ça marche ? »), et sur la fiche d'une facture : plus de fil d'Ariane (la pastille
        Retour suffit), l'encadré « Il manque sur cette facture… » sur une ligne avec son lien, « Voir dans la Comptabilité »
        dans la rangée d'actions. Attendu : le titre « FAC-… » dans le premier écran d'un iPhone.
      · **19** : NE RIEN CHANGER (la porte « Comptabilité » ouvre la fenêtre de la comptabilité : validé). Reste « à
        soumettre » : le nom « OP COMPTABLE » de la fenêtre, différent du mot du menu.
      · **20** : en mode application, « Paiement en ligne » ne montre plus son harnais d'essai (bandeau « PROTOTYPE »,
        « Tests 0 / 25 », « + 1 jour », « + 1 semaine », « Jusqu'au prochain événement », « Recommencer », « Nouvelle facture
        de test », « dans la vraie version… »). Et il montre les factures d'OP GESTION (même message que la Comptabilité,
        `opc_ventes` ; un paiement revient par `opc_paiement`). Si ce branchement ne peut pas être fini PROPREMENT (sondes
        vertes, chiffres égaux au centime avec Ventes), l'onglet dit clairement « Exemples » et on le note « à soumettre ».
      · **22** : au téléphone, un seul bouton de menu par barre visible : le ≡ de la fenêtre de la comptabilité s'efface
        (sa barre du bas « Plus » porte déjà son menu) ; l'heure « 05:55 » est libellée (« Relevé à 05:55 ») ou retirée.
      · Recontrôle (`campagne/compta-ventes-recontrole.json`) : une facture annulée par un avoir FERME ses tâches de relance ;
        une facture encaissée en partie puis annulée dit « 500,00 € déjà reçus : à rembourser » et crée la tâche
        « Rembourser 500,00 € à <client> » (une ligne à l'Historique) ; une facture payée puis annulée se lit « Payée · avoir
        AV-… » dans la fenêtre ; une facture faite à la main prend la TVA par la MÊME fonction que le devis (un particulier
        n'est jamais étiqueté « client professionnel ») ; « Plus bas » et le menu de la fenêtre à 44 px au doigt, iPad compris.
- [x] (chef de chantier, 17/11 à 10 h 30, corrigé par lui-même) **Les treize polices du compositeur avaient disparu (securite, compositeur)**
      — la correction S18 de l'audit de sécurité avait retiré la feuille de polices Google de `atelier/page.source` : les treize
      polices proposées retombaient sur deux polices de l'appareil, donc choisir une police ne changeait plus rien, sur un écran
      validé par Justin. DÉCISION : dans le prototype la feuille RESTE (remise dans `page.source`, page refabriquée), et la
      politique de contenu de CETTE page admet ses deux hôtes (`fabriquer.sh` : fonts.googleapis.com pour la feuille,
      fonts.gstatic.com pour les fichiers). La règle de S18 vaut pour la VRAIE application : les polices s'y serviront depuis
      notre serveur (à redire à Justin dans la liste des doutes). La garde `sondes/securite-statique.js` tient l'état décidé
      (49 ✓ · 0 ✗ ; trois mutations tombent : un troisième hôte, les polices dans une autre page, deux feuilles).
      ⛔ Ne pas la re-retirer : le recontrôle de la sécurité doit lire cette ligne.
- [x] (restes interventions, tour 1 : commits 23c61df et c4a97c1 ; `final/restes-interventions-tour1.json` ; sonde `campagne/sondes/interventions-restes-1.js` 63 ✓ · 0 ✗ sur sept profils, douze mutations qui tombent ; à remarquer : « Terminer » d'une garantie, la case « Un autre passage », « Date à fixer » en gras, les relevés en nombre, le téléphone avec poste, le plafond du prix d'une ligne, tous joués et regardés) **Interventions — décisions du chef du 17/11, 10 h 35, à APPLIQUER (interventions)** :
      · **16** : à la fin d'une intervention, une case générique pour TOUS les clients : « Un autre passage est nécessaire
        (le bureau prépare le devis) » ; « Entretien annuel » n'est cochée d'office que pour un Entretien, une Mise en service
        ou une Installation — jamais après un dépannage ni une garantie (sinon chaque dépannage crée un entretien dans un an).
      · **Garantie** : avant comme après « Terminer », la fiche (technicienne et bureau) dit « Garantie : rien à encaisser,
        aucune facture » à la place du bloc « Paiement sur place » ; plus de « Payé en totalité », d'« Acompte versé » ni de
        « la facture lui sera envoyée ».
      · **05** : la note « ton compte ne peut pas créer, demande à Marc » ne s'écrit sur AUCUN écran de terrain du technicien
        (Ma journée, sa fiche d'intervention) ; la campagne Technicien l'a retirée de quatre écrans : vérifier la fiche.
      · **iPad** : le filtre « Toutes » de la liste se voit sans défiler (libellés plus courts ou retour à la ligne, comme au
        téléphone) ; règle du dépôt : ce qu'on ne voit pas n'existe pas.
      · Détails du recontrôle : « Voir dans Tâches › » et la case « Seulement les techniciens du secteur » à 44 px au doigt ;
        au téléphone « Date à fixer » en gras à la place du tiret ; un relevé n'accepte qu'un nombre (avec virgule) ; un
        téléphone accepte « poste 12 » et refuse plus de 20 chiffres ; une ligne de facture a le même plafond de prix que le
        forfait de création.

- [ ] **Équipe — décisions du chef du 17/11, 12 h (equipe)** : · **equipe-11** : la case « Voir » décide SEULE si la personne voit
      une rubrique ; retirer « Supprimer » à quelqu'un ne lui cache jamais une rubrique qu'il a le droit de voir (aujourd'hui
      « Temps de travail » disparaît sans « Temps de travail › Supprimer », et « Dépôts et camions » sans « Stock › Supprimer ») ;
      et la phrase sous chaque case dit exactement ce qu'elle ouvre. · **equipe-13** : les deux boutons qui changent un mot de
      passe ont deux noms qu'on ne confond pas, avec des mots de tous les jours (plus de « Reposer… ») : « Lui donner un mot de
      passe provisoire » et « Lui envoyer un lien pour choisir le sien » — une seule phrase d'explication sous chacun.

- [ ] **Achats et frais — décisions du chef du 17/11, 12 h (achats)** : · **achats-01 (bloquant)** : la virgule décimale d'une quantité
      ou d'un montant ne s'avale JAMAIS (« 1,5 » vaut 1,5 partout dans l'application, pas seulement ici : chercher les autres champs
      du même genre) ; une valeur illisible est refusée avec une phrase, jamais devinée. · **achats-03** : « La paie du mois »
      (Temps de travail › Mois) porte UNE ligne « Frais à rembourser avec cette paie : Tom 16,50 € · Karim 14,90 € — hors salaire »,
      avec le lien « Voir les notes › » ; les chiffres viennent de la fonction qui fait déjà le relevé de chaque personne.
      · **achats-05** : au téléphone seulement, la première chose à décider se voit sans défiler : plus de tuiles qui répètent les
      chiffres des onglets, la liste d'abord, « Ça se règle dans la Comptabilité » sous la liste, les réglages des notes derrière
      « Réglages › ». · **achats-08** : « Kilomètres : 0,60 € le km (à régler avec ton expert-comptable : le barème dépend de la
      puissance du véhicule) » — plus de « exemple de démonstration ». · **achats-10** : UN mot, « sans justificatif », pour le lien,
      la puce et les lignes ; une note de frais encore à valider ne se compte pas parmi les achats sans justificatif.

- [ ] **Mon entreprise et droits — décisions du chef du 17/11, 12 h 05 (entreprise)** : · **tout-08** : À CORRIGER, ce n'est pas « à soumettre ».
      Une personne qui n'a que « Voir » sur la Boîte mail LIT ses courriels et rien d'autre : écrire, répondre, transférer, archiver,
      supprimer, déplacer, marquer exigent la case qui va avec (un droit qui ne fait rien est un défaut qu'un client signalerait). La
      correction se fait dans l'hôte et dans apercu/prototype-courrier.js (le module du prototype ; opcourrier.js ne se touche pas) :
      les gestes d'écriture ne sont pas proposés, et un geste refusé le dit par la phrase des autres rubriques. · **La casse du
      recontrôle** : au téléphone, le champ refusé d'une feuille se voit toujours, avec son message, au-dessus de la rangée
      « Enregistrer / Annuler » collée en bas (la piste mesurée par le recontrôleur : scroll-padding-bottom de 200 px sous 760 px de
      large). · **tout-11** : après « Facture envoyée toute seule » et « Notes de frais », la barre « Retour · Mon entreprise » reste
      visible. · La fiche « Droits » ne glisse plus de côté à 360 et 320 px (bloc « Mot de passe provisoire »). · Les deux sondes
      périmées (menu avec « Sécurité », sept champs) se mettent à jour sans affaiblir leur contrôle.
- [ ] **Matériel — décisions du chef du 17/11, 12 h 05 (materiel, vehtemps, technicien)** : · **technicien-05** : UN seul mot pour
      les pièces qui ne sont pas dans le camion : « manque à bord » (« Il manque à bord · 3 » sur Mon camion, « 3 articles manquent
      à bord » sur Ma journée et dans Véhicules) ; « à remettre à bord » disparaît partout, sondes et spécification de Véhicules
      comprises (la sonde vehtemps-v5-camion se met à jour, elle ne décide pas du mot). · **technicien-08** : l'unité « u » RESTE
      (c'est celle de la vraie application et d'une facture) : rien à changer, à dire à Justin dans la liste des doutes.
      · Les défauts technicien-11 à 14 de la relecture (dont « Je l'ai pris » qui dit « Envoyé au bureau » sans réseau) n'étaient
      pas dans la liste lue par le correcteur (il en a lu 10 sur 14) : à corriger au tour « restes » s'ils sont encore là.

- [ ] **Espace client — décisions du chef du 17/11, 12 h 10 (client)** : · **client-14** : UNE seule navigation par appareil pour les cinq
      destinations du client (Accueil, Factures, Interventions, Devis, Contrat). Au téléphone : la barre du bas, et plus d'onglets répétés
      dans la page. À l'ordinateur : les onglets de la page, et le menu de gauche ne répète pas les cinq entrées. Les mêmes mots et le même
      ordre partout. · **client-15** : le client voit l'entreprise, pas le logiciel : en haut, le logo ou les initiales de l'entreprise et son
      nom UNE fois (plus de carré « OP », plus de nom répété juste dessous). · **client-11** : la phrase du paiement reste (c'est un
      prototype : aucun argent ne bouge) mais elle vouvoie et se lit simplement : « Démonstration : aucun paiement réel. Dans l'application,
      le paiement se fait sur la page sécurisée de la banque. » · **client-19** : les deux devis presque pareils du client de démonstration
      n'en font plus qu'un. · Les casses du recontrôle se corrigent : plus AUCUN message tutoyé ni de bureau pour le client (les trois écrans
      du métier 3D compris : la garde du rôle passe avant) ; « Demander un contrat » laisse une trace visible côté client (« Demande envoyée
      le … ») et ne crée pas une seconde tâche si on redemande ; un mot très long ne sort pas de sa carte ; « CTR-2026-011 » ne se coupe pas ;
      pour une entreprise cliente, on salue la personne (« Bonjour Mme … ») ou « Bonjour, » — jamais « Bonjour Syndic Foncia ».

- [ ] **Véhicules et Temps de travail — décisions du chef du 17/11, 12 h 25 (vehtemps)** : les cinq « doutes » de la relecture du gérant
      (`refonte/vehtemps-relecture-gerant.json`) ne restent pas « à soumettre », ils s'APPLIQUENT : · **Pas pointé alors qu'une intervention
      tourne** : dans Temps de travail, la ligne d'une personne « Pas encore commencé » qui a une intervention en cours ou terminée aujourd'hui
      le dit (« Une intervention est en cours depuis 08:30, rien n'est pointé »), pour que le gérant sache quoi faire du rappel. · **La semaine
      EN COURS ne se valide pas** : « Valider les N personnes en règle » et « Valider ce qui est en règle » ne prennent que les semaines FINIES ;
      la semaine en cours le dit (« Semaine en cours : elle se valide une fois finie ») et son bouton de validation n'est pas proposé. · **Mois** :
      quand une semaine est à cheval sur deux mois, la feuille de la personne porte une ligne « dont X en octobre », pour que la somme des lignes
      retombe sur le chiffre du haut. · **Assurance payée à l'année** : le chiffre du haut de Véhicules reste ce qui a été PAYÉ dans le mois, et il
      le dit (« payés en octobre (hors taxes) »), avec dessous « dont l'assurance de l'année : 4 200 € » quand une prime annuelle y est ; le coût
      au kilomètre continue de la lisser sur douze mois. · **Deux mots pour un fait** : partout, relevé de la Paie compris, « en plus » (jamais
      « sup. ») et « payée avec novembre » (jamais « se termine en novembre · sur novembre ») — ce sont deux mots à aligner dans un écran validé,
      pas un écran à redessiner.
