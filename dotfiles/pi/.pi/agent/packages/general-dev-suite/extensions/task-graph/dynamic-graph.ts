import { REDACTED_SECRETISH_EVIDENCE_PATH, isSecretishLineageEvidenceText } from "./root-work-lineage";

export const DYNAMIC_TASK_GRAPH_PREVIEW_VERSION = 1 as const;
export const DEFAULT_DYNAMIC_TASK_GRAPH_MAX_SEEDS = 20;
export const ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_SEEDS = 50;
export const DEFAULT_DYNAMIC_TASK_GRAPH_MAX_LIST_ITEMS = 12;
export const ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_LIST_ITEMS = 50;
export const DEFAULT_DYNAMIC_TASK_GRAPH_MAX_TEXT_LENGTH = 500;
export const ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_TEXT_LENGTH = 2_000;
export const DEFAULT_DYNAMIC_TASK_GRAPH_MAX_PARALLEL = 4;
export const ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_PARALLEL = 16;
export const DYNAMIC_TASK_GRAPH_STABLE_KEY_MAX_LENGTH = 120;

export const DYNAMIC_TASK_GRAPH_SEED_PUBLIC_FIELDS = [
  "key",
  "id",
  "title",
  "description",
  "dependsOn",
  "blockedBy",
  "writeScope",
  "expectedWritePaths",
  "acceptanceCriteria",
  "suggestedChecks",
  "priority",
] as const;

export type DynamicTaskGraphSeedPublicField = (typeof DYNAMIC_TASK_GRAPH_SEED_PUBLIC_FIELDS)[number];
export type DynamicTaskGraphSeedPriority = string | number;

export interface DynamicTaskGraphSeed {
  readonly key?: string;
  readonly id?: string;
  readonly title?: string;
  readonly description?: string;
  readonly dependsOn?: readonly string[] | string;
  readonly blockedBy?: readonly string[] | string;
  readonly writeScope?: readonly string[] | string;
  readonly expectedWritePaths?: readonly string[] | string;
  readonly acceptanceCriteria?: readonly string[] | string;
  readonly suggestedChecks?: readonly string[] | string;
  readonly priority?: DynamicTaskGraphSeedPriority;
  readonly [field: string]: unknown;
}

export interface PreviewDynamicTaskGraphOptions {
  readonly maxSeeds?: number;
  readonly maxListItems?: number;
  readonly maxTextLength?: number;
  readonly maxParallel?: number;
}

export interface DynamicTaskGraphPreviewLimits {
  readonly maxSeeds: number;
  readonly maxListItems: number;
  readonly maxTextLength: number;
  readonly maxParallel: number;
}

export type DynamicTaskGraphPreviewWarningCode = "seeds_capped" | "list_items_capped";
export type DynamicTaskGraphPreviewListWarningField = "dependsOn" | "blockedBy" | "writeScope" | "expectedWritePaths" | "acceptanceCriteria" | "suggestedChecks";

export type DynamicTaskGraphPreviewWarning =
  | {
      readonly code: "seeds_capped";
      readonly message: string;
      readonly inputSeedCount: number;
      readonly acceptedSeedCount: number;
    }
  | {
      readonly code: "list_items_capped";
      readonly message: string;
      readonly seedIndex: number;
      readonly stableKey: string;
      readonly field: DynamicTaskGraphPreviewListWarningField;
      readonly inputItemCount: number;
      readonly acceptedItemCount: number;
      readonly cappedItemCount: number;
      readonly absoluteMaxListItems: number;
    };

export type DynamicTaskGraphPreviewErrorCode = "invalid_seed" | "unknown_dependency" | "ambiguous_dependency" | "dependency_cycle";

export interface DynamicTaskGraphPreviewError {
  readonly code: DynamicTaskGraphPreviewErrorCode;
  readonly message: string;
  readonly seedIndex?: number;
  readonly stableKey?: string;
  readonly dependencyReference?: string;
  readonly cycle?: readonly string[];
}

export type DynamicTaskGraphWorktreeEligibilityCode = "declared_writes" | "unknown_writes";

export interface DynamicTaskGraphWorktreeEligibilityAnnotation {
  readonly eligible: boolean;
  readonly code: DynamicTaskGraphWorktreeEligibilityCode;
  readonly reason: string;
  readonly normalizedWriteLocks: readonly string[];
}

export type DynamicTaskGraphPreviewWorktreeEligibilityCode = DynamicTaskGraphWorktreeEligibilityCode;
export type DynamicTaskGraphPreviewWorktreeEligibilityAnnotation = DynamicTaskGraphWorktreeEligibilityAnnotation;

export interface DynamicTaskGraphPreviewNode {
  readonly order: number;
  readonly seedIndex: number;
  readonly stableKey: string;
  readonly title: string;
  readonly description: string;
  readonly dependsOn: readonly string[];
  readonly blockedBy: readonly string[];
  readonly writeScope: readonly string[];
  readonly expectedWritePaths: readonly string[];
  readonly acceptanceCriteria: readonly string[];
  readonly suggestedChecks: readonly string[];
  readonly worktreeEligibility: DynamicTaskGraphWorktreeEligibilityAnnotation;
  readonly priority?: string;
  readonly sourceKey?: string;
  readonly sourceId?: string;
}

