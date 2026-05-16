import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const Type = {
  Object: (properties: Record<string, unknown>) => ({ type: "object", properties }),
  Optional: (schema: unknown) => schema,
  String: (options: Record<string, unknown> = {}) => ({ type: "string", ...options }),
  Number: (options: Record<string, unknown> = {}) => ({ type: "number", ...options }),
  Boolean: (options: Record<string, unknown> = {}) => ({ type: "boolean", ...options }),
  Literal: (value: string | number | boolean) => ({ const: value }),
  Union: (anyOf: unknown[]) => ({ anyOf }),
  Array: (items: unknown) => ({ type: "array", items }),
};
import * as fs from "node:fs";
import * as path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const OPENROUTER_URL = "https://openrouter.ai/api/v1";
const OPENAI_URL = "https://api.openai.com/v1";
const DEFAULT_OUTPUT_DIR = path.join(process.env.HOME || ".", "Pictures", "pi-images");
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

const text = (s: string, details: Record<string, unknown> = {}) => ({ content: [{ type: "text" as const, text: s }], details });

const MODEL_GUIDE = {
  defaults: {
    best_generation: "Use the newest available GPT-image model for normal prompt-to-image/editing work. Prior human feedback in this setup preferred newest GPT-image over the tested alternatives for instruction following and coherent results.",
    local_workflows: "Use ComfyUI for local/private generation, SDXL/Flux workflows, LoRAs, ControlNet, upscaling, inpainting, queue/history control, and reproducible node graphs.",
    analysis: "Use OpenRouter vision models for image understanding, critique, OCR-ish inspection, UI/screenshot review, and prompt iteration. Prefer stronger Gemini/OpenAI vision models for subtle layout or art critique; use cheaper flash/local vision for rough triage.",
  },
  models: [
    {
      name: "OpenAI newest GPT-image (via openai_image_generate)",
      use_when: "Highest quality general image generation/editing, text rendering, following precise natural-language art direction, product/mockup/story images, and final passes.",
      strengths: ["Best observed local feedback", "strong instruction following", "coherent compositions", "good text/design adherence compared with diffusion defaults", "simple prompt-only workflow"],
      weaknesses: ["remote/API-cost path", "less workflow-level control than ComfyUI", "not ideal for exact seed reproducibility", "requires OPENAI_API_KEY/PI_OPENAI_API_KEY"],
    },
    {
      name: "ComfyUI Flux/SDXL/checkpoint workflows",
      use_when: "Local/private generation, custom checkpoints, LoRAs/styles/characters, ControlNet, image-to-image/inpaint/upscale, batching, reproducibility, or experimentation with node graphs.",
      strengths: ["local control", "reusable workflows", "custom model ecosystem", "seed/sampler/LoRA/control precision", "no remote image upload when local"],
      weaknesses: ["quality depends heavily on installed models/workflows", "prompt adherence can lag GPT-image", "more parameters to tune", "server/model setup required"],
    },
    {
      name: "OpenRouter Gemini/OpenAI vision-class models (via openrouter_image_analyze)",
      use_when: "Analyze screenshots/generated images, compare variants, diagnose artifacts, extract visual details, write revision prompts, and review UI/accessibility.",
      strengths: ["strong multimodal reasoning", "good critique and comparison", "can use public image URLs or local images encoded as data URLs", "model choice is swappable"],
      weaknesses: ["analysis only unless a selected OpenRouter model explicitly supports image output", "remote upload path", "OCR and tiny text may need crops/high resolution"],
    },
    {
      name: "Local LM Studio vision models (for Pi normal model selection, not this tool)",
      use_when: "Fast private rough image description or first-pass screenshot triage when a local vision model is loaded.",
      strengths: ["private/local", "low marginal cost", "good for coarse descriptions"],
      weaknesses: ["weaker detail/reasoning than top hosted models", "depends on loaded model/server", "not an image generator"],
    },
  ],
  workflow: [
    "For final-quality generation: draft prompt -> openai_image_generate with newest GPT-image -> show_image or /image -> openrouter_image_analyze for critique -> revise prompt/edit.",
    "For local/control-heavy generation: comfyui_status -> comfyui_models/object_info -> comfyui_workflow/queue_workflow -> comfyui_image -> show_image -> openrouter_image_analyze.",
    "For variants: save every output path, keep the exact prompt/model/seed/workflow in notes or file metadata, and compare with openrouter_image_analyze.",
  ],
};

