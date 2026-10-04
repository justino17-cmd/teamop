# THEME GLOBAL — TEAM OP (toutes les applications)

Un seul langage, quatre produits. **La structure et le mode ne changent jamais d'une app à l'autre ; seules les couleurs du logo identifient le produit.**

| Produit | Fichier thème | Palette | Teinte |
|---|---|---|---|
| Site vitrine teamop.fr | `site/THEME-SITE.md` | Marine #0b1426 / gris-bleu #f0f3f8 | marine (boutons), liens #1e3a8a / #7fb2ff |
| OP GESTION (app terrain) | `opgestion/THEME-OPGESTION.md` | thème **TEAM OP** par défaut (marine) ; thème **OP GESTION** (vert forêt #0b3b2e / menthe #e4efea) au choix | 11 teintes au choix de l'utilisateur, défaut TEAM OP |
| OP MESSAGES | `opmessages/THEME-OPMESSAGES.md` | bleu royal du logo : #24408a → #0e1a3f (nuit), glacé #ffffff → #dfe8f8 (jour) | #2a4a9c / #7ea2f0 |
| La Tour (console patron) | `tour/THEME-TOUR.md` | marine TEAM OP, HIG strict | #2f5ec4 / #8fb4ff |

## Communs
- **Mode** : jour / nuit. Site et Tour : automatique sans bouton (`prefers-color-scheme`, écouté en direct). Apps : Jour / Nuit / Auto dans Réglages (Auto par défaut).
- **Liquid Glass** sur toutes les plateformes : `backdrop-filter: blur(30–40px) saturate(180–220%)` ; surfaces blanches 42–86 % (jour) / 7–10 % (nuit) ; hairline 0,5–1 px ; reflet `inset 0 1px 0 #fff` ; ombre 0 12–18px 32–44px. Respecter `prefers-reduced-transparency` (retirer le blur) et `prefers-reduced-motion`.
- **Fonds** : dégradé du logo avec la diagonale 112° en filigrane ; jour clair, nuit marine. Le tiroir / la sidebar reprennent le même fond sous leur verre.
- **Typo HIG** : SF (Apple), Roboto (Android), Segoe UI (Windows). Large Title 34/41 (.37), Title 28/34 (.36), ligne 17 semibold, méta 15, en-tête de groupe 13 (minuscules gris), libellé d'onglet 11, badge 11. Rien sous 11 px. Identifiants en monospace.
- **Rayons** : cartes 26 (verre) / 12 (plein), Android 28, Windows 8 ; boutons pilule 999 (Windows 6) ; feuilles 30 haut mobile / 22 bureau.
- **Barre d'onglets** mobile : pilule flottante en verre (bottom 26), onglet actif = bulle blanche 85 % texte marine (jour) / marine translucide rgba(34,59,110,.72) texte blanc (nuit), icône 24, libellé 11. Bureau : sidebar 236 px, ligne active teintée.
- **Pressions** : `cubic-bezier(.32,.72,0,1)` 0,2 s, scale .96–.98 + opacité .85–.9.
- **Statuts** : ok #34c759 / #30d158 · planifié #007aff / #0a84ff · alerte #ff9500 / #ff9f0a · erreur #ff3b30 / #ff453a · neutre #8e8e93.
- **Plateformes** (10) : iOS 26, iOS 18, iPhone web (Safari : barre d'adresse en bas), Android + Android web (Chrome, Material 3), macOS Tahoe, macOS 14, Mac web (Safari), Windows 11 (Fluent, ─ ▢ ✕), Windows web (Edge). Même structure, chrome système différent.
- **Connexion** : par lien d'invitation (pas de champ Entreprise) → première connexion : nouveau mot de passe + e-mail.
- **Notifications** : bannière iOS en haut (icône app, nom, « maintenant », texte), glisse depuis le haut, ~3,5 s.
