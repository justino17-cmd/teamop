---
name: supply-chain-risk-auditor
description: "Audits a project's dependencies for supply-chain risk: version-matched advisories for direct dependencies and the full lockfile tree, abandoned or archived upstreams, npm publisher concentration, and install-time script execution. Use when asked to audit dependencies, assess supply-chain or third-party package risk, or review a dependency tree before an engagement."
allowed-tools: Read Write Bash Glob Grep
---

> **Adaptation TeamOP** — ce bloc passe avant le texte d'origine (en anglais), qui suit tel quel.
>
> - Copié de `trailofbits/skills`, plugin `supply-chain-risk-auditor` 2.0.4 (auteur : Eric Quintero ; commit `2be6433`, 28 octobre
>   2026), licence **CC-BY-SA-4.0** : voir `LICENSE-trailofbits` et `PROVENANCE-trailofbits.md`. Ce bloc est sous la même licence.
>   Copiés : `SKILL.md` et les six fichiers de `scripts/` (Python, bibliothèque standard seulement, aucune dépendance à installer).
>   Non copiés : les `test_*.py`, `evals/`, le logo et le `openai.yaml`.
> - **Ce que les scripts font sortir de la machine** — à savoir avant de les lancer : des NOMS et des VERSIONS de paquets, vers
>   `api.osv.dev`, `registry.npmjs.org`, `api.npmjs.org`, `pypi.org`, `proxy.golang.org`, `api.deps.dev`, `api.github.com`,
>   `api.scorecard.dev`. Aucun code, aucun fichier du dépôt autre que les manifestes. Pour `server/` ce sont les six dépendances de
>   `server/package.json` (publiques) : acceptable. **Jamais** sur un manifeste qui nommerait un paquet privé d'un client.
> - ⛔ **Le jeton GitHub.** `sources.py` (`gh_token()`) exécute `gh auth token` et envoie le résultat, en en-tête `Authorization`, à
>   `api.github.com` seulement. Ce n'est pas caché, c'est la lecture d'un identifiant de la machine. Donc : **l'étape 2 du skill
>   (« check `gh auth status` ») n'autorise PAS à connecter `gh` pour l'occasion.** Sans `gh` connecté, GitHub limite à 60 requêtes par
>   heure : les critères « dépôt abandonné / archivé » reviennent « non évaluables » et le rapport le dit — c'est un résultat
>   honnête, pas un échec. Le jeton ne s'affiche jamais, ne se colle jamais dans une conversation (règle de CLAUDE.md sur les secrets).
>   Un jeton de la machine de travail n'est jamais celui du VPS : ne rien lancer d'ici avec une clé du VPS.
> - **Cible** : `server/`, `server-msg/` et `server-courrier/` (chacun a son `package.json`), jamais la racine (pas de manifeste).
>   Depuis la racine du dépôt :
>   `uv run .claude/skills/supply-chain-risk-auditor/scripts/collect.py server --json "$SCRATCH/findings.json"` puis
>   `uv run .claude/skills/supply-chain-risk-auditor/scripts/render.py "$SCRATCH/findings.json" --out "$SCRATCH/rapport.md"`
>   (`$SCRATCH` = le dossier temporaire de la session : **les sorties vont hors du dépôt**, comme le skill le dit lui-même).
>   `uv run` ne lance que Python ; il n'installe rien (le fichier déclare `dependencies = []`). Ni `npm install`, ni `npm ci` ici.
> - **Il complète `npm audit --omit=dev`, il ne le remplace pas** (CLAUDE.md : `cd server && npm audit --omit=dev`) : `npm audit` dit
>   les failles connues d'une version ; ce skill ajoute les dépôts abandonnés, la concentration des éditeurs npm et les scripts
>   d'installation. À lancer AVANT d'ajouter une dépendance — la règle du dépôt est « fait main plutôt qu'une dépendance de plus » —
>   et à chaque montée de version d'une dépendance existante.
> - **Ce que le rapport ne dit pas** : `server/` n'a pas de `yarn.lock` ni de `pnpm-lock.yaml` ; le `package-lock.json` est lu.
>   Lire le tableau de couverture AVANT de répéter « aucune faille » (le skill insiste, avec raison).
> - **Agents** : le travail d'interprétation (ordre d'action, chemins de montée de version) se confie à `gardien` ou se fait en
>   session — toujours en Sonnet. Le skill `report-writing:writing-style` cité plus bas n'est pas installé : le registre demandé
>   (impersonnel, déclaratif, sans intensifs) se suit à la main. Les rapports sont en FRANÇAIS ici, ton factuel.
> - Rien du rapport ne part chez un client ni ne se publie : c'est un outil interne de Justin et de ses agents.

# Supply Chain Risk Auditor

Generates a supply-chain risk report for a project's direct dependencies (npm, PyPI,
Go), plus an advisory sweep of everything its lockfile resolves. Two deterministic
scripts do the measuring; your job is the judgment they refuse to automate.

## Why the scripts do the measuring, not you

