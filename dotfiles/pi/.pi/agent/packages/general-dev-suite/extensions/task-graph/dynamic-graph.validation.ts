import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_LIST_ITEMS, normalizeDynamicTaskPublicText, previewDynamicTaskGraph, type DynamicTaskGraphPreviewResult, type DynamicTaskGraphSeed } from "./dynamic-graph";
import taskGraphExtension from "./index";
import { REDACTED_SECRETISH_EVIDENCE_PATH } from "./root-work-lineage";
import { taskGraphRoot } from "./store";

const displayCap = 12;
const fillerKeys = Array.from({ length: displayCap }, (_, index) => `dep-${String(index + 1).padStart(2, "0")}`);

function nodeBatchIndex(result: DynamicTaskGraphPreviewResult, stableKey: string) {
  const batchIndex = result.batches.findIndex((batch) => batch.nodeStableKeys.includes(stableKey));
  assert.notEqual(batchIndex, -1, `${stableKey} should appear in a ready batch`);
  return batchIndex;
}

function assertDifferentBatches(result: DynamicTaskGraphPreviewResult, left: string, right: string, message: string) {
  assert.notEqual(nodeBatchIndex(result, left), nodeBatchIndex(result, right), message);
}

function assertValid(result: DynamicTaskGraphPreviewResult, message: string) {
  assert.equal(result.valid, true, `${message}: ${JSON.stringify(result.errors)}`);
}

const disjointDeclaredWrites = previewDynamicTaskGraph(
  [
    { key: "alpha", expectedWritePaths: ["src/alpha.ts"] },
    { key: "beta", expectedWritePaths: ["src/beta.ts"] },
  ],
  { maxParallel: 2 },
);
assertValid(disjointDeclaredWrites, "disjoint declared writes remain valid");
assert.deepEqual(disjointDeclaredWrites.batches[0]?.nodeStableKeys, ["alpha", "beta"], "disjoint declared writes can share the first batch");
for (const stableKey of ["alpha", "beta"]) {
  const worktreeEligibility = disjointDeclaredWrites.nodes.find((node) => node.stableKey === stableKey)?.worktreeEligibility;
  assert.equal(worktreeEligibility?.eligible, true, `${stableKey} declared writes should be worktree-eligible`);
  assert.equal(worktreeEligibility?.code, "declared_writes", `${stableKey} declared writes should report declared_writes eligibility code`);
}

const unknownWrites = previewDynamicTaskGraph([{ key: "alpha" }, { key: "beta" }], { maxParallel: 2 });
assertValid(unknownWrites, "unknown write scopes remain valid but conservative");
for (const stableKey of ["alpha", "beta"]) {
  const worktreeEligibility = unknownWrites.nodes.find((node) => node.stableKey === stableKey)?.worktreeEligibility;
  assert.equal(worktreeEligibility?.eligible, false, `${stableKey} unknown writes should not be worktree-eligible`);
  assert.equal(worktreeEligibility?.code, "unknown_writes", `${stableKey} unknown writes should report unknown_writes eligibility code`);
}
assert.deepEqual(unknownWrites.batches[0]?.nodeStableKeys, ["alpha"], "unknown writes should serialize first batch conservatively");
assert.equal(unknownWrites.batches[0]?.held[0]?.reason, "unknown_writes_conflict", "unknown write scopes should record held reason");
assertDifferentBatches(unknownWrites, "alpha", "beta", "unknown writes should not run in the same batch");

const dependencyUnknownPastDisplayCap = previewDynamicTaskGraph([
  ...fillerKeys.map((key) => ({ key } satisfies DynamicTaskGraphSeed)),
  { key: "subject", dependsOn: [...fillerKeys, "missing-task"] },
]);
assert.equal(dependencyUnknownPastDisplayCap.valid, false, "unknown 13th dependency should invalidate preview");
assert(
  dependencyUnknownPastDisplayCap.errors.some((error) => error.code === "unknown_dependency" && error.stableKey === "subject" && error.dependencyReference === "missing-task"),
  `unknown 13th dependency should be reported: ${JSON.stringify(dependencyUnknownPastDisplayCap.errors)}`,
);
assert(!dependencyUnknownPastDisplayCap.nodes.find((node) => node.stableKey === "subject")?.dependsOn.includes("missing-task"), "public dependsOn list remains display-capped");

