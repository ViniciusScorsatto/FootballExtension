import {
  assertFixtureId,
  validateCheckoutPayload,
  validateMagicLinkRequestPayload,
  validateRestoreSyncPayload,
  validateMagicLinkToken,
  parseFixtureId,
  validateBillingIdentity,
  validateEarlyBirdClaimPayload,
  validateSessionPayload,
  validateSupportLookupQuery,
  validateSupportRelinkPayload
} from "../utils/validators.js";
import { renderMarketingPage } from "../views/marketingPage.js";
import { renderMagicLinkPage } from "../views/magicLinkPage.js";
import { renderSupportPage } from "../views/supportPage.js";

function isAuthorizedAdminRequest(req, adminToken) {
  if (!adminToken) {
    return true;
  }

  const tokenHeader = req.header("x-admin-token");
  const authorizationHeader = req.header("authorization");
  const queryToken =
    typeof req.query?.admin_token === "string" ? req.query.admin_token.trim() : "";
  const bodyToken =
    typeof req.body?.admin_token === "string" ? req.body.admin_token.trim() : "";
  const bearerToken = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice(7).trim()
    : "";

  return (
    tokenHeader === adminToken ||
    bearerToken === adminToken ||
    queryToken === adminToken ||
    bodyToken === adminToken
  );
}

function tagServiceError(error, source, fallbackCode) {
  if (!error) {
    return error;
  }

  if (!error.source) {
    error.source = source;
  }

  if (!error.code && fallbackCode) {
    error.code = fallbackCode;
  }

  return error;
}

