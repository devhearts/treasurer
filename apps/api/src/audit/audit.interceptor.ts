import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { tap } from "rxjs";
import { AuditService } from "./audit.service";
import { IS_PUBLIC_KEY } from "../common/public.decorator";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly audit: AuditService,
    private readonly reflector: Reflector
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): any {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (isPublic) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<{
      method: string;
      route?: { path?: string };
      url?: string;
      sessionUserId?: string;
      headers: Record<string, string | string[] | undefined>;
    }>();
    const method = req.method?.toUpperCase() ?? "GET";
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      return next.handle();
    }

    const path = req.route?.path ?? req.url ?? "";
    if (
      String(path).startsWith("/auth") ||
      String(path).startsWith("/payments")
    ) {
      return next.handle();
    }
    const rid = req.headers["x-request-id"];
    const requestId = Array.isArray(rid) ? rid[0] : rid;

    // `next.handle()` uses Nest's hoisted rxjs; `tap` resolves from this package's dev tree — cast avoids duplicate-type errors.
    return (next.handle() as any).pipe(
      tap({
        next: () => {
          void this.audit
            .log({
              actorType: req.sessionUserId ? "user" : "system",
              actorUserId: req.sessionUserId ?? null,
              action: `http.${method}`,
              entityType: "route",
              entityId: String(path).slice(0, 200),
              metadata: {},
              requestId,
            })
            .catch(() => {
              /* avoid breaking response */
            });
        },
      })
    );
  }
}
