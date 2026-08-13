import * as fs from "node:fs";
import * as path from "node:path";
import { PACKAGED_CUSTOM_GRAPH_PRESET_NAMES, PACKAGED_CUSTOM_GRAPH_PRESETS } from "./graph-presets";
import { descriptorInputFromStage, normalizeDescriptorInput, normalizeDescriptorList, normalizeDescriptorText, normalizeStableKey } from "./descriptors";
import { redactExtensionGuideSecrets } from "./extension-integration";
import {
  TASK_KINDS,
  type CustomGraphSettings,
  type CustomGraphSource,
  type CustomGraphStageSettings,
  type ProjectTaskGraphSettings,
  type ProjectTaskGraphSettingsInfo,
  type RouteMetadata,
  type RunMode,
  type RunnerKind,
  type SideEffects,
  type TaskKind,
} from "./schema";

const RUNNER_KINDS = ["subagent", "chain", "direct_safe", "manual_gate", "formula"] as const satisfies readonly RunnerKind[];
const SIDE_EFFECTS = ["none", "read", "write", "shell", "git", "network"] as const satisfies readonly SideEffects[];
const ROUTE_ACTIONS = ["retry_same_stage", "route_to_implement", "stop_for_user", "stop_push_failed", "cancel_dependents"] as const satisfies readonly RouteMetadata["onFailure"][];
const CONTEXTS = ["fresh", "fork"] as const;
const PRIORITIES = ["A", "B", "C"] as const;

interface BuiltInTaskGraphTemplate {
  mode: RunMode;
  description: string;
  stages: string[];
  createHint?: string;
}

const BUILT_IN_TASK_GRAPH_TEMPLATES: BuiltInTaskGraphTemplate[] = [
  {
    mode: "do",
    description: "Default implementation pipeline for straightforward coding work.",
    stages: ["PLAN", "IMPLEMENT", "COMPILE", "UNIT_TEST", "PERF_TEST", "CODE_REVIEW", "RESTART", "API_TEST", "E2E_TEST", "UX_REVIEW", "SPEC_UPDATE", "LINT", "COMMIT/PUSH when explicitly approved"],
  },
  {
    mode: "pdo",
    description: "Plan-driven implementation pipeline for feature work with open design decisions.",
    stages: ["PLAN", "optional ORACLE_CONSULT/DECOMPOSE gates", "GRILL decision gate", "implementation/check chain"],
  },
  {
    mode: "fulcrum",
    description: "Alias-style pressure-tested planning flow for feature work with decision gates.",
    stages: ["PLAN", "optional planning gates", "GRILL decision gate", "implementation/check chain"],
  },
  {
    mode: "todo",
    description: "Parse TODO.org-style items and launch dependency-aware per-item execution chains.",
    stages: ["per-item PLAN", "dependency analysis GO gate", "per-item implementation/check chains"],
  },
  {
    mode: "todo-strict",
    description: "Strict TODO.org workflow with the same dependency pipeline as todo plus strict mutation behavior.",
    stages: ["per-item PLAN", "dependency analysis GO gate", "per-item implementation/check chains"],
  },
  {
    mode: "ticketdo",
    description: "Ticket-driven workflow that starts by resolving/pasting ticket acceptance criteria before planning.",
    stages: ["ticket resolution", "PLAN", "optional planning gates", "GRILL decision gate", "implementation/check chain"],
  },
  {
    mode: "autoimprove",
    description: "Objective-test-driven iterative workflow that produces both the goal result and a reusable skill.",
    stages: ["PLAN", "optional ORACLE_CONSULT", "autoimprove contract GRILL", "iterative implementation/check chain"],
  },
  {
    mode: "follow-pipeline",
    description: "Read-only CI/pipeline follow-up workflow.",
    stages: ["CI_FOLLOW analysis"],
  },
  {
    mode: "fixup-pipelines",
    description: "Read-only CI/pipeline fixup discovery workflow.",
    stages: ["CI_FIXUP analysis"],
  },
  {
    mode: "custom",
    description: "Instantiate a packaged or settings-defined custom template with options.customGraph.",
    stages: ["stages defined by packaged presets or settings graphs/customGraphs"],
    createHint: 'task_graph_create({ mode: "custom", input: "<task>", options: { customGraph: "name" } })',
  },
];

export interface LoadProjectSettingsOptions {
  ignoreProjectSettings?: boolean;
  ignoreGlobalSettings?: boolean;
  settingsPath?: string;
}

export function defaultSettingsPaths(cwd: string) {
  return [
    path.join(cwd, ".pi", "dev-suite", "task-graph", "settings.json"),
    path.join(cwd, ".pi", "task-graph.json"),
  ];
}

export function defaultGlobalSettingsPaths() {
  const home = process.env.HOME || ".";
  return [
    ...(process.env.PI_TASK_GRAPH_GLOBAL_SETTINGS ? [process.env.PI_TASK_GRAPH_GLOBAL_SETTINGS] : []),
    path.join(home, ".pi", "dev-suite", "task-graph", "settings.json"),
  ];
}

