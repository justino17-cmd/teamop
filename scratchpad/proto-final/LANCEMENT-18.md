# Lancement du 18 novembre — les fenêtres prêtes

Préparé le 17 novembre au soir (demande de Justin : « préparer toutes les fenêtres avec les tâches qu'elles doivent faire, sans
qu'elles aient besoin de tout relire »). Repris de `arret/soeur-*.md` (les fiches d'arrêt du 17, 12 h 50) et de `VOIES-EN-COURS.md`.

## Ce que lit une fenêtre, et RIEN d'autre

1. `scratchpad/proto-final/workflows/SESSION-SOEUR.md` (3,6 Ko : la marche à suivre et ses règles) ;
2. sa fiche `scratchpad/proto-final/arret/soeur-<n>.md` (1 Ko : où elle s'est arrêtée).

Elle ne lit ni `REPRISE.md`, ni `VOIES-EN-COURS.md`, ni les rapports des autres fenêtres. Les consignes de chaque étape sont déjà
dans `workflows/voies.js` : le workflow les donne à ses agents. ⚠️ `CLAUDE.md` reste lu d'office par chaque fenêtre et chaque agent
tant qu'il n'est pas allégé : c'est l'étape (a) du 18, AVANT la première vague.

## Le message à envoyer (création : `create_session`, réglages de SESSION-SOEUR.md « Côté chef », modèle Sonnet)

> SŒUR <n> du 18 novembre. Lis SEULEMENT `scratchpad/proto-final/workflows/SESSION-SOEUR.md` puis
> `scratchpad/proto-final/arret/soeur-<n>.md`, rien d'autre. Joue ensuite la voie avec ces arguments : `<args>`.
> Rends compte à la session chef par un seul message « SŒUR <n> : » quand c'est fini.

## Les fenêtres (« depuis » relu dans chaque fiche)

Vague 1 = les chemins les plus longs et ce qui débloque les autres. Vagues 2 et 3 si la consommation tient.

| Vague | Fenêtre | Arguments (toujours avec `"arbre":"/home/user/wt-soeur"`) | Ce qui reste |
|---|---|---|---|
| 1 | 25 | `{"voie":"materiel","depuis":8}` | recontrôle adverse Matériel (technicien-11 à 14), rapport |
| 1 | 26 | `{"voie":"vehtemps","depuis":8}` | recontrôle Véhicules et Temps de travail |
| 1 | 28 | `{"voie":"guide","depuis":1}` | relire, corriger, recontrôler le guide (étapes 2 à 4) |
| 1 | 8 | `{"voie":"double-auth","depuis":4}` | corriger (vérifier f368ccee d'abord), recontrôler |
| 1 | 38 | `{"voie":"restes","noms":["securite"],"tours":2,"depuis":1}` | recontrôle du tour 1 sécurité, puis tour 2 |
| 1 | 21 | `{"voie":"campagne","cles":["equipe"],"depuis":2}` | recontrôle Équipe |
| 1 | 23 | `{"voie":"campagne","cles":["achats"],"depuis":2}` | recontrôle Achats |
| 1 | 10 | `{"voie":"campagne","cles":["metier-3d"],"depuis":2}` | corrections ouvertes et rapport Métier 3D |
| 1 | 7 | `{"voie":"campagne","cles":["devis-atelier"],"depuis":1}` | finir les corrections (décisions h, i, j), recontrôle |
| 1 | 14 | `{"voie":"final-parcours"}` | parcours 7 à 12, puis recontrôle adverse |
| 1 | 15 | `{"voie":"final-mots"}` | relevé et corrections des libellés, sondes mots-* |
| 1 | 9 | `{"voie":"retour","depuis":1}` | passes retour-calques par profil |
| 2 | 11 | `{"voie":"restes","noms":["technicien"],"depuis":1}` | recontrôle tour 1, puis tour 2 |
| 2 | 12 | `{"voie":"restes","noms":["accueil"],"tours":3,"depuis":4}` | tour 3 Accueil |
| 2 | 18 | `{"voie":"restes","noms":["planning"],"tours":3,"depuis":4}` | tour 3 Planning |
| 2 | 19 | `{"voie":"restes","noms":["artefact"],"depuis":2}` | recontrôle artefact |
| 2 | 22 | `{"voie":"restes","noms":["contrats"],"depuis":3}` | recontrôle du tour 2 Contrats |
| 2 | 24 | `{"voie":"restes","noms":["entreprise"],"tours":1,"depuis":1}` | recontrôle Mon entreprise |
| 2 | 27 | `{"voie":"restes","noms":["compta-ventes"],"depuis":2}` | recontrôle Comptabilité ventes |
| 2 | 29 | `{"voie":"restes","noms":["client"],"tours":1,"depuis":1}` | recontrôle espace client |
| 2 | 33 | `{"voie":"restes","noms":["clients"],"tours":1,"depuis":1}` | recontrôle Clients |
| 2 | 34 | `{"voie":"restes","noms":["interventions"],"tours":1,"depuis":1}` | recontrôle Interventions (14 entrées) |
| 2 | 37 | `{"voie":"restes","noms":["nuit"],"tours":1,"depuis":1}` | recontrôle de nuit |
| 3 | 16 | `{"voie":"final-regard","role":"gerant","rubriques":["Accueil","Statistiques","Historique","Planning","Interventions","Tâches","Absences et congés"],"suffixe":"a","depuis":1}` | finir le regard, corriger |
| 3 | 30 | `{"voie":"final-regard","role":"technicien","rubriques":["Ma journée","Mes tâches","Mes congés"],"suffixe":"a"}` | tout (rien n'était fini) |
| 3 | 31 | `{"voie":"final-regard","role":"gerant","rubriques":["Stock","Fournisseurs, matériel & produits","Dépôts et camions"],"suffixe":"c"}` | APRÈS la fenêtre 25 |
| 3 | 32 | `{"voie":"final-regard","role":"bureau","rubriques":["Mes tâches","Interventions","Clients","Devis","Contrats","Comptabilité"],"suffixe":"a"}` | regard bureau |
| 3 | 35 | `{"voie":"final-regard","role":"gerant","rubriques":["Registre sanitaire","Carte des box","Devis xylophage"],"suffixe":"f"}` | « depuis » à lire dans son journal ; sinon tout |
| 3 | 36 | `{"voie":"final-regard","role":"technicien","rubriques":["Mon camion"],"suffixe":"b"}` | tout, APRÈS la fenêtre 26 |
| 4 (rejeu final) | 1 | `{"voie":"final-rejeu","familles":["atelier","compositeur","mail","menu","taches"],"depuis":1}` | rejouer et réparer |
| 4 | 2 | `{"voie":"final-rejeu","familles":["materiel","droits","entreprise"],"jusqua":0}` | APRÈS 25 et 24 |
| 4 | 3 | `{"voie":"final-rejeu","familles":["vehtemps","secu","securite","artefact","retour","double"],"jusqua":0}` | APRÈS 26, 38, 8, 9, 19 |
| 4 | 4 | `{"voie":"final-rejeu","familles":["compta","contrats"],"jusqua":0}` | APRÈS 27 et 22 |
| 4 | 5 | `{"voie":"final-rejeu","familles":["accueil","technicien","clients","client","interventions"],"jusqua":0}` | APRÈS 12, 11, 33, 29, 34 |
| 4 | 6 | `{"voie":"final-rejeu","familles":["coque","planning","restes","recontrole","relire"],"jusqua":0}` | pas de fiche : tout depuis le début ; APRÈS 18 |
| 4 | 13 | `{"voie":"final-rejeu","familles":["metier","hote"],"jusqua":0}` | finir metier-tout.sh, script « hote » |

| 1 | S1 | (pas de voie : consigne écrite ci-dessous) | OP GESTION serveur : les notifications d'une entreprise exigent la preuve de clé |
| 1 | S2 | (pas de voie) | OP GESTION serveur : la Tour a une vraie déconnexion (jeton révoqué côté serveur) |
| 1 | S3 | (pas de voie) | OP GESTION serveur : les mots de passe de la Tour rangés en scrypt, migration au premier login |

### Les trois fenêtres « serveur » (S1, S2, S3) — leur consigne

Exception à SESSION-SOEUR.md : elles touchent `server/` (et `espace.html`/`messages.html`/`beta.html` pour S1), sur la branche de
travail SEULEMENT (un push sur `main` déploie : interdit). Chacune : lire le code concerné, écrire le banc d'abord (le vrai serveur sur
127.0.0.1, la vraie fonction de la page quand une page appelle la route), corriger, `bash scripts/bancs-ci.sh` sur les suites
serveur, muter pour voir le banc tomber, pousser, rendre compte. Rien en production : la mise en ligne attend la phrase de Justin.
- **S1** : `/api/subscribe` et `/api/notify` passent de « observées » à « exigées » (même réglage que la Réception, rouvrable), refusent
  un identifiant hors annuaire. ⛔ L'ORDRE : les appareils d'abord (`espace.html`, `messages.html` et l'application envoient la
  preuve), la porte ensuite — la fermeture côté serveur reste DÉSACTIVÉE par défaut tant que Justin n'a pas publié les pages.
- **S2** : route de déconnexion de la Tour qui tue le jeton côté serveur ; le jeton long (« rester connecté ») se raccourcit ;
  le bouton « Se déconnecter » de `tour.html` l'appelle et dit l'échec.
- **S3** : hachage scrypt salé (module `crypto`, aucune dépendance), ancien hachage accepté UNE fois puis réécrit, script de
  création du premier compte aligné ; aucun mot de passe ni empreinte dans les journaux.

Rien à relancer : **20** (coque finie, 0 reste). À décider par le chef : **17** (regard gérant b fini ; ses restes à corriger —
n°7 et n°8 à 320 px, « Tous » sur iPad portrait, 10 nouveaux — n'ont pas de voie : les donner à une fenêtre « restes » ou les
corriger soi-même ; 3 points à soumettre à Justin, dans `final/regard-gerant-b.json`).

⚠️ Les « depuis » viennent des fiches, écrites à l'arrêt ; une fenêtre qui voit un journal différent suit SESSION-SOEUR.md (point 4).
Après chaque vague : le chef fusionne, compile la page ENTIÈRE, note le pourcentage consommé et le dit à Justin.
