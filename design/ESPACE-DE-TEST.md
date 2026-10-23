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
| compte système | root | `teamoptest`, sans connexion, qui **ne voit pas** la production |
| courriels | partent | **captés** : rien ne part, tout se lit sur une page |
| Stripe | clés `live` | clés **de test** (carte `4242 4242 4242 4242`) |
| agents | vrai Claude | vrai Claude, **plafonné à 10 $ par mois** |
| qui y accède | tout le monde | **toi** : un mot de passe devant les pages |

⛔ **Rien de ce document, rien des scripts ne touche à la production.** Le service de test ne peut pas lire ses
dossiers (`InaccessiblePaths`), n'a pas sa clé d'administration Firebase, et ne peut écrire que dans
`/opt/teamop/test/data`. Les bancs `tests/test-2988.js` et `tests/test-2989.js` jouent les scripts dans un faux VPS
et exigent que la production en sorte **octet pour octet identique**.

⚠️ **Pourquoi le port 8095 et pas 8090 :** 8090 est le port que l'installation de la production d'OP MESSAGES
(`install-msg.sh prod`) se réserve. Le prendre ici ferait échouer ce jour-là une installation qui n'a rien à voir.

## Les secrets — et où ils vont

⛔ **Aucune commande de ce document n'affiche un secret.** C'est la règle du dépôt : tu recolles tes sorties dans la
conversation, donc rien de ce qui s'affiche sur le VPS ne doit être secret.

| secret | où il naît | où il vit | ce que tu colles dans la conversation |
|---|---|---|---|
| clé secrète Stripe **de test** (`sk_test_…`) | le tableau de bord Stripe, en mode test | ton gestionnaire de mots de passe, puis `/opt/teamop/test/config.json` (saisie masquée) | **jamais** |
| secret de signature du webhook de test (`whsec_…`) — facultatif | le tableau de bord Stripe | idem | **jamais** |
| mot de passe des pages de test | **toi** (10 caractères au moins) | ton gestionnaire de mots de passe, puis `/etc/nginx/teamop-test.htpasswd` (un hachage, saisie masquée) | **jamais** |
| clé maître de test | sur le VPS, par le script | `/etc/teamop/kek-test` (0600) | jamais — elle n'est même pas affichée, et n'a pas à être mise au séquestre (données jetables) |
| clé des routes d'essai, paire VAPID, clé d'API de test | sur le VPS, par le script | `/opt/teamop/test/config.json` (0640) | jamais |
| clé des agents (Claude) | **déjà dans la configuration de production** | **copiée** par le script dans la configuration de test, sans passer par l'écran | jamais |
| clé de déploiement SSH | **déjà créée** pour le déploiement de la production | le secret GitHub `VPS_SSH_KEY` | rien à faire |

## Avant de commencer (cinq minutes)

1. **Un mot de passe pour les pages de test**, tiré dans ton gestionnaire de mots de passe (10 caractères au moins).
   Nom de l'entrée : « TeamOP — pages de test », identifiant `essai`. Garde-le sous la main : le script le demandera
   deux fois.
2. **La clé secrète Stripe de test.** Tableau de bord Stripe → bascule **« Mode test »** (en haut à droite) →
   *Développeurs* → *Clés API* → **Clé secrète** → *Révéler la clé de test*. Elle commence par **`sk_test_`**.
   Copie-la (rien d'autre à en faire pour l'instant). **Si elle commence par `sk_live_`, tu es en mode production :
   remets l'interrupteur sur « Mode test »** — le script refuse de toute façon une clé de production.
3. Rien d'autre : la clé SSH de déploiement existe déjà, et la clé des agents est recopiée toute seule.

## Étape 1 — La ligne DNS

Chez ton fournisseur de nom de domaine : un enregistrement **A** `test` → `217.154.6.139`, **TTL 300 s**.

