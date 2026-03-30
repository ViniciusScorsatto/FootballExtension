import assert from "node:assert/strict";
import test from "node:test";
import { createMatchImpactController } from "../backend/src/controllers/matchImpactController.js";

function createResponseMock() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

function createController(envOverrides = {}) {
  return createMatchImpactController({
    matchImpactService: {},
    matchDiscoveryService: {},
    cacheService: {
      getStatus() {
        return {
          mode: "memory",
          redisConfigured: false,
          redisEnabled: false
        };
      }
    },
    apiFootballClient: {
      getStatus() {
        return {
          configured: true,
          baseUrl: "https://v3.football.api-sports.io",
          lastRequestStatus: null
        };
      }
    },
    env: {
      adminToken: "",
      nodeEnv: "test",
      trustProxy: 1,
      requestTimeoutMs: 5000,
      liveCacheTtlSeconds: 15,
      upcomingCacheTtlSeconds: 120,
      finishedCacheTtlSeconds: 3600,
      standingsCacheTtlSeconds: 3600,
      statisticsCacheTtlSeconds: 60,
      injuriesCacheTtlSeconds: 14400,
      eventsCacheTtlSeconds: 60,
      rateLimitEnabled: true,
      rateLimitWindowSeconds: 60,
      freeReadLimitPerWindow: 120,
      proReadLimitPerWindow: 600,
      freeAnalyticsLimitPerWindow: 60,
      proAnalyticsLimitPerWindow: 300,
      adminLimitPerWindow: 30,
      supportedLeagueIds: [39],
      featuredLeagueIds: [39],
      ...envOverrides
    }
  });
}

test("admin health is available without a token when no admin token is configured", () => {
  const controller = createController();
  const res = createResponseMock();

  controller.getAdminHealth(
    {
      header() {
        return "";
      }
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.admin.protected, false);
  assert.deepEqual(res.body.leagues.supportedLeagueIds, [39]);
});

test("admin health rejects unauthorized requests when admin token is configured", () => {
  const controller = createController({
    adminToken: "secret-token"
  });
  const res = createResponseMock();

  controller.getAdminHealth(
    {
      header() {
        return "";
      }
    },
    res
  );

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, "Unauthorized.");
});