Every figure in this report is a claim about somebody else's project, and hand-collected
figures were measured wrong before this skill was rebuilt around scripts: GitHub
contributor counts said five-plus people maintain `lodash` where npm's ACL says one, and
`gh` saw zero downloads for a package that moves 164 million a week. Do not estimate
maintainer counts, downloads, staleness, or CVE history from `gh`, web search, or
memory — run the collector, and quote what it measured.

The scripts enforce two rules worth knowing before you read their output:

- **Unavailable data is never evidence of risk.** Every criterion resolves to
  assessed-clean, assessed-flagged, or unassessable-with-a-reason.
- **An absent measurement is never a clean verdict.** A run that measured nothing exits
  non-zero instead of printing a report that finds nothing.

## Workflow

1. Confirm the target directory has manifests: `package.json`, `pyproject.toml`,
   `requirements*.txt`, or `go.mod`. If none exist, say so and stop — do not audit an
   ecosystem this collector does not parse by hand. Lockfiles read for exact versions
   and the transitive sweep: `package-lock.json`/`npm-shrinkwrap.json`, `uv.lock`, and
   a go 1.17+ `go.mod`. `yarn.lock`, `pnpm-lock.yaml`, and `poetry.lock` are not read —
   the report says so when they are present, and versions fall back to pins or the
   latest release.
2. Check `gh auth status`. Unauthenticated GitHub allows 60 requests/hour against 5,000,
   and the collector makes several per dependency; expect repository criteria to come
   back unassessable without it. Say so rather than fixing it silently.
3. Collect, then render. Put outputs somewhere outside the audited repository unless
   asked otherwise:

   ```sh
   uv run {baseDir}/scripts/collect.py <project-dir> --json <out-dir>/findings.json
   uv run {baseDir}/scripts/render.py <out-dir>/findings.json --out <out-dir>/report.md
   ```

   Expect a few minutes for ~50 dependencies — several HTTP requests per dependency,
   more with many Go modules, and slower without authenticated `gh`. If `collect.py`
   exits non-zero, it is refusing to report — relay its message verbatim instead of
   retrying or working around it.
4. Read `report.md` and `findings.json`. The report is the deliverable; the JSON carries
   the datum behind every verdict when you need to cite one.
5. Add what the collector cannot, clearly separated from what it measured:
   - A short narrative for this reader: what to act on first, and why.
   - Upgrade paths for advisory findings — check whether the fix is a patch or a major
     version away.
   - Replacement candidates for abandoned or archived dependencies. Verify a candidate
     exists in the registry before naming it, and label these as judgment, not
     measurement.
   - For flagged install scripts: whether `npm ci --ignore-scripts` is viable for this
     project's build.

## Style for what you add

Write added prose the way a security report reads, and apply the same register to the
report addendum and the final reply alike — replies get pasted into tickets and reports
verbatim. State the finding, the datum behind it, and the action.

- Impersonal and declarative: no first or second person ("I ran the collector", "you
  should upgrade"), no contractions, no exclamation points.
- Active voice, with the subject matter as the actor: "upgrading to 1.19.0 clears all
  25 advisories", not "it is recommended that axios be upgraded".
- Objective: no intensifiers or subjective framing ("very", "significant",
  "fortunately"), and no guesses about why the project chose what it chose.
- Tense: past for what the audit did, present for the state of the dependencies,
  future for the consequences of acting or not.
- Constructive: a recommendation names the action and its cost, never a culprit.

If the `report-writing:writing-style` skill is available in the session, follow it —
it is the full version of this register.

The rendered report carries facts only. The interpretive rules below are instructions
to you, not content for the reader — do not copy them into the deliverable as caveats
or framing.

## Reading the report

- **Unassessable is not risk.** PyPI publishes no maintainer ACL and Go has no registry;
  those rows say what could not be known, not what is wrong.
- **The coverage table bounds every claim.** "No advisories" means "none among what was
  assessed" — check the assessed count before repeating a clean verdict.
- **Quote figures verbatim.** Do not re-derive, round, or embellish the report's
  numbers; every one is reproducible from the artifact.
- **Absence from the findings is not endorsement.** A dependency with no findings was
  measured against these criteria only.

## Rationalizations to reject

- "`gh` can give me maintainer counts faster than the collector." Measured wrong — repo
  contributors and registry publish rights are different populations.
- "No findings, so the dependencies are safe." Read the coverage table; on PyPI and Go,
  half the criteria are structurally unassessable.
- "The unassessable rows would just confuse the reader; I'll drop them." They are the
  boundary of every claim in the report. Dropping them turns partial coverage into a
  clean bill of health, which is the failure this skill was rebuilt to prevent.
- "The version is probably close enough." A range checked at latest-release and a
  lockfile-resolved version are different claims; the report labels which one it makes.
  Keep the label.

## When not to use

- License compliance auditing.
- Scanning the target's own source for vulnerabilities or secrets — this skill never
  reads dependency source, only registry, advisory, and repository metadata.
- Judging whether the project installs or builds. The audit is designed to work from
  nothing more than the dependency list — manifests and lockfiles — and never installs,
  builds, or executes anything. Broken installs and import-time breakage are out of
  scope, and worth saying so if the user seems to expect them.
- Ecosystems other than npm, PyPI, and Go; say the ecosystem is unsupported rather than
  improvising an audit for it.
