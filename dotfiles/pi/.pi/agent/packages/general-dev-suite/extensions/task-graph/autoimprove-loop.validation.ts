import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { continueAutoImproveRun } from "./autoimprove-loop";
import { renderStatus, renderTaskGraphWidget } from "./display";
import { createRun } from "./formulas";
import { buildTaskPrompt } from "./scheduler";
import { openTaskGraphUi } from "./ui";

const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "task-graph-autoimprove-loop-"));
fs.mkdirSync(path.join(cwd, ".orchestration"), { recursive: true });
fs.writeFileSync(path.join(cwd, ".orchestration", "final-report.md"), "# Prior report\n\nValidation passed.\n");

const previous = createRun(cwd, "autoimprove", "Autoimprove test objective with Oracle and validation evidence.", {
  oracleConsult: true,
  decompose: false,
  maxParallel: 2,
});
for (const task of Object.values(previous.tasks)) task.status = "succeeded";
previous.status = "succeeded";
const implement = Object.values(previous.tasks).find((task) => task.kind === "IMPLEMENT");
assert(implement, "previous IMPLEMENT task exists");
implement!.metadata.changedFiles = ["extensions/task-graph/index.ts"];
implement!.metadata.validationEvidence = [{ command: "npm test", cwd, exitCode: 0, stdoutTail: "ok" }];
implement!.metadata.childRun = { cwd, runId: "child-run-1", runFile: path.join(cwd, ".pi/dev-suite/task-graph/runs/child-run-1.json") };

const dry = continueAutoImproveRun({
  previous,
  params: {
    dryRun: true,
    objective: "Keep improving the task graph extension with bounded, tested changes.",
    evidencePaths: [".orchestration/final-report.md"],
    options: { maxParallel: 1 },
  },
  gitBaseline: { dirtyAtStart: [], branch: "main", head: "abc123" },
});
assert(dry.nextRun, "dry-run produces a preview run");
assert.equal(dry.previousRun.metadata?.autoimproveLoop?.nextRunId, dry.nextRun!.runId, "dry-run links preview in returned previous copy only");
assert.equal(previous.metadata?.autoimproveLoop?.nextRunId, undefined, "dry-run does not mutate caller's previous run");
assert.equal(dry.lineage.iteration, 2, "next iteration inferred as 2");
assert.equal(dry.lineage.previousRunId, previous.runId, "lineage names previous run");
assert.equal(dry.lineage.oracleRequired, true, "Oracle required in lineage");
assert.equal(dry.lineage.lineageSource, "legacy-default", "legacy metadata-free continuation records legacy default lineage source");
assert(dry.lineage.lineageWarnings?.some((warning) => /no autoimproveLoop metadata/i.test(warning)), "legacy default continuation records a lineage warning");
assert(Object.values(dry.nextRun!.tasks).some((task) => task.kind === "ORACLE_CONSULT"), "dry-run next run has ORACLE_CONSULT");
assert.match(dry.contextMarkdown, /Previous autoimprove run context/, "context markdown generated");
assert.match(dry.contextMarkdown, /Evidence files are referenced by path and size only/, "context documents path-only evidence policy");
const dryPlan = Object.values(dry.nextRun!.tasks).find((task) => task.kind === "PLAN");
assert(dryPlan, "dry-run PLAN exists");
assert.doesNotMatch(dryPlan!.description, /task graph extension wholesale/, "continuation input is not hard-coded to the task graph extension");
assert.match(dryPlan!.description, /Do not rewrite existing work wholesale/, "continuation input has generic rewrite guard");

