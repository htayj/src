import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { renderStatus, renderTaskGraphWidget } from "./display";
import { renderTaskGraphFlowchart } from "./flowchart";
import * as taskGraphIndex from "./index";
import { lineageResponseSuffix, rootWorkResponseDetails, sanitizeContinueAutoImproveResponseDetails } from "./index";
import { deriveRootWorkLineageByActiveRunId, GENERIC_MARKDOWN_EVIDENCE_LABEL, REDACTED_LINEAGE_RUN_ID, REDACTED_LINEAGE_WARNING, REDACTED_SECRETISH_EVIDENCE_PATH, isCompactSecretishKeyIdentifier, resolveAutoImproveLineageStatus } from "./root-work-lineage";
import { renderRootWorkQueueStatus, rootWorkDisplayModel, type RootWorkDisplayModel } from "./root-work-queue";
import { formatTaskDetailArtifactList, formatTaskDetailChangedFilesList, rootWorkLines, sanitizeTaskMetadataForDetails } from "./ui";
import { buildTaskGraphViewModel } from "./view-model";
import type { AutoImproveLoopMetadata, RootWorkQueue, TaskGraphRun, TaskNode } from "./schema";

interface RootWorkLineageEvidenceFixture {
  readonly label: string;
  readonly path: string;
}

interface RootWorkLineageSuccessorFixture {
  readonly runId: string;
  readonly status: "running" | "succeeded" | "failed" | "cancelled";
  readonly decision?: "CONTINUE" | "COMPLETE";
  readonly evidence?: RootWorkLineageEvidenceFixture;
  readonly note?: string;
}

interface RootWorkLineageDisplayFixture {
  readonly rootWorkKey: string;
  readonly latestSuccessorRunId?: string;
  readonly successors: readonly RootWorkLineageSuccessorFixture[];
  readonly displayOnlyNote?: string;
}

interface FutureRootWorkLineageRenderOptions {
  readonly lineageByActiveRunId?: Record<string, RootWorkLineageDisplayFixture>;
}

const renderRootWorkQueueStatusWithLineage = renderRootWorkQueueStatus as (
  queue: RootWorkQueue | undefined,
  options?: FutureRootWorkLineageRenderOptions,
) => string;

const rootWorkDisplayModelWithLineage = rootWorkDisplayModel as (
  queue: RootWorkQueue | undefined,
  options?: FutureRootWorkLineageRenderOptions,
) => RootWorkDisplayModel;

const forbiddenSourceTokens = [
  "save" + "Run",
  "append" + "Event",
  "write" + "Artifact",
  "refresh" + "Run" + "Status",
  "update" + "Task",
  "complete" + "Active" + "Root" + "Work",
  "child_" + "process",
  "fet" + "ch",
  "browser" + "/" + "network",
] as const;

const validationSourcePath = process.argv.find((arg) => arg.endsWith("root-work-lineage.validation.ts"));
if (validationSourcePath) {
  const source = fs.readFileSync(validationSourcePath, "utf8");
  for (const token of forbiddenSourceTokens) {
    assert(!source.includes(token), `lineage validation fixture must not reference forbidden token ${token}`);
  }
}

function namedFunctionBody(source: string, functionName: string) {
  const signatureStart = source.indexOf(`function ${functionName}`);
  assert.notEqual(signatureStart, -1, `expected to find function ${functionName}`);
  const bodyStart = source.indexOf("{", signatureStart);
  assert.notEqual(bodyStart, -1, `expected to find function body for ${functionName}`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(bodyStart, index + 1);
    }
  }
  assert.fail(`expected to find complete function body for ${functionName}`);
}

const forbiddenFunctionBodyTokens = [
  "save" + "Run",
  "append" + "Event",
  "write" + "Artifact",
  "write" + "File",
  "refresh" + "Run" + "Status",
  "update" + "Task",
  "complete" + "Active" + "Root" + "Work",
  "child_" + "process",
  "fet" + "ch",
  "bro" + "wser",
  "net" + "work",
  "exec" + "File",
  "exec" + "Sync",
  "spawn" + "(",
  "process" + ".",
] as const;

const taskGraphSourceRoot = path.dirname(validationSourcePath ?? path.join(process.cwd(), "extensions", "task-graph", "root-work-lineage.validation.ts"));
const taskGraphIndexSource = fs.readFileSync(path.join(taskGraphSourceRoot, "index.ts"), "utf8");
const statusToolStart = taskGraphIndexSource.indexOf(`name: "task_graph_status"`);
const statusToolEnd = taskGraphIndexSource.indexOf(`name: "task_graph_list_runs"`, statusToolStart);
assert(statusToolStart >= 0 && statusToolEnd > statusToolStart, "expected to find the task graph status tool registration block");
const statusToolSource = taskGraphIndexSource.slice(statusToolStart, statusToolEnd);
for (const token of ["save" + "Run", "append" + "Event", "write" + "Artifact", "write" + "File", "refresh" + "Run" + "Status"] as const) {
  assert(!statusToolSource.includes(token), `task graph status reporting block must not reference mutating store/scheduler token ${token}`);
}

const flowchartCommandStart = taskGraphIndexSource.indexOf(`pi.registerCommand("task-flowchart"`);
const flowchartCommandEnd = taskGraphIndexSource.indexOf(`pi.registerCommand("task-graphs"`, flowchartCommandStart);
assert(flowchartCommandStart >= 0 && flowchartCommandEnd > flowchartCommandStart, "expected to find the task flowchart command registration block");
const flowchartToolStart = taskGraphIndexSource.indexOf(`name: "task_graph_flowchart"`);
const flowchartToolEnd = taskGraphIndexSource.indexOf(`name: "task_graph_status"`, flowchartToolStart);
assert(flowchartToolStart >= 0 && flowchartToolEnd > flowchartToolStart, "expected to find the task graph flowchart tool registration block");
for (const [label, source] of [
  ["task flowchart command", taskGraphIndexSource.slice(flowchartCommandStart, flowchartCommandEnd)],
  ["task graph flowchart tool", taskGraphIndexSource.slice(flowchartToolStart, flowchartToolEnd)],
] as const) {
  for (const token of ["save" + "Run", "append" + "Event", "write" + "Artifact", "write" + "File", "refresh" + "Run" + "Status"] as const) {
    assert(!source.includes(token), `${label} reporting block must not reference mutating store/scheduler token ${token}`);
  }
}

type TaskGraphStatusResponseDetailsOptions = { readonly cwd?: string };

type TaskGraphStatusExports = {
  statusRunSnapshot?: (run: TaskGraphRun) => TaskGraphRun;
  taskGraphStatusResponseDetails?: (run: TaskGraphRun, options?: TaskGraphStatusResponseDetailsOptions) => Record<string, unknown>;
};

function statusRunSnapshotFixture(run: TaskGraphRun) {
  const helper = (taskGraphIndex as unknown as TaskGraphStatusExports).statusRunSnapshot;
  assert.equal(typeof helper, "function", "status snapshot helper must be exported");
  return helper(run);
}

function taskGraphStatusResponseDetailsFixture(run: TaskGraphRun, options?: TaskGraphStatusResponseDetailsOptions) {
  const helper = (taskGraphIndex as unknown as TaskGraphStatusExports).taskGraphStatusResponseDetails;
  assert.equal(typeof helper, "function", "status response details helper must be exported");
  return helper(run, options);
}

function fileSha256(file: string) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

const warningAndSanitizerFunctionSources = [
  {
    file: path.join(taskGraphSourceRoot, "root-work-lineage.ts"),
    functions: ["appendWarning", "evidencePathForWarning", "isSecretishLineageEvidenceText"],
  },
  {
    file: path.join(taskGraphSourceRoot, "index.ts"),
    functions: ["lineageResponseSuffix", "responseDetailsStringContextForKey", "sanitizeRootWorkLineagePath", "redactSecretishEvidencePathFragments", "sanitizeRootWorkLineageWarning", "sanitizeRootWorkLineageString", "sanitizeRootWorkLineageValue", "rootWorkResponseDetails"],
  },
  {
    file: path.join(taskGraphSourceRoot, "ui.ts"),
    functions: ["sanitizeTaskMetadataForDetails", "sanitizeTaskDetailEvidenceText", "sanitizeTaskDetailMetadataValue", "formatTaskDetailArtifactList", "formatTaskDetailChangedFilesList"],
  },
  {
    file: path.join(taskGraphSourceRoot, "view-model.ts"),
    functions: ["cleanText", "displayNode"],
  },
] as const;
for (const fixture of warningAndSanitizerFunctionSources) {
  const source = fs.readFileSync(fixture.file, "utf8");
  for (const functionName of fixture.functions) {
    const body = namedFunctionBody(source, functionName);
    for (const token of forbiddenFunctionBodyTokens) {
      assert(!body.includes(token), `${functionName} body must not reference forbidden token ${token}`);
    }
  }
}
const lineageSource = fs.readFileSync(path.join(taskGraphSourceRoot, "root-work-lineage.ts"), "utf8");
assert(
  namedFunctionBody(lineageSource, "appendWarning").includes("sanitizeRootWorkLineageWarningForDisplay"),
  "lineage warning append path must use the path-aware lineage warning sanitizer before warnings enter response details",
);

const ROOT_WORK_KEY = "flowchart-decision-routing-preview";
const ACTIVE_RUN_ID = "autoimprove-mpu8pu38-164913";
const LATEST_SUCCESSOR_RUN_ID = "autoimprove-mpwin3qu-xyaihp";
const EVIDENCE_LABEL = "Evidence: terminal reconciliation report";
const EVIDENCE_PATH = ".orchestration/iteration-13-flowchart-terminal-reconciliation/terminal-reconciliation-report.md";
const COMPACT_KEY_PUBLIC_RUN_ID = "autoimprove-mpwly22k-t45qna";
const COMPACT_KEY_PUBLIC_TASK_ID = "implement-" + "mpxgw0u2-egsny4";
const COMPACT_SECRET_KEY_PREFIX = "api" + "key" + "rootwork";
const COMPACT_SECRET_KEY_SUFFIX = "rootwork" + "private" + "key";
const COMPACT_SECRET_KEY_TOKEN = "access" + "token" + "metadata";
assert.equal(isCompactSecretishKeyIdentifier(COMPACT_SECRET_KEY_PREFIX), true, "compact secret-shaped key identifiers with secret prefixes should be detected");
assert.equal(isCompactSecretishKeyIdentifier(COMPACT_SECRET_KEY_SUFFIX), true, "compact secret-shaped key identifiers with secret suffixes should be detected");
assert.equal(isCompactSecretishKeyIdentifier(COMPACT_SECRET_KEY_TOKEN), true, "compact token-shaped key identifiers should be detected when used as identifiers");
assert.equal(isCompactSecretishKeyIdentifier(COMPACT_KEY_PUBLIC_RUN_ID), false, "public generated run ids should not be compact-key redacted");
assert.equal(isCompactSecretishKeyIdentifier(COMPACT_KEY_PUBLIC_TASK_ID), false, "public generated task ids should not be compact-key redacted");
assert.equal(isCompactSecretishKeyIdentifier("tokenizer-public-stage"), false, "normal public tokenizer identifiers should not be compact-key redacted");
assert.equal(isCompactSecretishKeyIdentifier("cookiecutter-public-template"), false, "normal public cookiecutter identifiers should not be compact-key redacted");
assert.equal(isCompactSecretishKeyIdentifier(EVIDENCE_PATH), false, "public terminal reconciliation evidence paths should not be compact-key redacted");
assert.equal(isCompactSecretishKeyIdentifier("Decision: COMPLETE"), false, "public COMPLETE decision text should not be compact-key redacted");

const rootWorkQueue: RootWorkQueue = {
  version: 1,
  items: [
    {
      key: ROOT_WORK_KEY,
      kind: "custom-graph",
      state: "active",
      title: "Flowchart decision routing preview",
      purpose: "Preview flowchart decision routing lineage without completing durable root work.",
      input: { kind: "custom-graph", presetName: "future-flowchart-control-flow" },
      requestedBy: "user",
      originRunId: "autoimprove-root-work-origin",
      activeRunId: ACTIVE_RUN_ID,
      privacy: { sanitized: true },
    },
  ],
};

const lineageOptions: FutureRootWorkLineageRenderOptions = {
  lineageByActiveRunId: {
    [ACTIVE_RUN_ID]: {
      rootWorkKey: ROOT_WORK_KEY,
      latestSuccessorRunId: LATEST_SUCCESSOR_RUN_ID,
      successors: [
        {
          runId: LATEST_SUCCESSOR_RUN_ID,
          status: "succeeded",
          decision: "COMPLETE",
          evidence: { label: EVIDENCE_LABEL, path: EVIDENCE_PATH },
          note: "display-only: successor completed; durable root work remains ACTIVE until the queue resolver completes it.",
        },
      ],
      displayOnlyNote: "display-only: durable root work remains ACTIVE; lineage display is not root work reconciliation.",
    },
  },
};

const missingLineageOptions: FutureRootWorkLineageRenderOptions = { lineageByActiveRunId: {} };
const nonCompleteLineageOptions: FutureRootWorkLineageRenderOptions = {
  lineageByActiveRunId: {
    [ACTIVE_RUN_ID]: {
      rootWorkKey: ROOT_WORK_KEY,
      latestSuccessorRunId: "autoimprove-mpwin3qu-running",
      successors: [
        {
          runId: "autoimprove-mpwin3qu-running",
          status: "running",
          decision: "CONTINUE",
          note: "display-only: in-progress lineage must not reconcile durable root work.",
        },
      ],
      displayOnlyNote: "display-only: durable root work remains ACTIVE while successor lineage is incomplete.",
    },
  },
};

function assertNoCompletedClaim(rendered: string, message: string) {
  assert.doesNotMatch(rendered, /Decision:\s*COMPLETE\b/i, `${message}: missing or incomplete lineage must not show a COMPLETE decision`);
  assert.doesNotMatch(rendered, /\b(?:root work completed|root work reconciled|reconciled root work|lineage reconciled)\b/i, `${message}: missing or incomplete lineage must not claim completed/reconciled root work`);
}

// The first fixture is intentionally scoped to queue/model/render inputs and immutability.
// A later fixture below covers status/widget rendering through the derived read-only resolver.
const queueBeforeJson = JSON.stringify(rootWorkQueue);
const lineageOptionsBeforeJson = JSON.stringify(lineageOptions);
const missingLineageOptionsBeforeJson = JSON.stringify(missingLineageOptions);
const nonCompleteLineageOptionsBeforeJson = JSON.stringify(nonCompleteLineageOptions);

const displayModel = rootWorkDisplayModelWithLineage(rootWorkQueue, lineageOptions);
const displayModelCountsBeforeJson = JSON.stringify(displayModel.counts);
assert.deepEqual(displayModel.counts, {
  active: 1,
  queued: 0,
  queuedExecutable: 0,
  queuedNonExecutable: 0,
  created: 0,
  completed: 0,
  history: 0,
}, "fixture queue has one active root work item and no queued/history items");

const missingLineageRendered = renderRootWorkQueueStatusWithLineage(rootWorkQueue, missingLineageOptions);
assertNoCompletedClaim(missingLineageRendered, "missing lineage render");
const nonCompleteLineageRendered = renderRootWorkQueueStatusWithLineage(rootWorkQueue, nonCompleteLineageOptions);
assertNoCompletedClaim(nonCompleteLineageRendered, "non-complete lineage render");

