export function rukapayAuthHeaders(apiKey: string): Record<string, string> {
  return {
    "x-api-key": apiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
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

export function rukapayErrorMessageFromText(
  text: string,
  httpStatus: number
): string {
  try {
    const err = JSON.parse(text) as Record<string, unknown>;
    if (typeof err.message === "string" && err.message) return err.message;
    if (typeof err.error === "string" && err.error) return err.error;
  } catch {
    /* ignore */
  }
  return text.slice(0, 500) || `HTTP ${httpStatus}`;
}

export async function rukapayErrorMessageFromResponse(
  res: Response
): Promise<string> {
  const text = await res.text();
  return rukapayErrorMessageFromText(text, res.status);
}
