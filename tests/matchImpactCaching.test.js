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
    getPredictions: async () => null,
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
        leagueCoverageCacheTtlSeconds: 3600,
        statisticsCacheTtlSeconds: 60,
        injuriesCacheTtlSeconds: 14400,
        predictionsCacheTtlSeconds: 86400,
        eventsCacheTtlSeconds: 60,
        leagueContextLiveCacheTtlSeconds: 60,
        leagueContextUpcomingCacheTtlSeconds: 3600,
        leagueContextFinishedCacheTtlSeconds: 86400,
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

test("league coverage is cached per league and season", async () => {
  let calls = 0;
  const { service } = createService({
    apiFootballClient: {
      getLeagueCoverage: async () => {
        calls += 1;
        return {
          standings: true,
          injuries: true,
          players: true,
          predictions: true,
          fixtures: {
            events: true,
            lineups: true,
            statisticsFixtures: true,
            statisticsPlayers: false
          }
        };
      }
    }
  });

  const fixture = {
    league: {
      id: 73,
      season: 2026
    }
  };

  await service.getLeagueCoverageResource(fixture);
  await service.getLeagueCoverageResource(fixture);

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

test("coverage flags skip unsupported resource endpoints", async () => {
  let standingsCalls = 0;
  let eventsCalls = 0;
  let statisticsCalls = 0;
  let lineupsCalls = 0;
  let injuriesCalls = 0;
  let predictionsCalls = 0;

  const { service } = createService({
    apiFootballClient: {
      getLeagueCoverage: async () => ({
        standings: false,
        injuries: false,
        players: false,
        predictions: false,
        fixtures: {
          events: false,
          lineups: false,
          statisticsFixtures: false,
          statisticsPlayers: false
        }
      }),
      getStandings: async () => {
        standingsCalls += 1;
        return {};
      },
      getEvents: async () => {
        eventsCalls += 1;
        return [];
      },
      getStatistics: async () => {
        statisticsCalls += 1;
        return [];
      },
      getLineups: async () => {
        lineupsCalls += 1;
        return [];
      },
      getInjuries: async () => {
        injuriesCalls += 1;
        return [];
      },
      getPredictions: async () => {
        predictionsCalls += 1;
        return null;
      }
    }
  });

  const fixture = {
    league: {
      id: 13,
      season: 2026,
      standings: true
    }
  };

  const coverage = await service.getLeagueCoverageResource(fixture);
  const status = { phase: "live" };

  assert.equal(await service.getStandingsResource(fixture, coverage), null);
  assert.deepEqual(
    await service.getEventsResource({
      fixtureId: 123,
      status,
      scoreEvent: { type: "NONE" },
      leagueCoverage: coverage
    }),
    []
  );
  assert.deepEqual(await service.getStatisticsResource(123, status, coverage), []);
  assert.deepEqual(
    await service.getLineupsResource(123, { phase: "upcoming" }, { lineupsTtlSeconds: 300 }, coverage),
    []
  );
  assert.deepEqual(await service.getInjuriesResource(123, status, { injuriesTtlSeconds: 300 }, coverage), []);
  assert.equal(await service.getPredictionsResource(123, { phase: "upcoming" }, coverage), null);

  assert.equal(standingsCalls, 0);
  assert.equal(eventsCalls, 0);
  assert.equal(statisticsCalls, 0);
  assert.equal(lineupsCalls, 0);
  assert.equal(injuriesCalls, 0);
  assert.equal(predictionsCalls, 0);
});

test("predictions are cached per fixture for upcoming matches", async () => {
  let calls = 0;
  const { service } = createService({
    apiFootballClient: {
      getPredictions: async () => {
        calls += 1;
        return {
          predictions: {
            winner: { id: 1, name: "Home" },
            under_over: "-2.5",
            advice: "Home or draw"
          }
        };
      }
    }
  });

  const coverage = {
    predictions: true
  };

  await service.getPredictionsResource(1234, { phase: "upcoming" }, coverage);
  await service.getPredictionsResource(1234, { phase: "upcoming" }, coverage);

  assert.equal(calls, 1);
});

test("predictions require explicit coverage support", async () => {
  let calls = 0;
  const { service } = createService({
    apiFootballClient: {
      getPredictions: async () => {
        calls += 1;
        return {
          predictions: {
            winner: { id: 1, name: "Home" }
          }
        };
      }
    }
  });

  assert.equal(await service.getPredictionsResource(999, { phase: "upcoming" }, null), null);
  assert.equal(await service.getPredictionsResource(999, { phase: "upcoming" }, {}), null);
  assert.equal(
    await service.getPredictionsResource(999, { phase: "upcoming" }, { predictions: false }),
    null
  );

  assert.equal(calls, 0);
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

test("league context uses long cache when every round fixture is finished", async () => {
  const { service, cacheService } = createService({
    apiFootballClient: {
      getFixturesByRound: async () => [
        {
          fixture: {
            id: 201,
            timestamp: 1774897200,
            date: "2026-03-30T19:00:00+00:00",
            status: { short: "FT", elapsed: 90 }
          },
          teams: {
            home: { id: 1, name: "Home", logo: "" },
            away: { id: 2, name: "Away", logo: "" }
          },
          goals: { home: 1, away: 0 }
        }
      ]
    }
  });

  const fixture = {
    fixture: {
      id: 200,
      timestamp: 1774897200
    },
    league: {
      id: 39,
      season: 2025,
      round: "Regular Season - 30"
    }
  };

  await service.getLeagueRoundFixturesResource(fixture, { phase: "upcoming" });
  const cachedPayload = await cacheService.getJson("league-context:39:2025:Regular%20Season%20-%2030");

  assert.ok(cachedPayload?.last_updated);
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

test("single-leg knockout fixtures use cup impact instead of table impact", async () => {
  const fixtureId = 9101;
  const { service } = createService({
    apiFootballClient: {
      getFixture: async () => ({
        fixture: {
          id: fixtureId,
          timestamp: Math.floor(Date.now() / 1000),
          date: "2026-04-01T08:00:00+00:00",
          status: {
            short: "2H",
            long: "Second Half",
            elapsed: 72
          }
        },
        league: {
          id: 73,
          name: "Copa do Brasil",
          country: "Brazil",
          season: 2026,
          standings: false,
          round: "Quarter-finals"
        },
        teams: {
          home: { id: 1, name: "Cruzeiro", logo: "" },
          away: { id: 2, name: "Vitoria", logo: "" }
        },
        goals: {
          home: 1,
          away: 0
        }
      }),
      getFixturesByRound: async () => []
    }
  });

  const payload = await service.refreshMatchImpact(fixtureId);

  assert.equal(payload.impact.mode, "cup");
  assert.equal(payload.metadata.tableImpactAvailable, false);
  assert.equal(payload.metadata.impactBasis, "knockout-tie");
  assert.equal(payload.metadata.knockoutContext.type, "single_leg_knockout");
  assert.equal(payload.impact.summary, "Cruzeiro is currently going through");
  assert.deepEqual(payload.impact.competition, [
    "Winner advances from this tie.",
    "Vitoria needs one goal to level the tie."
  ]);
});

test("first leg of a two-leg tie reports first-leg advantage context", async () => {
  const fixtureId = 9102;
  const kickoff = 1775016000;
  const { service } = createService({
    apiFootballClient: {
      getFixture: async () => ({
        fixture: {
          id: fixtureId,
          timestamp: kickoff,
          date: "2026-04-02T08:00:00+00:00",
          status: {
            short: "2H",
            long: "Second Half",
            elapsed: 61
          }
        },
        league: {
          id: 13,
          name: "CONMEBOL Libertadores",
          country: "South America",
          season: 2026,
          standings: true,
          round: "Round of 16"
        },
        teams: {
          home: { id: 10, name: "Sao Paulo", logo: "" },
          away: { id: 11, name: "River Plate", logo: "" }
        },
        goals: {
          home: 2,
          away: 1
        }
      }),
      getStandings: async () => ({
        response: [
          {
            league: {
              standings: [
                [
                  {
                    rank: 1,
                    points: 10,
                    goalsDiff: 4,
                    all: { played: 4, goals: { for: 8, against: 4 } },
                    team: { id: 10, name: "Sao Paulo", code: "SAO" }
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
            timestamp: kickoff
          },
          teams: {
            home: { id: 10, name: "Sao Paulo", logo: "" },
            away: { id: 11, name: "River Plate", logo: "" }
          },
          goals: { home: 2, away: 1 }
        },
        {
          fixture: {
            id: 9103,
            timestamp: kickoff + 604800,
            status: { short: "NS", long: "Not Started", elapsed: null }
          },
          teams: {
            home: { id: 11, name: "River Plate", logo: "" },
            away: { id: 10, name: "Sao Paulo", logo: "" }
          },
          goals: { home: 0, away: 0 }
        }
      ]
    }
  });

  const payload = await service.refreshMatchImpact(fixtureId);

  assert.equal(payload.impact.mode, "cup");
  assert.equal(payload.metadata.knockoutContext.type, "two_leg_first_leg");
  assert.equal(payload.impact.summary, "Sao Paulo takes a first-leg advantage");
  assert.deepEqual(payload.impact.competition, [
    "This is the first leg of a two-leg tie.",
    "Sao Paulo takes a first-leg advantage"
  ]);
});

test("second leg of a two-leg tie computes aggregate impact", async () => {
  const fixtureId = 9104;
  const kickoff = 1775620800;
  const { service } = createService({
    apiFootballClient: {
      getFixture: async () => ({
        fixture: {
          id: fixtureId,
          timestamp: kickoff,
          date: "2026-04-09T08:00:00+00:00",
          status: {
            short: "2H",
            long: "Second Half",
            elapsed: 74
          }
        },
        league: {
          id: 73,
          name: "Copa do Brasil",
          country: "Brazil",
          season: 2026,
          standings: false,
          round: "Quarter-finals"
        },
        teams: {
          home: { id: 21, name: "Cruzeiro", logo: "" },
          away: { id: 22, name: "Vitoria", logo: "" }
        },
        goals: {
          home: 2,
          away: 0
        }
      }),
      getFixturesByRound: async () => [
        {
          fixture: {
            id: 9105,
            timestamp: kickoff - 604800,
            status: { short: "FT", long: "Match Finished", elapsed: 90 }
          },
          teams: {
            home: { id: 22, name: "Vitoria", logo: "" },
            away: { id: 21, name: "Cruzeiro", logo: "" }
          },
          goals: { home: 1, away: 0 }
        },
        {
          fixture: {
            id: fixtureId,
            timestamp: kickoff,
            status: { short: "2H", long: "Second Half", elapsed: 74 }
          },
          teams: {
            home: { id: 21, name: "Cruzeiro", logo: "" },
            away: { id: 22, name: "Vitoria", logo: "" }
          },
          goals: { home: 2, away: 0 }
        }
      ]
    }
  });

  const payload = await service.refreshMatchImpact(fixtureId);

  assert.equal(payload.impact.mode, "cup");
  assert.equal(payload.metadata.knockoutContext.type, "two_leg_aggregate");
  assert.equal(payload.impact.summary, "Cruzeiro is currently going through");
  assert.deepEqual(payload.impact.competition, [
    "Cruzeiro 2-1 Vitoria on aggregate",
    "Cruzeiro is currently going through",
    "Vitoria needs one more goal to level the aggregate"
  ]);
});

test("finished penalty shootout uses penalty impact context", async () => {
  const fixtureId = 1537578;
  const { service } = createService({
    apiFootballClient: {
      getFixture: async () => ({
        fixture: {
          id: fixtureId,
          timestamp: 1774982700,
          date: "2026-03-31T18:45:00+00:00",
          status: {
            short: "PEN",
            long: "Match Finished",
            elapsed: 120
          }
        },
        league: {
          id: 32,
          name: "World Cup - Qualification Europe",
          country: "World",
          season: 2024,
          standings: true,
          round: "Final"
        },
        teams: {
          home: { id: 1113, name: "Bosnia & Herzegovina", logo: "", winner: true },
          away: { id: 768, name: "Italy", logo: "", winner: false }
        },
        goals: {
          home: 1,
          away: 1
        },
        score: {
          fulltime: { home: 1, away: 1 },
          extratime: { home: 0, away: 0 },
          penalty: { home: 4, away: 1 }
        }
      }),
      getLeagueCoverage: async () => ({
        standings: true,
        injuries: false,
        players: false,
        predictions: false,
        fixtures: {
          events: true,
          lineups: false,
          statisticsFixtures: false,
          statisticsPlayers: false
        }
      }),
      getStandings: async () => ({
        response: [
          {
            league: {
              standings: [
                [
                  {
                    rank: 1,
                    team: { id: 1113, name: "Bosnia & Herzegovina" },
                    points: 3,
                    goalsDiff: 1,
                    all: { played: 1, win: 1, draw: 0, lose: 0, goals: { for: 1, against: 0 } }
                  },
                  {
                    rank: 2,
                    team: { id: 768, name: "Italy" },
                    points: 0,
                    goalsDiff: -1,
                    all: { played: 1, win: 0, draw: 0, lose: 1, goals: { for: 0, against: 1 } }
                  }
                ]
              ]
            }
          }
        ]
      }),
      getEvents: async () => [
        {
          time: { elapsed: 120, extra: 4 },
          team: { id: 1113, name: "Bosnia & Herzegovina" },
          player: { name: "E. Bajraktarevic" },
          assist: { name: null },
          type: "Goal",
          detail: "Penalty",
          comments: "Penalty Shootout"
        }
      ],
      getFixturesByRound: async () => [
        {
          fixture: {
            id: fixtureId,
            timestamp: 1774982700,
            status: { short: "PEN", long: "Match Finished", elapsed: 120 }
          },
          teams: {
            home: { id: 1113, name: "Bosnia & Herzegovina", logo: "" },
            away: { id: 768, name: "Italy", logo: "" }
          },
          goals: { home: 1, away: 1 }
        }
      ]
    }
  });

  const payload = await service.refreshMatchImpact(fixtureId);

  assert.equal(payload.impact.mode, "cup");
  assert.equal(payload.metadata.penaltyContext.phase, "finished");
  assert.equal(payload.impact.summary, "Bosnia & Herzegovina wins on penalties");
  assert.deepEqual(payload.impact.competition, [
    "Bosnia & Herzegovina 4-1 Italy on penalties",
    "Bosnia & Herzegovina wins on penalties"
  ]);
});

test("live statistics add pressure insights and competition-specific zone messages", async () => {
  const fixtureId = 9201;
  const { service } = createService({
    apiFootballClient: {
      getFixture: async () => ({
        fixture: {
          id: fixtureId,
          timestamp: 1775620800,
          date: "2026-04-09T08:00:00+00:00",
          status: {
            short: "2H",
            long: "Second Half",
            elapsed: 72
          }
        },
        league: {
          id: 40,
          name: "Championship",
          country: "England",
          season: 2026,
          standings: true,
          round: "Regular Season - 41"
        },
        teams: {
          home: { id: 31, name: "Leeds", logo: "" },
          away: { id: 32, name: "Coventry", logo: "" }
        },
        goals: {
          home: 1,
          away: 0
        }
      }),
      getLeagueCoverage: async () => ({
        standings: true,
        injuries: false,
        players: false,
        predictions: false,
        fixtures: {
          events: false,
          lineups: false,
          statisticsFixtures: true,
          statisticsPlayers: false
        }
      }),
      getStandings: async () => ({
        response: [
          {
            league: {
              standings: [
                [
                  {
                    rank: 3,
                    team: { id: 31, name: "Leeds" },
                    points: 75,
                    goalsDiff: 20,
                    all: { played: 40, win: 22, draw: 9, lose: 9, goals: { for: 66, against: 46 } }
                  },
                  {
                    rank: 2,
                    team: { id: 99, name: "Burnley" },
                    points: 75,
                    goalsDiff: 21,
                    all: { played: 40, win: 22, draw: 9, lose: 9, goals: { for: 67, against: 46 } }
                  },
                  {
                    rank: 21,
                    team: { id: 32, name: "Coventry" },
                    points: 41,
                    goalsDiff: -12,
                    all: { played: 40, win: 10, draw: 11, lose: 19, goals: { for: 39, against: 51 } }
                  },
                  {
                    rank: 22,
                    team: { id: 98, name: "Plymouth" },
                    points: 40,
                    goalsDiff: -15,
                    all: { played: 40, win: 10, draw: 10, lose: 20, goals: { for: 38, against: 53 } }
                  }
                ]
              ]
            }
          }
        ]
      }),
      getStatistics: async () => [
        {
          team: { id: 31 },
          statistics: [
            { type: "Ball Possession", value: "66%" },
            { type: "Shots on Goal", value: 6 },
            { type: "Total Shots", value: 15 },
            { type: "Corner Kicks", value: 7 },
            { type: "Yellow Cards", value: 1 },
            { type: "Red Cards", value: 0 }
          ]
        },
        {
          team: { id: 32 },
          statistics: [
            { type: "Ball Possession", value: "34%" },
            { type: "Shots on Goal", value: 1 },
            { type: "Total Shots", value: 5 },
            { type: "Corner Kicks", value: 2 },
            { type: "Yellow Cards", value: 2 },
            { type: "Red Cards", value: 1 }
          ]
        }
      ]
    }
  });

  const payload = await service.refreshMatchImpact(fixtureId);

  assert.ok(payload.impact.competition.includes("Leeds moves into the automatic promotion spots"));
  assert.ok(payload.statistics.insights.includes("Leeds is creating the better chances"));
  assert.ok(payload.statistics.insights.includes("Leeds is pinning the other side back"));
});
