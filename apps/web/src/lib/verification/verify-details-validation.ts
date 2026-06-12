const MTN_PREFIXES = ["25676", "25677", "25678", "25679", "25639"];
const AIRTEL_PREFIXES = ["25670", "25674", "25675", "25620"];

/** At least two name parts (first + last), letters and common punctuation only. */
const LEGAL_NAME_PATTERN =
  /^[\p{L}\p{M}]+(?:[ '\-][\p{L}\p{M}]+)+$/u;

export interface VerificationDetailsErrors {
  legalName?: string;
  phone?: string;
}

function normalizeUgandaMsisdnDigits(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("256") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `256${digits.slice(1)}`;
  if (digits.length === 9) return `256${digits}`;
  return null;
}

export function normalizeUgandaMomoMsisdn(input: string): string | null {
  const full = normalizeUgandaMsisdnDigits(input.trim());
  if (!full) return null;
  const isMtn = MTN_PREFIXES.some((p) => full.startsWith(p));
  const isAirtel = AIRTEL_PREFIXES.some((p) => full.startsWith(p));
  return isMtn || isAirtel ? full : null;
}

export function validateVerificationDetails(
  legalName: string,
  phone: string
): { valid: boolean; errors: VerificationDetailsErrors } {
  const errors: VerificationDetailsErrors = {};
  const trimmedName = legalName.trim();

  if (!trimmedName) {
    errors.legalName = "Enter your full legal name as on your ID.";
  } else if (trimmedName.length > 255) {
    errors.legalName = "Name must be 255 characters or fewer.";
  } else if (!LEGAL_NAME_PATTERN.test(trimmedName)) {
    errors.legalName = "Enter your first and last name as on your ID.";
  }

  const phoneTrimmed = phone.trim();
  if (!phoneTrimmed) {
    errors.phone = "Mobile money phone number is required.";
  } else if (!normalizeUgandaMomoMsisdn(phoneTrimmed)) {
    errors.phone =
      "Enter a valid MTN or Airtel Uganda number registered in your name.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
