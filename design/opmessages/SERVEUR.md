# Serveur d'OP MESSAGES — la conception retenue (1er octobre 2026)

Justin, 1er octobre 2026 : « OP MESSAGES je veux pas qu'il soit sur Firebase », avec le choix laissé (« sur le serveur
aussi, ou si tu préfères je crée un nouveau serveur ») — choisi : **un service à part sur le même VPS**, écrit pour
déménager sur une machine à lui sans rien réécrire. Ce document est la synthèse d'un juge sur trois architectures
indépendantes (« sobre », « robuste », « temps réel ») ; chaque affirmation sur le dépôt y a été vérifiée (§ 1).
⛔ Ce n'est pas encore une décision de Justin sur les points de la § 5 : on construit avec les recommandations, et
on change si sa réponse change quelque chose.

## 1. Ce que j'ai vérifié dans le dépôt

| Affirmation des propositions | Verdict | Preuve |
|---|---|---|
| `node:sqlite` déjà utilisé, `VACUUM INTO`, `backup()` | Vrai | `server/socle.js:98-106` et `:2011` ; `typeof sqlite.backup === 'function'` sous Node 22.22.2. Le VPS est en 22.23.1 d'après CLAUDE.md. |
| Aucun webhook Stripe dans OP GESTION | Vrai | `grep -c webhook server/index.js` renvoie 0. |
| `/api/beta/login` ne rend aucun jeton | Vrai | `index.js:2077-2092` rend `{ok, login, nom}`. `/api/beta/etat` rend `{ouvert}`, avec un verrou par identifiant et un plafond par adresse. |
| `/api/subscribe` sans filtre d'hôte push | Vrai | `index.js:1236` accepte tout `sub.endpoint`. Le nouveau service doit filtrer. |
| CORS : `Access-Control-Allow-Headers` figé | Vrai | `index.js:78`. |
| Comptes du portail en PBKDF2 120 000 tours, avec une empreinte envoyée par le client | Vrai | `comptes.js`. |
| `s3.js`, `poser-cle.js`, `restaurer.js` sont imitables | Vrai | Les trois fichiers existent dans `server/`. |
| Prix `msgpro` et `msgpremium` déjà connus d'OP GESTION | Vrai | `index.js:3132-3134`, `ligneMessages` en `:3150`. |
| Le proxy est Caddy | Douteux | `install.sh:156` écrit un Caddyfile. Mais `REPRISE.md:2669-2670` dit que la production est « derrière nginx » et que `install.sh` est en retard. Le vrai proxy se lit sur le VPS. |
| `deploiement.yml` : job `bancs` puis `deployer` | Vrai | Même verrou `deploiement-vps`, clé root, SHA vérifié par `merge-base --is-ancestor`. |
| `test-728` n'accepte que 2 workflows qui appellent `bancs-ci.sh` | Vrai | `tests/test-728.js:199-200` attend exactement `['ci.yml','deploiement.yml']`. Un 3e workflow le fait tomber, à moins de le mettre à jour dans le même commit. Seule la proposition « temps réel » l'avait vu. |
| « Numéros de banc libres à partir de 850 » (proposition sobre) | Faux | `test-849` et `test-856` existent. |
| Service OP GESTION en `User=root`, sans durcissement | Vrai | `install.sh:139`, `REPRISE.md:2666`. Le nouveau service fait mieux sans toucher à l'ancien. |
| Aperçu de l'étape 1 : une seule balise `<script>`, 0 `onclick=`, 3 `style="` | Mesuré | `apercu/opmessages/index.html`. Une CSP stricte sur les scripts est peu coûteuse. |

## 2. Comparaison critère par critère

