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
