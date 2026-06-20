import type { ShiftRow, EmployerRow } from "@/lib/supabase/types";
import { hoursWorked } from "@/lib/shifts";

export type SortKey = "date" | "hours" | "pay";
export type SortDir = "asc" | "desc";

export interface ShiftFilterOpts {
  employerId: string | null;
  from: string | null;
  to: string | null;
  search: string;
  employersById: Map<string, EmployerRow>;
}

function safeHours(s: ShiftRow): number {
  try {
    return hoursWorked(s.clock_in, s.clock_out);
  } catch {
    return 0;
  }
}

export function filterShifts(shifts: ShiftRow[], opts: ShiftFilterOpts): ShiftRow[] {
  const q = opts.search.trim().toLowerCase();
  return shifts.filter((s) => {
    if (opts.employerId && s.employer_id !== opts.employerId) return false;
    if (opts.from && s.worked_on < opts.from) return false;
    if (opts.to && s.worked_on > opts.to) return false;
    if (q) {
      const name = s.employer_id ? opts.employersById.get(s.employer_id)?.name ?? "" : "";
      const haystack = `${name} ${s.shift_type ?? ""} ${s.note ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function sortShifts(shifts: ShiftRow[], key: SortKey, dir: SortDir): ShiftRow[] {
  const sign = dir === "asc" ? 1 : -1;
  const value = (s: ShiftRow): number | string =>
    key === "date" ? s.worked_on : key === "hours" ? safeHours(s) : s.pay ?? 0;
  return [...shifts].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (va < vb) return -1 * sign;
    if (va > vb) return 1 * sign;
    return 0;
  });
}

export function summarizeShifts(shifts: ShiftRow[]): {
  count: number;
  hours: number;
  pay: number;
} {
  const hours = shifts.reduce((sum, s) => sum + safeHours(s), 0);
  const pay = shifts.reduce((sum, s) => sum + (s.pay ?? 0), 0);
  return { count: shifts.length, hours: Math.round(hours * 10) / 10, pay };
}

export function paginate<T>(items: T[], page: number, size: number): T[] {
  const start = (page - 1) * size;
  return items.slice(start, start + size);
}
