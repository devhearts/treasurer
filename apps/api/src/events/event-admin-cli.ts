/**
 * Event lifecycle admin CLI (suspend, unsuspend, list, show).
 *
 * Local:
 *   npm run event-admin -w @treasurer/api -- list
 *   npm run event-admin -w @treasurer/api -- suspend --slug=my-event --reason="ToS violation"
 *
 * Docker:
 *   npm run docker:event-admin -- suspend --slug=my-event --reason="ToS violation"
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../database/schema";
import {
  getEventForAdmin,
  listEventsForAdmin,
  suspendEvent,
  unsuspendEvent,
} from "./event-admin";
import {
  EVENT_LIFECYCLE_STATUSES,
  parseEventLifecycleStatus,
  type EventLifecycleStatus,
} from "./event-lifecycle";

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
  event-admin suspend --slug=<slug> --reason="..."
  event-admin unsuspend --slug=<slug>
  event-admin show --slug=<slug>
  event-admin list [--status=active|paused|stopped|suspended]
`);
}

function parseStatusFilter(): EventLifecycleStatus | undefined {
  const raw = argValue("--status");
  if (!raw) return undefined;
  const status = parseEventLifecycleStatus(raw);
  if (!EVENT_LIFECYCLE_STATUSES.includes(status)) {
    throw new Error(
      `Invalid --status. Use one of: ${EVENT_LIFECYCLE_STATUSES.join(", ")}`
    );
  }
  return status;
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

  const pool = mysql.createPool(databaseUrl);
  const db = drizzle(pool, { schema, mode: "default" });

  try {
    if (cmd === "list") {
      const statusFilter = parseStatusFilter();
      const rows = await listEventsForAdmin(db, statusFilter);
      if (!rows.length) {
        console.log("No events found.");
        return;
      }
      console.log("slug\ttitle\tstatus\tstatusChangedAt");
      for (const r of rows) {
        console.log(
          `${r.slug}\t${r.title}\t${r.status}\t${r.statusChangedAt ?? ""}`
        );
      }
      return;
    }

    const slug = argValue("--slug");
    if (!slug?.trim()) {
      console.error("--slug is required");
      usage();
      process.exit(1);
    }

    if (cmd === "show") {
      const row = await getEventForAdmin(db, slug);
      if (!row) {
        console.error("Event not found.");
        process.exit(1);
      }
      console.log(JSON.stringify(row, null, 2));
      return;
    }

    if (cmd === "suspend") {
      const reason = argValue("--reason");
      if (!reason?.trim()) {
        console.error("--reason is required for suspend");
        process.exit(1);
      }
      const row = await suspendEvent(db, slug, reason);
      console.log(
        `Suspended ${slug} (restored status on unsuspend: ${row.preSuspendStatus ?? "active"}).`
      );
      return;
    }

    if (cmd === "unsuspend") {
      const row = await unsuspendEvent(db, slug);
      console.log(`Unsuspended ${slug} → status=${row.status}.`);
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
