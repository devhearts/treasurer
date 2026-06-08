import { Inject, Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { SessionService } from "../auth/session.service";

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(private readonly sessions: SessionService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const raw = req.headers["x-session-id"];
    const sid = typeof raw === "string" ? raw.trim() : "";
    (req as Request & { sessionUserId?: string }).sessionUserId = undefined;
    if (!sid) {
      next();
      return;
    }
    const uid = await this.sessions.resolveUserId(sid);
    if (uid) (req as Request & { sessionUserId?: string }).sessionUserId = uid;
    next();
  }
}
