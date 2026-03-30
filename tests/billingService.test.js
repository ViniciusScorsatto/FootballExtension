import assert from "node:assert/strict";
import test from "node:test";
import { CacheService } from "../backend/src/services/cacheService.js";
import { BillingService } from "../backend/src/services/billingService.js";

function createBillingService(envOverrides = {}) {
  const cacheService = new CacheService({
    redisUrl: ""
  });

  const billingService = new BillingService({
    cacheService,
    env: {
      betaModeEnabled: true,
      billingCurrency: "USD",
      proMonthlyPriceUsd: 5.99,
      earlyBirdProMonthlyPriceUsd: 3.99,
      earlyBirdOfferEnabled: true,
      earlyBirdOfferMaxClaims: 100,
      supportEmail: "support@example.com",
      ...envOverrides
    }
  });

  return {
    billingService,
    cacheService
  };
}

test("pricing catalog exposes free, pro, and early bird metadata", async () => {
  const { billingService } = createBillingService();
  const catalog = await billingService.getPricingCatalog();

  assert.equal(catalog.betaModeEnabled, true);
  assert.equal(catalog.plans.free.priceMonthlyUsd, 0);
  assert.equal(catalog.plans.pro.priceMonthlyUsd, 5.99);
  assert.equal(catalog.offers.early_bird_lifetime.priceMonthlyUsd, 3.99);
  assert.equal(catalog.offers.early_bird_lifetime.remaining, 100);
});

test("billing status falls back to free when no entitlement exists", async () => {
  const { billingService } = createBillingService();
  const status = await billingService.getBillingStatus({
    userId: "tester-1"
  });

  assert.equal(status.plan, "free");
  assert.equal(status.offers.earlyBirdEligible, true);
});

test("claiming early bird stores a reserved pro entitlement", async () => {
  const { billingService, cacheService } = createBillingService({
    earlyBirdOfferMaxClaims: 2
  });

  const result = await billingService.claimEarlyBird({
    userId: "tester-2",
    email: "tester@example.com"
  });

  assert.equal(result.claimed, true);
  assert.equal(result.alreadyClaimed, false);
  assert.equal(result.entitlement.plan, "pro");
  assert.equal(result.entitlement.offerId, "early_bird_lifetime");

  const storedEntitlement = await cacheService.getJson("billing:user:tester-2");
  assert.equal(storedEntitlement.grandfatheredPriceUsd, 3.99);
});
