import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SessionService } from "./session.service";
import { IntegrationsModule } from "../integrations/integrations.module";
import { AuditModule } from "../audit/audit.module";
import { VerificationModule } from "../verification/verification.module";

@Module({
  imports: [IntegrationsModule, AuditModule, VerificationModule],
  controllers: [AuthController],
  providers: [AuthService, SessionService],
  exports: [AuthService, SessionService],
})
export class AuthModule {}
