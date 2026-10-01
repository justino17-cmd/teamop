# OP MESSAGES — feuille de route (Justin, 1er octobre 2026 au soir : « fais mieux que WhatsApp pour tout » puis « fait tout »)

Chaque lot passe par le même chemin que les étapes déjà faites : construire dans un arbre à part (premier geste : `git reset --hard`
sur la branche de travail), un testeur ADVERSE et le gardien, corrections avec leur scénario de sonde et leur mutation, puis
captures montrées à Justin. Un lot ne démarre que quand le précédent qui touche les MÊMES fichiers est fusionné.
Ce qui coûte de l'argent à chaque usage (SMS, IA, stockage lourd) va dans Messages Pro (15 €) ou derrière un budget.

| Lot | Contenu | Dépend de | Note |
|---|---|---|---|
| 0 (en cours) | Étape 3 Appels (aperçu), formules, interface branchée sur `server-msg`, test à plusieurs personnes | — | |
| 0 bis (en cours) | Inscription par téléphone, tous pays, budgets en euros, contacts par numéro | — | côté serveur |
| A | Toutes les langues : interface + SMS, droite à gauche | 0, 0 bis | écran d'inscription par téléphone avec |
| B | Idée 1 : connexion par clé d'accès (Face ID / empreinte, WebAuthn fait main) ; idée 2 : tous ses appareils, écran « Mes appareils » | A | supprime presque tous les SMS |
| C | Idée 3 : sondages et listes de tâches ; idée 4 : messages programmés, « rappelle-moi » ; idée 5 : fils de réponse et mentions | A | gratuit |
| D | Idée 8 : deux espaces Perso et Pro, heures de travail (droit à la déconnexion) — avec les espaces d'entreprise (étape 5 du serveur : lien de connexion créé par TEAM OP, Messages Pro 15 €, Stripe) | B | ce qui fait payer |
| E | Idée 9 : traduction automatique (Pro) ; idée 10 : vocaux transcrits (Pro) | D, pièces jointes (étape 4) | ⛔ sous-traitance IA écrite AVANT (modèle `sous-traitance.html`, `agent-devis.js`) ; la transcription demande un service de reconnaissance vocale : à choisir avec Justin |
| F | Idée 11 : position en direct limitée dans le temps (Pro) ; idée 12 : export PDF d'une conversation (Pro) | D | |
| G | Idée 6 : réunions visio sans compte pour l'invité. ⛔ Justin, 1er octobre 2026 au soir : « des réunions qui peuvent durer plus d'une heure, elle s'arrête que quand l'admin coupe » — AUCUNE limite de durée dans une formule payante (Zoom coupe à 40 min en gratuit) ; seul l'hôte ou l'administrateur termine | appels (étapes 7-8 du serveur) | c'est ce qui doit justifier les 15 € face à Zoom ; offre détaillée : `OFFRE-PRO.md` (à venir) |
| H | Idée 7 : données en France, sans publicité — textes du site et pages juridiques | — | promesse tenue par l'architecture ; la page se valide avec Justin |

| I | APPLICATIONS DES STORES — Justin, 1er octobre 2026 au soir : « l'application sera sur l'App Store » (et Google Play). La même interface web, enveloppée dans une vraie application (Capacitor ou équivalent, à trancher), plus ce que seul le natif permet : appels qui sonnent comme un vrai appel (CallKit / ConnectionService), carnet d'adresses pour retrouver ses contacts, notifications fiables, Face ID natif | B, appels (étapes 7-8) | ⚠️ Apple refuse une application qui n'est « qu'un site » (règle 4.2) : les fonctions natives sont aussi ce qui la fait accepter. ⚠️ Vendre Messages Pro DANS l'application iPhone = 15 à 30 % pour Apple : on vend sur le site et dans l'espace client, l'application ne fait qu'ouvrir l'accès (règle des services multiplateformes) — à revérifier au moment de publier. ⚠️ La sonnerie en silencieux (alerte critique) demande une autorisation spéciale qu'Apple réserve à la santé et à la sécurité : probablement refusée pour une messagerie. Il faut : compte Apple Developer (99 € par an), compte Google Play (25 $ une fois), un Mac avec Xcode ou un service de compilation en ligne, et la suppression du compte depuis l'application (exigée par Apple). ✅ Justin, même soir : « J'ai les deux » — il a DÉJÀ le compte Apple Developer et un Mac : on compile et on signe chez lui, pas de service en ligne à payer ; reste le compte Google Play. |

Gestes de Justin qui viendront : installer la bêta (`INSTALLER-LE-SERVEUR.md`), compte OVH SMS, ouverture des ports d'appel,
choix du service de reconnaissance vocale, validation des textes juridiques.

## Idées en plus — Justin : « fait tout » (1er octobre 2026 au soir), rangées dans les lots

