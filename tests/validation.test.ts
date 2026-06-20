import { describe, it, expect } from "vitest";
import { validateTransaction, validateShift } from "@/lib/validation";

describe("validateTransaction", () => {
  it("passes a valid transaction", () => {
    expect(validateTransaction({ amount: "12.50", categoryId: "c1" })).toEqual([]);
  });
  it("flags missing amount and category", () => {
    expect(validateTransaction({ amount: "", categoryId: null })).toHaveLength(2);
  });
  it("flags non-numeric amount", () => {
    expect(validateTransaction({ amount: "abc", categoryId: "c1" })).toHaveLength(1);
  });
});

describe("validateShift", () => {
  it("passes a valid shift", () => {
    expect(
      validateShift({ employerId: "e1", clockIn: "2026-06-19T09:00", clockOut: "2026-06-19T17:00" }),
    ).toEqual([]);
  });
  it("flags out before in", () => {
    expect(
      validateShift({ employerId: "e1", clockIn: "2026-06-19T17:00", clockOut: "2026-06-19T09:00" }),
    ).toHaveLength(1);
  });
});
