import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { DrizzleDb } from "../database/database.module";
import { DRIZZLE } from "../database/database.module";
import * as schema from "../database/schema";
import { formatMysqlDateTimeUtc } from "../common/mysql-datetime";
import { normalizeUgandaMsisdnForNetworks } from "../payments/phone";
import { MailService } from "../integrations/mail.service";
import {
  generateWalletOtpCode,
  hashWalletOtp,
  maskEmail,
  WALLET_OTP_MAX_ATTEMPTS,
  walletOtpExpiresAt,
} from "./wallet-otp.util";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../audit/audit-actions";
import { msisdnLast4 } from "../audit/audit-metadata";
import { VerificationService } from "../verification/verification.service";

export type PayoutMethodType = "mtn_momo" | "airtel_momo" | "bank";

type ParsedMethodFields = {
  type: PayoutMethodType;
  label: string;
  msisdn: string | null;
  accountNumber: string | null;
  bankName: string | null;
  branch: string | null;
  swift: string | null;
};

@Injectable()
export class PayoutMethodsService {
  private readonly otpTtlSec: number;
  private readonly resendThrottleSec: number;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly verification: VerificationService
  ) {
    this.otpTtlSec = parseInt(
      this.config.get<string>("WITHDRAW_OTP_TTL_SEC") ?? "300",
      10
    );
    this.resendThrottleSec = parseInt(
      this.config.get<string>("WITHDRAW_OTP_RESEND_SEC") ?? "45",
      10
    );
  }

  async list(userId: string) {
    if (!(await this.verification.isAccountVerified(userId))) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(schema.payoutMethods)
      .where(eq(schema.payoutMethods.userId, userId));
    return rows.map((r) => this.toDto(r));
  }

  private parseMethodFields(body: {
    type: PayoutMethodType;
    label?: string;
    msisdn?: string;
    accountNumber?: string;
    bankName?: string;
    branch?: string;
    swift?: string;
  }): ParsedMethodFields {
    const type = body.type;
    let label = body.label?.trim() ?? "";
    let msisdn: string | null = null;
    let accountNumber: string | null = null;
    let bankName: string | null = null;
    let branch: string | null = null;
    let swift: string | null = null;

    if (type === "mtn_momo" || type === "airtel_momo") {
      const networks =
        type === "mtn_momo" ? (["mtn"] as const) : (["airtel"] as const);
      if (!body.msisdn?.trim()) {
        throw new BadRequestException("Phone number is required.");
      }
      msisdn = normalizeUgandaMsisdnForNetworks(body.msisdn, networks);
      if (!msisdn) {
        const networkName = type === "mtn_momo" ? "MTN" : "Airtel";
        throw new BadRequestException(
          `Enter a valid ${networkName} Uganda number (e.g. 07... or 256...).`
        );
      }
      if (!label) {
        label = type === "mtn_momo" ? "MTN Mobile Money" : "Airtel Money";
      }
    } else if (type === "bank") {
      if (!body.accountNumber?.trim() || !body.bankName?.trim()) {
        throw new BadRequestException(
          "Account number and bank name are required."
        );
      }
      accountNumber = body.accountNumber.trim();
      bankName = body.bankName.trim();
      branch = body.branch?.trim() ?? null;
      swift = body.swift?.trim() ?? null;
      if (!label) label = bankName;
    } else {
      throw new BadRequestException("Invalid payout method type.");
    }

    return { type, label, msisdn, accountNumber, bankName, branch, swift };
  }

  private destinationLine(fields: ParsedMethodFields): string {
    if (fields.type === "bank") {
      return [fields.accountNumber, fields.branch, fields.swift]
        .filter(Boolean)
        .join(" · ");
    }
    return fields.msisdn ?? fields.label;
  }

  /** Payout methods are provisioned on account verification approval. */
  async initiateAdd(
    _userId: string,
    _userEmail: string,
    _body: {
      type: PayoutMethodType;
      label?: string;
      msisdn?: string;
      accountNumber?: string;
      bankName?: string;
      branch?: string;
      swift?: string;
      isDefault?: boolean;
    }
  ) {
    throw new ForbiddenException({
      message:
        "Withdraw methods are set from your verified phone number after account verification.",
      code: "payout_method_add_disabled",
    });
  }

  async resendAddOtp(
    userId: string,
    userEmail: string,
    pendingId: string
  ) {
    const pending = await this.getPendingForUser(userId, pendingId);
    const latestOtp = await this.db
      .select()
      .from(schema.payoutMethodOtps)
      .where(eq(schema.payoutMethodOtps.pendingId, pendingId))
      .orderBy(desc(schema.payoutMethodOtps.createdAt))
      .limit(1);

    if (latestOtp[0]) {
      const created = new Date(latestOtp[0].createdAt.replace(" ", "T") + "Z");
      const elapsed = (Date.now() - created.getTime()) / 1000;
      if (elapsed < this.resendThrottleSec) {
        throw new BadRequestException(
          `Please wait ${Math.ceil(this.resendThrottleSec - elapsed)} seconds before resending.`
        );
      }
    }

    const fields: ParsedMethodFields = {
      type: pending.type as PayoutMethodType,
      label: pending.label,
      msisdn: pending.msisdn,
      accountNumber: pending.accountNumber,
      bankName: pending.bankName,
      branch: pending.branch,
      swift: pending.swift,
    };
    await this.sendAddOtp(pendingId, userEmail, fields);
    return { ok: true, resendAvailableInSec: this.resendThrottleSec };
  }

  async verifyAddOtp(userId: string, pendingId: string, code: string) {
    await this.getPendingForUser(userId, pendingId);

    const otpRows = await this.db
      .select()
      .from(schema.payoutMethodOtps)
      .where(eq(schema.payoutMethodOtps.pendingId, pendingId))
      .orderBy(desc(schema.payoutMethodOtps.createdAt))
      .limit(1);
    const otp = otpRows[0];
    if (!otp) throw new BadRequestException("OTP not found.");

    const now = new Date();
    const expires = new Date(otp.expiresAt.replace(" ", "T") + "Z");
    if (now > expires) {
      await this.deletePending(pendingId);
      throw new BadRequestException("OTP expired. Please add the method again.");
    }

    if (otp.attempts >= WALLET_OTP_MAX_ATTEMPTS) {
      await this.deletePending(pendingId);
      throw new BadRequestException("Too many attempts.");
    }

    const ok = hashWalletOtp(code.trim()) === otp.codeHash;
    await this.db
      .update(schema.payoutMethodOtps)
      .set({ attempts: otp.attempts + 1 })
      .where(eq(schema.payoutMethodOtps.id, otp.id));

    if (!ok) {
      throw new BadRequestException("Invalid OTP.");
    }

    await this.db
      .update(schema.payoutMethodOtps)
      .set({ verifiedAt: formatMysqlDateTimeUtc(now) })
      .where(eq(schema.payoutMethodOtps.id, otp.id));

    const pending = await this.getPendingForUser(userId, pendingId);
    const method = await this.insertMethod(userId, {
      type: pending.type as PayoutMethodType,
      label: pending.label,
      msisdn: pending.msisdn,
      accountNumber: pending.accountNumber,
      bankName: pending.bankName,
      branch: pending.branch,
      swift: pending.swift,
      isDefault: !!pending.isDefault,
    });

    await this.deletePending(pendingId);
    this.audit.logUserAction(
      userId,
      AuditAction.wallet.payoutMethodAdded,
      { type: "payout_method", id: method.id },
      {
        methodId: method.id,
        network: method.type,
        ...(method.msisdn ? { msisdnLast4: msisdnLast4(method.msisdn) } : {}),
      }
    );
    return { method };
  }

  private async sendAddOtp(
    pendingId: string,
    email: string,
    fields: ParsedMethodFields
  ) {
    const code = generateWalletOtpCode();
    const now = formatMysqlDateTimeUtc(new Date());

    await this.db.insert(schema.payoutMethodOtps).values({
      id: randomUUID(),
      pendingId,
      codeHash: hashWalletOtp(code),
      expiresAt: walletOtpExpiresAt(this.otpTtlSec),
      attempts: 0,
      verifiedAt: null,
      createdAt: now,
    });

    await this.mail.sendPayoutMethodOtp(email, code, {
      methodLabel: fields.label,
      destination: this.destinationLine(fields),
    });
  }

  private async insertMethod(
    userId: string,
    input: ParsedMethodFields & { isDefault?: boolean }
  ) {
    const id = randomUUID();
    const now = formatMysqlDateTimeUtc(new Date());

    if (input.isDefault) {
      await this.db
        .update(schema.payoutMethods)
        .set({ isDefault: 0 })
        .where(eq(schema.payoutMethods.userId, userId));
    }

    const isFirst =
      (
        await this.db
          .select({ id: schema.payoutMethods.id })
          .from(schema.payoutMethods)
          .where(eq(schema.payoutMethods.userId, userId))
          .limit(1)
      ).length === 0;

    await this.db.insert(schema.payoutMethods).values({
      id,
      userId,
      type: input.type,
      label: input.label,
      msisdn: input.msisdn,
      accountNumber: input.accountNumber,
      bankName: input.bankName,
      branch: input.branch,
      swift: input.swift,
      isDefault: input.isDefault || isFirst ? 1 : 0,
      createdAt: now,
    });

    const rows = await this.db
      .select()
      .from(schema.payoutMethods)
      .where(eq(schema.payoutMethods.id, id))
      .limit(1);
    return this.toDto(rows[0]!);
  }

  async update(
    userId: string,
    methodId: string,
    _body: {
      label?: string;
      msisdn?: string;
      accountNumber?: string;
      bankName?: string;
      branch?: string;
      swift?: string;
      isDefault?: boolean;
    }
  ) {
    void userId;
    void methodId;
    throw new ForbiddenException({
      message: "Verified withdraw methods cannot be edited.",
      code: "payout_method_edit_disabled",
    });
  }

  async delete(userId: string, methodId: string) {
    void userId;
    void methodId;
    throw new ForbiddenException({
      message: "Verified withdraw methods cannot be removed.",
      code: "payout_method_delete_disabled",
    });
  }

  async getForUser(userId: string, methodId: string) {
    const rows = await this.db
      .select()
      .from(schema.payoutMethods)
      .where(
        and(
          eq(schema.payoutMethods.id, methodId),
          eq(schema.payoutMethods.userId, userId)
        )
      )
      .limit(1);
    if (!rows[0]) throw new NotFoundException("Payout method not found.");
    return rows[0];
  }

  private async getPendingForUser(userId: string, pendingId: string) {
    const rows = await this.db
      .select()
      .from(schema.payoutMethodPending)
      .where(
        and(
          eq(schema.payoutMethodPending.id, pendingId),
          eq(schema.payoutMethodPending.userId, userId)
        )
      )
      .limit(1);
    if (!rows[0]) {
      throw new NotFoundException("Payout method request not found.");
    }
    return rows[0];
  }

  private async deletePending(pendingId: string) {
    await this.db
      .delete(schema.payoutMethodOtps)
      .where(eq(schema.payoutMethodOtps.pendingId, pendingId));
    await this.db
      .delete(schema.payoutMethodPending)
      .where(eq(schema.payoutMethodPending.id, pendingId));
  }

  private toDto(r: typeof schema.payoutMethods.$inferSelect) {
    return {
      id: r.id,
      userId: r.userId,
      type: r.type as PayoutMethodType,
      label: r.label,
      msisdn: r.msisdn,
      accountNumber: r.accountNumber,
      bankName: r.bankName,
      branch: r.branch,
      swift: r.swift,
      isDefault: !!r.isDefault,
      detailLine: this.detailLine(r),
    };
  }

  private detailLine(r: typeof schema.payoutMethods.$inferSelect): string {
    if (r.type === "bank") {
      const parts = [r.accountNumber, r.branch, r.swift].filter(Boolean);
      return parts.join(" · ");
    }
    return r.msisdn ?? "";
  }
}
