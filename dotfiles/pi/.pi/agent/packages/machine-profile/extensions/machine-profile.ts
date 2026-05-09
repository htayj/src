import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

const MACHINE_PROFILE = `
<machine-profile>
Local machine preferences and resources:
- Dotfiles means any non-secret user/system configuration file for this machine, not only hidden files.
- Dotfiles live in ~/src/dotfiles and are managed with GNU stow.
- For config/dotfile changes, edit ~/src/dotfiles rather than managed files in their deployed locations when possible.
- Secrets storage is excluded: do not put tokens, private keys, credentials, password-store data, or sensitive material in dotfiles.
- After updating dotfiles, apply with stow as appropriate, review the dotfiles repo diff, then commit and push unless the user says not to.
- Third-party reference source lives in ~/reference/external_src/.
- Third-party reference docs live in ~/reference/external_docs/.
- When asked to download source/docs for reference, store them in those reference directories.
- When uncertain about third-party library/API behavior, check local reference source/docs before guessing.
- Do not store secrets in dotfiles, notes, prompts, skills, or reference docs.
</machine-profile>`;

const USAGE_STATUS_KEY = "provider-usage";
const OPENROUTER_CREDITS_URL = "https://openrouter.ai/api/v1/credits";
const FUNDS_REFRESH_MS = 5 * 60 * 1000;

type HeaderMap = Record<string, string>;

type LimitCandidate = {
  key: string;
  label: string;
  remaining: number;
  limit?: number;
  resetSeconds?: number;
};

type FundsState = {
  provider: string;
  value: string;
  updatedAt: number;
};

