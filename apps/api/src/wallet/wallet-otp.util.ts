import { createHash, randomInt } from "crypto";
import { formatMysqlDateTimeUtc } from "../common/mysql-datetime";

export const WALLET_OTP_MAX_ATTEMPTS = 5;

export function hashWalletOtp(code: string): string {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

export function generateWalletOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function walletOtpExpiresAt(ttlSec: number): string {
  return formatMysqlDateTimeUtc(new Date(Date.now() + ttlSec * 1000));
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  return `${local.slice(0, 1)}***@${domain}`;
}
