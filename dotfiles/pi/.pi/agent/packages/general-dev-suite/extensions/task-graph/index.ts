import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { normalizeDescriptorInput, normalizeDescriptorList, normalizeDescriptorText, normalizeStableKey, sanitizeDescriptorStableKeyForDisplay } from "./descriptors";
import { PACKAGED_CUSTOM_GRAPH_PRESET_NAMES } from "./graph-presets";
import type { CustomGraphSource, FailureRecord, Priority, ReadyTask, RootWorkSeed, RootWorkSelection, RunMode, TaskGraphOptions, TaskGraphRun, TaskKind, TaskNodeDescriptor, TaskNodeDescriptorInput, TaskStatus } from "./schema";
import { ROOT_WORK_KINDS, RUN_MODES, TASK_KINDS, TASK_STATUSES } from "./schema";
import { continueAutoImproveRun } from "./autoimprove-loop";
import { appendStageChain, createAdHocTask, createRun } from "./formulas";
import { footerStatus, formatLineageSource, renderReadyInstructions, renderStatus, renderTaskGraphWidget, sanitizeLockKeysForDisplay } from "./display";
import { renderTaskGraphFlowchart, type TaskGraphFlowchartFormat } from "./flowchart";
import { closeOrOpenAttempt, refreshRunStatus } from "./actions";
import { openTaskGraphUi } from "./ui";
import { aliasTaskId, buildTaskPrompt, nextNumericId, readyTasks, routeFailure, updateTask } from "./scheduler";
import { appendEvent, listRuns, loadRun, loadRunNoCreate, saveRun, writeArtifact } from "./store";
import { defaultGlobalSettingsPaths, defaultSettingsPaths, isBuiltInGraphDisabled, isProjectCustomGraphDisabled, loadProjectSettings, renderProjectTaskGraphTemplates, sanitizeProjectTaskGraphDetails, sanitizeProjectTaskGraphSettingsInfoForDetails, validateProjectSettings } from "./settings";
import { deriveRootWorkLineageByActiveRunId, GENERIC_MARKDOWN_EVIDENCE_LABEL, REDACTED_LINEAGE_RUN_ID, REDACTED_LINEAGE_WARNING, REDACTED_SECRETISH_EVIDENCE_PATH, containsCompactSecretishKeyIdentifierText, isCompactSecretishKeyIdentifier, isSecretishLineageEvidenceText, redactCompactSecretishKeyIdentifiersInText, resolveAutoImproveLineageStatus, sanitizeTaskGraphReportingIdForDisplay, type RootWorkLineageByActiveRunId } from "./root-work-lineage";
import { renderRootWorkCounts, renderRootWorkQueueStatus, rootWorkQueueCounts } from "./root-work-queue";
import { matchExtensionWorkflows, renderExtensionBeforeAgentAdvisory, renderExtensionWorkflowGuide, type ExtensionWorkflowId } from "./extension-integration";
import { previewDynamicTaskGraph, type DynamicTaskGraphPreviewResult, type DynamicTaskGraphSeed, type PreviewDynamicTaskGraphOptions } from "./dynamic-graph";

const text = (s: string, details: Record<string, unknown> = {}) => ({
  content: [{ type: "text" as const, text: s }],
  details: sanitizeContinueAutoImproveResponseDetails(sanitizeProjectTaskGraphDetails(details)),
});
const statusLiterals = TASK_STATUSES.map((s) => Type.Literal(s));
const modeLiterals = ["do", "pdo", "todo", "todo-strict", "ticketdo", "autoimprove", "follow-pipeline", "fixup-pipelines", "fulcrum", "custom"].map((s) => Type.Literal(s));
const flowchartFormatLiterals = ["ascii", "mermaid"].map((s) => Type.Literal(s));
const rootWorkKindLiterals = ROOT_WORK_KINDS.map((s) => Type.Literal(s));
const rootWorkRequestedByLiterals = ["user", "oracle", "agent", "system"].map((s) => Type.Literal(s));
const rootWorkSelectionSchema = Type.Union([
  Type.Object({ mode: Type.Literal("none") }),
  Type.Object({ mode: Type.Literal("first-executable") }),
  Type.Object({ mode: Type.Literal("item-key"), key: Type.String() }),
]);
const extensionWorkflowIds = ["changed-files", "notes", "http-api", "tmux-worker", "image-ai", "comfyui-civitai"] as const satisfies readonly ExtensionWorkflowId[];
const extensionWorkflowLiterals = extensionWorkflowIds.map((id) => Type.Literal(id));
const beforeAgentTaskGraphTrigger = /\b(add|implement|fix|build|create|write|refactor|migrate|replace|remove|design|support|enable|finish|complete)\b/;
const rootWorkSeedFields = {
  key: Type.Optional(Type.String()),
  title: Type.Optional(Type.String()),
  purpose: Type.Optional(Type.String()),
  successCriteria: Type.Optional(Type.String()),
  requestedBy: Type.Optional(Type.Union(rootWorkRequestedByLiterals)),
  priority: Type.Optional(Type.Number()),
  dependsOnRootWorkKeys: Type.Optional(Type.Array(Type.String())),
  objective: Type.Optional(Type.String()),
  oracleQuestion: Type.Optional(Type.String()),
  evidencePaths: Type.Optional(Type.Array(Type.String())),
  writeScope: Type.Optional(Type.Array(Type.String())),
  question: Type.Optional(Type.String()),
  expectedOutput: Type.Optional(Type.String()),
  presetName: Type.Optional(Type.String()),
  args: Type.Optional(Type.Record(Type.String(), Type.Union([Type.String(), Type.Number(), Type.Boolean(), Type.Null()]))),
  description: Type.Optional(Type.String()),
  owner: Type.Optional(Type.String()),
  completionCriteria: Type.Optional(Type.String()),
  sourcePolicy: Type.Optional(Type.String()),
  input: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
};
const rootWorkSeedSchema = Type.Object({
  kind: Type.Union(rootWorkKindLiterals),
  ...rootWorkSeedFields,
});
const futureLoopSeedSchema = Type.Object({
  kind: Type.Optional(Type.Literal("autoimprove-loop")),
  ...rootWorkSeedFields,
});
const dynamicTaskStringListSchema = Type.Union([Type.String(), Type.Array(Type.String())]);
const dynamicTaskGraphSeedSchema = Type.Object({
  key: Type.Optional(Type.String()),
  id: Type.Optional(Type.String()),
  title: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  dependsOn: Type.Optional(dynamicTaskStringListSchema),
  blockedBy: Type.Optional(dynamicTaskStringListSchema),
  writeScope: Type.Optional(dynamicTaskStringListSchema),
  expectedWritePaths: Type.Optional(dynamicTaskStringListSchema),
  acceptanceCriteria: Type.Optional(dynamicTaskStringListSchema),
  suggestedChecks: Type.Optional(dynamicTaskStringListSchema),
  priority: Type.Optional(Type.Union([Type.String(), Type.Number()])),
});

function updateUi(ctx: ExtensionContext, run?: TaskGraphRun) {
  if (!run) {
    ctx.ui.setStatus("task-graph", undefined);
    ctx.ui.setWidget("task-graph", undefined);
    return;
  }
  ctx.ui.setStatus("task-graph", footerStatus(run));
  ctx.ui.setWidget("task-graph", renderTaskGraphWidget(run), { placement: "aboveEditor" });
}

function reportingIdForDisplay(input: unknown, fallback = "unknown") {
  return sanitizeTaskGraphReportingIdForDisplay(input, fallback);
}

function optionalReportingIdForDisplay(input: unknown) {
  return reportingIdForDisplay(input, "") || undefined;
}

function runFileForDisplay(runId: unknown) {
  return `.pi/dev-suite/task-graph/runs/${reportingIdForDisplay(runId, REDACTED_LINEAGE_RUN_ID)}.json`;
}

function requireRun(ctx: ExtensionContext, runId?: string) {
  const run = loadRun(ctx.cwd, runId);
  if (!run) throw new Error(runId ? `No task graph run found: ${reportingIdForDisplay(runId)}` : "No current task graph run found");
  return run;
}

function requireExistingRun(ctx: ExtensionContext, runId?: string) {
  const run = loadRunNoCreate(ctx.cwd, runId);
  if (!run) throw new Error(runId ? `No task graph run found: ${reportingIdForDisplay(runId)}` : "No current task graph run found");
  return run;
}

const BUILT_IN_GRAPH_MODES = RUN_MODES.filter((mode) => mode !== "custom");

type GraphToggleScope = "project" | "global";
type GraphToggleEntry =
  | { kind: "builtin"; name: RunMode; label: string; disabled: boolean }
  | { kind: "custom"; name: string; label: string; disabled: boolean; source: CustomGraphSource | "unknown" };

function settingsFileForScope(ctx: ExtensionContext, scope: GraphToggleScope) {
  if (scope === "global") return defaultGlobalSettingsPaths()[0];
  return defaultSettingsPaths(ctx.cwd)[0];
}

function readSettingsObject(file: string) {
  if (!fs.existsSync(file)) return {} as Record<string, unknown>;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Invalid task graph settings JSON at ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
  throw new Error(`Task graph settings must be a JSON object: ${file}`);
}

function asStringArray(value: unknown) {
  if (value === undefined) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
}

function disableTokens(entry: GraphToggleEntry) {
  return entry.kind === "builtin" ? [entry.name, `builtin:${entry.name}`] : [entry.name, `custom:${entry.name}`];
}

