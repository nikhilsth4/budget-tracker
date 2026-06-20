export function hoursWorked(clockIn: string, clockOut: string): number {
  const start = new Date(clockIn).getTime();
  const end = new Date(clockOut).getTime();
  if (end <= start) throw new Error("clock_out must be after clock_in");
  return Math.round(((end - start) / 3_600_000) * 100) / 100;
}

/**
 * Stable key for the ISO week that contains `date` (a YYYY-MM-DD string or any
 * Date-parseable value). Returns e.g. "2026-W25". Weeks start Monday.
 */
export function isoWeekKey(date: string): string {
  const d = new Date(date);
  // Operate entirely in UTC: a YYYY-MM-DD string parses to UTC midnight, so use
  // UTC getters to avoid the local-timezone offset shifting the day.
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (target.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  target.setUTCDate(target.getUTCDate() - dayNum + 3); // Thursday of this week
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week =
    1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
