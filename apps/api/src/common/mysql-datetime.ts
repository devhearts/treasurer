/**
 * UTC `YYYY-MM-DD HH:MM:SS.mmm` for Drizzle `datetime(..., { mode: "string", fsp: 3 })`.
 * ISO strings with `T` / `Z` are rejected by MariaDB/MySQL in strict mode.
 */
export function formatMysqlDateTimeUtc(d: Date): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const ms = String(d.getUTCMilliseconds()).padStart(3, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${ms}`;
}
