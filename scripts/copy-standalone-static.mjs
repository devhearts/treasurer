/**
 * Next.js `output: "standalone"` does not copy `.next/static` into the standalone
 * folder. Without this, `node .next/standalone/server.js` returns 404 for all
 * `/_next/static/*` assets (JS, CSS, fonts).
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/output
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const standaloneNext = join(root, ".next/standalone/.next");
const staticSrc = join(root, ".next/static");
const staticDest = join(standaloneNext, "static");
const publicSrc = join(root, "public");
const publicDest = join(root, ".next/standalone/public");

if (!existsSync(join(root, ".next/standalone/server.js"))) {
  console.error(
    "copy-standalone-static: .next/standalone/server.js missing — run `next build` first."
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
