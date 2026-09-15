<!-- Établi le 15 septembre 2026, après la phrase de Justin : « il n'y a rien qui est vérifié
     quand on publie. Et il n'y a rien qui est vérifié en temps réel s'il y a des erreurs. »
     Trois lectures parallèles du dépôt, deux propositions (la barrière de publication ; la
     détection en temps réel), chacune attaquée par deux critiques — comment elle sera
     contournée, et aurait-elle vraiment attrapé les incidents déjà vécus.
     ⛔ VÉRIFIÉ À LA MAIN avant d'être versé ici, et le constat est pire que la phrase :
       · « Vérification des pages » échoue à CHAQUE push depuis le 14 septembre 14 h 38 —
         48 exécutions d'affilée en échec, ~26 heures, et GitHub Pages a publié à chaque fois.
         Le voyant rouge n'empêche rien.
       · le workflow n'a aucun `if: always()` : les deux étapes suivantes — « Le code d'accès
         tient » et « beta.html est bien la génération de app.html » — n'ont pas tourné une
         seule fois de toute cette période.
       · l'étape qui échoue (server/test-connexion.js) ne cachait pas qu'un banc périmé : elle
         cachait un VRAI défaut, mesuré sur le serveur isolé — après un renommage d'entreprise,
         le NOUVEAU nom ne permet plus de se connecter (409), seul l'ancien marche, et l'écran
         affiche pourtant le nouveau. -->

# SURVEILLANCE.md — Vérifier ce qui part, voir ce qui casse

> À committer à la racine, à côté de `REPRISE.md`.
> Écrit le 15 septembre 2026, en lecture seule : **aucun fichier n'a été modifié**.
> Tous les chiffres de ce document ont été mesurés sur ce dépôt le 15 septembre, sauf mention contraire.
> Aucune dépendance nouvelle, aucun service payant tiers : tout tient dans GitHub Actions (gratuit sur dépôt public), dans `server/` et dans les scripts déjà présents.

---

## 1. Ce qui n'est vérifié par PERSONNE aujourd'hui — la liste nue

- Les 63 suites de `tests/` — 1 923 vérifications, 14,37 s, 0 échec (mesuré). `grep -rn "tests/" .github/workflows/` → aucun résultat.
- `sw.js` — `scripts/verifier-syntaxe.js:15` filtre sur `f.endsWith('.html')`. Aucun `node --check` dans `.github/`.
- `server/index.js`, 6 891 lignes (`wc -l`) — aucun `node --check` avant déploiement.
- `beta-build.js`, `fond-anime-teamop.js`, et les 104 fichiers `.js` suivis — même chose.
- Les 9 pages de `apercu/` — `scripts/verifier-syntaxe.js:15` fait `fs.readdirSync(RACINE)`, non récursif.
- `scripts/verifier-syntaxe.js:44` — `process.exit(erreurs ? 1 : 0)` : zéro page trouvée = vert.
- Que `APP_VERSION` (`app.html:4915`) ait monté quand `app.html` change.
- Que `CACHE` (`sw.js:4`) ait monté en même temps.
- Que `beta.html:4915` porte bien `APP_VERSION + '-beta'`.
- `SYNC_SECRET_DEFAULT` (`app.html:6458`) et `SYNC_SALT` (`app.html:6459`) — aucune garde mécanique.
- `FB_TEAM` (`app.html:6432` / `beta.html:6432`) — aucune garde mécanique.
- Que le fichier servi par `teamop.fr` soit celui de `main` — aucun contrôle côté pages (`deploiement.yml:85-90` le fait pour le VPS seulement).
- `connexion.html`, `tour.html`, `beta.html`, `creer.html`, `recap-abonnement.html` — absents de `.github/scripts/surveillance.js:19`.
- `lastRefus` (`server/index.js:321`), `mailRefus` (`:633`), `bugs24h` (`:322`) — exposés sur `/health`, lus par personne : `grep -c` dans `surveillance.js` → 0, dans `tour.html` → 0.
- `cleAdmin` (`server/index.js:4305`) — derrière `monAdmin`, donc illisible par la surveillance externe.
- L'état de la CI elle-même — aucun workflow ne lit la conclusion d'un autre.
- `.github/workflows/verification.yml` — aucune étape ne porte `if: always()` : l'échec de l'étape `:64` saute `:67` et `:72`.
- `server/test-connexion.js` — `✘ 6 cas en échec sur 65` (relancé aujourd'hui), depuis le 14/09 15 h 44.
- Un rejet de promesse non traité côté serveur — `unhandledRejection` n'apparaît qu'une fois dans `server/index.js`, **dans un commentaire** (`:4517`). `grep -c "app.use((err"` → 0.
- Une boucle de redémarrage du service — `server/install.sh:77-78` pose `Restart=always` / `RestartSec=3`, rien ne compte les redémarrages.
- Une écriture qui RÉUSSIT en détruisant — les deux canaux clients n'écoutent que `window.onerror` et `unhandledrejection` (`app.html:4789-4790`, `:4866-4867`).
- Une base ou une box qui rétrécit — le serveur connaît la taille de chaque copie de sauvegarde (`server/index.js:2670`, `statSync`) et ne compare jamais deux tailles.
- Un utilisateur qui ne voit plus ses box — `usrSansBox` (`app.html:8532`) existe, aucun `fetch` ne porte son résultat vers le serveur.
- `scripts/verifier-permissions.js` — 0 occurrence de `userIdsExclus`, 0 de `conges` dans son jeu d'essai.
- Les 48 écrans `views.*` — 0 occurrence de `views.` dans `tests/`.
- Le hook local — `git config --get core.hooksPath` rend vide (code 1) ; `.git/hooks/` ne contient que des `.sample`.
- Six suites se SAUTENT en silence sans `server/node_modules` : `tests/test-641.js:278-281`, `test-668.js`, `test-669.js`, `test-675.js`, `test-680.js`, `test-702.js`. Mesuré sur l'arbre `git ls-files` copié à part : **1 758 ✓ au lieu de 1 923, zéro échec signalé** — 165 vérifications perdues sans un mot.
- Le passage de `main` au navigateur du client — GitHub Pages sert la branche, `deploiement.yml:11-14` déploie le VPS sur `push` : les contrôles tournent à côté.

---

## 2. La barrière de publication, point par point

Principe : **`main` propose, un portier publie.** Mais on ne rend rien bloquant tant qu'un contrôle est rouge pour rien, et on ne bascule GitHub Pages qu'après avoir prouvé, octet par octet, que le nouveau chemin sert la même chose.

### Point 2.1 — Réparer le banc périmé (préalable absolu)

**Ce qu'on fait.** `server/test-connexion.js:204` exige `rn.slug === 'nouveaunomsas'`, et `:208`, `:214` en dépendent. Or `server/index.js:4053` rend délibérément `adresseInchangee: true` et conserve l'adresse depuis la v669. Le code est juste, le banc est périmé. Réécrire les six cas sur la promesse ACTUELLE : l'adresse ne bouge pas, l'ancien nom continue d'ouvrir l'espace, le nom rendu est le nouveau.

**Fichier.** `server/test-connexion.js` uniquement. Rien dans `server/index.js` → **ce commit ne déploie pas le VPS** (`deploiement.yml:14` filtre sur `server/**`… ⚠️ `server/test-connexion.js` EST sous `server/**` : le push déclenchera donc un déploiement. Le VPS ne changera pas de code — `git merge --ff-only` puis `systemctl restart` — mais le service redémarre. À faire à une heure creuse, et à dire.)

**Vérification.** `node server/test-connexion.js` → `65/65`. Aujourd'hui : `✘ 6 cas en échec sur 65`.

**Temps.** 30 min.

**Ce que ça aurait attrapé.** Les 26 heures de CI rouge du 14/09 15 h 44 au 15/09 16 h 21 — les 15 dernières exécutions listées par l'API Actions (n°374 à n°388) sont toutes en `conclusion: failure`. Un voyant toujours rouge ne prévient plus de rien, et son échec en `:64` a mis `:72` (« beta.html est bien la génération de app.html ») en `skipped` pendant tout ce temps — le garde-fou exact de la règle que Justin venait de durcir.

---

### Point 2.2 — `garde.yml` : DEUX verdicts, pas un

**Ce qu'on fait.** Fusionner `ci.yml` et `verification.yml` en un seul `garde.yml`, avec **deux jobs indépendants** :

- `garde-pages` — ce qui décide de la publication des pages ;
- `garde-serveur` — ce qui décide du déploiement du VPS.

Le second ne garde JAMAIS la porte du premier : un correctif d'`app.html` n'a aucune raison d'attendre 105 s de suites serveur.

**Ordre des étapes de `garde-pages`, et il est décisif :**

| # | étape | commande | mesuré |
|---|---|---|---|
| 1 | secrets | `bash scripts/verif-secrets.sh --suivis` (`ci.yml:35`) | ~5 s |
| 2 | dépendances serveur | `npm ci --omit=dev` dans `server/` + `actions/cache` sur la somme de `server/package-lock.json` | à mesurer au 1er passage |
| 3 | syntaxe des pages | `node scripts/verifier-syntaxe.js` rendu **récursif** | 0,26 s sur 27 pages, 50 blocs |
| 4 | syntaxe des `.js` | `for f in $(git ls-files '*.js'); do node --check "$f" \|\| exit 1; done` | ~4 s, 104 fichiers |
| 5 | suites | `for f in tests/test-*.js; do node "$f" ...` | **14,37 s, 63 suites, 1 923 ✓** |
| 6 | métier | les six scripts de `verification.yml:39-60` | ~3 s au total |
| 7 | versions | `node scripts/verifier-version.js` (point 2.3) | ~1 s |
| 8 | constantes | `node scripts/verifier-constantes.js` (point 2.4) | ~1 s |
| 9 | bêta | `node beta-build.js && git diff --quiet -- beta.html` (`verification.yml:72-79`) | ~0,2 s |
| 10 | verdict | tableau dans `$GITHUB_STEP_SUMMARY`, sortie 1 si un rouge | ~1 s |

**⛔ L'étape 2 passe AVANT l'étape 5, et ce n'est pas un détail.** Mesuré : sans `server/node_modules`, les suites rendent **1 758 ✓ 0 ✗ au lieu de 1 923 ✓** et sortent en 0. Six suites impriment `… partie exécutée SAUTÉE` (`tests/test-641.js:280`) et se taisent — dont `test-641.js`, qui porte les trois contrôles du code promo et le « zéro écriture directe dans `espaces.json` ». La CI serait verte sur du vide.

**Deux garde-fous sur l'étape 5, parce qu'un contrôle qui peut se sauter lui-même n'est pas un contrôle :**
1. la sortie complète est capturée et le job échoue si elle contient `SAUTÉE` ;
2. un plancher numérique vérifié — `[ $TOTAL -ge 1923 ]` — le nombre vivant dans un fichier `tests/PLANCHER` qu'on relève sciemment quand on ajoute une suite.

**`if: always()` NON — `if: ${{ !cancelled() }}` sur les étapes 3 à 9.** `always()` s'exécute aussi sur job annulé, et surtout : si l'étape 2 tombe, les étapes 5 et 9 partiraient quand même et rendraient trois rouges en cascade pour une seule cause. Un journal qui rend quatre rouges pour un défaut est un journal qu'on cesse de lire — c'est le mécanisme dénoncé sur l'issue #3.

**⚠️ `npm audit` sort du chemin bloquant.** `ci.yml:39-40` bloquerait la publication sur un avis publié dans la nuit par un tiers, correctif d'urgence compris, pour une cause qu'aucun commit ne répare. On l'exécute, on écrit le résultat dans `$GITHUB_STEP_SUMMARY`, on ouvre une issue au-delà de `high` — on ne rougit pas. (Mesuré aujourd'hui : `npm audit --omit=dev --prefix server` rend `{"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}` — les trois failles `qs`/`express`/`body-parser` du 15/09 sont déjà résolues.)

