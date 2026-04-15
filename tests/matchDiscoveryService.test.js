import assert from "node:assert/strict";
import test from "node:test";
import { MatchDiscoveryService } from "../apps/api/src/services/matchDiscoveryService.js";
import { CacheService } from "../apps/api/src/services/cacheService.js";

function createDiscoveryService(overrides = {}) {
  const cacheService = new CacheService({
    redisUrl: ""
  });

  const apiFootballClient = {
    getLiveFixtures: async () => [],
    getFixturesByDate: async () => [],
    ...overrides.apiFootballClient
  };

  const service = new MatchDiscoveryService({
    apiFootballClient,
    cacheService,
    env: {
      liveCacheTtlSeconds: 15,
      upcomingCacheTtlSeconds: 120,
      supportedLeagueIds: [71],
      featuredLeagueIds: [71],
      ...overrides.env
    }
  });

  return { service };
}

test("default upcoming discovery only includes matches in the next 12 hours", async () => {
  const realDateNow = Date.now;
  Date.now = () => new Date("2026-03-31T08:00:00.000Z").getTime();

  try {
    const { service } = createDiscoveryService({
      apiFootballClient: {
        getFixturesByDate: async (date) => {
          if (date === "2026-03-31") {
            return [
              {
                fixture: {
                  id: 1,
                  date: "2026-03-31T12:00:00+00:00",
                  timestamp: Math.floor(new Date("2026-03-31T12:00:00.000Z").getTime() / 1000),
                  status: { short: "NS", long: "Not Started", elapsed: null }
                },
                league: {
                  id: 71,
                  name: "Serie A",
                  country: "Brazil",
                  season: 2026,
                  round: "Regular Season - 3",
                  standings: true
                },
                teams: {
                  home: { id: 1, name: "Cruzeiro" },
                  away: { id: 2, name: "Vitoria" }
                },
                goals: { home: 0, away: 0 }
              }
            ];
          }

          if (date === "2026-04-01") {
            return [
              {
                fixture: {
                  id: 2,
                  date: "2026-04-01T05:00:00+00:00",
                  timestamp: Math.floor(new Date("2026-04-01T05:00:00.000Z").getTime() / 1000),
                  status: { short: "NS", long: "Not Started", elapsed: null }
                },
                league: {
                  id: 71,
                  name: "Serie A",
                  country: "Brazil",
                  season: 2026,
                  round: "Regular Season - 3",
                  standings: true
                },
                teams: {
                  home: { id: 3, name: "Bahia" },
                  away: { id: 4, name: "Atletico MG" }
                },
                goals: { home: 0, away: 0 }
              }
            ];
          }

          return [];
        }
      }
    });

    const payload = await service.getUpcomingMatches();

    assert.deepEqual(
      payload.matches.map((match) => match.fixtureId),
      [1]
    );
    assert.deepEqual(payload.dates, ["2026-03-31", "2026-04-01"]);
  } finally {
    Date.now = realDateNow;
  }
});
