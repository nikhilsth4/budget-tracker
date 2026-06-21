"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { createEmployer, deleteEmployer, updateEmployer } from "@/lib/data/employers";
import { useToast } from "@/components/ui/Toast";
import type { EmployerRow } from "@/lib/supabase/types";

const COLORS = ["#6366F1", "#F97316", "#22C55E", "#EC4899", "#06B6D4", "#EAB308"];

function ColorDots({
  selected,
  onPick,
}: {
  selected: string;
  onPick: (color: string) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {COLORS.map((col) => (
        <button
          key={col}
          type="button"
          onClick={() => onPick(col)}
          aria-label={`Set color ${col}`}
          className="h-5 w-5 rounded-full transition"
          style={{
            background: col,
            outline: selected === col ? `2px solid ${col}` : "none",
            outlineOffset: 2,
          }}
        />
      ))}
    </div>
  );
}

function EmployerItem({ employer, onChanged }: { employer: EmployerRow; onChanged: () => void }) {
  const toast = useToast();
  const sb = createBrowserSupabase();

  async function saveName(value: string) {
    const name = value.trim();
    if (!name || name === employer.name) return;
    try {
      await updateEmployer(sb, employer.id, { name });
      toast.show("Saved");
      onChanged();
    } catch {
      toast.show("Couldn't save", "error");
    }
  }

  async function saveColor(color: string) {
    if (color === employer.color) return;
    try {
      await updateEmployer(sb, employer.id, { color });
      onChanged();
    } catch {
      toast.show("Couldn't save", "error");
    }
  }

  async function remove() {
    try {
      await deleteEmployer(sb, employer.id);
      toast.show("Removed");
      onChanged();
    } catch {
      toast.show("Couldn't remove", "error");
    }
  }

  return (
    <div className="space-y-2 rounded-2xl bg-[var(--surface)] p-3 shadow-[var(--shadow)]">
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ background: employer.color }}
        />
        <input
          defaultValue={employer.name}
          onBlur={(e) => saveName(e.target.value)}
          aria-label="Employer name"
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-medium outline-none focus:border-[var(--line)] focus:bg-[var(--surface-2)]"
        />
        <button
          onClick={remove}
          aria-label={`Delete ${employer.name}`}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--muted)] transition hover:bg-black/5"
        >
          ✕
        </button>
      </div>
      <div className="pl-5">
        <ColorDots selected={employer.color} onPick={saveColor} />
      </div>
    </div>
  );
}

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

  return (
    <div className="space-y-2">
      {employers.map((e) => (
        <EmployerItem key={e.id} employer={e} onChanged={() => router.refresh()} />
      ))}

      <div className="space-y-3 rounded-2xl bg-[var(--surface)] p-3 shadow-[var(--shadow)]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Where do you work?"
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        <div className="flex items-center justify-between">
          <ColorDots selected={color} onPick={setColor} />
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