const dependencyCyclePastDisplayCap = previewDynamicTaskGraph([
  ...fillerKeys.map((key) => ({ key } satisfies DynamicTaskGraphSeed)),
  { key: "alpha", dependsOn: [...fillerKeys, "beta"] },
  { key: "beta", dependsOn: ["alpha"] },
]);
assert.equal(dependencyCyclePastDisplayCap.valid, false, "cycle only visible after the display cap should invalidate preview");
assert(
  dependencyCyclePastDisplayCap.errors.some((error) => error.code === "dependency_cycle" && error.cycle?.includes("alpha") && error.cycle.includes("beta")),
  `cycle past display cap should be reported with evidence: ${JSON.stringify(dependencyCyclePastDisplayCap.errors)}`,
);
assert(!dependencyCyclePastDisplayCap.nodes.find((node) => node.stableKey === "alpha")?.dependsOn.includes("beta"), "public cycle dependency remains display-capped");

const dependencySchedulingPastDisplayCap = previewDynamicTaskGraph(
  [
    ...fillerKeys.map((key) => ({ key, expectedWritePaths: [`${key}.ts`] } satisfies DynamicTaskGraphSeed)),
    { key: "late-setup", expectedWritePaths: ["late/setup.ts"] },
    { key: "late-prereq", dependsOn: ["late-setup"], expectedWritePaths: ["late/prereq.ts"] },
    { key: "subject", dependsOn: [...fillerKeys, "late-prereq"], expectedWritePaths: ["subject.ts"] },
  ],
  { maxParallel: 16 },
);
assertValid(dependencySchedulingPastDisplayCap, "known 13th dependency should remain schedulable");
assert(
  nodeBatchIndex(dependencySchedulingPastDisplayCap, "late-prereq") < nodeBatchIndex(dependencySchedulingPastDisplayCap, "subject"),
  `known 13th dependency should delay subject until prerequisite completes: ${JSON.stringify(dependencySchedulingPastDisplayCap.batches)}`,
);
assert(!dependencySchedulingPastDisplayCap.nodes.find((node) => node.stableKey === "subject")?.dependsOn.includes("late-prereq"), "public known 13th dependency remains display-capped");

const ambiguousDependencyAlias = previewDynamicTaskGraph([
  { title: "Alpha" },
  { key: "Alpha" },
  { key: "dependent", dependsOn: ["Alpha"] },
]);
assert.equal(ambiguousDependencyAlias.valid, false, "ambiguous title/stable-key and explicit source-key alias should invalidate preview");
assert(
  ambiguousDependencyAlias.errors.some((error) => error.code === "ambiguous_dependency" && error.stableKey === "dependent" && error.dependencyReference === "alpha"),
  `ambiguous dependency alias should be reported: ${JSON.stringify(ambiguousDependencyAlias.errors)}`,
);
assert.deepEqual(ambiguousDependencyAlias.batches, [], "ambiguous dependency aliases should suppress schedule preview batches");

const writeConflictPastDisplayCap = previewDynamicTaskGraph(
  [
    { key: "left", expectedWritePaths: [...fillerKeys.map((key) => `left/${key}.ts`), "shared/file.ts"] },
    { key: "right", expectedWritePaths: ["shared/file.ts"] },
  ],
  { maxParallel: 2 },
);
assertValid(writeConflictPastDisplayCap, "write conflict past display cap remains a valid serializable preview");
assert(!writeConflictPastDisplayCap.nodes.find((node) => node.stableKey === "left")?.expectedWritePaths.includes("shared/file.ts"), "public expectedWritePaths list remains display-capped");
assertDifferentBatches(writeConflictPastDisplayCap, "left", "right", "13th expectedWritePaths conflict should serialize batches");
assert(
  writeConflictPastDisplayCap.batches.some((batch) => batch.held.some((held) => held.stableKey === "right" && held.reason === "write_conflict" && held.conflictWith === "left")),
  `13th write conflict should record held evidence: ${JSON.stringify(writeConflictPastDisplayCap.batches)}`,
);

