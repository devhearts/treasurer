import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { events, budgetItems, contributions } from "./schema";
import type { CeremonyEvent } from "../types";

function rowToEvent(
  row: typeof events.$inferSelect,
  budgetRows: { id: string; name: string; amount: number }[],
  contributionRows: {
    id: string;
    eventId: string;
    name: string;
    anonymous: boolean;
    amount: number;
    phone: string;
    message: string | null;
    status: "paid" | "pledged";
    date: string;
    manual?: boolean | null;
  }[]
): CeremonyEvent {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: row.type as CeremonyEvent["type"],
    organizer: row.organizer,
    treasurerPhone: row.treasurerPhone,
    description: row.description,
    targetAmount: row.targetAmount,
    raisedAmount: row.raisedAmount,
    date: row.date,
    location: row.location,
    createdAt: row.createdAt,
    subscriptionPaid: row.subscriptionPaid,
    budgetItems: budgetRows.map((b) => ({
      id: b.id,
      name: b.name,
      amount: b.amount,
    })),
    contributions: contributionRows.map((c) => ({
      id: c.id,
      eventId: c.eventId,
      name: c.name,
      anonymous: c.anonymous,
      amount: c.amount,
      phone: c.phone,
      message: c.message ?? undefined,
      status: c.status,
      date: c.date,
      manual: c.manual ?? undefined,
    })),
  };
}

export function getAllEvents(): CeremonyEvent[] {
  const db = getDb();
  const eventRows = db.select().from(events).all();
  const result: CeremonyEvent[] = [];

  for (const row of eventRows) {
    const budgetRows = db
      .select()
      .from(budgetItems)
      .where(eq(budgetItems.eventId, row.id))
      .all();
    const contributionRows = db
      .select()
      .from(contributions)
      .where(eq(contributions.eventId, row.id))
      .all();
    result.push(
      rowToEvent(
        row,
        budgetRows.map((b) => ({ id: b.id, name: b.name, amount: b.amount })),
        contributionRows.map((c) => ({
          id: c.id,
          eventId: c.eventId,
          name: c.name,
          anonymous: c.anonymous,
          amount: c.amount,
          phone: c.phone,
          message: c.message,
          status: c.status as "paid" | "pledged",
          date: c.date,
          manual: c.manual ?? null,
        }))
      )
    );
  }

  return result;
}

export function getEventBySlug(slug: string): CeremonyEvent | undefined {
  const db = getDb();
  const rows = db.select().from(events).where(eq(events.slug, slug)).limit(1).all();
  const row = rows[0];
  if (!row) return undefined;

  const budgetRows = db
    .select()
    .from(budgetItems)
    .where(eq(budgetItems.eventId, row.id))
    .all();
  const contributionRows = db
    .select()
    .from(contributions)
    .where(eq(contributions.eventId, row.id))
    .all();

  return rowToEvent(
    row,
    budgetRows.map((b) => ({ id: b.id, name: b.name, amount: b.amount })),
    contributionRows.map((c) => ({
      id: c.id,
      eventId: c.eventId,
      name: c.name,
      anonymous: c.anonymous,
      amount: c.amount,
      phone: c.phone,
      message: c.message,
      status: c.status as "paid" | "pledged",
      date: c.date,
      manual: c.manual ?? null,
    }))
  );
}
