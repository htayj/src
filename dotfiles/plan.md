# Implementation Plan

## Goal
Add an OpenCode plugin hook that injects a safe synthetic nudge toward `/do` or `/pdo` for normal substantive implementation/planning prompts, using heuristics modeled on the Claude `UserPromptSubmit` hook.

## Tasks
1. **Create the OpenCode do/pdo nudge plugin**: Implement a new plugin with pure, exportable classification helpers and two hooks.
   - File: `config/.config/opencode/plugins/do-pdo-nudge.js`
   - Changes: Export helpers such as `classifyPrompt(prompt)`, `hasImplementationDetail(prompt)`, `buildNudge(route)`, and `appendNudgePart(input, output, route)`. Export a default async plugin function returning:
     - `command.execute.before`: mark the current `sessionID` so the immediately following command-expanded `chat.message` is skipped.
     - `chat.message`: inspect the non-synthetic text parts from `output.parts`, skip command-generated messages, classify the prompt, and append one synthetic text part when classification returns `/do` or `/pdo`.
   - Acceptance: The plugin never shells out, catches its own errors as no-ops, and appended parts include schema-safe fields: `id` starting with `prt`, `messageID`, `sessionID`, `type: "text"`, `synthetic: true`, `text`, and `metadata: { kind: "do_pdo_nudge", route }`.

2. **Mirror and adapt the Claude hook heuristics**: Port the Claude classifier behavior into the new plugin.
   - File: `config/.config/opencode/plugins/do-pdo-nudge.js`
   - Changes: Skip blank prompts, slash commands, `!` shell passthroughs, very short prompts, questions, steering/corrective/research openings, and prompts already explicitly invoking `/do` or `/pdo`. Require an action/planning verb. Route to `/do` when concrete implementation details are present: file extensions, source-tree paths, backtick code spans, CamelCase identifiers, snake_case identifiers, 3+ segment kebab-case identifiers, or line references. Otherwise route to `/pdo`. Include planning verbs such as `plan`/`draft` because the user requested implementation/planning prompts, but keep question/research skips first.
   - Acceptance: Exported helper tests classify representative prompts as expected: detailed implementation prompts -> `do`; feature-level/planning prompts -> `pdo`; questions, reviews, slash commands, corrections, and short acknowledgements -> `null`.

3. **Use OpenCode-specific nudge text**: Make the injected context refer to the local OpenCode `/do` and `/pdo` pipeline.
   - File: `config/.config/opencode/plugins/do-pdo-nudge.js`
   - Changes: For `/do`, mention concrete implementation detail and suggest routing through `/do` for plan -> implement -> compile/typecheck -> tests -> review -> lint with explicit commit/push gates. For `/pdo`, mention feature-level or under-specified work and suggest `/pdo` to draft a plan, resolve open decisions with the user, then hand off to `/do`. State that the agent may ignore the nudge for trivial edits, quick fixes, research, or explanation.
   - Acceptance: Nudge text does not claim automatic command rewriting, does not authorize commits/pushes, and does not mention Claude-only concepts like `TODO.org` mutation.

4. **Register the plugin in OpenCode config**: Add the plugin to the configured plugin list.
   - File: `config/.config/opencode/opencode.json`
   - Changes: Add `"/home/tay/.config/opencode/plugins/do-pdo-nudge.js"` to the existing `plugin` array after `tmux-session-restore.js`; preserve valid JSON and the existing plugin entry.
   - Acceptance: `jq . config/.config/opencode/opencode.json >/dev/null` succeeds and both plugin paths remain present.

5. **Run focused classifier/import validation**: Validate the plugin without needing a full OpenCode integration harness.
   - File: `config/.config/opencode/plugins/do-pdo-nudge.js`
   - Changes: No extra code beyond exported helpers from Task 1.
   - Acceptance: From `/home/tay/src/dotfiles`, run a Bun import/classifier smoke test similar to:
     - Import the plugin module and assert `default`, `classifyPrompt`, and `hasImplementationDetail` exist.
     - Assert examples: `"Fix `src/auth.ts` line 42 to handle null tokens" -> "do"`; `"Add a user profile settings page with save and cancel states" -> "pdo"`; `"Plan the checkout migration" -> "pdo"`; `"/do fix foo" -> null`; `"What files do we need to touch?" -> null`; `"review the diff for issues" -> null`; `"ok thanks" -> null`.
     - Instantiate `await default({})` and assert hooks `chat.message` and `command.execute.before` exist.

6. **Apply and smoke-test the dotfiles deployment**: Deploy the config package after implementation.
   - File: N/A
   - Changes: No source changes; apply GNU Stow for the `config` package.
   - Acceptance: Run `stow -n -v -d ~/src/dotfiles -t ~ config` first, then `stow -v -d ~/src/dotfiles -t ~ config` if the dry run is clean. Verify `~/.config/opencode/plugins/do-pdo-nudge.js` resolves to the repo-managed file and start a new OpenCode session so plugins reload.

7. **Manual OpenCode behavior check**: Confirm the hook nudges only appropriate prompts.
   - File: N/A
   - Changes: No source changes.
   - Acceptance: In a fresh OpenCode session, send a feature-level implementation prompt and verify the model is nudged toward `/pdo`; send a detailed file/identifier prompt and verify it is nudged toward `/do`; invoke `/do ...` or `/pdo ...` and verify no duplicate nudge is injected; send a question/review prompt and verify silence.

8. **Review and prepare for commit/push**: Follow dotfiles repository workflow after validation.
   - File: N/A
   - Changes: No source changes.
   - Acceptance: Review `git diff -- config/.config/opencode/opencode.json config/.config/opencode/plugins/do-pdo-nudge.js`; commit and push only if explicitly approved for the implementation run.

## Files to Modify
- `config/.config/opencode/opencode.json` - register the new OpenCode plugin path in the `plugin` array.

## New Files
- `config/.config/opencode/plugins/do-pdo-nudge.js` - OpenCode plugin implementing prompt classification and synthetic `/do`/`/pdo` nudge injection.

## Dependencies
- Task 2 depends on Task 1's helper structure.
- Task 3 depends on Task 2's `do`/`pdo` route result.
- Task 4 depends on Task 1 creating the plugin file.
- Task 5 depends on Tasks 1-3.
- Tasks 6-7 depend on Tasks 4-5 passing.
- Task 8 depends on all implementation and validation tasks.

## Risks
- OpenCode has no direct Claude-style `UserPromptSubmit` hook; this plan uses `chat.message` and synthetic text parts, which is the closest current hook surface. This nudges the model but does not rewrite the user prompt into a slash command.
- Command invocations expand into normal chat messages; the `command.execute.before` skip marker is needed to avoid nudging `/do` and `/pdo` themselves. Verify this carefully because hook ordering changes could cause duplicate nudges.
- Heuristics can false-positive or false-negative. Adding `plan`/`draft` supports planning prompts but may over-nudge some discussion-style messages; the question/research/short-message skips mitigate this.
- Appended synthetic parts must satisfy OpenCode's part schema. Missing `messageID`, `sessionID`, or an `id` beginning with `prt` can make prompts fail validation.
- Plugin hook exceptions can interrupt normal prompting because OpenCode trigger execution is sequential; wrap classification/injection in internal try/catch and fail closed.
- The config uses explicit deployed absolute plugin paths, matching the existing `tmux-session-restore.js` entry. If future OpenCode auto-discovery under global config is preferred, that is a separate convention decision.
- Full integration testing is mostly manual; focused validation can cover import and classifier behavior, but not model obedience to the nudge.
