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
