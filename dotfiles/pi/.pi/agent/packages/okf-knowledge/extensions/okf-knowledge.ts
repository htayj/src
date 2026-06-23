import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { TextDecoder } from "node:util";

type Scope = "global" | "project";
type ScopeSelector = Scope | "both";
type Metadata = Record<string, unknown>;

type ParsedOkf = {
  hasFrontmatter: boolean;
  metadata: Metadata;
  body: string;
  rawFrontmatter: string;
  errors: string[];
};

type RootInfo = {
  path: string;
  exists: boolean;
  projectRoot?: string;
};

type ResolvedRoots = {
  global: RootInfo;
  project: RootInfo;
};

type LintMessage = {
  level: "error" | "warning";
  code: string;
  scope: Scope;
  path?: string;
  message: string;
};

type SearchResult = {
  scope: Scope;
  path: string;
  file: string;
  type?: string;
  title?: string;
  tags: string[];
  snippet: string;
};

const ScopeSchema = Type.Union([Type.Literal("global"), Type.Literal("project")]);
const ScopeSelectorSchema = Type.Union([Type.Literal("global"), Type.Literal("project"), Type.Literal("both")]);
const decoder = new TextDecoder("utf-8", { fatal: true });
const MARKDOWN_EXTENSION = ".md";
const FRONTMATTER_KEY_PATTERN = /^[A-Za-z0-9_.-]+$/;
const O_NOFOLLOW = typeof fs.constants.O_NOFOLLOW === "number" ? fs.constants.O_NOFOLLOW : 0;
const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 100;
const RESERVED_INDEX = "index.md";
const RESERVED_LOG = "log.md";

