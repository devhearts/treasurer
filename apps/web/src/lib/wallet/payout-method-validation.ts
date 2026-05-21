import type { PayoutMethodType } from "@/lib/wallet/types";

const MTN_PREFIXES = ["25676", "25677", "25678", "25679", "25639"];
const AIRTEL_PREFIXES = ["25670", "25674", "25675", "25620"];

function normalizeUgandaMsisdn(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("256") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `256${digits.slice(1)}`;
  if (digits.length === 9) return `256${digits}`;
  return null;
}

function isMtnMsisdn(full: string): boolean {
  return full.length === 12 && MTN_PREFIXES.some((p) => full.startsWith(p));
}

function isAirtelMsisdn(full: string): boolean {
  return full.length === 12 && AIRTEL_PREFIXES.some((p) => full.startsWith(p));
}

export interface PayoutMethodFormValues {
  type: PayoutMethodType;
  msisdn: string;
  bankName: string;
  accountNumber: string;
  branch: string;
  swift: string;
  label: string;
}

export type PayoutMethodFieldErrors = Partial<
  Record<keyof PayoutMethodFormValues, string>
>;

export function emptyPayoutMethodForm(
  type: PayoutMethodType = "mtn_momo"
): PayoutMethodFormValues {
  return {
    type,
    msisdn: "",
    bankName: "",
    accountNumber: "",
    branch: "",
    swift: "",
    label: "",
  };
}

export function payoutMethodFormFromMethod(m: {
  type: PayoutMethodType;
  label: string;
  msisdn: string | null;
  accountNumber: string | null;
  bankName: string | null;
  branch: string | null;
  swift: string | null;
}): PayoutMethodFormValues {
  return {
    type: m.type,
    msisdn: m.msisdn ?? "",
    bankName: m.bankName ?? "",
    accountNumber: m.accountNumber ?? "",
    branch: m.branch ?? "",
    swift: m.swift ?? "",
    label: m.label,
  };
}

export function validatePayoutMethodForm(
  values: PayoutMethodFormValues
): { valid: boolean; errors: PayoutMethodFieldErrors } {
  const errors: PayoutMethodFieldErrors = {};

  if (values.label.trim().length > 80) {
    errors.label = "Label must be 80 characters or fewer.";
  }

  if (values.type === "mtn_momo" || values.type === "airtel_momo") {
    const raw = values.msisdn.trim();
    if (!raw) {
      errors.msisdn = "Phone number is required.";
    } else {
      const full = normalizeUgandaMsisdn(raw);
      if (!full) {
        errors.msisdn = "Enter a valid Uganda number (e.g. 07… or 256…).";
      } else if (values.type === "mtn_momo" && !isMtnMsisdn(full)) {
        errors.msisdn = "This number does not look like MTN Mobile Money number.";
      } else if (values.type === "airtel_momo" && !isAirtelMsisdn(full)) {
        errors.msisdn = "This number does not look like Airtel Money number.";
      }
    }
  } else if (values.type === "bank") {
    const bank = values.bankName.trim();
    const account = values.accountNumber.trim();
    if (!bank) {
      errors.bankName = "Bank name is required.";
    } else if (bank.length < 2) {
      errors.bankName = "Enter a valid bank name.";
    }
    if (!account) {
      errors.accountNumber = "Account number is required.";
    } else if (!/^[0-9A-Za-z-]{4,32}$/.test(account)) {
      errors.accountNumber =
        "Use 4–32 characters (letters, numbers, hyphens only).";
    }
    const branch = values.branch.trim();
    if (branch.length > 120) {
      errors.branch = "Branch name is too long.";
    }
    const swift = values.swift.trim();
    if (swift && !/^[A-Za-z0-9]{4,11}$/.test(swift)) {
      errors.swift = "SWIFT/BIC should be 4–11 letters or numbers.";
    }
  }

  const valid = Object.keys(errors).length === 0;
  return { valid, errors };
}

export function payoutMethodPayloadFromForm(values: PayoutMethodFormValues) {
  const label = values.label.trim() || undefined;
  if (values.type === "bank") {
    return {
      type: "bank" as const,
      label,
      bankName: values.bankName.trim(),
      accountNumber: values.accountNumber.trim(),
      branch: values.branch.trim() || undefined,
      swift: values.swift.trim() || undefined,
    };
  }
  return {
    type: values.type,
    label,
    msisdn: values.msisdn.trim(),
  };
}
