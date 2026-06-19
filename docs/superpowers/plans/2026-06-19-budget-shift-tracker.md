# Budget & Shift Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a friendly, mobile-first Next.js app that unifies a category-based budget tracker and a clock-in/out job-shift tracker, backed by Supabase.

**Architecture:** Next.js App Router with TypeScript. Pure utility functions (hours, progress math, validation) are unit-tested with Vitest. UI is built mobile-first with Tailwind + Framer Motion. Supabase provides Postgres, magic-link Auth, and Row Level Security. Data access goes through a thin typed client layer so components never call Supabase directly.

**Tech Stack:** Next.js (latest, App Router), TypeScript, Tailwind CSS v4, Framer Motion, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Vitest + @testing-library/react.

## Global Constraints

- Next.js latest with App Router; React Server Components by default, `"use client"` only where interactivity needs it.
- TypeScript strict mode on.
- Mobile-first: design at 375px width first; bottom tab bar is the primary nav.
- All Supabase tables enforce Row Level Security keyed on `user_id = auth.uid()`.
- Auth is email magic-link only.
- Shifts and transactions are independent — no automatic shift→income linkage.
- Currency formatting via `Intl.NumberFormat`; default currency USD, locale-aware.
- Secrets live in `.env.local`; never commit them.
- Frequent commits — one per task minimum.

---

## File Structure

```
budget-tracker/
  .env.local.example
  next.config.ts
  tailwind/ (via globals.css using Tailwind v4)
  src/
    lib/
      money.ts            # currency formatting + progress math (pure)
      shifts.ts           # hours/pay computation (pure)
      validation.ts       # form validation (pure)
      categories.ts       # default seed category list (pure data)
      supabase/
        client.ts         # browser client
        server.ts         # server client (cookies)
        types.ts          # generated DB row types (hand-written here)
      data/
        transactions.ts   # CRUD wrappers
        shifts.ts         # CRUD wrappers
        categories.ts     # CRUD + seeding
        employers.ts      # CRUD
    app/
      layout.tsx          # root layout, fonts, theme
      globals.css         # Tailwind + design tokens
      (auth)/sign-in/page.tsx
      auth/callback/route.ts
      (app)/layout.tsx    # authed shell with bottom tab bar
      (app)/budget/page.tsx
      (app)/budget/[categoryId]/page.tsx
      (app)/shifts/page.tsx
      (app)/settings/page.tsx
    components/
      nav/BottomTabBar.tsx
      add/AddSheet.tsx          # the In/Out/Shift capture sheet
      add/AddButton.tsx
      budget/CategoryCard.tsx
      budget/MonthSwitcher.tsx
      budget/BalanceSummary.tsx
      shifts/ShiftRow.tsx
      shifts/WeekGroup.tsx
      ui/Sheet.tsx              # Framer Motion slide-up
      ui/ProgressBar.tsx
      ui/Toast.tsx
      ui/EmptyState.tsx
  supabase/
    migrations/0001_init.sql    # tables + RLS + seed trigger
  tests/
    money.test.ts
    shifts.test.ts
    validation.test.ts
    AddSheet.test.tsx
```

---

### Task 1: Scaffold Next.js app + tooling

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `vitest.config.ts`, `.gitignore`, `.env.local.example`

**Interfaces:**
- Produces: a running dev server and a working `npm test` command.

- [ ] **Step 1: Scaffold the app**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint --no-import-alias --use-npm --yes
```
Expected: project files created in current directory.

- [ ] **Step 2: Add dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr framer-motion
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true, setupFiles: ["./tests/setup.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

Create `tests/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

Add `"@/*": ["./src/*"]` paths to `tsconfig.json` `compilerOptions.paths`.

- [ ] **Step 4: Create env example**

Create `.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
Confirm `.env.local` is in `.gitignore` (create-next-app adds it).

- [ ] **Step 5: Verify build + test wiring**

Run: `npm run test`
Expected: "No test files found" exit 0 (or passes once tests exist). Run `npm run dev` once to confirm it boots, then stop it.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind, Vitest, Supabase deps"
```

---

### Task 2: Money utilities (formatting + progress math)

**Files:**
- Create: `src/lib/money.ts`
- Test: `tests/money.test.ts`

**Interfaces:**
- Produces:
  - `formatMoney(amount: number, currency?: string, locale?: string): string`
  - `categoryProgress(spent: number, limit: number | null): { pct: number; over: boolean }` — `pct` clamped 0–100; `over` true when spent > limit; when `limit` is null returns `{ pct: 0, over: false }`.

- [ ] **Step 1: Write the failing test**

