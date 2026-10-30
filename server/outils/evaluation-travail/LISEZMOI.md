# Évaluation du mode « travail » : 45 cas, avant / après

Pourquoi : Justin voulait **voir** si les agents (Camille, Léa, Margaux) travaillent mieux, pas le croire.
Ce dossier rejoue 45 situations fictives — 15 par agent — deux fois : **avant** (interrupteur coupé, le circuit d'hier) et **après** (interrupteur allumé), puis écrit un rapport lisible côte à côte.

## Ce qu'il y a ici

| fichier | rôle |
|---|---|
| `cas.js` | les 45 cas, tous fictifs (entreprises, personnes, adresses `exemple-eval.fr`, numéros de dossier inventés), avec ce qu'on attend de l'agent |
| `jouer.js` | monte les **vrais** modules dans un dossier jetable, joue un cas, applique les exigences de métier |
| `rejouer.js` | le script **à la main** : joue les 45 cas contre le **vrai** modèle et écrit le rapport (Markdown) |
| `../../../tests/test-3204.js` | le banc : les mêmes 45 cas contre un **faux** Anthropic (déterministe, en CI) |

## Lancer le rejeu avec le vrai modèle (sur le serveur, hors CI)

```bash
# 1. Combien ça coûterait — n'envoie rien
TEAMOP_CONFIG=/opt/teamop/config.json node server/outils/evaluation-travail/rejouer.js --estimer

# 2. Un agent à la fois (le plus prudent)
TEAMOP_CONFIG=/opt/teamop/config.json node server/outils/evaluation-travail/rejouer.js --oui --agent camille --sortie /tmp/rapport-camille.md

# 3. Les 45 cas
TEAMOP_CONFIG=/opt/teamop/config.json node server/outils/evaluation-travail/rejouer.js --oui --sortie /tmp/rapport-travail.md
```

Options : `--agent camille|lea|margaux|tous` · `--cas c01,c05` · `--budget 8` (dollars réels au-delà desquels le script refuse de partir) · `--par-jour camille=20,lea=5,margaux=3` (le volume quotidien qui sert à chiffrer le mois — **des hypothèses**, à corriger avec vos vrais chiffres).

Rien n'est envoyé sans `--oui`. Le coût est annoncé **avant** l'envoi.

**Ce que ça coûte** : de l'ordre de quelques dollars pour les 45 cas (annoncé par `--estimer` avec vos modèles). Ces appels passent par la clé des agents (`agents.cleApi`) ; ils sont comptés par le script lui-même, **pas** dans le budget du mois des agents (le script tient son propre budget, dans un dossier jetable) — mais ils comptent sur la facture d'Anthropic.

## Lire le rapport

Pour chaque cas : le courriel reçu (fictif), le texte d'**avant**, le texte d'**après**, les notes de la grille de relecture, et la liste des exigences tenues (✅) ou manquées (❌). En tête, un tableau qui chiffre le mois.
**Les textes sont à lire, pas à compter.** Un « 8/8 » ne dit pas que le courriel est beau ; il dit qu'il a répondu à tout, cité le dossier, rien promis.

## Ce que ce dossier ne prouve pas

- Que le vrai modèle écrira **toujours** aussi bien : 45 cas ne sont pas un parc de clients. Le banc `test-3204` prouve que la **tuyauterie** tient (l'interrupteur, la boucle d'outils, la grille, les replis, les droits) ; la **qualité** se juge en lisant ce rapport.
- La tenue à la charge, ni le coût réel d'un mois : le chiffre du rapport est une **estimation** (volumes supposés × coût moyen mesuré sur 45 cas).
- Que les textes de Margaux sur le droit sont validés par un juriste : l'indemnité de 40 € (articles L. 441-10 et D. 441-5 du Code de commerce) est écrite par le code, mais **à faire confirmer par l'expert-comptable** (la mention doit aussi figurer dans les CGV et sur les factures).

## Règles de ce dossier

- **Aucun vrai client** : jamais un vrai courriel, un vrai nom, une vraie adresse. `test-3204` refuse toute adresse hors des domaines réservés.
- **La clé** ne vient que de la configuration du serveur ; elle n'est ni affichée, ni écrite, ni citée dans une erreur.
- Le script n'écrit que dans un dossier jetable et dans le fichier de rapport. Il ne touche pas aux données du serveur.
