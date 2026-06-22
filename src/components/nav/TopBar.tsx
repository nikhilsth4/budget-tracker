"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAddSheet } from "@/components/add/AddSheetContext";

const links = [
  { href: "/budget", label: "Budget" },
  { href: "/shifts", label: "Shifts" },
  { href: "/tasks", label: "Tasks" },
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
                <span
                  className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-[var(--accent)] transition-transform duration-200 ease-out"
                  style={{ transform: active ? "scaleX(1)" : "scaleX(0)", transformOrigin: "left" }}
                />
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
