import * as fs from "node:fs";
import * as path from "node:path";
import type { AutoImproveLineageSource, AutoImproveLoopMetadata, GitBaseline, ProjectTaskGraphSettings, RootWorkQueue, RootWorkSeed, RootWorkSelection, TaskGraphOptions, TaskGraphRun } from "./schema";
import { terminalDone } from "./schema";
import { createRun } from "./formulas";
import { writeArtifact } from "./store";
import {
  buildSuccessorRootWorkQueue,
  defaultRootWorkSelection,
  markRootWorkCreated,
  normalizeRootWorkQueue,
  selectRootWorkItem,
  type RootWorkSelectionResult,
} from "./root-work-queue";

const now = () => new Date().toISOString();

export interface AutoImproveLineageAdoption {
  rootRunId: string;
  previousRunIteration: number;
  loopId?: string;
  overrideExistingMetadata?: boolean;
  reason?: string;
}

export interface ContinueAutoImproveParams {
  objective?: string;
  oracleQuestion?: string;
  evidencePaths?: string[];
  maxContextBytes?: number;
  maxIterations?: number;
  allowDirtyWorktree?: boolean;
  allowIncomplete?: boolean;
  forceNew?: boolean;
  dryRun?: boolean;
  lineageAdoption?: AutoImproveLineageAdoption;
  futureWork?: RootWorkSeed[];
  /** Backward-compatible alias; persisted as generalized rootWorkQueue metadata. */
  futureLoops?: RootWorkSeed[];
  rootWorkSelection?: RootWorkSelection;
  options?: TaskGraphOptions;
}

export interface ContinueAutoImproveResult {
  previousRun: TaskGraphRun;
  nextRun?: TaskGraphRun;
  contextMarkdown: string;
  rootTaskId?: string;
  existingNextRunId?: string;
  dryRun: boolean;
  lineage: AutoImproveLoopMetadata;
  rootWorkSelectionResult?: RootWorkSelectionResult;
  rootWorkQueue?: RootWorkQueue;
  noNextReason?: string;
}

function cloneRun(run: TaskGraphRun): TaskGraphRun {
  return JSON.parse(JSON.stringify(run)) as TaskGraphRun;
}

function loopMetadata(run: TaskGraphRun) {
  return run.metadata?.autoimproveLoop ?? run.config.autoimproveLoop;
}

function futureWorkSeeds(params: ContinueAutoImproveParams) {
  const futureLoops = (params.futureLoops ?? []).map((seed) => {
    const raw = seed as RootWorkSeed & { input?: Record<string, unknown> };
    return {
      kind: "autoimprove-loop" as const,
      ...raw,
      input: raw.input ? { kind: "autoimprove-loop", ...raw.input } : raw.input,
    };
  });
  return [...(params.futureWork ?? []), ...futureLoops];
}

function rootWorkQueueMetadata(run: TaskGraphRun) {
  return run.metadata?.rootWorkQueue;
}

function withRootWorkQueue(run: TaskGraphRun, queue: RootWorkQueue) {
  run.metadata = { ...(run.metadata ?? {}), rootWorkQueue: queue };
  return run;
}

function sanitizeContextValue(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => {
      if (/\b(token|secret|password|passwd|api[_-]?key|authorization|cookie|private key)\b/i.test(line)) {
        return line.replace(/([:=])\s*.+$/, "$1 [redacted potential secret]");
      }
      return line.replace(/[A-Za-z0-9_+\-/=]{64,}/g, "[redacted-long-token]");
    })
    .join("\n");
}

function boundedContext(lines: string[], maxContextBytes: number) {
  const budget = Math.max(1000, Math.floor(maxContextBytes));
  const content = lines.join("\n");
  if (content.length <= budget) return content;
  return `${content.slice(0, budget)}\n\n... [truncated to maxContextBytes=${budget}; raw evidence file contents are not copied]`;
}

interface NormalizedLineageAdoption {
  rootRunId: string;
  previousRunIteration: number;
  loopId: string;
  overrideExistingMetadata?: boolean;
  reason?: string;
}

