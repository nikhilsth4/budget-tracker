# Shifts Data Table + Top-Bar Nav — Design Spec

**Date:** 2026-06-19
**Status:** Approved design (pending spec review)
**Builds on:** `2026-06-19-budget-shift-tracker-design.md`

## 1. Overview

Two changes to the existing app:

1. **Shifts data table** — replace the week-grouped card list on `/shifts` with a
   **filterable, paginated, flat list**: filter by employer, date range, and search;
   a **filter-aware summary** (count · hours · pay) reflects the current filter.
   Cards on mobile, a sortable data table on desktop.
2. **Top-bar navigation** — replace the desktop left sidebar (which reads as a
   generic SaaS sidebar) with a horizontal **top bar**. Mobile keeps its bottom tab
   bar unchanged.

## 2. Shifts table

### Behavior

- **Data:** the server page fetches all shifts + employers (unchanged queries) and
  passes them to a client `ShiftsView`. Filtering, search, sorting, and pagination
  are all **client-side** — shift volume is personal-scale, so in-memory is simpler
  and instant (no round-trips). YAGNI: no server-side pagination.
- **Filter bar** (above the results, works on every screen size):
  - **Employer** — a dropdown defaulting to **All**, plus one entry per employer.
  - **Date range** — `from` / `to` date inputs, **defaulting to the current
    calendar month** (first day → last day). Clearing both = all time.
  - **Search** — free-text, case-insensitive, matching employer name, shift type,
    or note.
- **Summary** (above the list, recomputed for the active filter):
  `"<N> shifts · <H>h · <$pay>"`. Pay sums only shifts that have a `pay` value.
- **Results:** flat list sorted by date (default: newest first).
  - **Mobile (<768px):** existing `ShiftRow` cards, one per row.
  - **Desktop (≥768px):** a data **table** with columns
    **Date · Employer · Type · In · Out · Hours · Pay · (delete)**.
    Headers for **Date, Hours, Pay** are clickable to sort (toggle asc/desc, arrow
    indicator). Employer/Type are filtered, not sorted.
- **Pagination:** 20 rows per page; `‹ Prev` / `Next ›` + "Page X of Y" below the
  list. Any filter or sort change resets to page 1.
- **Empty states:**
  - No shifts at all → existing "No shifts yet" empty state (add first shift).
  - Shifts exist but filter matches none → "No shifts match your filters" + a
    **Clear filters** button (resets to defaults).

### Components & files

- **New** `src/lib/shiftFilters.ts` (pure, unit-tested):
  - `filterShifts(shifts, opts): ShiftRow[]` where
    `opts = { employerId: string | null; from: string | null; to: string | null;
    search: string; employersById: Map<string, EmployerRow> }`. Filters by employer
    id, inclusive date range on `worked_on`, and case-insensitive search across
    employer name / `shift_type` / `note`.
  - `sortShifts(shifts, key: "date" | "hours" | "pay", dir: "asc" | "desc"): ShiftRow[]`
    — `date` sorts on `worked_on`; `hours` on computed `hoursWorked`; `pay` on
    `pay ?? 0`.
  - `summarizeShifts(shifts): { count: number; hours: number; pay: number }` —
    `hours` rounded to 1 decimal; `pay` sums non-null `pay`.
  - `paginate(items, page, size): items[]` — generic slice helper.
- **New** `src/components/shifts/ShiftsView.tsx` (client) — orchestrator holding
  filter/sort/page state; composes the bar, summary, list/table, pagination.
- **New** `src/components/shifts/ShiftFilters.tsx` (client) — the employer dropdown,
  date-range inputs, and search box. Controlled via props.
- **New** `src/components/shifts/ShiftTable.tsx` (client) — desktop table with
  sortable headers; reuses `hoursWorked` / `formatMoney`; delete per row (same
  `deleteShift` flow as `ShiftRow`).
- **Reuse** `src/components/shifts/ShiftRow.tsx` for mobile cards.
- **Modify** `src/app/(app)/shifts/page.tsx` — fetch as today, render `<ShiftsView>`.
- **Remove** the week-grouping path: `src/components/shifts/WeekGroup.tsx` is no
  longer used (the flat list + filter-aware summary replaces "This week" grouping).
  Delete it. `isoWeekKey` in `lib/shifts.ts` becomes unused — remove it and its test.

### Visual `<md>` vs `≥md`

- The filter bar stacks vertically on mobile (full-width controls) and goes inline
  on desktop. Mobile shows cards; desktop shows the table. One `ShiftsView` renders
  both via responsive `hidden` / `md:block` wrappers — no `matchMedia` needed for
  layout (CSS handles it); only the shared filtered/sorted/paged data is computed
  once in JS.

## 3. Top-bar navigation

- **New** `src/components/nav/TopBar.tsx` (client) — horizontal bar, `hidden md:flex`,
  sticky top. Left: wordmark. Center/left: nav links (Budget / Shifts / Settings)
  with an **active underline** indicator (not a soft pill; no side-stripe borders per
  the design system bans). Right: **+ Add** button calling `useAddSheet().open()`.
- **Modify** `src/app/(app)/layout.tsx` — render `<TopBar>` above content instead of
  the `<SideNav>` row; content becomes a full-width centered column
  (`max-w-5xl`, or `max-w-6xl` on `xl`). Bottom tab bar stays (`md:hidden`).
- **Remove** `src/components/nav/SideNav.tsx`.
- **Craft:** the bar must not read as a default SaaS top bar — distinctive wordmark,
  characterful active indicator, deliberate type/spacing, considered hover/focus.
  Delivered via an impeccable pass. Intended to be reusable across sibling projects.

## 4. Error handling

- Filtering/sorting are pure and total — no throwing; an invalid/empty date is
  treated as an open bound.
- Delete keeps the existing optimistic + toast-on-failure behavior.

## 5. Testing

- **Unit (Vitest)** for `shiftFilters.ts`:
  - `filterShifts`: employer match, inclusive date-range bounds, search across
    name/type/note, open bounds when from/to null, combined filters.
  - `sortShifts`: date/hours/pay, asc and desc.
  - `summarizeShifts`: count, summed hours (rounded), pay ignores nulls.
  - `paginate`: correct slice, last partial page, out-of-range page.
- No new component tests required; existing AddSheet test stays green.

## 6. Out of scope (YAGNI)

- Server-side pagination/filtering.
- Sorting on Employer/Type (those are filtered).
- Column show/hide, CSV export, saved filters.
- URL-persisted filter state (kept in React state only).
- Changes to the Budget table/cards.
