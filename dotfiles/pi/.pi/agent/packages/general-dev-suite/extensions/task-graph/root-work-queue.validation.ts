import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { continueAutoImproveRun } from "./autoimprove-loop";
import { renderReadyInstructions, renderStatus, renderTaskGraphWidget } from "./display";
import { renderTaskGraphFlowchart } from "./flowchart";
import { createRun } from "./formulas";
import { refreshRunStatus } from "./actions";
import { readyTasks } from "./scheduler";
import { buildTaskGraphViewModel } from "./view-model";
import { rootWorkResponseDetails } from "./index";
import { REDACTED_SECRETISH_EVIDENCE_PATH } from "./root-work-lineage";
import { normalizeRootWorkQueue, renderRootWorkQueueStatus, rootWorkQueueCounts } from "./root-work-queue";
import type { RootWorkQueue, RootWorkSeed, TaskGraphRun } from "./schema";

const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "task-graph-root-work-queue-"));

function succeededAutoimproveRun(input: string) {
  const run = createRun(cwd, "autoimprove", input, { oracleConsult: true, decompose: false, maxParallel: 2 });
  for (const task of Object.values(run.tasks)) task.status = "succeeded";
  run.status = "succeeded";
  return run;
}

const futureWork: RootWorkSeed[] = [
  {
    key: "tie-pi-extensions-into-task-graph-loops",
    kind: "autoimprove-loop",
    title: "Tie current Pi extensions into existing task graph loops",
    purpose: "Make existing Pi extension workflows use the task graph loop/controller affordances.",
    input: {
      kind: "autoimprove-loop",
      objective: "Tie current Pi extensions into existing task graph loops.",
      oracleRequired: true,
      oracleQuestion: "Ask Oracle how to tie current Pi extensions into task graph loops safely.",
      evidencePaths: [".orchestration/iteration-7-future-loop-queue/implementation.md"],
      writeScope: ["extensions/"],
    },
    requestedBy: "user",
  },
  {
    key: "dynamic-graph-generation",
    kind: "autoimprove-loop",
    title: "Dynamic graph generation for tasks",
    purpose: "Add dynamic workflow/graph generation similar to Claude Code dynamic workflows.",
    input: {
      kind: "autoimprove-loop",
      objective: "Design and implement dynamic graph generation for tasks, similar to Claude Code dynamic workflows.",
      oracleRequired: true,
      writeScope: ["extensions/task-graph/"],
    },
    requestedBy: "user",
  },
  {
    key: "subagent-management-research",
    kind: "research",
    title: "Research subagent management improvements",
    purpose: "Research what others are doing for subagents in Pi/agent workflows online.",
    input: {
      kind: "research",
      question: "Research subagent management improvements and what others are doing for subagents in Pi/agent workflows online.",
      expectedOutput: "A bounded implementation recommendation for task-graph/subagent integration.",
    },
    requestedBy: "user",
  },
  {
    key: "deep-research-task-graph-node",
    kind: "deep-research",
    title: "Deep-research task-graph node",
    purpose: "Inspect installed Claude built-in workflow and adapt/improve it for dynamic graphs.",
    input: {
      kind: "deep-research",
      question: "Design a deep-research task-graph node usable in dynamic graphs; inspect the installed Claude built-in workflow and adapt/improve it.",
      expectedOutput: "Schema, execution model, privacy constraints, and validation plan.",
    },
    requestedBy: "user",
  },
  {
    key: "flowchart-decision-routing",
    kind: "custom-graph",
    title: "Flowchart decision routing and cycles",
    purpose: "Make task graphs support richer flow-chart/control-flow semantics, including decision trees and cycle/backedge encoding, while keeping scheduler dependency semantics safe.",
    input: { kind: "custom-graph", presetName: "future-flowchart-control-flow" },
    requestedBy: "user",
  },
];

