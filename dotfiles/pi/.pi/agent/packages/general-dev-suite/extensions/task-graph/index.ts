import * as fs from "node:fs";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import type { FailureRecord, Priority, RunMode, TaskGraphOptions, TaskGraphRun, TaskKind, TaskStatus } from "./schema";
import { TASK_KINDS, TASK_STATUSES, terminalDone } from "./schema";
import { appendStageChain, createAdHocTask, createRun } from "./formulas";
import { footerStatus, renderReadyInstructions, renderStatus } from "./display";
import { aliasTaskId, nextNumericId, readyTasks, routeFailure, updateTask } from "./scheduler";
import { appendEvent, listRuns, loadRun, saveRun, writeArtifact } from "./store";

const text = (s: string, details: Record<string, unknown> = {}) => ({ content: [{ type: "text" as const, text: s }], details });
const statusLiterals = TASK_STATUSES.map((s) => Type.Literal(s));
const modeLiterals = ["do", "pdo", "todo", "todo-strict", "ticketdo", "follow-pipeline", "fixup-pipelines", "fulcrum", "custom"].map((s) => Type.Literal(s));

function updateUi(ctx: ExtensionContext, run?: TaskGraphRun) {
  if (!run) {
    ctx.ui.setStatus("task-graph", undefined);
    ctx.ui.setWidget("task-graph", undefined);
    return;
  }
  ctx.ui.setStatus("task-graph", footerStatus(run));
  ctx.ui.setWidget("task-graph", renderStatus(run).split("\n"), { placement: "aboveEditor" });
}

function requireRun(ctx: ExtensionContext, runId?: string) {
  const run = loadRun(ctx.cwd, runId);
  if (!run) throw new Error(runId ? `No task graph run found: ${runId}` : "No current task graph run found");
  return run;
}

async function gitBaseline(pi: ExtensionAPI, ctx: ExtensionContext) {
  const baseline = { dirtyAtStart: [] as string[], branch: undefined as string | undefined, head: undefined as string | undefined };
  try {
    const status = await pi.exec("git", ["status", "--short"], { cwd: ctx.cwd, timeout: 5000 });
    baseline.dirtyAtStart = status.stdout.trim() ? status.stdout.trim().split("\n") : [];
  } catch {}
  try {
    const branch = await pi.exec("git", ["branch", "--show-current"], { cwd: ctx.cwd, timeout: 5000 });
    baseline.branch = branch.stdout.trim() || undefined;
  } catch {}
  try {
    const head = await pi.exec("git", ["rev-parse", "HEAD"], { cwd: ctx.cwd, timeout: 5000 });
    baseline.head = head.stdout.trim() || undefined;
  } catch {}
  return baseline;
}

function refreshRunStatus(run: TaskGraphRun) {
  const tasks = Object.values(run.tasks).filter((task) => task.status !== "deleted");
  const readyCount = tasks.length ? readyTasks(run).length : 0;
  if (!tasks.length) run.status = "pending";
  else if (tasks.every((task) => task.status === "succeeded" || task.status === "skipped")) run.status = "succeeded";
  else if (tasks.some((task) => task.status === "running")) run.status = "running";
  else if (readyCount > 0) run.status = "ready";
  else if (tasks.some((task) => task.status === "awaiting_input")) run.status = "awaiting_input";
  else if (tasks.some((task) => task.status === "failed")) run.status = "failed";
  else run.status = "blocked";
}

function closeOrOpenAttempt(task: TaskGraphRun["tasks"][string], status: TaskStatus, summary?: string, failure?: FailureRecord) {
  const runner = task.runner;
  let attempt = task.attempts[task.attempts.length - 1];
  if (!attempt || attempt.endedAt) {
    attempt = {
      attemptId: `attempt-${Date.now().toString(36)}`,
      startedAt: new Date().toISOString(),
      status,
      runner,
      inputSummary: task.title,
      envRetryCount: 0,
      codeRetryIteration: Number(task.metadata.iteration ?? 1),
    };
    task.attempts.push(attempt);
  }
  attempt.status = status;
  if (summary) attempt.outputSummary = summary;
  if (failure) attempt.error = failure;
  if (terminalDone(status)) attempt.endedAt = new Date().toISOString();
}

