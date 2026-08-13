import { sanitizeDescriptorStableKeyForDisplay } from "./descriptors";
import type { AutoImproveLoopMetadata, TaskGraphRun, TaskKind, TaskNode, TaskStatus } from "./schema";
import { readyTasks } from "./scheduler";
import { REDACTED_LINEAGE_RUN_ID, REDACTED_SECRETISH_EVIDENCE_PATH, isCompactSecretishKeyIdentifier, isSecretishLineageEvidenceText, sanitizeRootWorkLineageWarningForDisplay, sanitizeTaskGraphReportingIdForDisplay, type RootWorkLineageByActiveRunId } from "./root-work-lineage";
import { rootWorkDisplayModel, type RootWorkDisplayModel } from "./root-work-queue";

export type TaskViewMode = "work-list" | "outline";
export type TaskDisplayStatus = "current" | "ready" | "blocked" | "waiting" | "done" | "failed" | "cancelled";
export type TaskDisplaySection = "current" | "ready" | "blocked" | "done" | "failed";

export interface LineageDisplayWarning {
  readonly kind: string;
  readonly message: string;
  readonly actionable: boolean;
}

export interface TaskDisplayNode {
  readonly id: string;
  readonly displayId: string;
  readonly shortId: string;
  readonly numericId?: number;
  readonly kind: TaskKind;
  readonly title: string;
  readonly summary?: string;
  readonly stableKey?: string;
  readonly purpose?: string;
  readonly descriptorOrder?: number;
  readonly descriptorLabel?: string;
  readonly flowLabel?: string;
  readonly status: TaskDisplayStatus;
  readonly sourceStatus: TaskStatus;
  readonly priority: TaskNode["priority"];
  readonly depth: number;
  readonly parentId?: string;
  readonly blockedBy: readonly string[];
  readonly blocks: readonly string[];
  readonly children: readonly string[];
  readonly lineageWarnings: readonly LineageDisplayWarning[];
  readonly acceptanceCheckCount: number;
  readonly badges: readonly string[];
  readonly subagentType?: string;
  readonly runner: string;
  readonly disabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TaskDisplayRow {
  readonly rowKind: "task" | "section";
  readonly section?: TaskDisplaySection;
  readonly node?: TaskDisplayNode;
  readonly label: string;
  readonly depth: number;
  readonly selectable: boolean;
}

export interface TaskGraphViewModel {
  readonly graphId: string;
  readonly title: string;
  readonly summary?: string;
  readonly mode: TaskViewMode;
  readonly rows: readonly TaskDisplayRow[];
  readonly counts: {
    readonly current: number;
    readonly ready: number;
    readonly blocked: number;
    readonly done: number;
    readonly failed: number;
  };
  readonly selectedTaskId?: string;
  readonly actionableWarnings: readonly LineageDisplayWarning[];
  readonly currentNodes: readonly TaskDisplayNode[];
  readonly readyNodes: readonly TaskDisplayNode[];
  readonly blockedNodes: readonly TaskDisplayNode[];
  readonly doneNodes: readonly TaskDisplayNode[];
  readonly failedNodes: readonly TaskDisplayNode[];
  readonly rootWork: RootWorkDisplayModel;
}

export interface BuildTaskGraphViewModelOptions {
  readonly mode?: TaskViewMode;
  readonly selectedTaskId?: string;
  readonly fallbackSelectedIndex?: number;
  readonly expandedTaskIds?: ReadonlySet<string>;
  readonly expandAll?: boolean;
  readonly lineageByActiveRunId?: RootWorkLineageByActiveRunId;
}

const HIDDEN_TEXT_MARKER = /\b(?:promptInstructions|projectPromptInstructions|readyPrompt|workerPrompt|systemPrompt|hiddenPrompt)\b/i;
const VIEW_MODEL_SESSION_PATH = /\/(?:home|Users)\/[^\s)]+\/[^\s)]*sessions?[^\s)]*/gi;
const GENERATED_PREFIX = /^(Plan|Oracle consult|Decompose|Resolve open decisions|Sanity-check autoimprove contract|Improve goal output and skill|Test goal output|Evaluate iteration|Review deliverables|Implement|Compile|Unit test|Perf test|Review|Restart|API test|E2E test|UX review|Spec update|Lint|Commit|Push|Retry)\s*:\s*(.+)$/i;
const CURRENT_STATUSES: ReadonlySet<TaskStatus> = new Set(["running", "awaiting_input"]);
const DONE_STATUSES: ReadonlySet<TaskStatus> = new Set(["succeeded", "skipped"]);
const FAILED_STATUSES: ReadonlySet<TaskStatus> = new Set(["failed", "cancelled"]);

