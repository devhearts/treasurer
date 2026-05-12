import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import configuration from "./config/configuration";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./auth/auth.module";
import { SessionMiddleware } from "./auth/session.middleware";
import { HttpLoggerMiddleware } from "./common/http-logger.middleware";
import { IntegrationsModule } from "./integrations/integrations.module";
import { AuditModule } from "./audit/audit.module";
import { PaymentsModule } from "./payments/payments.module";
import { EventsModule } from "./events/events.module";
import { HealthController } from "./health/health.controller";
import { PublicController } from "./public/public.controller";
import { WebhooksController } from "./webhooks/webhooks.controller";
import { InternalProxyGuard } from "./common/internal-proxy.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [".env", "../.env", "../../.env"],
    }),
    DatabaseModule,
    ThrottlerModule.forRoot([
      { name: "default", ttl: 60000, limit: 300 },
    ]),
    IntegrationsModule,
    AuditModule,
    AuthModule,
    PaymentsModule,
    EventsModule,
  ],
  controllers: [HealthController, PublicController, WebhooksController],
  providers: [
    HttpLoggerMiddleware,
    SessionMiddleware,
    { provide: APP_GUARD, useClass: InternalProxyGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware, SessionMiddleware).forRoutes("*");
  }
}
