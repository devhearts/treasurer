import { Module } from "@nestjs/common";
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";
import { PaymentsModule } from "../payments/payments.module";
import { AuditModule } from "../audit/audit.module";
import { IntegrationsModule } from "../integrations/integrations.module";

@Module({
  imports: [PaymentsModule, AuditModule, IntegrationsModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
