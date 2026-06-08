import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { SessionGuard } from "./session.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  async register(
    @Body()
    body: {
      email?: string;
      password?: string;
      confirmPassword?: string;
      phone?: string;
    },
    @Req() req: Request
  ) {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress;
    const ua = req.headers["user-agent"] as string | undefined;
    const r = await this.auth.register(
      body.email ?? "",
      body.password ?? "",
      body.confirmPassword ?? "",
      body.phone ?? "",
      ip,
      ua
    );
    return { user: { id: r.userId, email: r.email } };
  }

  @Post("email/verify")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async verifyEmail(
    @Body() body: { token?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress;
    const ua = req.headers["user-agent"] as string | undefined;
    const r = await this.auth.verifyEmail(body.token ?? "", ip, ua);
    res.setHeader("X-Set-Session", r.sessionId);
    return { user: { id: r.userId, email: r.email } };
  }

  @Post("email/resend")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resendVerification(@Body() body: { email?: string }) {
    await this.auth.resendVerificationEmail(body.email ?? "");
    return { ok: true };
  }

  @Post("login")
  async login(
    @Body() body: { email?: string; password?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress;
    const ua = req.headers["user-agent"] as string | undefined;
    const r = await this.auth.login(body.email ?? "", body.password ?? "", ip, ua);
    res.setHeader("X-Set-Session", r.sessionId);
    return { user: { id: r.userId, email: r.email } };
  }

  @Post("logout")
  async logout(@Headers("x-session-id") sessionId?: string) {
    if (sessionId) await this.auth.logout(sessionId);
    return { ok: true };
  }

  @Get("me")
  async me(@Req() req: Request & { sessionUserId?: string }) {
    const uid = req.sessionUserId;
    if (!uid) return { user: null };
    const user = await this.auth.me(uid);
    if (!user) return { user: null };
    return { user };
  }

  @Post("password/change")
  @UseGuards(SessionGuard)
  async changePassword(
    @Req() req: Request & { sessionUserId?: string },
    @Body() body: { currentPassword?: string; newPassword?: string }
  ) {
    await this.auth.changePassword(
      req.sessionUserId!,
      body.currentPassword ?? "",
      body.newPassword ?? ""
    );
    return { ok: true };
  }

  @Post("password/request-reset")
  async requestReset(@Body() body: { email?: string }) {
    await this.auth.requestPasswordReset(body.email ?? "");
    return { ok: true };
  }

  @Post("password/reset")
  async reset(
    @Body() body: { token?: string; newPassword?: string }
  ) {
    await this.auth.resetPassword(body.token ?? "", body.newPassword ?? "");
    return { ok: true };
  }
}
