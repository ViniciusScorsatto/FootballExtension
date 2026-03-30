import { assertFixtureId, parseFixtureId, validateSessionPayload } from "../utils/validators.js";

export function createMatchImpactController({ matchImpactService, matchDiscoveryService }) {
  return {
    getHealth(_req, res) {
      res.json({
        ok: true,
        service: "live-match-impact",
        timestamp: new Date().toISOString()
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
