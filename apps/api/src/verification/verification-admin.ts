import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { DrizzleDb } from "../database/database.module";
import * as schema from "../database/schema";
import { formatMysqlDateTimeUtc } from "../common/mysql-datetime";
import {
  isAirtelUgandaMsisdn,
  isMtnUgandaMsisdn,
} from "../payments/phone";
import type { AccountVerificationStatus } from "./verification.types";
import {
  buildVerificationReviewImageUrl,
  type VerificationReviewSlot,
} from "./verification-review-token";

export async function getVerificationStatusForUser(
  db: DrizzleDb,
  userId: string
): Promise<AccountVerificationStatus> {
  const rows = await db
    .select({ status: schema.accountVerifications.status })
    .from(schema.accountVerifications)
    .where(eq(schema.accountVerifications.userId, userId))
    .limit(1);
  const s = rows[0]?.status;
  if (
    s === "enrolled" ||
    s === "pending_review" ||
    s === "verified" ||
    s === "rejected"
  ) {
    return s;
  }
  return "none";
}

export function canSubmitVerification(
  status: AccountVerificationStatus
): boolean {
  return status === "enrolled" || status === "rejected";
}

export async function enrollUserVerification(
  db: DrizzleDb,
  userId: string,
  reviewer: string
): Promise<void> {
  const userRows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!userRows[0]) throw new Error(`User not found: ${userId}`);

  const current = await getVerificationStatusForUser(db, userId);
  if (current === "pending_review") {
    throw new Error("User has a pending submission; cannot enroll.");
  }
  if (current === "verified") {
    throw new Error("User is already verified.");
  }
  if (current !== "none" && current !== "rejected") {
    throw new Error(`Cannot enroll from status: ${current}`);
  }

  const now = formatMysqlDateTimeUtc(new Date());
  const existing = await db
    .select()
    .from(schema.accountVerifications)
    .where(eq(schema.accountVerifications.userId, userId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(schema.accountVerifications)
      .set({
        status: "enrolled",
        rejectionReason: null,
        legalName: null,
        phoneMsisdn: null,
        selfieKey: null,
        idFrontKey: null,
        idBackKey: null,
        submittedAt: null,
        reviewedAt: null,
        reviewedBy: reviewer,
        updatedAt: now,
      })
      .where(eq(schema.accountVerifications.userId, userId));
  } else {
    await db.insert(schema.accountVerifications).values({
      userId,
      status: "enrolled",
      createdAt: now,
      updatedAt: now,
      reviewedBy: reviewer,
    });
  }
}

/** Enroll for account verification after email is verified; no-op if already enrolled or past that stage. */
export async function autoEnrollAfterEmailVerification(
  db: DrizzleDb,
  userId: string
): Promise<boolean> {
  const current = await getVerificationStatusForUser(db, userId);
  if (
    current === "enrolled" ||
    current === "pending_review" ||
    current === "verified"
  ) {
    return false;
  }
  await enrollUserVerification(db, userId, "system:email_verified");
  return true;
}

export async function provisionVerifiedPayoutMethod(
  db: DrizzleDb,
  userId: string,
  legalName: string,
  phoneMsisdn: string
): Promise<void> {
  const type = isMtnUgandaMsisdn(phoneMsisdn)
    ? "mtn_momo"
    : isAirtelUgandaMsisdn(phoneMsisdn)
      ? "airtel_momo"
      : null;
  if (!type) {
    throw new Error(`Unsupported phone network for payout: ${phoneMsisdn}`);
  }

  await db
    .delete(schema.payoutMethods)
    .where(eq(schema.payoutMethods.userId, userId));

  const now = formatMysqlDateTimeUtc(new Date());
  await db.insert(schema.payoutMethods).values({
    id: randomUUID(),
    userId,
    type,
    label: legalName.trim() || (type === "mtn_momo" ? "MTN Mobile Money" : "Airtel Money"),
    msisdn: phoneMsisdn,
    accountNumber: null,
    bankName: null,
    branch: null,
    swift: null,
    isDefault: 1,
    createdAt: now,
  });
}

