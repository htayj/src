import { readFile, stat } from "node:fs/promises";
import { basename, extname, isAbsolute, resolve } from "node:path";
import { homedir } from "node:os";
import { Type } from "typebox";
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Container, Image, Text } from "@earendil-works/pi-tui";

const CUSTOM_TYPE = "embedded_image";
const MAX_RAW_BYTES = 10 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

const SUPPORTED_MIME_TYPES = new Set(Object.values(MIME_BY_EXTENSION));

type ImageDetails = {
  base64: string;
  mimeType: string;
  filename?: string;
  altText?: string;
  source?: "path" | "base64" | "data_url";
  path?: string;
  bytes: number;
  maxWidthCells?: number;
  maxHeightCells?: number;
};

type ShowImageParams = {
  path?: string;
  base64?: string;
  data_url?: string;
  mime_type?: string;
  filename?: string;
  alt_text?: string;
  max_width_cells?: number;
  max_height_cells?: number;
};

function expandHome(path: string): string {
  return path === "~" ? homedir() : path.startsWith("~/") ? resolve(homedir(), path.slice(2)) : path;
}

function resolveImagePath(input: string, cwd: string): string {
  const stripped = input.trim().replace(/^@+/, "");
  const expanded = expandHome(stripped);
  return isAbsolute(expanded) ? expanded : resolve(cwd, expanded);
}