export type DynamicTaskGraphPreviewBatchHeldReasonCode = "max_parallel" | "write_conflict" | "unknown_writes_conflict";

export interface DynamicTaskGraphPreviewBatchHeldNode {
  readonly stableKey: string;
  readonly reason: DynamicTaskGraphPreviewBatchHeldReasonCode;
  readonly message: string;
  readonly conflictWith?: string;
  readonly conflictingWriteLocks?: readonly string[];
}

export interface DynamicTaskGraphPreviewReadyBatch {
  readonly index: number;
  readonly nodeStableKeys: readonly string[];
  readonly held: readonly DynamicTaskGraphPreviewBatchHeldNode[];
}

export interface DynamicTaskGraphPreviewResult {
  readonly version: typeof DYNAMIC_TASK_GRAPH_PREVIEW_VERSION;
  readonly valid: boolean;
  readonly inputSeedCount: number;
  readonly acceptedSeedCount: number;
  readonly cappedSeedCount: number;
  readonly limits: DynamicTaskGraphPreviewLimits;
  readonly nodes: readonly DynamicTaskGraphPreviewNode[];
  readonly batches: readonly DynamicTaskGraphPreviewReadyBatch[];
  readonly warnings: readonly DynamicTaskGraphPreviewWarning[];
  readonly errors: readonly DynamicTaskGraphPreviewError[];
}

const DYNAMIC_TASK_GRAPH_CONTROL_CHARACTER_MARKER = /[\u0000-\u001f\u007f]/g;
const PROMPT_LIKE_LINE_MARKER =
  /\b(?:prompt[\s_-]*instructions|project[\s_-]*prompt[\s_-]*instructions|ready[\s_-]*prompt|worker[\s_-]*prompt|system[\s_-]*prompt|hidden[\s_-]*prompt|prompt[\s_-]*template|private[\s_-]*prompt|private[\s_-]*context|private[\s_-]*notes)\b/i;
const PROMPT_ROLE_OR_PRIVATE_LINE_MARKER =
  /^\s*["']?(?:system|developer|assistant|tool|instructions?|scratchpad|chain[\s_-]*of[\s_-]*thought|hidden[\s_-]*(?:instructions?|context|notes)|private[\s_-]*(?:context|notes|instructions?)|internal[\s_-]*(?:notes|reasoning|monologue))["']?\s*[:=]/i;
const BEARER_SECRET_MARKER = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/i;
const RAW_SECRET_TOKEN_MARKERS = [
  /(?:^|[^A-Za-z0-9_-])sk-(?:proj-|ant-|or-)?[A-Za-z0-9_-]{20,}(?=$|[^A-Za-z0-9_-])/i,
  /(?:^|[^A-Za-z0-9_])ghp_[A-Za-z0-9_]{20,}(?=$|[^A-Za-z0-9_])/,
  /(?:^|[^A-Za-z0-9_])github_pat_[A-Za-z0-9_]{22,}(?=$|[^A-Za-z0-9_])/,
  /(?:^|[^A-Za-z0-9-])xox[baprs]-[A-Za-z0-9-]{20,}(?=$|[^A-Za-z0-9-])/i,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}\b/,
] as const;
const PRIVATE_KEY_MARKER = /-----(?:BEGIN|END) [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----/i;
const PRIVATE_KEY_BLOCK_MARKER = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----[\s\S]*?(?:-----END [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----|$)/gi;
const DYNAMIC_TASK_GRAPH_WRITE_DISPLAY_SESSION_PATH = /\/(?:home|Users)\/[^\s),]+\/[^\s),]*sessions?[^\s),]*/gi;
const DYNAMIC_TASK_GRAPH_WRITE_DISPLAY_LONG_TOKEN = /[A-Za-z0-9_+=-]{64,}/g;
const DYNAMIC_TASK_GRAPH_COMPACT_SECRETISH_WRITE_TEXT = /(?:apikey|xapikey|privatekey|secretkey|accesskey|sessiontoken|accesstoken|refreshtoken|idtoken|authtoken|bearertoken|githubtoken|npmtoken|openaiapikey|anthropicapikey|awssecretaccesskey|password|passwd|authorization|cookie)/i;
const REDACTED_DYNAMIC_TASK_GRAPH_SESSION_PATH = "[redacted-session-path]";
const REDACTED_DYNAMIC_TASK_GRAPH_LONG_TOKEN = "[redacted-long-token]";
const DYNAMIC_TASK_GRAPH_WRITE_LOCK_CONFLICT_SEPARATOR = " <-> ";

function boundedNonNegativeInteger(value: unknown, fallback: number, maximum: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(maximum, Math.floor(value)));
}

function boundedPositiveInteger(value: unknown, fallback: number, maximum: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(maximum, Math.floor(value)));
}

function previewLimits(options: PreviewDynamicTaskGraphOptions): DynamicTaskGraphPreviewLimits {
  return {
    maxSeeds: boundedNonNegativeInteger(options.maxSeeds, DEFAULT_DYNAMIC_TASK_GRAPH_MAX_SEEDS, ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_SEEDS),
    maxListItems: boundedNonNegativeInteger(options.maxListItems, DEFAULT_DYNAMIC_TASK_GRAPH_MAX_LIST_ITEMS, ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_LIST_ITEMS),
    maxTextLength: boundedNonNegativeInteger(options.maxTextLength, DEFAULT_DYNAMIC_TASK_GRAPH_MAX_TEXT_LENGTH, ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_TEXT_LENGTH),
    maxParallel: boundedPositiveInteger(options.maxParallel, DEFAULT_DYNAMIC_TASK_GRAPH_MAX_PARALLEL, ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_PARALLEL),
  };
}

function compactSecretAssignmentKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function assignmentKeyCandidates(line: string) {
  return [...line.matchAll(/["']?([A-Za-z_][A-Za-z0-9_-]*(?:[\s_-]+[A-Za-z0-9]+)*)["']?\s*(?:[\])}]\s*)?[:=]/g)]
    .map((match) => compactSecretAssignmentKey(match[1] ?? ""))
    .filter(Boolean);
}

function isSecretAssignmentKey(key: string) {
  return (
    key === "authorization" ||
    key === "cookie" ||
    key === "setcookie" ||
    key === "password" ||
    key === "passwd" ||
    key === "secret" ||
    key === "token" ||
    key.endsWith("token") ||
    key.endsWith("secret") ||
    key.includes("apikey") ||
    key.includes("secretkey") ||
    key.includes("accesskey") ||
    key.includes("privatekey")
  );
}

function isSecretAssignmentLine(line: string) {
  return assignmentKeyCandidates(line).some(isSecretAssignmentKey);
}

function hasRawSecretTokenMarker(line: string) {
  return RAW_SECRET_TOKEN_MARKERS.some((marker) => marker.test(line));
}

function hasPromptLikeOrPrivateMarker(line: string) {
  return PROMPT_LIKE_LINE_MARKER.test(line) || PROMPT_ROLE_OR_PRIVATE_LINE_MARKER.test(line) || isSecretAssignmentLine(line) || BEARER_SECRET_MARKER.test(line) || hasRawSecretTokenMarker(line) || PRIVATE_KEY_MARKER.test(line);
}

function controlCharactersAsSpaces(line: string) {
  return line.replace(DYNAMIC_TASK_GRAPH_CONTROL_CHARACTER_MARKER, " ");
}

function stripMarkdownLinePrefix(line: string) {
  let current = line.trim();
  while (true) {
    const next = current
      .replace(/^>+\s*/, "")
      .replace(/^#+\s*/, "")
      .replace(/^[-*+]\s*\[[ xX]\]\s+/, "")
      .replace(/^[-*+]\s+/, "")
      .replace(/^\d+[.)]\s+/, "")
      .trim();
    if (next === current) return current;
    current = next;
  }
}

function isPromptLikeOrPrivateLine(line: string) {
  const normalizedLine = controlCharactersAsSpaces(line);
  const strippedLine = stripMarkdownLinePrefix(line);
  const strippedNormalizedLine = stripMarkdownLinePrefix(normalizedLine);
  return hasPromptLikeOrPrivateMarker(line) || hasPromptLikeOrPrivateMarker(normalizedLine) || hasPromptLikeOrPrivateMarker(strippedLine) || hasPromptLikeOrPrivateMarker(strippedNormalizedLine);
}

function truncateText(value: string, maxLength: number) {
  if (maxLength <= 0) return "";
  const chars = Array.from(value);
  if (chars.length <= maxLength) return value;
  if (maxLength === 1) return "…";
  return `${chars.slice(0, maxLength - 1).join("").trimEnd()}…`;
}

export function normalizeDynamicTaskPublicText(input: string | undefined, maxLength = DEFAULT_DYNAMIC_TASK_GRAPH_MAX_TEXT_LENGTH) {
  if (typeof input !== "string" || !input) return "";
  const limit = boundedNonNegativeInteger(maxLength, DEFAULT_DYNAMIC_TASK_GRAPH_MAX_TEXT_LENGTH, ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_TEXT_LENGTH);
  const cleaned = input
    .replace(/\\r\\n|\\n|\\r/g, "\n")
    .replace(PRIVATE_KEY_BLOCK_MARKER, "\n")
    .split(/\r?\n/)
    .map((rawLine) => ({ rawLine, publicLine: controlCharactersAsSpaces(rawLine) }))
    .filter(({ rawLine, publicLine }) => !isPromptLikeOrPrivateLine(rawLine) && !isPromptLikeOrPrivateLine(publicLine))
    .map(({ publicLine }) => stripMarkdownLinePrefix(publicLine))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || isPromptLikeOrPrivateLine(cleaned)) return "";
  return truncateText(cleaned, limit);
}

function toPublicString(value: unknown, maxLength: number) {
  return typeof value === "string" ? normalizeDynamicTaskPublicText(value, maxLength) : "";
}

function stableKeyFromText(value: unknown) {
  const text = toPublicString(value, DYNAMIC_TASK_GRAPH_STABLE_KEY_MAX_LENGTH * 2);
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/[._-]{2,}/g, (match) => match[0] ?? "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, DYNAMIC_TASK_GRAPH_STABLE_KEY_MAX_LENGTH)
    .replace(/[._-]+$/g, "");
}

function referenceKeyFromText(value: unknown) {
  const text = toPublicString(value, DYNAMIC_TASK_GRAPH_STABLE_KEY_MAX_LENGTH * 2);
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^a-z0-9._~-]+/g, "-")
    .replace(/[._~-]{2,}/g, (match) => match[0] ?? "-")
    .replace(/^[._~-]+|[._~-]+$/g, "")
    .slice(0, DYNAMIC_TASK_GRAPH_STABLE_KEY_MAX_LENGTH)
    .replace(/[._~-]+$/g, "");
}

