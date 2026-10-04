> **Version validée : `sources/TeamOp Tour HIG.dc.html`** (build : `builds/teamop-tour-hig.html`).
> - **Jour = 100 % HIG** : fond #f2f2f7, encarts blancs rayon 12, séparateurs rgba(60,60,67,.29), teinte bleu système #007aff, boutons secondaires teintés rgba(0,122,255,.14), segmenté gris curseur blanc.
> - **Nuit = marine profond + Liquid Glass** : fond radial #1a2a4d / #1c1636 sur linear 160° #0f1a30 → #070b16 + diagonale 4 % ; cartes rgba(255,255,255,.08) blur 40 saturate 200 %, bord 1px rgba(255,255,255,.14), ombre 0 18px 44px rgba(0,0,0,.4) + reflet inset ; texte blanc, secondaire rgba(220,228,245,.66) ; teinte #64a8ff (boutons pleins #0a84ff) ; statuts #30d158 / #ff9f0a / #ff453a / #0a84ff.
> - Mode automatique, sans bouton (`?mode=light|dark` seulement pour les aperçus). Barres toujours floutées. Téléphone : barre d'onglets flottante Accueil · Surveill. · Entreprises · Accès · Plus.

# THEME-TOUR.md — La Tour (console patron TEAM OP), thème Apple TEAM OP

> Référence : `sources/TeamOp Tour Web.dc.html` (page web fluide) et `sources/TeamOp Tour.dc.html` (fenêtre Mac). Build : `builds/teamop-tour-site.html`. En cas de conflit, la source fait foi.

## 1. Modes
- **Jour / Nuit / Auto** — Auto = `prefers-color-scheme`, écouté en direct. Le mode ne change que les couleurs.
- Le mode ne se règle pas dans la Tour elle-même en production : suivre le système (bouton présent dans la maquette pour tester).

