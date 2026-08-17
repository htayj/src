import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const PROVIDER_ID = "omniroute";
const BASE_URL = "http://192.168.7.116/v1";
const DEFAULT_CONTEXT_WINDOW = 128_000;
const DEFAULT_MAX_TOKENS = 16_384;
const DISCOVERY_TIMEOUT_MS = 30_000;
const CATALOG_TTL_MS = 15 * 60_000;
const FALLBACK_COMBO_IDS = [
  "auto/best-coding",
  "auto/best-reasoning",
  "auto/best-fast",
  "auto/best-vision",
  "auto/best-chat",
  "auto/best-coding-fast",
  "auto/pro-coding",
  "auto/pro-reasoning",
  "auto/pro-vision",
  "auto/pro-chat",
  "auto/pro-fast",
  "auto/coding",
  "auto/fast",
  "auto/chat",
  "auto/cheap",
  "auto/offline",
  "auto/smart",
  "auto/claude-opus",
  "auto/claude-sonnet",
  "auto/best-free",
  "auto/best-chaos",
  "auto/chaos",
  "auto/coding:fast",
  "auto/coding:cheap",
  "auto/coding:free",
  "auto/coding:pro",
  "auto/coding:reliable",
  "auto/reasoning",
  "auto/reasoning:pro",
  "auto/vision",
  "auto/multimodal",
  "auto/glm",
  "auto/minimax",
  "auto/mimo",
  "auto/zai",
  "auto/gemma",
  "auto/llama",
  "auto/gemini",
  "Kimi Coding",
  "Fable",
  "ultra-planning",
  "planning",
  "role-orchestrator-state",
  "role-orchestrator-monitor",
  "role-orchestrator-escalation",
  "role-implementer-routine",
  "role-implementer-sustained",
  "role-implementer-critical",
  "role-research-discovery",
  "role-research-synthesis",
  "role-research-citation-audit",
  "role-research-autonomy",
] as const;

type OmniRouteCatalogModel = {
  id?: unknown;
  name?: unknown;
  owned_by?: unknown;
  context_length?: unknown;
  max_input_tokens?: unknown;
  max_output_tokens?: unknown;
  input_modalities?: unknown;
  capabilities?: {
    reasoning?: unknown;
    thinking?: unknown;
    vision?: unknown;
  };
};

type OmniRouteCatalog = {
  data?: unknown;
};

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

export function toPiModel(value: unknown) {
  if (typeof value !== "object" || value === null) return undefined;
  const model = value as OmniRouteCatalogModel;
  if (typeof model.id !== "string" || model.id.trim() === "") return undefined;

  const capabilities = model.capabilities ?? {};
  const contextWindow = positiveInteger(
    model.context_length,
    positiveInteger(model.max_input_tokens, DEFAULT_CONTEXT_WINDOW),
  );
  const maxTokens = positiveInteger(model.max_output_tokens, DEFAULT_MAX_TOKENS);
  const inputModalities = Array.isArray(model.input_modalities) ? model.input_modalities : [];
  const vision = capabilities.vision === true || inputModalities.includes("image");
  const input: ("text" | "image")[] = vision ? ["text", "image"] : ["text"];
  const owner = typeof model.owned_by === "string" && model.owned_by ? model.owned_by : "endpoint";
  const catalogName = typeof model.name === "string" && model.name ? model.name : model.id;

  return {
    id: model.id,
    name: `${catalogName} (${owner})`,
    api: "openai-completions" as const,
    provider: PROVIDER_ID,
    baseUrl: BASE_URL,
    reasoning: capabilities.reasoning === true || capabilities.thinking === true,
    input,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow,
    maxTokens: Math.min(maxTokens, contextWindow),
    compat: {
      // OmniRoute's endpoint/combo IDs already encode their reasoning preset.
      supportsReasoningEffort: false,
    },
  };
}

const FALLBACK_COMBO_MODELS = FALLBACK_COMBO_IDS.map((id) =>
  toPiModel({
    id,
    owned_by: "combo",
    context_length: id.startsWith("role-") || id === "planning" || id === "ultra-planning" ? 272_000 : 1_050_000,
    max_output_tokens: 128_000,
    capabilities: {
      reasoning: true,
      vision: id.includes("vision") || id.includes("multimodal"),
    },
  }),
).filter((model): model is NonNullable<typeof model> => model !== undefined);

async function fetchModels(apiKey: string, signal: AbortSignal) {
  const response = await fetch(`${BASE_URL}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.any([signal, AbortSignal.timeout(DISCOVERY_TIMEOUT_MS)]),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);

  const payload = (await response.json()) as OmniRouteCatalog;
  if (!Array.isArray(payload.data)) throw new Error("catalog response has no data array");

  const models = payload.data
    .map(toPiModel)
    .filter((model): model is NonNullable<typeof model> => model !== undefined);

  // OmniRoute may expose the same alias through more than one discovery path.
  return [...new Map(models.map((model) => [model.id, model])).values()];
}

export default function omnirouteProvider(pi: ExtensionAPI) {
  pi.registerProvider(PROVIDER_ID, {
    name: "OmniRoute (LAN gateway)",
    baseUrl: BASE_URL,
    apiKey: "$OMNIROUTE_API_KEY",
    api: "openai-completions",
    models: FALLBACK_COMBO_MODELS,
    async refreshModels(context) {
      const stored = context.stored?.models.filter((model) => model.provider === PROVIDER_ID) ?? [];
      if (!context.allowNetwork) return stored.length ? stored : FALLBACK_COMBO_MODELS;
      if (!context.force && context.stored?.checkedAt && Date.now() - context.stored.checkedAt < CATALOG_TTL_MS) {
        return stored;
      }
      if (context.credential?.type !== "api_key" || !context.credential.key) {
        throw new Error("OmniRoute API key is unavailable");
      }

      const models = await fetchModels(context.credential.key, context.signal);
      await context.publish({ persist: { models, checkedAt: Date.now() } });
      return models;
    },
  });
}