export function normalizeDynamicTaskStableKey(input: string | undefined, fallback = "task") {
  return stableKeyFromText(input) || stableKeyFromText(fallback) || "task";
}

function stableKeyPrefixForSuffix(base: string, suffix: string) {
  return base.slice(0, Math.max(1, DYNAMIC_TASK_GRAPH_STABLE_KEY_MAX_LENGTH - suffix.length)).replace(/[._-]+$/g, "") || "task";
}

function uniqueStableKey(base: string, usedStableKeys: ReadonlySet<string>) {
  if (!usedStableKeys.has(base)) return base;
  let index = 2;
  while (true) {
    const suffix = `~${index}`;
    const candidate = `${stableKeyPrefixForSuffix(base, suffix)}${suffix}`;
    if (!usedStableKeys.has(candidate)) return candidate;
    index += 1;
  }
}

function inputListValues(input: unknown) {
  return typeof input === "string" ? [input] : Array.isArray(input) ? input : [];
}

function inputListItemCount(input: unknown) {
  return typeof input === "string" ? 1 : Array.isArray(input) ? input.length : 0;
}

function cappedInputListValues(input: unknown) {
  return inputListValues(input).slice(0, ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_LIST_ITEMS);
}

function cappedList(values: readonly string[], maxListItems: number) {
  return maxListItems <= 0 ? [] : values.slice(0, maxListItems);
}

function normalizeUniqueList(input: unknown, normalizeValue: (value: unknown) => string) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of cappedInputListValues(input)) {
    const normalized = normalizeValue(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function normalizeAllPublicList(input: unknown, limits: DynamicTaskGraphPreviewLimits, maxTextLength = limits.maxTextLength) {
  return normalizeUniqueList(input, (value) => toPublicString(value, maxTextLength));
}

function normalizePublicList(input: unknown, limits: DynamicTaskGraphPreviewLimits) {
  return cappedList(normalizeAllPublicList(input, limits), limits.maxListItems);
}

function hasUnredactedSecretishDynamicTaskGraphWriteText(value: string) {
  const redactionNeutral = value
    .split(REDACTED_SECRETISH_EVIDENCE_PATH).join("")
    .split(REDACTED_DYNAMIC_TASK_GRAPH_SESSION_PATH).join("")
    .split(REDACTED_DYNAMIC_TASK_GRAPH_LONG_TOKEN).join("");
  const compact = redactionNeutral.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
  return redactionNeutral.trim().length > 0 && (isSecretishLineageEvidenceText(redactionNeutral) || DYNAMIC_TASK_GRAPH_COMPACT_SECRETISH_WRITE_TEXT.test(compact));
}

function sanitizeDynamicTaskGraphWriteDisplayText(input: string, maxLength = ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_TEXT_LENGTH) {
  const publicText = normalizeDynamicTaskPublicText(input, ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_TEXT_LENGTH);
  if (!publicText) return "";
  if (hasUnredactedSecretishDynamicTaskGraphWriteText(input) || hasUnredactedSecretishDynamicTaskGraphWriteText(publicText)) return REDACTED_SECRETISH_EVIDENCE_PATH;
  const redacted = publicText
    .replace(DYNAMIC_TASK_GRAPH_WRITE_DISPLAY_SESSION_PATH, REDACTED_DYNAMIC_TASK_GRAPH_SESSION_PATH)
    .replace(DYNAMIC_TASK_GRAPH_WRITE_DISPLAY_LONG_TOKEN, REDACTED_DYNAMIC_TASK_GRAPH_LONG_TOKEN)
    .replace(/\s+/g, " ")
    .trim();
  if (!redacted) return "";
  if (hasUnredactedSecretishDynamicTaskGraphWriteText(redacted)) return REDACTED_SECRETISH_EVIDENCE_PATH;
  if (redacted === REDACTED_DYNAMIC_TASK_GRAPH_SESSION_PATH || redacted === REDACTED_DYNAMIC_TASK_GRAPH_LONG_TOKEN) return redacted;
  return truncateText(redacted, boundedNonNegativeInteger(maxLength, DEFAULT_DYNAMIC_TASK_GRAPH_MAX_TEXT_LENGTH, ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_TEXT_LENGTH));
}

function normalizeAllWriteDisplayList(input: unknown, limits: DynamicTaskGraphPreviewLimits, maxTextLength = limits.maxTextLength) {
  return normalizeUniqueList(input, (value) => (typeof value === "string" ? sanitizeDynamicTaskGraphWriteDisplayText(value, maxTextLength) : ""));
}

function sanitizeWriteLockEvidenceValue(value: string) {
  const parts = value.split(DYNAMIC_TASK_GRAPH_WRITE_LOCK_CONFLICT_SEPARATOR);
  if (parts.length > 1) {
    const safeParts = parts
      .map((part) => sanitizeDynamicTaskGraphWriteDisplayText(part, ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_TEXT_LENGTH))
      .filter(Boolean);
    return safeParts.length ? safeParts.join(DYNAMIC_TASK_GRAPH_WRITE_LOCK_CONFLICT_SEPARATOR) : "";
  }
  return sanitizeDynamicTaskGraphWriteDisplayText(value, ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_TEXT_LENGTH);
}

function sanitizeWriteLockEvidenceList(values: readonly string[], maxListItems: number) {
  if (maxListItems <= 0) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const safe = sanitizeWriteLockEvidenceValue(value);
    if (!safe || seen.has(safe)) continue;
    seen.add(safe);
    out.push(safe);
  }
  return cappedList(out, maxListItems);
}

function normalizeAllReferenceList(input: unknown) {
  return normalizeUniqueList(input, referenceKeyFromText);
}

const DYNAMIC_TASK_GRAPH_CAPPED_LIST_FIELDS = ["dependsOn", "blockedBy", "writeScope", "expectedWritePaths", "acceptanceCriteria", "suggestedChecks"] as const satisfies readonly DynamicTaskGraphPreviewListWarningField[];

function listInputCapWarning(record: Record<string, unknown>, field: DynamicTaskGraphPreviewListWarningField, seedIndex: number, stableKey: string): DynamicTaskGraphPreviewWarning | undefined {
  const inputItemCount = inputListItemCount(record[field]);
  if (inputItemCount <= ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_LIST_ITEMS) return undefined;
  const cappedItemCount = inputItemCount - ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_LIST_ITEMS;
  return {
    code: "list_items_capped",
    message: `Task "${stableKey}" field "${field}" ignored ${cappedItemCount} item(s) beyond absolute maxListItems=${ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_LIST_ITEMS}.`,
    seedIndex,
    stableKey,
    field,
    inputItemCount,
    acceptedItemCount: ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_LIST_ITEMS,
    cappedItemCount,
    absoluteMaxListItems: ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_LIST_ITEMS,
  };
}

function listInputCapWarnings(record: Record<string, unknown>, seedIndex: number, stableKey: string) {
  return DYNAMIC_TASK_GRAPH_CAPPED_LIST_FIELDS.flatMap((field) => {
    const warning = listInputCapWarning(record, field, seedIndex, stableKey);
    return warning ? [warning] : [];
  });
}

function seedRecord(seed: unknown): Record<string, unknown> {
  return seed && typeof seed === "object" && !Array.isArray(seed) ? (seed as Record<string, unknown>) : {};
}

function firstNonEmpty(...values: readonly string[]) {
  return values.find((value) => value.length > 0) ?? "";
}

function normalizePriority(value: unknown, maxLength: number) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return toPublicString(value, Math.min(maxLength, 40));
}