## 2. Couleurs (palette du logo TEAM OP)
| Jeton | Jour | Nuit |
|---|---|---|
| text | #0b1426 | #f0f3f8 |
| sub | rgba(11,20,38,.62) | rgba(197,205,219,.7) |
| accent (liens, libellé de section, icône active) | #2f5ec4 | #8fb4ff |
| fill (bouton principal) | #223b6e | #223b6e |
| screen (fond) | dégradé : `linear-gradient(112deg,transparent 58%,rgba(255,255,255,.35) 58.2%)` + `radial-gradient(120% 90% at 0% 0%,#dfe9ff, transparent 55%)` + `radial-gradient(110% 80% at 100% 100%,#e6dff6, transparent 60%)` + `linear-gradient(160deg,#eef3fb,#f0f3f8)` | `linear-gradient(112deg,transparent 58%,rgba(255,255,255,.05) 58.2%)` + `linear-gradient(160deg,#152340,#0b1426)` |
| haloA / haloB (halos flous derrière le verre) | rgba(160,190,255,.45) / rgba(210,190,255,.4) | rgba(120,160,255,.16) / rgba(190,150,255,.12) |
| glass (cartes, barres) | rgba(255,255,255,.42) | rgba(255,255,255,.085) |
| glass2 (segments, puces) | rgba(255,255,255,.55) | rgba(255,255,255,.1) |
| sidebar | rgba(255,255,255,.35) | rgba(255,255,255,.04) |
| line | 1px rgba(255,255,255,.85) | 1px rgba(255,255,255,.16) |
| shadow | 0 18px 44px rgba(11,20,38,.1), inset 0 1.5px 0 #fff | 0 18px 44px rgba(0,0,0,.35), inset 0 1.5px 0 rgba(255,255,255,.28) |
| rowHover | rgba(255,255,255,.5) | rgba(255,255,255,.06) |
| toast | rgba(255,255,255,.85) | rgba(26,38,64,.85) |
| page (autour) | linear-gradient(160deg,#eef3fb,#e3e8f0) | #05091a |

**Statuts** (fond / texte) — ok rgba(52,199,89,.16) / #1c7a3a (nuit .2 / #4cd964) · warn rgba(255,149,0,.16) / #8a5300 (nuit .2 / #ffb340) · bad rgba(255,59,48,.14) / #a81f16 (nuit .2 / #ff6961) · plan rgba(0,122,255,.14) / #0a5fc2 (nuit .22 / #64b5ff) · grey glass2 / sub.
**Élément de menu actif** : fond rgba(255,255,255,.7) jour / .1 nuit, tuile d'icône rgba(47,94,196,.12) jour / rgba(143,180,255,.18) nuit, texte `text`, icône `accent`.

## 3. Verre (Liquid Glass)
- `backdrop-filter: blur(40px) saturate(220%)` sur cartes, barres, sidebar ; `blur(30px)` sur le bandeau de thème et le toast.
- Bord `line`, ombre `shadow` (reflet supérieur inclus).
- Deux halos flous (`filter: blur(50–56px)`) qui dérivent 16 s / 19 s en alternance ; coupés par `prefers-reduced-motion` ; verre désactivé par `prefers-reduced-transparency`.

## 4. Typographie (SF, HIG)
- Famille : `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Helvetica, sans-serif` ; titres avec `'SF Pro Display'`.
- H1 de vue 34/41 · tracking .37px · 700 · libellé de section au-dessus 12 · 600 · .06em · majuscules · `accent`.
- Description 15/20 `sub`, max 60ch. Titre de tableau 17 · 600 · −.02em. Chiffres clés 34 · 700 · −.03em · tabular.
- En-têtes de colonnes 11 · 600 · .05em · majuscules · `sub`. Lignes : 14.5 · 600 (nom) / 12.5 `sub` (sous-titre) / 14 (colonnes) / 13 tabular (heure). Sidebar 13 (−.008em), sections 11 · 600 · .06em. Puces de statut 12 · 600.
- Identifiants (slugs, liens, clés) en `ui-monospace, 'SF Mono', Menlo, monospace`.

## 5. Formes et espacements
- Rayons : cartes 20 (stats) / 24 (tableau, fiche) ; boutons et segments 999 ; tuiles d'icône 7–9 ; lignes de menu 8 ; avatars 9.
- Barre du haut 48 ; sidebar 236 ; lignes de tableau ≥ 56 ; boutons 36 ; padding contenu `clamp(16px, 2.5vw, 28px)`.
- Grille des chiffres clés 4 colonnes (2 sous 760 px) ; tableau 5 colonnes `1.6fr 1.1fr 1fr .9fr .6fr`.
- Mobile (< 760 px) : sidebar masquée, rangée de puces défilante à la place.

## 6. Mouvement
- Ressort Apple `cubic-bezier(.32,.72,0,1)` : sélecteur .42 s, pressions .2 s (scale .97–.98 + opacité .85), toast .5 s (translateY 16 → 0, opacité .3 s), survol de ligne .15 s.

## 7. Structure (menu)
Tour › Tableau de bord · Gestion › Surveillance, Entreprises, Comptes & accès, Bêta · Facturation › Abonnements, Support · Système › Journal, Réglages.
Chaque vue = en-tête (section, titre, description, bouton) + 4 chiffres clés + un tableau filtrable (3 segments) ; Entreprises ajoute une fiche (slug, espace, identifiant de départ, mot de passe provisoire haché, lien serveur, actions Copier / E-mail / Nouveau mot de passe).
Règles métier reflétées : le lien vient du serveur ; 404 seul autorise une création ; 409 / 403 / 500 = on ne fabrique rien ; mots de passe provisoires jamais lisibles après hachage ; journal non effaçable.

## Mode
- **Jour / nuit automatique, sans bouton** : suit `prefers-color-scheme` et bascule en direct. Le libellé « mode jour / nuit (système) » s'affiche en haut à droite sur PC.

## Téléphone (≤ 760 px)
- Sidebar masquée → **barre d'onglets flottante en verre** en bas (pilule 34 px, 5 onglets : Accueil · Surveill. · Entreprises · Accès · Plus). Onglet actif = bulle blanche 85 % (jour) / marine `rgba(34,59,110,.72)` (nuit), icône 22, libellé 11. « Plus » ouvre une feuille en verre avec toutes les vues groupées (Tour / Gestion / Facturation / Système).
- 4 chiffres clés sur 2 colonnes (1 colonne ≤ 420 px).
- Tableau → cartes : en-tête de colonnes masqué ; chaque ligne devient une carte 3 rangées — [membre · état] / [action · heure] / [appareil]. Action en 13,5 px multi-lignes.
- Titre 28/34 ; barre du haut sans l'URL ; filtres segmentés pleine largeur.
- Cibles tactiles ≥ 44 px ; verre et halos conservés ; `prefers-reduced-motion` respecté.
