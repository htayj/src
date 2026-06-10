import { sanitizeDescriptorStableKeyForDisplay } from "./descriptors";
import type { AutoImproveLoopMetadata, TaskGraphRun, TaskNode } from "./schema";
import { readyTasks, runnerExecutionGuidance } from "./scheduler";
import { REDACTED_LINEAGE_RUN_ID, REDACTED_LINEAGE_WARNING, REDACTED_SECRETISH_EVIDENCE_PATH, deriveRootWorkLineageByActiveRunId, isSecretishLineageEvidenceText, sanitizeRootWorkDisplayText, sanitizeRootWorkLineageWarningForDisplay, sanitizeTaskGraphReportingIdForDisplay } from "./root-work-lineage";
import { buildTaskGraphViewModel, safeTaskTitle, shortTaskId, type LineageDisplayWarning, type TaskDisplayNode } from "./view-model";
import { renderRootWorkCounts, renderRootWorkQueueStatus, rootWorkQueueCounts, rootWorkReadyGuidance, type RootWorkDisplayModel } from "./root-work-queue";

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

function short(id: string) {
  return shortTaskId(id);
}

export function formatLineageSource(source: string) {
  return source.replace(/-/g, " ");
}

function loopMetadata(run: TaskGraphRun) {
  return run.metadata?.autoimproveLoop ?? run.config.autoimproveLoop;
}

function customGraphSummary(run: TaskGraphRun) {
  if (!run.config.customGraphName) return "";
  return `graph ${run.config.customGraphName}${run.config.customGraphSource ? ` source ${run.config.customGraphSource}` : ""}`;
}

function reportingIdForDisplay(input: unknown, fallback = "unknown") {
  return sanitizeTaskGraphReportingIdForDisplay(input, fallback);
}

function shortReportingIdForDisplay(input: unknown) {
  const safe = reportingIdForDisplay(input, "");
  if (!safe) return "";
  return safe === REDACTED_LINEAGE_RUN_ID ? safe : short(safe);
}

const LOCK_DISPLAY_SESSION_PATH = /\/(?:home|Users)\/[^\s),]+\/[^\s),]*sessions?[^\s),]*/gi;
const LOCK_DISPLAY_LONG_TOKEN = /[A-Za-z0-9_+=-]{64,}/g;
const LOCK_DISPLAY_CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;
const LOCK_DISPLAY_PREFIX = /^(path|group)$/i;
const LOCK_DISPLAY_MAX_LENGTH = 260;
const PROMPT_DISPLAY_TASK_GRAPH_HEADER = /^#\s+Task Graph Task\b/;
const PROMPT_DISPLAY_DESCRIPTOR_HEADER = /^##\s+Deterministic node descriptor\b/;
const PROMPT_DISPLAY_AUTOIMPROVE_LOOP_HEADER = /^##\s+Autoimprove loop context\b/;
const PROMPT_DISPLAY_ANY_HEADER = /^##\s+/;
const PROMPT_DISPLAY_DESCRIPTOR_FIELD = /^([A-Za-z][A-Za-z ]+):(?:\s*(.*))?$/;
const PROMPT_DISPLAY_DESCRIPTOR_LIST_ITEM = /^(\s*[-*+]\s+)(.*)$/;
const PROMPT_DISPLAY_AUTOIMPROVE_LIST_ITEM = /^(\s*[-*+]\s+)(.*)$/;
const PROMPT_DISPLAY_LINEAGE_WARNINGS_HEADER = /^\s*Lineage warnings:\s*$/i;
const PROMPT_DISPLAY_CONTINUATION_ARTIFACT_LINE = /^(\s*Continuation context artifact:\s*)(.*?)(\s*)$/i;
const PROMPT_DISPLAY_AUTOIMPROVE_ITERATION_LINE = /^\s*Iteration:\s*\d+\s*$/i;
const PROMPT_DISPLAY_AUTOIMPROVE_LINEAGE_SOURCE_LINE = /^\s*Lineage source:\s*(?:metadata|metadata confirmed by explicit lineage|explicit legacy adoption|explicit lineage overrode existing metadata|legacy default|created)\s*$/i;
const PROMPT_DISPLAY_AUTOIMPROVE_ORACLE_REQUIRED_LINE = /^\s*Oracle required before implementation:\s*(?:yes|no)\s*$/i;
const PROMPT_DISPLAY_REPORTING_ID_LINE = /^(\s*)(Run|Task|Loop id|Root run|Previous run|Next run):(\s*)(.*?)(\s*)$/;
const PROMPT_DISPLAY_TASK_GRAPH_TITLE_LINE = /^(\s*)Title:(\s*)(.*?)(\s*)$/;
const PROMPT_DISPLAY_TOP_LEVEL_REPORTING_ID_FIELDS = new Set(["run", "task"]);
const PROMPT_DISPLAY_LOOP_REPORTING_ID_FIELDS = new Set(["loop id", "root run", "previous run", "next run"]);
const PROMPT_DISPLAY_SANITIZED_DESCRIPTOR_FIELDS = new Set(["stable key", "purpose", "inputs", "outputs", "artifacts", "write scope", "isolation boundary", "acceptance checks", "descriptor checks"]);
const PROMPT_DISPLAY_DESCRIPTOR_FIELDS = new Set([...PROMPT_DISPLAY_SANITIZED_DESCRIPTOR_FIELDS, "order"]);
const PROMPT_DISPLAY_SESSION_PATH_PLACEHOLDER = "[redacted-session-path]";
const PROMPT_DISPLAY_LONG_TOKEN_PLACEHOLDER = "[redacted-long-token]";
const PROMPT_DISPLAY_DESCRIPTOR_LOCAL_PATH = /\/(?:home|Users)\/[^\s),;]+(?:\/[^\s),;]+)*/gi;
const PROMPT_DISPLAY_DESCRIPTOR_SECRET_SUBSTRING = /(?:api[\s._-]*key|private[\s._-]*key|secret[\s._-]*(?:key|token)|password|passwd|authorization|cookie|token)/i;
const PROJECT_SETTINGS_DISPLAY_SESSION_SEGMENT = /(?:^|[\\/])sessions?(?:[\\/]|$)/i;

