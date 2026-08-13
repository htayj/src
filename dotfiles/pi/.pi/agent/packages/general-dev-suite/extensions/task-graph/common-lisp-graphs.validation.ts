import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { renderStatus, renderTaskGraphWidget } from "./display";
import { createRun } from "./formulas";
import { PACKAGED_CUSTOM_GRAPH_PRESETS, PACKAGED_CUSTOM_GRAPH_PRESET_NAMES } from "./graph-presets";
import { buildTaskPrompt } from "./scheduler";
import { loadProjectSettings, renderProjectTaskGraphTemplates, sanitizeProjectTaskGraphDetails, sanitizeProjectTaskGraphSettingsInfoForDetails, validateProjectSettings } from "./settings";
import { openTaskGraphUi, sanitizeTaskMetadataForDetails } from "./ui";

const ASDF = "common-lisp-asdf";
const CLIM_TUI = "common-lisp-clim-tui";
const ORIGINAL_SENTINEL = "ORIGINAL-LISP-REQUEST-SENTINEL";
const PROMPT_SENTINEL = "Do not assume Quicklisp is present unless the project already uses it.";

function assertIncludes(haystack: string, needle: string, message: string) {
  assert(haystack.includes(needle), `${message}\nMissing: ${needle}\nIn:\n${haystack}`);
}

function assertNotIncludes(haystack: string, needle: string, message: string) {
  assert(!haystack.includes(needle), `${message}\nUnexpected: ${needle}\nIn:\n${haystack}`);
}

for (const name of [ASDF, CLIM_TUI]) {
  assert(PACKAGED_CUSTOM_GRAPH_PRESET_NAMES.includes(name), `${name} should be a packaged preset name`);
  const graph = PACKAGED_CUSTOM_GRAPH_PRESETS[name];
  assert(graph, `${name} should exist`);
  validateProjectSettings({ graphs: { [name]: graph } });
  assert(graph.stages.length >= 5, `${name} should have a complete workflow`);
  assert(new Set(graph.stages.map((stage) => stage.id)).size === graph.stages.length, `${name} stage ids should be unique`);
  const packed = JSON.stringify(graph);
  for (const forbidden of ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "token=", "/home/tay/", "~/.ssh"]) {
    assertNotIncludes(packed, forbidden, `${name} preset should not contain secret/local-path marker ${forbidden}`);
  }
}

const oldHome = process.env.HOME;
const oldGlobalSettings = process.env.PI_TASK_GRAPH_GLOBAL_SETTINGS;
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "task-graph-common-lisp-"));
process.env.HOME = path.join(tmpRoot, "home");
delete process.env.PI_TASK_GRAPH_GLOBAL_SETTINGS;
fs.mkdirSync(process.env.HOME, { recursive: true });

