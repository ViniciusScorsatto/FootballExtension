import assert from "node:assert/strict";
import test from "node:test";
import { createMatchImpactController } from "../backend/src/controllers/matchImpactController.js";

function createResponseMock() {
  return {
    statusCode: 200,
    body: null,
    contentType: "",
    status(code) {
      this.statusCode = code;
      return this;
    },
    type(value) {
      this.contentType = value;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    }
  };
}

function createController(envOverrides = {}) {
  return createMatchImpactController({
    matchImpactService: {},
    matchDiscoveryService: {},
    billingService: {
      getPricingCatalog: async () => ({
        betaModeEnabled: true,
        currency: "USD",
        supportEmail: "support@example.com",
        plans: {
          free: {
            name: "Free",
            priceMonthlyUsd: 0,
            features: []
          },
          pro: {
            name: "Pro",
            priceMonthlyUsd: 5.99,
            features: []
          }
        },
        offers: {
          early_bird_lifetime: {
            priceMonthlyUsd: 3.99,
            maxClaims: 100,
            remaining: 100,
            active: true,
            badge: "Beta"
          }
        }
      }),
      getBillingStatus: async () => ({
        userId: "tester",
        plan: "free",
        offers: {
          earlyBirdEligible: true
        }
      }),
      recoverEntitlementByEmail: async () => ({
        plan: "pro",
        status: "active"
      }),
      claimEarlyBird: async () => ({
        claimed: true
      }),
      createCheckoutSelection: async () => ({
        userId: "tester",
        email: "tester@example.com",
        planId: "pro",
        priceId: "price_123",
        offerId: "early_bird_lifetime"
      }),
      handleStripeCheckoutCompleted: async () => ({
        processed: true
      }),
      handleStripeSubscriptionUpdated: async () => ({
        processed: true
      }),
      handleStripeSubscriptionDeleted: async () => ({
        processed: true
      })
    },
    stripeService: {
      getStatus() {
        return {
          enabled: true,
          pricesConfigured: true,
          webhookConfigured: true,
          successUrlConfigured: true,
          cancelUrlConfigured: true
        };
      },
      async createCheckoutSession() {
        return {
          id: "cs_test_123",
          url: "https://checkout.stripe.test/session"
        };
      },
      constructWebhookEvent() {
        return {
          type: "checkout.session.completed",
          data: {
            object: {}
          }
        };
      }
    },
    accountService: {
      findOrCreateAccountByEmail: async (email) => ({
        email,
        accountId: "acct_123"
      }),
      linkUserToAccount: async () => ({
        accountId: "acct_123"
      }),
      createMagicLinkRequest: async () => ({
        token: "abc",
        deliveryMode: "preview",
        expiresAt: new Date().toISOString(),
        account: {
          email: "tester@example.com",
          accountId: "acct_123"
        }
      }),
      consumeMagicLink: async () => ({
        userId: "tester",
        account: {
          email: "tester@example.com"
        }
      })
    },
    cacheService: {
      getStatus() {
        return {
          mode: "memory",
          redisConfigured: false,
          redisEnabled: false
        };
      }
    },
    apiFootballClient: {
      getStatus() {
        return {
          configured: true,
          baseUrl: "https://v3.football.api-sports.io",
          lastRequestStatus: null
        };
      }
    },
    env: {
      adminToken: "",
      nodeEnv: "test",
      trustProxy: 1,
      requestTimeoutMs: 5000,
      authMagicLinkMode: "preview",
      authMagicLinkTtlMinutes: 20,
      liveCacheTtlSeconds: 15,
      upcomingCacheTtlSeconds: 120,
      finishedCacheTtlSeconds: 3600,
      standingsCacheTtlSeconds: 3600,
      statisticsCacheTtlSeconds: 60,
      injuriesCacheTtlSeconds: 14400,
      eventsCacheTtlSeconds: 60,
      betaModeEnabled: true,
      proMonthlyPriceUsd: 5.99,
      earlyBirdProMonthlyPriceUsd: 3.99,
      earlyBirdOfferEnabled: true,
      earlyBirdOfferMaxClaims: 100,
      rateLimitEnabled: true,
      rateLimitWindowSeconds: 60,
      freeReadLimitPerWindow: 120,
      proReadLimitPerWindow: 600,
      freeAnalyticsLimitPerWindow: 60,
      proAnalyticsLimitPerWindow: 300,
      adminLimitPerWindow: 30,
      supportedLeagueIds: [39],
      featuredLeagueIds: [39],
      ...envOverrides
    }
  });
}