const created = continueAutoImproveRun({
  previous,
  params: {
    objective: "Keep improving the task graph extension with bounded, tested changes.",
    evidencePaths: [".orchestration/final-report.md"],
    options: { maxParallel: 1 },
  },
  gitBaseline: { dirtyAtStart: [], branch: "main", head: "abc123" },
});
assert(created.nextRun, "create mode produces a next run");
assert.equal(created.lineage.iteration, 2, "create mode next iteration inferred as 2");
assert.equal(created.nextRun!.config.commitEnabled, false, "commit disabled on continuation");
assert.equal(created.nextRun!.config.pushEnabled, false, "push disabled on continuation");
assert.equal(created.nextRun!.config.maxParallel, 1, "maxParallel override carried through");
assert(Object.values(created.nextRun!.tasks).some((task) => task.kind === "ORACLE_CONSULT"), "create mode has ORACLE_CONSULT");
const artifactPath = created.nextRun!.metadata?.autoimproveLoop?.continuationContextArtifact;
assert(artifactPath, "continuation context artifact path recorded");
assert(fs.existsSync(artifactPath!), "continuation context artifact was written");
const nextImplement = Object.values(created.nextRun!.tasks).find((task) => task.kind === "IMPLEMENT");
assert(nextImplement, "next IMPLEMENT exists");
const prompt = buildTaskPrompt(created.nextRun!, nextImplement!);
assert.match(prompt, /Autoimprove loop context/, "loop context appears in prompts");
assert.match(prompt, /Oracle required before implementation: yes/, "prompt states Oracle requirement");
assert.equal(created.previousRun.metadata?.autoimproveLoop?.nextRunId, created.nextRun!.runId, "previous run copy linked forward");
assert(created.previousRun.metadata?.autoimproveLoop?.nextRunIds?.includes(created.nextRun!.runId), "previous run copy records nextRunIds");

const limited = continueAutoImproveRun({
  previous,
  params: { maxIterations: 2, objective: "Limited continuation objective." },
  gitBaseline: { dirtyAtStart: [], branch: "main", head: "abc123" },
});
assert(limited.nextRun, "limited continuation created");
for (const task of Object.values(limited.nextRun!.tasks)) task.status = "succeeded";
limited.nextRun!.status = "succeeded";
assert.equal(limited.nextRun!.metadata?.autoimproveLoop?.maxIterations, 2, "maxIterations persisted to successor metadata");
assert.throws(() => continueAutoImproveRun({ previous: limited.nextRun!, params: {}, gitBaseline: { dirtyAtStart: [] } }), /maxIterations=2/, "persisted max iteration guard triggers without re-passing params");

assert.throws(() => continueAutoImproveRun({ previous, params: {}, gitBaseline: { dirtyAtStart: [" M file.ts"] } }), /dirty worktree/, "dirty worktree guard triggers");
assert.throws(() => continueAutoImproveRun({ previous, params: { maxIterations: 1 }, gitBaseline: { dirtyAtStart: [] } }), /maxIterations=1/, "max iteration guard triggers");

function succeededAutoimproveRun(input: string) {
  const run = createRun(cwd, "autoimprove", input, { oracleConsult: true, decompose: false, maxParallel: 2 });
  for (const task of Object.values(run.tasks)) task.status = "succeeded";
  run.status = "succeeded";
  return run;
}

assert.equal(typeof openTaskGraphUi, "function", "task graph UI module import smoke succeeds");
assert.equal(typeof renderTaskGraphWidget, "function", "display widget import smoke succeeds");

const legacyPrevious = succeededAutoimproveRun("Legacy metadata-free autoimprove iteration 2 objective.");
const adopted = continueAutoImproveRun({
  previous: legacyPrevious,
  params: {
    dryRun: true,
    objective: "Continue the legacy loop with explicit adopted lineage.",
    lineageAdoption: {
      rootRunId: "autoimprove-root-legacy",
      loopId: "autoimprove-loop-legacy",
      previousRunIteration: 2,
      reason: "previous run predates autoimproveLoop metadata",
    },
  },
  gitBaseline: { dirtyAtStart: [], branch: "main", head: "abc123" },
});
assert(adopted.nextRun, "explicit legacy adoption produces a preview run");
assert.equal(adopted.lineage.iteration, 3, "explicit legacy adoption computes successor iteration from previousRunIteration + 1");
assert.equal(adopted.lineage.rootRunId, "autoimprove-root-legacy", "adopted root run id carried into successor");
assert.equal(adopted.lineage.loopId, "autoimprove-loop-legacy", "adopted loop id carried into successor");
assert.equal(adopted.lineage.lineageSource, "explicit-legacy-adoption", "adopted lineage source recorded");
assert.equal(adopted.lineage.adoptedLineage?.previousRunIteration, 2, "adopted lineage records previous iteration");
assert.equal(adopted.lineage.previousRunMetadata?.present, false, "successor records that previous metadata was absent");
assert(adopted.lineage.lineageWarnings?.some((warning) => /explicit lineage adoption/i.test(warning)), "adopted lineage warning recorded");
assert.equal(adopted.previousRun.metadata?.autoimproveLoop?.iteration, 2, "returned previous copy is adopted as previous iteration 2");
assert.equal(adopted.previousRun.metadata?.autoimproveLoop?.lineageSource, "explicit-legacy-adoption", "returned previous copy records adoption source");
assert(Object.values(adopted.nextRun!.tasks).some((task) => task.kind === "ORACLE_CONSULT"), "adopted continuation preserves Oracle gate");

