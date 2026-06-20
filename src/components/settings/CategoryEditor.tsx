"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/data/categories";
import { useToast } from "@/components/ui/Toast";
import type { CategoryRow } from "@/lib/supabase/types";

const COLORS = [
  "#3B82F6",
  "#F97316",
  "#22C55E",
  "#8B5CF6",
  "#06B6D4",
  "#EC4899",
  "#EAB308",
  "#A855F7",
  "#EF4444",
  "#10B981",
];

export function CategoryEditor({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  const sb = createBrowserSupabase();

  async function add() {
    if (!name.trim()) return;
    try {
      await createCategory(sb, { name: name.trim(), icon: "wallet", color, kind: "expense" });
      setName("");
      setAdding(false);
      toast.show("Category added");
      router.refresh();
    } catch {
      toast.show("Couldn't add", "error");
    }
  }

  async function saveLimit(id: string, value: string) {
    const limit = value.trim() === "" ? null : Number(value);
    if (limit !== null && Number.isNaN(limit)) return;
    try {
      await updateCategory(sb, id, { monthly_limit: limit });
      toast.show("Saved");
      router.refresh();
    } catch {
      toast.show("Couldn't save", "error");
    }
  }

  async function remove(id: string) {
    try {
      await deleteCategory(sb, id);
      toast.show("Removed");
      router.refresh();
    } catch {
      toast.show("Couldn't remove", "error");
    }
  }

  return (
    <div className="space-y-2">
      {categories.map((c) => (
        <div
          key={c.id}
          className="flex items-center gap-3 rounded-2xl bg-[var(--surface)] p-3 shadow-[var(--shadow)]"
        >
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-semibold text-white"
            style={{ background: c.color }}
          >
            {c.name.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{c.name}</p>
            <span className="text-xs text-[var(--muted)]">{c.kind}</span>
          </div>
          {c.kind === "expense" && (
            <input
              type="number"
              inputMode="decimal"
              defaultValue={c.monthly_limit ?? ""}
              onBlur={(e) => saveLimit(c.id, e.target.value)}
              placeholder="limit"
              aria-label={`Monthly limit for ${c.name}`}
              className="w-20 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-right text-sm outline-none focus:border-[var(--accent)]"
            />
          )}
          <button
            onClick={() => remove(c.id)}
            aria-label={`Delete ${c.name}`}
            className="grid h-7 w-7 place-items-center rounded-full text-[var(--muted)] transition hover:bg-black/5"
          >
            ✕
          </button>
        </div>
      ))}

      {adding ? (
        <div className="space-y-3 rounded-2xl bg-[var(--surface)] p-3 shadow-[var(--shadow)]">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name"
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <div className="flex flex-wrap gap-2">
            {COLORS.map((col) => (
              <button
                key={col}
                onClick={() => setColor(col)}
                aria-label={`Color ${col}`}
                className="h-7 w-7 rounded-full ring-offset-2 transition"
                style={{ background: col, outline: color === col ? `2px solid ${col}` : "none" }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={add}
              className="flex-1 rounded-lg bg-[var(--ink)] py-2 text-sm font-medium text-white"
            >
              Add
            </button>
            <button
              onClick={() => setAdding(false)}
              className="rounded-lg px-3 py-2 text-sm text-[var(--muted)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded-2xl border border-dashed border-[var(--line)] py-3 text-sm font-medium text-[var(--accent)]"
        >
          + Add category
        </button>
      )}
    </div>
  );
}
