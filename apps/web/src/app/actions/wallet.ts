"use server";

import { runServerAction } from "@/lib/action-result";
import type { ActionResult } from "@/lib/action-result";
import { serverApiJson } from "@/lib/server-api";
import type {
  PayoutMethod,
  PayoutMethodAddInitiate,
  WalletAccountSummary,
  WalletTransaction,
  WalletTransactionsPage,
  WithdrawFeeQuote,
  WithdrawInitiateResult,
  WithdrawPollResult,
} from "@/lib/wallet/types";

export async function getWalletAccount(): Promise<WalletAccountSummary> {
  return serverApiJson<WalletAccountSummary>("wallet/account");
}

const WALLET_TX_PAGE_SIZE = 20;

export async function getWalletTransactions(options?: {
  limit?: number;
  cursor?: string;
  eventId?: string;
}): Promise<WalletTransactionsPage> {
  const params = new URLSearchParams();
  params.set("limit", String(options?.limit ?? WALLET_TX_PAGE_SIZE));
  if (options?.cursor) params.set("cursor", options.cursor);
  if (options?.eventId) params.set("eventId", options.eventId);
  return serverApiJson<WalletTransactionsPage>(
    `wallet/transactions?${params.toString()}`
  );
}

export async function loadMoreWalletTransactions(
  cursor: string,
  eventId?: string
): Promise<WalletTransactionsPage> {
  return getWalletTransactions({ cursor, limit: WALLET_TX_PAGE_SIZE, eventId });
}

export async function getPayoutMethods(): Promise<PayoutMethod[]> {
  const res = await serverApiJson<{ methods: PayoutMethod[] }>(
    "wallet/payout-methods"
  );
  return res.methods;
}

export async function initiatePayoutMethodAdd(body: {
  type: "mtn_momo" | "airtel_momo" | "bank";
  label?: string;
  msisdn?: string;
  accountNumber?: string;
  bankName?: string;
  branch?: string;
  swift?: string;
  isDefault?: boolean;
}): Promise<ActionResult<PayoutMethodAddInitiate>> {
  return runServerAction(
    () =>
      serverApiJson<PayoutMethodAddInitiate>(
        "wallet/payout-methods/initiate-add",
        { method: "POST", body: JSON.stringify(body) }
      ),
    "Could not start adding payout method."
  );
}

export async function resendPayoutMethodAddOtp(
  pendingId: string
): Promise<ActionResult<{ ok: boolean; resendAvailableInSec: number }>> {
  return runServerAction(
    () =>
      serverApiJson<{ ok: boolean; resendAvailableInSec: number }>(
        "wallet/payout-methods/resend-add-otp",
        { method: "POST", body: JSON.stringify({ pendingId }) }
      ),
    "Could not resend code."
  );
}

export async function verifyPayoutMethodAdd(
  pendingId: string,
  code: string
): Promise<ActionResult<PayoutMethod>> {
  return runServerAction(async () => {
    const res = await serverApiJson<{ method: PayoutMethod }>(
      "wallet/payout-methods/verify-add",
      { method: "POST", body: JSON.stringify({ pendingId, code }) }
    );
    return res.method;
  }, "Invalid or expired code.");
}

export async function updatePayoutMethod(
  id: string,
  body: {
    label?: string;
    msisdn?: string;
    accountNumber?: string;
    bankName?: string;
    branch?: string;
    swift?: string;
    isDefault?: boolean;
  }
): Promise<ActionResult<PayoutMethod>> {
  return runServerAction(async () => {
    const res = await serverApiJson<{ method: PayoutMethod }>(
      `wallet/payout-methods/${id}`,
      { method: "PATCH", body: JSON.stringify(body) }
    );
    return res.method;
  }, "Could not save method.");
}

export async function deletePayoutMethod(
  id: string
): Promise<ActionResult<void>> {
  return runServerAction(
    () => serverApiJson(`wallet/payout-methods/${id}`, { method: "DELETE" }),
    "Could not delete method."
  );
}

export async function quoteWithdraw(
  grossAmount: number
): Promise<ActionResult<WithdrawFeeQuote>> {
  return runServerAction(
    () =>
      serverApiJson<WithdrawFeeQuote>("wallet/withdrawals/quote", {
        method: "POST",
        body: JSON.stringify({ grossAmount }),
      }),
    "Could not calculate fees.",
    "quoteWithdraw"
  );
}

export async function initiateWithdraw(body: {
  methodId: string;
  grossAmount: number;
  idempotencyKey?: string;
}): Promise<ActionResult<WithdrawInitiateResult>> {
  return runServerAction(
    () =>
      serverApiJson<WithdrawInitiateResult>("wallet/withdrawals/initiate", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    "Could not start withdrawal.",
    "initiateWithdraw"
  );
}

export async function resendWithdrawOtp(
  withdrawalId: string
): Promise<ActionResult<{ ok: boolean; resendAvailableInSec: number }>> {
  return runServerAction(
    () =>
      serverApiJson<{ ok: boolean; resendAvailableInSec: number }>(
        "wallet/withdrawals/resend-otp",
        { method: "POST", body: JSON.stringify({ withdrawalId }) }
      ),
    "Could not resend code.",
    "resendWithdrawOtp"
  );
}

export async function verifyWithdrawOtp(
  withdrawalId: string,
  code: string
): Promise<ActionResult<WithdrawPollResult>> {
  return runServerAction(
    () =>
      serverApiJson<WithdrawPollResult>("wallet/withdrawals/verify-otp", {
        method: "POST",
        body: JSON.stringify({ withdrawalId, code }),
      }),
    "Invalid or expired code.",
    "verifyWithdrawOtp"
  );
}

export async function pollWithdraw(
  withdrawalId: string
): Promise<ActionResult<WithdrawPollResult>> {
  return runServerAction(
    () =>
      serverApiJson<WithdrawPollResult>("wallet/withdrawals/poll", {
        method: "POST",
        body: JSON.stringify({ withdrawalId }),
      }),
    "Could not check withdrawal status.",
    "pollWithdraw"
  );
}
