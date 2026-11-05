# Skill venu de Christophe2654/subvento-plugin (5 novembre 2026)

Demandé par Justin : « cherche-moi un skill ou un agent qui pourrait trouver des fonds pour l'entreprise », « il y a des agents qui font ça sur
GitHub », puis « installe le skill ». Règle suivie : « Les skills tiers » de CLAUDE.md (on recopie, on scanne, on adapte ; jamais `enabledPlugins`).
Source : https://github.com/Christophe2654/subvento-plugin, commit `dff6508dac9634a1cc039150ba70bda208498383` (13 octobre 2026), récupéré le
5 novembre 2026 par un clonage en lecture seule.
Licence : **MIT** (« Copyright (c) 2026 Subvento ») — vérifiée dans le `LICENSE` du dépôt ; texte dans `LICENSE-subvento`. Le MIT impose de garder
la mention et le texte de licence dans les copies : `LICENSE-subvento` + le bloc de `aides-publiques-entreprise/SKILL.md`.

## Ce qui a été recopié

| dans la source | ce qui a été fait |
|---|---|
| `skills/aides-publiques-entreprise/SKILL.md` | texte d'origine **sans changement**, plus un bloc « Adaptation TeamOP » inséré entre le front matter et le titre |
| `LICENSE` | recopié dans `LICENSE-subvento` |
| `.mcp.json` (le connecteur `https://subvento.finance/mcp`) | **non recopié**, exprès : un serveur distant tenu par un tiers verrait ses instructions chargées dans chaque session de ce dépôt. Justin l'ajoute dans ses réglages claude.ai s'il le veut ; sinon le skill fait un appel ponctuel, après son accord (bloc d'adaptation, point 2) |
| `.claude-plugin/plugin.json`, `.claude-plugin/icon.png`, `README.md` | non recopiés (description du plugin, icône, mode d'emploi) |

## Ce qui a été relu

- **Lus en entier** : `SKILL.md`, `README.md`, `LICENSE`, `.mcp.json`, `.claude-plugin/plugin.json`. Le plugin ne contient **aucun programme** : seulement
  une consigne en français et l'adresse d'un connecteur. Aucun caractère invisible (recherche des catégories Unicode Cf/Co/Cs). Les seules adresses
  citées sont celles de subvento.finance et du dépôt.
- **Le connecteur** a été interrogé le 5 novembre 2026 sans envoyer de donnée de TEAM OP : `initialize`, `tools/list` (un seul outil,
  `subvento_aides_par_siren`, annoté en lecture seule ; entrées `siren` et `besoins` parmi dix valeurs fermées), puis `tools/call` SANS argument (il
  répond par la liste de ce qu'il demande). Le serveur ne tient pas de session.
- **L'éditeur**, d'après les pages légales de subvento.finance lues le même jour : un entrepreneur individuel (micro-entreprise) à Paris ; hébergement
  Vercel Inc. (États-Unis). Le site dit construire son répertoire à partir d'Aides-territoires, de les-aides.fr et d'aides-entreprises.fr, et vérifier
  chaque fiche à la source officielle chaque mois (affirmation du site, non contrôlée). Sa politique de confidentialité dit garder le SIREN, un extrait
  de la fiche publique de l'entreprise et les besoins cochés ; l'adresse électronique n'est demandée que sur le site, pour la liste détaillée.
- **Ce qui n'a pas été vérifié** : la qualité et la fraîcheur des fiches de Subvento, et la façon dont il calcule son « estimation prudente ». D'où le
  point 3 du bloc d'adaptation : une piste se vérifie à sa source officielle avant d'être dite.

## Scan

**SkillSpector n'a pas tourné.** Le scanner installé la nuit du 4 au 5 novembre n'existe plus dans le conteneur, et sa réinstallation (la commande
exacte de `scripts/scanner-skills.sh`) a été refusée le 5 novembre par le classifieur de permissions de la session (« Code from External ») ; ce refus
n'a pas été contourné. Le skill a été relu à la main en entier (ci-dessus) et balayé par `scripts/scanner-skills.sh --grossier` (un substitut sans
score ni verdict) : un seul constat, l'icône PNG signalée comme binaire, non recopiée. À refaire avec SkillSpector quand Justin l'aura installé, et à
chaque mise à jour du skill.
