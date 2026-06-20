"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { hoursWorked } from "@/lib/shifts";
import { formatMoney } from "@/lib/money";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { deleteShift } from "@/lib/data/shifts";
import { useToast } from "@/components/ui/Toast";
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
      className="flex items-center gap-3 rounded-2xl bg-[var(--surface)] p-4 shadow-[var(--shadow)]"
    >
      <div className="grid w-12 shrink-0 place-items-center rounded-xl bg-[var(--surface-2)] py-1 text-center">
        <span className="text-xs font-semibold leading-tight">{dayLabel(shift.worked_on)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: employer?.color ?? "var(--muted)" }}
          />
          <p className="truncate font-medium">{employer?.name ?? "—"}</p>
          {shift.shift_type && (
            <span className="text-sm text-[var(--muted)]">· {shift.shift_type}</span>
          )}
        </div>
        <p className="text-sm text-[var(--muted)]">
          {timeLabel(shift.clock_in)} – {timeLabel(shift.clock_out)}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold">{hours}h</p>
        {shift.pay != null && (
          <p className="text-sm text-[var(--ok)]">{formatMoney(shift.pay)}</p>
        )}
      </div>
      <button
        onClick={remove}
        disabled={busy}
        aria-label="Remove shift"
        className="grid h-8 w-8 place-items-center rounded-full text-[var(--muted)] transition hover:bg-black/5 disabled:opacity-50"
      >
        ✕
      </button>
    </motion.li>
  );
}
