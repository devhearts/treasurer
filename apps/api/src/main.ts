import { Logger, LogLevel } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { resolveNestLogLevels } from "./common/log-levels";

async function bootstrap() {
  const logLevels = resolveNestLogLevels();
  const nestLogger: LogLevel[] | false =
    logLevels.length === 0 ? false : logLevels;
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: nestLogger,
    bufferLogs: true,
  });
  app.useBodyParser("json", { limit: "2mb" });
  app.useLogger(nestLogger);
  const config = app.get(ConfigService);
  const origin = config.get<string>("app.webOrigin");
  if (origin) {
    app.enableCors({
      origin,
      credentials: true,
    });
  }
  const port = config.get<number>("app.port") ?? 4000;
  await app.listen(port, "0.0.0.0");
  const logger = new Logger("Bootstrap");
  logger.log(`Treasurer API listening on 0.0.0.0:${port}`);
}
bootstrap();
