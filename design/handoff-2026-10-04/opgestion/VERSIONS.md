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
