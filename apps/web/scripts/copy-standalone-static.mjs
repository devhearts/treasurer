/**
 * Next.js `output: "standalone"` in a monorepo places the server under
 * `.next/standalone/apps/web/server.js`. Static assets still need copying into
 * that bundle's `.next/static`.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const standaloneApp = join(root, ".next/standalone/apps/web");
const serverJs = join(standaloneApp, "server.js");
const standaloneNext = join(standaloneApp, ".next");
const staticSrc = join(root, ".next/static");
const staticDest = join(standaloneNext, "static");
const publicSrc = join(root, "public");
const publicDest = join(standaloneApp, "public");

if (!existsSync(serverJs)) {
  console.error(
    "copy-standalone-static: standalone server.js missing — run `next build` first."
  );
  process.exit(1);
}
if (!existsSync(staticSrc)) {
  console.error("copy-standalone-static: .next/static missing — run `next build` first.");
  process.exit(1);
}

mkdirSync(standaloneNext, { recursive: true });
rmSync(staticDest, { recursive: true, force: true });
cpSync(staticSrc, staticDest, { recursive: true });

if (existsSync(publicSrc)) {
  rmSync(publicDest, { recursive: true, force: true });
  cpSync(publicSrc, publicDest, { recursive: true });
}

console.log("copy-standalone-static: synced .next/static → standalone (and public if present).");
