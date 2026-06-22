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
