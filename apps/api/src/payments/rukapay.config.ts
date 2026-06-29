import { ConfigService } from "@nestjs/config";

export interface RukapayConfig {
  baseUrl: string;
  apiKey: string;
  currency: string;
  sandbox: boolean;
  callbackUrl: string;
  walletType: string;
}

function parseSandboxFlag(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase();
  return v === "1" || v === "true";
}

export function rukapayConfigFromApp(c: ConfigService): RukapayConfig | null {
  const apiKey = c.get<string>("RUKAPAY_API_KEY")?.trim();
  if (!apiKey) return null;

  const baseUrl =
    c.get<string>("RUKAPAY_BASE_URL")?.trim() ||
    "https://dev-api.rukapay.net/api/v1/gateway";
  const currency = (
    c.get<string>("RUKAPAY_CURRENCY")?.trim() || "UGX"
  ).toUpperCase();
  const sandbox = parseSandboxFlag(c.get<string>("RUKAPAY_SANDBOX"));
  const callbackUrlOverride = c.get<string>("RUKAPAY_CALLBACK_URL")?.trim();
  const webOrigin =
    c.get<string>("WEB_ORIGIN")?.trim() ??
    c.get<string>("app.webOrigin")?.trim() ??
    "";
  const callbackUrl =
    callbackUrlOverride ||
    (webOrigin
      ? `${webOrigin.replace(/\/+$/, "")}/webhooks/rukapay`
      : "");
  const walletType =
    c.get<string>("RUKAPAY_WALLET_TYPE")?.trim() || "ESCROW";

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
    currency,
    sandbox,
    callbackUrl,
    walletType,
  };
}
