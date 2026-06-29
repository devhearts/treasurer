import type { RukapayConfig } from "./rukapay.config";
import {
  rukapayMnoProvider,
  rukapayValidateBeneficiary,
  type RukapayMnoProvider,
} from "./rukapay.client";

export type RukapayPayoutMethodType = "mtn_momo" | "airtel_momo";

function expectedProvider(methodType: RukapayPayoutMethodType): RukapayMnoProvider {
  return methodType === "mtn_momo" ? "MTN" : "AIRTEL";
}

function providerMatchesMethod(
  provider: string | undefined,
  methodType: RukapayPayoutMethodType
): boolean {
  const p = (provider ?? "").toUpperCase();
  if (methodType === "mtn_momo") return p.includes("MTN");
  return p.includes("AIRTEL");
}

/** Validate beneficiary and resolve payout recipient details for RukaPay SEND. */
export async function resolveRukapayPayoutRecipient(
  config: RukapayConfig,
  msisdn: string,
  methodType: RukapayPayoutMethodType,
  reference?: string
): Promise<{
  phoneNumber: string;
  mnoProvider: RukapayMnoProvider;
  recipientName: string;
}> {
  const inferred = rukapayMnoProvider(msisdn);
  const expected = expectedProvider(methodType);
  if (inferred !== expected) {
    throw new Error(
      `Phone number does not match ${methodType === "mtn_momo" ? "MTN" : "Airtel"} payout method.`
    );
  }

  const validation = await rukapayValidateBeneficiary(config, {
    phoneNumber: msisdn,
    mnoProvider: inferred,
    reference,
  });

  const beneficiary = validation.beneficiary;
  if (
    beneficiary?.provider &&
    !providerMatchesMethod(beneficiary.provider, methodType)
  ) {
    throw new Error(
      `Phone number does not match ${methodType === "mtn_momo" ? "MTN" : "Airtel"} payout method.`
    );
  }

  const recipientName =
    beneficiary?.name?.trim() || "CeremonyWallet Recipient";

  return {
    phoneNumber: beneficiary?.phoneNumber ?? msisdn,
    mnoProvider: inferred,
    recipientName,
  };
}

export function rukapayFailureMessageFromStatus(
  response: { message?: string; error?: string; transaction?: { status?: string } } | null,
  fallback: string
): string {
  if (!response) return fallback;
  if (response.message && response.message !== "Transaction status retrieved successfully") {
    return response.message;
  }
  if (response.error) return response.error;
  return fallback;
}