function apiKey(kind: "openrouter" | "openai") {
  return kind === "openrouter"
    ? process.env.OPENROUTER_API_KEY || process.env.PI_OPENROUTER_API_KEY
    : process.env.OPENAI_API_KEY || process.env.PI_OPENAI_API_KEY;
}

function summarize(value: unknown, max = 50000) {
  const json = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return json.length > max ? `${json.slice(0, max)}\n... truncated ${json.length - max} chars` : json;
}

function expandHome(p: string) {
  return p === "~" ? process.env.HOME || p : p.startsWith("~/") ? path.join(process.env.HOME || ".", p.slice(2)) : p;
}

function safeName(raw: string | undefined, fallback: string) {
  const base = path.basename(String(raw || fallback)).replace(/[\x00-\x1f<>:"|?*]/g, "_");
  if (!base || base === "." || base === "..") throw new Error(`Unsafe filename: ${raw}`);
  return base;
}

function mimeFromPath(file: string) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  throw new Error(`Unsupported image extension ${ext}; use png/jpg/webp/gif.`);
}

async function pathToDataUrl(file: string, cwd: string) {
  const full = path.resolve(cwd, expandHome(file));
  const stat = await fs.promises.stat(full);
  if (stat.size > MAX_IMAGE_BYTES) throw new Error(`Image is ${stat.size} bytes; max is ${MAX_IMAGE_BYTES}.`);
  const data = await fs.promises.readFile(full);
  return { dataUrl: `data:${mimeFromPath(full)};base64,${data.toString("base64")}`, full, bytes: stat.size };
}

async function fetchJson(url: string, init: RequestInit, signal?: AbortSignal) {
  const res = await fetch(url, { ...init, signal });
  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) throw new Error(`${init.method || "GET"} ${url} failed ${res.status}: ${summarize(body, 4000)}`);
  return body;
}

async function writeBase64Image(base64: string, outputDir: string, filename: string) {
  const outDir = path.resolve(expandHome(outputDir));
  const out = path.join(outDir, safeName(filename, `image-${Date.now()}.png`));
  await fs.promises.mkdir(outDir, { recursive: true });
  await fs.promises.writeFile(out, Buffer.from(base64, "base64"));
  return out;
}

