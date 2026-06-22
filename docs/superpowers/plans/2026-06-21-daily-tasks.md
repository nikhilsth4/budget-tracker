# Daily Tasks Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Daily Tasks tab — recurring daily habits and one-time tasks with per-task and overall daily streaks, swipe/tap completion, and a yesterday catch-up.

**Architecture:** Two new Supabase tables (`tasks` definitions + `task_completions` event log) with RLS, following the app's existing per-user table conventions. All streak/ordering/"what's due today" logic lives in a pure, unit-tested `src/lib/tasks.ts`; thin Supabase wrappers in `src/lib/data/tasks.ts`; a server component fetches and a client `TasksView` orchestrates interaction. Reports is removed from navigation; Tasks takes its slot.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase (`@supabase/ssr` / `supabase-js`), Tailwind v4, Framer Motion, Vitest + Testing Library (jsdom).

## Global Constraints

- All new tables use `user_id uuid not null default auth.uid()` + RLS policy `using (auth.uid() = user_id) with check (auth.uid() = user_id)` — mirror `supabase/migrations/0001_init.sql`.
- Data-access functions take a `SupabaseClient` as their first arg and live in `src/lib/data/*` (pattern: `src/lib/data/employers.ts`).
- Domain logic is pure (no Supabase imports) and lives in `src/lib/*.ts`, unit-tested under `tests/`.
- Date columns store/compare as `YYYY-MM-DD` strings; `time_of_day` as `HH:MM[:SS]` strings.
- Styling uses the existing CSS variables (`--surface`, `--surface-2`, `--ink`, `--muted`, `--accent`, `--line`, `--danger`, `--ok`, `--shadow`, `--radius`) and Tailwind. Hover effects gated to `md:`/`[@media(hover:hover)]`; touch uses `active:`.
- All Framer Motion animation must honor the global `prefers-reduced-motion` guard already in the app.
- Path alias: `@/` → `src/`.
- Run tests with `npm test` (vitest run); typecheck with `npx tsc --noEmit`; lint with `npm run lint`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `supabase/migrations/0002_tasks.sql` | `tasks` + `task_completions` tables, indexes, RLS (create) |
| `src/lib/supabase/types.ts` | `TaskKind`, `TaskRow`, `TaskCompletionRow` types (modify) |
| `src/lib/tasks.ts` | Pure domain logic: date helpers, streaks, day assembly, ordering (create) |
| `src/lib/data/tasks.ts` | Supabase CRUD + completion toggles (create) |
| `src/app/(app)/tasks/page.tsx` | Server component: fetch tasks + completions (create) |
| `src/components/tasks/TasksView.tsx` | Client orchestration: derive day, optimistic toggles, wire sheet (create) |
| `src/components/tasks/TaskRow.tsx` | Swipe/tap completion row with edit/delete reveal (create) |
| `src/components/tasks/StreakChip.tsx` | Overall daily streak header chip (create) |
| `src/components/tasks/YesterdayCatchUp.tsx` | Collapsible yesterday catch-up footer (create) |
| `src/components/tasks/TaskFormSheet.tsx` | Create/edit sheet (reuses `Sheet`) (create) |
| `src/components/nav/BottomTabBar.tsx` | Reports → Tasks (modify) |
| `src/components/nav/TopBar.tsx` | Add Tasks link (modify) |
| `tests/tasks.test.ts` | Unit tests for `src/lib/tasks.ts` (create) |
| `tests/TaskRow.test.tsx` | Smoke test: tap toggles completion (create) |

---

## Task 1: Database migration + row types

**Files:**
- Create: `supabase/migrations/0002_tasks.sql`
- Modify: `src/lib/supabase/types.ts`

**Interfaces:**
- Produces: tables `public.tasks` (`id, user_id, title, kind, due_on, time_of_day, sort, archived_at, created_at`) and `public.task_completions` (`id, user_id, task_id, done_on, created_at`); TS types `TaskKind = "daily" | "once"`, `TaskRow`, `TaskCompletionRow`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0002_tasks.sql`:

```sql
-- Task definitions
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  kind text not null default 'daily' check (kind in ('daily','once')),
  due_on date,
  time_of_day time,
  sort integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

-- Completion event log (one row per task per day done)
create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  task_id uuid not null references public.tasks on delete cascade,
  done_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (task_id, done_on)
);

create index tasks_user_idx on public.tasks (user_id);
create index task_completions_user_date_idx on public.task_completions (user_id, done_on);

alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;

create policy "own tasks" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own task_completions" on public.task_completions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 2: Add row types**

In `src/lib/supabase/types.ts`, append:

```ts
export type TaskKind = "daily" | "once";

export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  kind: TaskKind;
  due_on: string | null;
  time_of_day: string | null;
  sort: number;
  archived_at: string | null;
  created_at: string;
}

export interface TaskCompletionRow {
  id: string;
  user_id: string;
  task_id: string;
  done_on: string;
  created_at: string;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Apply the migration**

Apply `0002_tasks.sql` to your Supabase project (SQL editor or `supabase db push`), then verify the tables exist (e.g. `select * from public.tasks limit 1;` returns 0 rows, no error). See `supabase/README.md`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0002_tasks.sql src/lib/supabase/types.ts
git commit -m "feat(tasks): add tasks + task_completions schema and row types"
```

---

## Task 2: Pure streak logic (date helpers + streaks)

**Files:**
- Create: `src/lib/tasks.ts`
- Test: `tests/tasks.test.ts`

**Interfaces:**
- Consumes: `TaskRow`, `TaskCompletionRow` from `@/lib/supabase/types`.
- Produces:
  - `toDateStr(d: Date): string` — local `YYYY-MM-DD`.
  - `addDays(dateStr: string, n: number): string`.
  - `streakFromDates(done: Set<string>, today: string): number` — per-task streak with same-day grace.
  - `overallDailyStreak(tasks: TaskRow[], completions: TaskCompletionRow[], today: string): number`.

- [ ] **Step 1: Write the failing tests**

Create `tests/tasks.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tasks`
Expected: FAIL — `src/lib/tasks.ts` does not exist / functions not exported.

- [ ] **Step 3: Implement the helpers + streaks**

