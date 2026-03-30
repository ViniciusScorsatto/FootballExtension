const LIVE_CODES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "INT", "LIVE"]);
const UPCOMING_CODES = new Set(["TBD", "NS", "PST", "SUSP", "AWD", "WO"]);
const FINISHED_CODES = new Set(["FT", "AET", "PEN"]);

function formatOrdinal(rank) {
  const mod100 = rank % 100;

  if (mod100 >= 11 && mod100 <= 13) {
    return `${rank}th`;
  }

  switch (rank % 10) {
    case 1:
      return `${rank}st`;
    case 2:
      return `${rank}nd`;
    case 3:
      return `${rank}rd`;
    default:
      return `${rank}th`;
  }
}

function movementLabel(teamName, movement, newRank) {
  if (movement > 0) {
    return `${teamName} moves to ${formatOrdinal(newRank)} (+${movement})`;
  }

  if (movement < 0) {
    return `${teamName} drops to ${formatOrdinal(newRank)} (${movement})`;
  }

  return `${teamName} stays ${formatOrdinal(newRank)}`;
}

function computeCompetitionMessages(teamName, oldRank, newRank, tableSize) {
  const messages = [];
  const titleCutoff = Math.min(2, tableSize);
  const topFourCutoff = Math.min(4, tableSize);
  const relegationCutoff = tableSize - (tableSize >= 10 ? 2 : 1);

  if (newRank === 1 && oldRank !== 1) {
    messages.push(`${teamName} goes top of the table`);
  }

  if (oldRank > titleCutoff && newRank <= titleCutoff) {
    messages.push(`${teamName} enters the title race`);
  }

  if (oldRank <= titleCutoff && newRank > titleCutoff) {
    messages.push(`${teamName} loses ground in the title race`);
  }

  if (oldRank > topFourCutoff && newRank <= topFourCutoff) {
    messages.push(`${teamName} breaks into the top ${topFourCutoff}`);
  }

  if (oldRank <= topFourCutoff && newRank > topFourCutoff) {
    messages.push(`${teamName} drops out of the top ${topFourCutoff}`);
  }

  if (oldRank >= relegationCutoff && newRank < relegationCutoff) {
    messages.push(`${teamName} climbs out of the relegation zone`);
  }

  if (oldRank < relegationCutoff && newRank >= relegationCutoff) {
    messages.push(`${teamName} falls into the relegation zone`);
  }

  return messages;
}

function buildMomentum(movements, score) {
  const homeLead = Number(score.home) - Number(score.away);
  const awayLead = Number(score.away) - Number(score.home);

  const homeMovement = movements.home?.movement ?? 0;
  const awayMovement = movements.away?.movement ?? 0;

  let home = 50 + homeMovement * 10 + Math.max(homeLead, 0) * 8 - Math.max(awayLead, 0) * 5;
  let away = 50 + awayMovement * 10 + Math.max(awayLead, 0) * 8 - Math.max(homeLead, 0) * 5;

  home = Math.max(0, Math.min(100, home));
  away = Math.max(0, Math.min(100, away));

  return {
    home,
    away
  };
}

export function getFixturePhase(fixture) {
  const statusShort = fixture?.fixture?.status?.short ?? "";

  if (LIVE_CODES.has(statusShort)) {
    return "live";
  }

  if (FINISHED_CODES.has(statusShort)) {
    return "finished";
  }

  if (UPCOMING_CODES.has(statusShort)) {
    return "upcoming";
  }

  return fixture?.fixture?.status?.elapsed ? "live" : "upcoming";
}

export function getMatchStatus(fixture) {
  const phase = getFixturePhase(fixture);

  return {
    phase,
    short: fixture?.fixture?.status?.short ?? "",
    long: fixture?.fixture?.status?.long ?? "",
    minute: fixture?.fixture?.status?.elapsed ?? 0,
    isFinished: phase === "finished"
  };
}

