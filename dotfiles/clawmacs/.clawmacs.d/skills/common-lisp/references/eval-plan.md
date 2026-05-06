# Common Lisp Cookbook Skill Mini A/B Eval Plan

Capability delta under test:

> After applying this skill, the Clawmacs agent should more reliably solve practical Common Lisp tasks by routing through the full mirrored Common Lisp Cookbook corpus and its attached examples, instead of giving generic Lisp advice divorced from the cookbook.

## Baseline vs treatment

- **Baseline:** no Common Lisp cookbook skill, or only generic Common Lisp guidance
- **Treatment:** current cookbook-grounded Common Lisp skill with full corpus routing, example routing, caveat handling, and practical recipe adaptation

## Representative prompts

1. How do I trim, compare, and parse strings in Common Lisp?
2. Which cookbook chapter should I read for hash tables and what examples does it cover?
3. How should I explain `loop` to somebody practically rather than abstractly?
4. I need to read a file line by line and then process the data.
5. Where does the cookbook cover macros and backquote, and what does it emphasize?
6. I want a practical intro to CLOS with classes, methods, and method combination.
7. Does the cookbook cover sockets, FFI, and threads, and how portable is that guidance?
8. Which attached example files matter for the Emacs IDE chapter?
9. What does the cookbook say about testing?
10. What all does the cookbook contain, including historical/tooling chapters?

## Scoring rubric

Score each prompt 0–2 on each dimension.

### 1. Build/practical orientation
- 0: abstract Lisp discourse only
- 1: partly actionable
- 2: clearly oriented toward practical Common Lisp work

### 2. Cookbook specificity
- 0: generic Common Lisp advice only
- 1: vague cookbook mention
- 2: names the right cookbook chapter(s) and relevant section focus

### 3. Full-corpus coverage
- 0: collapses the cookbook to a few favorite chapters
- 1: partial wider coverage
- 2: can range across the whole mirrored cookbook corpus

### 4. Example-file routing
- 0: ignores attached example files entirely
- 1: vague mention of examples only
- 2: correctly routes among CLOS files, `.emacs`, `s1`–`s24`, and inline-only chapters

### 5. Caveat discipline
- 0: flattens historical/implementation-specific advice into false universality
- 1: partial caveat handling
- 2: clearly labels historical, implementation-specific, or thin-coverage areas

### 6. Output usefulness
- 0: no clear next step or recipe
- 1: partly useful
- 2: gives a practical recipe, example path, or implementable direction

Maximum score per prompt: 12

## Keep/discard criterion

Keep the skill only if it improves average score on:
- practical orientation
- cookbook specificity
- full-corpus coverage
- example-file routing
- caveat discipline
- output usefulness
