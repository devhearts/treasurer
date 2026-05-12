import type { MomoConfig } from "./momo.config";

export const MOMO_HTTP_USER_AGENT =
  "Mozilla/5.0 (compatible; CeremonyWallet-MoMo/1.0; +https://momodeveloper.mtn.com)";

export function momoCollectionHeaders(config: MomoConfig): Record<string, string> {
  return {
    Accept: "application/json",
    "Ocp-Apim-Subscription-Key": config.subscriptionKey,
    "X-Target-Environment": config.targetEnvironment,
    "User-Agent": MOMO_HTTP_USER_AGENT,
  };
}

export function formatMomoGatewayError(body: string): string {
  const t = body.trim();
  if (!t.startsWith("<")) {
    return t.length > 800 ? `${t.slice(0, 800)}…` : t;
  }
  const id = t.match(/support ID is:\s*([0-9]+)/i)?.[1];
  const suffix = id
    ? ` MoMo support ID: ${id} (quote this if you contact MTN).`
    : "";
  return (
    "MoMo’s gateway returned an HTML block page instead of the API (often anti-bot / network rules)." +
    suffix +
    " Try: use sandbox URL https://sandbox.momodeveloper.mtn.com, confirm Collections subscription key, try another network or VPN, or contact MTN MoMo developer support."
  );
}

export async function readMomoJson<T>(
  res: Response,
  context: string
): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (trimmed.startsWith("<")) {
    throw new Error(`${context}: ${formatMomoGatewayError(text)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${context}: ${formatMomoGatewayError(text)}`);
  }
}
