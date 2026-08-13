import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createRun } from "./formulas";
import taskGraphExtension, { sanitizeContinueAutoImproveResponseDetails } from "./index";
import { REDACTED_SECRETISH_EVIDENCE_PATH } from "./root-work-lineage";
import { readyTasks } from "./scheduler";
import { sanitizeProjectTaskGraphDetails, sanitizeProjectTaskGraphSettingsInfoForDetails } from "./settings";
import { loadRunNoCreate, taskGraphRoot } from "./store";

type BeforeAgentStartHandler = (event: { prompt: string; systemPrompt?: string }, ctx: { cwd: string; ui: Record<string, unknown> }) => unknown | Promise<unknown>;
type ToolRegistration = {
  name: string;
  execute: (toolCallId: string, params: Record<string, unknown>, signal: AbortSignal | undefined, onUpdate: unknown, ctx: { cwd: string; ui: Record<string, unknown> }) => unknown | Promise<unknown>;
};

const eventHandlers = new Map<string, BeforeAgentStartHandler>();
const tools = new Map<string, ToolRegistration>();

const AGENT_INSTRUCTION_SENTINEL = "AGENT-INSTRUCTION-SENTINEL";

function assertJsonDoesNotInclude(value: unknown, forbidden: string, message: string) {
  assert(!JSON.stringify(value).includes(forbidden), message);
}

const pi = {
  on(event: string, handler: BeforeAgentStartHandler) {
    eventHandlers.set(event, handler);
  },
  registerCommand() {},
  registerShortcut() {},
  registerTool(tool: ToolRegistration) {
    tools.set(tool.name, tool);
  },
};

taskGraphExtension(pi as never);

const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "task-graph-readonly-"));
const piDir = path.join(cwd, ".pi");
const graphDir = taskGraphRoot(cwd);
const ctx = {
  cwd,
  ui: {
    setStatus() {},
    setWidget() {},
    notify() {},
  },
};

function assertNoTaskGraphStore(message: string) {
  assert(!fs.existsSync(piDir), `${message}: .pi directory was created`);
  assert(!fs.existsSync(graphDir), `${message}: task-graph directory was created`);
}

