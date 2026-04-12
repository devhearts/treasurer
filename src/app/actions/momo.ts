"use server";

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { contributions, events, momoPendingPayments } from "@/lib/db/schema";
import { getEventBySlug } from "@/lib/db/queries";
import { getMomoConfig } from "@/lib/momo/config";
import {
  getRequestToPayStatus,
  requestToPay,
} from "@/lib/momo/client";
import { momoLog, redactMsisdn } from "@/lib/momo/log";
import { MOMO_PUBLIC_PAYMENT_START_FAILED } from "@/lib/momo/messages";
import { normalizeUgandaMsisdn } from "@/lib/momo/phone";

export type MomoPollResult =
  | { status: "PENDING" }
  | { status: "SUCCESSFUL" }
  | { status: "FAILED"; message?: string }
  | { status: "NOT_FOUND" };

function externalIdForPayment(): string {
  return `cw-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

export async function initiateMomoContribution(input: {
  eventSlug: string;
  amount: number;
  name: string;
  anonymous?: boolean;
  payerPhone: string;
  /** When set, successful payment is recorded against this milestone. */
  milestoneId?: string | null;
}): Promise<
  | { success: true; referenceId: string }
  | { success: false; error: string }
> {
  const config = getMomoConfig();
  if (!config) {
    return { success: false, error: "MoMo payments are not configured." };
  }

  const event = getEventBySlug(input.eventSlug);
  if (!event) return { success: false, error: "Event not found" };

  const milestoneId = input.milestoneId?.trim() || null;
  if (
    milestoneId &&
    !event.milestoneItems.some((m) => m.id === milestoneId)
  ) {
    return { success: false, error: "Invalid milestone." };
  }

  if (!Number.isFinite(input.amount) || input.amount < 1000) {
    return { success: false, error: "Invalid amount." };
  }

  const msisdn = normalizeUgandaMsisdn(input.payerPhone);
  if (!msisdn) {
    return {
      success: false,
      error:
        "Enter a valid MTN Uganda number (76, 77, 78, 79, or 39 — e.g. 077… or 25677…).",
    };
  }

  const referenceId = randomUUID();
  const externalId = externalIdForPayment();
  const createdAt = new Date().toISOString();
  const db = getDb();

  db.insert(momoPendingPayments)
    .values({
      referenceId,
      eventId: event.id,
      amount: Math.round(input.amount),
      name: input.anonymous
        ? "Anonymous"
        : input.name.trim() || "Supporter",
      anonymous: input.anonymous ?? false,
      phone: msisdn,
      message: null,
      externalId,
      contributionRecorded: false,
      createdAt,
      milestoneId,
    })
    .run();

  try {
    await requestToPay({
      referenceId,
      amount: Math.round(input.amount),
      currency: config.currency,
      externalId,
      payerMsisdn: msisdn,
      payerMessage: `Contribution to ${event.title}`.slice(0, 140),
      payeeNote: `CeremonyWallet ${event.slug}`.slice(0, 140),
    });
  } catch (e) {
    db.delete(momoPendingPayments)
      .where(eq(momoPendingPayments.referenceId, referenceId))
      .run();
    const internal = e instanceof Error ? e.message : String(e);
    momoLog("error", "initiateMomoContribution requestToPay failed", {
      eventSlug: input.eventSlug,
      referenceId,
      payer: redactMsisdn(msisdn),
      internal: internal,
    });
    return { success: false, error: MOMO_PUBLIC_PAYMENT_START_FAILED };
  }

  momoLog("info", "initiateMomoContribution pending", {
    eventSlug: input.eventSlug,
    referenceId,
    externalId,
  });
  return { success: true, referenceId };
}

function recordContributionFromPending(referenceId: string): boolean {
  const db = getDb();
  const tx = db.transaction((tx) => {
    const row = tx
      .select()
      .from(momoPendingPayments)
      .where(eq(momoPendingPayments.referenceId, referenceId))
      .get();

    if (!row || row.contributionRecorded) return false;

    const event = tx
      .select()
      .from(events)
      .where(eq(events.id, row.eventId))
      .get();
    if (!event) return false;

    const contributionId = `c${Date.now()}`;
    const date = new Date().toISOString().split("T")[0];

    tx.insert(contributions).values({
      id: contributionId,
      eventId: row.eventId,
      name: row.name,
      anonymous: row.anonymous,
      amount: row.amount,
      phone: row.phone,
      message: row.message ?? null,
      status: "paid",
      date,
      pledgeHopeBy: null,
      manual: false,
      visible: true,
      milestoneId: row.milestoneId ?? null,
    }).run();

    tx.update(events)
      .set({ raisedAmount: event.raisedAmount + row.amount })
      .where(eq(events.id, event.id))
      .run();

    tx.update(momoPendingPayments)
      .set({ contributionRecorded: true })
      .where(eq(momoPendingPayments.referenceId, referenceId))
      .run();

    return true;
  });

  return tx;
}

/**
 * Poll MoMo status and record contribution when payment succeeds.
 */
export async function pollMomoContribution(
  referenceId: string
): Promise<MomoPollResult> {
  const config = getMomoConfig();
  if (!config) return { status: "NOT_FOUND" };

  const db = getDb();
  const pending = db
    .select()
    .from(momoPendingPayments)
    .where(eq(momoPendingPayments.referenceId, referenceId))
    .get();

  if (!pending) return { status: "NOT_FOUND" };

  if (pending.contributionRecorded) {
    return { status: "SUCCESSFUL" };
  }

  let body: Awaited<ReturnType<typeof getRequestToPayStatus>>;
  try {
    body = await getRequestToPayStatus(referenceId);
  } catch (e) {
    momoLog("warn", "pollMomoContribution status fetch failed, will retry", {
      referenceId,
      err: e instanceof Error ? e.message : String(e),
    });
    return { status: "PENDING" };
  }

  const status = (body.status || "").toUpperCase();

  if (status === "SUCCESSFUL") {
    recordContributionFromPending(referenceId);
    momoLog("info", "pollMomoContribution paid", { referenceId });
    return { status: "SUCCESSFUL" };
  }

  if (status === "FAILED" || status === "REJECTED") {
    const msg =
      body.reason?.message ||
      (status === "REJECTED" ? "Payment was rejected." : "Payment failed.");
    momoLog("info", "pollMomoContribution terminal failure", {
      referenceId,
      status,
    });
    return { status: "FAILED", message: msg };
  }

  return { status: "PENDING" };
}

// ---------------------------------------------------------------------------
// Subscription payment (event activation fee via MoMo)
// ---------------------------------------------------------------------------

const SUBSCRIPTION_AMOUNT = 10000;

export async function initiateSubscriptionPayment(input: {
  payerPhone: string;
}): Promise<
  | { success: true; referenceId: string }
  | { success: false; error: string }
> {
  const config = getMomoConfig();
  if (!config) return { success: false, error: "MoMo payments are not configured." };

  const msisdn = normalizeUgandaMsisdn(input.payerPhone);
  if (!msisdn) {
    return {
      success: false,
      error: "Enter a valid MTN Uganda number (76, 77, 78, 79, or 39 — e.g. 077… or 25677…).",
    };
  }

  const referenceId = randomUUID();
  const externalId = externalIdForPayment();

  try {
    await requestToPay({
      referenceId,
      amount: SUBSCRIPTION_AMOUNT,
      currency: config.currency,
      externalId,
      payerMsisdn: msisdn,
      payerMessage: "CeremonyWallet event activation",
      payeeNote: "CeremonyWallet subscription",
    });
  } catch (e) {
    const internal = e instanceof Error ? e.message : String(e);
    momoLog("error", "initiateSubscriptionPayment requestToPay failed", {
      referenceId,
      payer: redactMsisdn(msisdn),
      internal,
    });
    return { success: false, error: MOMO_PUBLIC_PAYMENT_START_FAILED };
  }

  momoLog("info", "initiateSubscriptionPayment pending", {
    referenceId,
    externalId,
  });
  return { success: true, referenceId };
}

export async function pollSubscriptionPayment(
  referenceId: string
): Promise<MomoPollResult> {
  const config = getMomoConfig();
  if (!config) return { status: "NOT_FOUND" };

  let body: Awaited<ReturnType<typeof getRequestToPayStatus>>;
  try {
    body = await getRequestToPayStatus(referenceId);
  } catch (e) {
    momoLog("warn", "pollSubscriptionPayment status fetch failed, will retry", {
      referenceId,
      err: e instanceof Error ? e.message : String(e),
    });
    return { status: "PENDING" };
  }

  const status = (body.status || "").toUpperCase();

  if (status === "SUCCESSFUL") {
    momoLog("info", "pollSubscriptionPayment paid", { referenceId });
    return { status: "SUCCESSFUL" };
  }

  if (status === "FAILED" || status === "REJECTED") {
    const msg =
      body.reason?.message ||
      (status === "REJECTED" ? "Payment was rejected." : "Payment failed.");
    momoLog("info", "pollSubscriptionPayment terminal failure", {
      referenceId,
      status,
    });
    return { status: "FAILED", message: msg };
  }

  return { status: "PENDING" };
}