function detectMimeFromBytes(buffer: Buffer): string | undefined {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 6 && (buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a")) return "image/gif";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return undefined;
}

function detectMimeFromExtension(filename: string | undefined): string | undefined {
  if (!filename) return undefined;
  return MIME_BY_EXTENSION[extname(filename).toLowerCase()];
}

function normalizeMimeType(mimeType: string | undefined): string | undefined {
  if (!mimeType) return undefined;
  const normalized = mimeType.toLowerCase().split(";", 1)[0]?.trim();
  return normalized && SUPPORTED_MIME_TYPES.has(normalized) ? normalized : undefined;
}

function ensureSize(buffer: Buffer): void {
  if (buffer.length > MAX_RAW_BYTES) {
    throw new Error(`Image is ${buffer.length} bytes; maximum supported raw image size is ${MAX_RAW_BYTES} bytes (10 MiB).`);
  }
}

function estimateDecodedBase64Bytes(compact: string): number {
  const padding = compact.endsWith("==") ? 2 : compact.endsWith("=") ? 1 : 0;
  return Math.floor((compact.length * 3) / 4) - padding;
}

function decodeBase64(input: string): Buffer {
  const compact = input.replace(/\s+/g, "");
  if (!compact || compact.length % 4 === 1 || /[^a-zA-Z0-9+/=]/.test(compact)) throw new Error("Invalid base64 image data.");
  const estimatedBytes = estimateDecodedBase64Bytes(compact);
  if (estimatedBytes > MAX_RAW_BYTES) {
    throw new Error(`Base64 image data decodes to about ${estimatedBytes} bytes; maximum supported raw image size is ${MAX_RAW_BYTES} bytes (10 MiB).`);
  }
  const buffer = Buffer.from(compact, "base64");
  if (buffer.length === 0) throw new Error("Base64 image data decoded to an empty file.");
  return buffer;
}

function validateImageBuffer(buffer: Buffer, requestedMimeType: string | undefined, filename: string | undefined): { mimeType: string; bytes: number } {
  ensureSize(buffer);
  const magicMime = detectMimeFromBytes(buffer);
  const extensionMime = detectMimeFromExtension(filename);
  const normalizedRequested = normalizeMimeType(requestedMimeType);

  if (requestedMimeType && !normalizedRequested) throw new Error(`Unsupported mime_type ${requestedMimeType}. Supported: PNG, JPEG, GIF, WebP.`);
  if (!magicMime) throw new Error("Unsupported image bytes. Supported: PNG, JPEG, GIF, WebP.");
  if (normalizedRequested && normalizedRequested !== magicMime) {
    throw new Error(`mime_type ${normalizedRequested} does not match image bytes (${magicMime}).`);
  }
  if (extensionMime && extensionMime !== magicMime) {
    throw new Error(`Filename extension suggests ${extensionMime}, but image bytes are ${magicMime}.`);
  }

  return { mimeType: magicMime, bytes: buffer.length };
}

async function loadImage(params: ShowImageParams, cwd: string): Promise<ImageDetails> {
  const sources = [params.path, params.base64, params.data_url].filter((value) => typeof value === "string" && value.trim().length > 0);
  if (sources.length !== 1) throw new Error("Provide exactly one image source: path, base64, or data_url.");

  const maxWidthCells = params.max_width_cells;
  const maxHeightCells = params.max_height_cells;
  if (maxWidthCells !== undefined && (!Number.isFinite(maxWidthCells) || maxWidthCells <= 0)) throw new Error("max_width_cells must be a positive number.");
  if (maxHeightCells !== undefined && (!Number.isFinite(maxHeightCells) || maxHeightCells <= 0)) throw new Error("max_height_cells must be a positive number.");

  if (params.path) {
    const imagePath = resolveImagePath(params.path, cwd);
    const info = await stat(imagePath);
    if (!info.isFile()) throw new Error(`Image path is not a file: ${imagePath}`);
    if (info.size > MAX_RAW_BYTES) throw new Error(`Image file is ${info.size} bytes; maximum supported raw image size is ${MAX_RAW_BYTES} bytes (10 MiB).`);
    const buffer = await readFile(imagePath);
    const filename = params.filename ?? basename(imagePath);
    const validated = validateImageBuffer(buffer, params.mime_type, filename);
    return {
      base64: buffer.toString("base64"),
      mimeType: validated.mimeType,
      filename,
      altText: params.alt_text,
      source: "path",
      path: imagePath,
      bytes: validated.bytes,
      maxWidthCells,
      maxHeightCells,
    };
  }

  if (params.data_url) {
    const match = params.data_url.trim().match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
    if (!match) throw new Error("Invalid data_url. Expected data:<mime>;base64,<data>.");
    if (!match[2]) throw new Error("Only base64-encoded data URLs are supported.");
    const dataUrlMime = match[1];
    const buffer = decodeBase64(match[3] ?? "");
    const filename = params.filename;
    const validated = validateImageBuffer(buffer, params.mime_type ?? dataUrlMime, filename);
    return {
      base64: buffer.toString("base64"),
      mimeType: validated.mimeType,
      filename,
      altText: params.alt_text,
      source: "data_url",
      bytes: validated.bytes,
      maxWidthCells,
      maxHeightCells,
    };
  }

  const buffer = decodeBase64(params.base64 ?? "");
  const filename = params.filename;
  const validated = validateImageBuffer(buffer, params.mime_type, filename);
  return {
    base64: buffer.toString("base64"),
    mimeType: validated.mimeType,
    filename,
    altText: params.alt_text,
    source: "base64",
    bytes: validated.bytes,
    maxWidthCells,
    maxHeightCells,
  };
}

function metadata(details: ImageDetails): Omit<ImageDetails, "base64"> {
  const { base64: _base64, ...rest } = details;
  return rest;
}

function labelFor(details: ImageDetails): string {
  const name = details.filename ?? details.path ?? "embedded image";
  const alt = details.altText ? ` — ${details.altText}` : "";
  return `Image: ${name} (${details.mimeType}, ${details.bytes} bytes)${alt}`;
}

function sendEmbeddedImage(pi: ExtensionAPI, details: ImageDetails): void {
  pi.sendMessage<ImageDetails>({
    customType: CUSTOM_TYPE,
    content: labelFor(details),
    display: true,
    details,
  });
}

function splitShellArgs(input: string): string[] {
  const args: string[] = [];
  let current = "";
  let quote: "'" | '"' | undefined;
  let escaping = false;

  for (const char of input) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === "\\" && quote !== "'") {
      escaping = true;
      continue;
    }
    if ((char === "'" || char === '"') && !quote) {
      quote = char;
      continue;
    }
    if (char === quote) {
      quote = undefined;
      continue;
    }
    if (/\s/.test(char) && !quote) {
      if (current) {
        args.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }

  if (escaping) current += "\\";
  if (quote) throw new Error("Unterminated quoted argument.");
  if (current) args.push(current);
  return args;
}

function parseImageCommand(args: string): ShowImageParams {
  const parts = splitShellArgs(args);
  if (parts.length === 0) throw new Error("Usage: /image <path> [--max-width N] [--max-height N] [--alt TEXT]");

  const params: ShowImageParams = { path: undefined };
  const pathParts: string[] = [];

  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (part === "--max-width") {
      const rawValue = parts[++i] ?? "";
      if (!/^\d+$/.test(rawValue)) throw new Error("--max-width requires a positive integer.");
      const value = Number.parseInt(rawValue, 10);
      if (!Number.isSafeInteger(value) || value <= 0) throw new Error("--max-width requires a positive integer.");
      params.max_width_cells = value;
    } else if (part === "--max-height") {
      const rawValue = parts[++i] ?? "";
      if (!/^\d+$/.test(rawValue)) throw new Error("--max-height requires a positive integer.");
      const value = Number.parseInt(rawValue, 10);
      if (!Number.isSafeInteger(value) || value <= 0) throw new Error("--max-height requires a positive integer.");
      params.max_height_cells = value;
    } else if (part === "--alt") {
      const value = parts[++i];
      if (!value) throw new Error("--alt requires text.");
      params.alt_text = value;
    } else if (part.startsWith("--")) {
      throw new Error(`Unknown option ${part}. Usage: /image <path> [--max-width N] [--max-height N] [--alt TEXT]`);
    } else {
      pathParts.push(part);
    }
  }

  if (pathParts.length !== 1) throw new Error("Usage: /image <path> [--max-width N] [--max-height N] [--alt TEXT]");
  params.path = pathParts[0];
  return params;
}

