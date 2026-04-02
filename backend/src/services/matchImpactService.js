import { serializeTable, simulateTable, simulateTableSubset } from "../utils/table.js";
import {
  computeImpact,
  detectScoreEvent,
  formatEventMinute,
  getMatchStatus
} from "../utils/impact.js";
import { classifyCompetitionFormat } from "../utils/competitionFormat.js";

function buildCacheKey(fixtureId) {
  return `match:${fixtureId}`;
}

function buildStateKey(fixtureId) {
  return `match:state:${fixtureId}`;
}

function buildStandingsKey(leagueId, season) {
  return `standings:${leagueId}:${season}`;
}

function buildLeagueCoverageKey(leagueId, season) {
  return `league-coverage:${leagueId}:${season}`;
}

function buildStatisticsKey(fixtureId) {
  return `statistics:${fixtureId}`;
}

function buildInjuriesKey(fixtureId) {
  return `injuries:${fixtureId}`;
}

function buildEventsKey(fixtureId) {
  return `events:${fixtureId}`;
}

function buildPredictionsKey(fixtureId) {
  return `predictions:${fixtureId}`;
}

function buildLineupsKey(fixtureId) {
  return `lineups:${fixtureId}`;
}

function buildLeagueContextKey(leagueId, season, round) {
  return `league-context:${leagueId}:${season}:${encodeURIComponent(round)}`;
}

function getCacheTtl(status, env) {
  if (status.phase === "live") {
    return env.liveCacheTtlSeconds;
  }

  if (status.phase === "finished") {
    return env.finishedCacheTtlSeconds;
  }

  return env.upcomingCacheTtlSeconds;
}

function extractTeams(fixture) {
  return {
    home: {
      id: fixture?.teams?.home?.id,
      name: fixture?.teams?.home?.name ?? "Home",
      logo: fixture?.teams?.home?.logo ?? "",
      shortName:
        fixture?.teams?.home?.name?.slice(0, 3).toUpperCase() ??
        fixture?.teams?.home?.name ??
        "HOM"
    },
    away: {
      id: fixture?.teams?.away?.id,
      name: fixture?.teams?.away?.name ?? "Away",
      logo: fixture?.teams?.away?.logo ?? "",
      shortName:
        fixture?.teams?.away?.name?.slice(0, 3).toUpperCase() ??
        fixture?.teams?.away?.name ??
        "AWY"
    }
  };
}