**Vérification.** Le laisser tourner en consultatif sur deux ou trois poussées. Le voir vert. Puis supprimer `ci.yml` et `verification.yml`.

**Temps.** 3 h.

**Ce que ça aurait attrapé.** La panne du 3 septembre 2026 (`scripts/verifier-syntaxe.js:3-8`) si elle avait touché `sw.js` ou `server/index.js` au lieu d'une page. Les trois contrôles du code promo. Le semis de démonstration du 11 septembre (`tests/test-642.js`). Et l'escamotage de `verification.yml:72` : depuis 26 heures, rien ne vérifiait plus que la bêta correspond à la production.

---

### Point 2.3 — `scripts/verifier-version.js` (à écrire)

**Ce qu'on fait.** Le script lit le commit de référence — le `sha` épinglé dans `PUBLICATION.json` sur `main`, `HEAD~1` en PR — par `git show $SHA:app.html` et `git show $SHA:sw.js`. Il exige trois choses :

- si `app.html` diffère, `APP_VERSION` (`app.html:4915`) strictement supérieur ;
- si `app.html` diffère, `CACHE` (`sw.js:4`) strictement supérieur aussi ;
- `beta.html:4915` vaut exactement `APP_VERSION + '-beta'`.

Le message d'échec nomme les deux nombres vus.

**Vérification — par la négative, sinon ça ne vaut rien.** Rejouer `f032c3e` puis `47a63c2` en local : les deux DOIVENT rougir. Mesuré : `git show f032c3e:app.html | grep APP_VERSION` et `git show 47a63c2:app.html | grep APP_VERSION` rendent tous deux `'693'`, `sw.js` reste `elan-gestion-v893` dans les deux, et `git diff --stat f032c3e 47a63c2 -- app.html beta.html` rend **130 suppressions**. Un contrôle qu'on n'a jamais vu rougir n'a pas été vérifié.

**Temps.** 1 h 30.

**Ce que ça aurait attrapé.** Le 15/09 : `f032c3e` (15 h 59) a poussé 66 lignes dans `app.html`, `47a63c2` (16 h 12) les a retirées. **Le fichier servi a changé deux fois sous la même étiquette et la même clé de cache.** Un appareil arrivé frais entre les deux a reçu du code différent sous un numéro identique, et aucun des deux états n'est distinguable après coup.

