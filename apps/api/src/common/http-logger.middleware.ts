import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

function shouldSkipSuccessLog(req: Request, statusCode: number): boolean {
  if (statusCode >= 400) return false;
  if (req.method !== "GET") return false;
  const p = req.path || "";
  return p === "/health" || p === "/health/ready";
}

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly log = new Logger("HTTP");

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const method = req.method;
    const url = req.originalUrl || req.url;

    res.on("finish", () => {
      if (shouldSkipSuccessLog(req, res.statusCode)) return;

      const ms = Date.now() - start;
      const line = `${method} ${url} ${res.statusCode} ${ms}ms`;

      if (res.statusCode >= 500) this.log.error(line);
      else if (res.statusCode >= 400) this.log.warn(line);
      else this.log.log(line);
    });

    next();
  }
}
