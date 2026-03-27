# Project context

## Recent: MTN MoMo RequestToPay

- **Collections API** (Request to Pay) integrated for contributions: OAuth token, `POST /collection/v1_0/requesttopay`, status via `GET /collection/v1_0/requesttopay/{referenceId}`.
- **Server-only**: `src/lib/momo/` (config, client, Uganda MSISDN normalization). **Actions**: `src/app/actions/momo.ts`. Pending rows: table `momo_pending_payments`.
- **UI**: When `MOMO_SUBSCRIPTION_KEY` + `MOMO_API_USER` + `MOMO_API_KEY` are set, event pages pass `momoConfigured` and `ContributeForm` shows “Pay with MTN MoMo” plus payer phone; polls until success/fail/timeout.
- **Env**: `MOMO_SUBSCRIPTION_KEY` (or `PRIMARY_KEY`), `MOMO_API_USER`, `MOMO_API_KEY`; optional `MOMO_BASE_URL` (default sandbox), `MOMO_TARGET_ENVIRONMENT` (default `sandbox`), `MOMO_CURRENCY` (default `UGX`). Portal: [MoMo use cases](https://momodeveloper.mtn.com/api-documentation/use-cases).
- **Provision API user + key (one-off)**: `npm run momo:provision` runs `scripts/provision-momo-api-user.ts` ([API description](https://momodeveloper.mtn.com/api-documentation/api-description)); needs Collections subscription key; optional `MOMO_PROVIDER_CALLBACK_HOST`.
