import * as Sentry from "@sentry/nestjs";

const dsn = process.env.SENTRY_DSN?.trim();
if (dsn) {
  const release = process.env.SENTRY_RELEASE?.trim();
  Sentry.init({
    dsn,
    environment:
      process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    /** Verbose SDK logs (flush intervals, etc.) — only when explicitly enabled. */
    debug: process.env.SENTRY_DEBUG === "1",
    ...(release ? { release } : {}),
  });
}
