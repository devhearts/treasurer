/** MTN Uganda international prefixes (12-digit MSISDN after full normalization). */
const MTN_UG_MSISDN_PREFIXES = [
  "25676",
  "25677",
  "25678",
  "25679",
  "25639",
] as const;

/** True if `digits` is exactly 12 digits and matches an MTN Uganda MSISDN prefix. */
export function isMtnUgandaMsisdn(digits: string): boolean {
  if (digits.length !== 12) return false;
  return MTN_UG_MSISDN_PREFIXES.some((p) => digits.startsWith(p));
}

/**
 * Normalize to MTN MoMo MSISDN for Uganda (256 + 9 subscriber digits).
 * Only accepts numbers in the MTN ranges 76, 77, 78, 79, and 39 (e.g. 25677…, 25639…).
 */
export function normalizeUgandaMsisdn(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  let full: string | null = null;

  if (digits.startsWith("256")) {
    if (digits.length === 12) full = digits;
    else return null;
  } else if (digits.startsWith("0") && digits.length === 10) {
    full = `256${digits.slice(1)}`;
  } else if (digits.length === 9) {
    full = `256${digits}`;
  } else {
    return null;
  }

  return isMtnUgandaMsisdn(full) ? full : null;
}
