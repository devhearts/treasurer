#!/usr/bin/env node
/**
 * Ensures docker-compose default host ports and garage.toml bind ports
 * stay aligned with docker/ports.base.json (single source of truth).
 * Run: node docker/verify-ports.mjs  (or npm run docker:verify-ports)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const composeVarToBaseKey = {
  MYSQL: "mysql",
  MAILPIT_UI: "mailpitUi",
  MAILPIT_SMTP: "mailpitSmtp",
  GARAGE_S3: "garageS3",
  GARAGE_ADMIN: "garageAdmin",
  API: "api",
  WEB: "web",
};

const basePath = path.join(__dirname, "ports.base.json");
const { base } = JSON.parse(fs.readFileSync(basePath, "utf8"));

const composePath = path.join(root, "docker-compose.yml");
const compose = fs.readFileSync(composePath, "utf8");

const re = /\$\{HOST_PORT_([A-Z0-9_]+):-(\d+)\}/g;
let m;
const seen = new Set();
let errors = 0;

while ((m = re.exec(compose)) !== null) {
  const varSuffix = m[1];
  const defaultPort = parseInt(m[2], 10);
  const key = composeVarToBaseKey[varSuffix];
  if (!key) {
    console.error(`Unknown compose variable HOST_PORT_${varSuffix} — add mapping in verify-ports.mjs`);
    errors += 1;
    continue;
  }
  const expected = base[key];
  if (expected !== defaultPort) {
    console.error(
      `Mismatch HOST_PORT_${varSuffix} default ${defaultPort} vs ports.base.json ${key}=${expected}`
    );
    errors += 1;
  }
  seen.add(key);
}

for (const key of Object.keys(base)) {
  if (!seen.has(key)) {
    console.error(`ports.base.json key "${key}" has no matching HOST_PORT_* entry in docker-compose.yml`);
    errors += 1;
  }
}

const garagePath = path.join(__dirname, "garage.toml");
const garage = fs.readFileSync(garagePath, "utf8");

function expectTomlPort(label, pattern, expected) {
  const match = garage.match(pattern);
  if (!match) {
    console.error(`garage.toml: pattern not found for ${label}: ${pattern}`);
    errors += 1;
    return;
  }
  const n = parseInt(match[1], 10);
  if (n !== expected) {
    console.error(`garage.toml: ${label} expected port ${expected}, got ${n}`);
    errors += 1;
  }
}

// [s3_api] api_bind_addr
expectTomlPort(
  "S3 API",
  /\[s3_api\][\s\S]*?api_bind_addr\s*=\s*"\[::\]:(\d+)"/,
  base.garageS3
);
// [admin] api_bind_addr (admin API)
expectTomlPort(
  "Admin API",
  /\[admin\][\s\S]*?api_bind_addr\s*=\s*"\[::\]:(\d+)"/,
  base.garageAdmin
);

// Internal-only (not published in docker-compose): still document expected relation to S3 port
const rpc = garage.match(/rpc_bind_addr\s*=\s*"\[::\]:(\d+)"/);
const s3web = garage.match(/\[s3_web\][\s\S]*?bind_addr\s*=\s*"\[::\]:(\d+)"/);
if (!rpc || !s3web) {
  console.error("garage.toml: could not parse rpc_bind_addr or [s3_web] bind_addr");
  errors += 1;
} else {
  const rpcPort = parseInt(rpc[1], 10);
  const webPort = parseInt(s3web[1], 10);
  if (rpcPort !== base.garageS3 + 1) {
    console.warn(
      `Note: garage rpc_bind_addr port ${rpcPort} is not base+1 (${base.garageS3 + 1}); OK if intentional.`
    );
  }
  if (webPort !== base.garageS3 + 2) {
    console.warn(
      `Note: garage [s3_web] bind_addr port ${webPort} is not base+2 (${base.garageS3 + 2}); OK if intentional.`
    );
  }
}

// Dockerfiles: EXPOSE must match container-side compose target
const apiDf = fs.readFileSync(path.join(root, "apps/api/Dockerfile"), "utf8");
const webDf = fs.readFileSync(path.join(root, "apps/web/Dockerfile"), "utf8");
const apiExpose = apiDf.match(/EXPOSE\s+(\d+)/);
const webExpose = webDf.match(/EXPOSE\s+(\d+)/);
const webEnvPort = webDf.match(/ENV\s+PORT=(\d+)/);
if (!apiExpose || parseInt(apiExpose[1], 10) !== base.api) {
  console.error(`apps/api/Dockerfile EXPOSE must be ${base.api} (container listen port)`);
  errors += 1;
}
if (!webExpose || parseInt(webExpose[1], 10) !== base.web) {
  console.error(`apps/web/Dockerfile EXPOSE must be ${base.web}`);
  errors += 1;
}
if (!webEnvPort || parseInt(webEnvPort[1], 10) !== base.web) {
  console.error(`apps/web/Dockerfile ENV PORT must be ${base.web}`);
  errors += 1;
}

if (errors > 0) {
  console.error(`\nverify-ports: ${errors} error(s)`);
  process.exit(1);
}
console.log("verify-ports: docker-compose defaults, garage.toml S3/admin, and Dockerfiles match ports.base.json");
