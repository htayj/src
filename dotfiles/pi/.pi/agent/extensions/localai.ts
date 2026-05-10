import { mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, resolve } from "node:path";
import { homedir } from "node:os";
import { Type } from "typebox";
import { defineTool, withFileMutationQueue, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

const DEFAULT_BASE_URL = "http://127.0.0.1:8080";
const DEFAULT_MODEL = "kokoro";
const DEFAULT_OUTPUT_DIR = "~/localai-tts-output";
const TTS_MODELS = [
  "kokoro",
  "qwen3-tts-cpp",
  "fish-speech-s2-pro",
  "neutts-air",
  "vibevoice",
] as const;
const RESPONSE_FORMATS = ["wav", "mp3", "aac", "flac", "opus"] as const;

function baseUrl(): string {
  return (process.env.LOCALAI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function expandHome(path: string): string {
  return path === "~" ? homedir() : path.startsWith("~/") ? resolve(homedir(), path.slice(2)) : path;
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sanitizeFilenamePart(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "speech";
}

function resolveOutputPath(path: string | undefined, model: string, format: string, cwd: string): string {
  const ext = `.${format}`;
  if (!path || path.trim() === "") {
    return resolve(expandHome(DEFAULT_OUTPUT_DIR), `${timestamp()}-${sanitizeFilenamePart(model)}${ext}`);
  }

  const expanded = expandHome(path.trim());
  const absolute = isAbsolute(expanded) ? expanded : resolve(cwd, expanded);
  if (extname(absolute) === "") return `${absolute}${ext}`;
  return absolute;
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<any> {
  const res = await fetch(url, { signal });
  const text = await res.text();
  if (!res.ok) throw new Error(`LocalAI ${res.status} ${res.statusText}: ${text.slice(0, 1000)}`);
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`LocalAI returned non-JSON from ${url}: ${text.slice(0, 1000)}`);
  }
}

const localAiTtsModelsTool = defineTool({
  name: "localai_tts_models",
  label: "LocalAI TTS Models",
  description: "List LocalAI text-to-speech models available from the local LocalAI API.",
  promptSnippet: "List locally available LocalAI text-to-speech models.",
  promptGuidelines: [
    "Use localai_tts_models before localai_tts when you need to discover which local TTS models are available.",
  ],
  parameters: Type.Object({}),

  async execute(_toolCallId, _params, signal) {
    const url = `${baseUrl()}/api/models/config-metadata/autocomplete/models:tts`;
    const data = await fetchJson(url, signal);
    const models = Array.isArray(data?.values) ? data.values.filter((value: unknown) => typeof value === "string") : [];
    return {
      content: [{ type: "text", text: models.length ? models.join("\n") : "No LocalAI TTS models reported." }],
      details: { baseUrl: baseUrl(), models },
    };
  },
});

const localAiTtsTool = defineTool({
  name: "localai_tts",
  label: "LocalAI TTS",
  description: "Generate a speech audio file using the local LocalAI text-to-speech API. Writes the audio to disk and returns the file path.",
  promptSnippet: "Generate speech audio files with local LocalAI TTS models.",
  promptGuidelines: [
    "Use localai_tts when the user asks to generate or synthesize speech/audio from text using LocalAI.",
    "localai_tts writes audio files to disk; tell the user the saved path and model used.",
  ],
  parameters: Type.Object({
    input: Type.String({ description: "Text to synthesize." }),
    model: Type.Optional(Type.String({ enum: TTS_MODELS, description: "LocalAI TTS model to use. Defaults to kokoro." })),
    output_path: Type.Optional(Type.String({ description: `Output path. Relative paths resolve from the current working directory. Defaults under ${DEFAULT_OUTPUT_DIR}.` })),
    response_format: Type.Optional(Type.String({ enum: RESPONSE_FORMATS, description: "Output audio format. Defaults to wav." })),
    voice: Type.Optional(Type.String({ description: "Optional voice/speaker override supported by some LocalAI TTS models." })),
    language: Type.Optional(Type.String({ description: "Optional language code supported by some TTS models." })),
    sample_rate: Type.Optional(Type.Integer({ description: "Optional desired output sample rate." })),
  }),

  async execute(_toolCallId, params, signal, onUpdate, ctx) {
    const model = params.model ?? DEFAULT_MODEL;
    const format = params.response_format ?? "wav";
    const outputPath = resolveOutputPath(params.output_path, model, format, ctx.cwd);

    onUpdate?.({ content: [{ type: "text", text: `Generating ${format.toUpperCase()} with LocalAI model ${model}...` }] });

    const body: Record<string, unknown> = {
      model,
      input: params.input,
      response_format: format,
    };
    if (params.voice) body.voice = params.voice;
    if (params.language) body.language = params.language;
    if (params.sample_rate) body.sample_rate = params.sample_rate;

    const started = Date.now();
    const res = await fetch(`${baseUrl()}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });

    const contentType = res.headers.get("content-type") ?? "";
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const elapsedMs = Date.now() - started;

    if (!res.ok) {
      const text = buffer.toString("utf8").slice(0, 2000);
      throw new Error(`LocalAI TTS failed (${res.status} ${res.statusText}): ${text}`);
    }

    if (contentType.includes("application/json")) {
      const text = buffer.toString("utf8").slice(0, 2000);
      throw new Error(`LocalAI TTS returned JSON instead of audio: ${text}`);
    }

    await withFileMutationQueue(outputPath, async () => {
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, buffer);
    });

    const summary = `Generated ${format.toUpperCase()} speech with LocalAI model ${model}: ${outputPath} (${buffer.length} bytes, ${(elapsedMs / 1000).toFixed(1)}s)`;
    return {
      content: [{ type: "text", text: summary }],
      details: {
        baseUrl: baseUrl(),
        model,
        outputPath,
        bytes: buffer.length,
        elapsedMs,
        contentType,
        responseFormat: format,
      },
    };
  },
});

export default function (pi: ExtensionAPI) {
  pi.registerTool(localAiTtsModelsTool);
  pi.registerTool(localAiTtsTool);
}
