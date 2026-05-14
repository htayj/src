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

export interface TaskMetadata {
  source: string;
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
}

export const terminalSuccess = (status: TaskStatus) => status === "succeeded" || status === "skipped" || status === "deleted";
export const terminalDone = (status: TaskStatus) => terminalSuccess(status) || status === "failed" || status === "cancelled";
