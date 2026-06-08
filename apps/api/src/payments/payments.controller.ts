import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { PaymentsService } from "./payments.service";
import { SessionGuard } from "../auth/session.guard";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post("contributions/initiate")
  async initiateContribution(
    @Body()
    body: {
      eventSlug: string;
      amount: number;
      name: string;
      anonymous?: boolean;
      payerPhone: string;
      milestoneId?: string | null;
    }
  ) {
    return this.payments.initiateContribution(body);
  }

  @Post("contributions/poll")
  async pollContribution(@Body() body: { referenceId: string }) {
    return this.payments.pollContribution(body.referenceId);
  }

  @Post("subscription/initiate")
  @UseGuards(SessionGuard)
  async initiateSubscription(
    @Req() req: Request & { sessionUserId?: string },
    @Body() body: { payerPhone: string }
  ) {
    return this.payments.initiateSubscription({
      userId: req.sessionUserId!,
      payerPhone: body.payerPhone,
    });
  }

  @Post("subscription/poll")
  @UseGuards(SessionGuard)
  async pollSubscription(
    @Req() req: Request & { sessionUserId?: string },
    @Body() body: { referenceId: string }
  ) {
    return this.payments.pollSubscription(
      req.sessionUserId!,
      body.referenceId
    );
  }
}
