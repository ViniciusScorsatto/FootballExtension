import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createMatchImpactController } from "../apps/api/src/controllers/matchImpactController.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

async function readJson(relativePath) {
  const raw = await readFile(path.join(rootDir, relativePath), "utf8");
  return JSON.parse(raw);
}

async function readText(relativePath) {
  return readFile(path.join(rootDir, relativePath), "utf8");
}

function createResponseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    type() {
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    }
  };
}

function validateAgainstSchema(value, schema, pointer = "root") {
  if (!schema) {
    return;
  }

  const allowedTypes = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];

  if (allowedTypes.length > 0) {
    const actualType =
      value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
    assert.ok(
      allowedTypes.includes(actualType),
      `${pointer} expected type ${allowedTypes.join("|")} but received ${actualType}`
    );
  }

  if (schema.type === "object" || allowedTypes.includes("object")) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const key of schema.required || []) {
        assert.ok(key in value, `${pointer}.${key} is required`);
      }

      for (const [key, childSchema] of Object.entries(schema.properties || {})) {
        if (key in value) {
          validateAgainstSchema(value[key], childSchema, `${pointer}.${key}`);
        }
      }
    }
  }

  if (schema.type === "array" || allowedTypes.includes("array")) {
    if (Array.isArray(value) && schema.items) {
      value.forEach((item, index) => {
        validateAgainstSchema(item, schema.items, `${pointer}[${index}]`);
      });
    }
  }
}

function createController() {
  return createMatchImpactController({
    matchImpactService: {
      async getMatchImpact() {
        return {
          fixture_id: 101,
          startsAt: "2026-04-18T05:00:00.000Z",
          last_updated: "2026-04-18T04:55:00.000Z",
          league: { id: 71, name: "Serie A", country: "Brazil", season: 2026, round: "Regular Season - 5" },
          teams: {
            home: { id: 1, name: "Home", shortName: "HOM", logo: "" },
            away: { id: 2, name: "Away", shortName: "AWY", logo: "" }
          },
          status: { phase: "live", short: "1H", long: "First Half", minute: 33, isFinished: false },
          score: {
            home: 1,
            away: 0,
            penalty: { home: null, away: null },
            fulltime: { home: null, away: null },
            extratime: { home: null, away: null }
          },
          event: {
            type: "GOAL",
            message: "Goal · Home Striker · 33'",
            teamName: "Home",
            minuteLabel: "33'",
            scorer: "Home Striker",
            impactSummary: "Home climbs to 4th"
          },
          impact: {
            summary: "Home climbs to 4th",
            competition: ["Home moves into the top four."],
            momentum: { home: 62, away: 38 },
            mode: "table",
            table: {
              home: { position: 4, movement: 2, pointsDelta: 3, projectedPoints: 11 },
              away: { position: 9, movement: -1, pointsDelta: 0, projectedPoints: 6 }
            },
            biggestMovement: { teamId: 1, movement: 2 }
          },
          statistics: {
            available: true,
            home: { possession: 58 },
            away: { possession: 42 },
            momentum: { home: 62, away: 38 },
            insights: ["Home is creating the better chances."]
          },
          league_context: {
            available: true,
            round: "Regular Season - 5",
            selectionMode: "same_round",
            totalFixtures: 10,
            displayedFixtures: 2,
            limited: false,
            fixtures: [
              {
                fixtureId: 303,
                startsAt: "2026-04-18T06:00:00.000Z",
                timestamp: 1776482400,
                status: { phase: "live", minute: 15 },
                teams: {
                  home: { name: "Third", shortName: "THI", logo: "" },
                  away: { name: "Fourth", shortName: "FOR", logo: "" }
                },
                score: { home: 0, away: 0 }
              }
            ]
          },
          metadata: {
            tableImpactAvailable: true,
            impactMode: "table",
            competitionFormat: "single_table_domestic",
            impactBasis: "corrected-round-baseline"
          }
        };
      },
      async trackUsage() {},
      async trackSession() {}
    },
    matchDiscoveryService: {
      async getLiveMatches() {
        return {
          matches: [
            {
              fixtureId: 101,
              league: { id: 71, name: "Serie A" },
              teams: { home: { name: "Home" }, away: { name: "Away" } }
            }
          ]
        };
      },
      async getUpcomingMatches() {
        return {
          matches: [
            {
              fixtureId: 202,
              league: { id: 71, name: "Serie A" },
              teams: { home: { name: "Home" }, away: { name: "Away" } }
            }
          ]
        };
      }
    },
    billingService: {
      async getPricingCatalog() {
        return {
          betaModeEnabled: true,
          currency: "USD",
          plans: {
            free: { name: "Free", priceMonthlyUsd: 0 },
            pro: { name: "Pro", priceMonthlyUsd: 5.99 }
          },
          offers: {
            early_bird_lifetime: {
              name: "Early Bird Pro",
              priceMonthlyUsd: 3.99,
              remaining: 10
            }
          }
        };
      },
      async getBillingStatus() {
        return {
          userId: "user-1",
          plan: "free",
          status: "inactive",
          account: {
            linked: false,
            accountId: "",
            email: ""
          },
          planDetails: {
            name: "Free"
          },
          offers: {
            earlyBirdEligible: true,
            earlyBirdActive: true,
            earlyBirdRemaining: 10
          },
          updatedAt: new Date().toISOString()
        };
      }
    },
    accountService: {},
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
    cacheService: {},
    apiFootballClient: {
      getStatus() {
        return {};
      }
    },
    env: {
      adminToken: "",
      authMagicLinkMode: "preview",
      authMagicLinkTtlMinutes: 20,
      posthogProjectApiKey: "",
      posthogHost: "https://us.i.posthog.com",
      nodeEnv: "test",
      buildCommitSha: "abc1234",
      buildBranch: "main",
      buildDeploymentId: "deploy_123",
      trustProxy: false,
      requestTimeoutMs: 5000,
      liveCacheTtlSeconds: 15,
      upcomingCacheTtlSeconds: 120,
      finishedCacheTtlSeconds: 3600,
      standingsCacheTtlSeconds: 3600,
      statisticsCacheTtlSeconds: 60,
      injuriesCacheTtlSeconds: 14400,
      eventsCacheTtlSeconds: 60,
      leagueContextLiveCacheTtlSeconds: 60,
      leagueContextUpcomingCacheTtlSeconds: 300,
      leagueContextFinishedCacheTtlSeconds: 3600,
      rateLimitEnabled: true,
      rateLimitWindowSeconds: 60,
      freeReadLimitPerWindow: 120,
      proReadLimitPerWindow: 600,
      freeAnalyticsLimitPerWindow: 60,
      proAnalyticsLimitPerWindow: 300,
      adminLimitPerWindow: 30,
      supportedLeagueIds: [],
      featuredLeagueIds: [],
      leagueContextMaxFixtures: 9,
      leagueContextSameWindowMinutes: 30,
      betaModeEnabled: true,
      proMonthlyPriceUsd: 5.99,
      earlyBirdProMonthlyPriceUsd: 3.99,
      earlyBirdOfferEnabled: true,
      earlyBirdOfferMaxClaims: 100
    }
  });
}

