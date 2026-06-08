import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./public.decorator";

@Injectable()
export class InternalProxyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const expected = this.config.get<string>("app.internalProxySecret");
    if (!expected?.trim()) {
      if (process.env.NODE_ENV === "production") {
        throw new ForbiddenException(
          "INTERNAL_PROXY_SECRET is not configured."
        );
      }
      return true;
    }
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const incoming = req.headers["x-internal-proxy-secret"];
    const v = Array.isArray(incoming) ? incoming[0] : incoming;
    if (v !== expected) {
      throw new ForbiddenException();
    }
    return true;
  }
}
