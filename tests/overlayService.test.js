import test from "node:test";
import assert from "node:assert/strict";

import { OverlayService } from "../apps/api/src/services/overlayService.js";

function standingRow({ rank, teamId, name, points, goalsDiff = 0, goalsFor = 0, form = "WDLWW" }) {
  return {
    rank,
    team: {
      id: teamId,
      name,
      code: name.slice(0, 3).toUpperCase()
    },
    points,
    form,
    goalsDiff,
    all: {
      played: 4,
      win: 2,
      draw: 0,
      lose: 2,
      goals: {
        for: goalsFor,
        against: goalsFor - goalsDiff
      }
    }
  };
}

function fixture({
  id,
  homeId,
  homeName,
  awayId,
  awayName,
  homeGoals,
  awayGoals,
  minute = 72,
  statusShort = "2H",
  statusLong = "Second Half"
}) {
  return {
    fixture: {
      id,
      date: "2026-05-24T05:00:00.000Z",
      timestamp: 1782277200,
      status: {
        short: statusShort,
        long: statusLong,
        elapsed: minute
      }
    },
    league: {
      id: 71,
      name: "Serie A",
      country: "Brazil",
      season: 2026,
      round: "Regular Season - 8",
      standings: true
    },
    teams: {
      home: { id: homeId, name: homeName },
      away: { id: awayId, name: awayName }
    },
    goals: {
      home: homeGoals,
      away: awayGoals
    }
  };
}

function createMemoryCache() {
  const values = new Map();

  return {
    async getJson(key) {
      return values.get(key) ?? null;
    },
    async setJson(key, value) {
      values.set(key, value);
    }
  };
}

test("overlay service builds a Brasileirão league snapshot from standings and live fixtures", async () => {
  const service = new OverlayService({
    env: {
      obsBrasileiraoSeason: 2026
    },
    cacheService: createMemoryCache(),
    apiFootballClient: {
      async getFixtures(params) {
        assert.deepEqual(params, {
          live: "all",
          league: 71,
          season: 2026
        });

        return [
          fixture({
            id: 5001,
            homeId: 1,
            homeName: "Palmeiras",
            awayId: 2,
            awayName: "Santos",
            homeGoals: 1,
            awayGoals: 0
          })
        ];
      },
      async getFixturesByRound(leagueId, season, round) {
        assert.equal(leagueId, 71);
        assert.equal(season, 2026);
        assert.equal(round, "Regular Season - 8");

        return [
          fixture({
            id: 5001,
            homeId: 1,
            homeName: "Palmeiras",
            awayId: 2,
            awayName: "Santos",
            homeGoals: 1,
            awayGoals: 0
          }),
          fixture({
            id: 5002,
            homeId: 3,
            homeName: "Botafogo",
            awayId: 4,
            awayName: "Flamengo",
            homeGoals: 2,
            awayGoals: 2,
            minute: 90,
            statusShort: "FT",
            statusLong: "Match Finished"
          })
        ];
      },
      async getStandings(leagueId, season) {
        assert.equal(leagueId, 71);
        assert.equal(season, 2026);

        return {
          response: [
            {
              league: {
                standings: [
                  [
                    standingRow({ rank: 1, teamId: 3, name: "Botafogo", points: 10, goalsDiff: 3, goalsFor: 7 }),
                    standingRow({ rank: 2, teamId: 1, name: "Palmeiras", points: 8, goalsDiff: 2, goalsFor: 6 }),
                    standingRow({ rank: 3, teamId: 2, name: "Santos", points: 8, goalsDiff: 1, goalsFor: 5 })
                  ]
                ]
              }
            }
          ]
        };
      }
    }
  });

  const snapshot = await service.getBrasileiraoOverlaySnapshot();

  assert.equal(snapshot.competition.slug, "brasileirao");
  assert.equal(snapshot.status.phase, "live");
  assert.equal(snapshot.matches.length, 2);
  assert.equal(snapshot.matches[1].status.phase, "finished");
  assert.equal(snapshot.standings[0].name, "Palmeiras");
  assert.equal(snapshot.standings[0].rank, 1);
  assert.equal(snapshot.standings[0].movement, 1);
  assert.equal(snapshot.standings[0].won, 3);
  assert.equal(snapshot.standings[0].form, "WDLWW");
  assert.equal(snapshot.events[0].title, "Palmeiras assume a liderança");
});