export function createMatchImpactController({
  matchImpactService,
  matchDiscoveryService,
  billingService,
  accountService,
  stripeService,
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

    async getMarketingPage(req, res, next) {
      try {
        const pricing = await billingService.getPricingCatalog();
        const language = typeof req.query?.lang === "string" ? req.query.lang.trim() : "en";
        res.type("html").send(renderMarketingPage({ pricing, language }));
      } catch (error) {
        next(error);
      }
    },

    getPublicConfig(_req, res) {
      res.json({
        analytics: {
          posthog: {
            enabled: Boolean(env.posthogProjectApiKey),
            host: env.posthogHost,
            apiKey: env.posthogProjectApiKey
          }
        }
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
        stripe: stripeService.getStatus(),
        auth: {
          magicLinkMode: env.authMagicLinkMode,
          magicLinkTtlMinutes: env.authMagicLinkTtlMinutes
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
            events: env.eventsCacheTtlSeconds,
            leagueContext: {
              live: env.leagueContextLiveCacheTtlSeconds,
              upcoming: env.leagueContextUpcomingCacheTtlSeconds,
              finished: env.leagueContextFinishedCacheTtlSeconds
            }
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
        },
        product: {
          leagueContext: {
            maxFixtures: env.leagueContextMaxFixtures,
            sameWindowMinutes: env.leagueContextSameWindowMinutes
          },
          analytics: {
            posthogEnabled: Boolean(env.posthogProjectApiKey),
            posthogHost: env.posthogHost
          },
          billing: {
            betaModeEnabled: env.betaModeEnabled,
            proMonthlyPriceUsd: env.proMonthlyPriceUsd,
            earlyBirdProMonthlyPriceUsd: env.earlyBirdProMonthlyPriceUsd,
            earlyBirdOfferEnabled: env.earlyBirdOfferEnabled,
            earlyBirdOfferMaxClaims: env.earlyBirdOfferMaxClaims
          }
        }
      });
    },

    async getSupportPage(req, res, next) {
      try {
        if (!isAuthorizedAdminRequest(req, env.adminToken)) {
          res.status(401).type("html").send("Unauthorized");
          return;
        }

        let lookup = {
          email: "",
          userId: "",
          accountId: ""
        };
        let snapshot = null;
        const adminToken =
          typeof req.query.admin_token === "string" ? req.query.admin_token.trim() : "";

        if (req.query.email || req.query.user_id || req.query.account_id) {
          lookup = validateSupportLookupQuery(req.query);
          snapshot = await billingService.getSupportSnapshot(lookup);
        }

        res.type("html").send(renderSupportPage({ lookup, snapshot, adminToken }));
      } catch (error) {
        next(error);
      }
    },

    async lookupSupportState(req, res, next) {
      try {
        if (!isAuthorizedAdminRequest(req, env.adminToken)) {
          res.status(401).json({ error: "Unauthorized." });
          return;
        }

        const lookup = validateSupportLookupQuery(req.query);
        const snapshot = await billingService.getSupportSnapshot(lookup);
        res.json(snapshot);
      } catch (error) {
        next(error);
      }
    },

    async relinkSupportState(req, res, next) {
      try {
        if (!isAuthorizedAdminRequest(req, env.adminToken)) {
          res.status(401).json({ error: "Unauthorized." });
          return;
        }

        const payload = validateSupportRelinkPayload(req.body);
        const account = await accountService.findOrCreateAccountByEmail(payload.email);

        if (!account?.accountId) {
          throw new Error("Could not resolve account for email.");
        }

        await accountService.linkUserToAccount(payload.userId, account.accountId);
        const snapshot = await billingService.getSupportSnapshot({
          email: payload.email,
          userId: payload.userId,
          accountId: account.accountId
        });

        res.json({
          ok: true,
          accountId: account.accountId,
          snapshot
        });
      } catch (error) {
        next(error);
      }
    },

    async resyncSupportState(req, res, next) {
      try {
        if (!isAuthorizedAdminRequest(req, env.adminToken)) {
          res.status(401).json({ error: "Unauthorized." });
          return;
        }

        const lookup = validateSupportLookupQuery(req.body);
        const preSnapshot = await billingService.getSupportSnapshot(lookup);
        const recoveryEmail =
          lookup.email || preSnapshot.account?.email || preSnapshot.billingStatus?.account?.email || "";
        const targetUserId =
          lookup.userId ||
          preSnapshot.lookup.accountId ||
          lookup.accountId ||
          preSnapshot.browser?.resolvedOwnerId ||
          "";

        const recovery = recoveryEmail
          ? await billingService.recoverEntitlementByEmail({
              userId: targetUserId,
              email: recoveryEmail
            })
          : {
              entitlement: null,
              debug: {
                attempted: false,
                recovered: false,
                reason: "missing_email"
              }
            };

        const snapshot = await billingService.getSupportSnapshot({
          email: recoveryEmail,
          userId: lookup.userId || targetUserId,
          accountId: lookup.accountId || preSnapshot.lookup.accountId || targetUserId
        });

        res.json({
          ok: true,
          recovery: recovery.debug,
          snapshot
        });
      } catch (error) {
        next(error);
      }
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
    },

    async getBillingPlans(_req, res, next) {
      try {
        const payload = await billingService.getPricingCatalog();
        res.json(payload);
      } catch (error) {
        next(error);
      }
    },

    async getBillingStatus(req, res, next) {
      try {
        const userId = req.query.user_id
          ? validateBillingIdentity(req.query.user_id, "user_id")
          : req.monetization.userId !== "anonymous"
            ? validateBillingIdentity(req.monetization.userId, "x-live-impact-user")
            : "";
        const payload = await billingService.getBillingStatus({
          userId,
          planHint: req.monetization.plan
        });

        res.json(payload);
      } catch (error) {
        next(error);
      }
    },

    async refreshBillingStatus(req, res, next) {
      try {
        const payload = validateRestoreSyncPayload(req.body, req.monetization.userId);
        const account = await accountService.findOrCreateAccountByEmail(payload.email);
        const debug = {
          requestedUserId: payload.userId,
          email: payload.email,
          accountCreatedOrFound: Boolean(account?.accountId),
          accountId: account?.accountId ?? "",
          linkedBrowserToAccount: false,
          initialPlan: "",
          initialStatus: "",
          recovery: null,
          finalPlan: "",
          finalStatus: ""
        };

        if (account?.accountId) {
          await accountService.linkUserToAccount(payload.userId, account.accountId);
          debug.linkedBrowserToAccount = true;
        }

        let billingStatus = await billingService.getBillingStatus({
          userId: payload.userId,
          planHint: req.monetization.plan
        });
        debug.initialPlan = billingStatus.plan;
        debug.initialStatus = billingStatus.status;

        if (billingStatus.plan !== "pro") {
          const recoveryResult = await billingService.recoverEntitlementByEmail({
            userId: payload.userId,
            email: payload.email
          });
          debug.recovery = recoveryResult?.debug ?? null;

          billingStatus = await billingService.getBillingStatus({
            userId: payload.userId,
            planHint: req.monetization.plan
          });
        }

        debug.finalPlan = billingStatus.plan;
        debug.finalStatus = billingStatus.status;

        res.json({
          ok: true,
          ...billingStatus,
          debug
        });
      } catch (error) {
        next(error);
      }
    },

    async claimEarlyBird(req, res, next) {
      try {
        const bodyPayload = validateEarlyBirdClaimPayload({
          ...req.body,
          userId: req.body?.userId ?? req.monetization.userId
        });
        const payload = await billingService.claimEarlyBird(bodyPayload);

        res.status(payload.alreadyClaimed ? 200 : 201).json(payload);
      } catch (error) {
        next(error);
      }
    },

    async createCheckoutSession(req, res, next) {
      try {
        const payload = validateCheckoutPayload(req.body, req.monetization.userId);
        const selection = await billingService.createCheckoutSelection(payload);
        const session = await stripeService.createCheckoutSession({
          priceId: selection.priceId,
          userId: selection.userId,
          email: selection.email,
          offerId: selection.offerId,
          planId: selection.planId
        });

        res.status(201).json({
          ok: true,
          sessionId: session.id,
          checkoutUrl: session.url,
          planId: selection.planId,
          offerId: selection.offerId,
          priceId: selection.priceId
        });
      } catch (error) {
        next(tagServiceError(error, "billing", "BILLING_CHECKOUT_FAILED"));
      }
    },

    async requestMagicLink(req, res, next) {
      try {
        const payload = validateMagicLinkRequestPayload(req.body, req.monetization.userId);
        const result = await accountService.createMagicLinkRequest(payload);
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const previewUrl =
          env.authMagicLinkMode === "preview"
            ? `${baseUrl}/auth/magic-link/complete?token=${encodeURIComponent(result.token)}`
            : "";

        res.status(201).json({
          ok: true,
          deliveryMode: result.deliveryMode,
          previewUrl,
          expiresAt: result.expiresAt,
          account: {
            email: result.account.email,
            accountId: result.account.accountId
          }
        });
      } catch (error) {
        next(tagServiceError(error, "auth", "AUTH_MAGIC_LINK_REQUEST_FAILED"));
      }
    },

    async completeMagicLink(req, res, next) {
      try {
        const token = validateMagicLinkToken(req.query.token);
        const restoreResult = await accountService.consumeMagicLink(token);
        const billingStatus = await billingService.getBillingStatus({
          userId: restoreResult.userId
        });

        res
          .type("html")
          .send(
            renderMagicLinkPage({
              email: restoreResult.account?.email,
              plan: billingStatus.plan,
              status: billingStatus.status
            })
          );
      } catch (error) {
        next(error);
      }
    },

    async handleStripeWebhook(req, res, next) {
      try {
        const signature = req.header("stripe-signature");

        if (!signature) {
          const error = new Error("Missing Stripe signature.");
          error.statusCode = 400;
          error.code = "STRIPE_SIGNATURE_MISSING";
          throw error;
        }

        const event = stripeService.constructWebhookEvent(req.body, signature);
        let result = {
          processed: false
        };

        switch (event.type) {
          case "checkout.session.completed":
            result = await billingService.handleStripeCheckoutCompleted(event.data.object);
            break;
          case "invoice.paid":
            result = await billingService.handleStripeInvoicePaid(event.data.object);
            break;
          case "customer.subscription.updated":
            result = await billingService.handleStripeSubscriptionUpdated(event.data.object);
            break;
          case "customer.subscription.deleted":
            result = await billingService.handleStripeSubscriptionDeleted(event.data.object);
            break;
          default:
            result = {
              processed: false,
              ignored: true
            };
            break;
        }

        await billingService.recordWebhookStatus({
          ok: true,
          lastEventType: event.type,
          lastEventAt: new Date().toISOString(),
          lastError: ""
        });

        res.json({
          received: true,
          type: event.type,
          ...result
        });
      } catch (error) {
        await billingService.recordWebhookStatus({
          ok: false,
          lastEventType: "error",
          lastEventAt: new Date().toISOString(),
          lastError: error.message
        });
        next(error);
      }
    }
  };
}
