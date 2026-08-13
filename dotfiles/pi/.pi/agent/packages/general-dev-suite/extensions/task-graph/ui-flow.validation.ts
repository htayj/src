import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { normalizeStableKey } from "./descriptors";
import { renderReadyInstructions, renderStatus, renderTaskGraphWidget } from "./display";
import { renderTaskGraphFlowchart } from "./flowchart";
import { REDACTED_LINEAGE_RUN_ID, REDACTED_LINEAGE_WARNING, REDACTED_SECRETISH_EVIDENCE_PATH } from "./root-work-lineage";
import { createRun } from "./formulas";
import { taskGraphNextResponseDetails } from "./index";
import type { RunnerSpec, TaskGraphRun, TaskKind, TaskNode, TaskStatus } from "./schema";
import { buildTaskPrompt, readyTasks } from "./scheduler";
import { saveRun } from "./store";
import { sanitizeTaskMetadataForDetails, TaskGraphComponent } from "./ui";
import { buildTaskGraphViewModel, preserveSelection } from "./view-model";

const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "task-graph-ui-flow-"));

function fileSha256(file: string) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
const continuationInput = `Continue autoimprove loop iteration 5

Objective: Improve task graph TUI navigation, status wording, lineage warnings, and flowchart presentation.

Acceptance criteria:
- Default Ctrl+Alt+G work-list is flat.
- promptInstructions: never show this compact-display sentinel.
`;
const run = createRun(cwd, "autoimprove", continuationInput, { oracleConsult: false, decompose: false, maxParallel: 3 });

const firstTask = Object.values(run.tasks).find((task) => task.blockedBy.length === 0);
assert(firstTask, "run has a first task");
assert.doesNotMatch(firstTask!.title, /Continue autoimprove/i, "new continuation-style task titles should not use generic Continue text");
assert.match(firstTask!.title, /Improve task graph TUI navigation/i, "new continuation-style task titles should use the Objective line");
firstTask!.metadata.projectPromptInstructions = ["compact-display sentinel"];
firstTask!.metadata.readyPrompt = "DO_NOT_LEAK_READY_PROMPT";
firstTask!.metadata.systemPrompt = "DO_NOT_LEAK_SYSTEM_PROMPT";
firstTask!.metadata.hiddenPrompt = "DO_NOT_LEAK_HIDDEN_PROMPT";
const sanitizedFirstMetadata = JSON.stringify(sanitizeTaskMetadataForDetails(firstTask!.metadata));
assert.doesNotMatch(sanitizedFirstMetadata, /DO_NOT_LEAK|promptInstructions|projectPromptInstructions|readyPrompt|systemPrompt|hiddenPrompt/i, "UI/details sanitizer strips prompt-like metadata keys");

const camelSecretMetadataKey = "api" + "KeyMetadata";
const metadataAssociatedValue = "UI_METADATA_ASSOCIATED_VALUE_SENTINEL";
const metadataSessionPathAssociatedValue = "UI_METADATA_SESSION_PATH_KEY_ASSOCIATED_VALUE_SENTINEL";
const metadataSessionPathKey = ["/home", "fixture", ".pi", "agent", "sessions", "metadata-key", "transcript.json"].join("/");
const metadataPublicSecretValue = "api" + "_key=public-value";
const sanitizedMetadataForDetails = sanitizeTaskMetadataForDetails({
  source: "metadata-redaction-validation",
  [camelSecretMetadataKey]: metadataAssociatedValue,
  [metadataSessionPathKey]: metadataSessionPathAssociatedValue,
  publicContext: "Decision: COMPLETE at .orchestration/public-terminal-reconciliation-report.md",
  publicNote: metadataPublicSecretValue,
} as TaskNode["metadata"]) as Record<string, unknown>;
const sanitizedMetadataForDetailsJson = JSON.stringify(sanitizedMetadataForDetails);
assert.equal(Object.hasOwn(sanitizedMetadataForDetails, REDACTED_SECRETISH_EVIDENCE_PATH), false, "secret-shaped metadata keys are skipped rather than relabeled in TUI details");
assert.equal(Object.hasOwn(sanitizedMetadataForDetails, "[redacted-session-path]"), false, "session-path metadata keys are skipped rather than relabeled in TUI details");
assert.equal(sanitizedMetadataForDetailsJson.includes(metadataAssociatedValue), false, "TUI details omit values associated with camelCase secret-shaped metadata keys");
assert.equal(sanitizedMetadataForDetailsJson.includes(metadataSessionPathAssociatedValue), false, "TUI details omit values associated with session-path-shaped metadata keys");
assert.equal(sanitizedMetadataForDetails.publicContext, "Decision: COMPLETE at .orchestration/public-terminal-reconciliation-report.md", "public metadata keys preserve public lineage context");
assert.equal(sanitizedMetadataForDetails.publicNote, REDACTED_SECRETISH_EVIDENCE_PATH, "public metadata keys keep the key while redacting secret-shaped values");
const compactSecretMetadataKey = "api" + "key" + "metadata";
const compactSecretMetadataValue = "access" + "token" + "metadata";
const compactMetadataAssociatedValue = "UI_COMPACT_METADATA_ASSOCIATED_VALUE_SENTINEL";
const compactMetadataPublicPath = ".orchestration/public-terminal-reconciliation-report.md";
const compactMetadataPublicRunId = "autoimprove-mpwly22k-t45qna";
const sanitizedCompactMetadataForDetails = sanitizeTaskMetadataForDetails({
  source: "compact-metadata-redaction-validation",
  [compactSecretMetadataKey]: compactMetadataAssociatedValue,
  publicContext: `Decision: COMPLETE at ${compactMetadataPublicPath}`,
  publicGeneratedRunId: compactMetadataPublicRunId,
  publicValue: compactSecretMetadataValue,
} as TaskNode["metadata"]) as Record<string, unknown>;
const sanitizedCompactMetadataForDetailsJson = JSON.stringify(sanitizedCompactMetadataForDetails);
assert.equal(Object.hasOwn(sanitizedCompactMetadataForDetails, compactSecretMetadataKey), false, "compact secret-shaped metadata keys are skipped in TUI details");
assert.equal(sanitizedCompactMetadataForDetailsJson.includes(compactMetadataAssociatedValue), false, "TUI details omit values associated with compact secret-shaped metadata keys");
assert.equal(sanitizedCompactMetadataForDetailsJson.includes(compactSecretMetadataValue), false, "TUI details redact compact secret-shaped metadata values under public keys");
assert.equal(sanitizedCompactMetadataForDetailsJson.includes(compactSecretMetadataKey), false, "TUI details omit compact secret-shaped metadata keys");
assert.equal(sanitizedCompactMetadataForDetails.publicContext, `Decision: COMPLETE at ${compactMetadataPublicPath}`, "compact metadata sanitizer preserves public lineage context");
assert.equal(sanitizedCompactMetadataForDetails.publicGeneratedRunId, compactMetadataPublicRunId, "compact metadata sanitizer preserves public generated run ids under public keys");
assert.equal(sanitizedCompactMetadataForDetails.publicValue, REDACTED_SECRETISH_EVIDENCE_PATH, "compact metadata sanitizer redacts compact secret-shaped values under public keys");

const workList = buildTaskGraphViewModel(run, { mode: "work-list" });
const workTaskRows = workList.rows.filter((row) => row.rowKind === "task");
assert(workTaskRows.length > 1, "work-list has task rows");
assert(workTaskRows.every((row) => row.depth === 0 && row.node?.depth === 0), "work-list rows stay flat even for dependency chains");
assert.equal(workList.counts.current, 0, "no running task yet");
assert(workList.counts.ready > 0, "ready count is derived from ready work");
assert.equal(workList.counts.failed, 0, "no failed tasks yet");
assert.doesNotMatch(JSON.stringify(workList), /compact-display sentinel|promptInstructions/i, "view model must not expose prompt instructions");
assert(workTaskRows.some((row) => /Improve task graph TUI navigation/i.test(row.label)), "display rows use objective-derived labels");

const outline = buildTaskGraphViewModel(run, { mode: "outline", expandAll: true });
const outlineTaskRows = outline.rows.filter((row) => row.rowKind === "task");
assert(outlineTaskRows.some((row) => row.depth === 1), "outline uses true parent/decomposition relationships");
assert(outlineTaskRows.every((row) => row.depth <= 1), "outline does not nest by blockedBy dependency chains");

const selected = preserveSelection(workTaskRows[1]?.node?.id, 1, workList.rows);
assert.equal(selected, workTaskRows[1]?.node?.id, "selection is preserved by task id when the task still exists");
const fallbackTargetIndex = workList.rows.findIndex((row) => row.node?.id === workTaskRows[1]?.node?.id);
const fallback = preserveSelection("missing-task", fallbackTargetIndex, workList.rows);
assert.equal(fallback, workTaskRows[1]?.node?.id, "missing selection falls back to nearest selectable task row");

