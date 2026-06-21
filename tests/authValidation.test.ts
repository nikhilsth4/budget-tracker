import { describe, it, expect } from "vitest";
import { validateCredentials, validatePassword } from "@/lib/authValidation";

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
  it("passes when confirm matches", () => {
    expect(validateCredentials("a@b.com", "secret", "secret")).toEqual([]);
  });
  it("flags a mismatched confirm", () => {
    expect(validateCredentials("a@b.com", "secret", "secrex")).toContain(
      "Passwords don't match.",
    );
  });
});

describe("validatePassword", () => {
  it("passes with a 6+ char password and matching confirm", () => {
    expect(validatePassword("secret", "secret")).toEqual([]);
  });
  it("flags a short password", () => {
    expect(validatePassword("abc")).toEqual([
      "Password must be at least 6 characters.",
    ]);
  });
  it("flags a mismatched confirm", () => {
    expect(validatePassword("secret", "nope")).toContain("Passwords don't match.");
  });
  it("skips the match check when confirm is omitted", () => {
    expect(validatePassword("secret")).toEqual([]);
  });
});
