# Provenance — « Claude for Legal » (Anthropic)

- **Source** : https://github.com/anthropics/claude-for-legal — **commit `4a6c651889c97cc9140580363c73e0eb17379c2b`** (lu et figé le 19 octobre 2026).
- **Licence** : Apache 2.0 (`.claude/licences/apache-2.0.txt`, identique au fichier `LICENSE` du dépôt d'origine).
- **Copié à l'identique, sans une ligne modifiée** :
  - `review.md` ← `commercial-legal/skills/review/SKILL.md` (relire un contrat : la structure d'abord, puis le bon examen)
  - `dpa-review.md` ← `privacy-legal/skills/dpa-review/SKILL.md` (relire un accord de sous-traitance, clause par clause)
  - `use-case-triage.md` ← `privacy-legal/skills/use-case-triage/SKILL.md` (faut-il une analyse d'impact, RGPD compris)
- **Pas copié, exprès** :
  - les 9 autres plugins (litige, social, propriété intellectuelle, étudiants…) : écrits pour le droit américain, hors de ce dont TeamOP a besoin ;
  - les fichiers `.mcp.json` : ils branchent des services externes (DocuSign, Slack, Google Drive, iManage, Ironclad…). Y envoyer des contrats de clients serait un transfert de données que `sous-traitance.html` ne déclare pas ;
  - les `hooks` (vides dans tous les plugins au moment de la lecture, mais jamais repris) et les « managed-agent cookbooks » (agents planifiés avec scripts de déploiement) : rien de ce qui agit tout seul.
- **Comment ils s'emploient** : ce sont des **références de méthode**, rangées hors de `.claude/skills/` pour qu'elles ne se déclenchent pas d'elles-mêmes. Elles supposent un « profil de pratique » rempli par entretien dans le dossier personnel de l'utilisateur et du droit américain : l'agent `juriste` en suit la méthode et remplace ce profil par `.claude/juridique/GRILLE.md`.
- **Les mettre à jour** : relire le diff du dépôt d'origine à un nouveau commit, fichier par fichier, avant de recopier — on ne copie jamais ce qu'on n'a pas lu, et on change ce commit ici.
- Avertissement d'origine, qui vaut aussi ici : *chaque sortie est un brouillon à faire relire par un avocat, pas un avis juridique.*
