# Installer le serveur d'OP MESSAGES — les gestes de Justin, dans l'ordre

Pour `design/opmessages/SERVEUR.md` § 4, étape 1 (« gestes de Justin »), puis l'étape 2 (les SMS, section 10 bis) et l'étape 3 (la sauvegarde,
section 10 ter), puis les notifications (section 10 quater) et Messages Pro (l'étape 5 : Stripe, section 10 quinquies). Ce document dit **chaque geste**,
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

Pour relire la configuration posée, sans rien changer : `OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-stripe.js --verifier`.

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
- **Pas de TURN** (appels), pas de courriel d'envoi : étapes 7 et 2. **Stripe** (Messages Pro) se pose à part, section 10 quinquies, en mode test d'abord ; sans clé, la facturation est inerte et le dit.
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
