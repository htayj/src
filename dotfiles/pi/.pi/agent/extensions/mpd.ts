import net from "node:net";
import type { Socket } from "node:net";
import { Type } from "typebox";
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 6600;
const DEFAULT_TIMEOUT_MS = 5000;

const CONTROL_ACTIONS = [
  "play",
  "pause",
  "toggle",
  "stop",
  "next",
  "previous",
  "seek_current",
  "set_volume",
  "repeat",
  "random",
  "single",
  "consume",
  "update",
  "rescan",
] as const;

const PLAYLIST_ACTIONS = ["add", "clear", "delete", "move", "playlist", "list_all"] as const;

type MpdConnection = {
  host: string;
  port: number;
  password?: string;
};

type MpdResponse = {
  raw: string;
  lines: string[];
  dataLines: string[];
  values: Record<string, string>;
  objects: Array<Record<string, string>>;
};

function connection(): MpdConnection {
  const host = process.env.MPD_HOST || DEFAULT_HOST;
  const port = Number.parseInt(process.env.MPD_PORT || `${DEFAULT_PORT}`, 10);
  return {
    host,
    port: Number.isFinite(port) ? port : DEFAULT_PORT,
    password: process.env.MPD_PASSWORD || undefined,
  };
}

function quote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function boolFlag(value: boolean | undefined, fallback = true): "0" | "1" {
  if (value === undefined) return fallback ? "1" : "0";
  return value ? "1" : "0";
}

function parseValues(lines: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of lines) {
    const index = line.indexOf(": ");
    if (index <= 0) continue;
    result[line.slice(0, index)] = line.slice(index + 2);
  }
  return result;
}

function parseObjects(lines: string[]): Array<Record<string, string>> {
  const objects: Array<Record<string, string>> = [];
  let current: Record<string, string> = {};

  for (const line of lines) {
    const index = line.indexOf(": ");
    if (index <= 0) continue;

    const key = line.slice(0, index);
    const value = line.slice(index + 2);

    if ((key === "file" || key === "directory" || key === "playlist") && Object.keys(current).length > 0) {
      objects.push(current);
      current = {};
    }

    current[key] = value;
  }

  if (Object.keys(current).length > 0) objects.push(current);
  return objects;
}

function parseMpdResponse(raw: string): MpdResponse {
  const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
  const ack = lines.find((line) => line.startsWith("ACK "));
  if (ack) throw new Error(`MPD error: ${ack}`);

  const dataLines = lines.filter((line) => !line.startsWith("OK MPD ") && line !== "OK" && line !== "list_OK");
  return {
    raw,
    lines,
    dataLines,
    values: parseValues(dataLines),
    objects: parseObjects(dataLines),
  };
}

function sendMpd(commands: string[], signal?: AbortSignal): Promise<MpdResponse> {
  const { host, port, password } = connection();
  const allCommands = password ? [`password ${quote(password)}`, ...commands] : commands;

  return new Promise((resolve, reject) => {
    let settled = false;
    let output = "";
    let socket: Socket | undefined;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      socket?.destroy();
      if (error) reject(error);
      else {
        try {
          resolve(parseMpdResponse(output));
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    const onAbort = () => finish(new Error("MPD request cancelled"));
    const timer = setTimeout(() => finish(new Error(`Timed out connecting to MPD at ${host}:${port}`)), DEFAULT_TIMEOUT_MS);

    if (signal?.aborted) return onAbort();
    signal?.addEventListener("abort", onAbort, { once: true });

    socket = net.createConnection({ host, port }, () => {
      socket?.write(`${allCommands.join("\n")}\nclose\n`);
    });

    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      output += chunk;
    });
    socket.on("error", (err) => finish(err));
    socket.on("end", () => finish());
    socket.on("close", () => {
      if (!settled && output.length > 0) finish();
    });
  });
}

function summarizeStatus(status: Record<string, string>, song: Record<string, string>): string {
  const state = status.state ?? "unknown";
  const artist = song.Artist || song.AlbumArtist;
  const title = song.Title || song.Name || song.file;
  const track = artist && title ? `${artist} - ${title}` : title || "No current song";
  const elapsed = status.elapsed && status.duration ? ` (${Number(status.elapsed).toFixed(0)}/${Number(status.duration).toFixed(0)}s)` : "";
  const volume = status.volume ? ` volume ${status.volume}%` : "";
  return `${state}: ${track}${elapsed}${volume}`;
}

