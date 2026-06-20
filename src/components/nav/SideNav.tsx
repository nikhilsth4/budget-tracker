"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAddSheet } from "@/components/add/AddSheetContext";

const links = [
  { href: "/budget", label: "Budget", icon: "◑" },
  { href: "/shifts", label: "Shifts", icon: "◷" },
  { href: "/settings", label: "Settings", icon: "⚙" },
] as const;

export function SideNav() {
  const pathname = usePathname();
  const { open } = useAddSheet();

  return (
    <aside className="hidden shrink-0 md:flex md:w-60 lg:w-64">
      <div className="safe-bottom sticky top-0 flex h-dvh w-full flex-col gap-1 border-r border-[var(--line)] px-4 py-6">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <span
            className="grid h-9 w-9 place-items-center rounded-xl text-lg text-white"
            style={{ background: "linear-gradient(135deg, var(--accent-bright), var(--accent))" }}
          >
            ◐
          </span>
          <span className="font-semibold tracking-tight">Budget &amp; Shifts</span>
        </div>

        <nav className="flex flex-col gap-1">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
                style={{
                  background: active ? "var(--accent-soft)" : "transparent",
                  color: active ? "var(--accent)" : "var(--ink)",
                }}
              >
                <span className="text-lg leading-none">{l.icon}</span>
                {l.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => open()}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(190,24,93,0.6)] transition active:scale-[0.99]"
        >
          <span className="text-lg leading-none">+</span> Add
        </button>
      </div>
    </aside>
  );
}
