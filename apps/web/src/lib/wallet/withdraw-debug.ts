/** Client / server-action withdraw flow logging. Set WITHDRAW_DEBUG=1 in apps/web/.env */
export function withdrawDebug(
  step: string,
  detail?: Record<string, unknown>
): void {
  const enabled =
    process.env.WITHDRAW_DEBUG === "1" ||
    process.env.WITHDRAW_DEBUG === "true" ||
    process.env.NODE_ENV !== "production";
  if (!enabled) return;
  if (detail !== undefined) {
    console.debug(`[withdraw] ${step}`, detail);
  } else {
    console.debug(`[withdraw] ${step}`);
  }
}
