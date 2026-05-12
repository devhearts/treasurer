import { ConfigService } from "@nestjs/config";

export interface PawapayConfig {
  baseUrl: string;
  apiToken: string;
  currency: string;
  country: string | null;
}

export function pawapayConfigFromApp(c: ConfigService): PawapayConfig | null {
  const apiToken = c.get<string>("PAWAPAY_API_TOKEN")?.trim();
  if (!apiToken) return null;
  const baseUrl =
    c.get<string>("PAWAPAY_BASE_URL")?.trim() ||
    "https://api.sandbox.pawapay.io";
  const currency = (c.get<string>("PAWAPAY_CURRENCY")?.trim() || "UGX").toUpperCase();
  const countryRaw = c.get<string>("PAWAPAY_COUNTRY")?.trim().toUpperCase();
  const country =
    countryRaw && countryRaw.length === 3 ? countryRaw : null;
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiToken,
    currency,
    country,
  };
}