const rendered = renderRootWorkQueueStatusWithLineage(rootWorkQueue, lineageOptions);
const displayModelAfter = rootWorkDisplayModelWithLineage(rootWorkQueue, lineageOptions);
assert.equal(JSON.stringify(rootWorkQueue), queueBeforeJson, "rendering lineage must not mutate the root work queue fixture");
assert.equal(JSON.stringify(lineageOptions), lineageOptionsBeforeJson, "rendering lineage must not mutate the COMPLETE lineage input fixture");
assert.equal(JSON.stringify(missingLineageOptions), missingLineageOptionsBeforeJson, "rendering lineage must not mutate the missing-lineage input fixture");
assert.equal(JSON.stringify(nonCompleteLineageOptions), nonCompleteLineageOptionsBeforeJson, "rendering lineage must not mutate the non-complete lineage input fixture");
assert.equal(JSON.stringify(displayModelAfter.counts), displayModelCountsBeforeJson, "rendering lineage must not change display model counts");

assert(rendered.includes(ACTIVE_RUN_ID), "rendered active root work should include the active run id");
assert(rendered.includes(LATEST_SUCCESSOR_RUN_ID), "rendered active root work lineage should include the latest successor run id");
assert(rendered.includes("Decision: COMPLETE"), "rendered active root work lineage should include the COMPLETE decision");
assert(rendered.includes(EVIDENCE_LABEL), "rendered active root work lineage should include the evidence label");
assert(rendered.includes(EVIDENCE_PATH), "rendered active root work lineage should include the evidence path");
assert.match(rendered, /display-only/i, "rendered active root work lineage should mark lineage as display-only");
assert.match(rendered, /durable root work remains ACTIVE/i, "rendered active root work lineage should state durable root work remains ACTIVE");

const secretHumanizedLineageOptions: FutureRootWorkLineageRenderOptions = {
  lineageByActiveRunId: {
    [ACTIVE_RUN_ID]: {
      rootWorkKey: ROOT_WORK_KEY,
      latestSuccessorRunId: "autoimprove-secret-humanized",
      successors: [
        {
          runId: "autoimprove-secret-humanized",
          status: "succeeded",
          decision: "COMPLETE",
          evidence: { label: "Evidence: api key=sk test", path: ".orchestration/api key=sk test.md" },
          note: "display-only: successor completed; durable root work remains ACTIVE until the queue resolver completes it.",
        },
      ],
      displayOnlyNote: "display-only: durable root work remains ACTIVE; lineage display is not root work reconciliation.",
    },
  },
};
const secretHumanizedRendered = renderRootWorkQueueStatusWithLineage(rootWorkQueue, secretHumanizedLineageOptions);
assert(secretHumanizedRendered.includes("Evidence: Markdown evidence"), "humanized secret-shaped evidence labels should fall back to a generic label");
assert.doesNotMatch(secretHumanizedRendered, /api[_\s-]*key|sk[\s-]*test/i, "humanized secret-shaped evidence labels/paths must not render in root work status details");

const publicRunIdRendered = renderRootWorkQueueStatusWithLineage(rootWorkQueue, lineageOptions);
assert(publicRunIdRendered.includes(ACTIVE_RUN_ID), "normal public active run ids should remain visible in root-work status");
assert(publicRunIdRendered.includes(LATEST_SUCCESSOR_RUN_ID), "normal public successor run ids should remain visible in root-work status");
const publicRunIdDisplayModel = rootWorkDisplayModelWithLineage(rootWorkQueue, lineageOptions);
assert.equal(publicRunIdDisplayModel.active[0]?.activeRunId, ACTIVE_RUN_ID, "normal public active run ids should remain visible in root-work display models");
assert.equal(publicRunIdDisplayModel.active[0]?.lineage?.latestSuccessorRunId, LATEST_SUCCESSOR_RUN_ID, "normal public successor run ids should remain visible in root-work display models");
const secretShapedRunId = "autoimprove-" + "api" + "KeyLegacy";
const secretShapedSuccessorRunId = "autoimprove-" + "private" + "KeyLatest";
const corruptRunId = "legacy run id with spaces";
const secretRunIdQueue: RootWorkQueue = {
  version: 1,
  items: [
    {
      key: "run-id-display-redaction",
      kind: "autoimprove-loop",
      state: "active",
      title: "Run id display redaction",
      input: { kind: "autoimprove-loop", objective: "Run id display redaction.", oracleRequired: true },
      requestedBy: "user",
      originRunId: "lineage-validation-origin",
      activeRunId: secretShapedRunId,
      privacy: { sanitized: true },
    },
  ],
  history: [
    {
      key: "created-secret-run-id",
      kind: "autoimprove-loop",
      state: "created",
      title: "Created secret-shaped run id",
      runId: corruptRunId,
      materialization: { fromRunId: ACTIVE_RUN_ID, toRunId: secretShapedRunId, tool: "task_graph_continue_autoimprove" },
      privacy: { sanitized: true },
    },
    {
      key: "completed-secret-run-id",
      kind: "autoimprove-loop",
      state: "completed",
      title: "Completed secret-shaped run id",
      completedByRunId: secretShapedRunId,
      privacy: { sanitized: true },
    },
  ],
};
const secretRunIdLineageOptions: FutureRootWorkLineageRenderOptions = {
  lineageByActiveRunId: {
    [secretShapedRunId]: {
      rootWorkKey: "run-id-display-redaction",
      latestSuccessorRunId: secretShapedSuccessorRunId,
      successors: [{ runId: secretShapedSuccessorRunId, status: "succeeded", decision: "COMPLETE" }],
    },
  },
};
const secretRunIdDisplayModel = rootWorkDisplayModelWithLineage(secretRunIdQueue, secretRunIdLineageOptions);
const secretCreatedHistory = secretRunIdDisplayModel.recent.find((item) => item.state === "created");
const secretCompletedHistory = secretRunIdDisplayModel.recent.find((item) => item.state === "completed");
assert.equal(secretRunIdDisplayModel.active[0]?.activeRunId, REDACTED_LINEAGE_RUN_ID, "camelCase secret-shaped active run ids should be redacted in display models");
assert.equal(secretRunIdDisplayModel.active[0]?.lineage?.latestSuccessorRunId, REDACTED_LINEAGE_RUN_ID, "camelCase secret-shaped latest successor run ids should be redacted in display models");
assert.equal(secretCreatedHistory?.materializedRunId, REDACTED_LINEAGE_RUN_ID, "camelCase secret-shaped materialized run ids should be redacted in display models");
assert.equal(secretCompletedHistory?.completedByRunId, REDACTED_LINEAGE_RUN_ID, "camelCase secret-shaped completed run ids should be redacted in display models");
const secretRunIdRendered = renderRootWorkQueueStatusWithLineage(secretRunIdQueue, secretRunIdLineageOptions);
assert(secretRunIdRendered.includes(REDACTED_LINEAGE_RUN_ID), "secret-shaped or corrupt root-work run ids should render with a run-id redaction placeholder");
assert.doesNotMatch(secretRunIdRendered, /api[_\s-]*key|private[_\s-]*key|legacy run id with spaces/i, "secret-shaped or corrupt root-work run ids must not render verbatim");

const lineageStatusCwd = fs.mkdtempSync(path.join(os.tmpdir(), "task-graph-lineage-status-"));
const ACTIVE_STATUS_RUN_ID = ACTIVE_RUN_ID;
const SUCCESSOR_STATUS_RUN_ID = LATEST_SUCCESSOR_RUN_ID;
const STATUS_EVIDENCE_PATH = EVIDENCE_PATH;
const STATUS_EVIDENCE_ABSOLUTE_PATH = path.join(lineageStatusCwd, STATUS_EVIDENCE_PATH);
fs.mkdirSync(path.dirname(STATUS_EVIDENCE_ABSOLUTE_PATH), { recursive: true });
fs.mkdirSync(path.join(lineageStatusCwd, ".pi", "dev-suite", "task-graph", "runs"), { recursive: true });
const RAW_SESSION_PATH_FIXTURE = "/home/tay/.pi/agent/" + "sessions/example";
const PROMPT_MARKER_FIXTURE = "prompt" + "Instructions: hidden";
const API_KEY_MARKER_FIXTURE = "api_" + "key=dummy";
fs.writeFileSync(STATUS_EVIDENCE_ABSOLUTE_PATH, [
  "# Terminal reconciliation fixture",
  `- Current run: \`${SUCCESSOR_STATUS_RUN_ID}\``,
  `- Prior run being reconciled: \`${ACTIVE_STATUS_RUN_ID}\``,
  "Decision: COMPLETE",
  `Raw body fixture that must stay hidden: ${RAW_SESSION_PATH_FIXTURE} ${PROMPT_MARKER_FIXTURE} ${API_KEY_MARKER_FIXTURE}`,
].join("\n"));

function lineageLoop(iteration: number, objective: string, extra: Partial<AutoImproveLoopMetadata> = {}): AutoImproveLoopMetadata {
  return {
    loopId: "lineage-validation-loop",
    rootRunId: ACTIVE_STATUS_RUN_ID,
    iteration,
    objective,
    oracleRequired: true,
    lineageSource: "metadata",
    ...extra,
  };
}

function minimalLineageRun(runId: string, loop: AutoImproveLoopMetadata): TaskGraphRun {
  return {
    schemaVersion: 1,
    runId,
    cwd: lineageStatusCwd,
    createdAt: "2026-06-02T00:00:00.000Z",
    updatedAt: "2026-06-02T00:00:00.000Z",
    mode: "autoimprove",
    status: "succeeded",
    rootTaskIds: [],
    tasks: {},
    edges: [],
    locks: { held: {} },
    config: {
      maxParallel: 1,
      commitEnabled: false,
      pushEnabled: false,
      strict: false,
      continuous: false,
      mutateOrg: false,
      autoimproveLoop: loop,
    },
    deferredCommits: [],
    gitBaseline: { dirtyAtStart: [] },
    metadata: { autoimproveLoop: loop },
  };
}

const resolverCwd = fs.mkdtempSync(path.join(os.tmpdir(), "task-graph-lineage-resolver-"));
fs.mkdirSync(path.join(resolverCwd, ".pi", "dev-suite", "task-graph", "runs"), { recursive: true });
function resolverRun(runId: string, loop: AutoImproveLoopMetadata, status: TaskGraphRun["status"] = "succeeded", extra: Partial<TaskGraphRun> = {}): TaskGraphRun {
  return {
    ...minimalLineageRun(runId, loop),
    cwd: resolverCwd,
    status,
    ...extra,
    config: { ...minimalLineageRun(runId, loop).config, ...(extra.config ?? {}), autoimproveLoop: loop },
    metadata: { autoimproveLoop: loop, ...(extra.metadata ?? {}) },
  };
}
function persistResolverRun(run: TaskGraphRun) {
  fs.writeFileSync(path.join(resolverCwd, ".pi", "dev-suite", "task-graph", "runs", `${run.runId}.json`), `${JSON.stringify(run, null, 2)}\n`);
}

const RESOLVER_START_RUN_ID = "autoimprove-mpxresolver-start";
const RESOLVER_MID_RUN_ID = "autoimprove-mpxresolver-mid";
const RESOLVER_LATEST_RUN_ID = "autoimprove-mpxresolver-latest";
const resolverStartLoop = lineageLoop(0, "Pure resolver linear fixture.", { rootRunId: RESOLVER_START_RUN_ID, nextRunId: RESOLVER_MID_RUN_ID });
const resolverMidLoop = lineageLoop(1, "Pure resolver linear fixture.", { rootRunId: RESOLVER_START_RUN_ID, previousRunId: RESOLVER_START_RUN_ID, nextRunIds: [RESOLVER_LATEST_RUN_ID] });
const resolverLatestLoop = lineageLoop(2, "Pure resolver linear fixture.", { rootRunId: RESOLVER_START_RUN_ID, previousRunId: RESOLVER_MID_RUN_ID });
const resolverStartRun = resolverRun(RESOLVER_START_RUN_ID, resolverStartLoop, "ready");
const resolverMidRun = resolverRun(RESOLVER_MID_RUN_ID, resolverMidLoop, "running");
const resolverLatestRun = resolverRun(RESOLVER_LATEST_RUN_ID, resolverLatestLoop, "succeeded", {
  metadata: {
    autoimproveLoop: resolverLatestLoop,
    rootWorkQueue: {
      version: 1,
      items: [
        {
          key: "active-public-work",
          kind: "autoimprove-loop",
          state: "active",
          title: "Active public root work",
          purpose: "Display active root work from the latest resolved run.",
          input: { kind: "autoimprove-loop", objective: "Active public root work.", oracleRequired: true },
          requestedBy: "user",
          originRunId: RESOLVER_START_RUN_ID,
          activeRunId: RESOLVER_LATEST_RUN_ID,
          privacy: { sanitized: true },
        },
        {
          key: "queued-executable-root-work",
          kind: "autoimprove-loop",
          state: "queued",
          title: "Queued executable root work",
          input: { kind: "autoimprove-loop", objective: "Queued executable root work.", oracleRequired: true },
          requestedBy: "user",
          originRunId: RESOLVER_LATEST_RUN_ID,
          privacy: { sanitized: true },
        },
        {
          key: "queued-research-root-work",
          kind: "research",
          state: "queued",
          title: "Queued research root work",
          input: { kind: "research", question: "Research queued follow-up work." },
          requestedBy: "user",
          originRunId: RESOLVER_LATEST_RUN_ID,
          privacy: { sanitized: true },
        },
      ],
    },
  },
});
persistResolverRun(resolverStartRun);
persistResolverRun(resolverMidRun);
persistResolverRun(resolverLatestRun);
const linearResolvedStatus = resolveAutoImproveLineageStatus(resolverCwd, RESOLVER_START_RUN_ID, { maxDepth: 5 });
assert.equal(linearResolvedStatus.startRunId, RESOLVER_START_RUN_ID, "lineage status preserves public start run ids");
assert.equal(linearResolvedStatus.latestRunId, RESOLVER_LATEST_RUN_ID, "linear lineage status resolves the latest successor run id");
assert.equal(linearResolvedStatus.latestStatus, "succeeded", "linear lineage status resolves the latest successor status");
assert.equal(linearResolvedStatus.latestTerminal, true, "linear lineage status detects terminal latest runs");
assert.deepEqual(linearResolvedStatus.visitedRunIds, [RESOLVER_START_RUN_ID, RESOLVER_MID_RUN_ID, RESOLVER_LATEST_RUN_ID], "linear lineage visits public run ids in deterministic order");
assert.deepEqual(linearResolvedStatus.visitedRuns.map((run) => [run.runId, run.status, run.iteration]), [
  [RESOLVER_START_RUN_ID, "ready", 0],
  [RESOLVER_MID_RUN_ID, "running", 1],
  [RESOLVER_LATEST_RUN_ID, "succeeded", 2],
], "linear lineage exposes bounded public status and iteration info");
assert.deepEqual(linearResolvedStatus.rootWorkQueue?.counts, { active: 1, queued: 2, queuedExecutable: 1, queuedNonExecutable: 1 }, "latest resolved rootWorkQueue counts include active and queued splits");
assert.equal(linearResolvedStatus.rootWorkQueue?.active[0]?.key, "active-public-work", "lineage status exposes display-safe active root work from the latest run");
assert.deepEqual(linearResolvedStatus.rootWorkQueue?.queued.map((item) => item.key), ["queued-executable-root-work", "queued-research-root-work"], "lineage status exposes display-safe queued root work in deterministic order");
assert(linearResolvedStatus.recommendations.includes("inspect-latest-terminal"), "terminal latest runs should recommend inspecting the terminal latest run");
assert(linearResolvedStatus.recommendations.includes("root-work-active-report-only"), "active root work in the latest run should be report-only in this slice");

