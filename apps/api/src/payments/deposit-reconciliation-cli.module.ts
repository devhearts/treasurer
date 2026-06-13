import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "../config/configuration";
import { DatabaseModule } from "../database/database.module";
import { PaymentsModule } from "./payments.module";

/** One-shot CLI context — no HTTP, cron, or Sentry (avoids hanging after runOnce). */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [".env", "../.env", "../../.env"],
    }),
    DatabaseModule,
    PaymentsModule,
  ],
})
export class DepositReconciliationCliModule {}
