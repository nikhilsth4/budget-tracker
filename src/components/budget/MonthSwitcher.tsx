"use client";

import { useRouter } from "next/navigation";

function shift(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function label(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function MonthSwitcher({ month }: { month: string }) {
  const router = useRouter();
  const go = (m: string) => router.push(`/budget?month=${m}`);

  return (
    <div className="flex items-center justify-between">
      <button
        onClick={() => go(shift(month, -1))}
        aria-label="Previous month"
        className="grid h-9 w-9 place-items-center rounded-full text-[var(--muted)] transition hover:bg-black/5"
      >
        ‹
      </button>
      <span className="text-sm font-semibold">{label(month)}</span>
      <button
        onClick={() => go(shift(month, 1))}
        aria-label="Next month"
        className="grid h-9 w-9 place-items-center rounded-full text-[var(--muted)] transition hover:bg-black/5"
      >
        ›
      </button>
    </div>
  );
}