test("OpenAPI contract lists the first stable public routes", async () => {
  const openapi = await readText("packages/contracts/openapi/live-match-impact.openapi.yaml");

  for (const route of [
    "/public-config",
    "/billing/plans",
    "/billing/status",
    "/billing/status/refresh",
    "/billing/early-bird/claim",
    "/billing/checkout-session",
    "/matches/live",
    "/matches/upcoming",
    "/match-impact",
    "/track/usage",
    "/track/session"
  ]) {
    assert.match(openapi, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("public route payloads satisfy the declared contract schemas", async () => {
  const controller = createController();
  const billingPlansSchema = await readJson("packages/contracts/schemas/billing-plans.json");
  const billingStatusSchema = await readJson("packages/contracts/schemas/billing-status.json");
  const publicConfigSchema = await readJson("packages/contracts/schemas/public-config.json");
  const liveMatchesSchema = await readJson("packages/contracts/schemas/live-matches.json");
  const upcomingMatchesSchema = await readJson("packages/contracts/schemas/upcoming-matches.json");
  const matchImpactSchema = await readJson("packages/contracts/schemas/match-impact.json");

  const publicConfigRes = createResponseRecorder();
  controller.getPublicConfig({}, publicConfigRes);
  validateAgainstSchema(publicConfigRes.body, publicConfigSchema);

  const billingPlansRes = createResponseRecorder();
  await controller.getBillingPlans({}, billingPlansRes, (error) => {
    throw error;
  });
  validateAgainstSchema(billingPlansRes.body, billingPlansSchema);

  const billingStatusRes = createResponseRecorder();
  await controller.getBillingStatus(
    {
      query: { user_id: "user-1" },
      monetization: { userId: "user-1", plan: "free" }
    },
    billingStatusRes,
    (error) => {
      throw error;
    }
  );
  validateAgainstSchema(billingStatusRes.body, billingStatusSchema);

  const liveMatchesRes = createResponseRecorder();
  await controller.getLiveMatches({}, liveMatchesRes, (error) => {
    throw error;
  });
  validateAgainstSchema(liveMatchesRes.body, liveMatchesSchema);

  const upcomingMatchesRes = createResponseRecorder();
  await controller.getUpcomingMatches({ query: {} }, upcomingMatchesRes, (error) => {
    throw error;
  });
  validateAgainstSchema(upcomingMatchesRes.body, upcomingMatchesSchema);

  const matchImpactRes = createResponseRecorder();
  await controller.getMatchImpact({ query: { fixture_id: 101 } }, matchImpactRes, (error) => {
    throw error;
  });
  validateAgainstSchema(matchImpactRes.body, matchImpactSchema);
});

test("scenario payloads satisfy the stricter match-impact schema", async () => {
  const matchImpactSchema = await readJson("packages/contracts/schemas/match-impact.json");
  const prematchScenario = await readJson(
    "apps/extension/scenarios/cruzeiro-vitoria-quarter-finals/prematch.json"
  );
  const aggregateScenario = await readJson(
    "apps/extension/scenarios/cruzeiro-vitoria-quarter-finals/aggregate-level.json"
  );
  const groupScenario = await readJson(
    "apps/extension/scenarios/palmeiras-sporting-cristal-group-stage/live-home-goes-top.json"
  );
  const relegationScenario = await readJson(
    "apps/extension/scenarios/juventude-sport-relegation-fight/live-home-climbs-out.json"
  );

  validateAgainstSchema(prematchScenario, matchImpactSchema);
  validateAgainstSchema(aggregateScenario, matchImpactSchema);
  validateAgainstSchema(groupScenario, matchImpactSchema);
  validateAgainstSchema(relegationScenario, matchImpactSchema);
});
