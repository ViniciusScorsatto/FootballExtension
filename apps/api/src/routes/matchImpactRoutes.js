import { Router } from "express";

export function createMatchImpactRouter(controller) {
  const router = Router();

  router.get("/", controller.getMarketingPage);
  router.get("/public-config", controller.getPublicConfig);
  router.get("/health", controller.getHealth);
  router.get("/admin/health", controller.getAdminHealth);
  router.get("/admin/support", controller.getSupportPage);
  router.get("/admin/support/lookup", controller.lookupSupportState);
  router.post("/admin/support/resync", controller.resyncSupportState);
  router.post("/admin/support/relink", controller.relinkSupportState);
  router.get("/billing/plans", controller.getBillingPlans);
  router.get("/billing/status", controller.getBillingStatus);
  router.post("/billing/status/refresh", controller.refreshBillingStatus);
  router.post("/billing/early-bird/claim", controller.claimEarlyBird);
  router.post("/billing/checkout-session", controller.createCheckoutSession);
  router.post("/auth/magic-link/request", controller.requestMagicLink);
  router.get("/auth/magic-link/complete", controller.completeMagicLink);
  router.get("/matches/live", controller.getLiveMatches);
  router.get("/matches/upcoming", controller.getUpcomingMatches);
  router.get("/match-impact", controller.getMatchImpact);
  router.post("/track/usage", controller.trackUsage);
  router.post("/track/session", controller.trackSession);
  router.get("/analytics/summary", controller.getAnalyticsSummary);

  return router;
}
