import type { FailureRecord, TaskGraphRun, TaskStatus } from "./schema";
import { terminalDone } from "./schema";
import { readyTasks, updateTask } from "./scheduler";

export function refreshRunStatus(run: TaskGraphRun) {
  const tasks = Object.values(run.tasks).filter((task) => task.status !== "deleted");
  const readyCount = tasks.length ? readyTasks(run).length : 0;
  if (!tasks.length) run.status = "pending";
  else if (tasks.every((task) => task.status === "succeeded" || task.status === "skipped")) run.status = "succeeded";
  else if (tasks.some((task) => task.status === "running")) run.status = "running";
  else if (readyCount > 0) run.status = "ready";
  else if (tasks.some((task) => task.status === "awaiting_input")) run.status = "awaiting_input";
  else if (tasks.some((task) => task.status === "failed")) run.status = "failed";
  else run.status = "blocked";
}

export function closeOrOpenAttempt(task: TaskGraphRun["tasks"][string], status: TaskStatus, summary?: string, failure?: FailureRecord) {
  const runner = task.runner;
  let attempt = task.attempts[task.attempts.length - 1];
  if (!attempt || attempt.endedAt) {
    attempt = {
      attemptId: `attempt-${Date.now().toString(36)}`,
      startedAt: new Date().toISOString(),
      status,
      runner,
      inputSummary: task.title,
      envRetryCount: 0,
      codeRetryIteration: Number(task.metadata.iteration ?? 1),
    };
    task.attempts.push(attempt);
  }
  attempt.status = status;
  if (summary) attempt.outputSummary = summary;
  if (failure) attempt.error = failure;
  if (terminalDone(status)) attempt.endedAt = new Date().toISOString();
}

export function applyManualTaskStatus(run: TaskGraphRun, taskId: string, status: TaskStatus, summary = `Manual ${status} from task graph UI`) {
  const task = run.tasks[taskId];
  if (!task) throw new Error(`Unknown task id: ${taskId}`);
  const failure: FailureRecord | undefined = status === "failed"
    ? { failedStage: task.kind, failureClass: "operator", message: summary }
    : undefined;
  closeOrOpenAttempt(task, status, summary, failure);
  updateTask(run, taskId, { status });
  if (failure) task.metadata.failureContext = failure;
  refreshRunStatus(run);
  return task;
}

export function deleteTask(run: TaskGraphRun, taskId: string) {
  return applyManualTaskStatus(run, taskId, "deleted", "Manual delete from task graph UI");
}
