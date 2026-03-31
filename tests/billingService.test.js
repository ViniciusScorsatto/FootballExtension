import assert from "node:assert/strict";
import test from "node:test";
import { AccountService } from "../backend/src/services/accountService.js";
import { CacheService } from "../backend/src/services/cacheService.js";
import { BillingService } from "../backend/src/services/billingService.js";

function createBillingService(envOverrides = {}) {
  const cacheService = new CacheService({
    redisUrl: ""
  });
  const accountService = new AccountService({
    cacheService,
    env: {
      authMagicLinkMode: "preview",
      authMagicLinkTtlMinutes: 20
    }
  });

  const billingService = new BillingService({
    cacheService,
    accountService,
    env: {
      betaModeEnabled: true,
      billingCurrency: "USD",
      proMonthlyPriceUsd: 5.99,
      earlyBirdProMonthlyPriceUsd: 3.99,
      earlyBirdOfferEnabled: true,
      earlyBirdOfferMaxClaims: 100,
      supportEmail: "support@example.com",
      stripeNormalPriceId: "price_normal",
      stripeEarlyPriceId: "price_early",
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

test("checkout selection chooses the Early Bird Stripe price when reserved", async () => {
  const { billingService } = createBillingService();

  await billingService.claimEarlyBird({
    userId: "tester-3",
    email: "tester@example.com"
  });

  const selection = await billingService.createCheckoutSelection({
    userId: "tester-3",
    email: "tester@example.com",
    offerId: "early_bird_lifetime"
  });

  assert.equal(selection.priceId, "price_early");
  assert.equal(selection.offerId, "early_bird_lifetime");
});

test("stripe checkout completion activates the user's Pro entitlement", async () => {
  const { billingService, cacheService } = createBillingService();

  const result = await billingService.handleStripeCheckoutCompleted({
    metadata: {
      userId: "tester-4",
      offerId: "early_bird_lifetime",
      priceId: "price_early"
    },
    customer_details: {
      email: "tester@example.com"
    },
    customer: "cus_123",
    subscription: "sub_123"
  });

  assert.equal(result.processed, true);

  const linkedAccount = await cacheService.getJson("account:browser:tester-4");
  const storedEntitlement = await cacheService.getJson(`billing:user:${linkedAccount.accountId}`);
  assert.equal(storedEntitlement.status, "active");
  assert.equal(storedEntitlement.offerId, "early_bird_lifetime");
  assert.equal(storedEntitlement.stripeSubscriptionId, "sub_123");
});