export function detectScoreEvent(previousScore, currentScore, teams) {
  if (!previousScore) {
    return {
      type: "NONE",
      message: ""
    };
  }

  const homeDiff = Number(currentScore.home) - Number(previousScore.home);
  const awayDiff = Number(currentScore.away) - Number(previousScore.away);

  if (homeDiff === 0 && awayDiff === 0) {
    return {
      type: "NONE",
      message: ""
    };
  }

  if (homeDiff + awayDiff === 1) {
    const scoringTeam = homeDiff === 1 ? teams.home : teams.away;

    return {
      type: "GOAL",
      teamId: scoringTeam.id,
      teamName: scoringTeam.name,
      message: `${scoringTeam.name} scores`
    };
  }

  return {
    type: "MATCH_UPDATE",
    message: "Scoreline changed"
  };
}

export function formatEventMinute(time = {}) {
  const elapsed = Number(time.elapsed ?? 0);
  const extra = Number(time.extra ?? 0);

  if (!elapsed) {
    return "";
  }

  if (extra > 0) {
    return `${elapsed}+${extra}'`;
  }

  return `${elapsed}'`;
}

export function computeImpact(oldTable, newTable, fixture) {
  const homeTeam = fixture?.teams?.home;
  const awayTeam = fixture?.teams?.away;
  const tableSize = newTable.length;

  const oldRanks = new Map(oldTable.map((entry) => [entry.teamId, entry.liveRank || entry.rank]));
  const newRanks = new Map(newTable.map((entry) => [entry.teamId, entry.liveRank || entry.rank]));
  const movementEntries = newTable.map((entry) => {
    const previousRank = oldRanks.get(entry.teamId) ?? entry.liveRank;
    const updatedRank = newRanks.get(entry.teamId) ?? entry.liveRank;
    const movement = previousRank - updatedRank;

    return {
      teamId: entry.teamId,
      teamName: entry.name,
      oldPosition: previousRank,
      newPosition: updatedRank,
      movement,
      label: movementLabel(entry.name, movement, updatedRank)
    };
  });

  const biggestMovement =
    movementEntries
      .filter((entry) => entry.movement !== 0)
      .sort((left, right) => Math.abs(right.movement) - Math.abs(left.movement))[0] ?? null;

  const lookupMovement = (teamId) =>
    movementEntries.find((entry) => entry.teamId === teamId) ?? {
      teamId,
      oldPosition: newRanks.get(teamId),
      newPosition: newRanks.get(teamId),
      movement: 0,
      label: ""
    };

  const homeMovement = lookupMovement(homeTeam?.id);
  const awayMovement = lookupMovement(awayTeam?.id);

  const competitionMessages = [
    ...computeCompetitionMessages(
      homeTeam?.name ?? "Home team",
      homeMovement.oldPosition,
      homeMovement.newPosition,
      tableSize
    ),
    ...computeCompetitionMessages(
      awayTeam?.name ?? "Away team",
      awayMovement.oldPosition,
      awayMovement.newPosition,
      tableSize
    )
  ];

  const primarySummary =
    homeMovement.movement > 0
      ? homeMovement.label
      : awayMovement.movement > 0
        ? awayMovement.label
        : biggestMovement?.label ?? homeMovement.label ?? awayMovement.label;

  return {
    summary: primarySummary,
    table: {
      home: {
        ...homeMovement,
        shortName: homeTeam?.name?.slice(0, 3).toUpperCase() ?? "HOME"
      },
      away: {
        ...awayMovement,
        shortName: awayTeam?.name?.slice(0, 3).toUpperCase() ?? "AWAY"
      }
    },
    competition: [...new Set(competitionMessages)],
    biggestMovement,
    momentum: buildMomentum(
      {
        home: homeMovement,
        away: awayMovement
      },
      {
        home: fixture?.goals?.home ?? 0,
        away: fixture?.goals?.away ?? 0
      }
    )
  };
}
