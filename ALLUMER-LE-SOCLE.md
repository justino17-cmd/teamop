# Allumer le socle — la procédure, geste par geste

⛔ **Ce fichier existe parce qu'il manquait, et que son absence était un constat bloquant.**
Le jour où l'étape 1 s'allume sur le VPS de production, ce sera sur une plateforme où des
entreprises travaillent. Il n'y avait nulle part une suite de gestes à suivre, ni un moyen de
savoir qu'on est prêt AVANT de basculer le drapeau, ni comment revenir en arrière.

Il est écrit pour **quelqu'un qui n'a pas écrit ce code**. Chaque geste dit ce qu'on attend de
voir. Si ce n'est pas ce qui s'affiche, **on s'arrête** — on ne continue jamais « en espérant ».

✅ **Section 1 FAITE le 24 septembre 2026** (Justin, guidé) : clé générée à 16 h 01 UTC sur un
VPS sans aucune base, deux copies rangées (gestionnaire de mots de passe + papier) et relues
chacune par la commande masquée — « ✓ identique » deux fois —, service redémarré à 17 h 07 UTC
qui la LIT (`cmp` ✓). Le socle, lui, est toujours éteint : la section 3 reste à faire.

⚠️ **Rien d'autre ici n'est à faire aujourd'hui.** L'étape 1 s'allume à l'étape 4 du
`PLAN-OP-SOCLE.md`, après le préavis écrit à ELAN. Tant que ce préavis n'est pas parti, la
seule bonne valeur de `socle.actif` est `false`.

---

## 0. Avant de toucher à quoi que ce soit — les cinq conditions

Aucune n'est facultative. Si une seule est fausse, on ne commence pas.

| | condition | comment on la vérifie |
|---|---|---|
| 1 | Le préavis / l'accord écrit est parti chez ELAN | Justin le sait. Personne d'autre. |
| 2 | La sauvegarde hors site tourne et a réussi récemment | `curl -s https://api.teamop.fr/health` → `sauvegarde: {active:true, ok:true, ageH:<24}` |
| 3 | Une restauration a été **essayée pour de faux**, au moins une fois | `node server/restaurer.js essai` sur le VPS |
| 4 | La clé maître sera en séquestre à DEUX endroits distincts | gestionnaire de mots de passe **+** copie scellée hors ligne — ✅ **fait le 24 septembre 2026**, les deux relues |
| 5 | La suite complète passe sur la branche qu'on déploie | `for f in tests/test-*.js; do node "$f"; done` → 0 échec |

⛔ **La 3 est celle qu'on saute, et c'est celle qui coûte.** Une sauvegarde qu'on n'a jamais su
rouvrir n'est pas une sauvegarde, c'est une croyance. `restaurer.js` est écrit pour être lancé
un jour de calme, précisément pour savoir qu'il marchera le jour de la panique.

---

## 1. Poser la clé maître — AVANT le déploiement du code

```bash
ssh root@api.teamop.fr
node /opt/teamop/repo/server/poser-cle.js
```

Ce qu'on doit voir, sur une installation neuve :

```
  → réglage systemd ajouté : /etc/systemd/system/teamop-api.service.d/kek.conf
  ✅ Clé maître générée (aucune base n'existait encore).
  ⛔⛔ À METTRE EN SÉQUESTRE MAINTENANT, PAS PLUS TARD :
      <64 caractères hexadécimaux>
```

⛔ **On copie ces 64 caractères et on les range AVANT de continuer.** Sans eux, un VPS perdu
= des sauvegardes définitivement illisibles : le coffre ne stocke que du chiffré. Les ranger à
DEUX endroits, puis **vérifier qu'on sait les relire** — un mot de passe qu'on ne sait pas
rouvrir ne vaut rien.

Les deux autres réponses possibles, et ce qu'elles veulent dire :

- **`✅ Une clé est DÉJÀ posée. On n'y touche pas.`** → parfait, on continue. Ne JAMAIS la
  remplacer : une clé neuve sur des bases existantes rend les données de toutes les entreprises
  définitivement illisibles.
- **`⛔ N base(s) d'entreprise existent et la clé est ABSENTE.`** → **c'est un INCIDENT, pas une
  installation.** On ne génère rien. On va chercher la clé au séquestre et on la pose :
  `node server/poser-cle.js <les 64 caractères>`.

⛔ **Relire chaque copie SANS l'afficher.** Cette commande demande la clé en saisie masquée
(rien à l'écran, rien dans l'historique), la compare à celle du serveur, et ne dit que
« ✓ identique » ou la position du premier caractère faux. Une fois par copie — pour le papier,
on TAPE la clé (espaces et majuscules acceptés) :

