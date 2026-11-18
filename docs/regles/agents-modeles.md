# Modèle et effort par agent

> Déplacé tel quel de `CLAUDE.md` le 18 novembre 2026 (allègement : chaque session et chaque agent relit `CLAUDE.md` d'office). Rien n'a été réécrit. 


Rien ne choisit le modèle tout seul : Claude Code ne regarde pas la difficulté d'une
tâche pour décider. Sans réglage, **chaque sous-agent hérite du modèle de la session** —
c'est-à-dire Opus sur tout, y compris pour lire trois versions avec `curl`.

Le choix est donc écrit, agent par agent, dans le frontmatter de `.claude/agents/*.md` :

| Agent | Modèle | Effort | Pourquoi |
|---|---|---|---|
| `verificateur` | `sonnet` | `low` | Constate, ne décide pas : syntaxe, versions servies, `/health` |
| `testeur` | `sonnet` | `medium` | Écrit du Playwright et lit des échecs — du raisonnement, pas le plus cher |
| `deployeur` | `sonnet` | `high` | Le rituel est écrit (skill `publication`), mais une erreur se paie en clients |
| `concepteur` | `sonnet` | `high` | Refonte visuelle et mouvement : un jugement de goût, pas un contrôle mécanique |
| `gardien` | `sonnet` | `high` | Penser comme un attaquant se juge aussi. Une route qui fuit ne plante pas — le coût se compare à celui d'une fuite |
| `relecteur` | `sonnet` | `high` | Applique des critères écrits à un diff : systématique, pas créatif. Mais il passe après chaque changement, donc son coût unitaire compte |
| `juriste` | `sonnet` | `high` | Relit un document juridique contre `.claude/juridique/GRILLE.md` : une grille appliquée, pas une invention. Sur commande, jamais en arrière-plan |
| `redacteur-contrats` | `sonnet` | `high` | Rédige contrats, conditions générales, conditions particulières et sous-traitance dans `server/contrats-textes/`, et fabrique le contrat PDF d'un client (`scripts/contrats/fabriquer.py`, fiche et PDF hors du dépôt). `juriste` relit derrière. Sur commande |
| `echecs-silencieux` | `sonnet` | `high` | Traque ce qui échoue sans que personne le sache (refus muet, `[]` au lieu de `null`, catch qui avale, garde que personne ne lit). Adapté de `silent-failure-hunter` d'Anthropic (Apache-2.0, `.claude/licences/`), lecture seule |
| `client-mystere` | `sonnet` | `high` | Lance le contrôle de bout en bout (`scripts/controle/`) et enquête sur chaque constat — `fichier:ligne`, journal, capture. Trie, ne corrige pas ; lecture seule |

Les deux derniers comblent ce que la CI ne fait pas : elle ne vérifie que les secrets commités
et les failles des dépendances — **pas même la syntaxe**, et personne ne relisait ce qu'une
route renvoie. `gardien` relit `server/` (80 routes exposées sur Internet, données de clients
réels) ; `relecteur` relit le diff avant qu'il parte sur `main`, qui est servi aux clients en
quelques minutes.

⛔ **TOUT DOCUMENT JURIDIQUE QU'UN CLIENT REÇOIT PASSE PAR `juriste` AVANT D'ÊTRE PUBLIÉ** (Justin, 19 octobre 2026 : « il fera, ou à qui tu feras relire,
tous les PDF »). Ce sont les PDF que fabrique le code (devis, bons, rapports d'intervention, certificat de signature), les pages légales du site
(`mentions-legales`, `confidentialite`, `sous-traitance`, `registre-traitements`) et les textes de consentement. L'agent relit contre
`.claude/juridique/GRILLE.md`, cite l'extrait exact, écrit `[à vérifier]` plutôt que d'inventer un article, et dit ce qui doit aller chez un **avocat** :
il n'est pas avocat, et ce qu'il rend est un brouillon. Il vient de « Claude for Legal » (Anthropic, Apache 2.0) : `.claude/references/claude-for-legal/NOTICE.md`
dit ce qui a été repris, ce qui a été refusé (les connecteurs externes) et à quel commit. ⚠️ **Il ne relit des données de clients réels que si Justin le demande
pour ce document-là** : le dépôt est en production et la session passe par Anthropic. Un seul lancement par document, jamais en double.

### ⛔ ET LA MÊME RÈGLE VAUT POUR LES AGENTS D'UN WORKFLOW — posée le 15 septembre 2026 au soir

Un agent lancé par l'outil Workflow **hérite du modèle de la session** si on ne lui dit rien.
Trois chantiers lancés le même soir l'ont appris à leurs dépens : **plus de 5 millions de
jetons, tous en Opus**, dont la moitié pour de la LECTURE — recenser des écrans, lire un
workflow, compter des occurrences dans un fichier. Justin l'a vu passer et a tranché :
« pour la vérification, tu es obligé d'utiliser Opus si y en a besoin ; si y a pas besoin,
prends un truc plus léger pour pas que ça mange toutes les ressources. »

La règle est la même que pour les sous-agents nommés, et elle tient en une phrase :
**⛔ DEPUIS LE 30 SEPTEMBRE 2026 : TOUT EN SONNET.** Justin : « passe tous les agents en sonnet ». Les six agents du dépôt
(`.claude/agents/*.md`), les agents de workflow (`agent(prompt, {model:'sonnet', …})`) et les sous-agents sans définition
(`CLAUDE_CODE_SUBAGENT_MODEL`) tournent en Sonnet ; seul l'EFFORT varie encore selon la tâche (tableau ci-dessous). La
règle d'avant (« Opus là où le jugement est le produit, Sonnet ou Haiku là où la rigueur suffit ») ne revient que sur sa
phrase.

| ce que fait l'agent | modèle | effort | pourquoi |
|---|---|---|---|
| recenser, cartographier, lire un fichier et en rendre la structure | `sonnet` | `medium` | il constate ; une erreur se voit au premier contrôle |
| vérifier une affirmation mécanique (ce motif est-il là ? ce fichier contient-il X ?) | `sonnet` | `low` | c'est un `grep` qui rédige |
| attaquer une proposition, chercher la faille | `sonnet` | `high` | systématique plus que créatif — mais il faut de la profondeur |
| concevoir une architecture, trancher entre deux options, synthétiser | `sonnet` | `high` | c'est un jugement, et il se paie une fois |
| sécurité et conformité | `sonnet` | `high` | penser comme un attaquant se juge ; le coût se compare à celui d'une fuite |

Concrètement, dans un script de workflow : `agent(prompt, {model:'sonnet', effort:'medium'})`.
**Ne jamais omettre `model` sur une phase de lecture** — l'omission coûte cher et ne se voit
qu'après coup, sur la facture.

⚠️ Corollaire à connaître AVANT de vouloir « corriger » un workflow déjà lancé : changer le
modèle change les options de l'agent, donc invalide le cache de reprise. Relancer moins cher un
chantier en cours coûte PLUS que de le laisser finir. On règle le modèle à l'écriture, pas en
cours de route.

⛔ **UNE CONSIGNE « NE MODIFIE RIEN » N'EST PAS UNE GARDE.** Le 23 septembre 2026, un agent de
workflow chargé de LIRE les en-têtes a modifié `app.html` et `beta.html`, commité et poussé deux fois
(`a5db18e`, `9deed76`) — et sa note dans `REPRISE.md` déclarait « déjà corrects » des documents que
la sonde donnait faux 18 fois sur 21. Il avait `Edit` et `Bash` : la phrase ne lui retirait rien.
**Après tout workflow, `git log` et `git status` avant de croire quoi que ce soit.** Pour une phase de
lecture, `agentType: 'Explore'` retire `Edit`/`Write` (pas `Bash` : le risque baisse, il ne disparaît
pas).

Tout autre sous-agent (recherche, revue de code, exploration) retombe sur
`CLAUDE_CODE_SUBAGENT_MODEL` dans `.claude/settings.json` — Sonnet. La session
principale, elle, garde le modèle choisi dans le terminal : ce fichier ne la touche pas.

Ordre de priorité, du plus fort au plus faible : `CLAUDE_CODE_EFFORT_LEVEL` (variable
d'environnement) → frontmatter de l'agent → réglage de session.

`bashOutputMaxChars` plafonne ce qu'une commande renvoie au modèle. Une trace
Playwright en échec fait des dizaines de milliers de caractères, tous facturés.
