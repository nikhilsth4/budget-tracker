import { describe, it, expect } from "vitest";
import {
  addDays,
  toDateStr,
  streakFromDates,
  overallDailyStreak,
  buildDay,
  compareTasks,
  outstandingDaily,
} from "@/lib/tasks";
import type { TaskRow, TaskCompletionRow } from "@/lib/supabase/types";

function task(p: Partial<TaskRow> & { id: string }): TaskRow {
  return {
    id: p.id,
    user_id: "u",
    title: p.title ?? p.id,
    kind: p.kind ?? "daily",
    due_on: p.due_on ?? null,
    time_of_day: p.time_of_day ?? null,
    sort: p.sort ?? 0,
    archived_at: p.archived_at ?? null,
    created_at: p.created_at ?? "2026-01-01T00:00:00.000Z",
  };
}

function done(task_id: string, done_on: string): TaskCompletionRow {
  return { id: `${task_id}-${done_on}`, user_id: "u", task_id, done_on, created_at: "" };
}

describe("date helpers", () => {
  it("addDays crosses month boundaries", () => {
    expect(addDays("2026-06-30", 1)).toBe("2026-07-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("toDateStr formats local date", () => {
    expect(toDateStr(new Date(2026, 5, 21))).toBe("2026-06-21");
  });
});

describe("streakFromDates (per-task)", () => {
  const today = "2026-06-21";
  it("counts a run ending today when done today", () => {
    const s = new Set(["2026-06-19", "2026-06-20", "2026-06-21"]);
    expect(streakFromDates(s, today)).toBe(3);
  });
  it("keeps the streak when done yesterday but not yet today (grace)", () => {
    const s = new Set(["2026-06-19", "2026-06-20"]);
    expect(streakFromDates(s, today)).toBe(2);
  });
  it("is 0 when neither today nor yesterday is done", () => {
    const s = new Set(["2026-06-18", "2026-06-19"]);
    expect(streakFromDates(s, today)).toBe(0);
  });
  it("stops at the first gap", () => {
    const s = new Set(["2026-06-21", "2026-06-20", "2026-06-18"]);
    expect(streakFromDates(s, today)).toBe(2);
  });
  it("is 0 for an empty set", () => {
    expect(streakFromDates(new Set(), today)).toBe(0);
  });
});

describe("overallDailyStreak", () => {
  const today = "2026-06-21";
  it("counts consecutive days where all active daily habits were done", () => {
    const tasks = [
      task({ id: "a", created_at: "2026-06-01T00:00:00Z" }),
      task({ id: "b", created_at: "2026-06-01T00:00:00Z" }),
    ];
    const completions = [
      done("a", "2026-06-20"), done("b", "2026-06-20"),
      done("a", "2026-06-21"), done("b", "2026-06-21"),
    ];
    expect(overallDailyStreak(tasks, completions, today)).toBe(2);
  });
  it("applies grace: today incomplete does not break a streak ending yesterday", () => {
    const tasks = [task({ id: "a", created_at: "2026-06-01T00:00:00Z" })];
    const completions = [done("a", "2026-06-19"), done("a", "2026-06-20")];
    expect(overallDailyStreak(tasks, completions, today)).toBe(2);
  });
  it("does not penalize days before a habit existed", () => {
    const tasks = [
      task({ id: "a", created_at: "2026-06-01T00:00:00Z" }),
      task({ id: "b", created_at: "2026-06-21T08:00:00Z" }),
    ];
    const completions = [
      done("a", "2026-06-20"),
      done("a", "2026-06-21"), done("b", "2026-06-21"),
    ];
    expect(overallDailyStreak(tasks, completions, today)).toBe(2);
  });
  it("stops counting an archived habit from its archive date", () => {
    const tasks = [
      task({ id: "a", created_at: "2026-06-01T00:00:00Z" }),
      task({ id: "b", created_at: "2026-06-01T00:00:00Z", archived_at: "2026-06-21T00:00:00Z" }),
    ];
    const completions = [
      done("a", "2026-06-20"), done("b", "2026-06-20"),
      done("a", "2026-06-21"),
    ];
    expect(overallDailyStreak(tasks, completions, today)).toBe(2);
  });
  it("returns 0 when there are no active daily habits", () => {
    expect(overallDailyStreak([], [], today)).toBe(0);
  });
});

describe("compareTasks ordering", () => {
  it("puts timed tasks before untimed, then by time", () => {
    const a = task({ id: "a", time_of_day: "09:00:00" });
    const b = task({ id: "b", time_of_day: "07:00:00" });
    const c = task({ id: "c", time_of_day: null, sort: 0 });
    const sorted = [a, c, b].sort(compareTasks).map((t) => t.id);
    expect(sorted).toEqual(["b", "a", "c"]);
  });
  it("orders untimed tasks by manual sort", () => {
    const a = task({ id: "a", sort: 2 });
    const b = task({ id: "b", sort: 1 });
    expect([a, b].sort(compareTasks).map((t) => t.id)).toEqual(["b", "a"]);
  });
});

describe("buildDay", () => {
  const day = "2026-06-21";
  it("lists active daily habits with done state and streaks", () => {
    const tasks = [task({ id: "a", created_at: "2026-06-01T00:00:00Z" })];
    const completions = [done("a", "2026-06-20"), done("a", "2026-06-21")];
    const r = buildDay(tasks, completions, day);
    expect(r.daily).toHaveLength(1);
    expect(r.daily[0].done).toBe(true);
    expect(r.daily[0].streak).toBe(2);
  });
  it("excludes daily habits not yet created or already archived", () => {
    const tasks = [
      task({ id: "future", created_at: "2026-06-22T00:00:00Z" }),
      task({ id: "archived", created_at: "2026-06-01T00:00:00Z", archived_at: "2026-06-10T00:00:00Z" }),
    ];
    expect(buildDay(tasks, [], day).daily).toHaveLength(0);
  });
  it("rolls overdue one-time tasks forward and flags them overdue", () => {
    const tasks = [task({ id: "o", kind: "once", due_on: "2026-06-18" })];
    const r = buildDay(tasks, [], day);
    expect(r.once).toHaveLength(1);
    expect(r.once[0].overdue).toBe(true);
  });
  it("hides future-dated and previously-completed one-time tasks", () => {
    const tasks = [
      task({ id: "future", kind: "once", due_on: "2026-06-25" }),
      task({ id: "doneOnce", kind: "once", due_on: "2026-06-19" }),
    ];
    const completions = [done("doneOnce", "2026-06-19")]; // completed on a prior day
    expect(buildDay(tasks, completions, day).once).toHaveLength(0);
  });
  it("keeps a one-time task completed today, marked done (drops off next day)", () => {
    const tasks = [task({ id: "o", kind: "once", due_on: "2026-06-21" })];
    const completions = [done("o", "2026-06-21")];
    const today = buildDay(tasks, completions, day);
    expect(today.once).toHaveLength(1);
    expect(today.once[0].done).toBe(true);
    // the following day it has dropped off
    expect(buildDay(tasks, completions, "2026-06-22").once).toHaveLength(0);
  });
  it("includes the overall streak", () => {
    const tasks = [task({ id: "a", created_at: "2026-06-01T00:00:00Z" })];
    const completions = [done("a", "2026-06-20"), done("a", "2026-06-21")];
    expect(buildDay(tasks, completions, day).overallStreak).toBe(2);
  });
  it("shows a daily habit created earlier the same day (timezone boundary)", () => {
    // created_at is an instant within `day` (UTC test env); must still appear.
    const tasks = [task({ id: "a", created_at: "2026-06-21T23:30:00Z" })];
    expect(buildDay(tasks, [], day).daily).toHaveLength(1);
  });
});

describe("outstandingDaily", () => {
  it("returns active daily habits not done that day", () => {
    const tasks = [
      task({ id: "a", created_at: "2026-06-01T00:00:00Z" }),
      task({ id: "b", created_at: "2026-06-01T00:00:00Z" }),
    ];
    const completions = [done("a", "2026-06-20")];
    const r = outstandingDaily(tasks, completions, "2026-06-20");
    expect(r.map((v) => v.task.id)).toEqual(["b"]);
  });
});
