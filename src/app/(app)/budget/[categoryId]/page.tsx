import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { listByCategory } from "@/lib/data/transactions";
import { categoryProgress, formatMoney } from "@/lib/money";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TransactionList } from "@/components/budget/TransactionList";
import { EmptyAddState } from "@/components/add/EmptyAddState";
import type { CategoryRow } from "@/lib/supabase/types";

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  const supabase = await createServerSupabase();

  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("id", categoryId)
    .single<CategoryRow>();
  if (!category) notFound();

  const transactions = await listByCategory(supabase, categoryId);
  const spent = transactions.reduce(
    (sum, t) => sum + (t.direction === "out" ? t.amount : 0),
    0,
  );
  const received = transactions.reduce(
    (sum, t) => sum + (t.direction === "in" ? t.amount : 0),
    0,
  );
  const isIncome = category.kind === "income";
  const { pct, over } = categoryProgress(spent, category.monthly_limit);

  return (
    <div className="max-w-2xl space-y-5">
      <Link href="/budget" className="text-sm text-[var(--muted)]">
        ‹ Budget
      </Link>

      <header className="rounded-2xl bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 place-items-center rounded-xl font-semibold text-white"
            style={{ background: category.color }}
          >
            {category.name.slice(0, 1)}
          </span>
          <div>
            <h1 className="font-semibold">{category.name}</h1>
            <p className="text-sm text-[var(--muted)]">
              {isIncome
                ? `received ${formatMoney(received)}`
                : category.monthly_limit
                  ? `${formatMoney(spent)} / ${formatMoney(category.monthly_limit)}`
                  : `${formatMoney(spent)} spent`}
            </p>
          </div>
        </div>
        {!isIncome && category.monthly_limit ? (
          <div className="mt-4">
            <ProgressBar value={pct} over={over} color={category.color} />
          </div>
        ) : null}
      </header>

      {transactions.length === 0 ? (
        <EmptyAddState
          icon="🧾"
          title="Nothing here yet"
          subtitle={`Add a ${isIncome ? "deposit" : "purchase"} to ${category.name}.`}
          actionLabel="Add one"
          mode={isIncome ? "in" : "out"}
        />
      ) : (
        <TransactionList transactions={transactions} />
      )}
    </div>
  );
}
