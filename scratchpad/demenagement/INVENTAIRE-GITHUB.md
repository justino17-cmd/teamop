# Inventaire de ce que GitHub contient — relevé le 18 novembre 2026 (15 h 30, heure française)

Relevé par l'API publique et les fichiers du dépôt. Les NOMS des secrets sont déjà publics (ils sont écrits dans les workflows) ;
aucune valeur n'est lisible, ni par l'API, ni par Justin : chaque secret se RECRÉE chez nous, à sa source.

## 1. Le code — ✅ déjà chez nous
Dépôt, 312 branches, tout l'historique : copiés sur la forge (copie de chaque nuit, 3 h 17). Aucune « release ». Le dépôt est PUBLIC.

## 2. Les 13 travaux automatiques
  - Rattrapage des photos du blog · .github/workflows/blog-photos-rattrapage.yml · active
  - Publication d'un article du blog · .github/workflows/blog-publication.yml · active
  - Vérifications · .github/workflows/ci.yml · active
  - Déploiement d'OP Courrier · .github/workflows/deploiement-courrier.yml · active
  - Déploiement d'OP MESSAGES · .github/workflows/deploiement-messages.yml · active
  - Espace de test · .github/workflows/deploiement-test.yml · active
  - Déploiement du serveur · .github/workflows/deploiement.yml · active
  - Post Google manuel · .github/workflows/google-post-manuel.yml · active
  - Publication du site · .github/workflows/publication-site.yml · active
  - Surveillance TeamOP · .github/workflows/surveillance.yml · active
  - Vérification des pages · .github/workflows/verification.yml · active
  - Dependabot Updates · dynamic/dependabot/dependabot-updates · active
  - pages-build-deployment · dynamic/pages/pages-build-deployment · active

## 3. Les 16 secrets, et qui s'en sert
| Secret | Servi à | Chez nous |
|---|---|---|
| VPS_SSH_KEY | déployer le serveur, OP Courrier, OP MESSAGES, l'espace de test | à remplacer par une clé neuve de l'atelier vers le serveur des clients (le déploiement part de NOS machines) |
| VPS_SSH_KEY_COURRIER_BETA / _PROD | déployer OP Courrier | idem |
| VPS_SSH_KEY_MSG_BETA / _PROD | déployer OP MESSAGES | idem |
| VPS_SSH_KEY_TEST | l'espace de test | idem |
| GBP_ACCOUNT_ID, GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_LOCATION_ID, GBP_REFRESH_TOKEN | publier sur la fiche Google de l'entreprise (blog, post manuel) | à recréer depuis la console Google (par Justin) |
| FB_PAGE_ID, FB_PAGE_TOKEN, IG_ACCESS_TOKEN, IG_USER_ID | publier l'article sur Facebook et Instagram | à recréer depuis Meta (par Justin) |
| GEMINI_API_KEY | photos du blog | MORTE (projet supprimé le 17/11) : retirer ces étapes, Justin fait les photos |

⚠️ Les clés SSH : ce sont les plus sensibles (elles ouvrent le serveur des clients). On ne les recopie pas : on en crée de neuves, et on
RETIRE les anciennes du serveur des clients le jour où GitHub est gelé.

## 4. Ce qui ne se copie pas tout seul
- les discussions des demandes de fusion et des tickets (numérotés jusqu'à 335) : à exporter ;
- la publication du site (GitHub Pages) : le site passe sur le serveur des clients ; DNS `@` et `www` à basculer chez OVH (avec Justin) ;
- Dependabot (alertes de dépendances) : remplacé par `npm audit` sur nos machines ;
- l'historique des vérifications passées : sans valeur, on ne le garde pas.

## 5. Non lisible d'ici (le proxy le refuse) — à regarder avec Justin, capture des NOMS seulement
Réglages Pages, environnements, webhooks, clés de déploiement : une capture de chaque page des Réglages du dépôt suffira.
