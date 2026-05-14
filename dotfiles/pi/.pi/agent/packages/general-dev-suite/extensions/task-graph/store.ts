import * as fs from "node:fs";
import * as path from "node:path";
import type { ArtifactRef, TaskGraphRun } from "./schema";

export function taskGraphRoot(cwd: string) {
  return path.join(cwd, ".pi", "dev-suite", "task-graph");
}

export function runsDir(cwd: string) {
  return path.join(taskGraphRoot(cwd), "runs");
}

export function artifactsDir(cwd: string, runId: string, taskId?: string) {
  return taskId
    ? path.join(taskGraphRoot(cwd), "artifacts", runId, taskId)
    : path.join(taskGraphRoot(cwd), "artifacts", runId);
}

export function currentFile(cwd: string) {
  return path.join(taskGraphRoot(cwd), "current.json");
}

export function ensureStore(cwd: string) {
  fs.mkdirSync(runsDir(cwd), { recursive: true });
  fs.mkdirSync(path.join(taskGraphRoot(cwd), "artifacts"), { recursive: true });
}

export function runPath(cwd: string, runId: string) {
  return path.join(runsDir(cwd), `${runId}.json`);
}

export function eventsPath(cwd: string, runId: string) {
  return path.join(runsDir(cwd), `${runId}.events.jsonl`);
}

export function saveRun(run: TaskGraphRun) {
  ensureStore(run.cwd);
  run.updatedAt = new Date().toISOString();
  const file = runPath(run.cwd, run.runId);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(run, null, 2)}\n`);
  fs.renameSync(tmp, file);
  fs.writeFileSync(currentFile(run.cwd), `${JSON.stringify({ runId: run.runId }, null, 2)}\n`);
}

export function loadRun(cwd: string, runId?: string): TaskGraphRun | undefined {
  ensureStore(cwd);
  let id = runId;
  if (!id) {
    try {
      const current = JSON.parse(fs.readFileSync(currentFile(cwd), "utf8")) as { runId?: string };
      id = current.runId;
    } catch {
      id = undefined;
    }
  }
  if (!id) return undefined;
  const file = runPath(cwd, id);
  if (!fs.existsSync(file)) return undefined;
  return JSON.parse(fs.readFileSync(file, "utf8")) as TaskGraphRun;
}

export function listRuns(cwd: string, limit = 20) {
  ensureStore(cwd);
  return fs
    .readdirSync(runsDir(cwd))
    .filter((name) => name.endsWith(".json") && !name.endsWith(".events.json"))
    .map((name) => path.join(runsDir(cwd), name))
    .map((file) => ({ file, mtime: fs.statSync(file).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit)
    .map(({ file }) => JSON.parse(fs.readFileSync(file, "utf8")) as TaskGraphRun);
}

export function appendEvent(run: TaskGraphRun, event: Record<string, unknown>) {
  ensureStore(run.cwd);
  fs.appendFileSync(
    eventsPath(run.cwd, run.runId),
    `${JSON.stringify({ at: new Date().toISOString(), runId: run.runId, ...event })}\n`,
  );
}

export function writeArtifact(run: TaskGraphRun, taskId: string, type: string, filename: string, content: string, summary?: string): ArtifactRef {
  const dir = artifactsDir(run.cwd, run.runId, taskId);
  fs.mkdirSync(dir, { recursive: true });
  const safeName = filename.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 120) || `${type}.txt`;
  const file = path.join(dir, safeName);
  fs.writeFileSync(file, content);
  return {
    id: `art-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    path: file,
    producerTaskId: taskId,
    createdAt: new Date().toISOString(),
    summary,
  };
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function slugify(input: string, max = 48) {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return slug || "task";
}
