# PROMPT pour Claude Code (à coller tel quel)

Tu travailles dans le dépôt `justino17-cmd/teamop` (HTML/JS vanilla, PWA). Ce dossier est la référence design complète de TEAM OP : site vitrine, OP GESTION, OP MESSAGES et La Tour, en style Apple (HIG + Liquid Glass) avec les couleurs de chaque logo.

## Ordre de lecture
1. `THEME-GLOBAL.md` — ce qui est commun à tout (mode jour/nuit, verre, typo, rayons, barre d'onglets, statuts, plateformes). Crée des variables CSS partagées à partir de ces valeurs.
2. Un dossier par produit, chacun avec son `THEME-*.md` (couleurs + fonctions + écrans), ses `sources/*.dc.html` (maquettes, à ouvrir avec `support.js` à la racine) et son `builds/*.html` (version autonome à ouvrir dans un navigateur — c'est le rendu cible) :
   - `site/` — teamop.fr (8 pages, menus déroulants, tarifs réels)
   - `opgestion/` — application terrain (+ `README-ECRANS.md` : écrans, composants, états ; `VERSIONS.md` : les 36 versions plateforme × mode)
   - `opmessages/` — messagerie, appels, réunions (groupes, agenda, programmation, parité Zoom, réglages)
   - `tour/` — console patron (gabarit commun : en-tête + 4 chiffres + tableau filtrable ; fiche Entreprise avec lien serveur)
3. `assets/` — logos (TEAM OP, OP GESTION, OP MESSAGES).

## Règles
- Les maquettes sont des maquettes : recrée le rendu avec les patterns du dépôt, ne copie pas le runtime `support.js`.
- Mode jour/nuit : automatique sans bouton pour le site et la Tour ; Jour / Nuit / Auto dans les réglages des apps.
- Verre sur toutes les surfaces ; `prefers-reduced-motion` et `prefers-reduced-transparency` respectés.
- Police système, tailles HIG, rien sous 11 px.
- Les données des maquettes sont des exemples : brancher les vraies (espaces, comptes, interventions, conversations, réunions). Les tarifs et les catégories viennent du dépôt.
- Même compte TEAM OP et même espace entreprise pour toutes les apps ; connexion par lien d'invitation.
- Site : les cadres iPhone / Mac ont des écrans vides — y mettre les vraies captures fournies par Justin.

## Ordre de réalisation
Site (index + tarifs) → OP GESTION (tableau de bord, listes, fiches, « + Créer », Réglages thème/teinte/onglets) → OP MESSAGES (Messages + groupes, Conversation, Appels + écran d'appel, Agenda + Programmer, En réunion, Réglages) → La Tour (gabarit, Surveillance, Entreprises, reste).
Montre-moi jour + nuit, mobile + bureau, à chaque étape.