```bash
K=; while [ -z "${K// /}" ]; do read -rsp "Colle (ou tape) la clé, puis Entrée : " K || break; echo; done; K=${K// /}; K=${K,,}; V=$(cat /etc/teamop/kek); echo "longueur : ${#K} (attendu 64)"; [ "$K" = "$V" ] && echo "✓ identique" || { i=0; while [ $i -lt 64 ] && [ "${K:$i:1}" = "${V:$i:1}" ]; do i=$((i+1)); done; echo "✗ différente — première différence : caractère n° $((i+1))"; }; unset K V i
```

⚠️ Mesuré le 24 septembre 2026 : une première version rendait « longueur : 0 » — Entrée partie
avant le collage, ou un presse-papiers qui commençait par une ligne vide. Celle-ci redemande tant
que la saisie est vide. Une différence au caractère n se corrige sur la copie, pas sur le serveur.

Puis, pour que le service la lise — et le PROUVER :

```bash
systemctl daemon-reload && systemctl restart teamop-api; sleep 3; systemctl is-active teamop-api; cmp -s /etc/teamop/kek /run/credentials/teamop-api.service/teamop_kek && echo "✓ le service lit la clé" || echo "✗ le service ne voit pas la clé"
```

→ on attend `active`, puis `✓ le service lit la clé`. Rien ne s'affiche de la clé.

⛔ **`/health` ne peut PAS servir ici** : il ne publie la clé (`"cle":true`) qu'une fois le
socle ALLUMÉ, à la section 3. Éteint, il rend `"socle":{"actif":false}` et rien d'autre — ni
réussite ni échec, une question qu'il ne pose pas encore. Cette page le donnait pourtant comme
preuve, et `poser-cle.js` aussi, jusqu'au 24 septembre 2026 : le jour où on s'en est servi pour
de vrai, le contrôle ne pouvait rien répondre.

