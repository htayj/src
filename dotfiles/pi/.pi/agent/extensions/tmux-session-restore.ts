import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const execFileAsync = promisify(execFile);
const TMUX_TIMEOUT_MS = 1000;

async function setPaneOption(name: string, value: string | undefined): Promise<void> {
  const pane = process.env.TMUX_PANE;
  if (!process.env.TMUX || !pane) return;

  const args = value
    ? ["set-option", "-p", "-t", pane, name, value]
    : ["set-option", "-pu", "-t", pane, name];

  try {
    await execFileAsync("tmux", args, { timeout: TMUX_TIMEOUT_MS });
  } catch {
    // Best-effort metadata for tmux-resurrect. Pi should still start even if
    // tmux is unavailable, the pane disappeared, or this is not a tmux client.
  }
}

export default function tmuxSessionRestore(pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    await setPaneOption("@pi-session-file", ctx.sessionManager.getSessionFile() ?? undefined);
  });
}