const FAILED_RESOLVER_START_RUN_ID = "autoimprove-mpxresolver-failed";
const FAILED_RESOLVER_SUCCESSOR_RUN_ID = "autoimprove-mpxresolver-after-failed";
const failedResolverStartLoop = lineageLoop(0, "Failed start successor fixture.", { rootRunId: FAILED_RESOLVER_START_RUN_ID, nextRunId: FAILED_RESOLVER_SUCCESSOR_RUN_ID });
const failedResolverSuccessorLoop = lineageLoop(1, "Failed start successor fixture.", { rootRunId: FAILED_RESOLVER_START_RUN_ID, previousRunId: FAILED_RESOLVER_START_RUN_ID });
const failedResolverStartRun = resolverRun(FAILED_RESOLVER_START_RUN_ID, failedResolverStartLoop, "failed");
const failedResolverSuccessorRun = resolverRun(FAILED_RESOLVER_SUCCESSOR_RUN_ID, failedResolverSuccessorLoop, "running");
const failedResolverFixtureJson = JSON.stringify({ failedResolverStartRun, failedResolverSuccessorRun });
const failedResolverRuns = new Map<string, TaskGraphRun>([
  [FAILED_RESOLVER_START_RUN_ID, failedResolverStartRun],
  [FAILED_RESOLVER_SUCCESSOR_RUN_ID, failedResolverSuccessorRun],
]);
const failedResolvedStatus = resolveAutoImproveLineageStatus(resolverCwd, FAILED_RESOLVER_START_RUN_ID, { loadRun: (_cwd, runId) => failedResolverRuns.get(runId) });
assert.equal(failedResolvedStatus.latestRunId, FAILED_RESOLVER_SUCCESSOR_RUN_ID, "failed historical starts still resolve public successors");
assert.equal(failedResolvedStatus.latestStatus, "running", "failed historical starts report the existing successor status");
assert(failedResolvedStatus.recommendations.includes("continue-existing-successor"), "non-terminal existing successors should be continued instead of creating another successor");
assert.equal(JSON.stringify({ failedResolverStartRun, failedResolverSuccessorRun }), failedResolverFixtureJson, "pure lineage status resolution must not mutate in-memory fixture runs");

const CYCLE_RESOLVER_A_RUN_ID = "autoimprove-cycle-a";
const CYCLE_RESOLVER_B_RUN_ID = "autoimprove-cycle-b";
const cycleResolverALoop = lineageLoop(0, "Cycle-only successor fixture.", {
  rootRunId: CYCLE_RESOLVER_A_RUN_ID,
  nextRunId: CYCLE_RESOLVER_B_RUN_ID,
});
const cycleResolverBLoop = lineageLoop(1, "Cycle-only successor fixture.", {
  rootRunId: CYCLE_RESOLVER_A_RUN_ID,
  previousRunId: CYCLE_RESOLVER_A_RUN_ID,
  nextRunId: CYCLE_RESOLVER_A_RUN_ID,
});
const cycleResolverRuns = new Map<string, TaskGraphRun>([
  [CYCLE_RESOLVER_A_RUN_ID, resolverRun(CYCLE_RESOLVER_A_RUN_ID, cycleResolverALoop, "ready")],
  [CYCLE_RESOLVER_B_RUN_ID, resolverRun(CYCLE_RESOLVER_B_RUN_ID, cycleResolverBLoop, "running")],
]);
const cycleResolvedStatus = resolveAutoImproveLineageStatus(resolverCwd, CYCLE_RESOLVER_A_RUN_ID, {
  loadRun: (_cwd, runId) => cycleResolverRuns.get(runId),
  maxDepth: 4,
});
assert.equal(cycleResolvedStatus.latestRunId, CYCLE_RESOLVER_B_RUN_ID, "cycle-only lineage keeps the latest visible successor run id");
assert.equal(cycleResolvedStatus.latestStatus, "running", "cycle-only lineage keeps the latest visible successor status");
assert.deepEqual(cycleResolvedStatus.visitedRunIds, [CYCLE_RESOLVER_A_RUN_ID, CYCLE_RESOLVER_B_RUN_ID], "cycle-only lineage preserves bounded visited-run visibility without repeats");
const cycleWarnings = JSON.stringify(cycleResolvedStatus.warnings ?? []);
assert.match(cycleWarnings, /cycle/i, "cycle-only lineage records a sanitized cycle warning");
assert.match(cycleWarnings, /autoimprove-cycle-a/i, "cycle-only lineage warning includes the sanitized repeated public run id");
assert.equal(cycleResolvedStatus.recommendations.includes("continue-existing-successor"), false, "cycle-only lineage must not recommend normal successor continuation");
assert.equal(cycleResolvedStatus.recommendations.includes("continue-latest-terminal-with-first-executable"), false, "cycle-only lineage must not recommend terminal auto-continuation");
assert.equal(cycleResolvedStatus.recommendations.includes("no-ready-work-root-queue-empty"), false, "cycle-only lineage must not recommend empty-queue completion handling");
assert(cycleResolvedStatus.recommendations.includes("inspect-cycle-or-corrupt-lineage"), "cycle-only lineage should recommend conservative cycle/corruption inspection");

const CYCLE_TERMINAL_EMPTY_QUEUE_A_RUN_ID = "autoimprove-cycle-terminal-empty-a";
const CYCLE_TERMINAL_EMPTY_QUEUE_B_RUN_ID = "autoimprove-cycle-terminal-empty-b";
const cycleTerminalEmptyQueueALoop = lineageLoop(0, "Terminal cycle with empty root-work queue fixture.", {
  rootRunId: CYCLE_TERMINAL_EMPTY_QUEUE_A_RUN_ID,
  nextRunId: CYCLE_TERMINAL_EMPTY_QUEUE_B_RUN_ID,
});
const cycleTerminalEmptyQueueBLoop = lineageLoop(1, "Terminal cycle with empty root-work queue fixture.", {
  rootRunId: CYCLE_TERMINAL_EMPTY_QUEUE_A_RUN_ID,
  previousRunId: CYCLE_TERMINAL_EMPTY_QUEUE_A_RUN_ID,
  nextRunId: CYCLE_TERMINAL_EMPTY_QUEUE_A_RUN_ID,
});
const cycleTerminalEmptyQueueRuns = new Map<string, TaskGraphRun>([
  [CYCLE_TERMINAL_EMPTY_QUEUE_A_RUN_ID, resolverRun(CYCLE_TERMINAL_EMPTY_QUEUE_A_RUN_ID, cycleTerminalEmptyQueueALoop, "ready")],
  [
    CYCLE_TERMINAL_EMPTY_QUEUE_B_RUN_ID,
    resolverRun(CYCLE_TERMINAL_EMPTY_QUEUE_B_RUN_ID, cycleTerminalEmptyQueueBLoop, "succeeded", {
      metadata: { rootWorkQueue: { version: 1, items: [] } },
    }),
  ],
]);
const cycleTerminalEmptyQueueStatus = resolveAutoImproveLineageStatus(resolverCwd, CYCLE_TERMINAL_EMPTY_QUEUE_A_RUN_ID, {
  loadRun: (_cwd, runId) => cycleTerminalEmptyQueueRuns.get(runId),
  maxDepth: 4,
});
assert.equal(cycleTerminalEmptyQueueStatus.latestRunId, CYCLE_TERMINAL_EMPTY_QUEUE_B_RUN_ID, "terminal empty-queue cycle keeps the latest visible successor run id");
assert.equal(cycleTerminalEmptyQueueStatus.latestStatus, "succeeded", "terminal empty-queue cycle keeps the latest visible successor status");
assert.equal(cycleTerminalEmptyQueueStatus.latestTerminal, true, "terminal empty-queue cycle still reports terminal latest status");
assert(cycleTerminalEmptyQueueStatus.recommendations.includes("inspect-cycle-or-corrupt-lineage"), "terminal empty-queue cycle should recommend conservative cycle/corruption inspection");
assert.equal(cycleTerminalEmptyQueueStatus.recommendations.includes("continue-existing-successor"), false, "terminal empty-queue cycle must not recommend normal successor continuation");
assert.equal(cycleTerminalEmptyQueueStatus.recommendations.includes("continue-latest-terminal-with-first-executable"), false, "terminal empty-queue cycle must not recommend terminal auto-continuation");
assert.equal(cycleTerminalEmptyQueueStatus.recommendations.includes("no-ready-work-root-queue-empty"), false, "terminal empty-queue cycle must not recommend empty-queue completion handling");
assert.deepEqual(cycleTerminalEmptyQueueStatus.rootWorkQueue?.counts, { active: 0, queued: 0, queuedExecutable: 0, queuedNonExecutable: 0 }, "terminal empty-queue cycle should expose zero rootWorkQueue counts when a queue object exists");
assert.deepEqual(cycleTerminalEmptyQueueStatus.rootWorkQueue?.active, [], "terminal empty-queue cycle should expose an empty active rootWorkQueue display array");
assert.deepEqual(cycleTerminalEmptyQueueStatus.rootWorkQueue?.queued, [], "terminal empty-queue cycle should expose an empty queued rootWorkQueue display array");
assert.deepEqual(cycleTerminalEmptyQueueStatus.rootWorkQueue?.queuedExecutable, [], "terminal empty-queue cycle should expose an empty executable queued rootWorkQueue display array");
assert.deepEqual(cycleTerminalEmptyQueueStatus.rootWorkQueue?.queuedNonExecutable, [], "terminal empty-queue cycle should expose an empty non-executable queued rootWorkQueue display array");

const PRIMARY_BRANCH_RESOLVER_START_RUN_ID = "autoimprove-review-start";
const PRIMARY_BRANCH_RESOLVER_CURRENT_RUN_ID = "autoimprove-review-a-current";
const PRIMARY_BRANCH_RESOLVER_STALE_RUN_ID = "autoimprove-review-z-stale";
const primaryBranchStartLoop = lineageLoop(0, "Primary branch selection fixture.", {
  rootRunId: PRIMARY_BRANCH_RESOLVER_START_RUN_ID,
  nextRunId: PRIMARY_BRANCH_RESOLVER_CURRENT_RUN_ID,
  nextRunIds: [PRIMARY_BRANCH_RESOLVER_STALE_RUN_ID, PRIMARY_BRANCH_RESOLVER_CURRENT_RUN_ID],
});
const primaryBranchCurrentLoop = lineageLoop(1, "Primary branch selection fixture.", {
  rootRunId: PRIMARY_BRANCH_RESOLVER_START_RUN_ID,
  previousRunId: PRIMARY_BRANCH_RESOLVER_START_RUN_ID,
});
const primaryBranchStaleLoop = lineageLoop(1, "Primary branch selection fixture.", {
  rootRunId: PRIMARY_BRANCH_RESOLVER_START_RUN_ID,
  previousRunId: PRIMARY_BRANCH_RESOLVER_START_RUN_ID,
});
const primaryBranchStartRun = resolverRun(PRIMARY_BRANCH_RESOLVER_START_RUN_ID, primaryBranchStartLoop, "ready");
const primaryBranchCurrentRun = resolverRun(PRIMARY_BRANCH_RESOLVER_CURRENT_RUN_ID, primaryBranchCurrentLoop, "running", {
  metadata: {
    autoimproveLoop: primaryBranchCurrentLoop,
    rootWorkQueue: {
      version: 1,
      items: [
        {
          key: "primary-current-active-work",
          kind: "autoimprove-loop",
          state: "active",
          title: "Primary current active work",
          purpose: "This active item belongs to the authoritative primary successor.",
          input: { kind: "autoimprove-loop", objective: "Continue primary current work.", oracleRequired: true },
          requestedBy: "user",
          originRunId: PRIMARY_BRANCH_RESOLVER_START_RUN_ID,
          activeRunId: PRIMARY_BRANCH_RESOLVER_CURRENT_RUN_ID,
          privacy: { sanitized: true },
        },
      ],
    },
  },
});
const primaryBranchStaleRun = resolverRun(PRIMARY_BRANCH_RESOLVER_STALE_RUN_ID, primaryBranchStaleLoop, "succeeded", {
  metadata: {
    autoimproveLoop: primaryBranchStaleLoop,
    rootWorkQueue: {
      version: 1,
      items: [
        {
          key: "stale-terminal-queued-work",
          kind: "autoimprove-loop",
          state: "queued",
          title: "Stale terminal queued work",
          input: { kind: "autoimprove-loop", objective: "Do not select stale branch work.", oracleRequired: true },
          requestedBy: "user",
          originRunId: PRIMARY_BRANCH_RESOLVER_STALE_RUN_ID,
          privacy: { sanitized: true },
        },
      ],
    },
  },
});
const primaryBranchResolverRuns = new Map<string, TaskGraphRun>([
  [PRIMARY_BRANCH_RESOLVER_START_RUN_ID, primaryBranchStartRun],
  [PRIMARY_BRANCH_RESOLVER_CURRENT_RUN_ID, primaryBranchCurrentRun],
  [PRIMARY_BRANCH_RESOLVER_STALE_RUN_ID, primaryBranchStaleRun],
]);
const primaryBranchResolvedStatus = resolveAutoImproveLineageStatus(resolverCwd, PRIMARY_BRANCH_RESOLVER_START_RUN_ID, {
  loadRun: (_cwd, runId) => primaryBranchResolverRuns.get(runId),
  maxDepth: 3,
});
assert.equal(primaryBranchResolvedStatus.latestRunId, PRIMARY_BRANCH_RESOLVER_CURRENT_RUN_ID, "primary nextRunId successor should remain the latest/current resolver run when stale secondary branches exist");
assert.equal(primaryBranchResolvedStatus.latestStatus, "running", "primary current successor status should drive latestStatus");
assert.equal(primaryBranchResolvedStatus.latestTerminal, false, "primary running successor should keep latestTerminal false despite terminal stale branches");
assert.deepEqual(primaryBranchResolvedStatus.rootWorkQueue?.counts, { active: 1, queued: 0, queuedExecutable: 0, queuedNonExecutable: 0 }, "primary current successor rootWorkQueue should drive resolver queue counts");
assert.equal(primaryBranchResolvedStatus.rootWorkQueue?.active[0]?.key, "primary-current-active-work", "primary current successor rootWorkQueue should drive resolver active work");
assert.equal(primaryBranchResolvedStatus.rootWorkQueue?.queued.some((item) => item.key === "stale-terminal-queued-work"), false, "stale secondary branch root work must not drive resolver queue details");
assert(primaryBranchResolvedStatus.visitedRunIds.includes(PRIMARY_BRANCH_RESOLVER_STALE_RUN_ID), "resolver should still visit bounded stale secondary branches for inspection visibility");
assert(primaryBranchResolvedStatus.recommendations.includes("inspect-branching-successors"), "branching successors should still recommend branch inspection");
assert(primaryBranchResolvedStatus.recommendations.includes("continue-existing-successor"), "primary running successor should recommend continuing the existing successor");
assert.equal(primaryBranchResolvedStatus.recommendations.includes("inspect-latest-terminal"), false, "terminal stale secondary branches must not make latest/current look terminal");
assert.match(JSON.stringify(primaryBranchResolvedStatus.warnings ?? []), /multiple successor branches/i, "primary branch fixture should preserve branch warning behavior");

