import type { ReadyTask, TaskGraphRun, TaskKind, TaskNode, TaskNodeDescriptorInput } from "./schema";
import { terminalSuccess } from "./schema";
import { renderDescriptorPromptBlock, renderDescriptorStatusLine, attachCompletedDescriptor, usedDescriptorStableKeys, completeDescriptorForTask } from "./descriptors";
import { renderExtensionWorkflowPromptBlock } from "./extension-integration";
import { appendAutoImproveChain, appendStageChain, applyProjectSettingsToTask, makeTask, oracleConsultTask } from "./formulas";
import { renderRootWorkQueuePromptBlock } from "./root-work-queue";

const READ_ONLY_KINDS = new Set<TaskKind>(["PLAN", "ORACLE_CONSULT", "DECOMPOSE", "COMPILE", "UNIT_TEST", "PERF_TEST", "CODE_REVIEW", "API_TEST", "E2E_TEST", "UX_REVIEW", "CI_FOLLOW", "CI_FIXUP", "GOAL_TEST", "EVALUATE"]);
const WRITE_KINDS = new Set<TaskKind>(["IMPLEMENT", "SPEC_UPDATE"]);

function priorityRank(task: TaskNode) {
  return task.priority === "A" ? 0 : task.priority === "B" ? 1 : 2;
}

export function validateNoCycles(run: TaskGraphRun) {
  const indegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  for (const id of Object.keys(run.tasks)) indegree.set(id, 0);
  for (const e of run.edges) {
    if (e.type === "conflicts_with" || e.type === "decomposes_to") continue;
    if (!run.tasks[e.from] || !run.tasks[e.to]) continue;
    outgoing.set(e.from, [...(outgoing.get(e.from) ?? []), e.to]);
    indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
  }
  const queue = [...indegree.entries()].filter(([, n]) => n === 0).map(([id]) => id);
  let seen = 0;
  while (queue.length) {
    const id = queue.shift()!;
    seen += 1;
    for (const to of outgoing.get(id) ?? []) {
      const n = (indegree.get(to) ?? 0) - 1;
      indegree.set(to, n);
      if (n === 0) queue.push(to);
    }
  }
  if (seen !== indegree.size) {
    const stuck = [...indegree.entries()].filter(([, n]) => n > 0).map(([id]) => id);
    throw new Error(`Task graph contains dependency cycle: ${stuck.join(", ")}`);
  }
}

export function taskLockKeys(task: TaskNode) {
  const keys = new Set<string>();
  const group = task.runner.writePolicy.conflictGroup;
  if (group) keys.add(`group:${group}`);
  if (WRITE_KINDS.has(task.kind)) keys.add("group:workspace-write");
  if (task.kind === "COMMIT") keys.add("group:git-index");
  if (task.kind === "PUSH") keys.add("group:git-remote");
  if (task.kind === "RESTART" || task.kind === "API_TEST" || task.kind === "E2E_TEST") keys.add("group:dev-server");
  if (task.kind === "INIT") keys.add("group:org-state");
  for (const p of task.metadata.expectedWritePaths ?? task.runner.writePolicy.declaredPaths) keys.add(`path:${p}`);
  if (!READ_ONLY_KINDS.has(task.kind) && keys.size === 0) keys.add("group:workspace-write");
  return [...keys];
}

function locksAvailable(held: Set<string>, task: TaskNode) {
  return taskLockKeys(task).every((key) => !held.has(key));
}

function registerRoutedTask(run: TaskGraphRun, task: TaskNode) {
  applyProjectSettingsToTask(task, run.config.projectSettings);
  attachCompletedDescriptor(task, Object.keys(run.tasks).length + 1, usedDescriptorStableKeys(Object.values(run.tasks)), { forceOrder: true });
  run.tasks[task.id] = task;
  for (const dep of task.blockedBy) {
    const parent = run.tasks[dep];
    if (parent && !parent.blocks.includes(task.id)) parent.blocks.push(task.id);
    run.edges.push({ from: dep, to: task.id, type: "depends_on", reason: "routed task dependency" });
  }
  return task;
}

function inheritedFailureMetadata(failedTask: TaskNode, extra: Record<string, unknown> = {}) {
  const { nodeDescriptor: _nodeDescriptor, ...metadata } = failedTask.metadata;
  return { ...metadata, ...extra };
}

