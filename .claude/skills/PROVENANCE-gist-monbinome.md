# Skills venus de la liste de MonbinomeIA (28 octobre 2026)

Demandés par Justin (« installe-moi ces 5 skills », https://gist.github.com/MonbinomeIA/4cb064be0feb129ccb9801703677dbf8).
Relus avant d'être recopiés (règle de CLAUDE.md, section ECC) : aucun script n'ouvre le réseau ni n'exécute de commande.

| Du gist | Ce qui est fait |
|---|---|
| **Find Skills** (vercel-labs/skills, commit d8eca76, MIT — `LICENSE-vercel-skills`) | recopié : `find-skills/`, avec un bloc « Adaptation TeamOP » : il CHERCHE et PROPOSE, il n'installe rien tout seul |
| **Instagram Agent Skill** (Jakeschincariol/instagram-agent-skill, commit d03c56b, MIT — `LICENSE-instagram-agent-skill`) | recopié : les 13 `ig-*` (reel, caption, carousel, story, plan, audit, profile, viral, repurpose, comment, reply, dm, human). Les scripts Python (`caption.py`, `beats.py`, `hookscore.py`, `humanize.py`, `detect.py`, `swipe.py`) ne lisent que du texte local. Le modèle de voix est `ig-plan/voice-modele.md` |
| **Prompt Master** | déjà disponible dans les sessions (`prompt-master`) : rien à recopier |
| **Perplexity** (serveur MCP) | PAS installé ici : il demande une clé payante. Justin la pose lui-même sur son Mac, jamais dans la conversation (règle des secrets de CLAUDE.md) |
| **Claude in Chrome** | une extension du navigateur Chrome, à installer par Justin sur son Mac |

⛔ Ces skills sont écrits en anglais pour un compte Instagram personnel. **CLAUDE.md passe avant eux** :
- tout ce qui est écrit pour TeamOP l'est EN FRANÇAIS, dans la voix de l'entreprise (vouvoiement des clients) ;
- `ig-human` mesure le « style IA » sur un lexique ANGLAIS (`slop.json`) : sur un texte français, son score ne prouve rien — relire à la main ;
- aucun nom, adresse ou donnée d'un client réel dans une publication, une légende ou un message privé ;
- **rien ne se publie seul** : ces skills écrivent, Justin publie (le README d'origine le dit aussi).
