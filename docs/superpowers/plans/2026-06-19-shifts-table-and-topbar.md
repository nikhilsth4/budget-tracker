# Shifts Table + Top-Bar Nav Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the week-grouped shift cards with a filterable, paginated flat list (cards on mobile, sortable data table on desktop), and replace the desktop sidebar with a distinctive top bar.

**Architecture:** Pure filter/sort/summary/paginate logic lives in a unit-tested `lib/shiftFilters.ts`. A client `ShiftsView` orchestrates filter/sort/page state and renders mobile cards (`ShiftRow`) and a desktop `ShiftTable` from one computed dataset using CSS responsive show/hide (no matchMedia for layout). A new `TopBar` replaces `SideNav`; the impeccable skill gives both the table and the bar their distinctive craft.

**Tech Stack:** Next.js 16 (App Router), TypeScript strict, Tailwind v4, Framer Motion, Vitest. Existing helpers: `hoursWorked` (`lib/shifts.ts`), `formatMoney` (`lib/money.ts`).

## Global Constraints

- Next.js 16 App Router; RSC by default, `"use client"` only where interactivity needs it.
- TypeScript strict mode on.
- Mobile-first: mobile (<768px) keeps cards + bottom tab bar; desktop (≥768px) gets the table + top bar.
- Filtering/sorting/pagination are client-side and pure — no server-side pagination (YAGNI).
- Date range defaults to the current calendar month; Employer filter defaults to "All".
- Pagination: 20 rows per page; any filter/sort change resets to page 1.
- Currency via `formatMoney` (Intl.NumberFormat); hours via `hoursWorked`.
- Design-system bans hold: no side-stripe borders, no gradient text. Active nav state is an underline, not a side stripe.
- Frequent commits — one per task minimum.

---

## File Structure

```
src/
  lib/
    shiftFilters.ts          # NEW pure: filter, sort, summarize, paginate
    shifts.ts                # MODIFY: remove now-unused isoWeekKey
  components/
    shifts/
      ShiftsView.tsx         # NEW client orchestrator (state)
      ShiftFilters.tsx       # NEW client filter bar
      ShiftTable.tsx         # NEW client desktop table
      ShiftRow.tsx           # REUSE for mobile cards
      WeekGroup.tsx          # DELETE (replaced by flat list)
    nav/
      TopBar.tsx             # NEW client desktop top bar
      SideNav.tsx            # DELETE (replaced by TopBar)
      BottomTabBar.tsx       # unchanged (mobile)
  app/(app)/
    shifts/page.tsx          # MODIFY: render <ShiftsView>
    layout.tsx               # MODIFY: TopBar instead of SideNav row
tests/
  shiftFilters.test.ts       # NEW
  shifts.test.ts             # MODIFY: drop isoWeekKey tests
```

---

### Task 1: Pure shift filter/sort/summary/paginate logic

**Files:**
- Create: `src/lib/shiftFilters.ts`
- Test: `tests/shiftFilters.test.ts`

**Interfaces:**
- Consumes: `ShiftRow`, `EmployerRow` from `@/lib/supabase/types`; `hoursWorked` from `@/lib/shifts`.
- Produces:
  - `type SortKey = "date" | "hours" | "pay"`
  - `type SortDir = "asc" | "desc"`
  - `interface ShiftFilterOpts { employerId: string | null; from: string | null; to: string | null; search: string; employersById: Map<string, EmployerRow> }`
  - `filterShifts(shifts: ShiftRow[], opts: ShiftFilterOpts): ShiftRow[]`
  - `sortShifts(shifts: ShiftRow[], key: SortKey, dir: SortDir): ShiftRow[]` (pure — returns a new array)
  - `summarizeShifts(shifts: ShiftRow[]): { count: number; hours: number; pay: number }`
  - `paginate<T>(items: T[], page: number, size: number): T[]`

- [ ] **Step 1: Write the failing test**

