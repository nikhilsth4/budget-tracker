export function hoursWorked(clockIn: string, clockOut: string): number {
  const start = new Date(clockIn).getTime();
  const end = new Date(clockOut).getTime();
  if (end <= start) throw new Error("clock_out must be after clock_in");
  return Math.round(((end - start) / 3_600_000) * 100) / 100;
}
