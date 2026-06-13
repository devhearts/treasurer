/**
 * Manual deposit reconciliation (stale unfulfilled payment intents).
 *
 * Local (run `npm run build -w @treasurer/api` first):
 *   npm run deposit-reconciliation -w @treasurer/api
 *
 * Docker:
 *   npm run docker:deposit-reconciliation
 */
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { ReconciliationService } from "./reconciliation.service";

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });

  try {
    const reconciliation = app.get(ReconciliationService);
    const summary = await reconciliation.runOnce();
    Logger.log(
      `Deposit reconciliation finished: ${JSON.stringify(summary)}`,
      "deposit-reconciliation-cli"
    );
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
