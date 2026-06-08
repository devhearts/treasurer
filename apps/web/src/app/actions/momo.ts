"use server";

import {
  ServerApiError,
  serverApiFetch,
  serverApiFetchInternal,
  serverApiJson,
  serverApiJsonInternal,
} from "@/lib/server-api";
import type { PaymentPollResult } from "@/lib/payments/types";

export type MomoPollResult = PaymentPollResult;

function pollTransportFailure(
  status: number,
  opts: { subscription: boolean }
): MomoPollResult | null {
  if (status === 401) {
    if (opts.subscription) {
      return {
        status: "FAILED",
        message:
          "Your session expired. Sign in again and restart subscription payment.",
      };
    }
    return {
      status: "FAILED",
      message: "Payment check was rejected. Refresh the page and try again.",
    };
  }
  if (status === 403) {
    return {
      status: "FAILED",
      message: "Could not verify this request with the payment service.",
    };
  }
  return null;
}

export async function initiateMomoContribution(input: {
  eventSlug: string;
  amount: number;
  name: string;
  anonymous?: boolean;
  payerPhone: string;
  milestoneId?: string | null;
}): Promise<
  | { success: true; referenceId: string }
  | { success: false; error: string }
> {
  try {
    return await serverApiJsonInternal<
      | { success: true; referenceId: string }
      | { success: false; error: string }
    >("payments/contributions/initiate", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Payment failed.",
    };
  }
}

export async function pollMomoContribution(
  referenceId: string
): Promise<MomoPollResult> {
  try {
    return await serverApiJsonInternal<MomoPollResult>(
      "payments/contributions/poll",
      {
        method: "POST",
        body: JSON.stringify({ referenceId }),
      }
    );
  } catch (e) {
    if (e instanceof ServerApiError) {
      const mapped = pollTransportFailure(e.status, { subscription: false });
      if (mapped) return mapped;
    }
    return { status: "PENDING" };
  }
}

export async function initiateSubscriptionPayment(input: {
  payerPhone: string;
}): Promise<
  | { success: true; referenceId: string }
  | { success: false; error: string }
> {
  try {
    return await serverApiJson<
      | { success: true; referenceId: string }
      | { success: false; error: string }
    >("payments/subscription/initiate", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Payment failed.",
    };
  }
}

export async function pollSubscriptionPayment(
  referenceId: string
): Promise<MomoPollResult> {
  try {
    return await serverApiJson<MomoPollResult>(
      "payments/subscription/poll",
      {
        method: "POST",
        body: JSON.stringify({ referenceId }),
      }
    );
  } catch (e) {
    if (e instanceof ServerApiError) {
      const mapped = pollTransportFailure(e.status, { subscription: true });
      if (mapped) return mapped;
    }
    return { status: "PENDING" };
  }
}
