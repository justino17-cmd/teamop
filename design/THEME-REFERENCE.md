<!-- ⛔ CE FICHIER EST LA RÉFÉRENCE, PAS UNE NOTE. Justin a fourni son thème FINAL le
     24 septembre 2026 (dossier « Gestion_Surveillance_Apple_style », source `OP Gestion
     Apple.dc.html`) : « voilà mon thème final pour OP GESTION — je veux que tu l'appliques, que
     tu le vérifies, que tu le testes de A à Z, mais je veux que tu gardes le système de la barre
     qu'on avait fait ensemble » ; « ce thème est 100 % style et design Apple ».
     ⚠️ Ne pas l'éditer pour le faire coller au code : c'est le code qui doit coller.
     `tests/test-759.js` relit le bloc `jetons` ci-dessous et le compare à `app.html`, valeur par
     valeur ; les écarts sont DÉCLARÉS dans ce banc, chacun avec sa raison.
     La référence précédente (22 septembre) est gardée dans `design/archives/`. -->

# Thème final d'OP GESTION — style Apple (24 septembre 2026)

## 0. Décisions

- **Le nom et le logo : OP GESTION, partout.** Sur tous les appareils, dans les deux thèmes,
  l'application s'appelle « OP GESTION » et porte le logo OP GESTION (carré vert « GESTION / OP »)
  — à la connexion comme dans le menu. La maquette écrivait « TEAM OP » sous le thème TEAM OP ;
  Justin l'a corrigée le 24 septembre à 21 h 51 : « pour tous les types d'appareil tu mets bien
  OP GESTION avec le logo OP GESTION ». Le thème ne change que les couleurs.
- **Deux thèmes.** TEAM OP par défaut (marine `#0b1426` / gris-bleu `#f0f3f8`), OP GESTION au
  choix (vert forêt `#0b3b2e` / menthe `#e4efea`). Le thème pilote les fonds, le tiroir, la barre
  latérale et l'encre. Réglages › **Thème et couleur**.
- **Onze teintes d'accentuation** : TEAM OP, OP GESTION, Marine, Bleu, Vert, Indigo, Violet, Rose,
  Orange, Sarcelle, Graphite. Elles ne colorent que les boutons, les liens, les onglets, le menu
  actif et les icônes de barre. Choisir un thème pose sa teinte ; on peut ensuite la changer.
- **Mode** : Jour / Nuit / Auto (auto = `prefers-color-scheme`, écouté en direct).
- **Liquid Glass sur les dix plateformes** : la source de la maquette coupe sa branche « surfaces
  pleines ». Les rayons et la typographie restent ceux de chaque système.
- **Barre d'onglets (toutes plateformes)** : pilule flottante en verre ; l'onglet choisi est une
  bulle **blanche à 85 %** encre marine le jour, **marine** `rgba(34,59,110,.72)` encre claire la
  nuit ; icône 22–24, libellé 11. ⛔ Sa mécanique (la bulle qu'on attrape et qu'on glisse au
  doigt) est celle que Justin a faite avec nous : elle ne change pas.
- **Barre d'outils** (iOS 26) : trois objets posés sur le contenu, sans barre — le menu (pastille
  de verre 44), « + Créer » plein à la teinte, et une capsule de verre (synchro, cloche 99+,
  recherche).
- **Tableau de bord** : la date en capitales à la teinte, le titre 34, l'entreprise dessous,
  « Personnaliser » en verre ; tuiles chiffrées 40 pt avec la tuile d'icône de leur catégorie.
- **Pressions** : `cubic-bezier(.32,.72,0,1)`, 0,2 s, échelle .96–.98, opacité .85–.9.

## 1. Typographie

- Apple : `-apple-system, BlinkMacSystemFont, 'SF Pro Display'` (titres) / `'SF Pro Text'` (corps).
- Android : `Roboto, 'Noto Sans', system-ui`. Windows : `'Segoe UI Variable Display'` / `'Segoe UI Variable Text'`.
- Identifiants (BX-012, N°105348, TP18) : `ui-monospace, 'SF Mono', Menlo, monospace`.
- Échelle HIG : grand titre 34/41 (+0,37 pt) 700 · titre de fiche 28/34 · lignes 17 semi-gras ·
  méta 15 · en-têtes de groupe 13 (gris) · plancher 11.
