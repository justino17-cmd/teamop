# Quitter GitHub — le plan en une page (19 novembre 2026)

Demande de Justin (17/11, redite le 18/11) : tout chez nous, rien en public, rien perdu, puis le dépôt GitHub supprimé.
Ce qui reste forcément chez des tiers, et c'est normal : l'hébergeur des machines, Stripe, Anthropic, les notifications
Apple/Google, le registre du nom de domaine. Le SITE reste public (c'est son rôle) ; le CODE, lui, devient privé.

⛔ Chaque geste qui touche la production (clés SSH du serveur des clients, DNS, coupure de GitHub) se fait sur une phrase
de Justin, ce jour-là, et se vérifie avant d'être annoncé.

| # | Étape | Où | Qui | État |
|---|---|---|---|---|
| 0 | Le code et ses 312 branches copiés chaque nuit sur la forge | Atelier | — | ✅ ; ⛔ BASCULE le 19/11 à 23 h 45 : la copie depuis GitHub est ARRÊTÉE (`atelier-miroir.timer` désactivé), les Actions de GitHub coupées ; la FORGE est la référence (`main` = 3bef2189 puis 03b15748) |
| 1 | Les VÉRIFICATIONS (les ~840 bancs, 7 min) lancées par la forge à chaque envoi, au lieu de GitHub Actions | Atelier | moi | ✅ 19/11 : `.forgejo/workflows/verifications.yml` joué par la forge (839 suites, 46 887 vérifications, 0 échec, ~7 min) ; geste root fait le 19/11 à 23 h 17 : `atelier-runner` actif en permanence (systemd, compte atelier) |
| 2 | Les DÉPLOIEMENTS (serveur, OP Courrier, OP MESSAGES, espace de test) partent de l'Atelier, avec des clés SSH NEUVES | Atelier → serveur des clients | Justin pose les clés (geste root), moi le reste | ✅ 19/11 SERVEUR : `.forgejo/workflows/deploiement-serveur.yml`, clé bridée en commande forcée (`/usr/local/sbin/teamop-deployer` : etat, deployer, site ; avance rapide seulement ; depuis l'atelier seulement), premier déploiement réel 03b15748 vert. Reste OP Courrier, OP MESSAGES, espace de test : leurs scripts côté serveur vont chercher le code chez GitHub (`server-msg/install-msg.sh`, `server/install-test.sh`, `server-courrier/install-courrier.sh`) — à faire pointer vers la forge (jeton en lecture seule) |
| 3 | Le SITE et la TOUR servis par le serveur des clients (Caddy, dossier assemblé par `scripts/assembler-site.sh`) ; copie d'essai sur l'Atelier d'abord | serveur des clients | moi, puis Justin bascule `@` et `www` chez le registraire | ✅ 19-20/11 : `.forgejo/workflows/publication-site.yml` → commande « site » ; Caddy `scripts/atelier/caddy-teamop-site.caddy` ; DNS `@` A 217.154.6.139, `www` CNAME teamop.fr. ; certificat Let's Encrypt ; vérifié (accueil, /tarifs, /blog/, 404, fichiers internes non servis, www → apex) |
| 4 | La SURVEILLANCE de chaque heure (site, API) : une minuterie sur l'Atelier, alerte par courriel | Atelier | moi | ✅ 19/11 écrite et essayée depuis l'Atelier (`.forgejo/workflows/surveillance.yml`, tout vert) ; tourne à l'heure dès qu'elle est sur `main` de la forge ; le courriel attend un compte d'envoi choisi par Justin (en attendant, ticket sur la forge + GitHub prévient) |
| 5 | BLOG, fiche Google, Facebook/Instagram : publication planifiée depuis l'Atelier ; les jetons Google et Meta recréés à leur source | Atelier | Justin recrée les jetons, moi le reste | à faire ; Gemini retiré (projet supprimé), Justin fait les photos |
| 6 | SAUVEGARDE CROISÉE du code : forge de l'Atelier ⇄ copie nue sur le serveur des clients ; vérifier où partent les sauvegardes des données clients | les deux | moi | à faire |
| 7 | Mes sessions prennent le code sur la forge (secret réseau `git.teamop.fr` déjà posé) — À PROUVER avant toute coupure | sessions | moi | push vers la forge prouvé ; démarrage d'une session SANS GitHub à prouver |
| 8 | Quelques jours EN PARALLÈLE (GitHub et nos machines font la même chose, on compare) | — | — | après 1 à 7 |
| 9 | GEL : exporter les discussions (demandes de fusion et tickets, jusqu'au n° 335), retirer les anciennes clés SSH du serveur, archiver le dépôt | GitHub | Justin | sur sa phrase |
| 10 | SUPPRESSION du dépôt GitHub | GitHub | Justin | sur sa phrase, après 9 |

Durée honnête : 2 à 3 jours de travail pour 1 à 7, puis l'attente du parallèle (3 à 5 jours), puis 9 et 10 en une heure.
Détail des 13 travaux automatiques et des 16 secrets : `INVENTAIRE-GITHUB.md`.

## Incident du 20/11, 0 h 22 (heure française)
En changeant la zone DNS chez OVH, la ligne `api` A a été supprimée avec les 4 lignes de GitHub : `api.teamop.fr` n'a plus existé
pendant 3 à 5 minutes (les clients ne joignaient plus le serveur). Recréée à 0 h 25, `/health` 200. Leçon : avant de toucher une zone
DNS, relever TOUTES ses lignes (capture complète), supprimer une ligne à la fois en lisant son sous-domaine, et vérifier `api` juste après.
