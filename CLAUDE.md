# TeamOP

Suite logicielle pour entreprises de terrain — nettoyage, lutte anti-nuisibles.
Applications : OP GESTION (interventions, clients, devis) et OP MESSAGES (messagerie).
Vendu par abonnement, clients réels, données réelles. **Ce dépôt est en production.**

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

**93 suites dans `tests/`**, sans dépendance ni installation (recompté le 20 septembre 2026 —
ce nombre vieillit vite, le relire plutôt que le croire). La plupart extraient les fonctions
réelles d'`app.html` et les exécutent : elles testent donc le fichier livré.

Quatre familles visent `server/`, et elles ne se remplacent pas :

| | ce qu'elle monte | ce qu'elle peut voir |
|---|---|---|
| `test-716`, `test-722`, `test-723`, `test-725` | un MODULE, dépendances injectées | la logique d'une pièce |
| `test-641`, `test-724` | le VRAI serveur, isolé, parlé en HTTP | ce qu'une route répond |
| `test-726` | l'ASSEMBLAGE complet, coffre S3 compris | que les pièces du SERVEUR sont branchées |
| `test-735` | les fonctions RÉELLES d'`app.html` **plus** le vrai serveur | que l'APPAREIL et le SERVEUR se parlent |

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
bash scripts/bancs-ci.sh        # 93 suites · 3 791 vérifications (mesuré le 20/09/2026 au soir)
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
  resserre la CONDITION du semis. ⚠️ Le contre-test compte autant — un appareil vraiment neuf
  doit toujours recevoir la démonstration, sinon personne ne peut plus découvrir l'application.
  `tests/test-642.js` et les deux sondes du scratchpad tiennent les trois cas.
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

  Ce qui reste vrai, et qui est du rangement, pas une fuite : **le nom ment**, et c'est lui qui
  a induit l'erreur ; et le pack part chez TOUTES les entreprises, y compris celles de
  nettoyage, qui n'ont que faire de fournisseurs de produits nuisibles. À traiter à la
  prochaine publication d'`app.html`, pas en urgence.

  **La leçon, plus large que ce cas :** un nom n'est pas un contenu. Ouvrir les données avant
  de croire l'étiquette — y compris celle écrite dans ce fichier.

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
