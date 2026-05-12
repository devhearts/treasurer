/**
 * One-off: provision MTN MoMo API User + API Key for Collections (OAuth / RequestToPay).
 *
 * Prerequisites: Collections subscription key from the developer portal.
 *
 * @see https://momodeveloper.mtn.com/api-documentation/api-description
 *
 * Usage:
 *   npx tsx scripts/provision-momo-api-user.ts
 *
 * Reads `.env` from the project root if present (does not override existing env vars).
 * Required: MOMO_SUBSCRIPTION_KEY or PRIMARY_KEY
 * Optional: MOMO_BASE_URL (default sandbox), MOMO_PROVIDER_CALLBACK_HOST (host for providerCallbackHost)
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

function loadDotEnv() {
  const p = join(process.cwd(), ".env");
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv();

const baseUrl =
  process.env.MOMO_BASE_URL?.trim() || "https://sandbox.momodeveloper.mtn.com";
const subscriptionKey =
  process.env.MOMO_SUBSCRIPTION_KEY?.trim() ?? process.env.PRIMARY_KEY?.trim();

/** Sandbox accepts a placeholder; use your real domain when going live. */
const providerCallbackHost =
  process.env.MOMO_PROVIDER_CALLBACK_HOST?.trim() || "https://example.com";

async function main() {
  if (!subscriptionKey) {
    console.error(
      "Missing MOMO_SUBSCRIPTION_KEY or PRIMARY_KEY in environment / .env"
    );
    process.exit(1);
  }

  const referenceId = randomUUID();

  console.log(`Base URL: ${baseUrl}`);
  console.log(`Creating API user with X-Reference-Id: ${referenceId}\n`);

  const createUserRes = await fetch(`${baseUrl}/v1_0/apiuser`, {
    method: "POST",
    headers: {
      "X-Reference-Id": referenceId,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      "Ocp-Apim-Subscription-Key": subscriptionKey,
    },
    body: JSON.stringify({
      providerCallbackHost,
    }),
  });

  if (createUserRes.status !== 201) {
    const body = await createUserRes.text();
    console.error(
      `Create API user failed: HTTP ${createUserRes.status}\n${body}`
    );
    if (createUserRes.status === 409) {
      console.error(
        "\nHint: 409 often means this reference id or user already exists. Run again (new UUID) or use an existing MOMO_API_USER."
      );
    }
    process.exit(1);
  }

  const createKeyRes = await fetch(
    `${baseUrl}/v1_0/apiuser/${referenceId}/apikey`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": subscriptionKey,
      },
    }
  );

  const keyBodyText = await createKeyRes.text();

  if (createKeyRes.status !== 201) {
    console.error(
      `Create API key failed: HTTP ${createKeyRes.status}\n${keyBodyText}`
    );
    process.exit(1);
  }

  let apiKey: string;
  try {
    const parsed = JSON.parse(keyBodyText) as { apiKey?: string };
    if (!parsed.apiKey) {
      console.error("Unexpected response (no apiKey field):\n", keyBodyText);
      process.exit(1);
    }
    apiKey = parsed.apiKey;
  } catch {
    console.error("Unexpected response (not JSON):\n", keyBodyText);
    process.exit(1);
  }

  console.log("Success. Add these to your .env (keep the API key secret):\n");
  console.log(`MOMO_API_USER=${referenceId}`);
  console.log(`MOMO_API_KEY=${apiKey}`);
  console.log(
    "\nYou already have MOMO_SUBSCRIPTION_KEY (or PRIMARY_KEY) set for the Collections product."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