test("admin health is available without a token when no admin token is configured", () => {
  const controller = createController();
  const res = createResponseMock();

  controller.getAdminHealth(
    {
      header() {
        return "";
      }
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.admin.protected, false);
  assert.deepEqual(res.body.leagues.supportedLeagueIds, [39]);
  assert.equal(res.body.stripe.enabled, true);
});

test("admin health rejects unauthorized requests when admin token is configured", () => {
  const controller = createController({
    adminToken: "secret-token"
  });
  const res = createResponseMock();

  controller.getAdminHealth(
    {
      header() {
        return "";
      }
    },
    res
  );

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, "Unauthorized.");
});

test("marketing page renders html", async () => {
  const controller = createController();
  const res = createResponseMock();

  await controller.getMarketingPage({}, res, (error) => {
    throw error;
  });

  assert.equal(res.contentType, "html");
  assert.match(res.body, /Instant understanding of what a goal means/i);
  assert.match(res.body, /Early Bird Pro/i);
});

test("billing status returns the current plan snapshot", async () => {
  const controller = createController();
  const res = createResponseMock();

  await controller.getBillingStatus(
    {
      query: {},
      monetization: {
        plan: "free",
        userId: "tester"
      }
    },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.plan, "free");
  assert.equal(res.body.offers.earlyBirdEligible, true);
});

test("billing refresh actively relinks the browser and returns the resolved plan", async () => {
  let recovered = false;
  const controller = createMatchImpactController({
    matchImpactService: {},
    matchDiscoveryService: {},
    billingService: {
      getPricingCatalog: async () => ({}),
      getBillingStatus: async () => ({
        userId: "tester-browser",
        plan: recovered ? "pro" : "free",
        status: recovered ? "active" : "inactive",
        offers: {
          earlyBirdEligible: !recovered
        }
      }),
      recoverEntitlementByEmail: async () => {
        recovered = true;
        return {
          plan: "pro",
          status: "active"
        };
      }
    },
    stripeService: {
      getStatus() {
        return {
          enabled: true,
          pricesConfigured: true,
          webhookConfigured: true,
          successUrlConfigured: true,
          cancelUrlConfigured: true
        };
      }
    },
    accountService: {
      findOrCreateAccountByEmail: async (email) => ({
        email,
        accountId: "acct_123"
      }),
      linkUserToAccount: async () => ({
        accountId: "acct_123"
      })
    },
    cacheService: {
      getStatus() {
        return {
          mode: "memory",
          redisConfigured: false,
          redisEnabled: false
        };
      }
    },
    apiFootballClient: {
      getStatus() {
        return {
          configured: true,
          baseUrl: "https://v3.football.api-sports.io",
          lastRequestStatus: null
        };
      }
    },
    env: {
      adminToken: "",
      nodeEnv: "test",
      trustProxy: 1,
      requestTimeoutMs: 5000,
      authMagicLinkMode: "preview",
      authMagicLinkTtlMinutes: 20,
      liveCacheTtlSeconds: 15,
      upcomingCacheTtlSeconds: 120,
      finishedCacheTtlSeconds: 3600,
      standingsCacheTtlSeconds: 3600,
      statisticsCacheTtlSeconds: 60,
      injuriesCacheTtlSeconds: 14400,
      eventsCacheTtlSeconds: 60,
      betaModeEnabled: true,
      proMonthlyPriceUsd: 5.99,
      earlyBirdProMonthlyPriceUsd: 3.99,
      earlyBirdOfferEnabled: true,
      earlyBirdOfferMaxClaims: 100,
      rateLimitEnabled: true,
      rateLimitWindowSeconds: 60,
      freeReadLimitPerWindow: 120,
      proReadLimitPerWindow: 600,
      freeAnalyticsLimitPerWindow: 60,
      proAnalyticsLimitPerWindow: 300,
      adminLimitPerWindow: 30,
      supportedLeagueIds: [39],
      featuredLeagueIds: [39]
    }
  });
  const res = createResponseMock();

  await controller.refreshBillingStatus(
    {
      body: {
        userId: "tester-browser",
        email: "tester@example.com"
      },
      monetization: {
        plan: "free",
        userId: "tester-browser"
      }
    },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.plan, "pro");
  assert.equal(res.body.status, "active");
});

