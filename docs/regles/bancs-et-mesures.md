# Les bancs et les mesures — méthode et pièges

> Déplacé tel quel de `CLAUDE.md` le 18 novembre 2026 (allègement : chaque session et chaque agent relit `CLAUDE.md` d'office). Rien n'a été réécrit. 

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
bash scripts/bancs-ci.sh        # 203 suites · 11 948 vérifications (mesuré en local le 30/09/2026, branche 9f23d0b)
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

⛔ **UN FACTEUR SMTP DE BANC RETIRE LE POINT DOUBLÉ (RFC 5321 §4.5.2), SINON IL ACCUSE LE SERVEUR.** Une ligne de
courriel qui commence par « . » voyage « .. » ; le quoted-printable replie les lignes longues, donc n'importe quel
mot peut se retrouver en tête de ligne. Pris le 27 septembre 2026 : `test-832` lisait « set-admin..sh » dans l'avis
de suppression, sur une partie seulement des messages — le défaut était dans le facteur. Le facteur de `test-813`
(et de tout banc qui le recopie) ne le fait pas encore : à corriger le jour où il lira un texte long.

⛔ **UN BANC QUI ATTEND UN COURRIEL VISE LE LIEN DE SON GESTE, JAMAIS DEUX MOTS.** Pris le 29 septembre 2026 : `test-831`
attendait « mot de passe oublié » en cherchant l'adresse et « reinit.html » — le courriel de CONFIRMATION de l'inscription,
parti derrière la réponse juste avant, porte les deux. Détourner le vrai courriel vers une autre adresse ne faisait rien
tomber. On vise le lien du geste (`mode=resetPassword`), lu dans l'en-tête `To` et le corps DÉCODÉ (quoted-printable :
« = » y devient « =3D »), et un échec nomme chaque courriel reçu — destinataire et sujet, jamais le corps.

⛔ **UNE COURSE DE BANC SE JOUE AU GESTE, JAMAIS AU CHRONOMÈTRE — ET LA CI A LE VRAI RÉSEAU.** Pris le 29 septembre 2026
(run 518 de « Vérification des pages », sur `main`) : `test-844` pariait qu'une suppression de la Tour tiendrait dans
les 3 s d'un Stripe « lent ». Ici elle rendait à 3,03 s pour une fenêtre fermée à 3,24 s — 0,2 s de marge que rien ne
montrait ; sur GitHub, derrière. Le faux Stripe RETIENT désormais la lecture visée (reconnue à sa pile d'appels) jusqu'à
ce que le banc la relâche. Deux leçons : **la marge d'une fenêtre se mesure avant de parier dessus** (un vert ne dit pas
de combien il passe) ; et une route qui appelle Google (la suppression d'une entreprise : jeton anonyme, effacement
Firestore) y part VRAIMENT, depuis la CI comme d'ici — un banc qui la joue dépend du réseau tant qu'il ne remplace pas
ce `fetch`.

⛔ **UNE APOSTROPHE DANS LE MOT DE `${var:?mot}` CASSE LE PARSE DU SCRIPT ENTIER.** Bash
re-interprète les quotes à l'intérieur du mot, **même entre guillemets doubles** :
`"${1:?le SHA n'a pas été transmis}"` ouvre une simple quote qui ne se referme jamais, et le
fichier ne se parse plus du tout (`unexpected EOF while looking for matching '"'`, code 2,
aucune commande exécutée). ⚠️ Le message d'erreur ne nomme ni la variable ni la ligne fautive :
il pointe la fin du fichier. `tests/test-728.js` refuse désormais toute quote dans le mot d'un
`${var:?…}` des workflows, et passe à `bash -n` le corps de chaque heredoc destiné à un shell.

⛔ **POUR UNE MISE EN PAGE, `tests/test-830.js` REJOUE LA CASCADE CSS** (toutes les feuilles, média, spécificité, ordre,
!important, raccourcis) pour un élément décrit par ses classes et ses ancêtres : il garde ce qu'une règle GAGNE, pas son
texte — c'est ce qui voit « une moitié de règle survit à l'autre ». Le réutiliser plutôt qu'écrire un motif sur une déclaration.

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

