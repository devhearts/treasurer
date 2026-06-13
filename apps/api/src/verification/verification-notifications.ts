import { eq } from "drizzle-orm";
import { ConfigService } from "@nestjs/config";
import type { DrizzleDb } from "../database/database.module";
import * as schema from "../database/schema";
import { MailService } from "../integrations/mail.service";
import { getVerificationForShow } from "./verification-admin";

function appBaseUrl(config: ConfigService): string {
  const pub = config.get<string>("app.nextPublicAppUrl")?.trim();
  if (pub) return pub.replace(/\/$/, "");
  const web = config.get<string>("app.webOrigin")?.trim();
  return (web || "http://localhost:3000").replace(/\/$/, "");
}

async function userEmail(
  db: DrizzleDb,
  userId: string
): Promise<string | null> {
  const rows = await db
    .select({ email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  return rows[0]?.email?.trim() || null;
}

export async function notifyUserVerificationApproved(
  db: DrizzleDb,
  mail: MailService,
  config: ConfigService,
  userId: string
): Promise<void> {
  const to = await userEmail(db, userId);
  if (!to) return;

  const row = await getVerificationForShow(db, userId);
  const base = appBaseUrl(config);

  await mail.sendVerificationApproved(to, {
    legalName: row?.legalName ?? "Account holder",
    phoneMsisdn: row?.phoneMsisdn ?? "",
    withdrawUrl: `${base}/app/withdraw`,
    accountUrl: `${base}/app/account`,
  });
}

export async function notifyUserVerificationRejected(
  db: DrizzleDb,
  mail: MailService,
  config: ConfigService,
  userId: string,
  reason: string
): Promise<void> {
  const to = await userEmail(db, userId);
  if (!to) return;

  const base = appBaseUrl(config);
  await mail.sendVerificationRejected(to, {
    reason,
    verifyAccountUrl: `${base}/app/verify-account`,
  });
}