Le nom `teamop.fr` est chez **OVH** (IONOS loue le VPS, OVH gère le nom) : espace client OVHcloud → *Web Cloud* →
*Noms de domaine* → `teamop.fr` → onglet *Zone DNS* → *Ajouter une entrée* → type **A**, sous-domaine `test`, cible
`217.154.6.139`, le reste par défaut. L'aperçu doit dire `test.teamop.fr. IN A 217.154.6.139`. On ne touche à **aucune
autre ligne** de la zone : le site et les e-mails de teamop.fr en dépendent.

**Vérification** — sur ton Mac, après quelques minutes :

```bash
dig +short test.teamop.fr
```

**Ce que tu dois voir :** `217.154.6.139`. Rien d'autre → pas encore propagé, on attend (le certificat de l'étape 2
ne peut pas s'obtenir avant, et le script le dit si tu es allé trop vite).

## Étape 2 — L'installation (une commande, rejouable)

Sur le VPS :

```bash
ssh root@api.teamop.fr
curl -fsSL https://raw.githubusercontent.com/justino17-cmd/teamop/main/server/install-test.sh -o /root/install-test.sh
bash /root/install-test.sh
```

> ⚠️ **Tant que la demande de fusion de l'espace de test n'est pas fusionnée**, le fichier n'est pas encore sur `main` :
> remplace `main` par le nom de la branche dans l'adresse, et lance
> `TEAMOP_TEST_BRANCHE=<le nom de la branche> bash /root/install-test.sh`. (Après la fusion, `main` suffit.)

Le script s'annonce par étapes numérotées — `── [1/9] La machine…` jusqu'à `── [9/9] Premier déploiement…` — et **te pose
trois questions d'abord**, avant d'avoir rien changé. Ce que tu tapes **ne s'affiche pas** (c'est normal) :

1. `Clé secrète Stripe de test :` — colle la clé `sk_test_…`, puis Entrée. Tu dois voir
   `→ clé de test reçue (sk_test_…, N caractères)`. *Entrée seule* = tu la poseras plus tard.
2. `Secret du webhook de test :` — **Entrée seule** (c'est facultatif, voir l'étape 4).
3. `Mot de passe des pages :` — celui de l'étape « avant de commencer », puis `Encore une fois :`.

**Ce que tu dois voir à la fin :**

```
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
| `Le certificat n'a pas pu être obtenu` | le DNS ne pointe pas encore sur ce serveur | idem |
| `nginx n'est pas actif` | le VPS n'est pas sur nginx | on s'arrête, rien n'a été changé |
| `la branche « … » n'existe pas sur GitHub` | mauvais nom de branche | relance avec le bon `TEAMOP_TEST_BRANCHE` |
| `des bases de test chiffrées existent et la clé de test est ABSENTE` | un `/etc` écrasé | `rm -rf /opt/teamop/test/data/*` (**données de test seulement**), relance |
| `PREMIER DÉPLOIEMENT a échoué` | l'installation est faite, le code de la branche ne démarre pas | recolle la sortie ; la production n'a pas bougé |

⛔ **Rejouer est sans danger** : un second passage ne change pas un octet (configuration, clé maître de test, mot de
passe), ne recharge pas nginx pour rien, et **ne régénère jamais la clé maître** si des données de test existent.

## Étape 3 — La vérification

**Dans le navigateur** : ouvre **https://test.teamop.fr/essais.html**.

**Ce que tu dois voir :** une fenêtre qui demande un identifiant et un mot de passe — `essai` et le mot de passe choisi.
Puis la page d'accueil des essais, avec le bandeau **« ESPACE DE TEST — <branche> · <commit> »**, les liens
« Se connecter comme client / prospect / patron / collaborateur », « Voir les courriels captés » et « Remettre l'espace
à zéro ».

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

## Étape 4 — Le webhook Stripe de test (facultatif)