function collapseSafePathSegments(value: string) {
  const isAbsolute = value.startsWith("/");
  const segments: string[] = [];
  for (const segment of value.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      const previous = segments[segments.length - 1];
      if (previous && previous !== "..") segments.pop();
      else if (!isAbsolute) segments.push(segment);
      continue;
    }
    segments.push(segment);
  }
  const collapsed = segments.join("/");
  if (!collapsed) return isAbsolute ? "/" : ".";
  return isAbsolute ? `/${collapsed}` : collapsed;
}

function normalizeWriteLock(value: string) {
  const normalized = value
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\/{2,}/g, "/")
    .replace(/\/+$/g, "");
  const collapsed = collapseSafePathSegments(normalized);
  return collapsed === "/" || collapsed === "" ? "." : collapsed;
}

function normalizedWriteLocks(writeScope: readonly string[], expectedWritePaths: readonly string[]) {
  const seen = new Set<string>();
  const locks: string[] = [];
  for (const value of [...writeScope, ...expectedWritePaths]) {
    const lock = normalizeWriteLock(value);
    if (!lock || seen.has(lock)) continue;
    seen.add(lock);
    locks.push(lock);
  }
  return locks;
}

function worktreeEligibilityAnnotation(normalizedWriteLocks: readonly string[], hasDeclaredWriteLocks = normalizedWriteLocks.length > 0): DynamicTaskGraphWorktreeEligibilityAnnotation {
  if (!hasDeclaredWriteLocks) {
    return {
      eligible: false,
      code: "unknown_writes",
      reason: "No write scopes or expected write paths were declared; preview cannot prove same-batch write isolation, so this node is treated conservatively.",
      normalizedWriteLocks: [],
    };
  }
  return {
    eligible: true,
    code: "declared_writes",
    reason: "Declared write scopes or expected write paths can be compared for advisory same-batch isolation.",
    normalizedWriteLocks,
  };
}

interface NormalizedDynamicTaskGraphSeed {
  readonly node: DynamicTaskGraphPreviewNode;
  readonly dependencyReferences: readonly string[];
  readonly internalWriteLocks: readonly string[];
  readonly warnings: readonly DynamicTaskGraphPreviewWarning[];
}

function uniqueDependencyReferences(dependsOn: readonly string[], blockedBy: readonly string[]) {
  const seen = new Set<string>();
  const references: string[] = [];
  for (const reference of [...dependsOn, ...blockedBy]) {
    if (seen.has(reference)) continue;
    seen.add(reference);
    references.push(reference);
  }
  return references;
}

