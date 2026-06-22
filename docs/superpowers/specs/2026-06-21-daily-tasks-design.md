# Daily Tasks Tab — Design

**Date:** 2026-06-21
**Status:** Approved (design); ready for implementation plan
**Author:** brainstormed with Claude

## Summary

Add a **Daily Tasks** tab to the Budget & Shifts app: a friendly habit/chore
tracker. Tasks are either **daily** (recur every day, reset at midnight) or
**one-time** (tied to a date). Completion is tracked as an event log, from which
**per-task streaks** and an **overall daily streak** are computed. The screen is
today-focused with a lightweight **yesterday catch-up**. Rows support **swipe**
gestures on mobile (right = complete, left = edit/delete) with tap as an equal
alternative.

Reports (previously a "coming soon" bottom-bar slot) is deferred; Tasks takes its
place in the navigation.

This feature follows the app's existing conventions: per-user Supabase tables with
`auth.uid()` RLS, thin `list/create/update/delete` data modules taking a
`SupabaseClient`, server components fetch + client components mutate, the shared
`Sheet` component for add/edit, and the established rose/Geist design system.

## Goals

- Track recurring daily habits and one-time tasks in one calm, glanceable tab.
- Motivate with streaks without being judgmental (per PRODUCT.md principles).
- One-handed, low-friction interaction on mobile (swipe + tap).
- Keep the data model simple, indexed, and free of background jobs.

## Non-goals (YAGNI)

- No weekday-specific or "X times per week" recurrence — **daily or one-time only**.
- No full calendar / arbitrary date navigation — today plus yesterday catch-up only.
- No swipe-between-days screen gesture (swipe acts on rows only).
- An optional **time-of-day** is supported, but for **display + sorting only** — no
  reminders/notifications in v1 (those are a deferred follow-up).
- No money/shift linkage, no Reports (deferred).
- No subtasks, tags, priorities, or notes on tasks in v1.

## Data model

Two new tables, mirroring the existing RLS/`auth.uid()` pattern in
`supabase/migrations/0001_init.sql`.