function failedTaskStableKey(failedTask: TaskNode) {
  return failedTask.metadata.nodeDescriptor?.stableKey ?? `${failedTask.metadata.source}.${failedTask.kind.toLowerCase().replace(/_/g, "-")}`;
}

function retryDescriptor(failedTask: TaskNode, purpose: string, suffix?: string): TaskNodeDescriptorInput {
  const baseKey = failedTaskStableKey(failedTask);
  return {
    stableKey: suffix ? `${baseKey}.${suffix}` : baseKey,
    purpose,
    inputs: ["Failure context from prior task attempt", `Failed node ${baseKey}`],
    outputs: ["Retry result and recorded validation evidence"],
    artifacts: ["task_graph_update summary and validation evidence"],
    acceptanceChecks: ["The routed retry addresses the recorded failure or reports a clear blocker", "Downstream checks preserve task graph dependency semantics"],
    writeScope: failedTask.metadata.expectedWritePaths?.length ? failedTask.metadata.expectedWritePaths : [failedTask.runner.sideEffects === "write" ? "bounded failure-fix write scope" : "read-only or report-only retry scope"],
    isolationBoundary: ["Do not reuse the failed task descriptor purpose blindly", "Do not alter generated task IDs, dependency arrays, locks, or ready ordering"],
  };
}

function isRunnable(task: TaskNode) {
  if (task.status !== "pending" && task.status !== "ready") return false;
  if (task.metadata.disabled === true) return false;
  return true;
}

export function readyTasks(run: TaskGraphRun): ReadyTask[] {
  validateNoCycles(run);
  const held = new Set<string>();
  const candidates = Object.values(run.tasks)
    .filter(isRunnable)
    .filter((task) => task.blockedBy.every((id) => terminalSuccess(run.tasks[id]?.status ?? "failed")))
    .sort((a, b) => priorityRank(a) - priorityRank(b) || a.createdAt.localeCompare(b.createdAt));
  const selected: TaskNode[] = [];
  for (const task of candidates) {
    if (selected.length >= run.config.maxParallel) break;
    if (!locksAvailable(held, task)) continue;
    for (const key of taskLockKeys(task)) held.add(key);
    selected.push(task);
  }
  return selected.map((task) => {
    const descriptor = task.metadata.nodeDescriptor ?? completeDescriptorForTask(task, 1);
    const descriptorStatus = renderDescriptorStatusLine(descriptor);
    return {
      id: task.id,
      kind: task.kind,
      title: task.title,
      runner: task.runner,
      subagent: task.subagent,
      context: task.subagent?.context ?? "fresh",
      prompt: buildTaskPrompt(run, task),
      blockedBy: task.blockedBy,
      lockKeys: taskLockKeys(task),
      statusLine: `${task.kind}: ${task.title} via ${task.runner.kind}:${task.runner.name}${descriptorStatus ? ` · ${descriptorStatus}` : ""}`,
      nodeDescriptor: descriptor,
    };
  });
}

export function runnerExecutionGuidance(task: Pick<TaskNode, "kind" | "runner" | "subagent">) {
  if (task.runner.kind === "manual_gate") {
    if (task.kind === "ORACLE_CONSULT") {
      return "Manual gate: do not launch a subagent. The parent/operator should consult Oracle in browser mode (GPT-5.5 Pro Extended, non-secret context only), then record the recommendation with task_graph_update.";
    }
    return "Manual gate: do not launch a subagent. Resolve the decision in the parent/operator context, then call task_graph_update with succeeded, awaiting_input, skipped, or failed.";
  }
  if (task.runner.kind === "direct_safe") {
    if (task.kind === "COMMIT" || task.kind === "PUSH") {
      return "Direct-safe gated operation: run only after explicit task_graph_approve. Record exact command/output with task_graph_update; do not make product-code edits in this stage.";
    }
    return "Direct-safe stage: run only the bounded command/action implied by this task, do not write product code, and record exact command/output with task_graph_update.";
  }
  if (task.runner.kind === "chain") {
    return "Chain runner: execute the named chain/subagent workflow with the returned context and prompt, then record plan/artifact paths with task_graph_update.";
  }
  if (task.runner.kind === "subagent") {
    return `Subagent runner: launch ${task.subagent?.type ?? task.runner.name} with the returned context and prompt, then record changed files, validation, and artifacts with task_graph_update.`;
  }
  return "Formula runner: execute only the task graph formula action described by this task, then record the result with task_graph_update.";
}

