# TeamOP

Suite logicielle pour entreprises de terrain — nettoyage, lutte anti-nuisibles.
Applications : OP GESTION (interventions, clients, devis) et OP MESSAGES (messagerie).
Vendu par abonnement, clients réels, données réelles. **Ce dépôt est en production.**

⛔ **OP MESSAGES ET OP GESTION SE SÉPARENT — décision de Justin, 22 septembre 2026.** OP MESSAGES
reste une application TeamOP, mais elle aura **son propre serveur** : elle vise « tout public et
aussi professionnel », donc des comptes de PERSONNES, quand OP GESTION cloisonne par ENTREPRISE
(`{t, kh}`, une clé par espace). Les deux modèles d'identité ne se transposent pas — c'est
précisément ce qui bloquait l'étape A du chantier socle, et c'est pourquoi elle est retirée du
plan plutôt que tranchée. `messages.html` reste fermée (`OPMSG_EN_TRAVAUX`) et sera REVUE plus
tard ; `op-fs.js` et son banc sont conservés pour ce jour-là. **Ne pas rebrancher OP MESSAGES
sur le socle d'OP GESTION** — et se rappeler qu'« éteindre Firebase » (étapes E et F) ne peut
pas être total tant qu'OP MESSAGES y vit.

📍 **Avant toute chose, lire `REPRISE.md`** — les chantiers ouverts, les dettes connues et ce
qui attend une décision de Justin. Une conversation meurt, le dépôt reste : ce fichier est la
seule mémoire qui passe de l'une à l'autre. Le tenir à jour quand un chantier change d'état.

## Structure

- **Racine** — site vitrine et applications, HTML/CSS/JS sans framework, servi par GitHub Pages
- **`server/`** — API Node/Express déployée sur un VPS, hors GitHub Pages
- **`.github/workflows/`** — surveillance horaire du site et de l'API

Pas de compilation, pas de bundler. Ce qui est écrit est ce qui est servi.

## Le serveur

`server/index.js` — 7 496 lignes (recompté le 20 septembre 2026 ; il a doublé,
puis redoublé, depuis la première rédaction de cette fiche — se méfier des chiffres de cette
page plus vieux que quelques jours, celui-ci compris : il a vieilli de 90 lignes dans la
journée même où il a été corrigé). Écoute sur `127.0.0.1:8080`,
**derrière nginx** (d'où `app.set('trust proxy', 1)`).

Dépendances : `express`, `imapflow` + `mailparser` (réception des courriels),
`nodemailer` (envoi), `web-push` (notifications), `@anthropic-ai/sdk`.

**Stripe n'est pas une dépendance** : l'API est appelée directement par `fetch`
vers `api.stripe.com`. Une bibliothèque de moins à maintenir et à auditer — garder
cette approche.

`server/agent-devis.js` — assistant de rédaction de devis. Modèle `claude-opus-5`,
un seul outil (`creer_devis`), plafond de 100 appels par jour, code d'accès d'équipe.
**Ce fichier envoie des données de clients réels à Anthropic** : nom, adresse, ville.
Toute modification touchant au contexte transmis a une portée juridique — voir
`sous-traitance.html`.

### Commandes

Il n'y a **pas de `package.json` à la racine** : tout se lance depuis `server/`.

```bash
cd server && npm start             # démarre le serveur (port 8080)
cd server && npm audit --omit=dev  # failles dans les dépendances de production
node --check server/index.js       # contrôle de syntaxe, depuis la racine
```

**134 suites dans `tests/`**, sans dépendance ni installation (recompté le 23 septembre 2026 —
ce nombre vieillit vite, le relire plutôt que le croire). La plupart extraient les fonctions
réelles d'`app.html` et les exécutent : elles testent donc le fichier livré.

Quatre familles visent `server/`, et elles ne se remplacent pas :

| | ce qu'elle monte | ce qu'elle peut voir |
|---|---|---|
| `test-716`, `test-722`, `test-723`, `test-725` | un MODULE, dépendances injectées | la logique d'une pièce |
| `test-641`, `test-724` | le VRAI serveur, isolé, parlé en HTTP | ce qu'une route répond |
| `test-726` | l'ASSEMBLAGE complet, coffre S3 compris | que les pièces du SERVEUR sont branchées |
| `test-735` | les fonctions RÉELLES d'`app.html` **plus** le vrai serveur | que l'APPAREIL et le SERVEUR se parlent |
| `test-740`, `test-741` | les fonctions RÉELLES d'`espace.html` et de `reinit.html`, plus le vrai serveur | que le PORTAIL et le SERVEUR se parlent |
| `test-744` | le VRAI `op-fs.js` contre le vrai serveur, deux appareils | que le filtre de lecture ne CACHE rien |

⛔ Les deux dernières lignes existent parce que les deux premières ne peuvent pas voir un défaut
de CÂBLAGE — et c'est là que naissent les pires. Le 19 septembre 2026, une seule expression
d'`index.js` en zone morte temporelle a éteint TOUTE la sauvegarde hors site : `test-725`
passait au vert pendant ce temps, parce qu'il monte le module lui-même. Voir l'en-tête de
`test-726`, qui porte les trois régressions de ce genre et ce qu'elles ont coûté.

⛔⛔ **ET LA COUTURE LA PLUS DANGEREUSE N'EST PAS DANS `server/` — ELLE EST ENTRE `app.html` ET
LUI.** Le 20 septembre 2026, la seconde écriture du socle a été branchée. Les deux moitiés
avaient chacune leurs bancs, chacune était JUSTE, et **elles ne se parlaient pas** — trois fois :

| ce que l'appareil faisait | ce que le serveur attend | ce qu'on voyait |
|---|---|---|
| `{lignes:[…]}` | `Array.isArray(b.enr)` | 400, boucle quittée, **inerte en silence** |
| `X-OP-Jeton: <jeton>` | `Authorization: Bearer <64 hexa>` | 401, jeton vidé, **muet une 2ᵉ fois** |
| lit `j.acceptes_ids` | rend `acceptes` (un NOMBRE) et `refus` | une branche qui ne tourne **jamais** |

Les 91 suites d'alors étaient TOUTES vertes : chacune monte une moitié. ⚠️ Et le deuxième est
pire qu'il n'en a l'air — `Access-Control-Allow-Headers` ne liste que `Content-Type`,
`Authorization`, `X-Teamop-Devis`, `X-Teamop-Kh` : un en-tête maison est refusé **par le
navigateur**, à la requête préalable, ce que `curl` ne peut pas voir. C'est écrit depuis des
mois au-dessus de cette ligne d'`index.js`, et ça n'a pas empêché de l'écrire.

**La règle, donc : dès qu'`app.html` appelle une route neuve, un banc doit faire parler la VRAIE
fonction de la page au VRAI serveur.** Relire les deux côtés ne suffit pas — ils se lisent très
bien séparément.

⛔⛔ **ET MÊME CE BANC-LÀ NE VOIT PAS TOUT : CERTAINS DÉFAUTS N'EXISTENT QU'APRÈS UN VRAI
`save()` DANS UNE VRAIE PAGE.** Le 20 septembre 2026, la lecture du socle (étape 5) a été
mesurée au navigateur : après avoir lu 2 907 lignes, **les 120 fiches simplement LUES portaient
toutes un `_m` NEUF**, et l'appareil annonçait qu'il repousserait 2 908 lignes. Un appareil qui
ne fait que LIRE s'attribuait la base entière et gagnait toutes les fusions contre ses
collègues. Les 94 contrôles de `test-735` étaient verts pendant ce temps : il compare des
signatures, il n'appelle pas `save()`.
La cause tient en une ligne : `save()` appelle `estampiller()`, qui date de MAINTENANT tout
enregistrement absent de l'ombre — et l'ombre datait d'avant la lecture. **Lire le socle est un
IMPORT**, donc `ombreRelever()` doit passer JUSTE APRÈS, avant le `save()`. C'est écrit plus bas
dans cette fiche depuis des semaines, par l'autre bout (« `_m:1` posé juste avant un `save()` ne
survit pas »), et ça n'a pas empêché de l'écrire à l'envers.
**Corollaire : toute fonction qui ÉCRIT dans `db` autrement que par un geste de l'utilisateur se
mesure au navigateur, sur la bêta, avec un vrai `save()` — pas au banc.**

Toutes sautent d'elles-mêmes si `server/node_modules` manque, et ⚠️ aucune ne vise
`api.teamop.fr` : tout se passe sur 127.0.0.1, coffre de sauvegarde compris.

⛔ **NE PAS LANCER LA BOUCLE À LA MAIN : `scripts/bancs-ci.sh` EST LE COMPTEUR, ET IL EST
UNIQUE.** La CI et le déploiement du VPS lancent CE fichier ; deux copies d'un compteur
divergent toujours, et c'est un compteur recopié qui a fait écrire « 2 598 » pour 2 989. Il
porte les deux pièges du comptage (bandeaux d'un autre format, banc qui meurt APRÈS son total)
et sort en 1 dès qu'une suite tombe.

```bash
bash scripts/bancs-ci.sh        # 134 suites · 5 961 vérifications (mesuré le 23/09/2026, v728)
node tests/test-726.js          # le câblage du SERVEUR : 143 vérifications, ~12 s
node tests/test-735.js          # le câblage APPAREIL ↔ SERVEUR : 210 vérifications, ~75 s
```

⛔ **COMPTER LES ✓ AVEC `grep` DONNE UN CHIFFRE FAUX, ET FAUX EN MOINS.** Sept suites (716 à
722) impriment leur total dans un bandeau `════ test-71x : N ✓ 0 ✗ ════` et leurs contrôles
dans un autre format : `grep -c '^  ✓'` les saute EN SILENCE. C'est ainsi que « 2 598 » a été
écrit ici le 19 septembre au matin — **391 contrôles et 7 suites entières manquants**, sans
que rien ne le signale. Compter suite par suite, en prenant le DERNIER `N ✓ M ✗` de chaque
sortie :

```bash
for f in tests/test-*.js; do node "$f" | grep -oE '[0-9]+ ✓ +[0-9]+ ✗' | tail -1; done
```

⛔ **ET LE BANDEAU NE SUFFIT PAS NON PLUS : REGARDER LE CODE DE SORTIE.** Un banc qui imprime
« 12 ✓ 0 ✗ » puis MEURT (une exception dans du code asynchrone, un fichier manquant après le
total) a l'air vert et ne l'est pas. La première version du compteur de la CI faisait
`sortie=$(node "$f" 2>&1) || true` : elle jetait le code de sortie. `scripts/bancs-ci.sh` le
regarde désormais et nomme le coupable.

⛔⛔ **COMMITER LE CORRECTIF AVANT DE MUTER — SINON `git checkout` EFFACE LES DEUX.** La façon
d'éprouver un banc est de remettre le défaut puis de restaurer par `git checkout <fichier>`.
Mais `git checkout` restaure depuis **HEAD** : s'il reste un correctif NON COMMITÉ dans ce
fichier, il part avec la mutation, sans un mot. **Pris deux fois le 19 septembre 2026**, et la
seconde a été la pire : le correctif de l'ancre a disparu AVANT le `git add`, donc le commit
n'a capturé que le banc — un commit qui annonce un correctif et ne contient que son test. Les
deux suites sont reparties au rouge une heure plus tard, sur du code que je croyais corrigé.

L'ordre est donc : **correctif → banc → `git commit` → mutation → `git checkout`.** Et après
chaque tour de mutations, relire ce que le commit contient VRAIMENT (`git show --stat`), pas ce
qu'on croit y avoir mis.

⚠️ **Repris une troisième fois le 20 septembre 2026, sur `server/sauvegarde.js`** : cinq édits d'une fonctionnalité neuve, pas encore commités, effacés par le `git checkout` de la PREMIÈRE mutation. Rien n'avertit — le banc repart simplement au rouge sur des contrôles qu'on vient d'écrire, ce qui ressemble à une mutation qui mord. Le signe qui ne trompe pas : **une mutation fait tomber des contrôles qui n'ont rien à voir avec elle.** Là, arrêter et regarder `git status` avant de chercher plus loin.

⛔ **Un banc qui passe ne prouve rien tant qu'on ne l'a pas vu ÉCHOUER.** `test-726` a été
éprouvé en REMETTANT les défauts qu'il garde, un par un — chiffres re-mesurés le 19 septembre
au soir, les précédents étaient faux :

| défaut remis | ce que `test-726` rend |
|---|---|
| zone morte temporelle sur `opSocle` | **9 ✓ · 9 ✗** (et les six autres suites serveur restent vertes) |
| motifs `--exclude` non ancrés | **15 ✓ · 3 ✗** — l'annuaire manque, l'exercice de sinistre tombe avec |
| base VIVANTE plus exclue de l'archive | **60 ✓ · 2 ✗** |
| empreinte de relecture plus contrôlée | **59 ✓ · 3 ✗** |
| archive recalée laissée au coffre | **61 ✓ · 1 ✗** |
| les deux routes de la Tour montées SANS garde | **60 ✓ · 2 ✗** |
| ⚠️ garde d'inertie d'`instantanerVers` retirée SEULE | **62 ✓ · 0 ✗** — rien. Le second
`existsSync` la couvre ; il faut retirer **les deux** pour obtenir 60 ✓ · 2 ✗ |

⚠️ La dernière ligne est la leçon de méthode : **une mutation qui ne casse rien ne prouve pas
que le banc est aveugle** — elle peut simplement être neutralisée par une autre garde. Vérifier
que la mutation change vraiment le COMPORTEMENT avant d'en conclure quoi que ce soit sur le
banc. Et l'inverse : ⛔ **`test-726` NE couvre PAS les budgets anti-abus** (zéro occurrence de
`quota`, `429`, `etatsParHeure`), alors que son en-tête cite la barre oblique finale de
`/api/op/etat` parmi ses raisons d'être. Ce budget-là n'est gardé que par des expressions
régulières sur le texte de `op-socle.js`, dans `test-724` — voir `REPRISE.md`.

⛔⛔ **UN MOTIF DE BANC DOIT VISER DU CODE, JAMAIS UNE PHRASE — pris TROIS fois le
19 septembre 2026 au soir, dans trois fichiers différents.** Ce dépôt est très commenté : le
nom d'une fonction, un chemin de route, un paramètre Stripe apparaissent presque toujours dans
le COMMENTAIRE qui explique le correctif, juste au-dessus du code. Trois conséquences réelles :

- `test-727` gardait le correctif Stripe par deux `grep` sur le texte du serveur — les deux
  motifs étaient dans le commentaire. On pouvait **supprimer les deux lignes de code** et le
  banc restait vert : il gardait une explication, pas un comportement.
- un banc qui cherchait `/api/stripe/checkout` dans la page est tombé sur le commentaire vingt
  lignes plus haut, et a évalué le mauvais corps.
- un recensement des appelants d'une fonction en a trouvé huit qui n'existent pas.

