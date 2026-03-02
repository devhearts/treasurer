"use server";

import { getDb } from "@/lib/db";
import { events, budgetItems, contributions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { CeremonyEvent } from "@/lib/types";
import {
  getAllEvents as dbGetAllEvents,
  getEventBySlug as dbGetEventBySlug,
} from "@/lib/db/queries";

export async function getAllEvents(): Promise<CeremonyEvent[]> {
  return dbGetAllEvents();
}

export async function getEventBySlug(
  slug: string
): Promise<CeremonyEvent | undefined> {
  return dbGetEventBySlug(slug);
}

export async function addEvent(
  event: CeremonyEvent
): Promise<{ success: true; slug: string } | { success: false; error: string }> {
  try {
    const db = getDb();
    db.insert(events).values({
      id: event.id,
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

    const id = `c${Date.now()}`;
    const db = getDb();
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
      manual: contribution.manual ?? false,
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