function autoimproveObjectiveBlock(task: TaskNode) {
  const objective = task.metadata.autoimproveObjective;
  if (!objective) return "";
  const checklist = objective.checklist.length ? objective.checklist.map((item) => `- ${item}`).join("\n") : "- No checklist bullets were extracted; define concrete objective artifacts before marking this stage PASS.";
  const validationHints = objective.validationHints.length ? objective.validationHints.map((item) => `- ${item}`).join("\n") : "- Record exact validation commands, outputs, metrics, and PASS/FAIL evidence.";
  const artifacts = objective.expectedArtifactRoots.length ? objective.expectedArtifactRoots.map((item) => `- ${item}`).join("\n") : "- Record every goal output, transcript/log, validation summary, and skill/playbook path.";
  return `\n## Autoimprove objective evidence contract\n\nExtracted objective checklist:\n${checklist}\n\nValidation/evidence hints:\n${validationHints}\n\nExpected artifact roots or descriptions:\n${artifacts}\n\nDogfood requirements:\n- tmux-puppeted child Pi required: ${objective.requiresTmuxPuppetedPi ? "yes" : "no"}\n- child task graph evidence required: ${objective.requiresTaskGraphDogfood ? "yes" : "no"}\n- reusable skill/playbook required: ${objective.requiresReusableSkill ? "yes" : "no"}\n\nPASS is not allowed unless the task handoff names the relevant artifact paths and validation evidence. If tmux-puppeted Pi or child task graph evidence is required, missing transcripts, child run ids, or child .pi/dev-suite/task-graph run files are FAIL/NEEDS_INPUT, not optional polish.\n`;
}

function formatLineageSource(source: string) {
  return source.replace(/-/g, " ");
}

function isActionableLineageWarningMessage(message: string) {
  return !/explicit lineage adoption was used|adopted expected predecessor|resolved adoption/i.test(message);
}

function autoimproveLoopBlock(run: TaskGraphRun, task: TaskNode) {
  const loop = task.metadata.autoimproveLoop ?? run.metadata?.autoimproveLoop ?? run.config.autoimproveLoop;
  if (!loop) return "";
  const lineageSource = loop.lineageSource ? `Lineage source: ${formatLineageSource(loop.lineageSource)}\n` : "";
  const actionableWarnings = (loop.lineageWarnings ?? []).filter(isActionableLineageWarningMessage);
  const lineageWarnings = actionableWarnings.length ? `Lineage warnings:\n${actionableWarnings.map((warning) => `- ${warning}`).join("\n")}\n` : "";
  return `\n## Autoimprove loop context\n\nLoop id: ${loop.loopId}\nIteration: ${loop.iteration}\nRoot run: ${loop.rootRunId ?? loop.loopId}\nPrevious run: ${loop.previousRunId ?? "none"}\nNext run: ${loop.nextRunId ?? "none"}\n${lineageSource}${lineageWarnings}Continuation context artifact: ${loop.continuationContextArtifact ?? loop.evidenceContextArtifactPath ?? "not attached yet"}\nOracle required before implementation: ${loop.oracleRequired ? "yes" : "no"}\n\nIf Oracle is required and this task is implementation or validation, first confirm the ORACLE_CONSULT task in this run has succeeded and record its artifact path in your result.\n`;
}

function rootWorkQueueBlock(run: TaskGraphRun) {
  return renderRootWorkQueuePromptBlock(run.metadata?.rootWorkQueue);
}

function projectInstructionBlock(run: TaskGraphRun, task: TaskNode) {
  const map = run.config.projectSettings?.agentInstructions ?? {};
  const selectors = ["all", task.kind, task.runner.name, task.subagent?.type].filter((x): x is string => Boolean(x));
  const instructions = selectors.flatMap((selector) => map[selector] ?? []);
  const stageInstructions = Array.isArray(task.metadata.projectPromptInstructions)
    ? task.metadata.projectPromptInstructions.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  const all = [...instructions, ...stageInstructions];
  if (!all.length) return "";
  return `\n## Task graph instructions\n\nThese non-secret instructions come from task graph settings or packaged custom graph stages. Follow them unless they conflict with higher-priority safety or user instructions.\n\n${all.map((item) => `- ${item}`).join("\n")}\n`;
}

