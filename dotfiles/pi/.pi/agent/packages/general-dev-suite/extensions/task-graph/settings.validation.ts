import { loadProjectSettings, renderProjectTaskGraphTemplates, sanitizeProjectTaskGraphSettingsInfoForDetails, validateProjectSettings } from "./settings";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function assertThrows(label: string, fn: () => unknown) {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(`${label}: expected validation to throw`);
}

const valid = validateProjectSettings({
  agentInstructions: {
    all: "Use project-local commands.",
    "unit-tester": ["Run focused tests first."],
  },
  routing: {
    maxParallel: 2,
    defaultSubagentContext: "fresh",
    failureRoutes: {
      UNIT_TEST: { onFailure: "route_to_implement", maxCodeIterations: 2 },
    },
    lockConflictGroups: {
      IMPLEMENT: "workspace-write",
    },
  },
  graphs: {
    smoke: {
      description: "Fast smoke workflow",
      stages: [
        { id: "impl", kind: "IMPLEMENT", title: "Implement", description: "Make the change", subagentType: "implementer", expectedWritePaths: ["src/**"], skills: ["tdd"], promptInstructions: "Never print this free-form prompt." },
        { id: "test", kind: "UNIT_TEST", description: "Run focused tests", dependsOn: ["impl"], subagentType: "unit-tester", context: "fresh", sideEffects: "shell" },
      ],
    },
  },
});

assert(valid.routing?.maxParallel === 2, "valid settings should preserve routing.maxParallel");
assert(valid.graphs?.smoke.description === "Fast smoke workflow", "valid settings should preserve graph description");
assert(valid.graphs?.smoke.stages.length === 2, "valid settings should preserve graph stages");

const disabled = validateProjectSettings({ defaultGraph: "smoke", disabledGraphs: ["do", "custom:smoke"], disabledPackagedGraphs: ["common-lisp-asdf"] });
assert(disabled.defaultGraph === "smoke", "valid settings should preserve defaultGraph");
assert(disabled.disabledGraphs?.join(",") === "do,custom:smoke", "valid settings should preserve disabledGraphs");
assert(disabled.disabledPackagedGraphs?.join(",") === "common-lisp-asdf", "valid settings should preserve disabledPackagedGraphs");

const customGraphs = validateProjectSettings({
  customGraphs: {
    smoke: {
      description: "Custom smoke workflow",
      stages: [{ id: "impl", kind: "IMPLEMENT" }],
    },
  },
});
assert(customGraphs.graphs?.smoke.description === "Custom smoke workflow", "customGraphs should normalize into graphs");

const rendered = renderProjectTaskGraphTemplates({ loaded: true, path: "/tmp/settings.json", graphNames: ["smoke"], settings: valid });
assert(rendered.includes("Built-in pipelines"), "renderer should include built-in pipelines section");
assert(rendered.includes("### do") && rendered.includes('mode: "do"'), "renderer should include built-in do graph");
assert(rendered.includes("### todo") && rendered.includes('mode: "todo"'), "renderer should include built-in todo graph");
assert(rendered.includes("Project/global custom templates"), "renderer should include custom templates section");
assert(rendered.includes("smoke"), "renderer should include graph name");
assert(rendered.includes("Fast smoke workflow"), "renderer should include graph description");
assert(rendered.includes("impl") && rendered.includes("IMPLEMENT"), "renderer should include implementation stage");
assert(rendered.includes("test") && rendered.includes("UNIT_TEST"), "renderer should include unit test stage");
assert(rendered.includes("depends on impl"), "renderer should include stage dependencies");
assert(rendered.includes("task_graph_create"), "renderer should include creation hint");
assert(rendered.includes('customGraph: "smoke"'), "renderer should include customGraph creation option");
assert(!rendered.includes("Never print this free-form prompt"), "renderer should not dump promptInstructions contents");

const detailsSafe = sanitizeProjectTaskGraphSettingsInfoForDetails({ loaded: true, path: "/tmp/settings.json", graphNames: ["smoke"], settings: valid });
const detailsJson = JSON.stringify(detailsSafe);
const detailsStage = detailsSafe.settings?.graphs?.smoke.stages[0];
const detailsDependentStage = detailsSafe.settings?.graphs?.smoke.stages[1];
assert(detailsSafe.loaded, "details sanitizer should preserve loaded status");
assert(detailsSafe.path === "/tmp/settings.json", "details sanitizer should preserve settings path");
assert(detailsSafe.graphNames?.[0] === "smoke", "details sanitizer should preserve graph names");
assert(detailsStage?.id === "impl" && detailsStage.kind === "IMPLEMENT", "details sanitizer should preserve stage identity");
assert(detailsStage?.title === "Implement", "details sanitizer should preserve stage title");
assert(detailsStage?.expectedWritePaths?.[0] === "src/**", "details sanitizer should preserve stage metadata");
assert(detailsDependentStage?.dependsOn?.[0] === "impl", "details sanitizer should preserve dependencies");
assert(!("promptInstructions" in (detailsStage ?? {})), "details sanitizer should omit promptInstructions field");
assert(!detailsJson.includes("Never print this free-form prompt"), "details sanitizer should not expose promptInstructions contents");