Create `tests/shiftFilters.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  filterShifts,
  sortShifts,
  summarizeShifts,
  paginate,
} from "@/lib/shiftFilters";
import type { ShiftRow, EmployerRow } from "@/lib/supabase/types";

const emp = (id: string, name: string): EmployerRow => ({
  id, name, color: "#000", user_id: "u", created_at: "",
});
const employersById = new Map([
  ["e1", emp("e1", "Cafe")],
  ["e2", emp("e2", "Diner")],
]);

const shift = (over: Partial<ShiftRow>): ShiftRow => ({
  id: Math.random().toString(),
  user_id: "u",
  employer_id: "e1",
  shift_type: null,
  clock_in: "2026-06-17T09:00:00Z",
  clock_out: "2026-06-17T17:00:00Z", // 8h
  pay: null,
  note: null,
  worked_on: "2026-06-17",
  created_at: "",
  ...over,
});

const base = {
  employerId: null, from: null, to: null, search: "", employersById,
};

describe("filterShifts", () => {
  it("filters by employer id", () => {
    const rows = [shift({ employer_id: "e1" }), shift({ employer_id: "e2" })];
    expect(filterShifts(rows, { ...base, employerId: "e2" })).toHaveLength(1);
  });
  it("filters by inclusive date range", () => {
    const rows = [
      shift({ worked_on: "2026-06-01" }),
      shift({ worked_on: "2026-06-17" }),
      shift({ worked_on: "2026-07-01" }),
    ];
    const out = filterShifts(rows, { ...base, from: "2026-06-01", to: "2026-06-30" });
    expect(out).toHaveLength(2);
  });
  it("treats null bounds as open", () => {
    const rows = [shift({ worked_on: "2020-01-01" }), shift({ worked_on: "2030-01-01" })];
    expect(filterShifts(rows, base)).toHaveLength(2);
  });
  it("searches employer name, type, and note (case-insensitive)", () => {
    const rows = [
      shift({ employer_id: "e1" }),                  // "Cafe"
      shift({ employer_id: "e2", shift_type: "Night" }),
      shift({ employer_id: "e2", note: "covered for Sam" }),
    ];
    expect(filterShifts(rows, { ...base, search: "cafe" })).toHaveLength(1);
    expect(filterShifts(rows, { ...base, search: "night" })).toHaveLength(1);
    expect(filterShifts(rows, { ...base, search: "SAM" })).toHaveLength(1);
  });
});

describe("sortShifts", () => {
  it("sorts by date asc and desc", () => {
    const rows = [shift({ worked_on: "2026-06-01" }), shift({ worked_on: "2026-06-20" })];
    expect(sortShifts(rows, "date", "asc")[0].worked_on).toBe("2026-06-01");
    expect(sortShifts(rows, "date", "desc")[0].worked_on).toBe("2026-06-20");
  });
  it("sorts by hours", () => {
    const rows = [
      shift({ clock_in: "2026-06-17T09:00:00Z", clock_out: "2026-06-17T12:00:00Z" }), // 3h
      shift({ clock_in: "2026-06-17T09:00:00Z", clock_out: "2026-06-17T19:00:00Z" }), // 10h
    ];
    expect(sortShifts(rows, "hours", "desc")[0].clock_out).toBe("2026-06-17T19:00:00Z");
  });
  it("sorts by pay treating null as 0", () => {
    const rows = [shift({ pay: 50 }), shift({ pay: null }), shift({ pay: 120 })];
    expect(sortShifts(rows, "pay", "desc").map((s) => s.pay)).toEqual([120, 50, null]);
  });
});

describe("summarizeShifts", () => {
  it("counts, sums hours (1 dp), and sums non-null pay", () => {
    const rows = [
      shift({ clock_in: "2026-06-17T09:00:00Z", clock_out: "2026-06-17T17:30:00Z", pay: 100 }), // 8.5h
      shift({ clock_in: "2026-06-18T09:00:00Z", clock_out: "2026-06-18T12:00:00Z", pay: null }), // 3h
    ];
    expect(summarizeShifts(rows)).toEqual({ count: 2, hours: 11.5, pay: 100 });
  });
});

describe("paginate", () => {
  it("slices the right page", () => {
    expect(paginate([1, 2, 3, 4, 5], 1, 2)).toEqual([1, 2]);
    expect(paginate([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
    expect(paginate([1, 2, 3, 4, 5], 3, 2)).toEqual([5]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shiftFilters.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/shiftFilters.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shiftFilters.test.ts`