function createShowImageTool(pi: ExtensionAPI) {
  return defineTool({
    name: "show_image",
    label: "Show Image",
    description:
      "Embed and display a PNG, JPEG, GIF, or WebP image in the Pi TUI from exactly one of path, base64, or data_url. Raw image data is capped at 10 MiB; base64 is stored in session custom-message details so the image can rerender after reload.",
    promptSnippet: "Display local or base64 image data inline in the Pi TUI.",
    promptGuidelines: [
      "Use show_image when the user asks to view, display, or embed an image in the Pi terminal UI.",
      "Provide exactly one of path, base64, or data_url. Prefer path for local files to avoid bloating the prompt/tool call.",
    ],
    parameters: Type.Object({
      path: Type.Optional(Type.String({ description: "Local image path. Leading @ is ignored; ~ expands; relative paths resolve from the current working directory." })),
      base64: Type.Optional(Type.String({ description: "Base64-encoded PNG, JPEG, GIF, or WebP image bytes." })),
      data_url: Type.Optional(Type.String({ description: "Base64 data URL, e.g. data:image/png;base64,..." })),
      mime_type: Type.Optional(Type.String({ description: "Optional MIME type override/validation: image/png, image/jpeg, image/gif, or image/webp." })),
      filename: Type.Optional(Type.String({ description: "Optional display filename/caption." })),
      alt_text: Type.Optional(Type.String({ description: "Optional alt text or caption for the image." })),
      max_width_cells: Type.Optional(Type.Integer({ description: "Optional maximum render width in terminal cells." })),
      max_height_cells: Type.Optional(Type.Integer({ description: "Optional maximum render height in terminal cells." })),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const details = await loadImage(params, ctx.cwd);
      sendEmbeddedImage(pi, details);
      return {
        content: [{ type: "text", text: `Displayed ${details.filename ?? details.mimeType} (${details.bytes} bytes).` }],
        details: metadata(details),
      };
    },
  });
}

export default function (pi: ExtensionAPI) {
  pi.registerMessageRenderer<ImageDetails>(CUSTOM_TYPE, (message, _options, theme) => {
    const details = message.details;
    if (!details?.base64 || !details.mimeType) return new Text(typeof message.content === "string" ? message.content : "Image unavailable");

    const container = new Container();
    container.addChild(new Text(theme.fg("customMessageLabel", labelFor(details))));
    container.addChild(
      new Image(
        details.base64,
        details.mimeType,
        { fallbackColor: (str) => theme.fg("dim", str) },
        {
          maxWidthCells: details.maxWidthCells,
          maxHeightCells: details.maxHeightCells,
          filename: details.filename,
        },
      ),
    );
    return container;
  });

  pi.registerTool(createShowImageTool(pi));

  pi.registerCommand("image", {
    description: "Display an image: /image <path> [--max-width N] [--max-height N] [--alt TEXT]",
    handler: async (args, ctx) => {
      try {
        const details = await loadImage(parseImageCommand(args), ctx.cwd);
        sendEmbeddedImage(pi, details);
        ctx.ui.notify(`Displayed ${details.filename ?? details.path ?? "image"}.`, "info");
      } catch (err) {
        ctx.ui.notify(err instanceof Error ? err.message : String(err), "error");
      }
    },
  });
}