const flowRunner: RunnerSpec = {
  kind: "subagent",
  name: "implementer",
  sideEffects: "write",
  writePolicy: { declaredPaths: [], allowOutsideDeclaredPaths: true },
};
const makeFlowTask = (id: string, title: string, status: TaskStatus, blockedBy: string[], kind: TaskKind = "IMPLEMENT"): TaskNode => ({
  id,
  kind,
  title,
  description: `${title}\npromptInstructions: DO_NOT_LEAK_PROMPT_SENTINEL`,
  status,
  priority: "B",
  blockedBy: [...blockedBy],
  blocks: [],
  runner: flowRunner,
  subagent: { type: "implementer", context: "fresh" },
  attempts: [],
  artifacts: [],
  metadata: {
    source: "flow-test",
    projectPromptInstructions: ["DO_NOT_LEAK_PROJECT_PROMPT"],
    workerPrompt: "DO_NOT_LEAK_WORKER_PROMPT",
    acceptanceCriteria: ["Flowchart includes dependency edges"],
  },
  createdAt: `2025-01-01T00:00:0${id.endsWith("a") ? "1" : id.endsWith("b") ? "2" : "3"}.000Z`,
  updatedAt: `2025-01-01T00:00:0${id.endsWith("a") ? "1" : id.endsWith("b") ? "2" : "3"}.000Z`,
});
const flowRun: TaskGraphRun = {
  schemaVersion: 1,
  runId: "flow-run",
  cwd,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  mode: "custom",
  status: "pending",
  rootTaskIds: ["task-a"],
  tasks: {
    "task-c": makeFlowTask("task-c", "Review downstream work", "pending", ["task-b"], "CODE_REVIEW"),
    "task-a": makeFlowTask("task-a", "Implement <Alpha> | \"quoted\" [brackets] `ticks` and a very long deterministic label", "succeeded", []),
    "task-b": makeFlowTask("task-b", "Compile: Beta & verify Mermaid output", "pending", ["task-a"], "COMPILE"),
  },
  edges: [
    { from: "task-b", to: "task-c", type: "depends_on", reason: "beta before review" },
    { from: "task-a", to: "task-b", type: "depends_on", reason: "alpha before beta" },
  ],
  locks: { held: {} },
  config: { maxParallel: 2, commitEnabled: false, pushEnabled: false, strict: false, continuous: false, mutateOrg: false },
  deferredCommits: [],
  gitBaseline: { dirtyAtStart: [] },
  metadata: {},
};
flowRun.tasks["task-a"]!.blocks = ["task-b"];
flowRun.tasks["task-b"]!.blocks = ["task-c"];
const asciiFlow = renderTaskGraphFlowchart(flowRun, { format: "ascii", includeDone: true, maxLabelLength: 48 });
const asciiFlowAgain = renderTaskGraphFlowchart(flowRun, { format: "ascii", includeDone: true, maxLabelLength: 48 });
assert.equal(asciiFlowAgain, asciiFlow, "ASCII flowchart output is deterministic");
assert.match(asciiFlow, /task-a .*\[done\].*Implement Alpha quoted brackets ticks and a ver…/i, "ASCII flowchart includes sanitized/truncated task labels");
assert.doesNotMatch(asciiFlow, /<Alpha>|\| "quoted"|\[brackets\]|`ticks`|deterministic label/i, "ASCII flowchart removes unsafe label punctuation and truncates long labels");
assert.match(asciiFlow, /task-a --> task-b/i, "ASCII flowchart renders task-a dependency edge");
assert.match(asciiFlow, /task-b --> task-c/i, "ASCII flowchart renders task-b dependency edge");
assert.match(asciiFlow, /checks:1/i, "ASCII flowchart surfaces compact acceptance metadata as a deterministic-node stepping stone");
assert.doesNotMatch(asciiFlow, /DO_NOT_LEAK|promptInstructions|projectPromptInstructions|workerPrompt/i, "ASCII flowchart omits prompt instruction fields");
const mermaidFlow = renderTaskGraphFlowchart(flowRun, { format: "mermaid", includeDone: true, maxLabelLength: 48 });
const mermaidFlowAgain = renderTaskGraphFlowchart(flowRun, { format: "mermaid", includeDone: true, maxLabelLength: 48 });
assert.equal(mermaidFlowAgain, mermaidFlow, "Mermaid flowchart output is deterministic");
assert.match(mermaidFlow, /^flowchart TD\n/, "Mermaid flowchart starts with flowchart TD");
assert.match(mermaidFlow, /task_a --> task_b/i, "Mermaid flowchart renders task-a dependency edge");
assert.match(mermaidFlow, /task_b --> task_c/i, "Mermaid flowchart renders task-b dependency edge");
assert.match(mermaidFlow, /&lt;Alpha&gt;/, "Mermaid flowchart escapes angle brackets");
assert.doesNotMatch(mermaidFlow, /DO_NOT_LEAK|promptInstructions|projectPromptInstructions|workerPrompt/i, "Mermaid flowchart omits prompt instruction fields");
assert.doesNotMatch(renderTaskGraphFlowchart(flowRun, { format: "ascii", includeDone: false }), /task-a|Implement Alpha/i, "includeDone:false excludes done nodes");

const readyStatus = renderStatus(run);
assert.match(readyStatus, /Current: ready — .*Improve task graph TUI navigation/i, "status should show ready work as current");
assert.doesNotMatch(readyStatus, /Active: none/i, "status should not say Active: none when ready work exists");
const settingsSessionPath = ["/home", "fixture", ".pi", "agent", "sessions", "settings-status", "task-graph-settings.json"].join("/");
const settingsStatusRun = JSON.parse(JSON.stringify(run)) as TaskGraphRun;
settingsStatusRun.runId = "settings-status-public-run";
settingsStatusRun.config = {
  ...settingsStatusRun.config,
  projectSettingsInfo: { loaded: true, path: settingsSessionPath, graphNames: ["public-status-graph"] },
};
settingsStatusRun.metadata = {
  ...(settingsStatusRun.metadata ?? {}),
  rootWorkQueue: {
    version: 1,
    items: [
      {
        key: "public-root-work-lineage",
        kind: "autoimprove-loop",
        state: "active",
        title: "Public root work lineage",
        purpose: "Keep public root work lineage visible in status output.",
        input: {
          kind: "autoimprove-loop",
          objective: "Continue public root work lineage.",
          oracleRequired: true,
          writeScope: ["extensions/task-graph/"],
        },
        requestedBy: "user",
        originRunId: settingsStatusRun.runId,
        activeRunId: settingsStatusRun.runId,
        privacy: { sanitized: true },
      },
    ],
  },
};
const settingsStatus = renderStatus(settingsStatusRun);
assert.equal(settingsStatus.includes(settingsSessionPath), false, "status header should not render raw session-shaped settings paths");
assert.equal(settingsStatus.includes("[redacted-session-path]"), true, "status header should show a settings-path redaction placeholder");
assert.equal(settingsStatus.includes("Current: ready"), true, "status should keep normal current-work content visible");
assert.equal(settingsStatus.includes("Public root work lineage"), true, "status should keep public root-work content visible");
assert.equal(settingsStatus.includes("lineage note: display-only"), true, "status should keep public root-work lineage notes visible");
const publicSettingsStatusRun = JSON.parse(JSON.stringify(settingsStatusRun)) as TaskGraphRun;
publicSettingsStatusRun.config = {
  ...publicSettingsStatusRun.config,
  projectSettingsInfo: { loaded: true, path: ".pi/task-graph-settings.json", graphNames: ["public-status-graph"] },
};
const publicSettingsStatus = renderStatus(publicSettingsStatusRun);
assert.equal(publicSettingsStatus.includes("settings .pi/task-graph-settings.json"), true, "status header should preserve clearly public settings paths");
const readyWidget = renderTaskGraphWidget(run).join("\n");
assert.match(readyWidget, /Current: ready — .*Improve task graph TUI navigation/i, "widget should show ready work as current");
assert.doesNotMatch(readyWidget, /Active: none/i, "widget should not say Active: none when ready work exists");

const lockSecretExpectedPath = [".orchestration", "lock-display", "api_" + "key-expected-write.md"].join("/");
const lockSecretDeclaredPath = [".orchestration", "lock-display", "private" + "KeyDeclaredWrite.md"].join("/");
const lockSessionDeclaredPath = ["/home", "fixture", ".pi", "agent", "sessions", "lock-display", "artifact.md"].join("/");
const lockPublicGeneratedRunPath = [".pi", "dev-suite", "task-graph", "runs", "autoimprove-mpwly22k-t45qna.json"].join("/");
const lockPublicReconciliationPath = [".orchestration", "public-terminal-reconciliation.md"].join("/");
const lockDescriptor = (stableKey: string) => ({
  version: 1 as const,
  stableKey,
  purpose: "Validate lock display redaction without altering scheduler locks.",
  inputs: ["public lock display fixture"],
  outputs: ["sanitized lock presentation"],
  artifacts: [lockPublicReconciliationPath],
  acceptanceChecks: ["Lock display redacts secret-shaped path locks"],
  writeScope: [lockPublicReconciliationPath],
  isolationBoundary: ["Presentation-only fixture"],
  order: stableKey.endsWith("expected") ? 1 : 2,
});
const lockRunner = (declaredPaths: string[]): RunnerSpec => ({
  kind: "subagent",
  name: "lock-display-validator",
  sideEffects: "read",
  writePolicy: { declaredPaths, allowOutsideDeclaredPaths: true },
});
const lockTask = (id: string, kind: TaskKind, expectedWritePaths: string[] | undefined, declaredPaths: string[], order: number): TaskNode => ({
  id,
  kind,
  title: `Lock display fixture ${order}`,
  description: "Validate public lock display presentation without including private path text.",
  status: "pending",
  priority: "A",
  blockedBy: [],
  blocks: [],
  runner: lockRunner(declaredPaths),
  subagent: { type: "implementer", context: "fresh" },
  attempts: [],
  artifacts: [],
  metadata: {
    source: "lock-display-validation",
    ...(expectedWritePaths ? { expectedWritePaths } : {}),
    nodeDescriptor: lockDescriptor(`lock-display-${order === 1 ? "expected" : "declared"}`),
  },
  createdAt: `2025-01-01T00:10:0${order}.000Z`,
  updatedAt: `2025-01-01T00:10:0${order}.000Z`,
});
const lockDisplayRun: TaskGraphRun = {
  schemaVersion: 1,
  runId: "lock-display-public-run",
  cwd,
  createdAt: "2025-01-01T00:10:00.000Z",
  updatedAt: "2025-01-01T00:10:00.000Z",
  mode: "custom",
  status: "pending",
  rootTaskIds: ["lock-expected", "lock-declared"],
  tasks: {
    "lock-expected": lockTask("lock-expected", "COMPILE", [lockSecretExpectedPath, lockPublicGeneratedRunPath], [], 1),
    "lock-declared": lockTask("lock-declared", "UNIT_TEST", undefined, [lockSecretDeclaredPath, lockSessionDeclaredPath, lockPublicReconciliationPath], 2),
  },
  edges: [],
  locks: { held: {} },
  config: { maxParallel: 3, commitEnabled: false, pushEnabled: false, strict: false, continuous: false, mutateOrg: false },
  deferredCommits: [],
  gitBaseline: { dirtyAtStart: [] },
  metadata: {},
};
const lockReadyInstructions = renderReadyInstructions(lockDisplayRun);
const lockSecretPattern = /api[_\s-]*key|private[_\s-]*key|\/home\/fixture|\/sessions\//i;
assert.doesNotMatch(lockReadyInstructions, lockSecretPattern, "ready instructions should redact secret-shaped and session path lock labels");
assert(lockReadyInstructions.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "ready instructions should include a lock redaction placeholder");
assert(lockReadyInstructions.includes("[redacted-session-path]"), "ready instructions should include a session-path redaction placeholder");
assert(lockReadyInstructions.includes(lockPublicGeneratedRunPath), "ready instructions should preserve public generated run lock paths");
assert(lockReadyInstructions.includes(lockPublicReconciliationPath), "ready instructions should preserve public terminal reconciliation lock paths");

saveRun(lockDisplayRun);
const lockRenderCalls: Array<boolean | undefined> = [];
const lockFakeTui = { requestRender: (force?: boolean) => lockRenderCalls.push(force), terminal: { rows: 80, columns: 180 } };
const lockFakeCtx = { cwd, ui: { setStatus() {}, setWidget() {} } };
const lockComponent = new TaskGraphComponent(lockFakeCtx as never, lockFakeTui, () => {}, () => {});
lockComponent.handleInput?.("i");
const expectedLockDetails = lockComponent.render(180).join("\n");
lockComponent.handleInput?.("j");
const declaredLockDetails = lockComponent.render(180).join("\n");
const tuiLockDetails = `${expectedLockDetails}\n${declaredLockDetails}`;
assert.doesNotMatch(tuiLockDetails, lockSecretPattern, "TUI task details should redact secret-shaped and session path lock labels");
assert(tuiLockDetails.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "TUI task details should include a lock redaction placeholder");
assert(tuiLockDetails.includes("[redacted-session-path]"), "TUI task details should include a session-path redaction placeholder");
assert(tuiLockDetails.includes(lockPublicGeneratedRunPath), "TUI task details should preserve public generated run lock paths");
assert(tuiLockDetails.includes(lockPublicReconciliationPath), "TUI task details should preserve public terminal reconciliation lock paths");

