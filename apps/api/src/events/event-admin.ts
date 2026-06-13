import { eq } from "drizzle-orm";
import type { DrizzleDb } from "../database/database.module";
import * as schema from "../database/schema";
import { formatMysqlDateTimeUtc } from "../common/mysql-datetime";
import {
  parseEventLifecycleStatus,
  type EventLifecycleStatus,
} from "./event-lifecycle";

export type EventAdminRow = {
  id: string;
  slug: string;
  title: string;
  status: EventLifecycleStatus;
  statusMessage: string | null;
  preSuspendStatus: EventLifecycleStatus | null;
  suspendReason: string | null;
  statusChangedAt: string | null;
  userId: string | null;
};

function mapEventRow(row: typeof schema.events.$inferSelect): EventAdminRow {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: parseEventLifecycleStatus(row.status),
    statusMessage: row.statusMessage ?? null,
    preSuspendStatus: row.preSuspendStatus
      ? parseEventLifecycleStatus(row.preSuspendStatus)
      : null,
    suspendReason: row.suspendReason ?? null,
    statusChangedAt: row.statusChangedAt ?? null,
    userId: row.userId ?? null,
  };
}

export async function getEventForAdmin(
  db: DrizzleDb,
  slug: string
): Promise<EventAdminRow | null> {
  const rows = await db
    .select()
    .from(schema.events)
    .where(eq(schema.events.slug, slug))
    .limit(1);
  const row = rows[0];
  return row ? mapEventRow(row) : null;
}

export async function listEventsForAdmin(
  db: DrizzleDb,
  statusFilter?: EventLifecycleStatus
): Promise<EventAdminRow[]> {
  const rows = statusFilter
    ? await db
        .select()
        .from(schema.events)
        .where(eq(schema.events.status, statusFilter))
    : await db.select().from(schema.events);
  return rows.map(mapEventRow);
}

export async function suspendEvent(
  db: DrizzleDb,
  slug: string,
  reason: string
): Promise<EventAdminRow> {
  const rows = await db
    .select()
    .from(schema.events)
    .where(eq(schema.events.slug, slug))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error(`Event not found: ${slug}`);

  const current = parseEventLifecycleStatus(row.status);
  if (current === "suspended") {
    throw new Error("Event is already suspended.");
  }

  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw new Error("--reason is required for suspend.");
  }

  const now = formatMysqlDateTimeUtc(new Date());
  await db
    .update(schema.events)
    .set({
      preSuspendStatus: current,
      status: "suspended",
      suspendReason: trimmedReason.slice(0, 500),
      statusChangedAt: now,
    })
    .where(eq(schema.events.id, row.id));

  const updated = await getEventForAdmin(db, slug);
  if (!updated) throw new Error(`Event not found after suspend: ${slug}`);
  return updated;
}

export async function unsuspendEvent(
  db: DrizzleDb,
  slug: string
): Promise<EventAdminRow> {
  const rows = await db
    .select()
    .from(schema.events)
    .where(eq(schema.events.slug, slug))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error(`Event not found: ${slug}`);

  const current = parseEventLifecycleStatus(row.status);
  if (current !== "suspended") {
    throw new Error("Event is not suspended.");
  }

  const restoreStatus = row.preSuspendStatus
    ? parseEventLifecycleStatus(row.preSuspendStatus)
    : "active";

  const now = formatMysqlDateTimeUtc(new Date());
  await db
    .update(schema.events)
    .set({
      status: restoreStatus,
      preSuspendStatus: null,
      suspendReason: null,
      statusChangedAt: now,
    })
    .where(eq(schema.events.id, row.id));

  const updated = await getEventForAdmin(db, slug);
  if (!updated) throw new Error(`Event not found after unsuspend: ${slug}`);
  return updated;
}
