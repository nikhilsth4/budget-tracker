"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { hoursWorked } from "@/lib/shifts";
import { formatMoney } from "@/lib/money";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { deleteShift } from "@/lib/data/shifts";
import { useToast } from "@/components/ui/Toast";
import { useAddSheet } from "@/components/add/AddSheetContext";
import type { ShiftRow as Shift, EmployerRow } from "@/lib/supabase/types";

function dayLabel(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
  });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function ShiftRow({ shift, employer }: { shift: Shift; employer?: EmployerRow }) {
  const router = useRouter();
  const toast = useToast();
  const { openEditShift } = useAddSheet();
  const [busy, setBusy] = useState(false);

  let hours = 0;
  try {
    hours = hoursWorked(shift.clock_in, shift.clock_out);
  } catch {
    hours = 0;
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteShift(createBrowserSupabase(), shift.id);
      toast.show("Shift removed");
      router.refresh();
    } catch {
      toast.show("Couldn't remove", "error");
      setBusy(false);
    }
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1 rounded-2xl bg-[var(--surface)] p-1.5 shadow-[var(--shadow)]"
    >
      <button
        type="button"
        onClick={() => openEditShift(shift)}
        aria-label={`Edit ${employer?.name ?? "shift"}`}
        className="flex flex-1 items-center gap-3 rounded-xl p-2.5 text-left transition active:bg-[var(--surface-2)] [@media(hover:hover)]:hover:bg-[var(--surface-2)]"
      >
        <span className="grid w-12 shrink-0 place-items-center rounded-xl bg-[var(--surface-2)] py-1 text-center">
          <span className="text-xs font-semibold leading-tight">{dayLabel(shift.worked_on)}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: employer?.color ?? "var(--muted)" }}
            />
            <span className="truncate font-medium">{employer?.name ?? "—"}</span>
            {shift.shift_type && (
              <span className="text-sm text-[var(--muted)]">· {shift.shift_type}</span>
            )}
          </span>
          <span className="block text-sm text-[var(--muted)]">
            {timeLabel(shift.clock_in)} – {timeLabel(shift.clock_out)}
          </span>
        </span>
        <span className="text-right">
          <span className="block font-semibold">{hours}h</span>
          {shift.pay != null && (
            <span className="block text-sm text-[var(--ok)]">{formatMoney(shift.pay)}</span>
          )}
        </span>
      </button>
      <button
        onClick={remove}
        disabled={busy}
        aria-label="Remove shift"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--muted)] transition hover:bg-black/5 disabled:opacity-50"
      >
        ✕
      </button>
    </motion.li>
  );
}
