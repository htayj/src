import { spawn } from "node:child_process";

const HELPER = "/home/tay/.local/bin/tmux-agent-session";

function remember(sessionID) {
  if (typeof sessionID !== "string" || sessionID.length === 0) return;
  if (!process.env.TMUX || !process.env.TMUX_PANE) return;

  const child = spawn(HELPER, ["set", "opencode", sessionID], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

function sessionIDFromEvent(event) {
  const properties = event?.properties;
  return properties?.sessionID ?? properties?.info?.id;
}

export const TmuxSessionRestorePlugin = async () => ({
  event: async ({ event }) => {
    remember(sessionIDFromEvent(event));
  },
  "chat.message": async ({ sessionID }) => {
    remember(sessionID);
  },
  "command.execute.before": async ({ sessionID }) => {
    remember(sessionID);
  },
  "tool.execute.before": async ({ sessionID }) => {
    remember(sessionID);
  },
});

export default TmuxSessionRestorePlugin;