⚠️ **Aujourd'hui, le serveur n'a pas de route de webhook** : il relit Stripe lui-même (Hugo « vérifie par relecture de
Stripe, pas de webhook »). Cette étape est donc **facultative** — elle prépare le jour où une route existera, et
ne te coûte rien. Si tu veux gagner du temps : saute-la.

1. Tableau de bord Stripe, **en mode test** → *Développeurs* → *Webhooks* → *Ajouter un point de terminaison*.
2. **Adresse :** `https://test.teamop.fr/api/stripe/webhook`
3. **Événements :** `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
4. *Ajouter le point de terminaison*, puis dans sa fiche : **Clé de signature** → *Révéler* → copier (`whsec_…`).
5. Sur le VPS :

   ```bash
   bash /root/install-test.sh webhook
   ```

   Réponds à la question `Secret du webhook de test :` en collant le secret (rien ne s'affiche), Entrée. Les autres
   questions ne sont pas reposées.

**Ce que tu dois voir :** `→ secret reçu`, puis l'installation repasse sans rien changer d'autre et finit sur `✅`.

Pour payer en test, une carte : `4242 4242 4242 4242`, n'importe quelle date future, n'importe quel code. Pour
redonner une clé Stripe de test : `bash /root/install-test.sh stripe`. Pour changer le mot de passe des pages :
`bash /root/install-test.sh motdepasse`.

## Au quotidien

- **Chaque demande de fusion vers `main` met sa branche en essai d'elle-même** (workflow « Espace de test »). Dans la
  demande de fusion, onglet *Checks* : « Bancs du serveur » puis « Mettre en essai sur test.teamop.fr ». Compte
  deux à quatre minutes. Le résumé du job donne le lien et le commit.
- **À la main :** GitHub → *Actions* → « Espace de test » → *Run workflow* (laisser vide = le dernier commit de la
  branche choisie).
- **Comment savoir ce qui est en essai :** le bandeau de chaque page de test dit la branche et le commit.
- **Un déploiement raté laisse l'ancien en service, et le dit** : le job devient rouge, `test.teamop.fr` continue de
  montrer la version précédente.
- **Tant que l'installation n'est pas faite**, le workflow sort en vert avec la phrase « non installé : … rien n'a été
  déployé » — un vert ne veut alors pas dire « déployé ».
- **Les courriels** de l'espace de test ne partent pas : « Voir les courriels captés » les liste.
- **Les agents** parlent au vrai Claude, plafonnés à 10 $ par mois (tous agents confondus). La clé est celle de la
  production, **copiée** : une fuite de la config de test se règle en changeant la clé des agents, une fois.
- **Remettre à zéro :** le bouton de `essais.html` (avec confirmation) vide les données de test et resème les comptes.
  Il ne peut pas atteindre autre chose que `/opt/teamop/test/data`.

## Tout défaire

```bash
systemctl disable --now teamop-api-test
rm /etc/systemd/system/teamop-api-test.service
systemctl daemon-reload
rm /etc/nginx/sites-enabled/teamop-test.conf /etc/nginx/sites-available/teamop-test.conf
nginx -t && systemctl reload nginx
rm -rf /opt/teamop/test /etc/teamop/kek-test /etc/nginx/teamop-test.htpasswd
```

Chaque ligne ne vise que l'espace de test. La ligne DNS `test` se retire chez OVH.

## Ce que ce document ne couvre pas

- **Les trois chantiers sont distincts :** ce document (VPS et déploiement), le **mode test du serveur** (routes
  `/api/essais/…`, courriels captés, comptes semés) et les **pages de test** (`scripts/essais-build.js`). Le déployeur
  appelle `node scripts/essais-build.js <dossier> <commit> <branche>` ; une branche qui ne le porte pas est refusée,
  avec un message qui le dit, **sans rien changer** à ce qui est en essai.
- **Le DNS de `teamop.fr` n'est pas touché**, ni le site, ni `api.teamop.fr`.
