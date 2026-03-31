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
        id: 1128,
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
  assert.equal(result.registry?.routing, "grouped_cross_play");
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

test("registry can tag hybrid competitions without overriding standings-based group logic", () => {
  const result = classifyCompetitionFormat({
    fixture: {
      league: {
        id: 13,
        name: "CONMEBOL Libertadores",
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
                  goalsDiff: 4,
                  all: { played: 2, goals: { for: 5, against: 1 } },
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
  assert.equal(result.source, "standings");
  assert.equal(result.registry?.routing, "hybrid_group_knockout");
});

test("registry can tag single-league-phase european competitions without overriding table logic", () => {
  const result = classifyCompetitionFormat({
    fixture: {
      league: {
        id: 2,
        name: "UEFA Champions League",
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
                  rank: 7,
                  points: 14,
                  goalsDiff: 5,
                  all: { played: 8, goals: { for: 12, against: 7 } },
                  team: { id: 1, name: "Home", code: "HOM" }
                },
                {
                  rank: 18,
                  points: 10,
                  goalsDiff: 1,
                  all: { played: 8, goals: { for: 10, against: 9 } },
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
  assert.equal(result.registry?.routing, "hybrid_single_table_knockout");
});

test("registry can tag phased domestic competitions without overriding later grouped logic", () => {
  const result = classifyCompetitionFormat({
    fixture: {
      league: {
        id: 75,
        name: "Serie C",
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
                  points: 9,
                  goalsDiff: 4,
                  all: { played: 4, goals: { for: 7, against: 3 } },
                  team: { id: 1, name: "Home", code: "HOM" }
                },
                {
                  group: "Group A",
                  rank: 2,
                  points: 7,
                  goalsDiff: 2,
                  all: { played: 4, goals: { for: 5, against: 3 } },
                  team: { id: 2, name: "Away", code: "AWY" }
                }
              ],
              [
                {
                  group: "Group B",
                  rank: 1,
                  points: 8,
                  goalsDiff: 3,
                  all: { played: 4, goals: { for: 6, against: 3 } },
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
  assert.equal(result.registry?.routing, "hybrid_single_table_groups");
});

test("registry can mark portuguese cups as knockout competitions", () => {
  const result = classifyCompetitionFormat({
    fixture: {
      league: {
        id: 96,
        name: "Taça de Portugal",
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
                  points: 0,
                  goalsDiff: 0,
                  all: { played: 0, goals: { for: 0, against: 0 } },
                  team: { id: 1, name: "Home", code: "HOM" }
                },
                {
                  rank: 2,
                  points: 0,
                  goalsDiff: 0,
                  all: { played: 0, goals: { for: 0, against: 0 } },
                  team: { id: 2, name: "Away", code: "AWY" }
                }
              ]
            ]
          }
        }
      ]
    }
  });

  assert.equal(result.registry?.routing, "knockout_cup");
  assert.equal(result.format, "single_table");
  assert.equal(result.impactMode, "full");
});
