import { getMatchStatus } from "../utils/impact.js";
import { normalizeStandings, serializeTable, simulateTable } from "../utils/table.js";

const BRASILEIRAO_SERIE_A_ID = 71;
const OVERLAY_CACHE_TTL_SECONDS = 10;

function buildOverlayCacheKey(slug, season) {
  return `overlay:${slug}:${season}`;
}

function shortName(teamName) {
  const parts = String(teamName ?? "")
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length <= 1) {
    return String(teamName ?? "TBD").slice(0, 3).toUpperCase();
  }

  return parts
    .slice(0, 3)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function mapOverlayMatch(fixture) {
  const status = getMatchStatus(fixture);

  return {
    fixtureId: fixture.fixture?.id ?? null,
    startsAt: fixture.fixture?.date ?? null,
    timestamp: fixture.fixture?.timestamp ?? null,
    status,
    teams: {
      home: {
        id: fixture.teams?.home?.id ?? null,
        name: fixture.teams?.home?.name ?? "Home",
        shortName: shortName(fixture.teams?.home?.name)
      },
      away: {
        id: fixture.teams?.away?.id ?? null,
        name: fixture.teams?.away?.name ?? "Away",
        shortName: shortName(fixture.teams?.away?.name)
      }
    },
    score: {
      home: Number(fixture.goals?.home ?? 0),
      away: Number(fixture.goals?.away ?? 0)
    }
  };
}

function sortLiveFixtures(fixtures) {
  return [...fixtures].sort((left, right) => {
    const leftMinute = getMatchStatus(left).minute ?? 0;
    const rightMinute = getMatchStatus(right).minute ?? 0;

    if (rightMinute !== leftMinute) {
      return rightMinute - leftMinute;
    }

    return Number(left.fixture?.timestamp ?? 0) - Number(right.fixture?.timestamp ?? 0);
  });
}

function sortRoundFixtures(fixtures) {
  const phaseOrder = {
    live: 0,
    finished: 1,
    upcoming: 2
  };

  return [...fixtures].sort((left, right) => {
    const leftStatus = getMatchStatus(left);
    const rightStatus = getMatchStatus(right);
    const leftOrder = phaseOrder[leftStatus.phase] ?? 3;
    const rightOrder = phaseOrder[rightStatus.phase] ?? 3;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    if (leftStatus.phase === "live" || rightStatus.phase === "live") {
      return Number(rightStatus.minute ?? 0) - Number(leftStatus.minute ?? 0);
    }

    return Number(left.fixture?.timestamp ?? 0) - Number(right.fixture?.timestamp ?? 0);
  });
}

function getFixtureRound(fixture) {
  return fixture?.league?.round ?? "";
}

function findCurrentRound(liveFixtures, recentFixtures) {
  return getFixtureRound(liveFixtures[0]) || getFixtureRound(recentFixtures[0]) || "";
}

function applyLiveFixturesToTable(officialTable, fixtures) {
  return fixtures.reduce(
    (table, fixture) => simulateTable(table, fixture, { applyResult: true }),
    officialTable
  );
}

function getZone(row) {
  const rank = Number(row.liveRank ?? row.rank ?? 0);

  if (rank <= 1) {
    return "leader";
  }

  if (rank <= 4) {
    return "libertadores";
  }

  if (rank >= 17) {
    return "relegation";
  }

  return "neutral";
}

function buildStandingRows(officialTable, liveTable) {
  return liveTable.map((row) => {
    const officialRow = officialTable.find((entry) => entry.teamId === row.teamId);
    const previousRank = officialRow?.rank ?? row.rank;
    const movement = Number(previousRank ?? row.liveRank) - Number(row.liveRank ?? previousRank);

    return {
      teamId: row.teamId,
      name: row.name,
      shortName: row.shortName,
      rank: row.liveRank,
      previousRank,
      movement,
      points: row.points,
      played: row.played,
      won: row.won,
      draw: row.draw,
      lost: row.lost,
      goalsDiff: row.goalsDiff,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      form: row.form ?? "",
      zone: getZone(row)
    };
  });
}

