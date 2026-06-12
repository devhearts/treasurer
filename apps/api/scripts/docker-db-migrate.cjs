/**
 * Docker one-shot DB setup:
 * 1. Ensures `__drizzle_migrations` exists.
 * 2. Repairs a false baseline (`0000_init` recorded but schema older than current app — e.g. prior `push` without `email_verified_at`).
 * 3. Runs `drizzle-kit push` when `users` exists but expected columns/tables from current schema are missing.
 * 4. Inserts a real baseline row for `0000_init` only when tables already exist and schema matches (so `migrate` does not replay CREATEs).
 * 5. Runs `drizzle-kit migrate` (applies any newer migration files).
 *
 * Run from repo root with DATABASE_URL set (see Dockerfile migrator).
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");
const mysql = require("mysql2/promise");

const MIGRATIONS_TABLE = "`__drizzle_migrations`";

async function getDbName(conn) {
  const [[row]] = await conn.query("SELECT DATABASE() AS db");
  return row?.db || null;
}

async function tableExists(conn, dbName, table) {
  if (!dbName) return false;
  const [[r]] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.tables
     WHERE table_schema = ? AND table_name = ?`,
    [dbName, table]
  );
  return Number(r.c) > 0;
}

async function columnExists(conn, dbName, table, column) {
  if (!dbName) return false;
  const [[r]] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
    [dbName, table, column]
  );
  return Number(r.c) > 0;
}

/** True when DB looks older than current Drizzle schema (missing expected columns/tables). */
async function needsSchemaPush(conn, dbName, usersExists) {
  if (!usersExists) return false;
  const hasEmailVerifiedCol = await columnExists(
    conn,
    dbName,
    "users",
    "email_verified_at"
  );
  const hasEvTable = await tableExists(
    conn,
    dbName,
    "email_verification_tokens"
  );
  const hasAccountVerifiedCol = await columnExists(
    conn,
    dbName,
    "users",
    "account_verified_at"
  );
  const hasAccountVerifications = await tableExists(
    conn,
    dbName,
    "account_verifications"
  );
  return (
    !hasEmailVerifiedCol ||
    !hasEvTable ||
    !hasAccountVerifiedCol ||
    !hasAccountVerifications
  );
}

async function hasMigrationHash(conn, hash) {
  const [[r]] = await conn.query(
    `SELECT COUNT(*) AS c FROM ${MIGRATIONS_TABLE} WHERE hash = ?`,
    [hash]
  );
  return Number(r.c) > 0;
}

async function deleteMigrationHash(conn, hash) {
  await conn.query(`DELETE FROM ${MIGRATIONS_TABLE} WHERE hash = ?`, [hash]);
}

async function insertBaseline(conn, hash, when) {
  await conn.query(
    `INSERT INTO ${MIGRATIONS_TABLE} (\`hash\`, \`created_at\`) VALUES (?, ?)`,
    [hash, when]
  );
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.trim()) {
    console.error("docker-db-migrate: DATABASE_URL is required");
    process.exit(1);
  }

  const repoRoot = path.resolve(__dirname, "../../..");
  const apiRoot = path.join(repoRoot, "apps", "api");
  const drizzleFolder = path.join(apiRoot, "drizzle");
  const journalPath = path.join(drizzleFolder, "meta", "_journal.json");

  if (!fs.existsSync(journalPath)) {
    console.error(`docker-db-migrate: missing ${journalPath}`);
    process.exit(1);
  }

  const createMigrationsTable = `
CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
  id serial primary key,
  hash text not null,
  created_at bigint
)`;

  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  const entries = journal.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    console.error("docker-db-migrate: journal has no entries");
    process.exit(1);
  }

  const first = entries[0];
  const sqlPath = path.join(drizzleFolder, `${first.tag}.sql`);
  if (!fs.existsSync(sqlPath)) {
    console.error(`docker-db-migrate: missing migration file ${sqlPath}`);
    process.exit(1);
  }
  const sqlBody = fs.readFileSync(sqlPath, "utf8");
  const hash0000 = crypto.createHash("sha256").update(sqlBody).digest("hex");

  const conn = await mysql.createConnection(databaseUrl);
  try {
    await conn.query(createMigrationsTable);

    const dbName = await getDbName(conn);
    const usersExists = await tableExists(conn, dbName, "users");
    let needsPush = await needsSchemaPush(conn, dbName, usersExists);
    let has0000 = await hasMigrationHash(conn, hash0000);

    if (has0000 && usersExists && needsPush) {
      console.log(
        "[docker-db-migrate] Removing false baseline for 0000_init (schema behind migration record)."
      );
      await deleteMigrationHash(conn, hash0000);
      has0000 = false;
    }

    if (needsPush) {
      console.log(
        "[docker-db-migrate] Syncing schema with drizzle-kit push (additive; legacy DB missing objects from schema.ts)."
      );
      execSync("npm run db:push -w @treasurer/api", {
        cwd: repoRoot,
        stdio: "inherit",
        env: process.env,
      });
      needsPush = await needsSchemaPush(conn, dbName, usersExists);
      if (needsPush) {
        console.error(
          "docker-db-migrate: schema still incomplete after push; check DATABASE_URL and schema."
        );
        process.exit(1);
      }
    }

    has0000 = await hasMigrationHash(conn, hash0000);
    const [[{ c: migrationRowCount }]] = await conn.query(
      `SELECT COUNT(*) AS c FROM ${MIGRATIONS_TABLE}`
    );

    if (
      Number(migrationRowCount) === 0 &&
      usersExists &&
      !needsPush &&
      !has0000
    ) {
      await insertBaseline(conn, hash0000, first.when);
      console.log(
        `[docker-db-migrate] Recorded baseline for ${first.tag} (existing tables, no migration history).`
      );
    }
  } finally {
    await conn.end();
  }

  execSync("npm run db:migrate -w @treasurer/api", {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
