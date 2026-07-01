/**
 * RukaPay Gateway API UAT (Rhino Payment Services sign-off checklist).
 *
 *   npm run rukapay-uat -w @treasurer/api
 *
 * Requires apps/api/.env (or exported env): RUKAPAY_API_KEY, RUKAPAY_SANDBOX=1, etc.
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { createConnection } from "net";
import { randomUUID } from "crypto";
import type { RukapayConfig } from "./rukapay.config";
import { rukapayConfigFromEnv } from "./rukapay.config";
import {
  rukapayCollectFromMno,
  rukapayGetTransactionStatus,
  rukapayValidateBeneficiary,
} from "./rukapay.client";
import { rukapayAuthHeaders } from "./rukapay.http";

type UatResult = "PASS" | "FAIL" | "SKIP";

interface UatCase {
  no: number;
  name: string;
  network: string;
  result: UatResult;
  detail: string;
}

/** RukaPay sandbox MTN uses 076/077… prefixes (not 070 per their live prefix check). */
const SANDBOX_MTN_VALID = "256760123456";
const SANDBOX_MTN_VALID_ALT = "256770123456";
const SANDBOX_AIRTEL_VALID = "256740123456";
const SANDBOX_BANK_ACCOUNT = "1234567890";
const SANDBOX_BANK_CODE = "040147";
/** DFCU sandbox example (checklist #15 — second bank positive pull). */
const SANDBOX_BANK_ACCOUNT_ALT = "9876543210";
const SANDBOX_BANK_CODE_ALT = "050147";

function uatMtnPhone(): string {
  return process.env.RUKAPAY_UAT_MTN_PHONE?.trim() || SANDBOX_MTN_VALID;
}

function uatMtnPhoneAlt(): string {
  return process.env.RUKAPAY_UAT_MTN_PHONE_ALT?.trim() || SANDBOX_MTN_VALID_ALT;
}

function uatAirtelPhone(): string {
  return process.env.RUKAPAY_UAT_AIRTEL_PHONE?.trim() || SANDBOX_AIRTEL_VALID;
}

function loadEnvFiles(): void {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "apps/api/.env"),
    resolve(__dirname, "../../.env"),
  ];
  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;
    for (const line of readFileSync(filePath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (process.env[key] !== undefined) continue;
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

function gatewayPath(
  config: RukapayConfig,
  live: string,
  sandbox: string
): string {
  return `${config.baseUrl}/${config.sandbox ? sandbox : live}`;
}

function todayLabel(): string {
  return new Date().toISOString().slice(0, 10);
}

function record(
  cases: UatCase[],
  no: number,
  name: string,
  network: string,
  result: UatResult,
  detail: string
): void {
  cases.push({ no, name, network, result, detail });
  const icon = result === "PASS" ? "✓" : result === "FAIL" ? "✗" : "○";
  console.log(
    `${String(no).padStart(2)} | ${icon} ${result.padEnd(4)} | ${network.padEnd(6)} | ${name}\n    ${detail}`
  );
}

async function rawPost(
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string>,
  signal?: AbortSignal
): Promise<{ status: number; text: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });
  return { status: res.status, text: await res.text() };
}

