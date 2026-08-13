import { constants as fsConstants } from "node:fs";
import { copyFile, lstat, mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, extname, isAbsolute, join, resolve } from "node:path";
import { Type } from "typebox";
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

const PROJECT_DIR = "/home/tay/src/uiux-vlm-baseline";
const ANALYZER_SCRIPT = `${PROJECT_DIR}/scripts/ui_feedback_analyzer.py`;
const DEFAULT_TIMEOUT_MS = 120_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 600_000;
const MAX_TEXT_CHARS = 4_000;
const MAX_REPORT_BYTES = 1_048_576;
const MAX_REPORT_EXCERPT_CHARS = 2_000;
const MAX_ARTIFACT_COUNT = 20;
const MAX_ARTIFACT_CHARS = 1_000;
const TOP_ISSUE_LIMIT = 5;

const FAIL_ON_VALUES = ["fail", "warning", "error", "never"] as const;
const STATUS_KEYS = ["pass", "fail", "warning", "needs_review", "error"] as const;

type FailOn = (typeof FAIL_ON_VALUES)[number];
type StatusKey = (typeof STATUS_KEYS)[number];
type SummaryCounts = Partial<Record<StatusKey, number>>;
type FileStats = Awaited<ReturnType<typeof stat>>;

type UiFeedbackAnalyzeParams = {
  image_path: string;
  spec_path?: string;
  checks?: string | readonly string[];
  out_json?: string;
  out_md?: string;
  annotate_path?: string;
  fail_on?: FailOn;
  debug_components?: boolean;
  timeout_ms?: number;
};

type ResolvedInvocation = {
  imagePath: string;
  specPath: string | undefined;
  checks: string | undefined;
  outJson: string | undefined;
  outMd: string | undefined;
  annotatePath: string | undefined;
  failOn: FailOn;
  debugComponents: boolean;
  timeoutMs: number;
};

type AnalyzerOutputPaths = {
  outJson: string | undefined;
  outMd: string | undefined;
  annotatePath: string | undefined;
};

type PreparedAnalyzerRun = {
  args: string[];
  outputPaths: AnalyzerOutputPaths;
  tempDir: string | undefined;
};

type ReportPreview = {
  source: "file" | "stdout";
  bytes: number;
  excerpt?: string;
  truncated?: boolean;
};

type ParsedReport = {
  report?: unknown;
  parseError?: string;
  reportPreview?: ReportPreview;
};

type IssueSummary = {
  check_id?: string;
  severity?: string;
  message: string;
  suggestion?: string;
};

function expandHome(path: string): string {
  return path === "~" ? homedir() : path.startsWith("~/") ? resolve(homedir(), path.slice(2)) : path;
}

function normalizePathInput(input: string): string {
  return input.trim().replace(/^@+/, "");
}

function resolvePath(input: string | undefined, cwd: string): string | undefined {
  if (input === undefined) return undefined;
  const stripped = normalizePathInput(input);
  if (!stripped) return undefined;
  const expanded = expandHome(stripped);
  return isAbsolute(expanded) ? expanded : resolve(cwd, expanded);
}

function resolveRequiredPath(input: string, label: string, cwd: string): string {
  const resolved = resolvePath(input, cwd);
  if (!resolved) throw new Error(`${label} is required.`);
  return resolved;
}

function normalizeChecks(value: string | readonly string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  const parts = Array.isArray(value) ? value : value.split(",");
  const normalized = parts.map((part) => part.trim()).filter(Boolean).join(",");
  return normalized || undefined;
}

function isFailOn(value: string): value is FailOn {
  return (FAIL_ON_VALUES as readonly string[]).includes(value);
}

function normalizeFailOn(value: FailOn | undefined): FailOn {
  return value ?? "never";
}

function normalizeTimeout(value: number | undefined): number {
  if (value === undefined) return DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(value) || !Number.isInteger(value)) throw new Error("timeout_ms must be an integer number of milliseconds.");
  if (value < MIN_TIMEOUT_MS || value > MAX_TIMEOUT_MS) {
    throw new Error(`timeout_ms must be between ${MIN_TIMEOUT_MS} and ${MAX_TIMEOUT_MS} milliseconds.`);
  }
  return value;
}

