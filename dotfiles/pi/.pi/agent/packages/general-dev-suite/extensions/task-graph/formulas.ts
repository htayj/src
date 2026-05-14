import * as fs from "node:fs";
import * as path from "node:path";
import type { ComplexityMetadata, Edge, Priority, RunMode, RunnerSpec, TaskGraphOptions, TaskGraphRun, TaskKind, TaskNode } from "./schema";
import { newId, slugify } from "./store";

const now = () => new Date().toISOString();

function runner(kind: RunnerSpec["kind"], name: string, sideEffects: RunnerSpec["sideEffects"], conflictGroup?: string): RunnerSpec {
  return {
    kind,
    name,
    sideEffects,
    writePolicy: {
      declaredPaths: [],
      allowOutsideDeclaredPaths: kind === "subagent" || sideEffects === "write",
      conflictGroup,
    },
  };
}

function route(kind: TaskKind) {
  if (["COMPILE", "UNIT_TEST", "PERF_TEST", "CODE_REVIEW", "API_TEST", "E2E_TEST", "UX_REVIEW", "LINT"].includes(kind)) {
    return { onFailure: "route_to_implement" as const, maxCodeIterations: 3, maxEnvironmentalRetries: 2 };
  }
  if (kind === "PUSH") return { onFailure: "stop_push_failed" as const, maxCodeIterations: 1, maxEnvironmentalRetries: 0 };
  return { onFailure: "stop_for_user" as const, maxCodeIterations: 3, maxEnvironmentalRetries: 2 };
}

export function makeTask(input: {
  kind: TaskKind;
  title: string;
  description?: string;
  priority?: Priority;
  blockedBy?: string[];
  parentId?: string;
  source: string;
  runner: RunnerSpec;
  subagent?: TaskNode["subagent"];
  metadata?: Record<string, unknown>;
}): TaskNode {
  const id = newId(input.kind.toLowerCase());
  const createdAt = now();
  return {
    id,
    kind: input.kind,
    title: input.title,
    description: input.description ?? input.title,
    status: "pending",
    priority: input.priority ?? "B",
    parentId: input.parentId,
    blockedBy: [...(input.blockedBy ?? [])],
    blocks: [],
    runner: input.runner,
    subagent: input.subagent,
    attempts: [],
    artifacts: [],
    metadata: {
      source: input.source,
      priority: input.priority ?? "B",
      route: route(input.kind),
      ...(input.metadata ?? {}),
    },
    createdAt,
    updatedAt: createdAt,
  };
}

function addTask(run: TaskGraphRun, task: TaskNode) {
  run.tasks[task.id] = task;
  for (const dep of task.blockedBy) {
    const parent = run.tasks[dep];
    if (parent && !parent.blocks.includes(task.id)) parent.blocks.push(task.id);
    run.edges.push({ from: dep, to: task.id, type: "depends_on", reason: "blockedBy" });
  }
  return task;
}

function addEdge(run: TaskGraphRun, from: string, to: string, reason: string, type: Edge["type"] = "depends_on") {
  run.edges.push({ from, to, type, reason });
  const child = run.tasks[to];
  if (child && type !== "conflicts_with" && !child.blockedBy.includes(from)) child.blockedBy.push(from);
  const parent = run.tasks[from];
  if (parent && !parent.blocks.includes(to)) parent.blocks.push(to);
}

