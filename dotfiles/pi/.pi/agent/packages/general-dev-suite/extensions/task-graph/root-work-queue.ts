import type {
  RootWorkHistoryItem,
  RootWorkHistoryState,
  RootWorkInput,
  RootWorkItem,
  RootWorkKind,
  RootWorkQueue,
  RootWorkRequestedBy,
  RootWorkSeed,
  RootWorkSelection,
  RootWorkState,
} from "./schema";
import { GENERIC_MARKDOWN_EVIDENCE_LABEL, containsCompactSecretishKeyIdentifierText, isCompactSecretishKeyIdentifier, isSecretishLineageEvidenceText, redactCompactSecretishKeyIdentifiersInText, sanitizeRootWorkDisplayText, sanitizeRootWorkLineageRunIdForDisplay, sanitizeRootWorkLineageWarningForDisplay, type RootWorkLineageDisplay, type RootWorkLineageRenderOptions, type RootWorkLineageSuccessor } from "./root-work-lineage";
import { ROOT_WORK_KINDS } from "./schema";
import { normalizeStableKey } from "./descriptors";

export const ROOT_WORK_QUEUE_VERSION = 1 as const;
export const ROOT_WORK_HISTORY_LIMIT = 50;
export const EXECUTABLE_ROOT_WORK_KINDS: ReadonlySet<RootWorkKind> = new Set(["autoimprove-loop"]);

const ROOT_WORK_KIND_SET: ReadonlySet<string> = new Set(ROOT_WORK_KINDS);
const ROOT_WORK_STATES: ReadonlySet<string> = new Set(["queued", "active"]);
const ROOT_WORK_HISTORY_STATES: ReadonlySet<string> = new Set(["created", "completed", "skipped", "cancelled"]);
const REQUESTED_BY: ReadonlySet<string> = new Set(["user", "oracle", "agent", "system"]);
const PROMPT_OR_SECRET_LINE = /\b(?:promptInstructions|projectPromptInstructions|readyPrompt|workerPrompt|systemPrompt|hiddenPrompt|promptTemplate)\b|^\s*(?:system|developer|assistant)\s*:|\b(?:token|secret|password|passwd|api[\s._-]*key|authorization|cookie|private[\s._-]*key)\b\s*[:=]/i;
const PROMPT_OR_SECRET_KEY = /^(?:promptInstructions|projectPromptInstructions|readyPrompt|workerPrompt|systemPrompt|hiddenPrompt|promptTemplate|token|secret|password|passwd|api[\s._-]*key|authorization|cookie|private[\s._-]*key)$/i;
const ABSOLUTE_SESSION_PATH = /\/(?:home|Users)\/[^\s)]+\/[^\s)]*sessions?[^\s)]*/gi;
const ROOT_WORK_COMPLETION_CLAIM = /\b(?:root work completed|root work reconciled|reconciled root work|lineage reconciled)\b/i;
const LINEAGE_DECISIONS: ReadonlySet<string> = new Set(["COMPLETE", "NOT COMPLETE", "PENDING", "CONTINUE"]);
const REDACTED_LINEAGE_EVIDENCE_COMPONENT = "[redacted-evidence-component]";

export interface NormalizeRootWorkQueueOptions {
  readonly originRunId?: string;
  readonly seeds?: readonly RootWorkSeed[];
  readonly completedRunId?: string;
  readonly completedAt?: string;
}

export type RootWorkSelectionStatus = "none" | "selected" | "no-executable" | "missing" | "not-queued" | "non-executable";

export interface RootWorkSelectionResult {
  readonly mode: RootWorkSelection["mode"];
  readonly status: RootWorkSelectionStatus;
  readonly selectedKey?: string;
  readonly item?: RootWorkItem;
  readonly message: string;
}

export interface RootWorkCounts {
  readonly active: number;
  readonly queued: number;
  readonly queuedExecutable: number;
  readonly queuedNonExecutable: number;
  readonly created: number;
  readonly completed: number;
  readonly history: number;
}

export type RootWorkDisplayOptions = RootWorkLineageRenderOptions;

export interface RootWorkDisplayLineageEvidence {
  readonly label?: string;
  readonly path?: string;
}

export interface RootWorkDisplayLineage {
  readonly latestSuccessorRunId?: string;
  readonly decision?: string;
  readonly evidence?: RootWorkDisplayLineageEvidence;
  readonly displayOnlyNotes: readonly string[];
}

export interface RootWorkDisplayItem {
  readonly key: string;
  readonly kind: RootWorkKind;
  readonly state: RootWorkState | RootWorkHistoryState;
  readonly title: string;
  readonly purpose?: string;
  readonly executable: boolean;
  readonly notExecutableReason?: string;
  readonly activeRunId?: string;
  readonly materializedRunId?: string;
  readonly completedByRunId?: string;
  readonly lineage?: RootWorkDisplayLineage;
}

