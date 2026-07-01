import { ConfigService } from "@nestjs/config";

export interface RukapayConfig {
  baseUrl: string;
  apiKey: string;
  currency: string;
  sandbox: boolean;
  callbackUrl: string;
  walletType: string;
  /** When true, call validate-user (live) / validate-beneficiary-sandbox before PARTNER_SEND_MNO payouts. */
  validateBeneficiary: boolean;
}

function parseBoolFlag(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase();
  return v === "1" || v === "true";
}

function parseOptionalBoolFlag(raw: string | undefined): boolean | undefined {
  if (raw === undefined || raw.trim() === "") return undefined;
  return parseBoolFlag(raw);
}

function envString(c: ConfigService, key: string): string | undefined {
  return c.get<string>(key) ?? process.env[key];
}

export function rukapayConfigFromApp(c: ConfigService): RukapayConfig | null {
  const apiKey = envString(c, "RUKAPAY_API_KEY")?.trim();
  if (!apiKey) return null;

  const baseUrl =
    envString(c, "RUKAPAY_BASE_URL")?.trim() ||
    "https://dev-api.rukapay.net/api/v1/gateway";
  const currency = (
    envString(c, "RUKAPAY_CURRENCY")?.trim() || "UGX"
  ).toUpperCase();
  const sandbox = parseBoolFlag(envString(c, "RUKAPAY_SANDBOX"));
  const validateOverride = parseOptionalBoolFlag(
    envString(c, "RUKAPAY_VALIDATE_BENEFICIARY")
  );
  /** In sandbox, default to validate-beneficiary-sandbox unless explicitly disabled. */
  const validateBeneficiary = validateOverride ?? sandbox;
  const callbackUrlOverride = envString(c, "RUKAPAY_CALLBACK_URL")?.trim();
  const webOrigin =
    envString(c, "WEB_ORIGIN")?.trim() ??
    c.get<string>("app.webOrigin")?.trim() ??
    "";
  const callbackUrl =
    callbackUrlOverride ||
    (webOrigin
      ? `${webOrigin.replace(/\/+$/, "")}/webhooks/rukapay`
      : "");
  const walletType =
    envString(c, "RUKAPAY_WALLET_TYPE")?.trim() || "ESCROW";

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
    currency,
    sandbox,
    callbackUrl,
    walletType,
    validateBeneficiary,
  };
}

/** Load RukaPay config from process.env (CLI / scripts without Nest). */
export function rukapayConfigFromEnv(): RukapayConfig | null {
  const stub = {
    get: <T = string>(key: string): T | undefined =>
      process.env[key] as T | undefined,
  } as ConfigService;
  return rukapayConfigFromApp(stub);
}
