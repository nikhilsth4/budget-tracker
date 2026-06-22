export function StreakChip({ streak }: { streak: number }) {
  if (streak <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-sm font-semibold text-[var(--accent)]">
      🔥 {streak} day streak
    </span>
  );
}