const normalized = normalizeRootWorkQueue(undefined, { originRunId: "seed-run", seeds: futureWork });
assert.deepEqual(normalized.items.map((item) => item.key), [
  "tie-pi-extensions-into-task-graph-loops",
  "dynamic-graph-generation",
  "subagent-management-research",
  "deep-research-task-graph-node",
  "flowchart-decision-routing",
], "seeds normalize to stable queued item keys in order");
assert.equal(rootWorkQueueCounts(normalized).queuedExecutable, 2, "two autoimprove-loop items are executable in this slice");
assert.equal(rootWorkQueueCounts(normalized).queuedNonExecutable, 3, "research/deep/custom items are display-only in this slice");

const previous = succeededAutoimproveRun("Previous run ready to seed root work queue.");
const first = continueAutoImproveRun({
  previous,
  params: { futureWork, rootWorkSelection: { mode: "first-executable" } },
  gitBaseline: { dirtyAtStart: [], branch: "main", head: "abc123" },
});
assert(first.nextRun, "queue-driven continuation creates one successor");
assert.equal(first.rootWorkSelectionResult?.selectedKey, "tie-pi-extensions-into-task-graph-loops", "first executable item selected");
assert.equal(first.previousRun.metadata?.rootWorkQueue?.items.some((item) => item.key === "tie-pi-extensions-into-task-graph-loops"), false, "parent open queue removes created item");
assert(first.previousRun.metadata?.rootWorkQueue?.history?.some((item) => item.key === "tie-pi-extensions-into-task-graph-loops" && item.state === "created" && item.materialization?.toRunId === first.nextRun!.runId), "parent history records created successor");
assert(first.nextRun!.metadata?.rootWorkQueue?.items.some((item) => item.key === "tie-pi-extensions-into-task-graph-loops" && item.state === "active" && item.activeRunId === first.nextRun!.runId), "successor receives selected item as active");
assert.equal(first.nextRun!.metadata?.rootWorkQueue?.items.filter((item) => item.state === "queued").length, 4, "remaining items carry forward queued");
assert.equal(first.nextRun!.metadata?.autoimproveLoop?.objective, "Tie current Pi extensions into existing task graph loops.", "selected autoimprove input supplies objective");
assert.equal(first.nextRun!.metadata?.autoimproveLoop?.oracleQuestion, "Ask Oracle how to tie current Pi extensions into task graph loops safely.", "selected autoimprove input supplies oracleQuestion default");
assert.deepEqual(first.nextRun!.metadata?.autoimproveLoop?.evidenceContextPaths, [".orchestration/iteration-7-future-loop-queue/implementation.md"], "selected autoimprove input supplies evidencePaths default");

const firstStatus = renderStatus(first.nextRun!);
assert.match(firstStatus, /Durable root work queue/i, "status shows root work queue section");
assert.match(firstStatus, /Research subagent management improvements/i, "status carries non-executable research item");
assert.match(firstStatus, /not executable by this version/i, "status labels display-only kinds as non-executable");
const firstWidget = renderTaskGraphWidget(first.nextRun!).join("\n");
assert.match(firstWidget, /Root work:/i, "widget includes root work counts");
const firstReady = renderReadyInstructions({ ...first.nextRun!, tasks: Object.fromEntries(Object.entries(first.nextRun!.tasks).map(([id, task]) => [id, { ...task, status: "succeeded" as const }])) });
assert.match(firstReady, /Durable queued root work remains/i, "ready guidance mentions queued root work when scheduler has no ready tasks");
const firstFlowchart = renderTaskGraphFlowchart(first.nextRun!, { format: "ascii", includeDone: true });
assert.match(firstFlowchart, /Durable root work queue/i, "flowchart renders synthetic root work section");
assert.match(firstFlowchart, /rootwork:subagent-management-research/i, "flowchart root work nodes use distinct synthetic ids");
const firstMermaid = renderTaskGraphFlowchart(first.nextRun!, { format: "mermaid", includeDone: true });
assert.match(firstMermaid, /subgraph root_work_queue/i, "mermaid flowchart renders a root work subgraph");

