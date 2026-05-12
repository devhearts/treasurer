"use server";

import type { CeremonyEvent } from "@/lib/types";
import { clearSession, getCurrentUser } from "@/app/actions/auth";
import { serverApiFetch, serverApiJson } from "@/lib/server-api";

export async function getMyEvents(): Promise<CeremonyEvent[]> {
  try {
    const data = await serverApiJson<CeremonyEvent[]>("events/mine");
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getEventBySlug(
  slug: string
): Promise<CeremonyEvent | undefined> {
  const ev = await serverApiJson<CeremonyEvent | null>(
    `events/by-slug/${encodeURIComponent(slug)}`
  );
  return ev ?? undefined;
}

export async function addEvent(
  event: CeremonyEvent,
  subscriptionPaymentReferenceId?: string | null
): Promise<{ success: true; slug: string } | { success: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) {
    await clearSession();
    return { success: false, error: "You must be signed in to create an event." };
  }
  try {
    const data = await serverApiJson<{ success: boolean; slug: string }>("events", {
      method: "POST",
      body: JSON.stringify({ event, subscriptionPaymentReferenceId }),
    });
    return { success: true, slug: data.slug };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to add event";
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
    await serverApiJson(
      `events/by-slug/${encodeURIComponent(eventSlug)}/contributions`,
      {
        method: "POST",
        body: JSON.stringify(contribution),
      }
    );
    return { success: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to add contribution";
    return { success: false, error: message };
  }
}

export async function addMilestoneItem(
  eventSlug: string,
  input: { name: string; targetAmount: number }
): Promise<
  { success: true; id: string } | { success: false; error: string }
> {
  try {
    const data = await serverApiJson<{ success: boolean; id: string }>(
      `events/by-slug/${encodeURIComponent(eventSlug)}/milestones`,
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    );
    return { success: true, id: data.id };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to add milestone.",
    };
  }
}

export async function deleteMilestoneItem(
  eventSlug: string,
  milestoneId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const res = await serverApiFetch(
      `events/by-slug/${encodeURIComponent(eventSlug)}/milestones/${encodeURIComponent(milestoneId)}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const text = await res.text();
      let msg = text || res.statusText;
      try {
        const j = JSON.parse(text) as { message?: string };
        if (j.message) msg = j.message;
      } catch {
        /* ignore */
      }
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete milestone.",
    };
  }
}

export async function setContributionVisibility(
  eventSlug: string,
  contributionId: string,
  visible: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await serverApiJson(
      `events/by-slug/${encodeURIComponent(eventSlug)}/contributions/${encodeURIComponent(contributionId)}/visibility`,
      {
        method: "POST",
        body: JSON.stringify({ visible }),
      }
    );
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update visibility.",
    };
  }
}
