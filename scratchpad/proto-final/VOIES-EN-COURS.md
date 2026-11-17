# Les voies en cours — à relancer après un redémarrage de la machine

Tenu par le chef de chantier à CHAQUE lancement et à chaque fin de voie. Après un redémarrage : pour chaque ligne « en cours »,
lire la dernière étiquette de son journal (`/root/.claude/projects/-home-user-teamop/<session>/subagents/workflows/<run>/journal.jsonl`,
champ `label` : `voie:N:nom` → l'étape N est celle qui a été interrompue, donc `depuis: N-1`), vérifier l'arbre
(`git -C <arbre> status --short` : pas de fusion en cours, pas de verrou), puis relancer par l'outil Workflow,
`scriptPath: scratchpad/proto-final/workflows/voies.js`, avec les arguments de la ligne plus `depuis`.
Relever la machine : `(setsid nohup /home/user/suivi-machine.sh >/dev/null 2>&1 &)`.

État au 17 novembre, 12 h 22 (heure de la machine ; +1 h en France) — vingt-deux voies (la charge suit les QUATRE navigateurs, pas le nombre de voies : 6 à 8 quand les quatre
places sont prises, ce qui est le cas en continu à vingt-deux voies ; ne pas dépasser vingt-deux, et chercher une boucle d'attente
sans pause — `ps -eo pcpu,args --sort=-pcpu | head` — si la charge dépasse 9) :

| Voie | Arguments | Arbre | Dernier lancement (run) | Étape au dernier relevé (8 h 10) |
|---|---|---|---|---|
| securite | `{voie:"securite", depuis:7}` | /home/user/wt-securite | wf_ddbf05bc-b79 (tâche wkrvtuozl) | 8 sur 8 (recontrôler), RELANCÉE à 10 h 29 avec la consigne allégée ; les 18 failles sont corrigées (`securite/corrections.json`) ; les polices du compositeur sont REMISES par décision du chef |
| campagne compta-reste | `{voie:"campagne", cles:["compta-reste"], arbre:"/home/user/wt-t-compta-reste"}` | /home/user/wt-t-compta-reste | wf_6613e191-cd1 (tâche w3hlifa27) | 1 sur 3 |

## Les sessions SŒURS (d'autres machines) — mode d'emploi : `workflows/SESSION-SOEUR.md`

Justin, 17 novembre : « Tu peux pas mettre plus d'agent pour aller plus vite ? ». Sur cette machine non (quatre cœurs) ; une session sœur a la sienne.
Les suivre : `list_sessions {children:true}`, `get_session`, `list_events`. Elles rendent compte par un message « SŒUR n : ».

| Sœur | Session | Voie et args (toujours `arbre:"/home/user/wt-soeur"`) | Lancée | État |
|---|---|---|---|---|
| 1 | session_01PfEEAFnTAeSbLdaDRiaDkW | `{voie:"final-rejeu", familles:["atelier","compositeur","mail","menu","taches"], jusqua:0}` | 11 h 31 | RENDUE à 12 h 23 (51 min) : scripts de rejeu écrits (compositeur 483 ✓ · 0 ✗ ; menu 2 rouges ; tâches 3 rouges — `final/rejeu-atelier.json`). Décisions du chef sur les trois rouges (21 lignes au menu du gérant avec « Sécurité », « Mon compte » permis au pied et en titre de sa page, cases du calendrier sous 44 px écartées en les nommant) envoyées avec la VOIE SUIVANTE à 12 h 24 : mêmes familles, `depuis:1` (rejouer et réparer, premier passage) |
| 2 | session_01PfEEAFqwm1iizSCQmKY7RG | `{voie:"final-rejeu", familles:["materiel","droits","entreprise"], jusqua:0}` | 11 h 34 | |
| 3 | session_01PfEEAF4SpPFViGgXxJDrwQ | `{voie:"final-rejeu", familles:["vehtemps","secu","securite","artefact","retour","double"], jusqua:0}` | 11 h 34 | |
| 4 | session_01PfEEAGMXkbXjCC8u8EMYk6 | `{voie:"final-rejeu", familles:["compta","contrats"], jusqua:0}` | 11 h 34 | |
| 5 | session_01PfEEAEff7UZykLhFfX6Wb5 | `{voie:"final-rejeu", familles:["accueil","technicien","clients","client","interventions"], jusqua:0}` | 11 h 35 | |
| 6 | session_01PfEEAE8QfHePY97Xr11gak | `{voie:"final-rejeu", familles:["coque","planning","restes","recontrole","relire"], jusqua:0}` | 11 h 35 | |
| 7 | session_01PfEEAGsBxUrnuiouVbKSSw | `{voie:"campagne", cles:["devis-atelier"]}` (tester, corriger, recontrôler) | 11 h 35 | |
| 8 | session_01PfEEAELSDwWPCYrhy9m3MJ | `{voie:"double-auth", depuis:3}` (relire, corriger, recontrôler) — la voie d'ici tournait en rond depuis 5 h sur son étape 3, tout était poussé : arrêtée | 11 h 39 | |
| 9 | session_01PfEEAGNDftENMMCD3hfq1L | `{voie:"retour", depuis:1}` (recontrôle) — même cas, 7 h sur l'étape 1 | 11 h 39 | |
| 10 | session_01PfEEAJBAE18M1gy4Csbx7E | `{voie:"campagne", cles:["metier-3d"], depuis:1}` (corriger, recontrôler) | 11 h 39 | |
| 11 | session_01PfEEAGgTY1ef9915HaRiut | `{voie:"restes", noms:["technicien"], depuis:1}` (recontrôle du tour 1, puis tour 2) | 11 h 40 | |
| 12 | session_01PfEEAGeqoAKF68uYCmdAAC | `{voie:"restes", noms:["accueil"], depuis:1}` | 11 h 40 | |
| 13 | session_01PfEEAGxPVYiib7J7pBKqd8 | `{voie:"restes", noms:["compositeur"], depuis:3}` (recontrôle du tour 2) | 11 h 40 | RENDUE à 12 h 12 (31 min) : restes du compositeur, tour 2 recontrôlé — tout tient, 43 ✓, 5 mutations sur 5, rien de bloquant ni de gênant ; trois doutes pour Justin (`final/restes-compositeur-tour2-recontrole.json`). VOIE SUIVANTE envoyée à 12 h 24 : `{voie:"final-rejeu", familles:["metier","hote"], jusqua:0}` |
| 14 | session_01PfEEAH6EH5oLXx7AdRLqBb | `{voie:"final-parcours"}` (une semaine de l'entreprise, d'un rôle à l'autre) | 11 h 41 | |
| 15 | session_01PfEEAJPeoZsFLqAkxREWRW | `{voie:"final-mots"}` | 11 h 41 | |
| 16 | session_01PfEEAGPpBDD97WG3Y3r7PB | `{voie:"final-regard", role:"gerant", rubriques:["Accueil","Statistiques","Historique","Planning","Interventions","Tâches","Absences et congés"], suffixe:"a"}` | 11 h 42 | |
| 17 | session_01PfEEAH7jKCdAdGejGjNbZ9 | `{voie:"final-regard", role:"gerant", rubriques:["Clients","Devis","Contrats","Boîte mail","Comptabilité","Achats et frais"], suffixe:"b"}` | 11 h 42 | |
| 18 | session_01PfEEAJSZRMkBCbs92BLL1i | `{voie:"restes", noms:["planning"], depuis:3}` (recontrôle du tour 2) | 11 h 42 | |
| 19 | session_01PfEEADuTZ1RBxsQwRSgovp | `{voie:"restes", noms:["artefact"], depuis:1}` (recontrôle du tour 1, puis tour 2) | 11 h 52 | |
| 20 | session_01PfEEAF7HxjHJwxpUrQxwkF | `{voie:"restes", noms:["coque"], depuis:2}` (second tour : corriger, recontrôler) | 11 h 53 | |
| 21 | session_01PfEEAFCKLvTVZTQZERUt9t | `{voie:"campagne", cles:["equipe"], depuis:1}` (corriger, recontrôler ; 20 défauts dont 1 bloquant ; deux décisions du chef données dans sa consigne : equipe-11, equipe-13) | 11 h 54 | |
| 22 | session_01PfEEAJ7n54BFrkGM8DYCLn | `{voie:"restes", noms:["contrats"], depuis:1}` (recontrôle du tour 1, puis tour 2) | 11 h 57 | |
| 23 | session_01PfEEAEbusuhCyEHjC2Kj8A | `{voie:"campagne", cles:["achats"], depuis:1}` (corriger, recontrôler ; 13 défauts dont 1 bloquant : la virgule avalée ; cinq décisions du chef données dans sa consigne) | 11 h 58 | |
| 24 | session_01PfEEAGGKUWWuaWr9RUDWGg | `{voie:"restes", noms:["entreprise"], tours:1}` (le recontrôle du lot a rendu à 12 h : 11 réglés sur 13, une casse gênante ; décision du chef : « Voir » seul sur la Boîte mail = lecture seule) | 12 h 01 | |
| 25 | session_01PfEEAJdV1V3V9mH9kzT2vm | `{voie:"materiel", depuis:8}` (recontrôle adverse : 27 corrigés sur 29, technicien-11 à 14 à vérifier) — CHEMIN LE PLUS LONG | 12 h 03 | |
| 26 | session_01PfEEAHX8VDxaNpXNdvLovo | `{voie:"vehtemps", depuis:7}` (corriger, recontrôler ; relecture salarié rendue : 12 défauts dont 1 bloquant ; la relecture gérant a rendu à 12 h 10 : 21 défauts dont 1 bloquant — le bureau ouvre « Ses heures » d'un salarié sans le droit —, fichier `refonte/vehtemps-relecture-gerant.json` poussé (2ae8e87) : le correcteur le reprend à sa prochaine sauvegarde) — CHEMIN LE PLUS LONG | 12 h 03 | |
| 27 | session_01PfEEAEYoMW25Tb5XEZ7wKd | `{voie:"restes", noms:["compta-ventes"], depuis:1}` (recontrôle du tour 1, puis tour 2) | 12 h 03 | |
| 28 | session_01PfEEAHD9WGFD22a8Jo2xqs | `{voie:"guide", depuis:1}` (relire, corriger, recontrôler ; le guide est construit et prouvé) — CHEMIN LE PLUS LONG | 12 h 08 | |
| 29 | session_01PfEEAGyYh9kb2dxeKW7v6z | `{voie:"restes", noms:["client"], tours:1}` (campagne client finie à 12 h 07 : 13 réglés, 2 en partie, 5 casses ; décisions du chef dans sa consigne) | 12 h 11 | |
| 30 | session_01PfEEAJEJjn7GkJkVzqExAL | `{voie:"final-regard", role:"technicien", rubriques:["Ma journée","Mes tâches","Mes congés"], suffixe:"a"}` (les trois autres rubriques du technicien — frais, heures, camion — après leurs corrections) | 12 h 14 | |
| 31 | session_01PfEEAHtyszBWeHthei8qkg | `{voie:"final-regard", role:"gerant", rubriques:["Stock","Fournisseurs, matériel & produits","Dépôts et camions"], suffixe:"c"}` (en même temps que le recontrôle de la sœur 25) | 12 h 14 | |
| 32 | session_01PfEEAEFzaAtuY9Swr9Ssn1 | `{voie:"final-regard", role:"bureau", rubriques:["Mes tâches","Interventions","Clients","Devis","Contrats","Comptabilité"], suffixe:"a"}` (ce qui est propre au bureau ; Achats, Stock, Fournisseurs, Véhicules après leurs corrections) | 12 h 14 | |
| 33 | session_01PfEEAJaRT8KkR1fdFWStSb | `{voie:"restes", noms:["clients"], tours:1}` (campagne clients finie à 12 h 17 : 12 réglés, clients-18 incomplet, 10 casses ; les 5 points « à soumettre » tranchés par le chef, dans sa consigne) | 12 h 17 | |
| 34 | session_01PfEEAFPpeU7baS6TDXPPpZ | `{voie:"restes", noms:["interventions"], tours:1, depuis:1}` (recontrôle du tour 1 : les corrections sont poussées, 14 entrées) | 12 h 18 | |
| 35 | session_01PfEEAE6Dx8R8cDTAgEhREX | `{voie:"final-regard", role:"gerant", rubriques:["Registre sanitaire","Carte des box","Devis xylophage"], suffixe:"f"}` (les trois écrans 3D, et le Registre vu par la technicienne) | 12 h 22 | |
| 36 | session_01PfEEAGt4nyu6bqwDCac1di | `{voie:"final-regard", role:"technicien", rubriques:["Mon camion"], suffixe:"b"}` (reste pour le technicien : Mes frais, Mes heures, après les sœurs 23 et 26) | 12 h 22 | |

RESTE À OUVRIR, dès que leur partie est corrigée : regard final du gérant « c » (Stock, Fournisseurs, Dépôts et camions, Équipe, Temps de travail,
Véhicules, Mon entreprise, Sécurité), du technicien, du bureau, du client ; rejeu des familles `guide`, `metier`, `achats`, `equipe`.
Justin (12 h 50, heure française) : « fais un maximum de sessions sœurs que tu fermeras quand elles auront fini » → `archive_session` dès qu'une
sœur a rendu, que tout est poussé et qu'on n'a pas de voie suivante à lui donner.

Reste à couvrir par un rejeu (familles en cours d'écriture) : `guide`, `metier`, `achats`, `equipe`, `fumee`.

**PASSER LA MAIN À CHAQUE CHANGEMENT D'ÉTAPE** (Justin, 12 h 40 heure française : « Ouvre un maximum […] pour que ça aille beaucoup plus vite ») :
le guetteur `/home/user/guetter-etapes.sh` (outil Monitor, 30 minutes, à RÉARMER) imprime « ÉTAPE · <run> · A → B » dès qu'une voie d'ici
passe à l'étape suivante. À ce moment : (1) TaskStop de la voie d'ici (son nouvel agent vient de démarrer : rien n'est perdu, l'étape d'avant
est poussée) ; (2) `create_session` d'une sœur avec les MÊMES args plus `depuis` = le numéro de la nouvelle étape moins un, et
`arbre:"/home/user/wt-soeur"` ; (3) noter ici. Une voie d'ici qui FINIT (dernière étape) : sa suite (« restes ») se lance sur une sœur.
Une sœur qui a rendu (« SŒUR n : … ») peut recevoir « VOIE SUIVANTE : <args> » par `send_message` plutôt que d'en ouvrir une neuve.
On ne déplace PAS une étape de correction en cours (le travail non poussé de son arbre resterait ici).

La « tâche » entre parenthèses est l'identifiant à donner à TaskStop pour arrêter la voie (retrouvé dans le fil de la conversation :
`grep -o 'Task ID: [a-z0-9]*[^R]\{0,700\}Run ID: wf_[0-9a-f-]*' <fil>.jsonl`).

⚠️ UNE VOIE RESTÉE PLUS DE DEUX HEURES SUR LA MÊME ÉTAPE SE REGARDE (dernières commandes de son agent : le plus récent
`agent-*.jsonl` du dossier du run). Si son livrable est déjà rendu et qu'elle rejoue tout en boucle : l'arrêter (TaskStop) et lancer
l'étape suivante (`depuis`). Et une sonde du chef se lance depuis le dossier des sondes (`cd …/sondes && node fumee-routes.js`) :
un agent qui « nettoie » par motif tue tout ce dont la ligne de commande porte « proto-final/sondes/ » (règle ajoutée aux consignes).

GAGNER UNE HEURE sur `materiel` et `vehtemps` : leurs étapes 6 et 7 sont deux RELECTURES (aucune page modifiée), donc jouables côte à
côte. Dès que la voie passe à l'étape 6 (`/home/user/attendre-etape.sh <run> 6` tourne en fond et prévient) : arrêter la voie
(TaskStop), puis lancer `{voie, depuis:5, jusqua:5}` dans son arbre ET `{voie, depuis:6, jusqua:6, arbre:<arbre libre>}` ; quand les
DEUX ont rendu, lancer `{voie, depuis:7}` (corriger, recontrôler) dans l'arbre de la voie. Même idée pour `guide` : rien à paralléliser.

Arbres LIBRES et propres : /home/user/wt-restes, /home/user/wt-camp-1, /home/user/wt-camp-2, /home/user/wt-t-devis-atelier (créé à 8 h 16 pour la suite) (à remettre sur la branche avant
usage : la consigne de chaque étape le fait). /home/user/wt-t-coque porte un dossier non suivi d'un agent arrêté le 16 : ne pas s'en servir.

Finies : `materiel` relecture « technicien » le 17/11 à 11 h 30 (14 défauts, 4 gênants ; le correcteur les lit) · `vehtemps` étapes 1 à 5 (Temps de travail, Véhicules, Mon camion, voisins, recette) le 17/11 à 10 h 55 · campagne `interventions` le 17/11 à 10 h 32 (16 défauts : 14 corrigés et tenus avec d'autres données ; restent 2 gênants — la garantie parle encore de facture, le filtre « Toutes » caché sur iPad — et des détails, repris par « restes » avec les décisions du chef) · `restes` (mail) le 17/11 à 10 h 18, deux tours : 6 réglés ; RESTENT, tous en téléphone tenu en PAYSAGE ou sur deux bulles qui se croisent (à mettre dans la liste des doutes, un tour de plus seulement s'il reste de la place ce soir) : sur un petit iPhone en paysage (667 × 375, 568 × 320) la barre d'onglets recouvre le bouton « Écrire » de la liste (défaut ancien), le pli de la liste n'est pas repris après un changement de dossier ni après une rotation, la bulle « Annuler l'envoi » passe devant une bulle de l'hôte arrivée après elle — `final/restes-mail-tour2-recontrole.json` · `materiel` étapes 1 à 5 (les six lots construits, recette faite) le 17/11 à 9 h 42 · campagne `compta-ventes` le 17/11 à 9 h 45 (21 défauts dont 6 bloquants : 14 corrigés, 12 tenus, 2 incomplets, 3 neufs ; 7 points tranchés par le chef) · campagne `technicien` le 17/11 à 9 h 28 (8 défauts dont 1 bloquant : 5 corrigés et tenus, 2 tranchés par le chef, 1 reporté ; 4 casses nouvelles reprises par « restes ») · campagne `accueil` le 17/11 à 9 h 20 (10 défauts : 9 corrigés et tenus au recontrôle, 1 décision de Justin ; 3 restes : le bilan PDF dit 3 045 € quand l'Accueil dit 3 085 €, l'argent reçu sur place par le technicien n'écrit rien à l'Historique, le graphique coupe son premier mois au téléphone) · `artefact` le 17/11 à 9 h 10 (8 sondes, 302 ✓ · 0 ✗ au recontrôle ; 2 casses et 12 gestes « non vérifiables d'ici » pour Justin dans `artefact/recontrole.json`) · campagne `contrats` le 17/11 à 8 h 56 (16 défauts : 9 corrigés, 7 tranchés par le chef ; recontrôle : 7 tenus, 5 casses, reprises par « restes ») · `restes` (taches-absences, menu) le 17/11 à 8 h 05, deux tours : 0 pas réglé, 0 cassé, 2 mineurs nouveaux (glisser qui ne prévient pas avant le lâcher ; « fin avant début » ne grise pas le bouton) · la voie « campagne 1 » ARRÊTÉE à 8 h 12 à son étape 7 (taches-absences et coque testées, corrigées, recontrôlées ; ses autres parties ont chacune leur voie) · la voie « campagne 2 » ARRÊTÉE à 6 h 44 après le recontrôle du planning (ses autres parties ont chacune leur voie) · `compositeur` (17/11, 5 h 05 : 14 défauts sur 14 réglés et recontrôlés, 1 casse gênante à 320 px reprise par « restes ») · `menu` (17/11, 1 h 57) · `mail` (17/11, 4 h 45 : 34 défauts réglés, 1 partiel, 5 casses reprises par « restes ») ·
l'étude OP Security (`/home/user/op-security/PLAN.md`).

À lancer ensuite, dans l'ordre, à mesure qu'une place se libère (vingt voies au plus, rien au-dessus d'une charge de 7) :
`restes` pour chaque recontrôle rendu (accueil, contrats, interventions, technicien, compta-ventes, clients, client, compta-reste,
entreprise, metier-3d ; et un tour de plus là où un recontrôle laisse encore quelque chose d'ouvert) · seconde vague RÉDUITE de la
campagne : il ne reste que `devis-atelier` (arbre `/home/user/wt-t-devis-atelier` ; `achats` et `equipe` sont lancées) · `guide` (quand materiel et
vehtemps ont fini leur étape 5) · puis le dernier passage : `final-rejeu` (par groupes de familles), `final-parcours`, `final-mots`,
`final-regard` (par rôle), `final-rapport`.
