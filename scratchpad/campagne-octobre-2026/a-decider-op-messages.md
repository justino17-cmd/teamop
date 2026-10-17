# OP MESSAGES — améliorations proposées par les testeurs, à trancher avec Justin

Campagne de test de A à Z du 16-17 octobre 2026 (voir `REPRISE.md`). Les testeurs ont proposé ces améliorations en UTILISANT l'application ;
le découpage des lots les a écartées de la correction parce que chacune AJOUTE une fonction ou CHANGE un geste que l'utilisateur connaît — donc
une décision de Justin, pas un correctif. Sauf une part déjà faite que `REPRISE.md` nomme (conversations@1, pro@5, pro@6, salle@10), rien ici n'est commencé. La clé est celle du rapport du testeur (`partie@n`).

83 propositions, rangées par partie de l'application.

## entree (4)

- **entree@3** — Un seul nom : l'onglet du téléphone s'appelle « Accueil », la barre latérale et le titre disent « Tableau de bord ».  
  _Pourquoi à décider :_ Renomme un onglet ou un titre : choix de vocabulaire du produit.
- **entree@4** — Lister les appareils connectés (nom, dernière activité, « Cet appareil ») avec une déconnexion par ligne.  
  _Pourquoi à décider :_ Ajoute une fonction (écran, route, données de session). Doublon de reglages@2.
- **entree@5** — Remettre le logo OP MESSAGES sur les cartes Créer un compte, Vérifie tes e-mails et Mot de passe oublié.  
  _Pourquoi à décider :_ Ajoute un élément visuel, à rebours de la simplification du 15 octobre : question de goût.
- **entree@6** — Refuser (ou retirer) les chevrons < > dans le prénom à l'inscription.  
  _Pourquoi à décider :_ Change ce que l'inscription accepte (page et service) ; ce n'est pas une faille (le prénom est affiché en texte), c'est une règle de saisie.

## conversations (12)

- **conversations@2** — Quand la recherche de la liste ne trouve rien, proposer « Chercher dans les messages ».  
  _Pourquoi à décider :_ Ajoute un geste à la recherche de la liste.
- **conversations@3** — Ajouter « Marquer comme non lu » à côté de « Lu » dans Modifier.  
  _Pourquoi à décider :_ Ajoute une fonction.
- **conversations@4** — Aperçu « Brouillon : … » en rouge dans la liste.  
  _Pourquoi à décider :_ Ajoute un affichage et suppose de garder les brouillons, alors que rien n'est rangé sur l'appareil (voulu, décision écrite).
- **conversations@5** — « Lu par 1 sur 2 » / liste des lecteurs dans un groupe.  
  _Pourquoi à décider :_ Ajoute de l'information sur les accusés de lecture d'un groupe : vie privée, les accusés sont réciproques.
- **conversations@6** — Appui long sur une réaction : qui a réagi.  
  _Pourquoi à décider :_ Ajoute une fonction.
- **conversations@7** — Dire qui a activé les messages éphémères et poser un indicateur permanent dans l'en-tête.  
  _Pourquoi à décider :_ Ajoute un élément permanent dans l'en-tête et un message système.