function generatedPromptIntentForExtensionHints(task: TaskNode) {
  const intents = [
    task.kind === "GRILL" ? "record decision summary, rationale, decision log notes, and graph evidence" : undefined,
    task.kind === "API_TEST" ? "REST endpoint http_request status code response schema side-effect safety" : undefined,
  ];
  return intents.filter((intent): intent is string => Boolean(intent)).join("\n");
}

const SCHEDULER_EXTENSION_HINT_MAX_CHARS = 2_800;

function schedulerHintBoundary(input: string) {
  const minimumUsefulBoundary = Math.max(160, Math.floor(input.length * 0.55));
  const sentenceBoundary = input.lastIndexOf(".\n");
  const candidates = [
    input.lastIndexOf("\n### Extension workflow:"),
    input.lastIndexOf("\n- "),
    sentenceBoundary >= 0 ? sentenceBoundary + 1 : -1,
    input.lastIndexOf("\n\n"),
  ];
  const boundary = Math.max(...candidates.filter((index) => index >= minimumUsefulBoundary));
  return Number.isFinite(boundary) && boundary > 0 ? boundary : input.length;
}

function capSchedulerExtensionHint(input: string, maxChars: number) {
  if (input.length <= maxChars) return input;
  const suffix = "\n\n[Omitted additional extension workflow details to keep scheduler hints within the character cap.]";
  const available = Math.max(0, maxChars - suffix.length);
  if (available <= 0) return suffix.trim().slice(0, maxChars);
  const head = input.slice(0, available).trimEnd();
  const boundary = schedulerHintBoundary(head);
  return `${head.slice(0, boundary).trimEnd()}${suffix}`.slice(0, maxChars);
}

function hasRenderedExtensionWorkflow(rendered: string, workflowId: string) {
  return rendered.includes(`Extension workflow: ${workflowId}`);
}

function extensionWorkflowReminders(rendered: string) {
  return [
    hasRenderedExtensionWorkflow(rendered, "http-api") ? "API/endpoint evidence: record request intent, status code, response schema/assertions, side-effect safety, validation output, and artifact paths in task_graph_update." : undefined,
    hasRenderedExtensionWorkflow(rendered, "notes") ? "Notes/decisions: task_graph_update summary, validation, artifacts, and changedFiles are canonical for current-run evidence; notes are secondary." : undefined,
    hasRenderedExtensionWorkflow(rendered, "tmux-worker") ? "Worker evidence: record worker provenance, transcript paths, tmux session/pane ids, child run ids, validation commands, changedFiles, and artifacts." : undefined,
    hasRenderedExtensionWorkflow(rendered, "image-ai") ? "Image evidence: record generated paths, screenshot/critique outputs, prompt-safe provenance, validation notes, and artifacts." : undefined,
    hasRenderedExtensionWorkflow(rendered, "comfyui-civitai") ? "ComfyUI/Civitai evidence: record generated paths, workflow JSON path, model/checkpoint/LoRA provenance, critique outputs, validation notes, and artifacts." : undefined,
  ].filter((reminder): reminder is string => Boolean(reminder));
}

function appendExtensionWorkflowReminders(rendered: string, reminders: readonly string[], maxChars: number) {
  if (!reminders.length) return capSchedulerExtensionHint(rendered, maxChars);
  const reminderBlock = `\n\nTask-specific evidence reminders:\n${reminders.map((reminder) => `- ${reminder}`).join("\n")}\n`;
  const renderedBudget = Math.max(0, maxChars - reminderBlock.length);
  const cappedRendered = capSchedulerExtensionHint(rendered, renderedBudget).trimEnd();
  return `${cappedRendered}${reminderBlock}`.slice(0, maxChars);
}

