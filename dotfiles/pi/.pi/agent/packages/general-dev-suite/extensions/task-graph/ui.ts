import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { sanitizeDescriptorStableKeyForDisplay } from "./descriptors";
import { formatLockKeysForDisplay, renderReadyInstructions, sanitizeTaskPromptForDisplay } from "./display";
import { REDACTED_LINEAGE_RUN_ID, REDACTED_SECRETISH_EVIDENCE_PATH, deriveRootWorkLineageByActiveRunId, containsCompactSecretishKeyIdentifierText, isCompactSecretishKeyIdentifier, isSecretishLineageEvidenceText, redactCompactSecretishKeyIdentifiersInText, sanitizeTaskGraphReportingIdForDisplay } from "./root-work-lineage";
import { renderRootWorkCounts, renderRootWorkQueueStatus, rootWorkQueueCounts } from "./root-work-queue";
import { renderTaskGraphFlowchart } from "./flowchart";
import type { AutoImproveLoopMetadata, TaskGraphRun, TaskNode, TaskStatus } from "./schema";
import { applyManualTaskStatus, deleteTask, refreshRunStatus } from "./actions";
import { buildTaskPrompt, readyTasks, taskLockKeys } from "./scheduler";
import { appendEvent, loadRun, loadRunNoCreate, saveRun } from "./store";
import { buildTaskGraphViewModel, lineageDisplayWarnings, preserveSelection, safeTaskSummary, safeTaskTitle, shortTaskId, taskIdForDisplay, type TaskDisplayRow, type TaskViewMode } from "./view-model";

type UpdateUi = (ctx: ExtensionContext, run?: TaskGraphRun) => void;
type PanelMode = "summary" | "details" | "prompt";
type UiMode = TaskViewMode | "flowchart";

interface TaskGraphUiComponent {
  render(width: number): string[];
  handleInput?(data: string): void;
  invalidate(): void;
}

interface TaskGraphTui {
  requestRender(force?: boolean): void;
  terminal?: { rows?: number; columns?: number };
}

const GLYPH: Record<string, string> = {
  pending: "○",
  ready: "◆",
  running: "▶",
  current: "▶",
  blocked: "⧖",
  waiting: "?",
  awaiting_input: "?",
  skipped: "⊘",
  succeeded: "✓",
  done: "✓",
  failed: "✗",
  cancelled: "⏹",
  deleted: "⌫",
};

const ACTIONS: Record<string, TaskStatus> = {
  r: "running",
  s: "succeeded",
  f: "failed",
  x: "skipped",
  c: "cancelled",
};

const TASK_DETAIL_SESSION_PATH = /\/(?:home|Users)\/[^\s)]+\/[^\s)]*sessions?[^\s)]*/gi;
const TASK_DETAIL_PRIVATE_METADATA_KEY = /^(?:agentInstructions|prompt|promptInstructions|projectPromptInstructions|readyPrompt|workerPrompt|systemPrompt|hiddenPrompt|promptTemplate|token|secret|password|passwd|api[\s._-]*key|authorization|cookie|private[\s._-]*key)$/i;
const TASK_DETAIL_PROMPT_OR_SECRET_TEXT = /\b(?:agentInstructions|promptInstructions|projectPromptInstructions|readyPrompt|workerPrompt|systemPrompt|hiddenPrompt|promptTemplate)\b|^\s*(?:system|developer|assistant)\s*:|\b(?:token|secret|password|passwd|api[\s._-]*key|authorization|cookie|private[\s._-]*key)\b\s*[:=]/i;
const TASK_DETAIL_REDACTION_PLACEHOLDER_KEY = /^\[redacted-[a-z0-9][a-z0-9-]*\]$/i;

function short(id: string) {
  return shortTaskId(id);
}

function displayTaskId(id: string) {
  return taskIdForDisplay(id);
}

function displayTaskIdList(ids: readonly string[]) {
  return ids.length ? ids.map(displayTaskId).join(", ") : "none";
}

function formatLineageSource(source: string) {
  return source.replace(/-/g, " ");
}

function reportingIdForDisplay(input: unknown, fallback = "unknown") {
  return sanitizeTaskGraphReportingIdForDisplay(input, fallback);
}

