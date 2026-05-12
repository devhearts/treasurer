# Project context

## Stack (May 2026): NestJS API + MySQL + Next.js web

- **Monorepo** (`npm` workspaces): `apps/api` (Nest 11), `apps/web` (Next 16). Root scripts: `npm run dev`, `npm run build`, `npm run db:push` (dev schema sync to DB), `npm run db:migrate` (apply versioned SQL from [`apps/api/drizzle/`](apps/api/drizzle/)).
- **Database**: MariaDB/MySQL; Drizzle schema in [`apps/api/src/database/schema.ts`](apps/api/src/database/schema.ts). **New migrations**: from `apps/api`, run `npx drizzle-kit generate`. Apply: `npm run db:migrate` (host), or `docker compose up` (runs `db-migrate` before `api`), or `npm run docker:db-migrate` to run the migrator only. For local rapid iteration without migration files, `npm run db:push` still syncs schema directly. Optional seed: `npm run db:seed -w @treasurer/api`.
- **Docker**: [`docker-compose.yml`](docker-compose.yml) — MariaDB, Mailpit, [Garage](https://garagehq.deuxfleurs.fr/) (`dxflrs/garage`, config [`docker/garage.toml`](docker/garage.toml)), `db-migrate` ([`docker-db-migrate.cjs`](apps/api/scripts/docker-db-migrate.cjs): **baseline** `__drizzle_migrations` for the first journal SQL when `users` exists but migration history is empty—legacy `drizzle-kit push`—then **`drizzle-kit migrate`**), Nest `api`, Next `web`. **Host ports** are centralized: [`docker/ports.base.json`](docker/ports.base.json) + [`docker/generate-port-envs.mjs`](docker/generate-port-envs.mjs) (`npm run docker:gen-ports`) + [`docker/verify-ports.mjs`](docker/verify-ports.mjs) (`npm run docker:verify-ports`) → `docker/ports.host.{default,dev,staging,production}.env` (+0 / +30 / +40 / +50); see [`docker/README-ports.md`](docker/README-ports.md). Compose interpolation uses repo **`.env`**. **`api` / `web`** string `env_file`: `.env` then `apps/api/.env` / `apps/web/.env`; **`db-migrate`** uses `environment.DATABASE_URL` only. `npm run docker:up:dev` / `docker:up:staging` / `docker:up:production` pass the matching port profile. Dockerfiles: [`apps/api/Dockerfile`](apps/api/Dockerfile), [`apps/web/Dockerfile`](apps/web/Dockerfile). Helpers: `docker:up`, `docker:build`, `docker:down`, `docker:logs`, `docker:db-migrate` (alias: `docker:db-push`).
- **API**: Opaque sessions (`sessions` table), `payment_intents` (contribution + subscription), `payment_status_events`, `audit_logs`. Internal-only access: `INTERNAL_PROXY_SECRET` + `x-internal-proxy-secret` (dev allows empty secret; production requires it). Health: `GET /health`, `GET /health/ready` (DB ping). **Logging**: `LOG_LEVEL` (`error` \| `warn` \| `log` \| `info` \| `debug` \| `verbose` \| `silent`); [`HttpLoggerMiddleware`](apps/api/src/common/http-logger.middleware.ts) logs each request (method, URL, status, duration); successful `GET /health*` lines are skipped to avoid probe spam.
- **Web**: BFF proxy [`apps/web/src/app/api/v1/[[...path]]/route.ts`](apps/web/src/app/api/v1/[[...path]]/route.ts) → `API_INTERNAL_URL`. Server Actions call the API with [`apps/web/src/lib/server-api.ts`](apps/web/src/lib/server-api.ts). Cookie `cerw_session` holds session id. Standalone: `node apps/web/server.js` from the standalone bundle root after `npm run build -w @treasurer/web` (see [`apps/web/Dockerfile`](apps/web/Dockerfile)).
- **Env samples**: [`env.example`](env.example), [`apps/api/.env.example`](apps/api/.env.example), [`apps/web/.env.example`](apps/web/.env.example).

## Recent: Email verification (registration)

- **DB**: `users.email_verified_at` (nullable); `users.phone` (nullable, Uganda MSISDN for new signups); `email_verification_tokens` (hashed token, expiry). **`db:migrate`** / Docker `db-migrate` then one-time `UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL` for existing accounts (noted in [`apps/api/.env.example`](apps/api/.env.example)).
- **API**: Register collects **confirm password** + **Uganda MTN/Airtel phone** (normalized `256…`); `users.phone` nullable for legacy rows. Register does **not** set a session; sends verify link via [`MailService.sendEmailVerification`](apps/api/src/integrations/mail.service.ts). `POST auth/email/verify` sets verified + session header; `POST auth/email/resend` (throttled). Login blocked until verified. [`AuthService`](apps/api/src/auth/auth.service.ts), [`AuthController`](apps/api/src/auth/auth.controller.ts). `GET auth/me` includes **`emailVerified`**.
- **Web**: [`/register/check-email`](apps/web/src/app/register/check-email/page.tsx), [`/verify-email?token=`](apps/web/src/app/verify-email/page.tsx), [`middleware`](apps/web/src/middleware.ts) matcher updates; [`LoginForm`](apps/web/src/app/login/LoginForm.tsx) resend when API returns verify message. API **`NEXT_PUBLIC_APP_URL`** in [`docker-compose.yml`](docker-compose.yml) for correct email links.

## Recent: Payment polling (Nest API + Next server actions)

- **API** ([`apps/api/src/payments/payment-status.ts`](apps/api/src/payments/payment-status.ts)): `normalizeProviderPollStatus` maps MoMo/PawaPay variants (`SUCCESSFUL`, `COMPLETED`, `SUCCESS`, …) to success / failed / pending buckets. [`pollContribution` / `pollSubscription`](apps/api/src/payments/payments.service.ts) use it for transitions and `payment_status_events`.
- **PawaPay** ([`payment-processor.factory.ts`](apps/api/src/payments/payment-processor.factory.ts)): status polling returns provider deposit states (`ACCEPTED`, `SUBMITTED`, `COMPLETED`, `FAILED`) so `COMPLETED` is treated as paid without relying on a synthetic `SUCCESSFUL` string.
- **Misconfigured processor**: poll endpoints return **`FAILED`** with the same “not configured” copy as initiate, instead of **`NOT_FOUND`** (which the UI treated as “session expired”).
- **Web** ([`server-api.ts`](apps/web/src/lib/server-api.ts)): non-OK JSON responses throw **`ServerApiError`** with HTTP **`status`**. [`momo.ts`](apps/web/src/app/actions/momo.ts) maps **401/403** on poll to **`FAILED`** (subscription vs contribution messaging) instead of infinite **`PENDING`**.
- **UI**: [`ContributeForm`](apps/web/src/app/app/events/[slug]/ContributeForm.tsx) and [`CreateEventForm`](apps/web/src/app/app/create/CreateEventForm.tsx) wait **`MOMO_FIRST_POLL_MS`** (1.2s) before the first poll, then interval polling, to reduce races right after RequestToPay / deposit creation.

## Recent: Contribution visibility (treasurer)
- **DB**: `contributions.visible` (`INTEGER NOT NULL DEFAULT 1`, Drizzle boolean); migration in `src/lib/db/index.ts`.
- **Types**: `Contribution.visible` optional; `false` hides from public-facing surfaces.
- **All contributions** (`ContributionsPageContent`): per-row toggle (Public / Hidden); server action `setContributionVisibility` in `src/app/actions/events.ts` (owner-only). Page `contributions/page.tsx` enforces same owner check as the event page.
- **`events.raised_amount`**: only **visible** contributions count. Toggling visibility updates `raised_amount` in `setContributionVisibility`; `initDb` reconciles all events from `SUM(amount)` where `visible` is true (legacy repair).
- **Public** (`/events/[slug]` via `EventDetailContent`): hero “raised” uses `event.raisedAmount`; `RecentContributionsCard` gets visible-only list.
- **Receipt** (`ContributionReceipt`): visible-only rows; `raisedAmount` prop is `event.raisedAmount` (matches total).
- **Invites** (`InviteCardGenerator`): per-contributor list uses visible + non-anonymous only.
- **Helpers**: `isPublicContribution`, `filterPublicContributions`, `sumContributionAmounts` in `src/lib/data.ts`.

## Recent: Pledge “hope to pay by” (optional)
- **DB**: `contributions.pledge_hope_by` (nullable `TEXT`, YYYY-MM-DD); migration in `src/lib/db/index.ts` for existing DBs.
- **Types**: `Contribution.pledgeHopeBy` in `src/lib/types.ts`; `addContribution` only persists it when `status === "pledged"`.
- **ContributeForm**: “Pledge (pay later)” first; tap reveals optional “Hope to pay by” date + inline “Pledge” (private + public flows); thank-you copy mentions the date when set.
- **Display**: `RecentContributionsCard`, `ContributionsPageContent` (all contributions), `ContributionReceipt` (copy + plain-text lines). `formatCalendarDate` in `src/lib/data.ts` handles date-only strings at local noon to avoid TZ drift.

## Recent: Anonymous contributions
- **ContributeForm** (`src/app/app/events/[slug]/ContributeForm.tsx`): checkbox hides the name field, clears name when checked, passes `anonymous` + stored name `"Anonymous"` to `addContribution` and `initiateMomoContribution`. Thank-you step says “Recorded anonymously.” when applicable.
- **Treasurer “Add contribution”** (`ContributionsPageContent.tsx`): same pattern for manual cash/off-app entries.
- **MoMo pending row** (`initiateMomoContribution`): when `anonymous` is true, pending `name` is set to `"Anonymous"` (display still uses `anonymous` flag everywhere lists already did).

## Recent: MTN MoMo RequestToPay

- **Collections API** (Request to Pay) integrated for contributions: OAuth token, `POST /collection/v1_0/requesttopay`, status via `GET /collection/v1_0/requesttopay/{referenceId}`.
- **Server-only**: `src/lib/momo/` (config, client, Uganda MSISDN normalization). **Payment processor**: `src/lib/payments/` — `PAYMENT_PROCESSOR_TYPE` (`mtn_momo` default, `pawapay`). `getPaymentProcessor()` / `isPaymentProcessorConfigured()`; MTN adapter wraps `src/lib/momo/client.ts`. **PawaPay** (`src/lib/pawapay/`): `POST /v1/predict-correspondent` then `POST /deposits`, status `GET /deposits/{depositId}`; env `PAWAPAY_API_TOKEN`, optional `PAWAPAY_BASE_URL`, `PAWAPAY_CURRENCY`, `PAWAPAY_COUNTRY`. **Actions**: `src/app/actions/momo.ts`. Pending rows: `momo_pending_payments`.
- **UI + validation**: active processor now exposes `supportedNetworks` (`mtn_momo`: MTN-only, `pawapay`: MTN + Airtel). Server phone validation uses this network set. Event/create pages pass dynamic labels to forms: MTN CTA is **“Pay with MTN Momo”**, pawaPay CTA is **“Pay with Mobile money”**.
- **Feature flag**: create-event subscription payment step is behind `FEATURE_SUBSCRIPTION_PAYMENT` (`true`/`1` to enable). Default/off skips "Confirm & activate" payment step entirely, letting users activate directly after details.
- **Env**: `MOMO_SUBSCRIPTION_KEY` (or `PRIMARY_KEY`), `MOMO_API_USER`, `MOMO_API_KEY`; optional `MOMO_BASE_URL` (default sandbox), `MOMO_TARGET_ENVIRONMENT` (default `sandbox`), `MOMO_CURRENCY` (default `UGX`). Portal: [MoMo use cases](https://momodeveloper.mtn.com/api-documentation/use-cases).
- **Provision API user + key (one-off)**: `npm run momo:provision` runs `scripts/provision-momo-api-user.ts` ([API description](https://momodeveloper.mtn.com/api-documentation/api-description)); needs Collections subscription key; optional `MOMO_PROVIDER_CALLBACK_HOST`.
- **HTTP**: `src/lib/momo/http.ts` adds `Accept`, `User-Agent`, and `X-Target-Environment` on all Collection calls (including token); HTML “Request Rejected” responses are detected and surfaced with MoMo support ID when present.
- **Logging**: `src/lib/momo/log.ts` (`[MoMo]` prefix); client/http log errors; `initiateMomoContribution` / `pollMomoContribution` log key events; MSISDN redacted to last four digits in action logs. MoMo API failures on start log full `internal` detail server-side; UI gets `MOMO_PUBLIC_PAYMENT_START_FAILED` from `src/lib/momo/messages.ts`.
- **Production**: `output: "standalone"` in `next.config.ts`; use `npm run build` then `npm run start` runs `node .next/standalone/server.js` (do not use `next start` with standalone — Next warns and behavior/logging can be wrong). Build runs `scripts/copy-standalone-static.mjs` so `.next/static` (and `public` if present) are copied into `.next/standalone/` — required or `/_next/static/*` returns 404.

## Recent: Milestone items (sub-goals)
- Table `milestone_items` (event_id, name, target_amount); `contributions.milestone_id` and `momo_pending_payments.milestone_id` optional FKs.
- App event page (owner): third tab **Milestones** — add/delete milestones with progress (`MilestoneItemsTab.tsx`).
- **ContributeForm**: horizontal `MilestoneCardsRow` for public/private contribute flow.
- **All contributions** page: `MilestoneCardsRow` removed; **Filter by milestone** `<select>` on the list card; **Add contribution** modal has **Tag to milestone** `<select>`. List filters client-side (`all` / `general` / milestone id).
- Server: `addMilestoneItem`, `deleteMilestoneItem`; `addContribution` + MoMo flow accept `milestoneId`.

## Recent: Subscription Fee = UGX 10,000 via MoMo
- Event activation subscription changed from UGX 50,000 (manual checkbox) to **UGX 10,000 paid via MTN MoMo** (RequestToPay).
- Server actions `initiateSubscriptionPayment` / `pollSubscriptionPayment` added in `src/app/actions/momo.ts` — lightweight versions that don't use `momo_pending_payments` (no DB row needed; just poll the reference ID).
- `src/app/app/create/page.tsx` passes `momoConfigured` (from `isPaymentProcessorConfigured()`) into `CreateEventForm`.
- Step 3 of `CreateEventForm` now shows a phone input + "Pay with MTN MoMo" button when MoMo is configured, with spinner while polling. Falls back to a manual "I have paid" checkbox when MoMo env vars are not set.
- The "Activate my event" submit button is disabled until subscription payment succeeds (or manual checkbox is ticked in fallback mode).

## Recent: Create event — default event date
- **`CreateEventForm`** ([`apps/web/src/app/app/create/CreateEventForm.tsx`](apps/web/src/app/app/create/CreateEventForm.tsx)): “Event date” pre-fills to **local calendar today + 30 days** as `YYYY-MM-DD` for `<input type="date">` (avoids UTC `toISOString()` day drift).

## Recent: Event slug collision (API)
- **`EventsService.addEvent`** ([`apps/api/src/events/events.service.ts`](apps/api/src/events/events.service.ts)): On MySQL **duplicate slug** (`ER_DUP_ENTRY` / errno **1062**), retries with suffixes `-<n>` (up to 8 attempts). Duplicate detection walks **`error.cause`** because Drizzle wraps the driver error (top-level message is “Failed query…”, not “Duplicate entry…”).

## Recent: Invitation cards / event UI across multiple events (web)
- **Cause**: Client trees (`InviteCardGenerator`, `EventDetailContent`, contributions tab) could be **reused across navigations** while state stayed tied to the previous event; server `fetch` could also be cached unless opted out.
- **Fix**: [`server-api.ts`](apps/web/src/lib/server-api.ts) uses **`cache: "no-store"`** for Nest calls. **`key={event.id}`** on `EventDetailContent`, `InviteCardGenerator`, `ContributionsPageContent`, and keyed children (`RecentContributionsCard`, `ContributionReceipt`, `ContributeForm`, `MilestoneItemsTab`) so switching events remounts clients. Contributor rows use **`key={\`${event.id}-${contributor.id}\`}`**. Invite page adds the same **owner check** as the event detail page ([`invite/page.tsx`](apps/web/src/app/app/events/[slug]/invite/page.tsx)).

## Recent: Receipt/Invitation Print Includes Business Info
- `src/components/ContributionReceipt.tsx` appends a business identity block (`Business: CeremonyWallet`, `Address: <event location>`, `Contact: <event treasurerPhone>` when available) to receipt text.
- `src/app/app/events/[slug]/invite/InviteCardGenerator.tsx` similarly labels the event venue as `Address:` and adds `Business: CeremonyWallet` plus `Contact: <event treasurerPhone>` so printed/exported PDF content includes the available business/contact details.
