import type { ReadyTask, TaskGraphRun, TaskKind, TaskNode } from "./schema";
import { terminalSuccess } from "./schema";
import { appendStageChain, makeTask } from "./formulas";

const READ_ONLY_KINDS = new Set<TaskKind>(["PLAN", "COMPILE", "UNIT_TEST", "PERF_TEST", "CODE_REVIEW", "API_TEST", "E2E_TEST", "UX_REVIEW", "CI_FOLLOW", "CI_FIXUP"]);
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
  return selected.map((task) => ({
    id: task.id,
    kind: task.kind,
    title: task.title,
    runner: task.runner,
    subagent: task.subagent,
    prompt: buildTaskPrompt(run, task),
    blockedBy: task.blockedBy,
    lockKeys: taskLockKeys(task),
    statusLine: `${task.kind}: ${task.title} via ${task.runner.kind}:${task.runner.name}`,
  }));
}

export function buildTaskPrompt(run: TaskGraphRun, task: TaskNode) {
  const planFile = typeof task.metadata.planFile === "string" ? task.metadata.planFile : undefined;
  const failure = task.metadata.failureContext;
  const common = `# Task Graph Task\n\nRun: ${run.runId}\nTask: ${task.id}\nKind: ${task.kind}\nTitle: ${task.title}\n\n## Description\n\n${task.description}\n`;
  const plan = planFile ? `\n## Plan artifact\n\nUse plan file: ${planFile}\n` : "";
  const failureText = failure ? `\n## Failure context from previous attempt\n\nStage: ${failure.failedStage ?? "unknown"}\nClass: ${failure.failureClass ?? "unknown"}\nMessage: ${failure.message}\n\n${failure.rawOutput ?? ""}\n` : "";
  const rules = `\n## Orchestration contract\n\n- Stay within this task's scope.\n- Return a concise report with status PASS, FAIL, SKIP, or NEEDS_INPUT.\n- Include changed files and artifact paths.\n- Do not commit or push unless this task is explicitly COMMIT/PUSH and approval is enabled.\n- If blocked by a product/architecture decision, report NEEDS_INPUT instead of guessing.\n`;
  switch (task.kind) {
    case "PLAN":
      return `${common}\nCreate an implementation-ready plan. Identify files, tests, validation commands, risks, and open decisions. Do not edit files.${rules}`;
    case "GRILL":
      return `${common}\nResolve open decisions one at a time with the user. Recommend a default answer for each decision and update the plan artifact.${rules}`;
    case "IMPLEMENT":
      return `${common}${plan}${failureText}\nImplement the plan with tight scope. Use TDD for behavior changes. Run focused validation when safe.${rules}`;
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
      metadata: { ...failedTask.metadata, iteration, retryOf: failedTask.id, failureContext: { failedStage: failedTask.kind, failureClass, message, rawOutput } },
    });
    run.tasks[retry.id] = retry;
    run.edges.push({ from: failedTask.id, to: retry.id, type: "retry_of", reason: "environmental retry" });
    return [retry];
  }
  if (route.onFailure !== "route_to_implement" || iteration >= route.maxCodeIterations) return [];
  const title = failedTask.metadata.todoTitle ?? failedTask.title.replace(/^[^:]+:\s*/, "");
  const impl = makeTask({
    kind: "IMPLEMENT",
    title: `Fix after ${failedTask.kind}: ${title}`,
    description: failedTask.description,
    priority: failedTask.priority,
    parentId: failedTask.parentId,
    source: failedTask.metadata.source,
    runner: { kind: "subagent", name: "implementer", sideEffects: "write", writePolicy: { declaredPaths: [], allowOutsideDeclaredPaths: true, conflictGroup: "workspace-write" } },
    subagent: { type: "implementer", skills: ["build-test-procedures", "tdd", "implementer"] },
    metadata: { ...failedTask.metadata, chainPosition: 1, iteration: iteration + 1, retryOf: failedTask.id, failureContext: { failedStage: failedTask.kind, failureClass, message, rawOutput } },
  });
  run.tasks[impl.id] = impl;
  run.edges.push({ from: failedTask.id, to: impl.id, type: "retry_of", reason: "code failure routes to implement" });
  const rest = appendStageChainFromFailure(run, impl, title);
  return [impl, ...rest];
}

function appendStageChainFromFailure(run: TaskGraphRun, impl: TaskNode, title: string) {
  const tasks = appendStageChain(run, title, impl.description, impl.metadata.source, [impl.id], impl.parentId, {
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