function shortReportingIdForDisplay(input: unknown) {
  const safe = reportingIdForDisplay(input, "");
  if (!safe) return "";
  return safe === REDACTED_LINEAGE_RUN_ID ? safe : short(safe);
}

export function sanitizeTaskMetadataForDetails(metadata: TaskNode["metadata"]): TaskNode["metadata"] {
  const sanitized = sanitizeTaskDetailMetadataValue(metadata, new WeakSet<object>()) as TaskNode["metadata"];
  if (metadata.nodeDescriptor && sanitized.nodeDescriptor) {
    sanitized.nodeDescriptor = {
      ...sanitized.nodeDescriptor,
      stableKey: sanitizeDescriptorStableKeyForDisplay(metadata.nodeDescriptor.stableKey, "task", 160),
    };
  }
  return sanitized;
}

function loopMetadata(run: TaskGraphRun | undefined) {
  return run?.metadata?.autoimproveLoop ?? run?.config.autoimproveLoop;
}

function loopLines(loop: AutoImproveLoopMetadata | undefined) {
  if (!loop) return [];
  const warnings = lineageDisplayWarnings(loop, { actionableOnly: true });
  const rootOrLoopId = reportingIdForDisplay(loop.rootRunId ?? loop.loopId);
  const previousRunId = loop.previousRunId ? shortReportingIdForDisplay(loop.previousRunId) : "";
  return [
    `Autoimprove loop: iteration ${loop.iteration} · root ${rootOrLoopId}${previousRunId ? ` · from ${previousRunId}` : ""}${loop.lineageSource ? ` · lineage: ${formatLineageSource(loop.lineageSource)}` : ""}`,
    ...warnings.map((warning) => `⚠ lineage: ${warning.message}`),
  ];
}

export function rootWorkLines(run: TaskGraphRun) {
  const queue = run.metadata?.rootWorkQueue;
  const counts = rootWorkQueueCounts(queue);
  if (!counts.active && !counts.queued && !counts.history) return [];
  const lineageByActiveRunId = deriveRootWorkLineageByActiveRunId(run);
  const status = renderRootWorkQueueStatus(queue, { lineageByActiveRunId }).split("\n").filter(Boolean).slice(0, 8);
  return [renderRootWorkCounts(counts), ...status.slice(2)];
}

function customGraphLabel(run: TaskGraphRun) {
  return run.config.customGraphName ? ` · graph ${run.config.customGraphName}${run.config.customGraphSource ? ` source ${run.config.customGraphSource}` : ""}` : "";
}

function truncate(input: string, width: number) {
  if (width <= 0) return "";
  return input.length > width ? `${input.slice(0, Math.max(0, width - 1))}...` : input;
}