interface PreviousRunMetadataSnapshot {
  present: boolean;
  loopId?: string;
  rootRunId?: string;
  iteration?: number;
}

interface ResolvedLineage {
  previousIteration: number;
  nextIteration: number;
  loopId: string;
  rootRunId: string;
  objective: string;
  lineageSource: AutoImproveLineageSource;
  lineageWarnings: string[];
  adoptedLineage?: AutoImproveLoopMetadata["adoptedLineage"];
  previousRunMetadata: PreviousRunMetadataSnapshot;
  priorLoop?: AutoImproveLoopMetadata;
}

function objectiveFor(previous: TaskGraphRun, loop: AutoImproveLoopMetadata | undefined, objective?: string) {
  return objective?.trim() || loop?.objective || previous.tasks[previous.rootTaskIds[0] ?? ""]?.description || previous.runId;
}

function previousRunMetadata(loop: AutoImproveLoopMetadata | undefined): PreviousRunMetadataSnapshot {
  if (!loop) return { present: false };
  return {
    present: true,
    loopId: loop.loopId,
    rootRunId: loop.rootRunId ?? loop.loopId,
    iteration: loop.iteration,
  };
}

function normalizeAdoption(adoption: AutoImproveLineageAdoption | undefined): NormalizedLineageAdoption | undefined {
  if (!adoption) return undefined;
  const rootRunId = adoption.rootRunId?.trim();
  if (!rootRunId) throw new Error("lineageAdoption.rootRunId is required");
  if (!Number.isInteger(adoption.previousRunIteration) || adoption.previousRunIteration < 1) {
    throw new Error("lineageAdoption.previousRunIteration must be an integer >= 1");
  }
  const loopId = adoption.loopId?.trim() || rootRunId;
  return {
    rootRunId,
    loopId,
    previousRunIteration: adoption.previousRunIteration,
    overrideExistingMetadata: adoption.overrideExistingMetadata,
    reason: adoption.reason?.trim() || undefined,
  };
}

function adoptedLineage(adoption: NormalizedLineageAdoption): AutoImproveLoopMetadata["adoptedLineage"] {
  return {
    rootRunId: adoption.rootRunId,
    previousRunIteration: adoption.previousRunIteration,
    loopId: adoption.loopId,
    reason: adoption.reason,
  };
}

function actionableLineageWarnings(warnings: readonly string[]) {
  return warnings.filter((warning) => !/explicit lineage adoption was used|adopted expected predecessor|resolved adoption/i.test(warning));
}

function metadataConflicts(loop: AutoImproveLoopMetadata, adoption: NormalizedLineageAdoption) {
  const conflicts: string[] = [];
  const metadataRootRunId = loop.rootRunId ?? loop.loopId;
  if (metadataRootRunId !== adoption.rootRunId) conflicts.push(`rootRunId metadata=${metadataRootRunId} adoption=${adoption.rootRunId}`);
  if (loop.loopId !== adoption.loopId) conflicts.push(`loopId metadata=${loop.loopId} adoption=${adoption.loopId}`);
  if (loop.iteration !== adoption.previousRunIteration) conflicts.push(`iteration metadata=${loop.iteration} adoptionPreviousIteration=${adoption.previousRunIteration}`);
  return conflicts;
}

