# Les stories Instagram et Facebook des articles du blog

Justin, 2 novembre 2026 : « je veux que tu mettes les stories automatiquement quand tu mets les blogs ».

## Ce qui se passe tout seul

À chaque article neuf, `.github/workflows/blog-publication.yml` enchaîne :

1. **avant la fusion** : `scripts/blog-story.py` fabrique `blog/img/<slug>-story.jpg`, une image de 1080 × 1920 avec le
   logo, la couverture de l'article, « Nouvel article », le titre et « À lire sur teamop.fr/blog ». L'image part avec
   l'article ;
2. **après la publication du site** : `scripts/instagram-story.js` attend que teamop.fr serve l'image (jusqu'à 15 min),
   puis la publie en story sur le compte Instagram TEAM OP ET sur la page Facebook TEAM OP, par l'API de Meta.

Chaque réseau a ses secrets : tant qu'ils manquent, l'étape écrit « il manque IG_USER_ID, IG_ACCESS_TOKEN » (ou
« FB_PAGE_ID, FB_PAGE_TOKEN ») et ne publie rien sur ce réseau. L'un peut manquer sans empêcher l'autre.
L'article part toujours, avec ou sans story : une story qui échoue ne bloque jamais le blog.

⚠️ L'API de Meta ne pose pas l'autocollant « Lien » : l'image dit « À lire sur teamop.fr/blog », et le lien de la bio
mène au site. Si tu veux un lien cliquable sur une story, tu peux l'ajouter à la main.

## Les quatre secrets à poser (une seule fois, par Justin)

⛔ Le jeton ne se colle jamais dans une conversation ni dans un fichier du dépôt : il va de Meta directement dans les
secrets de GitHub.

1. **Une application Meta** : sur developers.facebook.com, « Mes applications », puis « Créer une application », de type
   « Entreprise », rattachée au portefeuille d'entreprise qui possède la page Facebook TEAM OP. Ajoute-lui le produit
   Instagram (l'API qui passe par la connexion Facebook).
2. **Un jeton qui n'expire pas** : dans Meta Business Suite, Paramètres de l'entreprise, puis « Utilisateurs système ».
   Crée un utilisateur système administrateur et donne-lui accès à la page TEAM OP et au compte Instagram TEAM OP.
   Ensuite « Générer un jeton », choisis l'application de l'étape 1 et coche au moins `instagram_basic`,
   `instagram_content_publish`, `pages_show_list`, `pages_read_engagement` et `pages_manage_posts`.
3. **L'identifiant du compte Instagram** : dans l'explorateur de l'API Graph (developers.facebook.com/tools/explorer),
   avec ce jeton, demande `me/accounts?fields=name,instagram_business_account`. Le nombre sous
   `instagram_business_account` → `id` est l'identifiant du compte Instagram (ce n'est pas son nom). Dans la même réponse,
   le premier `id` est celui de la PAGE Facebook, et `me/accounts?fields=access_token` donne le jeton de la page.
4. **Dans GitHub** : dépôt `teamop`, Settings, puis Secrets and variables, puis Actions, puis « New repository secret » :
   - `IG_USER_ID` : l'identifiant de l'étape 3 ;
   - `IG_ACCESS_TOKEN` : le jeton de l'étape 2 ;
   - `FB_PAGE_ID` : l'identifiant de la page Facebook (étape 3) ;
   - `FB_PAGE_TOKEN` : le jeton de la page (étape 3).

Les noms des menus de Meta changent souvent : si un libellé diffère, cherche le plus proche.

## Vérifier

Au prochain article, l'étape « Publier la story Instagram et Facebook » du workflow dit, pour chaque réseau, soit « publiée », soit
exactement ce qui a bloqué (jeton refusé, permission manquante, image pas en ligne). `tests/test-3236.js` joue le
script contre un faux Meta sur la machine, jamais contre le vrai.
