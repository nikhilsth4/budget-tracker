import { formatMoney } from "@/lib/money";

export function BalanceSummary({ totalIn, totalOut }: { totalIn: number; totalOut: number }) {
  const net = totalIn - totalOut;
  return (
    <div className="rounded-2xl bg-[var(--ink)] p-5 text-white shadow-[var(--shadow)]">
      <p className="text-sm text-white/60">Net this month</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">
        {net >= 0 ? "" : "−"}
        {formatMoney(Math.abs(net))}
      </p>
      <div className="mt-4 flex gap-6 text-sm">
        <div>
          <span className="text-white/60">In </span>
          <span className="font-medium text-[var(--ok)]">{formatMoney(totalIn)}</span>
        </div>
        <div>
          <span className="text-white/60">Out </span>
          <span className="font-medium">{formatMoney(totalOut)}</span>
        </div>
      </div>
    </div>
  );
}
