# Budget & Shift Tracker — Design Spec

**Date:** 2026-06-19
**Status:** Approved design (pending spec review)

## 1. Overview

A friendly, mobile-first personal app that unifies two trackers in one Next.js
application sharing a single design language:

- **Budget tracker** — log money in/out against categories with monthly limits and
  progress bars.
- **Shift tracker** — quickly "write down" job shifts (clock in / clock out) per
  employer.

The two sections are **independent**: shifts do not auto-create budget income. The
guiding principle throughout is **effortless capture** — the fewest taps possible,
with smart defaults filling everything they can.

## 2. Stack

- **Next.js (latest, App Router)** + **TypeScript**
- **Tailwind CSS** for styling, **Framer Motion** for animation
- **Supabase** — Postgres database, Auth (email magic-link), Row Level Security
- **Design** guided by the `impeccable` skill: custom palette, typography, motion,
  friendly empty states
- **Mobile-first**: bottom tab bar, thumb-reachable actions, full-width cards;
  scales up gracefully on desktop

## 3. Data Model (Supabase)

All tables enforce Row Level Security: `user_id = auth.uid()`.

### `categories`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid | FK auth.users |
| name | text | e.g. "Travel" |
| icon | text | icon key |
| color | text | hex/token |
| monthly_limit | numeric | nullable; powers progress bars |
| kind | text | `expense` \| `income` |

Seeded on signup: Travel, Food & Dining, Groceries, Rent/Housing, Transport,
Shopping, Bills & Utilities, Entertainment, Health, Income. User can add/edit/delete.

### `transactions`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid | |
| category_id | uuid | FK categories |
| amount | numeric | |
| direction | text | `in` \| `out` |
| note | text | "what it was for" |
| occurred_at | date | defaults to today |
| created_at | timestamptz | |

### `employers`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid | |
| name | text | |
| color | text | |

### `shifts`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid | |
| employer_id | uuid | FK employers |
| shift_type | text | free text w/ suggestions (Morning/Evening/role) |
| clock_in | timestamptz | |
| clock_out | timestamptz | |
| pay | numeric | optional |
| note | text | optional |
| worked_on | date | defaults to today |

Hours worked = `clock_out - clock_in`, computed on the fly (no stored break field).

## 4. Screens & Flow

- **Budget tab** — month switcher; "balance this month" summary (in vs out);
  category cards with progress bars (`Travel $240 / $400`). Tap category → its
  transactions.
- **Shifts tab** — list grouped by week; each row: day · employer · type · in→out ·
  hours. "This week: 23h" summary at top.
- **Add (center +)** — one sheet with an **In / Out / Shift** toggle:
  - Transaction: amount → in/out → category → date → note → save.
  - Shift: employer → in → out → (optional pay/note) → save.
- **Settings** — manage categories (name/icon/color/limit), employers, account/logout.
- **Auth** — magic-link sign-in; all data private per RLS.
- **Motion** — sheet slide-ups, progress-bar fills, tab transitions, list entrances.

## 5. Effortless Capture Principles

- One `+` button, one sheet, In/Out/Shift toggle — same muscle memory for all three.
- Smart defaults: date = today, employer = last used, category = last used,
  time-in = now. Happy path = type one number (or two times) and save.
- Big tap targets; numeric keypad opens automatically for amounts.
- Optional fields collapsed behind a small "+ note / more".
- No dead ends: friendly empty states with one clear action.

## 6. Error Handling

- Form validation inline (amount required & numeric; clock_out after clock_in).
- Supabase errors surfaced as friendly toasts with retry.
- Optimistic UI for adds; rollback on failure.
- Auth-gated routes redirect to sign-in when no session.

## 7. Testing

- Unit: hours/pay computation, category progress math, form validation.
- Component: Add sheet defaults & toggle behavior.
- RLS sanity: a user cannot read another user's rows.

## 8. Out of Scope (YAGNI)

- Automatic shift→income linkage
- Unpaid break tracking
- Overtime/tips/multiple pay rates
- Recurring transactions, multiple accounts, envelope rollover
- Multi-user sharing
