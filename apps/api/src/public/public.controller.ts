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
    };
  }
}
