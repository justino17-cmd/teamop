<!-- ⛔ CE FICHIER EST LA RÉFÉRENCE, PAS UNE NOTE. Justin l'a fourni le 22 septembre 2026
     (« regarde bien que tout le reste soit comme le thème »). Il porte les jetons EXACTS —
     couleurs jour/nuit, verre, rayons, typographie, mouvement — dont dérive tout le style
     d'OP GESTION, d'OP MESSAGES, de TEAM OP et du site.
     ⚠️ Ne pas l'éditer pour le faire coller au code : c'est le code qui doit coller.
     `tests/test-759.js` compare les deux mécaniquement — un jeton qui change ici sans changer
     dans `app.html` fait tomber le banc, et c'est voulu.
     Récupéré depuis le projet Design de Justin, nettoyé de ses images. -->

TEAM OP — Thème et guide pour Claude Code
 
TEAM OP · Handoff
Prompt
Thème
Guide
36 versions
Thème et guide complet pour Claude Code
Tout ce qu'il faut pour recréer le site vitrine et OP GESTION en style Apple : jetons, écrans, 36 versions, prompt prêt à coller.
Copier le prompt
Copier le thème
Tout copier
Ordre conseillé : 1. coller le 
Prompt
 dans Claude Code · 2. lui donner le 
Thème
 · 3. le 
Guide
 · 4. les 
