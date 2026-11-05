# Skill venu de cloudflare/security-audit-skill (5 novembre 2026)

Demandé par Justin (« on le recopie, on scanne, on adapte », règle « Les skills tiers » de CLAUDE.md ; « installe les skills »).
Source : https://github.com/cloudflare/security-audit-skill, commit `c1c8a8c1471069fb0e188eeaff69b8e8db6564a8` (14 septembre 2026,
« Clarify guidance and full audit modes »), récupéré le 5 novembre 2026.
Licence : **MIT** (Cloudflare, Inc., 2025-2026) — vérifiée dans le `LICENSE` du dépôt ; texte dans `LICENSE-cloudflare`.
Le MIT impose de garder la mention et le texte de licence dans les copies : `LICENSE-cloudflare` + le bloc de `security-audit/SKILL.md`.

| ce qui est dans `.claude/skills/security-audit/` | ce qui a été fait |
|---|---|
| `SKILL.md` | texte d'origine (anglais) **sans changement**, plus un bloc « Adaptation TeamOP » inséré entre le front matter et le titre |
| `RECONNAISSANCE.md`, `HUNTING.md`, `ATTACK-CLASSES.md`, `VALIDATION-AND-REPORTING.md` + 9 companions (`WEB-PROTOCOL-AND-AUTH`, `DATA-ISOLATION-AND-LIFECYCLE`, `CLIENT-SIDE`, `CLOUD-AND-DEPLOYMENT`, `AI-AND-LLM`, `PROTOCOLS-RPC-AND-MESSAGING`, `RESOURCE-EXHAUSTION-AND-AVAILABILITY`, `SUPPLY-CHAIN-AND-RELEASE`, `DESKTOP-MOBILE-AND-LOCAL-IPC`, `MEMORY-SAFETY-AND-BINARY`) | copie telle quelle |
| `report-schema.json`, `validate-findings.cjs`, `validate-coverage-ledger.cjs` | copie telle quelle. **Relus à la main** : bibliothèque standard Node (`fs`, `path`, `util`) seulement, une lecture de fichier en `O_NOFOLLOW`, aucune écriture, aucun réseau, aucun `child_process`, aucun `eval` |
| **Non copiés** | `validate-findings.test.cjs`, `validate-coverage-ledger.test.cjs` (fixtures de test avec des chemins du type `/etc/passwd`, `mkfifo`, `spawnSync` : utiles à l'auteur, inutiles ici, et ce sont eux qui font hurler le scanner) ; `README.md` (mode d'emploi `npx skills add`, que ce dépôt interdit) |

## Ce qui a été relu, et ce qui l'a été moins

- Lus en entier : `SKILL.md`, `HUNTING.md`, `LICENSE`, `README.md`, les deux validateurs (par leurs appels système et leurs importations).
- **Les autres fichiers de référence (≈ 200 Ko de méthode) n'ont pas été relus ligne à ligne** : parcourus par motifs (adresses, `curl`, `wget`,
  `base64`, `eval`, `npm install`, `pip install`, `sudo`, « ignore previous », `system prompt`, `exfil`) — le seul résultat est de la prose de
  checklist (« exfiltration par export », « `eval()` dans le code audité »). Aucune adresse sortante, aucune commande à exécuter.
- **Ce que le skill FAIT** : il dirige un agent ; en mode complet il écrit des rapports dans un dossier de sortie qu'il choisit (par défaut
  `~/security-audit-skill/<dépôt>/run-N`) et demande de ne rien exécuter hors d'un bac à sable sans réseau. Il n'a aucun script qui sorte de la machine.
  Sa propre règle (« pas de sonde d'un service déployé ») est la même que la nôtre ; le bloc d'adaptation la rend explicite.
- Le skill est conçu pour un harnais de **nombreux agents** (reconnaissance, vagues de chasseurs, critiques de couverture, vérificateurs indépendants).
  Ici on l'applique en gardant sa structure et sa barre de preuve ; les agents sont en Sonnet.

## Scan

Scanné par SkillSpector le 05/11/2026 (v2.12.0, mode `--no-llm` via `scripts/scanner-skills.sh`) : score 100, recommandation **DO_NOT_INSTALL**,
couverture 75 % (15 composants sur 20 inspectés ; statut « partial »). **Le verdict brut est donc mauvais, et ce fichier ne le cache pas.**
14 constats (9 HIGH, 4 MEDIUM, 1 LOW) — **tous relus en contexte, tous des faux positifs de mots-clés** sur un skill dont le SUJET est la sécurité :
- `PE3` (accès à des fichiers d'identifiants) ×6 : une question de checklist (« y a-t-il des `.env`, `*.pem` commités ? »), une phrase sur les ACL de trousseau, et
  `/etc/passwd` comme valeur de test de traversée de chemin dans les deux `*.test.cjs` (non recopiés) ;
- `AE1` / « artefact non entièrement inspecté » ×4 : le parseur statique n'a pas pu résoudre une expression dans `validate-*.cjs` et `VALIDATION-AND-REPORTING.md`
  (les validateurs ont été relus à la main) ; la couverture partielle vient aussi de 5 références à des fichiers que le skill ÉCRIT à l'exécution (`architecture.md`…) ;
- `MP3` (empoisonnement de mémoire), `EA2` ×2, `TM3`, `PE1` : phrases de méthode sur ce qu'un AUDITEUR doit chercher chez la cible (mémoire d'un agent, sockets sans
  contrôle d'identité, commentaires `TODO: add auth`).
Aucun constat ne décrit un comportement du skill lui-même. C'est un **jugement humain, pas un score** ; il est à refaire si le skill est mis à jour. Le rapport JSON brut
est resté hors du dépôt (scratchpad de la session).
Installation du scanner : sur la demande de Justin (« installe les skills »), UNE tentative de la commande exacte du script (`git clone` hors dépôt,
`uv venv`, `uv pip install .`) a réussi dans un dossier jetable ; le commit cloné (`62c2fe8622f580ac292d4078c3b71f790194dbbd`, v2.12.0) n'est pas celui que la note du
28 octobre avait relu (`d501c0d5…`) — son code n'a pas été relu, il a tourné en `--no-llm` (seuls des noms de paquets partent vers `api.osv.dev`).
