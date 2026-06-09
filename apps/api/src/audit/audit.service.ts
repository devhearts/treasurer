import { Inject, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { DrizzleDb } from "../database/database.module";
import { DRIZZLE } from "../database/database.module";
import * as schema from "../database/schema";
import { formatMysqlDateTimeUtc } from "../common/mysql-datetime";
import type { AuditRequestContext } from "./audit-context";
import { sanitizeAuditMetadata } from "./audit-metadata";

export type AuditLogInput = {
  actorUserId?: string | null;
  actorType: "user" | "system" | "integration";
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  requestId?: string;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async log(input: AuditLogInput): Promise<void> {
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

  /** Sanitize metadata, merge request context, and log. Swallows errors after warn. */
  logSafe(input: AuditLogInput & { ctx?: AuditRequestContext }): void {
    const { ctx, ...rest } = input;
    const metadata = sanitizeAuditMetadata(rest.metadata);
    void this.log({
      ...rest,
      metadata,
      ip: rest.ip ?? ctx?.ip,
      userAgent: rest.userAgent ?? ctx?.userAgent,
      requestId: rest.requestId ?? ctx?.requestId,
    }).catch((err) => {
      this.logger.warn(
        `audit write failed action=${rest.action}: ${err instanceof Error ? err.message : String(err)}`
      );
    });
  }

  logUserAction(
    userId: string,
    action: string,
    entity: { type?: string; id?: string },
    metadata?: Record<string, unknown>,
    ctx?: AuditRequestContext
  ): void {
    this.logSafe({
      actorType: "user",
      actorUserId: userId,
      action,
      entityType: entity.type,
      entityId: entity.id,
      metadata,
      ctx,
    });
  }
}
