import type { CustomGraphStageSettings, TaskKind, TaskNode, TaskNodeDescriptor, TaskNodeDescriptorInput } from "./schema";
import { REDACTED_SECRETISH_EVIDENCE_PATH, sanitizeRootWorkDisplayText } from "./root-work-lineage";
import { slugify } from "./store";

const PROMPT_DETAIL_TEXT_MARKER = /\b(?:promptInstructions|projectPromptInstructions|readyPrompt|workerPrompt|systemPrompt|hiddenPrompt|promptTemplate)\b/i;
const DEDUPE_SUFFIX = /~\d+$/;
const DESCRIPTOR_SESSION_PATH_PLACEHOLDER = "[redacted-session-path]";
const DESCRIPTOR_LONG_TOKEN_PLACEHOLDER = "[redacted-long-token]";
const DESCRIPTOR_LOCAL_ABSOLUTE_PATH = /\/(?:home|Users)\/[^\s),;]+(?:\/[^\s),;]+)*/gi;
const DESCRIPTOR_NORMALIZED_SEGMENT_SEPARATOR = /[._-]+/;

export const DESCRIPTOR_PROMPT_HEADER = "## Deterministic node descriptor";

export function normalizeStableKey(input: string | undefined, fallback = "task") {
  const base = (input ?? "")
    .split(/\r?\n/)
    .filter((line) => !PROMPT_DETAIL_TEXT_MARKER.test(line))
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/[._-]{2,}/g, (match) => match[0] ?? "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 120)
    .replace(/[._-]+$/g, "");
  return base || normalizeStableKey(fallback === input ? "task" : fallback, "task");
}

export function normalizeDescriptorText(input: string | undefined, maxLength = 240) {
  if (!input) return "";
  const cleaned = input
    .split(/\r?\n/)
    .filter((line) => !PROMPT_DETAIL_TEXT_MARKER.test(line))
    .join(" ")
    .replace(/^#+\s*/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || PROMPT_DETAIL_TEXT_MARKER.test(cleaned)) return "";
  return cleaned.length > maxLength ? `${cleaned.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…` : cleaned;
}

export function normalizeDescriptorList(input: readonly string[] | undefined, maxLength = 220) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of input ?? []) {
    if (typeof item !== "string") continue;
    const normalized = normalizeDescriptorText(item, maxLength);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function descriptorPromptPublicText(input: string) {
  return input
    .split(/\r?\n/)
    .filter((line) => !PROMPT_DETAIL_TEXT_MARKER.test(line))
    .join("\n");
}

function redactDescriptorLocalPaths(input: string) {
  return input.replace(DESCRIPTOR_LOCAL_ABSOLUTE_PATH, DESCRIPTOR_SESSION_PATH_PLACEHOLDER);
}

function descriptorRedactionPlaceholderFor(input: string) {
  if (input.includes(REDACTED_SECRETISH_EVIDENCE_PATH)) return REDACTED_SECRETISH_EVIDENCE_PATH;
  if (input.includes(DESCRIPTOR_SESSION_PATH_PLACEHOLDER)) return DESCRIPTOR_SESSION_PATH_PLACEHOLDER;
  if (input.includes(DESCRIPTOR_LONG_TOKEN_PLACEHOLDER)) return DESCRIPTOR_LONG_TOKEN_PLACEHOLDER;
  return "";
}

function looksLikeNormalizedSessionPathStableKey(input: string | undefined) {
  if (!input) return false;
  const normalized = normalizeStableKey(input);
  const parts = normalized.split(DESCRIPTOR_NORMALIZED_SEGMENT_SEPARATOR).filter(Boolean);
  if (parts.length < 4) return false;
  const first = parts[0];
  if (first !== "home" && first !== "users") return false;
  return parts.some((part, index) => index >= 2 && /^sessions?$/.test(part));
}

export function sanitizeDescriptorPromptText(input: string | undefined, maxLength = 240) {
  if (!input) return "";
  const publicText = redactDescriptorLocalPaths(descriptorPromptPublicText(input));
  const cleaned = sanitizeRootWorkDisplayText(publicText, "", maxLength)
    .replace(/^#+\s*/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || PROMPT_DETAIL_TEXT_MARKER.test(cleaned)) return "";
  return cleaned;
}

export function sanitizeDescriptorStableKeyForDisplay(input: string | undefined, fallback = "task", maxLength = 160) {
  const rawSafe = sanitizeDescriptorPromptText(input, maxLength);
  const rawPlaceholder = descriptorRedactionPlaceholderFor(rawSafe);
  if (rawPlaceholder) return rawPlaceholder;
  if (looksLikeNormalizedSessionPathStableKey(input) || looksLikeNormalizedSessionPathStableKey(rawSafe)) return DESCRIPTOR_SESSION_PATH_PLACEHOLDER;

  const normalized = normalizeStableKey(rawSafe || input, fallback);
  if (looksLikeNormalizedSessionPathStableKey(normalized)) return DESCRIPTOR_SESSION_PATH_PLACEHOLDER;
  const normalizedSafe = sanitizeDescriptorPromptText(normalized, maxLength);
  const normalizedPlaceholder = descriptorRedactionPlaceholderFor(normalizedSafe);
  if (normalizedPlaceholder) return normalizedPlaceholder;
  return normalizedSafe || normalizeStableKey(fallback);
}

function sanitizeDescriptorPromptList(input: readonly string[] | undefined, maxLength = 220) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of input ?? []) {
    if (typeof item !== "string") continue;
    const safe = sanitizeDescriptorPromptText(item, maxLength);
    if (!safe || seen.has(safe)) continue;
    seen.add(safe);
    out.push(safe);
  }
  return out;
}