export function loadProjectSettings(cwd: string, options: LoadProjectSettingsOptions = {}): ProjectTaskGraphSettingsInfo {
  const global = options.ignoreGlobalSettings ? undefined : loadFirstSettings(defaultGlobalSettingsPaths(), "global task graph settings");
  const project = options.ignoreProjectSettings ? undefined : loadFirstSettings(options.settingsPath ? [resolveProjectSettingsPath(cwd, options.settingsPath)] : defaultSettingsPaths(cwd), "project task graph settings", cwd);
  const merged = mergeTaskGraphSettings(global?.settings, project?.settings);
  const settings = merged.settings;
  const disabledGraphNames = settings.disabledGraphs ?? [];
  const disabledPackagedGraphNames = settings.disabledPackagedGraphs ?? [];
  const effectiveGraphNames = Object.keys(settings.graphs ?? {}).filter((name) => !isCustomGraphDisabled(settings, name));
  return {
    loaded: Boolean(global || project),
    path: project?.path ?? global?.path,
    globalPath: global?.path,
    projectPath: project?.path,
    graphNames: effectiveGraphNames,
    packagedGraphNames: merged.packagedGraphNames,
    globalGraphNames: merged.globalGraphNames,
    projectGraphNames: merged.projectGraphNames,
    effectiveGraphNames,
    graphSourceMap: merged.graphSourceMap,
    disabledGraphNames,
    disabledPackagedGraphNames,
    settings: Object.keys(settings).length ? settings : undefined,
  };
}

function loadFirstSettings(candidates: string[], label: string, cwd?: string) {
  const found = candidates.find((file) => fs.existsSync(file));
  if (!found) return undefined;
  if (cwd) assertRealPathWithinProject(cwd, found);
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(found, "utf8"));
  } catch (error) {
    throw new Error(`Invalid ${label} JSON at ${found}: ${error instanceof Error ? error.message : String(error)}`);
  }
  return { path: found, settings: validateProjectSettings(raw, found) };
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function graphNames(settings: ProjectTaskGraphSettings | undefined) {
  return Object.keys(settings?.graphs ?? {}).sort((a, b) => a.localeCompare(b));
}

function disabledPackagedGraphSet(globalSettings?: ProjectTaskGraphSettings, projectSettings?: ProjectTaskGraphSettings) {
  return new Set([...(globalSettings?.disabledPackagedGraphs ?? []), ...(projectSettings?.disabledPackagedGraphs ?? [])]);
}

function availablePackagedGraphs(disabledPackagedGraphs: ReadonlySet<string>) {
  const graphs: Record<string, CustomGraphSettings> = {};
  for (const name of PACKAGED_CUSTOM_GRAPH_PRESET_NAMES) {
    if (!disabledPackagedGraphs.has(name)) graphs[name] = PACKAGED_CUSTOM_GRAPH_PRESETS[name];
  }
  return graphs;
}

type RoutingSettings = NonNullable<ProjectTaskGraphSettings["routing"]>;

function cloneFailureRoutes(routes: RoutingSettings["failureRoutes"]) {
  const out: NonNullable<RoutingSettings["failureRoutes"]> = {};
  for (const [kind, route] of Object.entries(routes ?? {})) {
    if (route !== undefined) out[kind as TaskKind] = { ...route };
  }
  return out;
}

function mergeRoutingSettings(globalRouting?: RoutingSettings, projectRouting?: RoutingSettings): RoutingSettings | undefined {
  if (!globalRouting && !projectRouting) return undefined;
  const merged: RoutingSettings = { ...(globalRouting ?? {}), ...(projectRouting ?? {}) };
  if (globalRouting?.failureRoutes || projectRouting?.failureRoutes) {
    const failureRoutes = cloneFailureRoutes(globalRouting?.failureRoutes);
    for (const [kind, projectRoute] of Object.entries(projectRouting?.failureRoutes ?? {})) {
      if (projectRoute !== undefined) failureRoutes[kind as TaskKind] = { ...(failureRoutes[kind as TaskKind] ?? {}), ...projectRoute };
    }
    merged.failureRoutes = failureRoutes;
  }
  if (globalRouting?.lockConflictGroups || projectRouting?.lockConflictGroups) {
    merged.lockConflictGroups = { ...(globalRouting?.lockConflictGroups ?? {}), ...(projectRouting?.lockConflictGroups ?? {}) };
  }
  return merged;
}

