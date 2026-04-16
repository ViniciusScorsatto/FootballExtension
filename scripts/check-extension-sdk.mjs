import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const sourcePath = path.join(rootDir, "packages/sdk-football/src/browser.js");
const bundledPath = path.join(rootDir, "apps/extension/sdk-football.js");

const [sourceContent, bundledContent] = await Promise.all([
  readFile(sourcePath, "utf8"),
  readFile(bundledPath, "utf8")
]);

if (sourceContent !== bundledContent) {
  console.error("Extension SDK bundle is out of sync.");
  console.error("Run: npm run sync:extension-sdk");
  process.exit(1);
}

console.log("Extension SDK bundle is in sync.");
