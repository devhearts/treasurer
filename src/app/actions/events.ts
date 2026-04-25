"use server";

import { getDb } from "@/lib/db";
import { events, budgetItems, contributions, milestoneItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { CeremonyEvent } from "@/lib/types";
import {
  getEventsByUserId as dbGetEventsByUserId,
  getEventBySlug as dbGetEventBySlug,
} from "@/lib/db/queries";
import { clearSession, getCurrentUser } from "@/app/actions/auth";

/** Returns events owned by the current user (for app "My events"). */
export async function getMyEvents(): Promise<CeremonyEvent[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return dbGetEventsByUserId(user.id);
}

export async function getEventBySlug(
  slug: string
): Promise<CeremonyEvent | undefined> {
  return dbGetEventBySlug(slug);
}

export async function addEvent(
  event: CeremonyEvent
): Promise<{ success: true; slug: string } | { success: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) {
    // Clear stale auth cookie if session points to a missing/invalid user.
    await clearSession();
    return { success: false, error: "You must be signed in to create an event." };
  }
  try {
    const db = getDb();
    db.insert(events).values({
      id: event.id,
      userId: user.id,
      slug: event.slug,
      title: event.title,
      type: event.type,
      organizer: event.organizer,
      treasurerPhone: event.treasurerPhone,
      description: event.description,
      targetAmount: event.targetAmount,
      raisedAmount: event.raisedAmount,
      date: event.date,
      location: event.location,
      createdAt: event.createdAt,
      subscriptionPaid: event.subscriptionPaid,
    }).run();

    for (const b of event.budgetItems) {
      db.insert(budgetItems).values({
        id: b.id,
        eventId: event.id,
        name: b.name,
        amount: b.amount,
      }).run();
    }

    for (const m of event.milestoneItems ?? []) {
      db.insert(milestoneItems).values({
        id: m.id,
        eventId: event.id,
        name: m.name,
        targetAmount: m.targetAmount,
      }).run();
    }

    for (const c of event.contributions) {
      db.insert(contributions).values({
        id: c.id,
        eventId: c.eventId,
        name: c.name,
        anonymous: c.anonymous,
        amount: c.amount,
        phone: c.phone,
        message: c.message ?? null,
        status: c.status,
        date: c.date,
        pledgeHopeBy: c.pledgeHopeBy ?? null,
        visible: c.visible !== false,
        milestoneId: c.milestoneId ?? null,
      }).run();
    }

    return { success: true, slug: event.slug };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add event";
    return { success: false, error: message };
  }
}

export async function addContribution(
  eventSlug: string,
  contribution: Omit<CeremonyEvent["contributions"][0], "id" | "eventId"> & {
    manual?: boolean;
  }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const event = dbGetEventBySlug(eventSlug);
    if (!event) return { success: false, error: "Event not found" };

    const mid = contribution.milestoneId?.trim() || null;
    if (mid && !event.milestoneItems.some((m) => m.id === mid)) {
      return { success: false, error: "Invalid milestone." };
    }

    const id = `c${Date.now()}`;
    const db = getDb();
    const pledgeHopeBy =
      contribution.status === "pledged" &&
      contribution.pledgeHopeBy?.trim()
        ? contribution.pledgeHopeBy.trim()
        : null;

    db.insert(contributions).values({
      id,
      eventId: event.id,
      name: contribution.name,
      anonymous: contribution.anonymous,
      amount: contribution.amount,
      phone: contribution.phone,
      message: contribution.message ?? null,
      status: contribution.status,
      date: contribution.date,
      pledgeHopeBy,
      manual: contribution.manual ?? false,
      visible: true,
      milestoneId: mid,
    }).run();

    db.update(events)
      .set({
        raisedAmount: event.raisedAmount + contribution.amount,
      })
      .where(eq(events.id, event.id))
      .run();

    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to add contribution";
    return { success: false, error: message };
  }
}

export async function addMilestoneItem(
  eventSlug: string,
  input: { name: string; targetAmount: number }
): Promise<
  { success: true; id: string } | { success: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "You must be signed in." };
  const event = dbGetEventBySlug(eventSlug);
  if (!event) return { success: false, error: "Event not found" };
  if (event.userId && event.userId !== user.id) {
    return { success: false, error: "Not allowed." };
  }
  const name = input.name.trim();
  if (!name) return { success: false, error: "Enter a name." };
  const target = Math.round(Number(input.targetAmount));
  if (!Number.isFinite(target) || target < 1) {
    return { success: false, error: "Enter a valid target amount." };
  }
  const id = `ms${Date.now()}`;
  const db = getDb();
  db.insert(milestoneItems).values({
    id,
    eventId: event.id,
    name,
    targetAmount: target,
  }).run();
  return { success: true, id };
}

export async function deleteMilestoneItem(
  eventSlug: string,
  milestoneId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "You must be signed in." };
  const event = dbGetEventBySlug(eventSlug);
  if (!event) return { success: false, error: "Event not found" };
  if (event.userId && event.userId !== user.id) {
    return { success: false, error: "Not allowed." };
  }
  if (!event.milestoneItems.some((m) => m.id === milestoneId)) {
    return { success: false, error: "Milestone not found." };
  }
  const db = getDb();
  db.delete(milestoneItems)
    .where(
      and(
        eq(milestoneItems.id, milestoneId),
        eq(milestoneItems.eventId, event.id)
      )
    )
    .run();
  return { success: true };
}

export async function setContributionVisibility(
  eventSlug: string,
  contributionId: string,
  visible: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }
  const event = dbGetEventBySlug(eventSlug);
  if (!event) return { success: false, error: "Event not found" };
  if (event.userId && event.userId !== user.id) {
    return { success: false, error: "Not allowed." };
  }
  const contrib = event.contributions.find((c) => c.id === contributionId);
  if (!contrib) return { success: false, error: "Contribution not found." };

  const wasVisible = contrib.visible !== false;
  if (wasVisible === visible) {
    return { success: true };
  }

  const db = getDb();
  db.update(contributions)
    .set({ visible })
    .where(
      and(
        eq(contributions.id, contributionId),
        eq(contributions.eventId, event.id)
      )
    )
    .run();

  const delta = visible ? contrib.amount : -contrib.amount;
  const nextRaised = Math.max(0, event.raisedAmount + delta);
  db.update(events)
    .set({ raisedAmount: nextRaised })
    .where(eq(events.id, event.id))
    .run();

  return { success: true };
}