const adoptedImplement = Object.values(adopted.nextRun!.tasks).find((task) => task.kind === "IMPLEMENT");
assert(adoptedImplement, "adopted next IMPLEMENT exists");
const adoptedPrompt = buildTaskPrompt(adopted.nextRun!, adoptedImplement!);
assert.match(adoptedPrompt, /Lineage source: explicit legacy adoption/i, "prompt includes lineage source");
assert.doesNotMatch(adoptedPrompt, /explicit lineage adoption was used/i, "prompt filters expected explicit-adoption lineage warning noise");
assert.doesNotMatch(adoptedPrompt, /Lineage warnings:/i, "prompt omits lineage warning header when only expected adoption warnings exist");
assert(Object.values(adopted.nextRun!.tasks).every((task) => !/explicit lineage adoption was used/i.test(task.description)), "continuation task descriptions filter expected adoption warning noise");
const adoptedStatus = renderStatus(adopted.nextRun!);
assert.match(adoptedStatus, /lineage: explicit legacy adoption/i, "status includes concise lineage source");
assert.doesNotMatch(adoptedStatus, /⚠ lineage/i, "status filters expected explicit-adoption lineage noise");
const adoptedWidget = renderTaskGraphWidget(adopted.nextRun!).join("\n");
assert.match(adoptedWidget, /lineage: explicit legacy adoption/i, "widget includes concise lineage source");
assert.doesNotMatch(adoptedWidget, /⚠ lineage/i, "widget filters expected explicit-adoption lineage noise");
const clearedLoop = adopted.nextRun!.metadata!.autoimproveLoop!;
clearedLoop.lineageWarnings = [];
adopted.nextRun!.config.autoimproveLoop = clearedLoop;
for (const task of Object.values(adopted.nextRun!.tasks)) task.metadata.autoimproveLoop = clearedLoop;
assert.doesNotMatch(renderStatus(adopted.nextRun!), /⚠ lineage/i, "status warning disappears when metadata warnings are cleared");
assert.doesNotMatch(renderTaskGraphWidget(adopted.nextRun!).join("\n"), /⚠ lineage/i, "widget warning disappears when metadata warnings are cleared");

const existingMetadataPrevious = succeededAutoimproveRun("Existing metadata autoimprove objective.");
const existingLoop = {
  loopId: "existing-loop",
  rootRunId: "existing-root",
  iteration: 2,
  objective: "Existing metadata objective.",
  oracleRequired: true,
};
existingMetadataPrevious.metadata = { ...(existingMetadataPrevious.metadata ?? {}), autoimproveLoop: existingLoop };
existingMetadataPrevious.config.autoimproveLoop = existingLoop;
const matching = continueAutoImproveRun({
  previous: existingMetadataPrevious,
  params: { dryRun: true, objective: "Existing metadata objective.", lineageAdoption: { rootRunId: "existing-root", loopId: "existing-loop", previousRunIteration: 2 } },
  gitBaseline: { dirtyAtStart: [] },
});
assert.equal(matching.lineage.lineageSource, "metadata-confirmed-by-explicit-lineage", "matching explicit lineage confirms metadata");
assert.equal(matching.lineage.iteration, 3, "matching explicit lineage keeps metadata iteration math");