36 versions
. Les sources HTML et les logos sont dans le zip « Handoff complet ».
1 · Prompt à coller
# PROMPT pour Claude Code (à coller tel quel)
Tu travailles dans le dépôt `justino17-cmd/teamop` (HTML/JS vanilla, PWA). Je te fournis un dossier de design `design_handoff_teamop_leger/`.
Objectif : refaire le **site vitrine** (`index.html`, `tarifs.html`) et l'application **OP GESTION** (`app.html` / `beta.html`) dans le style Apple décrit dans ce dossier, en haute fidélité.
Ordre de lecture :
1. `THEME.md` — tous les jetons (typo, couleurs jour/nuit, verre, rayons, mouvement). Crée des variables CSS à partir de ces valeurs, ne les invente pas.
2. `README.md` — structure des écrans, composants, états, paramètres d'URL.
3. `VERSIONS.md` — ce qui change entre les 36 versions (plateforme × mode).
4. `sources/*.dc.html` — prototypes de référence à ouvrir dans le navigateur (avec `support.js` à côté) pour voir l'aspect exact. Ce sont des maquettes, pas du code à copier : recrée le rendu avec les patterns du dépôt.
Règles :
- Mode Jour / Nuit / Auto partout ; Auto suit `prefers-color-scheme` en direct. Le mode ne change que les couleurs.
- Détecte la plateforme (iOS ≥ 27 / iOS 18 / Android / macOS / Windows, natif PWA ou navigateur) et applique les règles de rendu de la section 6 de THEME.md : verre uniquement sur ios27 / iosweb / macos27 / macweb.
- L'accent de l'app est un réglage utilisateur (8 teintes, défaut vert) persisté par utilisateur ; la barre d'onglets (4 catégories, ordre) aussi.
- Connexion par lien d'invitation (pas de champ Entreprise).
- Contenu métier : catégories, statuts et tarifs viennent du dépôt ; les données des maquettes sont des exemples.
- Deux palettes pour le site : « Apple bleu » et « Marine » (couleurs du logo). Implémente la Marine comme thème par défaut du site, garde l'Apple bleu accessible via une variable.
- Respecte `prefers-reduced-motion` et `prefers-reduced-transparency`.
Commence par le site vitrine (index + tarifs), puis le tableau de bord de l'app, puis les listes, puis les fiches et le flux « + Créer ». Montre-moi un rendu jour + nuit à chaque étape.
2 · THEME.md — jetons de design
# THEME.md — Jetons de design TEAM OP (référence unique pour Claude Code)
Tout le style des livrables (site vitrine, OP GESTION, OP MESSAGES, TEAM OP) dérive de ces jetons. Le **mode** (jour / nuit / auto) ne change que les couleurs, jamais la structure. « Auto » = `prefers-color-scheme`, écouté en direct.
## 1. Typographie
- Apple (iOS, macOS, web Apple, site) : `-apple-system, BlinkMacSystemFont, 'SF Pro Display'` (titres) / `'SF Pro Text', 'Helvetica Neue', Helvetica, sans-serif` (corps)
- Android : `Roboto, 'Noto Sans', system-ui, sans-serif`
- Windows : `'Segoe UI Variable Display'` (titres) / `'Segoe UI Variable Text', 'Segoe UI', system-ui` (corps)
- Identifiants (BX-012, N°105348, TP18) : `ui-monospace, 'SF Mono', Menlo, monospace`
- Échelle app : titre écran 32/1.06 −0.032em 700 · titre fiche 28/1.1 −0.028em 700 · section 18–20 700 · corps 15–16 · méta 14 · libellé onglet 10 (Android 11,5)
- Échelle site : H1 clamp(44px, 7vw, 80px) −0.03em 700 · H2 clamp(32px, 4.6vw, 48px) −0.025em · sous-titre 19–26 · corps 17/1.55 · nav 12
- Lissage : `-webkit-font-smoothing: antialiased` ; `text-wrap: pretty` sur les paragraphes, `balance` sur le H1
## 2. Couleurs — application (OP GESTION / OP MESSAGES / TEAM OP)
| Jeton | Jour | Nuit |
|---|---|---|
| text | #000 | #fff |
| sub | rgba(60,60,67,.6) | rgba(235,235,245,.6) |
| faint | rgba(60,60,67,.3) | rgba(235,235,245,.3) |
| screen (fond, verre) | dégradé #f7f7f9 → #eeeef2 + 3 orbes accent | #0a0a0c → #000 + orbes |
| screen (fond, plein iOS/mac) | #f2f2f7 | #000 |
| screen (Android) | #fbfcfe | #11141c |
| screen (Windows) | #f3f3f3 | #202020 |
| glass | rgba(255,255,255,.58) | rgba(44,44,46,.55) |
| glass2 | rgba(255,255,255,.44) | rgba(255,255,255,.08) |
| line (verre) | .5px rgba(255,255,255,.72) | .5px rgba(255,255,255,.18) |
| line (plein) | rgba(60,60,67,.22) | rgba(255,255,255,.14) |
| card (plein iOS/mac) | #fff | #1c1c1e |
| card (Android) | #eceff6 | #252a3a |
| card (Windows) | #fff + bord #e5e5e5 | #2b2b2b + bord #3a3a3a |
| tabBar (verre) | rgba(255,255,255,.5) | rgba(30,30,32,.6) |
| tabBar (plein) | rgba(249,249,251,.94) | rgba(28,28,30,.94) |
| scrim | rgba(0,0,0,.35) | idem |
**Accent (réglage utilisateur, 8 teintes)** — défaut vert : jour `#1f7a5c`, nuit `#4fd18a`. Autres : bleu #007aff/#0a84ff · indigo #5856d6/#5e5ce6 · violet #af52de/#bf5af2 · rose #ff2d55/#ff375f · orange #ff9500/#ff9f0a · teal #30b0c7/#40c8e0 · graphite #1d1d1f/#f5f5f7. Texte sur accent `#fff` (sur teintes claires `#0b1426`).
L'accent colore : « + Créer », élément de menu actif, bouton principal, bulle messagerie, halos de tuiles, orbes, titre des fiches.
**Statuts** : ok #34c759 (fond rgba(52,199,89,.16), texte #1c7a3a) · planifié #007aff (fond .14, texte #0a5fc2) · alerte #ff9500 (fond .16, texte #8a5300) · erreur #ff3b30 (fond .14, texte #a81f16) · neutre #8e8e93.
**Catégories (icône sur tuile)** : palette iOS ci-dessus + gris #8e8e93.
## 3. Couleurs — site vitrine
### Apple bleu
| Jeton | Jour | Nuit |
|---|---|---|
| bg | #fff | #000 |
| text | #1d1d1f | #f5f5f7 |
| sub | #6e6e73 | #a1a1a6 |
| body | #424245 | #d2d2d7 |
| link | #0066cc | #2997ff |
| card | #f5f5f7 | #1d1d1f |
| tile | #fff | #2c2c2e |
| line | rgba(0,0,0,.1) | rgba(255,255,255,.14) |
| nav | rgba(251,251,253,.82) | rgba(22,22,23,.8) |
| bouton | #0071e3 / texte #fff | idem |
| seg / segKnob | #e5e5ea / #fff | #2c2c2e / #48484a |
### Marine (couleurs du logo)
| Jeton | Jour | Nuit |
|---|---|---|
| bg | #fff | #0b1426 |
| text | #0b1426 | #f0f3f8 |
| sub | #6b7688 | #8e9aae |
| body | #3a4557 | #c5cddb |
| link | #1e3a8a | #7fb2ff |
| card | #f0f3f8 | #121d33 |
| tile | #fff | #1a2640 |
| line | rgba(11,20,38,.1) | rgba(240,243,248,.14) |
| nav | rgba(240,243,248,.82) | rgba(11,20,38,.82) |
| accent (boutons) | #0b1426 / texte #f0f3f8 | #f0f3f8 / texte #0b1426 |
| cartes sombres | #0b1426, sous-surface #1a2640, accent #7fb2ff | idem |
## 4. Verre (Liquid Glass) — uniquement ios27, iosweb, macos27, macweb
- `backdrop-filter: blur(40px) saturate(210%) brightness(1.06)`
- Reflet : `inset 0 1px 0 rgba(255,255,255,.85)` jour / .14 nuit
- Ombre carte `0 10px 28px rgba(0,0,0,.08)` / .45 · barres `0 14px 36px rgba(0,0,0,.14)` / .55
- Orbes : 3 cercles 260–320 px, blur 28–34 px, teinte accent, animés 14–19 s alternate
- Respecter `prefers-reduced-transparency` (retirer le blur) et `prefers-reduced-motion`
- Site : nav `saturate(180%) blur(20px)` seulement
## 5. Rayons, tailles, mouvement
- Rayons : cartes 26 (verre) / 18 (iOS 18, macOS 14) / 28 (Android) / 8 (Windows) · boutons 999 (Windows 6) · feuille 34 haut mobile / 22 bureau · tuile icône 14 · avatar 50 %
- Cadres : iPhone 393×852, écran radius 46, status 54 · Android 400×852, radius 30, status 38 · fenêtre bureau 1120×760, radius 13 (Windows 9)
- Sidebar bureau 236 · tiroir mobile 300 · barre d'outils 48 · barre d'onglets flottante bottom 26 · FAB 56
- Cibles tactiles ≥ 44 px · lignes ≥ 64 px
- Easing `cubic-bezier(.32,.72,0,1)` : segment .42 s · tiroir .48 s · feuille .5 s · fondu connexion .45–.55 s · pression `scale(.95–.97)` .12 s
## 6. Règles de rendu par plateforme
1. `glass` ∈ {ios27, iosweb, macos27, macweb} → verre, orbes, pilules flottantes ; sinon surfaces pleines.
2. `mobile` → status bar, tiroir, barre d'onglets, FAB ; `desktop` → sidebar, barre de titre, feuille centrée 520 px.
3. `browser` → chrome navigateur : Safari mobile en pilule **en bas** (bottom 96) ; Chrome / Safari / Edge **en haut**.
4. Windows : barre de titre 38 à gauche, ─ ▢ ✕ 38×30 ; Edge onglet coins 7 7 0 0.
5. Android : pastille tonale 56×30 derrière l'icône active, menu actif radius 999.
3 · README.md — écrans, composants, états
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
4 · VERSIONS.md — les 36 versions
# Guide par version — 36 builds
Chaque fichier de `builds/` est autonome. Nom : `<Produit> - <Plateforme> - <Mode>.html`.
Le **mode** (Auto / Jour / Nuit) est identique dans tous les produits : **Auto** écoute `prefers-color-scheme` et bascule en direct ; **Jour** et **Nuit** forcent le thème. Ci-dessous, ce qui change d'une version à l'autre et ce que Claude Code doit reproduire.
---
## Site vitrine
### `Site Apple bleu - Jour`
Fond `#fff`, cartes `#f5f5f7`, texte `#1d1d1f`, boutons `#0071e3`, liens `#0066cc`. Nav 48 px translucide claire. Carte OP MESSAGES et carte « Prêt en trois étapes » restent sombres (`#1d1d1f`) pour le contraste. Carte tarif « Business » sombre sur fond clair. Captures d'écran : versions jour.
### `Site Apple bleu - Nuit`
Fond `#000`, cartes `#1d1d1f`, tuiles `#2c2c2e`, texte `#f5f5f7`, liens `#2997ff`. Nav `rgba(22,22,23,.8)`. Carte « Business » reste sombre mais gagne un liseré bleu `0 0 0 1.5px #2997ff` pour ressortir. Onglets tarifs : curseur `#48484a`. Captures : versions nuit.
### `Site Apple bleu - Auto`
Même fichier ; démarre selon le système et change en direct. Le sélecteur de la nav indique « Auto · jour (système) » / « Auto · nuit (système) ».
### `Site Marine - Jour`
Palette du logo : texte `#0b1426`, cartes `#f0f3f8`, liens `#1e3a8a`, **boutons marine `#0b1426` avec texte `#f0f3f8`** (à la place du bleu Apple). Cartes sombres (OP MESSAGES, CTA) en marine `#0b1426`, sous-surfaces `#1a2640`, accents `#7fb2ff`. Carte « Business » marine.
### `Site Marine - Nuit`
Fond marine `#0b1426` (jamais noir pur), cartes `#121d33`, tuiles `#1a2640`, texte `#f0f3f8`, secondaire `#8e9aae`, liens `#7fb2ff`. **Boutons inversés** : `#f0f3f8` avec texte `#0b1426`. Carte « Business » inversée en gris-bleu clair sur fond marine.
### `Site Marine - Auto`
Idem Apple bleu Auto, avec la palette Marine.
---
## Application OP GESTION
Base commune (toutes plateformes) : connexion par lien d'invitation, tableau de bord, 25 catégories, fiches Box / Intervention / Client, flux « + Créer », Paramètres avec couleur d'app et barre d'onglets personnalisable. Accent par défaut vert (`#1f7a5c` jour / `#4fd18a` nuit), modifiable par l'utilisateur. Ce qui suit, c'est **ce qui diffère**.
### Groupe A — Liquid Glass (verre)
#### `OP Gestion - iOS 27 - Jour / Nuit / Auto`
Référence du design. Cadre iPhone 393×852, radius écran 46 px, status bar 54 px. Barre d'outils **flottante en pilule** (☰, + Créer, sync, cloche 99+, recherche) à 56 px du haut, en verre. Barre d'onglets **flottante** (radius 34 px, bottom 26 px), onglet actif sur pastille blanche `rgba(255,255,255,.82)` / nuit `rgba(118,118,128,.36)`. Bouton messagerie flottant à bottom 106 px. Fond : trois orbes animés teintés accent. Tiroir gauche 300 px en verre. Feuille « Créer » monte du bas (radius 34 px).
Jour : verre `rgba(255,255,255,.58)`, fond `#f7f7f9→#eeeef2`. Nuit : verre `rgba(44,44,46,.55)`, fond `#0a0a0c→#000`, liseré `.18`.
#### `OP Gestion - iPhone web - Jour / Nuit / Auto` (Safari 27)
Comme iOS 27 **plus** la pilule d'adresse Safari (‹ › · 🔒 teamop.fr · ⤴ ▢) en verre à bottom 96 px, **au-dessus** de la barre d'onglets de l'app qui devient plate et collée en bas (padding 8/6/10). Bouton messagerie remonté à bottom 176 px. Pas de barre d'adresse en haut.
#### `OP Gestion - macOS 27 - Jour / Nuit / Auto`
Fenêtre 1120×760, radius 13 px, barre de titre 48 px avec feux tricolores (● ● ●) et titre centré « OP GESTION — <vue> ». **Sidebar permanente 236 px** en verre (`rgba(255,255,255,.3)` / nuit `rgba(28,28,30,.4)`) avec logo, 25 catégories (icône 16 px sur tuile colorée 26 px, actif = fond accent texte blanc, badges rouges). Pas de tiroir, pas de barre d'onglets, pas de ☰. Contenu : tuiles du tableau de bord sur **5 colonnes**, barre d'outils collée en haut du contenu. Feuille « Créer » = **fenêtre centrée 520 px** (radius 22 px, scale .96→1). Connexion = plein écran, colonne 380 px centrée.
#### `OP Gestion - Mac web - Jour / Nuit / Auto` (Safari 27)
Comme macOS 27 **plus** une barre de navigateur : onglet « OP GESTION — <vue> » (pilule verre avec favicon, ✕, +) puis barre d'adresse ‹ › ⟳ · 🔒 teamop.fr/beta.html#v=<vue>. Barre de titre 44 px.
### Groupe B — sans verre (surfaces pleines)
#### `OP Gestion - iOS 18 - Jour / Nuit / Auto`
Même cadre iPhone. **Aucun blur, aucun orbe.** Fond `#f2f2f7` / `#000`, cartes `#fff` / `#1c1c1e` radius 18 px, séparateurs `rgba(60,60,67,.22)`. Barre d'outils collée en haut (pas de pilule), barre d'onglets **classique** collée en bas (`rgba(249,249,251,.94)` / `rgba(28,28,30,.94)`, padding bas 26 px pour la home bar), onglet actif = icône + libellé en accent sans pastille. Segmented control iOS (`rgba(118,118,128,.12)`, curseur blanc). Tiroir opaque.
#### `OP Gestion - macOS 14 - Jour / Nuit / Auto`
Fenêtre native pleine : barre de titre `rgba(249,249,251,.94)` / nuit `rgba(28,28,30,.94)`, sidebar `#f2f2f5` / `#1c1c1e`, contenu `#f2f2f7` / `#000`, cartes 18 px sans blur. Menu actif = fond accent. Fenêtre « Créer » centrée opaque.
#### `OP Gestion - Android - Jour / Nuit / Auto` (Material 3)
Cadre 400×852, radius écran 30 px, status bar **38 px** (heure 13 px). Typo **Roboto**. Fond `#fbfcfe` / `#11141c`, cartes tonales `#eceff6` / `#252a3a` radius **28 px**, aucune bordure. Barre d'onglets Material : hauteur avec padding 10/8/16, **pastille tonale 56×30 px** derrière l'icône active (couleur de la catégorie), libellé 11,5 px. Menu latéral radius 999 px sur l'élément actif. Handle 110×4 px. Feuille « Créer » radius 28 px.
#### `OP Gestion - Android web - Jour / Nuit / Auto` (Chrome)
Comme Android **plus** la barre Chrome **en haut** : pilule d'adresse `🔒 teamop.fr … ⋮` (padding 6/14/10) sous la status bar. Barre d'onglets plate en bas (padding 8/6/10).
#### `OP Gestion - Windows 11 - Jour / Nuit / Auto` (Fluent)
Fenêtre 1120×760, radius **9 px**, bordure 1 px `#d8d8d8` / `#3a3a3a`. Barre de titre **38 px** alignée à gauche (favicon + titre 13 px), contrôles ─ ▢ ✕ (38×30 px chacun) à droite. Typo **Segoe UI Variable**. Fond `#f3f3f3` / `#202020`, cartes `#fff` / `#2b2b2b` radius **8 px**, bordure 1 px `#e5e5e5` / `#3a3a3a`. **Boutons radius 6 px** (pas de pilule), menu actif radius 6 px. Sidebar `#f3f3f3` / `#202020`.
#### `OP Gestion - Windows web - Jour / Nuit / Auto` (Edge)
Comme Windows 11 **plus** onglet Edge (coins 7 px 7 px 0 0) et barre d'adresse (pilule radius 5 px). Barre de titre 44 px.
---
## Récapitulatif des règles à coder
1. `glass = plateforme ∈ {ios27, iosweb, macos27, macweb}` → blur, orbes, pilules flottantes. Sinon surfaces pleines.
2. `kind = mobile` → status bar, tiroir, barre d'onglets, bouton flottant ; `desktop` → sidebar, barre de titre, feuille centrée.
3. `browser = true` → ajouter le chrome navigateur : Safari mobile en bas, Chrome/Safari/Edge en haut.
4. Typo et rayons par OS : Apple SF / pilules ; Android Roboto / 28 px ; Windows Segoe / 6–8 px.
5. Le mode (jour/nuit/auto) ne change **que** les tokens de couleur, jamais la structure.