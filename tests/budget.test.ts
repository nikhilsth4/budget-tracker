import { describe, it, expect } from "vitest";
import { summarizeMonth } from "@/lib/budget";

const categories = [
  { id: "exp", kind: "expense" as const },
  { id: "inc", kind: "income" as const },
];

describe("summarizeMonth", () => {
  it("counts only 'out' toward an expense category's amount", () => {
    const { amountByCategory } = summarizeMonth(
      [
        { amount: 30, direction: "out", category_id: "exp" },
        { amount: 100, direction: "in", category_id: "exp" }, // refund tagged to expense
      ],
      categories,
    );
    expect(amountByCategory.get("exp")).toBe(30);
  });

  it("counts only 'in' toward an income category's amount", () => {
    const { amountByCategory } = summarizeMonth(
      [
        { amount: 200, direction: "in", category_id: "inc" },
        { amount: 5, direction: "out", category_id: "inc" },
      ],
      categories,
    );
    expect(amountByCategory.get("inc")).toBe(200);
  });

  it("totals in and out across all transactions", () => {
    const { totalIn, totalOut } = summarizeMonth(
      [
        { amount: 200, direction: "in", category_id: "inc" },
        { amount: 30, direction: "out", category_id: "exp" },
        { amount: 20, direction: "out", category_id: null },
      ],
      categories,
    );
    expect(totalIn).toBe(200);
    expect(totalOut).toBe(50);
  });
});
