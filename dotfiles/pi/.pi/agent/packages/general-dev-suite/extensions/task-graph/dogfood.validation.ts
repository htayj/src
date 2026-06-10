import assert from "node:assert/strict";
import { renderReadyInstructions } from "./display";
import { createRun } from "./formulas";
import { buildTaskPrompt, readyTasks, runnerExecutionGuidance } from "./scheduler";

const input = `Autoimprove the task graph extension by building projects through tmux-puppeted child Pi workers.

Objective test/artifacts:
- At least three subfolder projects exist under /home/tay/projects/autoprojects, each with .git, README.md, and a passing validation command.
- Evidence that implementation was performed by tmux-puppeted child Pi sessions with transcript logs.
- Child project logs and run files demonstrate task_graph_create, task_graph_next, and task_graph_update.
- Extension validation and a live smoke test are recorded.
- A reusable skill/playbook documents the method.
`;

const run = createRun("/tmp/task-graph-dogfood-validation", "autoimprove", input, {
  oracleConsult: false,
  decompose: false,
});

const tasks = Object.values(run.tasks);
const plan = tasks.find((task) => task.kind === "PLAN");
assert(plan, "PLAN task exists");
const objective = plan!.metadata.autoimproveObjective;
assert(objective, "autoimprove objective metadata is attached to PLAN");
assert.equal(objective!.requiresTmuxPuppetedPi, true, "tmux-puppeted Pi requirement detected");
assert.equal(objective!.requiresTaskGraphDogfood, true, "task graph dogfood requirement detected");
assert.equal(objective!.requiresReusableSkill, true, "skill/playbook requirement detected");
assert(objective!.checklist.some((item) => /three subfolder projects/i.test(item)), "three-project checklist extracted");
assert(objective!.checklist.some((item) => /transcript logs/i.test(item)), "transcript checklist extracted");
assert(objective!.checklist.some((item) => /task_graph_create/i.test(item)), "task graph tool checklist extracted");

plan!.status = "succeeded";
const grillReady = readyTasks(run);
assert(grillReady.some((task) => task.kind === "GRILL"), "GRILL is ready after PLAN");
const grillInstructions = renderReadyInstructions(run);
assert.match(grillInstructions, /Manual gate: do not launch a subagent/, "manual gate guidance rendered");
assert.match(grillInstructions, /task_graph_update/, "manual gate update instruction rendered");

const implement = tasks.find((task) => task.kind === "IMPLEMENT");
assert(implement, "IMPLEMENT task exists");
const implementPrompt = buildTaskPrompt(run, implement!);
assert.match(implementPrompt, /Autoimprove objective evidence contract/, "objective block in IMPLEMENT prompt");
assert.match(implementPrompt, /tmux-puppeted child Pi required: yes/, "tmux requirement in IMPLEMENT prompt");
assert.match(implementPrompt, /do not directly edit external project code/i, "IMPLEMENT prompt forbids direct external project edits when tmux is required");
assert.match(implementPrompt, /transcripts, child run ids, or child \.pi\/dev-suite\/task-graph run files/i, "IMPLEMENT prompt requires child evidence");

const goalTest = tasks.find((task) => task.kind === "GOAL_TEST");
assert(goalTest, "GOAL_TEST task exists");
const goalPrompt = buildTaskPrompt(run, goalTest!);
assert.match(goalPrompt, /transcript paths, child run ids/, "GOAL_TEST asks for child evidence");

const evaluate = tasks.find((task) => task.kind === "EVALUATE");
assert(evaluate, "EVALUATE task exists");
const evalPrompt = buildTaskPrompt(run, evaluate!);
assert.match(evalPrompt, /all required transcript\/child task-graph evidence exists/, "EVALUATE fails missing evidence");

for (const task of tasks) {
  if (["PLAN", "GRILL", "IMPLEMENT", "GOAL_TEST", "EVALUATE", "CODE_REVIEW"].includes(task.kind)) task.status = "succeeded";
}
const lint = tasks.find((task) => task.kind === "LINT");
assert(lint, "LINT task exists");
lint!.status = "pending";
const lintInstructions = renderReadyInstructions(run);
assert.match(lintInstructions, /Direct-safe stage: run only the bounded command\/action/, "direct-safe guidance rendered");
assert.match(lintInstructions, /Launch with: run the bounded local command\/action directly/, "direct-safe launch instruction rendered");
assert.match(runnerExecutionGuidance(lint!), /Direct-safe stage/, "runner guidance helper handles direct-safe tasks");

console.log("task graph dogfood validation passed");
