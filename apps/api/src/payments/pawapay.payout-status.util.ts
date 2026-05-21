import type { PawapayPayoutCheckResponse } from "./pawapay.payout.client";
import { normalizeProviderPollStatus } from "./payment-status";
import { pawapayErrorMessage, pawapayFailureReason } from "./payment-processor-error.util";

export type PawapayPayoutReconcileAction = "poll" | "complete" | "fail";

/** UUID from initiate / check / error JSON (`payoutId` field). */
export function pawapayPayoutIdFromParsed(parsed: unknown): string | undefined {
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const id = (parsed as Record<string, unknown>).payoutId;
  return typeof id === "string" && id.length >= 36 ? id : undefined;
}

/** Human-readable failure text from any PawaPay payout JSON body. */
export function pawapayPayoutFailureMessage(
  parsed: unknown,
  rawBody = "",
  httpStatus = 0,
  fallback = "PawaPay payout failed"
): string {
  const msg = pawapayErrorMessage(parsed, rawBody, httpStatus);
  if (msg && !msg.startsWith("{")) return msg;
  return fallback;
}

export function pawapayPayoutFailureMessageFromCheck(
  check: PawapayPayoutCheckResponse,
  fallback: string
): string {
  const fr = check.data?.failureReason;
  if (fr?.failureMessage) return fr.failureMessage;
  if (fr?.failureCode) return fr.failureCode;
  return fallback;
}

/**
 * Decide next step after GET /v2/payouts/{payoutId} (check-payout-status).
 * @see https://docs.pawapay.io/v2/api-reference/payouts/check-payout-status
 */
export function reconcilePawapayPayoutCheckResult(
  check: PawapayPayoutCheckResponse,
  fallbackFailMessage: string
): { action: PawapayPayoutReconcileAction; message?: string } {
  if (check.status === "NOT_FOUND") {
    return { action: "fail", message: fallbackFailMessage };
  }

  const payoutStatus = check.data?.status;
  if (!payoutStatus) {
    return { action: "poll" };
  }

  const { bucket } = normalizeProviderPollStatus(payoutStatus);
  if (bucket === "success") {
    return { action: "complete" };
  }
  if (bucket === "failed") {
    return {
      action: "fail",
      message: pawapayPayoutFailureMessageFromCheck(check, fallbackFailMessage),
    };
  }
  return { action: "poll" };
}

/** Initiation rejection / HTTP error body may include nested `failureReason`. */
export function pawapayInitiateRejectionMessage(parsed: unknown): string | undefined {
  const nested = pawapayFailureReason(parsed);
  return nested?.failureMessage ?? nested?.failureCode;
}