export interface RootWorkDisplayModel {
  readonly counts: RootWorkCounts;
  readonly active: readonly RootWorkDisplayItem[];
  readonly queuedExecutable: readonly RootWorkDisplayItem[];
  readonly queuedNonExecutable: readonly RootWorkDisplayItem[];
  readonly recent: readonly RootWorkDisplayItem[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isRootWorkKind(value: unknown): value is RootWorkKind {
  return typeof value === "string" && ROOT_WORK_KIND_SET.has(value);
}

function isRootWorkState(value: unknown): value is RootWorkState {
  return typeof value === "string" && ROOT_WORK_STATES.has(value);
}

function isHistoryState(value: unknown): value is RootWorkHistoryState {
  return typeof value === "string" && ROOT_WORK_HISTORY_STATES.has(value);
}

function requestedBy(value: unknown): RootWorkRequestedBy {
  return typeof value === "string" && REQUESTED_BY.has(value) ? value as RootWorkRequestedBy : "user";
}

function sanitizeText(input: unknown, fallback = "", maxLength = 240) {
  if (typeof input !== "string") return fallback;
  const cleaned = input
    .split(/\r?\n/)
    .filter((line) => !PROMPT_OR_SECRET_LINE.test(line))
    .join(" ")
    .replace(ABSOLUTE_SESSION_PATH, "[redacted-session-path]")
    .replace(/[A-Za-z0-9_+\-/=]{64,}/g, "[redacted-long-token]")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/^#+\s*/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
  const value = cleaned || fallback;
  return value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…` : value;
}

function sanitizeStringArray(value: unknown, maxLength = 220) {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const cleaned = sanitizeText(item, "", maxLength);
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
  }
  return out.length ? out : undefined;
}

function isSecretShapedPublicKey(input: unknown) {
  return typeof input === "string" && (PROMPT_OR_SECRET_KEY.test(input) || isSecretishLineageEvidenceText(input) || isCompactSecretishKeyIdentifier(input));
}

function normalizePublicKeyCandidate(input: unknown, fallback: string) {
  if (typeof input !== "string" || isSecretShapedPublicKey(input)) return undefined;
  const cleaned = sanitizeText(input, "", 160);
  if (!cleaned || isSecretShapedPublicKey(cleaned)) return undefined;
  const normalized = normalizeStableKey(cleaned, fallback);
  return normalized && !isSecretShapedPublicKey(normalized) ? normalized : undefined;
}

function sanitizeKey(input: unknown, fallback = "root-work") {
  return normalizePublicKeyCandidate(input, fallback)
    ?? normalizePublicKeyCandidate(fallback, "root-work")
    ?? normalizeStableKey("root-work", "root-work");
}

function sanitizeArgKey(key: string) {
  if (isSecretShapedPublicKey(key)) return undefined;
  const safeKey = sanitizeKey(key, "arg").slice(0, 80);
  return safeKey && !isSecretShapedPublicKey(safeKey) ? safeKey : undefined;
}

function sanitizeArgs(value: unknown) {
  if (!isRecord(value)) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, entry] of Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) {
    const safeKey = sanitizeArgKey(key);
    if (!safeKey) continue;
    if (typeof entry === "string") out[safeKey] = sanitizeText(entry, "", 300);
    else if (typeof entry === "number" && Number.isFinite(entry)) out[safeKey] = entry;
    else if (typeof entry === "boolean" || entry === null) out[safeKey] = entry;
  }
  return Object.keys(out).length ? out : undefined;
}

function asInputRecord(seed: RootWorkSeed | Record<string, unknown> | undefined) {
  const input = seed && isRecord(seed.input) ? seed.input : {};
  return { seed: (seed ?? {}) as Record<string, unknown>, input };
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const cleaned = sanitizeText(value, "");
    if (cleaned) return cleaned;
  }
  return undefined;
}

function autoimproveInput(seed: RootWorkSeed | Record<string, unknown>): RootWorkInput {
  const { seed: root, input } = asInputRecord(seed);
  const objective = firstText(input.objective, root.objective, root.title, root.purpose) ?? "Continue autoimprove root work.";
  const oracleQuestion = firstText(input.oracleQuestion, root.oracleQuestion);
  const evidencePaths = sanitizeStringArray(input.evidencePaths ?? root.evidencePaths, 500);
  const writeScope = sanitizeStringArray(input.writeScope ?? root.writeScope, 220);
  return {
    kind: "autoimprove-loop",
    objective,
    oracleRequired: true,
    ...(oracleQuestion ? { oracleQuestion } : {}),
    ...(evidencePaths ? { evidencePaths } : {}),
    ...(writeScope ? { writeScope } : {}),
  };
}

function taskInput(seed: RootWorkSeed | Record<string, unknown>): RootWorkInput {
  const { seed: root, input } = asInputRecord(seed);
  const objective = firstText(input.objective, root.objective, root.title, root.purpose) ?? "Complete queued root task.";
  const writeScope = sanitizeStringArray(input.writeScope ?? root.writeScope, 220);
  return { kind: "task", objective, ...(writeScope ? { writeScope } : {}) };
}

function customGraphInput(seed: RootWorkSeed | Record<string, unknown>): RootWorkInput {
  const { seed: root, input } = asInputRecord(seed);
  const presetName = sanitizeKey(firstText(input.presetName, root.presetName, root.title, root.key) ?? "custom-graph", "custom-graph");
  const args = sanitizeArgs(input.args ?? root.args);
  return { kind: "custom-graph", presetName, ...(args ? { args } : {}) };
}

function researchInput(kind: "research" | "deep-research", seed: RootWorkSeed | Record<string, unknown>): RootWorkInput {
  const { seed: root, input } = asInputRecord(seed);
  const question = firstText(input.question, root.question, root.objective, root.purpose, root.title) ?? `Answer queued ${kind} question.`;
  const expectedOutput = firstText(input.expectedOutput, root.expectedOutput);
  if (kind === "research") return { kind, question, ...(expectedOutput ? { expectedOutput } : {}) };
  const sourcePolicy = firstText(input.sourcePolicy, root.sourcePolicy);
  return { kind, question, ...(expectedOutput ? { expectedOutput } : {}), ...(sourcePolicy ? { sourcePolicy } : {}) };
}

function manualInput(seed: RootWorkSeed | Record<string, unknown>): RootWorkInput {
  const { seed: root, input } = asInputRecord(seed);
  const description = firstText(input.description, root.description, root.purpose, root.title, root.objective) ?? "Complete manual queued root work.";
  const owner = firstText(input.owner, root.owner);
  const completionCriteria = firstText(input.completionCriteria, root.completionCriteria);
  return { kind: "manual", description, ...(owner ? { owner } : {}), ...(completionCriteria ? { completionCriteria } : {}) };
}

function normalizeInput(kind: RootWorkKind, seed: RootWorkSeed | Record<string, unknown>): RootWorkInput {
  switch (kind) {
    case "autoimprove-loop": return autoimproveInput(seed);
    case "task": return taskInput(seed);
    case "custom-graph": return customGraphInput(seed);
    case "research": return researchInput("research", seed);
    case "deep-research": return researchInput("deep-research", seed);
    case "manual": return manualInput(seed);
  }
}

function titleFromInput(input: RootWorkInput) {
  switch (input.kind) {
    case "autoimprove-loop":
    case "task": return input.objective;
    case "custom-graph": return input.presetName;
    case "research":
    case "deep-research": return input.question;
    case "manual": return input.description;
  }
}

function cloneQueue(queue: RootWorkQueue): RootWorkQueue {
  return JSON.parse(JSON.stringify(queue)) as RootWorkQueue;
}

function boundedHistory(history: readonly RootWorkHistoryItem[] | undefined) {
  const items = [...(history ?? [])];
  return items.slice(Math.max(0, items.length - ROOT_WORK_HISTORY_LIMIT));
}

function nextUniqueKey(base: string, used: Set<string>) {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let index = 2;
  while (used.has(`${base}~${index}`)) index += 1;
  const key = `${base}~${index}`;
  used.add(key);
  return key;
}

function normalizeRootWorkItem(value: unknown, fallbackOriginRunId: string, used: Set<string>, ordinal: number): RootWorkItem | undefined {
  if (!isRecord(value) || !isRootWorkKind(value.kind)) return undefined;
  const kind = value.kind;
  const input = normalizeInput(kind, value as Record<string, unknown>);
  const title = firstText(value.title, titleFromInput(input)) ?? `Queued ${kind} root work`;
  const baseKey = sanitizeKey(value.key, `${kind}.${title}.${ordinal + 1}`);
  const key = nextUniqueKey(baseKey, used);
  const state = isRootWorkState(value.state) ? value.state : "queued";
  const activeRunId = state === "active" ? firstText(value.activeRunId) : undefined;
  const priority = typeof value.priority === "number" && Number.isFinite(value.priority) ? value.priority : undefined;
  const dependsOnRootWorkKeys = sanitizeStringArray(value.dependsOnRootWorkKeys, 160);
  return {
    key,
    kind,
    state,
    title,
    ...(firstText(value.purpose) ? { purpose: firstText(value.purpose) } : {}),
    ...(firstText(value.successCriteria) ? { successCriteria: firstText(value.successCriteria) } : {}),
    input,
    requestedBy: requestedBy(value.requestedBy),
    originRunId: firstText(value.originRunId) ?? fallbackOriginRunId,
    ...(activeRunId ? { activeRunId } : {}),
    ...(priority !== undefined ? { priority } : {}),
    ...(dependsOnRootWorkKeys ? { dependsOnRootWorkKeys } : {}),
    privacy: { sanitized: true },
  };
}

function normalizeHistoryItem(value: unknown): RootWorkHistoryItem | undefined {
  if (!isRecord(value) || !isRootWorkKind(value.kind) || !isHistoryState(value.state)) return undefined;
  const title = firstText(value.title) ?? `${value.kind} root work`;
  const key = sanitizeKey(value.key, `${value.kind}.${title}`);
  const materialization = isRecord(value.materialization)
    && typeof value.materialization.fromRunId === "string"
    && typeof value.materialization.toRunId === "string"
    && value.materialization.tool === "task_graph_continue_autoimprove"
    ? {
        fromRunId: sanitizeText(value.materialization.fromRunId, ""),
        toRunId: sanitizeText(value.materialization.toRunId, ""),
        tool: "task_graph_continue_autoimprove" as const,
      }
    : undefined;
  return {
    key,
    kind: value.kind,
    state: value.state,
    title,
    ...(firstText(value.runId) ? { runId: firstText(value.runId) } : {}),
    ...(firstText(value.at) ? { at: firstText(value.at) } : {}),
    ...(materialization ? { materialization } : {}),
    ...(firstText(value.completedByRunId) ? { completedByRunId: firstText(value.completedByRunId) } : {}),
    privacy: { sanitized: true },
  };
}

export function normalizeRootWorkSeed(seed: RootWorkSeed, originRunId: string, ordinal = 0, usedKeys: ReadonlySet<string> = new Set()): RootWorkItem {
  if (!isRootWorkKind(seed.kind)) throw new Error(`Unsupported root work kind: ${String(seed.kind)}`);
  const used = new Set(usedKeys);
  const input = normalizeInput(seed.kind, seed);
  const title = firstText(seed.title, titleFromInput(input)) ?? `Queued ${seed.kind} root work`;
  const baseKey = sanitizeKey(seed.key, `${seed.kind}.${title}.${ordinal + 1}`);
  const key = nextUniqueKey(baseKey, used);
  const priority = typeof seed.priority === "number" && Number.isFinite(seed.priority) ? seed.priority : undefined;
  const dependsOnRootWorkKeys = sanitizeStringArray(seed.dependsOnRootWorkKeys, 160);
  return {
    key,
    kind: seed.kind,
    state: "queued",
    title,
    ...(firstText(seed.purpose) ? { purpose: firstText(seed.purpose) } : {}),
    ...(firstText(seed.successCriteria) ? { successCriteria: firstText(seed.successCriteria) } : {}),
    input,
    requestedBy: requestedBy(seed.requestedBy),
    originRunId,
    ...(priority !== undefined ? { priority } : {}),
    ...(dependsOnRootWorkKeys ? { dependsOnRootWorkKeys } : {}),
    privacy: { sanitized: true },
  };
}

function parseQueue(value: unknown, originRunId: string): RootWorkQueue {
  if (!isRecord(value)) return { version: ROOT_WORK_QUEUE_VERSION, items: [] };
  const usedItemKeys = new Set<string>();
  const items = Array.isArray(value.items)
    ? value.items.map((item, index) => normalizeRootWorkItem(item, originRunId, usedItemKeys, index)).filter((item): item is RootWorkItem => Boolean(item))
    : [];
  const history = Array.isArray(value.history)
    ? boundedHistory(value.history.map((item) => normalizeHistoryItem(item)).filter((item): item is RootWorkHistoryItem => Boolean(item)))
    : [];
  return { version: ROOT_WORK_QUEUE_VERSION, items, ...(history.length ? { history } : {}) };
}

export function completeActiveRootWork(queue: RootWorkQueue, runId: string | undefined, completedAt?: string): RootWorkQueue {
  if (!runId) return cloneQueue(queue);
  const next = cloneQueue(queue);
  const remaining: RootWorkItem[] = [];
  const completed: RootWorkHistoryItem[] = [];
  for (const item of next.items) {
    if (item.state === "active" && item.activeRunId === runId) {
      completed.push({
        key: item.key,
        kind: item.kind,
        state: "completed",
        title: item.title,
        runId,
        ...(completedAt ? { at: completedAt } : {}),
        completedByRunId: runId,
        privacy: { sanitized: true },
      });
    } else {
      remaining.push(item);
    }
  }
  return {
    version: ROOT_WORK_QUEUE_VERSION,
    items: remaining,
    history: boundedHistory([...(next.history ?? []), ...completed]),
  };
}

export function mergeRootWorkSeeds(queue: RootWorkQueue, seeds: readonly RootWorkSeed[] | undefined, originRunId: string): RootWorkQueue {
  if (!seeds?.length) return cloneQueue(queue);
  const next = cloneQueue(queue);
  const openByKey = new Map(next.items.map((item) => [item.key, item]));
  const usedKeys = new Set<string>([
    ...next.items.map((item) => item.key),
    ...(next.history ?? []).map((item) => item.key),
  ]);
  for (const [index, seed] of seeds.entries()) {
    if (!isRootWorkKind(seed.kind)) throw new Error(`futureWork[${index}].kind is unsupported: ${String(seed.kind)}`);
    const baseKey = sanitizeKey(seed.key, `${seed.kind}.${firstText(seed.title, seed.objective, seed.question, seed.description, seed.presetName) ?? `item-${index + 1}`}`);
    const existing = openByKey.get(baseKey);
    const normalized = normalizeRootWorkSeed(seed, originRunId, index, existing ? new Set([...usedKeys].filter((key) => key !== baseKey)) : usedKeys);
    if (existing) {
      existing.title = normalized.title;
      existing.purpose = normalized.purpose;
      existing.successCriteria = normalized.successCriteria;
      existing.input = normalized.input;
      existing.requestedBy = normalized.requestedBy;
      existing.priority = normalized.priority;
      existing.dependsOnRootWorkKeys = normalized.dependsOnRootWorkKeys;
      existing.privacy = { sanitized: true };
      continue;
    }
    next.items.push(normalized);
    openByKey.set(normalized.key, normalized);
    usedKeys.add(normalized.key);
  }
  return { version: ROOT_WORK_QUEUE_VERSION, items: next.items, ...(next.history?.length ? { history: boundedHistory(next.history) } : {}) };
}

export function normalizeRootWorkQueue(value: unknown, options: NormalizeRootWorkQueueOptions = {}): RootWorkQueue {
  const originRunId = sanitizeText(options.originRunId, "unknown-root-run", 160) || "unknown-root-run";
  let queue = parseQueue(value, originRunId);
  if (options.completedRunId) queue = completeActiveRootWork(queue, options.completedRunId, options.completedAt);
  if (options.seeds?.length) queue = mergeRootWorkSeeds(queue, options.seeds, originRunId);
  return { version: ROOT_WORK_QUEUE_VERSION, items: queue.items, ...(queue.history?.length ? { history: boundedHistory(queue.history) } : {}) };
}

export function defaultRootWorkSelection(args: { readonly objective?: string; readonly rootWorkSelection?: RootWorkSelection }): RootWorkSelection {
  if (args.rootWorkSelection) return args.rootWorkSelection;
  return args.objective?.trim() ? { mode: "none" } : { mode: "first-executable" };
}

export function isExecutableRootWorkKind(kind: RootWorkKind) {
  return EXECUTABLE_ROOT_WORK_KINDS.has(kind);
}

export function selectRootWorkItem(queue: RootWorkQueue, selection: RootWorkSelection): RootWorkSelectionResult {
  if (selection.mode === "none") return { mode: "none", status: "none", message: "Root work queue selection disabled for this continuation." };
  if (selection.mode === "first-executable") {
    const item = queue.items.find((candidate) => candidate.state === "queued" && isExecutableRootWorkKind(candidate.kind));
    if (!item) {
      const nonExecutableCount = queue.items.filter((candidate) => candidate.state === "queued" && !isExecutableRootWorkKind(candidate.kind)).length;
      return {
        mode: "first-executable",
        status: "no-executable",
        message: nonExecutableCount
          ? `No executable queued root work is available in this slice; ${nonExecutableCount} non-executable queued item(s) remain visible and queued.`
          : "No executable queued root work is available.",
      };
    }
    return { mode: "first-executable", status: "selected", selectedKey: item.key, item, message: `Selected queued root work ${item.key}.` };
  }
  const key = sanitizeKey(selection.key, "root-work");
  const item = queue.items.find((candidate) => candidate.key === key);
  if (!item) return { mode: "item-key", status: "missing", selectedKey: key, message: `Queued root work item not found: ${key}.` };
  if (item.state !== "queued") return { mode: "item-key", status: "not-queued", selectedKey: key, item, message: `Root work item ${key} is ${item.state}, not queued.` };
  if (!isExecutableRootWorkKind(item.kind)) return { mode: "item-key", status: "non-executable", selectedKey: key, item, message: `Root work item ${key} has kind ${item.kind}, which is not executable by this version.` };
  return { mode: "item-key", status: "selected", selectedKey: key, item, message: `Selected queued root work ${key}.` };
}

export function markRootWorkCreated(queue: RootWorkQueue, item: RootWorkItem, fromRunId: string, toRunId: string, at?: string): RootWorkQueue {
  const next = cloneQueue(queue);
  const historyItem: RootWorkHistoryItem = {
    key: item.key,
    kind: item.kind,
    state: "created",
    title: item.title,
    runId: toRunId,
    ...(at ? { at } : {}),
    materialization: { fromRunId, toRunId, tool: "task_graph_continue_autoimprove" },
    privacy: { sanitized: true },
  };
  return {
    version: ROOT_WORK_QUEUE_VERSION,
    items: next.items.filter((candidate) => candidate.key !== item.key),
    history: boundedHistory([...(next.history ?? []), historyItem]),
  };
}

export function buildSuccessorRootWorkQueue(queueAfterParentTransition: RootWorkQueue, selectedItem: RootWorkItem | undefined, activeRunId: string): RootWorkQueue {
  const carried = cloneQueue(queueAfterParentTransition);
  if (!selectedItem) return carried;
  const active: RootWorkItem = {
    ...cloneQueue({ version: ROOT_WORK_QUEUE_VERSION, items: [selectedItem] }).items[0],
    state: "active",
    activeRunId,
    privacy: { sanitized: true },
  };
  return {
    version: ROOT_WORK_QUEUE_VERSION,
    items: [active, ...carried.items.filter((item) => item.key !== selectedItem.key)],
    ...(carried.history?.length ? { history: boundedHistory(carried.history) } : {}),
  };
}

export function rootWorkQueueCounts(queue: RootWorkQueue | undefined): RootWorkCounts {
  const items = queue?.items ?? [];
  const history = queue?.history ?? [];
  const queued = items.filter((item) => item.state === "queued");
  return {
    active: items.filter((item) => item.state === "active").length,
    queued: queued.length,
    queuedExecutable: queued.filter((item) => isExecutableRootWorkKind(item.kind)).length,
    queuedNonExecutable: queued.filter((item) => !isExecutableRootWorkKind(item.kind)).length,
    created: history.filter((item) => item.state === "created").length,
    completed: history.filter((item) => item.state === "completed").length,
    history: history.length,
  };
}

function sanitizeLineageText(value: unknown, maxLength = 220) {
  const cleaned = sanitizeText(value, "", maxLength);
  return cleaned || undefined;
}

function unredactedLineageEvidenceText(value: string) {
  return value.split(REDACTED_LINEAGE_EVIDENCE_COMPONENT).join("");
}

function containsCompactSecretishLineageEvidenceText(value: unknown) {
  return typeof value === "string" && containsCompactSecretishKeyIdentifierText(unredactedLineageEvidenceText(value));
}

function hasSecretishLineageEvidenceText(value: unknown) {
  return isSecretishLineageEvidenceText(value) || containsCompactSecretishLineageEvidenceText(value);
}

function redactCompactLineageEvidenceText(value: string) {
  return redactCompactSecretishKeyIdentifiersInText(value, REDACTED_LINEAGE_EVIDENCE_COMPONENT);
}

function sanitizeLineageEvidenceLabel(value: unknown) {
  if (hasSecretishLineageEvidenceText(value)) return GENERIC_MARKDOWN_EVIDENCE_LABEL;
  const label = sanitizeLineageText(value, 220);
  if (!label) return undefined;
  return hasSecretishLineageEvidenceText(label) ? GENERIC_MARKDOWN_EVIDENCE_LABEL : label;
}

function sanitizeLineageDecision(value: unknown) {
  const decision = sanitizeLineageText(value, 40)?.toUpperCase();
  return decision && LINEAGE_DECISIONS.has(decision) ? decision : undefined;
}

function sanitizeLineageNote(value: unknown) {
  const note = sanitizeRootWorkLineageWarningForDisplay(value);
  return note && !ROOT_WORK_COMPLETION_CLAIM.test(note) ? note : undefined;
}

function sanitizeLineagePath(value: unknown) {
  if (typeof value !== "string") return undefined;
  if (isSecretishLineageEvidenceText(value)) return undefined;
  const cleaned = redactCompactLineageEvidenceText(value)
    .split(/\r?\n/)
    .filter((line) => !PROMPT_OR_SECRET_LINE.test(line))
    .join(" ")
    .replace(ABSOLUTE_SESSION_PATH, "[redacted-session-path]")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const safe = cleaned
    .split(/([/\\])/)
    .map((part) => part === "/" || part === "\\" ? part : sanitizeText(redactCompactLineageEvidenceText(part), "", 120))
    .join("")
    .trim();
  const unredactedSafe = unredactedLineageEvidenceText(safe);
  if (!safe || isSecretishLineageEvidenceText(unredactedSafe) || containsCompactSecretishLineageEvidenceText(unredactedSafe)) return undefined;
  return safe.length > 500 ? `${safe.slice(0, 499).trimEnd()}…` : safe;
}

function lineageSuccessors(lineage: RootWorkLineageDisplay): readonly RootWorkLineageSuccessor[] {
  return Array.isArray(lineage.successors) ? lineage.successors : [];
}

function latestLineageSuccessor(lineage: RootWorkLineageDisplay) {
  const successors = lineageSuccessors(lineage);
  const latestSuccessorRunId = sanitizeLineageText(lineage.latestSuccessorRunId, 160);
  return (latestSuccessorRunId ? successors.find((successor) => sanitizeLineageText(successor.runId, 160) === latestSuccessorRunId) : undefined) ?? successors[0];
}

function uniqueLineageNotes(...values: unknown[]) {
  const seen = new Set<string>();
  const notes: string[] = [];
  for (const value of values) {
    const note = sanitizeLineageNote(value);
    if (!note || seen.has(note)) continue;
    seen.add(note);
    notes.push(note);
  }
  const hasDisplayOnly = notes.some((note) => /display-only/i.test(note));
  const hasDurableActive = notes.some((note) => /durable root work remains active/i.test(note));
  if (!hasDisplayOnly || !hasDurableActive) {
    const fallback = "display-only: durable root work remains ACTIVE.";
    if (!seen.has(fallback)) notes.push(fallback);
  }
  return notes;
}

function displayLineageForOpenItem(item: RootWorkItem, options: RootWorkDisplayOptions): RootWorkDisplayLineage | undefined {
  if (item.state !== "active" || !item.activeRunId) return undefined;
  const lineage = options.lineageByActiveRunId?.[item.activeRunId];
  if (!lineage) return undefined;
  const successor = latestLineageSuccessor(lineage);
  const latestSuccessorRunId = lineage.latestSuccessorRunId
    ? sanitizeRootWorkLineageRunIdForDisplay(lineage.latestSuccessorRunId)
    : sanitizeRootWorkLineageRunIdForDisplay(successor?.runId);
  const decision = sanitizeLineageDecision(lineage.decision) ?? sanitizeLineageDecision(successor?.decision);
  const evidence = lineage.evidence?.label || lineage.evidence?.path ? lineage.evidence : successor?.evidence;
  const evidenceLabel = sanitizeLineageEvidenceLabel(evidence?.label);
  const evidencePath = sanitizeLineagePath(evidence?.path);
  const displayEvidence = evidenceLabel || evidencePath
    ? {
        ...(evidenceLabel ? { label: evidenceLabel } : {}),
        ...(evidencePath ? { path: evidencePath } : {}),
      }
    : undefined;
  return {
    ...(latestSuccessorRunId ? { latestSuccessorRunId } : {}),
    ...(decision ? { decision } : {}),
    ...(displayEvidence ? { evidence: displayEvidence } : {}),
    displayOnlyNotes: uniqueLineageNotes(lineage.displayOnlyNote, successor?.note),
  };
}

function sanitizePublicKeyForDisplay(input: unknown, fallback = "root-work") {
  if (isSecretShapedPublicKey(input)) return fallback;
  const cleaned = sanitizeRootWorkDisplayText(input, "", 160);
  return cleaned && !isSecretShapedPublicKey(cleaned) ? cleaned : fallback;
}

function displayItemFromOpen(item: RootWorkItem, options: RootWorkDisplayOptions = {}): RootWorkDisplayItem {
  const executable = item.state === "queued" && isExecutableRootWorkKind(item.kind);
  const purpose = sanitizeRootWorkDisplayText(item.purpose, "", 220);
  return {
    key: sanitizePublicKeyForDisplay(item.key),
    kind: item.kind,
    state: item.state,
    title: sanitizeRootWorkDisplayText(item.title, "Untitled root work", 160) || "Untitled root work",
    ...(purpose ? { purpose } : {}),
    executable,
    notExecutableReason: item.state === "queued" && !executable ? "not executable by this version" : undefined,
    activeRunId: item.activeRunId ? sanitizeRootWorkLineageRunIdForDisplay(item.activeRunId) : undefined,
    lineage: displayLineageForOpenItem(item, options),
  };
}

function displayItemFromHistory(item: RootWorkHistoryItem): RootWorkDisplayItem {
  return {
    key: sanitizePublicKeyForDisplay(item.key),
    kind: item.kind,
    state: item.state,
    title: sanitizeRootWorkDisplayText(item.title, "Untitled root work", 160) || "Untitled root work",
    executable: false,
    materializedRunId: sanitizeRootWorkLineageRunIdForDisplay(item.materialization?.toRunId ?? item.runId),
    completedByRunId: sanitizeRootWorkLineageRunIdForDisplay(item.completedByRunId),
  };
}

export function rootWorkDisplayModel(queue: RootWorkQueue | undefined, options: RootWorkDisplayOptions = {}): RootWorkDisplayModel {
  const normalized = queue ?? { version: ROOT_WORK_QUEUE_VERSION, items: [] as RootWorkItem[] };
  const active = normalized.items.filter((item) => item.state === "active").map((item) => displayItemFromOpen(item, options));
  const queued = normalized.items.filter((item) => item.state === "queued").map((item) => displayItemFromOpen(item));
  return {
    counts: rootWorkQueueCounts(normalized),
    active,
    queuedExecutable: queued.filter((item) => item.executable),
    queuedNonExecutable: queued.filter((item) => !item.executable),
    recent: [...(normalized.history ?? [])].slice(-8).reverse().map(displayItemFromHistory),
  };
}

export function renderRootWorkCounts(counts: RootWorkCounts) {
  const parts = [`${counts.active} active`, `${counts.queued} queued`, `${counts.queuedExecutable} executable queued`, `${counts.queuedNonExecutable} non-executable queued`];
  if (counts.completed) parts.push(`${counts.completed} completed`);
  return `Root work: ${parts.join(", ")}`;
}

function lineageDetailLine(item: RootWorkDisplayItem) {
  const lineage = item.lineage;
  if (!lineage) return "";
  const evidence = lineage.evidence
    ? [
        lineage.evidence.label ? sanitizeText(lineage.evidence.label, "", 220) : undefined,
        lineage.evidence.path ? sanitizeLineagePath(lineage.evidence.path) : undefined,
      ].filter((part): part is string => Boolean(part)).join(" · ")
    : undefined;
  const details = [
    lineage.latestSuccessorRunId ? `latest successor: ${sanitizeRootWorkLineageRunIdForDisplay(lineage.latestSuccessorRunId)}` : undefined,
    lineage.decision ? `Decision: ${sanitizeText(lineage.decision, "", 40)}` : undefined,
    evidence ? `evidence: ${evidence}` : undefined,
  ].filter((part): part is string => Boolean(part));
  const detailLine = details.length ? `\n      lineage: ${details.join(" · ")}` : "";
  const noteLines = lineage.displayOnlyNotes.map((note) => `\n      lineage note: ${sanitizeRootWorkLineageWarningForDisplay(note)}`).join("");
  return `${detailLine}${noteLines}`;
}

function bullet(item: RootWorkDisplayItem) {
  const details = [
    `key: ${item.key}`,
    `kind: ${item.kind}`,
    item.activeRunId ? `active run: ${sanitizeRootWorkLineageRunIdForDisplay(item.activeRunId)}` : undefined,
    item.materializedRunId && item.state === "created" ? `created successor: ${sanitizeRootWorkLineageRunIdForDisplay(item.materializedRunId)}` : undefined,
    item.completedByRunId && item.state === "completed" ? `completed by: ${sanitizeRootWorkLineageRunIdForDisplay(item.completedByRunId)}` : undefined,
    item.notExecutableReason,
  ].filter((part): part is string => Boolean(part));
  const purpose = item.purpose ? `\n      purpose: ${sanitizeRootWorkDisplayText(item.purpose, "", 220)}` : "";
  return `    • ${sanitizeRootWorkDisplayText(item.title, "Untitled root work", 160) || "Untitled root work"}\n      ${details.join(" · ")}${purpose}${lineageDetailLine(item)}`;
}

export function renderRootWorkQueueStatus(queue: RootWorkQueue | undefined, options: RootWorkDisplayOptions = {}) {
  const model = rootWorkDisplayModel(queue, options);
  if (!model.counts.active && !model.counts.queued && !model.counts.history) return "";
  const lines = ["Durable root work queue:", `  ${renderRootWorkCounts(model.counts)}`];
  if (model.active.length) {
    lines.push("  Active:");
    lines.push(...model.active.map(bullet));
  }
  if (model.queuedExecutable.length || model.queuedNonExecutable.length) {
    lines.push("  Queued:");
    lines.push(...[...model.queuedExecutable, ...model.queuedNonExecutable].map(bullet));
  }
  if (model.recent.length) {
    lines.push("  Recent:");
    lines.push(...model.recent.map(bullet));
  }
  return lines.join("\n");
}

export function renderRootWorkQueuePromptBlock(queue: RootWorkQueue | undefined) {
  const status = renderRootWorkQueueStatus(queue);
  if (!status) return "";
  const counts = rootWorkQueueCounts(queue);
  const guidance = counts.queuedExecutable
    ? "Next safe continuation: call task_graph_continue_autoimprove with rootWorkSelection.mode = \"first-executable\" when no explicit ad-hoc objective should override the queue."
    : counts.queued
      ? "No executable queued root work remains in this implementation slice; non-executable queued work remains visible and has not been dropped."
      : "No queued root work remains.";
  return `\n## Durable root work queue\n\n${status}\n\n${guidance}\n`;
}

export function rootWorkReadyGuidance(queue: RootWorkQueue | undefined) {
  const counts = rootWorkQueueCounts(queue);
  if (!counts.queued && !counts.active) return "";
  if (counts.queuedExecutable) return `Durable queued root work remains. Next safe continuation: task_graph_continue_autoimprove with rootWorkSelection.mode = "first-executable". ${renderRootWorkCounts(counts)}.`;
  if (counts.queuedNonExecutable) return `No executable queued root work remains in this implementation slice. Non-executable queued work remains and has not been dropped. ${renderRootWorkCounts(counts)}.`;
  return `Durable root work is active. ${renderRootWorkCounts(counts)}.`;
}

export function safeRootWorkLabel(item: RootWorkDisplayItem, maxLength = 72) {
  const executable = item.state === "queued" && item.executable ? "executable" : item.notExecutableReason ?? undefined;
  const parts = [`${item.state} ${item.kind}`, sanitizeRootWorkDisplayText(item.title, "Untitled root work", maxLength), executable].filter((part): part is string => Boolean(part));
  const label = parts.join(": ");
  return label.length > maxLength ? `${label.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…` : label;
}