export function taskIdForDisplay(id: unknown, fallback = REDACTED_LINEAGE_RUN_ID) {
  const safe = sanitizeTaskGraphReportingIdForDisplay(id, "");
  return safe || fallback;
}

export function shortTaskId(id: string) {
  const safe = taskIdForDisplay(id, REDACTED_LINEAGE_RUN_ID);
  if (safe === REDACTED_LINEAGE_RUN_ID) return safe;
  return safe.replace(/^([a-z]+)-/, "$1:").slice(0, 18);
}

function cleanText(input: string | undefined, maxLength = 160) {
  if (!input) return undefined;
  const cleaned = input
    .split(/\r?\n/)
    .filter((line) => !HIDDEN_TEXT_MARKER.test(line))
    .join(" ")
    .replace(/^#+\s*/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(VIEW_MODEL_SESSION_PATH, "[redacted-session-path]")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || HIDDEN_TEXT_MARKER.test(cleaned)) return undefined;
  if (isSecretishLineageEvidenceText(cleaned)) return REDACTED_SECRETISH_EVIDENCE_PATH;
  return cleaned.length > maxLength ? `${cleaned.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…` : cleaned;
}

function firstSafeLine(input: string | undefined, options: { skipGeneric?: boolean } = {}) {
  if (!input) return undefined;
  for (const raw of input.split(/\r?\n/)) {
    const line = cleanText(raw);
    if (!line) continue;
    if (options.skipGeneric && isGenericContinuationTitle(line)) continue;
    return line;
  }
  return undefined;
}

function cleanIdentifierText(input: string | undefined, maxLength = 120) {
  const cleaned = cleanText(input, maxLength);
  if (!cleaned) return undefined;
  return isCompactSecretishKeyIdentifier(input) || isCompactSecretishKeyIdentifier(cleaned) ? REDACTED_SECRETISH_EVIDENCE_PATH : cleaned;
}

function descriptorDisplayLine(stableKey: string | undefined, purpose: string | undefined) {
  if (!stableKey && !purpose) return undefined;
  if (!stableKey) return purpose;
  return purpose ? `[${stableKey}] ${purpose}` : `[${stableKey}]`;
}

function descriptorFlowDisplayLine(stableKey: string | undefined, purpose: string | undefined, fallback: string) {
  if (stableKey && purpose) return `${stableKey} · ${purpose}`;
  return stableKey ?? purpose ?? fallback;
}

export function extractObjectiveLine(input: string | undefined) {
  if (!input) return undefined;
  const lines = input.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    if (HIDDEN_TEXT_MARKER.test(raw)) continue;
    const inline = /^\s*(?:#{1,6}\s*)?(?:[-*+]\s*)?Objective\s*:\s*(.+?)\s*$/.exec(raw);
    if (inline) return cleanText(inline[1], 140);
    if (/^\s*(?:#{1,6}\s*)?Objective\s*:?\s*$/i.test(raw)) {
      const next = firstSafeLine(lines.slice(i + 1).join("\n"), { skipGeneric: true });
      if (next) return cleanText(next, 140);
    }
  }
  return undefined;
}

export function isGenericContinuationTitle(title: string | undefined) {
  const value = cleanText(title, 220)?.toLowerCase() ?? "";
  if (!value) return true;
  const core = splitGeneratedTitle(value).core;
  return /^continue\b/.test(core)
    || /^continue autoimprove\b/.test(core)
    || /^autoimprove continuation\b/.test(core)
    || /^continue (?:the )?(?:legacy )?loop\b/.test(core);
}

function splitGeneratedTitle(title: string) {
  const match = GENERATED_PREFIX.exec(title.trim());
  if (!match) return { prefix: undefined as string | undefined, core: title.trim() };
  return { prefix: match[1], core: match[2].trim() };
}

function loopMetadata(run: TaskGraphRun | undefined, task?: TaskNode): AutoImproveLoopMetadata | undefined {
  return task?.metadata.autoimproveLoop ?? run?.metadata?.autoimproveLoop ?? run?.config.autoimproveLoop;
}

function stringMetadata(task: TaskNode, key: string) {
  const value = task.metadata[key];
  return typeof value === "string" ? value : undefined;
}

function metadataStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(cleanText(item, 160))) : [];
}

