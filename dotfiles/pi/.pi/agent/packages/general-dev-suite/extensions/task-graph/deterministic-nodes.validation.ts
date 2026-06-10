import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { renderStatus } from "./display";
import { renderTaskGraphFlowchart } from "./flowchart";
import { createRun } from "./formulas";
import type { ProjectTaskGraphSettings, TaskGraphRun, TaskNode } from "./schema";
import { buildTaskPrompt, readyTasks, routeFailure } from "./scheduler";
import { renderProjectTaskGraphTemplates, sanitizeProjectTaskGraphSettingsInfoForDetails, validateProjectSettings } from "./settings";
import { buildTaskGraphViewModel } from "./view-model";

const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "task-graph-deterministic-nodes-"));
const PROMPT_SENTINEL = "SECRET_PROMPT_INSTRUCTIONS_DO_NOT_RENDER";
const PUBLIC_DESCRIPTOR_SENTINEL = "public deterministic descriptor contract";

function assertTaskDescriptors(run: TaskGraphRun, label: string) {
  const tasks = Object.values(run.tasks);
  assert(tasks.length > 0, `${label}: expected generated tasks`);
  for (const task of tasks) {
    const descriptor = task.metadata.nodeDescriptor;
    assert(descriptor, `${label}: ${task.kind} ${task.id} missing nodeDescriptor`);
    assert.equal(descriptor!.version, 1, `${label}: descriptor version`);
    assert.equal(typeof descriptor!.stableKey, "string", `${label}: stableKey type`);
    assert(descriptor!.stableKey.trim().length > 0, `${label}: stableKey non-empty`);
    assert(!descriptor!.stableKey.includes(task.id), `${label}: stableKey must not contain generated task id`);
    assert(descriptor!.purpose.trim().length > 0, `${label}: purpose non-empty`);
    assert.equal(typeof descriptor!.order, "number", `${label}: order type`);
    for (const field of ["inputs", "outputs", "artifacts", "acceptanceChecks", "writeScope", "isolationBoundary"] as const) {
      assert(Array.isArray(descriptor![field]), `${label}: ${field} is a list`);
    }
  }
}

function descriptorSignature(run: TaskGraphRun) {
  return Object.values(run.tasks)
    .map((task, index) => ({ task, index }))
    .sort((a, b) => (a.task.metadata.nodeDescriptor?.order ?? 0) - (b.task.metadata.nodeDescriptor?.order ?? 0) || a.index - b.index)
    .map(({ task }) => {
      const descriptor = task.metadata.nodeDescriptor!;
      return {
        stableKey: descriptor.stableKey,
        purpose: descriptor.purpose,
        inputs: descriptor.inputs,
        outputs: descriptor.outputs,
        artifacts: descriptor.artifacts,
        acceptanceChecks: descriptor.acceptanceChecks,
        writeScope: descriptor.writeScope,
        isolationBoundary: descriptor.isolationBoundary,
        order: descriptor.order,
      };
    });
}

function taskIds(run: TaskGraphRun) {
  return Object.keys(run.tasks).sort();
}

function assertUniqueStableKeys(run: TaskGraphRun, label: string) {
  const keys = Object.values(run.tasks).map((task) => task.metadata.nodeDescriptor?.stableKey).filter((key): key is string => Boolean(key));
  assert.equal(new Set(keys).size, keys.length, `${label}: descriptor stable keys must be unique within a run`);
}

function extractDescriptorBlock(prompt: string) {
  const match = /## Deterministic node descriptor\n[\s\S]*?(?=\n## |\n# |$)/.exec(prompt);
  assert(match, `prompt missing descriptor block:\n${prompt}`);
  return match[0].trim();
}

function firstTaskOfKind(run: TaskGraphRun, kind: string): TaskNode {
  const task = Object.values(run.tasks).find((candidate) => candidate.kind === kind);
  assert(task, `missing ${kind} task`);
  return task!;
}

const input = "Add deterministic descriptors to task graph nodes with validation.";
const doRunA = createRun(cwd, "do", input, { oracleConsult: false, decompose: false, maxParallel: 3 });
const doRunB = createRun(cwd, "do", input, { oracleConsult: false, decompose: false, maxParallel: 3 });
const pdoRun = createRun(cwd, "pdo", `${input}\n\nAcceptance criteria:\n- descriptors appear in prompts\n- dependencies remain task ids`, { oracleConsult: false, decompose: false, maxParallel: 3 });
const autoRun = createRun(cwd, "autoimprove", `Objective: ${input}\n\nObjective test/artifacts:\n- deterministic validation passes\n- reusable skill documents descriptor method`, { oracleConsult: false, decompose: false, maxParallel: 3 });

