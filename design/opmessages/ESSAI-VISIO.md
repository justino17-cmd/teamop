# L'essai du serveur de visio sur de vrais téléphones

**Pourquoi.** Le serveur de visio (LiveKit, installé par `install-sfu.sh`, `INSTALLER-LE-SERVEUR.md` section 10 octies) porte une salle à **12 personnes en vidéo et 25 en audio**. Ces deux chiffres sont des **valeurs de départ** : ils viennent de l'ordre de grandeur des débits de WebRTC, et des essais faits ici — six navigateurs dans un conteneur, sur la même machine, sans réseau mobile. **Aucun vrai téléphone, aucune vraie 4G ne les a jamais vus.** Tant que cet essai n'est pas fait, **le site ne promet rien au-delà de 4 en vidéo**.

Ce qu'on veut savoir, en une demi-heure :

1. une salle de 8 à 12 en vidéo tient-elle sur des téléphones **en 4G** (image, son, retard) ?
2. un téléphone **chauffe-t-il** et **combien de batterie** perd-il en 10 minutes de salle ?
3. que voit-on quand un téléphone **change de réseau** en pleine salle ?
4. que coûte une grande salle au **VPS** (processeur, débit), qui porte aussi OP GESTION ?

## Avant de commencer (10 minutes, la veille si possible)

- [ ] `install-sfu.sh beta` est passé jusqu'au bout (« ✓ Le serveur de visio est en place pour beta »).
- [ ] Les deux ports sont ouverts chez l'hébergeur : sur ton Mac, `nc -vz msg-beta.teamop.fr 7881` répond `succeeded`.
- [ ] `curl -s https://msg-beta.teamop.fr/health` montre `"visio":{"configuree":true,"ok":true,`.
- [ ] Chaque participant a un compte sur la bêta d'OP MESSAGES et est dans **un même groupe** (l'appel de groupe le plus simple à lancer).
- [ ] Charge à 100 % n'est pas nécessaire : **note le pourcentage de batterie de chacun au début**.

## Qui

**5 à 12 appareils.** Il faut au moins :

| appareil | combien | réseau |
|---|---|---|
| iPhone (Safari, ou l'application ajoutée à l'écran d'accueil) | 3 ou plus | au moins **deux en 4G** (Wi-Fi coupé) |
| Android (Chrome) | 2 ou plus | au moins **un en 4G** |
| ordinateur (Mac ou PC, Chrome ou Safari) | 1 ou 2 | Wi-Fi ou câble — l'un d'eux partage son écran |
| un réseau d'entreprise ou d'hôtel, si quelqu'un en a un | 0 ou 1 | c'est là que les pare-feu bloquent l'UDP |

## Le déroulé (30 minutes)

Lance un **chronomètre** au début ; on note l'heure de chaque étape (elle sert à relire le serveur ensuite).

1. **Audio, à 6 puis 10** (5 minutes). Appel de groupe **audio**. Chacun entre ; on parle à tour de rôle, puis deux en même temps.
   *À noter* : le temps pour entrer, le retard de la voix (on compte « un, deux, trois » à voix haute), un écho, une coupure.
2. **Vidéo, à 5** (5 minutes). Appel de groupe **vidéo**, caméras allumées.
   *À noter* : la netteté des vignettes (1 à 5), une image qui gèle, le retard entre la voix et les lèvres.
3. **Vidéo, à 8 puis 12** (10 minutes). Les autres entrent, caméras allumées. Restez **dix minutes** : c'est la durée qui fait chauffer un téléphone.
   *À noter* : la même chose, plus **la chaleur** au dos du téléphone à la fin (froid, tiède, chaud, brûlant) et **la batterie** perdue.
4. **Partage d'écran** (3 minutes). L'ordinateur partage une page de texte.
   *À noter* : le texte est-il **lisible** sur un téléphone ? en combien de temps devient-il net ?
5. **Changement de réseau** (3 minutes). Un iPhone coupe son Wi-Fi en pleine salle (ou l'inverse).
   *À noter* : combien de secondes avant de revoir les autres ? l'écran dit-il quelque chose pendant ce temps ?
6. **Les gestes de l'hôte** (2 minutes). L'hôte **retire** quelqu'un, puis **termine pour tous**.
   *À noter* : la personne retirée sort-elle tout de suite ? peut-elle revenir ? tout le monde est-il sorti à la fin ?

## Ce qu'on note, appareil par appareil

| appareil | réseau | entré du 1ᵉʳ coup ? | image (1-5) | son (1-5) | retard | coupures | chaleur | batterie perdue |
|---|---|---|---|---|---|---|---|---|
| iPhone de … | 4G | | | | | | | |
| … | | | | | | | | |

Une photo de l'écran au moment le plus chargé (12 en vidéo) aide plus qu'une longue phrase.

## Pendant ce temps, sur le VPS (rien de secret ne s'y affiche)

Pendant l'étape 3, en root :

```bash
top -b -n 1 | head -15
systemctl status opmsg-visio-beta --no-pager | head -5
curl -s https://msg-beta.teamop.fr/health
```

**À relever** : la ligne de `livekit-server` dans `top` (le `%CPU` et le `%MEM`), et la charge en haut (`load average`). Colle les trois sorties dans la conversation.

## Après : ce qu'on décide

- **Ça tient à 12** (image correcte, pas de gel, téléphones tièdes) → on garde 12 et 25, et **alors seulement** le site peut parler de « jusqu'à 12 en vidéo ».
- **Ça tient à 8, pas à 12** → on baisse `appels.visio.maxVideo` à 8 (un réglage de la configuration de l'instance, fait ensemble dans la conversation) ; le site dit 8.
- **Les téléphones en 4G décrochent même à 5** → on regarde ensemble les sorties du VPS et la qualité envoyée (la page reçoit déjà l'image en basse définition au-delà de 9) avant de rien promettre.
- **Un réseau d'entreprise ne passe pas** → c'est la limite connue (pas de passage par le relais pour la visio) : on le note, et on en parle avant de le corriger — le corriger touche au pare-feu du relais.
