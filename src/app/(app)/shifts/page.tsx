import { createServerSupabase } from "@/lib/supabase/server";
import { listShifts } from "@/lib/data/shifts";
import { listEmployers } from "@/lib/data/employers";
import { hoursWorked, isoWeekKey } from "@/lib/shifts";
import { WeekGroup } from "@/components/shifts/WeekGroup";
import { EmptyAddState } from "@/components/add/EmptyAddState";
import type { ShiftRow, EmployerRow } from "@/lib/supabase/types";

function weekLabel(key: string, todayKey: string, lastKey: string, sample: string): string {
  if (key === todayKey) return "This week";
  if (key === lastKey) return "Last week";
  // Fall back to the Monday-of-week date for older weeks.
  const d = new Date(`${sample}T00:00:00`);
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `Week of ${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export default async function ShiftsPage() {
  const supabase = await createServerSupabase();
  const [shifts, employers] = await Promise.all([
    listShifts(supabase),
    listEmployers(supabase),
  ]);

  const employersById = new Map<string, EmployerRow>(employers.map((e) => [e.id, e]));

  const todayKey = isoWeekKey(new Date().toISOString().slice(0, 10));
  const lastWeekDate = new Date();
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const lastKey = isoWeekKey(lastWeekDate.toISOString().slice(0, 10));

  // Group shifts (already newest-first) by ISO week, preserving order.
  const groups = new Map<string, ShiftRow[]>();
  for (const s of shifts) {
    const key = isoWeekKey(s.worked_on);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  const thisWeekHours = (groups.get(todayKey) ?? []).reduce((sum, s) => {
    try {
      return sum + hoursWorked(s.clock_in, s.clock_out);
    } catch {
      return sum;
    }
  }, 0);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Shifts</h1>
      <div className="rounded-[var(--radius)] bg-[var(--ink)] p-5 text-white shadow-[var(--shadow)]">
        <p className="text-sm text-white/60">This week</p>
        <p className="mt-1 flex items-baseline gap-1 text-[2.5rem] font-semibold leading-none tracking-tight">
          {Math.round(thisWeekHours * 10) / 10}
          <span className="text-lg font-medium text-white/60">hrs</span>
        </p>
      </div>

      {shifts.length === 0 ? (
        <EmptyAddState
          icon="🕒"
          title="No shifts yet"
          subtitle="Tap the + to write down your first shift."
          actionLabel="Add your first shift"
          mode="shift"
        />
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([key, weekShifts]) => (
            <WeekGroup
              key={key}
              label={weekLabel(key, todayKey, lastKey, weekShifts[0].worked_on)}
              shifts={weekShifts}
              employersById={employersById}
            />
          ))}
        </div>
      )}
    </div>
  );
}
