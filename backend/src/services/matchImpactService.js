import { serializeTable, normalizeStandings, simulateTable } from "../utils/table.js";
import {
  computeImpact,
  detectScoreEvent,
  formatEventMinute,
  getMatchStatus
} from "../utils/impact.js";

function buildCacheKey(fixtureId) {
  return `match:${fixtureId}`;
}

function buildStateKey(fixtureId) {
  return `match:state:${fixtureId}`;
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

function buildStatisticsSummary(statistics, teams, fallbackMomentum) {
  const homeStats = statistics.find((entry) => entry.team?.id === teams.home.id);
  const awayStats = statistics.find((entry) => entry.team?.id === teams.away.id);

  if (!homeStats || !awayStats) {
    return {
      available: false,
      home: null,
      away: null,
      momentum: fallbackMomentum
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
          startXI: (homeLineup.startXI ?? []).slice(0, 11).map((entry) => entry.player?.name ?? ""),
          substitutes: (homeLineup.substitutes ?? []).slice(0, 7).map((entry) => entry.player?.name ?? "")
        }
      : null,
    away: awayLineup
      ? {
          formation: awayLineup.formation ?? "",
          coach: awayLineup.coach?.name ?? "",
          startXI: (awayLineup.startXI ?? []).slice(0, 11).map((entry) => entry.player?.name ?? ""),
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
    injuries
  };
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
      ? "Live score only - no table impact"
      : `${teams.home.name} ${score.home}-${score.away} ${teams.away.name}`,
    table: null,
    competition: [
      "Live score only - no table impact for this competition."
    ],
    biggestMovement: null,
    momentum: {
      home: score.home === score.away ? 50 : score.home > score.away ? 65 : 35,
      away: score.home === score.away ? 50 : score.away > score.home ? 65 : 35
    },
    mode: "score-only"
  };
}

export class MatchImpactService {
  constructor({ apiFootballClient, cacheService, analyticsService, env }) {
    this.apiFootballClient = apiFootballClient;
    this.cacheService = cacheService;
    this.analyticsService = analyticsService;
    this.env = env;
    this.pendingRequests = new Map();
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
    const { fixture, events, standings, statistics, lineups, injuries } =
      await this.apiFootballClient.fetchFixtureBundle(fixtureId);
    const status = getMatchStatus(fixture);
    const teams = extractTeams(fixture);
    const score = {
      home: Number(fixture?.goals?.home ?? 0),
      away: Number(fixture?.goals?.away ?? 0)
    };
    const hasStandingsCoverage = fixture?.league?.standings === true && standings;
    const baseEvent = detectScoreEvent(previousState.previousScore, score, teams);
    const latestGoalEvent = extractLatestGoalEvent(events, baseEvent);
    const event = enrichScoreEvent(baseEvent, latestGoalEvent);
    const lineupsSummary = buildLineupsSummary(lineups, teams);
    const injuriesSummary = buildInjuriesSummary(injuries, teams);
    const prematch = buildPrematchSummary(status, teams, lineupsSummary, injuriesSummary);

    if (!hasStandingsCoverage) {
      const impact = buildScoreOnlyImpact(status, fixture, teams);
      const statisticsSummary = buildStatisticsSummary(statistics, teams, impact.momentum);
      impact.momentum = statisticsSummary.momentum;

      if (event.type === "GOAL") {
        event.impactSummary = "Goal changes the score. Table impact is unavailable.";
      }

      const payload = {
        fixture_id: fixtureId,
        last_updated: new Date().toISOString(),
        status,
        score,
        teams,
        league: {
          id: fixture?.league?.id ?? null,
          name: fixture?.league?.name ?? "",
          country: fixture?.league?.country ?? "",
          season: fixture?.league?.season ?? null,
          standings: false,
          logo: fixture?.league?.logo ?? "",
          flag: fixture?.league?.flag ?? ""
        },
        event,
        impact,
        statistics: statisticsSummary,
        prematch,
        standings_snapshot: {
          before: [],
          after: []
        },
        recent_events: buildRecentEvents(events),
        metadata: {
          cacheTtlSeconds: getCacheTtl(status, this.env),
          impactBasis: "no-standings-coverage",
          tableImpactAvailable: false
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

    const officialTable = normalizeStandings(standings);
    const canUseSavedBaseline =
      Array.isArray(previousState.baselineStandings) && previousState.baselineStandings.length > 0;
    const baselineStandings = canUseSavedBaseline ? previousState.baselineStandings : officialTable;
    const applyResult = status.phase !== "upcoming";
    const simulatedTable = simulateTable(baselineStandings, fixture, {
      applyResult
    });
    const impact = computeImpact(baselineStandings, simulatedTable, fixture);
    const statisticsSummary = buildStatisticsSummary(statistics, teams, impact.momentum);
    impact.momentum = statisticsSummary.momentum;

    if (event.type === "GOAL" && impact.summary) {
      event.impactSummary = impact.summary;
    }

    const payload = {
      fixture_id: fixtureId,
      last_updated: new Date().toISOString(),
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
        tableImpactAvailable: true
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
}