function positiveOrder(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function firstNonEmpty(...values: Array<string | undefined>) {
  for (const value of values) {
    const normalized = normalizeDescriptorText(value);
    if (normalized) return normalized;
  }
  return "Execute this task graph node within its bounded scope.";
}

function baseStableKey(key: string) {
  return normalizeStableKey(key.replace(DEDUPE_SUFFIX, ""));
}

function suffixStableKey(base: string, usedStableKeys: ReadonlySet<string>) {
  if (!usedStableKeys.has(base)) return base;
  let index = 2;
  while (usedStableKeys.has(`${base}~${index}`)) index += 1;
  return `${base}~${index}`;
}

export function fallbackStableKeyForTask(task: Pick<TaskNode, "kind" | "title" | "metadata">, order: number) {
  const metadata = task.metadata as Record<string, unknown>;
  const customGraph = typeof metadata.customGraph === "string" ? metadata.customGraph : undefined;
  const customStageId = typeof metadata.customStageId === "string" ? metadata.customStageId : undefined;
  if (customGraph && customStageId) return normalizeStableKey(`custom.${customGraph}.${customStageId}`);

  const decompStableKey = typeof metadata.decompositionStableKey === "string" ? metadata.decompositionStableKey : undefined;
  if (decompStableKey) return normalizeStableKey(decompStableKey);

  const enumeratedItemId = typeof metadata.enumeratedItemId === "string" ? metadata.enumeratedItemId : undefined;
  if (enumeratedItemId) return normalizeStableKey(`item.${enumeratedItemId}.${stageKeyForKind(task.kind, task.title)}`);

  const formula = typeof metadata.formula === "string" ? metadata.formula : undefined;
  if (formula === "autoimprove" || metadata.autoimprove === true) return normalizeStableKey(`autoimprove.${stageKeyForKind(task.kind, task.title)}`);
  if (formula === "fulcrum" || metadata.pressureTest === true) return normalizeStableKey(`pdo.${stageKeyForKind(task.kind, task.title)}`);
  if (formula === "stageChain") return normalizeStableKey(`todo.${stageKeyForKind(task.kind, task.title)}`);

  const source = typeof metadata.source === "string" ? metadata.source.replace(/-command$/, "") : "task";
  const namespace = source && source !== "task-graph" ? source : "task";
  return normalizeStableKey(`${namespace}.${stageKeyForKind(task.kind, task.title) || `stage-${order}`}`);
}

export function stageKeyForKind(kind: TaskKind, title?: string) {
  const lowerTitle = (title ?? "").toLowerCase();
  if (kind === "PLAN") return "plan";
  if (kind === "ORACLE_CONSULT") return "oracle";
  if (kind === "DECOMPOSE") return "decompose";
  if (kind === "GRILL") return lowerTitle.includes("autoimprove") ? "contract" : "decisions";
  if (kind === "GO") return "launch";
  if (kind === "IMPLEMENT") return lowerTitle.includes("improve goal") ? "implement" : "implement";
  if (kind === "GOAL_TEST") return "goal-test";
  if (kind === "EVALUATE") return "evaluate";
  if (kind === "COMPILE") return "compile";
  if (kind === "UNIT_TEST") return "unit-test";
  if (kind === "PERF_TEST") return "perf-test";
  if (kind === "CODE_REVIEW") return "review";
  if (kind === "RESTART") return "restart";
  if (kind === "API_TEST") return "api-test";
  if (kind === "E2E_TEST") return "e2e-test";
  if (kind === "UX_REVIEW") return "ux-review";
  if (kind === "SPEC_UPDATE") return "spec-update";
  if (kind === "LINT") return "lint";
  if (kind === "COMMIT") return "commit";
  if (kind === "PUSH") return "push";
  if (kind === "CI_FOLLOW") return "ci-follow";
  if (kind === "CI_FIXUP") return "ci-fixup";
  if (kind === "DIRECT") return "direct";
  return normalizeStableKey(slugify(title || kind.toLowerCase(), 48));
}

function defaultWriteScope(task?: Pick<TaskNode, "metadata" | "runner">, explicit?: readonly string[]) {
  const metadata = task?.metadata as Record<string, unknown> | undefined;
  const metadataPaths = Array.isArray(metadata?.expectedWritePaths) ? metadata.expectedWritePaths.filter((item): item is string => typeof item === "string") : [];
  const runnerPaths = task?.runner?.writePolicy.declaredPaths ?? [];
  return normalizeDescriptorList(explicit?.length ? explicit : metadataPaths.length ? metadataPaths : runnerPaths.length ? runnerPaths : [task?.runner.sideEffects === "write" ? "bounded task write scope" : "read-only or report-only task scope"]);
}

function defaultAcceptanceChecks(task?: Pick<TaskNode, "metadata">, explicit?: readonly string[]) {
  const metadata = task?.metadata as Record<string, unknown> | undefined;
  const criteria = Array.isArray(metadata?.acceptanceCriteria) ? metadata.acceptanceCriteria.filter((item): item is string => typeof item === "string") : [];
  const checklist = task?.metadata.autoimproveObjective?.checklist ?? [];
  return normalizeDescriptorList(explicit?.length ? explicit : [...criteria, ...checklist]);
}

export function completeTaskDescriptor(args: {
  readonly taskTitle: string;
  readonly fallbackStableKey: string;
  readonly fallbackPurpose: string;
  readonly descriptor?: TaskNodeDescriptorInput;
  readonly order: number;
  readonly task?: Pick<TaskNode, "metadata" | "runner">;
  readonly usedStableKeys?: ReadonlySet<string>;
}): TaskNodeDescriptor {
  const descriptor = args.descriptor ?? {};
  const baseKey = baseStableKey(descriptor.stableKey ?? args.fallbackStableKey);
  const stableKey = args.usedStableKeys ? suffixStableKey(baseKey, args.usedStableKeys) : baseKey;
  const purpose = firstNonEmpty(descriptor.purpose, args.fallbackPurpose, args.taskTitle);
  const acceptanceChecks = defaultAcceptanceChecks(args.task, descriptor.acceptanceChecks);
  const writeScope = defaultWriteScope(args.task, descriptor.writeScope);
  return {
    version: 1,
    stableKey,
    purpose,
    inputs: normalizeDescriptorList(descriptor.inputs),
    outputs: normalizeDescriptorList(descriptor.outputs),
    artifacts: normalizeDescriptorList(descriptor.artifacts),
    acceptanceChecks,
    writeScope,
    isolationBoundary: normalizeDescriptorList(descriptor.isolationBoundary?.length ? descriptor.isolationBoundary : ["Stay within this node's purpose and declared task scope.", "Do not commit, push, or change task graph dependencies unless this task explicitly says so."]),
    order: positiveOrder(descriptor.order, args.order),
  };
}

export function descriptorInputFromStage(stage: CustomGraphStageSettings): TaskNodeDescriptorInput | undefined {
  const descriptor = stage.descriptor;
  const input: TaskNodeDescriptorInput = {
    ...(descriptor ?? {}),
    stableKey: stage.stableKey ?? descriptor?.stableKey,
    purpose: stage.purpose ?? descriptor?.purpose,
    inputs: stage.inputs ?? descriptor?.inputs,
    outputs: stage.outputs ?? descriptor?.outputs,
    artifacts: stage.artifacts ?? descriptor?.artifacts,
    acceptanceChecks: stage.acceptanceChecks ?? descriptor?.acceptanceChecks,
    writeScope: stage.writeScope ?? descriptor?.writeScope,
    isolationBoundary: stage.isolationBoundary ?? descriptor?.isolationBoundary,
    order: stage.order ?? descriptor?.order,
  };
  return Object.values(input).some((value) => value !== undefined) ? input : undefined;
}

export function normalizeDescriptorInput(value: unknown, label = "descriptor"): TaskNodeDescriptorInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const input = value as Record<string, unknown>;
  const out: TaskNodeDescriptorInput = {};
  if (input.stableKey !== undefined) {
    if (typeof input.stableKey !== "string" || !input.stableKey.trim()) throw new Error(`${label}.stableKey must be a non-empty string`);
    out.stableKey = normalizeStableKey(input.stableKey);
  }
  if (input.purpose !== undefined) {
    if (typeof input.purpose !== "string" || !normalizeDescriptorText(input.purpose)) throw new Error(`${label}.purpose must be a non-empty string`);
    out.purpose = normalizeDescriptorText(input.purpose);
  }
  for (const key of ["inputs", "outputs", "artifacts", "acceptanceChecks", "writeScope", "isolationBoundary"] as const) {
    if (input[key] !== undefined) {
      if (!Array.isArray(input[key])) throw new Error(`${label}.${key} must be an array of strings`);
      out[key] = normalizeDescriptorList(input[key] as string[]);
    }
  }
  if (input.order !== undefined) {
    if (typeof input.order !== "number" || !Number.isInteger(input.order) || input.order < 1) throw new Error(`${label}.order must be a positive integer`);
    out.order = input.order;
  }
  return out;
}