Expected: PASS (all suites).

- [ ] **Step 5: Commit**

```bash
git add src/lib/shiftFilters.ts tests/shiftFilters.test.ts
git commit -m "feat: pure shift filter/sort/summary/paginate logic"
```

---

### Task 2: Filter bar component

**Files:**
- Create: `src/components/shifts/ShiftFilters.tsx`

**Interfaces:**
- Consumes: `EmployerRow` from `@/lib/supabase/types`.
- Produces: `ShiftFilters` (client) — controlled component.
  Props:
  ```ts
  interface ShiftFiltersProps {
    employers: EmployerRow[];
    employerId: string | null;
    from: string | null;
    to: string | null;
    search: string;
    onChange: (patch: Partial<{
      employerId: string | null; from: string | null; to: string | null; search: string;
    }>) => void;
  }
  ```

- [ ] **Step 1: Implement the component**

Create `src/components/shifts/ShiftFilters.tsx`. Stacks vertically on mobile, inline on `md+`. Employer `<select>` (first option "All employers" → `employerId: null`), two `date` inputs (from/to), and a search `<input>`. All controlled; each change calls `onChange` with the single changed field.

```tsx
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
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shifts/ShiftFilters.tsx
git commit -m "feat: shift filter bar (employer, date range, search)"
```

---

### Task 3: Desktop sortable table

**Files:**
- Create: `src/components/shifts/ShiftTable.tsx`

**Interfaces:**
- Consumes: `ShiftRow`, `EmployerRow` from `@/lib/supabase/types`; `SortKey`, `SortDir` from `@/lib/shiftFilters`; `hoursWorked` (`@/lib/shifts`), `formatMoney` (`@/lib/money`); `deleteShift` (`@/lib/data/shifts`), `createBrowserSupabase` (`@/lib/supabase/client`), `useToast`.
- Produces: `ShiftTable` (client).
  Props:
  ```ts
  interface ShiftTableProps {
    shifts: ShiftRow[];
    employersById: Map<string, EmployerRow>;
    sortKey: SortKey;
    sortDir: SortDir;
    onSort: (key: SortKey) => void;
    onDeleted: () => void;
  }
  ```

- [ ] **Step 1: Implement the component**

Create `src/components/shifts/ShiftTable.tsx`. A semantic `<table>`. Columns: Date · Employer · Type · In · Out · Hours · Pay · (delete). Date/Hours/Pay headers are `<button>`s calling `onSort(key)`; show ▲/▼ when active. Delete calls `deleteShift` then `onDeleted()`; toast on failure. Times via `toLocaleTimeString`, date via `toLocaleDateString`, hours via `hoursWorked`, pay via `formatMoney`.

