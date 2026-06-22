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

/** YYYY-MM-DD slice of an ISO timestamp or date string. */
function dateOf(ts: string): string {
  return ts.slice(0, 10);
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
        dateOf(t.created_at) <= day &&
        (t.archived_at === null || dateOf(t.archived_at) > day),
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
