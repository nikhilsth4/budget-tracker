import type { CategoryKind, Direction } from "@/lib/supabase/types";

type Txn = { amount: number; direction: Direction; category_id: string | null };
type Cat = { id: string; kind: CategoryKind };

/**
 * Per-category amount and overall in/out totals for a month. An expense
 * category's amount counts only `out` transactions; an income category's counts
 * only `in` — so a refund tagged to an expense category doesn't inflate its
 * progress bar (matching the category detail page).
 */
export function summarizeMonth(
  transactions: Txn[],
  categories: Cat[],
): { amountByCategory: Map<string, number>; totalIn: number; totalOut: number } {
  const kindById = new Map(categories.map((c) => [c.id, c.kind]));
  const amountByCategory = new Map<string, number>();
  let totalIn = 0;
  let totalOut = 0;

  for (const t of transactions) {
    if (t.direction === "in") totalIn += t.amount;
    else totalOut += t.amount;

    if (!t.category_id) continue;
    const kind = kindById.get(t.category_id);
    const counts =
      (kind === "income" && t.direction === "in") ||
      (kind !== "income" && t.direction === "out");
    if (counts) {
      amountByCategory.set(
        t.category_id,
        (amountByCategory.get(t.category_id) ?? 0) + t.amount,
      );
    }
  }

  return { amountByCategory, totalIn, totalOut };
}
