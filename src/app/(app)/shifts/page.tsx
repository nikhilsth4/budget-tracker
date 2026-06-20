import { createServerSupabase } from "@/lib/supabase/server";
import { listShifts } from "@/lib/data/shifts";
import { listEmployers } from "@/lib/data/employers";
import { ShiftsView } from "@/components/shifts/ShiftsView";

export default async function ShiftsPage() {
  const supabase = await createServerSupabase();
  const [shifts, employers] = await Promise.all([
    listShifts(supabase),
    listEmployers(supabase),
  ]);
  return <ShiftsView shifts={shifts} employers={employers} />;
}