function buildAnalyzerArgs(invocation: ResolvedInvocation, outputPaths: AnalyzerOutputPaths): string[] {
  const args = ["run", "--project", PROJECT_DIR, "python", ANALYZER_SCRIPT, "--image", invocation.imagePath, "--fail-on", invocation.failOn];
  if (invocation.specPath) args.push("--spec", invocation.specPath);
  if (invocation.checks) args.push("--checks", invocation.checks);
  if (outputPaths.outJson) args.push("--out-json", outputPaths.outJson);
  if (outputPaths.outMd) args.push("--out-md", outputPaths.outMd);
  if (outputPaths.annotatePath) args.push("--annotate", outputPaths.annotatePath);
  if (invocation.debugComponents) args.push("--debug-components");
  return args;
}

function buildInvocation(params: UiFeedbackAnalyzeParams, cwd: string): ResolvedInvocation {
  const imagePath = resolveRequiredPath(params.image_path, "image_path", cwd);
  const specPath = resolvePath(params.spec_path, cwd);
  const outJson = resolvePath(params.out_json, cwd);
  const outMd = resolvePath(params.out_md, cwd);
  const annotatePath = resolvePath(params.annotate_path, cwd);
  const checks = normalizeChecks(params.checks);
  const failOn = normalizeFailOn(params.fail_on);
  const timeoutMs = normalizeTimeout(params.timeout_ms);

  return {
    imagePath,
    specPath,
    checks,
    outJson,
    outMd,
    annotatePath,
    failOn,
    debugComponents: params.debug_components === true,
    timeoutMs,
  };
}

function errorCode(err: unknown): string | undefined {
  return typeof err === "object" && err !== null && "code" in err && typeof (err as { code?: unknown }).code === "string"
    ? (err as { code: string }).code
    : undefined;
}

async function assertOutputPathAvailable(path: string | undefined, label: string): Promise<void> {
  if (!path) return;
  try {
    await lstat(path);
  } catch (err) {
    if (errorCode(err) === "ENOENT") return;
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Unable to check ${label} output path ${path}: ${message}`);
  }
  throw new Error(`${label} output path already exists; refusing to overwrite: ${path}`);
}

function assertDistinctOutputPaths(invocation: ResolvedInvocation): void {
  const outputs: Array<[string, string | undefined]> = [
    ["out_json", invocation.outJson],
    ["out_md", invocation.outMd],
    ["annotate_path", invocation.annotatePath],
  ];
  const seen = new Map<string, string>();
  for (const [label, path] of outputs) {
    if (!path) continue;
    const prior = seen.get(path);
    if (prior) throw new Error(`${label} and ${prior} resolve to the same output path; outputs must be distinct: ${path}`);
    seen.set(path, label);
  }
}

async function assertOutputPathsAvailable(invocation: ResolvedInvocation): Promise<void> {
  assertDistinctOutputPaths(invocation);
  await Promise.all([
    assertOutputPathAvailable(invocation.outJson, "out_json"),
    assertOutputPathAvailable(invocation.outMd, "out_md"),
    assertOutputPathAvailable(invocation.annotatePath, "annotate_path"),
  ]);
}

function emptyAnalyzerOutputPaths(): AnalyzerOutputPaths {
  return { outJson: undefined, outMd: undefined, annotatePath: undefined };
}

async function prepareAnalyzerRun(invocation: ResolvedInvocation): Promise<PreparedAnalyzerRun> {
  if (!invocation.outJson && !invocation.outMd && !invocation.annotatePath) {
    const outputPaths = emptyAnalyzerOutputPaths();
    return { args: buildAnalyzerArgs(invocation, outputPaths), outputPaths, tempDir: undefined };
  }

  const tempDir = await mkdtemp(join(tmpdir(), "pi-ui-feedback-"));
  const outputPaths: AnalyzerOutputPaths = {
    outJson: invocation.outJson ? join(tempDir, "report.json") : undefined,
    outMd: invocation.outMd ? join(tempDir, "report.md") : undefined,
    annotatePath: invocation.annotatePath ? join(tempDir, `annotation${extname(invocation.annotatePath) || ".png"}`) : undefined,
  };

  return { args: buildAnalyzerArgs(invocation, outputPaths), outputPaths, tempDir };
}

async function cleanupAnalyzerRun(prepared: PreparedAnalyzerRun): Promise<void> {
  if (!prepared.tempDir) return;
  await rm(prepared.tempDir, { recursive: true, force: true });
}

async function copyAnalyzerOutput(source: string | undefined, destination: string | undefined, label: string): Promise<string | undefined> {
  if (!source || !destination) return undefined;
  let info: FileStats;
  try {
    info = await stat(source);
  } catch (err) {
    if (errorCode(err) === "ENOENT") return undefined;
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Unable to read analyzer ${label} output: ${message}`);
  }
  if (!info.isFile()) throw new Error(`Analyzer ${label} output is not a file.`);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination, fsConstants.COPYFILE_EXCL);
  return destination;
}