function mergeTaskGraphSettings(globalSettings?: ProjectTaskGraphSettings, projectSettings?: ProjectTaskGraphSettings): {
  settings: ProjectTaskGraphSettings;
  packagedGraphNames: string[];
  globalGraphNames: string[];
  projectGraphNames: string[];
  graphSourceMap: Record<string, CustomGraphSource>;
} {
  const merged: ProjectTaskGraphSettings = {};
  const disabledPackaged = disabledPackagedGraphSet(globalSettings, projectSettings);
  const packagedGraphs = availablePackagedGraphs(disabledPackaged);
  const globalGraphs = globalSettings?.graphs ?? {};
  const projectGraphs = projectSettings?.graphs ?? {};
  const mergedGraphs = { ...packagedGraphs, ...globalGraphs, ...projectGraphs };

  if (globalSettings?.agentInstructions || projectSettings?.agentInstructions) merged.agentInstructions = { ...(globalSettings?.agentInstructions ?? {}), ...(projectSettings?.agentInstructions ?? {}) };
  const routing = mergeRoutingSettings(globalSettings?.routing, projectSettings?.routing);
  if (routing) merged.routing = routing;
  if (Object.keys(mergedGraphs).length) merged.graphs = mergedGraphs;
  if (projectSettings?.defaultGraph !== undefined || globalSettings?.defaultGraph !== undefined) merged.defaultGraph = projectSettings?.defaultGraph ?? globalSettings?.defaultGraph;
  const disabledGraphs = uniqueSorted([...(globalSettings?.disabledGraphs ?? []), ...(projectSettings?.disabledGraphs ?? [])]);
  if (disabledGraphs.length) merged.disabledGraphs = disabledGraphs;
  const disabledPackagedGraphs = uniqueSorted([...disabledPackaged]);
  if (disabledPackagedGraphs.length) merged.disabledPackagedGraphs = disabledPackagedGraphs;

  const graphSourceMap: Record<string, CustomGraphSource> = {};
  for (const name of Object.keys(packagedGraphs)) graphSourceMap[name] = "packaged";
  for (const name of Object.keys(globalGraphs)) graphSourceMap[name] = "global";
  for (const name of Object.keys(projectGraphs)) graphSourceMap[name] = "project";

  return {
    settings: merged,
    packagedGraphNames: graphNames({ graphs: packagedGraphs }),
    globalGraphNames: graphNames(globalSettings),
    projectGraphNames: graphNames(projectSettings),
    graphSourceMap,
  };
}

const PROMPT_DETAIL_KEYS = new Set([
  "agentinstructions",
  "prompt",
  "promptinstructions",
  "projectpromptinstructions",
  "readyprompt",
  "workerprompt",
  "systemprompt",
  "hiddenprompt",
  "prompttemplate",
]);

const PROMPT_DETAIL_TEXT_MARKER = /\b(?:agentInstructions|promptInstructions|projectPromptInstructions|readyPrompt|workerPrompt|systemPrompt|hiddenPrompt|promptTemplate)\b|(?:^|[\s{,])prompt\s*[:=]/i;

function isPromptDetailKey(key: string) {
  const normalized = key.replace(/[-_\s]/g, "").toLowerCase();
  return PROMPT_DETAIL_KEYS.has(normalized);
}

export function sanitizeProjectTaskGraphDetails<T>(value: T): T {
  return sanitizeProjectTaskGraphDetailValue(value, new WeakSet<object>()) as T;
}

function sanitizeProjectTaskGraphDetailValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === "string") {
    if (PROMPT_DETAIL_TEXT_MARKER.test(value)) return "[redacted prompt-like text]";
    return redactExtensionGuideSecrets(value);
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeProjectTaskGraphDetailValue(item, seen));
  if (value && typeof value === "object") {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    const safe: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (isPromptDetailKey(key)) continue;
      safe[key] = sanitizeProjectTaskGraphDetailValue(entry, seen);
    }
    seen.delete(value);
    return safe;
  }
  return value;
}

export function sanitizeProjectTaskGraphSettingsInfoForDetails(settingsInfo: ProjectTaskGraphSettingsInfo): ProjectTaskGraphSettingsInfo {
  const safeInfo: ProjectTaskGraphSettingsInfo = { loaded: settingsInfo.loaded };
  if (settingsInfo.path !== undefined) safeInfo.path = settingsInfo.path;
  if (settingsInfo.globalPath !== undefined) safeInfo.globalPath = settingsInfo.globalPath;
  if (settingsInfo.projectPath !== undefined) safeInfo.projectPath = settingsInfo.projectPath;
  if (settingsInfo.graphNames !== undefined) safeInfo.graphNames = [...settingsInfo.graphNames];
  if (settingsInfo.packagedGraphNames !== undefined) safeInfo.packagedGraphNames = [...settingsInfo.packagedGraphNames];
  if (settingsInfo.globalGraphNames !== undefined) safeInfo.globalGraphNames = [...settingsInfo.globalGraphNames];
  if (settingsInfo.projectGraphNames !== undefined) safeInfo.projectGraphNames = [...settingsInfo.projectGraphNames];
  if (settingsInfo.effectiveGraphNames !== undefined) safeInfo.effectiveGraphNames = [...settingsInfo.effectiveGraphNames];
  if (settingsInfo.graphSourceMap !== undefined) safeInfo.graphSourceMap = { ...settingsInfo.graphSourceMap };
  if (settingsInfo.disabledGraphNames !== undefined) safeInfo.disabledGraphNames = [...settingsInfo.disabledGraphNames];
  if (settingsInfo.disabledPackagedGraphNames !== undefined) safeInfo.disabledPackagedGraphNames = [...settingsInfo.disabledPackagedGraphNames];
  if (settingsInfo.settings !== undefined) safeInfo.settings = sanitizeProjectTaskGraphSettingsForDetails(settingsInfo.settings);
  return safeInfo;
}