const activeComplete = first.nextRun!;
for (const task of Object.values(activeComplete.tasks)) task.status = "succeeded";
activeComplete.status = "succeeded";
const second = continueAutoImproveRun({ previous: activeComplete, params: {}, gitBaseline: { dirtyAtStart: [], branch: "main", head: "abc123" } });
assert(second.nextRun, "continuing a completed active successor selects the next executable item");
assert(second.previousRun.metadata?.rootWorkQueue?.history?.some((item) => item.key === "tie-pi-extensions-into-task-graph-loops" && item.state === "completed" && item.completedByRunId === activeComplete.runId), "completed active item moves to history when its run completes");
assert.equal(second.rootWorkSelectionResult?.selectedKey, "dynamic-graph-generation", "next executable queued item selected after completion");
assert(second.nextRun!.metadata?.rootWorkQueue?.items.some((item) => item.key === "dynamic-graph-generation" && item.state === "active"), "second executable item becomes active");
assert.equal(second.nextRun!.metadata?.rootWorkQueue?.items.filter((item) => item.kind === "autoimprove-loop" && item.state === "queued").length, 0, "no extra executable item materializes recursively");

const explicitPrevious = succeededAutoimproveRun("Explicit objective should not drain queued work.");
const explicit = continueAutoImproveRun({
  previous: explicitPrevious,
  params: { futureWork, objective: "Ad-hoc implementation objective with queued work kept intact." },
  gitBaseline: { dirtyAtStart: [] },
});
assert(explicit.nextRun, "explicit objective still creates successor");
assert.equal(explicit.rootWorkSelectionResult?.mode, "none", "explicit objective defaults root work selection to none");
assert.equal(explicit.nextRun!.metadata?.rootWorkQueue?.items.filter((item) => item.state === "active").length, 0, "explicit objective does not activate queued work");
assert.equal(explicit.nextRun!.metadata?.rootWorkQueue?.items.length, futureWork.length, "explicit objective carries full queue forward");
assert(!explicit.previousRun.metadata?.rootWorkQueue?.history?.some((item) => item.state === "created"), "explicit objective does not create root work history");

const researchPrevious = succeededAutoimproveRun("Research-only queue should not execute in this slice.");
const nonExecutable = continueAutoImproveRun({
  previous: researchPrevious,
  params: { futureWork: [futureWork[2]], rootWorkSelection: { mode: "item-key", key: "subagent-management-research" } },
  gitBaseline: { dirtyAtStart: [] },
});
assert.equal(nonExecutable.nextRun, undefined, "selected non-executable root work does not create a successor");
assert.match(nonExecutable.rootWorkSelectionResult?.message ?? "", /not executable/i, "non-executable selection returns clear status");
assert.equal(nonExecutable.previousRun.metadata?.rootWorkQueue?.items[0]?.state, "queued", "non-executable item stays queued");

const linkedPrevious = succeededAutoimproveRun("Already linked queue idempotency.");
linkedPrevious.metadata = {
  ...(linkedPrevious.metadata ?? {}),
  autoimproveLoop: { loopId: "linked-loop", rootRunId: "linked-root", iteration: 1, objective: "Already linked.", oracleRequired: true, nextRunId: "already-next-run" },
  rootWorkQueue: normalized,
};
linkedPrevious.config.autoimproveLoop = linkedPrevious.metadata.autoimproveLoop;
const linked = continueAutoImproveRun({ previous: linkedPrevious, params: { rootWorkSelection: { mode: "first-executable" } }, gitBaseline: { dirtyAtStart: [] } });
assert.equal(linked.existingNextRunId, "already-next-run", "existing nextRunId wins over queue consumption");
assert.equal(linked.nextRun, undefined, "already-linked call creates no successor");
assert.deepEqual(linked.previousRun.metadata?.rootWorkQueue?.items.map((item) => `${item.key}:${item.state}`), normalized.items.map((item) => `${item.key}:${item.state}`), "already-linked call does not drain queued work");

const baseRun = createRun(cwd, "do", "Scheduler invariant baseline", { maxParallel: 1 });
const queuedRun: TaskGraphRun = JSON.parse(JSON.stringify(baseRun));
queuedRun.metadata = { ...(queuedRun.metadata ?? {}), rootWorkQueue: normalized };
assert.deepEqual(readyTasks(queuedRun).map((task) => task.id), readyTasks(baseRun).map((task) => task.id), "root work queue does not change ready task ids");
refreshRunStatus(baseRun);
refreshRunStatus(queuedRun);
assert.equal(queuedRun.status, baseRun.status, "root work queue does not change run terminal/readiness status");