- Date du tableau de bord : 13, 600, capitales, +0,08 em, à la teinte.

## 2. Les deux thèmes

| | TEAM OP jour | TEAM OP nuit | OP GESTION jour | OP GESTION nuit |
|---|---|---|---|---|
| encre | `#0b1426` | `#f0f3f8` | `#0b3b2e` | `#e4efea` |
| second plan (maquette) | `rgba(11,20,38,.62)` | `rgba(197,205,219,.72)` | `rgba(11,20,38,.62)` | `rgba(196,224,214,.72)` |
| page | dégradé du logo (ci-dessous) | `#152340 → #0b1426` | dégradé menthe | `#0f4a3a → #0b3b2e` |

- **Fond de jour** : diagonale blanche à 112° (35 % à partir de 58,2 %), halo `A` en haut à gauche
  (120 % × 90 %, jusqu'à 55 %), halo `C` en bas à droite (110 % × 80 %, jusqu'à 60 %), dégradé
  160° de `B` vers le clair.
  TEAM OP : A `#dfe9ff`, B `#eef3fb`, C `#e6dff6`, clair `#f0f3f8`.
  OP GESTION : A `#dcf3ea`, B `#eef8f4`, C `#e3f0e2`, clair `#e4efea`.
- **Fond de nuit** : la même diagonale à 5 %, sur le dégradé 160° du thème. Jamais de noir pur.

## 3. Les teintes

| Teinte | Jour | Nuit | Remplissage jour / nuit | Voile (canaux) |
|---|---|---|---|---|
| TEAM OP | `#0b1426` | `#a9b6cc` | `#0b1426` / `#f0f3f8` | 142,154,174 |
| OP GESTION | `#0b3b2e` | `#6aa896` | `#0b3b2e` / `#6aa896` | 106,168,150 |
| Marine | `#0b1426` | `#8fb4ff` | `#0b1426` / `#f0f3f8` | 11,20,38 |
| Bleu | `#007aff` | `#0a84ff` | teinte | 0,122,255 |
| Vert | `#34c759` | `#30d158` | teinte | 52,199,89 |
| Indigo | `#5856d6` | `#5e5ce6` | teinte | 88,86,214 |
| Violet | `#af52de` | `#bf5af2` | teinte | 175,82,222 |
| Rose | `#ff2d55` | `#ff375f` | teinte | 255,45,85 |
| Orange | `#ff9500` | `#ff9f0a` | teinte | 255,149,0 |
| Sarcelle | `#30b0c7` | `#40c8e0` | teinte | 48,176,199 |
| Graphite | `#8e8e93` | `#98989d` | `#636366` / `#8e8e93` | 142,142,147 |

- Encre sur la teinte : `#fff`, ou `#0b1426` sur les remplissages clairs de nuit (`#6aa896`, `#f0f3f8`).
- Rubrique active du menu : voile de la teinte à 14 % et encre de la teinte le jour ; voile blanc
  à 14 % et encre blanche la nuit.

## 4. Le verre

| | Jour | Nuit |
|---|---|---|
| flou | `blur(40px) saturate(220%) brightness(1.04)` | `… brightness(1.08)` |
| surface | `rgba(255,255,255,.42)` | `rgba(255,255,255,.085)` |
| surface secondaire | `rgba(255,255,255,.4)` | `rgba(255,255,255,.12)` |
| liseré (1 px) | `rgba(255,255,255,.85)` | `rgba(255,255,255,.16)` |
| barre d'onglets | `rgba(255,255,255,.46)` | `rgba(255,255,255,.1)` |
| barre latérale | `rgba(255,255,255,.35)` | `rgba(255,255,255,.04)` |
| tuile chiffrée | `rgba(255,255,255,.44)` | `rgba(255,255,255,.085)` |
| curseur de segmenté | `rgba(255,255,255,.95)` | `rgba(255,255,255,.22)` |
| en-tête de section | `rgba(11,20,38,.05)` | `rgba(255,255,255,.08)` |
| feuille | `rgba(246,247,249,.78)` | `rgba(28,28,30,.7)` |

