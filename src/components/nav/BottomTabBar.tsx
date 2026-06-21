"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AddButton } from "@/components/add/AddButton";
import { useToast } from "@/components/ui/Toast";

const leftTabs = [
  { href: "/budget", label: "Budget", icon: "◑" },
  { href: "/shifts", label: "Shifts", icon: "◷" },
] as const;

const rightTabs = [{ href: "/settings", label: "Settings", icon: "⚙" }] as const;

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

function ComingSoonTab({ label, icon }: { label: string; icon: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() => toast.show(`${label} — coming soon`)}
      className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-[var(--muted)]"
    >
      <span className="relative text-xl leading-none">
        {icon}
        <span className="absolute -right-1.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
      </span>
      <span className="font-medium">{label}</span>
    </button>
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
      <ComingSoonTab label="Reports" icon="▦" />
      {rightTabs.map((t) => (
        <Tab key={t.href} {...t} />
      ))}
    </nav>
  );
}
