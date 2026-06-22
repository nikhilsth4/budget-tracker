import type { TaskRow, TaskCompletionRow } from "@/lib/supabase/types";

/** Local YYYY-MM-DD for a Date. */
export function toDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Add (or subtract) whole days to a YYYY-MM-DD string. */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/**
 * Calendar date (YYYY-MM-DD) of a timestamptz, in the VIEWER's local timezone.
 * created_at / archived_at are UTC instants; slicing their UTC date and comparing
 * it to a local `day` string misclassifies the boundary — a habit created at, say,
 * 02:08 UTC reads as "tomorrow" for viewers behind UTC and vanishes from today.
 * Converting the instant to the local calendar date (the same basis as `today`)
 * fixes that. Note: `due_on` is a plain `date` column, not a timestamp, so it is
 * compared as a raw string elsewhere — do NOT pass it through here.
 */
function localDateOf(ts: string): string {
  return toDateStr(new Date(ts));
}

/**
 * Per-task streak: consecutive completed days, with a same-day grace period.
 * If done today, count ends today; else if done yesterday, count ends yesterday;
 * else 0.
 */
export function streakFromDates(done: Set<string>, today: string): number {
  let anchor: string;
  if (done.has(today)) {
    anchor = today;
  } else {
    const yesterday = addDays(today, -1);
    if (done.has(yesterday)) anchor = yesterday;
    else return 0;
  }
  let count = 0;
  let cursor = anchor;
  while (done.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

/**
 * Overall daily streak: consecutive days where every daily habit active that
 * day was completed. "Active that day" = created on/before the day and not
 * archived on/before it. Same grace period as per-task streaks.
 */
export function overallDailyStreak(
  tasks: TaskRow[],
  completions: TaskCompletionRow[],
  today: string,
): number {
  const doneByDay = new Map<string, Set<string>>();
  for (const c of completions) {
    let set = doneByDay.get(c.done_on);
    if (!set) {
      set = new Set();
      doneByDay.set(c.done_on, set);
    }
    set.add(c.task_id);
  }
  const dailyTasks = tasks.filter((t) => t.kind === "daily");

  const dayComplete = (day: string): boolean => {
    const active = dailyTasks.filter(
      (t) =>
        localDateOf(t.created_at) <= day &&
        (t.archived_at === null || localDateOf(t.archived_at) > day),
    );
    if (active.length === 0) return false;
    const doneSet = doneByDay.get(day) ?? new Set<string>();
    return active.every((t) => doneSet.has(t.id));
  };

  let cursor = dayComplete(today) ? today : addDays(today, -1);
  let count = 0;
  while (dayComplete(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export interface TaskView {
  task: TaskRow;
  done: boolean;
  overdue: boolean;
  streak: number;
}

export interface DayTasks {
  daily: TaskView[];
  once: TaskView[];
  overallStreak: number;
}

/** Sort: timed before untimed, ascending time, then manual sort, then created_at. */
export function compareTasks(a: TaskRow, b: TaskRow): number {
  const at = a.time_of_day;
  const bt = b.time_of_day;
  if (at && bt && at !== bt) return at < bt ? -1 : 1;
  if (at && !bt) return -1;
  if (!at && bt) return 1;
  if (a.sort !== b.sort) return a.sort - b.sort;
  return a.created_at < b.created_at ? -1 : 1;
}

/** Build the ordered task lists + overall streak for a given day. */
export function buildDay(
  tasks: TaskRow[],
  completions: TaskCompletionRow[],
  day: string,
): DayTasks {
  const datesByTask = new Map<string, Set<string>>();
  for (const c of completions) {
    let set = datesByTask.get(c.task_id);
    if (!set) {
      set = new Set();
      datesByTask.set(c.task_id, set);
    }
    set.add(c.done_on);
  }

  const daily: TaskView[] = [];
  const once: TaskView[] = [];

  for (const t of tasks) {
    const dates = datesByTask.get(t.id) ?? new Set<string>();
    if (t.kind === "daily") {
      if (localDateOf(t.created_at) > day) continue;
      if (t.archived_at !== null && localDateOf(t.archived_at) <= day) continue;
      daily.push({
        task: t,
        done: dates.has(day),
        overdue: false,
        streak: streakFromDates(dates, day),
      });
    } else {
      if (dates.size > 0) {
        // A completed one-time task lingers (shown as done) only on the day it
        // was completed, then drops off once that day has passed.
        if (!dates.has(day)) continue;
        once.push({ task: t, done: true, overdue: false, streak: 0 });
        continue;
      }
      if (t.due_on === null || t.due_on > day) continue; // undated or future
      once.push({ task: t, done: false, overdue: t.due_on < day, streak: 0 });
    }
  }

  daily.sort((a, b) => compareTasks(a.task, b.task));
  once.sort((a, b) => compareTasks(a.task, b.task));
  return { daily, once, overallStreak: overallDailyStreak(tasks, completions, day) };
}

/** Active daily habits not completed on the given day (for catch-up). */
export function outstandingDaily(
  tasks: TaskRow[],
  completions: TaskCompletionRow[],
  day: string,
): TaskView[] {
  return buildDay(tasks, completions, day).daily.filter((v) => !v.done);
}
