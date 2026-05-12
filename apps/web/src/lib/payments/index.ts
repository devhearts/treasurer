import type { PaymentNetwork, PaymentProcessorKind } from "./types";

export type {
  PaymentPollResult,
  PaymentProcessor,
  PaymentProcessorKind,
  PaymentStatusBody,
  RequestToPayParams,
} from "./types";

export function paymentNetworksForKind(
  kind: PaymentProcessorKind
): readonly PaymentNetwork[] {
  if (kind === "pawapay") return ["mtn", "airtel"];
  return ["mtn"];
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

/** Shown after a successful wallet payment (e.g. "was received …"). */
export function paymentReceivedViaPhrase(
  kind: PaymentProcessorKind
): "via Mobile Money" | "via MTN MoMo" {
  if (kind === "pawapay") return "via Mobile Money";
  return "via MTN MoMo";
}

/** Shown while polling for wallet approval. */
export function paymentPollingWaitLabel(kind: PaymentProcessorKind): string {
  if (kind === "pawapay") return "Waiting for Mobile Money…";
  return "Waiting for MTN MoMo…";
}