function acceptanceCheckCount(task: TaskNode) {
  return new Set([
    ...metadataStringArray((task.metadata as Record<string, unknown>).acceptanceCriteria),
    ...(task.metadata.autoimproveObjective?.checklist ?? []).filter((item) => Boolean(cleanText(item, 160))),
    ...(task.metadata.nodeDescriptor?.acceptanceChecks ?? []).filter((item) => Boolean(cleanText(item, 160))),
  ]).size;
}

function objectiveFor(task: TaskNode, run?: TaskGraphRun) {
  const loop = loopMetadata(run, task);
  const candidates = [
    stringMetadata(task, "displayTitle"),
    stringMetadata(task, "displaySummary"),
    stringMetadata(task, "objective"),
    loop?.objective,
    run?.metadata && typeof run.metadata.objective === "string" ? run.metadata.objective : undefined,
    extractObjectiveLine(task.description),
    extractObjectiveLine(stringMetadata(task, "todoTitle")),
  ];
  for (const candidate of candidates) {
    const cleaned = cleanText(candidate, 140);
    if (cleaned && !isGenericContinuationTitle(cleaned)) return cleaned;
  }
  return undefined;
}

export function safeTaskTitle(task: TaskNode, run?: TaskGraphRun) {
  const { prefix, core } = splitGeneratedTitle(task.title);
  const objective = objectiveFor(task, run);
  if (isGenericContinuationTitle(core) && objective) return prefix ? `${prefix}: ${objective}` : objective;
  const title = cleanText(task.title, 140);
  if (title && !HIDDEN_TEXT_MARKER.test(title)) return title;
  if (objective) return prefix ? `${prefix}: ${objective}` : objective;
  return `${task.kind} ${shortTaskId(task.id)}`;
}

export function safeTaskSummary(task: TaskNode, run?: TaskGraphRun) {
  const title = safeTaskTitle(task, run);
  const candidates = [
    stringMetadata(task, "displaySummary"),
    stringMetadata(task, "summary"),
    stringMetadata(task, "objective"),
    objectiveFor(task, run),
    extractObjectiveLine(task.description),
    firstSafeLine(task.description, { skipGeneric: true }),
  ];
  for (const candidate of candidates) {
    const cleaned = cleanText(candidate, 220);
    if (cleaned && cleaned !== title && !HIDDEN_TEXT_MARKER.test(cleaned)) return cleaned;
  }
  return undefined;
}

function priorityRank(task: Pick<TaskNode, "priority">) {
  return task.priority === "A" ? 0 : task.priority === "B" ? 1 : 2;
}

