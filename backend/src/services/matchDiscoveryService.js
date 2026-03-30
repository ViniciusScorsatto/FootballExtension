import { getMatchStatus } from "../utils/impact.js";

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

function mapFixture(fixture) {
  const status = getMatchStatus(fixture);

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
      id: fixture.league?.id ?? null,
      name: fixture.league?.name ?? "",
      country: fixture.league?.country ?? "",
      season: fixture.league?.season ?? null,
      round: fixture.league?.round ?? "",
      standings: fixture.league?.standings === true
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
    const leftStandings = left.league?.standings === true ? 0 : 1;
    const rightStandings = right.league?.standings === true ? 0 : 1;

    if (leftStandings !== rightStandings) {
      return leftStandings - rightStandings;
    }

    return left.fixture.timestamp - right.fixture.timestamp;
  });
}

function dedupeFixtures(fixtures) {
  const seen = new Set();

  return fixtures.filter((fixture) => {
    if (seen.has(fixture.fixture.id)) {
      return false;
    }

    seen.add(fixture.fixture.id);
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
      cacheKey: buildCacheKey("live"),
      ttlSeconds: this.env.liveCacheTtlSeconds,
      loader: async () => {
        const fixtures = await this.apiFootballClient.getLiveFixtures();
        const matches = sortFixtures(fixtures).map(mapFixture);

        return {
          mode: "live",
          last_updated: new Date().toISOString(),
          matches
        };
      }
    });
  }

  async getUpcomingMatches({ date, limit = 20 } = {}) {
    const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 20;
    const requestedDate = date?.trim();
    const cacheKey = buildCacheKey("upcoming", requestedDate ?? `window-${safeLimit}`);

    return this.getCachedList({
      cacheKey,
      ttlSeconds: this.env.upcomingCacheTtlSeconds,
      loader: async () => {
        const baseDate = requestedDate ? new Date(`${requestedDate}T00:00:00Z`) : new Date();
        const datesToFetch = requestedDate
          ? [requestedDate]
          : [toDateKey(baseDate), toDateKey(addDays(baseDate, 1))];
        const responses = await Promise.all(
          datesToFetch.map((currentDate) => this.apiFootballClient.getFixturesByDate(currentDate))
        );
        const fixtures = dedupeFixtures(
          sortFixtures(
            responses
              .flat()
              .filter((fixture) => fixture?.league?.standings === true && isUpcoming(fixture))
          )
        );

        return {
          mode: "upcoming",
          last_updated: new Date().toISOString(),
          dates: datesToFetch,
          matches: fixtures.slice(0, safeLimit).map(mapFixture)
        };
      }
    });
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
