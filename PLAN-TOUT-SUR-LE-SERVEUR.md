# TOUT SUR LE SERVEUR — le recensement complet, et l'ordre de bataille

> **Décision de Justin, 20 septembre 2026 au soir :** « je veux que tout soit sur le serveur.
> D'où je t'ai dit de séparer le serveur, pour faire ce système. Donc tu fais tout et tu
> revérifies tout, je veux pas qu'il manque un truc. »

Ce fichier remplace la conclusion de `PLAN-OP-SOCLE.md` sur Firebase. Ce plan-là disait que
Firebase restait, pour le portail client et pour OP MESSAGES. **Ce n'est plus la cible.**

⛔ **ET IL CONTENAIT DEUX AFFIRMATIONS FAUSSES**, écrites le jour même, corrigées ici après
mesure. Les deux allaient dans le sens de « c'est plus gros que ça ne l'est » :

| ce qui était écrit | ce qui est vrai, mesuré |
|---|---|
| « OP MESSAGES tourne sur un **second** projet Firebase » | **Un seul projet.** `messages.html`, `espace.html`, `app.html` et `reinit.html` portent tous `projectId:"elan-gestion"` et le **même `appId`**. `firestore-opmessages.rules` décrit un second projet **qui n'a jamais été créé** — son en-tête dit « où coller : console Firebase → LE PROJET OP MESSAGES », au futur. |
| « 12 200 lignes de `messages.html` [en service] » | **OP MESSAGES EST HORS SERVICE.** `OPMSG_EN_TRAVAUX=true` — vérifié **sur le site en ligne**, pas dans le dépôt. La page affiche « OP MESSAGES change d'infrastructure » et `throw` avant la moindre ligne qui parle à Firebase. |

⚠️ La seconde change tout : **OP MESSAGES n'a aucun utilisateur en ce moment.** Il n'y a donc
rien à migrer — il se bâtit directement sur le VPS. Et la tâche « créer le second projet
Firebase », encore écrite dans `tour.html:4486`, **est annulée** : ce serait bâtir aujourd'hui
la chose qu'on veut éteindre demain.

---

## 1. LE RECENSEMENT — tout ce qui dépend de Firebase, mesuré fichier par fichier

| fichier | lignes | Firestore | Auth | état réel |
|---|---|---|---|---|
| `app.html` / `beta.html` | 34 438 | `elan_teams`, `teamop_config` | anonyme + jeton personnalisé | ⛔ **production, ELAN** |
| `espace.html` — portail client | 1 082 | `teamop_requests` (16), `teamop_threads` (11), `msgs` (11), `teamop_news` (3) | **compte e-mail + mot de passe**, création comprise | ⛔ **production** |
| `messages.html` / `messages-beta.html` | 12 200 | 128 `collection(`, 162 `doc(`, 15 `onSnapshot` | compte e-mail | ✅ **hors service** — 0 utilisateur |
| `reinit.html` | 125 | **aucun** | `verifyPasswordResetCode`, `applyActionCode`, `confirmPasswordReset` | ⛔ **production** |

## 2. ⛔ CE QUI ALLAIT MANQUER : FIREBASE, C'EST DEUX CHOSES, ET LE PLAN N'EN VOYAIT QU'UNE

`PLAN-OP-SOCLE.md` ne parle **que de Firestore** — la base de données. Il ne mentionne nulle
part **Firebase Auth**, et c'est pourtant la moitié de la dépendance :

- **Firestore** = où vivent les données. Le socle le remplace. C'est écrit, à moitié bâti.
- **Firebase Auth** = qui est qui. Les comptes e-mail du portail et de la messagerie, la
  vérification d'adresse, et **les liens de réinitialisation de mot de passe**. Rien ne le
  remplace, et personne ne l'avait écrit.

⚠️ **`reinit.html` est la preuve que l'angle mort est réel** : cette page n'utilise **aucune**
collection Firestore. Uniquement de l'authentification. On pourrait retirer Firestore en
entier, se croire arrivé, et **tous les liens « mot de passe oublié » passeraient encore par
Google.** Une page de 125 lignes qu'aucune recherche de `collection(` ne fait apparaître.

⚠️ Corollaire à ne pas manquer non plus : l'adresse e-mail et le mot de passe d'un client du
portail sont aujourd'hui **chez Google**, pas chez TeamOP. Les reprendre n'est pas une
migration de données : on ne peut pas lire un mot de passe Firebase. **Il faudra faire
reposer un mot de passe à chaque personne** — ou accepter une double authentification le
temps de la bascule. Ça se décide, ça s'annonce, et ça ne se découvre pas le jour J.

