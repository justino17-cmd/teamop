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
- [ ] **Menu de l'ordinateur (coque, menu, materiel)** — gérant, Mac 1440 × 900, capture du 17/11 à 8 h 15 : l'entrée CHOISIE
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
- [ ] **Mon camion et « Ma journée » de la technicienne (materiel, vehtemps, technicien)** — iPhone et Mac, 17/11 : sous le
      titre « Mon camion », la phrase verte « Tout est en règle. » est posée juste au-dessus de « Il manque à bord · 3 » ; et
      la carte de « Ma journée » dit « Mon camion — Tout est en règle — 3 articles à remettre à bord ». Les deux se
      contredisent pour quelqu'un qui lit vite : « en règle » parle des PAPIERS et de l'entretien du véhicule, pas des pièces.
      Dire ce qui est en règle (« Papiers et entretien : en règle ») ou, s'il manque des pièces, commencer par elles
      (« 3 articles à remettre à bord · papiers en règle »). Une seule fonction pour les deux endroits.
- [ ] **Décisions du chef du 17/11, 8 h 55, à APPLIQUER (compositeur, devis-atelier, contrats, mots)** — (h) le mot « atelier »
      ne désigne que le LIEU (le dépôt, dans Matériel). À l'écran, l'endroit où l'on compose un devis ou un contrat ne s'appelle
      plus « l'atelier » : « Composés dans l'atelier » → « Devis composés » ; « Ouverture de l'atelier… » → « Ouverture du
      devis… » (ou « du contrat… ») ; « Composer un devis ouvre l'atelier : … » → « Composer un devis ouvre ton devis en
      grand : … » ; « l'atelier de devis », « l'atelier de contrats » → « la composition du devis », « du contrat ». Recenser
      TOUS les textes d'écran (page principale, `atelier/page.source`, guide, visite parlée, aides, recherche) sans toucher aux
      phrases du dépôt (« J'ai pris à l'atelier »). (i) Un contrat affiche son prix HT et TTC. (j) Supprimer un brouillon de
      devis ne rend pas son numéro.
- [ ] **Décision du chef du 17/11, 8 h 55, à APPLIQUER (planning)** — (k) les chiffres du bandeau du Planning suivent les
      personnes affichées (Sophie masquée : plus « 9 interventions · 11 h » pour 6 cartes) et le disent quand un filtre est
      posé. Rien d'autre ne bouge sur cet écran validé.
- [ ] **Contrats — décisions du chef du 17/11, 9 h, à APPLIQUER (contrats)** : les points que la campagne voulait « soumettre à
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
