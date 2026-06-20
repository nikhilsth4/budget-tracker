import { createServerSupabase } from "@/lib/supabase/server";
import { listCategories } from "@/lib/data/categories";
import { listTransactions } from "@/lib/data/transactions";
import { summarizeMonth } from "@/lib/budget";
import { MonthSwitcher } from "@/components/budget/MonthSwitcher";
import { BalanceSummary } from "@/components/budget/BalanceSummary";
import { CategoryCard } from "@/components/budget/CategoryCard";
import { EmptyAddState } from "@/components/add/EmptyAddState";
import { Stagger } from "@/components/ui/Stagger";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(monthParam ?? "") ? monthParam! : currentMonth();

  const supabase = await createServerSupabase();
  const [categories, transactions] = await Promise.all([
    listCategories(supabase),
    listTransactions(supabase, { month }),
  ]);

  const { amountByCategory, totalIn, totalOut } = summarizeMonth(transactions, categories);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
      </div>
      <MonthSwitcher month={month} />
      <BalanceSummary totalIn={totalIn} totalOut={totalOut} />

      {transactions.length === 0 ? (
        <EmptyAddState
          icon="🪙"
          title="No spending logged yet"
          subtitle="Tap the + to add your first transaction for this month."
          actionLabel="Add a transaction"
          mode="out"
        />
      ) : (
        <Stagger className="space-y-2.5">
          {categories.map((c) => (
            <CategoryCard key={c.id} category={c} amount={amountByCategory.get(c.id) ?? 0} />
          ))}
        </Stagger>
      )}
    </div>
  );
}