function sanitizeProjectTaskGraphSettingsForDetails(settings: ProjectTaskGraphSettings): ProjectTaskGraphSettings {
  const safe: ProjectTaskGraphSettings = {};
  if (settings.routing !== undefined) {
    safe.routing = {};
    if (settings.routing.maxParallel !== undefined) safe.routing.maxParallel = settings.routing.maxParallel;
    if (settings.routing.defaultSubagentContext !== undefined) safe.routing.defaultSubagentContext = settings.routing.defaultSubagentContext;
    if (settings.routing.failureRoutes !== undefined) {
      safe.routing.failureRoutes = {};
      for (const [kind, route] of Object.entries(settings.routing.failureRoutes)) {
        if (route !== undefined) safe.routing.failureRoutes[kind as TaskKind] = { ...route };
      }
    }
    if (settings.routing.lockConflictGroups !== undefined) safe.routing.lockConflictGroups = { ...settings.routing.lockConflictGroups };
  }
  if (settings.defaultGraph !== undefined) safe.defaultGraph = settings.defaultGraph;
  if (settings.graphs !== undefined) {
    safe.graphs = {};
    for (const [name, graph] of Object.entries(settings.graphs)) {
      safe.graphs[name] = {
        description: graph.description,
        stages: graph.stages.map(sanitizeGraphStageForDetails),
      };
    }
  }
  if (settings.disabledGraphs !== undefined) safe.disabledGraphs = [...settings.disabledGraphs];
  if (settings.disabledPackagedGraphs !== undefined) safe.disabledPackagedGraphs = [...settings.disabledPackagedGraphs];
  return safe;
}

function sanitizeGraphStageForDetails(stage: CustomGraphStageSettings): CustomGraphStageSettings {
  const safeStage: CustomGraphStageSettings = { ...stage };
  delete safeStage.promptInstructions;
  if (stage.dependsOn !== undefined) safeStage.dependsOn = [...stage.dependsOn];
  if (stage.skills !== undefined) safeStage.skills = [...stage.skills];
  if (stage.expectedWritePaths !== undefined) safeStage.expectedWritePaths = [...stage.expectedWritePaths];
  if (stage.inputs !== undefined) safeStage.inputs = [...stage.inputs];
  if (stage.outputs !== undefined) safeStage.outputs = [...stage.outputs];
  if (stage.artifacts !== undefined) safeStage.artifacts = [...stage.artifacts];
  if (stage.acceptanceChecks !== undefined) safeStage.acceptanceChecks = [...stage.acceptanceChecks];
  if (stage.writeScope !== undefined) safeStage.writeScope = [...stage.writeScope];
  if (stage.isolationBoundary !== undefined) safeStage.isolationBoundary = [...stage.isolationBoundary];
  if (stage.descriptor !== undefined) safeStage.descriptor = {
    ...stage.descriptor,
    inputs: stage.descriptor.inputs ? [...stage.descriptor.inputs] : undefined,
    outputs: stage.descriptor.outputs ? [...stage.descriptor.outputs] : undefined,
    artifacts: stage.descriptor.artifacts ? [...stage.descriptor.artifacts] : undefined,
    acceptanceChecks: stage.descriptor.acceptanceChecks ? [...stage.descriptor.acceptanceChecks] : undefined,
    writeScope: stage.descriptor.writeScope ? [...stage.descriptor.writeScope] : undefined,
    isolationBoundary: stage.descriptor.isolationBoundary ? [...stage.descriptor.isolationBoundary] : undefined,
  };
  return safeStage;
}

export function isBuiltInGraphDisabled(settingsInfo: ProjectTaskGraphSettingsInfo, mode: RunMode) {
  return isBuiltinGraphDisabled(settingsInfo.settings, mode);
}

export function isProjectCustomGraphDisabled(settingsInfo: ProjectTaskGraphSettingsInfo, name: string) {
  return isCustomGraphDisabled(settingsInfo.settings, name);
}

function isBuiltinGraphDisabled(settings: ProjectTaskGraphSettings | undefined, mode: RunMode) {
  const disabled = settings?.disabledGraphs ?? [];
  return disabled.includes("*") || disabled.includes(mode) || disabled.includes(`builtin:${mode}`);
}

function isCustomGraphDisabled(settings: ProjectTaskGraphSettings | undefined, name: string) {
  const disabled = settings?.disabledGraphs ?? [];
  return disabled.includes("*") || disabled.includes("custom") || disabled.includes(name) || disabled.includes(`custom:${name}`);
}

