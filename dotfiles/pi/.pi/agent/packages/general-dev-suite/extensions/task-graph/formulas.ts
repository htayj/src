import * as fs from "node:fs";
import * as path from "node:path";
import type { AutoImproveObjectiveMetadata, ComplexityMetadata, CustomGraphStageSettings, Edge, Priority, ProjectTaskGraphSettings, RunMode, RunnerKind, RunnerSpec, SideEffects, TaskGraphOptions, TaskGraphRun, TaskKind, TaskNode, TaskNodeDescriptorInput } from "./schema";
import { attachCompletedDescriptor, completeTaskDescriptor, descriptorInputFromStage, normalizeStableKey, stageKeyForKind, usedDescriptorStableKeys } from "./descriptors";
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

function route(kind: TaskKind, settings?: ProjectTaskGraphSettings) {
  const base = (() => {
    if (["COMPILE", "UNIT_TEST", "PERF_TEST", "CODE_REVIEW", "API_TEST", "E2E_TEST", "UX_REVIEW", "LINT", "GOAL_TEST", "EVALUATE"].includes(kind)) {
      return { onFailure: "route_to_implement" as const, maxCodeIterations: 3, maxEnvironmentalRetries: 2 };
    }
    if (kind === "PUSH") return { onFailure: "stop_push_failed" as const, maxCodeIterations: 1, maxEnvironmentalRetries: 0 };
    return { onFailure: "stop_for_user" as const, maxCodeIterations: 3, maxEnvironmentalRetries: 2 };
  })();
  return { ...base, ...(settings?.routing?.failureRoutes?.[kind] ?? {}) };
}

export function applyProjectSettingsToTask(task: TaskNode, settings?: ProjectTaskGraphSettings) {
  if (!settings) return task;
  task.metadata.route = route(task.kind, settings);
  const lockGroup = settings.routing?.lockConflictGroups?.[task.kind];
  if (lockGroup) task.runner.writePolicy.conflictGroup = lockGroup;
  if (settings.routing?.defaultSubagentContext && task.subagent) {
    task.subagent.context = task.subagent.context ?? settings.routing.defaultSubagentContext;
    task.subagent.contextReason = task.subagent.contextReason ?? "Project task graph settings defaultSubagentContext.";
  }
  return task;
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
  descriptor?: TaskNodeDescriptorInput;
}): TaskNode {
  const id = newId(input.kind.toLowerCase());
  const createdAt = now();
  const metadata = {
    source: input.source,
    priority: input.priority ?? "B",
    route: route(input.kind),
    ...(input.metadata ?? {}),
  };
  const task: TaskNode = {
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
    metadata,
    createdAt,
    updatedAt: createdAt,
  };
  task.metadata.nodeDescriptor = completeTaskDescriptor({
    taskTitle: task.title,
    fallbackStableKey: input.descriptor?.stableKey ?? `${input.source.replace(/-command$/, "")}.${stageKeyForKind(input.kind, input.title)}`,
    fallbackPurpose: input.descriptor?.purpose ?? task.description,
    descriptor: input.descriptor ?? (metadata.nodeDescriptor as TaskNode["metadata"]["nodeDescriptor"] | undefined),
    order: input.descriptor?.order ?? 1,
    task,
  });
  return task;
}

