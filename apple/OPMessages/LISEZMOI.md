# OP MESSAGES — le prototype en application (Mac, iPhone, iPad)

Demande de Justin, 13 novembre 2026 : « prépare tout pour Xcode, pour que je puisse tester en application sur Mac et iPhone ; après, on
le fera pour Windows et Android ».

Ce dossier est un projet Xcode à **une seule cible**, qui tourne sur Mac, iPhone et iPad. L'application ouvre le **prototype**
d'OP MESSAGES (`apercu/prototype-op-messages.html`) dans une fenêtre native : données entièrement fictives, aucune connexion, rien ne
s'enregistre. Ce n'est pas la vraie OP MESSAGES, et ce n'est pas l'application des stores.

## Lancer

Il faut un Mac avec **Xcode 16 ou plus récent** (le projet utilise un dossier synchronisé, absent des versions d'avant).

1. Récupérer la branche, puis ouvrir `apple/OPMessages/OPMessages.xcodeproj`.
2. **Sur le Mac** : en haut, choisir la destination « My Mac », puis ▶. Aucun compte développeur n'est nécessaire (« Signer pour
   exécuter localement »).
3. **Sur un iPhone simulé** : choisir un iPhone dans la liste des simulateurs, puis ▶. Aucun compte non plus.
4. **Sur ton iPhone** : le brancher, le choisir comme destination. Dans la cible › *Signing & Capabilities*, choisir ton équipe
   (ton identifiant Apple suffit, gratuit) ; au premier lancement, l'iPhone demande de faire confiance au développeur
   (Réglages › Général › VPN et gestion de l'appareil).

Pour mettre au point la page sur l'appareil : Safari › Développement › (le nom de l'appareil) › index.html.

## Ce que contient le dossier

| | |
|---|---|
| `OPMessages/OPMessagesApp.swift` | l'application : une fenêtre, la vue web de bord à bord |
| `OPMessages/VueWeb.swift` | la vue web (WKWebView), commune à iOS et macOS ; un lien extérieur s'ouvre dans le navigateur du système |
| `OPMessages/Web/index.html` | la page embarquée — **fabriquée**, ne pas la modifier à la main |
| `OPMessages/Assets.xcassets` | l'icône d'OP MESSAGES (`icons/opmsg-1024.png`) et la couleur d'accent |
| `OPMessages/OPMessages.entitlements` | le bac à sable de l'application sur Mac |
| `synchroniser.js` | refabrique `Web/index.html` depuis le prototype |
| `fabriquer-projet.py` | refabrique le fichier de projet |
| `project.yml` | secours : la même description pour XcodeGen |

## Après une modification du prototype

```bash
node apple/OPMessages/synchroniser.js
```

Puis ▶ dans Xcode. `tests/test-3299.js` tombe si la page embarquée n'est plus celle du prototype.

## Ce qui n'a PAS été vérifié

Ce projet a été écrit dans une session Linux, **sans Xcode** : il n'a été ni ouvert ni compilé.
- Le fichier de projet est contrôlé à la main (structure, références) par `fabriquer-projet.py`. Si Xcode refuse de l'ouvrir, le
  secours est XcodeGen : `brew install xcodegen && cd apple/OPMessages && xcodegen generate`.
- Le code Swift (une soixantaine de lignes utiles) n'a pas été compilé. Si une erreur s'affiche, me donner le message exact.
- La page, elle, a été mesurée dans Chromium (116 gestes, 130 écrans). **Safari n'a pas été essayé** : le premier lancement sur
  iPhone est le vrai test (encoche, barre d'accueil, clavier, défilement au doigt).

## Limites connues

- Pas de notifications, pas de vraie caméra ni de vrai micro : les appels et les réunions du prototype sont simulés.
- Dans le Courrier, télécharger une pièce jointe d'exemple ne fait rien dans l'application.
- Windows et Android viendront ensuite ; la même page servira, avec une enveloppe propre à chaque système.
