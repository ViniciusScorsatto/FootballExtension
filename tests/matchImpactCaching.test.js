import assert from "node:assert/strict";
import test from "node:test";
import { MatchImpactService } from "../backend/src/services/matchImpactService.js";
import { CacheService } from "../backend/src/services/cacheService.js";

function createService(overrides = {}) {
  const cacheService = new CacheService({
    redisUrl: ""
  });

  const apiFootballClient = {
    getFixture: async () => null,
    getStandings: async () => null,
    getStatistics: async () => [],
    getInjuries: async () => [],
    getLineups: async () => [],
    getEvents: async () => [],
    getFixturesByRound: async () => [],
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
        leagueContextLiveCacheTtlSeconds: 60,
        leagueContextUpcomingCacheTtlSeconds: 300,
        leagueContextFinishedCacheTtlSeconds: 3600,
        leagueContextMaxFixtures: 9,
        leagueContextSameWindowMinutes: 30,
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

test("league context is cached by league, season, and round", async () => {
  let calls = 0;
  const { service } = createService({
    apiFootballClient: {
      getFixturesByRound: async () => {
        calls += 1;
        return [];
      }
    }
  });

  const fixture = {
    fixture: {
      id: 10,
      timestamp: 1774897200
    },
    league: {
      id: 39,
      season: 2025,
      round: "Regular Season - 30"
    }
  };

  await service.getLeagueContextResource(fixture, { phase: "live" });
  await service.getLeagueContextResource(fixture, { phase: "live" });

  assert.equal(calls, 1);
});

test("league context excludes the tracked fixture and prioritizes same-window matches", async () => {
  const { service } = createService({
    env: {
      leagueContextMaxFixtures: 3,
      leagueContextSameWindowMinutes: 30
    },
    apiFootballClient: {
      getFixturesByRound: async () => [
        {
          fixture: { id: 100, timestamp: 1774897200, date: "2026-03-30T19:00:00+00:00" },
          league: { round: "Regular Season - 7" },
          teams: {
            home: { id: 1, name: "Tracked Home", logo: "" },
            away: { id: 2, name: "Tracked Away", logo: "" }
          },
          goals: { home: 1, away: 0 }
        },
        {
          fixture: { id: 101, timestamp: 1774897200, date: "2026-03-30T19:00:00+00:00" },
          teams: {
            home: { id: 3, name: "Same Time A", logo: "" },
            away: { id: 4, name: "Same Time B", logo: "" }
          },
          goals: { home: 0, away: 0 }
        },
        {
          fixture: { id: 102, timestamp: 1774897500, date: "2026-03-30T19:05:00+00:00" },
          teams: {
            home: { id: 5, name: "Same Time C", logo: "" },
            away: { id: 6, name: "Same Time D", logo: "" }
          },
          goals: { home: 1, away: 1 }
        },
        {
          fixture: { id: 103, timestamp: 1774898100, date: "2026-03-30T19:15:00+00:00" },
          teams: {
            home: { id: 7, name: "Same Time E", logo: "" },
            away: { id: 8, name: "Same Time F", logo: "" }
          },
          goals: { home: 2, away: 1 }
        },
        {
          fixture: { id: 104, timestamp: 1774904400, date: "2026-03-30T21:00:00+00:00" },
          teams: {
            home: { id: 9, name: "Later A", logo: "" },
            away: { id: 10, name: "Later B", logo: "" }
          },
          goals: { home: 0, away: 2 }
        }
      ]
    }
  });

  const summary = await service.getLeagueContextResource(
    {
      fixture: {
        id: 100,
        timestamp: 1774897200
      },
      league: {
        id: 39,
        season: 2025,
        round: "Regular Season - 7"
      }
    },
    { phase: "live" }
  );

  assert.equal(summary.available, true);
  assert.equal(summary.selectionMode, "same-window");
  assert.equal(summary.totalFixtures, 4);
  assert.equal(summary.displayedFixtures, 3);
  assert.equal(summary.fixtures.some((fixture) => fixture.fixtureId === 100), false);
  assert.deepEqual(
    summary.fixtures.map((fixture) => fixture.fixtureId),
    [101, 102, 103]
  );
});

test("upcoming standings-enabled fixtures do not return table impact before kickoff", async () => {
  const fixtureId = 9001;
  const { service } = createService({
    apiFootballClient: {
      getFixture: async () => ({
        fixture: {
          id: fixtureId,
          timestamp: Math.floor(Date.now() / 1000) + 3600,
          date: "2026-04-01T08:00:00+00:00",
          status: {
            short: "NS",
            long: "Not Started",
            elapsed: null
          }
        },
        league: {
          id: 71,
          name: "Serie A",
          country: "Brazil",
          season: 2026,
          standings: true,
          round: "Regular Season - 4"
        },
        teams: {
          home: { id: 1, name: "Atletico Goianiense", logo: "" },
          away: { id: 2, name: "Nautico Recife", logo: "" }
        },
        goals: {
          home: 0,
          away: 0
        }
      }),
      getStandings: async () => ({
        response: [
          {
            league: {
              standings: [
                [
                  {
                    rank: 15,
                    points: 4,
                    goalsDiff: -2,
                    all: { played: 3, goals: { for: 3, against: 5 } },
                    team: { id: 1, name: "Atletico Goianiense", code: "ACG" }
                  },
                  {
                    rank: 16,
                    points: 4,
                    goalsDiff: -3,
                    all: { played: 3, goals: { for: 2, against: 5 } },
                    team: { id: 2, name: "Nautico Recife", code: "NAU" }
                  }
                ]
              ]
            }
          }
        ]
      }),
      getFixturesByRound: async () => [
        {
          fixture: {
            id: fixtureId,
            timestamp: Math.floor(Date.now() / 1000) + 3600,
            date: "2026-04-01T08:00:00+00:00",
            status: {
              short: "NS",
              long: "Not Started",
              elapsed: null
            }
          },
          teams: {
            home: { id: 1, name: "Atletico Goianiense", logo: "" },
            away: { id: 2, name: "Nautico Recife", logo: "" }
          },
          goals: { home: 0, away: 0 }
        }
      ]
    }
  });

  const payload = await service.refreshMatchImpact(fixtureId);

  assert.equal(payload.status.phase, "upcoming");
  assert.equal(payload.metadata.tableImpactAvailable, false);
  assert.equal(payload.metadata.impactMode, "score-only");
  assert.equal(payload.impact.mode, "score-only");
  assert.equal(payload.impact.table, null);
  assert.equal(payload.metadata.impactBasis, "prematch-no-table-impact");
  assert.deepEqual(payload.standings_snapshot, {
    before: [],
    after: []
  });
});
