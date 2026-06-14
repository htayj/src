import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import taskGraphExtension from "./index";

type ToolRegistration = {
  name: string;
  execute: (toolCallId: string, params: Record<string, unknown>, signal: AbortSignal | undefined, onUpdate: unknown, ctx: { cwd: string; ui: Record<string, unknown> }) => unknown | Promise<unknown>;
};

const tools = new Map<string, ToolRegistration>();
const pi = {
  on() {},
  registerCommand() {},
  registerShortcut() {},
  registerTool(tool: ToolRegistration) {
    tools.set(tool.name, tool);
  },
};

taskGraphExtension(pi as never);

const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "task-graph-create-"));
const ctx = {
  cwd,
  ui: {
    setStatus() {},
    setWidget() {},
    notify() {},
  },
};

async function main() {
  const createTool = tools.get("task_graph_create");
  assert(createTool, "task_graph_create tool is registered");

  const result = await createTool.execute(
    "validation-create-call",
    { mode: "do", input: "Smoke create a task graph run." },
    undefined,
    undefined,
    ctx
  );
  const resultJson = JSON.stringify(result);

  assert.match(resultJson, /Task graph/, "create result renders status");
  assert.match(
    resultJson,
    /\.pi\/dev-suite\/task-graph\/runs\//,
    "create result includes a display-safe run file path"
  );
  assert(!resultJson.includes("ReferenceError"), "create result should not expose a ReferenceError");

  console.log("task graph create validation passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