const descriptorSecretStableKey = "api" + "KeyDescriptorStableKey";
const descriptorSecretPurpose = "api" + "KeyDescriptorPurpose";
const descriptorSecretInput = "api" + "KeyDescriptorInput";
const descriptorSecretOutput = "private" + "KeyDescriptorOutput";
const descriptorSecretArtifact = [".orchestration", "descriptor-display", "private" + "KeyArtifact.md"].join("/");
const descriptorSecretWriteScope = [".orchestration", "descriptor-display", "api_" + "key-write.md"].join("/");
const descriptorSecretAcceptanceCheck = "No " + "api" + "KeyDescriptorAcceptanceCheck";
const descriptorSecretIsolationBoundary = "private" + "KeyDescriptorIsolationBoundary";
const descriptorSessionPurpose = ["/home", "fixture", ".pi", "agent", "sessions", "descriptor-display", "purpose.md"].join("/");
const descriptorSessionInput = ["/home", "fixture", ".pi", "agent", "sessions", "descriptor-display", "input.md"].join("/");
const descriptorSessionOutput = ["/home", "fixture", ".pi", "agent", "sessions", "descriptor-display", "output.md"].join("/");
const descriptorSessionArtifact = ["/home", "fixture", ".pi", "agent", "sessions", "descriptor-display", "artifact.md"].join("/");
const descriptorSessionWriteScope = ["/home", "fixture", ".pi", "agent", "sessions", "descriptor-display", "write-scope.md"].join("/");
const descriptorSessionAcceptanceCheck = `Review ${["/home", "fixture", ".pi", "agent", "sessions", "descriptor-display", "acceptance.md"].join("/")}`;
const descriptorSessionIsolationBoundary = ["/home", "fixture", ".pi", "agent", "sessions", "descriptor-display", "boundary.md"].join("/");
const descriptorPublicGeneratedRunPath = lockPublicGeneratedRunPath;
const descriptorPublicTerminalEvidencePath = lockPublicReconciliationPath;
const descriptorDecisionContext = "Decision: COMPLETE context remains public";
const descriptorRunner: RunnerSpec = {
  kind: "subagent",
  name: "descriptor-display-validator",
  sideEffects: "write",
  writePolicy: { declaredPaths: [descriptorPublicGeneratedRunPath], allowOutsideDeclaredPaths: true },
};
const descriptorDisplayTask: TaskNode = {
  id: "descriptor-display-task",
  kind: "IMPLEMENT",
  title: "Descriptor prompt display fixture",
  description: "Validate descriptor prompt presentation redaction without changing scheduler semantics.",
  status: "pending",
  priority: "A",
  blockedBy: [],
  blocks: [],
  runner: descriptorRunner,
  subagent: { type: "implementer", context: "fresh" },
  attempts: [],
  artifacts: [],
  metadata: {
    source: "descriptor-display-validation",
    nodeDescriptor: {
      version: 1,
      stableKey: descriptorSecretStableKey,
      purpose: `Validate descriptor prompt display redaction for ${descriptorSecretPurpose} and ${descriptorSessionPurpose}.`,
      inputs: ["public descriptor input", descriptorSecretInput, descriptorSessionInput, descriptorDecisionContext],
      outputs: ["sanitized descriptor prompt presentation", descriptorSecretOutput, descriptorSessionOutput],
      artifacts: [descriptorPublicTerminalEvidencePath, descriptorSecretArtifact, descriptorSessionArtifact],
      acceptanceChecks: ["Descriptor prompt display redacts private-looking descriptor values", descriptorSecretAcceptanceCheck, descriptorSessionAcceptanceCheck],
      writeScope: [descriptorPublicGeneratedRunPath, descriptorSecretWriteScope, descriptorSessionWriteScope],
      isolationBoundary: ["Presentation-only descriptor fixture", descriptorSecretIsolationBoundary, descriptorSessionIsolationBoundary],
      order: 1,
    },
  },
  createdAt: "2025-01-01T00:11:00.000Z",
  updatedAt: "2025-01-01T00:11:00.000Z",
};
const descriptorDisplayRun: TaskGraphRun = {
  schemaVersion: 1,
  runId: "descriptor-display-public-run",
  cwd,
  createdAt: "2025-01-01T00:11:00.000Z",
  updatedAt: "2025-01-01T00:11:00.000Z",
  mode: "custom",
  status: "pending",
  rootTaskIds: [descriptorDisplayTask.id],
  tasks: { [descriptorDisplayTask.id]: descriptorDisplayTask },
  edges: [],
  locks: { held: {} },
  config: { maxParallel: 1, commitEnabled: false, pushEnabled: false, strict: false, continuous: false, mutateOrg: false },
  deferredCommits: [],
  gitBaseline: { dirtyAtStart: [] },
  metadata: {},
};
const descriptorSecretPattern = /api[_\s-]*key|private[_\s-]*key|\/home\/fixture|\/sessions\//i;
function assertDescriptorPromptDisplayRedacted(output: string, label: string, options: { readySummary?: boolean; fieldLabels?: boolean } = {}) {
  assert.doesNotMatch(output, descriptorSecretPattern, `${label} should redact secret-shaped descriptor values and session paths`);
  assert(output.includes(REDACTED_SECRETISH_EVIDENCE_PATH), `${label} should include a secret-shaped descriptor redaction placeholder`);
  assert(output.includes("[redacted-session-path]"), `${label} should include a descriptor session-path redaction placeholder`);
  assert(output.includes(descriptorPublicGeneratedRunPath), `${label} should preserve public generated run paths`);
  assert(output.includes(descriptorPublicTerminalEvidencePath), `${label} should preserve public terminal evidence paths`);
  assert(output.includes("Decision: COMPLETE"), `${label} should preserve public decision context`);
  if (options.fieldLabels !== false) {
    for (const fieldLabel of ["Stable key:", "Purpose:", "Inputs:", "Outputs:", "Artifacts:", "Write scope:", "Isolation boundary:", "Acceptance checks:"]) {
      assert(output.includes(fieldLabel), `${label} should render sanitized descriptor field ${fieldLabel}`);
    }
  }
  if (options.readySummary) assert(output.includes("Descriptor checks:"), `${label} should render sanitized ready-instruction descriptor checks`);
}
function assertDescriptorPromptFieldRedaction(output: string, label: string, options: { fieldLabels?: boolean } = {}) {
  if (options.fieldLabels === false) {
    assert(output.includes("inputs"), `${label} should include descriptor inputs`);
    assert(output.includes("artifacts"), `${label} should include descriptor artifacts`);
    assert(output.includes("writeScope"), `${label} should include descriptor write scope`);
  } else {
    assert(output.includes("Inputs:"), `${label} should render descriptor inputs`);
    assert(output.includes("Artifacts:"), `${label} should render descriptor artifacts`);
    assert(output.includes("Write scope:"), `${label} should render descriptor write scope`);
  }
  for (const rawValue of [
    descriptorSecretInput,
    descriptorSessionInput,
    descriptorSecretArtifact,
    descriptorSessionArtifact,
    descriptorSecretWriteScope,
    descriptorSessionWriteScope,
  ]) {
    assert.equal(output.includes(rawValue), false, `${label} should not include raw private descriptor field values`);
  }
  assert(output.includes("public descriptor input"), `${label} should preserve public descriptor inputs`);
  assert(output.includes(descriptorDecisionContext), `${label} should preserve public descriptor input evidence`);
  assert(output.includes(descriptorPublicTerminalEvidencePath), `${label} should preserve public descriptor artifacts`);
  assert(output.includes(descriptorPublicGeneratedRunPath), `${label} should preserve public descriptor write scope`);
  assert(output.includes(REDACTED_SECRETISH_EVIDENCE_PATH), `${label} should include secret-shaped descriptor redaction evidence`);
  assert(output.includes("[redacted-session-path]"), `${label} should include session-path descriptor redaction evidence`);
}
const descriptorRawPrompt = buildTaskPrompt(descriptorDisplayRun, descriptorDisplayTask);
assertDescriptorPromptDisplayRedacted(descriptorRawPrompt, "raw buildTaskPrompt descriptor block");
assertDescriptorPromptFieldRedaction(descriptorRawPrompt, "raw buildTaskPrompt descriptor block");
const descriptorReadyInstructions = renderReadyInstructions(descriptorDisplayRun);
assert(descriptorReadyInstructions.includes("Run: descriptor-display-public-run"), "ready instructions should preserve public worker prompt run ids");
assertDescriptorPromptDisplayRedacted(descriptorReadyInstructions, "ready instructions", { readySummary: true });
assertDescriptorPromptFieldRedaction(descriptorReadyInstructions, "ready instructions");
const descriptorNextStyleOutput = `task_graph_next output\n${descriptorReadyInstructions}`;
assertDescriptorPromptDisplayRedacted(descriptorNextStyleOutput, "task_graph_next-style output", { readySummary: true });
assertDescriptorPromptFieldRedaction(descriptorNextStyleOutput, "task_graph_next-style output");
const descriptorRawReadyTasks = readyTasks(descriptorDisplayRun);
const descriptorRawReadyPrompt = descriptorRawReadyTasks[0]?.prompt ?? "";
assertDescriptorPromptDisplayRedacted(descriptorRawReadyPrompt, "raw ready task prompt");
assertDescriptorPromptFieldRedaction(descriptorRawReadyPrompt, "raw ready task prompt");
const descriptorRawReadyJson = JSON.stringify(descriptorRawReadyTasks.map((task) => task.nodeDescriptor));
assert(descriptorRawReadyJson.includes(descriptorSecretStableKey), "raw ready scheduler descriptor metadata remains unmodified before response-details sanitization");
assert(descriptorRawReadyJson.includes(descriptorSessionPurpose), "raw ready scheduler descriptor metadata retains session-path fields before response-details sanitization");
const descriptorNextDetails = taskGraphNextResponseDetails(descriptorDisplayRun, descriptorRawReadyTasks);
const descriptorNextDetailsJson = JSON.stringify(descriptorNextDetails);
assertDescriptorPromptDisplayRedacted(descriptorNextDetailsJson, "task_graph_next response details", { fieldLabels: false });
assertDescriptorPromptFieldRedaction(descriptorNextDetailsJson, "task_graph_next response details", { fieldLabels: false });
const descriptorReadyDetail = descriptorNextDetails.ready[0] as Record<string, unknown> | undefined;
assert(descriptorReadyDetail, "task_graph_next response details include a ready-task summary");
assert(!Object.hasOwn(descriptorReadyDetail!, "prompt"), "task_graph_next response details omit raw ready prompts");
assert(!Object.hasOwn(descriptorReadyDetail!, "lockKeys"), "task_graph_next response details expose sanitized lock labels rather than raw lockKeys");
assert.deepEqual(descriptorReadyDetail!.lockLabels, ["group:workspace-write", `path:${descriptorPublicGeneratedRunPath}`], "task_graph_next response details preserve sanitized lock labels");
assert.equal((descriptorReadyDetail!.promptSummary as { omitted?: boolean } | undefined)?.omitted, true, "task_graph_next response details state that the prompt is omitted from details");
assert.match(String(descriptorReadyDetail!.statusLine), /Descriptor prompt display fixture/, "task_graph_next response details preserve public status metadata");
saveRun(descriptorDisplayRun);
const descriptorPromptRenderCalls: Array<boolean | undefined> = [];
const descriptorPromptFakeTui = { requestRender: (force?: boolean) => descriptorPromptRenderCalls.push(force), terminal: { rows: 200, columns: 200 } };
const descriptorPromptComponent = new TaskGraphComponent(lockFakeCtx as never, descriptorPromptFakeTui, () => {}, () => {});
descriptorPromptComponent.handleInput?.("p");
const descriptorTuiPrompt = descriptorPromptComponent.render(200).join("\n");
assert(descriptorTuiPrompt.includes("Run: descriptor-display-public-run"), "TUI prompt panel should preserve public worker prompt run ids");
assertDescriptorPromptDisplayRedacted(descriptorTuiPrompt, "TUI ready prompt panel");
assertDescriptorPromptFieldRedaction(descriptorTuiPrompt, "TUI ready prompt panel");