⛔⛔ **ET LE NETTOYAGE RECOMMANDÉ CI-DESSOUS AVALE DU VRAI CODE — MESURÉ LE 21 SEPTEMBRE 2026.**
Le motif naïf (tout bloc, de son ouverture jusqu'à la prochaine fermeture) fait disparaître
**107 069 caractères d'`app.html`**, dont la fonction `saveVehicule` **entière**. La cause : une
ouverture de bloc non appariée (une règle CSS commentée en fin de ligne, une adresse) s'apparie
avec une fermeture très loin et emporte tout ce qui est entre les deux. Un banc bâti dessus
accuse alors le code de ne pas porter une garde **qu'il porte** — et, symétriquement, il ne voit
pas les fonctions cachées dans la zone avalée (deux générateurs de démonstration ont surgi le jour
où le nettoyage a été corrigé). **Ne retirer que les blocs qui COMMENCENT une ligne** :
`SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm,' ')` — ce sont les seuls que ce dépôt utilise pour
expliquer du code.
⚠️ Mesuré fichier par fichier : seuls `app.html` et `beta.html` sont touchés. `espace.html`,
`surveillance.js` et les fichiers de `server/` ne perdent rien — les bancs qui les lisent
(`test-726`, `test-740`, `test-746`) restent donc justes.

La parade tient en deux gestes : **enlever les commentaires avant de chercher**
(`SRC.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/^[ \t]*\/\/.*$/gm,' ')`), et **ancrer sur la
forme du CODE** (`fetch('https://…'`) plutôt que sur la chaîne toute seule. Et la contre-épreuve
qui les attrape tous : **muter le code et vérifier que le banc tombe** — un motif qui vise un
commentaire ne bouge jamais.

⛔⛔ **UNE MUTATION QUI NE CASSE RIEN PEUT PROUVER QUE LE BANC NE REGARDE PAS AU BON ENDROIT.**
La règle existait déjà plus haut, dans un sens : une mutation neutralisée par une autre garde ne
dit rien. Le 20 septembre 2026 en a donné l'autre sens, plus coûteux. Remettre `Math.random()`
dans `opIdDerive` — l'identifiant dérivé de `mailSent` et `planJournal` — ne faisait tomber
**AUCUN** des 28 contrôles de `test-732`. Et le défaut était bien réel : à la synchro suivante,
chaque ligne aurait été recréée en double, pour toujours.
La raison : le banc n'exécutait qu'UN passage (décomposer, recomposer), et un identifiant
aléatoire y reste cohérent avec lui-même. **Quand une mutation ne casse rien, la question n'est
pas « le code est-il bon ? » mais « qu'est-ce que le banc ne joue pas ? »** Ici : le DEUXIÈME
passage. Le contrôle manquant est devenu « décomposer deux fois la même base donne les mêmes
identifiants » — et la mutation tombe.

⛔ **UN JETON DE RECHERCHE COURT TOMBE AU HASARD DANS UNE EMPREINTE.** `test-723` cherchait
« a1 » (l'identifiant d'un enregistrement) dans un texte qui porte un SHA-256 hexadécimal.
Mesuré : **21,8 % des empreintes contiennent « a1 »** — le banc accusait donc le serveur de
fuiter une donnée de client environ une fois sur cinq, au hasard. Un banc qui crie faux se fait
ignorer, puis désactiver : c'est comme ça qu'on perd un garde-fou. Tout jeton cherché dans une
sortie qui peut contenir une empreinte doit porter des lettres **hors de `[0-9a-f]`**.

⛔ **UNE APOSTROPHE DANS LE MOT DE `${var:?mot}` CASSE LE PARSE DU SCRIPT ENTIER.** Bash
re-interprète les quotes à l'intérieur du mot, **même entre guillemets doubles** :
`"${1:?le SHA n'a pas été transmis}"` ouvre une simple quote qui ne se referme jamais, et le
fichier ne se parse plus du tout (`unexpected EOF while looking for matching '"'`, code 2,
aucune commande exécutée). ⚠️ Le message d'erreur ne nomme ni la variable ni la ligne fautive :
il pointe la fin du fichier. `tests/test-728.js` refuse désormais toute quote dans le mot d'un
`${var:?…}` des workflows, et passe à `bash -n` le corps de chaque heredoc destiné à un shell.

Quand une suite ne peut pas exécuter (un ordre d'opérations, un balisage, une fonction qui touche
le DOM), elle lit le texte du fichier réel — et la preuve fonctionnelle vit alors dans une sonde
navigateur du scratchpad, citée en commentaire. **Ne jamais reconstruire un ordre de déclaration
pour faire passer un test** : c'est ce qui avait masqué une zone morte temporelle le 10 septembre
au matin, rendant tout le rangement de catégories silencieusement inopérant.

Lire `tests/LISEZMOI.md` avant d'écrire dans `db.produits` : il porte l'invariant sur les
identifiants de fiches, et `test-634.js` le fait respecter mécaniquement.

L'autre suite — 17 tests `node --test` avec `supertest`, côté serveur — vit sur
`audit/plan-action` ; voir la dernière section.

### Essayer le serveur en local

La configuration vit sur le VPS, pas dans le dépôt. Trois variables permettent de
lancer le serveur isolément, sans toucher à la production :

```bash
TEAMOP_CONFIG=/chemin/config.json TEAMOP_DATA=/chemin/data PORT=8099 node server/index.js
```

Le fichier de configuration doit contenir au minimum `vapidPublicKey` et
`vapidPrivateKey` (générables avec `web-push`), sinon le démarrage échoue.

## Déploiement

### Accès

```bash
ssh root@api.teamop.fr    # Ubuntu 24.04, Node v22.23.1
```

`server/install.sh` s'exécute **sur le VPS** : clone dans `/opt/teamop/repo`,
configuration dans `/opt/teamop/config.json` (chmod 600), données dans
`/opt/teamop/data`, service systemd `teamop-api`.

```bash
systemctl status teamop-api          # état
journalctl -u teamop-api -f          # journaux en direct
journalctl -u teamop-api | grep '^devis '   # appels d'outil de l'assistant devis
```

## Conventions

- **Français partout** : code, commentaires, messages de commit, interface.
- Les commentaires expliquent *pourquoi*, pas *quoi*. Ce dépôt en compte de bons —
  s'en inspirer plutôt que de les diluer.
- Fait main plutôt qu'une dépendance de plus, quand c'est raisonnable : le serveur
  est exposé sur Internet, chaque dépendance est une surface d'attaque.

## À ne pas faire

- Ne jamais committer `config.json`, `.env`, ni le contenu de `.claude-flow/`
- Ne pas toucher à `/opt/teamop/config.json` depuis le dépôt : il vit sur le VPS
- ⛔ **Une valeur du CORPS d'une requête ne décide jamais de ce qu'une entreprise a payé.**
  Un code promo s'active en trois contrôles, et les trois sont obligatoires : le code doit
  exister dans `config.promos`, l'échéance se **calcule** depuis `p.mois`, `maxUtilisations`
  se vérifie avant de compter — plus « un seul code à la fois par espace ». Trois chemins les
  font (`espacePaye()`, `/api/monitor/espaces/promo`, le relais de `/api/clients/sync`) ; le
  troisième ne les faisait pas, et lisait `promoFin` dans le corps : tout client du portail
  s'offrait l'abonnement à vie avec `{promoCode:'PEU-IMPORTE', promoFin:'9999-12-31'}`, parce
  qu'`espacePaye()` relit `promoUsages` sans rien revérifier. Un quatrième chemin un jour fera
  les trois contrôles ou n'existera pas. `tests/test-641.js` le relit.
- ⛔ **Un code promo ne s'active QUE contre la preuve de la clé d'équipe, et le compteur ne
  bouge QUE si un espace est servi.** `/api/promo/valider` n'exigeait aucune identité :
  `{code, teamId}` offrait l'abonnement de n'importe quelle entreprise, et `u.n++` placé
  au-dessus de `if (team)` laissait épuiser un code à `maxUtilisations:2` en deux requêtes
  sans `teamId` — déni de service définitif sur une campagne. L'aperçu (`apercu:true`) reste
  public **par nécessité** : `espace.html` et `recap-abonnement.html` valident un code avant
  qu'un espace existe, il n'y a alors aucune clé à prouver ; il n'écrit rien, donc il ne donne
  rien. Ne pas le fermer « pour faire propre », ça casserait la page d'abonnement.
- ⛔ **`espaces.json` ne s'écrit QUE par `espacesEcrire()`** (temporaire puis renommage).
  Tronqué, il sort TOUTES les entreprises de l'annuaire d'un coup — et depuis que la règle
  Firestore est publiée, ça ne casse plus seulement la Tour : plus de verdict de clé, plus de
  jeton, donc plus de synchro du tout, pour tout le monde. `tests/test-641.js` compte les
  écritures directes et exige zéro.
- ⛔ **Un refus ne se montre PAS tout seul : il faut que l'écran sache le dire.** La preuve
  par l'exemple, 11 septembre 2026 : le refus de `/api/replies` était rendu en `text/plain`
  exprès pour faire jeter `r.json()` et afficher « Réception indisponible » — **mesuré au
  navigateur, il affichait « Connecte ta boîte mail » et son bouton**, parce que
  `loadMailboxes()` posait `_mailboxes=[]` sur échec et réécrivait la liste par-dessus. On
  réclamait son mot de passe d'application Gmail à quelqu'un dont la boîte marchait très
  bien. `_mailboxes` et `_mailReplies` ont donc TROIS états — une liste, une liste vide, et
  `null` « on n'a pas pu savoir » — et les trois points d'appel testent `!r.ok` autant que le
  `catch`. Ne jamais reconfondre les deux derniers : on ne propose de connecter une boîte que
  quand on SAIT qu'il n'y en a aucune. Corollaire général : avant de faire refuser une route,
  aller REGARDER au navigateur ce que l'écran affiche — pas ce qu'on croit qu'il affiche.
- ⛔ **Le refus de `/api/replies` n'est PAS du JSON.** `loadMailReplies()` (`app.html`) fait
  `const d = await r.json(); _mailReplies = d.replies||[]` : un refus en JSON se parse sans
  erreur, la liste devient **vide** au lieu de **nulle**, et l'écran affiche « 📭 Aucun
  message » — le client ne voit pas une panne, il voit sa correspondance disparue. En
  `text/plain`, `r.json()` jette, le `catch` met `null`, l'écran dit « Réception
  indisponible ». Avec `/api/mailboxes`, ces deux routes exigent la preuve de clé
  (`cleEquipeExige`, monté APRÈS `cleEquipeObserve` qui pose `req.cleEquipe`) : seul le verdict
  `valide` passe, et `ESPACES_INTOUCHABLES` comme `cleEstPublique(t)` sont refusés — une clé
  écrite en clair dans `app.html` ne prouve rien quand on la présente. ✅ **Fermée en
  production le 11 septembre 2026 à 8 h 17**, après les quatre marches, dans cet ordre — les
  appareils d'abord, la porte ensuite : v641 publiée, v641 exigée (`teamop_config/version.min`
  = 641 dans Firestore, pas seulement côté API), aucune entreprise vivante hors annuaire,
  aucune sur la clé partagée. **Le défaut du code est désormais FERMÉ** : il faut
  `"mailPreuveExigee": false` pour ROUVRIR, et `install.sh` pose le réglage sur une
  configuration neuve — une réinstallation ne peut plus rouvrir la porte en silence.
  ⛔ **Si l'une des quatre conditions redevient fausse** (une entreprise remise sur le repli,
  un parc bloqué en version ancienne), **rouvrir** le temps de la traiter plutôt que laisser
  des clients sans leur Réception. Le compteur `mailRefus` de `/health` le voit venir : un
  motif autre qu'`absent` qui monte, ce sont de vrais appareils qui tombent. Il reste agrégé —
  `/health` est publique, y nommer un espace dirait au monde quelles entreprises existent.
  ⛔ **CETTE PHRASE A ÉTÉ FAUSSE DU 11 AU 21 SEPTEMBRE 2026, ET C'EST LA LEÇON QUI COMPTE.**
  Mesuré le 21 : `mailRefus` n'apparaissait **pas une seule fois** dans
  `.github/scripts/surveillance.js`, le SEUL fichier qui décide de crier. Le compteur était
  publié, commenté, expliqué ici — et lu par personne. C'est exactement ce que cette page
  écrit vingt lignes plus bas à propos d'`atts` : *un champ de `/health` que personne ne lit
  est du code mort qui a l'air d'une garde*. L'alarme existe depuis, et elle distingue le
  bénin (`absent` = une version ancienne, `technique` = la bêta, `partagee` = un chantier
  connu) de ce qui ne l'est pas (`invalide`, `inconnu`). ⚠️ Elle crie sur la **récence**, pas
  sur le total : ce compteur ne repart à zéro qu'au redémarrage, donc un seul refus en juillet
  ferait crier toutes les heures jusqu'au prochain déploiement.
  ⛔ **La morale, plus large que ce cas : une garde décrite dans ce fichier n'est pas une
  garde. Aller lire le code qui crie.**
- ⛔ **UN CODE PROMO NE S'ÉCRIT DANS AUCUN FICHIER SERVI, PAS MÊME COMME EXEMPLE.** Le
  19 septembre 2026, `TEAMOP3MOIS` était dans le placeholder d'un champ de `tour.html`. La Tour
  demande un mot de passe, mais **son authentification est côté JavaScript** : elle n'empêche
  pas de télécharger la page. Mesuré : `curl -s https://teamop.fr/tour.html` rend 633 Ko à un
  anonyme, sans en-tête ni cookie — et l'aperçu public de `/api/promo/valider` (qui n'écrit
  rien) confirmait le code VIVANT, premium, 3 mois. Le même code avait déjà été retiré
  d'`espace.html` pour cette raison exacte : il avait simplement **changé de fichier**.
  `scripts/verif-secrets.sh` le refuse désormais dans tout fichier suivi ; les exemples FICTIFS
  y sont nommés un par un, parce que le script ne peut pas connaître `config.promos`, qui vit
  sur le VPS. En ajouter un doit être un geste conscient, et se vérifie en une commande (un
  aperçu qui rend 404). ⚠️ Et un correctif ne range pas derrière lui : **un code qui a circulé
  se renouvelle ou se plafonne**, dans `config.promos`, sur le VPS.
- ⛔ **`install.sh` NE DÉCIDE PLUS DE LA CLÉ MAÎTRE — `server/poser-cle.js` le fait.** Le bloc
  d'origine testait `[ -s /etc/teamop/kek ]`, c'est-à-dire la présence du FICHIER, jamais celle
  des BASES, alors que son propre commentaire promettait « ON NE LA RÉGÉNÈRE JAMAIS SI ELLE
  EXISTE ». Or la clé vit hors de `/opt` EXPRÈS : un volume restauré, un VPS rebâti depuis une
  sauvegarde d'`/opt`, un `/etc` écrasé — et les bases chiffrées reviennent SANS la clé.
  Relancer `install.sh` (c'est le mode d'emploi du dépôt) posait une clé neuve et l'affichait
  comme une installation vierge : toutes les bases définitivement indéchiffrables.
  **Un commentaire n'est pas une garde.** Le refus existait déjà, à un seul endroit, et il
  compte l'ANNUAIRE autant que les bases. Corollaire : l'unité systemd ne porte plus
  `LoadCredential` — c'est `poser-cle.js` qui pose le drop-in, APRÈS l'écriture de la clé et
  jamais sur un chemin d'erreur, parce que ⚠️ **systemd refuse de démarrer une unité dont une
  source de `LoadCredential` manque**. `tests/test-729.js` l'exécute dans un bac à sable complet.
- ⛔ **UN CHAMP DE `/health` QUE PERSONNE NE LIT EST DU CODE MORT QUI A L'AIR D'UNE GARDE.**
  `atts` était écrit `true` EN DUR : l'alarme « pièces jointes désactivées » de
  `.github/scripts/surveillance.js` ne pouvait donc JAMAIS se déclencher. Trois champs ajoutés
  le 19 septembre au soir (`sauvegarde.configuree`, `elagageEchecs`, `socle.ancreJours`) étaient
  dans le même cas : justes, commentés, lus par personne. `tests/test-726.js` part du `/health`
  VIVANT et exige que **chaque champ soit ou bien surveillé, ou bien NOMMÉ comme « vu et pas
  surveillé »** — en ajouter un oblige à trancher, une fois, par écrit.
  ⛔ **ET CE CONTRÔLE-LÀ NE LE FAISAIT PAS VRAIMENT, JUSQU'AU 21 SEPTEMBRE 2026.** Il comparait
  le **nom de feuille** (`actif`, `n`, `ok`…) cherché **n'importe où** dans `surveillance.js`,
  commentaires compris. Trois trous, tous mesurés par mutation :
  · un nom d'**une lettre** passe toujours — `\bn\b` se trouve dans n'importe quel fichier
    JavaScript, et c'est ainsi que `mailRefus.n` était « surveillé » sans l'être ;
  · un **sous-arbre entier** passe si ses feuilles portent un nom déjà listé — le champ
    `portail` ajouté le même jour est passé sans encombre sur l'`actif` du socle ;
  · un motif qui tombe dans un **commentaire** garde une phrase, pas un comportement — la
    règle de cette page, que ce banc ne s'appliquait pas à lui-même.
  Il compare désormais le **chemin complet**, sur un fichier dont les commentaires sont
  **retirés**, et exige la **forme de lecture** (`j.<chemin>`). Les tables à clés dynamiques
  (`parMotif`, `refus`, `latence`…) s'arrêtent au conteneur : y descendre ferait apparaître un
  faux orphelin le jour où un refus se produit. Et la liste blanche elle-même est contrôlée —
  une entrée qui parle d'un champ disparu est une décision prise pour du vide.
- ⛔ **Fermer une entreprise doit COUPER ses sessions Firebase, et le DIRE.** Refuser les
  nouveaux jetons ne suffit pas : un jeton s'échange contre une session **renouvelable
  indéfiniment**, rangée sur l'appareil — après un seul échange réussi, l'appareil ne repasse
  plus jamais par le serveur. Jusqu'au 11 septembre 2026, fermer une entreprise depuis la Tour
  ne coupait donc PAS son Firestore sur les appareils déjà pourvus : ils lisaient et écrivaient
  pour toujours pendant que la Tour affichait « fermée ». `fbRevoquerEquipe(t)` pose
  `validSince` par `accounts:update`. **Les TROIS portes l'appellent** (fermer un client,
  supprimer une entreprise, et « repartir à neuf » — cette dernière n'ajoute pas à `entFermes`
  mais efface le document de l'ancien espace, et sans coupure il renaissait hors annuaire,
  orphelin) : une seule oubliée et la coupure devient une loterie ; rouvrir, lui, ne coupe rien.
  ⛔ **ELLES ÉTAIENT QUATRE JUSQU'AU 20 SEPTEMBRE 2026, ET LA QUATRIÈME A ÉTÉ RETIRÉE EXPRÈS.**
  `/api/monitor/espaces/suspendre` coupait Firebase **et** fermait le socle. Justin a tranché ce
  jour-là qu'une suspension pour impayé n'est pas une coupure : « pour continuer à lire, ils
  auront un délai de 7 jours. Si c'est pas payé après, tous les onglets deviennent gris. Aucune
  sauvegarde n'est perdue, aucune tâche qu'ils étaient en train de faire, rien n'est perdu, même
  dans leur catégorie. Juste les catégories payantes deviennent grisées et ils reviennent au
  forfait gratuit. Avec tous les jours un rappel sur le compte admin. Après, c'est pas aux
  utilisateurs de savoir si l'entreprise paye ou pas. Que le compte admin. » Une suspension est
  donc un **état de facturation**, pas une coupure d'accès — et le jour où le socle est la seule
  copie à jour, la confondre avec une fermeture couperait un impayé de ses propres données, en
  contradiction directe avec `mentions-legales.html:74`. ⚠️ `tests/test-641.js` compte désormais
  TROIS : si ce chiffre repasse à quatre, la question n'est pas « qui a cassé le compte » mais
  « est-ce qu'on vient de recouper les impayés ? ». ⚠️ Et la contrainte qui REMPLACE la coupure
  — onglets payants grisés au bout de sept jours, retour au forfait gratuit, rappel quotidien
  réservé au compte admin — **n'est pas encore écrite** : voir `REPRISE.md`. Sur la fermeture d'un client, on coupe **avant** d'effacer — mais la fenêtre est
  **raccourcie, pas fermée**, et l'écrire autrement ferait croire le contraire : `validSince`
  n'invalide que le rafraîchissement, donc un appareil qui tient un jeton encore valable peut
  RECRÉER le document après l'effacement. ⚠️ **Rien n'est instantané — jusqu'à UNE HEURE** :
  une règle Firestore n'évalue que la signature, l'émetteur et l'échéance du jeton, elle ne
  consulte JAMAIS l'état du compte (ni désactivé, ni supprimé, ni `validSince`).
  ⚠️ **Et tout cela ne vaut que parce que la règle a été publiée le 11 septembre** : l'appareil
  révoqué retombe en anonyme, et c'est la règle qui ne lui donne rien. Avant, l'anonyme avait
  tout — la coupure aurait été purement cosmétique. Et sans clé d'administration, la
  fonction rend `false` — **l'appelant DOIT le remonter**, croire une entreprise coupée alors
  qu'elle ne l'est pas est la panne silencieuse type. `fbUidEquipe(t)` n'a **qu'une seule
  définition**, partagée par la signature et la coupure : deux copies calculeraient un jour
  deux identifiants différents, et la coupure viserait un compte qui n'existe pas sans rien
  dire. `tests/test-640.js` extrait cette fonction du fichier réel pour éprouver la vraie
  dérivation, `tests/test-641.js` joue les quatre réponses de la coupure.
- ⛔⛔ **UN ADAPTATEUR QUI REMPLACE UNE API QUI *POUSSE* DOIT POUSSER SES PROPRES ÉCRITURES.**
  Firestore notifiait `onSnapshot` au moment de l'écriture ; notre portail INTERROGE toutes les
  15 à 20 secondes. Mesuré au navigateur le 21 septembre 2026, page réelle, interrupteur ouvert :
  après une inscription le nom de l'entreprise paraissait **18,1 s** plus tard, et le message
  qu'on venait d'envoyer **12,6 s** plus tard. Rien n'était « cassé » — et c'est bien le piège :
  `test-740` fait parler la VRAIE page au VRAI serveur et restait vert, parce que ce qui manquait
  n'était ni un champ ni un code HTTP, **c'était le TEMPS**. ⚠️ Et ce n'est pas cosmétique :
  quelqu'un qui envoie un message et ne le voit pas paraître **le renvoie**. Toute écriture qui
  réussit prévient donc les écouteurs vivants, tout de suite (`tests/test-746.js`). Corollaire à
  appliquer AVANT d'écrire le prochain adaptateur : lister ce que l'API d'origine poussait, et le
  rendre — sinon chaque geste a l'air de ne pas être parti. Même piège pour les minuteries :
  une poignée de `setTimeout` PARTAGÉE entre abonnements fait qu'arrêter l'un coupe l'autre.
- ⛔⛔ **UN REFUS NE SURVIT PAS À LA RÉUSSITE QUI LE DÉMENT.** `_err()` d'`espace.html` ne faisait
  que POSER, jamais effacer : le verdict d'un essai raté restait à l'écran pendant l'essai
  suivant — y compris pendant un changement de mot de passe qui AVAIT réussi (deux routes à 200,
  nouveau mot de passe fonctionnel, ancien refusé en 401). C'est le pendant exact de la règle
  `_mailboxes` ci-dessus : un refus doit savoir se dire, **et une réussite doit savoir effacer le
  refus d'avant**. Chaque essai écrit SON verdict. Les quatre portes de la cérémonie à deux temps
  (`pwSend`, `pwConfirm`, `emSend`, `emConfirm`) appellent `_vider()` avant de travailler.
- ⛔⛔ **UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN — COMPTER LA POPULATION AVANT
  DE CROIRE UN ZÉRO.** Le 21 septembre 2026, une sonde mesurait « trois `save()` sans changement
  ne posent aucun `_m` » et rendait fièrement « 0 avant, 0 après ». La base ne portait que SIX
  enregistrements : le contrôle était creux, et son ✓ ne valait rien. C'est la jumelle de la règle
  « une mutation qui ne casse rien » — là on demande ce que le banc ne JOUE pas, ici ce qu'il ne
  REGARDE pas. Tout contrôle qui compte des absences doit d'abord prouver qu'il y avait de quoi
  compter.
