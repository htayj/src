import type { TaskKind, TaskStatus } from "./schema";
import type { RootWorkCounts } from "./root-work-queue";
import { renderRootWorkCounts } from "./root-work-queue";

export type ExtensionWorkflowId =
  | "changed-files"
  | "notes"
  | "http-api"
  | "tmux-worker"
  | "image-ai"
  | "comfyui-civitai";

export interface ExtensionWorkflowDescriptor {
  readonly id: ExtensionWorkflowId;
  readonly label: string;
  readonly priority: number;
  readonly summary: string;
  readonly triggerExamples: readonly string[];
  readonly activation: "conservative" | "strong-only";
  readonly tools: readonly string[];
  readonly graphGuidance: readonly string[];
  readonly evidenceGuidance: readonly string[];
  readonly safetyNotes: readonly string[];
  readonly taskKinds?: readonly TaskKind[];
}

export interface ExtensionWorkflowMatchContext {
  readonly prompt?: string;
  readonly text?: string;
  readonly title?: string;
  readonly description?: string;
  readonly kind?: TaskKind | string;
  readonly runnerName?: string;
  readonly toolNames?: readonly string[];
}

export interface ExtensionWorkflowMatch {
  readonly descriptor: ExtensionWorkflowDescriptor;
  readonly matchedTerms: readonly string[];
  readonly reason: string;
}

export interface ExtensionActiveRunSummary {
  /** Caller-provided run id only; do not pass full run objects or raw run JSON. */
  readonly runId: string;
  /** Caller-provided status only. */
  readonly status?: TaskStatus | string;
  /** Caller-provided root-work counts only. */
  readonly rootWorkCounts?: RootWorkCounts;
  /** Caller-provided ready task count only. */
  readonly readyTaskCount?: number;
  /** Optional public, already-sanitized root-work label. */
  readonly activeRootWorkLabel?: string;
}

export interface ExtensionGuideRenderOptions {
  readonly prompt?: string;
  readonly workflow?: ExtensionWorkflowId;
  readonly workflows?: readonly ExtensionWorkflowId[];
  readonly activeRun?: ExtensionActiveRunSummary;
  readonly maxWorkflows?: number;
  readonly maxRenderedChars?: number;
  readonly includeOverview?: boolean;
}

export interface ExtensionPromptBlockOptions {
  readonly maxWorkflows?: number;
  readonly maxRenderedChars?: number;
}

export interface SanitizeExtensionGuideOptions {
  readonly maxInputChars?: number;
  readonly maxLineLength?: number;
  readonly maxLines?: number;
}

const DEFAULT_MAX_INPUT_CHARS = 2_000;
const DEFAULT_MAX_RENDERED_CHARS = 4_000;
const DEFAULT_MAX_LINE_LENGTH = 240;
const DEFAULT_MAX_LINES = 80;

