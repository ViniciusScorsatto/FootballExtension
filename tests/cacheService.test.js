import assert from "node:assert/strict";
import test from "node:test";
import { CacheService } from "../apps/api/src/services/cacheService.js";

test("cache service tracks hits, misses, writes, and namespace breakdown", async () => {
  const cacheService = new CacheService({
    redisUrl: ""
  });

  await cacheService.setJson("match:123", { ok: true }, 60);
  await cacheService.getJson("match:123");
  await cacheService.getJson("match:missing");
  await cacheService.setJson("standings:39:2025", { ok: true }, 60);
  await cacheService.getJson("standings:39:2025");

  const status = cacheService.getStatus();

  assert.equal(status.metrics.totalWrites, 2);
  assert.equal(status.metrics.totalHits, 2);
  assert.equal(status.metrics.totalMisses, 1);
  assert.equal(status.metrics.totalReads, 3);
  assert.equal(status.metrics.hitRate, 0.667);
  assert.deepEqual(status.metrics.namespaces.match, {
    hits: 1,
    misses: 1,
    writes: 1
  });
  assert.deepEqual(status.metrics.namespaces.standings, {
    hits: 1,
    misses: 0,
    writes: 1
  });
});