const absoluteCapWritePaths = [
  "public/visible.ts",
  ...Array.from({ length: ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_LIST_ITEMS - 2 }, (_, index) => `internal/filler-${String(index + 1).padStart(2, "0")}.ts`),
  "shared/internal-conflict.ts",
  "ignored/over-absolute-cap.ts",
];
const oversizedWriteConflict = previewDynamicTaskGraph(
  [
    { key: "oversized-left", expectedWritePaths: absoluteCapWritePaths },
    { key: "oversized-right", expectedWritePaths: ["shared/internal-conflict.ts"] },
  ],
  { maxParallel: 2, maxListItems: 1 },
);
assertValid(oversizedWriteConflict, "oversized write paths should remain valid with capped public lists");
const oversizedLeft = oversizedWriteConflict.nodes.find((node) => node.stableKey === "oversized-left");
assert.equal(oversizedLeft?.expectedWritePaths.length, 1, "public expectedWritePaths should honor maxListItems=1");
assert.equal(oversizedLeft?.worktreeEligibility.normalizedWriteLocks.length, 1, "public normalizedWriteLocks should honor maxListItems=1");
assertDifferentBatches(oversizedWriteConflict, "oversized-left", "oversized-right", "internal write lock within the absolute cap should still serialize batches");
assert(
  oversizedWriteConflict.warnings.some((warning) => warning.code === "list_items_capped" && warning.stableKey === "oversized-left" && warning.field === "expectedWritePaths"),
  `oversized expectedWritePaths should emit a cap warning: ${JSON.stringify(oversizedWriteConflict.warnings)}`,
);
for (const batch of oversizedWriteConflict.batches) {
  for (const held of batch.held) {
    assert((held.conflictingWriteLocks?.length ?? 0) <= 1, `conflicting write-lock evidence should honor maxListItems=1: ${JSON.stringify(held)}`);
  }
}

const zeroDisplayWriteConflict = previewDynamicTaskGraph(
  [
    { key: "zero-left", expectedWritePaths: ["zero/shared.ts"] },
    { key: "zero-right", expectedWritePaths: ["zero/shared.ts"] },
  ],
  { maxParallel: 2, maxListItems: 0 },
);
assertValid(zeroDisplayWriteConflict, "zero display cap should not invalidate write conflict previews");
assert.equal(zeroDisplayWriteConflict.nodes.find((node) => node.stableKey === "zero-left")?.worktreeEligibility.normalizedWriteLocks.length, 0, "public normalizedWriteLocks should honor maxListItems=0");
assertDifferentBatches(zeroDisplayWriteConflict, "zero-left", "zero-right", "write conflicts should still be detected when evidence display cap is zero");
assert(
  zeroDisplayWriteConflict.batches.some((batch) => batch.held.some((held) => held.stableKey === "zero-right" && held.reason === "write_conflict" && held.conflictingWriteLocks?.length === 0)),
  `zero display cap should retain conflict reason while hiding evidence: ${JSON.stringify(zeroDisplayWriteConflict.batches)}`,
);

const oversizedListValues = Array.from({ length: ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_LIST_ITEMS + 1 }, (_, index) => `oversized-item-${String(index + 1).padStart(2, "0")}`);
const oversizedListWarnings = previewDynamicTaskGraph([
  {
    key: "oversized-lists",
    dependsOn: oversizedListValues,
    blockedBy: oversizedListValues,
    writeScope: oversizedListValues.map((value) => `scope/${value}`),
    expectedWritePaths: oversizedListValues.map((value) => `paths/${value}.ts`),
    acceptanceCriteria: oversizedListValues,
    suggestedChecks: oversizedListValues,
  },
]);
for (const field of ["dependsOn", "blockedBy", "writeScope", "expectedWritePaths", "acceptanceCriteria", "suggestedChecks"] as const) {
  assert(
    oversizedListWarnings.warnings.some((warning) => warning.code === "list_items_capped" && warning.stableKey === "oversized-lists" && warning.field === field),
    `oversized ${field} should emit a list cap warning: ${JSON.stringify(oversizedListWarnings.warnings)}`,
  );
}

const dotDotConflict = previewDynamicTaskGraph(
  [
    { key: "left", expectedWritePaths: ["src/../shared/file.ts"] },
    { key: "right", expectedWritePaths: ["shared/file.ts"] },
  ],
  { maxParallel: 2 },
);
assertValid(dotDotConflict, "dot-dot path conflict remains a valid serializable preview");
assert(dotDotConflict.nodes.find((node) => node.stableKey === "left")?.worktreeEligibility.normalizedWriteLocks.includes("shared/file.ts"), "dot-dot write lock should normalize to shared/file.ts");
assertDifferentBatches(dotDotConflict, "left", "right", "dot-dot equivalent paths should conflict");

