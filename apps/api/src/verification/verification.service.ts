import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { and, eq, gt, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { DrizzleDb } from "../database/database.module";
import { DRIZZLE } from "../database/database.module";
import * as schema from "../database/schema";
import { formatMysqlDateTimeUtc } from "../common/mysql-datetime";
import { normalizeUgandaMsisdnForNetworks } from "../payments/phone";
import { StorageService } from "../integrations/storage.service";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../audit/audit-actions";
import {
  autoEnrollAfterEmailVerification,
  canSubmitVerification,
  getVerificationForShow,
  getVerificationStatusForUser,
} from "./verification-admin";
import {
  isVerificationReviewSlot,
  verifyVerificationReviewToken,
} from "./verification-review-token";
import type {
  AccountVerificationStatus,
  CaptureSessionCreateDto,
  CaptureSessionPollDto,
  PublicCaptureStatusDto,
  VerificationCaptureSlot,
  VerificationStatusDto,
} from "./verification.types";
import {
  CAPTURE_SESSION_TTL_MIN,
  VERIFICATION_IMAGE_MAX_BYTES,
} from "./verification.types";
import {
  captureSessionImageKey,
  generateCaptureToken,
  hashVerificationToken,
  maskLegalName,
  maskPhoneMsisdn,
  parseCaptureSlot,
  slotColumn,
  validateVerificationImage,
  verificationImageKey,
} from "./verification.util";

@Injectable()
export class VerificationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
    private readonly audit: AuditService
  ) {}

  private appBaseUrl(): string {
    const fromEnv =
      this.config.get<string>("app.nextPublicAppUrl")?.trim() ||
      this.config.get<string>("app.webOrigin")?.trim();
    return (fromEnv || "http://localhost:3000").replace(/\/+$/, "");
  }

  async isAccountVerified(userId: string): Promise<boolean> {
    const rows = await this.db
      .select({ accountVerifiedAt: schema.users.accountVerifiedAt })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    return !!rows[0]?.accountVerifiedAt;
  }

  async assertAccountVerified(userId: string): Promise<void> {
    if (!(await this.isAccountVerified(userId))) {
      throw new ForbiddenException({
        message: "Account verification is required to withdraw.",
        code: "account_not_verified",
      });
    }
  }

  /** Called when email verification completes (or is already complete). */
  async enrollOnEmailVerified(userId: string): Promise<void> {
    const enrolled = await autoEnrollAfterEmailVerification(this.db, userId);
    if (enrolled) {
      this.audit.logUserAction(
        userId,
        AuditAction.verification.enrolled,
        { type: "account_verification", id: userId },
        { source: "email_verified" }
      );
    }
  }

  async getAuthVerificationFields(userId: string): Promise<{
    accountVerified: boolean;
    accountVerificationStatus: AccountVerificationStatus;
    accountVerificationRejectionReason?: string;
  }> {
    const status = await this.getStatus(userId);
    return {
      accountVerified: status.status === "verified",
      accountVerificationStatus: status.status,
      accountVerificationRejectionReason:
        status.rejectionReason ?? undefined,
    };
  }

  async getStatus(userId: string): Promise<VerificationStatusDto> {
    const userRows = await this.db
      .select({ accountVerifiedAt: schema.users.accountVerifiedAt })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (userRows[0]?.accountVerifiedAt) {
      const current = await getVerificationStatusForUser(this.db, userId);
      if (current === "none") {
        await this.enrollOnEmailVerified(userId);
      }
    }

    const rows = await this.db
      .select({
        status: schema.accountVerifications.status,
        rejectionReason: schema.accountVerifications.rejectionReason,
        legalName: schema.accountVerifications.legalName,
        phoneMsisdn: schema.accountVerifications.phoneMsisdn,
        submittedAt: schema.accountVerifications.submittedAt,
      })
      .from(schema.accountVerifications)
      .where(eq(schema.accountVerifications.userId, userId))
      .limit(1);

    const row = rows[0];
    const status = (row?.status ??
      "none") as AccountVerificationStatus;

    return {
      status,
      rejectionReason: row?.rejectionReason ?? null,
      legalNameMasked: maskLegalName(row?.legalName),
      phoneMasked: maskPhoneMsisdn(row?.phoneMsisdn),
      submittedAt: row?.submittedAt ?? null,
      verifiedAt: userRows[0]?.accountVerifiedAt ?? null,
    };
  }

  private async requireSubmittable(userId: string): Promise<void> {
    const status = await getVerificationStatusForUser(this.db, userId);
    if (canSubmitVerification(status)) return;
    throw new ForbiddenException({
      message:
        status === "none"
          ? "You are not enrolled for account verification yet. Contact support."
          : status === "pending_review"
            ? "Your submission is under review."
            : "Account is already verified.",
      code: "not_enrolled",
    });
  }

  async createCaptureSession(userId: string): Promise<CaptureSessionCreateDto> {
    await this.requireSubmittable(userId);
    if (!this.storage.isConfigured()) {
      throw new BadRequestException("Image storage is not configured.");
    }

    const now = new Date();
    const nowStr = formatMysqlDateTimeUtc(now);
    const expires = new Date(now.getTime() + CAPTURE_SESSION_TTL_MIN * 60_000);
    const expiresStr = formatMysqlDateTimeUtc(expires);

    await this.db
      .update(schema.verificationCaptureSessions)
      .set({ consumedAt: nowStr })
      .where(
        and(
          eq(schema.verificationCaptureSessions.userId, userId),
          isNull(schema.verificationCaptureSessions.consumedAt),
          gt(schema.verificationCaptureSessions.expiresAt, nowStr)
        )
      );

    const sessionId = randomUUID();
    const rawToken = generateCaptureToken();
    const tokenHash = hashVerificationToken(rawToken);

    await this.db.insert(schema.verificationCaptureSessions).values({
      id: sessionId,
      userId,
      tokenHash,
      expiresAt: expiresStr,
      createdAt: nowStr,
    });

    return {
      sessionId,
      captureUrl: `${this.appBaseUrl()}/verify-capture/${rawToken}`,
      expiresAt: expiresStr,
    };
  }

  async getCaptureSession(
    userId: string,
    sessionId: string
  ): Promise<CaptureSessionPollDto> {
    const rows = await this.db
      .select()
      .from(schema.verificationCaptureSessions)
      .where(
        and(
          eq(schema.verificationCaptureSessions.id, sessionId),
          eq(schema.verificationCaptureSessions.userId, userId)
        )
      )
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException("Capture session not found.");

    const selfie = !!row.selfieKey;
    const idFront = !!row.idFrontKey;
    const idBack = !!row.idBackKey;

    return {
      sessionId: row.id,
      selfie,
      idFront,
      idBack,
      complete: selfie && idFront && idBack,
      expiresAt: row.expiresAt,
    };
  }

  async submit(
    userId: string,
    body: {
      legalName: string;
      phone: string;
      captureSessionId?: string;
      selfie?: Buffer;
      idFront?: Buffer;
      idBack?: Buffer;
      selfieType?: string;
      idFrontType?: string;
      idBackType?: string;
    }
  ): Promise<{ ok: true }> {
    await this.requireSubmittable(userId);
    if (!this.storage.isConfigured()) {
      throw new BadRequestException("Image storage is not configured.");
    }

    const legalName = body.legalName?.trim();
    if (!legalName || legalName.length > 255) {
      throw new BadRequestException("Enter your full legal name as on your ID.");
    }

    const phoneMsisdn = normalizeUgandaMsisdnForNetworks(body.phone, [
      "mtn",
      "airtel",
    ]);
    if (!phoneMsisdn) {
      throw new BadRequestException(
        "Enter a valid MTN or Airtel Uganda number registered in your name."
      );
    }

    let selfieKey: string;
    let idFrontKey: string;
    let idBackKey: string;

    if (body.captureSessionId) {
      const keys = await this.resolveCaptureSessionKeys(
        userId,
        body.captureSessionId
      );
      selfieKey = keys.selfieKey;
      idFrontKey = keys.idFrontKey;
      idBackKey = keys.idBackKey;
    } else {
      if (!body.selfie || !body.idFront || !body.idBack) {
        throw new BadRequestException("All three camera images are required.");
      }
      validateVerificationImage(body.selfie, body.selfieType ?? "image/jpeg");
      validateVerificationImage(body.idFront, body.idFrontType ?? "image/jpeg");
      validateVerificationImage(body.idBack, body.idBackType ?? "image/jpeg");

      const submissionTs = formatMysqlDateTimeUtc(new Date()).replace(
        /[:.]/g,
        ""
      );
      selfieKey = verificationImageKey(userId, submissionTs, "selfie");
      idFrontKey = verificationImageKey(userId, submissionTs, "id-front");
      idBackKey = verificationImageKey(userId, submissionTs, "id-back");

      await this.storage.putObject(
        selfieKey,
        body.selfie,
        body.selfieType ?? "image/jpeg"
      );
      await this.storage.putObject(
        idFrontKey,
        body.idFront,
        body.idFrontType ?? "image/jpeg"
      );
      await this.storage.putObject(
        idBackKey,
        body.idBack,
        body.idBackType ?? "image/jpeg"
      );
    }

    const now = formatMysqlDateTimeUtc(new Date());
    const existing = await this.db
      .select()
      .from(schema.accountVerifications)
      .where(eq(schema.accountVerifications.userId, userId))
      .limit(1);

    if (existing[0]) {
      await this.db
        .update(schema.accountVerifications)
        .set({
          status: "pending_review",
          legalName,
          phoneMsisdn,
          selfieKey,
          idFrontKey,
          idBackKey,
          rejectionReason: null,
          submittedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.accountVerifications.userId, userId));
    } else {
      await this.db.insert(schema.accountVerifications).values({
        userId,
        status: "pending_review",
        legalName,
        phoneMsisdn,
        selfieKey,
        idFrontKey,
        idBackKey,
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (body.captureSessionId) {
      await this.db
        .update(schema.verificationCaptureSessions)
        .set({ consumedAt: now })
        .where(eq(schema.verificationCaptureSessions.id, body.captureSessionId));
    }

    this.audit.logUserAction(userId, AuditAction.verification.submitted, {
      type: "account_verification",
      id: userId,
    });

    return { ok: true };
  }

  private async resolveCaptureSessionKeys(
    userId: string,
    sessionId: string
  ): Promise<{ selfieKey: string; idFrontKey: string; idBackKey: string }> {
    const rows = await this.db
      .select()
      .from(schema.verificationCaptureSessions)
      .where(
        and(
          eq(schema.verificationCaptureSessions.id, sessionId),
          eq(schema.verificationCaptureSessions.userId, userId)
        )
      )
      .limit(1);
    const row = rows[0];
    if (!row) throw new BadRequestException("Invalid capture session.");
    if (row.consumedAt) {
      throw new BadRequestException("Capture session already used.");
    }
    const nowStr = formatMysqlDateTimeUtc(new Date());
    if (row.expiresAt <= nowStr) {
      throw new BadRequestException("Capture session expired.");
    }
    if (!row.selfieKey || !row.idFrontKey || !row.idBackKey) {
      throw new BadRequestException(
        "Complete all captures on your phone before submitting."
      );
    }

    const submissionTs = formatMysqlDateTimeUtc(new Date()).replace(/[:.]/g, "");
    const selfieKey = verificationImageKey(userId, submissionTs, "selfie");
    const idFrontKey = verificationImageKey(userId, submissionTs, "id-front");
    const idBackKey = verificationImageKey(userId, submissionTs, "id-back");

    for (const [src, dest] of [
      [row.selfieKey, selfieKey],
      [row.idFrontKey, idFrontKey],
      [row.idBackKey, idBackKey],
    ] as const) {
      const buf = await this.storage.getObjectBuffer(src);
      if (!buf) throw new BadRequestException("Capture image missing.");
      await this.storage.putObject(dest, buf, "image/jpeg");
    }

    return { selfieKey, idFrontKey, idBackKey };
  }

  async getPublicCaptureStatus(token: string): Promise<PublicCaptureStatusDto> {
    const row = await this.findSessionByToken(token);
    if (!row) {
      return {
        valid: false,
        expiresAt: null,
        slots: { selfie: false, idFront: false, idBack: false },
      };
    }
    const nowStr = formatMysqlDateTimeUtc(new Date());
    if (row.expiresAt <= nowStr || row.consumedAt) {
      return {
        valid: false,
        expiresAt: row.expiresAt,
        slots: {
          selfie: !!row.selfieKey,
          idFront: !!row.idFrontKey,
          idBack: !!row.idBackKey,
        },
      };
    }

    const verificationStatus = await getVerificationStatusForUser(
      this.db,
      row.userId
    );
    if (!canSubmitVerification(verificationStatus)) {
      return {
        valid: false,
        expiresAt: row.expiresAt,
        slots: {
          selfie: !!row.selfieKey,
          idFront: !!row.idFrontKey,
          idBack: !!row.idBackKey,
        },
      };
    }

    return {
      valid: true,
      expiresAt: row.expiresAt,
      slots: {
        selfie: !!row.selfieKey,
        idFront: !!row.idFrontKey,
        idBack: !!row.idBackKey,
      },
    };
  }

  async uploadPublicCaptureSlot(
    token: string,
    slotRaw: string,
    buffer: Buffer,
    mimetype: string
  ): Promise<{ ok: true }> {
    const slot = parseCaptureSlot(slotRaw);
    if (!slot) throw new BadRequestException("Invalid capture slot.");

    const row = await this.findSessionByToken(token);
    if (!row) throw new NotFoundException("Invalid or expired capture link.");
    const nowStr = formatMysqlDateTimeUtc(new Date());
    if (row.expiresAt <= nowStr || row.consumedAt) {
      throw new BadRequestException("Capture link expired.");
    }

    const verificationStatus = await getVerificationStatusForUser(
      this.db,
      row.userId
    );
    if (!canSubmitVerification(verificationStatus)) {
      throw new ForbiddenException("Verification is not available.");
    }

    if (!this.storage.isConfigured()) {
      throw new BadRequestException("Image storage is not configured.");
    }

    try {
      validateVerificationImage(buffer, mimetype);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : "Invalid image."
      );
    }

    const key = captureSessionImageKey(row.userId, row.id, slot);
    await this.storage.putObject(key, buffer, mimetype);

    const col = slotColumn(slot);
    await this.db
      .update(schema.verificationCaptureSessions)
      .set({ [col]: key })
      .where(eq(schema.verificationCaptureSessions.id, row.id));

    return { ok: true };
  }

  async streamReviewImage(
    userId: string,
    slotRaw: string,
    expRaw: string,
    sig: string
  ) {
    if (!isVerificationReviewSlot(slotRaw)) {
      throw new BadRequestException("Invalid image slot.");
    }
    const exp = Number(expRaw);
    const secret = this.config.get<string>("app.internalProxySecret") ?? "";
    if (
      !verifyVerificationReviewToken(userId, slotRaw, exp, sig, secret)
    ) {
      throw new ForbiddenException("Invalid or expired link.");
    }

    const row = await getVerificationForShow(this.db, userId);
    if (!row) throw new NotFoundException();

    const keyBySlot = {
      selfie: row.selfieKey,
      idFront: row.idFrontKey,
      idBack: row.idBackKey,
    } as const;
    const key = keyBySlot[slotRaw];
    if (!key) throw new NotFoundException();

    const obj = await this.storage.getObjectStream(key);
    if (!obj) throw new NotFoundException();
    return obj;
  }

  private async findSessionByToken(token: string) {
    if (!token?.trim()) return null;
    const tokenHash = hashVerificationToken(token.trim());
    const rows = await this.db
      .select()
      .from(schema.verificationCaptureSessions)
      .where(eq(schema.verificationCaptureSessions.tokenHash, tokenHash))
      .limit(1);
    return rows[0] ?? null;
  }
}

export { VERIFICATION_IMAGE_MAX_BYTES };
