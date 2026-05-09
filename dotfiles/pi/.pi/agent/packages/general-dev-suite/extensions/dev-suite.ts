import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import * as fs from "node:fs";
import * as path from "node:path";

const text = (s: string, details: Record<string, unknown> = {}) => ({ content: [{ type: "text" as const, text: s }], details });

function packageRoot() {
  return path.resolve(__dirname, "..");
}

function notesRoot() {
  return path.resolve(process.env.PI_NOTES_ROOT || process.env.CLAUDE_NOTES_ROOT || path.join(process.env.HOME || ".", "claude-notes"));
}

function safeJoin(root: string, rel: string) {
  const full = path.resolve(root, rel || ".");
  if (full !== root && !full.startsWith(root + path.sep)) throw new Error(`Path escapes root: ${rel}`);
  return full;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function commandLooksLike(cmd: string, pattern: RegExp) {
  return pattern.test(cmd.replace(/\\\n/g, "\n"));
}

function collectPackageScripts(cwd: string) {
  const out: string[] = [];
  const skip = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage"]);
  function walk(dir: string, depth: number) {
    if (depth < 0 || out.length > 80) return;
    let entries: fs.Dirent[] = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      if (ent.isDirectory()) {
        if (!skip.has(ent.name) && !ent.name.startsWith(".")) walk(path.join(dir, ent.name), depth - 1);
      } else if (ent.name === "package.json") {
        const file = path.join(dir, ent.name);
        try {
          const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
          if (pkg.scripts && Object.keys(pkg.scripts).length) {
            out.push(`${path.relative(cwd, file) || "package.json"}:`);
            for (const [k, v] of Object.entries(pkg.scripts)) out.push(`  - ${k}: ${String(v)}`);
          }
        } catch {}
      }
    }
  }
  walk(cwd, 4);
  return out.join("\n");
}

