import { Type } from "typebox";
import { defineTool, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
  buildListText,
  CUSTOM_TYPE,
  formatDate,
  makeJob,
  parseTmuxSendLaterArgs,
  plural,
  STATUS_KEY,
  summarizeLines,
  type ScheduleParams,
  type TmuxScheduledSendJob,
  type TmuxScheduleEntry,
} from "./core";

const MAX_TIMER_MS = 2_147_483_647;

interface PendingJob {
  job: TmuxScheduledSendJob;
  timer?: NodeJS.Timeout;
}

export default function tmuxSchedulerExtension(pi: ExtensionAPI) {
  const pending = new Map<string, PendingJob>();
  let lastCtx: ExtensionContext | undefined;

  function updateStatus(ctx = lastCtx) {
    if (!ctx?.hasUI) return;
    const count = pending.size;
    if (count === 0) {
      ctx.ui.setStatus(STATUS_KEY, undefined);
      return;
    }
    const next = [...pending.values()].sort((a, b) => a.job.runAt - b.job.runAt)[0]?.job;
    const seconds = next ? Math.max(0, Math.round((next.runAt - Date.now()) / 1000)) : 0;
    ctx.ui.setStatus(STATUS_KEY, `tmux sends: ${count}, next ${seconds}s`);
  }

  function append(action: TmuxScheduleEntry["action"], job: TmuxScheduledSendJob, error?: string) {
    const entry: TmuxScheduleEntry = { action, job, timestamp: Date.now() };
    if (error) entry.error = error;
    pi.appendEntry<TmuxScheduleEntry>(CUSTOM_TYPE, entry);
  }

  async function runTmux(args: string[]) {
    const result = await pi.exec("tmux", args, { timeout: 10_000 });
    if (result.code !== 0) {
      const stderr = result.stderr?.trim();
      const stdout = result.stdout?.trim();
      throw new Error(`tmux ${args.join(" ")} failed (${result.code}): ${stderr || stdout || "no output"}`);
    }
    return result.stdout ?? "";
  }

  async function sendJob(job: TmuxScheduledSendJob) {
    if (!job.target) throw new Error("No tmux target pane is available. Pass target or run Pi inside tmux.");
    for (const line of job.lines) {
      if (line.length > 0) await runTmux(["send-keys", "-t", job.target, "-l", "--", line]);
      if (job.enter) await runTmux(["send-keys", "-t", job.target, "Enter"]);
    }
  }

  function clearTimer(id: string) {
    const entry = pending.get(id);
    if (entry?.timer) clearTimeout(entry.timer);
  }

  function scheduleTimer(job: TmuxScheduledSendJob) {
    clearTimer(job.id);
    const delay = Math.max(0, job.runAt - Date.now());
    const timer = setTimeout(async () => {
      if (job.runAt - Date.now() > 0) {
        scheduleTimer(job);
        return;
      }

      pending.delete(job.id);
      updateStatus();
      try {
        await sendJob(job);
        append("sent", job);
        pi.sendMessage(
          {
            customType: CUSTOM_TYPE,
            content: `Sent ${plural(job.lines.length, "scheduled tmux line")} to ${job.target ?? "<no target>"}: ${summarizeLines(job.lines)}`,
            display: true,
            details: { action: "sent", job },
          },
          { deliverAs: "nextTurn" },
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        append("failed", job, message);
        pi.sendMessage(
          {
            customType: CUSTOM_TYPE,
            content: `Failed scheduled tmux send ${job.id}: ${message}`,
            display: true,
            details: { action: "failed", job, error: message },
          },
          { deliverAs: "nextTurn" },
        );
      }
    }, Math.min(delay, MAX_TIMER_MS));
    pending.set(job.id, { job, timer });
    updateStatus();
  }

  function scheduleJob(job: TmuxScheduledSendJob) {
    pending.set(job.id, { job });
    scheduleTimer(job);
    append("scheduled", job);
    return job;
  }

  function cancelJob(id: string): boolean {
    const entry = pending.get(id);
    if (!entry) return false;
    clearTimer(id);
    pending.delete(id);
    append("cancelled", entry.job);
    updateStatus();
    return true;
  }

  function cancelAll(): number {
    const ids = [...pending.keys()];
    for (const id of ids) cancelJob(id);
    return ids.length;
  }

  function restoreFromBranch(ctx: ExtensionContext) {
    lastCtx = ctx;
    for (const id of [...pending.keys()]) clearTimer(id);
    pending.clear();

    const jobs = new Map<string, TmuxScheduledSendJob>();
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type !== "custom" || entry.customType !== CUSTOM_TYPE) continue;
      const data = entry.data as TmuxScheduleEntry | undefined;
      if (!data?.job?.id) continue;
      if (data.action === "scheduled") jobs.set(data.job.id, data.job);
      if (data.action === "cancelled" || data.action === "sent" || data.action === "failed") jobs.delete(data.job.id);
    }

    for (const job of jobs.values()) scheduleTimer(job);
    updateStatus(ctx);
  }

  const listPanesTool = defineTool({
    name: "tmux_list_panes",
    label: "Tmux Panes",
    description: "List tmux panes and target ids for scheduling future send-keys operations.",
    promptSnippet: "List tmux panes and target ids for tmux scheduled sends.",
    promptGuidelines: [
      "Use tmux_list_panes before tmux_schedule_send when the target pane is ambiguous.",
    ],
    parameters: Type.Object({}),
    async execute() {
      const output = await runTmux(["list-panes", "-a", "-F", "#{pane_id}\t#{session_name}:#{window_index}.#{pane_index}\t#{pane_current_command}\t#{pane_title}\t#{pane_current_path}"]);
      const text = output.trim() || "No tmux panes found.";
      return { content: [{ type: "text", text }], details: { panes: text } };
    },
  });

  const scheduleTool = defineTool({
    name: "tmux_schedule_send",
    label: "Tmux Schedule Send",
    description: "Schedule literal line(s) to be sent to a tmux pane in the future. The Pi process must be running when the job becomes due; overdue jobs fire on the next session start/reload.",
    promptSnippet: "Schedule literal line(s) to be sent to a tmux pane later.",
    promptGuidelines: [
      "Use tmux_schedule_send when the user asks to send text or commands to tmux at a future time.",
      "Use tmux_list_panes first when you need a safe target pane id; omitting target uses the current TMUX_PANE and may type into Pi itself.",
      "tmux_schedule_send sends text literally with tmux send-keys -l, then Enter after each line unless enter is false.",
    ],
    parameters: Type.Object({
      target: Type.Optional(Type.String({ description: "tmux target pane/window/session, e.g. %3 or session:1.0. Defaults to TMUX_PANE." })),
      text: Type.Optional(Type.String({ description: "Text to send. Newlines are split into separate scheduled lines." })),
      lines: Type.Optional(Type.Array(Type.String(), { description: "Lines to send. Each item may also contain newlines." })),
      run_at: Type.Optional(Type.String({ description: "When to run: ISO timestamp, epoch seconds/ms, HH:MM local time, or relative like +10s, 5m, 1h." })),
      delay_seconds: Type.Optional(Type.Number({ minimum: 0, description: "Delay from now in seconds. Mutually exclusive with run_at." })),
      enter: Type.Optional(Type.Boolean({ description: "Send Enter after each line. Defaults to true." })),
    }),
    async execute(_toolCallId, params: ScheduleParams) {
      const job = scheduleJob(makeJob(params));
      const text = `Scheduled tmux send ${job.id} for ${formatDate(job.runAt)} to ${job.target ?? "<no target>"}: ${plural(job.lines.length, "line")} ${summarizeLines(job.lines)}`;
      return { content: [{ type: "text", text }], details: { job, pending: [...pending.values()].map((entry) => entry.job) } };
    },
  });

  const scheduledTool = defineTool({
    name: "tmux_scheduled_sends",
    label: "Tmux Scheduled Sends",
    description: "List or cancel pending tmux scheduled sends.",
    promptSnippet: "List or cancel pending tmux scheduled sends.",
    promptGuidelines: ["Use tmux_scheduled_sends to inspect or cancel pending tmux scheduled sends."],
    parameters: Type.Object({
      action: Type.Optional(Type.String({ enum: ["list", "cancel", "cancel_all"], description: "Action to perform. Defaults to list." })),
      id: Type.Optional(Type.String({ description: "Scheduled send id to cancel when action is cancel." })),
    }),
    async execute(_toolCallId, params: { action?: "list" | "cancel" | "cancel_all"; id?: string }) {
      const action = params.action ?? "list";
      if (action === "list") {
        const jobs = [...pending.values()].map((entry) => entry.job);
        return { content: [{ type: "text", text: buildListText(jobs) }], details: { jobs } };
      }
      if (action === "cancel_all") {
        const count = cancelAll();
        return { content: [{ type: "text", text: `Cancelled ${plural(count, "tmux scheduled send")}.` }], details: { cancelled: count } };
      }
      if (!params.id) throw new Error("id is required when action is cancel.");
      const cancelled = cancelJob(params.id);
      if (!cancelled) throw new Error(`No pending tmux scheduled send with id ${params.id}.`);
      return { content: [{ type: "text", text: `Cancelled tmux scheduled send ${params.id}.` }], details: { cancelled: params.id } };
    },
  });

  pi.registerTool(listPanesTool);
  pi.registerTool(scheduleTool);
  pi.registerTool(scheduledTool);

  pi.registerCommand("tmux-panes", {
    description: "List tmux panes and target ids",
    handler: async (_args, ctx) => {
      lastCtx = ctx;
      try {
        const output = await runTmux(["list-panes", "-a", "-F", "#{pane_id}\t#{session_name}:#{window_index}.#{pane_index}\t#{pane_current_command}\t#{pane_title}\t#{pane_current_path}"]);
        ctx.ui.notify(output.trim() || "No tmux panes found.", "info");
      } catch (err) {
        ctx.ui.notify(err instanceof Error ? err.message : String(err), "error");
      }
    },
  });

  pi.registerCommand("tmux-send-later", {
    description: "Schedule a line to be sent to tmux later: /tmux-send-later 5m [%pane] -- command",
    handler: async (args, ctx) => {
      lastCtx = ctx;
      try {
        const parsed = parseTmuxSendLaterArgs(args);
        const job = scheduleJob(makeJob(parsed));
        ctx.ui.notify(`Scheduled ${job.id} for ${formatDate(job.runAt)} to ${job.target ?? "<no target>"}.`, "info");
      } catch (err) {
        ctx.ui.notify(err instanceof Error ? err.message : String(err), "error");
      }
    },
  });

  pi.registerCommand("tmux-scheduled-sends", {
    description: "List pending tmux scheduled sends",
    handler: async (_args, ctx) => {
      lastCtx = ctx;
      ctx.ui.notify(buildListText([...pending.values()].map((entry) => entry.job)), "info");
    },
  });

  pi.registerCommand("tmux-cancel-send", {
    description: "Cancel a pending tmux scheduled send by id, or all",
    handler: async (args, ctx) => {
      lastCtx = ctx;
      const id = args.trim();
      if (!id) {
        ctx.ui.notify("Usage: /tmux-cancel-send <id|all>", "warning");
        return;
      }
      if (id === "all") {
        const count = cancelAll();
        ctx.ui.notify(`Cancelled ${plural(count, "tmux scheduled send")}.`, "info");
        return;
      }
      const cancelled = cancelJob(id);
      ctx.ui.notify(cancelled ? `Cancelled ${id}.` : `No pending tmux scheduled send with id ${id}.`, cancelled ? "info" : "warning");
    },
  });

  pi.on("session_start", async (_event, ctx) => restoreFromBranch(ctx));
  pi.on("session_shutdown", async () => {
    for (const id of [...pending.keys()]) clearTimer(id);
    pending.clear();
  });
}