function summarize(input: string) {
  const first = input.trim().split(/\r?\n/).find(Boolean) ?? "Task";
  return first.replace(/^#+\s*/, "").slice(0, 90);
}

export function analyzePlanningComplexity(input: string, mode: RunMode): ComplexityMetadata {
  const lines = input.split(/\r?\n/);
  const bulletCount = lines.filter((line) => /^\s*(?:[-*+]\s+|\d+[.)]\s+)/.test(line)).length;
  const acceptanceCount = lines.filter((line) => /\b(acceptance criteria|must|should|requirement|done when|verify|test|validation|criteria)\b/i.test(line)).length;
  const uncertaintyCount = lines.filter((line) => /\b(unclear|unknown|maybe|probably|design|architecture|refactor|migrate|replace|decompose|multiple|dependencies|plan|tradeoff|risky|complicated|complex)\b/i.test(line)).length;
  const lengthScore = input.length > 1200 ? 2 : input.length > 600 ? 1 : 0;
  const modeScore = mode === "pdo" || mode === "fulcrum" || mode === "ticketdo" ? 2 : 0;
  const score = Math.min(4, bulletCount) + Math.min(4, acceptanceCount) + Math.min(4, uncertaintyCount) + lengthScore + modeScore;
  const reasons = [
    bulletCount ? `${bulletCount} bullet/numbered item${bulletCount === 1 ? "" : "s"}` : undefined,
    acceptanceCount ? `${acceptanceCount} acceptance/validation term${acceptanceCount === 1 ? "" : "s"}` : undefined,
    uncertaintyCount ? `${uncertaintyCount} planning/uncertainty term${uncertaintyCount === 1 ? "" : "s"}` : undefined,
    lengthScore ? "long request" : undefined,
    modeScore ? `${mode} planning mode` : undefined,
  ].filter((reason): reason is string => Boolean(reason));
  const explicitOracle = /\b(oracle|gpt pro|gpt-5\.5 pro|extended thinking|deep design|major design|architecture review)\b/i.test(input);
  return {
    score,
    reasons,
    shouldDecompose: bulletCount >= 2 || acceptanceCount >= 3 || score >= 5,
    shouldConsultOracle: explicitOracle || score >= 8 || /\b(architecture|migration|large refactor|complicated|uncertain|ambiguous|tradeoff|risky|deep design)\b/i.test(input),
  };
}

function planTask(title: string, full: string, source: string, priority: Priority, metadata: Record<string, unknown> = {}) {
  return makeTask({
    kind: "PLAN",
    title: `Plan: ${title}`,
    description: full,
    priority,
    source,
    runner: runner("chain", "general-dev-plan", "read"),
    subagent: { type: "planner", chain: "general-dev-plan", skills: ["build-test-procedures", "tdd"] },
    metadata: { todoTitle: title, planFile: `.pi/dev-suite/task-graph/plans/${slugify(title)}.md`, readOnly: true, ...metadata },
  });
}

function oracleConsultTask(title: string, full: string, source: string, priority: Priority, blockedBy: string[], metadata: Record<string, unknown> = {}) {
  return makeTask({
    kind: "ORACLE_CONSULT",
    title: `Oracle consult: ${title}`,
    description: full,
    priority,
    blockedBy,
    source,
    runner: runner("manual_gate", "oracle-consult", "read"),
    metadata: {
      todoTitle: title,
      readOnly: true,
      oracle: {
        requested: true,
        model: "GPT-5.5 Pro Extended",
        mode: "browser",
        noSecrets: true,
      },
      awaitingInput: {
        question: "Use the Oracle MCP/tool in browser mode with GPT-5.5 Pro Extended. Attach or summarize ample non-secret project/task context, then record Oracle's recommendations on this task before continuing.",
        recommended: "Consult Oracle for planning, decomposition, risks, and validation strategy only. Do not send secrets, credentials, tokens, private keys, .env files, production data, or unrelated personal data.",
      },
      ...metadata,
    },
  });
}

function decomposeTask(title: string, full: string, source: string, priority: Priority, blockedBy: string[], metadata: Record<string, unknown> = {}) {
  return makeTask({
    kind: "DECOMPOSE",
    title: `Decompose: ${title}`,
    description: full,
    priority,
    blockedBy,
    source,
    runner: runner("chain", "task-decomposer", "read"),
    subagent: { type: "planner", chain: "general-dev-plan", skills: ["build-test-procedures", "tdd"] },
    metadata: {
      todoTitle: title,
      readOnly: true,
      decomposition: {
        expectedArtifact: "decomposition.json",
      },
      ...metadata,
    },
  });
}

function appendPlanningGates(run: TaskGraphRun, title: string, full: string, source: string, priority: Priority, blockers: string[], complexity: ComplexityMetadata, options: TaskGraphOptions, metadata: Record<string, unknown> = {}) {
  let gateIds = [...blockers];
  const shouldConsultOracle = options.oracleConsult ?? complexity.shouldConsultOracle;
  const shouldDecompose = options.decompose ?? complexity.shouldDecompose;
  if (shouldConsultOracle) {
    const oracle = addTask(run, oracleConsultTask(title, full, source, "A", gateIds, { ...metadata, complexity, oracle: { requested: true, model: "GPT-5.5 Pro Extended", mode: "browser", noSecrets: true, contextPaths: options.oracleContextPaths } }));
    gateIds = [oracle.id];
  }
  if (shouldDecompose) {
    const decompose = addTask(run, decomposeTask(title, full, source, "A", gateIds, { ...metadata, complexity }));
    gateIds = [decompose.id];
  }
  return gateIds;
}

