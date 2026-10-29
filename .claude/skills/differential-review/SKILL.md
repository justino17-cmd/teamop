---
name: differential-review
description: "Performs security-focused differential review of code changes. Adapts analysis depth to codebase size, uses git blame for context, calculates blast radius by counting callers, checks test coverage of modified code, and generates a markdown report. Use when reviewing a PR, commit, or diff for security vulnerabilities, checking whether a change re-introduces a previously fixed bug, asking what else a change could break, or finding which modified code has no test covering it."
allowed-tools: Read Write Grep Glob Bash
---

> **Adaptation TeamOP** — ce bloc passe avant le texte d'origine (en anglais), qui suit tel quel.
>
> - Copié de `trailofbits/skills`, plugin `differential-review` 1.1.4 (commit `2be6433`, 28 octobre 2026), licence **CC-BY-SA-4.0** :
>   voir `LICENSE-trailofbits` et `PROVENANCE-trailofbits.md`. Mention d'origine : « Made by Trail of Bits » ; ce bloc et tout ce que
>   TeamOP y ajoute sont donc sous la MÊME licence (CC-BY-SA-4.0). Retirés à la copie : la commande `/diff-review`, le logo, le
>   `openai.yaml`, le README du plugin.
> - **Ce que c'est ici** : une méthode de revue d'un DIFF avant qu'il parte sur `main` (surtout `server/`, qu'un push sur `main`
>   DÉPLOIE). Elle complète `gardien` (relit `server/` en entier) et `relecteur` (relit le diff selon les critères du dépôt) : lui
>   apporte la question qu'ils ne posent pas systématiquement — **« ce code retiré était-il là pour une raison ? »** (`git blame` /
>   `git log -S` sur toute garde supprimée), et **« qui d'autre appelle ceci ? »** (rayon d'impact chiffré).
> - **Taille** : `server/index.js` (≈ 7 500 lignes, ~80 routes exposées sur Internet) et `app.html` (≈ 3,5 Mo) sont des fichiers
>   « LARGE » : stratégie SURGICAL, chemins critiques seulement — authentification, preuve de clé d'équipe (`cleEquipeExige`), argent
>   (Stripe, `espacePaye`, codes promo), sauvegarde, jetons Firebase.
> - **Le rapport ne s'écrit PAS dans le dépôt.** Le skill dit « toujours écrire `DIFFERENTIAL_REVIEW_REPORT.md` » : ici dans le
>   dossier de travail temporaire de la session, jamais dans l'arbre git (un rapport peut citer un chemin, une route, un jeton
>   d'exemple). Aucun nom, adresse ni donnée de client réel dans un rapport (règle de CLAUDE.md sur les journaux).
> - **Compter les appelants par le CODE, pas par les phrases** : ce dépôt est très commenté, un nom de fonction apparaît presque
>   toujours dans le commentaire qui explique le correctif. Retirer les commentaires avant de compter
>   (`SRC.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/^[ \t]*\/\/.*$/gm,' ')`) — sinon le « rayon d'impact » compte des appelants qui n'existent pas.
>   Dans `app.html`, ne retirer que les blocs qui COMMENCENT une ligne (voir « UN MOTIF DE BANC DOIT VISER DU CODE » dans CLAUDE.md).
> - **Couverture de tests** (phase 2) : les 200+ suites de `tests/` extraient les fonctions RÉELLES d'`app.html` ; chercher quelle
>   suite exécute la fonction modifiée, et rappeler la règle du dépôt : un banc qui passe ne prouve rien tant qu'on ne l'a pas vu
>   ÉCHOUER (mutation après `git commit`, jamais avant).
> - **Agent `adversarial-modeler`** : NON enregistré comme agent ici (il alourdirait les descriptions chargées à chaque session, et
>   n'a pas de ligne `model:`). Son texte est dans `adversarial-modeler.md` : le lire et jouer la phase 5 soi-même, ou la confier à
>   `gardien` (Sonnet, effort haut) en lui passant ce fichier. **Tout agent lancé pour ce travail tourne en Sonnet.**
> - **Ne pas citer** les skills `audit-context-building` et `issue-writer` (« Integration ») : ils ne sont pas installés ici.
> - Ce qui vaut toujours : « Concrete impact only » — aucun constat sans scénario d'attaque précis, ligne et commit. Une revue
>   qui ne trouve rien le dit avec sa couverture (« j'ai lu X, pas Y »), elle ne dit pas « sûr ».

# Differential Security Review

Security-focused code review for PRs, commits, and diffs.

## Core Principles

1. **Risk-First**: Focus on auth, crypto, value transfer, external calls
2. **Evidence-Based**: Every finding backed by git history, line numbers, attack scenarios
3. **Adaptive**: Scale to codebase size (SMALL/MEDIUM/LARGE)
4. **Honest**: Explicitly state coverage limits and confidence level
5. **Output-Driven**: Always generate comprehensive markdown report file

---

## Rationalizations (Do Not Skip)

| Rationalization | Why It's Wrong | Required Action |
|-----------------|----------------|-----------------|
| "Small PR, quick review" | Heartbleed was 2 lines | Classify by RISK, not size |
| "I know this codebase" | Familiarity breeds blind spots | Build explicit baseline context |
| "Git history takes too long" | History reveals regressions | Never skip Phase 1 |
| "Blast radius is obvious" | You'll miss transitive callers | Calculate quantitatively |
| "No tests = not my problem" | Missing tests = elevated risk rating | Flag in report, elevate severity |
| "Just a refactor, no security impact" | Refactors break invariants | Analyze as HIGH until proven LOW |
| "I'll explain verbally" | No artifact = findings lost | Always write report |

---

## Quick Reference

### Codebase Size Strategy

| Codebase Size | Strategy | Approach |
|---------------|----------|----------|
| SMALL (<20 files) | DEEP | Read all deps, full git blame |
| MEDIUM (20-200) | FOCUSED | 1-hop deps, priority files |
| LARGE (200+) | SURGICAL | Critical paths only |

### Risk Level Triggers

| Risk Level | Triggers |
|------------|----------|
| HIGH | Auth, crypto, external calls, value transfer, validation removal |
| MEDIUM | Business logic, state changes, new public APIs |
| LOW | Comments, tests, UI, logging |

---

## Workflow Overview

```
Pre-Analysis → Phase 0: Triage → Phase 1: Code Analysis → Phase 2: Test Coverage
    ↓              ↓                    ↓                        ↓
Phase 3: Blast Radius → Phase 4: Deep Context → Phase 5: Adversarial → Phase 6: Report
```

---

## Decision Tree

**Starting a review?**

```
├─ Need detailed phase-by-phase methodology?
│  └─ Read: methodology.md
│     (Pre-Analysis + Phases 0-4: triage, code analysis, test coverage, blast radius)
│
├─ Analyzing HIGH RISK change?
│  ├─ Read: adversarial.md
│  │  (Phase 5: Attacker modeling, exploit scenarios, exploitability rating)
│  └─ Or delegate to: differential-review:adversarial-modeler agent
│     (Autonomous attacker modeling with concrete exploit scenarios)
│
├─ Writing the final report?
│  └─ Read: reporting.md
│     (Phase 6: Report structure, templates, formatting guidelines)
│
├─ Looking for specific vulnerability patterns?
│  └─ Read: patterns.md
│     (Regressions, reentrancy, access control, overflow, etc.)
│
└─ Quick triage only?
   └─ Use Quick Reference above, skip detailed docs
```

---

## Agents

**`differential-review:adversarial-modeler`** — Models attacker perspectives and
builds exploit scenarios for HIGH RISK code changes. Follows the 5-step
adversarial methodology (attacker model, attack vectors, exploitability rating,
exploit scenario, baseline cross-reference) and produces structured vulnerability
reports. Delegate to this agent when Phase 5 analysis is needed on high-risk
changes, passing that full namespaced name as `subagent_type` — a bare
`adversarial-modeler` is unregistered and the dispatch fails at runtime.

---

## Quality Checklist

Before delivering:

- [ ] All changed files analyzed
- [ ] Git blame on removed security code
- [ ] Blast radius calculated for HIGH risk
- [ ] Attack scenarios are concrete (not generic)
- [ ] Findings reference specific line numbers + commits
- [ ] Report file generated
- [ ] User notified with summary

---

## Integration

**audit-context-building skill:**
- Pre-Analysis: Build baseline context
- Phase 4: Deep context on HIGH RISK changes

**issue-writer skill:**
- Transform findings into formal audit reports
- Command: `issue-writer --input DIFFERENTIAL_REVIEW_REPORT.md --format audit-report`

---

## Example Usage

### Quick Triage (Small PR)
```
Input: 5 file PR, 2 HIGH RISK files
Strategy: Use Quick Reference
1. Classify risk level per file (2 HIGH, 3 LOW)
2. Focus on 2 HIGH files only
3. Git blame removed code
4. Generate minimal report
Time: ~30 minutes
```

### Standard Review (Medium Codebase)
```
Input: 80 files, 12 HIGH RISK changes
Strategy: FOCUSED (see methodology.md)
1. Full workflow on HIGH RISK files
2. Surface scan on MEDIUM
3. Skip LOW risk files
4. Complete report with all sections
Time: ~3-4 hours
```

### Deep Audit (Large, Critical Change)
```
Input: 450 files, auth system rewrite
Strategy: SURGICAL + audit-context-building
1. Baseline context with audit-context-building
2. Deep analysis on auth changes only
3. Blast radius analysis
4. Adversarial modeling
5. Comprehensive report
Time: ~6-8 hours
```

---

## When NOT to Use This Skill

- **Greenfield code** (no baseline to compare)
- **Documentation-only changes** (no security impact)
- **Formatting/linting** (cosmetic changes)
- **User explicitly requests quick summary only** (they accept risk)

For these cases, use standard code review instead.

---

## Red Flags (Stop and Investigate)

**Immediate escalation triggers:**
- Removed code from "security", "CVE", or "fix" commits
- Access control modifiers removed (onlyOwner, internal → external)
- Validation removed without replacement
- External calls added without checks
- High blast radius (50+ callers) + HIGH risk change

These patterns require adversarial analysis even in quick triage.

---

## Tips for Best Results

**Do:**
- Start with git blame for removed code
- Calculate blast radius early to prioritize
- Generate concrete attack scenarios
- Reference specific line numbers and commits
- Be honest about coverage limitations
- Always generate the output file

**Don't:**
- Skip git history analysis
- Make generic findings without evidence
- Claim full analysis when time-limited
- Forget to check test coverage
- Miss high blast radius changes
- Output report only to chat (file required)

---

## Supporting Documentation

- **[methodology.md](methodology.md)** - Detailed phase-by-phase workflow (Phases 0-4)
- **[adversarial.md](adversarial.md)** - Attacker modeling and exploit scenarios (Phase 5)
- **[reporting.md](reporting.md)** - Report structure and formatting (Phase 6)
- **[patterns.md](patterns.md)** - Common vulnerability patterns reference

---

**For first-time users:** Start with [methodology.md](methodology.md) to understand the complete workflow.

**For experienced users:** Use this page's Quick Reference and Decision Tree to navigate directly to needed content.