| Critère | Sobre | Robuste | Temps réel | Retenu |
|---|---|---|---|---|
| HTTP | `node:http` et routeur maison | Express 4 | Express 4, mais le WebSocket contourne `req.ip` | **Express 4.21**, comme `server/`. Le routeur maison est du risque sans gain. L'IP vient de `req.ip` avec `trust proxy 1`. |
| Temps réel | long-poll | SSE | WebSocket écrit à la main (RFC 6455, ~300 lignes) | **SSE descendant, POST montant.** Les identifiants d'événements donnent la reprise native par `Last-Event-ID`. Le WebSocket artisanal est une zone à risque (masquage, fragmentation, limites). Le format d'événement permet d'ajouter un WebSocket plus tard. |
| Origine du front | `teamop.fr/msg/` (origine d'OP GESTION) | **`msg.teamop.fr`, service qui sert sa page** | `teamop.fr/messages.html` + CORS | **Origine à part.** Du texte tout public ne doit pas tourner sur l'origine dont le `localStorage` porte les données des clients. Cela supprime CORS, permet un cookie `HttpOnly` et rend les pièces affichables par `<img>`. |
| Auth | empreinte client + PBKDF2 | mot de passe + scrypt côté serveur | empreinte client préfixée + PBKDF2 | **Mot de passe en TLS, haché par scrypt côté serveur** (voir §3.6). |
| Stockage | SQLite | SQLite | SQLite | **SQLite**, tout le SQL dans un seul module. |
| Appels | maille 4/8 + coturn, SFU plus tard | maille 4/6, SFU LiveKit | maille 4/8 + coturn, SFU plus tard | Même fond. **Maille 4 en vidéo et 6 en audio** (valeurs de départ à mesurer), coturn avec `denied-peer-ip`, SFU en étape tardive. |
| Séparation | utilisateur, données et clés à part | idem + garde de démarrage + clé de déploiement dédiée | idem | Tout cela, y compris le **clone et les releases à part** (voir point critique 1 ci-dessous). |
| Déploiement | `git merge --ff-only` dans le clone partagé | releases + retour arrière + clé à commande forcée | idem | **Releases et retour arrière.** |
| Facturation | Stripe par `fetch`, sans webhook | webhook qui ne fait que déclencher une relecture | sans webhook au départ | **Sans webhook en v1**, comme OP GESTION. Verdict toujours relu chez Stripe. |
| Bêta | porte par appel au `/api/beta/login` en boucle locale | idem, porte sur tout le service | appel via l'URL publique | **Appel en boucle locale**, plafond propre avant le relais. |
| Administration | scripts en ligne de commande | port 8092 hors proxy | non précisé | **Scripts en ligne de commande**, sans port de plus. |
| Noms des bancs | `tests/test-8xx` | `tests/test-msg-NN` | `tests/msg-*.js` hors du motif `test-*.js` | **`tests/test-9NN.js`** (vérifié : le plus haut actuel est 856). Ils entrent dans le compteur de la CI complète et pas dans `bancs-serveur.liste`. |

### Points critiques relevés dans les propositions

1. **La proposition sobre déploie par `git merge --ff-only` dans le clone partagé.** Cela avance aussi les fichiers `server/` d'OP GESTION sur le disque, sans redémarrer `teamop-api`. C'est exactement « code neuf sur le disque, ancien en mémoire », que `deploiement.yml` décrit comme le pire état. L'ordre inverse existe aussi : un déploiement d'OP GESTION avancerait `msg-…`. Le service OP MESSAGES aura donc son propre dépôt miroir et ses propres releases.
2. **Le long-poll de la proposition sobre coûte une requête toutes les 25 s par appareil**, avec les contraintes de boucle de synchro du 25 septembre. Le SSE coûte moins.
3. **La proposition temps réel fait passer la porte bêta par `api.teamop.fr`.** Le mot de passe sortirait de la machine et le plafond d'OP GESTION verrait l'IP du VPS. Il faut la boucle locale, avec `X-Forwarded-For` posé par l'instance bêta (Express, `trust proxy 1`, prend la dernière entrée).
4. **Les URL signées de 6 h de la proposition temps réel** sont inutiles avec un cookie de même origine. Une URL copiée resterait valable 6 h.
5. **scrypt en Node a `maxmem` à 32 Mio par défaut.** `N=2^15, r=8` demande exactement 32 Mio : il faut passer `maxmem` explicitement, sinon l'erreur sort au premier essai. À éprouver au banc.
6. **Un banc de la proposition robuste dit « jeton `opm_` refusé par la regex d'OP GESTION »** : c'est bien. Il faut le garder, car OP GESTION lit `Bearer [A-Fa-f0-9]{64}`.

## 3. LA CONCEPTION RETENUE

### 3.1 Architecture

- **Dossier du dépôt : `server-msg/`**, avec son propre `package.json` : `express`, `web-push` et `nodemailer`, mêmes versions que `server/`. Tout le reste est fait main : Stripe par `fetch`, S3 par copie de `s3.js`, calendrier `.ics`, sauvegarde.
- **Deux instances du même code**, une unité modèle `teamop-msg@.service` :

| | bêta | production |
|---|---|---|
| Domaine | `msg-beta.teamop.fr` | `msg.teamop.fr` |
| Port local | 8091 | 8090 |
| Données | `/opt/opmsg/beta/data` | `/opt/opmsg/prod/data` |
| Configuration | `/etc/opmsg/beta.json` (600) | `/etc/opmsg/prod.json` (600) |
| Unité | active | **non installée** tant que Justin n'a pas dit « publie OP MESSAGES » |

- **Utilisateur système `opmsg`**, non root. Durcissement :
  - `NoNewPrivileges`, `ProtectSystem=strict`, `ReadWritePaths` limité à son dossier, `PrivateTmp`, `ProtectHome` ;
  - `RestrictAddressFamilies`, `MemoryMax=1G`, `CPUWeight` et `IOWeight` bas, `LimitNOFILE` ;
  - `Restart=always`.
- **Garde de démarrage** : le service refuse de démarrer si sa configuration, ses données ou sa clé sont sous `/opt/teamop/` ou `/etc/teamop/`.
- **Clé maître** `/etc/opmsg/<instance>.kek`, chargée par `LoadCredential`.
  - Elle est posée par `server-msg/poser-cle.js`, imité de `server/poser-cle.js` et jamais importé.
  - Il refuse de la régénérer si une base existe.
  - Le drop-in n'est posé qu'après l'écriture de la clé.
- **Aucun code partagé à l'exécution** :
  - `server-msg/` n'importe pas `server/` ;
  - `s3.js` est copié dans `server-msg/lib/` et un banc exige qu'il soit identique octet pour octet à `server/s3.js` ;
  - aucun chemin, aucune adresse, aucun domaine tiers en dur ; tout vient de `OPMSG_CONFIG` et `OPMSG_DATA`.
- **Seul pont déclaré** : la bêta appelle `http://127.0.0.1:8080/api/beta/login` et `/api/beta/etat`.
- **Seules ressources partagées** : le VPS (CPU, disque, réseau) et le compte Stripe.
- **Réseau**
  - DNS : `msg-beta`, puis `msg`, plus `turn` (sans proxy HTTP). L'adresse du VPS est 217.154.6.139 (`deploiement.yml`).
  - Un bloc proxy par domaine, dans un fichier à part.
    - Si nginx est en place : `proxy_buffering off` et `proxy_read_timeout 3700s` sur le flux, `http2`, et `X-Forwarded-For $remote_addr` en écrasement.
    - `install-msg.sh` détecte le proxy actif, valide la configuration (`nginx -t` ou équivalent) avant de recharger, et ne touche jamais au bloc d'`api.teamop.fr`.
  - `trust proxy 1`, `req.ip` seul. Un banc envoie un `X-Forwarded-For` forgé.
  - Le service émet aussi `X-Accel-Buffering: no` sur le flux.
- **Front servi par le service lui-même** depuis `server-msg/public/` : `index.html`, `messages.css`, `messages.js`, `sw.js` propre (portée de l'origine), manifeste propre.
  - `sw.js` racine, `app.html` et `messages.html` ne sont **pas touchés**. La page de Justin se sépare : `messages.js` en fichier, 1 balise `<script>` à extraire.
  - **CSP** : `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`. Les styles en ligne restent tolérés au début (blast radius faible) et se resserrent plus tard.
  - Plus `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(self), microphone=(self)`, HSTS à 1 jour sans preload, COOP et CORP `same-origin`.
  - `teamop.fr/messages-beta.html` devient une simple page de redirection vers `msg-beta.teamop.fr` à l'ouverture de la bêta. `messages.html` et `op-fs.js` restent en l'état (CLAUDE.md).
- **Authentification de transport : un seul mécanisme, le cookie `__Host-opm`**, `HttpOnly; Secure; SameSite=Strict; Path=/`.
  - Les bancs envoient l'en-tête `Cookie:` à la main, avec un petit bocal à cookies.
  - Contrôle de l'en-tête `Origin` sur toute route qui écrit, plus un en-tête personnalisé obligatoire. Pas de CORS : aucune réponse ne porte d'`Access-Control-*`.
  - Le premier chargement d'un lien d'invitation (navigation venue d'un courriel) ne dépend pas du cookie : la page se charge, puis ses appels de même site portent le cookie.

### 3.2 Stockage

- **`node:sqlite`**, un fichier `msg.db` par instance, WAL, `synchronous=FULL`, `busy_timeout=5000`.
  - **Tout le SQL est dans `stockage.js`** : requêtes toutes paramétrées, aucune concaténation (un banc statique l'impose).
  - Migrations numérotées par `PRAGMA user_version`, chacune rejouable, avec un `VACUUM INTO` conservé avant chaque migration.
  - Passer à un autre moteur ne touche que ce module.
  - `FULL` est gardé pour que « acquitté » veuille dire « durable ». Si la mesure de l'étape 1 montre un retard de boucle trop grand, on groupe les validations par tour de boucle, puis un `worker_thread`, mais pas `NORMAL`.
- **Scellage au repos : AES-256-GCM** sur
  - le corps des messages et les aperçus de liste,
  - les noms de groupes et canaux, les titres, lieux et notes de réunions,
  - les adresses e-mail (avec `email_h` HMAC pour l'unicité), les points d'accès push, les noms de fichiers.
  - Clé de données dérivée par HKDF de la KEK, avec un contexte `msg|piece|champ`. Un octet de version de clé en tête permet la rotation.
  - **Données associées** `conv|seq|auteur` : une ligne recopiée ou permutée est refusée.
  - Un témoin `kek_temoin` en base refuse un démarrage avec une mauvaise clé.
  - Il reste en clair : identifiants, dates, relations (qui est dans quelle conversation), prénom et nom affichés. Les métadonnées sont donc visibles du serveur.
  - **Ce n'est pas du chiffrement de bout en bout et le site ne le dit pas.** Le serveur lit un message (aperçu de notification, signalement, export).
  - Pas de recherche côté serveur en v1 ; elle se fait dans l'application sur l'historique chargé.
- **Identifiants** : aléatoires de 128 bits en hexadécimal avec préfixe (`p_`, `c_`, `e_`, `r_`, `a_`, `f_`). Dates en millisecondes UTC.
- **Tables** (colonnes essentielles) :

```
meta(k,v)                         schema_version, kek_temoin, kek_gen
personne(id, email_h UNIQUE, email_ch, verifie_le, sel, mdp, params, prenom, nom, avatar_piece,
         statut, langue, tz, prefs, etat, suppression_le, age_ok, cgu_v, origine 'compte'|'beta',
         essais, bloque_jusqua, cree)
session(h PK, personne, appareil, cree, vu, exp)           sha256 du jeton ; 30 jours glissants
jeton(h PK, personne, genre 'verif'|'mdp'|'email', exp, cible_ch)    usage unique
contact(de, vers, etat 'ok'|'bloque', depuis)              deux lignes par relation
lien(h PK, genre 'contact'|'groupe'|'espace'|'reunion', cible, par, exp, restants, approbation, revoque)
conversation(id, type 'direct'|'groupe'|'canal'|'reunion', espace NULL, nom_ch, avatar_piece,
             annonces_seules, ephemere_s, dernier_seq, dernier_ts, cree_par, cle_directe UNIQUE NULL)
membre(conv, uid, role, depuis_seq, lu_seq, recu_seq, muet_jusqua, epingle, archive, quitte_le)
message(conv, seq, id, auteur, cid, ts, type, corps_ch, meta_ch, repond_a, modifie, supprime_le,
        expire_ts, PK(conv,seq), UNIQUE(conv,auteur,cid))
reaction, msg_masque, piece(id, proprio, conv, taille, mime, nom_ch, attachee, cree, expire)
journal(gid AUTOINCREMENT, genre, conv, uid NULL, ref, ts)  une ligne par événement
notification(id, uid, type, titre_ch, texte_ch, cible, ts, lue)
push(endpoint_h UNIQUE, uid, endpoint_ch, p256dh_ch, auth_ch, echecs, derniere_ok)
espace, espace_membre, reunion, reunion_invite, rappel, appel, appel_part
signalement, purge(objet, genre, quand), courrier_attente(file persistante)
```

- **Décisions de modèle**
  - **Unicité** : `UNIQUE(conv, auteur, cid)` donne l'idempotence, un renvoi ne fait jamais deux messages. `seq` s'attribue dans la transaction. Un banc rejoue un deuxième passage (leçon d'`opIdDerive`).
  - **Conversation directe** : une seule par paire via `cle_directe = min|max`.
  - **Lu** : `membre.lu_seq`, un compteur monotone par personne et par conversation. Il n'y a pas de tableau `lu[]` par message comme dans le modèle du paquet de design.
  - **Éphémères** : `expire_ts = ts + ephemere_s`. Un balayeur supprime corps, pièces et lignes toutes les minutes, et note l'identifiant dans `purge`.
  - **Suppression d'un message** : le corps s'efface tout de suite, une pierre tombale reste.
  - **Réunion** : chaque réunion a une conversation pour son chat.
  - **Pièces** : pas de déduplication entre comptes. Elles sont scellées sur disque dans `pieces/<2 car.>/<id>`.
- **Volumes**
  - ~300 octets par message avec les index, soit ~15 Mo par jour pour 1 000 actifs à 50 messages par jour, ~5 Go par an.
  - Les pièces dominent : le client réduit les photos à ~250 Ko et fait les vignettes ; le serveur ne traite pas les images.
  - Plancher de disque propre : écritures refusées en 503 sous le seuil, pour ne jamais priver OP GESTION de disque. Poids tenu de façon incrémentale.
  - Seuil de réflexion : base au-delà de ~5 Go ou boucle en retard.

### 3.3 API

**Conventions** : préfixe `/api`, JSON, erreurs `{error:'code'}`. Mutations en POST, lectures en GET.
- Identité et appartenance viennent de la session et de la base, jamais du corps.
- Un objet auquel on n'a pas droit répond **404, jamais 403**.
- Les codes de refus sont tous dits à l'écran qui les déclenche (leçon `_mailboxes`).

| Garde | Sens |
|---|---|
| P | public, plafonné par IP et par adresse |
| S | session valide |
| V | session et adresse confirmée |
| M | membre de la conversation |
| A | administrateur de la conversation |
| E, EA, EP | membre, administrateur, propriétaire de l'espace |
| PRO | formule effective via `formuleDe(personne)`, la seule fonction qui décide |
| H | hôte ou co-hôte de la réunion |
| B | instance bêta, derrière la porte |

Codes communs : 400 `champ_invalide`, 401 `session_requise`, 402 `formule_requise` / `places_epuisees` / `quota_atteint`, 403 `interdit` / `adresse_non_confirmee` / `annonces_seules`, 404, 409, 410 `lien_invalide` (expiré, révoqué et épuisé répondent pareil), 413, 415, 423 `verrouillee`, 426 `mise_a_jour` (`min_client`), 429 avec `Retry-After`, 503.

**Service et bêta**
- `GET /health` (P, agrégé, sans identifiant) ; `GET /api/config` (P : version, instance, VAPID, limites, `ice` si activé).
- `POST /api/beta/entrer {login, pass}` (B). Voir §3.9.
- `GET /api/flux` (S, SSE) ; `GET /api/sync?depuis=<gid>` (S, reprise après `resync`).

**Comptes** (étape 2 pour les comptes publics ; l'étape 1 ne livre que la porte bêta)
- ⛔ **Le compte PERSO se crée et se connecte par NUMÉRO DE TÉLÉPHONE** (décision de Justin, 1er octobre 2026 ; livré côté serveur le 2 octobre, `telephone.js`) — voir l'étape 2 plus bas :
  `POST /api/tel/code {numero}` (P), `POST /api/tel/verifier {numero, code, prenom?, nom?, appareil?}` (P), `POST /api/tel/appareil` (P, sans SMS), `GET|POST /api/moi/confidentialite` (S), `POST /api/contacts/chercher {numero}` (V), `POST /api/contacts/ajouter {id}` (V).
- *Les routes par courriel ci-dessous sont l'ancienne conception du compte public ; elles ne sont plus bâties pour le Perso (le Pro entre par un lien de connexion créé par TEAM OP, étape 5).*
- `POST /api/compte/creer {email, mdp, prenom, nom, age15, cgu}` (P). Répond `{ok:true}` toujours. Un compte existant reçoit un courriel d'avis.
- `/api/compte/verifier {jeton}` (P) ; `/api/compte/renvoyer` (S).
- `/api/compte/connexion {email, mdp, appareil}` (P) : 401 `identifiants`, 403 `adresse_non_confirmee` seulement après un mot de passe juste.
- `/api/compte/deconnexion` ; `GET /api/compte/sessions` ; `/api/compte/sessions/couper {id|toutes}` (ferme aussi les flux de la session).
- `/api/compte/mdp/demander` (P), `/mdp/poser {jeton, mdp}` (P), `/mdp/modifier` (S). Un changement coupe les autres sessions.
- `/api/compte/email/demander` (V), `/email/confirmer`.
- `/api/compte/supprimer` (V, délai de grâce de 14 jours, annulable par connexion), `/api/compte/export` (V, 1 par jour).
- `GET /api/moi` ; `/api/moi/maj {prenom, nom, statut, langue, tz, prefs}` ; `/api/moi/notifications`.

**Contacts, signalement**
- `GET /api/contacts` ; `/api/contacts/lien {max, jours}` (V) ; `/api/liens/lire {code}` (S, aperçu, n'accepte rien) ; `/api/liens/accepter {code}` (V).
- `/api/contacts/retirer`, `/bloquer`, `/debloquer` (un blocage coupe messages, appels et présence).
- `GET /api/personnes/:id` (V, 404 hors contact, espace ou conversation commune) ; `/api/signalements {cible, motif, messages?}` (V).
- **Pas d'annuaire, pas de liste, pas de recherche par nom.** On trouve quelqu'un par lien, par QR, par espace commun — et, depuis le 1er octobre 2026 (décision de Justin, « comme WhatsApp »), par son NUMÉRO EXACT : `POST /api/contacts/chercher`. ⛔ Ce n'est un annuaire que si on le laisse en être un : 30 recherches par jour et par compte (10 pour un compte de moins de 24 h, 5 par minute, plafond durable en base), même latence que le numéro existe ou non, même réponse neutre pour « pas de compte », « il m'a bloqué », « il ne veut pas être trouvé » et « c'est moi », et un réglage « qui peut me trouver par mon numéro » (tous | personne). Voir l'étape 2.

**Conversations et groupes**
- `GET /api/conversations` (S : dernier message, non-lus, épinglé, sourdine).
- `/api/conversations/directe {uid}` (V) : 404 si bloqué, sans contact ni espace commun.
- `/api/conversations/groupe {nom, membres[], annonces_seules, ephemere_s, avatar_piece?}` (V) → 201 `{conversation, non_ajoutes[]}`.
  - Seuls des contacts mutuels ou des membres d'un espace commun sont ajoutés directement. Les autres reçoivent un lien (plus d'ajout de force).
  - Plafond de 256 membres en Perso, 1 024 en Pro.
- `GET /api/conversations/:id` (M) ; `/maj {nom, avatar, annonces_seules, ephemere_s ∈ {0, 86400, 604800, 7776000}}` (A, message système tracé).
- `/membres/ajouter`, `/membres/retirer`, `/admins`, `/lien` (A) ; `/quitter` (M).
  - Le dernier admin ne part pas sans successeur : 409 `dernier_admin`, ou promotion du plus ancien.
- `/prefs {muet_jusqua, epingle, archive}` (M) ; `/lu {seq}` (M, monotone) ; `/saisie {actif}` (M, 1 par 2 s, jamais stockée).

**Messages**
- `GET /api/conversations/:id/messages?avant_seq=&apres_seq=&limite≤100` (M).
- `POST /api/conversations/:id/messages {cid, type, texte?, piece?, meta?, reponse_a?, mentions?}` (M) → 201 `{seq, ts}`, ou 200 `{deja:true}` au renvoi.
  - 403 `annonces_seules`, 404 `piece_inconnue`, 413 (8 000 caractères), 429 (60 par minute).
- `/messages/modifier` (auteur, 15 min) ; `/messages/supprimer {pour:'moi'|'tous'}` (auteur ou A) ; `/messages/reagir`.
- Pièces (étape 4) :
  - `POST /api/pieces?conv=&nom=&mime=` en flux binaire, taille déclarée obligatoire, arrêt dès le dépassement ;
  - `GET /api/pieces/:id` (M de la conversation liée, `Range`) ;
  - type vérifié contre les premiers octets (415) ;
  - `nosniff`, `Content-Security-Policy: sandbox`, `Content-Disposition: attachment` pour tout sauf JPEG/PNG/WebP/GIF et audio ; jamais de SVG ou HTML en ligne ;
  - EXIF retiré (client et serveur) ; quota (402).

**Notifications et push** (étape 2)
- `GET /api/notifications`, `/lues`. `GET /api/push/vapid` (P, paire propre à OP MESSAGES).
- `/api/push/abonner {sub}` (S, propriétaire pris de la session) : **`https` seulement et hôte dans une liste blanche** (FCM, Mozilla, `*.push.apple.com`, `*.notify.windows.com`), 10 abonnements au plus par compte ; `/desabonner`.
- Un push part seulement si la personne n'a aucun flux ouvert ou si l'événement n'est pas acquitté sous 5 s.
- Charge minimale par défaut (« Nouveau message »), aperçu activable. 404 ou 410 du service push : abonnement supprimé.
- Appels : `urgency high`, durée de vie 30 s.

**Espaces et facturation** (étape 5)
- `/api/espaces` (V, 3 au plus par personne), `GET /api/espaces[/:id]` (E), `/maj`, `/transferer`, `/supprimer` (EP), `/quitter`.
- `/api/espaces/:id/membres/role|retirer` (EA, 409 `proprio`) ; `/invitations` (EA, 402 `places_epuisees`) ; `/api/invitations/lire` (S) et `/accepter` (V).
- `/api/espaces/:id/canaux` (EA, PRO) ; `GET /api/espaces/:id/contacts` (E).
- **Un administrateur d'espace ne lit pas les conversations directes ni les groupes privés.**
- `/api/facturation/offres` (P) ; `/etat` (EA) ; `/paiement {espace, places}` (EP, V) ; `/portail` (EP) ; `/relire` (EP, 1 par 10 s, 502 si Stripe muet).

**Réunions** (étape 6)
- `POST /api/reunions {titre, lieu?, debut, fin, tz, repetition, invites[], rappels[], notifier, salle_attente?, espace?}` (V, PRO) : 400 `titre_vide` / `fin_avant_debut`, 402, 100 invités au plus.
- `GET /api/reunions?du=&au=` ; `GET /api/reunions/:id` ; `/modifier`, `/supprimer`, `/inviter`, `/retirer` (H) ; `/reponse {statut}` ; `/rappels` (mes propres rappels) ; `/lien/renouveler` (l'ancien meurt).
- `POST /api/reunions/apercu {code}` (P limité) ; `/api/reunions/rejoindre {code}` (S ; v1 exige un compte).
- Un seul organisateur doit être PRO. Les invités peuvent n'avoir qu'un compte Perso. `notifier:false` n'envoie rien.

**Appels et salles** (étapes 7 et 8)
- `GET /api/ice` (S) : identifiants éphémères de 1 h, `username = <échéance>:<uid>`, `credential = HMAC-SHA1(secret coturn, username)`.
- `POST /api/appels {conv|uids, type}` (V ; plus de 2 participants demande PRO) : 409 `occupe`, 409 `appel_complet`. `/repondre`, `/rejoindre`, `/quitter`.
- `POST /api/appels/:id/signal {a, type, donnees}` (S, 16 Ko au plus, seulement entre participants courants, candidats ICE par lots).
- `GET /api/appels?filtre=manques` ; sans réponse en 45 s : état `manque`.
- `/api/salles/:id/…` (hôte ou co-hôte) : `admettre`, `refuser`, `exclure`, `verrouiller`, `salle_attente`, `couper_micro`, `cohote`, `terminer` ; `main`, `reaction`, `evt` (sondage, minuteur, épingle) pour les participants, 2 Ko.
- **Limite honnête en maille** : le serveur impose l'admission, le verrouillage, l'exclusion (il cesse de relayer le signal). Couper le micro d'autrui ou « tout couper » reste une demande que le navigateur honore.

### 3.4 Temps réel

- **Un seul flux par onglet** : `GET /api/flux` en SSE. Les mutations sont des POST ordinaires.
- **Événements durables** : une ligne de `journal` par événement (nouveau message, modifié, supprimé, changement de conversation ou de membres, notification, réunion, appel entrant, appel manqué). **Les destinataires se déduisent des membres au moment de la lecture** : un message dans un groupe de 256 n'écrit qu'une ligne.
  - La ligne SSE porte `id: <gid>`. À la reconnexion, `EventSource` renvoie `Last-Event-ID` et le serveur rejoue ce qui concerne la personne (`uid` à elle, ou conversation dont elle est membre depuis `depuis_seq`).
  - Au-delà de 7 jours ou 10 000 lignes : événement `resync`, le client relit `GET /api/conversations`.
  - Un message de 2 Ko ou moins est porté dans l'événement. Au-delà, l'événement dit « relis ».
- **Événements éphémères** (sans `id`, jamais écrits en base) : `saisie`, `presence`, `signal` (SDP et ICE), `salle_evt`. Mémoire seulement, 100 par personne et 30 s de durée de vie.
- **Garanties**
  - Au moins une fois, dans l'ordre d'une conversation grâce à `seq`. Un trou se rattrape par `GET …/messages?apres_seq=`.
  - `ack` envoyé seulement après la validation de la transaction.
  - Toute écriture qui réussit prévient tout de suite les flux vivants (règle du dépôt : un adaptateur qui remplace une API qui pousse doit pousser).
  - Un membre retiré ne reçoit plus rien dès l'écriture. Une session révoquée ferme son flux.
- **Limites** : pulsation `:` toutes les 20 s, fermeture à 24 h, 5 flux par personne et 200 par IP, coupure si l'écriture retarde de plus de 1 Mo.
- **Présence** : calculée depuis les flux ouverts, envoyée aux contacts seulement, désactivable, avec 20 s de grâce.
- **Bascule vers un WebSocket** : seulement si une mesure montre qu'un geste (saisie, signal) est trop lent. Elle ne change pas le format d'événement.
- **Mesure obligatoire dès l'étape 1** : deux appareils au repos, sur une base plus lourde que le cas courant, ne doivent pas dépasser ~3 requêtes par minute (leçon de la boucle du 25 septembre). Mesurer aussi le retard de boucle d'événements, avec `fsync` actif.

### 3.5 Appels, TURN, visio

- **Signalisation** : relais des SDP et ICE en éphémère. Le serveur ne lit pas le SDP, vérifie participants, taille et débit. La liste des participants fait autorité côté serveur.
- **Maille** : 4 en vidéo, 6 en audio au départ. Valeurs à mesurer sur de vrais téléphones à l'étape 8. Les clients plafonnent le débit par flux.
- **coturn sur le VPS**, installé par `install-msg.sh`. Réglages obligatoires :
  - `use-auth-secret` ;
  - **`denied-peer-ip` pour 127.0.0.0/8, 10/8, 172.16/12, 192.168/16, 169.254/16, ::1, fc00::/7** : sans cela le relais atteint `127.0.0.1:8080`, donc OP GESTION ;
  - `no-multicast-peers`, `no-cli`, `no-tcp-relay`, `user-quota`, `total-quota`, `max-bps` ;
  - plage UDP de relais limitée (49160-49999) ;
  - le secret partagé est tiré au hasard et écrit dans les deux fichiers de configuration sans jamais s'afficher.
- **Réunion « Zoom »**
  - Réel en maille : micro, caméra, partage d'écran, participants, salle d'attente, verrouillage, exclusion, main levée, réactions, chat de réunion, sondages et minuteur en messages éphémères, enregistrement **local** par l'hôte avec bandeau REC pour tous.
  - Marqué « bientôt », jamais simulé : tableau blanc, salles de répartition, sous-titres (la reconnaissance du navigateur envoie l'audio à un tiers), diffusion, enregistrement ou transcription dans le nuage, arrière-plans.
  - **SFU** (étape 10, sur mesures) : LiveKit auto-hébergé (processus Go séparé, jetons JWT HS256 signés à la main, quelques lignes de `crypto`). C'est la seule porte vers « Zoom » à plus de 4 en vidéo et vers des contrôles contraignants. Le texte de `tarifs.html` doit dire que « visio illimitée » est illimitée en durée, pas en nombre de participants.
- **Limite iPhone à dire à Justin** : une page web installée n'a pas de CallKit. La sonnerie est fiable application ouverte, sinon c'est une notification.

### 3.6 Sécurité et anti-abus

- **Mot de passe** : envoyé en TLS, haché par `crypto.scrypt` côté serveur.
  - `N=2^15, r=8, p=1` au minimum avec `maxmem` explicite ; paramètres rangés avec le hachage pour pouvoir monter.
  - Sémaphore de 4 dérivations simultanées, file bornée, budget de la route contrôlé avant de dériver.
  - 10 caractères minimum, liste locale de mots de passe courants.
  - Le même nombre de dérivations pour une adresse inconnue (banc par compteur injecté, pas par chronomètre).
  - Comparaison à temps constant.
  - Blocage **par compte** après 8 échecs, avec délai croissant par couple (compte, IP), pas de blocage dur qui permettrait de verrouiller une victime.
- **Une session prouve un mot de passe, pas une adresse** (règle du dépôt) : tout effet sensible (contact, espace, paiement, invitation) exige `V`.
- **Jetons de lien** : 128 bits, hachés, usage unique, avec échéance ; un lien d'invitation est dans le fragment de l'URL (`#`), donc hors des journaux du proxy.
- **Quotas** : en mémoire (comme `quotaOk`), par `req.ip` et par compte. Valeurs de départ :

| Geste | Limite |
|---|---|
| Inscription | 5 par heure par adresse, 20 par heure par IP |
| Connexion | 30 par heure par compte, 200 par heure par IP |
| Mot de passe oublié | 3 par heure par adresse |
| Messages | 60 par minute par compte |
| Création de groupe | 20 par heure |
| Courriels d'invitation | 10 par jour par compte, gabarit fixe, 2 par semaine par destinataire |
| Appels | 30 par heure |
| Saisie | 1 par 2 s |

  - Compte de moins de 24 h : limites plus basses.
  - Corps JSON limité à 64 Ko, pièces en flux.
  - Un « bouclier » activable par preuve de travail à l'inscription, fait main, en cas d'attaque.
- **Page** : tout texte venu d'un tiers passe par `textContent` ou une fonction d'échappement unique, jamais `innerHTML`. Un banc injecte du HTML dans chaque champ de la vraie page.
- **Journaux** : jamais d'adresse, de nom, de texte, de nom de fichier, de jeton, de code de réunion. Identifiants tronqués, IP seulement hachée avec sel quotidien, pas de pile dans les réponses. `/health` est agrégé. Un banc à canaris rejoue tout un scénario et cherche chaque canari.
- **Conformité (textes à valider par Justin)**
  - Âge minimal 15 ans, case obligatoire avec version des CGU enregistrée.
  - Rôles RGPD : TEAM OP est responsable de traitement pour les comptes Perso, sous-traitant pour un espace Pro.
  - Registre des traitements, `sous-traitance.html` propre à OP MESSAGES.
  - Export et suppression de compte avant toute ouverture.
  - Sous-traitants à nommer : hébergeur, stockage objet, Stripe, courriel, services push.

### 3.7 Sauvegarde

- **Base** : toutes les heures. Instantané par `backup()` de `node:sqlite` (repli `VACUUM INTO`, comme `socle.js`), compressé, chiffré en AES-256-GCM avec une clé de sauvegarde **différente** de la clé maître et de celle d'OP GESTION. Envoi par `s3.js` copié vers un **bucket distinct avec sa propre paire de clés**.
- **Pièces** : envoi incrémental par identifiant (elles sont immuables), déjà scellées.
- **Rétention** : 14 jours. Au-delà, les messages éphémères restent dans les archives plus longtemps que promis, alors que la politique de confidentialité s'engage. La table `purge` est rejouée après toute restauration.
- **Relecture obligatoire** après chaque dépôt (retéléchargement, déchiffrement, `PRAGMA quick_check`, comptage). `outils/restaurer.js essai` restaure dans un dossier jetable ; exercice mensuel.
- **Surveillance** : `/health` publie `sauvegarde{configuree, ageH, essaiJours, echecs}`. Chaque champ est surveillé ou nommé « vu et pas surveillé » (leçon `atts` et `mailRefus`) : `.github/scripts/surveillance-messages.js` à part, pour ne pas toucher aux listes de `test-726`. Elle crie une sauvegarde configurée dont la dernière copie relue a plus de 2 h (ou qui n'en a aucune), deux échecs de suite, et — **en production seulement** — aucun essai de restauration réussi depuis 35 jours (la bêta est jetable : un essai y serait du bruit).
- **La perte de la clé maître rend tout illisible.** C'est le risque n°1. Elle va au gestionnaire de mots de passe de Justin en saisie masquée, jamais affichée sur le VPS ni collée dans la conversation (règle du 24 septembre).
- **Avant toute personne extérieure à l'équipe, un essai de restauration doit avoir réussi.** Les données de la bêta sont jetables et le disent.

### 3.8 Facturation (Messages Pro, 15 € par utilisateur et par mois)

- **Stripe par `fetch`**, sans bibliothèque, **sans webhook en v1**. L'URL de base n'est modifiable que par les bancs.
- **Le corps ne décide jamais** de ce qui a été payé.
  - L'identifiant du prix vient de la configuration (liste blanche), jamais du corps.
  - L'espace vient de la base ; le propriétaire doit avoir une adresse confirmée ; `customer_email` vient de la session.
  - `client_reference_id = opmsg:<espace>` et `metadata[produit]=opmsg`.
  - Places bornées de 1 à 500 ; un seul abonnement vivant par espace (409, avec lien vers le portail).
  - Les changements de places passent par le portail Stripe. La baisse ne descend jamais sous le nombre de membres.
- **Verdict toujours relu chez Stripe** : au retour du paiement, par `POST /relire`, et toutes les 10 minutes pour les espaces abonnés.
  - Payé = `active` ou `trialing`, rien d'autre.
  - `past_due` et `unpaid` sont des impayés.
  - **Une panne de notre côté ou de Stripe ne suspend personne** : le dernier état connu sert, `/health` publie `stripeEchecMin`.
  - Un impayé garde l'historique et les fonctions Perso ; seules les fonctions Pro refusent après 7 jours de sursis, et seul l'administrateur voit pourquoi. Rien n'est effacé.
- **Fonctions Pro refusées côté serveur** : programmer une réunion, appeler à plus de 2, créer un canal ou un espace. Les invités rejoignent sans siège.
- **Bêta** : tout est ouvert, sans paiement, drapeau lu à un seul endroit (`formuleDe`), comme `BETA_ESSAI`.
- **Pas de code promo en v1.**
- **Couture avec OP GESTION à tenir par un banc côté OP GESTION** : le compte Stripe est commun. `STRIPE_PRIX_MESSAGES` (`index.js:3134`) et `ligneMessages` (`:3150`) rangent déjà ces lignes comme « OP MESSAGES seul : rien de payé pour OP GESTION ». Un banc avec faux Stripe (modèle de `test-844`) doit jouer un abonnement Messages Pro, y compris impayé, à la même adresse qu'une entreprise OP GESTION, et vérifier que son verdict ne change pas. `REPRISE.md:979` l'annonce déjà comme à relire avant la première vente.
- **Une clé Stripe restreinte** (Checkout, Customers, Subscriptions, portail) propre à OP MESSAGES, jamais celle d'OP GESTION.

### 3.9 Bêta

- **Instance séparée** (`teamop-msg@beta`, `msg-beta.teamop.fr`) : son propre dossier, sa propre configuration, sa propre paire VAPID, son propre préfixe de sauvegarde, sans Stripe réel.
- **Porte** : `POST /api/beta/entrer {login, pass}`.
  - L'instance applique d'abord **son propre plafond** (5 essais par 15 min par login et par IP).
  - Elle appelle `http://127.0.0.1:8080/api/beta/login` en boucle locale avec `X-Forwarded-For: <IP réelle>`, pour que le plafond d'OP GESTION compte la bonne adresse.
  - Le mot de passe ne sort pas de la machine, n'est ni gardé ni journalisé.
  - Si c'est `ok`, elle crée ou retrouve le compte `beta:<login>` (adresse confirmée par construction, `origine='beta'`) et pose le cookie de session.
  - **Fermée par défaut** : si OP GESTION ne répond pas, 503 `porte_indisponible`.
- **Accès coupé depuis la Tour** : toutes les 60 s, l'instance appelle `/api/beta/etat` pour chaque login qui a une session ou un flux ouvert. S'il est coupé, ses sessions sont supprimées et ses flux fermés.
- **Aucun changement dans `server/`.** Le champ « chantier » de la Tour sert déjà à dire qui teste quoi.
- **Toutes les fonctions sont ouvertes** (Pro compris). L'inscription publique par courriel s'ajoute derrière la même porte à l'étape 2.
- La page `messages-beta.html` sans garde et branchée sur Firebase est remplacée par la redirection. Elle n'est pas régénérée par `beta-build.js`.

### 3.10 Déploiement par la CI

- **Nouveau workflow `.github/workflows/deploiement-messages.yml`**
  - Déclenché par un push sur `main` qui touche `server-msg/**`, `scripts/bancs-messages.liste` ou le workflow lui-même.
  - **Job `bancs`**
    - `npm ci --omit=dev --ignore-scripts --prefix server-msg`, puis `node --check` sur chaque fichier.
    - `bash scripts/bancs-ci.sh $(liste)` avec `BANCS_PLANCHER` pris de la ligne `#plancher` de la liste, qui sert aussi de compteur unique.
    - Une liste qui nomme un fichier absent fait échouer le compteur.
    - La liste est limitée aux suites OP MESSAGES, qui ne lisent ni `app.html` ni `tour.html`.
  - **Job `deployer-beta`** (`needs: bancs`) : à chaque push.
  - **Job `deployer-prod`** : `workflow_dispatch` avec `cible=prod` et le SHA, avec un **environnement GitHub `msg-prod` dont Justin est le relecteur obligatoire**. C'est sa « phrase » traduite en geste.
  - `concurrency: deploiement-vps` posé **sur les jobs qui touchent le VPS** : on évite deux déploiements simultanés sans bloquer les bancs.
  - Jamais de `journalctl` dans les journaux de CI (dépôt public) ; jamais d'apostrophe dans un `${var:?mot}`.
  - Tant que `teamop-msg@beta` n'est pas installé, le job écrit « non installé » et sort en 0 : on peut fusionner le code avant l'installation.
- **Sur le VPS**
  - `deployer.sh <beta|prod> <sha>`, déposé et possédé par root par `install-msg.sh`. Il se met à jour en relançant l'installation, ce que la CI ne fait pas.
  - Clé SSH dédiée `VPS_SSH_KEY_MSG` avec **commande forcée** dans `authorized_keys` : elle ne peut rien faire d'autre que déployer OP MESSAGES.
  - Le script prend un `flock`, met à jour **son propre miroir** `/opt/opmsg/repo` (jamais `/opt/teamop/repo`), exporte `releases/<sha>`, lance `npm ci` **en tant que `opmsg`** et avec `--ignore-scripts`, bascule le lien, redémarre, et contrôle `/health` (qui doit rendre le bon SHA).
  - **En cas d'échec il revient au lien précédent.** Il compare au SHA transmis par la CI.
- **`deploiement.yml` ne change pas** : il filtre sur `server/**`. Un push sur `server-msg/` ne redémarre pas `teamop-api` et inversement.
- **Adaptation obligatoire dans le même commit** :
  - `tests/test-728.js:200` (`['ci.yml','deploiement.yml']` devient trois entrées) ;
  - `scripts/preparer-deploiement-serveur.sh:41`, qui fabrique le commit de déploiement du serveur seul sur `main` : il doit aussi extraire `server-msg/`, le nouveau workflow et sa liste, sinon rien d'OP MESSAGES n'arrive jamais sur `main`.
- Ce workflow est lui-même un changement de `.github/workflows/` qui part sur `main` avec les bancs.

### 3.11 Bancs (`tests/test-9NN.js`, sans dépendance, format `N ✓ M ✗`)

Les familles imitent celles du dépôt. Chaque suite saute d'elle-même si `server-msg/node_modules` manque, mais la CI installe les dépendances et le plancher de la liste empêche un faux vert.

1. **Séparation** : aucun `require` croisé, aucune lecture de `/opt/teamop` ni `/etc/teamop`, démarrage refusé sous ces arbres, listes de bancs disjointes, **`s3.js` identique à `server/s3.js`**, aucune trace de Firebase ni de domaine tiers, un jeton `opm_…` n'est pas accepté par la regex d'OP GESTION.
2. **Stockage** (module, dépendances injectées) : migrations, scellage, une ligne recopiée ou permutée refusée, mauvaise clé refusée, `poser-cle` refuse de régénérer si une base existe (modèle de `test-729`), idempotence par `cid` avec un deuxième passage, `seq`, non-lus, pierre tombale, éphémères à horloge injectable, population comptée avant de croire un zéro.
3. **Vrai serveur parlé en HTTP** : processus isolé (`OPMSG_CONFIG`, `OPMSG_DATA`, port), faux SMTP qui retire le point doublé et vise le lien du geste, faux Stripe, faux OP GESTION puis **vrai OP GESTION** avec un `beta-comptes.json` de test (couture réelle de la porte), faux S3.
4. **Matrice d'accès** : le manifeste de routes est une donnée ; chaque route est jouée contre {anonyme, non confirmé, non-membre, membre, administrateur, bloqué, suspendu}, en 404 et jamais 403 sur l'existence. Une route sans ligne dans la matrice fait tomber le banc.
5. **Page contre serveur** : les vraies fonctions de la page contre le vrai service, une par écran. Chaque code d'erreur est dit à l'écran. Un `fetch` qui ne jette pas sur un 4xx n'est pas une réussite. Une requête préalable réelle avec les en-têtes de la page.
6. **Temps réel** : deux clients, message en moins de 500 ms, reprise par `Last-Event-ID`, `resync`, membre retiré ne reçoit plus rien, session coupée ferme le flux, limites de flux, saisie non stockée, **coût au repos de deux appareils sur une base plus lourde que le budget**. Les attentes se jouent au geste, pas au chronomètre.
7. **Comptes et anti-abus** : réponses uniformes, nombre de dérivations scrypt compté, verrouillage, jeton à usage unique, `X-Forwarded-For` forgé ignoré, plafonds avec `Retry-After`.
8. **Pièces, push, injections** : octets contre type annoncé, EXIF, quota, aucun affichage de SVG ou HTML en ligne, canari absent des fichiers sur disque ; liste blanche d'hôtes push (127.0.0.1, adresses privées et `http` refusés), push réel via `generateRequestDetails` et déchiffrement ; HTML injecté dans chaque champ de la vraie page sans élément créé ; aucune concaténation SQL.
9. **Facturation** : corps falsifié ignoré, chaque statut Stripe, Stripe muet ne suspend personne, invitation au-delà des places refusée, **banc côté OP GESTION** pour la couture `ligneMessages`.
10. **Réunions et appels** : bascule d'heure du 25 octobre 2026 à Paris, récurrences, rappels une seule fois et rattrapage après arrêt, identifiants TURN recalculés indépendamment, signal refusé à un non-participant, appel manqué à 45 s, plafonds, un second passage pour attraper tout identifiant aléatoire.
11. **Sauvegarde** : instantané cohérent pendant des écritures, rien en clair dans l'archive, restauration équivalente, rejeu de `purge`, mauvaise clé refusée, rétention (`test-950` : le module seul ; `test-951` : le vrai service, un faux S3 qui recalcule les signatures, les deux outils de Justin en processus et sous un terminal).
12. **Santé et workflow** : chaque champ de `/health` surveillé ou nommé (chemin complet, commentaires retirés) ; lecture de `needs`, filtres de chemins disjoints, `bash -n` de chaque script, production seulement en `workflow_dispatch`, retour arrière simulé.
13. **Contre-épreuves** : pour chaque suite, une mutation du défaut qu'elle garde, vérifiée au bon endroit (`git diff` après la mutation). **Correctif commité avant de muter**, puis `git checkout`. Si une mutation fait tomber des contrôles sans rapport, regarder `git status` d'abord.
14. **Hors CI, au navigateur, sur la bêta seulement** : sonde avec un vrai envoi sur deux appareils (largeurs 360 à bureau, encoches simulées, valeurs longues, contrastes au pixel via SwiftShader, rôle non administrateur, zéro erreur console). WebRTC : Chromium avec `--use-fake-device-for-media-stream`.

## 4. Découpage en étapes

Aucune étape ne touche `app.html`, `beta.html`, `sw.js` ni `server/`.

### Étape 1 : socle, porte bêta, messagerie texte en temps réel (livrable vite)

- **Contenu**
  - Service, base, scellage, `/health`, unité systemd, workflow de déploiement et ses bancs.
  - Porte bêta, compte `beta:<login>` avec nom affiché.
  - Contacts par lien ou QR, conversations directes, **groupes** (admins, « seuls les admins écrivent », éphémères, lien), messages texte (réponse, réaction, modification et suppression).
  - SSE, lu, saisie, non-lus, présence, notifications dans l'application.
  - Front : l'aperçu de Justin (`apercu/opmessages/index.html`) branché sur le service. Il garde une couche de données interchangeable (démo ou API) pour que les écrans validés ne se réécrivent pas.
- **Justin teste** : il ouvre `msg-beta.teamop.fr` avec un accès bêta de la Tour. Il crée un groupe, invite un collègue par lien. Deux téléphones discutent en direct (« Lu », trois points de saisie, non-lus). Il coupe l'accès dans la Tour et la page se ferme. Il coupe le réseau d'un appareil, et à la reconnexion rien n'est perdu ni dupliqué.
- **Gestes de Justin**
  1. Sur le VPS : `ss -ltnp | grep -E ':(80|443) '` et coller le résultat (rien de secret), pour trancher nginx ou Caddy.
  2. DNS : un enregistrement `A` pour `msg-beta` vers 217.154.6.139, TTL 300 s.
  3. Lancer `bash install-msg.sh` sur le VPS : crée l'utilisateur, les dossiers, l'unité, la clé maître, le bloc proxy et le certificat. Il n'affiche que l'état de `/health`.
  4. Copier la clé maître au gestionnaire de mots de passe (saisie masquée).
  5. Ajouter le secret `VPS_SSH_KEY_MSG` dans GitHub et la ligne publique `authorized_keys` que le script imprime.

### Étape 2 : comptes publics et push

> ⛔ **Décision de Justin, 1er octobre 2026 au soir** : « les liens de connexion c'est que pour le côté pro ; pour l'utilisateur
> classique c'est avec leur numéro de téléphone » ; les contacts se retrouvent par numéro « comme WhatsApp » ; prestataire SMS :
> **OVHcloud** (« go ») ; « je veux une connexion pour TOUS les pays, je veux voir plus que WhatsApp » ; et surtout « **le but c'est
> qu'on gagne de l'argent** » : le Perso est gratuit, donc **chaque SMS est un coût**, et il ne doit exister AUCUNE possibilité de nous
> faire payer des SMS en masse. L'inscription par courriel d'origine est remplacée pour le Perso. **Le PRO n'est pas construit ici** :
> il entre par un **lien de connexion créé par TEAM OP** (étape 5, espaces Pro) — les liens de connexion ne sont pas pour le Perso.

#### 2.1 Ce qui est FAIT, côté serveur seulement (2 octobre 2026 — `server-msg/telephone.js`, `numero.js`, `sms-garde.js`, `sms-ovh.js`, `sms-prix.js`, `configurer-sms.js`)

| route | garde | ce qu'elle fait |
|---|---|---|
| `POST /api/tel/code {numero}` | P | envoie UN code à 6 chiffres par SMS — ou, sur un appareil déjà vérifié pour ce numéro, **reconnecte sans SMS** |
| `POST /api/tel/verifier {numero, code, prenom?, nom?, appareil?}` | P | prouve le code : crée le compte (origine `telephone`) ou connecte ; pose la session ET le jeton d'appareil |
| `POST /api/tel/appareil` | P | se reconnecte avec le seul jeton d'appareil (cookie `__Host-opma`) : **aucun SMS** |
| `POST /api/contacts/chercher {numero}` | V | `{trouve:true, id, prenom, deja_contact, ajout_possible}` ou `{trouve:false}` — la même réponse neutre dans tous les autres cas |
| `POST /api/contacts/ajouter {id}` | V | n'ajoute qu'une personne qu'on vient de trouver (10 min), revérifiée à l'ajout (réglage, blocage) ; la prévient |
| `GET\|POST /api/moi/confidentialite {trouvable}` | S | « qui peut me trouver par mon numéro » : `tous` (défaut) \| `personne` |
| `POST /api/moi/appareils/deconnecter` | S | **« Déconnecter les autres appareils »** : coupe toutes les sessions et tous les jetons d'appareil de la personne SAUF ceux d'où elle le demande (relecture adverse, 2 octobre : un téléphone perdu, un numéro réattribué) |

**Identité** : le numéro est normalisé en E.164 (`numero.js`, fait main), **haché** (HMAC par la clé maître) pour l'unicité, et **scellé au repos** comme une adresse (`tel:+…` dans `personne.email_ch`). Il n'est **jamais** rendu : ni par `/api/moi`, ni par la recherche, ni par une notification, ni dans un journal, ni dans `/health`. Le code est tiré par `crypto.randomInt`, rangé **haché**, vit 10 minutes, 5 essais **comptés avant d'être jugés**, usage unique, comparaison à temps constant, et le même travail est fait que le numéro ait un code en attente ou non. ⛔ **Il est LIÉ À L'APPAREIL qui l'a demandé** (`code_tel.ap_h`, le cookie d'appareil haché) : un inconnu qui ne connaît que le numéro ne peut ni le deviner ni le BRÛLER (cinq faux essais d'un autre appareil ne comptent pas sur le code de la victime), et les échecs de vérification se comptent par (numéro, appareil) — ils ne verrouillent plus la vérification du numéro d'un autre. Contrepartie : le code se tape dans le MÊME navigateur que celui qui l'a demandé. Un code collé avec ses espaces (« 123 456 ») est le même code ; un prénom invalide ne consomme pas le code.

**Des réponses uniformes** : `/api/tel/code` répond pareil pour un numéro avec compte et sans (un SMS part dans les deux cas) ; `/api/tel/verifier` répond `401 code_invalide` octet pour octet pour un code faux, périmé, déjà utilisé, un numéro sans compte ou sans code demandé. On ne dit jamais « ce numéro a un compte » avant la preuve du code.

#### 2.2 ⛔ MOINS DE SMS (chaque SMS coûte)

- **Un SMS à l'inscription et sur un NOUVEL appareil, jamais à chaque connexion.** Session de **90 jours glissants** (renouvelée à l'usage, une écriture par heure au plus) ; un appareil déjà vérifié porte un **jeton d'appareil** (`opd_…`, cookie `HttpOnly`/`Strict`/`__Host-`, **haché** en base, 180 jours glissants — l'USAGE de la session le prolonge —, **plafond absolu d'un an** depuis sa dernière preuve par SMS, 10 appareils par personne) qui le reconnecte **sans SMS**, même session perdue. « Se déconnecter » coupe aussi le jeton d'appareil (sinon la déconnexion se déferait au prochain lancement).
- ⛔ **Un numéro réattribué, une SIM échangée** : le nouveau titulaire entre dans le compte de l'ancien (le numéro EST l'identité). Ce que le serveur fait : un appareil que le compte ne connaît pas qui se prouve par SMS déclenche une notification **« Nouvel appareil connecté »** à tous les autres, et « Déconnecter les autres appareils » coupe sessions ET jetons d'un geste. Ce qu'il ne peut PAS faire : savoir qui est le « bon » titulaire. **La vraie réponse est la clé d'accès (ci-dessous) ou un code de verrouillage choisi par la personne — non construits.**
- Renvoi du code : **pas avant 60 s** (`Retry-After` vrai). ⛔ Selon l'issue : **numéro invalide pour OVH** → plafonds GARDÉS (sinon on sonde des numéros à volonté sur nos clés d'API) ; **rien n'a pu partir** (heure d'OVH illisible, DNS, connexion refusée, 503) → coût ET plafonds RENDUS ; **incertain** (délai, coupure en route, 500) → coût et plafonds gardés, le CODE aussi, et la réponse est celle d'un envoi réussi avec `incertain: true` (l'écran peut dire « s'il n'arrive pas, redemandez »).
- **Proposé à Justin — la connexion par clé d'accès (passkey, WebAuthn : Face ID / empreinte)** : après la première inscription par SMS, le téléphone enregistre une clé d'accès ; les connexions suivantes et les nouveaux appareils de la même personne (synchronisation iCloud / Google) n'ont plus besoin d'aucun SMS. C'est le gain le plus net sur le coût ET sur la fraude (un robot ne déclenche rien). Elle demande une page (`navigator.credentials`), deux routes (`/api/passkey/enregistrer`, `/api/passkey/connexion`), le stockage de la clé publique, la vérification de signature (fait main avec `crypto`, comme tout le reste), et un SMS de secours pour le jour où la clé est perdue. **Étape suivante, non construite, à décider.**

#### 2.3 ⛔ ANTI-FRAUDE ET PLAFONDS — « une connexion pour TOUS les pays » : on ne protège pas par le OÙ mais par le COMBIEN

Aucune liste blanche de pays : tout numéro **mobile** valide du monde peut s'inscrire. Un SMS international coûte de 2 centimes à plus de 80 centimes (grille d'OVH), et la fraude au « SMS pumping » (des robots qui déclenchent des SMS vers des destinations chères ou surtaxées, dont le prix se partage avec le fraudeur) vise justement les pays chers. Les défenses, **dans l'ordre où une demande les traverse** :

1. **Le plan de numérotation** (`numero.js`) : seuls les **mobiles ordinaires** reçoivent un SMS. France : 06 et 07 seulement (le 08 est surtaxé ou spécial, le 09 est la voix sur IP, 01 à 05 sont fixes) ; ni fixe, ni surtaxé, ni « premium », ni satellite (+870 à +883), ni gratuit mondial (+800, +808), ni communications personnelles ; les plages surtaxées nord-américaines (900, 976…) ; plus la liste de configuration `sms.interdits` (plages connues pour la fraude). Un numéro mal formé ou non mobile → **400, aucun SMS, aucun coût**. ⚠️ *Plusieurs pays ne distinguent pas mobile et fixe dans ce tableau (Amérique du Nord, Danemark, Mexique, petits pays) : un fixe de ceux-là peut recevoir une tentative, que le budget borne.*
2. **Le bouclier d'un pays en emballement ET d'un budget qui se consomme** : (a) si un pays dépasse son plancher (`emballement.plancher`, 30 SMS par heure) **et** ×5 sa moyenne horaire des 7 derniers jours, **CE pays-là et lui seul** passe automatiquement en bouclier pour 6 h ; (b) ⛔ **dès que la dépense d'un pays — ou le total — atteint 40 % de son budget de l'heure ou du jour** (`emballement.partBudget`, 1 = jamais), tout nouveau SMS exige la preuve (dynamique : le bouclier tombe seul quand la fenêtre glissante redescend). (a) seul ne s'allumait que pour 10 pays sur 207 : le budget par pays (1,5 €/h) coupait presque tous les pays avant le plancher de 30 — la France à 20 SMS — et vingt requêtes anonymes en fermaient les inscriptions. Les 60 % restants du budget ne s'obtiennent donc QU'avec la preuve. Le bouclier, une fois allumé, exige : une **preuve de travail faite main** (SHA-256, 18 bits ≈ 0,3 s de calcul sur un téléphone) **et** un délai (5 s) avant tout nouveau SMS (`428 defi_requis`). La preuve est signée, liée au numéro et au pays, à usage unique, valable 10 minutes. `sms.bouclier.pays` force un pays d'avance ; `sms.bouclier.global` est l'interrupteur d'urgence (tous les pays).
3. **Les plafonds** (chacun avec un `Retry-After` vrai) : par **réseau** (/24 en IPv4 : 10 par heure ; IPv6 par /64 : 10 par heure ET par /48 : 40 par heure), par **numéro** (1 par 60 s, 5 par 24 h glissantes). ⛔ **DURABLES** : une ligne par SMS et par clé dans `sms_tentative` (des empreintes HMAC, gardées 2 jours), réservées **dans la même transaction que le budget** — un redémarrage ne les remet pas à zéro, et aucune table mémoire à saturer ne les évince (avant : 30 000 requêtes de /64 distincts, 14 s, les effaçaient — six SMS vers la même victime en deux minutes). **Il n'y a PAS de plafond par appareil** : le jeton d'appareil est tenu par celui qui le présente, un robot qui n'en renvoie pas en reçoit un neuf — il ne retenait que les personnes honnêtes.
4. **Le BUDGET EN EUROS**, réservé dans une transaction **avant** l'envoi (deux requêtes simultanées ne franchissent pas le budget ensemble), sur le journal **durable** `sms_envoi` (un redémarrage ne remet pas le budget à zéro), en fenêtres **glissantes** (24 h, 1 h — minuit n'est pas un moment où l'on peut recommencer) : `sms.budgetJour` (**20 €**), `sms.budgetHeure` (5 €), `sms.budgetPaysJour` (**3 €**), `sms.budgetPaysHeure` (1,5 €), surcharge par pays `sms.budgetPays.{BE:{jour,heure}}`. ⛔ **Une RÉSERVE pour le marché d'origine** (`sms.reserve`, `{part: 0.4, pays: ['FR','RE','GP','MQ','GF','YT','PM','NC','PF']}`) : les autres pays ne dépensent, ensemble, que 60 % du budget global (3 €/h, 12 €/j) — sept SMS vers sept pays chers (4,87 €, depuis sept adresses) consommaient 97 % du budget de l'heure et fermaient la France ; ils n'en prennent plus que 60 %, la France garde son budget. `reserve.part: 0` la supprime. C'est un choix de produit : à confirmer par Justin. Au-delà : **503 `sms_indisponible`** (`portee: global|pays`), dit à l'écran, compté par motif dans `/health`. Le coût compté est le **coût RÉEL** d'OVH (`totalCreditsRemoved`) quand il est connu, sinon l'estimation de la **table de prix par pays** (`sms-prix.js` : 207 destinations relevées sur la grille publique d'OVH le 1er octobre 2026, 1 crédit = 0,06 €, marge de 25 %, **un pays absent coûte le pire connu : 1,05 €**) ; un envoi **incertain** (délai APRÈS l'envoi, coupure en route, 500) **garde son coût** (on suppose le pire) ; un refus franc d'OVH et tout ce qui n'a pas pu partir le rendent.
5. **L'enveloppe maximale** : au pire, **20 € par jour, soit 600 € par mois** — quoi que fasse un attaquant. Et un seul pays coûte au plus 3 € par jour.

⚠️ **Ce que les valeurs par défaut coûtent en inscriptions** : un SMS belge coûte 0,10 € estimé, donc 3 € par jour et par pays laissent passer ~30 SMS belges, ~40 français, ~17 allemands, **mais seulement 2 russes** (1,05 €) et 4 indonésiens. Pour un pays où l'on veut de vraies inscriptions (l'Inde, le Brésil, l'Algérie…), **Justin relève `sms.budgetPays.<PAYS>.jour`** en connaissance du prix. Voir `INSTALLER-LE-SERVEUR.md` § « SMS ».

**Surveillance** : `/health` publie `sms.{mode, envoyes24h, coutJourEur, budgetJourPct, budgetHeurePct, boucliers, ovhEchecs, refus}` — des **nombres**, jamais un numéro, jamais un pays par numéro. `.github/scripts/surveillance-messages.js` crie : mode autre qu'`ovh` en production, plus de 12 € dépensés en 24 h, 80 % d'un budget, un bouclier actif (y compris celui de l'argent), 3 échecs d'OVH de suite (`ovhEchecs` compte désormais aussi les refus 400/409/429 d'OVH — crédits épuisés, expéditeur refusé — et ce qui n'a pas pu partir ; pas « numéro invalide »), un refus « budget_… ». (Non branchée sur un workflow : le DNS de `msg-beta` n'existe pas encore.) ⚠️ `/health` est PUBLIC : le coût du jour, les pourcentages de budget et les refus par motif y sont lisibles de tous (ils aident à calibrer une attaque, et disent le volume d'inscriptions). Les réduire demande un jeton de lecture ET un secret côté GitHub (un geste de Justin) — **non fait, à décider**.

#### 2.4 L'envoi par OVHcloud (`sms-ovh.js`, fait main, aucune bibliothèque)

`POST /sms/{serviceName}/jobs` `{message, sender, receivers:[numéro], noStopClause:true, priority:'high', validityPeriod:15}` ; signature **« $1$ » + SHA-1** de `secretApplication + clé consommateur + méthode + URL complète + corps + horodatage`, jointes par « + » ; l'horodatage est celui du **serveur d'OVH** (`GET /auth/time`), pas le nôtre. Message : « Votre code OP MESSAGES : 123456 », plus, si `sms.domaine` est posé, la ligne `@domaine #123456` que Chrome et Safari savent remplir tout seuls. Identifiants dans la configuration (`sms.ovh.{appKey, appSecret, consumerKey, serviceName, expediteur}`), posés par `configurer-sms.js` en **saisie masquée** et **éprouvés avant d'être écrits** (un appel signé qui ne coûte rien). Sans identifiants : en **bêta**, mode « journal » (aucun SMS ; le code n'est **jamais** écrit en clair dans un journal) ; en **production**, **503 `sms_indisponible`**. En production, la base d'API ne peut être que l'un des trois points d'entrée d'OVH (Europe, Canada, États-Unis) : nos clés de signature ne partent pas ailleurs.

⚠️ **NON VÉRIFIÉ — l'envoi réel.** Ce dépôt n'a pas de compte OVH : le banc (`test-913`) joue un FAUX OVH qui recalcule la signature de son côté, ce qui prouve que le module signe comme la documentation publique le décrit, **pas qu'OVH l'accepte**. Restent à constater par Justin : un SMS qui arrive vraiment, l'expéditeur alphanumérique accepté (certains pays — États-Unis, Canada, Inde — exigent un expéditeur enregistré ou le réécrivent), l'envoi international activé sur le compte, le prix réel par pays.

**Le code par APPEL VOCAL quand le SMS n'arrive pas** (« plus que WhatsApp », sans payer plus) : **non construit, et je ne sais pas si OVH le permet** pour un code à usage unique — OVHcloud vend aussi de la téléphonie, mais je n'ai pas pu vérifier qu'elle appelle un numéro étranger avec une voix de synthèse pour un code à usage unique, ni à quel prix. **Étape suivante proposée** : demander à OVH (ou à un autre prestataire vocal) le prix d'un appel sortant par pays ; un appel coûte bien plus qu'un SMS, donc il passerait par le même budget en euros, après un SMS non reçu et jamais sans lui. D'ici là, l'écran dit « pas reçu ? renvoyer dans 60 s », et l'appareil connu n'a besoin de rien.

#### 2.5 Contacts par numéro (« comme WhatsApp », sans annuaire)

Voir les routes ci-dessus. Plafond durable par compte et par jour **compté avant de savoir si le numéro existe** ; même latence plancher (`sms.rechercheLatenceMs`, 150 ms) que le numéro existe ou non ; un compte de moins de 24 h a un tiers des plafonds (recherches ET ajouts) ; `ajouter` ne marche que sur une personne qu'on **vient de trouver** (10 minutes, mémoire bornée) et se **revérifie** au moment de l'ajout. Une personne qui se règle sur `personne` n'est trouvée par personne ; un blocage la rend invisible à celui qu'elle a bloqué.

#### 2.6 Stockage (migration 2) et configuration

`personne` est **reconstruite** (SQLite ne change pas un `CHECK` en place) : `origine` accepte `telephone`, `trouvable` s'ajoute ; copie `.avant-v2` gardée ; clés étrangères coupées hors transaction puis contrôlées (`foreign_key_check`). Tables neuves : `code_tel` (haché, lié à l'appareil demandeur), `appareil_tel` (haché), `sms_envoi` (**date, pays, coût — jamais un numéro**), `sms_tentative` (les plafonds : empreintes HMAC de numéro et de réseau + date, 2 jours), `sms_bouclier`, `recherche_tel`. ⛔ **L'élagage tourne** (le balayeur, `smsElaguer`) : un code expiré part au bout d'une heure (l'empreinte du numéro d'une personne jamais inscrite n'a pas à rester), les plafonds et les recherches au bout de deux jours, le journal des SMS au bout de 8 jours (de quoi calculer l'emballement), un appareil au plus tard un an après sa dernière preuve. (La migration 2 a été corrigée en place, jamais déployée : aucune base installée n'est au schéma 2.) Configuration `sms.*` **validée au démarrage** (un budget négatif, des identifiants à moitié posés, une base d'OVH étrangère en production refusent le démarrage). La porte de test des codes (`OPMSG_TEST_CODES`, un fichier où le service écrit le code en clair pour les bancs) est **refusée au démarrage en production**.

#### 2.7 Ce que ce chantier n'a PAS fait (étape 2, suite)

- **L'interface** (`server-msg/public/` : écran d'inscription par numéro, sélecteur de pays, champ du code, « pas reçu ? ») : une autre équipe la branche ; elle appelle ces routes et lit `Retry-After`, `error` et `portee`.
- **Les notifications push, l'export, la suppression de compte** : la suppression devra effacer `appareil_tel` (`telAppareilsSupprimerPersonne` existe, la cascade aussi) et, **pour un numéro réattribué par l'opérateur, ne jamais reconnecter l'ancien compte sur le seul numéro** sans nouveau code.
- **Le changement de numéro** (un nouveau code vers le nouveau numéro ET une preuve de l'ancien appareil) ; **les clés d'accès** (§ 2.2) ; **l'appel vocal** (§ 2.4) ; **le PRO** par lien de connexion créé par TEAM OP (étape 5).
- **Les textes légaux** : un numéro de téléphone est une donnée personnelle ; OVHcloud devient un sous-traitant (`sous-traitance.html`, registre des traitements) avant l'ouverture au public.
- **Ce que la relecture adverse (`gardien` + `testeur`, 2 octobre 2026) a trouvé et que ce chantier NE corrige PAS**, à décider par Justin : (1) **`contacts/ajouter` crée un contact mutuel sans l'accord de la personne trouvée** (elle voit le statut et la présence de l'autre, qui peut lui écrire) ; le réglage `trouvable` vaut `tous` par défaut. C'est « comme WhatsApp » (décision du 1er octobre), mais une **demande de contact à accepter**, ou `personne` par défaut, serait plus protecteur. (2) **Le verrouillage d'un numéro par ses 5 demandes de SMS** (5 par 24 h, même pour son propriétaire) : inhérent à tout plafond par numéro ; la clé d'accès le règle. (3) **Un NAT d'opérateur ou un bureau** : 10 SMS par heure et par /24 — au-delà, 429 jusqu'à une heure ; réglable (`quotas.tel_reseau`). (4) **Les pays absents de la table de prix** (Porto Rico, Rép. dominicaine, Kosovo…) sont estimés au pire (1,05 € : un seul SMS par heure et par pays) : à corriger par `sms.prix.PR` quand on connaît le prix réel. (5) **Un prénom vide est accepté** à l'inscription (l'écran doit le demander). (6) **Le HTML d'un prénom** n'est pas échappé côté serveur (l'écran doit le faire).

**Bancs** : `test-912` (plan de numérotation et prix), `913` (envoi OVH contre un faux qui vérifie la signature ; `incertain` contre `non_envoye`), `914` (inscription, session 90 jours glissants, nouvel appareil, reconnexion sans SMS, uniformité, canaris), `915` (plafonds durables, budgets, bouclier de l'argent, réserve, emballement, panne d'OVH), `916` (garde, plafonds, défi, élagage et migration, modules seuls), `917` (recherche par numéro, anti-énumération), `918` (`configurer-sms.js` jusque sous un vrai terminal, surveillance, gardes de code), `919` (un inconnu face au code d'un autre, nouvel appareil, déconnexion des autres, appareil borné, un seul E.164, élagage). Mutations : `node tests/mutations-telephone.js`.

- **Contenu** (reste de l'étape) : réglages, notifications push (paire VAPID propre, portée de service worker propre).
- **Justin teste** : il s'inscrit avec son numéro derrière la porte, reçoit le SMS, se déconnecte et se reconnecte sans SMS, retrouve un collègue par son numéro. Il reçoit un push sur son téléphone.
- **Gestes de Justin** : un compte SMS OVHcloud, l'envoi international activé, des crédits, une clé d'API aux droits minimaux posée en saisie masquée (`INSTALLER-LE-SERVEUR.md` § « SMS ») ; sur iPhone, « Ajouter à l'écran d'accueil » sinon pas de push.

### Étape 3 : sauvegarde hors site et exercice de restauration

- **Contenu** : instantané horaire chiffré, rétention 14 jours, relecture, `restaurer.js essai`, surveillance, relecture adverse de l'agent `gardien` sur le service.
- **Justin teste** : un essai de restauration réussi, rapporté chiffres à l'appui. **Porte avant toute personne hors équipe.**
- **Gestes de Justin** : un bucket S3 distinct avec sa propre paire de clés, puis la clé de sauvegarde (née sur son Mac), le tout posé en saisie masquée par `configurer-sauvegarde.js` (`INSTALLER-LE-SERVEUR.md` § 10 ter, gestes 1 à 7), l'essai de restauration (geste 6).
- ✅ **Construit le 2 octobre 2026 — attend les gestes de Justin** (aucun coffre réel n'existe encore ; `/health` dit `"configuree":false` tant que le bloc `sauvegarde` n'est pas posé). Ce qui existe :
  · `lib/s3.js` — copie **octet pour octet** de `server/s3.js` (un banc le compare) ;
  · `sauvegarde.js` — l'instantané (`stockage.instantane` : l'API de sauvegarde de SQLite sur une connexion lectrice à part, **en un seul pas** — par petits pas, sous écritures, la copie ne finissait pas : mesuré), l'archive AES-256-GCM en flux (format versionné, deux lignes d'en-tête liées à l'authentification : une archive de la bêta recopiée sous la production, ou rebaptisée, ne s'ouvre plus), le dépôt, la **relecture obligatoire** (empreinte, déchiffrement, `quick_check`, comptage des lignes dans un processus enfant, tout comparé à l'instantané), l'archive non relue **retirée** du coffre, les pièces en miroir incrémental (suppression propagée, gardes qui refusent de vider le coffre sur une liste douteuse), la rétention (14 jours, jamais 0, jamais moins de 3 copies) ;
  · `outils/restaurer.js` — `essai` (dossier jetable, rejeu de `purge`, vérification que la clé maître ouvre la base, date écrite pour `/health`), `liste`, `restaurer --vers` (jamais sur une base existante sans `--ecraser`, service arrêté, l'ancienne mise de côté et jamais effacée) ;
  · `configurer-sauvegarde.js` + `saisie.js` — saisie masquée en mode brut (aucune réécriture d'un secret, vérifié sous un vrai terminal), clé de sauvegarde saisie **deux fois** (la seconde relue dans le gestionnaire), refus d'une clé égale à la clé maître, **épreuve du coffre avant d'écrire** (dépôt, relecture, liste, effacement sous le vrai préfixe), écriture atomique en 0600 qui garde propriétaire et autres réglages, `--verifier` pour relire chaque copie de la clé.
- **Bancs** : `test-950` (le module seul, et le classement des tables du schéma), `test-951` (le vrai service, le faux coffre, les outils en processus et sous un terminal, le guide lu contre le code). Mutations : `node tests/mutations-sauvegarde.js`.
- **Ce que les bancs ne prouvent pas**, dit tel quel : (1) **qu'IONOS accepte** — le coffre des bancs est un faux qui recalcule les signatures comme AWS le documente ; le premier dépôt réel est l'épreuve du geste 4 ; (2) **la procédure de sinistre sur un VPS neuf** (`INSTALLER-LE-SERVEUR.md` § 10 ter, geste 9) — écrite d'après le code, jouée contre le faux coffre, jamais sur une vraie machine ; (3) **que les pièces s'ouvrent** après restauration — l'essai relit leurs octets, elles sont scellées par la clé maître ; (4) **une base de plusieurs Gio** — mesuré : 90 Mio copiés en 0,25 s et jamais figé, mais pas au-delà.
- **Ce qui reste, et n'est pas de ce lot** : (1) `messageSupprimer(pour:'tous')` **n'écrit pas dans `purge`** : `rejouerPurge` sait rejouer le genre `message_supprime` (banc), mais seuls les messages éphémères l'écrivent — un message supprimé pour tous après la dernière copie **reviendrait** à la restauration ; à brancher avec le lot des pièces, qui touche la même fonction. (2) `purge` n'est jamais élaguée (elle grossit lentement). (3) Les copies horaires ne sont pas amincies (336 copies gardées pendant 14 jours) : à mesurer quand la base grossit. (4) **Le service détient les droits d'effacement du coffre** (il en a besoin pour la rétention) : quelqu'un qui prendrait le service pourrait effacer les copies ; une copie mensuelle hors de sa portée est la parade, plus tard. (5) `TABLES_COMPTEES` et `sonde()` (stockage.js) listent les tables que la copie compte : `test-950` fait tomber toute table neuve non classée — le dire à l'auteur de l'étape suivante. (6) Les pièces partent par lots (500 par passe, huit minutes au plus) : un retard initial se résorbe en heures, pas en minutes, et le nombre restant est dans l'état interne du service, pas dans `/health` (qui ne publie que quatre champs).

### Étape 4 : pièces

- **Contenu** : photos, vocaux (forme d'onde calculée sur l'appareil), fichiers, photo de profil, quotas, sauvegarde des pièces.
- **Justin teste** : le « + » et le micro d'une conversation, bulles photo, vocal avec forme d'onde.
- **Gestes** : aucun.

### Étape 5 : espaces professionnels et Messages Pro

- **Contenu** : espaces, invitations par lien, canaux, annuaire de l'entreprise, formule, facturation en **mode test**, banc côté OP GESTION.
- **Justin teste** : « Contacts de l'entreprise », canaux, Réglages > Abonnement, page de paiement de la bêta avec carte de test.
- **Gestes de Justin** : clé Stripe restreinte en saisie masquée ; activer le portail de facturation ; confirmer quels prix `msgpro` sont les bons (le dépôt en connaît deux, `price_1TwV6E…` et `price_1TwgdtF…`).

### Étape 6 : agenda et réunions programmées

- **Contenu** : Programmer, invités et leurs statuts, rappels (planificateur toutes les 10 à 15 s avec bail), notifications d'invitation et de rappel, courriel avec `.ics`, fuseaux, récurrences.
- **Justin teste** : l'onglet Réunions (semaine, fiche, feuille Programmer avec les champs réels), « Notifier les invités » qui notifie vraiment, un rappel reçu à l'heure.
- **Gestes** : aucun.

### Étape 7 : appels un à un, audio et vidéo

- **Contenu** : coturn, identifiants éphémères, signalisation, sonnerie, réponse, refus, manqué, historique Tous et Manqués, caméra activable, vignette « Vous », push d'appel.
- **Justin teste** : l'onglet Appels, un appel audio puis vidéo entre deux appareils, y compris sur 4G (relais).
- **Gestes de Justin** : ouvrir dans le panneau de l'hébergeur TCP et UDP 3478, TCP 5349 et UDP 49160-49999 ; vérifier le volume de trafic inclus dans l'offre ; lancer `install-turn.sh`.

### Étape 8 : appels de groupe et salle de réunion en maille

- **Contenu** : appel à plusieurs (4 en vidéo, 6 en audio), écran « En réunion » complet (galerie et intervenant, partage d'écran, participants, main levée, réactions, chat, sécurité, salle d'attente, REC local), liens d'invité.
- **Justin teste** : une réunion à 4 sur téléphones réels. Les mesures de débit et de CPU décident si la maille tient.
- **Gestes** : aucun de plus.

### Étape 9 : durcissement et ouverture

- **Contenu** : relecture adverse de `gardien`, test de charge, mesures aux largeurs et contrastes, textes légaux, double authentification des administrateurs d'espace, procédure de panne écrite, surveillance de la production.
- **Ouverture, uniquement sur la phrase de Justin**
  - L'instance `prod` est installée et déployée par `workflow_dispatch` avec approbation `msg-prod`.
  - Elle traite ensuite `opmessages.html`, `tarifs.html`, `recap-abonnement.html` (`OPMSG_BIENTOT`), `sw.js` (précache de `messages.html`, `/messages.html?appel=1` à la ligne 330), les liens `suite-opmsg` et `msg-flot` d'`app.html`, la retraite de `messages.html` et `messages-beta.html`, `firestore-opmessages.rules` et `firebase-console.js`.
  - C'est alors seulement que « éteindre Firebase » devient total (étapes E et F).
- **Gestes de Justin** : valider les textes légaux ; DNS `msg` ; la phrase « publie OP MESSAGES » ; approuver le déploiement.

### Étape 10 : SFU (seulement sur mesures)

- **Contenu** : LiveKit auto-hébergé pour les réunions de plus de 4 en vidéo et des contrôles contraignants ; puis sondages, salles de répartition et sous-titres une fois la question légale tranchée.
- **Gestes** : une machine dédiée est probablement nécessaire à ce stade (DNS `turn` et `sfu` déplacés, aucun changement de code).

**Machine dédiée, le jour venu** : restaurer la sauvegarde, rejouer `install-msg.sh`, repointer le DNS. Aucun changement de code.

## 5. Ce qui reste à trancher par Justin

1. **Origine du front** : `msg-beta.teamop.fr` sert sa propre page (même origine, cookie, CSP). *Recommandé* plutôt que `teamop.fr/messages-beta.html` (mêmes origine et `localStorage` qu'OP GESTION). Cela change l'URL que tu donnes à l'équipe.
2. **Proxy devant `api.teamop.fr`** : nginx ou Caddy. Une commande à coller. `REPRISE.md` dit nginx.
3. **Périmètre gratuit et payant** : *je recommande* groupes de texte, appels et vidéo à 2 gratuits en Perso ; canaux, espace, réunions programmées, appels de groupe et partage d'écran pour l'hôte Pro ; rejoindre toujours gratuit.
4. **Pas de chiffrement de bout en bout annoncé** : chiffré en transit et au repos seulement. *Recommandé*, le site ne doit rien promettre d'autre.
5. **Âge minimal 15 ans et pas d'annuaire** : *recommandé* pour un service tout public. ✅ Tranché le 1er octobre 2026 pour la recherche : par **numéro exact seulement** (« comme WhatsApp »), plafonnée, jamais de liste ni de recherche par nom (§ 2.5).
5 bis. **Clés d'accès (passkey, WebAuthn) et appel vocal** (§ 2.2 et 2.4) : deux gains sur le coût des SMS et l'accueil des gens dont le SMS n'arrive pas — *la clé d'accès recommandée*, l'appel vocal seulement si un prix par pays est connu.
5 ter. **Les budgets SMS par pays** (20 €/jour, 3 €/jour/pays par défaut) : à relever pays par pays selon où les gens s'inscrivent vraiment (§ 2.3).
6. **Quotas de stockage et tailles de pièces** : *je propose* photo 12 Mo, vocal 10 Mo, fichier 25 Mo en Perso et 100 Mo en Pro, 2 Go par personne en Perso et 20 Go par siège en Pro.
7. **Palier « Business Premium 25 € » et « inclus avec le Business Premium d'OP GESTION »** (`tarifs.html`) : avec des comptes séparés, la liaison n'existe pas. *Recommandé* : retirer la phrase, ou un geste « cadeau » explicite plus tard, jamais une lecture continue d'OP GESTION. ✅ **Tranché le 1er octobre 2026 (Justin : « un Pro à 15 euros ; lui à 25 on le supprime ; à 15 euros ils ont toutes les options »)** : Messages Business Premium est retirée de la vente, Messages Pro à 15 € porte tout, la phrase est retirée du site (aperçu), de la page de paiement et du serveur (refus `formule_retiree`) ; « visio illimitée » est écrite « sans limite de durée », avec le nombre de participants en vidéo dit limité.
8. **Données existantes dans Firebase** : y a-t-il de vraies conversations à conserver ? Aucune migration n'est prévue. *Recommandé* : non, sauf si tu me dis qu'il y en a.
9. **Réunions à plus de 4 en vidéo** : SFU LiveKit en étape 10, sur mesures. *Recommandé* de ne rien promettre avant.
10. **Sonnerie d'appel limitée sur iPhone** (pas de CallKit en page web) : à accepter avant l'étape 7.
11. **Fonctions de la maquette Zoom « bientôt »** : tableau blanc, salles de répartition, sous-titres, diffusion, enregistrement dans le nuage. *Recommandé* : afficher « bientôt », ne pas les simuler.
12. **Textes légaux** et délégué à la protection des données : à valider avant l'étape 9.
13. **Déménagement sur machine dédiée** : *recommandé* dès que les appels pèsent sur le réseau (~100 Mb/s soutenus) ou gênent l'API d'OP GESTION.

## 6. Non vérifié

- Le proxy réellement en place, le pare-feu IONOS, la bande passante autorisée et la taille du VPS (CPU, RAM, disque).
- La version de coturn sur Ubuntu 24.04.
- La qualité d'une maille à 4 en vidéo sur 4G.
- Le comportement d'iOS pour un push d'appel et une page installée en arrière-plan.
- Le coût de `synchronous=FULL` sur le disque du VPS (à mesurer à l'étape 1).
- Le sens exact des deux prix `msgpro` (mensuel, annuel ou par place).
- L'état des données Firebase d'OP MESSAGES.
- **L'envoi réel de SMS par OVHcloud** (signature acceptée, expéditeur alphanumérique, envoi international, prix réel par pays) : le banc joue un faux OVH ; un SMS reçu sur un vrai téléphone est la preuve (§ 2.4). La table de prix (`sms-prix.js`) est une estimation relevée sur la grille publique, sans Porto Rico ni la République dominicaine (facturés au pire).
- **Les plages mobiles de `numero.js`** : écrites d'après le plan de numérotation tel qu'on le connaît, à relire (une plage manquante REFUSERAIT un vrai mobile ; un pays « non vérifiable » accepte un fixe, que le budget borne).

Fichiers de référence lus : `/home/user/teamop/server/install.sh`, `/home/user/teamop/server/index.js` (lignes 62, 78, 1233-1262, 2077-2100, 3132-3150), `/home/user/teamop/server/comptes.js`, `/home/user/teamop/server/socle.js`, `/home/user/teamop/.github/workflows/deploiement.yml`, `/home/user/teamop/scripts/bancs-ci.sh`, `/home/user/teamop/scripts/bancs-serveur.liste`, `/home/user/teamop/tests/test-728.js`, `/home/user/teamop/REPRISE.md` (lignes 2664-2672), `/home/user/teamop/apercu/opmessages/index.html`.

**Conception retenue : prête à construire à partir de l'étape 1. La suite du chantier attend les gestes et réponses de la section 5.**