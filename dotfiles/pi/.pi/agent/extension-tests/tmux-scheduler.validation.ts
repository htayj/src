import assert from "node:assert/strict";
import {
  normalizeScheduledLines,
  parseScheduleTime,
  parseTmuxSendLaterArgs,
} from "../extensions/tmux-scheduler/core";

const now = Date.UTC(2026, 5, 10, 12, 0, 0);

assert.deepEqual(normalizeScheduledLines("one\r\ntwo", ["three\nfour"]), ["one", "two", "three", "four"]);
assert.equal(parseScheduleTime({ delay_seconds: 2.5 }, now), now + 2_500);
assert.equal(parseScheduleTime({ run_at: "+5m" }, now), now + 300_000);
assert.equal(parseScheduleTime({ run_at: "1h" }, now), now + 3_600_000);
assert.equal(parseScheduleTime({ run_at: "2026-06-10T12:30:00.000Z" }, now), Date.UTC(2026, 5, 10, 12, 30, 0));
assert.throws(() => parseScheduleTime({ run_at: "+1m", delay_seconds: 1 }, now), /either delay_seconds or run_at/);
assert.throws(() => parseScheduleTime({}, now), /Provide delay_seconds or run_at/);
assert.throws(() => parseScheduleTime({ run_at: "not-a-time" }, now), /Could not parse/);

const futureLocal = parseScheduleTime({ run_at: "23:59" }, now);
assert(futureLocal > now, "time-only schedules should be in the future");
assert(futureLocal <= now + 86_400_000, "time-only schedules should be today or tomorrow");

const parsed = parseTmuxSendLaterArgs("5m %7 -- make test", now);
assert.equal(parsed.target, "%7");
assert.equal(parsed.text, "make test");
assert.equal(parsed.enter, true);
assert.equal(parsed.run_at, new Date(now + 300_000).toISOString());

const parsedNoTarget = parseTmuxSendLaterArgs("+10s -- echo hi", now);
assert.equal(parsedNoTarget.target, undefined);
assert.equal(parsedNoTarget.text, "echo hi");
assert.equal(parsedNoTarget.run_at, new Date(now + 10_000).toISOString());

assert.throws(() => parseTmuxSendLaterArgs("5m make test", now), /Missing/);
assert.throws(() => parseTmuxSendLaterArgs("5m a b -- test", now), /Usage/);

console.log("tmux scheduler extension validation passed");