function taskSort(a: TaskNode, b: TaskNode) {
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

export function taskGraphUiReportingSnapshot(run: TaskGraphRun): TaskGraphRun {
  const snapshot = JSON.parse(JSON.stringify(run)) as TaskGraphRun;
  refreshRunStatus(snapshot);
  return snapshot;
}

function formatTaskRow(rowInfo: TaskDisplayRow, selected: boolean, width: number, mode: TaskViewMode, expandedTaskIds: ReadonlySet<string>) {
  if (rowInfo.rowKind === "section") return truncate(`  ${rowInfo.label}`, width);
  const node = rowInfo.node;
  if (!node) return "";
  const marker = selected ? ">" : " ";
  const hasChildren = mode === "outline" && node.children.length > 0;
  const expanded = expandedTaskIds.has(node.id);
  const branch = hasChildren ? (expanded ? "▾" : "▸") : " ";
  const indent = mode === "outline" ? "  ".repeat(Math.min(node.depth, 8)) : "";
  const numeric = typeof node.numericId === "number" ? `#${node.numericId} ` : "";
  const deps = node.blockedBy.length && mode === "work-list" ? ` deps:${node.blockedBy.map(short).join(",")}` : "";
  const sub = node.subagentType ? ` @${node.subagentType}` : "";
  const disabled = node.disabled ? " disabled" : "";
  const descriptor = node.stableKey ? `[${node.stableKey}] ${node.purpose ?? node.title}` : node.title;
  const row = `${marker} ${indent}${branch} ${GLYPH[node.status] ?? "•"} ${numeric}${node.shortId} ${node.kind.padEnd(11)} [${node.sourceStatus}] ${descriptor}${sub}${deps}${disabled}`;
  return truncate(row, width);
}

function keyName(data: string) {
  if (data === "\u001b") return "escape";
  if (data === "\r" || data === "\n") return "enter";
  if (data === "\u0012") return "ctrl-r";
  if (data === "\u001b[A") return "up";
  if (data === "\u001b[B") return "down";
  if (data === "\u001b[5~") return "pageup";
  if (data === "\u001b[6~") return "pagedown";
  if (data === "\u001b[H" || data === "\u001b[1~" || data === "\u001bOH") return "home";
  if (data === "\u001b[F" || data === "\u001b[4~" || data === "\u001bOF") return "end";
  return data;
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function sanitizeTaskDetailEvidenceText(value: unknown) {
  if (typeof value !== "string") return "";
  if (TASK_DETAIL_PROMPT_OR_SECRET_TEXT.test(value)) return REDACTED_SECRETISH_EVIDENCE_PATH;
  const cleaned = redactCompactSecretishKeyIdentifiersInText(value)
    .replace(TASK_DETAIL_SESSION_PATH, "[redacted-session-path]")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  const redactionNeutral = cleaned.split(REDACTED_SECRETISH_EVIDENCE_PATH).join("");
  if (redactionNeutral && (isSecretishLineageEvidenceText(redactionNeutral) || containsCompactSecretishKeyIdentifierText(redactionNeutral))) return REDACTED_SECRETISH_EVIDENCE_PATH;
  return cleaned
    .split(/([/\\])/)
    .map((part) => part === "/" || part === "\\" ? part : part.replace(/[A-Za-z0-9_+=-]{80,}/g, "[redacted-long-token]"))
    .join("");
}

function isRedactionPlaceholderKey(key: string) {
  return TASK_DETAIL_REDACTION_PLACEHOLDER_KEY.test(key.trim());
}

function isPrivateTaskDetailMetadataKey(key: string) {
  return TASK_DETAIL_PRIVATE_METADATA_KEY.test(key) || isSecretishLineageEvidenceText(key) || isCompactSecretishKeyIdentifier(key);
}

function sanitizeTaskDetailMetadataValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === "string") return sanitizeTaskDetailEvidenceText(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeTaskDetailMetadataValue(item, seen));
  if (value && typeof value === "object") {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (isPrivateTaskDetailMetadataKey(key)) continue;
      const safeKey = sanitizeTaskDetailEvidenceText(key);
      if (!safeKey || isRedactionPlaceholderKey(safeKey) || isSecretishLineageEvidenceText(safeKey) || isCompactSecretishKeyIdentifier(safeKey)) continue;
      out[safeKey] = sanitizeTaskDetailMetadataValue(entry, seen);
    }
    seen.delete(value);
    return out;
  }
  return value;
}

export function formatTaskDetailArtifactList(artifacts: readonly TaskNode["artifacts"][number][]) {
  const rendered = artifacts
    .map((artifact) => sanitizeTaskDetailEvidenceText(artifact.path ?? artifact.id))
    .filter((item) => item.length > 0);
  return rendered.length ? rendered.join(", ") : "none";
}

export function formatTaskDetailChangedFilesList(changedFiles: readonly string[] | undefined) {
  const rendered = (changedFiles ?? [])
    .map((file) => sanitizeTaskDetailEvidenceText(file))
    .filter((item) => item.length > 0);
  return rendered.length ? rendered.join(", ") : "none";
}

function wrapLine(line: string, width: number) {
  if (width <= 0) return [""];
  if (!line) return [""];
  const chunks: string[] = [];
  for (let i = 0; i < line.length; i += width) chunks.push(line.slice(i, i + width));
  return chunks;
}

function appendWrapped(lines: string[], input: string, width: number, maxLines = 500) {
  let added = 0;
  for (const raw of input.split("\n")) {
    for (const line of wrapLine(raw, width)) {
      lines.push(line);
      added += 1;
      if (added >= maxLines) {
        lines.push("... clipped; use task_graph_next/status for copyable full text if needed");
        return;
      }
    }
  }
}

