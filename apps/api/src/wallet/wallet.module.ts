import { Module } from "@nestjs/common";
import { WalletController } from "./wallet.controller";
import { WalletService } from "./wallet.service";
import { PayoutMethodsService } from "./payout-methods.service";
import { WithdrawalsService } from "./withdrawals.service";
import { AuthModule } from "../auth/auth.module";
import { IntegrationsModule } from "../integrations/integrations.module";
import { PaymentProcessorModule } from "../payments/payment-processor.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuthModule, IntegrationsModule, PaymentProcessorModule, AuditModule],
  controllers: [WalletController],
  providers: [WalletService, PayoutMethodsService, WithdrawalsService],
  exports: [WalletService],
})
export class WalletModule {}
