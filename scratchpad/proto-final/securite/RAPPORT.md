# Audit de sécurité du prototype OP GESTION — contre-vérification et rapport

17 novembre 2026 · étape 6 sur 8 · tête auditée : `73d0a71` (la branche `claude/op-gestion-interface-yb6p32` après fusion) · entreprise fictive « Clim Services 17 », 127.0.0.1, aucun serveur.
Aucune page n'a été modifiée. Les correctifs sont décrits dans `failles.json` (18 entrées, `S01` à `S18`), prêts pour l'étape suivante.

## Résumé en dix lignes

1. Cinq auditeurs (injection, accès, ponts, courrier, dépendances) ont rendu **38 failles** (5 + 13 + 9 + 7 + 4). Chacune a été rejouée ou relue sur la tête **actuelle**, pas sur celle qu'ils avaient vue : la double authentification a depuis réglé une grande partie de l'angle « accès ».
2. **21 des 38 restent réelles**, plus un constat de code que l'auditeur n'avait pas rejoué et que j'ai rejoué (injection-08, le nom d'un fichier) : elles se fusionnent en **18 entrées** (3 hautes, 7 moyennes, 8 faibles), `S01` à `S18`. Les 17 autres sont corrigées depuis, sans effet pour un attaquant, ou deviennent des règles pour la vraie application — liste et raison plus bas.
3. Les trois hautes sont du **code qui s'exécute chez les autres** : l'objet d'un courriel et le nom de son expéditeur à l'Accueil (S01), le nom d'un expéditeur dans l'Historique après une réponse (S02), le nom d'une personne invitée dans le planning (S03). Les deux premières n'exigent **aucun compte** : un inconnu écrit à la boîte, une personne de l'entreprise fait un geste ordinaire.
4. La cause est une : le gabarit n'échappe pas par défaut (14 082 interpolations dans du balisage, 7 256 non reconnues sûres). Chaque oubli est une faille ; un seul geste (`esc()` à la sortie) en ferme trois.
5. Moyennes : un SVG s'exécute encore par le clic du milieu (S04), un inconnu fait « noter » un accord ou un paiement (S05), formules de tableur dans les exports (S06), unité d'article et téléphone de fournisseur bruts (S07, S08), le nom d'un fichier déposé dans l'import de la paie (S09), aucune politique de contenu : tout code injecté peut tout envoyer dehors (S10).
6. Ce que la contre-vérification a **changé** : ponts-01 passe de haute à moyenne (le clic simple est maintenant intercepté, seul le clic du milieu reste) ; ponts-02, acces-01 à 08 sont **corrigées** ; injection-05 ne passe plus par la fiche du fournisseur mais par « Nouveau fournisseur » ; ponts-03 (mise en cadre) est écartée : exploitable seulement parce que le navigateur de test désactive le partitionnement du stockage tiers.
7. Six empreintes d'intégrité proposées par l'auditeur ont été **recalculées ici** sur les fichiers servis : toutes exactes. L'avis critique de MapLibre (GHSA-jrc7-96c5-q579) a été **relu à la base OSV** : confirmé, et non atteignable (`attributionControl:false` relu dans le code).
8. Les générateurs de correctifs (`courrier-corrections.py`, `dependances-corrections.py`) trouvent toujours toutes leurs cibles sur la tête actuelle ; le `.diff` du courrier, **périmé**, a été régénéré (`git apply --check` passe) ; celui des ponts reste périmé (ne pas l'appliquer).
9. Rien n'a pu être vérifié **dans l'artefact publié** (claude.ai) ni sur un appareil iOS/Android réel ; pas de serveur : toute garde « côté client » reste contournable par qui ouvre la console. La section « Les règles pour la vraie application » dit ce que seul un serveur garantit.
10. Cinq doutes sont pour Justin (la Paie à l'adresse seule, le niveau de la politique de contenu, les polices, la pastille « lien vérifié », la lecture des marges par le secrétariat).

## Ce qui a été couvert, et ce qui ne l'a pas été

**Couvert** (par les cinq auditeurs, relu par moi) : recensement statique de 14 082 interpolations ; 13 538 champs de données empoisonnés, 97 écrans revisités ; environ 155 champs tapés par gestes sur 13 passages et quatre rôles ; 33 essais par l'adresse ; messages entre fenêtres (11 envois `'*'`, 4 écouteurs) ; 21 clés du rangement × 15 valeurs malformées ; fichiers choisis (8 lecteurs, 9 blob:) ; coque mobile (Info.plist, manifeste Android, Capacitor) ; module de courrier (28 courriels piégés, 3 exports, un fichier de prix de 20 000 lignes) ; réseau (aucune requête sortante sur 36 écrans, quatre hôtes à l'usage) ; politique de contenu proposée (23 ✓ · 0 ✗ sur la copie corrigée, 0 violation sur 37 écrans) ; 36 routes × 6 personnes ; liens profonds ; connexion (verrouillage, message unique, provisoire, session non rangée).

**Rejoué ici sur la tête actuelle** : voir le tableau en fin de document.

**Pas couvert, ou seulement lu** :
- l'**artefact publié** (claude.ai) : la chaîne de requête y atteint-elle la page ? les cadres, les blob:, une `<meta>` de politique de contenu y marchent-ils ? Non essayé (et c'est précisément le risque de S10 et S16) ;
- un **vrai appareil** : la coque iOS/Android n'a pas été lancée (code lu) ; pas de WebGL dans le navigateur de la machine : la carte (MapLibre) n'a pas été montée, donc ni l'effet d'une empreinte d'intégrité (S16) ni celui d'une version neuve de MapLibre ;
- le **cadre de paiement** (`prototype-paiement.html`) : recensement statique seulement (messages à textes fixes, dix champs, pas de rangement) ; les champs du **compositeur de devis** et des **contrats** ont été lus, pas tapés par gestes ;
- la **barre de recherche du bandeau et les notifications** n'ont pas toutes été tapées par gestes ; la palette Cmd K, si (rejouée ici : sûre) ;
- `apercu/` est publié entier par `scripts/assembler-site.sh` : les copies de pages réelles qu'il contient (par exemple `tour.html`) sont **hors périmètre** de cet audit — à regarder par le chef de chantier ;
- l'envoi réel de courriels, les en-têtes HTTP (GitHub Pages n'en pose aucun), le comportement sous Safari/Firefox.

