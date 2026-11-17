# Les voies en cours — à relancer après un redémarrage de la machine

Tenu par le chef de chantier à CHAQUE lancement et à chaque fin de voie. Après un redémarrage : pour chaque ligne « en cours »,
lire la dernière étiquette de son journal (`/root/.claude/projects/-home-user-teamop/<session>/subagents/workflows/<run>/journal.jsonl`,
champ `label` : `voie:N:nom` → l'étape N est celle qui a été interrompue, donc `depuis: N-1`), vérifier l'arbre
(`git -C <arbre> status --short` : pas de fusion en cours, pas de verrou), puis relancer par l'outil Workflow,
`scriptPath: scratchpad/proto-final/workflows/voies.js`, avec les arguments de la ligne plus `depuis`.
Relever la machine : `(setsid nohup /home/user/suivi-machine.sh >/dev/null 2>&1 &)`.

État au 17 novembre, 9 h 44 (heure de la machine ; +1 h en France) — vingt-deux voies (la charge suit les QUATRE navigateurs, pas le nombre de voies : 6 à 8 quand les quatre
places sont prises, ce qui est le cas en continu à vingt-deux voies ; ne pas dépasser vingt-deux, et chercher une boucle d'attente
sans pause — `ps -eo pcpu,args --sort=-pcpu | head` — si la charge dépasse 9) :

| Voie | Arguments | Arbre | Dernier lancement (run) | Étape au dernier relevé (8 h 10) |
|---|---|---|---|---|
| materiel, relecture bureau | `{voie:"materiel", depuis:5, jusqua:5}` | /home/user/wt-c-materiel | wf_55c0b805-ea3 (tâche wa9qi3dra) | étape 6 sur 9, SEULE (lancée à 9 h 45) |
| materiel, relecture technicien | `{voie:"materiel", depuis:6, jusqua:6, arbre:"/home/user/wt-restes"}` | /home/user/wt-restes | wf_3985ff31-51c (tâche wh56p34r4) | étape 7 sur 9, SEULE, côte à côte avec la précédente (lancée à 9 h 45). QUAND LES DEUX ONT RENDU : lancer `{voie:"materiel", depuis:7}` (corriger, recontrôler) dans /home/user/wt-c-materiel |
| vehtemps | `{voie:"vehtemps"}` | /home/user/wt-c-vehicules-temps | wf_2b1326f9-4dc (tâche wkzibxa6z) | 5 sur 9 (Mon camion véhicule, voisins, recette) |
| entreprise | `{voie:"entreprise"}` | /home/user/wt-entreprise | wf_d48d52bb-f55 (tâche woax1c3di) | 7 sur 8 (corriger) |
| securite | `{voie:"securite"}` | /home/user/wt-securite | wf_c59af0fe-bf3 (tâche wx9juj4s7) | 7 sur 8 (corriger : 17 failles confirmées) |
| double-auth | `{voie:"double-auth"}` | /home/user/wt-double-auth | wf_f90564b0-275 (tâche w4dugueuh) | 3 sur 6 |
| restes (artefact) | `{voie:"restes", noms:["artefact"], arbre:"/home/user/wt-artefact"}` | /home/user/wt-artefact | wf_23f6a788-f10 (tâche w4gmon24x) | 1 sur 4 (lancée à 9 h 15 : bouton « Voir comme l'application », fichiers nés dans un cadre, deux casses du recontrôle) |
| retour | `{voie:"retour"}` | /home/user/wt-retour | wf_a81c7b71-04c (tâche wbja7hic2) | 1 sur 2 |
| restes (mail) | `{voie:"restes", noms:["mail"], arbre:"/home/user/wt-c-mail"}` | /home/user/wt-c-mail | wf_a21861bd-55e (tâche wmc503kyq) | 3 sur 4 (tour 2, corriger) |
| restes (compositeur) | `{voie:"restes", noms:["compositeur"], arbre:"/home/user/wt-atelier"}` | /home/user/wt-atelier | wf_6c0f850c-5cd (tâche wvbc2b9g3) | 2 sur 4 (tour 1, recontrôler) |
| restes (planning) | `{voie:"restes", noms:["planning"], arbre:"/home/user/wt-t-planning"}` | /home/user/wt-t-planning | wf_d6496cc1-e84 (tâche wq7rc642j) | 1 sur 4 |
| restes (coque) | `{voie:"restes", noms:["coque"], arbre:"/home/user/wt-t-taches-absences"}` | /home/user/wt-t-taches-absences | wf_e863236e-f53 (tâche w5lp74p1n) | 1 sur 4 (lancée à 8 h 13) |
| campagne interventions | `{voie:"campagne", cles:["interventions"], arbre:"/home/user/wt-t-interventions"}` | /home/user/wt-t-interventions | wf_f053dfa7-004 (tâche wmr7wmbah) | 3 sur 3 (recontrôler) |
| campagne clients | `{voie:"campagne", cles:["clients"], arbre:"/home/user/wt-t-clients"}` | /home/user/wt-t-clients | wf_9eac0989-473 (tâche wunwkw7f8) | 2 sur 3 |
| restes (technicien) | `{voie:"restes", noms:["technicien"], arbre:"/home/user/wt-t-technicien"}` | /home/user/wt-t-technicien | wf_0dacc07c-2e5 (tâche wpk1p75h1) | 1 sur 4 (lancée à 9 h 32) |
| restes (accueil) | `{voie:"restes", noms:["accueil"], arbre:"/home/user/wt-t-accueil"}` | /home/user/wt-t-accueil | wf_e75a2c3e-5c8 (tâche wvg0ij15m) | 1 sur 4 (lancée à 9 h 22) |
| restes (contrats) | `{voie:"restes", noms:["contrats"], arbre:"/home/user/wt-t-contrats"}` | /home/user/wt-t-contrats | wf_52f09861-809 (tâche wux16bxgi) | 1 sur 4 (lancée à 9 h 05 ; applique aussi les décisions du chef sur les sept points « à soumettre », dans `final/vus-par-le-chef.md`) |
| restes (compta-ventes) | `{voie:"restes", noms:["compta-ventes"], arbre:"/home/user/wt-t-compta-ventes"}` | /home/user/wt-t-compta-ventes | wf_3718062f-7bd (tâche wwf12gpep) | 1 sur 4 (lancée à 9 h 52) |
| campagne compta-reste | `{voie:"campagne", cles:["compta-reste"], arbre:"/home/user/wt-t-compta-reste"}` | /home/user/wt-t-compta-reste | wf_6613e191-cd1 (tâche w3hlifa27) | 1 sur 3 |
| campagne client | `{voie:"campagne", cles:["client"], arbre:"/home/user/wt-t-client"}` | /home/user/wt-t-client | wf_161f5d3d-d34 (tâche w2w2augv0) | 2 sur 3 |
| campagne metier-3d | `{voie:"campagne", cles:["metier-3d"], arbre:"/home/user/wt-t-metier-3d"}` | /home/user/wt-t-metier-3d | wf_394daf2a-530 (tâche wy3c5wjkm) | 1 sur 3 (lancée à 8 h 13) |
| campagne achats | `{voie:"campagne", cles:["achats"], arbre:"/home/user/wt-t-achats"}` | /home/user/wt-t-achats | wf_360ed1f4-c72 (tâche wungi95kj) | 1 sur 3 (RELANCÉE à 9 h 05 : la première attendait ses sondes par une boucle qui occupait un cœur entier ; règle ajoutée aux consignes) |
| campagne equipe | `{voie:"campagne", cles:["equipe"], arbre:"/home/user/wt-t-equipe"}` | /home/user/wt-t-equipe | wf_450ca06e-2ba (tâche w8r7kndyx) | 1 sur 3 (lancée à 8 h 46) |

La « tâche » entre parenthèses est l'identifiant à donner à TaskStop pour arrêter la voie (retrouvé dans le fil de la conversation :
`grep -o 'Task ID: [a-z0-9]*[^R]\{0,700\}Run ID: wf_[0-9a-f-]*' <fil>.jsonl`).

GAGNER UNE HEURE sur `materiel` et `vehtemps` : leurs étapes 6 et 7 sont deux RELECTURES (aucune page modifiée), donc jouables côte à
côte. Dès que la voie passe à l'étape 6 (`/home/user/attendre-etape.sh <run> 6` tourne en fond et prévient) : arrêter la voie
(TaskStop), puis lancer `{voie, depuis:5, jusqua:5}` dans son arbre ET `{voie, depuis:6, jusqua:6, arbre:<arbre libre>}` ; quand les
DEUX ont rendu, lancer `{voie, depuis:7}` (corriger, recontrôler) dans l'arbre de la voie. Même idée pour `guide` : rien à paralléliser.

Arbres LIBRES et propres : /home/user/wt-menu, /home/user/wt-camp-1, /home/user/wt-camp-2, /home/user/wt-t-devis-atelier,
/home/user/wt-guide (créés à 8 h 16 pour la suite) (à remettre sur la branche avant
usage : la consigne de chaque étape le fait). /home/user/wt-t-coque porte un dossier non suivi d'un agent arrêté le 16 : ne pas s'en servir.

Finies : `materiel` étapes 1 à 5 (les six lots construits, recette faite) le 17/11 à 9 h 42 · campagne `compta-ventes` le 17/11 à 9 h 45 (21 défauts dont 6 bloquants : 14 corrigés, 12 tenus, 2 incomplets, 3 neufs ; 7 points tranchés par le chef) · campagne `technicien` le 17/11 à 9 h 28 (8 défauts dont 1 bloquant : 5 corrigés et tenus, 2 tranchés par le chef, 1 reporté ; 4 casses nouvelles reprises par « restes ») · campagne `accueil` le 17/11 à 9 h 20 (10 défauts : 9 corrigés et tenus au recontrôle, 1 décision de Justin ; 3 restes : le bilan PDF dit 3 045 € quand l'Accueil dit 3 085 €, l'argent reçu sur place par le technicien n'écrit rien à l'Historique, le graphique coupe son premier mois au téléphone) · `artefact` le 17/11 à 9 h 10 (8 sondes, 302 ✓ · 0 ✗ au recontrôle ; 2 casses et 12 gestes « non vérifiables d'ici » pour Justin dans `artefact/recontrole.json`) · campagne `contrats` le 17/11 à 8 h 56 (16 défauts : 9 corrigés, 7 tranchés par le chef ; recontrôle : 7 tenus, 5 casses, reprises par « restes ») · `restes` (taches-absences, menu) le 17/11 à 8 h 05, deux tours : 0 pas réglé, 0 cassé, 2 mineurs nouveaux (glisser qui ne prévient pas avant le lâcher ; « fin avant début » ne grise pas le bouton) · la voie « campagne 1 » ARRÊTÉE à 8 h 12 à son étape 7 (taches-absences et coque testées, corrigées, recontrôlées ; ses autres parties ont chacune leur voie) · la voie « campagne 2 » ARRÊTÉE à 6 h 44 après le recontrôle du planning (ses autres parties ont chacune leur voie) · `compositeur` (17/11, 5 h 05 : 14 défauts sur 14 réglés et recontrôlés, 1 casse gênante à 320 px reprise par « restes ») · `menu` (17/11, 1 h 57) · `mail` (17/11, 4 h 45 : 34 défauts réglés, 1 partiel, 5 casses reprises par « restes ») ·
l'étude OP Security (`/home/user/op-security/PLAN.md`).

À lancer ensuite, dans l'ordre, à mesure qu'une place se libère (vingt voies au plus, rien au-dessus d'une charge de 7) :
`restes` pour chaque recontrôle rendu (accueil, contrats, interventions, technicien, compta-ventes, clients, client, compta-reste,
entreprise, metier-3d ; et un tour de plus là où un recontrôle laisse encore quelque chose d'ouvert) · seconde vague RÉDUITE de la
campagne : il ne reste que `devis-atelier` (arbre `/home/user/wt-t-devis-atelier` ; `achats` et `equipe` sont lancées) · `guide` (quand materiel et
vehtemps ont fini leur étape 5) · puis le dernier passage : `final-rejeu` (par groupes de familles), `final-parcours`, `final-mots`,
`final-regard` (par rôle), `final-rapport`.
