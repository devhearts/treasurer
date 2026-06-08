/**
 * One-time backfill: compress slot-0 gallery images into events/{eventId}/og.png.
 *
 * Run after deploying OG upload code and `db:migrate`:
 *   npm run db:backfill-event-og -w @treasurer/api
 *
 * Requires DATABASE_URL and Garage env vars (GARAGE_ENDPOINT, GARAGE_BUCKET, etc.).
 */
import { ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { isNotNull } from "drizzle-orm";
import configuration from "../config/configuration";
import * as schema from "./schema";
import { StorageService } from "../integrations/storage.service";
import {
  compressEventOgImage,
  eventOgImageKey,
  legacyEventOgWebpKey,
  slot0KeyFromGarageKeys,
  EVENT_OG_CONTENT_TYPE,
} from "../events/event-og-image";

function imageUrlsFromRow(raw: unknown): string[] | undefined {
  if (raw == null) return undefined;
  let parsed: unknown = raw;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return undefined;
    }
  }
  if (!Array.isArray(parsed)) return undefined;
  const out = parsed.filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0
  );
  return out.length ? out : undefined;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.trim()) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const config = new ConfigService({ app: configuration() });
  const storage = new StorageService(config);

  if (!storage.isConfigured()) {
    console.error("Garage is not configured (GARAGE_ENDPOINT, GARAGE_BUCKET, etc.)");
    process.exit(1);
  }

  const pool = mysql.createPool(databaseUrl);
  const db = drizzle(pool, { schema, mode: "default" });

  const rows = await db
    .select({
      id: schema.events.id,
      slug: schema.events.slug,
      imageUrls: schema.events.imageUrls,
    })
    .from(schema.events)
    .where(isNotNull(schema.events.imageUrls));

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const keys = imageUrlsFromRow(row.imageUrls);
    if (!keys?.length) {
      skipped++;
      continue;
    }

    const slot0Key = slot0KeyFromGarageKeys(keys, row.id);
    if (!slot0Key) {
      skipped++;
      continue;
    }

    const ogKey = eventOgImageKey(row.id);
    if (await storage.headObject(ogKey)) {
      skipped++;
      continue;
    }

    try {
      const source = await storage.getObjectBuffer(slot0Key);
      if (!source) {
        console.warn(`[skip] ${row.slug}: slot-0 object missing (${slot0Key})`);
        failed++;
        continue;
      }
      const og = await compressEventOgImage(source);
      await storage.putObject(ogKey, og, EVENT_OG_CONTENT_TYPE);
      await storage.deleteObject(legacyEventOgWebpKey(row.id)).catch(() => undefined);
      processed++;
      console.log(`[ok] ${row.slug} → ${ogKey}`);
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[fail] ${row.slug}: ${msg}`);
    }
  }

  await pool.end();

  console.log(
    `Backfill complete: ${processed} processed, ${skipped} skipped, ${failed} failed (${rows.length} events with image_urls).`
  );
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