const descriptorSessionStableKey = ["/home", "fixture", ".pi", "agent", "sessions", "descriptor-stable-key", "transcript.json"].join("/");
const descriptorNormalizedSessionStableKey = normalizeStableKey(descriptorSessionStableKey);
const descriptorSessionStableKeyTask = (id: string, stableKey: string, order: number): TaskNode => ({
  id,
  kind: "IMPLEMENT",
  title: `Descriptor session stable-key fixture ${order}`,
  description: "Validate descriptor stable-key session-path display redaction without changing scheduler metadata.",
  status: "pending",
  priority: "A",
  blockedBy: [],
  blocks: [],
  runner: descriptorRunner,
  subagent: { type: "implementer", context: "fresh" },
  attempts: [],
  artifacts: [],
  metadata: {
    source: "descriptor-session-stable-key-validation",
    nodeDescriptor: {
      version: 1,
      stableKey,
      purpose: "Validate descriptor stable-key session-path display redaction.",
      inputs: ["public descriptor stable-key input"],
      outputs: ["sanitized descriptor stable-key presentation"],
      artifacts: [descriptorPublicTerminalEvidencePath],
      acceptanceChecks: ["Descriptor prompt display redacts session-path stable keys"],
      writeScope: [descriptorPublicGeneratedRunPath],
      isolationBoundary: ["Presentation-only descriptor stable-key fixture"],
      order,
    },
  },
  createdAt: `2025-01-01T00:12:0${order}.000Z`,
  updatedAt: `2025-01-01T00:12:0${order}.000Z`,
});
const descriptorNormalizedSessionStableKeyTask = descriptorSessionStableKeyTask("descriptor-session-stable-key-normalized", descriptorNormalizedSessionStableKey, 1);
const descriptorRawSessionStableKeyTask = descriptorSessionStableKeyTask("descriptor-session-stable-key-raw", descriptorSessionStableKey, 2);
const descriptorPublicStableKey = "public-descriptor-display";
const descriptorPublicStableKeyTask = descriptorSessionStableKeyTask("descriptor-session-stable-key-public", descriptorPublicStableKey, 3);
const descriptorSessionStableKeyRun: TaskGraphRun = {
  schemaVersion: 1,
  runId: "descriptor-session-stable-key-public-run",
  cwd,
  createdAt: "2025-01-01T00:12:00.000Z",
  updatedAt: "2025-01-01T00:12:00.000Z",
  mode: "custom",
  status: "pending",
  rootTaskIds: [descriptorNormalizedSessionStableKeyTask.id, descriptorRawSessionStableKeyTask.id, descriptorPublicStableKeyTask.id],
  tasks: {
    [descriptorNormalizedSessionStableKeyTask.id]: descriptorNormalizedSessionStableKeyTask,
    [descriptorRawSessionStableKeyTask.id]: descriptorRawSessionStableKeyTask,
    [descriptorPublicStableKeyTask.id]: descriptorPublicStableKeyTask,
  },
  edges: [],
  locks: { held: {} },
  config: { maxParallel: 3, commitEnabled: false, pushEnabled: false, strict: false, continuous: false, mutateOrg: false },
  deferredCommits: [],
  gitBaseline: { dirtyAtStart: [] },
  metadata: {},
};
function assertDescriptorSessionStableKeyRedacted(output: string, label: string, options: { fieldLabel?: boolean } = {}) {
  assert.equal(output.includes(descriptorSessionStableKey), false, `${label} should not include raw session-path stable key`);
  assert.equal(output.includes(descriptorNormalizedSessionStableKey), false, `${label} should not include normalized session-path stable key slug`);
  assert(output.includes("[redacted-session-path]"), `${label} should include a descriptor stable-key session-path redaction placeholder`);
  if (options.fieldLabel !== false) assert(output.includes("Stable key:"), `${label} should render the stable-key field label`);
}
function assertDescriptorSessionStableKeySelectedPanelRedacted(output: string, label: string, panelLabel: string) {
  assert.equal(output.includes(descriptorSessionStableKey), false, `${label} should not include raw session-path stable key`);
  assert.equal(output.includes(descriptorNormalizedSessionStableKey), false, `${label} should not include normalized session-path stable key slug`);
  assert(output.includes("[redacted-session-path]"), `${label} should include a descriptor stable-key session-path redaction placeholder`);
  assert(output.includes(panelLabel), `${label} should render the selected-task ${panelLabel} field`);
}
function assertDescriptorPublicStableKeySelectedPanelPreserved(output: string, label: string, panelLine: string) {
  assert(output.includes(panelLine), `${label} should preserve safe public descriptor stable keys in the selected-task panel`);
}
const descriptorSessionRawPrompt = buildTaskPrompt(descriptorSessionStableKeyRun, descriptorRawSessionStableKeyTask);
const descriptorSessionNormalizedPrompt = buildTaskPrompt(descriptorSessionStableKeyRun, descriptorNormalizedSessionStableKeyTask);
assertDescriptorSessionStableKeyRedacted(descriptorSessionRawPrompt, "raw buildTaskPrompt descriptor block with raw session stableKey");
assertDescriptorSessionStableKeyRedacted(descriptorSessionNormalizedPrompt, "raw buildTaskPrompt descriptor block with normalized session stableKey");
const descriptorSessionReadyInstructions = renderReadyInstructions(descriptorSessionStableKeyRun);
assertDescriptorSessionStableKeyRedacted(descriptorSessionReadyInstructions, "ready instructions with session stableKey descriptors");
const descriptorSessionNextStyleOutput = `task_graph_next output\n${descriptorSessionReadyInstructions}`;
assertDescriptorSessionStableKeyRedacted(descriptorSessionNextStyleOutput, "task_graph_next-style output with session stableKey descriptors");
const descriptorSessionReadyTasks = readyTasks(descriptorSessionStableKeyRun);
assert.equal(JSON.stringify(descriptorSessionReadyTasks.map((task) => task.nodeDescriptor)).includes(descriptorNormalizedSessionStableKey), true, "raw ready scheduler descriptor metadata keeps stableKey values before display sanitization");
const descriptorSessionNextDetails = taskGraphNextResponseDetails(descriptorSessionStableKeyRun, descriptorSessionReadyTasks);
assertDescriptorSessionStableKeyRedacted(JSON.stringify(descriptorSessionNextDetails), "task_graph_next response details with session stableKey descriptors", { fieldLabel: false });
saveRun(descriptorSessionStableKeyRun);
const descriptorSessionStableKeyRunFile = path.join(cwd, ".pi", "dev-suite", "task-graph", "runs", `${descriptorSessionStableKeyRun.runId}.json`);
const descriptorSessionStableKeyRunHashBefore = fileSha256(descriptorSessionStableKeyRunFile);
const descriptorSessionStableKeyPanelRenderCalls: Array<boolean | undefined> = [];
const descriptorSessionStableKeyPanelFakeTui = { requestRender: (force?: boolean) => descriptorSessionStableKeyPanelRenderCalls.push(force), terminal: { rows: 200, columns: 220 } };
const descriptorSessionStableKeyPanelComponent = new TaskGraphComponent(lockFakeCtx as never, descriptorSessionStableKeyPanelFakeTui, () => {}, () => {});
const descriptorNormalizedSessionStableKeyTuiSummary = descriptorSessionStableKeyPanelComponent.render(220).join("\n");
assertDescriptorSessionStableKeySelectedPanelRedacted(descriptorNormalizedSessionStableKeyTuiSummary, "TUI selected-task summary with normalized session stableKey", "descriptor:");
descriptorSessionStableKeyPanelComponent.handleInput?.("i");
const descriptorNormalizedSessionStableKeyTuiDetails = descriptorSessionStableKeyPanelComponent.render(220).join("\n");
assertDescriptorSessionStableKeySelectedPanelRedacted(descriptorNormalizedSessionStableKeyTuiDetails, "TUI selected-task details with normalized session stableKey", "descriptor stableKey:");
descriptorSessionStableKeyPanelComponent.handleInput?.("j");
const descriptorRawSessionStableKeyTuiDetails = descriptorSessionStableKeyPanelComponent.render(220).join("\n");
assertDescriptorSessionStableKeySelectedPanelRedacted(descriptorRawSessionStableKeyTuiDetails, "TUI selected-task details with raw session stableKey", "descriptor stableKey:");
descriptorSessionStableKeyPanelComponent.handleInput?.("i");
const descriptorRawSessionStableKeyTuiSummary = descriptorSessionStableKeyPanelComponent.render(220).join("\n");
assertDescriptorSessionStableKeySelectedPanelRedacted(descriptorRawSessionStableKeyTuiSummary, "TUI selected-task summary with raw session stableKey", "descriptor:");
descriptorSessionStableKeyPanelComponent.handleInput?.("j");
const descriptorPublicStableKeyTuiSummary = descriptorSessionStableKeyPanelComponent.render(220).join("\n");
assertDescriptorPublicStableKeySelectedPanelPreserved(descriptorPublicStableKeyTuiSummary, "TUI selected-task summary with public stableKey", `descriptor: [${descriptorPublicStableKey}]`);
descriptorSessionStableKeyPanelComponent.handleInput?.("i");
const descriptorPublicStableKeyTuiDetails = descriptorSessionStableKeyPanelComponent.render(220).join("\n");
assertDescriptorPublicStableKeySelectedPanelPreserved(descriptorPublicStableKeyTuiDetails, "TUI selected-task details with public stableKey", `descriptor stableKey: ${descriptorPublicStableKey}`);
assert.equal(fileSha256(descriptorSessionStableKeyRunFile), descriptorSessionStableKeyRunHashBefore, "TUI selected-task summary/details stableKey redaction must not rewrite the persisted run file");
const descriptorSessionStableKeyRenderCalls: Array<boolean | undefined> = [];
const descriptorSessionStableKeyFakeTui = { requestRender: (force?: boolean) => descriptorSessionStableKeyRenderCalls.push(force), terminal: { rows: 200, columns: 200 } };
const descriptorSessionStableKeyComponent = new TaskGraphComponent(lockFakeCtx as never, descriptorSessionStableKeyFakeTui, () => {}, () => {});
descriptorSessionStableKeyComponent.handleInput?.("p");
const descriptorSessionStableKeyTuiPrompt = descriptorSessionStableKeyComponent.render(200).join("\n");
assertDescriptorSessionStableKeyRedacted(descriptorSessionStableKeyTuiPrompt, "TUI ready prompt panel with normalized session stableKey");
descriptorSessionStableKeyComponent.handleInput?.("j");
const descriptorRawSessionStableKeyTuiPrompt = descriptorSessionStableKeyComponent.render(200).join("\n");
assertDescriptorSessionStableKeyRedacted(descriptorRawSessionStableKeyTuiPrompt, "TUI ready prompt panel with raw session stableKey");