```tsx
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
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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

  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "");
  const sortable = (key: SortKey, label: string) => (
    <button
      onClick={() => onSort(key)}
      className="font-semibold text-[var(--ink)] transition hover:text-[var(--accent)]"
    >
      {label}
      {arrow(key)}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-2xl bg-[var(--surface)] shadow-[var(--shadow)]">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-[var(--line)] text-[var(--muted)]">
          <tr>
            <th className="px-4 py-3">{sortable("date", "Date")}</th>
            <th className="px-4 py-3 font-semibold">Employer</th>
            <th className="px-4 py-3 font-semibold">Type</th>
            <th className="px-4 py-3 font-semibold">In</th>
            <th className="px-4 py-3 font-semibold">Out</th>
            <th className="px-4 py-3">{sortable("hours", "Hours")}</th>
            <th className="px-4 py-3">{sortable("pay", "Pay")}</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {shifts.map((s) => {
            const e = s.employer_id ? employersById.get(s.employer_id) : undefined;
            return (
              <tr key={s.id} className="border-b border-[var(--line)] last:border-0">
                <td className="px-4 py-3 font-medium">{fmtDate(s.worked_on)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: e?.color ?? "var(--muted)" }}
                    />
                    {e?.name ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">{s.shift_type ?? "—"}</td>
                <td className="px-4 py-3">{fmtTime(s.clock_in)}</td>
                <td className="px-4 py-3">{fmtTime(s.clock_out)}</td>
                <td className="px-4 py-3 font-medium">{safeHours(s)}h</td>
                <td className="px-4 py-3 text-[var(--ok)]">
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
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shifts/ShiftTable.tsx
git commit -m "feat: desktop shift table with sortable columns"
```

---

### Task 4: ShiftsView orchestrator + page wiring

**Files:**
- Create: `src/components/shifts/ShiftsView.tsx`
- Modify: `src/app/(app)/shifts/page.tsx`
- Delete: `src/components/shifts/WeekGroup.tsx`

**Interfaces:**
- Consumes: `filterShifts`, `sortShifts`, `summarizeShifts`, `paginate`, `SortKey`, `SortDir`, `ShiftFilterOpts` (`@/lib/shiftFilters`); `ShiftFilters` (Task 2); `ShiftTable` (Task 3); `ShiftRow` card (`@/components/shifts/ShiftRow`); `EmptyAddState`, `EmptyState`, `formatMoney`, `useRouter`.
- Produces: `ShiftsView` (client). Props: `{ shifts: ShiftRow[]; employers: EmployerRow[] }`.

- [ ] **Step 1: Compute the default month range helper inline**

In `ShiftsView.tsx`, the initial filter `from`/`to` default to the current calendar month (first → last day, local) as `YYYY-MM-DD` strings.

- [ ] **Step 2: Implement ShiftsView**

Create `src/components/shifts/ShiftsView.tsx`:
```tsx
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
    employerId: string | null; from: string | null; to: string | null; search: string;
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
```

Note: the mobile card delete (`ShiftRow`) already calls `router.refresh()` itself, so deletions refresh on both layouts.

- [ ] **Step 3: Wire the page**

Replace `src/app/(app)/shifts/page.tsx` with:
```tsx
import { createServerSupabase } from "@/lib/supabase/server";
import { listShifts } from "@/lib/data/shifts";
import { listEmployers } from "@/lib/data/employers";
import { ShiftsView } from "@/components/shifts/ShiftsView";

export default async function ShiftsPage() {
  const supabase = await createServerSupabase();
  const [shifts, employers] = await Promise.all([
    listShifts(supabase),
    listEmployers(supabase),
  ]);
  return <ShiftsView shifts={shifts} employers={employers} />;
}
```

- [ ] **Step 4: Delete the obsolete WeekGroup**

```bash
git rm src/components/shifts/WeekGroup.tsx
```

- [ ] **Step 5: Verify compile + tests**

