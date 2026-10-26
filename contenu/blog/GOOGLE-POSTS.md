# Posts Google automatiques — ce que Justin doit faire

Chaque article du blog donne un post sur la fiche Google « TEAM OP » (établissement `3113104183760997296`) :
texte court, image, bouton « En savoir plus » vers l'article (`?de=google`, donc visible dans le suivi d'audience).
Le code est prêt (`scripts/google-post.js`, branché dans `blog-publication.yml`). Il lui manque **l'accès à l'API
Google**, que seul Google accorde. Sans lui, rien ne casse : le blog part, le script dit « il manque … » et s'arrête.

## 1. Demander l'accès à l'API (10 minutes, une fois)

Conditions de Google : fiche **vérifiée et active depuis plus de 60 jours**, avec un **site web** renseigné
(teamop.fr). Utilisez l'adresse e-mail qui est **propriétaire ou gestionnaire** de la fiche.

1. <https://console.cloud.google.com> → nouveau projet (par ex. « teamop-gbp ») → notez son **numéro de projet**.
2. Remplir le formulaire officiel « GBP API contact form » :
   <https://support.google.com/business/contact/api_default> — choisir **« Application for Basic API Access »**,
   donner le numéro de projet, le site, et dire l'usage : « publier sur notre propre fiche les actualités de notre blog ».
   (La page est dans l'aide Google ; si elle n'affiche pas le formulaire, partir de
   <https://developers.google.com/my-business/content/prereqs#request-access>.)
3. **Un seul envoi.** Google demande de ne pas redéposer pendant qu'une demande est en cours.

**Délai, honnêtement :** Google annonce « réponse sous 14 jours » (FAQ officielle). Le 15 septembre 2026, Google a
publié que les délais sont « allongés » faute de personnel et qu'il « ne peut pas donner d'échéance » ; des
développeurs rapportent des demandes en attente depuis plus de 14 jours. Comptez **2 à 4 semaines, parfois plus**,
et un refus est possible. Réponse par e-mail ; en attendant, le quota affiché dans la console reste à **0**
(Console → IAM et administration → Quotas, « Requests per minute » : **300 = accordé**, 0 = en attente).

## 2. Après l'accord : activer les API et créer l'ID client (15 minutes)

1. Console → **API et services → Bibliothèque** → activer **Google My Business API** (c'est elle qui porte les posts,
   version v4), **My Business Account Management API** et **My Business Business Information API**.
2. **Écran de consentement OAuth** : type « Externe », ajouter la portée
   `https://www.googleapis.com/auth/business.manage`, puis **« Publier l'application » (état « En production »)**.
   ⚠️ Resté en « Test », le refresh token **expire au bout de 7 jours** et les posts s'arrêteraient en silence.
3. **Identifiants → Créer des identifiants → ID client OAuth**, type **« Application de bureau »**.
   Gardez l'ID client et le secret client dans le gestionnaire de mots de passe.

## 3. Poser les secrets sans jamais les afficher (2 minutes, sur le Mac)

Prérequis : `gh auth login` déjà fait sur le Mac. Dans le dossier du dépôt :

```bash
node scripts/google-post-autoriser.js
```

Il demande l'ID client, puis le secret client (**saisie masquée**), ouvre la connexion Google (compte propriétaire
de la fiche), reçoit la réponse sur `127.0.0.1` et range **directement** dans les secrets GitHub, par `gh secret set`
(valeur par l'entrée standard, jamais à l'écran, jamais dans un fichier ni une conversation) :

| secret GitHub | contenu |
|---|---|
| `GBP_CLIENT_ID` | l'ID client OAuth |
| `GBP_CLIENT_SECRET` | le secret client |
| `GBP_REFRESH_TOKEN` | rendu par Google pendant la connexion |
| `GBP_ACCOUNT_ID` | lu par l'API (« accounts/123… » → `123…`) |
| `GBP_LOCATION_ID` | `3113104183760997296` |

⛔ Ne collez **jamais** ces valeurs dans une conversation : une valeur affichée une fois est à remplacer. Pour
vérifier qu'un secret est posé : `gh secret list` (les noms seulement). Alternative sans script : OAuth Playground
(<https://developers.google.com/oauthplayground>, roue dentée → « Use your own OAuth credentials »), puis copier le
refresh token **directement** dans Réglages → Secrets and variables → Actions, sans le coller ailleurs.

## 4. Ce qui se passe ensuite

- **Chaque nouvel article** (mardi, vendredi) : le post est rédigé avant la fusion (`contenu/blog/posts-google/<slug>.json`,
  il part avec l'article), puis publié sur la fiche **après** la mise en ligne du site (l'image doit répondre 200).
- **Rien ne part deux fois** : le script relit les posts de la fiche et cherche l'adresse de l'article.
- **Les articles déjà publiés** (5 posts prêts dans `contenu/blog/posts-google/`) : Actions → **« Post Google manuel »**
  → Run workflow → `tous` (ou un slug).
- **Une erreur de Google** devient un avertissement jaune dans le journal du workflow ; le blog n'est jamais bloqué.

## 5. En attendant l'accord : publier à la main (3 minutes par post)

Fiche Google → **Ajouter une actualité** : coller le champ `summary` du JSON, ajouter l'image
`blog/img/<…>-couverture-google.jpg` (JPEG 4:3, déjà faite), bouton **« En savoir plus »** et le lien
`callToAction.url` (avec `?de=google`). Une conversation Cowork peut le faire à partir de ces cinq fichiers.

## Règles tenues par le script (`verifierPost`, banc 3065)

Texte ≤ 600 caractères (Google en accepte plus, un post court se lit) ; vouvoiement ; **aucun prix** (une phrase avec
« € » est écartée ; la grille 15 / 25 / 50 € est la seule tolérée) ; **aucun numéro de téléphone** (Google peut
refuser un post dont il ne reconnaît pas le numéro) ; pas de « gratuit », « garanti », « n'hésitez pas », ni de lien
dans le texte ; image JPEG ou PNG publique de teamop.fr. Google relit chaque post : un post peut passer « Non
approuvé » (visible sur la fiche) ; un post de plus de 6 mois est archivé.

## Sources (vérifiées le 26 octobre 2026)

- Posts v4 : <https://developers.google.com/my-business/content/posts-data>, <https://developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts>
- Accès, 60 jours, quota 0/300 : <https://developers.google.com/my-business/content/prereqs>
- Portée OAuth : <https://developers.google.com/my-business/content/basic-setup>
- Délai 14 jours : <https://developers.google.com/my-business/content/faq> ; retard annoncé : <https://www.seroundtable.com/google-business-profile-api-application-delays-42085.html>
- Règles de contenu des posts : <https://support.google.com/business/answer/7662907>
