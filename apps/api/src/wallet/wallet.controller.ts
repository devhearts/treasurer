import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { SessionGuard } from "../auth/session.guard";
import { WalletService } from "./wallet.service";
import { PayoutMethodsService } from "./payout-methods.service";
import { WithdrawalsService } from "./withdrawals.service";
import { AuthService } from "../auth/auth.service";

@Controller("wallet")
@UseGuards(SessionGuard)
export class WalletController {
  constructor(
    private readonly wallet: WalletService,
    private readonly payoutMethods: PayoutMethodsService,
    private readonly withdrawals: WithdrawalsService,
    private readonly auth: AuthService
  ) {}

  private userId(req: Request & { sessionUserId?: string }): string {
    return req.sessionUserId!;
  }

  @Get("account")
  async account(@Req() req: Request & { sessionUserId?: string }) {
    return this.wallet.getAccountSummary(this.userId(req));
  }

  @Get("transactions")
  async transactions(
    @Req() req: Request & { sessionUserId?: string },
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return this.wallet.listTransactions(this.userId(req), {
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      cursor: cursor?.trim() || undefined,
    });
  }

  @Get("payout-methods")
  async listMethods(@Req() req: Request & { sessionUserId?: string }) {
    return { methods: await this.payoutMethods.list(this.userId(req)) };
  }

  @Post("payout-methods/initiate-add")
  async initiateAddMethod(
    @Req() req: Request & { sessionUserId?: string },
    @Body()
    body: {
      type: "mtn_momo" | "airtel_momo" | "bank";
      label?: string;
      msisdn?: string;
      accountNumber?: string;
      bankName?: string;
      branch?: string;
      swift?: string;
      isDefault?: boolean;
    }
  ) {
    const user = await this.auth.me(this.userId(req));
    if (!user) throw new BadRequestException("User not found.");
    return this.payoutMethods.initiateAdd(
      this.userId(req),
      user.email,
      body
    );
  }

  @Post("payout-methods/resend-add-otp")
  async resendAddMethodOtp(
    @Req() req: Request & { sessionUserId?: string },
    @Body() body: { pendingId: string }
  ) {
    const user = await this.auth.me(this.userId(req));
    if (!user) throw new BadRequestException("User not found.");
    return this.payoutMethods.resendAddOtp(
      this.userId(req),
      user.email,
      body.pendingId
    );
  }

  @Post("payout-methods/verify-add")
  async verifyAddMethod(
    @Req() req: Request & { sessionUserId?: string },
    @Body() body: { pendingId: string; code: string }
  ) {
    return this.payoutMethods.verifyAddOtp(
      this.userId(req),
      body.pendingId,
      body.code
    );
  }

  @Patch("payout-methods/:id")
  async updateMethod(
    @Req() req: Request & { sessionUserId?: string },
    @Param("id") id: string,
    @Body()
    body: {
      label?: string;
      msisdn?: string;
      accountNumber?: string;
      bankName?: string;
      branch?: string;
      swift?: string;
      isDefault?: boolean;
    }
  ) {
    const method = await this.payoutMethods.update(this.userId(req), id, body);
    return { method };
  }

  @Delete("payout-methods/:id")
  async deleteMethod(
    @Req() req: Request & { sessionUserId?: string },
    @Param("id") id: string
  ) {
    return this.payoutMethods.delete(this.userId(req), id);
  }

  @Post("withdrawals/quote")
  quote(@Body() body: { grossAmount: number }) {
    return this.withdrawals.quote(body.grossAmount);
  }

  @Post("withdrawals/initiate")
  async initiate(
    @Req() req: Request & { sessionUserId?: string },
    @Body()
    body: {
      methodId: string;
      grossAmount: number;
      idempotencyKey?: string;
    }
  ) {
    const user = await this.auth.me(this.userId(req));
    if (!user) throw new BadRequestException("User not found.");
    return this.withdrawals.initiate(this.userId(req), user.email, body);
  }

  @Post("withdrawals/resend-otp")
  async resendOtp(
    @Req() req: Request & { sessionUserId?: string },
    @Body() body: { withdrawalId: string }
  ) {
    const user = await this.auth.me(this.userId(req));
    if (!user) throw new BadRequestException("User not found.");
    return this.withdrawals.resendOtp(
      this.userId(req),
      user.email,
      body.withdrawalId
    );
  }

  @Post("withdrawals/verify-otp")
  verifyOtp(
    @Req() req: Request & { sessionUserId?: string },
    @Body() body: { withdrawalId: string; code: string }
  ) {
    return this.withdrawals.verifyOtp(
      this.userId(req),
      body.withdrawalId,
      body.code
    );
  }

  @Post("withdrawals/poll")
  poll(
    @Req() req: Request & { sessionUserId?: string },
    @Body() body: { withdrawalId: string }
  ) {
    return this.withdrawals.poll(this.userId(req), body.withdrawalId);
  }
}
