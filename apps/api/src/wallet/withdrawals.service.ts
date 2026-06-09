import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { eq, and, desc } from "drizzle-orm";
import { createHash, randomInt, randomUUID } from "crypto";
import type { DrizzleDb } from "../database/database.module";
import { DRIZZLE } from "../database/database.module";
import * as schema from "../database/schema";
import { formatMysqlDateTimeUtc } from "../common/mysql-datetime";
import { WalletService } from "./wallet.service";
import { PayoutMethodsService } from "./payout-methods.service";
import { computeWithdrawFees } from "./wallet-fees";
import { MailService } from "../integrations/mail.service";
import { momoDisbursementConfigFromApp } from "../payments/momo.disbursement.config";
import {
  momoDisbursementTransfer,
  momoGetDisbursementTransferStatus,
} from "../payments/momo.disbursement.client";
import { pawapayConfigFromApp } from "../payments/pawapay.config";
import {
  pawapayCheckPayoutStatus,
  pawapayInitiatePayout,
} from "../payments/pawapay.payout.client";
import {
  PaymentProcessorHttpError,
  formatProcessorExceptionForLog,
  processorUserMessage,
} from "../payments/payment-processor-error.util";
import {
  pawapayPayoutFailureMessageFromCheck,
  pawapayPayoutIdFromParsed,
  reconcilePawapayPayoutCheckResult,
} from "../payments/pawapay.payout-status.util";
import {
  resolvePawapayPayoutRecipient,
  type PawapayPayoutMethodType,
} from "../payments/pawapay.payout";
import { PaymentProcessorFactory } from "../payments/payment-processor.factory";
import { normalizeProviderPollStatus } from "../payments/payment-status";
import { maskMsisdn, shortId } from "./withdraw-log.util";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../audit/audit-actions";

const MIN_WITHDRAW_GROSS = 5000;
const MAX_OTP_ATTEMPTS = 5;

