import { ConfigService } from "@nestjs/config";

export interface MomoConfig {
  baseUrl: string;
  subscriptionKey: string;
  apiUser: string;
  apiKey: string;
  targetEnvironment: string;
  currency: string;
}

export function momoConfigFromApp(c: ConfigService): MomoConfig | null {
  const subscriptionKey =
    c.get<string>("MOMO_SUBSCRIPTION_KEY") ?? c.get<string>("PRIMARY_KEY");
  const apiUser = c.get<string>("MOMO_API_USER");
  const apiKey = c.get<string>("MOMO_API_KEY");
  if (!subscriptionKey?.trim() || !apiUser?.trim() || !apiKey?.trim()) {
    return null;
  }
  return {
    baseUrl:
      c.get<string>("MOMO_BASE_URL")?.trim() ||
      "https://sandbox.momodeveloper.mtn.com",
    subscriptionKey: subscriptionKey.trim(),
    apiUser: apiUser.trim(),
    apiKey: apiKey.trim(),
    targetEnvironment:
      c.get<string>("MOMO_TARGET_ENVIRONMENT")?.trim() || "sandbox",
    currency: c.get<string>("MOMO_CURRENCY")?.trim() || "UGX",
  };
}
