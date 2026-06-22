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
