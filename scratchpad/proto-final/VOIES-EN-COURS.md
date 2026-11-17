# Les voies en cours — à relancer après un redémarrage de la machine

Tenu par le chef de chantier à CHAQUE lancement et à chaque fin de voie. Après un redémarrage : pour chaque ligne « en cours »,
lire la dernière étiquette de son journal (`/root/.claude/projects/-home-user-teamop/<session>/subagents/workflows/<run>/journal.jsonl`,
champ `label` : `voie:N:nom` → l'étape N est celle qui a été interrompue, donc `depuis: N-1`), vérifier l'arbre
(`git -C <arbre> status --short` : pas de fusion en cours, pas de verrou), puis relancer par l'outil Workflow,
`scriptPath: scratchpad/proto-final/workflows/voies.js`, avec les arguments de la ligne plus `depuis`.
Relever la machine : `(setsid nohup /home/user/suivi-machine.sh >/dev/null 2>&1 &)`.

État au 17 novembre, 12 h 41 (heure de la machine ; +1 h en France) — vingt-deux voies (la charge suit les QUATRE navigateurs, pas le nombre de voies : 6 à 8 quand les quatre
places sont prises, ce qui est le cas en continu à vingt-deux voies ; ne pas dépasser vingt-deux, et chercher une boucle d'attente
sans pause — `ps -eo pcpu,args --sort=-pcpu | head` — si la charge dépasse 9) :

| Voie | Arguments | Arbre | Dernier lancement (run) | Étape au dernier relevé (8 h 10) |
|---|---|---|---|---|
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
| 12 | session_01PfEEAGeqoAKF68uYCmdAAC | `{voie:"restes", noms:["accueil"], depuis:1}` | 11 h 40 | RENDUE à 12 h 29 (47 min) : restes de l’Accueil, tours 1 et 2 corrigés et recontrôlés — tout tient (182,61 € identique partout), rien de bloquant. VOIE SUIVANTE envoyée à 12 h 29 : `tours:3, depuis:4` (tour 3) avec les décisions du chef : l’argent reçu compte le jour où il est reçu, une seule règle quel que soit le moyen de paiement, deux détails de mise en page |
| 13 | session_01PfEEAGxPVYiib7J7pBKqd8 | `{voie:"restes", noms:["compositeur"], depuis:3}` (recontrôle du tour 2) | 11 h 40 | RENDUE à 12 h 12 : restes du compositeur recontrôlés, tout tient. En cours depuis 12 h 24 : `{voie:"final-rejeu", familles:["metier","hote"], jusqua:0}` |
| 14 | session_01PfEEAH6EH5oLXx7AdRLqBb | `{voie:"final-parcours"}` (une semaine de l'entreprise, d'un rôle à l'autre) | 11 h 41 | |
| 15 | session_01PfEEAJPeoZsFLqAkxREWRW | `{voie:"final-mots"}` | 11 h 41 | |
| 16 | session_01PfEEAGPpBDD97WG3Y3r7PB | `{voie:"final-regard", role:"gerant", rubriques:["Accueil","Statistiques","Historique","Planning","Interventions","Tâches","Absences et congés"], suffixe:"a"}` | 11 h 42 | |
| 17 | session_01PfEEAH7jKCdAdGejGjNbZ9 | `{voie:"final-regard", role:"gerant", rubriques:["Clients","Devis","Contrats","Boîte mail","Comptabilité","Achats et frais"], suffixe:"b"}` | 11 h 42 | |
| 18 | session_01PfEEAJSZRMkBCbs92BLL1i | `{voie:"restes", noms:["planning"], depuis:3}` (recontrôle du tour 2) | 11 h 42 | RENDUE à 12 h 39 (56 min) : Planning, tour 2 recontrôlé — les 4 corrections tiennent, 6 mutations sur 6 ; 4 points ouverts (2 phrases du bandeau, sélecteur de vue sur iPad portrait, en-tête de 320 à 420 px). VOIE SUIVANTE envoyée à 12 h 39 : `tours:3, depuis:4` (tour 3) avec les décisions du chef |
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
| 37 | session_01PfEEAGKe9aa56NXBMnLkg5 | `{voie:"restes", noms:["nuit"], tours:1}` (décision du chef de 12 h 30 : de nuit le bouton principal devient clair, le miroir du jour ; tous les écrans de nuit recapturés et regardés — ligne « (nuit) » de `final/vus-par-le-chef.md`) | 12 h 28 | |
| 38 | session_01PfEEAEjQacyMHRDkuz6SZH | `{voie:"restes", noms:["securite"], tours:2}` (recontrôle de la sécurité rendu à 12 h 41 : 14 failles fermées sur 18, 5 variantes ouvertes dont S01 haute, 4 casses dont une Boîte mail qui jette sur un e-mail sans adresse ; décisions du chef dans sa consigne : nettoyer à l’entrée, échapper à la sortie, jamais les deux) | 12 h 41 | |

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

## ARRÊT DU 17 NOVEMBRE, 13 H 50 (heure française) — À REPRENDRE LE 18 À 22 H 10

Justin : « coupe et tu reprends tout demain à 22 h, plus sûr pour que ça bug pas », puis « et là tu fais le plus important »
(son forfait de la semaine était à 81 %). Toutes les sessions sœurs ont reçu l'ordre d'arrêt : 31 tout de suite, 7 après la fin de
leur étape de CORRECTION (Véhicules et Temps de travail, Équipe, Achats, Clients, espace client, sécurité, bouton de nuit). Chacune
a écrit sa fiche `scratchpad/proto-final/arret/soeur-<n>.md` (args, étape en cours, dernier commit, ce qui reste) puis a été FERMÉE
(`archive_session`). **Le tableau des sœurs ci-dessus est donc de l'histoire : aucune ne tourne.** La reprise est programmée
(`send_later`, 18 novembre 22 h 10, heure française) : relancer chaque voie sur une sœur NEUVE avec les args de sa fiche et le
« depuis » qu'elle indique — la fiche fait foi, la ligne ci-dessous n'en est que le résumé. Ordre de reprise : d'abord les
recontrôles et les restes de Matériel, Véhicules et Temps de travail, Équipe, Achats, la sécurité, le guide, la double
authentification ; puis les autres restes, les regards (regroupés, lus par planches), la voie « retouches », le rejeu final,
`final-rapport`. Sans fiche à l'heure de ce relevé : les sœurs absentes de la liste (voir REPRISE.md).

| Sœur | Args (début de la fiche) | Étape à reprendre (début de la fiche) |
|---|---|---|
| 1 | Args : {"voie":"final-rejeu","familles":["atelier","compositeur","mail","menu","taches"],"depuis":1,"arbre":"/home/user/wt-soeur"} (étape 1 « scripts-de-rejeu » finie et poussée ; décisions du chef ajoutées à vus-par-le-chef.md) | Étape en cours : 2 « rejouer-et-reparer », NON finie (workflow wux4iyqui arrêté par TaskStop vers 12 h 50, après ~25 min). |
| 2 | Args : {"voie":"final-rejeu","familles":["materiel","droits","entreprise"],"arbre":"/home/user/wt-soeur","jusqua":0} — workflow wf_0c36c897-1b8, arrêté par TaskStop ; `depuis` : 0 (l'étape 1 est la seule à avoir tourné). | Étape en cours : 1 « scripts-de-rejeu » (final-rejeu 1/2) — le commit 65c986dd (materiel-tout, droits-tout, entreprise-tout) est poussé, mais le livrable final/rejeu-materiel.json n'existe PAS : étape probablement interrompue avant sa fin, à rejouer. |
| 3 | Args : {"voie":"final-rejeu","familles":["vehtemps","secu","securite","artefact","retour","double"],"arbre":"/home/user/wt-soeur","jusqua":0} (run wf_31b997f8-3f5, depuis = 0). | Étape en cours : voie:1:scripts-de-rejeu, NON finie (agent arrêté en cours de route ; le livrable final/rejeu-vehtemps.json n'existe pas). |
| 4 | Args : {"voie":"final-rejeu","familles":["compta","contrats"],"arbre":"/home/user/wt-soeur","jusqua":0} | Étape en cours : 1 « scripts-de-rejeu » (final-rejeu:1:scripts-de-rejeu), NON finie : interrompue (TaskStop) en cours d'essai ; livrable rejeu-compta.json pas écrit. |
| 5 | 1. Args : {"voie":"final-rejeu","familles":["accueil","technicien","clients","client","interventions"],"arbre":"/home/user/wt-soeur","jusqua":0} — lancée à 11 h 35, workflow stoppé (TaskStop) vers 12 h 50, soit ~1 h 15. | 2. Étape en cours : 1 « scripts-de-rejeu », NON finie (journal : seul « started » écrit, aucun « done » ; livrable rejeu-accueil.json absent). |
| 7 | Args : {"voie":"campagne","cles":["devis-atelier"],"arbre":"/home/user/wt-soeur"} — workflow wf_dfb9ed55-604 arrêté (TaskStop) en cours d'étape. | Étape en cours : 2 « corriger-devis-atelier » (l'étape 1 « tester » est finie : rapport devis-atelier.json, 16 défauts) ; l'étape 2 n'était PAS finie, l'étape 3 « recontrôler » n'a pas commencé. |
| 8 | SŒUR 8 — arrêt du 17/11. Args : {"voie":"double-auth","depuis":3,"arbre":"/home/user/wt-soeur"}. | Étape en cours : 5 « corriger » (double-auth:5:corriger), NON finie — lancée juste après la fin de l'étape 4 « relire-tout » (finie, commit 005b108c : 11 défauts rapportés, ?auto= vérifié). L'étape 6 « recontroler » n'a pas commencé. |
| 9 | Args : {"voie":"retour","depuis":1,"arbre":"/home/user/wt-soeur"} (workflow wf_43c7c0e5-7a4, arrêté par TaskStop). | Étape en cours : 2/« recontroler » (agent retour:2:recontroler), NON finie : il rejouait les sondes retour-calques.js par profil via retour-tout.sh (processus tués à l'arrêt). |
| 10 | 1. Args : {"voie":"campagne","cles":["metier-3d"],"depuis":1,"arbre":"/home/user/wt-soeur"} ; workflow arrêté (TaskStop) ; démarré 11 h 40, arrêté vers 12 h 50 (heure machine), soit ~1 h 10. | 2. Étape en cours : 3 (recontrôle de metier-3d) ; l'étape 2 (corrections) est poussée (1/n et 2/n, mutations M5 à M11) ; l'étape 3 n'est pas finie. |
| 11 | Args : {"voie":"restes","noms":["technicien"],"depuis":1,"arbre":"/home/user/wt-soeur"} ; workflow arrêté (TaskStop) quelques minutes après son lancement, avant tout travail d'agent. | Étape en cours : tour 2 (corrections) de « restes technicien » ; non finie. Le recontrôle adverse du tour 1 (étape 1) n'a pas été rejoué ici. |
| 12 | Args : {"voie":"restes","noms":["accueil"],"tours":3,"depuis":4,"arbre":"/home/user/wt-soeur"} (tour 1 et 2 faits et recontrôlés, wf_04ca6cf4-017 ; tour 3 = wf_030f8b43-7f6, arrêté par TaskStop). | Étape en cours : 5 « corriger-restes-3 » (tour 3), NON finie ; la 6 (recontrôle du tour 3) n'a pas commencé. Pour la reprendre : mêmes args avec "depuis": 4. |
| 13 | Args : {"voie":"final-rejeu","familles":["metier","hote"],"jusqua":0,"arbre":"/home/user/wt-soeur"} ; avant elle : voie « restes » compositeur depuis 3, rendue et poussée (c5418d15). | Étape en cours : « scripts-de-rejeu » (étape 0), NON finie — workflow arrêté (TaskStop) quelques minutes après son lancement ; un travail partiel de `metier-tout.sh` était déjà dans le dépôt (6cd8df45). |
| 14 | Args : {"voie":"final-parcours","arbre":"/home/user/wt-soeur"} (run wf_6559d7f7-abd, arrêté par TaskStop). | Étape en cours : 1 « jouer-la-semaine » — NON finie ; parcours 4, 5, 6 joués et poussés, parcours 7 en cours (sonde parcours-7.js poussée, non jouée jusqu'au bout) ; la phase de recontrôle adverse n'a pas commencé. |
| 15 | Args : {"voie":"final-mots","arbre":"/home/user/wt-soeur"} ; lancée vers 11 h 50, run wf_25f8e13e-0dc, arrêtée par TaskStop (journal : une seule étape, 1 « relire-les-mots »). | Étape en cours : 1/1 « relire-les-mots » — NON finie : l'agent en était au lot « Les mots (5/n) » (dernière correction : « supprimer » pour « effacer »). |
| 16 | Args : {"voie":"final-regard","role":"gerant","rubriques":["Accueil","Statistiques","Historique","Planning","Interventions","Tâches","Absences et congés"],"suffixe":"a","arbre":"/home/user/wt-soeur"} | Étape en cours : 2 « recontroler-regard-gerant-a » (second regard), interrompue ; l'étape 1 « regarder-gerant-a » est FINIE (1 827 captures, ~175 regardées, 12 défauts d'aspect corrigés dans apercu/prototype-op-gestion.html, tête 727ed99e). |
| 17 | Args : {"voie":"final-regard","role":"gerant","rubriques":["Clients","Devis","Contrats","Boîte mail","Comptabilité","Achats et frais"],"suffixe":"b","arbre":"/home/user/wt-soeur"} | Étape : la voie était FINIE (étape 1 « regarder-gerant-b » et second regard « recontroler-regard-gerant-b » rendus) ; aucun workflow ne tournait. |
| 18 | Args : {"voie":"restes","noms":["planning"],"tours":3,"depuis":4,"arbre":"/home/user/wt-soeur"} (relancer avec les mêmes args ; l'étape interrompue est l'étiquette `restes:5:corriger-restes-3`). | Étape en cours : 5 « corriger-restes-3 » (tour 3 du Planning, correction des 4 points) — NON finie ; le recontrôle adverse du tour 3 n'est pas commencé. Étape 4 (recontrôle du tour 2) finie : c6e8c657. |
| 19 | Args : {"voie":"restes","noms":["artefact"],"depuis":1,"arbre":"/home/user/wt-soeur"} (workflow wf_cc710924-bc3, arrêté par TaskStop). | Étape en cours : restes:3 « corriger-restes-2 » (tour 2, correction des casses 1 et 2 du recontrôle du tour 1) — NON finie ; l'étape 2 (recontrôle adverse du tour 1) était rendue. |
| 20 | Args : {"voie":"restes","noms":["coque"],"depuis":2,"arbre":"/home/user/wt-soeur"} | Étape : 2 corriger-restes-2 et 3 recontroler-restes-2 — TOUTES DEUX FINIES, workflow terminé avant l'ordre d'arrêt. |
| 22 | Args : {"voie":"restes","noms":["contrats"],"depuis":1,"arbre":"/home/user/wt-soeur"} (workflow wf_7bedeada-446, arrêté par TaskStop). | Étape en cours : voie « restes » étape 4 « recontroler-restes-2 » (recontrôle adverse du tour 2) — interrompue, NON finie ; le tour 2 de corrections (restes-contrats-tour2.json, 5 corrigées, 1 à soumettre) est fini et poussé. |
| 23 | Args** : `{"voie":"campagne","cles":["achats"],"depuis":1,"arbre":"/home/user/wt-soeur"}` ; décisions du chef ajoutées à `vus-par-le-chef.md` (ada45724). |  |
| 24 | Args : {"voie":"restes","noms":["entreprise"],"tours":1,"arbre":"/home/user/wt-soeur"} ; décisions du chef (12 h 05) ajoutées à vus-par-le-chef.md et poussées avant le lancement. | Étape 1 (restes:1:corriger-restes-1) FINIE et poussée (livrable final/restes-entreprise-tour1.json, 12 entrées) ; étape 2 (restes:2:recontroler-restes-1) INTERROMPUE, non finie, rien d'écrit. |
| 25 | Args : {"voie":"materiel","depuis":8,"arbre":"/home/user/wt-soeur"} (workflow wf_08ca9324-ffe, arrêté par TaskStop ; lancé vers 11 h 55). | Étape en cours : 9 « materiel:9:recontroler » (recontrôle adverse du lot Matériel), NON finie ; l'agent avait écrit son 1er commit à 12 h 31. |
| 27 | Args : {"voie":"restes","noms":["compta-ventes"],"depuis":1,"arbre":"/home/user/wt-soeur"} | Étape en cours : `restes:3:corriger-restes-2` (tour 2 : corriger), NON finie ; le recontrôle adverse du tour 1 (étape 2) a rendu avant. |
| 28 | Args : {"voie":"guide","depuis":1,"arbre":"/home/user/wt-soeur"} (run wf_29b8987d-af0, arrêté par TaskStop quelques minutes après son lancement). | Étape en cours : étape 2 (relecture adverse du guide des nouveautés) à peine commencée, rien de fini ; étapes 3 et 4 non jouées. |
| 29 | Args : {"voie":"restes","noms":["client"],"tours":1,"arbre":"/home/user/wt-soeur"} ; décisions du chef (espace client, 12 h 10) ajoutées à vus-par-le-chef.md et poussées (342617c8). | Étape 1 (correction, `restes:1:corriger-restes-1`) : FINIE ; à reprendre demain : étape 2 (`restes:2:recontroler-restes-1`, recontrôle), relancer avec `"depuis": 1` — le workflow a été arrêté juste après son démarrage. |
| 30 | Args : {"voie":"final-regard","role":"technicien","rubriques":["Ma journée","Mes tâches","Mes congés"],"suffixe":"a","arbre":"/home/user/wt-soeur"} — run wf_b2ee3e3f-e27. | Étape en cours : la toute première, à peine lancée (aucune étiquette `voie:N:nom` écrite au journal) ; non finie, workflow arrêté par TaskStop. |
| 31 | 1. Args : {"voie":"final-regard","role":"gerant","rubriques":["Stock","Fournisseurs, matériel & produits","Dépôts et camions"],"suffixe":"c","arbre":"/home/user/wt-soeur"} (workflow wf_cf654231-f8a, arrêté par TaskStop). | 2. Étape en cours : voie:1 « regarder-gerant-c » — NON finie (un seul agent, interrompu en cours de regard/correction). |
| 32 | Args : {"voie":"final-regard","role":"bureau","rubriques":["Mes tâches","Interventions","Clients","Devis","Contrats","Comptabilité"],"suffixe":"a","arbre":"/home/user/wt-soeur"} (workflow wf_ba133df3-e87, arrêté par TaskStop ; l |  |
| 34 | Args : {"voie":"restes","noms":["interventions"],"tours":1,"depuis":1,"arbre":"/home/user/wt-soeur"} (recontrôle adverse du tour 1 « restes » Interventions). | Étape en cours : l'unique étape de recontrôle, lancée vers 12 h 20 puis arrêtée par TaskStop ; elle n'était PAS finie, aucun fichier recontrôle rendu (pas de restes-interventions-tour1-recontrole.json). |
| 35 | Args : {"voie":"final-regard","role":"gerant","rubriques":["Registre sanitaire","Carte des box","Devis xylophage"],"suffixe":"f","arbre":"/home/user/wt-soeur"} ; workflow wf_0faef581-17f arrêté (TaskStop) en cours d'étape. | Étape en cours : « Regard gérant F (1/n) » ; 1re passe commitée (e5e503ad), étape suivante non finie, 2e passe de regard (n>1) non faite. |
| 36 | Args : {"voie":"final-regard","role":"technicien","rubriques":["Mon camion"],"suffixe":"b","arbre":"/home/user/wt-soeur"} | Étape en cours : 1 « regarder-technicien-b » (agent lancé, arrêté par TaskStop) — NON finie ; aucune capture regardée, aucun défaut corrigé. |
| 37 | Args : {"voie":"restes","noms":["nuit"],"tours":1,"arbre":"/home/user/wt-soeur"} | Étape : « corriger-restes-1 » FINIE (bouton principal de nuit clair, --fill-doux pour les 21 emplois qui ne sont pas un bouton) ; workflow arrêté au démarrage de l'étape 2 « recontroler-restes-1 » → à reprendre demain avec `"depuis":1` (recontrôle adverse, rien d'autre). |
