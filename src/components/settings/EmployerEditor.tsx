"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { createEmployer, deleteEmployer } from "@/lib/data/employers";
import { useToast } from "@/components/ui/Toast";
import type { EmployerRow } from "@/lib/supabase/types";

const COLORS = ["#6366F1", "#F97316", "#22C55E", "#EC4899", "#06B6D4", "#EAB308"];

export function EmployerEditor({ employers }: { employers: EmployerRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const sb = createBrowserSupabase();

  async function add() {
    if (!name.trim()) return;
    try {
      await createEmployer(sb, name.trim(), color);
      setName("");
      toast.show("Added");
      router.refresh();
    } catch {
      toast.show("Couldn't add", "error");
    }
  }

  async function remove(id: string) {
    try {
      await deleteEmployer(sb, id);
      toast.show("Removed");
      router.refresh();
    } catch {
      toast.show("Couldn't remove", "error");
    }
  }

  return (
    <div className="space-y-2">
      {employers.map((e) => (
        <div
          key={e.id}
          className="flex items-center gap-3 rounded-2xl bg-[var(--surface)] p-3 shadow-[var(--shadow)]"
        >
          <span className="h-3 w-3 rounded-full" style={{ background: e.color }} />
          <p className="flex-1 truncate text-sm font-medium">{e.name}</p>
          <button
            onClick={() => remove(e.id)}
            aria-label={`Delete ${e.name}`}
            className="grid h-7 w-7 place-items-center rounded-full text-[var(--muted)] transition hover:bg-black/5"
          >
            ✕
          </button>
        </div>
      ))}

      <div className="space-y-3 rounded-2xl bg-[var(--surface)] p-3 shadow-[var(--shadow)]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Where do you work?"
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {COLORS.map((col) => (
              <button
                key={col}
                onClick={() => setColor(col)}
                aria-label={`Color ${col}`}
                className="h-6 w-6 rounded-full"
                style={{ background: col, outline: color === col ? `2px solid ${col}` : "none", outlineOffset: 2 }}
              />
            ))}
          </div>
          <button
            onClick={add}
            className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
