import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { IntegrationsModule } from "../integrations/integrations.module";
import { InvitationsController } from "./invitations.controller";
import { InvitationsService } from "./invitations.service";

@Module({
  imports: [IntegrationsModule, EventsModule],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
