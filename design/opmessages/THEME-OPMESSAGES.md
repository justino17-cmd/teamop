# THEME — OP MESSAGES (référence pour Claude Code)

**Thème « 100 % Apple » — décision de Justin, 5 octobre 2026.** À « 100 % Apple, c'est quoi ? », il a répondu « 2 et 3 » : les
couleurs SYSTÈME d'Apple (fonds plats, listes groupées, séparateurs, typographie HIG) avec le BLEU DU LOGO pour l'accent et la bulle
envoyée, **et** le verre Liquid Glass d'iOS 26 (barres et boutons en capsules de verre qui flottent au-dessus du contenu). Et « Apple
partout » : le même dessin sur iPhone, Android, Mac et Windows — seule la police suit l'appareil.
La NUIT n'est pas le noir d'iOS (Justin, même jour : « je préfère un mode bleu comme on a, mais un peu plus sombre pour pas que
ça abîme les yeux, vraiment à l'Apple, mais pas du noir — c'est trop connu pour trop d'applications ») : un bleu nuit uni.
Il remplace le thème du paquet de design (dégradé bleu nuit et diagonale à 112°), rangé dans `design/archives/THEME-OPMESSAGES-2026-09-29.md`.
Les écrans, les fonctions et les mesures plus bas restent ceux du paquet (maquette `sources/OP Messages Apple.dc.html`, absente du dépôt).

## Couleurs (couleurs système d'Apple, accent au bleu du logo OP MSG, nuit en bleu nuit)
| Jeton | Jour | Nuit |
|---|---|---|
| fond écran | #f2f2f7 uni (systemGroupedBackground) | #0b1633 uni (bleu nuit) |
| texte | #000000 | #ffffff |
| secondaire | rgba(60,60,67,.6) | rgba(220,228,250,.6) |
| accent (liens, icônes, onglet actif) | #2a4a9c | #7ea2f0 |
| fill (bulles envoyées, boutons) | #2a4a9c | #3b63c4 |
| fillSoft (fonds teintés) | rgba(42,74,156,.12) | rgba(126,162,240,.2) |
| carte | #ffffff | #16244b |
| champ / recherche | rgba(118,118,128,.12) | rgba(120,140,200,.18) |
| bulle reçue | #e9e9eb / texte #000000 | #203262 / blanc |
| barre nav | rgba(255,255,255,.78) | rgba(14,26,58,.74) |
| barre d'onglets | rgba(255,255,255,.72) | rgba(22,36,76,.62) |
| onglet actif | bulle rgba(118,118,128,.16), texte #2a4a9c | bulle rgba(255,255,255,.14), texte #c7d6fb |
| séparateur | 0.5px rgba(60,60,67,.29) | 0.5px rgba(120,140,200,.26) |
Statuts : manqué #ff453a · en ligne / parle #30d158 · quitter #ff453a. Avatars : dégradés (bleu royal #4f78d6→#2a4a9c, orange→rose, vert→bleu, violet→indigo, gris, cyan→indigo).
Le fond est UNI, comme les applications d'Apple : plus de dégradé ni de diagonale (`--screen: none`). De nuit, le bleu nuit #0b1633
(plus sombre que l'ancien thème, jamais du noir) ; une surface qui s'élève est PLUS CLAIRE (carte #16244b, bulle, feuille, bannière),
jamais plus sombre. Le blanc y fait 15:1 sur la carte, le gris de légende ≥ 5:1.

## Jetons système (valeurs d'Apple, HIG — lues telles quelles par `tests/test-856.js`)
| Jeton CSS | Jour | Nuit |
|---|---|---|
| --faint | rgba(60,60,67,.3) | rgba(220,228,250,.3) |
| --input-bg | #ffffff | rgba(120,140,200,.18) |
| --line | 0.5px solid rgba(60,60,67,.29) | 0.5px solid rgba(120,140,200,.32) |
| --shadow-bar | 0 8px 28px rgba(0,0,0,.1), 0 1px 3px rgba(0,0,0,.06) | 0 8px 28px rgba(0,0,0,.45), 0 1px 3px rgba(0,0,0,.3) |
| --verre-reflet | inset 0 1px 0 rgba(255,255,255,.9), inset 0 -1px 0 rgba(255,255,255,.35), inset 0 0 0 .5px rgba(255,255,255,.55) | inset 0 1px 0 rgba(255,255,255,.2), inset 0 -1px 0 rgba(255,255,255,.06), inset 0 0 0 .5px rgba(255,255,255,.1) |
| --seg-track | rgba(118,118,128,.12) | rgba(120,140,200,.22) |
| --seg-knob | #fff | #3d4f80 |
| --sidebar | rgba(255,255,255,.5) | rgba(14,26,58,.6) |
| --sheet | rgba(242,242,247,.94) | rgba(18,31,66,.94) |
| --sheet-bg | rgba(242,242,247,.94) | rgba(18,31,66,.94) |
| --notif-bg | rgba(255,255,255,.82) | rgba(28,44,90,.84) |
| --toggle-off | rgba(120,120,128,.16) | rgba(120,140,200,.3) |
| --group-r | 22px | 22px |
| --handle | rgba(0,0,0,.72) | rgba(255,255,255,.8) |
| --tab-active-shadow | inset 0 1px 0 rgba(255,255,255,.5) | inset 0 1px 0 rgba(255,255,255,.12) |

## Verre (Liquid Glass, iOS 26)
`backdrop-filter: blur(30px) saturate(180%)` sur barres et panneaux ; barre d'onglets `blur(24px) saturate(200%)` ; réunion : panneaux `rgba(255,255,255,.12)` + bord `.18`.
Une vitre Liquid Glass, c'est trois choses ensemble : une teinte LÉGÈRE (la couleur de la barre), le flou de ce qui passe dessous, et
un REFLET sur l'arête (`--verre-reflet` : un trait clair en haut, un plus faible en bas, un filet tout autour) — c'est lui qui dessine
le bord, pas un trait gris. La barre d'onglets est une capsule qui FLOTTE (ombre `--shadow-bar` + reflet), l'onglet actif une lentille
grise translucide, son icône et son libellé à l'accent — de nuit un bleu plus clair (#c7d6fb) : la sonde a lu #9db8f5 à 3,9:1
au pixel quand la liste colorée défile sous la capsule. Respecter `prefers-reduced-transparency` (aplat plein, sans flou) et `prefers-reduced-motion`.

## Typo (HIG)
Large Title 34/41 (.37) · nom de conversation 17 semibold · aperçu 15/20 · heure 15 · légendes 11–13 · bulles 17/22 (-.02em). Onglets 11 (Android 12). Rien sous 11 px. SF sur Apple, Roboto sur Android, Segoe UI sur Windows.

## Fonctions (toutes présentes dans la maquette, à brancher sur de vraies données)

### Messages
- Liste : épinglés, point non-lu, aperçu 2 lignes ; bouton **Groupe** en haut à droite.
- **Groupes (façon WhatsApp)** : feuille « Nouveau groupe » — photo, nom, recherche, liste « Contacts de l'entreprise » à cocher (compteur n / total), membres choisis en puces avatar avec ✕, réglages (messages éphémères, « Seuls les admins écrivent »). **Créer** → le groupe apparaît en tête des conversations (« Nom (n) · Vous avez créé le groupe · prénoms ») et chaque membre reçoit une notification « Vous avez été ajouté au groupe … ».
- Conversation : bulles 17/22, photos, vocal (forme d'onde), « Lu », saisie en cours, champ Message + flèche, micro. Icône caméra → appel vidéo du groupe.

### Appels
- Historique (Tous / Manqués), manqués en rouge, icônes entrant / sortant / vidéo, bouton info.
- **Nouvel appel** → sélecteur de contacts + choix **Audio / Vidéo** → appel de groupe audio (écran d'appel) ou réunion vidéo (grille).
- **Écran d'appel** : avatar, nom, durée ; commandes Silence · Haut-parleur · **Caméra** · Clavier · Ajouter · Message ; raccrocher rouge. **Caméra** bascule en vidéo : flux du correspondant plein écran, vignette « Vous » avec retournement, barre d'état colorée comme la vidéo.

### Réunions (parité Zoom)
- **Agenda** : semaine (◂ ▸), jour sélectionné, liste des réunions du jour (heure, titre, avatars, rappel, « Rejoindre » si en cours) ; fiche détail (date, répétition, lien copiable, invités avec statut, rappels 15 min / 1 h / la veille / push, Supprimer).
- **Programmer** (bouton + tuile) : titre, lieu / lien visio, début, fin, répétition, **invités** à cocher (compteur), **rappel** (Aucun · 5 min · 15 min · 1 h · 1 jour), interrupteur **« Notifier les invités »**. **Ajouter** → la réunion se place au bon jour de l'agenda et une notification descend : « Vous avez été ajouté à “…” — date heure. Invitation envoyée à … ».
- **En réunion** : Galerie / Intervenant, titre + REC + durée + nombre, Quitter ; bannières salle d'attente (Admettre / Refuser) et « Vous partagez votre écran » ; tuiles : contour vert = parle, micro coupé rouge, Main levée, épingle, « Caméra désactivée ». Panneau : Micro · Caméra · **Partager** (Écran, Photos, Tableau blanc, Document, 2ᵉ caméra, Lien web) · **Participants** (statuts, Inviter = lien, Tout couper, salle d'attente) · **Plus** (Discussion, Sécurité, Salle d'attente, Salles de répartition, Sondages, Tableau blanc, Sous-titres live, Arrière-plan, Enregistrer cloud, Diffuser en direct, Minuteur, Applications). **Sécurité** : verrouiller, salle d'attente, autoriser partage / chat / renommer / micro, Suspendre toutes les activités. Pilules : **Réagir** (Pouce, Cœur, Bravo, Rire) · **Lever la main** · **Enregistrer**. Discussion intégrée (tout le monde / privé).

### Notifications
Bannière iOS en haut (icône app, « OP MESSAGES », « maintenant », texte), glisse depuis le haut, disparaît après ~3,5 s. Émise pour : ajout à une réunion, ajout à un groupe, rappels de réunion (5 min / 15 min / 1 h / 1 jour avant), appel entrant, message dans un groupe.

## Écrans
1. **Messages** : Modifier / composer, titre, recherche 12 px, épinglés (cercles 60), liste : point non-lu bleu, avatar 50, nom + heure + chevron, aperçu 2 lignes.
2. **Conversation** : nav en verre (retour + badge « 12 », avatar 44 centré + nom, caméra), bulles 20/6 px, photos 118×88, vocal (forme d'onde + durée), « Lu 14:06 », indicateur de saisie, champ « Message » + flèche d'envoi, micro.
3. **Appels** : segment Tous / Manqués, historique (manqués en rouge), icônes entrant / sortant / vidéo, bouton info.
4. **Réunions** : « Nouvelle réunion » (bouton plein) / « Rejoindre avec un code », À venir (tuile date + « Rejoindre »), Enregistrements (transcription).
5. **En réunion** : grille 2×2, contour vert = parle, micro coupé rouge, bandeau flottant (point rouge, titre, durée, Partager), panneau : Micro · Caméra · Chat · Invités · Plus + « Partager l'écran » + « Quitter » rouge. Fond noir, indicateur d'accueil clair.

## Appareils
Mobile (iPhone 393×852 radius 58/46, Android 400×852 radius 40/30) : status bar, barre d'onglets flottante (masquée en conversation et réunion). Web mobile : barre d'adresse en haut (Chrome avec ⋮). Bureau (1120×720, s'adapte à la largeur) : barre de titre (feux macOS centrés / Fluent ─ ▢ ✕ à gauche, Edge/Safari : ‹ › + URL), sidebar 236 avec Messages · Appels · Réunions · Réglages et statut « Disponible » ; pas de barre d'onglets.

## Modèle de données minimal
- Contact { id, initiales, nom, rôle, avatar }
- Conversation { id, type: direct | groupe, nom, membres[], admins[], annoncesSeulement, éphémères, messages[] }
- Message { id, auteur, texte | photo | vocal, horodatage, lu[] }
- Appel { id, participants[], type: audio | vidéo, direction, manqué, durée }
- Réunion { id, titre, début, fin, répétition, lieu/lien, invités[] { contact, statut: accepté | en attente }, rappel (minutes), notifier: bool, enregistrement?, transcription? }
- Notification { id, type, titre, texte, cible (conversation | réunion | appel), lue }

## Règles
- Mode jour / nuit automatique (`prefers-color-scheme`), pas de bouton en production.
- Les données sont des exemples : brancher les vraies conversations, appels, réunions.
