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
- **Pas d'annuaire ni de recherche d'inconnu.** On trouve quelqu'un par lien, par QR, par courriel d'invitation à gabarit fixe, ou par espace commun.

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
- **Surveillance** : `/health` publie `sauvegarde{configuree, ageH, essaiJours}`. Chaque champ est surveillé ou nommé « vu et pas surveillé » (leçon `atts` et `mailRefus`) : `.github/scripts/surveillance-messages.js` à part, pour ne pas toucher aux listes de `test-726`.
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
11. **Sauvegarde** : instantané cohérent pendant des écritures, rien en clair dans l'archive, restauration équivalente, rejeu de `purge`, mauvaise clé refusée, rétention.
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
> classique c'est avec leur numéro de téléphone ». Le compte PERSO naît et se connecte par NUMÉRO DE TÉLÉPHONE (code SMS à usage
> unique, plafonné par numéro et par adresse, jamais affiché dans les journaux) ; l'inscription par courriel ci-dessous est
> remplacée pour le Perso. Le PRO entre par un lien de connexion créé par TEAM OP. Un SMS est un service tiers payant : prestataire,
> coût par SMS et sous-traitance à fixer avec Justin avant d'écrire le code.

- **Contenu** : inscription par courriel, vérification, mot de passe oublié, sessions et appareils, changement d'adresse, export et suppression, notifications push (paire VAPID propre, portée de service worker propre), réglages.
- **Justin teste** : il s'inscrit avec une vraie adresse derrière la porte, reçoit le courriel, récupère un mot de passe, voit ses appareils. Il reçoit un push sur son téléphone.
- **Gestes de Justin** : adresse d'envoi dédiée (SPF, DKIM, DMARC) avec identifiants en saisie masquée ; sur iPhone, « Ajouter à l'écran d'accueil » sinon pas de push.

### Étape 3 : sauvegarde hors site et exercice de restauration

- **Contenu** : instantané horaire chiffré, rétention 14 jours, relecture, `restaurer.js essai`, surveillance, relecture adverse de l'agent `gardien` sur le service.
- **Justin teste** : un essai de restauration réussi, rapporté chiffres à l'appui. **Porte avant toute personne hors équipe.**
- **Gestes de Justin** : un bucket S3 distinct avec sa propre paire de clés, saisie masquée dans `configurer-messages.js`.

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
5. **Âge minimal 15 ans et pas d'annuaire** (on ne trouve quelqu'un que par lien, QR ou espace commun) : *recommandé* pour un service tout public.
6. **Quotas de stockage et tailles de pièces** : *je propose* photo 12 Mo, vocal 10 Mo, fichier 25 Mo en Perso et 100 Mo en Pro, 2 Go par personne en Perso et 20 Go par siège en Pro.
7. **Palier « Business Premium 25 € » et « inclus avec le Business Premium d'OP GESTION »** (`tarifs.html`) : avec des comptes séparés, la liaison n'existe pas. *Recommandé* : retirer la phrase, ou un geste « cadeau » explicite plus tard, jamais une lecture continue d'OP GESTION.
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

Fichiers de référence lus : `/home/user/teamop/server/install.sh`, `/home/user/teamop/server/index.js` (lignes 62, 78, 1233-1262, 2077-2100, 3132-3150), `/home/user/teamop/server/comptes.js`, `/home/user/teamop/server/socle.js`, `/home/user/teamop/.github/workflows/deploiement.yml`, `/home/user/teamop/scripts/bancs-ci.sh`, `/home/user/teamop/scripts/bancs-serveur.liste`, `/home/user/teamop/tests/test-728.js`, `/home/user/teamop/REPRISE.md` (lignes 2664-2672), `/home/user/teamop/apercu/opmessages/index.html`.

**Conception retenue : prête à construire à partir de l'étape 1. La suite du chantier attend les gestes et réponses de la section 5.**