/**
 * pawaPay Merchant API — deposits + toolkit.
 * @see https://docs.pawapay.io/v1/api-reference/deposits/request-deposit
 *
 * Required: `PAWAPAY_API_TOKEN`. Correspondent (MMO code) is resolved per payer via
 * [predict correspondent](https://docs.pawapay.io/v1/api-reference/toolkit/predict-correspondent).
 *
 * Optional: `PAWAPAY_BASE_URL` (default `https://api.sandbox.pawapay.io`),
 * `PAWAPAY_CURRENCY` (default `UGX`), `PAWAPAY_COUNTRY` (ISO 3166-1 alpha-3 override on deposit when set).
 */

export interface PawapayConfig {
  baseUrl: string;
  apiToken: string;
  currency: string;
  /** ISO 3166-1 alpha-3; when set, sent on deposit instead of prediction country. */
  country: string | null;
}

export function getPawapayConfig(): PawapayConfig | null {
  const apiToken = process.env.PAWAPAY_API_TOKEN?.trim();
  if (!apiToken) return null;
  const baseUrl =
    process.env.PAWAPAY_BASE_URL?.trim() ||
    "https://api.sandbox.pawapay.io";
  const currency = (process.env.PAWAPAY_CURRENCY?.trim() || "UGX").toUpperCase();
  const countryRaw = process.env.PAWAPAY_COUNTRY?.trim().toUpperCase();
  const country =
    countryRaw && countryRaw.length === 3 ? countryRaw : null;
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiToken,
    currency,
    country,
  };
}
