import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { Readable } from "node:stream";
import type { DrizzleDb } from "../database/database.module";
import { DRIZZLE } from "../database/database.module";
import * as schema from "../database/schema";
import { StorageService } from "../integrations/storage.service";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../audit/audit-actions";
import type { AuditRequestContext } from "../audit/audit-context";
import { formatMysqlDateTimeUtc } from "../common/mysql-datetime";
import {
  parseEventLifecycleStatus,
} from "./event-lifecycle";
import { EventsService } from "./events.service";
import {
  buildProgressReportPdf,
  type ProgressReportData,
} from "./event-progress-report-pdf";
import {
  computePaidCashBreakdown,
  hasTimeComponent,
  normalizeReportTimeZone,
} from "./event-progress-report-format";
import { computeEventWithdrawAvailability } from "../wallet/withdraw-event-availability";

function readRequestTimeZone(
  headers: Record<string, string | string[] | undefined>
): string | undefined {
  const raw = headers["x-timezone"];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0];
  return undefined;
}

export type EventProgressReportStatus = "pending" | "ready" | "failed";

export type EventProgressReportDto = {
  reportId: string;
  status: EventProgressReportStatus;
  createdAt: string;
  completedAt?: string;
  downloadPath?: string;
  errorMessage?: string;
};

@Injectable()
export class EventProgressReportService {
  private readonly log = new Logger(EventProgressReportService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly storage: StorageService,
    private readonly events: EventsService,
    private readonly audit: AuditService
  ) {}

  async requestReport(
    userId: string,
    slug: string,
    ctx?: AuditRequestContext,
    timeZone?: string
  ): Promise<EventProgressReportDto> {
    const row = await this.requireStoppedOwnerEvent(userId, slug);
    const reportId = randomUUID();
    const now = formatMysqlDateTimeUtc(new Date());
    const normalizedTimeZone = normalizeReportTimeZone(timeZone);

    await this.db.insert(schema.eventProgressReports).values({
      id: reportId,
      eventId: row.id,
      userId,
      status: "pending",
      timeZone: normalizedTimeZone,
      createdAt: now,
    });

    this.audit.logSafe({
      actorType: "user",
      actorUserId: userId,
      action: AuditAction.event.progressReportRequested,
      entityType: "event",
      entityId: row.id,
      metadata: { slug, reportId },
      ctx,
    });

    void this.generateReport(reportId, row.id, userId, slug, normalizedTimeZone).catch((err) => {
      this.log.error(
        `Progress report ${reportId} failed: ${err instanceof Error ? err.message : String(err)}`
      );
    });

    return {
      reportId,
      status: "pending",
      createdAt: now,
    };
  }

  async getLatestReport(
    userId: string,
    slug: string
  ): Promise<EventProgressReportDto | null> {
    const row = await this.requireOwnerEvent(userId, slug);
    const reports = await this.db
      .select()
      .from(schema.eventProgressReports)
      .where(eq(schema.eventProgressReports.eventId, row.id))
      .orderBy(desc(schema.eventProgressReports.createdAt))
      .limit(1);
    const report = reports[0];
    if (!report) return null;
    return this.toDto(report, slug);
  }

  async streamLatestReport(
    userId: string,
    slug: string
  ): Promise<{ body: Readable; filename: string } | null> {
    const row = await this.requireOwnerEvent(userId, slug);
    const reports = await this.db
      .select()
      .from(schema.eventProgressReports)
      .where(
        and(
          eq(schema.eventProgressReports.eventId, row.id),
          eq(schema.eventProgressReports.status, "ready")
        )
      )
      .orderBy(desc(schema.eventProgressReports.createdAt))
      .limit(1);
    const report = reports[0];
    if (!report?.storageKey) return null;

    const obj = await this.storage.getObjectStream(report.storageKey);
    if (!obj) return null;

    return {
      body: obj.body,
      filename: `${slug}-progress-report.pdf`,
    };
  }