Reflet à 135° (voile diagonal), ombre de carte et de barre : voir le bloc `jetons`. La transparence
réduite retire le flou ; le mouvement réduit coupe ce qui glisse.

## 5. Formes

- Cartes : 26 px (Liquid Glass natif), 28 (Android), 8 (Windows), 12 (iOS 18, macOS 14) ; cartes
  secondaires 20 / 24 / 8 / 12. Boutons en pilule (Windows : 6 px). Recherche en pilule.
- Feuille « Créer » : 34 px en haut (téléphone), 22 (bureau) ; grille 3 × 2 de tuiles colorées.
- Barre latérale 236 px. Cibles ≥ 44 px ; lignes ≥ 64 px.

## 6. Catégories — une couleur par rubrique, jour et nuit

Tuile : 13 % de la couleur le jour (« 22 »), 20 % la nuit (« 33 »).

| Famille | Jour | Nuit | Rubriques de la maquette |
|---|---|---|---|
| gris | `#636366` | `#8e8e93` | tableau de bord, permissions, paramètres |
| bleu | `#0a5fc2` | `#0a84ff` | interventions |
| orange | `#c25e00` | `#ff9f0a` | planning, enveloppes |
| indigo | `#4b48c9` | `#5e5ce6` | clients, techniciens, utilisateurs |
| violet | `#8e44ad` | `#bf5af2` | devis, fournisseurs |
| vert | `#1c7a3a` | `#30d158` | factures, plans |
| sapin | `#1f7a5c` | `#34c759` | boxes, messages |
| cyan | `#0a7c8a` | `#40c8e0` | produits, contrats |
| rouge | `#b0263c` | `#ff375f` | mouvements, demandes |
| ambre | `#8a5300` | `#ffd60a` | registre, sanitaire |
| ciel | `#0a5fc2` | `#64d2ff` | bons, rapports |
| ardoise | `#636366` | `#aeaeb2` | véhicules, historique |

## 7. Statuts

ok `#34c759` (fond `rgba(52,199,89,.18)`, texte `#1c7a3a`) · planifié `#007aff` (fond
`rgba(0,122,255,.14)`, texte `#0a5fc2`) · alerte `#ff9500` (texte `#8a5300`) · erreur `#ff3b30`
(texte `#a81f16`).

## 8. Les jetons, tels que le banc les relit