*(Correction à une inquiétude qui circule : découpler `sw.js` du reste ne casse PAS l'installation du service worker — `sw.js:60-62` fait `c.add(a).catch(() => {})` ressource par ressource, pas `addAll`. À ne pas inventer.)*

---

### Point 2.4 — `scripts/verifier-constantes.js` (à écrire)

**Ce qu'on fait.** Empreintes SHA-256 des lignes exactes, gravées dans le script : `app.html:6432` (`FB_TEAM='elan-gestion'`), `app.html:6458` (`SYNC_SECRET_DEFAULT`), `app.html:6459` (`SYNC_SALT`), et pour `beta.html` les valeurs attendues APRÈS substitution (`beta.html:6432` = `elan-gestion-beta`, `:6458` et `:6459` identiques à la production — vérifié).

Le message d'échec ne montre PAS la valeur trouvée : il dit « cette ligne est un déménagement de données chiffrées, pas un renommage — voir `CLAUDE.md` ».

**Vérification.** Modifier une virgule du sel dans une copie du scratchpad, voir rougir. Remettre, voir verdir.

**Temps.** 1 h.

**Ce que ça aurait attrapé.** Rien encore, et c'est l'argument : la première fois sera la dernière. Modifier l'un des deux rend illisibles, sur tous les appareils à la fois, les données de toutes les entreprises sans clé personnalisée — le nuage ne stocke que du chiffré. Or le geste qui déclenche le piège a déjà eu lieu : le renommage global `elangestion` → `teamop` du 7 septembre. `CLAUDE.md` écrit que le sel « se referme dans les deux sens » ; cet avertissement ne repose aujourd'hui sur rien de mécanique.

---

### Point 2.5 — `PUBLICATION.json` : la phrase de Justin devient une ligne de fichier

**Ce qu'on fait.** Créer `PUBLICATION.json`, épinglé sur ce qui est DÉJÀ en ligne :

```json
{"app":{"sha":"cda0442c82d82cf29d48d710795c012961ae6986","version":"693",
        "cache":"elan-gestion-v893","phrase":"publie la v693","le":"2026-09-15","par":"Justin"}}
```

Publier `app.html` devient alors un commit d'UNE ligne, distinct, daté, qui ne peut désigner qu'un commit déjà passé au vert. Revenir en arrière, c'est la même ligne dans l'autre sens.

**Vérification, et elle est bloquante.** L'épingle doit désigner l'octet servi :
`curl -s https://teamop.fr/app.html | sha256sum` = `git show cda0442:app.html | sha256sum`, idem pour `sw.js`. Si les deux empreintes diffèrent, **on ne bascule rien** — on cherche pourquoi.

**Temps.** 45 min.

**⚠️ Limite à dire tout de suite.** L'épingle ne couvre que `app.html` et `sw.js`. `connexion.html` — la porte d'entrée de chaque salarié d'ELAN depuis la v669 — part à chaque vert, et c'est précisément elle qui a cassé le 15/09 (v681, bannière écrasant le bloc « Comment te connecter ? », remontée par une capture de Justin). Idem `tour.html`, `espace.html`, `recap-abonnement.html`. On peut étendre l'épingle plus tard ; on ne doit pas laisser croire qu'elle protège tout le site.

---

### Point 2.6 — `pages.yml` : la publication devient un choix

**Ce qu'on fait.** Basculer la source GitHub Pages de « Deploy from a branch » vers « GitHub Actions », puis écrire `pages.yml` déclenché par `workflow_run` sur `garde-pages`.

**Cinq conditions, aucune facultative :**

1. `workflow_run.conclusion == 'success'`
2. `workflow_run.event == 'push'` — sinon une PR depuis un fork produit un vert
3. `workflow_run.head_repository.full_name == github.repository` — un auteur de fork choisit le nom de sa branche, il peut l'appeler `main`
4. `actions/checkout` avec `ref: ${{ github.event.workflow_run.head_sha }}` et `fetch-depth: 0` — par défaut un `workflow_run` prend la branche par défaut en profondeur 1, donc il publierait `main` **au moment où l'événement arrive**, un autre commit que celui passé au vert (38 commits le 15/09)
5. le `sha` épinglé dans `PUBLICATION.json` doit avoir SA propre exécution verte de `garde-pages`, **sur un push de `main`**, et son `.github/workflows/garde.yml` doit être identique à celui de `main` — sinon on épingle un vert obtenu avec un portier allégé

Le job construit `_site` depuis le commit vert, PUIS écrase `app.html` et `sw.js` par la version du `sha` épinglé.

**⛔ Et `garde-pages` doit vérifier que l'écluse est encore en place :** `GET /repos/{owner}/{repo}/pages`, échec si `build_type != "workflow"`. Le réglage Pages est un bouton dans Settings, il n'apparaît dans aucun diff : sans ce contrôle, quelqu'un le remet sur la branche un soir d'urgence et **l'écluse est démontée sans que rien ne le dise**, pendant que `garde.yml` continue de rendre des verdicts verts.

**Vérification, AVANT de basculer.** Faire tourner `pages.yml` sans publier : il construit `_site` et compare chaque fichier à ce que `teamop.fr` sert aujourd'hui. Tant que le diff n'est pas vide, on ne bascule pas. Quand il l'est : Settings → Pages → « GitHub Actions », **avec Justin présent**, un jour de semaine en début d'après-midi, jamais un vendredi soir.

**Retour arrière.** Remettre « Deploy from a branch » : un clic, ~1 min. **À écrire dans `REPRISE.md` AVANT de basculer, pas le jour où on en a besoin.**

**Temps.** 4 h, plus la bascule elle-même.

**Ce que ça aurait attrapé.** Le 15/09 à 16 h 12 : `47a63c2` a été servi aux clients pendant que son exécution n°387, créée à 16 h 12 min 14 s, échouait à 16 h 14 min 06 s. Et les 66 lignes de `f032c3e`, dont le message dit lui-même « non publié, attend la décision », n'auraient jamais quitté le dépôt.

**⚠️ C'est le geste le plus risqué du chantier.** Si le job de construction est faux, tout tombe en même temps — site vitrine, application, Tour. À faire avec Justin, pas en solo.

---

### Point 2.7 — `serveur.yml` : déployer, et savoir revenir

**Ce qu'on fait.** Remplacer le déclencheur `push` de `deploiement.yml:11-14` par le même `workflow_run` (sur `garde-serveur`), avec les cinq conditions du point 2.6. Puis, dans le script distant :

- `AVANT=$(git rev-parse HEAD)` et **sortie anticipée** si `git diff --quiet $AVANT $SHA -- server/` — un redémarrage inutile vide la Map en mémoire `bugSeen` (`server/index.js:402`) qui dédoublonne les alertes sur 6 h ;
- une fonction `sante()` = `systemctl is-active --quiet teamop-api` **et** `/health` local **et** la comparaison d'annonce, aujourd'hui faite depuis le runner (`deploiement.yml:85-90`) — la remonter dans le script distant est ce qui permet d'AGIR ;
- si `sante()` échoue : `git reset --hard $AVANT`, `npm ci` si le verrou avait bougé, `systemctl restart`, re-`sante()`, sortie en 1 en disant lequel des deux états on a laissé ;
- une étape `if: failure()` — que `deploiement.yml` n'a PAS, contrairement à `surveillance.yml:23-39` — qui ouvre une issue et envoie un courriel.

**`deploiement.yml:15` porte `workflow_dispatch: {}` sans filtre de branche** : deux clics déploient du code que le portier n'a jamais vu. On le garde — c'est une sortie de secours légitime — mais on lui impose une entrée `raison:` obligatoire et une issue automatique (voir §5).

**Vérification — éprouver le retour arrière pour de vrai.** Une sauvegarde jamais restaurée n'est pas une sauvegarde. **Mais pas sur `api.teamop.fr`** : sans `/api/fb/jeton`, les appareils retombent en anonyme, et depuis la publication de la règle Firestore du 11 septembre l'anonyme n'a RIEN — plus de synchro pour toute l'entreprise dès l'expiration du jeton en cours. Le banc existe : `server/test-connexion.js:92` lance déjà le vrai serveur isolé. On y rejoue la séquence complète.

**Temps.** 4 h.

**Ce que ça aurait attrapé.** La panne du 3 septembre 2026 citée par `deploiement.yml:6-7` : « une faille de sécurité corrigée est restée ouverte en production plusieurs heures ». Et ce qu'un serveur mort coûte aujourd'hui : `server/install.sh:77-78` pose `Restart=always`/`RestartSec=3`, systemd rejoue cinq fois puis abandonne, le service reste en `failed`, et le seul signal est une croix rouge dans un onglet.

---

### Point 2.8 — Le hook local

**Ce qu'on fait.** `git config core.hooksPath .githooks` dans les deux copies de travail, et l'ajouter au hook `SessionStart` pour qu'un clone neuf l'ait d'office. Élargir `.githooks/pre-commit:11-14` : après `verif-secrets.sh`, un `node --check` sur les `.js` en attente et `node scripts/verifier-syntaxe.js` si un `.html` est en attente.

**Vérification.** `git config --get core.hooksPath` doit rendre `.githooks` (aujourd'hui : vide, code 1, et `.git/hooks/` ne contient que des `.sample`).

**Temps.** 20 min.

**Ce que ça aurait attrapé.** Le jeton GitHub et le mot de passe d'équipe qui ont déjà fuité une fois (`ci.yml:32`). `scripts/verif-secrets.sh:77-78` le dit : « un secret poussé une fois est compromis, même supprimé ensuite ». C'est le seul contrôle de la chaîne qui arrive AVANT que le secret devienne public.

*(À savoir : il se contourne par `git commit --no-verify`, `.githooks/pre-commit:5-6` le documente. C'est un filet, pas un mur — `garde-pages` étape 1 refait le contrôle.)*

---

## 3. La détection en temps réel, point par point

Ordre choisi : **d'abord ce qui protège ELAN sans toucher à `app.html`.** Trois des quatre premiers points ne demandent aucune phrase de Justin sur l'application.

### Point 3.1 — La sentinelle de rétrécissement, côté serveur — **délai visé : 31 min au pire**

**C'est le point de plus grande valeur de tout le document, et il ne coûte presque rien.**

**Ce qu'on fait.** `sauvegardeDeposer` (`app.html:7397`) dépose déjà, depuis la v693 en production, une copie chiffrée après chaque écriture acquittée (`app.html:7358`), au plus une par demi-heure et par appareil (`app.html:7398`). Le serveur l'écrit par temporaire + renommage (`server/index.js:2653-2659`) et **connaît la taille de chaque copie** (`server/index.js:2670`, `fs.statSync`). Il ne compare jamais deux tailles.

On ajoute un juge, toutes les 60 s : pour chaque espace, si la dernière copie est inférieure de plus de 30 % au maximum des copies des 24 h précédentes, on alerte.

**Trois verrous anti-faux-positif :**
- jamais sur un espace de moins de 3 copies dans les 24 h ;
- jamais sur une copie de moins de 50 Ko (une base naissante compresse n'importe comment) ;
- une seule alerte par espace et par 6 h, le dédoublonnage écrit **sur le disque**, pas en mémoire — `bugSeen` (`server/index.js:402`) est une `Map` que chaque déploiement remet à zéro.

**⛔ Ce qu'on NE fait PAS : déchiffrer.** Le dépôt vient de mesurer que le serveur EN EST CAPABLE (commit `8699bcb`, 62 ms par entreprise). Le faire changerait la position juridique décrite dans `sous-traitance.html` — TeamOP deviendrait traitant du contenu. **On ne lit que des tailles de fichiers.** C'est une frontière, pas une commodité.

**Fichier.** `server/index.js` seulement. **Rien côté application.**

**Vérification.** `tests/test-708.js` à écrire : lancer le vrai serveur isolé (comme `tests/test-641.js:278`), déposer une série de copies fabriquées, et exiger (a) qu'une série stable ne déclenche rien, (b) qu'une chute de 40 % déclenche, (c) qu'une seule copie isolée ne suffise jamais, (d) qu'une seconde chute dans les 6 h ne réémette pas.

**Temps.** 4 h, banc compris.

**Ce que ça aurait attrapé.** **La course de synchro du 15 septembre** — `_fbDoc.set()` remplaçant le document de l'équipe par un instantané périmé, « ça synchronise et ça efface tout ce qu'ils sont en train de faire ». L'écriture RÉUSSIT, donc aucun capteur existant ne pouvait la voir. La copie déposée juste après aurait été mesurablement plus petite. **Et les box vidées du matin du 15** (`boxFusionFine`, défaut dormant depuis la v639) — même signature, même canal. Ce sont les deux incidents les plus coûteux de la semaine, et c'est le seul mécanisme proposé ici qui les voit.

**Honnêtement, ses limites.** Le contenu est gzippé puis chiffré : la taille n'est pas linéaire avec le nombre d'enregistrements, et une suppression volontaire massive (ménage de fin de mois) déclenchera. Le seuil à −30 % est un pari, pas une mesure — il faut le laisser en **ambre une semaine** (un chiffre dans la Tour, aucun réveil), regarder ce qui aurait sonné, et ne passer en rouge que ce qui aurait eu raison. Et une copie n'arrive qu'après une écriture acquittée : sur un espace dont la synchro est déjà morte, il n'arrive rien — c'est le point 3.3 qui couvre ce cas.

---

### Point 3.2 — Le filet du processus serveur — **délai visé : < 5 s**

**Ce qu'on fait.** Trois ajouts dans `server/index.js` :

1. `process.on('unhandledRejection')` et `process.on('uncaughtException')` : journaliser le motif, incrémenter un compteur persistant, envoyer l'alerte, PUIS sortir. Node 22 arrête déjà le processus ; on ajoute la parole avant la mort.
2. `app.use((err, req, res, next) => …)` en dernier : 500, compteur, alerte au-delà d'un seuil, et **jamais le corps de la requête dans le journal** — seulement la route, le code et le message.
3. Un compteur de démarrages persistant : plus de 3 en 10 min = alerte. Au 5e, systemd abandonne et le service reste en `failed`.

Ces trois compteurs partent dans `/health`, **agrégés, sans jamais nommer un espace** — la règle est déjà écrite trois fois dans le fichier (`server/index.js:628`, `:655`, `:955`).

**Vérification.** Sur le serveur isolé du banc : provoquer un rejet non traité, vérifier que l'alerte part et que le processus sort proprement ; provoquer trois redémarrages, vérifier le compteur.

**Temps.** 2 h 30.

**Ce que ça aurait attrapé.** Le fichier se protège déjà de ce risque à la main, cas par cas, et le dit (`server/index.js:4514-4519`) : « ce fichier n'a ni `unhandledRejection` ni middleware d'erreur Express — et Node 22 transforme un rejet non traité en ARRÊT DU PROCESSUS. Faire dépendre la survie de l'API de la discipline d'une fonction voisine est un pari qu'on finit par perdre. » C'est une discipline manuelle sur 121 routes, à la place d'un filet.

---

### Point 3.3 — `/health` enrichi + la surveillance qui le lit — **délai visé : le cron réel, 3 à 6 h**

**Ce qu'on fait, en trois gestes.**

**(a) `/health` (`server/index.js:322-333`) gagne trois champs agrégés, sans jamais nommer un espace :**
- `cleAdmin: !!fbAdminCle` — aujourd'hui exposé uniquement sur `/api/monitor/version` (`server/index.js:4305`), **derrière `monAdmin`**, donc invisible à toute surveillance externe. Sans clé d'administration, `/api/fb/jeton` répond 503 (`server/index.js:208`), les appareils retombent en anonyme, et depuis le 11 septembre l'anonyme n'a rien.
- `procRedem` — le compteur du point 3.2.
- `retrecit24h` — le nombre d'espaces ayant déclenché la sentinelle 3.1 sur 24 h. **Un nombre, jamais un nom** : `/health` est publique, y nommer un espace dirait au monde quelles entreprises existent.

**(b) `.github/scripts/surveillance.js` :**
- ajouter `connexion.html`, `tour.html`, `beta.html`, `creer.html`, `recap-abonnement.html` à la liste de la ligne 19 ;
- lire enfin `lastRefus` (`server/index.js:321`), `mailRefus` (`:633`), `bugs24h` (`:322`) et les trois nouveaux — `grep -c` dans ce script rend aujourd'hui **0** pour chacun ;
- lire `PLANCHER` (`.github/scripts/surveillance.js:69`) depuis `PUBLICATION.json` au lieu de le coder en dur — sinon, l'épingle à 693 et `main` à 700 mettent la surveillance au rouge incorrigible ;
- **lire la conclusion de la dernière exécution de `garde.yml` sur `main`** par l'API Actions. C'est la barrière n°0 : sans elle, chacune des autres peut virer au rouge permanent et devenir, elle aussi, un voyant qu'on n'ouvre plus.
- cesser d'écrire « toutes les heures » : le cron `'7 * * * *'` (`surveillance.yml:5`) tourne en réalité toutes les 3 à 6 h.

**(c) `.github/workflows/surveillance.yml:33-38`** commente la PREMIÈRE issue ouverte portant le label — d'où l'issue #3, ouverte depuis le 13 juillet 2026 avec 31 commentaires. Remplacer par une recherche sur un titre construit à partir du SUJET, et une fermeture automatique au retour au vert (voir §4).

**Fichier.** `server/index.js` (donc déploiement VPS), `.github/scripts/surveillance.js`, `.github/workflows/surveillance.yml`.

**Vérification.** `curl https://api.teamop.fr/health | jq` doit montrer les trois champs et **aucune chaîne ressemblant à un identifiant d'espace ou à un slug**. `tests/test-709.js` à écrire : rejouer `/health` sur le serveur isolé et refuser toute valeur qui ressemble à un `t`.

**Temps.** 3 h.

**Ce que ça aurait attrapé.** La cause racine du 11 septembre — chantier #37, « restaurer la clé Firebase serveur » : `fbAdminCle = null`, donc plus de jeton, donc plus de synchro pour personne. Une ligne. Et la v681 du 15/09 : `connexion.html` cassée, remontée par une capture d'écran de Justin parce que cette page n'est surveillée par rien depuis qu'elle est devenue la porte d'entrée d'ELAN.

---

### Point 3.4 — Rebrancher le fil coupé : `tmPush` — **délai visé : quelques secondes après l'événement**

**Ce qu'on fait.** `app.html:6772` fait `if(typeof tmPush==='function')`, mais `tmPush` est déclarée `app.html:4843`, **dans l'IIFE ouverte `:4793` et refermée par `})();` juste avant `:4915`**, et n'est exportée nulle part. Vérifié mécaniquement : `grep -c 'window.tmPush' app.html` → **0**, `beta.html` → **0**. Le garde vaut `false`.

Conséquence : les trois auto-diagnostics de synchro — `app.html:6788` (« premier instantané jamais reçu après 25 s »), `:7278` (« impossible »), `:7345` (« écriture non acquittée en 15 s alors que le réseau répond ») — ne font qu'un `console.warn` (`app.html:6771`). Le commentaire `app.html:6782-6787`, écrit le 11 septembre en réponse à Justin (« c'est à nous de trouver les problèmes »), promet « visible dans la Tour et envoyé par mail ». **Il n'a jamais rien envoyé.**

On ajoute, avant la fermeture de l'IIFE : `try{ window.tmPush=tmPush; }catch(_){ }`.

**⚠️ Deux corrections à la croyance qui accompagne ce point.**
1. `TM_URL` vaut `https://api.teamop.fr/api/monitor/report` (`app.html:4795`), **pas `/api/bug`**. Le commentaire `:6786` se trompe de route. `/api/monitor/report` (`server/index.js:1250`) n'écrit que dans `monIssues`, n'envoie aucun courriel, et ne nourrit pas `bugs1h` — `bugTimes.push` n'existe qu'en `server/index.js:404` et `:428`. Rebrancher `tmPush` sans plus **fait apparaître le diagnostic dans la Tour, et nulle part ailleurs.** Il faut donc, du même coup, faire remonter les rapports de type `synchro` dans le canal d'alerte du §4.
2. `localStorage.top_monitor_off='1'` (`app.html:4794`) coupe toute l'IIFE. Un appareil devenu muet ne le dit pas.

**Fichier.** `beta.html` par régénération (`node beta-build.js`). **`app.html` attend une phrase de Justin.**

**Vérification — mesurée, pas relue.** Servir le dépôt en local (`127.0.0.1:8123`), ouvrir `beta.html` avec `timeout: 60000`, provoquer un vrai échec de synchro, et observer le TRAFIC (`page.on('request')`) — pas la file `top_monitor_q`, que `tmFlush` vide 500 ms après (`app.html:4859`, piège déjà rencontré au commit `214fa82`). Plus `tests/test-710.js` : extraire le bloc `4793`→`4914` du fichier livré, l'exécuter dans un `vm`, exiger `window.tmPush` fonction, et relire `app.html:6772` pour qu'aucun appelant ne soit ajouté hors portée.

**Temps.** 2 h.

**Ce que ça aurait attrapé.** Le 15 septembre au soir : les appareils d'ELAN **calculaient déjà** que leurs écritures ne partaient pas, compteurs compris (`app.html:6763-6770`), et l'écrivaient dans une console que personne ne regarde. Justin l'a appris par téléphone, des heures après.

---

### Point 3.5 — Le pouls : l'appareil dit comment il va — **délai visé : 16 min périodique, < 1 min événementiel**

**Ce qu'on fait.** Une fonction `poulsEnvoyer()` qui poste des ENTIERS et deux identifiants vers une nouvelle route `POST /api/pouls`. Elle réutilise ce qui est déjà calculé : `COLLS_GARDEES` (`app.html:7386`), la taille RÉELLE du document mesurée à chaque envoi (`app.html:7161`, contre `NUAGE_ENC_MAX = 780*1024` à `:7053`), `_syncOn`, `_syncGotInitial`, `APP_VERSION`.

**⛔ Cinq corrections sans lesquelles ce capteur serait muet ou menteur — toutes vérifiées dans le fichier :**

1. **Ne PAS réutiliser `sauvKh()`.** `app.html:7396` rend `null` si `elan_sync_secret` est absent, or `syncSecret()` (`app.html:6460`) retombe sur `SYNC_SECRET_DEFAULT` : un appareil sans clé personnalisée n'émettrait jamais rien. Prouver par `{t, kh: await sha256(syncSecret())}`.
2. **Ne PAS s'accrocher à `controler()` seul.** `app.html:31289-31294` vit dans un `window.addEventListener('load')` lui-même dans `if('serviceWorker' in navigator){` (`app.html:31251`), avec une garde de 5 min. Pas de service worker (navigation privée iOS, contexte non sécurisé) = pas un seul pouls de la vie de l'appareil. Le premier pouls doit partir hors de ce bloc.
3. **`sauvRefus` refuse `ESPACES_INTOUCHABLES`** = `['elan-gestion','elan-gestion-beta']` (`server/index.js:4797`, refus `:2585`). La bêta serait donc muette : **mesurer le pouls sur `beta.html` mesurerait un 403.** Il faut une exception explicite pour le pouls, ou une preuve d'identité distincte.
4. **`visibleBoxes()` sans argument rend toujours `[]`** — `app.html:8509` prend la liste EN ARGUMENT, et les onze appels du fichier passent tous `db.boxes`. Un juge « zéro box visible » bâti là-dessus sonnerait pour tout le parc dès le premier jour. La bonne mesure existe déjà : `usrSansBox` (`app.html:8532`), écrite le 11 septembre précisément parce que « sur treize comptes, quatre techniciens ouvraient Boxes sur un écran vide ». Envoyer `db.users.filter(usrSansBox).length` sur `db.users.length`.
5. **`db.boxes.length` ne bouge pas quand une box est VIDÉE.** Le dépôt a déjà payé cette erreur au commit `f032c3e` : « L'écran des copies ne comparait que des IDENTIFIANTS : une box vidée garde le sien ». Envoyer aussi la somme des lignes de stock.

**⛔ Charge utile : liste blanche stricte.** `t`, `dev`, `ver`, `ts`, compteurs de collections, taille du document, `listen`, `initial`, `usrSansBox`/`usrTotal`, lignes de stock, `retraitVoulu`, `ecrRefus`. **Jamais un nom de client, d'entreprise, de produit, de box, d'utilisateur, ni une adresse.** Le serveur retrouve QUI travaillait en croisant `dev` avec `cnxData` (`server/index.js:4299` le fait déjà) — l'appareil n'a jamais besoin de nommer quiconque. `tests/test-711.js` refuse le push si une clé du corps envoyé sort de la liste.

**Plafond : par APPAREIL, hors budget partagé.** `quotaOk(map,'t:'+t,…)` (`server/index.js:3303`) est par espace : onze appareils en boucle de rechargement l'épuisent en minutes, et le serveur jette alors exactement le flot qui dit « toute l'entreprise est bloquée ». C'est la faute déjà payée le 11 septembre avec `/health` dans le budget global, corrigée par `PLAFOND_BATTEMENT = 600` (`server/index.js:148`).

**`/api/pouls` doit entrer dans `TM_HORS`** (`app.html:4897`), sinon un 5xx sur la route de rapport produit des rapports sur le canal de rapport.

**Verrous anti-faux-positif du juge.** `syncRetraitVoulu()` (`app.html:7388`) marque les suppressions volontaires — **6 sites d'appel** (`12654`, `18429`, `22509`, `24952`, `25620`, `25670`), **fenêtre réelle 30 s** (`app.html:7224`), pas 10 min. Le serveur ne doit pas le croire sur parole : exiger une corrélation entre deux appareils du même espace, et COMPTER les alertes qu'il étouffe — un verrou dont on ne compte pas les déclenchements devient un interrupteur permanent.

**Fichier.** `beta.html` (par régénération) + `server/index.js`. **`app.html` attend la phrase.**

**Vérification.** `tests/test-711.js` (liste blanche, exécutée), `tests/test-712.js` (le vrai serveur isolé : un pouls sans preuve de clé est refusé, `GET /api/monitor/pouls` exige `monPatronStrict` — `server/index.js:1550`), plus une sonde navigateur sur `beta.html` qui provoque un `localStorage` plein et vérifie que le POST part avec son contenu exact.

**Temps.** 6 h.

**Ce que ça aurait attrapé.** Le chantier #47, « ELAN : la base dépasse le budget du nuage — synchro à l'arrêt » : la taille était mesurée à chaque envoi (`app.html:7161`) puis jetée. Et le chantier #40. Le serveur aurait vu le chiffre monter des jours avant la casse.

**Ce que ça n'attrape pas, et il faut le dire ici :** un appareil qui meurt avant d'avoir parlé ne dit rien. C'est la limite structurelle de toute télémétrie côté client.

---

### Point 3.6 — L'homme mort — **délai visé : 45 min au pire**

**Ce qu'on fait.** Dans `tour.html` et `beta.html` : un compteur d'échecs consécutifs sur les appels qui existent déjà (`app.html:31290-31291`, `versionVerifier` et `ordresVerifier`). Au troisième d'affilée, `registration.showNotification('TEAM OP — l'API ne répond plus depuis N minutes')`.

Une notification LOCALE n'a besoin d'aucun serveur, d'aucun service de push, d'aucun abonnement. **C'est le seul mécanisme du dispositif qui survit à la mort complète du VPS.** Coût : zéro, aucune dépendance, aucune donnée qui sort.

**Anti-faux-positif.** Trois échecs consécutifs, 10 min de garde entre deux notifications, et **un démenti** au retour — la leçon est déjà écrite dans le code (`app.html:7347-7352`) : « une alerte qui ne sait pas se démentir est une alerte qu'on finit par ignorer ».

**Temps.** 2 h.

**Ce que ça aurait attrapé.** La panne du 2 septembre (`deploiement.yml:6-7`). Aujourd'hui, si le VPS tombe, le seul témoin est un cron qui passe toutes les 3 à 6 h — pendant que plus rien ne fonctionne.

---

## 4. Ce qu'on fait des alertes

### Qui reçoit quoi

| niveau | ce que c'est | canal | quand |
|---|---|---|---|
| **ambre** | un chiffre qui bouge (document à 85 % du plafond, rétrécissement en période d'observation) | compteur dans la Tour, rien d'autre | jamais de réveil |
| **rouge** | un client est empêché de travailler, ou une publication est partie de travers | courriel vers `config.alertEmail` + issue GitHub | dans la minute |
| **rouge + urgence** | la plateforme ne reçoit plus rien, le VPS est mort, un espace rétrécit | notification push au patron | dans la minute, **21 h – 7 h : seule la panne de plateforme sonne** |

### ⛔ Le canal est cassé aujourd'hui, et c'est à réparer en premier

`server/install.sh` pose `"contactEmail": "contact@teamop.fr"` et **ne pose jamais `alertEmail`**, qui est pourtant lu à `server/index.js:432`. Toutes les alertes tombent donc dans la boîte partagée du support, au milieu du courrier des clients. **Deux minutes de travail** — sans quoi tout le reste construit un canal qui n'arrive nulle part.

### Une alerte par SUJET, fermée au retour au vert

`surveillance.yml:34-38` commente la PREMIÈRE issue ouverte portant le label `surveillance` : l'issue #3 est ouverte depuis le 13 juillet 2026 avec 31 commentaires. Deux mois de problèmes distincts sur un fil dont le titre ne dit plus rien. C'est un canal qu'on a cessé d'ouvrir.

Le titre devient l'identité de l'alerte : `🚨 Garde rouge — La connexion par identifiant tient — 15/09`. Un sujet déjà ouvert reçoit un commentaire, un sujet nouveau une issue nouvelle.

**Fermeture automatique, avec deux précautions :**
- **uniquement sur `event == push && ref == refs/heads/main`** — sinon un push vert sur `refonte/design` fermerait une alerte de `main` ;
- **deux verts consécutifs**, pas un — un banc qui clignote ouvre/ferme/ouvre, ce qui produit la tempête de notifications puis la mise en sourdine.

### Les cinq règles qui évitent le bruit

1. **Une barrière BLOQUE, ou elle n'existe pas.** C'est toute la différence entre `verification.yml` et l'écluse : un contrôle consultatif pourrit sans qu'on le sache — 26 heures de rouge, personne n'a regardé. Un contrôle bloquant ne peut pas pourrir : son rouge coûte à celui qui pousse, donc il est réparé ou retiré. Les deux sont des décisions ; l'oubli n'en est pas une.
2. **Un rouge sans défaut se traite avec l'urgence d'un défaut du code.** `server/test-connexion.js:204` est l'exemple vivant. C'est le point 2.1, et rien ne devient bloquant avant.
3. **Un rouge se lit en cinq secondes, sans ouvrir les journaux.** L'étape `verdict` écrit un tableau « contrôle · vert/rouge · durée · commande pour rejouer en local ». `bashOutputMaxChars` existe déjà dans ce dépôt pour la même raison.
4. **On alerte sur une VARIATION, jamais sur un niveau.** Le rétrécissement se juge contre le maximum des 24 h, pas contre un absolu. Les failles npm modérées sont écrites, jamais bloquantes. `PLANCHER` (`surveillance.js:69`) est déjà écrit dans cet esprit et le dit : « il ne dit pas la dernière version — ça hurlerait après chaque publication ».
5. **Le dédoublonnage vit sur le disque.** `bugSeen` (`server/index.js:402`) est une `Map` en mémoire, et `deploiement.yml:11-14` redémarre le service à chaque push touchant `server/**` : le dédoublonnage actuel rouvre les vannes à chaque déploiement, en silence.

### Une semaine en ambre avant qu'une seule alerte n'atteigne un téléphone

Les seuils (−30 %, 85 % du plafond, 45 min de silence) sont des paris, pas des mesures. La seule façon honnête de les régler : tout laisser en ambre sept jours, regarder ce qui aurait sonné, ne passer en rouge que ce qui aurait eu raison.

---

## 5. Les échappatoires assumées

Une barrière sans porte de sortie est une barrière qu'on démonte le premier soir d'urgence, en silence, et qui ne revient jamais. Les trois sorties ci-dessous existent **avant** l'écluse, pas après.

### 5.1 Le chemin normal, chronométré

Un correctif d'un caractère dans `app.html` :

| étape | mesuré |
|---|---|
| `garde-pages` (secrets 5 s + syntaxe 0,26 s + `node --check` 4 s + suites 14,4 s + métier 3 s + versions/constantes 2 s) | ~29 s de contrôles |
| checkout + setup-node + `npm ci` mis en cache | ~20 s |
| événement `workflow_run` + `pages.yml` + déploiement Pages | ~60 s |
| **total** | **~2 min** |

C'est **le job serveur qui ne doit jamais garder cette porte** : `server/test-connexion.js` prend 64 s dont une minute d'attente délibérée pour laisser retomber le plafond anti-abus, et sa durée n'est pas déterministe (le sommeil de 61 s se déclenche par appel sur 429). Deux verdicts, deux publications.

### 5.2 Publier hors écluse, exprès et tracé

`workflow_dispatch` sur `pages.yml`, avec **deux entrées obligatoires** : `sha` et `raison`. Il publie sans attendre le verdict, et :

**(a)** écrit `raison` dans `PUBLICATION.json`, champ `horsEcluse` — donc **dans un diff**, pas dans un journal d'exécution que personne ne relit ;
**(b)** ouvre une issue `⚠️ Publication hors écluse — <date> — <raison>` qui ne se ferme qu'à la publication verte suivante ;
**(c)** relance `garde-pages` sur ce `sha` après coup, pour qu'on sache ce qu'on a publié.

**Contournable exprès, impossible à contourner par oubli.**

### 5.3 Quand la garde elle-même est cassée

Un aveu dans le message de commit : le trailer `Publication-forcee: <raison en une phrase>`. Le portier le lit ; son absence bloque. Taper une phrase coûte dix secondes et laisse une trace dans `git log` pour toujours.

C'est ce qui sauve le scénario réel d'aujourd'hui : si le point 2.2 bloquait déjà, ELAN serait gelé depuis 26 heures à cause d'une ligne de test fausse.

### 5.4 Le grand interrupteur, hors du dépôt

Le pouls et la sentinelle de rétrécissement reçoivent chacun leur drapeau de configuration (`poulsActif`, `retrecitActif`, défaut `true`), posés par `server/install.sh` sur une configuration neuve. Le précédent existe et il est bon : `mailPreuveExigee` (`server/install.sh:57`, lu `server/index.js:615`) — une réinstallation ne peut plus rouvrir la porte en silence. Sans ça, le soir où la sentinelle crie, quelqu'un commentera le `setInterval` et ça ne reviendra jamais.

### 5.5 Compter les contournements

`horsEcluse7j` et `forcages7j` dans `/health`, agrégés. Trois en une semaine = **la barrière est mal réglée, pas les gens**.

### 5.6 Le retour arrière du chantier entier

Settings → Pages → « Deploy from a branch » : un clic, ~1 min. **À écrire dans `REPRISE.md` le jour de la bascule.** C'est aussi le remède si GitHub Actions est indisponible — l'écluse fait d'Actions un point de panne unique pour la publication, ce qui n'est pas le cas aujourd'hui.

---

## 6. Ce que ce plan ne couvre pas

1. **Aucun écran n'est rendu.** La garde prouve qu'un fichier s'analyse et que les suites passent. Les 48 `views.*` d'`app.html` ne sont rendus par aucun test (0 occurrence de `views.` dans `tests/`), et le fichier compte 313 usages d'`innerHTML` sans fonction d'échappement centrale. Un écran qui lève à l'ouverture passe l'écluse entière. Seule une sonde navigateur l'attraperait ; `tests/sonde-rejoindre.js` existe comme point de départ. Coût : ~60-90 s par exécution en CI, plus le téléchargement de Chromium. **Délibérément hors de la première version — c'est la barrière suivante, pas une barrière absente par oubli.**

2. **La lenteur n'est mesurée par rien.** La seule suite est `tests/test-705.js`, une expression régulière sur la source. `grep -rn "performance\|lighthouse\|playwright" .github/workflows/` → 0. La régression de frappe du 15/09 coûtait 1 230 ms à la première lettre et 262 ms en médiane — sous le plancher de 2 000 ms de la sentinelle (`app.html:4871`, `:4882`). Elle est structurellement invisible.

3. **21 des 63 suites ne lisent que le texte du fichier.** Environ 269 assertions sur 1 768 sont une expression régulière appliquée à la source : elles passent au vert le jour où quelqu'un reformate une ligne. L'écluse hérite de cette faiblesse — mais la rendre bloquante donne à ces 269 assertions un pouvoir qu'elles ne méritent pas toutes.

4. **La visibilité des box a deux branches jamais parcourues.** `scripts/verifier-permissions.js` exécute bien les vraies `visibleBoxes`/`can`/`perimetreTechIds`, mais son jeu d'essai contient **0 occurrence de `userIdsExclus` et 0 de `conges`** (mesuré `grep -c`). Les deux branches les plus récentes de `app.html:8509-8521` — l'exception `boxExclu` et la délégation pendant les congés — ne sont éprouvées par rien. L'incident du 11 septembre (quatre techniciens sur treize sur un écran vide) est de cette famille.

5. **Le pouls vérifie des FORMES, pas de la VÉRITÉ.** Des compteurs plausibles ne prouvent pas que les données sont justes. Une écriture qui garde 220 fiches mais échange deux adresses de clients passe chaque seuil. Le contenu, le serveur ne DOIT pas le regarder : la base est chiffrée, et c'est une propriété qu'on veut garder.

6. **Le retour arrière du VPS rend le code, pas les données.** `git reset --hard` ne défait rien de ce qu'une mauvaise version a écrit dans `espaces.json`, `monitor.json` ou `bugs.jsonl` entre-temps. Et `espaces.json` tronqué sort TOUTES les entreprises de l'annuaire d'un coup.

7. **Onze mécanismes sur douze dépendent d'`api.teamop.fr`.** S'il meurt, il reste la notification locale (point 3.6) et le cron GitHub. Contourner vraiment cette limite demanderait une seconde machine, donc un coût récurrent que le dépôt n'a pas voulu jusqu'ici.

8. **Sans protection de branche, l'écluse est un défaut, pas un mur.** Quiconque peut pousser peut modifier `PUBLICATION.json` ; un administrateur peut remettre Pages sur la branche (le point 2.6 le rend visible, pas impossible). Les 126 branches rendent `protected: false`. Un ruleset sur `main` exigeant `garde-pages` est gratuit sur un dépôt public et ferme ce trou — **au prix du push direct sur `main`. C'est une décision de Justin, pas d'un agent.**

9. **`apercu/` reste une porte dérobée bénie par `CLAUDE.md`.** `scripts/apercu.sh app.html` produit une copie complète de l'application, `apercu/` « se commite seul sur `main` », et l'épingle ne la couvre pas. Le point 2.2 rend au moins sa syntaxe vérifiée (9 pages aujourd'hui analysées par rien).

10. **Ce dispositif DÉTECTE, il ne répare pas.** `REPRISE.md` l'écrit déjà pour le 15 septembre : « Un correctif arrête une cause, il ne range pas derrière lui. Ce qu'une écriture périmée a déjà effacé chez ELAN ne revient pas tout seul. Personne n'a encore regardé ce qui manque. » La première alerte de rétrécissement dira peut-être qu'il manque des lignes aujourd'hui. Ce sera une information, pas une réparation.

11. **Tant qu'`app.html` n'a pas bougé, ELAN n'émet aucun pouls.** Les points 3.4 et 3.5 vont sur `beta.html`. Ce qui protège ELAN **sans attendre une phrase** : les points 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3. C'est volontaire, et c'est pour ça qu'ils passent en premier.

---

## 7. L'ordre d'exécution

Les étapes marquées **[VPS]** touchent `server/**` : tout push sur `main` les déploie. Elles exigent donc les mêmes preuves qu'une version d'application — suite complète, contrôle de syntaxe, comportement mesuré, fichier servi vérifié après coup — et les chiffres dits dans la réponse.

| # | étape | fichiers | temps | déploie ? |
|---|---|---|---|---|
| 0 | Réparer `server/test-connexion.js:204-214` → 65/65 | `server/test-connexion.js` | 30 min | **[VPS]** redémarre le service, code inchangé |
| 1 | `alertEmail` dans `server/install.sh` | `server/install.sh` | 10 min | **[VPS]** |
| 2 | `garde.yml` en consultatif : deux jobs, `npm ci` AVANT `tests/`, plancher 1923, refus de `SAUTÉE`, `node --check` sur les 104 `.js`, `verifier-syntaxe.js` récursif | `.github/workflows/garde.yml`, `scripts/verifier-syntaxe.js` | 3 h | non |
| 3 | `scripts/verifier-version.js` + `scripts/verifier-constantes.js`, **éprouvés par la négative** sur `f032c3e`/`47a63c2` | 2 scripts | 2 h 30 | non |
| 4 | **La sentinelle de rétrécissement**, en ambre + `tests/test-708.js` | `server/index.js` | 4 h | **[VPS]** |
| 5 | Le filet du processus serveur + `/health` enrichi + `tests/test-709.js` | `server/index.js` | 3 h | **[VPS]** |
| 6 | `surveillance.js` : 5 pages, 6 compteurs, `PLANCHER` depuis `PUBLICATION.json`, **état de `garde.yml`** ; `surveillance.yml` : alerte par sujet, fermeture à deux verts | 2 fichiers | 2 h 30 | non |
| 7 | `garde.yml` devient BLOQUANT, `ci.yml` et `verification.yml` supprimés | workflows | 30 min | non |
| 8 | `PUBLICATION.json` + preuve `sha256` contre le fichier servi | 1 fichier | 45 min | non |
| 9 | `pages.yml` à blanc : diff octet par octet contre `teamop.fr` | `.github/workflows/pages.yml` | 2 h | non |
| 10 | **Bascule Pages → GitHub Actions, avec Justin**, retour arrière écrit dans `REPRISE.md` au préalable | Settings | 30 min | **oui, tout le site** |
| 11 | `serveur.yml` : `workflow_run`, sortie anticipée, `sante()`, retour arrière éprouvé sur le serveur isolé, `if: failure()` | `.github/workflows/serveur.yml` | 4 h | **[VPS]** |
| 12 | Sorties de secours : `workflow_dispatch` + `raison`, trailer `Publication-forcee:`, drapeaux de configuration, compteurs de contournement | workflows + `server/index.js` + `install.sh` | 2 h | **[VPS]** |
| 13 | Hook local branché dans les deux copies + `SessionStart` | `.githooks/pre-commit` | 20 min | non |
| 14 | `tmPush` exporté **sur la bêta** + `tests/test-710.js` + mesure au navigateur | `beta.html` | 2 h | non |
| 15 | Le pouls **sur la bêta** + `/api/pouls` + les cinq corrections + `tests/test-711/712.js` | `beta.html`, `server/index.js` | 6 h | **[VPS]** |
| 16 | Canaux : push au patron, compteur rouge dans l'en-tête de la Tour | `server/index.js`, `tour.html` | 3 h | **[VPS]** |
| 17 | L'homme mort dans `tour.html` et `beta.html` | 2 fichiers | 2 h | non |
| 18 | Mémoire du dépôt : `CLAUDE.md:50,57` (« Quinze suites, 514 vérifications, 2,2 s » → 63 suites, 1 923, 14,4 s), `tests/LISEZMOI.md:3` (« Six suites »), `CLAUDE.md` (« 5 702 lignes » → 6 891), le rituel de `.claude/skills/publication/SKILL.md` autour de `PUBLICATION.json`, et ce que devient « prêt, non déployé » | docs | 2 h | non |
| 19 | *(séparé, et seulement si Justin le veut)* protection de branche sur `main` exigeant `garde-pages` | Settings | 15 min | non |

**Total : ~42 h, soit 5 à 6 jours de travail.**

### Les quatre premiers points protègent ELAN dès demain matin

Les étapes **0, 1, 2 et 4** font une journée. À la fin de cette journée :
- la CI n'est plus un voyant rouge permanent, et le contrôle beta/production retourne tourner après 26 heures d'absence, au moment exact où la bêta devient la règle ;
- les 1 923 vérifications s'exécutent à chaque push, avec la certitude qu'elles n'en sautent aucune ;
- le serveur voit une base d'entreprise rétrécir — la seule classe de défaut qui a vraiment coûté cette semaine, et la seule que les deux propositions d'origine laissaient entière ;
- les alertes arrivent dans une boîte qu'on lit.

Aucune de ces quatre étapes ne demande une phrase de Justin sur `app.html`, et aucune ne touche à GitHub Pages.

### Ce qu'on dit à Justin, sans l'arrondir

- **La bascule de Pages est le seul geste de ce plan qui peut casser plus qu'il ne répare.** Elle se fait avec lui, en début d'après-midi, jamais un vendredi soir, avec le retour arrière déjà écrit.
- **L'écluse est un portier de publication, pas un détecteur d'incidents.** Elle empêche de publier du code cassé ; c'est la sentinelle de rétrécissement (point 3.1) et le pouls (point 3.5) qui répondent à la seconde moitié de sa phrase.
- **Les seuils sont des paris.** Une semaine en ambre avant qu'une seule alerte n'atteigne son téléphone.
- **Et le pouls ne protégera ELAN que le jour où il dira de publier `app.html`.** Jusque-là, il vit sur la bêta — c'est la règle qu'il a posée, et elle n'est pas contournée ici.