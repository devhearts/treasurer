import { getPaymentProcessorType } from "./env";
import { createMtnMomoProcessor } from "./mtn-momo-processor";
import { createPawapayProcessor } from "./pawapay-processor";
import type {
  PaymentNetwork,
  PaymentProcessor,
  PaymentProcessorKind,
} from "./types";

export type {
  PaymentPollResult,
  PaymentProcessor,
  PaymentProcessorKind,
  PaymentStatusBody,
  RequestToPayParams,
} from "./types";

export { getPaymentProcessorType } from "./env";

export function getPaymentProcessor(): PaymentProcessor {
  const t = getPaymentProcessorType();
  if (t === "pawapay") return createPawapayProcessor();
  return createMtnMomoProcessor();
}

export function isPaymentProcessorConfigured(): boolean {
  return getPaymentProcessor().isConfigured();
}

export function paymentNotConfiguredMessage(
  kind: PaymentProcessorKind
): string {
  if (kind === "pawapay") {
    return "PawaPay payments are not configured.";
  }
  return "MoMo payments are not configured.";
}

export function paymentNetworksText(networks: readonly PaymentNetwork[]): string {
  const hasMtn = networks.includes("mtn");
  const hasAirtel = networks.includes("airtel");
  if (hasMtn && hasAirtel) return "MTN or Airtel";
  if (hasMtn) return "MTN";
  if (hasAirtel) return "Airtel";
  return "Mobile Money";
}

export function paymentPhoneValidationMessage(
  networks: readonly PaymentNetwork[]
): string {
  const n = paymentNetworksText(networks);
  return `Enter a valid ${n} Uganda number (e.g. 07... or 256...).`;
}

export function paymentCtaLabel(kind: PaymentProcessorKind): string {
  if (kind === "pawapay") return "Pay with Mobile money";
  return "Pay with MTN Momo";
}