const disabledRendered = renderProjectTaskGraphTemplates({ loaded: true, path: "/tmp/settings.json", graphNames: [], disabledGraphNames: ["do", "custom:smoke"], settings: { ...valid, defaultGraph: "smoke", disabledGraphs: ["do", "custom:smoke"] } });
assert(disabledRendered.includes("Default custom graph: smoke"), "renderer should show default graph");
assert(disabledRendered.includes("Disabled by settings: do, custom:smoke"), "renderer should show disabled graphs");
assert(!disabledRendered.includes("### do"), "renderer should omit disabled built-in graphs");
assert(disabledRendered.includes("### todo"), "renderer should keep enabled built-in graphs");
assert(!disabledRendered.includes("### smoke"), "renderer should omit disabled custom graphs");

const missingSettingsRendered = renderProjectTaskGraphTemplates({ loaded: false });
assert(missingSettingsRendered.includes("### do") && missingSettingsRendered.includes("### todo"), "missing settings renderer should still list built-in graphs");
assert(missingSettingsRendered.includes("Packaged custom presets"), "missing settings renderer should list packaged presets");
assert(missingSettingsRendered.includes("common-lisp-asdf") && missingSettingsRendered.includes("common-lisp-clim-tui"), "missing settings renderer should include Common Lisp presets");
assert(!missingSettingsRendered.includes("Do not assume Quicklisp is present unless the project already uses it."), "missing settings renderer should not leak packaged promptInstructions");
assert(missingSettingsRendered.includes(".pi/dev-suite/task-graph/settings.json"), "missing settings message should mention preferred settings path");
const emptySettingsRendered = renderProjectTaskGraphTemplates({ loaded: true, path: "/tmp/settings.json", settings: {} });
assert(emptySettingsRendered.includes("### do") && emptySettingsRendered.includes("### todo"), "empty settings renderer should still list built-in graphs");
assert(emptySettingsRendered.includes("graphs/customGraphs"), "empty settings message should mention graph keys");

assertThrows("bad task kind", () => validateProjectSettings({ routing: { failureRoutes: { NOT_A_KIND: { onFailure: "stop_for_user" } } } }));
assertThrows("bad route", () => validateProjectSettings({ routing: { failureRoutes: { UNIT_TEST: { onFailure: "loop_forever" } } } }));
assertThrows("duplicate custom graph name", () => validateProjectSettings({
  graphs: { smoke: { stages: [{ id: "impl", kind: "IMPLEMENT" }] } },
  customGraphs: { smoke: { stages: [{ id: "test", kind: "UNIT_TEST" }] } },
}));
assertThrows("unknown graph dependency", () => validateProjectSettings({ graphs: { bad: { stages: [{ id: "a", kind: "IMPLEMENT", dependsOn: ["missing"] }] } } }));
assertThrows("graph cycle", () => validateProjectSettings({ graphs: { bad: { stages: [{ id: "a", kind: "IMPLEMENT", dependsOn: ["b"] }, { id: "b", kind: "UNIT_TEST", dependsOn: ["a"] }] } } }));

