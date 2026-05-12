import { Module } from "@nestjs/common";
import { MailService } from "./mail.service";
import { StorageService } from "./storage.service";
import { AfricasTalkingService } from "./africastalking.service";

@Module({
  providers: [MailService, StorageService, AfricasTalkingService],
  exports: [MailService, StorageService, AfricasTalkingService],
})
export class IntegrationsModule {}