function resolveLineage(previous: TaskGraphRun, params: ContinueAutoImproveParams = {}): ResolvedLineage {
  const priorLoop = loopMetadata(previous);
  const adoption = normalizeAdoption(params.lineageAdoption);
  const previousMetadata = previousRunMetadata(priorLoop);
  const objective = objectiveFor(previous, priorLoop, params.objective);

  if (priorLoop && !adoption) {
    const previousIteration = priorLoop.iteration;
    return {
      previousIteration,
      nextIteration: previousIteration + 1,
      loopId: priorLoop.loopId,
      rootRunId: priorLoop.rootRunId ?? priorLoop.loopId,
      objective,
      lineageSource: "metadata",
      lineageWarnings: [],
      previousRunMetadata: previousMetadata,
      priorLoop,
    };
  }

  if (!priorLoop && adoption) {
    const warning = "previous run had no autoimproveLoop metadata; explicit lineage adoption was used";
    return {
      previousIteration: adoption.previousRunIteration,
      nextIteration: adoption.previousRunIteration + 1,
      loopId: adoption.loopId,
      rootRunId: adoption.rootRunId,
      objective,
      lineageSource: "explicit-legacy-adoption",
      lineageWarnings: [warning],
      adoptedLineage: adoptedLineage(adoption),
      previousRunMetadata: previousMetadata,
    };
  }

  if (priorLoop && adoption) {
    const conflicts = metadataConflicts(priorLoop, adoption);
    if (conflicts.length === 0) {
      const previousIteration = priorLoop.iteration;
      return {
        previousIteration,
        nextIteration: previousIteration + 1,
        loopId: priorLoop.loopId,
        rootRunId: priorLoop.rootRunId ?? priorLoop.loopId,
        objective,
        lineageSource: "metadata-confirmed-by-explicit-lineage",
        lineageWarnings: [],
        adoptedLineage: adoptedLineage(adoption),
        previousRunMetadata: previousMetadata,
        priorLoop,
      };
    }
    if (adoption.overrideExistingMetadata !== true) {
      throw new Error(`lineageAdoption conflicts with existing autoimproveLoop metadata: ${conflicts.join("; ")}. Pass overrideExistingMetadata:true only after verifying the legacy lineage.`);
    }
    const warning = `lineageAdoption overrode existing autoimproveLoop metadata (${conflicts.join("; ")}); previous run metadata was not rewritten`;
    return {
      previousIteration: adoption.previousRunIteration,
      nextIteration: adoption.previousRunIteration + 1,
      loopId: adoption.loopId,
      rootRunId: adoption.rootRunId,
      objective,
      lineageSource: "explicit-lineage-overrode-existing-metadata",
      lineageWarnings: [warning],
      adoptedLineage: adoptedLineage(adoption),
      previousRunMetadata: previousMetadata,
      priorLoop,
    };
  }

  const warning = "previous run had no autoimproveLoop metadata and no lineageAdoption was provided; defaulted previous iteration to 1";
  return {
    previousIteration: 1,
    nextIteration: 2,
    loopId: previous.runId,
    rootRunId: previous.runId,
    objective,
    lineageSource: "legacy-default",
    lineageWarnings: [warning],
    previousRunMetadata: previousMetadata,
  };
}

function loopMetadataFields(resolved: ResolvedLineage) {
  return {
    lineageSource: resolved.lineageSource,
    ...(resolved.lineageWarnings.length ? { lineageWarnings: resolved.lineageWarnings } : {}),
    ...(resolved.adoptedLineage ? { adoptedLineage: resolved.adoptedLineage } : {}),
    previousRunMetadata: resolved.previousRunMetadata,
  };
}

function pathSummary(cwd: string, evidencePaths: string[]) {
  const lines: string[] = [];
  const root = path.resolve(cwd);
  const rootPrefix = `${root}${path.sep}`;
  for (const item of evidencePaths) {
    const resolved = path.resolve(cwd, item);
    if (resolved !== root && !resolved.startsWith(rootPrefix)) {
      lines.push(`- ${item} (skipped: outside run cwd)`);
      continue;
    }
    try {
      const stat = fs.statSync(resolved);
      lines.push(`- ${item} (${stat.isDirectory() ? "directory" : `${stat.size} bytes`})`);
    } catch {
      lines.push(`- ${item} (missing or unreadable)`);
    }
  }
  return lines;
}

