# Docker host port profiles

Published **host** ports are centralized in [`ports.base.json`](ports.base.json). Each profile adds a fixed offset to every base port so multiple stacks can run on one machine:

| Profile     | Offset | Command |
|------------|--------|---------|
| default    | 0      | `docker compose up` (same as historical defaults) |
| dev        | +30    | `npm run docker:up:dev` or `docker compose --env-file docker/ports.host.dev.env up` |
| staging    | +40    | `npm run docker:up:staging` |
| production | +50    | `npm run docker:up:production` |

**Inside** the Compose network, services still use the original container ports (`mysql:3306`, `api:4000`, `mailpit:1025`, `garage:3900`, etc.). The **host** side of `ports:` uses `HOST_PORT_*` offsets. **`staging`** and **`production`** also set **`HOST_BIND=127.0.0.1`** so published ports listen on localhost only (reverse proxy / SSH tunnel on the same VM); **`default`** and **`dev`** omit it and bind `0.0.0.0` for local access. **`WEB_ORIGIN` / `NEXT_PUBLIC_APP_URL`**: `default` and `dev` use `http://localhost:<HOST_PORT_WEB>`; **`staging`** uses `https://staging.ceremonywallet.com`; **`production`** uses `https://ceremonywallet.com` (set in [`generate-port-envs.mjs`](generate-port-envs.mjs)—expect TLS at the edge proxy in front of `HOST_PORT_WEB`).

## Regenerating env files

After editing [`ports.base.json`](ports.base.json), run:

```bash
npm run docker:gen-ports
```

That rewrites `docker/ports.host.{default,dev,staging,production}.env`.

## Combining with `.env` (secrets)

Compose loads `--env-file` in order; later files override earlier keys. Put **secrets last**:

```bash
docker compose --env-file docker/ports.host.dev.env --env-file .env up --build
```

If your `.env` sets `WEB_ORIGIN` or `NEXT_PUBLIC_APP_URL`, it overrides the profile URLs—remove those lines from `.env` when using a port profile, or set them to the same host ports as the profile.

## Host-only tools (API / DB outside Docker)

If MySQL is mapped to `HOST_PORT_MYSQL` on localhost, point `DATABASE_URL` at `127.0.0.1:<HOST_PORT_MYSQL>` in `apps/api/.env`. Match values from the same profile file you use for Compose.

## Container port matrix (fixed inside the stack)

These are the **right-hand** (container) sides of compose mappings and what each file encodes. Host publishing uses `HOST_PORT_*` from `ports.base.json` + profile offset.

| Service / role | Container port | Declared in |
|----------------|----------------|-------------|
| MariaDB | 3306 | MariaDB image default; compose `…:3306` |
| Mailpit UI | 8025 | Official image; compose `…:8025` |
| Mailpit SMTP | 1025 | Official image; compose `…:1025` |
| Garage S3 API | 3900 | [`docker/garage.toml`](garage.toml) `[s3_api]` `api_bind_addr`; compose `…:3900`; API `GARAGE_ENDPOINT=http://garage:3900` |
| Garage Admin API | 3903 | [`docker/garage.toml`](garage.toml) `[admin]` `api_bind_addr`; compose `…:3903` |
| Garage RPC | 3901 | [`docker/garage.toml`](garage.toml) `rpc_bind_addr` — **not** published to host; cluster/internal |
| Garage S3 web UI | 3902 | [`docker/garage.toml`](garage.toml) `[s3_web]` `bind_addr` — **not** published to host |
| Nest API | 4000 | [`apps/api/Dockerfile`](../apps/api/Dockerfile) `EXPOSE`; compose `PORT`; `API_INTERNAL_URL` uses `http://api:4000` on the bridge network |
| Next web | 3000 | [`apps/web/Dockerfile`](../apps/web/Dockerfile) `EXPOSE` / `ENV PORT`; compose `…:3000` |

The **`db-migrate`** image has no published ports; it only needs `DATABASE_URL` to `mysql:3306` on the internal network.

The **`db-backfill-event-og`** one-shot service compresses existing slot-0 gallery images into `events/{eventId}/og.png`. It needs `DATABASE_URL` (internal `mysql:3306`) and Garage env (`GARAGE_ENDPOINT=http://garage:3900`, keys from `.env`). Run after deploy + `db:migrate`:

```bash
npm run docker:db-backfill-event-og              # default profile (ports.host.default.env)
npm run docker:db-backfill-event-og:dev           # dev stack (+ docker-compose.dev.yml merge)
npm run docker:db-backfill-event-og:staging
npm run docker:db-backfill-event-og:production
```

Ensure the stack is up (`mysql` + `garage` healthy) before running. Regenerate profile env files with `npm run docker:gen-ports` after editing `ports.base.json`.

## Verification

After changing `docker-compose.yml`, [`docker/garage.toml`](garage.toml), or either Dockerfile, run:

```bash
npm run docker:verify-ports
```

That script checks compose `${HOST_PORT_*:-defaults}` against [`ports.base.json`](ports.base.json), Garage S3/admin bind ports, and `EXPOSE` / `PORT` in the API and web Dockerfiles.

## UFW does not block Docker-published ports

**`ufw deny 3356` will not close a port that Docker publishes to `0.0.0.0`.** Docker inserts its own `iptables` DNAT rules (in the `DOCKER` chain) that forward traffic **before** UFW evaluates its rules. This is a long-standing Docker + UFW interaction; the deny rule may show as active in `ufw status` while the port stays reachable from the internet.

**Fix (preferred): bind to localhost.** Staging/production profiles set `HOST_BIND=127.0.0.1` in `ports.host.{staging,production}.env`. Recreate the stack so Docker re-binds the port:

```bash
docker compose --env-file docker/ports.host.production.env up -d
```

Verify on the server:

```bash
sudo ss -tlnp | grep 3356
# want: 127.0.0.1:3356   NOT: 0.0.0.0:3356
```

Test from **another machine** (not SSH'd into the VM — localhost access still works on the server itself):

```bash
nc -zv YOUR_SERVER_PUBLIC_IP 3356   # should fail / time out after fix
```

**Emergency block** (until you redeploy with `HOST_BIND`), drop non-localhost traffic in Docker's `DOCKER-USER` chain (survives until Docker restarts unless persisted):

```bash
sudo iptables -I DOCKER-USER -p tcp --dport 3356 ! -s 127.0.0.0/8 -j DROP
```

**Strongest option for production:** MariaDB does not need a host port at all — the API and migrator connect via `mysql:3306` on the Compose network. You can remove the `mysql` `ports:` block entirely on production if you never run `mysql` from the host shell.

