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
| G | Idée 6 : réunions visio sans compte pour l'invité | appels (étapes 7-8 du serveur) | |
| H | Idée 7 : données en France, sans publicité — textes du site et pages juridiques | — | promesse tenue par l'architecture ; la page se valide avec Justin |

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

Liste d'origine :

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
