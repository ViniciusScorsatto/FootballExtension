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

test("cache service treats invalid redis json as a cache miss", async () => {
  const deletedKeys = [];
  const cacheService = new CacheService({
    redisUrl: ""
  });

  cacheService.redisEnabled = true;
  cacheService.client = {
    async get(key) {
      assert.equal(key, "broken:key");
      return "not-json";
    },
    async del(key) {
      deletedKeys.push(key);
    }
  };

  const value = await cacheService.getJson("broken:key");

  assert.equal(value, null);
  assert.deepEqual(deletedKeys, ["broken:key"]);
});

test("cache service falls back to memory when redis set fails", async () => {
  const cacheService = new CacheService({
    redisUrl: ""
  });

  cacheService.redisEnabled = true;
  cacheService.client = {
    async set() {
      throw new Error("redis write failed");
    }
  };

  await cacheService.setJson("billing:user:tester", { plan: "pro" }, 60);
  const value = await cacheService.getJson("billing:user:tester");

  assert.equal(cacheService.redisEnabled, false);
  assert.deepEqual(value, { plan: "pro" });
});

test("cache service falls back to memory when redis counter operations fail", async () => {
  const cacheService = new CacheService({
    redisUrl: ""
  });

  cacheService.redisEnabled = true;
  cacheService.client = {
    async incrBy() {
      throw new Error("redis counter failed");
    }
  };

  const counter = await cacheService.incrementCounter("ratelimit:test", 60, 1);

  assert.equal(cacheService.redisEnabled, false);
  assert.equal(counter.count, 1);
});
