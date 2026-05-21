import { Module } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PaymentsController } from "./payments.controller";
import { PaymentProcessorModule } from "./payment-processor.module";
import { AuditModule } from "../audit/audit.module";
import { ReconciliationService } from "./reconciliation.service";
import { WalletModule } from "../wallet/wallet.module";

@Module({
  imports: [AuditModule, PaymentProcessorModule, WalletModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, ReconciliationService],
  exports: [PaymentsService, PaymentProcessorModule, ReconciliationService],
})
export class PaymentsModule {}
