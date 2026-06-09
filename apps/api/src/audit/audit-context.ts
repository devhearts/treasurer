export type AuditRequestContext = {
  ip?: string;
  userAgent?: string;
  requestId?: string;
};

type RequestLike = {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};

/** Extract ip, userAgent, and requestId from an HTTP request. */
export function requestAuditContext(req: RequestLike): AuditRequestContext {
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    (typeof forwarded === "string"
      ? forwarded.split(",")[0]?.trim()
      : Array.isArray(forwarded)
        ? forwarded[0]?.split(",")[0]?.trim()
        : undefined) || req.socket?.remoteAddress;

  const ua = req.headers["user-agent"];
  const userAgent = typeof ua === "string" ? ua : Array.isArray(ua) ? ua[0] : undefined;

  const rid = req.headers["x-request-id"];
  const requestId =
    typeof rid === "string" ? rid : Array.isArray(rid) ? rid[0] : undefined;

  return {
    ip: ip || undefined,
    userAgent: userAgent?.slice(0, 512),
    requestId: requestId?.slice(0, 64),
  };
}
