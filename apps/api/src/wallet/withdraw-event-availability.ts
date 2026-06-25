import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import type { DrizzleDb } from "../database/database.module";
import * as schema from "../database/schema";

export interface EventWithdrawAvailability {
  platformRaised: number;
  withdrawnSoFar: number;
  pendingWithdrawals: number;
  legacyWithdrawnAttributed: number;
  hasTrackedWithdrawals: boolean;
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
  pendingWithdrawals: number,
  legacyAttributed = 0
): number {
  return Math.max(
    0,
    platformRaised - withdrawnSoFar - pendingWithdrawals - legacyAttributed
  );
}

export function allocateLegacyWithdrawalsFifo(
  legacyPool: number,
  events: Array<{
    eventId: string;
    platformRaised: number;
    hasTrackedWithdrawals: boolean;
  }>
): Map<string, number> {
  const result = new Map<string, number>();
  let remaining = legacyPool;
  for (const event of events) {
    if (event.hasTrackedWithdrawals) {
      result.set(event.eventId, 0);
      continue;
    }
    const attributed = Math.min(event.platformRaised, remaining);
    result.set(event.eventId, attributed);
    remaining -= attributed;
  }
  return result;
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

async function sumLegacyUnallocatedWithdrawals(
  db: DrizzleDb,
  userId: string
): Promise<number> {
  const rows = await db
    .select({
      total: sql<number>`coalesce(sum(${schema.withdrawals.grossAmount}), 0)`,
    })
    .from(schema.withdrawals)
    .leftJoin(
      schema.withdrawalEvents,
      eq(schema.withdrawalEvents.withdrawalId, schema.withdrawals.id)
    )
    .where(
      and(
        eq(schema.withdrawals.userId, userId),
        eq(schema.withdrawals.status, "completed"),
        isNull(schema.withdrawalEvents.withdrawalId)
      )
    );
  return Number(rows[0]?.total ?? 0);
}

async function listTrackedEventIds(
  db: DrizzleDb,
  userId: string
): Promise<Set<string>> {
  const rows = await db
    .selectDistinct({ eventId: schema.withdrawalEvents.eventId })
    .from(schema.withdrawalEvents)
    .innerJoin(
      schema.withdrawals,
      eq(schema.withdrawalEvents.withdrawalId, schema.withdrawals.id)
    )
    .where(eq(schema.withdrawals.userId, userId));
  return new Set(rows.map((r) => r.eventId));
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

function buildEventAvailability(
  platformRaised: number,
  withdrawnSoFar: number,
  pendingWithdrawals: number,
  legacyWithdrawnAttributed: number,
  hasTrackedWithdrawals: boolean
): EventWithdrawAvailability {
  return {
    platformRaised,
    withdrawnSoFar,
    pendingWithdrawals,
    legacyWithdrawnAttributed,
    hasTrackedWithdrawals,
    availableToWithdraw: computeAvailableToWithdraw(
      platformRaised,
      withdrawnSoFar,
      pendingWithdrawals,
      legacyWithdrawnAttributed
    ),
  };
}

async function computeUserEventAvailabilities(
  db: DrizzleDb,
  userId: string,
  options?: { excludeWithdrawalId?: string }
): Promise<Map<string, EventWithdrawAvailability>> {
  const eventRows = await db
    .select({
      id: schema.events.id,
      createdAt: schema.events.createdAt,
    })
    .from(schema.events)
    .where(eq(schema.events.userId, userId));

  const [legacyPool, trackedEventIds] = await Promise.all([
    sumLegacyUnallocatedWithdrawals(db, userId),
    listTrackedEventIds(db, userId),
  ]);

  const sortedForFifo = [...eventRows].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );

  const fifoInputs: Array<{
    eventId: string;
    platformRaised: number;
    hasTrackedWithdrawals: boolean;
  }> = [];
  const eventAmounts = new Map<
    string,
    {
      platformRaised: number;
      withdrawnSoFar: number;
      pendingWithdrawals: number;
      hasTrackedWithdrawals: boolean;
    }
  >();

  for (const event of sortedForFifo) {
    const [platformRaised, withdrawalRows] = await Promise.all([
      sumPlatformRaised(db, userId, event.id),
      listWithdrawalAmountsForEvent(db, userId, event.id, options),
    ]);
    const { withdrawnSoFar, pendingWithdrawals } =
      aggregateWithdrawalAmounts(withdrawalRows);
    const hasTrackedWithdrawals = trackedEventIds.has(event.id);
    fifoInputs.push({ eventId: event.id, platformRaised, hasTrackedWithdrawals });
    eventAmounts.set(event.id, {
      platformRaised,
      withdrawnSoFar,
      pendingWithdrawals,
      hasTrackedWithdrawals,
    });
  }

  const legacyMap = allocateLegacyWithdrawalsFifo(legacyPool, fifoInputs);
  const result = new Map<string, EventWithdrawAvailability>();

  for (const event of eventRows) {
    const amounts = eventAmounts.get(event.id)!;
    const legacyWithdrawnAttributed = legacyMap.get(event.id) ?? 0;
    result.set(
      event.id,
      buildEventAvailability(
        amounts.platformRaised,
        amounts.withdrawnSoFar,
        amounts.pendingWithdrawals,
        legacyWithdrawnAttributed,
        amounts.hasTrackedWithdrawals
      )
    );
  }

  return result;
}

export async function computeEventWithdrawAvailability(
  db: DrizzleDb,
  userId: string,
  eventId: string,
  options?: { excludeWithdrawalId?: string }
): Promise<EventWithdrawAvailability> {
  const availabilities = await computeUserEventAvailabilities(
    db,
    userId,
    options
  );
  const availability = availabilities.get(eventId);
  if (!availability) {
    throw new NotFoundException("Event not found.");
  }
  return availability;
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

  const availabilities = await computeUserEventAvailabilities(db, userId);

  const options: WithdrawEventOptionRow[] = eventRows.map((event) => {
    const availability = availabilities.get(event.id)!;
    return {
      id: event.id,
      title: event.title,
      slug: event.slug,
      ...availability,
    };
  });

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
