import type { TaskGraphRun } from "./schema";
import { buildTaskGraphViewModel, taskIdForDisplay, type TaskDisplayNode, type TaskGraphViewModel } from "./view-model";
import { deriveRootWorkLineageByActiveRunId, REDACTED_LINEAGE_RUN_ID, sanitizeTaskGraphReportingIdForDisplay } from "./root-work-lineage";
import { rootWorkDisplayModel, safeRootWorkLabel, type RootWorkDisplayItem, type RootWorkDisplayModel } from "./root-work-queue";

export type TaskGraphFlowchartFormat = "ascii" | "mermaid";

export interface TaskGraphFlowchartOptions {
  readonly format?: TaskGraphFlowchartFormat;
  readonly includeDone?: boolean;
  readonly maxLabelLength?: number;
}

export type TaskGraphFlowchartInput = TaskGraphRun | TaskGraphViewModel;

type FlowchartInput = TaskGraphFlowchartInput;

interface FlowNode {
  readonly id: string;
  readonly renderId: string;
  readonly mermaidId: string;
  readonly shortId: string;
  readonly stableKey?: string;
  readonly purpose?: string;
  readonly descriptorOrder?: number;
  readonly kind: string;
  readonly status: TaskDisplayNode["status"];
  readonly title: string;
  readonly flowLabel: string;
  readonly acceptanceCheckCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface FlowEdge {
  readonly from: string;
  readonly to: string;
  readonly type: "depends_on";
}

const HIDDEN_TEXT_MARKER = /\b(?:promptInstructions|projectPromptInstructions|readyPrompt|workerPrompt|systemPrompt|hiddenPrompt)\b/i;
const DEFAULT_MAX_LABEL_LENGTH = 72;

function isRun(input: FlowchartInput): input is TaskGraphRun {
  return "tasks" in input && "edges" in input;
}

function clampMaxLabelLength(maxLabelLength: number | undefined) {
  if (!Number.isFinite(maxLabelLength)) return DEFAULT_MAX_LABEL_LENGTH;
  return Math.max(12, Math.min(200, Math.floor(maxLabelLength!)));
}

function truncateLabel(input: string, maxLength: number) {
  if (input.length <= maxLength) return input;
  return `${input.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function baseSafeLabel(input: string | undefined, maxLength: number) {
  const text = (input ?? "")
    .split(/\r?\n/)
    .filter((line) => !HIDDEN_TEXT_MARKER.test(line))
    .join(" ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return truncateLabel(text || "untitled", maxLength);
}

function asciiLabel(input: string | undefined, maxLength: number) {
  const sanitized = baseSafeLabel(input, 1000)
    .replace(/[<>[\]{}"'`|\\]/g, " ")
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();
  return truncateLabel(sanitized, maxLength);
}

function mermaidLabel(input: string | undefined, maxLength: number) {
  return baseSafeLabel(input, maxLength)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/`/g, "&#96;")
    .replace(/\[/g, "&#91;")
    .replace(/\]/g, "&#93;")
    .replace(/\{/g, "&#123;")
    .replace(/\}/g, "&#125;")
    .replace(/\|/g, "&#124;");
}

function stableHash(input: string) {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}

function taskAlias(index: number) {
  return `T${index + 1}`;
}

function makeRenderIds(nodes: readonly TaskDisplayNode[]) {
  const ids = new Map<string, string>();
  const bases = new Map<string, number>();
  for (const [index, node] of [...nodes].sort(displayNodeOrder).entries()) {
    const displayId = node.stableKey ?? taskIdForDisplay(node.id);
    const base = displayId === REDACTED_LINEAGE_RUN_ID ? taskAlias(index) : displayId;
    const seen = bases.get(base) ?? 0;
    bases.set(base, seen + 1);
    ids.set(node.id, seen === 0 ? base : `${base}#${seen + 1}`);
  }
  return ids;
}

