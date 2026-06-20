import type { SupabaseClient } from "@supabase/supabase-js";
import type { TransactionRow } from "@/lib/supabase/types";

/** opts.month is "YYYY-MM". Returns that calendar month's transactions, newest first. */
export async function listTransactions(
  sb: SupabaseClient,
  opts: { month: string },
): Promise<TransactionRow[]> {
  const start = `${opts.month}-01`;
  const startDate = new Date(`${start}T00:00:00Z`);
  const end = new Date(
    Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 1),
  )
    .toISOString()
    .slice(0, 10);
  const { data, error } = await sb
    .from("transactions")
    .select("*")
    .gte("occurred_at", start)
    .lt("occurred_at", end)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return data as TransactionRow[];
}

export async function listByCategory(
  sb: SupabaseClient,
  categoryId: string,
): Promise<TransactionRow[]> {
  const { data, error } = await sb
    .from("transactions")
    .select("*")
    .eq("category_id", categoryId)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return data as TransactionRow[];
}

export async function createTransaction(
  sb: SupabaseClient,
  input: Pick<
    TransactionRow,
    "category_id" | "amount" | "direction" | "note" | "occurred_at"
  >,
): Promise<TransactionRow> {
  const { data, error } = await sb.from("transactions").insert(input).select().single();
  if (error) throw error;
  return data as TransactionRow;
}

export async function deleteTransaction(sb: SupabaseClient, id: string): Promise<void> {
  const { error } = await sb.from("transactions").delete().eq("id", id);
  if (error) throw error;
}
