"use client";

import type { EmployerRow } from "@/lib/supabase/types";

interface ShiftFiltersProps {
  employers: EmployerRow[];
  employerId: string | null;
  from: string | null;
  to: string | null;
  search: string;
  onChange: (
    patch: Partial<{
      employerId: string | null;
      from: string | null;
      to: string | null;
      search: string;
    }>,
  ) => void;
}

const field =
  "rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]";

export function ShiftFilters({
  employers,
  employerId,
  from,
  to,
  search,
  onChange,
}: ShiftFiltersProps) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
      <select
        value={employerId ?? ""}
        onChange={(e) => onChange({ employerId: e.target.value || null })}
        aria-label="Filter by employer"
        className={`${field} md:w-44`}
      >
        <option value="">All employers</option>
        {employers.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-2">
        <input
          type="date"
          value={from ?? ""}
          onChange={(e) => onChange({ from: e.target.value || null })}
          aria-label="From date"
          className={`${field} flex-1`}
        />
        <span className="text-[var(--muted)]">–</span>
        <input
          type="date"
          value={to ?? ""}
          onChange={(e) => onChange({ to: e.target.value || null })}
          aria-label="To date"
          className={`${field} flex-1`}
        />
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => onChange({ search: e.target.value })}
        placeholder="Search employer, type, note…"
        aria-label="Search shifts"
        className={`${field} md:flex-1`}
      />
    </div>
  );
}
