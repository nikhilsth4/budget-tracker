import { describe, it, expect } from "vitest";
import { hoursWorked } from "@/lib/shifts";

describe("hoursWorked", () => {
  it("computes decimal hours", () => {
    expect(hoursWorked("2026-06-19T09:00:00Z", "2026-06-19T17:30:00Z")).toBe(8.5);
  });
  it("throws when out before in", () => {
    expect(() => hoursWorked("2026-06-19T17:00:00Z", "2026-06-19T09:00:00Z")).toThrow();
  });
});
