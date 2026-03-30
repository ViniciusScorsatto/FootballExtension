import { assertFixtureId, parseFixtureId, validateSessionPayload } from "../utils/validators.js";

function isAuthorizedAdminRequest(req, adminToken) {
  if (!adminToken) {
    return true;
  }

  const tokenHeader = req.header("x-admin-token");
  const authorizationHeader = req.header("authorization");
  const bearerToken = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice(7).trim()
    : "";

  return tokenHeader === adminToken || bearerToken === adminToken;
}

export function createMatchImpactController({
  matchImpactService,
  matchDiscoveryService,
  cacheService,
  apiFootballClient,
  env
}) {
  return {
    getHealth(_req, res) {
      res.json({
        ok: true,
        service: "live-match-impact",
        timestamp: new Date().toISOString()
      });
    },

    getAdminHealth(req, res) {
      if (!isAuthorizedAdminRequest(req, env.adminToken)) {
        res.status(401).json({
          error: "Unauthorized."
        });
        return;
      }

      res.json({
        ok: true,
        service: "live-match-impact",
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        admin: {
          protected: Boolean(env.adminToken)
        },
        environment: {
          nodeEnv: env.nodeEnv,
          trustProxy: env.trustProxy
        },
        apiFootball: {
          ...apiFootballClient.getStatus(),
          timeoutMs: env.requestTimeoutMs
        },
        cache: {
          ...cacheService.getStatus(),
          ttlSeconds: {
            live: env.liveCacheTtlSeconds,
            upcoming: env.upcomingCacheTtlSeconds,
            finished: env.finishedCacheTtlSeconds,
            standings: env.standingsCacheTtlSeconds,
            statistics: env.statisticsCacheTtlSeconds,
            injuries: env.injuriesCacheTtlSeconds,
            events: env.eventsCacheTtlSeconds
          }
        },
        rateLimit: {
          enabled: env.rateLimitEnabled,
          windowSeconds: env.rateLimitWindowSeconds,
          buckets: {
            freeReads: env.freeReadLimitPerWindow,
            proReads: env.proReadLimitPerWindow,
            freeAnalytics: env.freeAnalyticsLimitPerWindow,
            proAnalytics: env.proAnalyticsLimitPerWindow,
            admin: env.adminLimitPerWindow
          }
        },
        leagues: {
          supportedLeagueIds: env.supportedLeagueIds,
          featuredLeagueIds: env.featuredLeagueIds
        }
      });
    },

    async getMatchImpact(req, res, next) {
      try {
        const fixtureId = assertFixtureId(req.query.fixture_id);
        const payload = await matchImpactService.getMatchImpact(fixtureId);

        res.json(payload);
      } catch (error) {
        next(error);
      }
    },

    async getLiveMatches(_req, res, next) {
      try {
        const payload = await matchDiscoveryService.getLiveMatches();
        res.json(payload);
      } catch (error) {
        next(error);
      }
    },

    async getUpcomingMatches(req, res, next) {
      try {
        const limit = req.query.limit ? Number(req.query.limit) : undefined;
        const payload = await matchDiscoveryService.getUpcomingMatches({
          date: typeof req.query.date === "string" ? req.query.date : undefined,
          limit
        });
        res.json(payload);
      } catch (error) {
        next(error);
      }
    },

    async trackUsage(req, res, next) {
      try {
        const fixtureId = assertFixtureId(req.body.fixtureId);
        const leagueId = req.body.leagueId ? parseFixtureId(req.body.leagueId) : null;
        const leagueName =
          typeof req.body.leagueName === "string" ? req.body.leagueName.trim() : "";

        await matchImpactService.trackUsage({
          fixtureId,
          leagueId,
          leagueName
        });

        res.status(202).json({
          accepted: true
        });
      } catch (error) {
        next(error);
      }
    },

    async trackSession(req, res, next) {
      try {
        const payload = validateSessionPayload(req.body);
        await matchImpactService.trackSession(payload);

        res.status(202).json({
          accepted: true
        });
      } catch (error) {
        next(error);
      }
    },

    async getAnalyticsSummary(_req, res, next) {
      try {
        const payload = await matchImpactService.getAnalyticsSummary();

        res.json(payload);
      } catch (error) {
        next(error);
      }
    }
  };
}
