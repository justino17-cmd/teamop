# L'espace de test — test.teamop.fr

Justin, 23 octobre 2026 : « toute modification, site, application, la Tour, je veux des espaces de test, et après
on pousse ; chaque test expliqué dans un ordre ».

Ce document dit **chaque geste**, ce que tu **tapes** et ce que tu dois **voir**. Une étape, une vérification. Si ce
n'est pas ce qui s'affiche, **on s'arrête** et tu recolles la sortie dans la conversation — on ne continue jamais
« en espérant ».

## Ce que c'est

Un **second serveur TeamOP**, sur le même VPS que la production, mais **séparé de tout** :

| | production | espace de test |
|---|---|---|
| adresse | `teamop.fr`, `api.teamop.fr` | `test.teamop.fr` (pages **et** API, même adresse) |
| code | `/opt/teamop/repo` | `/opt/teamop/test` — **la branche en essai** |
| données | `/opt/teamop/data` | `/opt/teamop/test/data` (jetables) |
| configuration | `/opt/teamop/config.json` | `/opt/teamop/test/config.json` |
| clé maître | `/etc/teamop/kek` | `/etc/teamop/kek-test` (une autre, tirée au hasard) |
| service | `teamop-api` (port 8080) | `teamop-api-test` (port **8095**) |
| compte système | root | `teamoptest`, sans connexion — la production lui est **invisible** (voir plus bas ce que cela veut dire, étape par étape) |
| courriels | partent | **captés** : rien ne part, tout se lit sur une page |
| Stripe | clés `live`, tarifs réels | clé **de test** et **dix tarifs de test** créés par l'installation (carte `4242 4242 4242 4242`) |
| agents | vrai Claude, clé de la production | vrai Claude, avec **une clé à lui** et une limite de dépense de **10 $ par mois posée chez Anthropic** |
| qui y accède | tout le monde | **toi** : un mot de passe devant les pages |
| proxy | nginx **ou** Caddy | le même que celui du serveur (l'installation le détecte) |

⛔ **Rien de ce document, rien des scripts ne touche à la production.** Ce qui le garantit, endroit par endroit — et ce
que chacun ne garantit PAS :

- **le service de test** ne peut pas lire les dossiers de la production (`InaccessiblePaths`), n'a pas sa clé
  d'administration Firebase, ne parle à aucun Firebase ni à Stripe en mode réel, et ne peut écrire que dans
  `/opt/teamop/test/data` et `monitor.json` ;
- **le code d'une branche en essai** (la décompression, `npm ci`, la fabrication des pages) ne tourne jamais « tout court » :
  il tourne dans une **cellule** (`systemd-run`) — système en lecture seule sauf un dossier, production et clés invisibles,
  pas de réseau sauf pour `npm ci`. L'installeur **vérifie** la cellule sur ta machine avant le premier déploiement
  (`deployer-test --sonde`) et s'arrête si elle fuit ;
- **root n'exécute jamais ce qu'une branche a écrit** : le déployeur est un fichier de root, `/usr/local/sbin/deployer-test`,
  téléchargé **à son SHA exact** par l'installeur. Une demande de fusion qui modifie `server/deployer-test.sh` n'a **aucun
  effet** sur le VPS tant que tu ne relances pas l'installeur (`bash /root/install-test.sh`, après la fusion) ;
- **la CI n'a pas la clé de la production** : elle a une clé à elle (`VPS_SSH_KEY_TEST`), dans un environnement GitHub qui
  attend **ton approbation**, et qui ne sait faire qu'**une chose** sur le VPS (commande forcée : mettre un commit en essai) ;
- **le compte de test ne doit pas pouvoir lire les fichiers de la production** — l'installeur le **mesure** (`test -r`) avant de
  rien installer, et s'arrête avec les deux commandes `chmod` à passer si ce n'est pas le cas.

Les bancs `tests/test-2988.js` et `tests/test-2989.js` jouent les scripts dans un faux VPS et exigent que la production en
sorte **octet pour octet identique**. ⚠️ Le faux VPS n'applique pas la cellule (il ne le peut pas) : c'est
`deployer-test --sonde` qui le vérifie, **sur la vraie machine**, à l'installation.

⚠️ **Pourquoi le port 8095 et pas 8090 :** 8090 est le port que l'installation de la production d'OP MESSAGES
(`install-msg.sh prod`) se réserve. Le prendre ici ferait échouer ce jour-là une installation qui n'a rien à voir.

## Les secrets — et où ils vont

⛔ **Aucune commande de ce document n'affiche un secret.** C'est la règle du dépôt : tu recolles tes sorties dans la
conversation, donc rien de ce qui s'affiche sur le VPS ne doit être secret.

| secret | où il naît | où il vit | ce que tu colles dans la conversation |
|---|---|---|---|
| clé secrète Stripe **de test** (`sk_test_…`) | le tableau de bord Stripe, en mode test | ton gestionnaire de mots de passe, puis `/opt/teamop/test/config.json` (saisie masquée) | **jamais** |
| clé Anthropic **dédiée au test** (`sk-ant-…`) | la console Anthropic (un espace de travail « test »), **pas** celle de la production | ton gestionnaire de mots de passe, puis `/opt/teamop/test/config.json` (saisie masquée) | **jamais** |
| mot de passe des pages de test | **toi** (10 caractères au moins) | ton gestionnaire de mots de passe, puis le fichier de mots de passe du proxy (un hachage, saisie masquée) | **jamais** |
| clé maître de test | sur le VPS, par le script | `/etc/teamop/kek-test` (0600) | jamais — elle n'est même pas affichée, et n'a pas à être mise au séquestre (données jetables) |
| clé des routes d'essai, paire VAPID, clé d'API de test | sur le VPS, par le script | `/opt/teamop/test/config.json` (0640) | jamais |
| clé de déploiement SSH — la **privée** | ton Mac (`ssh-keygen`) | le secret GitHub `VPS_SSH_KEY_TEST`, **de l'environnement `essai-test`** (copiée au presse-papiers, jamais affichée) | **jamais** |
| clé de déploiement SSH — la **publique** (`.pub`) | ton Mac | `/root/.ssh/authorized_keys` du VPS, à commande forcée | elle n'est pas secrète : tu peux la coller |

⛔ **Ne colle jamais** dans la conversation : l'**adresse** d'un bouton « Se connecter comme… » de `essais.html` (elle porte la clé
des routes d'essai), ni le **journal d'accès du proxy** de `test.teamop.fr`. Ce qui se colle sans risque : la sortie de
l'installation, le fichier `build.log` du VPS et `journalctl -u teamop-api-test -n 50`.

## Avant de commencer (dix minutes)

1. **Un mot de passe pour les pages de test**, tiré dans ton gestionnaire de mots de passe (10 caractères au moins).
   Nom de l'entrée : « TeamOP — pages de test », identifiant `essai`. Garde-le sous la main : le script le demandera
   deux fois.
2. **La clé secrète Stripe de test.** Tableau de bord Stripe → bascule **« Mode test »** (en haut à droite) →
   *Développeurs* → *Clés API* → **Clé secrète** → *Révéler la clé de test*. Elle commence par **`sk_test_`**.
   Prends la **clé secrète standard, pas une clé restreinte** (créer les tarifs de test demande le droit d'écrire les produits).
   **Si elle commence par `sk_live_`, tu es en mode production : remets l'interrupteur sur « Mode test »** — le script
   refuse de toute façon une clé de production.
3. **Une clé Anthropic dédiée à l'espace de test**, **avec sa limite de dépense** : console Anthropic → un nouvel espace de
   travail « test » → *Limits* → dépense mensuelle **10 $** → *API keys* → créer une clé dans cet espace. Elle commence par
   **`sk-ant-`**. ⛔ **Pas la clé de la production** : l'espace de test exécute le code de branches pas encore relues ; le
   plafond de 10 $ du serveur est un plafond de code, que du code peut contourner — la limite chez Anthropic, elle, tient. Le
   script refuse la clé de la production s'il la reconnaît.
4. **Une clé SSH pour la CI**, faite sur ton Mac (rien ne s'affiche) :

   ```bash
   ssh-keygen -t ed25519 -N "" -C "teamop-essai-deploiement" -f ~/.ssh/teamop-essai-deploiement
   ```

   Deux fichiers naissent : `teamop-essai-deploiement` (la **privée** — elle ne s'affiche jamais) et `teamop-essai-deploiement.pub`
   (la publique, que le script du VPS te demandera).

## Étape 0 — Quel proxy tient le VPS ? (à dire avant tout)

Le VPS sert OP MESSAGES et OP Courrier par **Caddy** (REPRISE.md, 7 octobre 2026) ; la fiche du dépôt dit « derrière nginx ».
L'installation gère **les deux**, mais elle a besoin de savoir lequel tourne :

```bash
ssh root@api.teamop.fr
systemctl is-active nginx caddy
ss -ltnp | grep -E ':(80|443) '
```

**Ce que tu dois voir :** `active` pour **un seul** des deux (l'autre `inactive`), et le nom du programme (`nginx` ou `caddy`) à côté
de `:80` et `:443`. Colle ces trois lignes dans la conversation (aucun secret). Si les **deux** sont `active`, ne lance pas
l'installation : dis-le, il faudra trancher (`TEAMOP_TEST_PROXY=…`).

## Étape 1 — La ligne DNS

Chez ton fournisseur de nom de domaine : un enregistrement **A** `test` → `217.154.6.139`, **TTL 300 s**.

Le nom `teamop.fr` est chez **OVH** (IONOS loue le VPS, OVH gère le nom) : espace client OVHcloud → *Web Cloud* →
*Noms de domaine* → `teamop.fr` → onglet *Zone DNS* → *Ajouter une entrée* → type **A**, sous-domaine `test`, cible
`217.154.6.139`, le reste par défaut. L'aperçu doit dire `test.teamop.fr. IN A 217.154.6.139`. On ne touche à **aucune
autre ligne** de la zone : le site et les e-mails de teamop.fr en dépendent. (Si les DNS de `teamop.fr` ont été déplacés chez
Cloudflare — REPRISE.md décrit cette procédure — la ligne se crée **là**, en nuage **gris**, pas orange.)

**Vérification** — sur ton Mac, après quelques minutes :

```bash
dig +short test.teamop.fr
```

**Ce que tu dois voir :** `217.154.6.139`. Rien d'autre → pas encore propagé, on attend (le certificat ne peut pas
s'obtenir avant, et le script le dit si tu es allé trop vite).

## Étape 2 — GitHub : l'environnement protégé et sa clé

Sans cette étape, la CI ne peut pas mettre une demande de fusion en essai (le workflow le dit et sort en vert : « rien n'a été
déployé »). Dans le dépôt sur GitHub : *Settings* → *Environments* → *New environment* → nom **`essai-test`** →
*Required reviewers* : **toi** → *Save protection rules*. Puis dans cet environnement : *Add environment secret* → nom
**`VPS_SSH_KEY_TEST`**. Pour la valeur, **sur ton Mac** (rien ne s'affiche) :

```bash
pbcopy < ~/.ssh/teamop-essai-deploiement
```

puis colle dans le champ *Value* (⌘V) et enregistre. **Ensuite**, retire la clé privée de ton Mac — elle n'a plus d'usage :

```bash
rm ~/.ssh/teamop-essai-deploiement
```

**Ce que tu dois voir :** l'environnement `essai-test` avec **un** secret `VPS_SSH_KEY_TEST` et ton nom en relecteur. ⚠️ Ne mets
**pas** ce secret dans les secrets du dépôt : c'est l'environnement qui le garde derrière ton approbation.

## Étape 3 — L'installation (une commande, rejouable)

**Sur ton Mac**, pour copier la clé publique (elle n'est pas secrète) :

```bash
pbcopy < ~/.ssh/teamop-essai-deploiement.pub
```

**Sur le VPS** (la première ligne ouvre la session ; **les lignes suivantes se tapent une fois connecté**, sur le VPS) :

```bash
ssh root@api.teamop.fr
df -h /
curl -fsSL https://raw.githubusercontent.com/justino17-cmd/teamop/main/server/install-test.sh -o /root/install-test.sh
head -3 /root/install-test.sh
bash /root/install-test.sh
```

**Ce que tu dois voir avant de lancer :** `df -h /` doit montrer **au moins 3 Go** libres (le script le vérifie aussi) ; `head -3` doit
montrer une première ligne `#!/usr/bin/env bash` puis un cadre qui parle de **l'installation de l'ESPACE DE TEST**. Autre chose
(une page d'erreur de GitHub, par exemple) → ne lance pas, recolle.

> ⚠️ **Tant que la demande de fusion de l'espace de test n'est pas fusionnée**, le fichier n'est pas encore sur `main` :
> remplace `main` par `claude/espace-de-test` dans l'adresse, et lance
> `TEAMOP_TEST_BRANCHE=claude/espace-de-test bash /root/install-test.sh`. (Après la fusion, `main` suffit.)
> Le cache de `raw.githubusercontent.com` peut garder un fichier jusqu'à cinq minutes après une poussée : le `head -3` sert à ça.

Le script s'annonce par étapes numérotées — `── [1/9] La machine…` jusqu'à `── [9/9] La cellule, puis le déploiement…`. Il **vérifie
la machine d'abord** (le proxy, Node, la place sur le disque), puis **te pose ses questions toutes ensemble, avant d'avoir rien
changé** (étape `[2/9]`). Ce que tu tapes **ne s'affiche pas** (c'est normal), sauf la clé publique :

1. `Clé secrète Stripe de test :` — colle la clé `sk_test_…`, puis Entrée. Tu dois voir
   `→ clé de test reçue (sk_test_…, N caractères)`. *Entrée seule* = tu la poseras plus tard.
2. `Clé Anthropic de l'espace de test :` — colle la clé `sk-ant-…` **dédiée**, puis Entrée. Tu dois voir `→ clé reçue (sk-ant-…, N caractères)`.
   *Entrée seule* = les agents resteront muets en test.
3. `Mot de passe des pages :` — celui de l'étape « avant de commencer », puis `Encore une fois :`.
4. `Clé publique de déploiement :` — **⌘V** : c'est la ligne `ssh-ed25519 AAAA…` que tu as copiée (elle s'affiche, c'est une clé publique).
   *Entrée seule* = la CI ne pourra pas encore mettre une demande de fusion en essai.

**Deux moments durent sans rien afficher :** `[4/9]` (le dépôt se télécharge, ~1 minute) et `[9/9]` (le code et ses dépendances s'installent,
**1 à 3 minutes**). Le script le dit avant chacun. **Ne coupe pas** : un silence n'est pas un blocage.

**Ce que tu dois voir au milieu** (étape 6 : la configuration), quand la clé de test est posée — c'est le paiement
de test qui se prépare, sans rien de plus à faire :

```
  Stripe : clé de test en place
  … (le résumé du créateur de tarifs, par exemple « 10 tarif(s) créé(s) », jamais la clé)
  tarifs de test : prêts (table écrite dans la configuration, clé non affichée)
```

**Ce que tu dois voir à la fin :**

```
── [9/9] La cellule, puis le déploiement…
  ✓ la cellule tient : production invisible, écriture bornée à son dossier, pas de réseau
── Vérifications locales
  ✓ le serveur de test répond (/health ok)
  ✓ les pages demandent le mot de passe (401 sans lui)
  ✅ Espace de test installé.
  Ouvre :  https://test.teamop.fr/essais.html
```

Si une ligne commence par `✗` ou `⛔`, ou si le script s'arrête : **recolle la sortie** (elle ne porte aucun secret).
Les cas connus :

| ce que tu vois | ce que ça veut dire | ce que tu fais |
|---|---|---|
| `test.teamop.fr ne se résout pas encore` | la ligne DNS n'est pas posée ou pas propagée | étape 1, attends, **relance** le script (rien n'est refait) |
| `Le certificat n'a pas pu être obtenu` (nginx) | le DNS ne pointe pas encore sur ce serveur | idem |
| `aucun proxy actif (ni nginx ni Caddy)` / `nginx ET Caddy sont actifs` | le script ne sait pas lequel tient les ports 80 et 443 | étape 0, colle la sortie ; ensuite `TEAMOP_TEST_PROXY=nginx` (ou `caddy`) devant la commande |
| `Caddy refuse la configuration` / `nginx refuse la configuration` | le fichier posé est refusé par le proxy | **rien n'a été rechargé**, ton ancien fichier est remis ; recolle la sortie |
| `PEUT LIRE des fichiers de la PRODUCTION` | le compte de test lirait, par exemple, le fichier des sessions de la Tour | le script **dit les `chmod` à passer** (`chmod 700 /opt/teamop/data`, `chmod 600 /opt/teamop/monitor.json`…) ; passe-les puis relance. **Pas de `chmod` sur `/opt/teamop` lui-même** |
| `C'est la clé de la PRODUCTION` | tu as collé la clé Anthropic de la production | crée la clé dédiée (« avant de commencer », 3) |
| `C'est une clé PRIVÉE` | tu as collé le mauvais fichier | c'est le fichier qui finit par `.pub` |
| `La cellule où tournent les branches ne tient pas` | le code d'une branche pourrait voir la production ou sortir par le réseau | **rien n'est déployé** ; recolle la sortie (elle dit ce qui fuit) |
| `introuvable au commit …` | GitHub injoignable, ou la branche ne porte pas l'espace de test | relance, ou choisis la branche (`TEAMOP_TEST_BRANCHE`) |
| `la branche « … » n'existe pas sur GitHub` | mauvais nom de branche | relance avec le bon `TEAMOP_TEST_BRANCHE` |
| `des bases de test chiffrées existent et la clé de test est ABSENTE` | un `/etc` écrasé | la commande `find … -delete` que le script affiche (**données de test seulement**, elle garde le compteur de dépense des agents), puis relance |
| `PREMIER DÉPLOIEMENT a échoué` | l'installation est faite, le code de la branche ne démarre pas | recolle la sortie ; la production n'a pas bougé |

⛔ **Rejouer est sans danger** : un second passage ne change pas un octet (configuration, clé maître de test, mot de passe), ne
recharge pas le proxy pour rien, et **ne régénère jamais la clé maître** si des données de test existent.

⛔ **Rejouer ne remplace pas ce qui est en essai.** Le dernier geste du script **redéploie le commit déjà servi** (il le lit dans
`/opt/teamop/test/commit-servi`), pas `main` : changer une clé avec `bash /root/install-test.sh stripe` pendant qu'une demande de fusion
est en essai laisse **cette demande de fusion** en essai (le serveur redémarre pour relire la clé, c'est tout). Pour mettre une
branche précise : `TEAMOP_TEST_BRANCHE=<la branche> bash /root/install-test.sh`.

⚠️ **Après la fusion d'une modification de `server/deployer-test.sh`, `server/install-test.sh`, des modèles de proxy ou de
`server/stripe-essai-prix.js`**, relance `bash /root/install-test.sh` : c'est le seul moment où le déployeur de root et les modèles
changent. C'est voulu — une demande de fusion ne peut pas modifier ce que root exécute.

## Étape 4 — La vérification

**Dans le navigateur** : ouvre **https://test.teamop.fr/essais.html**.

**Ce que tu dois voir :** une fenêtre qui demande un identifiant et un mot de passe — `essai` et le mot de passe choisi.
Puis la page d'accueil des essais, avec le bandeau **« ESPACE DE TEST — <branche> · <commit> »**, « Serveur de test : répond »,
les liens « Se connecter comme client / prospect / patron / collaborateur », « Voir les courriels captés » et « Remettre l'espace
à zéro ». Si la page dit « Limite connue : le paiement ne se joue pas encore ici », les tarifs de test n'ont pas été créés
(`bash /root/install-test.sh stripe`).

**En ligne de commande**, sur ton Mac (aucune de ces commandes n'affiche de secret) :

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://test.teamop.fr/essais.html
curl -s https://test.teamop.fr/health
curl -s -o /dev/null -w '%{http_code}\n' https://test.teamop.fr/api/essais/courriels
curl -s https://api.teamop.fr/health
```

**Ce que tu dois voir, dans l'ordre :**

1. `401` — les pages sont fermées à qui n'a pas le mot de passe ;
2. une ligne JSON qui contient `"ok":true` — le serveur de test répond ;
3. `403` — les routes d'essai refusent sans leur clé (`404` si la branche en essai est antérieure au mode test : ce
   n'est pas une erreur, le script de déploiement le dit aussi) ; **jamais `200`** ;
4. une ligne JSON qui contient `"ok":true` — **la production répond comme avant**.

## Étape 5 — Le paiement de test (carte 4242) : rien de plus à faire

Les dix tarifs de production n'existent pas en mode test (Stripe répondrait « No such price »). L'installation crée donc,
chez Stripe **en mode test**, les dix tarifs équivalents (mêmes montants, même devise, même rythme que la page
d'abonnement) et les range dans la configuration de test (`stripe.prixEssai`) ; le serveur de test et les pages de test
les utilisent. **Ce que tu fais :** rien, c'est l'étape 3. **Ce que tu vois :** la ligne `tarifs de test : prêts`. Sur
`essais.html`, une étape « Payer un abonnement avec la carte de test » apparaît dans le parcours ; tant que la ligne
n'a pas été vue, la page dit au contraire « Limite connue : le paiement ne se joue pas encore ici » — elle ne promet
jamais un paiement qui échouerait.

Pour payer : `4242 4242 4242 4242`, n'importe quelle date future, n'importe quel code. Le script ne crée jamais rien dans
le compte réel : il **refuse** toute clé qui n'est pas `sk_test_…` / `rk_test_…`. (Une clé restreinte `rk_test_…` est acceptée par le
script mais ne permet en général pas de créer les tarifs : prends la clé secrète standard.) Et le **serveur de test lui-même vide** toute
clé Stripe qui n'est pas une clé de test, même posée à la main dans sa configuration.

**Pas de webhook à déclarer dans le tableau de bord Stripe :** le serveur n'a pas de route de webhook, il relit lui-même
les abonnements chez Stripe — déclarer un point de terminaison n'aurait donc aucun effet.

Pour redonner une clé Stripe de test (et retrouver ou recréer les tarifs de test — sans doublon, le script les
retrouve par leur clé de recherche) : `bash /root/install-test.sh stripe`, qui redemande la clé masquée puis finit sur
`tarifs de test : prêts`. Pour changer la clé Anthropic de test : `bash /root/install-test.sh anthropic`. Pour changer le mot de
passe des pages : `bash /root/install-test.sh motdepasse`. Pour poser une autre clé publique de déploiement : `bash /root/install-test.sh cle`.

## Le cycle — de la demande de fusion à la fusion

C'est ce qui se passe, dans l'ordre, pour **chaque modification** :

1. **Une demande de fusion est ouverte** par l'intégrateur (Claude), avec les tests de la modification dans `essais/parcours.json`
   (voir plus bas). Sans ce fichier, la page de test le dit : « Aucun test propre à cette modification n'est fourni » — tu ne vois alors que le
   parcours de base, qui teste la plomberie de l'espace de test, **pas** la modification.
2. **La vérification passe** (onglet *Checks* : « Quel commit, quelle branche », « Bancs du serveur »), puis le job « Mettre en essai (approbation de
   Justin) » **attend toi** : GitHub t'affiche *Review pending deployments* → coche `essai-test` → *Approve and deploy*. C'est ce geste qui met la
   branche en essai (2 à 4 minutes).
3. **Tu testes** le parcours dans l'ordre, sur la page `essais.html`.
4. **Tu dis OK**, ou tu décris ce qui ne va pas — l'intégrateur corrige, la demande de fusion se met à jour, tu approuves de nouveau.
5. **On fusionne.** ⚠️ Conséquences à connaître :
   - fusionner un commit qui touche **`server/`** (y compris `install-test.sh`, `deployer-test.sh` et les modèles de proxy) **déploie le serveur de
     PRODUCTION** (`deploiement.yml`, `paths: server/**`), après ses bancs. Rien de plus à faire, mais ce n'est plus un essai ;
   - `app.html` et `sw.js` : la règle de publication reste ta phrase explicite ;
   - si le commit modifie le déployeur de root ou les modèles : **relance `bash /root/install-test.sh`** (étape 3) pour qu'ils prennent effet.
6. **Les autres demandes de fusion ouvertes** doivent être remises à jour sur `main` : tant qu'une demande n'a pas `scripts/essais-build.js`, sa mise
   en essai sort en ✗ rouge avec « ne porte pas scripts/essais-build.js ».

À savoir :

- **Une seule demande de fusion est en essai à la fois** : la **dernière poussée** gagne. Le bandeau de chaque page de test dit la branche et le commit en
  essai — **c'est lui qui répond**, pas la demande de fusion. Un simple push sur une vieille demande remplace une plus récente.
- **Deux demandes ouvertes en même temps** : les exécutions se mettent en file (`concurrency`), GitHub n'en garde qu'une en attente, l'autre apparaît
  **« annulée » en gris**. Un check gris « annulé » veut dire **« remplacé par plus récent »**, pas « échec ».
- **Le bouton « Run workflow »** (Actions → « Espace de test ») **n'existe qu'une fois le workflow fusionné sur `main`**. Avant, pour relancer : dans la
  demande de fusion, *Checks* → *Re-run all jobs* (même approbation).
- **Un déploiement raté laisse l'ancien en service, et le dit** : le job devient rouge, `test.teamop.fr` continue de montrer la version précédente.
- **Tant que l'installation n'est pas faite**, ou que `VPS_SSH_KEY_TEST` est absent de l'environnement, le workflow sort en vert avec la phrase
  « rien n'a été déployé » — un vert ne veut alors pas dire « déployé ».

### Les tests de la modification : `essais/parcours.json`

L'intégrateur écrit les tests de **sa modification** dans `essais/parcours.json` — un tableau de `{ titre, quoi, attendu, lien? }`, dans l'ordre où tu
les fais. Le déployeur le donne au fabricant des pages : ils s'affichent **avant** le parcours de base sous « Les tests de cette modification », chacun avec « Ce
que tu dois voir ». Sans ce fichier : la page dit qu'aucun test propre n'est fourni.

## Au quotidien

- **Comment savoir ce qui est en essai :** le bandeau de chaque page de test dit la branche et le commit.
- **Les courriels** de l'espace de test ne partent pas : « Voir les courriels captés » les liste (quatre sont déjà là après la préparation de l'espace).
- **Les agents** parlent au vrai Claude avec la clé **de l'espace de test** : la limite de 10 $ par mois est celle de l'espace de travail chez Anthropic ;
  le serveur de test s'impose aussi 10 $ (et réserve la dépense des appels simultanés), mais ce plafond-là est du code. La clé n'est **pas** celle de la production.
- **Remettre à zéro :** le bouton de `essais.html` (avec confirmation) vide les données de test **et le journal / les incidents de la Tour de test**, puis resème les
  comptes. Le serveur **redémarre** : la page attend de le voir revenir (une vingtaine de secondes) avant de dire « C'est fait ». **Tes anciennes connexions ne valent plus** :
  reconnecte-toi avec les boutons. Il ne peut pas atteindre autre chose que `/opt/teamop/test` ; le compteur de dépense des agents est gardé exprès.

## Tout défaire

Sur le VPS. Chaque ligne ne vise que l'espace de test ; **rien de tout cela ne touche la production** :

```bash
systemctl disable --now teamop-api-test
rm /etc/systemd/system/teamop-api-test.service
systemctl daemon-reload
rm /usr/local/sbin/deployer-test
sed -i '/ teamop-essai-deploiement$/d' /root/.ssh/authorized_keys
userdel teamoptest
rm -rf /opt/teamop/test /etc/teamop/kek-test /var/www/teamop-test-acme
```

Puis **selon le proxy** (étape 0) :

```bash
# nginx
rm /etc/nginx/sites-enabled/teamop-test.conf /etc/nginx/sites-available/teamop-test.conf /etc/nginx/teamop-test.htpasswd
nginx -t && systemctl reload nginx
certbot delete --cert-name test.teamop.fr
```

```bash
# Caddy
rm -rf /etc/caddy/teamop-test
sed -i '/^import \/etc\/caddy\/teamop-test\/\*\.caddy$/d' /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile && systemctl reload caddy
```

Ce que ces commandes laissent, et qu'on retire à la main : la **ligne DNS `test`** (chez OVH, ou Cloudflare), le **workflow** « Espace de test » (qui, tant qu'il
existe, tourne à chaque demande de fusion et sort vert avec « rien n'a été déployé » — `git rm .github/workflows/deploiement-test.yml` dans un commit), et
l'**environnement `essai-test`** de GitHub avec son secret. Sans `certbot delete`, le renouvellement automatique du certificat échouerait et enverrait des alertes d'expiration à
`contact@teamop.fr`.

## Ce que ce document ne couvre pas

- **Les trois chantiers sont distincts :** ce document (VPS et déploiement), le **mode test du serveur** (routes
  `/api/essais/…`, courriels captés, comptes semés) et les **pages de test** (`scripts/essais-build.js`). Le déployeur
  appelle `node scripts/essais-build.js <dossier> <commit> <branche> [--parcours …]` ; une branche qui ne le porte pas est refusée,
  avec un message qui le dit, **sans rien changer** à ce qui est en essai.
- **Le DNS de `teamop.fr` n'est pas touché**, ni le site, ni `api.teamop.fr`.
- **La clé `VPS_SSH_KEY` de la production** (secret du dépôt, shell root sans commande forcée) reste lisible par toute branche qui modifie un workflow : ce
  n'est pas l'espace de test qui l'a créé, mais il ne l'utilise plus. La déplacer dans un environnement protégé, comme `msg-prod`, est un chantier à part.
