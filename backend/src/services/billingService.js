import { BILLING_OFFERS, BILLING_PLANS } from "../config/billing.js";

const EARLY_BIRD_COUNTER_KEY = "billing:offer:early_bird_lifetime:claims";
const BILLING_COUNTER_TTL_SECONDS = 60 * 60 * 24 * 365 * 10;

function buildEntitlementKey(userId) {
  return `billing:user:${userId}`;
}

function buildSubscriptionKey(subscriptionId) {
  return `billing:subscription:${subscriptionId}`;
}

function buildCustomerKey(customerId) {
  return `billing:customer:${customerId}`;
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
  constructor({ cacheService, accountService, env }) {
    this.cacheService = cacheService;
    this.accountService = accountService;
    this.env = env;
  }

  async resolveBillingOwnerId(userId) {
    if (!userId) {
      return "";
    }

    if (!this.accountService) {
      return userId;
    }

    return (await this.accountService.resolveOwnerId(userId)) || userId;
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
    const ownerUserId = userId ? await this.resolveBillingOwnerId(userId) : "";
    const entitlement = ownerUserId
      ? (await this.cacheService.getJson(buildEntitlementKey(ownerUserId))) ?? null
      : null;
    const account = userId && this.accountService ? await this.accountService.getAccountByUserId(userId) : null;
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
      account: {
        linked: Boolean(account),
        accountId: account?.accountId ?? "",
        email: account?.email ?? ""
      },
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
    const ownerUserId = await this.resolveBillingOwnerId(userId);
    const entitlementKey = buildEntitlementKey(ownerUserId);
    const existingEntitlement = await this.cacheService.getJson(entitlementKey);

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
      entitlementKey,
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

  async createCheckoutSelection({ userId, email, offerId }) {
    const ownerUserId = await this.resolveBillingOwnerId(userId);
    const existingEntitlement = await this.cacheService.getJson(buildEntitlementKey(ownerUserId));
    const wantsEarlyBird =
      offerId === BILLING_OFFERS.early_bird_lifetime.id ||
      existingEntitlement?.offerId === BILLING_OFFERS.early_bird_lifetime.id;

    if (existingEntitlement?.status === "active" && existingEntitlement?.plan === "pro") {
      const error = new Error("User already has an active Pro subscription.");
      error.statusCode = 409;
      error.code = "BILLING_ALREADY_ACTIVE";
      throw error;
    }

    let selectedOfferId = null;
    let grandfatheredPriceUsd = null;
    let priceId = this.env.stripeNormalPriceId;

    if (wantsEarlyBird) {
      if (existingEntitlement?.offerId !== BILLING_OFFERS.early_bird_lifetime.id) {
        await this.claimEarlyBird({ userId, email });
      }

      selectedOfferId = BILLING_OFFERS.early_bird_lifetime.id;
      grandfatheredPriceUsd = this.env.earlyBirdProMonthlyPriceUsd;
      priceId = this.env.stripeEarlyPriceId;
    }

    if (!priceId) {
      const error = new Error("Stripe price is not configured for the selected plan.");
      error.statusCode = 503;
      error.code = "STRIPE_PRICE_NOT_CONFIGURED";
      error.source = "billing";
      throw error;
    }

    return {
      userId,
      email,
      planId: BILLING_PLANS.pro.id,
      priceId,
      offerId: selectedOfferId,
      grandfatheredPriceUsd
    };
  }

  async activateEntitlement({
    userId,
    email = "",
    customerId = "",
    subscriptionId = "",
    priceId = "",
    offerId = null,
    status = "active"
  }) {
    let targetUserId = await this.resolveBillingOwnerId(userId);

    if (email && this.accountService) {
      const account = await this.accountService.findOrCreateAccountByEmail(email);

      if (account?.accountId) {
        targetUserId = account.accountId;

        if (userId && userId !== targetUserId) {
          await this.accountService.linkUserToAccount(userId, targetUserId);
        }
      }
    }

    targetUserId = targetUserId || userId;

    const existingEntitlement =
      (await this.cacheService.getJson(buildEntitlementKey(targetUserId))) ??
      createDefaultEntitlement();

    const normalizedOfferId =
      offerId || (existingEntitlement.offerId === BILLING_OFFERS.early_bird_lifetime.id
        ? existingEntitlement.offerId
        : null);

    const entitlement = {
      plan: BILLING_PLANS.pro.id,
      offerId: normalizedOfferId,
      status,
      grandfatheredPriceUsd:
        normalizedOfferId === BILLING_OFFERS.early_bird_lifetime.id
          ? this.env.earlyBirdProMonthlyPriceUsd
          : null,
      betaUser: existingEntitlement.betaUser || normalizedOfferId === BILLING_OFFERS.early_bird_lifetime.id,
      email: email || existingEntitlement.email || "",
      source: "stripe",
      stripeCustomerId: customerId || existingEntitlement.stripeCustomerId || "",
      stripeSubscriptionId: subscriptionId || existingEntitlement.stripeSubscriptionId || "",
      stripePriceId: priceId || existingEntitlement.stripePriceId || "",
      updatedAt: new Date().toISOString()
    };

    await this.cacheService.setJson(
      buildEntitlementKey(targetUserId),
      entitlement,
      BILLING_COUNTER_TTL_SECONDS
    );

    if (subscriptionId) {
      await this.cacheService.setJson(
        buildSubscriptionKey(subscriptionId),
        { userId: targetUserId },
        BILLING_COUNTER_TTL_SECONDS
      );
    }

    if (customerId) {
      await this.cacheService.setJson(
        buildCustomerKey(customerId),
        { userId: targetUserId },
        BILLING_COUNTER_TTL_SECONDS
      );
    }

    return entitlement;
  }

  async handleStripeCheckoutCompleted(session) {
    const userId =
      session.metadata?.userId ||
      session.client_reference_id ||
      (session.subscription ? await this.lookupUserIdBySubscription(String(session.subscription)) : "");

    if (!userId) {
      return {
        processed: false,
        reason: "missing_user_id"
      };
    }

    const entitlement = await this.activateEntitlement({
      userId,
      email: session.customer_details?.email ?? session.customer_email ?? "",
      customerId: session.customer ? String(session.customer) : "",
      subscriptionId: session.subscription ? String(session.subscription) : "",
      priceId: session.metadata?.priceId ?? "",
      offerId: session.metadata?.offerId || null,
      status: "active"
    });

    return {
      processed: true,
      userId,
      entitlement
    };
  }

  async handleStripeSubscriptionUpdated(subscription) {
    const userId =
      subscription.metadata?.userId ||
      (subscription.id ? await this.lookupUserIdBySubscription(String(subscription.id)) : "") ||
      (subscription.customer ? await this.lookupUserIdByCustomer(String(subscription.customer)) : "");

    if (!userId) {
      return {
        processed: false,
        reason: "missing_user_id"
      };
    }

    const entitlement = await this.activateEntitlement({
      userId,
      email: "",
      customerId: subscription.customer ? String(subscription.customer) : "",
      subscriptionId: subscription.id ? String(subscription.id) : "",
      priceId: subscription.metadata?.priceId || subscription.items?.data?.[0]?.price?.id || "",
      offerId: subscription.metadata?.offerId || null,
      status: subscription.status || "active"
    });

    return {
      processed: true,
      userId,
      entitlement
    };
  }

  async handleStripeSubscriptionDeleted(subscription) {
    return this.handleStripeSubscriptionUpdated({
      ...subscription,
      status: "canceled"
    });
  }

  async lookupUserIdBySubscription(subscriptionId) {
    if (!subscriptionId) {
      return "";
    }

    const mapping = await this.cacheService.getJson(buildSubscriptionKey(subscriptionId));
    return mapping?.userId ?? "";
  }

  async lookupUserIdByCustomer(customerId) {
    if (!customerId) {
      return "";
    }

    const mapping = await this.cacheService.getJson(buildCustomerKey(customerId));
    return mapping?.userId ?? "";
  }
}
