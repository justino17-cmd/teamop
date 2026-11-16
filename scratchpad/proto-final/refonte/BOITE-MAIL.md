# La Boîte mail du prototype OP GESTION = le module OP Courrier, amélioré — plan (16 novembre 2026)

Demande de Justin (mot pour mot) : « La boîte mail, pareil. Je t'ai dit que je voulais celle qu'on avait déjà, nous, créée actuelle.
Juste améliorer et corriger les bugs qu'elle avait. C'est toujours pas fait. » Et, pour tout le prototype : une application
« logique, simple, rapide, efficace à comprendre pour tout le monde, même pour les gens qui ne sont pas doués avec la technologie ».

⛔ Ce document est un PLAN : rien n'a été modifié dans `apercu/`, `app.html`, `beta.html`, `opcourrier.js`. Le seul ajout est le kit d'essai
`scratchpad/proto-final/refonte/mail-essai/` (voir § 7). Chaque défaut ci-dessous a été REJOUÉ dans un navigateur (Chromium, 127.0.0.1, boîte fictive) ;
ce que je n'ai pas pu vérifier est dit au § 8.

## 0. L'essentiel en dix lignes

1. « Celle qu'on avait déjà » est `opcourrier.js` (416 Ko, un fichier, aucune dépendance, montée dans une zone par `OPCourrier.monter(zone, {source, …})`).
   Elle est DÉJÀ la Boîte mail d'OP GESTION en production (v769, 19 octobre 2026) : `views.boiteMail = courrierVue` dans `app.html` / `beta.html`.
   Seul le prototype a son propre écran (`vueBoiteMail`, `ML_*`, `MBX`, ~600 lignes écrites pour lui). C'est celui-là que Justin ne veut pas.
2. Le module est solide : il tourne sans erreur JavaScript sur six profils (Mac, Windows, iPad, iPhone, Android, 320 px), jour et nuit ; trois mises en page
   (Mac / iPad / iPhone) décidées sur la largeur du CONTENEUR ; nuit très soignée ; envoi annulable ; brouillons ; programmation ; conversations ; catégories ;
   suivi « À traiter / En cours / Résolu » ; traduction ; pièces jointes ; boîtes multiples.
3. **16 défauts** mesurés (dont 2 graves de fonction — D01, D02 — et 3 graves de compréhension — D03, D04, D05), tous reproduits ; 11 sont rejouables d'une commande
   (`mail-essai/defauts.js` : 0 ✓ 11 ✗ aujourd'hui, c'est le but : tout doit passer au vert).
4. Il ne sait PAS faire ce que l'écran du prototype faisait d'utile : reconnaître le client d'un mail, proposer le geste suivant (créer l'intervention, faire le
   devis, proposer trois créneaux libres, rapprocher la facture fournisseur…). Le module n'a **aucun point d'extension** de lecture ou de ligne : il faut en
   ajouter une dizaine (§ 3) — dans une COPIE de travail, jamais dans le fichier servi en production.