function taskOrder(a: TaskNode, b: TaskNode) {
  const orderA = a.metadata.nodeDescriptor?.order;
  const orderB = b.metadata.nodeDescriptor?.order;
  const descriptorOrder = (typeof orderA === "number" && typeof orderB === "number")
    ? orderA - orderB || (a.metadata.nodeDescriptor?.stableKey ?? "").localeCompare(b.metadata.nodeDescriptor?.stableKey ?? "")
    : 0;
  return priorityRank(a) - priorityRank(b) || descriptorOrder || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

function recentTaskOrder(a: TaskNode, b: TaskNode) {
  return (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt) || taskOrder(a, b);
}

function classifyLineageWarning(message: string) {
  if (/explicit lineage adoption was used|adopted expected predecessor|resolved adoption/i.test(message)) return "resolved-adoption";
  if (/missing predecessor|does not exist|no predecessor/i.test(message)) return "missing-predecessor";
  if (/oracle/i.test(message)) return "missing-oracle-consult";
  if (/objective.*mismatch|conflict/i.test(message)) return "objective-mismatch";
  if (/legacy-default|no lineageAdoption|defaulted|overrode existing|unsafe/i.test(message)) return "unsafe-default-continuation";
  return "lineage-warning";
}

export function isActionableLineageWarning(warning: string | LineageDisplayWarning) {
  const kind = typeof warning === "string" ? classifyLineageWarning(warning) : warning.kind;
  return kind !== "resolved-adoption" && kind !== "adopted-expected-predecessor";
}

export function lineageDisplayWarnings(loop: AutoImproveLoopMetadata | undefined, options: { actionableOnly?: boolean } = {}) {
  const warnings = (loop?.lineageWarnings ?? [])
    .map((rawMessage) => {
      const kind = classifyLineageWarning(rawMessage);
      const message = sanitizeRootWorkLineageWarningForDisplay(rawMessage);
      if (!message) return undefined;
      const display: LineageDisplayWarning = { kind, message, actionable: isActionableLineageWarning({ kind, message, actionable: true }) };
      return display;
    })
    .filter((warning): warning is LineageDisplayWarning => Boolean(warning));
  return options.actionableOnly ? warnings.filter((warning) => warning.actionable) : warnings;
}

function childrenByTrueStructure(run: TaskGraphRun) {
  const children = new Map<string, Set<string>>();
  const childIds = new Set<string>();
  const add = (parentId: string | undefined, childId: string | undefined) => {
    if (!parentId || !childId || parentId === childId || !run.tasks[parentId] || !run.tasks[childId]) return;
    if (!children.has(parentId)) children.set(parentId, new Set());
    children.get(parentId)!.add(childId);
    childIds.add(childId);
  };
  for (const task of Object.values(run.tasks)) add(task.parentId, task.id);
  for (const edge of run.edges) {
    if (edge.type === "decomposes_to") add(edge.from, edge.to);
  }
  return { children, childIds };
}

function statusFor(task: TaskNode, readyIds: ReadonlySet<string>): TaskDisplayStatus {
  if (task.status === "running") return "current";
  if (task.status === "awaiting_input") return "waiting";
  if (task.status === "succeeded" || task.status === "skipped" || task.status === "deleted") return "done";
  if (task.status === "failed") return "failed";
  if (task.status === "cancelled") return "cancelled";
  if (readyIds.has(task.id)) return "ready";
  return "blocked";
}

function displayNode(run: TaskGraphRun, task: TaskNode, depth: number, readyIds: ReadonlySet<string>, trueChildren: ReadonlyMap<string, ReadonlySet<string>>): TaskDisplayNode {
  const lineageWarnings = lineageDisplayWarnings(loopMetadata(run, task), { actionableOnly: true });
  const descriptor = task.metadata.nodeDescriptor;
  const descriptorStableKey = descriptor ? sanitizeDescriptorStableKeyForDisplay(descriptor.stableKey, "task", 120) : undefined;
  const descriptorPurpose = cleanText(descriptor?.purpose, 180);
  const descriptorStatusLine = descriptorDisplayLine(descriptorStableKey, descriptorPurpose);
  const descriptorFlowLabel = descriptor ? descriptorFlowDisplayLine(descriptorStableKey, descriptorPurpose, safeTaskTitle(task, run)) : cleanText(safeTaskTitle(task, run), 240);
  const checks = acceptanceCheckCount(task);
  const badges = [
    task.metadata.disabled === true ? "disabled" : undefined,
    descriptorStableKey ? `key:${descriptorStableKey}` : undefined,
    task.subagent?.type ? `@${task.subagent.type}` : undefined,
    task.blockedBy.length ? `deps:${task.blockedBy.map(shortTaskId).join(",")}` : undefined,
    checks ? `checks:${checks}` : undefined,
    lineageWarnings.length ? "⚠ lineage" : undefined,
  ].filter((badge): badge is string => Boolean(badge));
  return {
    id: task.id,
    displayId: taskIdForDisplay(task.id),
    shortId: shortTaskId(task.id),
    numericId: typeof task.metadata.numericId === "number" ? task.metadata.numericId : undefined,
    kind: task.kind,
    title: safeTaskTitle(task, run),
    summary: safeTaskSummary(task, run),
    stableKey: descriptorStableKey,
    purpose: descriptorPurpose,
    descriptorOrder: descriptor?.order,
    descriptorLabel: descriptorStatusLine,
    flowLabel: descriptorFlowLabel,
    status: statusFor(task, readyIds),
    sourceStatus: task.status,
    priority: task.priority,
    depth,
    parentId: task.parentId,
    blockedBy: [...task.blockedBy],
    blocks: [...task.blocks],
    children: [...(trueChildren.get(task.id) ?? [])].sort((a, b) => taskOrder(run.tasks[a], run.tasks[b])),
    lineageWarnings,
    acceptanceCheckCount: checks,
    badges,
    subagentType: task.subagent?.type,
    runner: `${task.runner.kind}:${task.runner.name}`,
    disabled: task.metadata.disabled === true,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

function taskRow(node: TaskDisplayNode): TaskDisplayRow {
  return { rowKind: "task", node, label: node.title, depth: node.depth, selectable: true };
}

function sectionRow(section: TaskDisplaySection, count: number): TaskDisplayRow {
  const label = `${section[0]!.toUpperCase()}${section.slice(1)} (${count})`;
  return { rowKind: "section", section, label, depth: 0, selectable: false };
}

function appendSection(rows: TaskDisplayRow[], section: TaskDisplaySection, nodes: readonly TaskDisplayNode[]) {
  if (!nodes.length) return;
  rows.push(sectionRow(section, nodes.length));
  rows.push(...nodes.map(taskRow));
}

function buildGroups(run: TaskGraphRun, trueChildren: ReadonlyMap<string, ReadonlySet<string>>) {
  const ready = readyTasks(run);
  const readyIds = new Set(ready.map((task) => task.id));
  const tasks = Object.values(run.tasks).filter((task) => task.status !== "deleted");
  const node = (task: TaskNode, depth = 0) => displayNode(run, task, depth, readyIds, trueChildren);
  const currentTasks = tasks.filter((task) => CURRENT_STATUSES.has(task.status)).sort(recentTaskOrder);
  const readyNodes = ready.map((item) => run.tasks[item.id]).filter((task): task is TaskNode => Boolean(task) && task.status !== "deleted").map((task) => node(task, 0));
  const currentIds = new Set(currentTasks.map((task) => task.id));
  const readySelectedIds = new Set(readyNodes.map((item) => item.id));
  const doneTasks = tasks.filter((task) => DONE_STATUSES.has(task.status)).sort(recentTaskOrder);
  const failedTasks = tasks.filter((task) => FAILED_STATUSES.has(task.status)).sort(recentTaskOrder);
  const doneIds = new Set(doneTasks.map((task) => task.id));
  const failedIds = new Set(failedTasks.map((task) => task.id));
  const blockedTasks = tasks
    .filter((task) => !currentIds.has(task.id) && !readySelectedIds.has(task.id) && !doneIds.has(task.id) && !failedIds.has(task.id))
    .sort(taskOrder);
  return {
    readyIds,
    currentNodes: currentTasks.map((task) => node(task, 0)),
    readyNodes,
    blockedNodes: blockedTasks.map((task) => node(task, 0)),
    doneNodes: doneTasks.map((task) => node(task, 0)),
    failedNodes: failedTasks.map((task) => node(task, 0)),
  };
}

export function buildWorkListRows(run: TaskGraphRun) {
  const { children } = childrenByTrueStructure(run);
  const groups = buildGroups(run, children);
  const rows: TaskDisplayRow[] = [];
  appendSection(rows, "current", groups.currentNodes);
  appendSection(rows, "ready", groups.readyNodes);
  appendSection(rows, "blocked", groups.blockedNodes);
  appendSection(rows, "done", groups.doneNodes);
  appendSection(rows, "failed", groups.failedNodes);
  return { rows, groups };
}

export function buildOutlineRows(run: TaskGraphRun, options: Pick<BuildTaskGraphViewModelOptions, "expandedTaskIds" | "expandAll"> = {}) {
  const { children, childIds } = childrenByTrueStructure(run);
  const readyIds = new Set(readyTasks(run).map((task) => task.id));
  const rows: TaskDisplayRow[] = [];
  const seen = new Set<string>();
  const rootsFromRun = run.rootTaskIds.filter((id) => run.tasks[id] && run.tasks[id].status !== "deleted" && !childIds.has(id));
  const rootSet = new Set([
    ...rootsFromRun,
    ...Object.values(run.tasks)
      .filter((task) => task.status !== "deleted" && !childIds.has(task.id))
      .sort(taskOrder)
      .map((task) => task.id),
  ]);
  const roots = [...rootSet].map((id) => run.tasks[id]).filter((task): task is TaskNode => Boolean(task)).sort(taskOrder);
  const visit = (task: TaskNode, depth: number) => {
    if (seen.has(task.id) || task.status === "deleted") return;
    seen.add(task.id);
    const node = displayNode(run, task, depth, readyIds, children);
    rows.push(taskRow(node));
    const childTasks = [...(children.get(task.id) ?? [])].map((id) => run.tasks[id]).filter((child): child is TaskNode => Boolean(child) && child.status !== "deleted").sort(taskOrder);
    const expanded = options.expandAll || options.expandedTaskIds?.has(task.id);
    if (expanded) for (const child of childTasks) visit(child, depth + 1);
  };
  for (const root of roots) visit(root, 0);
  return rows;
}

export function preserveSelection(previousSelectedTaskId: string | undefined, previousIndex: number | undefined, nextRows: readonly TaskDisplayRow[]) {
  if (previousSelectedTaskId) {
    const stillExists = nextRows.some((row) => row.selectable && row.node?.id === previousSelectedTaskId);
    if (stillExists) return previousSelectedTaskId;
  }
  const candidates = nextRows
    .map((row, index) => ({ row, index, distance: Math.abs(index - (previousIndex ?? 0)) }))
    .filter(({ row }) => row.selectable && Boolean(row.node))
    .sort((a, b) => a.distance - b.distance || a.index - b.index);
  return candidates[0]?.row.node?.id;
}

export function buildTaskGraphViewModel(run: TaskGraphRun, options: BuildTaskGraphViewModelOptions = {}): TaskGraphViewModel {
  const mode = options.mode ?? "work-list";
  const { children } = childrenByTrueStructure(run);
  const groups = buildGroups(run, children);
  const rows = mode === "outline" ? buildOutlineRows(run, options) : buildWorkListRows(run).rows;
  const selectedTaskId = preserveSelection(options.selectedTaskId, options.fallbackSelectedIndex, rows);
  const loop = loopMetadata(run);
  const displayRunId = sanitizeTaskGraphReportingIdForDisplay(run.runId, REDACTED_LINEAGE_RUN_ID) || REDACTED_LINEAGE_RUN_ID;
  return {
    graphId: displayRunId,
    title: `Task graph ${displayRunId}`,
    summary: run.config.customGraphName ? `graph ${run.config.customGraphName}${run.config.customGraphSource ? ` source ${run.config.customGraphSource}` : ""}` : undefined,
    mode,
    rows,
    counts: {
      current: groups.currentNodes.length,
      ready: groups.readyNodes.length,
      blocked: groups.blockedNodes.length,
      done: groups.doneNodes.length,
      failed: groups.failedNodes.length,
    },
    selectedTaskId,
    actionableWarnings: lineageDisplayWarnings(loop, { actionableOnly: true }),
    currentNodes: groups.currentNodes,
    readyNodes: groups.readyNodes,
    blockedNodes: groups.blockedNodes,
    doneNodes: groups.doneNodes,
    failedNodes: groups.failedNodes,
    rootWork: rootWorkDisplayModel(run.metadata?.rootWorkQueue, { lineageByActiveRunId: options.lineageByActiveRunId }),
  };
}
