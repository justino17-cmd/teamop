# Skills venus de trailofbits/skills (28 octobre 2026)

Demandés par Justin (28 octobre 2026, 22 h 10 : « tu installes tous les skills […] vu que tu vas corriger et améliorer les agents, ça
permet, avec les skills, de le faire »), d'après la recherche `agents-github.md` (proposition n° 2).
Source : https://github.com/trailofbits/skills, commit `2be6433b39e009cd2b6fd3be1895f6b1faa5af9a` (28 octobre 2026).
Licence : **CC-BY-SA-4.0** — texte dans `LICENSE-trailofbits`. Un seul `LICENSE` à la racine du dépôt d'origine ; les auteurs sont
dans les `plugin.json` (Omar Inuwa pour `differential-review`, Eric Quintero pour `supply-chain-risk-auditor`) et le README dit
« Made by Trail of Bits ».

**Ce que la licence impose, et que ce dépôt tient** : mention d'origine (ce fichier + le bloc de chaque `SKILL.md`), lien vers la
licence, indication des modifications (ci-dessous), et les adaptations sont publiées sous la même licence. Une copie interne
n'oblige à rien de plus ; si ce dépôt ou ces skills étaient un jour partagés, ces trois points sont déjà en place.

| plugin d'origine | version | ce qui est dans `.claude/skills/` | ce qui a été fait |
|---|---|---|---|
| `differential-review` | 1.1.4 | `differential-review/` : `SKILL.md`, `methodology.md`, `adversarial.md`, `patterns.md`, `reporting.md`, `adversarial-modeler.md` | Copie telle quelle + bloc « Adaptation TeamOP » avant le texte (rapport hors dépôt, comptage des appelants par le CODE, pas d'agent enregistré, tout en Sonnet). **Non copiés** : la commande `/diff-review`, `agents/openai.yaml`, le logo SVG, le README du plugin. L'agent `adversarial-modeler` devient un fichier de référence (il n'a pas de ligne `model:` et alourdirait les descriptions chargées à chaque session). |
| `insecure-defaults` | 2.0.3 | `insecure-defaults/` : `SKILL.md` (écrit ici) + `references/` (12 fichiers) | **Ce n'est pas un skill dans l'original** : une commande qui lance un `Workflow` (`workflows/audit.js`) dont la phase de vérification est en **Opus**. Le script n'est pas recopié ; sa méthode (recon → balayage par famille → réfutation en cinq étapes → rapport) est écrite dans un `SKILL.md` en Sonnet, avec les exemples TeamOP. `references/` est recopié sans changement. **Non copiés** : `workflows/`, `tests/`, `commands/`, `README.md`. |
| `supply-chain-risk-auditor` | 2.0.4 | `supply-chain-risk-auditor/` : `SKILL.md` + `scripts/` (`collect.py`, `model.py`, `render.py`, `sources.py`, `pyproject.toml`, `uv.lock`) | Copie telle quelle + bloc « Adaptation TeamOP » (ce qui sort de la machine, le jeton `gh`, cibles `server/`, `server-msg/`, `server-courrier/`). **Non copiés** : les `test_*.py`, `evals/`, le logo, `openai.yaml`, le README. |

**Pas copié du dépôt d'origine, exprès** : `second-opinion` (envoie du code à Codex / un autre fournisseur — du code serveur de clients
réels n'y va JAMAIS), `static-analysis` (CodeQL / Semgrep : outils à installer à part, décision de Justin), les autres plugins
(poids de descriptions chargé à chaque session).

## Ce qui a été relu avant la copie — et ce qui ne l'a PAS été

- ⚠️ **Le scanner prévu n'a pas tourné.** SkillSpector (NVIDIA, voir `scripts/scanner-skills.sh`) n'a pas pu être installé : la
  commande `uv venv` puis `uv pip install` du dépôt cloné a été REFUSÉE par le classifieur de permissions de la session (« Code from
  External »), et n'a pas été contournée. **Il n'y a donc ni score, ni verdict SAFE / CAUTION / DO_NOT_INSTALL pour ces trois skills.**
  Aucune ligne de ce fichier ne dit « scanné SkillSpector ».
- Ce qui a été fait à la place : une **relecture à la main** et un **balayage statique maison** (`outils-scan/scan_manuel.py` du
  scratchpad de la session : 8 familles de motifs grossières — réseau, exécution, installation, identifiants, obfuscation, injection de
  prompt, écriture de configuration, caractères invisibles ; stdlib, lecture seule), constat par constat relu en contexte, le
  28 octobre 2026. **C'est beaucoup plus grossier que SkillSpector** (71 motifs en 17 catégories, analyse de dépendances, score) ; il dit
  seulement ce qu'on voit à l'œil. À refaire avec le vrai scanner dès que Justin l'autorise.
- Résultat de cette relecture : `differential-review` — du texte, aucun script, aucun réseau ; `insecure-defaults` — du texte et des
  motifs de recherche (les « identifiants » repérés sont des EXEMPLES de secrets par défaut, c'est son contenu) ; `supply-chain-risk-auditor`
  — **vrai comportement, pas malveillant, à connaître** : requêtes HTTPS vers huit services publics (noms et versions de paquets) et lecture
  du jeton de `gh auth token` envoyé à `api.github.com`. Les scripts sont de la bibliothèque standard, `dependencies = []`. Le détail et la règle
  d'emploi sont dans le bloc du `SKILL.md`. **Aucun des trois n'a été jugé réellement risqué** ; c'est un jugement humain, pas un score.
- Aucun de ces scripts n'a été exécuté dans ce dépôt au moment de la copie (contrôle de syntaxe seulement).