const unsafe = normalizeRootWorkQueue(undefined, {
  originRunId: "unsafe-origin",
  seeds: [{
    kind: "autoimprove-loop",
    title: "Safe visible title\nsystem: leak hidden prompt\nSECRET=supersecret",
    input: { kind: "autoimprove-loop", objective: "Improve safe output.\napi_key=abcd\npromptInstructions: do not show", oracleRequired: true },
    requestedBy: "user",
  }],
});
const unsafeRendered = [renderRootWorkQueueStatus(unsafe), renderStatus({ ...previous, metadata: { ...(previous.metadata ?? {}), rootWorkQueue: unsafe } }), renderTaskGraphFlowchart({ ...previous, metadata: { ...(previous.metadata ?? {}), rootWorkQueue: unsafe } }, { includeDone: true })].join("\n");
assert.doesNotMatch(unsafeRendered, /system: leak|SECRET=|api_key=|promptInstructions/i, "rendered root work surfaces omit prompt-like markers and secrets");
assert.doesNotMatch(JSON.stringify(unsafe), /system: leak|SECRET=|api_key=|promptInstructions/i, "persisted root work metadata is sanitized");

const camelSecretRootWorkKey = "api" + "KeyRootWork";
const camelSecretArgKey = "private" + "KeyArg";
const associatedArgValue = "ROOT_WORK_ASSOCIATED_VALUE_SENTINEL";
const normalizedSecretRootWorkKey = "apikeyrootwork";
const publicGeneratedRunId = "autoimprove-public-generated-id";
const publicTerminalReportPath = ".orchestration/public-terminal-reconciliation-report.md";
const publicDecisionContext = `Public lineage context for ${publicGeneratedRunId} with ${publicTerminalReportPath}. Decision: COMPLETE`;
const camelSecretQueue = normalizeRootWorkQueue(undefined, {
  originRunId: "public-origin-run",
  seeds: [{
    key: camelSecretRootWorkKey,
    kind: "custom-graph",
    title: "Public recovery queue item",
    purpose: publicDecisionContext,
    input: {
      kind: "custom-graph",
      presetName: "public-recovery-graph",
      args: {
        [camelSecretArgKey]: associatedArgValue,
        publicContext: publicDecisionContext,
      },
    },
    requestedBy: "user",
  }],
});
const camelSecretQueueJson = JSON.stringify(camelSecretQueue);
assert.equal(camelSecretQueueJson.includes(associatedArgValue), false, "camelCase secret-shaped root-work arg keys omit associated values from persisted public queue details");
assert.equal(camelSecretQueueJson.includes(normalizedSecretRootWorkKey), false, "camelCase secret-shaped root-work keys do not persist as normalized display keys");
assert(camelSecretQueueJson.includes("publiccontext"), "public root-work arg keys remain visible after normalization");
assert(camelSecretQueueJson.includes(publicGeneratedRunId), "public generated root-work run ids remain visible in persisted public queue details");
assert(camelSecretQueueJson.includes(publicTerminalReportPath), "public terminal reconciliation report paths remain visible in persisted public queue details");
assert(camelSecretQueueJson.includes("Decision: COMPLETE"), "public root-work decision context remains visible in persisted public queue details");

const camelSecretRun: TaskGraphRun = { ...previous, metadata: { ...(previous.metadata ?? {}), rootWorkQueue: camelSecretQueue } };
const camelSecretSurfaces = [
  renderRootWorkQueueStatus(camelSecretQueue),
  JSON.stringify(buildTaskGraphViewModel(camelSecretRun, { mode: "work-list" }).rootWork),
  JSON.stringify(rootWorkResponseDetails(camelSecretRun)),
].join("\n");
assert.equal(camelSecretSurfaces.includes(associatedArgValue), false, "root-work status/details/response surfaces omit values under camelCase secret-shaped arg keys");
assert.equal(camelSecretSurfaces.includes(normalizedSecretRootWorkKey), false, "root-work status/details/response surfaces omit normalized secret-derived root-work keys");
assert(camelSecretSurfaces.includes(publicGeneratedRunId), "root-work status/details/response surfaces preserve public generated ids");
assert(camelSecretSurfaces.includes(publicTerminalReportPath), "root-work status/details/response surfaces preserve public terminal reconciliation report paths");
assert(camelSecretSurfaces.includes("Decision: COMPLETE"), "root-work status/details/response surfaces preserve public COMPLETE decision context");