✅ **La bonne nouvelle, mesurée** : le serveur sait DÉJÀ tenir des comptes. `comptesReg`,
`/api/nouveau-compte`, `/api/sendcode`, `/api/checkcode`, `/api/mdp/lien`,
`/api/compte/identifiants`, `/api/espaces/comptes`, plus le code à six chiffres par courriel
(`cleCodeDemander` / `cleCodeVerifier`) et l'envoi de courriels (`server/mail.js`, 631 lignes).
On ne part pas de zéro — on branche le portail sur ce qui existe.

## 3. CE QUI EST DÉJÀ BÂTI, ET QUI NE SE REFAIT PAS

`server/socle.js` (2 109 lignes) + `server/op-socle.js` (1 124 lignes) : stockage chiffré par
entreprise, journal append-only, 19 routes, retour en arrière par entreprise, sauvegarde
mensuelle transférable. Les étapes 0 à 7 de `PLAN-OP-SOCLE.md` sont écrites et éprouvées.
**Il reste l'étape 8 pour OP GESTION**, et elle attend la phrase de Justin.

⚠️ **Relevé du 25 septembre 2026 : « écrites et éprouvées » veut dire le CODE, pas l'exécution.**
Le socle est éteint, la production (v695) n'a aucun appel `/api/op/*`, et les marches 4 à 7 se
jouent sur des appareils de client, donc après une publication. Et l'étape 0 n'est pas complète :
le durcissement du VPS (`User=root`, pas de `NODE_ENV=production`, aucun filet d'erreur) et le
registre des traitements manquent. La liste à jour est en tête de `REPRISE.md`.

## 4. L'ORDRE DE BATAILLE

L'ordre n'est pas négociable : il va du **risque le plus faible** au plus fort, et chaque étape
laisse le client debout si la suivante n'arrive jamais.

| # | quoi | risque | pourquoi à ce rang |
|---|---|---|---|
| **A** | **OP MESSAGES sur le VPS** | **aucun** | 0 utilisateur. Rien à migrer, rien à casser. C'est aussi le banc d'essai du temps réel maison, avant de le faire porter à quoi que ce soit de vivant. |
| **B** | **Comptes TeamOP** — identité maison pour le portail et la messagerie | moyen | Le socle des deux suivants. Se bâtit sur ce qui existe (`comptesReg`, code par courriel, `server/mail.js`). |
| **C** | **Portail client `espace.html`** — 4 collections, 4 routes | moyen | En production, mais petit et sans temps réel critique. Dépend de B pour l'identité. |
| **D** | **`reinit.html`** — liens de mot de passe | faible | Tombe tout seul une fois B fait. **À ne pas oublier : c'est l'angle mort.** |
| **E** | **OP GESTION étape 8** — couper Firestore | ⛔ **élevé** | Le seul chemin sans retour arrière, sur une entreprise qui travaille. En dernier, et sur la phrase de Justin. |
| **F** | **Éteindre Firebase** — règles, projet, pages juridiques | faible | Ne se fait QUE quand A→E sont vrais et mesurés. |

### Ce qui change dans `PLAN-OP-SOCLE.md` étape 8

L'étape 8 disait « retirer `firestore.rules` », puis j'ai corrigé en « deux blocs seulement,
le portail en dépend ». **Les deux sont maintenant périmés** : avec C fait, le portail n'en
dépend plus, et le fichier disparaît en entier — mais à l'étape **F**, pas à l'étape 8.

### Ce qui change dans les pages juridiques

Tant que A→F ne sont pas tous vrais, **Google reste sous-traitant** et
`sous-traitance.html:162-166` comme `mentions-legales.html:52` restent vraies. À l'étape F, et
seulement là, la ligne Google se retire — et il faudra alors **nommer le nouveau sous-traitant
à sa place** : l'hébergeur du VPS. On ne supprime pas une ligne, on la remplace.

⛔ **Et une obligation qui ne disparaît pas avec Firebase** : `mentions-legales.html:74`
promet 24 mois de conservation après la fin d'un abonnement, plus un courriel 30 jours avant
suppression. Aujourd'hui c'est tenu sans rien faire — le document Firestore reste. Sur le VPS,
il faudra **l'exécuter** : une horloge de rétention par entreprise, un courriel automatique, un
effacement. Rien de tel n'est écrit nulle part.

## 4 bis. LA SECONDE PISTE : LE SITE LUI-MÊME

> **Justin, dans la foulée :** « même le site et tout, je veux tout sur le serveur. Tout ce
> qu'on a fait sur Firebase je le veux sur le serveur. »

C'est une piste **indépendante** d'A→F : elle ne touche pas aux données, seulement à QUI SERT
LES FICHIERS. Elle peut donc se faire avant, pendant ou après, et elle a son propre retour
arrière (une ligne de DNS).

**Ce qui est servi aujourd'hui, mesuré :** 27 pages HTML, **9,6 Mo de HTML**, 15 Mo en tout
(icônes comprises). `teamop.fr` résout vers `185.199.108→111.153` — les quatre adresses
anycast du CDN GitHub Pages. `api.teamop.fr` résout vers `217.154.6.139`, le VPS.

### G — servir le site depuis le VPS

1. nginx sert `/opt/teamop/repo` en statique (il est déjà devant l'API) ;
2. certificat Let's Encrypt pour `teamop.fr` et `www.teamop.fr` — **obtenu et vérifié AVANT
   de toucher au DNS**, sinon le site est en erreur de certificat entre les deux ;
3. le déploiement change de nature : aujourd'hui `git push main` → GitHub Pages sert. Demain
   le VPS tire. `deploiement.yml` le fait déjà pour `server/` — on étend au reste ;
4. basculer le DNS, **TTL abaissé la veille** pour pouvoir revenir en minutes ;
5. `.github/workflows/` surveille le site : à re-pointer.

### ✅ CE QU'ON GAGNE, ET CE N'EST PAS RIEN

**La même origine pour les pages et l'API.** Aujourd'hui `teamop.fr` appelle `api.teamop.fr` :
c'est du cross-origin, donc du CORS, donc la requête préalable — et **le piège documenté dans
CLAUDE.md disparaît avec** : `Access-Control-Allow-Headers` ne liste que quatre en-têtes, un
en-tête maison est refusé **par le navigateur**, ce que `curl` ne peut pas voir. Ce piège a
coûté une des trois pannes de couture du 20 septembre. Même origine, plus de CORS, plus de
piège.

### ⛔ CE QU'ON PERD, ET IL FAUT LE DIRE AVANT

**Aujourd'hui, si le VPS tombe :** le site charge quand même (CDN GitHub, quatre adresses
anycast, exploité par Microsoft), `app.html` charge, et **il fonctionne hors ligne** grâce au
service worker. Les techniciens d'ELAN continuent de travailler ; seuls la synchro, le courrier
et les sauvegardes s'arrêtent.

**Après la bascule, si le VPS tombe :** `teamop.fr` ne rend plus rien du tout. Un appareil
déjà installé survit — le service worker a la page en cache, c'est la PWA qui sauve la
mise — mais **un appareil neuf, un cache vidé, un nouveau technicien : rien.** Et plus de
Tour, donc plus de moyen de regarder ce qui se passe.

⚠️ Second point, moins grave mais réel : un CDN mondial sert 9,6 Mo plus vite qu'une machine
unique dans un seul centre de données. Sur un téléphone de terrain en 4G loin du VPS, la
première ouverture sera plus lente. Mesurable, donc à mesurer — pas à supposer.

**Ce n'est pas un argument contre**, c'est le prix, et il se paie en disponibilité. La parade
existe et elle est connue : un second VPS, ou une bascule DNS de secours préparée à l'avance.
À décider **avant** la bascule, pas le jour où la machine tombe.

## 5. CE QUE ÇA NE RÈGLE PAS, ET QU'IL FAUT SAVOIR AVANT DE COMMENCER

- ⛔ **Un seul serveur, c'est un seul point de panne.** Firestore est répliqué par Google ; le
  VPS, non. La sauvegarde hors site (S3, chiffrée, 30 jours + mensuel) existe déjà — mais une
  sauvegarde n'est pas de la disponibilité : si le VPS tombe un mardi matin, ELAN ne travaille
  pas. C'est le prix du « tout chez nous », et il se paie en astreinte, pas en euros.
- ⛔ **Le temps réel n'est pas gratuit.** Firestore donne `onSnapshot` : un écran se met à jour
  tout seul. Sur le VPS il faut l'écrire — SSE ou WebSocket, reprise après coupure, présence.
  `/api/op/flux` existe déjà côté socle : c'est la brique de départ, et c'est pour ça qu'OP
  MESSAGES (0 utilisateur) est le bon endroit pour l'éprouver.
- ✅ **Le coût n'est pas l'argument.** Firebase coûte ~0,50 €/mois. Ce qu'on gagne, c'est la
  maîtrise et la fin du document unique — pas de l'argent.
