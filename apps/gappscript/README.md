# Google Apps Script — Treasurer MySQL connector

JDBC-based [Google Apps Script](https://developers.google.com/apps-script) project that syncs Treasurer MariaDB tables into a bound Google Spreadsheet (one tab per table).

Source: [`mysql-excel-connector/`](mysql-excel-connector/)

## Prerequisites

- Google account with access to Google Sheets and Apps Script
- A **bound** Spreadsheet (Extensions → Apps Script opens the container script)
- Treasurer MariaDB reachable from the **public internet** — Apps Script runs on Google servers and **cannot** connect to `127.0.0.1` or a laptop-only Docker port
- Firewall rules that allow [Google JDBC IP ranges](https://developers.google.com/apps-script/guides/jdbc#connecting-to)

For staging/production, use the server's public host/IP (or Google Cloud SQL). Local `DATABASE_URL` in [`apps/api/.env.example`](../api/.env.example) is for development only.

## Deploy

### Option A — Copy files manually

1. Create a new Google Spreadsheet.
2. Open **Extensions → Apps Script**.
3. Create `.gs` files matching this repo (`Config.gs`, `Database.gs`, `SshProxyDatabase.gs`, `SheetWriter.gs`, `Sync.gs`, `Main.gs`) and paste the contents.
4. Set **Project settings → Script properties** (or use the in-sheet menu) — see [Configure connection](#configure-connection).
5. Reload the spreadsheet; the **Treasurer DB** menu appears.

### Option B — clasp (optional)

```bash
npm install -g @google/clasp
clasp login
cd apps/gappscript/mysql-excel-connector
cp .clasp.json.example .clasp.json   # set scriptId after creating the Apps Script project
clasp push
```

Create the Apps Script project from the spreadsheet first (**Extensions → Apps Script**), then copy the script ID from Project settings into `.clasp.json`.

## Configure connection

Use **Treasurer DB → Configure Connection**, **Paste Connection String**, or set Script Properties manually.

### Direct JDBC (MySQL reachable from Google)

| Property | Example | Notes |
|----------|---------|-------|
| `CONNECTION_MODE` | `direct` | Default |
| `JDBC_HOST` | `db.example.com` | Must be reachable from Google |
| `JDBC_PORT` | `3306` | Default if omitted |
| `JDBC_DATABASE` | `treasurer` | Default if omitted |
| `JDBC_USER` | `treasurer` | Prefer a **read-only** DB user |
| `JDBC_PASSWORD` | *(secret)* | Never commit to git |

Direct JDBC URL:

```
jdbc:mysql://HOST:PORT/DATABASE?useSSL=false&useUnicode=true&characterEncoding=UTF-8
```

Connection string format:

```
mysql://treasurer:password@db.example.com:3306/treasurer
```

### SSH tunnel (MySQL only on the SSH server, e.g. `127.0.0.1:3346`)

Apps Script **cannot** open SSH tunnels itself. Use **SSH mode** with the companion [`ssh-jdbc-proxy/`](ssh-jdbc-proxy/) service deployed on a public host.

| Property | Example | Notes |
|----------|---------|-------|
| `CONNECTION_MODE` | `ssh` | Set automatically when SSH fields are present |
| `SSH_HOST` | `staging.example.com` | SSH bastion IP/hostname |
| `SSH_PORT` | `22` | Default if omitted |
| `SSH_USER` | `deploy` | SSH username |
| `SSH_PASSWORD` | *(secret)* | SSH password |
| `JDBC_HOST` | `127.0.0.1` | MySQL host **as seen from the SSH server** |
| `JDBC_PORT` | `3346` | MySQL port on the SSH server |
| `JDBC_DATABASE` | `treasurer` | Database name |
| `JDBC_USER` | `treasurer` | MySQL user |
| `JDBC_PASSWORD` | *(secret)* | MySQL password |
| `SSH_PROXY_URL` | `https://proxy.example.com` | Public URL of ssh-jdbc-proxy |
| `SSH_PROXY_TOKEN` | *(secret)* | Must match proxy `PROXY_AUTH_TOKEN` |

SSH connection string format:

```
ssh://sshuser:sshpass@staging.example.com:22/mysql://treasurer:dbpass@127.0.0.1:3346/treasurer|proxy:https://proxy.example.com
```

### Deploy ssh-jdbc-proxy

```bash
cd apps/gappscript/ssh-jdbc-proxy
cp .env.example .env   # set PROXY_AUTH_TOKEN
npm install
npm start
```

Expose port `8080` (or `PORT`) on a host reachable from Google. Set the same token in Apps Script as `SSH_PROXY_TOKEN`.

Google's JDBC driver rejects newer MySQL connector params such as `allowPublicKeyRetrieval` and `serverTimezone` — do not add them to direct JDBC URLs.

## Firewall

Authorize Google's JDBC egress IPs on your database host. Google publishes the list at [Connecting to external databases](https://developers.google.com/apps-script/guides/jdbc#connecting-to). Add each CIDR range to your security group or `iptables` rules.

## MariaDB / MySQL auth

Treasurer uses **MariaDB 11** in Docker. Apps Script ships a legacy JDBC driver. If you use MySQL 8+ with `caching_sha2_password`, you may need to switch the export user to `mysql_native_password`:

```sql
ALTER USER 'treasurer_readonly'@'%' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

## Run a sync

1. Open the bound spreadsheet.
2. **Treasurer DB → Configure Connection** (first time only).
3. **Treasurer DB → Sync All Tables** — creates/updates one tab per table and records sync times on `_meta`.
4. **Treasurer DB → Sync Active Sheet Tab** — refreshes only the tab you have selected.

## Exported tables (default)

Configured in [`Config.gs`](mysql-excel-connector/Config.gs). Reporting-focused tables with sensitive columns excluded:

| Sheet tab | Table | Excluded columns |
|-----------|-------|------------------|
| `events` | `events` | `description`, `image_urls` |
| `contributions` | `contributions` | — |
| `payment_intents` | `payment_intents` | — |
| `payment_status_events` | `payment_status_events` | `meta` |
| `withdrawals` | `withdrawals` | — |
| `wallet_transactions` | `wallet_transactions` | — |
| `user_wallets` | `user_wallets` | — |
| `users` | `users` | `password_hash` |
| `invitations` | `invitations` | `content_json` |
| `invitation_recipients` | `invitation_recipients` | `view_token` |

OTP, session, and token tables are omitted by default. Add entries to `EXPORT_TABLES` in `Config.gs` to extend.

## Scheduled sync

1. Open the bound spreadsheet.
2. **Treasurer DB → Enable Scheduled Sync (hourly)** — authorizes the script if prompted, stores the spreadsheet ID, and installs an hourly trigger for `syncAllTables`.
3. Each run logs a summary to `_meta` columns **E–F** (`last_scheduled_sync_at`, `last_scheduled_sync_summary`).
4. **Treasurer DB → Disable Scheduled Sync (hourly)** removes the trigger.

Scheduled runs have no UI dialog; use **Executions** in the Apps Script editor to debug failures.

## Security

- Use a read-only database user with `SELECT` on the exported tables only.
- Store credentials in Script Properties, not in source files.
- Do not share the spreadsheet or script project with untrusted editors.

## Schema reference

Table and column names follow [`apps/api/src/database/schema.ts`](../api/src/database/schema.ts). Update `EXPORT_TABLES` when the Drizzle schema changes.
