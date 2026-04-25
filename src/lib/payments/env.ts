import type { PaymentProcessorKind } from "./types";

const VALID: PaymentProcessorKind[] = ["mtn_momo", "pawapay"];

/**
 * Active payment integration. Defaults to `mtn_momo`.
 * Set `PAYMENT_PROCESSOR_TYPE=pawapay` to select the PawaPay adapter (stub until implemented).
 */
export function getPaymentProcessorType(): PaymentProcessorKind {
  const raw = process.env.PAYMENT_PROCESSOR_TYPE?.trim().toLowerCase();
  if (raw && VALID.includes(raw as PaymentProcessorKind)) {
    return raw as PaymentProcessorKind;
  }
  return "mtn_momo";
}

/**
 * Feature flag for paid event activation step on create flow.
 * Enabled only when explicitly set to `1` or `true`.
 */
export function isSubscriptionPaymentEnabled(): boolean {
  const raw = process.env.FEATURE_SUBSCRIPTION_PAYMENT?.trim().toLowerCase();
  return raw === "1" || raw === "true";
}
