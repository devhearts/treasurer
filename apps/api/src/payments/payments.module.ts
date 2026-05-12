import { Module } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PaymentsController } from "./payments.controller";
import { PaymentProcessorFactory } from "./payment-processor.factory";
import { AuditModule } from "../audit/audit.module";
import { ReconciliationService } from "./reconciliation.service";

@Module({
  imports: [AuditModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentProcessorFactory, ReconciliationService],
  exports: [PaymentsService, PaymentProcessorFactory, ReconciliationService],
})
export class PaymentsModule {}
