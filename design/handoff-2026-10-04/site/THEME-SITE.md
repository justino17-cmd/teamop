# THEME — Site vitrine teamop.fr (palette Marine)

Référence : `sources/TeamOp Site Marine.dc.html` · build : `builds/teamop-site-marine-web.html` (ouvrir dans un navigateur).

## Couleurs (logo TEAM OP)
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
| nav | rgba(240,243,248,.82) + blur 20 saturate 180 | rgba(11,20,38,.82) |
| accent (boutons) | #0b1426 / texte #f0f3f8 | #f0f3f8 / texte #0b1426 |
| cartes sombres (OP MESSAGES, CTA) | #0b1426, sous-surface #1a2640, accent #7fb2ff | idem |
| tarifs : formule mise en avant | contour 2 px link + bouton link plein | idem |

## Typo
SF (-apple-system) · H1 clamp(44px,7vw,84px) 700 −.03em · H2 clamp(34px,5vw,64px) −.03em · sous-titre 19–26 · corps 17/1.55 · nav 12 · `text-wrap: balance` sur H1, `pretty` sur paragraphes.

## Structure (8 pages, routage par hash `#/page/ancre`)
Accueil · Applications · OP GESTION (`#/elan`) · OP MESSAGES · Créer votre application · Métiers · Tarifs · Pourquoi TEAM OP.
- Nav collante 48 px, **menus déroulants au survol** (panneau pleine largeur, gros liens 24 px + colonne « En savoir plus », reste de la page flouté) ; sur mobile un bouton menu ouvre la liste.
- **Barre secondaire** 52 px uniquement sur les pages produit (OP GESTION, OP MESSAGES) : nom, liens Vue d'ensemble · Fonctions · Tarifs, bouton d'action.
- Pages : hero plein écran (fond dégradé `stage`), sections larges (max 1320), grilles « bento » pleine largeur pour les fonctions (cartes 0 radius, 12 px de gouttière, première carte inversée, « + » ouvre une fiche détaillée avec précédent / suivant, Échap ferme).
- Tarifs : bascule OP GESTION / OP MESSAGES ; formules réelles (Gratuit / Pro 15 / Business 25 / Business Premium 50 ; Perso / Messages Pro 15 / Messages Premium 25), prix HT, places incluses ; grille 4 → 2 → 1 colonnes.
- Métiers : 3 étapes, packs (3D complet, Plomberie, Électricité, Chauffage, Serrurerie, Nettoyage ; Maçonnerie, Menuiserie, Peinture, Paysagiste « bientôt ») ; un lien de menu descend et entoure la carte.
- Créer : formulaire (entreprise, métier en puces « Pack prêt / Sur mesure », besoins, description) → confirmation « Demande envoyée, rappel sous 48 h ».
- FAQ accordéon ; pied de page 4 colonnes.

## Règles
- Mode jour / nuit **automatique** (`prefers-color-scheme`), **aucun bouton**.
- Cadres iPhone / Mac avec écrans **vides** : y placer les vraies captures de l'application fournies par Justin.
- Boutons « Espace client » → espace.html ; « Se connecter » → connexion.html?choix=1.