5. Le plan : copie `apercu/prototype-courrier.js` (défauts corrigés + points d'extension) ; la rubrique « Boîte mail » du prototype monte cette copie
   dans un hôte PERSISTANT (sinon chaque re-rendu du prototype détruit les brouillons) ; une source fictive branchée sur les données vivantes du prototype
   (`MAILS`, `CLIENTS`, planning) ; les gestes de l'ancien écran deviennent des gestes du bandeau « reconnu » du module ; l'ancien écran disparaît.

## 1. Ce que fait le module (relevé fait en le faisant tourner)

### 1.1 Où il est déjà monté
- `app.html` et `beta.html` : `courrierSource()` (≈ l. 34386 de `beta.html`) branche les VRAIES routes (`/api/mailboxes`, `/api/replies`, `/api/sendmail`,
  `/api/mailbox/connect|disconnect`, `/api/mail/traduire`) ; `courrierVue()` crée `<div id="courrier-zone">`, charge `opcourrier.js?v=` à la première ouverture
  (pas au démarrage : budget de poids), l'ajuste à la hauteur de la fenêtre (`courrierAjuster`), thème = `data-theme` de `<html>`, `cotes:['pro']`, `cleStockage` par entreprise.
- La Tour (`apercu/tour.html` ≈ l. 8537-8564) : même module, autre source (boîtes de l'équipe, signature Yousign réelle).
- OP MESSAGES Pro (`server-msg/public/opcourrier.js`). ⛔ Trois copies identiques, gardées égales à l'octet par `tests/test-2994.js` : toute correction du vrai module est
  donc une publication qui touche aussi `server-msg/` (redéploiement d'OP MESSAGES) — c'est pourquoi la correction de la recherche (v797, `test-3248`) n'est « pas partie ».

### 1.2 Ses écrans (tous essayés)
Colonne **Boîtes** (Toutes les boîtes pro, une ligne par boîte, « Gérer les boîtes », Favoris : Boîte de réception · Marqués · Brouillons · Programmés · Envoyés ·
Signatures · Envois TeamOP ; Suivi : À traiter · En cours · Assignés à moi ; Autres : Archive · Indésirables · Corbeille ; pied : Ajouter un compte · Réglages) — **liste**
(titre, sous-titre, Tous / Non lus / Marqués, pastilles de catégories Principal · Notifications · Reçus · Voyages · Promotions · Tout, recherche, « Sélectionner »,
sélection multiple, clic droit, conversations regroupées) — **lecture** (barre : non lu, archiver, supprimer, indésirable, répondre, répondre à tous, transférer, drapeau ;
objet, expéditeur, catégorie + « Pourquoi ici ? » + « Déplacer vers… », bloc **Suivi** (statut + « Assigné à »), « Traduire en français », corps, pièces jointes avec
téléchargement et « Faire signer » (PDF seulement), réponses rapides, fil de conversation) — **composer** (À, De avec choix de la boîte, Objet, corps avec signature
de la boîte, pièces jointes, « Programmer l'envoi » : 5 choix + date libre, « Enregistrer le brouillon », « Annuler » qui garde un brouillon, envoi en 5 s annulable) —
**Réglages** (notifications, son, regroupement des conversations, signature par boîte) — **Ajouter un compte** (Google, Microsoft, autre messagerie) — états
« Aucune boîte connectée », « Boîtes mail illisibles / Réessayer », « Réception indisponible pour … ». Raccourcis clavier : j/k, flèches, r, f, e, Suppr, c, /, Échap.
Arrivée d'un nouveau mail pendant la lecture : bandeau « Nouveau message de … — Ouvrir », compteur du titre et de l'hôte (`onCompter`), sélection conservée (mesuré : bon).

### 1.3 Le contrat de la source (en-tête du fichier, l. 27-64)
Méthodes asynchrones ; un échec = un rejet lisible (jamais un tableau vide à la place de « on n'a pas pu savoir ») :
`capacites()`, `boites()`, `messages({boite,dossier})`, `lire(id)`, `marquer`, `deplacer`, `envoyer(mail)`, `envois()`, `piece(id,idPiece)`, `suivi(id,{statut,assigne})`,
`traduire`, `ajouterBoite`, `retirerBoite`, `gererBoites`, `lireMX`, `signature{…}`. **Le module ne promet rien qu'une source ne déclare pas** (`capacites()` : `marquage`,
`deplacement`, `suivi`, `moi`, `traduire`, `telechargerPiece`, `journalEnvois`, `programmeServeur`, `signature`, `signatureMaintenance`, `oauth`, `boutonsFournisseurs`,
`gererBoites`, `dossiers`, `destinataires`, `pj`). Un message : `{id, dossier, de:{nom,email}, a, objet, apercu, corps, date, lu, drapeau, pj:[{nom,taille,type,id}],
desinscription, vip, destinataires, automatique, suivi:{statut,assigne,par}}`.

### 1.4 Ses options de montage (l. 8-20) et son API
`source`, `cotes`, `cote`, `cleStockage`, `theme()`, `titre`, `onCompter(n)`, `son`, `titreDocument`, `intervalle` ; renvoie `{demonter, cote, rafraichir({donnees}), ecrire(a, objet)}`.
Le conteneur doit avoir une HAUTEUR définie. Le module vit dans un arbre d'ombre (`attachShadow`) : sa feuille ne touche pas l'hôte et réciproquement ; les feuilles, menus et
toasts sont dans un calque `popover="manual"` (couche supérieure du navigateur).

### 1.5 Ses points d'extension : AUCUN pour ce que veut le prototype
Mesuré en lisant tout `creer()` : l'hôte ne peut ni ajouter un bandeau ou un bouton dans la lecture, ni une pastille dans une ligne, ni remplacer les quatre réponses rapides,
ni ouvrir un message précis, ni lancer une recherche, ni savoir quel message est ouvert, ni être prévenu d'un envoi. Les seuls leviers : `ecrire(a, objet)` (ouvrir un
nouveau message prérempli), `rafraichir()`, `cote()`, et la source elle-même (`suivi`, `gererBoites`, `capacites`). Le champ **suivi** (À traiter / En cours / Résolu + « Assigné à ») est le seul
équivalent existant de « À traiter » et « Confier à quelqu'un » de l'ancien écran.

### 1.6 Thème et téléphone
- Thème : `theme()` rendu par l'hôte, sinon l'appareil ; un `MutationObserver` surveille `data-theme`, `class`, `data-marque` sur `<html>`/`<body>`. ⚠️ Le prototype pose `html[data-mode="jour|nuit"]`
  (`appliquerMode`, l. 7646) : **ni `data-theme`, ni `class`** → le module ne verrait pas un changement Jour/Nuit en cours de route (à traiter, § 2.4).
- Format décidé sur la largeur du CONTENEUR : < 700 px = téléphone, 700-999 = tablette (colonne Boîtes en tiroir), ≥ 1000 = Mac (3 colonnes ; ≤ 1180 : « étroit »).
  Mesuré avec un menu d'hôte de 258 px : Mac 1440 → 1182 px de zone = 244 / 319 / 619 ; Mac 1280 → 1022 = 220 / 280 / 522 ; Windows 1366 → 1108 ; **iPad portrait 820 px → zone de 548 px → format téléphone étiré** (bon : lisible, mesuré).
- Téléphone : pile liste → lecture ; barre du bas FIXE du module (liste : filtre · « n non lus » · écrire ; lecture : drapeau · archiver · supprimer · répondre · écrire) ; feuille du composeur plein écran.

## 2. Comment le prototype monte le module

### 2.1 Les fichiers
| fichier | rôle |
|---|---|
| `apercu/prototype-courrier.js` | **COPIE DE TRAVAIL** d'`opcourrier.js` (`cp`), avec les corrections D01… et les points d'extension du § 3. En-tête : « copie de travail pour le prototype — ne pas resynchroniser à la main ». `test-2994` ne la compare pas (il ne vise que les trois copies nommées) ; `scripts/assembler-site.sh` publie déjà tout `apercu/` ; `tests/test-1008.js` verra la page qui la charge. `node --check` à chaque modification. |
| `apercu/prototype-op-gestion.html` | la rubrique « Boîte mail » : hôte + source fictive + implémentation des points d'extension (`courrierSourceProto`, `courrierHoteProto`, ≈ 250 lignes). La source doit lire les VRAIES données vivantes du prototype (`MAILS`, `CLIENTS`, `MES_FOURN`, `COMMANDES`, `FACTURES`, `INTS`, planning), donc elle vit dans la page, pas dans un fichier à part. |
| artefact publié | le script est chargé **paresseusement**, à la première ouverture de la rubrique (`<script src="prototype-courrier.js">`, chemin relatif) ; l'appel `Artifact` passe `files: {"prototype-courrier.js": "apercu/prototype-courrier.js"}`. Jamais d'adresse absolue ni de CDN. Un test : la rubrique s'ouvre dans l'artefact hors-ligne (script servi depuis ses propres fichiers). |

### 2.2 L'hôte : persistant, hors de `#contenu`
⛔ **Mesuré** : le prototype redessine `#contenu` à chaque `rendre()` ; si on remonte le module dans une zone neuve, il perd lecture en cours et brouillons. Et **déplacer** son nœud dans un autre
conteneur le garde en vie (état conservé) mais **ferme son calque `popover`** : le composeur ouvert disparaît (mesuré : calque fermé, feuille invisible). Masquer l'hôte (`display:none`) puis le réafficher,
lui, est sans perte (mesuré : feuille de 700×620 retrouvée, texte tapé conservé, format resté « mac »). Donc :
- `#courrier-hote` : un élément fixe, frère de `#contenu`, `position:fixed`, calé sur le rectangle de `#contenu` par un `ResizeObserver` ; `hidden` dès que la route n'est pas `boiteMail` ;
  monté UNE fois (premier passage), `demonter()` seulement au changement de rôle ou à « Réinitialiser le prototype ».
- `vueBoiteMail()` ne rend que l'en-tête de page (titre « Boîte mail » + le nombre « à traiter ») et réserve la place ; `rendre()` ne touche JAMAIS à l'hôte.
- Au-dessus des panneaux du prototype ? Non : en dessous (`#calque` du prototype, `#opdz` à 9100) ; le calque du module est dans la couche supérieure du navigateur, donc il passe au-dessus de tout : vérifier
  qu'ouvrir un panneau du prototype (fiche client, intervention) depuis un bandeau du module ne reste pas caché derrière une feuille du module (le module ferme ses feuilles avant d'appeler l'hôte).

### 2.3 La source fictive (`courrierSourceProto()`)
- `boites()` : `contact@climservices17.fr` (ok) ; `marc@climservices17.fr` (« à reconnecter ») → `messages({boite:'b2'})` REJETTE (« Marc Leblanc : le mot de passe est à saisir de nouveau ») : le module a déjà le bandeau
  « Réception indisponible pour … — Réessayer », c'est exactement l'ancienne alerte « à reconnecter » du prototype, sans rien écrire. `gererBoites()` ouvre le panneau « Boîtes connectées » EXISTANT du prototype (`mbxPanBoites` : reconnecter, ajouter en trois étapes, déconnecter) — ce que fait déjà `beta.html` avec `mailBoxesManage()`.
- `messages()` : `MAILS` du prototype (`dossier:'recu'` → inbox, `'envoye'` → sent) ; `corps` = `m.txt` ; `pj` = `m.pj` (PDF factices, `id` pour `piece()` qui rend un petit Blob PDF) ; `automatique:true` pour `m.info` ; `lu`.
  **Le prototype n'a que 8 courriels** : en ajouter 25 à 30 (clients, fournisseurs, notifications, un fil de trois messages, deux brouillons, un indésirable, un mail d'un client inconnu, une photo de chantier) — le kit `mail-essai/source.js` en contient 24 écrits (boîte fictive de « Clim Services 17 »), à reprendre.
- `capacites()` : `marquage:true`, `deplacement:true` (en mémoire), `suivi:true`, `moi:` le nom de la personne connectée (`ROLES[ROLE].qui`), `telechargerPiece:true`, `traduire:true` (réponse fictive marquée), `programmeServeur:true` (le prototype SIMULE l'envoi application fermée),
  `oauth:true`, `boutonsFournisseurs:true`, `gererBoites:true`, `signature:false` **et** `signatureMaintenance:false` + option `signer:false` (D08), `journalEnvois:false` (pas de « Envois TeamOP » : nom interne), `destinataires:5`, `pj:{nombre:5, octets:8 Mo}`.
- `suivi(id, patch)` écrit dans `MAILS` : `resolu` ⇔ `m.fait` (ou traité), `enCours` + `assigne` ⇔ `m.confie` (la tâche et la notification de l'ancien « Confier à quelqu'un » se créent ici), `aTraiter` ⇔ `mbxATraiter(m)`.
- `envoyer(mail)` : pousse un `MAILS` `dossier:'envoye'`, appelle `mbxApresEnvoi` (l'attente de réponse, la relance après deux jours ouvrés), puis `inst.rafraichir()`.
- Tout ce que le prototype fait arriver tout seul (réponse d'un client, `mbxReponseClient`) rappelle `inst.rafraichir()`. `intervalle:0` (aucun relevé automatique), `son:false`, `titreDocument:false`.
- Options de montage : `cotes:['pro']`, `cleStockage:'proto_courrier_'+ROLE` (signature, brouillons, tri appris séparés par rôle et vidés à « Réinitialiser »), `titre:'Boîte mail'` (la colonne ne s'appelle plus « OP Courrier »), `theme:() => document.documentElement.dataset.mode`.

### 2.4 Thème, mode application, rôles, appareils
- Jour/Nuit : `theme()` lit `data-mode` ; dans la copie, ajouter `data-mode` à `attributeFilter` du `MutationObserver` (1 mot) ET appeler `inst.rafraichir({donnees:false})` dans `appliquerMode()`. Sonde : bascule en direct, lecture ouverte, contraste relevé.
- Mode application (`?app=1`) et prototype nu : le MÊME hôte ; seul l'échafaudage de revue diffère.
- Rôles : visible pour le gérant et le bureau (`rlPermis('boiteMail')`) ; absent du menu du technicien et du client ; `#boiteMail` tapé à la main le ramène chez lui.
- Hauteur : l'hôte prend toute la hauteur utile de `#contenu` ; **mesurer à 1280×720 et 1366×768** : voir D09 (le pied de la colonne Boîtes dépasse).
- Téléphone : la barre du bas FIXE du module (§ 1.6) entre en collision avec la barre d'onglets d'OP GESTION (5 onglets + bouton « Menu »). Décision : dans la copie, option `barreBasse:'hote'` → la barre du module devient `position:absolute` DANS l'hôte, et l'hôte s'arrête au-dessus de la barre d'onglets (`--tabh` + encoche). Sonde : à 320, 360, 390 px avec encoches posées, aucun chevauchement, rien de coupé.
- Menu de l'hôte (258 px) + colonne Boîtes du module (220-244 px) : deux menus côte à côte au-dessus de 1000 px. Conserver la colonne du module (c'est elle qui porte dossiers, suivi et boîtes) mais lui donner 208 px et la replier à ≤ 1180 px de zone (déjà « étroit » : 220 px) ; titre de liste « Boîte de réception » tronqué à 1022 px (D16).

## 3. Les points d'extension à ajouter dans la copie (`opt.hote`)
Tous facultatifs ; sans `opt.hote`, le module se comporte exactement comme aujourd'hui (c'est ce qui permettra de les reporter dans le vrai module sans rien changer pour OP MESSAGES).
Les numéros de ligne sont ceux d'`opcourrier.js` du 16 novembre.

| n° | point | où (ligne) | ce qu'il fait |
|---|---|---|---|
| H1 | `opt.hote.lecture(m, ctx)` → `{ bandeau:html, actions:[{id,lib,primaire}] }` | `renderReading`, après la ligne de catégorie (`catLine+=suiviHtml(m)`, l. 2471) et avant le corps (l. 2481) | le bandeau « OP GESTION a reconnu : demande d'intervention · Hôtel Bernard » + ses boutons (Créer l'intervention · Proposer un créneau…). Le HTML est ÉCHAPPÉ côté hôte ; chaque bouton porte `data-hote="<id>"`. |
| H2 | `opt.hote.agir(id, m)` | écouteur de clic du panneau de lecture (là où `data-quick` est géré, l. 4152) | le module ferme ses feuilles, rend la main à l'hôte ; l'hôte ouvre SA fenêtre (nouvelle intervention préremplie…). |
| H3 | `opt.hote.pastille(m)` → `{texte, ton}` | ligne de liste, à côté de `suiviChip(m)` (l. 2294) | « Client », « Fournisseur », « Nouveau contact » (et, par `ton`, l'urgence). |
| H4 | `opt.hote.reponses(m)` → `[{lib, texte}]` | remplace les 4 phrases fixes (l. 2452, aujourd'hui sans apostrophe typographique) | les modèles par sujet de l'ancien écran (10), avec nom, trois créneaux libres, signature ; corrige D02 au même endroit. |
| H5 | `opt.hote.dossiersEnPlus` ou mappage `suivi` | `FOLDERS` (l. 1694) | inutile si `suivi` couvre « À traiter » : à ne PAS ajouter. |
| H6 | `opt.hote.avantEnvoi(mail)` → `true` ou `{refus}` ; `opt.hote.apresEnvoi(mail)` | `fields()`/envoi du composeur (autour de l. 3440) | objet vide → question ; trace dans l'Historique ; attente de réponse et relance. |
| H7 | API `inst.ouvrir(idMessage)` · `inst.rechercher(texte)` · `inst.etat()` | fin de `creer()` (l. 4222) | liens `boiteMail\|id` des tâches, de l'Accueil, de l'Historique, de la fiche client (« Ses courriels » = `rechercher(adresse)`) ; `etat()` = `{selection, dossier, nbNonLus}`. |
| H8 | options `signer:false`, `libelles:{…}`, `barreBasse:'hote'`, `programmer:'serveur'` | composeur (l. 3344), colonne (l. 1443), CSS phone (l. 1158-1418), panneau d'envoi programmé (l. 3510) | retire « Faire signer · en maintenance » (D08), dit les mots de l'artisan (D09), évite la double barre au téléphone, supprime l'avertissement « application fermée » quand la source programme côté serveur (D13). |
| H9 | `data-mode` dans l'observateur de thème | l. 1567 | Jour/Nuit du prototype. |

## 4. Les défauts à corriger (tous reproduits ; ID = ceux de `mail-essai/defauts.js`)
Gravité : **G** = grave (perd du texte, ment, bloque), **M** = moyenne (gêne ou fait douter), **P** = petite.

| ID | gr. | défaut — comment le voir — où |
|---|---|---|
| **D01** | G | **Taper « r » pour répondre écrit un « r » dans le message.** Ouvrir un mail, appuyer sur r : la fenêtre s'ouvre, le texte commence par « r » (`"r\n\n-- \nMarc Leblanc"`) ; si on ferme avec Échap, un FAUX brouillon est enregistré (« Brouillon enregistré »). Cause : `e.key==="r"` (l. 4187) ne fait pas `preventDefault()` alors que `c` (l. 4186) le fait ; la touche est reçue par le champ que `openCompose` vient de focaliser. |
| **D02** | G | **Une réponse rapide est collée APRÈS la signature, sans saut de ligne.** Ouvrir un mail, toucher « Je reviens vers vous rapidement » : le corps vaut `"\n\n-- \nMarc LeblancJe reviens vers vous rapidement"`, curseur tout en haut, aucune citation. Cause : `openCompose` fait `body0 = signature + model.body` (l. 3338) et le clic rapide passe la phrase dans `body` (l. 4152). Le client lirait « Marc LeblancJe reviens… ». |
| **D03** | G (compréhension) | **Les catégories n'ont pas de mot, et elles font disparaître du courrier important.** Les cinq pastilles sous « Tous / Non lus / Marqués » (cloche, reçu, avion, étiquette, pile) n'affichent leur mot que pour la catégorie active (`<span class="cl sr">`) : un artisan ne sait pas ce qu'est « la cloche ». Et le tri automatique range une FACTURE de fournisseur dans « Reçus » : « Principal 8 » ne la contient pas, la facture n'est jamais vue (mesuré : « Facture FA-CDA-10-552 » absente de Principal). `renderCats` l. 2225 ; moteur de tri l. 70-272. |
| **D04** | G (compréhension) | **Des nombres différents pour la même boîte.** Une seule boîte : « Boîte de réception 11 non lus », « Principal 9 », « À traiter 14 », en-tête « 14 messages, 9 non lus », pastille de l'hôte 16 (`compter()` l. 1899 : non lus + à traiter, un message une fois). Aucun ne dit ce qu'il compte. Pendant une recherche vide : « aucun message, 11 non lus ». |
| **D05** | G (compréhension) | **Le bouton « Envoyer » n'a pas de mot sur ordinateur** : seule une icône d'avion dans un coin de la fenêtre ; « Annuler » et « Enregistrer le brouillon » ont des mots, pas l'action principale. CSS l. 992 (`.send-btn .lbl{display:none}` en `data-fmt=mac`). |
| **D06** | M | **« Dans 1 minute · pour tester »** est un choix de production de l'envoi programmé (l. 3514) : reste de développement. |
| **D07** | M | **Un refus s'affiche avec la coche verte de la réussite** : « ✓ Adresse du destinataire invalide », « ✓ Ajoutez un destinataire » (même icône que « Message envoyé »). Le champ fautif n'est pas marqué. `toast()` l. 4001, l. 3440. |
| **D08** | M | **« Faire signer · en maintenance » dans chaque nouveau message et chaque réponse**, même sans pièce jointe : un bouton grisé qui parle de maintenance à un plombier (l. 3344, `CAP.signatureMaintenance`). Dans la lecture, le même bouton sur un PDF reçu. |
| **D09** | M (compréhension) | **Le vocabulaire n'est pas celui de l'artisan.** Colonne nommée « OP Courrier » (la rubrique s'appelle « Boîte mail »), « Boîtes aux lettres » (accueil téléphone), « Envois TeamOP » (nom interne), « Signatures », « Programmés », « Marqués », « Pourquoi ici ? », « Déplacer vers… », « Ranger dans… », « Indésirables » ; le texte de « Pourquoi ici ? » finit par « Bientôt : vérification de l'authenticité des expéditeurs (SPF, DKIM, DMARC) » (l. 2470). Trois entrées pour la même chose : « Ajouter une boîte mail » (colonne), « Ajouter une boîte mail » (liste vide), « Ajouter un compte » (pied) ; et « Gérer les boîtes » / « Comptes pro ». |
| **D10** | M | **Répondre s'intitule « Nouveau message »** (l. 3338 : le titre ne connaît que nouveau / brouillon / programmé). |
| **D11** | M | **Le menu du clic droit sort de l'écran** : clic droit sur la 2ᵉ ligne d'une fenêtre de 768 px, « Sélectionner plusieurs… » finit à y = 790 (fenêtre 768), coupé (Windows). Menu contextuel l. 2844-2957 : pas de repositionnement vers le haut. |
| **D12** | M | **On peut répondre à un indésirable** : dans « Indésirables », Répondre / Répondre à tous / Transférer restent actifs (l. 2372-2377 ne désactive que les réponses rapides). La règle écrite dans le module — « on ne répond pas à une arnaque d'un clic » — n'est pas tenue par la barre. |
| **D13** | M | **Un message programmé ne part que si la page reste ouverte** (la source ne sait pas le faire fermée) : l'avertissement est une ligne grise de 12 px sous le bouton « Programmer » (l. 3510). Un artisan programme « demain 8 h », ferme son téléphone : rien ne part. Solution produit (`programmeServeur` côté source) ou avertissement en TÊTE, en mots simples. Dans le prototype la source le simule. |
| **D14** | M | **Boîte de 1 500 courriels : 1 514 lignes dans la page (48 885 nœuds) et 0,5 à 0,8 s à chaque clic sur un message** — la liste entière est redessinée à chaque sélection (`renderList` l. 2278, `innerHTML` de toutes les lignes). Pas de pagination ni de virtualisation. Hors prototype (30 courriels), mais c'est la boîte réelle de toute entreprise d'un an. |
| **D15** | M | **Texte petit sur ordinateur** comparé aux écrans validés (16 px de base) : expéditeur/objet/aperçu 13 px, date 12 px, pastilles 11 px, segmenté Suivi 12 px, corps 14 px ; sur iPhone 15-17 px (bon). Mesuré `getComputedStyle`. |
| **D16** | P | Série de petits défauts : état « Réception indisponible » qui garde « aucun message » en sous-titre et toute l'interface active (dossiers, Signatures…) ; « Marquer comme non lu » désélectionne le message ; objet « Re: Re: Re: Rendez-vous du 12 » jamais nettoyé dans l'en-tête de lecture ; transfert : l'entête du message transféré est « Le … a écrit : > » au lieu d'un « Message transféré » ; dates qui mélangent « Samedi », « Hier », « 08/11/26 » ; points de couleur d'une boîte, sans légende, à côté de l'heure ; apostrophes droites dans les réponses rapides ; titre de liste « Boîte de récep… » tronqué à 1022 px de zone ; un seul destinataire par message côté serveur d'aujourd'hui (`destinataires:1` → « Bientôt : plusieurs destinataires ») ; pied de colonne (« Ajouter un compte », « Réglages ») sous le pli à 1280×720 (la colonne défile, rien ne l'indique : mesuré `scrollHeight 699 > 620`). |

Défauts que j'ai cherchés et NON trouvés (pour ne pas les « corriger ») : cibles tactiles sous 44 px au téléphone (0 en lecture ; les 40 px vus pendant l'ouverture d'une feuille sont l'effet de recul de la page, pas la mesure) ; débordement horizontal à 320 px (`scrollWidth 320`) ; erreurs JavaScript (0 sur 11 parcours) ; perte du message ouvert à l'arrivée d'un mail ; envoi annulable (marche) ; « Annuler » d'un message vierge (n'enregistre rien) ; mode nuit (contrastes bons sur les captures regardées).

## 5. Les améliorations : ce que l'écran du prototype savait faire et que le module ne fait pas (à GREFFER, pas à perdre)
Tout vient de `mlLire/mlReconnu/mlActions` (l. 9664-9727) et du bloc `MBX` (l. 16422-16900). Chaque ligne dit où elle se branche.

| n° | ce que ça fait | où dans le module |
|---|---|---|
| A1 | **Reconnaître qui écrit** : une adresse connue → client ou fournisseur ; sinon « Nouveau contact » (`mlLire`, `mbxCliDe`) | pastille de ligne (H3) + ligne de lecture |
| A2 | **Reconnaître de quoi ça parle** : panne, demande de devis, accord sur un devis, commande expédiée, facture fournisseur, paiement annoncé, choix de créneau, simple info, message de client/de fournisseur, « à trier » — par numéros de documents lus dans le texte (BC-…, FAC-…, D-…), jamais deviné | bandeau de lecture (H1) |
| A3 | **Les liens vers le reste** : fiche client, fournisseur, commande, facture, devis, avec les chiffres utiles (HT attendu d'après la commande, date de livraison actuelle, reste dû) | bandeau (H1) → `agir` (H2) |
| A4 | **Les gestes préremplis** : Créer l'intervention (client, titre, motif tirés du mail) puis « Prévenir le client » ; Proposer un créneau (trois créneaux libres lus dans le planning et les absences) ; Créer le client ET son devis ; Préparer un devis (lignes par métier, surface lue) ; Noter l'accord du devis → Planifier l'installation ; Mettre à jour la livraison ; Rapprocher la facture fournisseur et la ranger dans les achats (comparée ligne à ligne, écart, avoir) ; Noter le paiement annoncé / Encaisser | boutons du bandeau (H1/H2) |
| A5 | **Modèles de réponse par sujet** (10 : accusé, créneaux, devis annoncé, question, confirmation, merci, bien reçu, avoir, commande, relance), avec le prénom, la signature, les créneaux | réponses rapides (H4) |
| A6 | **« Répondu » et relance** : un courriel attend la réponse ; après deux jours ouvrés il remonte avec « Relancer » (modèle de relance) | `apresEnvoi` (H6) + suivi `aTraiter` rendu par la source |
| A7 | **« Confier à quelqu'un »** : la personne reçoit une tâche et une notification ; sans accès à la boîte elle reçoit CE courriel seul en lecture | `suivi({assigne})` côté source + `agir` |
| A8 | **« En faire une tâche »** et « C'est un client / un fournisseur » / « Pas important » / « Toujours ranger ici » | `agir` ; le tri « Toujours ranger les mails de X ici » existe déjà dans « Déplacer vers… » |
| A9 | **Ranger une pièce jointe dans le dossier du client** ; **photos du mail → fiche de l'intervention** | bouton sur la pièce (H1 : `actions` par pièce) |
| A10 | **Tous les courriels d'un client** (filtre par client, fiche client « Ses courriels ») | `inst.rechercher(adresse)` (H7) |
| A11 | **Les liens depuis le reste** : tâche « Répondre : … », Accueil « à faire », Historique, notifications → ouvrent CE mail (`boiteMail\|id`, `mlSel`) | `inst.ouvrir(id)` (H7) |
| A12 | **Virements annoncés, pas encore reçus** (bloc de la Comptabilité), relances de paiement | indépendant : lit `MAILS`/`FACTURES` ; reste dans la Comptabilité |
| A13 | **Chaque geste laisse une trace (Historique) et se défait par « Annuler »** | `apresEnvoi`/`agir` ; le module a déjà « Annuler l'envoi » |
| A14 | **Le compteur « à traiter »** sur l'Accueil et dans le menu | `onCompter(n)` donne déjà un nombre ; l'hôte garde `mbxATraiter` pour l'Accueil |

Améliorations de SIMPLICITÉ à faire dans la copie (en plus des défauts) : catégories en TEXTE (« Clients et courriers », « Factures et reçus », « Notifications », « Voyages », « Promotions ») ou, mieux, **par défaut seulement « Principal / Tout »**
avec un bandeau « 3 mails rangés ailleurs · Voir » ; trois compteurs réduits à UN (« 9 à lire ») ; « Envoyer » en toutes lettres ; une seule entrée « Ajouter une boîte mail » ; « Pourquoi ici ? » → « Pourquoi ce rangement ? » sans sigle ; menu du clic droit raccourci à six gestes.

## 6. Ce qui disparaît de l'ancien écran du prototype
- Écran : `vueBoiteMail` (les DEUX définitions, l. 9735 et 16634), `mlListe`, `mlLecture`, `mlReconnu` (rendu), `mbxAjuste`, la barre de filtres (À traiter · Reçus · Clients · Fournisseurs · Envoyés — remplacée par Boîte de réception + Suivi « À traiter » + recherche), le composeur maison (`mlRepondre`, panneau de réponse), le panneau « Boîtes connectées » comme écran de rubrique (il reste, appelé par « Gérer les boîtes »).
- CSS : `.ml-*`, `.ms-*` propres à l'écran, `.mbx-liste`/`.mbx-app` ; la visite parlée (`tourPartie('boiteMail'…)`, `immChap('boiteMail'…)` l. 12869 et 20829-20850) est RÉÉCRITE sur le nouvel écran (mêmes trois histoires : une panne, une facture fournisseur, un inconnu qui demande un devis), elle cite maintenant `.ml-liste`, `[data-ml="ouvrir|m1"]`…
- CONSERVÉ comme logique (sans écran) : `mlLire`, `mlCreneaux`, `mbx*` (relance, montants, créneaux, modèles, rapprochement), `MAILS`, les gestes `data-ml`/`data-mbx` qui ouvrent les fenêtres du prototype : ils deviennent les cibles de `agir`.
- Les sondes qui nomment la route (`menu-commun.js`, `menu-echafaudage.js`, `menu-renommages.js`) doivent seulement retrouver « Boîte mail » : relancer les trois.

## 7. Les sondes à écrire (kit d'essai déjà posé : `scratchpad/proto-final/refonte/mail-essai/`)
Le kit : `essai.html` (hôte d'essai, menu d'hôte simulé `?marge=258`), `source.js` (24 courriels fictifs, deux boîtes, pannes jouables : `src={panne:1}`, `{panneMsg:1}`, `{vide:1}`, `{gros:1500}`, `{dest:1}`),
`h.js` (serveur local + profils mac, mac720, windows, ipad, iphone, android, petit), **`defauts.js`** (rejoue D01-D07, D10-D12, D14 ; `MODULE=apercu/prototype-courrier.js` l'essaie sur la copie ; aujourd'hui : 0 ✓ 11 ✗).
Commande : `CAP=<dossier hors dépôt> timeout 280 node scratchpad/proto-final/refonte/mail-essai/defauts.js`.

| sonde (dans `scratchpad/proto-final/sondes/`) | ce qu'elle prouve |
|---|---|
| `courrier-defauts.js` | adaptation de `defauts.js` à la copie MONTÉE dans le prototype : 0 ✗ ; plus D08, D09, D13, D15, D16 |
| `courrier-montage.js` | six profils × jour/nuit : la rubrique s'ouvre, 0 erreur JavaScript, hôte plein cadre, rien ne dépasse (mesure contre la largeur POSÉE du profil), captures REGARDÉES |
| `courrier-persistance.js` | cinq `rendre()` avec un composeur ouvert : texte et feuille conservés ; aller à Clients et revenir : lecture et brouillon conservés ; changement de rôle : module démonté, clé de stockage propre ; « Réinitialiser » : tout vidé |
| `courrier-reconnaissance.js` | pour CHACUN des 8 sujets de l'ancien écran : la pastille, le bandeau, les liens et le geste donnent le même résultat qu'avant (intervention créée avec le bon client, trois créneaux libres identiques à `mlCreneaux`, rapprochement avec le même écart, accord noté…) ; compteurs « à traiter » égaux à `mbxATraiter` |
| `courrier-telephone.js` | à 320 / 360 / 390 px, encoches posées : la barre du module ne chevauche pas celle d'OP GESTION, le composeur tient au-dessus du clavier simulé, cibles ≥ 44 px, appui long = menu |
| `courrier-theme.js` | bascule Jour/Nuit/Auto en direct, lecture ouverte ; contraste mesuré AU PIXEL sous le verre (voir CLAUDE.md : le calcul ment) |
| `courrier-liens.js` | depuis une tâche, l'Accueil, l'Historique, la fiche client : `ouvrir(id)` / `rechercher(adresse)` ouvrent le bon mail, y compris module pas encore monté (file d'attente) |
| `courrier-roles.js` | gérant et bureau : voient la rubrique ; technicien et client : non, et `#boiteMail` les ramène chez eux ; `moi` = le bon nom |
| `courrier-perf.js` | 30 puis 1 500 courriels : clic sur un message < 150 ms (D14 : si on ne corrige pas D14 dans le prototype, la sonde le DIT) |
Mutations : au moins 12 (retirer `preventDefault` de `r` ; remettre `signature+body` ; rendre `opt.hote` ignoré ; `agir` qui n'appelle pas l'hôte ; thème sans `data-mode` ; hôte remonté à chaque `rendre()` ; barre du bas redevenue fixe…). Chaque mutation doit faire tomber au moins un ✗.
Garde-fous du dépôt : `node --check apercu/prototype-courrier.js` ; `node tests/test-2994.js` et `node tests/test-3248.js` restent verts (production inchangée) ; `node tests/test-1008.js` ; `git diff opcourrier.js server-msg/` vide.
Règles de mesure (CLAUDE.md) à respecter : population comptée avant tout zéro, deux `requestAnimationFrame` + lecture forcée avant une largeur, animations réduites pour les gestes, un navigateur à la fois avec délai, aucun processus laissé.

## 8. Ce que je n'ai PAS pu vérifier (à dire, pas à supposer)
- Safari / iOS réels : j'ai émulé iPhone et iPad dans Chromium (viewport, toucher, encoches par `setSafeAreaInsetsOverride`). Le calque `popover="manual"`, le clavier virtuel, le sélecteur de date (le mien s'affiche « 11/17/2026 09:00 AM » : réglage du navigateur de test, pas du module), le glissement latéral d'une ligne (« swipe »), l'appui long : non rejoués au doigt réel. Windows et Android = agent utilisateur + taille d'écran, moteur Chromium.
- Notifications du système, son des nouveaux mails, envoi réel, OAuth Google/Microsoft, IMAP, signature réelle (Yousign) : hors d'atteinte (source fictive, réseau coupé).
- Le comportement avec de VRAIES boîtes (« jamais essayé avec une vraie boîte en production », `REPRISE.md` 19 octobre) ; le tri automatique n'a été jugé que sur 24 courriels fictifs (le classement des « Reçus » et « Promotions » m'a paru juste ; la facture de fournisseur en « Reçus » est un choix du moteur, pas une panne, mais D03 dit pourquoi il gêne).
- Je n'ai pas lancé la suite complète (aucun fichier du dépôt n'a changé) ; les bancs `test-2994`, `test-3248` n'ont pas été relancés pour la même raison.

## 9. Ce qu'il faudra reporter dans le VRAI module (sur une phrase de Justin, jamais avant)
1. Les correctifs D01, D02, D05, D06, D07, D10, D11, D12 (+ D04, D09, D15, D16 selon décision) dans `opcourrier.js`, **puis** régénération des deux copies (`apercu/`, `server-msg/public/`) : `test-2994` l'exige. ⛔ Publier `server-msg/` redéploie OP MESSAGES : à coordonner (ou à découpler : le module d'OP MESSAGES n'a pas à bouger pour un correctif de l'hôte).
2. Les points d'extension H1-H9, tous facultatifs (sans `opt.hote` le comportement ne change pas, un banc le prouve : octet pour octet de la page rendue avec et sans).
3. `beta.html` d'abord (`courrierVue` : `theme`, `titre`, `signer:false`, `hote`), `app.html` ensuite — chaque publication sur sa phrase ; règle de la bêta : tout se joue de bout en bout SUR la bêta (vraie boîte par le jeton d'accès).
4. D14 (liste de 1 500 courriels : pagination ou lignes réutilisées) mérite son propre chantier : il touche toutes les entreprises à l'usage, pas le prototype.
5. D13 : un vrai envoi programmé côté serveur (étape « plus tard » de `REPRISE.md`) ; d'ici là, avertissement en tête.
6. Reconnaissance (A1-A4) : la version « vraie » lira l'annuaire clients du serveur ; le prototype lit ses données fictives. Les règles (« une adresse connue, un numéro de document écrit dans le message, jamais deviné ») sont à garder telles quelles.

## 10. Ordre de travail proposé
1. Copie + montage nu (hôte persistant, source fictive, thème, mode application) — sondes `montage` et `persistance` vertes.
2. Les 16 défauts dans la copie — `courrier-defauts.js` à 0 ✗, `defauts.js` (MODULE=copie) à 0 ✗.
3. Points d'extension + bandeau « reconnu » + gestes (A1-A5) — sonde `reconnaissance` à égalité avec l'ancien écran.
4. Suivi/confier/relance/liens (A6-A11), téléphone et thème — sondes `telephone`, `theme`, `liens`, `roles`.
5. Retrait de l'ancien écran, réécriture de la visite parlée, relance des sondes de menu, mutations, captures regardées sur les six profils jour et nuit, puis le résumé à Justin (« voilà la boîte mail d'avant, corrigée, avec ce que l'ancien écran savait faire »).