persistResolverRun(primaryBranchStartRun);
persistResolverRun(primaryBranchCurrentRun);
persistResolverRun(primaryBranchStaleRun);
const publicSurfaceResolverRunIds = [
  RESOLVER_START_RUN_ID,
  RESOLVER_MID_RUN_ID,
  RESOLVER_LATEST_RUN_ID,
  PRIMARY_BRANCH_RESOLVER_START_RUN_ID,
  PRIMARY_BRANCH_RESOLVER_CURRENT_RUN_ID,
  PRIMARY_BRANCH_RESOLVER_STALE_RUN_ID,
] as const;
const publicSurfaceResolverRunFiles = publicSurfaceResolverRunIds.map((runId) => path.join(resolverCwd, ".pi", "dev-suite", "task-graph", "runs", `${runId}.json`));
const publicSurfaceResolverEventFiles = publicSurfaceResolverRunIds.map((runId) => path.join(resolverCwd, ".pi", "dev-suite", "task-graph", "runs", `${runId}.events.jsonl`));
const publicSurfaceRunHashesBefore = new Map(publicSurfaceResolverRunFiles.map((file) => [file, fileSha256(file)]));
const primaryBranchRunBeforeStatusDetailsJson = JSON.stringify(primaryBranchStartRun);
const statusDetailsWithoutCwd = taskGraphStatusResponseDetailsFixture(primaryBranchStartRun);
assert.equal(Object.prototype.hasOwnProperty.call(statusDetailsWithoutCwd, "autoImproveLineage"), false, "status response details without cwd must preserve the previous surface");
const linearStatusDetails = taskGraphStatusResponseDetailsFixture(resolverStartRun, { cwd: resolverCwd });
const linearStatusLineage = (linearStatusDetails as { autoImproveLineage?: typeof linearResolvedStatus }).autoImproveLineage;
assert(linearStatusLineage, "status response details with cwd should expose the autoImproveLineage resolver model for autoimprove runs");
assert.equal(linearStatusLineage.startRunId, RESOLVER_START_RUN_ID, "status response details should report the historical start run id");
assert.equal(linearStatusLineage.latestRunId, RESOLVER_LATEST_RUN_ID, "status response details should report the latest resolved run id");
assert.equal(linearStatusLineage.latestStatus, "succeeded", "status response details should report the latest resolved status");
assert.deepEqual(linearStatusLineage.rootWorkQueue?.counts, { active: 1, queued: 2, queuedExecutable: 1, queuedNonExecutable: 1 }, "status response details should expose latest rootWorkQueue counts");
assert.deepEqual(linearStatusLineage.rootWorkQueue?.queued.map((item) => item.key), ["queued-executable-root-work", "queued-research-root-work"], "status response details should expose latest queued rootWorkQueue entries");
assert(linearStatusLineage.recommendations.includes("inspect-latest-terminal"), "status response details should expose conservative terminal inspection recommendations");
assert(linearStatusLineage.recommendations.includes("root-work-active-report-only"), "status response details should expose report-only active root-work recommendations");
const primaryBranchStatusDetails = taskGraphStatusResponseDetailsFixture(primaryBranchStartRun, { cwd: resolverCwd });
const primaryBranchStatusLineage = (primaryBranchStatusDetails as { autoImproveLineage?: typeof primaryBranchResolvedStatus }).autoImproveLineage;
assert(primaryBranchStatusLineage, "status response details should expose autoImproveLineage for historical branch starts");
assert.equal(primaryBranchStatusLineage.latestRunId, PRIMARY_BRANCH_RESOLVER_CURRENT_RUN_ID, "status response details should prefer primary nextRunId over stale secondary branches");
assert.equal(primaryBranchStatusLineage.latestStatus, "running", "status response details should report the primary current successor status");
assert.equal(primaryBranchStatusLineage.latestTerminal, false, "status response details should not make stale terminal branches authoritative");
assert.deepEqual(primaryBranchStatusLineage.rootWorkQueue?.counts, { active: 1, queued: 0, queuedExecutable: 0, queuedNonExecutable: 0 }, "status response details should use the primary current successor rootWorkQueue counts");
assert.equal(primaryBranchStatusLineage.rootWorkQueue?.active[0]?.key, "primary-current-active-work", "status response details should use the primary current successor active root work");
assert.equal(primaryBranchStatusLineage.rootWorkQueue?.queued.some((item) => item.key === "stale-terminal-queued-work"), false, "status response details must not surface stale secondary branch queued work as latest queue state");
assert(primaryBranchStatusLineage.visitedRunIds.includes(PRIMARY_BRANCH_RESOLVER_STALE_RUN_ID), "status response details should retain bounded stale branch visibility for inspection");
assert(primaryBranchStatusLineage.recommendations.includes("inspect-branching-successors"), "status response details should recommend branch inspection when successors branch");
assert(primaryBranchStatusLineage.recommendations.includes("continue-existing-successor"), "status response details should recommend continuing the primary running successor");
assert.equal(primaryBranchStatusLineage.recommendations.includes("inspect-latest-terminal"), false, "status response details should not recommend terminal handling for stale secondary branches");
assert.equal(JSON.stringify(primaryBranchStartRun), primaryBranchRunBeforeStatusDetailsJson, "status response details resolver exposure must not mutate the historical run object");
for (const [file, hashBefore] of publicSurfaceRunHashesBefore) assert.equal(fileSha256(file), hashBefore, `status response details resolver exposure must not rewrite ${path.basename(file)}`);
for (const file of publicSurfaceResolverEventFiles) assert.equal(fs.existsSync(file), false, `status response details resolver exposure must not create ${path.basename(file)}`);

const BRANCH_RESOLVER_START_RUN_ID = "autoimprove-mpxresolver-branch-start";
const BRANCH_RESOLVER_A_RUN_ID = "autoimprove-mpxresolver-branch-a";
const BRANCH_RESOLVER_B_RUN_ID = "autoimprove-mpxresolver-branch-b";
const BRANCH_RESOLVER_MISSING_RUN_ID = "autoimprove-mpxresolver-branch-0-missing";
const BRANCH_RESOLVER_OMITTED_RUN_ID = "autoimprove-mpxresolver-branch-z-omitted";
const branchResolverStartLoop = lineageLoop(0, "Branch cap and cycle fixture.", {
  rootRunId: BRANCH_RESOLVER_START_RUN_ID,
  nextRunIds: [BRANCH_RESOLVER_B_RUN_ID, BRANCH_RESOLVER_A_RUN_ID, BRANCH_RESOLVER_MISSING_RUN_ID, BRANCH_RESOLVER_OMITTED_RUN_ID],
});
const branchResolverALoop = lineageLoop(1, "Branch cap and cycle fixture.", { rootRunId: BRANCH_RESOLVER_START_RUN_ID, previousRunId: BRANCH_RESOLVER_START_RUN_ID, nextRunId: BRANCH_RESOLVER_START_RUN_ID });
const branchResolverBLoop = lineageLoop(1, "Branch cap and cycle fixture.", { rootRunId: BRANCH_RESOLVER_START_RUN_ID, previousRunId: BRANCH_RESOLVER_START_RUN_ID });
const branchResolverRuns = new Map<string, TaskGraphRun>([
  [BRANCH_RESOLVER_START_RUN_ID, resolverRun(BRANCH_RESOLVER_START_RUN_ID, branchResolverStartLoop, "running")],
  [BRANCH_RESOLVER_A_RUN_ID, resolverRun(BRANCH_RESOLVER_A_RUN_ID, branchResolverALoop, "running")],
  [BRANCH_RESOLVER_B_RUN_ID, resolverRun(BRANCH_RESOLVER_B_RUN_ID, branchResolverBLoop, "succeeded")],
]);
const branchResolvedStatus = resolveAutoImproveLineageStatus(resolverCwd, BRANCH_RESOLVER_START_RUN_ID, {
  loadRun: (_cwd, runId) => branchResolverRuns.get(runId),
  maxDepth: 4,
  maxSuccessors: 4,
  maxSuccessorsPerRun: 3,
});
assert(branchResolvedStatus.visitedRunIds.length <= 4, "branch/cycle lineage traversal stays within configured bounds");
assert.equal(new Set(branchResolvedStatus.visitedRunIds).size, branchResolvedStatus.visitedRunIds.length, "branch/cycle lineage traversal does not repeat cycle ids");
const branchWarnings = JSON.stringify(branchResolvedStatus.warnings ?? []);
assert.match(branchWarnings, /limit/i, "branch cap lineage status records a bounded warning");
assert.match(branchWarnings, /cycle/i, "cycle lineage status records a cycle warning");
assert.match(branchWarnings, /missing/i, "missing successor lineage status records a missing-run warning");
assert(branchResolvedStatus.recommendations.includes("inspect-branching-successors"), "branching successors should recommend manual inspection");
assert(branchResolvedStatus.recommendations.includes("missing-successor-or-run"), "missing successors should recommend missing-run inspection");

const SECRET_RESOLVER_START_RUN_ID = "autoimprove-mpxresolver-public-start";
const SECRET_RESOLVER_PUBLIC_SUCCESSOR_RUN_ID = "autoimprove-mpxresolver-public-successor";
const SECRET_RESOLVER_BAD_SUCCESSOR_RUN_ID = "autoimprove-" + "api" + "KeyResolverSuccessor";
const SECRET_RESOLVER_BAD_PATH = [".orchestration", "api_" + "key=sk-test", "private" + "Key-report.md"].join("/");
const secretResolverStartLoop = lineageLoop(0, "Resolver redaction fixture.", {
  rootRunId: SECRET_RESOLVER_START_RUN_ID,
  nextRunId: SECRET_RESOLVER_PUBLIC_SUCCESSOR_RUN_ID,
  nextRunIds: [SECRET_RESOLVER_BAD_SUCCESSOR_RUN_ID],
});
const secretResolverSuccessorLoop = lineageLoop(1, "Resolver redaction fixture.", { rootRunId: SECRET_RESOLVER_START_RUN_ID, previousRunId: SECRET_RESOLVER_START_RUN_ID });
const secretResolverStartRun = resolverRun(SECRET_RESOLVER_START_RUN_ID, secretResolverStartLoop, "running");
const secretResolverSuccessorRun = resolverRun(SECRET_RESOLVER_PUBLIC_SUCCESSOR_RUN_ID, secretResolverSuccessorLoop, "succeeded", {
  metadata: {
    autoimproveLoop: secretResolverSuccessorLoop,
    rootWorkQueue: {
      version: 1,
      items: [
        {
          key: "api" + "KeyResolverQueuedWork",
          kind: "autoimprove-loop",
          state: "queued",
          title: `Queued ${SECRET_RESOLVER_BAD_PATH}`,
          purpose: `Do not display ${SECRET_RESOLVER_BAD_PATH}`,
          input: { kind: "autoimprove-loop", objective: `Do not display ${SECRET_RESOLVER_BAD_PATH}`, oracleRequired: true },
          requestedBy: "user",
          originRunId: SECRET_RESOLVER_PUBLIC_SUCCESSOR_RUN_ID,
          privacy: { sanitized: true },
        },
      ],
    },
  },
});
const secretResolverRuns = new Map<string, TaskGraphRun>([
  [SECRET_RESOLVER_START_RUN_ID, secretResolverStartRun],
  [SECRET_RESOLVER_PUBLIC_SUCCESSOR_RUN_ID, secretResolverSuccessorRun],
]);
const secretResolvedStatus = resolveAutoImproveLineageStatus(resolverCwd, SECRET_RESOLVER_START_RUN_ID, { loadRun: (_cwd, runId) => secretResolverRuns.get(runId), maxDepth: 3 });
const secretResolvedJson = JSON.stringify(secretResolvedStatus);
assert(secretResolvedJson.includes(SECRET_RESOLVER_START_RUN_ID), "public generated start run ids remain visible in resolver status models");
assert(secretResolvedJson.includes(SECRET_RESOLVER_PUBLIC_SUCCESSOR_RUN_ID), "public generated successor run ids remain visible in resolver status models");
assert.doesNotMatch(secretResolvedJson, /api[_\s-]*key|private[_\s-]*key|sk[\s-]*test/i, "secret-shaped run ids and root-work paths are redacted or omitted from resolver status models");

persistResolverRun(secretResolverStartRun);
persistResolverRun(secretResolverSuccessorRun);
const secretSurfaceRunFiles = [SECRET_RESOLVER_START_RUN_ID, SECRET_RESOLVER_PUBLIC_SUCCESSOR_RUN_ID].map((runId) => path.join(resolverCwd, ".pi", "dev-suite", "task-graph", "runs", `${runId}.json`));
const secretSurfaceEventFiles = [SECRET_RESOLVER_START_RUN_ID, SECRET_RESOLVER_PUBLIC_SUCCESSOR_RUN_ID].map((runId) => path.join(resolverCwd, ".pi", "dev-suite", "task-graph", "runs", `${runId}.events.jsonl`));
const secretSurfaceRunHashesBefore = new Map(secretSurfaceRunFiles.map((file) => [file, fileSha256(file)]));
const secretStatusDetails = taskGraphStatusResponseDetailsFixture(secretResolverStartRun, { cwd: resolverCwd });
const secretStatusDetailsJson = JSON.stringify(secretStatusDetails);
const secretStatusLineage = (secretStatusDetails as { autoImproveLineage?: typeof secretResolvedStatus }).autoImproveLineage;
assert(secretStatusLineage, "status response details should expose resolver output for redaction fixtures");
assert(secretStatusDetailsJson.includes(SECRET_RESOLVER_START_RUN_ID), "status response details should preserve public generated start run ids");
assert(secretStatusDetailsJson.includes(SECRET_RESOLVER_PUBLIC_SUCCESSOR_RUN_ID), "status response details should preserve public generated successor run ids");
assert.doesNotMatch(secretStatusDetailsJson, /api[_\s-]*key|private[_\s-]*key|sk[\s-]*test/i, "status response details autoImproveLineage must redact secret-shaped ids and root-work paths");
for (const [file, hashBefore] of secretSurfaceRunHashesBefore) assert.equal(fileSha256(file), hashBefore, `status response details secret redaction fixture must not rewrite ${path.basename(file)}`);
for (const file of secretSurfaceEventFiles) assert.equal(fs.existsSync(file), false, `status response details secret redaction fixture must not create ${path.basename(file)}`);

const SECRET_STATUS_RESOLVER_START_RUN_ID = "autoimprove-mpxresolver-status-start";
const SECRET_STATUS_RESOLVER_SUCCESSOR_RUN_ID = "autoimprove-mpxresolver-status-successor";
const SECRET_STATUS_VALUE = "api" + "KeyResolverStatus";
const secretStatusResolverStartLoop = lineageLoop(0, "Resolver secret-shaped status fixture.", {
  rootRunId: SECRET_STATUS_RESOLVER_START_RUN_ID,
  nextRunId: SECRET_STATUS_RESOLVER_SUCCESSOR_RUN_ID,
});
const secretStatusResolverSuccessorLoop = lineageLoop(1, "Resolver secret-shaped status fixture.", {
  rootRunId: SECRET_STATUS_RESOLVER_START_RUN_ID,
  previousRunId: SECRET_STATUS_RESOLVER_START_RUN_ID,
});
const secretStatusResolverRuns = new Map<string, TaskGraphRun>([
  [SECRET_STATUS_RESOLVER_START_RUN_ID, resolverRun(SECRET_STATUS_RESOLVER_START_RUN_ID, secretStatusResolverStartLoop, SECRET_STATUS_VALUE as TaskGraphRun["status"])],
  [SECRET_STATUS_RESOLVER_SUCCESSOR_RUN_ID, resolverRun(SECRET_STATUS_RESOLVER_SUCCESSOR_RUN_ID, secretStatusResolverSuccessorLoop, SECRET_STATUS_VALUE as TaskGraphRun["status"])],
]);
const secretStatusResolvedStatus = resolveAutoImproveLineageStatus(resolverCwd, SECRET_STATUS_RESOLVER_START_RUN_ID, {
  loadRun: (_cwd, runId) => secretStatusResolverRuns.get(runId),
  maxDepth: 3,
});
assert.equal(secretStatusResolvedStatus.latestRunId, SECRET_STATUS_RESOLVER_SUCCESSOR_RUN_ID, "secret-shaped non-enum status fixture should still resolve the latest public successor run id");
assert.equal(secretStatusResolvedStatus.latestStatus, undefined, "secret-shaped non-enum latest statuses should be omitted from resolver status models");
assert.equal(secretStatusResolvedStatus.visitedRuns.find((run) => run.runId === SECRET_STATUS_RESOLVER_START_RUN_ID)?.status, undefined, "secret-shaped non-enum start status should be omitted from visitedRuns");
assert.equal(secretStatusResolvedStatus.visitedRuns.find((run) => run.runId === SECRET_STATUS_RESOLVER_SUCCESSOR_RUN_ID)?.status, undefined, "secret-shaped non-enum successor status should be omitted from visitedRuns");
assert.doesNotMatch(JSON.stringify(secretStatusResolvedStatus), /api[_\s-]*key|apiKeyResolverStatus/i, "secret-shaped non-enum statuses must not appear in resolver status models");

