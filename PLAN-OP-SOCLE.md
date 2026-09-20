<!-- Établi le 15 septembre 2026 par trois architectures indépendantes, chacune attaquée par
     deux critiques (perte de données ; sécurité et conformité), puis fusionnées — et enfin
     relue par une critique de complétude, dont le rapport est en annexe.
     ⛔ CE DOCUMENT N'A PAS ÉTÉ PRIS POUR ARGENT COMPTANT. Ses quatre affirmations porteuses
     ont été revérifiées à la main avant d'être versées ici :
       · `node:sqlite` charge sans drapeau           → vrai, Node v22.22.2, avec un
                                                        ExperimentalWarning
       · aucun createCipheriv/createDecipheriv/zlib
         dans server/*.js                            → vrai, 0 occurrence dans les 5 fichiers
       · espaceCleOk() décode la clé en clair        → vrai, server/index.js:2265
       · la bêta est refusée par sauvRefus           → vrai, ESPACES_INTOUCHABLES
                                                        (server/index.js:4797) + sauvRefus
                                                        (server/index.js:2585)
     Le dernier point est une faille BLOQUANTE du plan lui-même, trouvée par la critique de
     complétude : sans décision écrite sur l'authentification de la bêta, les étapes 2, 3 et 5
     s'arrêtent le premier jour. -->

# OP SOCLE — sortir du document unique, et confier les données au serveur

**Plan d'exécution.** Ce fichier remplace la partie « comment » de `CHANTIER-SORTIR-DU-DOCUMENT-UNIQUE.md`, qui reste valable pour le « pourquoi » et les chiffres du coût actuel. Écrit le 15 septembre 2026, après trois architectures indépendantes et six critiques. Toutes les failles bloquantes relevées ont une réponse écrite ; la table de traçabilité est en §9.

État du dépôt au moment de la rédaction, mesuré et non recopié : `app.html` et `beta.html` font 32 371 lignes, `APP_VERSION = '693'` (`app.html:4915`), `server/index.js` fait 6 891 lignes, `tests/` compte **63 suites** (le chiffre de `CLAUDE.md` — quinze — a vieilli ; le corriger fait partie de l'étape 0).

---

## 1. La décision, et sa raison

Justin, 15 septembre 2026 au soir : *« Je paye un putain de serveur tous les mois. Alors, mets tout sur ce putain de serveur. »* (`CHANTIER-SORTIR-DU-DOCUMENT-UNIQUE.md:3-4`), et l'ajout qui change tout : **le serveur doit pouvoir LIRE les données**, chiffrées au repos avec une clé détenue par TeamOP, pour diagnostiquer vite quand un client a un problème.

C'est un changement de posture assumé. Il ne se rediscute pas ici. Ce qui se conçoit ici, c'est comment le faire sans casser une entreprise qui travaille.

**Ce qui justifie le chantier n'est pas le coût de Firebase** (~0,50 €/mois, `CHANTIER:24`). C'est ce que le document unique a coûté en pannes : `_fbDoc.set()` sans merge (`app.html:7181` → l'écriture en fin de `syncPush`) **remplace le document ENTIER**. Toute la mécanique anti-écrasement de l'application — `_syncTs`, `syncManque` (`app.html:7504`), `syncAlleger` (`app.html:7059`), `_dbGen` (`app.html:5457`), la garde `boxFusionFine` (`app.html:6095`) — n'existe que pour compenser ce remplacement global. Le passage à la ligne fait disparaître la classe entière.

**Un fait qui inverse la prémisse, et qu'il faut dire tel quel avant d'écrire une ligne de contrat :** « le serveur ne peut RIEN lire » est déjà faux au sens de la capacité. La clé AES de chaque entreprise de l'annuaire dort **en clair** dans `espaces.json` — `espaceCleOk()` la décode à `server/index.js:2267`, `cleEquipeVerdict()` à `server/index.js:3161`. Vérifié par grep : il n'y a **aucun** `createCipheriv`, `createDecipheriv` ni `zlib` dans `server/*.js`. Ce qui manquait n'était pas la clé, c'étaient vingt lignes de code. La séparation était **organisationnelle** (clé sur le VPS, chiffré chez Google), pas cryptographique.

Conséquence double, et il faut tenir les deux bouts : on ne vend pas la refonte aux clients comme « on va commencer à pouvoir lire » — ce serait faux ; et on ne s'en sert pas non plus pour ne rien réécrire — ce qui change, c'est qu'on le fera, **régulièrement et délibérément**, et ça, aucun texte actuel ne le prévoit.

---

## 2. L'architecture retenue

### 2.1 Le principe

**Ce qui change est le TRANSPORT et le DÉPÔT. Le modèle ne change pas.**

`db` reste l'objet complet en mémoire et dans `localStorage` sous `STORE_KEY`. `save()` garde ses quatre gestes dans l'ordre exact — `numPlafondRelever` → `estampiller` → `localStorage` → envoi (`app.html:6425`). `estampiller()` (`app.html:6058`) et son ombre `_ombre` (`app.html:6054`) restent **sur l'appareil**, définitivement : le serveur ne connaît pas l'état d'avant-édition d'un client, il ne peut ni poser `_m` à sa place, ni déduire quelles lignes d'une box ont bougé.

Chaque enregistrement devient une **LIGNE** dans un SQLite propre à l'entreprise, corps chiffré sous une clé TeamOP, en-tête en clair pour servir un delta sans tout déchiffrer. Une box éclate en lignes de stock ; un dictionnaire éclate en lignes par clé.

**Deux horloges qui ne se confondent JAMAIS :**
- `maj_le` = l'actuel `_m`, **horloge de l'utilisateur**, produite par comparaison à l'ombre. C'est elle, et elle seule, qui arbitre les conflits.
- `seq` = compteur **serveur** monotone par entreprise. Il dit seulement « ce que cet appareil n'a pas encore vu ».

Les confondre — c'est-à-dire laisser le serveur estamper à la réception — ferait dater « maintenant » trois jours de travail hors ligne, qui battraient du travail plus frais. C'est le piège principal de toute refonte de ce type, et il est fermé par construction.

### 2.2 Stockage

**Moteur : `node:sqlite`**, module intégré à Node. Mesuré ici : `require('node:sqlite')` charge sans drapeau sur **v22.22.2** et expose `DatabaseSync, StatementSync, constants, backup` ; le VPS est en v22.23.1. Zéro dépendance npm ajoutée, donc zéro surface d'attaque supplémentaire sur le composant le plus critique, et **aucun module natif à compiler au déploiement** (un `npm ci` qui échoue = service à l'arrêt). Le module imprime `ExperimentalWarning: SQLite is an experimental feature and might change at any time` — c'est un risque nommé en §7.

⛔ **Tout l'accès SQL passe par UN module `server/socle.js`.** Aucun SQL ailleurs. Même discipline que les 27 registres actuels, qui ont chacun une seule fonction d'écriture (`espacesEcrire` `server/index.js:3921`, `sauvRefus` `server/index.js:2584`). C'est ce qui rend le passage à `better-sqlite3` mécanique si Node casse l'API — ~30 lignes d'adaptateur.

**Un fichier par entreprise : `/opt/teamop/data/socle/<t>/base.db`.** Le cloisonnement devient **structurel** : il n'y a pas de `WHERE entreprise_id` à oublier, la connexion EST le cloisonnement. Avec 20 à 30 routes neuves, le filtre oublié est le défaut de masse le plus probable ; là, il n'a pas d'endroit où naître. C'est ce qui garde littéralement vraies `index.html:319` et `sous-traitance.html:132`. Le précédent existe à côté : `SAUV_DIR` est déjà par espace (`server/index.js:2561`). Fermer une entreprise = effacer son fichier ; sauvegarder = copier un fichier. ⚠️ **En WAL, « le fichier » en fait TROIS** — `base.db`, `base.db-wal`, `base.db-shm` : n'effacer que le premier laisse un journal qui peut porter des écritures non fusionnées, donc une suppression **incomplète et silencieuse** (relevé du 16 septembre, `COMMENT-FONT-LES-AUTRES.md` §4).

⚠️ **La propriété ne vaut que pour `base.db`.** `socle-annuaire.db` (voir plus bas) est commun et porte une colonne `t` : c'est l'**EXCEPTION**, elle est nommée comme telle, et c'est exactement là que les trous se creusent. Et elle n'est pas qu'une commodité : **un comptage inter-entreprises est 21× plus LENT** en fichier-par-client qu'en base partagée (mesure relevée dans `COMMENT-FONT-LES-AUTRES.md` §4). La Tour, qui agrège sur toutes les entreprises, lit donc `socle-annuaire.db` et **ne balaie JAMAIS** les fichiers par entreprise pour construire un tableau — l'exception est une nécessité de performance autant qu'un choix de dessin.

**Schéma par entreprise** (`base.db`) :

```sql
PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;

CREATE TABLE enr (                    -- l'état courant : la projection du journal
  coll        TEXT    NOT NULL,       -- 'boxes','box_stock','produits','reglages'…
  id          TEXT    NOT NULL,
  maj_le      INTEGER NOT NULL,       -- = le `_m` du client. PLANCHER À 1, jamais 0.
  seq         INTEGER NOT NULL,       -- rang serveur monotone
  supprime_le INTEGER NOT NULL DEFAULT 0,
  par         TEXT    NOT NULL DEFAULT '',  -- app_id ALLOUÉ PAR LE SERVEUR
  corps       BLOB,                   -- v1:<iv><chiffré> ; NULL si supprime_le>0
  empreinte   TEXT,                   -- recEmpreinte du corps clair
  octets      INTEGER,
  PRIMARY KEY (coll,id)) WITHOUT ROWID;
CREATE INDEX enr_seq ON enr(seq);

CREATE TABLE journal (                -- LE DIAGNOSTIC. Append-only, jamais réécrit.
  seq INTEGER PRIMARY KEY, ts INTEGER, coll TEXT, id TEXT, maj_le INTEGER,
  supprime INTEGER, par TEXT, utilisateur TEXT, ver TEXT, octets INTEGER,
  origine TEXT,                       -- 'appareil' | 'tour' | 'migration' | 'retour'
  empreinte TEXT,
  corps BLOB,                         -- ⛔ PURGÉ À 90 JOURS. Voir §5 et §6.
  corps_purge_le INTEGER NOT NULL DEFAULT 0);
CREATE INDEX journal_enr ON journal(coll, id, seq DESC);

CREATE TABLE numero (prefixe TEXT, annee INTEGER, dernier INTEGER,
                     PRIMARY KEY(prefixe,annee));
CREATE TABLE fichier (sha TEXT PRIMARY KEY, mime TEXT, octets INTEGER,
                      cree_le INTEGER, cree_par TEXT, refs INTEGER);
CREATE TABLE meta (cle TEXT PRIMARY KEY, val TEXT);  -- seq, schema, kek_temoin
```

`seq` s'alloue par `UPDATE meta SET val=val+1 WHERE cle='seq' RETURNING val`, **dans la même transaction** que l'upsert — jamais par `MAX(seq)`, qui redescendrait après une purge.

⛔ **`seq` n'entre JAMAIS dans le corps de l'enregistrement.** L'y mettre le ferait entrer dans `recEmpreinte` (`app.html:6040`, qui exclut `_m` et `_ms` à toute profondeur), donc re-tamponner chaque enregistrement à chaque `save()`, donc lui faire battre sa propre pierre tombale. Le signe que ça va : trois `save()` sans changement ne posent aucun `_m` (`tests/test-639.js`).

⛔ **`maj_le` a un plancher à 1.** La règle d'écartement par tombe est `t >= (r._m||0)` (`app.html:6162`) : un enregistrement à 0 est tuable par n'importe quelle tombe de n'importe quelle époque. Un `maj_le` à 0 poussé est **refusé** (`non_date`), et le refus s'affiche — pas de silence.

**Schéma central** (`/opt/teamop/data/socle-annuaire.db`, l'exception) :

```sql
entreprise(t PK, dek BLOB, dek_gen, kek_gen, etat, seq, octets, cree_le, ferme_le)
appareil(t, app_id, jeton_sha, exp, cree_le, vu_le, nom, revoque_le, PRIMARY KEY(t,app_id))
diagnostic(id, ts, qui, t, motif, portee, n, ip_h, chaine_sha)   -- journal d'accès
```

⛔ **`socle-annuaire.db` a UN SEUL accesseur**, une fonction dont le **premier argument obligatoire est `t`**, et un banc dans `tests/test-641.js` qui relit `server/socle.js` et exige **zéro** requête SQL sur cette base sans `t` — le même banc que celui qui compte déjà les écritures directes d'`espaces.json`.

⛔ **La table s'appelle `diagnostic`, pas `acces`.** `acces.json` existe déjà et désigne les CODES d'accès d'espace (`server/index.js:3346`). Dans un dépôt qui a déjà supprimé quelque chose sur la foi d'un nom trompeur (`FOURNISSEURS_ELAN`, `CLAUDE.md`), un homonyme est une mine.

**Pièces jointes** hors base : `socle/<t>/fichiers/<sha[0:2]>/<sha>.bin`, chiffrées comme un corps, dédupliquées par sha256 (une signature ou un logo se répète sur des centaines d'enregistrements). SQLite n'aime pas les blobs de plusieurs Mo.

### 2.3 Chiffrement au repos, et où vit la clé

**Enveloppe à deux étages.**

- **KEK** (32 octets) — ⛔ **elle n'est PAS un fichier de `/opt/teamop`.** Elle est injectée au démarrage par `LoadCredential=` de systemd depuis un `EnvironmentFile` hors de `/opt`. La raison est concrète et a été oubliée par deux des trois architectures : un instantané IONOS est une image de **volume**, un disque volé aussi. Ranger la clé dans l'arborescence qu'elle protège ne protège que d'un disque éteint qu'on aurait démonté à la main. La procédure de sauvegarde porte, écrite noir sur blanc, **la liste de ce qu'un instantané ne doit pas contenir**.
- **DEK par entreprise**, 32 octets aléatoires, scellée sous la KEK en AES-256-GCM avec AAD = `t`, rangée dans `socle-annuaire.db`. Rotation de la KEK = rescellage de N clés, quelques millisecondes. Rotation d'une DEK = réécriture des lignes d'une seule entreprise.
- **Corps** : AES-256-GCM(gzip(JSON)) sous la DEK, IV 12 octets, préfixe `v1:` pour une rotation ligne à ligne sans arrêt.
- ⛔ **AAD = `t|coll|id|maj_le|supprime_le`.** Pas seulement `t|coll|id`. GCM donne l'intégrité du corps, pas la fraîcheur : si `maj_le` et `supprime_le` restent hors de l'AAD, un `UPDATE enr SET maj_le=<now+10 ans>` sur une ligne — script de rangement, restauration mal ciblée, intrus — la fait gagner toutes les fusions pour toujours, sans que rien ne se voie. Dans l'AAD, la ligne trafiquée **cesse de se déchiffrer**, donc elle se voit.
- **Pièces jointes** : même enveloppe, **AAD = `t|sha`**, et le sha est **recalculé après déchiffrement** avant de servir l'octet. Une photo substituée sur un dossier sanitaire est un faux, pas une gêne.

**Séquestre — non négociable, et avant l'étape 4.** `K_maitre` fait 32 octets. Deux copies scellées, dans deux lieux physiques distincts, plus une copie chiffrée sous la clé publique de sauvegarde et déposée AVEC les sauvegardes (avec `kek_gen` en clair à côté, sinon on ne sait pas laquelle essayer). Sans ça, on a recréé `SYNC_SECRET_DEFAULT` côté serveur : une clé qu'il ne faut pas perdre, et personne n'a écrit où en est la copie.

**Témoin de clé.** `meta.kek_temoin` porte un HMAC d'une constante sous la KEK, écrit à la création de chaque base et **comparé à l'ouverture**. Si ça diffère, le serveur **refuse de démarrer** avec un message qui dit quoi faire. Sans ce témoin, une réinstallation qui tire une clé neuve démarre vert, `/health` répond 200, SQLite ouvre parfaitement — et l'échec ne se voit qu'au déchiffrement, ligne par ligne, où il ressemble à de la corruption. ⛔ Et `install.sh` **ne tire jamais** de clé quand `socle/` contient déjà un fichier : à ce moment-là, une clé absente est un incident, pas une installation neuve.

⛔ **`SYNC_SECRET_DEFAULT` (`app.html:6458`) et `SYNC_SALT` (`app.html:6459`) ne bougent d'aucun caractère, ni maintenant ni jamais.** Ils ne servent PAS le socle. Ils restent nécessaires pour lire l'existant : documents Firestore et 30 jours de copies de `SAUV_DIR` (`server/index.js:2561`). Deux systèmes de clés coexistent pendant toute la bascule, c'est normal, et c'est une raison de plus de fixer une date de fin à `SAUV_DIR` (étape 8).

**Ce qui reste en clair, et c'est assumé** : `coll`, `id`, `maj_le`, `seq`, `supprime_le`, `empreinte`, `octets`. Le minimum pour servir un delta sans déchiffrer. ⚠️ **Ce n'est pas rien et il ne faut pas le prétendre nul** : pris ensemble sur `interventions`, `pointages` et `mouvements`, ces en-têtes disent combien d'enregistrements, et quand chacun a bougé à la milliseconde. C'est une donnée d'activité. C'est pourquoi `par` (l'appareil) et `utilisateur` **ne sont PAS dans l'en-tête clair de `enr`** — ils ne servent qu'à l'intérieur de la transaction et au journal, ils vivent donc dans le corps scellé et dans `journal`. Et les `id` parlent : `idCatalogue` construit `cat_<slug du nom>` (`app.html:17470`) et l'`id` de `produitsDistincts` EST un nom de produit normalisé (`app.html:17767`). Un `base.db` volé sans la clé livre le catalogue produits et le rythme de travail — pas les clients, pas les interventions. C'est la phrase à écrire dans le contrat, pas « chiffrées ».

### 2.4 Routes et contrats

Espace de noms neuf `/api/op/*`, dans `server/op-socle.js`, monté **explicitement et tôt** — plus un contrôle au démarrage qui **REFUSE de démarrer si un chemin est déclaré deux fois**. C'est la panne silencieuse de `/api/devis/etat`, déclarée dans `agent-devis.js` (monté `server/index.js:340`) et dans `index.js` ; la seconde, plus riche, n'a jamais répondu. Avec 139 routes sur trois fichiers, une API de données ajoutée en fin de fichier peut être masquée sans un mot.

⛔ **Tout `/api/op/*` est derrière un drapeau de configuration `socle.actif`, lu dans `/opt/teamop/config.json`** (qui vit sur le VPS, pas dans le dépôt). C'est ce qui rend l'étape serveur compatible avec la règle du dépôt : un push de `server/` sur `main` déploie (`.github/workflows/deploiement.yml:14`), donc « prêt mais non déployé » n'existe pas — mais « déployé et inerte » existe, et il se rallume sans push.

**Authentification en deux temps.**

1. `POST /api/op/session` — en-tête `X-Teamop-Kh` (déjà en liste blanche CORS, `server/index.js:61`), corps `{t, app_id?, nom}`.
   - Garde : **`sauvRefus(t, kh)` LUI-MÊME** (`server/index.js:2584`), pas une copie — deux contrôles de sécurité finissent toujours par diverger, c'est la leçon des quatre portes. Plus le refus 409 `cleEstPublique(t)` (`server/index.js:2297`) : une clé écrite en clair dans `app.html` ne prouve rien quand on la présente.
   - ⛔ **Prérequis à traiter d'abord** : `espaceCleOk` compare avec `!==` (`server/index.js:2268`) alors que `cleEquipeVerdict` compare en temps constant (`server/index.js:3164`). Deux implémentations de la même preuve, déjà divergentes. `espaceCleOk` doit **déléguer** à `cleEquipeVerdict` avant qu'on branche quoi que ce soit de neuf dessus.
   - ⛔ **`app_id` est ALLOUÉ PAR LE SERVEUR** à la première session, jamais choisi par l'appareil. Trois raisons, toutes payantes : un appareil révoqué qui invente un `app_id` neuf reprendrait une session (la Tour afficherait « révoqué » pendant qu'il lit) ; un appareil qui se nomme `zzzz` gagnerait toutes les égalités ; et se déclarer avec l'`app_id` d'un collègue remplacerait son `jeton_sha` et le déconnecterait. `syncDeviceId()` (`app.html:6454`) reste pour l'usage local, mais **ne sert plus d'identité** : c'est un aléatoire de `localStorage` qui change quand un stockage est nettoyé.
   - Rend `{jeton, exp, seq, etat, vide}`. ⛔ **`vide` a TROIS états** : `true`, `false`, `null` (« on n'a pas pu savoir »). Une base qui ne s'ouvre pas répond **503 et n'énonce pas `vide`**. Ce dépôt a payé deux fois pour cette confusion précise (`_mailboxes`/`_mailReplies`, et `syncDecrypt` qui rend `null` pour trois causes distinctes).
   - Jeton : 32 octets aléatoires, **seul le sha256 est stocké**, **30 jours d'expiration**, renouvelé à chaque appel. Un jeton sans expiration n'est pas révocable par une rotation de clé.
   - Le plafond anti-abus se compte **APRÈS** la preuve (modèle `server/index.js:4421`), sinon c'est une arme de déni de service.

2. Tout le reste : `Authorization: Bearer <jeton>` → (t, app_id). ⛔ **AUCUNE route ne lit `t` dans le corps.** C'est la règle « une valeur du CORPS ne décide jamais de ce qu'une entreprise a payé » (`CLAUDE.md`), généralisée aux données.

**Routes appareil :**

| route | contrat | note |
|---|---|---|
| `GET /api/op/depuis?seq=N&max=400` | `{seq, reste, enr:[{c,id,m,s,sup,r}]}` | `r` en clair ; pagination par seq strictement croissante |
| `POST /api/op/pousser` | `{base, enr:[{c,id,m,sup,e,r}]}` → `{seq, acceptes, refus:[{c,id,motif,serveur}]}` | une seule transaction, tout ou rien ; 400 lignes ou 4 Mo par lot (`express.json` est à 6 Mo, `server/index.js:47`) |
| `GET /api/op/flux?depuis=N` | long-poll 25 s → `{seq}` | voir §2.5 |
| `POST /api/op/numero` | `{prefixe,annee,n,plancher}` → `{de,a}` | réserve une **PLAGE**, voir §2.7 |
| `POST /api/op/fichier` | binaire ≤ 25 Mo → `{sha}` | ⛔ le serveur **recalcule** `sha256`, il ne croit jamais celui qu'on lui annonce |
| `GET /api/op/fichier/<sha>` | l'octet | ⛔ résolu par le couple **(t du jeton, sha)** ; `application/octet-stream`, `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff` — le mime déclaré ne sert qu'à l'affichage local |
| `GET /api/op/etat` | `{seq, parColl, octets, signature}` | le contrôle de non-régression |
| `POST /api/op/atteste` | `{compteurs, pieces}` | l'attestation de complétude, voir étape 7 |

**Routes Tour**, `monPatronStrict` (`server/index.js:1550`, qui relit rôle/actif/apps à chaque requête), déclarées dans la table `monAppDeRoute` (`server/index.js:1500`) **où l'oubli FERME** — jamais un middleware posé route par route, qui rouvrirait par oubli sur une surface qui double :

- `GET /api/monitor/op/apercu?t=` — comptes, poids, seq, appareils, versions. **AUCUN contenu**, donc aucune session requise. C'est le niveau qui répond à huit questions de dépannage sur dix, et c'est lui la vraie protection : pas la session de 30 minutes, le fait qu'on n'en ait presque jamais besoin. ⛔ Il ne rend **jamais** les `id` ni les logins — seulement des compteurs.
- `POST /api/monitor/op/ouvrir {t, motif}` — motif obligatoire (≥ 10 caractères), session de lecture 30 min, **une ligne dans `diagnostic`**. Pas de motif écrit, pas de lecture.
- `GET /api/monitor/op/enr` / `GET /api/monitor/op/journal?coll=&id=` — l'historique d'un enregistrement, version par version, avec le diff champ par champ. **C'est la route qui justifie la décision de Justin** : « qui a vidé cette box, et quand » devient une réponse en trois secondes au lieu d'une enquête.
- `GET /api/monitor/op/cherche?t=&coll=&q=` — recherche sur les corps déchiffrés d'UNE collection, plafond 100. ⛔ `q` est journalisé **haché avec un sel par entreprise** : un client qui soupçonne qu'on a cherché « Dupont » chez lui peut le vérifier en recalculant, sans que notre journal contienne un seul nom.
- `POST /api/monitor/op/revenir {t, coll, id, seq, motif}` — rejoue une version comme une écriture **neuve** (`origine:'retour'`, `maj_le=Date.now()`). L'histoire n'est jamais réécrite et l'appareil n'a aucun code spécial : il reçoit une modification ordinaire qui gagne par sa date. ⛔ **Exige le code à six chiffres envoyé à l'adresse enregistrée de l'entreprise**, par `cleCodeExiger` (`server/index.js:2608`) — pas une copie. Changer la clé d'équipe, geste qui n'écrit aucune donnée métier, l'exige déjà ; écrire dans la base d'un client ne peut pas être moins gardé.
- `POST /api/monitor/op/couper {t}` — révoque toutes les sessions, **immédiatement**, et ferme les long-polls. Appelée par les QUATRE portes qui appellent aujourd'hui `fbRevoquerEquipe` (`server/index.js:4514`), et **si elle échoue, l'appelant le REMONTE**.
- `GET /api/monitor/op/diagnostics?t=` — qui a ouvert cette entreprise, quand, pour quel motif, combien d'enregistrements. ⛔ **Lisible aussi par le client depuis son espace.** C'est le seul geste qui rende vérifiable `sous-traitance.html:117`.

**Anti-abus.** ⛔ La correction d'une erreur commune aux trois architectures : `ROUTES_SENSIBLES` (`server/index.js:158`) est un motif **positif** qui AJOUTE un palier strict ; il n'exempte rien. Le plafond global de 120 req/min/IP est appliqué par le `app.use` en tête, à tout chemin, et la seule exemption existante (`/health`) est un `return next()` écrit à la main. Donc :

1. un **troisième compteur nommé**, sur le modèle de `PLAFOND_BATTEMENT`, dans le même `app.use` : `PLAFOND_DONNEES = 1200/min/IP`, généreux mais **réel** — jamais « exempté », sinon `/api/op/session` devient la seule route du serveur sans aucun plafond avant preuve ;
2. puis, **après la preuve**, un budget par espace prouvé : `quotaOk(opQuota,'t:'+t, …)` (`server/index.js:3303`) — 1 200 pousses/h, 4 000 lectures/h.

⚠️ `quotaOk` vit dans une `Map` en mémoire, remise à zéro **à chaque redémarrage, donc à chaque push touchant `server/**`**. C'est un quota de confort, pas une détection. ⛔ **Le compteur d'échecs d'enrôlement par espace, lui, vit dans `meta` de `base.db`** : il est transactionnel de toute façon, et il survit au déploiement.

### 2.5 Temps réel

**Long-poll, pas SSE.** `GET /api/op/flux?depuis=N`, tenu 25 secondes au plus, réponse `{seq}`.

Trois raisons, dans l'ordre où elles comptent :

1. ⛔ **`EventSource` n'accepte aucun en-tête personnalisé.** Un flux SSE authentifié finit donc, à l'implémentation, avec le jeton dans la query — c'est-à-dire dans les journaux d'accès du proxy et dans l'historique du navigateur. Le dépôt interdit déjà exactement ça pour `kh`, avec la raison écrite (`server/index.js:3174-3177`). Un `fetch` long-poll porte un `Authorization` sans discussion.
2. **On ne sait pas quel proxy est devant.** `install.sh` installe **Caddy** (`server/install.sh:23-28, 86`) pendant que six commentaires du serveur parlent de nginx (`server/index.js:521, 548, 1453, 3176, 4360, 4625`). Un SSE derrière un proxy qui tamponne est une panne **muette** : l'application croit écouter et n'entend rien. On ne parie pas sur le tampon d'un proxy qu'on n'a pas identifié. (Réconcilier `install.sh` avec la production est une tâche de l'étape 0.)
3. Un long-poll est un JSON ordinaire, rejouable avec `curl`.

⛔ **Le flux ne transporte AUCUNE donnée : `{seq}`, rien d'autre.** L'appareil réveillé appelle `GET /api/op/depuis?seq=<le sien>`. Conséquence : un message perdu, doublé, réordonné ou coupé ne peut rien casser ; une reconnexion reprend exactement où elle en était ; aucune donnée personnelle ne dort dans une connexion ouverte pendant des heures ; et le serveur n'a pas à re-chiffrer le même corps pour chaque auditeur.

**Le prix, dit franchement** : un aller-retour de plus par changement reçu, et environ 2,4 requêtes/minute/appareil au repos. Douze appareils ELAN = ~29 req/min hors envois. **Non mesuré en conditions réelles** — c'est un calcul, pas une mesure ; à vérifier à l'étape 4.

L'appareil qui vient d'écrire est exclu par son `app_id` — le rôle que tenait `d.writer===syncDeviceId()` (`app.html:6827`), mais fiable, parce que l'identité vient du jeton.

⛔ **Arrêt propre, obligatoire avant de confier des données métier.** Il n'existe **aucun** traitement de SIGTERM ni `server.close` dans les 6 891 lignes (vérifié : seul `app.listen` à `server/index.js:6891`), et `systemctl restart` tombe à chaque push touchant `server/**`, au milieu des différés de 300 à 800 ms. SIGTERM → refus des nouvelles requêtes, fermeture des long-polls, vidage des écritures différées, `db.close()` sur chaque handle, sortie.

### 2.6 Arbitrage des conflits

Le serveur arbitre, une seule règle, dans la transaction de `POST /api/op/pousser` :

```sql
INSERT INTO enr(coll,id,maj_le,seq,supprime_le,par,corps,empreinte,octets)
VALUES(?,?,?,?,?,?,?,?,?)
ON CONFLICT(coll,id) DO UPDATE SET …
WHERE excluded.maj_le > enr.maj_le
RETURNING seq;
```

`RETURNING` ne rend rien quand la ligne a perdu : c'est le signal `perime`, sans requête de contrôle.

⛔ **L'égalité n'est PAS tranchée par un départage silencieux.** Les trois architectures proposaient `maj_le égal ET par > par` ; les critiques ont montré pourquoi c'est dangereux ici : les enregistrements marqués `horsNuage` / `photosHorsNuage` / `champsHorsNuage` par `syncAlleger` (`app.html:7059`) portent **le même `id` et le même `_m` avec deux contenus différents** — l'un avec ses quatre photos, l'autre amputé. Un départage alphabétique ferait gagner la version amputée une fois sur deux, et l'étape de bascule de la lecture la redescendrait sur l'appareil qui détenait encore la pièce. Les PDF signés et les photos de chantier disparaîtraient de tous les appareils à la fois, sans message.

Donc :

- `maj_le > stocké` → **accepté**.
- `maj_le == stocké` **et empreinte identique** → **no-op** (renvoi idempotent, gratuit).
- `maj_le == stocké` **et empreinte différente** → ⛔ **`conflit`**. Le serveur ne tranche pas. Il rend sa version ; l'appareil **adopte** la version serveur, **met la sienne de côté** par `miseDeCote()` (`app.html:7515`, IndexedDB `elan_cote`), et **le dit à l'utilisateur**. On ne détruit jamais ce qu'on refuse d'écrire, et on dit où le retrouver.
- `maj_le < stocké` → `perime`, la version serveur revient dans la même réponse.
- `maj_le == 0` → `non_date`, refusé, **et l'écran le dit**.
- `maj_le > maintenant + 5 min` → `horlogeAvancee`, refusé, et un compteur par espace remonte à la Tour : aujourd'hui une horloge fausse est **totalement invisible**.

⛔ **Le refus revient dans la réponse, mais il ne s'applique PAS à `db` par ce chemin.** Un quatrième site de remplacement de `db` sans `ombreRelever()` derrière ferait re-tamponner au prochain `save()` l'enregistrement qu'on vient de perdre, qui repartirait gagner. `_dbGen` est incrémenté et `ombreRelever()` appelé dans le même bloc synchrone, exactement comme `app.html:6861-6862` ; `tests/test-706.js`, qui énumère déjà les affectations de `db`, est étendu au nouveau site.

⛔ **Le serveur ne pose JAMAIS sa propre date sur une donnée.** `maj_le` vient de `estampiller()`, donc de la comparaison à l'ombre locale. Un appareil qui a travaillé trois jours hors ligne pousse des dates de trois jours : il perd contre plus récent, il gagne contre plus vieux, et c'est juste.

### 2.7 Hors ligne

Rien ne change pour l'utilisateur. L'appareil travaille intégralement hors ligne, comme aujourd'hui.

⛔ **La file est EXPLICITE, jamais déduite d'un filigrane temporel.** Deux des trois architectures proposaient « on pousse tout ce qui a `maj_le > dernierAccusé` ». C'est un filigrane posé sur une quantité **non monotone** : l'horloge du téléphone. Un appareil réglé quatre minutes en avance (sous la garde des cinq minutes, donc accepté) pousse, puis se remet à l'heure — et **plus rien ne part de la journée**, sans erreur, sans file, sans bandeau, pendant que l'écran dit « Synchronisé ». Le dépôt sait déjà que ces horloges sont fausses : la relecture-avant-écriture a dû perdre sa condition d'horodatage pour cette raison (`app.html:7199-7204`).

Donc : `estampiller()` gagne une ligne qui verse les couples `(coll, id)` touchés dans un ensemble persisté sous `<préfixe>_sortant`. Le préfixe se lit sur `STORE_KEY`, jamais écrit en dur (la bêta a le sien). Vidé **par l'accusé de réception**, entrée par entrée.

⛔ **Le sortant porte des CLÉS et un VERDICT (vivant / supprimé), pas des copies.** Le corps est relu dans `db` au moment de pousser. Une file qui porterait des copies rejouerait la panne d'ELAN : le SDK Firestore mettait l'écriture en attente et l'envoyait au retour du réseau avec une base d'entre-temps. Mais pour une suppression il n'y a plus de corps dans `db[coll]` — la seule source est `db._tombes`, que `tombesElaguer` (`app.html:6142`) plafonne à 3 000/collection et 6 000 au total. ⛔ **Une tombe ne s'élague pas tant que sa clé est dans le sortant**, et une clé dont le corps ET la tombe ont disparu échoue **bruyamment** au lieu d'être abandonnée.

⛔ **Au rallumage de la synchro, le sortant se reconstruit par diff complet `db` ↔ `_ombre`.** `estampiller()` sort immédiatement si `!syncEnabled()` (`app.html:6059`) : rien n'entre dans le sortant pendant une coupure. Aujourd'hui c'est sans gravité parce qu'on pousse la base entière et que la fusion est une union ; avec un delta, une journée de terrain saisie synchro coupée ne serait **dans aucune file** et ne partirait jamais. Le chemin « pousser une base complète en un lot » existe de toute façon (plafond à 20 000 clés), il suffit de le déclencher aussi ici.

⛔ **Le repère de séquence vit DANS `db`**, comme `numMax` et `_tombes`, jamais à côté dans `localStorage`. Une base peut disparaître sur un appareil qui a servi — écriture refusée faute de place, stockage nettoyé, profil recréé : c'est constaté chez ELAN, capture à l'appui, et c'est écrit dans le commentaire de `app.html:6207-6222`. Si le repère survivait à la base, l'appareil redémarrerait dans une entreprise **vide** en se croyant à jour, et le flux incrémental n'aurait rien à lui envoyer. En ceinture et bretelles : `load()` sait déjà qu'il est sur une base neuve alors que l'appareil est rattaché (`app.html:6227`) — dans ce cas, `depuis=0` forcé et **poussée bloquée** jusqu'à la première réception complète. C'est `nuageIllisible()` (`app.html:6547`) généralisé : **qui ne sait pas LIRE n'écrit pas**.

⛔ **`espaceQuitter()` (`app.html:7723`) emporte trois choses de plus** : le sortant, le repère de séquence, le jeton d'appareil. Cinquième élément aux QUATRE portes, et `espace.html` refait la même chose **en clair** (`espace.html:1006`) sans partager une ligne de code. `tests/test-637.js` surveille déjà les quatre portes ; il doit vérifier les trois nouveaux.

**Numéros de document.** ⛔ **On ne renumérote JAMAIS un document émis.** Le PDF est déjà fabriqué et déjà parti (`envoiDoc()`, `db.comptableEmail`) ; le client et le comptable détiennent un document portant un numéro que la base ne connaîtrait plus. `POST /api/op/numero` rend une **PLAGE** `{de, a}` que l'appareil réserve quand il a du réseau et consomme hors ligne. Le doublon disparaît vraiment.

L'arbitrage, dit franchement : une plage réservée et non consommée **fait un trou** dans la numérotation. Une entreprise qui trace des biocides n'aime pas les trous — mais **un trou s'explique, un doublon et un renumérotage ne s'expliquent pas**. `numMax` et `numMaxUnion` par le MAXIMUM (`app.html:6421`) restent comme **plancher** hors ligne, et la réservation s'écrit `dernier = MAX(dernier, plancher) + n` : le serveur ne peut jamais rendre un numéro sous le plancher qu'un client lui présente.

### 2.8 Ce qui ne passe pas côté serveur, définitivement

`estampiller()` et `_ombre`. Le serveur ne connaît pas l'état d'avant-édition d'un client ; il ne peut ni poser `_m` à sa place, ni déduire quelles lignes d'une box ont bougé à partir d'une box reçue entière. C'est pour ça que le client envoie des **lignes** et jamais une box entière.

---

## 3. Ce que chaque invariant devient

| Invariant aujourd'hui | Où il vit | Ce qu'il devient | Ce qui le prouve |
|---|---|---|---|
| **Box ligne à ligne** — `_ms[produitId]`, `boxFusionFine` 47 lignes (`app.html:6095`), garde (b) « une absence non datée n'est jamais un retrait » (`app.html:6116`) | client | **La clé primaire.** `box_stock`, id = `<boxId>\|<produitId>`, `maj_le` = `_ms[pid]`. Alexis sur l'ADVION et Justin sur le DEBUSK écrivent deux lignes différentes : **il n'y a plus de conflit du tout**. Une absence n'est jamais une ligne ; seul un `supprime_le` en est une. La panne du 15 septembre devient impossible **par construction**, pas gardée par une condition. | banc de pagination (étape 2) |
| **Première pose de `_ms`** (`app.html:6065-6068`) | client | ⛔ **Inchangée, et reportée telle quelle dans le convertisseur** : une box sans `_ms` date ses lignes de `b._m`, **jamais** de `Date.now()`. Dater de maintenant rendrait toutes les lignes du second appareil « plus récentes » et lui ferait gagner tout le stock. | `tests/test-7xx` aller-retour |
| **Marques de RETRAIT dans `_ms`** — un `pid` daté dans `_ms` mais absent de `stock` (`app.html:6076`) | client | ⛔ **Converties en lignes `box_stock` avec `supprime_le = _ms[pid]`.** Oubliées, le serveur naît sans aucune trace des retraits, et un appareil resté trois semaines au fond d'un camion **ressuscite** les produits retirés chez toute l'équipe. | banc dédié, étape 2 |
| **Dictionnaires** `plansSite`, `planNotes`, `permissions` (`COLLS_DICT`, `app.html:6037`) | client | Une ligne **par clé**. `dictFusion` (`app.html:6038`) disparaît structurellement ; le plan de 24 postes ne peut plus écraser celui de 18. | aller-retour |
| **Les huit réglages en bloc** — `Object.assign({},prio)` (`app.html:6154`) : `entreprise`, `roleNoms`, `roleMasques`, `mailAssign`, `planOrga`, `planOrgaRef`, `societesStyle`, `ctrlValide` | client | ⛔ **En deux temps, et pas d'un coup.** `estampiller()` ne parcourt que `collsFusion(db)` — les **tableaux** (`app.html:6062`) : ces objets **n'ont jamais eu de `_m`**, donc les éclater champ par champ les ferait tous arriver à `maj_le=0`, donc **refusés pour toujours** (le nom, le logo et la couleur de l'entreprise deviendraient immuables). **Phase A** : un enregistrement `reglages/<objet>` par objet, bloc opaque, dernier écrivain gagne — aucune régression. **Phase B**, après extension d'`estampiller()` aux objets avec une ombre par champ : une ligne par champ, et deux administrateurs qui renomment deux rôles différents gardent les deux. | `tests/test-639.js` étendu : trois `save()` sans changement ne posent rien, **sur ces familles aussi** |
| **Pierres tombales** `_tombes`, `tombesUnion` par MAX (`app.html:6150`), `TOMBE_JOURS`=90 | client, dans la base | Colonne `supprime_le`. ⛔ **Jamais un enregistrement `reglages/_tombes`** : le serveur les **fusionne par MAX par id** (portage exact de `tombesUnion`), il ne les stocke pas comme un corps opaque — sinon un appareil rallumé après une semaine pousse une carte plus pauvre avec une date fraîche et **toutes les suppressions de la semaine disparaissent**. Plus d'élagage à 3 000/6 000 côté serveur : un appareil endormi 90 jours ne ressuscite plus rien. ⚠️ Mais le filet accidentel des 90 jours disparaît avec : d'où `/api/monitor/op/revenir` **avant** la bascule de lecture. Le serveur continue d'émettre et d'accepter le dictionnaire `_tombes` tant qu'un appareil v6xx vit. | `tests/test-641.js` |
| **Plafond de numéros** `numMax`, `numPlafondRelever` à chaque `save()` (`app.html:6415`), `numMaxUnion` par MAX (`app.html:6421`) | client | ⛔ **Jamais une ligne.** Table `numero`, semée depuis `db.numMax` **par MAX**, jamais abaissée. Sans ça : un appareil qui n'a pas reçu les trois dernières factures recalcule un `numMax` **plus bas** et sa ligne est acceptée parce qu'elle est plus récente — deux factures au même numéro, et l'archive plafonnée à 500 fait que personne ne le rattrape. `numMax` reste **plancher** local hors ligne. | `tests/test-641.js` |
| **Comptes** `usersFusionner` (`app.html:6950`), `usersSansDoublonLogin` (`app.html:6972`) | client, hors fusion générique | `users` entre dans le modèle commun **plus** une contrainte serveur `UNIQUE(lower(login))` parmi les vivants. ⛔ Le client continue de **RENOMMER en `-2`**, jamais de supprimer : poser une tombe ferait disparaître l'identifiant des deux côtés. ⛔ `usersSansDoublonLogin` **reste actif** jusqu'au retrait du dernier appareil ancien — on ne retire pas le filet parce qu'on vient de poser la contrainte. ⛔ À la pose d'une tombe, `login` et `par` sont **effacés de la ligne** : l'unicité n'a de sens que sur les vivants, et garder `login:florent` pour toujours contredit `confidentialite.html:57`. | `tests/test-641.js` |
| **Journal plafonné à 500** (`app.html:6175`), `planJournal` 400 (`app.html:6176`), `interventionsArchive` 500, `mailSent` 200 (`app.html:21879`), arrivages 40, passages 200 | client + fusion | ⛔ **Aucun plafond n'est levé côté serveur tant que le client l'applique encore.** Sinon : le serveur sert 3 000 archives, `ombreRelever()` les photographie, `archiverIntervention` en jette 2 500 au `save()` suivant, et `estampiller()` pose **2 500 pierres tombales** qui effacent l'archive pour toute l'entreprise. Les plafonds sautent **des deux côtés dans la même version**, un par un, en vérifiant qui lit la collection. Et `mailSent`, qui porte le **corps complet** des courriels et n'est pas re-tronqué à la fusion, reçoit un `id` à l'écriture **et une purge serveur à 90 jours**. | banc « lot paginé + `save()` entre deux pages » |
| **Les quatre tableaux sans `id`** — `societes` (`app.html:5497`), `dashLayout` (`app.html:9005`), `roles` (clé `cle`), `mailSent` : union par contenu JSON (`app.html:6161`), donc **suppression impossible** | client | ⛔ **Ils reçoivent un `id` DANS `db` AVANT d'en recevoir un dans le transport**, sinon `estampiller()` continue de les sauter (`r.id==null`) et ils entrent à `maj_le=1` **pour toujours** : la tombe devient indépassable et retirer une société puis vouloir la remettre échoue en silence. `dashLayout` reste une **liste ordonnée en un seul enregistrement**, dernier écrivain gagne — c'est un choix, pas une évidence : deux personnes qui réorganisent leur tableau de bord au même moment, l'une perd. C'est mieux qu'aujourd'hui, où retirer une tuile **ne tient pas du tout**. | `tests/test-634.js` étendu : refuser tout `push` d'élément sans `id` dans une collection fusionnée |
| **`_nuageIllisible`** (`app.html:6547`) | client | ⛔ Reconduit à l'identique, cause élargie : **qui n'a pas su LIRE le delta n'écrit pas**. Vaut pour un schéma inconnu, un jeton révoqué, une réception incomplète. | — |
| **`syncManque` + `COLLS_GARDEES`** (`app.html:7504`, `7386`) | client | Gardé, **câblé uniquement sur le chemin Firestore**, retiré à l'étape 8 **avec sa raison d'être**. Cette heuristique n'a de sens que parce qu'on pousse la base entière. | — |
| **`miseDeCote()` / `elan_cote`** (`app.html:7515`) | client | ⛔ **Gardé tel quel, et rendu obligatoire sur les refus.** « Le serveur garde tout, on peut le supprimer » est le raisonnement qui fait disparaître la journée d'un technicien au moment où l'application se félicite de l'avoir protégée. | — |
| **`sauvegardeRemettre`** (`app.html:7425`) : supprime `_m` des enregistrements restaurés | client | ⛔ **Pose `_m = Date.now()`** au lieu de supprimer `_m`. C'est un geste voulu par un humain, il a le droit de gagner ; sans ça les lignes de box restaurées repartent à `maj_le=0`, sont refusées `non_date`, et le toast « 40 enregistrement(s) remis » **compte ce qu'on a poussé dans `db`, pas ce que le serveur a accepté**. Le toast compte désormais les acceptations. | banc |
| **`sauvegardeDeposer`** — ⛔ **un seul site d'appel, `app.html:7358`, dans le `.then()` de l'écriture Firestore** | client | ⛔ **Débranché de l'acquittement Firestore et rebranché sur celui du nouveau transport, DANS LE MÊME COMMIT que la double écriture.** Sinon l'étape 8 arrête le dépôt des copies **en silence**, le dossier cesse simplement de grossir, et trente jours plus tard il n'existe plus une seule copie ailleurs que dans le VPS. Le bloc reste chiffré par la **clé d'ÉQUIPE** : le serveur ne doit pas être la seule chose capable de relire sa propre sauvegarde. | banc + vérification au navigateur qu'une copie est **déposée**, pas que la fonction est appelée |
| **`_syncTs`** (`app.html:6434`) | client | Disparaît, remplacé par `seq`. C'était l'horloge d'un appareil comparée au `ts` d'un autre — la dérive qui a rendu un appareil d'ELAN sourd pendant des heures le 11 septembre. `seq` est un compteur serveur, il ne dérive pas. | — |
| **`syncAlleger` / `syncAllegerNuage` / `syncRegreffer`** (`app.html:7059, 7155, 7170`) | client | Disparaissent à l'étape 8. Les photos et pièces jointes **se partagent enfin** : aujourd'hui elles ne quittent jamais l'appareil qui les a prises, et l'écran le dit (`app.html:16715`). ⛔ `syncRegreffer` reste tant qu'un appareil peut recevoir un enregistrement marqué `horsNuage` — ces marques sont **déjà dans les bases des clients**. | — |
| **Verdict « cet espace est-il neuf ? »** (`app.html:6808-6818`) | client, au premier instantané Firestore | ⛔ **NE BOUGE PAS avant l'étape 8.** Le VPS est vide par construction pendant toute la double écriture, et `/api/op/session` est appelée avant toute pousse : `vide:true` ferait croire l'espace neuf, recréer « OP Admin » et amorcer avec la base locale — c'est ce qui a fabriqué @florent-2, -3, -4 chez ELAN. `vide` dit « ce dépôt est vide », jamais « entreprise neuve ». | — |

---

## 4. Le plan de bascule

Deux règles du dépôt encadrent tout ce qui suit, et elles ne se contournent pas :

- **Tout se développe et s'éprouve sur `beta.html`.** `app.html` et `sw.js` ne rejoignent `main` que sur **une phrase de Justin pour CE changement-là**. La bêta se publie librement : c'est son rôle, et c'est là qu'il regarde.
- ⛔ **Un push de `server/` sur `main` DÉPLOIE le VPS immédiatement** (`.github/workflows/deploiement.yml:14`). Il n'existe pas d'état « prêt, non déployé » sur `main`. Le code serveur vit donc sur une branche `vps/socle` jusqu'à ce que ses preuves soient faites, et quand il part, il part **inerte** derrière `socle.actif` dans `/opt/teamop/config.json`. On rallume sans push, on éteint sans push.

**Les preuves exigées avant tout push qui atteint un client**, dans cet ordre, et **on le DIT dans la réponse, avec les chiffres** :
1. la suite complète passe (`for f in tests/test-*.js; do node "$f"; done`) — et un banc qui ne couvre pas le changement ne compte pas : on en écrit un ;
2. `node scripts/verifier-syntaxe.js` ;
3. le comportement **mesuré au navigateur** sur `beta.html` quand il se voit ou s'exécute ;
4. le fichier réellement servi vérifié après coup (`curl teamop.fr/... | grep APP_VERSION`).

---

### Étape 0 — Ce qui ne touche aucun client, et qui doit partir en premier

**On livre :**
- ⛔ **Le courriel de préavis de 30 jours** (`sous-traitance.html:154`). Retirer Google Firebase et élargir le périmètre d'IONOS **est** un changement de sous-traitant ultérieur. Il part **avant l'étape 5** (double écriture), pas avant le retrait : pendant la double écriture, les deux lignes du tableau sont vraies simultanément — c'est le seul moment où elles le sont. ⛔ Et un préavis **n'est pas un accord** : voir §5, il faut aussi l'avenant aux instructions documentées.
- Site vitrine et pages légales réécrits (§5), **y compris `apercu/`**, servi publiquement.
- Le **registre des traitements**, promis à `sous-traitance.html:126` et qui n'existe nulle part (grep : zéro résultat). Un fichier daté et versionné dans le dépôt, cité par son URL dans le contrat.
- **Une durée de conservation tranchée**, une seule, reportée dans les trois textes qui se contredisent (`sous-traitance.html:88`, `mentions-legales.html:74` qui dit 24 mois, `espace.html:762` qui dit « jamais supprimées »).
- **Le parc, compté sur ce qui se remplit tout seul.** ⛔ L'inventaire des espaces vivants se fait sur `cnxData` (`server/index.js:562-570`), **jamais** sur `espacesReg`, qui n'est alimenté que par inscription manuelle. Puis : chaque espace hors annuaire inscrit, chaque espace sur la clé partagée sorti par `cleCodeExiger`. ⚠️ `cleEstPublique` rend **`false` pour un espace inconnu**, c'est-à-dire « laisse passer » (`server/index.js:2296`) : **le compteur de la Tour peut afficher zéro pendant qu'une entreprise entière travaille sur la clé publique**. La tâche #7 du dépôt a été rouverte le 14 septembre — c'est le client en production, avant-hier. Un zéro n'est pas une preuve d'absence ; la Tour doit dire « je ne sais pas ».
- **Le VPS durci** : `User=teamop` au lieu de `User=root` (`server/install.sh:79`), `NODE_ENV=production` dans l'unité (sans lui, le gestionnaire d'erreur par défaut d'Express écrit `err.stack` **dans le corps de la réponse**), un middleware d'erreur terminal qui ne rend qu'un identifiant d'incident, `process.on('unhandledRejection')`, `SystemMaxUse` et `MaxRetentionSec` sur journald.
- ⛔ **Retirer les deux `journalctl` du workflow de déploiement** (`.github/workflows/deploiement.yml:75` et `:80`). Le dépôt est **public** : ces lignes atterrissent dans le log du run GitHub Actions, lisible par n'importe qui, conservé 90 jours. Aujourd'hui elles portent des identifiants d'espace ; demain une trace du module socle y publierait un nom de client.
- **Purge des clés qui traînent** : `mailsJournal` garde 300 entrées avec 2 000 caractères de corps (`server/index.js:100-106`), et les liens `#entreprise=CODE` portant `k` n'ont cessé d'être envoyés que le 12 septembre 2026. `tour_liens` garde en clair, **sans expiration**, `{t, k, n, a, m, e}` — clé d'équipe ET mot de passe provisoire — dans le `localStorage` de chaque navigateur où la Tour a été ouverte (`tour.html:3469, 3527, 3536`). Le serveur est déjà déclaré source de vérité du lien : lire à la demande plutôt que mémoriser, et ne jamais stocker `m`.
- `crypto.getRandomValues` à la place de `Math.random()` pour les **nouveaux** tirages de clé d'équipe (`tour.html:3533-3535`).
- `espaceCleOk` délègue à `cleEquipeVerdict` — une seule comparaison dans tout le fichier.
- **Sauvegardes hors du VPS**, conçues ici et pas « en même temps que la bascule » : `backup()` de `node:sqlite` (présent dans les exports, vérifié) → chiffrement **hybride** (AES-256-GCM par sauvegarde, clé de session enveloppée par RSA-OAEP — RSA seul plafonne à ~190 octets utiles, il ne chiffre pas un fichier de plusieurs Mo) → dépôt chez un tiers. La moitié privée **n'est pas sur le VPS**. Propriété qui compte : **le VPS écrit des sauvegardes qu'il ne peut pas relire**.
- **Séquestre de la KEK** et **une restauration d'épreuve réussie sur une VM vierge, AVEC la clé du séquestre.** Tant que ce test n'a pas réussi une fois, l'étape 8 est fermée. Une restauration non testée est une intention, pas une sauvegarde.
- Réconcilier `install.sh` avec la production (Caddy vs nginx) — sinon une réinstallation ne reproduit pas la machine, et `trust proxy 1` suppose exactement un intermédiaire (`server/index.js:45`).

**Comment on le prouve :** la restauration d'épreuve rend un `base.db` dont on compte les lignes ; le parc est un **tableau nominatif** dans la Tour, pas un compteur agrégé ; les textes sont relus contre la liste de §5, `apercu/` compris.

**Retour arrière :** aucun geste — ce sont des corrections vraies dans les deux mondes. ⛔ **Sauf le courriel** : un courriel envoyé ne se reprend pas. C'est la seule pièce irréversible du chantier, et c'est une raison de plus de la traiter en premier plutôt qu'en dernier.

**Pour ELAN :** rien de visible, sauf le courriel de préavis et — si leur espace est encore sur la clé partagée — un code à six chiffres à saisir une fois.

---

### Étape 1 — Le socle serveur, déployé et inerte

**On livre :** `server/socle.js` (ouverture par entreprise, PRAGMA, schéma, KEK/DEK, AAD, upsert, allocation de `seq`, journal), `server/op-socle.js` (les routes), le contrôle de double déclaration au démarrage, l'arrêt propre SIGTERM, le troisième plafond anti-abus, le journal `diagnostic` **chaîné par empreinte** (chaque ligne porte le sha256 de la précédente, l'ancre du jour part par courriel) — parce qu'un journal écrit par celui qu'il surveille, sur la machine qu'il surveille, n'est opposable à personne.

**Comment on le prouve :** un banc neuf dans `tests/test-71x.js` sur le modèle de `tests/test-641.js` — **la seule suite qui lance le vrai serveur, isolé (configuration, données et port à lui), et lui parle en HTTP**, et qui ne vise jamais `api.teamop.fr`. Il couvre au minimum : `maj_le=0` refusé ; égalité d'empreinte = no-op ; égalité avec empreintes différentes = `conflit` ; `seq` monotone sous 200 pousses concurrentes ; le sha d'une entreprise présenté avec le jeton d'une autre → **404** ; un `app_id` inconnu ouvre une **ligne neuve**, jamais la reprise d'une existante ; `socle-annuaire.db` sans `t` → **zéro occurrence** dans le source.

**Retour arrière :** `socle.actif: false` dans `/opt/teamop/config.json` — donc **sans push, donc sans déploiement**. Le socle existe et ne sert pas.

**Pour ELAN :** rien. Aucune route n'est lue par personne.

---

### Étape 2 — Le convertisseur et sa preuve, sur la bêta, drapeau éteint

**On livre :** `opDecomposer(db) → lignes` et `opRecomposer(lignes) → db` dans `beta.html`. C'est ici que vivent l'éclatement des box (stock, **marques de retrait**, arrivages, passages), les dictionnaires par clé, les réglages en bloc (phase A), les `id` donnés aux quatre tableaux qui n'en ont pas, et la conversion de `db._tombes` en lignes.

⛔ **C'est le point le plus dangereux du chantier.** Il touche 83 clés `db.*` dont **aucune n'est déclarée** : `collsFusion` (`app.html:6024`) prend « toute clé qui se trouve être un tableau ». Un inventaire bâti sur `COLLECTIONS_DONNEES` (27 entrées) ou sur les 28 de `migrate()` rate `boxDecisions`, `produitsDistincts`, `bonsRemise`, `interventionsArchive`, `indispos`, `activites`, `mailSent`.

**Comment on le prouve** — quatre bancs, tous mécaniques :
1. `opRecomposer(opDecomposer(db))` **identique** (JSON à clés triées) à `db`, pour (a) le semis, (b) une base synthétique portant les 83 clés relevées, (c) la base réelle d'ELAN exportée par `exportData()` (`app.html:25678`) sur un appareil — **jamais commitée**.
2. La suite **énumère les clés de `db`** et refuse une collection non classée. La règle implicite devient explicite sans devenir une liste blanche, qui raterait en silence ce qui sera créé demain.
3. ⛔ **Banc de PAGINATION** : projeter la base d'ELAN, découper en pages de 400, appliquer page par page en glissant un `save()` entre chaque, **exiger zéro `box_stock supprime_le`** en sortie. Sans lui, une box de 200 lignes dont 60 seulement sont arrivées fait poser 140 marques de retrait par `estampiller()` au premier geste du technicien. C'est la panne du 15 septembre par la porte d'à côté, et le seul banc « aller-retour complet » y est structurellement aveugle. ⛔ Corollaire à écrire : `opRecomposer` **MERGE** les lignes dans la box existante et ne reconstruit jamais le stock depuis une page ; `db` n'est remplacé (`_dbGen++`, `ombreRelever()`) qu'après la dernière page.
4. ⛔ **Signature canonique dédiée** pour le contrôle de l'étape 5 : clés triées des deux côtés, `_ms` réduit à une liste `pid:ts` triée, **même code des deux côtés**. On ne réutilise **pas** `baseSignature` (`app.html:6191`) : elle inclut `recEmpreinte(r._ms)`, un FNV-1a sur `JSON.stringify`, donc **sensible à l'ordre d'insertion des clés** — ordre reconstruit par `msElaguer` et par la fusion. Deux appareils au stock identique produiraient deux empreintes différentes, le contrôle serait bruyant dès le premier jour, et on finirait par le débrancher. Or c'est le seul garde-fou du chantier.

**Retour arrière :** le drapeau est éteint, rien n'est branché. Zéro geste.

**Pour ELAN :** rien.

---

### Étape 3 — Les pièces jointes, seules

**On livre :** `POST/GET /api/op/fichier`, table `fichier`, déduplication sha256, et côté client : toute pièce > 1 Ko part au VPS, la ligne poussée porte `{f:'<sha>'}`.

⛔ **La substitution se fait AU BORD DU TRANSPORT, jamais dans `db`.** La base locale garde ses blobs. Sinon chaque enregistrement à pièce jointe change d'empreinte (`recEmpreinte`, `app.html:6040`), reçoit un `_m` neuf et gagne toutes les fusions — 220 interventions re-tamponnées d'un coup, battant le travail en cours des collègues.

⛔ **Cette étape est BLOQUANTE pour toutes les suivantes.** Tant qu'elle n'est pas faite, un enregistrement portant `horsNuage` / `photosHorsNuage` / `champsHorsNuage` **ne se pousse pas** : le pousseur le retient, et l'appareil qui détient la pièce la téléverse d'abord. Sans ça, l'amputé et le complet arrivent au même `maj_le` et c'est une loterie.

**C'est l'étape qui gagne seule.** ELAN repasse très en dessous du plafond Firestore, et les photos **se partagent enfin** — aujourd'hui `syncAlleger` les retire de la copie poussée et elles ne quittent jamais l'appareil qui les a prises. Si tout s'arrêtait là, on aurait quand même réglé quelque chose de réel.

**Comment on le prouve :** suite verte ; mesure au navigateur sur `beta.html` d'un dépôt puis d'une relecture ; place disque du VPS **mesurée avant**, pas estimée ; les textes juridiques de §5 sont **déjà partis** — la première donnée client posée sur le VPS est celle qui rend la clause fausse, pas la dernière.

**Retour arrière :** aucune donnée n'est déplacée, seulement recopiée. Couper le drapeau ; la ligne repart comme avant.

**Pour ELAN :** **ça répare quelque chose chez eux** — la base redescend, et une photo prise par Alexis devient visible par Justin. C'est le seul argument qui autorise à toucher `app.html` à ce stade, et il faut quand même **la phrase de Justin**.

---

### Étape 4 — Double écriture, longue, lecture toujours Firestore

**On livre :** l'appareil écrit Firestore comme aujourd'hui **et** pousse ses lignes sur `/api/op/pousser`. ⛔ **La lecture reste 100 % Firestore.** Le VPS n'est lu par personne, sauf par le contrôle. `sauvegardeDeposer` est rebranché **dans ce commit**.

Toutes les gardes de l'ancien monde restent armées en même temps que les neuves : `syncManque`, `_nuageIllisible`, `miseDeCote`, `syncRegreffer`, `_dbGen`, `_syncTs`.

**Le contrôle, chaque nuit :** l'appareil calcule la signature canonique et appelle `GET /api/op/etat` ; le serveur recompose la même depuis ses lignes. Toute différence lève une alerte dans la Tour **avec la collection et le nombre**. ⚠️ Le comparateur serveur↔Firestore (qui déchiffre le document avec le `k` d'`espaces.json`) sert de **second regard**, jamais de référence : le document Firestore est la sortie de `syncAllegerNuage`, donc amputé de ses pièces jointes — il produirait une divergence permanente sur chaque enregistrement à photo. Il refuse tout espace marqué `clePerimee` (`server/index.js:4194`), tout espace hors annuaire, et ⛔ **n'écrit jamais sur un déchiffrement `null`** — `null` veut dire trois choses (mauvaise clé, pas de décompression, bloc abîmé) et jamais « base vide ».

**Durée : au moins deux semaines pleines, et jamais moins de SEPT JOURS CONSÉCUTIFS sans divergence.** C'est la marche la plus longue **par choix** : son retour arrière est gratuit, donc on peut y rester un mois.

**Comment on le prouve :** les quatre preuves du rituel, plus le compteur de divergences à zéro sept jours d'affilée, plus le profil de charge **mesuré** (req/min par espace, latence de `pousser`) — aujourd'hui le serveur n'a **aucune métrique de latence**, il faut la poser ici.

**Retour arrière :** un drapeau **serveur** par espace coupe la seconde écriture. Firestore n'a jamais cessé d'être la vérité et n'a jamais cessé d'être à jour. Coût : une requête. Les lignes déjà déposées ne gênent personne puisque personne ne les lit.

**Pour ELAN :** rien de visible, hors la consommation réseau. ⛔ **Et c'est ici qu'on prend les photos de référence** : un `exportData()` horodaté sur **au moins deux appareils différents**, rangé hors du dépôt. Sans elles, l'étape 7 n'a pas de preuve (voir pourquoi plus bas).

---

### Étape 5 — Bascule de la lecture, la bêta d'abord

**On livre :** l'appareil lit `/api/op/depuis` + long-poll, et **continue d'écrire dans Firestore**.

⛔ **Le drapeau est SERVEUR (`entreprise.lecture`), par espace, jamais côté client.** Un retour arrière qui demanderait de publier une version d'application et d'attendre que vingt téléphones se mettent à jour n'est pas un retour arrière, c'est une panne longue.

⛔ **Pas de bascule par collection.** Les trois architectures proposaient un ordre de migration par collection ; un drapeau par espace le rend incohérent — les 14 autres collections de `COLLS_GARDEES` ne rendraient plus rien, ou il faudrait lire deux sources et les fusionner, ce qui réintroduit l'ambiguïté que le modèle ligne à ligne supprimait. **On ne bascule la lecture qu'une fois TOUTES les collections en double écriture.** C'est plus sûr et ça ne coûte que du temps.

**Quatre conditions avant de basculer un espace**, réécriture des quatre marches du 11 septembre :
(a) tous ses appareils parlent au VPS — constaté par une **liste nominative** d'`appareil.vu_le` et par les **comptes actifs vus dans les 14 jours**, jamais par un compteur ;
(b) l'espace est dans l'annuaire ;
(c) il n'est pas sur la clé partagée ;
(d) sept jours de signatures identiques.
Une seule fausse = on ne bascule pas.

**Comment on le prouve :** bêta d'abord, plusieurs jours, mesurée au navigateur. Puis `app.html` — ⛔ **sur une phrase de Justin pour CE changement-là**, avec les quatre preuves chiffrées. ⛔ Et **les deux phrases fausses d'`app.html` voyagent dans CETTE version** (`app.html:7408` et `app.html:25319`, §5) : elles font partie du changement, pas de l'habillage.

**Retour arrière :** `entreprise.lecture='firestore'` remet l'espace sur Firestore à la requête suivante, et Firestore est à jour à la seconde près parce que la double écriture n'a **pas** été arrêtée. C'est précisément pour ça qu'on ne l'arrête pas en même temps.

**Pour ELAN :** la synchro devient plus vive (plus besoin de réécrire 780 Ko chiffrés par geste) et le stock des box cesse d'avoir des surprises. Un incident visible possible : le long-poll tombe à chaque déploiement serveur — indolore mais **visible**, ce qu'il n'était pas.

---

### Étape 6 — Le miroir, une semaine

**On livre :** rien. On regarde le compteur de divergences rester à zéro, les compteurs de refus (`non_date`, `conflit`, `horlogeAvancee`) et la charge.

**Retour arrière :** rien n'a changé.

**Pour ELAN :** rien.

---

### Étape 7 — Relecture depuis les appareils, contre les photos prises avant

**On livre :** un écran de la bêta qui télécharge tout par `/depuis` et compare **champ à champ**, box par box, numéro par numéro, pièce par pièce.

⛔ **La correction du piège de circularité que les trois architectures avaient.** Depuis l'étape 5, le `db` de l'appareil **EST** la recomposition du VPS : comparer le `db` vivant au VPS, c'est comparer le VPS à lui-même. La relecture se fait contre les **`exportData()` horodatés pris à l'étape 4**, sur au moins deux appareils.

⛔ **Et elle compte des PIÈCES, pas des lignes.** Un contrôle qui compte des enregistrements ne peut pas voir disparaître le **contenu** d'un enregistrement : l'intervention est là, il lui manque ses signatures. On compte les `docs[].data` non vides, les `photos[]`, les champs `signature*`.

⛔ **Chaque appareil DÉPOSE une attestation** (`POST /api/op/atteste`), avec ses compteurs et le nombre de pièces qu'il détient localement. La Tour affiche « 9 appareils sur 12 ont attesté » et **nomme les trois manquants**. On ne ferme pas la porte sur un chiffre agrégé, on la ferme sur une liste nominative.

**Comment on le prouve :** zéro manquant, sur les deux exports, et la liste d'attestations complète.

**Retour arrière :** encore possible — Firestore est toujours écrit.

**Pour ELAN :** rien, sauf qu'on leur demande d'ouvrir l'application sur les appareils qui n'ont pas attesté.

---

### Étape 8 — Retrait de Firestore

⛔ **C'est la seule étape sans retour arrière.** Dans l'ordre : couper l'écriture Firestore ; retirer `syncAlleger` / `syncAllegerNuage` / `syncRegreffer` / `syncManque` / `COLLS_GARDEES` / `_syncTs` / `NUAGE_BUDGET` / `NUAGE_ENC_MAX` ; retirer `/api/fb/jeton`, `fbUidEquipe`, `fbRevoquerEquipe` — **après** avoir vérifié que `/api/monitor/op/couper` est bien appelée par les quatre portes.

⛔ **ET SURTOUT PAS `firestore.rules`. CE FICHIER NE SE SUPPRIME PAS — ON N'EN RETIRE QUE DEUX BLOCS**, `match /elan_teams` et `match /elanB_teams`. Cette ligne a dit le contraire jusqu'au 20 septembre 2026, et la correction vivait 200 lignes plus bas, dans l'audit (point 5) — c'est-à-dire nulle part pour qui exécute l'étape en la lisant. **Le même fichier gouverne le PORTAIL CLIENT** : `espace.html` tourne entièrement sur le projet `elan-gestion` (`firebase.auth()` + `teamop_requests` / `teamop_threads` / `teamop_news`, `firestore.rules:44, 50, 59`), et c'est aussi la fabrique de contrat. Le supprimer refuserait toutes ces collections d'un coup, le jour même, sans retour arrière — l'étape 8 étant justement la seule qui n'en a pas.

⛔ **ET FIREBASE NE S'ÉTEINT PAS : OP MESSAGES VIT DESSUS**, sur un SECOND projet, avec ses propres règles (`firestore-opmessages.rules` — `op_users`, `op_companies`, `op_channels`, `op_calls`) et 12 200 lignes de `messages.html`. Rien dans ce plan ne le touche, et rien ne doit le toucher. Ce qui quitte Firestore à l'étape 8, c'est **la base d'OP GESTION, et elle seule.**

⚠️ **Conséquence juridique, à ne pas inverser** : §5 disait de supprimer la ligne Google Ireland de `sous-traitance.html:162-166`. **C'est faux.** Google reste sous-traitant — pour le portail client et pour OP MESSAGES. On **réduit le périmètre déclaré** à ces deux-là, on ne retire pas le sous-traitant. Idem `mentions-legales.html:52`, à réécrire en distinguant les applications. Le document `elan_teams` se supprime **30 jours plus tard**, pas le jour même, et dans un commit séparé.

⛔ **La clé d'équipe NE SE RETIRE PAS du client.** Ce n'est plus la clé de chiffrement, mais c'est la preuve d'identité de six routes (`sauvRefus` `server/index.js:2584`, `/api/espaces/comptes`, `/api/espaces/lien`). Un « nettoyage » couperait l'authentification de six routes d'un coup.

⛔ **`SAUV_DIR` a une date de fin écrite** : il cesse d'être alimenté sous l'ancienne clé le jour de l'étape 5, et il est effacé 30 jours après la relecture de l'étape 7 — pas « plus tard ». `/api/espaces/sauvegarde/lire` ferme le même jour. Une donnée gardée sous deux clés en même temps se compte deux fois dans l'inventaire d'une violation.

**Pour ELAN :** rien de visible, si tout ce qui précède a été fait.

---

### Étape 9 — Lever les plafonds, un par un

`journal` 500, `interventionsArchive` 500, `mailSent` 200, arrivages 40, passages 200, `MS_MAX`, `TOMBE_MAX`/`TOMBE_TOTAL`.

⛔ **Aucun plafond n'est levé avant que la purge serveur qui le remplace n'existe**, par âge, par collection, à la durée annoncée, avec son courriel de préavis. Lever le plafond du journal en se croyant généreux crée une conservation sans fin d'un registre de présence — chaque ligne porte `userId` et `userNom`, et la composition mesurée chez ELAN était de **443 lignes de « Connexion » sur 500**.

⛔ **Chaque plafond levé change le comportement d'un écran qui comptait dessus.** Un par un, en vérifiant qui lit la collection : la suppression en lot a déjà déduit « jamais connecté » d'un journal plafonné, et aurait supprimé un technicien en congés.

⛔ **Et ça change ce que `localStorage` doit encaisser.** `save()` écrit toute la base dans un `try/catch` dont la seule réponse est un toast qui parle de photos (`app.html:6425`). Avec les pièces jointes partagées et les plafonds levés, la base locale grossit **sur des téléphones de terrain**. À mesurer avant, pas à découvrir : poids local par collection sur un appareil réel, place restante, et faire du dépassement de quota une panne **visible et nommée**.

---

## 5. Juridique, et ce qu'on dit aux clients

**Onze phrases publiques ou contractuelles deviennent fausses.** Trois engagent juridiquement, deux sont affichées dans l'application, et toutes existent **en double** dans `apercu/`, servi publiquement à une URL indexable.

| Fichier | Ligne | Ce qui devient faux |
|---|---|---|
| `pourquoi.html` | 102 | « Personne d'autre que votre équipe n'y accède » — la plus directement contredite |
| `tarifs.html` | 248, 84 | « chiffrement **de bout en bout** » — le terme a un sens précis, il devient faux |
| `index.html` | 319 | « vos données ne croisent jamais celles des autres » — reste vrai **si** le cloisonnement par fichier est tenu |
| `elan.html` | 224-225 | « illisible par les autres » — c'est le texte qu'a sous les yeux le client en production |
| `espace.html` | 648 | FAQ de l'espace client |
| ⛔ `espace.html` | **762** | **Ce n'est pas une page, c'est une FABRIQUE DE CONTRAT.** Le document remis au client. Il dit « chiffrées » et « ne sont jamais supprimées », deux affirmations qui deviennent fausses ou contradictoires. Il devra être **régénéré pour les clients existants**, et `espace.html` ne partage aucun code avec l'application : rien ne propagera la correction. |
| `mentions-legales.html` | 73 | « chiffrées (AES-256) » — **clause de CGV, pas slogan.** Elle reste vraie uniquement si le chiffrement au repos est réellement en place le premier jour |
| `mentions-legales.html` | 52 | « Données des applications : Google Firebase » — mention légale obligatoire inexacte à partir de l'étape 5 |
| `confidentialite.html` | 51 | double faux : l'hébergeur change, ET l'accès cesse d'être restreint aux comptes de l'équipe |
| ⛔ `app.html` / `beta.html` | **7408** | « Le serveur TEAM OP […] **il ne peut pas les lire**, seul cet appareil le peut » — elle **nomme le serveur qui lira** |
| ⛔ `app.html` / `beta.html` | **25319** | « illisibles, **même par quelqu'un qui aurait accès au serveur** » — affichée exactement là où l'administrateur peut changer sa clé, donc à l'endroit où on lui fait croire que ce geste le protège de nous |
| `guide-firebase.html` | 94 | page entière sans objet après l'étape 8 |
| `sous-traitance.html` | 162-166 | ligne Google Ireland — à supprimer à l'étape 8, vraie jusque-là |
| `sous-traitance.html` | 168-172 | ligne IONOS — le périmètre déclaré **n'inclut pas** les données métier |
| `app.html` | 6455-6457 | le **commentaire de code** qui porte la règle. Le prochain agent le lira comme en vigueur et raisonnera faux. À réécrire **sans toucher aux deux constantes qu'il surplombe** |

⛔ **Le site et les pages légales sont des fichiers séparés sur `main` : ils partent AVANT l'app.** Les deux phrases d'`app.html` attendent la phrase de Justin — donc elles voyagent dans **la version qui bascule la lecture**, et c'est à dire explicitement quand on lui demande. Le risque, sinon, est mécanique : le site juste, l'application qui ment pendant des semaines, à l'écran le plus sensible.

**Ce qu'il faut créer, et qui n'existe pas :**

1. ⛔ **Un AVENANT aux instructions documentées, accepté par le client — pas seulement un préavis.** `sous-traitance.html:113` engage TEAM OP à « n'agir que sur vos instructions ». **Lire la base d'un client pour diagnostiquer est une finalité nouvelle** : sans instruction documentée, c'est un manquement à l'art. 28.3.a, indépendamment du changement d'hébergeur. Et `sous-traitance.html:154` donne au client le droit de **s'y opposer et de résilier sans frais** : il faut une réponse écrite à « ELAN s'y oppose ». Avant l'étape 5, cette réponse ne coûte rien ; après, elle coûte cher.
2. **Le registre des traitements** (`sous-traitance.html:126`) — inexistant, vérifié par grep.
3. **Une procédure écrite de notification de violation.** `sous-traitance.html:122` engage à 48 h, plus strict que les 72 h du RGPD. « En avoir pris connaissance » suppose de pouvoir le savoir. Aujourd'hui rien ne détecte un accès anormal : le délai n'est pas tenu, il n'est **jamais déclenché**.
4. **Un chemin d'extraction / rectification / effacement des enregistrements d'UNE personne** dans la base d'une entreprise. Aujourd'hui l'assistance se limite à « ouvrez l'app et exportez » : le serveur ne peut rien extraire. Demain il le peut, donc le refuser n'est plus défendable.
5. **Trancher la qualification** sous-traitant / responsable : `confidentialite.html:34` déclare TEAM OP responsable de traitement, `sous-traitance.html:73-77` le déclare sous-traitant. La contradiction existe déjà ; un accès décidé unilatéralement par TeamOP donne du poids à la première lecture.
6. ⛔ **Le périmètre transmis à Anthropic ne s'élargit PAS.** `agent-devis.js` s'interdit aujourd'hui ce qui identifie le client. Le serveur ayant toute la base sous la main, il devient trivial d'« enrichir » le contexte. Chaque champ ajouté est un transfert hors UE à redéclarer et 30 jours de préavis. Et `expliquer`/`proposer` (`server/index.js:1500`, `ROUTES_COMMUNES`) doivent **sortir des routes communes** : elles envoient des traces d'incident à Anthropic et sont accessibles à un compte limité à OP MESSAGES.

**La phrase qu'on écrit à la place**, et qu'on ne maquille pas : *« Vos données sont chiffrées au repos (AES-256-GCM) sur un serveur situé en France, dans un espace de fichiers isolé par entreprise. TEAM OP peut les déchiffrer pour vous dépanner : cet accès est nominatif, motivé, limité dans le temps, et la liste de ces accès vous est consultable depuis votre espace. Le chiffrement protège une sauvegarde déportée, un disque ou un instantané ; il ne protège pas d'un serveur compromis. Les en-têtes techniques — nom de collection, identifiant, horodatage — restent en clair ; les contenus sont scellés. »*

---

## 6. Sécurité, parce que le serveur lit

1. **Chiffrement au repos** — KEK hors de l'arborescence de données et injectée par systemd, DEK par entreprise, AAD incluant les métadonnées d'arbitrage, témoin de clé au démarrage, séquestre en deux exemplaires, rotation par `v1:`. Détail en §2.3.
2. ⛔ **Ce que ça ne protège PAS : un processus compromis, qui a la KEK.** Le dire ainsi, pas autrement — sinon on réécrit dans l'autre sens la phrase qu'on est en train de corriger.
3. ⛔ **Ce qui est DÉJÀ dû, avant même les données métier** : les mots de passe d'application IMAP/SMTP de nos clients sont **en clair sur le disque** (`server/index.js:501`, `server/mail.js:75`), et `espaces.json` porte la clé AES de chaque entreprise en clair. La bascule ne crée pas ce manque, elle le rend **impayable**. La brique de chiffrement au repos leur est due aujourd'hui.
4. **Trois niveaux d'accès** — l'appareil (jeton, ne voit que son entreprise, et le fichier séparé fait qu'il n'y a pas de `WHERE` à oublier) ; la Tour (`monPatronStrict`, aperçu sans contenu par défaut, contenu seulement après motif + session 30 min) ; `root` sur le VPS, qui a tout. Le troisième ne se réduit pas par la cryptographie, seulement par `User=teamop`, la journalisation chaînée et la rotation.
5. **Journal d'accès** — table `diagnostic`, chaînée par empreinte, ancre quotidienne envoyée hors VPS, jamais plafonnée par nombre (`monLog` est plafonné à 300 entrées, `server/index.js:1447-1449` : un journal de sécurité qui s'auto-efface au premier incident est pire que pas de journal). ⛔ **On journalise qui a ouvert quelle entreprise, quand et pourquoi — jamais ce qui a été lu.** Le terme de recherche est **haché avec un sel par entreprise** : vérifiable par le client, illisible par nous.
6. ⛔ **Compter les lectures dans SQLite, pas en mémoire.** Une aspiration par `/api/op/depuis?seq=0` avec un jeton volé est, pour le serveur, indiscernable d'une première synchro. Alerte simple : un appareil qui retire plus d'un quart des enregistrements de l'entreprise **en dehors** d'une première synchro déclarée.
7. **Révocation** — par appareil (`appareil.revoque_le`, consulté **avant** `sauvRefus`), et par entreprise (`couper`, immédiate). C'est un gain net : côté Firebase rien n'est instantané, jusqu'à **une heure**, parce qu'une règle n'évalue que la signature et l'échéance du jeton. ⚠️ **Mais voir §7 : la révocation par appareil n'est durable que si la clé d'équipe tourne.**
8. **Rotation de la clé d'équipe** — après l'étape 5, `k` n'est plus une clé de chiffrement, c'est un **mot de passe d'entreprise**. Elle doit devenir un geste **ordinaire** de la Tour, qui réécrit `espaces.json` par `espacesEcrire()` et **révoque d'un coup tous les jetons d'appareils**. Et elle s'inscrit dans la procédure « un salarié part », au même titre que la suppression de son compte.
9. **Journaux systèmes** — `journalctl -u teamop-api` devient un traitement à part entière. `server/socle.js` a le droit d'écrire **collection et id, jamais un corps, jamais un champ** — modèle déjà appliqué (`server/index.js:2166`, et le masquage d'adresses en 92-97). Et les refus du socle ne portent **qu'un code**, jamais l'enregistrement : `/api/bug` écrit `msg` et `stack` dans un fichier **sans purge par âge**, les envoie par courriel, les archive dans `mails-envoyes.json` et met la boîte support en copie.
10. **Sauvegardes** — quotidiennes, hybrides, déposées hors du VPS, plus une **restauration d'épreuve mensuelle qui échoue bruyamment**. Aujourd'hui la durabilité est portée par Google ; après, le VPS est le seul exemplaire.

---

## 7. Les risques restants, nommés

1. ⛔ **La clé et les données sur la même machine.** Le chiffrement protège un disque volé, un instantané, une sauvegarde égarée — pas un serveur compromis, qui est le cas le plus probable. La séparation actuelle (clé sur le VPS, chiffré chez Google) était organisationnelle, mais elle était **réelle** ; on la supprime volontairement et il n'y a rien d'équivalent à mettre à sa place sur une seule machine. Un HSM ne change rien tant que le processus qui déchiffre tourne ici.
2. ⛔ **Le VPS devient le point unique de panne du travail des clients.** Aujourd'hui s'il tombe, la synchro continue chez Google ; après, personne ne travaille à plusieurs. Une machine, un processus, un seul `app.listen` (`server/index.js:6891`), aucun cluster. **La réponse écrite à « le serveur est mort, on fait quoi » n'existe toujours pas** — ce n'est pas du code, c'est une procédure, un contact, un délai annoncé. Ce plan ne la fabrique pas ; il rend son absence chère.
3. **La révocation d'un appareil n'est pas durable sans rotation de clé.** Un technicien parti garde la clé d'équipe : elle s'obtient par `/api/espaces/connexion` contre l'identifiant et le mot de passe d'un salarié, par `/api/espaces/ouvrir` contre le code d'accès, depuis `elan_sync_secret` sur n'importe quel appareil, ou depuis `tour_liens`. Il se ré-enrôle sous un `app_id` neuf. On atténue (expiration, liste d'appareils visible par l'administrateur **dans l'application**, courriel à l'entreprise à chaque enrôlement, compteur d'échecs persistant) ; on ne ferme qu'avec la rotation. **Et la fuite est plus grosse qu'avant** : le socle monte les photos et signatures qui n'avaient jamais quitté les téléphones.
4. **`node:sqlite` est expérimental** — l'avertissement s'affiche au chargement, vérifié sur v22.22.2. C'est un pari sur une API interne à Node pour porter les données de clients payants. Mitigations : surface minuscule, tout dans `server/socle.js`, version **mineure de Node figée** dans le déploiement (`install.sh` installe « setup_22.x » sans la figer), banc qui relit la base après chaque montée. Le repli, `better-sqlite3`, est un module natif à compiler au déploiement : son propre risque.
5. **Le convertisseur est le point le plus dangereux, et il n'existe nulle part.** 83 clés `db.*`, aucune déclarée. Un aller-retour non identique sur une collection oubliée perd des données sans bruit. Les quatre bancs de l'étape 2 sont ce qui sépare ce plan d'un pari.
6. **La période la plus risquée est aussi la plus longue, par choix.** Pendant les étapes 4 à 7, deux transports coexistent : deux fois plus de chemins d'écriture, et toutes les gardes de l'ancien monde armées en même temps. On accepte d'allonger l'exposition pour garder un retour arrière à une requête. C'est un arbitrage, pas une absence de risque.
7. **Le temps réel devient du code à nous.** `onSnapshot` était gratuit, éprouvé et maintenu par Google. Un long-poll coûte des connexions tenues et des requêtes au repos, et son coût réel n'est **pas mesuré** — c'est un calcul.
8. **Le journal d'écritures est une seconde copie des données personnelles**, avec sa propre durée, sa propre obligation d'effacement et son propre poids — **non mesuré** tant qu'ELAN n'y tourne pas. On le borne (corps purgé à 90 jours, métadonnées gardées), ce qui réduit le diagnostic au-delà de trois mois. C'est un arbitrage assumé.
9. **Les métadonnées en clair parlent.** En-têtes techniques + `id` parlants (`cat_<slug>`, `app.html:17470` ; `produitsDistincts` dont l'`id` est un nom, `app.html:17767`) : un fichier volé sans la clé livre le catalogue et le rythme de travail. Petit, pas nul, et à écrire dans le contrat. Et **toute nouvelle colonne en clair est une décision de divulgation**, pas une optimisation : elle passe par une relecture et une mise à jour du registre.
10. **`dashLayout` en une seule ligne « dernier écrivain gagne »** : deux personnes qui réorganisent leur tableau de bord au même moment, l'une perd. C'est mieux qu'aujourd'hui, où retirer une tuile ne tient pas du tout. Ce n'est pas parfait.
11. **Un fichier par entreprise interdit toute requête transversale.** Un rapport « combien de box sur tout le parc » ouvre N fichiers. Confortable à dix clients, à rediscuter à deux cents.
12. **Le journal d'accès reste tenu par nous, sur la machine que nous administrons.** Le chaînage et l'ancre quotidienne rendent une suppression détectable ; ils ne la rendent pas impossible. Un client qui exerce sa clause d'audit devra nous croire sur parole pour la part `root`. C'est vrai de tout hébergeur, ça n'en est pas moins vrai ici.
13. ⛔ **Ce chantier ne règle RIEN de ce qui fait mal à l'ouverture** : 1 801 ms rien qu'à analyser 3,16 Mo d'`app.html`, `save()` à 90 ms par geste. Croire que sortir du document unique rendra l'application rapide serait se tromper de problème — ça la rend seulement capable de grandir.
14. **Le travail juridique est sur le chemin critique et ce n'est pas du code.** S'il glisse, c'est la bascule qui attend, pas lui. Et `sous-traitance.html:47-51` porte un avertissement « projet de travail, à faire relire par un juriste » sur un document que `mentions-legales.html:91` déclare contractuel : garder les deux, c'est publier un contrat qu'on déclare soi-même non relu.
15. **On ne sait pas encore ce que ça pèse.** Les chiffres de « 621 Ko » qui circulent mesurent trois choses différentes (clair, chiffré, tableau de chantier), et le dernier en date donne 465 Ko après la v661. Le journal, les versions, les pièces jointes enfin partagées et les plafonds levés vont tous dans le même sens. **Re-mesurer avant de dimensionner**, et vérifier la place disque du VPS avant l'étape 3 — pas découvrir le mur comme on a découvert celui du 1 MiB.

---

## 8. Estimation

Jours-homme d'ingénierie. **Le calendrier domine, et aucun effort ne le raccourcit.**

| Étape | Jours-homme | Calendrier imposé |
|---|---|---|
| 0 — Préalables (juridique, parc, VPS durci, sauvegardes, séquestre) | **5** | ⛔ **30 jours de préavis** avant l'étape 4 |
| 1 — Socle serveur inerte + bancs | **5** | — |
| 2 — Convertisseur + quatre bancs | **3,5** | — |
| 3 — Pièces jointes, seules | **3** | quelques jours de bêta |
| 4 — Double écriture + contrôle nocturne | **3** | ⛔ **≥ 14 jours**, dont 7 consécutifs sans divergence |
| 5 — Bascule de la lecture (bêta puis ELAN) | **2** | plusieurs jours de bêta |
| 6 — Miroir | **0** | ⛔ **7 jours** |
| 7 — Relecture + attestations | **2** | selon le parc |
| 8 — Retrait de Firestore + nettoyage | **2** | + 30 jours avant l'effacement du document |
| 9 — Levée des plafonds, un par un | **3** | — |
| **Total** | **≈ 28,5 jours-homme** | **9 à 11 semaines** |

**Pourquoi c'est plus que les chiffrages de départ** (16, 18 et 24 jours) : ce plan ajoute ce que les critiques ont montré manquant — le banc de pagination, la signature canonique, la conversion des marques de retrait, le séquestre et la restauration d'épreuve, la rotation de clé, l'avenant contractuel, les attestations par appareil, et l'extension d'`estampiller()` aux objets. **L'ancien chiffrage de 8 à 11 jours** (`CHANTIER:100`) portait sur l'option A — le serveur transporte du chiffré sans rien lire — et n'incluait ni la gestion de clé, ni le journal d'accès, ni les sauvegardes hors VPS, ni le juridique.

⚠️ **Ce chiffrage est une estimation, pas une mesure.** Le seul poste dont je connaisse le coût réel est le socle serveur ; le convertisseur est du code neuf sur 83 clés non déclarées, et il peut déborder.

---

## 9. Traçabilité — chaque faille bloquante et sa réponse

| Faille | Origine | Réponse | Où |
|---|---|---|---|
| Réglages/objets sans `_m` → refusés à jamais | critique socle #1, diag #2 | Phase A en bloc opaque ; phase B seulement après extension d'`estampiller()` aux objets, prouvée par `test-639` étendu | §3, étape 2 |
| `numMax` et `_tombes` détruits par la règle générique | critique socle #2 | Jamais des lignes : table `numero` par MAX, `supprime_le` fusionné par MAX par id | §3 |
| `horsNuage` : même `id`, même `_m`, deux contenus | critique socle #3, coffre #2 | Étape pièces jointes **bloquante** ; pousse retenue tant que la pièce n'est pas téléversée ; égalité avec empreintes différentes = **conflit**, jamais un départage | §2.6, étape 3 |
| Tombes indépassables sur les quatre tableaux sans `id` | critique socle #4 | `id` donné **dans `db`** avant de l'être dans le transport | §3 |
| `baseSignature` non canonique → contrôle impossible | critique socle #5 | Signature canonique dédiée, même code des deux côtés | étape 2 |
| `vide:true` recrée « OP Admin » chez un vrai client | critique socle #6, coffre #12 | Trois états, 503 si on ne sait pas ; le verdict de nouveauté reste Firestore jusqu'à l'étape 8 | §2.4, §3 |
| Suppression hors ligne perdue (tombe élaguée) | critique socle #7 | Le sortant porte le **verdict** ; une tombe ne s'élague pas tant que sa clé est dans le sortant | §2.7 |
| Synchro coupée puis rallumée → rien ne repart | critique socle #8 | Reconstruction du sortant par diff `db`↔`_ombre` au rallumage | §2.7 |
| Étape de relecture circulaire | critique socle #9 | `exportData()` sur deux appareils **avant** la bascule de lecture | étapes 4 et 7 |
| Drapeau par espace vs ordre par collection | critique socle #10 | Pas de bascule avant que **toutes** les collections soient en double écriture | étape 5 |
| KEK dans le même instantané que les données | critique socle-sécu #1, diag | `LoadCredential=` hors `/opt` + liste d'exclusion écrite | §2.3 |
| Pas de séquestre de la KEK | critique socle-sécu #2, diag #10 | Séquestre en deux lieux + restauration d'épreuve avec la clé du séquestre avant l'étape 8 | §2.3, étape 0 |
| Pièces jointes non chiffrées, et elles partent en premier | critique socle-sécu #3 | Même enveloppe, AAD `t\|sha` ; textes juridiques déplacés à l'étape 3 | §2.3, étape 3 |
| `/fichier/<sha>` sans entreprise, sha du corps cru | critique socle-sécu #4 | `t` du jeton, sha **recalculé**, refs par entreprise, banc 404 | §2.4 |
| `app_id` choisi par l'appareil | critiques socle-sécu #5, coffre | Alloué par le serveur ; départage jamais sur une valeur choisie | §2.4, §2.6 |
| Filigrane temporel comme file d'envoi | critiques coffre #1, diag #4 | File **explicite** persistée, vidée par l'acquittement | §2.7 |
| Repère de séquence survit à la perte de base | critique coffre #3 | Repère **dans `db`** + `depuis=0` forcé + pousse bloquée | §2.7 |
| `sauvegardeDeposer` se décroche à l'étape 8 | critique coffre #4 | Rebranché **dans le commit de la double écriture**, bloc chiffré par la clé d'équipe | §3, étape 4 |
| Compteurs de numéros divergents pendant la double écriture | critique coffre #5 | `numero` semée par MAX, réservation `MAX(dernier, plancher)+n`, plage pré-allouée | §2.7 |
| Pagination + `save()` = tombes de stock | critique coffre #6 | `opRecomposer` merge ; `db` remplacé après la dernière page ; **banc de pagination** | étape 2 |
| Refus appliqués sans `ombreRelever()` | critique coffre #7 | Même bloc synchrone, `_dbGen++`, `test-706` étendu | §2.6 |
| `sauvegardeRemettre` supprime `_m` | critique coffre #8 | Pose `_m=Date.now()` ; le toast compte les **acceptations** | §3 |
| Espaces hors annuaire / clé partagée traités en dernier | critiques coffre #9, diag #17 | Traités à l'**étape 0**, inventaire sur `cnxData`, Tour qui dit « je ne sais pas » | étape 0 |
| Contrôle qui compte des lignes, pas des pièces | critique coffre #2, #10 | Compte les pièces + attestation nominative par appareil | étape 7 |
| `fusionnerBases` nourri d'un delta efface les réglages | critique diag #1 | On ne lui passe **jamais** un delta ; banc `db.entreprise.nom` survit | §2.6, étape 2 |
| Marques de retrait de `_ms` non converties | critique diag #3 | Ligne `box_stock supprime_le=_ms[pid]` pour chaque orphelin ; `_tombes` converties | §3, étape 2 |
| Plafonds levés côté serveur seulement → tombes de masse | critique diag #5 | Aucun plafond levé tant que le client l'applique ; des deux côtés, même version | §3, étape 9 |
| Deux états là où il en faut trois | critique diag #8 | Trois états partout, refus non parsable en JSON, `!r.ok` autant que le `catch` | §2.4 |
| SSE ne peut pas porter de Bearer | critique diag-sécu #1 | **Long-poll** | §2.5 |
| `kh` porteur permanent, révocation cosmétique | critique diag-sécu #2 | Expiration, liste d'appareils dans l'app, courriel, compteur persistant — et la rotation nommée comme **risque résiduel** | §6, §7 |
| Métadonnées d'arbitrage hors AAD | critique diag-sécu #3 | AAD = `t\|coll\|id\|maj_le\|supprime_le` | §2.3 |
| Journal append-only = conservation perpétuelle | critique diag-sécu #3 | Corps purgé à 90 jours, métadonnées gardées | §2.2, §5 |
| Anti-abus « exempté » qui n'existe pas | critique diag-sécu #4 | Troisième plafond nommé + quota par espace après la preuve | §2.4 |
| `annuaire.db` casse l'isolement structurel | critique diag-sécu #5 | Exception nommée, un accesseur, `t` obligatoire, banc à zéro | §2.2 |
| `revenir` écrit chez un client sans garde | critique diag-sécu #11 | Code à six chiffres par `cleCodeExiger`, visible au journal lisible par le client | §2.4 |
| `cherche` : terme de recherche = donnée personnelle | critique diag-sécu #12 | Haché avec sel par entreprise | §2.4 |
| Pas de middleware d'erreur, `NODE_ENV` absent | critique diag-sécu #8 | `NODE_ENV=production`, middleware terminal, `unhandledRejection`, rétention journald | étape 0 |
| `journalctl` publié dans un log public | critique coffre-sécu #8 | Retiré du workflow | étape 0 |
| Préavis ≠ accord | critiques coffre-sécu #10, diag-sécu #13 | Avenant aux instructions documentées **plus** préavis, et réponse écrite à l'opposition | §5 |
| `espaceCleOk` en `!==` vs `timingSafeEqual` | critique coffre-sécu #14 | Délégation à `cleEquipeVerdict` avant tout branchement | §2.4, étape 0 |
| `Math.random()` pour la clé d'équipe | critique diag-sécu #6 | `crypto.getRandomValues` pour les nouveaux tirages ; les anciennes attendent la rotation | étape 0 |
| `tour_liens` en clair sans expiration | critique diag-sécu #7 | Lecture à la demande, `m` jamais stocké, expiration | étape 0 |
| Fin de vie de `SAUV_DIR` non fixée | critique coffre-sécu #16 | Dates écrites : plus alimenté à l'étape 5, effacé 30 j après l'étape 7 | étape 8 |
| `mailSent` sans plafond à la fusion, corps complets | cartographie « données » | `id` à l'écriture + purge serveur 90 jours | §3 |

---

*Ce fichier est le plan qu'on exécute. Il ne remplace pas `CLAUDE.md`, qui porte les règles ; il ne remplace pas `REPRISE.md`, qui porte l'état des chantiers. Quand une étape change d'état, c'est `REPRISE.md` qui le dit — une conversation meurt, le dépôt reste.*

---
---

# ANNEXE — Ce qui manque encore à ce plan

*Rapport de la critique de complétude, rendu après le plan ci-dessus. Il n'a pas été fondu
dans le corps du document EXPRÈS : un plan qui absorbe ses propres critiques donne l'illusion
d'être complet. Les points bloquants ci-dessous sont ouverts tant que personne ne les a
tranchés par écrit.*

J'ai vérifié chaque axe dans le dépôt. Voici ce qui manque, par gravité.

---

## BLOQUANT — le plan ne peut pas s'exécuter tel qu'il est écrit

**1. `/api/op/session` gardé par `sauvRefus` REFUSE la bêta — donc tout le plan de validation est mort.**
`sauvRefus` commence par `if (ESPACES_INTOUCHABLES.includes(t)) return { code: 403 … }` (`server/index.js:2585`), et `const ESPACES_INTOUCHABLES = ['elan-gestion', 'elan-gestion-beta']` (`server/index.js:~2280`, cité en `server/index.js:2867, 2930`). Le plan écrit en §2.4 : « Garde : **`sauvRefus(t, kh)` LUI-MÊME**, pas une copie ». Conséquence mécanique : `beta.html`, dont `beta-build.js:12` pose `FB_TEAM='elan-gestion-beta'`, reçoit **403** sur la toute première route du socle. Or les étapes 2, 3 et 5 disent toutes « sur la bêta d'abord, mesurée au navigateur ». La bêta n'a pas de clé propre (c'est justement pourquoi elle est intouchable, `firestore.rules:121-126`), donc elle ne peut rien prouver au sens de `espaceCleOk`.
**À ajouter** : décider explicitement comment la bêta s'authentifie au socle — le plus propre est de réutiliser les comptes bêta portés par le serveur (`beta-comptes.json`, `server/index.js:1640-1674`) comme preuve, et de donner à la bêta son propre `base.db` sous un préfixe distinct, avec un banc qui interdit qu'une entreprise réelle y atterrisse. Sans cette décision écrite, l'étape 2 s'arrête le premier jour.

**2. `beta.html` est un FICHIER GÉNÉRÉ — on ne peut rien « livrer dedans », et la CI le refuse.**
L'étape 2 dit : « On livre : `opDecomposer(db)` et `opRecomposer(lignes)` **dans `beta.html`** ». Mais `beta.html` est produit par `beta-build.js` depuis `app.html` (`beta-build.js:7-61`), et `.github/workflows/verification.yml:72-80` régénère et **échoue si le diff n'est pas vide** (« beta.html ne correspond pas à app.html »). Tout code du socle s'écrit donc dans `app.html`, derrière un drapeau — c'est-à-dire **dans le fichier servi aux clients**, ce que la règle de Justin encadre.
Second effet, silencieux : `beta-build.js:8-9` remplace `'elan_` → `'elanB_` et `"elan_` → `"elanB_`. Les trois nouvelles clés de l'étape 2.7 (le sortant, le repère de séquence, le jeton d'appareil) **doivent être écrites avec le littéral `'elan_…'`** ou dérivées de `STORE_KEY`, sinon la bêta partage le jeton et la file d'envoi de la production. Le plan le dit pour le sortant, **pas pour le jeton ni le repère**.
**À ajouter** : « tout code socle vit dans `app.html` derrière `socleActif()` ; la bêta ne se distingue que par `beta-build.js` ; les trois clés neuves suivent la règle du préfixe, et `tests/test-637.js` les vérifie ».

**3. `ordres.json` — un sous-système entier d'écriture serveur→base client, totalement absent du plan.**
La Tour dépose des ordres (`server/index.js:2176-2263`), l'application les exécute et **écrit dans `db`** : `ordresVerifier()` (`app.html:7446-7490`) supprime des comptes (`db.users`, `db.usersSupprimes`) et **réécrit des `pwdHash`**, puis `save()` et acquitte par `/api/espaces/ordre-fait` (`server/index.js:2703`). Appelé au démarrage et au retour au premier plan (`app.html:29761`, `app.html:31291`). Deux routes serveur le servent (`/api/espaces/ordres`, `server/index.js:2683`).
C'est le **cinquième chemin d'écriture** dans la base d'un client, il est piloté par le serveur, et le plan ne le nomme nulle part. Trois conséquences : (a) c'est un `save()` déclenché **au chargement**, donc un `estampiller()` qui versera dans le sortant des lignes `users` que personne n'a touchées ; (b) une fois le serveur capable d'écrire (c'est tout le but du chantier), ce mécanisme devient redondant et devrait **disparaître** au profit d'un `/api/monitor/op/revenir`-like gardé par `cleCodeExiger` — sinon on garde deux portes d'écriture avec deux régimes de preuve ; (c) `ordresData[t]` est effacé à la suppression d'entreprise (`server/index.js:4932`) mais n'est pas dans la liste des choses que le socle reprend.
**À ajouter** : une ligne dans la table §3 (« ordres de la Tour → route socle gardée par code e-mail, retrait d'`ordres.json` à l'étape 8 »), et un banc qui interdit qu'un ordre exécuté nourrisse le sortant.

**4. `versionOk()` disparaît avec Firestore — et c'est le seul verrou qui empêche un appareil périmé d'ÉCRIRE.**
`firestore.rules:77` définit `versionOk()`, appliquée à l'écriture de `elan_teams` (`firestore.rules:103`) et de `elanB_teams` (`firestore.rules:129`). Le minimum se lit dans `teamop_config/version` (`firestore.rules:112`, lu par `app.html:6791`, appliqué par `versionMinAppliquer`, `app.html:30955`). CLAUDE.md décrit la fermeture du 11 septembre comme reposant précisément là-dessus : « v641 exigée (`teamop_config/version.min` = 641 dans Firestore, **pas seulement côté API**) ».
Le plan ne mentionne ni `teamop_config`, ni `versionOk`, ni `_versionBloquee`. Or la **condition (a) de l'étape 5** — « tous ses appareils parlent au VPS » — n'est atteignable que par ce levier, et le socle doit le réimplémenter : `/api/op/pousser` refuse sous `version.min`, avec un motif nommé et un écran qui le dit (règle « un refus ne se montre pas tout seul »).
**À ajouter** : `version.min` devient un champ de `socle-annuaire.db`, `/api/op/session` le rend, `/api/op/pousser` le fait respecter, et le retrait de `teamop_config` est une ligne de l'étape 8.

**5. L'étape 8 supprimerait Firestore alors que le PORTAIL CLIENT et OP MESSAGES en dépendent — et la conclusion juridique du plan est fausse.**
`espace.html` (le portail client, qui est aussi la **fabrique de contrat** que le plan cite en §5) tourne entièrement sur le même projet `elan-gestion` : `firebase.auth()` + `teamop_requests` / `teamop_threads` / `teamop_news` (`espace.html:269-278, 355, 483, 892`), gouvernés par `firestore.rules:44, 50, 59`. OP MESSAGES tourne sur un **second** projet Firebase avec ses propres règles (`firestore-opmessages.rules`, collections `op_users`, `op_companies`, `op_channels`, `op_calls`).
Donc : l'étape 8 dit « retirer `firestore.rules` » — cela casserait le portail client. Et §5 dit « `sous-traitance.html:162-166` ligne Google Ireland — **à supprimer à l'étape 8** » : **c'est faux**, Google reste sous-traitant pour le portail et pour OP MESSAGES. Idem `mentions-legales.html:52`, qui doit être réécrite en distinguant les applications, pas en supprimant Google.
**À ajouter** : l'étape 8 retire **`match /elan_teams` et `match /elanB_teams` seulement**, et le tableau juridique remplace « supprimer la ligne Google » par « réduire son périmètre déclaré au portail client et à OP MESSAGES ».

---

## GRAVE

**6. Aucune des routes qui font disparaître une entreprise n'efface le socle — et `renaitre` refabrique la genèse orpheline.**
`/api/monitor/espaces/renaitre` (`server/index.js:2948-2980`) efface `accesReg`, `comptesReg`, `espacesReg` et le document Firestore, puis coupe les sessions. Avec le socle, si `socle/<t>/base.db` survit, l'espace « reparti à neuf » **renaît complet** dès qu'un appareil se ré-enrôle — exactement la panne que le commentaire de `server/index.js:2970-2977` décrit. Même trou pour `/api/monitor/entreprise/supprimer` (`server/index.js:4818`), dont l'étape 4 énumère un par un les registres à vider (`server/index.js:4925-4939`, y compris `fs.rmSync(sauvDossier(t))` avec le commentaire « plus rien n'est enregistré nulle part doit rester vrai »), et pour `/api/monitor/clients/retirer` (`server/index.js:4565`).
Le plan écrit « Fermer une entreprise = effacer un fichier » (§2.2) mais **ne câble cette phrase à aucune de ces quatre routes**. C'est la même erreur de structure que les quatre portes de `fbRevoquerEquipe`, avec la même conséquence.
**À ajouter** : nommer les quatre routes, et un banc dans `tests/test-641.js` qui exige que toute route touchant `entFermes` ou `espacesReg` appelle l'accesseur de suppression du socle.

**7. `apercu-suppression` ne comptera pas ce qu'il va détruire.**
`/api/monitor/entreprise/apercu-suppression` (`server/index.js:4805`) et le courriel de confirmation (`server/index.js:4831-4845`) énumèrent 12 catégories — annuaire, comptes, copies de sauvegarde, boîtes mail, abonnés push, connexions, erreurs, écrans, comptes du site, mails… — **et aucune ne sera le socle**. C'est l'écran qui dit au patron l'ampleur **avant** qu'il tape le nom. Après la bascule, la ligne la plus lourde y manquera.
**À ajouter** : « N enregistrement(s), M pièce(s) jointe(s), X Mo » dans `entInventaire`, à l'étape 1, pas à l'étape 8.

**8. Remise à zéro et retraits en masse : pas d'atomicité multi-lot, et `syncManque` est retiré sans remplaçant.**
`remiseZero()` (`app.html:25537, 25620`) et le vidage de `COLLECTIONS_DONNEES` (`app.html:24952`) suppriment des collections entières ; `syncRetraitVoulu()` (`app.html:7388`) existe justement pour dire à `syncManque` « celui-là est voulu » (`app.html:7223-7239`). Le plan retire `syncManque` à l'étape 8 « avec sa raison d'être — cette heuristique n'a de sens que parce qu'on pousse la base entière ». **Le raisonnement ne tient pas** : une remise à zéro poussée ligne à ligne produit des milliers de `supprime_le` à `maj_le` frais, que le serveur accepte tous, et il n'y a plus aucun garde-fou. Pire, le plafond de lot (400 lignes / 4 Mo) fait qu'une purge de 3 000 enregistrements prend 8 allers-retours : le plan garantit « une seule transaction, tout ou rien » **par lot**, pas pour l'opération. Un échec à mi-parcours laisse la base à moitié effacée côté serveur, et un collègue lit cet état intermédiaire.
**À ajouter** : une notion de *lot d'opération* (un identifiant porté par les N pousses, le serveur ne publie le `seq` qu'à la fermeture du lot), plus un garde-fou serveur « plus de X % des enregistrements vivants supprimés en une opération » qui exige la même preuve que `/api/monitor/op/revenir`.

**9. Deux onglets : `app.html:7586` remplace `db` sans `ombreRelever()`.**
Il y a **cinq** sites d'affectation de `db` (`tests/test-706.js` les énumère), et seuls deux appellent `ombreRelever()` : `app.html:6862` et `app.html:25685`. Le canal multi-onglets (`app.html:7586-7590` : `db=nd; _dbGen++;`) n'en fait pas partie. Aujourd'hui c'est bénin — on pousse la base entière et la fusion est une union. Avec un delta, l'onglet B reçoit la base de l'onglet A, garde une ombre périmée, et au premier `save()` **re-tamponne tout ce que A vient d'écrire** : ces lignes repartent comme du travail de B, avec une date fraîche, et gagnent toutes les fusions. C'est exactement le mécanisme que le plan ferme pour le chemin des refus (§2.6) et laisse ouvert ici. Même remarque pour `app.html:7229` (`db=remote` de la reprise `syncManque`), qui n'est sauvé que parce que `ombreRelever()` est atteint plus loin en `app.html:7246` — un `return` (il y en a un en `app.html:7238`) le court-circuite.
**À ajouter** : « `ombreRelever()` sur les CINQ sites, dans le même bloc synchrone ; `tests/test-706.js` l'exige au même titre que `_dbGen++` ».

**10. `etat` de `/api/op/session` n'est jamais défini — et `sauvRefus` refuse un espace fermé.**
Le contrat rend `{jeton, exp, seq, etat, vide}` et le plan détaille longuement les trois états de `vide`, mais **jamais les valeurs d'`etat` ni ce qu'elles autorisent**. Or `sauvRefus` refuse `entFermes.espaces` en 403 (`server/index.js:2586`) : une entreprise suspendue pour impayé ne pourrait plus **lire** ses propres données. Aujourd'hui c'est sans conséquence (la base vit en local et dans Firestore) ; demain c'est le seul exemplaire à jour. Et `mentions-legales.html:74` promet noir sur blanc : « Un changement d'offre, une résiliation ou un impayé **n'entraînent aucune suppression** : le client retrouve l'intégralité de ses données s'il revient. »
**À ajouter** : `etat ∈ {actif, suspendu, ferme}` avec, pour `suspendu`, **lecture autorisée, écriture refusée** et un écran qui le dit ; et le cas « fermé puis rouvert » traité explicitement (le `base.db` survit, les jetons sont morts, les appareils se ré-enrôlent).

**11. La condition (a) de l'étape 5 ne peut jamais converger : rien ne retire une ligne `appareil`.**
Le schéma porte `appareil(t, app_id, jeton_sha, exp, …, revoque_le)` et l'étape 5 exige « tous ses appareils parlent au VPS — constaté par une **liste nominative** d'`appareil.vu_le` ». Mais le jeton expire à 30 jours et `app_id` est alloué par le serveur : un appareil qui revient après expiration ne peut pas prouver qu'il *est* `app_id` X, donc il reçoit une ligne neuve. Un téléphone changé, un profil recréé, un stockage nettoyé : autant de lignes fantômes qui ne se ferment jamais. La liste grossit, la condition « tous » devient inatteignable, et — leçon du dépôt — **une condition impossible à remplir finit par être ignorée** (`server/index.js:2276-2282`, exactement ce raisonnement pour `cleEtat`).
**À ajouter** : une règle de péremption d'une ligne `appareil` (jeton expiré depuis N jours → archivée, sortie du dénominateur), et une reprise d'`app_id` prouvée par le jeton précédent tant qu'il n'est pas expiré.

**12. Migration de schéma × N fichiers × le rituel de déploiement.**
`meta.schema` figure dans le schéma mais aucune procédure n'est écrite. Or `.github/workflows/deploiement.yml` fait `systemctl restart`, `sleep 3`, puis `curl /health` et **échoue si `/health` ne répond pas** (`.github/workflows/deploiement.yml:74-78`), le tout dans un job à `timeout-minutes: 6`. Ouvrir et migrer N bases SQLite au démarrage peut dépasser ces 3 secondes, et une migration qui casse sur **une** entreprise ne doit pas empêcher le service de démarrer pour les autres.
**À ajouter** : migration paresseuse à la première ouverture de chaque `base.db`, `/health` qui répond avant toute migration, un compteur `socle: {bases, migrees, enErreur}` dans `/health` (agrégé, jamais nominatif — `server/index.js:322` pose déjà cette règle), et le contrôle de non-régression du workflow étendu.

**13. Conservation : une promesse passive devient une obligation active, et il n'y a pas de mécanisme.**
`mentions-legales.html:74` promet 24 mois après la fin d'abonnement **plus un courriel 30 jours avant la suppression**. Aujourd'hui c'est tenu sans rien faire (le document Firestore reste). Avec le socle, TeamOP doit **exécuter** : une horloge de rétention par entreprise, un courriel automatique, un effacement. Rien de tel dans le plan, qui range la conservation au rayon « harmoniser trois textes » (étape 0).
**Et il y a un quatrième texte, non listé par le plan** : `confidentialite.html:57` — « conservées tant que le compte est actif… la suppression est effectuée sous 30 jours ». Le plan n'en cite que trois (`sous-traitance.html:88`, `mentions-legales.html:74`, `espace.html:762`).
**À ajouter** : un poste d'ingénierie « rétention et effacement programmé » (colonnes `ferme_le`/`purge_le` déjà présentes dans `entreprise`, mais rien ne les lit), et `confidentialite.html:57` dans la liste des textes à trancher.

---

## AFFIRMATIONS DU PLAN QUE RIEN NE MESURE

**14. `node:sqlite` : la mesure a été faite sur la MAUVAISE machine.**
Le plan écrit : « Mesuré ici : `require('node:sqlite')` charge sans drapeau sur **v22.22.2** ; le VPS est en v22.23.1. » Je l'ai revérifié — `node -v` → `v22.22.2`, exports `['DatabaseSync','StatementSync','constants','backup']`, avec l'`ExperimentalWarning`. Mais le composant le plus critique du chantier est validé sur une version **différente de la production**, et `server/install.sh` installe « setup_22.x » sans figer (le plan le note en §7.4 sans en tirer la conséquence). C'est une commande d'une ligne en ssh.
**À ajouter** : faire la mesure sur `root@api.teamop.fr` avant l'étape 1, et **figer la version mineure de Node** dans `install.sh` dans le même commit.

**15. « La synchro devient plus vive » (étape 5) — aucune mesure, et le schéma va dans l'autre sens.**
Le plan pose `PRAGMA synchronous=FULL` (§2.2), c'est-à-dire **un fsync par pousse**, sur le disque partagé d'un VPS IONOS, là où aujourd'hui l'écriture part chez Google en asynchrone. Douze appareils à 300–800 ms de différé, c'est un profil de fsync qui n'a jamais été mesuré. Le plan mesure honnêtement le long-poll (« c'est un calcul, pas une mesure »), mais affirme le gain de vivacité sans la même prudence — dans le sens de la réponse souhaitée.
**À ajouter** : mesurer la latence de `pousser` sous charge à l'étape 1 (avant l'étape 4), et arbitrer `synchronous=FULL` vs `NORMAL`+WAL avec le chiffre sous les yeux.

**16. Le contrôle nocturne de l'étape 4 est le plus gros accès en clair du système, et il est hors de tout régime.**
`GET /api/op/etat` rend `{seq, parColl, octets, signature}` et « le serveur recompose la même depuis ses lignes » : cela veut dire **déchiffrer l'intégralité de la base de chaque entreprise, toutes les nuits**, sur demande d'un simple jeton d'appareil. Aucun motif, aucune session de 30 minutes, **aucune ligne dans `diagnostic`**. Tout l'appareil de garde du §2.4 (motif ≥ 10 caractères, session, journal chaîné lisible par le client) est construit pour la Tour, et la route la plus large y échappe. C'est aussi un déni de service gratuit : 4 000 lectures/h autorisées, chacune déchiffrant tout.
**À ajouter** : soit la signature se calcule **sur les en-têtes en clair uniquement** (`coll|id|maj_le|supprime_le|empreinte` — `empreinte` est déjà stockée en clair, c'est justement ce qu'il faut), auquel cas aucun déchiffrement n'a lieu ; soit elle est journalisée comme un accès. La première option est la bonne et elle est gratuite.

---

## PREUVE AVANT PUBLICATION NON DÉFINIE

**17. Les étapes 8 et 9 n'ont ni « Comment on le prouve », ni « Retour arrière », ni phrase de Justin.**
Toutes les autres étapes ont ces trois rubriques. L'étape 8 — la seule irréversible — publie une version d'`app.html` qui retire `syncAlleger`, `syncAllegerNuage`, `syncRegreffer`, `syncManque`, `COLLS_GARDEES`, `_syncTs`, `NUAGE_BUDGET` (`app.html:7041`), `NUAGE_ENC_MAX` (`app.html:7053`) : c'est le plus gros diff du chantier sur le fichier servi aux clients, **sans preuve écrite et sans la phrase**. L'étape 9 publie elle aussi `app.html` (levée des plafonds) dans les mêmes conditions. La règle du dépôt est pourtant sans interprétation possible : « `app.html` ne se publie que sur une PHRASE DE JUSTIN qui le demande explicitement, **pour ce changement-là** ».
**À ajouter** : les quatre preuves chiffrées + la phrase, explicitement, sur les étapes 8 et 9 comme sur les étapes 3 et 5.

**18. Aucun banc n'est prévu pour la Tour ni pour les nouvelles routes monitor.**
Le plan ajoute sept routes `/api/monitor/op/*` — dont une qui **écrit dans la base d'un client** (`revenir`) — et un écran de Tour. Les bancs listés (étapes 1 et 2) ne couvrent que le socle et le convertisseur. Or `tour.html` n'a aucune suite dans `tests/` (les 63 suites visent `app.html` et `server/`), et la table `monAppDeRoute` (`server/index.js:1500`, « où l'oubli FERME ») doit recevoir sept entrées — un oubli y est silencieux à la lecture et bruyant à l'usage.
**À ajouter** : un banc qui relit `server/op-socle.js` et exige que **chaque** chemin `/api/monitor/op/*` figure dans `monAppDeRoute`, plus une sonde navigateur sur l'écran de Tour (il n'existe pas d'équivalent aujourd'hui, c'est un manque du dépôt que le chantier rend cher).

---

## CONFORMITÉ

**19. `sous-traitance.html:103` décrit précisément ce qui est déposé sur les serveurs — et cette phrase devient fausse.**
« **Connexion** — l'identifiant, le prénom et le nom de vos salariés utilisateurs, déposés sur nos serveurs pour permettre la connexion et vous assister ». C'est aujourd'hui exact : seul l'annuaire (`comptesReg`) monte. Après la bascule, **toute** la base monte — pointages, interventions, plans d'appâtage, photos. Le plan liste onze phrases à réécrire et **omet celle-ci**, qui est la plus précise et la plus directement contredite dans le document contractuel lui-même.

**20. `sous-traitance.html:~130` affirme déjà « journalisation des accès sensibles » et « cloisonnement : un espace de données isolé par entreprise ».**
La seconde reste vraie par construction (un fichier par entreprise) — c'est même l'argument fort du plan. La première est **déjà fausse aujourd'hui** et le devient gravement demain ; le plan la traite bien (§6.5) mais ne la liste pas parmi les phrases à vérifier. À mettre dans le tableau §5, ne serait-ce que pour pouvoir cocher qu'elle redevient vraie.

**21. L'information des SALARIÉS du client (art. 14) n'est nulle part.**
Le plan traite l'avenant aux instructions documentées et le préavis de 30 jours **au client** (ELAN, responsable de traitement). Mais les personnes concernées sont les salariés d'ELAN : leurs pointages, leur registre de présence (`db.journal`, dont la composition mesurée chez ELAN était « 443 lignes de Connexion sur 500 »), leurs signatures. Rendre ces données lisibles par un tiers est une information qu'ELAN doit leur transmettre, et TeamOP doit lui fournir de quoi le faire.
**À ajouter** : une notice type, remise au client avec l'avenant, qu'il peut afficher à ses salariés. Coût quasi nul avant l'étape 4, embarrassant après.

---

## Là où je n'ai rien trouvé, et je le dis franchement

- **Agent devis** (`server/agent-devis.js`, 346 lignes) : le plan le traite correctement (§5 point 6, sortie d'`expliquer`/`proposer` des routes communes). Le module ne lit pas `db` et n'a pas d'autre point de contact avec le socle. Rien à ajouter.
- **Notifications web-push** : `subscriptions.json` est indexé par endpoint avec `{sub, teamId, userId, userName}` (`server/index.js:10, 17`) et la suppression d'entreprise les purge déjà (`server/index.js:4921-4923`). Le socle ne change rien à ce chemin. Seul point mineur : `/api/monitor/op/couper` révoque les sessions socle mais pas les abonnements push — c'est déjà le cas de `fbRevoquerEquipe`, donc un manque du dépôt, pas du plan.
- **Copies de sauvegarde `SAUV_DIR`** : le plan les traite bien, y compris la date de fin et le rebranchement de `sauvegardeDeposer`. Les trois routes (`server/index.js:2643, 2665, 2673`) partagent déjà `sauvRefus`, donc elles hériteront de la correction `espaceCleOk`→`cleEquipeVerdict` sans travail supplémentaire.
- **Registre des espaces / annuaire** : le plan couvre `espacesReg` vs `cnxData` (étape 0) et `users` vs contrainte d'unicité (§3). Je n'ai pas trouvé de trou supplémentaire au-delà du point 6 ci-dessus (l'effacement).
- **Chiffres du plan** : je les ai recomptés et ils tiennent — `app.html`/`beta.html` à 32 371 lignes, `APP_VERSION = '693'` (`app.html:4915`), `server/index.js` à 6 891 lignes, 63 suites dans `tests/`, 139 routes sur trois fichiers (122 + 16 + 1), aucun `SIGTERM`/`server.close`/`process.on` dans `server/index.js`, `User=root` (`server/install.sh:79`), Caddy (`server/install.sh:23-28`), déclenchement du déploiement sur `server/**` (`.github/workflows/deploiement.yml:14`). Les citations `app.html:*` du plan que j'ai échantillonnées (36 lignes) pointent toutes au bon endroit.