Create `tests/money.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formatMoney, categoryProgress } from "@/lib/money";

describe("formatMoney", () => {
  it("formats USD", () => {
    expect(formatMoney(240, "USD", "en-US")).toBe("$240.00");
  });
});

describe("categoryProgress", () => {
  it("computes percent under limit", () => {
    expect(categoryProgress(240, 400)).toEqual({ pct: 60, over: false });
  });
  it("clamps and flags over limit", () => {
    expect(categoryProgress(500, 400)).toEqual({ pct: 100, over: true });
  });
  it("handles null limit", () => {
    expect(categoryProgress(100, null)).toEqual({ pct: 0, over: false });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/money.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/money.ts`:
```ts
export function formatMoney(amount: number, currency = "USD", locale = "en-US"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

export function categoryProgress(
  spent: number,
  limit: number | null,
): { pct: number; over: boolean } {
  if (limit === null || limit <= 0) return { pct: 0, over: false };
  const raw = (spent / limit) * 100;
  return { pct: Math.min(100, Math.max(0, raw)), over: spent > limit };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/money.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/money.ts tests/money.test.ts
git commit -m "feat: money formatting and category progress math"
```

---

### Task 3: Shift hours/pay computation

**Files:**
- Create: `src/lib/shifts.ts`
- Test: `tests/shifts.test.ts`

**Interfaces:**
- Produces:
  - `hoursWorked(clockIn: string, clockOut: string): number` — decimal hours rounded to 2 places; throws `Error("clock_out must be after clock_in")` when out <= in.
  - `shiftPay(hours: number, pay: number | null): number | null` — returns `pay` as-is (pay is a stored total, not rate-based); passthrough kept for a single call site.

- [ ] **Step 1: Write the failing test**

Create `tests/shifts.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { hoursWorked } from "@/lib/shifts";

describe("hoursWorked", () => {
  it("computes decimal hours", () => {
    expect(hoursWorked("2026-06-19T09:00:00Z", "2026-06-19T17:30:00Z")).toBe(8.5);
  });
  it("throws when out before in", () => {
    expect(() => hoursWorked("2026-06-19T17:00:00Z", "2026-06-19T09:00:00Z")).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shifts.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/shifts.ts`:
```ts
export function hoursWorked(clockIn: string, clockOut: string): number {
  const start = new Date(clockIn).getTime();
  const end = new Date(clockOut).getTime();
  if (end <= start) throw new Error("clock_out must be after clock_in");
  return Math.round(((end - start) / 3_600_000) * 100) / 100;
}

export function shiftPay(_hours: number, pay: number | null): number | null {
  return pay;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shifts.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/shifts.ts tests/shifts.test.ts
git commit -m "feat: shift hours computation"
```

---

### Task 4: Form validation

**Files:**
- Create: `src/lib/validation.ts`
- Test: `tests/validation.test.ts`

**Interfaces:**
- Produces:
  - `validateTransaction(input: { amount: string; categoryId: string | null }): string[]` — returns array of human-readable error strings (empty = valid).
  - `validateShift(input: { employerId: string | null; clockIn: string; clockOut: string }): string[]`.

- [ ] **Step 1: Write the failing test**

Create `tests/validation.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { validateTransaction, validateShift } from "@/lib/validation";

describe("validateTransaction", () => {
  it("passes a valid transaction", () => {
    expect(validateTransaction({ amount: "12.50", categoryId: "c1" })).toEqual([]);
  });
  it("flags missing amount and category", () => {
    expect(validateTransaction({ amount: "", categoryId: null })).toHaveLength(2);
  });
  it("flags non-numeric amount", () => {
    expect(validateTransaction({ amount: "abc", categoryId: "c1" })).toHaveLength(1);
  });
});

describe("validateShift", () => {
  it("passes a valid shift", () => {
    expect(
      validateShift({ employerId: "e1", clockIn: "2026-06-19T09:00", clockOut: "2026-06-19T17:00" }),
    ).toEqual([]);
  });
  it("flags out before in", () => {
    expect(
      validateShift({ employerId: "e1", clockIn: "2026-06-19T17:00", clockOut: "2026-06-19T09:00" }),
    ).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/validation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/validation.ts`:
```ts
export function validateTransaction(input: {
  amount: string;
  categoryId: string | null;
}): string[] {
  const errors: string[] = [];
  const n = Number(input.amount);
  if (input.amount.trim() === "" || Number.isNaN(n)) errors.push("Enter a valid amount");
  else if (n <= 0) errors.push("Amount must be greater than zero");
  if (!input.categoryId) errors.push("Pick a category");
  return errors;
}

export function validateShift(input: {
  employerId: string | null;
  clockIn: string;
  clockOut: string;
}): string[] {
  const errors: string[] = [];
  if (!input.employerId) errors.push("Pick where you worked");
  if (new Date(input.clockOut).getTime() <= new Date(input.clockIn).getTime())
    errors.push("Clock-out must be after clock-in");
  return errors;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/validation.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation.ts tests/validation.test.ts
git commit -m "feat: transaction and shift validation"
```

---

### Task 5: Default categories seed data

**Files:**
- Create: `src/lib/categories.ts`