const REPORTING_PUBLIC_TOP_RUN_ID = "autoimprove-mpu8pu38-164913";
const REPORTING_PUBLIC_LOOP_ID = "autoimprove-mpwin3qu-xyaihp";
const REPORTING_SECRET_TOP_RUN_ID = "autoimprove-" + "api" + "KeyReportingTop";
const REPORTING_SECRET_PREVIOUS_RUN_ID = "autoimprove-" + "private" + "KeyReportingPrevious";
const REPORTING_SECRET_ROOT_RUN_ID = "autoimprove-" + "authorization" + "ReportingRoot";
const REPORTING_SECRET_LOOP_ID = "autoimprove-" + "cookie" + "ReportingLoop";
const REPORTING_SECRET_RUN_ID_PATTERN = /api[_\s-]*key|private[_\s-]*key|authorization|cookie/i;
const reportingSecretLoop = lineageLoop(7, "Reporting run id redaction fixture.", {
  loopId: REPORTING_SECRET_LOOP_ID,
  rootRunId: REPORTING_SECRET_ROOT_RUN_ID,
  previousRunId: REPORTING_SECRET_PREVIOUS_RUN_ID,
});
const reportingSecretRun = minimalLineageRun(REPORTING_SECRET_TOP_RUN_ID, reportingSecretLoop);
const reportingSecretViewModel = buildTaskGraphViewModel(reportingSecretRun, { mode: "work-list" });
const reportingSecretViewModelJson = JSON.stringify({ graphId: reportingSecretViewModel.graphId, title: reportingSecretViewModel.title });
assert.equal(reportingSecretViewModel.graphId, REDACTED_LINEAGE_RUN_ID, "view models should redact secret-shaped top-level run ids before downstream reporting surfaces consume them");
assert(reportingSecretViewModelJson.includes(REDACTED_LINEAGE_RUN_ID), "view models should retain a run-id redaction placeholder for secret-shaped top-level run ids");
assert.doesNotMatch(reportingSecretViewModelJson, REPORTING_SECRET_RUN_ID_PATTERN, "view models must not expose secret-shaped top-level run ids");
const reportingSecretStatusWidgetAndFlowchart = [
  renderStatus(reportingSecretRun),
  renderTaskGraphWidget(reportingSecretRun).join("\n"),
  renderTaskGraphFlowchart(reportingSecretRun, { format: "ascii", includeDone: true, maxLabelLength: 120 }),
].join("\n");
assert(reportingSecretStatusWidgetAndFlowchart.includes(REDACTED_LINEAGE_RUN_ID), "status/widget/ASCII flowchart should show a run-id redaction placeholder for secret-shaped reporting ids");
assert.doesNotMatch(reportingSecretStatusWidgetAndFlowchart, REPORTING_SECRET_RUN_ID_PATTERN, "status/widget/ASCII flowchart must not render secret-shaped top-level or previous run ids");
const reportingSecretDetails = sanitizeContinueAutoImproveResponseDetails({
  runId: REPORTING_SECRET_TOP_RUN_ID,
  loopId: REPORTING_SECRET_LOOP_ID,
  rootRunId: REPORTING_SECRET_ROOT_RUN_ID,
  previousRunId: REPORTING_SECRET_PREVIOUS_RUN_ID,
  nested: {
    loopId: REPORTING_SECRET_LOOP_ID,
    previousRunId: REPORTING_SECRET_PREVIOUS_RUN_ID,
  },
});
assert.equal(reportingSecretDetails.runId, REDACTED_LINEAGE_RUN_ID, "response details should redact secret-shaped top-level run ids with the run-id placeholder");
assert.equal(reportingSecretDetails.loopId, REDACTED_LINEAGE_RUN_ID, "response details should redact secret-shaped autoimprove loop ids with the run-id placeholder");
assert.equal(reportingSecretDetails.rootRunId, REDACTED_LINEAGE_RUN_ID, "response details should redact secret-shaped root run ids with the run-id placeholder");
assert.equal(reportingSecretDetails.previousRunId, REDACTED_LINEAGE_RUN_ID, "response details should redact secret-shaped previous run ids with the run-id placeholder");
assert.equal(reportingSecretDetails.nested.loopId, REDACTED_LINEAGE_RUN_ID, "response details should redact nested secret-shaped loop ids with the run-id placeholder");
assert.doesNotMatch(JSON.stringify(reportingSecretDetails), REPORTING_SECRET_RUN_ID_PATTERN, "response details must not render secret-shaped reporting id fragments");
const reportingPublicLoop = lineageLoop(8, "Reporting public id preservation fixture.", {
  loopId: REPORTING_PUBLIC_LOOP_ID,
  rootRunId: ACTIVE_STATUS_RUN_ID,
  previousRunId: LATEST_SUCCESSOR_RUN_ID,
});
const reportingPublicRun = minimalLineageRun(REPORTING_PUBLIC_TOP_RUN_ID, reportingPublicLoop);
const reportingPublicViewModel = buildTaskGraphViewModel(reportingPublicRun, { mode: "work-list" });
assert.equal(reportingPublicViewModel.graphId, REPORTING_PUBLIC_TOP_RUN_ID, "view models should preserve normal public top-level run ids");
assert.equal(reportingPublicViewModel.title, `Task graph ${REPORTING_PUBLIC_TOP_RUN_ID}`, "view models should preserve normal public run ids in titles");
const reportingPublicOutput = [
  renderStatus(reportingPublicRun),
  renderTaskGraphWidget(reportingPublicRun).join("\n"),
  renderTaskGraphFlowchart(reportingPublicRun, { format: "ascii", includeDone: true, maxLabelLength: 120 }),
].join("\n");
assert(reportingPublicOutput.includes(REPORTING_PUBLIC_TOP_RUN_ID), "normal public top-level run ids should remain visible in status/widget/ASCII flowchart output");
const reportingPublicDetails = sanitizeContinueAutoImproveResponseDetails({
  runId: REPORTING_PUBLIC_TOP_RUN_ID,
  loopId: REPORTING_PUBLIC_LOOP_ID,
  rootRunId: ACTIVE_STATUS_RUN_ID,
  previousRunId: LATEST_SUCCESSOR_RUN_ID,
});
assert.equal(reportingPublicDetails.runId, REPORTING_PUBLIC_TOP_RUN_ID, "response details should preserve normal public top-level run ids");
assert.equal(reportingPublicDetails.loopId, REPORTING_PUBLIC_LOOP_ID, "response details should preserve normal public autoimprove loop ids");
assert.equal(reportingPublicDetails.rootRunId, ACTIVE_STATUS_RUN_ID, "response details should preserve normal public root run ids");
assert.equal(reportingPublicDetails.previousRunId, LATEST_SUCCESSOR_RUN_ID, "response details should preserve normal public previous run ids");
const secretRunIdFlowchartLoop = lineageLoop(9, "Flowchart run id redaction fixture.", {
  rootRunId: secretShapedRunId,
  nextRunId: secretShapedSuccessorRunId,
  nextRunIds: [secretShapedSuccessorRunId],
});
const secretRunIdFlowchartRun: TaskGraphRun = {
  ...minimalLineageRun(secretShapedRunId, secretRunIdFlowchartLoop),
  metadata: {
    autoimproveLoop: secretRunIdFlowchartLoop,
    rootWorkQueue: secretRunIdQueue,
  },
};
const secretRunIdFlowchartViewModel = buildTaskGraphViewModel(secretRunIdFlowchartRun, { mode: "work-list", lineageByActiveRunId: secretRunIdLineageOptions.lineageByActiveRunId as never });
const secretRunIdFlowchartOutput = [
  renderTaskGraphFlowchart(secretRunIdFlowchartViewModel, { format: "ascii", includeDone: true, maxLabelLength: 120 }),
  renderTaskGraphFlowchart(secretRunIdFlowchartViewModel, { format: "mermaid", includeDone: true, maxLabelLength: 120 }),
].join("\n");
assert(secretRunIdFlowchartOutput.includes(REDACTED_LINEAGE_RUN_ID), "ASCII/Mermaid flowchart labels should show a run-id redaction placeholder for corrupt root-work run ids");
assert.doesNotMatch(secretRunIdFlowchartOutput, /api[_\s-]*key|private[_\s-]*key|legacy run id with spaces/i, "ASCII/Mermaid flowchart labels must not render secret-shaped or corrupt run ids verbatim");

const activeStatusLoop = lineageLoop(1, "Show derived lineage on status/widget surfaces.", { nextRunId: SUCCESSOR_STATUS_RUN_ID, nextRunIds: [SUCCESSOR_STATUS_RUN_ID] });
const activeStatusRun: TaskGraphRun = {
  ...minimalLineageRun(ACTIVE_STATUS_RUN_ID, activeStatusLoop),
  status: "ready",
  metadata: {
    autoimproveLoop: activeStatusLoop,
    rootWorkQueue: {
      version: 1,
      items: [
        {
          key: "lineage-status-fixture",
          kind: "autoimprove-loop",
          state: "active",
          title: "Lineage status fixture",
          purpose: "Render derived successor evidence without reconciling durable state.",
          input: { kind: "autoimprove-loop", objective: "Show derived lineage on status/widget surfaces.", oracleRequired: true },
          requestedBy: "user",
          originRunId: "lineage-validation-origin",
          activeRunId: ACTIVE_STATUS_RUN_ID,
          privacy: { sanitized: true },
        },
      ],
    },
  },
};
const successorStatusLoop = lineageLoop(2, "Terminal reconciliation fixture.", { previousRunId: ACTIVE_STATUS_RUN_ID, evidenceContextPaths: [STATUS_EVIDENCE_PATH] });
const successorStatusRun = minimalLineageRun(SUCCESSOR_STATUS_RUN_ID, successorStatusLoop);
fs.writeFileSync(path.join(lineageStatusCwd, ".pi", "dev-suite", "task-graph", "runs", `${SUCCESSOR_STATUS_RUN_ID}.json`), `${JSON.stringify(successorStatusRun, null, 2)}\n`);
const activeStatusRunFile = path.join(lineageStatusCwd, ".pi", "dev-suite", "task-graph", "runs", `${ACTIVE_STATUS_RUN_ID}.json`);
fs.writeFileSync(activeStatusRunFile, `${JSON.stringify(activeStatusRun, null, 2)}\n`);
const activeStatusRunFileHashBefore = fileSha256(activeStatusRunFile);

const activeStatusRunBeforeJson = JSON.stringify(activeStatusRun);
const statusWithDerivedLineage = renderStatus(activeStatusRun);
const widgetWithDerivedLineage = renderTaskGraphWidget(activeStatusRun).join("\n");
const tuiRootWorkLinesWithDerivedLineage = rootWorkLines(activeStatusRun).join("\n");
assert.equal(JSON.stringify(activeStatusRun), activeStatusRunBeforeJson, "status/widget/TUI lineage rendering must not mutate the input run object");
assert(statusWithDerivedLineage.includes(SUCCESSOR_STATUS_RUN_ID), "status should include the derived latest successor run id");
assert(statusWithDerivedLineage.includes("Decision: COMPLETE"), "status should include the derived COMPLETE decision");
assert(statusWithDerivedLineage.includes(STATUS_EVIDENCE_PATH), "status should include the public evidence path");
assert.match(statusWithDerivedLineage, /display-only/i, "status should label derived lineage as display-only");
assert.match(statusWithDerivedLineage, /durable root work remains ACTIVE/i, "status should preserve durable ACTIVE root-work wording");
assert(widgetWithDerivedLineage.includes(SUCCESSOR_STATUS_RUN_ID), "widget should include the derived latest successor run id");
assert.match(widgetWithDerivedLineage, /COMPLETE/, "widget should include the derived COMPLETE decision");
assert.match(widgetWithDerivedLineage, /display-only/i, "widget should label derived lineage as display-only");
assert(tuiRootWorkLinesWithDerivedLineage.includes(SUCCESSOR_STATUS_RUN_ID), "TUI root-work summary should include the derived latest successor run id");
assert(tuiRootWorkLinesWithDerivedLineage.includes("Decision: COMPLETE"), "TUI root-work summary should include the derived COMPLETE decision");
assert(tuiRootWorkLinesWithDerivedLineage.includes(STATUS_EVIDENCE_PATH), "TUI root-work summary should include the public evidence path");
assert.match(tuiRootWorkLinesWithDerivedLineage, /display-only/i, "TUI root-work summary should label derived lineage as display-only");
assert.match(tuiRootWorkLinesWithDerivedLineage, /durable root work remains ACTIVE/i, "TUI root-work summary should preserve durable ACTIVE root-work wording");
const asciiFlowchartWithDerivedLineage = renderTaskGraphFlowchart(activeStatusRun, { format: "ascii", includeDone: false, maxLabelLength: 120 });
const mermaidFlowchartWithDerivedLineage = renderTaskGraphFlowchart(activeStatusRun, { format: "mermaid", includeDone: false, maxLabelLength: 120 });
const flowchartWithDerivedLineage = `${asciiFlowchartWithDerivedLineage}\n${mermaidFlowchartWithDerivedLineage}`;
assert.equal(JSON.stringify(activeStatusRun), activeStatusRunBeforeJson, "flowchart lineage rendering must not mutate the input run object");
assert.equal(fileSha256(activeStatusRunFile), activeStatusRunFileHashBefore, "flowchart lineage rendering must not rewrite the historical run file");
assert(flowchartWithDerivedLineage.includes(SUCCESSOR_STATUS_RUN_ID), "ASCII/Mermaid flowcharts should include the derived latest successor run id");
assert(flowchartWithDerivedLineage.includes("Decision: COMPLETE"), "ASCII/Mermaid flowcharts should include the derived COMPLETE decision");
assert(flowchartWithDerivedLineage.includes(EVIDENCE_LABEL), "ASCII/Mermaid flowcharts should include the public evidence label");
assert(flowchartWithDerivedLineage.includes(STATUS_EVIDENCE_PATH), "ASCII/Mermaid flowcharts should include the public evidence path");
assert.match(flowchartWithDerivedLineage, /display-only/i, "ASCII/Mermaid flowcharts should label derived lineage as display-only");
assert.match(flowchartWithDerivedLineage, /durable root work remains ACTIVE/i, "ASCII/Mermaid flowcharts should preserve durable ACTIVE root-work wording");
const derivedSurfaceOutput = `${statusWithDerivedLineage}\n${widgetWithDerivedLineage}\n${tuiRootWorkLinesWithDerivedLineage}\n${flowchartWithDerivedLineage}`;
assert.doesNotMatch(derivedSurfaceOutput, /\/home\/tay\/\.pi\/agent\/sessions/i, "derived surfaces must not include raw session paths from evidence bodies");
assert.doesNotMatch(derivedSurfaceOutput, /promptInstructions|api_key=dummy/i, "derived surfaces must not include raw prompts or secret-shaped evidence body lines");

const statusSnapshotWithDerivedLineage = statusRunSnapshotFixture(activeStatusRun);
const statusSnapshotRendered = renderStatus(statusSnapshotWithDerivedLineage);
const activeStatusResponseDetails = taskGraphStatusResponseDetailsFixture(activeStatusRun);
const activeStatusResponseDetailsJson = JSON.stringify(activeStatusResponseDetails);
assert.equal(JSON.stringify(activeStatusRun), activeStatusRunBeforeJson, "status snapshot/details preparation must not mutate the original historical run object");
assert.equal(fileSha256(activeStatusRunFile), activeStatusRunFileHashBefore, "status snapshot/details preparation must not rewrite the historical run file");
assert(!Object.prototype.hasOwnProperty.call(activeStatusResponseDetails, "run"), "status response details must not include a raw run field");
assert(statusSnapshotRendered.includes(SUCCESSOR_STATUS_RUN_ID), "status snapshot should include the derived latest successor run id");
assert(statusSnapshotRendered.includes("Decision: COMPLETE"), "status snapshot should include the derived COMPLETE decision");
assert(statusSnapshotRendered.includes(STATUS_EVIDENCE_PATH), "status snapshot should include the public evidence path");
assert.match(statusSnapshotRendered, /display-only/i, "status snapshot should label derived lineage as display-only");
assert.match(statusSnapshotRendered, /durable root work remains ACTIVE/i, "status snapshot should preserve durable ACTIVE root-work wording");
assert(activeStatusResponseDetailsJson.includes(SUCCESSOR_STATUS_RUN_ID), "status response details should include the derived latest successor run id");
assert(activeStatusResponseDetailsJson.includes("Decision: COMPLETE"), "status response details should include the derived COMPLETE decision");
assert(activeStatusResponseDetailsJson.includes(STATUS_EVIDENCE_PATH), "status response details should include the public evidence path");
assert.match(activeStatusResponseDetailsJson, /display-only/i, "status response details should label derived lineage as display-only");
assert.match(activeStatusResponseDetailsJson, /durable root work remains ACTIVE/i, "status response details should preserve durable ACTIVE root-work wording");

