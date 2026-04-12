import { eq, and, gt } from "drizzle-orm";
import { getDb } from "./index";
import { events, budgetItems, contributions, users, passwordResetTokens } from "./schema";
import type { CeremonyEvent } from "../types";

export type User = {
  id: string;
  email: string;
  createdAt: string;
};

export function getUserByEmail(email: string): (User & { passwordHash: string }) | undefined {
  const db = getDb();
  const row = db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).get();
  if (!row) return undefined;
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt,
  };
}

export function getUserById(id: string): User | undefined {
  const db = getDb();
  const row = db.select({ id: users.id, email: users.email, createdAt: users.createdAt }).from(users).where(eq(users.id, id)).get();
  return row ?? undefined;
}

export function createUser(data: { id: string; email: string; passwordHash: string; createdAt: string }) {
  const db = getDb();
  db.insert(users).values({
    id: data.id,
    email: data.email.toLowerCase().trim(),
    passwordHash: data.passwordHash,
    createdAt: data.createdAt,
  }).run();
}

export function updateUserPassword(userId: string, passwordHash: string) {
  const db = getDb();
  db.update(users).set({ passwordHash }).where(eq(users.id, userId)).run();
}

export function createPasswordResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: string
) {
  const db = getDb();
  const id = crypto.randomUUID();
  db.insert(passwordResetTokens).values({
    id,
    userId,
    tokenHash,
    expiresAt,
  }).run();
}

export function getPasswordResetByTokenHash(
  tokenHash: string
): { userId: string } | undefined {
  const db = getDb();
  const now = new Date().toISOString();
  const row = db
    .select({ userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gt(passwordResetTokens.expiresAt, now)
      )
    )
    .get();
  return row ?? undefined;
}

export function deletePasswordResetTokenByTokenHash(tokenHash: string) {
  const db = getDb();
  db.delete(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash)).run();
}

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
    pledgeHopeBy?: string | null;
    manual?: boolean | null;
    visible?: boolean | null;
  }[]
): CeremonyEvent {
  return {
    id: row.id,
    userId: row.userId ?? undefined,
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
      pledgeHopeBy: c.pledgeHopeBy ?? undefined,
      manual: c.manual ?? undefined,
      visible: c.visible === false ? false : undefined,
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
          pledgeHopeBy: c.pledgeHopeBy ?? null,
          manual: c.manual ?? null,
          visible: c.visible,
        }))
      )
    );
  }

  return result;
}

export function getEventsByUserId(userId: string): CeremonyEvent[] {
  const db = getDb();
  const eventRows = db.select().from(events).where(eq(events.userId, userId)).all();
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
          pledgeHopeBy: c.pledgeHopeBy ?? null,
          manual: c.manual ?? null,
          visible: c.visible,
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
      pledgeHopeBy: c.pledgeHopeBy ?? null,
      manual: c.manual ?? null,
      visible: c.visible,
    }))
  );
}