async function getStatus(signal?: AbortSignal): Promise<{ status: Record<string, string>; song: Record<string, string>; summary: string }> {
  const response = await sendMpd(["status", "currentsong"], signal);
  const split = response.dataLines.findIndex((line, index) => index > 0 && line.startsWith("file: "));
  const statusLines = split >= 0 ? response.dataLines.slice(0, split) : response.dataLines;
  const songLines = split >= 0 ? response.dataLines.slice(split) : [];
  const status = parseValues(statusLines);
  const song = parseValues(songLines);
  return { status, song, summary: summarizeStatus(status, song) };
}

function controlCommands(params: {
  action: (typeof CONTROL_ACTIONS)[number];
  value?: number;
  enabled?: boolean;
  position?: number;
}): string[] {
  switch (params.action) {
    case "play":
      return params.position === undefined ? ["play"] : [`play ${params.position}`];
    case "pause":
      return [`pause ${boolFlag(params.enabled, true)}`];
    case "toggle":
      return ["pause"];
    case "stop":
      return ["stop"];
    case "next":
      return ["next"];
    case "previous":
      return ["previous"];
    case "seek_current":
      if (typeof params.value !== "number") throw new Error("seek_current requires numeric value seconds");
      return [`seekcur ${params.value}`];
    case "set_volume":
      if (typeof params.value !== "number") throw new Error("set_volume requires numeric value 0-100");
      return [`setvol ${Math.max(0, Math.min(100, Math.round(params.value)))}`];
    case "repeat":
      return [`repeat ${boolFlag(params.enabled)}`];
    case "random":
      return [`random ${boolFlag(params.enabled)}`];
    case "single":
      return [`single ${boolFlag(params.enabled)}`];
    case "consume":
      return [`consume ${boolFlag(params.enabled)}`];
    case "update":
      return ["update"];
    case "rescan":
      return ["rescan"];
  }
}

const mpdStatusTool = defineTool({
  name: "mpd_status",
  label: "MPD Status",
  description: "Get Music Player Daemon playback status and the current song from the local user MPD server.",
  promptSnippet: "Get local MPD playback status and current song.",
  promptGuidelines: ["Use mpd_status when the user asks what is playing or asks for MPD/music playback state."],
  parameters: Type.Object({}),

  async execute(_toolCallId, _params, signal) {
    const status = await getStatus(signal);
    return {
      content: [{ type: "text", text: status.summary }],
      details: status,
    };
  },
});

const mpdControlTool = defineTool({
  name: "mpd_control",
  label: "MPD Control",
  description: "Control local MPD playback: play, pause, toggle, stop, next, previous, seek, volume, repeat/random/single/consume, update, or rescan.",
  promptSnippet: "Control local MPD playback and playback modes.",
  promptGuidelines: ["Use mpd_control when the user asks to control local MPD playback, volume, playback modes, update, or rescan."],
  parameters: Type.Object({
    action: Type.String({ enum: CONTROL_ACTIONS, description: "Playback/control action." }),
    value: Type.Optional(Type.Number({ description: "Number of seconds for seek_current; 0-100 for set_volume." })),
    enabled: Type.Optional(Type.Boolean({ description: "Boolean for pause and playback modes: repeat/random/single/consume." })),
    position: Type.Optional(Type.Integer({ minimum: 0, description: "Optional playlist position for play." })),
  }),

  async execute(_toolCallId, params, signal, onUpdate) {
    const commands = controlCommands(params);
    onUpdate?.({ content: [{ type: "text", text: `Sending MPD command: ${commands.join("; ")}` }] });
    await sendMpd(commands, signal);
    const status = await getStatus(signal);
    return {
      content: [{ type: "text", text: `MPD ${params.action}: ${status.summary}` }],
      details: { action: params.action, commands, ...status },
    };
  },
});

