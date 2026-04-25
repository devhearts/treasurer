# Project context

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

## Recent: Receipt/Invitation Print Includes Business Info
- `src/components/ContributionReceipt.tsx` appends a business identity block (`Business: CeremonyWallet`, `Address: <event location>`, `Contact: <event treasurerPhone>` when available) to receipt text.
- `src/app/app/events/[slug]/invite/InviteCardGenerator.tsx` similarly labels the event venue as `Address:` and adds `Business: CeremonyWallet` plus `Contact: <event treasurerPhone>` so printed/exported PDF content includes the available business/contact details.