**Interfaces:**
- Produces: `DEFAULT_CATEGORIES: { name: string; icon: string; color: string; kind: "expense" | "income" }[]` — the seed list used both by the SQL migration's documentation and the settings UI "reset to defaults".

- [ ] **Step 1: Create the seed list**

Create `src/lib/categories.ts`:
```ts
export type CategoryKind = "expense" | "income";

export const DEFAULT_CATEGORIES: {
  name: string;
  icon: string;
  color: string;
  kind: CategoryKind;
}[] = [
  { name: "Travel", icon: "plane", color: "#3B82F6", kind: "expense" },
  { name: "Food & Dining", icon: "utensils", color: "#F97316", kind: "expense" },
  { name: "Groceries", icon: "shopping-basket", color: "#22C55E", kind: "expense" },
  { name: "Rent/Housing", icon: "home", color: "#8B5CF6", kind: "expense" },
  { name: "Transport", icon: "bus", color: "#06B6D4", kind: "expense" },
  { name: "Shopping", icon: "shopping-bag", color: "#EC4899", kind: "expense" },
  { name: "Bills & Utilities", icon: "receipt", color: "#EAB308", kind: "expense" },
  { name: "Entertainment", icon: "clapperboard", color: "#A855F7", kind: "expense" },
  { name: "Health", icon: "heart-pulse", color: "#EF4444", kind: "expense" },
  { name: "Income", icon: "wallet", color: "#10B981", kind: "income" },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/categories.ts
git commit -m "feat: default category seed list"
```

---

### Task 6: Supabase schema migration (tables + RLS + seed trigger)

**Files:**
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces: tables `categories`, `transactions`, `employers`, `shifts` with RLS, and a `handle_new_user` trigger that seeds `DEFAULT_CATEGORIES` for each new auth user.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0001_init.sql`:
```sql
-- Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  icon text not null default 'wallet',
  color text not null default '#6366F1',
  monthly_limit numeric,
  kind text not null default 'expense' check (kind in ('expense','income')),
  created_at timestamptz not null default now()
);

-- Transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  category_id uuid references public.categories on delete set null,
  amount numeric not null check (amount > 0),
  direction text not null check (direction in ('in','out')),
  note text,
  occurred_at date not null default current_date,
  created_at timestamptz not null default now()
);

-- Employers
create table public.employers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  color text not null default '#6366F1',
  created_at timestamptz not null default now()
);

-- Shifts
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  employer_id uuid references public.employers on delete set null,
  shift_type text,
  clock_in timestamptz not null,
  clock_out timestamptz not null,
  pay numeric,
  note text,
  worked_on date not null default current_date,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.employers enable row level security;
alter table public.shifts enable row level security;

create policy "own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own employers" on public.employers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own shifts" on public.shifts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed default categories on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.categories (user_id, name, icon, color, kind) values
    (new.id, 'Travel', 'plane', '#3B82F6', 'expense'),
    (new.id, 'Food & Dining', 'utensils', '#F97316', 'expense'),
    (new.id, 'Groceries', 'shopping-basket', '#22C55E', 'expense'),
    (new.id, 'Rent/Housing', 'home', '#8B5CF6', 'expense'),
    (new.id, 'Transport', 'bus', '#06B6D4', 'expense'),
    (new.id, 'Shopping', 'shopping-bag', '#EC4899', 'expense'),
    (new.id, 'Bills & Utilities', 'receipt', '#EAB308', 'expense'),
    (new.id, 'Entertainment', 'clapperboard', '#A855F7', 'expense'),
    (new.id, 'Health', 'heart-pulse', '#EF4444', 'expense'),
    (new.id, 'Income', 'wallet', '#10B981', 'income');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 2: Document how to apply it**

Add a `supabase/README.md` noting: paste `0001_init.sql` into the Supabase SQL editor (or `supabase db push` with CLI) and enable email magic-link auth in the dashboard. (No automated test — this is infra. It will be exercised by Task 8+.)

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: supabase schema with RLS and category seed trigger"
```

---

### Task 7: Supabase client + typed rows

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/types.ts`

**Interfaces:**
- Produces:
  - `createBrowserSupabase()` → SupabaseClient (client components)
  - `createServerSupabase()` → SupabaseClient (server components/route handlers, cookie-bound)
  - Row types: `CategoryRow`, `TransactionRow`, `EmployerRow`, `ShiftRow`.

- [ ] **Step 1: Define row types**

Create `src/lib/supabase/types.ts`:
```ts
export type CategoryKind = "expense" | "income";
export type Direction = "in" | "out";

export interface CategoryRow {
  id: string; user_id: string; name: string; icon: string; color: string;
  monthly_limit: number | null; kind: CategoryKind; created_at: string;
}
export interface TransactionRow {
  id: string; user_id: string; category_id: string | null; amount: number;
  direction: Direction; note: string | null; occurred_at: string; created_at: string;
}
export interface EmployerRow {
  id: string; user_id: string; name: string; color: string; created_at: string;
}
export interface ShiftRow {
  id: string; user_id: string; employer_id: string | null; shift_type: string | null;
  clock_in: string; clock_out: string; pay: number | null; note: string | null;
  worked_on: string; created_at: string;
}
```

