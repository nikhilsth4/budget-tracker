import { describe, it, expect } from "vitest";
import {
  addDays,
  toDateStr,
  streakFromDates,
  overallDailyStreak,
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