function makeMermaidIds(nodes: readonly TaskDisplayNode[], renderIds: ReadonlyMap<string, string>) {
  const ids = new Map<string, string>();
  const hasDescriptors = nodes.some((node) => node.stableKey);
  if (hasDescriptors) {
    [...nodes].sort(displayNodeOrder).forEach((node, index) => ids.set(node.id, `n${String(index + 1).padStart(3, "0")}`));
    return ids;
  }
  const bases = new Map<string, number>();
  for (const node of [...nodes].sort(displayNodeOrder)) {
    const displayId = renderIds.get(node.id) ?? taskIdForDisplay(node.id);
    const rawBase = displayId.replace(/[^A-Za-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
    const base = /^[A-Za-z_]/.test(rawBase) ? rawBase : `t_${rawBase || stableHash(displayId)}`;
    const seen = bases.get(base) ?? 0;
    bases.set(base, seen + 1);
    ids.set(node.id, seen === 0 ? base : `${base}_${stableHash(displayId).slice(0, 6)}`);
  }
  return ids;
}

function displayNodeOrder(a: TaskDisplayNode, b: TaskDisplayNode) {
  const descriptorOrder = (a.descriptorOrder ?? Number.POSITIVE_INFINITY) - (b.descriptorOrder ?? Number.POSITIVE_INFINITY);
  return descriptorOrder
    || (a.stableKey ?? "").localeCompare(b.stableKey ?? "")
    || a.createdAt.localeCompare(b.createdAt)
    || a.id.localeCompare(b.id);
}

function flowNodeOrder(a: FlowNode, b: FlowNode) {
  const descriptorOrder = (a.descriptorOrder ?? Number.POSITIVE_INFINITY) - (b.descriptorOrder ?? Number.POSITIVE_INFINITY);
  return descriptorOrder
    || (a.stableKey ?? "").localeCompare(b.stableKey ?? "")
    || a.createdAt.localeCompare(b.createdAt)
    || a.id.localeCompare(b.id);
}

function nodeAcceptanceCheckCount(node: TaskDisplayNode) {
  return typeof node.acceptanceCheckCount === "number" ? node.acceptanceCheckCount : 0;
}

function allViewNodes(viewModel: TaskGraphViewModel) {
  const seen = new Set<string>();
  const nodes: TaskDisplayNode[] = [];
  for (const node of [
    ...viewModel.currentNodes,
    ...viewModel.readyNodes,
    ...viewModel.blockedNodes,
    ...viewModel.doneNodes,
    ...viewModel.failedNodes,
    ...viewModel.rows.map((row) => row.node).filter((node): node is TaskDisplayNode => Boolean(node)),
  ]) {
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    nodes.push(node);
  }
  return nodes.sort(displayNodeOrder);
}

function visibleDisplayNodes(input: FlowchartInput, includeDone: boolean) {
  const viewModel = isRun(input) ? buildTaskGraphViewModel(input, { mode: "work-list" }) : input;
  return allViewNodes(viewModel).filter((node) => includeDone || node.status !== "done");
}

function visibleNodes(input: FlowchartInput, options: Required<Pick<TaskGraphFlowchartOptions, "includeDone" | "maxLabelLength">>) {
  const displayNodes = visibleDisplayNodes(input, options.includeDone);
  const renderIds = makeRenderIds(displayNodes);
  const mermaidIds = makeMermaidIds(displayNodes, renderIds);
  return displayNodes.map((node) => ({
    id: node.id,
    renderId: renderIds.get(node.id) ?? taskIdForDisplay(node.id),
    mermaidId: mermaidIds.get(node.id) ?? `T${stableHash(node.id)}`,
    shortId: node.shortId,
    stableKey: node.stableKey,
    purpose: node.purpose,
    descriptorOrder: node.descriptorOrder,
    kind: node.kind,
    status: node.status,
    title: node.title,
    flowLabel: node.flowLabel ?? node.title,
    acceptanceCheckCount: nodeAcceptanceCheckCount(node),
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  })).sort(flowNodeOrder);
}

function addEdge(edges: Map<string, FlowEdge>, from: string | undefined, to: string | undefined, visibleIds: ReadonlySet<string>) {
  if (!from || !to || from === to || !visibleIds.has(from) || !visibleIds.has(to)) return;
  edges.set(`${from}\u0000${to}`, { from, to, type: "depends_on" });
}

function dependencyEdgesFromRun(run: TaskGraphRun, visibleIds: ReadonlySet<string>) {
  const edges = new Map<string, FlowEdge>();
  for (const edge of run.edges) {
    if (edge.type === "depends_on") addEdge(edges, edge.from, edge.to, visibleIds);
  }
  for (const task of Object.values(run.tasks)) {
    if (!visibleIds.has(task.id)) continue;
    for (const dep of task.blockedBy) addEdge(edges, dep, task.id, visibleIds);
  }
  return [...edges.values()];
}

function dependencyEdgesFromViewModel(viewModel: TaskGraphViewModel, visibleIds: ReadonlySet<string>) {
  const edges = new Map<string, FlowEdge>();
  for (const node of allViewNodes(viewModel)) {
    if (!visibleIds.has(node.id)) continue;
    for (const dep of node.blockedBy) addEdge(edges, dep, node.id, visibleIds);
  }
  return [...edges.values()];
}

function edgeOrder(nodesById: ReadonlyMap<string, FlowNode>) {
  return (a: FlowEdge, b: FlowEdge) => {
    const fromA = nodesById.get(a.from);
    const fromB = nodesById.get(b.from);
    const toA = nodesById.get(a.to);
    const toB = nodesById.get(b.to);
    return (fromA && fromB ? flowNodeOrder(fromA, fromB) : a.from.localeCompare(b.from))
      || (toA && toB ? flowNodeOrder(toA, toB) : a.to.localeCompare(b.to))
      || a.from.localeCompare(b.from)
      || a.to.localeCompare(b.to);
  };
}

function visibleEdges(input: FlowchartInput, nodes: readonly FlowNode[]) {
  const visibleIds = new Set(nodes.map((node) => node.id));
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const edges = isRun(input) ? dependencyEdgesFromRun(input, visibleIds) : dependencyEdgesFromViewModel(input, visibleIds);
  return edges.sort(edgeOrder(nodesById));
}

function rootWorkModel(input: FlowchartInput): RootWorkDisplayModel {
  if (!isRun(input)) return input.rootWork;
  const lineageByActiveRunId = deriveRootWorkLineageByActiveRunId(input);
  return rootWorkDisplayModel(input.metadata?.rootWorkQueue, { lineageByActiveRunId });
}

function rootWorkItems(input: FlowchartInput): RootWorkDisplayItem[] {
  const model = rootWorkModel(input);
  return [
    ...model.active,
    ...model.queuedExecutable,
    ...model.queuedNonExecutable,
    ...model.recent,
  ];
}

function rootWorkLineageLabelLength(maxLabelLength: number) {
  return Math.max(96, Math.min(180, maxLabelLength * 2));
}

function rootWorkLineageParts(item: RootWorkDisplayItem) {
  const lineage = item.lineage;
  if (!lineage) return [];
  const successorAndDecision = [
    lineage.latestSuccessorRunId ? `latest successor: ${lineage.latestSuccessorRunId}` : undefined,
    lineage.decision ? `Decision: ${lineage.decision}` : undefined,
  ].filter((part): part is string => Boolean(part)).join(" · ");
  const evidence = lineage.evidence
    ? [
        lineage.evidence.label,
        lineage.evidence.path,
      ].filter((part): part is string => Boolean(part)).join(" · ")
    : "";
  const displayOnlyNote = lineage.displayOnlyNotes.some((note) => /display-only/i.test(note) && /durable root work remains active/i.test(note))
    ? "display-only: durable root work remains ACTIVE."
    : lineage.displayOnlyNotes[0];
  return [
    successorAndDecision,
    evidence ? `evidence: ${evidence}` : "",
    displayOnlyNote ? `lineage note: ${displayOnlyNote}` : "",
  ].filter((part) => part.length > 0);
}

function rootWorkAsciiLines(input: FlowchartInput, maxLabelLength: number) {
  const items = rootWorkItems(input);
  if (!items.length) return [];
  const lineageMaxLength = rootWorkLineageLabelLength(maxLabelLength);
  const lines = ["Durable root work queue (synthetic metadata; not scheduler tasks):"];
  for (const item of items) {
    lines.push(`  rootwork:${asciiLabel(item.key, 80)} [${item.state}] ${item.kind} ${asciiLabel(safeRootWorkLabel(item, maxLabelLength), maxLabelLength)}`);
    for (const part of rootWorkLineageParts(item)) lines.push(`    lineage: ${asciiLabel(part, lineageMaxLength)}`);
  }
  return lines;
}

function rootWorkMermaidId(item: RootWorkDisplayItem, index: number) {
  return `rw_${stableHash(`${item.key}:${item.state}:${index}`).slice(0, 10)}`;
}

function rootWorkMermaidLines(input: FlowchartInput, maxLabelLength: number) {
  const items = rootWorkItems(input);
  if (!items.length) return [];
  const lineageMaxLength = rootWorkLineageLabelLength(maxLabelLength);
  const lines = ["  subgraph root_work_queue[\"Durable root work queue (metadata; not scheduler tasks)\"]"];
  items.forEach((item, index) => {
    const labelParts = [
      mermaidLabel(`rootwork:${item.key}`, 60),
      mermaidLabel(`${item.kind} · ${item.state}`, 48),
      mermaidLabel(safeRootWorkLabel(item, maxLabelLength), maxLabelLength),
      ...rootWorkLineageParts(item).map((part) => mermaidLabel(part, lineageMaxLength)),
    ];
    const label = labelParts.join("<br/>");
    lines.push(`    ${rootWorkMermaidId(item, index)}["${label}"]`);
  });
  lines.push("  end");
  lines.push("  classDef rootwork fill:#f8fafc,stroke:#64748b,stroke-dasharray: 4 3");
  items.forEach((item, index) => lines.push(`  class ${rootWorkMermaidId(item, index)} rootwork`));
  return lines;
}

function normalizeOptions(options: TaskGraphFlowchartOptions) {
  return {
    format: options.format ?? "ascii",
    includeDone: options.includeDone ?? false,
    maxLabelLength: clampMaxLabelLength(options.maxLabelLength),
  } as const;
}

function asciiNodeLine(node: FlowNode, maxLabelLength: number) {
  const checks = node.acceptanceCheckCount > 0 ? ` · checks:${node.acceptanceCheckCount}` : "";
  return `  ${node.renderId} [${node.status}] ${node.kind} ${asciiLabel(node.flowLabel, maxLabelLength)}${checks}`;
}

function flowchartTitle(input: FlowchartInput) {
  const runId = isRun(input) ? input.runId : input.graphId;
  return `Task graph ${sanitizeTaskGraphReportingIdForDisplay(runId, "unknown")}`;
}

export function renderTaskGraphAsciiFlowchart(input: FlowchartInput, options: Omit<TaskGraphFlowchartOptions, "format"> = {}) {
  const normalized = normalizeOptions({ ...options, format: "ascii" });
  const nodes = visibleNodes(input, normalized);
  const edges = visibleEdges(input, nodes);
  const title = flowchartTitle(input);
  const lines = [title, "Nodes:"];
  if (!nodes.length) lines.push("  (no visible tasks)");
  else lines.push(...nodes.map((node) => asciiNodeLine(node, normalized.maxLabelLength)));
  lines.push("Edges:");
  if (!edges.length) lines.push("  (no visible dependency edges)");
  else {
    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    lines.push(...edges.map((edge) => `  ${nodesById.get(edge.from)?.renderId ?? edge.from} --> ${nodesById.get(edge.to)?.renderId ?? edge.to}`));
  }
  const rootWorkLines = rootWorkAsciiLines(input, normalized.maxLabelLength);
  if (rootWorkLines.length) lines.push("", ...rootWorkLines);
  return lines.join("\n");
}

const MERMAID_CLASS_DEFS: Readonly<Record<TaskDisplayNode["status"], string>> = {
  current: "fill:#e6f0ff,stroke:#3b6ea8",
  ready: "fill:#e8ffe8,stroke:#4a8f4a",
  blocked: "fill:#fff3d6,stroke:#b8872f",
  waiting: "fill:#f2e8ff,stroke:#7d55aa",
  done: "fill:#f1f5f9,stroke:#94a3b8",
  failed: "fill:#ffe8e8,stroke:#b84a4a",
  cancelled: "fill:#f4f4f5,stroke:#71717a",
};

function mermaidNodeLine(node: FlowNode, maxLabelLength: number) {
  const checks = node.acceptanceCheckCount > 0 ? `<br/>checks:${node.acceptanceCheckCount}` : "";
  const header = node.stableKey ?? node.shortId;
  const label = `${mermaidLabel(header, 48)}<br/>${mermaidLabel(`${node.kind} · ${node.status}`, 48)}<br/>${mermaidLabel(node.flowLabel, maxLabelLength)}${checks}`;
  return `  ${node.mermaidId}["${label}"]`;
}

export function renderTaskGraphMermaidFlowchart(input: FlowchartInput, options: Omit<TaskGraphFlowchartOptions, "format"> = {}) {
  const normalized = normalizeOptions({ ...options, format: "mermaid" });
  const nodes = visibleNodes(input, normalized);
  const edges = visibleEdges(input, nodes);
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const rootWorkLines = rootWorkMermaidLines(input, normalized.maxLabelLength);
  const lines = ["flowchart TD"];
  if (!nodes.length && !rootWorkLines.length) {
    lines.push("  empty[\"No visible tasks\"]");
    return lines.join("\n");
  }
  if (nodes.length) lines.push(...nodes.map((node) => mermaidNodeLine(node, normalized.maxLabelLength)));
  if (edges.length) {
    lines.push("");
    lines.push(...edges.map((edge) => `  ${nodesById.get(edge.from)?.mermaidId} --> ${nodesById.get(edge.to)?.mermaidId}`));
  }
  if (rootWorkLines.length) {
    lines.push("");
    lines.push(...rootWorkLines);
  }
  if (nodes.length) {
    lines.push("");
    for (const [status, style] of Object.entries(MERMAID_CLASS_DEFS).sort(([a], [b]) => a.localeCompare(b))) {
      lines.push(`  classDef ${status} ${style}`);
    }
    for (const node of nodes) lines.push(`  class ${node.mermaidId} ${node.status}`);
  }
  return lines.join("\n");
}

export function renderTaskGraphFlowchart(input: FlowchartInput, options: TaskGraphFlowchartOptions = {}) {
  return (options.format ?? "ascii") === "mermaid"
    ? renderTaskGraphMermaidFlowchart(input, options)
    : renderTaskGraphAsciiFlowchart(input, options);
}
