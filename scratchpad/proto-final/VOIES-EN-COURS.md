# Les voies en cours — à relancer après un redémarrage de la machine

Tenu par le chef de chantier à CHAQUE lancement et à chaque fin de voie. Après un redémarrage : pour chaque ligne « en cours »,
lire la dernière étiquette de son journal (`/root/.claude/projects/-home-user-teamop/<session>/subagents/workflows/<run>/journal.jsonl`,
champ `label` : `voie:N:nom` → l'étape N est celle qui a été interrompue, donc `depuis: N-1`), vérifier l'arbre
(`git -C <arbre> status --short` : pas de fusion en cours, pas de verrou), puis relancer par l'outil Workflow,
`scriptPath: scratchpad/proto-final/workflows/voies.js`, avec les arguments de la ligne plus `depuis`.
Relever la machine : `(setsid nohup /home/user/suivi-machine.sh >/dev/null 2>&1 &)`.

État au 17 novembre, 4 h 55 (heure de la machine ; +1 h en France) — dix-huit voies à 5 h 06 :

| Voie | Arguments | Arbre | Dernier lancement (run) | Étape au dernier relevé |
|---|---|---|---|---|
| materiel | `{voie:"materiel"}` | /home/user/wt-c-materiel | wf_cb393850-8a2 | 4 sur 9 (Fournisseurs) |
| vehtemps | `{voie:"vehtemps"}` | /home/user/wt-c-vehicules-temps | wf_2b1326f9-4dc | 4 sur 9 (Véhicules : les feuilles) |
| restes (compositeur) | `{voie:"restes", noms:["compositeur"], arbre:"/home/user/wt-atelier"}` | /home/user/wt-atelier | wf_6c0f850c-5cd | 1 sur 4 (lancée à 5 h 06) |
| campagne compta-ventes | `{voie:"campagne", cles:["compta-ventes"], arbre:"/home/user/wt-t-compta-ventes"}` | /home/user/wt-t-compta-ventes | wf_af182308-28c | 1 sur 3 (lancée à 5 h 06) |
| entreprise | `{voie:"entreprise"}` | /home/user/wt-entreprise | wf_d48d52bb-f55 | 6 sur 8 (relire-tout) |
| securite | `{voie:"securite"}` | /home/user/wt-securite | wf_c59af0fe-bf3 | 4 sur 8 (angle courrier) |
| double-auth | `{voie:"double-auth"}` | /home/user/wt-double-auth | wf_f90564b0-275 | 2 sur 6 |
| campagne 1 | `{voie:"campagne", cles:["taches-absences","coque","interventions","clients","compta-ventes","technicien"], arbre:"/home/user/wt-t-taches-absences"}` | /home/user/wt-t-taches-absences | wf_f557ebb1-250 | 4 sur 18 (tester-coque) — À ARRÊTER quand la coque est recontrôlée (étape 6 finie) : interventions, clients, technicien ont leur propre voie |
| campagne 2 | `{voie:"campagne", cles:["planning","accueil","contrats","compta-reste","client","metier-3d"], arbre:"/home/user/wt-t-planning"}` | /home/user/wt-t-planning | wf_11b524c0-52a | 3 sur 18 (recontroler-planning) — À ARRÊTER quand le planning est recontrôlé : accueil, contrats ont leur propre voie |
| restes (taches-absences, menu) | `{voie:"restes", noms:["taches-absences","menu"], arbre:"/home/user/wt-restes"}` | /home/user/wt-restes | wf_093360a1-be3 | 1 sur 4 |
| artefact | `{voie:"artefact"}` | /home/user/wt-artefact | wf_0f3ab435-044 | 1 sur 2 |
| restes (mail) | `{voie:"restes", noms:["mail"], arbre:"/home/user/wt-c-mail"}` | /home/user/wt-c-mail | wf_a21861bd-55e | 1 sur 4 |
| retour | `{voie:"retour"}` | /home/user/wt-retour | wf_a81c7b71-04c | 1 sur 2 |
| campagne interventions | `{voie:"campagne", cles:["interventions"], arbre:"/home/user/wt-t-interventions"}` | /home/user/wt-t-interventions | wf_f053dfa7-004 | 1 sur 3 |
| campagne clients | `{voie:"campagne", cles:["clients"], arbre:"/home/user/wt-t-clients"}` | /home/user/wt-t-clients | wf_9eac0989-473 | 1 sur 3 |
| campagne technicien | `{voie:"campagne", cles:["technicien"], arbre:"/home/user/wt-t-technicien"}` | /home/user/wt-t-technicien | wf_fa6ce9b9-e53 | 1 sur 3 |
| campagne accueil | `{voie:"campagne", cles:["accueil"], arbre:"/home/user/wt-t-accueil"}` | /home/user/wt-t-accueil | wf_a77cf25d-3ce | 1 sur 3 |
| campagne contrats | `{voie:"campagne", cles:["contrats"], arbre:"/home/user/wt-t-contrats"}` | /home/user/wt-t-contrats | wf_8d381f43-df8 | 1 sur 3 |

Finies : `compositeur` (17/11, 5 h 05 : 14 défauts sur 14 réglés et recontrôlés, 1 casse gênante à 320 px reprise par « restes ») · `menu` (17/11, 1 h 57) · `mail` (17/11, 4 h 45 : 34 défauts réglés, 1 partiel, 5 casses reprises par « restes ») ·
l'étude OP Security (`/home/user/op-security/PLAN.md`).

À lancer ensuite, dans l'ordre : campagne `compta-reste`, `client`, `metier-3d` (un arbre chacune :
`/home/user/wt-t-<partie>`) · `restes` pour chaque recontrôle rendu (compositeur, planning, coque…) · seconde vague de la campagne
quand les refontes sont finies : `devis-atelier`, `mail`, `achats`, `materiel`, `vehicules-temps`, `equipe` · `guide` · puis le
dernier passage : `final-rejeu` (par groupes de familles), `final-regard` (par rôle), `final-parcours`, `final-mots`, `final-rapport`.