## Les failles réelles

Classées par gravité. « Gravité » mesure ce que ferait le défaut **si ce code était repris tel quel dans la vraie application** (le prototype, lui, ne porte que des données fictives). Détail complet de chacune (qui, étapes, où, correction) : `failles.json`.

### Hautes

**S01 — L'Accueil écrit l'objet d'un courriel et le nom d'un expéditeur en HTML.** *Qui* : un inconnu qui écrit à la boîte (aucun compte, aucun mot de passe). *Quoi* : son code s'exécute chez le gérant, le secrétariat et les techniciens. *Étapes* : objet « Panne `<img src=x onerror=…>` » ; une personne touche « En faire une tâche », ou le nom d'expéditeur piégé et « C'est un client » ; l'Accueil, qui écrit `<b>${a.t}</b>` et `${a.s}` sans `esc()`, exécute la charge. Rejoué : 36 sorties, 58 exécutions, trois rôles. *Correction* : `esc(a.t)`, `esc(a.s)` (une ligne) + une fonction `mailNom()` à l'entrée des quatre créations de client. Regroupe courrier-01, courrier-04, injection-07. *Portée* : les deux.

**S02 — « a répondu à <nom> » écrit brut dans l'Historique.** *Qui* : un inconnu, nom d'affichage de l'en-tête From libre ; il suffit qu'on réponde. *Quoi* : code exécuté chez quiconque ouvre l'Historique (liste, fiche, impression). *Correction* : `esc(j.action)` aux trois gabarits (aucune action du journal ne porte de balisage voulu : recensé) et `esc()` à la source des deux actions. *Portée* : les deux.

**S03 — Les noms de personnes de l'équipe sortent bruts partout** (planning, absences, statistiques, documents, messages : 75 interpolations). *Qui* : toute personne qui a le droit **déléguable** « Créer des comptes » (secrétaire, chef d'équipe) — et, dans la vraie application, toute personne qui peut modifier son propre nom. *Quoi* : un droit de créer des comptes devient l'accès à la session du patron. *Correction* : `esc` dans `eqNom` (une ligne, contre-épreuve jouée : 0 sortie) **et** garde d'entrée (liste de ce qui est permis, 60 signes) dans `inviterok`, `modifok`, tout renommage. *Portée* : les deux (le serveur refuse aussi ces caractères).

### Moyennes