function hashOtp(code: string): string {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

function generateWithdrawReference(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const t =
    String(d.getUTCHours()).padStart(2, "0") +
    String(d.getUTCMinutes()).padStart(2, "0") +
    String(d.getUTCSeconds()).padStart(2, "0");
  return `CW-${y}-${m}${day}${t}`;
}

@Injectable()
export class WithdrawalsService {
  private readonly log = new Logger(WithdrawalsService.name);

  private readonly momoFeePercent: number;
  private readonly platformFeeRate: number;
  private readonly otpTtlSec: number;
  private readonly resendThrottleSec: number;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly wallet: WalletService,
    private readonly payoutMethods: PayoutMethodsService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly paymentProcessors: PaymentProcessorFactory,
    private readonly audit: AuditService
  ) {
    this.momoFeePercent =
      this.config.get<number>("app.fees.momoFeePercent") ?? 0.04;
    this.platformFeeRate =
      this.config.get<number>("app.fees.platformFeeRate") ?? 0.012;
    this.otpTtlSec =
      this.config.get<number>("app.withdraw.otpTtlSec") ?? 300;
    this.resendThrottleSec =
      this.config.get<number>("app.withdraw.otpResendSec") ?? 45;
  }

  quote(grossAmount: number) {
    if (!Number.isFinite(grossAmount) || grossAmount < MIN_WITHDRAW_GROSS) {
      throw new BadRequestException(
        `Minimum withdrawal is UGX ${MIN_WITHDRAW_GROSS.toLocaleString()}.`
      );
    }
    return computeWithdrawFees(
      grossAmount,
      this.momoFeePercent,
      this.platformFeeRate
    );
  }

  async initiate(
    userId: string,
    userEmail: string,
    body: {
      methodId: string;
      grossAmount: number;
      idempotencyKey?: string;
    }
  ) {
    this.log.debug(
      `initiate user=${shortId(userId)} method=${shortId(body.methodId)} gross=${body.grossAmount}`
    );
    const fees = this.quote(body.grossAmount);
    const wallet = await this.wallet.getOrCreateWallet(userId);
    if (wallet.balance < body.grossAmount) {
      this.log.warn(
        `initiate insufficient balance user=${shortId(userId)} balance=${wallet.balance} gross=${body.grossAmount}`
      );
      throw new BadRequestException("Insufficient balance.");
    }

    const method = await this.payoutMethods.getForUser(userId, body.methodId);

    if (body.idempotencyKey) {
      const existing = await this.db
        .select()
        .from(schema.withdrawals)
        .where(
          and(
            eq(schema.withdrawals.userId, userId),
            eq(schema.withdrawals.idempotencyKey, body.idempotencyKey)
          )
        )
        .limit(1);
      if (existing[0]) {
        this.log.debug(
          `initiate idempotent hit withdrawal=${shortId(existing[0].id)} ref=${existing[0].reference}`
        );
        return this.buildInitiateResponse(existing[0], method, userEmail);
      }
    }

    const id = randomUUID();
    const reference = generateWithdrawReference();
    const now = formatMysqlDateTimeUtc(new Date());

    await this.db.insert(schema.withdrawals).values({
      id,
      reference,
      userId,
      methodId: method.id,
      grossAmount: fees.grossAmount,
      momoFee: fees.momoFee,
      platformFee: fees.platformFee,
      netAmount: fees.netAmount,
      status: "pending_otp",
      failureReason: null,
      processorRef: null,
      idempotencyKey: body.idempotencyKey ?? null,
      createdAt: now,
      updatedAt: now,
    });

    await this.sendOtp(id, userEmail, fees, method.label, method.msisdn);

    const rows = await this.db
      .select()
      .from(schema.withdrawals)
      .where(eq(schema.withdrawals.id, id))
      .limit(1);
    this.log.debug(
      `initiate ok withdrawal=${shortId(id)} ref=${reference} net=${fees.netAmount} methodType=${method.type} msisdn=${maskMsisdn(method.msisdn)}`
    );
    this.audit.logUserAction(
      userId,
      AuditAction.wallet.withdrawalInitiated,
      { type: "withdrawal", id },
      {
        withdrawalId: id,
        amount: fees.grossAmount,
        currency: "UGX",
        methodId: method.id,
      }
    );
    return this.buildInitiateResponse(rows[0]!, method, userEmail);
  }

  private async sendOtp(
    withdrawalId: string,
    email: string,
    fees: ReturnType<typeof computeWithdrawFees>,
    methodLabel: string,
    msisdn: string | null
  ) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const expiresAt = formatMysqlDateTimeUtc(
      new Date(Date.now() + this.otpTtlSec * 1000)
    );
    const now = formatMysqlDateTimeUtc(new Date());

    await this.db.insert(schema.withdrawalOtps).values({
      id: randomUUID(),
      withdrawalId,
      codeHash: hashOtp(code),
      expiresAt,
      attempts: 0,
      verifiedAt: null,
      createdAt: now,
    });

    await this.mail.sendWithdrawalOtp(email, code, {
      grossAmount: fees.grossAmount,
      netAmount: fees.netAmount,
      methodLabel,
      destination: msisdn ?? methodLabel,
    });
  }

  async resendOtp(userId: string, userEmail: string, withdrawalId: string) {
    this.log.debug(
      `resendOtp withdrawal=${shortId(withdrawalId)} user=${shortId(userId)}`
    );
    const w = await this.getWithdrawalForUser(userId, withdrawalId);
    if (w.status !== "pending_otp") {
      this.log.warn(
        `resendOtp rejected withdrawal=${shortId(withdrawalId)} status=${w.status}`
      );
      throw new BadRequestException("Withdrawal is not awaiting OTP.");
    }

    const latestOtp = await this.db
      .select()
      .from(schema.withdrawalOtps)
      .where(eq(schema.withdrawalOtps.withdrawalId, withdrawalId))
      .orderBy(desc(schema.withdrawalOtps.createdAt))
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

    const method = await this.payoutMethods.getForUser(userId, w.methodId);
    const fees = this.quote(w.grossAmount);
    await this.sendOtp(withdrawalId, userEmail, fees, method.label, method.msisdn);
    return { ok: true, resendAvailableInSec: this.resendThrottleSec };
  }

  async verifyOtp(userId: string, withdrawalId: string, code: string) {
    this.log.debug(
      `verifyOtp withdrawal=${shortId(withdrawalId)} user=${shortId(userId)}`
    );
    const w = await this.getWithdrawalForUser(userId, withdrawalId);
    if (w.status !== "pending_otp") {
      this.log.warn(
        `verifyOtp rejected withdrawal=${shortId(withdrawalId)} status=${w.status}`
      );
      throw new BadRequestException("Withdrawal is not awaiting OTP.");
    }

    const otpRows = await this.db
      .select()
      .from(schema.withdrawalOtps)
      .where(eq(schema.withdrawalOtps.withdrawalId, withdrawalId))
      .orderBy(desc(schema.withdrawalOtps.createdAt))
      .limit(1);
    const otp = otpRows[0];
    if (!otp) throw new BadRequestException("OTP not found.");

    const now = new Date();
    const expires = new Date(otp.expiresAt.replace(" ", "T") + "Z");
    if (now > expires) {
      this.log.warn(`verifyOtp expired withdrawal=${shortId(withdrawalId)}`);
      await this.failWithdrawal(w.id, userId, "OTP expired");
      throw new BadRequestException("OTP expired.");
    }

    if (otp.attempts >= MAX_OTP_ATTEMPTS) {
      this.log.warn(
        `verifyOtp max attempts withdrawal=${shortId(withdrawalId)}`
      );
      await this.failWithdrawal(w.id, userId, "Too many OTP attempts");
      throw new BadRequestException("Too many attempts.");
    }

    const ok = hashOtp(code.trim()) === otp.codeHash;
    await this.db
      .update(schema.withdrawalOtps)
      .set({ attempts: otp.attempts + 1 })
      .where(eq(schema.withdrawalOtps.id, otp.id));

    if (!ok) {
      this.log.debug(
        `verifyOtp invalid code withdrawal=${shortId(withdrawalId)} attempts=${otp.attempts + 1}`
      );
      throw new BadRequestException("Invalid OTP.");
    }

    await this.db
      .update(schema.withdrawalOtps)
      .set({ verifiedAt: formatMysqlDateTimeUtc(now) })
      .where(eq(schema.withdrawalOtps.id, otp.id));

    const method = await this.payoutMethods.getForUser(userId, w.methodId);
    const processorType = this.paymentProcessors.getProcessorType();
    this.audit.logUserAction(
      userId,
      AuditAction.wallet.withdrawalOtpVerified,
      { type: "withdrawal", id: withdrawalId },
      { withdrawalId }
    );
    this.log.debug(
      `verifyOtp ok withdrawal=${shortId(withdrawalId)} ref=${w.reference} processor=${processorType} methodType=${method.type} net=${w.netAmount} msisdn=${maskMsisdn(method.msisdn)}`
    );
    const badge =
      method.type === "bank"
        ? "out · bank"
        : "out · momo";
    const description =
      method.type === "bank"
        ? `${method.accountNumber} · ${method.branch ?? ""} · ${method.swift ?? ""}`
        : `${method.msisdn} · Withdrawal`;

    try {
      await this.db.transaction(async (tx) => {
        await this.wallet.debitForWithdrawal(tx, {
          userId,
          withdrawalId: w.id,
          grossAmount: w.grossAmount,
          title: method.label,
          description,
          badge,
        });
      });
    } catch {
      this.log.warn(
        `verifyOtp debit failed withdrawal=${shortId(withdrawalId)} gross=${w.grossAmount}`
      );
      throw new BadRequestException("Insufficient balance.");
    }

    if (method.type === "bank") {
      const updated = formatMysqlDateTimeUtc(new Date());
      await this.db
        .update(schema.withdrawals)
        .set({ status: "completed", updatedAt: updated })
        .where(eq(schema.withdrawals.id, w.id));
      const refreshed = await this.getWithdrawalForUser(userId, withdrawalId);
      this.log.debug(
        `verifyOtp bank completed withdrawal=${shortId(withdrawalId)}`
      );
      this.notifyWithdrawalCompleted(userId, refreshed, method);
      return this.buildPollSuccess(refreshed, method);
    }

    if (processorType === "pawapay") {
      return this.disburseViaPawapay(userId, withdrawalId, w, method);
    }

    return this.disburseViaMomo(userId, withdrawalId, w, method);
  }

  private async disburseViaMomo(
    userId: string,
    withdrawalId: string,
    w: typeof schema.withdrawals.$inferSelect,
    method: typeof schema.payoutMethods.$inferSelect
  ) {
    this.log.debug(
      `disburse momo withdrawal=${shortId(withdrawalId)} net=${w.netAmount} msisdn=${maskMsisdn(method.msisdn)}`
    );
    const momoConfig = momoDisbursementConfigFromApp(this.config);
    if (!momoConfig || !method.msisdn) {
      this.log.warn(
        `disburse momo not configured withdrawal=${shortId(withdrawalId)}`
      );
      await this.reverseDebitAndFail(
        w.id,
        userId,
        w.grossAmount,
        "Disbursement not configured"
      );
      throw new BadRequestException("Withdrawal disbursement is not available.");
    }

    const processorRef = randomUUID();
    const updated = formatMysqlDateTimeUtc(new Date());
    await this.db
      .update(schema.withdrawals)
      .set({
        status: "processing",
        processorRef,
        updatedAt: updated,
      })
      .where(eq(schema.withdrawals.id, w.id));

    try {
      await momoDisbursementTransfer(momoConfig, {
        referenceId: processorRef,
        amount: w.netAmount,
        currency: momoConfig.currency,
        externalId: w.reference,
        payeeMsisdn: method.msisdn,
        payerMessage: "CeremonyWallet withdrawal",
        payeeNote: w.reference,
      });
      this.log.debug(
        `disburse momo accepted withdrawal=${shortId(withdrawalId)} processorRef=${shortId(processorRef)}`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Telco error";
      this.log.warn(
        `disburse momo failed withdrawal=${shortId(withdrawalId)}: ${msg} ${formatProcessorExceptionForLog(e)}`
      );
      await this.reverseDebitAndFail(w.id, userId, w.grossAmount, msg);
      throw new BadRequestException("Withdrawal failed to start.");
    }

    return this.poll(userId, withdrawalId);
  }

  private async disburseViaPawapay(
    userId: string,
    withdrawalId: string,
    w: typeof schema.withdrawals.$inferSelect,
    method: typeof schema.payoutMethods.$inferSelect
  ) {
    this.log.debug(
      `disburse pawapay withdrawal=${shortId(withdrawalId)} net=${w.netAmount} methodType=${method.type}`
    );
    const pawapayConfig = pawapayConfigFromApp(this.config);
    if (!pawapayConfig || !method.msisdn) {
      this.log.warn(
        `disburse pawapay not configured withdrawal=${shortId(withdrawalId)}`
      );
      await this.reverseDebitAndFail(
        w.id,
        userId,
        w.grossAmount,
        "PawaPay payouts are not configured"
      );
      throw new BadRequestException("Withdrawal disbursement is not available.");
    }

    if (method.type !== "mtn_momo" && method.type !== "airtel_momo") {
      await this.reverseDebitAndFail(
        w.id,
        userId,
        w.grossAmount,
        "Unsupported payout method"
      );
      throw new BadRequestException("This payout method cannot be used with PawaPay.");
    }

    let recipient: { phoneNumber: string; provider: string };
    try {
      recipient = await resolvePawapayPayoutRecipient(
        pawapayConfig,
        method.msisdn,
        method.type as PawapayPayoutMethodType
      );
      this.log.debug(
        `disburse pawapay recipient withdrawal=${shortId(withdrawalId)} provider=${recipient.provider} phone=${maskMsisdn(recipient.phoneNumber)}`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid payout destination";
      this.log.warn(
        `disburse pawapay recipient failed withdrawal=${shortId(withdrawalId)}: ${msg} ${formatProcessorExceptionForLog(e)}`
      );
      await this.reverseDebitAndFail(w.id, userId, w.grossAmount, msg);
      throw new BadRequestException(msg);
    }

    const payoutId = randomUUID();
    const updated = formatMysqlDateTimeUtc(new Date());
    await this.db
      .update(schema.withdrawals)
      .set({
        status: "processing",
        processorRef: payoutId,
        updatedAt: updated,
      })
      .where(eq(schema.withdrawals.id, w.id));

    try {
      await pawapayInitiatePayout(pawapayConfig, {
        payoutId,
        amount: String(Math.round(w.netAmount)),
        currency: pawapayConfig.currency,
        phoneNumber: recipient.phoneNumber,
        provider: recipient.provider,
        clientReferenceId: w.reference,
        customerMessage: "CW withdrawal",
      });
      this.log.debug(
        `disburse pawapay accepted withdrawal=${shortId(withdrawalId)} payoutId=${shortId(payoutId)}`
      );
    } catch (e) {
      const fallbackMsg = processorUserMessage(e, "PawaPay payout failed");
      const verifyPayoutId =
        e instanceof PaymentProcessorHttpError
          ? (e.payoutId ??
            pawapayPayoutIdFromParsed(e.parsedBody) ??
            payoutId)
          : payoutId;
      this.log.warn(
        `disburse pawapay initiate error withdrawal=${shortId(withdrawalId)} payoutId=${shortId(verifyPayoutId)}: ${fallbackMsg} ${formatProcessorExceptionForLog(e)} — checking status`
      );
      return this.reconcilePawapayAfterInitError(
        userId,
        withdrawalId,
        w,
        pawapayConfig,
        verifyPayoutId,
        fallbackMsg
      );
    }

    return this.poll(userId, withdrawalId);
  }

  /**
   * After initiate error — GET /v2/payouts/{payoutId} before reversing wallet debit.
   * @see https://docs.pawapay.io/v2/api-reference/payouts/check-payout-status
   */
  private async reconcilePawapayAfterInitError(
    userId: string,
    withdrawalId: string,
    w: typeof schema.withdrawals.$inferSelect,
    pawapayConfig: NonNullable<ReturnType<typeof pawapayConfigFromApp>>,
    payoutId: string,
    fallbackFailMessage: string
  ) {
    try {
      const check = await pawapayCheckPayoutStatus(pawapayConfig, payoutId);
      this.log.debug(
        `pawapay reconcile check withdrawal=${shortId(withdrawalId)} payoutId=${shortId(payoutId)} wrapper=${check.status} payoutStatus=${check.data?.status ?? "—"}`
      );
      const outcome = reconcilePawapayPayoutCheckResult(
        check,
        fallbackFailMessage
      );
      if (outcome.action === "complete") {
        const updated = formatMysqlDateTimeUtc(new Date());
        await this.db
          .update(schema.withdrawals)
          .set({ status: "completed", updatedAt: updated })
          .where(eq(schema.withdrawals.id, w.id));
        this.log.debug(
          `pawapay reconcile completed withdrawal=${shortId(withdrawalId)} payoutId=${shortId(payoutId)}`
        );
        const refreshed = await this.getWithdrawalForUser(userId, withdrawalId);
        const method = await this.payoutMethods.getForUser(
          userId,
          refreshed.methodId
        );
        this.notifyWithdrawalCompleted(userId, refreshed, method);
        return this.buildPollSuccess(refreshed, method);
      }
      if (outcome.action === "fail") {
        const msg = outcome.message ?? fallbackFailMessage;
        this.log.warn(
          `pawapay reconcile fail withdrawal=${shortId(withdrawalId)} payoutId=${shortId(payoutId)}: ${msg}`
        );
        await this.reverseDebitAndFail(w.id, userId, w.grossAmount, msg);
        throw new BadRequestException(msg);
      }
      return this.poll(userId, withdrawalId);
    } catch (reconcileErr) {
      if (reconcileErr instanceof BadRequestException) throw reconcileErr;
      this.log.warn(
        `pawapay reconcile check error withdrawal=${shortId(withdrawalId)} payoutId=${shortId(payoutId)}: ${formatProcessorExceptionForLog(reconcileErr)} — leaving processing for poll`
      );
      return this.poll(userId, withdrawalId);
    }
  }

  async poll(userId: string, withdrawalId: string) {
    const w = await this.getWithdrawalForUser(userId, withdrawalId);
    const method = await this.payoutMethods.getForUser(userId, w.methodId);
    const processorType = this.paymentProcessors.getProcessorType();

    this.log.debug(
      `poll withdrawal=${shortId(withdrawalId)} dbStatus=${w.status} processor=${processorType} processorRef=${w.processorRef ? shortId(w.processorRef) : "—"}`
    );

    if (w.status === "completed") {
      this.log.debug(`poll completed withdrawal=${shortId(withdrawalId)}`);
      return this.buildPollSuccess(w, method);
    }
    if (w.status === "failed") {
      this.log.debug(
        `poll failed withdrawal=${shortId(withdrawalId)} reason=${w.failureReason ?? "—"}`
      );
      return {
        status: "FAILED" as const,
        message: w.failureReason ?? "Withdrawal failed",
      };
    }

    if (w.status === "processing" && method.type === "bank") {
      return {
        status: "PENDING" as const,
        withdrawal: this.buildPollSuccess(w, method).withdrawal,
      };
    }

    if (w.status === "processing" && w.processorRef) {
      if (processorType === "pawapay") {
        return this.pollPawapayPayout(userId, withdrawalId, w, method);
      }

      return this.pollMomoDisbursement(userId, withdrawalId, w, method);
    }

    if (w.status === "pending_otp") {
      this.log.debug(
        `poll still pending_otp withdrawal=${shortId(withdrawalId)}`
      );
      return { status: "PENDING" as const };
    }

    this.log.debug(`poll default PENDING withdrawal=${shortId(withdrawalId)}`);
    return { status: "PENDING" as const };
  }

  private async pollMomoDisbursement(
    userId: string,
    withdrawalId: string,
    w: typeof schema.withdrawals.$inferSelect,
    method: typeof schema.payoutMethods.$inferSelect
  ) {
    const momoConfig = momoDisbursementConfigFromApp(this.config);
    if (!momoConfig) {
      return { status: "PENDING" as const };
    }
    try {
      const body = await momoGetDisbursementTransferStatus(
        momoConfig,
        w.processorRef!
      );
      const { bucket, rawUpper } = normalizeProviderPollStatus(body.status);
      this.log.debug(
        `poll momo withdrawal=${shortId(withdrawalId)} rawStatus=${rawUpper} bucket=${bucket}`
      );
      if (bucket === "success") {
        const updated = formatMysqlDateTimeUtc(new Date());
        await this.db
          .update(schema.withdrawals)
          .set({ status: "completed", updatedAt: updated })
          .where(eq(schema.withdrawals.id, w.id));
        const refreshed = await this.getWithdrawalForUser(userId, withdrawalId);
        this.notifyWithdrawalCompleted(userId, refreshed, method);
        return this.buildPollSuccess(refreshed, method);
      }
      if (bucket === "failed") {
        const msg =
          body.reason?.message ?? body.reason?.code ?? "Payment failed";
        this.log.warn(
          `poll momo failed withdrawal=${shortId(withdrawalId)}: ${msg}`
        );
        await this.reverseDebitAndFail(w.id, userId, w.grossAmount, msg);
        return {
          status: "FAILED" as const,
          message: msg,
        };
      }
    } catch (e) {
      this.log.warn(
        `poll momo error withdrawal=${shortId(withdrawalId)}: ${formatProcessorExceptionForLog(e)}`
      );
      return { status: "PENDING" as const };
    }
    return { status: "PENDING" as const };
  }

  private async pollPawapayPayout(
    userId: string,
    withdrawalId: string,
    w: typeof schema.withdrawals.$inferSelect,
    method: typeof schema.payoutMethods.$inferSelect
  ) {
    const pawapayConfig = pawapayConfigFromApp(this.config);
    if (!pawapayConfig || !w.processorRef) {
      return { status: "PENDING" as const };
    }
    try {
      const check = await pawapayCheckPayoutStatus(
        pawapayConfig,
        w.processorRef
      );
      if (check.status === "NOT_FOUND") {
        return { status: "PENDING" as const };
      }
      const payoutStatus = check.data?.status;
      if (!payoutStatus) {
        this.log.debug(
          `poll pawapay no payout status withdrawal=${shortId(withdrawalId)} wrapper=${check.status}`
        );
        return { status: "PENDING" as const };
      }
      const { bucket, rawUpper } = normalizeProviderPollStatus(payoutStatus);
      this.log.debug(
        `poll pawapay withdrawal=${shortId(withdrawalId)} rawStatus=${rawUpper} bucket=${bucket} wrapper=${check.status}`
      );
      if (bucket === "success") {
        const updated = formatMysqlDateTimeUtc(new Date());
        await this.db
          .update(schema.withdrawals)
          .set({ status: "completed", updatedAt: updated })
          .where(eq(schema.withdrawals.id, w.id));
        const refreshed = await this.getWithdrawalForUser(userId, withdrawalId);
        this.notifyWithdrawalCompleted(userId, refreshed, method);
        return this.buildPollSuccess(refreshed, method);
      }
      if (bucket === "failed") {
        const msg = pawapayPayoutFailureMessageFromCheck(check, "Payout failed");
        this.log.warn(
          `poll pawapay failed withdrawal=${shortId(withdrawalId)}: ${msg}`
        );
        await this.reverseDebitAndFail(w.id, userId, w.grossAmount, msg);
        return {
          status: "FAILED" as const,
          message: msg,
        };
      }
    } catch (e) {
      this.log.warn(
        `poll pawapay error withdrawal=${shortId(withdrawalId)}: ${formatProcessorExceptionForLog(e)}`
      );
      return { status: "PENDING" as const };
    }
    return { status: "PENDING" as const };
  }

  private async failWithdrawal(
    withdrawalId: string,
    userId: string,
    reason: string
  ) {
    this.log.warn(
      `failWithdrawal withdrawal=${shortId(withdrawalId)} user=${shortId(userId)} reason=${reason}`
    );
    const updated = formatMysqlDateTimeUtc(new Date());
    await this.db
      .update(schema.withdrawals)
      .set({
        status: "failed",
        failureReason: reason,
        updatedAt: updated,
      })
      .where(
        and(
          eq(schema.withdrawals.id, withdrawalId),
          eq(schema.withdrawals.userId, userId)
        )
      );
    this.audit.logUserAction(
      userId,
      AuditAction.wallet.withdrawalFailed,
      { type: "withdrawal", id: withdrawalId },
      { withdrawalId, reason }
    );
  }

  private async reverseDebitAndFail(
    withdrawalId: string,
    userId: string,
    grossAmount: number,
    reason: string
  ) {
    this.log.warn(
      `reverseDebitAndFail withdrawal=${shortId(withdrawalId)} gross=${grossAmount} reason=${reason}`
    );
    await this.db.transaction(async (tx) => {
      await this.wallet.reverseWithdrawalDebit(tx, {
        userId,
        withdrawalId,
        grossAmount,
        title: "Withdrawal reversal",
        description: reason,
      });
    });
    await this.failWithdrawal(withdrawalId, userId, reason);
  }

  private async getWithdrawalForUser(userId: string, withdrawalId: string) {
    const rows = await this.db
      .select()
      .from(schema.withdrawals)
      .where(
        and(
          eq(schema.withdrawals.id, withdrawalId),
          eq(schema.withdrawals.userId, userId)
        )
      )
      .limit(1);
    if (!rows[0]) throw new NotFoundException("Withdrawal not found.");
    return rows[0];
  }

  private appBaseUrl(): string {
    const pub = this.config.get<string>("app.nextPublicAppUrl")?.trim();
    if (pub) return pub.replace(/\/$/, "");
    const web = this.config.get<string>("app.webOrigin")?.trim();
    return (web || "http://localhost:3000").replace(/\/$/, "");
  }

  private formatWithdrawalDate(iso: string): string {
    const d = new Date(iso.includes("T") ? iso : `${iso.replace(" ", "T")}Z`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("en-UG", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Africa/Kampala",
    });
  }

  private methodDestination(
    method: typeof schema.payoutMethods.$inferSelect
  ): string {
    if (method.type === "bank") {
      const parts = [
        method.accountNumber,
        method.branch,
        method.bankName,
      ].filter((p) => p?.trim());
      return parts.length ? parts.join(" · ") : method.label;
    }
    return method.msisdn?.trim() || method.label;
  }

  /** Email user on successful withdrawal; never throws. */
  private notifyWithdrawalCompleted(
    userId: string,
    w: typeof schema.withdrawals.$inferSelect,
    method: typeof schema.payoutMethods.$inferSelect
  ): void {
    this.audit.logSafe({
      actorType: "user",
      actorUserId: userId,
      action: AuditAction.wallet.withdrawalCompleted,
      entityType: "withdrawal",
      entityId: w.id,
      metadata: {
        withdrawalId: w.id,
        ...(w.processorRef ? { processorRef: w.processorRef } : {}),
      },
    });
    void this.sendWithdrawalCompletedEmail(userId, w, method).catch((err) => {
      this.log.warn(
        `Withdrawal notification failed withdrawal=${shortId(w.id)}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    });
  }

  private async sendWithdrawalCompletedEmail(
    userId: string,
    w: typeof schema.withdrawals.$inferSelect,
    method: typeof schema.payoutMethods.$inferSelect
  ): Promise<void> {
    const userRows = await this.db
      .select({ email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    const to = userRows[0]?.email?.trim();
    if (!to) return;

    await this.mail.sendWithdrawalCompleted(to, {
      reference: w.reference,
      completedAt: this.formatWithdrawalDate(w.updatedAt),
      methodLabel: method.label,
      methodDestination: this.methodDestination(method),
      grossAmount: w.grossAmount,
      momoFee: w.momoFee,
      platformFee: w.platformFee,
      netAmount: w.netAmount,
      accountUrl: `${this.appBaseUrl()}/app/account`,
    });
  }

  private buildInitiateResponse(
    w: typeof schema.withdrawals.$inferSelect,
    method: typeof schema.payoutMethods.$inferSelect,
    userEmail: string
  ) {
    return {
      withdrawalId: w.id,
      reference: w.reference,
      status: w.status,
      grossAmount: w.grossAmount,
      momoFee: w.momoFee,
      platformFee: w.platformFee,
      netAmount: w.netAmount,
      method: {
        id: method.id,
        type: method.type,
        label: method.label,
        detailLine:
          method.type === "bank"
            ? `${method.accountNumber} · ${method.branch ?? ""}`
            : (method.msisdn ?? ""),
      },
      otpEmailMasked: maskEmail(userEmail),
      resendAvailableInSec: this.resendThrottleSec,
    };
  }

  private buildPollSuccess(
    w: typeof schema.withdrawals.$inferSelect,
    method: typeof schema.payoutMethods.$inferSelect
  ) {
    return {
      status: "SUCCESSFUL" as const,
      withdrawal: {
        id: w.id,
        reference: w.reference,
        grossAmount: w.grossAmount,
        momoFee: w.momoFee,
        platformFee: w.platformFee,
        netAmount: w.netAmount,
        status: w.status,
        createdAt: w.createdAt,
        methodLabel: method.label,
        methodDetail:
          method.type === "bank"
            ? `${method.msisdn ?? method.accountNumber}`
            : (method.msisdn ?? ""),
        methodType: method.type,
      },
    };
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}
