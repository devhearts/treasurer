const PREFIX = "[PawaPay]";

export function pawapayLog(
  level: "info" | "warn" | "error",
  message: string,
  meta?: Record<string, unknown>
): void {
  const line = meta ? `${PREFIX} ${message} ${JSON.stringify(meta)}` : `${PREFIX} ${message}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
