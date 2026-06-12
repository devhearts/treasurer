import { Module } from "@nestjs/common";
import { VerificationController } from "./verification.controller";
import { VerificationService } from "./verification.service";
import { IntegrationsModule } from "../integrations/integrations.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [IntegrationsModule, AuditModule],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