const SECRET_PATTERNS: Array<{ code: string; pattern: RegExp }> = [
  { code: "private-key-block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i },
  { code: "aws-access-key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { code: "github-token", pattern: /\bghp_[A-Za-z0-9_]{30,}\b/ },
  { code: "credential-assignment", pattern: /\b(api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret|private[_-]?key)\b\s*[:=]\s*\S{4,}/i },
];

const text = (s: string, details: Record<string, unknown> = {}) => ({
  content: [{ type: "text" as const, text: s }],
  details,
});

function homeDir() {
  return process.env.HOME || os.homedir() || ".";
}

function expandHome(input: string) {
  if (input === "~") return homeDir();
  if (input.startsWith("~/")) return path.join(homeDir(), input.slice(2));
  return input;
}

function abbreviateHome(input: string) {
  const home = path.resolve(homeDir());
  const resolved = path.resolve(input);
  return resolved === home ? "~" : resolved.startsWith(home + path.sep) ? `~/${path.relative(home, resolved)}` : resolved;
}

function globalKnowledgeRoot() {
  return path.resolve(expandHome(process.env.PI_OKF_GLOBAL_ROOT || "~/.pi/agent/knowledge"));
}

function markerExists(dir: string) {
  return fs.existsSync(path.join(dir, ".pi", "knowledge")) ||
    fs.existsSync(path.join(dir, ".pi", "settings.json")) ||
    fs.existsSync(path.join(dir, ".git"));
}

function findProjectRoot(cwd: string) {
  const start = path.resolve(cwd || process.cwd());
  let current = start;
  while (true) {
    if (markerExists(current)) return current;
    const parent = path.dirname(current);
    if (parent === current) return start;
    current = parent;
  }
}

function resolveOkfRoots(cwd: string): ResolvedRoots {
  const projectRoot = findProjectRoot(cwd);
  const globalRoot = globalKnowledgeRoot();
  const projectKnowledgeRoot = path.join(projectRoot, ".pi", "knowledge");
  return {
    global: { path: globalRoot, exists: fs.existsSync(globalRoot) },
    project: { path: projectKnowledgeRoot, exists: fs.existsSync(projectKnowledgeRoot), projectRoot },
  };
}

function normalizeScope(value: unknown): Scope {
  if (value === "global" || value === "project") return value;
  throw new Error(`Invalid OKF scope: ${String(value)}. Expected global or project.`);
}

function normalizeScopeSelector(value: unknown): ScopeSelector {
  if (value === undefined || value === null || value === "") return "both";
  if (value === "global" || value === "project" || value === "both") return value;
  throw new Error(`Invalid OKF scope: ${String(value)}. Expected global, project, or both.`);
}

function selectedScopes(value: unknown): Scope[] {
  const selector = normalizeScopeSelector(value);
  return selector === "both" ? ["global", "project"] : [selector];
}

function normalizeBundlePath(input: unknown, options: { allowRoot?: boolean; requireMarkdown?: boolean } = {}) {
  const rawInput = input === undefined || input === null ? "" : String(input).trim();
  if (options.allowRoot && (rawInput === "" || rawInput === "." || rawInput === "/")) return ".";
  if (!rawInput) throw new Error("OKF path is required.");
  if (rawInput.includes("\0")) throw new Error("Unsafe OKF path contains a NUL byte.");
  if (/^[A-Za-z]:[\\/]/.test(rawInput)) throw new Error(`Unsafe OKF path uses a drive-qualified absolute path: ${rawInput}`);

  const slashPath = rawInput.replace(/\\/g, "/").replace(/^\/+/, "");
  const normalized = path.posix.normalize(slashPath);
  if (!normalized || normalized === ".") {
    if (options.allowRoot) return ".";
    throw new Error("OKF path must name a Markdown file.");
  }
  if (normalized === ".." || normalized.startsWith("../") || path.posix.isAbsolute(normalized)) {
    throw new Error(`OKF path escapes the knowledge bundle: ${rawInput}`);
  }
  if (options.requireMarkdown && path.posix.extname(normalized).toLowerCase() !== MARKDOWN_EXTENSION) {
    throw new Error(`OKF document paths must end in ${MARKDOWN_EXTENSION}: ${rawInput}`);
  }
  return normalized;
}

function safeJoin(root: string, rel: string) {
  const resolvedRoot = path.resolve(root);
  const full = path.resolve(resolvedRoot, rel === "." ? "." : rel.split("/").join(path.sep));
  if (full !== resolvedRoot && !full.startsWith(resolvedRoot + path.sep)) {
    throw new Error(`OKF path escapes the knowledge bundle: ${rel}`);
  }
  return full;
}

function scopeRoot(cwd: string, scope: Scope) {
  return resolveOkfRoots(cwd)[scope].path;
}

function isNotFoundError(error: unknown) {
  return typeof error === "object" && error !== null && (error as NodeJS.ErrnoException).code === "ENOENT";
}

function assertNoSymlinksOnPath(targetPath: string, options: { allowMissing?: boolean } = {}) {
  const resolved = path.resolve(targetPath);
  const parsed = path.parse(resolved);
  const segments = path.relative(parsed.root, resolved).split(path.sep).filter(Boolean);
  let current = parsed.root;
  for (const segment of segments) {
    current = path.join(current, segment);
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (options.allowMissing && isNotFoundError(error)) return;
      throw error;
    }
    if (stat.isSymbolicLink()) {
      throw new Error(`OKF path contains a symlink and cannot be used: ${current}`);
    }
  }
}

function pathExistsWithoutSymlink(targetPath: string) {
  assertNoSymlinksOnPath(targetPath, { allowMissing: true });
  return fs.existsSync(targetPath);
}

function ensureParentDirectory(file: string) {
  const parent = path.dirname(file);
  assertNoSymlinksOnPath(parent, { allowMissing: true });
  fs.mkdirSync(parent, { recursive: true });
  assertNoSymlinksOnPath(parent);
}

function readUtf8(file: string) {
  assertNoSymlinksOnPath(file);
  const fd = fs.openSync(file, fs.constants.O_RDONLY | O_NOFOLLOW);
  try {
    return decoder.decode(fs.readFileSync(fd));
  } finally {
    fs.closeSync(fd);
  }
}

function writeUtf8(file: string, content: string, mode: "create" | "overwrite") {
  assertNoSymlinksOnPath(file, { allowMissing: true });
  const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | O_NOFOLLOW |
    (mode === "create" ? fs.constants.O_EXCL : fs.constants.O_TRUNC);
  const fd = fs.openSync(file, flags, 0o666);
  try {
    fs.writeFileSync(fd, content, "utf8");
  } finally {
    fs.closeSync(fd);
  }
}

function appendUtf8(file: string, content: string) {
  assertNoSymlinksOnPath(file);
  const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_APPEND | O_NOFOLLOW);
  try {
    fs.writeFileSync(fd, content, "utf8");
  } finally {
    fs.closeSync(fd);
  }
}

function parseScalar(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  if (trimmed === "[]") return [];
  if (/^(true|false)$/i.test(trimmed)) return /^true$/i.test(trimmed);
  if (/^(null|~)$/i.test(trimmed)) return null;
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((part) => parseScalar(part));
  }
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    if (trimmed.startsWith('"')) {
      try { return JSON.parse(trimmed); } catch { return trimmed.slice(1, -1); }
    }
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}