const customSettings: ProjectTaskGraphSettings = validateProjectSettings({
  graphs: {
    deterministic: {
      description: "Custom descriptor validation workflow",
      stages: [
        {
          id: "plan",
          kind: "PLAN",
          title: "Plan custom descriptors",
          promptInstructions: [PROMPT_SENTINEL],
          descriptor: {
            stableKey: "custom.det.plan",
            purpose: `Plan ${PUBLIC_DESCRIPTOR_SENTINEL}.`,
            inputs: ["user request"],
            outputs: ["descriptor-aware plan"],
            acceptanceChecks: ["public descriptor renders"],
            writeScope: ["planning artifacts only"],
            isolationBoundary: ["do not leak promptInstructions"],
          },
        },
        {
          id: "impl",
          kind: "IMPLEMENT",
          title: "Implement custom descriptors",
          dependsOn: ["plan"],
          subagentType: "implementer",
          stableKey: "custom.det.impl",
          purpose: "Implement the custom descriptor contract.",
          acceptanceChecks: ["descriptor fields survive settings normalization"],
          expectedWritePaths: ["extensions/task-graph/**"],
        },
      ],
    },
  },
});
const customRun = createRun(cwd, "custom", "Exercise custom graph descriptors", { customGraph: "deterministic", maxParallel: 2 }, { dirtyAtStart: [] }, customSettings, { loaded: true, graphNames: ["deterministic"], effectiveGraphNames: ["deterministic"], graphSourceMap: { deterministic: "project" } });

for (const [label, run] of [["do", doRunA], ["pdo", pdoRun], ["autoimprove", autoRun], ["custom", customRun]] as const) {
  assertTaskDescriptors(run, label);
}

assert.notDeepEqual(taskIds(doRunA), taskIds(doRunB), "equivalent runs should still have different generated task ids");
assert.deepEqual(descriptorSignature(doRunA), descriptorSignature(doRunB), "equivalent runs should have identical descriptor signatures despite different task ids");

const implementA = firstTaskOfKind(doRunA, "IMPLEMENT");
const implementB = firstTaskOfKind(doRunB, "IMPLEMENT");
assert.equal(extractDescriptorBlock(buildTaskPrompt(doRunA, implementA)), extractDescriptorBlock(buildTaskPrompt(doRunB, implementB)), "descriptor prompt block should be stable across equivalent runs");
assert.doesNotMatch(extractDescriptorBlock(buildTaskPrompt(customRun, firstTaskOfKind(customRun, "PLAN"))), /SECRET_PROMPT|promptInstructions|projectPromptInstructions|readyPrompt|workerPrompt|systemPrompt|hiddenPrompt|promptTemplate/i, "descriptor prompt block must not leak prompt instruction fields");

const renderedSettings = renderProjectTaskGraphTemplates({ loaded: true, path: "/tmp/settings.json", graphNames: ["deterministic"], effectiveGraphNames: ["deterministic"], settings: customSettings });
assert.match(renderedSettings, /custom\.det\.plan/, "settings renderer should include custom descriptor stable key");
assert.match(renderedSettings, /public deterministic descriptor contract/, "settings renderer should include public descriptor purpose");
assert.doesNotMatch(renderedSettings, new RegExp(PROMPT_SENTINEL), "settings renderer must not leak promptInstructions");
const settingsDetails = JSON.stringify(sanitizeProjectTaskGraphSettingsInfoForDetails({ loaded: true, path: "/tmp/settings.json", graphNames: ["deterministic"], effectiveGraphNames: ["deterministic"], settings: customSettings }));
assert.match(settingsDetails, /custom\.det\.plan/, "settings details should preserve public descriptor fields");
assert.doesNotMatch(settingsDetails, new RegExp(PROMPT_SENTINEL), "settings details must not leak promptInstructions");

const asciiA = renderTaskGraphFlowchart(doRunA, { format: "ascii", includeDone: true, maxLabelLength: 80 }).replace(/^Task graph .+$/m, "Task graph <normalized>");
const asciiB = renderTaskGraphFlowchart(doRunB, { format: "ascii", includeDone: true, maxLabelLength: 80 }).replace(/^Task graph .+$/m, "Task graph <normalized>");
assert.equal(asciiA, asciiB, "ASCII flowchart should be deterministic across equivalent descriptor runs after header normalization");
assert.match(asciiA, /do\.plan|do\.implement/, "ASCII flowchart should surface stable descriptor keys");
const mermaidA = renderTaskGraphFlowchart(doRunA, { format: "mermaid", includeDone: true, maxLabelLength: 80 });
const mermaidB = renderTaskGraphFlowchart(doRunB, { format: "mermaid", includeDone: true, maxLabelLength: 80 });
assert.equal(mermaidA, mermaidB, "Mermaid flowchart should use deterministic aliases instead of generated task ids");
assert.match(mermaidA, /do\.plan|do\.implement/, "Mermaid flowchart should label nodes with stable descriptor keys");
assert.doesNotMatch(mermaidA, new RegExp(firstTaskOfKind(doRunA, "PLAN").id), "Mermaid descriptor labels should not expose generated task ids");