export const STAGE_DEFS: Array<{ kind: TaskKind; title: string; runner: RunnerSpec; subagent?: TaskNode["subagent"] }> = [
  { kind: "IMPLEMENT", title: "Implement", runner: runner("subagent", "implementer", "write", "workspace-write"), subagent: { type: "implementer", skills: ["build-test-procedures", "tdd", "implementer"] } },
  { kind: "COMPILE", title: "Compile", runner: runner("subagent", "compile-verifier", "read"), subagent: { type: "compile-verifier", skills: ["build-test-procedures", "compile-verifier"] } },
  { kind: "UNIT_TEST", title: "Unit test", runner: runner("subagent", "unit-tester", "read"), subagent: { type: "unit-tester", skills: ["build-test-procedures", "unit-tester"] } },
  { kind: "PERF_TEST", title: "Perf test", runner: runner("subagent", "perf-tester", "read"), subagent: { type: "perf-tester", skills: ["perf-tester", "build-test-procedures"] } },
  { kind: "CODE_REVIEW", title: "Review", runner: runner("subagent", "code-review-enforcer", "read"), subagent: { type: "code-review-enforcer", skills: ["code-review"] } },
  { kind: "RESTART", title: "Restart", runner: runner("direct_safe", "dev-server-restart", "shell", "dev-server") },
  { kind: "API_TEST", title: "API test", runner: runner("subagent", "api-tester", "network"), subagent: { type: "api-tester", skills: ["api-testing", "api-tester"] } },
  { kind: "E2E_TEST", title: "E2E test", runner: runner("subagent", "e2e-tester", "network"), subagent: { type: "e2e-tester", skills: ["e2e-test", "e2e-tester", "frontend-design"] } },
  { kind: "UX_REVIEW", title: "UX review", runner: runner("subagent", "ux-review-enforcer", "read"), subagent: { type: "ux-review-enforcer", skills: ["ux-review", "frontend-design"] } },
  { kind: "SPEC_UPDATE", title: "Spec update", runner: runner("direct_safe", "spec-update", "write", "workspace-write") },
  { kind: "LINT", title: "Lint", runner: runner("direct_safe", "lint", "shell", "lint") },
  { kind: "COMMIT", title: "Commit", runner: runner("direct_safe", "git-commit", "git", "git-index") },
  { kind: "PUSH", title: "Push", runner: runner("direct_safe", "git-push", "git", "git-remote") },
];

export function appendStageChain(run: TaskGraphRun, title: string, description: string, source: string, blockedBy: string[], parentId?: string, metadata: Record<string, unknown> = {}) {
  let prev = [...blockedBy];
  const created: TaskNode[] = [];
  for (let i = 0; i < STAGE_DEFS.length; i += 1) {
    const def = STAGE_DEFS[i];
    const enabled = def.kind === "COMMIT" ? run.config.commitEnabled : def.kind === "PUSH" ? run.config.pushEnabled : true;
    const t = makeTask({
      kind: def.kind,
      title: `${def.title}: ${title}`,
      description,
      priority: (metadata.priority as Priority | undefined) ?? "B",
      blockedBy: prev,
      parentId,
      source,
      runner: def.runner,
      subagent: def.subagent,
      metadata: {
        todoTitle: title,
        chainPosition: i + 1,
        iteration: 1,
        disabled: !enabled,
        skip: !enabled ? { skipped: true, gate: "approval_required", reason: `${def.kind.toLowerCase()} requires explicit approval` } : undefined,
        ...metadata,
      },
    });
    if (!enabled) t.status = "skipped";
    addTask(run, t);
    created.push(t);
    prev = [t.id];
  }
  return created;
}

