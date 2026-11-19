# Le prototype OP GESTION dans l'artefact — rapport d'audit et de correction (17 novembre 2026)

Voie « artefact », étape 1 (« auditer-et-corriger »). Périmètre : `apercu/prototype-op-gestion.html` (page principale), `prototype-documents.html`
(fabriqué depuis `scratchpad/proto-final/atelier/page.source`), `prototype-comptabilite.html`, `prototype-paiement.html`, `prototype-courrier.js`.
Méthode : (1) lecture du code, règle par règle ; (2) un bac à sable simulé (`sondes/artefact-bac.js`) qui refait ces règles autour d'une page ouverte
par `lib.ouvrir` ; (3) des sondes qui TOUCHENT les gestes ; (4) corrections à la source ; (5) mutations.

⚠️ Hypothèse qui porte tout : les pages voisines sont des fichiers publiés à côté de la page principale, **même origine** (c'est ce que dit la consigne).
Si le cadre de l'artefact les servait d'une origine opaque, `window.parent.claude` serait inaccessible : le cadre dirait alors « le téléchargement n'est pas
disponible ici » (il ne casse pas), et seul un pont par `postMessage` (non écrit) le réparerait. À vérifier une fois dans le vrai artefact.

## 1. Ce que l'audit a trouvé, règle par règle

### a. Téléchargements (lien « download », blob:, data:, clic simulé : inertes)

| où (avant) | ce que l'utilisateur voyait dans l'artefact | correction |
|---|---|---|
| principale `pdfTelecharger` (PDF de l'atelier intégré) | pont tenté, mais `r !== 'declined'` n'a aucun sens (le pont REJETTE) : annonce « PDF prêt » même sur refus ; sans pont : lien inerte + « PDF téléchargé » (faux) | `telechargerFichier` |
| principale `cpFecTelecharger` (FEC provisoire) | idem : « Fichier des écritures prêt/téléchargé » sans preuve | `telechargerFichier` |
| principale `vxCsv` (frais d'un véhicule) | lien inerte ; « Frais exportés pour ton expert-comptable » : **rien** n'était parti | `telechargerFichier` ; la trace au journal n'est écrite que si le fichier est parti |
| principale `vhCsvFlotte` (coût des véhicules) | idem | idem |
| principale, bulletin de paie choisi (`paieBulletinVoir`) | `window.open(blob:)` rend null : **rien** | `voirFichierLocal` : le fichier se montre dans la page (image) et s'enregistre par le pont |
| principale, liens `<a href=blob: target=_blank>` (documents d'un véhicule) | fenêtre qui ne s'ouvre pas | même visionneur |
| principale, justificatif PDF (`cxPhotoHtml`) | `<iframe src=blob:>` : le lecteur PDF d'un cadre verrouillé peut refuser | + « enregistrer le PDF » sous le cadre |
| documents `pdfEnregistrer` | pont via `window.claude` seulement : **dans le cadre de l'atelier il n'existe pas** → « pas disponible » alors que le parent l'a | `claudeHote()` : le sien, sinon celui du parent |
| comptabilité `fecTelecharger` | idem (`window.claude` seul) | idem (parent) |
| module de courrier : aperçu PDF › Télécharger, pièce reçue, PDF signé (3 fabriques de lien) | lien inerte, et « Pièce téléchargée » annoncé | `enregistrerFichier` : demande à l'hôte (point d'extension **H9** `telecharger(nom, blob)`), sinon le lien d'avant (production, `opcourrier.js` non touché) |

Après : **UNE seule fabrique de lien « download » par fichier** (page principale : celle de `telechargerFichier`, module : celle d'`enregistrerFichier`, comptabilité : aucune ;
`prototype-documents.html` garde la sienne, réservée à `file:`), vérifié par la sonde.

Contrat du pont respecté (`downloads.d.ts` 0.2.75) : résultat `{status:'saved'}` ; **refus = rejet `declined`** (dit : « Rien n'a été enregistré : tu as refusé… ») ; `rate_limited`, `too_large`,
`rejected_extension` ont chacun leur phrase ; données vides jamais envoyées ; extensions : seules `csv txt pdf png jpg…` sont produites par la page.
Sans pont : page du haut (pas de cadre) → lien + « téléchargement demandé, s'il ne démarre pas ton navigateur le bloque » ; dans un cadre → le TEXTE (CSV, FEC) s'affiche
dans la carte à copier, un PDF dit « pas disponible ici ».

### b. `window.claude` absent d'un cadre
Seule la page du haut le reçoit. Trois endroits le supposaient (documents ×2 : téléchargement et IA « sample ; comptabilité). Corrigé par le parent (`window.parent.claude`) dans un `try`, jamais supposé.

### c. alert / confirm / prompt
Aucun appel dans les cinq fichiers (recensé par motif sur le code sans commentaires). Rien à corriger.

### d. window.print
Aucun appel. Deux boutons « Imprimer les étiquettes » (registre) ne font qu'afficher un message « Aperçu : la planche part à l'impression dans l'application » : c'est une simulation dite comme telle, sans dépendre de `print`. Laissé.

### e. window.open, liens vers un autre site
Quatre « Y aller » (Google Maps) et les liens des fournisseurs sont de vrais `<a target="_blank" rel="noopener">` : OK. `window.open` : le bulletin de paie (corrigé), et « Nouvelle fenêtre » (`fenOuvrir`, clic droit en mode application sur grand écran) qui dit déjà « La nouvelle fenêtre n'a pas pu s'ouvrir » si `window.open` rend null : OK.

### f. tel:, mailto:, sms:
55 liens `tel:` (« Appeler » sans le numéro à côté), 3 `mailto:`, 1 `sms:`. Aucun n'annonce « appel lancé ». **Corrigé en UN endroit** : après le toucher d'un lien tel:/mailto:/sms:, une carte reste à l'écran
(« Pour appeler — 05 46 12 12 12 », sélectionnée d'avance, avec « Copier » et une croix). Le lien reste un vrai lien (il marche là où il peut). Le geste « 📞 Appel de… » du planning, qui parle déjà, n'ajoute pas de carte. Le SMS d'un compte rendu montrait déjà le numéro et le texte.

### g. Presse-papiers
5 sites (texte du SMS, lien du registre ×2, copies du menu contextuel, copie d'une valeur) : repli inégal (« Copie impossible ici » sans rien à copier). **Une fonction** `copierTexte` : `clipboard.writeText` dans le geste, sinon copie par sélection (`execCommand`),
sinon la carte avec le texte SÉLECTIONNÉ. Paiement (IBAN) et comptabilité avaient déjà un repli propre. Le presse-papiers n'est jamais lu (le `paste` de l'atelier lit `clipboardData` de l'événement, ce qui est permis).

### h. Caméra, micro, position, partage
Aucun appel (`getUserMedia`, `geolocation`, `share`…). Les photos passent par des `<input type=file>` : OK. « Dicter un devis » est simulé.

### i. Autres sites : cadres, images, polices, scripts
Pas d'`<embed>`, d'`<object>`, ni d'image/CSS externe. Les `<iframe>` sont tous des pages voisines. Scripts : cdnjs (Leaflet, MapLibre, html2canvas) et unpkg (plugin MapLibre) : hôtes permis.
Feuilles : `fonts.googleapis.com` (documents) : permis. **Coupé dans l'artefact** : les tuiles de la carte (`tiles.openfreemap.org`, `server.arcgisonline.com`) — la page le prévoit déjà (au bout de 4 erreurs ou 10 s : « les données de la carte sont refusées », on garde le dessin) ; voir « Non vérifié ».

### j. Rangement (localStorage, sessionStorage, IndexedDB)
Les 21 sites de la page principale sont déjà sous `try/catch` ; le module : un accès non gardé à `window.indexedDB` (`fichiersBalayer`) → gardé. Rejoué sous trois variantes (accès qui jette, méthodes qui jettent, rangement qui oublie), trois rôles, deux appareils.

### k. Son, service worker, plein écran
`son:false` dans le module ; `navigator.vibrate` est testé avant usage ; pas de service worker.

### l. Adresse
Routes de la table des écrans : toutes en lettres/chiffres/tirets, aucune ne porte un nom réservé ; les fiches s'écrivent `route-x-identifiant`. Sonde : `artefact-adresses.js`.

## 2. Dans la coque mobile (à DIRE à Justin, non corrigé)

Une application iPhone ou Android compilée (WKWebView, WebView) n'est pas un artefact : ses limites sont d'autres limites.
- **Téléchargement par lien** : dans WKWebView, `<a download>` ne fait rien (iOS n'enregistre pas depuis une WebView sans délégué de téléchargement) ; une adresse `blob:` non plus. Le pont « downloads » n'existe pas : la page tomberait sur le lien, et dirait « téléchargement demandé » sans rien produire. Il faudra un pont natif (partage de fichier) côté coque.
- **`window.open`** (bulletin déjà corrigé ; « Nouvelle fenêtre » : `fenNatif()` suppose le gestionnaire `opgFenetre` de la coque Mac) : sans le gestionnaire, rien ne s'ouvre ; la page le dit.
- **`tel:` / `sms:` / `mailto:`** marchent en général mieux (ouverture par le système), mais la carte du numéro s'affiche aussi : voulu.
- **Presse-papiers** : `navigator.clipboard.writeText` exige un contexte sécurisé ; sous un schéma personnalisé de coque il peut manquer : repli sélection + carte.
- **Caméra / micro** : demandent une déclaration (`NSCameraUsageDescription`…) côté coque ; le prototype n'en utilise pas.
- **Images `blob:` et PDF dans un `<iframe>`** (justificatif) : WKWebView n'affiche pas le PDF dans un cadre : « enregistrer le PDF » sert de repli.
- **IndexedDB** du module de courrier : peut être purgé par iOS après quelques jours d'inactivité d'une WebView : les pièces rangées peuvent disparaître (le module le dit : « Fichier non conservé »).

## 3. Mesures

**Le bac mord** (`artefact-bac-preuve.js`). Sur la version d'AVANT (copie du 17 novembre au matin), sans pont « downloads » : 4 téléchargements inertes comptés (CSV frais d'un véhicule, CSV coût des véhicules, FEC provisoire,
PDF de l'atelier), 1 `window.open` à vide (bulletin de paie) — et **chaque écran annonçait le contraire** (« Frais exportés pour ton expert-comptable », « Fichier des écritures téléchargé », « PDF téléchargé »).
Sur la version corrigée : plus un seul lien inerte, chaque geste dit ce qui se passe, le bulletin s'ouvre dans la page (5 ✓).

**Sondes** (toutes sous le bac à sable ; chiffres du 17 novembre) :

| sonde | ce qu'elle joue | résultat |
|---|---|---|
| `artefact-telechargements.js` | pont (nom, type, taille, 8 premiers octets), refus, échec, trop lourd, trop de demandes, extension refusée, fichier vide, sans pont, 4 états du presse-papiers, 3 liens tel/mailto/sms × 2 appareils, carte (tient dans l'écran, pas sur la barre du bas), visionneur de fichier choisi, câblage des gestes réels (CSV ×2, FEC), un seul `.download =` par fichier | 63 ✓ · 0 ✗ |
| `artefact-cadres.js` | comptabilité (FEC par le vrai bouton), atelier de documents (PDF), paiement ; le cadre n'a PAS `window.claude` ; pont du parent, refus, sans pont | 26 ✓ · 0 ✗ |
| `artefact-courrier.js` | Boîte mail › Écrire › Joindre un PDF › Aperçu › Télécharger : le PDF arrive au pont ; refus ; sans pont | 14 ✓ · 0 ✗ |
| `artefact-rangement.js` | 3 variantes de rangement refusé × 3 rôles × 2 appareils (ouverture, 14 écrans, devis rapide, thème nuit) + 3 pages voisines seules | 144 ✓ · 0 ✗ |
| `artefact-adresses.js` | toutes les routes de la table des écrans (aucune hors forme, aucune réservée), adresses écrites, fiches, #settings / #comment-123 / #upgrade | 24 ✓ · 0 ✗ |
| `artefact-carte.js` | hôtes coupés comptés ; la carte dit « Carte réelle indisponible ici… dessin simplifié » avec « Réessayer » | 10 ✓ · 0 ✗ |
| `artefact-captures.js` | carte du numéro et carte « à copier », mac/iPhone, jour/nuit, contraste de l'encre ≥ 4,5 | 16 ✓ · 0 ✗ |
| `artefact-recensement.js` | part du DOM : chaque geste qui sort (télécharger, exporter, copier, appeler, écrire, site, fichier joint), sur chaque écran du menu ET dans les fenêtres/fiches qu'un geste ouvre ; touché pour de vrai | gérant mac 43 ✓ / iPhone 57 ✓ ; secrétariat mac 39 ✓ / iPhone 62 ✓ ; technicienne mac 29 ✓ / iPhone 49 ✓ (population : de 43 à 94 gestes jugés par passage, 5 minutes chacun) |

Le recensement a, entre autres, prouvé **de bout en bout un vrai PDF** : « ⤓ Télécharger le PDF » (document en grand) livre au pont un fichier non vide. Il a trouvé un dernier défaut : le bouton « Appeler Karim » du planning
annonçait « 📞 Appel de Karim… » avec un numéro fictif ; il montre désormais le vrai numéro dans la carte.

**Mutations** (`artefact-mutations.js`, 16, sur des copies ; l'ancien texte est vérifié unique avant chaque mutation) : **16 mordent, 0 survivante** — pont plus demandé (17 ✗), refus annoncé comme un enregistrement, sans pont annoncé « enregistré »,
CSV revenu au lien à la main, carte du numéro retirée, copie refusée sans texte à copier, texte non sélectionné d'avance, fichier blob: sans visionneur, bulletin revenu à `window.open`, module qui ne demande plus à son hôte (×2),
comptabilité et atelier sans le pont du parent, rangement non protégé (espace, thème, IndexedDB du module).

**Bancs du dépôt** (depuis l'arbre de travail) : `compiler-pages` ✓, `verifier-syntaxe` ✓, test-835 (844 ✓), test-836 (307 ✓), test-837 (122 ✓), test-1008 (54 ✓), test-2994 (15 ✓), `verif-secrets.sh` ✓ — tous à 0 ✗.

**Défauts de l'outil lui-même, trouvés en route** (la règle du dépôt : une mesure qui échoue dit pourquoi) : le bac comptait « inerte » un lien que la page prend en charge elle-même (décision déplacée en fin de remontée) ;
un Blob fabriqué dans un CADRE n'est pas un `instanceof Blob` de la page du haut (le bac refusait le fichier à tort) ; le premier recensement de gestes d'un cadre rendait « 0 candidat » (l'état d'un filtre « Par mois » changeait la liste pour les suivants : les candidats se testent
tout de suite après leur découverte).

## 4. Ce qui n'a PAS pu être vérifié (à DIRE)

- **Le vrai artefact** : le pont `downloads` réel (fenêtre de confirmation, refus par le visiteur, comportement sur iPhone/Android de claude.ai) n'est simulé que d'après `downloads.d.ts` 0.2.75. La capacité `downloads` doit être DÉCLARÉE à la publication (`capabilities: {downloads: true}` ; `sample` si l'IA de l'atelier doit servir) : à vérifier sur la publication.
- **Même origine des cadres** (voir en tête) : si le cadre de l'artefact sert les pages voisines d'une origine opaque, `window.parent.claude` n'est pas lisible et un cadre dit « pas disponible ici » ; un pont `postMessage` est la parade (non écrit).
- **La carte réelle avec bibliothèques chargées** : sans Internet, cdnjs est injoignable ici ; le repli « bibliothèque de carte injoignable » est joué, pas le cas « bibliothèques chargées, tuiles coupées » (4 erreurs ou 10 s, déjà prévu par la page).
- **`html2canvas`** (PDF de l'atelier des documents, par la page voisine) : chargé depuis cdnjs, injoignable ici : le PDF de l'atelier est joué par la fonction d'enregistrement, pas par sa fabrication complète.
- **Images `blob:`** (photos de tickets, justificatifs) : leur affichage dans un cadre verrouillé dépend de la politique de contenu réelle de l'artefact.
- **Les liens `tel:`/`mailto:`/`sms:`** sur un vrai téléphone : le bac les annule ; la carte est donc affichée même quand le système les ouvrirait bien.
- Un recensement de 5 minutes par passage ne couvre pas tout (12 à 14 routes « non faites » par passage du gérant, listées par la sonde) : la couverture par fonction (fichier de sortie, fenêtre, fiche) est complète, celle des écrans l'est à moitié.
- **Machine partagée** : pendant la session, des fichiers `/tmp/chaine*.sh` d'autres agents ont pu être écrasés ou allongés par mes essais (noms trop génériques) ; tout est rangé désormais dans `/tmp/opg-artefact/`.