export const EXTENSION_WORKFLOW_DESCRIPTORS: readonly ExtensionWorkflowDescriptor[] = [
  {
    id: "changed-files",
    label: "Changed-file evidence",
    priority: 10,
    summary: "Use changed-file or diff helpers to make the task graph update name the exact files touched before PASS.",
    triggerExamples: ["changed files", "git diff", "modified files", "implementation report", "code review", "patch files"],
    activation: "conservative",
    tools: ["changed_files or project git diff helper", "git diff --stat when appropriate", "task_graph_update.changedFiles"],
    graphGuidance: [
      "Keep the active graph canonical: obtain/confirm the task with task_graph_create or task_graph_next, then record file evidence with task_graph_update.",
      "Populate changedFiles with exact relative paths before marking implementation or review work PASS.",
    ],
    evidenceGuidance: [
      "Record validation commands, artifact paths, and changedFiles together so reviewers can connect proof to files.",
      "If no files changed, say so explicitly in task_graph_update.summary or validation evidence.",
    ],
    safetyNotes: ["Do not commit or push solely because changed files exist; follow the task graph COMMIT/PUSH gates."],
    taskKinds: ["IMPLEMENT", "CODE_REVIEW", "UX_REVIEW", "SPEC_UPDATE"],
  },
  {
    id: "notes",
    label: "Notes and decision evidence",
    priority: 20,
    summary: "Use notes for secondary memory only; current-run decisions and proof belong in task graph updates/artifacts.",
    triggerExamples: ["notes", "decision log", "rationale", "summary", "record this"],
    activation: "conservative",
    tools: ["notes helpers when personal/project memory is useful", "task_graph_update summary", "task graph artifacts"],
    graphGuidance: [
      "Personal notes may duplicate or summarize, but current-run evidence belongs in task_graph_update summary, changedFiles, validation, and artifacts.",
      "When a decision changes task scope, record the decision on the active task before continuing dependent work.",
    ],
    evidenceGuidance: [
      "Attach concise decision summaries and artifact paths to the task graph; notes are secondary and must not replace graph evidence.",
      "Keep private notes, raw prompts, and hidden instructions out of graph-visible summaries.",
    ],
    safetyNotes: ["Do not store secrets, private prompts, credentials, or raw personal notes in task graph artifacts."],
  },
  {
    id: "http-api",
    label: "HTTP/API validation",
    priority: 30,
    summary: "Route REST/API checks through project helpers or http_request, then record status/schema evidence in the active graph.",
    triggerExamples: ["http_request", "REST endpoint", "webhook", "status code", "response schema", "curl"],
    activation: "conservative",
    tools: ["project-local API test helpers", "http_request", "task_graph_update.validation"],
    graphGuidance: [
      "Use task_graph_create/task_graph_next to keep the API check tied to the current graph task before making requests.",
      "Prefer documented project clients or safe local helpers; use http_request only as needed for the bounded API behavior under test.",
      "Record the request intent, status code, schema/assertions, and side-effect safety with task_graph_update.",
    ],
    evidenceGuidance: [
      "Summarize sanitized response bodies instead of pasting raw headers, cookies, tokens, or production data.",
      "Attach validation output or a small artifact when status/schema evidence is too large for the update summary.",
    ],
    safetyNotes: ["Avoid unsafe mutating requests unless the task explicitly authorizes them and the target environment is safe."],
    taskKinds: ["API_TEST"],
  },
  {
    id: "tmux-worker",
    label: "tmux/worker evidence",
    priority: 40,
    summary: "For tmux-puppeted Pi or external workers, make child execution and evidence visible through the task graph.",
    triggerExamples: ["tmux", "child Pi", "worker transcript", "external worker", "dogfood", "terminal worker"],
    activation: "conservative",
    tools: ["tmux-puppeted Pi worker", "worker transcript/log path", "task_graph_update worker/child evidence"],
    graphGuidance: [
      "Create or select the parent task with task_graph_create/task_graph_next before delegating worker execution.",
      "Require the worker to report task id, child run id if any, transcript path, validation output, artifacts, and changed files.",
    ],
    evidenceGuidance: [
      "Record tmux session/pane identifiers, transcript paths, child run ids, validation commands, and changedFiles with task_graph_update.",
      "If a worker cannot produce evidence, mark the graph task NEEDS_INPUT/FAIL instead of treating the worker output as implicit proof.",
    ],
    safetyNotes: ["Do not spawn runaway worker loops or let workers mutate unrelated runs."],
  },
  {
    id: "image-ai",
    label: "AI image/screenshot artifact evidence",
    priority: 90,
    summary: "Use image generation or screenshot/vision tooling only on strong image-artifact prompts, then record generated paths and critiques.",
    triggerExamples: ["image generation", "generated image", "image model", "screenshot", "visual critique", "raster", "sprite"],
    activation: "strong-only",
    tools: ["image model or vision helper", "screenshot/critique helper", "task graph artifacts"],
    graphGuidance: [
      "Only activate this hint for explicit image, screenshot, raster, sprite, or critique work; generic UI/visual wording is not enough.",
      "Keep task_graph_create/task_graph_next as the controller path and record outputs with task_graph_update artifacts/validation.",
    ],
    evidenceGuidance: [
      "Record generated output paths, prompt-safe summaries, screenshot paths, visual critique artifacts, and validation notes.",
      "Do not paste raw hidden prompts, model secrets, or unsafe source images into graph summaries.",
    ],
    safetyNotes: ["Keep generated media provenance concise and non-secret; avoid copying private prompt text."],
  },
  {
    id: "comfyui-civitai",
    label: "ComfyUI/Civitai workflow evidence",
    priority: 95,
    summary: "For explicit ComfyUI/Civitai work, record workflow JSON, model/provenance notes, generated paths, and critiques as task artifacts.",
    triggerExamples: ["ComfyUI", "Civitai", "ComfyUI workflow JSON", "LoRA", "ComfyUI node graph", "model checkpoint"],
    activation: "strong-only",
    tools: ["ComfyUI workflow", "Civitai/model asset reference", "workflow JSON artifact", "task graph artifacts"],
    graphGuidance: [
      "Only activate this hint for strong ComfyUI, Civitai, LoRA, or model-checkpoint prompts; treat workflow JSON and node-graph wording as supporting context only.",
      "Use the task graph as the controller: task_graph_create/task_graph_next for work selection and task_graph_update for evidence.",
    ],
    evidenceGuidance: [
      "Save generated paths, workflow JSON path, node graph notes, model/checkpoint/LoRA provenance, and critique artifacts on the graph task.",
      "Record paths and non-secret asset names rather than credentials, raw cookies, or private model download tokens.",
    ],
    safetyNotes: ["Do not include Civitai API keys, cookies, private checkpoints, or hidden prompt text in task graph output."],
  },
] as const;

const DESCRIPTORS_BY_ID: ReadonlyMap<ExtensionWorkflowId, ExtensionWorkflowDescriptor> = new Map(
  EXTENSION_WORKFLOW_DESCRIPTORS.map((descriptor) => [descriptor.id, descriptor]),
);

interface TriggerMatcher {
  readonly term: string;
  readonly pattern: RegExp;
}

const IMAGE_AI_BOUNDED_SCREENSHOT_MODIFIER = String.raw`(?:final|before\/after|before[-\s]+after|before\s+and\s+after|mobile|desktop|tablet|responsive|browser|web|ios|android)`;
const IMAGE_AI_SCREENSHOT_CAPTURE_ACTION = String.raw`(?:capture|capturing|take|taking|grab|grabbing|record|recording|collect|collecting|save|saving|attach|attaching|include|including|create|creating|generate|generating)`;