function parseNullableScoreValue(value) {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildScoreSnapshot(fixture) {
  return {
    home: Number(fixture?.goals?.home ?? 0),
    away: Number(fixture?.goals?.away ?? 0),
    penalty: {
      home: parseNullableScoreValue(fixture?.score?.penalty?.home),
      away: parseNullableScoreValue(fixture?.score?.penalty?.away)
    },
    fulltime: {
      home: parseNullableScoreValue(fixture?.score?.fulltime?.home),
      away: parseNullableScoreValue(fixture?.score?.fulltime?.away)
    },
    extratime: {
      home: parseNullableScoreValue(fixture?.score?.extratime?.home),
      away: parseNullableScoreValue(fixture?.score?.extratime?.away)
    }
  };
}

function buildRecentEvents(events) {
  return events.slice(-3).map((event) => ({
    time: event.time?.elapsed ?? 0,
    minuteLabel: formatEventMinute(event.time),
    teamId: event.team?.id ?? null,
    teamName: event.team?.name ?? "",
    type: event.type ?? "",
    detail: event.detail ?? "",
    player: event.player?.name ?? "",
    assist: event.assist?.name ?? ""
  }));
}

function isPenaltyShootoutEvent(event) {
  return String(event?.comments ?? "").trim().toLowerCase() === "penalty shootout";
}

function buildResourceEnvelope(data, extra = {}) {
  return {
    last_updated: new Date().toISOString(),
    data,
    ...extra
  };
}

function isLineupsConfirmed(lineups) {
  return lineups.some((entry) => Array.isArray(entry?.startXI) && entry.startXI.length > 0);
}

function getEventsCacheTtl(status, env) {
  return status.phase === "finished"
    ? Math.max(env.eventsCacheTtlSeconds, env.finishedCacheTtlSeconds)
    : env.eventsCacheTtlSeconds;
}

function getStatisticsCacheTtl(status, env) {
  return status.phase === "finished"
    ? Math.max(env.statisticsCacheTtlSeconds, env.finishedCacheTtlSeconds)
    : env.statisticsCacheTtlSeconds;
}

function getLineupsCacheTtl(lineupsConfirmed, status, env) {
  if (lineupsConfirmed) {
    return Math.max(
      env.lineupsConfirmedCacheTtlSeconds,
      status.phase === "finished" ? env.finishedCacheTtlSeconds : env.stateCacheTtlSeconds
    );
  }

  if (status.phase === "finished") {
    return env.finishedCacheTtlSeconds;
  }

  return env.lineupsPendingCacheTtlSeconds;
}

function getLeagueContextCacheTtl(statuses, env) {
  if (statuses.some((status) => status?.phase === "live")) {
    return env.leagueContextLiveCacheTtlSeconds;
  }

  if (statuses.length > 0 && statuses.every((status) => status?.phase === "finished")) {
    return env.leagueContextFinishedCacheTtlSeconds;
  }

  return env.leagueContextUpcomingCacheTtlSeconds;
}

function getMinutesUntilKickoff(fixture) {
  const kickoffTimestamp = fixture?.fixture?.timestamp;

  if (!kickoffTimestamp) {
    return null;
  }

  return Math.floor((kickoffTimestamp * 1000 - Date.now()) / 60000);
}

function getPrematchCadence(fixture, env) {
  const minutesUntilKickoff = getMinutesUntilKickoff(fixture);

  if (minutesUntilKickoff === null || minutesUntilKickoff <= 0) {
    return {
      minutesUntilKickoff,
      lineupsTtlSeconds: env.lineupsPendingCacheTtlSeconds,
      injuriesTtlSeconds: env.injuriesCacheTtlSeconds
    };
  }

  if (minutesUntilKickoff > env.prematchSlowWindowMinutes) {
    return {
      minutesUntilKickoff,
      lineupsTtlSeconds: env.prematchSlowCacheTtlSeconds,
      injuriesTtlSeconds: Math.max(env.injuriesCacheTtlSeconds, env.prematchSlowCacheTtlSeconds)
    };
  }

  if (minutesUntilKickoff > env.prematchMediumWindowMinutes) {
    return {
      minutesUntilKickoff,
      lineupsTtlSeconds: env.prematchMediumCacheTtlSeconds,
      injuriesTtlSeconds: env.prematchMediumCacheTtlSeconds
    };
  }

  if (minutesUntilKickoff > env.prematchFastWindowMinutes) {
    return {
      minutesUntilKickoff,
      lineupsTtlSeconds: env.lineupsPendingCacheTtlSeconds,
      injuriesTtlSeconds: env.prematchMediumCacheTtlSeconds
    };
  }

  return {
    minutesUntilKickoff,
    lineupsTtlSeconds: env.prematchFastCacheTtlSeconds,
    injuriesTtlSeconds: env.prematchFastCacheTtlSeconds
  };
}

function getKickoffTimestamp(fixture) {
  return Number(fixture?.fixture?.timestamp ?? 0);
}

function getLeagueContextStatusRank(status) {
  switch (status?.phase) {
    case "live":
      return 0;
    case "upcoming":
      return 1;
    case "finished":
      return 2;
    default:
      return 3;
  }
}

function formatLeagueContextFixture(fixture, trackedFixtureTimestamp, sameWindowSeconds) {
  const fixtureId = fixture?.fixture?.id ?? null;
  const startsAt = fixture?.fixture?.date ?? "";
  const timestamp = getKickoffTimestamp(fixture);
  const status = getMatchStatus(fixture);
  const teams = extractTeams(fixture);
  const score = {
    home: Number(fixture?.goals?.home ?? 0),
    away: Number(fixture?.goals?.away ?? 0)
  };
  const isSameKickoffWindow =
    Boolean(trackedFixtureTimestamp) &&
    Boolean(timestamp) &&
    Math.abs(timestamp - trackedFixtureTimestamp) <= sameWindowSeconds;

  return {
    fixtureId,
    startsAt,
    timestamp,
    status,
    teams,
    score,
    isSameKickoffWindow
  };
}

function sortLeagueContextFixtures(fixtures, trackedFixtureTimestamp) {
  return [...fixtures].sort((left, right) => {
    const statusRank = getLeagueContextStatusRank(left.status) - getLeagueContextStatusRank(right.status);

    if (statusRank !== 0) {
      return statusRank;
    }

    const kickoffDistanceLeft = Math.abs((left.timestamp || 0) - (trackedFixtureTimestamp || 0));
    const kickoffDistanceRight = Math.abs((right.timestamp || 0) - (trackedFixtureTimestamp || 0));

    if (kickoffDistanceLeft !== kickoffDistanceRight) {
      return kickoffDistanceLeft - kickoffDistanceRight;
    }

    return `${left.teams.home.name} ${left.teams.away.name}`.localeCompare(
      `${right.teams.home.name} ${right.teams.away.name}`
    );
  });
}

function buildLeagueContextSummary({
  fixtures,
  trackedFixtureId,
  trackedFixtureTimestamp,
  maxFixtures,
  sameWindowMinutes,
  round
}) {
  const otherFixtures = fixtures
    .filter((fixture) => fixture?.fixture?.id !== trackedFixtureId)
    .map((fixture) =>
      formatLeagueContextFixture(fixture, trackedFixtureTimestamp, sameWindowMinutes * 60)
    );

  const sortedFixtures = sortLeagueContextFixtures(otherFixtures, trackedFixtureTimestamp);

  let selectedFixtures = sortedFixtures;
  let selectionMode = "all";

  if (sortedFixtures.length > maxFixtures) {
    const sameWindowFixtures = sortedFixtures.filter((fixture) => fixture.isSameKickoffWindow);

    if (sameWindowFixtures.length > 0) {
      selectedFixtures = sameWindowFixtures.slice(0, maxFixtures);
      selectionMode = "same-window";
    } else {
      selectedFixtures = sortedFixtures.slice(0, maxFixtures);
      selectionMode = "closest";
    }
  }

  return {
    available: selectedFixtures.length > 0,
    round: round ?? "",
    selectionMode,
    totalFixtures: otherFixtures.length,
    displayedFixtures: selectedFixtures.length,
    limited: otherFixtures.length > selectedFixtures.length,
    fixtures: selectedFixtures
  };
}

function buildTeamPositionSummary(teamPosition, projectedPosition = null) {
  if (!teamPosition) {
    return null;
  }

  return {
    ...teamPosition,
    projectedPosition: projectedPosition?.position ?? teamPosition.position,
    projectedGroup: projectedPosition?.group ?? teamPosition.group,
    projectedMovement:
      teamPosition.position && projectedPosition?.position
        ? teamPosition.position - projectedPosition.position
        : 0
  };
}

function findProjectedTeamPosition(groupTable, teamPosition) {
  if (!groupTable || !teamPosition?.teamId) {
    return null;
  }

  const row = groupTable.find((entry) => entry.teamId === teamPosition.teamId);

  if (!row) {
    return null;
  }

  return {
    group: teamPosition.group,
    position: row.liveRank || row.rank,
    teamId: row.teamId,
    teamName: row.name
  };
}

function buildGroupProjection(competitionFormat, roundFixtures) {
  if (!competitionFormat?.teamPositions || !Array.isArray(roundFixtures) || !roundFixtures.length) {
    return null;
  }

  const relevantGroups = new Map();

  for (const teamPosition of Object.values(competitionFormat.teamPositions)) {
    if (!teamPosition?.group) {
      continue;
    }

    const groupDefinition = competitionFormat.groups.find((group) => group.name === teamPosition.group);

    if (!groupDefinition) {
      continue;
    }

    relevantGroups.set(
      groupDefinition.name,
      groupDefinition.table.map((entry) => ({
        ...entry
      }))
    );
  }

  if (!relevantGroups.size) {
    return null;
  }

  const liveFixtures = roundFixtures.filter((fixture) => getMatchStatus(fixture).phase === "live");

  for (const liveFixture of liveFixtures) {
    for (const [groupName, table] of relevantGroups.entries()) {
      const updatedTable = simulateTableSubset(table, liveFixture, {
        applyResult: true
      });
      relevantGroups.set(groupName, updatedTable);
    }
  }

  return {
    home: buildTeamPositionSummary(
      competitionFormat.teamPositions.home,
      findProjectedTeamPosition(
        relevantGroups.get(competitionFormat.teamPositions.home?.group),
        competitionFormat.teamPositions.home
      )
    ),
    away: buildTeamPositionSummary(
      competitionFormat.teamPositions.away,
      findProjectedTeamPosition(
        relevantGroups.get(competitionFormat.teamPositions.away?.group),
        competitionFormat.teamPositions.away
      )
    )
  };
}

function parseStatisticValue(value) {
  if (typeof value === "string" && value.endsWith("%")) {
    return Number(value.replace("%", ""));
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getStatisticValue(teamStatistics, type) {
  const stat = teamStatistics?.statistics?.find((entry) => entry.type === type);
  return parseStatisticValue(stat?.value);
}

function buildStatisticsInsights(home, away, teams) {
  const insights = [];
  const shotsOnTargetDiff = (home.shotsOnTarget ?? 0) - (away.shotsOnTarget ?? 0);
  const totalShotsDiff = (home.totalShots ?? 0) - (away.totalShots ?? 0);
  const possessionDiff = (home.possession ?? 50) - (away.possession ?? 50);
  const cornersDiff = (home.corners ?? 0) - (away.corners ?? 0);
  const redCardsDiff = (home.redCards ?? 0) - (away.redCards ?? 0);

  if (shotsOnTargetDiff >= 3 || totalShotsDiff >= 6) {
    insights.push(`${teams.home.name} is creating the better chances`);
  } else if (shotsOnTargetDiff <= -3 || totalShotsDiff <= -6) {
    insights.push(`${teams.away.name} is creating the better chances`);
  }

  if (possessionDiff >= 12 && cornersDiff >= 3) {
    insights.push(`${teams.home.name} is pinning the other side back`);
  } else if (possessionDiff <= -12 && cornersDiff <= -3) {
    insights.push(`${teams.away.name} is pinning the other side back`);
  }

  if (redCardsDiff < 0) {
    insights.push(`${teams.home.name} has the extra player`);
  } else if (redCardsDiff > 0) {
    insights.push(`${teams.away.name} has the extra player`);
  }

  return [...new Set(insights)].slice(0, 2);
}

function buildStatisticsSummary(statistics, teams, fallbackMomentum) {
  const homeStats = statistics.find((entry) => entry.team?.id === teams.home.id);
  const awayStats = statistics.find((entry) => entry.team?.id === teams.away.id);

  if (!homeStats || !awayStats) {
    return {
      available: false,
      home: null,
      away: null,
      momentum: fallbackMomentum,
      insights: []
    };
  }

  const home = {
    possession: getStatisticValue(homeStats, "Ball Possession"),
    shotsOnTarget: getStatisticValue(homeStats, "Shots on Goal"),
    totalShots: getStatisticValue(homeStats, "Total Shots"),
    corners: getStatisticValue(homeStats, "Corner Kicks"),
    yellowCards: getStatisticValue(homeStats, "Yellow Cards"),
    redCards: getStatisticValue(homeStats, "Red Cards")
  };

  const away = {
    possession: getStatisticValue(awayStats, "Ball Possession"),
    shotsOnTarget: getStatisticValue(awayStats, "Shots on Goal"),
    totalShots: getStatisticValue(awayStats, "Total Shots"),
    corners: getStatisticValue(awayStats, "Corner Kicks"),
    yellowCards: getStatisticValue(awayStats, "Yellow Cards"),
    redCards: getStatisticValue(awayStats, "Red Cards")
  };

  const possessionDiff = (home.possession ?? 50) - (away.possession ?? 50);
  const shotsOnTargetDiff = (home.shotsOnTarget ?? 0) - (away.shotsOnTarget ?? 0);
  const totalShotsDiff = (home.totalShots ?? 0) - (away.totalShots ?? 0);
  const cornersDiff = (home.corners ?? 0) - (away.corners ?? 0);

  let homeMomentum =
    50 +
    possessionDiff * 0.45 +
    shotsOnTargetDiff * 7 +
    totalShotsDiff * 1.8 +
    cornersDiff * 1.5;

  homeMomentum = Math.max(10, Math.min(90, Math.round(homeMomentum)));

  return {
    available: true,
    home,
    away,
    insights: buildStatisticsInsights(home, away, teams),
    momentum: {
      home: homeMomentum,
      away: 100 - homeMomentum
    }
  };
}

function buildLineupsSummary(lineups, teams) {
  const homeLineup = lineups.find((entry) => entry.team?.id === teams.home.id);
  const awayLineup = lineups.find((entry) => entry.team?.id === teams.away.id);
  const available = Boolean(homeLineup || awayLineup);

  return {
    available,
    home: homeLineup
      ? {
          formation: homeLineup.formation ?? "",
          coach: homeLineup.coach?.name ?? "",
          colors: {
            playerPrimary: homeLineup.team?.colors?.player?.primary ?? "",
            goalkeeperPrimary: homeLineup.team?.colors?.goalkeeper?.primary ?? ""
          },
          startXI: (homeLineup.startXI ?? []).slice(0, 11).map((entry) => ({
            name: entry.player?.name ?? "",
            position: entry.player?.pos ?? "",
            grid: entry.player?.grid ?? ""
          })),
          substitutes: (homeLineup.substitutes ?? []).slice(0, 7).map((entry) => entry.player?.name ?? "")
        }
      : null,
    away: awayLineup
      ? {
          formation: awayLineup.formation ?? "",
          coach: awayLineup.coach?.name ?? "",
          colors: {
            playerPrimary: awayLineup.team?.colors?.player?.primary ?? "",
            goalkeeperPrimary: awayLineup.team?.colors?.goalkeeper?.primary ?? ""
          },
          startXI: (awayLineup.startXI ?? []).slice(0, 11).map((entry) => ({
            name: entry.player?.name ?? "",
            position: entry.player?.pos ?? "",
            grid: entry.player?.grid ?? ""
          })),
          substitutes: (awayLineup.substitutes ?? []).slice(0, 7).map((entry) => entry.player?.name ?? "")
        }
      : null
  };
}

function buildInjuriesSummary(injuries, teams) {
  const mapInjuries = (teamId) =>
    injuries
      .filter((entry) => entry.team?.id === teamId)
      .slice(0, 4)
      .map((entry) => ({
        player: entry.player?.name ?? "",
        type: entry.player?.type ?? "",
        reason: entry.player?.reason ?? ""
      }));

  const home = mapInjuries(teams.home.id);
  const away = mapInjuries(teams.away.id);

  return {
    available: home.length > 0 || away.length > 0,
    home,
    away
  };
}

function buildPrematchSummary(status, teams, lineups, injuries) {
  if (status.phase !== "upcoming") {
    return null;
  }

  const items = [];

  if (lineups.available && lineups.home?.formation && lineups.away?.formation) {
    items.push(
      `${teams.home.name} ${lineups.home.formation} vs ${teams.away.name} ${lineups.away.formation}`
    );
  } else {
    items.push("Lineups expected closer to kickoff");
  }

  if (injuries.available) {
    items.push(
      `${teams.home.shortName} injuries: ${injuries.home.length} · ${teams.away.shortName} injuries: ${injuries.away.length}`
    );
  } else {
    items.push("No injury reports surfaced for this fixture");
  }

  return {
    available: true,
    items,
    lineups,
    injuries,
    prediction: null
  };
}

function buildPredictionSummary(predictionPayload, teams) {
  const prediction = predictionPayload?.predictions ?? {};
  const winner = prediction?.winner ?? {};
  const goals = prediction?.goals ?? {};
  const comparison = predictionPayload?.comparison ?? {};
  const winnerName = winner?.name ?? "";
  const winnerTeamId = Number(winner?.id ?? 0) || null;
  const canWinOrDraw = Boolean(prediction?.win_or_draw);
  const underOver = prediction?.under_over ?? "";
  const advice = prediction?.advice ?? "";

  const comparisonKeys = ["form", "att", "def", "poisson_distribution", "h2h"];
  const comparisonSummary = comparisonKeys
    .map((key) => {
      const entry = comparison?.[key];

      if (!entry || (entry.home == null && entry.away == null)) {
        return null;
      }

      return {
        key,
        home: entry.home ?? "",
        away: entry.away ?? ""
      };
    })
    .filter(Boolean)
    .slice(0, 3);

  return {
    available: Boolean(winnerName || underOver || advice || comparisonSummary.length),
    winnerTeamId,
    winnerName,
    winOrDraw: canWinOrDraw,
    winnerComment: winner?.comment ?? "",
    underOver,
    goals: {
      home: goals?.home ?? "",
      away: goals?.away ?? ""
    },
    advice,
    comparison: comparisonSummary,
    teams: {
      home: teams.home.name,
      away: teams.away.name
    }
  };
}

function buildPenaltyShootoutContext(status, fixture, events, teams) {
  const shootoutEvents = events.filter(isPenaltyShootoutEvent);
  const homePenaltyScoreFromFixture = parseNullableScoreValue(fixture?.score?.penalty?.home);
  const awayPenaltyScoreFromFixture = parseNullableScoreValue(fixture?.score?.penalty?.away);
  const homePenaltyScoreFromEvents = shootoutEvents.filter(
    (event) => event.team?.id === teams.home.id && event.detail === "Penalty"
  ).length;
  const awayPenaltyScoreFromEvents = shootoutEvents.filter(
    (event) => event.team?.id === teams.away.id && event.detail === "Penalty"
  ).length;
  const homePenaltyScore =
    homePenaltyScoreFromFixture ?? (shootoutEvents.length ? homePenaltyScoreFromEvents : null);
  const awayPenaltyScore =
    awayPenaltyScoreFromFixture ?? (shootoutEvents.length ? awayPenaltyScoreFromEvents : null);

  if (
    status.short !== "PEN" &&
    status.short !== "P" &&
    homePenaltyScore == null &&
    awayPenaltyScore == null &&
    !shootoutEvents.length
  ) {
    return null;
  }

  const latestKick = shootoutEvents.at(-1) ?? null;
  const homeTaken = shootoutEvents.filter((event) => event.team?.id === teams.home.id).length;
  const awayTaken = shootoutEvents.filter((event) => event.team?.id === teams.away.id).length;
  const winnerTeam =
    fixture?.teams?.home?.winner === true
      ? teams.home.name
      : fixture?.teams?.away?.winner === true
      ? teams.away.name
      : homePenaltyScore != null && awayPenaltyScore != null
      ? homePenaltyScore > awayPenaltyScore
        ? teams.home.name
        : awayPenaltyScore > homePenaltyScore
        ? teams.away.name
        : ""
      : "";

  const nextKickTeam =
    status.short === "PEN"
      ? null
      : homeTaken <= awayTaken
      ? {
          name: teams.home.name,
          id: teams.home.id,
          side: "home"
        }
      : {
          name: teams.away.name,
          id: teams.away.id,
          side: "away"
        };

  const pressure = nextKickTeam
    ? buildPenaltyShootoutPressure({
        homeScore: homePenaltyScore ?? 0,
        awayScore: awayPenaltyScore ?? 0,
        homeTaken,
        awayTaken,
        nextKickTeam,
        teams
      })
    : null;

  return {
    available: true,
    phase: status.short === "PEN" ? "finished" : "live",
    home: homePenaltyScore,
    away: awayPenaltyScore,
    homeTaken,
    awayTaken,
    winnerTeam,
    nextKickTeam,
    pressure,
    latestKick: latestKick
      ? {
          teamName: latestKick.team?.name ?? "",
          playerName: latestKick.player?.name ?? "",
          scored: latestKick.detail === "Penalty"
        }
      : null
  };
}

function isPenaltyShootoutDecided(homeScore, awayScore, homeTaken, awayTaken) {
  const homeRemaining = Math.max(0, 5 - homeTaken);
  const awayRemaining = Math.max(0, 5 - awayTaken);

  if (homeScore > awayScore + awayRemaining || awayScore > homeScore + homeRemaining) {
    return true;
  }

  if (homeTaken >= 5 && awayTaken >= 5 && homeTaken === awayTaken && homeScore !== awayScore) {
    return true;
  }

  return false;
}

function buildPenaltyShootoutPressure({
  homeScore,
  awayScore,
  homeTaken,
  awayTaken,
  nextKickTeam,
  teams
}) {
  const afterMiss =
    nextKickTeam.side === "home"
      ? {
          homeScore,
          awayScore,
          homeTaken: homeTaken + 1,
          awayTaken
        }
      : {
          homeScore,
          awayScore,
          homeTaken,
          awayTaken: awayTaken + 1
        };

  if (
    isPenaltyShootoutDecided(
      afterMiss.homeScore,
      afterMiss.awayScore,
      afterMiss.homeTaken,
      afterMiss.awayTaken
    )
  ) {
    return {
      type: "must_score",
      teamName: nextKickTeam.name
    };
  }

  const afterScore =
    nextKickTeam.side === "home"
      ? {
          homeScore: homeScore + 1,
          awayScore,
          homeTaken: homeTaken + 1,
          awayTaken
        }
      : {
          homeScore,
          awayScore: awayScore + 1,
          homeTaken,
          awayTaken: awayTaken + 1
        };

  if (
    isPenaltyShootoutDecided(
      afterScore.homeScore,
      afterScore.awayScore,
      afterScore.homeTaken,
      afterScore.awayTaken
    )
  ) {
    return {
      type: "score_to_win",
      teamName: nextKickTeam.name
    };
  }

  return null;
}

function normalizeGoalType(detail) {
  switch (detail) {
    case "Normal Goal":
      return "Goal";
    case "Penalty":
      return "Penalty goal";
    case "Own Goal":
      return "Own goal";
    case "Missed Penalty":
      return "Missed penalty";
    default:
      return detail || "Goal";
  }
}

function extractLatestGoalEvent(events, scoreEvent) {
  if (scoreEvent.type !== "GOAL") {
    return null;
  }

  const goalEvent = [...events]
    .reverse()
    .find((event) => event.type === "Goal" && event.team?.id === scoreEvent.teamId);

  if (!goalEvent) {
    return null;
  }

  return {
    minute: goalEvent.time?.elapsed ?? 0,
    minuteLabel: formatEventMinute(goalEvent.time),
    teamId: goalEvent.team?.id ?? null,
    teamName: goalEvent.team?.name ?? "",
    scorer: goalEvent.player?.name ?? "",
    assist: goalEvent.assist?.name ?? "",
    detail: goalEvent.detail ?? "",
    typeLabel: normalizeGoalType(goalEvent.detail)
  };
}

function enrichScoreEvent(scoreEvent, latestGoalEvent) {
  if (scoreEvent.type !== "GOAL" || !latestGoalEvent) {
    return scoreEvent;
  }

  const scorerText = latestGoalEvent.scorer || scoreEvent.teamName;
  const assistText = latestGoalEvent.assist ? `, assist ${latestGoalEvent.assist}` : "";
  const minuteText = latestGoalEvent.minuteLabel ? ` ${latestGoalEvent.minuteLabel}` : "";

  return {
    ...scoreEvent,
    minute: latestGoalEvent.minute,
    minuteLabel: latestGoalEvent.minuteLabel,
    scorer: latestGoalEvent.scorer,
    assist: latestGoalEvent.assist,
    detail: latestGoalEvent.detail,
    typeLabel: latestGoalEvent.typeLabel,
    message: `${latestGoalEvent.typeLabel}: ${scorerText}${assistText}${minuteText}`
  };
}

function buildScoreOnlyImpact(status, fixture, teams) {
  const score = {
    home: Number(fixture?.goals?.home ?? 0),
    away: Number(fixture?.goals?.away ?? 0)
  };
  const isUpcoming = status.phase === "upcoming";

  return {
    summary: isUpcoming
      ? "Pre-match only - live table impact starts at kickoff"
      : `${teams.home.name} ${score.home}-${score.away} ${teams.away.name}`,
    table: null,
    competition: isUpcoming
      ? ["Live table impact will start once the match kicks off."]
      : ["Live score only - no table impact for this competition."],
    biggestMovement: null,
    momentum: {
      home: score.home === score.away ? 50 : score.home > score.away ? 65 : 35,
      away: score.home === score.away ? 50 : score.away > score.home ? 65 : 35
    },
    mode: "score-only"
  };
}

function buildLimitedCompetitionImpact(status, fixture, teams, competitionFormat) {
  const score = {
    home: Number(fixture?.goals?.home ?? 0),
    away: Number(fixture?.goals?.away ?? 0)
  };
  const format = competitionFormat?.format ?? "unknown";
  const isGrouped = format === "grouped_cross_play" || format === "grouped_same_group";

  return {
    summary: "Special competition format - table impact limited",
    table: null,
    competition: [
      isGrouped
        ? "Cross-group fixtures limit live table impact for this fixture."
        : "Live score tracked - table impact limited for this fixture."
    ],
    biggestMovement: null,
    momentum: {
      home: score.home === score.away ? 50 : score.home > score.away ? 65 : 35,
      away: score.home === score.away ? 50 : score.away > score.home ? 65 : 35
    },
    mode: "limited"
  };
}

function isCoverageAvailable(value) {
  return value !== false;
}

function isKnockoutRoundLabel(round) {
  const normalizedRound = String(round ?? "").trim().toLowerCase();

  if (!normalizedRound) {
    return false;
  }

  if (normalizedRound.includes("group") || normalizedRound.includes("grupos")) {
    return false;
  }

  return /(round of|quarter|semi|final|play-?off|knockout|oitavas|quartas|semifinal|semi-final|1\/8|1\/4|1\/2)/i.test(
    normalizedRound
  );
}

function shouldUseKnockoutImpact(fixture, competitionFormat) {
  const routing = competitionFormat?.registry?.routing ?? "";
  const round = fixture?.league?.round ?? "";

  if (routing === "knockout_cup") {
    return true;
  }

  if (
    routing === "hybrid_group_knockout" ||
    routing === "hybrid_single_table_knockout" ||
    routing === "hybrid_groups_knockout_special"
  ) {
    return isKnockoutRoundLabel(round);
  }

  return isKnockoutRoundLabel(round) && competitionFormat?.impactMode !== "limited";
}

function haveSameTeamPair(leftFixture, rightFixture) {
  const leftTeamIds = [leftFixture?.teams?.home?.id, leftFixture?.teams?.away?.id]
    .filter(Boolean)
    .sort((a, b) => a - b);
  const rightTeamIds = [rightFixture?.teams?.home?.id, rightFixture?.teams?.away?.id]
    .filter(Boolean)
    .sort((a, b) => a - b);

  if (leftTeamIds.length !== 2 || rightTeamIds.length !== 2) {
    return false;
  }

  return leftTeamIds[0] === rightTeamIds[0] && leftTeamIds[1] === rightTeamIds[1];
}

function findPairedLegFixture(fixture, roundFixtures) {
  if (!Array.isArray(roundFixtures) || !roundFixtures.length) {
    return null;
  }

  const currentFixtureId = fixture?.fixture?.id ?? null;
  const currentTimestamp = getKickoffTimestamp(fixture);

  const candidates = roundFixtures
    .filter((candidate) => candidate?.fixture?.id && candidate.fixture.id !== currentFixtureId)
    .filter((candidate) => haveSameTeamPair(fixture, candidate))
    .sort((left, right) => {
      const leftDistance = Math.abs(getKickoffTimestamp(left) - currentTimestamp);
      const rightDistance = Math.abs(getKickoffTimestamp(right) - currentTimestamp);
      return leftDistance - rightDistance;
    });

  return candidates[0] ?? null;
}

function getGoalsForTeamInFixture(fixture, teamId) {
  if (!fixture || !teamId) {
    return 0;
  }

  if (fixture?.teams?.home?.id === teamId) {
    return Number(fixture?.goals?.home ?? 0);
  }

  if (fixture?.teams?.away?.id === teamId) {
    return Number(fixture?.goals?.away ?? 0);
  }

  return 0;
}

function buildCupMomentumFromScore(score) {
  return {
    home: score.home === score.away ? 50 : score.home > score.away ? 65 : 35,
    away: score.home === score.away ? 50 : score.away > score.home ? 65 : 35
  };
}

function buildAggregatePressureLines(aggregateHome, aggregateAway, teams) {
  const goalGap = Math.abs(aggregateHome - aggregateAway);

  if (goalGap === 0) {
    return ["Next goal would put a side through"];
  }

  const trailingTeam = aggregateHome > aggregateAway ? teams.away.name : teams.home.name;

  if (goalGap === 1) {
    return [`${trailingTeam} is one goal from forcing extra time`];
  }

  return [`${trailingTeam} still needs ${goalGap} more goals to force extra time`];
}

function buildKnockoutContext(fixture, roundFixtures, competitionFormat) {
  if (!shouldUseKnockoutImpact(fixture, competitionFormat)) {
    return null;
  }

  const pairedLeg = findPairedLegFixture(fixture, roundFixtures);
  const currentTimestamp = getKickoffTimestamp(fixture);
  const pairedTimestamp = getKickoffTimestamp(pairedLeg);

  if (!pairedLeg) {
    return {
      type: "single_leg_knockout",
      pairedFixtureId: null,
      pairedFixtureStatus: null,
      round: fixture?.league?.round ?? ""
    };
  }

  if (currentTimestamp && pairedTimestamp && currentTimestamp < pairedTimestamp) {
    return {
      type: "two_leg_first_leg",
      pairedFixtureId: pairedLeg?.fixture?.id ?? null,
      pairedFixtureStatus: getMatchStatus(pairedLeg),
      round: fixture?.league?.round ?? ""
    };
  }

  return {
    type: "two_leg_aggregate",
    pairedFixtureId: pairedLeg?.fixture?.id ?? null,
    pairedFixtureStatus: getMatchStatus(pairedLeg),
    pairedLeg,
    round: fixture?.league?.round ?? ""
  };
}

function buildCupImpact(status, fixture, teams, knockoutContext, penaltyContext = null) {
  const score = {
    home: Number(fixture?.goals?.home ?? 0),
    away: Number(fixture?.goals?.away ?? 0)
  };
  const baseImpact = {
    table: null,
    biggestMovement: null,
    momentum: buildCupMomentumFromScore(score),
    mode: "cup"
  };

  if (penaltyContext?.available) {
    const shootoutLine =
      penaltyContext.home != null && penaltyContext.away != null
        ? `${teams.home.name} ${penaltyContext.home}-${penaltyContext.away} ${teams.away.name} on penalties`
        : "";
    const latestKickActor =
      penaltyContext.latestKick?.playerName || penaltyContext.latestKick?.teamName || "";

    if (penaltyContext.phase === "finished") {
      return {
        ...baseImpact,
        summary: penaltyContext.winnerTeam
          ? `${penaltyContext.winnerTeam} wins on penalties`
          : "Penalty shootout decided the tie",
        competition: [
          shootoutLine,
          penaltyContext.winnerTeam ? `${penaltyContext.winnerTeam} wins on penalties` : ""
        ].filter(Boolean)
      };
    }

    return {
      ...baseImpact,
      summary:
        penaltyContext.home != null && penaltyContext.away != null
          ? `Penalty shootout: ${penaltyContext.home}-${penaltyContext.away}`
          : "Penalty shootout in progress",
      competition: [
        shootoutLine,
        "Penalty shootout in progress",
        penaltyContext.pressure?.type === "must_score"
          ? `${penaltyContext.pressure.teamName} must score to stay alive`
          : penaltyContext.pressure?.type === "score_to_win"
          ? `${penaltyContext.pressure.teamName} scores the next penalty to win`
          : "",
        latestKickActor
          ? penaltyContext.latestKick?.scored
            ? `${latestKickActor} scores in the shootout`
            : `${latestKickActor} misses in the shootout`
          : ""
      ].filter(Boolean)
    };
  }

  if (!knockoutContext || knockoutContext.type === "single_leg_knockout") {
    const isLevel = score.home === score.away;
    const leadingTeam = score.home > score.away ? teams.home.name : teams.away.name;
    const trailingTeam = score.home > score.away ? teams.away.name : teams.home.name;

    return {
      ...baseImpact,
      summary: isLevel ? "This tie is currently heading to penalties" : `${leadingTeam} is currently going through`,
      competition: isLevel
        ? ["Winner advances from this tie.", "Level score would send this tie to penalties."]
        : ["Winner advances from this tie.", `${trailingTeam} needs one goal to level the tie.`]
    };
  }

  if (knockoutContext.type === "two_leg_first_leg") {
    const isLevel = score.home === score.away;
    const leadingTeam = score.home > score.away ? teams.home.name : teams.away.name;

    return {
      ...baseImpact,
      summary: isLevel ? "The tie is level heading into the return leg" : `${leadingTeam} takes a first-leg advantage`,
      competition: isLevel
        ? ["This is the first leg of a two-leg tie.", "The tie is level heading into the return leg."]
        : ["This is the first leg of a two-leg tie.", `${leadingTeam} takes a first-leg advantage`]
    };
  }

  const pairedLeg = knockoutContext.pairedLeg;
  const aggregateHome =
    score.home + getGoalsForTeamInFixture(pairedLeg, fixture?.teams?.home?.id);
  const aggregateAway =
    score.away + getGoalsForTeamInFixture(pairedLeg, fixture?.teams?.away?.id);
  const isAggregateLevel = aggregateHome === aggregateAway;
  const leadingTeam = aggregateHome > aggregateAway ? teams.home.name : teams.away.name;
  const pressureLines = buildAggregatePressureLines(aggregateHome, aggregateAway, teams);

  return {
    ...baseImpact,
    summary: isAggregateLevel ? "Next goal would put a side through" : `${leadingTeam} is currently going through`,
    competition: [
      `${teams.home.name} ${aggregateHome}-${aggregateAway} ${teams.away.name} on aggregate`,
      isAggregateLevel ? "Aggregate score is level" : `${leadingTeam} is currently going through`,
      ...pressureLines
    ].filter(Boolean)
  };
}

export class MatchImpactService {
  constructor({ apiFootballClient, cacheService, analyticsService, env }) {
    this.apiFootballClient = apiFootballClient;
    this.cacheService = cacheService;
    this.analyticsService = analyticsService;
    this.env = env;
    this.pendingRequests = new Map();
    this.resourcePendingRequests = new Map();
  }

  async getMatchImpact(fixtureId) {
    const cacheKey = buildCacheKey(fixtureId);
    const cachedValue = await this.cacheService.getJson(cacheKey);

    if (cachedValue) {
      return cachedValue;
    }

    if (this.pendingRequests.has(fixtureId)) {
      return this.pendingRequests.get(fixtureId);
    }

    const requestPromise = this.refreshMatchImpact(fixtureId).finally(() => {
      this.pendingRequests.delete(fixtureId);
    });

    this.pendingRequests.set(fixtureId, requestPromise);
    return requestPromise;
  }

  async refreshMatchImpact(fixtureId) {
    const cacheKey = buildCacheKey(fixtureId);
    const stateKey = buildStateKey(fixtureId);
    const previousState = (await this.cacheService.getJson(stateKey)) ?? {};
    const fixture = await this.apiFootballClient.getFixture(fixtureId);
    const status = getMatchStatus(fixture);
    const teams = extractTeams(fixture);
    const score = buildScoreSnapshot(fixture);
    const baseEvent = detectScoreEvent(previousState.previousScore, score, teams);
    const prematchCadence = getPrematchCadence(fixture, this.env);
    const leagueCoverage = await this.getLeagueCoverageResource(fixture);
    const [events, standings, statistics, lineups, injuries, predictions, roundFixtures] = await Promise.all([
      this.getEventsResource({
        fixtureId,
        status,
        scoreEvent: baseEvent,
        leagueCoverage
      }),
      this.getStandingsResource(fixture, leagueCoverage),
      this.getStatisticsResource(fixtureId, status, leagueCoverage),
      this.getLineupsResource(fixtureId, status, prematchCadence, leagueCoverage),
      this.getInjuriesResource(fixtureId, status, prematchCadence, leagueCoverage),
      this.getPredictionsResource(fixtureId, status, leagueCoverage),
      this.getLeagueRoundFixturesResource(fixture, status).catch(() => [])
    ]);
    const competitionFormat = classifyCompetitionFormat({
      fixture,
      standingsPayload: standings
    });
    const knockoutContext = buildKnockoutContext(fixture, roundFixtures, competitionFormat);
    const groupProjection = buildGroupProjection(competitionFormat, roundFixtures);
    const leagueContext = buildLeagueContextSummary({
      fixtures: roundFixtures,
      trackedFixtureId: fixture?.fixture?.id,
      trackedFixtureTimestamp: getKickoffTimestamp(fixture),
      maxFixtures: this.env.leagueContextMaxFixtures,
      sameWindowMinutes: this.env.leagueContextSameWindowMinutes,
      round: fixture?.league?.round
    });
    const hasTableImpact =
      !knockoutContext &&
      status.phase !== "upcoming" &&
      (competitionFormat.impactMode === "full" || competitionFormat.impactMode === "group");
    const latestGoalEvent = extractLatestGoalEvent(events, baseEvent);
    const event = enrichScoreEvent(baseEvent, latestGoalEvent);
    const penaltyContext = buildPenaltyShootoutContext(status, fixture, events, teams);
    const lineupsSummary = buildLineupsSummary(lineups, teams);
    const injuriesSummary = buildInjuriesSummary(injuries, teams);
    const prematch = buildPrematchSummary(status, teams, lineupsSummary, injuriesSummary);
    const predictionSummary = buildPredictionSummary(predictions, teams);

    if (prematch) {
      prematch.prediction = predictionSummary;
    }

    if (!hasTableImpact) {
      const impact = knockoutContext
        ? buildCupImpact(status, fixture, teams, knockoutContext, penaltyContext)
        : competitionFormat.impactMode === "limited"
          ? buildLimitedCompetitionImpact(status, fixture, teams, competitionFormat)
          : buildScoreOnlyImpact(status, fixture, teams);
      const statisticsSummary = buildStatisticsSummary(statistics, teams, impact.momentum);
      impact.momentum = statisticsSummary.momentum;

      if (event.type === "GOAL") {
        event.impactSummary =
          knockoutContext
            ? impact.summary
            : competitionFormat.impactMode === "limited"
            ? "Goal changes the score. Table impact is limited for this fixture."
            : "Goal changes the score. Table impact is unavailable.";
      }

      const payload = {
        fixture_id: fixtureId,
        last_updated: new Date().toISOString(),
        startsAt: fixture?.fixture?.date ?? "",
        timestamp: fixture?.fixture?.timestamp ?? null,
        status,
        score,
        teams,
        league: {
          id: fixture?.league?.id ?? null,
          name: fixture?.league?.name ?? "",
          country: fixture?.league?.country ?? "",
          season: fixture?.league?.season ?? null,
          standings: fixture?.league?.standings === true,
          logo: fixture?.league?.logo ?? "",
          flag: fixture?.league?.flag ?? ""
        },
        event,
        impact,
        statistics: statisticsSummary,
        prematch,
        league_context: leagueContext,
        standings_snapshot: {
          before: [],
          after: []
        },
        recent_events: buildRecentEvents(events),
        metadata: {
          cacheTtlSeconds: getCacheTtl(status, this.env),
          impactBasis:
            knockoutContext
              ? "knockout-tie"
              : status.phase === "upcoming"
              ? "prematch-no-table-impact"
              : competitionFormat.impactMode === "limited"
              ? "special-competition-format"
              : "no-standings-coverage",
          tableImpactAvailable: false,
          prematchCadence,
          competitionFormat: competitionFormat.format,
          impactMode: impact.mode,
          groupLabel: competitionFormat.selectedGroup?.name ?? "",
          teamGroupPositions: competitionFormat.teamPositions ?? null,
          projectedTeamGroupPositions: groupProjection,
          knockoutContext,
          penaltyContext,
          leagueCoverage
        }
      };

      await Promise.all([
        this.cacheService.setJson(cacheKey, payload, getCacheTtl(status, this.env)),
        this.cacheService.setJson(
          stateKey,
          {
            previousScore: score,
            lastStatus: status
          },
          Math.max(this.env.stateCacheTtlSeconds, this.env.finishedCacheTtlSeconds)
        )
      ]);

      return payload;
    }

    const officialTable = competitionFormat.selectedGroup?.table ?? [];
    const canUseSavedBaseline =
      Array.isArray(previousState.baselineStandings) && previousState.baselineStandings.length > 0;
    const baselineStandings = canUseSavedBaseline ? previousState.baselineStandings : officialTable;
    const applyResult = status.phase !== "upcoming";
    const simulatedTable = simulateTable(baselineStandings, fixture, {
      applyResult
    });
    const impact = computeImpact(baselineStandings, simulatedTable, fixture, {
      zoneProfile: competitionFormat.registry?.zoneProfile ?? ""
    });
    const statisticsSummary = buildStatisticsSummary(statistics, teams, impact.momentum);
    impact.momentum = statisticsSummary.momentum;

    if (event.type === "GOAL" && impact.summary) {
      event.impactSummary = impact.summary;
    }

    const payload = {
      fixture_id: fixtureId,
      last_updated: new Date().toISOString(),
      startsAt: fixture?.fixture?.date ?? "",
      timestamp: fixture?.fixture?.timestamp ?? null,
      status,
      score,
      teams,
      league: {
        id: fixture?.league?.id ?? null,
        name: fixture?.league?.name ?? "",
        country: fixture?.league?.country ?? "",
        season: fixture?.league?.season ?? null,
        standings: true,
        logo: fixture?.league?.logo ?? "",
        flag: fixture?.league?.flag ?? ""
      },
      event,
      impact,
      statistics: statisticsSummary,
      prematch,
      league_context: leagueContext,
      standings_snapshot: {
        before: serializeTable(baselineStandings),
        after: serializeTable(simulatedTable)
      },
      recent_events: buildRecentEvents(events),
      metadata: {
        cacheTtlSeconds: getCacheTtl(status, this.env),
        impactBasis:
          canUseSavedBaseline || status.phase !== "finished"
            ? "baseline-standings"
            : "estimated-from-current-standings",
        tableImpactAvailable: true,
        prematchCadence,
        competitionFormat: competitionFormat.format,
        impactMode: competitionFormat.impactMode,
        groupLabel: competitionFormat.selectedGroup?.name ?? "",
        teamGroupPositions: competitionFormat.teamPositions ?? null,
        projectedTeamGroupPositions: groupProjection,
        penaltyContext,
        leagueCoverage
      }
    };

    const statePayload = {
      previousScore: score,
      baselineStandings:
        status.phase === "upcoming"
          ? officialTable
          : canUseSavedBaseline
            ? previousState.baselineStandings
            : officialTable,
      lastStatus: status
    };

    await Promise.all([
      this.cacheService.setJson(cacheKey, payload, getCacheTtl(status, this.env)),
      this.cacheService.setJson(
        stateKey,
        statePayload,
        Math.max(this.env.stateCacheTtlSeconds, this.env.finishedCacheTtlSeconds)
      )
    ]);

    return payload;
  }

  async trackUsage(payload) {
    return this.analyticsService.trackFixtureUsage(payload);
  }

  async trackSession(payload) {
    return this.analyticsService.trackSession(payload);
  }

  async getAnalyticsSummary() {
    return this.analyticsService.getSummary();
  }

  async getLeagueCoverageResource(fixture) {
    const leagueId = fixture?.league?.id;
    const season = fixture?.league?.season;

    if (!leagueId || !season || !this.apiFootballClient.getLeagueCoverage) {
      return null;
    }

    return this.getCachedResource({
      key: buildLeagueCoverageKey(leagueId, season),
      ttlSeconds: this.env.leagueCoverageCacheTtlSeconds,
      fetcher: () => this.apiFootballClient.getLeagueCoverage(leagueId, season).catch(() => null)
    });
  }

  async getStandingsResource(fixture, leagueCoverage = null) {
    const leagueId = fixture?.league?.id;
    const season = fixture?.league?.season;

    if (
      fixture?.league?.standings !== true ||
      !leagueId ||
      !season ||
      !isCoverageAvailable(leagueCoverage?.standings)
    ) {
      return null;
    }

    return this.getCachedResource({
      key: buildStandingsKey(leagueId, season),
      ttlSeconds: this.env.standingsCacheTtlSeconds,
      fetcher: () => this.apiFootballClient.getStandings(leagueId, season)
    });
  }

  async getLeagueContextResource(fixture, status) {
    const roundFixtures = await this.getLeagueRoundFixturesResource(fixture, status);

    return buildLeagueContextSummary({
      fixtures: roundFixtures,
      trackedFixtureId: fixture?.fixture?.id,
      trackedFixtureTimestamp: getKickoffTimestamp(fixture),
      maxFixtures: this.env.leagueContextMaxFixtures,
      sameWindowMinutes: this.env.leagueContextSameWindowMinutes,
      round: fixture?.league?.round
    });
  }

  async getLeagueRoundFixturesResource(fixture, status) {
    const leagueId = fixture?.league?.id;
    const season = fixture?.league?.season;
    const round = fixture?.league?.round;

    if (!leagueId || !season || !round) {
      return null;
    }

    return this.getCachedResource({
      key: buildLeagueContextKey(leagueId, season, round),
      ttlSeconds: getLeagueContextCacheTtl([status], this.env),
      fetcher: async () => {
        const fixtures = await this.apiFootballClient.getFixturesByRound(leagueId, season, round).catch(() => []);
        const roundStatuses = fixtures.map((entry) => getMatchStatus(entry));
        const ttlSeconds = getLeagueContextCacheTtl(roundStatuses, this.env);

        await this.cacheService.setJson(
          buildLeagueContextKey(leagueId, season, round),
          buildResourceEnvelope(fixtures),
          ttlSeconds
        );

        return fixtures;
      },
      skipAutomaticCacheWrite: true
    });
  }

  async getStatisticsResource(fixtureId, status, leagueCoverage = null) {
    if (
      status.phase === "upcoming" ||
      !isCoverageAvailable(leagueCoverage?.fixtures?.statisticsFixtures)
    ) {
      return [];
    }

    return this.getCachedResource({
      key: buildStatisticsKey(fixtureId),
      ttlSeconds: getStatisticsCacheTtl(status, this.env),
      fetcher: () => this.apiFootballClient.getStatistics(fixtureId).catch(() => [])
    });
  }

  async getInjuriesResource(fixtureId, status, prematchCadence, leagueCoverage = null) {
    if (!isCoverageAvailable(leagueCoverage?.injuries)) {
      return [];
    }

    const ttlSeconds =
      status.phase === "upcoming"
        ? prematchCadence?.injuriesTtlSeconds ?? this.env.injuriesCacheTtlSeconds
        : this.env.injuriesCacheTtlSeconds;

    return this.getCachedResource({
      key: buildInjuriesKey(fixtureId),
      ttlSeconds,
      fetcher: () => this.apiFootballClient.getInjuries(fixtureId).catch(() => [])
    });
  }

  async getPredictionsResource(fixtureId, status, leagueCoverage = null) {
    if (status.phase !== "upcoming" || leagueCoverage?.predictions !== true) {
      return null;
    }

    return this.getCachedResource({
      key: buildPredictionsKey(fixtureId),
      ttlSeconds: this.env.predictionsCacheTtlSeconds,
      fetcher: () => this.apiFootballClient.getPredictions(fixtureId).catch(() => null)
    });
  }

  async getLineupsResource(fixtureId, status, prematchCadence, leagueCoverage = null) {
    if (!isCoverageAvailable(leagueCoverage?.fixtures?.lineups)) {
      return [];
    }

    const cacheKey = buildLineupsKey(fixtureId);
    const cachedLineups = await this.cacheService.getJson(cacheKey);

    if (cachedLineups) {
      return cachedLineups.data ?? [];
    }

    const lineups = await this.getCachedResource({
      key: cacheKey,
      ttlSeconds: this.env.lineupsPendingCacheTtlSeconds,
      fetcher: async () => {
        const freshLineups = await this.apiFootballClient.getLineups(fixtureId).catch(() => []);
        const confirmed = isLineupsConfirmed(freshLineups);
        const pendingTtlSeconds =
          status.phase === "upcoming"
            ? prematchCadence?.lineupsTtlSeconds ?? this.env.lineupsPendingCacheTtlSeconds
            : this.env.lineupsPendingCacheTtlSeconds;

        await this.cacheService.setJson(
          cacheKey,
          buildResourceEnvelope(freshLineups, {
            confirmed
          }),
          confirmed
            ? getLineupsCacheTtl(true, status, this.env)
            : pendingTtlSeconds
        );

        return freshLineups;
      },
      skipAutomaticCacheWrite: true
    });

    return lineups;
  }

  async getEventsResource({ fixtureId, status, scoreEvent, leagueCoverage = null }) {
    if (status.phase === "upcoming" || !isCoverageAvailable(leagueCoverage?.fixtures?.events)) {
      return [];
    }

    const cacheKey = buildEventsKey(fixtureId);
    const cachedEvents = await this.cacheService.getJson(cacheKey);

    if (cachedEvents && scoreEvent.type === "NONE") {
      return cachedEvents.data ?? [];
    }

    return this.getCachedResource({
      key: cacheKey,
      ttlSeconds: getEventsCacheTtl(status, this.env),
      fetcher: () => this.apiFootballClient.getEvents(fixtureId).catch(() => []),
      forceRefresh: scoreEvent.type !== "NONE"
    });
  }

  async getCachedResource({
    key,
    ttlSeconds,
    fetcher,
    forceRefresh = false,
    skipAutomaticCacheWrite = false
  }) {
    if (!forceRefresh) {
      const cachedValue = await this.cacheService.getJson(key);

      if (cachedValue) {
        return cachedValue.data;
      }
    }

    if (this.resourcePendingRequests.has(key)) {
      return this.resourcePendingRequests.get(key);
    }

    const requestPromise = Promise.resolve()
      .then(fetcher)
      .then(async (payload) => {
        if (!skipAutomaticCacheWrite) {
          await this.cacheService.setJson(key, buildResourceEnvelope(payload), ttlSeconds);
        }

        return payload;
      })
      .finally(() => {
        this.resourcePendingRequests.delete(key);
      });

    this.resourcePendingRequests.set(key, requestPromise);
    return requestPromise;
  }
}
