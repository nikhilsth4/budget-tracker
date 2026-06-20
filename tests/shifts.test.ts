import { describe, it, expect } from "vitest";
import { hoursWorked, isoWeekKey } from "@/lib/shifts";

describe("hoursWorked", () => {
  it("computes decimal hours", () => {
    expect(hoursWorked("2026-06-19T09:00:00Z", "2026-06-19T17:30:00Z")).toBe(8.5);
  });
  it("throws when out before in", () => {
    expect(() => hoursWorked("2026-06-19T17:00:00Z", "2026-06-19T09:00:00Z")).toThrow();
  });
});

describe("isoWeekKey", () => {
  it("returns the ISO week key for a date", () => {
    expect(isoWeekKey("2026-06-19")).toBe("2026-W25");
  });
  it("groups days in the same week together", () => {
    // Mon 2026-06-15 .. Sun 2026-06-21 are all ISO week 25
    expect(isoWeekKey("2026-06-15")).toBe(isoWeekKey("2026-06-21"));
  });
});
