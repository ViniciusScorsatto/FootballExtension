import dotenv from "dotenv";

dotenv.config();

function readBoolean(name, fallback) {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const normalizedValue = rawValue.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalizedValue)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalizedValue)) {
    return false;
  }

  return fallback;
}

function readTrustProxy(name, fallback) {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const normalizedValue = rawValue.trim().toLowerCase();

  if (["true", "false", "yes", "no", "on", "off"].includes(normalizedValue)) {
    return readBoolean(name, fallback);
  }

  const parsedNumber = Number(rawValue);

  if (Number.isInteger(parsedNumber) && parsedNumber >= 0) {
    return parsedNumber;
  }

  return rawValue;
}

function readNumber(name, fallback) {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function readNumberList(name, fallback = []) {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  return rawValue
    .split(",")
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isInteger(entry) && entry > 0);
}

function readList(name, fallback = ["*"]) {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  return rawValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  adminToken: process.env.ADMIN_TOKEN ?? "",
  port: readNumber("PORT", 3000),
  apiFootballKey: process.env.API_FOOTBALL_KEY ?? process.env.FOOTBALL_API_KEY ?? "",
  apiFootballBaseUrl:
    process.env.API_FOOTBALL_BASE_URL ??
    (process.env.FOOTBALL_API_HOST ? `https://${process.env.FOOTBALL_API_HOST}` : null) ??
    "https://v3.football.api-sports.io",
  redisUrl: process.env.REDIS_URL ?? "",
  trustProxy: readTrustProxy("TRUST_PROXY", 1),
  allowedOrigins: readList("ALLOWED_ORIGINS"),
  allowedExtensionIds: readList("ALLOWED_EXTENSION_IDS", []),
  supportedLeagueIds: readNumberList("SUPPORTED_LEAGUE_IDS", []),
  featuredLeagueIds: readNumberList("FEATURED_LEAGUE_IDS", []),
  liveCacheTtlSeconds: readNumber("LIVE_CACHE_TTL_SECONDS", 15),
  upcomingCacheTtlSeconds: readNumber("UPCOMING_CACHE_TTL_SECONDS", 120),
  finishedCacheTtlSeconds: readNumber("FINISHED_CACHE_TTL_SECONDS", 3600),
  standingsCacheTtlSeconds: readNumber("STANDINGS_CACHE_TTL_SECONDS", 3600),
  statisticsCacheTtlSeconds: readNumber("STATISTICS_CACHE_TTL_SECONDS", 60),
  injuriesCacheTtlSeconds: readNumber("INJURIES_CACHE_TTL_SECONDS", 14400),
  eventsCacheTtlSeconds: readNumber("EVENTS_CACHE_TTL_SECONDS", 60),
  leagueContextLiveCacheTtlSeconds: readNumber("LEAGUE_CONTEXT_LIVE_CACHE_TTL_SECONDS", 60),
  leagueContextUpcomingCacheTtlSeconds: readNumber("LEAGUE_CONTEXT_UPCOMING_CACHE_TTL_SECONDS", 300),
  leagueContextFinishedCacheTtlSeconds: readNumber("LEAGUE_CONTEXT_FINISHED_CACHE_TTL_SECONDS", 3600),
  leagueContextMaxFixtures: readNumber("LEAGUE_CONTEXT_MAX_FIXTURES", 9),
  leagueContextSameWindowMinutes: readNumber("LEAGUE_CONTEXT_SAME_WINDOW_MINUTES", 30),
  lineupsPendingCacheTtlSeconds: readNumber("LINEUPS_PENDING_CACHE_TTL_SECONDS", 300),
  lineupsConfirmedCacheTtlSeconds: readNumber("LINEUPS_CONFIRMED_CACHE_TTL_SECONDS", 21600),
  prematchSlowWindowMinutes: readNumber("PREMATCH_SLOW_WINDOW_MINUTES", 360),
  prematchMediumWindowMinutes: readNumber("PREMATCH_MEDIUM_WINDOW_MINUTES", 90),
  prematchFastWindowMinutes: readNumber("PREMATCH_FAST_WINDOW_MINUTES", 40),
  prematchSlowCacheTtlSeconds: readNumber("PREMATCH_SLOW_CACHE_TTL_SECONDS", 3600),
  prematchMediumCacheTtlSeconds: readNumber("PREMATCH_MEDIUM_CACHE_TTL_SECONDS", 900),
  prematchFastCacheTtlSeconds: readNumber("PREMATCH_FAST_CACHE_TTL_SECONDS", 180),
  stateCacheTtlSeconds: readNumber("STATE_CACHE_TTL_SECONDS", 21600),
  requestTimeoutMs: readNumber("REQUEST_TIMEOUT_MS", 5000),
  rateLimitEnabled: readBoolean("RATE_LIMIT_ENABLED", true),
  rateLimitWindowSeconds: readNumber("RATE_LIMIT_WINDOW_SECONDS", 60),
  freeReadLimitPerWindow: readNumber("RATE_LIMIT_FREE_READS_PER_WINDOW", 120),
  proReadLimitPerWindow: readNumber("RATE_LIMIT_PRO_READS_PER_WINDOW", 600),
  freeAnalyticsLimitPerWindow: readNumber("RATE_LIMIT_FREE_ANALYTICS_PER_WINDOW", 60),
  proAnalyticsLimitPerWindow: readNumber("RATE_LIMIT_PRO_ANALYTICS_PER_WINDOW", 300),
  adminLimitPerWindow: readNumber("RATE_LIMIT_ADMIN_PER_WINDOW", 30)
};
