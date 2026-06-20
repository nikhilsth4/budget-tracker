import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoryRow } from "@/lib/supabase/types";

export async function listCategories(sb: SupabaseClient): Promise<CategoryRow[]> {
  const { data, error } = await sb.from("categories").select("*").order("created_at");
  if (error) throw error;
  return data as CategoryRow[];
}

export async function createCategory(
  sb: SupabaseClient,
  input: Pick<CategoryRow, "name" | "icon" | "color" | "kind"> & {
    monthly_limit?: number | null;
  },
): Promise<CategoryRow> {
  const { data, error } = await sb.from("categories").insert(input).select().single();
  if (error) throw error;
  return data as CategoryRow;
}

export async function updateCategory(
  sb: SupabaseClient,
  id: string,
  patch: Partial<CategoryRow>,
): Promise<void> {
  const { error } = await sb.from("categories").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteCategory(sb: SupabaseClient, id: string): Promise<void> {
  const { error } = await sb.from("categories").delete().eq("id", id);
  if (error) throw error;
}
