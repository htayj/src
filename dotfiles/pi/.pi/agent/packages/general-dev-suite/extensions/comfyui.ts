import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const Type = {
  Object: (properties: Record<string, unknown>) => ({ type: "object", properties }),
  Optional: (schema: unknown) => schema,
  String: (options: Record<string, unknown> = {}) => ({ type: "string", ...options }),
  Number: (options: Record<string, unknown> = {}) => ({ type: "number", ...options }),
  Boolean: (options: Record<string, unknown> = {}) => ({ type: "boolean", ...options }),
  Any: () => ({}),
  Literal: (value: string | number | boolean) => ({ const: value }),
  Union: (anyOf: unknown[]) => ({ anyOf }),
  Array: (items: unknown) => ({ type: "array", items }),
  Record: (_key: unknown, value: unknown) => ({ type: "object", additionalProperties: value }),
};
import * as fs from "node:fs";
import * as path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const DEFAULT_COMFY_URL = "http://127.0.0.1:8188";
const DEFAULT_WORKFLOW_DIR = path.join(process.env.HOME || ".", ".pi", "comfyui", "workflows");
const DEFAULT_DOWNLOAD_DIR = path.join(process.env.HOME || ".", "Downloads", "civitai");

const text = (s: string, details: Record<string, unknown> = {}) => ({ content: [{ type: "text" as const, text: s }], details });

function comfyBase() {
  return (process.env.PI_COMFYUI_URL || process.env.COMFYUI_URL || DEFAULT_COMFY_URL).replace(/\/$/, "");
}

function comfyRoot() {
  return process.env.PI_COMFYUI_ROOT || process.env.COMFYUI_ROOT || path.join(process.env.HOME || ".", "src", "ComfyUI");
}

function workflowRoot() {
  return path.resolve(process.env.PI_COMFYUI_WORKFLOW_DIR || DEFAULT_WORKFLOW_DIR);
}

function safeJoin(root: string, rel: string) {
  const full = path.resolve(root, rel || ".");
  if (full !== root && !full.startsWith(root + path.sep)) throw new Error(`Path escapes root: ${rel}`);
  return full;
}

function safeFileName(name: string | undefined, fallback: string) {
  const raw = String(name || fallback).trim() || fallback;
  const base = path.basename(raw).replace(/[\x00-\x1f<>:"|?*]/g, "_");
  if (!base || base === "." || base === "..") throw new Error(`Unsafe filename: ${raw}`);
  return base;
}

function safeOutputFile(root: string, name: string) {
  return safeJoin(path.resolve(root), safeFileName(name, "download.bin"));
}

function redactUrl(raw: string) {
  try {
    const url = new URL(raw);
    for (const key of ["token", "api_key", "apikey", "access_token", "auth", "authorization"]) {
      if (url.searchParams.has(key)) url.searchParams.set(key, "REDACTED");
    }
    return url.toString();
  } catch {
    return raw.replace(/([?&](?:token|api_key|apikey|access_token|auth|authorization)=)[^&\s]+/gi, "$1REDACTED");
  }
}

function assertCivitaiUrl(raw: string) {
  const url = new URL(raw);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || (host !== "civitai.com" && !host.endsWith(".civitai.com"))) {
    throw new Error(`Direct Civitai downloads must use an https://*.civitai.com URL, got ${redactUrl(raw)}`);
  }
  return url;
}

function isLocalComfyUrl() {
  const host = new URL(comfyBase()).hostname;
  return ["127.0.0.1", "localhost", "::1", "0.0.0.0"].includes(host);
}

function summarize(value: unknown, max = 50000) {
  const json = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return json.length > max ? `${json.slice(0, max)}\n... truncated ${json.length - max} chars` : json;
}

async function readJson(file: string) {
  return JSON.parse(await fs.promises.readFile(file, "utf8"));
}

async function fetchJson(url: string, init: RequestInit = {}, signal?: AbortSignal) {
  const res = await fetch(url, { ...init, signal });
  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) throw new Error(`${init.method || "GET"} ${url} failed ${res.status}: ${summarize(body, 4000)}`);
  return body;
}

function normalizeApiPath(apiPath: string) {
  if (!apiPath.startsWith("/")) apiPath = `/${apiPath}`;
  if (apiPath.includes("..")) throw new Error("apiPath cannot contain '..'");
  return apiPath;
}

