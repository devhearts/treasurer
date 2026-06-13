import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { eq, sql, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { DrizzleDb } from "../database/database.module";
import { DRIZZLE } from "../database/database.module";
import * as schema from "../database/schema";
import { PaymentProcessorFactory } from "./payment-processor.factory";
import { normalizeUgandaMsisdnForNetworks } from "./phone";
import { MOMO_PUBLIC_PAYMENT_START_FAILED } from "./momo.messages";
import type { PaymentPollResult, PaymentProcessorKind } from "./payment.types";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../audit/audit-actions";
import { WalletService } from "../wallet/wallet.service";
import { formatMysqlDateTimeUtc } from "../common/mysql-datetime";
import { normalizeProviderPollStatus } from "./payment-status";
import { ContributionNotificationsService } from "../integrations/contribution-notifications.service";
import {
  contributionBlockedMessage,
  eventAcceptsContributions,
  parseEventLifecycleStatus,
} from "../events/event-lifecycle";

function paymentNotConfiguredMessage(kind: PaymentProcessorKind): string {
  if (kind === "pawapay") return "PawaPay payments are not configured.";
  return "MoMo payments are not configured.";
}

function paymentPhoneValidationMessage(
  networks: readonly ("mtn" | "airtel")[]
): string {
  const hasMtn = networks.includes("mtn");
  const hasAirtel = networks.includes("airtel");
  const n =
    hasMtn && hasAirtel
      ? "MTN or Airtel"
      : hasMtn
        ? "MTN"
        : hasAirtel
          ? "Airtel"
          : "Mobile Money";
  return `Enter a valid ${n} Uganda number (e.g. 07... or 256...).`;
}

@Injectable()
export class PaymentsService {
  private readonly log = new Logger(PaymentsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly processors: PaymentProcessorFactory,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly walletService: WalletService,
    private readonly contributionNotifications: ContributionNotificationsService
  ) {}

  private eventCreationFee(): number {
    return this.config.get<number>("app.fees.eventCreationFee") ?? 10000;
  }

  private async appendStatus(
    referenceId: string,
    source: "poll" | "webhook",
    fromStatus: string | null,
    toStatus: string,
    meta?: Record<string, unknown>
  ) {
    await this.db.insert(schema.paymentStatusEvents).values({
      id: randomUUID(),
      referenceId,
      source,
      fromStatus,
      toStatus,
      meta: meta ?? null,
      createdAt: formatMysqlDateTimeUtc(new Date()),
    });
  }

  private async alreadyTerminalFailed(referenceId: string): Promise<boolean> {
    const rows = await this.db
      .select({ toStatus: schema.paymentStatusEvents.toStatus })
      .from(schema.paymentStatusEvents)
      .where(eq(schema.paymentStatusEvents.referenceId, referenceId));
    return rows.some(
      (r) => normalizeProviderPollStatus(r.toStatus).bucket === "failed"
    );
  }

  async initiateContribution(input: {
    eventSlug: string;
    amount: number;
    name: string;
    anonymous?: boolean;
    payerPhone: string;
    milestoneId?: string | null;
  }): Promise<{ success: true; referenceId: string } | { success: false; error: string }> {
    const processor = this.processors.getProcessor();
    if (!processor.isConfigured() || !processor.getCurrency()) {
      return {
        success: false,
        error: paymentNotConfiguredMessage(processor.kind),
      };
    }

    const evRows = await this.db
      .select()
      .from(schema.events)
      .where(eq(schema.events.slug, input.eventSlug))
      .limit(1);
    const event = evRows[0];
    if (!event) return { success: false, error: "Event not found" };

    const eventStatus = parseEventLifecycleStatus(event.status);
    if (!eventAcceptsContributions(eventStatus)) {
      return {
        success: false,
        error: contributionBlockedMessage(eventStatus),
      };
    }

    const milestoneId = input.milestoneId?.trim() || null;
    if (milestoneId) {
      const ms = await this.db
        .select()
        .from(schema.milestoneItems)
        .where(
          and(
            eq(schema.milestoneItems.eventId, event.id),
            eq(schema.milestoneItems.id, milestoneId)
          )
        )
        .limit(1);
      if (!ms.length) return { success: false, error: "Invalid milestone." };
    }

    if (!Number.isFinite(input.amount) || input.amount < 1000) {
      return { success: false, error: "Invalid amount." };
    }

    const msisdn = normalizeUgandaMsisdnForNetworks(
      input.payerPhone,
      processor.supportedNetworks
    );
    if (!msisdn) {
      return {
        success: false,
        error: paymentPhoneValidationMessage(processor.supportedNetworks),
      };
    }

    const referenceId = randomUUID();
    const externalId = `cw-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const createdAt = formatMysqlDateTimeUtc(new Date());
    const currency = processor.getCurrency()!;

    await this.db.insert(schema.paymentIntents).values({
      referenceId,
      kind: "contribution",
      userId: null,
      eventId: event.id,
      amount: Math.round(input.amount),
      name: input.anonymous
        ? "Anonymous"
        : input.name.trim() || "Supporter",
      anonymous: input.anonymous ? 1 : 0,
      phone: msisdn,
      message: null,
      externalId,
      fulfilled: 0,
      milestoneId,
      processor: processor.kind,
      currency,
      createdAt,
      updatedAt: createdAt,
    });

    try {
      await processor.requestToPay({
        referenceId,
        amount: Math.round(input.amount),
        externalId,
        payerMsisdn: msisdn,
        payerMessage: `Contribution to ${event.title}`.slice(0, 140),
        payeeNote: `CeremonyWallet ${event.slug}`.slice(0, 140),
      });
    } catch (e) {
      await this.db
        .delete(schema.paymentIntents)
        .where(eq(schema.paymentIntents.referenceId, referenceId));
      this.log.error(
        `initiateContribution failed ${referenceId}: ${e instanceof Error ? e.message : String(e)}`
      );
      return { success: false, error: MOMO_PUBLIC_PAYMENT_START_FAILED };
    }

    this.audit.logSafe({
      actorType: "system",
      action: AuditAction.payment.contributionInitiated,
      entityType: "payment_intent",
      entityId: referenceId,
      metadata: { eventSlug: input.eventSlug },
    });

    return { success: true, referenceId };
  }

  async pollContribution(
    referenceId: string
  ): Promise<PaymentPollResult> {
    this.log.debug(`pollContribution ${referenceId}`);
    const processor = this.processors.getProcessor();
    if (!processor.isConfigured()) {
      this.log.warn(`pollContribution ${referenceId}: processor not configured`);
      return {
        status: "FAILED",
        message: paymentNotConfiguredMessage(processor.kind),
      };
    }

    const pendingRows = await this.db
      .select()
      .from(schema.paymentIntents)
      .where(eq(schema.paymentIntents.referenceId, referenceId))
      .limit(1);
    this.log.warn(`pollContribution ${referenceId}: pendingRows: ${pendingRows.length}`);
    const pending = pendingRows[0];
    if (!pending || pending.kind !== "contribution") {
      this.log.warn(`pollContribution ${referenceId}: not found`);
      return { status: "NOT_FOUND" };
    }

    if (pending.fulfilled) {
      this.log.warn(`pollContribution ${referenceId}: already fulfilled`);
      return { status: "SUCCESSFUL" };
    }

    let body: { status: string; reason?: { message?: string; code?: string } };
    try {
      body = await processor.getPaymentStatus(referenceId);
      this.log.warn(`pollContribution ${referenceId}: body: ${JSON.stringify(body)}`);
    } catch (e) {
      this.log.error(
        `pollContribution status fetch failed ${referenceId}: ${e instanceof Error ? e.message : String(e)}`
      );
      return { status: "PENDING" };
    }

    const { bucket, rawUpper } = normalizeProviderPollStatus(body.status);
    const hadTerminalFailure =
      bucket === "failed"
        ? await this.alreadyTerminalFailed(referenceId)
        : false;
    await this.appendStatus(referenceId, "poll", null, rawUpper || "UNKNOWN", {
      processor: processor.kind,
    });

    if (bucket === "success") {
      const finalized = await this.finalizeContribution(referenceId);
      if (finalized) {
        this.audit.logSafe({
          actorType: "system",
          action: AuditAction.payment.contributionCompleted,
          entityType: "payment_intent",
          entityId: referenceId,
        });
        this.contributionNotifications.notifyPaidContribution({
          ownerUserId: finalized.ownerUserId,
          eventSlug: finalized.eventSlug,
          eventTitle: finalized.eventTitle,
          contributorName: finalized.contributorName,
          anonymous: finalized.anonymous,
          amount: finalized.amount,
          phone: finalized.phone,
          message: finalized.message ?? undefined,
          viaMobileMoney: true,
        });
        return { status: "SUCCESSFUL" };
      }

      if (pending.eventId) {
        const ev = await this.db
          .select({ status: schema.events.status, slug: schema.events.slug })
          .from(schema.events)
          .where(eq(schema.events.id, pending.eventId))
          .limit(1);
        const eventStatus = parseEventLifecycleStatus(ev[0]?.status);
        if (!eventAcceptsContributions(eventStatus)) {
          const msg = contributionBlockedMessage(eventStatus);
          this.audit.logSafe({
            actorType: "system",
            action: AuditAction.payment.contributionFailed,
            entityType: "payment_intent",
            entityId: referenceId,
            metadata: { eventSlug: ev[0]?.slug, reason: msg },
          });
          return { status: "FAILED", message: msg };
        }
      }
      return { status: "PENDING" };
    }

    if (bucket === "failed") {
      const msg =
        body.reason?.message ||
        (rawUpper === "REJECTED"
          ? "Payment was rejected."
          : "Payment failed.");
      if (!hadTerminalFailure) {
        let eventSlug: string | undefined;
        if (pending.eventId) {
          const ev = await this.db
            .select({ slug: schema.events.slug })
            .from(schema.events)
            .where(eq(schema.events.id, pending.eventId))
            .limit(1);
          eventSlug = ev[0]?.slug;
        }
        this.audit.logSafe({
          actorType: "system",
          action: AuditAction.payment.contributionFailed,
          entityType: "payment_intent",
          entityId: referenceId,
          metadata: { eventSlug, reason: msg },
        });
      }
      return { status: "FAILED", message: msg };
    }
    this.log.warn(`pollContribution ${referenceId}: pending`);
    return { status: "PENDING" };
  }

  private async finalizeContribution(referenceId: string): Promise<{
    ownerUserId: string | null;
    eventSlug: string;
    eventTitle: string;
    contributorName: string;
    anonymous: boolean;
    amount: number;
    phone: string;
    message: string | null;
  } | null> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(schema.paymentIntents)
        .where(eq(schema.paymentIntents.referenceId, referenceId))
        .limit(1);
      const row = rows[0];
      if (!row || row.fulfilled || row.kind !== "contribution") return null;

      const evRows = await tx
        .select()
        .from(schema.events)
        .where(eq(schema.events.id, row.eventId!))
        .limit(1);
      const event = evRows[0];
      if (!event) return null;

      const eventStatus = parseEventLifecycleStatus(event.status);
      if (!eventAcceptsContributions(eventStatus)) {
        return null;
      }

      const contributionId = `c${Date.now()}`;
      const date = new Date().toISOString().split("T")[0]!;

      await tx.insert(schema.contributions).values({
        id: contributionId,
        eventId: row.eventId!,
        name: row.name,
        anonymous: row.anonymous ? 1 : 0,
        amount: row.amount,
        phone: row.phone,
        message: row.message ?? null,
        status: "paid",
        date,
        pledgeHopeBy: null,
        manual: 0,
        visible: 1,
        milestoneId: row.milestoneId ?? null,
        paymentReferenceId: referenceId,
      });

      await tx
        .update(schema.events)
        .set({
          raisedAmount: sql`${schema.events.raisedAmount} + ${row.amount}`,
        })
        .where(eq(schema.events.id, event.id));

      if (event.userId) {
        await this.walletService.creditFromContribution(tx, {
          userId: event.userId,
          eventId: event.id,
          contributionId,
          amount: row.amount,
          title: "Contribution received",
          description: `${row.name} · ${row.phone} · ${event.title}`,
        });
      }

      await tx
        .update(schema.paymentIntents)
        .set({ fulfilled: 1, updatedAt: formatMysqlDateTimeUtc(new Date()) })
        .where(eq(schema.paymentIntents.referenceId, referenceId));

      return {
        ownerUserId: event.userId,
        eventSlug: event.slug,
        eventTitle: event.title,
        contributorName: row.name,
        anonymous: !!row.anonymous,
        amount: row.amount,
        phone: row.phone,
        message: row.message ?? null,
      };
    });
  }

  async initiateSubscription(input: {
    userId: string;
    payerPhone: string;
  }): Promise<
    { success: true; referenceId: string } | { success: false; error: string }
  > {
    const processor = this.processors.getProcessor();
    if (!processor.isConfigured() || !processor.getCurrency()) {
      return {
        success: false,
        error: paymentNotConfiguredMessage(processor.kind),
      };
    }

    const msisdn = normalizeUgandaMsisdnForNetworks(
      input.payerPhone,
      processor.supportedNetworks
    );
    if (!msisdn) {
      return {
        success: false,
        error: paymentPhoneValidationMessage(processor.supportedNetworks),
      };
    }

    const referenceId = randomUUID();
    const externalId = `cw-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const createdAt = formatMysqlDateTimeUtc(new Date());
    const currency = processor.getCurrency()!;

    await this.db.insert(schema.paymentIntents).values({
      referenceId,
      kind: "subscription",
      userId: input.userId,
      eventId: null,
      amount: this.eventCreationFee(),
      name: "Subscription",
      anonymous: 0,
      phone: msisdn,
      message: null,
      externalId,
      fulfilled: 0,
      milestoneId: null,
      processor: processor.kind,
      currency,
      createdAt,
      updatedAt: createdAt,
    });

    try {
      await processor.requestToPay({
        referenceId,
        amount: this.eventCreationFee(),
        externalId,
        payerMsisdn: msisdn,
        payerMessage: "CeremonyWallet event activation",
        payeeNote: "CeremonyWallet subscription",
      });
    } catch (e) {
      await this.db
        .delete(schema.paymentIntents)
        .where(eq(schema.paymentIntents.referenceId, referenceId));
      this.log.error(
        `initiateSubscription failed ${referenceId}: ${e instanceof Error ? e.message : String(e)}`
      );
      return { success: false, error: MOMO_PUBLIC_PAYMENT_START_FAILED };
    }

    this.audit.logSafe({
      actorType: "user",
      actorUserId: input.userId,
      action: AuditAction.payment.subscriptionInitiated,
      entityType: "payment_intent",
      entityId: referenceId,
    });

    return { success: true, referenceId };
  }

  async pollSubscription(
    userId: string,
    referenceId: string
  ): Promise<PaymentPollResult> {
    const processor = this.processors.getProcessor();
    if (!processor.isConfigured()) {
      return {
        status: "FAILED",
        message: paymentNotConfiguredMessage(processor.kind),
      };
    }

    const intentRows = await this.db
      .select()
      .from(schema.paymentIntents)
      .where(eq(schema.paymentIntents.referenceId, referenceId))
      .limit(1);
    const intent = intentRows[0];
    if (
      !intent ||
      intent.kind !== "subscription" ||
      intent.userId !== userId
    ) {
      return { status: "NOT_FOUND" };
    }

    if (intent.fulfilled) {
      return { status: "SUCCESSFUL" };
    }

    let body: { status: string; reason?: { message?: string; code?: string } };
    try {
      body = await processor.getPaymentStatus(referenceId);
    } catch (e) {
      this.log.warn(
        `pollSubscription status fetch failed ${referenceId}: ${e instanceof Error ? e.message : String(e)}`
      );
      return { status: "PENDING" };
    }

    const { bucket, rawUpper } = normalizeProviderPollStatus(body.status);
    const hadTerminalFailure =
      bucket === "failed"
        ? await this.alreadyTerminalFailed(referenceId)
        : false;
    await this.appendStatus(referenceId, "poll", null, rawUpper || "UNKNOWN", {
      processor: processor.kind,
    });

    if (bucket === "success") {
      await this.db
        .update(schema.paymentIntents)
        .set({ fulfilled: 1, updatedAt: formatMysqlDateTimeUtc(new Date()) })
        .where(eq(schema.paymentIntents.referenceId, referenceId));
      this.audit.logSafe({
        actorType: "user",
        actorUserId: userId,
        action: AuditAction.payment.subscriptionCompleted,
        entityType: "payment_intent",
        entityId: referenceId,
      });
      return { status: "SUCCESSFUL" };
    }

    if (bucket === "failed") {
      const msg =
        body.reason?.message ||
        (rawUpper === "REJECTED"
          ? "Payment was rejected."
          : "Payment failed.");
      if (!hadTerminalFailure) {
        this.audit.logSafe({
          actorType: "user",
          actorUserId: userId,
          action: AuditAction.payment.subscriptionFailed,
          entityType: "payment_intent",
          entityId: referenceId,
          metadata: { reason: msg },
        });
      }
      return { status: "FAILED", message: msg };
    }

    return { status: "PENDING" };
  }

  /** Validates a completed subscription intent for event creation. */
  async assertSubscriptionIntentForUser(
    userId: string,
    referenceId: string | undefined
  ): Promise<void> {
    const processor = this.processors.getProcessor();
    const feature =
      this.config.get<boolean>("app.featureSubscriptionPayment") ?? false;
    if (!feature || !processor.isConfigured()) return;
    if (!referenceId?.trim()) {
      throw new BadRequestException(
        "Subscription payment reference is required."
      );
    }
    const rows = await this.db
      .select()
      .from(schema.paymentIntents)
      .where(eq(schema.paymentIntents.referenceId, referenceId.trim()))
      .limit(1);
    const row = rows[0];
    if (
      !row ||
      row.kind !== "subscription" ||
      row.userId !== userId ||
      !row.fulfilled
    ) {
      throw new BadRequestException(
        "Subscription payment was not verified. Complete Mobile Money payment first."
      );
    }
  }
}
