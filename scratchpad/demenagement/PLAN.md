# Quitter GitHub — le plan en une page (19 novembre 2026)

Demande de Justin (17/11, redite le 18/11) : tout chez nous, rien en public, rien perdu, puis le dépôt GitHub supprimé.
Ce qui reste forcément chez des tiers, et c'est normal : l'hébergeur des machines, Stripe, Anthropic, les notifications
Apple/Google, le registre du nom de domaine. Le SITE reste public (c'est son rôle) ; le CODE, lui, devient privé.

⛔ Chaque geste qui touche la production (clés SSH du serveur des clients, DNS, coupure de GitHub) se fait sur une phrase
de Justin, ce jour-là, et se vérifie avant d'être annoncé.

| # | Étape | Où | Qui | État |
|---|---|---|---|---|
| 0 | Le code et ses 312 branches copiés chaque nuit sur la forge | Atelier | — | ✅ fait (copie à 3 h 17) |
| 1 | Les VÉRIFICATIONS (les ~840 bancs, 7 min) lancées par la forge à chaque envoi, au lieu de GitHub Actions | Atelier | moi | à faire : traduire `ci.yml` en tâche de la forge ; prouvé à la main le 18/11 |
| 2 | Les DÉPLOIEMENTS (serveur, OP Courrier, OP MESSAGES, espace de test) partent de l'Atelier, avec des clés SSH NEUVES | Atelier → serveur des clients | Justin pose les clés (geste root), moi le reste | à faire |
| 3 | Le SITE et la TOUR servis par le serveur des clients (Caddy, dossier assemblé par `scripts/assembler-site.sh`) ; copie d'essai sur l'Atelier d'abord | serveur des clients | moi, puis Justin bascule `@` et `www` chez le registraire | à faire |
| 4 | La SURVEILLANCE de chaque heure (site, API) : une minuterie sur l'Atelier, alerte par courriel | Atelier | moi | à faire |
| 5 | BLOG, fiche Google, Facebook/Instagram : publication planifiée depuis l'Atelier ; les jetons Google et Meta recréés à leur source | Atelier | Justin recrée les jetons, moi le reste | à faire ; Gemini retiré (projet supprimé), Justin fait les photos |
| 6 | SAUVEGARDE CROISÉE du code : forge de l'Atelier ⇄ copie nue sur le serveur des clients ; vérifier où partent les sauvegardes des données clients | les deux | moi | à faire |
| 7 | Mes sessions prennent le code sur la forge (secret réseau `git.teamop.fr` déjà posé) — À PROUVER avant toute coupure | sessions | moi | push vers la forge prouvé ; démarrage d'une session SANS GitHub à prouver |
| 8 | Quelques jours EN PARALLÈLE (GitHub et nos machines font la même chose, on compare) | — | — | après 1 à 7 |
| 9 | GEL : exporter les discussions (demandes de fusion et tickets, jusqu'au n° 335), retirer les anciennes clés SSH du serveur, archiver le dépôt | GitHub | Justin | sur sa phrase |
| 10 | SUPPRESSION du dépôt GitHub | GitHub | Justin | sur sa phrase, après 9 |

Durée honnête : 2 à 3 jours de travail pour 1 à 7, puis l'attente du parallèle (3 à 5 jours), puis 9 et 10 en une heure.
Détail des 13 travaux automatiques et des 16 secrets : `INVENTAIRE-GITHUB.md`.