async function downloadImage(url: string, outputDir: string, filename: string, signal?: AbortSignal) {
  const outDir = path.resolve(expandHome(outputDir));
  const out = path.join(outDir, safeName(filename, `image-${Date.now()}.png`));
  await fs.promises.mkdir(outDir, { recursive: true });
  const res = await fetch(url, { signal });
  if (!res.ok || !res.body) throw new Error(`Image download failed ${res.status}: ${await res.text()}`);
  await pipeline(Readable.fromWeb(res.body as any), fs.createWriteStream(out));
  return out;
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "image_model_guide",
    label: "Image Model Guide",
    description: "Return the local image generation/analysis model guide: when to use GPT-image, ComfyUI, OpenRouter vision models, and local vision models, including strengths and weaknesses.",
    promptSnippet: "Choose image-generation and image-analysis models for the local Pi image toolkit.",
    promptGuidelines: ["Use image_model_guide before selecting an image generation or analysis path; default final image generation to the newest GPT-image model when available, because prior human feedback preferred it."],
    parameters: Type.Object({ format: Type.Optional(Type.Union([Type.Literal("summary"), Type.Literal("json")])) }),
    async execute(_id, params: any) {
      if (params.format === "json") return text(summarize(MODEL_GUIDE), MODEL_GUIDE);
      const lines = [
        "Image toolkit model guide:",
        `- Best default generation: ${MODEL_GUIDE.defaults.best_generation}`,
        `- Local/control-heavy workflows: ${MODEL_GUIDE.defaults.local_workflows}`,
        `- Analysis/critique: ${MODEL_GUIDE.defaults.analysis}`,
        "",
        ...MODEL_GUIDE.models.map((m) => `- ${m.name}\n  Use when: ${m.use_when}\n  Strengths: ${m.strengths.join("; ")}\n  Weaknesses: ${m.weaknesses.join("; ")}`),
        "",
        "Recommended workflow:",
        ...MODEL_GUIDE.workflow.map((w) => `- ${w}`),
      ];
      return text(lines.join("\n"), MODEL_GUIDE);
    },
  });

  pi.registerTool({
    name: "openrouter_image_analyze",
    label: "OpenRouter Image Analyze",
    description: "Analyze, critique, compare, or describe local images or image URLs with an OpenRouter vision model.",
    promptSnippet: "Use OpenRouter vision models to inspect generated images, screenshots, UI, art direction, OCR-ish details, and revision opportunities.",
    promptGuidelines: ["Use openrouter_image_analyze after generating or viewing images to capture objective critique and next-prompt revisions; never include API keys in prompts or files."],
    parameters: Type.Object({
      prompt: Type.String(),
      model: Type.Optional(Type.String({ description: "OpenRouter model id. Defaults to PI_OPENROUTER_VISION_MODEL or google/gemini-2.5-pro." })),
      paths: Type.Optional(Type.Array(Type.String())),
      urls: Type.Optional(Type.Array(Type.String())),
      max_tokens: Type.Optional(Type.Number()),
      temperature: Type.Optional(Type.Number()),
      max_chars: Type.Optional(Type.Number()),
    }),
    async execute(_id, params: any, signal, _onUpdate, ctx) {
      const key = apiKey("openrouter");
      if (!key) throw new Error("OPENROUTER_API_KEY or PI_OPENROUTER_API_KEY is required.");
      const content: any[] = [{ type: "text", text: params.prompt }];
      const localImages = [];
      for (const p of params.paths || []) {
        const converted = await pathToDataUrl(p, ctx.cwd);
        localImages.push({ path: converted.full, bytes: converted.bytes });
        content.push({ type: "image_url", image_url: { url: converted.dataUrl } });
      }
      for (const url of params.urls || []) content.push({ type: "image_url", image_url: { url } });
      if (content.length === 1) throw new Error("Provide at least one local path or image URL to analyze.");
      const body = {
        model: params.model || process.env.PI_OPENROUTER_VISION_MODEL || "google/gemini-2.5-pro",
        messages: [{ role: "user", content }],
        max_tokens: params.max_tokens ?? 2048,
        temperature: params.temperature ?? 0.2,
      };
      const result: any = await fetchJson(`${OPENROUTER_URL}/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json", "http-referer": "https://pi.local", "x-title": "Pi Image Toolkit" },
        body: JSON.stringify(body),
      }, signal);
      const answer = result.choices?.[0]?.message?.content ?? summarize(result, params.max_chars ?? 20000);
      return text(String(answer), { model: body.model, localImages, usage: result.usage, id: result.id });
    },
  });

  pi.registerTool({
    name: "openrouter_image_models",
    label: "OpenRouter Image Models",
    description: "List OpenRouter models and optionally filter for vision/image-capable models by id, name, or modality metadata.",
    parameters: Type.Object({ query: Type.Optional(Type.String()), image_only: Type.Optional(Type.Boolean()), max_chars: Type.Optional(Type.Number()) }),
    async execute(_id, params: any, signal) {
      const key = apiKey("openrouter");
      const headers: Record<string, string> = key ? { authorization: `Bearer ${key}` } : {};
      const result: any = await fetchJson(`${OPENROUTER_URL}/models`, { headers }, signal);
      let data = result.data || result;
      if (params.image_only) {
        data = data.filter((m: any) => summarize(m).toLowerCase().includes("image"));
      }
      if (params.query) {
        const q = String(params.query).toLowerCase();
        data = data.filter((m: any) => `${m.id || ""} ${m.name || ""} ${summarize(m)}`.toLowerCase().includes(q));
      }
      return text(summarize(data, params.max_chars ?? 50000), { data });
    },
  });

  pi.registerTool({
    name: "openai_image_generate",
    label: "OpenAI GPT Image Generate/Edit",
    description: "Generate or edit images using OpenAI's GPT-image image API. Defaults to PI_OPENAI_IMAGE_MODEL or gpt-image-1; set the env var to the newest available GPT-image model.",
    promptSnippet: "Generate final-quality images with GPT-image and save outputs to local files.",
    promptGuidelines: ["Use openai_image_generate for best-quality final image generation/editing; prior human feedback preferred the newest GPT-image model. Save paths can be displayed with show_image or /image."],
    parameters: Type.Object({
      prompt: Type.String(),
      model: Type.Optional(Type.String()),
      size: Type.Optional(Type.String({ description: "Examples: 1024x1024, 1536x1024, 1024x1536, auto" })),
      quality: Type.Optional(Type.String({ description: "auto, low, medium, high, or model-supported value" })),
      background: Type.Optional(Type.String({ description: "auto, transparent, opaque if supported" })),
      output_format: Type.Optional(Type.String({ description: "png, jpeg, webp if supported" })),
      n: Type.Optional(Type.Number()),
      image_path: Type.Optional(Type.String({ description: "Optional source image for edit mode." })),
      mask_path: Type.Optional(Type.String({ description: "Optional mask image for edit mode." })),
      output_dir: Type.Optional(Type.String()),
      filename_prefix: Type.Optional(Type.String()),
      show_hint: Type.Optional(Type.Boolean()),
    }),
    async execute(_id, params: any, signal, onUpdate, ctx) {
      const key = apiKey("openai");
      if (!key) throw new Error("OPENAI_API_KEY or PI_OPENAI_API_KEY is required.");
      const model = params.model || process.env.PI_OPENAI_IMAGE_MODEL || "gpt-image-1";
      const n = Math.max(1, Math.min(Number(params.n || 1), 4));
      const outputDir = params.output_dir || DEFAULT_OUTPUT_DIR;
      const prefix = safeName(params.filename_prefix || `gpt-image-${Date.now()}`, "gpt-image").replace(/\.[^.]+$/, "");
      const common: Record<string, string> = { model, prompt: params.prompt };
      if (params.size) common.size = params.size;
      if (params.quality) common.quality = params.quality;
      if (params.background) common.background = params.background;
      if (params.output_format) common.output_format = params.output_format;
      let result: any;
      if (params.image_path) {
        const form = new FormData();
        for (const [k, v] of Object.entries(common)) form.set(k, v);
        form.set("n", String(n));
        const source = path.resolve(ctx.cwd, expandHome(params.image_path));
        form.set("image", new Blob([await fs.promises.readFile(source)]), path.basename(source));
        if (params.mask_path) {
          const mask = path.resolve(ctx.cwd, expandHome(params.mask_path));
          form.set("mask", new Blob([await fs.promises.readFile(mask)]), path.basename(mask));
        }
        onUpdate?.({ content: [{ type: "text", text: `Editing image with ${model}...` }], details: {} });
        result = await fetchJson(`${OPENAI_URL}/images/edits`, { method: "POST", headers: { authorization: `Bearer ${key}` }, body: form }, signal);
      } else {
        onUpdate?.({ content: [{ type: "text", text: `Generating image with ${model}...` }], details: {} });
        result = await fetchJson(`${OPENAI_URL}/images/generations`, {
          method: "POST",
          headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
          body: JSON.stringify({ ...common, n }),
        }, signal);
      }
      const files: string[] = [];
      const ext = (params.output_format || "png").replace(/[^a-z0-9]/gi, "") || "png";
      let i = 0;
      for (const item of result.data || []) {
        i += 1;
        if (item.b64_json) files.push(await writeBase64Image(item.b64_json, outputDir, `${prefix}-${i}.${ext}`));
        else if (item.url) files.push(await downloadImage(item.url, outputDir, `${prefix}-${i}.${ext}`, signal));
      }
      if (files.length === 0) throw new Error(`Image API returned no b64_json/url data: ${summarize(result, 4000)}`);
      const hint = params.show_hint === false ? "" : "\nDisplay with show_image or /image, e.g. /image " + files[0];
      return text(`Saved ${files.length} image(s):\n${files.join("\n")}${hint}`, { model, files, revised_prompts: (result.data || []).map((d: any) => d.revised_prompt).filter(Boolean), usage: result.usage });
    },
  });

  pi.registerTool({
    name: "openai_image_models",
    label: "OpenAI Image Models",
    description: "List OpenAI models filtered for gpt-image/dall-e/image names so the assistant can choose the newest available GPT-image model.",
    parameters: Type.Object({ max_chars: Type.Optional(Type.Number()) }),
    async execute(_id, params: any, signal) {
      const key = apiKey("openai");
      if (!key) throw new Error("OPENAI_API_KEY or PI_OPENAI_API_KEY is required.");
      const result: any = await fetchJson(`${OPENAI_URL}/models`, { headers: { authorization: `Bearer ${key}` } }, signal);
      const data = (result.data || []).filter((m: any) => /gpt-image|dall-e|image/i.test(m.id || ""));
      return text(summarize(data, params.max_chars ?? 30000), { data });
    },
  });
}