function setGraphDisabledInSettingsFile(file: string, entry: GraphToggleEntry, disabled: boolean) {
  const settings = readSettingsObject(file);
  const current = new Set(asStringArray(settings.disabledGraphs));
  if (disabled) {
    const tokens = disableTokens(entry);
    current.add(tokens[tokens.length - 1]);
  } else {
    current.delete("*");
    if (entry.kind === "custom") current.delete("custom");
    for (const token of disableTokens(entry)) current.delete(token);
  }
  const disabledGraphs = Array.from(current).sort();
  if (disabledGraphs.length) settings.disabledGraphs = disabledGraphs;
  else delete settings.disabledGraphs;
  if (!disabled && entry.kind === "custom") {
    const disabledPackaged = new Set(asStringArray(settings.disabledPackagedGraphs));
    disabledPackaged.delete(entry.name);
    const nextDisabledPackaged = Array.from(disabledPackaged).sort();
    if (nextDisabledPackaged.length) settings.disabledPackagedGraphs = nextDisabledPackaged;
    else delete settings.disabledPackagedGraphs;
  }
  validateProjectSettings(settings, file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`);
}

function graphToggleEntries(ctx: ExtensionContext): GraphToggleEntry[] {
  const settingsInfo = loadProjectSettings(ctx.cwd);
  const customNames = Array.from(new Set([...PACKAGED_CUSTOM_GRAPH_PRESET_NAMES, ...Object.keys(settingsInfo.settings?.graphs ?? {})])).sort((a, b) => a.localeCompare(b));
  const disabledPackaged = new Set(settingsInfo.disabledPackagedGraphNames ?? []);
  return [
    ...BUILT_IN_GRAPH_MODES.map((mode) => ({ kind: "builtin" as const, name: mode, label: `built-in:${mode}`, disabled: isBuiltInGraphDisabled(settingsInfo, mode) })),
    ...customNames.map((name) => {
      const source = settingsInfo.graphSourceMap?.[name] ?? ((PACKAGED_CUSTOM_GRAPH_PRESET_NAMES as readonly string[]).includes(name) ? "packaged" : "unknown");
      return {
        kind: "custom" as const,
        name,
        source,
        label: `custom:${name} (${source})`,
        disabled: isProjectCustomGraphDisabled(settingsInfo, name) || (source === "packaged" && disabledPackaged.has(name)),
      };
    }),
  ];
}

async function openTaskGraphsManager(ctx: ExtensionContext) {
  while (true) {
    const entries = graphToggleEntries(ctx);
    const selected = await ctx.ui.select("Enable/disable task graphs", [
      "--- Select a graph to toggle (q/cancel to exit) ---",
      ...entries.map((entry) => `${entry.disabled ? "[disabled]" : "[enabled] "} ${entry.label}`),
    ]);
    if (!selected || selected.startsWith("---")) return;
    const entry = entries.find((item) => selected.endsWith(item.label));
    if (!entry) return;
    const scopeSelection = await ctx.ui.select(`${entry.disabled ? "Enable" : "Disable"} ${entry.label}`, ["project", "global"]);
    if (scopeSelection !== "project" && scopeSelection !== "global") return;
    const file = settingsFileForScope(ctx, scopeSelection);
    const nextDisabled = !entry.disabled;
    const ok = await ctx.ui.confirm(`${nextDisabled ? "Disable" : "Enable"} ${entry.label}`, `${nextDisabled ? "Disable" : "Enable"} ${entry.label} in ${scopeSelection} settings?\n${file}`);
    if (!ok) continue;
    setGraphDisabledInSettingsFile(file, entry, nextDisabled);
    ctx.ui.notify(`${nextDisabled ? "Disabled" : "Enabled"} ${entry.label} in ${file}`, "info");
  }
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

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function safeTmuxSessionName(value: string | undefined, fallback: string) {
  const raw = (value?.trim() || fallback).replace(/[^A-Za-z0-9_.:-]+/g, "-").replace(/^-+|-+$/g, "");
  return (raw || fallback).slice(0, 80);
}

export function lineageResponseSuffix(lineage: { lineageSource?: string; lineageWarnings?: string[] }) {
  const source = lineage.lineageSource ? ` Lineage: ${formatLineageSource(lineage.lineageSource)}.` : "";
  const safeWarnings = (lineage.lineageWarnings ?? [])
    .map((warning) => sanitizeRootWorkLineageWarning(warning))
    .filter((warning) => warning.length > 0);
  const warnings = safeWarnings.length ? ` Warnings: ${safeWarnings.join("; ")}` : "";
  return `${source}${warnings}`;
}

function rootWorkResponseSuffix(metadata: TaskGraphRun["metadata"] | undefined) {
  const counts = rootWorkQueueCounts(metadata?.rootWorkQueue);
  return (counts.active || counts.queued || counts.history) ? ` ${renderRootWorkCounts(counts)}.` : "";
}

const RESPONSE_DETAILS_PROMPT_OR_SECRET_LINE = /\b(?:agentInstructions|promptInstructions|projectPromptInstructions|readyPrompt|workerPrompt|systemPrompt|hiddenPrompt|promptTemplate)\b|^\s*(?:system|developer|assistant)\s*:|\b(?:token|secret|password|passwd|api[\s._-]*key|authorization|cookie|private[\s._-]*key)\b\s*[:=]/i;
const RESPONSE_DETAILS_PROMPT_OR_SECRET_KEY = /^(?:agentInstructions|prompt|promptInstructions|projectPromptInstructions|readyPrompt|workerPrompt|systemPrompt|hiddenPrompt|promptTemplate|token|secret|password|passwd|api[\s._-]*key|authorization|cookie|private[\s._-]*key)$/i;
const RESPONSE_DETAILS_SESSION_PATH = /\/(?:home|Users)\/[^\s)]+\/[^\s)]*sessions?[^\s)]*/gi;
const RESPONSE_DETAILS_LONG_TOKEN = /[A-Za-z0-9_+=-]{80,}/g;
const RESPONSE_DETAILS_CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;
const RESPONSE_DETAILS_MARKDOWN_PATH_FRAGMENT = /(^|[\s"'(\[<{:])([^\s"'()<>{}\[\],;]+?\.(?:md|markdown))(?=$|[\s"')\]}>.,;])/gi;
const RESPONSE_DETAILS_REDACTION_PLACEHOLDER_KEY = /^\[redacted-[a-z0-9][a-z0-9-]*\]$/i;
const RESPONSE_DETAILS_REDACTED_EVIDENCE_COMPONENT = "[redacted-evidence-component]";

function isRedactionPlaceholderKey(key: string) {
  return RESPONSE_DETAILS_REDACTION_PLACEHOLDER_KEY.test(key.trim());
}

function sanitizeRootWorkLineageText(value: string, maxLength = 500) {
  const cleaned = value
    .split(/\r?\n/)
    .filter((line) => !RESPONSE_DETAILS_PROMPT_OR_SECRET_LINE.test(line))
    .join(" ")
    .replace(RESPONSE_DETAILS_SESSION_PATH, "[redacted-session-path]")
    .replace(RESPONSE_DETAILS_LONG_TOKEN, "[redacted-long-token]")
    .replace(RESPONSE_DETAILS_CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…` : cleaned;
}

type ResponseDetailsStringContext = "generic" | "label" | "path" | "markdown" | "warning" | "run-id";

function responseDetailsKeyWords(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function responseDetailsStringContextForKey(key: string): ResponseDetailsStringContext | undefined {
  const words = responseDetailsKeyWords(key);
  const hasIdWord = words.includes("id") || words.includes("ids") || words.includes("identifier") || words.includes("identifiers");
  const hasArtifactWord = words.includes("artifact") || words.includes("artifacts");
  const hasEvidenceWord = words.includes("evidence") || words.includes("evidences");
  const hasRunWord = words.includes("run") || words.includes("runs") || words.includes("successor") || words.includes("successors") || words.includes("loop") || words.includes("loops");
  if (words.includes("warning") || words.includes("warnings")) return "warning";
  if (words.includes("label") || words.includes("labels")) return "label";
  if (words.includes("path") || words.includes("paths") || words.includes("filepath") || words.includes("filepaths") || words.includes("file") || words.includes("files") || words.includes("filename") || words.includes("filenames")) return "path";
  if (hasEvidenceWord && (words.includes("context") || words.includes("contexts") || words.includes("list") || words.includes("lists") || hasIdWord)) return "path";
  if (hasArtifactWord && (words.includes("list") || words.includes("lists") || hasArtifactWord || hasIdWord)) return "path";
  if (hasRunWord && hasIdWord) return "run-id";
  if (words.includes("markdown")) return "markdown";
  return undefined;
}

function sanitizeRootWorkLineageMarkdown(value: string) {
  return sanitizeRootWorkLineageText(
    value
      .split(/\r?\n/)
      .filter((line) => !isSecretishLineageEvidenceText(line) && !containsCompactSecretishKeyIdentifierText(line))
      .join("\n"),
  );
}

function responseDetailsPathRedactionNeutral(value: string) {
  return value
    .split(REDACTED_SECRETISH_EVIDENCE_PATH).join("")
    .split(RESPONSE_DETAILS_REDACTED_EVIDENCE_COMPONENT).join("");
}

function sanitizeRootWorkLineagePath(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  if (isSecretishLineageEvidenceText(raw)) return REDACTED_SECRETISH_EVIDENCE_PATH;
  const compactRedacted = redactCompactSecretishKeyIdentifiersInText(raw, RESPONSE_DETAILS_REDACTED_EVIDENCE_COMPONENT);
  const cleaned = sanitizeRootWorkLineageText(compactRedacted);
  if (!cleaned) return "";
  const redactionNeutral = responseDetailsPathRedactionNeutral(cleaned);
  return redactionNeutral && (isSecretishLineageEvidenceText(redactionNeutral) || containsCompactSecretishKeyIdentifierText(redactionNeutral))
    ? REDACTED_SECRETISH_EVIDENCE_PATH
    : cleaned;
}

function redactSecretishEvidencePathFragments(value: string) {
  return value.replace(RESPONSE_DETAILS_MARKDOWN_PATH_FRAGMENT, (match, prefix: string, candidate: string) => {
    if (!candidate) return match;
    const safeCandidate = sanitizeRootWorkLineagePath(candidate);
    return `${prefix}${safeCandidate || ""}`;
  });
}

function sanitizeRootWorkLineageWarning(value: string) {
  const compactRedacted = redactCompactSecretishKeyIdentifiersInText(redactSecretishEvidencePathFragments(value));
  const cleaned = sanitizeRootWorkLineageText(compactRedacted);
  const redactionNeutral = cleaned.split(REDACTED_SECRETISH_EVIDENCE_PATH).join("");
  return redactionNeutral && (isSecretishLineageEvidenceText(redactionNeutral) || containsCompactSecretishKeyIdentifierText(redactionNeutral)) ? REDACTED_LINEAGE_WARNING : cleaned;
}

function hasUnredactedSecretishLineageEvidenceText(value: string) {
  const redactionNeutral = value.split(REDACTED_SECRETISH_EVIDENCE_PATH).join("");
  return isSecretishLineageEvidenceText(redactionNeutral) || containsCompactSecretishKeyIdentifierText(redactionNeutral);
}

function sanitizeRootWorkLineageString(value: string, context: ResponseDetailsStringContext) {
  if (context === "label" && hasUnredactedSecretishLineageEvidenceText(value)) return GENERIC_MARKDOWN_EVIDENCE_LABEL;
  if (context === "path") return sanitizeRootWorkLineagePath(value);
  if (context === "markdown") return sanitizeRootWorkLineageMarkdown(value);
  if (context === "warning") return sanitizeRootWorkLineageWarning(value);
  if (context === "run-id") return reportingIdForDisplay(value, "");
  const cleaned = sanitizeRootWorkLineageText(value);
  if (context === "label" && hasUnredactedSecretishLineageEvidenceText(cleaned)) return GENERIC_MARKDOWN_EVIDENCE_LABEL;
  if (context === "path" && hasUnredactedSecretishLineageEvidenceText(cleaned)) return REDACTED_SECRETISH_EVIDENCE_PATH;
  if (hasUnredactedSecretishLineageEvidenceText(cleaned)) return REDACTED_SECRETISH_EVIDENCE_PATH;
  return cleaned;
}

function sanitizeRootWorkLineageValue(value: unknown, seen: WeakSet<object>, context: ResponseDetailsStringContext = "generic"): unknown {
  if (typeof value === "string") return sanitizeRootWorkLineageString(value, context);
  if (Array.isArray(value)) return value.map((item) => sanitizeRootWorkLineageValue(item, seen, context));
  if (value && typeof value === "object") {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (RESPONSE_DETAILS_PROMPT_OR_SECRET_KEY.test(key) || isCompactSecretishKeyIdentifier(key)) continue;
      const safeKey = sanitizeRootWorkLineageText(key, 160);
      if (!safeKey || isRedactionPlaceholderKey(safeKey) || isSecretishLineageEvidenceText(safeKey) || isCompactSecretishKeyIdentifier(safeKey)) continue;
      const childContext = responseDetailsStringContextForKey(safeKey) ?? (context === "run-id" ? "generic" : context);
      out[safeKey] = sanitizeRootWorkLineageValue(entry, seen, childContext);
    }
    seen.delete(value);
    return out;
  }
  return value;
}

function sanitizeRootWorkLineageForResponse(lineageByActiveRunId: RootWorkLineageByActiveRunId): RootWorkLineageByActiveRunId {
  return sanitizeRootWorkLineageValue(lineageByActiveRunId, new WeakSet<object>()) as RootWorkLineageByActiveRunId;
}

export function sanitizeContinueAutoImproveResponseDetails<T extends Record<string, unknown>>(details: T): T {
  return sanitizeRootWorkLineageValue(details, new WeakSet<object>()) as T;
}

export function rootWorkResponseDetails(run: TaskGraphRun | undefined) {
  if (!run?.metadata?.rootWorkQueue) return undefined;
  const lineageByActiveRunId = deriveRootWorkLineageByActiveRunId(run);
  const lineage = sanitizeRootWorkLineageForResponse(lineageByActiveRunId);
  const queue = sanitizeRootWorkLineageValue(run.metadata.rootWorkQueue, new WeakSet<object>()) as typeof run.metadata.rootWorkQueue;
  return {
    counts: rootWorkQueueCounts(run.metadata.rootWorkQueue),
    status: renderRootWorkQueueStatus(queue, { lineageByActiveRunId: lineage }),
    queue,
    lineage,
  };
}

export function reportingRunSnapshot(run: TaskGraphRun): TaskGraphRun {
  const snapshot = JSON.parse(JSON.stringify(run)) as TaskGraphRun;
  refreshRunStatus(snapshot);
  return snapshot;
}

export function statusRunSnapshot(run: TaskGraphRun): TaskGraphRun {
  return reportingRunSnapshot(run);
}

function taskGraphStatusCounts(run: TaskGraphRun) {
  const byStatus = TASK_STATUSES.reduce((counts, status) => {
    counts[status] = 0;
    return counts;
  }, {} as Record<TaskStatus, number>);
  for (const task of Object.values(run.tasks)) byStatus[task.status] = (byStatus[task.status] ?? 0) + 1;
  return {
    tasks: byStatus,
    totalTasks: Object.keys(run.tasks).length,
    readyTaskCount: readyTasks(run).length,
    rootWork: rootWorkQueueCounts(run.metadata?.rootWorkQueue),
  };
}

interface TaskGraphStatusResponseDetailsOptions {
  readonly cwd?: string;
}

function autoImproveLineageStatusResponseDetails(run: TaskGraphRun, options: TaskGraphStatusResponseDetailsOptions | undefined) {
  const cwd = typeof options?.cwd === "string" && options.cwd.trim() ? options.cwd : undefined;
  if (run.mode !== "autoimprove" || !cwd) return undefined;
  return resolveAutoImproveLineageStatus(cwd, run.runId);
}

export function taskGraphStatusResponseDetails(run: TaskGraphRun, options?: TaskGraphStatusResponseDetailsOptions) {
  const snapshot = statusRunSnapshot(run);
  const autoImproveLineage = autoImproveLineageStatusResponseDetails(snapshot, options);
  return sanitizeContinueAutoImproveResponseDetails({
    runId: reportingIdForDisplay(snapshot.runId),
    mode: snapshot.mode,
    displayStatus: snapshot.status,
    counts: taskGraphStatusCounts(snapshot),
    rootWork: rootWorkResponseDetails(snapshot),
    ...(autoImproveLineage ? { autoImproveLineage } : {}),
  });
}

const RESPONSE_DETAILS_LOCAL_ABSOLUTE_PATH = /\/(?:home|Users)\/[^\s),;]+(?:\/[^\s),;]+)*/gi;
const RESPONSE_DETAILS_SAFE_TEXT_MAX_LENGTH = 500;
const RESPONSE_DETAILS_SAFE_STATUS_MAX_LENGTH = 320;