export async function approveUserVerification(
  db: DrizzleDb,
  userId: string,
  reviewer: string
): Promise<void> {
  const rows = await db
    .select()
    .from(schema.accountVerifications)
    .where(eq(schema.accountVerifications.userId, userId))
    .limit(1);
  const row = rows[0];
  if (!row || row.status !== "pending_review") {
    throw new Error("User is not pending review.");
  }
  if (!row.legalName?.trim() || !row.phoneMsisdn?.trim()) {
    throw new Error("Submission is missing legal name or phone.");
  }
  if (!row.selfieKey || !row.idFrontKey || !row.idBackKey) {
    throw new Error("Submission is missing verification images.");
  }

  const now = formatMysqlDateTimeUtc(new Date());
  await db
    .update(schema.accountVerifications)
    .set({
      status: "verified",
      reviewedAt: now,
      reviewedBy: reviewer,
      updatedAt: now,
      rejectionReason: null,
    })
    .where(eq(schema.accountVerifications.userId, userId));

  await db
    .update(schema.users)
    .set({ accountVerifiedAt: now })
    .where(eq(schema.users.id, userId));

  await provisionVerifiedPayoutMethod(
    db,
    userId,
    row.legalName,
    row.phoneMsisdn
  );
}

export async function rejectUserVerification(
  db: DrizzleDb,
  userId: string,
  reason: string,
  reviewer: string
): Promise<void> {
  const rows = await db
    .select()
    .from(schema.accountVerifications)
    .where(eq(schema.accountVerifications.userId, userId))
    .limit(1);
  const row = rows[0];
  if (!row || row.status !== "pending_review") {
    throw new Error("User is not pending review.");
  }
  const trimmed = reason.trim();
  if (!trimmed) throw new Error("--reason is required.");

  const now = formatMysqlDateTimeUtc(new Date());
  await db
    .update(schema.accountVerifications)
    .set({
      status: "rejected",
      rejectionReason: trimmed,
      reviewedAt: now,
      reviewedBy: reviewer,
      updatedAt: now,
    })
    .where(eq(schema.accountVerifications.userId, userId));

  await db
    .update(schema.users)
    .set({ accountVerifiedAt: null })
    .where(eq(schema.users.id, userId));
}

export async function listPendingVerifications(db: DrizzleDb) {
  return db
    .select({
      userId: schema.accountVerifications.userId,
      email: schema.users.email,
      legalName: schema.accountVerifications.legalName,
      phoneMsisdn: schema.accountVerifications.phoneMsisdn,
      submittedAt: schema.accountVerifications.submittedAt,
    })
    .from(schema.accountVerifications)
    .innerJoin(
      schema.users,
      eq(schema.users.id, schema.accountVerifications.userId)
    )
    .where(eq(schema.accountVerifications.status, "pending_review"));
}

export async function getVerificationForShow(db: DrizzleDb, userId: string) {
  const rows = await db
    .select({
      userId: schema.accountVerifications.userId,
      email: schema.users.email,
      status: schema.accountVerifications.status,
      legalName: schema.accountVerifications.legalName,
      phoneMsisdn: schema.accountVerifications.phoneMsisdn,
      submittedAt: schema.accountVerifications.submittedAt,
      selfieKey: schema.accountVerifications.selfieKey,
      idFrontKey: schema.accountVerifications.idFrontKey,
      idBackKey: schema.accountVerifications.idBackKey,
      rejectionReason: schema.accountVerifications.rejectionReason,
    })
    .from(schema.accountVerifications)
    .innerJoin(
      schema.users,
      eq(schema.users.id, schema.accountVerifications.userId)
    )
    .where(eq(schema.accountVerifications.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export function proxyReviewImageUrls(
  publicWebUrl: string,
  secret: string,
  userId: string,
  keys: {
    selfie?: string | null;
    idFront?: string | null;
    idBack?: string | null;
  },
  ttlSec = 3600
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [label, key] of [
    ["selfie", keys.selfie],
    ["idFront", keys.idFront],
    ["idBack", keys.idBack],
  ] as const) {
    out[label] = key
      ? buildVerificationReviewImageUrl(
          publicWebUrl,
          userId,
          label as VerificationReviewSlot,
          secret,
          ttlSec
        )
      : null;
  }
  return out;
}
