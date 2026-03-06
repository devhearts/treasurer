import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import { mkdirSync } from "fs";

const dbPath =
  process.env.DATABASE_PATH ??
  path.join(process.cwd(), "data", "ceremonywallet.db");

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    initDb();
    const sqlite = new Database(dbPath);
    _db = drizzle(sqlite, { schema });
  }
  return _db;
}

export function initDb() {
  const dir = path.dirname(dbPath);
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    // dir may already exist
  }
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite, { schema });
  // Create tables (Drizzle doesn't create tables by default; we run raw SQL for init)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      organizer TEXT NOT NULL,
      treasurer_phone TEXT NOT NULL,
      description TEXT NOT NULL,
      target_amount INTEGER NOT NULL,
      raised_amount INTEGER NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      location TEXT NOT NULL,
      created_at TEXT NOT NULL,
      subscription_paid INTEGER NOT NULL DEFAULT 0
    );
  `);
  // Migration: add user_id to events if missing (existing DBs created before we added this column)
  try {
    const info = sqlite.prepare("PRAGMA table_info(events)").all() as { name: string }[];
    if (!info.some((c) => c.name === "user_id")) {
      sqlite.exec("ALTER TABLE events ADD COLUMN user_id TEXT");
    }
  } catch {
    // ignore
  }
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
    CREATE TABLE IF NOT EXISTS budget_items (
      id TEXT NOT NULL,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      amount INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS contributions (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      anonymous INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      phone TEXT NOT NULL,
      message TEXT,
      status TEXT NOT NULL,
      date TEXT NOT NULL,
      manual INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_budget_items_event_id ON budget_items(event_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_event_id ON contributions(event_id);
    CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
  `);
  sqlite.close();
}