const SECRET_ACTIVE_RUN_ID = "autoimprove-mpw8z7qa-active";
const SECRET_SUCCESSOR_RUN_ID = "autoimprove-mpw8z7qa-successor";
const SECRET_EVIDENCE_PATH = ".orchestration/lineage-secret/api_key=sk-test.md";
const SECRET_EVIDENCE_ABSOLUTE_PATH = path.join(lineageStatusCwd, SECRET_EVIDENCE_PATH);
fs.mkdirSync(path.dirname(SECRET_EVIDENCE_ABSOLUTE_PATH), { recursive: true });
fs.writeFileSync(SECRET_EVIDENCE_ABSOLUTE_PATH, [
  "# Secret-shaped evidence filename fixture",
  `- Current run: \`${SECRET_SUCCESSOR_RUN_ID}\``,
  `- Prior run being reconciled: \`${SECRET_ACTIVE_RUN_ID}\``,
  "Decision: COMPLETE",
].join("\n"));
const secretActiveLoop = lineageLoop(1, "Secret-shaped evidence filename fixture.", {
  rootRunId: SECRET_ACTIVE_RUN_ID,
  nextRunId: SECRET_SUCCESSOR_RUN_ID,
  nextRunIds: [SECRET_SUCCESSOR_RUN_ID],
});
const secretActiveRun: TaskGraphRun = {
  ...minimalLineageRun(SECRET_ACTIVE_RUN_ID, secretActiveLoop),
  status: "ready",
  metadata: {
    autoimproveLoop: secretActiveLoop,
    rootWorkQueue: {
      version: 1,
      items: [
        {
          key: "secret-evidence-filename-fixture",
          kind: "autoimprove-loop",
          state: "active",
          title: "Secret-shaped evidence filename fixture",
          purpose: "Render derived successor evidence without exposing secret-shaped evidence filenames.",
          input: { kind: "autoimprove-loop", objective: "Secret-shaped evidence filename fixture.", oracleRequired: true },
          requestedBy: "user",
          originRunId: "lineage-validation-origin",
          activeRunId: SECRET_ACTIVE_RUN_ID,
          privacy: { sanitized: true },
        },
      ],
    },
  },
};
const secretSuccessorLoop = lineageLoop(2, "Secret-shaped evidence filename fixture.", {
  rootRunId: SECRET_ACTIVE_RUN_ID,
  previousRunId: SECRET_ACTIVE_RUN_ID,
  evidenceContextPaths: [SECRET_EVIDENCE_PATH],
});
const secretSuccessorRun = minimalLineageRun(SECRET_SUCCESSOR_RUN_ID, secretSuccessorLoop);
fs.writeFileSync(path.join(lineageStatusCwd, ".pi", "dev-suite", "task-graph", "runs", `${SECRET_SUCCESSOR_RUN_ID}.json`), `${JSON.stringify(secretSuccessorRun, null, 2)}\n`);
const secretActiveRunBeforeJson = JSON.stringify(secretActiveRun);
const statusWithSecretEvidenceFilename = renderStatus(secretActiveRun);
const tuiWithSecretEvidenceFilename = rootWorkLines(secretActiveRun).join("\n");
const responseDetailsWithSecretEvidenceFilename = JSON.stringify(rootWorkResponseDetails(secretActiveRun));
const statusResponseDetailsWithSecretEvidenceFilename = taskGraphStatusResponseDetailsFixture(secretActiveRun);
assert.equal(JSON.stringify(secretActiveRun), secretActiveRunBeforeJson, "secret evidence filename rendering must not mutate the input run object");
assert(!Object.prototype.hasOwnProperty.call(statusResponseDetailsWithSecretEvidenceFilename, "run"), "secret evidence status response details must not include a raw run field");
const secretFilenameSurfaceOutput = `${statusWithSecretEvidenceFilename}\n${tuiWithSecretEvidenceFilename}\n${responseDetailsWithSecretEvidenceFilename}\n${JSON.stringify(statusResponseDetailsWithSecretEvidenceFilename)}`;
assert(secretFilenameSurfaceOutput.includes(SECRET_SUCCESSOR_RUN_ID), "secret evidence filename fixture should still show the successor run id");
assert(secretFilenameSurfaceOutput.includes("Decision: COMPLETE"), "secret evidence filename fixture should still show the COMPLETE decision");
assert(secretFilenameSurfaceOutput.includes("Evidence: Markdown evidence"), "secret-shaped evidence filenames should render a generic fallback evidence label");
assert.doesNotMatch(secretFilenameSurfaceOutput, /api[_\s-]*key|sk[\s-]*test|api_key=sk-test\.md/i, "secret-shaped evidence filenames/labels must not render in status, TUI, or response details");

const CONTINUE_RESPONSE_RUN_ID = "autoimprove-continue-secret-response";
const CONTINUE_RESPONSE_SECRET_HUMANIZED_PATH = ".orchestration/api key=sk test.md";
const CONTINUE_RESPONSE_SECRET_UNDERSCORE_PATH = ".orchestration/api_key=sk-test.md";
const CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH = [".orchestration", "lineage-secret", "api_" + "key-markdown-evidence.md"].join("/");
const CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_LABEL = "Evidence: " + "api_" + "key markdown evidence";
const CONTINUE_RESPONSE_SECRET_METADATA_KEY = "api_" + "key_metadata_path";
const CONTINUE_RESPONSE_SECRET_CAMEL_KEY = "api" + "KeyMetadataPath";
const CONTINUE_RESPONSE_COMPACT_SECRET_VALUE = "access" + "token" + "lineagewarning";
const CONTINUE_RESPONSE_SESSION_PATH = ["/home", "fixture", ".pi", "agent", "sessions", "task-detail-session", "artifact.md"].join("/");
const CONTINUE_RESPONSE_NORMAL_PATH = EVIDENCE_PATH;
const continueResponseLoop = lineageLoop(3, "Continue response details sanitizer fixture.", {
  rootRunId: CONTINUE_RESPONSE_RUN_ID,
  previousRunId: SECRET_ACTIVE_RUN_ID,
  evidenceContextPaths: [CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH, CONTINUE_RESPONSE_SECRET_HUMANIZED_PATH, CONTINUE_RESPONSE_SECRET_UNDERSCORE_PATH, CONTINUE_RESPONSE_NORMAL_PATH],
});
const continueResponseRun: TaskGraphRun = {
  ...minimalLineageRun(CONTINUE_RESPONSE_RUN_ID, continueResponseLoop),
  metadata: {
    autoimproveLoop: continueResponseLoop,
    rootWorkQueue: {
      version: 1,
      items: [
        {
          key: "continue-response-secret-fixture",
          kind: "autoimprove-loop",
          state: "active",
          title: "Continue response details sanitizer fixture",
          purpose: "Ensure continue_autoimprove response details redact secret-shaped evidence paths.",
          input: {
            kind: "autoimprove-loop",
            objective: "Continue response details sanitizer fixture.",
            evidencePaths: [CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH, CONTINUE_RESPONSE_SECRET_HUMANIZED_PATH, CONTINUE_RESPONSE_SECRET_UNDERSCORE_PATH, CONTINUE_RESPONSE_NORMAL_PATH],
            oracleRequired: true,
          },
          requestedBy: "user",
          originRunId: "lineage-validation-origin",
          activeRunId: CONTINUE_RESPONSE_RUN_ID,
          privacy: { sanitized: true },
          artifactId: CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH,
          artifactIds: [CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH, CONTINUE_RESPONSE_NORMAL_PATH],
          evidenceId: CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH,
          evidenceIds: [CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH, CONTINUE_RESPONSE_NORMAL_PATH],
        },
      ],
    },
  },
  config: {
    ...minimalLineageRun(CONTINUE_RESPONSE_RUN_ID, continueResponseLoop).config,
    autoimproveLoop: continueResponseLoop,
  },
};
const continueResponseDetails = {
  lineage: continueResponseLoop,
  nextRun: continueResponseRun,
  run: continueResponseRun,
  rootWorkSelection: {
    status: "selected",
    item: {
      key: "continue-response-secret-fixture",
      input: { kind: "autoimprove-loop", evidencePaths: [CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH, CONTINUE_RESPONSE_SECRET_HUMANIZED_PATH] },
    },
  },
  rootWork: {
    lineage: {
      [CONTINUE_RESPONSE_RUN_ID]: {
        evidence: { label: "Evidence: api key=sk test", path: CONTINUE_RESPONSE_SECRET_HUMANIZED_PATH },
      },
    },
  },
  warnings: [`Lineage warning references ${CONTINUE_RESPONSE_COMPACT_SECRET_VALUE} at ${CONTINUE_RESPONSE_NORMAL_PATH} for ${COMPACT_KEY_PUBLIC_RUN_ID}. Decision: COMPLETE`],
  evidencePathList: [CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH, CONTINUE_RESPONSE_NORMAL_PATH],
  artifactPath: CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH,
  artifactPathList: [CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH, CONTINUE_RESPONSE_NORMAL_PATH],
  artifactList: [CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH, CONTINUE_RESPONSE_NORMAL_PATH],
  evidenceLabel: CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_LABEL,
  evidenceLabels: [CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_LABEL],
  descriptorLike: {
    inputs: [CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH, CONTINUE_RESPONSE_NORMAL_PATH],
    outputs: [CONTINUE_RESPONSE_NORMAL_PATH],
    writeScope: [CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH, CONTINUE_RESPONSE_NORMAL_PATH],
    acceptanceChecks: [`No ${CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH}`],
  },
  [CONTINUE_RESPONSE_SECRET_METADATA_KEY + "_suffix"]: "secret-shaped metadata key should not render",
  [CONTINUE_RESPONSE_SECRET_CAMEL_KEY + "Suffix"]: "camelCase secret-shaped metadata key should not render",
  contextMarkdown: [
    "# Previous autoimprove run context",
    "",
    "## User-provided evidence paths",
    `- ${CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH} (missing or unreadable)`,
    `- ${CONTINUE_RESPONSE_SECRET_HUMANIZED_PATH} (missing or unreadable)`,
    `- ${CONTINUE_RESPONSE_SECRET_UNDERSCORE_PATH} (missing or unreadable)`,
    `- ${CONTINUE_RESPONSE_NORMAL_PATH} (123 bytes)`,
  ].join("\n"),
};
const continueResponseDetailsBeforeJson = JSON.stringify(continueResponseDetails);
const sanitizedContinueResponseDetails = sanitizeContinueAutoImproveResponseDetails(continueResponseDetails);
assert.equal(JSON.stringify(continueResponseDetails), continueResponseDetailsBeforeJson, "continue response details sanitization must not mutate run/detail inputs");

function assertNoContinueSecretEvidence(value: unknown, message: string) {
  const renderedValue = typeof value === "string" ? value : JSON.stringify(value);
  assert(!renderedValue.includes(CONTINUE_RESPONSE_SECRET_HUMANIZED_PATH), `${message}: humanized secret-shaped evidence path must not appear verbatim`);
  assert(!renderedValue.includes(CONTINUE_RESPONSE_SECRET_UNDERSCORE_PATH), `${message}: underscore secret-shaped evidence path must not appear verbatim`);
  assert(!renderedValue.includes(CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH), `${message}: no-assignment secret-shaped evidence path must not appear verbatim`);
  assert.doesNotMatch(renderedValue, /api[_\s-]*key|sk[\s-]*test/i, `${message}: secret-shaped evidence labels and token fragments must not appear`);
}

assertNoContinueSecretEvidence(sanitizedContinueResponseDetails.lineage, "sanitized continue response lineage details");
assertNoContinueSecretEvidence(sanitizedContinueResponseDetails.nextRun, "sanitized continue response nextRun details");
assertNoContinueSecretEvidence(sanitizedContinueResponseDetails.run, "sanitized continue response existing run details");
assertNoContinueSecretEvidence(sanitizedContinueResponseDetails.rootWorkSelection, "sanitized continue response rootWorkSelection details");
assertNoContinueSecretEvidence(sanitizedContinueResponseDetails.rootWork, "sanitized continue response rootWork details");
assertNoContinueSecretEvidence(sanitizedContinueResponseDetails.contextMarkdown, "sanitized continue response contextMarkdown details");
assert.equal(sanitizedContinueResponseDetails.rootWorkSelection.item.input.evidencePaths[0], REDACTED_SECRETISH_EVIDENCE_PATH, "no-assignment secret-shaped root-work selection evidence path should be redacted");
assert.equal(sanitizedContinueResponseDetails.nextRun.metadata?.rootWorkQueue?.items[0]?.input.evidencePaths?.[0], REDACTED_SECRETISH_EVIDENCE_PATH, "no-assignment secret-shaped queued root-work evidence path should be redacted");
assert.equal(sanitizedContinueResponseDetails.lineage.evidenceContextPaths?.[0], REDACTED_SECRETISH_EVIDENCE_PATH, "no-assignment secret-shaped lineage evidence context path should be redacted");
assert.equal(sanitizedContinueResponseDetails.evidencePathList[0], REDACTED_SECRETISH_EVIDENCE_PATH, "no-assignment secret-shaped evidence path lists should be redacted");
assert.equal(sanitizedContinueResponseDetails.artifactPath, REDACTED_SECRETISH_EVIDENCE_PATH, "no-assignment secret-shaped artifact path fields should be redacted");
assert.equal(sanitizedContinueResponseDetails.artifactPathList[0], REDACTED_SECRETISH_EVIDENCE_PATH, "no-assignment secret-shaped artifact path lists should be redacted");
assert.equal(sanitizedContinueResponseDetails.artifactList[0], REDACTED_SECRETISH_EVIDENCE_PATH, "no-assignment secret-shaped artifact lists should be redacted");
assert.equal(sanitizedContinueResponseDetails.evidenceLabel, GENERIC_MARKDOWN_EVIDENCE_LABEL, "secret-shaped evidence label-like fields should use the generic evidence label");
assert.equal(sanitizedContinueResponseDetails.evidenceLabels[0], GENERIC_MARKDOWN_EVIDENCE_LABEL, "secret-shaped evidence label lists should use the generic evidence label");
assert.equal(sanitizedContinueResponseDetails.descriptorLike.inputs[0], REDACTED_SECRETISH_EVIDENCE_PATH, "generic descriptor input strings with secret-shaped evidence should be redacted");
assert.equal(sanitizedContinueResponseDetails.descriptorLike.writeScope[0], REDACTED_SECRETISH_EVIDENCE_PATH, "generic descriptor writeScope strings with secret-shaped evidence should be redacted");
assert.equal(sanitizedContinueResponseDetails.descriptorLike.acceptanceChecks[0], REDACTED_SECRETISH_EVIDENCE_PATH, "generic descriptor acceptance checks with secret-shaped evidence should be redacted");
const sanitizedContinueResponseJson = JSON.stringify(sanitizedContinueResponseDetails);
assertNoContinueSecretEvidence(sanitizedContinueResponseDetails, "sanitized continue response all details");
assert.equal(sanitizedContinueResponseJson.includes(CONTINUE_RESPONSE_COMPACT_SECRET_VALUE), false, "compact secret-shaped warning values should not remain in sanitized continue response details");
const sanitizedCompactWarning = sanitizedContinueResponseDetails.warnings[0];
assert(sanitizedCompactWarning.includes(REDACTED_SECRETISH_EVIDENCE_PATH) || sanitizedCompactWarning.includes(REDACTED_LINEAGE_WARNING), "compact secret-shaped response-detail warnings should include a redaction placeholder");
assert(sanitizedCompactWarning.includes(CONTINUE_RESPONSE_NORMAL_PATH), "compact response-detail warnings should preserve normal public evidence paths");
assert(sanitizedCompactWarning.includes(COMPACT_KEY_PUBLIC_RUN_ID), "compact response-detail warnings should preserve public generated run ids");
assert(sanitizedCompactWarning.includes("Decision: COMPLETE"), "compact response-detail warnings should preserve public COMPLETE decisions");
assert(sanitizedContinueResponseJson.includes(CONTINUE_RESPONSE_NORMAL_PATH), "normal public evidence paths should remain in sanitized continue response details");
const safeLineageResponseSuffix = lineageResponseSuffix({
  lineageSource: "metadata",
  lineageWarnings: [`Missing ${CONTINUE_RESPONSE_SECRET_CAMEL_KEY} in ${CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH}`, `Public evidence ${CONTINUE_RESPONSE_NORMAL_PATH}`],
});
assertNoContinueSecretEvidence(safeLineageResponseSuffix, "plain text lineage response suffix");
assert(safeLineageResponseSuffix.includes(CONTINUE_RESPONSE_NORMAL_PATH), "plain text lineage response suffix should preserve normal public evidence paths");
const safeCompactLineageResponseSuffix = lineageResponseSuffix({
  lineageSource: "metadata",
  lineageWarnings: [`Compact warning ${CONTINUE_RESPONSE_COMPACT_SECRET_VALUE} at ${CONTINUE_RESPONSE_NORMAL_PATH}. Decision: COMPLETE`],
});
assert.equal(safeCompactLineageResponseSuffix.includes(CONTINUE_RESPONSE_COMPACT_SECRET_VALUE), false, "plain text lineage response suffix should redact compact warning values");
assert(safeCompactLineageResponseSuffix.includes(REDACTED_SECRETISH_EVIDENCE_PATH) || safeCompactLineageResponseSuffix.includes(REDACTED_LINEAGE_WARNING), "plain text lineage response suffix should include a redaction placeholder for compact warning values");
assert(safeCompactLineageResponseSuffix.includes(CONTINUE_RESPONSE_NORMAL_PATH), "plain text compact lineage response suffix should preserve normal public evidence paths");
assert(safeCompactLineageResponseSuffix.includes("Decision: COMPLETE"), "plain text compact lineage response suffix should preserve public COMPLETE decisions");

