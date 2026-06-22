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
        <span>Yesterday: {outstanding.length} to catch up</span>
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
