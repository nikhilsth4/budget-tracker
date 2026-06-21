# Email/Password Login — Design Spec

**Date:** 2026-06-21
**Status:** Approved design (pending spec review)
**Builds on:** `2026-06-19-budget-shift-tracker-design.md`

## 1. Overview

Replace magic-link sign-in with **email + password** authentication, keeping
**email confirmation** for new accounts. No social providers. Single `/sign-in`
page with a Sign in / Create account toggle, presented as a **refined centered
card** consistent with the rose-on-white design system.

This also resolves the production redirect bug (confirmation links currently fall
back to `localhost:3000`) via Supabase URL configuration.

## 2. Auth flow

- **Sign in:** email + password → `supabase.auth.signInWithPassword({ email,
  password })` → on success `router.push("/budget")` + `router.refresh()`.
- **Create account:** toggle to signup → `supabase.auth.signUp({ email, password
  })`. Because email confirmation is ON, `signUp` returns **no session**; show a
  **"Check your email to confirm your account"** notice and switch the form back to
  Sign in.
- **Confirmation link:** the email links to `<SiteURL>/auth/callback?code=...`. The
  existing `src/app/auth/callback/route.ts` exchanges the code for a session and
  redirects to `/budget`. **This route is kept unchanged.**
- **Session propagation:** the `@supabase/ssr` browser client persists the session
  to cookies; `router.refresh()` lets the server (app layout + proxy) see it.
- The category-seed trigger fires on `auth.users` insert regardless of auth method,
  so new users still get default categories.

## 3. UI / states

Single client component `src/app/(auth)/sign-in/page.tsx` with `mode: "signin" |
"signup"`:

- Rose gradient logo mark, "Budget & Shifts" title, contextual subtitle.
- Email input (`type=email`, autocomplete `email`).
- Password input (`type=password`, autocomplete `current-password` for signin /
  `new-password` for signup).
- Primary rose button: "Sign in" / "Create account"; loading labels "Signing in…" /
  "Creating account…".
- Inline messages: `error` in danger color, `notice` (the confirm-email message) in
  ok color.
- Toggle line beneath the card: "New here? Create an account" ↔ "Already have an
  account? Sign in". Switching modes clears error/notice.
- Layout: centered card (`min-h-dvh grid place-items-center`), `max-w-sm`, on all
  screen sizes. Entrance fade-up via Framer Motion (respects global reduced-motion).

### Visual craft (impeccable)

Within the existing system (`DESIGN.md`), no new bans: refined type rhythm, soft
layered shadow on the card, focus rings using `--accent` / `--accent-soft`,
comfortable spacing. Solid rose primary (no gradient text). Contrast AA.

## 4. Validation & error handling

Pure helper `validateCredentials(email: string, password: string): string[]`:
- password must be ≥ 6 characters → "Password must be at least 6 characters."
- (email presence is enforced by the `required` + `type=email` input; the helper
  guards password length, the one rule not covered natively.)

Form runs the helper before calling Supabase; if non-empty, shows the first error
and does not call the API. Supabase errors (`error.message`) are shown verbatim but
in the friendly danger style (e.g. "Invalid login credentials", "User already
registered").

## 5. Supabase configuration (operator steps, not code)

Documented in the spec and README; the user performs them:
- **Authentication → URL Configuration → Site URL:** set to the production URL.
- **Redirect URLs:** add `http://localhost:3000/auth/callback` and
  `<prod>/auth/callback`.
- **Authentication → Providers → Email:** keep enabled with **Confirm email ON**.

## 6. Testing

- Unit (Vitest) for `validateCredentials`: passes with a 6+ char password; flags a
  short password; returns an array (length 0 when valid).
- No component test required; existing suite stays green.

## 7. Out of scope (YAGNI)

- Social / OAuth providers.
- Password reset / "forgot password" flow.
- Magic-link (removed).
- Remember-me, rate-limiting UI, password strength meter.
