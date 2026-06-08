import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gt } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { DrizzleDb } from "../database/database.module";
import { DRIZZLE } from "../database/database.module";
import * as schema from "../database/schema";
import { formatMysqlDateTimeUtc } from "../common/mysql-datetime";

const SESSION_DAYS = 30;

@Injectable()
export class SessionService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async createSession(
    userId: string,
    ip?: string,
    userAgent?: string
  ): Promise<string> {
    const id = randomUUID();
    const now = new Date();
    const expires = new Date(
      now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000
    );
    await this.db.insert(schema.sessions).values({
      id,
      userId,
      expiresAt: formatMysqlDateTimeUtc(expires),
      createdAt: formatMysqlDateTimeUtc(now),
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    });
    return id;
  }

  async resolveUserId(sessionId: string | undefined): Promise<string | null> {
    if (!sessionId?.trim()) return null;
    const sid = sessionId.trim();
    const nowIso = formatMysqlDateTimeUtc(new Date());
    const rows = await this.db
      .select({ userId: schema.sessions.userId })
      .from(schema.sessions)
      .where(
        and(eq(schema.sessions.id, sid), gt(schema.sessions.expiresAt, nowIso))
      )
      .limit(1);
    return rows[0]?.userId ?? null;
  }

  async destroy(sessionId: string): Promise<void> {
    await this.db
      .delete(schema.sessions)
      .where(eq(schema.sessions.id, sessionId));
  }
}
