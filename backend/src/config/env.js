import dotenv from "dotenv";

dotenv.config();

function readNumber(name, fallback) {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
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
  port: readNumber("PORT", 3000),
  apiFootballKey: process.env.API_FOOTBALL_KEY ?? process.env.FOOTBALL_API_KEY ?? "",
  apiFootballBaseUrl:
    process.env.API_FOOTBALL_BASE_URL ??
    (process.env.FOOTBALL_API_HOST ? `https://${process.env.FOOTBALL_API_HOST}` : null) ??
    "https://v3.football.api-sports.io",
  redisUrl: process.env.REDIS_URL ?? "",
  allowedOrigins: readList("ALLOWED_ORIGINS"),
  liveCacheTtlSeconds: readNumber("LIVE_CACHE_TTL_SECONDS", 15),
  upcomingCacheTtlSeconds: readNumber("UPCOMING_CACHE_TTL_SECONDS", 120),
  finishedCacheTtlSeconds: readNumber("FINISHED_CACHE_TTL_SECONDS", 3600),
  stateCacheTtlSeconds: readNumber("STATE_CACHE_TTL_SECONDS", 21600),
  requestTimeoutMs: readNumber("REQUEST_TIMEOUT_MS", 5000)
};