function normalizeSeed(seed: unknown, seedIndex: number, limits: DynamicTaskGraphPreviewLimits, usedStableKeys: Set<string>): NormalizedDynamicTaskGraphSeed {
  const record = seedRecord(seed);
  const order = seedIndex + 1;
  const sourceKey = stableKeyFromText(record.key);
  const sourceId = stableKeyFromText(record.id);
  const title = firstNonEmpty(toPublicString(record.title, 140), toPublicString(record.description, 140), `Dynamic task ${order}`);
  const description = toPublicString(record.description, limits.maxTextLength);
  const baseStableKey = firstNonEmpty(sourceKey, sourceId, stableKeyFromText(record.title), stableKeyFromText(record.description), `task-${order}`);
  const stableKey = uniqueStableKey(baseStableKey, usedStableKeys);
  usedStableKeys.add(stableKey);
  const priority = normalizePriority(record.priority, limits.maxTextLength);
  const allDependsOn = normalizeAllReferenceList(record.dependsOn);
  const allBlockedBy = normalizeAllReferenceList(record.blockedBy);
  const allWriteScope = normalizeAllWriteDisplayList(record.writeScope, limits);
  const allExpectedWritePaths = normalizeAllWriteDisplayList(record.expectedWritePaths, limits);
  const allWriteScopeLocks = normalizeAllPublicList(record.writeScope, limits, ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_TEXT_LENGTH);
  const allExpectedWritePathLocks = normalizeAllPublicList(record.expectedWritePaths, limits, ABSOLUTE_DYNAMIC_TASK_GRAPH_MAX_TEXT_LENGTH);
  const writeLocks = normalizedWriteLocks(allWriteScopeLocks, allExpectedWritePathLocks);
  const publicWriteLocks = sanitizeWriteLockEvidenceList(writeLocks, limits.maxListItems);
  const node: DynamicTaskGraphPreviewNode = {
    order,
    seedIndex,
    stableKey,
    title,
    description,
    dependsOn: cappedList(allDependsOn, limits.maxListItems),
    blockedBy: cappedList(allBlockedBy, limits.maxListItems),
    writeScope: cappedList(allWriteScope, limits.maxListItems),
    expectedWritePaths: cappedList(allExpectedWritePaths, limits.maxListItems),
    acceptanceCriteria: normalizePublicList(record.acceptanceCriteria, limits),
    suggestedChecks: normalizePublicList(record.suggestedChecks, limits),
    worktreeEligibility: worktreeEligibilityAnnotation(publicWriteLocks, writeLocks.length > 0),
    ...(priority ? { priority } : {}),
    ...(sourceKey ? { sourceKey } : {}),
    ...(sourceId ? { sourceId } : {}),
  };
  return {
    node,
    dependencyReferences: uniqueDependencyReferences(allDependsOn, allBlockedBy),
    internalWriteLocks: writeLocks,
    warnings: listInputCapWarnings(record, seedIndex, stableKey),
  };
}