function parseSimpleYaml(lines: string[]) {
  const metadata: Metadata = {};
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = /^([A-Za-z0-9_.-]+):(?:\s*(.*))?$/.exec(line);
    if (!match) {
      errors.push(`Unsupported frontmatter line ${i + 1}: ${line}`);
      continue;
    }
    const key = match[1];
    const rest = match[2] ?? "";
    if (rest.trim() === "|" || rest.trim() === ">") {
      errors.push(`Unsupported block scalar for frontmatter key '${key}'.`);
      continue;
    }
    if (rest.trim() !== "") {
      metadata[key] = parseScalar(rest);
      continue;
    }

    const items: unknown[] = [];
    let j = i + 1;
    while (j < lines.length) {
      const itemMatch = /^\s*-\s*(.*)$/.exec(lines[j]);
      if (!itemMatch) break;
      items.push(parseScalar(itemMatch[1]));
      j += 1;
    }
    if (items.length) {
      metadata[key] = items;
      i = j - 1;
    } else {
      metadata[key] = "";
    }
  }

  return { metadata, errors };
}

function assertMetadataKey(key: string) {
  if (!FRONTMATTER_KEY_PATTERN.test(key)) {
    throw new Error(`Unsupported OKF metadata key '${key}'. Frontmatter keys must match ${FRONTMATTER_KEY_PATTERN}.`);
  }
}

function isSupportedMetadataScalar(value: unknown) {
  return value === null || value === undefined || ["string", "number", "boolean"].includes(typeof value);
}

function assertSupportedMetadataValue(key: string, value: unknown) {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!isSupportedMetadataScalar(item)) {
        throw new Error(`Unsupported OKF metadata value for '${key}'. Expected a scalar or list of scalars.`);
      }
    }
    return;
  }
  if (!isSupportedMetadataScalar(value)) {
    throw new Error(`Unsupported OKF metadata value for '${key}'. Expected a scalar or list of scalars.`);
  }
}

function assertSupportedMetadata(metadata: Metadata) {
  for (const [key, value] of Object.entries(metadata)) {
    assertMetadataKey(key);
    assertSupportedMetadataValue(key, value);
  }
}

function parseFrontmatter(content: string): ParsedOkf {
  const normalized = content.replace(/^\uFEFF/, "");
  const lines = normalized.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return { hasFrontmatter: false, metadata: {}, body: normalized, rawFrontmatter: "", errors: [] };
  }

  let end = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "---") {
      end = i;
      break;
    }
  }
  if (end < 0) {
    return {
      hasFrontmatter: true,
      metadata: {},
      body: "",
      rawFrontmatter: lines.slice(1).join("\n"),
      errors: ["Frontmatter starts with --- but has no closing --- delimiter."],
    };
  }

  const rawFrontmatter = lines.slice(1, end).join("\n");
  const parsed = parseSimpleYaml(lines.slice(1, end));
  return {
    hasFrontmatter: true,
    metadata: parsed.metadata,
    body: lines.slice(end + 1).join("\n"),
    rawFrontmatter,
    errors: parsed.errors,
  };
}

