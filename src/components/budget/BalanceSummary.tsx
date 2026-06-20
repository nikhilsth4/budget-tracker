import { formatMoney } from "@/lib/money";

export function BalanceSummary({ totalIn, totalOut }: { totalIn: number; totalOut: number }) {
  const net = totalIn - totalOut;
  return (
    <div className="hero-surface relative overflow-hidden rounded-[var(--radius)] p-5 shadow-[var(--shadow)] md:flex md:items-center md:justify-between md:p-7">
      <div>
        <p className="text-sm text-white/70">Net this month</p>
        <p className="mt-1 text-[2.5rem] font-semibold leading-none tracking-tight md:text-5xl">
          {net >= 0 ? "" : "−"}
          {formatMoney(Math.abs(net))}
        </p>
      </div>
      <div className="mt-5 flex gap-3 md:mt-0 md:w-72">
        <div className="flex-1 rounded-xl bg-white/12 px-3 py-2 backdrop-blur-sm">
          <span className="block text-xs text-white/70">In</span>
          <span className="font-semibold text-white">{formatMoney(totalIn)}</span>
        </div>
        <div className="flex-1 rounded-xl bg-white/12 px-3 py-2 backdrop-blur-sm">
          <span className="block text-xs text-white/70">Out</span>
          <span className="font-semibold text-white">{formatMoney(totalOut)}</span>
        </div>
      </div>
    </div>
  );
}