function buildImpactEvents(officialTable, standings) {
  const officialByTeam = new Map(officialTable.map((row) => [row.teamId, row]));
  const events = [];

  for (const row of standings) {
    const previous = officialByTeam.get(row.teamId);
    const previousRank = Number(previous?.rank ?? row.previousRank ?? row.rank);
    const currentRank = Number(row.rank);

    if (currentRank === 1 && previousRank !== 1) {
      events.push({
        type: "impact",
        priority: 100,
        title: `${row.name} assume a liderança`,
        line1: `Sobe para 1º com ${row.points} pontos`
      });
      continue;
    }

    if (currentRank <= 4 && previousRank > 4) {
      events.push({
        type: "impact",
        priority: 80,
        title: `${row.name} entra no G4`,
        line1: `Agora aparece em ${currentRank}º`
      });
      continue;
    }

    if (currentRank >= 17 && previousRank < 17) {
      events.push({
        type: "impact",
        priority: 80,
        title: `${row.name} entra no Z4`,
        line1: `Cai para ${currentRank}º`
      });
      continue;
    }

    if (currentRank < 17 && previousRank >= 17) {
      events.push({
        type: "impact",
        priority: 70,
        title: `${row.name} sai do Z4`,
        line1: `Sobe para ${currentRank}º`
      });
    }
  }

  return events
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 8)
    .map(({ priority: _priority, ...event }) => event);
}

export class OverlayService {
  constructor({ apiFootballClient, cacheService, env }) {
    this.apiFootballClient = apiFootballClient;
    this.cacheService = cacheService;
    this.env = env;
  }

  async getBrasileiraoOverlaySnapshot() {
    const season = this.env.obsBrasileiraoSeason;
    const cacheKey = buildOverlayCacheKey("brasileirao", season);
    const cachedSnapshot = await this.cacheService.getJson(cacheKey);

    if (cachedSnapshot) {
      return cachedSnapshot;
    }

    const [liveFixtures, standingsPayload] = await Promise.all([
      this.apiFootballClient.getFixtures({
        live: "all",
        league: BRASILEIRAO_SERIE_A_ID,
        season
      }),
      this.apiFootballClient.getStandings(BRASILEIRAO_SERIE_A_ID, season)
    ]);
    const recentFixtures = liveFixtures.length
      ? []
      : await this.apiFootballClient.getFixtures({
          league: BRASILEIRAO_SERIE_A_ID,
          season,
          last: 20
        });
    const currentRound = findCurrentRound(liveFixtures, recentFixtures);
    const roundFixtures = currentRound
      ? await this.apiFootballClient.getFixturesByRound(BRASILEIRAO_SERIE_A_ID, season, currentRound)
      : liveFixtures;
    const officialTable = normalizeStandings(standingsPayload);
    const sortedLiveFixtures = sortLiveFixtures(liveFixtures);
    const sortedRoundFixtures = sortRoundFixtures(roundFixtures);
    const liveTable = applyLiveFixturesToTable(officialTable, sortedLiveFixtures);
    const standings = buildStandingRows(officialTable, liveTable);
    const events = buildImpactEvents(officialTable, standings);

    const snapshot = {
      competition: {
        id: BRASILEIRAO_SERIE_A_ID,
        slug: "brasileirao",
        name: "Brasileirão Série A",
        country: "Brazil",
        season,
        round: currentRound || standingsPayload?.response?.[0]?.league?.round || ""
      },
      status: {
        phase: sortedLiveFixtures.length ? "live" : "idle",
        liveMatches: sortedLiveFixtures.length,
        lastUpdated: new Date().toISOString()
      },
      matches: sortedRoundFixtures.map(mapOverlayMatch),
      standings,
      events,
      metadata: {
        source: "api-football",
        basis: "official-standings-plus-live-fixtures",
        liveFixtureCount: sortedLiveFixtures.length,
        roundFixtureCount: sortedRoundFixtures.length,
        officialStandings: serializeTable(officialTable).slice(0, 20)
      }
    };

    await this.cacheService.setJson(cacheKey, snapshot, OVERLAY_CACHE_TTL_SECONDS);

    return snapshot;
  }
}
