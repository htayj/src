import fs from "node:fs";
import path from "node:path";
import { tool } from "@opencode-ai/plugin";

const API = "https://api.x.ai";
const AUTH_PATH = path.join(process.env.HOME || "", ".local/share/opencode/auth.json");

function getToken() {
  if (process.env.XAI_API_KEY && process.env.XAI_API_KEY.length) return process.env.XAI_API_KEY;
  try {
    const auth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
    return auth?.xai?.access || auth?.xai?.apiKey;
  } catch {
    return undefined;
  }
}

function apiHeaders(token) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function slug(s, n = 48) {
  const out = (s || "asset").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, n);
  return out || "asset";
}

function extFromUrl(u, fallback) {
  try {
    const m = new URL(u).pathname.match(/\.(png|jpe?g|webp|mp4|mov|webm)$/i);
    return m ? m[1].toLowerCase().replace("jpeg", "jpg") : fallback;
  } catch {
    return fallback;
  }
}

function imageMime(p) {
  return ({ png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" })[
    path.extname(p).slice(1).toLowerCase()
  ] || "image/png";
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${url} -> HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return dest;
}

const XaiMediaPlugin = async () => ({
  tool: {
    xai_image: tool({
      description:
        "Generate image(s) with xAI Grok Imagine (default grok-imagine-image-quality). Saves each image under ./generated-media and returns local file paths plus remote URLs. Use for original images from a text prompt. The generated image is also attached so it can render inline.",
      args: {
        prompt: tool.schema.string().describe("Text description of the image to generate."),
        model: tool
          .schema.string()
          .optional()
          .describe("Imagine model id. Default grok-imagine-image-quality (higher quality). Use grok-imagine-image for faster/cheaper."),
        n: tool.schema.number().int().min(1).max(10).optional().describe("Number of images (1-10). Default 1."),
        save_dir: tool
          .schema.string()
          .optional()
          .describe("Directory to save into, relative to project. Default ./generated-media."),
        filename: tool
          .schema.string()
          .optional()
          .describe("Base filename without extension. Default: <slug>-<timestamp>."),
      },
      async execute(args, context) {
        const token = getToken();
        if (!token) throw new Error("No xAI credential found. Set XAI_API_KEY or run `opencode auth login` for xai.");
        const model = args.model || "grok-imagine-image-quality";
        const dir = path.resolve(context.directory, args.save_dir || "generated-media");
        fs.mkdirSync(dir, { recursive: true });
        if (typeof context.metadata === "function") context.metadata({ title: `xai_image: ${args.prompt.slice(0, 60)}` });

        const res = await fetch(`${API}/v1/images/generations`, {
          method: "POST",
          headers: apiHeaders(token),
          body: JSON.stringify({ model, prompt: args.prompt, n: args.n ?? 1, response_format: "url" }),
        });
        if (!res.ok) throw new Error(`xAI /v1/images/generations HTTP ${res.status}: ${await res.text()}`);
        const json = await res.json();
        const items = Array.isArray(json.data) ? json.data : [];
        if (!items.length) throw new Error(`xAI returned no images: ${JSON.stringify(json)}`);

        const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const base = args.filename || `${slug(args.prompt)}-${ts}`;
        const saved = [];
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          let buf;
          if (it.url) {
            const r = await fetch(it.url);
            if (!r.ok) throw new Error(`fetch generated image HTTP ${r.status}`);
            buf = Buffer.from(await r.arrayBuffer());
          } else if (it.b64_json) {
            buf = Buffer.from(it.b64_json, "base64");
          } else {
            continue;
          }
          const ext = it.url ? extFromUrl(it.url, "png") : "png";
          const name = items.length > 1 ? `${base}-${i + 1}.${ext}` : `${base}.${ext}`;
          const fp = path.join(dir, name);
          fs.writeFileSync(fp, buf);
          saved.push({ path: fp, url: it.url || null, revised_prompt: it.revised_prompt || null });
        }

        const attachments = saved.map((s) => ({
          type: "file",
          mime: imageMime(s.path),
          url: "file://" + s.path,
          filename: path.basename(s.path),
        }));
        return {
          title: `Generated ${saved.length} image(s) with ${model}`,
          output: JSON.stringify({ model, count: saved.length, saved }, null, 2),
          metadata: { model, count: saved.length, paths: saved.map((s) => s.path) },
          attachments,
        };
      },
    }),

    xai_video: tool({
      description:
        "Generate a video with xAI Grok Imagine Video (default grok-imagine-video-1.5). Supports text-to-video and image-to-video (pass a public image URL or local file path). Polls until the video is ready, saves the .mp4 under ./generated-media, and returns the local path plus remote URL. Duration up to 15s.",
      args: {
        prompt: tool.schema.string().describe("Motion / scene instruction for the video."),
        model: tool
          .schema.string()
          .optional()
          .describe("Video model id. Default grok-imagine-video-1.5. Use grok-imagine-video for reference-to-video."),
        image: tool
          .schema.string()
          .optional()
          .describe("Optional source image: a public URL, or a local file path (read and sent as a data URI)."),
        duration: tool.schema.number().int().min(1).max(15).optional().describe("Length in seconds (1-15)."),
        save_dir: tool.schema.string().optional().describe("Directory to save into, relative to project. Default ./generated-media."),
        filename: tool.schema.string().optional().describe("Base filename without extension. Default: <slug>-<timestamp>."),
        poll_interval_seconds: tool.schema.number().optional().describe("Poll interval seconds. Default 5."),
        timeout_seconds: tool.schema.number().optional().describe("Max total wait seconds. Default 300."),
      },
      async execute(args, context) {
        const token = getToken();
        if (!token) throw new Error("No xAI credential found. Set XAI_API_KEY or run `opencode auth login` for xai.");
        const model = args.model || "grok-imagine-video-1.5";
        const dir = path.resolve(context.directory, args.save_dir || "generated-media");
        fs.mkdirSync(dir, { recursive: true });
        if (typeof context.metadata === "function") context.metadata({ title: `xai_video: ${args.prompt.slice(0, 60)}` });

        const body = { model, prompt: args.prompt };
        if (args.duration) body.duration = args.duration;
        if (args.image) {
          let imgUrl = args.image;
          if (!/^https?:\/\//i.test(args.image) && fs.existsSync(args.image)) {
            const b = fs.readFileSync(args.image);
            const ext = (path.extname(args.image).slice(1).toLowerCase() || "png").replace("jpeg", "jpg");
            imgUrl = `data:image/${ext};base64,${b.toString("base64")}`;
          }
          body.image = { url: imgUrl };
        }

        const start = await fetch(`${API}/v1/videos/generations`, {
          method: "POST",
          headers: apiHeaders(token),
          body: JSON.stringify(body),
        });
        if (!start.ok) throw new Error(`xAI /v1/videos/generations HTTP ${start.status}: ${await start.text()}`);
        const sj = await start.json();
        const reqId = sj.request_id || sj.id;
        if (!reqId) throw new Error(`xAI returned no request_id: ${JSON.stringify(sj)}`);

        const intervalMs = (args.poll_interval_seconds ?? 5) * 1000;
        const deadline = Date.now() + (args.timeout_seconds ?? 300) * 1000;
        let result = null;
        let lastStatus = null;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, intervalMs));
          const r = await fetch(`${API}/v1/videos/${reqId}`, { headers: { Authorization: `Bearer ${token}` } });
          const j = await r.json();
          lastStatus = j.status;
          if (j.status === "done") {
            result = j;
            break;
          }
          if (j.status === "failed" || j.status === "expired") {
            throw new Error(`xAI video ${j.status}: ${JSON.stringify(j)}`);
          }
        }
        if (!result) throw new Error(`xAI video poll timeout (last status: ${lastStatus}, id: ${reqId})`);
        const vUrl = result.video?.url || result.url;
        if (!vUrl) throw new Error(`xAI video done but no url: ${JSON.stringify(result)}`);

        const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const base = args.filename || `${slug(args.prompt)}-${ts}`;
        const fp = path.join(dir, `${base}.mp4`);
        await download(vUrl, fp);
        return {
          title: `Generated video with ${model}`,
          output: JSON.stringify({ model, id: reqId, path: fp, url: vUrl, status: "done" }, null, 2),
          metadata: { model, id: reqId, path: fp },
          attachments: [{ type: "file", mime: "video/mp4", url: "file://" + fp, filename: path.basename(fp) }],
        };
      },
    }),
  },
});

export { XaiMediaPlugin };
export default XaiMediaPlugin;
