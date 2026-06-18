import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, ne, sql } from "drizzle-orm";
import type { DrizzleDb } from "../database/database.module";
import * as schema from "../database/schema";

export interface EventWithdrawAvailability {
  platformRaised: number;
  withdrawnSoFar: number;
  pendingWithdrawals: number;
  availableToWithdraw: number;
}

export interface WithdrawEventOptionRow extends EventWithdrawAvailability {
  id: string;
  title: string;
  slug: string;
}

const PENDING_WITHDRAWAL_STATUSES = ["pending_otp", "processing"] as const;

export function computeAvailableToWithdraw(
  platformRaised: number,
  withdrawnSoFar: number,
  pendingWithdrawals: number
): number {
  return Math.max(0, platformRaised - withdrawnSoFar - pendingWithdrawals);
}

export function aggregateWithdrawalAmounts(
  rows: { status: string; grossAmount: number }[]
): Pick<EventWithdrawAvailability, "withdrawnSoFar" | "pendingWithdrawals"> {
  let withdrawnSoFar = 0;
  let pendingWithdrawals = 0;
  for (const row of rows) {
    if (row.status === "completed") {
      withdrawnSoFar += row.grossAmount;
    } else if (
      PENDING_WITHDRAWAL_STATUSES.includes(
        row.status as (typeof PENDING_WITHDRAWAL_STATUSES)[number]
      )
    ) {
      pendingWithdrawals += row.grossAmount;
    }
  }
  return { withdrawnSoFar, pendingWithdrawals };
}

export async function getEventForOwner(
  db: DrizzleDb,
  userId: string,
  eventId: string
): Promise<{ id: string; title: string; slug: string }> {
  const rows = await db
    .select({
      id: schema.events.id,
      title: schema.events.title,
      slug: schema.events.slug,
      ownerId: schema.events.userId,
    })
    .from(schema.events)
    .where(eq(schema.events.id, eventId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new NotFoundException("Event not found.");
  }
  if (!row.ownerId || row.ownerId !== userId) {
    throw new ForbiddenException("You do not own this event.");
  }
  return { id: row.id, title: row.title, slug: row.slug };
}

async function sumPlatformRaised(
  db: DrizzleDb,
  userId: string,
  eventId: string
): Promise<number> {
  const rows = await db
    .select({
      total: sql<number>`coalesce(sum(${schema.walletTransactions.amount}), 0)`,
    })
    .from(schema.walletTransactions)
    .where(
      and(
        eq(schema.walletTransactions.userId, userId),
        eq(schema.walletTransactions.eventId, eventId),
        eq(schema.walletTransactions.direction, "in"),
        eq(schema.walletTransactions.kind, "contribution")
      )
    );
  return Number(rows[0]?.total ?? 0);
}

async function listWithdrawalAmountsForEvent(
  db: DrizzleDb,
  userId: string,
  eventId: string,
  options?: { excludeWithdrawalId?: string }
): Promise<{ status: string; grossAmount: number }[]> {
  const conditions = [
    eq(schema.withdrawalEvents.eventId, eventId),
    eq(schema.withdrawals.userId, userId),
  ];
  if (options?.excludeWithdrawalId) {
    conditions.push(ne(schema.withdrawals.id, options.excludeWithdrawalId));
  }

  const rows = await db
    .select({
      status: schema.withdrawals.status,
      grossAmount: schema.withdrawals.grossAmount,
    })
    .from(schema.withdrawalEvents)
    .innerJoin(
      schema.withdrawals,
      eq(schema.withdrawalEvents.withdrawalId, schema.withdrawals.id)
    )
    .where(and(...conditions));

  return rows;
}

export async function computeEventWithdrawAvailability(
  db: DrizzleDb,
  userId: string,
  eventId: string,
  options?: { excludeWithdrawalId?: string }
): Promise<EventWithdrawAvailability> {
  const [platformRaised, withdrawalRows] = await Promise.all([
    sumPlatformRaised(db, userId, eventId),
    listWithdrawalAmountsForEvent(db, userId, eventId, options),
  ]);
  const { withdrawnSoFar, pendingWithdrawals } =
    aggregateWithdrawalAmounts(withdrawalRows);
  return {
    platformRaised,
    withdrawnSoFar,
    pendingWithdrawals,
    availableToWithdraw: computeAvailableToWithdraw(
      platformRaised,
      withdrawnSoFar,
      pendingWithdrawals
    ),
  };
}

export async function assertEventWithdrawAllowed(
  db: DrizzleDb,
  userId: string,
  eventId: string,
  grossAmount: number,
  options?: { excludeWithdrawalId?: string }
): Promise<EventWithdrawAvailability> {
  await getEventForOwner(db, userId, eventId);
  const availability = await computeEventWithdrawAvailability(
    db,
    userId,
    eventId,
    options
  );
  if (grossAmount > availability.availableToWithdraw) {
    throw new BadRequestException(
      `Amount exceeds available funds for this event (UGX ${availability.availableToWithdraw.toLocaleString("en-UG")} remaining).`
    );
  }
  return availability;
}

export async function getWithdrawalEventId(
  db: DrizzleDb,
  withdrawalId: string
): Promise<string | undefined> {
  const rows = await db
    .select({ eventId: schema.withdrawalEvents.eventId })
    .from(schema.withdrawalEvents)
    .where(eq(schema.withdrawalEvents.withdrawalId, withdrawalId))
    .limit(1);
  return rows[0]?.eventId;
}

export async function listWithdrawEventOptions(
  db: DrizzleDb,
  userId: string
): Promise<WithdrawEventOptionRow[]> {
  const eventRows = await db
    .select({
      id: schema.events.id,
      title: schema.events.title,
      slug: schema.events.slug,
    })
    .from(schema.events)
    .where(eq(schema.events.userId, userId));

  const options: WithdrawEventOptionRow[] = [];
  for (const event of eventRows) {
    const availability = await computeEventWithdrawAvailability(
      db,
      userId,
      event.id
    );
    options.push({
      id: event.id,
      title: event.title,
      slug: event.slug,
      ...availability,
    });
  }

  options.sort((a, b) => {
    if (b.availableToWithdraw !== a.availableToWithdraw) {
      return b.availableToWithdraw - a.availableToWithdraw;
    }
    return a.title.localeCompare(b.title);
  });

  return options;
}

export async function assertIdempotentWithdrawalEvent(
  db: DrizzleDb,
  withdrawalId: string,
  eventId: string
): Promise<void> {
  const linkedEventId = await getWithdrawalEventId(db, withdrawalId);
  if (!linkedEventId) return;
  if (linkedEventId !== eventId) {
    throw new BadRequestException(
      "Idempotency key was already used for a different event."
    );
  }
}