async function publishAnalyzerOutputs(input: {
  invocation: ResolvedInvocation;
  outputPaths: AnalyzerOutputPaths;
  publishJson: boolean;
  publishArtifacts: boolean;
}): Promise<Record<string, string>> {
  const artifacts: Record<string, string> = {};
  if (input.publishJson) {
    const json = await copyAnalyzerOutput(input.outputPaths.outJson, input.invocation.outJson, "out_json");
    if (json) artifacts.json = json;
  }
  if (input.publishArtifacts) {
    const markdown = await copyAnalyzerOutput(input.outputPaths.outMd, input.invocation.outMd, "out_md");
    if (markdown) artifacts.markdown = markdown;
    const annotation = await copyAnalyzerOutput(input.outputPaths.annotatePath, input.invocation.annotatePath, "annotate_path");
    if (annotation) artifacts.annotation = annotation;
  }
  return artifacts;
}

function truncate(input: string | undefined, maxChars = MAX_TEXT_CHARS): string {
  if (!input) return "";
  return input.length <= maxChars ? input : `${input.slice(0, maxChars)}\n... truncated ${input.length - maxChars} chars`;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function reportRecords(report: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(report)) return report.map(asRecord).filter((entry): entry is Record<string, unknown> => Boolean(entry));
  const record = asRecord(report);
  return record ? [record] : [];
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function combinedSummary(report: unknown): SummaryCounts | undefined {
  const combined: SummaryCounts = {};
  let sawSummary = false;

  for (const record of reportRecords(report)) {
    const summary = asRecord(record.summary);
    if (!summary) continue;
    for (const key of STATUS_KEYS) {
      const value = numberValue(summary[key]);
      if (value === undefined) continue;
      combined[key] = (combined[key] ?? 0) + value;
      sawSummary = true;
    }
  }

  return sawSummary ? combined : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function topIssues(report: unknown, limit = TOP_ISSUE_LIMIT): IssueSummary[] {
  const issues: IssueSummary[] = [];

  for (const record of reportRecords(report)) {
    const rawIssues = Array.isArray(record.issues) ? record.issues : [];
    for (const rawIssue of rawIssues) {
      const issue = asRecord(rawIssue);
      if (!issue) continue;
      const message = stringValue(issue.message) ?? truncate(JSON.stringify(issue), 220);
      if (!message) continue;
      const summary: IssueSummary = { message: truncate(message, 220) };
      const checkId = stringValue(issue.check_id);
      const severity = stringValue(issue.severity);
      const suggestion = stringValue(issue.suggestion);
      if (checkId) summary.check_id = checkId;
      if (severity) summary.severity = severity;
      if (suggestion) summary.suggestion = truncate(suggestion, 220);
      issues.push(summary);
      if (issues.length >= limit) return issues;
    }
  }

  return issues;
}

function collectReportArtifacts(report: unknown): Record<string, string> {
  const artifacts: Record<string, string> = {};
  for (const record of reportRecords(report)) {
    const rawArtifacts = asRecord(record.artifacts);
    if (!rawArtifacts) continue;
    for (const [key, value] of Object.entries(rawArtifacts)) {
      if (Object.keys(artifacts).length >= MAX_ARTIFACT_COUNT) return artifacts;
      if (typeof value !== "string" || !value.trim()) continue;
      artifacts[truncate(key, 80)] = truncate(value.trim(), MAX_ARTIFACT_CHARS);
    }
  }
  return artifacts;
}

function invocationArtifacts(report: unknown, publishedArtifacts: Record<string, string>): Record<string, string> {
  const artifacts = collectReportArtifacts(report);
  for (const key of ["json", "markdown", "annotation"]) delete artifacts[key];
  return { ...artifacts, ...publishedArtifacts };
}

function formatSummary(summary: SummaryCounts | undefined): string {
  if (!summary) return "summary unavailable";
  return STATUS_KEYS.map((key) => `${key}=${summary[key] ?? 0}`).join(", ");
}

function formatArtifacts(artifacts: Record<string, string>): string {
  const entries = Object.entries(artifacts);
  if (!entries.length) return "";
  return entries.map(([key, value]) => `${key}: ${value}`).join("\n");
}

function reportPreview(source: ReportPreview["source"], bytes: number, raw: string | undefined): ReportPreview {
  if (raw === undefined) return { source, bytes };
  return {
    source,
    bytes,
    excerpt: truncate(raw, MAX_REPORT_EXCERPT_CHARS),
    truncated: raw.length > MAX_REPORT_EXCERPT_CHARS,
  };
}

function parseRawReport(raw: string, source: ReportPreview["source"], bytes: number): ParsedReport {
  const preview = reportPreview(source, bytes, raw);
  if (!raw.trim()) return { reportPreview: preview };
  if (bytes > MAX_REPORT_BYTES) {
    return {
      parseError: `JSON report from ${source} is ${bytes} bytes; maximum supported size is ${MAX_REPORT_BYTES} bytes. Skipped parsing.`,
      reportPreview: preview,
    };
  }

  try {
    return { report: JSON.parse(raw) as unknown, reportPreview: preview };
  } catch (err) {
    const parseError = err instanceof Error ? err.message : String(err);
    return { parseError, reportPreview: preview };
  }
}

async function parseReport(outJson: string | undefined, stdout: string, allowFileOutput: boolean): Promise<ParsedReport> {
  if (outJson) {
    if (!allowFileOutput) return { parseError: "Analyzer was killed; skipped JSON report parsing." };

    let info: FileStats;
    try {
      info = await stat(outJson);
    } catch (err) {
      if (errorCode(err) === "ENOENT") return { parseError: "JSON report was not produced by this analyzer invocation." };
      const message = err instanceof Error ? err.message : String(err);
      return { parseError: `Unable to stat JSON report produced by analyzer: ${message}` };
    }

    if (!info.isFile()) return { parseError: "JSON report produced by analyzer is not a file." };
    if (info.size > MAX_REPORT_BYTES) {
      return {
        parseError: `JSON report is ${info.size} bytes; maximum supported size is ${MAX_REPORT_BYTES} bytes. Skipped parsing.`,
        reportPreview: reportPreview("file", info.size, undefined),
      };
    }

    try {
      const raw = await readFile(outJson, "utf8");
      const bytes = Buffer.byteLength(raw, "utf8");
      return parseRawReport(raw, "file", bytes);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { parseError: `Unable to read JSON report produced by analyzer: ${message}` };
    }
  }

  return parseRawReport(stdout, "stdout", Buffer.byteLength(stdout, "utf8"));
}

function resultText(input: {
  exitCode: number;
  killed: boolean;
  imagePath: string;
  summary: SummaryCounts | undefined;
  issues: IssueSummary[];
  artifacts: Record<string, string>;
  stderr: string;
  parseError: string | undefined;
}): string {
  const lines = [`UI feedback analyzer exited ${input.exitCode}${input.killed ? " (killed)" : ""} for ${input.imagePath}.`];
  lines.push(`Summary: ${formatSummary(input.summary)}.`);

  if (input.issues.length) {
    lines.push("Top issues:");
    for (const issue of input.issues) {
      const label = [issue.severity, issue.check_id].filter(Boolean).join("/") || "issue";
      lines.push(`- ${label}: ${issue.message}${issue.suggestion ? ` — ${issue.suggestion}` : ""}`);
    }
  } else if (input.summary) {
    lines.push("Top issues: none reported.");
  }

  const artifactsText = formatArtifacts(input.artifacts);
  if (artifactsText) lines.push(`Artifacts:\n${artifactsText}`);
  if (input.parseError) lines.push(`Report parse note: ${truncate(input.parseError, 500)}`);
  if (input.exitCode !== 0 && input.stderr.trim()) lines.push(`stderr:\n${truncate(input.stderr.trim(), 1_000)}`);
  return lines.join("\n");
}

async function runUiFeedbackAnalyzer(
  pi: ExtensionAPI,
  params: UiFeedbackAnalyzeParams,
  cwd: string,
  signal?: AbortSignal,
  onUpdate?: (text: string) => void,
) {
  const invocation = buildInvocation(params, cwd);
  await assertOutputPathsAvailable(invocation);
  const prepared = await prepareAnalyzerRun(invocation);

  try {
    onUpdate?.(`Analyzing UI feedback for ${invocation.imagePath}...`);

    const execResult = await pi.exec("uv", prepared.args, {
      cwd,
      signal,
      timeout: invocation.timeoutMs,
    });
    const parsed = await parseReport(prepared.outputPaths.outJson, execResult.stdout, !execResult.killed);
    const publishArtifacts = !execResult.killed;
    const publishedArtifacts = await publishAnalyzerOutputs({
      invocation,
      outputPaths: prepared.outputPaths,
      publishJson: !execResult.killed,
      publishArtifacts,
    });
    const summary = combinedSummary(parsed.report);
    const issues = topIssues(parsed.report);
    const artifacts = invocationArtifacts(parsed.report, publishedArtifacts);
    const text = resultText({
      exitCode: execResult.code,
      killed: execResult.killed,
      imagePath: invocation.imagePath,
      summary,
      issues,
      artifacts,
      stderr: execResult.stderr,
      parseError: parsed.parseError,
    });

    return {
      content: [{ type: "text" as const, text }],
      details: {
        command: "uv",
        args: prepared.args,
        cwd,
        timeoutMs: invocation.timeoutMs,
        exitCode: execResult.code,
        killed: execResult.killed,
        summary,
        topIssues: issues,
        artifacts,
        reportPreview: parsed.reportPreview,
        parseError: parsed.parseError ? truncate(parsed.parseError, 1_000) : undefined,
        stdout: truncate(execResult.stdout),
        stderr: truncate(execResult.stderr),
      },
    };
  } finally {
    await cleanupAnalyzerRun(prepared);
  }
}

const uiFeedbackAnalyzeTool = (pi: ExtensionAPI) => defineTool({
  name: "ui_feedback_analyze",
  label: "UI Feedback Analyze",
  description:
    "Run the local UI feedback analyzer on a local screenshot or UI asset. Supports optional component/check specs and JSON, Markdown, and annotated-image outputs. Paths expand ~, ignore leading @, and resolve relative to the current working directory.",
  promptSnippet: "Analyze local UI screenshots/assets with the local UI feedback analyzer.",
  promptGuidelines: [
    "Use ui_feedback_analyze for non-secret local UI screenshots/assets when heuristic visual feedback would help UX review, E2E test triage, or code review.",
    "Prefer ui_feedback_analyze with spec_path when component boxes/checks are known; request out_json, out_md, and annotate_path when artifacts should be saved.",
    "Treat ui_feedback_analyze findings as heuristic evidence and verify important issues manually before making final claims.",
  ],
  parameters: Type.Object({
    image_path: Type.String({ description: "Screenshot or UI asset path. Leading @ is ignored; ~ expands; relative paths resolve from the current working directory." }),
    spec_path: Type.Optional(Type.String({ description: "Optional JSON spec path with known component boxes/check definitions." })),
    checks: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())], { description: "Optional check filter as a comma string or string array. Use all or names like alignment,spacing,contrast." })),
    out_json: Type.Optional(Type.String({ description: "Optional JSON report output path." })),
    out_md: Type.Optional(Type.String({ description: "Optional Markdown report output path." })),
    annotate_path: Type.Optional(Type.String({ description: "Optional annotated image output path." })),
    fail_on: Type.Optional(Type.String({ enum: FAIL_ON_VALUES, default: "never", description: "Analyzer failure threshold. Defaults to never so the tool returns findings without failing the run." })),
    debug_components: Type.Optional(Type.Boolean({ description: "Pass --debug-components to the analyzer." })),
    timeout_ms: Type.Optional(Type.Integer({ minimum: MIN_TIMEOUT_MS, maximum: MAX_TIMEOUT_MS, description: `Execution timeout in milliseconds (${MIN_TIMEOUT_MS}-${MAX_TIMEOUT_MS}). Defaults to ${DEFAULT_TIMEOUT_MS}.` })),
  }),

  async execute(_toolCallId, params, signal, onUpdate, ctx) {
    return runUiFeedbackAnalyzer(pi, params as UiFeedbackAnalyzeParams, ctx.cwd, signal, (text) => {
      onUpdate?.({ content: [{ type: "text", text }] });
    });
  },
});

