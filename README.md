# Budget & Shifts

A friendly, mobile-first personal tracker: log money **in/out** against budget
categories, and write down the **job shifts** you work — in one app.

Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**,
**Framer Motion**, and **Supabase** (Postgres, magic-link auth, Row Level Security).

## Features

- **Budget** — categories (Travel, Food, Rent, …) with monthly limits and progress
  bars, a month switcher, and a net in/out summary.
- **Shifts** — clock-in / clock-out per employer, grouped by week with an hours total.
- **Effortless capture** — one `+` button opens a single sheet with an In / Out /
  Shift toggle and smart defaults (today, last-used category/employer, now).
- **Private** — magic-link sign-in; every row is protected by RLS so you only ever
  see your own data.

## Prerequisites

- Node.js 18.18+ (or 20+)
- A free [Supabase](https://supabase.com) project

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Copy the example and fill in your Supabase credentials (Project Settings → API):

   ```bash
   cp .env.local.example .env.local
   ```

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
   ```

3. **Apply the database schema**

   In the Supabase dashboard **SQL Editor**, run
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). It
   creates the tables, enables Row Level Security, and seeds default categories for
   each new user. See [`supabase/README.md`](supabase/README.md) for details.

4. **Enable magic-link auth**

   In **Authentication → Providers → Email**, enable Email, and add
   `http://localhost:3000/auth/callback` under **URL Configuration → Redirect URLs**.

## Develop

```bash
npm run dev      # start the dev server at http://localhost:3000
npm run test     # run the unit/component tests (Vitest)
npm run build    # production build
```

## Project structure

```
src/
  app/                 # routes: (auth)/sign-in, (app)/budget|shifts|settings
  components/          # ui primitives, add sheet, budget/shifts/settings, nav
  lib/                 # pure logic (money, shifts, validation), data layer, supabase
supabase/migrations/   # SQL schema + RLS + seed trigger
tests/                 # Vitest unit + component tests
docs/superpowers/      # design spec + implementation plan
```

The data model and screens are documented in
[`docs/superpowers/specs`](docs/superpowers/specs); the visual system is in
[`DESIGN.md`](DESIGN.md).