**S04 — Un SVG s'exécute encore par le clic du milieu** (ponts-01, rétrogradée de haute). Le clic simple sur la miniature d'une « attestation d'assurance » est désormais intercepté (image en `<img>`, inerte) ; mais le clic du milieu ou « Ouvrir dans un nouvel onglet » ouvre le blob comme document dans l'origine de l'application. Rejoué : onglet `blob:`, titre « PWN », clés du rangement lues. *Correction* : refuser tout type hors PNG, JPEG, GIF, WebP, HEIC, PDF à l'ajout et au rendu (deux lignes).

**S05 — Un inconnu qui cite un numéro de devis ou de facture se voit proposer « Noter l'accord », « Noter le paiement annoncé », « enregistrer le paiement »** (courrier-03). Rejoué : devis accepté « signé par » l'inconnu, intervention et 14 tâches créées. *Correction* : ne rattacher un document qu'à son client ; confirmation écrite avant tout geste d'argent. Une adresse falsifiée reste crue : seul le serveur le règle (R18).

**S06 — Formules de tableur dans les exports** (courrier-05) : FEC du mois et de la Comptabilité, deux CSV de Véhicules. *Correction* : apostrophe devant toute cellule texte qui commence par `= + - @`, jamais sur un montant.

**S07 — L'unité d'un article sort brute au Stock** (injection-02 + courrier-06 : par un champ, ou par la colonne d'un fichier de prix de fournisseur). *Correction* : `esc(prU(…))` dans `sxQte` (couvre les 16 appels) + liste d'unités permises.

**S08 — Le téléphone d'un fournisseur sort brut dans le détail d'une tâche de commande** (injection-05, déplacée : la fiche n'a plus de champ en texte libre, mais « Nouveau fournisseur » en prend un). *Correction* : `esc(f.tel)`, `esc(f.delai)` + motif de téléphone.

**S09 — Le nom d'un fichier déposé dans « Recevoir les fiches du cabinet » s'écrit brut dans le message de l'import** (injection-08, jusque-là « code démontré, non rejoué »). *Qui* : celui qui a produit le fichier (cabinet de paie, expéditeur d'une pièce jointe) : un nom de fichier accepte `< > " '` sous macOS et Linux. *Quoi* : la balise naît dans le message « 1 sans nom reconnu : <nom> », son gestionnaire s'exécute chez la personne qui fait la paie ; le fichier n'est pas ouvert. Rejoué : 1 balise, 1 exécution. *Correction* : `perdu.map(esc).join(', ')`.

**S10 — Aucune politique de contenu ni de référent** (dependances-01). Tout code injecté (S01 à S09) envoie le rangement entier à n'importe quel serveur par six canaux (16 fois chacun, mesuré). *Correction* : `<meta http-equiv="Content-Security-Policy">` + `<meta name="referrer" content="same-origin">` par `dependances-corrections.diff` (s'applique). **Niveau « inline » recommandé maintenant** (le script injecté s'exécute mais ne peut rien envoyer ; zéro maintenance), « hash » à la publication. **À essayer dans l'artefact avant d'adopter.**

### Faibles

**S11** — l'import d'un fichier de prix n'a aucune borne (1e23 €, 100 000 signes, 20 000 lignes = 28 s gelé) · **S12** — `toast()` écrit en `innerHTML` (cas rejoué : le nom de la plateforme, auto-piégeage ; ne pas passer d'un bloc en `textContent`, voir `failles.json`) · **S13** — la Comptabilité ouverte seule accepte le message de rôle d'une autre fenêtre, et ouvre la Paie par son adresse (décision de Justin) · **S14** — un client simulé lit le contrat d'un autre par l'adresse · **S15** — homographe et identifiants dans un lien de courriel · **S16** — scripts tiers sans empreinte (empreintes recalculées ici) · **S17** — coque mobile : `?auto=` permis dans la coque, sauvegarde Android, FileProvider · **S18** — polices Google demandées à chaque ouverture de l'atelier (décision de Justin).

## Les failles écartées, et pourquoi

