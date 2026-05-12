import { Controller, Get, Inject } from "@nestjs/common";
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
}
