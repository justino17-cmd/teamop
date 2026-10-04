# Handoff : TEAM OP — site vitrine + application OP GESTION (style Apple)

## Vue d'ensemble
Refonte de **teamop.fr** (site vitrine) et de l'application **OP GESTION** (console métier terrain : interventions, box/stock, clients, devis, factures…) dans un langage visuel Apple : typographie système SF, surfaces neutres, coins très arrondis, verre (Liquid Glass) uniquement là où la plateforme le supporte.

Trois livrables, chacun en **Jour / Nuit / Auto (suit le système)** :
1. **Site vitrine — Apple bleu** (`sources/TeamOp Site.dc.html`)
2. **Site vitrine — Marine** (`sources/TeamOp Site Marine.dc.html`) : même structure et contenu, palette tirée du nouveau logo TEAM OP
3. **Application OP GESTION** (`sources/OP Gestion App.dc.html`) : une seule base qui rend **10 plateformes**

## À propos des fichiers
Les fichiers de `sources/` sont des **références de design écrites en HTML** (prototypes montrant l'aspect et le comportement voulus), pas du code de production à copier. La tâche est de **recréer ces écrans dans l'environnement du dépôt cible** (`justino17-cmd/teamop` : HTML/JS vanilla, PWA — `app.html`, `beta.html`, `index.html`, `tarifs.html`) avec ses patterns existants. Le contenu métier (catégories, statuts, formules tarifaires) vient du dépôt et du site actuels ; les données affichées (clients, montants, noms) sont des exemples.

Les fichiers de `builds/` sont **36 versions autonomes** (une par thème × plateforme), ouvrables directement dans un navigateur sans outillage, pour visualiser chaque rendu. Chaque build force ses paramètres via l'URL.

## Fidélité
**Haute fidélité (hifi)** — couleurs, typographie, espacements, rayons et interactions sont définitifs. Recréer au pixel avec les conventions du code cible.

## Paramètres d'URL (prototypes et builds)
- `mode=light|dark|auto` — thème (les trois fichiers)
- `plat=ios27|ios18|iosweb|android|androidweb|macos27|macos14|macweb|windows|winweb` — plateforme (app)
- `skipLogin=1` — démarrer connecté (app) ; `capture=1` — masque la feuille « Créer » (pour captures)

---

# 1. Application OP GESTION

## Plateformes et règles de rendu
| Clé | Plateforme | Verre | Chrome spécifique | Typo |
|---|---|---|---|---|
| ios27 | iPhone iOS 27 | oui | barre d'outils flottante en pilule, barre d'onglets flottante (radius 34 px, bottom 26 px) | SF Pro |
| ios18 | iPhone iOS 18 | non | surfaces pleines, barre d'onglets classique collée en bas | SF Pro |
| iosweb | iPhone Safari 27 | oui | pilule d'adresse Safari (teamop.fr) **au-dessus** des onglets (bottom 96 px) | SF Pro |
| android | Android Material 3 | non | status bar 38 px, onglets avec pastille tonale 56×30 px autour de l'icône, radius 28 px | Roboto |
| androidweb | Android Chrome | non | barre d'adresse Chrome en haut (⋮), onglets plats | Roboto |
| macos27 | macOS 27 natif | oui | fenêtre 1120×760, feux tricolores, sidebar 236 px | SF Pro |
| macos14 | macOS 14 natif | non | fenêtre pleine, sidebar #f2f2f5 / #1c1c1e | SF Pro |
| macweb | Mac Safari 27 | oui | onglet navigateur + barre d'adresse | SF Pro |
| windows | Windows 11 Fluent | non | barre de titre 38 px, ─ ▢ ✕, radius 8 px, boutons 6 px | Segoe UI Variable |
| winweb | Windows Edge | non | onglet + barre d'adresse, coins 7 px | Segoe UI Variable |

**Règle** : verre uniquement si `glass:true`. Sans verre : cartes pleines, aucun `backdrop-filter`, ombres réduites, pas d'orbes de fond.

### Verre (Liquid Glass)
- `backdrop-filter: blur(40px) saturate(210%) brightness(1.06)`
- Surface jour `rgba(255,255,255,.58)`, secondaire `rgba(255,255,255,.44)` ; nuit `rgba(44,44,46,.55)`, secondaire `rgba(255,255,255,.08)`
- Liseré `.5px solid rgba(255,255,255,.72)` (jour) / `rgba(255,255,255,.18)` (nuit)
- Reflet interne `inset 0 1px 0 rgba(255,255,255,.85)` (jour) / `.14` (nuit)
- Ombre carte `0 10px 28px rgba(0,0,0,.08)` (jour) / `.45` (nuit) ; barres `0 14px 36px rgba(0,0,0,.14)` / `.55`
- Fond : trois orbes floutés (blur 28–34 px, 260–320 px) animés lentement (14–19 s, alternate) dans la teinte de l'app, sur dégradé `#f7f7f9→#eeeef2` (jour) / `#0a0a0c→#000` (nuit)
- Respecter `prefers-reduced-transparency` (désactiver le blur) et `prefers-reduced-motion`

### Couleur d'accent (réglage utilisateur)
Paramètres › **Couleur de l'app** : 8 teintes. La teinte colore : bouton « + Créer », élément de menu actif, bouton d'action principal, bulle messagerie flottante, halo des tuiles, orbes. Défaut **vert** : jour `#1f7a5c`, nuit `#4fd18a`. Texte sur accent `#fff` (teintes claires → `#0b1426`).
Chaque catégorie a aussi une couleur fixe (icône sur tuile) — palette iOS : bleu `#007aff`, vert `#34c759`, orange `#ff9500`, rouge `#ff3b30`, violet `#af52de`, indigo `#5856d6`, teal `#30b0c7`, rose `#ff2d55`, gris `#8e8e93`.

### Tokens communs
- Texte `#000` / `#fff` ; secondaire `rgba(60,60,67,.6)` / `rgba(235,235,245,.6)` ; ténu `.3`
- Statuts : ok `#34c759` (fond `rgba(52,199,89,.16)`, texte `#1c7a3a`) · planifié `#007aff` (fond `.14`, texte `#0a5fc2`) · alerte `#ff9500` (texte `#8a5300`) · erreur `#ff3b30` (texte `#a81f16`)
- Rayons : cartes 26 px (verre) / 18 px (iOS 18, macOS 14) / 28 px (Android) / 8 px (Windows) ; boutons pilule 999 px (6 px Windows) ; feuille modale 34 px haut (mobile) / 22 px (bureau)
- Typo : titre écran 32 px/1.06, -0.032em, 700 · titre fiche 28 px/1.1, -0.028em · titre section 18–20 px 700 · corps 15–16 px · méta 14 px · libellé onglet 10 px (11,5 px Android) · identifiants (BX-012, N°105348, TP18) en `ui-monospace, 'SF Mono', Menlo`
- Cibles tactiles ≥ 44 px ; lignes de liste ≥ 64 px ; easing standard `cubic-bezier(.32,.72,0,1)`

### Écrans
**Connexion** (plein écran, au-dessus de tout le chrome, y compris sidebar bureau) — logo 84 px radius 20, « OP GESTION », pastille « ✓ ELAN GESTION · lien vérifié » (l'entreprise vient du **lien d'invitation**, il n'y a pas de champ Entreprise), carte verre Identifiant / Mot de passe, bouton accent « Se connecter », lien « Mot de passe oublié ? ». Étape 2 « Première connexion » : Nouveau / Confirmer / E-mail → « Enregistrer et entrer » → fondu (opacity + scale 1.04, .45–.55 s) vers le tableau de bord + toast « Bienvenue, Marc ». Bureau : colonne centrée 380 px.

**Tableau de bord** — titre + « Vue d'ensemble ELAN GESTION », bouton verre « Personnaliser » ; tuiles (2 colonnes mobile / 5 bureau) : Interventions, Boxes, Enveloppes, Bons à envoyer, Véhicules (icône 44 px sur tuile colorée 14 px, valeur 32 px 700, libellé 14 px) ; carte « Tout est en ordre — stocks OK, aucune demande ni bon en attente ».

**Listes (25 catégories, même gabarit)** — titre + sous-titre + bouton accent (CTA contextuel), recherche en pilule verre, filtres segmentés 3 positions (curseur animé .42 s), carte liste (lignes : badge 40 px mono ou initiales, titre 16/600, méta 14 avec point de statut 7 px, valeur droite 13 px tabulaire, chevron), note 13 px. Catégories : Tableau de bord, Interventions, Planning, Clients, Devis, Factures, Enveloppes, Bons de commande, Fournisseurs, Boxes, Produits, Mouvements, Demandes, Véhicules, Techniciens/Équipe, Contrats, Plans de site, Dossier sanitaire, Registre biocide, Rapports, Messagerie interne, Historique, Utilisateurs, Permissions, Paramètres.

**Fiches** — *Box BX-012* : retour mono, éditer/supprimer, titre en accent, boutons Scanner (accent) / Arrivage (orange `#ff9500`) / Partager le stock / Relevé (verre), carte clé-valeur, produits avec quantités bicolores (ctn bleu, u accent) et badge fournisseur. *Intervention N°105348* : statut en pilule, 4 onglets Général/Plans/Fichiers/Actions, sections « Important / Sur place / Éléments clés » en cartes à en-tête teinté. *Client* : Appeler (accent) / SMS / E-mail, coordonnées, interventions, documents.

**Paramètres** — Entreprise, Utilisateurs & rôles, Permissions, Synchronisation, Notifications, **Couleur de l'app** (8 pastilles), **Barre d'onglets** (choisir 4 catégories + ordre ; aussi accessible par appui long sur la barre), Se déconnecter (rouge).

**Flux « + Créer »** — feuille montante (mobile : translateY 104 % → 0, .5 s) / fenêtre centrée 520 px (bureau) : grille 3×2 Intervention, Client, Devis, Facture, Demande, Box → formulaire clé-valeur → bouton contextuel (Planifier / Enregistrer / Générer le PDF / Générer / Envoyer au DR / Créer la box) → toast 2,4 s.

**Navigation** — mobile : tiroir gauche 300 px en verre (.48 s) avec toutes les catégories + badges, barre d'onglets 4 catégories personnalisable ; bureau : sidebar permanente 236 px, icônes 16 px sur tuiles 26 px colorées. Bouton flottant messagerie 56 px (accent). Scrim `rgba(0,0,0,.35)`.

### État
`view`, `mode` (light/dark/auto + écoute `prefers-color-scheme`), `plat`, `accent`, `tabs[4]`, `login` (form/pwd/done), `create` (null/menu/type), `filter`, `menu`, `toast`. Persister `accent` et `tabs` par utilisateur.

---

# 2. Site vitrine

Fluide (max-width 1024 px, gouttières 22 px). Nav 48 px collante en verre léger (`saturate(180%) blur(20px)`) avec sélecteur Jour / Nuit / Auto (150 px, curseur animé .4 s). Sections : Hero (titre clamp 44–80 px, -0.03em, 700 ; sous-titre 19–26 px ; CTA pilule + lien « › ») → vitrine appareils (Mac + iPhone avec captures réelles, dans un cadre 28 px) → « Deux applications. Un seul compte. » (OP GESTION carte claire / OP MESSAGES carte sombre) → Métiers (8 cartes radius 20) → Tarifs (bascule OP GESTION / OP MESSAGES ; carte « Business » mise en avant inversée) → « Né sur le terrain » → « Prêt en trois étapes » (carte sombre) → FAQ accordéon (+ qui tourne 45°) → pied de page.

### Tarifs (source `tarifs.html`)
OP GESTION : Gratuit 0 € (1 utilisateur) · Pro 15 € (1) · Business 25 € (2, « Le plus choisi ») · Business Premium 50 € (3). OP MESSAGES : Perso 0 € · Messages Pro 15 € (1) · Messages Business Premium 25 € (3). Prix HT/mois, sans engagement ; les abonnements s'additionnent. Grille 4 → 2 → 1 colonnes (900 px, 560 px).

### Palette Apple bleu
Jour : fond `#fff`, texte `#1d1d1f`, secondaire `#6e6e73`, corps `#424245`, lien `#0066cc`, cartes `#f5f5f7`, tuile `#fff`, ligne `rgba(0,0,0,.1)`, bouton `#0071e3`.
Nuit : fond `#000`, texte `#f5f5f7`, secondaire `#a1a1a6`, corps `#d2d2d7`, lien `#2997ff`, cartes `#1d1d1f`, tuile `#2c2c2e`, ligne `rgba(255,255,255,.14)`.

### Palette Marine (du logo `assets/teamop-logo-marine.png`)
Jour : fond `#fff`, texte `#0b1426`, secondaire `#6b7688`, corps `#3a4557`, lien `#1e3a8a`, cartes `#f0f3f8`, accent `#0b1426` (texte `#f0f3f8`).
Nuit : fond `#0b1426`, texte `#f0f3f8`, secondaire `#8e9aae`, corps `#c5cddb`, lien `#7fb2ff`, cartes `#121d33`, tuile `#1a2640`, accent `#f0f3f8` (texte `#0b1426`). Carte « Business » inversée selon le mode.

### Typo site
`-apple-system, BlinkMacSystemFont, 'SF Pro Display'` titres · `'SF Pro Text'` corps · H2 clamp 32–48 px, -0.025em, 700 · corps 17 px/1.55 · nav 12 px.

---

## Assets (`assets/`)
- `opgestion-512.png`, `teamop-512.png`, `opmsg-512.png` — icônes du dépôt teamop (`icons/`)
- `teamop-logo-marine.png` — nouveau logo TEAM OP fourni par le client (source de la palette Marine)
- `ecran-1-tableau.png`, `ecran-2-box.png`, `ecran-3-intervention.png` — captures réelles de l'app (dépôt `screenshots/`)
- `ecran-mac-tableau.png` — capture de la maquette macOS 27 (à remplacer par une vraie capture PC)

## Fichiers
- `builds/teamop-site-marine-web.html` — site vitrine final (Marine, 8 pages, menus déroulants, jour/nuit auto). Les écrans des iPhones et du Mac sont volontairement vides : y placer les vraies captures de l'application.
- `THEME-TOUR.md` — jetons et structure de **La Tour** (console patron) ; sources `sources/TeamOp Tour Web.dc.html` (web) et `sources/TeamOp Tour.dc.html` (fenêtre Mac) ; build `builds/teamop-tour-site.html`
- `builds/teamop-tour-web.html` + `sources/TeamOp Tour.dc.html` — La Tour (console patron), 9 vues, thème TEAM OP
- `builds/opgestion-apple-web.html` — build autonome de la version finale (ouvrir dans un navigateur)
- `sources/OP Gestion Apple.dc.html` — source de la version finale
- `THEME.md` — **tous les jetons** (typo, couleurs jour/nuit par produit, verre, rayons, mouvement, règles par plateforme) — à lire en premier
- `VERSIONS.md` — **explication détaillée de chacune des 36 versions** (ce qui change par plateforme et par mode)
- `sources/OP Gestion App.dc.html` — application, 10 plateformes, 3 modes
- `sources/TeamOp Site.dc.html` — site Apple bleu
- `sources/TeamOp Site Marine.dc.html` — site Marine
- `sources/TeamOp Galerie.dc.html` — index des versions
- `sources/OP MSG iOS 27.dc.html`, `OP MSG macOS 27.dc.html` — OP MESSAGES (Liquid Glass, iPhone et Mac)
- `sources/TEAM OP iOS 27.dc.html`, `TEAM OP macOS 27.dc.html` — hub TEAM OP (Liquid Glass)
- `sources/TeamOp Surveillance.dc.html` — écran Gestion › Surveillance (première itération, style Apple web)
- `sources/TeamOp Plateformes.dc.html` — comparatif multi-plateformes des barres (ancienne version)
- `sources/support.js` — runtime des prototypes (requis pour ouvrir les `.dc.html`)
- `builds/` — 36 fichiers autonomes : `Site Apple bleu - {Auto,Jour,Nuit}`, `Site Marine - {…}`, `OP Gestion - {plateforme} - {…}`