function terminalRows(tui: TaskGraphTui) {
  const rows = Number(tui.terminal?.rows ?? 40);
  return Number.isFinite(rows) && rows > 0 ? Math.max(12, Math.floor(rows)) : 40;
}

function nearestSelectableIndex(rows: readonly TaskDisplayRow[], target: number) {
  if (!rows.length) return 0;
  const candidates = rows
    .map((row, index) => ({ row, index, distance: Math.abs(index - target) }))
    .filter(({ row }) => row.selectable && Boolean(row.node))
    .sort((a, b) => a.distance - b.distance || a.index - b.index);
  return candidates[0]?.index ?? 0;
}

function firstSelectableIndex(rows: readonly TaskDisplayRow[]) {
  return rows.findIndex((row) => row.selectable && Boolean(row.node));
}

function lastSelectableIndex(rows: readonly TaskDisplayRow[]) {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i]?.selectable && rows[i]?.node) return i;
  }
  return -1;
}

export class TaskGraphComponent implements TaskGraphUiComponent {
  private run: TaskGraphRun | undefined;
  private selected = 0;
  private selectedTaskIdValue: string | undefined;
  private taskScroll = 0;
  private panel: PanelMode = "summary";
  private panelScroll = 0;
  private mode: UiMode = "work-list";
  private lastTaskMode: TaskViewMode = "work-list";
  private expandedTaskIds = new Set<string>();
  private lastMessage = "";

  constructor(
    private readonly ctx: ExtensionContext,
    private readonly tui: TaskGraphTui,
    private readonly done: (result: void) => void,
    private readonly updateUi: UpdateUi,
  ) {
    this.reload(false);
  }

  invalidate() {
    this.tui.requestRender();
  }

