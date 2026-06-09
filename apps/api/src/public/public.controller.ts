import { Controller, Get } from "@nestjs/common";
import { PaymentProcessorFactory } from "../payments/payment-processor.factory";
import { ConfigService } from "@nestjs/config";
import { Public } from "../common/public.decorator";
import { SkipThrottle } from "@nestjs/throttler";

@SkipThrottle()
@Public()
@Controller("public")
export class PublicController {
  constructor(
    private readonly processors: PaymentProcessorFactory,
    private readonly configService: ConfigService
  ) {}

  @Get("config")
  getPublicConfig() {
    const p = this.processors.getProcessor();
    return {
      paymentsConfigured: p.isConfigured(),
      processorKind: p.kind,
      subscriptionFeature:
        this.configService.get<boolean>("app.featureSubscriptionPayment") ??
        false,
      eventCreationFee:
        this.configService.get<number>("app.fees.eventCreationFee") ?? 10000,
      momoFeePercent:
        this.configService.get<number>("app.fees.momoFeePercent") ?? 0.04,
      momoFeeTiered: true,
      platformFeeRate:
        this.configService.get<number>("app.fees.platformFeeRate") ?? 0.012,
    };
  }
}
