import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

async function readJson(relativePath) {
  const raw = await readFile(path.join(rootDir, relativePath), "utf8");
  return JSON.parse(raw);
}

test("scenario catalog variants point to valid JSON payloads", async () => {
  const catalog = await readJson("extension/scenarios/index.json");

  for (const family of catalog.families || []) {
    assert.ok(family.id);
    assert.ok(family.fixtureId);
    assert.ok(Array.isArray(family.variants) && family.variants.length > 0);

    for (const variant of family.variants) {
      assert.ok(variant.id);
      assert.ok(variant.path);

      const payload = await readJson(path.join("extension", variant.path));
      assert.equal(payload.fixture_id, family.fixtureId);
      assert.ok(payload.teams?.home?.name);
      assert.ok(payload.teams?.away?.name);
      assert.ok(payload.status?.phase);
    }
  }
});

test("prematch scenarios with available lineups include full starting elevens", async () => {
  const payload = await readJson("extension/scenarios/cruzeiro-vitoria-quarter-finals/prematch.json");
  const lineups = payload.prematch?.lineups;

  assert.equal(lineups?.available, true);
  assert.equal(Array.isArray(lineups.home?.startXI), true);
  assert.equal(Array.isArray(lineups.away?.startXI), true);
  assert.ok(lineups.home.startXI.length >= 11);
  assert.ok(lineups.away.startXI.length >= 11);
});