function addTask(run: TaskGraphRun, task: TaskNode) {
  applyProjectSettingsToTask(task, run.config.projectSettings);
  const descriptorOrder = task.metadata.nodeDescriptor?.order;
  attachCompletedDescriptor(task, Object.keys(run.tasks).length + 1, usedDescriptorStableKeys(Object.values(run.tasks)), { forceOrder: !(typeof descriptorOrder === "number" && descriptorOrder > 1) });
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

function isGenericContinuationSummary(line: string) {
  const value = line.trim().replace(/^#+\s*/, "");
  return /^continue\b/i.test(value) || /^autoimprove continuation\b/i.test(value);
}

function objectiveLine(input: string) {
  for (const line of input.split(/\r?\n/)) {
    const match = /^\s*(?:#{1,6}\s*)?Objective\s*:\s*(.+?)\s*$/.exec(line);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return undefined;
}

function summarize(input: string) {
  const first = input.trim().split(/\r?\n/).find(Boolean) ?? "Task";
  const firstClean = first.replace(/^#+\s*/, "").trim();
  const objective = objectiveLine(input);
  const summary = objective && isGenericContinuationSummary(firstClean) ? objective : firstClean;
  return summary.slice(0, 90);
}

export function analyzePlanningComplexity(input: string, mode: RunMode): ComplexityMetadata {
  const lines = input.split(/\r?\n/);
  const bulletCount = lines.filter((line) => /^\s*(?:[-*+]\s+|\d+[.)]\s+)/.test(line)).length;
  const acceptanceCount = lines.filter((line) => /\b(acceptance criteria|must|should|requirement|done when|verify|test|validation|criteria)\b/i.test(line)).length;
  const uncertaintyCount = lines.filter((line) => /\b(unclear|unknown|maybe|probably|design|architecture|refactor|migrate|replace|decompose|multiple|dependencies|plan|tradeoff|risky|complicated|complex)\b/i.test(line)).length;
  const lengthScore = input.length > 1200 ? 2 : input.length > 600 ? 1 : 0;
  const modeScore = mode === "pdo" || mode === "fulcrum" || mode === "ticketdo" || mode === "autoimprove" ? 2 : 0;
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

interface EnumeratedItem {
  id: string;
  title: string;
  description: string;
  priority: Priority;
}

function analyzeAutoImproveContract(input: string) {
  const hasObjectiveTest = /\b(objective test|acceptance criteria|success criteria|done when|pass(?:es|ing)?\b|fail(?:s|ing)?\b|verify|validate|test command|metric|score|benchmark|compare|expected output|golden|assert|check)\b/i.test(input) || /\b(npm|pnpm|yarn|bun|pytest|cargo|go test|make|just|guix|node|python|sbcl)\b[^\n]*(?:test|check|verify|bench|lint)/i.test(input);
  const hasGoalOutput = /\b(output|artifact|file|path|result|deliverable|report|image|dataset|model|workflow|skill)\b/i.test(input) || /(?:^|\s)[~./A-Za-z0-9_-]+\.(?:md|json|txt|png|jpg|jpeg|webp|csv|ts|tsx|js|py|lisp|org)\b/.test(input);
  const hasSkillTarget = /\b(skill|SKILL\.md|method|playbook|recipe|procedure|reusable)\b/i.test(input);
  const looksUnclear = /\b(don't know|do not know|not sure|unclear|unknown|figure out|come up with|somehow|maybe|no test|without a test|missing test|decide|discover|explore)\b/i.test(input);
  const gaps = [
    hasObjectiveTest ? undefined : "missing objective test or measurable pass/fail criteria",
    hasGoalOutput ? undefined : "missing expected goal output artifact/path",
    hasSkillTarget ? undefined : "missing reusable skill target",
    looksUnclear ? "goal or approach appears unclear" : undefined,
  ].filter((gap): gap is string => Boolean(gap));
  return { hasObjectiveTest, hasGoalOutput, hasSkillTarget, looksUnclear, gaps, needsOraclePlan: !hasObjectiveTest || looksUnclear };
}

function extractBulletsAfterHeadings(input: string, headingPattern: RegExp) {
  const lines = input.split(/\r?\n/);
  const bullets: string[] = [];
  let collecting = false;
  for (const line of lines) {
    if (headingPattern.test(line)) {
      collecting = true;
      continue;
    }
    if (!collecting) continue;
    if (/^\s*#{1,6}\s+/.test(line) || /^\s*[A-Z][A-Za-z /-]+:\s*$/.test(line)) {
      if (bullets.length) break;
      continue;
    }
    const bullet = /^\s*(?:[-*+]\s+|\d+[.)]\s+)(.+?)\s*$/.exec(line);
    if (bullet) bullets.push(bullet[1].trim());
    else if (bullets.length && line.trim() === "") break;
  }
  return bullets;
}

function uniqueStrings(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function analyzeAutoImproveObjective(input: string): AutoImproveObjectiveMetadata {
  const objectiveBullets = extractBulletsAfterHeadings(input, /\b(objective test\/artifacts|objective artifacts|success criteria|acceptance criteria|done when)\b/i);
  const checklist = objectiveBullets.length ? objectiveBullets : extractEnumeratedItems(input).map((item) => item.title);
  const validationHints = uniqueStrings([
    ...checklist.filter((item) => /\b(pass|validation|validate|test|verify|command|check|smoke|evidence|transcript|log)\b/i.test(item)),
    ...input.split(/\r?\n/).filter((line) => /\b(pass|validation|validate|test|verify|command|check|smoke)\b/i.test(line)).slice(0, 8).map((line) => line.replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)?/, "").trim()),
  ]);
  const expectedArtifactRoots = uniqueStrings([
    ...Array.from(input.matchAll(/(?:^|\s)([~./][A-Za-z0-9_./-]+)(?=\s|,|;|\)|$)/gm)).map((match) => match[1]),
    ...checklist.filter((item) => /\b(artifact|path|file|directory|folder|repo|transcript|log|README|skill|playbook|report)\b/i.test(item)),
  ]).slice(0, 20);
  return {
    checklist,
    validationHints,
    expectedArtifactRoots,
    requiresTmuxPuppetedPi: /\b(tmux|puppet(?:ed|ing)?|child pi|separate pi|another pi|external worker)\b/i.test(input),
    requiresTaskGraphDogfood: /\b(task[_ -]?graph|task graph|task_graph_create|task_graph_next|task_graph_update|dogfood)\b/i.test(input),
    requiresReusableSkill: /\b(skill|SKILL\.md|playbook|recipe|reusable)\b/i.test(input),
  };
}

function extractEnumeratedItems(input: string): EnumeratedItem[] {
  const lines = input.split(/\r?\n/);
  const items: EnumeratedItem[] = [];
  let firstItemLine = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const match = /^\s*(?:[-*+]\s+|\d+[.)]\s+)(.+?)\s*$/.exec(lines[i]);
    if (!match) continue;
    if (firstItemLine < 0) firstItemLine = i;
    const title = match[1].trim();
    if (!title) continue;
    items.push({ id: slugify(title, 32), title, description: title, priority: "B" });
  }
  if (items.length < 2) return [];
  const prefix = lines.slice(0, Math.max(0, firstItemLine)).join("\n");
  const prefixSaysTargets = /\b(for each|for all|each of|for (?:the )?following|on (?:the )?following|across (?:these|the)|these (?:items|things|files|packages|components|modules|skills|endpoints|routes|tests)|following (?:items|things|files|packages|components|modules|skills|endpoints|routes|tests))\b/i.test(prefix);
  const looksLikeTargetList = items.every((item) => item.title.length <= 140 && !/^(acceptance|criteria|must|should|verify|test|done when|requirement|requirements?)\b/i.test(item.title));
  return prefixSaysTargets || looksLikeTargetList ? items : [];
}

function appendExecutionChains(run: TaskGraphRun, title: string, description: string, source: string, blockedBy: string[], parentId: string | undefined, metadata: Record<string, unknown>, enumeratedItems: EnumeratedItem[]) {
  if (enumeratedItems.length < 2) {
    return appendStageChain(run, title, description, source, blockedBy, parentId, metadata);
  }
  const created: TaskNode[] = [];
  const baseTitle = title.replace(/[:\s]+$/, "");
  for (const item of enumeratedItems) {
    created.push(...appendStageChain(run, `${baseTitle}: ${item.title}`, `${description}\n\n## Enumerated subtask\nWork only on this listed item: ${item.title}`, source, blockedBy, parentId, {
      ...metadata,
      priority: item.priority,
      enumeratedParentTitle: title,
      enumeratedItemId: item.id,
      enumeratedItemTitle: item.title,
      enumeratedItemCount: enumeratedItems.length,
      complex: true,
    }));
  }
  return created;
}

function planTask(title: string, full: string, source: string, priority: Priority, metadata: Record<string, unknown> = {}) {
  const planFile = `.pi/dev-suite/task-graph/plans/${slugify(title)}.md`;
  const namespace = metadata.autoimprove === true || metadata.formula === "autoimprove" ? "autoimprove" : metadata.formula === "fulcrum" || metadata.pressureTest === true ? "pdo" : sourceNamespace(source);
  return makeTask({
    kind: "PLAN",
    title: `Plan: ${title}`,
    description: full,
    priority,
    source,
    runner: runner("chain", "general-dev-plan", "read"),
    subagent: { type: "planner", chain: "general-dev-plan", skills: ["build-test-procedures", "tdd"], context: "fresh", contextReason: "Planning receives explicit task/context artifacts; parent conversation history is not required." },
    descriptor: {
      stableKey: `${namespace}.plan`,
      purpose: `Create an implementation-ready plan for ${title}.`,
      inputs: ["Original user request", "Repository instructions and existing project structure"],
      outputs: ["Implementation plan with files, tests, validation, risks, and open decisions"],
      artifacts: [planFile],
      acceptanceChecks: ["Plan identifies scoped files and validation commands", "Plan names risks and open decisions without editing implementation files"],
      writeScope: [planFile],
      isolationBoundary: ["Read-only planning; do not edit product files", "Do not commit, push, or mutate TODO state"],
    },
    metadata: { todoTitle: title, planFile, readOnly: true, ...metadata },
  });
}

export function oracleConsultTask(title: string, full: string, source: string, priority: Priority, blockedBy: string[], metadata: Record<string, unknown> = {}) {
  const namespace = metadata.autoimprove === true || metadata.formula === "autoimprove" ? "autoimprove" : sourceNamespace(source);
  return makeTask({
    kind: "ORACLE_CONSULT",
    title: `Oracle consult: ${title}`,
    description: full,
    priority,
    blockedBy,
    source,
    runner: runner("manual_gate", "oracle-consult", "read"),
    descriptor: {
      stableKey: `${namespace}.oracle`,
      purpose: `Consult Oracle for bounded planning guidance on ${title}.`,
      inputs: ["Non-secret task context", "Current plan, risks, and validation questions"],
      outputs: ["Oracle recommendation summary", "Risks, decomposition advice, and validation strategy"],
      artifacts: ["oracle-consult.md or equivalent recommendation artifact"],
      acceptanceChecks: ["Oracle was consulted with non-secret context or unavailability was recorded", "Recommendation is summarized before downstream implementation"],
      writeScope: ["planning/recommendation artifacts only"],
      isolationBoundary: ["Do not send secrets, credentials, .env data, cookies, or hidden prompts", "Do not edit implementation files in this manual gate"],
    },
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
  const namespace = metadata.autoimprove === true || metadata.formula === "autoimprove" ? "autoimprove" : sourceNamespace(source);
  return makeTask({
    kind: "DECOMPOSE",
    title: `Decompose: ${title}`,
    description: full,
    priority,
    blockedBy,
    source,
    runner: runner("chain", "task-decomposer", "read"),
    subagent: { type: "planner", chain: "general-dev-plan", skills: ["build-test-procedures", "tdd"], context: "fresh", contextReason: "Decomposition receives explicit task/context artifacts; parent conversation history is not required." },
    descriptor: {
      stableKey: `${namespace}.decompose`,
      purpose: `Break ${title} into bounded implementation/check chains.`,
      inputs: ["Original user request", "Plan and complexity metadata"],
      outputs: ["decomposition.json with deterministic subtask descriptors and dependencies"],
      artifacts: ["decomposition.json"],
      acceptanceChecks: ["Subtasks are bounded and dependency-ready", "Dependencies remain expressed by decomposition subtask ids until expansion maps them to task ids"],
      writeScope: ["decomposition artifacts only"],
      isolationBoundary: ["Do not edit implementation files", "Do not create dynamic scheduler semantics"],
    },
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
  { kind: "IMPLEMENT", title: "Implement", runner: runner("subagent", "implementer", "write", "workspace-write"), subagent: { type: "implementer", skills: ["build-test-procedures", "tdd", "implementer"], context: "fresh", contextReason: "Implementation receives an explicit bounded task prompt and artifacts; parent conversation history should not be inherited." } },
  { kind: "COMPILE", title: "Compile", runner: runner("subagent", "compile-verifier", "read"), subagent: { type: "compile-verifier", skills: ["build-test-procedures", "compile-verifier"], context: "fresh", contextReason: "Verification should inspect repository state directly from a clean context." } },
  { kind: "UNIT_TEST", title: "Unit test", runner: runner("subagent", "unit-tester", "read"), subagent: { type: "unit-tester", skills: ["build-test-procedures", "unit-tester"], context: "fresh", contextReason: "Testing should inspect repository state directly from a clean context." } },
  { kind: "PERF_TEST", title: "Perf test", runner: runner("subagent", "perf-tester", "read"), subagent: { type: "perf-tester", skills: ["perf-tester", "build-test-procedures"], context: "fresh", contextReason: "Performance verification should use explicit task scope and repo state, not parent chat history." } },
  { kind: "CODE_REVIEW", title: "Review", runner: runner("subagent", "code-review-enforcer", "read"), subagent: { type: "code-review-enforcer", skills: ["code-review"], context: "fresh", contextReason: "Review should be adversarial and independent unless forked context is explicitly justified." } },
  { kind: "RESTART", title: "Restart", runner: runner("direct_safe", "dev-server-restart", "shell", "dev-server") },
  { kind: "API_TEST", title: "API test", runner: runner("subagent", "api-tester", "network"), subagent: { type: "api-tester", skills: ["api-testing", "api-tester"], context: "fresh", contextReason: "API testing should use explicit endpoints/context and live repo state." } },
  { kind: "E2E_TEST", title: "E2E test", runner: runner("subagent", "e2e-tester", "network"), subagent: { type: "e2e-tester", skills: ["e2e-test", "e2e-tester", "frontend-design"], context: "fresh", contextReason: "E2E testing should use explicit flow context and live repo state." } },
  { kind: "UX_REVIEW", title: "UX review", runner: runner("subagent", "ux-review-enforcer", "read"), subagent: { type: "ux-review-enforcer", skills: ["ux-review", "frontend-design"], context: "fresh", contextReason: "UX review should independently inspect current artifacts/state." } },
  { kind: "SPEC_UPDATE", title: "Spec update", runner: runner("direct_safe", "spec-update", "write", "workspace-write") },
  { kind: "LINT", title: "Lint", runner: runner("direct_safe", "lint", "shell", "lint") },
  { kind: "COMMIT", title: "Commit", runner: runner("direct_safe", "git-commit", "git", "git-index") },
  { kind: "PUSH", title: "Push", runner: runner("direct_safe", "git-push", "git", "git-remote") },
];

function sourceNamespace(source: string) {
  return normalizeStableKey(source.replace(/-command$/, "") || "task");
}

function metadataDescriptorInput(metadata: Record<string, unknown>, key: string): TaskNodeDescriptorInput | undefined {
  const value = metadata[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as TaskNodeDescriptorInput : undefined;
}

function stageChainNamespace(source: string, metadata: Record<string, unknown>) {
  const decompKey = typeof metadata.decompositionStableKey === "string" ? metadata.decompositionStableKey : undefined;
  if (decompKey) return normalizeStableKey(decompKey);
  const subtaskId = typeof metadata.decompositionSubtaskId === "string" ? metadata.decompositionSubtaskId : undefined;
  if (subtaskId) return normalizeStableKey(`decomposition.${subtaskId}`);
  const itemId = typeof metadata.enumeratedItemId === "string" ? metadata.enumeratedItemId : undefined;
  if (itemId) return normalizeStableKey(`item.${itemId}`);
  if (metadata.autoimprove === true || metadata.formula === "autoimprove") return "autoimprove";
  if (metadata.formula === "fulcrum" || metadata.pressureTest === true) return "pdo";
  return sourceNamespace(source);
}

function stageDescriptorInput(def: { kind: TaskKind; title: string }, index: number, title: string, source: string, metadata: Record<string, unknown>, enabled: boolean): TaskNodeDescriptorInput {
  const namespace = stageChainNamespace(source, metadata);
  const stageKey = stageKeyForKind(def.kind, def.title);
  const subtaskDescriptor = metadataDescriptorInput(metadata, "decompositionDescriptor");
  const base: TaskNodeDescriptorInput = {
    stableKey: `${namespace}.${stageKey}`,
    purpose: `${def.title} for ${title}.`,
    inputs: ["Original task request", "Prior completed task graph stages and artifacts"],
    outputs: [`${def.title} result and concise PASS/FAIL report`],
    artifacts: ["Changed files, validation logs, or review notes when produced"],
    acceptanceChecks: ["Task scope is satisfied or a clear blocker is reported", "Relevant validation evidence is recorded"],
    writeScope: def.kind === "IMPLEMENT" || def.kind === "SPEC_UPDATE" ? (metadata.expectedWritePaths as string[] | undefined) ?? ["bounded implementation files for this task"] : ["read-only or report-only stage output"],
    isolationBoundary: ["Stay within this stage and its declared write scope", enabled ? "Do not commit or push unless this node is an approved commit/push stage" : "This gated stage is skipped until explicitly approved"],
  };
  if (subtaskDescriptor) {
    const subtaskKey = normalizeStableKey(subtaskDescriptor.stableKey ?? `${namespace}.${stageKey}`);
    return index === 0
      ? { ...base, ...subtaskDescriptor, stableKey: subtaskKey, acceptanceChecks: subtaskDescriptor.acceptanceChecks ?? base.acceptanceChecks, writeScope: subtaskDescriptor.writeScope ?? base.writeScope }
      : { ...base, stableKey: `${subtaskKey}.${stageKey}` };
  }
  return base;
}

function instantiateStageChain(run: TaskGraphRun, title: string, description: string, source: string, blockedBy: string[], parentId: string | undefined, metadata: Record<string, unknown>, stageDefs: typeof STAGE_DEFS) {
  let prev = [...blockedBy];
  const created: TaskNode[] = [];
  for (let i = 0; i < stageDefs.length; i += 1) {
    const def = stageDefs[i];
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
      descriptor: stageDescriptorInput(def, i, title, source, metadata, enabled),
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

export function appendStageChain(run: TaskGraphRun, title: string, description: string, source: string, blockedBy: string[], parentId?: string, metadata: Record<string, unknown> = {}) {
  return instantiateStageChain(run, title, description, source, blockedBy, parentId, metadata, STAGE_DEFS);
}

export const AUTOIMPROVE_STAGE_DEFS: Array<{ kind: TaskKind; title: string; runner: RunnerSpec; subagent?: TaskNode["subagent"] }> = [
  { kind: "IMPLEMENT", title: "Improve goal output and skill", runner: runner("subagent", "implementer", "write", "workspace-write"), subagent: { type: "implementer", skills: ["build-test-procedures", "tdd", "implementer", "pi-skill-authoring"], context: "fresh", contextReason: "Autoimprove implementation receives explicit goal/test/skill scope and should not rely on parent chat history." } },
  { kind: "GOAL_TEST", title: "Test goal output", runner: runner("subagent", "unit-tester", "shell"), subagent: { type: "unit-tester", skills: ["build-test-procedures", "unit-tester"], context: "fresh", contextReason: "Goal testing should independently run the declared objective test against current artifacts." } },
  { kind: "EVALUATE", title: "Evaluate iteration", runner: runner("subagent", "code-review-enforcer", "read"), subagent: { type: "code-review-enforcer", skills: ["code-review", "pi-skill-authoring"], context: "fresh", contextReason: "Autoimprove evaluation should independently judge the result, test evidence, and skill quality." } },
  { kind: "CODE_REVIEW", title: "Review deliverables", runner: runner("subagent", "code-review-enforcer", "read"), subagent: { type: "code-review-enforcer", skills: ["code-review", "pi-skill-authoring"], context: "fresh", contextReason: "Final deliverable review should be independent." } },
  { kind: "LINT", title: "Lint", runner: runner("direct_safe", "lint", "shell", "lint") },
  { kind: "COMMIT", title: "Commit", runner: runner("direct_safe", "git-commit", "git", "git-index") },
  { kind: "PUSH", title: "Push", runner: runner("direct_safe", "git-push", "git", "git-remote") },
];

export function appendAutoImproveChain(run: TaskGraphRun, title: string, description: string, source: string, blockedBy: string[], parentId?: string, metadata: Record<string, unknown> = {}) {
  return instantiateStageChain(run, title, description, source, blockedBy, parentId, { autoimprove: true, deliverables: ["goal_result", "skill"], ...metadata }, AUTOIMPROVE_STAGE_DEFS);
}

function customGraphRunner(stage: CustomGraphStageSettings): RunnerSpec {
  const kind = stage.runnerKind ?? defaultRunnerKind(stage.kind);
  const sideEffects = stage.sideEffects ?? defaultSideEffects(stage.kind);
  return {
    kind,
    name: stage.runnerName ?? stage.subagentType ?? stage.kind.toLowerCase(),
    sideEffects,
    writePolicy: {
      declaredPaths: stage.expectedWritePaths ?? [],
      allowOutsideDeclaredPaths: kind === "subagent" || sideEffects === "write" || stage.kind === "IMPLEMENT",
      conflictGroup: stage.conflictGroup,
    },
  };
}

function defaultRunnerKind(kind: TaskKind): RunnerKind {
  if (["GRILL", "ORACLE_CONSULT"].includes(kind)) return "manual_gate";
  if (["PLAN", "DECOMPOSE"].includes(kind)) return "chain";
  if (["RESTART", "LINT", "COMMIT", "PUSH", "SPEC_UPDATE"].includes(kind)) return "direct_safe";
  return "subagent";
}

function defaultSideEffects(kind: TaskKind): SideEffects {
  if (["IMPLEMENT", "SPEC_UPDATE"].includes(kind)) return "write";
  if (["RESTART", "LINT"].includes(kind)) return "shell";
  if (["COMMIT", "PUSH"].includes(kind)) return "git";
  if (["API_TEST", "E2E_TEST", "CI_FOLLOW", "CI_FIXUP"].includes(kind)) return "network";
  if (["GRILL"].includes(kind)) return "none";
  return "read";
}

function defaultSubagentType(kind: TaskKind) {
  if (kind === "IMPLEMENT") return "implementer";
  if (kind === "COMPILE") return "compile-verifier";
  if (kind === "UNIT_TEST" || kind === "GOAL_TEST") return "unit-tester";
  if (kind === "PERF_TEST") return "perf-tester";
  if (kind === "CODE_REVIEW" || kind === "EVALUATE") return "code-review-enforcer";
  if (kind === "API_TEST") return "api-tester";
  if (kind === "E2E_TEST") return "e2e-tester";
  if (kind === "UX_REVIEW") return "ux-review-enforcer";
  return undefined;
}

function customStageDescription(graphName: string, graphDescription: string | undefined, stage: CustomGraphStageSettings, input: string) {
  const currentStage = `${stage.title ?? stage.id} (${stage.kind})`;
  return [
    `Original user request:\n${input}`,
    `Custom graph:\n${graphName}${graphDescription?.trim() ? ` — ${graphDescription.trim()}` : ""}`,
    `Current stage:\n${currentStage}`,
    stage.description?.trim() ? `Custom graph stage guidance:\n${stage.description.trim()}` : undefined,
  ].filter((part): part is string => Boolean(part)).join("\n\n");
}

function instantiateCustomGraph(run: TaskGraphRun, graphName: string, title: string, input: string, source: string) {
  const graph = run.config.projectSettings?.graphs?.[graphName];
  if (!graph) throw new Error(`Task graph settings do not define custom graph: ${graphName}`);
  const byStageId = new Map<string, TaskNode>();
  const created: TaskNode[] = [];
  const pending = [...graph.stages];
  while (pending.length) {
    const index = pending.findIndex((stage) => (stage.dependsOn ?? []).every((dep) => byStageId.has(dep)));
    if (index < 0) throw new Error(`Custom graph ${graphName} has unresolved dependency order; validate settings for cycles or missing dependencies`);
    const [stage] = pending.splice(index, 1);
    const deps = (stage.dependsOn ?? []).map((dep) => byStageId.get(dep)!.id);
    const kind = stage.kind;
    const subagentType = stage.subagentType ?? defaultSubagentType(kind);
    const stageDescriptor = descriptorInputFromStage(stage);
    const task = makeTask({
      kind,
      title: `${stage.title ?? kind.replace(/_/g, " ").toLowerCase()}: ${title}`,
      description: customStageDescription(graphName, graph.description, stage, input),
      priority: stage.priority ?? "B",
      blockedBy: deps,
      source,
      runner: customGraphRunner(stage),
      subagent: subagentType ? { type: subagentType, skills: stage.skills, context: stage.context, contextReason: "Custom task graph stage." } : undefined,
      descriptor: {
        stableKey: `custom.${graphName}.${stage.id}`,
        purpose: stage.description ?? stage.title ?? `${kind} stage for custom graph ${graphName}`,
        inputs: ["Original user request", `Custom graph ${graphName}`],
        outputs: [`${stage.title ?? stage.id} stage result`],
        artifacts: ["Stage report and evidence when produced"],
        acceptanceChecks: ["Stage-specific guidance is satisfied", "Prompt instruction fields are not exposed outside worker prompts"],
        writeScope: stage.expectedWritePaths?.length ? stage.expectedWritePaths : [kind === "IMPLEMENT" ? "bounded implementation files for this custom stage" : "read-only or report-only custom stage"],
        isolationBoundary: ["Follow only this custom stage contract", "Do not alter dependency IDs or custom graph topology"],
        ...(stageDescriptor ?? {}),
      },
      metadata: {
        todoTitle: title,
        customGraph: graphName,
        customStageId: stage.id,
        expectedWritePaths: stage.expectedWritePaths,
        projectPromptInstructions: stage.promptInstructions,
      },
    });
    const enabled = kind === "COMMIT" ? run.config.commitEnabled : kind === "PUSH" ? run.config.pushEnabled : true;
    if (!enabled) {
      task.status = "skipped";
      task.metadata.disabled = true;
      task.metadata.skip = { skipped: true, gate: "approval_required", reason: `${kind.toLowerCase()} requires explicit approval` };
    }
    addTask(run, task);
    byStageId.set(stage.id, task);
    created.push(task);
  }
  run.rootTaskIds.push(...created.filter((task) => task.blockedBy.length === 0).map((task) => task.id));
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

export function createRun(cwd: string, mode: RunMode, input: string, options: TaskGraphOptions = {}, gitBaseline = { dirtyAtStart: [] as string[] }, projectSettings?: ProjectTaskGraphSettings, projectSettingsInfo?: TaskGraphRun["config"]["projectSettingsInfo"]): TaskGraphRun {
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
      maxParallel: Math.max(1, Math.min(8, options.maxParallel ?? projectSettings?.routing?.maxParallel ?? 3)),
      commitEnabled: options.commit === true,
      pushEnabled: options.push === true,
      strict: options.strict === true || mode === "todo-strict",
      continuous: options.continuous === true,
      mutateOrg: options.mutateOrg === true,
      projectSettings,
      projectSettingsInfo,
      customGraphName: options.customGraph,
      customGraphSource: options.customGraph ? projectSettingsInfo?.graphSourceMap?.[options.customGraph] : undefined,
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
      const enumeratedItems = extractEnumeratedItems(p.description);
      const chain = appendExecutionChains(run, p.metadata.todoTitle ?? p.title, p.description, source, [go.id, ...itemGates], p.id, { planTaskId: planId, priority: p.priority, strict: mode === "todo-strict", complexity: p.metadata.complexity }, enumeratedItems);
      if (chain[0]) addEdge(run, planId, chain[0].id, "planned item executes after dependency analysis");
    }
    run.rootTaskIds.push(go.id);
    return run;
  }

  if (mode === "pdo" || mode === "fulcrum") {
    const complexity = analyzePlanningComplexity(input, mode);
    const enumeratedItems = extractEnumeratedItems(input);
    const plan = addTask(run, planTask(title, input, source, "B", { formula: "fulcrum", pressureTest: true, complexity, enumeratedItemCount: enumeratedItems.length || undefined }));
    const gateIds = appendPlanningGates(run, title, input, source, "B", [plan.id], complexity, enumeratedItems.length >= 2 ? { ...options, decompose: options.decompose ?? false } : options, { planTaskId: plan.id, formula: "fulcrum", pressureTest: true });
    const grill = addTask(run, makeTask({ kind: "GRILL", title: `Resolve open decisions: ${title}`, description: input, blockedBy: gateIds, source, runner: runner("manual_gate", "fulcrum-grill", "none"), metadata: { todoTitle: title, complexity, awaitingInput: { question: "Resolve each open plan decision one at a time before implementation.", recommended: "Accept the recommended plan decisions unless you disagree." } } }));
    appendExecutionChains(run, title, input, source, [grill.id], plan.id, { planTaskId: plan.id, grillTaskId: grill.id, complexity, complex: complexity.shouldDecompose || complexity.shouldConsultOracle || enumeratedItems.length >= 2 }, enumeratedItems);
    run.rootTaskIds.push(plan.id);
    return run;
  }

  if (mode === "autoimprove") {
    const complexity = analyzePlanningComplexity(input, mode);
    const autoContract = analyzeAutoImproveContract(input);
    const autoimproveObjective = analyzeAutoImproveObjective(input);
    const autoimproveMetadata = {
      formula: "autoimprove",
      complexity,
      autoimproveContract: autoContract,
      autoimproveObjective,
      deliverables: ["goal_result", "skill"],
    };
    const plan = addTask(run, planTask(title, input, source, "B", { ...autoimproveMetadata, readOnly: true }));
    const gateOptions = autoContract.needsOraclePlan ? { ...options, oracleConsult: true } : options;
    const gateIds = appendPlanningGates(run, title, input, source, "B", [plan.id], complexity, gateOptions, {
      ...autoimproveMetadata,
      planTaskId: plan.id,
      autoimprove: true,
      oracleReason: autoContract.needsOraclePlan ? `Autoimprove needs an Oracle-derived plan because: ${autoContract.gaps.join("; ")}` : undefined,
    });
    const grill = addTask(run, makeTask({ kind: "GRILL", title: `Sanity-check autoimprove contract: ${title}`, description: input, blockedBy: gateIds, source, runner: runner("manual_gate", "autoimprove-contract", "none"), metadata: { todoTitle: title, ...autoimproveMetadata, autoimprove: true, awaitingInput: { question: "Briefly sanity-check the proposed autoimprove contract before iterating: objective goal test, expected goal output artifact/path, and reusable skill name/path.", recommended: autoContract.needsOraclePlan ? "Use the Oracle plan's proposed objective test/skill target unless it is unsafe, too broad, or not what the user intended; ask only the smallest clarifying question needed." : "Use the plan's proposed test and skill target if they are concrete and safe; otherwise ask the user for the missing contract." } } }));
    appendAutoImproveChain(run, title, input, source, [grill.id], plan.id, { ...autoimproveMetadata, planTaskId: plan.id, grillTaskId: grill.id, autoimprove: true, complex: true });
    run.rootTaskIds.push(plan.id);
    return run;
  }

  if (mode === "ticketdo") {
    const complexity = analyzePlanningComplexity(input, mode);
    const enumeratedItems = extractEnumeratedItems(input);
    const ticket = addTask(run, makeTask({ kind: "DIRECT", title: `Resolve ticket: ${title}`, description: input, source, runner: runner("manual_gate", "ticket-resolution", "network"), metadata: { ticketKey: input.trim(), complexity, awaitingInput: { question: "Fetch or paste the ticket acceptance criteria, then continue through the pdo formula.", recommended: "Use ticket acceptance criteria as source of truth." } } }));
    const plan = addTask(run, planTask(title, input, source, "B", { ticketKey: input.trim(), complexity, enumeratedItemCount: enumeratedItems.length || undefined }));
    addEdge(run, ticket.id, plan.id, "ticket spec feeds plan");
    const gateIds = appendPlanningGates(run, title, input, source, "B", [plan.id], complexity, enumeratedItems.length >= 2 ? { ...options, decompose: options.decompose ?? false } : options, { planTaskId: plan.id, ticketKey: input.trim() });
    const grill = addTask(run, makeTask({ kind: "GRILL", title: `Ticket decision pressure: ${title}`, description: input, blockedBy: gateIds, source, runner: runner("manual_gate", "ticket-fulcrum-grill", "none"), metadata: { ticketKey: input.trim(), complexity, awaitingInput: { question: "Resolve implementation choices without violating acceptance criteria.", recommended: "Keep acceptance criteria unchanged." } } }));
    appendExecutionChains(run, title, input, source, [grill.id], plan.id, { planTaskId: plan.id, ticketKey: input.trim(), complexity, complex: complexity.shouldDecompose || complexity.shouldConsultOracle || enumeratedItems.length >= 2 }, enumeratedItems);
    run.rootTaskIds.push(ticket.id);
    return run;
  }

  if (mode === "follow-pipeline" || mode === "fixup-pipelines") {
    const discover = addTask(run, makeTask({ kind: mode === "follow-pipeline" ? "CI_FOLLOW" : "CI_FIXUP", title: `${mode}: ${title}`, description: input, source, runner: runner("subagent", mode === "follow-pipeline" ? "compile-verifier" : "code-review-enforcer", "network"), subagent: { type: mode === "follow-pipeline" ? "compile-verifier" : "code-review-enforcer", skills: ["build-test-procedures"], context: "fresh", contextReason: "CI analysis should use explicit pipeline/repo context, not parent chat history." }, metadata: { readOnly: true, dryRun: options.dryRun !== false } }));
    run.rootTaskIds.push(discover.id);
    return run;
  }

  if (mode === "custom") {
    if (options.customGraph) instantiateCustomGraph(run, options.customGraph, title, input, source);
    return run;
  }

  const complexity = analyzePlanningComplexity(input, mode);
  const enumeratedItems = extractEnumeratedItems(input);
  const plan = addTask(run, planTask(title, input, source, "B", { complexity, enumeratedItemCount: enumeratedItems.length || undefined }));
  const gateIds = appendPlanningGates(run, title, input, source, "B", [plan.id], complexity, enumeratedItems.length >= 2 ? { ...options, decompose: options.decompose ?? false } : options, { planTaskId: plan.id });
  appendExecutionChains(run, title, input, source, gateIds, plan.id, { planTaskId: plan.id, complexity, complex: complexity.shouldDecompose || complexity.shouldConsultOracle || enumeratedItems.length >= 2 }, enumeratedItems);
  run.rootTaskIds.push(plan.id);
  return run;
}

export function createAdHocTask(run: TaskGraphRun, title: string, description: string, blockedBy: string[] = [], kind: TaskKind = "DIRECT") {
  const task = addTask(run, makeTask({ kind, title, description, blockedBy, source: "task-graph", runner: runner("subagent", "implementer", "write", "workspace-write"), subagent: { type: "implementer", skills: ["implementer"], context: "fresh", contextReason: "Ad-hoc tasks must provide explicit context rather than inheriting parent conversation history." } }));
  if (!run.rootTaskIds.length) run.rootTaskIds.push(task.id);
  return task;
}
