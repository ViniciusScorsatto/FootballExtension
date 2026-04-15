import assert from "node:assert/strict";
import test from "node:test";
import { AccountService } from "../apps/api/src/services/accountService.js";
import { BillingService } from "../apps/api/src/services/billingService.js";
import { CacheService } from "../apps/api/src/services/cacheService.js";

function createServices() {
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
    stripeService: {
      async findRecoverableSubscriptionByEmail() {
        return null;
      }
    },
    env: {
      betaModeEnabled: true,
      billingCurrency: "USD",
      proMonthlyPriceUsd: 5.99,
      earlyBirdProMonthlyPriceUsd: 3.99,
      earlyBirdOfferEnabled: true,
      earlyBirdOfferMaxClaims: 100,
      supportEmail: "support@example.com",
      stripeNormalPriceId: "price_normal",
      stripeEarlyPriceId: "price_early"
    }
  });

  return {
    cacheService,
    accountService,
    billingService
  };
}

test("magic link restore links a new browser identity to the same paid account", async () => {
  const { accountService, billingService } = createServices();

  await billingService.handleStripeCheckoutCompleted({
    metadata: {
      userId: "browser-a",
      offerId: "early_bird_lifetime",
      priceId: "price_early"
    },
    customer_details: {
      email: "tester@example.com"
    },
    customer: "cus_123",
    subscription: "sub_123"
  });

  await billingService.handleStripeInvoicePaid({
    customer_email: "tester@example.com",
    customer: "cus_123",
    subscription: "sub_123",
    lines: {
      data: [
        {
          price: {
            id: "price_early"
          }
        }
      ]
    }
  });

  const request = await accountService.createMagicLinkRequest({
    email: "tester@example.com",
    userId: "browser-b"
  });

  await accountService.consumeMagicLink(request.token);

  const billingStatus = await billingService.getBillingStatus({
    userId: "browser-b"
  });

  assert.equal(billingStatus.plan, "pro");
  assert.equal(billingStatus.status, "active");
  assert.equal(billingStatus.account.linked, true);
  assert.equal(billingStatus.account.email, "tester@example.com");
  assert.equal(billingStatus.offerId, "early_bird_lifetime");
});
