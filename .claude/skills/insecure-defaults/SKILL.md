---
name: insecure-defaults
description: "Audit a file, directory or whole repo for insecure DEFAULT configuration: fallback secrets, default credentials, fail-open switches, weak crypto, permissive access, debug leakage. Each candidate is traced to the security decision it reaches before it is reported (a refuting pass, not a pattern list). Use when auditing server/ or a script before it ships, when adding a config option or an environment variable with a fallback, or when a reviewer asks 'what happens if this variable is missing?'. FR : valeurs par défaut dangereuses, garde qui s'ouvre quand la configuration manque."
allowed-tools: Read Grep Glob Bash
---

> **Adaptation TeamOP** — ce skill est TIRÉ du plugin `insecure-defaults` 2.0.3 de `trailofbits/skills` (commit `2be6433`,
> 28 octobre 2026), licence **CC-BY-SA-4.0** (voir `LICENSE-trailofbits`, `PROVENANCE-trailofbits.md`). L'original n'est PAS un
> skill : c'est une commande `/insecure-defaults:audit` qui lance un script `Workflow` (`workflows/audit.js`) avec une phase
> de vérification en **Opus**. Ici :
>
> - le script Workflow n'est **pas** recopié (« tout en Sonnet » : Justin, 30 septembre 2026 — et la phase Opus aurait dû être
>   changée de toute façon) ; sa MÉTHODE est écrite ci-dessous, à suivre à la main ou à confier à des agents **Sonnet** (jamais plus
>   de trois agents : un chercheur par grande famille, un vérificateur — consommation hebdomadaire de Justin) ;
> - `references/` est recopié tel quel (six familles : une règle « à signaler quand / à ignorer quand », des paires vulnérable/sûr,
>   et les motifs de départ en `.json`). Ce texte-ci et les ajouts TeamOP sont sous la même licence que l'original.
>
> **Ce que TeamOP sait déjà de ce défaut, et qui change le tri :**
> - C'est LE défaut qui a fait le plus de mal ici : une garde qui **s'ouvre** quand quelque chose manque. `install.sh` posait une clé
>   maître neuve si le FICHIER de clé manquait (les bases chiffrées devenaient illisibles) ; le relais de `/api/clients/sync` lisait `promoFin` dans le
>   corps d'une requête ; « gratuit » passait pour « payé » ; `mailPreuveExigee` n'était fermé que si on l'écrivait. Le sens juste est
>   « dans le doute on ne décide rien » (CLAUDE.md, règle « PLUS DE FORMULE GRATUITE »), jamais « dans le doute on ouvre ».
> - **À NE PAS « corriger » parce que le balayage le signale** : `SYNC_SECRET_DEFAULT` et `SYNC_SALT` d'`app.html` (le mot de passe
>   qui chiffre les données de toutes les entreprises sans clé personnalisée : les changer les rend illisibles — CLAUDE.md « NE JAMAIS
>   TOUCHER »), la clé Firebase publique d'`app.html` et la clé de l'espace de repli écrite en clair (connues, documentées, la règle
>   Firestore est la vraie garde). Les signaler dans le rapport comme « connu, voulu », avec la ligne de CLAUDE.md qui le dit.
> - **Cibles utiles** : `server/` (`index.js`, `install.sh`, `poser-cle.js`, `set-*.sh`), `server-msg/`, `server-courrier/`,
>   `.github/workflows/`, `firestore.rules`, `scripts/`. La configuration de production vit sur le VPS (`/opt/teamop/config.json`) et
>   n'est PAS dans le dépôt : pour « le déploiement fournit-il toujours la variable ? », les manifestes lisibles sont `server/install.sh`,
>   `server/nginx-teamop.conf`, `.github/workflows/*.yml` — dire ce qu'on n'a pas pu lire plutôt que conclure « toujours fournie ».
> - **Le rapport va hors du dépôt** (dossier temporaire de la session), sans valeur de secret : on cite `fichier:ligne` et le NOM de la
>   variable, jamais sa valeur. Un secret trouvé en clair se signale par son emplacement et sa famille, pas recopié.
> - Un constat ne devient pas un correctif tout seul : il passe par la bêta, les bancs et la règle « un banc qui passe ne prouve rien
>   tant qu'on ne l'a pas vu ÉCHOUER ». Pour `server/`, un push sur `main` DÉPLOIE le VPS : rien n'est poussé sans les preuves.

# Insecure defaults audit

Finds code that **starts and carries on** with an insecure value when its configuration is missing — and refutes everything that is not
really reachable, so that what is left can be acted on. A pattern sweep alone produces noise; the discipline is in the refutation.

## The six families (one corpus file each)

