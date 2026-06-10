import { Controller, Get, Inject, NotFoundException } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { Public } from "../common/public.decorator";
import { SkipThrottle } from "@nestjs/throttler";
import type { DrizzleDb } from "../database/database.module";
import { DRIZZLE } from "../database/database.module";

@SkipThrottle()
@Public()
@Controller()
export class HealthController {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  @Get("health")
  health() {
    return { ok: true, service: "treasurer-api" };
  }

  @Get("health/ready")
  async ready() {
    await this.db.execute(sql`SELECT 1`);
    return { ok: true, db: true };
  }

  /** Verify Sentry — only when SENTRY_DEBUG=1 and SENTRY_DSN is set. */
  @Get("debug-sentry")
  debugSentry() {
    if (process.env.SENTRY_DEBUG !== "1" || !process.env.SENTRY_DSN?.trim()) {
      throw new NotFoundException();
    }
    throw new Error("My first Sentry error!");
  }
}
