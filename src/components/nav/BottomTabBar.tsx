"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AddButton } from "@/components/add/AddButton";

const leftTabs = [
  { href: "/budget", label: "Budget", icon: "◑" },
  { href: "/shifts", label: "Shifts", icon: "◷" },
] as const;

const rightTabs = [
  { href: "/tasks", label: "Tasks", icon: "✓" },
  { href: "/settings", label: "Settings", icon: "⚙" },
] as const;

function Tab({ href, label, icon }: { href: string; label: string; icon: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs"
      style={{ color: active ? "var(--accent)" : "var(--muted)" }}
    >
      <span className="text-xl leading-none">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

export function BottomTabBar() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md items-center border-t border-[var(--line)] bg-[var(--surface)]/95 px-2 backdrop-blur md:hidden">
      {leftTabs.map((t) => (
        <Tab key={t.href} {...t} />
      ))}
      <div className="flex w-16 shrink-0 justify-center">
        <AddButton />
      </div>
      {rightTabs.map((t) => (
        <Tab key={t.href} {...t} />
      ))}
    </nav>
  );
}
