import * as fs from "node:fs";
import * as path from "node:path";
import {
  ROOT_WORK_KINDS,
  TASK_STATUSES,
  terminalDone,
  type AutoImproveLoopMetadata,
  type RootWorkItem,
  type RootWorkKind,
  type RootWorkQueue,
  type TaskGraphRun,
  type TaskNode,
  type TaskStatus,
} from "./schema";
import { isSafeRunId, loadRunNoCreate } from "./store";

export type RootWorkLineageEvidenceDecision = "COMPLETE" | "NOT COMPLETE" | "PENDING";
export type RootWorkLineageDisplayDecision = RootWorkLineageEvidenceDecision | "CONTINUE";

export interface RootWorkLineageEvidence {
  readonly label: string;
  readonly path: string;
  readonly decision?: RootWorkLineageEvidenceDecision;
  readonly currentRunId?: string;
  readonly priorRunId?: string;
  readonly decisionLine?: number;
  readonly currentRunLine?: number;
  readonly priorRunLine?: number;
}

export interface RootWorkLineageSuccessor {
  readonly runId: string;
  readonly status: TaskStatus | string;
  readonly iteration?: number;
  readonly decision?: RootWorkLineageDisplayDecision;
  readonly evidence?: RootWorkLineageEvidence;
  readonly note?: string;
  readonly warnings?: readonly string[];
}

export interface RootWorkLineageDisplay {
  readonly rootWorkKey: string;
  readonly activeRunId?: string;
  readonly activeRunStatus?: TaskStatus | string;
  readonly activeRunIteration?: number;
  readonly latestSuccessorRunId?: string;
  readonly latestSuccessorStatus?: TaskStatus | string;
  readonly latestSuccessorIteration?: number;
  readonly decision?: RootWorkLineageDisplayDecision;
  readonly evidence?: RootWorkLineageEvidence;
  readonly successors: readonly RootWorkLineageSuccessor[];
  readonly displayOnlyNote?: string;
  readonly warnings?: readonly string[];
}

export type RootWorkLineageByActiveRunId = Record<string, RootWorkLineageDisplay>;

export interface RootWorkLineageRenderOptions {
  readonly lineageByActiveRunId?: RootWorkLineageByActiveRunId;
}

export interface DeriveRootWorkLineageOptions {
  readonly loadRun?: (cwd: string, runId: string) => TaskGraphRun | undefined;
  readonly maxDepth?: number;
  readonly maxSuccessors?: number;
  readonly maxSuccessorsPerRun?: number;
  readonly maxEvidenceCandidates?: number;
  readonly maxEvidenceReads?: number;
  readonly maxEvidenceBytes?: number;
  readonly maxEvidenceLines?: number;
}

interface EvidenceCandidate {
  readonly rawPath: string;
  readonly source: string;
}

interface ResolvedEvidenceCandidate {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly source: string;
}

interface ParsedEvidence {
  readonly evidence: RootWorkLineageEvidence;
  readonly decision: RootWorkLineageEvidenceDecision;
}

const DEFAULT_MAX_DEPTH = 8;
const DEFAULT_MAX_SUCCESSORS = 64;
const DEFAULT_MAX_SUCCESSORS_PER_RUN = 16;
const DEFAULT_MAX_EVIDENCE_CANDIDATES = 64;
const DEFAULT_MAX_EVIDENCE_READS = 128;
const DEFAULT_MAX_EVIDENCE_BYTES = 160_000;
const DEFAULT_MAX_EVIDENCE_LINES = 700;
const MAX_WARNING_COUNT = 24;
const MAX_WARNING_LENGTH = 260;
const MAX_NOTE_LENGTH = 260;
const SAFE_MARKER_RUN_ID = /[A-Za-z0-9._:-]+/;
const MARKER_RUN_ID_ALTERNATION = "(?:`(" + SAFE_MARKER_RUN_ID.source + ")`|(" + SAFE_MARKER_RUN_ID.source + "))";
const CURRENT_RUN_MARKER = new RegExp("^\\s*-\\s*Current run:\\s*" + MARKER_RUN_ID_ALTERNATION + "\\s*$", "i");
const PRIOR_RUN_MARKER = new RegExp("^\\s*-\\s*Prior run being reconciled:\\s*" + MARKER_RUN_ID_ALTERNATION + "\\s*$", "i");
const DECISION_MARKER = /^\s*Decision:\s*(COMPLETE|NOT COMPLETE|PENDING)\s*$/i;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;
const SECRETISH_FIELD_NAME = String.raw`(?:token|secret|password|passwd|api[\s._-]*key|authorization|cookie|private[\s._-]*key)`;
const SECRETISH_LINE = new RegExp(String.raw`(?:^|[^A-Za-z0-9])${SECRETISH_FIELD_NAME}\b\s*[:=]`, "i");
const SECRETISH_EVIDENCE_TEXT = new RegExp(String.raw`(?:^|[^A-Za-z0-9])${SECRETISH_FIELD_NAME}(?:$|[^A-Za-z0-9])`, "i");
const LONG_TOKEN = /[A-Za-z0-9_+=-]{64,}/g;
const SESSION_PATH = /\/home\/[^\s)]+\/sessions[^\s)]*/g;
const LINEAGE_DISPLAY_SESSION_PATH = /\/(?:home|Users)\/[^\s)]+\/[^\s)]*sessions?[^\s)]*/gi;
const LINEAGE_DISPLAY_MARKDOWN_PATH_FRAGMENT = /(^|[\s"'(\[<{:])([^\s"'()<>{}\[\],;]+?\.(?:md|markdown))(?=$|[\s"')\]}>.,;])/gi;
export const GENERIC_MARKDOWN_EVIDENCE_LABEL = "Evidence: Markdown evidence";
export const REDACTED_SECRETISH_EVIDENCE_PATH = "[redacted-secret-shaped-evidence-path]";
export const REDACTED_LINEAGE_WARNING = "[redacted-lineage-warning]";
export const REDACTED_LINEAGE_RUN_ID = "[redacted-lineage-run-id]";
const PUBLIC_LINEAGE_RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const SECRETISH_LINEAGE_RUN_ID = /(?:^|[._:-])(?:token|password|passwd|api[._:-]*key|authorization|cookie|private[._:-]*key)(?:$|[._:-])/i;
const COMPACT_SECRETISH_KEY_MAX_LENGTH = 180;
const COMPACT_SECRETISH_STRONG_KEY_MARKERS = [
  "apikey",
  "privatekey",
  "secretkey",
  "accesskey",
  "authorization",
  "password",
  "passwd",
  "apitoken",
  "authtoken",
  "accesstoken",
  "refreshtoken",
  "sessiontoken",
  "bearertoken",
  "idtoken",
  "csrftoken",
  "clientsecret",
  "webhooksecret",
  "signingsecret",
  "cookiesecret",
  "authcookie",
  "sessioncookie",
] as const;
const COMPACT_SECRETISH_WEAK_KEY_MARKERS = ["token", "secret", "cookie"] as const;
const COMPACT_SECRETISH_CONTEXT_TERMS = [
  "arg",
  "args",
  "argument",
  "arguments",
  "auth",
  "authorization",
  "bearer",
  "credential",
  "credentials",
  "descriptor",
  "evidence",
  "field",
  "fields",
  "file",
  "header",
  "id",
  "ids",
  "key",
  "loop",
  "metadata",
  "param",
  "params",
  "password",
  "path",
  "previous",
  "private",
  "prompt",
  "report",
  "root",
  "rootwork",
  "run",
  "secret",
  "session",
  "stablekey",
  "token",
  "value",
  "values",
  "work",
] as const;
const COMPACT_SECRETISH_IDENTIFIER_FRAGMENT = /[A-Za-z0-9][A-Za-z0-9._:-]{4,179}/g;

