---
name: karpathy-guidelines
description: "Behavioral guidelines to reduce common LLM coding mistakes. Use when writing, reviewing, or refactoring code to avoid overcomplication, make surgical changes, surface assumptions, and define verifiable success criteria. FR : écrire, relire ou réorganiser du code — faire simple, ne toucher que le nécessaire, dire ses hypothèses, prouver par un banc."
license: MIT
---

> **Adaptation TeamOP** — ce bloc passe avant le texte d'origine, qui suit tel quel.
>
> - Copié de Karpathy skills (`github.com/multica-ai/andrej-karpathy-skills`, auparavant `forrestchang/…`, commit `2c60614` du 20 avril 2026), licence MIT déclarée par le dépôt : voir `LICENSE` à côté. Choix de Justin du 24 octobre 2026, après lecture du « guide des 4 plugins » : celui-ci seulement (Superpowers, i-have-adhd et Claude Octopus ne sont PAS installés).
> - **CLAUDE.md passe avant ce texte.** Ses quatre règles disent ce que le dépôt dit déjà, en plus court ; elles ne lèvent aucun de ses interdits.
> - Règle 2 (« pas de gestion d'erreur pour un cas impossible ») : ici, un refus du serveur, une panne réseau, un registre illisible, un `fetch` qui ne jette pas sur un 4xx ne sont **jamais** impossibles. Le dépôt exige trois états (« une liste, une liste vide, `null` on n'a pas pu savoir ») et un écran qui DIT le refus — c'est ce qui a coûté le plus cher (`_mailboxes`, le jeton refusé d'ELAN).
> - Règle 3 (« ne touche que ce qu'il faut ») : c'est aussi la règle de publication — un correctif qui casse chez un client se limite au défaut, rien ne voyage avec lui ; et tout le développement d'OP GESTION se fait sur la bêta.
> - Règle 4 (« un test qui reproduit, puis le faire passer ») : ici, **un banc qui passe ne prouve rien tant qu'on ne l'a pas vu ÉCHOUER** — on remet le défaut (mutation) et on regarde le banc tomber, après avoir commité le correctif ; et ce qui s'affiche se MESURE au navigateur, sur la bêta.
> - Règle 1 (« si tu n'es pas sûr, demande ») : une question à la fois à Justin, en français, et seulement sur ce qui est à lui de trancher ; ce qui se vérifie dans le code se vérifie, ça ne se demande pas.

# Karpathy Guidelines

Behavioral guidelines to reduce common LLM coding mistakes, derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
