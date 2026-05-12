/** Normalize collection / deposit status strings from MoMo, PawaPay, etc. */
export type NormalizedPollBucket = "success" | "failed" | "pending";

export function normalizeProviderPollStatus(raw: string | undefined): {
  bucket: NormalizedPollBucket;
  rawUpper: string;
} {
  const rawUpper = (raw ?? "").trim().toUpperCase();
  if (!rawUpper) return { bucket: "pending", rawUpper: "" };

  const success = new Set([
    "SUCCESSFUL",
    "SUCCESS",
    "COMPLETED",
    "SUCCEEDED",
  ]);
  const failed = new Set([
    "FAILED",
    "REJECTED",
    "DECLINED",
    "CANCELLED",
    "CANCELED",
    "EXPIRED",
  ]);

  if (success.has(rawUpper)) return { bucket: "success", rawUpper };
  if (failed.has(rawUpper)) return { bucket: "failed", rawUpper };

  return { bucket: "pending", rawUpper };
}