function sanitizeReadyDetailString(value: unknown, maxLength = RESPONSE_DETAILS_SAFE_TEXT_MAX_LENGTH) {
  if (typeof value !== "string") return "";
  const withLocalPathsRedacted = value.replace(RESPONSE_DETAILS_LOCAL_ABSOLUTE_PATH, "[redacted-session-path]");
  const sanitized = sanitizeContinueAutoImproveResponseDetails({ value: withLocalPathsRedacted }).value;
  const textValue = typeof sanitized === "string" ? sanitized : "";
  return textValue.length > maxLength ? `${textValue.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…` : textValue;
}

function sanitizeReadyDetailStringList(values: readonly string[] | undefined, maxLength = RESPONSE_DETAILS_SAFE_TEXT_MAX_LENGTH) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values ?? []) {
    const safe = sanitizeReadyDetailString(value, maxLength);
    if (!safe || seen.has(safe)) continue;
    seen.add(safe);
    out.push(safe);
  }
  return out;
}

function sanitizeReadyNodeDescriptor(descriptor: TaskNodeDescriptor | undefined) {
  if (!descriptor) return undefined;
  return {
    version: 1 as const,
    stableKey: sanitizeDescriptorStableKeyForDisplay(descriptor.stableKey, "task", 160) || "task",
    purpose: sanitizeReadyDetailString(descriptor.purpose) || "Execute this task graph node within its bounded scope.",
    inputs: sanitizeReadyDetailStringList(descriptor.inputs),
    outputs: sanitizeReadyDetailStringList(descriptor.outputs),
    artifacts: sanitizeReadyDetailStringList(descriptor.artifacts),
    acceptanceChecks: sanitizeReadyDetailStringList(descriptor.acceptanceChecks),
    writeScope: sanitizeReadyDetailStringList(descriptor.writeScope),
    isolationBoundary: sanitizeReadyDetailStringList(descriptor.isolationBoundary),
    order: descriptor.order,
  };
}

function sanitizeReadyTaskStatusLine(task: ReadyTask, descriptor: ReturnType<typeof sanitizeReadyNodeDescriptor>) {
  const title = sanitizeReadyDetailString(task.title, 180) || "Untitled task";
  const runnerName = sanitizeReadyDetailString(task.runner.name, 120) || "runner";
  const descriptorStatus = descriptor ? ` · [${descriptor.stableKey}] ${descriptor.purpose}` : "";
  return sanitizeReadyDetailString(`${task.kind}: ${title} via ${task.runner.kind}:${runnerName}${descriptorStatus}`, RESPONSE_DETAILS_SAFE_STATUS_MAX_LENGTH);
}

function safeReadyRunnerDetails(task: ReadyTask) {
  const conflictGroup = sanitizeReadyDetailString(task.runner.writePolicy.conflictGroup, 160);
  return {
    kind: task.runner.kind,
    name: sanitizeReadyDetailString(task.runner.name, 160) || task.runner.kind,
    sideEffects: task.runner.sideEffects,
    writePolicy: {
      declaredPathCount: task.runner.writePolicy.declaredPaths.length,
      allowOutsideDeclaredPaths: task.runner.writePolicy.allowOutsideDeclaredPaths,
      ...(conflictGroup ? { conflictGroup } : {}),
    },
  };
}

function safeReadySubagentDetails(task: ReadyTask) {
  if (!task.subagent) return undefined;
  const type = sanitizeReadyDetailString(task.subagent.type, 160);
  const skills = sanitizeReadyDetailStringList(task.subagent.skills, 160);
  return {
    ...(type ? { type } : {}),
    context: task.subagent.context ?? task.context,
    ...(skills.length ? { skills } : {}),
  };
}