- [ ] **Step 2: Browser client**

Create `src/lib/supabase/client.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 3: Server client**

Create `src/lib/supabase/server.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  );
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/
git commit -m "feat: supabase browser/server clients and row types"
```

---

### Task 8: Auth (magic-link sign-in + callback + middleware)

**Files:**
- Create: `src/app/(auth)/sign-in/page.tsx`, `src/app/auth/callback/route.ts`, `src/middleware.ts`

**Interfaces:**
- Consumes: `createBrowserSupabase`, `createServerSupabase` from Task 7.
- Produces: an authed session; unauthenticated visits to `/(app)/*` redirect to `/sign-in`.

- [ ] **Step 1: Sign-in page**

Create `src/app/(auth)/sign-in/page.tsx` (client component): an email input + "Send magic link" button calling `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + '/auth/callback' } })`, showing a "Check your email" confirmation state. Style mobile-first, centered card.

```tsx
"use client";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserSupabase();

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="min-h-dvh grid place-items-center p-6">
      {sent ? (
        <p className="text-center">Check your email for a sign-in link.</p>
      ) : (
        <form onSubmit={send} className="w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full rounded-xl border px-4 py-3 text-base"
          />
          <button className="w-full rounded-xl bg-black text-white py-3 font-medium">
            Send magic link
          </button>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </form>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Callback route**

Create `src/app/auth/callback/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}/budget`);
}
```

- [ ] **Step 3: Middleware route protection**

Create `src/middleware.ts`:
```ts
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthRoute = request.nextUrl.pathname.startsWith("/sign-in");
  if (!user && !isAuthRoute && request.nextUrl.pathname !== "/") {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|auth/callback).*)"],
};
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` then `npm run dev`. Visit `/budget` unauthenticated → expect redirect to `/sign-in`. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/app/(auth) src/app/auth src/middleware.ts
git commit -m "feat: magic-link auth with route protection"
```

---

### Task 9: Data access layer

**Files:**
- Create: `src/lib/data/categories.ts`, `src/lib/data/transactions.ts`, `src/lib/data/employers.ts`, `src/lib/data/shifts.ts`

**Interfaces:**
- Consumes: row types + clients from Task 7.
- Produces (all async, all take a `SupabaseClient`):
  - categories: `listCategories(sb)`, `createCategory(sb, input)`, `updateCategory(sb, id, patch)`, `deleteCategory(sb, id)`
  - transactions: `listTransactions(sb, { month })`, `listByCategory(sb, categoryId)`, `createTransaction(sb, input)`, `deleteTransaction(sb, id)`
  - employers: `listEmployers(sb)`, `createEmployer(sb, name)`, `deleteEmployer(sb, id)`
  - shifts: `listShifts(sb)`, `createShift(sb, input)`, `deleteShift(sb, id)`

- [ ] **Step 1: Categories data module**

Create `src/lib/data/categories.ts`:
```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoryRow } from "@/lib/supabase/types";

export async function listCategories(sb: SupabaseClient): Promise<CategoryRow[]> {
  const { data, error } = await sb.from("categories").select("*").order("created_at");
  if (error) throw error;
  return data as CategoryRow[];
}
export async function createCategory(
  sb: SupabaseClient,
  input: Pick<CategoryRow, "name" | "icon" | "color" | "kind"> & { monthly_limit?: number | null },
): Promise<CategoryRow> {
  const { data, error } = await sb.from("categories").insert(input).select().single();
  if (error) throw error;
  return data as CategoryRow;
}
export async function updateCategory(
  sb: SupabaseClient, id: string, patch: Partial<CategoryRow>,
): Promise<void> {
  const { error } = await sb.from("categories").update(patch).eq("id", id);
  if (error) throw error;
}
export async function deleteCategory(sb: SupabaseClient, id: string): Promise<void> {
  const { error } = await sb.from("categories").delete().eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 2: Transactions data module**

Create `src/lib/data/transactions.ts`:
```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TransactionRow } from "@/lib/supabase/types";

export async function listTransactions(
  sb: SupabaseClient, opts: { month: string }, // month = "2026-06"
): Promise<TransactionRow[]> {
  const start = `${opts.month}-01`;
  const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 1)
    .toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("transactions").select("*")
    .gte("occurred_at", start).lt("occurred_at", end)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return data as TransactionRow[];
}
export async function listByCategory(
  sb: SupabaseClient, categoryId: string,
): Promise<TransactionRow[]> {
  const { data, error } = await sb
    .from("transactions").select("*").eq("category_id", categoryId)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return data as TransactionRow[];
}
export async function createTransaction(
  sb: SupabaseClient,
  input: Pick<TransactionRow, "category_id" | "amount" | "direction" | "note" | "occurred_at">,
): Promise<TransactionRow> {
  const { data, error } = await sb.from("transactions").insert(input).select().single();
  if (error) throw error;
  return data as TransactionRow;
}
export async function deleteTransaction(sb: SupabaseClient, id: string): Promise<void> {
  const { error } = await sb.from("transactions").delete().eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 3: Employers + shifts data modules**

Create `src/lib/data/employers.ts`:
```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmployerRow } from "@/lib/supabase/types";

export async function listEmployers(sb: SupabaseClient): Promise<EmployerRow[]> {
  const { data, error } = await sb.from("employers").select("*").order("created_at");
  if (error) throw error;
  return data as EmployerRow[];
}
export async function createEmployer(sb: SupabaseClient, name: string): Promise<EmployerRow> {
  const { data, error } = await sb.from("employers").insert({ name }).select().single();
  if (error) throw error;
  return data as EmployerRow;
}
export async function deleteEmployer(sb: SupabaseClient, id: string): Promise<void> {
  const { error } = await sb.from("employers").delete().eq("id", id);
  if (error) throw error;
}
```

Create `src/lib/data/shifts.ts`:
```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ShiftRow } from "@/lib/supabase/types";

export async function listShifts(sb: SupabaseClient): Promise<ShiftRow[]> {
  const { data, error } = await sb.from("shifts").select("*")
    .order("worked_on", { ascending: false });
  if (error) throw error;
  return data as ShiftRow[];
}
export async function createShift(
  sb: SupabaseClient,
  input: Pick<ShiftRow, "employer_id" | "shift_type" | "clock_in" | "clock_out" | "pay" | "note" | "worked_on">,
): Promise<ShiftRow> {
  const { data, error } = await sb.from("shifts").insert(input).select().single();
  if (error) throw error;
  return data as ShiftRow;
}
export async function deleteShift(sb: SupabaseClient, id: string): Promise<void> {
  const { error } = await sb.from("shifts").delete().eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 4: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/
git commit -m "feat: typed data access layer for all tables"
```

---

### Task 10: Design tokens, fonts, and base UI primitives

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`
- Create: `src/components/ui/ProgressBar.tsx`, `src/components/ui/Sheet.tsx`, `src/components/ui/EmptyState.tsx`, `src/components/ui/Toast.tsx`

**Interfaces:**
- Produces:
  - `<ProgressBar value={number} over={boolean} color={string} />`
  - `<Sheet open={boolean} onClose={() => void}>children</Sheet>` (Framer Motion slide-up)
  - `<EmptyState icon title action />`
  - `<Toast />` + `useToast()` hook
- Consumes: nothing app-specific.

- [ ] **Step 1: Design tokens + font**

In `src/app/globals.css` define CSS variables for a friendly palette (warm off-white background, deep ink text, indigo accent), rounded radii, and soft shadows. In `layout.tsx` load a friendly variable font (e.g. `Geist` / `Inter`) and set `lang`, `dvh` body, theme color meta for mobile.

```css
/* globals.css (append after @import "tailwindcss";) */
:root {
  --bg: #faf8f5; --surface: #ffffff; --ink: #1c1917; --muted: #78716c;
  --accent: #6366f1; --accent-soft: #eef2ff; --danger: #ef4444; --ok: #10b981;
  --radius: 1rem; --shadow: 0 1px 3px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.05);
}
body { background: var(--bg); color: var(--ink); }
```

- [ ] **Step 2: ProgressBar**

Create `src/components/ui/ProgressBar.tsx` — a rounded track with a `motion.div` width animating to `value`%; turns danger color when `over`.

```tsx
"use client";
import { motion } from "framer-motion";