  render(width: number) {
    const lines: string[] = [];
    const w = Math.max(20, width);
    const rows = terminalRows(this.tui);
    const vm = this.viewModel();
    const rowsList = vm?.rows ?? [];
    this.restoreSelection(rowsList);

    lines.push(truncate("Task Graph UI  q/Esc close · ↑/↓/k/j nav · Pg/Home/End · Enter details/expand · i details · p prompts", w));
    lines.push(truncate("Actions: r running · s succeeded · f failed · x skipped · c cancelled · d delete · R/Ctrl-R refresh · t list/outline · v flowchart", w));
    lines.push(truncate(`Panel: [ / ] scroll details/prompts · mode: ${this.modeLabel()} · shortcut: Ctrl+Alt+G · command: /task-ui · /task-flowchart`, w));
    if (this.lastMessage) lines.push(truncate(this.lastMessage, w));

    if (!this.run || !vm) {
      lines.push("", "No current task graph run found.", "Create one with task_graph_create, or press R to refresh, q to close.");
      return this.pad(lines, rows, w);
    }

    const selectedRow = rowsList[this.selected];
    const selected = selectedRow?.node ? this.run.tasks[selectedRow.node.id] : undefined;
    const panelLines = selected ? this.buildPanelLines(selected, w) : ["none"];
    const panelHeight = this.panel === "summary"
      ? Math.min(6, Math.max(3, panelLines.length))
      : Math.min(Math.max(8, Math.floor(rows * 0.4)), Math.max(3, panelLines.length));
    const listHeight = Math.max(3, rows - lines.length - panelHeight - 8);
    this.ensureTaskVisible(listHeight, rowsList);

    const totalTasks = this.allTasks().length;
    lines.push(truncate(`Run ${reportingIdForDisplay(this.run.runId)} (${this.run.mode}) ${this.run.status}${customGraphLabel(this.run)} · tasks ${totalTasks} · visible ${rowsList.filter((row) => row.rowKind === "task").length} · ready ${vm.counts.ready}/${this.run.config.maxParallel} · current ${vm.counts.current} · blocked ${vm.counts.blocked} · updated ${this.run.updatedAt}`, w));
    lines.push(truncate(`Approval gates: commit=${this.run.config.commitEnabled ? "approved" : "gated"} push=${this.run.config.pushEnabled ? "approved" : "gated"} org=${this.run.config.mutateOrg ? "approved" : "gated"}`, w));
    for (const line of loopLines(loopMetadata(this.run))) lines.push(truncate(line, w));
    for (const line of rootWorkLines(this.run)) lines.push(truncate(line, w));
    lines.push("");

    const listStart = rowsList.length ? this.taskScroll + 1 : 0;
    const listEnd = Math.min(rowsList.length, this.taskScroll + listHeight);
    if (this.mode === "flowchart") {
      lines.push(truncate("Flowchart (ASCII dependency edges; use /task-flowchart mermaid for copyable Mermaid):", w));
      const chartLines = renderTaskGraphFlowchart(this.run, { format: "ascii", includeDone: false, maxLabelLength: Math.max(24, Math.min(72, w - 34)) }).split("\n");
      lines.push(...chartLines.slice(0, listHeight).map((line) => truncate(line, w)));
      if (chartLines.length > listHeight) lines.push(truncate(`... ${chartLines.length - listHeight} more flowchart lines`, w));
    } else {
      const taskMode = this.taskMode();
      lines.push(truncate(`Tasks (${taskMode === "work-list" ? "flat work-list" : "outline"}; selected ${rowsList.length ? this.selected + 1 : 0}/${rowsList.length}; showing ${listStart}-${listEnd})`, w));
      if (!rowsList.length) lines.push("  no tasks");
      for (const [offset, rowInfo] of rowsList.slice(this.taskScroll, this.taskScroll + listHeight).entries()) {
        const index = this.taskScroll + offset;
        lines.push(formatTaskRow(rowInfo, index === this.selected, w, taskMode, this.expandedTaskIds));
      }
      if (this.taskScroll > 0 || listEnd < rowsList.length) {
        lines.push(truncate(`Scroll: ${this.taskScroll > 0 ? `↑ ${this.taskScroll} above` : "top"} · ${listEnd < rowsList.length ? `↓ ${rowsList.length - listEnd} below` : "bottom"}`, w));
      }
    }

    lines.push("", truncate(`Selected (${this.panel}${panelLines.length > panelHeight ? `, panel lines ${this.panelScroll + 1}-${Math.min(panelLines.length, this.panelScroll + panelHeight)} of ${panelLines.length}` : ""}):`, w));
    if (selected && this.isGatedTask(selected)) {
      lines.push(truncate(`⚠ ${selected.kind} execution remains gated. Use task_graph_approve and explicit user action; this UI does not approve or run it.`, w));
    }
    this.clampPanelScroll(panelLines.length, panelHeight);
    lines.push(...panelLines.slice(this.panelScroll, this.panelScroll + panelHeight).map((line) => truncate(line, w)));
    return this.pad(lines, rows, w);
  }

  handleInput(data: string) {
    const key = keyName(data);
    if (key === "escape" || key === "q") return this.done();
    if (key === "up" || key === "k") return this.move(-1);
    if (key === "down" || key === "j") return this.move(1);
    if (key === "pageup") return this.move(-10);
    if (key === "pagedown") return this.move(10);
    if (key === "home" || key === "g") return this.setSelected(firstSelectableIndex(this.visibleRows()));
    if (key === "end" || key === "G") return this.setSelected(lastSelectableIndex(this.visibleRows()));
    if (key === "[") return this.scrollPanel(-5);
    if (key === "]") return this.scrollPanel(5);
    if (key === "R" || key === "ctrl-r") return this.reload(true);
    if (key === "t" || key === "o") return this.toggleMode();
    if (key === "v") return this.toggleFlowchartMode();
    if (key === "enter") return this.drillSelected();
    if (key === "i") return this.togglePanel("details");
    if (key === "p") return this.togglePanel("prompt");
    if (key === "d") return this.applyAction("deleted");
    if (ACTIONS[key]) return this.applyAction(ACTIONS[key]);
  }

  private allTasks() {
    return this.run ? Object.values(this.run.tasks).sort(taskSort) : [];
  }

  private taskMode(): TaskViewMode {
    return this.mode === "outline" ? "outline" : "work-list";
  }

  private modeLabel() {
    if (this.mode === "flowchart") return "flowchart (dependency edges)";
    return this.mode === "work-list" ? "flat work-list" : "outline (parent/decomposition only)";
  }

