# Allumer le socle — la procédure, geste par geste

⛔ **Ce fichier existe parce qu'il manquait, et que son absence était un constat bloquant.**
Le jour où l'étape 1 s'allume sur le VPS de production, ce sera sur une plateforme où des
entreprises travaillent. Il n'y avait nulle part une suite de gestes à suivre, ni un moyen de
savoir qu'on est prêt AVANT de basculer le drapeau, ni comment revenir en arrière.

Il est écrit pour **quelqu'un qui n'a pas écrit ce code**. Chaque geste dit ce qu'on attend de
voir. Si ce n'est pas ce qui s'affiche, **on s'arrête** — on ne continue jamais « en espérant ».

⚠️ **Rien ici n'est à faire aujourd'hui.** L'étape 1 s'allume à l'étape 4 du
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
| 4 | La clé maître sera en séquestre à DEUX endroits distincts | gestionnaire de mots de passe **+** copie scellée hors ligne |
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

Puis, pour que le service la lise :

```bash
systemctl daemon-reload && systemctl restart teamop-api
curl -s localhost:8080/health | grep -o '"socle":{[^}]*}'
```

→ on attend `"cle":true`. **Si c'est `false`, la clé est posée là où le serveur ne la regarde
pas** — on s'arrête et on règle ça avant tout le reste.

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

- [ ] la clé maître est en séquestre à DEUX endroits, et on sait la relire
- [ ] `/health` → `socle.actif:true`, `socle.cle:true`
- [ ] `/health` → `sauvegarde.active:true` et une sauvegarde a réussi depuis l'allumage
- [ ] une restauration a été essayée POUR DE FAUX depuis l'allumage
- [ ] la première entreprise servie n'est pas ELAN
- [ ] `socle.refus` est vide et `socle.illisibles` vaut 0 après 24 h
- [ ] la surveillance horaire voit les compteurs (`.github/scripts/surveillance.js`)

**Une case non cochée, c'est un allumage qui attend.** Personne n'a jamais regretté d'avoir
attendu un jour de plus ; ce dépôt a plusieurs fois regretté l'inverse.