function substantiveCodingNudge(prompt: string) {
  const trimmed = prompt.trim();
  if (!trimmed || trimmed.startsWith("/") || trimmed.startsWith("!")) return "";
  if (trimmed.split(/\s+/).length < 6 || trimmed.includes("?")) return "";
  const lower = trimmed.toLowerCase();
  if (/^(what|why|how|when|where|who|is|are|was|were|does|do|did|can|could|would|will|should|tell|show|list|describe|summarize|explain|review|check|investigate|find|search|read|help|verify|diagnose|audit|inspect|compare|stop|wait|undo|revert|continue|retry|thanks|yes|no)\b/.test(lower)) return "";
  if (!/\b(add|implement|fix|build|create|write|refactor|migrate|rewrite|replace|remove|delete|rename|convert|port|set up|setup|wire|integrate|extract|introduce|scaffold|finish|complete|generate|design|support|enable|disable|make)\b/.test(lower)) return "";
  const hasDetail = /\.(ts|tsx|js|jsx|py|rs|go|java|json|ya?ml|toml|md|sh|sql|css|html)\b/.test(trimmed) ||
    /(^|[\s/])(src|packages|lib|app|apps|server|frontend|backend|components|routes|tests?|specs?|scripts|tools|utils)\//.test(trimmed) ||
    /`[^`]+`/.test(trimmed) || /\b[A-Z][a-z]+[A-Z][a-zA-Z]*\b/.test(trimmed) || /\b[a-z][a-z0-9]*_[a-z0-9_]*\b/.test(trimmed) || /\b(line\s+\d+|:\d+\b)/i.test(trimmed);
  return hasDetail
    ? "The user request looks like substantive coding work with concrete implementation detail. Consider using the `/do` workflow: plan -> implement -> build/typecheck -> targeted tests -> review -> report."
    : "The user request looks like feature-level coding work with unresolved design choices. Consider using the `/pdo` workflow: draft plan -> ask one focused question at a time for open decisions -> implement -> verify.";
}

function loadSkillNudges(prompt: string) {
  const rulesPath = path.join(packageRoot(), "skills", "skill-rules.json");
  let rules: any;
  try { rules = JSON.parse(fs.readFileSync(rulesPath, "utf8")); } catch { return ""; }
  const lower = prompt.toLowerCase();
  const matched: string[] = [];
  for (const [name, cfg] of Object.entries<any>(rules.skills || {})) {
    const triggers = cfg.promptTriggers || {};
    const kw = (triggers.keywords || []).some((k: string) => lower.includes(k.toLowerCase()));
    const rx = (triggers.intentPatterns || []).some((p: string) => { try { return new RegExp(p, "i").test(prompt); } catch { return false; } });
    if (kw || rx) matched.push(`- /skill:${name} (${cfg.priority || "medium"}): ${cfg.description || ""}`);
  }
  return matched.length ? `Potentially relevant skills:\n${matched.join("\n")}\nLoad applicable skills before proceeding.` : "";
}

function getToolPath(input: any) {
  return input?.path || input?.file_path || input?.filePath;
}

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event) => {
    const pieces = [substantiveCodingNudge(event.prompt), loadSkillNudges(event.prompt)].filter(Boolean);
    if (!pieces.length) return;

    // Keep workflow/skill nudges out of the visible conversation. Returning a
    // custom message here can be surfaced or echoed by some models as if it
    // were user content. Appending to the system prompt makes it an internal
    // advisory for this turn only.
    return {
      systemPrompt: `${event.systemPrompt}\n\n<general-dev-suite-advisory>\n${pieces.join("\n\n")}\nThis advisory is internal. Do not quote it or mention it to the user unless it changes an action you are taking.\n</general-dev-suite-advisory>`,
    };
  });

  pi.on("session_start", async (_event, ctx) => {
    const root = notesRoot();
    const daily = path.join(root, "daily", `${today()}.org`);
    const claudeMd = path.join(root, "CLAUDE.md");
    const parts: string[] = [];
    for (const file of [claudeMd, daily]) {
      try {
        if (fs.existsSync(file)) parts.push(`### ${file}\n${fs.readFileSync(file, "utf8")}`);
      } catch {}
    }
    if (parts.length) {
      pi.sendMessage({ customType: "notes-context", content: `Local notes context:\n\n${parts.join("\n\n")}`, display: false }, { deliverAs: "nextTurn" });
      ctx.ui.setStatus("notes", `notes: ${path.relative(process.env.HOME || "", root) || root}`);
    }
  });

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "bash") return;
    const cmd = String((event.input as any)?.command || "");
    if (!cmd) return;
    const bypass = (name: string) => new RegExp(`(^|\\s)(${name}|PI_${name})=1(\\s|$)`).test(cmd);

    if (!bypass("NPX_OK") && commandLooksLike(cmd, /(^|[;&|]|&&|\|\|)\s*(npx|node)(\s|$)/)) {
      const scripts = collectPackageScripts(ctx.cwd);
      return { block: true, reason: `Raw npx/node invocation blocked by general-dev-suite. Prefer an existing package script when one fits.\n\nCommand:\n${cmd}\n\nNearby package scripts:\n${scripts || "(none found)"}\n\nBypass for this call with PI_NPX_OK=1.` };
    }

    if (!bypass("PY_JSON_OK") && /python\d*\s+(-c\s+['\"][^'\"]*(json\.loads|json\.dumps|json\.tool)|-m\s+json\.tool)/s.test(cmd)) {
      return { block: true, reason: "Python JSON one-shot blocked. Prefer jq for shell JSON filtering/formatting, or bypass with PI_PY_JSON_OK=1 if Python is truly needed." };
    }


    if (!bypass("SLEEP_OK") && /^\s*sleep\s+\d+[smhd]?\s*$/i.test(cmd)) {
      return { block: true, reason: "Standalone sleep blocked. Prefer polling a concrete condition with a timeout. Bypass with PI_SLEEP_OK=1." };
    }

    if (!bypass("CURL_OK") && /\bcurl\b/.test(cmd) && /(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?\/[A-Za-z0-9_./?&=-]+/.test(cmd)) {
      return { block: true, reason: "Raw curl to a local API path blocked. Prefer project API helpers or the http_request tool so auth, JSON, and errors are handled consistently. Bypass with PI_CURL_OK=1." };
    }

    if (/\btail\b/.test(cmd) && /\btail\s+[^-\s][^|;&]*\s+-n\s+\d+/.test(cmd)) {
      return { block: true, reason: "Suspicious tail argument order. Use `tail -n <N> <file>` (or bypass by correcting explicitly)." };
    }
  });

  pi.on("tool_result", async (event, ctx) => {
    if (!["write", "edit"].includes(event.toolName) || event.isError) return;
    const p = getToolPath(event.input as any);
    if (!p || /\.(md|markdown)$/i.test(String(p))) return;
    try {
      const dir = path.join(ctx.cwd, ".pi", "dev-suite");
      fs.mkdirSync(dir, { recursive: true });
      const rel = path.relative(ctx.cwd, path.resolve(ctx.cwd, String(p)));
      fs.appendFileSync(path.join(dir, "edited-files.log"), `${Date.now()}:${rel}\n`);
    } catch {}
  });

  pi.registerCommand("changed-files", {
    description: "Show files changed in git plus files tracked by the dev-suite extension",
    handler: async (_args, ctx) => {
      const lines: string[] = [];
      try {
        const r = await pi.exec("git", ["diff", "--name-only", "HEAD"], { cwd: ctx.cwd, timeout: 5000 });
        if (r.stdout.trim()) lines.push("Git diff files:\n" + r.stdout.trim());
      } catch {}
      try {
        const log = fs.readFileSync(path.join(ctx.cwd, ".pi", "dev-suite", "edited-files.log"), "utf8").trim();
        if (log) lines.push("Tracked edit log:\n" + log.split("\n").slice(-50).join("\n"));
      } catch {}
      ctx.ui.notify(lines.join("\n\n") || "No changed files found.", "info");
    },
  });

  pi.registerTool({
    name: "changed_files",
    label: "Changed Files",
    description: "List files changed in git and files recorded by the dev-suite edit tracker.",
    parameters: Type.Object({}),
    async execute(_id, _params, signal, _onUpdate, ctx) {
      const lines: string[] = [];
      try {
        const r = await pi.exec("git", ["diff", "--name-only", "HEAD"], { cwd: ctx.cwd, timeout: 5000, signal });
        if (r.stdout.trim()) lines.push("Git diff files:\n" + r.stdout.trim());
      } catch {}
      try {
        const log = fs.readFileSync(path.join(ctx.cwd, ".pi", "dev-suite", "edited-files.log"), "utf8").trim();
        if (log) lines.push("Tracked edit log:\n" + log.split("\n").slice(-100).join("\n"));
      } catch {}
      return text(lines.join("\n\n") || "No changed files found.");
    },
  });

  pi.registerTool({
    name: "note_append_daily",
    label: "Append Daily Note",
    description: "Append text to today's daily org/markdown note in the local notes vault.",
    parameters: Type.Object({ text: Type.String(), heading: Type.Optional(Type.String()) }),
    async execute(_id, params: any) {
      const root = notesRoot();
      const file = path.join(root, "daily", `${today()}.org`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const heading = params.heading ? `\n* ${params.heading}\n` : "\n";
      fs.appendFileSync(file, `${heading}${params.text.trim()}\n`);
      return text(`Appended to ${file}`, { file });
    },
  });

  pi.registerTool({
    name: "note_append",
    label: "Append Note",
    description: "Append text to a file under the local notes vault.",
    parameters: Type.Object({ file: Type.String(), text: Type.String() }),
    async execute(_id, params: any) {
      const root = notesRoot();
      const file = safeJoin(root, params.file);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.appendFileSync(file, `${params.text.trim()}\n`);
      return text(`Appended to ${file}`, { file });
    },
  });

  pi.registerTool({
    name: "note_read",
    label: "Read Note",
    description: "Read a file under the local notes vault.",
    parameters: Type.Object({ file: Type.String() }),
    async execute(_id, params: any) {
      const root = notesRoot();
      const file = safeJoin(root, params.file);
      return text(fs.readFileSync(file, "utf8"), { file });
    },
  });

  pi.registerTool({
    name: "note_list",
    label: "List Notes",
    description: "List files under the local notes vault.",
    parameters: Type.Object({ dir: Type.Optional(Type.String()) }),
    async execute(_id, params: any) {
      const root = notesRoot();
      const dir = safeJoin(root, params.dir || ".");
      const files: string[] = [];
      function walk(d: string, depth: number) {
        if (depth < 0 || files.length > 500) return;
        for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
          if (ent.name === ".git") continue;
          const p = path.join(d, ent.name);
          if (ent.isDirectory()) walk(p, depth - 1); else files.push(path.relative(root, p));
        }
      }
      walk(dir, 3);
      return text(files.sort().join("\n") || "No notes found.", { root, dir });
    },
  });

  pi.registerTool({
    name: "note_search",
    label: "Search Notes",
    description: "Search text in the local notes vault.",
    parameters: Type.Object({ query: Type.String() }),
    async execute(_id, params: any, signal) {
      const root = notesRoot();
      const r = await pi.exec("grep", ["-RIn", "--exclude-dir=.git", "--", params.query, root], { timeout: 10000, signal }).catch((e: any) => e);
      return text((r.stdout || r.stderr || "No matches.").trim(), { root, code: r.code });
    },
  });

  pi.registerTool({
    name: "http_request",
    label: "HTTP Request",
    description: "Make a simple HTTP request for API testing. Prefer project helpers when available. Secrets should be passed via environment, not hard-coded.",
    parameters: Type.Object({
      url: Type.String(),
      method: Type.Optional(Type.String()),
      headers: Type.Optional(Type.Record(Type.String(), Type.String())),
      body: Type.Optional(Type.String()),
      timeoutMs: Type.Optional(Type.Number()),
    }),
    async execute(_id, params: any, signal) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), params.timeoutMs || 30000);
      signal?.addEventListener("abort", () => controller.abort(), { once: true });
      try {
        const res = await fetch(params.url, { method: params.method || (params.body ? "POST" : "GET"), headers: params.headers, body: params.body, signal: controller.signal });
        const body = await res.text();
        const headers: Record<string, string> = {};
        res.headers.forEach((v, k) => { headers[k] = v; });
        return text(`HTTP ${res.status} ${res.statusText}\n\n${body}`, { status: res.status, headers });
      } finally { clearTimeout(timeout); }
    },
  });
}