function extensionWorkflowHintBlock(task: TaskNode) {
  const rendered = renderExtensionWorkflowPromptBlock(
    {
      kind: task.kind,
      title: task.title,
      description: task.description,
      prompt: generatedPromptIntentForExtensionHints(task),
      runnerName: task.runner.name,
      toolNames: [task.subagent?.type, ...(task.subagent?.skills ?? [])].filter((tool): tool is string => Boolean(tool)),
    },
    { maxWorkflows: 3, maxRenderedChars: SCHEDULER_EXTENSION_HINT_MAX_CHARS * 3 },
  );
  return rendered ? appendExtensionWorkflowReminders(rendered, extensionWorkflowReminders(rendered), SCHEDULER_EXTENSION_HINT_MAX_CHARS) : "";
}

export function buildTaskPrompt(run: TaskGraphRun, task: TaskNode) {
  const planFile = typeof task.metadata.planFile === "string" ? task.metadata.planFile : undefined;
  const failure = task.metadata.failureContext;
  const oracleRecoveryTaskId = typeof task.metadata.oracleRecoveryTaskId === "string" ? task.metadata.oracleRecoveryTaskId : undefined;
  const oracleReason = typeof task.metadata.oracleReason === "string" ? task.metadata.oracleReason : undefined;
  const descriptor = task.metadata.nodeDescriptor ?? completeDescriptorForTask(task, 1);
  const descriptorBlock = renderDescriptorPromptBlock(descriptor);
  const common = `# Task Graph Task\n\nRun: ${run.runId}\nTask: ${task.id}\nKind: ${task.kind}\nTitle: ${task.title}\n\n## Description\n\n${task.description}\n\n${descriptorBlock}\n`;
  const plan = planFile ? `\n## Plan artifact\n\nUse plan file: ${planFile}\n` : "";
  const failureText = failure ? `\n## Failure context from previous attempt\n\nStage: ${failure.failedStage ?? "unknown"}\nClass: ${failure.failureClass ?? "unknown"}\nMessage: ${failure.message}\n\n${failure.rawOutput ?? ""}\n` : "";
  const oracleRecoveryText = oracleRecoveryTaskId ? `\n## Oracle recovery context\n\nThis retry was unblocked by Oracle consult task ${oracleRecoveryTaskId}. Read that task's recorded summary/artifacts before changing files, follow the smallest recommended recovery experiment, and preserve the objective autoimprove contract.\n` : "";
  const extensionHints = extensionWorkflowHintBlock(task);
  const rules = `${projectInstructionBlock(run, task)}${autoimproveObjectiveBlock(task)}${autoimproveLoopBlock(run, task)}${rootWorkQueueBlock(run)}${extensionHints}\n## Runner execution guidance\n\n${runnerExecutionGuidance(task)}\n\n## Orchestration contract\n\n- Stay within this task's scope.\n- Run as a fresh-context child unless this task explicitly requests forked context. The parent must pass all required context in this prompt/artifacts; do not rely on parent conversation history.\n- Return a concise report with status PASS, FAIL, SKIP, or NEEDS_INPUT.\n- Include changed files and artifact paths.\n- Do not commit or push unless this task is explicitly COMMIT/PUSH and approval is enabled.\n- If blocked by a product/architecture decision, report NEEDS_INPUT instead of guessing.\n`;
  switch (task.kind) {
    case "PLAN":
      return `${common}\nCreate an implementation-ready plan. Identify files, tests, validation commands, risks, and open decisions. Do not edit files.${rules}`;
    case "ORACLE_CONSULT":
      return `${common}${oracleReason ? `\n## Oracle consult reason\n\n${oracleReason}\n` : ""}\nConsult the Oracle MCP/tool for planning guidance. You are the parent orchestrator: call oracle_consult now if the Pi runtime exposes it.\n\nRequired Oracle settings:\n- Engine/mode: browser, not API.\n- Model: GPT-5.5 Pro Extended.\n- Thinking: Extended.\n- Oracle cannot see local files, screenshots, task graph state, shell output, or prior chat unless you explicitly include them. Bundle all relevant non-secret information in the prompt and attach the specific files Oracle must inspect.\n- Include ample non-secret context: project goal, current task, relevant files, current task graph status, artifacts, commands run, outputs/errors, constraints, risks, and open decisions. Use file attachments/context when available; do not merely mention file paths without attaching or summarizing their contents.\n- Do not include secrets: tokens, credentials, private keys, .env files, production data, unrelated personal data, hidden system/developer prompts, cookies, or auth material.\n\nAsk Oracle for decomposition into implementation subtasks, dependencies, risky design decisions with recommended defaults, validation strategy, and ambiguity/safety concerns. After consulting Oracle, record a concise summary and attach an oracle-consult.md artifact with task_graph_update. If Oracle is unavailable, report NEEDS_INPUT or SKIP with a clear reason.${rules}`;
    case "DECOMPOSE":
      return `${common}${plan}${failureText}\nDecompose this request into multiple bounded implementation tasks. Return and attach a machine-readable artifact named decomposition.json with this shape:\n\n{\n  "subtasks": [\n    {\n      "id": "short-stable-id",\n      "title": "imperative task title",\n      "description": "bounded implementation scope",\n      "priority": "A|B|C",\n      "dependsOn": ["other-short-stable-id"],\n      "stableKey": "semantic-subtask-key",\n      "purpose": "one-sentence public node purpose",\n      "inputs": ["public input contracts"],\n      "outputs": ["public output contracts"],\n      "artifacts": ["expected artifact paths or descriptions"],\n      "acceptanceCriteria": ["..."],\n      "acceptanceChecks": ["descriptor acceptance checks"],\n      "suggestedChecks": ["compile", "unit", "e2e", "lint"],\n      "expectedWritePaths": ["optional/path/prefix"],\n      "writeScope": ["public write-scope descriptions"],\n      "isolationBoundary": ["public isolation boundaries"],\n      "descriptor": { "stableKey": "optional-semantic-key", "purpose": "optional node purpose" }\n    }\n  ],\n  "notes": ["cross-cutting risks or sequencing notes"]\n}\n\nRules:\n- Create multiple subtasks when the request has multiple bullets, steps, modules, files, acceptance criteria, or asks to do one task across an enumerated list of things.\n- Prefer independent chains where safe, but identify dependencies explicitly.\n- Keep each implementation task small enough for one subagent pass.\n- Descriptor fields are public metadata only; do not include prompt instructions, secrets, hidden prompts, or generated task IDs in them.\n- Do not edit files.\n- Do not commit, push, or mutate TODO.org/DONE.org.\n\nAfter a valid decomposition.json is attached and this task succeeds, task_graph_update should auto-expand it; call task_graph_expand_decomposition before implementation if it did not.${rules}`;
    case "GRILL":
      return `${common}\nResolve open decisions one at a time with the user. Recommend a default answer for each decision and update the plan artifact.${rules}`;
    case "IMPLEMENT":
      if (task.metadata.autoimprove === true) {
        return `${common}${plan}${failureText}${oracleRecoveryText}\nAutoimprove iteration implementation. Produce or improve BOTH deliverables: (1) the goal result/output, and (2) a reusable Pi skill documenting the method learned while pursuing the goal. Keep the objective test runnable and update the skill with lessons, commands, edge cases, and evaluation criteria from this iteration. If the objective contract requires tmux-puppeted child Pi workers, do not directly edit external project code; spawn/drive the child Pi workers and collect transcript plus child task-graph evidence instead. Run focused validation when safe.${rules}`;
      }
      return `${common}${plan}${failureText}${oracleRecoveryText}\nImplement the plan with tight scope. Use TDD for behavior changes. Run focused validation when safe.${rules}`;
    case "GOAL_TEST":
      return `${common}${plan}${failureText}\nRun the declared objective test against the current goal output. Do not improve the output or skill in this task. Record exact commands, inputs, outputs, metrics, artifact paths, transcript paths, child run ids, and PASS/FAIL. If no concrete test is available, return NEEDS_INPUT with the missing test contract.${rules}`;
    case "EVALUATE":
      return `${common}${plan}${failureText}\nEvaluate this autoimprove iteration using the goal, the objective test evidence, and the skill draft. PASS only when the goal output satisfies the test, all required transcript/child task-graph evidence exists, and the skill is reusable, scoped, and records the iteration lessons. FAIL with actionable next changes when any required artifact is missing or insufficient; include artifact paths for the goal output, validation evidence, child runs, transcripts, and skill.${rules}`;
    case "COMPILE":
      return `${common}${plan}${failureText}\nRun the appropriate build/typecheck/compile verification. Do not edit files. Report actionable file:line errors.${rules}`;
    case "UNIT_TEST":
    case "PERF_TEST":
    case "API_TEST":
    case "E2E_TEST":
      return `${common}${plan}${failureText}\nRun the relevant ${task.kind.toLowerCase().replace("_", " ")} checks. Do not make product changes. Classify failures as code vs environment.${rules}`;
    case "CODE_REVIEW":
    case "UX_REVIEW":
      return `${common}${plan}${failureText}\nReview the current diff/artifacts for this task. Do not edit files. Return prioritized findings with evidence.${rules}`;
    default:
      return `${common}${plan}${failureText}\nExecute this bounded stage following the direct-safe policy in the task graph plugin.${rules}`;
  }
}