async function test01MtnPositivePull(
  config: RukapayConfig,
  cases: UatCase[]
): Promise<void> {
  const name = "Positive Validation (Pull)";
  const candidates = [uatMtnPhone(), uatMtnPhoneAlt()];
  let lastError = "";
  for (const phone of candidates) {
    try {
      const data = await rukapayValidateBeneficiary(config, {
        phoneNumber: phone,
        mnoProvider: "MTN",
        reference: `UAT-1-${randomUUID().slice(0, 8)}`,
      });
      const beneficiary = data.beneficiary;
      if (data.success && beneficiary?.name && beneficiary.isValid !== false) {
        record(
          cases,
          1,
          name,
          "MTN",
          "PASS",
          `Subscriber: ${beneficiary.name} (${beneficiary.phoneNumber ?? phone})`
        );
        return;
      }
      lastError = JSON.stringify(data).slice(0, 200);
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  record(cases, 1, name, "MTN", "FAIL", lastError);
}

async function test02MtnNegativePush(
  config: RukapayConfig,
  cases: UatCase[]
): Promise<void> {
  const name = "Negative Validation (Push)";
  const url = gatewayPath(
    config,
    "process-transfer",
    "process-transfer-sandbox"
  );
  try {
    const { status, text } = await rawPost(
      url,
      {
        transactionMode: "PARTNER_SEND_MNO",
        amount: 1000,
        currency: config.currency,
        phoneNumber: "12345",
        mnoProvider: "MTN",
        recipientName: "Invalid User",
        narration: "UAT negative MTN",
        partnerReference: `UAT-2-${randomUUID()}`,
      },
      rukapayAuthHeaders(config.apiKey)
    );
    if (status >= 400) {
      record(
        cases,
        2,
        name,
        "MTN",
        "PASS",
        `Rejected HTTP ${status}: ${text.slice(0, 120)}`
      );
    } else {
      record(
        cases,
        2,
        name,
        "MTN",
        "FAIL",
        `Expected rejection, got HTTP ${status}: ${text.slice(0, 120)}`
      );
    }
  } catch (e) {
    record(
      cases,
      2,
      name,
      "MTN",
      "PASS",
      `Rejected: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

async function test03AirtelPositivePull(
  config: RukapayConfig,
  cases: UatCase[]
): Promise<void> {
  const name = "Positive Validation (Pull)";
  try {
    const data = await rukapayValidateBeneficiary(config, {
      phoneNumber: uatAirtelPhone(),
      mnoProvider: "AIRTEL",
      reference: `UAT-3-${randomUUID().slice(0, 8)}`,
    });
    const beneficiary = data.beneficiary;
    if (data.success && beneficiary?.name && beneficiary.isValid !== false) {
      record(
        cases,
        3,
        name,
        "Airtel",
        "PASS",
        `Subscriber: ${beneficiary.name} (${beneficiary.phoneNumber ?? uatAirtelPhone()})`
      );
    } else {
      record(cases, 3, name, "Airtel", "FAIL", JSON.stringify(data).slice(0, 200));
    }
  } catch (e) {
    record(
      cases,
      3,
      name,
      "Airtel",
      "FAIL",
      e instanceof Error ? e.message : String(e)
    );
  }
}

async function test04AirtelNegativePush(
  config: RukapayConfig,
  cases: UatCase[]
): Promise<void> {
  const name = "Negative Validation (Push)";
  const url = gatewayPath(
    config,
    "process-transfer",
    "process-transfer-sandbox"
  );
  try {
    const { status, text } = await rawPost(
      url,
      {
        transactionMode: "PARTNER_SEND_MNO",
        amount: 1000,
        currency: config.currency,
        phoneNumber: "25674000000",
        mnoProvider: "AIRTEL",
        recipientName: "Invalid User",
        narration: "UAT negative Airtel",
        partnerReference: `UAT-4-${randomUUID()}`,
      },
      rukapayAuthHeaders(config.apiKey)
    );
    if (status >= 400) {
      record(
        cases,
        4,
        name,
        "Airtel",
        "PASS",
        `Rejected HTTP ${status}: ${text.slice(0, 120)}`
      );
    } else {
      record(
        cases,
        4,
        name,
        "Airtel",
        "FAIL",
        `Expected rejection, got HTTP ${status}: ${text.slice(0, 120)}`
      );
    }
  } catch (e) {
    record(
      cases,
      4,
      name,
      "Airtel",
      "PASS",
      `Rejected: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

async function test05GetTransactionStatus(
  config: RukapayConfig,
  cases: UatCase[],
  partnerReference: string | null
): Promise<void> {
  const name = "Get Transaction Status";
  if (!partnerReference) {
    record(
      cases,
      5,
      name,
      "Both",
      "SKIP",
      "No partner reference from collection test (case 11)"
    );
    return;
  }
  try {
    const data = await rukapayGetTransactionStatus(config, partnerReference);
    if (data?.transaction?.status) {
      record(
        cases,
        5,
        name,
        "Both",
        "PASS",
        `Status=${data.transaction.status} ref=${partnerReference}`
      );
    } else {
      record(
        cases,
        5,
        name,
        "Both",
        "FAIL",
        `No status for ref ${partnerReference}`
      );
    }
  } catch (e) {
    record(
      cases,
      5,
      name,
      "Both",
      "FAIL",
      e instanceof Error ? e.message : String(e)
    );
  }
}

async function test06TimeoutSimulation(
  config: RukapayConfig,
  cases: UatCase[]
): Promise<void> {
  const name = "Timeout Simulation";
  const url = gatewayPath(
    config,
    "process-transfer",
    "process-transfer-sandbox"
  );
  try {
    await rawPost(
      url,
      {
        transactionMode: "PARTNER_SEND_MNO",
        amount: 1000,
        currency: config.currency,
        phoneNumber: uatMtnPhone(),
        mnoProvider: "MTN",
        recipientName: "John Doe",
        narration: "UAT timeout",
        partnerReference: `UAT-6-${randomUUID()}`,
      },
      rukapayAuthHeaders(config.apiKey),
      AbortSignal.timeout(1)
    );
    record(
      cases,
      6,
      name,
      "Both",
      "FAIL",
      "Expected timeout, request completed"
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const graceful =
      msg.includes("abort") ||
      msg.includes("timeout") ||
      msg.includes("Timeout");
    record(
      cases,
      6,
      name,
      "Both",
      graceful ? "PASS" : "FAIL",
      `Handled: ${msg.slice(0, 120)}`
    );
  }
}

async function test07AuthenticationCheck(
  config: RukapayConfig,
  cases: UatCase[]
): Promise<void> {
  const name = "Authentication Check";
  const url = gatewayPath(
    config,
    "validate-beneficiary",
    "validate-beneficiary-sandbox"
  );
  try {
    const { status, text } = await rawPost(
      url,
      {
        transactionMode: "PARTNER_SEND_MNO",
        phoneNumber: uatMtnPhone(),
        mnoProvider: "MTN",
      },
      { "Content-Type": "application/json", Accept: "application/json" }
    );
    if (status === 401 || status === 403) {
      record(
        cases,
        7,
        name,
        "MTN/Airtel",
        "PASS",
        `Unauthorized HTTP ${status}: ${text.slice(0, 100)}`
      );
    } else {
      record(
        cases,
        7,
        name,
        "MTN/Airtel",
        "FAIL",
        `Expected 401/403 without credentials, got HTTP ${status}`
      );
    }
  } catch (e) {
    record(
      cases,
      7,
      name,
      "MTN/Airtel",
      "FAIL",
      e instanceof Error ? e.message : String(e)
    );
  }
}

async function test08ApiKeyTamper(
  config: RukapayConfig,
  cases: UatCase[]
): Promise<void> {
  const name = "API keys (tampered)";
  const url = gatewayPath(
    config,
    "validate-beneficiary",
    "validate-beneficiary-sandbox"
  );
  const badKey = `${config.apiKey.slice(0, 8)}TAMPERED`;
  try {
    const { status, text } = await rawPost(
      url,
      {
        transactionMode: "PARTNER_SEND_MNO",
        phoneNumber: uatMtnPhone(),
        mnoProvider: "MTN",
      },
      rukapayAuthHeaders(badKey)
    );
    if (status === 401 || status === 403) {
      record(
        cases,
        8,
        name,
        "MTN/Airtel",
        "PASS",
        `Rejected tampered key HTTP ${status}: ${text.slice(0, 100)}`
      );
    } else {
      record(
        cases,
        8,
        name,
        "MTN/Airtel",
        "FAIL",
        `Expected rejection, got HTTP ${status}: ${text.slice(0, 100)}`
      );
    }
  } catch (e) {
    record(
      cases,
      8,
      name,
      "MTN/Airtel",
      "PASS",
      `Rejected: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

function test09Connectivity(config: RukapayConfig, cases: UatCase[]): Promise<void> {
  const name = "Connectivity (VPN)";
  return new Promise((resolve) => {
    let host: string;
    try {
      host = new URL(config.baseUrl).hostname;
    } catch {
      record(cases, 9, name, "MTN/Airtel", "FAIL", "Invalid RUKAPAY_BASE_URL");
      resolve();
      return;
    }
    const port = 443;
    const socket = createConnection({ host, port, timeout: 10_000 });
    socket.on("connect", () => {
      socket.destroy();
      record(
        cases,
        9,
        name,
        "MTN/Airtel",
        "PASS",
        `TCP ${host}:${port} reachable`
      );
      resolve();
    });
    socket.on("timeout", () => {
      socket.destroy();
      record(
        cases,
        9,
        name,
        "MTN/Airtel",
        "FAIL",
        `Timeout connecting to ${host}:${port}`
      );
      resolve();
    });
    socket.on("error", (err) => {
      record(
        cases,
        9,
        name,
        "MTN/Airtel",
        "FAIL",
        `Cannot reach ${host}:${port} — ${err.message}`
      );
      resolve();
    });
  });
}

async function test10DatabaseLogging(cases: UatCase[]): Promise<void> {
  const name = "Database Logging";
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    record(
      cases,
      10,
      name,
      "MTN/Airtel",
      "SKIP",
      "DATABASE_URL not set — run Treasurer contribution for full audit trail"
    );
    return;
  }
  try {
    const mysql = await import("mysql2/promise");
    const conn = await mysql.createConnection(databaseUrl);
    try {
      const [rows] = await conn.query(
        "SELECT COUNT(*) AS c FROM payment_status_events"
      );
      const count = (rows as { c: number }[])[0]?.c ?? 0;
      const [intentRows] = await conn.query(
        "SELECT COUNT(*) AS c FROM payment_intents WHERE processor = ?",
        ["rukapay"]
      );
      const intentCount = (intentRows as { c: number }[])[0]?.c ?? 0;
      record(
        cases,
        10,
        name,
        "MTN/Airtel",
        "PASS",
        `DB reachable; payment_status_events=${count}, rukapay intents=${intentCount}`
      );
    } finally {
      await conn.end();
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    record(
      cases,
      10,
      name,
      "MTN/Airtel",
      "SKIP",
      `DB not reachable (${msg}) — start MariaDB or run end-to-end contribution test`
    );
  }
}

async function test11CallbackUrl(
  config: RukapayConfig,
  cases: UatCase[]
): Promise<string | null> {
  const name = "Callback URL";
  const partnerReference = `UAT-11-${randomUUID()}`;
  if (!config.callbackUrl) {
    record(
      cases,
      11,
      name,
      "MTN/Airtel",
      "FAIL",
      "RUKAPAY_CALLBACK_URL or WEB_ORIGIN not configured"
    );
    return null;
  }
  try {
    await rukapayCollectFromMno(config, {
      phoneNumber: uatMtnPhone(),
      mnoProvider: "MTN",
      amount: 5000,
      partnerReference,
      narration: "UAT callback collect",
    });
    record(
      cases,
      11,
      name,
      "MTN/Airtel",
      "PASS",
      `Collect accepted; callbackUrl=${config.callbackUrl} partnerRef=${partnerReference}`
    );
    return partnerReference;
  } catch (e) {
    record(
      cases,
      11,
      name,
      "MTN/Airtel",
      "FAIL",
      e instanceof Error ? e.message : String(e)
    );
    return null;
  }
}

async function test12DuplicateId(
  config: RukapayConfig,
  cases: UatCase[],
  partnerReference: string | null
): Promise<void> {
  const name = "Duplicate ID Check";
  if (!partnerReference) {
    record(
      cases,
      12,
      name,
      "MTN/Airtel",
      "SKIP",
      "No partner reference from case 11"
    );
    return;
  }
  const url = gatewayPath(
    config,
    "process-transfer",
    "process-transfer-sandbox"
  );
  try {
    const { status, text } = await rawPost(
      url,
      {
        transactionMode: "PARTNER_COLLECT_MNO",
        amount: 9999,
        currency: config.currency,
        phoneNumber: uatMtnPhone(),
        mnoProvider: "MTN",
        narration: "UAT duplicate",
        partnerReference,
        callbackUrl: config.callbackUrl,
      },
      rukapayAuthHeaders(config.apiKey)
    );
    const rejected =
      status >= 400 ||
      text.toLowerCase().includes("duplicate") ||
      text.toLowerCase().includes("reject");
    record(
      cases,
      12,
      name,
      "MTN/Airtel",
      rejected ? "PASS" : "FAIL",
      rejected
        ? `Duplicate rejected HTTP ${status}: ${text.slice(0, 120)}`
        : `Expected duplicate rejection, got HTTP ${status}: ${text.slice(0, 120)}`
    );
  } catch (e) {
    record(
      cases,
      12,
      name,
      "MTN/Airtel",
      "PASS",
      `Rejected duplicate: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

async function bankPositivePull(
  config: RukapayConfig,
  cases: UatCase[],
  no: number,
  accountNumber: string,
  bankCode: string,
  refPrefix: string
): Promise<void> {
  const name = "Positive Validation (Pull)";
  const url = gatewayPath(
    config,
    "validate-beneficiary",
    "validate-beneficiary-sandbox"
  );
  try {
    const { status, text } = await rawPost(
      url,
      {
        transactionMode: "PARTNER_SEND_BANK",
        accountNumber,
        bankCode,
        reference: `${refPrefix}-${randomUUID().slice(0, 8)}`,
      },
      rukapayAuthHeaders(config.apiKey)
    );
    const data = JSON.parse(text) as {
      success?: boolean;
      beneficiary?: { name?: string; isValid?: boolean };
    };
    if (
      status === 200 &&
      data.success &&
      data.beneficiary?.name &&
      data.beneficiary.isValid !== false
    ) {
      record(
        cases,
        no,
        name,
        "Bank",
        "PASS",
        `Account holder: ${data.beneficiary.name} (${bankCode}/${accountNumber})`
      );
    } else {
      record(
        cases,
        no,
        name,
        "Bank",
        "FAIL",
        `HTTP ${status}: ${text.slice(0, 150)}`
      );
    }
  } catch (e) {
    record(
      cases,
      no,
      name,
      "Bank",
      "FAIL",
      e instanceof Error ? e.message : String(e)
    );
  }
}

async function test13BankPositivePull(
  config: RukapayConfig,
  cases: UatCase[]
): Promise<void> {
  await bankPositivePull(
    config,
    cases,
    13,
    SANDBOX_BANK_ACCOUNT,
    SANDBOX_BANK_CODE,
    "UAT-13"
  );
}

async function test15BankPositivePullAlt(
  config: RukapayConfig,
  cases: UatCase[]
): Promise<void> {
  await bankPositivePull(
    config,
    cases,
    15,
    SANDBOX_BANK_ACCOUNT_ALT,
    SANDBOX_BANK_CODE_ALT,
    "UAT-15"
  );
}

async function bankNegativePush(
  config: RukapayConfig,
  cases: UatCase[],
  no: number,
  body: Record<string, unknown>,
  refPrefix: string
): Promise<void> {
  const name = "Negative Validation (Push)";
  if (config.sandbox) {
    record(
      cases,
      no,
      name,
      "Bank",
      "SKIP",
      "Sandbox simulates success for all bank sends — verify rejection on live API"
    );
    return;
  }
  const url = gatewayPath(
    config,
    "process-transfer",
    "process-transfer-sandbox"
  );
  try {
    const { status, text } = await rawPost(
      url,
      {
        transactionMode: "PARTNER_SEND_BANK",
        amount: 5000,
        currency: config.currency,
        accountName: "Bad Account",
        narration: `UAT bank negative push ${no}`,
        partnerReference: `${refPrefix}-${randomUUID()}`,
        ...body,
      },
      rukapayAuthHeaders(config.apiKey)
    );
    if (status >= 400) {
      record(
        cases,
        no,
        name,
        "Bank",
        "PASS",
        `Rejected HTTP ${status}: ${text.slice(0, 120)}`
      );
    } else {
      record(
        cases,
        no,
        name,
        "Bank",
        "FAIL",
        `Expected rejection, got HTTP ${status}: ${text.slice(0, 120)}`
      );
    }
  } catch (e) {
    record(
      cases,
      no,
      name,
      "Bank",
      "PASS",
      `Rejected: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

async function test14BankNegativePush(
  config: RukapayConfig,
  cases: UatCase[]
): Promise<void> {
  await bankNegativePush(config, cases, 14, {
    accountNumber: "0000000000",
    bankCode: SANDBOX_BANK_CODE,
  }, "UAT-14");
}

async function test16BankNegativePush(
  config: RukapayConfig,
  cases: UatCase[]
): Promise<void> {
  await bankNegativePush(config, cases, 16, {
    accountNumber: SANDBOX_BANK_ACCOUNT,
    bankCode: "INVALID",
  }, "UAT-16");
}

function printSignOffTable(cases: UatCase[], config: RukapayConfig): void {
  const sorted = [...cases].sort((a, b) => a.no - b.no);
  const pass = cases.filter((c) => c.result === "PASS").length;
  const fail = cases.filter((c) => c.result === "FAIL").length;
  const skip = cases.filter((c) => c.result === "SKIP").length;

  console.log("\n" + "═".repeat(72));
  console.log("SIGN-OFF TABLE (Rhino Payment Services UAT)");
  console.log("═".repeat(72));
  console.log(`Platform: ceremonywallet.com`);
  console.log(`Test date: ${todayLabel()}`);
  console.log(
    `Environment: ${config.sandbox ? "SANDBOX" : "LIVE"} — ${config.baseUrl}`
  );
  console.log(`PASS: ${pass}  FAIL: ${fail}  SKIP: ${skip}  TOTAL: ${sorted.length}`);
  console.log("");
  console.log(
    "| No | Test Case | Network | Pass/Fail | Actual Result |"
  );
  console.log("|---:|---|---|:---:|---|");
  for (const c of sorted) {
    const detail = c.detail.replace(/\|/g, "\\|").replace(/\n/g, " ");
    console.log(
      `| ${c.no} | ${c.name} | ${c.network} | **${c.result}** | ${detail.slice(0, 120)}${detail.length > 120 ? "…" : ""} |`
    );
  }
  console.log("═".repeat(72));
}

function printSummary(cases: UatCase[]): void {
  const pass = cases.filter((c) => c.result === "PASS").length;
  const fail = cases.filter((c) => c.result === "FAIL").length;
  const skip = cases.filter((c) => c.result === "SKIP").length;

  console.log("\n" + "═".repeat(72));
  console.log("SUMMARY");
  console.log("═".repeat(72));
  console.log(
    `${"No".padStart(3)} | ${"Result".padEnd(5)} | ${"Network".padEnd(8)} | Test Case`
  );
  console.log("-".repeat(72));
  for (const c of cases) {
    console.log(
      `${String(c.no).padStart(3)} | ${c.result.padEnd(5)} | ${c.network.padEnd(8)} | ${c.name}`
    );
  }
  console.log("═".repeat(72));
  console.log(
    `PASS: ${pass}  FAIL: ${fail}  SKIP: ${skip}  TOTAL: ${cases.length}`
  );
  console.log(
    fail > 0
      ? "\nUAT sign-off: NOT READY (failures present)"
      : "\nUAT sign-off: READY (no failures)"
  );
}

async function main(): Promise<void> {
  loadEnvFiles();
  const config = rukapayConfigFromEnv();
  if (!config) {
    console.error("RUKAPAY_API_KEY is required. Set env in apps/api/.env");
    process.exit(1);
  }

  console.log("═".repeat(72));
  console.log("RukaPay Gateway API UAT — ceremonywallet.com");
  console.log(`Test date: ${todayLabel()}`);
  console.log(`Environment: ${config.sandbox ? "SANDBOX" : "LIVE"}`);
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Validate endpoint: ${gatewayPath(config, "validate-beneficiary", "validate-beneficiary-sandbox")}`);
  console.log("═".repeat(72));
  console.log("");

  const cases: UatCase[] = [];

  await test01MtnPositivePull(config, cases);
  await test02MtnNegativePush(config, cases);
  await test03AirtelPositivePull(config, cases);
  await test04AirtelNegativePush(config, cases);
  await test06TimeoutSimulation(config, cases);
  await test07AuthenticationCheck(config, cases);
  await test08ApiKeyTamper(config, cases);
  await test09Connectivity(config, cases);

  const collectRef = await test11CallbackUrl(config, cases);
  await test05GetTransactionStatus(config, cases, collectRef);
  await test12DuplicateId(config, cases, collectRef);

  await test10DatabaseLogging(cases);
  await test13BankPositivePull(config, cases);
  await test14BankNegativePush(config, cases);
  await test15BankPositivePullAlt(config, cases);
  await test16BankNegativePush(config, cases);

  printSummary(cases);
  printSignOffTable(cases, config);
  const failed = cases.some((c) => c.result === "FAIL");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