function linkDependency(run: TaskGraphRun, from: string, to: string, reason: string) {
  const child = run.tasks[to];
  const parent = run.tasks[from];
  if (!child || !parent) return;
  if (!child.blockedBy.includes(from)) child.blockedBy.push(from);
  if (!parent.blocks.includes(to)) parent.blocks.push(to);
  run.edges.push({ from, to, type: "depends_on", reason });
}

function unlinkDependency(run: TaskGraphRun, from: string, to: string) {
  const child = run.tasks[to];
  const parent = run.tasks[from];
  if (child) child.blockedBy = child.blockedBy.filter((id) => id !== from);
  if (parent) parent.blocks = parent.blocks.filter((id) => id !== to);
  run.edges = run.edges.filter((edge) => !(edge.from === from && edge.to === to && edge.type === "depends_on"));
}

interface DecompositionSubtask {
  id: string;
  title: string;
  description?: string;
  priority?: Priority;
  dependsOn?: string[];
  acceptanceCriteria?: string[];
  suggestedChecks?: string[];
  expectedWritePaths?: string[];
}

interface DecompositionPayload {
  subtasks: DecompositionSubtask[];
  notes?: string[];
}

function readDecompositionJson(task: TaskGraphRun["tasks"][string], provided?: string) {
  if (provided?.trim()) return provided;
  const artifact = task.artifacts.find((a) => a.path?.endsWith("decomposition.json") || a.type === "decomposition");
  if (!artifact?.path) throw new Error("No decompositionJson provided and no decomposition.json artifact found on the task");
  return fs.readFileSync(artifact.path, "utf8");
}

function parseDecompositionPayload(raw: string): DecompositionPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid decomposition JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { subtasks?: unknown }).subtasks)) {
    throw new Error("Decomposition JSON must be an object with a subtasks array");
  }
  const subtasks = (parsed as { subtasks: unknown[] }).subtasks.map((entry, index) => {
    if (!entry || typeof entry !== "object") throw new Error(`subtasks[${index}] must be an object`);
    const obj = entry as Record<string, unknown>;
    const id = typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : `subtask-${index + 1}`;
    const title = typeof obj.title === "string" && obj.title.trim() ? obj.title.trim() : undefined;
    if (!title) throw new Error(`subtasks[${index}].title is required`);
    const priority = obj.priority === "A" || obj.priority === "B" || obj.priority === "C" ? obj.priority : "B";
    const stringArray = (value: unknown) => Array.isArray(value) ? value.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim()) : undefined;
    return {
      id,
      title,
      description: typeof obj.description === "string" && obj.description.trim() ? obj.description.trim() : title,
      priority,
      dependsOn: stringArray(obj.dependsOn) ?? [],
      acceptanceCriteria: stringArray(obj.acceptanceCriteria) ?? [],
      suggestedChecks: stringArray(obj.suggestedChecks) ?? [],
      expectedWritePaths: stringArray(obj.expectedWritePaths) ?? [],
    } satisfies DecompositionSubtask;
  });
  if (subtasks.length === 0) throw new Error("Decomposition must contain at least one subtask");
  const ids = new Set<string>();
  for (const subtask of subtasks) {
    if (ids.has(subtask.id)) throw new Error(`Duplicate decomposition subtask id: ${subtask.id}`);
    ids.add(subtask.id);
  }
  for (const subtask of subtasks) {
    for (const dep of subtask.dependsOn ?? []) {
      if (!ids.has(dep)) throw new Error(`Unknown dependency ${dep} on subtask ${subtask.id}`);
    }
  }
  assertNoDecompositionCycle(subtasks);
  const notes = Array.isArray((parsed as { notes?: unknown }).notes)
    ? (parsed as { notes: unknown[] }).notes.filter((x): x is string => typeof x === "string")
    : undefined;
  return { subtasks, notes };
}

function assertNoDecompositionCycle(subtasks: DecompositionSubtask[]) {
  const byId = new Map(subtasks.map((subtask) => [subtask.id, subtask]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string, path: string[]) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new Error(`Decomposition dependency cycle: ${[...path, id].join(" -> ")}`);
    visiting.add(id);
    for (const dep of byId.get(id)?.dependsOn ?? []) visit(dep, [...path, id]);
    visiting.delete(id);
    visited.add(id);
  };
  for (const subtask of subtasks) visit(subtask.id, []);
}

function lastActiveTaskId(taskIds: string[], run: TaskGraphRun) {
  const active = [...taskIds].reverse().find((id) => run.tasks[id]?.status !== "skipped");
  return active ?? taskIds[taskIds.length - 1];
}

