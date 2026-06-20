import Link from "next/link";
import { categoryProgress, formatMoney } from "@/lib/money";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { CategoryRow } from "@/lib/supabase/types";

export function CategoryCard({
  category,
  amount,
}: {
  category: CategoryRow;
  /** For expense categories this is spent; for income it's received. */
  amount: number;
}) {
  const isIncome = category.kind === "income";
  const { pct, over } = categoryProgress(amount, category.monthly_limit);

  return (
    <Link
      href={`/budget/${category.id}`}
      className="block h-full rounded-2xl bg-[var(--surface)] p-4 shadow-[var(--shadow)] transition active:scale-[0.99] md:hover:-translate-y-0.5 md:hover:shadow-[0_4px_8px_rgba(31,26,29,0.08),0_16px_40px_-16px_rgba(31,26,29,0.25)]"
    >
      <div className="flex items-center gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-semibold text-white"
          style={{ background: category.color }}
        >
          {category.name.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{category.name}</p>
          <p className="text-sm text-[var(--muted)]">
            {isIncome ? (
              <>received {formatMoney(amount)}</>
            ) : category.monthly_limit ? (
              <>
                {formatMoney(amount)} / {formatMoney(category.monthly_limit)}
              </>
            ) : (
              <>{formatMoney(amount)} spent</>
            )}
          </p>
        </div>
        {over && (
          <span className="rounded-full bg-[var(--danger)]/10 px-2 py-0.5 text-xs font-medium text-[var(--danger)]">
            over
          </span>
        )}
      </div>
      {!isIncome && category.monthly_limit ? (
        <div className="mt-3">
          <ProgressBar value={pct} over={over} color={category.color} />
        </div>
      ) : null}
    </Link>
  );
}