const globConflicts = previewDynamicTaskGraph(
  [
    { key: "src-glob", expectedWritePaths: ["src/**"] },
    { key: "src-file", expectedWritePaths: ["src/file.ts"] },
    { key: "asd-glob", expectedWritePaths: ["*.asd"] },
    { key: "asd-file", expectedWritePaths: ["package.asd"] },
    { key: "lisp-glob", expectedWritePaths: ["**/*.lisp"] },
    { key: "lisp-file", expectedWritePaths: ["src/main.lisp"] },
    { key: "brace-glob", expectedWritePaths: ["src/*.{ts,tsx}"] },
    { key: "brace-file", expectedWritePaths: ["src/a.ts"] },
    { key: "class-glob", expectedWritePaths: ["src/[ab].ts"] },
    { key: "class-file", expectedWritePaths: ["src/b.ts"] },
  ],
  { maxParallel: 10 },
);
assertValid(globConflicts, "glob write-lock conflicts remain a valid serializable preview");
assertDifferentBatches(globConflicts, "src-glob", "src-file", "src/** should conflict with src/file.ts");
assertDifferentBatches(globConflicts, "asd-glob", "asd-file", "*.asd should conflict with package.asd");
assertDifferentBatches(globConflicts, "lisp-glob", "lisp-file", "**/*.lisp should conflict with src/main.lisp");
assertDifferentBatches(globConflicts, "brace-glob", "brace-file", "brace glob should conservatively conflict with src/a.ts");
assertDifferentBatches(globConflicts, "class-glob", "class-file", "class glob should conservatively conflict with src/b.ts");
assert(
  globConflicts.batches.some((batch) => batch.held.some((held) => held.reason === "write_conflict" && held.conflictingWriteLocks?.some((lock) => lock.includes("src/**")))),
  `glob conflict should record held evidence: ${JSON.stringify(globConflicts.batches)}`,
);

const smallTextWriteLocks = previewDynamicTaskGraph(
  [
    { key: "asd-glob-small", expectedWritePaths: ["*.asd"] },
    { key: "asd-file-small", expectedWritePaths: ["package.asd"] },
  ],
  { maxParallel: 2, maxTextLength: 3 },
);
assertValid(smallTextWriteLocks, "small maxTextLength should not invalidate preview");
assert.equal(smallTextWriteLocks.nodes.find((node) => node.stableKey === "asd-glob-small")?.expectedWritePaths[0], "*.…", "public write path should still honor maxTextLength");
assert(smallTextWriteLocks.nodes.find((node) => node.stableKey === "asd-glob-small")?.worktreeEligibility.normalizedWriteLocks.includes("*.asd"), "internal write lock should use untruncated sanitized path");
assertDifferentBatches(smallTextWriteLocks, "asd-glob-small", "asd-file-small", "small maxTextLength should not bypass write-lock conflicts");

