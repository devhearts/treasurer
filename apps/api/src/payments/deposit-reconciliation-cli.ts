/**
 * Manual deposit reconciliation (stale unfulfilled payment intents).
 *
 * Local (run `npm run build -w @treasurer/api` first):
 *   npm run deposit-reconciliation -w @treasurer/api
 *
 * Docker (rebuilds image each run):
 *   npm run docker:deposit-reconciliation
 */
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DepositReconciliationCliModule } from "./deposit-reconciliation-cli.module";
import { ReconciliationService } from "./reconciliation.service";

async function main() {
  const app = await NestFactory.createApplicationContext(
    DepositReconciliationCliModule,
    { logger: ["error", "warn", "log"] }
  );

  const reconciliation = app.get(ReconciliationService);
  const summary = await reconciliation.runOnce();
  Logger.log(
    `Deposit reconciliation finished: ${JSON.stringify(summary)}`,
    "deposit-reconciliation-cli"
  );
  // One-shot CLI: exit immediately. app.close() can hang (DB pool / schedulers).
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
