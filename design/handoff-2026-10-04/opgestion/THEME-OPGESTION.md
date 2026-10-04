# THEME.md — Jetons de design TEAM OP (référence unique pour Claude Code)

> **Version de référence : `sources/OP Gestion Apple.dc.html`** (build : `builds/opgestion-apple-web.html`). C'est la version finale validée — thème « TEAM OP » par défaut, Liquid Glass sur toutes les plateformes, jour / nuit / auto. Les sections ci-dessous décrivent les jetons génériques ; en cas de conflit, la source fait foi.

## 0 bis. La Tour (console patron) — `sources/TeamOp Tour.dc.html`, build `builds/teamop-tour-web.html`
- Même thème TEAM OP (fond dégradé jour / marine nuit, verre, halos, Jour / Nuit / Auto) dans une fenêtre macOS 1180×780 : barre de titre 48, sidebar 236 (sections Tour · Gestion · Facturation · Système), contenu 28 px.
- 9 vues, routées par `#/vue` : dashboard, surveillance, entreprises, acces, beta, abonnements, support, journal, reglages. Chaque vue = titre 34 + description, 4 tuiles chiffrées (34 pt), un tableau en verre 5 colonnes (`1.6fr 1.1fr 1fr .9fr .6fr`) avec filtres segmentés et pastille de statut (ok / warn / bad / plan / grey).
- Entreprises : clic sur une ligne → fiche (slug, espace `elan-34oc`, identifiant de départ, mot de passe provisoire jamais lisible, lien `teamop.fr/e/…` **fourni par le serveur**). Règle métier à conserver : seul un 404 autorise à créer un espace ; 409 « sans code », 403, 500 ou serveur muet = on n'invente rien et on n'envoie pas le lien.
- Accent Tour : `#2f5ec4` jour / `#8fb4ff` nuit ; bouton plein `#223b6e`.

## 0. Décisions finales (OP Gestion Apple)
- **Thème par défaut : TEAM OP** (marine `#0b1426` / gris-bleu `#f0f3f8`). Thème alternatif « OP GESTION » (vert forêt `#0b3b2e` / menthe `#e4efea`) sélectionnable dans Réglages › Thème et couleur. Le thème pilote fonds, bandeau, tiroir, sidebar, barre de titre, logo.
- **Teinte d'accentuation** : 11 choix (TEAM OP, OP GESTION, Marine, Bleu, Vert, Indigo, Violet, Rose, Orange, Sarcelle, Graphite) ; ne colore que boutons, liens, onglets, menu actif, icônes de barre.
- **Mode** : Jour / Nuit / Auto (auto = `prefers-color-scheme`, écouté en direct). Le site vitrine est auto uniquement, sans bouton.
- **Liquid Glass sur les 10 plateformes** : `backdrop-filter: blur(40px) saturate(220%) brightness(1.04 jour / 1.08 nuit)` ; surfaces `rgba(255,255,255,.42)` jour / `.085` nuit ; bord `1px rgba(255,255,255,.85)` jour / `.16` nuit ; ombre `0 18px 44px` + reflet `inset 0 1.5px 0 #fff` (jour) / `.28` (nuit) ; voile diagonal 135° ; trois halos lumineux animés (bleu glacé, lavande, ciel) derrière le verre, coupés si `prefers-reduced-motion`.
- **Fond jour** : dégradé du logo — `#dfe9ff` (haut gauche) → `#eef3fb` → `#e6dff6` (bas droite) + diagonale blanche 112° à 58 %. **Fond nuit** : `#152340 → #0b1426` + diagonale à 5 %. Le tiroir mobile et la sidebar reprennent le même fond sous leur verre.
- **Barre d'onglets** (toutes plateformes) : pilule flottante en verre, onglet actif = bulle **blanche 85 %** texte marine en jour, **marine `rgba(34,59,110,.72)`** texte blanc en nuit ; icône 24, libellé 11.
- **Tableau de bord** : bandeau marine plein (date en capitales teintée, titre 34, entreprise, « Personnaliser » en verre) ; tuiles chiffrées 40 pt qui chevauchent le bandeau de 100 px.
- **Barre d'outils iOS 26** : capsules séparées (menu 44 ; groupe sync / cloche 99+ / recherche) + bouton « Créer » plein avec glyphe +.
- **Typo HIG** : 34/41 (.37), 28/34 (.36), 17 semibold lignes, 15 méta, 13 en-têtes de groupe (minuscules, gris), 11 minimum. Boutons retour « ‹ Boxes » 17 regular ; identifiant (BX-012, N°105348) en légende monospace sous le titre.
- **Pressions** : `cubic-bezier(.32,.72,0,1)` 0,2 s, scale .96–.98 + opacité .85–.9.
- **Connexion par lien d'invitation** (pas de champ Entreprise) → première connexion : nouveau mot de passe + e-mail → tableau de bord.


Tout le style des livrables (site vitrine, OP GESTION, OP MESSAGES, TEAM OP) dérive de ces jetons. Le **mode** (jour / nuit) ne change que les couleurs, jamais la structure.
- **Site vitrine : automatique uniquement, AUCUN bouton.** Suit `prefers-color-scheme` et bascule en direct quand le système change.
- **Applications : Jour / Nuit / Auto** dans les réglages (Auto par défaut).

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
