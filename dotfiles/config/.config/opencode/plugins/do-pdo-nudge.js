const COMMAND_SKIP_TTL_MS = 30_000;
const commandSkipUntilBySession = new Map();

const ACTION_VERB_SOURCE =
  "add|architect|bootstrap|build|change|complete|compose|convert|create|delete|deliver|design|disable|draft|enable|extract|finish|fix|generate|hook\\s+up|implement|improve|integrate|introduce|make|migrate|optimize|plan|port|produce|refactor|remove|rename|replace|rewrite|scaffold|set\\s+up|setup|ship|support|update|wire|wire\\s+up|write";
const ACTION_VERB_PATTERN = new RegExp(`\\b(?:${ACTION_VERB_SOURCE})\\b`, "i");

const SKIP_OPENING_PATTERN =
  /^(what|why|how|when|where|who|is|are|was|were|does|did|can|could|would|will|should|shall|which|whose|tell|show|list|describe|summarize|explain|review|look|check|investigate|find|search|research|read|grep|help|see|verify|diagnose|audit|inspect|print|output|compare|count|no|not|stop|don'?t|dont|wait|actually|undo|revert|rollback|continue|keep\s+going|try\s+again|retry|redo|that'?s|thats|nope|hmm|oops|ok|okay|thanks|thank\s+you|yes|yeah|yep|sure)\b/i;

const EXTRA_MUTATION_VERB_SOURCE = "edit|modify|touch|start|run|execute";
const NEGATED_ACTION_VERBS = `${ACTION_VERB_SOURCE}|${EXTRA_MUTATION_VERB_SOURCE}`;
const NEGATED_GERUND_VERBS =
  "adding|architecting|bootstrapping|building|changing|completing|composing|converting|creating|deleting|delivering|designing|disabling|drafting|enabling|extracting|finishing|fixing|generating|hooking\\s+up|implementing|improving|integrating|introducing|making|migrating|optimizing|planning|porting|producing|refactoring|removing|renaming|replacing|rewriting|scaffolding|setting\\s+up|setting|shipping|supporting|updating|wiring|writing|editing|modifying|touching|starting|running|executing";
const NEGATED_ACTION_PATTERN = new RegExp(
  `\\b(?:do\\s+not|don['’]?t|dont|never)\\s+(?:(?:ever|really)\\s+)?(?:(?:want|need|intend|plan)\\s+(?:you\\s+)?to\\s+|(?:want|need)\\s+you\\s+to\\s+|(?:\\w+\\s+){0,5})?(?:${NEGATED_ACTION_VERBS})\\b`,
  "i",
);
const LEADING_AVOID_PATTERN = new RegExp(
  `^(?:please\\s+)?avoid\\s+(?:(?:only|also)\\s+)?(?:${NEGATED_GERUND_VERBS})\\b`,
  "i",
);
const POSITIVE_ACTION_OPENING_PATTERN = new RegExp(
  `^(?:please\\s+)?(?:also\\s+|and\\s+|but\\s+|then\\s+)*(?:${ACTION_VERB_SOURCE})\\b`,
  "i",
);

const FILE_EXTENSION_PATTERN =
  /\.(ts|tsx|js|jsx|mjs|cjs|py|rs|go|rb|java|kt|kts|swift|scala|c|cc|cpp|h|hpp|cs|json|yaml|yml|toml|ini|conf|md|sh|bash|zsh|fish|sql|css|scss|sass|less|html|htm|xml|svg|graphql|gql|proto|lisp|cl|el)\b/i;
const SOURCE_PATH_PATTERN =
  /(^|[\s/])(src|source|packages|pkg|lib|libs|app|apps|server|frontend|backend|client|config|plugins|plugin|hooks|commands|agents|components|pages|routes|controllers|models|schemas|migrations|tests?|spec|specs|scripts|tools|utils|helpers|services|stores|reducers|middleware|handlers|workers|queues|jobs)\//i;