async function main() {
  assertNoTaskGraphStore("fresh temp cwd starts without a task graph store");

  const beforeAgentStart = eventHandlers.get("before_agent_start");
  assert(beforeAgentStart, "before_agent_start handler is registered");
  await beforeAgentStart({ prompt: "Implement the changed-files evidence report.", systemPrompt: "base" }, ctx);
  assertNoTaskGraphStore("before_agent_start advisory path is read-only with no current run");

  const settingsDetails = sanitizeProjectTaskGraphSettingsInfoForDetails({
    loaded: true,
    path: "/tmp/task-graph-settings.json",
    graphNames: ["smoke"],
    settings: {
      agentInstructions: {
        all: [AGENT_INSTRUCTION_SENTINEL],
      },
    },
  });
  assertJsonDoesNotInclude(settingsDetails, AGENT_INSTRUCTION_SENTINEL, "settings details sanitizer must not expose agentInstructions contents");

  const statusLikeDetails = sanitizeProjectTaskGraphDetails({
    run: {
      config: {
        projectSettings: {
          agentInstructions: {
            all: [AGENT_INSTRUCTION_SENTINEL],
          },
        },
      },
    },
  });
  assertJsonDoesNotInclude(statusLikeDetails, AGENT_INSTRUCTION_SENTINEL, "status/tool details sanitizer must not expose agentInstructions contents");

  const statusSecretDetails = sanitizeProjectTaskGraphDetails({
    run: {
      tasks: {
        t: {
          metadata: {
            failureContext: {
              message: "Authorization: Bearer sk-test-123 Cookie: session=abc",
            },
          },
        },
      },
    },
  });
  const statusSecretJson = JSON.stringify(statusSecretDetails);
  assert(!statusSecretJson.includes("Bearer sk-test-123"), "status/tool details sanitizer must not expose bearer values in metadata strings");
  assert(!statusSecretJson.includes("sk-test-123"), "status/tool details sanitizer must not expose token suffixes in metadata strings");
  assert(!statusSecretJson.includes("session=abc"), "status/tool details sanitizer must not expose cookie values in metadata strings");
  assert(statusSecretJson.includes("[REDACTED]"), "status/tool details sanitizer should redact header-shaped metadata strings");

  const responseSessionPathKey = ["/home", "fixture", ".pi", "agent", "sessions", "response-key", "trace.json"].join("/");
  const responseSessionPathAssociatedValue = "RESPONSE_DETAILS_SESSION_PATH_KEY_ASSOCIATED_VALUE_SENTINEL";
  const responsePublicSecretValue = "metadata mentions " + "api" + " key evidence";
  const sanitizedResponseDetails = sanitizeContinueAutoImproveResponseDetails({
    source: "response-detail-redaction-validation",
    [responseSessionPathKey]: responseSessionPathAssociatedValue,
    publicContext: "Decision: COMPLETE at .orchestration/public-terminal-reconciliation-report.md",
    publicNote: responsePublicSecretValue,
  });
  const sanitizedResponseDetailsJson = JSON.stringify(sanitizedResponseDetails);
  assert.equal(Object.hasOwn(sanitizedResponseDetails, "[redacted-session-path]"), false, "session-path response detail keys are skipped rather than relabeled");
  assert.equal(sanitizedResponseDetailsJson.includes(responseSessionPathAssociatedValue), false, "response details omit values associated with session-path-shaped keys");
  assert.equal(sanitizedResponseDetails.publicContext, "Decision: COMPLETE at .orchestration/public-terminal-reconciliation-report.md", "public response detail keys preserve public lineage context");
  assert.equal(sanitizedResponseDetails.publicNote, REDACTED_SECRETISH_EVIDENCE_PATH, "public response detail keys keep the key while redacting secret-shaped values");

  const compactResponseDetailsKey = "api" + "key" + "responsedetail";
  const compactResponseDetailsValue = "access" + "token" + "responsedetail";
  const compactResponseDetailsAssociatedValue = "RESPONSE_DETAILS_COMPACT_KEY_ASSOCIATED_VALUE_SENTINEL";
  const compactResponsePublicPath = ".orchestration/public-terminal-reconciliation-report.md";
  const compactResponsePublicRunId = "autoimprove-mpwly22k-t45qna";
  const sanitizedCompactResponseDetails = sanitizeContinueAutoImproveResponseDetails({
    source: "compact-response-detail-redaction-validation",
    [compactResponseDetailsKey]: compactResponseDetailsAssociatedValue,
    publicContext: `Decision: COMPLETE at ${compactResponsePublicPath}`,
    publicGeneratedRunId: compactResponsePublicRunId,
    publicValue: compactResponseDetailsValue,
  });
  const sanitizedCompactResponseDetailsJson = JSON.stringify(sanitizedCompactResponseDetails);
  assert.equal(Object.hasOwn(sanitizedCompactResponseDetails, compactResponseDetailsKey), false, "compact secret-shaped response detail keys are skipped rather than relabeled");
  assert.equal(sanitizedCompactResponseDetailsJson.includes(compactResponseDetailsAssociatedValue), false, "response details omit values associated with compact secret-shaped keys");
  assert.equal(sanitizedCompactResponseDetailsJson.includes(compactResponseDetailsValue), false, "response details redact compact secret-shaped values under public keys");
  assert.equal(sanitizedCompactResponseDetailsJson.includes(compactResponseDetailsKey), false, "response details omit compact secret-shaped keys");
  assert.equal(sanitizedCompactResponseDetails.publicContext, `Decision: COMPLETE at ${compactResponsePublicPath}`, "compact response detail sanitizer preserves public lineage context");
  assert.equal(sanitizedCompactResponseDetails.publicGeneratedRunId, compactResponsePublicRunId, "compact response detail sanitizer preserves public generated run ids under public keys");
  assert.equal(sanitizedCompactResponseDetails.publicValue, REDACTED_SECRETISH_EVIDENCE_PATH, "compact response detail sanitizer redacts compact secret-shaped values under public keys");

  const promptBearingRun = createRun(
    cwd,
    "do",
    "Validate prompt-like details sanitization.",
    { maxParallel: 1 },
    { dirtyAtStart: [] },
    { agentInstructions: { all: [AGENT_INSTRUCTION_SENTINEL] } },
  );
  const rawReady = readyTasks(promptBearingRun);
  assert(JSON.stringify(rawReady).includes(AGENT_INSTRUCTION_SENTINEL), "ready task prompts retain agentInstructions before details sanitization");
  const sanitizedReadyDetails = sanitizeProjectTaskGraphDetails({ runId: promptBearingRun.runId, ready: rawReady });
  assertJsonDoesNotInclude(sanitizedReadyDetails, AGENT_INSTRUCTION_SENTINEL, "task_graph_next-style ready details must not expose prompt/agentInstructions contents");

  const settingsTool = tools.get("task_graph_settings");
  assert(settingsTool, "task_graph_settings tool is registered");
  fs.writeFileSync(path.join(cwd, "task-graph-settings.json"), `${JSON.stringify({ agentInstructions: { all: [AGENT_INSTRUCTION_SENTINEL] } })}\n`);
  const oldHome = process.env.HOME;
  const oldGlobalSettingsPath = process.env.PI_TASK_GRAPH_GLOBAL_SETTINGS;
  process.env.HOME = path.join(cwd, "home-without-global-settings");
  delete process.env.PI_TASK_GRAPH_GLOBAL_SETTINGS;
  try {
    const settingsToolResult = await settingsTool.execute("validation-settings-call", { path: "task-graph-settings.json" }, undefined, undefined, ctx);
    assertJsonDoesNotInclude(settingsToolResult, AGENT_INSTRUCTION_SENTINEL, "task_graph_settings tool details must not expose agentInstructions contents");
  } finally {
    if (oldHome === undefined) delete process.env.HOME;
    else process.env.HOME = oldHome;
    if (oldGlobalSettingsPath === undefined) delete process.env.PI_TASK_GRAPH_GLOBAL_SETTINGS;
    else process.env.PI_TASK_GRAPH_GLOBAL_SETTINGS = oldGlobalSettingsPath;
  }
  assertNoTaskGraphStore("task_graph_settings inspection remains read-only");

  const extensionGuide = tools.get("task_graph_extension_guide");
  assert(extensionGuide, "task_graph_extension_guide tool is registered");
  await extensionGuide.execute("validation-call", { prompt: "Review changed files and include validation evidence.", runId: "missing-run" }, undefined, undefined, ctx);
  assertNoTaskGraphStore("task_graph_extension_guide is read-only with no requested run");

  const escapedRunId = "escaped-run-outside-store";
  fs.writeFileSync(path.join(cwd, `${escapedRunId}.json`), `${JSON.stringify({ runId: escapedRunId, cwd, status: "running", tasks: {}, rootTaskIds: [], config: { maxParallel: 1 } })}\n`);
  const traversalRunId = `../../../../${escapedRunId}`;
  assert.equal(loadRunNoCreate(cwd, traversalRunId), undefined, "loadRunNoCreate rejects traversal run IDs outside the runs dir");
  const traversalGuide = await extensionGuide.execute("validation-traversal-call", { prompt: "Review changed files and include validation evidence.", runId: traversalRunId }, undefined, undefined, ctx);
  assert(!JSON.stringify(traversalGuide).includes(escapedRunId), "task_graph_extension_guide must not expose runs loaded through traversal run IDs");
  assertNoTaskGraphStore("task_graph_extension_guide traversal rejection remains read-only");

  console.log("task graph read-only validation passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
