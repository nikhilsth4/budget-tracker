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
    <li className="group relative overflow-hidden rounded-2xl">
      {/* Actions revealed behind the row on left-swipe (touch only; pointer-fine
          devices use the hover affordance below instead). */}
      <div className="absolute inset-y-0 right-0 flex items-stretch [@media(hover:hover)]:hidden">
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

        {/* Desktop affordance: Edit/Delete fade in on hover or keyboard focus.
            Pointer-fine only — touch devices use the swipe-reveal above. The
            gradient keeps the row content legible beneath the controls. */}
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden items-center gap-0.5 bg-gradient-to-l from-[var(--surface)] from-65% to-transparent pl-10 pr-2 opacity-0 transition-opacity duration-200 [@media(hover:hover)]:flex group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(task)}
            aria-label={`Edit ${task.title}`}
            className="grid h-8 w-8 place-items-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={() => onDelete(task)}
            aria-label={`Delete ${task.title}`}
            className="grid h-8 w-8 place-items-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--danger)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
          >
            ✕
          </button>
        </div>
      </motion.div>
    </li>
  );
}