const mergeTmp = fs.mkdtempSync(path.join(os.tmpdir(), "task-graph-merge-"));
const oldHome = process.env.HOME;
const oldGlobalSettings = process.env.PI_TASK_GRAPH_GLOBAL_SETTINGS;
delete process.env.PI_TASK_GRAPH_GLOBAL_SETTINGS;
process.env.HOME = path.join(mergeTmp, "home");
fs.mkdirSync(path.join(process.env.HOME, ".pi", "dev-suite", "task-graph"), { recursive: true });
fs.writeFileSync(path.join(process.env.HOME, ".pi", "dev-suite", "task-graph", "settings.json"), JSON.stringify({
  defaultGraph: "global-default",
  disabledGraphs: ["do"],
  routing: {
    maxParallel: 4,
    failureRoutes: {
      COMPILE: { onFailure: "stop_for_user", maxEnvironmentalRetries: 1 },
      UNIT_TEST: { onFailure: "retry_same_stage", maxEnvironmentalRetries: 7 },
    },
    lockConflictGroups: {
      IMPLEMENT: "global-write",
      UNIT_TEST: "global-test",
    },
  },
}));
fs.mkdirSync(path.join(mergeTmp, "project", ".pi", "dev-suite", "task-graph"), { recursive: true });
fs.writeFileSync(path.join(mergeTmp, "project", ".pi", "dev-suite", "task-graph", "settings.json"), JSON.stringify({
  defaultGraph: "smoke",
  disabledGraphs: ["custom:smoke"],
  routing: {
    defaultSubagentContext: "fork",
    failureRoutes: {
      CODE_REVIEW: { onFailure: "stop_for_user", maxCodeIterations: 1 },
      UNIT_TEST: { maxCodeIterations: 5 },
    },
    lockConflictGroups: {
      CODE_REVIEW: "project-review",
      IMPLEMENT: "project-write",
    },
  },
  graphs: { smoke: { stages: [{ id: "impl", kind: "IMPLEMENT" }] } },
}));
const mergedInfo = loadProjectSettings(path.join(mergeTmp, "project"));
assert(mergedInfo.globalPath?.endsWith("settings.json"), "loadProjectSettings should load global settings");
assert(mergedInfo.projectPath?.endsWith("settings.json"), "loadProjectSettings should load project settings");
assert(mergedInfo.settings?.defaultGraph === "smoke", "project defaultGraph should override global defaultGraph");
assert(mergedInfo.disabledGraphNames?.includes("do") && mergedInfo.disabledGraphNames.includes("custom:smoke"), "global and project disabled graphs should merge");
assert(mergedInfo.settings?.routing?.maxParallel === 4, "global routing scalar should survive when project routing omits it");
assert(mergedInfo.settings?.routing?.defaultSubagentContext === "fork", "project routing scalar should override/add global routing");
assert(mergedInfo.settings?.routing?.failureRoutes?.COMPILE?.onFailure === "stop_for_user", "global failureRoutes kind should survive project routing merge");
assert(mergedInfo.settings?.routing?.failureRoutes?.CODE_REVIEW?.onFailure === "stop_for_user", "project failureRoutes kind should be added during routing merge");
assert(mergedInfo.settings?.routing?.failureRoutes?.UNIT_TEST?.onFailure === "retry_same_stage", "project same-kind partial failureRoutes should preserve global onFailure");
assert(mergedInfo.settings?.routing?.failureRoutes?.UNIT_TEST?.maxEnvironmentalRetries === 7, "project same-kind partial failureRoutes should preserve global maxEnvironmentalRetries");
assert(mergedInfo.settings?.routing?.failureRoutes?.UNIT_TEST?.maxCodeIterations === 5, "project same-kind partial failureRoutes should add project maxCodeIterations");
assert(mergedInfo.settings?.routing?.lockConflictGroups?.UNIT_TEST === "global-test", "global lockConflictGroups kind should survive project routing merge");
assert(mergedInfo.settings?.routing?.lockConflictGroups?.CODE_REVIEW === "project-review", "project lockConflictGroups kind should be added during routing merge");
assert(mergedInfo.settings?.routing?.lockConflictGroups?.IMPLEMENT === "project-write", "project lockConflictGroups should override the same global kind");
assert(mergedInfo.packagedGraphNames?.includes("common-lisp-asdf"), "packaged graph metadata should be present when settings files load");
assert(mergedInfo.effectiveGraphNames?.includes("common-lisp-asdf"), "packaged graph should be effective when not disabled");
assert(mergedInfo.graphSourceMap?.["common-lisp-asdf"] === "packaged", "packaged graph source should be recorded");
assert(!mergedInfo.graphNames?.includes("smoke"), "disabled custom graph should be filtered from graphNames");
if (oldHome === undefined) delete process.env.HOME; else process.env.HOME = oldHome;
if (oldGlobalSettings === undefined) delete process.env.PI_TASK_GRAPH_GLOBAL_SETTINGS; else process.env.PI_TASK_GRAPH_GLOBAL_SETTINGS = oldGlobalSettings;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "task-graph-settings-"));
assertThrows("settings path escapes cwd", () => loadProjectSettings(tmp, { settingsPath: "../outside.json", ignoreGlobalSettings: true }));
const outside = path.join(os.tmpdir(), `task-graph-outside-${Date.now()}.json`);
fs.writeFileSync(outside, "{}\n");
const link = path.join(tmp, "settings-link.json");
try {
  fs.symlinkSync(outside, link);
  assertThrows("settings symlink escapes cwd", () => loadProjectSettings(tmp, { settingsPath: "settings-link.json", ignoreGlobalSettings: true }));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "EPERM" && (error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
}

console.log("task graph settings validation passed");
