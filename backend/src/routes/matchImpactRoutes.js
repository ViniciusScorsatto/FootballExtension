import { Router } from "express";

export function createMatchImpactRouter(controller) {
  const router = Router();

  router.get("/health", controller.getHealth);
  router.get("/matches/live", controller.getLiveMatches);
  router.get("/matches/upcoming", controller.getUpcomingMatches);
  router.get("/match-impact", controller.getMatchImpact);
  router.post("/track/usage", controller.trackUsage);
  router.post("/track/session", controller.trackSession);
  router.get("/analytics/summary", controller.getAnalyticsSummary);

  return router;
}