export function renderProjectTaskGraphTemplates(settingsInfo: ProjectTaskGraphSettingsInfo) {
  const disabled = settingsInfo.disabledGraphNames ?? settingsInfo.settings?.disabledGraphs ?? [];
  const disabledPackaged = settingsInfo.disabledPackagedGraphNames ?? settingsInfo.settings?.disabledPackagedGraphs ?? [];
  const disabledLines = [
    ...(disabled.length ? [`Disabled by settings: ${disabled.join(", ")}`] : []),
    ...(disabledPackaged.length ? [`Disabled packaged presets: ${disabledPackaged.join(", ")}`] : []),
  ];
  const lines = [
    "Available task graph pipelines:",
    ...(disabledLines.length ? ["", ...disabledLines] : []),
    "",
    "## Built-in pipelines",
    ...renderBuiltInTaskGraphTemplates(settingsInfo),
  ];
  if (settingsInfo.settings?.defaultGraph) lines.push("", `Default custom graph: ${settingsInfo.settings.defaultGraph}`);

  const graphs = customGraphsForRendering(settingsInfo);
  const graphNames = customGraphNamesForRendering(settingsInfo, graphs);
  const bySource = groupGraphNamesBySource(settingsInfo, graphNames);

  lines.push("", "## Packaged custom presets");
  if (!bySource.packaged.length) {
    lines.push("No packaged custom presets enabled.");
  } else {
    lines.push(`Packaged presets (${bySource.packaged.length}):`);
    for (const name of bySource.packaged) {
      const graph = graphs[name];
      if (graph) lines.push(...renderCustomGraphTemplate(name, graph, "packaged", { concise: true }));
    }
  }

  lines.push("", "## Project/global custom templates");
  if (!settingsInfo.loaded) {
    lines.push(
      "No project task graph settings found.",
      "Add non-secret settings at `.pi/dev-suite/task-graph/settings.json` or `.pi/task-graph.json`.",
      'Define custom templates under `graphs` or `customGraphs`, then create one with `task_graph_create({ mode: "custom", input: "<task>", options: { customGraph: "name" } })`.',
    );
    return lines.join("\n");
  }

  lines.push(settingsInfo.projectPath ? `Loaded project task graph settings: ${settingsInfo.projectPath}` : settingsInfo.globalPath ? `Loaded global task graph settings: ${settingsInfo.globalPath}` : "Loaded task graph settings.");
  const settingsGraphNames = [...bySource.global, ...bySource.project, ...bySource.unknown];
  if (settingsGraphNames.length === 0) {
    lines.push(
      "No project/global custom task graph templates found.",
      'Define templates under `graphs/customGraphs`, then create one with `task_graph_create({ mode: "custom", input: "<task>", options: { customGraph: "name" } })`.',
    );
    return lines.join("\n");
  }

  lines.push(`Custom templates (${settingsGraphNames.length}):`);
  for (const name of settingsGraphNames) {
    const graph = graphs[name];
    if (graph) lines.push(...renderCustomGraphTemplate(name, graph, graphSourceForRendering(settingsInfo, name), { concise: false }));
  }
  return lines.join("\n");
}

function customGraphsForRendering(settingsInfo: ProjectTaskGraphSettingsInfo): Record<string, CustomGraphSettings> {
  if (settingsInfo.settings?.graphs) return settingsInfo.settings.graphs;
  if (!settingsInfo.loaded) return PACKAGED_CUSTOM_GRAPH_PRESETS;
  return {};
}

function customGraphNamesForRendering(settingsInfo: ProjectTaskGraphSettingsInfo, graphs: Record<string, CustomGraphSettings>) {
  const names = settingsInfo.effectiveGraphNames ?? settingsInfo.graphNames ?? Object.keys(graphs).filter((name) => !isCustomGraphDisabled(settingsInfo.settings, name));
  return names.filter((name) => graphs[name]).sort((a, b) => a.localeCompare(b));
}

function graphSourceForRendering(settingsInfo: ProjectTaskGraphSettingsInfo, name: string): CustomGraphSource | "unknown" {
  const source = settingsInfo.graphSourceMap?.[name];
  if (source) return source;
  if (!settingsInfo.loaded && name in PACKAGED_CUSTOM_GRAPH_PRESETS) return "packaged";
  return "project";
}

function groupGraphNamesBySource(settingsInfo: ProjectTaskGraphSettingsInfo, graphNames: string[]) {
  const grouped = { packaged: [] as string[], global: [] as string[], project: [] as string[], unknown: [] as string[] };
  for (const name of graphNames) {
    const source = graphSourceForRendering(settingsInfo, name);
    if (source === "packaged") grouped.packaged.push(name);
    else if (source === "global") grouped.global.push(name);
    else if (source === "project") grouped.project.push(name);
    else grouped.unknown.push(name);
  }
  return grouped;
}

function renderCustomGraphTemplate(name: string, graph: CustomGraphSettings, source: CustomGraphSource | "unknown", options: { concise: boolean }) {
  const lines = [
    "",
    `### ${name}`,
    `Source: ${source}`,
    `Description: ${graph.description?.trim() || "No description"}`,
    `Stage count: ${graph.stages.length}`,
  ];
  if (!graph.stages.length) {
    lines.push("Stages: none found in settings.");
  } else if (options.concise) {
    lines.push(`Stages: ${graph.stages.map((stage) => {
      const descriptor = descriptorInputFromStage(stage);
      return `${stage.id} (${stage.kind}${descriptor?.stableKey ? ` · ${descriptor.stableKey}` : ""})`;
    }).join(" → ")}`);
  } else {
    lines.push("Stages:");
    graph.stages.forEach((stage, index) => lines.push(...renderGraphStage(stage, index)));
  }
  lines.push(`Create: task_graph_create({ mode: "custom", input: "<task>", options: { customGraph: ${JSON.stringify(name)} } })`);
  return lines;
}

