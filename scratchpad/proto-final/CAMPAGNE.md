# La grande campagne de tests du prototype OP GESTION — mode d'emploi du testeur (16 novembre 2026)

Demande de Justin : « je veux que tu revoies tout le prototype OP GESTION, qu'il soit testé par plusieurs personnes comme
s'il était fonctionnel pour les entreprises, sur tout type de plateforme, PC, téléphone ; que tous les boutons
fonctionnent, que chaque bouton emmène au bon endroit, que tout soit compréhensible […] même pour les gens qui ne sont
pas doués avec la technologie. […] Il faut que tout soit parfait. »

Tu es UN testeur, tu as UNE partie. Tu ne corriges rien dans les pages : tu joues, tu mesures, tu regardes, tu rapportes.
D'autres agents corrigeront à partir de ton rapport : il doit se suffire.

## Le terrain
- Page : `apercu/prototype-op-gestion.html` (22 000 lignes, un fichier ; cadres voisins : `prototype-comptabilite.html`,
  `prototype-paiement.html`, `prototype-documents.html`). Entreprise fictive « Clim Services 17 », aucun serveur.
- Tu testes EN MODE APPLICATION (ce que voit un vrai utilisateur) : `lib.ouvrir({profil, qui, nuit})` de
  `scratchpad/proto-final/lib.js` (lis son en-tête). Personnes : `marc` (gérant), `julie` (secrétariat), `sm` (Sophie,
  technicienne), `kb` (Karim, chef d'équipe). Le client s'ouvre depuis le prototype nu (`app:false`) par la bande
  « Tester en tant que » — ou comme le fait le code (cherche `ROLES.client`, `rlChanger`).
- Profils : `mac` et `windows` (ordinateur), `ipad`, `iphone`, `android`, `petit` (320 px). Au doigt sur les quatre
  derniers (`lib.toucher`). Jour ET nuit.
- Le menu et les noms sont ceux de `scratchpad/proto-final/MENU-FINAL.md` ; l'atelier de devis et de contrats est décrit
  dans `scratchpad/proto-final/INTEGRATION.md`.
- Navigateur : 127.0.0.1 uniquement, UN à la fois, au premier plan avec un délai (`timeout 300 node …`). Aucun
  processus chrome laissé derrière toi.

## Ce que tu fais, dans cet ordre
1. **La carte de ta partie.** Lis le code de tes écrans (les fonctions `vueXxx`, leurs fenêtres, leurs feuilles, leurs
   gestionnaires `data-…`). Liste chaque écran, sous-écran, fenêtre, feuille, et comment on y arrive.
2. **Chaque bouton.** Pour chaque écran de ta partie, recense ce qui répond (`lib.gestes`, qui part du DOM — pas d'une
   liste de classes écrite à la main), puis TOUCHE chaque élément, un par un, sur un profil d'ordinateur et un profil de
   téléphone, et vérifie avec `lib.etat` / `lib.change` qu'il FAIT quelque chose et que c'est la bonne chose : le bon
   écran (son titre dit ce que le bouton annonçait), la bonne fenêtre, le bon enregistrement. Compte : touchés / recensés,
   et dis ce que tu n'as pas pu toucher et pourquoi. Remets l'écran d'aplomb entre deux frappes (`lib.ranger`,
   recharger). Un bouton sans nom (ni texte, ni aria-label), un bouton qui ne fait rien, un bouton qui mène ailleurs que
   ce qu'il dit, une impasse (pas de retour), une fenêtre qu'Échap ou la croix ne ferme pas : des défauts.
3. **Les parcours réels** (8 à 12) : ce qu'une personne de l'entreprise fait vraiment dans ta partie, de bout en bout, en
   vérifiant la COHÉRENCE des données d'un écran à l'autre (ce qu'on crée paraît dans les listes, les totaux se
   recalculent juste — recalcule-les toi-même au centime —, l'historique le note, les autres rôles le voient ou non
   selon leurs droits, un rechargement ne casse rien). Joue aussi l'erreur : champ vide, valeur absurde, annuler au
   milieu, double toucher, retour du navigateur, valeurs LONGUES (nom de 60 caractères, « 12 345,67 € », 1523 h 30).
4. **Compréhension.** Relis chaque écran comme un artisan de 55 ans peu à l'aise avec un ordinateur, puis comme un
   technicien sur un chantier, d'une main : mot technique ou anglais, sigle, deux noms pour une même chose, phrase
   trop longue, consigne absente (écran vide qui ne dit pas quoi faire), message d'erreur qui n'explique pas, étape
   inutile, chose introuvable, reste d'échafaudage (« Prototype », « pour l'essai », « Dans ce prototype »).
5. **Mise en page**, sur chaque profil, jour et nuit : aucun glissement latéral (`lib.deborde`, contre la largeur du
   profil), cibles au doigt ≥ 44 px, champs ≥ 16 px (`lib.doigts`), rien sous la barre du bas ni sous l'encoche, texte
   coupé ou écrasé, chevauchement, contraste de nuit. **Regarde tes captures** (outil Read) : une sonde verte ne voit pas
   tout. Captures dans le dossier temporaire qu'on t'indique, jamais dans le dépôt.
6. **Les indices.** Le bas de `MENU-FINAL.md` liste des constats « bloquants » relevés à la lecture du code : vérifie
   ceux de ta partie (confirme ou réfute, mesure à l'appui).

## Ce qui compte comme un défaut — et ce qui n'en est pas un
- Un défaut se rapporte REPRODUIT deux fois (étapes exactes, profil, rôle, jour/nuit) ou PROUVÉ dans le code (ligne).
  Pas de « possible ». Demande-toi d'abord si c'est ta sonde qui se trompe : mesure prise pendant une transition de vue
  (attends `lib.calme`), élément masqué, état que l'application ne produit jamais, capture mal lue, guide des nouveautés
  ou écran de connexion resté devant.
- Ce prototype n'a pas de serveur : « rien n'est envoyé pour de vrai », « les données reviennent au rechargement » ne
  sont PAS des défauts. Un écran qui PROMET quelque chose de faux à l'utilisateur en est un.
- Gravité : **bloquant** (on ne peut pas faire le travail, ou un document / un montant est faux), **gênant** (on y arrive
  mais mal : détour, mot incompris, écran qui saute, bouton trop petit), **détail**.

## Ce que tu rends, et où
- Tes sondes : `scratchpad/proto-final/campagne/sondes/<ta partie>-*.js` (elles serviront au nouveau passage après les
  corrections : écris-les pour qu'elles se rejouent seules, « N ✓ · M ✗ », code de sortie 1 si un contrôle tombe ; un
  contrôle qui tombe sur un défaut que tu rapportes porte le numéro du défaut dans son nom).
- Ton rapport : `scratchpad/proto-final/campagne/<ta partie>.json`, de la forme
  `{ partie, ecrans:[{nom, fonction, acces}], couverture:{ecrans, gestesRecenses, gestesTouches, parcours, profils:[…]},
     nonCouvert:[…], defauts:[{ n:"<partie>-01", gravite, ecran, role, profils:[…], etapes, attendu, constate, preuve, ou:"fichier:ligne ou fonction", correction }] }`.
- Sauvegarde (la machine peut redémarrer) : `git add` de TES seuls fichiers de `scratchpad/proto-final/campagne/`,
  commit en français terminé par les deux lignes d'attribution, `git fetch origin <branche> && git merge --no-edit
  FETCH_HEAD`, `git push origin HEAD:<branche>` — jamais `--force`, jamais une autre branche, jamais `git add -A`.
  Fais-le au milieu de ton travail et à la fin.