export function completeDescriptorForTask(task: TaskNode, order: number, usedStableKeys?: ReadonlySet<string>, options: { forceOrder?: boolean } = {}) {
  const existing = task.metadata.nodeDescriptor
    ? { ...task.metadata.nodeDescriptor, order: options.forceOrder ? order : task.metadata.nodeDescriptor.order }
    : undefined;
  return completeTaskDescriptor({
    taskTitle: task.title,
    fallbackStableKey: fallbackStableKeyForTask(task, order),
    fallbackPurpose: task.description || task.title,
    descriptor: existing,
    order,
    task,
    usedStableKeys,
  });
}

export function attachCompletedDescriptor(task: TaskNode, order: number, usedStableKeys?: ReadonlySet<string>, options: { forceOrder?: boolean } = {}) {
  task.metadata.nodeDescriptor = completeDescriptorForTask(task, order, usedStableKeys, options);
  return task;
}

export function completedDescriptorOrder(task: TaskNode, fallback: number) {
  return positiveOrder(task.metadata.nodeDescriptor?.order, fallback);
}

function orderedTasks(tasks: readonly TaskNode[]) {
  return tasks
    .map((task, index) => ({ task, index, order: completedDescriptorOrder(task, index + 1) }))
    .sort((a, b) => a.order - b.order || a.index - b.index);
}