function findComfyModelDir(kind: string) {
  const root = comfyRoot();
  const candidates = [
    path.join(root, "models", kind),
    path.join(root, "models", `${kind}s`),
  ];
  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
}

function workflowPath(name: string) {
  const root = workflowRoot();
  const file = name.endsWith(".json") ? name : `${name}.json`;
  return safeJoin(root, file);
}

function buildTxt2Img(params: any) {
  const width = params.width ?? 512;
  const height = params.height ?? 512;
  const steps = params.steps ?? 20;
  const cfg = params.cfg ?? 7;
  const sampler = params.sampler ?? "euler";
  const scheduler = params.scheduler ?? "normal";
  const seed = params.seed ?? Math.floor(Math.random() * 1_000_000_000_000_000);
  const batchSize = params.batch_size ?? 1;
  const checkpoint = params.checkpoint || params.ckpt_name || "model.safetensors";
  const positive = params.positive || params.prompt || "a beautiful image";
  const negative = params.negative || "";
  const filenamePrefix = params.filename_prefix || "pi_comfyui";

  return {
    "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: checkpoint } },
    "2": { class_type: "CLIPTextEncode", inputs: { text: positive, clip: ["1", 1] } },
    "3": { class_type: "CLIPTextEncode", inputs: { text: negative, clip: ["1", 1] } },
    "4": { class_type: "EmptyLatentImage", inputs: { width, height, batch_size: batchSize } },
    "5": { class_type: "KSampler", inputs: { seed, steps, cfg, sampler_name: sampler, scheduler, denoise: 1, model: ["1", 0], positive: ["2", 0], negative: ["3", 0], latent_image: ["4", 0] } },
    "6": { class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["1", 2] } },
    "7": { class_type: "SaveImage", inputs: { filename_prefix: filenamePrefix, images: ["6", 0] } },
  };
}

function buildUpscale(params: any) {
  const image = params.image || "input.png";
  const upscaleModel = params.upscale_model || params.model_name || "model.pth";
  const filenamePrefix = params.filename_prefix || "pi_upscale";
  return {
    "1": { class_type: "LoadImage", inputs: { image } },
    "2": { class_type: "UpscaleModelLoader", inputs: { model_name: upscaleModel } },
    "3": { class_type: "ImageUpscaleWithModel", inputs: { upscale_model: ["2", 0], image: ["1", 0] } },
    "4": { class_type: "SaveImage", inputs: { filename_prefix: filenamePrefix, images: ["3", 0] } },
  };
}

async function queuePrompt(prompt: any, params: any, signal?: AbortSignal) {
  const payload: any = { prompt };
  if (params.client_id) payload.client_id = params.client_id;
  if (params.extra_data) payload.extra_data = params.extra_data;
  return fetchJson(`${comfyBase()}/prompt`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }, signal);
}

async function pollHistory(promptId: string, timeoutMs: number, intervalMs: number, signal?: AbortSignal) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const history = await fetchJson(`${comfyBase()}/history/${encodeURIComponent(promptId)}`, {}, signal);
    if (history && Object.keys(history).length > 0) return history;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, intervalMs);
      signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("aborted")); }, { once: true });
    });
  }
  throw new Error(`Timed out waiting for ComfyUI prompt ${promptId}`);
}

function collectImages(history: any) {
  const images: any[] = [];
  for (const prompt of Object.values<any>(history || {})) {
    for (const node of Object.values<any>(prompt.outputs || {})) {
      for (const image of node.images || []) images.push(image);
      for (const anim of node.animated || []) images.push(anim);
    }
  }
  return images;
}