const mpdPlaylistTool = defineTool({
  name: "mpd_playlist",
  label: "MPD Playlist",
  description: "Manage or inspect the local MPD current playlist: add URI/path, clear, delete, move, list playlist, or list the music database.",
  promptSnippet: "Manage or inspect the local MPD playlist and music database.",
  promptGuidelines: ["Use mpd_playlist when the user asks to add music, clear/delete/move playlist entries, or list the MPD playlist/database."],
  parameters: Type.Object({
    action: Type.String({ enum: PLAYLIST_ACTIONS, description: "Playlist action." }),
    uri: Type.Optional(Type.String({ description: "URI/path to add, relative to MPD's music_directory when appropriate." })),
    position: Type.Optional(Type.Integer({ minimum: 0, description: "Playlist position for delete or move." })),
    to_position: Type.Optional(Type.Integer({ minimum: 0, description: "Destination playlist position for move." })),
  }),

  async execute(_toolCallId, params, signal) {
    let response: MpdResponse;
    switch (params.action) {
      case "add":
        if (!params.uri) throw new Error("add requires uri");
        response = await sendMpd([`add ${quote(params.uri)}`], signal);
        break;
      case "clear":
        response = await sendMpd(["clear"], signal);
        break;
      case "delete":
        if (params.position === undefined) throw new Error("delete requires position");
        response = await sendMpd([`delete ${params.position}`], signal);
        break;
      case "move":
        if (params.position === undefined || params.to_position === undefined) throw new Error("move requires position and to_position");
        response = await sendMpd([`move ${params.position} ${params.to_position}`], signal);
        break;
      case "playlist":
        response = await sendMpd(["playlistinfo"], signal);
        break;
      case "list_all":
        response = await sendMpd(["listallinfo"], signal);
        break;
    }

    const itemCount = response.objects.length;
    const text = params.action === "playlist" || params.action === "list_all"
      ? response.objects.slice(0, 100).map((item, index) => `${index}. ${item.Artist ? `${item.Artist} - ` : ""}${item.Title || item.file || item.directory || item.playlist || "<unknown>"}`).join("\n") || "No entries."
      : `MPD playlist ${params.action} complete.`;

    return {
      content: [{ type: "text", text: itemCount > 100 ? `${text}\n... ${itemCount - 100} more entries omitted.` : text }],
      details: { action: params.action, itemCount, objects: response.objects, raw: response.raw },
    };
  },
});

async function runCommand(args: string, signal?: AbortSignal): Promise<string> {
  const [command, ...rest] = args.trim().split(/\s+/).filter(Boolean);
  switch (command || "status") {
    case "status":
      return (await getStatus(signal)).summary;
    case "play":
      await sendMpd(["play"], signal);
      return (await getStatus(signal)).summary;
    case "pause":
      await sendMpd(["pause 1"], signal);
      return (await getStatus(signal)).summary;
    case "toggle":
      await sendMpd(["pause"], signal);
      return (await getStatus(signal)).summary;
    case "stop":
    case "next":
    case "previous":
    case "prev": {
      const mpdCommand = command === "prev" ? "previous" : command;
      await sendMpd([mpdCommand], signal);
      return (await getStatus(signal)).summary;
    }
    case "volume": {
      const value = Number.parseInt(rest[0] ?? "", 10);
      if (!Number.isFinite(value)) throw new Error("Usage: /mpd volume <0-100>");
      await sendMpd([`setvol ${Math.max(0, Math.min(100, value))}`], signal);
      return (await getStatus(signal)).summary;
    }
    case "add": {
      const uri = rest.join(" ");
      if (!uri) throw new Error("Usage: /mpd add <uri-or-path>");
      await sendMpd([`add ${quote(uri)}`], signal);
      return `Added ${uri}`;
    }
    case "clear":
      await sendMpd(["clear"], signal);
      return "Cleared MPD playlist.";
    case "update":
    case "rescan":
      await sendMpd([command], signal);
      return `Started MPD ${command}.`;
    default:
      throw new Error("Usage: /mpd [status|play|pause|toggle|stop|next|prev|volume N|add URI|clear|update|rescan]");
  }
}

export default function (pi: ExtensionAPI) {
  pi.registerTool(mpdStatusTool);
  pi.registerTool(mpdControlTool);
  pi.registerTool(mpdPlaylistTool);

  pi.registerCommand("mpd", {
    description: "Control local MPD: status, play, pause, toggle, stop, next, prev, volume N, add URI, clear, update, rescan",
    handler: async (args, ctx) => {
      try {
        const text = await runCommand(args, ctx.signal);
        ctx.ui.notify(text, "info");
        ctx.ui.setStatus("mpd", `♪ ${text}`);
      } catch (err) {
        ctx.ui.notify(err instanceof Error ? err.message : String(err), "error");
      }
    },
  });

  pi.on("session_start", async (_event, ctx) => {
    try {
      const status = await getStatus(ctx.signal);
      ctx.ui.setStatus("mpd", `♪ ${status.summary}`);
    } catch {
      ctx.ui.setStatus("mpd", "♪ MPD unavailable");
    }
  });
}
