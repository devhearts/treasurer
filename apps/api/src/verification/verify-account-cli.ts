/**
 * Account verification admin CLI (enroll, list, show, approve, reject).
 *
 * Local:
 *   npm run verify-account -w @treasurer/api -- list
 *   npm run verify-account -w @treasurer/api -- enroll --user-id=<uuid> --reviewer=ops@example.com
 *
 * Docker:
 *   npm run docker:verify-account -- approve --user-id=<uuid> --reviewer=ops@example.com
 */
import { ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import configuration from "../config/configuration";
import * as schema from "../database/schema";
import {
  approveUserVerification,
  enrollUserVerification,
  getVerificationForShow,
  listPendingVerifications,
  proxyReviewImageUrls,
  rejectUserVerification,
} from "./verification-admin";

function argValue(flag: string): string | undefined {
  const eqPrefix = `${flag}=`;
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith(eqPrefix)) {
      const v = arg.slice(eqPrefix.length);
      return v || undefined;
    }
    if (arg === flag) {
      const v = process.argv[i + 1];
      if (v && !v.startsWith("--")) return v;
      return undefined;
    }
  }
  return undefined;
}

function usage(): void {
  console.log(`Usage:
  verify-account enroll --user-id=<uuid> [--reviewer=name]
  verify-account list
  verify-account show --user-id=<uuid>
  verify-account approve --user-id=<uuid> [--reviewer=name]
  verify-account reject --user-id=<uuid> --reason="..." [--reviewer=name]
`);
}

async function main() {
  const cmd = process.argv[2];
  if (!cmd || cmd === "--help" || cmd === "-h") {
    usage();
    process.exit(cmd ? 0 : 1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.trim()) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const config = new ConfigService({ app: configuration() });
  const pool = mysql.createPool(databaseUrl);
  const db = drizzle(pool, { schema, mode: "default" });

  const reviewer =
    argValue("--reviewer") ?? process.env.USER ?? "cli-operator";

  try {
    if (cmd === "list") {
      const rows = await listPendingVerifications(db);
      if (!rows.length) {
        console.log("No pending verifications.");
        return;
      }
      console.log(
        "userId\temail\tlegalName\tphone\tsubmittedAt"
      );
      for (const r of rows) {
        console.log(
          `${r.userId}\t${r.email}\t${r.legalName ?? ""}\t${r.phoneMsisdn ?? ""}\t${r.submittedAt ?? ""}`
        );
      }
      return;
    }

    const userId = argValue("--user-id");
    if (!userId && cmd !== "list") {
      console.error("--user-id is required");
      usage();
      process.exit(1);
    }

    if (cmd === "enroll") {
      await enrollUserVerification(db, userId!, reviewer);
      console.log(`Enrolled ${userId} for verification.`);
      return;
    }

    if (cmd === "show") {
      const row = await getVerificationForShow(db, userId!);
      if (!row) {
        console.error("No verification record for user.");
        process.exit(1);
      }
      console.log(JSON.stringify(row, null, 2));
      const publicWebUrl =
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        config.get<string>("app.nextPublicAppUrl")?.trim() ||
        process.env.WEB_ORIGIN?.trim() ||
        config.get<string>("app.webOrigin")?.trim() ||
        "http://localhost:3000";
      const proxySecret =
        process.env.INTERNAL_PROXY_SECRET?.trim() ||
        config.get<string>("app.internalProxySecret")?.trim() ||
        "";
      const urls = proxyReviewImageUrls(
        publicWebUrl,
        proxySecret,
        userId!,
        {
          selfie: row.selfieKey,
          idFront: row.idFrontKey,
          idBack: row.idBackKey,
        }
      );
      if (Object.values(urls).some(Boolean)) {
        console.log("\nReview image URLs (1h, via API):");
        console.log(JSON.stringify(urls, null, 2));
      } else if (!proxySecret) {
        console.warn(
          "INTERNAL_PROXY_SECRET not set; cannot generate review URLs."
        );
      }
      return;
    }

    if (cmd === "approve") {
      await approveUserVerification(db, userId!, reviewer);
      console.log(`Approved verification for ${userId}.`);
      return;
    }

    if (cmd === "reject") {
      const reason = argValue("--reason");
      if (!reason?.trim()) {
        console.error("--reason is required for reject");
        process.exit(1);
      }
      await rejectUserVerification(db, userId!, reason, reviewer);
      console.log(`Rejected verification for ${userId}.`);
      return;
    }

    console.error(`Unknown command: ${cmd}`);
    usage();
    process.exit(1);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(msg);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
