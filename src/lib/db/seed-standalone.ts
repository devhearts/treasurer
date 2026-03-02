/**
 * Run this script to create the database and seed it with demo events.
 * Usage: npx tsx src/lib/db/seed-standalone.ts
 */
import { initDb, getDb } from "./index";
import { seedDb } from "./seed";

initDb();
getDb();
seedDb();
console.log("Database seeded with demo events.");