function safeReadyTaskDetails(task: ReadyTask) {
  const nodeDescriptor = sanitizeReadyNodeDescriptor(task.nodeDescriptor);
  const subagent = safeReadySubagentDetails(task);
  return {
    id: sanitizeReadyDetailString(task.id, 160) || task.id,
    kind: task.kind,
    title: sanitizeReadyDetailString(task.title, 240) || "Untitled task",
    runner: safeReadyRunnerDetails(task),
    ...(subagent ? { subagent } : {}),
    context: task.context,
    blockedBy: sanitizeReadyDetailStringList(task.blockedBy, 160),
    lockLabels: sanitizeLockKeysForDisplay(task.lockKeys),
    statusLine: sanitizeReadyTaskStatusLine(task, nodeDescriptor),
    ...(nodeDescriptor ? { nodeDescriptor } : {}),
    promptSummary: { omitted: true, source: "response content" },
  };
}

export function taskGraphNextResponseDetails(run: TaskGraphRun, ready: readonly ReadyTask[]) {
  return sanitizeContinueAutoImproveResponseDetails(sanitizeProjectTaskGraphDetails({
    runId: reportingIdForDisplay(run.runId),
    readyTaskCount: ready.length,
    ready: ready.map(safeReadyTaskDetails),
  }));
}

function renderDynamicGraphPreviewList(values: readonly string[], empty = "none", maxListItems = values.length) {
  const renderedValues = maxListItems <= 0 ? [] : values.slice(0, maxListItems);
  return renderedValues.length ? renderedValues.join(", ") : empty;
}

function renderDynamicGraphPreviewLockList(values: readonly string[], empty = "none", maxListItems = values.length) {
  return renderDynamicGraphPreviewList(sanitizeLockKeysForDisplay(values), empty, maxListItems);
}

function renderDynamicGraphPreview(preview: DynamicTaskGraphPreviewResult) {
  const lines = [
    "# Dynamic Task Graph Preview",
    "",
    "Preview only: this tool does not queue tasks, persist runs, mutate rootWorkQueue/scheduler state, launch subagents, create git worktrees, or execute work.",
    `Valid: ${preview.valid ? "yes" : "no"}. Seeds: ${preview.acceptedSeedCount}/${preview.inputSeedCount} accepted${preview.cappedSeedCount ? ` (${preview.cappedSeedCount} capped)` : ""}. Limits: maxSeeds=${preview.limits.maxSeeds}, maxParallel=${preview.limits.maxParallel}, maxListItems=${preview.limits.maxListItems}.`,
  ];
  if (preview.warnings.length) {
    lines.push("", "## Warnings", ...preview.warnings.map((warning) => `- ${warning.code}: ${warning.message}`));
  }
  if (preview.errors.length) {
    lines.push("", "## Errors", ...preview.errors.map((error) => `- ${error.code}${error.stableKey ? ` (${error.stableKey})` : ""}: ${error.message}${error.cycle?.length ? ` Cycle: ${error.cycle.join(" -> ")}` : ""}`));
  }
  lines.push("", "## Ready batches");
  if (!preview.valid) lines.push("- No batches rendered because the preview has dependency errors.");
  else if (!preview.batches.length) lines.push("- No executable batches found.");
  else {
    for (const batch of preview.batches) {
      lines.push(`- Batch ${batch.index}: ${renderDynamicGraphPreviewList(batch.nodeStableKeys)}`);
      for (const held of batch.held) {
        const conflictingWriteLocks = held.conflictingWriteLocks?.length ? renderDynamicGraphPreviewList(held.conflictingWriteLocks, "", preview.limits.maxListItems) : "";
        lines.push(`  - Held ${held.stableKey}: ${held.reason}${held.conflictWith ? ` with ${held.conflictWith}` : ""}${conflictingWriteLocks ? ` (${conflictingWriteLocks})` : ""}`);
      }
    }
  }
  lines.push("", "## Nodes");
  if (!preview.nodes.length) lines.push("- none");
  for (const node of preview.nodes) {
    const title = node.title && node.title !== node.stableKey ? ` — ${node.title}` : "";
    lines.push(`- ${node.stableKey}${title}`);
    lines.push(`  - deps: ${renderDynamicGraphPreviewList([...node.dependsOn, ...node.blockedBy], "none", preview.limits.maxListItems)}`);
    lines.push(`  - write locks: ${renderDynamicGraphPreviewLockList(node.worktreeEligibility.normalizedWriteLocks, "none", preview.limits.maxListItems)}`);
    lines.push(`  - worktree: ${node.worktreeEligibility.eligible ? "eligible" : "not eligible"} (${node.worktreeEligibility.code})`);
  }
  if (preview.valid && preview.batches.length) {
    const scheduled = new Set(preview.batches.flatMap((batch) => batch.nodeStableKeys));
    const unscheduled = preview.nodes.filter((node) => !scheduled.has(node.stableKey)).map((node) => node.stableKey).sort();
    if (unscheduled.length) lines.push("", `Unscheduled nodes: ${unscheduled.join(", ")}`);
  }
  return lines.join("\n");
}

function activeExtensionRunSummary(run: TaskGraphRun | undefined) {
  if (!run) return undefined;
  let readyTaskCount: number | undefined;
  try {
    readyTaskCount = readyTasks(run).length;
  } catch {}
  const activeRootWork = run.metadata?.rootWorkQueue?.items.find((item) => item.state === "active");
  return {
    runId: reportingIdForDisplay(run.runId),
    status: run.status,
    rootWorkCounts: rootWorkQueueCounts(run.metadata?.rootWorkQueue),
    ...(typeof readyTaskCount === "number" ? { readyTaskCount } : {}),
    ...(activeRootWork ? { activeRootWorkLabel: `active ${activeRootWork.kind}: ${activeRootWork.title}` } : {}),
  };
}

function safeLoadExtensionRunSummary(ctx: Pick<ExtensionContext, "cwd"> | undefined, runId?: string) {
  if (!ctx?.cwd) return undefined;
  try {
    return activeExtensionRunSummary(loadRunNoCreate(ctx.cwd, runId));
  } catch {
    return undefined;
  }
}

function extensionSummaryUseful(summary: ReturnType<typeof activeExtensionRunSummary> | undefined) {
  if (!summary) return false;
  const counts = summary.rootWorkCounts;
  if (counts.active || counts.queued || counts.history) return true;
  if ((summary.readyTaskCount ?? 0) > 0) return true;
  return typeof summary.status === "string" && !["succeeded", "failed", "cancelled", "deleted"].includes(summary.status);
}

function matchedExtensionWorkflowIds(prompt: string | undefined, workflow: ExtensionWorkflowId | undefined, maxWorkflows = 2) {
  if (workflow) return [workflow];
  if (!prompt?.trim()) return [];
  return matchExtensionWorkflows(prompt, { maxWorkflows }).map((match) => match.descriptor.id);
}

function extensionGuideDetails(matchedWorkflowIds: readonly ExtensionWorkflowId[], activeRun: ReturnType<typeof activeExtensionRunSummary> | undefined) {
  return {
    matchedWorkflowIds,
    ...(activeRun ? {
      runId: activeRun.runId,
      status: activeRun.status,
      rootWorkCounts: activeRun.rootWorkCounts,
      readyTaskCount: activeRun.readyTaskCount,
    } : {}),
  };
}

function dogfoodPromptRider(sessionName: string, run?: TaskGraphRun, taskId?: string) {
  const taskLine = run && taskId ? `- If this prompt represents task ${taskId} from run ${run.runId}, record progress back with task_graph_update when the session is done.` : undefined;
  return `\n\n## Task graph dogfood contract\n\nThis prompt is being executed by a tmux-puppeted Pi worker (${sessionName}). Use the task graph intentionally rather than doing an ad-hoc linear implementation.\n\n- Start by creating or selecting a task graph run for the requested work with task_graph_create.\n- Use task_graph_next to choose dependency-ready work, execute bounded stages, and call task_graph_update with summaries, changed files, validation commands, and artifacts.\n- For complex or long-running work, prefer explicit plan/implement/verify/review stages over one monolithic pass.\n- Save evidence in the repo or requested orchestration directory: task graph run IDs, command outputs, and validation notes.\n${taskLine ? `${taskLine}\n` : ""}- Do not include secrets in prompts, logs, artifacts, commits, or README files.\n`;
}