Run: `npx tsc --noEmit` (expect no errors) and `npx vitest run` (expect all green — no test imports WeekGroup).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: filterable paginated shifts view replacing week-grouped cards"
```

---

### Task 5: Remove unused isoWeekKey

**Files:**
- Modify: `src/lib/shifts.ts` (remove `isoWeekKey`)
- Modify: `tests/shifts.test.ts` (remove the `isoWeekKey` describe block + import)

**Interfaces:**
- Produces: `lib/shifts.ts` exporting only `hoursWorked`.

- [ ] **Step 1: Confirm no remaining references**

Run: `grep -rn "isoWeekKey" src/ tests/`
Expected: only `src/lib/shifts.ts` and `tests/shifts.test.ts` (WeekGroup already deleted in Task 4). If anything else references it, stop and report.

- [ ] **Step 2: Remove from shifts.ts**

Delete the `isoWeekKey` function (and its doc comment) from `src/lib/shifts.ts`, leaving `hoursWorked` intact.

- [ ] **Step 3: Remove its tests**

In `tests/shifts.test.ts`, remove the `import { ... isoWeekKey }` to just `hoursWorked`, and delete the `describe("isoWeekKey", ...)` block.

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/shifts.test.ts` (expect PASS, hoursWorked only) and `npx tsc --noEmit` (no errors).

- [ ] **Step 5: Commit**

```bash
git add src/lib/shifts.ts tests/shifts.test.ts
git commit -m "chore: remove unused isoWeekKey after flat shift list"
```

---

### Task 6: Top-bar nav replacing the sidebar

**Files:**
- Create: `src/components/nav/TopBar.tsx`
- Modify: `src/app/(app)/layout.tsx`
- Delete: `src/components/nav/SideNav.tsx`

**Interfaces:**
- Consumes: `usePathname`, `Link`, `useAddSheet` (`@/components/add/AddSheetContext`).
- Produces: `TopBar` (client), `hidden md:flex`.

- [ ] **Step 1: Implement TopBar**

Create `src/components/nav/TopBar.tsx`. Sticky horizontal bar. Left: wordmark. Links Budget/Shifts/Settings with an **active underline** (a `::after`-style bar via a positioned span, NOT a side stripe). Right: + Add button calling `useAddSheet().open()`.

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAddSheet } from "@/components/add/AddSheetContext";

const links = [
  { href: "/budget", label: "Budget" },
  { href: "/shifts", label: "Shifts" },
  { href: "/settings", label: "Settings" },
] as const;

export function TopBar() {
  const pathname = usePathname();
  const { open } = useAddSheet();

  return (
    <header className="sticky top-0 z-30 hidden border-b border-[var(--line)] bg-[var(--surface)]/85 backdrop-blur md:block">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-8">
        <Link href="/budget" className="flex items-center gap-2 font-semibold tracking-tight">
          <span
            className="grid h-7 w-7 place-items-center rounded-lg text-sm text-white"
            style={{ background: "linear-gradient(135deg, var(--accent-bright), var(--accent))" }}
          >
            ◐
          </span>
          Budget &amp; Shifts
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className="relative px-3 py-2 text-sm font-medium transition-colors"
                style={{ color: active ? "var(--ink)" : "var(--muted)" }}
              >
                {l.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-[var(--accent)]" />
                )}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => open()}
          className="ml-auto flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(190,24,93,0.6)] transition active:scale-[0.98]"
        >
          <span className="text-base leading-none">+</span> Add
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Update the app layout**

Edit `src/app/(app)/layout.tsx`: replace the `SideNav` import with `TopBar`, and change the shell so TopBar sits above a full-width content column. Replace the returned JSX block:
```tsx
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { AppProviders } from "@/components/AppProviders";
import { BottomTabBar } from "@/components/nav/BottomTabBar";
import { TopBar } from "@/components/nav/TopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  return (
    <AppProviders>
      <TopBar />
      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-6 md:max-w-6xl md:px-8 md:pb-12 md:pt-8">
        {children}
      </main>
      <BottomTabBar />
    </AppProviders>
  );
}
```

- [ ] **Step 3: Delete SideNav**

```bash
git rm src/components/nav/SideNav.tsx
```

- [ ] **Step 4: Verify**

