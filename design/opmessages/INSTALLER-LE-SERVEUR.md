# Installer le serveur d'OP MESSAGES — les gestes de Justin, dans l'ordre

Pour `design/opmessages/SERVEUR.md` § 4, étape 1 (« gestes de Justin »). Ce document dit **chaque geste**,
ce que tu **colles** et ce que tu dois **voir**. Si ce n'est pas ce qui s'affiche, **on s'arrête** et tu
recolles la sortie dans la conversation — on ne continue jamais « en espérant ».

⛔ **Aucune commande de ce document n'affiche un secret.** C'est la règle du 24 septembre 2026 : tu recolles
tes sorties dans la conversation, donc rien de ce qui s'affiche sur le VPS ne doit être secret. Les trois
secrets d'OP MESSAGES (la clé maître, la clé SSH de déploiement, la paire VAPID) naissent ou se rangent
**sans passer par un écran partagé** :

| secret | où il naît | où il vit | ce que tu colles dans la conversation |
|---|---|---|---|
| clé maître (64 hexadécimaux) | sur **ton Mac**, dans le presse-papiers | ton gestionnaire de mots de passe, puis `/etc/opmsg/beta.kek` (saisie masquée) | **jamais** |
| clé SSH de déploiement **de la bêta** | sur **ton Mac** | le secret GitHub `VPS_SSH_KEY_MSG_BETA` (sa moitié publique sur le VPS) | **jamais** la privée |
| clé SSH de déploiement **de la production** (plus tard) | sur **ton Mac**, **une autre paire** | le secret de l'**environnement** `msg-prod` : `VPS_SSH_KEY_MSG_PROD` | **jamais** la privée |
| paire VAPID (notifications) | sur le VPS, par le script | `/etc/opmsg/beta.json` (chmod 600) | jamais — elle n'est même pas affichée |

⚠️ **Tant que le code d'OP MESSAGES (`server-msg/`) n'est pas sur `main`, rien de ceci n'est possible** : le
script d'installation copie le déployeur et la pose de clé depuis `main`. On attend donc le « pousse ».
⛔ **L'ORDRE DU « POUSSE » : le serveur d'OP GESTION d'abord, OP MESSAGES ensuite.** La porte bêta d'OP MESSAGES
reconnaît une personne à l'**identifiant de son compte** (`id`, rendu par `/api/beta/login`) et relit les accès en une
requête (`/api/beta/etat` avec `ids`) : ces deux lignes sont dans `server/index.js`, et un OP GESTION qui ne les a pas
**ferme la porte** (503 `porte_indisponible`) — fermée par défaut, jamais ouverte par défaut. Le déploiement du serveur
(`scripts/preparer-deploiement-serveur.sh`) précède donc l'installation d'OP MESSAGES. Rien d'autre n'est touché chez
OP GESTION : ni `teamop-api` (hors ces deux lignes), ni `/opt/teamop`, ni le bloc d'`api.teamop.fr` du proxy.

---

## 1. Trancher le proxy (nginx ou Caddy) — avant tout

Sur le VPS :

```bash
ssh root@api.teamop.fr
ss -ltnp | grep -E ':(80|443) '
```

**Colle le résultat** (il ne porte aucun secret : des ports et des noms de programme).
**Ce que tu dois voir** : le nom `nginx` **ou** le nom `caddy` sur les lignes `:80` et `:443`.
Le script détecte lui-même le proxy actif ; cette vérification sert à ce qu'on soit d'accord avant de
l'installer. Si tu vois les deux, ou aucun : on s'arrête ici.

## 2. Le DNS de la bêta

