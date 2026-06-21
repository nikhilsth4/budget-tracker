# Email/Password Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace magic-link sign-in with email + password auth (email confirmation kept), as a refined centered card, and fix the production redirect via Supabase config docs.

**Architecture:** A pure `validateCredentials` helper (unit-tested) guards the password rule; the `/sign-in` client page calls `signInWithPassword` / `signUp` and toggles between sign-in and create-account modes with a confirm-email notice. The existing `/auth/callback` route (used by the confirmation link) is unchanged.

**Tech Stack:** Next.js 16 (App Router), TypeScript strict, Tailwind v4, Framer Motion, Supabase (`@supabase/ssr`), Vitest.

## Global Constraints

- Next.js 16 App Router; `"use client"` only where interactivity needs it; TypeScript strict.
- Auth is email + password with **email confirmation ON**; no social providers.
- Keep `src/app/auth/callback/route.ts` (confirmation link handler) unchanged.
- Visual system per `DESIGN.md`: rose-on-white, solid rose primary, focus rings using `--accent` / `--accent-soft`, no gradient text, contrast AA, reduced-motion respected globally.
- Password minimum 6 characters.
- Frequent commits — one per task minimum.

---

## File Structure

```
src/
  lib/
    authValidation.ts            # NEW pure: validateCredentials
  app/(auth)/sign-in/page.tsx    # REWRITE: email/password + mode toggle
  app/auth/callback/route.ts     # UNCHANGED (confirmation link handler)
tests/
  authValidation.test.ts         # NEW
README.md                        # MODIFY: Supabase URL config + auth steps
```

---

### Task 1: Credential validation helper

**Files:**
- Create: `src/lib/authValidation.ts`
- Test: `tests/authValidation.test.ts`

**Interfaces:**
- Produces: `validateCredentials(email: string, password: string): string[]` —
  returns human-readable error strings (empty = valid). Guards the password-length
  rule (≥ 6); email presence is enforced natively by the `required`/`type=email`
  input, but the helper still flags a blank email so it is independently testable.

- [ ] **Step 1: Write the failing test**

Create `tests/authValidation.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { validateCredentials } from "@/lib/authValidation";

describe("validateCredentials", () => {
  it("passes with a valid email and 6+ char password", () => {
    expect(validateCredentials("a@b.com", "secret")).toEqual([]);
  });
  it("flags a short password", () => {
    expect(validateCredentials("a@b.com", "abc")).toEqual([
      "Password must be at least 6 characters.",
    ]);
  });
  it("flags a blank email", () => {
    expect(validateCredentials("  ", "secret")).toContain("Enter your email.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/authValidation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/authValidation.ts`:
```ts
export function validateCredentials(email: string, password: string): string[] {
  const errors: string[] = [];
  if (email.trim() === "") errors.push("Enter your email.");
  if (password.length < 6) errors.push("Password must be at least 6 characters.");
  return errors;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/authValidation.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/authValidation.ts tests/authValidation.test.ts
git commit -m "feat: credential validation helper for email/password auth"
```

---

### Task 2: Email/password sign-in page

**Files:**
- Modify (rewrite): `src/app/(auth)/sign-in/page.tsx`

**Interfaces:**
- Consumes: `validateCredentials` (Task 1); `createBrowserSupabase` (`@/lib/supabase/client`); `useRouter` (`next/navigation`); `motion` (`framer-motion`).
- Produces: the `/sign-in` page (default export, client component).

- [ ] **Step 1: Write the page**

Replace the entire contents of `src/app/(auth)/sign-in/page.tsx` with:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { validateCredentials } from "@/lib/authValidation";

type Mode = "signin" | "signup";

const fieldClass =
  "w-full rounded-xl border border-black/10 bg-[var(--surface)] px-4 py-3.5 text-base outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]";