const dynamicSecretExpectedPath = [".orchestration", "dynamic-preview", "api_" + "key-expected-write.md"].join("/");
const dynamicSecretDeclaredPath = [".orchestration", "dynamic-preview", "private" + "KeyDeclaredWrite.md"].join("/");
const dynamicSessionDeclaredPath = ["/home", "fixture", ".pi", "agent", "sessions", "dynamic-preview", "artifact.md"].join("/");
const dynamicPublicReconciliationPath = [".orchestration", "iteration-13-flowchart-terminal-reconciliation", "terminal-reconciliation-report.md"].join("/");
const secretWritePathPreview = previewDynamicTaskGraph(
  [
    { key: "secret-lock-left", writeScope: [dynamicSecretDeclaredPath], expectedWritePaths: [dynamicSecretExpectedPath, dynamicPublicReconciliationPath] },
    { key: "secret-lock-right", writeScope: [dynamicSecretDeclaredPath, dynamicSessionDeclaredPath], expectedWritePaths: [dynamicSecretExpectedPath] },
  ],
  { maxParallel: 2 },
);
assertValid(secretWritePathPreview, "secret-shaped write path preview remains valid");
assertDifferentBatches(secretWritePathPreview, "secret-lock-left", "secret-lock-right", "secret-shaped internal write-lock conflicts still serialize batches");
const secretWritePathPreviewJson = JSON.stringify(secretWritePathPreview);
const secretWritePathLeakPattern = /api[_\s-]*key|private[_\s-]*key|\/home\/fixture|\/sessions\//i;
assert(!secretWritePathLeakPattern.test(secretWritePathPreviewJson), "dynamic preview public result should redact secret-shaped and session write-lock surfaces");
assert(secretWritePathPreviewJson.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "dynamic preview public result should include a secret-shaped write path redaction placeholder");
assert(secretWritePathPreviewJson.includes("[redacted-session-path]"), "dynamic preview public result should include a session path redaction placeholder");
assert(secretWritePathPreviewJson.includes(dynamicPublicReconciliationPath), "dynamic preview public result should preserve public reconciliation evidence paths");
const secretLeftNode = secretWritePathPreview.nodes.find((node) => node.stableKey === "secret-lock-left");
const secretRightNode = secretWritePathPreview.nodes.find((node) => node.stableKey === "secret-lock-right");
assert(secretLeftNode?.expectedWritePaths.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "node expectedWritePaths should redact secret-shaped path items");
assert(secretLeftNode?.writeScope.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "node writeScope should redact secret-shaped declared path items");
assert(secretRightNode?.worktreeEligibility.normalizedWriteLocks.includes("[redacted-session-path]"), "node normalizedWriteLocks should redact absolute session path items");
assert(
  secretWritePathPreview.batches.some((batch) => batch.held.some((held) => held.reason === "write_conflict" && held.conflictingWriteLocks?.includes(REDACTED_SECRETISH_EVIDENCE_PATH))),
  "batch conflict evidence should redact secret-shaped write-lock items",
);

const dynamicOpenSshPrivateKeyBegin = "-----BEGIN OPENSSH " + "PRIVATE KEY-----";
const dynamicOpenSshPrivateKeyEnd = "-----END OPENSSH " + "PRIVATE KEY-----";
const dynamicPgpPrivateKeyBegin = "-----BEGIN PGP " + "PRIVATE KEY BLOCK-----";
const dynamicPgpPrivateKeyEnd = "-----END PGP " + "PRIVATE KEY BLOCK-----";

const sanitized = normalizeDynamicTaskPublicText(
  `Public title stays.
Public API documentation stays.
Design token cleanup is public.
system: hidden system instruction
- system: hidden bullet system instruction
- > system: hidden nested bullet quote system instruction
> - developer: hidden nested quote bullet developer instruction
* developer: hidden bullet developer instruction
> assistant: hidden quote assistant scratch
### instructions: hidden heading instructions
1. scratchpad: hidden numbered scratchpad
- [ ] chain_of_thought: hidden checkbox reasoning
developer: hidden developer instruction
assistant: hidden assistant scratch
instructions: hidden instructions
scratchpad: hidden scratchpad
chain_of_thought: hidden reasoning
OPENAI_API_KEY=sk-should-not-leak
export ANTHROPIC_API_KEY="sk-also-secret"
GITHUB_TOKEN=github-secret
NPM_TOKEN=npm-secret
AWS_SESSION_TOKEN=aws-session-secret
AWS_ACCESS_KEY_ID=aws-access-secret
AWS_SECRET_ACCESS_KEY=aws-secret
process.env.OPENAI_API_KEY = "process-env-secret"
apiKey: "secret"
{"apiKey":"json-secret"}
Authorization: Bearer abcdefghijklmnop
"Cookie": "session=abc"
'privateKey' = 'private-key-secret'
${dynamicOpenSshPrivateKeyBegin}
private-key-body-should-not-leak
${dynamicOpenSshPrivateKeyEnd}
${dynamicPgpPrivateKeyBegin}
pgp-private-key-body-should-not-leak
${dynamicPgpPrivateKeyEnd}
Safe public line remains.`,
  1_000,
);
for (const expected of ["Public title stays", "Public API documentation stays", "Design token cleanup is public", "Safe public line remains"]) {
  assert(sanitized.includes(expected), `sanitizer should preserve public text ${expected}: ${sanitized}`);
}
for (const forbidden of [
  "hidden system",
  "hidden bullet system",
  "hidden nested bullet quote system",
  "hidden nested quote bullet developer",
  "hidden developer",
  "hidden bullet developer",
  "hidden assistant",
  "hidden quote assistant",
  "hidden instructions",
  "hidden heading instructions",
  "hidden scratchpad",
  "hidden numbered scratchpad",
  "hidden reasoning",
  "hidden checkbox reasoning",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GITHUB_TOKEN",
  "NPM_TOKEN",
  "AWS_SESSION_TOKEN",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "process.env",
  "process-env-secret",
  "apiKey",
  "json-secret",
  "Bearer",
  "Cookie",
  "session=abc",
  "privateKey",
  "PRIVATE KEY",
  "private-key-body",
  "PGP PRIVATE KEY",
  "pgp-private-key-body",
  "sk-should-not-leak",
])
  assert(!sanitized.includes(forbidden), `sanitizer should strip ${forbidden}: ${sanitized}`);