| faille | verdict | raison |
|---|---|---|
| acces-01 (clavier derrière la connexion, rôle gérant derrière un technicien) | **corrigée** | rejoué : `inert`, menu vide derrière l'écran, 0 élément atteint en 70 Tab, aucun lien Équipe |
| acces-02 (`?auto=` sans mot de passe) | **corrigée** | `secuAutoPermis` : fermé hors local, la page publiée l'ignore (code relu, sonde de portes : « site : false ») |
| acces-03 (session = un prénom rangé) | **corrigée pour la session** ; **écartée pour le « passage de fenêtre »** | la session n'est plus rangée (aucune clé rangée, rejoué). Planter `opg_proto_fenetre` ouvre bien une session de gérant (rejoué : ✗) mais exige d'écrire dans le rangement de la page, donc la console ou un script de la page : qui peut cela appelle déjà `sessionOuvrir('marc')` (fonction globale). Aucun gain pour un attaquant ; reste une règle (R2) |
| acces-04 (mots de passe en clair), acces-05 (provisoire commun), acces-06 (aucune limite d'essais) | **corrigées** | OP Security : 8 clés rangées, aucune de mot de passe ; compte du gérant refusé avec « Bienvenue17 » ; verrouillage à 40 essais faux (rejoué) |
| acces-07 (« Ouvrir comme » sans trace) | **corrigée** | rejoué : bande permanente, ligne au journal, session non rangée |
| acces-08 (autre fenêtre, session éternelle) | **corrigée** | session non rangée ; déconnexion à 15 minutes d'inactivité (`inactiviteMs`) ; « Un administrateur a fermé tes connexions » |
| acces-09 (liens clients devinables) | **écartée → règle R8** | textes d'exemple de l'écran (« Lien copié (exemple ») ; aucun lien réel ne naît du prototype |
| acces-10 (« lien vérifié » sur un nom public) | **doute** | un mot d'écran, pas une faille : voir plus bas |
| acces-12 (signature sans signataire) | **écartée → règle R8** | lacune de preuve, pas d'attaquant ; la signature est éteinte dans le prototype |
| injection-06 (coordonnées de l'entreprise brutes) | **écartée** | non exploitable : garde d'entrée de « Mon entreprise », six champs rejoués, 0 sortie ; reste « esc à la sortie » (R12) |
| injection-07 (nom de client brut à l'Accueil) | **absorbée par S01** | courrier-04 fournit le geste qui renomme un client |
| injection-08 (camions, alerte de dotation, nom de fichier d'import) | **camions : absorbés par S03 ; nom de fichier : rejoué, devient S09** | les noms de camions se déduisent de ceux des personnes (S03). Le nom d'un fichier déposé, que choisit celui qui l'a produit (pas la personne qui le dépose), a été rejoué : il s'exécute (S09). J'avais d'abord écarté ce cas à tort, en croyant que la personne choisissait elle-même le nom |
| ponts-02 (HTML déposé comme fiche de paie) | **corrigée** | `paieBulletinVoir` passe par `voirFichierLocal` : image en `<img>`, le reste à enregistrer ; aucun lien `blob:` à ouvrir |
| ponts-03 (mise en cadre : l'atelier écrit `'*'` à son parent) | **écartée → règle R23** | rejoué : le parent d'une autre origine reçoit bien `opd_docs` — dans un Chromium de test dont les arguments **désactivent** `ThirdPartyStoragePartitioning`. Chrome, Safari, Firefox ouvrent un cadre tiers sur un rangement **vide** : il n'y a rien à fuir. La correction touche 13 `postMessage` (et l'origine « null » de l'artefact) pour un gain nul ; la vraie parade est `frame-ancestors` côté serveur |
| ponts-08 (factures dans l'adresse du cadre Comptabilité) | **écartée → règle R27** | même origine, données fictives, 6 046 caractères pour 8 factures : fonctionne. Cassé à 200 factures (88 222), ce que la démonstration n'atteint pas |
| ponts-09 (documents rangés après « Se déconnecter ») | **écartée → règle R27** | rejoué (4 clés restent) mais aucune personne suivante ne les lit par l'écran (vérifié : une technicienne n'en voit rien) ; il faut la console |
| dependances-03 (`DROITS_GARDE = false`) | **écartée → règle R26** | rejoué (✗) mais la console donne déjà tout (`ROLE`, `sessionOuvrir`, `droitsGeste`) : l'interrupteur n'ajoute rien |
| dependances-04 (MapLibre 4.7.1, avis critique) | **écartée → surveillance (R28)** | avis relu à OSV : confirmé, corrigé en 6.4.1 ; **non atteignable** : `L.maplibreGL({ attributionControl:false })` relu, aucun `customAttribution`, aucun `setHTML`. À monter en version avec un essai WebGL |
| courrier-c1 à c5, courrier-h1 | **constats / corrigé** | c1 (PDF de signature non sandboxé : signature éteinte), c2 (déjà acces-04), c3 (traduction : texte juridique), c4 (deux gestionnaires `annonce` : un seul chemin à garder), c5 (authenticité : R18). h1 (téléchargements muets) corrigé : l'intercepteur exclut déjà `[download]` |

## Les doutes pour Justin

1. **La Paie à l'adresse seule** (S13) : `prototype-comptabilite.html` ouverte directement montre la Paie (masse salariale 17 738,95 €) ; l'auditeur dit que c'est peut-être voulu pour la revue. Données fictives. À toi de dire si on la ferme.
2. **Niveau de la politique de contenu** (S10) : « inline » maintenant (zéro maintenance, le code injecté ne peut rien envoyer), « hash » à la publication ; et un essai dans l'artefact avant.
3. **Polices Google** (S18) : les retirer change l'aspect des documents de l'atelier (retour à la police du système), les héberger demande de fabriquer 13 familles de fichiers.
4. **La pastille « ✓ Clim Services 17 · lien vérifié »** (acces-10) : le « lien » est le nom public de l'entreprise ; elle n'a rien « vérifié ». « Entreprise reconnue » dirait ce que l'écran sait. Un mot, pas une faille.
5. **Le secrétariat lit les marges** dans Produits (la case Stock › Voir n'a pas de case propre pour les marges) : cohérent avec « Voir l'écran », à décider avec la règle R9.
6. **FEC et apostrophe** (S06) : une apostrophe devant un libellé est une altération minime du fichier légal : le dire au comptable ou ne l'appliquer qu'à l'export « tableur ».

## Les règles pour la vraie application

Ce que seul un serveur peut garantir. Chaque règle dit d'où elle vient.

**Identité et sessions**
- **R1.** Aucune donnée avant l'authentification : la réponse du serveur à une requête sans session valide ne contient aucun nom, aucun menu, aucun nombre d'entreprise (acces-01).
- **R2.** Une session est un jeton aléatoire d'au moins 128 bits émis par le serveur, lié à un appareil, avec une échéance et une inactivité maximale (15 minutes), révoqué à la déconnexion, à la désactivation de la personne et au changement de mot de passe. Aucun paramètre d'adresse, aucun nom, aucune valeur du rangement du navigateur ne crée ni ne choisit une session (acces-02, 03, 08).
- **R3.** Pas de mot de passe provisoire commun ni déduit : une invitation = un lien à usage unique, 128 bits, 72 h, envoyé à l'adresse de la personne. Le « lien de l'entreprise » n'est qu'un nom (acces-05, 10).
- **R4.** Mots de passe : empreinte argon2id côté serveur, jamais rangés ni transmis en clair par l'appareil ; 12 caractères au moins ; refus des mots courants ; limite d'essais par compte **et** par adresse, délai croissant, alerte à l'administrateur après dix échecs ; même message d'erreur dans tous les cas (acces-04, 06).
- **R5.** La double authentification (OP Security) est vérifiée **côté serveur** : la demande de connexion, le nombre à recopier, le blocage « ce n'est pas moi » et le verrouillage ne vivent pas dans la page.

**Droits et cloisonnement**
- **R6.** L'écran cache, le serveur refuse : chaque route vérifie le droit de l'appelant à **chaque** requête. Un message entre fenêtres ne transporte qu'une intention, jamais un droit ; tout écouteur vérifie `ev.source` **et** `ev.origin`, tout envoi nomme l'origine cible (acces-13, injection-04).
- **R7.** Cloisonnement entre entreprises : chaque ressource (client, devis, facture, contrat, rapport, registre, fichier) est vérifiée contre l'entreprise **et** le compte de l'appelant ; un identifiant dans l'adresse n'est jamais une preuve (acces-11).
- **R8.** Liens donnés aux clients : jeton d'au moins 128 bits, un lien = un document, échéance, révocable, journal de consultation (acces-09). Signature : l'enregistrement garde le signataire, l'horodatage complet, l'adresse IP, l'empreinte du document ; une signature posée par l'équipe est marquée comme telle (acces-12).
- **R9.** Les marges, prix d'achat et salaires ont leurs propres cases de lecture ; la Paie ne se lit qu'avec la case « Paie » **et** une double authentification récente.
- **R10.** Prise de rôle (« ouvrir comme ») : lecture seule, 30 minutes, bandeau permanent, journal « X a ouvert comme Y », notifiée à Y ; jamais deux administrateurs l'un sur l'autre (acces-07).

**Journal**
- **R11.** Le journal est écrit par le serveur : qui, quoi, quand, depuis quel appareil et quelle adresse ; les connexions, les refus, les prises de rôle, les changements de droits, les exports. Il ne s'efface pas depuis l'application, et ses textes s'affichent échappés (courrier-02).

**Textes venus d'ailleurs**
- **R12.** Le gabarit échappe **par défaut** (`html\`…\`` : chaque valeur échappée sauf `htmlSur(x)`). Aujourd'hui l'inverse : 7 256 interpolations à relire à la main, d'où les oublis S01 à S09.
- **R13.** Tout texte venu d'un tiers (objet, nom d'expéditeur, adresse, nom de pièce, cellule d'un fichier) traverse **une** fonction d'entrée — liste de ce qui est permis, longueur bornée, sans balise ni formule — avant de devenir un nom, un titre, une désignation, une unité ; et s'écrit **toujours** échappé à la sortie : deux barrières, jamais une.
- **R14.** `toast()` écrit en `textContent` ; `toastHtml()` est réservé aux messages que l'application écrit seule (S12).
- **R15.** Tout export (CSV, TSV, XLSX, FEC) neutralise une cellule **texte** qui commence par `= + - @` tabulation ou retour chariot ; jamais un montant (S06).
- **R16.** Un lien venu d'une donnée passe par une liste de schémas permis (https, http, mailto, tel) avant d'entrer dans un `href` ; une adresse en lettres non latines s'affiche sous sa forme réelle (punycode) ; jamais cliquable avec des identifiants (S15).

**Courrier**
- **R17.** Le corps d'un message reste du **texte** : le serveur convertit le HTML de l'expéditeur, jamais de cadre « pour que ce soit plus joli » ; images jamais chargées, aucune feuille de style.
- **R18.** Le serveur lit l'authenticité de l'expéditeur (SPF, DKIM, alignement sur le domaine de « De », dans le `Authentication-Results` de **notre** serveur de réception) et la donne à chaque message. Le code existe déjà pour les agents (`server/mail.js`) ; il manque de le brancher sur la boîte des personnes. Un message non authentifié n'est jamais « reconnu » comme un client ou un fournisseur et ne propose aucun geste d'argent (S05).
- **R19.** Un numéro cité dans un courriel ne désigne un document que s'il appartient à l'expéditeur ; tout geste qui change un statut financier demande une confirmation écrite et laisse une trace (S05).
- **R20.** Le serveur construit les en-têtes d'un message avec une bibliothèque qui refuse CR et LF, borne les destinataires, répond à **une** adresse analysée ; les identifiants de message sont opaques.

**Fichiers**
- **R21.** Un fichier venu d'un tiers (pièce jointe, fiche de paie du cabinet, photo de véhicule) ne s'ouvre **jamais** depuis l'origine de l'application : serveur d'objets sur un autre domaine, `Content-Type` fixé par le serveur d'après le contenu (liste blanche : PNG, JPEG, WebP, PDF), `X-Content-Type-Options: nosniff`, `Content-Disposition: attachment` pour tout le reste ; SVG et HTML refusés ; analyse antivirus (S04).
- **R22.** Un import a une taille maximale, un nombre de lignes maximal (5 000), une longueur par champ, des bornes de prix, une liste de colonnes permises, et se fait par lots ou sur le serveur (S11).

**En-têtes, dépendances, appareil**
- **R23.** Les en-têtes sont posés par le serveur (Caddy), pas par des balises : `Content-Security-Policy` avec `script-src` sans `'unsafe-inline'` (nonce ou empreinte), `default-src 'none'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'self'`, `frame-ancestors 'self'` ; `Referrer-Policy: same-origin` ; `X-Content-Type-Options: nosniff` ; `Permissions-Policy` fermée. Les violations sont comptées dans `/health` **et lues par la surveillance** (la règle de `mailRefus` : un compteur que personne ne lit n'est pas une garde).
- **R24.** Aucun script, feuille de style ni police ne vient d'un site tiers : bibliothèques et polices servies par le site avec empreinte ; les tiers qui restent (tuiles de carte) sont nommés un par un et ont un contrat de sous-traitance (S10, S16, S18).
- **R25.** Les tuiles d'une carte révèlent ce qu'on regarde (à fort zoom, une tuile identifie un bâtiment, donc le domicile d'un client) : le serveur les relaie, ou le fournisseur est européen, sous contrat et déclaré au registre des traitements. Les liens « Y aller avec » ne partent que sur un clic.
- **R26.** Aucun mode test, aucun interrupteur, aucun objet d'aide sur `window` dans le code livré ; une garde ne se décide jamais sur le nom d'hôte (`localhost` est aussi celui des coques) mais sur un drapeau posé à la fabrication (S17, dependances-03).
- **R27.** Rien de secret dans le rangement de l'appareil : jeton dans le trousseau (iOS) ou le Keystore (Android), durée courte, effacé à la déconnexion ; cache hors ligne chiffré et lié à la session ; sauvegarde cloud désactivée pour le rangement (S17). Aucune donnée métier dans une adresse, une requête GET, un fragment ou un nom de fenêtre (ponts-08).
- **R28.** Les dépendances se suivent : chaque version est épinglée **et** interrogée contre une base d'avis (OSV) à chaque publication, date et résultat gardés ; une version à avis critique se met à jour avant la publication, même si le chemin vulnérable n'est pas atteint aujourd'hui (MapLibre 4.7.1).

**Garde-fous**
- **R29.** Un banc d'injection est un garde-fou durable : il tape une charge numérotée dans **chaque** champ de texte et revisite tous les écrans ; il compte sa population (champs tapés, champs retrouvés à l'écran) avant de conclure. La version légère de cette étape (`contre-verif-injection.js`) en est le modèle.
- **R30.** Une politique de contenu à empreintes se **fabrique**, jamais à la main : l'étape de fabrication calcule l'empreinte de chaque script en ligne et un contrôle de CI (`dependances-empreintes.py --verifier`) refuse une page dont l'empreinte ne correspond plus.

## Chiffres de la contre-vérification (tête 73d0a71, 17 novembre 2026)

| sonde | avant correction (auditeur) | rejouée ici | lecture |
|---|---|---|---|
| `acces-connexion.js` | 7 ✓ · 10 ✗ | 5 ✓ · 1 ✗ | le seul ✗ est une **population** (l'application derrière l'écran compte 0 élément) : c'est la faille qui a disparu, pas une panne |
| `acces-preuves.js` | 16 ✓ · 13 ✗ | section A : 7 ✓ · 0 ✗, puis plante (`SESSION_CLE` n'existe plus) | acces-01 corrigée ; la sonde est périmée |
| `contre-verif-acces.js` (nouvelle) | — | 9 ✓ · 8 ✗ | B corrigée (5 ✓) ; H, D, E, F rejoués |
| `courrier-gestes.js` | 19 ✓ · 2 ✗ | 19 ✓ · 2 ✗ (36 sorties, 58 exécutions) | S01, S02 confirmées |
| `courrier-confiance.js` | 4 ✓ · 5 ✗ | 4 ✓ · 5 ✗ | S05 confirmée |
| `courrier-fichiers.js` | 20 ✓ · 7 ✗ | 20 ✓ · 7 ✗ | S06, S07, S11 confirmées |
| `courrier-corps.js` | 64 ✓ · 2 ✗ | 64 ✓ · 2 ✗ | S15 confirmée, le corps reste du texte |
| `ponts-fichiers.js` | 4 ✓ · 3 ✗ | 4 ✓ · 2 ✗ (« aucun onglet ») | l'intercepteur a changé le résultat ; voir `contre-verif-fichiers.js` |
| `contre-verif-fichiers.js` (nouvelle) | — | 5 ✓ · 2 ✗ | S04 : le clic du milieu exécute le SVG ; S09 : le nom d'un fichier de paie s'exécute |
| `ponts-cadres.js` | 6 ✓ · 3 ✗ | 6 ✓ · 3 ✗ | ponts-03 et ponts-08 reproduits (puis écartées) |
| `ponts-stockage.js` | 5 ✓ · 1 ✗ | 5 ✓ · 1 ✗ | ponts-09 reproduit (puis écartée) |
| `ponts-coque.js` | 13 ✓ · 5 ✗ | 14 ✓ · 5 ✗ | S16, S17 confirmées |
| `injection-gestes.js` (`--routes=equipe`, `--scenario=plateforme`) | prouvées par l'auditeur (60 puis 40 exécutions ; 1) | 2 ✓ · 2 ✗ chacun (114 exécutions du prénom ; 1 du nom de plateforme) | S03, S12 confirmées (114 exécutions du prénom) |
| `contre-verif-injection.js` (nouvelle, version légère) | — | 10 ✓ · 5 ✗ | S03, S07, S08, S12 ; palette Cmd K sûre |
| `injection-message.js` | prouvée par l'auditeur | 2 ✓ · 1 ✗ | S13 confirmée |
| `dependances-csp.js` | 16 ✓ · 7 ✗ | 16 ✓ · 7 ✗ | S10 confirmée |
| `dependances-reseau.js` | 11 ✓ · 1 ✗ | 11 ✓ · 1 ✗ | S18 confirmée ; 0 violation, 0 nom de client dans les adresses |
| `dependances-portes.js` | 12 ✓ · 1 ✗ | 12 ✓ · 1 ✗ | dependances-03 reproduit (puis écartée) |
| `acces-routes.js` | 0 route fermée montrée | 12 ✓ · 0 ✗ (6 personnes, 36 routes) | confirmé : le droit de voir est tenu à l'adresse, au menu, à la recherche |
| `acces-liens.js` | 0 fiche d'un écran fermé | 6 ✓ · 0 ✗ | confirmé : aucun lien profond n'ouvre l'écran fermé ni l'intervention d'un autre technicien |
| **copies corrigées** (nouvelle contre-épreuve : `courrier-corrections.py` et `dependances-corrections.py` appliqués à une COPIE de la tête actuelle, les pages ne sont pas touchées) | | | |
| `courrier-gestes.js` sur la copie | 21 ✓ · 0 ✗ | 21 ✓ · 0 ✗ (0 exécution) | S01 et S02 : le correctif tient sur la tête actuelle |
| `courrier-confiance.js` sur la copie | 9 ✓ · 0 ✗ | 9 ✓ · 0 ✗ | S05 : le courriel du vrai client garde ses gestes |
| `dependances-csp.js` sur la copie « inline » | 23 ✓ · 0 ✗ | 23 ✓ · 0 ✗ | S10 : aucun canal ne fuit, 0 violation à l'usage ; reste la navigation du haut de page |
| `contre-verif-client.js` (nouvelle) | — | 10 ✓ · 1 ✗ | **population manquante** (l'espace du client n'affiche pas ses propres numéros au premier écran) : les « non lu » ne prouvent rien ; le contrat d'un autre, lui, a été lu par `contre-verif-acces.js` (titre et prix). Les trois ✗ de cette sonde sur les factures, devis et interventions d'un autre cherchaient un **nom** de client, présent ailleurs à l'écran : faux positifs écartés |

**Empreintes d'intégrité** : leaflet.min.js, leaflet.min.css, maplibre-gl.min.js, maplibre-gl.min.css, html2canvas.min.js (cdnjs) et leaflet-maplibre-gl.js 0.0.22 (unpkg) téléchargés, `openssl dgst -sha384` : **6 sur 6 identiques** aux empreintes de `ponts.json`.
**Avis MapLibre** : `api.osv.dev` interrogé (nom et version du paquet seulement) : GHSA-jrc7-96c5-q579, `CRITICAL`, `DOM.sanitize()` appelé par le contrôle d'attribution ; corrigé en 6.4.1.
**Générateurs de correctifs** : `courrier-corrections.py` et `dependances-corrections.py` trouvent toutes leurs cibles ; `courrier-corrections.diff` régénéré et `git apply --check` vert ; `dependances-corrections.diff` s'applique ; `ponts-corrections.diff` **ne s'applique plus** (à ne pas utiliser : refaire S04 et S16 à la main ; S13 est dans `failles.json`).
**Captures** : aucune page n'a été touchée, donc aucune capture à regarder pour cette étape ; les sondes de preuve écrivent les leurs dans le dossier `cap/` hors dépôt.

## Les sondes de cette étape

`contre-verif-acces.js`, `contre-verif-injection.js`, `contre-verif-fichiers.js`, `contre-verif-client.js` (dans `scratchpad/proto-final/securite/`). Chacune compte sa population avant de conclure, sort en 1 si un contrôle tombe, et n'ouvre que 127.0.0.1. Un ✗ y est une faille qui **existe encore** :
- `contre-verif-injection.js` (S03, S07, S08, S12) et `contre-verif-fichiers.js` (S04, S09) doivent rendre `0 ✗` une fois ces failles corrigées : ce sont les bancs de recontrôle de l'étape suivante ;
- `contre-verif-acces.js` garde des constats qui ne sont pas des erreurs de code à corriger : H (passage de fenêtre, écarté), E (signature sans signataire, écarté), F et D (S13 et S14, à corriger) ;
- `contre-verif-client.js` a une **population manquante** (l'espace du client n'affiche pas ses numéros au premier écran) : à compléter avant de lui faire confiance.
Les sondes de l'étape précédente (`courrier-*.js`, `ponts-*.js`, `dependances-*.js`, `injection-*.js`, `acces-*.js`) restent les preuves d'origine ; `acces-connexion.js` et `acces-preuves.js` sont périmées sur les angles que la double authentification a réglés.