const BACKTICK_CODE_PATTERN = /`[^`]+`/;
const CAMEL_CASE_PATTERN = /\b[A-Z][a-z]+[A-Z][a-zA-Z0-9]*\b/;
const SNAKE_CASE_PATTERN = /\b[a-z][a-z0-9]*_[a-z0-9]+(?:_[a-z0-9]+)*\b/;
const KEBAB_CASE_PATTERN = /\b[a-z]+-[a-z]+-[a-z]+(?:-[a-z]+)*\b/;
const LINE_REFERENCE_PATTERN = /\b(?:line\s+[0-9]+|[A-Za-z0-9_./-]+:[0-9]+(?::[0-9]+)?|:[0-9]+\b)/i;

function normalizePrompt(prompt) {
  return typeof prompt === "string" ? prompt.trim() : "";
}

function wordCount(prompt) {
  const matches = normalizePrompt(prompt).match(/\S+/g);
  return matches ? matches.length : 0;
}

function hasExplicitPipelineCommand(prompt) {
  return /^\/(?:do|pdo)(?:\s|$)/i.test(normalizePrompt(prompt));
}

function hasLaterPositiveActionSegment(prompt) {
  return normalizePrompt(prompt)
    .split(/(?:[;,.\n]+|\b(?:but|then)\b)/i)
    .slice(1)
    .some((segment) => POSITIVE_ACTION_OPENING_PATTERN.test(segment.trim()));
}

function hasLeadingNegativeConstraintWithLaterPositiveAction(prompt) {
  const trimmed = normalizePrompt(prompt);
  return /^(?:please\s+)?(?:no|not|do\s+not|don['’]?t|dont|never|avoid|stop)\b/i.test(trimmed) && hasLaterPositiveActionSegment(trimmed);
}

function hasNegativeImplementationIntent(prompt) {
  const trimmed = normalizePrompt(prompt);
  if (!trimmed) return false;
  if (hasLaterPositiveActionSegment(trimmed)) return false;
  return NEGATED_ACTION_PATTERN.test(trimmed) || LEADING_AVOID_PATTERN.test(trimmed);
}

function shouldSkipPrompt(prompt) {
  const trimmed = normalizePrompt(prompt);
  if (!trimmed) return true;
  if (/^[!/]/.test(trimmed)) return true;
  if (hasExplicitPipelineCommand(trimmed)) return true;
  if (wordCount(trimmed) < 4) return true;
  if (trimmed.includes("?")) return true;
  if (hasNegativeImplementationIntent(trimmed)) return true;
  if (SKIP_OPENING_PATTERN.test(trimmed.toLowerCase()) && !hasLeadingNegativeConstraintWithLaterPositiveAction(trimmed)) return true;
  return false;
}

export function hasImplementationDetail(prompt) {
  const trimmed = normalizePrompt(prompt);
  if (!trimmed) return false;

  return (
    FILE_EXTENSION_PATTERN.test(trimmed) ||
    SOURCE_PATH_PATTERN.test(trimmed) ||
    BACKTICK_CODE_PATTERN.test(trimmed) ||
    CAMEL_CASE_PATTERN.test(trimmed) ||
    SNAKE_CASE_PATTERN.test(trimmed) ||
    KEBAB_CASE_PATTERN.test(trimmed) ||
    LINE_REFERENCE_PATTERN.test(trimmed)
  );
}

export function classifyPrompt(prompt) {
  const trimmed = normalizePrompt(prompt);
  if (shouldSkipPrompt(trimmed)) return null;
  if (!ACTION_VERB_PATTERN.test(trimmed)) return null;
  return hasImplementationDetail(trimmed) ? "do" : "pdo";
}

export function buildNudge(route) {
  if (route === "do") {
    return [
      "NOTE: The user message looks like a substantive coding request with concrete implementation detail (file paths, identifiers, code spans, or line references).",
      "Consider routing the work through the local OpenCode `/do` pipeline so it gets plan -> implement -> compile/typecheck -> tests -> review -> lint coverage, with commits and pushes still gated explicitly by the user/config.",
      "This is only a nudge; ignore it for trivial edits, quick fixes, research, or explanation.",
    ].join(" ");
  }

  if (route === "pdo") {
    return [
      "NOTE: The user message looks like a feature-level or under-specified coding/planning request without concrete implementation detail.",
      "Prefer the local OpenCode `/pdo` pipeline when useful: draft a plan, resolve open decisions with the user, then hand the resolved work to `/do` for implementation and verification, with commits and pushes still gated explicitly by the user/config.",
      "Use `/do` instead only when the implementation is already obvious; ignore this nudge for trivial edits, quick fixes, research, or explanation.",
    ].join(" ");
  }

  return "";
}

function makePartID() {
  return `prt_dopdo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function outputAlreadyNudged(output) {
  return output?.parts?.some((part) => part?.metadata?.kind === "do_pdo_nudge") ?? false;
}

function messageIDFrom(input, output) {
  return input?.messageID ?? output?.message?.id ?? output?.parts?.find((part) => typeof part?.messageID === "string")?.messageID;
}

function sessionIDFrom(input, output) {
  return input?.sessionID ?? output?.parts?.find((part) => typeof part?.sessionID === "string")?.sessionID;
}

export function appendNudgePart(input, output, route) {
  if (!output || !Array.isArray(output.parts)) return null;
  if (outputAlreadyNudged(output)) return null;

  const sessionID = sessionIDFrom(input, output);
  const messageID = messageIDFrom(input, output);
  const text = buildNudge(route);
  if (!sessionID || !messageID || !text) return null;

  const part = {
    id: makePartID(),
    messageID,
    sessionID,
    type: "text",
    synthetic: true,
    text,
    metadata: { kind: "do_pdo_nudge", route },
  };
  output.parts.push(part);
  return part;
}

function extractPromptText(output) {
  if (!Array.isArray(output?.parts)) return "";
  return output.parts
    .filter((part) => part?.type === "text" && part.synthetic !== true && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function markCommandSession(sessionID) {
  if (typeof sessionID !== "string" || sessionID.length === 0) return;
  commandSkipUntilBySession.set(sessionID, Date.now() + COMMAND_SKIP_TTL_MS);
}

function consumeCommandSession(sessionID) {
  if (typeof sessionID !== "string" || sessionID.length === 0) return false;
  const expiresAt = commandSkipUntilBySession.get(sessionID);
  if (!expiresAt) return false;
  commandSkipUntilBySession.delete(sessionID);
  return expiresAt >= Date.now();
}

export const DoPdoNudgePlugin = async () => ({
  "command.execute.before": async ({ sessionID }) => {
    try {
      markCommandSession(sessionID);
    } catch {
      // Fail closed: this plugin should never interrupt normal OpenCode use.
    }
  },
  "chat.message": async (input, output) => {
    try {
      if (consumeCommandSession(input?.sessionID)) return;
      const prompt = extractPromptText(output);
      const route = classifyPrompt(prompt);
      if (route) appendNudgePart(input, output, route);
    } catch {
      // Fail closed: this plugin should never interrupt normal OpenCode use.
    }
  },
});

export default {
  id: "do-pdo-nudge",
  server: DoPdoNudgePlugin,
};