function boundedPositiveInteger(value: number | undefined, fallback: number, max: number) {
  if (!Number.isFinite(value) || value === undefined) return fallback;
  return Math.max(1, Math.min(max, Math.floor(value)));
}

function sanitizeText(input: unknown, fallback = "", maxLength = MAX_WARNING_LENGTH) {
  if (typeof input !== "string") return fallback;
  const cleaned = input
    .split(/\r?\n/)
    .filter((line) => !SECRETISH_LINE.test(line))
    .join(" ")
    .replace(SESSION_PATH, "[redacted-session-path]")
    .replace(LONG_TOKEN, "[redacted-long-token]")
    .replace(CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim();
  const value = cleaned || fallback;
  return value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…` : value;
}

export function isSecretishLineageEvidenceText(input: unknown) {
  if (typeof input !== "string") return false;
  const compact = input.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
  const camelSpaced = compact.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  const humanized = camelSpaced.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  return SECRETISH_LINE.test(compact)
    || SECRETISH_LINE.test(camelSpaced)
    || SECRETISH_LINE.test(humanized)
    || SECRETISH_EVIDENCE_TEXT.test(compact)
    || SECRETISH_EVIDENCE_TEXT.test(camelSpaced)
    || SECRETISH_EVIDENCE_TEXT.test(humanized);
}

function compactIdentifierText(input: string) {
  const compact = input
    .replace(CONTROL_CHARS, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
  if (compact.length < 5 || compact.length > COMPACT_SECRETISH_KEY_MAX_LENGTH) return "";
  return compact;
}

function containsCompactContextTerm(value: string) {
  return COMPACT_SECRETISH_CONTEXT_TERMS.some((term) => value === term || value.startsWith(term) || value.endsWith(term));
}

function hasWeakCompactSecretMarker(compact: string, marker: string) {
  let index = compact.indexOf(marker);
  while (index >= 0) {
    const before = compact.slice(0, index);
    const after = compact.slice(index + marker.length);
    if (!before && !after) return true;
    if (after && containsCompactContextTerm(after)) return true;
    if (before && containsCompactContextTerm(before)) return true;
    index = compact.indexOf(marker, index + 1);
  }
  return false;
}

export function isCompactSecretishKeyIdentifier(input: unknown) {
  if (typeof input !== "string") return false;
  const compact = compactIdentifierText(input);
  if (!compact) return false;
  if (COMPACT_SECRETISH_STRONG_KEY_MARKERS.some((marker) => compact === marker || compact.startsWith(marker) || compact.endsWith(marker) || compact.includes(marker))) return true;
  return COMPACT_SECRETISH_WEAK_KEY_MARKERS.some((marker) => hasWeakCompactSecretMarker(compact, marker));
}

export function containsCompactSecretishKeyIdentifierText(input: unknown) {
  if (typeof input !== "string") return false;
  if (isCompactSecretishKeyIdentifier(input)) return true;
  const matches = input.match(COMPACT_SECRETISH_IDENTIFIER_FRAGMENT) ?? [];
  return matches.some((candidate) => isCompactSecretishKeyIdentifier(candidate));
}

export function redactCompactSecretishKeyIdentifiersInText(input: string, redaction = REDACTED_SECRETISH_EVIDENCE_PATH) {
  return input.replace(COMPACT_SECRETISH_IDENTIFIER_FRAGMENT, (candidate) => isCompactSecretishKeyIdentifier(candidate) ? redaction : candidate);
}

function hasUnredactedSecretishLineageDisplayText(input: string) {
  const redactionNeutral = input.split(REDACTED_SECRETISH_EVIDENCE_PATH).join("");
  return Boolean(redactionNeutral) && (isSecretishLineageEvidenceText(redactionNeutral) || containsCompactSecretishKeyIdentifierText(redactionNeutral));
}

export function sanitizeRootWorkLineageDisplayText(input: unknown, fallback = "", maxLength = MAX_WARNING_LENGTH) {
  if (typeof input !== "string") return fallback;
  const cleaned = input
    .split(/\r?\n/)
    .filter((line) => !SECRETISH_LINE.test(line))
    .join(" ")
    .replace(LINEAGE_DISPLAY_SESSION_PATH, "[redacted-session-path]")
    .replace(LONG_TOKEN, "[redacted-long-token]")
    .replace(CONTROL_CHARS, " ")
    .replace(/^#+\s*/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
  const value = cleaned || fallback;
  return value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…` : value;
}

function redactSecretishLineageDisplayPathFragments(input: string) {
  return input.replace(LINEAGE_DISPLAY_MARKDOWN_PATH_FRAGMENT, (match, prefix: string, candidate: string) => {
    if (!candidate) return match;
    const safeCandidate = isSecretishLineageEvidenceText(candidate) || containsCompactSecretishKeyIdentifierText(candidate)
      ? REDACTED_SECRETISH_EVIDENCE_PATH
      : sanitizeRootWorkLineageDisplayText(candidate, "", 260);
    return `${prefix}${safeCandidate || ""}`;
  });
}

export function sanitizeRootWorkLineageWarningForDisplay(input: unknown) {
  if (typeof input !== "string") return "";
  const compactRedacted = redactCompactSecretishKeyIdentifiersInText(redactSecretishLineageDisplayPathFragments(input));
  const cleaned = sanitizeRootWorkLineageDisplayText(compactRedacted);
  return hasUnredactedSecretishLineageDisplayText(cleaned) ? REDACTED_LINEAGE_WARNING : cleaned;
}

export function sanitizeRootWorkDisplayText(input: unknown, fallback = "", maxLength = 240) {
  if (typeof input !== "string") return sanitizeRootWorkLineageDisplayText(input, fallback, maxLength);
  const cleaned = sanitizeRootWorkLineageDisplayText(redactCompactSecretishKeyIdentifiersInText(input), fallback, maxLength);
  return hasUnredactedSecretishLineageDisplayText(cleaned) ? REDACTED_SECRETISH_EVIDENCE_PATH : cleaned;
}

export function sanitizeRootWorkLineageRunIdForDisplay(input: unknown, fallback = "") {
  if (typeof input !== "string") return fallback;
  const rawSecretish = isSecretishLineageEvidenceText(input) || isCompactSecretishKeyIdentifier(input);
  const cleaned = sanitizeRootWorkLineageDisplayText(input, "", 180);
  if (!cleaned) return rawSecretish ? REDACTED_LINEAGE_RUN_ID : fallback;
  if (rawSecretish || isSecretishLineageEvidenceText(cleaned) || isCompactSecretishKeyIdentifier(cleaned) || SECRETISH_LINEAGE_RUN_ID.test(cleaned)) return REDACTED_LINEAGE_RUN_ID;
  if (!isSafeRunId(cleaned) || !PUBLIC_LINEAGE_RUN_ID.test(cleaned)) return REDACTED_LINEAGE_RUN_ID;
  return cleaned;
}

export function sanitizeTaskGraphReportingIdForDisplay(input: unknown, fallback = "") {
  return sanitizeRootWorkLineageRunIdForDisplay(input, fallback);
}

function isPublicLineageRunId(input: unknown): input is string {
  return typeof input === "string" && sanitizeRootWorkLineageRunIdForDisplay(input) === input.trim();
}

function appendWarning(warnings: string[], message: string) {
  if (warnings.length >= MAX_WARNING_COUNT) {
    if (!warnings.includes("additional lineage warnings omitted")) warnings.push("additional lineage warnings omitted");
    return;
  }
  const cleaned = sanitizeRootWorkLineageWarningForDisplay(message);
  if (cleaned && !warnings.includes(cleaned)) warnings.push(cleaned);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asStringArray(value: unknown, limit: number, warnings?: string[], label = "string array") {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  let inspected = 0;
  for (const item of value) {
    inspected += 1;
    if (inspected > limit) {
      if (warnings) appendWarning(warnings, `${label} limit ${limit} reached; additional entries omitted`);
      break;
    }
    if (typeof item !== "string" || !item.trim()) continue;
    out.push(item.trim());
  }
  return out;
}

function asTaskArray(value: unknown, limit: number, warnings?: string[], label = "task") {
  if (!isRecord(value)) return [] as TaskNode[];
  const out: TaskNode[] = [];
  let inspected = 0;
  for (const key in value) {
    inspected += 1;
    if (inspected > limit) {
      if (warnings) appendWarning(warnings, `${label} limit ${limit} reached; additional entries omitted`);
      break;
    }
    const task = value[key];
    if (isRecord(task) && typeof task.id === "string" && task.id.trim().length > 0) out.push(task as unknown as TaskNode);
  }
  return out;
}

function asArtifactArray(value: unknown, limit: number, warnings?: string[], label = "artifact") {
  if (!Array.isArray(value)) return [] as TaskNode["artifacts"];
  const out: TaskNode["artifacts"] = [];
  let inspected = 0;
  for (const artifact of value) {
    inspected += 1;
    if (inspected > limit) {
      if (warnings) appendWarning(warnings, `${label} limit ${limit} reached; additional entries omitted`);
      break;
    }
    if (isRecord(artifact) && typeof artifact.id === "string") out.push(artifact as unknown as TaskNode["artifacts"][number]);
  }
  return out;
}

function sortString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function loopMetadata(run: TaskGraphRun | undefined): AutoImproveLoopMetadata | undefined {
  return run?.metadata?.autoimproveLoop ?? run?.config?.autoimproveLoop;
}

function runIteration(run: TaskGraphRun | undefined) {
  const iteration = loopMetadata(run)?.iteration;
  return typeof iteration === "number" && Number.isInteger(iteration) && iteration >= 0 ? iteration : undefined;
}

function uniqueRunIds(ids: readonly unknown[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of ids) {
    if (typeof value !== "string" || !value.trim()) continue;
    const id = value.trim();
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function successorIds(run: TaskGraphRun | undefined, maxIds: number, warnings: string[]) {
  const loop = loopMetadata(run);
  if (!loop) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (value: unknown) => {
    if (out.length >= maxIds) return false;
    if (typeof value !== "string" || !value.trim()) return true;
    const id = value.trim();
    if (seen.has(id)) return true;
    seen.add(id);
    out.push(id);
    return true;
  };
  add(loop.nextRunId);
  const displayRunId = sanitizeRootWorkLineageRunIdForDisplay(run?.runId, "unknown");
  const remaining = Math.max(1, maxIds - out.length);
  const secondary = asStringArray(loop.nextRunIds, remaining, warnings, `successor branch for run ${displayRunId}`).sort((a, b) => a.localeCompare(b));
  for (const id of secondary) {
    if (!add(id)) {
      appendWarning(warnings, `successor branch limit ${maxIds} reached for run ${displayRunId}; additional successors omitted`);
      break;
    }
  }
  return out;
}

function safeLoadRun(cwd: string, runId: string, loadRun: (cwd: string, runId: string) => TaskGraphRun | undefined, warnings: string[], role: string) {
  if (!isSafeRunId(runId) || !isPublicLineageRunId(runId)) {
    appendWarning(warnings, `${role} run id is unsafe and was ignored`);
    return undefined;
  }
  try {
    return loadRun(cwd, runId);
  } catch {
    appendWarning(warnings, `${role} run ${sanitizeRootWorkLineageRunIdForDisplay(runId)} could not be loaded`);
    return undefined;
  }
}

function normalizeRelativePath(relativePath: string) {
  return relativePath.split(path.sep).join("/");
}

function isMarkdownPath(candidatePath: string) {
  const lower = candidatePath.toLowerCase();
  return lower.endsWith(".md") || lower.endsWith(".markdown");
}

function candidateFromPath(rawPath: unknown, source: string): EvidenceCandidate | undefined {
  if (typeof rawPath !== "string") return undefined;
  const trimmed = rawPath.trim();
  if (!trimmed || trimmed.includes("\0") || !isMarkdownPath(trimmed)) return undefined;
  return { rawPath: trimmed, source };
}

function taskSort(a: TaskNode, b: TaskNode) {
  return sortString(a.createdAt).localeCompare(sortString(b.createdAt)) || sortString(a.id).localeCompare(sortString(b.id));
}

function artifactSort(a: TaskNode["artifacts"][number], b: TaskNode["artifacts"][number]) {
  return sortString(a.createdAt).localeCompare(sortString(b.createdAt)) || sortString(a.id).localeCompare(sortString(b.id));
}

function evidenceCandidates(run: TaskGraphRun, warnings: string[], maxCandidates: number) {
  const candidates: EvidenceCandidate[] = [];
  const displayRunId = sanitizeTaskGraphReportingIdForDisplay(run.runId);
  let limitWarningEmitted = false;
  const atLimit = () => {
    if (candidates.length < maxCandidates) return false;
    if (!limitWarningEmitted) {
      appendWarning(warnings, `evidence candidate limit ${maxCandidates} reached for successor ${displayRunId}; additional candidates omitted`);
      limitWarningEmitted = true;
    }
    return true;
  };
  const add = (candidate: EvidenceCandidate | undefined) => {
    if (!candidate) return !atLimit();
    if (atLimit()) return false;
    candidates.push(candidate);
    return !atLimit();
  };
  const loop = loopMetadata(run);
  add(candidateFromPath(loop?.evidenceContextArtifactPath, "successor metadata evidence artifact"));
  for (const item of asStringArray(loop?.evidenceContextPaths, maxCandidates, warnings, `evidenceContextPaths for successor ${displayRunId}`)) {
    if (!add(candidateFromPath(item, "successor metadata evidence path"))) return candidates;
  }

  const tasks = asTaskArray(run.tasks, maxCandidates, warnings, `tasks for successor ${displayRunId}`).sort(taskSort);
  for (const task of tasks) {
    if (atLimit()) break;
    const metadata: Record<string, unknown> = isRecord(task.metadata) ? task.metadata : {};
    for (const item of asStringArray(metadata.changedFiles, Math.max(1, maxCandidates - candidates.length), warnings, `changedFiles for task ${task.id}`)) {
      if (!add(candidateFromPath(item, `task ${task.id} changed file`))) return candidates;
    }
    const artifacts = asArtifactArray(task.artifacts, Math.max(1, maxCandidates - candidates.length), warnings, `artifacts for task ${task.id}`).sort(artifactSort);
    for (const artifact of artifacts) {
      if (!add(candidateFromPath(artifact.path, `task ${task.id} artifact`))) return candidates;
    }
  }
  return candidates;
}

function resolveEvidencePath(cwd: string, candidate: EvidenceCandidate, warnings: string[]): ResolvedEvidenceCandidate | undefined {
  const cwdRoot = path.resolve(cwd);
  const rawResolved = path.isAbsolute(candidate.rawPath) ? path.resolve(candidate.rawPath) : path.resolve(cwdRoot, candidate.rawPath);
  const relative = path.relative(cwdRoot, rawResolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    appendWarning(warnings, `skipped non-local Markdown evidence candidate from ${candidate.source}`);
    return undefined;
  }
  return { absolutePath: rawResolved, relativePath: normalizeRelativePath(relative), source: candidate.source };
}

function pathIsInside(root: string, file: string) {
  const relative = path.relative(root, file);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function humanEvidenceLabel(relativePath: string) {
  const basename = path.basename(relativePath).replace(/\.(?:md|markdown)$/i, "");
  if (isSecretishLineageEvidenceText(basename) || containsCompactSecretishKeyIdentifierText(basename)) return GENERIC_MARKDOWN_EVIDENCE_LABEL;
  const words = basename.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim() || "Markdown evidence";
  const label = `Evidence: ${words}`;
  if (isSecretishLineageEvidenceText(label) || containsCompactSecretishKeyIdentifierText(label)) return GENERIC_MARKDOWN_EVIDENCE_LABEL;
  return sanitizeText(label, GENERIC_MARKDOWN_EVIDENCE_LABEL, 120);
}

function evidencePathForWarning(relativePath: string) {
  const normalized = normalizeRelativePath(relativePath);
  if (isSecretishLineageEvidenceText(normalized) || containsCompactSecretishKeyIdentifierText(normalized)) return REDACTED_SECRETISH_EVIDENCE_PATH;
  const cleaned = sanitizeText(redactCompactSecretishKeyIdentifiersInText(normalized), "", 220);
  if (!cleaned || hasUnredactedSecretishLineageDisplayText(cleaned)) return REDACTED_SECRETISH_EVIDENCE_PATH;
  return cleaned;
}

function readEvidenceLines(evidenceRootCwd: string, candidate: ResolvedEvidenceCandidate, warnings: string[], maxBytes: number, maxLines: number) {
  let realRoot: string;
  let realFile: string;
  try {
    realRoot = fs.realpathSync(evidenceRootCwd);
    realFile = fs.realpathSync(candidate.absolutePath);
  } catch {
    appendWarning(warnings, `Markdown evidence missing or unreadable: ${evidencePathForWarning(candidate.relativePath)}`);
    return undefined;
  }
  if (!pathIsInside(realRoot, realFile)) {
    appendWarning(warnings, `skipped Markdown evidence outside cwd after path resolution: ${evidencePathForWarning(candidate.relativePath)}`);
    return undefined;
  }
  let stat: fs.Stats;
  try {
    stat = fs.statSync(realFile);
  } catch {
    appendWarning(warnings, `Markdown evidence unreadable: ${evidencePathForWarning(candidate.relativePath)}`);
    return undefined;
  }
  if (!stat.isFile()) {
    appendWarning(warnings, `Markdown evidence is not a regular file: ${evidencePathForWarning(candidate.relativePath)}`);
    return undefined;
  }
  if (stat.size > maxBytes) {
    appendWarning(warnings, `Markdown evidence exceeds byte cap and was skipped: ${evidencePathForWarning(candidate.relativePath)}`);
    return undefined;
  }
  try {
    const text = fs.readFileSync(realFile, "utf8");
    const allLines = text.split(/\r?\n/);
    if (allLines.length > maxLines) appendWarning(warnings, `Markdown evidence exceeds line cap; only public markers within the cap were considered: ${evidencePathForWarning(candidate.relativePath)}`);
    return allLines.slice(0, maxLines);
  } catch {
    appendWarning(warnings, `Markdown evidence unreadable: ${evidencePathForWarning(candidate.relativePath)}`);
    return undefined;
  }
}

function markerRunId(match: RegExpExecArray | null) {
  return match?.[1] ?? match?.[2];
}

function exactMarkerRunId(match: RegExpExecArray | null, markerName: string, candidate: ResolvedEvidenceCandidate, warnings: string[]) {
  const runId = markerRunId(match);
  if (!runId) return undefined;
  if (!isSafeRunId(runId)) {
    appendWarning(warnings, `unsafe ${markerName} marker ignored in Markdown evidence: ${evidencePathForWarning(candidate.relativePath)}`);
    return undefined;
  }
  return runId;
}

function parseEvidence(candidate: ResolvedEvidenceCandidate, lines: readonly string[], successorRunId: string, activeRunId: string, warnings: string[]): ParsedEvidence | undefined {
  const currentMarkers: Array<{ readonly runId: string; readonly line: number }> = [];
  const priorMarkers: Array<{ readonly runId: string; readonly line: number }> = [];
  const decisionMarkers: Array<{ readonly decision: RootWorkLineageEvidenceDecision; readonly line: number }> = [];

  for (const [index, rawLine] of lines.entries()) {
    const lineNumber = index + 1;
    const currentRunId = exactMarkerRunId(CURRENT_RUN_MARKER.exec(rawLine), "Current run", candidate, warnings);
    if (currentRunId) currentMarkers.push({ runId: currentRunId, line: lineNumber });
    const priorRunId = exactMarkerRunId(PRIOR_RUN_MARKER.exec(rawLine), "Prior run", candidate, warnings);
    if (priorRunId) priorMarkers.push({ runId: priorRunId, line: lineNumber });
    const decision = DECISION_MARKER.exec(rawLine);
    if (decision?.[1]) decisionMarkers.push({ decision: decision[1].toUpperCase() as RootWorkLineageEvidenceDecision, line: lineNumber });
  }

  if (decisionMarkers.length > 1) {
    appendWarning(warnings, `ambiguous Decision markers in Markdown evidence: ${evidencePathForWarning(candidate.relativePath)}`);
    return undefined;
  }
  if (currentMarkers.length > 1 || priorMarkers.length > 1) {
    appendWarning(warnings, `ambiguous run markers in Markdown evidence: ${evidencePathForWarning(candidate.relativePath)}`);
    return undefined;
  }
  const current = currentMarkers[0];
  const prior = priorMarkers[0];
  const decision = decisionMarkers[0];
  if (!current && !prior && !decision) return undefined;
  if (!current || !prior || !decision) {
    appendWarning(warnings, `Markdown evidence lacks required public markers: ${evidencePathForWarning(candidate.relativePath)}`);
    return undefined;
  }
  if (current.runId !== successorRunId || prior.runId !== activeRunId) return undefined;
  return {
    decision: decision.decision,
    evidence: {
      label: humanEvidenceLabel(candidate.relativePath),
      path: candidate.relativePath,
      decision: decision.decision,
      currentRunId: current.runId,
      priorRunId: prior.runId,
      currentRunLine: current.line,
      priorRunLine: prior.line,
      decisionLine: decision.line,
    },
  };
}

function boundEvidenceForSuccessor(
  run: TaskGraphRun,
  activeRunId: string,
  evidenceRootCwd: string,
  options: Required<Pick<DeriveRootWorkLineageOptions, "maxEvidenceCandidates" | "maxEvidenceBytes" | "maxEvidenceLines">>,
  evidenceReadBudget: { remaining: number },
  warnings: string[],
) {
  const displayRunId = sanitizeTaskGraphReportingIdForDisplay(run.runId);
  if (path.resolve(run.cwd) !== path.resolve(evidenceRootCwd)) appendWarning(warnings, `successor ${displayRunId} cwd differs from root cwd; evidence paths are anchored to root cwd`);
  if (evidenceReadBudget.remaining <= 0) {
    appendWarning(warnings, `evidence read limit reached before successor ${displayRunId}; evidence candidates omitted`);
    return undefined;
  }

  const candidates = evidenceCandidates(run, warnings, options.maxEvidenceCandidates);
  if (!candidates.length) {
    appendWarning(warnings, `no local Markdown evidence candidates found for successor ${displayRunId}`);
    return undefined;
  }

  const seenPaths = new Set<string>();
  const parsed: ParsedEvidence[] = [];
  let considered = 0;
  for (const candidate of candidates) {
    const resolved = resolveEvidencePath(evidenceRootCwd, candidate, warnings);
    if (!resolved) continue;
    if (seenPaths.has(resolved.relativePath)) continue;
    seenPaths.add(resolved.relativePath);
    if (evidenceReadBudget.remaining <= 0) {
      appendWarning(warnings, `evidence read limit reached for successor ${displayRunId}; additional evidence candidates omitted`);
      break;
    }
    evidenceReadBudget.remaining -= 1;
    considered += 1;
    const lines = readEvidenceLines(evidenceRootCwd, resolved, warnings, options.maxEvidenceBytes, options.maxEvidenceLines);
    if (!lines) continue;
    const evidence = parseEvidence(resolved, lines, run.runId, activeRunId, warnings);
    if (evidence) parsed.push(evidence);
  }

  if (parsed.length > 1) appendWarning(warnings, `multiple binding Markdown evidence files found for successor ${displayRunId}; using deterministic preference`);
  const complete = parsed.filter((item) => item.decision === "COMPLETE").sort(evidenceOrder);
  if (complete.length > 1) appendWarning(warnings, `multiple COMPLETE evidence files found for successor ${displayRunId}; using deterministic preference`);
  const chosen = complete[0] ?? parsed.sort(evidenceOrder)[0];
  if (!chosen && considered > 0) appendWarning(warnings, `no binding lineage evidence found for successor ${sanitizeRootWorkLineageRunIdForDisplay(run.runId)} and active run ${sanitizeRootWorkLineageRunIdForDisplay(activeRunId)}`);
  if (chosen && chosen.decision !== "COMPLETE") appendWarning(warnings, `non-complete lineage evidence found for successor ${sanitizeRootWorkLineageRunIdForDisplay(run.runId)}: Decision: ${chosen.decision}`);
  return chosen;
}

function evidenceOrder(a: ParsedEvidence, b: ParsedEvidence) {
  return a.evidence.path.localeCompare(b.evidence.path) || (a.evidence.decisionLine ?? 0) - (b.evidence.decisionLine ?? 0);
}

function successorDisplay(run: TaskGraphRun, parsed: ParsedEvidence | undefined, warnings: readonly string[]): RootWorkLineageSuccessor {
  const note = parsed?.decision === "COMPLETE"
    ? "display-only: successor has COMPLETE evidence; durable root work remains ACTIVE until explicit state action."
    : parsed
      ? `display-only: successor evidence is ${parsed.decision}; durable root work remains ACTIVE.`
      : undefined;
  return {
    runId: run.runId,
    status: run.status,
    iteration: runIteration(run),
    ...(parsed ? { decision: parsed.decision, evidence: parsed.evidence } : {}),
    ...(note ? { note: sanitizeText(note, "", MAX_NOTE_LENGTH) } : {}),
    ...(warnings.length ? { warnings } : {}),
  };
}

function successorPreference(a: RootWorkLineageSuccessor, b: RootWorkLineageSuccessor) {
  const completeA = a.decision === "COMPLETE" ? 1 : 0;
  const completeB = b.decision === "COMPLETE" ? 1 : 0;
  if (completeA !== completeB) return completeB - completeA;
  const iterationA = a.iteration ?? -1;
  const iterationB = b.iteration ?? -1;
  if (iterationA !== iterationB) return iterationB - iterationA;
  return b.runId.localeCompare(a.runId);
}

function displayNoteFor(decision: RootWorkLineageDisplayDecision | undefined) {
  return decision === "COMPLETE"
    ? "display-only: terminal successor evidence is COMPLETE; durable root work remains ACTIVE until an explicit state action."
    : "display-only: durable root work remains ACTIVE; lineage display is not root work state reconciliation.";
}

function deriveForActiveItem(
  run: TaskGraphRun,
  rootWorkKey: string,
  activeRunId: string,
  options: Required<Pick<DeriveRootWorkLineageOptions, "maxDepth" | "maxSuccessors" | "maxSuccessorsPerRun" | "maxEvidenceCandidates" | "maxEvidenceReads" | "maxEvidenceBytes" | "maxEvidenceLines">> & Pick<DeriveRootWorkLineageOptions, "loadRun">,
): RootWorkLineageDisplay {
  const loadRun = options.loadRun ?? loadRunNoCreate;
  const warnings: string[] = [];
  const rootCwd = run.cwd;
  const activeRun = activeRunId === run.runId ? run : safeLoadRun(rootCwd, activeRunId, loadRun, warnings, "active");
  if (!activeRun) {
    appendWarning(warnings, `active run ${sanitizeRootWorkLineageRunIdForDisplay(activeRunId)} is missing`);
    return {
      rootWorkKey,
      activeRunId: sanitizeRootWorkLineageRunIdForDisplay(activeRunId),
      successors: [],
      displayOnlyNote: displayNoteFor(undefined),
      warnings,
    };
  }

  const visited = new Set<string>([activeRunId]);
  const evidenceReadBudget = { remaining: options.maxEvidenceReads };
  let traversedSuccessorCount = 0;
  let stoppedBySuccessorLimit = false;
  let frontier: TaskGraphRun[] = [activeRun];
  const successors: RootWorkLineageSuccessor[] = [];

  for (let depth = 0; depth < options.maxDepth && frontier.length && !stoppedBySuccessorLimit; depth += 1) {
    const nextFrontier: TaskGraphRun[] = [];
    for (const sourceRun of frontier) {
      const nextIds = successorIds(sourceRun, options.maxSuccessorsPerRun, warnings);
      const displaySourceRunId = sanitizeRootWorkLineageRunIdForDisplay(sourceRun.runId);
      if (nextIds.length > 1) appendWarning(warnings, `multiple successor branches advertised from run ${displaySourceRunId}; using deterministic traversal order`);
      for (const nextRunId of nextIds) {
        if (traversedSuccessorCount >= options.maxSuccessors) {
          stoppedBySuccessorLimit = true;
          appendWarning(warnings, `successor traversal limit ${options.maxSuccessors} reached; additional successors omitted`);
          break;
        }
        if (!isSafeRunId(nextRunId) || !isPublicLineageRunId(nextRunId)) {
          appendWarning(warnings, `successor run id from ${displaySourceRunId} is unsafe and was ignored`);
          continue;
        }
        if (visited.has(nextRunId)) {
          appendWarning(warnings, `successor chain cycle ignored at run ${sanitizeRootWorkLineageRunIdForDisplay(nextRunId)}`);
          continue;
        }
        visited.add(nextRunId);
        traversedSuccessorCount += 1;
        const successorRun = nextRunId === run.runId ? run : safeLoadRun(rootCwd, nextRunId, loadRun, warnings, "successor");
        if (!successorRun) {
          appendWarning(warnings, `successor run ${sanitizeRootWorkLineageRunIdForDisplay(nextRunId)} is missing`);
          continue;
        }
        const successorWarnings: string[] = [];
        const parsed = boundEvidenceForSuccessor(successorRun, activeRunId, rootCwd, options, evidenceReadBudget, successorWarnings);
        for (const warning of successorWarnings) appendWarning(warnings, warning);
        successors.push(successorDisplay(successorRun, parsed, successorWarnings));
        nextFrontier.push(successorRun);
      }
      if (stoppedBySuccessorLimit) break;
    }
    frontier = stoppedBySuccessorLimit ? [] : nextFrontier;
  }

  if (!stoppedBySuccessorLimit && frontier.length) appendWarning(warnings, `successor chain exceeded max depth ${options.maxDepth}`);
  if (!successors.length) appendWarning(warnings, `no successors found for active run ${sanitizeRootWorkLineageRunIdForDisplay(activeRunId)}`);

  const preferred = [...successors].sort(successorPreference)[0];
  const decision = preferred?.decision;
  return {
    rootWorkKey,
    activeRunId,
    activeRunStatus: activeRun.status,
    activeRunIteration: runIteration(activeRun),
    latestSuccessorRunId: preferred?.runId,
    latestSuccessorStatus: preferred?.status,
    latestSuccessorIteration: preferred?.iteration,
    decision,
    evidence: preferred?.evidence,
    successors,
    displayOnlyNote: displayNoteFor(decision),
    ...(warnings.length ? { warnings } : {}),
  };
}

function isActiveRootWorkWithRunId(value: unknown): value is { readonly key?: unknown; readonly state: "active"; readonly activeRunId: string } {
  return Boolean(value)
    && typeof value === "object"
    && !Array.isArray(value)
    && (value as { readonly state?: unknown }).state === "active"
    && typeof (value as { readonly activeRunId?: unknown }).activeRunId === "string"
    && (value as { readonly activeRunId: string }).activeRunId.trim().length > 0;
}

function rootWorkKey(value: { readonly key?: unknown }, fallback: string) {
  return sanitizeText(value.key, fallback, 160) || fallback;
}

export function deriveRootWorkLineageByActiveRunId(run: TaskGraphRun, options: DeriveRootWorkLineageOptions = {}): RootWorkLineageByActiveRunId {
  const boundedOptions = {
    loadRun: options.loadRun,
    maxDepth: boundedPositiveInteger(options.maxDepth, DEFAULT_MAX_DEPTH, DEFAULT_MAX_DEPTH),
    maxSuccessors: boundedPositiveInteger(options.maxSuccessors, DEFAULT_MAX_SUCCESSORS, DEFAULT_MAX_SUCCESSORS),
    maxSuccessorsPerRun: boundedPositiveInteger(options.maxSuccessorsPerRun, DEFAULT_MAX_SUCCESSORS_PER_RUN, DEFAULT_MAX_SUCCESSORS_PER_RUN),
    maxEvidenceCandidates: boundedPositiveInteger(options.maxEvidenceCandidates, DEFAULT_MAX_EVIDENCE_CANDIDATES, DEFAULT_MAX_EVIDENCE_CANDIDATES),
    maxEvidenceReads: boundedPositiveInteger(options.maxEvidenceReads, DEFAULT_MAX_EVIDENCE_READS, DEFAULT_MAX_EVIDENCE_READS),
    maxEvidenceBytes: boundedPositiveInteger(options.maxEvidenceBytes, DEFAULT_MAX_EVIDENCE_BYTES, DEFAULT_MAX_EVIDENCE_BYTES),
    maxEvidenceLines: boundedPositiveInteger(options.maxEvidenceLines, DEFAULT_MAX_EVIDENCE_LINES, DEFAULT_MAX_EVIDENCE_LINES),
  };
  const items = Array.isArray(run.metadata?.rootWorkQueue?.items) ? run.metadata.rootWorkQueue.items : [];
  const lineageByActiveRunId: RootWorkLineageByActiveRunId = {};

  for (const [index, item] of items.entries()) {
    if (!isActiveRootWorkWithRunId(item)) continue;
    const activeRunId = item.activeRunId.trim();
    if (!isSafeRunId(activeRunId) || !isPublicLineageRunId(activeRunId)) continue;
    if (lineageByActiveRunId[activeRunId]) {
      const previous = lineageByActiveRunId[activeRunId];
      const warnings = [...(previous.warnings ?? [])];
      appendWarning(warnings, `multiple active root-work items share active run ${sanitizeRootWorkLineageRunIdForDisplay(activeRunId)}; using first root work key`);
      lineageByActiveRunId[activeRunId] = { ...previous, warnings };
      continue;
    }
    lineageByActiveRunId[activeRunId] = deriveForActiveItem(run, rootWorkKey(item, `root-work-${index + 1}`), activeRunId, boundedOptions);
  }

  return lineageByActiveRunId;
}

export type AutoImproveLineageRecommendationCode =
  | "continue-existing-successor"
  | "inspect-latest-terminal"
  | "continue-latest-terminal-with-first-executable"
  | "root-work-active-report-only"
  | "no-ready-work-root-queue-empty"
  | "inspect-branching-successors"
  | "missing-successor-or-run"
  | "inspect-cycle-or-corrupt-lineage";

export interface ResolveAutoImproveLineageStatusOptions {
  readonly loadRun?: (cwd: string, runId: string) => TaskGraphRun | undefined;
  readonly maxDepth?: number;
  readonly maxSuccessors?: number;
  readonly maxSuccessorsPerRun?: number;
  readonly maxRootWorkItems?: number;
}

export interface AutoImproveLineageVisitedRun {
  readonly runId: string;
  readonly status?: TaskStatus | string;
  readonly iteration?: number;
  readonly terminal: boolean;
}

export interface AutoImproveLineageRootWorkCounts {
  readonly active: number;
  readonly queued: number;
  readonly queuedExecutable: number;
  readonly queuedNonExecutable: number;
}

export interface AutoImproveLineageRootWorkItem {
  readonly key: string;
  readonly kind: RootWorkKind;
  readonly state: "active" | "queued";
  readonly title: string;
  readonly purpose?: string;
  readonly executable: boolean;
  readonly notExecutableReason?: string;
  readonly activeRunId?: string;
}

export interface AutoImproveLineageRootWorkModel {
  readonly counts: AutoImproveLineageRootWorkCounts;
  readonly active: readonly AutoImproveLineageRootWorkItem[];
  readonly queued: readonly AutoImproveLineageRootWorkItem[];
  readonly queuedExecutable: readonly AutoImproveLineageRootWorkItem[];
  readonly queuedNonExecutable: readonly AutoImproveLineageRootWorkItem[];
}

export interface AutoImproveLineageStatusModel {
  readonly startRunId: string;
  readonly latestRunId?: string;
  readonly latestStatus?: TaskStatus | string;
  readonly latestIteration?: number;
  readonly latestTerminal: boolean;
  readonly visitedRunIds: readonly string[];
  readonly visitedRuns: readonly AutoImproveLineageVisitedRun[];
  readonly rootWorkQueue?: AutoImproveLineageRootWorkModel;
  readonly recommendations: readonly AutoImproveLineageRecommendationCode[];
  readonly warnings?: readonly string[];
}

interface ResolverRunRecord {
  readonly runId: string;
  readonly run: TaskGraphRun;
  readonly depth: number;
  readonly primaryChain: boolean;
}

const DEFAULT_MAX_ROOT_WORK_ITEMS = 16;
const ROOT_WORK_KIND_SET_FOR_LINEAGE_STATUS: ReadonlySet<string> = new Set(ROOT_WORK_KINDS);
const TASK_STATUS_SET_FOR_LINEAGE_STATUS: ReadonlySet<string> = new Set(TASK_STATUSES);

function isKnownTaskStatusForLineageStatus(status: unknown): status is TaskStatus {
  return typeof status === "string" && TASK_STATUS_SET_FOR_LINEAGE_STATUS.has(status);
}

function isTerminalRunStatus(status: unknown): status is TaskStatus {
  return isKnownTaskStatusForLineageStatus(status) && terminalDone(status);
}

function statusForLineageStatusModel(status: unknown) {
  if (isKnownTaskStatusForLineageStatus(status)) return status;
  if (typeof status !== "string") return undefined;
  if (isSecretishLineageEvidenceText(status) || containsCompactSecretishKeyIdentifierText(status)) return undefined;
  const cleaned = sanitizeRootWorkLineageDisplayText(redactCompactSecretishKeyIdentifiersInText(status), "", 40);
  if (!cleaned || cleaned === REDACTED_SECRETISH_EVIDENCE_PATH || hasUnredactedSecretishLineageDisplayText(cleaned)) return undefined;
  return cleaned;
}

function publicLineageRunIdOrRedacted(input: unknown) {
  return sanitizeRootWorkLineageRunIdForDisplay(input, REDACTED_LINEAGE_RUN_ID) || REDACTED_LINEAGE_RUN_ID;
}

function sanitizedLineageStatusWarnings(warnings: readonly string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const warning of warnings) {
    const cleaned = sanitizeRootWorkLineageWarningForDisplay(warning);
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
  }
  return out;
}

function addRecommendation(recommendations: AutoImproveLineageRecommendationCode[], code: AutoImproveLineageRecommendationCode) {
  if (!recommendations.includes(code)) recommendations.push(code);
}

function isRootWorkKindForLineageStatus(value: unknown): value is RootWorkKind {
  return typeof value === "string" && ROOT_WORK_KIND_SET_FOR_LINEAGE_STATUS.has(value);
}

function isOpenRootWorkItemForLineageStatus(value: unknown): value is RootWorkItem {
  return isRecord(value)
    && isRootWorkKindForLineageStatus(value.kind)
    && (value.state === "active" || value.state === "queued")
    && typeof value.title === "string";
}

function rootWorkItemsForLineageStatus(queue: RootWorkQueue | undefined) {
  return Array.isArray(queue?.items) ? queue.items.filter(isOpenRootWorkItemForLineageStatus) : [];
}

function isExecutableRootWorkKindForLineageStatus(kind: RootWorkKind) {
  return kind === "autoimprove-loop";
}

function rootWorkCountsForLineageStatus(items: readonly RootWorkItem[]): AutoImproveLineageRootWorkCounts {
  const active = items.filter((item) => item.state === "active");
  const queued = items.filter((item) => item.state === "queued");
  return {
    active: active.length,
    queued: queued.length,
    queuedExecutable: queued.filter((item) => isExecutableRootWorkKindForLineageStatus(item.kind)).length,
    queuedNonExecutable: queued.filter((item) => !isExecutableRootWorkKindForLineageStatus(item.kind)).length,
  };
}

function safeRootWorkKeyForLineageStatus(input: unknown, fallback: string) {
  const cleaned = sanitizeRootWorkDisplayText(input, "", 160);
  if (!cleaned || cleaned === REDACTED_SECRETISH_EVIDENCE_PATH || cleaned === REDACTED_LINEAGE_RUN_ID) return fallback;
  if (isSecretishLineageEvidenceText(cleaned) || containsCompactSecretishKeyIdentifierText(cleaned)) return fallback;
  return cleaned;
}

function safeRootWorkTextForLineageStatus(input: unknown, fallback: string, maxLength: number) {
  if (typeof input === "string" && (isSecretishLineageEvidenceText(input) || containsCompactSecretishKeyIdentifierText(input))) return REDACTED_SECRETISH_EVIDENCE_PATH;
  const cleaned = sanitizeRootWorkDisplayText(input, fallback, maxLength);
  if (!cleaned) return fallback;
  return hasUnredactedSecretishLineageDisplayText(cleaned) ? REDACTED_SECRETISH_EVIDENCE_PATH : cleaned;
}

function rootWorkItemForLineageStatus(item: RootWorkItem, index: number): AutoImproveLineageRootWorkItem {
  const executable = item.state === "queued" && isExecutableRootWorkKindForLineageStatus(item.kind);
  const purpose = safeRootWorkTextForLineageStatus(item.purpose, "", 220);
  return {
    key: safeRootWorkKeyForLineageStatus(item.key, `root-work-${index + 1}`),
    kind: item.kind,
    state: item.state,
    title: safeRootWorkTextForLineageStatus(item.title, "Untitled root work", 160) || "Untitled root work",
    ...(purpose ? { purpose } : {}),
    executable,
    ...(item.state === "queued" && !executable ? { notExecutableReason: "not executable by this version" } : {}),
    ...(item.activeRunId ? { activeRunId: publicLineageRunIdOrRedacted(item.activeRunId) } : {}),
  };
}

function rootWorkModelForLineageStatus(queue: RootWorkQueue | undefined, maxItems: number, warnings: string[]): AutoImproveLineageRootWorkModel | undefined {
  if (!queue) return undefined;
  const items = rootWorkItemsForLineageStatus(queue);
  const counts = rootWorkCountsForLineageStatus(items);
  const activeRaw = items.filter((item) => item.state === "active");
  const queuedRaw = items.filter((item) => item.state === "queued");
  if (activeRaw.length > maxItems) appendWarning(warnings, `active root-work display limit ${maxItems} reached; additional active items omitted`);
  if (queuedRaw.length > maxItems) appendWarning(warnings, `queued root-work display limit ${maxItems} reached; additional queued items omitted`);
  const active = activeRaw.slice(0, maxItems).map((item, index) => rootWorkItemForLineageStatus(item, index));
  const queued = queuedRaw.slice(0, maxItems).map((item, index) => rootWorkItemForLineageStatus(item, activeRaw.length + index));
  return {
    counts,
    active,
    queued,
    queuedExecutable: queued.filter((item) => item.executable),
    queuedNonExecutable: queued.filter((item) => !item.executable),
  };
}

function visitedRunForLineageStatus(record: ResolverRunRecord): AutoImproveLineageVisitedRun {
  const status = statusForLineageStatusModel(record.run.status);
  const iteration = runIteration(record.run);
  return {
    runId: publicLineageRunIdOrRedacted(record.runId),
    ...(status ? { status } : {}),
    ...(iteration !== undefined ? { iteration } : {}),
    terminal: isTerminalRunStatus(record.run.status),
  };
}

function primarySuccessorIdForLineageStatus(run: TaskGraphRun | undefined, nextIds: readonly string[]) {
  const loop = loopMetadata(run);
  if (!loop) return undefined;
  const explicitPrimary = typeof loop.nextRunId === "string" && loop.nextRunId.trim().length > 0 ? loop.nextRunId.trim() : undefined;
  return explicitPrimary ?? (nextIds.length === 1 ? nextIds[0] : undefined);
}

function preferredLatestLineageRecord(records: readonly ResolverRunRecord[]) {
  const primaryRecords = records.filter((record) => record.primaryChain);
  return primaryRecords[primaryRecords.length - 1] ?? records[records.length - 1];
}

export function resolveAutoImproveLineageStatus(cwd: string, startRunId: string, options: ResolveAutoImproveLineageStatusOptions = {}): AutoImproveLineageStatusModel {
  const boundedOptions = {
    loadRun: options.loadRun ?? loadRunNoCreate,
    maxDepth: boundedPositiveInteger(options.maxDepth, DEFAULT_MAX_DEPTH, DEFAULT_MAX_DEPTH),
    maxSuccessors: boundedPositiveInteger(options.maxSuccessors, DEFAULT_MAX_SUCCESSORS, DEFAULT_MAX_SUCCESSORS),
    maxSuccessorsPerRun: boundedPositiveInteger(options.maxSuccessorsPerRun, DEFAULT_MAX_SUCCESSORS_PER_RUN, DEFAULT_MAX_SUCCESSORS_PER_RUN),
    maxRootWorkItems: boundedPositiveInteger(options.maxRootWorkItems, DEFAULT_MAX_ROOT_WORK_ITEMS, 64),
  };
  const warnings: string[] = [];
  let sawBranching = false;
  let sawMissingOrRejected = false;
  let sawCycleOrCorruptLineage = false;
  const displayStartRunId = publicLineageRunIdOrRedacted(startRunId);

  const startRun = safeLoadRun(cwd, startRunId, boundedOptions.loadRun, warnings, "start");
  if (!startRun) {
    sawMissingOrRejected = true;
    appendWarning(warnings, `start run ${displayStartRunId} is missing`);
    const sanitizedWarnings = sanitizedLineageStatusWarnings(warnings);
    return {
      startRunId: displayStartRunId,
      latestTerminal: false,
      visitedRunIds: [],
      visitedRuns: [],
      recommendations: ["missing-successor-or-run"],
      ...(sanitizedWarnings.length ? { warnings: sanitizedWarnings } : {}),
    };
  }

  const seenRunIds = new Set<string>([startRunId.trim()]);
  const records: ResolverRunRecord[] = [{ runId: startRunId.trim(), run: startRun, depth: 0, primaryChain: true }];
  let frontier: ResolverRunRecord[] = records.slice();
  let traversedSuccessorCount = 0;
  let stoppedBySuccessorLimit = false;
  let stoppedByDepthLimit = false;

  for (let depth = 0; depth < boundedOptions.maxDepth && frontier.length && !stoppedBySuccessorLimit; depth += 1) {
    const nextFrontier: ResolverRunRecord[] = [];
    for (const source of frontier) {
      const nextIds = successorIds(source.run, boundedOptions.maxSuccessorsPerRun, warnings);
      const primaryNextRunId = source.primaryChain ? primarySuccessorIdForLineageStatus(source.run, nextIds) : undefined;
      const displaySourceRunId = publicLineageRunIdOrRedacted(source.runId);
      if (nextIds.length > 1) {
        sawBranching = true;
        appendWarning(warnings, `multiple successor branches advertised from run ${displaySourceRunId}; inspect branch state before continuing`);
      }
      for (const nextRunId of nextIds) {
        if (traversedSuccessorCount >= boundedOptions.maxSuccessors) {
          stoppedBySuccessorLimit = true;
          appendWarning(warnings, `successor traversal limit ${boundedOptions.maxSuccessors} reached; additional successors omitted`);
          break;
        }
        if (!isSafeRunId(nextRunId) || !isPublicLineageRunId(nextRunId)) {
          sawMissingOrRejected = true;
          appendWarning(warnings, `successor run id from ${displaySourceRunId} is unsafe and was ignored`);
          continue;
        }
        if (seenRunIds.has(nextRunId)) {
          sawCycleOrCorruptLineage = true;
          appendWarning(warnings, `successor chain cycle ignored at run ${publicLineageRunIdOrRedacted(nextRunId)}`);
          continue;
        }
        seenRunIds.add(nextRunId);
        traversedSuccessorCount += 1;
        const successorRun = safeLoadRun(cwd, nextRunId, boundedOptions.loadRun, warnings, "successor");
        if (!successorRun) {
          sawMissingOrRejected = true;
          appendWarning(warnings, `successor run ${publicLineageRunIdOrRedacted(nextRunId)} is missing`);
          continue;
        }
        const record = {
          runId: nextRunId,
          run: successorRun,
          depth: source.depth + 1,
          primaryChain: source.primaryChain && (primaryNextRunId === undefined || primaryNextRunId === nextRunId),
        };
        records.push(record);
        nextFrontier.push(record);
      }
      if (stoppedBySuccessorLimit) break;
    }
    if (!stoppedBySuccessorLimit && nextFrontier.length && depth + 1 >= boundedOptions.maxDepth) stoppedByDepthLimit = true;
    frontier = stoppedBySuccessorLimit ? [] : nextFrontier;
  }

  if (stoppedByDepthLimit) appendWarning(warnings, `successor chain exceeded max depth ${boundedOptions.maxDepth}`);
  if (stoppedBySuccessorLimit) sawBranching = true;

  const latest = preferredLatestLineageRecord(records);
  const latestStatus = statusForLineageStatusModel(latest?.run.status);
  const latestTerminal = isTerminalRunStatus(latest?.run.status);
  const rootWorkQueue = rootWorkModelForLineageStatus(latest?.run.metadata?.rootWorkQueue, boundedOptions.maxRootWorkItems, warnings);
  const recommendations: AutoImproveLineageRecommendationCode[] = [];
  if (sawBranching) addRecommendation(recommendations, "inspect-branching-successors");
  if (sawMissingOrRejected) addRecommendation(recommendations, "missing-successor-or-run");
  if (sawCycleOrCorruptLineage) {
    addRecommendation(recommendations, "inspect-cycle-or-corrupt-lineage");
  } else if (latest && latestTerminal) {
    addRecommendation(recommendations, "inspect-latest-terminal");
    if (rootWorkQueue?.counts.active) addRecommendation(recommendations, "root-work-active-report-only");
    else if (rootWorkQueue?.counts.queuedExecutable) addRecommendation(recommendations, "continue-latest-terminal-with-first-executable");
    else if (!rootWorkQueue?.counts.queued) addRecommendation(recommendations, "no-ready-work-root-queue-empty");
  } else if (latest) {
    addRecommendation(recommendations, "continue-existing-successor");
    if (rootWorkQueue?.counts.active) addRecommendation(recommendations, "root-work-active-report-only");
  } else if (!latest) {
    addRecommendation(recommendations, "missing-successor-or-run");
  }

  const sanitizedWarnings = sanitizedLineageStatusWarnings(warnings);
  return {
    startRunId: displayStartRunId,
    ...(latest ? { latestRunId: publicLineageRunIdOrRedacted(latest.runId) } : {}),
    ...(latestStatus ? { latestStatus } : {}),
    ...(runIteration(latest?.run) !== undefined ? { latestIteration: runIteration(latest?.run) } : {}),
    latestTerminal,
    visitedRunIds: records.map((record) => publicLineageRunIdOrRedacted(record.runId)),
    visitedRuns: records.map(visitedRunForLineageStatus),
    ...(rootWorkQueue ? { rootWorkQueue } : {}),
    recommendations,
    ...(sanitizedWarnings.length ? { warnings: sanitizedWarnings } : {}),
  };
}
