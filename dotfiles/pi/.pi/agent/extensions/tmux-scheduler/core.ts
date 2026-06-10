export const CUSTOM_TYPE = "tmux-scheduled-send";
export const STATUS_KEY = "tmux-scheduled-send";

export interface TmuxScheduledSendJob {
  id: string;
  target?: string;
  lines: string[];
  runAt: number;
  enter: boolean;
  createdAt: number;
}

export interface TmuxScheduleEntry {
  action: "scheduled" | "cancelled" | "sent" | "failed";
  job: TmuxScheduledSendJob;
  timestamp: number;
  error?: string;
}

export interface ScheduleParams {
  target?: string;
  text?: string;
  lines?: string[];
  run_at?: string;
  delay_seconds?: number;
  enter?: boolean;
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function formatDate(ms: number): string {
  return new Date(ms).toISOString();
}

export function summarizeLines(lines: string[]): string {
  const first = lines[0] ?? "";
  const suffix = lines.length > 1 ? ` (+${lines.length - 1} more)` : "";
  return `${JSON.stringify(first.length > 80 ? `${first.slice(0, 77)}...` : first)}${suffix}`;
}

export function normalizeScheduledLines(text?: string, lines?: string[]): string[] {
  const out: string[] = [];
  if (typeof text === "string") out.push(...text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n"));
  if (Array.isArray(lines)) out.push(...lines.map((line) => String(line).replace(/\r\n/g, "\n").replace(/\r/g, "\n")).flatMap((line) => line.split("\n")));
  return out;
}

export function parseScheduleTime(input: { run_at?: string; delay_seconds?: number }, now = Date.now()): number {
  const hasDelay = typeof input.delay_seconds === "number";
  const runAtText = input.run_at?.trim();
  const hasRunAt = !!runAtText;

  if (hasDelay && hasRunAt) throw new Error("Provide either delay_seconds or run_at, not both.");
  if (!hasDelay && !hasRunAt) throw new Error("Provide delay_seconds or run_at.");

  if (hasDelay) {
    const delay = input.delay_seconds!;
    if (!Number.isFinite(delay) || delay < 0) throw new Error("delay_seconds must be a non-negative finite number.");
    return now + Math.round(delay * 1000);
  }

  const relative = runAtText!.match(/^\+?(\d+(?:\.\d+)?)(ms|s|m|h|d)$/i);
  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2].toLowerCase();
    const scale = unit === "ms" ? 1 : unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
    return now + Math.round(amount * scale);
  }

  const timeOnly = runAtText!.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (timeOnly) {
    const hours = Number(timeOnly[1]);
    const minutes = Number(timeOnly[2]);
    const seconds = Number(timeOnly[3] ?? "0");
    if (hours > 23 || minutes > 59 || seconds > 59) throw new Error(`Invalid local time: ${runAtText}`);
    const date = new Date(now);
    date.setHours(hours, minutes, seconds, 0);
    if (date.getTime() <= now) date.setDate(date.getDate() + 1);
    return date.getTime();
  }

  const epoch = runAtText!.match(/^\d{10,}$/) ? Number(runAtText) : NaN;
  const parsed = Number.isFinite(epoch) ? (epoch < 10_000_000_000 ? epoch * 1000 : epoch) : Date.parse(runAtText!);
  if (!Number.isFinite(parsed)) throw new Error(`Could not parse run_at value: ${runAtText}`);
  return parsed;
}

export function parseTmuxSendLaterArgs(args: string, now = Date.now()): ScheduleParams {
  const trimmed = args.trim();
  if (!trimmed) throw new Error("Usage: /tmux-send-later <delay|ISO|HH:MM> [target] -- <line to send>");

  const separator = trimmed.indexOf(" -- ");
  if (separator === -1) throw new Error("Missing ` -- ` separator. Usage: /tmux-send-later 5m %3 -- make test");

  const head = trimmed.slice(0, separator).trim();
  const text = trimmed.slice(separator + 4);
  const parts = head.split(/\s+/).filter(Boolean);
  if (parts.length < 1 || parts.length > 2) throw new Error("Usage: /tmux-send-later <delay|ISO|HH:MM> [target] -- <line to send>");

  const when = parts[0];
  const target = parts[1];
  const runAt = parseScheduleTime({ run_at: when }, now);
  return { target, text, run_at: formatDate(runAt), enter: true };
}

export function buildListText(jobs: TmuxScheduledSendJob[], now = Date.now()): string {
  if (jobs.length === 0) return "No pending tmux scheduled sends.";
  return jobs
    .sort((a, b) => a.runAt - b.runAt || a.id.localeCompare(b.id))
    .map((job) => {
      const remainingMs = Math.max(0, job.runAt - now);
      const remainingSeconds = Math.round(remainingMs / 1000);
      const target = job.target ? ` target=${job.target}` : " target=<current tmux pane>";
      return `${job.id} at ${formatDate(job.runAt)} (${remainingSeconds}s)${target} ${plural(job.lines.length, "line")}: ${summarizeLines(job.lines)}`;
    })
    .join("\n");
}

export function makeJob(params: ScheduleParams, now = Date.now(), random = Math.random()): TmuxScheduledSendJob {
  const lines = normalizeScheduledLines(params.text, params.lines);
  if (lines.length === 0) throw new Error("Provide text or lines to send.");
  const runAt = parseScheduleTime({ run_at: params.run_at, delay_seconds: params.delay_seconds }, now);
  return {
    id: `tmux-${now.toString(36)}-${random.toString(36).slice(2, 8)}`,
    target: params.target?.trim() || process.env.TMUX_PANE || undefined,
    lines,
    runAt,
    enter: params.enter ?? true,
    createdAt: now,
  };
}
