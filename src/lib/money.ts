export function formatMoney(amount: number, currency = "USD", locale = "en-US"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

export function categoryProgress(
  spent: number,
  limit: number | null,
): { pct: number; over: boolean } {
  if (limit === null || limit <= 0) return { pct: 0, over: false };
  const raw = (spent / limit) * 100;
  return { pct: Math.min(100, Math.max(0, raw)), over: spent > limit };
}