- ⛔⛔ **UNE SONDE NE DÉTRUIT PAS CE QUE L'APPLICATION S'ATTEND À TROUVER.** Retirer `.overlay`
  du document pour dégager la vue faisait jeter `closeModal()` — que `go()` appelle à CHAQUE
  changement de rubrique — sur `document.getElementById('overlay').classList`. Résultat mesuré
  le 21 septembre 2026 : **840 « erreurs JavaScript » sur 840 ouvertures**, c'est-à-dire un
  rapport entièrement faux, produit par la sonde elle-même. On ferme par la fonction de
  l'application (`closeModal()`) et on MASQUE le reste (`display:none`), on ne supprime pas.
  ⚠️ **Et le test d'isolement n'avait rien vu** : il comptait les exceptions NON RATTRAPÉES, or
  le throw était avalé par le `try{ go() }catch{}` du test lui-même — il répondait « 0 exception »
  pour les sept sélecteurs, en toute bonne foi. Quand une mesure compte des absences, elle doit
  d'abord prouver qu'elle regarde au bon endroit.
  ⚠️ À noter au passage, côté code : `closeModal()` déréférence `$('overlay')` sans garde. Rien
  ne retire cet élément aujourd'hui, mais tout ce qui le ferait figerait toute la navigation.
- ⛔⛔ **ET LA BARRE DE DÉFILEMENT VERTICALE EN CRÉE UN AUTRE, PLUS TENACE — LES « 15 PX DE
  PLANNING GÉNÉRAL » N'ONT JAMAIS EXISTÉ.** Ce défaut a traversé trois détecteurs et deux jours
  de `REPRISE.md` comme « le seul défaut réel qui reste ». Mesuré le 22 septembre 2026,
  quarante passages, barre de défilement présente sur 20/20 :

  | | la page se pousse | un élément dépasse vraiment |
  |---|---|---|
  | sans attente | **3/20**, de 15 px | **0/20** |
  | avec deux trames + une lecture forcée (`void offsetWidth`) | **0/20** | **0/20** |

  Quand la barre verticale apparaît, `clientWidth` perd ses 15 px **tout de suite** et
  `documentElement.scrollWidth` les garde **une trame de plus**. Lire les deux dans le même
  instant donne un écart qui n'est pas dans la page. ⚠️ Et le premier essai de contre-épreuve
  a rendu « 0/20 » sur une fenêtre de 900 px de haut — **où la barre n'apparaissait jamais** :
  un zéro sur une population vide, la règle de cette page appliquée à elle-même.
  **Toute mesure de largeur se fait après deux `requestAnimationFrame` ET une lecture forcée**,
  et elle prouve d'abord que la barre était là. Corollaire : on n'a rien corrigé, et c'est le
  bon résultat — un faux défaut coûte deux fois, le correctif puis la garde inutile.
- ⛔⛔ **ET DEUX `requestAnimationFrame` NE SUFFISENT PAS : UN DÉBORDEMENT SE CONFIRME À LA
  SECONDE LECTURE, PLUSIEURS CENTAINES DE MILLISECONDES PLUS TARD.** C'est la troisième
  variante du même piège, et la plus coûteuse. Mesuré le 22 septembre 2026 sur les écrans de
  bureau : après la fin de `.content.entre`, deux trames ET une lecture forcée, huit écrans sur
  huit annonçaient « 15 px de défilement latéral RÉEL » — et **sept d'entre eux rendaient 0 px
  700 ms plus tard**. Quelque chose se range après coup (queue d'animation, carte, graphique),
  et la barre verticale qui apparaît alors reprend ses 15 px à `clientWidth`. Un audit qui
  compte la PREMIÈRE lecture rendait **100 faux constats sur 346**.
  ⚠️ Le signe qui ne trompe pas : **le même chiffre, exactement la largeur d'une barre de
  défilement, sur presque tous les écrans**. La parade est de mesurer DEUX FOIS et de ne garder
  que ce qui persiste — et de NOMMER ce qu'on écarte, sinon le prochain audit le retrouvera et
  le croira.
- ⛔⛔ **ET UNE ROTATION FABRIQUE LE MÊME FAUX DÉBORDEMENT, PAR UN AUTRE CHEMIN.**
  `getBoundingClientRect()` rend la boîte **visuelle**, transformations comprises. Mesuré sur la
  Tour le 22 septembre 2026 : huit écrans « débordaient de 3 px » sur un chevron qui porte
  `transform:rotate(90deg)` — sa boîte de 6 px de large et 44 px de HAUT, tournée, dépasse de
  19 px de chaque côté. Contre-épreuve qui tranche : `scrollWidth` 433 contre `clientWidth` 430,
  et pourtant **pousser la page à droite rend 0 px de défilement réel**. Rien n'est peint là,
  rien n'est coupé. **Un détecteur de débordement doit finir par demander à la PAGE si elle
  bouge** (`window.scrollTo(9999,y)` puis relire `scrollX`), jamais s'arrêter au rectangle d'un
  élément — sinon il accuse un ornement et on « corrige » ce qui va bien.
- ⚠️ **UN APERÇU PLUS VIEUX QUE LA PAGE QU'IL DOUBLE EST PIRE QUE PAS D'APERÇU.**
  `apercu/tour.html` datait du 19 septembre quand la production datait du 20, et `REPRISE.md`
  annonçait la refonte « en aperçu » alors que l'aperçu était DERRIÈRE. Qui l'aurait testé
  aurait jugé une version en retard d'une journée, et signalé des défauts déjà corrigés.
  **Régénérer (`bash scripts/apercu.sh <page>`) avant de mesurer, toujours** — et se rappeler
  que le dossier `apercu/` ne se met pas à jour tout seul quand la page source bouge.
- ⛔ **UN DÉBORDEMENT MESURÉ PENDANT L'ANIMATION D'ENTRÉE N'EN EST PAS UN.** Les cartes entrent
  en glissant (`.content.entre`) : la page a alors une barre de défilement horizontale
  PASSAGÈRE. Mesuré à 520 ms, ça donnait « déborde de 15 px » sur une trentaine de rubriques
  des deux profils Mac en verre ; une fois l'animation finie, `window.scrollX` vaut 0 et
  **aucun élément ne dépasse**. Attendre la disparition de `.content.entre` avant de mesurer —
  et toujours NOMMER l'élément coupable, sinon on ne sait pas si le débordement est réel.
- ⛔⛔ **L'ÉCRAN « CONNEXION REQUISE » COUVRE TOUT, ET IL APPARAÎT EN COURS DE MESURE.** Le
  conteneur d'une session distante n'a pas de réseau sortant : au premier contrôle de santé
  raté, `horsLigneDebut()` pose `#hl-ecran` — un panneau `position:fixed`, plein écran,
  OPAQUE, en z-index 99997. Tout ce qui est lu ou capturé APRÈS ce moment montre l'écran hors
  ligne, pas l'application. Mesuré le 21 septembre 2026 : une matrice sur les dix profils
  d'appareil rendait « 0 teinte sur 9 en mode jour » **sur les dix**, parce que la passe de
  nuit passait avant la coupure et celle de jour après. Le symptôme est traître : ce n'est pas
  une erreur, c'est une mesure qui réussit — sur le mauvais élément.
  **Toute sonde qui dure plus de quelques dizaines de secondes doit neutraliser le mécanisme**
  (`window.horsLigneDebut=function(){}; _horsLigne=false;` plus le retrait de `#hl-ecran`), et
  ⚠️ **ne surtout pas « corriger » l'application** : côté client ce comportement est juste,
  c'est la sonde qui est dans un bocal sans réseau.
- ⛔⛔ **UNE FONCTION QUI SORT PAR LA PORTE DU HAUT SE CHRONOMÈTRE À 0 ms — PROUVER QU'ELLE
  ENTRE AVANT DE LA MESURER.** `estampiller()` commence par `if(!syncEnabled()) return`, et un
  navigateur piloté dans un bocal sans réseau n'a pas de synchro : la sonde du 22 septembre 2026
  a rendu **0 ms sur les trois tailles de base** et l'aurait rapporté comme « ça ne coûte rien ».
  Chez un client, c'est la moitié du coût d'un `save()` (19,2 ms sur 37 ms, téléphone de
  terrain). Le signe est celui que cette page décrit déjà pour le contraste et pour
  `BETA_ESSAI` : **le même chiffre extrême partout**. Toute sonde de performance doit prouver
  que le corps s'exécute — un effet observable, pas le chronomètre — avant de publier un temps.
- ⛔ **UNE MESURE QUI ÉCHOUE DOIT DIRE POURQUOI.** La même sonde rendait « aucune cible prouvée
  devant » sans rien d'autre : trois hypothèses fausses ont été essayées avant de lui faire
  rendre la PILE d'éléments sous le point, qui a nommé le coupable en une exécution. Un
  `elementsFromPoint` avec la classe, l'id, le fond, l'opacité et le rectangle de chaque
  élément coûte dix lignes et remplace une heure de tâtonnement.
- ⛔ **DIX NAVIGATEURS EN PARALLÈLE FAUSSENT LES MESURES DE TEMPS.** Sous contention, une
  transition de 520 ms dépasse largement l'attente qu'on lui a réservée, et la sonde lit la
  surcouche au lieu de la page. Deux files de cinq passent ; dix d'un coup ne passent pas.
  Et le compteur d'attente ne doit pas guetter `pgrep` : des processus fantômes survivent aux
  sondes et le guetteur n'est jamais satisfait.
- ⛔ **`document.getAnimations()` NE SE VIDE JAMAIS DANS CETTE APPLICATION** : le halo du fond
  (`vrOrbes`) tourne en boucle infinie. Attendre « plus aucune animation » est une attente qui
  ne finit pas — et filtrer sur une DURÉE infinie ne suffit pas, c'est le nombre d'ITÉRATIONS
  qui est infini.
- ⛔ **UNE SONDE QUI FORCE UN ÉTAT QUE L'APPLICATION NE PRODUIT JAMAIS FABRIQUE DE FAUX DÉFAUTS.**
  Appeler `go('dashboard')` sur la bêta sans être connecté faisait jeter deux vues sur
  `currentUser.role`. La contre-mesure — **laisser la page à elle-même** — a rendu 0 erreur, et
  l'ancre d'adresse ne contourne pas l'écran de connexion : il n'y avait pas de défaut. Avant
  d'annoncer une trouvaille faite au pilotage, **produire la contre-mesure sans pilotage**.
  Un faux défaut coûte deux fois : le temps de le « corriger », puis celui de la garde inutile.
- ⛔⛔ **UNE BARRE POSÉE DEPUIS `go()` EST BALAYÉE — ACCROCHER LÀ OÙ L'ÉCRAN S'ÉCRIT VRAIMENT.**
  Le multitâche pose une barre « Reprendre » en haut de l'écran. Posée depuis `go()` sur une
  minuterie de 60 ms, elle n'apparaissait **jamais** : `rendreVueAnimee` écrit `#content`
  APRÈS et l'efface. Mesurée absente à **100, 300, 600, 1 200 et 2 500 ms**. Elle vit
  désormais dans `rendreVueSure`, la seule fonction qui écrit la vue — y compris sur un
  rafraîchissement automatique, ce qui est voulu : sinon la barre disparaîtrait toute seule au
  bout de quelques secondes. ⚠️ Et `renderNav()` **n'est pas appelé par `go()`** : une pastille
  de menu qui dépend de l'état ne se rafraîchit donc pas toute seule — on repeint la pastille
  (`multiPastilles`), jamais les quarante-deux lignes du menu.
- ⛔⛔ **UN TÉMOIN QUI CONSOMME LA RESSOURCE QUE L'ESSAI SUIVANT RÉCLAME FABRIQUE UN FAUX
  VERROU.** Le 21 septembre 2026, la matrice des droits annonçait « appliqué » pour la création
  d'un technicien. C'était faux : ce qui refusait, c'était la **limite de places du forfait**,
  que le témoin venait lui-même de consommer (+1). Le droit, lui, n'était pas consulté du tout.
  C'est la jumelle de « une assertion sur un ensemble vide » : là on ne comptait rien, ici on
  comptait le mauvais refus. **Quand une mesure refuse, demander CE QUI refuse** — le message
  affiché le dit souvent, et il faut le lire plutôt que compter un delta à zéro.
- ⛔ **LES BONS DE COMMANDE ONT LEUR PROPRE DROIT, PAS CELUI DE LEUR CATÉGORIE.** Tout le
  circuit passe par `peutCommander()` — c'est-à-dire `!userCap(u,'bonsLectureSeule')` —, avec
  **15 sites d'appel** (`formBon`, `bonFourNew`, `bonSuggere`, `bonDupliquer`, les envois…).
  Mesuré : en « consultation seule », le formulaire refuse de s'ouvrir et le dit. Chercher un
  `permGarde('com',…)` là-dedans et conclure « non gardé » serait mesurer le mauvais droit.
- ⛔ **LE MULTITÂCHE NE RANGE RIEN DANS `db`.** Un brouillon de fenêtre est un état
  d'APPAREIL : `localStorage`, sous le préfixe de l'espace ET l'identifiant du compte. L'y
  mettre le ferait partir à la synchro, chez toute l'entreprise, et ressusciterait ce qu'une
  équipe a supprimé exprès — c'est la règle « rien ne s'écrit dans les données d'une entreprise
  au seul chargement », appliquée à un geste de navigation. Ni mot de passe ni fichier n'entrent
  dans le brouillon. `tests/test-748.js` tient les dix règles ; le comportement, lui, se mesure
  au navigateur (`scratchpad/sonde-multi.js`).
- ⛔⛔ **UN CYCLE DE VARIABLES CSS NE DIT RIEN, ET IL TUE TOUT CE QU'IL TOUCHE.** `.sidebar`
  définit `--t1:var(--side-ink)` ; la règle du verre définissait `--side-ink:var(--t1)`. Un
  cycle rend **invalides toutes** les variables qui y participent — pas d'erreur, pas de
  console, rien. Mesuré le 22 septembre 2026 :
  `getComputedStyle(.sidebar).getPropertyValue('--t1')` rendait la chaîne **VIDE**, le titre de
  groupe sortait de la même encre que l'item actif (c'est ce qui a fait lire « deux Tableau de
  bord » sur le Mac de Justin) et la coupe valait `rgba(0,0,0,0)`. **Une variable qu'on lit
  dans une règle qui la redéfinit est un cycle** : capturer la valeur à un niveau AU-DESSUS
  (`--vr-encre` sur `<html>`) est la seule sortie. Le signe qui ne trompe pas : une propriété
  personnalisée qui se lit **vide** alors qu'elle est écrite noir sur blanc. `test-757` interdit
  la forme fautive, et `test-751` aussi.
- ⛔⛔ **UN `backdrop-filter` ET LA SURFACE QU'IL FILTRE SE DÉCLARENT ENSEMBLE — SINON UNE
  MOITIÉ DE RÈGLE SURVIT À L'AUTRE.** Le 22 septembre 2026, Justin, capture à l'appui :
  « ça fait hyper brillant et ça casse les écritures, ça fait mal fini ». Mesuré : la
  pastille « Español » rendait `background-image:none` ET `background-color:rgba(0,0,0,0)`
  — AUCUNE matière — avec `blur(18px) saturate(1.8)` par-dessus. **Un filtre de fond sans
  fond n'est pas une vitre, c'est une LOUPE** : l'élément ne montre pas une surface, il
  montre le décor d'à côté, flou et sursaturé, et le texte flotte dessus.
  La cause est structurelle et elle se reproduira : une règle **plus spécifique** retire le
  `background` posé par la règle du verre, mais elle **ne retire pas le `backdrop-filter`**,
  qui n'est déclaré que là. Deux endroits, deux fois le même chemin —
  `.filters.seg-on .chip{background:none!important}` contre `[data-verre] .chip` (100 cas sur
  14 rubriques) et `input[placeholder^="Rechercher"]{background:transparent!important}` contre
  `[data-verre] input.search-inp` (12 cas). ⚠️ Dans le premier, **l'intention était écrite
  juste à côté depuis des semaines** (« le GROUPE de segments non : c'est un creux, pas une
  vitre posée dessus ») : c'est l'ÉCRITURE qui était incomplète, pas la décision. Un
  commentaire juste ne pose pas la règle qu'il décrit.
  `tests/test-763.js` apparie, dans le CSS réel, chaque effacement de fond avec le flou qu'il
  pourrait laisser orphelin — ⚠️ **par CLASSE seulement** : le cas du champ de recherche se
  croise par un ATTRIBUT et lui échappe, donc `scratchpad/sonde-verre.js` (au navigateur, sur
  les pixels peints) est la garde de bout en bout, et le banc exige qu'elle existe.
- ⛔⛔ **UNE MOITIÉ DE RÈGLE SURVIT À L'AUTRE — TROIS FOIS LE 22 SEPTEMBRE 2026, DANS TROIS
  ENDROITS SANS RAPPORT.** C'est le défaut structurel de ce dépôt, et il a toujours la même
  forme : une règle **plus spécifique** (ou plus récente) change UNE moitié d'un accord et
  laisse l'autre, qui n'a plus de sens toute seule.
  · `.filters.seg-on .chip` retirait le `background` du verre mais pas son `backdrop-filter`
    → 112 loupes sans matière ;
  · l'onglet actif avait perdu son FOND mais gardé son TRAIT → deux marques pour une chose ;
  · `.pf-dd{flex:0 1 auto}` a rétréci le bouton, et le panneau qui se mesurait dessus est
    tombé à **42 px** — une colonne d'une lettre par ligne.
  ⚠️ **Dans les trois cas, le commentaire d'à côté disait déjà la bonne intention.** Ce n'est
  pas la décision qui manquait, c'est l'écriture qui était incomplète.
  **La question à se poser avant de changer une largeur, un fond, un marqueur : QUI D'AUTRE
  se mesure là-dessus ?** Et la parade constante : conditionner la règle à la présence de ce
  qui reste (`:has(…)`), pour que le jour où l'autre moitié disparaît, tout revienne seul.