const rawSkToken = "sk-" + "abcdefghijklmnopqrstuvwxyz1234567890";
const rawTokenSanitized = normalizeDynamicTaskPublicText(
  `Visible before raw token.\n${rawSkToken}\nVisible after raw token.`,
  1_000,
);
assert(rawTokenSanitized.includes("Visible before raw token"), `raw-token sanitizer should preserve public prefix: ${rawTokenSanitized}`);
assert(rawTokenSanitized.includes("Visible after raw token"), `raw-token sanitizer should preserve public suffix: ${rawTokenSanitized}`);
assert(!rawTokenSanitized.includes(rawSkToken), `raw-token sanitizer should strip bare OpenAI-style token: ${rawTokenSanitized}`);
const rawTokenPreview = previewDynamicTaskGraph([
  {
    key: rawSkToken,
    title: rawSkToken,
    description: `Public description survives.\n${rawSkToken}`,
  },
]);
const rawTokenNode = rawTokenPreview.nodes[0];
assert(rawTokenNode, "raw-token preview should produce a node");
assert(!rawTokenNode.title.includes(rawSkToken), `raw token should not appear in preview title: ${JSON.stringify(rawTokenNode)}`);
assert(!rawTokenNode.stableKey.includes("sk-"), `raw token should not shape the stable key: ${JSON.stringify(rawTokenNode)}`);
assert(!JSON.stringify(rawTokenPreview).includes(rawSkToken), `raw token should not appear anywhere in public preview details: ${JSON.stringify(rawTokenPreview)}`);

const escapedNewlineSanitized = normalizeDynamicTaskPublicText(
  "Public escaped text\\nprocess.env.OPENAI_API_KEY = escaped-process-secret\\n-----BEGIN PGP PRIVATE KEY BLOCK-----\\nescaped-key-body\\n-----END PGP PRIVATE KEY BLOCK-----\\nPublic escaped after",
  1_000,
);
assert(escapedNewlineSanitized.includes("Public escaped text"), `escaped-newline sanitizer should preserve first public line: ${escapedNewlineSanitized}`);
assert(escapedNewlineSanitized.includes("Public escaped after"), `escaped-newline sanitizer should preserve trailing public line: ${escapedNewlineSanitized}`);
for (const forbidden of ["process.env", "OPENAI_API_KEY", "escaped-process-secret", "PRIVATE KEY", "escaped-key-body"])
  assert(!escapedNewlineSanitized.includes(forbidden), `escaped-newline sanitizer should strip ${forbidden}: ${escapedNewlineSanitized}`);

const sameLineAssignmentSanitized = normalizeDynamicTaskPublicText(
  `Safe before.
{"name":"public","apiKey":"json-secret"}
const x = 1; process.env.OPENAI_API_KEY = "process-env-secret"
Safe after.`,
  1_000,
);
assert(sameLineAssignmentSanitized.includes("Safe before"), `same-line sanitizer should preserve first public line: ${sameLineAssignmentSanitized}`);
assert(sameLineAssignmentSanitized.includes("Safe after"), `same-line sanitizer should preserve trailing public line: ${sameLineAssignmentSanitized}`);
for (const forbidden of ["apiKey", "json-secret", "process.env", "OPENAI_API_KEY", "process-env-secret"])
  assert(!sameLineAssignmentSanitized.includes(forbidden), `same-line sanitizer should strip ${forbidden}: ${sameLineAssignmentSanitized}`);

