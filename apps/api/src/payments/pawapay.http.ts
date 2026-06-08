export interface PawapayErrorResponse {
  errorId: string;
  errorCode: number;
  errorMessage: string;
}

export function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export async function readResponseText(res: Response): Promise<string> {
  return res.text();
}

export function parseJsonText<T>(text: string, context: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${context}: invalid JSON`);
  }
}

export async function readJson<T>(res: Response, context: string): Promise<T> {
  const text = await res.text();
  return parseJsonText<T>(text, context);
}

export function errorMessageFromText(
  text: string,
  httpStatus: number
): string {
  try {
    const err = JSON.parse(text) as PawapayErrorResponse;
    if (err?.errorMessage) return err.errorMessage;
  } catch {
    /* ignore */
  }
  return text.slice(0, 500) || `HTTP ${httpStatus}`;
}

/** @deprecated Prefer readResponseText + errorMessageFromText (body can only be read once). */
export async function errorMessageFromResponse(res: Response): Promise<string> {
  const text = await res.text();
  return errorMessageFromText(text, res.status);
}

/** PawaPay v2 payouts: customerMessage max length (see INVALID_PARAMETER errors). */
export const PAWAPAY_CUSTOMER_MESSAGE_MAX_LENGTH = 22;

export function clampPawapayCustomerMessage(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length <= PAWAPAY_CUSTOMER_MESSAGE_MAX_LENGTH) return trimmed;
  return trimmed.slice(0, PAWAPAY_CUSTOMER_MESSAGE_MAX_LENGTH);
}