const compactDescriptorStableKey = "api" + "key" + "descriptorstablekey";
const compactDescriptorPublicEvidencePath = descriptorPublicTerminalEvidencePath;
const compactDescriptorTask: TaskNode = {
  ...descriptorDisplayTask,
  id: "compact-descriptor-display-task",
  title: "Compact descriptor display fixture",
  metadata: {
    source: "compact-descriptor-display-validation",
    nodeDescriptor: {
      version: 1,
      stableKey: compactDescriptorStableKey,
      purpose: `Preserve ${compactDescriptorPublicEvidencePath}. Decision: COMPLETE`,
      inputs: ["public compact descriptor input"],
      outputs: ["sanitized compact descriptor presentation"],
      artifacts: [compactDescriptorPublicEvidencePath],
      acceptanceChecks: ["Descriptor status/widget/flowchart display redacts compact secret-shaped stable keys"],
      writeScope: [descriptorPublicGeneratedRunPath],
      isolationBoundary: ["Presentation-only descriptor fixture"],
      order: 1,
    },
  },
};
const compactDescriptorRun: TaskGraphRun = {
  ...descriptorDisplayRun,
  runId: "compact-descriptor-display-public-run",
  rootTaskIds: [compactDescriptorTask.id],
  tasks: { [compactDescriptorTask.id]: compactDescriptorTask },
};
const compactDescriptorViewModelJson = JSON.stringify(buildTaskGraphViewModel(compactDescriptorRun, { mode: "work-list" }));
const compactDescriptorStatus = renderStatus(compactDescriptorRun);
const compactDescriptorWidget = renderTaskGraphWidget(compactDescriptorRun).join("\n");
const compactDescriptorAscii = renderTaskGraphFlowchart(compactDescriptorRun, { format: "ascii", includeDone: true, maxLabelLength: 180 });
const compactDescriptorMermaid = renderTaskGraphFlowchart(compactDescriptorRun, { format: "mermaid", includeDone: true, maxLabelLength: 180 });
const compactDescriptorSurfaces = [compactDescriptorViewModelJson, compactDescriptorStatus, compactDescriptorWidget, compactDescriptorAscii, compactDescriptorMermaid].join("\n");
assert.equal(compactDescriptorSurfaces.includes(compactDescriptorStableKey), false, "descriptor status/widget/flowchart surfaces omit compact secret-shaped stable keys");
assert(compactDescriptorSurfaces.includes(REDACTED_SECRETISH_EVIDENCE_PATH) || compactDescriptorSurfaces.includes(REDACTED_SECRETISH_EVIDENCE_PATH.replace(/[\[\]]/g, "")), "descriptor status/widget/flowchart surfaces include a compact stable-key redaction placeholder");
assert(compactDescriptorSurfaces.includes(compactDescriptorPublicEvidencePath), "descriptor status/widget/flowchart surfaces preserve public terminal evidence paths");
assert(compactDescriptorSurfaces.includes("Decision: COMPLETE"), "descriptor status/widget/flowchart surfaces preserve public COMPLETE decision context");

const promptSecretRunId = "autoimprove-" + "api" + "KeyPromptRun";
const promptSecretLoopId = "loop-" + "cookie" + "PromptLoop";
const promptSecretRootRunId = "autoimprove-" + "authorization" + "PromptRoot";
const promptSecretPreviousRunId = "autoimprove-" + "private" + "KeyPromptPrevious";
const promptSecretNextRunId = "autoimprove-" + "token" + "PromptNext";
const promptSecretWarningCamelKey = "api" + "KeyPromptWarning";
const promptSecretWarningPath = [".orchestration", "prompt-warning", "api_" + "key-prompt-warning.md"].join("/");
const promptSecretWarningContinuationCamelKey = "private" + "KeyPromptWarningContinuation";
const promptSecretWarningContinuationPath = [".orchestration", "prompt-warning", "private_" + "key-prompt-warning-continuation.md"].join("/");
const promptAbsoluteWarningContinuationPath = ["/home", "fixture", "project", "prompt-warning-continuation.md"].join("/");
const promptSessionContinuationArtifact = ["/home", "fixture", ".pi", "agent", "sessions", "prompt-reporting", "continuation-context.md"].join("/");
const promptSecretArtifactContinuationCamelKey = "token" + "PromptArtifactContinuation";
const promptSecretArtifactContinuationPath = ["/home", "fixture", ".pi", "agent", "sessions", "prompt-reporting", "token-artifact-continuation.md"].join("/");
const promptPublicGeneratedRunPath = descriptorPublicGeneratedRunPath;
const promptPublicTerminalEvidencePath = descriptorPublicTerminalEvidencePath;
const promptMultilineWarning = [
  `lineage warning references ${promptSecretWarningCamelKey} at ${promptSecretWarningPath}`,
  `continuation warning references ${promptSecretWarningContinuationCamelKey} at ${promptSecretWarningContinuationPath}`,
  `continuation warning references absolute evidence ${promptAbsoluteWarningContinuationPath}`,
  `continuation warning references public evidence ${promptPublicTerminalEvidencePath}`,
  "Decision: COMPLETE",
].join("\n");
const promptMultilineContinuationArtifact = [
  promptSessionContinuationArtifact,
  `artifact continuation references ${promptSecretArtifactContinuationCamelKey} at ${promptSecretArtifactContinuationPath}`,
  `artifact continuation references public evidence ${promptPublicTerminalEvidencePath}`,
  "Decision: COMPLETE",
].join("\n");
const promptSecretReportingPattern = /api[_\s-]*key|private[_\s-]*key|authorization|cookie|token/i;
const promptSecretLoopContextPattern = /api[_\s-]*key|private[_\s-]*key|authorization|cookie|token|\/home\/fixture|\/sessions\//i;
const promptSecretLoop = {
  loopId: promptSecretLoopId,
  rootRunId: promptSecretRootRunId,
  iteration: 2,
  objective: "Validate presentation-only ready prompt reporting id redaction.",
  previousRunId: promptSecretPreviousRunId,
  nextRunId: promptSecretNextRunId,
  oracleRequired: false,
  lineageSource: "created" as const,
  lineageWarnings: [
    promptMultilineWarning,
    `lineage warning references public evidence ${promptPublicTerminalEvidencePath}`,
  ],
  continuationContextArtifact: promptMultilineContinuationArtifact,
};
const promptReportingTask: TaskNode = {
  id: "prompt-reporting-task",
  kind: "IMPLEMENT",
  title: "Prompt reporting id display fixture",
  description: `Validate prompt display redaction while preserving ${promptPublicTerminalEvidencePath}.\nDecision: COMPLETE context remains public.`,
  status: "pending",
  priority: "A",
  blockedBy: [],
  blocks: [],
  runner: descriptorRunner,
  subagent: { type: "implementer", context: "fresh" },
  attempts: [],
  artifacts: [],
  metadata: {
    source: "prompt-reporting-validation",
    nodeDescriptor: {
      version: 1,
      stableKey: "prompt-reporting-display",
      purpose: "Validate ready prompt reporting-id presentation redaction.",
      inputs: ["secret-shaped reporting ids", "public terminal evidence context"],
      outputs: ["sanitized ready prompt presentation"],
      artifacts: [promptPublicTerminalEvidencePath],
      acceptanceChecks: ["Ready/TUI prompt surfaces redact secret-shaped run and loop ids"],
      writeScope: [promptPublicGeneratedRunPath],
      isolationBoundary: ["Presentation-only; raw scheduler prompt semantics stay unchanged"],
      order: 1,
    },
  },
  createdAt: "2025-01-01T00:12:00.000Z",
  updatedAt: "2025-01-01T00:12:00.000Z",
};
const promptReportingRun: TaskGraphRun = {
  schemaVersion: 1,
  runId: promptSecretRunId,
  cwd,
  createdAt: "2025-01-01T00:12:00.000Z",
  updatedAt: "2025-01-01T00:12:00.000Z",
  mode: "autoimprove",
  status: "pending",
  rootTaskIds: [promptReportingTask.id],
  tasks: { [promptReportingTask.id]: promptReportingTask },
  edges: [],
  locks: { held: {} },
  config: { maxParallel: 1, commitEnabled: false, pushEnabled: false, strict: false, continuous: false, mutateOrg: false, autoimproveLoop: promptSecretLoop },
  deferredCommits: [],
  gitBaseline: { dirtyAtStart: [] },
  metadata: { autoimproveLoop: promptSecretLoop },
};
const rawPromptReportingPrompt = buildTaskPrompt(promptReportingRun, promptReportingTask);
assert(rawPromptReportingPrompt.includes(promptSecretRunId), "raw buildTaskPrompt keeps the top-level run id before presentation sanitization");
assert(rawPromptReportingPrompt.includes(promptSecretLoopId), "raw buildTaskPrompt keeps loop id before presentation sanitization");
assert(rawPromptReportingPrompt.includes(promptSecretRootRunId), "raw buildTaskPrompt keeps root run id before presentation sanitization");
assert(rawPromptReportingPrompt.includes(promptSecretPreviousRunId), "raw buildTaskPrompt keeps previous run id before presentation sanitization");
assert(rawPromptReportingPrompt.includes(promptSecretNextRunId), "raw buildTaskPrompt keeps next run id before presentation sanitization");
assert(rawPromptReportingPrompt.includes(promptSecretWarningCamelKey), "raw buildTaskPrompt keeps lineage warning text before presentation sanitization");
assert(rawPromptReportingPrompt.includes(promptSecretWarningPath), "raw buildTaskPrompt keeps lineage warning paths before presentation sanitization");
assert(rawPromptReportingPrompt.includes(promptSecretWarningContinuationCamelKey), "raw buildTaskPrompt keeps multiline lineage warning continuation text before presentation sanitization");
assert(rawPromptReportingPrompt.includes(promptSecretWarningContinuationPath), "raw buildTaskPrompt keeps multiline lineage warning continuation paths before presentation sanitization");
assert(rawPromptReportingPrompt.includes(promptAbsoluteWarningContinuationPath), "raw buildTaskPrompt keeps multiline lineage warning absolute paths before presentation sanitization");
assert(rawPromptReportingPrompt.includes(promptSessionContinuationArtifact), "raw buildTaskPrompt keeps continuation artifact paths before presentation sanitization");
assert(rawPromptReportingPrompt.includes(promptSecretArtifactContinuationCamelKey), "raw buildTaskPrompt keeps multiline continuation artifact text before presentation sanitization");
assert(rawPromptReportingPrompt.includes(promptSecretArtifactContinuationPath), "raw buildTaskPrompt keeps multiline continuation artifact paths before presentation sanitization");
const promptReportingReadyInstructions = renderReadyInstructions(promptReportingRun);
for (const label of ["Run", "Loop id", "Root run", "Previous run", "Next run"]) {
  assert(promptReportingReadyInstructions.includes(`${label}: ${REDACTED_LINEAGE_RUN_ID}`), `ready instructions should redact ${label} prompt id lines`);
}
assert(!promptReportingReadyInstructions.includes(promptSecretWarningContinuationCamelKey), "ready instructions should redact multiline lineage warning continuation fragments");
assert(!promptReportingReadyInstructions.includes(promptSecretWarningContinuationPath), "ready instructions should redact multiline lineage warning continuation paths");
assert(!promptReportingReadyInstructions.includes(promptAbsoluteWarningContinuationPath), "ready instructions should redact multiline lineage warning absolute paths");
assert(!promptReportingReadyInstructions.includes(promptSecretArtifactContinuationCamelKey), "ready instructions should redact multiline continuation artifact fragments");
assert(!promptReportingReadyInstructions.includes(promptSecretArtifactContinuationPath), "ready instructions should redact multiline continuation artifact paths");
assert.doesNotMatch(promptReportingReadyInstructions, promptSecretLoopContextPattern, "ready instructions must not expose secret-shaped autoimprove loop context or session paths");
assert(promptReportingReadyInstructions.includes(REDACTED_LINEAGE_WARNING) || promptReportingReadyInstructions.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "ready instructions should include a loop warning redaction placeholder");
assert(promptReportingReadyInstructions.includes("[redacted-session-path]"), "ready instructions should redact continuation artifact session paths");
assert(promptReportingReadyInstructions.includes(promptPublicGeneratedRunPath), "ready instructions should preserve public generated run paths");
assert(promptReportingReadyInstructions.includes(promptPublicTerminalEvidencePath), "ready instructions should preserve public terminal evidence paths");
assert(promptReportingReadyInstructions.includes("Decision: COMPLETE"), "ready instructions should preserve public decision context");
const promptReportingRawReadyTasks = readyTasks(promptReportingRun);
assert(JSON.stringify(promptReportingRawReadyTasks).includes(promptSecretRunId), "raw ready scheduler entries retain worker prompt run id before response-details sanitization");
const promptReportingNextDetails = taskGraphNextResponseDetails(promptReportingRun, promptReportingRawReadyTasks);
const promptReportingNextDetailsJson = JSON.stringify(promptReportingNextDetails);
assert.equal(promptReportingNextDetails.runId, REDACTED_LINEAGE_RUN_ID, "task_graph_next response details redact secret-shaped top-level run ids");
assert.doesNotMatch(promptReportingNextDetailsJson, promptSecretReportingPattern, "task_graph_next response details must not expose secret-shaped worker prompt reporting ids");
assert.equal((promptReportingNextDetails.ready[0] as { promptSummary?: { omitted?: boolean } } | undefined)?.promptSummary?.omitted, true, "task_graph_next response details continue to omit raw prompts");
saveRun(promptReportingRun);
const promptSecretRunFile = path.join(cwd, ".pi", "dev-suite", "task-graph", "runs", `${promptReportingRun.runId}.json`);
const promptSecretRunHashBefore = fileSha256(promptSecretRunFile);
const promptReportingRenderCalls: Array<boolean | undefined> = [];
const promptReportingFakeTui = { requestRender: (force?: boolean) => promptReportingRenderCalls.push(force), terminal: { rows: 200, columns: 220 } };
const promptReportingComponent = new TaskGraphComponent(lockFakeCtx as never, promptReportingFakeTui, () => {}, () => {});
promptReportingComponent.handleInput?.("p");
const promptReportingTuiPrompt = promptReportingComponent.render(220).join("\n");
for (const label of ["Run", "Loop id", "Root run", "Previous run", "Next run"]) {
  assert(promptReportingTuiPrompt.includes(`${label}: ${REDACTED_LINEAGE_RUN_ID}`), `TUI prompt panel should redact ${label} prompt id lines`);
}
assert(!promptReportingTuiPrompt.includes(promptSecretWarningContinuationCamelKey), "TUI prompt panel should redact multiline lineage warning continuation fragments");
assert(!promptReportingTuiPrompt.includes(promptSecretWarningContinuationPath), "TUI prompt panel should redact multiline lineage warning continuation paths");
assert(!promptReportingTuiPrompt.includes(promptAbsoluteWarningContinuationPath), "TUI prompt panel should redact multiline lineage warning absolute paths");
assert(!promptReportingTuiPrompt.includes(promptSecretArtifactContinuationCamelKey), "TUI prompt panel should redact multiline continuation artifact fragments");
assert(!promptReportingTuiPrompt.includes(promptSecretArtifactContinuationPath), "TUI prompt panel should redact multiline continuation artifact paths");
assert.doesNotMatch(promptReportingTuiPrompt, promptSecretLoopContextPattern, "TUI prompt panel must not expose secret-shaped autoimprove loop context or session paths");
assert(promptReportingTuiPrompt.includes(REDACTED_LINEAGE_WARNING) || promptReportingTuiPrompt.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "TUI prompt panel should include a loop warning redaction placeholder");
assert(promptReportingTuiPrompt.includes("[redacted-session-path]"), "TUI prompt panel should redact continuation artifact session paths");
assert(promptReportingTuiPrompt.includes(promptPublicTerminalEvidencePath), "TUI prompt panel should preserve public terminal evidence paths");
assert(promptReportingTuiPrompt.includes("Decision: COMPLETE"), "TUI prompt panel should preserve public decision context");
assert.equal(fileSha256(promptSecretRunFile), promptSecretRunHashBefore, "TUI prompt rendering secret-shaped reporting ids and autoimprove loop context must not rewrite the persisted run file");