| id | what it catches | read before judging |
|---|---|---|
| `fallback-secrets` | `SECRET = env.get('KEY') or 'dev'` | `references/fallback-secrets.md` |
| `default-credentials` | a seeded `admin` / `admin123` | `references/default-credentials.md` |
| `fail-open-security` | `getenv('REQUIRE_AUTH', 'false')`, a check that is skipped when its setting is absent | `references/fail-open-security.md` |
| `weak-crypto` | `md5(password)`, a fixed IV, `Math.random()` for an identifier | `references/weak-crypto.md` |
| `permissive-access` | `ACL='public-read'`, mode `0o666`, CORS `*` | `references/permissive-access.md` |
| `debug-features` | a stack trace in a response, a debug route left on | `references/debug-features.md` |

Each family has `references/<id>.md` (**Report when** / **Skip when**, worked vulnerable and secure pairs) and `references/<id>.json`
(seed patterns). The corpus is what keeps false positives out: **read the `.md` of a family before sweeping or judging it** — if it
cannot be read, stop and say so, do not audit from memory.

## Method — four steps

**1. Recon (once).** Languages and frameworks; where configuration is read (`process.env`, `config.json` loaders, project-local wrappers
that can return a default — these are the fail-open ones); which files supply variables in production (deploy manifests); which paths
are NOT production (tests, fixtures, examples, docs, vendored code, `node_modules`). If the scope does not exist, stop: a missing path
is not "clean".

**2. Discover (per family).** Search only — do not judge. Run the seed patterns of the family's `.json` (POSIX ERE: `[[:space:]]`,
`[0-9]`; never `\s`, `\d`, `\b` — some `grep` builds match nothing with those, and a pattern that matches nothing looks exactly like a
clean result), then write patterns of your own for THIS stack (`process.env.X || 'valeur'`, `?? 'valeur'`, `|| {}` on a security
object, `${VAR:-default}` in shell, `ENV` in a Dockerfile). Count the files actually matched against: **0 files scanned means the
search failed, not that the repo is clean.** A family where you derived no pattern of your own is a coverage gap — say so.
- ⚠️ This repo is heavily commented: a variable name or a route path appears in the comment that explains its fix, right above the
  code. Strip comments before matching (`/\*[\s\S]*?\*/` blocks that START a line, then `^[ \t]*//` lines) or the sweep will report
  explanations as code (CLAUDE.md, « UN MOTIF DE BANC DOIT VISER DU CODE, JAMAIS UNE PHRASE »).
- Dedup on `family:file:line`. The same line flagged by two different families stays two candidates (`md5(k)` can be weak crypto AND
  not a permissive-access match).

**3. Verify (per candidate) — default answer: refuted.** Work through these in order and stop at the first that kills the candidate;
write down which step killed it:
1. **Is the file reachable in production?** Tests, fixtures, dead code, a dev-flag branch, a script never shipped → refuted.
2. **Is the insecure value the one that actually runs?** Two shapes:
   - *Configurable* (a lookup with a fallback): trace what happens when the configuration is absent. If anything stops the process (a
     lookup that throws, a startup validator) it is fail-secure → refuted. Booting and carrying on with the literal is fail-open.
   - *Unconditional* (the insecure value is written in the code): this step **cannot** refute it. About half of the findings are of
     this shape; "no configuration found" is not a reason to refute one.
3. **Is the value actually insecure?** The family's **Skip when** line is the rule; its SECURE section shows what a benign match
   looks like.
4. **Does it reach a security decision?** Trace to the sink and cite `file:line` — signing, encryption, authentication, authorisation,
   credential comparison, transport verification. A value read and never consulted at an enforcement point → refuted.
5. **Does deployment always supply the variable?** (configurable only; it never refutes, it moves severity)
   `always` → confirmed at lowered severity · `never` → the CRITICAL case · `sometimes` → full severity, name the manifests that leave it
   unset · `unknown` → treat as reachable and say which manifests could not be resolved (do not use it to mean "I skipped the step").
A trace you cannot complete is `refuted: true` with the reason `trace incomplete: <what blocked you>` — and that line goes in the
report, because an omitted candidate reads as "fine".

**4. Report.** Per confirmed finding: severity (CRITICAL → LOW, on evidence), `file:line` for every claim, the step-5 case, a
remediation that FAILS CLOSED (refuse to start, return the "cannot decide" answer, keep what the device knew — never "ignore and
continue"). Then **coverage**: files scanned per family, families whose sweep scanned nothing (not audited), families with no derived
pattern, candidates refuted with the step that killed them, candidates left unverified. `no candidates` is a real result but it is
"no pattern matched", **not proof of absence** — say that.

## When NOT to use it

- A fixed pattern with no reachability question: a linter or Semgrep fits better (`gardien` and `scripts/verif-secrets.sh` already
  cover committed secrets and known key shapes).
- Extensive secret detection in history: use a dedicated secret scanner, not this.
- A CODE-REVIEW of a diff: use `differential-review`.
