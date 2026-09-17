# Sonde « pièces jointes » au navigateur — point 6 de l'étape 0

Mesures du 17 septembre 2026, **dans un vrai Chromium piloté**, sur les fonctions réellement
livrées dans `beta.html` v698-beta. Reproductible : voir « le banc » plus bas.

## ⛔ Pourquoi un banc LOCAL, et pas la bêta en ligne

Deux raisons, toutes deux mesurées et non supposées :

1. **L'espace de la bêta est dans `ESPACES_INTOUCHABLES`**, donc `sauvRefus` refuse ses dépôts
   par construction (`server/pieces.js`). Mesurer les pièces sur `teamop.fr/beta.html` est
   impossible, et ce n'est pas un réglage à changer — c'est la garde qui protège l'espace de
   repli, dont les clés sont écrites en clair dans `app.html`.
2. **Le navigateur piloté ne peut pas atteindre `teamop.fr` depuis ce conteneur.** Essayé le
   17 septembre : `net::ERR_CERT_AUTHORITY_INVALID` — le proxy sortant présente un certificat
   que Chromium ne reconnaît pas. C'est ce que `CLAUDE.md` annonçait ; c'est désormais vérifié
   plutôt que cité.

Le banc local est donc **plus** capable, pas moins : on tient les deux bouts, et on peut couper
le réseau à volonté — ce qui est la seule façon d'éprouver « on n'a pas pu savoir ».

## Le banc

```bash
# 1. monter la copie d'aperçu + le serveur d'essai isolé
node <scratchpad>/banc6/monter.js
# 2. lancer les deux serveurs
node -e "<serveur statique sur 127.0.0.1:8123>" &
TEAMOP_CONFIG=<banc>/api/config.json TEAMOP_DATA=<banc>/api/data PORT=8099 node server/index.js &
# 3. viser http://127.0.0.1:8123/banc6.html  (timeout 60000 — la page fait 3,1 Mo)
```

⛔ `monter.js` détourne **les TROIS** adresses `https://api.teamop.fr` de la page, pas seulement
`PUSH_API` : le rapporteur d'erreurs (`/api/bug`) et la sentinelle (`/api/monitor/report`) en
portaient une chacun. Un navigateur piloté qui parle à la production, même pour y déposer du
bruit, est ce que `CLAUDE.md` interdit. Vérifié après écriture : **0 adresse de production**
restante (6 mentions subsistent, toutes dans des commentaires ou des messages d'erreur).

## Ce qui a été mesuré

### Le parcours d'une pièce, sur une photo de chantier de 180 Ko

| | |
|---|---|
| JPEG binaire | 184 320 o |
| data URL (base64) | 245 783 o |
| **dépôt** (gzip + PBKDF2 120 000 + AES-GCM + réseau) | **49 ms** |
| relecture depuis le cache de session | **0 ms** |
| relecture **depuis le serveur** | **15 ms**, identique |
| poids sur le disque du serveur | 246 935 o |
| **gonflement réel** | **×1,34** |

Le ×1,34 calculé hors navigateur se vérifie **exactement** dans le vrai navigateur.

### ⛔ Les trois états — le contrôle qui compte le plus

| situation | `dataUrl` | `absente` | `inconnu` | motif |
|---|---|---|---|---|
| la pièce existe | ✅ | — | — | — |
| **réseau coupé** | — | **false** | **true** | `reseau` |
| **supprimée du serveur** | — | **true** | **false** | — |
| mauvaise clé d'équipe (dépôt) | — | — | erreur | `cle` |

Un technicien dans une cave n'a **pas** perdu sa photo, et l'écran ne le lui dira jamais.

### Le collègue qui reçoit

Base locale : 1 intervention, 1 document déposé, 2 photos (dont une **sans** identifiant).

- `syncSortirPieces` sort **2 pièces** ; la photo sans identifiant garde son contenu entier.
- **La base locale est intacte** après l'appel — vérifié sur le contenu, pas sur une longueur.
- Ce que le collègue reçoit : `docs[0].data = ""`, `pid` présent, `surServeur: true` ;
  `photos[0]` = `piece:536d98…` (**70 octets**), `photos[1]` intacte (**39 octets**).
  **Les positions ne bougent pas** — c'est tout l'intérêt du format.
- Avant résolution, `photoSrc()` rend `""` : un `<img src="">` ne charge rien et ne casse rien.
- Résolution : **11 ms**, photo identique à elle-même (245 783 o reçus = attendus),
  document **10 ms**, identique. Aucune confusion entre les deux pièces.

⚠️ **Une sonde jetée en chemin** : la première comparait la photo récupérée à un contenu
*différent* de celui déposé (j'avais déposé une copie modifiée). Elle annonçait
`photo0Identique: false` — un faux défaut, dû à la sonde. Une mesure qui accuse à tort coûte
autant qu'une mesure qui flatte.

### Console

Aucune exception JavaScript. Les six erreurs relevées sont toutes du banc : des 404 sur les
icônes et le service worker (le serveur statique ne sert qu'un fichier), un certificat refusé
(Firebase, coupé par le proxy), et un 403 — mon propre essai de mauvaise clé.