const promptPreludePublicTaskId = "implement-mpxep821-1pw8zp";
const promptPreludePublicTitle = "Prompt prelude public generated id fixture";
const promptPreludePublicTask: TaskNode = {
  id: promptPreludePublicTaskId,
  kind: "IMPLEMENT",
  title: promptPreludePublicTitle,
  description: `Validate public task prelude display while preserving ${promptPublicTerminalEvidencePath}.\nDecision: COMPLETE context remains public.`,
  status: "pending",
  priority: "A",
  blockedBy: [],
  blocks: [],
  runner: descriptorRunner,
  subagent: { type: "implementer", context: "fresh" },
  attempts: [],
  artifacts: [],
  metadata: {
    source: "prompt-prelude-public-validation",
    nodeDescriptor: {
      version: 1,
      stableKey: "prompt-prelude-public-display",
      purpose: "Validate public ready prompt task prelude presentation.",
      inputs: ["public generated task id", "public title"],
      outputs: ["public prompt prelude remains readable"],
      artifacts: [promptPublicTerminalEvidencePath],
      acceptanceChecks: ["Ready prompt surfaces preserve public generated task ids"],
      writeScope: [promptPublicGeneratedRunPath],
      isolationBoundary: ["Presentation-only; raw scheduler prompt semantics stay unchanged"],
      order: 1,
    },
  },
  createdAt: "2025-01-01T00:13:00.000Z",
  updatedAt: "2025-01-01T00:13:00.000Z",
};
const promptPreludePublicRun: TaskGraphRun = {
  schemaVersion: 1,
  runId: "prompt-prelude-public-run",
  cwd,
  createdAt: "2025-01-01T00:13:00.000Z",
  updatedAt: "2025-01-01T00:13:00.000Z",
  mode: "custom",
  status: "pending",
  rootTaskIds: [promptPreludePublicTask.id],
  tasks: { [promptPreludePublicTask.id]: promptPreludePublicTask },
  edges: [],
  locks: { held: {} },
  config: { maxParallel: 1, commitEnabled: false, pushEnabled: false, strict: false, continuous: false, mutateOrg: false },
  deferredCommits: [],
  gitBaseline: { dirtyAtStart: [] },
  metadata: {},
};
const promptPreludePublicRawPrompt = buildTaskPrompt(promptPreludePublicRun, promptPreludePublicTask);
assert(promptPreludePublicRawPrompt.includes(`Task: ${promptPreludePublicTaskId}`), "raw buildTaskPrompt keeps public task ids before presentation sanitization");
assert(promptPreludePublicRawPrompt.includes(`Title: ${promptPreludePublicTitle}`), "raw buildTaskPrompt keeps public task titles before presentation sanitization");
const promptPreludePublicReadyInstructions = renderReadyInstructions(promptPreludePublicRun);
assert(promptPreludePublicReadyInstructions.includes(`## ${promptPreludePublicTaskId} — ${promptPreludePublicTitle}`), "ready instructions should preserve public generated task ids and titles in headings");
assert(promptPreludePublicReadyInstructions.includes(`Task: ${promptPreludePublicTaskId}`), "ready instructions should preserve public generated task ids in prompt preludes");
assert(promptPreludePublicReadyInstructions.includes(`Title: ${promptPreludePublicTitle}`), "ready instructions should preserve public titles in prompt preludes");
assert(promptPreludePublicReadyInstructions.includes(promptPublicGeneratedRunPath), "ready instructions should preserve public generated run paths for public prelude fixtures");
assert(promptPreludePublicReadyInstructions.includes(promptPublicTerminalEvidencePath), "ready instructions should preserve public terminal evidence paths for public prelude fixtures");
assert(promptPreludePublicReadyInstructions.includes("Decision: COMPLETE"), "ready instructions should preserve public decision context for public prelude fixtures");

