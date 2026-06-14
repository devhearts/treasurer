import { and, eq, sql } from "drizzle-orm";
import type { DrizzleDb } from "../database/database.module";
import * as schema from "../database/schema";

type DbLike = DrizzleDb | Parameters<Parameters<DrizzleDb["transaction"]>[0]>[0];

/** Visible, paid contributions — canonical raised total for an event. */
export function computeRaisedAmountFromRows(
  rows: { amount: number; status: string; visible?: number | null }[]
): number {
  return rows.reduce((sum, c) => {
    if (c.status !== "paid") return sum;
    if (c.visible === 0) return sum;
    return sum + c.amount;
  }, 0);
}

/** Recompute and persist `events.raised_amount` from contribution rows. */
export async function syncEventRaisedAmount(
  db: DbLike,
  eventId: string
): Promise<number> {
  const agg = await db
    .select({
      total: sql<number>`coalesce(sum(${schema.contributions.amount}), 0)`,
    })
    .from(schema.contributions)
    .where(
      and(
        eq(schema.contributions.eventId, eventId),
        eq(schema.contributions.status, "paid"),
        eq(schema.contributions.visible, 1)
      )
    );
  const total = Number(agg[0]?.total ?? 0);
  await db
    .update(schema.events)
    .set({ raisedAmount: total })
    .where(eq(schema.events.id, eventId));
  return total;
}

/** Repair every event where stored `raised_amount` drifted from contributions. */
export async function reconcileAllEventRaisedAmounts(
  db: DbLike
): Promise<{ checked: number; fixed: number }> {
  const events = await db
    .select({
      id: schema.events.id,
      raisedAmount: schema.events.raisedAmount,
    })
    .from(schema.events);

  let fixed = 0;
  for (const ev of events) {
    const total = await syncEventRaisedAmount(db, ev.id);
    if (total !== ev.raisedAmount) fixed += 1;
  }
  return { checked: events.length, fixed };
}