- ⛔ **UN PANNEAU FLOTTANT NE SE MESURE NI SUR SON BOUTON NI SUR SON PARENT, MAIS SUR
  L'ÉCRAN.** Corollaire du précédent, avec ses deux symptômes opposés, mesurés le même jour :
  trop ÉTROIT (42 px, les libellés passent à la ligne lettre par lettre) et trop LARGE
  (`.pf-pan.large` ancré à gauche sortait de **81 px à droite** d'un écran de 390).
  Sur téléphone, on donne au panneau un bloc conteneur qui fait la largeur de l'écran
  (`position:static` sur le déclencheur, `position:relative` sur la rangée). ⚠️ Et la
  correction se BORNE au téléphone : sur ordinateur un menu garde sa largeur dessinée, et
  l'étaler « pour faire pareil » serait une régression — la contre-épreuve le prouve.
- ⛔ **DANS UNE LIGNE FLEX, `flex:1` A UNE BASE DE ZÉRO : C'EST LE VOISIN QUI SERT EN
  PREMIER.** « Réduire aux heures de travail » rendait **10 px de visible pour 209 px de
  texte**, parce que le `<small>` d'à côté (« 07:00 → 19:00 · sinon 04:00 → 23:00 ») gardait
  sa largeur naturelle. **Le détail mangeait le nom de l'option.** Un libellé tronqué ne
  nomme rien ; un horaire tronqué se devine. On donne au libellé un PLANCHER (`min-width`),
  on rend le détail rétrécissable (`min-width:0`), et ce qui ne tient pas passe à la ligne
  plutôt que de se couper.
- ⛔⛔ **UN GESTE, UNE NAVIGATION — LE NAVIGATEUR REFAIT LE MÊME GESTE QUE VOUS.** Le
  22 septembre 2026, pile d'appel à l'appui : un balayage entre rubriques faisait
  `go('dashboard')`, puis le navigateur traitait le **MÊME** mouvement horizontal comme
  **SON** geste « retour » — `popstate` → `goBack()` → retour à la rubrique de départ.
  À l'écran : « le glissement ne marche pas », **alors qu'il marche et se fait annuler**.
  Aucune relecture ne peut montrer ça : les deux moitiés sont justes séparément. Il faut
  compter les `go()` PENDANT le geste, avec leur pile d'appel.
  ⚠ La parade n'est PAS de couper le geste du navigateur (`overscroll-behavior-x`) : le bloc
  d'historique existe pour que le retour système marche. **On ignore le DOUBLON, pas la
  porte** — et on REMET l'entrée ignorée, sinon l'historique prend un cran de retard sur
  l'écran. Même discipline pour le `click` synthétique qui suit un `touchend` : un balayage
  qui finit sur un onglet déclenche le clic de CET onglet, donc deux navigations.
  ⚠️ Et le symétrique, payé le même jour : **« le geste ne marche que dans un sens » était un
  FAUX DÉFAUT** — l'essai glissait vers la droite depuis le PREMIER onglet, où il n'y a rien
  à gauche. Toute mesure d'un geste de navigation part d'une position du MILIEU.
- ⛔⛔ **ET LE MÊME JOUR, PAR LE MÊME CHEMIN : L'ONGLET ACTIF PORTAIT DEUX MARQUES.** Le
  soulignement de 2,5 px (`html[data-refonte] .tab::after`) est dessiné pour une bande
  d'onglets EN HAUT — coin arrondi en haut, posé à `bottom:-1px`, sur l'arête de la bande.
  La barre du bas est une PILULE FLOTTANTE : le trait y tombe À L'INTÉRIEUR, en travers de la
  pastille qui désigne déjà l'onglet. Mesuré sur les DIX combinaisons téléphone : pastille
  ET trait, partout. ⚠️ Là encore le commentaire d'à côté disait l'intention — « c'est la
  pastille qui le désigne » : l'onglet avait perdu son FOND, il avait gardé son TRAIT.
  **Deux corollaires de méthode, et ils valent pour toute suppression d'un doublon :**
  · la règle se conditionne à la PRÉSENCE de celle qui reste (`…:has(.tab-cur)…`) — sinon,
    le jour où l'autre marque disparaît, il n'en reste AUCUNE ;
  · **une contre-épreuve est obligatoire** : le cas qui doit GARDER sa marque. Sans elle on
    ne sait pas si on a retiré un doublon ou supprimé un marqueur. Quand le vrai cas est
    inatteignable (ici : une bande d'onglets enfouie dans la fiche d'une intervention), on
    INJECTE un élément représentatif — la question posée est celle du SÉLECTEUR.
  ⚠️ Et un `::after` qui ENTRE EN ANIMATION (`animation:… both`) se lit à son ÉTAT DE
  DÉPART tant qu'elle n'a pas tourné : la première contre-épreuve concluait « trait supprimé »
  sur un trait qui n'avait pas encore paru. On attend deux trames ET la durée de l'animation.
- ⛔⛔ **UN AUDIT QUI PART D'UNE LISTE DE CLASSES ÉCRITE À LA MAIN EST UNE POPULATION CHOISIE,
  DONC UN RÉSULTAT CHOISI.** Le premier recensement du verre visait un `SEL` de dix-huit
  classes que j'avais tapées moi-même : il a trouvé 125 pastilles et **rien d'autre**. Le
  second interrogeait `document.querySelectorAll('*')` — 57 057 éléments visibles sur
  42 rubriques × 2 thèmes × 2 plateformes — et a sorti une **troisième famille** que la
  liste ne pouvait pas contenir : le champ de recherche de Courrier et de Bons. Quand la
  question est « partout », la réponse ne commence pas par une liste.
- ⛔⛔ **MESURER UN DÉGRADÉ AUTREMENT QUE SUR DES PIXELS, C'EST LE RECALCULER SOI-MÊME — ET
  TROIS GÉOMÉTRIES FAUSSES ONT ÉTÉ PAYÉES AVANT D'Y ARRIVER.** Les trois, le même jour, sur
  la même pastille :
  · parcourir la **diagonale** d'un élément **traverse les lettres** — on lisait « amplitude
    0,94 » sur tout l'écran, c'était le contraste texte/fond et pas un dégradé ;
  · une bande horizontale à 3 px du haut d'une **pilule** SORT de l'élément par les bouts
    arrondis (à 3 px du bord d'un rayon de 22, la pilule ne commence qu'à 10 px du bord
    gauche) — on lisait la page d'à côté et on l'attribuait à la pilule ;
  · une **carte** ne se mesure pas comme une pilule : ses rangées du milieu portent du
    contenu. On lit la COLONNE de rembourrage à gauche, jamais le cœur — sans ça le banc
    annonçait « contraste 2,69 » sur une carte parfaitement lisible.
  **La parade est de supprimer le calcul** : `Page.captureScreenshot` avec un `clip` rend une
  image **qui EST l'élément**. Plus d'offset, plus de défilement, plus d'échelle.
  `scratchpad/png.js` décode le PNG sans dépendance (zlib + défiltrage, 46 lignes).
- ⛔⛔ **UN `::after` EN `z-index:-1` SE PEINT SOUS LE FOND DE SON PROPRE PARENT.** `body`
  portait `background:var(--vr-page)` et `body::after` les halos en `z-index:-1`. Or `body`
  n'établit pas de contexte d'empilement : son `::after` négatif remonte dans celui de la
  RACINE, et s'y peint **avant** le fond de `body`. Les trois halos existaient, étaient justes,
  et étaient intégralement cachés — la page avait l'air d'un aplat, et le verre n'avait rien à
  déformer. **Le fond d'une page qui porte un décor en pseudo-élément va sur `<html>`**, jamais
  sur `body` : le fond de `<html>` se propage au CANEVAS et se peint en tout premier.
  ⚠️ **La contre-épreuve qui tranche en trente secondes** : mettre le pseudo-élément en rouge
  franc. S'il ne se voit pas, il n'est pas peint ; s'il se voit, c'est autre chose qui le
  recouvre. On ne devine pas un ordre de peinture, on le teste.
- ⛔ **UN DÉGRADÉ QUI FINIT SUR `transparent` PASSE PAR DU NOIR.** `transparent` vaut
  `rgba(0,0,0,0)` : l'interpolation traverse du noir transparent et **salit le bord**. Tout
  arrêt de dégradé s'écrit `rgba(r,g,b,0)` avec la MÊME teinte que le départ.
- ⛔⛔ **UNE COULEUR DE PALETTE SANS SA TEINTE SOURCE EST UNE COULEUR MORTE.** Du 11 au
  22 septembre 2026, `--acc-src` n'était défini que pour trois des huit accents : les cinq
  autres laissaient la variable vide, donc `--acc:var(--acc-src)` invalide, donc les **treize**
  jetons dérivés mouraient d'un coup et l'interface restait verte. Aucun moyen de s'en
  apercevoir à la lecture — il faut **compter les deux listes l'une contre l'autre**
  (`ACCENTS` contre les règles `[data-accent="…"]`), ce que fait `test-757`.
  Corollaire, de la même journée : `applyTheme` tenait CINQ jetons à la main pendant que la
  feuille en dérive treize — les huit autres restaient verts sous une couleur personnalisée.
  **On pose la SOURCE, jamais les dérivés.** Le commentaire du bloc le disait déjà : « sans ça
  il faudrait tenir douze couleurs à la main, et la treizième serait oubliée ». Elle l'était.
- ⛔ **DEUX BARRES QUI FONT LA MÊME CHOSE, C'EST UNE DE TROP — ET C'EST LA PLUS HAUTE QUI
  GAGNE.** Le 22 septembre 2026, `#tabbar` (la pilule en verre, z-index 38) et `.rf-tabs`
  (z-index 48) étaient dessinées toutes les deux sur un téléphone. La pilule existait et
  personne ne la voyait. Avant d'ajouter un composant de navigation, **chercher celui qui
  existe déjà** : ce dépôt en avait un, complet, avec ses icônes SVG, son réglage et tous ses
  décalages de mise en page. ⚠️ Et quand on en éteint un, **la classe qui porte les décalages
  reste** (`body.rf-onglets`) : ce sont elle et non la barre qui décalent le contenu, le bouton
  flottant et les messages.
- ⛔⛔ **LE THÈME A SA RÉFÉRENCE DANS LE DÉPÔT, ET UN BANC QUI LA RELIT.** Justin a fourni
  `design/THEME-REFERENCE.md` le 22 septembre 2026 (« regarde bien que tout le reste soit comme
  le thème ») : couleurs jour/nuit, verre, rayons, typographie, mouvement. `tests/test-759.js`
  **lit ce fichier** et le compare à `app.html`, jeton par jeton. La différence n'est pas
  cosmétique : `test-757` exigeait « le verre de jour est à 34 %, pas 58 % » — un réglage fait à
  l'œil, gardé comme une vérité pendant une journée. **Un banc qui recopie des valeurs garde une
  croyance ; un banc qui relit la source garde un accord.** ⚠️ Et les écarts au document sont
  DÉCLARÉS un par un dans `ECARTS` (test-759), avec leur mesure — même mécanisme que « vu et pas
  surveillé » de `test-726`. Un écart tacite devient un oubli en une semaine.
- ⛔⛔ **LE VERT PASSAIT À CÔTÉ DE SA PROPRE PALETTE, ET C'EST LA COULEUR DE PRESQUE TOUT LE
  MONDE.** `applyTheme` faisait `if(a&&a!=='green') r.setAttribute('data-accent',a); else
  r.removeAttribute(...)`. Donc pour le DÉFAUT, ni `[data-accent="green"]` ni le bloc de
  dérivation `[data-accent]` ne s'appliquaient : mesuré au navigateur, `--acc-src` revenait
  **vide** sur le vert et rempli sur les huit autres teintes. Changer de couleur changeait treize
  jetons, revenir au vert n'en changeait que quatre — l'interface n'était pas la même selon la
  teinte. **Une valeur par défaut qui emprunte un autre chemin que les autres est un défaut qui
  attend.** Le vert est une teinte comme les autres : `r.setAttribute('data-accent', a||'green')`.
- ⛔ **UN LISERÉ NE PEUT PAS ÊTRE PLUS OPAQUE QUE LA VITRE QU'IL BORDE.** C'est le signe qu'on a
  pris une moitié d'un accord de valeurs : surface à .34 (réglée à l'œil) avec le liseré à .85 du
  document. `test-759` calcule le point le plus clair de la vitre (fond + reflet) et exige qu'il
  reste SOUS le liseré. ⚠️ Corollaire : un reflet peint en DÉGRADÉ s'ajoute à la surface — sur
  une base à .58, un dégradé qui démarre à .65 monte le coin clair à .85, soit un aplat blanc.
- ⛔ **UN LIBELLÉ FRANÇAIS NE TIENT PAS DANS UNE GRILLE DESSINÉE EN ANGLAIS.** Le document dit
  « sidebar 236 px » ; mesuré au navigateur, tuile d'icône comprise, il restait 149 px au libellé
  et « Consommation produits » en demande 163. Trois rubriques passaient sur deux lignes (59 px
  contre 44), ce qui casse le rythme du menu. **On ÉLARGIT** (258 px) : tronquer cache une
  information, rapetisser descend sous le plancher de lisibilité du terrain. ⚠️ Et deux pixels de
  marge ne sont pas une marge — mesuré, le libellé tenait sur le papier (165 contre 163) et
  passait quand même à la ligne. **On mesure APRÈS, pas seulement avant.**
