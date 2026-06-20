import { describe, it, expect } from "vitest";
import {
  filterShifts,
  sortShifts,
  summarizeShifts,
  paginate,
} from "@/lib/shiftFilters";
import type { ShiftRow, EmployerRow } from "@/lib/supabase/types";

const emp = (id: string, name: string): EmployerRow => ({
  id, name, color: "#000", user_id: "u", created_at: "",
});
const employersById = new Map([
  ["e1", emp("e1", "Cafe")],
  ["e2", emp("e2", "Diner")],
]);

const shift = (over: Partial<ShiftRow>): ShiftRow => ({
  id: Math.random().toString(),
  user_id: "u",
  employer_id: "e1",
  shift_type: null,
  clock_in: "2026-06-17T09:00:00Z",
  clock_out: "2026-06-17T17:00:00Z", // 8h
  pay: null,
  note: null,
  worked_on: "2026-06-17",
  created_at: "",
  ...over,
});

const base = {
  employerId: null, from: null, to: null, search: "", employersById,
};

describe("filterShifts", () => {
  it("filters by employer id", () => {
    const rows = [shift({ employer_id: "e1" }), shift({ employer_id: "e2" })];
    expect(filterShifts(rows, { ...base, employerId: "e2" })).toHaveLength(1);
  });
  it("filters by inclusive date range", () => {
    const rows = [
      shift({ worked_on: "2026-06-01" }),
      shift({ worked_on: "2026-06-17" }),
      shift({ worked_on: "2026-07-01" }),
    ];
    const out = filterShifts(rows, { ...base, from: "2026-06-01", to: "2026-06-30" });
    expect(out).toHaveLength(2);
  });
  it("treats null bounds as open", () => {
    const rows = [shift({ worked_on: "2020-01-01" }), shift({ worked_on: "2030-01-01" })];
    expect(filterShifts(rows, base)).toHaveLength(2);
  });
  it("searches employer name, type, and note (case-insensitive)", () => {
    const rows = [
      shift({ employer_id: "e1" }),                  // "Cafe"
      shift({ employer_id: "e2", shift_type: "Night" }),
      shift({ employer_id: "e2", note: "covered for Sam" }),
    ];
    expect(filterShifts(rows, { ...base, search: "cafe" })).toHaveLength(1);
    expect(filterShifts(rows, { ...base, search: "night" })).toHaveLength(1);
    expect(filterShifts(rows, { ...base, search: "SAM" })).toHaveLength(1);
  });
});

describe("sortShifts", () => {
  it("sorts by date asc and desc", () => {
    const rows = [shift({ worked_on: "2026-06-01" }), shift({ worked_on: "2026-06-20" })];
    expect(sortShifts(rows, "date", "asc")[0].worked_on).toBe("2026-06-01");
    expect(sortShifts(rows, "date", "desc")[0].worked_on).toBe("2026-06-20");
  });
  it("sorts by hours", () => {
    const rows = [
      shift({ clock_in: "2026-06-17T09:00:00Z", clock_out: "2026-06-17T12:00:00Z" }), // 3h
      shift({ clock_in: "2026-06-17T09:00:00Z", clock_out: "2026-06-17T19:00:00Z" }), // 10h
    ];
    expect(sortShifts(rows, "hours", "desc")[0].clock_out).toBe("2026-06-17T19:00:00Z");
  });
  it("sorts by pay treating null as 0", () => {
    const rows = [shift({ pay: 50 }), shift({ pay: null }), shift({ pay: 120 })];
    expect(sortShifts(rows, "pay", "desc").map((s) => s.pay)).toEqual([120, 50, null]);
  });
});

describe("summarizeShifts", () => {
  it("counts, sums hours (1 dp), and sums non-null pay", () => {
    const rows = [
      shift({ clock_in: "2026-06-17T09:00:00Z", clock_out: "2026-06-17T17:30:00Z", pay: 100 }), // 8.5h
      shift({ clock_in: "2026-06-18T09:00:00Z", clock_out: "2026-06-18T12:00:00Z", pay: null }), // 3h
    ];
    expect(summarizeShifts(rows)).toEqual({ count: 2, hours: 11.5, pay: 100 });
  });
});

describe("paginate", () => {
  it("slices the right page", () => {
    expect(paginate([1, 2, 3, 4, 5], 1, 2)).toEqual([1, 2]);
    expect(paginate([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
    expect(paginate([1, 2, 3, 4, 5], 3, 2)).toEqual([5]);
  });
});
