import type { SupabaseClient } from "@supabase/supabase-js";
import type { ShiftRow } from "@/lib/supabase/types";

export async function listShifts(sb: SupabaseClient): Promise<ShiftRow[]> {
  const { data, error } = await sb
    .from("shifts")
    .select("*")
    .order("worked_on", { ascending: false });
  if (error) throw error;
  return data as ShiftRow[];
}

export async function createShift(
  sb: SupabaseClient,
  input: Pick<
    ShiftRow,
    "employer_id" | "shift_type" | "clock_in" | "clock_out" | "pay" | "note" | "worked_on"
  >,
): Promise<ShiftRow> {
  const { data, error } = await sb.from("shifts").insert(input).select().single();
  if (error) throw error;
  return data as ShiftRow;
}

export async function updateShift(
  sb: SupabaseClient,
  id: string,
  patch: Partial<
    Pick<
      ShiftRow,
      "employer_id" | "shift_type" | "clock_in" | "clock_out" | "pay" | "note" | "worked_on"
    >
  >,
): Promise<void> {
  const { error } = await sb.from("shifts").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteShift(sb: SupabaseClient, id: string): Promise<void> {
  const { error } = await sb.from("shifts").delete().eq("id", id);
  if (error) throw error;
}