function civitaiHeaders() {
  const headers: Record<string, string> = { accept: "application/json" };
  if (process.env.CIVITAI_API_TOKEN) headers.authorization = `Bearer ${process.env.CIVITAI_API_TOKEN}`;
  return headers;
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "comfyui_status",
    label: "ComfyUI Status",
    description: "Check local ComfyUI status, queue, features, extensions, models, and workflow storage paths.",
    promptSnippet: "Inspect the local ComfyUI server status and capabilities.",
    promptGuidelines: ["Use comfyui_status before assuming a ComfyUI server, model, extension, queue, or feature is available."],
    parameters: Type.Object({ include_models: Type.Optional(Type.Boolean()), include_object_info: Type.Optional(Type.Boolean()) }),
    async execute(_id, params: any, signal) {
      const details: any = { baseUrl: comfyBase(), comfyRoot: comfyRoot(), workflowRoot: workflowRoot() };
      for (const [key, apiPath] of Object.entries({ system: "/system_stats", queue: "/queue", features: "/features", extensions: "/extensions", embeddings: "/embeddings" })) {
        try { details[key] = await fetchJson(`${comfyBase()}${apiPath}`, {}, signal); } catch (error: any) { details[key] = { error: error.message }; }
      }
      if (params.include_models) details.models = await fetchJson(`${comfyBase()}/models`, {}, signal);
      if (params.include_object_info) details.objectInfo = await fetchJson(`${comfyBase()}/object_info`, {}, signal);
      return text(summarize(details, 30000), details);
    },
  });

  pi.registerTool({
    name: "comfyui_api",
    label: "ComfyUI API",
    description: "Call arbitrary ComfyUI HTTP API endpoints for full ComfyUI capability coverage (status, models, object_info, queue, history, settings, users, jobs, custom nodes, userdata, etc.).",
    promptSnippet: "Call a ComfyUI API endpoint directly when no specialized ComfyUI tool covers it.",
    promptGuidelines: ["Use comfyui_api for ComfyUI capabilities beyond image generation, including queue control, metadata, settings, jobs, userdata, custom-node endpoints, and extension-specific APIs."],
    parameters: Type.Object({
      method: Type.Optional(Type.Union([Type.Literal("GET"), Type.Literal("POST"), Type.Literal("DELETE")])),
      path: Type.String({ description: "ComfyUI API path such as /object_info/KSampler, /queue, /history, /models/checkpoints, /settings" }),
      query: Type.Optional(Type.Record(Type.String(), Type.Any())),
      body: Type.Optional(Type.Any()),
      max_chars: Type.Optional(Type.Number()),
    }),
    async execute(_id, params: any, signal) {
      const method = params.method || (params.body === undefined ? "GET" : "POST");
      const url = new URL(`${comfyBase()}${normalizeApiPath(params.path)}`);
      for (const [k, v] of Object.entries(params.query || {})) if (v !== undefined) url.searchParams.set(k, String(v));
      const init: RequestInit = { method };
      if (params.body !== undefined) Object.assign(init, { headers: { "content-type": "application/json" }, body: JSON.stringify(params.body) });
      const body = await fetchJson(url.toString(), init, signal);
      return text(summarize(body, params.max_chars ?? 50000), { method, url: url.toString(), body });
    },
  });

  pi.registerTool({
    name: "comfyui_object_info",
    label: "ComfyUI Object Info",
    description: "Inspect ComfyUI node classes and schemas from /object_info or /object_info/{node_class}.",
    parameters: Type.Object({ node_class: Type.Optional(Type.String()), search: Type.Optional(Type.String()), max_chars: Type.Optional(Type.Number()) }),
    async execute(_id, params: any, signal) {
      const data = await fetchJson(`${comfyBase()}/object_info${params.node_class ? `/${encodeURIComponent(params.node_class)}` : ""}`, {}, signal);
      let result: any = data;
      if (params.search && !params.node_class) {
        const q = String(params.search).toLowerCase();
        result = Object.fromEntries(Object.entries<any>(data).filter(([name, info]) => name.toLowerCase().includes(q) || JSON.stringify(info).toLowerCase().includes(q)));
      }
      return text(summarize(result, params.max_chars ?? 50000), { result });
    },
  });

  pi.registerTool({
    name: "comfyui_models",
    label: "ComfyUI Models",
    description: "List ComfyUI model folders or files, e.g. checkpoints, loras, vae, controlnet, upscale_models.",
    parameters: Type.Object({ folder: Type.Optional(Type.String()), local_files: Type.Optional(Type.Boolean()) }),
    async execute(_id, params: any, signal) {
      const apiPath = params.folder ? `/models/${encodeURIComponent(params.folder)}` : "/models";
      const result: any = { api: await fetchJson(`${comfyBase()}${apiPath}`, {}, signal) };
      if (params.local_files && params.folder) {
        const dir = findComfyModelDir(params.folder);
        result.localDir = dir;
        try { result.localFiles = await fs.promises.readdir(dir); } catch (error: any) { result.localError = error.message; }
      }
      return text(summarize(result), result);
    },
  });

  pi.registerTool({
    name: "comfyui_workflow",
    label: "ComfyUI Workflow Files",
    description: "List, read, save, delete, or build ComfyUI API workflow JSON files. Supports arbitrary workflows plus starter txt2img/upscale templates.",
    promptSnippet: "Manage local ComfyUI API-format workflow JSON files.",
    promptGuidelines: ["Use comfyui_workflow to make or modify reusable ComfyUI workflows; use arbitrary JSON for workflows beyond built-in templates."],
    parameters: Type.Object({
      action: Type.Union([Type.Literal("list"), Type.Literal("read"), Type.Literal("save"), Type.Literal("delete"), Type.Literal("build")]),
      name: Type.Optional(Type.String()),
      workflow: Type.Optional(Type.Any()),
      template: Type.Optional(Type.Union([Type.Literal("txt2img"), Type.Literal("upscale")])),
      params: Type.Optional(Type.Any()),
      overwrite: Type.Optional(Type.Boolean()),
    }),
    async execute(_id, params: any) {
      const root = workflowRoot();
      await fs.promises.mkdir(root, { recursive: true });
      if (params.action === "list") {
        const files = (await fs.promises.readdir(root, { withFileTypes: true })).filter((e) => e.isFile() && e.name.endsWith(".json")).map((e) => e.name);
        return text(files.length ? files.join("\n") : `No workflows in ${root}`, { root, files });
      }
      if (!params.name) throw new Error("name is required for this action");
      const file = workflowPath(params.name);
      if (params.action === "read") {
        const workflow = await readJson(file);
        return text(summarize(workflow), { file, workflow });
      }
      if (params.action === "delete") {
        await fs.promises.unlink(file);
        return text(`Deleted ${file}`, { file });
      }
      let workflow = params.workflow;
      if (params.action === "build") {
        if (params.template === "upscale") workflow = buildUpscale(params.params || {});
        else workflow = buildTxt2Img(params.params || {});
      }
      if (!workflow || typeof workflow !== "object") throw new Error("workflow object is required");
      if (!params.overwrite && fs.existsSync(file)) throw new Error(`${file} already exists; pass overwrite:true to replace it`);
      await fs.promises.mkdir(path.dirname(file), { recursive: true });
      await fs.promises.writeFile(file, `${JSON.stringify(workflow, null, 2)}\n`);
      return text(`Saved ${file}`, { file, workflow });
    },
  });

  pi.registerTool({
    name: "comfyui_queue_workflow",
    label: "Queue ComfyUI Workflow",
    description: "Queue an arbitrary ComfyUI API workflow from JSON or a saved workflow file, optionally wait for completion and return output image metadata.",
    promptSnippet: "Queue ComfyUI API-format workflows and optionally wait for results.",
    promptGuidelines: ["Use comfyui_queue_workflow for any ComfyUI execution, not only txt2img; pass arbitrary API-format workflow JSON for video, audio, masks, control, training/helper custom nodes, or custom-node workflows."],
    parameters: Type.Object({
      name: Type.Optional(Type.String()),
      workflow: Type.Optional(Type.Any()),
      client_id: Type.Optional(Type.String()),
      extra_data: Type.Optional(Type.Any()),
      wait: Type.Optional(Type.Boolean()),
      timeout_ms: Type.Optional(Type.Number()),
      poll_ms: Type.Optional(Type.Number()),
    }),
    async execute(_id, params: any, signal) {
      const workflow = params.workflow || (params.name ? await readJson(workflowPath(params.name)) : undefined);
      if (!workflow) throw new Error("Provide workflow JSON or saved workflow name");
      const queued: any = await queuePrompt(workflow, params, signal);
      const details: any = { queued };
      if (params.wait && queued.prompt_id) {
        details.history = await pollHistory(queued.prompt_id, params.timeout_ms ?? 300000, params.poll_ms ?? 1000, signal);
        details.images = collectImages(details.history);
      }
      return text(summarize(details, 50000), details);
    },
  });

  pi.registerTool({
    name: "comfyui_history",
    label: "ComfyUI History",
    description: "Read or clear ComfyUI prompt history.",
    parameters: Type.Object({ prompt_id: Type.Optional(Type.String()), clear: Type.Optional(Type.Boolean()), delete_ids: Type.Optional(Type.Array(Type.String())) }),
    async execute(_id, params: any, signal) {
      if (params.clear || params.delete_ids) {
        const body = params.clear ? { clear: true } : { delete: params.delete_ids };
        const result = await fetchJson(`${comfyBase()}/history`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }, signal);
        return text(summarize(result), { result });
      }
      const result = await fetchJson(`${comfyBase()}/history${params.prompt_id ? `/${encodeURIComponent(params.prompt_id)}` : ""}`, {}, signal);
      return text(summarize(result, 50000), { result });
    },
  });

  pi.registerTool({
    name: "comfyui_image",
    label: "ComfyUI Image",
    description: "Download/view a ComfyUI output/input/temp image to a local file for inspection or reuse.",
    parameters: Type.Object({ filename: Type.String(), subfolder: Type.Optional(Type.String()), type: Type.Optional(Type.Union([Type.Literal("output"), Type.Literal("input"), Type.Literal("temp")])), output_path: Type.Optional(Type.String()) }),
    async execute(_id, params: any, signal) {
      const url = new URL(`${comfyBase()}/view`);
      url.searchParams.set("filename", params.filename);
      if (params.subfolder) url.searchParams.set("subfolder", params.subfolder);
      url.searchParams.set("type", params.type || "output");
      const res = await fetch(url, { signal });
      if (!res.ok || !res.body) throw new Error(`GET ${url} failed ${res.status}: ${await res.text()}`);
      const out = path.resolve(params.output_path || safeOutputFile(path.join(process.env.HOME || ".", "Downloads"), params.filename));
      await fs.promises.mkdir(path.dirname(out), { recursive: true });
      await pipeline(Readable.fromWeb(res.body as any), fs.createWriteStream(out));
      return text(`Saved ${out}`, { url: redactUrl(url.toString()), output_path: out });
    },
  });

  pi.registerTool({
    name: "comfyui_upload_image",
    label: "Upload ComfyUI Image",
    description: "Upload an image or mask into ComfyUI input storage for img2img, inpainting, masking, and other image-based workflows. Refuses remote ComfyUI URLs unless allow_remote:true.",
    parameters: Type.Object({ path: Type.String(), type: Type.Optional(Type.Union([Type.Literal("image"), Type.Literal("mask")])), name: Type.Optional(Type.String()), subfolder: Type.Optional(Type.String()), overwrite: Type.Optional(Type.Boolean()), allow_remote: Type.Optional(Type.Boolean()), max_bytes: Type.Optional(Type.Number()) }),
    async execute(_id, params: any, signal) {
      if (!params.allow_remote && !isLocalComfyUrl()) throw new Error("Refusing to upload a local file to a non-local ComfyUI URL unless allow_remote:true");
      const inputPath = path.resolve(params.path);
      const ext = path.extname(inputPath).toLowerCase();
      if (![".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff"].includes(ext)) throw new Error(`Refusing to upload non-image extension: ${ext || "(none)"}`);
      const stat = await fs.promises.stat(inputPath);
      const maxBytes = params.max_bytes ?? 250 * 1024 * 1024;
      if (stat.size > maxBytes) throw new Error(`Refusing to upload ${stat.size} bytes; max_bytes is ${maxBytes}`);
      const form = new FormData();
      const data = await fs.promises.readFile(inputPath);
      form.set("image", new Blob([data]), safeFileName(params.name, path.basename(inputPath)));
      if (params.subfolder) form.set("subfolder", params.subfolder);
      if (params.overwrite !== undefined) form.set("overwrite", String(params.overwrite));
      const result = await fetchJson(`${comfyBase()}/upload/${params.type || "image"}`, { method: "POST", body: form }, signal);
      return text(summarize(result), { result });
    },
  });

  pi.registerTool({
    name: "civitai_search",
    label: "Civitai Search",
    description: "Search Civitai models/assets metadata without storing secrets. Uses CIVITAI_API_TOKEN only if present in the environment.",
    promptSnippet: "Search Civitai for checkpoints, LoRAs, VAEs, embeddings, ControlNets, upscale models, workflows, and other assets.",
    promptGuidelines: ["Use civitai_search to find model/asset metadata before downloading; do not put Civitai tokens in dotfiles or prompts."],
    parameters: Type.Object({ query: Type.Optional(Type.String()), types: Type.Optional(Type.String()), base_models: Type.Optional(Type.String()), sort: Type.Optional(Type.String()), period: Type.Optional(Type.String()), nsfw: Type.Optional(Type.Boolean()), limit: Type.Optional(Type.Number()), page: Type.Optional(Type.Number()), model_id: Type.Optional(Type.Number()), max_chars: Type.Optional(Type.Number()) }),
    async execute(_id, params: any, signal) {
      const url = new URL(params.model_id ? `https://civitai.com/api/v1/models/${params.model_id}` : "https://civitai.com/api/v1/models");
      for (const [key, apiKey] of Object.entries({ query: "query", types: "types", base_models: "baseModels", sort: "sort", period: "period", nsfw: "nsfw", limit: "limit", page: "page" })) {
        if (params[key] !== undefined) url.searchParams.set(apiKey, String(params[key]));
      }
      const result = await fetchJson(url.toString(), { headers: civitaiHeaders() }, signal);
      return text(summarize(result, params.max_chars ?? 50000), { url: url.toString(), result });
    },
  });

  pi.registerTool({
    name: "civitai_download",
    label: "Civitai Download",
    description: "Download a Civitai model file by direct Civitai download URL or by model_id plus optional version_id/file_id metadata. Defaults to dry-run unless confirm:true.",
    promptSnippet: "Download Civitai assets into ComfyUI model folders or another local directory.",
    promptGuidelines: ["Use civitai_download with confirm:false first for a dry-run before large downloads; never write API tokens to disk."],
    parameters: Type.Object({
      download_url: Type.Optional(Type.String()),
      model_id: Type.Optional(Type.Number()),
      version_id: Type.Optional(Type.Number()),
      file_id: Type.Optional(Type.Number()),
      model_type: Type.Optional(Type.String({ description: "ComfyUI model folder hint such as checkpoints, loras, vae, controlnet, upscale_models, embeddings" })),
      output_dir: Type.Optional(Type.String()),
      filename: Type.Optional(Type.String()),
      confirm: Type.Optional(Type.Boolean()),
    }),
    async execute(_id, params: any, signal, onUpdate) {
      let downloadUrl = params.download_url;
      let filename = params.filename;
      const details: any = {};
      if (!downloadUrl) {
        if (!params.model_id) throw new Error("Provide download_url or model_id");
        const model: any = await fetchJson(`https://civitai.com/api/v1/models/${params.model_id}`, { headers: civitaiHeaders() }, signal);
        details.model = { id: model.id, name: model.name, type: model.type, nsfw: model.nsfw };
        const version = params.version_id ? model.modelVersions?.find((v: any) => Number(v.id) === Number(params.version_id)) : model.modelVersions?.[0];
        if (!version) throw new Error("No matching model version found");
        const file = params.file_id ? version.files?.find((f: any) => Number(f.id) === Number(params.file_id)) : version.files?.find((f: any) => f.primary) || version.files?.[0];
        if (!file?.downloadUrl) throw new Error("No downloadable file found");
        downloadUrl = file.downloadUrl;
        filename = filename || file.name;
        details.selected = { versionId: version.id, versionName: version.name, fileId: file.id, fileName: file.name, sizeKB: file.sizeKB, type: file.type };
      }
      const outDir = path.resolve(params.output_dir || (params.model_type ? findComfyModelDir(params.model_type) : DEFAULT_DOWNLOAD_DIR));
      const url = assertCivitaiUrl(downloadUrl);
      const outFile = safeOutputFile(outDir, filename || path.basename(url.pathname) || "civitai-download.bin");
      details.output_path = outFile;
      details.download_url = redactUrl(downloadUrl);
      if (!params.confirm) return text(`Dry run. Would download to ${outFile}. Re-run with confirm:true to download.`, details);
      await fs.promises.mkdir(outDir, { recursive: true });
      onUpdate?.({ content: [{ type: "text", text: `Downloading to ${outFile}...` }], details: {} });
      if (process.env.CIVITAI_API_TOKEN && !url.searchParams.has("token")) url.searchParams.set("token", process.env.CIVITAI_API_TOKEN);
      const res = await fetch(url, { signal });
      if (!res.ok || !res.body) throw new Error(`Download failed ${res.status} from ${redactUrl(url.toString())}: ${await res.text()}`);
      await pipeline(Readable.fromWeb(res.body as any), fs.createWriteStream(outFile));
      return text(`Downloaded ${outFile}`, details);
    },
  });
}
