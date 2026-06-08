import type { PawapayConfig } from "./pawapay.config";
import { pawapayPredictProvider } from "./pawapay.payout.client";

/** Uganda PawaPay v2 provider codes (https://docs.pawapay.io/v2/docs/providers). */
export const PAWAPAY_UG_MTN_PROVIDER = "MTN_MOMO_UGA";
export const PAWAPAY_UG_AIRTEL_PROVIDER = "AIRTEL_OAPI_UGA";

export type PawapayPayoutMethodType = "mtn_momo" | "airtel_momo";

function providerMatchesMethod(
  provider: string,
  methodType: PawapayPayoutMethodType
): boolean {
  const p = provider.toUpperCase();
  if (methodType === "mtn_momo") return p.includes("MTN");
  return p.includes("AIRTEL");
}

function fallbackProvider(methodType: PawapayPayoutMethodType): string {
  return methodType === "mtn_momo"
    ? PAWAPAY_UG_MTN_PROVIDER
    : PAWAPAY_UG_AIRTEL_PROVIDER;
}

/** Resolve payout recipient via predict-provider, with type-aware fallback. */
export async function resolvePawapayPayoutRecipient(
  config: PawapayConfig,
  msisdn: string,
  methodType: PawapayPayoutMethodType
): Promise<{ phoneNumber: string; provider: string }> {
  try {
    const prediction = await pawapayPredictProvider(config, msisdn);
    if (!providerMatchesMethod(prediction.provider, methodType)) {
      throw new Error(
        `Phone number does not match ${methodType === "mtn_momo" ? "MTN" : "Airtel"} payout method.`
      );
    }
    return {
      phoneNumber: prediction.phoneNumber,
      provider: prediction.provider,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("does not match")) throw e;
    return { phoneNumber: msisdn, provider: fallbackProvider(methodType) };
  }
}
