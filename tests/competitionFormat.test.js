import assert from "node:assert/strict";
import test from "node:test";
import { classifyCompetitionFormat } from "../backend/src/utils/competitionFormat.js";

test("classifies a single-table competition from standings shape", () => {
  const result = classifyCompetitionFormat({
    fixture: {
      league: {
        name: "Premier League",
        standings: true
      },
      teams: {
        home: { id: 1 },
        away: { id: 2 }
      }
    },
    standingsPayload: {
      response: [
        {
          league: {
            name: "Premier League",
            standings: [
              [
                {
                  rank: 1,
                  points: 25,
                  goalsDiff: 10,
                  all: { played: 10, goals: { for: 20, against: 10 } },
                  team: { id: 1, name: "Home", code: "HOM" }
                },
                {
                  rank: 2,
                  points: 23,
                  goalsDiff: 8,
                  all: { played: 10, goals: { for: 18, against: 10 } },
                  team: { id: 2, name: "Away", code: "AWY" }
                }
              ]
            ]
          }
        }
      ]
    }
  });

  assert.equal(result.format, "single_table");
  assert.equal(result.impactMode, "full");
  assert.equal(result.selectedGroup?.table.length, 2);
});

test("classifies same-group fixtures as group impact", () => {
  const result = classifyCompetitionFormat({
    fixture: {
      league: {
        name: "Regional League",
        standings: true
      },
      teams: {
        home: { id: 1 },
        away: { id: 2 }
      }
    },
    standingsPayload: {
      response: [
        {
          league: {
            standings: [
              [
                {
                  group: "Group A",
                  rank: 1,
                  points: 6,
                  goalsDiff: 3,
                  all: { played: 2, goals: { for: 4, against: 1 } },
                  team: { id: 1, name: "Home", code: "HOM" }
                },
                {
                  group: "Group A",
                  rank: 2,
                  points: 4,
                  goalsDiff: 1,
                  all: { played: 2, goals: { for: 3, against: 2 } },
                  team: { id: 2, name: "Away", code: "AWY" }
                }
              ],
              [
                {
                  group: "Group B",
                  rank: 1,
                  points: 6,
                  goalsDiff: 3,
                  all: { played: 2, goals: { for: 5, against: 2 } },
                  team: { id: 3, name: "Other", code: "OTH" }
                }
              ]
            ]
          }
        }
      ]
    }
  });

  assert.equal(result.format, "grouped_same_group");
  assert.equal(result.impactMode, "group");
  assert.equal(result.selectedGroup?.name, "Group A");
});

test("classifies cross-group fixtures as limited impact", () => {
  const result = classifyCompetitionFormat({
    fixture: {
      league: {
        name: "Regional League",
        standings: true
      },
      teams: {
        home: { id: 1 },
        away: { id: 4 }
      }
    },
    standingsPayload: {
      response: [
        {
          league: {
            standings: [
              [
                {
                  group: "Group A",
                  rank: 1,
                  points: 6,
                  goalsDiff: 3,
                  all: { played: 2, goals: { for: 4, against: 1 } },
                  team: { id: 1, name: "Home", code: "HOM" }
                }
              ],
              [
                {
                  group: "Group B",
                  rank: 1,
                  points: 6,
                  goalsDiff: 3,
                  all: { played: 2, goals: { for: 5, against: 2 } },
                  team: { id: 4, name: "Away", code: "AWY" }
                }
              ]
            ]
          }
        }
      ]
    }
  });

  assert.equal(result.format, "grouped_cross_play");
  assert.equal(result.impactMode, "limited");
  assert.deepEqual(result.teamGroups, {
    home: ["Group A"],
    away: ["Group B"]
  });
});

test("registry overrides can force limited mode for known competitions", () => {
  const result = classifyCompetitionFormat({
    fixture: {
      league: {
        name: "Copa do Nordeste",
        standings: true
      },
      teams: {
        home: { id: 1 },
        away: { id: 2 }
      }
    },
    standingsPayload: {
      response: [
        {
          league: {
            standings: [
              [
                {
                  rank: 1,
                  points: 6,
                  goalsDiff: 3,
                  all: { played: 2, goals: { for: 4, against: 1 } },
                  team: { id: 1, name: "Home", code: "HOM" }
                },
                {
                  rank: 2,
                  points: 4,
                  goalsDiff: 1,
                  all: { played: 2, goals: { for: 3, against: 2 } },
                  team: { id: 2, name: "Away", code: "AWY" }
                }
              ]
            ]
          }
        }
      ]
    }
  });

  assert.equal(result.format, "grouped_cross_play");
  assert.equal(result.impactMode, "limited");
  assert.equal(result.source, "override");
  assert.deepEqual(result.teamPositions, {
    home: {
      group: "Table",
      position: 1,
      teamId: 1,
      teamName: "Home"
    },
    away: {
      group: "Table",
      position: 2,
      teamId: 2,
      teamName: "Away"
    }
  });
});