const vm = buildTaskGraphViewModel(doRunA, { mode: "work-list" });
assert(vm.rows.some((row) => row.node?.stableKey === "do.plan" || row.node?.stableKey === "do.implement"), "view model should expose descriptor stable keys");
assert.match(renderStatus(doRunA), /do\.plan|do\.implement/, "status should surface descriptor stable keys");

for (const run of [doRunA, pdoRun, autoRun, customRun]) {
  const ids = new Set(Object.keys(run.tasks));
  const stableKeys = new Set(Object.values(run.tasks).map((task) => task.metadata.nodeDescriptor!.stableKey));
  for (const task of Object.values(run.tasks)) {
    for (const dep of task.blockedBy) {
      assert(ids.has(dep), `${run.mode}: dependency ${dep} should be a generated task id`);
      assert(!stableKeys.has(dep), `${run.mode}: dependency ${dep} must not be a descriptor stable key`);
    }
  }
  for (const edge of run.edges.filter((edge) => edge.type === "depends_on")) {
    assert(ids.has(edge.from) && ids.has(edge.to), `${run.mode}: edge endpoints must be task ids`);
  }
}

const routeRun = createRun(cwd, "do", "Fix routed descriptor handling", { oracleConsult: false, decompose: false, maxParallel: 3 });
const failedCompile = firstTaskOfKind(routeRun, "COMPILE");
const failedCompileDescriptor = failedCompile.metadata.nodeDescriptor!;
const routed = routeFailure(routeRun, failedCompile, "compile failed", "compiler output", "code");
const routedImpl = routed.find((task) => task.kind === "IMPLEMENT" && task.title.startsWith("Fix after COMPILE"));
assert(routedImpl, "code failure should route to a fix IMPLEMENT task");
assert.notEqual(routedImpl!.metadata.nodeDescriptor!.stableKey, failedCompileDescriptor.stableKey, "routed implementation must not inherit failed stable key");
assert.match(routedImpl!.metadata.nodeDescriptor!.stableKey, /do\.compile.*fix/, "routed implementation stable key should describe the failure fix");
assert.match(routedImpl!.metadata.nodeDescriptor!.purpose, /Fix COMPILE failure/i, "routed implementation purpose should describe the fix, not the failed compile task");
assert.doesNotMatch(routedImpl!.metadata.nodeDescriptor!.purpose, /^Compile for/i, "routed implementation purpose must not inherit failed compile purpose");
assertUniqueStableKeys(routeRun, "route_to_implement");

const retryRun = createRun(cwd, "do", "Retry environmental descriptor handling", { oracleConsult: false, decompose: false, maxParallel: 3 });
const retryCompile = firstTaskOfKind(retryRun, "COMPILE");
retryCompile.metadata.route = { onFailure: "retry_same_stage", maxCodeIterations: 1, maxEnvironmentalRetries: 2 };
const retryCreated = routeFailure(retryRun, retryCompile, "compiler unavailable", "environment output", "environment");
assert.equal(retryCreated.length, 1, "environment failure should create one same-stage retry");
const retryTask = retryCreated[0]!;
assert.equal(retryTask.kind, "COMPILE", "environment retry keeps the failed stage kind");
assert.notEqual(retryTask.metadata.nodeDescriptor!.stableKey, retryCompile.metadata.nodeDescriptor!.stableKey, "environment retry descriptor is deduped within the run");
assert.match(retryTask.metadata.nodeDescriptor!.stableKey, /do\.compile~2|do\.compile\.retry/, "environment retry stable key keeps the failed stage namespace with deterministic dedupe");
assert.match(retryTask.metadata.nodeDescriptor!.purpose, /Retry COMPILE after environmental failure/i, "environment retry purpose describes the retry");
assertUniqueStableKeys(retryRun, "retry_same_stage");

const readyBefore = readyTasks(doRunA).map((task) => task.id);
const withoutDescriptors = JSON.parse(JSON.stringify(doRunA)) as TaskGraphRun;
for (const task of Object.values(withoutDescriptors.tasks)) delete task.metadata.nodeDescriptor;
const readyAfter = readyTasks(withoutDescriptors).map((task) => task.id);
assert.deepEqual(readyBefore, readyAfter, "descriptor completion/rendering must not change ready task ids/order");

console.log("task graph deterministic nodes validation passed");
