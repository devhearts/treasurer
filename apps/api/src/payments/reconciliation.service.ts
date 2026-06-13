import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { and, eq, isNull, lt, getTableColumns } from "drizzle-orm";
import type { DrizzleDb } from "../database/database.module";
import { DRIZZLE } from "../database/database.module";
import * as schema from "../database/schema";
import { formatMysqlDateTimeUtc } from "../common/mysql-datetime";
import { PaymentsService } from "./payments.service";

/** Only reconcile intents older than this (3 hours). */
export const STALE_INTENT_AGE_MS = 3 * 60 * 60 * 1000;

export type ReconciliationRunSummary = {
  scanned: number;
  completed: number;
  failed: number;
  stillPending: number;
  skipped: number;
  errors: number;
};

@Injectable()
export class ReconciliationService {
  private readonly log = new Logger(ReconciliationService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly payments: PaymentsService
  ) {}

  @Cron("0 */3 * * *")
  async runScheduled(): Promise<void> {
    this.log.log("deposit reconciliation cron triggered");
    try {
      const summary = await this.runOnce();
      this.log.log(
        `deposit reconciliation cron finished: ${JSON.stringify(summary)}`
      );
    } catch (e) {
      this.log.error(
        `deposit reconciliation cron failed: ${e instanceof Error ? e.stack ?? e.message : String(e)}`
      );
    }
  }

  async runOnce(): Promise<ReconciliationRunSummary> {
    const startedAt = Date.now();
    const cutoff = formatMysqlDateTimeUtc(
      new Date(Date.now() - STALE_INTENT_AGE_MS)
    );
    this.log.log(
      `deposit reconciliation runOnce start cutoff=${cutoff} (intents created before this)`
    );

    const intentCols = getTableColumns(schema.paymentIntents);
    const staleIntents = await this.db
      .select(intentCols)
      .from(schema.paymentIntents)
      .leftJoin(
        schema.reconciledPaymentIntents,
        eq(
          schema.reconciledPaymentIntents.referenceId,
          schema.paymentIntents.referenceId
        )
      )
      .where(
        and(
          eq(schema.paymentIntents.fulfilled, 0),
          isNull(schema.reconciledPaymentIntents.referenceId),
          lt(schema.paymentIntents.createdAt, cutoff)
        )
      );

    const summary: ReconciliationRunSummary = {
      scanned: staleIntents.length,
      completed: 0,
      failed: 0,
      stillPending: 0,
      skipped: 0,
      errors: 0,
    };

    this.log.log(
      `deposit reconciliation found ${staleIntents.length} stale unfulfilled intent(s)`
    );
    if (staleIntents.length) {
      this.log.log(
        `deposit reconciliation referenceIds: ${staleIntents.map((i) => i.referenceId).join(", ")}`
      );
    }

    for (const intent of staleIntents) {
      const ageMs = Date.now() - new Date(intent.createdAt).getTime();
      this.log.log(
        `deposit reconciliation processing ${intent.referenceId} kind=${intent.kind} processor=${intent.processor} externalId=${intent.externalId} ageMs=${ageMs}`
      );

      try {
        const result = await this.payments.reconcilePaymentIntent(
          intent.referenceId
        );

        if (!result.terminal) {
          if (
            result.reason === "missing" ||
            result.reason === "already_fulfilled"
          ) {
            summary.skipped++;
            this.log.log(
              `deposit reconciliation ${intent.referenceId}: skipped (${result.reason})`
            );
          } else {
            summary.stillPending++;
            this.log.log(
              `deposit reconciliation ${intent.referenceId}: not terminal (${result.reason}), will retry next run`
            );
          }
          continue;
        }

        await this.db.insert(schema.reconciledPaymentIntents).values({
          referenceId: intent.referenceId,
          outcome: result.outcome,
          kind: result.kind,
          processor: result.processor,
          providerStatus: result.providerStatus,
          failureCode: result.failureCode ?? null,
          failureMessage: result.failureMessage ?? null,
          providerPayload: result.providerPayload,
          reconciledAt: formatMysqlDateTimeUtc(new Date()),
        });

        if (result.outcome === "completed") {
          summary.completed++;
          this.log.log(
            `deposit reconciliation ${intent.referenceId}: recorded completed providerStatus=${result.providerStatus}`
          );
        } else {
          summary.failed++;
          this.log.log(
            `deposit reconciliation ${intent.referenceId}: recorded failed providerStatus=${result.providerStatus} failureCode=${result.failureCode ?? ""} failureMessage=${result.failureMessage ?? ""}`
          );
        }
      } catch (e) {
        summary.errors++;
        this.log.error(
          `deposit reconciliation ${intent.referenceId}: unexpected error ${e instanceof Error ? e.stack ?? e.message : String(e)}`
        );
      }
    }

    const durationMs = Date.now() - startedAt;
    this.log.log(
      `deposit reconciliation runOnce finished in ${durationMs}ms summary=${JSON.stringify(summary)}`
    );
    return summary;
  }
}