export function completeTaskDescriptorsForRun<T extends { tasks: Record<string, TaskNode> }>(run: T): T {
  const tasks = Object.values(run.tasks);
  const used = new Set<string>();
  for (const { task, index } of orderedTasks(tasks)) {
    const descriptor = completeDescriptorForTask(task, task.metadata.nodeDescriptor?.order && task.metadata.nodeDescriptor.order > 0 ? task.metadata.nodeDescriptor.order : index + 1, used);
    task.metadata.nodeDescriptor = descriptor;
    used.add(descriptor.stableKey);
  }
  return run;
}

export function usedDescriptorStableKeys(tasks: Iterable<TaskNode>) {
  const used = new Set<string>();
  for (const task of tasks) {
    const key = task.metadata.nodeDescriptor?.stableKey;
    if (key) used.add(key);
  }
  return used;
}

function formatList(title: string, items: readonly string[]) {
  return `${title}:\n${items.length ? items.map((item) => `- ${item}`).join("\n") : "- none"}`;
}

export function renderDescriptorPromptBlock(descriptor: TaskNodeDescriptor | undefined) {
  if (!descriptor) return "";
  const safe: TaskNodeDescriptor = {
    version: 1,
    stableKey: sanitizeDescriptorStableKeyForDisplay(descriptor.stableKey, "task", 160) || REDACTED_SECRETISH_EVIDENCE_PATH,
    purpose: sanitizeDescriptorPromptText(descriptor.purpose) || "Execute this task graph node within its bounded scope.",
    inputs: sanitizeDescriptorPromptList(descriptor.inputs),
    outputs: sanitizeDescriptorPromptList(descriptor.outputs),
    artifacts: sanitizeDescriptorPromptList(descriptor.artifacts),
    acceptanceChecks: sanitizeDescriptorPromptList(descriptor.acceptanceChecks),
    writeScope: sanitizeDescriptorPromptList(descriptor.writeScope),
    isolationBoundary: sanitizeDescriptorPromptList(descriptor.isolationBoundary),
    order: positiveOrder(descriptor.order, 1),
  };
  return [
    DESCRIPTOR_PROMPT_HEADER,
    "",
    `Stable key: ${safe.stableKey}`,
    `Purpose: ${safe.purpose}`,
    `Order: ${safe.order}`,
    "",
    formatList("Inputs", safe.inputs),
    "",
    formatList("Outputs", safe.outputs),
    "",
    formatList("Artifacts", safe.artifacts),
    "",
    formatList("Write scope", safe.writeScope),
    "",
    formatList("Isolation boundary", safe.isolationBoundary),
    "",
    formatList("Acceptance checks", safe.acceptanceChecks),
  ].join("\n");
}

