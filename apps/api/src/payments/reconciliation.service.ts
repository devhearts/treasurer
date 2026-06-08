import { Injectable, Logger } from "@nestjs/common";

/**
 * Placeholder for scheduled reconciliation (stale payment_intents, provider reports).
 * Wire to @nestjs/schedule or an external worker when ready.
 */
@Injectable()
export class ReconciliationService {
  private readonly log = new Logger(ReconciliationService.name);

  async runOnce(): Promise<void> {
    this.log.debug("reconciliation stub: no-op");
  }
}