const TRIGGER_MATCHERS: Record<ExtensionWorkflowId, readonly TriggerMatcher[]> = {
  "changed-files": [
    { term: "changed files", pattern: /\bchanged[-\s]?files?\b/i },
    { term: "changedFiles", pattern: /\bchangedFiles\b/ },
    { term: "git diff", pattern: /\bgit\s+diff\b/i },
    { term: "diff --stat", pattern: /\bdiff\s+--stat\b/i },
    { term: "current diff", pattern: /\bcurrent\s+diff\b/i },
    { term: "modified files", pattern: /\bmodified\s+files?\b/i },
    { term: "implementation report files", pattern: /\bimplementation\s+report\b[\s\S]{0,80}\b(?:files?|changed)\b/i },
    { term: "patch files", pattern: /\bpatch\b[\s\S]{0,80}\b(?:files?|diff)\b/i },
  ],
  notes: [
    { term: "notes", pattern: /\bnotes?\b/i },
    { term: "decision log", pattern: /\bdecision\s+(?:log|record|summary)\b/i },
    { term: "rationale", pattern: /\brationale\b/i },
    { term: "record decision", pattern: /\brecord\s+(?:this|the\s+decision|a\s+decision|decision|summary)\b/i },
    { term: "session summary", pattern: /\bsession\s+summary\b/i },
  ],
  "http-api": [
    { term: "http_request", pattern: /\bhttp_request\b/i },
    { term: "REST", pattern: /\bREST\b/ },
    { term: "endpoint", pattern: /\bendpoint\b/i },
    { term: "webhook", pattern: /\bwebhook\b/i },
    { term: "status code", pattern: /\bstatus\s+codes?\b/i },
    { term: "response schema", pattern: /\bresponse\s+schema\b/i },
    { term: "curl", pattern: /\bcurl\b/i },
    { term: "HTTP API", pattern: /\bhttps?\s+api\b|\bapi\s+request\b|\bapi\s+response\b/i },
  ],
  "tmux-worker": [
    { term: "tmux", pattern: /\btmux\b/i },
    { term: "tmux-puppeted", pattern: /\btmux[-\s]?puppeted\b/i },
    { term: "child Pi", pattern: /\bchild\s+Pi\b/i },
    { term: "worker transcript", pattern: /\bworker\s+transcript\b/i },
    { term: "external worker", pattern: /\bexternal\s+worker\b/i },
    { term: "terminal worker", pattern: /\bterminal\s+worker\b/i },
    { term: "dogfood worker", pattern: /\bdogfood\b[\s\S]{0,80}\b(?:worker|tmux|child\s+Pi)\b/i },
    { term: "subagent worker", pattern: /\bsubagent\b[\s\S]{0,80}\b(?:worker|evidence|transcript)\b|\bworker\b[\s\S]{0,80}\bsubagent\b/i },
  ],
  "image-ai": [
    { term: "image generation", pattern: /\bimage\s+generation\b/i },
    { term: "generated image", pattern: /\bgenerated\s+image\b/i },
    { term: "generate image", pattern: /\bgenerate\s+(?:an?\s+)?image\b/i },
    { term: "image model", pattern: /\bimage[-\s]?model\b/i },
    { term: "screenshot", pattern: new RegExp(String.raw`\b${IMAGE_AI_SCREENSHOT_CAPTURE_ACTION}\s+(?:an?\s+|the\s+|any\s+)?(?:(?:${IMAGE_AI_BOUNDED_SCREENSHOT_MODIFIER})\s+){1,2}screenshots?\b`, "i") },
    { term: "screenshot", pattern: /\b(?:(?:(?:capture|capturing|take|taking|grab|grabbing|record|recording|collect|collecting|save|saving|attach|attaching|include|including|create|creating|generate|generating|analy[sz]e|analy[sz]ing|inspect|inspecting|evaluate|evaluating|critique|critiquing|compare|comparing|use|using|run|running|provide|providing)\s+(?:an?\s+|the\s+|any\s+)?screenshots?)|(?:review|reviewing)\s+(?:an?\s+|the\s+|any\s+)?(?:provided\s+|attached\s+)?screenshots?\s+(?:url|uri|link|assets?|artifacts?|evidence|captures?|tools?|paths?|files?|diff|comparison|review|analysis|critique|from\s+(?:the\s+)?bug\s+report)|(?:review|reviewing)\s+(?:an?\s+|the\s+|any\s+)?(?:provided|attached)\s+screenshots?|screenshots?\s+(?:url|uri|link|assets?|artifacts?|evidence|captures?|tools?|paths?|files?|diff|comparison|review|analysis|critique|from\s+(?:the\s+)?bug\s+report))\b/i },
    { term: "visual critique", pattern: /\bvisual\s+critique\b/i },
    { term: "raster", pattern: /\braster\b/i },
    { term: "sprite", pattern: /\bsprite\b/i },
    { term: "9-slice", pattern: /\b9[-\s]?(?:slice|patch)\b/i },
  ],
  "comfyui-civitai": [
    { term: "ComfyUI", pattern: /\bComfyUI\b/i },
    { term: "Civitai", pattern: /\bCivitai\b/i },
    { term: "workflow JSON", pattern: /\bworkflow\s+JSON\b/i },
    { term: "LoRA", pattern: /\bLoRA\b/ },
    { term: "node graph", pattern: /\bnode\s+graph\b/i },
    { term: "Stable Diffusion checkpoint", pattern: /\b(?:Stable\s+Diffusion[\s\S]{0,80}\b(?:model[-\s]?checkpoint|checkpoint[-\s]?model|checkpoint)|(?:model[-\s]?checkpoint|checkpoint[-\s]?model|checkpoint)[\s\S]{0,80}\bStable\s+Diffusion)\b/i },
    { term: "model checkpoint", pattern: /\b(?:model[-\s]?checkpoint|checkpoint[-\s]?model)\b/i },
  ],
};

const COMFYUI_CIVITAI_ALWAYS_STRONG_TERMS = new Set(["ComfyUI", "Civitai", "LoRA", "Stable Diffusion checkpoint"]);

function unique<T>(items: readonly T[]) {
  return [...new Set(items)];
}

function capText(input: string, maxChars: number) {
  if (input.length <= maxChars) return input;
  const suffix = "\n[TRUNCATED]";
  return `${input.slice(0, Math.max(0, maxChars - suffix.length)).trimEnd()}${suffix}`.slice(0, maxChars);
}