try {
  const emptyProject = path.join(tmpRoot, "empty-project");
  fs.mkdirSync(emptyProject, { recursive: true });
  const noSettings = loadProjectSettings(emptyProject, { ignoreGlobalSettings: true });
  assert.equal(noSettings.loaded, false, "packaged presets must not make settingsInfo.loaded true");
  assert(noSettings.packagedGraphNames?.includes(ASDF), "no-settings load should expose ASDF packaged preset metadata");
  assert(noSettings.packagedGraphNames?.includes(CLIM_TUI), "no-settings load should expose CLIM/TUI packaged preset metadata");
  assert(noSettings.effectiveGraphNames?.includes(ASDF), "ASDF preset should be effective without settings");
  assert(noSettings.effectiveGraphNames?.includes(CLIM_TUI), "CLIM/TUI preset should be effective without settings");
  assert.equal(noSettings.graphSourceMap?.[ASDF], "packaged", "ASDF source should be packaged");
  assert.equal(noSettings.projectGraphNames?.length ?? 0, 0, "no-settings project graph metadata should be empty");

  const rendered = renderProjectTaskGraphTemplates(noSettings);
  assertIncludes(rendered, "Packaged custom presets", "renderer should include packaged presets section");
  assertIncludes(rendered, "Common Lisp", "renderer should mention Common Lisp presets");
  assertIncludes(rendered, "ASDF", "renderer should mention ASDF");
  assertIncludes(rendered, "SBCL", "renderer should mention SBCL fallback guidance summary");
  assertIncludes(rendered, "FiveAM", "renderer should mention FiveAM fallback guidance summary");
  assertIncludes(rendered, "CLIM/TUI", "renderer should mention CLIM/TUI preset");
  assertIncludes(rendered, 'customGraph: "common-lisp-asdf"', "renderer should include copyable ASDF customGraph create hint");
  assertNotIncludes(rendered, PROMPT_SENTINEL, "renderer should not dump packaged promptInstructions");

  const details = JSON.stringify(sanitizeProjectTaskGraphSettingsInfoForDetails(noSettings));
  assertIncludes(details, ASDF, "settings details should expose packaged preset names");
  assertNotIncludes(details, PROMPT_SENTINEL, "settings details should not expose packaged promptInstructions");

  const disabledProject = path.join(tmpRoot, "disabled-project");
  fs.mkdirSync(path.join(disabledProject, ".pi", "dev-suite", "task-graph"), { recursive: true });
  fs.writeFileSync(path.join(disabledProject, ".pi", "dev-suite", "task-graph", "settings.json"), `${JSON.stringify({ disabledGraphs: [`custom:${CLIM_TUI}`] })}\n`);
  const disabledInfo = loadProjectSettings(disabledProject, { ignoreGlobalSettings: true });
  assert(disabledInfo.effectiveGraphNames?.includes(ASDF), "disabling CLIM/TUI should leave ASDF preset enabled");
  assert(!disabledInfo.effectiveGraphNames?.includes(CLIM_TUI), "custom:<name> token should filter disabled packaged preset from effective graphs");
  const disabledRendered = renderProjectTaskGraphTemplates(disabledInfo);
  assertNotIncludes(disabledRendered, `### ${CLIM_TUI}`, "disabled packaged preset should not render as an available graph");

  const disabledPackagedProject = path.join(tmpRoot, "disabled-packaged-project");
  fs.mkdirSync(path.join(disabledPackagedProject, ".pi", "dev-suite", "task-graph"), { recursive: true });
  fs.writeFileSync(path.join(disabledPackagedProject, ".pi", "dev-suite", "task-graph", "settings.json"), `${JSON.stringify({ disabledPackagedGraphs: [ASDF] })}\n`);
  const disabledPackagedInfo = loadProjectSettings(disabledPackagedProject, { ignoreGlobalSettings: true });
  assert(!disabledPackagedInfo.effectiveGraphNames?.includes(ASDF), "disabledPackagedGraphs should remove packaged preset when no override exists");

  const overrideProject = path.join(tmpRoot, "override-project");
  fs.mkdirSync(path.join(overrideProject, ".pi", "dev-suite", "task-graph"), { recursive: true });
  fs.writeFileSync(path.join(overrideProject, ".pi", "dev-suite", "task-graph", "settings.json"), `${JSON.stringify({
    disabledPackagedGraphs: [ASDF],
    graphs: {
      [ASDF]: {
        description: "Project override ASDF graph",
        stages: [{ id: "project-plan", kind: "PLAN", description: "Project-specific ASDF planning" }],
      },
    },
  })}\n`);
  const overrideInfo = loadProjectSettings(overrideProject, { ignoreGlobalSettings: true });
  assert(overrideInfo.projectGraphNames?.includes(ASDF), "project graph names should include override");
  assert(overrideInfo.effectiveGraphNames?.includes(ASDF), "project override should remain effective even when packaged preset is disabled");
  assert.equal(overrideInfo.graphSourceMap?.[ASDF], "project", "project override should replace packaged source");

  const { settings, ...persistedSettingsInfo } = noSettings;
  const run = createRun(emptyProject, "custom", `Add a public helper to the foo ASDF system and test it. ${ORIGINAL_SENTINEL}`, { customGraph: ASDF, maxParallel: 1 }, { dirtyAtStart: [] }, settings, persistedSettingsInfo);
  assert.equal(run.mode, "custom", "created run should be custom mode");
  assert.equal(run.config.customGraphName, ASDF, "run config should record custom graph name");
  assert.equal(run.config.customGraphSource, "packaged", "run config should record packaged graph source");
  assert(Object.values(run.tasks).some((task) => task.kind === "COMPILE"), "ASDF run should include compile/load stage");
  assert(Object.values(run.tasks).some((task) => task.kind === "UNIT_TEST"), "ASDF run should include test stage");
  assert(Object.values(run.tasks).some((task) => task.kind === "CODE_REVIEW"), "ASDF run should include review stage");

  const firstReadyTask = Object.values(run.tasks).find((task) => task.blockedBy.length === 0);
  assert(firstReadyTask, "custom ASDF run should have an initial ready task");
  const prompt = buildTaskPrompt(run, firstReadyTask!);
  assertIncludes(prompt, ORIGINAL_SENTINEL, "custom graph prompt should preserve original user input");
  assertIncludes(prompt, "Custom graph stage guidance", "custom graph prompt should label stage guidance");
  assertIncludes(prompt, "ASDF system files", "custom graph prompt should include Lisp discovery guidance");
  assertIncludes(prompt, PROMPT_SENTINEL, "ready prompt should include packaged promptInstructions for the executing worker");

  const rawReadyMetadata = JSON.stringify(firstReadyTask!.metadata);
  assertIncludes(rawReadyMetadata, PROMPT_SENTINEL, "raw ready task metadata should retain stage promptInstructions for ready prompt generation");
  const statusDetails = JSON.stringify(sanitizeProjectTaskGraphDetails({ run }));
  assertNotIncludes(statusDetails, PROMPT_SENTINEL, "status/tool details sanitizer should not leak promptInstructions contents");
  assertNotIncludes(statusDetails, "projectPromptInstructions", "status/tool details sanitizer should omit projectPromptInstructions fields");
  assertNotIncludes(statusDetails, "promptInstructions", "status/tool details sanitizer should omit promptInstructions fields");
  const uiDetailsMetadata = JSON.stringify(sanitizeTaskMetadataForDetails(firstReadyTask!.metadata));
  assertNotIncludes(uiDetailsMetadata, PROMPT_SENTINEL, "UI details metadata sanitizer should not leak promptInstructions contents");
  assertNotIncludes(uiDetailsMetadata, "projectPromptInstructions", "UI details metadata sanitizer should omit projectPromptInstructions fields");

  const status = renderStatus(run);
  assertIncludes(status, "graph common-lisp-asdf", "status should show custom graph name");
  assertIncludes(status, "source packaged", "status should show custom graph source");
  assertNotIncludes(status, PROMPT_SENTINEL, "status should not leak promptInstructions");

  const widget = renderTaskGraphWidget(run).join("\n");
  assertIncludes(widget, "graph common-lisp-asdf", "widget should show custom graph name");
  assertIncludes(widget, "source packaged", "widget should show custom graph source");
  assertNotIncludes(widget, PROMPT_SENTINEL, "widget should not leak promptInstructions");

  assert.equal(typeof openTaskGraphUi, "function", "task graph UI import smoke succeeds");
} finally {
  if (oldHome === undefined) delete process.env.HOME;
  else process.env.HOME = oldHome;
  if (oldGlobalSettings === undefined) delete process.env.PI_TASK_GRAPH_GLOBAL_SETTINGS;
  else process.env.PI_TASK_GRAPH_GLOBAL_SETTINGS = oldGlobalSettings;
}

console.log("task graph Common Lisp graph validation passed");