export function updateTask(run: TaskGraphRun, taskId: string, patch: Partial<TaskNode> & { status?: TaskNode["status"] }) {
  const task = run.tasks[taskId];
  if (!task) throw new Error(`Unknown task id: ${taskId}`);
  Object.assign(task, patch);
  task.updatedAt = new Date().toISOString();
  run.updatedAt = task.updatedAt;
  return task;
}

export function routeFailure(run: TaskGraphRun, failedTask: TaskNode, message: string, rawOutput?: string, failureClass: "code" | "environment" | "operator" | "unknown" = "unknown") {
  const route = failedTask.metadata.route;
  if (!route || route.onFailure === "stop_for_user" || route.onFailure === "stop_push_failed" || route.onFailure === "cancel_dependents") return [];
  const iteration = Number(failedTask.metadata.iteration ?? 1);
  if (failureClass === "environment" && route.onFailure === "retry_same_stage") {
    const envRetryCount = Number(failedTask.metadata.envRetryCount ?? 0);
    if (envRetryCount >= route.maxEnvironmentalRetries) return [];
    const retry = makeTask({
      kind: failedTask.kind,
      title: `Retry ${failedTask.title}`,
      description: failedTask.description,
      priority: failedTask.priority,
      blockedBy: [],
      parentId: failedTask.parentId,
      source: failedTask.metadata.source,
      runner: failedTask.runner,
      subagent: failedTask.subagent,
      descriptor: retryDescriptor(failedTask, `Retry ${failedTask.kind} after environmental failure for ${failedTask.metadata.todoTitle ?? failedTask.title}.`),
      metadata: inheritedFailureMetadata(failedTask, { iteration, envRetryCount: envRetryCount + 1, retryOf: failedTask.id, failureContext: { failedStage: failedTask.kind, failureClass, message, rawOutput } }),
    });
    registerRoutedTask(run, retry);
    run.edges.push({ from: failedTask.id, to: retry.id, type: "retry_of", reason: "environmental retry" });
    return [retry];
  }
  if (route.onFailure !== "route_to_implement") return [];
  const title = failedTask.metadata.todoTitle ?? failedTask.title.replace(/^[^:]+:\s*/, "");
  const autoimprove = failedTask.metadata.autoimprove === true;
  let retryBlockers: string[] = [];
  const failureContext = { failedStage: failedTask.kind, failureClass, message, rawOutput };
  const created: TaskNode[] = [];

  if (iteration >= route.maxCodeIterations) {
    if (!autoimprove) return [];
    const oracle = oracleConsultTask(
      `Unstick autoimprove: ${title}`,
      `${failedTask.description}\n\n## Stuck autoimprove context\n\nThe autoimprove loop is stuck after ${iteration} iteration(s), reaching the maxCodeIterations limit (${route.maxCodeIterations}). Consult Oracle for diagnosis and a concrete recovery plan before the next implementation attempt.\n\nFailed stage: ${failedTask.kind}\nFailure class: ${failureClass}\nFailure message: ${message}\n\n${rawOutput ?? ""}`,
      failedTask.metadata.source,
      "A",
      [],
      {
        ...inheritedFailureMetadata(failedTask),
        autoimprove: true,
        stuck: true,
        retryOf: failedTask.id,
        failureContext,
        oracle: { requested: true, model: "GPT-5.5 Pro Extended", mode: "browser", noSecrets: true },
        awaitingInput: {
          question: "Autoimprove is stuck. Use the Oracle MCP/tool in browser mode with GPT-5.5 Pro Extended, share non-secret goal/test/skill/failure context, then record the recovery plan before continuing.",
          recommended: "Ask Oracle to identify why the objective test or skill deliverable is failing, propose the smallest next experiment, and define clear pass/fail criteria for the resumed iteration.",
        },
      },
    );
    registerRoutedTask(run, oracle);
    run.edges.push({ from: failedTask.id, to: oracle.id, type: "retry_of", reason: "autoimprove stuck; oracle consult before retry" });
    retryBlockers = [oracle.id];
    created.push(oracle);
  }

  const impl = makeTask({
    kind: "IMPLEMENT",
    title: `${retryBlockers.length ? "Apply Oracle recovery after" : "Fix after"} ${failedTask.kind}: ${title}`,
    description: failedTask.description,
    priority: failedTask.priority,
    blockedBy: retryBlockers,
    parentId: failedTask.parentId,
    source: failedTask.metadata.source,
    runner: { kind: "subagent", name: "implementer", sideEffects: "write", writePolicy: { declaredPaths: [], allowOutsideDeclaredPaths: true, conflictGroup: "workspace-write" } },
    subagent: { type: "implementer", skills: autoimprove ? ["build-test-procedures", "tdd", "implementer", "pi-skill-authoring"] : ["build-test-procedures", "tdd", "implementer"], context: "fresh", contextReason: "Retry implementation receives explicit failure context; parent conversation history should not be inherited." },
    descriptor: retryDescriptor(failedTask, `${retryBlockers.length ? "Apply Oracle recovery for" : "Fix"} ${failedTask.kind} failure for ${title}.`, retryBlockers.length ? "oracle-recovery" : "fix"),
    metadata: inheritedFailureMetadata(failedTask, { chainPosition: 1, iteration: iteration + 1, retryOf: failedTask.id, failureContext, oracleRecoveryTaskId: retryBlockers[0] }),
  });
  registerRoutedTask(run, impl);
  run.edges.push({ from: failedTask.id, to: impl.id, type: "retry_of", reason: retryBlockers.length ? "oracle-guided autoimprove retry" : "code failure routes to implement" });
  const rest = appendStageChainFromFailure(run, impl, title);
  return [...created, impl, ...rest];
}

