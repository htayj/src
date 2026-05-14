import type { TaskGraphRun, TaskNode } from "./schema";
import { readyTasks, summarizeCounts } from "./scheduler";

const GLYPH: Record<string, string> = {
  pending: "○",
  ready: "◆",
  running: "▶",
  blocked: "⧖",
  awaiting_input: "?",
  skipped: "⊘",
  succeeded: "✓",
  failed: "✗",
  cancelled: "⏹",
  deleted: "⌫",
};

function short(id: string) {
  return id.replace(/^([a-z]+)-/, "$1:").slice(0, 18);
}

function taskLine(task: TaskNode) {
  const deps = task.blockedBy.length ? ` deps:${task.blockedBy.map(short).join(",")}` : "";
  const sub = task.subagent?.type ? ` @${task.subagent.type}` : "";
  return `${GLYPH[task.status] ?? "•"} ${short(task.id)} ${task.kind.padEnd(11)} ${task.title}${sub}${deps}`;
}

export function renderStatus(run: TaskGraphRun, opts: { expanded?: boolean; limit?: number } = {}) {
  const counts = summarizeCounts(run);
  const next = readyTasks(run);
  const header = `Task graph ${run.runId} (${run.mode}) ${run.status} · ready ${next.length}/${run.config.maxParallel}`;
  const summary = Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([status, count]) => `${GLYPH[status] ?? status}:${count}`)
    .join(" ");
  const lines = [header, summary || "no tasks"];
  if (next.length) {
    lines.push("", "Ready:");
    for (const task of next) lines.push(`  ◆ ${short(task.id)} ${task.kind} ${task.title} via ${task.runner.kind}:${task.runner.name}`);
  }
  const tasks = Object.values(run.tasks)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, opts.limit ?? (opts.expanded ? 200 : 18));
  lines.push("", "Tasks:");
  for (const task of tasks) lines.push(`  ${taskLine(task)}`);
  const total = Object.keys(run.tasks).length;
  if (tasks.length < total) lines.push(`  … ${total - tasks.length} more`);
  return lines.join("\n");
}

export function footerStatus(run: TaskGraphRun) {
  const counts = summarizeCounts(run);
  const ready = readyTasks(run).length;
  const running = counts.running ?? 0;
  const failed = counts.failed ?? 0;
  const pending = (counts.pending ?? 0) + (counts.ready ?? 0);
  return `◆${ready} ▶${running} ○${pending}${failed ? ` ✗${failed}` : ""}`;
}

export function renderReadyInstructions(run: TaskGraphRun) {
  const ready = readyTasks(run);
  if (!ready.length) return `No ready tasks for ${run.runId}.`;
  const lines = [`Ready tasks for ${run.runId}:`];
  for (const task of ready) {
    lines.push("", `## ${task.id} — ${task.title}`);
    lines.push(`Runner: ${task.runner.kind}:${task.runner.name}`);
    if (task.subagent?.type) lines.push(`Subagent: ${task.subagent.type}`);
    lines.push(`Locks: ${task.lockKeys.join(", ") || "none"}`);
    lines.push("Prompt:");
    lines.push(task.prompt);
  }
  return lines.join("\n");
}
