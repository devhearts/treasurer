import { Module } from "@nestjs/common";
import { PaymentProcessorFactory } from "./payment-processor.factory";

/** Shared processor selection for payments and wallet withdrawals (avoids PaymentsModule ↔ WalletModule cycle). */
@Module({
  providers: [PaymentProcessorFactory],
  exports: [PaymentProcessorFactory],
})
export class PaymentProcessorModule {}