const rootWorkDetailsRunBeforeJson = JSON.stringify(continueResponseRun);
const rootWorkDetailsWithQueuedSecretEvidence = rootWorkResponseDetails(continueResponseRun);
const rootWorkDetailsQueueJson = JSON.stringify(rootWorkDetailsWithQueuedSecretEvidence?.queue);
assert.equal(JSON.stringify(continueResponseRun), rootWorkDetailsRunBeforeJson, "root work response details sanitization must not mutate queued root work metadata");
assert(rootWorkDetailsWithQueuedSecretEvidence, "root work response details fixture should include queued root work details");
assertNoContinueSecretEvidence(rootWorkDetailsWithQueuedSecretEvidence.queue, "root-work response queue details");
assert(rootWorkDetailsQueueJson.includes(CONTINUE_RESPONSE_NORMAL_PATH), "root-work response queue details should preserve the normal public evidence path");
const rootWorkDetailsItem = (rootWorkDetailsWithQueuedSecretEvidence.queue as RootWorkQueue).items[0] as (RootWorkQueue["items"][number] & { artifactId?: string; artifactIds?: string[]; evidenceId?: string; evidenceIds?: string[] }) | undefined;
const rootWorkDetailsInput = rootWorkDetailsItem?.input as { evidencePaths?: string[] } | undefined;
assert.equal(rootWorkDetailsInput?.evidencePaths?.[0], REDACTED_SECRETISH_EVIDENCE_PATH, "root-work response queue evidence paths should be sanitized");
assert.equal(rootWorkDetailsItem?.artifactId, REDACTED_SECRETISH_EVIDENCE_PATH, "root-work response queue artifact id-like fields should be sanitized");
assert.equal(rootWorkDetailsItem?.artifactIds?.[0], REDACTED_SECRETISH_EVIDENCE_PATH, "root-work response queue artifact id-like lists should be sanitized");
assert.equal(rootWorkDetailsItem?.artifactIds?.[1], CONTINUE_RESPONSE_NORMAL_PATH, "root-work response queue artifact id-like lists should preserve normal public paths");
assert.equal(rootWorkDetailsItem?.evidenceId, REDACTED_SECRETISH_EVIDENCE_PATH, "root-work response queue evidence id-like fields should be sanitized");
assert.equal(rootWorkDetailsItem?.evidenceIds?.[0], REDACTED_SECRETISH_EVIDENCE_PATH, "root-work response queue evidence id-like lists should be sanitized");
assert.equal(rootWorkDetailsItem?.evidenceIds?.[1], CONTINUE_RESPONSE_NORMAL_PATH, "root-work response queue evidence id-like lists should preserve normal public paths");

const rootWorkStatusSecretRun: TaskGraphRun = {
  ...activeStatusRun,
  metadata: {
    ...activeStatusRun.metadata,
    rootWorkQueue: {
      version: 1,
      items: [
        {
          ...activeStatusRun.metadata.rootWorkQueue!.items[0]!,
          key: CONTINUE_RESPONSE_SECRET_CAMEL_KEY,
          title: `Root work ${CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH}`,
          purpose: `Purpose ${CONTINUE_RESPONSE_SECRET_HUMANIZED_PATH}`,
        },
      ],
    },
  },
};
const rootWorkStatusSecretDetails = rootWorkResponseDetails(rootWorkStatusSecretRun);
assert(rootWorkStatusSecretDetails?.status, "root-work response details should include a status string for queued root work");
assertNoContinueSecretEvidence(rootWorkStatusSecretDetails.status, "root-work response status details");
assert(rootWorkStatusSecretDetails.status.includes(STATUS_EVIDENCE_PATH), "root-work response status should preserve the normal public terminal reconciliation path");
assert(rootWorkStatusSecretDetails.status.includes("Decision: COMPLETE"), "root-work response status should preserve public COMPLETE decisions");
assert(rootWorkStatusSecretDetails.status.includes(SUCCESSOR_STATUS_RUN_ID), "root-work response status should preserve public successor run ids");
const wrappedRootWorkStatusSecretDetails = sanitizeContinueAutoImproveResponseDetails(rootWorkStatusSecretDetails);
assertNoContinueSecretEvidence(wrappedRootWorkStatusSecretDetails, "wrapped root-work response status details");
assert(wrappedRootWorkStatusSecretDetails.status.includes(STATUS_EVIDENCE_PATH), "wrapped root-work response status should preserve the normal public terminal reconciliation path");
assert(wrappedRootWorkStatusSecretDetails.status.includes("Decision: COMPLETE"), "wrapped root-work response status should preserve public COMPLETE decisions");
assert(wrappedRootWorkStatusSecretDetails.status.includes(SUCCESSOR_STATUS_RUN_ID), "wrapped root-work response status should preserve public successor run ids");
const statusSecretDetailsRunBeforeJson = JSON.stringify(rootWorkStatusSecretRun);
const statusSecretDetails = taskGraphStatusResponseDetailsFixture(rootWorkStatusSecretRun);
const statusSecretDetailsJson = JSON.stringify(statusSecretDetails);
assert.equal(JSON.stringify(rootWorkStatusSecretRun), statusSecretDetailsRunBeforeJson, "status response details sanitization must not mutate queued root work metadata");
assert(!Object.prototype.hasOwnProperty.call(statusSecretDetails, "run"), "status response details must not include raw run details");
assertNoContinueSecretEvidence(statusSecretDetails, "status response details");
assert(statusSecretDetailsJson.includes(STATUS_EVIDENCE_PATH), "status response details should preserve the normal public terminal reconciliation path");
assert(statusSecretDetailsJson.includes("Decision: COMPLETE"), "status response details should preserve public COMPLETE decisions");
assert(statusSecretDetailsJson.includes(SUCCESSOR_STATUS_RUN_ID), "status response details should preserve public successor run ids");
assert.match(statusSecretDetailsJson, /display-only/i, "status response details should preserve display-only lineage wording");
assert.match(statusSecretDetailsJson, /durable root work remains ACTIVE/i, "status response details should preserve durable ACTIVE root-work wording");

const COMPACT_STATUS_ACTIVE_RUN_ID = "autoimprove-compact-status-active";
const COMPACT_STATUS_SUCCESSOR_RUN_ID = "autoimprove-compact-status-successor";
const COMPACT_STATUS_SECRET_COMPONENT = "access" + "token" + "responsepath";
const COMPACT_STATUS_PUBLIC_TERMINAL_FILENAME = "public-terminal-reconciliation-report.md";
const COMPACT_STATUS_EVIDENCE_PATH = [".orchestration", COMPACT_STATUS_SECRET_COMPONENT, COMPACT_STATUS_PUBLIC_TERMINAL_FILENAME].join("/");
const COMPACT_STATUS_EVIDENCE_ABSOLUTE_PATH = path.join(lineageStatusCwd, COMPACT_STATUS_EVIDENCE_PATH);
fs.mkdirSync(path.dirname(COMPACT_STATUS_EVIDENCE_ABSOLUTE_PATH), { recursive: true });
fs.writeFileSync(COMPACT_STATUS_EVIDENCE_ABSOLUTE_PATH, [
  "# Compact component terminal reconciliation fixture",
  `- Current run: \`${COMPACT_STATUS_SUCCESSOR_RUN_ID}\``,
  `- Prior run being reconciled: \`${COMPACT_STATUS_ACTIVE_RUN_ID}\``,
  "Decision: COMPLETE",
].join("\n"));
const compactStatusActiveLoop = lineageLoop(4, "Compact response detail path fixture.", {
  rootRunId: COMPACT_STATUS_ACTIVE_RUN_ID,
  nextRunId: COMPACT_STATUS_SUCCESSOR_RUN_ID,
  nextRunIds: [COMPACT_STATUS_SUCCESSOR_RUN_ID],
});
const compactStatusActiveRun: TaskGraphRun = {
  ...minimalLineageRun(COMPACT_STATUS_ACTIVE_RUN_ID, compactStatusActiveLoop),
  status: "ready",
  metadata: {
    autoimproveLoop: compactStatusActiveLoop,
    rootWorkQueue: {
      version: 1,
      items: [
        {
          key: "compact-response-detail-path-fixture",
          kind: "autoimprove-loop",
          state: "active",
          title: "Compact response detail path fixture",
          purpose: "Preserve public terminal evidence path components in response details.",
          input: { kind: "autoimprove-loop", objective: "Compact response detail path fixture.", oracleRequired: true },
          requestedBy: "user",
          originRunId: "lineage-validation-origin",
          activeRunId: COMPACT_STATUS_ACTIVE_RUN_ID,
          privacy: { sanitized: true },
        },
      ],
    },
  },
};
const compactStatusSuccessorLoop = lineageLoop(5, "Compact response detail path successor fixture.", {
  rootRunId: COMPACT_STATUS_ACTIVE_RUN_ID,
  previousRunId: COMPACT_STATUS_ACTIVE_RUN_ID,
  evidenceContextPaths: [COMPACT_STATUS_EVIDENCE_PATH],
});
const compactStatusSuccessorRun = minimalLineageRun(COMPACT_STATUS_SUCCESSOR_RUN_ID, compactStatusSuccessorLoop);
fs.writeFileSync(path.join(lineageStatusCwd, ".pi", "dev-suite", "task-graph", "runs", `${COMPACT_STATUS_SUCCESSOR_RUN_ID}.json`), `${JSON.stringify(compactStatusSuccessorRun, null, 2)}\n`);
const compactStatusActiveRunBeforeJson = JSON.stringify(compactStatusActiveRun);
const compactStatusRootWorkDetails = rootWorkResponseDetails(compactStatusActiveRun);
const compactStatusDetails = taskGraphStatusResponseDetailsFixture(compactStatusActiveRun);
const compactStatusDetailsJson = JSON.stringify(compactStatusDetails);
assert.equal(JSON.stringify(compactStatusActiveRun), compactStatusActiveRunBeforeJson, "compact response-details path sanitization must not mutate the active run");
assert(compactStatusRootWorkDetails?.status, "compact response-details fixture should include root-work status");
assert.equal(compactStatusRootWorkDetails.status.includes(COMPACT_STATUS_SECRET_COMPONENT), false, "root-work response status should omit compact secret-shaped path components");
assert(compactStatusRootWorkDetails.status.includes(COMPACT_STATUS_PUBLIC_TERMINAL_FILENAME), "root-work response status should preserve public terminal evidence path components");
assert(compactStatusRootWorkDetails.status.includes(COMPACT_STATUS_SUCCESSOR_RUN_ID), "root-work response status should preserve public latest successor run ids");
assert(compactStatusRootWorkDetails.status.includes("Decision: COMPLETE"), "root-work response status should preserve public COMPLETE decisions");
const compactStatusRootWorkPath = compactStatusRootWorkDetails.lineage[COMPACT_STATUS_ACTIVE_RUN_ID]?.evidence?.path;
assert.equal(compactStatusRootWorkPath?.includes(COMPACT_STATUS_SECRET_COMPONENT), false, "root-work response lineage path should omit compact secret-shaped path components");
assert(compactStatusRootWorkPath?.includes(COMPACT_STATUS_PUBLIC_TERMINAL_FILENAME), "root-work response lineage path should preserve public terminal evidence path components");
assert.equal(compactStatusDetailsJson.includes(COMPACT_STATUS_SECRET_COMPONENT), false, "status response details should omit compact secret-shaped path components");
assert(compactStatusDetailsJson.includes(COMPACT_STATUS_PUBLIC_TERMINAL_FILENAME), "status response details should preserve public terminal evidence path components");
assert(compactStatusDetailsJson.includes(COMPACT_STATUS_SUCCESSOR_RUN_ID), "status response details should preserve public latest successor run ids");
assert(compactStatusDetailsJson.includes("Decision: COMPLETE"), "status response details should preserve public COMPLETE decisions");
const compactStatusDetailsRootWork = (compactStatusDetails as { rootWork?: { lineage?: Record<string, { evidence?: { path?: string } }> } }).rootWork;
const compactStatusDetailsPath = compactStatusDetailsRootWork?.lineage?.[COMPACT_STATUS_ACTIVE_RUN_ID]?.evidence?.path;
assert.equal(compactStatusDetailsPath?.includes(COMPACT_STATUS_SECRET_COMPONENT), false, "status response details lineage path should omit compact secret-shaped path components");
assert(compactStatusDetailsPath?.includes(COMPACT_STATUS_PUBLIC_TERMINAL_FILENAME), "status response details lineage path should preserve public terminal evidence path components");

