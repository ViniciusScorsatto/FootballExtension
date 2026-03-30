function cloneRow(row) {
  return {
    ...row
  };
}

function normalizeStandingRow(row) {
  return {
    teamId: row.team.id,
    name: row.team.name,
    shortName: row.team.code || row.team.name.slice(0, 3).toUpperCase(),
    rank: row.rank,
    liveRank: row.rank,
    played: row.all?.played ?? 0,
    points: row.points ?? 0,
    goalsDiff: row.goalsDiff ?? 0,
    goalsFor: row.all?.goals?.for ?? 0,
    goalsAgainst: row.all?.goals?.against ?? 0,
    won: row.all?.win ?? 0,
    draw: row.all?.draw ?? 0,
    lost: row.all?.lose ?? 0
  };
}

function rankTable(entries) {
  return entries.map((entry, index) => ({
    ...entry,
    liveRank: index + 1
  }));
}

export function sortTable(entries) {
  return [...entries].sort((left, right) => {
    if (right.points !== left.points) {
      return right.points - left.points;
    }

    if (right.goalsDiff !== left.goalsDiff) {
      return right.goalsDiff - left.goalsDiff;
    }

    if (right.goalsFor !== left.goalsFor) {
      return right.goalsFor - left.goalsFor;
    }

    return left.name.localeCompare(right.name);
  });
}

export function normalizeStandings(standingsPayload) {
  const groups = normalizeStandingsGroups(standingsPayload);

  return groups[0].table;
}

export function normalizeStandingsGroups(standingsPayload) {
  const leagueBlock = standingsPayload?.response?.[0]?.league;
  const tables = leagueBlock?.standings;

  if (!Array.isArray(tables) || tables.length === 0) {
    const error = new Error("Standings data is unavailable for this fixture.");
    error.statusCode = 502;
    throw error;
  }

  const groups = tables
    .map((table, index) => {
      if (!Array.isArray(table) || table.length === 0) {
        return null;
      }

      const firstRow = table[0];
      const label =
        firstRow?.group ??
        (tables.length > 1 ? `Group ${index + 1}` : leagueBlock?.name ?? "Table");

      return {
        id: label,
        name: label,
        table: table.map(normalizeStandingRow)
      };
    })
    .filter(Boolean);

  if (!groups.length) {
    const error = new Error("Standings data is unavailable for this fixture.");
    error.statusCode = 502;
    throw error;
  }

  return groups;
}

export function serializeTable(entries) {
  return entries.map((entry) => ({
    teamId: entry.teamId,
    name: entry.name,
    shortName: entry.shortName,
    rank: entry.rank,
    liveRank: entry.liveRank,
    played: entry.played,
    points: entry.points,
    goalsDiff: entry.goalsDiff,
    goalsFor: entry.goalsFor,
    goalsAgainst: entry.goalsAgainst
  }));
}

export function simulateTable(standings, fixture, options = {}) {
  const { applyResult = true } = options;
  const table = standings.map(cloneRow);

  if (!applyResult) {
    return rankTable(sortTable(table));
  }

  const homeId = fixture?.teams?.home?.id;
  const awayId = fixture?.teams?.away?.id;
  const homeGoals = Number(fixture?.goals?.home ?? 0);
  const awayGoals = Number(fixture?.goals?.away ?? 0);

  const homeRow = table.find((row) => row.teamId === homeId);
  const awayRow = table.find((row) => row.teamId === awayId);

  if (!homeRow || !awayRow) {
    return rankTable(sortTable(table));
  }

  homeRow.played += 1;
  awayRow.played += 1;

  homeRow.goalsFor += homeGoals;
  homeRow.goalsAgainst += awayGoals;
  homeRow.goalsDiff += homeGoals - awayGoals;

  awayRow.goalsFor += awayGoals;
  awayRow.goalsAgainst += homeGoals;
  awayRow.goalsDiff += awayGoals - homeGoals;

  if (homeGoals > awayGoals) {
    homeRow.points += 3;
    homeRow.won += 1;
    awayRow.lost += 1;
  } else if (awayGoals > homeGoals) {
    awayRow.points += 3;
    awayRow.won += 1;
    homeRow.lost += 1;
  } else {
    homeRow.points += 1;
    awayRow.points += 1;
    homeRow.draw += 1;
    awayRow.draw += 1;
  }

  return rankTable(sortTable(table));
}