function sanitizeProjectSettingsPathForDisplay(input: unknown) {
  if (typeof input !== "string") return "loaded";
  const raw = input.trim();
  if (!raw) return "loaded";
  if (PROJECT_SETTINGS_DISPLAY_SESSION_SEGMENT.test(raw)) return PROMPT_DISPLAY_SESSION_PATH_PLACEHOLDER;
  const safe = sanitizeRootWorkDisplayText(raw, "loaded", LOCK_DISPLAY_MAX_LENGTH);
  if (!safe) return "loaded";
  return PROJECT_SETTINGS_DISPLAY_SESSION_SEGMENT.test(safe) ? PROMPT_DISPLAY_SESSION_PATH_PLACEHOLDER : safe;
}

function truncateLockLabel(value: string) {
  return value.length > LOCK_DISPLAY_MAX_LENGTH ? `${value.slice(0, Math.max(0, LOCK_DISPLAY_MAX_LENGTH - 1)).trimEnd()}…` : value;
}

function sanitizeLockLabelPartForDisplay(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  if (isSecretishLineageEvidenceText(raw)) return REDACTED_SECRETISH_EVIDENCE_PATH;
  const cleaned = raw
    .replace(LOCK_DISPLAY_SESSION_PATH, "[redacted-session-path]")
    .replace(LOCK_DISPLAY_LONG_TOKEN, "[redacted-long-token]")
    .replace(LOCK_DISPLAY_CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  if (isSecretishLineageEvidenceText(cleaned)) return REDACTED_SECRETISH_EVIDENCE_PATH;
  return truncateLockLabel(cleaned);
}

export function sanitizeLockKeyForDisplay(lockKey: unknown) {
  if (typeof lockKey !== "string") return "";
  const raw = lockKey.trim();
  if (!raw) return "";
  const separator = raw.indexOf(":");
  if (separator > 0) {
    const prefix = raw.slice(0, separator).trim();
    if (LOCK_DISPLAY_PREFIX.test(prefix)) {
      const safeValue = sanitizeLockLabelPartForDisplay(raw.slice(separator + 1));
      return safeValue ? `${prefix.toLowerCase()}:${safeValue}` : prefix.toLowerCase();
    }
  }
  return sanitizeLockLabelPartForDisplay(raw);
}

export function sanitizeLockKeysForDisplay(lockKeys: readonly unknown[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of lockKeys) {
    const safe = sanitizeLockKeyForDisplay(key);
    if (!safe || seen.has(safe)) continue;
    seen.add(safe);
    out.push(safe);
  }
  return out;
}

export function formatLockKeysForDisplay(lockKeys: readonly unknown[]) {
  const safe = sanitizeLockKeysForDisplay(lockKeys);
  return safe.length ? safe.join(", ") : "none";
}

function hasDescriptorSecretishDisplayText(value: string) {
  const compact = value.replace(LOCK_DISPLAY_CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
  const camelSpaced = compact.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  const humanized = camelSpaced.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  return isSecretishLineageEvidenceText(compact)
    || isSecretishLineageEvidenceText(camelSpaced)
    || isSecretishLineageEvidenceText(humanized)
    || PROMPT_DISPLAY_DESCRIPTOR_SECRET_SUBSTRING.test(compact)
    || PROMPT_DISPLAY_DESCRIPTOR_SECRET_SUBSTRING.test(camelSpaced)
    || PROMPT_DISPLAY_DESCRIPTOR_SECRET_SUBSTRING.test(humanized);
}

function sanitizePromptDescriptorValueForDisplay(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  if (hasDescriptorSecretishDisplayText(raw)) return REDACTED_SECRETISH_EVIDENCE_PATH;
  const cleaned = raw
    .replace(PROMPT_DISPLAY_DESCRIPTOR_LOCAL_PATH, PROMPT_DISPLAY_SESSION_PATH_PLACEHOLDER)
    .replace(LOCK_DISPLAY_SESSION_PATH, PROMPT_DISPLAY_SESSION_PATH_PLACEHOLDER)
    .replace(LOCK_DISPLAY_LONG_TOKEN, PROMPT_DISPLAY_LONG_TOKEN_PLACEHOLDER)
    .replace(LOCK_DISPLAY_CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  const redactionNeutral = cleaned
    .split(REDACTED_SECRETISH_EVIDENCE_PATH).join("")
    .split(PROMPT_DISPLAY_SESSION_PATH_PLACEHOLDER).join("")
    .split(PROMPT_DISPLAY_LONG_TOKEN_PLACEHOLDER).join("")
    .trim();
  if (redactionNeutral && hasDescriptorSecretishDisplayText(redactionNeutral)) return REDACTED_SECRETISH_EVIDENCE_PATH;
  return truncateLockLabel(cleaned);
}

function promptGenericSecretishProbe(value: string) {
  return value
    .replace(/\bnon[-\s]?secret(?:s)?\b/gi, "public")
    .replace(/\bnoSecrets?\b/g, "public");
}

function hasPromptGenericSecretishDisplayText(value: string) {
  return hasDescriptorSecretishDisplayText(promptGenericSecretishProbe(value));
}

function sanitizePromptGenericValueForDisplay(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  if (hasPromptGenericSecretishDisplayText(raw)) return REDACTED_SECRETISH_EVIDENCE_PATH;
  const cleaned = raw
    .replace(PROMPT_DISPLAY_DESCRIPTOR_LOCAL_PATH, PROMPT_DISPLAY_SESSION_PATH_PLACEHOLDER)
    .replace(LOCK_DISPLAY_SESSION_PATH, PROMPT_DISPLAY_SESSION_PATH_PLACEHOLDER)
    .replace(LOCK_DISPLAY_LONG_TOKEN, PROMPT_DISPLAY_LONG_TOKEN_PLACEHOLDER)
    .replace(LOCK_DISPLAY_CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  const redactionNeutral = cleaned
    .split(REDACTED_SECRETISH_EVIDENCE_PATH).join("")
    .split(PROMPT_DISPLAY_SESSION_PATH_PLACEHOLDER).join("")
    .split(PROMPT_DISPLAY_LONG_TOKEN_PLACEHOLDER).join("")
    .trim();
  if (redactionNeutral && hasPromptGenericSecretishDisplayText(redactionNeutral)) return REDACTED_SECRETISH_EVIDENCE_PATH;
  return truncateLockLabel(cleaned);
}

function sanitizePromptGenericLineForDisplay(line: string) {
  const match = /^(\s*)(.*?)(\s*)$/.exec(line);
  const prefix = match?.[1] ?? "";
  const content = match?.[2] ?? line;
  const suffix = match?.[3] ?? "";
  const safe = sanitizePromptGenericValueForDisplay(content);
  return safe ? `${prefix}${safe}${suffix}` : "";
}

function formatDescriptorChecksForDisplay(checks: readonly string[]) {
  const safe = checks.map((check) => sanitizePromptDescriptorValueForDisplay(check)).filter(Boolean);
  return safe.length ? safe.join("; ") : "none";
}

function sanitizePromptContinuationArtifactForDisplay(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  const lineageSafe = sanitizeRootWorkDisplayText(raw, "", LOCK_DISPLAY_MAX_LENGTH);
  const cleaned = (lineageSafe || raw)
    .replace(PROMPT_DISPLAY_DESCRIPTOR_LOCAL_PATH, PROMPT_DISPLAY_SESSION_PATH_PLACEHOLDER)
    .replace(LOCK_DISPLAY_SESSION_PATH, PROMPT_DISPLAY_SESSION_PATH_PLACEHOLDER)
    .replace(LOCK_DISPLAY_LONG_TOKEN, PROMPT_DISPLAY_LONG_TOKEN_PLACEHOLDER)
    .replace(LOCK_DISPLAY_CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  const redactionNeutral = cleaned
    .split(REDACTED_SECRETISH_EVIDENCE_PATH).join("")
    .split(PROMPT_DISPLAY_SESSION_PATH_PLACEHOLDER).join("")
    .split(PROMPT_DISPLAY_LONG_TOKEN_PLACEHOLDER).join("")
    .trim();
  if (redactionNeutral && hasDescriptorSecretishDisplayText(redactionNeutral)) return REDACTED_SECRETISH_EVIDENCE_PATH;
  return truncateLockLabel(cleaned);
}

function sanitizePromptLineageWarningForDisplay(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  const lineageSafe = sanitizeRootWorkLineageWarningForDisplay(raw);
  const cleaned = (lineageSafe || raw)
    .replace(PROMPT_DISPLAY_DESCRIPTOR_LOCAL_PATH, PROMPT_DISPLAY_SESSION_PATH_PLACEHOLDER)
    .replace(LOCK_DISPLAY_SESSION_PATH, PROMPT_DISPLAY_SESSION_PATH_PLACEHOLDER)
    .replace(LOCK_DISPLAY_LONG_TOKEN, PROMPT_DISPLAY_LONG_TOKEN_PLACEHOLDER)
    .replace(LOCK_DISPLAY_CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  const redactionNeutral = cleaned
    .split(REDACTED_LINEAGE_WARNING).join("")
    .split(REDACTED_SECRETISH_EVIDENCE_PATH).join("")
    .split(PROMPT_DISPLAY_SESSION_PATH_PLACEHOLDER).join("")
    .split(PROMPT_DISPLAY_LONG_TOKEN_PLACEHOLDER).join("")
    .trim();
  if (redactionNeutral && hasDescriptorSecretishDisplayText(redactionNeutral)) return REDACTED_LINEAGE_WARNING;
  return truncateLockLabel(cleaned);
}

function sanitizePromptAutoimproveContinuationLineForDisplay(line: string, sanitize: (value: string) => string) {
  const match = /^(\s*)(.*?)(\s*)$/.exec(line);
  const prefix = match?.[1] ?? "";
  const content = match?.[2] ?? line;
  const suffix = match?.[3] ?? "";
  const safe = sanitize(content);
  return safe ? `${prefix}${safe}${suffix}` : "";
}

function isKnownPromptAutoimproveLoopFieldLine(line: string) {
  return PROMPT_DISPLAY_AUTOIMPROVE_ITERATION_LINE.test(line)
    || PROMPT_DISPLAY_AUTOIMPROVE_LINEAGE_SOURCE_LINE.test(line)
    || PROMPT_DISPLAY_AUTOIMPROVE_ORACLE_REQUIRED_LINE.test(line);
}

function isPromptReportingIdLineForDisplay(line: string, allowedLabels: ReadonlySet<string>) {
  const match = PROMPT_DISPLAY_REPORTING_ID_LINE.exec(line);
  const label = match?.[2] ?? "";
  return Boolean(match && allowedLabels.has(label.toLowerCase()));
}

function sanitizePromptReportingIdLineForDisplay(line: string, allowedLabels: ReadonlySet<string>) {
  const match = PROMPT_DISPLAY_REPORTING_ID_LINE.exec(line);
  if (!match) return line;
  const label = match[2] ?? "";
  if (!allowedLabels.has(label.toLowerCase())) return line;
  const rawValue = match[4] ?? "";
  const value = rawValue.trim();
  const displayValue = value ? reportingIdForDisplay(value, value) : "";
  return `${match[1] ?? ""}${label}:${match[3] ?? ""}${displayValue}${match[5] ?? ""}`;
}

function sanitizePromptTaskTitleForDisplay(value: string) {
  return sanitizeRootWorkDisplayText(value, "", LOCK_DISPLAY_MAX_LENGTH);
}

function sanitizePromptTaskGraphPreludeLineForDisplay(line: string) {
  const title = PROMPT_DISPLAY_TASK_GRAPH_TITLE_LINE.exec(line);
  if (title) return `${title[1] ?? ""}Title:${title[2] ?? ""}${sanitizePromptTaskTitleForDisplay(title[3] ?? "")}${title[4] ?? ""}`;
  return sanitizePromptReportingIdLineForDisplay(line, PROMPT_DISPLAY_TOP_LEVEL_REPORTING_ID_FIELDS);
}

export function sanitizeTaskPromptForDisplay(prompt: unknown) {
  if (typeof prompt !== "string") return "";
  let inTaskGraphHeaderPrelude = false;
  let inDescriptorBlock = false;
  let inAutoimproveLoopBlock = false;
  let descriptorField = "";
  let autoimproveLoopField = "";
  const lines = prompt.split(/\r?\n/).map((line) => {
    if (PROMPT_DISPLAY_TASK_GRAPH_HEADER.test(line)) {
      inTaskGraphHeaderPrelude = true;
      inDescriptorBlock = false;
      inAutoimproveLoopBlock = false;
      descriptorField = "";
      autoimproveLoopField = "";
      return line;
    }
    if (PROMPT_DISPLAY_DESCRIPTOR_HEADER.test(line)) {
      inTaskGraphHeaderPrelude = false;
      inDescriptorBlock = true;
      inAutoimproveLoopBlock = false;
      descriptorField = "";
      autoimproveLoopField = "";
      return line;
    }
    if (PROMPT_DISPLAY_AUTOIMPROVE_LOOP_HEADER.test(line)) {
      inTaskGraphHeaderPrelude = false;
      inDescriptorBlock = false;
      inAutoimproveLoopBlock = true;
      descriptorField = "";
      autoimproveLoopField = "";
      return line;
    }
    if (PROMPT_DISPLAY_ANY_HEADER.test(line)) {
      inTaskGraphHeaderPrelude = false;
      inDescriptorBlock = false;
      inAutoimproveLoopBlock = false;
      descriptorField = "";
      autoimproveLoopField = "";
      return line;
    }
    if (inTaskGraphHeaderPrelude) return sanitizePromptTaskGraphPreludeLineForDisplay(line);
    if (inAutoimproveLoopBlock) {
      if (isPromptReportingIdLineForDisplay(line, PROMPT_DISPLAY_LOOP_REPORTING_ID_FIELDS)) {
        autoimproveLoopField = "";
        return sanitizePromptReportingIdLineForDisplay(line, PROMPT_DISPLAY_LOOP_REPORTING_ID_FIELDS);
      }
      if (PROMPT_DISPLAY_LINEAGE_WARNINGS_HEADER.test(line)) {
        autoimproveLoopField = "lineage-warnings";
        return line;
      }
      const artifact = PROMPT_DISPLAY_CONTINUATION_ARTIFACT_LINE.exec(line);
      if (artifact) {
        autoimproveLoopField = "continuation-artifact";
        return `${artifact[1] ?? ""}${sanitizePromptContinuationArtifactForDisplay(artifact[2] ?? "")}${artifact[3] ?? ""}`;
      }
      if (isKnownPromptAutoimproveLoopFieldLine(line)) {
        autoimproveLoopField = "";
        return line;
      }
      if (!line.trim()) return line;
      const item = PROMPT_DISPLAY_AUTOIMPROVE_LIST_ITEM.exec(line);
      if (autoimproveLoopField === "lineage-warnings") {
        if (item) return `${item[1] ?? ""}${sanitizePromptLineageWarningForDisplay(item[2] ?? "")}`;
        return sanitizePromptAutoimproveContinuationLineForDisplay(line, sanitizePromptLineageWarningForDisplay);
      }
      if (autoimproveLoopField === "continuation-artifact") return sanitizePromptAutoimproveContinuationLineForDisplay(line, sanitizePromptContinuationArtifactForDisplay);
      return line;
    }
    if (!inDescriptorBlock) return sanitizePromptGenericLineForDisplay(line);
    const trimmed = line.trim();
    if (!trimmed) return line;
    const field = PROMPT_DISPLAY_DESCRIPTOR_FIELD.exec(trimmed);
    if (field) {
      const nextField = field[1]?.toLowerCase() ?? "";
      if (!PROMPT_DISPLAY_DESCRIPTOR_FIELDS.has(nextField)) {
        inDescriptorBlock = false;
        descriptorField = "";
        return line;
      }
      descriptorField = nextField;
      const inlineValue = field[2] ?? "";
      if (inlineValue.trim() && PROMPT_DISPLAY_SANITIZED_DESCRIPTOR_FIELDS.has(descriptorField)) return `${field[1]}: ${sanitizePromptDescriptorValueForDisplay(inlineValue)}`;
      return line;
    }
    const item = PROMPT_DISPLAY_DESCRIPTOR_LIST_ITEM.exec(line);
    if (item) return PROMPT_DISPLAY_SANITIZED_DESCRIPTOR_FIELDS.has(descriptorField) ? `${item[1]}${sanitizePromptDescriptorValueForDisplay(item[2] ?? "")}` : line;
    inDescriptorBlock = false;
    descriptorField = "";
    return line;
  });
  return lines.join("\n");
}

function loopSummary(loop: AutoImproveLoopMetadata, warningCount: number) {
  const source = loop.lineageSource ? ` · lineage: ${formatLineageSource(loop.lineageSource)}` : "";
  const warningBadge = warningCount ? " ⚠ lineage" : "";
  const previousRunId = loop.previousRunId ? shortReportingIdForDisplay(loop.previousRunId) : "";
  return ` · loop ${loop.iteration}${previousRunId ? ` from ${previousRunId}` : ""}${source}${warningBadge}`;
}

function lineageWarningLines(warnings: readonly LineageDisplayWarning[]) {
  return warnings.map((warning) => `⚠ lineage: ${warning.message}`);
}

function compactNodeLabel(node: TaskDisplayNode) {
  const sub = node.subagentType ? ` @${node.subagentType}` : "";
  const descriptor = node.stableKey ? `[${node.stableKey}] ${node.purpose ?? node.title}` : node.title;
  return `${node.shortId} ${node.kind} ${descriptor}${sub}`;
}

function taskLine(run: TaskGraphRun, task: TaskNode, node?: TaskDisplayNode) {
  const deps = task.blockedBy.length ? ` deps:${task.blockedBy.map(short).join(",")}` : "";
  const sub = task.subagent?.type ? ` @${task.subagent.type}` : "";
  const descriptor = node?.stableKey ? `[${node.stableKey}] ${node.purpose ?? node.title}` : safeTaskTitle(task, run);
  return `${GLYPH[task.status] ?? "•"} ${short(task.id)} ${task.kind.padEnd(11)} ${descriptor}${sub}${deps}`;
}

function taskUpdatedAt(task: TaskNode) {
  return task.updatedAt || task.createdAt;
}

function mostRecentTask(tasks: TaskNode[]): TaskNode | undefined {
  return tasks.sort((a, b) => taskUpdatedAt(b).localeCompare(taskUpdatedAt(a)))[0];
}

function currentLine(vm: ReturnType<typeof buildTaskGraphViewModel>) {
  const current = vm.currentNodes[0];
  if (current) return `${GLYPH[current.status] ?? "▶"} Current: ${current.status === "waiting" ? "waiting" : "running"} — ${compactNodeLabel(current)}`;
  const ready = vm.readyNodes[0];
  if (ready) return `◆ Current: ready — ${compactNodeLabel(ready)}${vm.readyNodes.length > 1 ? ` (+${vm.readyNodes.length - 1} more ready)` : ""}`;
  if (vm.blockedNodes.length) return `⧖ Current: blocked — waiting on ${vm.blockedNodes.length} task${vm.blockedNodes.length === 1 ? "" : "s"}`;
  return "○ Current: none";
}

function countsLine(vm: ReturnType<typeof buildTaskGraphViewModel>) {
  return `Ready: ${vm.counts.ready} · Blocked: ${vm.counts.blocked} · Done: ${vm.counts.done}${vm.counts.failed ? ` · Failed: ${vm.counts.failed}` : ""}`;
}

function compactLineageNote(notes: readonly string[]) {
  const note = notes.find((candidate) => /display-only/i.test(candidate)) ?? notes[0];
  if (!note) return "display-only";
  if (/display-only/i.test(note) && /durable root work remains active/i.test(note)) return "display-only: durable root work remains ACTIVE";
  return note.length > 120 ? `${note.slice(0, 119).trimEnd()}…` : note;
}

function rootWorkLineageWidgetLines(rootWork: RootWorkDisplayModel) {
  return rootWork.active
    .map((item) => {
      const lineage = item.lineage;
      if (!lineage?.latestSuccessorRunId && !lineage?.decision) return undefined;
      const details = [
        lineage.latestSuccessorRunId ? `latest successor ${lineage.latestSuccessorRunId}` : undefined,
        lineage.decision ? `Decision: ${lineage.decision}` : undefined,
        compactLineageNote(lineage.displayOnlyNotes),
      ].filter((part): part is string => Boolean(part));
      return details.length ? `Root work lineage: ${details.join(" · ")}` : undefined;
    })
    .filter((line): line is string => Boolean(line))
    .slice(0, 2);
}

const COMPLETED_STATUSES = new Set(["succeeded", "skipped"]);

export function renderTaskGraphWidget(run: TaskGraphRun) {
  const lineageByActiveRunId = deriveRootWorkLineageByActiveRunId(run);
  const vm = buildTaskGraphViewModel(run, { mode: "work-list", lineageByActiveRunId });
  const loop = loopMetadata(run);
  const customGraph = customGraphSummary(run);
  const rootWorkCounts = rootWorkQueueCounts(run.metadata?.rootWorkQueue);
  const rootWorkLine = (rootWorkCounts.active || rootWorkCounts.queued || rootWorkCounts.history) ? renderRootWorkCounts(rootWorkCounts) : undefined;
  const rootWorkLineageLines = rootWorkLineageWidgetLines(vm.rootWork);
  const header = `Task graph ${reportingIdForDisplay(run.runId)} (${run.mode}) ${run.status}${customGraph ? ` · ${customGraph}` : ""}${loop ? loopSummary(loop, vm.actionableWarnings.length) : ""} · ◆${vm.counts.ready}/${run.config.maxParallel} ▶${vm.counts.current} ○${vm.counts.blocked}${vm.counts.failed ? ` ✗${vm.counts.failed}` : ""}`;
  const completed = mostRecentTask(Object.values(run.tasks).filter((task) => COMPLETED_STATUSES.has(task.status)));
  const completedLabel = completed ? `${GLYPH[completed.status] ?? "✓"} Done: ${short(completed.id)} ${completed.kind} ${safeTaskTitle(completed, run)}` : "✓ Done: none yet";
  return [
    header,
    ...lineageWarningLines(vm.actionableWarnings),
    ...(rootWorkLine ? [rootWorkLine] : []),
    ...rootWorkLineageLines,
    completedLabel,
    currentLine(vm),
    countsLine(vm),
  ];
}

export function renderStatus(run: TaskGraphRun, opts: { expanded?: boolean; limit?: number } = {}) {
  const lineageByActiveRunId = deriveRootWorkLineageByActiveRunId(run);
  const vm = buildTaskGraphViewModel(run, { mode: "work-list", lineageByActiveRunId });
  const settings = run.config.projectSettingsInfo?.loaded ? ` · settings ${sanitizeProjectSettingsPathForDisplay(run.config.projectSettingsInfo.path)}` : "";
  const customGraph = customGraphSummary(run);
  const loop = loopMetadata(run);
  const header = `Task graph ${reportingIdForDisplay(run.runId)} (${run.mode}) ${run.status}${loop ? loopSummary(loop, vm.actionableWarnings.length) : ""} · ready ${vm.counts.ready}/${run.config.maxParallel}${settings}${customGraph ? ` · ${customGraph}` : ""}`;
  const summary = `current:${vm.counts.current} ready:${vm.counts.ready} blocked:${vm.counts.blocked} done:${vm.counts.done} failed:${vm.counts.failed}`;
  const lines = [header, summary, currentLine(vm), countsLine(vm), ...lineageWarningLines(vm.actionableWarnings)];
  const rootWorkStatus = renderRootWorkQueueStatus(run.metadata?.rootWorkQueue, { lineageByActiveRunId });
  if (rootWorkStatus) lines.push("", rootWorkStatus);
  if (vm.readyNodes.length) {
    lines.push("", "Ready:");
    for (const task of vm.readyNodes) lines.push(`  ◆ ${task.shortId} ${task.kind} ${task.stableKey ? `[${task.stableKey}] ${task.purpose ?? task.title}` : task.title} via ${task.runner}`);
  }
  const displayNodesById = new Map([
    ...vm.currentNodes,
    ...vm.readyNodes,
    ...vm.blockedNodes,
    ...vm.doneNodes,
    ...vm.failedNodes,
  ].map((node) => [node.id, node]));
  const tasks = Object.values(run.tasks)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    .slice(0, opts.limit ?? (opts.expanded ? 200 : 18));
  lines.push("", "Tasks:");
  for (const task of tasks) lines.push(`  ${taskLine(run, task, displayNodesById.get(task.id))}`);
  const total = Object.keys(run.tasks).length;
  if (tasks.length < total) lines.push(`  … ${total - tasks.length} more`);
  return lines.join("\n");
}

export function footerStatus(run: TaskGraphRun) {
  const vm = buildTaskGraphViewModel(run, { mode: "work-list" });
  const rootWork = rootWorkQueueCounts(run.metadata?.rootWorkQueue);
  const rootWorkBadge = rootWork.active || rootWork.queued ? ` rw:${rootWork.active}/${rootWork.queued}` : "";
  return `◆${vm.counts.ready} ▶${vm.counts.current} ○${vm.counts.blocked}${vm.counts.failed ? ` ✗${vm.counts.failed}` : ""}${rootWorkBadge}`;
}

export function renderReadyInstructions(run: TaskGraphRun) {
  const ready = readyTasks(run);
  const displayRunId = reportingIdForDisplay(run.runId);
  if (!ready.length) {
    const guidance = rootWorkReadyGuidance(run.metadata?.rootWorkQueue);
    return guidance ? `No ready tasks for ${displayRunId}.\n${guidance}` : `No ready tasks for ${displayRunId}.`;
  }
  const lines = [`Ready tasks for ${displayRunId}:`];
  for (const task of ready) {
    const node = run.tasks[task.id];
    const displayTaskId = reportingIdForDisplay(task.id, task.id);
    const title = node ? safeTaskTitle(node, run) : task.title;
    lines.push("", `## ${displayTaskId} — ${title}`);
    if (task.nodeDescriptor) {
      lines.push(`Stable key: ${sanitizeDescriptorStableKeyForDisplay(task.nodeDescriptor.stableKey) || "task"}`);
      lines.push(`Purpose: ${sanitizePromptDescriptorValueForDisplay(task.nodeDescriptor.purpose) || "Execute this task graph node within its bounded scope."}`);
      lines.push(`Descriptor checks: ${formatDescriptorChecksForDisplay(task.nodeDescriptor.acceptanceChecks)}`);
    }
    lines.push(`Runner: ${task.runner.kind}:${task.runner.name}`);
    if (task.subagent?.type) lines.push(`Subagent: ${task.subagent.type}`);
    lines.push(`Context: ${task.context}${task.subagent?.contextReason ? ` (${task.subagent.contextReason})` : ""}`);
    lines.push(`Guidance: ${runnerExecutionGuidance(task)}`);
    if (task.subagent?.type) lines.push(`Launch with: subagent({ agent: "${task.subagent.type}", task: <prompt>, context: "${task.context}" })`);
    else if (task.runner.kind === "manual_gate") lines.push("Launch with: resolve in parent/operator context, then call task_graph_update.");
    else if (task.runner.kind === "direct_safe") lines.push("Launch with: run the bounded local command/action directly, then call task_graph_update.");
    lines.push(`Locks: ${formatLockKeysForDisplay(task.lockKeys)}`);
    lines.push("Prompt:");
    lines.push(sanitizeTaskPromptForDisplay(task.prompt));
  }
  return lines.join("\n");
}
