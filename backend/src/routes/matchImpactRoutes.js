import { Router } from "express";

export function createMatchImpactRouter(controller) {
  const router = Router();

  router.get("/", controller.getMarketingPage);
  router.get("/health", controller.getHealth);
  router.get("/admin/health", controller.getAdminHealth);
  router.get("/billing/plans", controller.getBillingPlans);
  router.get("/billing/status", controller.getBillingStatus);
  router.post("/billing/early-bird/claim", controller.claimEarlyBird);
  router.post("/billing/checkout-session", controller.createCheckoutSession);
  router.get("/matches/live", controller.getLiveMatches);
  router.get("/matches/upcoming", controller.getUpcomingMatches);
  router.get("/match-impact", controller.getMatchImpact);
  router.post("/track/usage", controller.trackUsage);
  router.post("/track/session", controller.trackSession);
  router.get("/analytics/summary", controller.getAnalyticsSummary);

  return router;
}
