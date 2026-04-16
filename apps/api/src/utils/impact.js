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

const ZONE_PROFILES = {
  championship: [
    {
      id: "automatic_promotion",
      priority: 1,
      start: 1,
      end: 2,
      enterTemplate: "{team} moves into the automatic promotion spots"
    },
    {
      id: "playoff",
      priority: 2,
      start: 3,
      end: 6,
      enterTemplate: "{team} moves into the playoff spots",
      promoteTemplate: "{team} climbs into the playoff spots",
      dropTemplate: "{team} drops into the playoff spots",
      leaveTemplate: "{team} drops out of the playoff spots"
    },
    {
      id: "relegation",
      priority: 4,
      start: 22,
      end: 24,
      enterTemplate: "{team} falls into the relegation zone",
      leaveTemplate: "{team} climbs out of the relegation zone"
    }
  ],
  uefa_league_phase: [
    {
      id: "round_of_16",
      priority: 1,
      start: 1,
      end: 8,
      enterTemplate: "{team} moves into the round of 16 spots"
    },
    {
      id: "knockout_playoff",
      priority: 2,
      start: 9,
      end: 24,
      enterTemplate: "{team} moves into the knockout play-off spots",
      promoteTemplate: "{team} climbs into the knockout play-off spots",
      dropTemplate: "{team} drops into the knockout play-off spots",
      leaveTemplate: "{team} drops out of the knockout play-off spots"
    },
    {
      id: "elimination",
      priority: 3,
      start: 25,
      end: 36,
      enterTemplate: "{team} falls into the elimination zone"
    }
  ],
  world_cup_group_stage: [
    {
      id: "qualification",
      priority: 1,
      start: 1,
      end: 2,
      enterTemplate: "{team} moves into the qualification spots",
      leaveTemplate: "{team} drops out of the qualification spots"
    }
  ],
  serie_c_first_stage: [
    {
      id: "promotion_groups",
      priority: 1,
      start: 1,
      end: 8,
      enterTemplate: "{team} moves into the promotion group spots",
      leaveTemplate: "{team} drops out of the promotion group spots"
    },
    {
      id: "relegation",
      priority: 3,
      start: 19,
      end: 20,
      enterTemplate: "{team} falls into the relegation zone",
      leaveTemplate: "{team} climbs out of the relegation zone"
    }
  ]
};

function applyTemplate(template, teamName) {
  return template.replace("{team}", teamName);
}

function getZoneForRank(zoneProfile, rank) {
  if (!zoneProfile || !rank) {
    return null;
  }

  return (
    zoneProfile.find((zone) => rank >= zone.start && rank <= zone.end) ??
    null
  );
}

function buildZoneTransitionMessage(teamName, oldRank, newRank, zoneProfile) {
  const previousZone = getZoneForRank(zoneProfile, oldRank);
  const nextZone = getZoneForRank(zoneProfile, newRank);

  if (previousZone?.id === nextZone?.id) {
    return "";
  }

  if (!previousZone && nextZone?.enterTemplate) {
    return applyTemplate(nextZone.enterTemplate, teamName);
  }

  if (previousZone && !nextZone && previousZone.leaveTemplate) {
    return applyTemplate(previousZone.leaveTemplate, teamName);
  }

  if (!previousZone || !nextZone) {
    return "";
  }

  if (nextZone.priority < previousZone.priority) {
    return applyTemplate(
      nextZone.promoteTemplate ?? nextZone.enterTemplate ?? "",
      teamName
    );
  }

  if (nextZone.priority > previousZone.priority) {
    return applyTemplate(
      nextZone.dropTemplate ?? nextZone.enterTemplate ?? previousZone.leaveTemplate ?? "",
      teamName
    );
  }

  return "";
}

function buildGroupCompetitionMessages(teamName, oldRank, newRank) {
  const messages = [];

  if (newRank === 1 && oldRank !== 1) {
    messages.push(`${teamName} goes top of the group`);
  }

  if (oldRank === 1 && newRank !== 1) {
    messages.push(`${teamName} loses the group lead`);
  }

  if (oldRank > 2 && newRank <= 2) {
    messages.push(`${teamName} moves into the qualification spots`);
  }

  if (oldRank <= 2 && newRank > 2) {
    messages.push(`${teamName} drops out of the qualification spots`);
  }

  if (oldRank !== 3 && newRank === 3) {
    messages.push(`${teamName} drops to 3rd`);
  }

  return messages;
}

function computeCompetitionMessages(teamName, oldRank, newRank, tableSize, options = {}) {
  const messages = [];
  const zoneProfile = ZONE_PROFILES[options.zoneProfile] ?? null;

  if (options.impactMode === "group") {
    messages.push(...buildGroupCompetitionMessages(teamName, oldRank, newRank));

    if (zoneProfile?.length) {
      const zoneMessage = buildZoneTransitionMessage(teamName, oldRank, newRank, zoneProfile);

      if (zoneMessage) {
        messages.push(zoneMessage);
      }
    }

    return [...new Set(messages)];
  }

  if (newRank === 1 && oldRank !== 1) {
    messages.push(`${teamName} goes top of the table`);
  }

  if (zoneProfile?.length) {
    const zoneMessage = buildZoneTransitionMessage(teamName, oldRank, newRank, zoneProfile);

    if (zoneMessage) {
      messages.push(zoneMessage);
    }

    return messages;
  }

  const titleCutoff = Math.min(2, tableSize);
  const topFourCutoff = Math.min(4, tableSize);
  const relegationCutoff = tableSize - (tableSize >= 10 ? 2 : 1);

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

export function computeImpact(oldTable, newTable, fixture, options = {}) {
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
      tableSize,
      options
    ),
    ...computeCompetitionMessages(
      awayTeam?.name ?? "Away team",
      awayMovement.oldPosition,
      awayMovement.newPosition,
      tableSize,
      options
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