const alreadyLinkedPrevious = succeededAutoimproveRun("Already-linked metadata autoimprove objective.");
const alreadyLinkedLoop = {
  loopId: "linked-loop",
  rootRunId: "linked-root",
  iteration: 2,
  objective: "Already linked objective.",
  oracleRequired: true,
  nextRunId: "already-next-run",
};
alreadyLinkedPrevious.metadata = { ...(alreadyLinkedPrevious.metadata ?? {}), autoimproveLoop: alreadyLinkedLoop };
alreadyLinkedPrevious.config.autoimproveLoop = alreadyLinkedLoop;
const existingLinked = continueAutoImproveRun({ previous: alreadyLinkedPrevious, params: { dryRun: true }, gitBaseline: { dirtyAtStart: [] } });
assert.equal(existingLinked.existingNextRunId, "already-next-run", "already-linked continuation returns existing nextRunId without forceNew");
assert.equal(existingLinked.nextRun, undefined, "already-linked continuation without forceNew does not preview a new run");
const forcedPreview = continueAutoImproveRun({ previous: alreadyLinkedPrevious, params: { dryRun: true, forceNew: true, objective: "Forced alternate successor objective." }, gitBaseline: { dirtyAtStart: [] } });
assert(forcedPreview.nextRun, "dryRun plus forceNew previews a new successor despite existing nextRunId");
assert.equal(forcedPreview.lineage.iteration, 3, "forceNew preview keeps successor iteration math");

assert.throws(() => continueAutoImproveRun({
  previous: existingMetadataPrevious,
  params: { dryRun: true, lineageAdoption: { rootRunId: "other-root", previousRunIteration: 2 } },
  gitBaseline: { dirtyAtStart: [] },
}), /lineageAdoption conflicts/i, "conflicting explicit lineage without override throws before mutation");
const overridden = continueAutoImproveRun({
  previous: existingMetadataPrevious,
  params: { dryRun: true, objective: "Override continuation objective.", lineageAdoption: { rootRunId: "override-root", loopId: "override-loop", previousRunIteration: 4, overrideExistingMetadata: true, reason: "operator verified legacy records" } },
  gitBaseline: { dirtyAtStart: [] },
});
assert.equal(overridden.lineage.lineageSource, "explicit-lineage-overrode-existing-metadata", "override source recorded");
assert.equal(overridden.lineage.iteration, 5, "override uses adopted previous iteration");
assert(overridden.lineage.lineageWarnings?.some((warning) => /overrode existing autoimproveLoop metadata/i.test(warning)), "override warning recorded");
const overriddenImplement = Object.values(overridden.nextRun!.tasks).find((task) => task.kind === "IMPLEMENT");
assert(overriddenImplement, "override next IMPLEMENT exists");
const overriddenPrompt = buildTaskPrompt(overridden.nextRun!, overriddenImplement!);
assert.match(overriddenPrompt, /Lineage warnings:/i, "prompt keeps actionable lineage warning header");
assert.match(overriddenPrompt, /overrode existing autoimproveLoop metadata/i, "prompt keeps actionable override warning");
assert(Object.values(overridden.nextRun!.tasks).some((task) => /overrode existing autoimproveLoop metadata/i.test(task.description)), "continuation descriptions keep actionable override warnings");
assert.equal(overridden.previousRun.metadata?.autoimproveLoop?.rootRunId, "existing-root", "override does not rewrite old run lineage in returned previous copy");

assert.throws(() => continueAutoImproveRun({
  previous: legacyPrevious,
  params: { dryRun: true, lineageAdoption: { rootRunId: "legacy-root", previousRunIteration: 0 } },
  gitBaseline: { dirtyAtStart: [] },
}), /previousRunIteration/i, "invalid previousRunIteration below 1 throws");
assert.throws(() => continueAutoImproveRun({
  previous: legacyPrevious,
  params: { dryRun: true, lineageAdoption: { rootRunId: "legacy-root", previousRunIteration: 1.5 } },
  gitBaseline: { dirtyAtStart: [] },
}), /previousRunIteration/i, "non-integer previousRunIteration throws");
assert.throws(() => continueAutoImproveRun({
  previous: legacyPrevious,
  params: { dryRun: true, maxIterations: 2, lineageAdoption: { rootRunId: "legacy-root", previousRunIteration: 2 } },
  gitBaseline: { dirtyAtStart: [] },
}), /maxIterations=2/, "maxIterations is checked against successor iteration");

console.log("task graph autoimprove loop validation passed");
