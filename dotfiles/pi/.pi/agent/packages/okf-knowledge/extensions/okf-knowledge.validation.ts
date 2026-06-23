import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import okfKnowledgeExtension from "./okf-knowledge";

type ToolRegistration = {
  name: string;
  execute: (
    toolCallId: string,
    params: Record<string, unknown>,
    signal: AbortSignal | undefined,
    onUpdate: unknown,
    ctx: { cwd: string; ui: Record<string, unknown> }
  ) => unknown | Promise<unknown>;
};

type CommandRegistration = {
  description?: string;
  handler: (args: string, ctx: { cwd: string; ui: Record<string, unknown> }) => unknown | Promise<unknown>;
};

type EventHandler = (event: unknown, ctx: { cwd: string; ui: Record<string, unknown> }) => unknown | Promise<unknown>;

const tools = new Map<string, ToolRegistration>();
const commands = new Map<string, CommandRegistration>();
const events = new Map<string, EventHandler[]>();

const pi = {
  on(event: string, handler: EventHandler) {
    const handlers = events.get(event) ?? [];
    handlers.push(handler);
    events.set(event, handlers);
  },
  registerCommand(name: string, command: CommandRegistration) {
    commands.set(name, command);
  },
  registerShortcut() {},
  registerTool(tool: ToolRegistration) {
    tools.set(tool.name, tool);
  },
};

function textOf(result: unknown): string {
  const content = (result as any)?.content;
  if (!Array.isArray(content)) return JSON.stringify(result);
  return content.map((item) => item?.text ?? "").join("\n");
}