- ⛔ **UN CHAMP DÉCLARÉ ET RENDU NULLE PART EST UN ÉCRAN QUI MENT SUR CE QU'IL SAIT FAIRE.**
  Les 42 rubriques de `NAV` portaient toutes un `ic:` (l'émoji de la catégorie) depuis toujours,
  et le menu n'en affichait AUCUN — c'est la première chose que Justin a vue en comparant sa
  maquette à l'application. Le jumeau d'`atts` dans `/health`, côté écran.
- ⛔ **UNE MUTATION QUI NE MORD PAS PEUT ÊTRE UNE MUTATION MAL VISÉE.** Mesuré le 22 septembre
  2026 : `s.replace(motif, autre, 1)` remplace la PREMIÈRE occurrence du fichier, pas celle qu'on
  croit. `{childList:true,subtree:true}` apparaît six fois dans `app.html` — la mutation a frappé
  l'observateur des traductions, à 5 000 lignes de la cible, et le banc est resté vert à juste
  titre. **Avant d'accuser un banc d'être aveugle, vérifier que la mutation a touché le bon
  endroit** (`git diff` après mutation, pas seulement le total du banc).
- ⛔⛔ **UNE COULEUR CALCULÉE NE REVIENT PAS EN `rgb()` — ET UN ANALYSEUR ÉCRIT POUR `rgb()` LA
  LIT EN QUASI-NOIR.** Une valeur issue de `color-mix()` est rendue par `getComputedStyle` sous
  la forme `color(srgb 0.104549 0.411451 0.310275)` : des flottants **0–1**. Un `match(/[\d.]+/g)`
  suivi de `map(Number)` les prend pour des 0–255. Mesuré le 22 septembre 2026 : la sonde de
  contraste rendait **20,9:1 sur les dix-huit combinaisons**, c'est-à-dire « tout est parfait »,
  sur une palette dont un tiers était en réalité sous la barre. Le signe qui ne trompe pas : un
  chiffre **identique et extrême** partout. Tout lecteur de couleur doit reconnaître la FORME
  avant de convertir, et **jeter** ce qu'il ne sait pas lire plutôt que de deviner.
- ⛔ **`lastIndexOf(x, o)` EN JAVASCRIPT INCLUT `o` ; `rfind(x, 0, o)` EN PYTHON L'EXCLUT.** Un
  parcours de CSS traduit de l'un à l'autre rend donc un sélecteur **VIDE** à chaque tour
  (`o` étant l'accolade ouvrante, `lastIndexOf('{', o)` la retrouve elle-même), le `if (!sel)`
  saute tout, et le banc annonce « 0 règle examinée » après en avoir parcouru 2 848. C'est le
  **compteur de population** qui l'a attrapé — sans lui, « aucun blanc en dur » passait au vert
  sur du néant. Une raison de plus de le poser systématiquement.
- ⛔⛔ **UNE SURFACE, UNE ENCRE — `--on-acc` N'EST PAS L'ENCRE DE TOUT CE QUI EST « ACCENT ».**
  L'application peint TROIS aplats : `--acc` (pastilles, onglet choisi, compteurs), `--acc-fill`
  (le bouton principal, le bouton flottant, l'étiquette de carte) et `--acc2` (la bulle du
  message envoyé, « Fait », « Occupé »). Mesuré le 22 septembre 2026 : l'encre calculée pour le
  premier tombait **cinq fois sur dix-huit** sur chacun des deux autres — jusqu'à 3,44:1 sur le
  libellé du bouton le plus utilisé. Chaque surface a donc son jeton (`--on-acc`, `--on-fill`,
  `--on-acc2`), chacun dérivé du précédent avec ses exceptions DÉCLARÉES, et `test-757` calcule
  les trois. Corollaire : **une quatrième surface d'accent sans son encre est un défaut qui
  attend**, et le banc refuse désormais tout `color:#fff` écrit en dur sur un aplat d'accent.
- ⛔ **UN SÉPARATEUR QUI NE SÉPARE RIEN EST UN TROU.** La carte utilisateur du tiroir portait un
  filet et une marge pour se détacher de la rangée « SUITE » — laquelle disparaît chez toute
  entreprise sans OP MESSAGES, c'est-à-dire dans le cas ORDINAIRE. Restaient deux filets et
  25 px de vide entre eux. Tout ornement de séparation doit s'éteindre avec ce qu'il sépare.
- ⛔⛔ **MESURER UN CONTENEUR COMME UN BLOC NE VOIT PAS UN TROU DEDANS — ET L'ÉMULATEUR REND LES
  ENCOCHES À ZÉRO.** La première sonde rendait fièrement « 0 px de vide sous le pied » : elle
  mesurait le rectangle du pied, jamais ses enfants. Et `env(safe-area-inset-*)` vaut **0** dans
  un navigateur piloté, ce qui cachait un dégagement compté DEUX FOIS (34 px d'encoche + 14 px
  de rembourrage = 48 px sous la carte). Chromium sait les simuler pour de vrai :
  `Emulation.setSafeAreaInsetsOverride {top,bottom,left,right,…Max}`. **Toute mesure de mise en
  page sur téléphone se fait encoches posées**, sinon on valide une page que personne ne voit.
- ⛔⛔ **UNE POPULATION QU'ON ÉNUMÈRE SOI-MÊME EST UNE RÉPONSE QU'ON S'ÉCRIT SOI-MÊME.** Le
  22 septembre 2026, l'audit total des cibles tactiles partait d'une LISTE DE CLASSES écrite à
  la main (`.btn`, `.chip`, `.tab`…) : il a rendu 125 cibles sous le plancher et raté une
  famille entière — les boutons nus de `#content`, écrits en style direct. Le même audit sur
  `document.querySelectorAll('*')`, filtré par `cursor:pointer` et `onclick`, en a trouvé
  **242**. C'est la jumelle de « une assertion sur un ensemble vide » : là on ne comptait rien,
  ici on comptait ce qu'on avait choisi de compter. **Un recensement part du DOM, jamais d'une
  liste ; la liste sert à EXPLIQUER les écarts, pas à les produire.**
- ⛔⛔ **UN CONTRÔLE « CET ÉLÉMENT EST-IL RECOUVERT ? » SE FAIT CANDIDAT CENTRÉ — SINON C'EST LA
  BARRE FIXE QU'ON MESURE.** Trois versions fausses le même jour, chacune plausible :
  · lire `elementFromPoint` au centre de l'élément **page en haut** → 14 faux, tous sous la
    barre d'ONGLETS ;
  · lire **page en bas** → 10 autres faux, tous sous la barre du HAUT ;
  · **amener le candidat au milieu de la fenêtre (`scrollIntoView({block:'center'})`), attendre
    deux trames, PUIS relire** → 0.
  ⚠️ Le signe qui ne trompe pas, et il vaut pour toute sonde : **quand les défauts trouvés ont
  tous le même voisin** (« sous la barre », « à 15 px », « le même chiffre partout »), ce n'est
  pas le code qui a un motif, c'est la mesure.
- ⛔ **UN TIROIR REPLIÉ N'EST PAS UN DÉBORDEMENT, ET UN CONTENEUR QUI DÉFILE NON PLUS.** Sur
  4 016 « éléments hors de l'écran » du premier audit, **3 900 étaient faux** : 3 612 vivaient
  dans la barre latérale fermée (x −252, c'est un tiroir qui glisse) et le reste dans le
  planning et les tableaux, qui défilent horizontalement par construction. Un détecteur de
  débordement doit remonter les ancêtres et écarter les deux (`dansTiroirFerme`, `dansRouleau`)
  — sinon il crie 4 016 fois, et un banc qui crie faux se fait ignorer, puis désactiver.
- ⛔⛔ **UNE CIBLE TACTILE SE MESURE À CE QU'UN DOIGT DÉCLENCHE, PAS À SON RECTANGLE.** Le
  22 septembre 2026, l'audit des écrans profonds comptait « 411 cibles sous 38 px » au
  téléphone : c'étaient 188 éléments, dont une bonne part répondaient DÉJÀ sur 44 à 47 px — un
  doigt touche un point, et ce point déclenche l'élément, son `label`, ou la rangée `.frow` qui
  fait suivre le tap. On mesure donc la ZONE QUI RÉPOND (`elementFromPoint` sur la verticale du
  centre, en recopiant la règle de l'écouteur de l'application), et on range À PART, nommé, ce
  qui est couvert exprès (sous un menu que l'exploration vient d'ouvrir) ou écarté par décision
  écrite (les cases des grilles de planning). Ce qui restait était vrai et se rangeait en
  familles — 82 commandes des FENÊTRES à 28–34 px, parce que le plancher de `#content`
  s'arrêtait à sa porte. `scratchpad/sonde-cibles.js`, `tests/test-771.js`.
- ⛔⛔ **UN SÉLECTEUR D'ATTRIBUT NE VOIT PAS UN ATTRIBUT ABSENT.** La règle tactile posait
  16 px sur `input[type=text]` pour que Safari ne zoome pas au toucher — et un `<input>` SANS
  `type` est un champ texte que ce sélecteur ignore ; les `<select>` et `<textarea>` hors
  `.field` aussi. Mesuré, taille CALCULÉE : 39 champs sous 16 px sur deux rubriques, toute la
  fenêtre Intervention à 15 px. Sur un iPhone, chacun faisait zoomer la page — qui restait
  zoomée. Une règle qui vise une forme d'écriture se vérifie sur ce que le navigateur CALCULE.
- ⛔ **UN CORRECTIF DE MISE EN PAGE SE MESURE DANS TOUS SES ÉTATS, PAS DANS CELUI QU'IL
  RÉPARE.** Le correctif « OP GESTION ne se coupe plus » du 22 septembre au matin était juste
  en rubrique, page en haut. Remesuré le soir sur 3 largeurs × 3 rubriques × les deux états de
  défilement (`scratchpad/sonde-barre.js`), il avait fait naître trois défauts : les ronds qui
  SAUTENT à gauche au premier défilement du tableau de bord, la barre tassée à 360 px
  (`display:none` retire aussi la PLACE ; `visibility:hidden` la garde), et un `gap:8px` du
  palier téléphone qui n'avait JAMAIS pris contre un `!important` écrit plus loin.
- ⛔⛔ **UN AUDIT SUR DEUX APPAREILS NE DIT RIEN DES DIX AUTRES — ET UNE TABLETTE N'EST NI UN
  TÉLÉPHONE NI UN ORDINATEUR.** Jusqu'au 23 septembre 2026, toutes les sondes tournaient sur un
  iPhone et un Mac. Étendues à douze profils (`scratchpad/profils.js`), elles ont trouvé en une
  passe ce qu'aucun des deux ne pouvait voir, et sur l'iPad d'abord :
  · un iPad se déclare `data-kind="mobile"` : la barre d'onglets s'y affichait **ET** le menu
    latéral, permanent dès 781 px — deux navigations, la pilule posée sur la carte du menu ;
  · les planchers tactiles étaient bornés à `max-width:780px` — la LARGEUR d'un téléphone, pas
    le DOIGT : sur tablette, le segmenté de période répondait sur 30 px, l'épingle du planning
    sur 14. **La navigation se choisit à la largeur ; un plancher tactile se pose sous
    `(pointer:coarse)`** ;
  · la barre des jours du planning n'existe QUE dans la mise en page tablette : aucun audit au
    téléphone ne pouvait la mesurer. Un écran qui change de forme selon la largeur a autant
    de populations que de formes.
- ⛔⛔ **UNE PAGE QUI S'ÉLARGIT EMPORTE `innerWidth` AVEC ELLE — UN DÉBORDEMENT SE MESURE CONTRE
  LA LARGEUR DE L'APPAREIL.** Sur un Android de 360 px, le segmenté du tableau de bord poussait
  la page à 382 px ; un navigateur mobile agrandit alors sa fenêtre de mise en page, et
  `innerWidth` rendait 382 lui aussi. Tout audit qui comparait `scrollWidth` à `innerWidth`
  concluait « rien ne dépasse » sur une page qui glissait de côté sous le doigt. On compare à
  la largeur POSÉE du profil (`scratchpad/sonde-appareils.js`).
- ⛔ **« ET QU'ILS TIENNENT SUR UNE LIGNE » ÉTAIT ÉCRIT DANS LE COMMENTAIRE DE `SEG_MAX`, PAS DANS
  LE CODE.** Sur iPad portrait, deux segmentés (Produits, Bons) sortaient de leur colonne de
  500 px et la page entière défilait de côté. `segTient()` le vérifie désormais, et un groupe
  qui ne tient pas redevient une rangée de pastilles — réévalué quand la tablette tourne. C'est
  la règle « un commentaire n'est pas une garde », côté mise en page.
- ⛔⛔ **UNE ICÔNE QUI REMPLACE UN ÉMOJI EMPORTE LE NOM DU BOUTON.** La refonte change les émojis
  en traits dessinés (`icones()`, classe `rf-ic`) marqués `aria-hidden` — juste pour une icône
  posée à côté d'un mot. Mais 33 commandes ne portaient QUE leur émoji (✎ Modifier, 🗑 Supprimer,
  🔄, 🖨️) : avant la refonte, un lecteur d'écran lisait l'émoji ; après, le bouton n'avait plus
  AUCUN nom, ni à l'oreille ni en infobulle. Trouvé le 23 septembre 2026 en rejouant un clic
  « sans effet » sur iPad : le ✎ de Secteurs n'avait ni texte, ni title, ni aria-label.
  `nommerIcone()` lui rend le nom de son geste au moment du remplacement, **jamais par-dessus un
  nom que l'application a posé, jamais avant `nommer()`** (qui passe après et nomme mieux :
  `data-tip`, « Ouvrir le menu »). ⚠️ Et un recensement « sans nom » doit écarter les CONTENEURS
  qui bloquent un clic (`onclick="event.stopPropagation()"`) : ils n'agissent pas, et sans ce tri
  la mesure en comptait 51 de trop. `tests/test-777.js`, `scratchpad/sans-nom.js`.
- ⛔⛔ **`--acc` EST LA COULEUR D'UN APLAT, PAS CELLE D'UNE LETTRE — UN TEXTE ÉCRIT `--acc-txt`.**
  Le 22 septembre 2026, l'audit des neuf teintes (756 écrans + 126 fenêtres,
  `scratchpad/audit-teintes.js`) a trouvé **327 textes en `var(--acc)`** : justes sur le vert
  par défaut, pour lequel tout avait été réglé à l'œil, et sous le seuil ailleurs — l'indigo de
  nuit à 2,90:1, l'orange de jour à 2,95. **Un choix de couleur offert à l'utilisateur se mesure
  sous CHACUNE de ses valeurs**, pas sous celle qu'on regarde tous les jours. Même famille : de
  nuit, `--red` et `--org` sont éclaircis pour se LIRE, donc ils ne portent pas de blanc (2,69
  sur la pastille de la cloche, 42 rubriques). Une surface pleine prend son jeton d'aplat ET
  son encre (`--red-fill`/`--on-red`, `--org-fill`/`--on-org`). `tests/test-773.js`.
  ⛔ **Et un audit qui ne mesure que les textes EN ACCENT ne voit pas le reste de ce que la
  teinte touche** : elle colore aussi les SURFACES (page de jour à 7 %, vitres à 4 %,
  sélections à 14 %). La passe « tous les textes » (`FAM=tout`, 61 571 textes) a trouvé le
  sous-titre de chaque rubrique à 4,14–4,48 de jour, les couleurs de catégories et de
  fournisseurs écrites telles quelles (1,58:1), et vingt endroits qui passaient l'accent comme
  encre **à travers une variable** (`const col='var(--acc)'`) — invisibles au motif
  `color:var(--acc)`. Une couleur de donnée s'écrit par `encreDonnee()`, une surface pleine
  par `aplatDe()` (fond ET encre). `tests/test-774.js`.
- ⛔⛔ **UNE FONCTION DÉCLARÉE DEUX FOIS : LA SECONDE GAGNE PARTOUT, EN SILENCE.** Le même jour,
  un `encreSur()` a été écrit sans chercher s'il existait — il existait, sept mille lignes plus
  haut, et servait « Ma couleur ». Une déclaration de fonction est remontée : la seconde
  remplace la première pour TOUTE la page, sans erreur ni avertissement. Avant d'écrire un
  utilitaire : `grep -n "function <nom>("`. `test-773` compte les définitions et en exige une.
- ⛔ **SOUS LE VERRE, UN CONTRASTE SE LIT AU PIXEL.** Composer les fonds des ancêtres ignore ce
  que la vitre laisse passer. Mesuré le 22 septembre 2026 : une fenêtre posée sur le voile de
  `#overlay` avait un fond RÉEL gris moyen (204,211,211) — texte secondaire à 3,56 — parce que
  la vitre des cartes (58 % de blanc) laissait passer le voile ; et le cyan réglé « à 4,50 » au
  calcul rendait 4,30 au pixel. Une vitre au-dessus d'une scène assombrie est DENSE
  (`--vr-fond-dense`).
  ⛔⛔ **ET LE CALCUL MENT DANS LES DEUX SENS — RELIRE SES SEULS SUSPECTS NE SUFFIT PAS.** Le
  23 septembre 2026, les six pastilles d'état (« Planifiée », « Annulée »…), que le calcul
  donnait lisibles sous le verre de nuit, tombaient à 3,28 au pixel : la vitre laisse passer
  des halos que la composition ignore, et la rend PLUS CLAIRE qu'elle ne le croit. Un faux
  négatif ne se relit pas, puisqu'il n'est pas dans la liste. Sous le verre, on mesure TOUT au
  pixel : `scratchpad/audit-pixel.js` (une capture par écran, fenêtre de rendu haute,
  transitions menées à terme, l'encre peinte d'un élément estompé = son encre mêlée au fond).
- ⛔⛔ **UNE MESURE PRISE PENDANT UNE TRANSITION DE VUE LIT LE CALQUE DE LA TRANSITION — ET
  `elementFromPoint` DIT QUI REÇOIT LE CLIC, PAS QUI EST PEINT.** Le 23 septembre 2026, le
  témoin de la passe au pixel était vu « une fois sur deux ». `go()` passe par
  `document.startViewTransition`, dont le rendu s'exécute PLUS TARD, hors de l'appel : relevé
  au milieu, l'écran rendait **86 textes « presque invisibles »** (les cartes neuves à leur état
  de départ) et **65 « recouverts »** (le calque `::view-transition` au-dessus de tout) pour
  UN texte lu. On enveloppe `startViewTransition` au démarrage de la sonde pour COMPTER les
  transitions ouvertes, et on attend qu'elles soient closes avant de relever.
  ⚠️ Et « recouvert » ne se déduit pas d'un `elementFromPoint` seul : un texte en
  `pointer-events:none` rend son PARENT, un calque transparent posé dessus ne cache rien, un
  texte coupé en ellipse déborde de sa boîte dans un `Range` et son centre tombe chez le
  voisin. Les 11 « recouverts » du tableau de bord étaient faux, les 11. Recouvert veut dire :
  hors de la lignée, ET une chaîne qui peint un fond.

- ⛔ **UNE ANCRE DE BANC EST UN COMMENTAIRE — ON DÉCOUPE DANS LE TEXTE BRUT, ON NETTOIE APRÈS.**
  Chercher le titre d'un bloc dans un texte dont on vient de retirer les commentaires rend −1,
  donc une tranche VIDE, et **une tranche vide passe au vert sur tout**. Pris sur `test-757` à
  sa première exécution, le 22 septembre 2026.
- ⛔⛔ **UN SÉLECTEUR `:has()` DÉCRIT UNE RELATION, PAS UNE FORME — ET LA MÊME RELATION EXISTE
  CHEZ DES ÉLÉMENTS QUI N'ONT RIEN À VOIR.** Le 22 septembre 2026,
  `div:has(> input[placeholder^="Rechercher"])` habillait la « pilule de recherche ». Sur Bons
  de commande, le champ est écrit en **enfant direct de `#content`** : la zone de contenu
  entière prenait `border-radius:999px`, la vitre et son `backdrop-filter`. Mesuré :
  **1 742 × 716 px, rayon 999 px, flou 14 px, fond à 46 %** — un disque pâle en travers de
  l'écran, que Justin a pris en photo (« c'est quoi ce fond moche »). Un sélecteur de PARENT
  s'écrit donc avec ce que l'objet EST, pas seulement avec ce qu'il contient :
  `:not(:has(> :not(input):not(svg):not(button):not(label)))` — « rien d'autre que le champ ».
  ⚠️ Et il faut distinguer les emplois : la même relation qui vise un **descendant**
  (`… input.search-inp`) ne peint pas le conteneur et reste large — la v720 en dépend.
  `tests/test-767.js` classe les trois cas au lieu de les compter en bloc ; sa première
  version criait « 2 sans garde » sur du code juste, et un banc qui crie faux se fait
  désactiver.
- ⛔⛔ **POUR SAVOIR QUELLE RÈGLE PEINT UN ÉLÉMENT, ON DEMANDE AU NAVIGATEUR —
  `CSS.getMatchedStylesForNode`.** Le même jour, le disque ci-dessus a coûté une heure et deux
  fausses pistes, chacune avec son jeu de captures : les halos du verre (`--vr-halos` s'éteint
  à 70 % de son rayon — vrai, et sans rapport), puis une bissection des pseudo-éléments de
  `body` (dont une conclusion fausse, la capture étant couverte par la fenêtre
  « Notifications » qui se rouvre toute seule). Dix lignes de CDP ont nommé le coupable **en
  une exécution**. La règle du dépôt sur `elementsFromPoint` — « un relevé coûte dix lignes et
  remplace une heure de tâtonnement » — vaut aussi pour les RÈGLES, pas seulement pour la pile
  d'éléments.
  ⚠️ Corollaire payé le même jour : **un correctif posé sur une cause fausse se retire.** Le
  réglage des halos, validé avec Justin en septembre, a été remis tel quel. Un correctif
  inutile occupe le terrain et fait croire le problème traité.
- ⛔ **UNE RÈGLE ÉCRITE POUR UN ÉCRAN NE COUVRE PAS LE COMPOSANT — ET L'ÉCRAN QUI SORT DU
  CADRE REND DU BRUT.** Toutes les règles du segmenté visaient `.plg-pl .seg span` : la barre
  du planning, et seulement des `span`. Pointage est le seul écran qui met des `<button>` dans
  un `.seg` : ils sortaient **bruts du navigateur** — gris, encadrés, dans la police du système
  — au milieu d'un conteneur en verre. Un composant se nomme par sa CLASSE, jamais par l'écran
  où il est né, et il couvre les balises qu'on y met vraiment. ⚠️ Un `<button>` arrive avec ses
  atours : sans `background:none; border:0; font-family:inherit`, il ne ressemblera jamais au
  `span` d'à côté, quelle que soit la règle qu'on empile par-dessus.
- ⛔⛔ **UNE SONDE QUI CLIQUE DOIT COMPTER SES FRAPPES QUI ONT VRAIMENT PORTÉ.** La passe de
  clics du 22 septembre 2026 annonçait « 1 027 clics, 0 erreur ». Le compteur de population
  disait autre chose : **730 frappes n'avaient trouvé personne et 248 étaient tombées sur une
  AUTRE cible — 49 avaient atteint celle qu'on visait.** Un recensement ne rend pas deux fois
  la même liste (la vue s'anime, les données bougent), donc viser par INDEX ne marche pas, même
  en remettant l'écran d'aplomb avant chaque frappe. On vise par SIGNATURE (libellé + classe),
  et **tant que le compteur ne montre pas une couverture franche, le « 0 erreur » ne se cite
  pas.** C'est la règle « une assertion sur un ensemble vide » appliquée à un geste : ici on ne
  comptait pas des absences, on comptait des clics qui n'avaient pas eu lieu.

- ⛔⛔ **UNE GÉOMÉTRIE RECOPIÉE EN JAVASCRIPT DÉPEND DU MOMENT OÙ ON LA COPIE.** La pastille de
  la barre d'onglets lisait `offsetWidth` de l'onglet actif et se le recopiait. Mesuré le
  22 septembre 2026 : **143 px de large pour un onglet de 76** — la mesure avait été prise
  quand la barre n'avait encore que trois onglets. **Trois rustines n'ont pas suffi** : double
  `requestAnimationFrame`, `ResizeObserver`, replacement à chaque rafraîchissement — le
  résultat restait juste **une fois sur deux**. ⚠ Et l'observateur ne pouvait pas rattraper ce
  cas : la barre occupe toute la largeur, donc SA taille ne change jamais quand le nombre
  d'onglets change ; quant aux onglets observés, `innerHTML=` les avait détruits.
  **La sortie n'est pas une quatrième rustine, c'est de ne plus MESURER.** Des colonnes
  égales se déduisent de leur NOMBRE : le JavaScript pose un numéro, le CSS calcule.
  ⚠ `translateX` en pourcentage se rapporte à la largeur de l'ÉLÉMENT, donc à une colonne :
  `calc(var(--i) * (100% + gouttiere))` déplace sans un seul chiffre en dur.
- ⛔⛔ **LE NAVIGATEUR ANNULE LE FLUX DE POINTEUR AU PREMIER MOUVEMENT HORIZONTAL.** Trace à
  l'appui, 22 septembre 2026 : `pointerdown`, **un seul** `pointermove`, puis `pointercancel`
  — Chrome reprend la main pour le défilement — pendant que les `touchmove` continuaient
  jusqu'au bout. **Un geste horizontal bâti sur les événements de POINTEUR ne peut pas marcher
  au doigt, et rien ne le dit** : l'écouteur est bien posé, il reçoit bien le premier
  événement, et il meurt au second. On écoute le TACTILE pour un doigt, le POINTEUR pour une
  souris. ⚠ `touch-action:pan-y` serait l'autre sortie — refusée : elle s'applique à tout le
  sous-arbre et emporterait le défilement latéral du planning et des tableaux.
  ⚠ Corollaire : `pointercancel` n'annule RIEN dans ce contexte, il arrive à chaque geste.
  C'est `touchcancel` qui dit vraiment que le doigt a été perdu.
- ⛔ **UN ÉCOUTEUR POSÉ SUR UN CONTENEUR QUI NE COUVRE PAS L'ÉCRAN EST UN ÉCOUTEUR QU'ON CROIT
  AVOIR POSÉ.** `#content` mesurait −390 → 900 (la page était défilée) et
  `elementFromPoint(220,420)` rendait `HTML` : le doigt ne touchait donc pas la zone écoutée.
  On écoute le document et on ÉCARTE ce qui ne doit pas recevoir le geste.
- ⛔ **UN SOUS-TITRE NE COMMENCE PAS PAR `/* ══` : C'EST LA MARQUE D'UN BLOC, ET LES BANCS
  DÉCOUPENT DESSUS.** Le 22 septembre 2026, un sous-titre ajouté au milieu du bloc NAVIGATION
  a réduit la tranche de `test-758` de 2 500 à 1 011 caractères, et le banc a accusé la
  pastille de ne porter aucune de ses règles — elle les portait toutes.
- ⛔ **UN ÉCRAN QUI NE REMPLIT PAS SA LARGEUR SE MESURE, IL NE SE DEVINE PAS.** Justin, capture
  à l'appui : « ça ne prend pas tout l'écran ». Mesuré sur une fenêtre de 2 000 px :
  `#content` s'arrêtait à **1 796**, soit 204 px perdus à droite, sur TOUTES les rubriques.
  C'était un `max-width:1560px` posé au-delà de 1 700 px, pour la lisibilité d'une ligne de
  texte. Il ne protégeait rien : cette application affiche des cartes, des grilles et un
  planning, qui bornent déjà LEUR propre texte. **On borne la MESURE là où il y a de la prose,
  pas la page.**
- ⛔ **DE NUIT, C'EST LA LUMIÈRE QUI ÉLÈVE, PAS L'OMBRE — ET J'AVAIS RECOPIÉ L'INVERSE.**
  La maquette donnait `--vr-fond:rgba(28,28,30,.42)` sur une page `#0a0a0c → #000`. Deux
  fautes d'un coup : le **noir pur**, que ce fichier interdit depuis des semaines (halation,
  contraste dur sur OLED), et une surface **plus sombre que la page**, donc une carte qui
  s'enfonce au lieu de se lever. L'écran devenait un aplat de rectangles à peine distincts —
  « je la trouve moins belle l'app ». Une surface élevée est PLUS CLAIRE que son fond, et
  teintée de la même famille : un film gris sur du bleu nuit se voit, et se voit mal.
