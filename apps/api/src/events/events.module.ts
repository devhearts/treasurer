import { Module } from "@nestjs/common";
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";
import { PaymentsModule } from "../payments/payments.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [PaymentsModule, AuditModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
