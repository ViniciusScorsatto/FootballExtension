import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

async function readProjectFile(relativePath) {
  return readFile(path.join(rootDir, relativePath), "utf8");
}

test("collapsed overlay card includes home and away badge slots", async () => {
  const contentScript = await readProjectFile("extension/content.js");

  assert.match(
    contentScript,
    /lmi-collapsed-card__badge lmi-collapsed-card__badge--home is-hidden/
  );
  assert.match(
    contentScript,
    /lmi-collapsed-card__badge lmi-collapsed-card__badge--away is-hidden/
  );
  assert.match(contentScript, /collapsedHomeBadge:\s*root\.querySelector\("\.lmi-collapsed-card__badge--home"\)/);
  assert.match(contentScript, /collapsedAwayBadge:\s*root\.querySelector\("\.lmi-collapsed-card__badge--away"\)/);
});

test("collapsed overlay render populates badge logos from the tracked teams", async () => {
  const contentScript = await readProjectFile("extension/content.js");

  assert.match(
    contentScript,
    /setBadge\(elements\.collapsedHomeBadge,\s*payload\.teams\.home\.logo,\s*payload\.teams\.home\.name\);/
  );
  assert.match(
    contentScript,
    /setBadge\(elements\.collapsedAwayBadge,\s*payload\.teams\.away\.logo,\s*payload\.teams\.away\.name\);/
  );
});

test("collapsed overlay badge styling keeps the compact layout intact", async () => {
  const stylesheet = await readProjectFile("extension/styles.css");

  assert.match(
    stylesheet,
    /\.lmi-collapsed-card__score\s*\{[\s\S]*display:\s*flex;[\s\S]*align-items:\s*center;[\s\S]*gap:\s*8px;[\s\S]*\}/
  );
  assert.match(
    stylesheet,
    /\.lmi-collapsed-card__badge\s*\{[\s\S]*width:\s*16px;[\s\S]*height:\s*16px;[\s\S]*object-fit:\s*contain;[\s\S]*\}/
  );
});