function splitShellArgs(input: string): string[] {
  const args: string[] = [];
  let current = "";
  let quote: "'" | '"' | undefined;
  let escaping = false;

  for (const char of input) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === "\\" && quote !== "'") {
      escaping = true;
      continue;
    }
    if ((char === "'" || char === '"') && !quote) {
      quote = char;
      continue;
    }
    if (char === quote) {
      quote = undefined;
      continue;
    }
    if (/\s/.test(char) && !quote) {
      if (current) {
        args.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }

  if (escaping) current += "\\";
  if (quote) throw new Error("Unterminated quoted argument.");
  if (current) args.push(current);
  return args;
}

const USAGE = "/ui-feedback <image> [--spec path] [--checks all|alignment,spacing] [--out-json path] [--out-md path] [--annotate path] [--fail-on never|fail|warning|error] [--debug-components]";

function nextOptionValue(parts: string[], index: number, option: string, inlineValue: string | undefined): { value: string; nextIndex: number } {
  if (inlineValue !== undefined) {
    if (!inlineValue) throw new Error(`${option} requires a value. Usage: ${USAGE}`);
    return { value: inlineValue, nextIndex: index };
  }
  const value = parts[index + 1];
  if (!value) throw new Error(`${option} requires a value. Usage: ${USAGE}`);
  return { value, nextIndex: index + 1 };
}