const promptPreludeSecretTaskMarker = "api" + "KeyPromptPreludeTask";
const promptPreludeSecretTitleMarker = "private" + "KeyPromptPreludeTitle";
const promptPreludeSecretTaskId = `implement-${promptPreludeSecretTaskMarker}`;
const promptPreludeSecretTask: TaskNode = {
  id: promptPreludeSecretTaskId,
  kind: "IMPLEMENT",
  title: `Prompt prelude ${promptPreludeSecretTitleMarker} fixture`,
  description: `Validate secret-shaped task prelude display while preserving ${promptPublicTerminalEvidencePath}.\nDecision: COMPLETE context remains public.`,
  status: "pending",
  priority: "A",
  blockedBy: [],
  blocks: [],
  runner: descriptorRunner,
  subagent: { type: "implementer", context: "fresh" },
  attempts: [],
  artifacts: [],
  metadata: {
    source: "prompt-prelude-secret-validation",
    nodeDescriptor: {
      version: 1,
      stableKey: "prompt-prelude-secret-display",
      purpose: "Validate presentation-only redaction for secret-shaped task prelude values.",
      inputs: ["secret-shaped task id", "secret-shaped title marker"],
      outputs: ["sanitized ready prompt presentation"],
      artifacts: [promptPublicTerminalEvidencePath],
      acceptanceChecks: ["Ready and TUI prompt surfaces redact secret-shaped task prelude values"],
      writeScope: [promptPublicGeneratedRunPath],
      isolationBoundary: ["Presentation-only; raw scheduler prompt semantics stay unchanged"],
      order: 1,
    },
  },
  createdAt: "2025-01-01T00:14:00.000Z",
  updatedAt: "2025-01-01T00:14:00.000Z",
};
const promptPreludeSecretRun: TaskGraphRun = {
  schemaVersion: 1,
  runId: "prompt-prelude-display-run",
  cwd,
  createdAt: "2025-01-01T00:14:00.000Z",
  updatedAt: "2025-01-01T00:14:00.000Z",
  mode: "custom",
  status: "pending",
  rootTaskIds: [promptPreludeSecretTask.id],
  tasks: { [promptPreludeSecretTask.id]: promptPreludeSecretTask },
  edges: [],
  locks: { held: {} },
  config: { maxParallel: 1, commitEnabled: false, pushEnabled: false, strict: false, continuous: false, mutateOrg: false },
  deferredCommits: [],
  gitBaseline: { dirtyAtStart: [] },
  metadata: {},
};
const promptPreludeSecretRawPrompt = buildTaskPrompt(promptPreludeSecretRun, promptPreludeSecretTask);
assert.equal(promptPreludeSecretRawPrompt.includes(promptPreludeSecretTaskId), true, "raw buildTaskPrompt keeps secret-shaped task ids before presentation sanitization");
assert.equal(promptPreludeSecretRawPrompt.includes(promptPreludeSecretTitleMarker), true, "raw buildTaskPrompt keeps secret-shaped task titles before presentation sanitization");
const promptPreludeSecretReadyInstructions = renderReadyInstructions(promptPreludeSecretRun);
assert.equal(promptPreludeSecretReadyInstructions.includes(promptPreludeSecretTaskId), false, "ready instructions should redact secret-shaped task ids in headings and prompt preludes");
assert.equal(promptPreludeSecretReadyInstructions.includes(promptPreludeSecretTitleMarker), false, "ready instructions should redact secret-shaped task title markers in headings and prompt preludes");
assert(promptPreludeSecretReadyInstructions.includes(REDACTED_LINEAGE_RUN_ID), "ready instructions should include a task-id redaction placeholder for secret-shaped task ids");
assert(promptPreludeSecretReadyInstructions.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "ready instructions should include a title redaction placeholder for secret-shaped task titles");
assert(promptPreludeSecretReadyInstructions.includes("Run: prompt-prelude-display-run"), "ready instructions should preserve public worker prompt run ids for secret prelude fixtures");
assert(promptPreludeSecretReadyInstructions.includes(promptPublicGeneratedRunPath), "ready instructions should preserve public generated run paths for secret prelude fixtures");
assert(promptPreludeSecretReadyInstructions.includes(promptPublicTerminalEvidencePath), "ready instructions should preserve public terminal evidence paths for secret prelude fixtures");
assert(promptPreludeSecretReadyInstructions.includes("Decision: COMPLETE"), "ready instructions should preserve public decision context for secret prelude fixtures");
saveRun(promptPreludeSecretRun);
const promptPreludeSecretRenderCalls: Array<boolean | undefined> = [];
const promptPreludeSecretFakeTui = { requestRender: (force?: boolean) => promptPreludeSecretRenderCalls.push(force), terminal: { rows: 200, columns: 220 } };
const promptPreludeSecretComponent = new TaskGraphComponent(lockFakeCtx as never, promptPreludeSecretFakeTui, () => {}, () => {});
promptPreludeSecretComponent.handleInput?.("p");
const promptPreludeSecretTuiPrompt = promptPreludeSecretComponent.render(220).join("\n");
assert.equal(promptPreludeSecretTuiPrompt.includes(promptPreludeSecretTaskId), false, "TUI prompt panel should redact secret-shaped task ids in headings and prompt preludes");
assert.equal(promptPreludeSecretTuiPrompt.includes(promptPreludeSecretTitleMarker), false, "TUI prompt panel should redact secret-shaped task title markers in prompt preludes");
assert(promptPreludeSecretTuiPrompt.includes(REDACTED_LINEAGE_RUN_ID), "TUI prompt panel should include a task-id redaction placeholder for secret-shaped task ids");
assert(promptPreludeSecretTuiPrompt.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "TUI prompt panel should include a title redaction placeholder for secret-shaped task titles");
assert(promptPreludeSecretTuiPrompt.includes("Run: prompt-prelude-display-run"), "TUI prompt panel should preserve public worker prompt run ids for secret prelude fixtures");
assert(promptPreludeSecretTuiPrompt.includes(promptPublicTerminalEvidencePath), "TUI prompt panel should preserve public terminal evidence paths for secret prelude fixtures");
assert(promptPreludeSecretTuiPrompt.includes("Decision: COMPLETE"), "TUI prompt panel should preserve public decision context for secret prelude fixtures");

const promptPreludePublicShortTaskId = promptPreludePublicTaskId.replace(/^([a-z]+)-/, "$1:").slice(0, 18);
assert(renderStatus(promptPreludePublicRun).includes(promptPreludePublicShortTaskId), "status should preserve public generated task ids in shortened task rows");
assert(renderTaskGraphWidget(promptPreludePublicRun).join("\n").includes(promptPreludePublicShortTaskId), "widget should preserve public generated task ids in shortened current rows");

