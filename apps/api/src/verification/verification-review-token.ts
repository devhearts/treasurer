import { createHmac, timingSafeEqual } from "crypto";

export type VerificationReviewSlot = "selfie" | "idFront" | "idBack";

const REVIEW_SLOTS: VerificationReviewSlot[] = ["selfie", "idFront", "idBack"];

export function isVerificationReviewSlot(
  value: string
): value is VerificationReviewSlot {
  return (REVIEW_SLOTS as string[]).includes(value);
}

export function signVerificationReviewToken(
  userId: string,
  slot: VerificationReviewSlot,
  expSec: number,
  secret: string
): string {
  return createHmac("sha256", secret)
    .update(`${userId}:${slot}:${expSec}`)
    .digest("hex");
}

export function verifyVerificationReviewToken(
  userId: string,
  slot: VerificationReviewSlot,
  expSec: number,
  sig: string,
  secret: string
): boolean {
  if (!secret.trim() || !sig?.trim() || !Number.isFinite(expSec)) return false;
  if (expSec < Math.floor(Date.now() / 1000)) return false;
  const expected = signVerificationReviewToken(userId, slot, expSec, secret);
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(sig, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Public web origin + `/api/v1` BFF prefix for browser-openable review links. */
export function reviewImageApiBase(publicWebUrl: string): string {
  const root = publicWebUrl.replace(/\/+$/, "");
  if (root.endsWith("/api/v1")) return root;
  return `${root}/api/v1`;
}

export function buildVerificationReviewImageUrl(
  publicWebUrl: string,
  userId: string,
  slot: VerificationReviewSlot,
  secret: string,
  ttlSec = 3600
): string | null {
  if (!secret.trim()) return null;
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const sig = signVerificationReviewToken(userId, slot, exp, secret);
  const base = reviewImageApiBase(publicWebUrl);
  return `${base}/verification/review/${encodeURIComponent(userId)}/${slot}?exp=${exp}&sig=${encodeURIComponent(sig)}`;
}