Create `src/lib/tasks.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tasks`
Expected: PASS (all date-helper and streak tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tasks.ts tests/tasks.test.ts
git commit -m "feat(tasks): pure date helpers and per-task/overall streak logic"
```

---

## Task 3: Pure day assembly (ordering, rolled-forward one-time, outstanding)

**Files:**
- Modify: `src/lib/tasks.ts`
- Test: `tests/tasks.test.ts`

**Interfaces:**
- Consumes: `streakFromDates`, `overallDailyStreak` (Task 2).
- Produces:
  - `interface TaskView { task: TaskRow; done: boolean; overdue: boolean; streak: number }`
  - `interface DayTasks { daily: TaskView[]; once: TaskView[]; overallStreak: number }`
  - `compareTasks(a: TaskRow, b: TaskRow): number` — timed-before-untimed, ascending time, then `sort`, then `created_at`.
  - `buildDay(tasks, completions, day): DayTasks`.
  - `outstandingDaily(tasks, completions, day): TaskView[]`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/tasks.test.ts` (the `task`/`done` helpers from Task 2 are reused):

```ts
import { buildDay, compareTasks, outstandingDaily } from "@/lib/tasks";

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
  it("hides future-dated and completed one-time tasks", () => {
    const tasks = [
      task({ id: "future", kind: "once", due_on: "2026-06-25" }),
      task({ id: "doneOnce", kind: "once", due_on: "2026-06-19" }),
    ];
    const completions = [done("doneOnce", "2026-06-19")];
    expect(buildDay(tasks, completions, day).once).toHaveLength(0);
  });
  it("includes the overall streak", () => {
    const tasks = [task({ id: "a", created_at: "2026-06-01T00:00:00Z" })];
    const completions = [done("a", "2026-06-20"), done("a", "2026-06-21")];
    expect(buildDay(tasks, completions, day).overallStreak).toBe(2);
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tasks`
Expected: FAIL — `buildDay`, `compareTasks`, `outstandingDaily` not exported.

- [ ] **Step 3: Implement day assembly**

Append to `src/lib/tasks.ts`:

```ts
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
      if (dateOf(t.created_at) > day) continue;
      if (t.archived_at !== null && dateOf(t.archived_at) <= day) continue;
      daily.push({
        task: t,
        done: dates.has(day),
        overdue: false,
        streak: streakFromDates(dates, day),
      });
    } else {
      if (dates.size > 0) continue; // a completed one-time task drops off
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tasks`
Expected: PASS (all Task 2 + Task 3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tasks.ts tests/tasks.test.ts
git commit -m "feat(tasks): day assembly, ordering, rolled-forward one-time, catch-up"
```

---

## Task 4: Data-access layer

**Files:**
- Create: `src/lib/data/tasks.ts`

**Interfaces:**
- Consumes: `TaskRow`, `TaskCompletionRow`, `TaskKind` from `@/lib/supabase/types`.
- Produces:
  - `listTasks(sb): Promise<TaskRow[]>` — all tasks (incl. archived), ordered by `sort` then `created_at`.
  - `listCompletions(sb, fromDate: string): Promise<TaskCompletionRow[]>` — completions with `done_on >= fromDate`.
  - `interface NewTask { title: string; kind: TaskKind; due_on: string | null; time_of_day: string | null }`
  - `createTask(sb, input: NewTask): Promise<TaskRow>`
  - `updateTask(sb, id: string, patch: Partial<NewTask>): Promise<void>`
  - `archiveTask(sb, id: string): Promise<void>`
  - `deleteTask(sb, id: string): Promise<void>`
  - `addCompletion(sb, taskId: string, doneOn: string): Promise<void>` — idempotent (ignores unique violation `23505`).
  - `removeCompletion(sb, taskId: string, doneOn: string): Promise<void>`

- [ ] **Step 1: Implement the data module**

Create `src/lib/data/tasks.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskRow, TaskCompletionRow, TaskKind } from "@/lib/supabase/types";

export async function listTasks(sb: SupabaseClient): Promise<TaskRow[]> {
  const { data, error } = await sb
    .from("tasks")
    .select("*")
    .order("sort")
    .order("created_at");
  if (error) throw error;
  return data as TaskRow[];
}

export async function listCompletions(
  sb: SupabaseClient,
  fromDate: string,
): Promise<TaskCompletionRow[]> {
  const { data, error } = await sb
    .from("task_completions")
    .select("*")
    .gte("done_on", fromDate);
  if (error) throw error;
  return data as TaskCompletionRow[];
}

export interface NewTask {
  title: string;
  kind: TaskKind;
  due_on: string | null;
  time_of_day: string | null;
}

export async function createTask(sb: SupabaseClient, input: NewTask): Promise<TaskRow> {
  const { data, error } = await sb.from("tasks").insert(input).select().single();
  if (error) throw error;
  return data as TaskRow;
}

export async function updateTask(
  sb: SupabaseClient,
  id: string,
  patch: Partial<NewTask>,
): Promise<void> {
  const { error } = await sb.from("tasks").update(patch).eq("id", id);
  if (error) throw error;
}

export async function archiveTask(sb: SupabaseClient, id: string): Promise<void> {
  const { error } = await sb
    .from("tasks")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTask(sb: SupabaseClient, id: string): Promise<void> {
  const { error } = await sb.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function addCompletion(
  sb: SupabaseClient,
  taskId: string,
  doneOn: string,
): Promise<void> {
  const { error } = await sb
    .from("task_completions")
    .insert({ task_id: taskId, done_on: doneOn });
  if (error && error.code !== "23505") throw error; // ignore "already complete"
}

export async function removeCompletion(
  sb: SupabaseClient,
  taskId: string,
  doneOn: string,
): Promise<void> {
  const { error } = await sb
    .from("task_completions")
    .delete()
    .eq("task_id", taskId)
    .eq("done_on", doneOn);
  if (error) throw error;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/tasks.ts
git commit -m "feat(tasks): supabase data-access layer for tasks and completions"
```

---

## Task 5: Route, server page, and navigation swap

**Files:**
- Create: `src/app/(app)/tasks/page.tsx`
- Modify: `src/components/nav/BottomTabBar.tsx`
- Modify: `src/components/nav/TopBar.tsx`
- Create (temporary stub, replaced in Task 8): `src/components/tasks/TasksView.tsx`

**Interfaces:**
- Consumes: `listTasks`, `listCompletions` (Task 4); `toDateStr`, `addDays` (Task 2).
- Produces: route `/tasks`; `TasksView` component accepting `{ tasks: TaskRow[]; completions: TaskCompletionRow[] }`.

- [ ] **Step 1: Create a minimal TasksView stub**

Create `src/components/tasks/TasksView.tsx` (replaced fully in Task 8 — this makes the route build now):

```tsx
"use client";

import type { TaskRow, TaskCompletionRow } from "@/lib/supabase/types";

export function TasksView({
  tasks,
}: {
  tasks: TaskRow[];
  completions: TaskCompletionRow[];
}) {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Tasks</h1>
      <p className="text-sm text-[var(--muted)]">{tasks.length} tasks</p>
    </div>
  );
}
```

- [ ] **Step 2: Create the server page**

Create `src/app/(app)/tasks/page.tsx`:

```tsx
import { createServerSupabase } from "@/lib/supabase/server";
import { listTasks, listCompletions } from "@/lib/data/tasks";
import { TasksView } from "@/components/tasks/TasksView";
import { toDateStr, addDays } from "@/lib/tasks";

export default async function TasksPage() {
  const supabase = await createServerSupabase();
  const windowStart = addDays(toDateStr(new Date()), -366);
  const [tasks, completions] = await Promise.all([
    listTasks(supabase),
    listCompletions(supabase, windowStart),
  ]);
  return <TasksView tasks={tasks} completions={completions} />;
}
```

- [ ] **Step 3: Swap Reports → Tasks in the bottom tab bar**

Replace `src/components/nav/BottomTabBar.tsx` entirely with:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AddButton } from "@/components/add/AddButton";

const leftTabs = [
  { href: "/budget", label: "Budget", icon: "◑" },
  { href: "/shifts", label: "Shifts", icon: "◷" },
] as const;

const rightTabs = [
  { href: "/tasks", label: "Tasks", icon: "✓" },
  { href: "/settings", label: "Settings", icon: "⚙" },
] as const;

function Tab({ href, label, icon }: { href: string; label: string; icon: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs"
      style={{ color: active ? "var(--accent)" : "var(--muted)" }}
    >
      <span className="text-xl leading-none">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

export function BottomTabBar() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md items-center border-t border-[var(--line)] bg-[var(--surface)]/95 px-2 backdrop-blur md:hidden">
      {leftTabs.map((t) => (
        <Tab key={t.href} {...t} />
      ))}
      <div className="flex w-16 shrink-0 justify-center">
        <AddButton />
      </div>
      {rightTabs.map((t) => (
        <Tab key={t.href} {...t} />
      ))}
    </nav>
  );
}
```

> Note: this removes the `ComingSoonTab` and its `useToast` import (Reports is gone). The `✓` glyph for Tasks can be refined in the final polish pass.

- [ ] **Step 4: Add the Tasks link to the desktop top bar**

In `src/components/nav/TopBar.tsx`, update the `links` array:

```tsx
const links = [
  { href: "/budget", label: "Budget" },
  { href: "/shifts", label: "Shifts" },
  { href: "/tasks", label: "Tasks" },
  { href: "/settings", label: "Settings" },
] as const;
```

- [ ] **Step 5: Build and verify the route**

Run: `npm run build`
Expected: build succeeds; `/tasks` appears in the route list.

Then run `npm run dev`, sign in, and confirm the Tasks tab appears in both the mobile bottom bar (no Reports) and desktop top bar, and `/tasks` renders "Tasks · N tasks".

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/tasks/page.tsx src/components/tasks/TasksView.tsx src/components/nav/BottomTabBar.tsx src/components/nav/TopBar.tsx
git commit -m "feat(tasks): add /tasks route and swap Reports for Tasks in nav"
```

---

## Task 6: TaskRow — swipe/tap completion with edit/delete reveal

**Files:**
- Create: `src/components/tasks/TaskRow.tsx`
- Test: `tests/TaskRow.test.tsx`

**Interfaces:**
- Consumes: `TaskView` (Task 3); `TaskRow as TaskRowType` from `@/lib/supabase/types`.
- Produces: `TaskRow` component with props
  `{ view: TaskView; onToggle: (task: TaskRowType, done: boolean) => void; onEdit: (task: TaskRowType) => void; onDelete: (task: TaskRowType) => void }`.

- [ ] **Step 1: Write the failing smoke test**

Create `tests/TaskRow.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaskRow } from "@/components/tasks/TaskRow";
import type { TaskRow as TaskRowType } from "@/lib/supabase/types";

const task: TaskRowType = {
  id: "a",
  user_id: "u",
  title: "Gym",
  kind: "daily",
  due_on: null,
  time_of_day: "07:00:00",
  sort: 0,
  archived_at: null,
  created_at: "2026-06-01T00:00:00Z",
};

describe("TaskRow", () => {
  it("renders the title and time", () => {
    render(
      <ul>
        <TaskRow
          view={{ task, done: false, overdue: false, streak: 3 }}
          onToggle={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      </ul>,
    );
    expect(screen.getByText("Gym")).toBeInTheDocument();
    expect(screen.getByText(/7:00/)).toBeInTheDocument();
  });

  it("tapping the row toggles completion to the opposite state", () => {
    const onToggle = vi.fn();
    render(
      <ul>
        <TaskRow
          view={{ task, done: false, overdue: false, streak: 0 }}
          onToggle={onToggle}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      </ul>,
    );
    fireEvent.click(screen.getByRole("button", { name: /toggle gym/i }));
    expect(onToggle).toHaveBeenCalledWith(task, true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- TaskRow`
Expected: FAIL — `src/components/tasks/TaskRow.tsx` does not exist.

- [ ] **Step 3: Implement the row**

Create `src/components/tasks/TaskRow.tsx`:

```tsx
"use client";

import { useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import type { TaskView } from "@/lib/tasks";
import type { TaskRow as TaskRowType } from "@/lib/supabase/types";

function timeLabel(t: string): string {
  const [h, m] = t.split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m), 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const REVEAL = 112; // px the row slides left to expose Edit/Delete

export function TaskRow({
  view,
  onToggle,
  onEdit,
  onDelete,
}: {
  view: TaskView;
  onToggle: (task: TaskRowType, done: boolean) => void;
  onEdit: (task: TaskRowType) => void;
  onDelete: (task: TaskRowType) => void;
}) {
  const { task, done, overdue, streak } = view;
  const controls = useAnimationControls();
  const [revealed, setRevealed] = useState(false);

  function close() {
    controls.start({ x: 0 });
    setRevealed(false);
  }

  function activate() {
    if (revealed) {
      close();
      return;
    }
    onToggle(task, !done);
  }

  return (
    <li className="relative overflow-hidden rounded-2xl">
      {/* Actions revealed behind the row on left-swipe */}
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <button
          type="button"
          onClick={() => {
            close();
            onEdit(task);
          }}
          className="grid w-14 place-items-center bg-[var(--surface-2)] text-sm font-medium text-[var(--ink)]"
          aria-label={`Edit ${task.title}`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => {
            close();
            onDelete(task);
          }}
          className="grid w-14 place-items-center bg-[var(--danger)] text-sm font-medium text-white"
          aria-label={`Delete ${task.title}`}
        >
          Delete
        </button>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -REVEAL, right: REVEAL }}
        dragElastic={0.1}
        animate={controls}
        onDragEnd={(_, info) => {
          if (info.offset.x > 64) {
            onToggle(task, !done);
            close();
          } else if (info.offset.x < -56) {
            controls.start({ x: -REVEAL });
            setRevealed(true);
          } else {
            close();
          }
        }}
        className="relative flex items-center gap-3 bg-[var(--surface)] p-3 shadow-[var(--shadow)]"
      >
        <button
          type="button"
          onClick={activate}
          aria-label={`Toggle ${task.title}`}
          aria-pressed={done}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition active:scale-95"
          style={{
            borderColor: done ? "var(--accent)" : "var(--line)",
            background: done ? "var(--accent)" : "transparent",
            color: "white",
          }}
        >
          {done && <span className="text-sm leading-none">✓</span>}
        </button>

        <button
          type="button"
          onClick={activate}
          className="min-w-0 flex-1 text-left"
        >
          <span
            className="block truncate font-medium transition-colors"
            style={{
              color: done ? "var(--muted)" : "var(--ink)",
              textDecoration: done ? "line-through" : "none",
            }}
          >
            {task.title}
          </span>
          {(task.time_of_day || overdue) && (
            <span className="mt-0.5 flex items-center gap-2 text-xs text-[var(--muted)]">
              {task.time_of_day && <span>{timeLabel(task.time_of_day)}</span>}
              {overdue && <span style={{ color: "var(--danger)" }}>overdue</span>}
            </span>
          )}
        </button>

        {task.kind === "daily" && streak > 0 && (
          <span className="shrink-0 text-sm font-semibold text-[var(--accent)]">
            🔥{streak}
          </span>
        )}
      </motion.div>
    </li>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- TaskRow`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/TaskRow.tsx tests/TaskRow.test.tsx
git commit -m "feat(tasks): swipe/tap TaskRow with edit/delete reveal"
```

---

## Task 7: StreakChip, YesterdayCatchUp, and TaskFormSheet

**Files:**
- Create: `src/components/tasks/StreakChip.tsx`
- Create: `src/components/tasks/YesterdayCatchUp.tsx`
- Create: `src/components/tasks/TaskFormSheet.tsx`

**Interfaces:**
- Consumes: `TaskView` (Task 3); `Sheet` from `@/components/ui/Sheet`; `NewTask` from `@/lib/data/tasks`; `TaskRow as TaskRowType` from `@/lib/supabase/types`.
- Produces:
  - `StreakChip({ streak }: { streak: number })`.
  - `YesterdayCatchUp({ outstanding, onComplete }: { outstanding: TaskView[]; onComplete: (task: TaskRowType) => void })`.
  - `TaskFormSheet({ open, editing, onClose, onSubmit }: { open: boolean; editing: TaskRowType | null; onClose: () => void; onSubmit: (values: NewTask, id: string | null) => void })`.

- [ ] **Step 1: Implement StreakChip**

Create `src/components/tasks/StreakChip.tsx`:

```tsx
export function StreakChip({ streak }: { streak: number }) {
  if (streak <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-sm font-semibold text-[var(--accent)]">
      🔥 {streak} day streak
    </span>
  );
}
```

- [ ] **Step 2: Implement YesterdayCatchUp**

Create `src/components/tasks/YesterdayCatchUp.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { TaskView } from "@/lib/tasks";
import type { TaskRow as TaskRowType } from "@/lib/supabase/types";

export function YesterdayCatchUp({
  outstanding,
  onComplete,
}: {
  outstanding: TaskView[];
  onComplete: (task: TaskRowType) => void;
}) {
  const [open, setOpen] = useState(false);
  if (outstanding.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-3 text-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left text-[var(--muted)]"
      >
        <span>
          Yesterday: {outstanding.length} to catch up
        </span>
        <span className="text-xs">{open ? "Hide" : "Catch up"}</span>
      </button>
      {open && (
        <ul className="mt-3 space-y-2">
          {outstanding.map((v) => (
            <li key={v.task.id} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-[var(--ink)]">{v.task.title}</span>
              <button
                type="button"
                onClick={() => onComplete(v.task)}
                className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1 text-xs font-medium text-white"
              >
                Done
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Implement TaskFormSheet**

Create `src/components/tasks/TaskFormSheet.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { toDateStr } from "@/lib/tasks";
import type { NewTask } from "@/lib/data/tasks";
import type { TaskKind, TaskRow as TaskRowType } from "@/lib/supabase/types";

export function TaskFormSheet({
  open,
  editing,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: TaskRowType | null;
  onClose: () => void;
  onSubmit: (values: NewTask, id: string | null) => void;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<TaskKind>("daily");
  const [dueOn, setDueOn] = useState("");
  const [time, setTime] = useState("");

  // Sync form state whenever the sheet opens (new task) or target changes (edit).
  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? "");
    setKind(editing?.kind ?? "daily");
    setDueOn(editing?.due_on ?? toDateStr(new Date()));
    setTime(editing?.time_of_day ? editing.time_of_day.slice(0, 5) : "");
  }, [open, editing]);

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit(
      {
        title: trimmed,
        kind,
        due_on: kind === "once" ? dueOn : null,
        time_of_day: time ? `${time}:00` : null,
      },
      editing?.id ?? null,
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? "Edit task" : "New task"}>
      <div className="space-y-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you want to do?"
          aria-label="Task title"
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />

        <div className="flex gap-2">
          {(["daily", "once"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition"
              style={{
                borderColor: kind === k ? "var(--accent)" : "var(--line)",
                background: kind === k ? "var(--accent-soft)" : "transparent",
                color: kind === k ? "var(--accent)" : "var(--muted)",
              }}
            >
              {k === "daily" ? "Every day" : "One-time"}
            </button>
          ))}
        </div>

        {kind === "once" && (
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Date</span>
            <input
              type="date"
              value={dueOn}
              onChange={(e) => setDueOn(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        )}

        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Time (optional)</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>

        <button
          type="button"
          onClick={submit}
          className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white"
        >
          {editing ? "Save" : "Add task"}
        </button>
      </div>
    </Sheet>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/StreakChip.tsx src/components/tasks/YesterdayCatchUp.tsx src/components/tasks/TaskFormSheet.tsx
git commit -m "feat(tasks): streak chip, yesterday catch-up, and task form sheet"
```

---

## Task 8: TasksView — compose everything with optimistic toggles

**Files:**
- Modify: `src/components/tasks/TasksView.tsx` (replace the Task 5 stub)

**Interfaces:**
- Consumes: `buildDay`, `outstandingDaily`, `toDateStr`, `addDays` (Tasks 2–3); data fns from `@/lib/data/tasks` (Task 4); `TaskRow`, `StreakChip`, `YesterdayCatchUp`, `TaskFormSheet` (Tasks 6–7); `createBrowserSupabase`, `useToast`, `EmptyState`.
- Produces: the full Tasks tab UI; props unchanged from Task 5 (`{ tasks: TaskRow[]; completions: TaskCompletionRow[] }`).

- [ ] **Step 1: Implement the full view**

Replace `src/components/tasks/TasksView.tsx` with:

```tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, buildDay, outstandingDaily, toDateStr } from "@/lib/tasks";
import { createBrowserSupabase } from "@/lib/supabase/client";
import {
  addCompletion,
  archiveTask,
  createTask,
  deleteTask,
  removeCompletion,
  updateTask,
  type NewTask,
} from "@/lib/data/tasks";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskRow } from "./TaskRow";
import { StreakChip } from "./StreakChip";
import { YesterdayCatchUp } from "./YesterdayCatchUp";
import { TaskFormSheet } from "./TaskFormSheet";
import type {
  TaskRow as TaskRowType,
  TaskCompletionRow,
} from "@/lib/supabase/types";

export function TasksView({
  tasks,
  completions: initialCompletions,
}: {
  tasks: TaskRowType[];
  completions: TaskCompletionRow[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [completions, setCompletions] = useState(initialCompletions);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRowType | null>(null);

  const today = useMemo(() => toDateStr(new Date()), []);
  const yesterday = useMemo(() => addDays(today, -1), [today]);

  const day = useMemo(() => buildDay(tasks, completions, today), [tasks, completions, today]);
  const yesterdayOutstanding = useMemo(
    () => outstandingDaily(tasks, completions, yesterday),
    [tasks, completions, yesterday],
  );

  function setCompletion(taskId: string, dateStr: string, done: boolean) {
    setCompletions((prev) => {
      if (done) {
        if (prev.some((c) => c.task_id === taskId && c.done_on === dateStr)) return prev;
        return [
          ...prev,
          {
            id: `tmp-${taskId}-${dateStr}`,
            user_id: "",
            task_id: taskId,
            done_on: dateStr,
            created_at: "",
          },
        ];
      }
      return prev.filter((c) => !(c.task_id === taskId && c.done_on === dateStr));
    });
  }

  async function toggle(task: TaskRowType, done: boolean, dateStr = today) {
    setCompletion(task.id, dateStr, done); // optimistic
    try {
      const sb = createBrowserSupabase();
      if (done) await addCompletion(sb, task.id, dateStr);
      else await removeCompletion(sb, task.id, dateStr);
    } catch {
      setCompletion(task.id, dateStr, !done); // revert
      toast.show("Couldn't save", "error");
    }
  }

  async function remove(task: TaskRowType) {
    try {
      const sb = createBrowserSupabase();
      if (task.kind === "daily") await archiveTask(sb, task.id);
      else await deleteTask(sb, task.id);
      toast.show(task.kind === "daily" ? "Habit removed" : "Task removed");
      router.refresh();
    } catch {
      toast.show("Couldn't remove", "error");
    }
  }

  async function submitForm(values: NewTask, id: string | null) {
    try {
      const sb = createBrowserSupabase();
      if (id) await updateTask(sb, id, values);
      else await createTask(sb, values);
      toast.show(id ? "Saved" : "Added");
      setSheetOpen(false);
      setEditing(null);
      router.refresh();
    } catch {
      toast.show("Couldn't save", "error");
    }
  }

  function openNew() {
    setEditing(null);
    setSheetOpen(true);
  }
  function openEdit(task: TaskRowType) {
    setEditing(task);
    setSheetOpen(true);
  }

  const hasAny = day.daily.length > 0 || day.once.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Tasks</h1>
          <StreakChip streak={day.overallStreak} />
        </div>
        <button
          type="button"
          onClick={openNew}
          className="shrink-0 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(190,24,93,0.6)] transition active:scale-[0.98]"
        >
          + New task
        </button>
      </div>

      {!hasAny ? (
        <EmptyState
          icon="✓"
          title="No tasks yet"
          subtitle="Add a daily habit or a one-time task to get started."
          actionLabel="Add your first task"
          onAction={openNew}
        />
      ) : (
        <div className="space-y-4">
          {day.daily.length > 0 && (
            <ul className="space-y-2">
              {day.daily.map((v) => (
                <TaskRow
                  key={v.task.id}
                  view={v}
                  onToggle={(t, done) => toggle(t, done)}
                  onEdit={openEdit}
                  onDelete={remove}
                />
              ))}
            </ul>
          )}

          {day.once.length > 0 && (
            <div className="space-y-2">
              <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                One-time
              </h2>
              <ul className="space-y-2">
                {day.once.map((v) => (
                  <TaskRow
                    key={v.task.id}
                    view={v}
                    onToggle={(t, done) => toggle(t, done)}
                    onEdit={openEdit}
                    onDelete={remove}
                  />
                ))}
              </ul>
            </div>
          )}

          <YesterdayCatchUp
            outstanding={yesterdayOutstanding}
            onComplete={(t) => toggle(t, true, yesterday)}
          />
        </div>
      )}

      <TaskFormSheet
        open={sheetOpen}
        editing={editing}
        onClose={() => {
          setSheetOpen(false);
          setEditing(null);
        }}
        onSubmit={submitForm}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify the existing TaskRow test still passes**

Run: `npm test`
Expected: PASS (all suites, including `tasks` and `TaskRow`).

- [ ] **Step 3: Typecheck, lint, build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all succeed.

- [ ] **Step 4: Manual verification**

Run `npm run dev`, sign in, open `/tasks`, and confirm:
- Empty state shows; "+ New task" opens the sheet; adding a daily habit and a one-time task works.
- Tapping the circle toggles completion; the daily streak chip and per-task `🔥` update after refresh.
- Swiping a row left reveals Edit/Delete; swiping right toggles completion.
- An overdue one-time task (set its date to yesterday) shows with an "overdue" tag and rolls forward.
- If yesterday has unfinished daily habits, the catch-up footer appears and "Done" marks them for yesterday.

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/TasksView.tsx
git commit -m "feat(tasks): compose Tasks tab with optimistic toggles and catch-up"
```

---

## Final polish (separate follow-up pass, after the feature works)

These are intentionally deferred to a dedicated pass (not blocking the tasks above):

- **`frontend-design` skill:** refine the visual treatment — streak chip, the completion fill/check animation, overdue tag, one-time divider, and catch-up footer — within the existing rose/Geist design system.
- **`impeccable` skill:** polish microcopy — empty state, "overdue", "Yesterday: N to catch up", streak wording, button labels.

---

## Self-Review

**1. Spec coverage:**
- Two tables + RLS + indexes → Task 1. ✓
- Daily/one-time kinds, `due_on`, optional `time_of_day`, soft-delete `archived_at` → Tasks 1, 4, 7. ✓
- Overdue one-time roll-forward; completed one-time drops off → Task 3 (`buildDay`) + tests. ✓
- Per-task streak with grace; overall daily streak with "active that day" + grace → Task 2 + tests. ✓
- Ordering (timed-first, ascending time, then `sort`) → Task 3 (`compareTasks`) + tests. ✓
- Today-focused view + yesterday catch-up → Tasks 3 (`outstandingDaily`), 7, 8. ✓
- Swipe-right complete / swipe-left edit-delete / tap parity → Task 6. ✓
- Dedicated "+ New task" sheet; global `⊕` untouched → Tasks 7–8 (no change to `AddSheet`). ✓
- Nav: Reports → Tasks (bottom + top bar) → Task 5. ✓
- Error handling via Toast + optimistic rollback; idempotent completion → Tasks 4, 8. ✓
- Unit tests for streaks/ordering/roll-forward/catch-up; component smoke test → Tasks 2, 3, 6. ✓
- 365-day completion window → Task 5 (`page.tsx`). ✓
- `frontend-design` + `impeccable` polish → Final polish section. ✓

**2. Placeholder scan:** No "TBD"/"add error handling"/"similar to Task N". The Task 5 `TasksView` is an explicit, complete stub that Task 8 fully replaces (called out in both tasks). ✓

**3. Type consistency:** `NewTask`, `TaskView`, `DayTasks`, `TaskKind`, `TaskRow`/`TaskCompletionRow`, and function signatures (`buildDay`, `outstandingDaily`, `streakFromDates`, `overallDailyStreak`, `compareTasks`, `toDateStr`, `addDays`, and all data fns) are used identically across tasks. `TaskRow` (component) vs `TaskRow as TaskRowType` (row type) disambiguation is applied wherever both are imported. ✓