function renderBuiltInTaskGraphTemplates(settingsInfo: ProjectTaskGraphSettingsInfo) {
  const lines: string[] = [];
  const available = BUILT_IN_TASK_GRAPH_TEMPLATES.filter((item) => !isBuiltinGraphDisabled(settingsInfo.settings, item.mode));
  if (!available.length) return ["No built-in pipelines enabled."];
  for (const template of available) {
    lines.push(
      `### ${template.mode}`,
      `Description: ${template.description}`,
      `Stages: ${template.stages.join(" → ")}`,
      `Create: ${template.createHint ?? `task_graph_create({ mode: ${JSON.stringify(template.mode)}, input: "<task>" })`}`,
      "",
    );
  }
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function renderGraphStage(stage: CustomGraphStageSettings, index: number) {
  const lines = [`${index + 1}. ${stage.id} (${stage.kind})${stage.title ? ` — ${stage.title}` : ""}`];
  if (stage.description) lines.push(`   - description: ${stage.description}`);
  if (stage.dependsOn?.length) lines.push(`   - depends on ${stage.dependsOn.join(", ")}`);
  const hints = [
    stage.runnerKind ? `runner=${stage.runnerKind}` : undefined,
    stage.runnerName ? `runnerName=${stage.runnerName}` : undefined,
    stage.subagentType ? `subagent=${stage.subagentType}` : undefined,
    stage.context ? `context=${stage.context}` : undefined,
    stage.sideEffects ? `side effects=${stage.sideEffects}` : undefined,
  ].filter((hint): hint is string => Boolean(hint));
  if (hints.length) lines.push(`   - hints: ${hints.join("; ")}`);
  if (stage.expectedWritePaths?.length) lines.push(`   - expected write paths: ${stage.expectedWritePaths.join(", ")}`);
  const descriptor = descriptorInputFromStage(stage);
  if (descriptor) {
    if (descriptor.stableKey || stage.stableKey) lines.push(`   - descriptor stable key: ${descriptor.stableKey ?? stage.stableKey}`);
    if (descriptor.purpose || stage.purpose) lines.push(`   - descriptor purpose: ${descriptor.purpose ?? stage.purpose}`);
    const descriptorCounts = [
      descriptor.inputs?.length ? `inputs:${descriptor.inputs.length}` : undefined,
      descriptor.outputs?.length ? `outputs:${descriptor.outputs.length}` : undefined,
      descriptor.artifacts?.length ? `artifacts:${descriptor.artifacts.length}` : undefined,
      descriptor.acceptanceChecks?.length ? `checks:${descriptor.acceptanceChecks.length}` : undefined,
      descriptor.writeScope?.length ? `writeScope:${descriptor.writeScope.length}` : undefined,
      descriptor.isolationBoundary?.length ? `isolation:${descriptor.isolationBoundary.length}` : undefined,
    ].filter((item): item is string => Boolean(item));
    if (descriptorCounts.length) lines.push(`   - descriptor fields: ${descriptorCounts.join("; ")}`);
  }
  if (stage.skills?.length) lines.push(`   - skills: ${stage.skills.join(", ")}`);
  return lines;
}

function resolveProjectSettingsPath(cwd: string, settingsPath: string) {
  const resolved = path.resolve(cwd, settingsPath);
  const relative = path.relative(cwd, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Task graph settingsPath must stay within the project cwd: ${settingsPath}`);
  }
  assertRealPathWithinProject(cwd, resolved, settingsPath);
  return resolved;
}

function assertRealPathWithinProject(cwd: string, file: string, label = file) {
  const realCwd = fs.realpathSync(cwd);
  const realFile = fs.realpathSync(file);
  const relative = path.relative(realCwd, realFile);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Task graph settings file must resolve within the project cwd: ${label}`);
  }
}

export function validateProjectSettings(value: unknown, source = "task graph settings"): ProjectTaskGraphSettings {
  if (!isRecord(value)) throw new Error(`${source}: settings must be a JSON object`);
  const input = value as Record<string, unknown>;
  const settings: ProjectTaskGraphSettings = {};

  if (input.agentInstructions !== undefined) settings.agentInstructions = normalizeInstructionMap(input.agentInstructions, `${source}.agentInstructions`);
  if (input.instructions !== undefined) settings.agentInstructions = { ...(settings.agentInstructions ?? {}), ...normalizeInstructionMap(input.instructions, `${source}.instructions`) };
  if (input.routing !== undefined) settings.routing = normalizeRouting(input.routing, `${source}.routing`);
  if (input.graphs !== undefined) settings.graphs = normalizeGraphs(input.graphs, `${source}.graphs`);
  if (input.defaultGraph !== undefined) {
    if (typeof input.defaultGraph !== "string" || !input.defaultGraph.trim()) throw new Error(`${source}.defaultGraph must be a non-empty string`);
    settings.defaultGraph = input.defaultGraph.trim();
  }
  if (input.disabledGraphs !== undefined) settings.disabledGraphs = normalizeStringArray(input.disabledGraphs, `${source}.disabledGraphs`, { allowString: true });
  if (input.disabledGraphNames !== undefined) settings.disabledGraphs = [...(settings.disabledGraphs ?? []), ...normalizeStringArray(input.disabledGraphNames, `${source}.disabledGraphNames`, { allowString: true })];
  if (input.disabledPackagedGraphs !== undefined) settings.disabledPackagedGraphs = normalizeStringArray(input.disabledPackagedGraphs, `${source}.disabledPackagedGraphs`, { allowString: true });
  if (input.disabledPackagedGraphNames !== undefined) settings.disabledPackagedGraphs = [...(settings.disabledPackagedGraphs ?? []), ...normalizeStringArray(input.disabledPackagedGraphNames, `${source}.disabledPackagedGraphNames`, { allowString: true })];
  if (input.customGraphs !== undefined) {
    const customGraphs = normalizeGraphs(input.customGraphs, `${source}.customGraphs`);
    for (const name of Object.keys(customGraphs)) {
      if (settings.graphs?.[name]) throw new Error(`${source}: duplicate custom graph name ${name}`);
    }
    settings.graphs = { ...(settings.graphs ?? {}), ...customGraphs };
  }

  for (const key of Object.keys(input)) {
    if (!["agentInstructions", "instructions", "routing", "graphs", "customGraphs", "defaultGraph", "disabledGraphs", "disabledGraphNames", "disabledPackagedGraphs", "disabledPackagedGraphNames"].includes(key)) {
      // Forward compatible: ignore unknown top-level keys rather than making settings brittle.
    }
  }
  return settings;
}