```jetons
theme.teamop.encre.jour = #0B1426
theme.teamop.encre.nuit = #F0F3F8
theme.teamop.clair = #F0F3F8
theme.teamop.A = #DFE9FF
theme.teamop.B = #EEF3FB
theme.teamop.C = #E6DFF6
theme.teamop.nuit.haut = #152340
theme.teamop.nuit.bas = #0B1426
theme.opgestion.encre.jour = #0B3B2E
theme.opgestion.encre.nuit = #E4EFEA
theme.opgestion.clair = #E4EFEA
theme.opgestion.A = #DCF3EA
theme.opgestion.B = #EEF8F4
theme.opgestion.C = #E3F0E2
theme.opgestion.nuit.haut = #0F4A3A
theme.opgestion.nuit.bas = #0B3B2E
verre.jour.flou = blur(40px) saturate(220%) brightness(1.04)
verre.nuit.flou = blur(40px) saturate(220%) brightness(1.08)
verre.jour.surface = rgba(255,255,255,.42)
verre.nuit.surface = rgba(255,255,255,.085)
verre.jour.surface2 = rgba(255,255,255,.4)
verre.nuit.surface2 = rgba(255,255,255,.12)
verre.jour.liseret = rgba(255,255,255,.85)
verre.nuit.liseret = rgba(255,255,255,.16)
verre.jour.reflet = linear-gradient(135deg,rgba(255,255,255,.75) 0%,rgba(255,255,255,.25) 38%,rgba(255,255,255,.05) 55%,rgba(255,255,255,.45) 100%)
verre.nuit.reflet = linear-gradient(135deg,rgba(255,255,255,.14) 0%,rgba(255,255,255,.04) 38%,rgba(255,255,255,0) 55%,rgba(255,255,255,.07) 100%)
verre.jour.ombre = 0 18px 44px rgba(11,20,38,.14),inset 0 1.5px 0 rgba(255,255,255,1),inset 0 -1px 0 rgba(255,255,255,.55),inset 1px 0 0 rgba(255,255,255,.7)
verre.nuit.ombre = 0 18px 44px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.28),inset 0 -1px 0 rgba(255,255,255,.06),inset 1px 0 0 rgba(255,255,255,.08)
verre.jour.ombre-barre = 0 24px 56px rgba(11,20,38,.2),inset 0 1.5px 0 rgba(255,255,255,1),inset 0 -1px 0 rgba(255,255,255,.6)
verre.nuit.ombre-barre = 0 24px 56px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.32),inset 0 -1px 0 rgba(255,255,255,.08)
verre.jour.barre = rgba(255,255,255,.46)
verre.nuit.barre = rgba(255,255,255,.1)
verre.jour.cote = rgba(255,255,255,.35)
verre.nuit.cote = rgba(255,255,255,.04)
verre.jour.kpi = rgba(255,255,255,.44)
verre.nuit.kpi = rgba(255,255,255,.085)
verre.jour.curseur = rgba(255,255,255,.95)
verre.nuit.curseur = rgba(255,255,255,.22)
verre.jour.entete = rgba(11,20,38,.05)
verre.nuit.entete = rgba(255,255,255,.08)
verre.jour.feuille = rgba(246,247,249,.78)
verre.nuit.feuille = rgba(28,28,30,.7)
bulle.jour = rgba(255,255,255,.85)
bulle.nuit = rgba(34,59,110,.72)
bulle.jour.ombre = 0 6px 16px rgba(11,20,38,.14),inset 0 1px 0 #fff
bulle.nuit.ombre = 0 6px 16px rgba(34,59,110,.3),inset 0 1px 0 rgba(255,255,255,.28)
teinte.teamop = #0B1426 / #A9B6CC / #0B1426 / #F0F3F8 / 142,154,174
teinte.opgestion = #0B3B2E / #6AA896 / #0B3B2E / #6AA896 / 106,168,150
teinte.marine = #0B1426 / #8FB4FF / #0B1426 / #F0F3F8 / 11,20,38
teinte.blue = #007AFF / #0A84FF / - / - / 0,122,255
teinte.green = #34C759 / #30D158 / - / - / 52,199,89
teinte.indigo = #5856D6 / #5E5CE6 / - / - / 88,86,214
teinte.purple = #AF52DE / #BF5AF2 / - / - / 175,82,222
teinte.pink = #FF2D55 / #FF375F / - / - / 255,45,85
teinte.orange = #FF9500 / #FF9F0A / - / - / 255,149,0
teinte.teal = #30B0C7 / #40C8E0 / - / - / 48,176,199
teinte.graphite = #8E8E93 / #98989D / #636366 / #8E8E93 / 142,142,147
categorie.gris = #636366 / #8E8E93
categorie.bleu = #0A5FC2 / #0A84FF
categorie.orange = #C25E00 / #FF9F0A
categorie.indigo = #4B48C9 / #5E5CE6
categorie.violet = #8E44AD / #BF5AF2
categorie.vert = #1C7A3A / #30D158
categorie.sapin = #1F7A5C / #34C759
categorie.cyan = #0A7C8A / #40C8E0
categorie.rouge = #B0263C / #FF375F
categorie.ambre = #8A5300 / #FFD60A
categorie.ciel = #0A5FC2 / #64D2FF
categorie.ardoise = #636366 / #AEAEB2
rayon.carte.natif = 26px
rayon.carte.android = 28px
rayon.carte.windows = 8px
rayon.carte.autre = 12px
```