function quoteYamlScalar(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  const textValue = String(value);
  if (textValue === "") return '""';
  if (/^[A-Za-z0-9_./@#+-][A-Za-z0-9_ ./@#+:-]*$/.test(textValue) && !/[#:][\s]/.test(textValue)) return textValue;
  return JSON.stringify(textValue);
}

function stringifySimpleYaml(metadata: Metadata) {
  assertSupportedMetadata(metadata);
  const preferred = ["type", "title", "description", "resource", "tags", "timestamp"];
  const keys = [
    ...preferred.filter((key) => Object.prototype.hasOwnProperty.call(metadata, key)),
    ...Object.keys(metadata).filter((key) => !preferred.includes(key)).sort(),
  ];
  const lines: string[] = [];
  for (const key of keys) {
    const value = metadata[key];
    if (Array.isArray(value)) {
      if (!value.length) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) lines.push(`  - ${quoteYamlScalar(item)}`);
      }
    } else {
      lines.push(`${key}: ${quoteYamlScalar(value)}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") {
    const separator = value.includes(",") ? /,/ : /\s+/;
    return value.split(separator).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function assertOkfType(metadata: Metadata) {
  if (typeof metadata.type !== "string" || !metadata.type.trim()) throw new Error("OKF frontmatter requires a non-empty string 'type' field.");
}

function secretLikeCodes(content: string) {
  return SECRET_PATTERNS
    .filter(({ pattern }) => {
      pattern.lastIndex = 0;
      return pattern.test(content);
    })
    .map(({ code }) => code);
}

function assertNoSecretLikeContent(content: string) {
  const [code] = secretLikeCodes(content);
  if (code) {
    throw new Error(`Refusing to write secret-like content (${code}). Store credentials outside OKF knowledge bundles.`);
  }
}

function buildMetadata(params: Record<string, unknown>) {
  const extra = params.extra && typeof params.extra === "object" && !Array.isArray(params.extra) ? params.extra as Metadata : {};
  const metadata: Metadata = { ...extra };
  metadata.type = String(params.type ?? "").trim();
  for (const key of ["title", "description", "resource", "timestamp"] as const) {
    if (params[key] !== undefined) metadata[key] = params[key];
  }
  if (params.tags !== undefined) metadata.tags = normalizeTags(params.tags);
  if (metadata.timestamp === undefined) metadata.timestamp = new Date().toISOString();
  assertOkfType(metadata);
  assertSupportedMetadata(metadata);
  return metadata;
}

function buildOkfDocument(metadata: Metadata, body: string) {
  return `---\n${stringifySimpleYaml(metadata)}---\n\n${body.trimEnd()}\n`;
}

function parseRequiredOkfDocument(content: string) {
  const parsed = parseFrontmatter(content);
  if (!parsed.hasFrontmatter) throw new Error("OKF documents require YAML frontmatter delimited by ---.");
  if (parsed.errors.length) throw new Error(`Invalid OKF frontmatter: ${parsed.errors.join("; ")}`);
  assertOkfType(parsed.metadata);
  return parsed;
}

function writeRawOkf(cwd: string, scope: Scope, relInput: unknown, content: string, mode: "create" | "overwrite") {
  const rel = normalizeBundlePath(relInput, { requireMarkdown: true });
  const root = scopeRoot(cwd, scope);
  const file = safeJoin(root, rel);
  const exists = pathExistsWithoutSymlink(file);
  if (mode === "create" && exists) throw new Error(`OKF document already exists: ${scope}:/${rel}`);
  assertNoSecretLikeContent(content);
  const parsed = parseRequiredOkfDocument(content);
  ensureParentDirectory(file);
  writeUtf8(file, content.endsWith("\n") ? content : `${content}\n`, mode);
  return { scope, path: `/${rel}`, file, metadata: parsed.metadata, mode, created: !exists };
}

function writeOkf(cwd: string, params: Record<string, unknown>) {
  const scope = normalizeScope(params.scope ?? "project");
  const rel = normalizeBundlePath(params.path, { requireMarkdown: true });
  const root = scopeRoot(cwd, scope);
  const file = safeJoin(root, rel);
  const mode = (params.mode === "overwrite" || params.mode === "append" || params.mode === "create") ? params.mode : "create";
  const exists = pathExistsWithoutSymlink(file);
  const body = String(params.body ?? "");
  const metadata = buildMetadata(params);

  if (mode === "create" && exists) throw new Error(`OKF document already exists: ${scope}:/${rel}`);
  assertNoSecretLikeContent(`${JSON.stringify(metadata)}\n${body}`);
  ensureParentDirectory(file);

  if (mode === "append" && exists) {
    const existing = readUtf8(file);
    const parsed = parseRequiredOkfDocument(existing);
    const separator = existing.endsWith("\n") ? "\n" : "\n\n";
    appendUtf8(file, `${separator}${body.trimEnd()}\n`);
    return { scope, path: `/${rel}`, file, metadata: parsed.metadata, mode, created: false };
  }

  const content = buildOkfDocument(metadata, body);
  writeUtf8(file, content, mode === "create" ? "create" : "overwrite");
  return { scope, path: `/${rel}`, file, metadata, mode, created: !exists };
}

function readOkf(cwd: string, scopeInput: unknown, relInput: unknown) {
  const scope = normalizeScope(scopeInput);
  const rel = normalizeBundlePath(relInput, { requireMarkdown: true });
  const root = scopeRoot(cwd, scope);
  const file = safeJoin(root, rel);
  const content = readUtf8(file);
  const parsed = parseFrontmatter(content);
  return { scope, path: `/${rel}`, file, content, metadata: parsed.metadata, body: parsed.body, frontmatterErrors: parsed.errors };
}

function walkMarkdown(root: string, options: { onSymlink?: (file: string) => void } = {}) {
  const files: string[] = [];
  const skipDirs = new Set([".git", "node_modules", ".cache"]);
  function handleSymlink(full: string) {
    if (options.onSymlink) {
      options.onSymlink(full);
      return;
    }
    throw new Error(`OKF path contains a symlink and cannot be used: ${full}`);
  }
  function walk(dir: string) {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        handleSymlink(full);
      } else if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) walk(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(MARKDOWN_EXTENSION)) {
        files.push(full);
      }
    }
  }
  if (pathExistsWithoutSymlink(root)) walk(root);
  return files.sort();
}

function bundlePath(root: string, file: string) {
  return `/${path.relative(root, file).split(path.sep).join("/")}`;
}

function snippetFor(content: string, query: string | undefined) {
  const compact = content.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  if (!query) return compact.slice(0, 220);
  const lower = compact.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx < 0) return compact.slice(0, 220);
  const start = Math.max(0, idx - 80);
  const end = Math.min(compact.length, idx + query.length + 140);
  return `${start > 0 ? "…" : ""}${compact.slice(start, end)}${end < compact.length ? "…" : ""}`;
}

function searchOkf(cwd: string, params: Record<string, unknown>) {
  const roots = resolveOkfRoots(cwd);
  const query = params.query === undefined || params.query === null ? "" : String(params.query).trim();
  const queryLower = query.toLowerCase();
  const typeFilter = params.type === undefined || params.type === null || params.type === "" ? undefined : String(params.type).trim();
  const tagFilter = normalizeTags(params.tags).map((tag) => tag.toLowerCase());
  const limit = Math.max(1, Math.min(MAX_SEARCH_LIMIT, Number(params.limit || DEFAULT_SEARCH_LIMIT) || DEFAULT_SEARCH_LIMIT));
  const results: SearchResult[] = [];

  for (const scope of selectedScopes(params.scope)) {
    const root = roots[scope].path;
    if (!pathExistsWithoutSymlink(root)) continue;
    for (const file of walkMarkdown(root)) {
      let content: string;
      try { content = readUtf8(file); } catch { continue; }
      const parsed = parseFrontmatter(content);
      const metadata = parsed.metadata;
      const type = typeof metadata.type === "string" ? metadata.type : undefined;
      const tags = normalizeTags(metadata.tags);
      if (typeFilter && type !== typeFilter) continue;
      if (tagFilter.length) {
        const docTags = tags.map((tag) => tag.toLowerCase());
        if (!tagFilter.every((tag) => docTags.includes(tag))) continue;
      }
      const haystack = `${JSON.stringify(metadata)}\n${parsed.body}\n${content}`.toLowerCase();
      if (queryLower && !haystack.includes(queryLower)) continue;
      results.push({
        scope,
        path: bundlePath(root, file),
        file,
        type,
        title: typeof metadata.title === "string" ? metadata.title : undefined,
        tags,
        snippet: snippetFor(content, query || undefined),
      });
      if (results.length >= limit) return { results, truncated: true, roots };
    }
  }

  return { results, truncated: false, roots };
}

function lintMessage(level: "error" | "warning", code: string, scope: Scope, pathValue: string | undefined, message: string): LintMessage {
  return { level, code, scope, path: pathValue, message };
}

function isExternalLink(target: string) {
  return /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#");
}

function linkTargetPath(target: string) {
  return target.split(/[?#]/, 1)[0].trim();
}

function lintBrokenLinks(scope: Scope, root: string, file: string, content: string, warnings: LintMessage[]) {
  const rel = path.relative(root, file).split(path.sep).join("/");
  const currentDir = path.posix.dirname(rel);
  const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of content.matchAll(linkPattern)) {
    const rawTarget = match[1].trim();
    if (!rawTarget || isExternalLink(rawTarget)) continue;
    const cleanTarget = linkTargetPath(rawTarget);
    if (!cleanTarget || cleanTarget.startsWith("#") || !cleanTarget.toLowerCase().endsWith(MARKDOWN_EXTENSION)) continue;
    let linkRel: string;
    try {
      linkRel = cleanTarget.startsWith("/")
        ? normalizeBundlePath(cleanTarget, { requireMarkdown: true })
        : normalizeBundlePath(path.posix.join(currentDir, cleanTarget), { requireMarkdown: true });
    } catch (error) {
      warnings.push(lintMessage("warning", "unsafe-link", scope, `/${rel}`, `Link target '${rawTarget}' is not bundle-relative: ${(error as Error).message}`));
      continue;
    }
    let linkExists = false;
    try {
      linkExists = pathExistsWithoutSymlink(safeJoin(root, linkRel));
    } catch (error) {
      warnings.push(lintMessage("warning", "unsafe-link", scope, `/${rel}`, `Link target '${rawTarget}' cannot use symlinks: ${(error as Error).message}`));
      continue;
    }
    if (!linkExists) {
      warnings.push(lintMessage("warning", "broken-link", scope, `/${rel}`, `Broken bundle-relative Markdown link: ${rawTarget}`));
    }
  }
}

function lintOkf(cwd: string, params: Record<string, unknown>) {
  const roots = resolveOkfRoots(cwd);
  const errors: LintMessage[] = [];
  const warnings: LintMessage[] = [];
  let checked = 0;

  for (const scope of selectedScopes(params.scope)) {
    const root = roots[scope].path;
    let rootExists = false;
    try {
      rootExists = pathExistsWithoutSymlink(root);
    } catch (error) {
      errors.push(lintMessage("error", "symlink-path", scope, undefined, `Knowledge root cannot use symlinks: ${(error as Error).message}`));
      continue;
    }
    if (!rootExists) {
      warnings.push(lintMessage("warning", "missing-root", scope, undefined, `Knowledge root does not exist yet: ${root}`));
      continue;
    }

    const relTarget = params.path === undefined ? "." : normalizeBundlePath(params.path, { allowRoot: true });
    const target = safeJoin(root, relTarget);
    let targetExists = false;
    try {
      targetExists = pathExistsWithoutSymlink(target);
    } catch (error) {
      errors.push(lintMessage("error", "symlink-path", scope, relTarget === "." ? undefined : `/${relTarget}`, `OKF lint target cannot use symlinks: ${(error as Error).message}`));
      continue;
    }
    if (!targetExists) {
      errors.push(lintMessage("error", "missing-path", scope, relTarget === "." ? undefined : `/${relTarget}`, `OKF lint target does not exist: ${scope}:/${relTarget}`));
      continue;
    }

    const stat = fs.lstatSync(target);
    const files = stat.isDirectory()
      ? walkMarkdown(target, {
          onSymlink: (symlink) => errors.push(lintMessage("error", "symlink-path", scope, bundlePath(root, symlink), `OKF lint refuses symlinks inside knowledge bundles: ${symlink}`)),
        })
      : [target].filter((file) => file.toLowerCase().endsWith(MARKDOWN_EXTENSION));
    const rootRelativeFiles = files.map((file) => path.relative(root, file).split(path.sep).join("/"));
    if (files.length > 0 && relTarget === ".") {
      if (!rootRelativeFiles.includes(RESERVED_INDEX)) warnings.push(lintMessage("warning", "missing-index", scope, "/index.md", "Recommended bundle index.md is missing."));
      if (!rootRelativeFiles.includes(RESERVED_LOG)) warnings.push(lintMessage("warning", "missing-log", scope, "/log.md", "Recommended bundle log.md is missing."));
    }

    for (const file of files) {
      const rel = bundlePath(root, file);
      checked += 1;
      let content: string;
      try {
        content = readUtf8(file);
      } catch (error) {
        errors.push(lintMessage("error", "invalid-utf8", scope, rel, `File is not valid UTF-8: ${(error as Error).message}`));
        continue;
      }

      for (const code of secretLikeCodes(content)) {
        errors.push(lintMessage("error", "secret-like-content", scope, rel, `Secret-like content detected (${code}). Store credentials outside OKF knowledge bundles.`));
      }

      const parsed = parseFrontmatter(content);
      if (!parsed.hasFrontmatter) {
        errors.push(lintMessage("error", "missing-frontmatter", scope, rel, "OKF document is missing YAML frontmatter delimited by ---."));
      }
      for (const parseError of parsed.errors) errors.push(lintMessage("error", "frontmatter-shape", scope, rel, parseError));
      if (typeof parsed.metadata.type !== "string" || !parsed.metadata.type.trim()) {
        errors.push(lintMessage("error", "missing-type", scope, rel, "OKF frontmatter requires a non-empty string 'type' field."));
      }
      if (parsed.metadata.tags !== undefined) {
        const tags = parsed.metadata.tags;
        const validTags = typeof tags === "string" || (Array.isArray(tags) && tags.every((item) => typeof item === "string"));
        if (!validTags) warnings.push(lintMessage("warning", "tags-shape", scope, rel, "Recommended 'tags' field should be a string or list of strings."));
      }
      const relNoSlash = rel.slice(1);
      if (relNoSlash === RESERVED_INDEX && parsed.metadata.type !== undefined && parsed.metadata.type !== "index") {
        warnings.push(lintMessage("warning", "reserved-index-type", scope, rel, "Reserved index.md is recommended to use type: index."));
      }
      if (relNoSlash === RESERVED_LOG && parsed.metadata.type !== undefined && parsed.metadata.type !== "log") {
        warnings.push(lintMessage("warning", "reserved-log-type", scope, rel, "Reserved log.md is recommended to use type: log."));
      }
      lintBrokenLinks(scope, root, file, content, warnings);
    }
  }

  return { roots, checked, errors, warnings, ok: errors.length === 0 };
}

function formatRoots(roots: ResolvedRoots) {
  return [
    "OKF knowledge roots:",
    `- global: ${abbreviateHome(roots.global.path)} (${roots.global.exists ? "exists" : "missing"})`,
    `- project: ${abbreviateHome(roots.project.path)} (${roots.project.exists ? "exists" : "missing"}; project root ${abbreviateHome(roots.project.projectRoot || "")})`,
  ].join("\n");
}

function formatSearchResults(results: SearchResult[], truncated: boolean) {
  if (!results.length) return "No OKF matches.";
  const lines = results.map((result) => {
    const title = result.title ? ` — ${result.title}` : "";
    const tags = result.tags.length ? ` [${result.tags.join(", ")}]` : "";
    const type = result.type ? ` (${result.type})` : "";
    return `- ${result.scope}:${result.path}${type}${title}${tags}\n  ${result.snippet}`;
  });
  if (truncated) lines.push(`… truncated at ${results.length} results.`);
  return lines.join("\n");
}

function formatLintResult(result: ReturnType<typeof lintOkf>) {
  const lines = [`OKF lint ${result.ok ? "PASS" : "FAIL"}: ${result.checked} Markdown file(s), ${result.errors.length} error(s), ${result.warnings.length} warning(s).`];
  for (const item of [...result.errors, ...result.warnings]) {
    const place = `${item.scope}${item.path ? `:${item.path}` : ""}`;
    lines.push(`- ${item.level.toUpperCase()} ${item.code} ${place}: ${item.message}`);
  }
  return lines.join("\n");
}

function parseCommandWords(args: string) {
  const words: string[] = [];
  const pattern = /"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'|(\S+)/g;
  for (const match of args.matchAll(pattern)) {
    words.push((match[1] ?? match[2] ?? match[3] ?? "").replace(/\\(["'\\])/g, "$1"));
  }
  return words;
}

function parseSearchCommand(args: string) {
  const words = parseCommandWords(args);
  const first = words[0];
  const scope = first === "global" || first === "project" || first === "both" ? first : "both";
  const queryWords = scope === first ? words.slice(1) : words;
  return { scope, query: queryWords.join(" ") };
}

function requireCommandArgs(condition: unknown, usage: string) {
  if (!condition) throw new Error(`Usage: ${usage}`);
}

function notify(ctx: ExtensionCommandContext, message: string, type: "info" | "warning" | "error" = "info") {
  ctx.ui.notify(message, type);
}

function initialDocumentTemplate(type: string) {
  return buildOkfDocument({ type, title: "", tags: [], timestamp: new Date().toISOString() }, "");
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    const roots = resolveOkfRoots(ctx.cwd);
    ctx.ui.setStatus("okf", `okf: G${roots.global.exists ? "✓" : "·"} P${roots.project.exists ? "✓" : "·"}`);
  });

  pi.registerTool({
    name: "okf_roots",
    label: "OKF Roots",
    description: "Show resolved global and project OKF knowledge roots without creating them.",
    promptSnippet: "Use okf_roots to discover global and project OKF knowledge bundle locations.",
    parameters: Type.Object({}),
    async execute(_id, _params, _signal, _onUpdate, ctx: ExtensionContext) {
      const roots = resolveOkfRoots(ctx.cwd);
      return text(formatRoots(roots), { roots });
    },
  });

  pi.registerTool({
    name: "okf_search",
    label: "OKF Search",
    description: "Search OKF Markdown+YAML knowledge bundles by text query, type, and tags.",
    promptSnippet: "Search local OKF knowledge before assuming durable personal/project facts are unknown.",
    promptGuidelines: ["Use okf_search with scope 'both' for reusable local/project knowledge. Do not store or request secrets in OKF bundles."],
    parameters: Type.Object({
      scope: Type.Optional(ScopeSelectorSchema),
      query: Type.Optional(Type.String()),
      type: Type.Optional(Type.String()),
      tags: Type.Optional(Type.Union([Type.Array(Type.String()), Type.String()])),
      limit: Type.Optional(Type.Number()),
    }),
    async execute(_id, params: Record<string, unknown>, _signal, _onUpdate, ctx: ExtensionContext) {
      const result = searchOkf(ctx.cwd, params);
      return text(formatSearchResults(result.results, result.truncated), result);
    },
  });

  pi.registerTool({
    name: "okf_read",
    label: "OKF Read",
    description: "Read one OKF Markdown file by scope and bundle-relative path.",
    parameters: Type.Object({
      scope: ScopeSchema,
      path: Type.String(),
    }),
    async execute(_id, params: Record<string, unknown>, _signal, _onUpdate, ctx: ExtensionContext) {
      const result = readOkf(ctx.cwd, params.scope, params.path);
      return text(result.content, result);
    },
  });

  pi.registerTool({
    name: "okf_write",
    label: "OKF Write",
    description: "Create, overwrite, or append an OKF Markdown+YAML document. Requires type and rejects secret-like content.",
    parameters: Type.Object({
      scope: Type.Optional(ScopeSchema),
      path: Type.String(),
      mode: Type.Optional(Type.Union([Type.Literal("create"), Type.Literal("overwrite"), Type.Literal("append")])),
      type: Type.String(),
      title: Type.Optional(Type.String()),
      description: Type.Optional(Type.String()),
      resource: Type.Optional(Type.String()),
      tags: Type.Optional(Type.Union([Type.Array(Type.String()), Type.String()])),
      timestamp: Type.Optional(Type.String()),
      body: Type.Optional(Type.String()),
      extra: Type.Optional(Type.Record(Type.String(), Type.Any())),
    }),
    async execute(_id, params: Record<string, unknown>, _signal, _onUpdate, ctx: ExtensionContext) {
      const result = writeOkf(ctx.cwd, params);
      return text(`${result.mode === "append" ? "Appended" : "Wrote"} OKF document ${result.scope}:${result.path}`, result);
    },
  });

  pi.registerTool({
    name: "okf_lint",
    label: "OKF Lint",
    description: "Lint OKF Markdown+YAML bundles for required type fields, simple frontmatter shape, UTF-8, reserved files, and broken bundle-relative links.",
    parameters: Type.Object({
      scope: Type.Optional(ScopeSelectorSchema),
      path: Type.Optional(Type.String()),
    }),
    async execute(_id, params: Record<string, unknown>, _signal, _onUpdate, ctx: ExtensionContext) {
      const result = lintOkf(ctx.cwd, params);
      return text(formatLintResult(result), result);
    },
  });

  pi.registerCommand("okf-roots", {
    description: "Show resolved global and project OKF knowledge roots",
    handler: async (_args, ctx) => notify(ctx, formatRoots(resolveOkfRoots(ctx.cwd))),
  });

  pi.registerCommand("okf-search", {
    description: "Search OKF knowledge: /okf-search [global|project|both] <query>",
    handler: async (args, ctx) => {
      const parsed = parseSearchCommand(args);
      requireCommandArgs(parsed.query, "/okf-search [global|project|both] <query>");
      const result = searchOkf(ctx.cwd, parsed);
      notify(ctx, formatSearchResults(result.results, result.truncated));
    },
  });

  pi.registerCommand("okf-read", {
    description: "Read an OKF document: /okf-read <global|project> <path.md>",
    handler: async (args, ctx) => {
      const [scope, rel] = parseCommandWords(args);
      requireCommandArgs(scope && rel, "/okf-read <global|project> <path.md>");
      const result = readOkf(ctx.cwd, scope, rel);
      notify(ctx, `${result.scope}:${result.path}\n\n${result.content.slice(0, 8000)}${result.content.length > 8000 ? "\n… truncated" : ""}`);
    },
  });

  pi.registerCommand("okf-write", {
    description: "Edit/create an OKF document: /okf-write <global|project> <path.md> [type]",
    handler: async (args, ctx) => {
      const [scopeRaw, rel, typeRaw] = parseCommandWords(args);
      requireCommandArgs(scopeRaw && rel, "/okf-write <global|project> <path.md> [type]");
      const scope = normalizeScope(scopeRaw);
      const type = typeRaw || "note";
      const root = scopeRoot(ctx.cwd, scope);
      const normalizedRel = normalizeBundlePath(rel, { requireMarkdown: true });
      const file = safeJoin(root, normalizedRel);
      const exists = fs.existsSync(file);
      const prefill = exists ? readUtf8(file) : initialDocumentTemplate(type);
      const edited = await ctx.ui.editor(`OKF ${scope}:/${normalizedRel}`, prefill);
      if (edited === undefined) {
        notify(ctx, "OKF write cancelled.", "warning");
        return;
      }
      const result = writeRawOkf(ctx.cwd, scope, normalizedRel, edited, exists ? "overwrite" : "create");
      notify(ctx, `${result.created ? "Created" : "Updated"} OKF document ${result.scope}:${result.path}`);
    },
  });

  pi.registerCommand("okf-lint", {
    description: "Lint OKF knowledge: /okf-lint [global|project|both]",
    handler: async (args, ctx) => {
      const words = parseCommandWords(args);
      const scope = words[0] || "both";
      const result = lintOkf(ctx.cwd, { scope });
      notify(ctx, formatLintResult(result), result.ok ? "info" : "warning");
    },
  });
}