test("checkout session creation returns a Stripe checkout URL", async () => {
  const controller = createController();
  const res = createResponseMock();

  await controller.createCheckoutSession(
    {
      body: {
        userId: "tester",
        offerId: "early_bird_lifetime",
        email: "tester@example.com"
      },
      monetization: {
        userId: "tester"
      }
    },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.checkoutUrl, "https://checkout.stripe.test/session");
});

test("support page renders when authorized by admin_token query", async () => {
  const controller = createMatchImpactController({
    matchImpactService: {},
    matchDiscoveryService: {},
    billingService: {
      getSupportSnapshot: async () => ({
        account: {
          accountId: "acct_123",
          email: "tester@example.com",
          linkedBrowserIds: ["lmi_abc"]
        },
        billingStatus: {
          plan: "pro",
          status: "active"
        },
        stripe: {
          found: true,
          lookupSource: "customer"
        },
        webhooks: {
          ok: true,
          lastEventType: "checkout.session.completed"
        },
        lookup: {
          email: "tester@example.com",
          userId: "",
          accountId: "acct_123"
        }
      })
    },
    stripeService: {
      getStatus() {
        return {
          enabled: true,
          pricesConfigured: true,
          webhookConfigured: true,
          successUrlConfigured: true,
          cancelUrlConfigured: true
        };
      }
    },
    accountService: {},
    cacheService: {
      getStatus() {
        return {
          mode: "memory",
          redisConfigured: false,
          redisEnabled: false
        };
      }
    },
    apiFootballClient: {
      getStatus() {
        return {
          configured: true,
          baseUrl: "https://v3.football.api-sports.io",
          lastRequestStatus: null
        };
      }
    },
    env: {
      adminToken: "secret-token",
      nodeEnv: "test",
      trustProxy: 1,
      requestTimeoutMs: 5000,
      authMagicLinkMode: "preview",
      authMagicLinkTtlMinutes: 20,
      liveCacheTtlSeconds: 15,
      upcomingCacheTtlSeconds: 120,
      finishedCacheTtlSeconds: 3600,
      standingsCacheTtlSeconds: 3600,
      statisticsCacheTtlSeconds: 60,
      injuriesCacheTtlSeconds: 14400,
      eventsCacheTtlSeconds: 60,
      betaModeEnabled: true,
      proMonthlyPriceUsd: 5.99,
      earlyBirdProMonthlyPriceUsd: 3.99,
      earlyBirdOfferEnabled: true,
      earlyBirdOfferMaxClaims: 100,
      rateLimitEnabled: true,
      rateLimitWindowSeconds: 60,
      freeReadLimitPerWindow: 120,
      proReadLimitPerWindow: 600,
      freeAnalyticsLimitPerWindow: 60,
      proAnalyticsLimitPerWindow: 300,
      adminLimitPerWindow: 30,
      supportedLeagueIds: [39],
      featuredLeagueIds: [39],
      posthogHost: "https://us.i.posthog.com",
      posthogProjectApiKey: ""
    }
  });
  const res = createResponseMock();

  await controller.getSupportPage(
    {
      query: {
        admin_token: "secret-token",
        email: "tester@example.com"
      },
      body: {},
      header() {
        return "";
      }
    },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.contentType, "html");
  assert.match(res.body, /Support Ops/);
  assert.match(res.body, /Admin token attached/);
  assert.match(res.body, /tester@example\.com/);
});
