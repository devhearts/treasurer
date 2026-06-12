import type { PaymentNetwork } from "@/lib/payments/types";
import { paymentPhoneValidationMessage } from "@/lib/payments";

const MTN_PREFIXES = ["25676", "25677", "25678", "25679", "25639"];
const AIRTEL_PREFIXES = ["25670", "25674", "25675", "25620"];

export function normalizeUgandaMsisdn(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("256") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10)
    return `256${digits.slice(1)}`;
  if (digits.length === 9) return `256${digits}`;
  return null;
}

function isMtnMsisdn(full: string): boolean {
  return full.length === 12 && MTN_PREFIXES.some((p) => full.startsWith(p));
}

function isAirtelMsisdn(full: string): boolean {
  return full.length === 12 && AIRTEL_PREFIXES.some((p) => full.startsWith(p));
}

/** Returns null when valid; otherwise an error message. */
export function validateUgandaPhone(
  raw: string,
  networks: readonly PaymentNetwork[] = ["mtn", "airtel"]
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "Enter your phone number.";
  const full = normalizeUgandaMsisdn(trimmed);
  if (!full) {
    return paymentPhoneValidationMessage(networks);
  }
  const hasMtn = networks.includes("mtn");
  const hasAirtel = networks.includes("airtel");
  if (hasMtn && isMtnMsisdn(full)) return null;
  if (hasAirtel && isAirtelMsisdn(full)) return null;
  return paymentPhoneValidationMessage(networks);
}

export function isValidUgandaPhone(
  raw: string,
  networks: readonly PaymentNetwork[] = ["mtn", "airtel"]
): boolean {
  return validateUgandaPhone(raw, networks) === null;
}