function normalizeInstructionMap(value: unknown, label: string) {
  if (!isRecord(value)) throw new Error(`${label} must be an object whose values are strings or string arrays`);
  const out: Record<string, string[]> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!key.trim()) throw new Error(`${label} contains an empty instruction selector`);
    out[key] = normalizeStringArray(entry, `${label}.${key}`, { allowString: true, maxLength: 12000 });
  }
  return out;
}

function normalizeRouting(value: unknown, label: string): NonNullable<ProjectTaskGraphSettings["routing"]> {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  const input = value as Record<string, unknown>;
  const routing: NonNullable<ProjectTaskGraphSettings["routing"]> = {};
  if (input.maxParallel !== undefined) routing.maxParallel = boundedInteger(input.maxParallel, `${label}.maxParallel`, 1, 8);
  if (input.defaultSubagentContext !== undefined) routing.defaultSubagentContext = enumValue(input.defaultSubagentContext, CONTEXTS, `${label}.defaultSubagentContext`);
  if (input.failureRoutes !== undefined) {
    if (!isRecord(input.failureRoutes)) throw new Error(`${label}.failureRoutes must be an object keyed by task kind`);
    routing.failureRoutes = {};
    for (const [kind, route] of Object.entries(input.failureRoutes)) {
      assertTaskKind(kind, `${label}.failureRoutes`);
      routing.failureRoutes[kind as TaskKind] = normalizeRouteOverride(route, `${label}.failureRoutes.${kind}`);
    }
  }
  if (input.lockConflictGroups !== undefined) {
    if (!isRecord(input.lockConflictGroups)) throw new Error(`${label}.lockConflictGroups must be an object keyed by task kind`);
    routing.lockConflictGroups = {};
    for (const [kind, group] of Object.entries(input.lockConflictGroups)) {
      assertTaskKind(kind, `${label}.lockConflictGroups`);
      if (typeof group !== "string" || !group.trim()) throw new Error(`${label}.lockConflictGroups.${kind} must be a non-empty string`);
      routing.lockConflictGroups[kind as TaskKind] = group.trim();
    }
  }
  return routing;
}

function normalizeRouteOverride(value: unknown, label: string) {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  const input = value as Record<string, unknown>;
  const out: Partial<RouteMetadata> = {};
  if (input.onFailure !== undefined) out.onFailure = enumValue(input.onFailure, ROUTE_ACTIONS, `${label}.onFailure`);
  if (input.maxCodeIterations !== undefined) out.maxCodeIterations = boundedInteger(input.maxCodeIterations, `${label}.maxCodeIterations`, 0, 20);
  if (input.maxEnvironmentalRetries !== undefined) out.maxEnvironmentalRetries = boundedInteger(input.maxEnvironmentalRetries, `${label}.maxEnvironmentalRetries`, 0, 20);
  return out;
}

function normalizeGraphs(value: unknown, label: string): NonNullable<ProjectTaskGraphSettings["graphs"]> {
  if (!isRecord(value)) throw new Error(`${label} must be an object keyed by graph name`);
  const graphs: NonNullable<ProjectTaskGraphSettings["graphs"]> = {};
  for (const [name, graph] of Object.entries(value)) {
    if (!name.trim()) throw new Error(`${label} contains an empty graph name`);
    if (graphs[name]) throw new Error(`${label} contains duplicate graph name ${name}`);
    if (!isRecord(graph)) throw new Error(`${label}.${name} must be an object`);
    const g = graph as Record<string, unknown>;
    const stages = Array.isArray(g.stages) ? g.stages : undefined;
    if (!stages?.length) throw new Error(`${label}.${name}.stages must be a non-empty array`);
    const seen = new Set<string>();
    const normalizedStages = stages.map((stage, index) => normalizeGraphStage(stage, `${label}.${name}.stages[${index}]`, seen, index));
    validateGraphDependencies(normalizedStages, `${label}.${name}`);
    graphs[name] = {
      description: typeof g.description === "string" ? g.description : undefined,
      stages: normalizedStages,
    };
  }
  return graphs;
}

function normalizeDescriptorFieldArray(input: Record<string, unknown>, key: "inputs" | "outputs" | "artifacts" | "acceptanceChecks" | "writeScope" | "isolationBoundary", label: string) {
  return input[key] === undefined ? undefined : normalizeDescriptorList(normalizeStringArray(input[key], `${label}.${key}`));
}