- Ne pas modifier l'anti-abus (`server/index.js`) sans relire pourquoi il lit
  `req.ip` et non l'en-tête brut — un en-tête fourni par le client se falsifie
- Ne pas écrire de données personnelles de clients dans les journaux
- **Ne jamais faire `db.produits.push(…)`** : une fiche produit naît par `produitCreer(fiche,{semis,push})`
  (`app.html`), qui pose `cree`/`creePar` — c'est ce qui fait apparaître le « +N » sur les box et la cloche.
  Un semis (catalogue, démo, bêta) passe `semis:true` (vaut 0, jamais « nouveau »). Une seule LIGNE DE CODE
  doit appeler `db.produits.push` — `grep -c` en compte deux, la seconde étant le commentaire qui le dit.
- **L'identifiant d'une fiche produit est soit unique par construction (`uid`), soit déduit d'un nom qui
  ne peut PAS sluguer à vide.** `idCatalogue` réduit un nom à `[a-z0-9]` : de la ponctuation seule ou une
  écriture non latine ne laisse rien et retombe sur le générique `cat_x`. Pour tout nom **libre** (champ
  de saisie, texte collé), passer par `idProduit(nom)`, qui rend `uid()` dans ce cas. Ne pas se reposer
  sur la garde de `produitCreer` : elle ne protège que la création LOCALE — `fusionnerBases` unit par
  identifiant et ne la voit jamais, donc deux appareils hors ligne perdraient une fiche et son stock à
  la synchro, sans même être signalés comme doublon. `tests/test-634.js` relit le fichier et bloque
  tout nouvel appel qui construirait un identifiant à partir d'un nom libre. Même esprit : les décisions d'une box (`db.boxDecisions`) et les paires déclarées
  distinctes (`db.produitsDistincts`) sont des collections à part, fusionnées par enregistrement — ne pas
  les ranger sur la box ni sur la fiche produit, la fusion en bloc écraserait le stock ajusté ailleurs.
- **Ne jamais écrire une catégorie de produit hors de `CAT_LIST`.** Les huit sont la seule taxonomie
  de l'application : elles portent une couleur et groupent le stock des box. Les catalogues
  fournisseurs (`CATFOUR`) en ont 171 autres — les traduire par `rangerCatFour(étiquette, nom)`, jamais
  les recopier. Deux règles y sont gravées : le NOM passe avant l'étiquette (un rayon nomme une cible,
  le nom nomme l'objet), et rien qui nomme une cible ne se replie sur TP14 ni TP18 — ce sont les types
  du règlement biocide qu'une entreprise trace, pas deux étagères parmi huit.
- **Retirer un produit d'une box s'écrit TOUJOURS dans `db.boxDecisions`** (`boxDecider`). Quatre
  chemins le font : la feuille « Retirer », la croix ✕ de « Modifier la box », le retrait direct de la
  fiche, et le retrait validé par le DR. Sans cette trace, le catalogue repose tout seul ce qu'une
  équipe a retiré à la main — et une pose multi-box efface en silence les décisions de trente équipes.
  Règle jumelle : **une décision « Pas dans cette box » ne se lève que sur la box qu'on a sous les
  yeux** (`boxPoserProduits(b,ids,{respecterEcartes})`).
- ⛔ **Quitter un espace passe par `espaceQuitter()`, jamais à la main.** Il y a QUATRE portes —
  Code espace, lien de connexion, lien client (`espace.html`) et fermeture par la Tour — et le
  10 septembre 2026 trois d'entre elles avaient le même défaut. La fonction retire `STORE_KEY`, le
  drapeau de vidage, pose `elan_frais`, emporte les secrets de l'entreprise quittée (clé Anthropic,
  code d'équipe devis, projet Firebase personnel, annuaire, marques de lecture, compteurs d'usage,
  administrateur déclaré) et efface les bases mises de côté en IndexedDB. Le préfixe se lit sur
  `STORE_KEY`, jamais écrit en dur — la bêta a le sien, et une liste figée raterait tout ce qui est
  construit à la volée. `espace.html` refait la même chose en clair : elle ne partage aucun code
  avec l'application, donc toute modification ici doit s'y répercuter.
  **Le drapeau de vidage est le point qui coûte** : le vidage des collections de démonstration n'a
  lieu QU'UNE FOIS DANS LA VIE DE L'APPAREIL. Sans son retrait, un appareil déjà utilisé rejoue
  `seed()` sans vider : 160 produits, cinq fournisseurs, deux devis, deux factures, deux contrats
  et DEUX BOX DE DÉMONSTRATION (« Cuisine — Restaurant Le Gourmet »…) entrent dans la base du
  client, puis la première synchro — une UNION — les répand dans toute l'entreprise. Mesuré :
  220 fiches deviennent 380 et 110 noms passent en TRIPLE. C'est le SEUL moment où retirer ce
  drapeau est sans danger, parce qu'on vient de supprimer la base. `tests/test-637.js` surveille les
  quatre portes, `scratchpad/sonde-rejoindre.js` l'exerce par le vrai `teamopJoin`.