export function renderDescriptorStatusLine(descriptor: TaskNodeDescriptor | undefined) {
  if (!descriptor) return "";
  const key = sanitizeDescriptorStableKeyForDisplay(descriptor.stableKey, "task", 120);
  const purpose = sanitizeDescriptorPromptText(descriptor.purpose, 96) || normalizeDescriptorText(descriptor.purpose, 96);
  return purpose ? `[${key}] ${purpose}` : `[${key}]`;
}

export function renderDescriptorDisplayLabel(descriptor: TaskNodeDescriptor | undefined, fallback: string) {
  if (!descriptor) return normalizeDescriptorText(fallback, 140) || "task";
  const statusLine = renderDescriptorStatusLine(descriptor);
  return statusLine || normalizeDescriptorText(fallback, 140) || "task";
}

export function renderDescriptorFlowLabel(descriptor: TaskNodeDescriptor | undefined, fallback: string) {
  if (!descriptor) return normalizeDescriptorText(fallback, 160) || "task";
  const key = sanitizeDescriptorStableKeyForDisplay(descriptor.stableKey, "task", 120);
  const purpose = sanitizeDescriptorPromptText(descriptor.purpose, 120) || normalizeDescriptorText(descriptor.purpose, 120);
  return purpose ? `${key} · ${purpose}` : key;
}