- **conversations@9** — Griser la tuile « Plus tard » tant que le champ est vide au lieu du toast.  
  _Pourquoi à décider :_ Remplace un retour qui existe déjà (« Écris d'abord ton message ») par un état désactivé : change un geste.
- **conversations@11** — Pastille « ↓ 1 nouveau message » quand on lit plus haut.  
  _Pourquoi à décider :_ Ajoute une fonction.
- **conversations@14** — Neutraliser les caractères de contrôle bidirectionnels (U+202E…) à l'envoi.  
  _Pourquoi à décider :_ Modifie le contenu des messages ; choix de sécurité (à l'envoi ou à l'affichage).
- **conversations@15** — Aligner le maxlength du champ (100 000) sur la limite du service (8 000) ou compter en direct.  
  _Pourquoi à décider :_ Change une habitude : un texte collé de plus de 8 000 signes serait coupé en silence par le champ (en unités UTF-16, jusqu'à couper un émoji) au lieu du message « N signes en trop » qui laisse corriger.
- **conversations@16** — Réunir « Messages éphémères » et le rangement Perso / Pro avec des phrases plus claires.  
  _Pourquoi à décider :_ Regroupe et déplace des réglages des Infos, rangés ainsi le 7 et le 15 octobre.
- **conversations#2** — « Lu 22:50 » devient « Lu » (l'heure disparaît) après un rechargement.  
  _Pourquoi à décider :_ Garder l'heure demande que le service la range (colonne + migration, donnée de vie privée nouvelle) ; sinon il faudrait ne jamais afficher d'heure, ce qui change un affichage voulu (test-911.js:185 l'affirme).

## medias (6)

- **medias@0** — Légende sous l'image dans la visionneuse et agrandir une petite image.  
  _Pourquoi à décider :_ Ajoute une fonction à la visionneuse.
- **medias@1** — Nouveau sondage : focus sur « Question » et rapprocher « Envoyer le sondage ».  
  _Pourquoi à décider :_ Déplace un bouton de la feuille et change le focus d'ouverture.
- **medias@3** — Carte Position : un vrai mini-plan ou un lien vers un plan hors Apple / Windows.  
  _Pourquoi à décider :_ Ajoute une fonction (carte externe : vie privée et politique de sécurité de la page).
- **medias@4** — Même ordre des avatars de votants pour tous.  
  _Pourquoi à décider :_ Change une présentation où « moi d'abord » est peut-être voulu ; aucune décision écrite.
- **medias@6** — Tuile « Caméra » (webcam) aussi sur Mac / Windows.  
  _Pourquoi à décider :_ Ajoute une tuile.
- **medias@8** — Forme d'onde réellement enregistrée et « Écouté » sur les vocaux envoyés.  
  _Pourquoi à décider :_ Ajoute une fonction et un accusé d'écoute (vie privée).

## groupes (7)

- **groupes@0** — Un seul bouton « … » par collègue d'espace (Écrire / Nommer admin / Retirer / Passer la propriété).  
  _Pourquoi à décider :_ Déplace et regroupe des boutons existants.
- **groupes@1** — Masquer « Contacts fréquents » et l'index alphabétique sous ~8 contacts.  
  _Pourquoi à décider :_ Retire des éléments visibles selon le nombre de contacts.
- **groupes@4** — Prévenir quand un groupe change de côté (Perso / Pro), ou le garder là où il était.  
  _Pourquoi à décider :_ Touche la règle de rangement Perso / Pro : produit.
- **groupes@5** — Nom par défaut tiré des membres et nom modifiable depuis les Infos.  
  _Pourquoi à décider :_ Ajoute une fonction (nom par défaut, nom modifiable) ; recoupe groupes#3 du lot m04, qui ne fait que le plus petit geste.
- **groupes@6** — Après « Accepter » dans l'onglet Demandes, ouvrir la conversation.  
  _Pourquoi à décider :_ Change ce qui se passe au toucher (habitude).
- **groupes@8** — Protéger le créateur du groupe (seul lui retire un autre admin) ou confirmer le retrait d'un admin.  
  _Pourquoi à décider :_ Règle de droits des administrateurs.
- **groupes@9** — Option « les nouveaux membres voient l'historique » pour un canal public.  
  _Pourquoi à décider :_ Ajoute une fonction et touche la confidentialité des messages d'un canal.

## contacts (5)

- **contacts@0** — « Supprimer le contact » (et Bloquer) sur la fiche.  
  _Pourquoi à décider :_ Ajoute une fonction.
- **contacts@1** — Demander la confirmation du blocage aussi dans les Demandes de contact.  
  _Pourquoi à décider :_ Ajoute une étape à un geste.
- **contacts@2** — Faire expirer une demande envoyée restée sans réponse (30 jours).  
  _Pourquoi à décider :_ Règle de produit (expiration d'une demande).
- **contacts@7** — Message / Appeler en glissant sur la ligne d'un contact.  
  _Pourquoi à décider :_ Ajoute un geste (glisser sur une ligne).
- **contacts@8** — Titre par défaut « Réunion avec Dan » et focus sur le titre quand on programme depuis une fiche.  
  _Pourquoi à décider :_ Préremplit un formulaire : change l'habitude.

## appels (7)

- **appels@0** — Badge rouge d'appels manqués sur l'onglet Appels.  
  _Pourquoi à décider :_ Ajoute une fonction.
- **appels@1** — Ligne « Appel manqué · 14:02 » dans le fil.  
  _Pourquoi à décider :_ Ajoute une fonction.
- **appels@4** — « Message » (réponse rapide) sur l'appel entrant, et faire du retour / Échap une réduction au lieu d'un refus.  
  _Pourquoi à décider :_ Le refus au retour est documenté « comme avant » (REPRISE.md l.1012) ; changer l'habitude est à Justin. Même question que temps-reel@5 et les bugs écartés appels#4 / temps-reel#3.
- **appels@5** — Choix du micro, de la caméra et de la sortie audio pendant un appel à deux.  
  _Pourquoi à décider :_ Ajoute une fonction.
- **appels@7** — Supprimer une ligne de l'historique des appels ou le vider.  
  _Pourquoi à décider :_ Ajoute une fonction.
- **appels@8** — Dire de quel côté (Perso / Pro) part l'appel quand le contact est ami et collègue.  
  _Pourquoi à décider :_ Touche la règle Perso / Pro.
- **appels@10** — Raccrocher revient à la fiche du contact, pas à la liste.  
  _Pourquoi à décider :_ Change la navigation après un appel.

## salle (8)

- **salle@0** — Au bureau, ancrer les panneaux latéraux au-dessus de la barre ronde et décaler la grille ; au téléphone, panneau translucide.  
  _Pourquoi à décider :_ Déplace des panneaux de la salle, simplifiée le 16 octobre ; la partie « translucide au téléphone » vient du Chromium du banc (verre mal rendu), pas d'un appareil réel.
- **salle@1** — Indice de toucher (chevron ou « … ») aux lignes de participants.  
  _Pourquoi à décider :_ Ajoute un élément à l'écran de la salle simplifié le 16 octobre.
- **salle@5** — Grille de vignettes qui remplit la hauteur en portrait.  
  _Pourquoi à décider :_ Refonte de la mise en page de la salle.
- **salle@6** — Barre ronde à 360 px : une seule rangée, ou ranger « Partager » dans Plus.  
  _Pourquoi à décider :_ Déplace un bouton de la barre ronde ; noté « vu et laissé » dans REPRISE.md du 16 octobre.
- **salle@7** — Compter « Accepté » un invité qui est entré dans la salle.  
  _Pourquoi à décider :_ Change une donnée : un invité entré compterait « Accepté » sans l'avoir dit.
- **salle@8** — Après un rechargement, proposer « Reprendre la réunion ».  
  _Pourquoi à décider :_ Ajoute une fonction.
- **salle@9** — « La salle est pleine » : proposer « Rejoindre en audio » ou « Réessayer ».  
  _Pourquoi à décider :_ Ajoute une action à un refus : règle de capacité.
- **salle@12** — Annoncer qui devient hôte quand l'organisatrice part et quand elle revient.  
  _Pourquoi à décider :_ Ajoute un message ou un événement de salle, et dépend de la règle d'intérim du lot m01 (qui décide qui est hôte) : à reprendre après lui.

## agenda (5)

- **agenda@0** — Annuler ou supprimer UNE date d'une réunion récurrente (« Cette date » / « Toute la série »).  
  _Pourquoi à décider :_ Ajoute une fonction.
- **agenda@1** — Dire de quel côté la réunion tombera chez chacun, ou ranger du côté choisi par l'organisatrice.  
  _Pourquoi à décider :_ Touche la règle Perso / Pro de rangement des réunions.
- **agenda@2** — Séparer « Reporter le rappel » de « Décaler le rendez-vous » ; pas de Reporter sur un rendez-vous dont le rappel n'est pas arrivé.  
  _Pourquoi à décider :_ Sépare ou retire un geste : change une habitude. Voir le lot m15, qui ne le fait pas.
- **agenda@3** — « Toute la journée » : proposer des rappels adaptés (« La veille à 18 h »…).  
  _Pourquoi à décider :_ Change des rappels par défaut.
- **agenda@8** — Garder le brouillon d'une feuille « Nouvel événement » refermée par le retour du navigateur.  
  _Pourquoi à décider :_ Ajoute une fonction (brouillon gardé) alors que rien n'est rangé sur l'appareil.

## pro (6)

- **pro@0** — Proposer « Ranger la conversation dans Pro » après des appels répétés d'un contact non collègue.  
  _Pourquoi à décider :_ Ajoute une fonction et touche la règle Perso / Pro.
- **pro@1** — Garder une réunion Pro en Pro pour les collègues même si un invité externe est ajouté, ou prévenir.  
  _Pourquoi à décider :_ Touche la règle Perso / Pro de rangement des réunions.
- **pro@2** — Retirer ou atténuer les réunions refusées sur l'Accueil et ne pas les compter.  
  _Pourquoi à décider :_ Retire ou atténue des lignes de l'Accueil.
- **pro@3** — Reporter relatif à l'heure du rappel, ou seulement une fois le rappel sonné.  
  _Pourquoi à décider :_ Change ou retire le geste Reporter d'un rappel. Voir le lot m15.
- **pro@7** — Remplacer « Cette fonction fait partie de Messages Pro. » par une vraie sortie (lien d'invitation, bouton Contacter).  
  _Pourquoi à décider :_ Le message sans issue est un choix commercial (qui contacter, comment) ; renvoie à la question ouverte n° 15 de SERVEUR.md.
- **pro@9** — Distinguer un événement du jour sans rappel d'un rappel armé, ou deux intertitres.  
  _Pourquoi à décider :_ Change la présentation du bloc Rappels.

## reglages (8)

- **reglages@0** — Fermer la feuille après « Enregistrer » (ou la transformer en « OK »).  
  _Pourquoi à décider :_ Change une habitude (la feuille se ferme après Enregistrer).
- **reglages@2** — Lister les appareils (nom, dernière activité) avec un bouton Déconnecter par appareil.  
  _Pourquoi à décider :_ Ajoute une fonction. Doublon de entree@4.
- **reglages@4** — Ligne « Mot de passe » (changer le mot de passe) et adresse confirmée dans le Profil.  
  _Pourquoi à décider :_ Ajoute une fonction (changer le mot de passe depuis le Profil).
- **reglages@5** — Réglage de sons (message, appel, sourdine globale) ou dire que le son vient de l'appareil.  
  _Pourquoi à décider :_ Ajoute des réglages de sons.
- **reglages@6** — Heures de travail au format 24 h et état « actuellement dans / hors de tes heures ».  
  _Pourquoi à décider :_ Le format 12 h vient du champ natif et du navigateur de test, pas du code ; seule la ligne « actuellement dans / hors de tes heures » est neuve (ajoute une information).
- **reglages@7** — La recherche par identifiant doit dire « déjà dans tes contacts » même si la personne n'est plus trouvable.  
  _Pourquoi à décider :_ Touche la règle de confidentialité « Me trouver par mon identifiant » (ce qu'un contact peut apprendre).
- **reglages@9** — Stockage : « +25 Go avec Messages Pro », barre colorée au-delà de 90 %, plus gros fichiers.  
  _Pourquoi à décider :_ Ajoute des éléments au stockage (invitation à Pro, liste des gros fichiers).
- **reglages@10** — Masquer ou griser la ligne « Confirmer l'envoi » en mode Perso.  
  _Pourquoi à décider :_ Masque une ligne de réglage selon le côté.

## temps-reel (5)

- **temps-reel@0** — Ranger la file d'envoi et le brouillon sur l'appareil (IndexedDB) et la rejouer au rechargement.  
  _Pourquoi à décider :_ Contredit la décision écrite « rien n'est rangé sur l'appareil, c'est voulu » (l.~6070).
- **temps-reel@1** — Garder le brouillon non envoyé par conversation et l'afficher dans la liste.  
  _Pourquoi à décider :_ Contredit la même décision écrite ; ajoute aussi un affichage dans la liste.
- **temps-reel@4** — Remplacer la bande « Connexion perdue » par une pastille avec « Réessayer maintenant » et le nombre de messages en attente.  
  _Pourquoi à décider :_ Change le rôle de la bannière hors ligne (bouton, compteur) : le lot m07 la repose seulement sans masquer.
- **temps-reel@5** — Le retour arrière pendant la sonnerie ne refuse plus l'appel : ignoré, ou réduit en bannière.  
  _Pourquoi à décider :_ Le refus au retour pendant la sonnerie est documenté (REPRISE.md l.1012). Même question que appels@4.
- **temps-reel@7** — Dire que la pastille Pro compte des conversations, et la faire apparaître sur l'avatar.  
  _Pourquoi à décider :_ Change ce que compte la pastille Pro et ajoute une pastille sur l'avatar.

## appareils (4)

- **appareils@0** — Mettre « Organisateur » sous le titre dans la liste du jour.  
  _Pourquoi à décider :_ Déplace une information de la liste du jour.
- **appareils@1** — Plus de largeur au nom de la conversation : heure et chevron sur la ligne du dessous, ou « à l'instant ».  
  _Pourquoi à décider :_ Change la disposition de la liste des conversations.
- **appareils@3** — Agenda mois iPad : titre avant l'heure dans une case étroite.  
  _Pourquoi à décider :_ Change la disposition de la case d'un jour.
- **appareils@4** — Compacter l'en-tête de conversation en paysage (hauteur < 500 px).  
  _Pourquoi à décider :_ Change la disposition de l'en-tête en paysage.

## securite (6)

- **securite@1** — Feuille dédiée « Ana t'invite dans le groupe… — Rejoindre / Refuser » pour un lien d'invitation de groupe.  
  _Pourquoi à décider :_ Ajoute un écran dédié au lien d'invitation d'un groupe.
- **securite@2** — Rendre l'exclusion réversible (« Réadmettre »).  
  _Pourquoi à décider :_ Ajoute une fonction ; le lot m01 empêche seulement un intérimaire de poser une exclusion irréversible.
- **securite@3** — Rendre à un membre ré-ajouté l'historique qu'il avait avant son retrait, ou le lui dire.  
  _Pourquoi à décider :_ Change ce que voit un membre ré-ajouté (confidentialité de l'historique).
- **securite@4** — Ne pas afficher « Ton compte est en cours de suppression » à un visiteur non connecté arrivé par ?m=suppression.  
  _Pourquoi à décider :_ La page ne sait pas si la session existe avant de parler de la suppression : ne l'afficher que si le service le confirme change le parcours des liens du courriel.
- **securite@5** — « Mes contacts seulement » par défaut pour « Me trouver par mon identifiant », ou choix à l'inscription.  
  _Pourquoi à décider :_ Change un défaut de confidentialité : produit.
- **securite@6** — Mentions @ : prénom + initiale, ou pastille distincte, quand deux membres partagent le même premier mot.  
  _Pourquoi à décider :_ Change l'insertion des mentions @.