  private async generateReport(
    reportId: string,
    eventId: string,
    userId: string,
    slug: string,
    timeZone: string
  ): Promise<void> {
    try {
      if (!this.storage.isConfigured()) {
        throw new Error("File storage is not configured.");
      }

      const data = await this.assembleReportData(eventId, userId, slug, timeZone);
      const buffer = await buildProgressReportPdf(data);
      const storageKey = `events/${eventId}/progress-reports/${reportId}.pdf`;
      await this.storage.putObject(storageKey, buffer, "application/pdf");

      const completedAt = formatMysqlDateTimeUtc(new Date());
      await this.db
        .update(schema.eventProgressReports)
        .set({
          status: "ready",
          storageKey,
          completedAt,
          errorMessage: null,
        })
        .where(eq(schema.eventProgressReports.id, reportId));

      this.audit.logSafe({
        actorType: "user",
        actorUserId: userId,
        action: AuditAction.event.progressReportReady,
        entityType: "event",
        entityId: eventId,
        metadata: { slug, reportId },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Report generation failed.";
      await this.db
        .update(schema.eventProgressReports)
        .set({
          status: "failed",
          errorMessage: message,
          completedAt: formatMysqlDateTimeUtc(new Date()),
        })
        .where(eq(schema.eventProgressReports.id, reportId));

      this.audit.logSafe({
        actorType: "user",
        actorUserId: userId,
        action: AuditAction.event.progressReportFailed,
        entityType: "event",
        entityId: eventId,
        metadata: { slug, reportId, error: message },
      });
      throw err;
    }
  }

  async assembleReportData(
    eventId: string,
    userId: string,
    slug: string,
    timeZone?: string
  ): Promise<ProgressReportData> {
    const event = await this.events.getBySlug(slug);
    if (!event || event.id !== eventId) {
      throw new NotFoundException("Event not found.");
    }

    const normalizedTimeZone = normalizeReportTimeZone(timeZone);

    const milestoneNameById = new Map(
      event.milestoneItems.map((m) => [m.id, m.name])
    );

    const contributionRows = await this.db
      .select({
        name: schema.contributions.name,
        anonymous: schema.contributions.anonymous,
        amount: schema.contributions.amount,
        status: schema.contributions.status,
        date: schema.contributions.date,
        pledgeHopeBy: schema.contributions.pledgeHopeBy,
        manual: schema.contributions.manual,
        milestoneId: schema.contributions.milestoneId,
        paidAt: schema.paymentIntents.updatedAt,
      })
      .from(schema.contributions)
      .leftJoin(
        schema.paymentIntents,
        eq(schema.contributions.paymentReferenceId, schema.paymentIntents.referenceId)
      )
      .where(eq(schema.contributions.eventId, eventId));

    const withdrawalRows = await this.db
      .select({
        createdAt: schema.withdrawals.createdAt,
        reference: schema.withdrawals.reference,
        status: schema.withdrawals.status,
        methodLabel: schema.payoutMethods.label,
        grossAmount: schema.withdrawals.grossAmount,
        momoFee: schema.withdrawals.momoFee,
        platformFee: schema.withdrawals.platformFee,
        netAmount: schema.withdrawals.netAmount,
      })
      .from(schema.withdrawalEvents)
      .innerJoin(
        schema.withdrawals,
        eq(schema.withdrawalEvents.withdrawalId, schema.withdrawals.id)
      )
      .leftJoin(
        schema.payoutMethods,
        eq(schema.withdrawals.methodId, schema.payoutMethods.id)
      )
      .where(eq(schema.withdrawalEvents.eventId, eventId))
      .orderBy(desc(schema.withdrawals.createdAt));

    const withdrawSummary = await computeEventWithdrawAvailability(
      this.db,
      userId,
      eventId
    );

    const contributions = contributionRows.map((c) => {
      const manual = !!c.manual;
      const paidAt = c.paidAt?.trim();
      const recordedAt =
        c.status === "paid" && paidAt && hasTimeComponent(paidAt)
          ? paidAt
          : c.date;
      const recordedAtHasTime =
        c.status === "paid" && !!paidAt && hasTimeComponent(paidAt);

      return {
        name: c.anonymous ? "Anonymous" : c.name,
        amount: c.amount,
        status: c.status as "paid" | "pledged",
        date: c.date,
        recordedAt,
        recordedAtHasTime,
        milestoneName: c.milestoneId
          ? milestoneNameById.get(c.milestoneId)
          : undefined,
        manual,
        pledgeHopeBy: c.pledgeHopeBy ?? undefined,
      };
    });

    const cashBreakdown = computePaidCashBreakdown(contributions);

    return {
      generatedAt: formatMysqlDateTimeUtc(new Date()),
      timeZone: normalizedTimeZone,
      eventSlug: slug,
      event: {
        title: event.title,
        type: event.type,
        typeLabel: event.typeLabel,
        organizer: event.organizer,
        treasurerPhone: event.treasurerPhone,
        date: event.date,
        location: event.location,
        description: event.description,
        targetAmount: event.targetAmount,
        raisedAmount: event.raisedAmount,
        statusMessage: event.statusMessage,
        statusChangedAt: event.statusChangedAt,
      },
      milestones: event.milestoneItems.map((m) => ({
        name: m.name,
        targetAmount: m.targetAmount,
        raisedAmount: m.raisedAmount,
      })),
      contributions,
      withdrawals: withdrawalRows.map((w) => ({
        createdAt: w.createdAt,
        reference: w.reference,
        status: w.status,
        methodLabel: w.methodLabel ?? "—",
        grossAmount: w.grossAmount,
        fees: w.momoFee + w.platformFee,
        netAmount: w.netAmount,
      })),
      withdrawSummary,
      cashBreakdown,
    };
  }

  static readRequestTimeZoneFromHeaders(
    headers: Record<string, string | string[] | undefined>
  ): string | undefined {
    return readRequestTimeZone(headers);
  }

  private toDto(
    report: typeof schema.eventProgressReports.$inferSelect,
    slug: string
  ): EventProgressReportDto {
    const status = report.status as EventProgressReportStatus;
    return {
      reportId: report.id,
      status,
      createdAt: report.createdAt,
      completedAt: report.completedAt ?? undefined,
      downloadPath:
        status === "ready"
          ? `/api/v1/events/by-slug/${encodeURIComponent(slug)}/progress-report/download`
          : undefined,
      errorMessage: report.errorMessage ?? undefined,
    };
  }

  private async requireOwnerEvent(userId: string, slug: string) {
    const rows = await this.db
      .select()
      .from(schema.events)
      .where(eq(schema.events.slug, slug))
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException("Event not found.");
    if (!row.userId || row.userId !== userId) {
      throw new ForbiddenException("Not allowed.");
    }
    return row;
  }

  private async requireStoppedOwnerEvent(userId: string, slug: string) {
    const row = await this.requireOwnerEvent(userId, slug);
    const status = parseEventLifecycleStatus(row.status);
    if (status !== "stopped") {
      throw new BadRequestException(
        "Progress reports are only available for stopped events."
      );
    }
    return row;
  }
}