const compactSecretRootWorkKey = "api" + "key" + "rootwork";
const compactSecretArgKey = "private" + "key" + "arg";
const compactAssociatedArgValue = "COMPACT_ROOT_WORK_ASSOCIATED_VALUE_SENTINEL";
const compactSecretQueue = normalizeRootWorkQueue(undefined, {
  originRunId: "public-compact-origin-run",
  seeds: [{
    key: compactSecretRootWorkKey,
    kind: "custom-graph",
    title: "Compact recovery queue item",
    purpose: publicDecisionContext,
    input: {
      kind: "custom-graph",
      presetName: "compact-recovery-graph",
      args: {
        [compactSecretArgKey]: compactAssociatedArgValue,
        publicContext: publicDecisionContext,
      },
    },
    requestedBy: "user",
  }],
});
const compactSecretQueueJson = JSON.stringify(compactSecretQueue);
assert.equal(compactSecretQueueJson.includes(compactAssociatedArgValue), false, "compact secret-shaped root-work arg keys omit associated values from persisted public queue details");
assert.equal(compactSecretQueueJson.includes(compactSecretRootWorkKey), false, "compact secret-shaped root-work keys do not persist as public queue item keys");
assert.equal(compactSecretQueueJson.includes(compactSecretArgKey), false, "compact secret-shaped root-work arg keys do not persist in public queue details");
assert(compactSecretQueueJson.includes("publiccontext"), "public compact root-work arg keys remain visible after normalization");
assert(compactSecretQueueJson.includes(publicGeneratedRunId), "compact root-work persistence preserves public generated ids");
assert(compactSecretQueueJson.includes(publicTerminalReportPath), "compact root-work persistence preserves public terminal reconciliation paths");
assert(compactSecretQueueJson.includes("Decision: COMPLETE"), "compact root-work persistence preserves public COMPLETE decision context");
const compactSecretRun: TaskGraphRun = { ...previous, metadata: { ...(previous.metadata ?? {}), rootWorkQueue: compactSecretQueue } };
const compactSecretSurfaces = [
  renderRootWorkQueueStatus(compactSecretQueue),
  JSON.stringify(buildTaskGraphViewModel(compactSecretRun, { mode: "work-list" }).rootWork),
  JSON.stringify(rootWorkResponseDetails(compactSecretRun)),
].join("\n");
assert.equal(compactSecretSurfaces.includes(compactAssociatedArgValue), false, "root-work status/details/response surfaces omit values under compact secret-shaped arg keys");
assert.equal(compactSecretSurfaces.includes(compactSecretRootWorkKey), false, "root-work status/details/response surfaces omit compact secret-derived root-work keys");
assert.equal(compactSecretSurfaces.includes(compactSecretArgKey), false, "root-work status/details/response surfaces omit compact secret-shaped arg keys");
assert(compactSecretSurfaces.includes(publicGeneratedRunId), "compact root-work status/details/response surfaces preserve public generated ids");
assert(compactSecretSurfaces.includes(publicTerminalReportPath), "compact root-work status/details/response surfaces preserve public terminal reconciliation report paths");
assert(compactSecretSurfaces.includes("Decision: COMPLETE"), "compact root-work status/details/response surfaces preserve public COMPLETE decision context");

