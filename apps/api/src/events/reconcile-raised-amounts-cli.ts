/**
 * Repair events.raised_amount from visible paid contributions.
 *
 *   npm run reconcile-raised-amounts -w @treasurer/api
 *   npm run docker:reconcile-raised-amounts:staging
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../database/schema";
import { reconcileAllEventRaisedAmounts } from "./event-raised-amount";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.trim()) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const pool = mysql.createPool(databaseUrl);
  const db = drizzle(pool, { schema, mode: "default" });

  try {
    const summary = await reconcileAllEventRaisedAmounts(db);
    console.log(
      `Reconciled raised_amount for ${summary.checked} event(s); ${summary.fixed} updated.`
    );
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
