# Spécification : la double authentification « OP Security » dans le prototype OP GESTION (voie double-auth, étape 1 sur 6, 17 novembre 2026)

Écrite après lecture de la connexion du prototype (`apercu/prototype-op-gestion.html`, 23 500 lignes : les numéros bougent, les fonctions sont nommées), du kit de l'autre
conversation (`/home/user/kit-2fa/kit/INTEGRATION.md`, `README.md`, l'application du téléphone `public/authenticator/`) et du prototype de référence que Justin a validé
(`/home/user/kit-2fa/prototype-reference/index.html`, REJOUÉ en entier au navigateur : connexion, activation, PIN, nombre, demande rouge ; captures dans
`/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/double-auth/ref-*.png`). **Cette étape ne modifie aucune page.** Les étapes 2 et 3 (appliquer),
4 (relire), 5 et 6 (corriger, recontrôler) partent de ce document seul : il doit pouvoir être appliqué sans me reparler. Les mots entre « » sont les libellés EXACTS de l'écran
(l'annexe A les réunit) ; les noms en `code` sont ceux du fichier.

> ⛔ Rien de ce qui est décrit ici n'est de la sécurité : le prototype n'a pas de serveur, tout se vérifie DANS la page, et quiconque ouvre la console la contourne. Ce qu'on
> construit est une DÉMONSTRATION FIDÈLE de l'expérience (ce que la personne voit, lit, tape, ressent), pour que Justin la juge avant qu'on l'écrive pour de vrai. La section 13 dit
> ce que seul le serveur de la vraie application garantira, et la section 15 les doutes à lui dire. Ni un écran, ni un texte, ni un message ne promet « sûr à 100 % ».

## 0. Ce qui est tranché

### 0.1 Les huit décisions de Justin (reprises du kit, non négociables) et où elles vivent

| # | Décision | Où elle se joue dans le prototype |
|---|---|---|
| 1 | Aucune application tierce : « OP Security » | le téléphone simulé (§ 2) ; aucun écran ne cite Google, Microsoft, Authy ; le mot « authentificateur » n'est jamais affiché |
| 2 | Obligatoire pour TOUS les rôles | les six personnes de l'équipe (gérant, secrétariat, techniciennes, chef d'équipe, comptable) ; AUCUN contournement hors `?auto=` local (§ 8.3) |
| 3 | AUCUN code de secours | rien dans les écrans, le code, le rangement (sonde `secu-secrets`) ; téléphone perdu = « Nouveau téléphone » par un administrateur, en personne (§ 5.2) |
| 4 | Chaque connexion s'approuve en TAPANT le nombre (10 à 99) | § 3.4 : l'écran affiche le nombre, le téléphone montre l'appareil, l'adresse et l'heure, la personne tape le nombre (aucun choix parmi trois) |
| 5 | Connexions inhabituelles en rouge, seule l'approbation par le téléphone est acceptée | § 3.5 : nouvel appareil, nouveau réseau, hors horaires, mots de passe faux juste avant |
| 6 | « Ce n'est pas moi » : tentative bloquée, sessions fermées, compte verrouillé | § 4 |
| 7 | Actions sensibles : re-confirmation sur le téléphone, valable 5 minutes | § 6 (les quatorze gestes gardés) |
| 8 | Ne JAMAIS promettre « sûr à 100 % » : les limites se disent | § 7.5 (bloc « Ce qu'il faut savoir » de Mon compte), § 13 et § 15 |

### 0.2 Les décisions prises ici (numérotées : les autres sections les citent)

1. **Le prototype tutoie** (comme toute l'application : « Ton identifiant », « Choisis ton mot de passe »). Le prototype de référence vouvoie, l'application du téléphone compilée aussi :
   le téléphone simulé tutoie (cohérence avec OP GESTION) et le doute 1 de la § 15 dit à Justin que l'application des boutiques devra être réécrite dans le même ton avant d'être publiée.
2. **L'application s'appelle « OP GESTION », le téléphone « OP Security »** — jamais « Team OP », « Authenticator » ni « Espace sécurisé » (ces mots sont ceux de la référence et du kit).
   Le nom de l'entreprise (« Clim Services 17 ») vit dessous, comme partout ailleurs dans le prototype.
3. **Le téléphone simulé est TOUJOURS sombre** (jour comme nuit) : c'est l'allure de la vraie application (`app.css` : fond `#0b1422`). Seul ce qui l'entoure suit le thème.
4. **Un téléphone par personne.** Six personnes, six téléphones simulés, chacun avec son PIN, sa clé, son nom d'appareil. Le panneau montre « le téléphone de … » : celui de la personne qui se connecte,
   changeable à la main (§ 2.2).
5. **Tout est en MÉMOIRE de la page.** Aucun mot de passe, PIN, clé, nombre ni code d'activation n'est jamais écrit dans `localStorage`, `sessionStorage`, un cookie, `window.name`, l'adresse (`#`)
   ou un journal. Recharger la page remet la démonstration à zéro (comme le reste du prototype, qui « ne garde rien »). Les seules clés d'appareil gardées sont les réglages sans secret
   (`opg_proto_espace`, `opg_proto_mode`, `opg_proto_barre`, `opg_proto_vues`).
6. **Les clés `opg_proto_mdp` (mots de passe en CLAIR) et `opg_proto_session` disparaissent.** « Rester connecté » disparaît avec elles (§ 3.2) : une session dure jusqu'à « Se déconnecter », 15 minutes
   sans rien toucher (§ 3.9), ou le rechargement de la page.
7. **Plus de mot de passe provisoire COMMUN** (`MDP_PROVISOIRE = 'Bienvenue17'`, affiché à tout le monde dans « Accès à l'application ») : un mot de passe provisoire PAR PERSONNE, tiré au hasard,
   valable 72 heures, montré UNE seule fois à l'administrateur qui doit le remettre en main propre (§ 5.1).
8. **Le mot de passe choisi par la personne : 12 caractères au moins** (la référence et le kit ; le prototype disait 8). Une phrase de passe est conseillée. Les mots de passe courants et répétitifs sont refusés.
   Le doute 2 de la § 15 le met en balance.
9. **Une démonstration se reconnaît et se range à part** : tout ce qui n'existera pas dans la vraie application (boutons « Simuler… », mots de passe provisoires lisibles, cases « autre ordinateur ») vit dans
   UN bloc « Démonstration » (`.sec-demo`), repliable, que la constante `SECU_DEMO` (vraie dans le prototype) allume. La vraie application n'aurait pas ce bloc.
10. **`?auto=` ne marche qu'en local** (127.0.0.1, localhost, `file:`), et alors il ouvre une session SANS téléphone, SANS widget, avec les re-confirmations accordées d'office (§ 8.3) : les cent sondes
    des autres voies continuent de tourner sans rien savoir de la double authentification.
11. **Pas de session « ordinateur sans téléphone ».** Il n'y a pas de seconde porte : la voie « Ouvrir l'application comme … » d'un administrateur (aperçu d'un autre profil) est conservée, mais gardée
    par une re-confirmation, journalisée et signalée par une bande permanente (§ 5.5).
12. **Le code à 6 chiffres que le téléphone affiche N'EST PAS un code de secours** : c'est ce que fait n'importe quelle application de codes, hors ligne, seulement pour une connexion HABITUELLE. Il reste
    (« Le téléphone n'a pas de réseau ? »). Il ne sert jamais à récupérer un compte.
13. **La Sécurité est une rubrique (route `securite`), Mon compte est une FICHE (panneau `foOuvrir`)** : pas de route de plus à garder pour « Mon compte » : il s'ouvre de partout où il y a un pied de menu ou la recherche.
14. **Une case de droits neuve : `securite`** (« Gérer la sécurité des connexions »), dans `DR_SP`, à l'administrateur seul par défaut (§ 5.3). Un rôle est un nom, une règle est une case.

### 0.3 Le parcours en une page (ce que vit une personne, et la suite des écrans)

```
 PREMIÈRE FOIS (l'administrateur a invité Karim et lui a REMIS EN MAIN PROPRE un mot de passe provisoire)
   lien de l'entreprise → identifiant + mot de passe provisoire
   → « Active la vérification de ta connexion » : ① installe OP Security  ② choisis un PIN  ③ scanne le code d'activation
   → « Dernière étape » : le code à 6 chiffres affiché par le téléphone
   → « Choisis ton mot de passe » (12 caractères) → entrée dans l'application (cet ordinateur devient « reconnu »)

 TOUS LES JOURS
   identifiant + mot de passe → « Confirme sur ton téléphone » : un nombre de 10 à 99 sur l'écran
   → sur le téléphone : PIN, demande de connexion (appareil, adresse, heure) → il TAPE le nombre → « Approuver »
   → l'application s'ouvre toute seule

 CE QUI SORT DE L'ORDINAIRE
   nouvel appareil / nouveau réseau / en pleine nuit / mots de passe faux juste avant → même écran, mais EN ROUGE,
   et le code à 6 chiffres est refusé : seule l'approbation sur le téléphone passe
   « Ce n'est pas moi » sur le téléphone → connexion bloquée, toutes les connexions fermées, compte verrouillé
   → un administrateur vérifie l'identité EN PERSONNE → « Déverrouiller » → nouveau mot de passe provisoire remis en main propre

 TÉLÉPHONE PERDU, VOLÉ, EFFACÉ (5 PIN faux)
   aucun code de secours → un administrateur vérifie l'identité EN PERSONNE → « Nouveau téléphone » → l'ancien est révoqué,
   nouveau mot de passe provisoire remis en main propre → la personne active le nouveau téléphone comme la première fois

 GESTES SENSIBLES (banque, paie, administration : § 6)
   une confirmation sur le téléphone, valable 5 minutes pour TOUS les gestes sensibles ; la connexion approuvée compte déjà comme une confirmation
```

---

## 1. Ce que la connexion est AUJOURD'HUI (relevé dans le code, pour savoir ce qui change)

| Pièce | Ce qu'elle fait aujourd'hui | Ce qu'elle devient |
|---|---|---|
| `MODE_APP` (`?app=1`, `?lien=`, `OPG_MODE_APP`) | décide qu'il y a un compte | inchangé ; la couche sécurité n'existe QU'avec `MODE_APP` (le prototype « nu » avec « Tester en tant que » n'a pas de compte, donc rien à approuver) |
| `cnxCharger` | écran de chargement animé (logo) au lancement | inchangé |
| `ESPACE`, `ESPACE_CLE` (`opg_proto_espace`) | « cet appareil est relié à Clim Services 17 » : le lien de l'entreprise | inchangé (le nom d'une entreprise n'est pas un secret) |
| `cnxMontrer` | écran « Bienvenue » (lien) puis écran « Connexion » (identifiant, mot de passe, case « Rester connecté ») | « Rester connecté » retiré ; un bloc `.sec-demo` sous la carte ; une ligne sur OP Security |
| `cnxValider` | compare `mdp` à `MDP[p.k] \|\| MDP_PROVISOIRE` ; message identique pour identifiant et mot de passe faux | réécrit (§ 3) : échecs comptés, verrou, mot de passe provisoire propre à la personne, puis le téléphone |
| `MDP`, `MDP_CLE` (`opg_proto_mdp`), `MDP_PROVISOIRE` (« Bienvenue17 ») | les mots de passe choisis rangés EN CLAIR dans le navigateur ; un provisoire commun affiché dans Équipe | **supprimés** (§ 5.1, § 8.1) |
| `cnxPremier` / `cnxPremierValider` | « Choisis ton mot de passe » (8 caractères) | gardé et durci (12 caractères), déplacé APRÈS l'activation du téléphone |
| `cnxEntrer(p, reste)` | `sessionOuvrir(p.k)` ; si pas « reste », efface `SESSION_CLE` | `sessionOuvrir(p.k)` après approbation ; plus de `reste` |
| `sessionOuvrir(k)` / `sessionFermer()` / `SESSION_CLE` (`opg_proto_session`) | pose `SESSION = k`, la range, ouvre l'écran du rôle | gardés, sans rangement ; `sessionFermer` ferme aussi la couche sécurité (§ 3.9) |
| `?auto=<k>` (démarrage, vers `MODE_APP`) | entre sans écran, pour les sondes | gardé, LOCAL SEULEMENT (§ 8.3) |
| `fenPasse` / `fenLire` (`opg_proto_fenetre`, 20 s) | « Ouvrir dans une nouvelle fenêtre » passe `{k, vue, mode}` | gardé ; la fenêtre secondaire ne tient pas le téléphone (§ 8.5) |
| `eqFiche` enveloppé (`.cn-acces`) | lien, identifiant, mot de passe provisoire LISIBLE, « Copier pour lui envoyer » (qui copie le mot de passe), « Reposer un mot de passe provisoire », « Ouvrir l'application comme … » | réécrit (§ 5.1) : plus de mot de passe lisible, plus de mot de passe dans le texte à envoyer |
| `data-eq="mdp"` (« Envoyer un lien de mot de passe ») | « Lien envoyé : la personne choisit elle-même son nouveau mot de passe » | gardé, désactivé pour un compte verrouillé (§ 5.2) |
| Données bancaires | `ENTREPRISE.iban`/`bic` montrés en clair dans « Mon entreprise » ; fichier de virement (Achats) ; relevé et FEC (Comptabilité) ; paie (Temps de travail) | masqués par défaut, ouverts après confirmation (§ 6) |
| Équipe | gestes sans confirmation (inviter, désactiver, droits) | gardés (§ 6) |
| « Mon compte » | n'existe pas (retiré du menu final : `MENU-FINAL.md`, ligne « le bouton Mon compte ») | une fiche, ouverte depuis le pied (§ 7) |
| Journal (« Historique ») | types `equipe`, `inter`… | un type `securite` (§ 4.5) |

Constats utiles à l'application : (a) il n'existe AUCUN écran où une personne voie ses connexions ; (b) un mot de passe choisi était rangé tel quel et le provisoire était le même pour tous ;
(c) « Ouvrir l'application comme Sophie » ouvrait la session de Sophie sans rien demander, sans trace, sans moyen de revenir autrement qu'en se déconnectant (et se reconnecter prenait un mot de passe).
(d) `data-cnx="oubli"` (« Mot de passe oublié ? ») renvoie déjà vers l'administrateur : c'est la bonne direction. (e) Le rapport d'audit de sécurité (`scratchpad/proto-final/securite/`) n'existe pas encore :
il ne contient que les sondes d'injection (`injection-*.js`). La règle qu'elles défendent s'applique ici : **tout texte qui vient d'une personne** (nom d'appareil saisi à l'activation, nom d'une personne,
adresse saisie) passe par `esc()` et est borné ; le nom d'appareil refuse `< > "` à la saisie.

---

## 2. Le téléphone simulé « OP Security »

### 2.1 Ce que c'est, où il vit

Un élément `#opsec` posé sur `<body>`, UNE seule fois, qui contient : le téléphone (cadre sombre, écran), le bloc « Démonstration » dessous, et le moyen de l'ouvrir. Ses styles vivent dans
`<style id="opsec-css">` (préfixe `.ops-` ; la démonstration `.sec-demo`), ses fonctions dans un bloc `/* ── OP SECURITY … ── */` après `cnxPremierValider` (juste avant « un lien ouvert du dehors »).
Il n'existe que si `MODE_APP && SECU_DEMO && !secuAuto` (voir § 8.3 : avec `?auto=` il n'est pas monté, sauf `?tel=1` pour une sonde qui veut le voir).

**Le logo** : un cadenas blanc dont le corps porte « OP » en bleu, le mot « SECURITY » dessous, sur fond bleu marine (`#3f74e0` en haut vers `#0d2463` en bas) ; version nuit : le même sur fond noir.
On le RÉÉCRIT dans la page (SVG de 25 lignes, identifiants préfixés `ops-` : `ops-bg`, `ops-glass`, `ops-shk`, `ops-txt`, `ops-sh` ; deux fonctions `opsLogo(nuit)` et `opsCadenas()` qui rend le cadenas seul) d'après
`/home/user/kit-2fa/kit/mobile/resources/icone-jour.svg` et `icone-nuit.svg` (relus et regardés : cadenas blanc dégradé `#fff → #e6ebf5`, anse `rect rx 9.5` de 46 × 32,5, « OP » en gras bleu `#2c5cc8 → #0d2463`). Ne RIEN copier du kit
dans le dépôt (il est public) : ni le fichier SVG, ni `app.js`, ni `app.css`. Le cadenas seul (sans carré ni « SECURITY ») sert dans l'écran du téléphone (48 px) ; le carré complet (72 px) sur l'écran d'accueil du téléphone.

### 2.2 Où il paraît, selon l'appareil (UNE règle : la largeur de la fenêtre, pas le type d'appareil)

| Largeur de la fenêtre | Forme | Comment on le montre | Comment on le cache |
|---|---|---|---|
| **1100 px et plus** (Mac 1280 et 1440, Windows 1366, iPad en paysage 1180) | **posé à droite**, en cadre de téléphone de 300 × 600 px (écran de 276 px de large), `position:fixed; right:16px; top:16px`, hauteur `min(600px, 100dvh − 32px)` ; le bloc « Démonstration » dessous défile avec lui (`overflow:auto`, `max-height: calc(100dvh − 32px)`) | ouvert d'office sur l'écran de connexion ; s'ouvre tout seul quand une demande l'attend | bouton « Cacher le téléphone » dans son en-tête → il se replie en **bouton rond de 52 px** (« 📱 », badge rouge « 1 » quand une demande attend) au bas à droite, à 16 px des bords ; un toucher le rouvre |
| **761 à 1099 px** (iPad en portrait 820) | **vue plein écran** : le téléphone encadré (320 × 640) centré sur un fond sombre translucide | une grande pastille « Ouvrir OP Security » (bas de l'écran, 48 px de haut, centrée, marge de sécurité) sur l'écran de connexion et dans la fenêtre de confirmation ; s'ouvre toute seule à une demande ; **le téléphone se verrouille en la quittant** (c'est le vrai comportement : on quitte l'application) | bouton « ‹ Revenir à OP GESTION » (haut de la vue, 48 px) |
| **760 px et moins** (iPhone 390, Android 360, petit 320) | **vue plein écran SANS cadre ni encoche** : l'écran du téléphone remplit la fenêtre (c'est l'écran de la vraie application sur un vrai téléphone) ; le bloc « Démonstration » est la dernière carte de l'écran | idem (pastille « Ouvrir OP Security ») | idem (« ‹ Revenir à OP GESTION ») |

Après la connexion, sur les largeurs de 760 px et moins comme sur iPad portrait, **plus aucune pastille ne flotte sur l'application** (elle recouvrirait la barre du bas et les boutons flottants) : on rouvre le
téléphone par « Mon téléphone (démonstration) » dans le pied du menu, ou il s'ouvre seul pour une confirmation. À 1100 px et plus, le bouton rond reste au bas à droite ; la sonde `secu-structure` mesure qu'il ne recouvre AUCUNE cible de plus de 44 px de l'écran courant (Accueil, Planning, Interventions, Clients, Équipe à 1440 × 900 et 1280 × 720) ; s'il en recouvre une, on le décale (jamais la page : `body` ne reçoit aucun `padding`).

Ce choix a une raison dite : sur un vrai iPhone, la personne lit le nombre sur l'écran d'OP GESTION, change d'application, le tape dans OP Security, revient. La vue plein écran fait exactement ça ; **le téléphone
ne reçoit JAMAIS le nombre** (aucun rappel du nombre dans la vue du téléphone, même en étroit) : la personne le retient deux chiffres, comme pour de vrai. Sur les grands écrans, le cadre à côté de l'application
laisse voir les deux, comme la référence.

Hauteurs courtes (1280 × 720, 1366 × 768, paysage téléphone) : le cadre se tasse à `100dvh − 32px`, l'écran du téléphone défile à l'intérieur (jamais la page entière) ; aucune zone de saisie n'est masquée par le
clavier (`visualViewport`), l'écran du téléphone remonte son champ.

Le panneau `#opsec` est AU-DESSUS de l'écran de connexion (`#cnx`, 1000), du cadre plein écran de la Comptabilité (`#cpsys`, 9000) et de l'atelier (`#opdz`, 9100), des fenêtres, du guide des nouveautés et du toast :
lire le plus haut `z-index` du fichier (100002 au 17 novembre) et poser `#opsec` juste au-dessus, la fenêtre de confirmation `#sec-conf` (§ 6.2) juste en dessous de lui (pour qu'on puisse toucher le téléphone
pendant qu'elle est ouverte).

### 2.3 Qui est « le téléphone » affiché

En-tête du cadre (au-dessus de l'écran, hors de l'écran sombre) : « Téléphone de **Marc** ▾ » : un `<select>` (aria-label « Téléphone de quelle personne ? ») qui liste les personnes de l'équipe ACTIVES (six + les
invitées) avec leur nom d'appareil (« Marc · iPhone de Marc »). Il SUIT la personne : celle qui tape son identifiant avec le bon mot de passe (à l'instant où l'écran de confirmation ou d'activation s'ouvre), celle dont
une demande est en cours, sinon la personne connectée. On peut le changer à la main (rôle de « prends le téléphone de Sophie »), sans rien perdre : chaque téléphone garde son PIN, son verrouillage, ses demandes.
Noms d'appareils de départ : `marc` « iPhone de Marc », `julie` « iPhone de Julie », `sm` « Android de Sophie », `kb` « Android de Karim », `lr` « iPhone de Léa », `tl` « Android de Tom » ; une personne invitée :
« Téléphone de {prénom} » (la personne peut le renommer à l'activation, § 3.3).

### 2.4 Les écrans du téléphone (textes exacts, tutoiement ; entre parenthèses : l'écran de la vraie application qu'il imite)

Cadre : coins de 44 px, bordure de 10 px `#05080f`, encoche de 96 × 22 px en haut (pas en vue étroite). Écran : `#0b1422` ; cartes `#13213a` bord `#24365a` ; texte `#eef3fb`, secondaire `#9cadc8`,
accent `#7aa2ff`, danger `#ff8f95` sur `#3a1720`, ok `#8fe0ad` sur `#12301f` (les valeurs de `app.css`). Barre d'état : « OP Security » à gauche, l'heure à droite (`HH:MM` de l'horloge de démonstration).
Police : celle du système ; texte courant 16 px, secondaire 14 px ; **champs et touches ≥ 44 px** ; aucune coupure de mot.

| État | Ce qui s'affiche (libellés exacts) |
|---|---|
| **`neuf`** (pas installée) | le carré logo 72 px, « OP Security », « Ta clé d'accès personnelle à OP GESTION. Elle te sert à confirmer chacune de tes connexions, même sans Internet. », trois lignes : « Application de ton entreprise : aucun service extérieur » · « Ta clé est créée sur ce téléphone et n'en sort jamais » · « Elle est protégée par ton code PIN », bouton « Commencer » (visible seulement quand l'écran de l'ordinateur est à l'étape « ① Installe OP Security » ; sinon le bouton est remplacé par « OP Security n'est pas installée sur ce téléphone. Elle s'installe à ta première connexion, depuis l'écran d'activation. ») — (`showWelcome`) |
| **`pin1`** | cadenas 48 px, « Choisis un code PIN », « 6 chiffres que toi seul connais. », six points, pavé 3 × 4 (touches 56 × 52 px, « ⌫ » pour effacer) — (`showPinCreate`). Erreur : « Code trop simple. Évite les suites et les répétitions. » (suites 012345 · 123456 · 654321, 000000…999999, 121212, 123123) |
| **`pin2`** | « Confirme le code PIN », « Tape-le une seconde fois. » ; erreur : « Les deux codes ne correspondent pas. Recommence. » (retour à `pin1`) |
| **`activer`** | « Activer ce téléphone », « Sur l'ordinateur, connecte-toi : un code d'activation s'affiche. » ; boutons « Scanner le code d'activation » (prend le code affiché sur l'écran SI l'ordinateur est à l'étape « ③ », sinon l'erreur « Ouvre l'écran d'activation sur l'ordinateur, puis recommence. ») et « Saisir le code à la main » → champ « Code d'activation » (placeholder `XXXX-XXXX-XXXX`) + champ « Nom de cet appareil » (valeur : le nom du § 2.3, 60 caractères au plus, `< > "` refusés) + « Activer ». Erreurs : « Le code d'activation comporte 12 caractères (ex. 7KQM-3XHP-TW9C). » · « Ce code n'est pas le bon, ou il a expiré. Demande-en un nouveau sur l'ordinateur. » (faux, déjà utilisé, ou plus de 15 minutes) — (`showActivate`, `showScan`) |
| **`activation…`** | « Activation… », « Échange de clés avec OP GESTION. », une roue (0,8 s) |
| **`verrouillé`** | cadenas, « OP Security », « Saisis ton code PIN » (si une demande attend : « Une demande t'attend : saisis ton code PIN »), six points, pavé. Erreur : « Code PIN incorrect. {n} essai(s) avant effacement. » ; au 5ᵉ : le téléphone est EFFACÉ (état `neuf`) avec « Trop de codes PIN erronés : le compte a été effacé de ce téléphone. Demande à un administrateur de te donner un nouveau téléphone. » |
| **`ouvert`** (les codes) | barre : logo + « OP GESTION » + « En ligne » (ou « Hors ligne », ou « Heure du téléphone incorrecte ») · bouton « Verrouiller » ; les DEMANDES en attente (carte ci-dessous) ; carte compte : « OP GESTION · {entreprise} », nom et identifiant de la personne ; « Code à 6 chiffres (si l'ordinateur le demande) », le code `123 456` en gros (police à chasse fixe) et l'anneau des secondes ; « Touche le code pour le recopier sur l'ordinateur (démonstration) » ; « Activité récente » (les 5 dernières connexions : « 14:32 · Chrome · Windows » / « 203.0.113.42 — Connexion approuvée »), pied : « Activé sur {appareil} · Verrouillage automatique après 60 s ou en quittant l'application. » et le lien « Supprimer de ce téléphone » (confirmation : « Supprimer le compte de ce téléphone ? Tu ne pourras plus te connecter avec cet appareil tant qu'un administrateur ne t'aura pas donné un nouveau téléphone. » · « Supprimer » · « Annuler ») |
| **carte de demande** | titre « Demande de connexion » · « Connexion inhabituelle » (rouge) · « Confirmer une action sensible » ; **Appareil** `Chrome · Windows` · **Adresse** `203.0.113.42` · **Heure** `14:32` ; si inhabituelle, la liste rouge des raisons (§ 3.5) ; « Tape le nombre affiché sur l'écran de l'ordinateur : » ; champ de 2 chiffres (`inputmode="numeric"`, `maxlength="2"`, placeholder « •• », aria-label « Nombre affiché sur l'ordinateur ») + « Approuver » ; lien rouge « Ce n'est pas moi » → « Bloquer cette connexion ? Ton compte sera verrouillé et toutes tes connexions fermées. Un administrateur devra changer ton mot de passe. » · « Bloquer » · « Annuler ». Retours : « Tape les 2 chiffres affichés sur l'ordinateur. » (champ incomplet) · « Mauvais nombre : la demande est annulée par sécurité. » · « Approuvé. La suite se passe sur l'ordinateur. » · « Connexion bloquée. Ton compte est verrouillé et toutes tes connexions sont fermées. Un administrateur doit changer ton mot de passe. » · « Cette demande a expiré. » |
| **`révoqué`** | quand l'administrateur a donné un nouveau téléphone (ou supprimé l'accès) : à la prochaine lecture, le téléphone s'efface et revient à `neuf` avec « Ce téléphone n'est plus autorisé (un nouveau téléphone a été activé, ou ton compte a été réinitialisé). Le compte a été effacé de cet appareil. » |
| **hors ligne** (`Le téléphone n'a pas de réseau`, case de la démonstration) | la barre dit « Hors ligne » ; AUCUNE demande ne se charge ; le code à 6 chiffres reste affiché et valable ; l'approbation répond « Pas de réseau : réessaie. » |

Le téléphone **ne contient jamais le nombre** ni la clé en clair dans son DOM : la clé (20 octets) est une variable de fonction, la carte de demande ne reçoit que `{id, appareil, adresse, heure, raisons, motif}`.
Le nombre n'existe que dans l'objet `demande` de l'ordinateur, lu par UNE fonction (`secuVerifierNombre(demande, saisi)`) et par l'écran de l'ordinateur. Une sonde le prouve (`secu-nombre`).

Verrouillage automatique du téléphone : 60 s sans toucher, ou quitter la vue (étroit). Chaque ouverture redemande le PIN. (La référence ne le faisait pas ; la vraie application le fait : on suit la vraie.)

### 2.5 Le bloc « Démonstration » (`.sec-demo`, sous le téléphone ; sur téléphone : dernière carte de la vue)

Repliable (titre « Démonstration », ouvert à la première ouverture, replié ensuite et mémorisé EN MÉMOIRE). Première ligne, en gras : « Rien de ceci n'existe dans la vraie application. Recharge la page : tout repart de zéro. »
Puis, dans cet ordre :

1. **« Parcours conseillé »** : sept lignes cochées au fur et à mesure (comme la référence) — « Activer ton téléphone, première connexion » · « Te déconnecter, te reconnecter en tapant le nombre » · « Te connecter depuis un autre ordinateur (connexion inhabituelle) » · « Modifier l'IBAN de l'entreprise : confirmation sur le téléphone » · « Simuler une connexion pirate, puis « Ce n'est pas moi » » · « Voir la page Sécurité (gérant) » · « Te connecter en technicienne : mêmes étapes, moins de droits ».
2. **« Ma prochaine connexion »** : deux cases (aussi répétées, sous la carte de connexion, pour être trouvées sans ouvrir le bloc : une seule source d'état) — « Je me connecte depuis un autre ordinateur » · « Je me connecte en pleine nuit ».
3. **Boutons** : « Simuler une connexion pirate » (rouge ; grisé tant que le téléphone affiché n'est pas activé, infobulle « Disponible après l'activation du téléphone ») · « Simuler le vol de ma connexion » (grisé tant que personne n'est connecté) · « Le téléphone n'a pas de réseau » (case) · « Activer tous les téléphones d'un coup » (gain de temps : PIN `246802` pour tous, aucun mot de passe changé) · « Recommencer la démonstration ».
4. **« Faire avancer l'horloge »** : « +5 minutes » · « +15 minutes » · « +3 jours » (`SECU.decalage` s'ajoute à `secuMaint()` : fait expirer une confirmation de 5 minutes, un verrou de 15 minutes, un mot de passe provisoire de 72 heures, une demande de 2 minutes ; l'horloge affichée dans le téléphone suit).
5. **« Mots de passe provisoires (démonstration) »** : une ligne par personne qui n'a pas encore choisi le sien : « Sophie · identifiant `sophie` · `Kj9eNX-F2arrv-V93Rdf` » (sélectionnable ; **aucun bouton Copier** : ce n'est pas un secret à envoyer). Pour Karim et Léa, qui ont déjà choisi : « Karim · identifiant `karim` · mot de passe déjà choisi : … » (le clair tiré au chargement). Pour toute autre personne qui a choisi pendant la démonstration : « Sophie a choisi son mot de passe. » Mention : « En vrai, l'administrateur le remet en main propre et il ne s'affiche qu'une fois. »
6. **Les comptes déjà prêts** (état de départ, § 8.2) : « Karim et Léa ont déjà activé leur téléphone (PIN 246802). »
7. **Si un administrateur est seul à être verrouillé** : « Un administrateur déverrouille mon compte (démonstration) » (le support de TeamOP le ferait ; § 13).

Tout le bloc est en lecture/action locale : aucune de ces commandes n'écrit hors mémoire.

---

## 3. La connexion, écran par écran (ordinateur ET téléphone, jour ET nuit)

Rappel de mise en page, pour TOUS les écrans de cette section : ils sont des cartes `.cn-carte` dans `#cnx` (largeur `min(420px, 100%)`), donc la même carte sur ordinateur, iPad et téléphone ;
la colonne part du haut (le logo et le nom ne bougent pas d'un écran à l'autre) ; passage d'un écran à l'autre par `cnxGlisser` (la carte part, la suivante arrive) ; aucun saut de hauteur ;
champs de 48 px de haut, texte de 16 px (pas de zoom d'iOS), boutons de 48 px, cibles ≥ 44 px ; `prefers-reduced-motion` : plus de glissement, un fondu. Les messages d'erreur vont dans `#cn-err`
(`role="alert"`), qui remplace l'aide au lieu de la répéter (règle de `cnxPremierValider`). Un message ne se superpose jamais à un autre : chaque essai écrit SON verdict et efface celui d'avant.

### 3.1 Écran de chargement et lien de l'entreprise — inchangés

`cnxCharger` et l'écran « Bienvenue » (lien de connexion) ne changent pas, ni leurs phrases. À la fin du lancement, sur l'écran « Connexion », une seule pièce de plus (3.2).

### 3.2 « Connexion »

Dans l'ordre, dans la carte : `h1` « Connexion » ; phrase `cn-expl` « Accès réservé à l'équipe. Après ton mot de passe, tu confirmes sur ton téléphone avec OP Security. » ; « Identifiant » ;
« Mot de passe » ; `#cn-err` ; bouton « Se connecter ». Dessous : « Mot de passe oublié ? » et « Changer d'entreprise ». **La case « Rester connecté » est retirée** (décision 6).
**Sous la carte** (pas dedans), `.sec-demo-cases` (monté seulement avec `SECU_DEMO`) : un petit encadré en pointillés titré « Démonstration » avec les deux cases (« Je me connecte depuis un autre ordinateur »,
« Je me connecte en pleine nuit »), et, si un identifiant est tapé et connu, la ligne « Mots de passe faux pour {prénom} : 2 sur 5 avant le verrouillage. ». Pas de lien « Où est le téléphone ? » : la pastille (téléphone) et le cadre (ordinateur) se voient d'eux-mêmes.

Contrôles, dans CET ordre (une seule phrase pour les cas 2 et 3 : aucune fuite sur l'existence ni l'état d'un compte) :

| # | Cas | Ce qui se passe | Texte exact |
|---|---|---|---|
| 1 | champ vide | rien n'est compté | « Écris ton identifiant et ton mot de passe. » |
| 2 | identifiant inconnu, ou mot de passe faux | si le compte existe : un échec de plus (au 5ᵉ : verrou de 15 minutes, doublé à chaque nouveau verrou) ; journal `login.failed` (« Mot de passe faux ») | « Identifiant ou mot de passe incorrect, ou compte verrouillé. Si tu es sûr de toi, préviens ton administrateur. » |
| 3 | compte verrouillé (par échecs ou « Ce n'est pas moi »), même avec le BON mot de passe | rien ne s'ouvre ; journal `login.failed` (« Compte verrouillé ») | la même phrase |
| 4 | bon mot de passe, compte désactivé | comme aujourd'hui | « Ton compte a été désactivé par ton entreprise : tu ne peux plus te connecter. Contacte ton administrateur. » |
| 5 | bon mot de passe PROVISOIRE de plus de 72 h | rien ne s'ouvre | « Ton mot de passe provisoire a expiré. Demande-en un nouveau à ton administrateur. » |
| 6 | bon mot de passe, pas de téléphone activé | → 3.3 (activation) | — |
| 7 | bon mot de passe, téléphone activé | → 3.4 (confirmer sur le téléphone) ; si aucune demande n'est possible (6 en 15 minutes) | « Trop de demandes de connexion. Attends quelques minutes avant de réessayer. » |

« Mot de passe oublié ? » : « Demande à l'administrateur de ton entreprise de te donner un nouveau mot de passe provisoire : il le fait dans Équipe, sur ta fiche. Pense à lui montrer une pièce d'identité. »
(gris, comme aujourd'hui ; plus long d'une phrase). « Changer d'entreprise » : inchangé.

Comparaison des mots de passe : jamais en clair en mémoire longue. À la création (provisoire tiré au sort, ou choisi), on garde `{sel, empreinte}` où l'empreinte est un SHA-256 salé (fonction `secuSha256`, écrite
dans la page, synchrone : 40 lignes d'après la norme, elle remplace `crypto.subtle` qui est asynchrone et absent de certains contextes de la page) ; le clair n'existe que le temps de la saisie, dans le champ.
**Le provisoire est la seule exception** : il est aussi gardé en clair en mémoire de la page jusqu'à ce que la personne ait choisi le sien, parce que le bloc « Démonstration » doit pouvoir le montrer (§ 2.5, ligne 5) ;
il n'est jamais écrit hors mémoire.

### 3.3 Première connexion : activer OP Security (trois écrans)

**Écran A — « Active OP Security »** (`h1`). Phrase : « À partir de maintenant, chaque connexion se confirme sur ton téléphone. C'est obligatoire pour tout le monde, y compris le gérant. (C'est ce qu'on appelle la double
authentification.) » Trois étapes numérotées :

1. **« Installe OP Security sur ton téléphone »** — « Scanne ce dessin avec l'appareil photo, puis installe l'application (App Store ou Google Play). » ; le DESSIN d'un code (voir la note plus bas) de 120 px.
2. **« Ouvre-la et choisis un code PIN »** — « 6 chiffres que toi seul connais. Il protège l'application si on te vole ton téléphone. »
3. **« Scanne ce code d'activation »** — le dessin de 168 px, puis « Ou tape-le à la main : » et le code `7U6F-TV6B-XJZ2` (police à chasse fixe, 22 px, sélectionnable) ; « Il ne sert qu'une fois et expire dans 15 minutes. Il ne contient aucun secret. »
   Compte à rebours sous le code : « Ce code expire dans 14 min 32 s » ; à zéro : « Ce code a expiré. » + bouton « Nouveau code » (en tire un autre ; l'ancien ne marche plus).

Bouton « J'ai activé l'application ». Tant que le téléphone n'a pas activé : erreur « OP Security n'est pas encore activée : sur ton téléphone, installe-la, choisis un PIN, puis scanne le code d'activation. »
Le téléphone suit à côté (écrans `neuf` → `pin1` → `pin2` → `activer` → `activation…` → `ouvert`, § 2.4) : le bouton « Commencer » n'apparaît qu'à l'étape 1, « Scanner le code d'activation » ne marche qu'à l'étape 3.
Code d'activation : 12 signes `A-Z2-9` sans `I L O 0 1`, tirés par `crypto.getRandomValues`, comparés sans tirets ni casse, **usage unique**, 15 minutes (horloge de démonstration).

*Note sur le dessin.* Un VRAI code à scanner demande un encodeur QR (≈ 150 lignes) que le prototype n'a pas et que personne ne pourrait scanner utilement (aucun vrai téléphone n'est branché au prototype).
On dessine donc une grille de 25 × 25 modules (un SVG) avec les trois repères d'angle, remplie de façon déterministe à partir du code, et on l'écrit dessous en petit : « Démonstration : dans la vraie application, c'est un vrai
code à scanner. » Ce n'est pas un faux code qui se fait passer pour un vrai : c'est un dessin déclaré. (Doute 4, § 15.)

**Écran B — « Dernière étape »** : « OP Security est activée sur **{nom de l'appareil}**. Tape le code à 6 chiffres qu'elle affiche, pour vérifier que tout marche. » Champ « Code de vérification »
(`inputmode="numeric"`, `autocomplete="one-time-code"`, 16 px) ; bouton « Confirmer » ; erreur « Ce code n'est pas le bon. Vérifie que l'heure de ton téléphone est réglée en automatique. » ; au 5ᵉ code faux : retour
à la connexion avec « Trop de codes erronés : reconnecte-toi. ». Le code est un VRAI code horaire (HOTP/TOTP, SHA-1, pas de 30 s, une seconde de tolérance de part et d'autre, **jamais deux fois le même** : `dernierPas` par personne),
calculé avec la clé du téléphone (20 octets tirés au hasard à l'activation, jamais affichés, jamais rangés).

**Écran C — « Bonjour Karim »** : `cn-pastille` « ✓ OP Security est activée sur Android de Karim » ; « Dernière chose : choisis ton mot de passe personnel. Il remplace le mot de passe provisoire, et toi seul le connais. » ;
« Nouveau mot de passe » · « Encore une fois » ; aide « 12 caractères au moins. Une phrase de plusieurs mots est idéale, par exemple « cheval agrafe batterie correcte ». » ; une phrase fixe : « Il n'y a pas de code de secours :
ton téléphone est ta clé. » ; bouton « Enregistrer et entrer ». Erreurs (une à la fois, dans l'ordre) : « Trop court : 12 caractères au minimum, sans compter les espaces. » · « Ce mot de passe est trop courant. Choisis-en un autre. »
(liste de 12 : `azerty123456`, `motdepasse123`, `password1234`, `123456789012`, `qwerty123456`, `soleil123456`, `bienvenue1234`, `climservices17`, `climservices1`, `entreprise123`, `changeme1234`, `administrateur`) ·
« Ce mot de passe est trop répétitif. » (moins de 6 signes différents) · « Les deux mots de passe ne sont pas les mêmes. » · « Choisis un mot de passe différent du mot de passe provisoire. » Puis `cnxEntrer` (écran de chargement
« Connexion de Karim… »). **Cet ordinateur devient « appareil reconnu »** de Karim (§ 7.3) et la connexion vaut confirmation pour 5 minutes (§ 6.3). Le téléphone affiche « Approuvé. La suite se passe sur l'ordinateur. »
(vert, 5 s).

Si la personne ferme l'onglet au milieu : tout est en mémoire, la démonstration repart (dit § 8.4). Si elle appuie sur « Revenir à la connexion » depuis l'écran C : le mot de passe provisoire reste valable, l'activation ne se refait pas.

### 3.4 « Confirme sur ton téléphone » (tous les jours)

`h1` « Confirme sur ton téléphone ». Deux étapes : « 1. Ouvre OP Security et tape ton code PIN. » · « 2. Vérifie l'appareil et l'adresse affichés, puis tape ce nombre : ». Le NOMBRE, en grand (`font-size:clamp(56px, 18vw, 88px)`,
gras, chasse fixe, centré, dans une boîte de 96 px de haut minimum, `aria-label="Nombre à taper sur ton téléphone : 47"`, `aria-live` éteint : il ne se relit pas tout seul). Dessous : « Cette page se met à jour toute seule dès
que tu as approuvé. », la ligne grise « Cette demande expire dans 1 min 52 s » (mise à jour chaque seconde ; l'horloge de démonstration l'avance), `<details>` « Le téléphone n'a pas de réseau ? » (sauf connexion inhabituelle, § 3.5) qui
déplie « Code à 6 chiffres affiché dans OP Security » + « Valider le code », et le lien « Annuler » (retire la demande, retour à la connexion, `login.cancelled` : une ligne de l'historique de la personne, pas du journal de l'entreprise).
Sur téléphone, sous la carte : la pastille « Ouvrir OP Security » (§ 2.2).

| Événement | Résultat à l'écran |
|---|---|
| le bon nombre est tapé sur le téléphone | la carte s'efface sur « Connexion de Karim… » puis l'application ; si la personne a encore son mot de passe provisoire : écran C d'abord |
| un mauvais nombre | demande `échouée`, **un échec compté** (le même compteur que les mots de passe faux) ; retour à la connexion : « Mauvais nombre tapé sur le téléphone : la connexion a été annulée par sécurité. » ; téléphone : « Mauvais nombre : la demande est annulée par sécurité. » ; journal `login.number_mismatch` (rouge) |
| « Ce n'est pas moi » | § 4.2 |
| 2 minutes sans réponse | la carte dit « La demande a expiré. » + bouton « Recommencer » (retour à la connexion, mot de passe à retaper) ; le téléphone retire la carte ; rien n'est compté |
| un bon code à 6 chiffres (connexion habituelle seulement) | comme l'approbation ; la demande est retirée du téléphone ; `dernierPas` avancé |
| un mauvais code à 6 chiffres | « Code invalide ou déjà utilisé. » ; au 5ᵉ : retour à la connexion « Trop de codes erronés : reconnecte-toi. » |
| 7ᵉ demande en 15 minutes pour le même compte | pas de demande : « Trop de demandes de connexion. Attends quelques minutes avant de réessayer. » |
| nouvelle demande pour le même motif | l'ancienne est remplacée (une seule carte vivante par compte et par motif) |

Le nombre : **entre 10 et 99**, tiré par `crypto.getRandomValues` (jamais `Math.random`), un nouveau à chaque demande, jamais montré ailleurs que sur l'écran qui a lancé la demande.

### 3.5 La connexion inhabituelle (EN ROUGE)

Quatre signaux (un seul suffit ; ils s'additionnent) — libellés exacts, sur l'écran ET sur la carte du téléphone, au bon endroit :

| Signal | Quand (dans la démonstration) | Libellé |
|---|---|---|
| Appareil | l'appareil n'est pas dans les « appareils reconnus » de la personne : la case « Je me connecte depuis un autre ordinateur » est cochée, ou « Oublier » est passé (§ 7.3) | « Appareil jamais utilisé pour ce compte » |
| Réseau | le réseau n'a aucune connexion réussie depuis 90 jours (même case que l'appareil : l'autre ordinateur est aussi sur un autre réseau ; le pirate aussi) | « Réseau (adresse) jamais utilisé » |
| Horaires | la case « Je me connecte en pleine nuit » est cochée (la démonstration n'utilise PAS l'heure réelle : à 1 h du matin, Justin serait signalé à chaque connexion) ; l'heure affichée devient `03:12` | « En dehors des heures de travail habituelles (7 h – 21 h) » |
| Mots de passe faux | deux mots de passe faux ou plus (ou un mauvais nombre) juste avant, sur ce compte, dans les 15 minutes | « Plusieurs mots de passe faux juste avant » |

**Ce que la personne voit sur l'ordinateur** : la même carte « Confirme sur ton téléphone », avec en haut une boîte rouge (`role="alert"`, bordure et pictogramme « ⚠ », jamais la couleur seule) : « **Connexion inhabituelle détectée** »,
la liste des raisons, puis « L'approbation sur le téléphone est obligatoire. » ; le nombre prend un cadre rouge ; le `<details>` du code à 6 chiffres est REMPLACÉ par la phrase « Connexion inhabituelle : seul le téléphone peut
l'approuver, pas le code à 6 chiffres. ». **Sur le téléphone** : la carte est bordée de rouge, titre « Connexion inhabituelle » (jamais « Demande de connexion »), la même liste rouge sous Appareil / Adresse / Heure.
Un code à 6 chiffres tapé quand même (par un autre chemin) : « Connexion inhabituelle : seule l'approbation sur le téléphone est acceptée. » ; journal `login.code_refused_unusual`.
**Après l'approbation** : toast « Connexion inhabituelle approuvée. Cet ordinateur est maintenant reconnu. » ; l'appareil entre dans les appareils reconnus ; la ligne reste rouge dans l'historique (§ 7.2) et dans la Sécurité (§ 4.4).
Contrastes : le rouge se mesure de jour ET de nuit (le `--rouge` de l'application éclairci de nuit : le texte sur fond rouge pâle se calcule, `test-773`/`test-806` en donnent la règle) ; ≥ 4,5:1 partout, au pixel.

Adresses de démonstration (les adresses de documentation, jamais celles d'un vrai réseau) : cet ordinateur `203.0.113.42` ; l'autre ordinateur `198.51.100.7` (« Safari · macOS », ou « Chrome · Windows » si cet ordinateur est déjà un Mac Safari) ;
le pirate `192.0.2.99` (« Firefox · Linux »). L'appareil « cet ordinateur » est lu dans `navigator.userAgent` par un petit analyseur (`secuAppareil()` → « Chrome · Windows », « Safari · iPhone », « Chrome · Linux »…) ; le nom est
borné à 40 signes.

### 3.6 Combien de demandes, combien d'essais (les chiffres de la référence, à ne pas changer)

Demande valable **2 minutes** · **6 demandes** au plus par compte et par quart d'heure · un **compteur d'échecs commun** (mot de passe faux, mauvais nombre, mauvais code) · **5 échecs = verrou de 15 minutes**, doublé
à chaque nouveau verrou (15, 30, 60…), remis à zéro à une connexion réussie · **5 PIN faux = le téléphone s'efface** · code d'activation **15 minutes**, usage unique · mot de passe provisoire **72 heures** ·
confirmation d'action sensible **5 minutes** · inactivité **15 minutes**. Ils vivent dans UN objet `SECU_REGLES` (jamais dans les fonctions) ; les sondes les lisent et les mutations les changent.

### 3.7 Un technicien, la secrétaire, la comptable : la même chose

Les six personnes passent par le même chemin. Ce qui change ensuite est ce que l'application leur montre (droits). La comptable seule (`profil compta`, plein écran du cadre de la Comptabilité) se connecte pareil ;
une fois dedans, son bouton de la barre reste « Se déconnecter » (inchangé).

### 3.8 Ouvrir l'application ensuite (`cnxEntrer`, `sessionOuvrir`)

`cnxEntrer(p)` ne change que par la disparition de `reste`. `sessionOuvrir(k)` reste la SEULE porte qui pose `SESSION` : on y ajoute `SECU.sessions[k] = {debut, appareilId, auto:false}` et on y arme la minuterie d'inactivité.
**Aucune autre porte** (le guide des nouveautés, `fenLire`, `?auto=`, « Ouvrir l'application comme ») ne pose `SESSION` sans passer par `sessionOuvrir` — un banc recense les écritures de `SESSION` (la règle de ce dépôt : une garde
se lit à TOUTES les portes). Le guide des nouveautés (`nvProposer`, 900 ms après `sessionOuvrir`) s'ouvre comme avant ; il ne couvre ni le téléphone (`#opsec`) ni la fenêtre de confirmation.

### 3.9 La session se ferme

| Cause | Message sur l'écran de connexion | Autres effets |
|---|---|---|
| « Se déconnecter » (pied du menu, recherche, barre de la comptable) | « Tu es déconnecté. » (gris) | le téléphone se verrouille ; la fenêtre de 5 minutes est effacée |
| 15 minutes sans rien toucher (aucun `pointerdown`, `keydown`, `touchstart`, `scroll` ; horloge de démonstration) | « Tu as été déconnecté : 15 minutes sans rien toucher. Reconnecte-toi. » | idem |
| « Ce n'est pas moi » sur le téléphone | « Tes connexions ont été fermées : une connexion a été bloquée depuis ton téléphone. Ton compte est verrouillé jusqu'à ce qu'un administrateur change ton mot de passe. » | compte verrouillé (§ 4.2) |
| vol de session simulé | « Par sécurité, ta connexion a été fermée : elle a été utilisée depuis un autre navigateur. Reconnecte-toi. » | journal `session.hijack_suspected` |
| un administrateur : « Déconnecter partout », « Nouveau téléphone », « Déverrouiller », désactivation du compte | « Un administrateur a fermé tes connexions. Reconnecte-toi. » | selon le geste |
| rechargement de la page | écran de lancement puis connexion | la démonstration repart à zéro |

Une session ouverte par `?auto=` n'a ni minuterie d'inactivité ni téléphone (§ 8.3).

---

## 4. Le pirate, « Ce n'est pas moi », le verrouillage, la page Sécurité, le journal

### 4.1 « Simuler une connexion pirate » (bloc « Démonstration », bouton rouge)

Grisé tant que le téléphone affiché n'est pas activé (infobulle « Disponible après l'activation du téléphone »). Au clic : une demande de connexion est créée POUR LE COMPTE du téléphone affiché, avec `source:'pirate'`, appareil
« Firefox · Linux », adresse `192.0.2.99`, les TROIS raisons « Appareil jamais utilisé pour ce compte », « Réseau (adresse) jamais utilisé », « En dehors des heures de travail habituelles (7 h – 21 h) », et un nombre tiré comme les autres
(il compte dans les 6 demandes par quart d'heure). Journal `login.unusual`. Un avis dans le bloc (pas dans l'application) : « Démonstration : un pirate qui connaît le mot de passe de {prénom} essaie de se connecter depuis un autre
pays. Regarde le téléphone : déverrouille-le avec son PIN si besoin. » et, dessous, ce que voit le pirate : « Sur l'écran du pirate, le nombre affiché est **47**. Si {prénom} le tape sur son téléphone, il laisse entrer le pirate :
c'est la limite de ce système, et la raison de la règle « ne tape jamais un nombre que tu n'as pas demandé toi-même ». »
Le téléphone (déverrouillé) montre la carte ROUGE. Trois issues :
- **« Ce n'est pas moi »** → § 4.2 ;
- **un mauvais nombre** → demande `échouée`, un échec compté, journal `login.number_mismatch` ; le téléphone : « Mauvais nombre : la demande est annulée par sécurité. » ;
- **le bon nombre** (la limite) → « Approuvé. » ; ligne `success` rouge dans l'historique de {prénom} et dans la Sécurité (« Connexion inhabituelle approuvée »), journal `mfa.approved_on_phone` ; avis du bloc : « Le pirate est entré. Voilà ce
  qu'aucune protection ne peut empêcher : une personne qui tape un nombre qu'on lui présente. Regarde la page Sécurité : la connexion y est en rouge. »

### 4.2 « Ce n'est pas moi » : le verrouillage

Sur la carte, « Ce n'est pas moi » ouvre la confirmation « Bloquer cette connexion ? Ton compte sera verrouillé et toutes tes connexions fermées. Un administrateur devra changer ton mot de passe. » (« Bloquer » rouge ·
« Annuler » : retour à la carte, rien n'est changé). « Bloquer » fait, dans une seule fonction (`secuBloquer(k, demande)`, appelée par TOUS les chemins) :
1. la demande est `refusée` ; toutes les autres demandes du compte sont retirées ;
2. **le compte est verrouillé sans durée** (`verrou = {le, par:'telephone'}`) : plus aucune connexion, même avec le bon mot de passe (§ 3.2, cas 3) ;
3. **toutes ses sessions sont fermées** : si la personne est connectée dans cette page, l'application laisse la place à l'écran de connexion avec le message du § 3.9 ; les sessions des autres appareils (non simulées) sont comptées
   et dites : la ligne de l'historique porte « connexions fermées : 1 » ;
4. historique de la personne : une ligne « Bloquée depuis le téléphone » (rouge) ; Sécurité : +1 « bloquée depuis un téléphone », +1 « compte verrouillé » ;
5. journal : `login.denied_by_user` puis `account.locked` ;
6. le téléphone dit « Connexion bloquée. Ton compte est verrouillé et toutes tes connexions sont fermées. Un administrateur doit changer ton mot de passe. » (rouge, reste affiché jusqu'au verrouillage du téléphone) ;
7. Équipe : la carte de la personne porte « Verrouillé », un bandeau rouge en tête de l'écran (§ 5.1), « Déverrouiller » sur sa fiche.
Le téléphone reste activé (c'est le pirate qui a été arrêté, pas le téléphone). Pour un téléphone volé : « Nouveau téléphone » (§ 5.2).

### 4.3 « Simuler le vol de ma connexion »

Grisé si personne n'est connecté. Simule un cookie de session rejoué dans un autre navigateur : la session ouverte se ferme, message du § 3.9 ; journal `session.hijack_suspected` (« Connexion utilisée depuis un autre navigateur »,
rouge) ; une ligne de l'historique « Connexion fermée par sécurité ». Le compte N'EST PAS verrouillé (la personne se reconnecte avec son téléphone).

### 4.4 La page « Sécurité » (rubrique `securite`, réservée à la case « Gérer la sécurité des connexions »)

Place : groupe « Personnel », juste sous « Mon entreprise », icône `🛡️` dans `IC` (clé `securite`). Une rubrique de plus au menu du gérant (21 lignes au lieu de 20 : doute 3, § 15). Quelqu'un sans la case ne la voit ni au menu, ni à la
barre, ni à la recherche, ni par `#securite` (retour à son écran d'ouverture, avec le toast « Cette page n'est pas pour toi. » : le cas « adresse tapée à la main » de `sessionVue`/`routeConnue`).

Contenu, dans l'ordre :
1. `.tete` : surtitre « Personnel », `h1` « Sécurité », phrase « Qui s'est connecté de façon inhabituelle ou s'est fait refuser, et quels comptes sont verrouillés. ».
2. **Trois chiffres** (`.kpis`) : « **3** connexions inhabituelles ou refusées » · « **1** bloquée depuis un téléphone » · « **1** compte verrouillé » (30 derniers jours ; les chiffres suivent les lignes du tableau, ils ne sont pas écrits à part ;
   le deuxième et le troisième passent en rouge s'ils sont > 0 ; un chiffre de 0 se lit « Aucune »).
3. **Si des comptes sont verrouillés** : une carte rouge « Comptes verrouillés » : une ligne par compte — avatar, « Léa Roux », « Verrouillé depuis hier à 18:02 : bloquée depuis son téléphone » (ou « Verrouillé jusqu'à 14:47 : cinq erreurs »), bouton « Déverrouiller »
   (ouvre le panneau du § 5.2 ; garde S13).
4. **« Connexions inhabituelles ou refusées »** : un tableau (ordinateur : Date · Qui · Appareil · Adresse · Pourquoi · Résultat) ; sur téléphone et iPad portrait, des CARTES (la date et le nom en tête, le résultat en pastille, les raisons en
   liste ; jamais de défilement latéral). Résultat : « Approuvée sur le téléphone » (rouge si inhabituelle) · « Bloquée depuis le téléphone » · « Mauvais nombre tapé » · « Code refusé (connexion inhabituelle) » · « Connexion fermée par sécurité ».
   Une ligne inhabituelle ou refusée a un filet rouge ET un mot (« Refusée », « Inhabituelle ») : jamais la couleur seule.
5. Pied, gris : « Une connexion inhabituelle (autre appareil, autre réseau, hors des heures de travail, mots de passe faux juste avant) n'aboutit qu'après approbation sur le téléphone de la personne. Tu ne vois ici ni mot de passe ni code. »
6. Vide : « Rien d'inhabituel pour l'instant. » (grisé, avec le pictogramme).
Départ de démonstration (§ 8.2) : deux lignes d'avant — Léa, hier, « Firefox · Linux », `192.0.2.51`, trois raisons, « Bloquée depuis le téléphone » ; Karim, il y a 3 heures, « Safari · iPhone », `198.51.100.23`, « Appareil jamais utilisé… », « Approuvée sur le téléphone ».
Valeurs longues (obligatoires à la sonde) : un nom de 60 signes, un appareil de 40, une adresse IPv6 de 39, trois raisons : la ligne retourne à la ligne, rien ne déborde à 320 px.

### 4.5 Le journal de l'entreprise (« Historique »)

Un type `securite` neuf dans `H_TYPES` (`['Sécurité', 'var(--rouge)']`, filtre « Sécurité »). Ne passent au journal QUE les événements qui comptent (une connexion ordinaire n'y est pas : elle noierait l'entreprise) :

| Action du kit | Ligne du journal (sujet = la personne) |
|---|---|
| `login.unusual` | « a tenté une connexion inhabituelle » (détail : appareil · adresse) |
| `login.denied_by_user` | « a bloqué une connexion depuis son téléphone » |
| `account.locked` | « : compte verrouillé » (détail : bloqué depuis le téléphone / cinq erreurs) |
| `login.number_mismatch` | « a tapé un mauvais nombre sur son téléphone » |
| `login.code_refused_unusual` | « a vu son code refusé (connexion inhabituelle) » |
| `mfa.approved_on_phone` | seulement si inhabituelle : « a approuvé une connexion inhabituelle » |
| `mfa.device_activated` | « a activé son téléphone » (détail : nom de l'appareil) |
| `session.hijack_suspected` | « : connexion utilisée depuis un autre navigateur » |
| geste d'un administrateur (§ 5) | « a donné un nouveau téléphone à … », « a déverrouillé le compte de … », « a ouvert l'application comme … » (via `eqxJ`) |
| confirmation d'un geste sensible (§ 6) | rien de plus : le geste lui-même est déjà au journal par son écran |

Aucune ligne du journal ne contient un nombre, un code, un mot de passe, une clé, un PIN (sonde `secu-secrets`).

---

## 5. Équipe : le téléphone, le mot de passe provisoire, les gestes d'un administrateur

`vueEquipe`/`eqxDroitsVue`/`eqxCarte`/`eqFiche`/`eqxFiche` sont des écrans que Justin a validés (« c'est bien ») et que la voie `entreprise` retouche en ce moment (`MON-ENTREPRISE-ET-DROITS.md` § 2.4) : on AJOUTE, on ne
redessine rien. Avant d'appliquer, relire le code réel de ces fonctions (noms des `data-eq`, `data-eqx`) ; les noms ci-dessous sont ceux du 17 novembre.

### 5.1 La carte et la fiche d'une personne

**Carte** (`eqxCarte`) : une pastille de plus, à côté de « Invité » / « Désactivé » — « Téléphone à activer » (orange, `st-o`) tant que la personne n'a pas activé OP Security, « Verrouillé » (rouge, `st-r`) pour un compte verrouillé ;
une puce « 📱 Android de Karim » dans `eq-puces` quand le téléphone est activé (Équipe est une grille de CARTES, pas un tableau : la pastille et la puce tiennent lieu de « colonne téléphone » de la référence). **En tête de l'écran** (réservé à qui a la case `securite`) : si des comptes sont verrouillés, une carte rouge : « 1 compte verrouillé : Léa Roux. »
+ bouton « Voir » (→ la page Sécurité) ; jamais de carte quand tout va bien.

**Fiche** : le bloc `.cn-acces` (« Accès à l'application ») est RÉÉCRIT et renommé **« Connexion »** (`surtitre`) ; il reste au même endroit (au-dessus des boutons) et reste réservé au gérant :

| Ligne | Contenu |
|---|---|
| « Lien de l'entreprise » | `teamop.fr/e/clim-services-17` (inchangé) |
| « Identifiant » | `karim` (inchangé) |
| « Mot de passe » | « Personnel, choisi par Karim. » · ou, s'il n'a pas encore choisi : « Provisoire : à lui remettre en main propre. » + `<small>` « Karim le change à sa première connexion. » · **JAMAIS le mot de passe lui-même** |
| « Téléphone » | « Android de Karim · activé le 05/11/2026 » · « À activer à sa première connexion » · « Verrouillé depuis hier à 18:02 (bloquée depuis son téléphone) » (rouge) |
| « Dernière connexion » | « Aujourd'hui à 11:14 · Safari · iPhone » · « Jamais » |

Boutons (la rangée `.actions` existante, dans cet ordre) : « Copier le lien et l'identifiant » (remplace « Copier pour lui envoyer » ; copie : « OP GESTION — Clim Services 17 » / « 1. Ouvre ce lien : teamop.fr/e/clim-services-17 » / « 2. Ton identifiant :
karim » / « 3. Ton mot de passe provisoire : je te le remets en main propre. » / « 4. Installe OP Security sur ton téléphone : l'application te guide à ta première connexion. » — **le texte ne contient plus aucun mot de passe**) ·
« Nouveau téléphone » · « Déverrouiller » (seulement si verrouillé ; remplace « Nouveau téléphone » pour mettre le geste utile en premier) · « Déconnecter partout » · « Reposer un mot de passe provisoire » (existant : `data-cnx="repose|k"`) ·
« Ouvrir l'application comme Karim » (existant : `data-cnx="comme|k"`). Un administrateur ne voit PAS « Nouveau téléphone », « Déverrouiller » ni « Déconnecter partout » sur SA propre fiche : à la place, la phrase grise « Pour ton propre
compte, demande à un autre administrateur. » (et « Mon compte » pour ses appareils, § 7). `data-eq="mdp"` (lien par e-mail) est désactivé sur un compte verrouillé, avec la raison dessous : « Compte verrouillé : utilise « Déverrouiller »,
après avoir vérifié son identité en personne. »

**Panneau « Mot de passe provisoire »** (l'UNIQUE endroit, avec le bloc « Démonstration », où un mot de passe provisoire s'affiche ; `ouvrirPanneau`) : surtitre « Équipe », `h2` « Mot de passe provisoire pour Karim » ; ligne verte (si un geste l'a
amené) ; « Remets ce mot de passe à **Karim en main propre**, après avoir vérifié son identité. » ; le mot de passe seul sur sa ligne (chasse fixe, 22 px, `user-select:text`, **aucun bouton Copier**, jamais dans un `data-t`, jamais dans un toast) ;
« Valable 72 heures (jusqu'au 20/11 à 14:32). Il ne sera plus affiché. » ; bouton « Terminé » (efface le clair du panneau ET de tout objet qui l'a porté à l'écran). Forme : 18 signes de `ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789`
par groupes de 6 séparés par des tirets (`Kj9eNX-F2arrv-V93Rdf`), tirés par `crypto.getRandomValues`, **un par personne**, jamais deux fois le même.

### 5.2 Les gestes d'un administrateur (chacun est gardé : § 6, S11 à S13)

**« Nouveau téléphone »** (la personne a perdu son téléphone, ou il a été volé, ou effacé). `ouvrirPanneau` : `h2` « Nouveau téléphone pour Karim » ; « Avant de continuer, **vérifie que c'est bien Karim, en personne** (pas par message, pas par téléphone). »
**Case obligatoire** « J'ai vérifié l'identité de Karim en personne » (le bouton reste grisé tant qu'elle n'est pas cochée) ; trois lignes de conséquences : « Son ancien téléphone ne pourra plus approuver aucune connexion. » · « Karim sera déconnecté partout. » ·
« Il recevra un nouveau mot de passe provisoire, à lui remettre en main propre. À sa prochaine connexion, il activera OP Security sur son nouveau téléphone. » ; « Il n'existe pas de code de secours : c'est voulu. » ; boutons « Nouveau téléphone pour Karim » · « Annuler ».
Effets (UNE fonction, `secuNouveauTelephone(k, par)`) : le téléphone de Karim est **révoqué** (le téléphone simulé, à sa prochaine lecture, s'efface et dit « Ce téléphone n'est plus autorisé… », § 2.4) ; ses sessions sont fermées ; ses demandes retirées ;
un nouveau mot de passe provisoire est tiré (l'ancien, choisi ou non, ne marche plus) ; un nouveau code d'activation sera tiré à sa première connexion (l'ancien est mort) ; ses appareils reconnus sont oubliés ; son verrou éventuel est levé ;
la fiche passe à « Téléphone à activer » ; le panneau « Mot de passe provisoire » s'ouvre avec la ligne verte « L'ancien téléphone de Karim est révoqué : il ne peut plus approuver de connexion. » ; journal « a donné un nouveau téléphone à Karim ».

**« Déverrouiller »** (le compte est verrouillé). `h2` « Déverrouiller le compte de Léa » ; « Léa a bloqué une connexion depuis son téléphone : quelqu'un connaissait peut-être son mot de passe. Pour la protéger, son mot de passe est remplacé. Vérifie que c'est
bien Léa, en personne, puis remets-lui le nouveau mot de passe provisoire. » ; case « J'ai vérifié l'identité de Léa en personne » ; boutons « Déverrouiller et changer le mot de passe » · « Annuler ». Effets (`secuDeverrouiller(k, par)`) : verrou levé,
compteur d'échecs à zéro, mot de passe provisoire neuf (celui du pirate ne marche plus), ses appareils reconnus oubliés (sa prochaine connexion sera rouge), **son téléphone reste le même** ; panneau « Mot de passe provisoire » avec la ligne verte
« Le compte de Léa est déverrouillé. Son mot de passe est remplacé : celui que connaissait le pirate ne marche plus. » ; journal « a déverrouillé le compte de Léa ». Pour un verrou de 15 minutes (cinq erreurs) : même geste, même texte avec « cinq erreurs de suite » à la place de la première phrase.

**« Déconnecter partout »** : confirmation simple « Fermer toutes les connexions de Karim ? Il devra se reconnecter avec son téléphone. » · « Déconnecter » · « Annuler » ; effet : sessions fermées (si c'est la personne connectée ici : écran du § 3.9), journal. Aucun mot de passe ne change.

**« Reposer un mot de passe provisoire »** (la personne a oublié son mot de passe) : un nouveau mot de passe provisoire est tiré (l'ancien ne marche plus), sessions fermées, téléphone INCHANGÉ ; panneau « Mot de passe provisoire » ; toast « Mot de passe provisoire reposé. À sa prochaine connexion, Karim choisira le sien. » (existant).

**Désactiver / Réactiver** (`data-eq="actif"`, `eqxDepart`) : gardés ; désactiver ferme les sessions et retire les demandes ; le téléphone n'est PAS révoqué (la personne qui revient retrouve le sien) mais ne peut plus rien approuver tant que le compte est désactivé.
**Inviter** (`data-eq="inviterok"`) : gardé ; voir 5.4.

Un administrateur ne peut agir sur lui-même que par « Mon compte » (changer son mot de passe, oublier un appareil). **Si le SEUL administrateur est verrouillé**, personne ne peut le déverrouiller dans l'application : c'est le support TeamOP, hors de l'application
(§ 13) ; le bouton du bloc « Démonstration » (§ 2.5, ligne 7) joue ce geste. L'écran de connexion ne le dit pas.

### 5.3 La case « Gérer la sécurité des connexions »

`DR_SP` reçoit `['securite', 'Gérer la sécurité des connexions', 'voir la page Sécurité, déverrouiller un compte, activer un nouveau téléphone']` ; `PROFILS.admin.sp` l'a (tout `DR_SP`), les autres profils à 0 (la valeur de départ de `copieProfil`).
Elle ouvre : la rubrique Sécurité, la carte rouge de l'écran Équipe, « Nouveau téléphone », « Déverrouiller », « Déconnecter partout ». Elle NE donne pas « Inviter », « Désactiver », « Reposer » (ceux-là suivent la case existante `comptes` ET la catégorie
« Équipe » modifier). Elle se règle dans la fiche comme les autres cases spéciales (la voie `entreprise` les affiche : `MON-ENTREPRISE-ET-DROITS.md` § 2.7). **Personne ne se donne un droit qu'il n'a pas** (règle de la voie `entreprise`) : ne pas la tester par le nom du rôle.

### 5.4 Inviter une personne

Le formulaire existant ne change pas. « Envoyer l'invitation » : garde S11 → crée la personne, **tire son mot de passe provisoire**, envoie le lien par e-mail (le texte du § 5.1 SANS mot de passe), puis ouvre le panneau « Mot de passe provisoire pour {prénom} » avec
la ligne « L'invitation est partie par e-mail (le lien et l'identifiant). Le mot de passe provisoire se remet en main propre. ». Au bouton « Terminé » : le toast existant (« Invitation envoyée à … » avec « Régler ses droits » et « Annuler »). **« Annuler » retire aussi
le compte de sécurité** (`eqxPrise` et `eqxRend` embarquent `SECU.comptes[k]` : sans ça, annuler laissait un compte-fantôme avec son mot de passe).

### 5.5 « Ouvrir l'application comme … » (déjà là, mais ouvert à tous les vents)

Gardé (S14). Effets : la session de la personne regardée s'ouvre PAR-DESSUS celle de l'administrateur, qui est mise de côté (`SECU.vraie = 'marc'`) ; **une bande fine, toujours visible, collée en haut** (`.sec-bande`, 40 px, au-dessus de tout écran sauf le téléphone) dit
« Tu vois l'application comme **Sophie**. » + bouton « Revenir à mon compte » (revient à la session de l'administrateur SANS nouvelle approbation tant qu'il n'a pas été déconnecté entre-temps ; si elle a expiré, écran de connexion). Aucune donnée du téléphone ni des
mots de passe de Sophie n'est accessible ; la personne regardée n'est pas notifiée (dit dans la phrase du panneau de garde : « Tu verras ce que Sophie voit. Elle n'est pas prévenue. Le journal garde la trace. ») ; journal « a ouvert l'application comme Sophie ». Pendant cette vue,
les gestes sensibles s'exécutent avec les droits de SOPHIE (donc le plus souvent refusés) et la re-confirmation demandée est celle de l'administrateur. Le toast existant (« Tu vois l'application comme Sophie… ») est remplacé par la bande.

---

## 6. Les gestes sensibles : une confirmation sur le téléphone, valable 5 minutes

### 6.1 Les quatorze gestes gardés (la table `SECU_GESTES`)

Règle : **un geste est sensible s'il montre ou change l'argent, la paie ou les comptes de l'équipe.** La liste est UNE TABLE du fichier (`SECU_GESTES`, clé → {motif, libellé}) ; un geste neuf de ces trois zones s'y inscrit ou n'existe pas
(un banc recense les `data-` d'écriture de ces zones, § 12). La garde se pose dans la fonction qui MONTRE ou ÉCRIT, **en première instruction après le contrôle des droits**, jamais seulement dans l'écouteur du bouton (un second chemin — menu,
recherche, raccourci — suffirait sinon) :

```js
if (!secuGarde('banque-ouvrir', () => entPanneau('banque'))) return;   // rend vrai si la fenêtre de 5 minutes est valable ; sinon ouvre la confirmation et rejoue la fonction une fois confirmé
```

| # | Clé | Écran · geste | Point d'accroche (17 novembre : relire le code) | Phrase de la fenêtre (« Pour … ») |
|---|---|---|---|---|
| S1 | `banque-ouvrir` | Mon entreprise › « Ta banque et ton comptable » : ouvrir (voir l'IBAN en entier) | `entPanneau('banque')` (carte `data-ent="carte\|banque"`) | « voir ton IBAN et ta banque » |
| S2 | `banque-enregistrer` | Mon entreprise › enregistrer l'IBAN et le BIC | `data-ent="banqueok"` | « enregistrer ton IBAN » |
| S3 | `virement-ouvrir` | Achats › « Virement groupé » : ouvrir la liste | `data-ac="virement"` | « préparer un virement groupé » |
| S4 | `virement-fichier` | Achats › « Télécharger le fichier et marquer payées » | `data-ac="virok"` | « télécharger le fichier de virement » |
| S5 | `compta-banque` | Comptabilité › onglet « Banque » (relevé, rapprochement) | cadre `prototype-comptabilite.html` (§ 6.5) ET la vue de la page principale si elle existe (`cxGroupe` › « Banque ») | « voir la banque de la comptabilité » |
| S6 | `compta-export` | Comptabilité › « Télécharger le FEC » et l'envoi à l'expert-comptable | cadre (§ 6.5) | « exporter la comptabilité » |
| S7 | `paie-fiches` | Temps de travail › Paie › « Voir et valider les fiches » (les salaires de chacun) | `data-paie="voirfiches"` | « voir les fiches de paie » |
| S8 | `paie-envoi` | Temps de travail › Paie › « Envoyer au cabinet » ; « Envoyer au cabinet de paie (CSV) » | `data-paie="envoyer"`, `data-pt="export"` | « envoyer la paie au cabinet » |
| S9 | `paie-compta` | Temps de travail › Paie › « Passer l'écriture » | `data-paie="comptabiliser"` | « passer l'écriture de paie » |
| S10 | `equipe-droits` | Équipe › changer les droits d'une personne (cases, profil) | `data-eqd`, changement de profil de la fiche | « changer les droits de {prénom} » |
| S11 | `equipe-inviter` | Équipe › « Envoyer l'invitation » ; réactiver un compte ; reposer un mot de passe provisoire | `data-eq="inviterok"`, `data-eq="actif"` (réactiver), `data-cnx="repose\|k"` | « inviter ou réactiver quelqu'un » · « reposer un mot de passe » |
| S12 | `equipe-retirer` | Équipe › désactiver un compte | `data-eq="actif"` (désactiver), `eqxDepart` | « désactiver le compte de {prénom} » |
| S13 | `equipe-telephone` | Équipe/Sécurité › « Nouveau téléphone », « Déverrouiller », « Déconnecter partout » | `secuNouveauTelephone`, `secuDeverrouiller`, `secuDeconnecter` (les boutons de la fiche et de la carte rouge de la Sécurité) | « donner un nouveau téléphone à {prénom} » · « déverrouiller le compte de {prénom} » · « déconnecter {prénom} partout » |
| S14 | `voir-comme` | Équipe › « Ouvrir l'application comme … » | `data-cnx="comme\|k"` | « voir l'application comme {prénom} » |

Ce qui n'est PAS gardé, et pourquoi (dit, jamais caché) : l'IBAN que l'entreprise imprime sur ses propres factures et devis (c'est une consigne de paiement faite pour être lue par ses clients) ; l'IBAN affiché dans « Mon espace client » (idem) ;
les virements de l'atelier de documents (il n'y fait que lire) ; **toute lecture sans effet** (le planning, une intervention). Si Justin veut davantage ou moins : la liste est une table, c'est une ligne (doute 5, § 15).

### 6.2 La fenêtre « Confirme sur ton téléphone » (`#sec-conf`)

Une couche à part, `role="dialog" aria-modal="true"`, au-dessus de TOUT sauf le téléphone ; **jamais `ouvrirPanneau`** (elle remplacerait le panneau en cours et ferait perdre ce qu'on y a tapé : le geste « Enregistrer l'IBAN » rejoué après
expiration doit retrouver ses champs). Ordinateur : carte centrée de 420 px sur un voile ; téléphone : feuille qui monte du bas (`border-radius:26px 26px 0 0`, marge de sécurité en bas). Focus piégé dans la fenêtre, `Échap` = « Annuler ».

Contenu : `h2` « Confirme sur ton téléphone » ; « Pour {phrase du geste}, OP GESTION vérifie que c'est bien toi. » ; « 1. Ouvre OP Security et tape ton code PIN. » · « 2. Tape ce nombre : » ; **le nombre** (même composant que § 3.4) ;
« Cette demande expire dans 1 min 52 s » ; `<details>` « Le téléphone n'a pas de réseau ? » (code à 6 chiffres : « Valider le code » ; ici il est ACCEPTÉ : la confirmation n'est pas une connexion inhabituelle) ; « Annuler » ; sur téléphone et iPad portrait,
la pastille « Ouvrir OP Security » dans la fenêtre.

| Événement | Résultat |
|---|---|
| bon nombre (ou bon code) | la fenêtre se ferme ; **le geste reprend là où il s'était arrêté** (le panneau s'ouvre, le fichier se télécharge, la fiche se met à jour) ; toast « C'est confirmé. Tu peux continuer pendant 5 minutes. » ; journal rien de plus (§ 4.5) |
| mauvais nombre | la demande est `échouée`, un échec compté (§ 3.6) ; la fenêtre se ferme ; **le geste est ANNULÉ, rien ne s'est passé** ; toast « Mauvais nombre : l'action est annulée par sécurité. » |
| 2 minutes sans réponse | « La demande a expiré. » + « Recommencer » (une nouvelle demande, un nouveau nombre) |
| « Annuler » / `Échap` | la fenêtre se ferme ; le geste n'a pas lieu ; rien n'est compté |
| « Ce n'est pas moi » sur le téléphone | § 4.2 : verrouillage (la fenêtre se ferme, la session aussi) |
| la personne n'a plus de téléphone activé (révoqué entre-temps) | la fenêtre dit « Ton téléphone n'est plus autorisé. Demande un nouveau téléphone à ton administrateur. » + « Fermer » |

Sur le téléphone, la carte de la demande a le titre « Confirmer une action sensible » ; adresse et appareil sont ceux de cet ordinateur ; AUCUNE raison rouge (ce n'est pas une connexion). Le téléphone s'ouvre tout seul (ordinateur large) ou s'offre par la pastille (étroit) ;
il **ne se déverrouille jamais tout seul** (c'est le sens de l'exercice).

### 6.3 « Valable 5 minutes » : la règle, en deux phrases

Une confirmation (ou la connexion approuvée, qui compte déjà pour une) ouvre une fenêtre de 5 minutes **pour TOUS les gestes sensibles de CETTE personne, dans CETTE session** ; **elle ne se prolonge pas** quand on s'en sert (5 minutes après la confirmation, la
suivante redemande, même si on vient de faire un geste). Elle est effacée à la déconnexion, au verrouillage, par « Nouveau téléphone », par l'horloge de démonstration (« +5 minutes »). Une confirmation de Marc ne vaut pas pour Julie.
Sans elle, un geste sensible NE FAIT RIEN (état avant = état après : on le contrôle). Une valeur OUVERTE par un geste (l'IBAN en entier) **se re-masque à l'expiration** : un panneau qui la montre seulement à la lecture se referme, et la ligne d'état revient à « FR•• •••• •••• 0189 » (toast « Cinq minutes ont passé : ton IBAN est de nouveau masqué. ») ; un panneau de SAISIE (modifier l'IBAN) reste ouvert avec ce que la personne a tapé — rien ne se perd — mais dit en tête « La confirmation a expiré : elle sera redemandée à l'enregistrement. », et « Enregistrer » redemande la confirmation (S2) puis rejoue l'enregistrement tel quel.

### 6.4 Ce qui est masqué par défaut

`hintIban(i)` : `FR•• •••• •••• 0189` (deux premières lettres, quatre derniers chiffres, `•` ailleurs). Il remplace l'IBAN en clair : dans « Mon entreprise » (la ligne `IBAN FR76 …` du bandeau d'état et de la carte « Ta banque et ton comptable »), et dans la liste du virement groupé (S3 : à côté de chaque fournisseur ; le fichier de S4 les contient entiers). Un bouton « Afficher l'IBAN » dans la carte déclenche S1 ; une fois la confirmation faite, le panneau de la banque montre l'IBAN entier dans un champ modifiable. **Jamais masqué** : l'IBAN imprimé sur les documents de l'entreprise (§ 6.1).

### 6.5 Le cadre de la Comptabilité (`prototype-comptabilite.html`)

Il vit dans un `<iframe>` : le parent ne voit pas ses clics. Contrat de messages (réception filtrée sur `event.source`, des deux côtés, comme l'atelier ; tout texte reçu est borné et ne sert que de clé de table) :
- cadre → page : `{ opc_sensible: { id, cle } }` où `cle ∈ { 'compta-banque', 'compta-export' }` ; il l'envoie AVANT de montrer l'onglet « Banque » (ou de lancer le FEC / l'envoi à l'expert), et ne montre rien d'autre qu'une carte « Confirmation en attente… » (« Confirme sur ton téléphone pour voir la banque. ») jusqu'à la réponse ;
- page → cadre : `{ opc_confirme: { id, ok } }` (`ok:true` : la fenêtre était valable ou vient d'être confirmée ; `ok:false` : annulée, expirée, refusée) ; sans réponse en 3 minutes le cadre revient à l'onglet précédent avec « Confirmation annulée. » ;
- ouvert SEUL (pas de parent, `parent === window`) : aucune garde, le comportement d'aujourd'hui. Les `postMessage` du cadre vers `'*'` existent déjà (`cmptParent`) : on y ajoute deux types, rien de plus.
La page n'écoute `opc_sensible` que si `event.source === document.querySelector('#cpsys iframe').contentWindow` et applique `secuGarde(cle, …)`.

---

## 7. « Mon compte » : sa propre sécurité, pour chacun

### 7.1 Où, comment

Une FICHE (`foOuvrir`, comme la fiche d'une personne), pas une rubrique : « Mon compte » s'ouvre depuis le pied du menu (la ligne du nom : le bouton existant `.cn-out` devient DEUX lignes dans le pied : « Mon compte » au-dessus, « Se déconnecter »
dessous, seulement en mode application ; le pied de la feuille « Menu » du téléphone aussi), depuis la recherche (« Mon compte », groupe « Compte ») et par « Mon téléphone (démonstration) » pour rouvrir le téléphone simulé sur les largeurs étroites (même pied).
Ce n'est PAS une rubrique du menu (`MENU-FINAL.md` a retiré « Mon compte » : on n'y revient pas, doute 3). Tout le monde y a accès, quel que soit le rôle ; elle ne montre que ce qui concerne la personne connectée (sa propre ligne de `SECU.comptes`).
La comptable seule, enfermée dans le cadre plein écran, n'a que la recherche : « laissé de côté » (§ 14).

### 7.2 Ce qu'elle contient (dans cet ordre ; sur téléphone : une colonne, des CARTES, jamais de tableau qui défile de côté)

1. En-tête : avatar, `h2` « Mon compte », nom, poste, e-mail, identifiant.
2. **« Mon téléphone »** : « OP Security est activée sur **Android de Karim** (depuis le 05/11/2026). Chaque connexion se confirme sur ce téléphone. » · « Tu as perdu ton téléphone ? Va voir ton administrateur avec une pièce d'identité : il vérifie que c'est bien toi,
   puis il active ton nouveau téléphone. Il n'existe pas de code de secours : c'est voulu, personne ne peut s'en servir à ta place. »
3. **« Mon mot de passe »** : bouton « Changer mon mot de passe » → panneau (« Mot de passe actuel » · « Nouveau mot de passe » · « Encore une fois » ; mêmes règles et mêmes messages que § 3.3 ; « Mot de passe actuel incorrect. » ; « Le nouveau mot de passe doit être différent de l'ancien. ») ;
   succès : « Mot de passe changé. Tes autres connexions ont été fermées. » ; l'empreinte et le sel sont renouvelés, `dernierPas` conservé.
4. **« Historique de mes connexions »** : les 20 dernières — date, appareil, adresse, résultat (« Connexion approuvée » · « Bloquée depuis le téléphone » · « Mauvais nombre tapé » · « Connexion fermée par sécurité » · « Annulée »), et les alertes (puces rouges :
   les raisons du § 3.5). Une ligne inhabituelle ou refusée : filet rouge ET le mot. Vide : « Aucune connexion pour l'instant. »
5. **« Appareils reconnus »** : « Une connexion depuis un autre appareil est signalée comme inhabituelle : elle doit être approuvée sur ton téléphone et le code à 6 chiffres est refusé. » ; une ligne par appareil (nom, « Première connexion », « Dernière connexion », adresse) ;
   celle de l'ordinateur en cours porte « Cet appareil » et n'a PAS de bouton ; les autres : « Oublier » (confirmation « Oublier Safari · macOS ? La prochaine connexion depuis cet appareil sera signalée comme inhabituelle. » · « Oublier » · « Annuler »).
6. **« Ce qu'il faut savoir »** (§ 7.5).

### 7.3 Les appareils reconnus (la règle)

Un appareil devient reconnu à une connexion RÉUSSIE (approuvée) depuis lui, ou à l'activation du téléphone sur lui ; il est identifié par un identifiant d'appareil propre (dans la vraie application : un cookie d'appareil dont seul le hachage est gardé ; dans la
démonstration : « cet ordinateur » ou « l'autre ordinateur » du § 3.5). Un réseau est reconnu de la même façon (une connexion réussie depuis moins de 90 jours). « Oublier » retire l'appareil ET son réseau. « Nouveau téléphone » et « Déverrouiller » oublient TOUS les appareils
de la personne. `SECU.comptes[k].appareils = [{id, nom, premiere, derniere, adresse}]`, 10 au plus (le plus ancien part).

### 7.4 Sur téléphone, sur iPad

Mon compte s'ouvre en feuille plein écran (comme les fiches) avec un bouton « ‹ Retour » de 48 px ; les cartes d'historique : la date et le résultat sur la première ligne, l'appareil et l'adresse dessous, les alertes en puces ; une adresse IPv6 de 39 signes passe à la ligne
(`overflow-wrap:anywhere`). Le bouton « Oublier » fait 44 px.

### 7.5 Le bloc « Ce qu'il faut savoir » (les limites, dites)

Titre « Ce qu'il faut savoir », en phrases courtes, au même niveau que le reste, jamais en petit gris : « Cette protection est très solide, mais aucune protection n'est parfaite. » · « Ne tape jamais un nombre que tu n'as pas demandé toi-même : si quelqu'un te le demande,
c'est une arnaque. » · « Garde ton code PIN pour toi, et ton téléphone avec toi. » · « Si tu perds ton téléphone, préviens ton administrateur tout de suite. » · « Si OP Security te montre une connexion que tu ne reconnais pas : touche « Ce n'est pas moi ». ».
**Aucun mot ne promet l'absolu** : « 100 % », « inviolable », « impénétrable », « infaillible », « garanti », « totalement sécurisé » sont refusés dans tout texte affiché ET dans le code (sonde `secu-mots`).

---

## 8. Ce qui disparaît, ce qui reste, l'état de départ, `?auto=`, la fenêtre secondaire

### 8.1 Ce qui disparaît (à retirer, pas à masquer ; un banc vérifie l'absence dans le DOM, dans le fichier et dans le rangement)

| Disparaît | Où | Remplacé par |
|---|---|---|
| `MDP_PROVISOIRE = 'Bienvenue17'` et toute ligne qui l'utilise | `cnxValider`, `cnxPremierValider`, `.cn-acces`, le texte « Copier pour lui envoyer » | un provisoire par personne (§ 5.1), jamais affiché hors du panneau et du bloc « Démonstration » |
| `MDP`, `MDP_CLE` (`opg_proto_mdp`), `cnxGarder` du mot de passe | rangement de l'appareil | rien : `SECU.comptes[k].empreinte` en mémoire (§ 3.2) |
| `SESSION_CLE` (`opg_proto_session`), la case « Rester connecté », `reste`/`data-reste` | `sessionOuvrir`, `sessionFermer`, `cnxEntrer`, `cnxPremier`, la sonde `menu-memoire.js` (ligne 45 attend `opg_proto_session === 'marc'`) | une session qui dure jusqu'à la déconnexion ou l'inactivité (§ 3.9) ; la sonde est RÉÉCRITE (§ 11, lot A6) |
| « Mot de passe : Bienvenue17 » dans la fiche d'une personne | `eqFiche` | « Provisoire : à lui remettre en main propre. » |
| le mot de passe dans le texte « Copier pour lui envoyer » | `data-cnx="copier"` | le même texte sans mot de passe (« Copier le lien et l'identifiant ») |
| toute idée de « code de secours », « code de récupération », « code de dépannage », « se connecter sans téléphone » | nulle part (jamais écrit) | « Nouveau téléphone », en personne |
| `FEN_CLE` : la personne transmise à une nouvelle fenêtre sans preuve | `fenPasse`/`fenLire` | le passage reste (même appareil, même navigateur) mais la fenêtre secondaire ne tient pas le téléphone (§ 8.5) |
| le toast « Tu vois l'application comme Sophie. Pour revenir : … » | `data-cnx="comme"` | la bande « Tu vois l'application comme Sophie. » + « Revenir à mon compte » (§ 5.5) |

### 8.2 L'état de départ de la démonstration (à recréer à chaque chargement et par « Recommencer la démonstration »)

Six comptes. Chacun a un identifiant (`marc`, `julie`, `sophie`, `karim`, `lea`, `tom` : ceux de `cnxLogin`), un mot de passe provisoire tiré au hasard (72 h), `empreinte:null`, `tel:null`, `appareils:[]`, `histo:[]`, aucun verrou. Exceptions, pour que la page Sécurité
ne soit pas vide et que Justin puisse tester sans cérémonie :
- **Karim** (`kb`) : téléphone activé il y a 12 jours (« Android de Karim », PIN `246802`), mot de passe déjà choisi (TIRÉ à chaque chargement, de la même forme que les provisoires : lisible dans le bloc « Démonstration » seulement, jamais écrit ailleurs ; `demoClair`), cet ordinateur reconnu, une connexion approuvée il y a 3 heures depuis « Safari · iPhone » (rouge : autre appareil, approuvée) ;
- **Léa** (`lr`) : téléphone activé (« iPhone de Léa », PIN `246802`), mot de passe déjà choisi (tiré de même), **compte verrouillé depuis hier à 18:02** (bloquée depuis son téléphone, « Firefox · Linux », `192.0.2.51`) : Équipe montre « Verrouillé » et la carte rouge, la Sécurité 3 chiffres non nuls ;
- **Marc, Julie, Sophie, Tom** : « Téléphone à activer ».
Les clés des téléphones (20 octets) sont tirées à chaque chargement. Les 2 « lignes d'avant » de la Sécurité (§ 4.4) sont écrites dans l'historique de Karim et de Léa. **Constantes dans UN objet `SECU_DEPART`** ; les sondes le lisent pour leur population (« 6 personnes · 2 téléphones prêts · 1 compte verrouillé »).
Le bouton « Activer tous les téléphones d'un coup » active les quatre autres (PIN `246802`, nom d'appareil du § 2.3) sans toucher aux mots de passe : les personnes devront encore choisir le leur à leur première connexion.

### 8.3 `?auto=` : local seulement, et alors sans téléphone

`?auto=<k>` (ce que `lib.ouvrir({qui})` ajoute à l'adresse) est lu au démarrage (le bloc `if (MODE_APP) { … const auto = … }`). **Nouvelle règle, UNE fonction** : `secuAutoPermis(loc)` rend vrai seulement si `loc.protocol === 'file:'` ou `loc.hostname ∈ {'127.0.0.1', 'localhost', '[::1]', '::1'}` ;
partout ailleurs (teamop.fr, claude.ai, un artefact publié, un aperçu en ligne) le paramètre est IGNORÉ : l'écran de connexion s'ouvre (sonde `secu-auto` appelle la fonction avec des adresses de toutes sortes, dont `127.0.0.1.teamop.fr` et `evil-127.0.0.1`).
Quand il passe : `sessionOuvrir(auto)` ; `SECU.sessions[k].auto = true` ; **`#opsec` n'est PAS monté** (sauf `?tel=1`, pour une sonde qui veut le voir) ; **toute confirmation est accordée d'office** (`secuGarde` rend vrai sans fenêtre) ; **pas de minuterie d'inactivité** ; les gestes de la voie
Équipe qui journalisent (« a donné un nouveau téléphone… ») restent possibles. Les sondes des autres voies (`mail-*`, `materiel-*`, `entreprise-*`, `droits-*`, `atelier-*`, campagne, menu) ne voient ni widget, ni fenêtre de confirmation, ni masque d'IBAN
(`hintIban` n'est appliqué que si une session NON auto existe : une sonde qui vérifie l'IBAN dans « Mon entreprise » le lit en clair, comme avant). **Elles doivent toutes continuer de passer** : lot A4 les rejoue (§ 11).

### 8.4 Ce qui reste de la démonstration, et comment on le dit

| Ce qui reste fictif | Comment c'est dit |
|---|---|
| aucun serveur : mots de passe, nombres, codes, verrous et empreintes se vérifient DANS la page ; la console les contourne | la première ligne du bloc « Démonstration » ; § 13 pour Justin ; **aucun écran ne parle de « sécurisé » comme d'un fait** |
| un seul appareil joue deux rôles : l'ordinateur et le téléphone (vue plein écran sur téléphone) | « Téléphone de Marc » en tête du cadre ; la pastille « Ouvrir OP Security » ; « ‹ Revenir à OP GESTION » |
| le dessin de code à scanner | la note sous le dessin (§ 3.3) |
| les adresses (`203.0.113.42`, `198.51.100.7`, `192.0.2.99`) et les appareils (« autre ordinateur ») | cases « Je me connecte depuis un autre ordinateur » / « en pleine nuit » dans un encadré « Démonstration » ; l'heure réelle n'est pas utilisée |
| l'horloge | « Faire avancer l'horloge » : +5 minutes, +15 minutes, +3 jours |
| pas de notification sur le téléphone (la vraie application n'en a pas non plus : elle passerait par Apple et Google ; la personne OUVRE OP Security) | le téléphone dit « Une demande t'attend » une fois ouvert (écran de PIN) ; § 13 |
| mots de passe provisoires LISIBLES dans le bloc | « Démonstration : en vrai, il se remet en main propre et ne s'affiche qu'une fois. » |
| un rechargement remet tout à zéro | « Recharge la page : tout repart de zéro. » |
| la fenêtre secondaire | § 8.5 |
| le support TeamOP qui déverrouille un administrateur seul | le bouton du bloc (§ 2.5) |

### 8.5 La fenêtre secondaire (« Ouvrir dans une nouvelle fenêtre »)

Le passage `{k, vue, mode}` de `fenPasse` reste (la fenêtre s'ouvre déjà connectée, comme demandé le 13 novembre). La mémoire de la page n'est pas partagée entre fenêtres : la fenêtre secondaire n'a ni le téléphone, ni les confirmations. Elle est marquée
(`SECU.secondaire = true`) ; un geste sensible s'y arrête avec le message « Pour cette action, reviens dans la première fenêtre : la confirmation sur le téléphone s'y passe. » (aucune demande créée) ; le téléphone ne s'y monte pas ; ni inactivité ni « Se déconnecter » ne touchent
la première fenêtre. Dans la vraie application, la session serait la même (même navigateur, même cookie) et le serveur déciderait : limite de démonstration, dite en § 13.

---

## 9. Les appareils : ce qui se mesure, profil par profil, jour ET nuit

Profils de `lib.js` : `mac` 1440 × 900, `mac720` 1280 × 720, `windows` 1366 × 768, `ipad` 820 × 1180 (portrait), `iphone` 390 × 844, `android` 360 × 740, `petit` 320 × 568 ; **plus l'iPad en paysage 1180 × 820** (profil ajouté par la sonde : le seul de 1100 à 1199 px, donc le seul où le cadre se pose à droite sur une tablette) et, **encoches posées**, les trois profils tactiles. Chaque écran de cette spécification est regardé (Read) sur : `mac` jour, `windows` nuit, `ipad` jour,
`iphone` jour ET nuit, `android` nuit, `petit` jour.

| Mesure | Seuil | Où |
|---|---|---|
| débordement horizontal (contre la largeur POSÉE du profil, deux lectures espacées, on interroge la page) | 0 px | tout écran de § 3 à § 7 |
| cibles tactiles (zone qui répond) | ≥ 44 × 44 px | touches du PIN (56 × 52), « Approuver », « Ce n'est pas moi », pastille, cases, « Oublier » |
| champs | police ≥ 16 px (pas de zoom d'iOS) | identifiant, mot de passe, nombre, code, PIN, nom de l'appareil |
| texte écrasé | aucun bloc de moins de 12 signes par ligne sur 4 lignes ou plus | cartes d'historique, raisons rouges, noms longs |
| le NOMBRE | entièrement lisible, ≥ 56 px de haut de chiffres, au-dessus de la pastille et de la feuille de confirmation | `petit` (320 × 568) en particulier : la carte, le nombre et la pastille tiennent sans défilement caché ; au pire la carte défile, le nombre reste en vue |
| contrastes | ≥ 4,5:1 le texte, ≥ 3:1 les bordures et pictogrammes, de jour ET de nuit, AU PIXEL sous le verre | le rouge de la boîte « inhabituelle », le bouton rond, les pastilles, le texte de la bande, la carte du téléphone |
| le téléphone et l'application ne se recouvrent pas | à 1100 px et plus, `#opsec` ne cache aucune cible utile de l'écran de connexion ni de la fenêtre de confirmation (1280 × 720 inclus) | `mac720`, `windows`, `ipad` paysage |
| aucun élément flottant sur l'application après connexion en vue étroite | 0 | `iphone`, `android`, `petit`, `ipad` portrait |
| valeurs longues | nom de 60 signes, appareil de 40, adresse IPv6 de 39, trois raisons rouges, mot de passe de 120 signes | partout où ils s'affichent ; rien ne sort, rien n'est coupé sans point de suite |
| encoches | `env(safe-area-inset-*)` posés (`Emulation.setSafeAreaInsetsOverride`) : la pastille, la feuille de confirmation et la vue du téléphone y restent en dehors | `iphone`, `android` |
| `prefers-reduced-motion` | plus de glissement, plus d'anneau qui tourne | un passage |
| clavier | le champ du nombre et du code restent visibles clavier ouvert (iPhone) | `iphone` |

Le prototype est regardé sur **cinq plateformes** (Mac, Windows, iPhone, Android, iPad) : la police du téléphone suit le système (SF Pro, Segoe UI, Roboto) ; les chiffres du nombre et du code sont à chasse fixe (`font-variant-numeric: tabular-nums` ET famille à chasse fixe)
pour ne pas sauter d'un système à l'autre.

---

## 10. Les mots (ceux de tous les jours : des artisans peu à l'aise avec l'informatique)

| On écrit | On n'écrit jamais | Pourquoi |
|---|---|---|
| « Confirme sur ton téléphone » | « Authentifie-toi », « MFA », « 2FA », « TOTP », « OTP », « second facteur » | un verbe qu'on comprend |
| « le nombre » (à 2 chiffres, à taper) · « le code à 6 chiffres » (le code qui change toutes les 30 secondes) | « code de vérification à usage unique », « challenge », « jeton » | deux choses différentes, deux mots différents : « nombre » = à taper sur le téléphone, « code » = lu sur le téléphone |
| « Approuver » · « Ce n'est pas moi » · « Bloquer » | « Autoriser », « Refuser », « Rejeter » (comme libellés de boutons) | « Ce n'est pas moi » dit ce qui se passe |
| « Connexion inhabituelle » · « Appareil jamais utilisé pour ce compte » | « anomalie », « suspecte », « risque élevé » | pas de peur gratuite |
| « Compte verrouillé » · « Déverrouiller » | « suspendu », « banni », « désactivé » (ce dernier désigne un compte coupé par l'entreprise) | un seul mot par état |
| « Nouveau téléphone » · « Téléphone à activer » | « Réinitialiser le MFA », « re-enrôler », « appairer » | |
| « Adresse » (sous « Appareil »), et « Adresse (IP) » en en-tête de colonne | « IP » seule, « géolocalisation » | on ne sait pas géolocaliser, on ne le dit pas |
| « Appareils reconnus » · « Oublier » | « appareils de confiance », « révoquer », « supprimer le jeton » | |
| « Mot de passe provisoire » · « à remettre en main propre » | « mot de passe temporaire par défaut », « initial » | |
| « Déconnecter partout » | « Révoquer les sessions », « invalider » | |
| « Valable 5 minutes » | « step-up », « ré-authentification » | |
| « Il n'y a pas de code de secours : ton téléphone est ta clé. » | toute phrase qui laisse entendre qu'un secours existe | décision 3 |
| « très solide », « aucune protection n'est parfaite » | « 100 % », « inviolable », « garanti », « infaillible », « sécurisé » (comme un fait) | décision 8 |

Mots d'ingénierie interdits dans un texte affiché : `session`, `token`, `hash`, `empreinte`, `chiffrement`, `ECDH`, `HKDF`, `PBKDF2`, `AES`, `cookie`, `authentificateur`, `2FA`, `MFA`, `TOTP`, `HOTP`, `RFC`, `IP` (seul), `serveur`, `API`, `backend`.
Exception d'UN mot : « double authentification » apparaît UNE fois, entre parenthèses, sur l'écran « Active OP Security » (c'est le mot que Justin emploie, et celui qu'on cherche sur Internet). Phrases courtes (≤ 22 mots), verbes d'action, tutoiement, une idée par phrase,
jamais de point d'exclamation, jamais de « Oups ». Les majuscules, les accents et les guillemets français (« ») comme dans le reste du prototype.

---

## 11. Les changements de code, dans l'ordre

Un seul fichier de page est touché : `apercu/prototype-op-gestion.html` (et, très peu, `apercu/prototype-comptabilite.html` au lot B5). Pas `app.html`, `beta.html`, `sw.js`, `server/`, `opcourrier.js`, `REPRISE.md`, `CLAUDE.md`.
Rien du kit n'entre dans le dépôt (il est public) : tout est réécrit dans la page d'après la norme (HOTP/TOTP de la RFC 4226/6238, SHA-256 de la FIPS 180-4) et d'après les écrans regardés. Toute poussée : `compiler-pages.js`, `verifier-syntaxe.js`, bancs 835, 836, 837, 1008, 2994,
`verif-secrets.sh` à zéro ✗ ; **et** les sondes de la voie (lot A6/B6) ; **et**, au lot A4, la rejoue des sondes des autres voies (§ 12.3).
Avant d'écrire une fonction : `grep -n "function <nom>("` (une fonction déclarée deux fois, la seconde gagne partout et en silence : règle de ce dépôt). Les noms du préfixe `secu` et `ops` sont neufs : le vérifier.

### Étape 2 (lots A) — « Le téléphone simulé, l'activation, la connexion approuvée au nombre »

| Lot | Contenu | Dépend de |
|---|---|---|
| **A1** | **Socle**. `SECU_DEMO`, `SECU_REGLES` (§ 3.6), `SECU_DEPART` (§ 8.2), `SECU` (`comptes`, `demandes`, `sessions`, `confirmeA`, `decalage`, `telCourant`, `vraie`, `secondaire`, `parcours`) en mémoire seule ; `secuMaint()` (horloge + décalage) ; `secuAleaInt(n)`/`secuAleaTexte(jeu, n)` (toujours `crypto.getRandomValues`) ; `secuSha256` (synchrone) ; `secuEmpreinte(mdp, sel)` ; `secuHotp`/`secuTotp` (HMAC-SHA1, pas de 30 s, tolérance ±1, `dernierPas`) ; `secuMdpProvisoire()` ; `secuCodeActivation()` ; `secuAppareil()` (analyseur d'agent) ; `secuAutoPermis(loc)` | rien |
| **A2** | **Le téléphone** : `#opsec` (HTML, `<style id="opsec-css">`, logo SVG réécrit `opsLogo`/`opsCadenas`), les écrans de § 2.4 (`opsDessiner()`), le cadre à droite / la vue plein écran / le bouton rond / la pastille (§ 2.2), le sélecteur « Téléphone de … », le verrouillage à 60 s, les cartes de demande, `secuVerifierNombre(demande, saisi)` (la SEULE lecture du nombre côté téléphone), le bloc « Démonstration » (§ 2.5) | A1 |
| **A3** | **La connexion** : `cnxMontrer` (retrait de « Rester connecté », phrase, `.sec-demo-cases`), `cnxValider` réécrit (§ 3.2 : sept cas), les trois écrans d'activation (§ 3.3), `cnxPremier*` (12 caractères, après l'activation), l'écran « Confirme sur ton téléphone » (§ 3.4), la boîte rouge inhabituelle (§ 3.5), les compteurs et verrous (§ 3.6), `cnxEntrer` sans `reste`, `sessionOuvrir`/`sessionFermer` (rangement retiré, § 3.8/3.9), minuterie d'inactivité, `data-cnx="oubli"` (nouveau texte) | A1, A2 |
| **A4** | **`?auto=`** (§ 8.3) : `secuAutoPermis`, `#opsec` non monté, confirmations accordées, pas d'inactivité ; `?tel=1` ; **les sondes des autres voies sont REJOUÉES** et doivent rendre les mêmes chiffres qu'avant (voir § 12.3) | A3 |
| **A5** | **Plus de mot de passe en clair** (§ 8.1) : `MDP_PROVISOIRE`, `MDP`, `MDP_CLE`, `SESSION_CLE` supprimés ; `.cn-acces` réécrit en bloc « Connexion » **sans** le panneau « Mot de passe provisoire » ni les gestes (ils sont au lot B3) mais déjà SANS mot de passe lisible et avec le texte à copier sans mot de passe | A3 |
| **A6** | **Sondes et mutations de l'étape 2** (`secu-commun.js`, `secu-structure.js`, `secu-activation.js`, `secu-nombre.js`, `secu-auto.js`, `secu-secrets.js` partie rangement, `secu-mots.js` partie A) ; **`menu-memoire.js` réécrite** (la session n'est plus rangée : la ligne 45 attend maintenant que `opg_proto_session` n'existe PAS) ; mutations du § 12.2 qui touchent la connexion, le téléphone, `?auto=` et le rangement (1 à 14, 20, 21, 24 à 27, 45 à 49, 53, 58, 60) ; captures regardées | A1 à A5 |

### Étape 3 (lots B) — « Le pirate, le verrouillage, la page Sécurité, Équipe, Mon compte, les actions sensibles »

À démarrer APRÈS la fusion de la voie `entreprise` jusqu'à ses lots D1 à D3 (`acteur()`, `droitVoit`, `peut`, `journalAjout` normalisé) : le journal et les cases s'appuient dessus. Si elle n'est pas fusionnée, on pose la case `securite` dans `DR_SP` à la main
et les gardes en première instruction, et on le DIT dans le rapport.

| Lot | Contenu | Dépend de |
|---|---|---|
| **B1** | **Le pirate et le verrouillage** : `secuPirate(k)`, `secuBloquer(k, demande)` (UNE fonction, § 4.2), `secuVolSession()`, les messages du § 3.9, les trois issues du § 4.1, avis du bloc « Démonstration » | A3 |
| **B2** | **La page Sécurité** : route `securite` (`CATS` › Personnel, `vues()`, `IC`, `MB_COURT`, `rlPastille`, `ROUTE_DROIT` si D2 est là, la recherche `palEntrees`), la case `securite` dans `DR_SP` et `PROFILS.admin`, le type `securite` de `H_TYPES`, les lignes de journal (§ 4.5), la garde de l'adresse `#securite` | B1 |
| **B3** | **Équipe** : `eqxCarte` (pastilles, puce), bandeau rouge, le bloc « Connexion » complet de la fiche (§ 5.1), panneau « Mot de passe provisoire », `secuNouveauTelephone`, `secuDeverrouiller`, `secuDeconnecter`, `reposer`, désactiver/réactiver, inviter (§ 5.4) avec `eqxPrise`/`eqxRend` qui embarquent `SECU.comptes[k]`, « Ouvrir l'application comme … » et `.sec-bande` (§ 5.5) | A5, B1, B2 |
| **B4** | **Mon compte** : le pied (`rlPied` : « Mon compte », « Mon téléphone (démonstration) », « Se déconnecter »), la fiche, l'historique, les appareils et « Oublier », « Changer mon mot de passe », « Ce qu'il faut savoir » (§ 7), la ligne de la recherche | A3, B1 |
| **B5** | **La re-confirmation** : `SECU_GESTES`, `secuGarde`, `#sec-conf` (§ 6.2), la fenêtre de 5 minutes (§ 6.3), `hintIban` et le masque (§ 6.4), les QUATORZE portes (§ 6.1 ; relire chaque point d'accroche), le protocole du cadre (§ 6.5) **dans `prototype-comptabilite.html`**, la fenêtre secondaire (§ 8.5) | B3 (S11 à S14), A3 |
| **B6** | **Sondes et mutations de l'étape 3** (`secu-pirate.js`, `secu-securite.js`, `secu-equipe.js`, `secu-compte.js`, `secu-sensibles.js`, `secu-fenetre.js`, `secu-inactif.js`, `secu-appareils.js`, `secu-mots.js` partie B, `secu-secrets.js` complet) ; les autres mutations du § 12.2 (15 à 19, 22, 23, 28 à 44, 50 à 52, 54 à 57, 59) ; une phrase au guide des nouveautés (§ 11.1) ; captures regardées sur les sept profils, jour ET nuit | B1 à B5 |

### 11.1 Les petites pièces qui touchent d'autres écrans (à ne pas oublier)

- **Guide des nouveautés** (`nv`) : une ligne « Ta connexion se confirme sur ton téléphone avec OP Security » dans « Ce qui est nouveau » (la voie « guide » de la fin ; ici seulement la phrase à lui donner).
- **L'aide de page et la visite parlée** (`PAL_MOTS`, les bulles d'aide) : « sécurité connexion téléphone nombre verrouillé » ajoutés à la recherche des rubriques « Sécurité » et « Mon compte ».
- **L'atelier de documents** (`opd_donnees`) : il reçoit `entreprise.iban` : INCHANGÉ (§ 6.1).
- **Le cadre de la Comptabilité** (`prototype-comptabilite.html`) : deux types de message (§ 6.5) ; le comportement SEUL (hors OP GESTION) est inchangé : un banc de comparaison le prouve.
- **`menu-recontrole.js`, `menu-*`** : la ligne « Sécurité » du gérant (21 lignes) et le pied à trois lignes changent leurs décomptes ; ces sondes sont rejouées et leurs chiffres mis à jour (jamais en les faisant mentir).
- **`droits-*`** (voie entreprise, quand elles existent) : la case `securite` apparaît dans la liste des cases spéciales (`DR_SP` à 8 entrées) : leurs décomptes de cases changent.

### 11.2 Les points d'accroche stables (pour les sondes), à écrire tels quels

`#opsec` (le téléphone), `#opsec [data-ops="pin-touche"][data-k]` (touches), `[data-ops="nombre-champ"]`, `[data-ops="approuver"]`, `[data-ops="pas-moi"]`, `[data-ops="bloquer"]`, `[data-ops="annuler"]`, `[data-ops="verrouiller"]`, `[data-ops="commencer"]`, `[data-ops="scanner"]`, `[data-ops="saisir-code"]`,
`[data-ops="code6"]` (le code affiché) ; sur l'ordinateur : `[data-sec="nombre"]` (le nombre, texte brut), `[data-sec="alerte-rouge"]` (la boîte inhabituelle), `[data-sec="code-activation"]`, `[data-sec="expire"]`, `#sec-conf`, `.sec-bande`, `.sec-demo`, `[data-sec-prov="karim"]` (le provisoire d'une personne dans le bloc
« Démonstration », seul endroit où une sonde le lit), `[data-sec="cases-demo"]`. **Aucune `data-` ne porte un secret** (le nombre est le TEXTE de son élément, le provisoire aussi : on les lit, on ne les range pas) ; l'état interne (`SECU`) n'est lisible depuis la console QUE si `secuAutoPermis(location)`
(`window.SECU_TEST`), jamais ailleurs.

---

## 12. Les sondes (une par promesse) et les mutations

Outil : `scratchpad/proto-final/lib.js` (`ouvrir({profil, nuit, qui, app, requete})` ; `qui:null` = on arrive sur l'écran de connexion ; `aller`, `toucher`, `gestes`, `etat`, `change`, `deborde`, `doigts`, `capture`, `v`, `bilan`). Profils `mac`, `mac720`, `windows`, `ipad`, `iphone`, `android`, `petit`
(+ iPad paysage posé par la sonde). Jour ET nuit pour tout ce qui se voit. **Chaque sonde compte sa population avant de conclure** (« 6 personnes · 14 gestes · 7 profils »), rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe ; captures hors dépôt, REGARDÉES. Un navigateur à la fois
(`timeout 580 node …`). Aucune sonde ne vise teamop.fr. Une sonde qui tombe sur un délai se rejoue avant toute conclusion (machine partagée).
Un fichier commun `secu-commun.js` : `connecter(c, id, mdp)`, `telephone(c, k)` (taper le PIN, lire les cartes, taper le nombre), `lireNombre(c)`, `provisoire(c, k)`, `activer(c, k, pin)`, `avancer(c, minutes)`, `rangement(c)` (fouille `localStorage`, `sessionStorage`, cookies, `window.name`, `location`,
noms d'IndexedDB), `etatAvant/etatApres` (`#contenu`, `#calque`, `ENTREPRISE`, `JOURNAL.length`).

### 12.1 Les sondes de la voie

| Sonde | Promesse jouée (population) |
|---|---|
| `secu-structure.js` | état de départ (6 personnes, 2 téléphones prêts, 1 compte verrouillé, 1 ligne de Sécurité de Karim, 1 de Léa) ; l'écran de connexion n'a PLUS « Rester connecté » ; le cadre est à droite à 1100 px et plus, la vue plein écran en dessous, la pastille ; aucun élément ne flotte après connexion en vue étroite ; le téléphone est sombre de jour ET de nuit ; aucun débordement, cibles ≥ 44 px, champs ≥ 16 px sur les 7 profils ; **valeurs longues** |
| `secu-activation.js` | **chaque rôle** (Marc gérant, Julie secrétariat, Sophie technicienne, Tom, plus la comptable en `profil compta` si possible) : provisoire → écran A → PIN trop simple refusé (6 cas), deux PIN différents refusés, 5 PIN faux effacent, code d'activation faux, déjà utilisé, expiré (+15 min), juste ; nom d'appareil à 60 signes et `<img onerror>` inertes ; écran B (code à 6 chiffres faux, juste, rejoué refusé) ; écran C (11 refus de mot de passe, un accepté) ; la personne entre ; cet ordinateur est reconnu |
| `secu-nombre.js` | connexion de tous les jours par le nombre : nombre dans 10–99 sur 200 tirages ; **le DOM du téléphone ne contient jamais le nombre** (30 demandes) ; bon nombre → entrée ; mauvais nombre → annulé + échec compté + message ; expiration à 2 minutes (`avancer`) ; 6 demandes puis refus ; 5 échecs → verrou de 15 minutes, +15 min le lève, le suivant dure 30 ; code à 6 chiffres accepté (habituelle), jamais deux fois le même ; mot de passe faux ×2 → raison « Plusieurs mots de passe faux » |
| `secu-inhabituelle.js` | « Je me connecte depuis un autre ordinateur » : boîte rouge ET mot, les deux raisons, carte rouge sur le téléphone, code à 6 chiffres REFUSÉ (message exact + journal), approbation → toast, ordinateur reconnu, la connexion suivante n'est plus rouge ; « en pleine nuit » (heure `03:12`) ; contrastes au pixel jour/nuit |
| `secu-pirate.js` | pirate : carte rouge avec les trois raisons ; mauvais nombre ; **bon nombre (la limite)** ; « Ce n'est pas moi » : confirmation (Annuler ne change rien, Bloquer fait les sept effets du § 4.2, comptés un par un) ; la même personne ne peut plus se connecter avec le BON mot de passe (message identique à celui d'un mauvais) ; vol de session |
| `secu-securite.js` | la page : visible pour Marc seul (Julie, Sophie, Karim non : menu, barre, recherche, `#securite` renvoie) ; les trois chiffres = les lignes ; cartes à la place du tableau à 390/360/320 ; vide ; valeurs longues ; « Déverrouiller » mène au panneau |
| `secu-equipe.js` | pastilles et puce ; bandeau rouge ; bloc « Connexion » (jamais de mot de passe lisible : fouille du DOM de la fiche pour les 6) ; panneau « Mot de passe provisoire » : UNE fois, pas de bouton Copier, effacé à « Terminé » ; « Nouveau téléphone » (case obligatoire, ancien téléphone effacé à la lecture suivante, ancien mot de passe mort, ancien code d'activation mort, nouveau code, session fermée) ; « Déverrouiller » (verrou levé, mot de passe changé, téléphone inchangé) ; « Reposer » ; « Déconnecter partout » ; inviter + « Annuler » retire le compte ; désactiver ; pas de gestes sur SA fiche ; lien par e-mail grisé si verrouillé ; seul administrateur verrouillé |
| `secu-compte.js` | Mon compte pour trois personnes (Marc, Sophie, Karim) : historique = les lignes de la personne (jamais celles d'une autre), appareils, « Oublier » (pas l'appareil en cours ; la connexion suivante est rouge), changer le mot de passe (règles, autres connexions fermées), « Ce qu'il faut savoir », aucun mot « 100 % » |
| `secu-sensibles.js` | **les quatorze gestes** : pour chacun, SANS fenêtre valable : état avant = état après (rien ne s'ouvre, rien ne s'écrit) et la fenêtre de confirmation apparaît avec SA phrase ; confirmé : le geste reprend ; mauvais nombre : annulé ; fenêtre de 5 minutes : deux gestes d'affilée sans redemander, +5 min redemande, **pas de prolongation** ; l'IBAN revient masqué ; l'enregistrement redemande ; le cadre de la Comptabilité (deux messages, source vérifiée, hors OP GESTION : aucun changement) ; **recensement** : tous les `data-` d'écriture de Mon entreprise › banque, Achats › virement, Temps de travail › Paie, Équipe sont dans `SECU_GESTES` (population nommée) |
| `secu-secrets.js` | **aucun secret nulle part** : après CHAQUE étape (activation, choix du mot de passe, connexion, pirate, déverrouillage, +5 min), fouille du rangement et du DOM (hors `.sec-demo` et hors le panneau du provisoire) pour : chaque provisoire, chaque mot de passe choisi, chaque PIN, chaque clé, chaque nombre, chaque code d'activation → 0 ; aucune `data-` n'en porte ; aucune ligne du journal non plus ; **aucun mot** `secours`, `récupération`, `recovery`, `backup`, `dépannage` dans le texte affiché NI dans le fichier de la page ; le fichier ne contient plus `Bienvenue17` ni `opg_proto_mdp` |
| `secu-auto.js` | `secuAutoPermis` sur 14 adresses (127.0.0.1, localhost, `[::1]`, `file:` : vrai ; teamop.fr, www.teamop.fr, api.teamop.fr, claude.ai, `127.0.0.1.teamop.fr`, `evil-127.0.0.1`, `localhost.evil.com`, une IP privée `192.168.0.5`, `about:blank`, `data:` : faux) ; en local : `?auto=marc` ouvre une session, pas de `#opsec`, confirmation accordée, pas d'inactivité ; `?auto=marc&tel=1` monte le téléphone ; sans `auto` : l'écran de connexion ; `?auto=` d'une personne désactivée ou inconnue : l'écran de connexion |
| `secu-mots.js` | A : les libellés exacts de l'annexe A sont présents, mot pour mot, sur leur écran ; B : aucun mot interdit (§ 10), aucune promesse d'absolu, aucun « vous », aucun « Team OP » / « Authenticator » / « Espace sécurisé » dans le texte affiché |
| `secu-appareils.js` | chaque écran de § 3 à § 7 × 7 profils × jour/nuit : débordement, cibles, champs, textes écrasés, nombre lisible au-dessus de la pastille (`petit`), encoches, mouvement réduit, clavier ; captures (`/tmp/claude-0/.../scratchpad/cap/double-auth/`) |
| `secu-fenetre.js` | « Ouvrir dans une nouvelle fenêtre » : la fenêtre secondaire s'ouvre connectée, un geste sensible s'y arrête avec le message exact, aucune demande créée, la première fenêtre intacte |
| `secu-inactif.js` | 15 minutes sans rien toucher → déconnexion et message ; un toucher remet le compteur ; le téléphone se verrouille à 60 s et en quittant la vue étroite |

### 12.2 Les mutations (≥ 40, TOUTES doivent faire tomber au moins un contrôle : `secu-mutations.py`, chacune sur une copie, `timeout=30`, `git diff` vide avant chaque poussée)

Une mutation qui ne casse rien n'est pas une victoire : on demande ce que la sonde ne regarde pas (règle de ce dépôt). Chaque mutation est vérifiée touchante (le fichier a changé exactement là ; `git diff` après).
1. le nombre n'est plus comparé (toujours juste) · 2. le nombre tiré hors 10–99 (0–99, 1–100) · 3. le téléphone affiche le nombre · 4. un mauvais nombre n'annule pas la demande · 5. un mauvais nombre ne compte pas d'échec · 6. la demande n'expire jamais ·
7. 6 demandes max retiré · 8. le code à 6 chiffres accepté en connexion inhabituelle · 9. « autre ordinateur » non détecté · 10. « pleine nuit » non détecté · 11. les mots de passe faux juste avant non détectés · 12. 5 échecs ne verrouillent pas ·
13. le verrou ne double pas · 14. un compte verrouillé répond autrement (fuite) · 15. « Ce n'est pas moi » ne verrouille pas · 16. ne ferme pas la session · 17. ne retire pas les autres demandes · 18. « Déverrouiller » garde l'ancien mot de passe ·
19. « Déverrouiller » garde les appareils reconnus · 20. le provisoire reste valable après le choix du mot de passe · 21. le provisoire ne meurt jamais (72 h) · 22. « Nouveau téléphone » ne révoque pas l'ancien · 23. l'ancien code d'activation reste valable ·
24. un code d'activation sert deux fois · 25. un code expiré (15 min) accepté · 26. un PIN faible accepté · 27. 5 PIN faux n'effacent pas · 28. la fenêtre de 5 minutes ne s'éteint jamais · 29. la fenêtre se PROLONGE à chaque geste ·
30. la confirmation accorde sur un mauvais nombre · 31–44. **une mutation par geste gardé** : la garde de S1, S2… S14 retirée (14 mutations) · 45. `?auto=` accepté partout (test d'hôte retiré) · 46. `?auto=` monte le téléphone · 47. le mot de passe choisi rangé dans `localStorage` ·
48. un lien « code de secours » ajouté · 49. `Bienvenue17` rétabli · 50. la Sécurité visible sans la case · 51. « Oublier » laisse l'appareil reconnu · 52. le vol de session non détecté · 53. la boîte rouge retirée (inhabituelle affichée comme normale) · 54. l'IBAN toujours clair ·
55. l'IBAN ne se re-masque pas à l'expiration · 56. un administrateur se déverrouille lui-même · 57. la case « J'ai vérifié l'identité en personne » ignorée · 58. un secret dans une `data-` · 59. « Annuler l'invitation » laisse le compte · 60. le texte à copier contient le provisoire.
Le contrôle d'avant-mutation : toutes les sondes vertes sur la copie intacte (sinon la mutation « tombe » pour de mauvaises raisons).

### 12.3 Les sondes des autres voies : elles doivent passer SANS changement

`?auto=` reste ce qu'il était pour elles. Lot A4 rejoue, depuis l'arbre de cette voie, au moins : `compiler-pages.js`, `entreprise-tout.sh`, `mail-tout.sh`, `materiel-*`, `atelier-tout.sh`, `menu-*` (`menu-memoire.js` est RÉÉCRITE, pas rejouée), les sondes `campagne/` et `securite/injection-*.js`, et dit
dans le rapport « n sondes rejouées, mêmes chiffres qu'avant » (ou la liste de ce qui a bougé, avec la raison). Si une sonde change à cause de la double authentification (le pied du menu à trois lignes, la ligne « Sécurité »), on met à jour SON chiffre et on le dit ; on ne la fait pas mentir.

### 12.4 Contrôles d'étape

`node scratchpad/proto-final/sondes/compiler-pages.js` ; `node scripts/verifier-syntaxe.js` ; `node tests/test-835.js`, `test-836.js`, `test-837.js`, `test-1008.js`, `test-2994.js` ; `bash scripts/verif-secrets.sh` (⚠️ les provisoires sont TIRÉS à l'exécution : aucun n'est écrit dans le fichier, pas même ceux de Karim et de Léa ; seul le PIN de départ `246802`, déclaré fictif dans `SECU_DEPART`, y est écrit) ; les sondes `secu-*` ; aucun processus `chrome` laissé (`pgrep -f chrome`).

---

## 13. Ce que seul le serveur de la vraie application garantira (pour Justin)

Le prototype montre COMMENT ça se vit. Il ne protège rien. Ce qui suit n'existera que sur le serveur, et c'est ce qui rend la protection réelle :

1. **Vérifier les mots de passe** (haché avec un algorithme lent, comparé en temps constant), **compter les échecs** et **verrouiller** : côté serveur, pas dans la page. Le prototype le fait dans la page : on le contourne en une ligne.
2. **Les clés du téléphone** : l'échange de clés entre le téléphone et le serveur (la clé secrète n'est ni affichée ni transmise), les requêtes **signées** par le téléphone (horodatées, à usage unique, anti-rejeu) ; le prototype joue avec une clé tirée dans la page.
3. **Le nombre ne quitte jamais le serveur** : il n'est jamais envoyé au téléphone. Dans le prototype, le même objet le tient pour les deux écrans.
4. **La fenêtre de 5 minutes se décide au serveur, route par route** : une personne qui contourne l'écran n'obtient rien, parce que c'est l'API qui refuse un geste sensible sans confirmation récente. Dans le prototype, c'est l'écran qui la garde : ce n'est qu'une image.
5. **Les droits** (qui voit la banque, la paie, la page Sécurité, qui peut donner un nouveau téléphone) : décidés par le serveur à chaque appel, jamais par ce que l'écran montre.
6. **Les vraies adresses et les vrais réseaux** : lues par le serveur derrière le proxy (jamais l'en-tête fourni par le client), regroupées par réseau ; « autre appareil » par un cookie d'appareil dont seul le hachage est gardé ; l'heure et le fuseau (Europe/Paris) réels pour « hors horaires ». Le prototype les fait dire par des cases.
7. **Les sessions** : jeton tiré au hasard dont seule l'empreinte est gardée ; cookie `HttpOnly`, `Secure`, `SameSite=Strict` ; durée (15 minutes d'inactivité, 8 heures au plus : doute 6) ; liées au navigateur (un cookie rejoué ailleurs est refusé et journalisé : le vol de session) ; fermées par le serveur partout à la fois.
8. **Le journal infalsifiable** (chaîné) et son contrôle : le prototype n'affiche PAS « intégrité vérifiée » (la référence le faisait : ce serait une fausse affirmation ici).
9. **HTTPS obligatoire**, en-têtes de sécurité, protection CSRF, limitation de débit par adresse, même réponse et même durée que le compte existe ou non (pas d'énumération).
10. **Les comptes des PERSONNES** : dans la vraie OP GESTION, les comptes des employés ne vivent pas sur le serveur aujourd'hui (la connexion se vérifie dans la page, l'annuaire est publié, la base de chaque entreprise est chiffrée, `{t, kh}` cloisonne par ENTREPRISE). La double authentification demande d'abord des comptes de
    personnes côté serveur : c'est un chantier à part, à concevoir (et à relier à la décision du 22 septembre : OP MESSAGES aura son propre serveur et des comptes de personnes aussi).
11. **Le cas de l'administrateur seul verrouillé** : une procédure du support TeamOP (identité vérifiée, hors de l'application) ; le prototype la joue par un bouton.
12. **Les applications des boutiques** : les routes `activate`, `poll`, `respond`, les origines natives `capacitor://localhost` et `https://localhost`, la page de confidentialité et d'aide, le serveur de démonstration pour les examinateurs : tout cela est de la PRODUCTION (`server/`, le site) et ne se fait pas sans une phrase de Justin.
13. **Les limites qu'aucune technique n'enlève** (à dire, jamais à cacher) : un téléphone volé dont le PIN est connu ; un employé piégé qui tape le nombre d'un faux site ; un administrateur trompé lors d'un « Nouveau téléphone » ; un serveur compromis ; pas de notification (la personne doit ouvrir OP Security : passer par Apple et
    Google serait une dépendance de plus) ; un même téléphone qui porte OP GESTION ET OP Security (le technicien) ; un test d'intrusion avant la mise en production, recommandé par le kit lui-même.

---

## 14. Ce qui est laissé de côté (dit, jamais caché)

- **Les sessions ouvertes, appareil par appareil** (la liste « Mes connexions ouvertes » avec « Fermer » du kit) : « Déconnecter partout » suffit au prototype ; à construire avec le serveur.
- **« Mon compte » pour la comptable seule** (enfermée dans le cadre plein écran) : accessible par la recherche seulement ; une ligne de plus dans la barre du cadre, si Justin le veut.
- **Un vrai code à scanner** (§ 3.3) : un encodeur QR de 150 lignes pour ne scanner avec rien. À faire le jour où une vraie application du téléphone est branchée à un vrai serveur.
- **Plusieurs téléphones par personne** : un seul (le kit aussi).
- **Les administrateurs multiples qui se déverrouillent entre eux** : possible dès deux administrateurs ; non joué plus loin que « un administrateur déverrouille un autre ».
- **La langue du téléphone** : français seulement (le prototype l'est).
- **Le mode « Rôle simulé » de la référence** : remplacé par de vraies connexions et « Ouvrir l'application comme … ».
- **La page « Audit » de la référence** : remplacée par l'« Historique » existant (type « Sécurité »), sans la phrase « chaîne cryptographique intacte » (fausse ici).
- **Les e-mails envoyés** (invitation, lien de mot de passe) : montrés par un toast, rien ne part (comme tout le prototype).
- **L'IBAN d'un client ou d'un fournisseur** : le prototype n'en range pas (« Les IBAN viennent des fiches fournisseurs » est une phrase, pas une donnée) ; seuls l'IBAN de l'entreprise et le fichier de virement existent.
- **Un compte de PERSONNE qui n'est pas de l'équipe** (le client de « Mon espace client ») : il n'a pas de double authentification (il se connecte par un lien, hors périmètre de la décision 2).

---

## 15. Doutes à dire à Justin (« s'il y a des doutes, tu me dis »)

1. **Le ton.** Le prototype de référence, que tu as validé, et l'application OP Security des boutiques disent « vous ». OP GESTION dit « tu ». J'ai choisi « tu » dans le prototype. Avant de publier les boutiques, `app.js` d'OP Security (les textes `Saisissez votre code PIN`, `Visez le code d'activation`…) doit être réécrit dans le même ton
   et recompilé ; elle dit aussi « Team OP » et « Espace sécurisé » à plusieurs endroits (accueil, barre, activité) : à remplacer par « OP GESTION ». Je ne touche pas au kit.
2. **12 caractères pour le mot de passe** (ta référence et le kit) au lieu de 8 (ce que le prototype demandait). Avec le téléphone par-dessus, 8 suffiraient sans doute ; 12 gêne un artisan qui tape sur un téléphone. Ta décision : 12 par défaut ; changer est un chiffre (`SECU_REGLES`).
3. **Le menu change à trois endroits**, alors que tu l'as validé : une ligne « Sécurité » pour le gérant (21 lignes), « Mon compte » et « Mon téléphone (démonstration) » dans le pied (qui passe de une à trois lignes). Alternative : « Sécurité » comme onglet de l'écran Équipe, sans ligne de plus.
4. **Le dessin de code à scanner** est un dessin déclaré, pas un vrai code (personne ne pourrait le scanner utilement : aucun vrai téléphone n'est branché au prototype). Si tu veux un vrai, c'est ~150 lignes.
5. **La liste des quatorze gestes sensibles** est un choix à moi : l'IBAN et la banque, la paie, les comptes de l'équipe. Ne sont PAS gardés : les fiches clients, les factures, les devis, les interventions. À ajouter ou retirer : une ligne de la table (`SECU_GESTES`). Le lien « Ouvrir l'application comme … » est gardé et journalisé : c'est une porte dans la vie de quelqu'un.
6. **Combien de temps dure une connexion ?** Le kit dit 15 minutes sans rien toucher et 8 heures au plus : sur un téléphone de terrain, ça veut dire retaper le mot de passe ET le nombre souvent. J'ai retiré « Rester connecté » (il rangeait le mot de passe en clair) et simulé 15 minutes. Une idée à toi : garder la connexion plus longtemps SUR un appareil
   reconnu (30 jours) et redemander le téléphone seulement pour un nouvel appareil et pour les gestes sensibles. C'est une décision de produit.
7. **L'administrateur seul verrouillé** n'a personne pour le déverrouiller dans l'application. Il faut une procédure de secours humaine hors de l'application (le support TeamOP, identité vérifiée). Je ne l'ai pas inventée ; le prototype la joue par un bouton marqué « démonstration ».
8. **Le code à 6 chiffres** (« Le téléphone n'a pas de réseau ? ») : ce n'est pas un code de secours, c'est le code qui change toutes les 30 secondes sur le téléphone, accepté seulement pour une connexion habituelle. Il t'a plu dans la référence. Si tu veux « le nombre OU rien », on le retire (une ligne) ; un téléphone sans réseau ne pourrait plus se connecter.
9. **Les comptes des personnes** : aujourd'hui OP GESTION connaît des ENTREPRISES, pas des PERSONNES côté serveur (§ 13, point 10). La vraie double authentification commence par là, et rejoint la décision du 22 septembre (OP MESSAGES aura des comptes de personnes). Je n'écris rien là-dessus avant ta phrase.
10. **Le mot de passe oublié par e-mail** (« Envoyer un lien de mot de passe » dans Équipe) : je l'ai gardé pour un compte NORMAL (le téléphone protège encore la connexion) et désactivé pour un compte verrouillé. Tu peux préférer qu'aucun lien par e-mail n'existe : alors c'est toujours « mot de passe provisoire en main propre ».
11. **Les « horaires habituels »** (7 h – 21 h, heure de Paris) viennent du kit. Une entreprise de terrain qui commence à 6 h ou finit à 22 h verrait ses propres gens signalés en rouge. À régler par entreprise dans la vraie application.
12. **Léa verrouillée et Karim activé au départ de la démonstration** : c'est pour que la Sécurité ne soit pas vide et que tu testes sans cérémonie. « Recommencer la démonstration » remet cet état.
13. **Une connexion inhabituelle approuvée par le bon nombre d'un pirate** est jouée (§ 4.1) : c'est la limite principale, et la page te la montre. Si tu préfères ne pas montrer l'échec, c'est un bouton de moins.
14. **La comptable seule** n'a pas « Mon compte » dans son cadre plein écran (§ 14).
15. **Le prototype publié (l'artefact)** : `?auto=` n'y fonctionne plus (c'est voulu : un accès sans téléphone n'existe pas). Les sondes continuent d'entrer en local.

---

## Annexe A — Les phrases témoins (la sonde `secu-mots.js` les cherche mot pour mot)

**Connexion** : « Accès réservé à l'équipe. Après ton mot de passe, tu confirmes sur ton téléphone avec OP Security. » · « Identifiant ou mot de passe incorrect, ou compte verrouillé. Si tu es sûr de toi, préviens ton administrateur. » ·
« Ton mot de passe provisoire a expiré. Demande-en un nouveau à ton administrateur. » · « Trop de demandes de connexion. Attends quelques minutes avant de réessayer. » · « Demande à l'administrateur de ton entreprise de te donner un nouveau mot de passe provisoire : il le fait dans Équipe, sur ta fiche. Pense à lui montrer une pièce d'identité. »
**Activation** : « Active OP Security » · « À partir de maintenant, chaque connexion se confirme sur ton téléphone. C'est obligatoire pour tout le monde, y compris le gérant. (C'est ce qu'on appelle la double authentification.) » · « Installe OP Security sur ton téléphone » · « Ouvre-la et choisis un code PIN » ·
« Scanne ce code d'activation » · « Il ne sert qu'une fois et expire dans 15 minutes. Il ne contient aucun secret. » · « J'ai activé l'application » · « Dernière étape » · « Il n'y a pas de code de secours : ton téléphone est ta clé. » · « Enregistrer et entrer » · « Trop court : 12 caractères au minimum, sans compter les espaces. »
**Confirmation** : « Confirme sur ton téléphone » · « Cette page se met à jour toute seule dès que tu as approuvé. » · « Le téléphone n'a pas de réseau ? » · « Connexion inhabituelle détectée » · « L'approbation sur le téléphone est obligatoire. » · « Connexion inhabituelle : seul le téléphone peut l'approuver, pas le code à 6 chiffres. » ·
« Mauvais nombre tapé sur le téléphone : la connexion a été annulée par sécurité. » · « Appareil jamais utilisé pour ce compte » · « Réseau (adresse) jamais utilisé » · « En dehors des heures de travail habituelles (7 h – 21 h) » · « Plusieurs mots de passe faux juste avant ».
**Téléphone** : « Choisis un code PIN » · « Confirme le code PIN » · « Activer ce téléphone » · « Scanner le code d'activation » · « Tape le nombre affiché sur l'écran de l'ordinateur : » · « Approuver » · « Ce n'est pas moi » · « Bloquer cette connexion ? Ton compte sera verrouillé et toutes tes connexions fermées. Un administrateur devra changer ton mot de passe. » ·
« Mauvais nombre : la demande est annulée par sécurité. » · « Confirmer une action sensible » · « Code à 6 chiffres (si l'ordinateur le demande) » · « Trop de codes PIN erronés : le compte a été effacé de ce téléphone. Demande à un administrateur de te donner un nouveau téléphone. »
**Verrouillage** : « Tes connexions ont été fermées : une connexion a été bloquée depuis ton téléphone. Ton compte est verrouillé jusqu'à ce qu'un administrateur change ton mot de passe. » · « Par sécurité, ta connexion a été fermée : elle a été utilisée depuis un autre navigateur. Reconnecte-toi. » · « Tu as été déconnecté : 15 minutes sans rien toucher. Reconnecte-toi. »
**Sécurité** : « Sécurité » · « Qui s'est connecté de façon inhabituelle ou s'est fait refuser, et quels comptes sont verrouillés. » · « Comptes verrouillés » · « Rien d'inhabituel pour l'instant. » · « Gérer la sécurité des connexions ».
**Équipe** : « Connexion » · « Provisoire : à lui remettre en main propre. » · « Nouveau téléphone » · « Déverrouiller » · « Déconnecter partout » · « J'ai vérifié l'identité de Karim en personne » · « Mot de passe provisoire pour Karim » · « Remets ce mot de passe à Karim en main propre, après avoir vérifié son identité. » ·
« Valable 72 heures (jusqu'au 20/11 à 14:32). Il ne sera plus affiché. » · « Il n'existe pas de code de secours : c'est voulu. » · « Pour ton propre compte, demande à un autre administrateur. » · « Tu vois l'application comme Sophie. » · « Revenir à mon compte ».
**Gestes sensibles** : « Pour voir ton IBAN et ta banque, OP GESTION vérifie que c'est bien toi. » · « Cette demande expire dans » · « Mauvais nombre : l'action est annulée par sécurité. » · « C'est confirmé. Tu peux continuer pendant 5 minutes. » · « Cinq minutes ont passé : ton IBAN est de nouveau masqué. » ·
« Pour cette action, reviens dans la première fenêtre : la confirmation sur le téléphone s'y passe. »
**Mon compte** : « Mon compte » · « Mon téléphone » · « Historique de mes connexions » · « Appareils reconnus » · « Oublier » · « Changer mon mot de passe » · « Mot de passe changé. Tes autres connexions ont été fermées. » · « Ce qu'il faut savoir » · « Cette protection est très solide, mais aucune protection n'est parfaite. » ·
« Ne tape jamais un nombre que tu n'as pas demandé toi-même : si quelqu'un te le demande, c'est une arnaque. »
**Démonstration** : « Rien de ceci n'existe dans la vraie application. Recharge la page : tout repart de zéro. » · « Je me connecte depuis un autre ordinateur » · « Je me connecte en pleine nuit » · « Simuler une connexion pirate » · « Simuler le vol de ma connexion » · « Faire avancer l'horloge » · « Recommencer la démonstration ».

## Annexe B — Les données (en mémoire, jamais rangées), pour que l'étape 2 n'ait pas à les deviner

```js
SECU = {
  comptes: { [k]: {
    id: 'karim', prov: 'Kj9eNX-F2arrv-V93Rdf' | null,        // le clair, SEULEMENT tant que la personne n'a pas choisi le sien (lu par le bloc Démonstration) ; `demoClair` : le clair de Karim et de Léa au départ
    provJusqua: ts, sel: '…', empreinte: '…' | null,          // SHA-256 salé du mot de passe choisi
    echecs: 0, dernierEchec: ts, verrou: null | { le: ts, par: 'telephone'|'echecs', jusqua: ts|null, n: 1 },
    tel: null | { nom: 'Android de Karim', cle: Uint8Array(20) /* variable de fonction, jamais dans le DOM */, pinEmpreinte, pinEssais: 0, activeLe: ts,
                  etat: 'verrouille'|'ouvert'|'efface', revoque: false, dernierPas: 0, derniereActivite: ts },
    codeActivation: { code: 'XXXXXXXXXXXX', jusqua: ts, servi: false } | null,
    appareils: [{ id, nom, premiere, derniere, adresse }],      // 10 au plus
    histo: [{ ts, appareil, adresse, raisons: [], resultat: 'approuvee'|'bloquee'|'nombre'|'code'|'fermee'|'annulee' }]   // 20 au plus
  } },
  demandes: [{ id, k, motif: 'connexion'|<clé de SECU_GESTES>, source: 'ici'|'pirate', appareil, adresse, raisons: [], ts, jusqua,
               nombre /* LU par secuVerifierNombre et l'écran de l'ordinateur, par rien d'autre */, etat: 'attente'|'approuvee'|'refusee'|'echouee'|'expiree'|'annulee' }],
  sessions: { [k]: { debut, appareilId, auto: false, derniereActivite } },
  confirmeA: { [k]: ts }, decalage: 0 /* ms */, telCourant: 'marc', vraie: null | 'marc', secondaire: false, parcours: new Set()
};
```
La démonstration ne fait jamais `JSON.stringify(SECU)` : un banc refuse `stringify` sur cet objet et sur `SECU.comptes`.

## Annexe C — Ce qui diffère du prototype de référence que tu as validé (et pourquoi)

| Référence | Ici | Raison |
|---|---|---|
| « vous », « Team OP », « Espace sécurisé », adresse `securite.team-op.fr` | « tu », « OP GESTION », aucune adresse inventée | cohérence avec l'application ; une adresse qui n'existe pas serait un mensonge |
| un seul téléphone (Alice) | un téléphone PAR personne, sélecteur « Téléphone de … » | l'équipe a six personnes |
| sélecteur « Rôle simulé » | de vraies connexions + « Ouvrir l'application comme … » (gardé, journalisé, avec bande) | le rôle se prouve par la connexion |
| case « autre ordinateur » dans le formulaire de connexion | dans un encadré « Démonstration » sous la carte, répétée dans le bloc | la vraie connexion ne l'aurait pas |
| boutons « Simuler… » en bandeau en haut | dans le bloc « Démonstration » du téléphone | l'application reste l'application |
| `Rôle simulé`, page « Audit » avec « chaîne cryptographique intacte » | « Historique » existant, type « Sécurité » ; aucune phrase d'intégrité | on n'affiche pas ce qu'on ne peut pas prouver |
| téléphone qui reste déverrouillé | verrouillage après 60 s et en quittant la vue | comme la vraie application |
| mot de passe de 12 caractères + mots courants | idem (liste étendue aux mots de l'entreprise) | — |
| mot de passe provisoire affiché sur l'écran de connexion | un provisoire par personne, panneau unique, bloc « Démonstration » | décision 7 |
| aucune case de vérification d'identité | case « J'ai vérifié l'identité de … en personne » | la décision 3 le demande en toutes lettres |
| pas d'horloge | « Faire avancer l'horloge » (+5 min, +15 min, +3 jours) | on ne peut pas attendre 72 heures |
| pas de mode hors réseau | case « Le téléphone n'a pas de réseau » | pour jouer le code à 6 chiffres |
| pas de vol de session | « Simuler le vol de ma connexion » | l'action `session.hijack_suspected` du kit doit se voir |
