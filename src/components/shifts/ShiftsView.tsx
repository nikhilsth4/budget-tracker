"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  filterShifts,
  paginate,
  sortShifts,
  summarizeShifts,
  type SortDir,
  type SortKey,
} from "@/lib/shiftFilters";
import { formatMoney } from "@/lib/money";
import { ShiftFilters } from "./ShiftFilters";
import { ShiftTable } from "./ShiftTable";
import { ShiftRow } from "./ShiftRow";
import { EmptyAddState } from "@/components/add/EmptyAddState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ShiftRow as Shift, EmployerRow } from "@/lib/supabase/types";

const PAGE_SIZE = 20;

function monthBounds(): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = `${y}-${pad(m + 1)}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  return { from: first, to: `${y}-${pad(m + 1)}-${pad(lastDay)}` };
}

export function ShiftsView({ shifts, employers }: { shifts: Shift[]; employers: EmployerRow[] }) {
  const router = useRouter();
  const employersById = useMemo(
    () => new Map<string, EmployerRow>(employers.map((e) => [e.id, e])),
    [employers],
  );

  const initialRange = useMemo(monthBounds, []);
  const [employerId, setEmployerId] = useState<string | null>(null);
  const [from, setFrom] = useState<string | null>(initialRange.from);
  const [to, setTo] = useState<string | null>(initialRange.to);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  function onFilterChange(patch: Partial<{
    employerId: string | null;
    from: string | null;
    to: string | null;
    search: string;
  }>) {
    if ("employerId" in patch) setEmployerId(patch.employerId!);
    if ("from" in patch) setFrom(patch.from!);
    if ("to" in patch) setTo(patch.to!);
    if ("search" in patch) setSearch(patch.search!);
    setPage(1);
  }

  function onSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  }

  function clearFilters() {
    setEmployerId(null);
    setFrom(initialRange.from);
    setTo(initialRange.to);
    setSearch("");
    setPage(1);
  }

  const filtered = useMemo(
    () =>
      sortShifts(
        filterShifts(shifts, { employerId, from, to, search, employersById }),
        sortKey,
        sortDir,
      ),
    [shifts, employerId, from, to, search, employersById, sortKey, sortDir],
  );
  const summary = useMemo(() => summarizeShifts(filtered), [filtered]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = paginate(filtered, safePage, PAGE_SIZE);

  if (shifts.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Shifts</h1>
        <EmptyAddState
          icon="🕒"
          title="No shifts yet"
          subtitle="Tap the + to write down your first shift."
          actionLabel="Add your first shift"
          mode="shift"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Shifts</h1>

      <ShiftFilters
        employers={employers}
        employerId={employerId}
        from={from}
        to={to}
        search={search}
        onChange={onFilterChange}
      />

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--muted)]">
        <span className="font-semibold text-[var(--ink)]">{summary.count} shifts</span>
        <span>·</span>
        <span>{summary.hours}h</span>
        {summary.pay > 0 && (
          <>
            <span>·</span>
            <span>{formatMoney(summary.pay)}</span>
          </>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No shifts match your filters"
          subtitle="Try a wider date range or clear the filters."
          actionLabel="Clear filters"
          onAction={clearFilters}
        />
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="space-y-2 md:hidden">
            {pageItems.map((s) => (
              <ShiftRow
                key={s.id}
                shift={s}
                employer={s.employer_id ? employersById.get(s.employer_id) : undefined}
              />
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden md:block">
            <ShiftTable
              shifts={pageItems}
              employersById={employersById}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
              onDeleted={() => router.refresh()}
            />
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between text-sm">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="rounded-lg px-3 py-1.5 font-medium text-[var(--accent)] disabled:opacity-40"
              >
                ‹ Prev
              </button>
              <span className="text-[var(--muted)]">
                Page {safePage} of {pageCount}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={safePage >= pageCount}
                className="rounded-lg px-3 py-1.5 font-medium text-[var(--accent)] disabled:opacity-40"
              >
                Next ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
