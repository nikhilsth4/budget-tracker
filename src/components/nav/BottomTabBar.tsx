"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AddButton } from "@/components/add/AddButton";

const tabs = [
  { href: "/budget", label: "Budget", icon: "◑" },
  { href: "/shifts", label: "Shifts", icon: "◷" },
] as const;

const endTabs = [{ href: "/settings", label: "Settings", icon: "⚙" }] as const;

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
      {tabs.map((t) => (
        <Tab key={t.href} {...t} />
      ))}
      <div className="flex flex-1 justify-center">
        <AddButton />
      </div>
      {endTabs.map((t) => (
        <Tab key={t.href} {...t} />
      ))}
    </nav>
  );
}