function parseTaskFlowchartArgs(args: string) {
  const result: { runId?: string; format?: TaskGraphFlowchartFormat; includeDone?: boolean; maxLabelLength?: number } = {};
  for (const token of args.trim().split(/\s+/).filter(Boolean)) {
    if (token === "ascii" || token === "mermaid") result.format = token;
    else if (token === "--done" || token === "--include-done" || token === "includeDone=true") result.includeDone = true;
    else if (token === "--no-done" || token === "includeDone=false") result.includeDone = false;
    else if (/^(?:--max-label-length=|maxLabelLength=|max=)\d+$/.test(token)) result.maxLabelLength = Number(token.replace(/^[^=]+=/, ""));
    else if (!result.runId) result.runId = token;
  }
  return result;
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
  stableKey?: string;
  purpose?: string;
  inputs?: string[];
  outputs?: string[];
  artifacts?: string[];
  acceptanceCriteria?: string[];
  acceptanceChecks?: string[];
  suggestedChecks?: string[];
  expectedWritePaths?: string[];
  writeScope?: string[];
  isolationBoundary?: string[];
  descriptor?: TaskNodeDescriptorInput;
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

function descriptorFromDecompositionObject(obj: Record<string, unknown>, label: string): TaskNodeDescriptorInput | undefined {
  const descriptor = obj.descriptor === undefined ? undefined : normalizeDescriptorInput(obj.descriptor, `${label}.descriptor`);
  if (obj.stableKey !== undefined && (typeof obj.stableKey !== "string" || !obj.stableKey.trim())) throw new Error(`${label}.stableKey must be a non-empty string`);
  const stableKey = obj.stableKey === undefined ? descriptor?.stableKey : normalizeStableKey(obj.stableKey);
  const purpose = obj.purpose === undefined ? descriptor?.purpose : normalizeDescriptorText(String(obj.purpose));
  if (obj.purpose !== undefined && (typeof obj.purpose !== "string" || !purpose)) throw new Error(`${label}.purpose must be a non-empty string`);
  const list = (key: "inputs" | "outputs" | "artifacts" | "acceptanceChecks" | "writeScope" | "isolationBoundary") => obj[key] === undefined ? descriptor?.[key] : normalizeDescriptorList(Array.isArray(obj[key]) ? obj[key] as string[] : []);
  const merged: TaskNodeDescriptorInput = {
    ...(descriptor ?? {}),
    stableKey,
    purpose,
    inputs: list("inputs"),
    outputs: list("outputs"),
    artifacts: list("artifacts"),
    acceptanceChecks: list("acceptanceChecks"),
    writeScope: list("writeScope"),
    isolationBoundary: list("isolationBoundary"),
  };
  return Object.values(merged).some((value) => value !== undefined) ? merged : undefined;
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
    const descriptor = descriptorFromDecompositionObject(obj, `subtasks[${index}]`);
    const acceptanceChecks = stringArray(obj.acceptanceChecks) ?? descriptor?.acceptanceChecks ?? [];
    const expectedWritePaths = stringArray(obj.expectedWritePaths) ?? [];
    const writeScope = stringArray(obj.writeScope) ?? descriptor?.writeScope ?? expectedWritePaths;
    return {
      id,
      title,
      description: typeof obj.description === "string" && obj.description.trim() ? obj.description.trim() : title,
      priority,
      dependsOn: stringArray(obj.dependsOn) ?? [],
      stableKey: descriptor?.stableKey,
      purpose: descriptor?.purpose,
      inputs: descriptor?.inputs ? [...descriptor.inputs] : undefined,
      outputs: descriptor?.outputs ? [...descriptor.outputs] : undefined,
      artifacts: descriptor?.artifacts ? [...descriptor.artifacts] : undefined,
      acceptanceCriteria: stringArray(obj.acceptanceCriteria) ?? [],
      acceptanceChecks,
      suggestedChecks: stringArray(obj.suggestedChecks) ?? [],
      expectedWritePaths,
      writeScope,
      isolationBoundary: descriptor?.isolationBoundary ? [...descriptor.isolationBoundary] : stringArray(obj.isolationBoundary) ?? [],
      descriptor,
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

function workerBundleDir(cwd: string, runId: string, taskOrSessionId: string) {
  return path.join(cwd, ".pi", "dev-suite", "task-graph", "workers", runId, taskOrSessionId);
}

function ensureWorkerBundle(params: {
  cwd: string;
  run?: TaskGraphRun;
  task?: TaskGraphRun["tasks"][string];
  sessionName: string;
  prompt?: string;
  workerKind?: string;
}) {
  const runId = params.run?.runId ?? "ad-hoc";
  const taskId = params.task?.id ?? params.sessionName;
  const dir = workerBundleDir(params.cwd, runId, taskId);
  fs.mkdirSync(path.join(dir, "evidence"), { recursive: true });
  const basePrompt = params.prompt?.trim() || (params.run && params.task ? buildTaskPrompt(params.run, params.task) : "");
  if (!basePrompt) throw new Error("task_graph_worker_bundle requires either a taskId from a run or an explicit prompt.");
  const prompt = `${basePrompt}${dogfoodPromptRider(params.sessionName, params.run, params.task?.id)}`;
  const promptPath = path.join(dir, "prompt.md");
  const updateTemplatePath = path.join(dir, "update-template.json");
  const transcriptPath = path.join(dir, "transcript.txt");
  const provenancePath = path.join(dir, "worker-provenance.json");
  fs.writeFileSync(promptPath, prompt);
  fs.writeFileSync(updateTemplatePath, `${JSON.stringify({
    runId: params.run?.runId,
    taskId: params.task?.id,
    status: "succeeded",
    summary: "",
    changedFiles: [],
    validation: [{ command: "", cwd: undefined, exitCode: 0 }],
    worker: { kind: params.workerKind ?? "tmux-pi", tmuxSession: params.sessionName, transcriptPath },
    childRun: { cwd: "", runId: "", runFile: "" },
  }, null, 2)}\n`);
  fs.writeFileSync(provenancePath, `${JSON.stringify({
    runId: params.run?.runId,
    taskId: params.task?.id,
    workerKind: params.workerKind ?? "tmux-pi",
    tmuxSession: params.sessionName,
    cwd: params.cwd,
    promptPath,
    promptSha256: crypto.createHash("sha256").update(prompt).digest("hex"),
    createdAt: new Date().toISOString(),
  }, null, 2)}\n`);
  if (!fs.existsSync(transcriptPath)) fs.writeFileSync(transcriptPath, "");
  return { dir, promptPath, updateTemplatePath, transcriptPath, provenancePath, prompt };
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
    const descriptorStableKey = normalizeStableKey(subtask.stableKey ?? subtask.descriptor?.stableKey ?? subtask.id);
    const chain = appendStageChain(run, subtask.title, subtask.description ?? subtask.title, task.metadata.source, expansionBlockers, task.id, {
      decompositionTaskId: task.id,
      decompositionSubtaskId: subtask.id,
      decompositionStableKey: descriptorStableKey,
      decompositionDescriptor: {
        stableKey: descriptorStableKey,
        purpose: subtask.purpose ?? subtask.descriptor?.purpose ?? subtask.title,
        inputs: subtask.inputs ?? subtask.descriptor?.inputs,
        outputs: subtask.outputs ?? subtask.descriptor?.outputs,
        artifacts: subtask.artifacts ?? subtask.descriptor?.artifacts,
        acceptanceChecks: subtask.acceptanceChecks ?? subtask.descriptor?.acceptanceChecks ?? subtask.acceptanceCriteria ?? [],
        writeScope: subtask.writeScope ?? subtask.descriptor?.writeScope ?? subtask.expectedWritePaths ?? [],
        isolationBoundary: subtask.isolationBoundary ?? subtask.descriptor?.isolationBoundary,
      },
      acceptanceCriteria: subtask.acceptanceCriteria ?? [],
      acceptanceChecks: subtask.acceptanceChecks ?? [],
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

  pi.on("before_agent_start", async (event, ctx) => {
    const lower = event.prompt.toLowerCase();
    const genericTriggered = beforeAgentTaskGraphTrigger.test(lower);
    const matchedWorkflowIds = matchedExtensionWorkflowIds(event.prompt, undefined, 2);
    const activeRun = genericTriggered || matchedWorkflowIds.length ? safeLoadExtensionRunSummary(ctx) : undefined;
    const extensionAdvisory = matchedWorkflowIds.length || (genericTriggered && extensionSummaryUseful(activeRun))
      ? renderExtensionBeforeAgentAdvisory({ workflows: matchedWorkflowIds, activeRun, maxWorkflows: 2, maxRenderedChars: 2_800 })
      : "";
    if (!genericTriggered && !extensionAdvisory) return;
    const genericAdvisory = genericTriggered
      ? "<task-graph-advisory>\nFor non-trivial work, prefer the local task graph tools over ad-hoc linear TODOs: create a run with task_graph_create (pdo when design choices are open, do when the plan is obvious), use task_graph_next to obtain dependency-ready parallel-safe tasks, run executable tasks via subagents by default, then record outcomes with task_graph_update. Treat commit/push and TODO.org mutations as explicit approvals. This advisory is internal.\n</task-graph-advisory>"
      : "";
    return {
      systemPrompt: [
        event.systemPrompt,
        genericAdvisory,
        extensionAdvisory ? `<task-graph-extension-advisory>\n${extensionAdvisory}\n</task-graph-extension-advisory>` : "",
      ].filter(Boolean).join("\n\n"),
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

  pi.registerCommand("task-ui", {
    description: "Open the interactive full-window task graph UI",
    handler: async (_args, ctx) => openTaskGraphUi(ctx, updateUi),
  });

  pi.registerCommand("task-flowchart", {
    description: "Show the current or selected task graph as deterministic ASCII or Mermaid dependency edges",
    getArgumentCompletions: (prefix) => {
      const items = ["ascii", "mermaid", "--done", "--include-done", "--max-label-length=80"];
      const filtered = items.filter((item) => item.startsWith(prefix));
      return filtered.length ? filtered.map((item) => ({ value: item, label: item })) : null;
    },
    handler: async (args, ctx) => {
      const parsed = parseTaskFlowchartArgs(args);
      const run = loadRunNoCreate(ctx.cwd, parsed.runId);
      if (!run) {
        ctx.ui.notify(parsed.runId ? `No task graph run found: ${reportingIdForDisplay(parsed.runId)}` : "No current task graph run found.", "warning");
        return;
      }
      const displayRun = reportingRunSnapshot(run);
      ctx.ui.notify(renderTaskGraphFlowchart(displayRun, { format: parsed.format, includeDone: parsed.includeDone, maxLabelLength: parsed.maxLabelLength }), "info");
      updateUi(ctx, displayRun);
    },
  });

  pi.registerCommand("task-graphs", {
    description: "List built-in/project-local task graph templates; use 'manage' to enable/disable",
    getArgumentCompletions: (prefix) => {
      const items = ["manage", "interactive"];
      const filtered = items.filter((item) => item.startsWith(prefix));
      return filtered.length ? filtered.map((item) => ({ value: item, label: item })) : null;
    },
    handler: async (args, ctx) => {
      const trimmed = args.trim();
      if (trimmed === "manage" || trimmed === "interactive") return openTaskGraphsManager(ctx);
      const settingsPath = trimmed || undefined;
      const settingsInfo = loadProjectSettings(ctx.cwd, { settingsPath });
      ctx.ui.notify(renderProjectTaskGraphTemplates(settingsInfo), settingsInfo.loaded ? "info" : "warning");
    },
  });

  pi.registerCommand("task-graphs-manage", {
    description: "Interactively enable or disable task graph templates",
    handler: async (_args, ctx) => openTaskGraphsManager(ctx),
  });

  pi.registerShortcut("ctrl+alt+g", {
    description: "Open task graph UI",
    handler: async (ctx) => openTaskGraphUi(ctx, updateUi),
  });

  pi.registerTool({
    name: "task_graph_create",
    label: "Create Task Graph",
    description: "Create a durable dependency-aware task/pipeline run. Use pdo/fulcrum for feature work with design choices, do for obvious implementation, todo/todo-strict for TODO.org, ticketdo for ticket-driven work, and autoimprove for testable iterative goals that also produce a reusable skill. Complex/uncertain inputs may schedule ORACLE_CONSULT and DECOMPOSE gates before implementation. Executable tasks are intended to run through subagents by default.",
    promptSnippet: "task_graph_create: create a durable dependent task pipeline for non-trivial work; complex inputs may add Oracle/decomposition gates; follow with task_graph_next and task_graph_update.",
    promptGuidelines: [
      "For non-trivial coding work, create or use a task graph instead of free-form TODOs.",
      "Use pdo/fulcrum when design decisions are open; use do when the plan is obvious; use autoimprove when success is objectively testable and the deliverables include both the result and a skill.",
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
        ignoreProjectSettings: Type.Optional(Type.Boolean()),
        settingsPath: Type.Optional(Type.String()),
        customGraph: Type.Optional(Type.String()),
      })),
    }),
    async execute(_toolCallId, params: { mode: RunMode; input: string; options?: TaskGraphOptions }, _signal, _onUpdate, ctx) {
      const options = params.options ?? {};
      const settingsInfo = loadProjectSettings(ctx.cwd, { ignoreProjectSettings: options.ignoreProjectSettings, settingsPath: options.settingsPath });
      const runOptions = { ...options };
      if (params.mode === "custom") {
        if (isBuiltInGraphDisabled(settingsInfo, "custom")) throw new Error("Task graph mode custom is disabled by task graph settings.");
        runOptions.customGraph = options.customGraph ?? settingsInfo.settings?.defaultGraph;
        if (!runOptions.customGraph) throw new Error("Task graph mode custom requires options.customGraph or settings.defaultGraph.");
        if (isProjectCustomGraphDisabled(settingsInfo, runOptions.customGraph)) throw new Error(`Custom task graph ${runOptions.customGraph} is disabled by task graph settings.`);
      } else if (isBuiltInGraphDisabled(settingsInfo, params.mode)) {
        throw new Error(`Task graph mode ${params.mode} is disabled by task graph settings.`);
      }
      const { settings, ...persistedSettingsInfo } = settingsInfo;
      const run = createRun(ctx.cwd, params.mode, params.input, runOptions, await gitBaseline(pi, ctx), settings, persistedSettingsInfo);
      refreshRunStatus(run);
      saveRun(run);
      appendEvent(run, { type: "run_created", mode: params.mode, options: runOptions, settings: persistedSettingsInfo });
      if (settingsInfo.loaded) appendEvent(run, { type: "settings_loaded", path: settingsInfo.path, graphNames: settingsInfo.graphNames ?? [] });
      updateUi(ctx, run);
      return text(`${renderStatus(run)}\n\nNext: call task_graph_next to obtain ready work.`, { runId: reportingIdForDisplay(run.runId), file: runFileForDisplay(run.runId), settings: persistedSettingsInfo });
    },
  });

  pi.registerTool({
    name: "task_graph_settings",
    label: "Inspect Task Graph Settings",
    description: "Validate and show packaged presets plus global/project-local task graph settings without creating a run. Global settings are read from ~/.pi/dev-suite/task-graph/settings.json or PI_TASK_GRAPH_GLOBAL_SETTINGS; project settings are read from .pi/dev-suite/task-graph/settings.json, then .pi/task-graph.json, unless a path is provided.",
    parameters: Type.Object({ path: Type.Optional(Type.String()), ignoreProjectSettings: Type.Optional(Type.Boolean()) }),
    async execute(_toolCallId, params: { path?: string; ignoreProjectSettings?: boolean }, _signal, _onUpdate, ctx) {
      const settingsInfo = loadProjectSettings(ctx.cwd, { settingsPath: params.path, ignoreProjectSettings: params.ignoreProjectSettings });
      const detailsSettings = sanitizeProjectTaskGraphSettingsInfoForDetails(settingsInfo);
      if (!settingsInfo.loaded) return text(renderProjectTaskGraphTemplates(settingsInfo), { settings: detailsSettings });
      const lines = [
        renderProjectTaskGraphTemplates(settingsInfo),
        "",
        `Agent instruction selectors: ${Object.keys(settingsInfo.settings?.agentInstructions ?? {}).join(", ") || "none"}`,
        `Routing overrides: ${Object.keys(settingsInfo.settings?.routing?.failureRoutes ?? {}).join(", ") || "none"}`,
      ];
      return text(lines.join("\n"), { settings: detailsSettings });
    },
  });

  pi.registerTool({
    name: "task_graph_extension_guide",
    label: "Task Graph Extension Guide",
    description: "Read-only guide for routing Pi extension workflows through task graph evidence. Optionally pass a workflow id, a prompt for conservative workflow matching, and/or a run id for sanitized active-run summary/counts. This tool never mutates runs or calls executable extension tools.",
    promptSnippet: "task_graph_extension_guide: read-only evidence guide for task graph extension workflows; optional workflow/prompt/runId; never mutates runs.",
    promptGuidelines: [
      "Use this when extension-specific workflows such as changed-file evidence, notes, HTTP/API checks, tmux workers, or image/ComfyUI artifacts should be tied back to task_graph_update evidence.",
      "The guide is read-only: it does not save runs, append events, write artifacts, continue autoimprove loops, or execute extension tools.",
      "Do not include secrets in prompt or evidence summaries; details expose only matchedWorkflowIds and sanitized active-run counts.",
    ],
    parameters: Type.Object({
      workflow: Type.Optional(Type.Union(extensionWorkflowLiterals)),
      prompt: Type.Optional(Type.String()),
      runId: Type.Optional(Type.String()),
    }),
    async execute(_toolCallId, params: { workflow?: ExtensionWorkflowId; prompt?: string; runId?: string }, _signal, _onUpdate, ctx) {
      const matchedWorkflowIds = matchedExtensionWorkflowIds(params.prompt, params.workflow, params.workflow ? 1 : 2);
      const activeRun = safeLoadExtensionRunSummary(ctx, params.runId);
      const noGuideSelectors = !params.workflow && !params.prompt?.trim();
      const guide = noGuideSelectors
        ? renderExtensionWorkflowGuide({ activeRun, includeOverview: true, maxWorkflows: 0, maxRenderedChars: 2_600 })
        : renderExtensionWorkflowGuide({
          workflow: params.workflow,
          workflows: params.workflow || !matchedWorkflowIds.length ? undefined : matchedWorkflowIds,
          prompt: params.workflow || matchedWorkflowIds.length ? undefined : params.prompt,
          activeRun,
          maxWorkflows: params.workflow ? 1 : 2,
          includeOverview: false,
          maxRenderedChars: 4_000,
        });
      return text(guide, extensionGuideDetails(matchedWorkflowIds, activeRun));
    },
  });

  pi.registerTool({
    name: "task_graph_dynamic_preview",
    label: "Preview Dynamic Task Graph",
    description: "Read-only preview for agent-proposed dynamic task graph seeds. Normalizes public seed fields, validates explicit dependencies, detects cycles, computes deterministic ready batches with write-scope conflict serialization, and annotates advisory worktree eligibility. This tool never queues, persists, mutates runs/rootWorkQueue/scheduler state, launches work, or creates worktrees.",
    promptSnippet: "task_graph_dynamic_preview: bounded read-only preview for agent-proposed dynamic graph seeds; never queues, persists, mutates, launches subagents, or creates worktrees.",
    promptGuidelines: [
      "Use only as a planning aid before materializing work in a real task graph.",
      "Pass non-secret public seed fields only; prompt-like/private/secret-shaped lines are stripped from preview output.",
      "Do not treat preview batches as queued or executable work. Use task_graph_create/add/update tools explicitly for durable work.",
    ],
    parameters: Type.Object({
      seeds: Type.Array(dynamicTaskGraphSeedSchema),
      maxSeeds: Type.Optional(Type.Number()),
      maxListItems: Type.Optional(Type.Number()),
      maxTextLength: Type.Optional(Type.Number()),
      maxParallel: Type.Optional(Type.Number()),
    }),
    async execute(_toolCallId, params: { seeds: DynamicTaskGraphSeed[] } & PreviewDynamicTaskGraphOptions) {
      const preview = previewDynamicTaskGraph(params.seeds, {
        maxSeeds: params.maxSeeds,
        maxListItems: params.maxListItems,
        maxTextLength: params.maxTextLength,
        maxParallel: params.maxParallel,
      });
      return text(renderDynamicGraphPreview(preview), { preview });
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
      return text(renderReadyInstructions(run), taskGraphNextResponseDetails(run, ready));
    },
  });

  pi.registerTool({
    name: "task_graph_continue_autoimprove",
    label: "Continue Autoimprove Loop",
    description: "Create exactly one successor autoimprove run from a terminal previous autoimprove run. The new run is linked to the previous run, includes a continuation-context artifact, and forces an ORACLE_CONSULT gate before implementation. It can also persist a generalized rootWorkQueue of queued future root work; only autoimprove-loop items are materializable in this slice. Dry-run previews do not persist a run.",
    promptSnippet: "task_graph_continue_autoimprove: continue a completed autoimprove run with a linked next run and mandatory Oracle gate; pass futureWork/rootWorkSelection for queued successor work; use dryRun first for previews.",
    promptGuidelines: [
      "Use this when the user asks to keep autoimproving in a loop or to carry forward queued future/root work.",
      "Create only one successor per call; do not execute the successor automatically and do not recursively drain the queue.",
      "Pass futureWork to durably track queued successor/root work. Use rootWorkSelection:{mode:'first-executable'} or omit objective to materialize the first queued autoimprove-loop item.",
      "If objective is explicitly supplied and rootWorkSelection is omitted, queued root work is carried forward but not consumed.",
      "Non-autoimprove root work kinds (task, custom-graph, research, deep-research, manual) are displayed and carried forward, not executed by this version.",
      "Use dryRun:true for previews and allowDirtyWorktree:true only when preserving existing dirty files is intentional.",
      "For legacy pre-metadata loops, pass lineageAdoption with rootRunId and previousRunIteration; use forceNew only when intentionally previewing/creating another successor from an already-linked run.",
    ],
    parameters: Type.Object({
      previousRunId: Type.Optional(Type.String()),
      objective: Type.Optional(Type.String()),
      oracleQuestion: Type.Optional(Type.String()),
      evidencePaths: Type.Optional(Type.Array(Type.String())),
      maxContextBytes: Type.Optional(Type.Number()),
      maxIterations: Type.Optional(Type.Number()),
      allowDirtyWorktree: Type.Optional(Type.Boolean()),
      allowIncomplete: Type.Optional(Type.Boolean()),
      forceNew: Type.Optional(Type.Boolean()),
      dryRun: Type.Optional(Type.Boolean()),
      futureWork: Type.Optional(Type.Array(rootWorkSeedSchema)),
      futureLoops: Type.Optional(Type.Array(futureLoopSeedSchema)),
      rootWorkSelection: Type.Optional(rootWorkSelectionSchema),
      lineageAdoption: Type.Optional(Type.Object({
        rootRunId: Type.String(),
        previousRunIteration: Type.Number(),
        loopId: Type.Optional(Type.String()),
        overrideExistingMetadata: Type.Optional(Type.Boolean()),
        reason: Type.Optional(Type.String()),
      })),
      options: Type.Optional(Type.Object({ maxParallel: Type.Optional(Type.Number()), ignoreProjectSettings: Type.Optional(Type.Boolean()), settingsPath: Type.Optional(Type.String()) })),
    }),
    async execute(_toolCallId, params: {
      previousRunId?: string;
      objective?: string;
      oracleQuestion?: string;
      evidencePaths?: string[];
      maxContextBytes?: number;
      maxIterations?: number;
      allowDirtyWorktree?: boolean;
      allowIncomplete?: boolean;
      forceNew?: boolean;
      dryRun?: boolean;
      lineageAdoption?: { rootRunId: string; previousRunIteration: number; loopId?: string; overrideExistingMetadata?: boolean; reason?: string };
      futureWork?: RootWorkSeed[];
      futureLoops?: RootWorkSeed[];
      rootWorkSelection?: RootWorkSelection;
      options?: { maxParallel?: number; ignoreProjectSettings?: boolean; settingsPath?: string };
    }, _signal, _onUpdate, ctx) {
      const previous = requireRun(ctx, params.previousRunId);
      const settingsInfo = loadProjectSettings(ctx.cwd, { ignoreProjectSettings: params.options?.ignoreProjectSettings, settingsPath: params.options?.settingsPath });
      if (isBuiltInGraphDisabled(settingsInfo, "autoimprove")) throw new Error("Task graph mode autoimprove is disabled by task graph settings.");
      const { settings: _omittedSettings, ...persistedSettingsInfo } = sanitizeProjectTaskGraphSettingsInfoForDetails(settingsInfo);
      const baseline = await gitBaseline(pi, ctx);
      const result = continueAutoImproveRun({
        previous,
        params: { ...params, options: params.options },
        gitBaseline: baseline,
        projectSettings: settingsInfo.settings,
        projectSettingsInfo: persistedSettingsInfo,
      });
      if (result.existingNextRunId) {
        const existingRun = loadRun(ctx.cwd, result.existingNextRunId);
        const previousDisplayRunId = reportingIdForDisplay(previous.runId);
        const existingDisplayRunId = reportingIdForDisplay(result.existingNextRunId);
        return text(`Autoimprove run ${previousDisplayRunId} already continues to ${existingDisplayRunId}.${lineageResponseSuffix(result.lineage)}${rootWorkResponseSuffix(result.previousRun.metadata)}`, sanitizeContinueAutoImproveResponseDetails({
          previousRunId: previousDisplayRunId,
          nextRunId: existingDisplayRunId,
          dryRun: params.dryRun === true,
          lineage: result.lineage,
          lineageSource: result.lineage.lineageSource,
          lineageWarnings: result.lineage.lineageWarnings ?? [],
          rootWorkSelection: result.rootWorkSelectionResult,
          rootWork: rootWorkResponseDetails(result.previousRun),
          run: existingRun,
        }));
      }
      if (!result.nextRun) {
        if (!params.dryRun) {
          appendEvent(result.previousRun, { type: "root_work_queue_updated", summary: result.noNextReason, rootWorkSelection: result.rootWorkSelectionResult });
          saveRun(result.previousRun);
          updateUi(ctx, result.previousRun);
        }
        const dryNote = params.dryRun ? " No run was saved." : " No successor was created.";
        return text(`${result.noNextReason ?? "No autoimprove successor was created."}${rootWorkResponseSuffix(result.previousRun.metadata)}${dryNote}`, sanitizeContinueAutoImproveResponseDetails({
          previousRunId: reportingIdForDisplay(previous.runId),
          dryRun: params.dryRun === true,
          lineage: result.lineage,
          lineageSource: result.lineage.lineageSource,
          lineageWarnings: result.lineage.lineageWarnings ?? [],
          rootWorkSelection: result.rootWorkSelectionResult,
          rootWork: rootWorkResponseDetails(result.previousRun),
          contextMarkdown: params.dryRun ? result.contextMarkdown : undefined,
        }));
      }
      if (!params.dryRun) {
        appendEvent(result.previousRun, { type: "autoimprove_continued", nextRunId: result.nextRun.runId, iteration: result.lineage.iteration, rootWorkSelection: result.rootWorkSelectionResult });
        appendEvent(result.nextRun, { type: "autoimprove_continuation_created", previousRunId: previous.runId, iteration: result.lineage.iteration, rootWorkSelection: result.rootWorkSelectionResult });
        saveRun(result.previousRun);
        saveRun(result.nextRun);
        updateUi(ctx, result.nextRun);
      }
      const rootWorkSuffix = rootWorkResponseSuffix(result.nextRun.metadata);
      const previousDisplayRunId = reportingIdForDisplay(previous.runId);
      const nextDisplayRunId = reportingIdForDisplay(result.nextRun.runId);
      const message = params.dryRun
        ? `Dry-run continuation preview: ${previousDisplayRunId} -> ${nextDisplayRunId} (iteration ${result.lineage.iteration}). Oracle gate required: ${result.lineage.oracleRequired ? "yes" : "no"}.${lineageResponseSuffix(result.lineage)}${rootWorkSuffix} No run was saved.`
        : `Created autoimprove continuation: ${previousDisplayRunId} -> ${nextDisplayRunId} (iteration ${result.lineage.iteration}). Oracle gate required: ${result.lineage.oracleRequired ? "yes" : "no"}.${lineageResponseSuffix(result.lineage)}${rootWorkSuffix} Next step: task_graph_next.`;
      return text(message, sanitizeContinueAutoImproveResponseDetails({
        previousRunId: previousDisplayRunId,
        nextRunId: nextDisplayRunId,
        dryRun: params.dryRun === true,
        lineage: result.lineage,
        lineageSource: result.lineage.lineageSource,
        lineageWarnings: result.lineage.lineageWarnings ?? [],
        rootWorkSelection: result.rootWorkSelectionResult,
        rootWork: rootWorkResponseDetails(result.nextRun),
        previousRootWork: rootWorkResponseDetails(result.previousRun),
        contextMarkdown: params.dryRun ? result.contextMarkdown : undefined,
        nextRun: result.nextRun,
      }));
    },
  });

  pi.registerTool({
    name: "task_graph_worker_bundle",
    label: "Create Task Graph Worker Bundle",
    description: "Write a prompt/evidence bundle for an external worker such as a tmux-puppeted Pi session. The bundle includes prompt.md, update-template.json, transcript.txt, and worker-provenance.json.",
    parameters: Type.Object({
      runId: Type.Optional(Type.String()),
      taskId: Type.Optional(Type.String()),
      sessionName: Type.Optional(Type.String()),
      cwd: Type.Optional(Type.String()),
      prompt: Type.Optional(Type.String()),
      workerKind: Type.Optional(Type.String()),
    }),
    async execute(_toolCallId, params: { runId?: string; taskId?: string; sessionName?: string; cwd?: string; prompt?: string; workerKind?: string }, _signal, _onUpdate, ctx) {
      const run = params.runId || params.taskId ? requireRun(ctx, params.runId) : undefined;
      const task = run && params.taskId ? run.tasks[aliasTaskId(run, params.taskId) ?? params.taskId] : undefined;
      if (params.taskId && !task) throw new Error(`Unknown task id: ${params.taskId}`);
      const sessionName = safeTmuxSessionName(params.sessionName, task ? `tg-${task.id}` : "tg-worker");
      const cwd = path.resolve(ctx.cwd, params.cwd ?? ctx.cwd);
      const bundle = ensureWorkerBundle({ cwd: ctx.cwd, run, task, sessionName, prompt: params.prompt, workerKind: params.workerKind });
      return text(`Worker bundle ready: ${bundle.dir}\nPrompt: ${bundle.promptPath}\nTranscript: ${bundle.transcriptPath}`, { runId: optionalReportingIdForDisplay(run?.runId), taskId: task?.id, sessionName, cwd, bundle });
    },
  });

  pi.registerTool({
    name: "task_graph_spawn_tmux_worker",
    label: "Spawn tmux Pi Worker",
    description: "Create a worker bundle, launch a tmux session running Pi, enable transcript logging, paste the worker prompt, and return capture/attach commands. Use for dogfooding task graph work in external Pi sessions.",
    promptGuidelines: [
      "Use this when project code must be written by a separate tmux-puppeted Pi worker.",
      "Pass an explicit non-secret prompt or a taskId; review transcript logs before treating the worker as successful.",
      "The spawned worker should create/use its own task graph and report child run IDs and validation evidence.",
    ],
    parameters: Type.Object({
      runId: Type.Optional(Type.String()),
      taskId: Type.Optional(Type.String()),
      sessionName: Type.Optional(Type.String()),
      cwd: Type.Optional(Type.String()),
      prompt: Type.Optional(Type.String()),
      command: Type.Optional(Type.String()),
      waitMs: Type.Optional(Type.Number()),
    }),
    async execute(_toolCallId, params: { runId?: string; taskId?: string; sessionName?: string; cwd?: string; prompt?: string; command?: string; waitMs?: number }, _signal, _onUpdate, ctx) {
      const run = params.runId || params.taskId ? requireRun(ctx, params.runId) : undefined;
      const task = run && params.taskId ? run.tasks[aliasTaskId(run, params.taskId) ?? params.taskId] : undefined;
      if (params.taskId && !task) throw new Error(`Unknown task id: ${params.taskId}`);
      const sessionName = safeTmuxSessionName(params.sessionName, task ? `tg-${task.id}` : "tg-worker");
      const workerCwd = path.resolve(ctx.cwd, params.cwd ?? ctx.cwd);
      fs.mkdirSync(workerCwd, { recursive: true });
      const bundle = ensureWorkerBundle({ cwd: ctx.cwd, run, task, sessionName, prompt: params.prompt, workerKind: "tmux-pi" });
      const command = params.command?.trim() || "pi";
      await pi.exec("tmux", ["new-session", "-d", "-s", sessionName, "-c", workerCwd, command], { cwd: workerCwd, timeout: 10000 });
      await pi.exec("tmux", ["pipe-pane", "-o", "-t", sessionName, `cat >> ${shellQuote(bundle.transcriptPath)}`], { cwd: workerCwd, timeout: 10000 });
      const waitMs = Math.max(0, Math.min(30000, params.waitMs ?? 3500));
      if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
      const bufferName = `${sessionName}-prompt`;
      await pi.exec("tmux", ["load-buffer", "-b", bufferName, bundle.promptPath], { cwd: workerCwd, timeout: 10000 });
      await pi.exec("tmux", ["paste-buffer", "-b", bufferName, "-t", sessionName], { cwd: workerCwd, timeout: 10000 });
      await pi.exec("tmux", ["send-keys", "-t", sessionName, "Enter"], { cwd: workerCwd, timeout: 10000 });
      const pane = await pi.exec("tmux", ["display-message", "-p", "-t", sessionName, "#{pane_id}"], { cwd: workerCwd, timeout: 10000 });
      if (task) {
        task.metadata.worker = { kind: "tmux-pi", tmuxSession: sessionName, paneId: pane.stdout.trim(), transcriptPath: bundle.transcriptPath };
        task.updatedAt = new Date().toISOString();
        appendEvent(run!, { type: "tmux_worker_spawned", taskId: task.id, sessionName, cwd: workerCwd, transcriptPath: bundle.transcriptPath });
        refreshRunStatus(run!);
        saveRun(run!);
        updateUi(ctx, run);
      }
      const attach = `tmux attach -t ${shellQuote(sessionName)}`;
      const capture = `tmux capture-pane -pt ${shellQuote(sessionName)} -S -2000`;
      return text(`Spawned tmux Pi worker ${sessionName}\nCWD: ${workerCwd}\nPrompt: ${bundle.promptPath}\nTranscript: ${bundle.transcriptPath}\nAttach: ${attach}\nCapture: ${capture}`, { runId: optionalReportingIdForDisplay(run?.runId), taskId: task?.id, sessionName, paneId: pane.stdout.trim(), cwd: workerCwd, bundle, attach, capture });
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
      artifacts: Type.Optional(Type.Array(Type.Object({ type: Type.String(), filename: Type.String(), content: Type.String(), summary: Type.Optional(Type.String()) }))),
      validation: Type.Optional(Type.Array(Type.Object({ command: Type.String(), cwd: Type.Optional(Type.String()), exitCode: Type.Number(), stdoutTail: Type.Optional(Type.String()), stderrTail: Type.Optional(Type.String()), durationMs: Type.Optional(Type.Number()) }))),
      worker: Type.Optional(Type.Object({ kind: Type.Union([Type.Literal("tmux-pi"), Type.Literal("subagent"), Type.Literal("direct")]), workerId: Type.Optional(Type.String()), tmuxSession: Type.Optional(Type.String()), paneId: Type.Optional(Type.String()), transcriptPath: Type.Optional(Type.String()) })),
      childRun: Type.Optional(Type.Object({ cwd: Type.String(), runId: Type.String(), runFile: Type.Optional(Type.String()) })),
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
      artifacts?: Array<{ type: string; filename: string; content: string; summary?: string }>;
      validation?: Array<{ command: string; cwd?: string; exitCode: number; stdoutTail?: string; stderrTail?: string; durationMs?: number }>;
      worker?: { kind: "tmux-pi" | "subagent" | "direct"; workerId?: string; tmuxSession?: string; paneId?: string; transcriptPath?: string };
      childRun?: { cwd: string; runId: string; runFile?: string };
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
      if (params.validation) task.metadata.validationEvidence = params.validation;
      if (params.worker) task.metadata.worker = params.worker;
      if (params.childRun) {
        task.metadata.childRun = params.childRun;
        task.metadata.childRunIds = [...new Set([...(task.metadata.childRunIds ?? []), params.childRun.runId])];
      }
      if (params.awaitingInput) {
        task.metadata.awaitingInput = params.awaitingInput;
        task.status = "awaiting_input";
      }
      const writtenArtifacts = [
        ...(params.artifact ? [params.artifact] : []),
        ...(params.artifacts ?? []),
      ].map((artifact) => writeArtifact(run, id, artifact.type, artifact.filename, artifact.content, artifact.summary));
      if (writtenArtifacts.length) task.artifacts.push(...writtenArtifacts);
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
        const decompositionArtifact = [params.artifact, ...(params.artifacts ?? [])].find((artifact) => artifact && (artifact.filename === "decomposition.json" || artifact.type === "decomposition"));
        if (params.status === "succeeded" && task.kind === "DECOMPOSE" && decompositionArtifact) {
          autoExpansion = expandDecompositionIntoChains(run, task, decompositionArtifact.content);
          if (!autoExpansion.alreadyExpanded) appendEvent(run, { type: "decomposition_expanded", taskId: id, auto: true, expandedTaskIds: autoExpansion.expandedTaskIds, supersededTaskIds: autoExpansion.supersededTaskIds, subtaskCount: autoExpansion.subtasks.length });
        }
      } else {
        task.updatedAt = new Date().toISOString();
        appendEvent(run, { type: "task_patched", taskId: id });
      }
      refreshRunStatus(run);
      saveRun(run);
      updateUi(ctx, run);
      return text(renderStatus(run), { runId: reportingIdForDisplay(run.runId), taskId: id, task, autoExpansion });
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
        return text(`Decomposition task ${id} was already expanded at ${task.metadata.decomposition?.expandedAt}.`, { runId: reportingIdForDisplay(run.runId), taskId: id, expandedTaskIds: expansion.expandedTaskIds });
      }
      refreshRunStatus(run);
      saveRun(run);
      appendEvent(run, { type: "decomposition_expanded", taskId: id, expandedTaskIds: expansion.expandedTaskIds, supersededTaskIds: expansion.supersededTaskIds, subtaskCount: expansion.subtasks.length });
      updateUi(ctx, run);
      return text(renderStatus(run, { expanded: true }), { runId: reportingIdForDisplay(run.runId), taskId: id, expandedTaskIds: expansion.expandedTaskIds, supersededTaskIds: expansion.supersededTaskIds, subtasks: expansion.subtasks });
    },
  });

  pi.registerTool({
    name: "task_graph_flowchart",
    label: "Task Graph Flowchart",
    description: "Render the current or selected task graph as deterministic ASCII or Mermaid dependency edges. Output is sanitized for display and omits worker/project prompt instruction fields.",
    parameters: Type.Object({
      runId: Type.Optional(Type.String()),
      format: Type.Optional(Type.Union(flowchartFormatLiterals)),
      includeDone: Type.Optional(Type.Boolean()),
      maxLabelLength: Type.Optional(Type.Number()),
    }),
    async execute(_toolCallId, params: { runId?: string; format?: TaskGraphFlowchartFormat; includeDone?: boolean; maxLabelLength?: number }, _signal, _onUpdate, ctx) {
      const run = requireExistingRun(ctx, params.runId);
      const displayRun = reportingRunSnapshot(run);
      updateUi(ctx, displayRun);
      const output = renderTaskGraphFlowchart(displayRun, { format: params.format, includeDone: params.includeDone, maxLabelLength: params.maxLabelLength });
      return text(output, { runId: reportingIdForDisplay(displayRun.runId), format: params.format ?? "ascii", includeDone: params.includeDone ?? false, maxLabelLength: params.maxLabelLength });
    },
  });

  pi.registerTool({
    name: "task_graph_status",
    label: "Task Graph Status",
    description: "Show the current or selected task graph run, including counts, ready tasks, dependencies, and runner assignments.",
    parameters: Type.Object({ runId: Type.Optional(Type.String()), expanded: Type.Optional(Type.Boolean()), limit: Type.Optional(Type.Number()) }),
    async execute(_toolCallId, params: { runId?: string; expanded?: boolean; limit?: number }, _signal, _onUpdate, ctx) {
      const run = requireExistingRun(ctx, params.runId);
      const displayRun = statusRunSnapshot(run);
      updateUi(ctx, displayRun);
      return text(renderStatus(displayRun, { expanded: params.expanded, limit: params.limit }), taskGraphStatusResponseDetails(displayRun, { cwd: ctx.cwd }));
    },
  });

  pi.registerTool({
    name: "task_graph_list_runs",
    label: "List Task Graph Runs",
    description: "List recent durable task graph runs in the current project.",
    parameters: Type.Object({ limit: Type.Optional(Type.Number()) }),
    async execute(_toolCallId, params: { limit?: number }, _signal, _onUpdate, ctx) {
      const runs = listRuns(ctx.cwd, params.limit ?? 20);
      const lines = runs.map((run) => `${reportingIdForDisplay(run.runId)}\t${run.mode}\t${run.status}\t${run.updatedAt}\t${Object.keys(run.tasks).length} tasks`);
      return text(lines.join("\n") || "No task graph runs found.", { runs: runs.map((run) => ({ runId: reportingIdForDisplay(run.runId), mode: run.mode, status: run.status })) });
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
      return text(renderStatus(run), { runId: reportingIdForDisplay(run.runId), approval: params });
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
      return text(renderStatus(run), { runId: reportingIdForDisplay(run.runId), taskId: task.id, task });
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
