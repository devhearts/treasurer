import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { MailService } from "./mail.service";
import { StorageService } from "./storage.service";
import { AfricasTalkingService } from "./africastalking.service";
import { ContributionNotificationsService } from "./contribution-notifications.service";

@Module({
  imports: [DatabaseModule],
  providers: [
    MailService,
    StorageService,
    AfricasTalkingService,
    ContributionNotificationsService,
  ],
  exports: [
    MailService,
    StorageService,
    AfricasTalkingService,
    ContributionNotificationsService,
  ],
})
export class IntegrationsModule {}