const taskDetailArtifactList = formatTaskDetailArtifactList([
  { id: CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH, type: "markdown", producerTaskId: "task-detail-fixture", createdAt: "2026-06-02T00:00:00.000Z" },
  { id: "public-artifact", type: "markdown", path: CONTINUE_RESPONSE_NORMAL_PATH, producerTaskId: "task-detail-fixture", createdAt: "2026-06-02T00:00:00.000Z" },
  { id: CONTINUE_RESPONSE_SECRET_HUMANIZED_PATH, type: "markdown", producerTaskId: "task-detail-fixture", createdAt: "2026-06-02T00:00:00.000Z" },
  { id: "session-artifact", type: "markdown", path: CONTINUE_RESPONSE_SESSION_PATH, producerTaskId: "task-detail-fixture", createdAt: "2026-06-02T00:00:00.000Z" },
]);
assertNoContinueSecretEvidence(taskDetailArtifactList, "TUI task-detail artifact rendering");
assert(!taskDetailArtifactList.includes(CONTINUE_RESPONSE_SESSION_PATH), "TUI task-detail artifact rendering must not expose absolute session paths");
assert(taskDetailArtifactList.includes("[redacted-session-path]"), "TUI task-detail artifact rendering should redact absolute session paths");
assert(taskDetailArtifactList.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "TUI task-detail artifact rendering should show a redacted placeholder");
assert(taskDetailArtifactList.includes(CONTINUE_RESPONSE_NORMAL_PATH), "TUI task-detail artifact rendering should preserve the normal public evidence path");
const taskDetailChangedFilesList = formatTaskDetailChangedFilesList([CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH, CONTINUE_RESPONSE_SESSION_PATH, "extensions/task-graph/ui.ts", CONTINUE_RESPONSE_NORMAL_PATH]);
assertNoContinueSecretEvidence(taskDetailChangedFilesList, "TUI task-detail changedFiles rendering");
assert(!taskDetailChangedFilesList.includes(CONTINUE_RESPONSE_SESSION_PATH), "TUI task-detail changedFiles rendering must not expose absolute session paths");
assert(taskDetailChangedFilesList.includes("[redacted-session-path]"), "TUI task-detail changedFiles rendering should redact absolute session paths");
assert(taskDetailChangedFilesList.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "TUI task-detail changedFiles rendering should show a redacted placeholder");
assert(taskDetailChangedFilesList.includes("extensions/task-graph/ui.ts"), "TUI task-detail changedFiles rendering should preserve a normal public source path");
assert(taskDetailChangedFilesList.includes(CONTINUE_RESPONSE_NORMAL_PATH), "TUI task-detail changedFiles rendering should preserve the normal public evidence path");
const taskDetailMetadataJson = JSON.stringify(sanitizeTaskMetadataForDetails({
  changedFiles: [CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH, CONTINUE_RESPONSE_SESSION_PATH, "extensions/task-graph/ui.ts", CONTINUE_RESPONSE_NORMAL_PATH],
  worker: { kind: "subagent", transcriptPath: CONTINUE_RESPONSE_SESSION_PATH },
  validationEvidence: [{ cwd: CONTINUE_RESPONSE_SESSION_PATH, stdoutTail: `wrote ${CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH}` }],
  childRun: { cwd: CONTINUE_RESPONSE_SESSION_PATH, runFile: CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH },
  [CONTINUE_RESPONSE_SECRET_METADATA_KEY]: "secret-shaped metadata keys must be redacted",
  [CONTINUE_RESPONSE_SECRET_CAMEL_KEY]: "camelCase secret-shaped metadata keys must be redacted",
  awaitingInput: { question: `Question ${CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH}`, recommended: CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH },
  nodeDescriptor: {
    stableKey: "task-detail-metadata-redaction",
    purpose: `Sanitize ${CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH}`,
    order: 1,
    inputs: [CONTINUE_RESPONSE_SESSION_PATH],
    outputs: [CONTINUE_RESPONSE_NORMAL_PATH],
    artifacts: [CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH, CONTINUE_RESPONSE_NORMAL_PATH],
    writeScope: [CONTINUE_RESPONSE_SESSION_PATH, "extensions/task-graph/ui.ts"],
    isolationBoundary: ["read-only"],
    acceptanceChecks: [`No ${CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH}`],
  },
} as any));
assertNoContinueSecretEvidence(taskDetailMetadataJson, "TUI task-detail metadata JSON rendering");
assert(!taskDetailMetadataJson.includes(CONTINUE_RESPONSE_SESSION_PATH), "TUI task-detail metadata JSON rendering must not expose absolute session paths");
assert(taskDetailMetadataJson.includes("[redacted-session-path]"), "TUI task-detail metadata JSON rendering should redact absolute session paths");
assert(taskDetailMetadataJson.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "TUI task-detail metadata JSON rendering should show a redacted placeholder");
assert(taskDetailMetadataJson.includes("extensions/task-graph/ui.ts"), "TUI task-detail metadata JSON rendering should preserve a normal public source path");
assert(taskDetailMetadataJson.includes(CONTINUE_RESPONSE_NORMAL_PATH), "TUI task-detail metadata JSON rendering should preserve the normal public evidence path");

const rowDescriptorTask: TaskNode = {
  id: "task-detail-row-redaction",
  kind: "IMPLEMENT",
  title: "Task row descriptor redaction fixture",
  description: "Ensure list row descriptor fields are sanitized.",
  status: "pending",
  priority: "B",
  blockedBy: [],
  blocks: [],
  runner: { kind: "subagent", name: "implementer", sideEffects: "write", writePolicy: { declaredPaths: [], allowOutsideDeclaredPaths: true } },
  subagent: { type: "implementer", context: "fresh" },
  attempts: [],
  artifacts: [],
  metadata: {
    source: "lineage-validation",
    nodeDescriptor: {
      stableKey: CONTINUE_RESPONSE_SECRET_CAMEL_KEY,
      purpose: `Render ${CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH}`,
      order: 1,
      inputs: [],
      outputs: [],
      artifacts: [],
      writeScope: [],
      isolationBoundary: [],
      acceptanceChecks: [],
    },
  },
  createdAt: "2026-06-02T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
};
const rowDescriptorRun: TaskGraphRun = {
  ...minimalLineageRun("task-detail-row-run", continueResponseLoop),
  rootTaskIds: [rowDescriptorTask.id],
  tasks: { [rowDescriptorTask.id]: rowDescriptorTask },
  status: "pending",
};
const rowDescriptorViewModelJson = JSON.stringify(buildTaskGraphViewModel(rowDescriptorRun).rows);
assertNoContinueSecretEvidence(rowDescriptorViewModelJson, "TUI task row descriptor rendering");
assert(rowDescriptorViewModelJson.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "TUI task row descriptor rendering should include redacted placeholders");
const rowDescriptorStatus = renderStatus(rowDescriptorRun, { expanded: true });
assertNoContinueSecretEvidence(rowDescriptorStatus, "status task-list descriptor rendering");
assert(rowDescriptorStatus.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "status task-list descriptor rendering should include redacted placeholders");

const displayWarningLoop = lineageLoop(4, "Lineage warning display redaction fixture.", {
  lineageWarnings: [
    `lineage warning references ${CONTINUE_RESPONSE_SECRET_CAMEL_KEY} at ${CONTINUE_RESPONSE_SECRET_NO_ASSIGNMENT_PATH}`,
    `lineage warning references ${CONTINUE_RESPONSE_COMPACT_SECRET_VALUE} at ${CONTINUE_RESPONSE_NORMAL_PATH}. Decision: COMPLETE`,
    `lineage warning references public evidence ${CONTINUE_RESPONSE_NORMAL_PATH}`,
  ],
});
const displayWarningRun = minimalLineageRun("autoimprove-warning-display", displayWarningLoop);
const displayWarningOutput = [
  JSON.stringify(buildTaskGraphViewModel(displayWarningRun).actionableWarnings),
  renderStatus(displayWarningRun),
  renderTaskGraphWidget(displayWarningRun).join("\n"),
].join("\n");
assertNoContinueSecretEvidence(displayWarningOutput, "lineage display warning status/widget/view-model rendering");
assert.equal(displayWarningOutput.includes(CONTINUE_RESPONSE_COMPACT_SECRET_VALUE), false, "lineage display warnings should redact compact secret-shaped warning values");
assert(displayWarningOutput.includes(CONTINUE_RESPONSE_NORMAL_PATH), "lineage display warnings should preserve normal public paths");
assert(displayWarningOutput.includes("Decision: COMPLETE"), "lineage display warnings should preserve public COMPLETE decisions in compact-warning context");
assert(displayWarningOutput.includes(REDACTED_SECRETISH_EVIDENCE_PATH) || displayWarningOutput.includes("[redacted-lineage-warning]"), "lineage display warnings should include a redaction placeholder");

const WARNING_ACTIVE_RUN_ID = "autoimprove-warning-active";
const WARNING_SUCCESSOR_RUN_ID = "autoimprove-warning-successor";
const WARNING_MISSING_SECRET_PATH = [".orchestration", "warning-fixtures", "api_" + "key-alpha17-proof.md"].join("/");
const WARNING_INVALID_SECRET_PATH = [".orchestration", "warning-fixtures", "private_" + "key-beta23-proof.md"].join("/");
const WARNING_PUBLIC_PATH = EVIDENCE_PATH;
const WARNING_SECRET_FRAGMENT_PATTERN = /api[_\s-]*key|private[_\s-]*key|alpha17|beta23/i;
const warningSmokeCwd = fs.mkdtempSync(path.join(os.tmpdir(), "task-graph-lineage-warning-smoke-"));
fs.mkdirSync(path.join(warningSmokeCwd, ".pi", "dev-suite", "task-graph", "runs"), { recursive: true });
fs.mkdirSync(path.dirname(path.join(warningSmokeCwd, WARNING_INVALID_SECRET_PATH)), { recursive: true });
fs.writeFileSync(path.join(warningSmokeCwd, WARNING_INVALID_SECRET_PATH), [
  "# Invalid warning redaction fixture",
  "Decision: COMPLETE",
].join("\n"));
fs.mkdirSync(path.dirname(path.join(warningSmokeCwd, WARNING_PUBLIC_PATH)), { recursive: true });
fs.writeFileSync(path.join(warningSmokeCwd, WARNING_PUBLIC_PATH), [
  "# Public warning redaction fixture",
  `- Current run: \`${WARNING_SUCCESSOR_RUN_ID}\``,
  `- Prior run being reconciled: \`${WARNING_ACTIVE_RUN_ID}\``,
  "Decision: COMPLETE",
].join("\n"));
const warningActiveLoop = lineageLoop(1, "Warning redaction fixture.", {
  rootRunId: WARNING_ACTIVE_RUN_ID,
  nextRunId: WARNING_SUCCESSOR_RUN_ID,
  nextRunIds: [WARNING_SUCCESSOR_RUN_ID],
});
const warningActiveRun: TaskGraphRun = {
  ...minimalLineageRun(WARNING_ACTIVE_RUN_ID, warningActiveLoop),
  cwd: warningSmokeCwd,
  status: "ready",
  metadata: {
    autoimproveLoop: warningActiveLoop,
    rootWorkQueue: {
      version: 1,
      items: [
        {
          key: "warning-redaction-fixture",
          kind: "autoimprove-loop",
          state: "active",
          title: "Warning redaction fixture",
          purpose: "Render warning-bearing lineage without exposing sensitive evidence path fixtures.",
          input: { kind: "autoimprove-loop", objective: "Warning redaction fixture.", oracleRequired: true },
          requestedBy: "user",
          originRunId: "lineage-validation-origin",
          activeRunId: WARNING_ACTIVE_RUN_ID,
          privacy: { sanitized: true },
        },
      ],
    },
  },
};
const warningSuccessorLoop = lineageLoop(2, "Warning redaction fixture.", {
  rootRunId: WARNING_ACTIVE_RUN_ID,
  previousRunId: WARNING_ACTIVE_RUN_ID,
  evidenceContextPaths: [WARNING_MISSING_SECRET_PATH, WARNING_INVALID_SECRET_PATH, WARNING_PUBLIC_PATH],
});
const warningSuccessorRun: TaskGraphRun = {
  ...minimalLineageRun(WARNING_SUCCESSOR_RUN_ID, warningSuccessorLoop),
  cwd: warningSmokeCwd,
};
fs.writeFileSync(path.join(warningSmokeCwd, ".pi", "dev-suite", "task-graph", "runs", `${WARNING_SUCCESSOR_RUN_ID}.json`), `${JSON.stringify(warningSuccessorRun, null, 2)}\n`);

function assertNoWarningSecretEvidence(value: unknown, message: string) {
  const renderedValue = typeof value === "string" ? value : JSON.stringify(value);
  assert(!renderedValue.includes(WARNING_MISSING_SECRET_PATH), `${message}: missing secret-shaped evidence path must not appear verbatim`);
  assert(!renderedValue.includes(WARNING_INVALID_SECRET_PATH), `${message}: invalid secret-shaped evidence path must not appear verbatim`);
  assert.doesNotMatch(renderedValue, WARNING_SECRET_FRAGMENT_PATTERN, `${message}: secret-shaped evidence path fragments must not appear`);
}

const warningActiveRunBeforeJson = JSON.stringify(warningActiveRun);
const warningLineage = deriveRootWorkLineageByActiveRunId(warningActiveRun);
const warningLineageJson = JSON.stringify(warningLineage);
assert.match(warningLineageJson, /missing or unreadable/i, "lineage should record a warning for missing evidence");
assert.match(warningLineageJson, /lacks required public markers/i, "lineage should record a warning for invalid evidence");
assert(warningLineageJson.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "lineage warning paths should use the redacted evidence path placeholder");
assert(warningLineageJson.includes(WARNING_PUBLIC_PATH), "lineage should preserve the normal public evidence path");
assert.equal(warningLineage[WARNING_ACTIVE_RUN_ID]?.decision, "COMPLETE", "lineage should preserve the COMPLETE public evidence decision");
assertNoWarningSecretEvidence(warningLineage, "derived lineage warnings");
const warningStatusAndTuiOutput = `${renderStatus(warningActiveRun)}\n${rootWorkLines(warningActiveRun).join("\n")}`;
assert(warningStatusAndTuiOutput.includes(WARNING_PUBLIC_PATH), "status/TUI warning smoke should preserve the normal public evidence path");
assert(warningStatusAndTuiOutput.includes("Decision: COMPLETE"), "status/TUI warning smoke should preserve COMPLETE decision rendering");
assertNoWarningSecretEvidence(warningStatusAndTuiOutput, "status/TUI warning smoke output");
const warningRootWorkDetails = rootWorkResponseDetails(warningActiveRun);
const warningRootWorkDetailsJson = JSON.stringify(warningRootWorkDetails);
assert(warningRootWorkDetailsJson.includes(WARNING_PUBLIC_PATH), "root-work response details should preserve the normal public evidence path");
assert(warningRootWorkDetailsJson.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "root-work response details should include a placeholder for redacted secret-shaped evidence warning paths");
assertNoWarningSecretEvidence(warningRootWorkDetails, "root-work response details warning smoke");
const warningRawDetails = {
  warnings: [
    `Markdown evidence missing or unreadable: ${WARNING_MISSING_SECRET_PATH}`,
    `Markdown evidence lacks required public markers: ${WARNING_INVALID_SECRET_PATH}`,
    `Markdown evidence missing or unreadable: ${WARNING_PUBLIC_PATH}`,
  ],
  lineageWarnings: [
    `Markdown evidence missing or unreadable: ${WARNING_MISSING_SECRET_PATH}`,
  ],
  rootWork: warningRootWorkDetails,
};
const warningSanitizedDetails = sanitizeContinueAutoImproveResponseDetails(warningRawDetails);
const warningSanitizedDetailsJson = JSON.stringify(warningSanitizedDetails);
assert(warningSanitizedDetailsJson.includes(WARNING_PUBLIC_PATH), "sanitized warning details should preserve the normal public evidence path");
assert(warningSanitizedDetailsJson.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "sanitized warning details should include a placeholder for redacted secret-shaped evidence warning paths");
assertNoWarningSecretEvidence(warningSanitizedDetails, "sanitized continue response warning details");
assert.equal(JSON.stringify(warningActiveRun), warningActiveRunBeforeJson, "warning leak smoke must not mutate the active run object");

console.log("task graph root work lineage validation passed");