function compareStrings(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function comparePreviewNodes(left: DynamicTaskGraphPreviewNode, right: DynamicTaskGraphPreviewNode) {
  return compareStrings(left.stableKey, right.stableKey) || left.order - right.order;
}

function dependencyAliasMap(normalizedNodes: readonly NormalizedDynamicTaskGraphSeed[]) {
  const aliases = new Map<string, string>();
  const ambiguousAliases = new Set<string>();
  const addAlias = (alias: string | undefined, stableKey: string) => {
    if (!alias) return;
    const existingStableKey = aliases.get(alias);
    if (!existingStableKey) {
      aliases.set(alias, stableKey);
      return;
    }
    if (existingStableKey !== stableKey) ambiguousAliases.add(alias);
  };
  for (const { node } of normalizedNodes) addAlias(node.stableKey, node.stableKey);
  for (const { node } of normalizedNodes) {
    addAlias(node.sourceKey, node.stableKey);
    addAlias(node.sourceId, node.stableKey);
  }
  return { aliases, ambiguousAliases };
}

function resolveDependencyGraph(normalizedNodes: readonly NormalizedDynamicTaskGraphSeed[]) {
  const { aliases, ambiguousAliases } = dependencyAliasMap(normalizedNodes);
  const dependenciesByStableKey = new Map<string, Set<string>>();
  const errors: DynamicTaskGraphPreviewError[] = [];
  for (const { node, dependencyReferences } of normalizedNodes) {
    const dependencies = new Set<string>();
    for (const reference of dependencyReferences) {
      const normalizedReference = stableKeyFromText(reference);
      const ambiguousReference = [reference, normalizedReference].find((candidate) => candidate && ambiguousAliases.has(candidate));
      if (ambiguousReference) {
        errors.push({
          code: "ambiguous_dependency",
          message: `Task "${node.stableKey}" references ambiguous dependency "${reference}".`,
          seedIndex: node.seedIndex,
          stableKey: node.stableKey,
          dependencyReference: reference,
        });
        continue;
      }
      const dependencyStableKey = aliases.get(reference) ?? aliases.get(normalizedReference);
      if (!dependencyStableKey) {
        errors.push({
          code: "unknown_dependency",
          message: `Task "${node.stableKey}" references unknown dependency "${reference}".`,
          seedIndex: node.seedIndex,
          stableKey: node.stableKey,
          dependencyReference: reference,
        });
        continue;
      }
      dependencies.add(dependencyStableKey);
    }
    dependenciesByStableKey.set(node.stableKey, dependencies);
  }
  return { dependenciesByStableKey, errors };
}

function canonicalCycleKey(cycle: readonly string[]) {
  const openCycle = cycle.slice(0, -1);
  if (openCycle.length === 0) return cycle.join("\u0000");
  const rotations = openCycle.map((_, index) => [...openCycle.slice(index), ...openCycle.slice(0, index)].join("\u0000"));
  return rotations.sort(compareStrings)[0] ?? cycle.join("\u0000");
}

function dependencyCycleErrors(nodes: readonly DynamicTaskGraphPreviewNode[], dependenciesByStableKey: ReadonlyMap<string, ReadonlySet<string>>) {
  const states = new Map<string, "visiting" | "visited">();
  const stack: string[] = [];
  const seenCycles = new Set<string>();
  const errors: DynamicTaskGraphPreviewError[] = [];

  const visit = (stableKey: string) => {
    states.set(stableKey, "visiting");
    stack.push(stableKey);
    const dependencies = [...(dependenciesByStableKey.get(stableKey) ?? [])].sort(compareStrings);
    for (const dependencyStableKey of dependencies) {
      const dependencyState = states.get(dependencyStableKey);
      if (dependencyState === "visiting") {
        const cycleStart = stack.indexOf(dependencyStableKey);
        const cycle = [...stack.slice(cycleStart), dependencyStableKey];
        const cycleKey = canonicalCycleKey(cycle);
        if (!seenCycles.has(cycleKey)) {
          seenCycles.add(cycleKey);
          errors.push({
            code: "dependency_cycle",
            message: `Dependency cycle detected: ${cycle.join(" -> ")}.`,
            stableKey: cycle[0],
            cycle,
          });
        }
        continue;
      }
      if (!dependencyState) visit(dependencyStableKey);
    }
    stack.pop();
    states.set(stableKey, "visited");
  };

  for (const node of [...nodes].sort(comparePreviewNodes)) {
    if (!states.has(node.stableKey)) visit(node.stableKey);
  }
  return errors;
}

const GLOB_WRITE_LOCK_MARKER = /[*?[\]{}]/;

function hasGlobWriteLockMarker(value: string) {
  return GLOB_WRITE_LOCK_MARKER.test(value);
}

function escapeRegExp(value: string) {
  return value.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
}

function globWriteLockToRegExp(value: string) {
  let source = "^";
  for (let index = 0; index < value.length;) {
    if (value.startsWith("**/", index)) {
      source += "(?:.*/)?";
      index += 3;
      continue;
    }
    if (value.startsWith("**", index)) {
      source += ".*";
      index += 2;
      continue;
    }
    const character = value[index] ?? "";
    if (character === "*") source += "[^/]*";
    else if (character === "?") source += "[^/]";
    else source += escapeRegExp(character);
    index += 1;
  }
  return new RegExp(`${source}$`);
}

function globWriteLockLiteralPrefix(value: string) {
  const globIndex = value.search(GLOB_WRITE_LOCK_MARKER);
  return globIndex < 0 ? value : value.slice(0, globIndex);
}

function literalCouldMatchGlobPrefix(glob: string, literal: string) {
  const prefix = globWriteLockLiteralPrefix(glob);
  return !prefix || literal.startsWith(prefix);
}

function globPrefixesMayOverlap(left: string, right: string) {
  const leftPrefix = globWriteLockLiteralPrefix(left);
  const rightPrefix = globWriteLockLiteralPrefix(right);
  if (!leftPrefix || !rightPrefix) return true;
  return leftPrefix.startsWith(rightPrefix) || rightPrefix.startsWith(leftPrefix);
}

function globWriteLocksMayOverlap(left: string, right: string) {
  const leftGlob = hasGlobWriteLockMarker(left);
  const rightGlob = hasGlobWriteLockMarker(right);
  if (!leftGlob && !rightGlob) return false;
  if (leftGlob && globWriteLockToRegExp(left).test(right)) return true;
  if (rightGlob && globWriteLockToRegExp(right).test(left)) return true;
  if (leftGlob && !rightGlob) return literalCouldMatchGlobPrefix(left, right);
  if (rightGlob && !leftGlob) return literalCouldMatchGlobPrefix(right, left);
  return globPrefixesMayOverlap(left, right);
}

function writeLocksOverlap(left: string, right: string) {
  return left === "." || right === "." || left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`) || globWriteLocksMayOverlap(left, right);
}

function overlappingWriteLocks(left: readonly string[], right: readonly string[]) {
  const seen = new Set<string>();
  const overlaps: string[] = [];
  for (const leftLock of left) {
    for (const rightLock of right) {
      if (!writeLocksOverlap(leftLock, rightLock)) continue;
      const overlap = leftLock === rightLock ? leftLock : `${leftLock} <-> ${rightLock}`;
      if (seen.has(overlap)) continue;
      seen.add(overlap);
      overlaps.push(overlap);
    }
  }
  return overlaps.sort(compareStrings);
}

function batchConflictForNode(
  candidate: DynamicTaskGraphPreviewNode,
  selectedNodes: readonly DynamicTaskGraphPreviewNode[],
  internalWriteLocksByStableKey: ReadonlyMap<string, readonly string[]>,
  maxEvidenceItems: number,
): DynamicTaskGraphPreviewBatchHeldNode | undefined {
  const candidateLocks = internalWriteLocksByStableKey.get(candidate.stableKey) ?? candidate.worktreeEligibility.normalizedWriteLocks;
  for (const selectedNode of selectedNodes) {
    const selectedLocks = internalWriteLocksByStableKey.get(selectedNode.stableKey) ?? selectedNode.worktreeEligibility.normalizedWriteLocks;
    if (candidateLocks.length === 0 || selectedLocks.length === 0) {
      return {
        stableKey: candidate.stableKey,
        reason: "unknown_writes_conflict",
        message: `Task "${candidate.stableKey}" is held because unknown write scope cannot be proven disjoint from "${selectedNode.stableKey}".`,
        conflictWith: selectedNode.stableKey,
      };
    }
    const conflictingWriteLocks = overlappingWriteLocks(candidateLocks, selectedLocks);
    if (conflictingWriteLocks.length > 0) {
      return {
        stableKey: candidate.stableKey,
        reason: "write_conflict",
        message: `Task "${candidate.stableKey}" is held because its normalized write locks overlap with "${selectedNode.stableKey}".`,
        conflictWith: selectedNode.stableKey,
        conflictingWriteLocks: sanitizeWriteLockEvidenceList(conflictingWriteLocks, maxEvidenceItems),
      };
    }
  }
  return undefined;
}

function buildReadyBatches(
  nodes: readonly DynamicTaskGraphPreviewNode[],
  dependenciesByStableKey: ReadonlyMap<string, ReadonlySet<string>>,
  maxParallel: number,
  internalWriteLocksByStableKey: ReadonlyMap<string, readonly string[]>,
  maxEvidenceItems: number,
) {
  const pending = new Set(nodes.map((node) => node.stableKey));
  const completed = new Set<string>();
  const batches: DynamicTaskGraphPreviewReadyBatch[] = [];

  while (pending.size > 0) {
    const candidates = [...nodes]
      .filter((node) => pending.has(node.stableKey) && [...(dependenciesByStableKey.get(node.stableKey) ?? [])].every((dependency) => completed.has(dependency)))
      .sort(comparePreviewNodes);
    if (candidates.length === 0) break;

    const selectedNodes: DynamicTaskGraphPreviewNode[] = [];
    const held: DynamicTaskGraphPreviewBatchHeldNode[] = [];
    for (const candidate of candidates) {
      if (selectedNodes.length >= maxParallel) {
        held.push({
          stableKey: candidate.stableKey,
          reason: "max_parallel",
          message: `Task "${candidate.stableKey}" is held because maxParallel=${maxParallel} was reached for this batch.`,
        });
        continue;
      }
      const conflict = batchConflictForNode(candidate, selectedNodes, internalWriteLocksByStableKey, maxEvidenceItems);
      if (conflict) {
        held.push(conflict);
        continue;
      }
      selectedNodes.push(candidate);
    }

    for (const selectedNode of selectedNodes) {
      pending.delete(selectedNode.stableKey);
      completed.add(selectedNode.stableKey);
    }
    batches.push({
      index: batches.length + 1,
      nodeStableKeys: selectedNodes.map((node) => node.stableKey),
      held,
    });
  }

  return batches;
}

export function previewDynamicTaskGraph(seeds: readonly DynamicTaskGraphSeed[], options: PreviewDynamicTaskGraphOptions = {}): DynamicTaskGraphPreviewResult {
  const seedList: readonly unknown[] = Array.isArray(seeds) ? seeds : [];
  const limits = previewLimits(options);
  const cappedSeeds = seedList.slice(0, limits.maxSeeds);
  const usedStableKeys = new Set<string>();
  const normalizedNodes = cappedSeeds.map((seed, seedIndex) => normalizeSeed(seed, seedIndex, limits, usedStableKeys));
  const nodes = normalizedNodes.map(({ node }) => node);
  const cappedSeedCount = Math.max(0, seedList.length - cappedSeeds.length);
  const seedCapWarnings: DynamicTaskGraphPreviewWarning[] = cappedSeedCount
    ? [
        {
          code: "seeds_capped",
          message: `Ignored ${cappedSeedCount} seed(s) beyond maxSeeds=${limits.maxSeeds}.`,
          inputSeedCount: seedList.length,
          acceptedSeedCount: nodes.length,
        },
      ]
    : [];
  const warnings: DynamicTaskGraphPreviewWarning[] = [...seedCapWarnings, ...normalizedNodes.flatMap(({ warnings }) => warnings)];
  const internalWriteLocksByStableKey = new Map(normalizedNodes.map(({ node, internalWriteLocks }) => [node.stableKey, internalWriteLocks] as const));
  const resolvedDependencies = resolveDependencyGraph(normalizedNodes);
  const errors: DynamicTaskGraphPreviewError[] = [
    ...resolvedDependencies.errors,
    ...dependencyCycleErrors(nodes, resolvedDependencies.dependenciesByStableKey),
  ];
  const batches = errors.length === 0 ? buildReadyBatches(nodes, resolvedDependencies.dependenciesByStableKey, limits.maxParallel, internalWriteLocksByStableKey, limits.maxListItems) : [];
  return {
    version: DYNAMIC_TASK_GRAPH_PREVIEW_VERSION,
    valid: errors.length === 0,
    inputSeedCount: seedList.length,
    acceptedSeedCount: nodes.length,
    cappedSeedCount,
    limits,
    nodes,
    batches,
    warnings,
    errors,
  };
}
