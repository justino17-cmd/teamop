# PROMPT pour Claude Code — OP MESSAGES (à coller tel quel)

Tu travailles dans le dépôt `justino17-cmd/teamop`. Construis l'interface **OP MESSAGES** (messagerie d'équipe : messages, appels, réunions visio type Zoom) en suivant ce dossier.

1. Lis `THEME-OPMESSAGES.md` — couleurs jour/nuit du logo OP MSG, verre, typo HIG, les 5 écrans, les règles par appareil. Crée des variables CSS depuis ces valeurs.
2. Ouvre `builds/opmessages-apple-web.html` dans un navigateur : c'est le rendu cible (8 appareils × jour/nuit × 5 écrans).
3. `sources/OP Messages Apple.dc.html` (+ `support.js`) est la maquette source — recrée le rendu avec les patterns du dépôt, ne copie pas le runtime.

Règles : mode jour/nuit automatique sans bouton ; verre partout, `prefers-reduced-*` respectés ; police système ; rien sous 11 px ; les données des maquettes sont des exemples. Même compte et même espace entreprise qu'OP GESTION ; connexion par lien d'invitation.

Fonctions à livrer (détail dans THEME-OPMESSAGES.md § Fonctions) : groupes façon WhatsApp (création, membres, réglages, notification aux membres) ; appels de groupe audio / vidéo avec caméra activable en cours d'appel ; agenda des réunions avec programmation, invités, rappels et notification « Vous avez été ajouté à une réunion » ; réunion visio avec toutes les commandes listées (partage, participants, sécurité, salle d'attente, réactions, main levée, enregistrement, sous-titres, salles de répartition, sondages, tableau blanc).

Ordre : liste Messages + groupes → Conversation → Appels + écran d'appel → Agenda + Programmer → En réunion. Montre-moi mobile et bureau, jour et nuit, à chaque étape.