function renderedLimit(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function capLine(input: string, maxChars: number) {
  if (input.length <= maxChars) return input;
  return `${input.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

const SECRET_FIELD_NAME_PATTERN = String.raw`(?:authorization|cookie|set[-_]?cookie|x[-_]?api[-_]?key|api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|id[_-]?token|client[_-]?secret|password|passwd|secret|token|private[-_\s]?key|OPENAI_API_KEY|ANTHROPIC_API_KEY|GITHUB_TOKEN|AWS_SECRET_ACCESS_KEY)`;
const INLINE_HEADER_SECRET_FIELD_NAME_PATTERN = String.raw`(?:authorization|cookie|set[-_]?cookie|x[-_]?api[-_]?key)`;
const SECRET_FIELD_PREFIX_CHARS = String.raw`[\s{}\[\]()<>,;:&?'"=]`;
const SECRET_FIELD_PREFIX_PATTERN = String.raw`(^|${SECRET_FIELD_PREFIX_CHARS})`;
const INLINE_HEADER_VALUE_END_PATTERN = String.raw`(?=(?:${SECRET_FIELD_PREFIX_CHARS}+["']?${INLINE_HEADER_SECRET_FIELD_NAME_PATTERN}["']?\s*[:=])|[\]\)}>]|["']|$)`;
const PROMPT_FIELD_NAME_PATTERN = String.raw`(?:system|developer|assistant|hidden|instructions|chain[_-]of[_-]thought|scratchpad|prompt|[A-Za-z0-9]+Prompt|[A-Za-z0-9]+[_-]prompt|private\s+prompt|root\s+prompt)`;
const PROMPT_FIELD_REDACTION = "[REDACTED PROMPT-LIKE FIELD]";
const QUOTED_SECRET_FIELD_PATTERN = new RegExp(String.raw`${SECRET_FIELD_PREFIX_PATTERN}(["']?)(${SECRET_FIELD_NAME_PATTERN})\2(\s*[:=]\s*)(["'])(?:\\.|(?!\5)[\s\S])*\5`, "gi");
const INLINE_UNQUOTED_HEADER_SECRET_FIELD_PATTERN = new RegExp(String.raw`${SECRET_FIELD_PREFIX_PATTERN}(["']?)(${INLINE_HEADER_SECRET_FIELD_NAME_PATTERN})\2(\s*[:=]\s*)(?!["']|\[REDACTED\])([\s\S]*?)${INLINE_HEADER_VALUE_END_PATTERN}`, "gi");
const UNQUOTED_SECRET_FIELD_PATTERN = new RegExp(String.raw`${SECRET_FIELD_PREFIX_PATTERN}(["']?)(${SECRET_FIELD_NAME_PATTERN})\2(\s*[:=]\s*)(?!["']|\[REDACTED\])([^\s&#,;}\]\)>"']+)`, "gi");
const PROMPT_LINE_PATTERN = new RegExp(String.raw`^(\s*)(["']?)(${PROMPT_FIELD_NAME_PATTERN})\2(\s*[:=]\s*)[\s\S]*$`, "i");
const QUOTED_PROMPT_FIELD_PATTERN = new RegExp(String.raw`(^|[\s{,])(["']?)(${PROMPT_FIELD_NAME_PATTERN})\2(\s*[:=]\s*)(["'])(?:\\.|(?!\5)[\s\S])*\5`, "gi");
const UNQUOTED_PROMPT_FIELD_PATTERN = new RegExp(String.raw`(^|[\s{,])(["']?)(${PROMPT_FIELD_NAME_PATTERN})\2(\s*[:=]\s*)(?!["'])[^,}]*`, "gi");

function redactPromptLikeLine(line: string) {
  const fullLineRedacted = line.replace(
    PROMPT_LINE_PATTERN,
    (_match: string, prefix: string, keyQuote: string, key: string, separator: string) => `${prefix}${keyQuote}${key}${keyQuote}${separator}${PROMPT_FIELD_REDACTION}`,
  );
  if (fullLineRedacted !== line) return fullLineRedacted;
  return line
    .replace(
      QUOTED_PROMPT_FIELD_PATTERN,
      (_match: string, prefix: string, keyQuote: string, key: string, separator: string, valueQuote: string) => `${prefix}${keyQuote}${key}${keyQuote}${separator}${valueQuote}${PROMPT_FIELD_REDACTION}${valueQuote}`,
    )
    .replace(
      UNQUOTED_PROMPT_FIELD_PATTERN,
      (_match: string, prefix: string, keyQuote: string, key: string, separator: string) => `${prefix}${keyQuote}${key}${keyQuote}${separator}${PROMPT_FIELD_REDACTION}`,
    );
}

function redactSecretAssignments(line: string) {
  return line
    .replace(
      QUOTED_SECRET_FIELD_PATTERN,
      (_match: string, prefix: string, keyQuote: string, key: string, separator: string, valueQuote: string) => `${prefix}${keyQuote}${key}${keyQuote}${separator}${valueQuote}[REDACTED]${valueQuote}`,
    )
    .replace(
      INLINE_UNQUOTED_HEADER_SECRET_FIELD_PATTERN,
      (_match: string, prefix: string, keyQuote: string, key: string, separator: string) => `${prefix}${keyQuote}${key}${keyQuote}${separator}[REDACTED]`,
    )
    .replace(
      UNQUOTED_SECRET_FIELD_PATTERN,
      (_match: string, prefix: string, keyQuote: string, key: string, separator: string) => `${prefix}${keyQuote}${key}${keyQuote}${separator}[REDACTED]`,
    );
}

function redactPrivateKeyBlocks(input: string) {
  return input.replace(/-----BEGIN\s+([A-Z0-9 ]*PRIVATE\s+KEY)-----[\s\S]*?(?:-----END\s+\1-----|$)/gi, "[REDACTED PRIVATE KEY]");
}

export function redactExtensionGuideSecrets(input: string) {
  return redactPrivateKeyBlocks(input)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .split(/\r?\n/)
    .map((line) => redactSecretAssignments(line).replace(/[A-Za-z0-9_+\-/=]{80,}/g, "[REDACTED-LONG-TOKEN]"))
    .join("\n");
}

export function sanitizeExtensionGuideText(input: unknown, options: SanitizeExtensionGuideOptions = {}) {
  if (typeof input !== "string") return "";
  const maxInputChars = Math.max(0, options.maxInputChars ?? DEFAULT_MAX_INPUT_CHARS);
  const maxLineLength = Math.max(24, options.maxLineLength ?? DEFAULT_MAX_LINE_LENGTH);
  const maxLines = Math.max(1, options.maxLines ?? DEFAULT_MAX_LINES);
  const redactedPrivateKeys = redactPrivateKeyBlocks(input);
  const truncated = capText(redactedPrivateKeys, maxInputChars);
  const lines = truncated
    .split(/\r?\n/)
    .slice(0, maxLines)
    .map((rawLine) => {
      const promptRedacted = redactPromptLikeLine(rawLine);
      const secretRedacted = redactExtensionGuideSecrets(promptRedacted);
      return capLine(secretRedacted.trimEnd(), maxLineLength);
    });
  if (truncated.split(/\r?\n/).length > maxLines) lines.push("[TRUNCATED]");
  return lines.join("\n").trim();
}

function contextText(input: string | ExtensionWorkflowMatchContext) {
  if (typeof input === "string") return sanitizeExtensionGuideText(input);
  const parts = [
    input.kind,
    input.title,
    input.description,
    input.prompt,
    input.text,
    input.runnerName,
    ...(input.toolNames ?? []),
  ].filter((part): part is string => typeof part === "string" && part.trim().length > 0);
  return sanitizeExtensionGuideText(parts.join("\n"));
}

function contextKind(input: string | ExtensionWorkflowMatchContext) {
  return typeof input === "string" ? undefined : input.kind;
}

function descriptorForId(id: ExtensionWorkflowId) {
  return DESCRIPTORS_BY_ID.get(id);
}

function regexpWithGlobal(pattern: RegExp) {
  return new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
}

const IMAGE_AI_CONTEXT_NOUN = String.raw`(?:url|uri|link|assets?|artifacts?|evidence|captures?|tools?|paths?|files?|diff|comparison|review|analysis|critique|capture)`;
const IMAGE_AI_NEGATED_LIST_ITEM = String.raw`(?:(?:(?:${IMAGE_AI_BOUNDED_SCREENSHOT_MODIFIER})\s+){0,2}screenshots?(?:\s+(?:${IMAGE_AI_CONTEXT_NOUN}))?|images?|image[-\s]?models?|image\s+generation(?:\s+tools?)?|generated\s+images?|9[-\s]?(?:slice|patch)|visual(?:\s+tools?)?|vision(?:\s+tools?)?|visual\s+critiques?|visual\s+analysis|rasters?|sprites?)`;
const IMAGE_AI_NEGATED_ACTION = String.raw`(?:use|using|use\s+of|take|taking|capture|capturing|grab|grabbing|record|recording|collect|collecting|save|saving|attach|attaching|include|including|generate|generating|create|creating|produce|producing|analy[sz]e|analy[sz]ing|review|reviewing|inspect|inspecting|evaluate|evaluating|critique|critiquing|compare|comparing|run|running|perform|performing|provide|providing|call|calling|invoke|invoking)`;
const IMAGE_AI_NEGATED_ARTICLE = String.raw`(?:an?\s+|the\s+|any\s+)?`;
const IMAGE_AI_NEGATED_ITEM_PREFIX = String.raw`(?:(?:${IMAGE_AI_NEGATED_ACTION})\s+)?${IMAGE_AI_NEGATED_ARTICLE}`;
const IMAGE_AI_NEGATED_SEPARATOR = String.raw`(?:\s*,\s*(?:(?:or|and)\s+)?|\s*\/\s*|\s+(?:or|and)\s+)`;
const IMAGE_AI_CONTRASTIVE_BOUNDARY = String.raw`(?:(?:^|[,\s])but\s+|(?:^|[,;]\s*)(?:however|yet|instead)\s*,?\s+)`;

function imageAiNegationFamily(matchedText: string) {
  const text = matchedText.toLowerCase();
  const families: string[] = [];
  if (/screenshot/.test(text)) families.push(String.raw`(?:(?:${IMAGE_AI_BOUNDED_SCREENSHOT_MODIFIER})\s+){0,2}screenshots?(?:\s+(?:url|uri|link|assets?|artifacts?|evidence|captures?|tools?|paths?|files?|diff|comparison|review|analysis|critique|capture))?`);
  if (/image|9[-\s]?(?:slice|patch)/.test(text)) families.push(String.raw`images?`, String.raw`image[-\s]?models?`, String.raw`image\s+generation(?:\s+tools?)?`, String.raw`generated\s+images?`, String.raw`9[-\s]?(?:slice|patch)`);
  if (/visual/.test(text)) families.push(String.raw`visual\s+tools?`, String.raw`vision\s+tools?`, String.raw`visual\s+critiques?`, String.raw`visual\s+analysis`);
  if (/raster/.test(text)) families.push(String.raw`rasters?`);
  if (/sprite/.test(text)) families.push(String.raw`sprites?`);
  return unique(families);
}

function lastRegexMatchEnd(text: string, pattern: RegExp) {
  let end = -1;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    end = match.index + match[0].length;
    if (match[0].length === 0) pattern.lastIndex += 1;
  }
  return end;
}

function trailingInsteadContrastiveStart(before: string, after: string) {
  const afterBoundary = after.search(/[.!?;\n]/);
  const tail = afterBoundary === -1 ? after : after.slice(0, afterBoundary);
  const positiveClauseTail = tail.split(",", 1)[0] ?? tail;
  if (!/\binstead\s*$/i.test(positiveClauseTail.trim())) return -1;
  const commaIndex = before.lastIndexOf(",");
  if (commaIndex !== -1 && /^\s*(?:(?:and\s+)?(?:then|now|please)\s+)?$/i.test(before.slice(commaIndex + 1))) return commaIndex + 1;
  const noCommaThen = /(?:^|\s)(?:and\s+)?then\s+$/i.exec(before);
  if (!noCommaThen) return -1;
  const prefix = before.slice(0, noCommaThen.index).trimEnd();
  if (!/\b(?:do\s+not|don't|never|avoid)\s+use\s+(?:any\s+)?screenshots?\s+for\s+(?:this\s+|the\s+)?review\s*$/i.test(prefix)) return -1;
  return noCommaThen.index + (noCommaThen[0].match(/^\s/) ? 1 : 0);
}

function imageAiTextNegatesExpectedVisualAssets(text: string) {
  return /\bno\s+screenshots?(?:\s*\/\s*ui\s+assets|\s+(?:or|and)\s+ui\s+assets)?\s+expected\b/i.test(text)
    && /\b(?:(?:do\s+not|don't|never|avoid)\s+use|without(?:\s+using)?)\s+(?:any\s+)?(?:visual|vision|screenshot|image)(?:\s+or\s+(?:visual|vision|screenshot|image))?\s+tools?\b/i.test(text);
}

function imageAiMatchIsMetaReviewFix(text: string, matchIndex: number, matchedText: string) {
  if (!imageAiTextNegatesExpectedVisualAssets(text)) return false;
  if (!/\bscreenshots?\b/i.test(matchedText)) return false;
  if (!new RegExp(String.raw`\b${IMAGE_AI_CONTEXT_NOUN}\b`, "i").test(matchedText)) return false;
  const afterMatch = text.slice(matchIndex + matchedText.length);
  const sentenceBoundary = afterMatch.search(/[.!?;\n]/);
  const sentenceRemainder = sentenceBoundary === -1 ? afterMatch : afterMatch.slice(0, sentenceBoundary);
  if (/\breview(?:ing)?\b/i.test(matchedText) && /^\s+fix(?:es)?\b/i.test(sentenceRemainder)) return true;
  const contextWindow = text.slice(Math.max(0, matchIndex - 120), Math.min(text.length, matchIndex + matchedText.length + 120));
  if (/\breview(?:ing)?\b/i.test(contextWindow) && /\bfalse[-\s]?positive\b/i.test(contextWindow) && /\b(?:evidence|analysis|text)\b/i.test(contextWindow)) return true;
  return /\breview(?:ing)?\b/i.test(contextWindow)
    && /\bfix(?:es)?\b/i.test(contextWindow)
    && /\b(?:meta|false[-\s]?positive|negation|trailing[-\s]?instead)\b/i.test(contextWindow);
}

function imageAiNegationClause(text: string, matchIndex: number, matchEnd: number) {
  const before = text.slice(0, matchIndex);
  const after = text.slice(matchEnd);
  const punctuationStart = Math.max(before.lastIndexOf(".") + 1, before.lastIndexOf("!") + 1, before.lastIndexOf("?") + 1, before.lastIndexOf(";") + 1, before.lastIndexOf("\n") + 1, matchIndex - 120);
  const contrastiveStart = lastRegexMatchEnd(before, new RegExp(IMAGE_AI_CONTRASTIVE_BOUNDARY, "gi"));
  const trailingInsteadStart = trailingInsteadContrastiveStart(before, after);
  const start = Math.max(punctuationStart, contrastiveStart, trailingInsteadStart);
  const afterBoundary = after.search(/[.!?;\n]/);
  const contrastiveEnd = after.search(new RegExp(IMAGE_AI_CONTRASTIVE_BOUNDARY, "i"));
  const clauseBoundary = afterBoundary === -1 ? contrastiveEnd : contrastiveEnd === -1 ? afterBoundary : Math.min(afterBoundary, contrastiveEnd);
  const end = Math.min(clauseBoundary === -1 ? text.length : matchEnd + clauseBoundary, matchEnd + 80);
  return text.slice(start, end);
}

function imageAiMatchIsNegated(text: string, matchIndex: number, matchedText: string) {
  if (imageAiMatchIsMetaReviewFix(text, matchIndex, matchedText)) return true;
  const families = imageAiNegationFamily(matchedText);
  if (!families.length) return false;
  const clause = imageAiNegationClause(text, matchIndex, matchIndex + matchedText.length);
  const negatedTarget = String.raw`(?:${families.join("|")})`;
  const leadingListItems = String.raw`(?:${IMAGE_AI_NEGATED_ITEM_PREFIX}(?:${IMAGE_AI_NEGATED_LIST_ITEM})${IMAGE_AI_NEGATED_SEPARATOR}){0,4}`;
  const targetListItem = String.raw`${IMAGE_AI_NEGATED_ITEM_PREFIX}${negatedTarget}`;
  const optionalAction = String.raw`(?:(?:${IMAGE_AI_NEGATED_ACTION})\s+)?`;
  const optionalNoAction = String.raw`(?:(?:${IMAGE_AI_NEGATED_ACTION})\s+|any\s+){0,2}`;
  const negationPattern = new RegExp(
    String.raw`\b(?:no|without)\s+${optionalNoAction}${leadingListItems}${targetListItem}\b|\b(?:do\s+not|don't|never|avoid)\s+${optionalAction}(?:any\s+)?${leadingListItems}${targetListItem}\b`,
    "i",
  );
  return negationPattern.test(clause);
}

const COMFYUI_CIVITAI_NEGATED_ACTION = String.raw`(?:${IMAGE_AI_NEGATED_ACTION}|load|loading)`;
const COMFYUI_CIVITAI_NEGATED_LIST_ITEM = String.raw`(?:ComfyUI(?:\s+(?:tools?|workflows?|workflow\s+JSON|node\s+graphs?))?|Civitai(?:\s+(?:tools?|assets?|models?|references?))?|LoRAs?(?:\s+(?:tools?|models?|adapters?|assets?))?|Stable\s+Diffusion(?:\s+(?:model[-\s]?checkpoints?|checkpoint[-\s]?models?|checkpoints?|models?))?|(?:(?:image[-\s]?generation|image\s+workflow|diffusion\s+model)\s+)?model[-\s]?checkpoints?|checkpoint[-\s]?models?|checkpoints?)`;

function comfyuiCivitaiNegationFamily(matchedText: string) {
  const text = matchedText.toLowerCase();
  const families: string[] = [];
  if (/comfyui/.test(text)) families.push(String.raw`ComfyUI(?:\s+(?:tools?|workflows?|workflow\s+JSON|node\s+graphs?))?`);
  if (/civitai/.test(text)) families.push(String.raw`Civitai(?:\s+(?:tools?|assets?|models?|references?))?`);
  if (/\blora\b/.test(text)) families.push(String.raw`LoRAs?(?:\s+(?:tools?|models?|adapters?|assets?))?`);
  if (/stable\s+diffusion|checkpoint/.test(text)) {
    families.push(
      String.raw`Stable\s+Diffusion(?:\s+(?:model[-\s]?checkpoints?|checkpoint[-\s]?models?|checkpoints?|models?))?`,
      String.raw`(?:(?:image[-\s]?generation|image\s+workflow|diffusion\s+model|Stable\s+Diffusion)\s+)?(?:model[-\s]?checkpoints?|checkpoint[-\s]?models?|checkpoints?)(?:\s+(?:tools?|models?|assets?|files?|paths?))?`,
    );
  }
  return unique(families);
}

function comfyuiCivitaiMatchIsNegated(text: string, matchIndex: number, matchedText: string) {
  const families = comfyuiCivitaiNegationFamily(matchedText);
  if (!families.length) return false;
  const clause = imageAiNegationClause(text, matchIndex, matchIndex + matchedText.length);
  const negatedTarget = String.raw`(?:${families.join("|")})`;
  const leadingListItems = String.raw`(?:(?:(?:${COMFYUI_CIVITAI_NEGATED_ACTION})\s+)?${IMAGE_AI_NEGATED_ARTICLE}(?:${COMFYUI_CIVITAI_NEGATED_LIST_ITEM})${IMAGE_AI_NEGATED_SEPARATOR}){0,4}`;
  const targetListItem = String.raw`(?:(?:${COMFYUI_CIVITAI_NEGATED_ACTION})\s+)?${IMAGE_AI_NEGATED_ARTICLE}${negatedTarget}`;
  const optionalAction = String.raw`(?:(?:${COMFYUI_CIVITAI_NEGATED_ACTION})\s+)?`;
  const optionalNoAction = String.raw`(?:(?:${COMFYUI_CIVITAI_NEGATED_ACTION})\s+|any\s+){0,2}`;
  const negationPattern = new RegExp(
    String.raw`\b(?:no|without)\s+${optionalNoAction}${leadingListItems}${targetListItem}\b|\b(?:do\s+not|don't|never|avoid)\s+${optionalAction}(?:any\s+)?${leadingListItems}${targetListItem}\b`,
    "i",
  );
  return negationPattern.test(clause);
}

function matcherMatchesWorkflow(descriptor: ExtensionWorkflowDescriptor, matcher: TriggerMatcher, text: string) {
  if (descriptor.id !== "image-ai" && descriptor.id !== "comfyui-civitai") return matcher.pattern.test(text);
  const pattern = regexpWithGlobal(matcher.pattern);
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const negated = descriptor.id === "image-ai"
      ? imageAiMatchIsNegated(text, match.index, match[0])
      : comfyuiCivitaiMatchIsNegated(text, match.index, match[0]);
    if (!negated) return true;
    if (match[0].length === 0) pattern.lastIndex += 1;
  }
  return false;
}

function comfyuiCivitaiTermsAreStrong(terms: readonly string[], text: string) {
  if (terms.some((term) => COMFYUI_CIVITAI_ALWAYS_STRONG_TERMS.has(term))) return true;
  if (!terms.includes("model checkpoint")) return false;
  return /\b(?:image[-\s]?generation|image\s+workflow|generated\s+images?|Stable\s+Diffusion|diffusion\s+model|txt2img|img2img)\b/i.test(text);
}

function matchedTermsFor(descriptor: ExtensionWorkflowDescriptor, text: string, kind: string | undefined) {
  const terms: string[] = [];
  if (descriptor.activation !== "strong-only" && kind && descriptor.taskKinds?.includes(kind as TaskKind)) terms.push(kind);
  for (const matcher of TRIGGER_MATCHERS[descriptor.id]) {
    if (matcherMatchesWorkflow(descriptor, matcher, text)) terms.push(matcher.term);
  }
  if (descriptor.id === "comfyui-civitai" && !comfyuiCivitaiTermsAreStrong(terms, text)) return [];
  return unique(terms).slice(0, 5);
}

export function matchExtensionWorkflows(input: string | ExtensionWorkflowMatchContext, options: { readonly maxWorkflows?: number } = {}): ExtensionWorkflowMatch[] {
  const text = contextText(input);
  if (!text) return [];
  const kind = contextKind(input);
  const matches = EXTENSION_WORKFLOW_DESCRIPTORS
    .map((descriptor) => ({ descriptor, terms: matchedTermsFor(descriptor, text, kind) }))
    .filter(({ terms }) => terms.length > 0)
    .sort((a, b) => a.descriptor.priority - b.descriptor.priority || a.descriptor.id.localeCompare(b.descriptor.id))
    .map(({ descriptor, terms }) => ({
      descriptor,
      matchedTerms: terms,
      reason: `Matched ${descriptor.id} via ${terms.join(", ")}.`,
    }));
  const max = options.maxWorkflows;
  return typeof max === "number" && max >= 0 ? matches.slice(0, max) : matches;
}

function explicitDescriptors(options: Pick<ExtensionGuideRenderOptions, "workflow" | "workflows">) {
  const ids = unique([...(options.workflow ? [options.workflow] : []), ...(options.workflows ?? [])]);
  return ids.map(descriptorForId).filter((descriptor): descriptor is ExtensionWorkflowDescriptor => Boolean(descriptor));
}

function descriptorsForGuide(options: ExtensionGuideRenderOptions) {
  const explicit = explicitDescriptors(options);
  if (explicit.length) return explicit;
  if (options.prompt) return matchExtensionWorkflows(options.prompt).map((match) => match.descriptor);
  return EXTENSION_WORKFLOW_DESCRIPTORS;
}

function renderActiveRunGuidance(summary: ExtensionActiveRunSummary | undefined) {
  if (!summary) return "";
  const lines = [
    "## Active task graph summary",
    "",
    "Caller-provided summary/counts only; no full run JSON, raw prompt, raw events, or tool arguments are included.",
    `- Run id: ${sanitizeExtensionGuideText(summary.runId, { maxInputChars: 200, maxLineLength: 160, maxLines: 1 }) || "unknown"}`,
  ];
  if (summary.status) lines.push(`- Status: ${sanitizeExtensionGuideText(String(summary.status), { maxInputChars: 120, maxLineLength: 120, maxLines: 1 })}`);
  if (summary.rootWorkCounts) lines.push(`- ${renderRootWorkCounts(summary.rootWorkCounts)}`);
  if (typeof summary.readyTaskCount === "number" && Number.isFinite(summary.readyTaskCount)) lines.push(`- Ready task count: ${summary.readyTaskCount}`);
  if (summary.activeRootWorkLabel) lines.push(`- Active root work: ${sanitizeExtensionGuideText(summary.activeRootWorkLabel, { maxInputChars: 240, maxLineLength: 180, maxLines: 1 })}`);
  lines.push("- Do not auto-call task_graph_continue_autoimprove; do not drain rootWorkQueue; do not mutate run state from guide rendering.");
  return lines.join("\n");
}

function renderWorkflow(descriptor: ExtensionWorkflowDescriptor, compact = false) {
  const guidance = compact ? descriptor.graphGuidance.slice(0, 2) : descriptor.graphGuidance;
  const evidence = compact ? descriptor.evidenceGuidance.slice(0, 2) : descriptor.evidenceGuidance;
  const safety = compact ? descriptor.safetyNotes.slice(0, 1) : descriptor.safetyNotes;
  return [
    `### Extension workflow: ${descriptor.id} — ${descriptor.label}`,
    descriptor.summary,
    `- Activation: ${descriptor.activation === "strong-only" ? "strong triggers only" : "conservative explicit triggers"}.`,
    `- Tools/helpers: ${descriptor.tools.join("; ")}.`,
    ...guidance.map((item) => `- Graph path: ${item}`),
    ...evidence.map((item) => `- Evidence: ${item}`),
    ...safety.map((item) => `- Safety: ${item}`),
  ].join("\n");
}

function overviewLine(descriptor: ExtensionWorkflowDescriptor) {
  return `- ${descriptor.id}: ${descriptor.summary}`;
}

export function renderExtensionWorkflowGuide(input: ExtensionGuideRenderOptions | string = {}) {
  const options: ExtensionGuideRenderOptions = typeof input === "string" ? { prompt: input } : input;
  const explicit = explicitDescriptors(options);
  const promptMatched = options.prompt ? matchExtensionWorkflows(options.prompt) : [];
  const descriptors = (explicit.length ? explicit : promptMatched.map((match) => match.descriptor));
  const noPromptOrExplicit = !explicit.length && !options.prompt;
  const defaultMax = noPromptOrExplicit ? EXTENSION_WORKFLOW_DESCRIPTORS.length : explicit.length ? explicit.length : 2;
  const selected = (noPromptOrExplicit ? EXTENSION_WORKFLOW_DESCRIPTORS : descriptors).slice(0, Math.max(0, options.maxWorkflows ?? defaultMax));
  const lines = [
    "# Task graph extension workflow guide (read-only)",
    "",
    "This guide only renders deterministic advice. It does not execute extension tools, save runs, append events, continue loops, or mutate rootWorkQueue.",
  ];
  const active = renderActiveRunGuidance(options.activeRun);
  if (active) lines.push("", active);
  if (options.includeOverview ?? noPromptOrExplicit) {
    lines.push("", "## Workflow index", ...EXTENSION_WORKFLOW_DESCRIPTORS.map(overviewLine));
  }
  if (selected.length) {
    lines.push("", "## Matched workflow guidance", ...selected.map((descriptor) => renderWorkflow(descriptor, false)));
  } else if (!noPromptOrExplicit) {
    lines.push("", "## Matched workflow guidance", "No extension workflow triggers matched. Keep task graph evidence concise: record validation, changed files, and artifacts with task_graph_update when applicable.");
  }
  return capText(lines.join("\n"), renderedLimit(options.maxRenderedChars, DEFAULT_MAX_RENDERED_CHARS));
}

export function renderExtensionBeforeAgentAdvisory(input: ExtensionGuideRenderOptions | string = {}) {
  const options: ExtensionGuideRenderOptions = typeof input === "string" ? { prompt: input } : input;
  const matches = options.workflow || options.workflows?.length || options.prompt ? descriptorsForGuide({ ...options, maxWorkflows: undefined }) : [];
  if (!matches.length && !options.activeRun) return "";
  if (!matches.length && options.activeRun) {
    return capText([
      "# Task graph extension workflow guide (read-only)",
      "",
      "This guide only renders deterministic advice. It does not execute extension tools, save runs, append events, continue loops, or mutate rootWorkQueue.",
      "",
      renderActiveRunGuidance(options.activeRun),
    ].join("\n"), renderedLimit(options.maxRenderedChars, 2_800));
  }
  const maxWorkflows = options.maxWorkflows ?? 2;
  const text = renderExtensionWorkflowGuide({ ...options, workflows: matches.map((descriptor) => descriptor.id), maxWorkflows, includeOverview: false, maxRenderedChars: options.maxRenderedChars ?? 2_800 });
  return capText(text, renderedLimit(options.maxRenderedChars, 2_800));
}

export function renderExtensionWorkflowPromptBlock(input: string | ExtensionWorkflowMatchContext, options: ExtensionPromptBlockOptions = {}) {
  const matches = matchExtensionWorkflows(input, { maxWorkflows: options.maxWorkflows ?? 2 });
  if (!matches.length) return "";
  const lines = [
    "\n## Extension workflow hints",
    "",
    "Read-only hints for routing Pi extension work through task graph evidence. Keep the graph canonical: task_graph_create/task_graph_next for task selection and task_graph_update for summaries, changedFiles, validation, and artifacts.",
    "Do not auto-call task_graph_continue_autoimprove, drain rootWorkQueue, or mutate unrelated runs from these hints.",
    "",
    ...matches.map((match) => renderWorkflow(match.descriptor, true)),
  ];
  return capText(lines.join("\n"), renderedLimit(options.maxRenderedChars, 2_400));
}