const nestedMarkdownPromptRoleSanitized = normalizeDynamicTaskPublicText(
  `Visible before.
> > - [ ] system: hidden nested checkbox role
1. > - developer: hidden nested numbered quote role
* > assistant: hidden nested bullet quote role
Visible after.`,
  1_000,
);
assert(nestedMarkdownPromptRoleSanitized.includes("Visible before"), `nested markdown role sanitizer should preserve public prefix: ${nestedMarkdownPromptRoleSanitized}`);
assert(nestedMarkdownPromptRoleSanitized.includes("Visible after"), `nested markdown role sanitizer should preserve public suffix: ${nestedMarkdownPromptRoleSanitized}`);
for (const forbidden of ["hidden nested checkbox role", "hidden nested numbered quote role", "hidden nested bullet quote role"])
  assert(!nestedMarkdownPromptRoleSanitized.includes(forbidden), `nested markdown role sanitizer should strip ${forbidden}: ${nestedMarkdownPromptRoleSanitized}`);

type DynamicPreviewToolRegistration = {
  readonly name: string;
  readonly description?: string;
  readonly promptSnippet?: string;
  readonly execute: (...args: readonly unknown[]) => unknown | Promise<unknown>;
};

function assertNoTaskGraphStore(cwd: string, message: string) {
  assert(!fs.existsSync(path.join(cwd, ".pi")), `${message}: .pi directory was created`);
  assert(!fs.existsSync(taskGraphRoot(cwd)), `${message}: task-graph directory was created`);
}

async function assertRegisteredDynamicPreviewToolReadOnly() {
  const tools = new Map<string, DynamicPreviewToolRegistration>();
  const pi = {
    on() {},
    registerCommand() {},
    registerShortcut() {},
    registerTool(tool: DynamicPreviewToolRegistration) {
      tools.set(tool.name, tool);
    },
  };
  taskGraphExtension(pi as never);

  const dynamicPreviewTool = tools.get("task_graph_dynamic_preview");
  assert(dynamicPreviewTool, "task_graph_dynamic_preview tool is registered through the extension harness");
  assert.match(dynamicPreviewTool.description ?? "", /Read-only preview/i, "dynamic preview description should advertise read-only behavior");
  assert.match(dynamicPreviewTool.description ?? "", /never queues, persists, mutates runs\/rootWorkQueue\/scheduler state/i, "dynamic preview description should advertise no durable graph mutations");
  assert.match(dynamicPreviewTool.promptSnippet ?? "", /never queues, persists, mutates/i, "dynamic preview prompt snippet should advertise no durable graph mutations");

  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "task-graph-dynamic-preview-readonly-"));
  const ctx = {
    cwd,
    ui: {
      setStatus() {},
      setWidget() {},
      notify() {},
    },
  };
  assertNoTaskGraphStore(cwd, "fresh dynamic preview cwd starts without a task graph store");
  const result = await dynamicPreviewTool.execute(
    "validation-dynamic-preview-call",
    { seeds: [{ key: "preview-task", expectedWritePaths: ["src/preview.ts"] }], maxParallel: 2 },
    undefined,
    undefined,
    ctx,
  );
  assert(JSON.stringify(result).includes("Preview only: this tool does not queue tasks"), "dynamic preview tool response should state preview-only behavior");
  assert(JSON.stringify(result).includes('"valid":true'), "dynamic preview tool response should include valid preview details");

  const secretSurfaceResult = await dynamicPreviewTool.execute(
    "validation-dynamic-preview-secret-surface-call",
    {
      seeds: [
        { key: "secret-lock-left", writeScope: [dynamicSecretDeclaredPath], expectedWritePaths: [dynamicSecretExpectedPath, dynamicPublicReconciliationPath] },
        { key: "secret-lock-right", writeScope: [dynamicSecretDeclaredPath, dynamicSessionDeclaredPath], expectedWritePaths: [dynamicSecretExpectedPath] },
      ],
      maxParallel: 2,
    },
    undefined,
    undefined,
    ctx,
  );
  const secretSurfaceResultJson = JSON.stringify(secretSurfaceResult);
  assert(!secretWritePathLeakPattern.test(secretSurfaceResultJson), "dynamic preview tool response should redact secret-shaped and session write-lock surfaces");
  assert(secretSurfaceResultJson.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "dynamic preview tool response should include a secret-shaped write path redaction placeholder");
  assert(secretSurfaceResultJson.includes(dynamicPublicReconciliationPath), "dynamic preview tool response should preserve public reconciliation evidence paths");
  assertNoTaskGraphStore(cwd, "task_graph_dynamic_preview execution remains read-only");
}

assertRegisteredDynamicPreviewToolReadOnly()
  .then(() => {
    console.log("task graph dynamic graph validation passed");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
