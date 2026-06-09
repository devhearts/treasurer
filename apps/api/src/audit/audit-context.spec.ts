import { requestAuditContext } from "./audit-context";

describe("requestAuditContext", () => {
  it("extracts ip from x-forwarded-for", () => {
    const ctx = requestAuditContext({
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
      socket: { remoteAddress: "127.0.0.1" },
    });
    expect(ctx.ip).toBe("203.0.113.1");
  });

  it("falls back to socket remoteAddress", () => {
    const ctx = requestAuditContext({
      headers: {},
      socket: { remoteAddress: "192.168.1.1" },
    });
    expect(ctx.ip).toBe("192.168.1.1");
  });

  it("extracts userAgent and requestId", () => {
    const ctx = requestAuditContext({
      headers: {
        "user-agent": "TestAgent/1.0",
        "x-request-id": "req-abc-123",
      },
    });
    expect(ctx.userAgent).toBe("TestAgent/1.0");
    expect(ctx.requestId).toBe("req-abc-123");
  });

  it("truncates long userAgent", () => {
    const longUa = "x".repeat(600);
    const ctx = requestAuditContext({
      headers: { "user-agent": longUa },
    });
    expect(ctx.userAgent?.length).toBe(512);
  });
});