**Si c'est `✗`, on s'arrête**, et on regarde ce que systemd a VRAIMENT chargé avant de corriger
quoi que ce soit (aucune de ces lignes n'affiche la clé) :

```bash
systemctl show teamop-api -p DropInPaths          # doit citer …/kek.conf
P=$(systemctl show -p MainPID --value teamop-api); tr '\0' '\n' < /proc/$P/environ | grep '^CREDENTIALS_DIRECTORY='
journalctl --since "-15min" --no-pager -t systemd | grep -i "teamop\|reloading"
```

Un `DropInPaths` vide veut dire que le réglage n'existe plus : relancer `poser-cle.js`, qui le
repose sans toucher à la clé. Dans le journal, `run-credentials-teamop\x2dapi.service.mount:
Deactivated` à un arrêt prouve que le service qui s'arrêtait AVAIT la clé.

⛔ **Pas de commande de secours « au cas où ».** Le 24 septembre 2026, celle qui défaisait ce
geste (`rm …/kek.conf`) voyageait dans le même message que le contrôle : elle a été lancée à la
suite, et elle a effacé un réglage qui MARCHAIT — le journal l'a montré après coup. Un retour en
arrière se donne SEUL, une fois la panne constatée, et il met de côté (`mv`), il n'efface pas.

---

## 2. Déployer le code, drapeau ÉTEINT

Le push sur `main` touchant `server/**` déploie tout seul. Le socle arrive donc **inerte** :
`socle.actif` vaut `false` par défaut, aucune route n'est déclarée, aucun fichier n'est ouvert.

Ce qu'on vérifie une fois le déploiement passé :

```bash
curl -s https://api.teamop.fr/health
```

| on attend | ce que ça dit |
|---|---|
| `"socle":{"actif":false}` | le socle est là et dort |
| `"sauvegarde":{"active":true,…}` | ⛔ la sauvegarde est toujours montée. Si elle est `false`, **on s'arrête** |
| `"routesDoublons":0` | aucune route déclarée deux fois |

Et sur le VPS, que rien n'est né :

```bash
ls /opt/teamop/data/socle 2>/dev/null ; ls /opt/teamop/data/socle-annuaire.db 2>/dev/null
```

→ **les deux doivent être absents.** Le socle éteint n'écrit rien. S'il y a quelque chose, on
ne l'allume pas avant d'avoir compris pourquoi.

---

## 3. Allumer, une entreprise d'abord

```bash
nano /opt/teamop/config.json     # "socle": { "actif": true }
systemctl restart teamop-api
curl -s https://api.teamop.fr/health | grep -o '"socle":{[^}]*}'
```

→ on attend `"actif":true`, `"cle":true`, `"bases":0`.

⛔ **On n'ouvre pas tout le monde d'un coup.** La première entreprise servie doit être une
qu'on peut regarder de près — la bêta, ou un espace d'essai. Pas ELAN.

Ce qu'on surveille pendant les premières heures, sur `/health` :

| champ | ce qu'il veut dire quand il monte |
|---|---|
| `socle.refus.disque_plein` | **panne de plateforme** : plus personne n'écrit. Agir tout de suite |
| `socle.refus.horlogeAvancee` | l'horloge du VPS a décroché. `timedatectl` |
| `socle.refus.espace_plein` | UNE entreprise déborde : régler son plafond (`socle.octetsMax`) |
| `socle.illisibles` | des lignes ne se déchiffrent plus. Incident, à examiner en Tour |
| `sauvegarde.instantaneEchecs` | une base n'a pas pu être instantanée — elle part en copie brute |

---

## 4. Revenir en arrière — et ce que ça ne fait PAS

```bash
nano /opt/teamop/config.json     # "socle": { "actif": false }
systemctl restart teamop-api
```

C'est tout : **pas de push, pas de déploiement.** Les routes `/api/op/*` disparaissent, les
appareils retombent sur Firestore.

⚠️ **Ce que le retour en arrière ne fait pas, et qu'il faut avoir en tête :**

- Les bases déjà écrites **restent sur le disque**, chiffrées. C'est voulu — on ne jette pas
  les données d'un client parce qu'on a éteint un drapeau.
- Elles **continuent de partir dans la sauvegarde nocturne**. C'est voulu aussi : le jour où on
  rallume, elles doivent être là.
- Fermer, rouvrir ou supprimer une entreprise depuis la Tour **agit quand même** sur ces bases,
  drapeau éteint. ⛔ C'était un bloquant le 19 septembre : les trois fonctions rendaient un
  succès sans rien faire — supprimer une entreprise la laissait sur le disque, et rouvrir une
  suspension la condamnait définitivement. `tests/test-726.js` tient les deux cas.
- Ce qui a été écrit dans le socle pendant qu'il tournait **n'est pas reversé dans Firestore**.
  Si des appareils ont écrit par `/api/op/*`, il faut décider quoi en faire AVANT d'éteindre.

---

## 5. Restaurer après un sinistre

Sur n'importe quelle machine qui a Node **et la clé du séquestre** :

```bash
export TEAMOP_SAUV_CLE=<les 64 caractères de la clé de SAUVEGARDE>
node server/restaurer.js liste                    # ce que contient le coffre
node server/restaurer.js essai                    # ouvre la dernière, compte, efface
node server/restaurer.js extraire <clé> /tmp/vps  # pose le contenu où on veut
```

⛔ **Sur un VPS MORT, `config.json` n'existe plus — et c'est justement le cas de cette
section.** `TEAMOP_SAUV_CLE` ne suffit alors pas : elle déchiffre l'archive, mais elle ne dit
pas OÙ est le coffre. Sans l'adresse, le client S3 ne se construit même pas, et la commande
échoue avant d'avoir rien téléchargé. Il faut **les deux** :

```bash
export TEAMOP_SAUV_CLE=<les 64 caractères>
export TEAMOP_SAUV_COFFRE=<endpoint>,<bucket>,<accessKey>,<secretKey>
node server/restaurer.js liste
```

⛔ **La flèche « → » de `liste` désigne la dernière copie du JOUR ; les copies mensuelles sont
listées à part, dessous.** Jusqu'au 24 septembre 2026, l'outil triait tout le coffre par ordre
alphabétique : `teamop/mensuel/…` passait devant `teamop/2026-…` (« m » après « 2 »), la
flèche désignait donc la copie du MOIS, et `essai` l'ouvrait à la place de celle de la nuit —
jusqu'à un mois de données perdues pour qui restaure sur la foi de la flèche. Corrigé sur la
branche (`tests/test-805.js`). ⚠️ **Tant que ce correctif n'est pas sur `main`** (déploiement du
serveur), l'outil du VPS — et celui d'un clone neuf — garde le défaut : **lire la DATE dans le
nom de l'archive**, ne pas se fier à la flèche.

