import test from "node:test";
import assert from "node:assert/strict";
import { computeImpact, formatEventMinute } from "../backend/src/utils/impact.js";
import { simulateTable, simulateTableSubset } from "../backend/src/utils/table.js";

test("simulateTable applies a live win and reranks the table", () => {
  const standings = [
    {
      teamId: 1,
      name: "Arsenal",
      shortName: "ARS",
      rank: 3,
      liveRank: 3,
      played: 10,
      points: 20,
      goalsDiff: 8,
      goalsFor: 18,
      goalsAgainst: 10,
      won: 6,
      draw: 2,
      lost: 2
    },
    {
      teamId: 2,
      name: "Chelsea",
      shortName: "CHE",
      rank: 2,
      liveRank: 2,
      played: 10,
      points: 21,
      goalsDiff: 7,
      goalsFor: 16,
      goalsAgainst: 9,
      won: 6,
      draw: 3,
      lost: 1
    },
    {
      teamId: 3,
      name: "Liverpool",
      shortName: "LIV",
      rank: 1,
      liveRank: 1,
      played: 10,
      points: 23,
      goalsDiff: 10,
      goalsFor: 21,
      goalsAgainst: 11,
      won: 7,
      draw: 2,
      lost: 1
    }
  ];

  const fixture = {
    teams: {
      home: { id: 1, name: "Arsenal" },
      away: { id: 2, name: "Chelsea" }
    },
    goals: {
      home: 2,
      away: 0
    }
  };

  const updatedTable = simulateTable(standings, fixture, {
    applyResult: true
  });

  assert.equal(updatedTable[0].teamId, 3);
  assert.equal(updatedTable[0].points, 23);
  assert.equal(updatedTable[1].teamId, 1);
  assert.equal(updatedTable[1].points, 23);
  assert.equal(updatedTable[2].teamId, 2);
});

test("computeImpact highlights top-four swings", () => {
  const oldTable = [
    { teamId: 1, name: "Arsenal", rank: 5, liveRank: 5 },
    { teamId: 2, name: "Chelsea", rank: 4, liveRank: 4 },
    { teamId: 3, name: "Villa", rank: 3, liveRank: 3 },
    { teamId: 4, name: "City", rank: 2, liveRank: 2 },
    { teamId: 5, name: "Liverpool", rank: 1, liveRank: 1 }
  ];

  const newTable = [
    { teamId: 1, name: "Arsenal", rank: 5, liveRank: 4 },
    { teamId: 2, name: "Chelsea", rank: 4, liveRank: 5 },
    { teamId: 3, name: "Villa", rank: 3, liveRank: 3 },
    { teamId: 4, name: "City", rank: 2, liveRank: 2 },
    { teamId: 5, name: "Liverpool", rank: 1, liveRank: 1 }
  ];

  const impact = computeImpact(oldTable, newTable, {
    teams: {
      home: { id: 1, name: "Arsenal" },
      away: { id: 2, name: "Chelsea" }
    },
    goals: {
      home: 1,
      away: 0
    }
  });

  assert.match(impact.summary, /Arsenal moves to 4th/);
  assert.ok(impact.competition.includes("Arsenal breaks into the top 4"));
  assert.ok(impact.competition.includes("Chelsea drops out of the top 4"));
});

test("computeImpact uses Championship zone messaging when configured", () => {
  const oldTable = [
    { teamId: 1, name: "Leeds", rank: 3, liveRank: 3 },
    { teamId: 2, name: "Burnley", rank: 2, liveRank: 2 },
    { teamId: 3, name: "Sheffield United", rank: 22, liveRank: 22 },
    { teamId: 4, name: "Plymouth", rank: 21, liveRank: 21 }
  ];

  const newTable = [
    { teamId: 1, name: "Leeds", rank: 3, liveRank: 2 },
    { teamId: 2, name: "Burnley", rank: 2, liveRank: 3 },
    { teamId: 3, name: "Sheffield United", rank: 22, liveRank: 21 },
    { teamId: 4, name: "Plymouth", rank: 21, liveRank: 22 }
  ];

  const impact = computeImpact(
    oldTable,
    newTable,
    {
      teams: {
        home: { id: 1, name: "Leeds" },
        away: { id: 4, name: "Plymouth" }
      },
      goals: {
        home: 1,
        away: 0
      }
    },
    {
      zoneProfile: "championship"
    }
  );

  assert.ok(impact.competition.includes("Leeds moves into the automatic promotion spots"));
  assert.ok(impact.competition.includes("Plymouth falls into the relegation zone"));
});

test("computeImpact uses UEFA league-phase zone messaging when configured", () => {
  const oldTable = [
    { teamId: 1, name: "Arsenal", rank: 9, liveRank: 9 },
    { teamId: 2, name: "PSV", rank: 24, liveRank: 24 }
  ];

  const newTable = [
    { teamId: 1, name: "Arsenal", rank: 9, liveRank: 8 },
    { teamId: 2, name: "PSV", rank: 24, liveRank: 25 }
  ];

  const impact = computeImpact(
    oldTable,
    newTable,
    {
      teams: {
        home: { id: 1, name: "Arsenal" },
        away: { id: 2, name: "PSV" }
      },
      goals: {
        home: 1,
        away: 0
      }
    },
    {
      zoneProfile: "uefa_league_phase"
    }
  );

  assert.ok(impact.competition.includes("Arsenal moves into the round of 16 spots"));
  assert.ok(impact.competition.includes("PSV falls into the elimination zone"));
});

test("simulateTableSubset updates only the team present in the group table", () => {
  const standings = [
    {
      teamId: 1,
      name: "Jacuipense",
      shortName: "JAC",
      rank: 4,
      liveRank: 4,
      played: 2,
      points: 1,
      goalsDiff: -2,
      goalsFor: 1,
      goalsAgainst: 3,
      won: 0,
      draw: 1,
      lost: 1
    },
    {
      teamId: 3,
      name: "Another Team",
      shortName: "ANO",
      rank: 3,
      liveRank: 3,
      played: 2,
      points: 3,
      goalsDiff: 0,
      goalsFor: 2,
      goalsAgainst: 2,
      won: 1,
      draw: 0,
      lost: 1
    }
  ];

  const updatedTable = simulateTableSubset(standings, {
    teams: {
      home: { id: 1, name: "Jacuipense" },
      away: { id: 99, name: "America-RN" }
    },
    goals: {
      home: 1,
      away: 0
    }
  });

  assert.equal(updatedTable[0].teamId, 1);
  assert.equal(updatedTable[0].points, 4);
  assert.equal(updatedTable[0].played, 3);
});

test("formatEventMinute includes added time", () => {
  assert.equal(formatEventMinute({ elapsed: 90, extra: 4 }), "90+4'");
  assert.equal(formatEventMinute({ elapsed: 67, extra: null }), "67'");
});