  private viewModel() {
    if (!this.run) return undefined;
    return buildTaskGraphViewModel(this.run, {
      mode: this.taskMode(),
      selectedTaskId: this.selectedTaskIdValue,
      fallbackSelectedIndex: this.selected,
      expandedTaskIds: this.expandedTaskIds,
    });
  }

  private visibleRows() {
    return this.viewModel()?.rows ?? [];
  }

  private selectedTaskId() {
    const rows = this.visibleRows();
    return rows[this.selected]?.node?.id ?? this.selectedTaskIdValue;
  }

  private restoreSelection(rows = this.visibleRows()) {
    const id = preserveSelection(this.selectedTaskIdValue, this.selected, rows);
    if (!id) {
      this.selectedTaskIdValue = undefined;
      this.selected = 0;
      return;
    }
    this.selectedTaskIdValue = id;
    const index = rows.findIndex((row) => row.selectable && row.node?.id === id);
    this.selected = index >= 0 ? index : nearestSelectableIndex(rows, this.selected);
  }

  private ensureTaskVisible(viewportRows: number, rows = this.visibleRows()) {
    const count = rows.length;
    if (!count) {
      this.taskScroll = 0;
      return;
    }
    const visibleRows = Math.max(1, Math.min(viewportRows, count));
    if (this.selected < this.taskScroll) this.taskScroll = this.selected;
    if (this.selected >= this.taskScroll + visibleRows) this.taskScroll = this.selected - visibleRows + 1;
    this.taskScroll = Math.min(Math.max(0, this.taskScroll), Math.max(0, count - visibleRows));
  }

  private setSelected(index: number) {
    const rows = this.visibleRows();
    if (!rows.length) {
      this.selected = 0;
      this.selectedTaskIdValue = undefined;
    } else {
      this.selected = nearestSelectableIndex(rows, Math.min(Math.max(0, index), rows.length - 1));
      this.selectedTaskIdValue = rows[this.selected]?.node?.id;
    }
    this.panelScroll = 0;
    this.invalidate();
  }

  private move(delta: number) {
    const rows = this.visibleRows();
    if (!rows.length) return this.setSelected(0);
    const direction = delta >= 0 ? 1 : -1;
    let target = this.selected;
    for (let steps = Math.abs(delta); steps > 0; steps -= 1) {
      let next = target + direction;
      while (next >= 0 && next < rows.length && !rows[next]?.selectable) next += direction;
      if (next < 0 || next >= rows.length) break;
      target = next;
    }
    this.setSelected(target);
  }

  private togglePanel(panel: PanelMode) {
    this.panel = this.panel === panel ? "summary" : panel;
    this.panelScroll = 0;
    this.invalidate();
  }

  private toggleMode() {
    const next = this.taskMode() === "work-list" ? "outline" : "work-list";
    this.mode = next;
    this.lastTaskMode = next;
    this.restoreSelection();
    this.panelScroll = 0;
    this.lastMessage = `Switched to ${next === "work-list" ? "flat work-list" : "outline"} view`;
    this.invalidate();
  }

  private toggleFlowchartMode() {
    if (this.mode === "flowchart") {
      this.mode = this.lastTaskMode;
      this.lastMessage = `Switched to ${this.mode === "work-list" ? "flat work-list" : "outline"} view`;
    } else {
      this.lastTaskMode = this.taskMode();
      this.mode = "flowchart";
      this.lastMessage = "Switched to flowchart view";
    }
    this.panelScroll = 0;
    this.invalidate();
  }

  private drillSelected() {
    const row = this.visibleRows()[this.selected];
    if (!row?.node) return;
    if (this.mode === "outline" && row.node.children.length > 0) {
      if (this.expandedTaskIds.has(row.node.id)) this.expandedTaskIds.delete(row.node.id);
      else this.expandedTaskIds.add(row.node.id);
      this.panel = "summary";
      this.panelScroll = 0;
      this.lastMessage = `${this.expandedTaskIds.has(row.node.id) ? "Expanded" : "Collapsed"} ${short(row.node.id)}`;
      this.invalidate();
      return;
    }
    this.togglePanel("details");
  }

  private scrollPanel(delta: number) {
    this.panelScroll = Math.max(0, this.panelScroll + delta);
    this.invalidate();
  }

