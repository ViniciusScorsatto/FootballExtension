import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLeagueFilterPayload,
  isFeaturedLeague,
  isLeagueSupported
} from "../backend/src/utils/leagues.js";

test("isLeagueSupported allows everything when no allowlist is configured", () => {
  assert.equal(isLeagueSupported(39, []), true);
});

test("isLeagueSupported blocks leagues outside the configured allowlist", () => {
  assert.equal(isLeagueSupported(39, [39, 140]), true);
  assert.equal(isLeagueSupported(78, [39, 140]), false);
});

test("isFeaturedLeague flags configured featured leagues", () => {
  assert.equal(isFeaturedLeague(39, [39, 140]), true);
  assert.equal(isFeaturedLeague(78, [39, 140]), false);
});

test("buildLeagueFilterPayload returns featured leagues first", () => {
  const payload = buildLeagueFilterPayload(
    [
      {
        league: {
          id: 140,
          name: "La Liga",
          country: "Spain"
        }
      },
      {
        league: {
          id: 39,
          name: "Premier League",
          country: "England"
        }
      }
    ],
    {
      supportedLeagueIds: [39, 140],
      featuredLeagueIds: [39]
    }
  );

  assert.deepEqual(payload.availableLeagues, [
    {
      id: 39,
      name: "Premier League",
      country: "England",
      featured: true
    },
    {
      id: 140,
      name: "La Liga",
      country: "Spain",
      featured: false
    }
  ]);
});