Dans cet ordre, séparés par des virgules (une cinquième valeur, la région, est facultative).
⚠️ **Ces quatre valeurs doivent être au séquestre À CÔTÉ des deux clés.** Elles vivent
aujourd'hui dans `/opt/teamop/config.json` — c'est-à-dire sur la machine qu'on est en train de
supposer perdue. Les y laisser seules, c'est avoir trois clés parfaites et aucune porte.
Tant que `config.json` est lisible, `restaurer.js` les y prend tout seul : c'est pour cela que
l'essai en répétition (section 6) passe sans elles, et que leur absence ne se remarque pas
avant le jour où elle coûte tout.

⚠️ **Deux clés différentes, à ne jamais confondre :**

| | ce qu'elle protège | où elle vit |
|---|---|---|
| `sauvegarde.cle` | l'**archive** (AES-256-GCM) | `config.json` + séquestre |
| la clé **maître** du socle (KEK) | les **clés d'entreprise** dans l'annuaire | `/etc/teamop/kek` + séquestre |

Il faut **les deux** pour relire les données d'un client à partir d'une archive. L'une sans
l'autre ne donne rien.

Le contenu extrait porte `socle-instantane/socle-annuaire.db` et un `<t>.db` par entreprise.
Pour les remettre en place sur un serveur **arrêté** :

```bash
systemctl stop teamop-api
node -e "process.env.TEAMOP_DATA='/opt/teamop/data'; \
  console.log(require('/opt/teamop/repo/server/socle.js').restaurerDepuis('/tmp/vps/socle-instantane'))"
systemctl start teamop-api
```

⚠️ **Ce geste-là ne demande AUCUNE clé** — il ne fait que recopier des fichiers. Mesuré le
19 septembre 2026 : deux fichiers restaurés, `socle-annuaire.db` et `socle/<t>/base.db` posés
au bon endroit, sans `TEAMOP_KEK` dans l'environnement. La clé maître ne sert qu'à LIRE les
données ensuite, quand le serveur redémarre. Bon à savoir à quatre heures du matin : on peut
remettre les fichiers en place tout de suite, et chercher la clé après.

⛔ Si le message parle de **copies brutes**, ces bases-là n'ont pas pu être instantanées
proprement : elles sont remises quand même, et elles demandent un examen. Ne pas passer dessus.

---

## 6. La liste avant de dire « c'est allumé »

- [x] la clé maître est en séquestre à DEUX endroits, et on sait la relire (24 septembre 2026)
- [ ] la clé de SAUVEGARDE y est aussi — ce n'est pas la même (voir le tableau, section 5)
- [ ] ⛔ **les quatre coordonnées du coffre** (endpoint, bucket, accessKey, secretKey) y sont
      également : elles ne vivent aujourd'hui que dans `/opt/teamop/config.json`, c'est-à-dire
      sur la machine qu'un sinistre fait disparaître. Trois clés parfaites et aucune porte,
      c'est un coffre perdu.
- [ ] `/health` → `socle.actif:true`, `socle.cle:true`
- [ ] `/health` → `sauvegarde.active:true` et une sauvegarde a réussi depuis l'allumage
- [ ] une restauration a été essayée POUR DE FAUX depuis l'allumage
- [ ] ⚠️ et au moins une fois **sans `config.json`**, avec les deux variables d'environnement
      seules : c'est le seul essai qui ressemble au sinistre réel — sur le VPS lui-même, sans rien
      toucher : `TEAMOP_CONFIG=/nulle-part` fait ignorer son `config.json`, et les valeurs se
      TAPENT depuis le séquestre, en saisie masquée (ni écran, ni historique). Éprouvé le
      24 septembre 2026 contre un coffre local : « RESTAURABLE », variables effacées après,
      aucun secret dans la sortie.
      ```bash
      read -rsp "Clé de SAUVEGARDE (64 caractères) : " TEAMOP_SAUV_CLE; echo; read -rsp "Coffre — endpoint,bucket,accessKey,secretKey : " TEAMOP_SAUV_COFFRE; echo; export TEAMOP_SAUV_CLE TEAMOP_SAUV_COFFRE; TEAMOP_CONFIG=/nulle-part node /opt/teamop/repo/server/restaurer.js essai; unset TEAMOP_SAUV_CLE TEAMOP_SAUV_COFFRE
      ```
- [ ] la première entreprise servie n'est pas ELAN
- [ ] `socle.refus` est vide et `socle.illisibles` vaut 0 après 24 h
- [ ] la surveillance horaire voit les compteurs (`.github/scripts/surveillance.js`)

**Une case non cochée, c'est un allumage qui attend.** Personne n'a jamais regretté d'avoir
attendu un jour de plus ; ce dépôt a plusieurs fois regretté l'inverse.
