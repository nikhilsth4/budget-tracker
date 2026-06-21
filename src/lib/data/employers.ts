import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmployerRow } from "@/lib/supabase/types";

export async function listEmployers(sb: SupabaseClient): Promise<EmployerRow[]> {
  const { data, error } = await sb.from("employers").select("*").order("created_at");
  if (error) throw error;
  return data as EmployerRow[];
}

export async function createEmployer(
  sb: SupabaseClient,
  name: string,
  color = "#6366F1",
): Promise<EmployerRow> {
  const { data, error } = await sb
    .from("employers")
    .insert({ name, color })
    .select()
    .single();
  if (error) throw error;
  return data as EmployerRow;
}

export async function updateEmployer(
  sb: SupabaseClient,
  id: string,
  patch: Partial<Pick<EmployerRow, "name" | "color">>,
): Promise<void> {
  const { error } = await sb.from("employers").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteEmployer(sb: SupabaseClient, id: string): Promise<void> {
  const { error } = await sb.from("employers").delete().eq("id", id);
  if (error) throw error;
}