Run: `grep -rn "SideNav" src/` (expect no matches), `npx tsc --noEmit` (no errors), `npm run build` (succeeds).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: top-bar nav replacing desktop sidebar"
```

---

### Task 7: Impeccable craft pass (table + top bar)

**Files:**
- Modify: `src/components/shifts/ShiftTable.tsx`, `src/components/shifts/ShiftFilters.tsx`, `src/components/shifts/ShiftsView.tsx`, `src/components/nav/TopBar.tsx` as needed.

**Interfaces:**
- Consumes: the `impeccable` skill and `frontend-design` skill.
- Produces: a distinctive, non-generic table and top bar consistent with the rose-on-white design system (`DESIGN.md`).

- [ ] **Step 1: Run the impeccable pass**

Invoke the `impeccable` skill (and `frontend-design` for component craft) targeting the new shifts table and the top bar. Goals, staying within the existing design system and its bans (no side-stripe borders, no gradient text, contrast ≥4.5:1 small / ≥3:1 large):
- Top bar must NOT read as a default SaaS bar: distinctive wordmark treatment, a characterful active indicator, deliberate spacing rhythm, considered hover/focus states.
- Table: comfortable row rhythm, zebra or hairline separation, aligned numeric columns (tabular figures for Hours/Pay), clear sortable-header affordance, sticky header if helpful, a subtle row hover (pointer-fine only).
- Filter bar: cohesive control styling, clear focus rings.
- Respect `prefers-reduced-motion` (already global).

- [ ] **Step 2: Verify nothing regressed**

Run: `npx vitest run` (19+ tests green), `npx tsc --noEmit` (clean), `npm run build` (succeeds).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "polish: impeccable craft pass on shifts table and top bar"
```

---

### Task 8: Update DESIGN.md

**Files:**
- Modify: `DESIGN.md`

**Interfaces:**
- Produces: documentation reflecting the top-bar nav and shifts table.

- [ ] **Step 1: Update the responsive section**

In `DESIGN.md`, update the Responsive section: desktop nav is now a **top bar** (not a sidebar); the shifts surface is a **filterable, paginated data table** on desktop and filtered cards on mobile. Remove the stale "left sidebar (`SideNav`)" description.

- [ ] **Step 2: Commit**

```bash
git add DESIGN.md
git commit -m "docs: update DESIGN.md for top bar and shifts table"
```

---

## Self-Review

**Spec coverage:**
- §2 client-side filter/sort/summary/paginate → Task 1 (pure, tested). ✓
- §2 filter bar (employer All-default, date range, search) → Task 2. ✓
- §2 desktop sortable table (Date/Hours/Pay) → Task 3. ✓
- §2 flat list, mobile cards + desktop table, filter-aware summary, pagination 20, reset-to-page-1, both empty states → Task 4. ✓
- §2 date range defaults to current month → Task 4 `monthBounds`. ✓
- §2 remove WeekGroup + isoWeekKey → Tasks 4 & 5. ✓
- §3 TopBar replacing SideNav, mobile bottom bar unchanged, full-width content → Task 6. ✓
- §3 distinctive craft / not-generic → Task 7 (impeccable + frontend-design). ✓
- §5 unit tests for filter/sort/summary/paginate → Task 1. ✓
- §6 YAGNI (no server pagination, no URL state, no Employer/Type sort, no export) → honored; none added. ✓
- DESIGN.md currency/no-bans → Task 8 + constraints. ✓

**Placeholder scan:** No TBD/TODO. Task 7 is a craft pass with concrete goals + verification, not a placeholder; all code-bearing tasks (1–6) include full code.

**Type consistency:** `ShiftFilterOpts`, `SortKey`, `SortDir`, `filterShifts`, `sortShifts`, `summarizeShifts`, `paginate` defined in Task 1 are used with identical signatures in Tasks 3 & 4. `ShiftFilters` props (Task 2) match the `onChange` patch shape used by `ShiftsView` (Task 4). `ShiftTable` props (Task 3) match the call site in Task 4. `useAddSheet().open()` matches existing context. `ShiftRow` card props (`shift`, `employer`) match existing component.