export function ProgressBar({ value, over, color }: { value: number; over: boolean; color: string }) {
  return (
    <div className="h-2.5 w-full rounded-full bg-black/5 overflow-hidden">
      <motion.div
        initial={{ width: 0 }} animate={{ width: `${value}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        className="h-full rounded-full"
        style={{ background: over ? "var(--danger)" : color }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Sheet (slide-up modal)**

Create `src/components/ui/Sheet.tsx` using `AnimatePresence` + `motion.div` (backdrop fade, panel slide from bottom, drag-to-dismiss optional). Rounded top corners, max-width on desktop, full-width on mobile.

```tsx
"use client";
import { AnimatePresence, motion } from "framer-motion";

export function Sheet({ open, onClose, children }: {
  open: boolean; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[var(--surface)] p-5 pb-8 mx-auto max-w-md shadow-[var(--shadow)]"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}>
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/10" />
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: EmptyState + Toast**

Create `src/components/ui/EmptyState.tsx` (centered icon, title, subtitle, one primary action button). Create `src/components/ui/Toast.tsx` with a `useToast()` returning `{ show(message, kind) }` rendered via a fixed top-center `AnimatePresence` stack.

(Provide full minimal implementations following the same style as above — friendly copy, rounded, motion entrances.)

- [ ] **Step 5: Verify compile + visual smoke**

Run: `npx tsc --noEmit`; `npm run dev`, eyeball the sign-in page renders with new tokens. Stop server.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/components/ui/
git commit -m "feat: design tokens and core UI primitives"
```

---

### Task 11: Authed app shell + bottom tab bar

**Files:**
- Create: `src/app/(app)/layout.tsx`, `src/components/nav/BottomTabBar.tsx`, `src/components/add/AddButton.tsx`

**Interfaces:**
- Consumes: `createServerSupabase` (to confirm session), UI primitives.
- Produces: a shared shell rendering children above a fixed bottom tab bar with tabs Budget · Shifts · (center +) · Settings. The center + opens the AddSheet (wired in Task 14 via a client context).

- [ ] **Step 1: App layout (server) guards session**

Create `src/app/(app)/layout.tsx`: server component that calls `createServerSupabase().auth.getUser()`, redirects to `/sign-in` if absent, otherwise renders `<main className="pb-24">{children}</main>` + `<BottomTabBar/>`.

- [ ] **Step 2: BottomTabBar (client)**

Create `src/components/nav/BottomTabBar.tsx`: fixed bottom, 4 slots with the center being a raised circular `AddButton`. Active tab uses accent color; uses `usePathname()` to highlight. Large 48px+ touch targets, safe-area padding (`pb-[env(safe-area-inset-bottom)]`).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`; `npm run dev`, sign in (or temporarily stub) and confirm tab bar shows on `/budget`. Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/layout.tsx src/components/nav src/components/add/AddButton.tsx
git commit -m "feat: authed app shell with bottom tab bar"
```

---

### Task 12: Budget page (month switcher, summary, category cards)

**Files:**
- Create: `src/app/(app)/budget/page.tsx`, `src/components/budget/MonthSwitcher.tsx`, `src/components/budget/BalanceSummary.tsx`, `src/components/budget/CategoryCard.tsx`

**Interfaces:**
- Consumes: `listCategories`, `listTransactions` (Task 9), `formatMoney`, `categoryProgress` (Task 2), `ProgressBar` (Task 10).
- Produces: `/budget` showing the selected month's in/out balance and per-category spend vs limit.

- [ ] **Step 1: Budget page (server) loads data**

Create `src/app/(app)/budget/page.tsx`: read `?month=` (default current `YYYY-MM`), fetch categories + transactions via server client, compute per-category spent (sum of `out` for that category) and totals (sum in, sum out). Pass to client components.

- [ ] **Step 2: MonthSwitcher + BalanceSummary**

`MonthSwitcher` (client): prev/next chevrons + month label, updates `?month=` via `router.push`. `BalanceSummary`: two big numbers (In / Out) and net, using `formatMoney`, with a subtle motion count-up.

- [ ] **Step 3: CategoryCard**

`CategoryCard`: icon chip (color), name, `spent / limit` text via `formatMoney`, and `<ProgressBar value={categoryProgress(spent,limit).pct} over={...} color={color} />`. Whole card is a `Link` to `/budget/[categoryId]`. Income categories show total received instead of a limit bar.

- [ ] **Step 4: Empty state**

If no transactions this month, render `<EmptyState>` with "No spending logged yet" + a button that opens the Add sheet.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`; with seeded Supabase data, `npm run dev` → `/budget` shows cards and progress bars. Stop server.

- [ ] **Step 6: Commit**

```bash
git add src/app/(app)/budget/page.tsx src/components/budget/
git commit -m "feat: budget page with month switcher, summary, category cards"
```

---

### Task 13: Category detail page

**Files:**
- Create: `src/app/(app)/budget/[categoryId]/page.tsx`

**Interfaces:**
- Consumes: `listByCategory` (Task 9), `formatMoney`.
- Produces: `/budget/[categoryId]` listing that category's transactions (date, note, amount with +/− color), newest first, with a header showing the category and its monthly progress.

- [ ] **Step 1: Build the page**

Server component: fetch the category + its transactions, render header (icon, name, progress bar) and a list of transaction rows. Each row: date (formatted), note, signed amount (green for `in`, ink for `out`). Empty state if none. Swipe/long-press delete can be a later enhancement — include a simple delete button per row calling a client action.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`; click a category from `/budget`, confirm its transactions render. Stop server.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/budget/[categoryId]/page.tsx"
git commit -m "feat: category detail with transaction list"
```

---

### Task 14: Add sheet (In/Out/Shift capture) — the core flow

**Files:**
- Create: `src/components/add/AddSheet.tsx`, `src/components/add/AddSheetProvider.tsx`
- Modify: `src/app/(app)/layout.tsx` (wrap children in `AddSheetProvider`), `src/components/add/AddButton.tsx` (call `useAddSheet().open()`)
- Test: `tests/AddSheet.test.tsx`

**Interfaces:**
- Consumes: `validateTransaction`, `validateShift` (Task 4), data-layer creators (Task 9), categories/employers lists, `Sheet`, `useToast`.
- Produces: `AddSheetProvider` exposing `useAddSheet()` → `{ open, close, isOpen }`; the sheet with an **In / Out / Shift** segmented toggle and smart-default forms.

- [ ] **Step 1: Write the failing component test**

Create `tests/AddSheet.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AddSheet } from "@/components/add/AddSheet";

const categories = [{ id: "c1", name: "Travel", icon: "plane", color: "#3B82F6", kind: "expense", monthly_limit: null, user_id: "u", created_at: "" }];
const employers = [{ id: "e1", name: "Cafe", color: "#000", user_id: "u", created_at: "" }];

describe("AddSheet", () => {
  it("shows transaction form by default with category options", () => {
    render(<AddSheet open onClose={() => {}} categories={categories as any} employers={employers as any} onCreated={() => {}} />);
    expect(screen.getByPlaceholderText(/amount/i)).toBeInTheDocument();
    expect(screen.getByText("Travel")).toBeInTheDocument();
  });

  it("switches to shift form when Shift toggle clicked", () => {
    render(<AddSheet open onClose={() => {}} categories={categories as any} employers={employers as any} onCreated={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /shift/i }));
    expect(screen.getByText(/clock in/i)).toBeInTheDocument();
  });

  it("blocks save on invalid transaction and shows errors", () => {
    const onCreated = vi.fn();
    render(<AddSheet open onClose={() => {}} categories={categories as any} employers={employers as any} onCreated={onCreated} />);
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByText(/valid amount/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/AddSheet.test.tsx`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement AddSheet**

Create `src/components/add/AddSheet.tsx` (client). Props: `open, onClose, categories, employers, onCreated`. Internal state: `mode: "in" | "out" | "shift"` (default `"out"`). Renders a segmented control (In / Out / Shift). 

- Transaction mode: large amount input (`inputMode="decimal"`, autofocus), category chips (default = last used, persisted to `localStorage`), date input (default today), collapsible note. On save: run `validateTransaction`; if errors, render them; else call `createTransaction` with `direction = mode`, call `onCreated`, toast success, close.
- Shift mode: employer chips (default = last used), clock-in/out `datetime-local` inputs (in default = now), optional pay + note collapsed. On save: `validateShift`, then `createShift` (compute `worked_on` from clock_in date), `onCreated`, toast, close.

Keep the validation/branching logic pure and call the data layer through injected props so the test can render without Supabase. Pass the actual `createTransaction`/`createShift` from the provider.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/AddSheet.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire the provider**

Create `src/components/add/AddSheetProvider.tsx`: a client context that loads categories + employers (via browser client on mount), holds `isOpen`, renders `<AddSheet>` with real `createTransaction`/`createShift`, and on `onCreated` calls `router.refresh()` so budget/shift pages re-fetch. Wrap `(app)/layout.tsx` children with it; make `AddButton` call `useAddSheet().open()`.

- [ ] **Step 6: Verify end-to-end**

Run: `npx tsc --noEmit`; `npm run dev`, tap +, add an expense → appears on `/budget`; add a shift → appears on `/shifts` (Task 15). Stop server.

- [ ] **Step 7: Commit**

```bash
git add src/components/add tests/AddSheet.test.tsx "src/app/(app)/layout.tsx"
git commit -m "feat: unified In/Out/Shift add sheet with smart defaults"
```

---

### Task 15: Shifts page (weekly groups + summary)

**Files:**
- Create: `src/app/(app)/shifts/page.tsx`, `src/components/shifts/WeekGroup.tsx`, `src/components/shifts/ShiftRow.tsx`

**Interfaces:**
- Consumes: `listShifts`, `listEmployers` (Task 9), `hoursWorked` (Task 3).
- Produces: `/shifts` listing shifts grouped by ISO week, each row showing day · employer · type · in→out · hours, with a "This week: Nh" summary header.

- [ ] **Step 1: Shifts page (server) loads + groups**

Create `src/app/(app)/shifts/page.tsx`: fetch shifts + employers, join employer name/color by id, group by ISO week (helper inline or in `src/lib/shifts.ts` — add `isoWeekKey(date: string): string` with a unit test if added). Compute current-week total hours via `hoursWorked`.

- [ ] **Step 2: WeekGroup + ShiftRow**

`WeekGroup`: week label ("This week", "Last week", or date range) + total hours. `ShiftRow`: day-of-week chip, employer dot+name, type, `9:00–17:30` time range, `8.5h` via `hoursWorked`, optional pay via `formatMoney`. Motion list entrance (stagger).

- [ ] **Step 3: Empty state**

If no shifts, `<EmptyState title="No shifts yet" action="Add your first shift" />` opening the add sheet in shift mode.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`; add shifts via the + sheet, confirm grouping and weekly total. Stop server.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/shifts" src/components/shifts/
git commit -m "feat: shifts page with weekly grouping and hours summary"
```

---

### Task 16: Settings (categories, employers, account)

**Files:**
- Create: `src/app/(app)/settings/page.tsx`, plus small client editors `src/components/settings/CategoryEditor.tsx`, `src/components/settings/EmployerEditor.tsx`

**Interfaces:**
- Consumes: category + employer data modules (Task 9), auth client.
- Produces: `/settings` to add/edit/delete categories (name, icon, color, monthly limit), manage employers, and sign out.

- [ ] **Step 1: Settings page**

Server component fetching categories + employers; renders two sections (Categories, Where you work) and an account section with the user's email + a "Sign out" button (client, calls `supabase.auth.signOut()` then `router.push('/sign-in')`).

- [ ] **Step 2: Category editor**

`CategoryEditor` (client): list rows with inline edit of name/limit, a color/icon picker (icon from a small fixed set matching seed icons), add-new row, delete with confirm. Calls `createCategory`/`updateCategory`/`deleteCategory`, then `router.refresh()`.

- [ ] **Step 3: Employer editor**

`EmployerEditor` (client): add employer (name + color), delete. Calls `createEmployer`/`deleteEmployer`.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`; edit a category limit → reflected on `/budget`; add an employer → selectable in the add sheet. Stop server.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/settings" src/components/settings/
git commit -m "feat: settings for categories, employers, and account"
```

---

### Task 17: Impeccable design pass + polish

**Files:**
- Modify: components/pages as needed (spacing, type scale, motion, empty states, color).

**Interfaces:**
- Consumes: the impeccable skill.
- Produces: a cohesive, friendly, mobile-first visual system across all screens.

- [ ] **Step 1: Run the impeccable skill**

Invoke the `impeccable` skill against the running app to audit and elevate: visual hierarchy, typography, spacing rhythm, color harmony, micro-interactions, empty states, and accessibility (contrast, focus rings, 44px targets). Apply its recommended changes.

- [ ] **Step 2: Responsiveness check**

Verify at 375px, 768px, 1024px: bottom bar stays thumb-reachable on mobile; content centers with max-width on desktop. Fix overflow/cramped areas.

- [ ] **Step 3: Verify full suite**

Run: `npm run test` (all unit/component tests pass) and `npx tsc --noEmit` (clean) and `npm run build` (production build succeeds).
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "polish: impeccable design pass and responsive refinements"
```

---

### Task 18: README + final verification

**Files:**
- Create: `README.md`

**Interfaces:**
- Produces: setup docs (env vars, Supabase migration, run/test commands).

- [ ] **Step 1: Write README**

Document: prerequisites, copy `.env.local.example` → `.env.local` with Supabase URL + anon key, apply `supabase/migrations/0001_init.sql`, enable email magic-link auth, `npm run dev`, `npm run test`, `npm run build`.

- [ ] **Step 2: Final verification**

Run: `npm run test && npx tsc --noEmit && npm run build`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: setup and usage README"
```

---

## Self-Review

**Spec coverage:**
- Stack (Next/TS/Tailwind/Framer/Supabase) → Tasks 1, 7, 10. ✓
- Data model (4 tables + RLS + seed) → Task 6. ✓
- Categories with limits + progress bars → Tasks 2, 12, 16. ✓
- Transactions (amount, in/out, category, date, note) → Tasks 9, 14, 13. ✓
- Shifts (employer, type, in/out, optional pay, note, computed hours) → Tasks 3, 9, 14, 15. ✓
- Independent (no auto-income) → enforced by separate flows; no linkage code anywhere. ✓
- Auth magic-link + RLS privacy → Tasks 6, 8. ✓
- Screens: Budget, Shifts, Add, Settings, Auth → Tasks 8, 11, 12, 13, 14, 15, 16. ✓
- Effortless capture (smart defaults, one sheet, big targets) → Task 14. ✓
- Mobile-first + bottom tab bar → Tasks 11, 17. ✓
- Motion → Tasks 10, 12, 14, 15. ✓
- Impeccable design → Task 17. ✓
- Error handling (validation, toasts) → Tasks 4, 10, 14. ✓
- Testing (utils, component, RLS) → Tasks 2–4, 14; RLS verified manually via Task 6 docs + auth flow. ✓

**Placeholder scan:** Tasks 10 (Step 4) and 14 (Step 3) describe component bodies in prose rather than full code; they reference exact props/signatures and styling already shown in sibling steps, so an implementer has concrete interfaces. All pure-logic tasks include full code + tests.

**Type consistency:** `createTransaction`/`createShift`/`createCategory`/`createEmployer` signatures in Task 9 match their call sites in Tasks 12–16. `categoryProgress`, `hoursWorked`, `formatMoney`, `validateTransaction`, `validateShift` names are consistent across tasks. Row types from Task 7 used uniformly.