```sql
-- Task definitions
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  kind text not null default 'daily' check (kind in ('daily','once')),
  due_on date,                       -- set when kind='once'; null for daily
  time_of_day time,                  -- optional local time-of-day hint; null = untimed
  sort integer not null default 0,   -- manual ordering among untimed tasks
  archived_at timestamptz,           -- soft-delete; preserves streak history
  created_at timestamptz not null default now()
);

-- Completion event log (one row per task per day done)
create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  task_id uuid not null references public.tasks on delete cascade,
  done_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (task_id, done_on)          -- a task can be completed at most once per day
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

### Behavior rules

- **Daily tasks** (`kind='daily'`, `due_on` null) appear every day. "Done today?"
  = a `task_completions` row exists with `done_on = today`. Checking inserts that
  row; unchecking deletes it. No per-day rows are materialized — daily instances are
  virtual.
- **One-time tasks** (`kind='once'`) carry a `due_on` date. An undone one-time task
  **rolls forward**: it keeps appearing on today's list (tagged "overdue" if
  `due_on < today`) until it is completed or deleted. Once completed it drops off the
  list.
- **Delete semantics (swipe-left → Delete):**
  - One-time task → **hard delete** (row removed).
  - Daily habit → **soft delete** (set `archived_at = now()`), so its completion
    history and past streak contributions stay intact. It stops appearing from that
    point forward.
  - The UI labels both simply "Delete."
- **Time of day** (`time_of_day`) is an optional hint on either kind. It drives
  **ordering and display only** — it triggers no reminders. Within each group
  (daily, then one-time), **timed tasks sort first by ascending time**, then untimed
  tasks follow by their manual `sort`. The time is stored/displayed as a local
  wall-clock time (`time` without timezone).
- **No nightly job / cron.** All "what's due today" logic is derived at read time.

## Streak logic

Computed by a pure, unit-testable helper in `src/lib/tasks.ts` from the
`task_completions` log + task metadata. No stored streak counters (avoids drift).
One-time tasks never affect streaks. Computed over a rolling **365-day** window.

### Per-task streak (daily habits only)

The run of consecutive days completed, counting backward, with a same-day grace
period:

- Completed **today** → streak = run of consecutive completed days ending today.
- Not yet done today but done **yesterday** → streak still shown (run ending
  yesterday); today is pending, not a break.
- Yesterday also missing → streak = 0.

Effect: a 12-day streak displays "12" all day until midnight; it only breaks once a
full uncompleted day has passed.

### Overall daily streak

Consecutive days where **every daily habit active that day** was completed.

- **"Active that day"** = `created_at::date <= D` AND
  (`archived_at` is null OR `archived_at::date > D`). Days before a habit existed do
  not penalize it; archived habits stop counting from their archive date.
- A day with no active daily habits does not count as a completed streak day (no
  habits = nothing to streak).
- Same grace rule: today does not break the streak until the day is fully over
  (i.e., the streak is measured ending today if today is fully complete, otherwise
  ending yesterday).

## UI & interactions

### Navigation

- Bottom bar (`BottomTabBar`) and desktop `TopBar`: **Reports slot becomes Tasks** →
  `Budget · Shifts · ⊕ · Tasks · Settings`. The "coming soon" Reports tab is removed
  for now (may return later, possibly via Settings).
- New route `src/app/(app)/tasks/page.tsx`, a server component that fetches today's
  (and yesterday's) tasks + completions, mirroring `shifts/page.tsx`. Client
  components handle interaction.
- Suggested tab icon: a check/circle glyph consistent with the existing glyph set
  (e.g. `◔`/`✓`); final glyph chosen during implementation.

### Screen layout (mobile-first, `max-w-md`)

```
┌─────────────────────────────┐
│  Today · Sat 21 Jun         │   header (date)
│  🔥 7 day streak            │   overall daily streak — warm accent chip
├─────────────────────────────┤
│  ▢ Gym   7:00 AM  🔥12   ›   │   daily habit, timed (sorts first by time)
│  ▣ Pack lunch     🔥 5      │   completed = filled + desaturated
│  ▢ No eating out  🔥 0      │   untimed tasks follow, by manual sort
│  ─ One-time ─               │
│  ▢ Call landlord  (overdue) │   rolled-forward one-time, subtle danger tag
├─────────────────────────────┤
│  Yesterday: 2 of 3 · catch  │   quiet, collapsible yesterday catch-up
└─────────────────────────────┘
```

- **Daily habits** listed first (each with its per-task streak), then a small
  **One-time** group. Overdue one-time items get a subtle "overdue" tag using
  `--danger`/`--muted` — informative, not alarming.
- **Overall daily streak** lives in the header as a warm rose/`--accent` chip (not a
  full hero block), keeping with the "encouraging, not judgmental" principle.
- **Yesterday catch-up:** a quiet footer ("Yesterday: 2 of 3") shown only when
  yesterday had unfinished active tasks. Expands to let the user tick what they
  missed; writes a completion with `done_on = yesterday`.

### Swipe & tap (the `TaskRow` component)

- **Swipe right → toggle complete/uncomplete**, with a satisfying fill + check
  animation (Framer Motion, respecting the global `prefers-reduced-motion` guard).
- **Swipe left → reveal Edit / Delete** actions behind the row.
- **Tap** also toggles completion — swipe is an accelerator, not the only path
  (accessibility + desktop parity).
- Desktop (`md:`) shows hover affordances instead of swipe, mirroring the app's
  existing hover-gating; touch uses `active:` feedback.

### Add / edit flow

- Task creation lives **on the Tasks screen** via a dedicated **"+ New task"**
  affordance — the global `⊕` (In/Out/Shift capture) is **unchanged**. Rationale:
  `⊕` is a high-frequency *capture* action for money/time events; creating a habit is
  a rare *definition* action with a different mental model. The frequent task action
  (complete) already lives on-screen via swipe/tap.
- The create/edit form reuses the shared **`Sheet`** (bottom-sheet on mobile,
  centered modal on desktop). Fields: **title**, **daily vs one-time** toggle, a
  **date** when one-time, and an **optional time of day**. Edit reuses the same sheet
  pre-filled. Timed tasks show their time (e.g. "7:00 AM") on the row as a quiet
  `--muted` hint.

## Architecture & components

Following existing structure (`src/lib/data/*`, `src/lib/*.ts`, `src/components/*`):

- `supabase/migrations/0002_tasks.sql` — the two tables, indexes, RLS policies.
- `src/lib/supabase/types.ts` — add `TaskRow`, `TaskCompletionRow` types.
- `src/lib/data/tasks.ts` — `listTasks`, `createTask`, `updateTask`, `deleteTask`
  (archive vs hard delete by kind), `listCompletions(range)`, `addCompletion`,
  `removeCompletion`. Thin Supabase wrappers, like `data/shifts.ts`.
- `src/lib/tasks.ts` — pure domain logic: build today's list (incl. rolled-forward
  one-time tasks), compute per-task streaks and the overall daily streak, derive
  yesterday's outstanding items. No Supabase imports → fully unit-testable.
- `src/app/(app)/tasks/page.tsx` — server component: fetch tasks + completions for
  the relevant window, pass to the view.
- `src/components/tasks/TasksView.tsx` — client orchestration (state, optimistic
  toggles, sheet wiring).
- `src/components/tasks/TaskRow.tsx` — swipe/tap row with completion animation.
- `src/components/tasks/StreakChip.tsx` — overall daily streak header chip.
- `src/components/tasks/YesterdayCatchUp.tsx` — collapsible catch-up footer.
- `src/components/tasks/TaskFormSheet.tsx` — create/edit sheet (reuses `Sheet`).
- Update `src/components/nav/BottomTabBar.tsx` and `src/components/nav/TopBar.tsx`
  (Reports → Tasks).

## Data flow

1. Server component loads tasks (non-archived, plus those archived after the window
   start) and completions for a single rolling **365-day** window. Today's and
   yesterday's completions for the live UI are subsets of that one fetch — no
   separate query.
2. `lib/tasks.ts` derives: today's ordered list (daily first, then rolled-forward
   one-time; within each group, timed tasks by ascending time, then untimed by manual
   `sort`), per-task streaks, overall daily streak, and yesterday's outstanding items.
3. Toggling a task optimistically updates the UI, then inserts/deletes a
   `task_completions` row (`done_on = today`, or `yesterday` from catch-up).
4. Create/edit/delete go through `data/tasks.ts`; the list re-derives on the next
   load / router refresh.

## Error handling

- Mutations surface failures via the existing `Toast` system; optimistic UI rolls
  back on error (consistent with current add/edit flows).
- `unique (task_id, done_on)` guards double-completion; a duplicate insert is treated
  as already-complete (idempotent toggle).
- RLS guarantees users only ever read/write their own rows.
- Empty state: a friendly `EmptyState` prompting "Add your first habit" when no tasks
  exist (reuse `components/ui/EmptyState`).

## Testing

- **Unit (vitest)** for `src/lib/tasks.ts` — the bulk of the value:
  - per-task streak: done today, done-yesterday-not-today grace, broken streak,
    brand-new habit, gaps.
  - overall daily streak: "active that day" inclusion/exclusion across create and
    archive dates, days with no active habits, grace period for today.
  - rolled-forward overdue one-time tasks; one-time tasks excluded from streaks.
  - ordering: timed-before-untimed within each group, ascending time, manual `sort`
    tiebreak for untimed.
  - yesterday-outstanding derivation.
- **Component** smoke tests for `TaskRow` toggle and the form sheet, in line with
  existing testing-library usage.

## Polish (final pass, post-implementation)

- `frontend-design` skill: refine the visual treatment (streak chip, completion
  animation, overdue tag, catch-up footer) within the existing design system.
- `impeccable`: polish microcopy (empty state, overdue/catch-up labels, streak
  wording).

## Open questions

None outstanding — all design decisions confirmed during brainstorming.
