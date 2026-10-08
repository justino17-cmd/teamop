# Installer le serveur d'OP MESSAGES — les gestes de Justin, dans l'ordre

Pour `design/opmessages/SERVEUR.md` § 4, étape 1 (« gestes de Justin »), puis l'étape 2 (les SMS, section 10 bis) et l'étape 3 (la sauvegarde,
section 10 ter), puis les notifications (section 10 quater), Messages Pro (l'étape 5 : Stripe, section 10 quinquies), les réunions programmées (l'étape 6 : le courriel d'invitation, section 10 sexies) et les appels à deux (l'étape 7 : le relais coturn, section 10 septies). Ce document dit **chaque geste**,
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
| clé de **sauvegarde** (64 hexadécimaux, **différente** de la clé maître) | sur **ton Mac**, dans le presse-papiers | ton gestionnaire de mots de passe, puis `/etc/opmsg/beta.json` (saisie masquée) | **jamais** |
| clés d'accès du **coffre de sauvegarde** (clé d'accès + clé secrète) | la console IONOS | ton gestionnaire de mots de passe, puis `/etc/opmsg/beta.json` (saisie masquée) | **jamais** |
| clé Stripe **restreinte** d'OP MESSAGES (`rk_test_…`, puis `rk_live_…`) | le tableau de bord Stripe | ton gestionnaire de mots de passe, puis `/etc/opmsg/beta.json` (saisie masquée) | **jamais** (les identifiants de tarif `price_…`, eux, ne sont pas des secrets) |
| identifiant et **mot de passe d'application** du relais SMTP (courriel d'invitation) | la console de ton fournisseur de messagerie | ton gestionnaire de mots de passe, puis `/etc/opmsg/beta.json` (saisie masquée) | **jamais** (l'hôte, le port et l'adresse d'expédition, eux, ne sont pas des secrets) |
| secret partagé du **relais d'appels** (coturn) | **sur le VPS**, tiré au hasard par `install-turn.sh` | `/etc/opmsg/beta.json` (0600) et la configuration de coturn (root et son compte) | **jamais** — tu n'as rien à saisir ni à garder, et le script ne l'affiche pas |
| paire de clés du **serveur de visio** (LiveKit) | **sur le VPS**, tirée au hasard par `install-sfu.sh` | `/etc/opmsg/beta.json` (0600) et `/etc/opmsg/visio-beta.yaml` (root et son compte) | **jamais** |

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
(Le DNS de la production — `msg` — se pose plus tard, voir la section 11 ; `turn`, pour le relais d'appels, se pose à la section 10 septies.)

Sur ton Mac, après quelques minutes :

```bash
dig +short msg-beta.teamop.fr
```

**Ce que tu dois voir** : `217.154.6.139`. Rien d'autre → pas encore propagé, on attend. Le certificat
(section 6) ne peut pas s'obtenir avant.

⚠️ **Vécu le 2 octobre 2026 : le nom teamop.fr est chez OVH, pas chez IONOS.** IONOS loue le VPS, OVH gère le nom (le
registre des .fr le dit : bureau d'enregistrement OVH, serveurs `dns200.anycast.me` et `ns200.anycast.me`). Le geste :
espace client OVHcloud → *Web Cloud* → *Noms de domaine* → `teamop.fr` → onglet *Zone DNS* → *Ajouter une entrée* → type
**A**, sous-domaine `msg-beta`, cible `217.154.6.139`, le reste par défaut. L'aperçu doit dire
`msg-beta.teamop.fr. IN A 217.154.6.139`. On ne touche à **aucune autre ligne** de la zone : le site et les e-mails de
teamop.fr en dépendent. La réponse est arrivée chez Google et chez Cloudflare en moins de deux minutes.

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

⚠️ **Vécu le 2 octobre 2026** :
- **une capture d'écran copiée remplace le presse-papiers.** Entre la copie et le collage, aucune capture. Pour voir que
  la copie a bien eu lieu sans rien afficher : `pbpaste | tr -d '\n' | wc -c` doit répondre `64` ;
- **l'application « Mots de passe » de macOS exige une adresse de site complète** (« Adresse du site web incomplète »
  bloque l'enregistrement). On y met `example.com`, **jamais une adresse en teamop.fr** : Safari proposerait alors cette
  clé sur les pages de connexion de teamop.fr. Nom d'utilisateur `msg-beta`, note « Clé maître OP MESSAGES bêta » ; on la
  retrouve en cherchant « msg-beta ». Pour la bêta, cette copie a suffi (pas de copie papier) ; la production aura les
  deux, comme OP GESTION.

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

⚠️ **Vécu le 2 octobre 2026, sans `gh`, dans Safari** : *New repository secret* avec la clé privée collée a répondu
**« Failed to add secret » cinq fois de suite**. Dans le même temps, un secret d'essai au texte tapé est passé, puis un autre
avec une clé jetable collée. La cause n'est pas établie : ce n'est pas le nom (vérifié avec un texte tapé), ni le collage.
**Ce qui a marché** : créer `VPS_SSH_KEY_MSG_BETA` avec un texte tapé (« bonjour »), puis le crayon ✎ → coller la clé →
*Update secret* → « Secret updated ». La paire avait été refaite d'une traite, pour que la privée ne vive que dans le
presse-papiers : `ssh-keygen` dans `/tmp`, la `.pub` déplacée en `~/opmsg-deploiement-beta.pub`, la privée copiée par
`pbcopy` puis effacée aussitôt. Ne pas compter sur `rm -P` pour « écraser » : sur un Mac récent, c'est une suppression
ordinaire.

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
   (c'est la **publique** : elle s'affiche, ce n'est pas un secret). Vécu le 2 octobre 2026 : le presse-papiers tient alors
   la clé maître, donc la ligne publique se recopie depuis une **deuxième fenêtre** de Terminal ouverte sur le Mac
   (Cmd + N) : `pbcopy < ~/opmsg-deploiement-beta.pub`, puis Cmd + V dans la fenêtre du serveur.

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

## 10 bis. Les SMS d'OP MESSAGES (OVHcloud) — pour l'étape 2, avant la première inscription réelle

Le compte PERSO naît et se connecte par **numéro de téléphone** (un code par SMS) : c'est ta décision du 1er octobre 2026, et **OVHcloud**
envoie les SMS. Tant que ces gestes ne sont pas faits, **rien ne casse** : la bêta tourne en mode « journal » (aucun SMS ne part, le code n'est
écrit nulle part), et la production répond 503 `sms_indisponible`. Il n'y a **aucune urgence** avant que l'interface d'inscription soit branchée.

⛔ **Les trois clés d'OVH sont des secrets** (clé d'application, secret d'application, clé de consommateur) : elles vont **de la console OVH à
ton gestionnaire de mots de passe**, puis **au VPS en saisie masquée** (`configurer-sms.js`). Tu ne les recolles **jamais** dans la conversation.
Ce que tu peux recoller : le nom du service SMS, l'expéditeur, et tout ce que le script et `/health` affichent.

⚠️ **Ce que je n'ai PAS pu vérifier** : je n'ai pas de compte OVH. Les noms d'écrans ci-dessous sont ceux que je connais de l'espace client
d'OVHcloud ; s'ils ont changé, **dis-moi ce que tu vois** plutôt que de deviner. Et l'envoi réel — un SMS qui arrive vraiment — n'a jamais été
constaté : c'est la vérification du geste 7.

### 1. Créer le compte SMS

Espace client OVHcloud → **Télécom** → **SMS** → commander un **compte SMS** (« sms-xx123456-1 » : c'est son **nom de service**, à noter). Rien à
acheter d'autre à cette étape.

### 2. L'expéditeur

Dans ce compte SMS, créer un **expéditeur alphanumérique** : `OPMSG` (1 à 11 lettres ou chiffres, sans espace ni accent) et attendre sa
validation par OVH. ⚠️ Dans certains pays (États-Unis, Canada, Inde, quelques autres) l'expéditeur alphanumérique est **réécrit ou refusé** par
les opérateurs : le SMS peut arriver d'un numéro quelconque, ou ne pas arriver. C'est à constater pays par pays, avec de vrais téléphones.

### 3. L'envoi à l'international

Tu veux « une connexion pour **tous** les pays » : dans les réglages du compte SMS, **autoriser l'envoi vers l'étranger** (OVH limite les
destinations par défaut ; l'écran exact est à relire). Ouvrir tous les pays est possible **parce que le service plafonne l'argent, pas la
géographie** : voir le geste 8.

### 4. Les crédits — et SANS recharge automatique

Acheter des crédits (un SMS vers la France coûte 1 crédit, soit 0,06 € d'après la grille relevée le 1er octobre 2026 ; vers l'étranger, de 0,25 à
14 crédits selon le pays). ⛔ **Ne PAS activer la recharge automatique** : c'est la deuxième ligne de défense, derrière les budgets du service.
Ton solde de crédits est le **plafond absolu** de ce qu'une fraude peut dépenser, même si tout le reste cédait. Pour démarrer : **100 €** de
crédits suffisent pour des semaines (le service s'arrête de lui-même à 20 € par jour).

**Ce que ça coûte**, calculé par le service (`sms-prix.js`, grille OVH : 1 crédit = 0,06 €, **sans** la marge de 25 % que le service ajoute à son
estimation) — avec une inscription = 1 SMS (le cas idéal), ou 1,15 SMS (15 % de renvois et de nouveaux appareils, plus réaliste) :

| | 1 000 inscriptions, 1 SMS | 1 000, 1,15 SMS | 10 000, 1 SMS | 10 000, 1,15 SMS |
|---|---|---|---|---|
| **France seulement** | 60 € | 69 € | 600 € | 690 € |
| **Mélange international** (ci-dessous) | 95 € | 110 € | 953 € | 1 096 € |

Le mélange supposé (à remplacer par les vrais pays quand on les connaîtra) : France 40 %, Belgique 10 %, Maroc 8 %, États-Unis 6 %, Algérie,
Sénégal, Côte d'Ivoire, Inde, Brésil 4 % chacun, Réunion, Cameroun, Royaume-Uni, Allemagne 3 % chacun, Canada, Espagne 2 % chacun : **1,59
crédit par SMS en moyenne, soit 0,095 €**. ⚠️ Un seul pays cher change tout : 10 000 SMS vers la Russie coûtent **8 370 €** (13,95 crédits).
Avec le service, **une attaque vers la Russie coûte au plus 3 € par jour** (le budget de ce pays).

### 5. Créer les clés d'API — avec les SEULS droits nécessaires

Sur la page de création de clés d'OVHcloud (`https://eu.api.ovh.com/createToken/`, depuis ton navigateur — pas depuis le VPS) : un nom (« opmsg-sms »), une durée
« illimitée », et **exactement deux droits**, restreints à TON service (remplace `sms-xx123456-1`) :

```
GET   /sms/sms-xx123456-1
POST  /sms/sms-xx123456-1/jobs
```

**Rien d'autre** : pas `/*`, pas `/me`, pas de droit de lecture des factures, pas de suppression. Avec ces deux droits, une clé volée peut envoyer
des SMS (jusqu'à épuisement des crédits, d'où le geste 4) et lire l'état du service — pas toucher à ton compte OVH. La page affiche les trois
valeurs (clé d'application, secret d'application, clé de consommateur) **une seule fois** : copie-les **directement** dans ton gestionnaire de mots
de passe. (Si la page ne donne que la clé de consommateur, l'application se crée à part sur `https://eu.api.ovh.com/createApp/` ; l'écran dira.)

### 6. Les poser sur le VPS — saisie masquée

Sur le VPS, en root :

```bash
OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-sms.js
```

Il demande cinq valeurs : le nom du service, l'expéditeur, puis les trois clés (**masquées** : rien ne s'affiche pendant la frappe). Il **éprouve** les clés
avant d'écrire (un appel signé qui ne coûte rien, aucun SMS) et dit tout de suite si la clé est fausse (« OVH refuse la signature »), si le droit manque
(« 403 »), ou si le service n'existe pas (« 404 »). Il n'écrit le fichier qu'une fois tout validé, en gardant son propriétaire. **Ce qu'il affiche peut se
recoller.** (Il lit ta frappe caractère par caractère, sans jamais l'écrire à l'écran : même un retour arrière, une flèche ou un collage ne
font rien paraître — vérifié sous un vrai terminal.) Puis :

```bash
systemctl restart teamop-msg@beta
```

### 7. Vérifier — un vrai SMS sur ton téléphone

```bash
curl -s https://msg-beta.teamop.fr/health
```

**À voir** : `"sms":{"mode":"ovh", …}` (et non `journal` ni `inactif`), `"envoyes24h":0`, `"budgetJourPct":0`. Puis, avec **ton propre numéro** (en
format international, `+33…`), un seul essai :

```bash
curl -s -X POST https://msg-beta.teamop.fr/api/tel/code -H 'Content-Type: application/json' -H 'Origin: https://msg-beta.teamop.fr' -H 'X-OPM: 1' -d '{"numero":"+33XXXXXXXXX"}'
```

**À voir** : `{"ok":true,"delai_s":60,"expire_s":600,"longueur":6}` — et un SMS « Votre code OP MESSAGES : ****** » sur ton téléphone, dans la minute.
**Si le SMS n'arrive pas** : colle la réponse du `curl` et la ligne `sms` de `/health` (rien de secret). `"ovhEchecs":1` veut dire qu'OVH a refusé l'envoi
(clé, droit, crédits ou expéditeur) ; un `503` veut dire qu'un budget ou un plafond a coupé. Dis-moi aussi **ce que le téléphone affiche comme
expéditeur** (c'est le geste 2, constaté).

### 8. Les budgets — ce qui coupe, et ce que tu peux régler

Valeurs par défaut du service (fichier `/etc/opmsg/beta.json`, bloc `sms`, validé au démarrage) :

| réglage | défaut | ce que ça borne |
|---|---|---|
| `budgetJour` / `budgetHeure` | **20 €** / 5 € | tout le service : au pire 600 € par mois |
| `budgetPaysJour` / `budgetPaysHeure` | **3 €** / 1,5 € | un pays : ~30 SMS belges par jour, **2 russes** |
| `budgetPays` | — | un pays à lui : `{"IN":{"jour":8,"heure":3}}` |
| `prix` | grille OVH | un prix à corriger : `{"BR":0.09}` (en euros par SMS) |
| `interdits` | — | des plages refusées d'office : `["+2519","+9919"]` |
| `bouclier` | automatique, par pays en emballement **et dès 40 % du budget** | `{"pays":["IN"]}` force la preuve de travail pour un pays ; `{"global":true}` pour tous (urgence) |
| `emballement.partBudget` | **0,4** | la part d'un budget (pays ou total, heure ou jour) à partir de laquelle la preuve de travail est exigée ; `1` = jamais |
| `reserve` | **40 %** du budget global pour la France et ses départements | `{"part":0.4,"pays":["FR","RE"]}` : les autres pays n'en prennent que 60 % ; `{"part":0}` supprime la réserve |

**Quand `/health` dit `budgetJourPct` ≥ 80** (ou que la surveillance crie) : regarde si c'est un vrai succès (beaucoup d'inscriptions) ou une attaque
(un pays seul qui explose, `boucliers` ≥ 1). Un vrai succès se règle en **relevant `budgetPays` pays par pays** — jamais en relevant tout d'un coup.
Une attaque se règle en **forçant le bouclier** du pays, ou en l'interdisant (`interdits`). Les gens qui tombent sur le budget voient « SMS
momentanément indisponibles » : c'est le prix de la protection, et ça ne dure pas plus de 24 h. Dès 40 % d'un budget, le service demande à chacun une
**preuve de travail** (une seconde de calcul sur le téléphone, 5 s d'attente) : un attaquant la paie, une personne honnête la fait sans le savoir.
Ce qui est « indisponible » pour les AUTRES pays (60 % du budget global) ne l'est pas pour la France (la réserve).
⚠️ Les défauts sont **prudents pour un lancement** : avec 3 € par pays, un pays comme l'Inde ou le Brésil ne laisse passer que quelques dizaines
d'inscriptions par jour. **Dis-moi dans quels pays tu attends des gens** et je règle `budgetPays` en conséquence.

### 9. Ce qu'OVH reçoit (pour les textes légaux)

Le **numéro de téléphone** et le **texte du SMS** (qui contient le code) — rien d'autre : ni nom, ni conversation, ni adresse. OVHcloud devient
sous-traitant au sens du RGPD (à ajouter à `sous-traitance.html` et au registre des traitements avant l'ouverture au public). Le service ne garde
**jamais** un numéro en clair : scellé au repos, haché pour l'unicité, absent des journaux et de `/health`.

---

## 10 ter. La sauvegarde hors site d'OP MESSAGES (IONOS) — pour l'étape 3, avant qu'une personne hors de l'équipe n'entre

Toutes les heures, le service fait une copie de sa base, la **brouille** (chiffrement) avec une clé qui ne vit que chez toi, et l'envoie dans un **coffre**
(un *bucket* IONOS) qui n'est pas celui d'OP GESTION. Puis il la **relit** aussitôt : une copie qu'on n'a pas relue n'est pas une copie. Les photos et
les fichiers partent aussi, une seule fois chacun. Les copies de plus de 14 jours disparaissent toutes seules.

Tant que ces gestes ne sont pas faits, **rien ne casse** : `/health` dit `"configuree":false` et la bêta tourne (ses données sont jetables, et le disent).
Mais **aucune personne extérieure à l'équipe n'entre** avant qu'un **essai de restauration** ait réussi (geste 6).

⛔ **Trois secrets** : la clé d'accès du coffre, sa clé secrète, et la **clé de sauvegarde**. Ils vont **de la console (ou de ton Mac) à ton gestionnaire de
mots de passe**, puis **au VPS en saisie masquée** (`configurer-sauvegarde.js`). Tu ne les recolles **jamais** dans la conversation. Ce que tu peux
recoller : tout ce que les scripts et `/health` affichent.

⛔ **Deux clés pour relever cette sauvegarde, pas une.** La **clé de sauvegarde** ouvre l'enveloppe ; la **clé maître** (section 3) ouvre ce qu'il y a
dedans — les messages, les noms, les numéros. Il faut les deux. Elles sont **différentes** (le service refuse de démarrer si elles sont égales) et rangées
dans **deux entrées** du gestionnaire.

⚠️ **Ce que je n'ai PAS pu vérifier** : je n'ai pas accès à ton compte IONOS. Les noms d'écrans ci-dessous sont ceux que je connais ; s'ils ont changé,
**dis-moi ce que tu vois** plutôt que de deviner. Et le coffre sur lequel tout a été éprouvé est un **faux**, sur ma machine : il recalcule les signatures
comme AWS le documente, il prouve que le code signe juste — pas qu'IONOS accepte. Le **vrai** dépôt est le premier constat du geste 4, et c'est pour ça
que le script l'éprouve avant d'écrire quoi que ce soit.

### 1. Créer le coffre

Console IONOS → **Object Storage** → créer un **bucket** :

- un **nom à toi**, en minuscules, sans espace ni accent (par exemple `opmsg-sauvegardes`). C'est **ce nom-là** que tu taperas au geste 4 — pas le nom du menu ;
- la **même région** que celui d'OP GESTION (`eu-central-4`, Francfort) : l'adresse du coffre est alors `https://s3.eu-central-4.ionoscloud.com` ;
- ⛔ **distinct de ceux d'OP GESTION** : une panne, une fuite ou une erreur de l'un ne doit jamais toucher l'autre ;
- ⛔ **celui de la BÊTA seulement** : la production aura **son** bucket et **sa** paire de clés (section 11). Une clé de la bêta — où l'on essaie du code — ne doit jamais pouvoir effacer les copies de la production ;
- ⛔ **sans verrouillage d'objet ni versionnement**, si la console les propose : le service efface lui-même les copies de plus de 14 jours, et un coffre qui
  refuse d'effacer grossit sans fin (le geste 4 le détecte).

### 2. Créer la paire de clés d'accès — la sienne

Dans la même console : une **nouvelle paire de clés d'accès** (clé d'accès + clé secrète), **distincte** de celle d'OP GESTION — si l'une fuit, l'autre reste saine.
La console ne montre la clé secrète **qu'une fois** : copie les deux **directement** dans une entrée de ton gestionnaire (« OP MESSAGES — coffre de sauvegarde »).

Les droits dont la sauvegarde a besoin, sur **ce bucket seulement** : **écrire, lire, lister, effacer**. Rien d'autre. Si la console permet de limiter la paire à ce
bucket, fais-le ; sinon **dis-moi ce que tu vois**. Le geste 4 éprouve ces quatre droits avant d'écrire quoi que ce soit, et dit lequel manque.

### 3. La clé de sauvegarde — elle naît sur TON Mac

Comme la clé maître (section 3), dans le presse-papiers, **sans rien afficher** :

```bash
openssl rand -hex 32 | pbcopy
```

**Ce que tu dois voir** : rien. Colle-la immédiatement dans une **nouvelle entrée** du gestionnaire (« OP MESSAGES — clé de sauvegarde bêta » ; **jamais** la même que
la clé maître). Le champ doit faire 64 caractères. Mêmes précautions qu'à la section 3 : aucune capture d'écran entre la copie et le collage, et
`pbpaste | tr -d '\n' | wc -c` doit répondre `64`. La production aura **sa propre** clé de sauvegarde, neuve, comme sa clé maître.

### 4. Les poser sur le VPS — saisie masquée

Sur le VPS, en root :

```bash
OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-sauvegarde.js
```

Il demande sept choses, **une par une** :

1. l'**adresse** du coffre (`https://s3.eu-central-4.ionoscloud.com`) ;
2. le **nom du bucket** ;
3. la **région** (Entrée = `eu-central-4`) ;
4. la **clé d'accès** du coffre — *masquée* ;
5. la **clé secrète** du coffre — *masquée* ;
6. la **clé de sauvegarde** — *masquée* (colle le presse-papiers du geste 3) ;
7. **la même, une seconde fois** — *masquée*, mais cette fois **recopiée depuis le gestionnaire**, pas depuis le presse-papiers : c'est ce qui trouve une clé mal
   copiée **aujourd'hui** plutôt que le jour du sinistre.

Rien ne s'affiche pendant la frappe : c'est normal (même un retour arrière, une flèche ou un collage ne font rien paraître — vérifié sous un vrai terminal).

Avant d'écrire, il **éprouve le coffre** : il dépose un petit objet d'essai sous `beta/`, le relit et compare, le retrouve dans la liste, puis l'efface. Chaque refus dit
lequel des quatre droits manque (« DÉPÔT REFUSÉ », « RELECTURE IMPOSSIBLE », « LISTE REFUSÉE », « EFFACEMENT REFUSÉ »). Il refuse aussi une clé de sauvegarde égale à la
clé maître, et deux saisies différentes. Il n'écrit `/etc/opmsg/beta.json` qu'une fois tout validé, en gardant son propriétaire et tous ses autres réglages. S'il existe déjà une
sauvegarde et que la clé ou le coffre change, il te le dit et te demande de taper « oui » : les copies déjà au coffre restent chiffrées avec l'ANCIENNE clé, à garder jusqu'à ce qu'elles soient sorties de la rétention.
**Ce qu'il affiche peut se recoller.** Puis :

```bash
systemctl restart teamop-msg@beta
```

### 5. Vérifier — la première copie part toute seule, et se relit

Au bout d'une ou deux minutes :

```bash
curl -s https://msg-beta.teamop.fr/health
```

**À voir** : `"sauvegarde":{"configuree":true,"ageH":0,"essaiJours":null,"echecs":0}`. `ageH` est un nombre (l'âge, en heures, de la dernière copie **relue**) ; `echecs`
vaut 0 ; `essaiJours` reste `null` jusqu'au geste 6. **Colle-la.**

Si `ageH` reste `null` après cinq minutes, ou si `echecs` monte, colle `/health` et le résultat de :

```bash
journalctl -u teamop-msg@beta -n 200 --no-pager | grep '"evt":"sauvegarde"' | tail -5
```

(le service n'y met ni nom, ni adresse, ni clé : un état, un motif court, une taille en Ko).

### 6. L'essai de restauration — la preuve

Sur le VPS, en root :

```bash
OPMSG_CONFIG=/etc/opmsg/beta.json OPMSG_DATA=/opt/opmsg/beta/data node /opt/opmsg/beta/current/outils/restaurer.js essai
```

Il télécharge la dernière copie, la déchiffre, rouvre la base, la contrôle, compte les lignes, rejoue le registre des suppressions, vérifie que la clé maître de ce
serveur ouvre bien cette base, relit des pièces, **compare les lignes de pièces de la base aux fichiers du coffre** (une ligne `⚠ N SANS fichier au coffre` veut dire que des photos ne
s'ouvriraient pas après une restauration : l'exercice le dit, l'enregistre, et ne le cache pas), puis efface son dossier de travail. **Il ne touche pas aux vraies données.**
⚠️ Si le fichier de la clé maître n'est pas lisible là où il tourne (`OPMSG_KEK_FILE`), l'exercice prouve que la copie est **intacte** mais pas qu'elle servirait : il le dit
(`la clé maître n'a pas pu être vérifiée`) et **n'enregistre PAS** de date — `/health` ne passera pas à `essaiJours: 0` sur un exercice incomplet. Refaire l'exercice sur le serveur.

**À voir**, tout à la fin : `✅ CETTE SAUVEGARDE EST RESTAURABLE. Exercice enregistré : /health dira « essaiJours: 0 ».` Puis `curl -s https://msg-beta.teamop.fr/health` :
`"essaiJours":0`. **Colle les deux.** C'est la porte de l'étape 3 : sans cet essai réussi, personne d'extérieur n'entre.
Une ligne `ExperimentalWarning: SQLite is an experimental feature…` peut s'afficher avant le reste : elle vient de Node, elle est normale.

Pour voir ce que le coffre contient, sans rien restaurer : la même commande avec `liste` à la place de `essai`.

### 7. Relire chaque copie de la clé de sauvegarde

Une fois **par copie** (gestionnaire, papier) :

```bash
OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-sauvegarde.js --verifier
```

Il demande la clé (masquée), la compare à celle que le serveur utilise et ne dit que le verdict : `longueur : 64 (attendu 64)` puis `✓ identique` — ou la position du premier
caractère faux. Il ne l'affiche jamais. Espaces et majuscules acceptés (pour la copie papier, tu **tapes**).

### 8. Après : ce qui se passe seul, ce qui crie, ce que tu fais chaque mois

- **Toutes les heures**, une copie ; celles de plus de **14 jours** s'effacent seules. Rien à faire. Les pièces (photos, vocaux, fichiers) partent **avant** la base, et une passe qui en laisse à
  envoyer (plus de 5 000 d'un coup, ou plus de huit minutes) se déclare **en échec** (motif `pieces-arriere-N` au journal du service) : la base est partie, mais la sauvegarde est incomplète, et elle le dit
  jusqu'à ce que tout soit au coffre. Une première mise en service avec beaucoup de pièces peut donc faire crier la surveillance quelques heures — c'est vrai, ce n'est pas une panne.
- **Si l'horloge du serveur saute** de plus d'un jour par rapport à celle du coffre, la passe se déclare en échec (`horloge-ecart`) et **n'efface rien** ; un âge de copie négatif fait aussi crier la surveillance.
  Recaler l'horloge (`timedatectl`), la sauvegarde repart toute seule à la passe suivante.
- **La surveillance crie** (le contrôle horaire de GitHub) si la dernière copie relue a plus de 2 h (ou est datée de plus d'une heure dans le futur), si deux passes de suite échouent, et — **en production seulement** — si
  aucun essai de restauration n'a réussi depuis 35 jours. La bêta n'est pas alarmée sur l'essai : ses données sont jetables.
- **Chaque mois** (production) : le geste 6, et tu colles le résultat.
- ⚠️ **Un message supprimé vit encore dans les copies pendant 14 jours.** Une restauration rejoue le registre des suppressions pour le retirer de la base remise en service,
  mais les copies elles-mêmes gardent ce qu'elles avaient vu : c'est à écrire dans la politique de confidentialité avant d'ouvrir au public.
- ⚠️ **Ce que l'essai ne prouve pas** : que les pièces s'ouvrent (il relit leurs octets ; elles sont scellées par la clé maître) ; ni que le coffre acceptera encore dans six
  mois (des clés peuvent être révoquées : la surveillance crie alors).

### 9. Le jour où le serveur est perdu

Il faut trois choses : la **clé maître**, la **clé de sauvegarde** (toutes deux dans le gestionnaire) et de quoi **parler au coffre** (si tu as perdu la paire de clés d'accès,
une nouvelle se crée dans la console). Dans cet ordre, sur le **nouveau** serveur — et **sans redémarrer le service avant la dernière étape** : sa première copie, celle d'une base
vide, deviendrait sinon « la plus récente » :

1. `bash /root/install-msg.sh beta` (section 6) — avec la **clé maître d'origine**, jamais une neuve ;
2. le geste 4, **sans** redémarrer ensuite (le coffre contient déjà les anciennes copies : c'est normal) ;
3. `systemctl stop teamop-msg@beta` ;
4. `OPMSG_CONFIG=/etc/opmsg/beta.json OPMSG_DATA=/opt/opmsg/beta/data node /opt/opmsg/beta/current/outils/restaurer.js restaurer --vers /opt/opmsg/beta/data --ecraser`
   — la base vide créée par la nouvelle installation est **mise de côté**, jamais effacée ; `--date 2026-10-02T14` choisit une copie plus ancienne si la dernière est mauvaise.
   Pour ne pas faire revenir ce qui a été supprimé depuis, l'outil rejoue le registre des suppressions de la **plus récente copie qui s'ouvre** : il saute les copies abîmées et le dit
   (`⚠ base/… ne s'ouvre pas`). **Si AUCUNE copie plus récente que celle que tu as choisie ne s'ouvre**, il **refuse** — les messages supprimés pour tous ou échus depuis reviendraient — et
   attend que tu ajoutes `--sans-purge` : c'est le prix d'une restauration à une date ancienne, à accepter en connaissance de cause. Ajoute `--sans-pieces` pour restaurer la base seule
   et remettre les pièces plus tard ; s'il écrit `⚠ N SANS fichier`, N photos ne s'ouvriront pas (les conversations, elles, restent lisibles) ;
5. `chown -R opmsg:opmsg /opt/opmsg/beta/data` ;
6. `systemctl start teamop-msg@beta`, puis `curl -s https://msg-beta.teamop.fr/health`.
   **Tout le monde doit se reconnecter** : la restauration vide les sessions exprès (une session fermée avant le sinistre ne doit pas revenir d'une copie d'avant sa fermeture) ; les appareils
   déjà liés par SMS restent connectés. Au premier démarrage, le journal porte une ligne `"evt":"rejeu"` (le service rejoue les suppressions qui sont à lui, puis baisse le drapeau) ;
   `journalctl -u teamop-msg@beta | grep '"evt":"rejeu"'` doit dire `"etat":"ok"`. Une ligne `echec` veut dire qu'un effacement n'a pas pu être rejoué : il le sera au démarrage suivant, mais regarde pourquoi.
   **Messages Pro — deux choses à regarder à la main après une restauration** : ① le journal ne doit porter AUCUNE ligne `"etat":"attention"` avec `"motif":"espace-payant-sans-membre"` (un espace payant que la copie réduisait à une personne dont le compte
   avait été effacé : le rejeu ne le dissout pas, il ne parle pas à Stripe ; son abonnement continue — à régler dans le tableau de bord de Stripe) ; ② les abonnements créés depuis l'heure de la copie restaurée : le service ne les connaît pas (il relit ceux qu'il connaît, il n'en
   cherche pas chez Stripe) — les repérer dans le tableau de bord de Stripe **avant** d'inviter quiconque à payer de nouveau.

⚠️ Cette procédure est écrite d'après le code et **jouée sur ma machine contre un faux coffre** : elle n'a jamais été jouée sur un VPS neuf. Un essai à blanc sur un VPS jetable
reste à faire **avant la production**.

## 10 quater. Les notifications d'OP MESSAGES — rien à poser sur le VPS, un seul geste sur ton iPhone

Les notifications n'ont **aucun secret à te faire poser** : leur paire de clés (VAPID, la « signature » du service) naît avec la configuration (`install-msg.sh`), puis le service la range **scellée**
dans sa base au premier démarrage ; elle n'est jamais affichée. Un déploiement ne touche ni nginx ni Caddy (`/sw.js` et `/manifest.webmanifest` passent par la règle générale), et le service
n'ouvre aucun port de plus : il appelle seulement, en HTTPS sortant, les services de notification de Google, Mozilla et Apple — comme il appelle OVHcloud pour les SMS.

**Pour les essayer sur ton iPhone** : ouvre la bêta dans Safari, touche Partager, puis « Sur l'écran d'accueil », et **lance OP MESSAGES depuis son icône** (sur iPhone, c'est la seule façon d'avoir
des notifications : dans l'onglet de Safari, l'interrupteur reste grisé et la page te le dit). Ensuite Réglages > Notifications, touche « Notifications sur cet appareil », accepte la demande, puis « Envoyer une notification d'essai ».
Si rien n'arrive : colle la ligne `push` de `/health` (des nombres, rien de secret) — `"actif":false` veut dire que les clés sont illisibles, des `echecs24h` qui montent veulent dire que le service de
notification refuse nos envois — et dis-moi ce que l'iPhone affiche.

## 10 quinquies. Messages Pro (Stripe, MODE TEST d'abord) — pour l'étape 5, avant la première vente

Messages Pro se paie par Stripe : **15 € par place et par mois** (ou 150 € par place et par an), une place par membre de l'espace, un abonnement par entreprise. Le service appelle `api.stripe.com` par
`fetch` (comme OP GESTION — aucune bibliothèque), **sans webhook** : le verdict est toujours **relu chez Stripe** (au retour du paiement, quand l'administrateur touche « J'ai réglé — vérifier », et toutes
les dix minutes pour les espaces abonnés). Tant qu'aucune clé n'est posée, tout est **inerte et le dit** (« l'abonnement n'est pas encore ouvert »). La bêta n'accepte qu'une clé de **test** : aucun vrai
prélèvement, jamais.

⛔ **Le compte Stripe est COMMUN avec OP GESTION**, qui lit TOUS les abonnements du compte. Deux conséquences, mesurées par `tests/test-965.js` (qui lance le vrai OP GESTION contre un faux Stripe) :
une **clé restreinte propre à OP MESSAGES** (jamais celle d'OP GESTION), et un **produit dont le nom contient « messages »** (§ 2) — sans quoi OP GESTION lit l'abonnement comme un paiement à lui (§ 8).

### 1. La clé restreinte — dans le tableau de bord Stripe, en mode TEST

Développeurs → Clés API → *Créer une clé restreinte*. Nom : « OP MESSAGES (service) ». Droits, **et rien d'autre** :

| ressource | droit | pour quoi faire |
|---|---|---|
| Checkout Sessions | écriture | ouvrir la page de paiement, la relire au retour |
| Customers | écriture | le client que Checkout crée |
| Customer portal | écriture | « Gérer l'abonnement » |
| Subscriptions | lecture | relire le verdict |
| Prices, Products | lecture | seulement pour l'outil du geste 3 : il vérifie les tarifs AVANT d'écrire |
| *Perso+ seulement* — Prices, Products | écriture | uniquement pour `--creer-perso-plus` (geste 3 bis, mode test) ; tu peux retirer ce droit ensuite |
| *Perso+ seulement* — Subscriptions | écriture | pour **arrêter le renouvellement** de l'abonnement Perso+ d'une personne qui demande à supprimer son compte, le **rétablir** si elle annule sa demande, et le **résilier** quand le compte est effacé (14 jours après la demande) — « Subscriptions : écriture » couvre les trois. Sans ce droit, Stripe refuse : le service note le geste, le rejoue, et `/health` dit depuis combien de minutes il attend (la surveillance crie au-delà d'un jour) ; la personne continuerait d'être prélevée. Payer, relire et organiser marchent sans lui. |

Une clé secrète complète (`sk_…`) est **refusée** par le service comme par l'outil : elle donnerait au service tout le compte, celui d'OP GESTION compris. Stripe n'affiche la clé qu'**une fois** :
copie-la **directement** dans ton gestionnaire de mots de passe (colle-la nulle part ailleurs).

### 2. Les deux tarifs — un produit « OP MESSAGES Pro »

Dans Stripe (mode test) : **un produit nommé « OP MESSAGES Pro »**, avec **deux prix récurrents facturés à l'unité** (la quantité est le nombre de places) : 15,00 € par mois, 150,00 € par an. Les identifiants
`price_…` ne sont pas des secrets : tu peux les coller dans la conversation.

⛔ **Le nom du produit doit contenir « messages »** : c'est ce qui fait ranger l'abonnement chez OP MESSAGES par OP GESTION (§ 8). L'outil du geste 3 **REFUSE D'ÉCRIRE** quand ce n'est pas le cas (il
n'avertissait que : un avertissement se lit une fois, entre deux lignes vertes — relecture du gardien, 3 octobre 2026) : il dit quel tarif, quel produit, et qu'il faut le renommer chez Stripe (« OP MESSAGES Pro »),
puis le relancer. Il ne peut pas lire la liste d'OP GESTION (`STRIPE_PRIX_MESSAGES`) : même un tarif qui y figure doit venir d'un produit nommé comme il faut. *Seul cas qui reste un avertissement* : le nom
n'a pas pu être LU (la clé n'a pas le droit « Products — lecture », qui n'est utile qu'à ce contrôle) — vérifie-le alors à la main.
⚠️ **Le dépôt connaît déjà deux prix `msgpro` côté OP GESTION** (`price_1TwV6E…` et `price_1TwgdtF…`) : dis-moi si ce sont les bons, et lequel est le mensuel (le sens exact des deux prix n'a jamais été
vérifié, § 6 de la conception). L'outil relit chaque tarif (rythme, montant, mode) et le dira.

### 3. Les poser sur le VPS — saisie masquée

Sur le VPS, en root :

```bash
OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-stripe.js
```

Il demande la clé (**masquée** : rien ne s'affiche pendant la frappe), puis les deux tarifs. Il **éprouve avant d'écrire** : des lectures seulement (la clé répond-elle et lit-elle les abonnements ?
chaque tarif existe-t-il dans CE mode, est-il actif, au bon rythme, à l'unité ? le montant annoncé à l'écran est-il celui de Stripe ? le nom de son produit contient-il « messages » ?) — il ne crée rien et ne facture rien. Une clé de production collée
sur la bêta est refusée, et un tarif dont le produit ne s'appelle pas « … messages … » aussi (§ 2 : sans ce nom, OP GESTION lirait l'abonnement comme un paiement à lui) ; seul un montant qui n'est pas celui de l'écran ne fait qu'avertir. Il n'écrit le fichier qu'une fois tout validé (temporaire en 0600, relu par le même code que le démarrage du service, puis renommé). **Ce qu'il affiche peut se recoller** (le mode,
un nom de produit, un montant). Puis :

```bash
systemctl restart teamop-msg@beta
```

Pour relire la configuration posée, sans rien changer : `OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-stripe.js --verifier` (il relit aussi les tarifs Perso+ quand ils sont posés).

### 3 bis. Perso+ (le forfait d'une personne : 5 € par mois, 50 € l'année) — créer les deux tarifs de TEST, un geste

*Décision du 4 octobre 2026 : organiser une réunion est dans Perso+ ; rejoindre une réunion où l'on est invité reste gratuit. Tant que ce geste n'est pas fait, le forfait est **inerte** et le dit : aucun bouton « S'abonner » n'est montré, la bêta reste ouverte à tous.* Ce geste vient APRÈS le geste 3 (la clé et les tarifs de Messages Pro sont déjà posés).

```bash
OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-stripe.js --creer-perso-plus
systemctl restart teamop-msg@beta
```

L'outil **crée** chez Stripe, en mode TEST et nulle part ailleurs, le produit « OP MESSAGES Perso+ » (son nom contient « messages » : le compte Stripe est commun avec OP GESTION, voir le geste 8) et deux tarifs récurrents TTC, 5,00 € par mois et 50,00 € par an ; il te demande de taper **oui**, relit les tarifs créés, puis range leurs identifiants dans le fichier (0600, tout le reste intact). Il **refuse** une clé de production, un fichier qui a déjà des tarifs Perso+ (il dit lesquels et comment recommencer), un « non », et une clé sans le droit d'écrire les produits (il nomme le droit manquant). Relancé le même jour, il rend les mêmes objets. Il n'affiche jamais la clé.

**En production**, l'outil ne crée rien : crée toi-même, dans le tableau de bord de Stripe, un produit dont le **nom contient « messages »** avec deux prix récurrents TTC (5 € par mois, 50 € par an), puis range-les : `OPMSG_CONFIG=/etc/opmsg/prod.json node /opt/opmsg/prod/current/configurer-stripe.js --perso-plus` (il te demande les deux identifiants `price_…`, les éprouve comme ceux de Messages Pro, et écrit).

Pour l'essayer : Réglages → *Abonnement* → *Perso+* → *S'abonner* (carte de test 4242 4242 4242 4242), puis « J'ai réglé — vérifier ». Sur la bêta tout est ouvert, mais le chemin du paiement se joue quand même. Le portail de facturation (geste 5) sert aussi à Perso+ : « Gérer mon abonnement » ne marche pas sans lui.

### 4. Vérifier

```bash
curl -s https://msg-beta.teamop.fr/health
```

**À voir** : `"stripeEchecMin":0` et `"facturation":{"mode":"test", …}` (et non `inerte`). Le service ne publie ni la clé, ni un tarif, ni un identifiant d'espace, ni aucun chiffre commercial (`/health` est public) : le mode, le drapeau de la bêta et les minutes de panne de Stripe.

### 5. Activer le portail de facturation — un geste dans Stripe

Paramètres → Facturation → *Portail client* → l'activer (mode test), en autorisant le changement de quantité, la mise à jour de la carte et la résiliation. **Sans lui**, « Gérer l'abonnement » répond
« le paiement n'a pas pu être préparé » : le service n'y peut rien, c'est un réglage de ton compte.

### 6. L'essai, avec une carte de test

Sur la bêta tout est ouvert (Pro sans paiement), mais le chemin du paiement se joue quand même : Réglages → *Entreprise* → créer un espace, puis Réglages → *Abonnement* → choisir le rythme et les places
(au moins le nombre de membres) → *Payer avec Stripe*. Sur la page de Stripe, la carte de test de la documentation de Stripe (4242 4242 4242 4242, une date future, un code quelconque). De retour sur la page :
« Merci ! Abonnement confirmé par Stripe : l'espace est en Messages Pro », puis « Actif · N places ». *Gérer l'abonnement* ouvre le portail (changer les places, la carte, résilier) ; au retour du portail, la
page relit chez Stripe et montre les nouvelles places. Un paiement fait sur un autre appareil apparaît au clic sur « J'ai réglé — vérifier » (une fois toutes les dix secondes au plus).
**Un impayé ne se joue pas à la main** (il faudrait faire avancer le temps chez Stripe) : `tests/test-962.js`, `test-965.js` et la sonde le jouent contre un faux Stripe — un paiement en retard garde Pro
sept jours (comptés entre deux lectures réussies, jamais sur l'horloge seule : une panne de Stripe ne suspend personne), puis seules les fonctions Pro refusent, l'administrateur seul lit pourquoi, rien n'est effacé.

### 7. Ce qui se passe seul, ce qui crie

- **Relecture** toutes les dix minutes des espaces abonnés **et de ceux dont une session de paiement n'est pas résolue — quel que soit son âge** (une session payée pendant une panne finit reconnue ; seul ce que Stripe en DIT, « expirée »
  ou « inconnue », l'efface) ; Stripe qui ne répond pas arrête la passe après trois échecs de suite, et le dernier état connu sert. **Un 404 de Stripe sur un abonnement ne le dit « résilié » qu'une fois l'absence confirmée** (le client
  existe chez Stripe et sa liste d'abonnements ne le contient pas) : une clé qui n'est pas celle du bon compte répond 404 à tout, et c'est `stripeEchecMin` qui monte, pas un espace qui se résilie.
- **`/health`** (PUBLIC) : `stripeEchecMin` (minutes depuis lesquelles Stripe est illisible, 0 si tout va bien) — la surveillance horaire crie **au-delà de 90 minutes** —, le mode de la facturation et le drapeau
  de la bêta. **Ni le nombre d'espaces, ni celui d'abonnés, ni celui d'impayés** : ce sont des chiffres commerciaux, et n'importe qui peut lire `/health` d'un `curl` (relecture du gardien, 3 octobre 2026). Ils se lisent dans le
  tableau de bord de Stripe, qui les tient déjà.
- **Supprimer son compte** est refusé tant qu'on est seul dans un espace dont l'abonnement court (409 `espace_abonne`), et **dissoudre un espace** aussi (409 `abonnement_actif`) : Stripe continuerait de prélever
  pour un espace qui n'existe plus. On résilie d'abord (portail), la relecture le voit. **Un paiement commencé et pas encore reconnu** bloque aussi (409 `paiement_en_cours`) : le service relit d'abord la session, et ne
  laisse faire qu'une fois Stripe dit qu'elle est expirée ou inconnue.
- **Retirer quelqu'un d'un espace** révoque tous les liens d'invitation de l'espace (le retiré en connaît les codes) : un administrateur en recrée un. **Quitter** de soi-même n'en révoque aucun.
- **Des places baissées sous le nombre de membres** (par le portail de Stripe) ne retirent personne : les liens d'invitation s'arrêtent, tout le monde garde son accès, et l'administrateur lit « N membres pour P places ».

### 8. La couture avec OP GESTION — à lire avant la première vente

OP GESTION lit **toute** la liste des abonnements du compte (`status=all`, cent par page, dix pages au plus) et range chaque ligne : une ligne est « OP MESSAGES » si son tarif est dans sa liste
(`STRIPE_PRIX_MESSAGES`, dans le serveur d'OP GESTION) **ou** si le nom de son produit contient « messages ». `tests/test-965.js` joue le vrai OP GESTION contre un faux Stripe qui porte un abonnement de
Messages Pro — payé, d'essai, en retard, impayé, incomplet, en pause, résilié — à la même adresse qu'une entreprise OP GESTION (cinq sortes d'entreprises, onze états) : **son verdict ne change pas**, dans
les deux directions, et un abonnement de Messages Pro n'ajoute jamais une place à OP GESTION. Trois choses à savoir :

- **Messages Pro n'écrit jamais la métadonnée `espace`** (celle qu'OP GESTION lit pour rattacher un abonnement à une entreprise) : la sienne s'appelle `opmsg_espace`. Un banc le garde.
- ⚠️ **LIMITE CONNUE, mesurée** : un tarif que ni la liste d'OP GESTION ni le nom du produit ne désignent est lu **comme un paiement d'OP GESTION**. Une entreprise qui ne paie rien d'OP GESTION, mais dont le
  dirigeant achète Messages Pro avec la même adresse, est alors **servie** (jamais coupée — OP GESTION ne coupe jamais une entreprise qui a l'air de payer) tant que l'abonnement court. La parade est le nom
  du produit (§ 2) ; l'outil du geste 3 refuse d'écrire sans lui. `test-965` épingle la limite avec la consigne de ce qu'il faudra retirer le jour où OP GESTION changera.
- ⚠️ **Le plafond de mille abonnements est PARTAGÉ** : au-delà, OP GESTION ne peut plus lire la liste en entier et répond « vérification impossible » à **tout le monde** (aucune entreprise n'est coupée —
  une panne de ce côté ne suspend personne —, mais plus aucune n'est vérifiée). Les abonnements de Messages Pro comptent dans ce plafond. À relever dans OP GESTION avant d'approcher les mille.

### 9. En production (plus tard, sur la phrase « publie OP MESSAGES »)

Une clé `rk_live_…` restreinte et deux tarifs de production, posés par le même outil sur `/etc/opmsg/prod.json`. En production, **payer exige une adresse confirmée** (409 `adresse_requise` sinon : une facture
n'est pas envoyée à personne), et **créer un espace est une fonction Pro** : le **premier espace** d'une entreprise ne peut donc pas naître d'une création libre. L'entrée prévue est le lien créé par TEAM OP (« Ce qui reste à trancher » de la
conception, question 15) — ce geste n'existe pas encore, et c'est ce qui sépare la bêta de la production pour cet écran.

## 10 sexies. Le courriel d'OP MESSAGES (les invitations aux réunions) — pour l'étape 6, avant d'ouvrir « Envoyer par courriel »

Une réunion programmée peut être envoyée **par courriel** à quelqu'un qui n'a pas OP MESSAGES : le message porte un fichier `.ics` que son agenda sait lire. Tant que ces gestes ne sont pas faits, **rien ne casse et
rien ne part** : le service est **inerte et le dit** — la page affiche « l'envoi par courriel n'est pas encore ouvert » (la route répond 503 `courriel_non_ouvert`, et `/api/config` dit `"courriel":{"ouvert":false}`).
Il n'y a **aucune urgence** : le reste des réunions (l'agenda, les invités dans l'application, les rappels, le fichier `.ics` à télécharger) marche sans.

⛔ **Le mot de passe du compte de messagerie est un secret** : il va **de la console de ton fournisseur à ton gestionnaire de mots de passe**, puis **au VPS en saisie masquée** (`configurer-courriel.js`). Tu ne le
recolles **jamais** dans la conversation, et le service ne l'écrit nulle part où tu pourrais le recoller par mégarde (ni `/health`, ni `/api/config`, ni les journaux, ni une réponse d'erreur). Ce que tu peux recoller :
l'hôte, le port, le mode de sécurité, l'adresse d'expédition, et tout ce que le script affiche.

### Ce que ce courriel est — et n'est pas

- **Un message au gabarit FIXE.** L'objet est toujours « Invitation à une réunion — OP MESSAGES », le corps est du **texte simple** (aucune image, aucun lien) : le nom de l'hôte, le titre, l'heure dans le fuseau de la réunion,
  le lieu, une phrase qui dit d'où vient le message et qu'on peut l'ignorer. Ce que l'hôte écrit (le titre, le lieu) y entre **comme du texte**, une seule fois. Un service qui laisserait écrire l'objet et le corps serait un
  relais de courriers non sollicités.
- **Sans réponse possible** (aucune adresse de l'hôte n'est connue ni donnée) et **sans rien inscrire** au nom du destinataire.
- **Plafonné, durablement** (un redémarrage ne remet rien à zéro) : **10 courriels par compte et par 24 heures**, **2 par destinataire et par 7 jours** (la *boîte*, pas l'écriture : « Nom+1@… » et « nom@… » sont la même),
  et 5 par minute par personne. Un relais qui refuse **ne consomme pas** la place.
- **L'adresse du destinataire n'est écrite NULLE PART** : ni dans la base (seule une empreinte sert à compter les plafonds), ni dans un journal, ni dans `/health`. Le journal du service ne dit que `{"evt":"courriel","etat":"envoye"}`
  ou `{"evt":"courriel","etat":"echec","nom":"EAUTH"}` — l'état, et le **nom** du refus, jamais une adresse ni le texte du relais.

### 1. Choisir l'expéditeur

Une **boîte dédiée**, sur ton domaine (par exemple `invitations@…`), chez le fournisseur qui héberge déjà tes courriels. Pour un compte de messagerie ordinaire, le relais veut un **mot de passe d'application** (créé dans la
console du fournisseur, révocable) — **jamais** le mot de passe principal de la boîte.

⚠️ **Ce que je n'ai PAS pu vérifier** : je n'ai pas ton fournisseur. Trois choses sont à constater chez lui, pas ici : (1) son **hôte et son port** SMTP (587 avec `starttls`, ou 465 avec `ssl`) ; (2) les réglages **SPF, DKIM et
DMARC** du domaine expéditeur — sans eux, les invitations arrivent en indésirables, et c'est un réglage de DNS que le service ne peut pas faire à ta place ; (3) son **plafond d'envois par jour**, qu'il faut relire (nos plafonds
sont bien plus bas, mais un compte partagé avec d'autres usages peut déjà être entamé). Et l'envoi **réel** — un courriel qui arrive vraiment dans une boîte — n'a jamais été constaté : c'est la vérification du geste 3.

### 2. Les poser sur le VPS — saisie masquée

Sur le VPS, en root :

```bash
OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-courriel.js
```

Il demande l'hôte, la sécurité (`starttls` par défaut, `ssl`, ou `aucune` — **seulement vers un relais local**), le port, l'**identifiant** et le **mot de passe d'application** (**masqués** : rien ne s'affiche pendant la
frappe), l'adresse d'expédition et le nom affiché. Il **éprouve le relais avant d'écrire** : une connexion, la sécurité demandée, l'authentification — **et rien d'autre, aucun courriel ne part**. Un identifiant faux, un mauvais port,
un mode de sécurité qui ne correspond pas (« ssl » sur le port 587) se savent tout de suite, avec une phrase lisible (jamais le texte de la réponse du relais, qui peut citer un compte). Il n'écrit le fichier qu'une fois tout
validé (temporaire en 0600, propriétaire conservé, relu par le **même code** que le démarrage du service, les autres clés vérifiées intactes, puis renommé). **Ce qu'il affiche peut se recoller.** Puis :

```bash
systemctl restart teamop-msg@beta
```

Pour relire la configuration posée et réessayer le relais, sans rien changer et sans envoyer de courriel : `OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-courriel.js --verifier`.

⛔ **La production n'accepte pas l'envoi en clair** : `aucune` est refusée hors d'un relais local, quelle que soit l'instance (le script applique la règle de la production). Un certificat que la machine ne connaît pas est
refusé — aucun réglage ne désactive la vérification.

### 3. Vérifier — une vraie invitation à ta propre adresse

```bash
curl -s https://msg-beta.teamop.fr/api/config
```

**À voir** : `"courriel":{"ouvert":true}` (et rien d'autre du relais : ni l'hôte, ni l'identifiant). Puis, dans l'application : programme une réunion, ouvre-la, **« Envoyer par courriel »**, ta **propre** adresse. **À voir** :
le courriel dans la minute, l'objet « Invitation à une réunion — OP MESSAGES », le texte simple, la pièce jointe `.ics` ; ouvre-la : elle s'ajoute à ton agenda **à la bonne heure, dans ton fuseau**.

**Si rien n'arrive** : la page dit une phrase par cause (« le courriel n'a pas pu partir… », « cette adresse n'est pas valable », le plafond atteint). Dans le journal du service
(`journalctl -u teamop-msg@beta | grep '"evt":"courriel"'`), la ligne d'échec porte le **nom** du refus : `EAUTH` (identifiant ou mot de passe refusé), `ESOCKET`/`ECONNECTION` (relais injoignable ou mauvais port),
`ETIMEDOUT` (il ne répond pas), `ETLS` (le chiffrement demandé n'a pas pu s'établir), `EENVELOPE` (le relais refuse CE destinataire), `EMESSAGE` (il refuse le message). Colle cette ligne — elle ne contient ni adresse ni secret.

### 4. Ce qui se passe seul, ce qui ne crie pas

- **Rien ne tourne en fond** pour le courriel : il part quand l'hôte le demande, et seulement alors.
- **`/health` ne dit rien du courriel**, volontairement : un relais en panne se voit à la réponse de la page (« le courriel n'a pas pu partir »), pas à une alarme muette — et une invitation qui ne part pas ne prive personne
  de rien (l'invité reçoit déjà la réunion dans l'application, ou télécharge le fichier lui-même).
- **La configuration est lue au démarrage** : changer de relais (ou de mot de passe, après sa révocation) = relancer le script, puis redémarrer le service.

### 5. Ce que le fournisseur de messagerie reçoit (pour les textes légaux)

Il transporte chaque invitation : il reçoit **l'adresse du destinataire, le prénom et le nom de l'hôte, le titre, le lieu et l'heure de la réunion**, et le fichier `.ics`. C'est un **sous-traitant** à nommer dans les mentions
et la politique de confidentialité (comme OVHcloud pour les SMS). OP MESSAGES, lui, ne **garde** aucune adresse de destinataire : une empreinte pour compter les plafonds, rien de plus.

---

## 10 septies. Le relais d'appels (coturn) — pour l'étape 7, avant le premier appel hors d'un même Wi-Fi

Les appels à deux d'OP MESSAGES (audio et vidéo) passent **directement** entre les deux appareils quand ils se joignent. Quand ils ne se joignent pas — un réseau mobile, un pare-feu d'entreprise, deux box différentes —, leurs paquets passent par un **relais** : coturn, sur ce même VPS. Tant que ces gestes ne sont pas faits, **rien ne casse** : le service n'a pas de relais ; un appel entre deux appareils qui se joignent seuls (le même Wi-Fi) marche ; et quand une liaison ne s'établit pas, la page le dit (« La connexion n'a pas pu s'établir : le relais d'appels n'est pas encore installé, l'appel ne passe que si vos deux appareils se joignent directement (le même Wi-Fi, par exemple). »).
Il n'y a **aucune urgence**, mais c'est le geste à faire avant de demander à quelqu'un de tester un appel ailleurs que chez toi : un appel de ton iPhone en 4G vers un ordinateur au bureau ne passe pas toujours sans relais.

⛔ **Tu n'as aucun secret à manipuler.** Le secret partagé entre coturn et OP MESSAGES naît **sur le VPS**, tiré au hasard par le script, et il est écrit dans les deux configurations (celle de coturn, celle de l'instance, `/etc/opmsg/beta.json` en 0600) **sans jamais s'afficher** : ni à l'écran, ni dans un argument de commande, ni dans une variable d'environnement. Il n'y a rien à copier, rien à garder, rien à recoller. **Tout ce que le script affiche peut se recoller** dans la conversation. S'il fallait le refaire, on relance le script : il reprend le secret existant (les appels en cours et l'autre instance continuent).

### Ce que le relais est — et n'est pas

- **Un facteur de paquets**, pas un serveur de visioconférence : les deux navigateurs chiffrent la voix et l'image entre eux (DTLS-SRTP), le relais ne fait que les transporter. Il ne les lit pas, et il **n'écrit rien** : son journal est coupé, parce qu'il porterait l'adresse de chaque appareil.
- **Éphémère, et pour qui est dans un appel** : le service ne donne un nom et un mot de passe qu'à une personne dont un appel sonne ou court — à toute autre, il répond comme à une page qui n'existe pas — ; ils sont valables **quinze minutes**, calculés avec le secret, et la page les renouvelle seule pendant un appel plus long. Le relais ne connaît aucun compte.
- **Cloisonné** : le script lui donne la liste des adresses vers lesquelles il REFUSE de relayer — la machine elle-même (donc OP GESTION), les réseaux privés, le service de métadonnées de l'hébergeur… — et **l'éprouve avant d'ouvrir quoi que ce soit** (coturn ignore en silence une règle mal écrite : § 3.5 de la conception). **L'adresse PUBLIQUE de la machine, en revanche, ne peut pas lui être refusée** : deux personnes qui passent chacune par le relais s'envoient leurs paquets d'une adresse relayée à l'autre, et ces deux adresses sont celles de la machine. Le trou qui en reste (parler aux services qui écoutent sur cette adresse) est fermé **dans le noyau** : un petit pare-feu propre à l'utilisateur de coturn, posé par le script, rejoué par systemd avant CHAQUE démarrage de coturn et retiré à son arrêt, qui ne lui laisse atteindre la machine que par ses ports de relais. Si une règle ne se pose pas, coturn ne démarre pas.
- **Plafonné, pour une capacité DITE** : 4 allocations par personne, 32 en tout, 500 ko/s (4 Mbit/s) chacune, 16 Mo/s pour l'ensemble — **huit appels relayés à la fois** (un appel relayé prend quatre allocations : deux personnes, deux adresses de relais). Le neuvième tente le direct, et la page dit quand rien ne se joint. Au pire, 128 Mbit/s sortent du VPS, sur la bande passante qu'OP GESTION partage. Ces nombres sont un CHOIX, écrit et justifié en tête de `install-turn.sh` : pour tenir plus d'appels relayés on monte `TOTAL_QUOTA` et `BPS_CAPACITE` **ensemble** et on rejoue le script. Une allocation déjà ouverte n'est pas ré-authentifiée par coturn : son titulaire peut la prolonger tant qu'il la rafraîchit — les plafonds BORNENT ce que ça coûte, ils ne l'empêchent pas (question 41 de la conception). Le relais tourne avec un poids processeur et disque bas : si quelque chose doit ploier sur ce VPS, ce n'est pas OP GESTION.
- **Jamais le serveur d'un tiers** : aucun STUN public (Google…) n'est consulté, ni proposé en repli. Rien de ce qui concerne un appel ne sort de nos machines.

### 1. Le DNS, puis les ports chez l'hébergeur

**Le DNS** — chez OVH, comme `msg-beta` (section 2) : un enregistrement **A** `turn` → `217.154.6.139`, **TTL 300 s**, sans toucher à aucune autre ligne de la zone. Sur ton Mac, après quelques minutes :

```bash
dig +short turn.teamop.fr
```

**À voir** : `217.154.6.139`. Rien d'autre → pas encore propagé, on attend (le certificat du relais ne peut pas s'obtenir avant).

**Les ports** — dans le panneau de ton hébergeur (IONOS : la politique de pare-feu du serveur), ouvre **en entrée** :

| protocole | port | pour quoi |
|---|---|---|
| UDP **et** TCP | 3478 | le relais (et le STUN) |
| TCP | 5349 | le relais en TLS, pour les réseaux qui n'acceptent que du chiffré |
| UDP | 49160 à 49999 | les voies de relais elles-mêmes |

⚠️ **Non vérifié** : je n'ai pas ton panneau sous les yeux, le libellé exact des menus d'IONOS est à constater. Les ports **UDP** comptent : les appels passent surtout en UDP, un relais dont seul le TCP est ouvert marche mal. Le pare-feu du VPS lui-même (`ufw`), s'il est actif, est réglé par le script ; celui de l'hébergeur, c'est toi.

**Le trafic inclus dans l'offre** — un appel qui passe par le relais fait transiter, en ordre de grandeur (débits habituels de WebRTC, **jamais mesurés ici** faute d'appareils), **environ 2,7 Go par heure en vidéo** et moins de 0,1 Go par heure en audio. La plupart des appels se joignent directement et ne coûtent rien au relais, mais on ne sait pas quelle part. Le plafond posé borne ce que ça peut coûter : saturé, le relais ferait passer environ 58 Go par heure. Relève dans ton espace IONOS le volume de trafic inclus (ou « illimité ») et dis-le dans la conversation.

### 2. Télécharger et lancer le script

⚠️ **Le code des appels doit d'abord être déployé** : le script contrôle le relais avec un outil qui voyage avec le service (`outils/verifier-relais.js`). Tant que la version avec les appels n'est pas sur `main` et déployée, il s'arrête avec « le contrôle du relais est absent », arrête coturn et remet la configuration de l'instance comme avant : il reprendra là où il en est.

Sur le VPS (toujours en root) :

```bash
curl -fsSL https://raw.githubusercontent.com/justino17-cmd/teamop/main/server-msg/install-turn.sh -o /root/install-turn.sh
bash /root/install-turn.sh beta
```

Comme `install-msg.sh`, c'est un **fichier** : lis-le si tu veux avant de le lancer (`less /root/install-turn.sh`), il ne se lance pas par un tuyau. Il fait, dans l'ordre :

1. installe coturn (le paquet de la distribution) s'il manque, et l'arrête aussitôt : le paquet le démarre avec une configuration vide ; installe aussi `iptables` s'il manque (le pare-feu du relais en a besoin), avant d'écrire quoi que ce soit ;
2. obtient le certificat du relais (TLS sur 5349) par nginx et Let's Encrypt — un bloc nginx minimal, qui ne sert que la preuve. Sans DNS ou sans nginx, il le DIT et installe le relais **sans TLS** (3478 seulement) ; relance-le quand le DNS est en place ;
3. tire le secret au hasard, ici, et l'écrit dans les deux configurations ;
4. pose le **pare-feu sortant du relais** : un petit script (`/usr/local/sbin/opmsg-turn-pare-feu`) que systemd rejoue avant chaque démarrage de coturn, et qu'il retire à son arrêt ;
5. démarre coturn, **relit le pare-feu dans le noyau** (on ne croit pas ce que le script a dit), puis le **contrôle** : une allocation réussit avec nos identifiants, un identifiant faux ou périmé est refusé, chaque réseau privé est refusé, une adresse publique est acceptée, deux personnes qui passent chacune par le relais s'entendent, et un service UDP posé sur l'adresse de la machine n'est PAS atteint par le relais ;
6. **SEULEMENT SI le contrôle est vert**, ouvre les ports du pare-feu du VPS (`ufw`, s'il est actif) et relance l'instance, puis lui demande si elle voit le relais.

Trois variables, **toutes facultatives** : `OPMSG_TURN_HOTE` (le nom du relais, `turn.teamop.fr` par défaut), `OPMSG_TURN_SANS_TLS=oui` (ne pas chercher de certificat), `OPMSG_TURN_IP` (l'adresse publique, seulement derrière une traduction d'adresses — pas le cas d'un VPS qui porte sa propre adresse publique).

**Ce que tu dois voir** (les lignes de contrôle sont plus nombreuses ; un `⚠️` sur la ligne TLS est un avis, pas un échec : le certificat se vérifie par le nom public) :

```
── OP MESSAGES · relais d'appels · instance beta · turn.teamop.fr
   coturn : installation
   certificat pour turn.teamop.fr…
   TLS : oui (5349)
   cle=nouveau instance=change coturn=change secrets=1
pare-feu du relais : en place
── Contrôle du relais (ce serveur contre lui-même)…
── Le relais d'appels de l'instance beta
  ✓ (UDP) le relais ACCEPTE nos identifiants : une allocation réussit
  …
  ✓ (UDP) RELAIS ↔ RELAIS : un paquet envoyé à l'adresse relayée d'une autre personne ARRIVE (…)
  ✓ (UDP) le relais n'atteint PAS un service UDP de la machine (pare-feu sortant : …)
✓ Le relais fait ce qu'il doit.
   pare-feu du VPS (ufw) : ports du relais ouverts
   ✓ l'instance voit le relais (/health : appels.turn)

✓ Le relais d'appels est en place pour beta.
   Capacité : 8 appels relayés à la fois (4 allocations chacun), 4 Mbit/s par allocation. …
```

(`cle=nouveau` la première fois, `cle=repris` à chaque relance ; sans `ufw` actif, la ligne dit « inactif — rien à y ouvrir ». Derrière une traduction d'adresses — pas le cas d'un VPS qui porte sa propre adresse publique —, la ligne « n'atteint PAS un service UDP de la machine » est un avis (⚠️ « non vérifié ») et non un ✓ : ce contrôle ne peut pas être joué, et le dit.)

Les sorties d'erreur possibles — **colle toute la sortie** dans la conversation :

- **`l'instance beta n'est pas installée`** → `install-msg.sh beta` d'abord (section 6).
- **`le contrôle du relais est absent`** → la version avec les appels n'est pas encore déployée (voir plus haut). Rien n'est ouvert.
- **`le certificat n'a pas pu être obtenu`** ou **`pas de certificat`** → le DNS (geste 1) ne pointe pas encore sur ce serveur, ou nginx n'est pas le proxy. Le relais marche sans TLS ; relance le script plus tard, il est rejouable.
- **`Le relais ne fait pas ce qu'il doit`** → il est ARRÊTÉ, rien n'est ouvert, l'instance n'est pas relancée. Un `✗` sur une ligne « REFUSE de relayer » veut dire qu'une règle de la configuration n'est pas lue : c'est exactement pour le savoir que le contrôle existe. Un `✗` sur « n'atteint PAS un service UDP de la machine » veut dire que le pare-feu ne tient pas : le relais parlerait aux services de ce serveur.
- **`le pare-feu sortant du relais n'est pas en place`** → coturn est ARRÊTÉ, rien n'est ouvert, l'instance n'est pas relancée : le noyau n'a pas les règles (par exemple `iptables` est absent, ou ne les accepte pas). `systemctl status coturn --no-pager | head -5` dit pourquoi : colle-le. **`le pare-feu du relais est absent`** → la version d'OP MESSAGES en service est antérieure à ce pare-feu : déploie d'abord la version à jour.
- **`coturn n'a pas démarré avec cette configuration`** ou **`l'instance a redémarré mais ne voit pas le relais`** → rien n'est ouvert, la configuration d'avant est remise : OP MESSAGES tourne comme avant.

### 3. Vérifier — de l'extérieur, puis avec deux appareils

Sur ton Mac :

```bash
curl -s https://msg-beta.teamop.fr/health
nc -vz turn.teamop.fr 3478
openssl s_client -connect turn.teamop.fr:5349 -brief < /dev/null
```

**À voir** : dans `/health`, `"appels":{"turn":true,` suivi d'un petit `ageS` (le balayeur d'appels tourne) ; pour `nc`, `succeeded` (ou `open`, selon la version) ; pour `openssl`, `Verification: OK` et le certificat de `turn.teamop.fr`. Rien de secret ne s'affiche. ⚠️ `nc` ne prouve que le TCP : sur UDP il répond « réussi » même quand le port est fermé. **La preuve de l'UDP est un appel.**

Pour relire le pare-feu du relais DANS LE NOYAU, à tout moment, sans rien changer (à refaire après un rechargement du pare-feu de la machine, ou si tu changes quelque chose qui le touche) :

```bash
/usr/local/sbin/opmsg-turn-pare-feu verifier
```

**À voir** : `pare-feu du relais : en place`. S'il dit `ABSENT`, `systemctl restart coturn` le repose (systemd le rejoue avant chaque démarrage) ; colle la sortie si le message revient.

Pour rejouer le contrôle complet du relais sur le VPS, à tout moment, sans rien changer :

```bash
OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/outils/verifier-relais.js beta
```

(Il part de CE serveur : il ne dit pas si les ports sont ouverts dans le panneau de l'hébergeur. Il rejoue aussi le pare-feu : deux personnes qui passent chacune par le relais s'entendent, un service UDP de la machine n'est pas atteint.)

**L'essai réel**, avec deux appareils :

1. **Sur le même Wi-Fi** : un appel audio, puis vidéo, entre ton iPhone et un ordinateur. Il passe directement ; c'est le cas simple.
2. **Hors du Wi-Fi** : coupe le Wi-Fi de l'iPhone (4G) et appelle l'ordinateur du bureau. Si la voix et l'image passent, le relais fonctionne. Sur l'ordinateur, `chrome://webrtc-internals`, ouvert **avant** l'appel, montre dans « candidate pair » si la paire retenue est de type `relay`.
3. **À l'écran, côté appelant** : « Sonnerie… », puis « Connexion… », puis « Appel en cours ». Si l'écran finit sur « La connexion n'a pas pu s'établir. Vérifie ta connexion, puis réessaie. », colle l'heure et le réseau utilisé : les ports UDP du panneau sont le premier suspect.

### 4. Ce qui se passe seul, ce qui crie

- **Le certificat se renouvelle seul** (certbot) et un crochet le rend à coturn, qui le relit sans couper les appels en cours.
- **`/health`** : `appels.turn` dit seulement que le service a un secret de relais ; il ne peut pas dire si coturn répond (UDP : hors de sa portée). `appels.ageS` et `appels.echecs` (le balayeur d'appels : sans lui, plus d'appel manqué, et des gens « occupés » sans fin) sont **surveillés** par la surveillance horaire. Le nombre d'appels perdus n'est plus publié (`/health` est public, et le chiffre dit comment se portent les réseaux des gens) : il est dans le journal du service, sans nom ni appel.
- **Un coturn qui s'arrête n'est pas encore surveillé** : le script de surveillance d'OP MESSAGES sait sonder le relais (une vraie requête STUN en UDP, trois essais) et crier s'il ne répond pas, mais il n'est branché sur aucun workflow tant que `msg-beta` n'a pas son DNS. En attendant : les appels directs continuent, ceux qui avaient besoin du relais finissent sur « La connexion n'a pas pu s'établir ». Relancer `bash /root/install-turn.sh beta` (rejouable) ou `systemctl restart coturn` suffit.
- **Le pare-feu du relais se repose seul** à chaque démarrage de coturn et se retire à son arrêt. Ce qu'on ne sait pas encore — il faut le constater sur ce VPS — : si un rechargement du pare-feu de la machine (`ufw reload`) retire la chaîne du relais du noyau. Dans ce cas `opmsg-turn-pare-feu verifier` dit « ABSENT » et `systemctl restart coturn` la remet ; rien ne le lance tout seul.
- **Rien d'autre ne tourne** : pas de tâche planifiée, pas de journal à lire.

### 5. Revenir en arrière

Le script est **fermé par défaut** : s'il échoue, rien n'est ouvert et la configuration de l'instance revient comme avant. Pour arrêter le relais plus tard, `systemctl stop coturn` suffit (il retire aussi les règles du pare-feu du relais : rien ne reste dans le noyau) : les appels directs continuent, et la page de ceux qui en avaient besoin dit que la connexion n'a pas pu s'établir. Faire dire à la page que le relais d'appels n'est pas installé demande de retirer `appels.relais` de la configuration de l'instance : on le fait ensemble, dans la conversation, plutôt que d'éditer ce fichier à la main.

### 6. Ce que le relais reçoit (pour les textes légaux)

Il voit passer l'adresse réseau de chaque appareil qui l'utilise, celle de leurs interlocuteurs, l'heure et le volume, et **ne garde rien** (journal coupé). Les médias qu'il transporte sont chiffrés entre les navigateurs : il n'a pas de clé. C'est un relais **à nous**, sur notre serveur — aucun sous-traitant ne voit passer un appel (Let's Encrypt ne connaît que le NOM du relais, pour son certificat). Deux appareils qui se joignent DIRECTEMENT se montrent en revanche leurs adresses (§ 5, question 32 de la conception) : à écrire dans les textes légaux à l'étape 9.

---

## 10 octies. Le serveur de visio (LiveKit) — pour plus de 4 en vidéo et de 6 en audio dans une salle

Décision du 8 octobre 2026 (« oui plus en vidéo et audio »). Aujourd'hui une salle (un appel de groupe, une réunion) passe en **maille** : chaque téléphone envoie son image à **chacun** des autres. Au-delà de 4 en vidéo (6 en audio), un téléphone en 4G ne suit plus — c'est pourquoi la salle s'arrête là. Le **serveur de visio** reçoit UNE image de chacun et la renvoie aux autres : une salle tient alors **12 personnes en vidéo, 25 en audio**. Ces chiffres sont des **valeurs de départ, à mesurer sur de vrais téléphones** avant d'en promettre quoi que ce soit (`design/opmessages/ESSAI-VISIO.md`) : le site ne promet rien au-delà de 4 en vidéo tant que l'essai n'est pas fait.

Tant que ces gestes ne sont pas faits, **rien ne change** : le service n'a pas de serveur de visio, les salles restent en maille. Une fois posé, les salles **neuves** passent par lui ; s'il tombe, les salles neuves repartent en maille toutes seules (et la surveillance le dit).

⛔ **Tu n'as aucun secret à manipuler.** La paire de clés entre LiveKit et OP MESSAGES naît **sur le VPS**, tirée au hasard par le script, et elle est écrite dans les deux configurations **sans jamais s'afficher**. **Tout ce que le script affiche peut se recoller** dans la conversation.

### Ce que le serveur de visio est — et n'est pas

- **LiveKit 1.13.7**, un logiciel libre (licence Apache 2.0), qui tourne **sur notre VPS** : aucune voix, aucune image ne passe par un tiers. Il est téléchargé depuis sa page de publication officielle, et le script **vérifie l'empreinte de l'archive** (épinglée dans le script) avant de l'ouvrir : une archive qui ne correspond pas n'installe rien.
- ⚠️ **Il voit les flux en clair, dans sa mémoire** — c'est la différence avec le relais (coturn), qui ne fait que transporter des paquets chiffrés. Pour renvoyer l'image de chacun aux autres, un serveur de visio doit la déchiffrer puis la rechiffrer pour chaque destinataire. Il n'écrit et n'enregistre rien (son journal est au niveau « erreur » : ni identité, ni salle, ni adresse en fonctionnement normal). C'est toujours « chiffré en transit » — ce que disent les textes — mais **pas de bout en bout**, pour les salles qui passent par lui (questions 40 et 62 de la conception).
- **Réservé à qui est dans la salle** : le service ne donne un jeton d'entrée (deux minutes) qu'à une personne présente, depuis l'appareil lié à l'appel ; et quand LiveKit annonce une entrée, le service vérifie qu'elle est admise **à cet instant** — une personne retirée qui reviendrait avec un vieux jeton est remise dehors aussitôt.
- **Cloisonné** : sa signalisation n'écoute qu'en local (nginx la relaie sur `https://msg-beta.teamop.fr/rtc` : **pas de nouvelle adresse, pas de nouveau certificat, pas de DNS à poser**) ; son API d'administration n'est pas exposée ; un **pare-feu sortant** propre à son compte l'empêche d'envoyer de l'UDP à la machine elle-même ou à un réseau privé (LiveKit ne filtre pas les adresses qu'annonce un participant : sans ce pare-feu, quelqu'un dans une salle pourrait lui faire envoyer des paquets aux services du VPS). Si une règle ne se pose pas, LiveKit ne démarre pas.
- **Plafonné** : au-delà de 20 Mo/s (160 Mbit/s) reçus et envoyés, il n'admet plus personne de neuf (les salles en cours continuent) ; poids processeur et disque bas, mémoire bornée à 1 Go — si quelque chose doit ploier sur ce VPS, ce n'est pas OP GESTION.
- **Une instance à part de l'autre** : la bêta et la production ont chacune leur LiveKit, leur compte, leur paire de clés et leurs ports — la bêta ne peut rien sur la production.
- **Ce qu'il ne fait pas (encore)** : il ne passe pas par le relais (coturn). Un réseau qui bloque l'UDP passe par son port TCP ; un réseau qui n'ouvre QUE le port 443 (certains pare-feu d'entreprise) ne pourra pas rejoindre une salle par la visio.

### 1. Les ports chez l'hébergeur — AVANT le script

Dans le panneau de ton hébergeur (IONOS : la politique de pare-feu du serveur), ouvre **en entrée** :

| protocole | port | pour quoi |
|---|---|---|
| TCP | 7881 | l'image et la voix, quand l'UDP ne passe pas |
| UDP | 7882 | l'image et la voix (le chemin normal) |

⚠️ **Avant** de lancer le script : sans ces deux ports, la signalisation passe (443) mais **aucune image**, et une salle par la visio ne s'établit pas. Le script ne peut pas le voir (il contrôle depuis le VPS lui-même) ; la surveillance horaire, si : elle frappe au port TCP de l'extérieur. Le pare-feu du VPS (`ufw`), lui, est réglé par le script.

⚠️ **Non vérifié** : je n'ai pas ton panneau sous les yeux, le libellé exact des menus d'IONOS est à constater.

### 2. Télécharger et lancer le script

⚠️ **Le code du serveur de visio doit d'abord être déployé** : le script s'appuie sur deux fichiers qui voyagent avec le service (son contrôle, `outils/verifier-visio.js`, et son pare-feu, `visio-pare-feu.sh`). Tant que cette version n'est pas sur `main` et déployée, il s'arrête avec « la version d'OP MESSAGES en service est antérieure au serveur de visio », sans rien écrire.

Sur le VPS (toujours en root) :

```bash
curl -fsSL https://raw.githubusercontent.com/justino17-cmd/teamop/main/server-msg/install-sfu.sh -o /root/install-sfu.sh
bash /root/install-sfu.sh beta
```

C'est un **fichier** : lis-le si tu veux avant de le lancer (`less /root/install-sfu.sh`). Il fait, dans l'ordre :

1. vérifie tout ce dont il a besoin **avant d'écrire quoi que ce soit** : l'instance, sa version, nginx et le bloc HTTPS de `msg-beta.teamop.fr`, l'adresse publique du VPS ;
2. télécharge LiveKit et **vérifie l'empreinte de l'archive** ; crée un compte système à lui (`opmsg-visio-beta`, sans shell ni dossier) ;
3. tire la paire de clés au hasard, ici, et l'écrit dans les deux configurations ;
4. démarre LiveKit derrière son **pare-feu sortant** (rejoué par systemd avant chaque démarrage), **relit le pare-feu dans le noyau**, puis le **contrôle** : il répond, notre clé ouvre son API, une fausse est refusée, sa signalisation exige un jeton ;
5. ajoute le chemin `/rtc` dans le bloc HTTPS de l'instance (trois lignes entre deux marques, **validées par `nginx -t`** avant tout rechargement) et contrôle, **par le nom public**, qu'il mène bien à LiveKit ;
6. relance l'instance, attend qu'elle voie la visio, puis **prouve que les avis de LiveKit lui arrivent** (une salle de contrôle ouverte puis fermée) ;
7. **seulement alors**, ouvre les deux ports dans `ufw` (s'il est actif).

Une étape ratée **défait tout** : la visio est retirée, OP MESSAGES continue en maille, et le script dit pourquoi.

Une variable, **facultative** : `OPMSG_VISIO_IP` (l'adresse IPv4 publique du VPS — seulement si le script dit que celle de sa route par défaut n'est pas publique ; un VPS qui porte sa propre adresse publique n'en a pas besoin).

**Ce que tu dois voir** :

```
── OP MESSAGES · serveur de visio · instance beta
   adresse publique annoncée : 217.154.6.139 · ports : TCP 7881, UDP 7882 (et 7880 en boucle locale)
   LiveKit 1.13.7 : téléchargement
   LiveKit 1.13.7 : installé (empreinte de l'archive vérifiée)
   compte système opmsg-visio-beta : créé
   cle=nouvelle instance=change livekit=change
── Contrôle du serveur de visio (ce serveur contre lui-même)…
── Le serveur de visio de l'instance beta, en boucle locale
  ✓ LiveKit répond à sa sonde, en boucle locale
  ✓ NOTRE paire de clés ouvre son API d'administration
  ✓ ⛔ une clé FAUSSE y est refusée (401 : il vérifie les signatures)
  ✓ ⛔ sa signalisation REFUSE qui n'a pas de jeton (401)
  ✓ et accepte un jeton du service (200)
✓ Le serveur de visio fait ce qu'il doit.
   nginx : chemin /rtc posé dans le bloc de msg-beta.teamop.fr
── Contrôle du chemin /rtc, par le nom public…
  ✓ msg-beta.teamop.fr/rtc mène à LiveKit (…)
  …
   ✓ l'instance voit la visio (/health : visio.ok)
── Contrôle des avis de LiveKit (une salle de contrôle ouverte puis fermée)…
  ✓ ⛔ ses avis arrivent au service ET y sont acceptés (signés de notre secret)
  …
   pare-feu du VPS (ufw) : TCP 7881 et UDP 7882 ouverts

✓ Le serveur de visio est en place pour beta : …
```

(`cle=nouvelle` la première fois, `cle=reprise` à chaque relance.)

Les sorties d'erreur possibles — **colle toute la sortie** dans la conversation :

- **`antérieure au serveur de visio`** → la version n'est pas encore déployée. Rien n'est écrit.
- **`l'archive de LiveKit n'a PAS l'empreinte attendue`** → l'archive téléchargée n'est pas celle qu'on a éprouvée : elle n'est pas ouverte, rien n'est installé. Colle les deux empreintes affichées.
- **`le téléchargement de LiveKit a échoué`** → le VPS n'atteint pas GitHub. Rien n'est installé.
- **`l'adresse de la route par défaut … n'est pas publique`** → relance avec `OPMSG_VISIO_IP=<l'adresse publique du VPS> bash /root/install-sfu.sh beta`.
- **`LiveKit n'a pas démarré`**, **`le pare-feu sortant de la visio n'est pas dans le noyau`**, **`LiveKit ne fait pas ce qu'il doit`**, **`ne mène pas à LiveKit`**, **`ne voit pas la visio`**, **`les avis de LiveKit n'arrivent pas`** → tout est défait, OP MESSAGES continue en maille. `systemctl status opmsg-visio-beta --no-pager | head -5` dit souvent pourquoi : colle-le.

### 3. Vérifier — de l'extérieur

Sur ton Mac :

```bash
curl -s https://msg-beta.teamop.fr/health
nc -vz msg-beta.teamop.fr 7881
```

**À voir** : dans `/health`, `"visio":{"configuree":true,"ok":true,` ; pour `nc`, `succeeded` (ou `open`). Rien de secret ne s'affiche. ⚠️ `nc` ne prouve que le TCP ; **la preuve de l'UDP est une salle** (l'essai de la fiche `ESSAI-VISIO.md`).

Pour rejouer les contrôles sur le VPS, à tout moment, sans rien changer :

```bash
OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/outils/verifier-visio.js beta
OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/outils/verifier-visio.js beta --public
OPMSG_VISIO_UTILISATEUR=opmsg-visio-beta OPMSG_VISIO_CHAINE=OPMSG-VISIO-BETA /usr/local/sbin/opmsg-visio-pare-feu verifier
```

**À voir** : des `✓`, puis `pare-feu de la visio : en place`. S'il dit `ABSENT`, `systemctl restart opmsg-visio-beta` le repose.

### 4. Ce qui se passe seul, ce qui crie

- **Les salles neuves** passent par la visio tant qu'elle répond ; si elle tombe (deux sondes ratées), elles repartent en maille toutes seules, et celles qui passaient par elle sont coupées.
- **La surveillance** (le script de surveillance d'OP MESSAGES — pas encore branché sur un workflow, comme pour le relais) crie si la visio est configurée et hors service, si ses avis sont tous refusés (la paire de clés ne correspond plus), ou si son port TCP ne se joint pas de l'extérieur (le pare-feu de l'hébergeur).
- **Le pare-feu de la visio** se repose à chaque démarrage de LiveKit et se retire à son arrêt. Comme pour le relais, on ne sait pas encore si `ufw reload` retire sa chaîne du noyau : `opmsg-visio-pare-feu verifier` le dit.
- **Rien d'autre** : pas de tâche planifiée, pas de journal à lire.

### 5. Revenir en arrière

Une commande retire tout (la configuration de l'instance d'abord — plus aucune salle neuve ne part en visio —, puis le chemin `/rtc`, LiveKit, ses fichiers et ses ports dans `ufw`) :

```bash
bash /root/install-sfu.sh beta retirer
```

Les salles repassent en maille (4 en vidéo, 6 en audio). Tu peux ensuite refermer les deux ports dans le panneau de l'hébergeur.

### 6. Ce que le serveur de visio reçoit (pour les textes légaux)

L'adresse réseau de chaque appareil qui rejoint une salle par lui, l'heure, le volume, et — en mémoire seulement, le temps de les renvoyer — **la voix et l'image en clair**. Il ne garde rien. C'est un serveur **à nous** : aucun sous-traitant ne voit passer une salle. Ce qui change pour les textes légaux (à l'étape 9) : les salles par la visio sont chiffrées en transit, **pas de bout en bout**.

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
6. **Avant qu'une seule personne n'entre** : la sauvegarde de la production — les gestes de la section 10 ter avec `OPMSG_CONFIG=/etc/opmsg/prod.json` et les chemins `/opt/opmsg/prod/…`,
   **un bucket à elle, une paire de clés à elle, une clé de sauvegarde neuve** — puis un essai de restauration réussi (geste 6).
7. **Le relais d'appels de la production** : le MÊME coturn sert les deux instances (le DNS `turn` et les ports sont déjà faits). `bash /root/install-turn.sh prod` y ajoute un second secret, tiré lui aussi sur le VPS et jamais affiché (section 10 septies, geste 2) ; le secret de la bêta ne sert pas à la production.

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

- **Pas de sauvegarde hors site à l'installation** : elle se pose à part, section 10 ter (bucket distinct, clés propres, exercice de
  restauration). Les données de la bêta sont **jetables** et le disent ; **aucune personne extérieure à l'équipe** n'entre avant
  qu'un essai de restauration ait réussi.
- **Pas de TURN** (le relais des appels) : il se pose à part, section 10 septies (le DNS `turn`, les ports chez l'hébergeur, `install-turn.sh`) ; sans lui, un appel ne passe qu'entre deux appareils qui se joignent seuls, et la page le dit. **Stripe** (Messages Pro) se pose à part, section 10 quinquies, en mode test d'abord ; sans clé, la facturation est inerte et le dit. Le **courriel** (les invitations aux réunions) se pose à part, section 10 sexies ; sans relais, il est inerte et le dit.
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
- **La sauvegarde de `msg.db` n'existe qu'une fois la section 10 ter faite** (et un essai de restauration réussi) : ne pas mettre la production en service avant.
- **Les écritures bloquent la boucle quand le disque est saturé** (`synchronous=FULL`, SQLite sur le fil principal) : mesuré en
  faisant lire tout le disque par quatre processus pendant que cinq écrivains envoient — écriture p50 3 ms → 405 ms, p95 2 s, et
  les lectures suivent. Choix assumé en tête de `stockage.js` (durabilité d'abord, `worker_thread` si la mesure l'exige) ;
  l'unité donne déjà `IOWeight=20` (OP GESTION passe devant). À reprendre avant la production si la surveillance voit
  `boucle.p99Ms` monter. ⚠️ Ce p99 est CUMULÉ depuis le démarrage : un incident le pollue jusqu'au redémarrage.
- **`/api/beta/etat` (forme à un login) est publique côté OP GESTION** et dit si un login existe et est ouvert : un oracle
  d'énumération d'avant ce chantier (les pages déjà déployées l'utilisent). La forme à identifiants de compte (`ids`) n'a pas ce
  défaut (40 bits aléatoires). À retirer quand `beta.html` n'utilisera plus l'ancienne.