async function callTool(name: string, params: Record<string, unknown>, ctx: { cwd: string; ui: Record<string, unknown> }) {
  const tool = tools.get(name);
  assert(tool, `${name} tool is registered`);
  return await tool.execute(`validation-${name}`, params, undefined, undefined, ctx);
}

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "okf-knowledge-"));
  const home = path.join(tmp, "home");
  const globalRoot = path.join(tmp, "global-okf");
  const project = path.join(tmp, "project");
  const nested = path.join(project, "src", "nested");
  fs.mkdirSync(path.join(project, ".git"), { recursive: true });
  fs.mkdirSync(nested, { recursive: true });
  fs.mkdirSync(home, { recursive: true });

  const oldHome = process.env.HOME;
  const oldGlobal = process.env.PI_OKF_GLOBAL_ROOT;
  process.env.HOME = home;
  process.env.PI_OKF_GLOBAL_ROOT = globalRoot;

  try {
    okfKnowledgeExtension(pi as never);

    for (const name of ["okf_roots", "okf_search", "okf_read", "okf_write", "okf_lint"]) {
      assert(tools.has(name), `${name} tool registered`);
    }
    for (const name of ["okf-roots", "okf-search", "okf-read", "okf-write", "okf-lint"]) {
      assert(commands.has(name), `${name} command registered`);
    }
    assert(events.has("session_start"), "session_start status hook registered");

    const notifications: string[] = [];
    const statuses: Record<string, string | undefined> = {};
    const ctx = {
      cwd: nested,
      ui: {
        notify(message: string) {
          notifications.push(message);
        },
        setStatus(key: string, value: string | undefined) {
          statuses[key] = value;
        },
        async editor(_title: string, prefill?: string) {
          return prefill;
        },
      },
    };

    for (const handler of events.get("session_start") ?? []) await handler({ type: "session_start", reason: "startup" }, ctx);
    assert.match(statuses.okf ?? "", /okf:/, "session_start sets OKF status");

    const roots = await callTool("okf_roots", {}, ctx);
    assert.match(textOf(roots), /global/i, "roots output includes global root");
    assert.equal((roots as any).details.roots.global.path, globalRoot, "global root honors PI_OKF_GLOBAL_ROOT");
    assert.equal((roots as any).details.roots.project.projectRoot, project, "project root is nearest .git ancestor");
    assert.equal(fs.existsSync(globalRoot), false, "okf_roots does not create missing global root");

    await callTool("okf_write", {
      scope: "global",
      path: "/concepts/pi-okf.md",
      mode: "create",
      type: "concept",
      title: "Pi OKF",
      tags: ["pi", "okf"],
      body: "A reusable knowledge bundle note."
    }, ctx);
    assert(fs.existsSync(path.join(globalRoot, "concepts", "pi-okf.md")), "global write creates parent directories and file");

    const read = await callTool("okf_read", { scope: "global", path: "concepts/pi-okf.md" }, ctx);
    assert.match(textOf(read), /A reusable knowledge bundle note/, "read returns written note content");
    assert.equal((read as any).details.metadata.type, "concept", "read returns parsed metadata");

    const search = await callTool("okf_search", { scope: "both", query: "reusable", type: "concept", tags: ["okf"] }, ctx);
    assert.equal((search as any).details.results.length, 1, "search finds global note by query/type/tag");
    assert.equal((search as any).details.results[0].path, "/concepts/pi-okf.md", "search returns bundle-relative path");

    await callTool("okf_write", {
      scope: "project",
      path: "notes/project-note.md",
      mode: "create",
      type: "note",
      title: "Project note",
      tags: ["project"],
      body: "Project-local memory."
    }, ctx);
    assert(fs.existsSync(path.join(project, ".pi", "knowledge", "notes", "project-note.md")), "project write uses discovered project root");

    await assert.rejects(
      () => callTool("okf_write", { scope: "project", path: "../escape.md", type: "note", body: "bad" }, ctx),
      /escapes|Unsafe|traversal/i,
      "write rejects path traversal"
    );
    await assert.rejects(
      () => callTool("okf_read", { scope: "global", path: "/../../escape.md" }, ctx),
      /escapes|Unsafe|traversal/i,
      "read rejects absolute-style traversal"
    );
    await assert.rejects(
      () => callTool("okf_write", { scope: "global", path: "secrets.md", type: "note", body: "api_key = demo" }, ctx),
      /secret-like/i,
      "write rejects obvious secret-like content"
    );
    await assert.rejects(
      () => callTool("okf_write", { scope: "global", path: "extra-invalid-key.md", type: "note", extra: { "bad key": "value" }, body: "bad" }, ctx),
      /metadata key|frontmatter key|unsupported/i,
      "write rejects extra metadata keys the parser cannot read back"
    );
    await assert.rejects(
      () => callTool("okf_write", { scope: "global", path: "extra-invalid-value.md", type: "note", extra: { "valid-key": { nested: true } }, body: "bad" }, ctx),
      /metadata value|scalar/i,
      "write rejects extra metadata values the parser cannot read back"
    );

    const outside = path.join(tmp, "outside");
    fs.mkdirSync(outside, { recursive: true });
    const outsideDoc = path.join(outside, "outside.md");
    fs.writeFileSync(outsideDoc, "---\ntype: note\n---\n\nOutside\n", "utf8");
    fs.symlinkSync(outsideDoc, path.join(globalRoot, "concepts", "linked.md"));
    await assert.rejects(
      () => callTool("okf_read", { scope: "global", path: "concepts/linked.md" }, ctx),
      /symlink/i,
      "read rejects symlinked OKF targets"
    );
    fs.symlinkSync(outside, path.join(globalRoot, "escape-dir"), "dir");
    await assert.rejects(
      () => callTool("okf_write", { scope: "global", path: "escape-dir/written.md", type: "note", body: "bad" }, ctx),
      /symlink/i,
      "create rejects symlinked OKF parent components"
    );
    fs.symlinkSync(outsideDoc, path.join(globalRoot, "overwrite-link.md"));
    await assert.rejects(
      () => callTool("okf_write", { scope: "global", path: "overwrite-link.md", mode: "overwrite", type: "note", body: "bad" }, ctx),
      /symlink/i,
      "overwrite rejects symlinked OKF targets"
    );
    fs.symlinkSync(outsideDoc, path.join(globalRoot, "append-link.md"));
    await assert.rejects(
      () => callTool("okf_write", { scope: "global", path: "append-link.md", mode: "append", type: "note", body: "bad" }, ctx),
      /symlink/i,
      "append rejects symlinked OKF targets"
    );
    for (const symlink of ["concepts/linked.md", "escape-dir", "overwrite-link.md", "append-link.md"]) {
      fs.rmSync(path.join(globalRoot, symlink), { force: true });
    }

    fs.writeFileSync(path.join(globalRoot, "append-missing-type.md"), "---\ntitle: Missing type\n---\n\nExisting\n", "utf8");
    await assert.rejects(
      () => callTool("okf_write", { scope: "global", path: "append-missing-type.md", mode: "append", type: "note", body: "New body" }, ctx),
      /type/i,
      "append refuses to mutate an existing OKF document without a non-empty type"
    );
    fs.writeFileSync(path.join(globalRoot, "append-invalid-frontmatter.md"), "---\ntype: note\n\nMissing closing delimiter\n", "utf8");
    await assert.rejects(
      () => callTool("okf_write", { scope: "global", path: "append-invalid-frontmatter.md", mode: "append", type: "note", body: "New body" }, ctx),
      /frontmatter|invalid/i,
      "append refuses to mutate an existing OKF document with invalid frontmatter"
    );

    const projectKnowledge = path.join(project, ".pi", "knowledge");
    fs.mkdirSync(projectKnowledge, { recursive: true });
    fs.writeFileSync(path.join(projectKnowledge, "bad.md"), "# Missing frontmatter\n", "utf8");
    fs.writeFileSync(path.join(projectKnowledge, "unknown.md"), "---\ntype: curious-custom-type\nunknown-field: tolerated\n---\n\n[Missing](missing.md)\n", "utf8");
    fs.writeFileSync(path.join(projectKnowledge, "secret.md"), "---\ntype: note\n---\n\npassword: demo\n", "utf8");
    fs.symlinkSync(outsideDoc, path.join(projectKnowledge, "linked.md"));

    const lint = await callTool("okf_lint", { scope: "project" }, ctx);
    const errors = (lint as any).details.errors.map((item: any) => `${item.path}:${item.message}`).join("\n");
    const warnings = (lint as any).details.warnings.map((item: any) => `${item.path}:${item.message}`).join("\n");
    assert.match(errors, /bad\.md.*type|bad\.md.*frontmatter/i, "lint reports missing required type/frontmatter");
    assert.match(errors, /secret\.md.*secret/i, "lint reports secret-like content without echoing the secret value");
    assert.match(errors, /linked\.md.*symlink/i, "lint reports symlinked OKF paths");
    assert.doesNotMatch(errors, /unknown\.md/i, "lint tolerates unknown fields and unknown types");
    assert.match(warnings, /missing\.md/i, "lint warns on broken bundle-relative Markdown link");
    fs.rmSync(path.join(projectKnowledge, "linked.md"), { force: true });

    await commands.get("okf-roots")?.handler("", ctx);
    await commands.get("okf-search")?.handler("both reusable", ctx);
    await commands.get("okf-lint")?.handler("both", ctx);
    assert(notifications.length >= 3, "command wrappers notify users");

    console.log("okf-knowledge validation passed");
  } finally {
    if (oldHome === undefined) delete process.env.HOME; else process.env.HOME = oldHome;
    if (oldGlobal === undefined) delete process.env.PI_OKF_GLOBAL_ROOT; else process.env.PI_OKF_GLOBAL_ROOT = oldGlobal;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