function splitOption(part: string): { option: string; inlineValue?: string } {
  const equalsIndex = part.indexOf("=");
  if (equalsIndex < 0) return { option: part };
  return { option: part.slice(0, equalsIndex), inlineValue: part.slice(equalsIndex + 1) };
}

function parseUiFeedbackCommand(args: string): UiFeedbackAnalyzeParams {
  const parts = splitShellArgs(args);
  if (parts.length === 0) throw new Error(`Usage: ${USAGE}`);

  const params: Partial<UiFeedbackAnalyzeParams> = {};

  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (part.startsWith("--")) {
      const { option, inlineValue } = splitOption(part);
      if (option === "--debug-components") {
        if (inlineValue !== undefined) throw new Error(`--debug-components does not take a value. Usage: ${USAGE}`);
        params.debug_components = true;
      } else if (option === "--spec") {
        const parsed = nextOptionValue(parts, i, option, inlineValue);
        params.spec_path = parsed.value;
        i = parsed.nextIndex;
      } else if (option === "--checks") {
        const parsed = nextOptionValue(parts, i, option, inlineValue);
        params.checks = parsed.value;
        i = parsed.nextIndex;
      } else if (option === "--out-json") {
        const parsed = nextOptionValue(parts, i, option, inlineValue);
        params.out_json = parsed.value;
        i = parsed.nextIndex;
      } else if (option === "--out-md") {
        const parsed = nextOptionValue(parts, i, option, inlineValue);
        params.out_md = parsed.value;
        i = parsed.nextIndex;
      } else if (option === "--annotate") {
        const parsed = nextOptionValue(parts, i, option, inlineValue);
        params.annotate_path = parsed.value;
        i = parsed.nextIndex;
      } else if (option === "--fail-on") {
        const parsed = nextOptionValue(parts, i, option, inlineValue);
        if (!isFailOn(parsed.value)) throw new Error(`--fail-on must be one of ${FAIL_ON_VALUES.join("|")}. Usage: ${USAGE}`);
        params.fail_on = parsed.value;
        i = parsed.nextIndex;
      } else {
        throw new Error(`Unknown option ${option}. Usage: ${USAGE}`);
      }
    } else if (!params.image_path) {
      params.image_path = part;
    } else {
      throw new Error(`Unexpected argument ${part}. Usage: ${USAGE}`);
    }
  }

  if (!params.image_path) throw new Error(`Usage: ${USAGE}`);
  return params as UiFeedbackAnalyzeParams;
}

export default function (pi: ExtensionAPI) {
  pi.registerTool(uiFeedbackAnalyzeTool(pi));

  pi.registerCommand("ui-feedback", {
    description: "Analyze a UI screenshot/asset: /ui-feedback <image> [--spec path] [--checks all|alignment,spacing] [--out-json path] [--out-md path] [--annotate path] [--fail-on never|fail|warning|error] [--debug-components]",
    handler: async (args, ctx) => {
      try {
        const result = await runUiFeedbackAnalyzer(pi, parseUiFeedbackCommand(args), ctx.cwd, ctx.signal, (text) => {
          ctx.ui.setStatus("ui-feedback", text);
        });
        const text = result.content[0]?.text ?? "UI feedback analyzer finished.";
        ctx.ui.notify(truncate(text, 2_000), result.details.exitCode === 0 ? "info" : "warning");
      } catch (err) {
        ctx.ui.notify(err instanceof Error ? err.message : String(err), "error");
      } finally {
        ctx.ui.setStatus("ui-feedback", undefined);
      }
    },
  });
}
