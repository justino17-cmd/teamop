# THEME — OP MESSAGES (référence pour Claude Code)

Référence : `sources/OP Messages Apple.dc.html` · build : `builds/opmessages-apple-web.html` (ouvrir dans un navigateur : puces appareil à gauche, écran à droite ; jour et nuit côte à côte).

## Couleurs (logo OP MSG)
| Jeton | Jour | Nuit |
|---|---|---|
| fond écran | glacé #ffffff → #eef3fb → #dfe8f8 + diagonale 112° blanche 40 % | #24408a → #1a2e6b → #0e1a3f + diagonale 5 % |
| texte | #0e1a3f | #ffffff |
| secondaire | rgba(14,26,63,.6) | rgba(220,228,250,.66) |
| accent (liens, icônes, onglet actif) | #2a4a9c | #7ea2f0 |
| fill (bulles envoyées, boutons) | #2a4a9c | #3b63c4 |
| fillSoft (fonds teintés) | rgba(42,74,156,.12) | rgba(126,162,240,.22) |
| carte | rgba(255,255,255,.82) | rgba(255,255,255,.09) |
| champ / recherche | rgba(42,74,156,.1) | rgba(255,255,255,.14) |
| bulle reçue | #e6ecf7 / texte #0e1a3f | rgba(255,255,255,.14) / blanc |
| barre nav | rgba(255,255,255,.78) | rgba(26,46,107,.72) |
| barre d'onglets | rgba(255,255,255,.72) | rgba(255,255,255,.1) |
| onglet actif | bulle blanche 88 %, texte #1a2e6b | bulle rgba(42,74,156,.8), texte blanc |
| séparateur | 0.5px rgba(60,60,67,.2) | 0.5px rgba(84,84,88,.6) |
Statuts : manqué #ff453a · en ligne / parle #30d158 · quitter #ff453a. Avatars : dégradés (bleu royal #4f78d6→#2a4a9c, orange→rose, vert→bleu, violet→indigo, gris, cyan→indigo).

## Verre
`backdrop-filter: blur(30px) saturate(180%)` sur barres et panneaux ; barre d'onglets `blur(36px) saturate(200%)` ; réunion : panneaux `rgba(255,255,255,.12)` + bord `.18`. Respecter `prefers-reduced-transparency` et `prefers-reduced-motion`.

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
