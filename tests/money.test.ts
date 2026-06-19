import { describe, it, expect } from "vitest";
import { formatMoney, categoryProgress } from "@/lib/money";

describe("formatMoney", () => {
  it("formats USD", () => {
    expect(formatMoney(240, "USD", "en-US")).toBe("$240.00");
  });
});

describe("categoryProgress", () => {
  it("computes percent under limit", () => {
    expect(categoryProgress(240, 400)).toEqual({ pct: 60, over: false });
  });
  it("clamps and flags over limit", () => {
    expect(categoryProgress(500, 400)).toEqual({ pct: 100, over: true });
  });
  it("handles null limit", () => {
    expect(categoryProgress(100, null)).toEqual({ pct: 0, over: false });
  });
});