export default function SignIn() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const errs = validateCredentials(email, password);
    if (errs.length) {
      setError(errs[0]);
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabase();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      // Email confirmation ON → no session until the user confirms by email.
      if (data.session) {
        router.push("/budget");
        router.refresh();
      } else {
        setNotice("Check your email to confirm your account, then sign in.");
        setMode("signin");
        setPassword("");
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/budget");
    router.refresh();
  }

  function toggleMode() {
    setMode(mode === "signin" ? "signup" : "signin");
    setError(null);
    setNotice(null);
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--bg)] p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[1.25rem] text-3xl text-white"
            style={{
              background: "linear-gradient(135deg, var(--accent-bright), var(--accent))",
              boxShadow: "0 12px 28px -8px rgba(190, 24, 93, 0.5)",
            }}
          >
            ◐
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Budget &amp; Shifts</h1>
          <p className="mt-1 text-[var(--muted)]">
            {mode === "signin"
              ? "Sign in to track your money and hours."
              : "Create an account to get started."}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3 rounded-2xl bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            inputMode="email"
            autoComplete="email"
            className={fieldClass}
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className={fieldClass}
          />
          <button
            disabled={loading}
            className="w-full rounded-xl bg-[var(--accent)] py-3.5 font-semibold text-white shadow-[0_8px_20px_-8px_rgba(190,24,93,0.6)] transition active:scale-[0.99] disabled:opacity-60"
          >
            {loading
              ? mode === "signin"
                ? "Signing in…"
                : "Creating account…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          {notice && <p className="text-sm text-[var(--ok)]">{notice}</p>}
        </form>

        <p className="mt-5 text-center text-sm text-[var(--muted)]">
          {mode === "signin" ? "New here? " : "Already have an account? "}
          <button onClick={toggleMode} className="font-medium text-[var(--accent)]">
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </motion.div>
    </main>
  );
}
```

- [ ] **Step 2: Verify compile + build**

Run: `npx tsc --noEmit` (expect no errors) and `npm run build` (expect success — the
sign-in page prerenders without env vars because the Supabase client is created
inside the submit handler, not at module/render top level).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(auth)/sign-in/page.tsx"
git commit -m "feat: email/password sign-in page with create-account toggle"
```

---

### Task 3: README — Supabase auth config

**Files:**
- Modify: `README.md`

**Interfaces:**
- Produces: documented operator steps so confirmation links land on the right host.

- [ ] **Step 1: Update the auth setup section**

In `README.md`, replace the magic-link enable step with email/password + the URL
config that fixes the production redirect. The section must state:
- **Authentication → Providers → Email:** enabled, **Confirm email ON**.
- **Authentication → URL Configuration → Site URL:** the production URL (e.g.
  `https://your-app.vercel.app`); use `http://localhost:3000` only for local-only use.
- **Redirect URLs:** add both `http://localhost:3000/auth/callback` and
  `<prod>/auth/callback`.
- Note that new accounts must confirm via email before first sign-in.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: email/password auth and Supabase URL configuration"
```

---

## Self-Review

**Spec coverage:**
- §2 sign in (`signInWithPassword`) → Task 2. ✓
- §2 create account (`signUp`, confirm-email notice, no session) → Task 2. ✓
- §2 keep `/auth/callback` unchanged → not modified by any task (explicit in constraints + file structure). ✓
- §3 UI states (modes, logo, fields, autocomplete, loading labels, error/notice, toggle, centered card, motion) → Task 2. ✓
- §3 visual craft (focus rings, soft shadow, rose primary) → Task 2 (`fieldClass`, card shadow, rose button). ✓
- §4 `validateCredentials` (password ≥ 6) + first-error display → Tasks 1 & 2. ✓
- §5 Supabase config (Site URL, Redirect URLs, Confirm email ON) → Task 3. ✓
- §6 unit test for `validateCredentials` → Task 1. ✓
- §7 YAGNI (no social, no password reset, no magic-link) → none added. ✓

**Placeholder scan:** No TBD/TODO; Task 2 ships the complete page; Task 1 ships full
code + tests; Task 3 enumerates exact config keys.

**Type consistency:** `validateCredentials(email, password): string[]` defined in
Task 1 is called identically in Task 2. `createBrowserSupabase`, `signUp`,
`signInWithPassword` match `@supabase/ssr` / existing client. `Mode` union consistent
within Task 2.
