import type { LogLevel } from "@nestjs/common";

/** Maps `LOG_LEVEL` / `NODE_ENV` to Nest `LogLevel[]` for `NestFactory.create` / `app.useLogger`. */
export function resolveNestLogLevels(): LogLevel[] {
  const raw = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (raw === "error") return ["error"];
  if (raw === "warn") return ["error", "warn"];
  if (raw === "silent" || raw === "none") return [];
  if (raw === "verbose") {
    return ["error", "warn", "log", "debug", "verbose"];
  }
  if (raw === "debug") return ["error", "warn", "log", "debug"];
  if (raw === "log" || raw === "info") {
    return ["error", "warn", "log"];
  }

  if (process.env.NODE_ENV === "production") {
    return ["error", "warn", "log"];
  }
  return ["error", "warn", "log", "debug", "verbose"];
}
