export const TASK_STATUSES = [
  "pending",
  "ready",
  "running",
  "blocked",
  "awaiting_input",
  "skipped",
  "succeeded",
  "failed",
  "cancelled",
  "deleted",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_KINDS = [
  "INIT",
  "PLAN",
  "ORACLE_CONSULT",
  "DECOMPOSE",
  "GRILL",
  "PLANNED",
  "GO",
  "IMPLEMENT",
  "GOAL_TEST",
  "EVALUATE",
  "COMPILE",
  "UNIT_TEST",
  "PERF_TEST",
  "CODE_REVIEW",
  "RESTART",
  "API_TEST",
  "E2E_TEST",
  "UX_REVIEW",
  "SPEC_UPDATE",
  "LINT",
  "COMMIT",
  "PUSH",
  "FLUSH",
  "CI_FOLLOW",
  "CI_FIXUP",
  "DIRECT",
] as const;

export type TaskKind = (typeof TASK_KINDS)[number];

export const RUN_MODES = [
  "do",
  "pdo",
  "todo",
  "todo-strict",
  "ticketdo",
  "autoimprove",
  "follow-pipeline",
  "fixup-pipelines",
  "fulcrum",
  "custom",
] as const;

export type RunMode = (typeof RUN_MODES)[number];

export type RunnerKind = "subagent" | "chain" | "direct_safe" | "manual_gate" | "formula";
export type EdgeType = "depends_on" | "orders_before" | "conflicts_with" | "retry_of" | "decomposes_to";
export type SideEffects = "none" | "read" | "write" | "shell" | "git" | "network";
export type Priority = "A" | "B" | "C";

export interface TaskGraphOptions {
  commit?: boolean;
  push?: boolean;
  strict?: boolean;
  continuous?: boolean;
  mutateOrg?: boolean;
  maxParallel?: number;
  dryRun?: boolean;
  /** Force or suppress Oracle consultation; omit for complexity-based auto mode. */
  oracleConsult?: boolean;
  /** Force or suppress decomposition; omit for complexity-based auto mode. */
  decompose?: boolean;
  /** Optional non-secret context paths to include in Oracle instructions. */
  oracleContextPaths?: string[];
  /** Ignore project-local task graph settings for this run. */
  ignoreProjectSettings?: boolean;
  /** Optional project-local settings path, relative to cwd unless absolute. */
  settingsPath?: string;
  /** Named custom graph to instantiate, including packaged presets and settings-defined graphs. */
  customGraph?: string;
}

export interface TaskNodeDescriptorInput {
  stableKey?: string;
  purpose?: string;
  inputs?: readonly string[];
  outputs?: readonly string[];
  artifacts?: readonly string[];
  acceptanceChecks?: readonly string[];
  writeScope?: readonly string[];
  isolationBoundary?: readonly string[];
  order?: number;
}

export interface TaskNodeDescriptor {
  version: 1;
  stableKey: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  artifacts: string[];
  acceptanceChecks: string[];
  writeScope: string[];
  isolationBoundary: string[];
  order: number;
}

export interface CustomGraphStageSettings {
  id: string;
  kind: TaskKind;
  title?: string;
  description?: string;
  priority?: Priority;
  dependsOn?: string[];
  runnerKind?: RunnerKind;
  runnerName?: string;
  sideEffects?: SideEffects;
  subagentType?: string;
  skills?: string[];
  context?: "fresh" | "fork";
  conflictGroup?: string;
  expectedWritePaths?: string[];
  promptInstructions?: string[];
  descriptor?: TaskNodeDescriptorInput;
  stableKey?: string;
  purpose?: string;
  inputs?: string[];
  outputs?: string[];
  artifacts?: string[];
  acceptanceChecks?: string[];
  writeScope?: string[];
  isolationBoundary?: string[];
  order?: number;
}

export interface CustomGraphSettings {
  description?: string;
  stages: CustomGraphStageSettings[];
}

export type CustomGraphSource = "packaged" | "global" | "project";

export interface ProjectTaskGraphSettings {
  agentInstructions?: Record<string, string[]>;
  routing?: {
    maxParallel?: number;
    defaultSubagentContext?: "fresh" | "fork";
    failureRoutes?: Partial<Record<TaskKind, Partial<RouteMetadata>>>;
    lockConflictGroups?: Partial<Record<TaskKind, string>>;
  };
  graphs?: Record<string, CustomGraphSettings>;
  /** Default custom graph name used when mode=custom and options.customGraph is omitted. */
  defaultGraph?: string;
  /** Disable built-in modes or custom graph templates by name. Supports "*", "builtin:<mode>", "custom", and "custom:<name>". */
  disabledGraphs?: string[];
  /** Remove packaged custom graph presets before global/project graph overrides are applied. */
  disabledPackagedGraphs?: string[];
}

export interface ProjectTaskGraphSettingsInfo {
  loaded: boolean;
  path?: string;
  globalPath?: string;
  projectPath?: string;
  /** Backward-compatible alias for enabled/effective custom graph names. */
  graphNames?: string[];
  packagedGraphNames?: string[];
  globalGraphNames?: string[];
  projectGraphNames?: string[];
  effectiveGraphNames?: string[];
  graphSourceMap?: Record<string, CustomGraphSource>;
  disabledGraphNames?: string[];
  disabledPackagedGraphNames?: string[];
  settings?: ProjectTaskGraphSettings;
}

export interface WritePolicy {
  declaredPaths: string[];
  allowOutsideDeclaredPaths: boolean;
  conflictGroup?: string;
}

export interface RunnerSpec {
  kind: RunnerKind;
  name: string;
  promptTemplate?: string;
  directAction?: string;
  sideEffects: SideEffects;
  writePolicy: WritePolicy;
}

export interface FormulaRef {
  name:
    | "formula.do"
    | "formula.pdo"
    | "formula.todo"
    | "formula.todoStrict"
    | "formula.ticketdo"
    | "formula.autoimprove"
    | "formula.fulcrum"
    | "formula.followPipeline"
    | "formula.fixupPipelines"
    | "formula.stageChain"
    | "formula.custom";
  args: Record<string, unknown>;
  expandedAt?: string;
  expandedTaskIds?: string[];
}

export interface SkipMetadata {
  skipped: boolean;
  reason?: string;
  gate?: string;
  strict?: boolean;
}

export interface RouteMetadata {
  onFailure: "retry_same_stage" | "route_to_implement" | "stop_for_user" | "stop_push_failed" | "cancel_dependents";
  maxCodeIterations: number;
  maxEnvironmentalRetries: number;
  failureClass?: "code" | "environment" | "operator" | "unknown";
}

export interface AwaitingInput {
  question: string;
  header?: string;
  options?: string[];
  recommended?: string;
  decisionKey?: string;
}

export interface ApprovalRecord {
  kind: "commit" | "push" | "force-push" | "org-mutation" | "parallel-write";
  approved: boolean;
  by: "user" | "agent";
  at: string;
  note?: string;
}

export interface ComplexityMetadata {
  score: number;
  reasons: string[];
  shouldDecompose: boolean;
  shouldConsultOracle: boolean;
}

export interface OracleMetadata {
  requested: boolean;
  model: "GPT-5.5 Pro Extended";
  mode: "browser";
  noSecrets: boolean;
  contextPaths?: string[];
  oracleSessionSlug?: string;
}

export interface DecompositionMetadata {
  expectedArtifact?: string;
  subtaskCountHint?: number;
  sourceTaskId?: string;
  expandedAt?: string;
  expandedTaskIds?: string[];
}

export interface AutoImproveObjectiveMetadata {
  checklist: string[];
  validationHints: string[];
  expectedArtifactRoots: string[];
  requiresTmuxPuppetedPi: boolean;
  requiresTaskGraphDogfood: boolean;
  requiresReusableSkill: boolean;
}

export interface ValidationEvidence {
  command: string;
  cwd?: string;
  exitCode: number;
  stdoutTail?: string;
  stderrTail?: string;
  durationMs?: number;
}

export interface WorkerEvidence {
  kind: "tmux-pi" | "subagent" | "direct";
  workerId?: string;
  tmuxSession?: string;
  paneId?: string;
  transcriptPath?: string;
}

export interface ChildRunEvidence {
  cwd: string;
  runId: string;
  runFile?: string;
}

export type AutoImproveLineageSource =
  | "metadata"
  | "metadata-confirmed-by-explicit-lineage"
  | "explicit-legacy-adoption"
  | "explicit-lineage-overrode-existing-metadata"
  | "legacy-default";

export const ROOT_WORK_KINDS = [
  "autoimprove-loop",
  "task",
  "custom-graph",
  "research",
  "deep-research",
  "manual",
] as const;

export type RootWorkKind = (typeof ROOT_WORK_KINDS)[number];
export type RootWorkState = "queued" | "active";
export type RootWorkHistoryState = "created" | "completed" | "skipped" | "cancelled";
export type RootWorkRequestedBy = "user" | "oracle" | "agent" | "system";

export type RootWorkPrimitive = string | number | boolean | null;

export type RootWorkInput =
  | {
      kind: "autoimprove-loop";
      objective: string;
      oracleRequired: true;
      oracleQuestion?: string;
      evidencePaths?: string[];
      writeScope?: string[];
    }
  | {
      kind: "task";
      objective: string;
      writeScope?: string[];
    }
  | {
      kind: "custom-graph";
      presetName: string;
      args?: Record<string, RootWorkPrimitive>;
    }
  | {
      kind: "research";
      question: string;
      expectedOutput?: string;
    }
  | {
      kind: "deep-research";
      question: string;
      expectedOutput?: string;
      sourcePolicy?: string;
    }
  | {
      kind: "manual";
      description: string;
      owner?: string;
      completionCriteria?: string;
    };

export interface RootWorkSeed {
  key?: string;
  kind: RootWorkKind;
  title?: string;
  purpose?: string;
  successCriteria?: string;
  input?: Partial<RootWorkInput> | Record<string, unknown>;
  requestedBy?: RootWorkRequestedBy;
  priority?: number;
  dependsOnRootWorkKeys?: string[];
  objective?: string;
  oracleQuestion?: string;
  evidencePaths?: string[];
  writeScope?: string[];
  question?: string;
  expectedOutput?: string;
  presetName?: string;
  args?: Record<string, RootWorkPrimitive>;
  description?: string;
  owner?: string;
  completionCriteria?: string;
  sourcePolicy?: string;
  [key: string]: unknown;
}

export interface RootWorkItem {
  key: string;
  kind: RootWorkKind;
  state: RootWorkState;
  title: string;
  purpose?: string;
  successCriteria?: string;
  input: RootWorkInput;
  requestedBy: RootWorkRequestedBy;
  originRunId: string;
  activeRunId?: string;
  priority?: number;
  dependsOnRootWorkKeys?: string[];
  privacy: { sanitized: true };
}

export interface RootWorkHistoryItem {
  key: string;
  kind: RootWorkKind;
  state: RootWorkHistoryState;
  title: string;
  runId?: string;
  at?: string;
  materialization?: {
    fromRunId: string;
    toRunId: string;
    tool: "task_graph_continue_autoimprove";
  };
  completedByRunId?: string;
  privacy: { sanitized: true };
}

export interface RootWorkQueue {
  version: 1;
  items: RootWorkItem[];
  history?: RootWorkHistoryItem[];
}

export type RootWorkSelection =
  | { mode: "none" }
  | { mode: "first-executable" }
  | { mode: "item-key"; key: string };

export interface AutoImproveLoopMetadata {
  loopId: string;
  rootRunId?: string;
  iteration: number;
  objective: string;
  previousRunId?: string;
  nextRunId?: string;
  nextRunIds?: string[];
  createdBy?: "task_graph_continue_autoimprove" | "task_graph_create";
  continuedAt?: string;
  oracleRequired: boolean;
  oracleQuestion?: string;
  continuationContextArtifact?: string;
  evidenceContextArtifactPath?: string;
  evidenceContextPaths?: string[];
  maxIterations?: number;
  lineageSource?: AutoImproveLineageSource;
  lineageWarnings?: string[];
  adoptedLineage?: {
    rootRunId: string;
    previousRunIteration: number;
    loopId?: string;
    reason?: string;
  };
  previousRunMetadata?: {
    present: boolean;
    loopId?: string;
    rootRunId?: string;
    iteration?: number;
  };
  git?: {
    dirtyAtContinueStart?: string[];
    branch?: string;
    head?: string;
    allowDirtyWorktree?: boolean;
  };
}

export interface RunMetadata {
  autoimproveLoop?: AutoImproveLoopMetadata;
  rootWorkQueue?: RootWorkQueue;
  [key: string]: unknown;
}

export interface TaskMetadata {
  source: string;
  nodeDescriptor?: TaskNodeDescriptor;
  todoTitle?: string;
  ticketKey?: string;
  ticketUrl?: string;
  planFile?: string;
  chainPosition?: number;
  iteration?: number;
  changedFiles?: string[];
  expectedWritePaths?: string[];
  readOnly?: boolean;
  priority?: Priority;
  skip?: SkipMetadata;
  route?: RouteMetadata;
  approvals?: ApprovalRecord[];
  awaitingInput?: AwaitingInput;
  failureContext?: FailureRecord;
  complexity?: ComplexityMetadata;
  oracle?: OracleMetadata;
  decomposition?: DecompositionMetadata;
  autoimproveObjective?: AutoImproveObjectiveMetadata;
  validationEvidence?: ValidationEvidence[];
  worker?: WorkerEvidence;
  childRun?: ChildRunEvidence;
  childRunIds?: string[];
  parentRunId?: string;
  parentTaskId?: string;
  previousRunId?: string;
  rootRunId?: string;
  autoimproveLoop?: AutoImproveLoopMetadata;
  deferred?: boolean;
  [key: string]: unknown;
}

export interface ArtifactRef {
  id: string;
  type: string;
  path?: string;
  inline?: string;
  producerTaskId: string;
  createdAt: string;
  summary?: string;
}

export interface FailureRecord {
  failedStage?: TaskKind | string;
  failureClass?: "code" | "environment" | "operator" | "unknown";
  message: string;
  rawOutput?: string;
  analysis?: string;
}

export interface Attempt {
  attemptId: string;
  startedAt: string;
  endedAt?: string;
  status: TaskStatus;
  runner: RunnerSpec;
  inputSummary: string;
  outputSummary?: string;
  error?: FailureRecord;
  envRetryCount: number;
  codeRetryIteration: number;
}

export interface TaskNode {
  id: string;
  kind: TaskKind;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  parentId?: string;
  blockedBy: string[];
  blocks: string[];
  formula?: FormulaRef;
  runner: RunnerSpec;
  subagent?: {
    type: string;
    model?: string;
    chain?: string;
    skills?: string[];
    /** Fresh by default: child gets its own context unless fork is justified. */
    context?: "fresh" | "fork";
    contextReason?: string;
  };
  attempts: Attempt[];
  artifacts: ArtifactRef[];
  metadata: TaskMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface Edge {
  from: string;
  to: string;
  type: EdgeType;
  reason: string;
}

export interface LockTable {
  held: Record<string, { taskId: string; mode: "read" | "write" | "exclusive" }>;
}

export interface SchedulerConfig {
  maxParallel: number;
  commitEnabled: boolean;
  pushEnabled: boolean;
  strict: boolean;
  continuous: boolean;
  mutateOrg: boolean;
  projectSettings?: ProjectTaskGraphSettings;
  projectSettingsInfo?: Omit<ProjectTaskGraphSettingsInfo, "settings">;
  customGraphName?: string;
  customGraphSource?: CustomGraphSource;
  autoimproveLoop?: AutoImproveLoopMetadata;
}

export interface DeferredCommit {
  taskIds: string[];
  changedFiles: string[];
  subject: string;
  summary: string;
  commitHash?: string;
}

export interface OrgState {
  todoPath?: string;
  donePath?: string;
  backups: string[];
  parsedTitles: string[];
}

export interface GitBaseline {
  head?: string;
  branch?: string;
  dirtyAtStart: string[];
}

export interface TaskGraphRun {
  schemaVersion: 1;
  runId: string;
  cwd: string;
  createdAt: string;
  updatedAt: string;
  mode: RunMode;
  status: TaskStatus;
  rootTaskIds: string[];
  tasks: Record<string, TaskNode>;
  edges: Edge[];
  locks: LockTable;
  config: SchedulerConfig;
  deferredCommits: DeferredCommit[];
  orgState?: OrgState;
  gitBaseline: GitBaseline;
  metadata?: RunMetadata;
}

export interface ReadyTask {
  id: string;
  kind: TaskKind;
  title: string;
  runner: RunnerSpec;
  subagent?: TaskNode["subagent"];
  context: "fresh" | "fork";
  prompt: string;
  blockedBy: string[];
  lockKeys: string[];
  statusLine: string;
  nodeDescriptor?: TaskNodeDescriptor;
}

export const terminalSuccess = (status: TaskStatus) => status === "succeeded" || status === "skipped" || status === "deleted";
export const terminalDone = (status: TaskStatus) => terminalSuccess(status) || status === "failed" || status === "cancelled";