- ⛔ **Un `<input type="number">` AVALE la virgule décimale, et le champ reste VALIDE.** Mesuré sur
  Chromium en `fr-FR` : « 33,50 » devient « 3350 », « 5,5 » de TVA devient « 55 ». `replace(',','.')`
  n'y peut rien — la virgule n'atteint jamais le JavaScript. Un seul écouteur `keydown` (vers la
  ligne 7803 d'`app.html`) la remplace par un point via `document.execCommand('insertText')`, qui est
  le seul à respecter le curseur ET une sélection en cours sur un champ numérique. Ne pas le
  supprimer, ne pas le remplacer par `setRangeText` (refusé sur `type=number`), ne pas basculer le
  type en texte (le curseur est perdu : « 33,50 » devient « .5033 »), et **ne rien réémettre quand
  `execCommand` réussit** — il émet déjà `input`, et un `change` de trop re-dessine les blocs sous
  les doigts de l'utilisateur.
- **Une quantité de ligne s'exprime dans l'unité DE LA LIGNE, pas de la fiche.** Le technicien saisit
  250 mL d'un produit stocké au litre. `prodLineUnit(l)` donne l'unité juste, `stockConv(q,de,vers)`
  convertit, `uniteCompat(de,vers)` dit si deux unités s'ADDITIONNENT — parce que `stockConv` rend la
  quantité inchangée quand il ne sait pas convertir, ce qui est pratique pour déduire du stock et
  piégeux pour faire une somme. Trois documents partaient faux d'un facteur 1000 : la facture générée
  depuis une intervention, le registre biocide et le dossier sanitaire.
- **Une trace de mouvement dit ce qui a BOUGÉ, jamais ce qui était demandé.** Le stock plafonne à
  zéro ; la ligne de `db.mouvements` ou de `traceBox` doit plafonner sur le même nombre. Valider −4
  sur une box tombée à 1 sort une unité : le mouvement en dit une, pas quatre. Même règle dans
  `intStockDeduire`, `boxMvtValider` (lot ET mouvement isolé) et `boxAdj`. Et un bon de remise ne
  totalise pas des unités avec des cartons : `remiseAjoute(m,qte,unite)`, une ligne par unité.
- ⛔ **Le stock d'une box ne se réécrit JAMAIS en bloc.** Un formulaire porte l'instantané pris à son
  ouverture ; l'appliquer tel quel rembobine la box à cette minute-là, avec un `_m` neuf donc
  gagnant sur tous les appareils. `saveBox` part du stock VIVANT et n'applique par-dessus que ce que
  la fenêtre exprime : une fiche ajoutée, ou une quantité que la personne a elle-même retapée.
  Mesuré avant correction : 12 u revenus à 40 u chez toute l'équipe, pendant que les lignes de
  mouvement disaient l'inverse.
- ⛔ **Ouvrir un écran n'écrit pas.** `boxAutoNouveautes` a été supprimée le 10 septembre 2026 :
  ouvrir une box posait les nouveautés dans TOUTES les box visibles, donc les tamponnait toutes,
  donc faisait gagner à cet appareil la fusion de chacune — 120 unités sorties par quatre
  techniciens ressuscitées en un seul geste d'affichage. On prévient avec la pastille « +N », on
  écrit après un tap. C'est aussi la règle « rien ne s'écrit au seul chargement », appliquée aux
  écrans profonds.
- ✅ **LA RÈGLE FIRESTORE EST FERMÉE DEPUIS LE 18 SEPTEMBRE 2026**, et cette fiche a affirmé le
  contraire pendant deux jours. Justin a lancé `firebase-console.js regles-publier` ce jour-là ;
  l'outil a publié DEPUIS `firestore.rules` puis relu chez Google : `allow read: if
  monEquipe(teamId)`. Les lignes vivantes sont `firestore.rules:116-117` — ce n'est plus un
  commentaire, c'est la règle servie.
  ⚠️ **Ce qui a permis à cette page de mentir**, et c'est exactement la leçon que
  `firestore.rules` porte déjà en tête : un fichier du dépôt ne prouve RIEN de ce qui tourne
  ailleurs. La seule source est l'outil (`regles` COMPARE ce que Google sert à ce fichier).
  Ne jamais réécrire ici un état de publication de mémoire : le relire.
  ⛔⛔ **ET LE COROLLAIRE S'EST INVERSÉ LE JOUR DE LA PUBLICATION.** Cette page disait :
  « `fbJetonEquipe()` doit TOUJOURS pouvoir échouer sans casser la synchro (elle rend `''` et
  l'appareil repart en anonyme) ». C'était vrai tant que la porte était ouverte — un anonyme
  lisait tout. Ça ne l'est plus : **un appareil qui repart en anonyme n'obtient RIEN.** Le
  silence délibéré de `fbJetonEquipe` sur les échecs NON définitifs (délai de 4 s, 500, hors
  ligne — tout ce qui n'est ni 403 ni 409) reposait sur cette hypothèse, et l'hypothèse est
  tombée. Les deux refus définitifs, eux, ont bien leur écran (`jetonRefusEcran`).
  ⚠️ **Ce qu'un appareil en bord de réseau voit VRAIMENT dans ce cas n'a pas été mesuré** — et
  tant que ça ne l'est pas, on ne sait pas si la synchro dit quelque chose ou tombe en silence.
  C'est précisément la panne que ce dépôt a déjà payée deux fois (`_mailboxes`, le jeton refusé
  d'ELAN : cinq personnes saisissant pendant des jours dans un espace coupé). Voir `REPRISE.md`.
  Pour mémoire, les deux conditions qui ont dû être tenues AVANT de publier, et qui restent
  vraies pour toute porte future : **tous** les appareils doivent présenter le jeton (sinon les
  retardataires perdent l'accès aux données de leur propre entreprise), et les entreprises
  restées sur l'espace de **repli** doivent avoir déménagé — le repli n'a pas de jeton, sa clé
  étant écrite en clair dans `app.html`, donc une preuve venant de lui ne prouve rien. Ne jamais
  rendre le jeton obligatoire côté client avant que la règle le soit côté Google.
- ⛔ **Une box se fusionne PRODUIT PAR PRODUIT, pas en bloc.** C'est le seul enregistrement que
  plusieurs personnes modifient en même temps sans se marcher dessus : chacune sur un produit
  différent. Chaque ligne de stock porte sa date dans `b._ms[produit]`, retraits compris, et
  `boxFusionFine` recompose le stock ligne à ligne. Trois règles à ne pas casser :
  1. **`_ms` doit rester hors de `recEmpreinte`** (comme `_m`). S'il y entrait, chaque `save()`
     re-tamponnerait la box, qui battrait sa propre pierre tombale et gagnerait toutes les
     fusions sans que personne n'ait rien fait. Le signe que ça va : trois `save()` sans
     changement ne posent aucun `_m` (`tests/test-639.js`).
  2. **Les marques des produits EN STOCK ne s'élaguent jamais** — ce sont elles qui protègent le
     travail de chacun. Seules celles des produits retirés s'effacent, au rythme des tombes.
  3. **`boxFusionFine` rend `null` tant que les deux côtés ne datent pas leurs lignes**, et
     l'ancienne règle reprend. C'est ce qui rend le déploiement sûr — et ce qui fait qu'exiger la
     version depuis la Tour est ce qui active vraiment la maille fine.
  Partout ailleurs, deux personnes sur le même champ du même enregistrement est un VRAI conflit :
  le plus récent gagne, et c'est juste.
- ⛔ **Un numéro de document ne se réutilise jamais, et les deux sources sont amnésiques.**
  Supprimer une intervention l'ARCHIVE, et l'archive est plafonnée à 500 : lire « le plus grand
  numéro existant » ne suffit pas, ce qui sort de la mémoire revient. `db.numMax` est un plafond
  qui **ne redescend jamais**, relevé par `numPlafondRelever()` à chaque `save()` sur ce que la
  base contient vraiment, et réuni par le **MAXIMUM** (`numMaxUnion`) à la fusion — jamais par
  « le plus récent gagne », qui laisserait un appareil en retard rendre un numéro déjà émis.
  `intNum()` et `nextNum()` s'en servent comme plancher.
- **Les collections qui ne sont pas des listes se fusionnent clé par clé.** `plansSite`, `planNotes`
  et `permissions` sont des dictionnaires : `COLLS_DICT` + `dictFusion` les réunissent, et
  `baseSignature` les regarde — sinon une fusion qui ramène le plan d'appâtage d'un collègue passe
  pour un non-événement et n'est jamais repoussée. Avant : le plan de 24 postes d'un client écrasait
  celui de 18 postes d'un autre, en entier, sans pierre tombale.
- ⛔ **`_m:1` posé juste avant un `save()` ne survit pas.** `estampiller()` date de MAINTENANT tout
  enregistrement absent de l'ombre : un `_m:1` écrit puis sauvegardé est écrasé, et la fiche bat sa
  pierre tombale. Il ne tient que là où `ombreRelever()` passe juste après — au chargement (`load()`)
  et à l'import. Ailleurs, ne pas prétendre qu'il protège quoi que ce soit.
- **Rien ne s'écrit dans les données d'une entreprise au seul chargement de la page.** `migrate()`
  range et complète des champs, il n'ajoute pas de contenu : proposer, compter, afficher une bulle —
  mais l'écriture attend un tap. Deux raisons, l'une de principe et l'autre mesurée : une base est la
  propriété du client, et une écriture silencieuse contourne les pierres tombales (purgées après
  `TOMBE_JOURS`, 90 jours), donc ressuscite ce qu'une équipe avait supprimé exprès.
- **Un `.btn.sm` neuf se rend à 38 px, pas 44.** La refonte impose `min-height:38px` à tout `.btn.sm`
  (vers la ligne 3035) : un sélecteur simple ne bat pas sa spécificité, il faut le co-sélecteur
  `html[data-refonte]`. Toujours mesurer la hauteur réelle au navigateur avant de dire qu'une cible
  respecte le plancher tactile.
- **Une ligne de journal par GESTE, jamais par box.** `db.journal` est plafonné à 500 entrées à chaque
  `save()` et re-tronqué à 500 à chaque fusion : douze box de cent produits effacent tout l'historique
  de l'entreprise en un passage. Compter et nommer les box, ne pas réciter les produits.
- ⛔⛔ **`document.body.innerHTML` CONTIENT LE CODE SOURCE DE LA PAGE.** `app.html` est un
  fichier UNIQUE : son `<script>` vit dans `<body>`. Une sonde qui y cherche un libellé
  (« ▶ Pointer ») le trouve dans la chaîne JavaScript **qui l'écrit**, même quand aucun bouton
  n'est rendu. Mesuré le 21 septembre 2026 : un contrôle « aucun bouton Pointer » tombait à
  rouge sur un écran qui n'en montrait aucun. **Lire `$('content').innerHTML`**, jamais `body`.
  ⚠️ Et son jumeau, pris dans la même heure : **l'application remplace certains émojis par des
  icônes SVG** (classe `rf-ic`). Chercher `⏹ Dépointer` dans le HTML rend FAUX alors que le
  bouton dit bien « Dépointer » — son `⏹` est devenu un `<svg>`. Lire le **`textContent`**.
- ⛔⛔ **UNE DÉCOUPE DE BANC QUI DÉBORDE REND UN VERDICT FAUX — TROIS FOIS EN DEUX JOURS.**
  `corps(nom)` s'arrête à la prochaine `function ` de premier niveau. Mais `ptTickStart` est
  suivie de `views.pointage=function(){`, et `visiblePointages` de `ptPeutVoirAutres` : la
  tranche emportait la suite, et le banc accusait le chrono de redessiner `#content` (ce que
  fait la VUE) puis déclarait gardé un droit qu'il ne lisait pas. Symptôme constant :
  **une mutation ne casse rien alors que le défaut est réel.** Borner sur `function `, `views.`,
  `const `, `let ` — et, pour un bloc CSS, sur `</style>`.
  ⚠️ La vraie parade n'est pas une fenêtre mieux bornée : **exécuter la fonction**. Un droit se
  mesure à ce qu'il LAISSE PASSER, pas au texte qui le nomme.
- ⛔ **UNE ANCRE QUI NE SE TROUVE PAS REND UNE TRANCHE VIDE, ET UNE TRANCHE VIDE PASSE AU
  VERT.** Un motif écrit avec une apostrophe typographique (`l’appareil`) là où le code en porte
  une droite (`l'appareil`) : `indexOf` rend −1, la tranche est vide, et « aucune règle
  n'échappe à la garde » passe sur du néant. **Tout banc qui découpe doit d'abord prouver
  qu'il a trouvé quelque chose** (`vrai('le bloc est trouvé', i0>0)`), et toute sonde qui
  mesure un élément doit prouver qu'il EXISTE : `document.querySelector('.card')||document.body`
  mesurait `<body>` avant connexion, donc « pas de verre » — et le contre-essai passait pour la
  même mauvaise raison.
- ⛔ **LA BÊTA VOIT TOUTES LES CATÉGORIES, PAR CONSTRUCTION.** `planBloque` et `metierBloque`
  rendent `false` quand `BETA_ESSAI` est vrai. Raison mesurée le 21 septembre 2026 :
  « Pointage » avait disparu de la bêta parce qu'il figure dans `PLAN_BLOQUE.gratuit` — une
  catégorie masquée est une catégorie qu'on ne peut plus ÉPROUVER, et la bêta est l'outil de
  travail de l'équipe. En production le drapeau vaut `false` : le forfait continue de décider
  chez un client, c'est ce qui est facturé. `tests/test-749.js` tient les deux sens.
  ⛔ **ET LA CAMPAGNE MOT DE PASSE NON PLUS, DEPUIS LE 22 SEPTEMBRE 2026.** Justin : « peut-être
  pas la mettre pour l'application bêta, que pour l'application publique ; on testera ça sur la
  version publique, on s'ouvrira un compte vu qu'on a ce qu'il faut dans la Tour. » Même raison :
  une porte obligatoire à chaque compte créé coûte un aller-retour à chaque essai.
  ⚠️ **IL Y A DEUX PORTES, ET ELLES SE FERMENT ENSEMBLE** : `secuAFaire` (la fenêtre du mot de
  passe) et `emailRappelModal` (l'adresse, qui se **relance huit fois toutes les 2,5 s**).
  Fermer la première sans la seconde retire la moitié de l'obstacle et garde celle qui insiste
  le plus. En production la campagne reste ENTIÈRE — c'est elle qui a débloqué la journée du
  15 septembre. ⚠️ Effet de bord assumé : `annuaireEtatP` rend 0 pour tout le monde sur la bêta.
  ⚠️ **Et deux bancs EXÉCUTENT la vraie `secuAFaire`** (`test-665`, `test-699`) : ils sont morts
  le jour où elle s'est mise à lire `BETA_ESSAI`, une variable absente de leur bac à sable.
  Toute garde ajoutée à une fonction qu'un banc extrait doit être fournie à ce banc — et tant
  qu'à faire, **jouée dans les deux sens** : c'est le même coût et c'est deux fois la preuve.
- ⛔ **UN COMPTEUR DE PAIE PORTE DEUX HORODATAGES, ET ON LES RÉÉCRIT ENSEMBLE.** Un pointage
  garde `debut`/`fin` en `'HH:MM'` (tout ce qui a été saisi les porte, et la fusion unit par
  enregistrement : un champ qui disparaît est une donnée perdue chez qui n'a pas la nouvelle
  version) **plus** `debutTs`/`finTs` en epoch. Trois conséquences à ne pas casser :
  · c'est l'horodatage qui fait les NUITS — `minutes('23:50','00:20')` rend 0, l'équipe de nuit
    pointait des journées vides ;
  · corriger « 17:00 » en « 16:35 » **sans** réécrire `finTs` ferait afficher 16:35 et compter
    jusqu'à 17:00 : la panne silencieuse type de ce dépôt, une donnée en deux exemplaires dont
    un seul est mis à jour ;
  · un pointage resté ouvert est **plafonné à `PT_MAX_H` et SIGNALÉ**, et se clôture à l'heure
    qu'on dit — pas à l'heure qu'il est, sinon on inscrit 16 h à quelqu'un qui en a fait 8.
  ⚠️ Et le chrono de l'écran s'arrête dès qu'on quitte la vue : une minuterie qui lui survit
  redessine le `#content` d'une autre catégorie — c'est la panne du multitâche, par l'autre bout.
- ⛔ **LA PLATEFORME : CE QU'ON SAIT, ET CE QU'ON NE SAIT PAS.** `opPlatAppliquer()` pose
  `data-plat`, `data-os`, `data-kind`, `data-verre`, `data-nav`, `data-autonome` sur `<html>` ;
  toute la feuille de style s'accroche dessus, et **aucune règle ne s'applique sans attribut**
  (un appareil non reconnu garde exactement le rendu d'avant). Quatre pièges, tous mesurés :
  · **l'ordre de lecture** : Edge contient « Chrome », Chrome contient « Safari ». À l'envers,
    tout le monde est Safari — donc le verre s'allumerait sur un Windows ;
  · **l'iPad se dit « Macintosh »** depuis iPadOS 13 : c'est `maxTouchPoints` qui le trahit ;
  · **la version de macOS ne se lit PAS** (Safari annonce « 10_15_7 » depuis Big Sur, Chrome
    recopie), et **Windows 10 et 11 sont indiscernables** (« NT 10.0 »). On rend `0` — et `0`
    veut dire « on ne sait pas », jamais « vieux ». L'écran des Paramètres l'ÉCRIT ;
  · **le verre se décide sur la version de SAFARI** (Liquid Glass = Safari 26), pas sur l'OS :
    c'est le seul signal vrai. Un doute n'allume rien.
  ⚠️ **On ne dessine JAMAIS de barre d'adresse.** Les maquettes en montrent une parce qu'elles
  sont des IMAGES de l'application dans son navigateur ; la vraie page en aurait deux.
- **Ne jamais piloter `app.html` avec Chrome DevTools MCP** — voir la section suivante
- ⛔ **NE JAMAIS TOUCHER À `SYNC_SECRET_DEFAULT` NI À `SYNC_SALT`** (`app.html`, vers la
  ligne 5059). Ce ne sont pas des noms, malgré les apparences :
  - `SYNC_SECRET_DEFAULT='ELAN-GESTION-7F3A9C2E-cloud-2026'` est **le mot de passe lui-même**,
    celui que PBKDF2 transforme en clé AES-256 pour chiffrer les données de toutes les
    entreprises qui n'ont jamais reçu de clé personnalisée.
  - `SYNC_SALT='RUxBTi1HRVNUSU9OLXNhbHQtdjE='` est le sel — c'est le base64 de
    `ELAN-GESTION-salt-v1`.

  Modifier l'un des deux rend **les données de ces entreprises définitivement illisibles, sur
  tous leurs appareils à la fois.** Le cloud ne stocke que du chiffré : sans la bonne clé
  dérivée, rien n'est récupérable.

  Le sel est doublement traître lors d'un renommage : invisible à une recherche de « elan »
  (donc laissé en place par un remplacement automatique), mais évident pour qui décode le
  base64 (donc « corrigé » par une relecture consciencieuse). **Le piège se referme dans les
  deux sens.** Changer ces valeurs n'est pas un renommage : c'est un déménagement de données
  chiffrées, qui se conçoit, se teste et se publie seul.
- ⛔ **Le semis de démonstration ne charge QUE sur un appareil qui n'appartient à personne.**
  `load()` fait « pas de base → `seed()` », et le drapeau `elan_vierge_v1` ne vide QU'UNE FOIS
  dans la vie de l'appareil. Les deux ensemble sont sûrs tant que « pas de base » veut dire
  « appareil neuf » — **ce qui est faux** : une base disparaît aussi sur un appareil qui a servi
  (écriture refusée faute de place, stockage nettoyé, profil recréé). Constaté chez ELAN le
  11 septembre 2026, capture à l'appui : `DC-2026-001` · « Cuisine — Restaurant Le Gourmet »
  dans « Mes demandes », deux fois. Reproduit au navigateur : 160 produits, 2 box de
  démonstration, 2 devis, 2 factures, 5 fournisseurs entrent dans la base du client, et la
  synchro — une UNION — les répand dans toute l'entreprise ; `uid()` changeant à chaque passage,
  un second rejeu AJOUTE une copie au lieu de la remplacer. La garde est
  `if(neuve && (APPAREIL_DEJA_VU || espaceRattache()))` : **on ne touche pas au drapeau**, on
  resserre la CONDITION du semis. `tests/test-642.js` et les deux sondes du scratchpad tiennent
  les trois cas. ⚠️ **Cette ligne portait un contre-test qui n'existe pas** : « un appareil
  vraiment neuf doit toujours recevoir la démonstration ». Mesuré le 22 septembre 2026, il n'en
  reçoit AUCUNE — `elan_vierge_v1` vide tout au premier chargement, sans condition. `test-642`
  ne garde d'ailleurs que le sens inverse (le semis n'entre jamais chez une entreprise). Le
  semis reste un piège tant qu'il existe, parce que le drapeau ne vide qu'UNE FOIS dans la vie
  de l'appareil : une base perdue plus tard le fait rejouer SANS vidage.
- **Ne pas renommer les clés de stockage `elan_*` à la légère.** `elan_vierge_v1` en
  particulier : si ce drapeau manque, `load()` vide 28 collections d'une base pleine,
  l'enregistre, et la synchro propage le vide à tous les appareils de l'entreprise. Neuf
  autres clés sont construites à la volée (`elan_rappels_`+id, `elan_onboarded_`+id…) — une
  liste fixe les raterait toutes.

  `elan_repli_v1` (ajouté en v575) est du même bois : il gèle, au premier démarrage de cette
  version, le verdict « cet appareil vivait-il déjà sur l'espace de repli ? ». Le perdre ou le
  renommer, c'est faire rejuger la question sur un stockage que l'application a elle-même
  rempli depuis — et donc rattacher à l'espace partagé des appareils qui n'y ont jamais été.

## Chrome DevTools MCP — mesurer pour de vrai, sur la bêta seulement

`.mcp.json` déclare un seul serveur : `chrome-devtools` (lancé par `npx`, avec
`--no-usage-statistics`). Il donne un vrai Chrome piloté — captures, console avec pile
d'appels, réseau, et surtout **trace de performance**. C'est le seul moyen de mesurer ce que
`app.html` coûte réellement : plus de 2 Mo en fichier unique, chargés sur des téléphones de
terrain en 4G. Le skill `performance-budget-monitor` décrit le budget ; sans cet outil,
personne ne pouvait le vérifier.

**Le navigateur doit exister LÀ OÙ TOURNE LA SESSION**, pas sur le Mac de qui la pilote. Une
session distante (Claude Code sur le web ou l'app) tourne dans un conteneur Linux : c'est lui
qui doit avoir un navigateur. D'où `--executablePath /opt/pw-browsers/chromium` dans
`.mcp.json` — un lien symbolique vers le Chromium de l'image, stable d'une version à l'autre.
Sur un Mac où Chrome est installé, remplacer cette ligne par le chemin de Chrome
(`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`) ou retirer les deux lignes :
il est alors trouvé tout seul.

⚠️ **Dans un environnement distant, viser `127.0.0.1`, jamais `teamop.fr`.** Le proxy sortant
coupe les connexions du navigateur (`ERR_CONNECTION_RESET`) ; seul le local passe. On sert donc
le dépôt et on pointe dessus :

```bash
node -e "const h=require('http'),f=require('fs'),p=require('path');h.createServer((q,r)=>{const x=p.join(process.cwd(),q.url.split('?')[0]);f.readFile(x,(e,d)=>e?(r.writeHead(404),r.end()):(r.writeHead(200,{'Content-Type':x.endsWith('.js')?'text/javascript':'text/html;charset=utf-8'}),r.end(d)))}).listen(8123,'127.0.0.1')" &
# puis viser http://127.0.0.1:8123/beta.html
```

C'est même préférable pour concevoir : on juge le fichier qu'on vient de modifier, pas la
version publiée il y a deux heures.

⏱️ **Toujours passer `timeout: 60000` à `new_page`.** Le défaut est de 10 s ; `app.html` et
`beta.html` font 2,6 Mo et ne finissent pas de charger à temps — on obtient sinon
« Navigation timeout of 10000 ms exceeded » alors que tout va bien.

Les trois `--chromeArg` de `.mcp.json` (`--no-sandbox`, `--disable-gpu`,
`--disable-dev-shm-usage`) sont indispensables en conteneur : sans le premier, le navigateur
meurt au lancement (« Target closed »). Chaîne vérifiée de bout en bout le 7 septembre 2026 —
poignée de main MCP, lancement du navigateur, page rendue.

⛔ **Bêta uniquement, sans exception.** Le serveur expose au client MCP **tout** le contenu
de la page ouverte. Sur `app.html` en production, ce sont des noms, des adresses et des
coordonnées de vrais clients — un flux de données qui n'est pas couvert par
`sous-traitance.html`. On ne pointe donc le navigateur piloté que sur `beta.html` ou une
copie d'aperçu : la bêta est isolée par construction (préfixe `elanB_`, espace
`elan-gestion-beta`, jamais de données d'entreprise). Cette règle est écrite aussi dans les
agents `concepteur` et `testeur`.

⛔ **Mais ces deux agents ne PEUVENT pas s'en servir, et il faut le savoir avant d'essayer.**
Un sous-agent dont le frontmatter porte une liste `tools:` explicite n'atteint AUCUN outil MCP.
Éprouvé le 8 septembre 2026, quatre essais, tous concluants dans le même sens :

| ce qu'on déclare dans `tools:` | ce que l'agent voit |
|---|---|
| `mcp__chrome-devtools__*` | rien |
| les 13 outils nommés un par un | rien |
| les 13 outils **plus** `ToolSearch` | rien — `ToolSearch` lui-même est retiré |
| `tools: *` (agent `general-purpose`) | **tout** : schéma chargé, `list_pages` répond |

Le mécanisme : les outils MCP arrivent *différés* — nommés, mais sans schéma — et il faut
`ToolSearch` pour le charger. Une liste `tools:` explicite retire `ToolSearch`, donc ferme la
porte, même quand les outils MCP y sont écrits noir sur blanc. Rien n'avertit : la ligne est
acceptée, les entrées sont simplement ignorées.

Conséquence pratique : **le navigateur piloté ne se conduit que depuis la session principale**
(ou un agent à `tools: *`, ce qu'on ne veut pas pour `concepteur` ni `testeur` — leur liste
restreinte est délibérée). Les deux agents mesurent donc avec Playwright par `Bash`, ce que
`testeur` fait déjà. Pour une vraie trace de performance, c'est la session principale qui la
prend.

## Attention : deux copies de travail

Ce dépôt est cloné deux fois sur cette machine :

- `~/Documents/GitHub/teamop` — branche `main`, **le code de production**
  (le dépôt s'appelait `elangestion.github.io` jusqu'au 7 septembre 2026 ; le dossier local
  peut encore porter l'ancien nom sans que ça gêne)
- `~/TeamOP` — branche `audit/plan-action`, **625 commits de retard**

Son `server/index.js` fait 308 lignes contre 1 300 ici. Toute correction du serveur
va dans cette copie-ci. Vérifier la branche avant d'écrire quoi que ce soit.

## Devis

`devisPdfStr()` dans `app.html` produit un vrai fichier PDF, sans bibliothèque —
même fabrique que `bonPdfStr()` pour les bons de commande. L'en-tête vient de la
société choisie sur le devis : `bcEntete()` pour le nom, `bcCouleur()` pour la
couleur, `socStyle().logo` pour le logo, converti en JPEG par un canvas parce que
le PDF ne lit pas le PNG.

Le générateur `devisIAModal()` enchaîne : dictée au micro → génération → aperçu du
PDF → client (choisi ou saisi) → envoi par `envoiDoc()`. Le moteur dépend de
l'offre de l'entreprise, décidée côté serveur : Haiku inclus, Sonnet en supplément,
ou les deux au choix de l'utilisateur.

## ⛔ RÈGLE DE TRAVAIL — tout le développement sur la BÊTA

Posée par Justin le 11 septembre 2026, après une matinée où deux défauts sont remontés d'ELAN :
**« tout le développement sur la bêta. Il ne faut pas que ça impacte ELAN, sinon ça va être
compliqué. »** Ce n'est pas une préférence de confort : ELAN est une entreprise qui travaille,
et une publication ratée se paie en journée de terrain perdue.

Concrètement, et dans cet ordre :
1. **Ce qui casse chez un client se corrige tout de suite**, en production — c'est la seule
   exception, et elle se limite au correctif, jamais à ce qui traîne autour.
2. **Tout le reste s'écrit, se mesure et se valide sur `beta.html`** (ou un aperçu), et n'atteint
   `app.html` qu'une fois éprouvé.
3. **Avant toute publication : qu'est-ce que ça change pour ELAN ?** Si la réponse n'est pas
   « rien » ou « ça répare quelque chose chez eux », ça attend.

Corollaire déjà éprouvé : un correctif arrête une cause, **il ne range pas derrière lui**. Ce qui
est déjà entré dans la base d'un client y reste jusqu'à un geste — le dire en même temps que le
correctif, sinon le chantier paraît clos alors qu'il attend quelqu'un.

### ⛔ DURCIE LE 11 SEPTEMBRE 2026 AU SOIR — LA PUBLICATION N'EST PLUS UNE DÉCISION D'AGENT

Après une journée à NEUF versions publiées en production chez un client qui travaillait
(v657 → v665), Justin a tranché : **« je veux que maintenant qu'on va travailler sur des mises à
jour de l'application ou du développement, que ça travaille QUE sur la bêta. On publiera pour
tout le monde que quand JE voudrai publier. Je veux tester avant, pour pas refaire les erreurs,
que ce soit pas stable. »**

La règle, sans interprétation possible :

1. **Tout va sur `beta.html`. Rien ne va sur `app.html`.** Une fonctionnalité, une refonte, une
   amélioration, un rangement, une idée : bêta. On ne demande même pas.
2. **`app.html` ne se publie que sur une PHRASE DE JUSTIN qui le demande explicitement**, pour
   ce changement-là. Pas « il a dit oui hier », pas « il a validé le principe », pas « c'est
   évidemment ce qu'il veut ». Il dit publier, on publie. Sinon on attend, même si c'est prêt,
   même si c'est mieux, même si ça traîne depuis trois jours.
3. **UNE SEULE exception, et elle est étroite** : ce qui CASSE chez un client en production se
   corrige tout de suite. « Casse » veut dire : quelqu'un ne peut pas travailler. Pas
   « c'est moche », pas « ce serait mieux », pas « tant qu'on y est ». Et le correctif se limite
   au défaut — rien d'autre ne voyage avec lui.
4. **Le doute tranche vers la bêta.** Si on hésite à classer un changement en (3), c'est qu'il
   n'en est pas.

⚠️ **Ce qui a motivé la règle, et qu'il faut se rappeler avant de la contourner** : les neuf
versions du 11 septembre étaient toutes justes, toutes testées, toutes mesurées sur la base réelle
du client. Ça n'a rien empêché. **Deux d'entre elles reposaient sur une hypothèse jamais vérifiée**
(la taille du document Firestore), **une a été corrigée une heure après publication** par l'agent
`gardien` (la suppression en lot déduisait « jamais connecté » d'un journal plafonné), et une
autre a dû être retirée de la publication après mesure (l'annuaire : les comptes d'ELAN avaient
tous un mot de passe, le correctif ne réparait rien chez eux). Un agent qui publie vite publie
aussi ses erreurs vite. Le client, lui, les reçoit toutes.

**Ce que ça change concrètement dans le rituel** : on monte `APP_VERSION` et le cache du service
worker comme avant, on régénère `beta.html`, on fait passer les suites — et **on s'arrête là**.
Le report sur `main` de `app.html`/`sw.js` attend sa phrase. La bêta, elle, se publie librement :
c'est son rôle.

### ⛔ LES APPAREILS D'ABORD, LA PORTE ENSUITE — APPLIQUÉ AUX PHOTOS (19 septembre 2026)

La règle existait déjà pour la clé Firestore. Personne ne l'avait appliquée aux **pièces
jointes**, et c'est un bloquant de publication mesuré.

Depuis l'étape 0, une photo ne vit plus dans le document d'équipe : `syncSortirPieces` y
laisse le seul marqueur `piece:<64 hexa>`, le contenu part sur le VPS, et `photoSrc()` le
retrouve. **`photoSrc()` n'existe pas avant la v702.**

Un appareil resté en version antérieure met donc la chaîne `piece:aaa…` telle quelle dans un
`<img src>` — et `printRapport()` la met **dans le PDF que ce technicien envoie au client**.
Mesuré sur une copie d'aperçu de la v695 : `pdfContientPiece = true`, et la ligne du document
affiche « 0 Ko ». Le client ne reçoit pas un rapport incomplet : il reçoit un rapport cassé,
envoyé par quelqu'un qui croyait bien faire.

⛔ **L'ORDRE, sans exception :**

1. publier `app.html` et `sw.js` ;
2. **attendre que la Tour ne montre plus AUCUN appareil sous la nouvelle version** (écran
   Connexions) ;
3. **seulement alors** poser `teamop_config/version.min` à cette version, dans Firestore
   **et** côté API — les deux, pas l'un des deux ;
4. et tant que (2) n'est pas vrai, **ne pas prendre de photo depuis un appareil à jour** sur
   une entreprise dont le parc est mélangé.

⚠️ Le point qui coûte est le (2) : c'est une ATTENTE, et une attente se saute. La v702 a été
prête le 19 septembre au matin ; publier `app.html` le jour même sans exiger la version
aurait envoyé des PDF cassés à des clients d'ELAN dans la journée.

⚠️ Corollaire pour toute fonctionnalité future qui ALLÈGE un enregistrement synchronisé : se
demander d'abord **ce qu'en fait la version d'AVANT**. Un allègement n'est jamais neutre pour
un parc mélangé — et un parc est toujours mélangé pendant quelques jours.

### ⛔ REDURCIE LE 15 SEPTEMBRE 2026 AU SOIR — RIEN NE PART SANS ÊTRE ÉPROUVÉ

Justin, après une soirée à trois publications (v690, v691, serveur+Tour) : **« avant d'envoyer
quoi que ce soit en mise à jour, je veux que tu vérifies que tu testes. Et chaque chose que tu
vas faire maintenant, je veux que ça soit vérifié et testé avant que ça soit envoyé en mise à
jour. Et le développement maintenant va se concentrer pour OP GESTION sur la bêta avant de
publier au public. »**

Deux exigences, et la première est un GESTE, pas une intention :

1. **Rien ne part sans preuve.** Avant tout push qui atteint un client, dans cet ordre :
   - la suite complète passe (`for f in tests/test-*.js; do node "$f"; done`) — et un banc qui
     ne couvre pas le changement ne compte pas : on en écrit un ;
   - le contrôle de syntaxe (`node scripts/verifier-syntaxe.js`) ;
   - **le comportement est MESURÉ au navigateur** quand le changement se voit ou s'exécute
     (sonde du scratchpad sur `beta.html`) — pas relu, mesuré ;
   - le fichier RÉELLEMENT SERVI est vérifié après coup (`curl teamop.fr/... | grep APP_VERSION`).
   ⛔ Et on le DIT dans la réponse, avec les chiffres. « C'est testé » sans chiffre n'est pas
   une vérification, c'est une affirmation.

2. **OP GESTION se développe sur la bêta.** `app.html` et `sw.js` ne rejoignent `main` que sur
   une phrase de Justin pour CE changement-là. La bêta, elle, se publie librement : c'est son
   rôle, et c'est là qu'il regarde.

⛔ **ET `server/` EST UNE PUBLICATION AUSSI** — la leçon du même jour, qui a coûté une journée de
croyance fausse : `.github/workflows/deploiement.yml` déploie le VPS à **tout push sur `main`
touchant `server/**`**. Un commit ne peut donc pas être « prêt, non déployé » s'il est sur
`main` ; retenir du serveur veut dire ne pas le pousser du tout. Les mêmes preuves sont donc
exigées avant un push serveur qu'avant une version d'application.

✅ **DEPUIS LE 19 SEPTEMBRE 2026 AU SOIR, LE VPS ATTEND LES BANCS.** `deploiement.yml` porte un
job `bancs` et le job qui parle au VPS le déclare en `needs`. Avant ça, le job « tests » vivait
dans `ci.yml` — un workflow SÉPARÉ, et GitHub Actions n'a pas de `needs` entre workflows : sur
la même poussée, les deux partaient en parallèle et **le déploiement finissait 50 à
100 secondes AVANT les bancs**. Le serveur atteignait les clients pendant que les tests
tournaient, et leur échec ne rattrapait rien.
⚠️ La porte est **dans le workflow qui déploie**, pas ailleurs : elle ne peut pas se faire
contourner par une modification de `ci.yml`. `tests/test-728.js` lit la DÉPENDANCE entre jobs,
pas l'intention — retirer le `needs` fait tomber le banc. **Cela ne remplace pas la règle
ci-dessus** : les bancs verts autorisent le déploiement, ils ne décident pas de le faire.

## La bêta : un outil de développement, jamais un canal public

`beta.html` n'est **pas** une version d'essai pour les clients et ne le sera jamais. C'est
l'outil de l'équipe qui développe : Justin et les personnes qui travaillent avec lui.
Il n'y aura pas de « bêta publique » — ce mot désigne ici un canal interne.

- **L'accès se gère uniquement depuis la Tour de contrôle** (onglet Accès bêta, réservé au
  patron) : ouvrir, couper, rouvrir, supprimer. Le serveur porte ces accès
  (`beta-comptes.json`), la page n'a aucun compte de départ, un accès coupé ne passe plus
  même sur un appareil resté connecté.
- **Chaque accès dit qui travaille sur quoi** : la personne, et le chantier qu'elle teste
  (écran, fonctionnalité, version). Fait le 8 septembre 2026 — champ `chantier` à la création,
  réécrivable par `POST /api/monitor/beta/chantier` (`monPatronStrict`), affiché sur la ligne.
  Un accès sans chantier renseigné le dit en ambre plutôt que de se taire : un accès dont on
  ne sait plus à quoi il servait est un accès qu'on n'ose plus couper.
- **Jamais de données d'entreprise** : espace `elan-gestion-beta`, préfixe `elanB_`. Un accès
  bêta n'ouvre que la bêta.
- **L'onglet s'appelle « Accès » et porte DEUX portes, à ne jamais confondre** : la bêta
  (`beta.html`, comptes portés par le serveur, n'ouvre que la bêta) et la version publique
  (`app.html`, crée un vrai espace d'entreprise avec de vraies données qui se synchronisent).
  La seconde carte réemploie `tourEspaceDe()`, le même chemin exactement que « Lien de
  connexion » sur la fiche d'un client — pas de seconde route serveur à maintenir. L'adresse
  e-mail sert de clé : la réutiliser rouvre le même espace, elle ne le remplace pas.
- Sur `teamop.fr/beta.html`, le champ **Entreprise reste vide** : identifiant et mot de passe
  donnés par la Tour, rien d'autre. Y taper un nom envoie la page chercher une entreprise.

## Refonte et aperçu (septembre 2026)

La refonte design/mouvement se fait sur la branche `refonte/design`. **Rien ne remplace
une page utilisée par les clients sans que Justin l'ait testée.** Le canal de test :

```bash
bash scripts/apercu.sh tour.html app.html   # copies sous apercu/, base href, ruban, sans service worker
node scripts/verifier-theme.js tour.html    # syntaxe du JS embarqué, variables fantômes, contrastes
```

`apercu/` se commite **seul sur `main`** (nouveaux fichiers, aucun point d'entrée client
ne change) et se teste sur `https://teamop.fr/apercu/…` — même origine, donc l'API
(CORS limité à teamop.fr) et la session fonctionnent. `apercu/app.html` passe par
`beta-build.js` : données `elanB_`, espace de synchro bêta. Le serveur (`server/`)
reste sur la branche jusqu'à validation : un push sur `main` le déploie.

Marque, à ne plus confondre : **carré bleu nuit « TEAM / OP » = TEAM OP** (`icons/teamop-*`,
site, mails) ; **carré vert « GESTION / OP » = OP GESTION** (`icons/opgestion-*`, `icon-*`,
manifeste de l'app). La pastille verte « OP » de la Tour n'est qu'un repère d'en-tête.

## Pièges rencontrés — à ne pas refaire

- **Ne jamais figer les données d'un client dans le code.** `REPORT_TEMPLATES`
  portait les ~90 agences d'un seul client et les servait à tous les autres.
  Vidée le 5 septembre 2026.
- **Deux routes de même chemin : la première enregistrée gagne.** `/api/devis/etat`
  était déclarée dans `agent-devis.js` (monté ligne 232) et dans `index.js`
  (ligne 2842) ; la seconde, plus riche, n'a jamais répondu. Panne silencieuse.
- **Vérifier qu'un registre est peuplé avant de bâtir dessus.** `espacesReg` n'est
  alimenté que par une inscription manuelle ; `cnxData` se remplit tout seul à
  chaque connexion. C'est le second qui sert de source de vérité.
- **Le champ de configuration s'appelle `anthropic.cleApi`**, pas `apiKey`.
- **Ne jamais attendre une tâche de fond avec une boucle `until … done`.** Le harnais
  réveille tout seul quand une tâche se termine ; la boucle n'apporte rien et fuit. Le
  7 septembre 2026, six boucles attendaient des conditions devenues impossibles — l'une
  guettait un motif jamais écrit dans un journal, deux surveillaient des fichiers de sortie
  périmés, trois attendaient un fichier `.jamais` que personne ne crée. Jusqu'à 3 h 51
  d'attente pour des résultats déjà reçus.
- ⛔⛔ **UN CORRECTIF LANCÉ EN ARRIÈRE-PLAN AVALE SA PROPRE SORTIE — ET ON CROIT L'AVOIR
  APPLIQUÉ.** Le 22 septembre 2026, deux correctifs de sonde ont été écrits dans une commande
  mise en arrière-plan : leur `print('patch écrit')` n'a jamais été lu, une assertion échouait
  en silence, et l'audit qui suivait dans la MÊME commande tournait sur le fichier d'origine.
  Deux passes complètes (deux fois vingt minutes) ont rendu des chiffres identiques au tour
  précédent — c'est ce qui a fini par trahir la chose. **Un patch se lance au PREMIER PLAN, et
  on relit le fichier (`grep -c` sur un motif du nouveau code) avant de s'en servir.** Le signe
  qui ne trompe pas : deux exécutions censées différer rendent exactement le même total.
  ⚠️ Corollaire : ne jamais enchaîner « je modifie » et « je mesure » dans une seule commande
  de fond — la mesure part que le patch ait réussi ou non.
- ⛔ **ET UNE TRANCHE DE REMPLACEMENT PEUT AVALER CE QU'ON COMPTAIT MODIFIER APRÈS.** Dans le
  même fichier, `p[:d] + neuf + p[fin:]` a supprimé un bloc `const cibles` qui vivait ENTRE les
  deux ancres, et le `replace` censé le réécrire n'a plus rien trouvé. On vérifie donc ce que la
  tranche contient (`assert 'const cibles' in p[d:fin]`) avant de la remplacer.
- **Une commande qui dépasse son délai et bascule en arrière-plan reçoit un NOUVEL
  identifiant.** Sa sortie va dans le nouveau fichier ; l'ancien reste figé sur une capture
  partielle. Surveiller l'ancien, c'est attendre pour toujours.
- **`pkill -f <motif>` se tue lui-même** quand le motif figure dans sa propre ligne de
  commande — le reste de la ligne n'est jamais exécuté (code 144). Passer par le PID.
- **Si le serveur MCP `chrome-devtools` ne répond pas au démarrage d'une session, le navigateur
  reste mesurable** : le Chromium de l'image est là (`/opt/pw-browsers/chromium`, testé en
  141.0.7390.37) et Node 22 a un `WebSocket` intégré. On le lance avec
  `--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --remote-debugging-port=<p>`,
  on ouvre une cible par `PUT /json/new?<url>`, et on parle CDP (`Runtime.evaluate` avec
  `awaitPromise:true, returnByValue:true`). Une quarantaine de lignes, aucune dépendance —
  Playwright n'est PAS installé dans cette image, seulement ses navigateurs. Les mêmes règles
  s'appliquent : **bêta uniquement, 127.0.0.1 uniquement.**
- **`FOURNISSEURS_ELAN` (renommée `FOURNISSEURS_3D` le 10 septembre 2026, v621 — le nom mentait) N'EST PAS la faute de `REPORT_TEMPLATES`** — cette
  fiche l'a affirmé du 8 septembre 2026 au matin, à tort, et la phrase a suffi à lancer une
  suppression. Vérifié champ par champ avant de toucher : les cinq entrées (ARMOSA, ENSYSTEX,
  SODIF, MABI, ORCAD) sont les fournisseurs **du métier de la 3D**, entreprises publiques,
  contact nominatif vide partout, adresses génériques (`info-3d@`, `contact@`), notes reprises
  de leurs sites. Aucune donnée propre à ELAN. C'est un pack métier offert au démarrage —
  `REPORT_TEMPLATES` portait les 90 agences d'un client, des données d'exploitation privées.
  Rien à voir.

  Le nom mentait (corrigé en v621). ✅ **Et « le pack part chez TOUTES les entreprises » est
  devenu FAUX sans que cette page le sache** — mesuré au navigateur le 22 septembre 2026, un
  appareil neuf reçoit **0 produit et 0 fournisseur**, avec ou sans métier réglé :
  `PACK_METIER_AUTO` vaut `false` et ferme les trois portes automatiques.

  **La leçon, plus large que ce cas :** un nom n'est pas un contenu. Ouvrir les données avant
  de croire l'étiquette — y compris celle écrite dans ce fichier.
- ⛔⛔ **UN ZÉRO MESURÉ NE PROUVE RIEN TANT QU'ON N'A PAS OUVERT LA PORTE — LA CONTRE-ÉPREUVE
  EST LA MESURE, PAS SON SUPPLÉMENT.** Le 22 septembre 2026, ce `0 produit · 0 fournisseur`
  pouvait vouloir dire « l'aiguillage est bon » comme « la sonde ne regarde rien ». Copie mutée
  avec `PACK_METIER_AUTO=true`, métier « nettoyage », pack du métier à 0 et 0 : **0 produit et
  5 fournisseurs anti-nuisibles arrivaient quand même**. `cataloguePoser` avait été rebranché
  sur `metierPackDe` le 8 septembre ; les deux autres portes lisaient `FOURNISSEURS_3D` en
  direct, et le commentaire de l'une promettait pourtant « la même règle que les deux autres ».
  Inerte tant que le drapeau est fermé — mais ce drapeau existe pour être rebasculé, son propre
  commentaire le dit. **Un défaut derrière un interrupteur est un défaut ; le banc doit jouer
  l'interrupteur OUVERT, sinon il garde le drapeau et pas l'aiguillage** (`test-635`, v716).
- ⚠️ **UN APPAREIL VRAIMENT NEUF NE REÇOIT AUCUNE DÉMONSTRATION — cette page disait le
  contraire.** `seed()` construit bien 160 produits, 5 fournisseurs, 2 box, 2 devis et 2
  factures, et le drapeau `elan_vierge_v1` les efface **tous**, sans condition, au premier
  chargement de l'appareil. Seul le compte de connexion survit. Une entreprise qui découvre
  OP GESTION ouvre donc une application **entièrement vide**. C'est peut-être ce qui est voulu —
  c'est une décision de produit, pas une correction à faire tout seul. Voir `REPRISE.md`.

## Modèle et effort par agent

Rien ne choisit le modèle tout seul : Claude Code ne regarde pas la difficulté d'une
tâche pour décider. Sans réglage, **chaque sous-agent hérite du modèle de la session** —
c'est-à-dire Opus sur tout, y compris pour lire trois versions avec `curl`.

Le choix est donc écrit, agent par agent, dans le frontmatter de `.claude/agents/*.md` :

| Agent | Modèle | Effort | Pourquoi |
|---|---|---|---|
| `verificateur` | `haiku` | `low` | Constate, ne décide pas : syntaxe, versions servies, `/health` |
| `testeur` | `sonnet` | `medium` | Écrit du Playwright et lit des échecs — du raisonnement, pas le plus cher |
| `deployeur` | `sonnet` | `high` | Le rituel est écrit (skill `publication`), mais une erreur se paie en clients |
| `concepteur` | `opus` | `high` | Refonte visuelle et mouvement : un jugement de goût, pas un contrôle mécanique |
| `gardien` | `opus` | `high` | Penser comme un attaquant se juge aussi. Une route qui fuit ne plante pas — le coût se compare à celui d'une fuite |
| `relecteur` | `sonnet` | `high` | Applique des critères écrits à un diff : systématique, pas créatif. Mais il passe après chaque changement, donc son coût unitaire compte |

Les deux derniers comblent ce que la CI ne fait pas : elle ne vérifie que les secrets commités
et les failles des dépendances — **pas même la syntaxe**, et personne ne relisait ce qu'une
route renvoie. `gardien` relit `server/` (80 routes exposées sur Internet, données de clients
réels) ; `relecteur` relit le diff avant qu'il parte sur `main`, qui est servi aux clients en
quelques minutes.

### ⛔ ET LA MÊME RÈGLE VAUT POUR LES AGENTS D'UN WORKFLOW — posée le 15 septembre 2026 au soir

Un agent lancé par l'outil Workflow **hérite du modèle de la session** si on ne lui dit rien.
Trois chantiers lancés le même soir l'ont appris à leurs dépens : **plus de 5 millions de
jetons, tous en Opus**, dont la moitié pour de la LECTURE — recenser des écrans, lire un
workflow, compter des occurrences dans un fichier. Justin l'a vu passer et a tranché :
« pour la vérification, tu es obligé d'utiliser Opus si y en a besoin ; si y a pas besoin,
prends un truc plus léger pour pas que ça mange toutes les ressources. »

La règle est la même que pour les sous-agents nommés, et elle tient en une phrase :
**Opus là où le JUGEMENT est le produit ; Sonnet ou Haiku là où la RIGUEUR suffit.**

| ce que fait l'agent | modèle | effort | pourquoi |
|---|---|---|---|
| recenser, cartographier, lire un fichier et en rendre la structure | `sonnet` | `medium` | il constate ; une erreur se voit au premier contrôle |
| vérifier une affirmation mécanique (ce motif est-il là ? ce fichier contient-il X ?) | `haiku` | `low` | c'est un `grep` qui rédige |
| attaquer une proposition, chercher la faille | `sonnet` | `high` | systématique plus que créatif — mais il faut de la profondeur |
| concevoir une architecture, trancher entre deux options, synthétiser | `opus` | `high` | c'est un jugement, et il se paie une fois |
| sécurité et conformité | `opus` | `high` | penser comme un attaquant se juge ; le coût se compare à celui d'une fuite |

Concrètement, dans un script de workflow : `agent(prompt, {model:'sonnet', effort:'medium'})`.
**Ne jamais omettre `model` sur une phase de lecture** — l'omission coûte cher et ne se voit
qu'après coup, sur la facture.

⚠️ Corollaire à connaître AVANT de vouloir « corriger » un workflow déjà lancé : changer le
modèle change les options de l'agent, donc invalide le cache de reprise. Relancer moins cher un
chantier en cours coûte PLUS que de le laisser finir. On règle le modèle à l'écriture, pas en
cours de route.

Tout autre sous-agent (recherche, revue de code, exploration) retombe sur
`CLAUDE_CODE_SUBAGENT_MODEL` dans `.claude/settings.json` — Sonnet. La session
principale, elle, garde le modèle choisi dans le terminal : ce fichier ne la touche pas.

Ordre de priorité, du plus fort au plus faible : `CLAUDE_CODE_EFFORT_LEVEL` (variable
d'environnement) → frontmatter de l'agent → réglage de session.

`bashOutputMaxChars` plafonne ce qu'une commande renvoie au modèle. Une trace
Playwright en échec fait des dizaines de milliers de caractères, tous facturés.