function normalizeHeaders(headers: Record<string, string>): HeaderMap {
  const normalized: HeaderMap = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseResetSeconds(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  const durationMatch = trimmed.match(/^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/i);
  if (durationMatch) {
    const amount = Number(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    if (unit === "ms") return amount / 1000;
    if (unit === "s") return amount;
    if (unit === "m") return amount * 60;
    if (unit === "h") return amount * 60 * 60;
    if (unit === "d") return amount * 24 * 60 * 60;
  }

  const dateMs = Date.parse(trimmed);
  if (Number.isFinite(dateMs)) {
    return Math.max(0, Math.round((dateMs - Date.now()) / 1000));
  }

  return undefined;
}

function compactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return `${Math.round(value)}`;
}

function formatRemaining(candidate: LimitCandidate): string {
  if (candidate.limit && candidate.limit > 0) {
    const pct = Math.max(0, Math.min(100, Math.round((candidate.remaining / candidate.limit) * 100)));
    return `${pct}%`;
  }
  return compactNumber(candidate.remaining);
}

function classifyWindow(key: string, resetSeconds?: number): string {
  if (/short|minute|hour|burst/.test(key)) return "short";
  if (/long|day|week|month|quota/.test(key)) return "long";
  if (typeof resetSeconds === "number") return resetSeconds <= 60 * 60 ? "short" : "long";
  return "remaining";
}

function collectLimitCandidates(headers: HeaderMap): LimitCandidate[] {
  const candidates: LimitCandidate[] = [];

  for (const [key, value] of Object.entries(headers)) {
    if (!/rate.?limit|ratelimit|quota|usage/.test(key) || !key.includes("remaining")) continue;

    const remaining = parseNumber(value);
    if (remaining === undefined) continue;

    const limitKey = key.replace("remaining", "limit");
    const resetKey = key.replace("remaining", "reset");
    const limit = parseNumber(headers[limitKey]);
    const resetSeconds = parseResetSeconds(headers[resetKey]);

    candidates.push({
      key,
      label: classifyWindow(key, resetSeconds),
      remaining,
      limit,
      resetSeconds,
    });
  }

  return candidates;
}

function pickByWindow(candidates: LimitCandidate[], window: "short" | "long"): LimitCandidate | undefined {
  const explicit = candidates.filter((candidate) => candidate.label === window);
  if (explicit.length > 0) {
    return explicit.sort((a, b) => (a.resetSeconds ?? 0) - (b.resetSeconds ?? 0))[window === "short" ? 0 : explicit.length - 1];
  }

  const withReset = candidates.filter((candidate) => typeof candidate.resetSeconds === "number");
  if (withReset.length === 0) return undefined;
  const sorted = withReset.sort((a, b) => (a.resetSeconds ?? 0) - (b.resetSeconds ?? 0));
  return window === "short" ? sorted[0] : sorted[sorted.length - 1];
}

function subscriptionStatusFromHeaders(rawHeaders: Record<string, string>): string | undefined {
  const headers = normalizeHeaders(rawHeaders);
  const candidates = collectLimitCandidates(headers);
  if (candidates.length === 0) return undefined;

  const short = pickByWindow(candidates, "short");
  const long = pickByWindow(candidates, "long");

  if (short && long && short.key !== long.key) {
    return `S ${formatRemaining(short)} L ${formatRemaining(long)}`;
  }

  const single = short ?? long ?? candidates[0];
  return formatRemaining(single);
}

function fundsStatusFromHeaders(rawHeaders: Record<string, string>): string | undefined {
  const headers = normalizeHeaders(rawHeaders);
  const candidates = [
    "x-credits-remaining",
    "x-credit-remaining",
    "x-balance-remaining",
    "x-balance",
    "x-account-balance",
    "x-funds-remaining",
  ];

  for (const key of candidates) {
    const amount = parseNumber(headers[key]);
    if (amount !== undefined) return formatCurrency(amount);
  }

  return undefined;
}

function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 100) return `$${amount.toFixed(0)}`;
  if (abs >= 10) return `$${amount.toFixed(1)}`;
  return `$${amount.toFixed(2)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(obj: Record<string, unknown>, key: string): number | undefined {
  const value = obj[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return parseNumber(value);
  return undefined;
}

async function fetchOpenRouterFunds(ctx: ExtensionContext, signal?: AbortSignal): Promise<FundsState | undefined> {
  const model = ctx.model;
  if (!model || model.provider !== "openrouter") return undefined;
  if (ctx.modelRegistry.isUsingOAuth(model)) return undefined;

  const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
  if (!auth.ok) return undefined;

  const headers: Record<string, string> = { ...(auth.headers ?? {}) };
  if (auth.apiKey && !Object.keys(headers).some((key) => key.toLowerCase() === "authorization")) {
    headers.Authorization = `Bearer ${auth.apiKey}`;
  }
  if (!Object.keys(headers).some((key) => key.toLowerCase() === "authorization")) return undefined;

  const response = await fetch(OPENROUTER_CREDITS_URL, { headers, signal });
  if (!response.ok) return undefined;

  const payload = await response.json();
  if (!isRecord(payload) || !isRecord(payload.data)) return undefined;

  const totalCredits = readNumber(payload.data, "total_credits");
  const totalUsage = readNumber(payload.data, "total_usage") ?? 0;
  if (totalCredits === undefined) return undefined;

  return {
    provider: model.provider,
    value: formatCurrency(totalCredits - totalUsage),
    updatedAt: Date.now(),
  };
}

function modelKey(ctx: ExtensionContext): string | undefined {
  return ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : undefined;
}

export default function (pi: ExtensionAPI) {
  let fundsState: FundsState | undefined;
  let lastFundsFetch = 0;
  let activeModelKey: string | undefined;
  let refreshTimer: ReturnType<typeof setInterval> | undefined;

  function clearProviderUsage(ctx: ExtensionContext): void {
    ctx.ui.setStatus(USAGE_STATUS_KEY, undefined);
  }

  async function refreshFunds(ctx: ExtensionContext, force = false): Promise<void> {
    const model = ctx.model;
    if (!model || ctx.modelRegistry.isUsingOAuth(model)) return;

    const now = Date.now();
    if (!force && fundsState?.provider === model.provider && now - lastFundsFetch < FUNDS_REFRESH_MS) {
      ctx.ui.setStatus(USAGE_STATUS_KEY, fundsState.value);
      return;
    }

    lastFundsFetch = now;
    try {
      const next = await fetchOpenRouterFunds(ctx, ctx.signal);
      if (next) {
        fundsState = next;
        ctx.ui.setStatus(USAGE_STATUS_KEY, next.value);
      } else if (!fundsState || fundsState.provider !== model.provider) {
        clearProviderUsage(ctx);
      }
    } catch {
      // Keep this quiet; usage/funds display should never interrupt normal Pi work.
      if (!fundsState || fundsState.provider !== model.provider) clearProviderUsage(ctx);
    }
  }

  async function refreshForModel(ctx: ExtensionContext, force = false): Promise<void> {
    const key = modelKey(ctx);
    if (key !== activeModelKey) {
      activeModelKey = key;
      fundsState = undefined;
      lastFundsFetch = 0;
      clearProviderUsage(ctx);
    }

    const model = ctx.model;
    if (!model) {
      clearProviderUsage(ctx);
      return;
    }

    if (!ctx.modelRegistry.isUsingOAuth(model)) {
      await refreshFunds(ctx, force);
    }
  }

  pi.on("before_agent_start", async (event) => {
    return { systemPrompt: `${event.systemPrompt}\n\n${MACHINE_PROFILE}` };
  });

  pi.on("session_start", async (_event, ctx) => {
    await refreshForModel(ctx, true);
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
      void refreshForModel(ctx);
    }, FUNDS_REFRESH_MS);
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = undefined;
    clearProviderUsage(ctx);
  });

  pi.on("model_select", async (_event, ctx) => {
    await refreshForModel(ctx, true);
  });

  pi.on("after_provider_response", async (event, ctx) => {
    const model = ctx.model;
    if (!model) return;

    if (ctx.modelRegistry.isUsingOAuth(model)) {
      const status = subscriptionStatusFromHeaders(event.headers);
      if (status) ctx.ui.setStatus(USAGE_STATUS_KEY, status);
      return;
    }

    const headerFunds = fundsStatusFromHeaders(event.headers);
    if (headerFunds) {
      fundsState = { provider: model.provider, value: headerFunds, updatedAt: Date.now() };
      ctx.ui.setStatus(USAGE_STATUS_KEY, headerFunds);
      return;
    }

    await refreshFunds(ctx);
  });
}
