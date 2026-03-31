import { getMatchStatus } from "../utils/impact.js";
import { buildLeagueFilterPayload, isFeaturedLeague, isLeagueSupported } from "../utils/leagues.js";

function buildCacheKey(mode, suffix = "default") {
  return `matches:${mode}:${suffix}`;
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, amount) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + amount);
  return nextDate;
}

function isWithinUpcomingWindow(fixture, windowStartMs, windowEndMs) {
  const fixtureTimestamp = Number(fixture?.fixture?.timestamp ?? 0) * 1000;

  if (!Number.isFinite(fixtureTimestamp) || fixtureTimestamp <= 0) {
    return false;
  }

  return fixtureTimestamp >= windowStartMs && fixtureTimestamp <= windowEndMs;
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

function isUpcoming(fixture) {
  const status = fixture?.fixture?.status?.short ?? "";
  return status === "NS" || status === "TBD";
}

function mapFixture(fixture, env) {
  const status = getMatchStatus(fixture);
  const leagueId = fixture.league?.id ?? null;

  return {
    fixtureId: fixture.fixture.id,
    startsAt: fixture.fixture.date,
    timestamp: fixture.fixture.timestamp,
    venue: {
      name: fixture.fixture.venue?.name ?? "",
      city: fixture.fixture.venue?.city ?? ""
    },
    status,
    league: {
      id: leagueId,
      name: fixture.league?.name ?? "",
      country: fixture.league?.country ?? "",
      season: fixture.league?.season ?? null,
      round: fixture.league?.round ?? "",
      standings: fixture.league?.standings === true,
      featured: isFeaturedLeague(leagueId, env.featuredLeagueIds)
    },
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
    },
    impactMode: fixture?.league?.standings === true ? "table-impact" : "score-only"
  };
}

function sortFixtures(fixtures) {
  return [...fixtures].sort((left, right) => {
    const leftFeatured = left.league?.featured === true ? 0 : 1;
    const rightFeatured = right.league?.featured === true ? 0 : 1;

    if (leftFeatured !== rightFeatured) {
      return leftFeatured - rightFeatured;
    }

    const leftStandings = left.league?.standings === true ? 0 : 1;
    const rightStandings = right.league?.standings === true ? 0 : 1;

    if (leftStandings !== rightStandings) {
      return leftStandings - rightStandings;
    }

    const leftTimestamp = left.timestamp ?? left.fixture?.timestamp ?? 0;
    const rightTimestamp = right.timestamp ?? right.fixture?.timestamp ?? 0;

    return leftTimestamp - rightTimestamp;
  });
}

function dedupeFixtures(fixtures) {
  const seen = new Set();

  return fixtures.filter((fixture) => {
    const fixtureId = fixture.fixtureId ?? fixture.fixture?.id;

    if (!fixtureId || seen.has(fixtureId)) {
      return false;
    }

    seen.add(fixtureId);
    return true;
  });
}

export class MatchDiscoveryService {
  constructor({ apiFootballClient, cacheService, env }) {
    this.apiFootballClient = apiFootballClient;
    this.cacheService = cacheService;
    this.env = env;
    this.pendingRequests = new Map();
  }

  async getLiveMatches() {
    return this.getCachedList({
      cacheKey: buildCacheKey("live", this.getLeagueCacheSuffix()),
      ttlSeconds: this.env.liveCacheTtlSeconds,
      loader: async () => {
        const fixtures = await this.apiFootballClient.getLiveFixtures();
        const matches = sortFixtures(
          fixtures
            .filter((fixture) => isLeagueSupported(fixture?.league?.id, this.env.supportedLeagueIds))
            .map((fixture) => mapFixture(fixture, this.env))
        );

        return {
          mode: "live",
          last_updated: new Date().toISOString(),
          matches,
          leagueFilter: buildLeagueFilterPayload(matches, this.env)
        };
      }
    });
  }

  async getUpcomingMatches({ date, limit = 20 } = {}) {
    const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 20;
    const requestedDate = date?.trim();
    const cacheKey = buildCacheKey(
      "upcoming",
      `${requestedDate ?? `window-${safeLimit}`}:${this.getLeagueCacheSuffix()}`
    );

    return this.getCachedList({
      cacheKey,
      ttlSeconds: this.env.upcomingCacheTtlSeconds,
      loader: async () => {
        const nowMs = Date.now();
        const baseDate = requestedDate ? new Date(`${requestedDate}T00:00:00Z`) : new Date(nowMs);
        const datesToFetch = requestedDate
          ? [requestedDate]
          : [toDateKey(baseDate), toDateKey(addDays(baseDate, 1))];
        const upcomingWindowEndMs = nowMs + 12 * 60 * 60 * 1000;
        const responses = await Promise.all(
          datesToFetch.map((currentDate) => this.apiFootballClient.getFixturesByDate(currentDate))
        );
        const fixtures = dedupeFixtures(
          sortFixtures(
            responses
              .flat()
              .filter(
                (fixture) =>
                  fixture?.league?.standings === true &&
                  isUpcoming(fixture) &&
                  (requestedDate || isWithinUpcomingWindow(fixture, nowMs, upcomingWindowEndMs)) &&
                  isLeagueSupported(fixture?.league?.id, this.env.supportedLeagueIds)
              )
              .map((fixture) => mapFixture(fixture, this.env))
          )
        );

        return {
          mode: "upcoming",
          last_updated: new Date().toISOString(),
          dates: datesToFetch,
          matches: fixtures.slice(0, safeLimit),
          leagueFilter: buildLeagueFilterPayload(fixtures, this.env)
        };
      }
    });
  }

  getLeagueCacheSuffix() {
    if (!this.env.supportedLeagueIds.length && !this.env.featuredLeagueIds.length) {
      return "all";
    }

    return `supported-${this.env.supportedLeagueIds.join("-") || "all"}:featured-${
      this.env.featuredLeagueIds.join("-") || "none"
    }`;
  }

  async getCachedList({ cacheKey, ttlSeconds, loader }) {
    const cachedValue = await this.cacheService.getJson(cacheKey);

    if (cachedValue) {
      return cachedValue;
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = loader()
      .then(async (payload) => {
        await this.cacheService.setJson(cacheKey, payload, ttlSeconds);
        return payload;
      })
      .finally(() => {
        this.pendingRequests.delete(cacheKey);
      });

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }
}
