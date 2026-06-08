import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { DrizzleDb } from "../database/database.module";
import { DRIZZLE } from "../database/database.module";
import * as schema from "../database/schema";
import { formatMysqlDateTimeUtc } from "../common/mysql-datetime";

@Injectable()
export class AuditService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async log(input: {
    actorUserId?: string | null;
    actorType: "user" | "system" | "integration";
    action: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
    requestId?: string;
  }): Promise<void> {
    const meta = input.metadata ?? undefined;
    if (meta && JSON.stringify(meta).length > 8000) {
      input.metadata = { truncated: true };
    }
    await this.db.insert(schema.auditLogs).values({
      id: randomUUID(),
      occurredAt: formatMysqlDateTimeUtc(new Date()),
      actorUserId: input.actorUserId ?? null,
      actorType: input.actorType,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      requestId: input.requestId ?? null,
    });
  }
}