export function buildContinuationContext(previous: TaskGraphRun, params: ContinueAutoImproveParams = {}) {
  const loop = resolveLineage(previous, params);
  const lines = [
    "# Previous autoimprove run context",
    "",
    `Run: ${previous.runId}`,
    `Status: ${previous.status}`,
    `Iteration: ${loop.previousIteration}`,
    `Loop id: ${loop.loopId}`,
    `Lineage source: ${loop.lineageSource}`,
    ...(actionableLineageWarnings(loop.lineageWarnings).length ? ["Lineage warnings:", ...actionableLineageWarnings(loop.lineageWarnings).map((warning) => `- ${warning}`)] : []),
    "",
    "## Task summaries",
  ];
  for (const task of Object.values(previous.tasks).sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    lines.push(sanitizeContextValue(`- ${task.kind} ${task.status}: ${task.title}`));
    const lastAttempt = task.attempts[task.attempts.length - 1];
    if (lastAttempt?.outputSummary) lines.push(sanitizeContextValue(`  Summary: ${lastAttempt.outputSummary.slice(0, 500)}`));
    if (task.metadata.changedFiles?.length) lines.push(sanitizeContextValue(`  Changed files: ${task.metadata.changedFiles.join(", ").slice(0, 800)}`));
    if (task.metadata.validationEvidence?.length) {
      lines.push("  Validation:");
      for (const validation of task.metadata.validationEvidence) lines.push(sanitizeContextValue(`  - ${validation.exitCode} ${validation.cwd ?? previous.cwd}$ ${validation.command}`));
    }
    if (task.metadata.childRun) lines.push(sanitizeContextValue(`  Child run: ${task.metadata.childRun.runId} (${task.metadata.childRun.cwd})`));
    if (task.artifacts.length) lines.push(sanitizeContextValue(`  Artifacts: ${task.artifacts.map((a) => `${a.type}:${a.path ?? a.id}`).join(", ").slice(0, 1000)}`));
  }
  lines.push("", "## User-provided evidence paths");
  const evidence = pathSummary(previous.cwd, params.evidencePaths ?? []);
  lines.push(...(evidence.length ? evidence : ["- none"]));
  lines.push("", "## Safety", "- Do not copy secrets, cookies, tokens, private keys, full raw transcripts, or environment dumps into the next prompt.", "- Evidence files are referenced by path and size only; raw file contents are not copied into continuation context.", "- Ask Oracle for next-step ideas before implementation.");
  return boundedContext(lines, params.maxContextBytes ?? 8000);
}

export function buildContinuationInput(previous: TaskGraphRun, params: ContinueAutoImproveParams, contextArtifactPath?: string) {
  const loop = resolveLineage(previous, params);
  const nextIteration = loop.nextIteration;
  const objective = loop.objective;
  const oracleQuestion = params.oracleQuestion?.trim() || "Ask Oracle for next-step/improvement ideas for this autoimprove loop, then choose one or two bounded, testable changes.";
  return `Continue autoimprove loop iteration ${nextIteration}.

Prior run: ${previous.runId}
Loop id: ${loop.loopId}
Lineage source: ${loop.lineageSource}
${actionableLineageWarnings(loop.lineageWarnings).length ? `Lineage warnings:\n${actionableLineageWarnings(loop.lineageWarnings).map((warning) => `- ${warning}`).join("\n")}\n` : ""}Objective: ${objective}

Mandatory first step:
${oracleQuestion}

Constraints:
- Do not rewrite existing work wholesale unless the objective explicitly requires it.
- Prefer small additive changes with clear validation and documentation when relevant.
- Add deterministic validation and live smoke evidence when applicable.
- Do not commit or push without explicit approval.
- Preserve existing dirty worktree files and unrelated user changes.
- Do not include secrets in prompts, logs, task artifacts, or Oracle context.

Prior evidence context${contextArtifactPath ? ` is attached at: ${contextArtifactPath}` : " will be attached as continuation-context.md"}.
`;
}

