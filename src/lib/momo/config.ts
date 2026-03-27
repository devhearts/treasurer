/**
 * MTN MoMo Collections (Request to Pay) — env configuration.
 * @see https://momodeveloper.mtn.com/api-documentation/use-cases
 */

export interface MomoConfig {
  baseUrl: string;
  subscriptionKey: string;
  apiUser: string;
  apiKey: string;
  /** Sandbox: `sandbox`. Production country-specific, e.g. `mtnuganda`. */
  targetEnvironment: string;
  currency: string;
}

export function isMomoConfigured(): boolean {
  return getMomoConfig() !== null;
}

export function getMomoConfig(): MomoConfig | null {
  const subscriptionKey =
    process.env.MOMO_SUBSCRIPTION_KEY ?? process.env.PRIMARY_KEY;
  const apiUser = process.env.MOMO_API_USER;
  const apiKey = process.env.MOMO_API_KEY;
  if (!subscriptionKey?.trim() || !apiUser?.trim() || !apiKey?.trim()) {
    return null;
  }
  return {
    baseUrl:
      process.env.MOMO_BASE_URL?.trim() ||
      "https://sandbox.momodeveloper.mtn.com",
    subscriptionKey: subscriptionKey.trim(),
    apiUser: apiUser.trim(),
    apiKey: apiKey.trim(),
    targetEnvironment:
      process.env.MOMO_TARGET_ENVIRONMENT?.trim() || "sandbox",
    currency: process.env.MOMO_CURRENCY?.trim() || "UGX",
  };
}
