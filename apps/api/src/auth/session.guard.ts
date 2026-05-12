import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      sessionUserId?: string;
    }>();
    if (!req.sessionUserId) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
