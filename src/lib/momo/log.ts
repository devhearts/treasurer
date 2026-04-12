type MomoLogLevel = "info" | "warn" | "error";

const PREFIX = "[MoMo]";

export function momoLog(
  level: MomoLogLevel,
  message: string,
  meta?: Record<string, string | number | boolean | undefined>
): void {
  const parts = [PREFIX, message];
  if (meta && Object.keys(meta).length > 0) {
    const flat = Object.entries(meta)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");
    parts.push(flat);
  }
  // Use console.log for all levels: Next.js dev / Turbopack reliably forwards
  // stdout from Server Actions; console.info and console.warn are easy to miss.
  const line = `${parts.join(" ")} [${level}]`;
  console.log(line);
}

/** Last 4 digits only — safe for server logs. */
export function redactMsisdn(msisdn: string): string {
  if (msisdn.length < 4) return "***";
  return `***${msisdn.slice(-4)}`;
}
