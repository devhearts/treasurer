/**
 * Optional seed for local MySQL (`npm run db:seed -w @treasurer/api` after `db:migrate` or `db:push`).
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";
import { randomUUID } from "crypto";
import * as bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { formatMysqlDateTimeUtc } from "../common/mysql-datetime";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const pool = mysql.createPool(url);
  const db = drizzle(pool, { schema, mode: "default" });
  const email = "demo@example.com";
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (existing.length) {
    console.log("Seed skipped: user already exists.");
    await pool.end();
    return;
  }
  const id = randomUUID();
  const passwordHash = await bcrypt.hash("demo1234", 10);
  const createdAt = formatMysqlDateTimeUtc(new Date());
  await db.insert(schema.users).values({
    id,
    email,
    passwordHash,
    createdAt,
    emailVerifiedAt: createdAt,
  });
  console.log(`Created demo user ${email} / demo1234`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
