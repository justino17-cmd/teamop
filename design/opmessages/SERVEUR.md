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
- `/api/compte/supprimer` (délai de grâce de 14 jours, annulable par connexion), `/api/compte/export` (1 par jour) — ✅ faits, **en garde S et non V** : quitter ne se refuse à personne (§ 2.8).
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
- Pièces (étape 4, ✅ fait — § 4.1) :
  - `POST /api/pieces?conv=&genre=photo|vocal|fichier&nom=` (ou `?genre=avatar` pour une photo de profil) en flux binaire, `Content-Length` obligatoire (411), maximum du genre jugé avant de lire (413), arrêt dès le dépassement ;
  - `GET /api/pieces/:id` (garde **J** : le droit de lire le message qui la porte, `Range`) ; `POST /api/moi/avatar {piece|null}` ; `GET /api/moi/stockage` ;
  - type vérifié contre les premiers octets (415) ;
  - `nosniff`, `Content-Security-Policy: sandbox`, `Content-Disposition: attachment` pour tout sauf JPEG/PNG/WebP/GIF et audio jugés aux octets ; jamais de SVG ou HTML en ligne ;
  - EXIF retiré (client et serveur) ; quota (402).

**Notifications et push** (étape 2)
- `GET /api/notifications`, `/lues`. La clé publique VAPID (paire propre à OP MESSAGES) est dans `GET /api/config` (`push.vapid`) — ✅ pas de route à part.
- `/api/push/abonner {sub}` (S, propriétaire pris de la session) : **`https` seulement et hôte dans une liste blanche** (FCM, Mozilla, `*.push.apple.com`, `*.notify.windows.com`), 10 abonnements au plus par compte ; `/desabonner`.
- Un push part seulement si la personne n'a aucun flux ouvert ou si l'événement n'est pas acquitté sous 5 s.
- Charge minimale par défaut (« Nouveau message »), aperçu activable. 404 ou 410 du service push : abonnement supprimé. ✅ Fait (§ 2.8) : aussi `POST /api/push/essai` et `POST /api/flux/ack {gid}` (l'acquittement).
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
- **Pièces** : envoi incrémental par identifiant (elles sont immuables), déjà scellées. Elles partent **avant** l'archive de base de la passe (une archive posée au coffre sans ses pièces se restaure en photos qui ne s'ouvrent pas) ; seules les vraies pièces partent (`<2 hexa>/f_<32 hexa>` — jamais un dépôt en cours de `tmp/`) ; le miroir n'efface qu'**après** la base relue, une pièce absente deux passes de suite, jamais plus de la moitié du coffre. Un arriéré (plafond de 5 000 pièces ou 8 minutes par passe) fait partir la base quand même, mais la passe n'est **pas « réussie »** (`pieces-arriere-N` au journal, `echecs` monte, `ageH` ne repart pas à zéro).
- **Rétention** : 14 jours. Au-delà, les messages éphémères restent dans les archives plus longtemps que promis, alors que la politique de confidentialité s'engage. La table `purge` est rejouée après toute restauration (voir § 3.7.1). **Elle ne croit pas l'horloge de la machine seule** : l'archive qu'elle vient de poser porte la date du coffre (`LastModified`) ; si elle s'écarte de plus d'un jour de l'horloge d'ici, rien n'est élagué et la passe se dit en échec (`horloge-ecart`) — un saut d'horloge de +20 jours effaçait tout l'historique et bloquait les sauvegardes vingt jours (rejoué).
- **Relecture obligatoire** après chaque dépôt (retéléchargement, déchiffrement, `PRAGMA quick_check`, comptage). `outils/restaurer.js essai` restaure dans un dossier jetable ; exercice mensuel. **Mémoire et disque d'une passe** : le client S3 d'OP GESTION (`lib/s3.js`, identique octet pour octet) envoie par `fetch`, qui tient le corps ENTIER en mémoire (300 Mo d'archive → 328 Mo de service, contre `MemoryMax=1G`) ; l'envoi et la lecture d'un fichier passent par `server-msg/coffre.js` (`node:http` et `pipeline`, contre-pression : ≤ 40 Mo mesurés pour 160 Mo, et un coffre muet depuis 3 minutes est coupé). Le pic de disque est de **deux** fois la base (chaque fichier part dès qu'il ne sert plus) et le précontrôle compte le plancher d'espace du service (`disqueMinMo`). **L'outil de restauration, lui, demande TROIS fois l'archive** (`essai`, `restaurer`) : pour lire le registre des purges d'une archive plus récente, la base restaurée reste sur le disque pendant que la suivante arrive (base + archive + sa base déchiffrée) ; il re-mesure avec les vrais nombres avant chaque archive de plus, et quand la place manque il dit lequel (`OPMSG_ESSAI_DIR` pour l'essai, `--vers` pour la restauration) au lieu de mourir sur ENOSPC.
- **Surveillance** : `/health` publie `sauvegarde{configuree, ageH, essaiJours, echecs}`. Chaque champ est surveillé ou nommé « vu et pas surveillé » (leçon `atts` et `mailRefus`) : `.github/scripts/surveillance-messages.js` à part, pour ne pas toucher aux listes de `test-726`. Elle crie une sauvegarde configurée dont la dernière copie relue a plus de 2 h (ou qui n'en a aucune) ou dont l'âge est **négatif** de plus d'une heure (horloge en désordre), deux échecs de suite, et — **en production seulement** — aucun essai de restauration réussi depuis 35 jours (la bêta est jetable : un essai y serait du bruit).
- **La perte de la clé maître rend tout illisible.** C'est le risque n°1. Elle va au gestionnaire de mots de passe de Justin en saisie masquée, jamais affichée sur le VPS ni collée dans la conversation (règle du 24 septembre).
- **Avant toute personne extérieure à l'équipe, un essai de restauration doit avoir réussi.** Les données de la bêta sont jetables et le disent.

#### 3.7.1 Le registre des purges — comment un effacement survit à une restauration (et comment en brancher un neuf)

Une archive date d'avant ce que le service a effacé depuis. Restaurer l'archive ferait **revenir** ce qui est parti — alors que la politique de confidentialité promet l'inverse.
Le registre `purge(objet, genre, quand)` est ce qui s'en souvient ; la restauration prend celui de la **plus récente archive qui s'ouvre** (si la plus récente est abîmée, elle
remonte ; si aucune archive plus récente que la cible ne s'ouvre, elle **refuse** et demande `--sans-purge`, parce que les messages supprimés depuis reviendraient) et le rejoue sur
la copie qu'elle remet en service. Trois pièces se tiennent, et `tests/test-950.js` § 13 quater les compare :

| pièce | où | rôle |
|---|---|---|
| ce qui s'**écrit** | chaque `INSERT INTO purge` de `stockage.js`, dans la même transaction que l'effacement | un registre qui oublie est un effacement qui revient |
| ce qui se **déclare** | `GENRES_PURGE` (`stockage.js`) : `'copie'` ou `'service'` | qui rejoue ce genre |
| ce qui se **rejoue** | `rejouerPurge` (hors ligne, SQL pur, sans clé maître) pour `'copie'` ; `rejeu.js` → `GENRES_SERVICE` (au premier démarrage du service sur la base restaurée) pour `'service'` | l'effacement refait |

Les genres d'aujourd'hui, tous `'copie'` sauf `compte` (`'service'`) : `message_ephemere`, `message_supprime`, `piece` (et tout genre qui commence par « piece »), `conversation` (le dernier membre est parti), `appareil` (le jeton
d'appareil révoqué : déconnexion, « déconnecter les autres », toute une personne, le onzième appareil qui chasse le plus ancien — l'empreinte du jeton, jamais le jeton ; le rejeu ne retire qu'un
appareil qui existait à l'instant de la révocation), et, depuis l'étape 5, `espace` (dissous), `espace_membre` (sorti de l'espace, et de ses canaux), `invitation` (l'empreinte d'un lien révoqué, **d'un espace ou d'un groupe**),
`canal_membre` (sorti d'un canal privé) et `groupe_membre` (**retiré d'un groupe, ou parti de lui-même** : `conversation|personne|date` ; le rejeu ne retire que celui qui était là AVANT la sortie, et si c'était la dernière
administratrice il promeut le plus ancien membre comme le service l'avait fait). `message` est rejoué mais plus écrit (compatibilité). **Les sessions n'ont pas de genre** : aucun registre ne note une session fermée, donc
la restauration les **vide toutes** (`apresRestauration`) — le prix est une reconnexion de tout le monde ; les jetons d'appareil, eux, restent (ils évitent le SMS).

**Brancher un genre neuf — quatre gestes, et le banc refuse de passer tant qu'il en manque un** (le compte qu'on efface au bout de quatorze jours en est le premier cas : `compteEffacer`
écrit déjà `purge(uid, 'compte', …)` dans le lot des notifications et du compte) :
1. **écrire** la ligne dans `purge` dans la même transaction que l'effacement ;
2. **déclarer** le genre dans `GENRES_PURGE` : `'copie'` si l'effacement tient en quelques `DELETE` sur le fichier de la copie (ajouter une branche à `rejouerPurge`), **`'service'`** s'il touche plusieurs
   tables, applique des règles (qui devient administrateur, ce qui reste d'une conversation directe) ou passe par des fonctions du service — c'est le cas d'un compte ;
3. pour `'service'` : écrire dans `rejeu.js` → `GENRES_SERVICE` la fonction `(stockage, entree, contexte) => void` (`entree` = `{objet, genre, quand}`, `contexte` = `{effacerPieces(ids), horloge}`
   fournis par `index.js`). Elle est **idempotente** (rejouée à chaque démarrage tant qu'une entrée échoue, et sur une base où l'objet n'existe peut-être plus : ne rien trouver n'est pas une erreur), **synchrone**
   (le magasin l'est ; une promesse est refusée), n'efface que ce que la ligne désigne, et **lève si elle échoue** (le drapeau reste levé, le démarrage suivant recommence, le journal dit `rejeu` / `echec` / le genre).
   ⚠️ Pour un compte : la fonction du service ne peut pas être `compteEffacer` telle quelle (elle exige que l'échéance soit passée et que la personne soit « actif » avec une suppression programmée — ce que
   la ligne restaurée n'a plus) ; il faut une variante qui efface **sans** ces préconditions, puisque le registre dit déjà que c'est fait ;
4. **écrire le banc** : une base qui porte l'objet, une archive prise avant l'effacement, le registre après, la restauration, le démarrage — l'objet ne revient pas. `tests/test-951.js` § « une restauration ne ressuscite rien »
   donne le modèle (vrai service, vraie restauration d'une archive plus ancienne avec `--date`, vrai redémarrage) ; `tests/test-950.js` § 13 quater, le rejeu sur des copies et le magasin de poche du rejeu par le service.

Comment ça se passe : l'outil de restauration rejoue les genres `'copie'`, **recopie** dans la base restaurée les lignes qu'il ne sait pas rejouer et lève `meta.rejeu_service` ; au premier démarrage, `index.js` appelle
`rejeu.js`, qui rejoue les genres `'service'` avec les vraies fonctions puis baisse le drapeau. Sans drapeau — tout démarrage ordinaire — rien ne s'exécute. `GENRES_SERVICE` est **vide** aujourd'hui : le mécanisme est
en place et éprouvé (le service voit le drapeau, le baisse, ne rejoue rien au démarrage suivant), le premier usage l'attend.
⚠️ **Ce qu'aucun registre ne rejoue** : ce qui s'est passé **après** la dernière archive. Une suppression faite depuis l'heure de la dernière copie n'est dans aucun registre — c'est la fenêtre des messages écrits depuis (jusqu'à une heure) ;
elle est perdue avec eux, ou ramenée avec eux.

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
- **Couture avec OP GESTION tenue par un banc** (✅ étape 5, `tests/test-965.js`) : le compte Stripe est commun. `STRIPE_PRIX_MESSAGES` et `ligneMessages` (`server/index.js`) rangent déjà ces lignes comme « OP MESSAGES seul : rien de payé pour OP GESTION ». Le banc lance le vrai OP GESTION derrière un faux Stripe qui porte un abonnement Messages Pro, y compris impayé, à la même adresse qu'une entreprise OP GESTION, et vérifie que son verdict ne change pas (étape 5, 5.2 : ce qu'il a mesuré, dont une limite non corrigée). `REPRISE.md` l'annonçait comme à relire avant la première vente.
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
- ✅ **Les notifications push, l'export, la suppression de compte : FAITS le 3 octobre 2026 (§ 2.8).** La suppression efface `appareil_tel` et ne reconnecte JAMAIS un compte en sursis sur le seul jeton d'appareil (il faut un code, qui annule la suppression) ; un numéro dont le compte est effacé s'inscrit à NEUF et ne retrouve rien de l'ancien.
- **Le changement de numéro** (un nouveau code vers le nouveau numéro ET une preuve de l'ancien appareil) ; **les clés d'accès** (§ 2.2) ; **l'appel vocal** (§ 2.4) ; **le PRO** par lien de connexion créé par TEAM OP (étape 5).
- **Les textes légaux** : un numéro de téléphone est une donnée personnelle ; OVHcloud devient un sous-traitant (`sous-traitance.html`, registre des traitements) avant l'ouverture au public.
- **Ce que la relecture adverse (`gardien` + `testeur`, 2 octobre 2026) a trouvé et que ce chantier NE corrige PAS**, à décider par Justin : (1) **`contacts/ajouter` crée un contact mutuel sans l'accord de la personne trouvée** (elle voit le statut et la présence de l'autre, qui peut lui écrire) ; le réglage `trouvable` vaut `tous` par défaut. C'est « comme WhatsApp » (décision du 1er octobre), mais une **demande de contact à accepter**, ou `personne` par défaut, serait plus protecteur. (2) **Le verrouillage d'un numéro par ses 5 demandes de SMS** (5 par 24 h, même pour son propriétaire) : inhérent à tout plafond par numéro ; la clé d'accès le règle. (3) **Un NAT d'opérateur ou un bureau** : 10 SMS par heure et par /24 — au-delà, 429 jusqu'à une heure ; réglable (`quotas.tel_reseau`). (4) **Les pays absents de la table de prix** (Porto Rico, Rép. dominicaine, Kosovo…) sont estimés au pire (1,05 € : un seul SMS par heure et par pays) : à corriger par `sms.prix.PR` quand on connaît le prix réel. (5) **Un prénom vide est accepté** à l'inscription (l'écran doit le demander). (6) **Le HTML d'un prénom** n'est pas échappé côté serveur (l'écran doit le faire).

**Bancs** : `test-912` (plan de numérotation et prix), `913` (envoi OVH contre un faux qui vérifie la signature ; `incertain` contre `non_envoye`), `914` (inscription, session 90 jours glissants, nouvel appareil, reconnexion sans SMS, uniformité, canaris), `915` (plafonds durables, budgets, bouclier de l'argent, réserve, emballement, panne d'OVH), `916` (garde, plafonds, défi, élagage et migration, modules seuls), `917` (recherche par numéro, anti-énumération), `918` (`configurer-sms.js` jusque sous un vrai terminal, surveillance, gardes de code), `919` (un inconnu face au code d'un autre, nouvel appareil, déconnexion des autres, appareil borné, un seul E.164, élagage). Mutations : `node tests/mutations-telephone.js`.

- ✅ **Contenu (reste de l'étape) : FAIT** — notifications push (paire VAPID propre, portée de service worker propre), export, suppression de compte, sourdine (§ 2.8).
- **Justin teste** : il s'inscrit avec son numéro derrière la porte, reçoit le SMS, se déconnecte et se reconnecte sans SMS, retrouve un collègue par son numéro. **Il reçoit un push sur son téléphone** (Réglages > Notifications > « Notifications sur cet appareil », puis « Envoyer une notification d'essai » ; sur iPhone la page doit d'abord être ajoutée à l'écran d'accueil et rouverte depuis son icône), exporte ses données (un fichier se télécharge ; un second essai le même jour est refusé), et, avec un compte jetable, supprime son compte puis se reconnecte avant l'échéance (« Bon retour »).
- **Gestes de Justin** : un compte SMS OVHcloud, l'envoi international activé, des crédits, une clé d'API aux droits minimaux posée en saisie masquée (`INSTALLER-LE-SERVEUR.md` § « SMS ») ; sur iPhone, « Ajouter à l'écran d'accueil » sinon pas de push.

#### 2.8 Notifications push, export, suppression de compte — ✅ FAIT (3 octobre 2026 — `server-msg/push.js`, `routes-push.js`, `compte.js`, migration 4, `public/sw.js`, `public/manifest.webmanifest`)

Six routes, **toutes en garde S** : l'identité vient de la session, jamais du corps. (La conception disait V pour l'export et la suppression ; S est voulu : **quitter ne se refuse à personne**, même sans adresse confirmée.)

| route | ce qu'elle fait |
|---|---|
| `POST /api/push/abonner {sub}` | inscrit CET appareil (le `PushSubscription.toJSON()` du navigateur) pour la personne de la session ; 60 par heure |
| `POST /api/push/desabonner {endpoint}` | retire un appareil — le sien seulement (le point d'accès d'une autre personne répond comme un point d'accès inconnu : « 0 retiré ») |
| `POST /api/push/essai` | une notification d'essai à tous les appareils de la personne, tout de suite ; dit combien l'ont reçue ; 3 par heure |
| `POST /api/flux/ack {gid}` | « j'ai REÇU et MONTRÉ les évènements jusqu'à `gid` » : la page **visible** l'envoie. Borné par le journal (un `gid` plus grand que le dernier évènement est ramené à lui) |
| `POST /api/compte/export` | un fichier JSON téléchargé de ses données ; un par jour |
| `POST /api/compte/supprimer {confirmation:'SUPPRIMER'}` | programme la suppression à 14 jours et coupe tout à l'instant |

La clé publique VAPID est dans `GET /api/config` (`push.vapid`) — pas de route `/api/push/vapid` à part ; la durée du sursis y est aussi (`limites.suppression_jours`), la page ne la recopie pas.

**Le push** (fait main : le transport HTTP est dans `push.js`, `web-push` ne sert qu'à chiffrer en RFC 8291 et signer en VAPID, RFC 8292) :
- ⛔ **Un point d'accès est une adresse que le service APPELLE à la demande d'un inconnu** : sans filtre, c'est une porte vers `127.0.0.1:8080` (OP GESTION, même machine). Liste blanche : `https`, port 443, aucun identifiant, l'hôte est EXACTEMENT `fcm.googleapis.com` ou se termine par `.push.services.mozilla.com`, `.push.apple.com`, `.notify.windows.com` (avec son point, précédé d'étiquettes valides), forme canonique (ni majuscules, ni point final, ni fragment, ni antislash). **Re-vérifiée à chaque envoi** (une liste resserrée depuis ne laisse pas partir une ligne ancienne), aucune redirection suivie, délai de 8 s, réponse lue sur 4 Ko au plus, et un nom qui se résout en adresse privée (IPv4, IPv6, « mappée », NAT64, 6to4) est refusé avant la connexion.
- **La paire VAPID est propre à l'instance** : fabriquée au premier démarrage (ou adoptée depuis la configuration que pose `install-msg.sh`), la privée **scellée** dans la base, la première paire posée GAGNE (un abonnement est lié à la clé publique qui l'a créé : en changer ferait refuser tous les envois). Le sujet VAPID (ce que Google, Mozilla et Apple voient de nous) est `config.push.contact`, à défaut le **`contactEmail` que l'installation écrit déjà** (`contact@teamop.fr`), à défaut l'**origine https du service** — jamais une adresse en dur dans le code.
- ⛔ **La charge est minimale par défaut** : « Nouveau message » et l'identifiant de la conversation pour l'ouvrir — ni nom ni texte. Ils n'y sont qu'avec le réglage « Aperçu du message dans la notification » **de celui qui REÇOIT** (lu à l'instant de partir) : le nom de l'auteur et les cent premiers caractères (« auteur · groupe » pour un groupe). Un évènement qui pousse : un message, un ajout à un groupe, un nouveau contact, « Nouvel appareil connecté » (aux AUTRES appareils de la personne : la sécurité passe par le push).
- **Jamais à l'auteur ; rien pour une conversation en sourdine** — et la notification est **re-jugée au moment de partir** (elle attend jusqu'à 5 s) : une sourdine posée, une conversation quittée, un message supprimé « pour tous » ou échu pendant l'attente, et rien ne part.
- **Une notification ne double pas une page sous les yeux** : sans flux ouvert elle part tout de suite ; avec un flux ouvert elle attend `ackMs` (5 s) l'acquittement de la page, qui n'acquitte que ce qu'elle a **montré** (page visible) ; plusieurs évènements d'une conversation pendant l'attente n'en font qu'une, la dernière.
- **404 et 410 retirent l'abonnement** (un appareil qui disparaît est le fonctionnement normal, compté à part) ; les autres échecs se comptent et cinq de suite le retirent ; dix appareils par personne (le plus ancien part) ; **un appareil, une personne** : un point d'accès déjà inscrit pour quelqu'un d'autre passe à celui qui l'inscrit (l'appareil prêté ou revendu suit son dernier utilisateur) ; la file d'envoi est bornée (16 à la fois, 2 000 en attente, au-delà on abandonne et on le compte).
- **Les abonnements partent avec ce qui connecte la personne** : se déconnecter (le point d'accès de l'appareil est donné dans la même requête), « Déconnecter les autres appareils » (tous SAUF celui d'où l'on le demande), un accès bêta coupé dans la Tour, la suppression du compte.
- **Réglages** (`config.push`, bornés — un nombre absurde REFUSE le démarrage) : `ackMs` 5 000, `echecsMax` 5, `simultanes` 16, `fileMax` 2 000, `timeoutMs` 8 000, `ttlS` 86 400, `contact` ; `config.compte.exportOctetsMax` 64 Mo ; `vapidPublicKey` et `vapidPrivateKey` (les deux ou aucune, faites l'une pour l'autre). La variable `OPMSG_TEST_PUSH` (un faux service push en boucle locale, pour les bancs) est **refusée en production**.
- **`/health.push`** : `{actif, abonnements, envoyes24h, echecs24h}`, des nombres. La surveillance crie si `actif` est faux (clés illisibles) ou si les échecs dépassent vingt ET les livraisons sur 24 h ; `abonnements` est « vu et pas surveillé ».
- **Le service worker** (`public/sw.js`) : **aucun `fetch`, aucun cache** — il ne s'interpose entre la page et le réseau pour RIEN, donc ne peut jamais servir une page périmée ; il reçoit le push, **montre TOUJOURS une notification** (Safari retire l'abonnement d'un push silencieux), n'ouvre qu'une adresse de CE site (`/` ou `/#messages/c_…`), et au toucher passe la fenêtre ouverte au premier plan avec la conversation (la page n'ouvre que cette forme d'adresse). Le générateur de l'interface REFUSE un `sw.js` ou un manifeste qui mentirait. La politique de la page DIT `worker-src 'self'` et `manifest-src 'self'` (le manifeste ne retombe que sur `default-src 'none'` : sans ce mot, le navigateur refuserait de le lire, sans une erreur visible).
- **iPhone** : le push n'existe que pour une page **ajoutée à l'écran d'accueil** (Safari, iOS 16.4 et plus) puis rouverte depuis son icône ; la page le dit, en une phrase, là où l'interrupteur est grisé.

**L'export** : `opmessages-export-v1`, un JSON écrit **au fil de l'eau** (une conversation à la fois, cent messages à la fois, la main rendue entre deux pages — jamais toute la base en mémoire), plafonné (`compte.exportOctetsMax`, 64 Mo par défaut : au-delà il se termine proprement et DIT où il s'est arrêté, `tronque`). Il se lit avec **les mêmes fonctions que l'application** : une conversation dont on n'est pas membre n'y est pas, ni un message d'avant son arrivée dans le groupe, ni un message supprimé « pour moi » ou échu ; « pour tous » laisse la pierre tombale sans texte ; le « Lu » d'un membre qui a coupé ses confirmations n'y est pas. Le texte est déchiffré (c'est sa donnée). Les pièces sont **listées** (identifiant, genre, taille, date), pas leur contenu. **Le numéro de téléphone n'y est pas** : le service ne le rend à personne, elle comprise. Un par jour, un export abandonné rend son créneau, deux au plus à la fois pour le service.

**La suppression**, en deux temps :
1. **La demande** (le mot `SUPPRIMER` — la page demande une case et un bouton, le service refuse sans le mot) : à l'instant, TOUTES les sessions, tous les jetons d'appareil, tous les abonnements push et les liens d'invitation sont coupés, ses flux fermés, l'échéance posée à **J+14**. La personne n'est plus trouvable par son numéro. **Se reconnecter avant l'échéance l'ANNULE** (la porte bêta ou le code reçu par SMS ; la réponse DIT `suppression_annulee`, la page écrit « Bon retour »). Un jeton d'appareil seul ne reconnecte pas : il faut un code.
2. **L'effacement** (le balayeur, à l'échéance) : l'identité part (numéro, nom, statut, photo, réglages, contacts, notifications, appareils), mais **la ligne `personne` reste, VIDE** (`etat = 'supprime'`) — pas de `DELETE` : `piece.proprio` est une clé étrangère en cascade, qui emporterait les photos et vocaux qu'elle a ENVOYÉS et que les autres voient encore. Les groupes se quittent comme on les quitte (le dernier administrateur passe la main, le dernier membre emporte le groupe) ; une conversation directe reste à l'autre, qui y garde son historique mais n'y écrit plus (410 `compte_supprime`) ; **les messages restent chez les autres, signés « Compte supprimé »** ; ses pièces jamais envoyées et sa photo de profil sont effacées (fichiers compris) ; **le numéro se libère** : il peut s'inscrire à NEUF, une autre personne qui ne retrouve rien de l'ancienne. Une ligne `purge` (genre `compte`) est écrite.

**L'interface** (la page de Justin, régénérée dans `server-msg/public/`) : Réglages > **Notifications** (activer, essai « envoyée à 1 appareil », aperçu), Réglages > **Compte** (exporter mes données ; supprimer mon compte : une feuille qui dit tout, une case, un bouton grisé tant qu'elle n'est pas cochée), la **sourdine** d'une conversation (8 heures, une semaine, toujours) dans sa fiche, « Compte supprimé » dans la liste et le compositeur fermé, et l'écran de connexion qui dit la date d'effacement après une suppression.

**Bancs** : `test-955` (le module push : liste blanche, plages d'adresses, charge déchiffrée, acquittement, statuts, file), `956` (le vrai service contre un faux service push : abonnements, essai, acquittement, pannes, déconnexions, politique de la page, redémarrage), `957` (export, suppression, effacement à J+14, grosse conversation), `958` (le module de données de la page contre le vrai service, avec un faux navigateur), `941` (le générateur refuse un `sw.js` ou un manifeste qui mentirait), `905` (la matrice des six routes), la **sonde navigateur** `tests/sonde-opmessages-push.js` (hors liste, il lui faut Chromium : la VRAIE page et le VRAI `sw.js` dans un vrai Chromium, iPhone 393 et bureau 1440 ; 102 vérifications, huit passages d'affilée verts. Elle note ce que `sw.js` DEMANDE au navigateur et ne se sert de la liste du navigateur que pour jouer le toucher — voir § 6) et **`tests/mutations-push.js`** : 139 défauts remis UN PAR UN dans une COPIE de l'arbre (jamais dans l'arbre lui-même : le `git checkout` d'après-mutation y effacerait aussi les correctifs non commités) — une liste blanche jugée par « contient », un aperçu qui part sans demande, une sourdine ou un membre parti qui reçoit encore, la clé privée VAPID en clair, l'abonnement d'une autre personne retiré, une suppression qui laisse une session, un jeton, un abonnement ou un numéro, un export sans quota ou qui montre ce que la personne ne voit pas, un `sw.js` qui ouvre une adresse d'ailleurs… **Passe du 3 octobre 2026 sur l'arbre du dernier commit : 132 tombent sur 132** (116 par les bancs, 16 par la sonde navigateur) **et 7 « équivalentes » survivent comme prévu**, le même résultat à chacune des passes rejouées sur l'arbre final (trois hors sondes, deux avec la sonde) — une mutation qui tombe une fois sur deux n'est pas gardée, D12 l'a montré, voir plus bas (deux gardes pour une même règle : en retirer UNE ne change rien de visible, et le défaut réel s'écrit avec les deux retirées — la preuve que la garde restante tient seule). Chaque mutation vérifie que son motif se trouve exactement UNE fois, que le fichier muté se lit encore (`node --check`), et qu'un banc qui MEURT sans total tombe ; le détail de chaque ✗ est gardé (`--details`) et **relu : une mutation doit tomber pour la raison qu'elle remet**, pas parce qu'un banc a eu un accident. Les passes successives ont fait ajouter des contrôles aux bancs, pas du code : une attente sans fin qui laissait un banc sortir en 0 sans total (A05), une notification sans identifiant d'évènement (A08), le plafond de soixante inscriptions par heure (S15), un compte dont la suppression est programmée ajouté comme contact (D15), la taille de la liste des conversations (X04), les deux exports simultanés (X09), un générateur qui refuse la source commitée (W04, W05), un acquittement rejoué (C12), un contact ajouté par numéro (R14, R16), l'écran qui ne bouge pas quand on touche un interrupteur grisé (G07), et l'effacement IMMÉDIAT des fichiers d'un compte supprimé (D12 : la réconciliation périodique des pièces, qui emporte tout fichier sans ligne de plus de dix minutes, faisait le travail à sa place quand elle passait dans la même passe du balayeur que l'effacement — les fichiers du banc portent désormais une date dans l'avenir). Le rejeu a aussi montré un banc qui MOURAIT au hasard et faisait « tomber » R02 pour une raison étrangère : une paire VAPID de banc dont la clé privée n'a que 31 octets une fois sur 256 (`getPrivateKey()` retire les zéros de tête ; `web-push`, lui, complète — le service ne risque rien). Lancer : `node tests/mutations-push.js` (hors sondes), `… --sondes` (avec Chromium), `… --verifier` (chaque motif se trouve une fois, chaque banc existe).

**Ce que ce chantier n'a PAS fait** (et ne pouvait pas faire ici) :
- **Un VRAI push de bout en bout** : il passe par Google, Mozilla ou Apple, donc par Internet, que ce conteneur n'a pas. Le chiffrement et la signature sont vérifiés contre les spécifications (la charge est déchiffrée avec les clés de l'appareil, la signature VAPID vérifiée contre la clé publique), et le vrai `sw.js`, nourri d'un évènement `push` fabriqué avec ce que le vrai service a envoyé, demande au navigateur d'afficher la bonne notification (que le navigateur de test accepte) — mais **le premier push réel est à constater par Justin**.
- **Un vrai iPhone** : mesuré dans Chromium (iPhone 393 et bureau 1440), jamais dans Safari. L'ajout à l'écran d'accueil, l'autorisation et la notification elles-mêmes ne se constatent que sur l'appareil.
- **Le rejeu de la ligne `purge` à la restauration d'une sauvegarde** (un compte effacé ne doit pas ressusciter) : il appartient au chantier de sauvegarde (étape 3).
- **Les textes légaux** : l'export et la suppression existent techniquement ; les services push (Google, Mozilla, Apple) deviennent des sous-traitants à nommer (`sous-traitance.html`) avant l'ouverture au public.
- **Le push d'un appel** (étape 7) : non.

**Décisions prises ici, à CONFIRMER par Justin** : (1) les messages d'un compte supprimé **restent chez les autres, signés « Compte supprimé »** (comme chez WhatsApp) — l'autre choix serait de les effacer chez tout le monde ; (2) le sursis est de **14 jours** ; (3) l'export **ne contient pas le numéro** de téléphone et ne contient que ce que la personne voit ; (4) l'**aperçu** (nom de l'auteur et cent premiers caractères) n'est **jamais activé par défaut** ; (5) le sujet VAPID est le **`contactEmail` de la configuration** (`contact@teamop.fr` tel que l'installation l'écrit), que les services push voient dans chaque envoi — `push.contact` le remplace ; (6) « Se déconnecter » et « Déconnecter les autres appareils » **retirent aussi les abonnements push** ; (7) **un appareil, une personne** : un appareil prêté suit son dernier utilisateur ; (8) **dix appareils** par personne ; (9) export et suppression en garde **S** et non V.

### Étape 3 : sauvegarde hors site et exercice de restauration

- **Contenu** : instantané horaire chiffré, rétention 14 jours, relecture, `restaurer.js essai`, surveillance, relecture adverse de l'agent `gardien` sur le service.
- **Justin teste** : un essai de restauration réussi, rapporté chiffres à l'appui. **Porte avant toute personne hors équipe.**
- **Gestes de Justin** : un bucket S3 distinct avec sa propre paire de clés, puis la clé de sauvegarde (née sur son Mac), le tout posé en saisie masquée par `configurer-sauvegarde.js` (`INSTALLER-LE-SERVEUR.md` § 10 ter, gestes 1 à 7), l'essai de restauration (geste 6).
- ✅ **Construit le 2 octobre 2026 — attend les gestes de Justin** (aucun coffre réel n'existe encore ; `/health` dit `"configuree":false` tant que le bloc `sauvegarde` n'est pas posé). Ce qui existe :
  · `lib/s3.js` — copie **octet pour octet** de `server/s3.js` (un banc le compare) ;
  · `sauvegarde.js` — l'instantané (`stockage.instantane` : l'API de sauvegarde de SQLite sur une connexion lectrice à part, **en un seul pas** — par petits pas, sous écritures, la copie ne finissait pas : mesuré), l'archive AES-256-GCM en flux (format versionné, deux lignes d'en-tête liées à l'authentification : une archive de la bêta recopiée sous la production, ou rebaptisée, ne s'ouvre plus), le dépôt, la **relecture obligatoire** (empreinte, déchiffrement, `quick_check`, comptage des lignes dans un processus enfant, tout comparé à l'instantané), l'archive non relue **retirée** du coffre, les pièces en miroir incrémental (suppression propagée, gardes qui refusent de vider le coffre sur une liste douteuse), la rétention (14 jours, jamais 0, jamais moins de 3 copies) ;
  · `outils/restaurer.js` — `essai` (dossier jetable, rejeu de `purge`, vérification que la clé maître ouvre la base, lignes de pièces comparées aux fichiers du coffre, date écrite pour `/health` — **sauf** si la clé maître n'a pas pu être vérifiée), `liste`, `restaurer --vers [--date …] [--ecraser] [--sans-pieces] [--sans-purge]` (jamais sur une base existante sans `--ecraser`, service arrêté, l'ancienne mise de côté et jamais effacée ; les sessions sont vidées) ;
  · `coffre.js` (envoi et lecture de fichiers à mémoire bornée) et `rejeu.js` (le rejeu des purges par le service) ;
  · `configurer-sauvegarde.js` + `saisie.js` — saisie masquée en mode brut (aucune réécriture d'un secret, vérifié sous un vrai terminal), clé de sauvegarde saisie **deux fois** (la seconde relue dans le gestionnaire), refus d'une clé égale à la clé maître, **épreuve du coffre avant d'écrire** (dépôt, relecture, liste, effacement sous le vrai préfixe), écriture atomique en 0600 qui garde propriétaire et autres réglages, `--verifier` pour relire chaque copie de la clé.
- **Bancs** : `test-950` (le module seul, et le classement des tables du schéma), `test-951` (le vrai service, le faux coffre, les outils en processus et sous un terminal, le guide lu contre le code). Mutations : `node tests/mutations-sauvegarde.js`.
- **Ce que les bancs ne prouvent pas**, dit tel quel : (1) **qu'IONOS accepte** — le coffre des bancs est un faux qui recalcule les signatures comme AWS le documente ; le premier dépôt réel est l'épreuve du geste 4 ; (2) **la procédure de sinistre sur un VPS neuf** (`INSTALLER-LE-SERVEUR.md` § 10 ter, geste 9) — écrite d'après le code, jouée contre le faux coffre, jamais sur une vraie machine ; (3) **que les pièces s'ouvrent** après restauration — l'essai relit leurs octets, elles sont scellées par la clé maître ; (4) **une base de plusieurs Gio** — mesuré : 90 Mio copiés en 0,25 s et jamais figé, mais pas au-delà.
- **Relecture adverse du 3 octobre 2026 (agent `gardien`) — corrigée, chaque défaut avec son banc et sa mutation** (`tests/mutations-sauvegarde.js`) :
  · **B1** (la fusion avec les pièces : `piece` comptée par la sonde et non par la copie — dès la première pièce plus aucune sauvegarde ne partait) : `test-950` § 13 bis compare maintenant les **trois** listes de tables ;
  · **B2** : restaurer une copie plus ancienne quand la plus récente est abîmée **marche** (le registre vient de la plus récente archive qui s'ouvre ; si aucune archive plus récente que la cible ne s'ouvre, l'outil refuse
    et nomme la conséquence jusqu'à un `--sans-purge` explicite ; au plus dix archives essayées) ;
  · **A1** : un arriéré de pièces n'est plus un succès ; les pièces partent avant leur base ; `essai` et `restaurer` comptent les lignes `piece` sans fichier et le disent ;
  · **A2** : un saut d'horloge n'élague plus, ne bloque plus, et se voit (âge négatif, `horloge-ecart`) ; la surveillance crie sur un âge négatif ;
  · **A3** : une restauration ne ressuscite ni les sessions fermées (vidées), ni les conversations supprimées, ni les appareils déconnectés (§ 3.7.1) ;
  · **A4** : la mémoire d'une grosse archive est bornée (`coffre.js`, § 3.7) — **cause établie : `fetch` tient le corps entier d'un envoi en flux** ; ⚠️ **à reporter dans `server/s3.js`** le jour où OP GESTION sauvegardera des archives plus lourdes que
    sa mémoire (cette tâche ne touche pas à `server/`) ;
  · **A5** : le miroir ne prend que la forme exacte d'une pièce (plus de dépôts en cours au coffre) ;
  · remarques : précontrôle de disque (pic 2×, plancher du service), `essai` qui ne remet pas la date à zéro sans clé maître vérifiée, schéma plus récent que le code refusé, droits des pièces remises (0700 / 0600), dossier temporaire trop petit dit.
- **Limites connues** (dites telles quelles ; chacune est un choix ou un coût, pas un oubli) :
  1. **`purge` n'est jamais élaguée** : elle grossit d'une ligne par effacement (un message éphémère échu, une pièce, une conversation, un appareil déconnecté — quelques dizaines d'octets chacune). Une ligne n'est utile que tant qu'une archive plus ancienne qu'elle est au coffre (14 jours) :
     un élagage à `retentionJours` + une marge serait sûr, il n'est pas écrit. À regarder quand `SELECT COUNT(*) FROM purge` dépasse quelques centaines de milliers.
  2. **`lister` (`lib/s3.js`) s'arrête à 200 pages de 1 000 objets, sans le dire** : au-delà de 200 000 pièces au coffre, la liste est tronquée — le miroir renverrait des pièces déjà là (inoffensif) mais **la restauration et `liste` n'en verraient qu'une partie**. Le seuil
     est loin (une photo ≈ 200 Ko : 40 Go) ; la parade est d'exposer la troncature dans le client, des deux services à la fois.
  3. **Les suppressions d'après la dernière copie reviennent** : une conversation, un appareil, un message supprimé depuis moins d'une heure avant un sinistre ne sont dans aucun registre — c'est la fenêtre de perte des données elle-même, pas un défaut du rejeu.
  4. **Une restauration déconnecte tout le monde** (les sessions sont vidées) ; les appareils liés par SMS restent connectés (leurs révocations sont rejouées). Choisi : une session fermée n'est notée nulle part.
  5. **Une restauration peut ouvrir des conversations dont des photos manquent** : les lignes de pièces sans fichier au coffre sont comptées et dites (`⚠ N SANS fichier`), jamais refusées — un sinistre n'attend pas qu'une photo soit retrouvée. Une passe avec arriéré est déclarée en échec pour que cela ne dure pas ; une première synchronisation de plus de 5 000 pièces s'y déclare donc incomplète plusieurs heures (c'est vrai).
  6. **Un coffre qui ne répond plus est coupé après 3 minutes de silence** (envoi et lecture de fichiers) ; `lister`, `effacer` et les petits objets, eux, gardent les délais du client d'origine (15 s). Une panne prolongée du coffre tient donc la passe en cours au plus quelques minutes, plus l'heure suivante.
  7. **Après un saut d'horloge vers l'avant, des archives portent une date du futur** : la plus récente *par le nom* n'est plus la plus fraîche, la rétention n'élague rien tant que l'une d'elles existe (jusqu'à vingt jours), et `restaurer` sans `--date` prendrait la plus « récente ». Le coffre garde la vraie date : `liste` la montre ; vérifier avant de restaurer dans ce cas.
  8. **Le rejeu par le service n'a pas de champ dans `/health`** (quatre champs seulement) : un rejeu qui échoue se lit au journal du service (`rejeu` / `echec`) et recommence à chaque démarrage.
  9. **Le service détient les droits d'effacement du coffre** (il en a besoin pour la rétention) : quelqu'un qui prendrait le service pourrait effacer les copies ; une copie mensuelle hors de sa portée est la parade, plus tard.
  10. **Les copies horaires ne sont pas amincies** (336 copies gardées pendant 14 jours) ; **l'essai n'échantillonne que 20 pièces** et ne prouve pas qu'elles s'ouvrent (elles sont scellées par la clé maître) ; **une archive est plafonnée à 32 Gio** (limite d'AES-GCM) ; **personne n'a joué la procédure de sinistre sur un VPS neuf**.
- **Et pour l'auteur de l'étape suivante** : `TABLES_COMPTEES`, `sonde()` et `lignesDe` (`stockage.js`) listent les tables que la copie compte — `test-950` fait tomber toute table neuve non classée (les trois listes doivent dire la même chose) ; `GENRES_PURGE` fait de même pour tout genre neuf écrit dans `purge`.

### Étape 4 : pièces — ✅ FAIT (2 octobre 2026, `server-msg/pieces.js`, `routes-pieces.js`, migration 3)

- **Contenu** : photos, vocaux (forme d'onde calculée sur l'appareil), fichiers, photo de profil (d'une personne et d'un groupe), quotas, interrupteurs de confidentialité RÉCIPROQUES, un vrai écran Réglages.
- **Justin teste** : le « + » (Photo / Fichier) et le micro d'une conversation, les bulles photo, fichier et vocal avec sa forme d'onde, Réglages > Profil, Confidentialité, Stockage, Appareils.
- **Gestes** : aucun pour l'application ; **UN pour le proxy, sur le VPS, par Justin** — relancer `install-msg.sh` pour poser l'exception de 26 Mo sur `/api/pieces` (§ 4.4). Le déploiement par la CI ne le fait PAS.

#### 4.1 Ce qui est fait

- **Stockage** — migration 3 : la table `message` est reconstruite (son type accepte `photo` et `fichier`), la table `piece` naît (`proprio`, `conv`, `genre`, `taille`, `mime`, `nom_ch` scellé, `attachee`, `expire`) ; une copie `avant-v3` de la base est gardée AVANT toute modification, la migration est rejouable. Les fichiers vivent dans `<données>/pieces/<2 caractères>/<id>`, **scellés par blocs** (AES-256-GCM, bloc de 64 Kio, la clé de bloc est dérivée de la clé maître ET de l'identifiant de la pièce, l'AAD lie l'identifiant, le numéro du bloc et le drapeau « dernier » : un bloc échangé ou un fichier tronqué à une frontière ne s'authentifie pas), écrits en temporaire puis renommés. `Range` ne déchiffre que les blocs touchés.
- **Quatre routes** (manifeste, matrice de `test-905`) : `POST /api/pieces` (V, corps binaire, `Content-Length` OBLIGATOIRE : 411 sinon ; le maximum du genre se juge AVANT de lire : 413 `piece_trop_lourde {max}` ; type de la requête = `application/octet-stream` sinon 415 ; ⛔ **le nom d'un fichier vient de l'en-tête `X-OPM-Nom`** (`encodeURIComponent`, 2 048 signes au plus), **jamais de l'adresse** — l'ancien `?nom=` est refusé (400) : une adresse finit dans le journal d'un proxy, un en-tête non ; espace disque, **moins ce que les envois déjà acceptés vont encore y écrire** : 503 ; quota par personne : 402 `quota_atteint {portee:'stockage'}` ; envois en même temps, ou mémoire des images pleine : 429 `{portee:'simultane'}` + `Retry-After` ; plafond par heure : 429 + `Retry-After` ; ⛔ **un envoi qui n'avance pas : 408 `envoi_trop_lent`**, § 4.5), `GET /api/pieces/:id` (garde **J**, `Range`), `POST /api/moi/avatar` (S), `GET /api/moi/stockage` (S).
- **Le droit de lire une pièce est celui du message qui la porte** (`pieceVisible`) : pas avant l'arrivée de la personne dans le groupe (`depuis_seq`), pas si le message est supprimé « pour tous » ou « pour moi », ni échu, ni si elle a quitté le groupe. Tant qu'une pièce n'est pas attachée à un message, elle est à son dépositaire seul. **Une pièce qu'on n'a pas le droit de lire répond EXACTEMENT comme une pièce qui n'existe pas** (404, même corps : `test-905` le compare).
- **Le type se juge aux octets, jamais à la parole du client** : JPEG, PNG, WebP, GIF pour une photo ou une photo de profil ; webm, ogg, mp4, mpeg pour un vocal ; n'importe quoi pour un fichier — servi TOUJOURS `application/octet-stream` + `attachment` (un SVG ou un HTML déposé comme fichier ne s'exécute jamais ; un PNG déposé comme fichier reste un fichier). Une pièce servie porte `nosniff`, `Content-Security-Policy: sandbox; default-src 'none'`, `Cache-Control: private, no-store`, jamais de CORS — et **toute réponse de `/api/pieces*`, refus compris** (identifiant inconnu, sans session, en-tête `X-OPM` absent, méthode non prévue, quelle que soit la casse), porte la même sandbox : la politique de la page ne sort pas de ce préfixe.
- **Les métadonnées sont retirées côté serveur** (et côté page : le canvas ne les recopie pas) : JPEG par une **LISTE BLANCHE** (une liste de ce qu'on retire laisse passer tout ce qu'on n'a pas nommé : les miniatures JFXX et FlashPix, qui peuvent montrer l'image d'AVANT une retouche) — ne survivent que la structure (SOFn, DHT, DAC, DQT, DNL, DRI, EXP, SOS et ses données), l'en-tête JFIF réécrit SANS sa miniature, le profil ICC, et le segment Adobe (APP14 : il change le décodage des couleurs, sans lui un CMYK s'affiche à l'envers) ; Exif, XMP, IPTC, commentaires, index MPF, JUMBF/C2PA et tout ce qui suit la fin de l'image partent. PNG (`eXIf`, `tEXt`, `iTXt`, `zTXt`, `tIME`, après `IEND`), WebP (EXIF et XMP, drapeaux de `VP8X`, taille RIFF recalculée), GIF (commentaires et extensions d'application inconnues ; le contrôle graphique et la boucle d'animation `NETSCAPE2.0` restent : une animation reste une animation). Une image dont la structure ne se parcourt pas de bout en bout est refusée (415), pas rangée, **tout comme une image faite de plus de morceaux qu'aucune vraie photo n'en porte** (2 048 segments JPEG, 65 536 morceaux PNG, WebP ou GIF) : 2,9 millions de segments vides de 4 octets coûtaient ~350 Mo et 1,8 s de boucle bloquée par image. **Les fichiers ne sont PAS nettoyés** (un PDF garde ses métadonnées : c'est un fichier, pas une photo).
- **Un message cite ses pièces** (`type: photo|vocal|fichier`) : celles de l'envoyeur, du bon genre, de la bonne conversation, non encore envoyées, non échues — sinon 404 `piece_inconnue` et RIEN n'est à moitié attaché ; un renvoi (même `cid`) ne refait ni message ni attachement. Le nom et la taille d'un fichier sont ceux de la PIÈCE, jamais ceux du corps de la requête.
- **Les pièces partent avec ce qui les porte, fichier compris** : « supprimer pour tous », un éphémère échu, le dernier membre qui part, la photo d'une personne ou d'un groupe remplacée ou retirée ; une pièce jamais envoyée expire au bout de 24 h ; le balayeur réconcilie « fichier sans ligne » (plus de 10 minutes) et temporaires (plus d'une heure). **Le droit de lire ne dépend pas du passage du balayeur** : un message éphémère échu et une pièce jamais envoyée depuis 24 h ne se lisent plus (et ne s'attachent plus) dès l'échéance, la ligne fût-elle encore en base (`test-943` § 9, sur un service dont le balayeur ne passe jamais).
- **Photo de profil** : la mienne se pose et se retire (`/api/moi/avatar`), mes contacts la lisent, un étranger non, **une personne qui m'a bloqué ne la reçoit pas**. Photo d'un groupe : `conv.groupe {avatar_piece}` à la création, `conv.maj {avatar_piece}` ensuite (administrateur, message système) ; ⛔ **une fois posée, elle ne se lit que par les membres ACTIFS du groupe** — l'administrateur qui l'a posée puis quitté le groupe, ou qu'on en a retiré, ne la lit plus (le droit de « dépositaire » ne survit pas à l'appartenance). Une photo de profil déposée et jamais posée est à son dépositaire seul, 24 h au plus, comme toute pièce qu'aucun message ne porte. Événement éphémère `personne {uid}` : un profil qui change prévient ses contacts, ses co-membres et ses autres appareils, qui relisent.
- **Confidentialité réciproque, comme WhatsApp** (`POST|GET /api/moi/confidentialite {presence?, accuses?}`, aussi `/api/moi/maj {prefs}`) : qui coupe « Afficher quand je suis en ligne » ne montre pas sa présence ET ne voit celle de personne ; qui coupe ses « Confirmations de lecture » ne montre pas son « Lu » ET ne voit celui de personne — **dans une conversation à deux comme dans un groupe** (décision prise ici, à confirmer). Appliqué par le SERVICE (liste des contacts, diffusion de la présence, `membresDetail`, événements `lu`), pas par la page seule.
- **/health** : `pieces {n, octets, illisibles, effacementsRates}`, agrégé — jamais un identifiant ni un nom. `illisibles` > 0 et `effacementsRates` ≥ 5 font crier la surveillance ; `n` et `octets` sont nommés « vus et pas surveillés » avec leur raison.
- **`Permissions-Policy: camera=(), microphone=(self)`** : la page peut demander le micro (le vocal), pas la caméra.
- **La page** (`apercu/opmessages/index.html`, régénérée dans `server-msg/public/`) : « + » ouvre une feuille Photo / Fichier ; la photo est réduite par un canvas à 1 600 px et environ 250 Ko avant de partir ; « Envoi… » tant que le dépôt court ; la bulle d'un fichier (nom, taille, téléchargement) ; le vocal part pour de vrai ; les pièces sont lues à la demande et gardées EN MÉMOIRE seulement (adresses `blob:` bornées, rendues à la déconnexion) ; les 30 dernières photos et les 6 derniers vocaux d'une conversation sont lus d'avance, les autres au toucher ; un écran Réglages complet (profil et feuille Profil, confidentialité, contacts bloqués, autres appareils, stockage, à propos, se déconnecter). La démo (`source.js`) n'est pas touchée.
- **Ce que la page fait d'un envoi qui ne part pas, et de ce qu'elle montre** (relecture du testeur, 3 octobre 2026 ; `tests/test-944.js` pour le module de données, `tests/sonde-opmessages-pieces.js` § « 6 bis » pour l'écran, `tests/mutations-pieces.js` T01 à T24 et G05 à G18) :
  · **une pièce que le service refuse POUR L'INSTANT** (429, 402 « espace plein », 503 « lecture seule », 408 `envoi_trop_lent`) **reste dans le fil** avec la phrase du service — UNE seule invitation à réessayer, avec l'attente exacte (`Retry-After`) : « Trop de demandes en peu de temps (réessaie dans 20 s). » — et deux boutons : « Réessayer » (le même message, le même `cid`, les pièces déjà déposées ne sont pas redéposées) et « Annuler » (la pièce quitte la file, son adresse locale est rendue). Elle ne repart JAMAIS toute seule et ne bloque pas ce qui est derrière elle (un texte écrit pendant qu'elle attend part tout de suite). Un refus DÉFINITIF (trop lourd, type refusé, plus le droit d'écrire) la jette, comme avant ;
  · **une coupure du réseau ou un 502** met le message en file : « En attente de connexion… » — jamais « Envoi… » tant qu'aucun octet ne part (un renvoi n'est dit « Envoi… » qu'au bout de 400 ms de requête, et la source redit l'écran à ce moment-là comme à la fin de l'essai) —, UN avis par envoi (« Pas de connexion : ta photo partira dès que le réseau reviendra. » ou « Le service ne répond pas pour l'instant : … »), des essais ESPACÉS (3 s, 6 s, 12 s, puis 24 s : le testeur en avait compté 21 en 12 s) et le même `cid` à chaque essai : aucun doublon au retour du réseau. Le 408 d'un envoi trop lent a sa phrase (« L'envoi s'est arrêté en route (connexion trop lente)… ») ;
  · **onze photos choisies** : les dix premières partent, la page dit « 10 photos au plus par envoi : la onzième n'a pas été envoyée. » (la source refuse en plus un onzième dépôt demandé directement, `trop-de-photos`) ;
  · **un GIF part tel quel** jusqu'au poids maximum d'une photo (`limites.pieces.photo_max`) : le service en retire les commentaires et les extensions inconnues, il garde les images et la boucle. Plus lourd, ou démesuré (16 millions de points), il part en image fixe ET la page le dit. Les photos de profil et de groupe restent des images fixes ;
  · **un nom de fichier long** perd son radical, jamais son extension : `couperNom` (120 signes, extension de 16 signes au plus), la MÊME règle côté appareil et côté service (`test-944` les compare sur onze noms), jusque dans l'en-tête de téléchargement ;
  · **la durée d'un vocal** est celle que le compteur montrait à l'envoi, tronquée à la seconde (1:05 ne devient plus 1:06) ;
  · **une photo seule garde ses proportions** (boîte de 240 × 320 au plus, jamais sous 72 px de côté, vue ENTIÈRE même pour un panorama) ; les grilles de deux photos et plus restent des vignettes recadrées, la photo entière s'ouvre au toucher ;
  · **une photo que le service ne rend plus** dit « Photo indisponible » dans sa case (et plus seulement à l'oreille) ;
  · **la barre latérale** dit « Présence masquée » (point gris) quand la présence est coupée — ici, ou sur un autre appareil de la personne (le service lui envoie son propre événement `personne`).

#### 4.2 Réglages par défaut (à confirmer par Justin) — `config.pieces`, bornés, un nombre absurde REFUSE le démarrage

| | défaut | où |
|---|---|---|
| photo | 12 Mo | `photoMax` |
| vocal | 10 Mo (10 minutes au plus) | `vocalMax` |
| fichier | 25 Mo | `fichierMax` |
| photo de profil | 2 Mo | `avatarMax` |
| par personne | 2 Go de pièces | `quotaPersonne` |
| envois par heure | 60 (le tiers pour un compte de moins de 24 h hors bêta) | `depotsHeure`, `quotas.piece` |
| pièce jamais envoyée | effacée au bout de 24 h | `orphelineMs` |
| envois en même temps | 16 pour le service, 4 par personne | `simultanes`, `parPersonne` |
| taille d'un bloc | 64 Kio (puissance de deux) | `bloc` |
| mémoire des images en cours de nettoyage | 96 Mo (le double de la taille annoncée de chaque image ; plein : 429 « dans un instant ») | `memoireImages` |
| débit minimal d'un envoi | 64 Ko/s après 30 s de grâce (un crédit d'environ 2 Mo) ; en dessous : 408 | `depotDebitMin`, `depotGraceMs` |
| lecteur qui ne lit plus | coupé au bout de 30 s ; une lecture entière dure 10 minutes au plus | `lectureAttenteMs`, `lectureMaxMs` |
| photos par message | 10 (annoncé à la page : `limites.pieces.par_message`) | constante |

Ces valeurs sont aussi **annoncées à la page** (`GET /api/config` → `limites.pieces`) : elle refuse un fichier trop lourd AVANT d'ouvrir une connexion. ⚠️ **Le proxy doit suivre** : nginx laisse passer 26 Mo sur la route EXACTE `/api/pieces` (le plus gros maximum + une marge) et 64 Ko partout ailleurs ; relever `fichierMax` au-delà de 25 Mo demande de relever aussi `client_max_body_size` de ce bloc dans `install-msg.sh`. Le corps reste tamponné par nginx (un client lent ne tient pas un descripteur de Node) ; le tampon coûte du disque avant que le service puisse dire 401 — le disque de nginx est aussi celui d'OP GESTION —, d'où **trois plafonds sur cette route** : le débit, les envois simultanés par RÉSEAU (12), et **24 en tout** (24 × 26 Mo = 624 Mo au plus). Le réseau est ce que le service compte aussi (`cleReseau`) : l'adresse IPv4 entière, les 64 premiers bits d'une adresse IPv6 — une personne dispose de 2^64 adresses dans son /64, et une zone par adresse la laissait repartir à zéro à chaque fois. Si `pieces.simultanes` est relevé, le plafond de 24 doit suivre.

#### 4.3 Ce qui n'est PAS fait

- ~~La sauvegarde des pièces~~ — **faite par l'étape 3** (§ 3.7) : `sauvegarde.js` tient un miroir incrémental de `<données>/pieces/` (les fichiers sont déjà scellés, immuables ; une disparition massive est annoncée au lieu d'être répercutée), et `outils/restaurer.js` les restaure (`--sans-pieces` pour s'en passer) et en relit un échantillon à chaque essai. Relu le 3 octobre 2026 pour le gardien (remarque 5) : rien à corriger de ce côté.
- **Les limites « Pro »** (100 Mo par fichier, 20 Go par siège) : il n'y a qu'un palier. Les espaces professionnels existent (étape 5), mais les limites Pro ne sont pas posées : la formule d'un espace est lisible (`formuleDe`), le quota par personne reste celui de Perso (question 6 de « Ce qui reste à trancher »).
- **Les notifications push d'une photo ou d'un vocal** (étape 2, push) : l'aperçu de la liste dit « Photo », « Message vocal · 0:03 », « Fichier · nom ».
- **La vidéo envoyée en message**, la **capture directe** de l'appareil photo (le sélecteur du système la propose déjà sur un téléphone), un **fichier plus gros que 25 Mo**.
- **Mesuré au navigateur dans un Chromium de conteneur, pas sur un vrai iPhone** : l'autorisation de démarrer un son qu'on vient de télécharger (iOS peut la refuser : la page dit « Touche encore », le second toucher lit le vocal, déjà en mémoire) ; le nom d'un fichier téléchargé qui porte des accents (ce Chromium rend « download » pour tout nom non ASCII, même sur une page nue).
- **nginx : validé par un VRAI nginx 1.24.0 (Ubuntu 24.04), le 2 octobre 2026 puis le 3 (46 vérifications)** — `tests/sonde-proxy-nginx.js` (hors liste : il lui faut un binaire, `OPMSG_NGINX=…`, extrait d'un paquet sans rien installer) fait écrire sa configuration par le vrai `install-msg.sh`, la fait lire par `nginx -t`, puis met nginx devant le vrai service : 1,5 / 20 / 24,9 Mo passent (201), 25,5 Mo est refusé par le SERVICE (413 JSON), 27 Mo par nginx (413 HTML), un JSON de 70 Ko ailleurs aussi ; la configuration d'AVANT refuse tout au-delà de 64 Ko. Le 3 octobre, après la relecture du gardien, elle prouve aussi — chaque fois contre une contre-épreuve — que nos blocs n'écrivent RIEN dans un journal d'accès pourtant actif (adresse, requête, nom de fichier, cookie), que les refus de débit n'entrent pas dans le journal d'erreurs, que la table du réseau rend l'IPv4 entière et le /64 d'une IPv6 (dix adresses simulées par `real_ip`), que cent cinquante adresses d'un /64 partagent le plafond, que treize dépôts d'un /64 puis vingt-cinq réseaux s'arrêtent aux plafonds de 12 et de 24, et qu'un lecteur gelé sur un fichier de 25 Mo ne fait écrire aucun octet temporaire à nginx (21 Mo sans le bloc de la lecture). **Caddy : NON validé** (pas de binaire ici) — le script lance `caddy validate` avant de recharger et restaure l'ancien fichier en cas de refus, mais la syntaxe (`@pasPieces not path /api/pieces` + deux `request_body`) est écrite d'après la documentation.

#### 4.4 Le geste de Justin sur le VPS (le déploiement par la CI NE LE FAIT PAS)

`deployer.sh` (celui que lance la CI) exporte `server-msg/` dans `releases/<sha>`, y installe les dépendances, bascule le lien `current` et redémarre l'unité : il ne touche NI à nginx NI à Caddy, et ne relance pas `install-msg.sh`. Le fichier de proxy d'OP MESSAGES (`/etc/nginx/sites-available/opmsg-<instance>.conf`, ou `/etc/caddy/opmsg/<instance>.caddy`) est écrit par l'installation seule. Tant qu'elle n'est pas rejouée, le proxy garde `client_max_body_size 64k` sur toute la route : un dépôt de photo, de vocal ou de fichier au-delà de 64 Ko reçoit un 413 **du proxy** (en HTML, avant que le service voie le corps), que la page lit comme « trop lourd » avec le maximum du service — c'est exactement le défaut à ne pas laisser en ligne. Le service, lui, est déjà correct : il refuse tout seul ce qui dépasse.

⚠️ **Le même geste pose, depuis le 3 octobre 2026, ce que la relecture du gardien a demandé du proxy** : plus de journal d'accès dans nos blocs (`access_log off`), les refus de débit hors du journal d'erreurs, des plafonds comptés par réseau (et non par adresse), un plafond de 24 dépôts en cours pour tout le monde, et un bloc `^~ /api/pieces/` pour la lecture, sans tampon sur le disque de nginx, avec ses propres plafonds de connexions. **Tant qu'il n'est pas rejoué, rien de cela n'est en place** : le proxy de l'instance déjà installée écrit encore son journal d'accès, avec l'adresse et la requête entière.

Le geste, en root sur le VPS, après le déploiement de ce commit sur `main` (le script est REJOUABLE : la configuration et la clé ne sont pas retouchées, le fichier de proxy n'est réécrit que s'il a changé, `nginx -t` ou `caddy validate` passe AVANT le rechargement et l'ancien fichier est remis en cas de refus) :

```bash
curl -fsSL https://raw.githubusercontent.com/justino17-cmd/teamop/main/server-msg/install-msg.sh -o /root/install-msg.sh
bash /root/install-msg.sh beta
```

Pour la production, le jour de « publie OP MESSAGES » seulement : `OPMSG_PUBLIE=oui bash /root/install-msg.sh prod`. Si nginx ET Caddy tournent, préciser `OPMSG_PROXY=nginx` (ou `caddy`). Le script n'affiche aucun secret, ne redemande NI la clé maître NI la clé de déploiement sur une instance déjà installée (il ne les demande que si elles manquent), et finit comme toute installation par déployer `main` : l'instance redémarre une fois (les appareils connectés se reconnectent seuls, le flux reprend où il en était).

#### 4.5 Lenteur, journaux du proxy, limites connues (relecture du gardien, 3 octobre 2026)

- **Un envoi qui n'avance pas rend sa place** (`deposer`, `gardeDebit`). Sans tampon devant le service (Caddy, accès direct), un envoi qui annonçait 25 Mo et en envoyait un octet par seconde tenait une des 16 places — et une des 4 « par personne » — jusqu'au délai de Node (300 s) ; quatre comptes les prenaient toutes. Après une grâce de 30 s, l'envoi doit avoir reçu au moins 64 Ko/s en moyenne : un crédit d'environ 2 Mo, que l'envoi lent mais honnête consomme avant d'être coupé et qu'un bon débit n'entame jamais. La garde est une **minuterie** (un envoi arrêté ne reçoit plus de morceau pour s'en apercevoir). Coupé : **408 `envoi_trop_lent`**, la place, la réservation de quota et la réserve de mémoire d'images sont rendues ; la connexion se ferme derrière la réponse (le reste du corps ne sera jamais lu), et un client qui continue d'envoyer lit quand même le 408 (`test-943` § 11).
- **Un lecteur lent ne tient pas un fichier ouvert** : chaque lecture garde deux descripteurs (la connexion et le fichier). Une connexion qui reste pleine plus de 30 s est coupée ; une lecture entière dure 10 minutes au plus. Le journal dit la cause (`piece_lecture_coupee`, motif `attente` ou `duree`), sans identifiant ni nom. Derrière nginx, la lecture n'est plus tamponnée (§ 4.4) : c'est le service qui attend, et qui coupe.
- **Le journal du proxy** (SERVEUR.md § 3.6 : « jamais d'adresse, de nom, de texte, de nom de fichier ») : nos blocs nginx n'écrivent aucun journal d'accès. **Mais le journal d'ERREURS de nginx reste celui du système** et garde, pour une panne amont (service arrêté, délai dépassé), l'adresse du client et la ligne de requête — avec les identifiants de conversation et de pièce qu'elle porte. C'est le prix de voir une panne ; il est tourné par le `logrotate` du paquet nginx. **Caddy** n'écrit un journal d'accès que si un bloc `log` le demande, et le nôtre n'en pose pas — d'après la documentation, NON vérifié ici (pas de binaire).
- **Limites connues, non corrigées** :
  1. ⚠️ **Un accusé de lecture déjà journalisé se rejoue après une coupure** (remarque 8 du gardien). Un « Lu » est écrit dans `journal` à l'instant où la personne lit, avec les destinataires que son réglage « Confirmations de lecture » désigne alors (tous les membres, ou elle seule si elle les a coupées). Si elle les coupe ensuite, le journal n'est PAS réécrit : un appareil qui revient après une coupure et reprend le flux par `Last-Event-ID` peut encore recevoir, tant que le journal les garde (7 jours, 10 000 lignes), les « Lu » qu'elle avait émis AVANT. Rien de ce qu'elle lit APRÈS n'est montré. Non corrigé : il faudrait réécrire le journal à chaque changement de réglage, pour un « Lu » que les membres connectés avaient déjà vu en direct. Ce que le réglage promet : « pour l'avenir ».
  2. **Un envoi qui trottine** (un octet toutes les 59 s) tient une des 24 places du proxy pour les dépôts : `client_body_timeout` ne mesure que l'intervalle entre deux lectures, nginx n'a pas de durée totale. Deux réseaux suffisent à remplir les 24 places ; les dépôts refusent alors (429) jusqu'à ce que ces connexions tombent. Il faudrait authentifier AVANT de tamponner (`auth_request`), ce que ce lot ne fait pas. Les lectures, les messages et le flux ne sont pas touchés.
  3. **Le plancher de disque compte la taille ANNONCÉE entière des envois en cours**, y compris les octets déjà écrits : il se trompe du côté prudent, de `simultanes` × le maximum (400 Mo) au plus.
  4. **Un réseau d'accès partagé** (une adresse IPv4 d'opérateur pour des milliers de personnes) partage aussi ses plafonds de débit et de dépôts simultanés : c'est le prix d'un plafond par réseau. Si un opérateur le rencontre, relever les valeurs de `install-msg.sh`, pas retirer le plafond.

### Étape 5 : espaces professionnels et Messages Pro — ✅ FAIT (3 octobre 2026, `server-msg/routes-espaces.js`, `formule.js`, `facturation.js`, `configurer-stripe.js`, migration 5)

- **Contenu** : espaces (propriétaire, administrateurs, membres), invitations par lien, canaux publics et privés, « Contacts de l'entreprise », UNE fonction qui décide de la formule, facturation Stripe en **mode test**, fonctions Pro refusées côté serveur, l'interface, et le banc de la couture avec OP GESTION.
- **Justin teste** : Réglages › Entreprise (créer un espace, copier le lien d'invitation, l'ouvrir sur un autre appareil, rejoindre), « Contacts de l'entreprise » (le champ filtre, « Écrire »), un canal public et un canal privé, Réglages › Abonnement (la page de paiement de Stripe avec une carte de test, le retour, « J'ai réglé — vérifier », « Gérer l'abonnement »).
- **Gestes de Justin** (`INSTALLER-LE-SERVEUR.md` § 10 quinquies) : la clé Stripe **restreinte** en saisie masquée (`configurer-stripe.js`) ; activer le portail de facturation dans Stripe ; confirmer quels prix `msgpro` sont les bons (le dépôt en connaît deux, `price_1TwV6E…` et `price_1TwgdtF…`) et que le produit s'appelle « OP MESSAGES Pro » ; trancher l'entrée du PREMIER espace en production (« Ce qui reste à trancher », question 15).

#### 5.1 Ce qui est fait

- **Stockage** — migration 5 (rejouable, aucune table existante touchée, copie `avant-v5` gardée) : `espace` (nom SCELLÉ, propriétaire), `espace_membre` (rôle `admin` ou `membre`), `canal` (ce qui fait d'une conversation de genre `canal` le canal d'UN espace, public ou privé), `abonnement` (le DERNIER état que Stripe a dit : client, abonnement, statut, places, échéance, première lecture d'un impayé, dernière lecture réussie — jamais un numéro de carte). Les quatre tables sont dans les TROIS listes écrites à la main (`TABLES_COMPTEES`, `sonde()`, `lignesDe`) ; quatre genres de purge neufs (`espace`, `espace_membre`, `invitation`, `canal_membre`) sont déclarés dans `GENRES_PURGE` et rejoués hors ligne par la restauration — un effacement qu'une archive ramènerait n'en est pas un.
- **Un canal est une conversation** (genre `canal`) : mêmes messages, accusés, pièces, flux, purge. Un canal PUBLIC a pour membres TOUS ceux de l'espace (ils y entrent et en sortent avec lui) ; un canal PRIVÉ, ceux qu'un administrateur y met (des membres de l'espace, toujours). Le rôle dans un canal est le rôle dans l'espace. **L'administrateur d'un espace ne lit PAS un canal privé dont il n'est pas membre.** Sortir d'un espace, c'est sortir de TOUS ses canaux, dans la même transaction.
- **Vingt-quatre routes** (manifeste, matrice de `test-905`) : espaces (liste, création, lecture, renommer, passer la propriété, dissoudre, quitter, « Contacts de l'entreprise », rôle d'un membre, retirer un membre), invitations (créer, révoquer, aperçu, rejoindre), canaux (créer, renommer, supprimer, ajouter ou retirer un membre d'un canal privé), facturation (offres, état, paiement, portail, relire). Trois gardes neuves — **E** (membre de l'espace), **EA** (administrateur), **EP** (propriétaire), bâties sur **V** : une session prouve un mot de passe, pas une adresse — et **PRO** (402 `formule_requise`, que la route DÉCLARE dans le manifeste). Un espace dont on n'est pas membre répond **404, la même réponse qu'un espace qui n'existe pas** : un non-membre ne voit RIEN (ni le nom, ni les membres, ni les canaux).
- **Une seule fonction décide : `formuleDe`** (`formule.js`) — Perso, Pro ou impayé, pour un espace ou pour une personne (la meilleure de ses espaces). Le garde PRO, la liste des espaces, l'état de l'abonnement et les places la LISENT, aucun ne la recopie. **Le drapeau de la bêta** (`config.formule.toutOuvert`) **est lu là et nulle part ailleurs**, comme `BETA_ESSAI` ; la production refuse de démarrer avec lui. Payé = `active` ou `trialing`, rien d'autre. Un impayé (`past_due`, `unpaid`) garde Pro **sept jours** — comptés ENTRE DEUX LECTURES RÉUSSIES de Stripe, jamais sur l'horloge seule : une panne de Stripe ne suspend personne —, puis seules les fonctions Pro refusent (créer un espace ou un canal, inviter). L'historique et tout le reste de la messagerie continuent, **rien n'est effacé**, et **seul l'administrateur de l'espace lit POURQUOI** (`raison`: impayé ou jamais abonné) ; un simple membre lit seulement « les fonctions Pro ne sont pas disponibles pour l'instant ».
- **Invitations** : un code long (128 bits), expirant (sept jours par défaut, trente au plus), borné en utilisations et par les PLACES payées, révocable, créé par un administrateur d'aujourd'hui (un lien meurt avec le droit de son créateur). L'aperçu ne dit que l'espace et celui qui invite — il n'accepte rien. Rejoindre ne coûte rien à celui qui rejoint ; c'est l'ESPACE qui doit pouvoir accueillir (formule Pro, places), et la phrase est la MÊME, neutre, pour « complet » et « abonnement en retard ».
- **« Contacts de l'entreprise »** : les membres de MON espace et personne d'autre — pas d'annuaire public, aucune recherche par nom (la page filtre ce qu'elle a reçu). On écrit à un collègue sans l'avoir en contact (sauf blocage), et on peut le bloquer.
- **Facturation** (`facturation.js`, Stripe par `fetch`, sans bibliothèque ni webhook) : le tarif vient de la configuration (liste blanche), le corps ne nomme qu'un rythme et un nombre de places (1 à 500, au moins le nombre de membres) ; `client_reference_id = opmsg:<espace>` et `metadata[produit]=opmsg` ; **un seul abonnement vivant par espace** (409 `abonnement_existant`, avec le lien du portail) et une session de paiement encore ouverte est réutilisée ; les places se changent par le portail de Stripe, et **une baisse sous le nombre de membres ne retire PERSONNE** : elle est dite (`places_depassees`), les liens d'invitation s'arrêtent, tout le monde reste ; le verdict est TOUJOURS relu chez Stripe (au retour du paiement, par `POST …/relire`, toutes les dix minutes) ; **une panne de Stripe ne suspend personne** (`/health.stripeEchecMin`, que la surveillance lit : elle crie au-delà de 90 minutes). Sans clé, tout est INERTE et le dit. En production, payer exige une adresse confirmée (409 `adresse_requise`).
- **`configurer-stripe.js`** : la clé restreinte et les tarifs se posent en saisie masquée, **éprouvés avant d'écrire** (lectures seulement), sur le modèle de `configurer-sms.js` ; une clé secrète complète (`sk_…`) est refusée ; la bêta n'accepte qu'une clé de test ; **un tarif dont le produit ne contient pas « messages » est refusé** (c'est ce nom qui range la ligne hors des paiements d'OP GESTION, dont le compte Stripe est commun — un nom illisible, faute du droit « Products — lecture », reste un avertissement).
- **L'interface** (`apercu/opmessages/index.html`, régénérée dans `server-msg/public/`) : Réglages › Entreprise et Abonnement, trois feuilles (Entreprise, Espace, Abonnement), la liste des conversations montre les canaux (« # nom »), le retour de Stripe relit tout seul. Derrière la capacité `espaces` : l'aperçu de Justin n'en sait rien.
- **/health** (PUBLIC) : `stripeEchecMin` (surveillé) et `facturation {mode, toutOuvert}` (nommés « vus et pas surveillés » avec leur raison). **Aucun chiffre commercial** — ni espaces, ni abonnés, ni impayés : n'importe qui lit `/health` d'un `curl`, et ces nombres disent où en sont les ventes (relecture du gardien, 3 octobre 2026 ; `facturation.espaces`, `abonnes` et `impayes` ont été retirés de la réponse, du stockage et de la surveillance). Ils se lisent dans le tableau de bord de Stripe.
- **Bancs** (`scripts/bancs-messages.liste`) : `test-960` (le stockage et la formule, module seul), `test-961` (les routes, en HTTP, formule de production puis bêta), `test-962` (la facturation contre un faux Stripe), `test-963` (l'outil de pose de la clé), `test-964` (la page et le service), **`test-965` (la couture avec le VRAI OP GESTION)** ; la sonde navigateur `tests/sonde-opmessages-espaces.js` (quatre personnes dans quatre navigateurs, au doigt et à la souris) ; `tests/mutations-espaces.js` (le catalogue des défauts remis un par un dans une copie). **Mesuré le 3 octobre 2026** : `test-960` 177 vérifications, `961` 122, `962` 107, `963` 73, `964` 76, `965` 63 ; la sonde 151 (sans une seule erreur JavaScript) ; la liste entière 41 suites, 4 989 vérifications (plancher 4975). Le catalogue compte 177 défauts : 170 tombent (157 contre les bancs, 13 contre la sonde) et 7 « équivalents » survivent exprès, chacun avec sa raison écrite (une autre garde le neutralise) et, quand il y en a un, le défaut réel qui le remplace (`B29b`, `P10b`). Le premier jeu a laissé survivre 17 mutations, le second 4 : chacune a été regardée avant d'être corrigée, et ou bien le banc a reçu le contrôle qui lui manquait (commits 9/n et 11/n), ou bien la garde était doublée et la mutation est déclarée équivalente.

#### 5.2 La couture avec OP GESTION — ce que `test-965` a MESURÉ

Le compte Stripe est commun : OP GESTION lit TOUS les abonnements (`status=all`, cent par page, dix pages au plus) et range chaque ligne. `test-965` lance le vrai `server/index.js` en boucle locale, derrière un faux Stripe qui porte un abonnement de Messages Pro à la même adresse qu'une entreprise OP GESTION, et compare, état par état, ce que `/api/espaces/etat` répond avec et sans. Résultat : **pour cinq sortes d'entreprises (payée, en essai, impayée, sans formule, fiche « Gratuit » d'avant) et onze états de l'abonnement de Messages Pro (payé, d'essai, en retard, impayé, incomplet, en pause, résilié…), le verdict d'OP GESTION ne change pas**, dans les deux directions (un abonnement d'OP GESTION ne donne rien à Messages Pro non plus), quel que soit l'ordre dans la liste, et un abonnement de Messages Pro n'ajoute jamais une place à OP GESTION. Aucune ligne de `server/` n'a été touchée.

Trois constats, pour Justin :
1. ⚠️ **Limite mesurée, non corrigée (elle demande un changement dans `server/`)** : un tarif que ni la liste d'OP GESTION (`STRIPE_PRIX_MESSAGES`) ni le nom du produit (« messages ») ne désignent est lu **comme un paiement d'OP GESTION**. Une entreprise qui ne paie rien d'OP GESTION mais dont le dirigeant achète Messages Pro avec la même adresse est alors **SERVIE** (jamais coupée) tant que l'abonnement court. La parade est dans la configuration de Stripe : un produit « OP MESSAGES Pro » (l'outil `configurer-stripe.js` **refuse d'écrire** quand ce n'est pas le cas — il n'avertissait que : relecture du gardien, 3 octobre 2026). `test-965` épingle cette limite avec la consigne de ce qu'il faudra retirer le jour où OP GESTION la corrigera.
2. ⚠️ **Le plafond de mille abonnements est PARTAGÉ** (dix pages de cent, lu dans le code d'OP GESTION) : au-delà, OP GESTION ne peut plus lire la liste et répond « vérification impossible » à **tout le monde** — personne n'est coupé (une panne de notre côté ne suspend personne), mais plus personne n'est vérifié. Les abonnements de Messages Pro comptent dans ce plafond.
3. **La marque `metadata[produit]=opmsg` n'est lue par personne côté OP GESTION** ; c'est le tarif ou le nom du produit qui classent. Messages Pro n'écrit JAMAIS la métadonnée `espace` (celle qu'OP GESTION lit pour rattacher un abonnement à une entreprise) : la sienne s'appelle `opmsg_espace`, et un banc le garde.

#### 5.3 Décisions prises sans Justin (à confirmer)

1. **Créer un espace est une fonction Pro**, jugée sur la formule de la PERSONNE (la meilleure de ses espaces). Conséquence : en production, le **premier** espace d'une entreprise ne peut pas naître d'une création libre (voir « Ce qui reste à trancher », question 15).
2. **Dissoudre un espace est refusé tant qu'un abonnement court** (409 `abonnement_actif`), et **supprimer son compte est refusé si l'on est seul dans un espace dont l'abonnement court** (409 `espace_abonne`) : Stripe continuerait de prélever pour un espace qui n'existe plus. On résilie d'abord (portail). Un propriétaire qui n'est pas seul passe la main tout seul à l'effacement (au plus ancien administrateur, à défaut au plus ancien membre).
3. **Un canal public n'a pas d'historique pour qui arrive** : un membre qui rejoint l'espace lit ce qui suit son arrivée (comme dans un groupe).
4. **Un canal privé peut devenir orphelin** : le rôle dans un canal est le rôle dans l'espace, et l'administrateur d'un espace n'y est pas membre. Si le dernier administrateur d'un canal privé en part, plus personne ne peut le gérer ; il continue de servir ses membres. Remède : le propriétaire nomme administrateur de l'espace l'un d'eux. (`test-960` le joue.)
5. **Seul le propriétaire rétrograde ou retire un administrateur** ; il ne part jamais, ne se retire pas, ne se rétrograde pas : il passe d'abord la main (le nouveau propriétaire doit avoir une adresse confirmée et moins de trois espaces).
6. **Trois espaces au plus par propriétaire, vingt par personne, cent canaux par espace.**
7. **`customer_email`** : l'adresse de paiement vient de la SESSION de la personne quand elle en a une confirmée ; les comptes par téléphone et de la bêta n'en ont pas — en mode test, Checkout la demande lui-même ; en production (clé live), pas d'adresse confirmée = pas de paiement.
8. **Les liens d'invitation ont un plafond d'utilisations égal aux places qui restent** ; l'acceptation les recompte (d'autres liens ont pu les prendre entre-temps).
9. **« Les invités rejoignent sans siège » (§ 3.8) est lu pour les RÉUNIONS** (l'invité sans compte ni installation d'`OFFRE-PRO.md`, étape 6), pas pour un espace : **un membre d'un espace occupe une place de l'abonnement de l'espace** (les places bornent les liens, et une baisse ne descend jamais sous le nombre de membres). Ce que « ne coûte pas de siège » devient ici : la personne qui rejoint ne paie RIEN et n'a besoin d'AUCUNE formule — c'est l'espace qui doit pouvoir l'accueillir. Un statut « invité d'un espace, sans place » n'existe pas ; il demanderait un troisième rôle et une règle de plus dans chaque garde.

#### 5.4 Ce qui n'est PAS fait, et les limites

- **Le lien créé par TEAM OP** (l'entrée du premier espace en production, `OFFRE-PRO.md` n° 11) : le geste ou l'outil d'opérateur n'existe pas. Les bancs et la sonde posent le premier espace en base.
- **Un vrai paiement par une vraie carte** : jamais joué ici (Stripe est sur Internet, ce conteneur n'en a pas). La sonde intercepte la navigation vers Stripe et joue le retour APRÈS que le faux Stripe a « payé » la session que le service avait demandée. Seul Justin, avec une clé de test, puis de production, le constate.
- **Les limites de pièces Pro** (100 Mo par fichier, 20 Go par siège) : un seul palier existe encore (§ 4.3, question 6).
- **Réunions programmées, appels de groupe** : leur droit Pro se lira dans `formuleDe`, au même endroit (étapes 6 à 8).
- ✅ **Retirer quelqu'un d'un GROUPE, ou le quitter** (`membreRetirer`, `membreQuitter`, d'avant ce lot) ne s'écrivait pas dans `purge` : une archive d'avant la sortie ramenait la personne dans le groupe. **Corrigé à la relecture du gardien** (3 octobre 2026) : genre `groupe_membre`, déclaré, rejoué hors ligne, avec son banc (`test-950` § 13 sexies) ; la révocation des liens d'un groupe se note aussi (genre `invitation`, comme pour un espace) — une archive d'avant rendait sinon son code au retiré.
- **Un canal supprimé par son administrateur disparaît pour tous ses membres** (conversation, messages et pièces), sans corbeille : le mot SUPPRIMER est exigé.

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
6. **Quotas de stockage et tailles de pièces** : *je propose* photo 12 Mo, vocal 10 Mo, fichier 25 Mo en Perso et 100 Mo en Pro, 2 Go par personne en Perso et 20 Go par siège en Pro. ⚠️ **Posé le 2 octobre 2026 pour l'étape 4 : les valeurs « Perso » seulement** (photo 12 Mo, vocal 10 Mo, fichier 25 Mo, photo de profil 2 Mo, 2 Go par personne, § 4.2) — à CONFIRMER. Les valeurs Pro attendent l'étape 5.
7. **Palier « Business Premium 25 € » et « inclus avec le Business Premium d'OP GESTION »** (`tarifs.html`) : avec des comptes séparés, la liaison n'existe pas. *Recommandé* : retirer la phrase, ou un geste « cadeau » explicite plus tard, jamais une lecture continue d'OP GESTION. ✅ **Tranché le 1er octobre 2026 (Justin : « un Pro à 15 euros ; lui à 25 on le supprime ; à 15 euros ils ont toutes les options »)** : Messages Business Premium est retirée de la vente, Messages Pro à 15 € porte tout, la phrase est retirée du site (aperçu), de la page de paiement et du serveur (refus `formule_retiree`) ; « visio illimitée » est écrite « sans limite de durée », avec le nombre de participants en vidéo dit limité.
8. **Données existantes dans Firebase** : y a-t-il de vraies conversations à conserver ? Aucune migration n'est prévue. *Recommandé* : non, sauf si tu me dis qu'il y en a.
9. **Réunions à plus de 4 en vidéo** : SFU LiveKit en étape 10, sur mesures. *Recommandé* de ne rien promettre avant.
10. **Sonnerie d'appel limitée sur iPhone** (pas de CallKit en page web) : à accepter avant l'étape 7.
11. **Fonctions de la maquette Zoom « bientôt »** : tableau blanc, salles de répartition, sous-titres, diffusion, enregistrement dans le nuage. *Recommandé* : afficher « bientôt », ne pas les simuler.
12. **Textes légaux** et délégué à la protection des données : à valider avant l'étape 9.
13. **Déménagement sur machine dédiée** : *recommandé* dès que les appels pèsent sur le réseau (~100 Mb/s soutenus) ou gênent l'API d'OP GESTION.
14. **Notifications, export, suppression** (§ 2.8) : neuf choix faits sans lui, à confirmer — les messages d'un compte supprimé restent chez les autres, signés « Compte supprimé » ; sursis de 14 jours ; l'export sans le numéro de téléphone ; l'aperçu jamais activé par défaut ; le sujet VAPID est le `contactEmail` de la configuration (`contact@teamop.fr`) ; se déconnecter retire aussi les abonnements push ; un appareil prêté suit son dernier utilisateur ; dix appareils par personne ; export et suppression en garde S.
15. **Comment naît le PREMIER espace d'une entreprise en production ?** (étape 5) Créer un espace est une fonction Pro, jugée sur la formule de la personne ; or une personne sans espace payé est en Perso — le premier espace ne peut donc pas naître d'une création libre. *Recommandé* : le lien créé par TEAM OP (`OFFRE-PRO.md` n° 11) — un geste d'opérateur, dans la Tour, qui crée l'espace et en remet le lien à l'entreprise. **Non construit** : les bancs et la sonde posent le premier espace en base. Sur la bêta (tout ouvert), la question ne se pose pas.
16. **Les prix `msgpro` côté OP GESTION** : lesquels sont les bons, lequel est le mensuel, et le produit s'appelle-t-il « OP MESSAGES Pro » ? C'est du nom de ce produit (ou de la liste d'OP GESTION) que dépend la couture (étape 5, 5.2, constat 1). *Si le produit ne peut pas porter ce nom* : faire ajouter les deux tarifs à `STRIPE_PRIX_MESSAGES` (un changement dans `server/`, sur la branche de travail d'OP GESTION) **et** apprendre cette liste à l'outil, qui refuse aujourd'hui tout produit sans « messages » dans son nom sans pouvoir lire la liste d'OP GESTION.
17. **Le plafond de mille abonnements du compte Stripe** (partagé, dix pages de cent côté OP GESTION) : à relever dans OP GESTION avant d'approcher les mille, ou à tenir à l'œil dans le tableau de bord de Stripe (`/health` ne donne plus le nombre d'abonnés : il est public).
18. **L'historique d'un canal public pour qui arrive**, le **canal privé orphelin** et l'**administrateur qui ne lit pas un canal privé** (étape 5, 5.3, points 3 à 5) : trois choix de produit faits sans lui.
19. **Un membre d'espace occupe-t-il une place payée ?** (étape 5, 5.3, point 9) Lu ainsi : oui, tout membre compte dans les places, et seul un invité de RÉUNION (étape 6) est « sans siège ». *Si Justin voulait des membres d'espace sans place* (des clients, des sous-traitants dans un canal) : un troisième rôle `invité`, hors des places, qui lit un canal et n'écrit nulle part ailleurs — à dessiner avant la première vente, parce qu'il change le compte des places.

## 6. Non vérifié

- Le proxy réellement en place, le pare-feu IONOS, la bande passante autorisée et la taille du VPS (CPU, RAM, disque).
- La version de coturn sur Ubuntu 24.04.
- La qualité d'une maille à 4 en vidéo sur 4G.
- Le comportement d'iOS pour un push d'appel et une page installée en arrière-plan.
- Le coût de `synchronous=FULL` sur le disque du VPS (à mesurer à l'étape 1).
- Le sens exact des deux prix `msgpro` (mensuel, annuel ou par place).
- **Un VRAI paiement de Messages Pro, de bout en bout** (une carte de test, puis une carte réelle, chez Stripe) : jamais joué ici — Stripe est sur Internet, ce conteneur n'en a pas. Les bancs jouent un faux Stripe qui recalcule les formes que Stripe emploie (sessions, abonnements, liste paginée, expansions) ; la sonde intercepte la navigation vers Stripe et joue le retour APRÈS que le faux Stripe a « payé ». Ce que Stripe répond VRAIMENT à une clé restreinte (les droits exacts qu'elle exige), à une session Checkout sans `customer_email`, et ce que le portail permet, sont à constater avec une clé de test (§ 10 quinquies de `INSTALLER-LE-SERVEUR.md`).
- **L'activation du portail de facturation** dans le compte Stripe : sans elle, « Gérer l'abonnement » répond « le paiement n'a pas pu être préparé ».
- L'état des données Firebase d'OP MESSAGES.
- **L'envoi réel de SMS par OVHcloud** (signature acceptée, expéditeur alphanumérique, envoi international, prix réel par pays) : le banc joue un faux OVH ; un SMS reçu sur un vrai téléphone est la preuve (§ 2.4). La table de prix (`sms-prix.js`) est une estimation relevée sur la grille publique, sans Porto Rico ni la République dominicaine (facturés au pire).
- **Un push réel, de bout en bout** (Google, Mozilla, Apple : Internet) et **un vrai iPhone** (page ajoutée à l'écran d'accueil, autorisation, notification) : jamais constatés ici, seulement un Chromium de conteneur, les spécifications (charge déchiffrée, signature VAPID vérifiée) et un faux service push (§ 2.8). C'est le geste de test de Justin.
- **La liste des notifications d'un Chromium de test, sous charge** : un `getNotifications()` y est revenu vide pendant dix secondes alors que `showNotification` avait été accepté en quelques millisecondes (trois passages sur cinq, un soir où la machine servait plusieurs chantiers à la fois). **Cause non établie** : non reproduit à volonté, ni sous une charge épinglée sur le processeur de la sonde (cinq passages verts), ni dans un banc minimal (soixante notifications dans des navigateurs et des contextes neufs, toutes listées). La sonde ne s'y fie donc plus pour le CONTENU (elle note ce que `sw.js` demande au navigateur) et ne regarde la liste que pour jouer le toucher, avec sa population dite.
- **Les plages mobiles de `numero.js`** : écrites d'après le plan de numérotation tel qu'on le connaît, à relire (une plage manquante REFUSERAIT un vrai mobile ; un pays « non vérifiable » accepte un fixe, que le budget borne).

Fichiers de référence lus : `/home/user/teamop/server/install.sh`, `/home/user/teamop/server/index.js` (lignes 62, 78, 1233-1262, 2077-2100, 3132-3150), `/home/user/teamop/server/comptes.js`, `/home/user/teamop/server/socle.js`, `/home/user/teamop/.github/workflows/deploiement.yml`, `/home/user/teamop/scripts/bancs-ci.sh`, `/home/user/teamop/scripts/bancs-serveur.liste`, `/home/user/teamop/tests/test-728.js`, `/home/user/teamop/REPRISE.md` (lignes 2664-2672), `/home/user/teamop/apercu/opmessages/index.html`.

**Conception retenue : prête à construire à partir de l'étape 1. La suite du chantier attend les gestes et réponses de la section 5.**