  private clampPanelScroll(lineCount: number, panelHeight: number) {
    this.panelScroll = Math.min(Math.max(0, this.panelScroll), Math.max(0, lineCount - panelHeight));
  }

  private reload(showMessage: boolean) {
    const oldId = this.selectedTaskIdValue ?? this.selectedTaskId();
    const oldIndex = this.selected;
    const persistedRun = loadRunNoCreate(this.ctx.cwd);
    this.run = persistedRun ? taskGraphUiReportingSnapshot(persistedRun) : undefined;
    if (this.run) {
      this.updateUi(this.ctx, this.run);
      this.selectedTaskIdValue = oldId;
      this.restoreSelection(buildTaskGraphViewModel(this.run, { mode: this.taskMode(), selectedTaskId: oldId, fallbackSelectedIndex: oldIndex, expandedTaskIds: this.expandedTaskIds }).rows);
    } else {
      this.selectedTaskIdValue = undefined;
      this.updateUi(this.ctx, undefined);
    }
    this.panelScroll = 0;
    this.lastMessage = showMessage ? `Refreshed ${new Date().toLocaleTimeString()}` : "";
    this.invalidate();
  }

  private applyAction(status: TaskStatus) {
    const taskId = this.selectedTaskId();
    if (!taskId) return;
    const oldIndex = this.selected;
    this.run = loadRun(this.ctx.cwd, this.run?.runId);
    const task = this.run?.tasks[taskId];
    if (!this.run || !task) {
      this.lastMessage = "Selected task no longer exists; refreshed.";
      this.reload(false);
      return;
    }
    if (this.isBlockedByGate(task, status)) {
      this.lastMessage = `${task.kind} is still gated; use task_graph_approve before marking it ${status}.`;
      this.invalidate();
      return;
    }
    const updated = status === "deleted"
      ? deleteTask(this.run, taskId)
      : applyManualTaskStatus(this.run, taskId, status, `Manual ${status} from task graph UI`);
    saveRun(this.run);
    appendEvent(this.run, { type: status === "deleted" ? "ui_task_deleted" : "ui_task_status", taskId, status, summary: `Manual ${status} from task graph UI` });
    this.updateUi(this.ctx, this.run);
    this.lastMessage = `${displayTaskId(updated.id)} → ${status}`;
    this.selectedTaskIdValue = status === "deleted" ? undefined : updated.id;
    this.restoreSelection(buildTaskGraphViewModel(this.run, { mode: this.taskMode(), selectedTaskId: this.selectedTaskIdValue, fallbackSelectedIndex: oldIndex, expandedTaskIds: this.expandedTaskIds }).rows);
    this.panelScroll = 0;
    this.invalidate();
  }

  private isGatedTask(task: TaskNode) {
    if (!this.run) return false;
    return (task.kind === "COMMIT" && !this.run.config.commitEnabled)
      || (task.kind === "PUSH" && !this.run.config.pushEnabled)
      || (task.metadata.skip?.gate === "org-mutation" && !this.run.config.mutateOrg);
  }

  private isBlockedByGate(task: TaskNode, status: TaskStatus) {
    if (status !== "running" && status !== "succeeded") return false;
    return this.isGatedTask(task);
  }

  private buildPanelLines(task: TaskNode, width: number) {
    if (this.panel === "prompt") return this.promptLines(task, width);
    if (this.panel === "details") return this.detailsLines(task, width);
    return this.summaryLines(task, width);
  }

  private summaryLines(task: TaskNode, width: number) {
    const summary = safeTaskSummary(task, this.run);
    const metadata = sanitizeTaskMetadataForDetails(task.metadata);
    const descriptor = metadata.nodeDescriptor;
    const lines = [
      `${displayTaskId(task.id)} · ${task.kind} · ${task.priority} · ${task.status}`,
      safeTaskTitle(task, this.run),
      descriptor ? `descriptor: [${descriptor.stableKey}] ${descriptor.purpose}` : "descriptor: none",
      summary ? `summary: ${summary}` : "summary: none",
      `blockedBy: ${displayTaskIdList(task.blockedBy)} · blocks: ${displayTaskIdList(task.blocks)}`,
    ];
    const awaiting = metadata.awaitingInput;
    if (awaiting) lines.push(`awaiting input: ${awaiting.question}${awaiting.recommended ? ` (recommended: ${awaiting.recommended})` : ""}`);
    lines.push("Press Enter/i for details, p for full ready prompt(s). Use [ and ] to scroll long panels.");
    return lines.map((line) => truncate(line, width));
  }

