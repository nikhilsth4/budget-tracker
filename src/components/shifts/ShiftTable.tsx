"use client";

import { useState } from "react";
import { hoursWorked } from "@/lib/shifts";
import { formatMoney } from "@/lib/money";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { deleteShift } from "@/lib/data/shifts";
import { useToast } from "@/components/ui/Toast";
import type { SortDir, SortKey } from "@/lib/shiftFilters";
import type { ShiftRow, EmployerRow } from "@/lib/supabase/types";

interface ShiftTableProps {
  shifts: ShiftRow[];
  employersById: Map<string, EmployerRow>;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onDeleted: () => void;
}

function fmtDate(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
function safeHours(s: ShiftRow): number {
  try {
    return hoursWorked(s.clock_in, s.clock_out);
  } catch {
    return 0;
  }
}

export function ShiftTable({
  shifts,
  employersById,
  sortKey,
  sortDir,
  onSort,
  onDeleted,
}: ShiftTableProps) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(id: string) {
    setBusy(id);
    try {
      await deleteShift(createBrowserSupabase(), id);
      toast.show("Shift removed");
      onDeleted();
    } catch {
      toast.show("Couldn't remove", "error");
      setBusy(null);
    }
  }

  const sortable = (
    key: SortKey,
    label: string,
    align: "left" | "right" = "left",
  ) => {
    const active = sortKey === key;
    return (
      <button
        onClick={() => onSort(key)}
        className={`group inline-flex items-center gap-1 font-semibold transition-colors hover:text-[var(--accent)] ${
          align === "right" ? "flex-row-reverse" : ""
        }`}
        style={{ color: active ? "var(--accent)" : "var(--ink)" }}
      >
        {label}
        <span
          className={`text-[0.65rem] leading-none transition-opacity ${
            active ? "opacity-100" : "opacity-0 group-hover:opacity-40"
          }`}
        >
          {active && sortDir === "asc" ? "▲" : "▼"}
        </span>
      </button>
    );
  };
  return (
    <div className="overflow-hidden rounded-2xl bg-[var(--surface)] shadow-[var(--shadow)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted)]">
          <tr className="border-b border-[var(--line)]">
            <th className="px-4 py-3">{sortable("date", "Date")}</th>
            <th className="px-4 py-3 font-semibold">Employer</th>
            <th className="px-4 py-3 font-semibold">Type</th>
            <th className="px-4 py-3 font-semibold">In</th>
            <th className="px-4 py-3 font-semibold">Out</th>
            <th className="px-4 py-3 text-right">
              {sortable("hours", "Hours", "right")}
            </th>
            <th className="px-4 py-3 text-right">
              {sortable("pay", "Pay", "right")}
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {shifts.map((s) => {
            const e = s.employer_id
              ? employersById.get(s.employer_id)
              : undefined;
            return (
              <tr
                key={s.id}
                className="border-b border-[var(--line)] transition-colors last:border-0 [@media(hover:hover)]:hover:bg-[var(--surface-2)]"
              >
                <td className="px-4 py-3 font-medium whitespace-nowrap">
                  {fmtDate(s.worked_on)}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: e?.color ?? "var(--muted)" }}
                    />
                    {e?.name ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {s.shift_type ?? "—"}
                </td>
                <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                  {fmtTime(s.clock_in)}
                </td>
                <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                  {fmtTime(s.clock_out)}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {safeHours(s)}h
                </td>
                <td
                  className="px-4 py-3 text-right tabular-nums"
                  style={{
                    color: s.pay != null ? "var(--ok)" : "var(--muted)",
                  }}
                >
                  {s.pay != null ? formatMoney(s.pay) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => remove(s.id)}
                    disabled={busy === s.id}
                    aria-label="Remove shift"
                    className="text-[var(--muted)] transition hover:text-[var(--danger)] disabled:opacity-50"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
