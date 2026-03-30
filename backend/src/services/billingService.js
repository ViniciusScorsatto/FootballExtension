import { BILLING_OFFERS, BILLING_PLANS } from "../config/billing.js";

const EARLY_BIRD_COUNTER_KEY = "billing:offer:early_bird_lifetime:claims";
const BILLING_COUNTER_TTL_SECONDS = 60 * 60 * 24 * 365 * 10;

function buildEntitlementKey(userId) {
  return `billing:user:${userId}`;
}

function createDefaultEntitlement() {
  return {
    plan: "free",
    offerId: null,
    status: "inactive",
    grandfatheredPriceUsd: null,
    betaUser: false,
    source: "default",
    updatedAt: new Date().toISOString()
  };
}

function mapPlan(planConfig, priceMonthlyUsd, currency) {
  return {
    ...planConfig,
    currency,
    priceMonthlyUsd
  };
}

export class BillingService {
  constructor({ cacheService, env }) {
    this.cacheService = cacheService;
    this.env = env;
  }

  async getPricingCatalog() {
    const earlyBirdStats = await this.getEarlyBirdStats();

    return {
      betaModeEnabled: this.env.betaModeEnabled,
      currency: this.env.billingCurrency,
      supportEmail: this.env.supportEmail,
      plans: {
        free: mapPlan(BILLING_PLANS.free, 0, this.env.billingCurrency),
        pro: mapPlan(BILLING_PLANS.pro, this.env.proMonthlyPriceUsd, this.env.billingCurrency)
      },
      offers: {
        early_bird_lifetime: {
          ...BILLING_OFFERS.early_bird_lifetime,
          currency: this.env.billingCurrency,
          priceMonthlyUsd: this.env.earlyBirdProMonthlyPriceUsd,
          regularPriceMonthlyUsd: this.env.proMonthlyPriceUsd,
          enabled: this.env.earlyBirdOfferEnabled,
          maxClaims: this.env.earlyBirdOfferMaxClaims,
          claimed: earlyBirdStats.claimed,
          remaining: earlyBirdStats.remaining,
          active: earlyBirdStats.active
        }
      }
    };
  }

  async getEarlyBirdStats() {
    const claimed = await this.cacheService.getCounter(EARLY_BIRD_COUNTER_KEY);
    const remaining = Math.max(0, this.env.earlyBirdOfferMaxClaims - claimed);

    return {
      claimed,
      remaining,
      active: this.env.earlyBirdOfferEnabled && remaining > 0
    };
  }

  async getBillingStatus({ userId, planHint = "free" }) {
    const entitlement = userId
      ? (await this.cacheService.getJson(buildEntitlementKey(userId))) ?? null
      : null;
    const pricing = await this.getPricingCatalog();
    const earlyBirdStats = pricing.offers.early_bird_lifetime;
    const effectiveEntitlement = entitlement ?? {
      ...createDefaultEntitlement(),
      plan: planHint === "pro" ? "pro" : "free",
      status: planHint === "pro" ? "active" : "inactive",
      source: planHint === "pro" ? "header" : "default"
    };

    return {
      userId: userId || "anonymous",
      betaModeEnabled: this.env.betaModeEnabled,
      plan: effectiveEntitlement.plan,
      status: effectiveEntitlement.status,
      offerId: effectiveEntitlement.offerId,
      grandfatheredPriceUsd: effectiveEntitlement.grandfatheredPriceUsd,
      betaUser: effectiveEntitlement.betaUser,
      planDetails: pricing.plans[effectiveEntitlement.plan] ?? pricing.plans.free,
      offers: {
        earlyBirdEligible:
          effectiveEntitlement.plan === "free" &&
          effectiveEntitlement.offerId !== BILLING_OFFERS.early_bird_lifetime.id &&
          earlyBirdStats.active,
        earlyBirdActive: earlyBirdStats.active,
        earlyBirdRemaining: earlyBirdStats.remaining
      },
      updatedAt: effectiveEntitlement.updatedAt
    };
  }

  async claimEarlyBird({ userId, email }) {
    const existingEntitlement = await this.cacheService.getJson(buildEntitlementKey(userId));

    if (existingEntitlement?.offerId === BILLING_OFFERS.early_bird_lifetime.id) {
      return {
        claimed: true,
        alreadyClaimed: true,
        entitlement: existingEntitlement,
        stats: await this.getEarlyBirdStats()
      };
    }

    const stats = await this.getEarlyBirdStats();

    if (!stats.active) {
      const error = new Error("Early Bird Pro is no longer available.");
      error.statusCode = 409;
      error.code = "EARLY_BIRD_CLOSED";
      throw error;
    }

    const claimedCount = await this.cacheService.incrementCounter(
      EARLY_BIRD_COUNTER_KEY,
      BILLING_COUNTER_TTL_SECONDS,
      1
    );

    if (claimedCount.count > this.env.earlyBirdOfferMaxClaims) {
      const error = new Error("Early Bird Pro is no longer available.");
      error.statusCode = 409;
      error.code = "EARLY_BIRD_CLOSED";
      throw error;
    }

    const entitlement = {
      plan: "pro",
      offerId: BILLING_OFFERS.early_bird_lifetime.id,
      status: "reserved",
      grandfatheredPriceUsd: this.env.earlyBirdProMonthlyPriceUsd,
      betaUser: true,
      email,
      source: "early_bird_claim",
      updatedAt: new Date().toISOString()
    };

    await this.cacheService.setJson(
      buildEntitlementKey(userId),
      entitlement,
      BILLING_COUNTER_TTL_SECONDS
    );

    return {
      claimed: true,
      alreadyClaimed: false,
      entitlement,
      stats: await this.getEarlyBirdStats()
    };
  }
}
