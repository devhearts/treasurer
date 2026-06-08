import { ConfigService } from "@nestjs/config";
import type { MomoConfig } from "./momo.config";

export interface MomoDisbursementConfig extends MomoConfig {
  /** Disbursement API user (may differ from collection). */
  disbursementApiUser: string;
  disbursementApiKey: string;
  disbursementSubscriptionKey: string;
}

export function momoDisbursementConfigFromApp(
  c: ConfigService
): MomoDisbursementConfig | null {
  const subscriptionKey =
    c.get<string>("MOMO_DISBURSEMENT_SUBSCRIPTION_KEY")?.trim() ||
    c.get<string>("MOMO_SUBSCRIPTION_KEY")?.trim() ||
    c.get<string>("PRIMARY_KEY")?.trim();
  const apiUser =
    c.get<string>("MOMO_DISBURSEMENT_API_USER")?.trim() ||
    c.get<string>("MOMO_API_USER")?.trim();
  const apiKey =
    c.get<string>("MOMO_DISBURSEMENT_API_KEY")?.trim() ||
    c.get<string>("MOMO_API_KEY")?.trim();
  if (!subscriptionKey || !apiUser || !apiKey) return null;

  return {
    baseUrl:
      c.get<string>("MOMO_BASE_URL")?.trim() ||
      "https://sandbox.momodeveloper.mtn.com",
    subscriptionKey,
    apiUser: c.get<string>("MOMO_API_USER")?.trim() || apiUser,
    apiKey: c.get<string>("MOMO_API_KEY")?.trim() || apiKey,
    disbursementApiUser: apiUser,
    disbursementApiKey: apiKey,
    disbursementSubscriptionKey: subscriptionKey,
    targetEnvironment:
      c.get<string>("MOMO_TARGET_ENVIRONMENT")?.trim() || "sandbox",
    currency: c.get<string>("MOMO_CURRENCY")?.trim() || "UGX",
  };
}