| Idées | Lot | Note honnête |
|---|---|---|
| 13 boîte partagée, 14 lien/QR « Écrivez-nous », 15 réponses automatiques et accueil, 16 tableau du patron | D (avec les espaces Pro) | ce qui fait payer le Pro ; 14 donne à un client un contact d'entreprise sans compte Perso obligatoire (à cadrer : anti-spam) |
| 17 résumé IA de ce qu'on a raté | E (avec traduction et transcription) | Pro ; sous-traitance IA écrite avant |
| 18 message urgent | F | ⚠️ une application WEB ne peut PAS faire sonner un iPhone en silencieux (pas d'alerte critique hors application native) : on fait une notification prioritaire répétée jusqu'à lecture, plafonnée ; la vraie sonnerie en silencieux viendra avec une application des stores |
| 19 conversations verrouillées par Face ID | B (avec les clés d'accès) | |
| 20 sauvegarde automatique chez nous | déjà par construction (les messages vivent sur notre serveur, sauvegardés hors site : étape 3 du serveur) | à DIRE sur le site et dans l'appli : changer de téléphone ne perd rien |
| 21 gros caractères et fort contraste | A (avec les langues : mêmes écrans repris) | règle aussi le défaut ouvert « le texte ne suit pas la taille du système » |
| 22 envoi à l'heure du destinataire | C (avec les messages programmés) | |
| 23 parrainage | D (avec le paiement Messages Pro) | un mois offert par Stripe (essai prolongé), jamais un code promo écrit dans une page servie |

Liste d'origine (numérotée dans l'ordre de la PROPOSITION ; la table ci-dessus suit l'ordre où Justin les a reprises, qui fait foi) :

13. Boîte partagée pour les entreprises : plusieurs employés répondent aux clients depuis UN contact d'entreprise (Pro) ;
14. lien et QR code « Écrivez-nous » pour les clients d'une entreprise, sans donner de numéro perso (Pro) ;
15. réponses automatiques hors horaires et message d'accueil (Pro) ;
16. résumé IA « ce que tu as raté » dans un groupe chargé (Pro, sous-traitance IA) ;
17. message urgent qui sonne même en silencieux, plafonné (Pro) ;
18. conversations verrouillées par Face ID ;
19. sauvegarde automatique chez nous, sans Google Drive ni iCloud ;
20. parrainage : un mois de Pro offert quand un ami passe au Pro ;
21. mode gros caractères et contraste renforcé ;
22. envoi à l'heure du destinataire (fuseaux horaires) pour les équipes à l'étranger ;
23. tableau du patron : temps de réponse aux clients, messages en attente (Pro).

## Idées 24 à 69 — l'étude des concurrents (Justin : « prends plein d'idées que les autres font, pour gagner le marché »)

Détail, sources et ce qu'il ne faut PAS faire : `VEILLE-CONCURRENCE.md` (lire son encart d'abord : il corrige ce que l'étude
ne savait pas — App Store décidé, connexion par numéro, formules fixées). Rangées dans les lots existants ; les dix marquées ★
sont celles que l'étude met en tête pour le chiffre d'affaires.

| Idées | Lot | Note |
|---|---|---|
| ★24 prix fixe tout compris, sans compteur (IA comprise, avec un plafond ÉCRIT, jamais « illimité ») ; 54 promesse de durée, journal public des changements ; 55 historique gratuit sans limite de jours (plafond de stockage) | H (textes du site) | se tient par l'architecture ; le site attend « remplace le site » |
| ★38 installation guidée + test de notification ; ★39 vrai hors ligne (écrire sans réseau, envoi au retour) | A | pour la version web ; l'application des stores (I) règle le reste |
| ★36 pseudo et QR (en PLUS du numéro) ; 47 inviter sans le carnet d'adresses (lien, QR, partage) ; 48 filtre anti-arnaque (inconnus dans « Demandes ») ; 62 petits raccourcis (non lu, modifier un envoi) | B | 47 se lie au parrainage (23) |
| 42 rapport de lecture (qui a lu une consigne, relance en un clic) ; 43 annonces et listes de diffusion ; 56 éphémères réglés par l'administrateur ; 57 vocal à un appui ; 59 reformuler (« plus poli », « plus court ») ; 60 « transforme en tâche », rappel ; 64 « bravo » entre collègues | C | 59 et 60 passent par la sous-traitance IA (E) |
| ★27 boîte partagée complète (étiquettes, « je prends », notes internes, délai de réponse) ; ★29 réponses rapides « / », horaires, ouvert/fermé ; ★26 formulaires dans la conversation (devis, rendez-vous, photos) ; ★33 salons invités par lien, sans compte ; ★35 relance d'un urgent non lu par courriel ou SMS ; 40 notifications sobres (résumé du jour, heures calmes par groupe) ; 49 checklists métier avec photos et signature ; 50 gros fichiers avec reprise et dossiers par client ; 52 administrateur en 10 secondes, départ d'un employé ; 53 conservation, journal d'audit, export légal ; 63 support humain en français | D | ce qui justifie 15 € plutôt que 3 à 5 € ; 35 a un coût par SMS : budget comme l'inscription |
| ★28 brouillon de réponse IA relu par un humain (quota inclus) ; 44 notes de réunion avec consentement visible ; 45 sous-titres traduits en direct ; 46 recherche intelligente et assistant interne ; 68 choix du moteur IA | E | ⛔ sous-traitance IA écrite avant ; 46 et le chiffrement : à trancher avant de promettre |
| 34 écrire au client par courriel puis SMS depuis la même boîte ; 37 import de l'historique WhatsApp et Slack ; 41 page « Confiance », pastille de chiffrement, bouton « IA coupée » ; 58 sauvegarde chiffrée avec clé d'accès | F | 41 : ne citer aucune certification qu'on n'a pas |
| 61 salle de visio à adresse fixe, audio d'abord ; 65 grandes réunions de 50 à 200 | G | 65 demande un serveur de médias : gros chantier |
| 25 devis ou facture « Accepter / Payer » dans la conversation ; 30 messages automatiques depuis OP GESTION ; 31 suivi de demande par lien, sans compte ; 32 conversation liée à une intervention ou un client | J (nouveau) — lien OP GESTION ↔ OP MESSAGES | notre avantage que personne ne copie ; ⛔ jamais en rebranchant OP MESSAGES sur le socle d'OP GESTION : une liaison volontaire entre deux comptes, conçue à part, après la sortie de Firebase |
| 51 prix d'entrée 5-7 €, remises, tarif « actif du mois » ; 66 pont WhatsApp (frais Meta au message, contraire au prix fixe) ; 69 promesse « jamais de pièce d'identité » | en attente de Justin | 51 change les formules qu'il a fixées ; 66 crée une dépendance à Meta ; 69 demande l'avis d'un juriste |
| 67 coquille native pour les stores | I | ✅ décidée (« l'application sera sur l'App Store », « J'ai les deux ») |

## Idées 70 à 91 — l'offre entreprise (Justin : « que les 15 € soient bien justifiés, pour les entreprises »)

Détail, coûts, marges et les 14 décisions qui attendent Justin : `OFFRE-PRO.md`. ⚠️ Sa recommandation n° 8 change l'ordre :
monter le serveur de visio (LiveKit, étape 10 de `SERVEUR.md`) AVANT d'ouvrir le Pro — sans lui, 4 en vidéo et 6 en audio au plus.

| Idée | Titre | Formule | Lot |
|---|---|---|---|
| 70 | Garde-fous des réunions (salle vide fermée, « Toujours là ? », jamais de coupure d'une vraie réunion, une réunion à la fois par siège) | petite + Pro | G |
| 71 | Compteur d'usage et budget d'heures visibles de l'administrateur, « ce que le Pro vous rapporte » | petite + Pro | G (écran dans D) |
| 72 | Co-hôtes et rapport de présence exportable | Pro | G |
| 73 | Enregistrement en ligne des réunions avec bandeau REC, consentement, conservation réglable, quota puis option | Pro (quota) puis option 4 € | G, après le serveur de visio |
| 74 | Créer une réunion depuis Google Agenda ou Outlook | Pro | G (plus tard) |
| 75 | Visite à distance de chantier : caméra arrière, annotation, capture rangée dans l'intervention OP GESTION | Pro | J |
| 76 | Mode « salle de réunion » (tablette ou écran en continu) | option 5 € par salle | G |
| 77 | Astreinte avec escalade (appel de la personne suivante sans réponse) | Pro | F |
| 78 | Statut de présence métier (en intervention, en route, en pause) | Pro | D puis J |
| 79 | Téléphone perdu ou départ : l'administrateur déconnecte tous les appareils et efface l'appli à distance | Pro | D |
| 80 | Règles de sécurité imposées par l'administrateur (code ou Face ID obligatoire) | Pro | D |
| 81 | Connexion entreprise SAML et SCIM | option | plus tard (après D) |
| 82 | Kit de démarrage par métier (canaux, réponses rapides, checklists nettoyage et anti-nuisibles) | Pro | D |
| 83 | Dossier RGPD prêt à signer pour l'entreprise cliente (sous-traitance, sous-traitants, registre type) | Pro | H |
| 84 | « Remis » vrai : accusé après écriture sur disque, preuves rejouées avant chaque version et publiées | Perso | A |
| 85 | Page d'état publique hébergée hors du serveur, avec message dans l'application pendant une panne | Perso | H |
| 86 | Engagement de disponibilité écrit (99,9 %) avec avoir, seulement quand un second serveur existe | Pro | H (plus tard) |
| 87 | Pack de SMS prépayé (100 SMS pour 12 €) | option | D (avec l'idée 35) |
| 88 | Stockage en plus (100 Go pour 5 € par entreprise) | option | D (avec l'idée 50) |
| 89 | Téléphonie via un partenaire opérateur (numéro d'appel de réunion, numéros pro) | option | plus tard (après le lancement) |
| 90 | Facturation à l'année (10 mois pour 12) et essai de 14 jours du Pro ouvert par TEAM OP | Pro + petite | D |
| 91 | Facturation d'entreprise : factures avec SIRET et TVA du client, prélèvement SEPA, contact de facturation | Pro + petite | D |
