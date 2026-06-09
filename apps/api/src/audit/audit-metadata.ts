const SENSITIVE_KEYS = new Set([
  "password",
  "currentpassword",
  "newpassword",
  "token",
  "otp",
  "code",
  "secret",
  "authorization",
]);

/** Redact sensitive keys and truncate long string values in audit metadata. */
export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) continue;
    out[key] = sanitizeValue(value);
  }
  return Object.keys(out).length ? out : undefined;
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === "object") {
    return sanitizeAuditMetadata(value as Record<string, unknown>);
  }
  return value;
}

/** Last four digits of an MSISDN for audit metadata. */
export function msisdnLast4(msisdn: string): string {
  const digits = msisdn.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : digits;
}