function appendStageChainFromFailure(run: TaskGraphRun, impl: TaskNode, title: string) {
  const append = impl.metadata.autoimprove === true ? appendAutoImproveChain : appendStageChain;
  const tasks = append(run, title, impl.description, impl.metadata.source, [impl.id], impl.parentId, {
    ...impl.metadata,
    iteration: impl.metadata.iteration,
  });
  // appendStageChain includes a fresh IMPLEMENT at position 1; the retry IMPLEMENT already exists.
  const duplicate = tasks[0];
  delete run.tasks[duplicate.id];
  impl.blocks = impl.blocks.filter((id) => id !== duplicate.id);
  run.edges = run.edges.filter((e) => e.from !== duplicate.id && e.to !== duplicate.id);
  if (tasks[1]) {
    tasks[1].blockedBy = [impl.id];
    if (!impl.blocks.includes(tasks[1].id)) impl.blocks.push(tasks[1].id);
    run.edges.push({ from: impl.id, to: tasks[1].id, type: "depends_on", reason: "retry implement feeds downstream checks" });
  }
  return tasks.slice(1);
}

export function summarizeCounts(run: TaskGraphRun) {
  const counts: Record<string, number> = {};
  for (const task of Object.values(run.tasks)) counts[task.status] = (counts[task.status] ?? 0) + 1;
  return counts;
}

export function nextNumericId(run: TaskGraphRun) {
  const nums = Object.values(run.tasks)
    .map((task) => typeof task.metadata.numericId === "number" ? task.metadata.numericId : Number(/^(?:task-)?(\d+)$/.exec(task.id)?.[1]))
    .filter(Number.isFinite);
  return nums.length ? Math.max(...nums) + 1 : 1;
}

export function aliasTaskId(run: TaskGraphRun, id: string | number | undefined) {
  if (id === undefined || id === null) return undefined;
  const s = String(id);
  if (run.tasks[s]) return s;
  if (run.tasks[`task-${s}`]) return `task-${s}`;
  const byIndex = Object.values(run.tasks).find((t) => t.metadata.numericId === Number(s));
  return byIndex?.id;
}
