import assert from "node:assert/strict";
import test from "node:test";
import { MatchImpactService } from "../backend/src/services/matchImpactService.js";
import { CacheService } from "../backend/src/services/cacheService.js";

function createService(overrides = {}) {
  const cacheService = new CacheService({
    redisUrl: ""
  });

  const apiFootballClient = {
    getStandings: async () => null,
    getStatistics: async () => [],
    getInjuries: async () => [],
    getLineups: async () => [],
    getEvents: async () => [],
    ...overrides.apiFootballClient
  };

  return {
    service: new MatchImpactService({
      apiFootballClient,
      cacheService,
      analyticsService: {
        trackFixtureUsage: async () => {},
        trackSession: async () => {},
        getSummary: async () => ({})
      },
      env: {
        liveCacheTtlSeconds: 15,
        upcomingCacheTtlSeconds: 120,
        finishedCacheTtlSeconds: 3600,
        standingsCacheTtlSeconds: 3600,
        statisticsCacheTtlSeconds: 60,
        injuriesCacheTtlSeconds: 14400,
      eventsCacheTtlSeconds: 60,
      lineupsPendingCacheTtlSeconds: 300,
      lineupsConfirmedCacheTtlSeconds: 21600,
      prematchSlowWindowMinutes: 360,
      prematchMediumWindowMinutes: 90,
      prematchFastWindowMinutes: 40,
      prematchSlowCacheTtlSeconds: 3600,
      prematchMediumCacheTtlSeconds: 900,
      prematchFastCacheTtlSeconds: 180,
      stateCacheTtlSeconds: 21600,
      ...overrides.env
    }
    }),
    cacheService,
    apiFootballClient
  };
}

test("standings are cached per league and season", async () => {
  let calls = 0;
  const { service } = createService({
    apiFootballClient: {
      getStandings: async () => {
        calls += 1;
        return {
          response: [{ league: { standings: [[]] } }]
        };
      }
    }
  });

  const fixture = {
    league: {
      id: 39,
      season: 2025,
      standings: true
    }
  };

  await service.getStandingsResource(fixture);
  await service.getStandingsResource(fixture);

  assert.equal(calls, 1);
});

test("confirmed lineups are reused from cache", async () => {
  let calls = 0;
  const { service } = createService({
    apiFootballClient: {
      getLineups: async () => {
        calls += 1;
        return [
          {
            startXI: [{ player: { name: "Starter" } }]
          }
        ];
      }
    }
  });

  const status = {
    phase: "upcoming"
  };

  await service.getLineupsResource(123, status);
  await service.getLineupsResource(123, status);

  assert.equal(calls, 1);
});

test("events are refreshed immediately after a score change", async () => {
  let calls = 0;
  const { service } = createService({
    apiFootballClient: {
      getEvents: async () => {
        calls += 1;
        return [{ type: "Goal" }];
      }
    }
  });

  const status = {
    phase: "live"
  };

  await service.getEventsResource({
    fixtureId: 321,
    status,
    scoreEvent: {
      type: "NONE"
    }
  });
  await service.getEventsResource({
    fixtureId: 321,
    status,
    scoreEvent: {
      type: "GOAL"
    }
  });

  assert.equal(calls, 2);
});

test("upcoming fixtures use slower lineup cadence far from kickoff", async () => {
  let calls = 0;
  const { service, cacheService } = createService({
    apiFootballClient: {
      getLineups: async () => {
        calls += 1;
        return [];
      }
    }
  });

  const fixtureId = 555;
  const status = {
    phase: "upcoming"
  };
  const prematchCadence = {
    lineupsTtlSeconds: 3600,
    injuriesTtlSeconds: 3600
  };

  await service.getLineupsResource(fixtureId, status, prematchCadence);
  const cachedPayload = await cacheService.getJson(`lineups:${fixtureId}`);

  assert.equal(calls, 1);
  assert.equal(cachedPayload.confirmed, false);
  assert.ok(cachedPayload.data);
});

test("upcoming fixtures tighten lineup cadence near kickoff", async () => {
  let calls = 0;
  const { service } = createService({
    apiFootballClient: {
      getLineups: async () => {
        calls += 1;
        return [];
      }
    }
  });

  const status = {
    phase: "upcoming"
  };

  await service.getLineupsResource(777, status, {
    lineupsTtlSeconds: 180,
    injuriesTtlSeconds: 180
  });

  assert.equal(calls, 1);
});
