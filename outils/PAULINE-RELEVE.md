# Le pont de Pauline — voir dans la Tour ce qu'elle fait

Pauline (Harvey, sur ton Mac) envoie à la Tour, toutes les 15 minutes, un **relevé** : ses recherches, les
entreprises qu'elle a trouvées, ses courriels (en attente de ton accord, envoyés, refusés), les réponses reçues et
les chiffres du jour (envois, plafond, chauffe). Un relevé **remplace** le précédent : rien ne s'accumule sur le
serveur au-delà de 90 jours d'historique.

Une étape à la fois. Les commandes se tapent **dans le Terminal du Mac**, sauf l'étape 4 (le serveur).

> ⛔ **Le jeton est un secret : il ne s'affiche jamais, il ne se colle jamais dans une conversation.** Il vit dans
> `~/harvey/.env` et nulle part ailleurs. Ce que tu colles ou envoies, c'est son **empreinte** (64 caractères) : elle
> ne permet pas de retrouver le jeton, ce n'est pas un secret.

## 1. Mettre le script dans le dossier de Harvey

Depuis ta copie du dépôt TeamOP (la branche à jour) :

```bash
mkdir -p ~/harvey/outils
cp ~/Documents/GitHub/teamop/outils/pauline-releve.py ~/harvey/outils/
cp ~/Documents/GitHub/teamop/outils/pauline-releve.plist ~/harvey/outils/
```

Il n'utilise **aucune dépendance** : le Python du venv de Harvey, ou n'importe quel `python3`, suffit.

## 2. Voir le relevé sans rien envoyer

```bash
cd ~/harvey
.venv/bin/python outils/pauline-releve.py --essai
```

Il affiche le relevé (du texte JSON) et, tout en bas, une phrase du genre « Essai : rien n'a été envoyé. 12
entreprise(s), 3 courriel(s)… ». Il ne lit **pas** le jeton et n'écrit **rien** dans la base de Harvey (elle est
ouverte en lecture seule). Si tu vois une phrase d'erreur, elle dit quoi faire ; sinon, passe à l'étape 3.

## 3. Fabriquer le jeton — sans l'afficher

```bash
cd ~/harvey
.venv/bin/python outils/pauline-releve.py --fabriquer-jeton
```

Le script écrit un jeton neuf dans `~/harvey/.env` (ligne `TEAMOP_RELEVE_JETON=…`, fichier aux droits 600) et
n'imprime **que son empreinte**, une ligne de 64 caractères. **Garde cette ligne** : c'est ce qu'on pose sur le
serveur à l'étape suivante. Si le jeton existe déjà, le script refuse de l'écraser et le dit.

## 4. Poser l'empreinte sur le serveur

⚠️ D'abord, le code du pont doit être **déployé** sur le serveur (il l'est quand cette branche a rejoint `main`).
Tant que l'empreinte n'est pas posée, le serveur répond « pont non configuré » (503) : rien n'entre.

```bash
ssh -t root@api.teamop.fr "cd /opt/teamop/repo && git pull -q && bash server/set-pauline.sh"
```

Le script te demande l'empreinte : colle la ligne de l'étape 3. Il vérifie qu'elle a 64 caractères, la range dans
`/opt/teamop/config.json` (champ `pauline.jetonSha256`) et redémarre le serveur. Il n'affiche aucun secret : tu peux
coller sa sortie ici si quelque chose ne va pas.

## 5. Le premier envoi, à la main

```bash
cd ~/harvey
.venv/bin/python outils/pauline-releve.py
```

Réponse attendue : « Relevé envoyé : 12 entreprise(s), … ». Sinon, le message te dit pourquoi :

| code | ce que ça veut dire | quoi faire |
|---|---|---|
| 0 | tout va bien | rien |
| 2 | le jeton ou l'adresse manque | refaire l'étape 3 (le script le dit) |
| 3 | la base de Harvey est introuvable ou illisible | être dans `~/harvey` (ou `--harvey ~/harvey`), Harvey lancé au moins une fois |
| 4 | le serveur est injoignable (réseau) | rien : le prochain passage réessaie |
| 5 | le serveur a refusé : « refuse le jeton » = l'empreinte posée n'est pas celle du `.env` ; « pas encore ouvert » = étape 4 oubliée | refaire l'étape 4 avec l'empreinte de l'étape 3 |

## 6. Le voir dans la Tour

L'écran de la Tour lit `GET /api/monitor/pauline` (réservé au patron). Tant que rien n'a été reçu, il répond
« rien reçu » ; si le fichier du serveur est illisible, il répond une erreur (503) — jamais « rien ».

## 7. Le lancer tout seul, toutes les 15 minutes

```bash
sed "s#__HARVEY__#$HOME/harvey#g" ~/harvey/outils/pauline-releve.plist > ~/Library/LaunchAgents/fr.teamop.pauline-releve.plist
plutil -lint ~/Library/LaunchAgents/fr.teamop.pauline-releve.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/fr.teamop.pauline-releve.plist
```

`plutil` doit répondre « OK ». Il envoie un relevé tout de suite, puis toutes les 15 minutes tant que le Mac est
allumé et ta session ouverte. Le journal est `~/harvey/data/pauline-releve.log` (phrases courtes et nombres, aucun
nom de prospect, jamais le jeton). Pour l'arrêter :

```bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/fr.teamop.pauline-releve.plist
```

## Changer le jeton, ou fermer le pont

- **Changer le jeton** (jeton perdu, Mac prêté, doute) : `.venv/bin/python outils/pauline-releve.py --fabriquer-jeton --remplacer`,
  puis refaire l'étape 4 avec la **nouvelle** empreinte. L'ancien jeton cesse de marcher dès le redémarrage.
- **Fermer le pont** : `bash server/set-pauline.sh` puis taper `retirer`. Le serveur répond 503 à tout le monde.

## Ce qui voyage, ce qui reste

- **Envoyé** : noms d'entreprises, ville, métier, état ; l'adresse professionnelle et le nom du contact quand
  Harvey les a trouvés ; objet et texte des courriels ; le début des réponses reçues. **Jamais** : le jeton, les mots
  de passe de `.env`, la clé de Harvey.
- **Chez nous** : le serveur chiffre le fichier au repos avec la clé maître (comme les mots de passe des boîtes mail),
  ne garde que 90 jours de courriels, de recherches et de réponses, ne met **aucune donnée de prospect** dans ses
  journaux, et seul le patron peut le lire.
- Le script lit la base de Harvey en **lecture seule** : il ne peut rien y changer.
