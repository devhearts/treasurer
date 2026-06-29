import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { Public } from "../common/public.decorator";
import { SkipThrottle } from "@nestjs/throttler";

@SkipThrottle()
@Public()
@Controller("webhooks")
export class WebhooksController {
  /** Stub: verify PawaPay signature and finalize intents in a follow-up. */
  @Post("pawapay")
  @HttpCode(200)
  pawapay(@Body() _body: unknown) {
    return { received: true };
  }

  /** Stub: RukaPay collection callback (fulfillment via poll + reconciliation). */
  @Post("rukapay")
  @HttpCode(200)
  rukapay(@Body() _body: unknown) {
    return { received: true };
  }
}
