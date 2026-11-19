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

## Vague 1 — LANCÉE le 18/11 à 21 h 50 (heure française), sur ordre de Justin (« lance tout maintenant »), AVANT l'allègement de CLAUDE.md

| Fenêtre | Session |
|---|---|
| 25 | session_01PfEEAGuPApkVucRDpsaZMi |
| 26 | session_01PfEEAFegbsNBNx6JGw114B |
| 28 | session_01PfEEAExKU5cK8fZNrujS3o |
| 8 | session_01PfEEAGJe8TjgJMyfvuFXK8 |
| 38 | session_01PfEEAEXg9Uh5eNZ4ZkKSu7 |
| 21 | session_01PfEEAEnqU5qtq4S51gMMyE |
| 23 | session_01PfEEAHUBdV76VthLNo6x6B |
| 10 | session_01PfEEADu9wUM5mHcb6uHJC2 |
| 7 | session_01PfEEAGUibfQ3wV4oiWH1jU |
| 14 | session_01PfEEAGRztTDBSNw6g5JX4u |
| 15 | session_01PfEEAHNQreWdv7axZtc8tA |
| 9 | session_01PfEEAJeciZvB8fMhMbWJNL |
| S1 | session_01PfEEAGZfkM3hFpgqyDkPeG |
| S2 | session_01PfEEAHbWuJ8LMJ8B3V6jCE |
| S3 | session_01PfEEAGRWcwdVT77zo9L5HM |

## Vague 2 — LANCÉE le 18/11 à 22 h 14 (après l'allègement de CLAUDE.md)

11 session_01PfEEAFm4LcfV39a6VfqDkS · 12 session_01PfEEAEp7bsR3VG5PzrrMDK · 18 session_01PfEEAECC87xwfFm8CUY9iP · 19 session_01PfEEAE9kmX4F7kAQGrwcQf ·
22 session_01PfEEAJX8WapidXmjCHuBTq · 24 session_01PfEEAFiFAEQwCRT9X5vqKe · 27 session_01PfEEAFNwJcRRsYNyzfgUVH · 29 session_01PfEEAFSRueRxMKZjGhgUvp ·
33 session_01PfEEAHG95yeX2tTheDtyea · 34 session_01PfEEAEAipA8iyYsbuP9nbb · 37 session_01PfEEAEBRExbA8vc2wYAQsy

Retours : S1, S2, S3 finis (21 h 55-22 h 07) ; sœur 23 finie (11/13 réglés, 2 restes + 2 casses) → VOIE SUIVANTE « restes achats » envoyée à 22 h 12.

## Vague 3 — LANCÉE le 18/11 à 22 h 49 (Matériel fini)

16 session_01PfEEAFtHQJEZ4c7B5fEUMX · 30 session_01PfEEAGCgSkCmG9wmQGDvAA · 31 session_01PfEEAF8mXMsabHYLeQ8sW8 · 32 session_01PfEEAEfuVjmMK8nteZneHs ·
35 session_01PfEEAEsje9M3PGqE4nL9EZ. Reste : 36 (Mon camion) APRÈS la sœur 26 (Véhicules, en correction).

## Retours de la soirée (finies → suite)
- S1, S2, S3 finies. 37 (nuit) finie sans reste. 25 (Matériel) finie : la régression « Annuler » qu'elle signale était déjà réparée (vérifié dans le code, 36 ✓) ; technicien-08 (« u ») pour Justin.
- Relancées en tour suivant : 23 achats, 10 métier 3D, 22 contrats, 29 client, 34 interventions, 26 vehtemps, 24 entreprise.

## Pour Justin (liste des doutes, à trancher)
- Métier 3D : 3 ✗ « à soumettre » (metier-3d-06 ×2, -08, -09, dans campagne/metier-3d-recontrole.json).
- Interventions : la règle des 20 chiffres d'un numéro (+33…) ; l'écriture d'une durée « 1 h 30 ».
- Nuit : bouton principal bleu des pages paiement/documents et du courrier ; deux boutons principaux au guide, un par ligne aux véhicules.
- Véhicules : la tuile « dépensés en octobre » sans l'assurance répartie ; le mot « manque à bord ».
- Matériel : l'unité « u ».
- Regard gérant b (sœur 17) : 3 points à soumettre dans final/regard-gerant-b.json.

## Vague 4 (rejeu final) — lancée le 19/11 à 01 h 38 UTC
- Sans attente : 1 session_01PfEEAFDCAmUbjzi2SnWX26 · 6 session_01PfEEAGqhuTjjQDb9ExESEd · 13 session_01PfEEAEjWYVSZPxTggCwt3w.
- 9 : tour 3 Retour relancé (points 2, 3 et doutes tranchés par la règle « Retour ferme la couche du dessus »).
- À lancer dès que leurs fenêtres finissent : 2 (après 24), 3 (après 26, 38, 9), 4 (après 22), 5 (après 33, 29, 34).
- Finies à 01 h 36 UTC : 25, 37, 15, 12, 18, 30, 19, 28, 10, 16, 11, 31, 32, 7, 14, 23, 8, 35, 36, 27, S1, S2, S3.