function parseTodoOrg(cwd: string, input: string) {
  const explicit = input.trim();
  const file = explicit && fs.existsSync(path.resolve(cwd, explicit)) ? path.resolve(cwd, explicit) : path.join(cwd, "TODO.org");
  if (!fs.existsSync(file)) return { file, items: [] as Array<{ title: string; body: string; priority: Priority }> };
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  const items: Array<{ title: string; body: string; priority: Priority }> = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = /^\*\s+TODO\s+(?:\[#([ABC])\]\s+)?(.+)$/.exec(lines[i]);
    if (!m) continue;
    const start = i;
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (/^\*\s+/.test(lines[j])) { end = j; break; }
    }
    items.push({ title: m[2].trim(), priority: (m[1] as Priority | undefined) ?? "B", body: lines.slice(start, end).join("\n") });
    i = end - 1;
  }
  return { file, items };
}

export function createRun(cwd: string, mode: RunMode, input: string, options: TaskGraphOptions = {}, gitBaseline = { dirtyAtStart: [] as string[] }): TaskGraphRun {
  const runId = newId(mode.replace(/[^a-z]/g, "") || "run");
  const createdAt = now();
  const run: TaskGraphRun = {
    schemaVersion: 1,
    runId,
    cwd,
    createdAt,
    updatedAt: createdAt,
    mode,
    status: "pending",
    rootTaskIds: [],
    tasks: {},
    edges: [],
    locks: { held: {} },
    config: {
      maxParallel: Math.max(1, Math.min(8, options.maxParallel ?? 3)),
      commitEnabled: options.commit === true,
      pushEnabled: options.push === true,
      strict: options.strict === true || mode === "todo-strict",
      continuous: options.continuous === true,
      mutateOrg: options.mutateOrg === true,
    },
    deferredCommits: [],
    gitBaseline,
  };

  const source = `${mode}-command`;
  const title = summarize(input);

  if (mode === "todo" || mode === "todo-strict") {
    const parsed = parseTodoOrg(cwd, input);
    run.orgState = { todoPath: parsed.file, donePath: path.join(cwd, "DONE.org"), backups: [], parsedTitles: parsed.items.map((i) => i.title) };
    const plans = parsed.items.length ? parsed.items : [{ title: title || "Process TODO", body: input || "Process TODO items", priority: "B" as Priority }];
    const runComplexity = analyzePlanningComplexity(`${input}\n${plans.map((item) => item.body).join("\n")}`, mode);
    const planIds: string[] = [];
    const gateIdsByPlan = new Map<string, string[]>();
    const allPlanGateIds: string[] = [];
    for (const item of plans) {
      const itemComplexity = analyzePlanningComplexity(item.body, mode);
      const p = addTask(run, planTask(item.title, item.body, source, item.priority, { orgPath: parsed.file, strict: mode === "todo-strict", complexity: itemComplexity }));
      const itemGateIds = appendPlanningGates(run, item.title, item.body, source, item.priority, [p.id], itemComplexity, { ...options, oracleConsult: false }, { planTaskId: p.id, orgPath: parsed.file, strict: mode === "todo-strict" });
      planIds.push(p.id);
      gateIdsByPlan.set(p.id, itemGateIds);
      allPlanGateIds.push(...itemGateIds);
      run.rootTaskIds.push(p.id);
    }
    let goBlockers = allPlanGateIds.length ? allPlanGateIds : planIds;
    const shouldConsultOracle = options.oracleConsult ?? (runComplexity.shouldConsultOracle && plans.length > 1);
    if (shouldConsultOracle) {
      const oracle = addTask(run, oracleConsultTask("TODO dependency analysis", input || plans.map((item) => item.body).join("\n\n"), source, "A", goBlockers, { complexity: runComplexity, orgPath: parsed.file }));
      goBlockers = [oracle.id];
      run.rootTaskIds.push(oracle.id);
    }
    const go = addTask(run, makeTask({ kind: "GO", title: "Analyze dependencies and launch chains", description: input, blockedBy: goBlockers, source, runner: runner("formula", "dependency-analysis", "read"), metadata: { formula: "stageChain", strict: mode === "todo-strict", complexity: runComplexity } }));
    for (const planId of planIds) {
      const p = run.tasks[planId];
      const itemGates = gateIdsByPlan.get(planId) ?? [planId];
      const chain = appendStageChain(run, p.metadata.todoTitle ?? p.title, p.description, source, [go.id, ...itemGates], p.id, { planTaskId: planId, priority: p.priority, strict: mode === "todo-strict", complexity: p.metadata.complexity });
      addEdge(run, planId, chain[0].id, "planned item executes after dependency analysis");
    }
    run.rootTaskIds.push(go.id);
    return run;
  }

  if (mode === "pdo" || mode === "fulcrum") {
    const complexity = analyzePlanningComplexity(input, mode);
    const plan = addTask(run, planTask(title, input, source, "B", { formula: "fulcrum", pressureTest: true, complexity }));
    const gateIds = appendPlanningGates(run, title, input, source, "B", [plan.id], complexity, options, { planTaskId: plan.id, formula: "fulcrum", pressureTest: true });
    const grill = addTask(run, makeTask({ kind: "GRILL", title: `Resolve open decisions: ${title}`, description: input, blockedBy: gateIds, source, runner: runner("manual_gate", "fulcrum-grill", "none"), metadata: { todoTitle: title, complexity, awaitingInput: { question: "Resolve each open plan decision one at a time before implementation.", recommended: "Accept the recommended plan decisions unless you disagree." } } }));
    appendStageChain(run, title, input, source, [grill.id], plan.id, { planTaskId: plan.id, grillTaskId: grill.id, complexity, complex: complexity.shouldDecompose || complexity.shouldConsultOracle });
    run.rootTaskIds.push(plan.id);
    return run;
  }

  if (mode === "ticketdo") {
    const complexity = analyzePlanningComplexity(input, mode);
    const ticket = addTask(run, makeTask({ kind: "DIRECT", title: `Resolve ticket: ${title}`, description: input, source, runner: runner("manual_gate", "ticket-resolution", "network"), metadata: { ticketKey: input.trim(), complexity, awaitingInput: { question: "Fetch or paste the ticket acceptance criteria, then continue through the pdo formula.", recommended: "Use ticket acceptance criteria as source of truth." } } }));
    const plan = addTask(run, planTask(title, input, source, "B", { ticketKey: input.trim(), complexity }));
    addEdge(run, ticket.id, plan.id, "ticket spec feeds plan");
    const gateIds = appendPlanningGates(run, title, input, source, "B", [plan.id], complexity, options, { planTaskId: plan.id, ticketKey: input.trim() });
    const grill = addTask(run, makeTask({ kind: "GRILL", title: `Ticket decision pressure: ${title}`, description: input, blockedBy: gateIds, source, runner: runner("manual_gate", "ticket-fulcrum-grill", "none"), metadata: { ticketKey: input.trim(), complexity, awaitingInput: { question: "Resolve implementation choices without violating acceptance criteria.", recommended: "Keep acceptance criteria unchanged." } } }));
    appendStageChain(run, title, input, source, [grill.id], plan.id, { planTaskId: plan.id, ticketKey: input.trim(), complexity, complex: complexity.shouldDecompose || complexity.shouldConsultOracle });
    run.rootTaskIds.push(ticket.id);
    return run;
  }

  if (mode === "follow-pipeline" || mode === "fixup-pipelines") {
    const discover = addTask(run, makeTask({ kind: mode === "follow-pipeline" ? "CI_FOLLOW" : "CI_FIXUP", title: `${mode}: ${title}`, description: input, source, runner: runner("subagent", mode === "follow-pipeline" ? "compile-verifier" : "code-review-enforcer", "network"), subagent: { type: mode === "follow-pipeline" ? "compile-verifier" : "code-review-enforcer", skills: ["build-test-procedures"] }, metadata: { readOnly: true, dryRun: options.dryRun !== false } }));
    run.rootTaskIds.push(discover.id);
    return run;
  }

  if (mode === "custom") {
    return run;
  }

  const complexity = analyzePlanningComplexity(input, mode);
  const plan = addTask(run, planTask(title, input, source, "B", { complexity }));
  const gateIds = appendPlanningGates(run, title, input, source, "B", [plan.id], complexity, options, { planTaskId: plan.id });
  appendStageChain(run, title, input, source, gateIds, plan.id, { planTaskId: plan.id, complexity, complex: complexity.shouldDecompose || complexity.shouldConsultOracle });
  run.rootTaskIds.push(plan.id);
  return run;
}

export function createAdHocTask(run: TaskGraphRun, title: string, description: string, blockedBy: string[] = [], kind: TaskKind = "DIRECT") {
  const task = addTask(run, makeTask({ kind, title, description, blockedBy, source: "task-graph", runner: runner("subagent", "implementer", "write", "workspace-write"), subagent: { type: "implementer", skills: ["implementer"] } }));
  if (!run.rootTaskIds.length) run.rootTaskIds.push(task.id);
  return task;
}