const compactLineageActiveRunId = "autoimprove-compact-lineage-active";
const compactLineageSuccessorRunId = "autoimprove-compact-lineage-successor";
const compactLineageEvidenceValue = "access" + "token" + "evidence";
const compactLineageQueue = normalizeRootWorkQueue(undefined, {
  originRunId: "public-compact-lineage-origin-run",
  seeds: [{
    key: "public-compact-lineage-root-work",
    kind: "autoimprove-loop",
    title: "Compact lineage evidence display item",
    purpose: publicDecisionContext,
    input: { kind: "autoimprove-loop", objective: publicDecisionContext, oracleRequired: true },
    requestedBy: "user",
  }],
});
const compactLineageItem = compactLineageQueue.items[0];
assert(compactLineageItem, "compact lineage queue has one item fixture");
compactLineageQueue.items[0] = { ...compactLineageItem, state: "active", activeRunId: compactLineageActiveRunId };
const compactLineageStatus = renderRootWorkQueueStatus(compactLineageQueue, {
  lineageByActiveRunId: {
    [compactLineageActiveRunId]: {
      rootWorkKey: "public-compact-lineage-root-work",
      activeRunId: compactLineageActiveRunId,
      latestSuccessorRunId: compactLineageSuccessorRunId,
      decision: "COMPLETE",
      evidence: {
        label: `Evidence: ${compactLineageEvidenceValue}`,
        path: `${compactLineageEvidenceValue}.md ${publicTerminalReportPath}`,
        decision: "COMPLETE",
        currentRunId: compactLineageSuccessorRunId,
        priorRunId: compactLineageActiveRunId,
      },
      successors: [{
        runId: compactLineageSuccessorRunId,
        status: "succeeded",
        decision: "COMPLETE",
        evidence: {
          label: `Evidence: ${compactLineageEvidenceValue}`,
          path: `${compactLineageEvidenceValue}.md ${publicTerminalReportPath}`,
          decision: "COMPLETE",
          currentRunId: compactLineageSuccessorRunId,
          priorRunId: compactLineageActiveRunId,
        },
      }],
    },
  },
});
assert.equal(compactLineageStatus.includes(compactLineageEvidenceValue), false, "compact secret-shaped lineage evidence labels/paths do not render in root-work queue status");
assert(compactLineageStatus.includes(compactLineageSuccessorRunId), "compact lineage status preserves the public latest successor id");
assert(compactLineageStatus.includes(publicTerminalReportPath), "compact lineage status preserves public terminal reconciliation evidence paths");
assert(compactLineageStatus.includes("Decision: COMPLETE"), "compact lineage status preserves public COMPLETE decisions");

const corruptExtraArtifactPath = ".orchestration/" + "api" + "KeyResponseDetail" + "/terminal-report.md";
const corruptExtraQueue = {
  version: 1,
  items: [
    {
      ...normalized.items[0]!,
      artifactIdLike: corruptExtraArtifactPath,
      artifactPath: corruptExtraArtifactPath,
      publicArtifactPath: publicTerminalReportPath,
    },
  ],
} as unknown as RootWorkQueue;
const corruptExtraRun: TaskGraphRun = { ...previous, metadata: { ...(previous.metadata ?? {}), rootWorkQueue: corruptExtraQueue } };
const corruptExtraDetailsJson = JSON.stringify(rootWorkResponseDetails(corruptExtraRun));
assert.equal(corruptExtraDetailsJson.includes(corruptExtraArtifactPath), false, "root-work response details redact secret-shaped extra artifact/id-like queue fields from corrupt inputs");
assert.doesNotMatch(corruptExtraDetailsJson, /api[_\s-]*key|ResponseDetail/i, "root-work response details do not expose secret-shaped extra queue field fragments");
assert(corruptExtraDetailsJson.includes(REDACTED_SECRETISH_EVIDENCE_PATH), "root-work response details include a redaction placeholder for corrupt extra queue fields");
assert(corruptExtraDetailsJson.includes(publicTerminalReportPath), "root-work response details preserve normal public terminal report paths in extra queue fields");

const vm = buildTaskGraphViewModel(first.nextRun!, { mode: "work-list" });
assert.equal(vm.rootWork.counts.active, 1, "view model exposes active root work counts");
assert(vm.rootWork.queuedNonExecutable.some((item) => item.key === "subagent-management-research"), "view model exposes queued non-executable root work");

console.log("task graph root work queue validation passed");
