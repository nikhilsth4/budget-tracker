# Design System

**Direction:** "Friendly money companion." A confident rose carries the brand on a
clean white canvas — the personality lives in color + type, not a tinted background
(deliberately avoiding the cream/sand AI default). Rounded, soft-shadowed surfaces;
warm but accessible.

## Color (verified contrast)

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--bg` / `--surface` | `#ffffff` | page + cards | — |
| `--surface-2` | `#fdf2f6` | chips, inset wells | — |
| `--ink` | `#1f1a1d` | primary text, dark hero | 17:1 on white |
| `--muted` | `#6b5b63` | secondary text | 6.4:1 |
| `--accent` | `#be185d` | brand rose — CTAs, active nav, progress, selected | 6:1 (text both ways) |
| `--accent-bright` | `#ec4899` | decorative only (FAB/glow gradients, large fills) | 3.5:1 (large only) |
| `--accent-soft` | `#fce7f0` | soft fills, focus rings | — |
| `--ok` | `#047857` | income amounts | 5.5:1 |
| `--danger` | `#c62828` | errors, destructive | 5.6:1 |
| `--hero` | rose→plum gradient | budget net summary | white text 6:1+ |

All foreground/background pairs meet WCAG AA: ≥4.5:1 small text, ≥3:1 large.

## Type

Single family (**Geist Sans**) across weights — no second font. `h1–h3` use
`text-wrap: balance` and `-0.02em` tracking; body uses `text-wrap: pretty`.
Hero numbers `2.5rem` semibold, leading-none.

## Surfaces & spacing

White cards on white, separated by `--shadow` (soft, layered) plus hairline
`--line`. Radius `--radius` (1.15rem).

## Responsive (mobile-first, adapts at `md` = 768px)

The experience is rethought per context, not scaled:

- **Mobile (<768px):** single `max-w-md` column; **bottom tab bar** nav with a
  raised gradient FAB; capture opens as a **bottom sheet**.
- **Tablet/desktop (≥768px):** a sticky **top bar** (`TopBar`) with the wordmark,
  links with an animated active underline, and an inline "+ Add"; the bottom bar is
  hidden. Content widens to `max-w-6xl` and centers (never stretches to 4K). Budget
  categories flow into a `1 → 2 → 3`-column grid; the net summary goes horizontal.
  **Shifts** become a filterable, paginated **data table** (Date · Employer · Type ·
  In · Out · Hours · Pay), with tabular figures, a sticky header, and sortable
  Date/Hours/Pay columns; on mobile the same filtered/paginated data renders as
  cards. Settings and the transaction detail stay in a readable `max-w-2xl` column.
  Capture opens as a **centered modal** (`Sheet` swaps bottom-sheet ↔ modal via
  `useMediaQuery`).
- Hover lifts are gated to `md:` (pointer-fine); touch uses `active:` feedback.
  `viewport-fit=cover` + `env(safe-area-inset)` handle notches.

## Motion

Framer Motion: sheet slide-up (spring), staggered list entrances (`Stagger`),
progress-bar fills, toast pop. Eased with `[0.22,1,0.36,1]` (ease-out-quint feel),
no bounce. Global `prefers-reduced-motion` guard collapses all motion to instant.

## Z-index scale

`--z-nav: 30` → `--z-backdrop: 40` → `--z-sheet: 50` → `--z-toast: 60`.