  private detailsLines(task: TaskNode, width: number) {
    const lines: string[] = [];
    const metadata = sanitizeTaskMetadataForDetails(task.metadata);
    const descriptor = metadata.nodeDescriptor;
    const fields = [
      `id: ${displayTaskId(task.id)}`,
      `numericId: ${metadata.numericId ?? ""}`,
      `kind/status/priority: ${task.kind}/${task.status}/${task.priority}`,
      `title: ${safeTaskTitle(task, this.run)}`,
      `summary: ${safeTaskSummary(task, this.run) ?? "none"}`,
      `descriptor stableKey: ${descriptor?.stableKey ?? "none"}`,
      `descriptor purpose: ${descriptor?.purpose ?? "none"}`,
      `descriptor order: ${descriptor?.order ?? "none"}`,
      `descriptor inputs: ${descriptor?.inputs.join(", ") || "none"}`,
      `descriptor outputs: ${descriptor?.outputs.join(", ") || "none"}`,
      `descriptor artifacts: ${descriptor?.artifacts.join(", ") || "none"}`,
      `descriptor writeScope: ${descriptor?.writeScope.join(", ") || "none"}`,
      `descriptor isolationBoundary: ${descriptor?.isolationBoundary.join(", ") || "none"}`,
      `descriptor acceptanceChecks: ${descriptor?.acceptanceChecks.join(", ") || "none"}`,
      `blockedBy: ${displayTaskIdList(task.blockedBy)}`,
      `blocks: ${displayTaskIdList(task.blocks)}`,
      `runner: ${task.runner.kind}:${task.runner.name} effects=${task.runner.sideEffects}`,
      `subagent: ${task.subagent ? `${task.subagent.type} context=${task.subagent.context ?? "fresh"}` : "none"}`,
      `locks: ${formatLockKeysForDisplay(taskLockKeys(task))}`,
      `attempts: ${task.attempts.length}${task.attempts.length ? ` last=${task.attempts[task.attempts.length - 1].status}` : ""}`,
      `artifacts: ${formatTaskDetailArtifactList(task.artifacts)}`,
      `approvals: ${(metadata.approvals ?? []).map((a) => `${a.kind}:${a.approved}`).join(", ") || "none"}`,
      `awaitingInput: ${metadata.awaitingInput ? safeJson(metadata.awaitingInput) : "none"}`,
      `changedFiles: ${formatTaskDetailChangedFilesList(metadata.changedFiles)}`,
      `metadata: ${safeJson(metadata)}`,
    ];
    for (const field of fields) appendWrapped(lines, field, width, 500);
    return lines;
  }

  private promptLines(task: TaskNode, width: number) {
    const lines: string[] = [];
    if (!this.run) return lines;
    const ready = readyTasks(this.run).some((item) => item.id === task.id);
    const prompt = ready ? buildTaskPrompt(this.run, task) : renderReadyInstructions(this.run);
    lines.push(ready ? `Ready prompt for ${displayTaskId(task.id)}:` : "Selected task is not ready; all ready prompts:");
    appendWrapped(lines, sanitizeTaskPromptForDisplay(prompt), width, 1000);
    return lines;
  }

  private pad(lines: string[], rows: number, width: number) {
    const out = lines.slice(0, rows).map((line) => truncate(line, width));
    while (out.length < rows) out.push("");
    return out;
  }
}

export async function openTaskGraphUi(ctx: ExtensionContext, updateUi: UpdateUi) {
  if (!ctx.hasUI) {
    const run = loadRunNoCreate(ctx.cwd);
    ctx.ui.notify(run ? "Task graph UI is only available in interactive mode." : "No task graph run found.", run ? "warning" : "info");
    return;
  }
  await ctx.ui.custom<void>((tui, _theme, _keybindings, done) => new TaskGraphComponent(ctx, tui, done, updateUi), {
    overlay: true,
    overlayOptions: { anchor: "top-left", width: "100%", maxHeight: "100%", margin: 0 },
  });
}