function normalizeGraphStage(value: unknown, label: string, seen: Set<string>, index: number) {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  const input = value as Record<string, unknown>;
  const id = typeof input.id === "string" && input.id.trim() ? input.id.trim() : `stage-${index + 1}`;
  if (seen.has(id)) throw new Error(`${label}.id duplicates stage id ${id}`);
  seen.add(id);
  const kind = enumValue(input.kind, TASK_KINDS, `${label}.kind`);
  const dependsOn = input.dependsOn === undefined ? undefined : normalizeStringArray(input.dependsOn, `${label}.dependsOn`);
  const skills = input.skills === undefined ? undefined : normalizeStringArray(input.skills, `${label}.skills`);
  const expectedWritePaths = input.expectedWritePaths === undefined ? undefined : normalizeStringArray(input.expectedWritePaths, `${label}.expectedWritePaths`);
  const promptInstructions = input.promptInstructions === undefined ? undefined : normalizeStringArray(input.promptInstructions, `${label}.promptInstructions`, { allowString: true, maxLength: 12000 });
  const descriptor = input.descriptor === undefined ? undefined : normalizeDescriptorInput(input.descriptor, `${label}.descriptor`);
  if (input.stableKey !== undefined && (typeof input.stableKey !== "string" || !input.stableKey.trim())) throw new Error(`${label}.stableKey must be a non-empty string`);
  const stableKey = input.stableKey === undefined ? undefined : normalizeStableKey(input.stableKey as string);
  const purpose = input.purpose === undefined ? undefined : normalizeDescriptorText(String(input.purpose));
  if (input.purpose !== undefined && (typeof input.purpose !== "string" || !purpose)) throw new Error(`${label}.purpose must be a non-empty string`);
  const order = input.order === undefined ? undefined : boundedInteger(input.order, `${label}.order`, 1, 10000);
  return {
    id,
    kind,
    title: typeof input.title === "string" && input.title.trim() ? input.title.trim() : undefined,
    description: typeof input.description === "string" && input.description.trim() ? input.description.trim() : undefined,
    priority: input.priority === undefined ? undefined : enumValue(input.priority, PRIORITIES, `${label}.priority`),
    dependsOn,
    runnerKind: input.runnerKind === undefined ? undefined : enumValue(input.runnerKind, RUNNER_KINDS, `${label}.runnerKind`),
    runnerName: typeof input.runnerName === "string" && input.runnerName.trim() ? input.runnerName.trim() : undefined,
    sideEffects: input.sideEffects === undefined ? undefined : enumValue(input.sideEffects, SIDE_EFFECTS, `${label}.sideEffects`),
    subagentType: typeof input.subagentType === "string" && input.subagentType.trim() ? input.subagentType.trim() : undefined,
    skills,
    context: input.context === undefined ? undefined : enumValue(input.context, CONTEXTS, `${label}.context`),
    conflictGroup: typeof input.conflictGroup === "string" && input.conflictGroup.trim() ? input.conflictGroup.trim() : undefined,
    expectedWritePaths,
    promptInstructions,
    descriptor,
    stableKey,
    purpose,
    inputs: normalizeDescriptorFieldArray(input, "inputs", label),
    outputs: normalizeDescriptorFieldArray(input, "outputs", label),
    artifacts: normalizeDescriptorFieldArray(input, "artifacts", label),
    acceptanceChecks: normalizeDescriptorFieldArray(input, "acceptanceChecks", label),
    writeScope: normalizeDescriptorFieldArray(input, "writeScope", label),
    isolationBoundary: normalizeDescriptorFieldArray(input, "isolationBoundary", label),
    order,
  };
}

function validateGraphDependencies(stages: Array<{ id: string; dependsOn?: string[] }>, label: string) {
  const ids = new Set(stages.map((stage) => stage.id));
  for (const stage of stages) {
    for (const dep of stage.dependsOn ?? []) {
      if (!ids.has(dep)) throw new Error(`${label}: stage ${stage.id} depends on unknown stage ${dep}`);
    }
  }
  const byId = new Map(stages.map((stage) => [stage.id, stage]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string, path: string[]) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new Error(`${label}: dependency cycle ${[...path, id].join(" -> ")}`);
    visiting.add(id);
    for (const dep of byId.get(id)?.dependsOn ?? []) visit(dep, [...path, id]);
    visiting.delete(id);
    visited.add(id);
  };
  for (const stage of stages) visit(stage.id, []);
}

function normalizeStringArray(value: unknown, label: string, options: { allowString?: boolean; maxLength?: number } = {}) {
  const values = typeof value === "string" && options.allowString ? [value] : value;
  if (!Array.isArray(values)) throw new Error(`${label} must be ${options.allowString ? "a string or " : ""}an array of strings`);
  return values.map((entry, index) => {
    if (typeof entry !== "string" || !entry.trim()) throw new Error(`${label}[${index}] must be a non-empty string`);
    const trimmed = entry.trim();
    if (options.maxLength !== undefined && trimmed.length > options.maxLength) throw new Error(`${label}[${index}] is too long; max ${options.maxLength} characters`);
    return trimmed;
  });
}

function boundedInteger(value: unknown, label: string, min: number, max: number) {
  if (!Number.isInteger(value) || typeof value !== "number" || value < min || value > max) throw new Error(`${label} must be an integer between ${min} and ${max}`);
  return value;
}

function enumValue<T extends readonly string[]>(value: unknown, allowed: T, label: string): T[number] {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) throw new Error(`${label} must be one of: ${allowed.join(", ")}`);
  return value as T[number];
}

function assertTaskKind(value: string, label: string) {
  if (!(TASK_KINDS as readonly string[]).includes(value)) throw new Error(`${label} uses unknown task kind ${value}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