Chez ton fournisseur de nom de domaine : un enregistrement **A** `msg-beta` → `217.154.6.139`, **TTL 300 s**.
(Le DNS de la production — `msg` — se pose plus tard, voir la section 11 ; `turn` attend l'étape 7.)

Sur ton Mac, après quelques minutes :

```bash
dig +short msg-beta.teamop.fr
```

**Ce que tu dois voir** : `217.154.6.139`. Rien d'autre → pas encore propagé, on attend. Le certificat
(section 6) ne peut pas s'obtenir avant.

## 3. La clé maître — elle naît sur TON Mac, pas sur le VPS

Le service chiffre tout ce qu'il range avec cette clé. **Sans elle, la base est définitivement illisible**
(risque n° 1 du serveur). On la fabrique ici, dans le presse-papiers, **sans rien afficher** :

```bash
openssl rand -hex 32 | pbcopy
```

**Ce que tu dois voir** : rien. C'est normal. Colle immédiatement le presse-papiers dans une **nouvelle
entrée** de ton gestionnaire de mots de passe (nom : « OP MESSAGES — clé maître bêta »). Le champ doit
faire **64 caractères**. Fais une **seconde copie** (papier, comme pour la clé d'OP GESTION).
⛔ **Ne la colle pas dans la conversation**, même « pour vérifier ».

## 4. La clé SSH de déploiement — aussi sur ton Mac

Elle permet à GitHub de lancer le déploiement, et **rien d'autre** (le VPS la lie à une commande forcée).

```bash
ssh-keygen -t ed25519 -N "" -C opmsg-deploiement-beta -f ~/opmsg-deploiement-beta
pbcopy < ~/opmsg-deploiement-beta.pub
```

**Ce que tu dois voir** : l'empreinte de la clé et un petit dessin (ce n'est pas un secret) ; le presse-papiers
contient maintenant la ligne **publique** (`ssh-ed25519 AAAA… opmsg-deploiement-beta`). Garde-la : le script la
demandera à la section 6.

Puis la moitié **privée** va dans GitHub, directement, sans rien afficher :

```bash
gh secret set VPS_SSH_KEY_MSG_BETA < ~/opmsg-deploiement-beta
rm -P ~/opmsg-deploiement-beta
```

**Ce que tu dois voir** : `✓ Set Actions secret VPS_SSH_KEY_MSG_BETA`. Si tu n'as pas `gh` : sur GitHub, dépôt →
Settings → Secrets and variables → Actions → *New repository secret* → nom `VPS_SSH_KEY_MSG_BETA`, valeur =
`pbcopy < ~/opmsg-deploiement-beta` puis coller dans le champ ; puis `rm -P ~/opmsg-deploiement-beta`.
Après la suppression, il n'existe plus de copie de la clé privée hors de GitHub.

⛔ **Une clé par instance, jamais la même pour la bêta et la production.** Sur le VPS la ligne publique est liée à
`deployer.sh --seulement=beta` : cette clé ne déploie **que** la bêta, même si on lui demande « prod ». Et celle de la
production sera un secret de l'**environnement** `msg-prod` (section 11), que GitHub ne remet à un job qu'après ton
approbation : une branche qui lance un workflow ne peut donc pas lire la clé de la production.

## 5. Télécharger le script d'installation

Sur le VPS (toujours connecté en root) :

```bash
curl -fsSL https://raw.githubusercontent.com/justino17-cmd/teamop/main/server-msg/install-msg.sh -o /root/install-msg.sh
```

**Ce que tu dois voir** : rien (le prompt revient). Le script est un **fichier** : lis-le si tu veux avant
de le lancer (`less /root/install-msg.sh`) — il ne se lance pas par un tuyau, parce qu'il te pose des
questions.

## 6. Lancer l'installation de la bêta

```bash
bash /root/install-msg.sh beta
```

Il fait, dans l'ordre : l'utilisateur système `opmsg`, ses dossiers sous `/opt/opmsg/beta`, **son propre miroir**
du dépôt (jamais `/opt/teamop/repo`), la configuration (avec la paire VAPID, sans l'afficher), puis il te
**demande** :

1. `Colle la clé maître (64 hexadécimaux, rien ne s'affiche), puis Entrée :` → **colle** (le presse-papiers de la
   section 3 si tu l'as encore, sinon la copie du gestionnaire). **Rien ne s'affiche**, c'est voulu.
2. `Colle-la une seconde fois, pour être sûr de la copie :` → colle de nouveau. Si les deux diffèrent, il
   s'arrête sans rien écrire.
3. `Colle la ligne PUBLIQUE de la clé de déploiement…` → colle la ligne `ssh-ed25519 AAAA…` de la section 4
   (c'est la **publique** : elle s'affiche, ce n'est pas un secret).

Puis l'unité systemd durcie, le proxy (un fichier à part pour `msg-beta.teamop.fr`, validé **avant** d'être
rechargé), le certificat, et le premier déploiement.

**Ce que tu dois voir à la fin** :

```
bascule : première release → xxxxxxxx
/health : ok=true instance=beta sha=xxxxxxxx
déployé : beta xxxxxxxx

✓ OP MESSAGES (beta) installé.
```

**Colle toute la sortie** dans la conversation : elle ne contient aucun secret par construction (toute clé
de 64 hexadécimaux y serait remplacée par `[clé masquée]`).

Les quatre sorties d'erreur possibles, et ce qu'elles veulent dire :

- **`⛔ Aucune clé saisie. On ne la génère pas ici`** → tu as fait Entrée sans coller. Rien n'est écrit. Recommence.
- **`Des données existent ici et la clé est ABSENTE`** → un **incident**, pas une installation : il faut la clé
  du séquestre (la copie du gestionnaire), jamais une clé neuve.
- **`⛔ nginx refuse la configuration`** (ou `Caddy refuse`) → **rien n'a été rechargé**, le fichier d'OP MESSAGES est
  remis comme avant, `api.teamop.fr` n'a pas bougé. Colle la sortie.
- **`Le certificat n'a pas pu être obtenu`** → le DNS (section 2) ne pointe pas encore sur ce serveur. Le
  port 80 est prêt ; relance `bash /root/install-msg.sh beta` plus tard — il est rejouable (deux passages
  donnent le même état, rien n'est écrasé : ni la configuration, ni la clé).

## 7. Vérifier que le service lit la clé — sans l'afficher

```bash
cmp -s /etc/opmsg/beta.kek /run/credentials/teamop-msg@beta.service/kek && echo "✓ le service lit la clé" || echo "✗ le service ne voit pas la clé"
```

**Ce que tu dois voir** : `✓ le service lit la clé`. Si c'est `✗` : colle-le, ne change rien.

## 8. Relire chaque copie de la clé — sans l'afficher

Une fois **par copie** (gestionnaire, papier — pour le papier, tu **tapes** la clé ; espaces et majuscules acceptés).
Cette commande demande la clé en saisie masquée, la compare à celle du serveur et ne dit que « identique »
ou la position du premier caractère faux :

```bash
K=; while [ -z "${K// /}" ]; do read -rsp "Colle (ou tape) la clé, puis Entrée : " K || break; echo; done; K=${K// /}; K=${K,,}; V=$(cat /etc/opmsg/beta.kek); echo "longueur : ${#K} (attendu 64)"; [ "$K" = "$V" ] && echo "✓ identique" || { i=0; while [ $i -lt 64 ] && [ "${K:$i:1}" = "${V:$i:1}" ]; do i=$((i+1)); done; echo "✗ différente — première différence : caractère n° $((i+1))"; }; unset K V i
```

**Ce que tu dois voir** : `longueur : 64 (attendu 64)` puis `✓ identique`, **deux fois** (une par copie).
⚠️ Cette commande lit la clé dans une variable du shell, elle ne l'affiche pas. Ne la remplace pas par un `cat`.

## 9. Vérifier de l'extérieur

Sur ton Mac :

```bash
curl -s https://msg-beta.teamop.fr/health
```

**Ce que tu dois voir** : une ligne JSON avec `"ok":true`, `"instance":"beta"` et un `"sha"` (le même que celui
de la section 6). `/health` est public et agrégé : aucun identifiant, aucune adresse. **Colle-la.**

## 10. Vérifier que GitHub sait déployer

Sur GitHub : *Actions* → **Déploiement d'OP MESSAGES** → *Run workflow* → cible `beta`, SHA vide → *Run*.

**Ce que tu dois voir** : les trois jobs verts — « Bancs d'OP MESSAGES », « Déployer la bêta »
(`déjà en service` ou `déployé : beta …`), et « Vérifier que la bêta répond de l'extérieur » sans
avertissement. Désormais, **chaque poussée sur `main` qui touche `server-msg/`** déploie la bêta toute seule,
**après** que les bancs ont rendu leur verdict ; la production, jamais toute seule (section 11).

---

## 11. La production — PAS MAINTENANT

L'instance `prod` ne s'installe que sur ta phrase **« publie OP MESSAGES »**, après l'étape 9 de la conception
(relecture adverse, textes légaux, essai de restauration réussi). Quand ce jour viendra, dans l'ordre :

1. **Un enregistrement DNS `msg`** → `217.154.6.139` (TTL 300 s), vérifié par `dig +short msg.teamop.fr`.
2. **Une clé maître NEUVE, distincte de celle de la bêta** (section 3, autre nom dans le gestionnaire, autre
   copie papier). Jamais la même : une fuite de l'une ne doit pas ouvrir l'autre.
3. **L'environnement GitHub `msg-prod`** : dépôt → Settings → Environments → *New environment* → `msg-prod` →
   *Required reviewers* → **toi**. Sans relecteur obligatoire, la protection n'existe pas : c'est ce réglage
   qui transforme ta phrase en geste, le workflow ne peut pas le poser lui-même.
   **Et la clé SSH de la production y vit** : sur ton Mac, `ssh-keygen -t ed25519 -N "" -C opmsg-deploiement-prod -f ~/opmsg-deploiement-prod`,
   puis `gh secret set VPS_SSH_KEY_MSG_PROD --env msg-prod < ~/opmsg-deploiement-prod` (secret **de l'environnement**, pas du dépôt),
   `rm -P ~/opmsg-deploiement-prod`, et la ligne publique `pbcopy < ~/opmsg-deploiement-prod.pub` que le script demandera à
   l'étape suivante.
4. Sur le VPS (sans le drapeau, le script refuse et ne fait rien) :

   ```bash
   OPMSG_PUBLIE=oui bash /root/install-msg.sh prod
   ```

5. Sur GitHub : *Run workflow* → cible `prod` → ton **approbation** dans l'environnement `msg-prod` → les jobs.

## 12. Si ça tourne mal

- **Un déploiement échoue** : le déployeur revient **tout seul** au lien précédent (`retour arrière réussi`)
  et le dit. Le service reste sur le code d'avant. Rien à faire que de coller la sortie.
- **Reculer volontairement** : *Run workflow* avec le SHA voulu **et** la case « retour » cochée (sans elle, un commit plus
  ancien que celui en service est ignoré — deux poussées rapprochées ne doivent pas faire reculer le service).
- **Voir où en est le service** (sur le VPS) :
  `systemctl status teamop-msg@beta --no-pager | head -5` et `ls -l /opt/opmsg/beta/`.
  Le journal du service (`journalctl -u teamop-msg@beta -n 30`) ne se colle que s'il est vide d'adresses, de noms
  et de jetons — le service est écrit pour n'en écrire aucun, mais relis avant de coller.
- **Relancer l'installation** est toujours permis : elle est rejouable et ne réécrit ni la configuration ni la clé.

## Ce que cette installation ne fait PAS

- **Pas de sauvegarde hors site** : c'est l'étape 3 (bucket distinct, clés propres, exercice de restauration). Les données
  de la bêta sont **jetables** et le disent ; **aucune personne extérieure à l'équipe** n'entre avant qu'un essai de
  restauration ait réussi.
- **Pas de TURN** (appels), pas de Stripe, pas de courriel d'envoi : étapes 7, 5 et 2.
- **Pas de pare-feu ni de bande passante** : non vérifiés (§ 6 de la conception).
- **Aucune modification de `app.html`, `sw.js`** ni du bloc d'`api.teamop.fr`. Côté `server/`, deux lignes seulement
  (l'identifiant de compte dans `/api/beta/login`, la liste `ids` dans `/api/beta/etat`) — voir l'ordre du « pousse » plus haut.

## Ce qui reste ouvert après la relecture adverse (à trancher avant la production, pas avant la bêta)

- **Un seul utilisateur système `opmsg` pour la bêta et la production** : un code qui s'exécuterait dans la bêta pourrait
  lire les fichiers de la base de production (scellée, mais ses tailles et son journal sont lisibles). Un utilisateur par
  instance demande de toucher l'unité, le déployeur et l'installation ensemble.
- **`deployer.sh`, `lancer.sh` et l'unité ne sont copiés qu'à l'installation** : un correctif du déployeur sur `main` n'atteint
  le VPS qu'en relançant `bash /root/install-msg.sh beta` (rejouable, sans risque).
- **Un administrateur peut en retirer un autre**, y compris le créateur du groupe (« tous les administrateurs sont égaux ») :
  décision de produit à confirmer.
- **Pas de sauvegarde de `msg.db`** avant l'étape 3 : ne pas mettre la production en service avant.
