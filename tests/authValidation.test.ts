import { describe, it, expect } from "vitest";
import { validateCredentials } from "@/lib/authValidation";

describe("validateCredentials", () => {
  it("passes with a valid email and 6+ char password", () => {
    expect(validateCredentials("a@b.com", "secret")).toEqual([]);
  });
  it("flags a short password", () => {
    expect(validateCredentials("a@b.com", "abc")).toEqual([
      "Password must be at least 6 characters.",
    ]);
  });
  it("flags a blank email", () => {
    expect(validateCredentials("  ", "secret")).toContain("Enter your email.");
  });
});