const FALLBACK_STAGE_KINDS = new Set<TaskKind>(["IMPLEMENT", "COMPILE", "UNIT_TEST", "PERF_TEST", "CODE_REVIEW", "RESTART", "API_TEST", "E2E_TEST", "UX_REVIEW", "SPEC_UPDATE", "LINT", "COMMIT", "PUSH"]);

function reachableFrom(run: TaskGraphRun, startId: string) {
  const seen = new Set<string>();
  const queue = [...(run.tasks[startId]?.blocks ?? [])];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    queue.push(...(run.tasks[id]?.blocks ?? []));
  }
  return seen;
}

function expandDecompositionIntoChains(run: TaskGraphRun, task: TaskGraphRun["tasks"][string], decompositionJson?: string) {
  if (task.metadata.decomposition?.expandedAt) {
    return {
      alreadyExpanded: true,
      expandedTaskIds: task.metadata.decomposition.expandedTaskIds ?? [],
      supersededTaskIds: [] as string[],
      subtasks: [] as DecompositionSubtask[],
    };
  }
  const payload = parseDecompositionPayload(readDecompositionJson(task, decompositionJson));
  const firstBySubtask = new Map<string, string>();
  const lastBySubtask = new Map<string, string>();
  const expandedTaskIds: string[] = [];
  const expansionBlockers = [
    task.id,
    ...task.blocks.filter((blockedId) => {
      const blocked = run.tasks[blockedId];
      return blocked && (blocked.kind === "GRILL" || blocked.kind === "GO") && blocked.status !== "skipped";
    }),
  ];
  for (const subtask of payload.subtasks) {
    const chain = appendStageChain(run, subtask.title, subtask.description ?? subtask.title, task.metadata.source, expansionBlockers, task.id, {
      decompositionTaskId: task.id,
      decompositionSubtaskId: subtask.id,
      acceptanceCriteria: subtask.acceptanceCriteria ?? [],
      suggestedChecks: subtask.suggestedChecks ?? [],
      expectedWritePaths: subtask.expectedWritePaths ?? [],
      priority: subtask.priority ?? "B",
      complex: true,
    });
    if (!chain.length) continue;
    firstBySubtask.set(subtask.id, chain[0].id);
    lastBySubtask.set(subtask.id, lastActiveTaskId(chain.map((t) => t.id), run));
    expandedTaskIds.push(...chain.map((t) => t.id));
    run.edges.push({ from: task.id, to: chain[0].id, type: "decomposes_to", reason: `decomposition subtask ${subtask.id}` });
  }
  for (const subtask of payload.subtasks) {
    const first = firstBySubtask.get(subtask.id);
    if (!first) continue;
    for (const dep of subtask.dependsOn ?? []) {
      const depLast = lastBySubtask.get(dep);
      if (depLast) linkDependency(run, depLast, first, `decomposition dependency ${dep} -> ${subtask.id}`);
    }
  }
  const reachable = reachableFrom(run, task.id);
  const supersededTaskIds: string[] = [];
  for (const candidate of Object.values(run.tasks)) {
    if (!reachable.has(candidate.id)) continue;
    if (!FALLBACK_STAGE_KINDS.has(candidate.kind)) continue;
    if (candidate.metadata.decompositionSubtaskId !== undefined) continue;
    if (candidate.status !== "pending" && candidate.status !== "ready") continue;
    candidate.status = "skipped";
    candidate.metadata.skip = { skipped: true, reason: "Superseded by decomposition expansion", gate: "decomposition" };
    supersededTaskIds.push(candidate.id);
  }
  task.metadata.decomposition = {
    ...(task.metadata.decomposition ?? {}),
    expectedArtifact: task.metadata.decomposition?.expectedArtifact ?? "decomposition.json",
    subtaskCountHint: payload.subtasks.length,
    expandedAt: new Date().toISOString(),
    expandedTaskIds,
  };
  if (payload.notes?.length) {
    task.artifacts.push(writeArtifact(run, task.id, "decomposition-notes", "decomposition-notes.md", payload.notes.map((note) => `- ${note}`).join("\n"), "Notes from decomposition expansion"));
  }
  return { alreadyExpanded: false, expandedTaskIds, supersededTaskIds, subtasks: payload.subtasks };
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    updateUi(ctx, loadRun(ctx.cwd));
  });

  pi.on("before_agent_start", async (event) => {
    const lower = event.prompt.toLowerCase();
    if (!/\b(add|implement|fix|build|create|write|refactor|migrate|replace|remove|design|support|enable|finish|complete)\b/.test(lower)) return;
    return {
      systemPrompt: `${event.systemPrompt}\n\n<task-graph-advisory>\nFor non-trivial work, prefer the local task graph tools over ad-hoc linear TODOs: create a run with task_graph_create (pdo when design choices are open, do when the plan is obvious), use task_graph_next to obtain dependency-ready parallel-safe tasks, run executable tasks via subagents by default, then record outcomes with task_graph_update. Treat commit/push and TODO.org mutations as explicit approvals. This advisory is internal.\n</task-graph-advisory>`,
    };
  });

  pi.registerCommand("task-status", {
    description: "Show the current task-graph pipeline state",
    handler: async (args, ctx) => {
      const run = loadRun(ctx.cwd, args.trim() || undefined);
      ctx.ui.notify(run ? renderStatus(run, { expanded: true, limit: 200 }) : "No task graph run found.", run ? "info" : "warning");
      updateUi(ctx, run);
    },
  });

  pi.registerCommand("task-next", {
    description: "Show dependency-ready task-graph work and subagent prompts",
    handler: async (args, ctx) => {
      const run = loadRun(ctx.cwd, args.trim() || undefined);
      ctx.ui.notify(run ? renderReadyInstructions(run) : "No task graph run found.", run ? "info" : "warning");
      updateUi(ctx, run);
    },
  });

  pi.registerCommand("task-clear", {
    description: "Hide the task graph widget/status for this session (does not delete files)",
    handler: async (_args, ctx) => updateUi(ctx, undefined),
  });

  pi.registerTool({
    name: "task_graph_create",
    label: "Create Task Graph",
    description: "Create a durable dependency-aware task/pipeline run. Use pdo/fulcrum for feature work with design choices, do for obvious implementation, todo/todo-strict for TODO.org, ticketdo for ticket-driven work. Complex/uncertain inputs may schedule ORACLE_CONSULT and DECOMPOSE gates before implementation. Executable tasks are intended to run through subagents by default.",
    promptSnippet: "task_graph_create: create a durable dependent task pipeline for non-trivial work; complex inputs may add Oracle/decomposition gates; follow with task_graph_next and task_graph_update.",
    promptGuidelines: [
      "For non-trivial coding work, create or use a task graph instead of free-form TODOs.",
      "Use pdo/fulcrum when design decisions are open; use do when the plan is obvious.",
      "If ORACLE_CONSULT is ready, call Oracle in browser mode with GPT-5.5 Pro Extended and ample non-secret context, then record the result.",
      "If DECOMPOSE emits decomposition.json, call task_graph_expand_decomposition before implementation.",
      "Run dependency-ready executable tasks through subagents by default, then record outcomes with task_graph_update.",
    ],
    parameters: Type.Object({
      mode: Type.Union(modeLiterals),
      input: Type.String(),
      options: Type.Optional(Type.Object({
        commit: Type.Optional(Type.Boolean()),
        push: Type.Optional(Type.Boolean()),
        strict: Type.Optional(Type.Boolean()),
        continuous: Type.Optional(Type.Boolean()),
        mutateOrg: Type.Optional(Type.Boolean()),
        maxParallel: Type.Optional(Type.Number()),
        dryRun: Type.Optional(Type.Boolean()),
        oracleConsult: Type.Optional(Type.Boolean()),
        decompose: Type.Optional(Type.Boolean()),
        oracleContextPaths: Type.Optional(Type.Array(Type.String())),
      })),
    }),
    async execute(_toolCallId, params: { mode: RunMode; input: string; options?: TaskGraphOptions }, _signal, _onUpdate, ctx) {
      const run = createRun(ctx.cwd, params.mode, params.input, params.options ?? {}, await gitBaseline(pi, ctx));
      refreshRunStatus(run);
      saveRun(run);
      appendEvent(run, { type: "run_created", mode: params.mode, options: params.options ?? {} });
      updateUi(ctx, run);
      return text(`${renderStatus(run)}\n\nNext: call task_graph_next to obtain ready work.`, { runId: run.runId, file: `.pi/dev-suite/task-graph/runs/${run.runId}.json` });
    },
  });

  pi.registerTool({
    name: "task_graph_next",
    label: "Next Task Graph Work",
    description: "Return dependency-ready parallel-safe tasks with subagent/direct runner prompts and context mode. This tool schedules but does not execute; call subagent/default tools for returned executable tasks (usually context=fresh) and record results with task_graph_update.",
    parameters: Type.Object({ runId: Type.Optional(Type.String()), markReady: Type.Optional(Type.Boolean()) }),
    async execute(_toolCallId, params: { runId?: string; markReady?: boolean }, _signal, _onUpdate, ctx) {
      const run = requireRun(ctx, params.runId);
      const ready = readyTasks(run);
      if (params.markReady !== false) {
        for (const item of ready) if (run.tasks[item.id].status === "pending") run.tasks[item.id].status = "ready";
      }
      refreshRunStatus(run);
      saveRun(run);
      appendEvent(run, { type: "next", readyTaskIds: ready.map((task) => task.id) });
      updateUi(ctx, run);
      return text(renderReadyInstructions(run), { runId: run.runId, ready });
    },
  });

  pi.registerTool({
    name: "task_graph_update",
    label: "Update Task Graph",
    description: "Record task progress, artifacts, failures, and dependency edits. Use after each subagent/direct task. Failures can route back to implementation automatically when policy allows. A succeeded DECOMPOSE task with decomposition.json auto-expands into implementation chains.",
    parameters: Type.Object({
      runId: Type.Optional(Type.String()),
      taskId: Type.String(),
      status: Type.Optional(Type.Union(statusLiterals)),
      summary: Type.Optional(Type.String()),
      errorMessage: Type.Optional(Type.String()),
      failureClass: Type.Optional(Type.Union([Type.Literal("code"), Type.Literal("environment"), Type.Literal("operator"), Type.Literal("unknown")])),
      rawOutput: Type.Optional(Type.String()),
      changedFiles: Type.Optional(Type.Array(Type.String())),
      artifact: Type.Optional(Type.Object({ type: Type.String(), filename: Type.String(), content: Type.String(), summary: Type.Optional(Type.String()) })),
      addBlockedBy: Type.Optional(Type.Array(Type.String())),
      removeBlockedBy: Type.Optional(Type.Array(Type.String())),
      awaitingInput: Type.Optional(Type.Object({ question: Type.String(), recommended: Type.Optional(Type.String()), options: Type.Optional(Type.Array(Type.String())) })),
    }),
    async execute(_toolCallId, params: {
      runId?: string;
      taskId: string;
      status?: TaskStatus;
      summary?: string;
      errorMessage?: string;
      failureClass?: "code" | "environment" | "operator" | "unknown";
      rawOutput?: string;
      changedFiles?: string[];
      artifact?: { type: string; filename: string; content: string; summary?: string };
      addBlockedBy?: string[];
      removeBlockedBy?: string[];
      awaitingInput?: { question: string; recommended?: string; options?: string[] };
    }, _signal, _onUpdate, ctx) {
      const run = requireRun(ctx, params.runId);
      const id = aliasTaskId(run, params.taskId) ?? params.taskId;
      const task = run.tasks[id];
      if (!task) throw new Error(`Unknown task id: ${params.taskId}`);
      for (const dep of params.addBlockedBy ?? []) {
        const depId = aliasTaskId(run, dep) ?? dep;
        linkDependency(run, depId, id, "manual update");
      }
      for (const dep of params.removeBlockedBy ?? []) {
        const depId = aliasTaskId(run, dep) ?? dep;
        unlinkDependency(run, depId, id);
      }
      if (params.changedFiles) task.metadata.changedFiles = params.changedFiles;
      if (params.awaitingInput) {
        task.metadata.awaitingInput = params.awaitingInput;
        task.status = "awaiting_input";
      }
      const writtenArtifact = params.artifact ? writeArtifact(run, id, params.artifact.type, params.artifact.filename, params.artifact.content, params.artifact.summary) : undefined;
      if (writtenArtifact) task.artifacts.push(writtenArtifact);
      let autoExpansion: ReturnType<typeof expandDecompositionIntoChains> | undefined;
      if (params.status) {
        const failure: FailureRecord | undefined = params.status === "failed" ? { failedStage: task.kind, failureClass: params.failureClass ?? "unknown", message: params.errorMessage ?? params.summary ?? "Task failed", rawOutput: params.rawOutput } : undefined;
        closeOrOpenAttempt(task, params.status, params.summary, failure);
        updateTask(run, id, { status: params.status });
        if (failure) {
          task.metadata.failureContext = failure;
          const routed = routeFailure(run, task, failure.message, failure.rawOutput, failure.failureClass);
          appendEvent(run, { type: "task_failed", taskId: id, routedTaskIds: routed.map((t) => t.id), failure });
        } else {
          appendEvent(run, { type: "task_updated", taskId: id, status: params.status, summary: params.summary });
        }
        if (params.status === "succeeded" && task.kind === "DECOMPOSE" && params.artifact && (params.artifact.filename === "decomposition.json" || params.artifact.type === "decomposition")) {
          autoExpansion = expandDecompositionIntoChains(run, task, params.artifact.content);
          if (!autoExpansion.alreadyExpanded) appendEvent(run, { type: "decomposition_expanded", taskId: id, auto: true, expandedTaskIds: autoExpansion.expandedTaskIds, supersededTaskIds: autoExpansion.supersededTaskIds, subtaskCount: autoExpansion.subtasks.length });
        }
      } else {
        task.updatedAt = new Date().toISOString();
        appendEvent(run, { type: "task_patched", taskId: id });
      }
      refreshRunStatus(run);
      saveRun(run);
      updateUi(ctx, run);
      return text(renderStatus(run), { runId: run.runId, taskId: id, task, autoExpansion });
    },
  });

  pi.registerTool({
    name: "task_graph_expand_decomposition",
    label: "Expand Task Graph Decomposition",
    description: "Expand a completed DECOMPOSE task artifact into multiple dependent implementation/check chains. Use after a DECOMPOSE task attaches decomposition.json.",
    promptSnippet: "task_graph_expand_decomposition: turn a DECOMPOSE task's decomposition.json into dependent implementation/check chains.",
    parameters: Type.Object({
      runId: Type.Optional(Type.String()),
      taskId: Type.String(),
      decompositionJson: Type.Optional(Type.String()),
    }),
    async execute(_toolCallId, params: { runId?: string; taskId: string; decompositionJson?: string }, _signal, _onUpdate, ctx) {
      const run = requireRun(ctx, params.runId);
      const id = aliasTaskId(run, params.taskId) ?? params.taskId;
      const task = run.tasks[id];
      if (!task) throw new Error(`Unknown task id: ${params.taskId}`);
      if (task.kind !== "DECOMPOSE") throw new Error(`Task ${id} is ${task.kind}, not DECOMPOSE`);
      const expansion = expandDecompositionIntoChains(run, task, params.decompositionJson);
      if (expansion.alreadyExpanded) {
        return text(`Decomposition task ${id} was already expanded at ${task.metadata.decomposition?.expandedAt}.`, { runId: run.runId, taskId: id, expandedTaskIds: expansion.expandedTaskIds });
      }
      refreshRunStatus(run);
      saveRun(run);
      appendEvent(run, { type: "decomposition_expanded", taskId: id, expandedTaskIds: expansion.expandedTaskIds, supersededTaskIds: expansion.supersededTaskIds, subtaskCount: expansion.subtasks.length });
      updateUi(ctx, run);
      return text(renderStatus(run, { expanded: true }), { runId: run.runId, taskId: id, expandedTaskIds: expansion.expandedTaskIds, supersededTaskIds: expansion.supersededTaskIds, subtasks: expansion.subtasks });
    },
  });

  pi.registerTool({
    name: "task_graph_status",
    label: "Task Graph Status",
    description: "Show the current or selected task graph run, including counts, ready tasks, dependencies, and runner assignments.",
    parameters: Type.Object({ runId: Type.Optional(Type.String()), expanded: Type.Optional(Type.Boolean()), limit: Type.Optional(Type.Number()) }),
    async execute(_toolCallId, params: { runId?: string; expanded?: boolean; limit?: number }, _signal, _onUpdate, ctx) {
      const run = requireRun(ctx, params.runId);
      refreshRunStatus(run);
      saveRun(run);
      updateUi(ctx, run);
      return text(renderStatus(run, { expanded: params.expanded, limit: params.limit }), { runId: run.runId, run });
    },
  });

  pi.registerTool({
    name: "task_graph_list_runs",
    label: "List Task Graph Runs",
    description: "List recent durable task graph runs in the current project.",
    parameters: Type.Object({ limit: Type.Optional(Type.Number()) }),
    async execute(_toolCallId, params: { limit?: number }, _signal, _onUpdate, ctx) {
      const runs = listRuns(ctx.cwd, params.limit ?? 20);
      const lines = runs.map((run) => `${run.runId}\t${run.mode}\t${run.status}\t${run.updatedAt}\t${Object.keys(run.tasks).length} tasks`);
      return text(lines.join("\n") || "No task graph runs found.", { runs: runs.map((run) => ({ runId: run.runId, mode: run.mode, status: run.status })) });
    },
  });

  pi.registerTool({
    name: "task_graph_approve",
    label: "Approve Task Graph Gate",
    description: "Record explicit approval for gated operations such as commit, push, TODO.org mutation, or parallel writes. Approval can unskip corresponding tasks for the current run.",
    parameters: Type.Object({
      runId: Type.Optional(Type.String()),
      kind: Type.Union([Type.Literal("commit"), Type.Literal("push"), Type.Literal("force-push"), Type.Literal("org-mutation"), Type.Literal("parallel-write")]),
      approved: Type.Boolean(),
      note: Type.Optional(Type.String()),
    }),
    async execute(_toolCallId, params: { runId?: string; kind: "commit" | "push" | "force-push" | "org-mutation" | "parallel-write"; approved: boolean; note?: string }, _signal, _onUpdate, ctx) {
      const run = requireRun(ctx, params.runId);
      const at = new Date().toISOString();
      if (params.kind === "commit") run.config.commitEnabled = params.approved;
      if (params.kind === "push") run.config.pushEnabled = params.approved;
      if (params.kind === "org-mutation") run.config.mutateOrg = params.approved;
      for (const task of Object.values(run.tasks)) {
        task.metadata.approvals = [...(task.metadata.approvals ?? []), { kind: params.kind, approved: params.approved, by: "user", at, note: params.note }];
        if (params.approved && ((params.kind === "commit" && task.kind === "COMMIT") || (params.kind === "push" && task.kind === "PUSH"))) {
          if (task.status === "skipped") task.status = "pending";
          task.metadata.disabled = false;
          task.metadata.skip = undefined;
        }
      }
      appendEvent(run, { type: "approval", ...params });
      refreshRunStatus(run);
      saveRun(run);
      updateUi(ctx, run);
      return text(renderStatus(run), { runId: run.runId, approval: params });
    },
  });

  pi.registerTool({
    name: "task_graph_add_task",
    label: "Add Task Graph Task",
    description: "Add an ad-hoc task to the current graph with optional dependencies. Prefer this over free-form TODOs when the task belongs to the active pipeline.",
    parameters: Type.Object({
      runId: Type.Optional(Type.String()),
      title: Type.String(),
      description: Type.Optional(Type.String()),
      blockedBy: Type.Optional(Type.Array(Type.String())),
      kind: Type.Optional(Type.String()),
    }),
    async execute(_toolCallId, params: { runId?: string; title: string; description?: string; blockedBy?: string[]; kind?: string }, _signal, _onUpdate, ctx) {
      const run = requireRun(ctx, params.runId);
      const kind = TASK_KINDS.includes(params.kind as TaskKind) ? (params.kind as TaskKind) : "DIRECT";
      const blockedBy = (params.blockedBy ?? []).map((dep) => aliasTaskId(run, dep) ?? dep);
      const task = createAdHocTask(run, params.title, params.description ?? params.title, blockedBy, kind);
      task.metadata.numericId = nextNumericId(run);
      refreshRunStatus(run);
      saveRun(run);
      appendEvent(run, { type: "task_added", taskId: task.id });
      updateUi(ctx, run);
      return text(renderStatus(run), { runId: run.runId, taskId: task.id, task });
    },
  });

  pi.registerTool({
    name: "todo",
    label: "Task Graph Todo",
    description: "Compatibility todo tool backed by the local task graph. Supports create/update/list/get/delete/clear for simple task tracking, while preserving dependencies and durable state.",
    promptSnippet: "todo: manage the current task graph's simple tasks; use task_graph_create for non-trivial pipelines.",
    parameters: Type.Object({
      action: Type.Union([Type.Literal("create"), Type.Literal("update"), Type.Literal("list"), Type.Literal("get"), Type.Literal("delete"), Type.Literal("clear")]),
      subject: Type.Optional(Type.String()),
      description: Type.Optional(Type.String()),
      activeForm: Type.Optional(Type.String()),
      status: Type.Optional(Type.Union([Type.Literal("pending"), Type.Literal("in_progress"), Type.Literal("completed"), Type.Literal("deleted")])),
      blockedBy: Type.Optional(Type.Array(Type.Number())),
      addBlockedBy: Type.Optional(Type.Array(Type.Number())),
      removeBlockedBy: Type.Optional(Type.Array(Type.Number())),
      owner: Type.Optional(Type.String()),
      id: Type.Optional(Type.Number()),
      includeDeleted: Type.Optional(Type.Boolean()),
    }),
    async execute(_toolCallId, params: {
      action: "create" | "update" | "list" | "get" | "delete" | "clear";
      subject?: string;
      description?: string;
      status?: "pending" | "in_progress" | "completed" | "deleted";
      activeForm?: string;
      blockedBy?: number[];
      addBlockedBy?: number[];
      removeBlockedBy?: number[];
      owner?: string;
      id?: number;
      includeDeleted?: boolean;
    }, _signal, _onUpdate, ctx) {
      let run = loadRun(ctx.cwd);
      if (!run && params.action !== "list") {
        run = createRun(ctx.cwd, "custom", "Ad-hoc task list", {}, { dirtyAtStart: [] });
      }
      if (!run) return text("No task graph run found.", { tasks: [] });

      if (params.action === "create") {
        if (!params.subject) throw new Error("subject is required for todo create");
        const numericId = nextNumericId(run);
        const deps = (params.blockedBy ?? []).map((n) => aliasTaskId(run!, n)).filter((id): id is string => Boolean(id));
        const task = createAdHocTask(run, params.subject, params.description ?? params.subject, deps, "DIRECT");
        task.metadata.numericId = numericId;
        task.metadata.owner = params.owner;
        refreshRunStatus(run);
        saveRun(run);
        updateUi(ctx, run);
        return text(`Created task #${numericId}: ${params.subject}`, { task });
      }

      if (params.action === "clear") {
        for (const task of Object.values(run.tasks)) task.status = "deleted";
        refreshRunStatus(run);
        saveRun(run);
        updateUi(ctx, run);
        return text("Cleared current task graph tasks.");
      }

      const id = aliasTaskId(run, params.id);
      if (["get", "update", "delete"].includes(params.action) && !id) throw new Error("id is required");
      if (params.action === "get") return text(renderStatus(run, { expanded: true }), { task: run.tasks[id!] });
      if (params.action === "delete") {
        run.tasks[id!].status = "deleted";
        refreshRunStatus(run);
        saveRun(run);
        updateUi(ctx, run);
        return text(`Deleted task #${params.id}.`);
      }
      if (params.action === "update") {
        const task = run.tasks[id!];
        if (params.subject) task.title = params.subject;
        if (params.description) task.description = params.description;
        if (params.owner) task.metadata.owner = params.owner;
        if (params.status) {
          task.status = params.status === "in_progress" ? "running" : params.status === "completed" ? "succeeded" : params.status;
          closeOrOpenAttempt(task, task.status, params.activeForm);
        }
        for (const dep of params.addBlockedBy ?? []) {
          const depId = aliasTaskId(run, dep);
          if (depId) linkDependency(run, depId, id!, "todo update");
        }
        for (const dep of params.removeBlockedBy ?? []) {
          const depId = aliasTaskId(run, dep);
          if (depId) unlinkDependency(run, depId, id!);
        }
        refreshRunStatus(run);
        saveRun(run);
        updateUi(ctx, run);
        return text(`Updated task #${params.id}.`, { task });
      }

      const statusFilter = params.status === "in_progress" ? "running" : params.status === "completed" ? "succeeded" : params.status;
      const rows = Object.values(run.tasks)
        .filter((task) => params.includeDeleted || task.status !== "deleted")
        .filter((task) => !statusFilter || task.status === statusFilter)
        .map((task) => ({ id: task.metadata.numericId ?? task.id, subject: task.title, status: task.status, blockedBy: task.blockedBy, owner: task.metadata.owner }));
      return text(rows.length ? rows.map((task) => `#${task.id} [${task.status}] ${task.subject}`).join("\n") : "No tasks.", { tasks: rows });
    },
  });
}
