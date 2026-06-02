import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const pkgPath = require.resolve("pdfjs-dist/package.json");
const pdfjsDir = dirname(pkgPath);
const workerSrc = resolve(pdfjsDir, "build", "pdf.worker.min.mjs");

const publicDir = resolve(__dirname, "..", "public");
const workerDest = resolve(publicDir, "pdf.worker.min.mjs");

if (!existsSync(workerSrc)) {
  console.error("❌ Worker not found at:", workerSrc);
  process.exit(1);
}

if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

copyFileSync(workerSrc, workerDest);
console.log("✓ pdf.worker synced to public/");
