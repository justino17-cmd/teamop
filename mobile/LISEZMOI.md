# OP GESTION — l'application mobile (App Store et Google Play)

Ce dossier contient la **coque native** d'OP GESTION, faite avec Capacitor 8 : un projet Xcode (`ios/`) et un projet
Android Studio (`android/`) qui embarquent les fichiers de l'application. Rien ici n'est servi par le site (le site est
assemblé par liste blanche, `mobile/` n'y est pas) et rien ne touche `app.html`.

Le plan complet, les règles des stores et le calendrier sont dans le document « Plan des stores »
(https://claude.ai/artifact/PmbKVLFeb9utiA1duYhWmJ).

## Ce que la coque contient aujourd'hui

- **Identifiant** : `fr.teamop.gestion` — confirmé par Justin le 10 novembre 2026. Il ne change plus après la première publication.
- **Nom** : OP GESTION · langue : français · icône : le carré OP GESTION (agrandi depuis `icons/opgestion-512.png` ;
  un original en 1024 × 1024 serait plus net).
- **Contenu embarqué** : le **prototype** OP GESTION (entreprise et chiffres fictifs, aucun serveur, rien ne s'enregistre),
  avec la Comptabilité complète et le module de paiement. C'est fait pour **voir et toucher l'application sur un vrai
  iPhone**, pas pour être soumis aux stores : une application de démonstration à données fictives serait refusée.

## Tester sur ton Mac avec Xcode (10 minutes)

Il faut : un Mac, **Xcode** (App Store du Mac), **Node.js 22** ou plus (https://nodejs.org), et le dépôt cloné.

```bash
cd mobile
npm install            # une fois
npm run ios            # fabrique le contenu, le copie dans le projet, ouvre Xcode
```

Dans Xcode :

1. en haut, choisis un simulateur (« iPhone 17 ») ou ton iPhone branché ;
2. la première fois, clique sur **App** (colonne de gauche) › **Signing & Capabilities** › coche *Automatically manage
   signing* et choisis ton **Team** (ton compte développeur Apple) ;
3. appuie sur ▶ (ou Cmd + R). L'application s'installe et s'ouvre.

Sur ton iPhone, la première fois : Réglages › Général › VPN et gestion de l'appareil › fais confiance à ton compte.

Sur un Mac (« Mac (Designed for iPad) »), l'application s'affiche à la taille du Web (échelle 1,3 posée sur la balise « viewport », pour que la page se remette en page dans la fenêtre ; réglé dans
`ios/App/App/SceneDelegate.swift`) et accepte plusieurs fenêtres : Fichier › Nouvelle fenêtre (Cmd + N). Sur iPad,
plusieurs fenêtres côte à côte aussi. ⚠️ Écrit sans pouvoir compiler (pas de Mac dans la session) : à confirmer dans Xcode.

Pour Android : installe **Android Studio**, puis `npm run android`, et ▶ dans Android Studio.

Après un changement du prototype dans le dépôt : `npm run ios` (ou `android`) refait tout.

## Ce qui reste avant de soumettre aux stores

La coque est prête ; ce qui manque est **la vraie application dedans**. `node fabriquer.js application` refuse exprès tant
que ce n'est pas fait. Dans l'ordre du plan :

1. **Porter le prototype dans la vraie application** (les écrans du prototype branchés sur les vraies données et le
   serveur) : c'est le gros du travail, et il se fait sur la bêta.
2. **La version « store »** de l'application : sans prix ni lien de paiement (règles d'Apple et de Google), service
   worker coupé, connexion par identifiant et mot de passe pour le relecteur.
3. **Le serveur accepte l'application** : ajouter `capacitor://localhost` et `https://localhost` aux origines autorisées
   (un réglage, mais il déploie le serveur : bancs et validation de Justin).
4. **Notifications natives** (APNs pour l'iPhone, FCM pour Android), **partage des PDF** par la feuille native,
   **Face ID / empreinte**.
5. **Suppression du compte depuis l'application** (obligatoire chez Apple et Google).
6. **Fiches des stores** : textes, captures sans donnée réelle, étiquettes de confidentialité alignées sur
   `confidentialite.html` et `sous-traitance.html` (relecture `juriste`, puis un avocat).
7. **Ce que Justin seul peut faire** : créer l'application dans App Store Connect et Play Console, les clés (APNs, FCM,
   clé de signature Android), TestFlight, appuyer sur « Soumettre ». ⛔ Aucune clé dans le dépôt ni dans une conversation.

## Fichiers

| | |
|---|---|
| `fabriquer.js` | fabrique `www/` (jamais versionné) à partir du dépôt |
| `capacitor.config.json` | identifiant, nom, dossier du contenu |
| `ios/` | le projet Xcode (`ios/App/App.xcodeproj`) |
| `android/` | le projet Android Studio |
