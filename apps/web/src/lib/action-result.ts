import { ServerApiError } from "@/lib/server-api";
import { withdrawDebug } from "@/lib/wallet/withdraw-debug";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function actionErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof ServerApiError) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

export async function runServerAction<T>(
  fn: () => Promise<T>,
  fallback: string,
  action?: string
): Promise<ActionResult<T>> {
  const label = action ?? "wallet";
  withdrawDebug(`${label}:start`);
  try {
    const data = await fn();
    withdrawDebug(`${label}:ok`, {
      status:
        typeof data === "object" &&
        data !== null &&
        "status" in data &&
        typeof (data as { status: unknown }).status === "string"
          ? (data as { status: string }).status
          : undefined,
    });
    return { ok: true, data };
  } catch (e) {
    const error = actionErrorMessage(e, fallback);
    withdrawDebug(`${label}:error`, {
      error,
      httpStatus: e instanceof ServerApiError ? e.status : undefined,
      apiBody: e instanceof ServerApiError ? e.body : undefined,
    });
    return { ok: false, error };
  }
}