const displaySecretTaskIdMarker = "api" + "KeyDisplaySurfaceMarker";
const displaySecretTitleMarker = "private" + "KeyDisplaySurfaceTitle";
const displaySecretPrereqId = `plan-${displaySecretTaskIdMarker}-prereq`;
const displaySecretMainId = `implement-${displaySecretTaskIdMarker}-main`;
const displaySecretShortFragments = [displaySecretPrereqId, displaySecretMainId].map((id) => id.replace(/^([a-z]+)-/, "$1:").slice(0, 18));
const displaySecretRunner: RunnerSpec = {
  kind: "subagent",
  name: "display-surface-validator",
  sideEffects: "read",
  writePolicy: { declaredPaths: [], allowOutsideDeclaredPaths: true },
};
const displaySecretTask = (id: string, title: string, blockedBy: string[], createdSecond: string, kind: TaskKind = "IMPLEMENT"): TaskNode => ({
  id,
  kind,
  title,
  description: `Validate display redaction for ${title}.`,
  status: "pending",
  priority: "A",
  blockedBy: [...blockedBy],
  blocks: [],
  runner: displaySecretRunner,
  subagent: { type: "implementer", context: "fresh" },
  attempts: [],
  artifacts: [],
  metadata: { source: "task-id-display-validation" },
  createdAt: `2025-01-01T00:15:${createdSecond}.000Z`,
  updatedAt: `2025-01-01T00:15:${createdSecond}.000Z`,
});
const displaySecretPrereq = displaySecretTask(displaySecretPrereqId, `Prepare ${displaySecretTitleMarker} prerequisite`, [], "00", "PLAN");
const displaySecretMain = displaySecretTask(displaySecretMainId, `Implement ${displaySecretTitleMarker} display recovery`, [displaySecretPrereqId], "01");
displaySecretPrereq.blocks = [displaySecretMainId];
const displaySecretRun: TaskGraphRun = {
  schemaVersion: 1,
  runId: "task-id-display-redaction-run",
  cwd,
  createdAt: "2025-01-01T00:15:00.000Z",
  updatedAt: "2025-01-01T00:15:01.000Z",
  mode: "custom",
  status: "pending",
  rootTaskIds: [displaySecretPrereqId, displaySecretMainId],
  tasks: {
    [displaySecretPrereqId]: displaySecretPrereq,
    [displaySecretMainId]: displaySecretMain,
  },
  edges: [{ from: displaySecretPrereqId, to: displaySecretMainId, type: "depends_on", reason: "display redaction dependency" }],
  locks: { held: {} },
  config: { maxParallel: 2, commitEnabled: false, pushEnabled: false, strict: false, continuous: false, mutateOrg: false },
  deferredCommits: [],
  gitBaseline: { dirtyAtStart: [] },
  metadata: {},
};
assert.equal(readyTasks(displaySecretRun).some((task) => task.id === displaySecretPrereqId), true, "raw scheduler readiness should continue to use raw task ids");
assert.equal(displaySecretRun.tasks[displaySecretMainId]?.blockedBy[0] === displaySecretPrereqId, true, "raw dependency arrays should remain unchanged internally");
const displaySecretViewModel = buildTaskGraphViewModel(displaySecretRun, { mode: "work-list" });
assert.equal(displaySecretViewModel.readyNodes.some((node) => node.id === displaySecretPrereqId), true, "view-model selection ids remain raw for lookup semantics");
assert.equal(displaySecretViewModel.blockedNodes.some((node) => node.blockedBy.includes(displaySecretPrereqId)), true, "view-model blockedBy remains raw for dependency semantics");
for (const node of [...displaySecretViewModel.readyNodes, ...displaySecretViewModel.blockedNodes]) {
  assert.equal(node.shortId.includes(displaySecretTaskIdMarker), false, "view-model shortId should redact secret-shaped task id markers before shortening");
  for (const fragment of displaySecretShortFragments) assert.equal(node.shortId.includes(fragment), false, "view-model shortId should not expose raw shortened task id fragments");
}
function assertNoSecretTaskDisplayFragments(output: string, label: string) {
  assert.equal(output.includes(displaySecretTaskIdMarker), false, `${label} should not expose full secret-shaped task id markers`);
  assert.equal(output.includes(displaySecretTitleMarker), false, `${label} should not expose full secret-shaped title markers`);
  assert.equal(output.includes(displaySecretPrereqId), false, `${label} should not expose raw prerequisite task ids`);
  assert.equal(output.includes(displaySecretMainId), false, `${label} should not expose raw dependent task ids`);
  for (const fragment of displaySecretShortFragments) assert.equal(output.includes(fragment), false, `${label} should not expose shortened raw task id fragments`);
  assert.equal(/api\s*KeyDisplaySurface|private\s*KeyDisplaySurface/i.test(output), false, `${label} should not expose camelCase secret-shaped task marker fragments`);
}
const displaySecretStatus = renderStatus(displaySecretRun, { expanded: true });
assertNoSecretTaskDisplayFragments(displaySecretStatus, "status output");
assert(displaySecretStatus.includes(REDACTED_LINEAGE_RUN_ID), "status output should include a task-id redaction placeholder");
assert(displaySecretStatus.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "status output should include a title redaction placeholder");
const displaySecretWidget = renderTaskGraphWidget(displaySecretRun).join("\n");
assertNoSecretTaskDisplayFragments(displaySecretWidget, "widget output");
assert(displaySecretWidget.includes(REDACTED_LINEAGE_RUN_ID), "widget output should include a task-id redaction placeholder");
assert(displaySecretWidget.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "widget output should include a title redaction placeholder");
const displaySecretAsciiFlowchart = renderTaskGraphFlowchart(displaySecretRun, { format: "ascii", includeDone: true, maxLabelLength: 80 });
assertNoSecretTaskDisplayFragments(displaySecretAsciiFlowchart, "ASCII flowchart");
assert(displaySecretAsciiFlowchart.includes(REDACTED_SECRETISH_EVIDENCE_PATH.replace(/[\[\]]/g, "")), "ASCII flowchart should include a sanitized title placeholder");
const displaySecretMermaidFlowchart = renderTaskGraphFlowchart(displaySecretRun, { format: "mermaid", includeDone: true, maxLabelLength: 80 });
assertNoSecretTaskDisplayFragments(displaySecretMermaidFlowchart, "Mermaid flowchart");
const displaySecretMermaidNodeIds = [...displaySecretMermaidFlowchart.matchAll(/^\s+([A-Za-z][A-Za-z0-9_]*)\["/gm)].map((match) => match[1]!);
assert(displaySecretMermaidNodeIds.length >= 2, "Mermaid flowchart should render task nodes for the display redaction fixture");
assert.equal(new Set(displaySecretMermaidNodeIds).size, displaySecretMermaidNodeIds.length, "Mermaid flowchart should use unique non-secret aliases for redacted task ids");
assert.equal(displaySecretMermaidNodeIds.some((id) => /api|private|redacted/i.test(id)), false, "Mermaid node identifiers should not be derived from secret-shaped or redaction-placeholder task ids");
assert.equal(readyTasks(displaySecretRun).some((task) => task.id === displaySecretPrereqId), true, "rendering should not alter raw scheduler readiness");
saveRun(displaySecretRun);
const displaySecretRenderCalls: Array<boolean | undefined> = [];
const displaySecretFakeTui = { requestRender: (force?: boolean) => displaySecretRenderCalls.push(force), terminal: { rows: 120, columns: 220 } };
const displaySecretComponent = new TaskGraphComponent(lockFakeCtx as never, displaySecretFakeTui, () => {}, () => {});
const displaySecretTuiListAndSummary = displaySecretComponent.render(220).join("\n");
displaySecretComponent.handleInput?.("j");
const displaySecretTuiBlockedSummary = displaySecretComponent.render(220).join("\n");
displaySecretComponent.handleInput?.("i");
const displaySecretTuiDetails = displaySecretComponent.render(220).join("\n");
const displaySecretPromptComponent = new TaskGraphComponent(lockFakeCtx as never, displaySecretFakeTui, () => {}, () => {});
displaySecretPromptComponent.handleInput?.("p");
const displaySecretTuiPrompt = displaySecretPromptComponent.render(220).join("\n");
for (const [label, output] of [
  ["TUI list and selected summary", displaySecretTuiListAndSummary],
  ["TUI blocked task summary", displaySecretTuiBlockedSummary],
  ["TUI details panel", displaySecretTuiDetails],
  ["TUI prompt panel", displaySecretTuiPrompt],
] as const) {
  assertNoSecretTaskDisplayFragments(output, label);
}
assert(displaySecretTuiPrompt.includes(REDACTED_LINEAGE_RUN_ID), "TUI prompt panel should include a task-id redaction placeholder");
assert(displaySecretTuiPrompt.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "TUI prompt panel should include a title redaction placeholder");

const loop = {
  loopId: "loop-1",
  rootRunId: "root-1",
  iteration: 5,
  objective: "Improve task graph UI flow.",
  previousRunId: "prev-1",
  oracleRequired: true,
  lineageSource: "explicit-legacy-adoption" as const,
  lineageWarnings: [
    "previous run had no autoimproveLoop metadata; explicit lineage adoption was used",
    "lineageAdoption overrode existing autoimproveLoop metadata (rootRunId mismatch); previous run metadata was not rewritten",
  ],
};
run.metadata = { ...(run.metadata ?? {}), autoimproveLoop: loop };
run.config.autoimproveLoop = loop;
const warningModel = buildTaskGraphViewModel(run, { mode: "work-list" });
assert.deepEqual(warningModel.actionableWarnings.map((warning) => warning.message), [loop.lineageWarnings[1]], "expected adoption lineage warnings are filtered, unsafe overrides remain actionable");
const warningStatus = renderStatus(run);
assert.doesNotMatch(warningStatus, /explicit lineage adoption was used/i, "status filters expected adoption warning noise");
assert.match(warningStatus, /overrode existing autoimproveLoop metadata/i, "status keeps actionable lineage warnings");
const warningPrompt = buildTaskPrompt(run, firstTask!);
assert.doesNotMatch(warningPrompt, /explicit lineage adoption was used/i, "ready prompts filter expected adoption warning noise");
assert.match(warningPrompt, /overrode existing autoimproveLoop metadata/i, "ready prompts keep actionable lineage warnings");

const uiSecretWarningCamelKey = "api" + "KeyUiWarning";
const uiSecretWarningPath = [".orchestration", "ui-warning", "api_" + "key-ui-warning.md"].join("/");
const uiPublicWarningPath = ".orchestration/public-ui-warning.md";
const secretWarningLoop = {
  ...loop,
  lineageWarnings: [
    `unsafe default references ${uiSecretWarningCamelKey} at ${uiSecretWarningPath}`,
    `lineage warning references public evidence ${uiPublicWarningPath}`,
  ],
};
run.metadata = { ...(run.metadata ?? {}), autoimproveLoop: secretWarningLoop };
run.config.autoimproveLoop = secretWarningLoop;

saveRun(run);
const persistedUiRunFile = path.join(cwd, ".pi", "dev-suite", "task-graph", "runs", `${run.runId}.json`);
const persistedUiRun = JSON.parse(fs.readFileSync(persistedUiRunFile, "utf8")) as TaskGraphRun;
persistedUiRun.status = "pending";
persistedUiRun.updatedAt = "2000-01-01T00:00:00.000Z";
fs.writeFileSync(persistedUiRunFile, `${JSON.stringify(persistedUiRun, null, 2)}\n`);
const persistedUiRunHashBefore = fileSha256(persistedUiRunFile);
const renderCalls: Array<boolean | undefined> = [];
const fakeTui = { requestRender: (force?: boolean) => renderCalls.push(force), terminal: { rows: 30, columns: 120 } };
const fakeCtx = { cwd, ui: { setStatus() {}, setWidget() {} } };
const component = new TaskGraphComponent(fakeCtx as never, fakeTui, () => {}, () => {});
const componentRender = component.render(120).join("\n");
assert(!componentRender.includes(uiSecretWarningPath), "TUI warning rendering should not include secret-shaped evidence paths verbatim");
assert.doesNotMatch(componentRender, /api[_\s-]*key|api\s*KeyUiWarning/i, "TUI warning rendering should not include secret-shaped warning fragments");
assert(componentRender.includes(uiPublicWarningPath), "TUI warning rendering should preserve normal public paths");
assert(componentRender.includes(REDACTED_LINEAGE_WARNING) || componentRender.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "TUI warning rendering should include a redaction placeholder");
renderCalls.length = 0;
component.handleInput?.("j");
component.handleInput?.("i");
component.handleInput?.("t");
component.handleInput?.("v");
component.handleInput?.("\u0012");
assert(!renderCalls.some((force) => force === true), "normal TUI actions should not force a full redraw");
assert.equal(fileSha256(persistedUiRunFile), persistedUiRunHashBefore, "TUI construction, render, and refresh must not rewrite the persisted run file");
assert(componentRender.includes(run.runId), "TUI rendering should preserve normal public top-level run ids");

const uiSecretReportingRunId = "autoimprove-" + "api" + "KeyUiRun";
const uiSecretReportingLoopId = "autoimprove-" + "cookie" + "UiLoop";
const uiSecretReportingRootRunId = "autoimprove-" + "authorization" + "UiRoot";
const uiSecretReportingPreviousRunId = "autoimprove-" + "private" + "KeyUiPrevious";
const uiSecretReportingPattern = /api[_\s-]*key|private[_\s-]*key|authorization|cookie/i;
const secretUiLoop = {
  ...loop,
  loopId: uiSecretReportingLoopId,
  rootRunId: uiSecretReportingRootRunId,
  previousRunId: uiSecretReportingPreviousRunId,
  lineageWarnings: [],
};
const secretUiRun = JSON.parse(JSON.stringify(run)) as TaskGraphRun;
secretUiRun.runId = uiSecretReportingRunId;
secretUiRun.metadata = { ...(secretUiRun.metadata ?? {}), autoimproveLoop: secretUiLoop };
secretUiRun.config = { ...secretUiRun.config, autoimproveLoop: secretUiLoop };
saveRun(secretUiRun);
const secretUiRunFile = path.join(cwd, ".pi", "dev-suite", "task-graph", "runs", `${secretUiRun.runId}.json`);
const secretUiRunHashBefore = fileSha256(secretUiRunFile);
const secretComponent = new TaskGraphComponent(fakeCtx as never, fakeTui, () => {}, () => {});
const secretHeaderRender = secretComponent.render(160).join("\n");
secretComponent.handleInput?.("i");
const secretDetailsRender = secretComponent.render(160).join("\n");
const secretTuiOutput = `${secretHeaderRender}\n${secretDetailsRender}`;
assert(secretTuiOutput.includes(REDACTED_LINEAGE_RUN_ID), "TUI header/details should show a run-id redaction placeholder for secret-shaped run and loop ids");
assert.doesNotMatch(secretTuiOutput, uiSecretReportingPattern, "TUI header/details must not render secret-shaped top-level, loop, root, or previous run ids");
assert.equal(fileSha256(secretUiRunFile), secretUiRunHashBefore, "secret-shaped TUI reporting render must not rewrite the persisted run file");

const uiSecretReportingFallbackLoopId = "autoimprove-" + "cookie" + "UiLoopFallback";
const uiSecretFallbackLoop = {
  ...loop,
  loopId: uiSecretReportingFallbackLoopId,
  rootRunId: undefined,
  previousRunId: uiSecretReportingPreviousRunId,
  lineageWarnings: [],
};
const secretFallbackUiRun = JSON.parse(JSON.stringify(run)) as TaskGraphRun;
secretFallbackUiRun.runId = uiSecretReportingRunId;
secretFallbackUiRun.metadata = { ...(secretFallbackUiRun.metadata ?? {}), autoimproveLoop: uiSecretFallbackLoop };
secretFallbackUiRun.config = { ...secretFallbackUiRun.config, autoimproveLoop: uiSecretFallbackLoop };
saveRun(secretFallbackUiRun);
const secretFallbackUiRunFile = path.join(cwd, ".pi", "dev-suite", "task-graph", "runs", `${secretFallbackUiRun.runId}.json`);
const secretFallbackUiRunHashBefore = fileSha256(secretFallbackUiRunFile);
const secretFallbackComponent = new TaskGraphComponent(fakeCtx as never, fakeTui, () => {}, () => {});
const secretFallbackTuiOutput = secretFallbackComponent.render(160).join("\n");
assert(secretFallbackTuiOutput.includes(REDACTED_LINEAGE_RUN_ID), "TUI header should redact secret-shaped fallback loop ids when rootRunId is absent");
assert.doesNotMatch(secretFallbackTuiOutput, uiSecretReportingPattern, "TUI header must not render secret-shaped fallback loop or previous run ids");
assert.equal(fileSha256(secretFallbackUiRunFile), secretFallbackUiRunHashBefore, "secret-shaped TUI fallback loop render must not rewrite the persisted run file");

console.log("task graph UI flow validation passed");
