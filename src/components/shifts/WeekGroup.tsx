import { ShiftRow } from "./ShiftRow";
import { hoursWorked } from "@/lib/shifts";
import type { ShiftRow as Shift, EmployerRow } from "@/lib/supabase/types";

export function WeekGroup({
  label,
  shifts,
  employersById,
}: {
  label: string;
  shifts: Shift[];
  employersById: Map<string, EmployerRow>;
}) {
  const total = shifts.reduce((sum, s) => {
    try {
      return sum + hoursWorked(s.clock_in, s.clock_out);
    } catch {
      return sum;
    }
  }, 0);

  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-sm font-semibold">{label}</h2>
        <span className="text-sm text-[var(--muted)]">{Math.round(total * 10) / 10}h</span>
      </div>
      <ul className="space-y-2">
        {shifts.map((s) => (
          <ShiftRow
            key={s.id}
            shift={s}
            employer={s.employer_id ? employersById.get(s.employer_id) : undefined}
          />
        ))}
      </ul>
    </section>
  );
}
