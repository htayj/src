---
name: task-graph-autoimprove-loop
description: Use when continuing an objective-test-driven task graph autoimprove loop across runs, or when an autoimprove iteration explicitly updates the read-only task graph extension workflow bridge; emphasizes linked evidence, Oracle recommendations, and preventing runaway loops.
---

# Task graph autoimprove loop continuation

Use this skill when the user says to continue, keep iterating, autoimprove again, carry queued successor work, use a future loop queue, or preserve future root work after a previous `autoimprove` task graph run. Also use it for explicit autoimprove work on the task graph extension workflow bridge; do not load it for generic extension or docs tasks.

## Choose the right mode

- **Continuation requests:** if the user is asking for the next linked iteration or queued successor, follow the continuation procedure below and use `task_graph_continue_autoimprove`.
- **Bridge docs/review/update inside an existing run:** do **not** create a successor, call `task_graph_continue_autoimprove`, drain queues, or mutate `rootWorkQueue`. Skip the continuation procedure and use only the read-only extension workflow bridge guidance below, recording evidence with `task_graph_update`.
- **Generic extension/docs tasks outside an autoimprove iteration:** this skill should not be loaded; use the relevant implementation, documentation, or Pi skill-authoring guidance instead.

## Continuation procedure

Use only for explicit continuation/next-iteration requests.

1. Identify the previous autoimprove run id. Prefer a terminal `succeeded` run.
2. Read safe summary artifacts from the previous run: final report, objective evidence, validation logs, code review, and child run ids. Do not paste secrets, raw browser cookies, auth files, `.env` files, private keys, or full transcripts into prompts.
3. Preview continuation first:
   - call `task_graph_continue_autoimprove` with `dryRun: true`;
   - pass `previousRunId`, a concise `objective`, safe `evidencePaths`, and a bounded `maxContextBytes` when the user wants an ad-hoc next iteration;
   - when the user has multiple future requests, pass them as `futureWork` root-work seeds so they persist in `metadata.rootWorkQueue`;
   - if the next iteration should come from the queue, omit `objective` or pass `rootWorkSelection: { mode: "first-executable" }`; if an explicit objective is supplied and `rootWorkSelection` is omitted, queued work is carried forward but not consumed;
   - for legacy/pre-tool runs without `autoimproveLoop` metadata, pass `lineageAdoption: { rootRunId, previousRunIteration, loopId?, reason? }` so the successor iteration is audited instead of inferred from titles.
4. If the preview is correct and the worktree dirty state is intentional, create the successor with `dryRun: false`. Use `allowDirtyWorktree: true` only when preserving existing dirty files is part of the plan. If the previous run already has `nextRunId`, omit `forceNew` to reuse it; use `dryRun: true, forceNew: true` only to preview an intentional alternate successor, and create such a branch only with explicit approval.
5. Verify the created or updated run has:
   - `metadata.autoimproveLoop` with loop id, previous/root run ids, iteration, lineageSource, and any lineageWarnings when a successor was created;
   - `metadata.rootWorkQueue` when queued future/root work was supplied, with selected work recorded as parent `history: created`, successor `state: active`, and remaining items still `queued`;
   - a `continuation-context.md` artifact on created successors;
   - an `ORACLE_CONSULT` task on created successors;
   - commit/push disabled unless the user explicitly approves later.
6. Drive the new run normally with `task_graph_next`. Ask Oracle for next-step/improvement ideas before implementation and save the recommendation as a task artifact.
7. Keep each iteration bounded: choose one or two high-leverage changes, add deterministic validation, run live smoke when appropriate, and write a report.

## Extension workflow bridge guidance

Use this section only when the current autoimprove iteration explicitly concerns Pi extension workflows, `task_graph_extension_guide`, or read-only dynamic graph preview work.

- Bridge surfaces are read-only advisories: `task_graph_extension_guide`, the before-agent advisory, and generated task prompt hints. They may render deterministic guidance and sanitized active-run counts via `loadRunNoCreate`, but must not create/save runs, append events, execute extension tools, call `task_graph_continue_autoimprove`, drain or mutate `rootWorkQueue`, change scheduler semantics, or auto-continue runs.
- Supported workflow ids are `changed-files`, `notes`, `http-api`, `tmux-worker`, `image-ai`, and `comfyui-civitai`. Keep triggers conservative; `image-ai` and `comfyui-civitai` should require strong artifact/model terms rather than generic UI or visual wording.
- Dynamic preview work is advisory only: use `task_graph_dynamic_preview` for bounded, read-only seed normalization, explicit dependency/cycle checks, deterministic ready-batch previews, conservative write-lock serialization, and worktree eligibility annotations. It must not queue or persist tasks, mutate runs/rootWorkQueue/scheduler state, launch subagents, execute shell commands, create/delete worktrees, or infer dependencies from natural language.
- Pass only public non-secret seed fields to dynamic previews. Prompt-like/private/secret-shaped content must be stripped from Markdown/status/details; dependency and write-lock validation should use sanitized internals that are not display-capped but are still bounded by absolute caps, while public lists remain capped for display.
- Treat `task_graph_update` as canonical evidence: record changed files, validation summaries, decision artifacts, API status/schema checks, worker provenance/transcript paths, child run ids, generated media paths, workflow JSON/model provenance, dynamic preview outputs, and critique artifacts there.
- Keep prompt-like/private fields out of graph-visible output: no raw prompts, hidden instructions, secrets, cookies, tokens, credentials, or private notes in status, UI details, flowcharts, artifacts, or summaries.

## Guardrails

- `task_graph_continue_autoimprove` creates exactly one successor; it must not call itself, recursively drain `rootWorkQueue`, or start an infinite loop.
- Treat `lineageAdoption` as audited legacy adoption, not a general mutable override; set `overrideExistingMetadata: true` only when deliberately acknowledging conflicting existing metadata.
- Check status/widget/prompt/UI/flowchart output for lineage source, warning badges, and durable root-work queue counts. Queue entries are synthetic metadata, not scheduler tasks.
- Do not continue from a failed or incomplete previous run unless the user intentionally asks for recovery and you set the explicit option.
- Do not overwrite unrelated dirty files. Record dirty worktree state in the baseline/report.
- Non-`autoimprove-loop` root work (`task`, `custom-graph`, `research`, `deep-research`, `manual`) is carried and displayed but not executable in this slice; selecting it should leave it queued with a non-executable status.
- Do not commit or push without explicit approval.