export function continueAutoImproveRun(input: {
  previous: TaskGraphRun;
  params?: ContinueAutoImproveParams;
  gitBaseline?: GitBaseline;
  projectSettings?: ProjectTaskGraphSettings;
  projectSettingsInfo?: TaskGraphRun["config"]["projectSettingsInfo"];
}): ContinueAutoImproveResult {
  const params = input.params ?? {};
  const previous = cloneRun(input.previous);
  if (previous.mode !== "autoimprove") throw new Error(`Previous run ${previous.runId} is ${previous.mode}, not autoimprove`);
  if (!terminalDone(previous.status)) throw new Error(`Previous run ${previous.runId} is not terminal: ${previous.status}`);
  if (previous.status !== "succeeded" && !params.allowIncomplete) throw new Error(`Previous run ${previous.runId} is ${previous.status}; set allowIncomplete to continue from non-success`);
  const initialResolved = resolveLineage(previous, params);
  const priorLoop = initialResolved.priorLoop;
  const effectiveMaxIterations = params.maxIterations ?? priorLoop?.maxIterations;
  const completionRunId = previous.status === "succeeded" ? previous.runId : undefined;
  const normalizedRootWorkQueue = normalizeRootWorkQueue(rootWorkQueueMetadata(previous), {
    originRunId: previous.runId,
    completedRunId: completionRunId,
    completedAt: now(),
    seeds: futureWorkSeeds(params),
  });
  withRootWorkQueue(previous, normalizedRootWorkQueue);

  const existingNextRunId = priorLoop?.nextRunId;
  if (existingNextRunId && !params.forceNew) {
    const lineage: AutoImproveLoopMetadata = {
      loopId: initialResolved.loopId,
      rootRunId: initialResolved.rootRunId,
      iteration: initialResolved.previousIteration,
      objective: initialResolved.objective,
      nextRunId: existingNextRunId,
      oracleRequired: true,
      maxIterations: effectiveMaxIterations,
      ...loopMetadataFields(initialResolved),
    };
    return {
      previousRun: previous,
      contextMarkdown: buildContinuationContext(previous, params),
      existingNextRunId,
      dryRun: params.dryRun === true,
      lineage,
      rootWorkQueue: normalizedRootWorkQueue,
    };
  }
  if (effectiveMaxIterations !== undefined && initialResolved.nextIteration > effectiveMaxIterations) throw new Error(`Autoimprove loop ${initialResolved.loopId} would create iteration ${initialResolved.nextIteration}, exceeding maxIterations=${effectiveMaxIterations}`);
  const baseline = input.gitBaseline ?? previous.gitBaseline;
  if ((baseline.dirtyAtStart?.length ?? 0) > 0 && params.allowDirtyWorktree !== true) {
    throw new Error(`Refusing to continue autoimprove from dirty worktree. Pass allowDirtyWorktree:true to record and allow these files:\n${baseline.dirtyAtStart.join("\n")}`);
  }

  const selection = defaultRootWorkSelection({ objective: params.objective, rootWorkSelection: params.rootWorkSelection });
  const rootWorkSelectionResult = selectRootWorkItem(normalizedRootWorkQueue, selection);
  const selectedRootWork = rootWorkSelectionResult.status === "selected" ? rootWorkSelectionResult.item : undefined;
  const selectedAutoimproveInput = selectedRootWork?.input.kind === "autoimprove-loop" ? selectedRootWork.input : undefined;
  const effectiveParams: ContinueAutoImproveParams = selectedAutoimproveInput
    ? {
        ...params,
        objective: params.objective?.trim() || selectedAutoimproveInput.objective,
        oracleQuestion: params.oracleQuestion?.trim() || selectedAutoimproveInput.oracleQuestion,
        evidencePaths: params.evidencePaths ?? selectedAutoimproveInput.evidencePaths,
      }
    : params;

  const selectionFailed = rootWorkSelectionResult.status !== "selected" && rootWorkSelectionResult.status !== "none";
  const hasExplicitObjective = Boolean(params.objective?.trim());
  if (selectionFailed || (!selectedRootWork && !hasExplicitObjective)) {
    const lineage: AutoImproveLoopMetadata = {
      loopId: initialResolved.loopId,
      rootRunId: initialResolved.rootRunId,
      iteration: initialResolved.previousIteration,
      objective: initialResolved.objective,
      oracleRequired: true,
      maxIterations: effectiveMaxIterations,
      ...loopMetadataFields(initialResolved),
    };
    const noNextReason = rootWorkSelectionResult.message;
    return {
      previousRun: previous,
      contextMarkdown: buildContinuationContext(previous, effectiveParams),
      dryRun: params.dryRun === true,
      lineage,
      rootWorkSelectionResult,
      rootWorkQueue: normalizedRootWorkQueue,
      noNextReason,
    };
  }

  const resolved = effectiveParams === params ? initialResolved : resolveLineage(previous, effectiveParams);
  const contextMarkdown = buildContinuationContext(previous, effectiveParams);
  const nextInput = buildContinuationInput(previous, effectiveParams);
  const nextOptions: TaskGraphOptions = {
    ...(params.options ?? {}),
    oracleConsult: true,
    commit: false,
    push: false,
    maxParallel: params.options?.maxParallel ?? previous.config.maxParallel,
  };
  const next = createRun(previous.cwd, "autoimprove", nextInput, nextOptions, baseline, input.projectSettings, input.projectSettingsInfo);
  const oracleExists = Object.values(next.tasks).some((task) => task.kind === "ORACLE_CONSULT");
  if (!oracleExists) throw new Error("Continuation run did not contain required ORACLE_CONSULT task");
  const rootTaskId = next.rootTaskIds[0] ?? Object.keys(next.tasks)[0];
  const transitionedParentQueue = selectedRootWork
    ? markRootWorkCreated(normalizedRootWorkQueue, selectedRootWork, previous.runId, next.runId, now())
    : normalizedRootWorkQueue;
  const successorRootWorkQueue = buildSuccessorRootWorkQueue(transitionedParentQueue, selectedRootWork, next.runId);
  const nextLoop: AutoImproveLoopMetadata = {
    loopId: resolved.loopId,
    rootRunId: resolved.rootRunId,
    iteration: resolved.nextIteration,
    objective: resolved.objective,
    previousRunId: previous.runId,
    createdBy: "task_graph_continue_autoimprove",
    continuedAt: now(),
    oracleRequired: true,
    oracleQuestion: effectiveParams.oracleQuestion ?? priorLoop?.oracleQuestion,
    evidenceContextPaths: effectiveParams.evidencePaths,
    maxIterations: effectiveMaxIterations,
    ...loopMetadataFields(resolved),
    git: {
      dirtyAtContinueStart: baseline.dirtyAtStart,
      branch: baseline.branch,
      head: baseline.head,
      allowDirtyWorktree: params.allowDirtyWorktree === true,
    },
  };
  next.metadata = { ...(next.metadata ?? {}), autoimproveLoop: nextLoop, rootWorkQueue: successorRootWorkQueue };
  next.config.autoimproveLoop = nextLoop;
  for (const task of Object.values(next.tasks)) {
    task.metadata.previousRunId = previous.runId;
    task.metadata.rootRunId = resolved.rootRunId;
    task.metadata.autoimproveLoop = nextLoop;
  }
  if (!params.dryRun && rootTaskId) {
    const artifact = writeArtifact(next, rootTaskId, "autoimprove-continuation", "continuation-context.md", contextMarkdown, `Continuation context from ${previous.runId}`);
    next.tasks[rootTaskId].artifacts.push(artifact);
    nextLoop.continuationContextArtifact = artifact.path;
    nextLoop.evidenceContextArtifactPath = artifact.path;
  }
  const updatedPreviousLoop: AutoImproveLoopMetadata = {
    ...(priorLoop ?? {
      loopId: resolved.loopId,
      rootRunId: resolved.rootRunId,
      iteration: resolved.previousIteration,
      objective: resolved.objective,
      oracleRequired: true,
      ...loopMetadataFields(resolved),
    }),
    maxIterations: effectiveMaxIterations,
    nextRunId: next.runId,
    nextRunIds: [...new Set([...(priorLoop?.nextRunIds ?? []), next.runId])],
  };
  previous.metadata = { ...(previous.metadata ?? {}), autoimproveLoop: updatedPreviousLoop, rootWorkQueue: transitionedParentQueue };
  previous.config.autoimproveLoop = updatedPreviousLoop;
  return {
    previousRun: previous,
    nextRun: next,
    contextMarkdown,
    rootTaskId,
    dryRun: params.dryRun === true,
    lineage: nextLoop,
    rootWorkSelectionResult,
    rootWorkQueue: successorRootWorkQueue,
  };
}
