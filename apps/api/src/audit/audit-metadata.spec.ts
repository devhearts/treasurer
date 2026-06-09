import { msisdnLast4, sanitizeAuditMetadata } from "./audit-metadata";

describe("sanitizeAuditMetadata", () => {
  it("removes sensitive keys", () => {
    const out = sanitizeAuditMetadata({
      userId: "u1",
      password: "secret",
      token: "tok",
      otp: "123456",
    });
    expect(out).toEqual({ userId: "u1" });
  });

  it("truncates long string values", () => {
    const out = sanitizeAuditMetadata({ note: "a".repeat(600) });
    expect(out?.note).toMatch(/…$/);
    expect(String(out?.note).length).toBeLessThanOrEqual(501);
  });

  it("returns undefined for empty object after sanitization", () => {
    expect(sanitizeAuditMetadata({ password: "x" })).toBeUndefined();
  });
});

describe("msisdnLast4", () => {
  it("returns last four digits", () => {
    expect(msisdnLast4("256771234567")).toBe("4567");
  });

  it("handles short numbers", () => {
    expect(msisdnLast4("123")).toBe("123");
  });
});
