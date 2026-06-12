import { createHash, randomBytes } from "crypto";
import type { VerificationCaptureSlot } from "./verification.types";
import { VERIFICATION_IMAGE_MAX_BYTES } from "./verification.types";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateCaptureToken(): string {
  return randomBytes(24).toString("base64url");
}

export function maskLegalName(name: string | null | undefined): string | null {
  if (!name?.trim()) return null;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    const p = parts[0]!;
    if (p.length <= 2) return `${p[0]}*`;
    return `${p[0]}${"*".repeat(Math.max(1, p.length - 2))}${p.slice(-1)}`;
  }
  return `${parts[0]!} ${parts[parts.length - 1]![0]}***`;
}

export function maskPhoneMsisdn(msisdn: string | null | undefined): string | null {
  if (!msisdn?.trim()) return null;
  const d = msisdn.replace(/\D/g, "");
  if (d.length < 4) return "****";
  return `***${d.slice(-4)}`;
}

export function verificationImageKey(
  userId: string,
  submissionTs: string,
  slot: VerificationCaptureSlot
): string {
  const file =
    slot === "selfie"
      ? "selfie.jpg"
      : slot === "id-front"
        ? "id-front.jpg"
        : "id-back.jpg";
  return `verification/${userId}/${submissionTs}/${file}`;
}

export function captureSessionImageKey(
  userId: string,
  sessionId: string,
  slot: VerificationCaptureSlot
): string {
  const file =
    slot === "selfie"
      ? "selfie.jpg"
      : slot === "id-front"
        ? "id-front.jpg"
        : "id-back.jpg";
  return `verification/${userId}/capture-sessions/${sessionId}/${file}`;
}

export function validateVerificationImage(
  buffer: Buffer,
  mimetype: string
): void {
  if (!buffer?.length) {
    throw new Error("Missing image.");
  }
  if (buffer.length > VERIFICATION_IMAGE_MAX_BYTES) {
    throw new Error("Image is too large (max 5 MB).");
  }
  const ct = mimetype.toLowerCase().split(";")[0]?.trim() ?? "";
  if (!ALLOWED_IMAGE_TYPES.has(ct)) {
    throw new Error("Only camera images (JPEG, PNG, WebP) are accepted.");
  }
}

export function parseCaptureSlot(raw: string): VerificationCaptureSlot | null {
  if (raw === "selfie" || raw === "id-front" || raw === "id-back") return raw;
  return null;
}

export function slotColumn(
  slot: VerificationCaptureSlot
): "selfieKey" | "idFrontKey" | "idBackKey" {
  if (slot === "selfie") return "selfieKey";
  if (slot === "id-front") return "idFrontKey";
  return "idBackKey";
}
