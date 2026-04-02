import { BILLING_OFFERS, BILLING_PLANS } from "../config/billing.js";

const EARLY_BIRD_COUNTER_KEY = "billing:offer:early_bird_lifetime:claims";
const BILLING_COUNTER_TTL_SECONDS = 60 * 60 * 24 * 365 * 10;
const STRIPE_PRICE_SNAPSHOT_TTL_SECONDS = 60 * 10;

function buildEntitlementKey(userId) {
  return `billing:user:${userId}`;
}

function buildSubscriptionKey(subscriptionId) {
  return `billing:subscription:${subscriptionId}`;
}

function buildCustomerKey(customerId) {
  return `billing:customer:${customerId}`;
}

function buildWebhookStatusKey() {
  return "billing:webhook:last_status";
}

function buildStripePricingSnapshotKey(currency, normalPriceId, earlyPriceId) {
  return `billing:stripe_prices:${currency}:${normalPriceId || "none"}:${earlyPriceId || "none"}`;
}

function entitlementKeyPrefix() {
  return "billing:user:";
}

function browserLinkKeyPrefix() {
  return "account:browser:";
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

function entitlementMigrationScore(entitlement) {
  if (!entitlement) {
    return 0;
  }

  let score = 0;

  if (entitlement.plan === "pro") {
    score += 100;
  }

  if (entitlement.status === "active") {
    score += 40;
  } else if (entitlement.status === "reserved") {
    score += 20;
  } else if (entitlement.status && entitlement.status !== "inactive") {
    score += 10;
  }

  if (entitlement.offerId) {
    score += 5;
  }

  return score;
}

function mapPlan(planConfig, priceMonthlyUsd, currency) {
  return {
    ...planConfig,
    currency,
    priceMonthlyUsd
  };
}

export class BillingService {
  constructor({ cacheService, accountService, stripeService, env }) {
    this.cacheService = cacheService;
    this.accountService = accountService;
    this.stripeService = stripeService;
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
    const stripePricing = await this.getStripePricingSnapshot();
    const earlyBirdStats = await this.getEarlyBirdStats();
    const pricingCurrency =
      stripePricing?.currency || this.env.billingCurrency;
    const proMonthlyPriceUsd =
      stripePricing?.prices?.pro?.priceMonthlyUsd ?? this.env.proMonthlyPriceUsd;
    const earlyBirdProMonthlyPriceUsd =
      stripePricing?.prices?.early_bird_lifetime?.priceMonthlyUsd ??
      this.env.earlyBirdProMonthlyPriceUsd;

    return {
      betaModeEnabled: this.env.betaModeEnabled,
      currency: pricingCurrency,
      supportEmail: this.env.supportEmail,
      plans: {
        free: mapPlan(BILLING_PLANS.free, 0, pricingCurrency),
        pro: mapPlan(BILLING_PLANS.pro, proMonthlyPriceUsd, pricingCurrency)
      },
      offers: {
        early_bird_lifetime: {
          ...BILLING_OFFERS.early_bird_lifetime,
          currency: pricingCurrency,
          priceMonthlyUsd: earlyBirdProMonthlyPriceUsd,
          regularPriceMonthlyUsd: proMonthlyPriceUsd,
          enabled: this.env.earlyBirdOfferEnabled,
          maxClaims: this.env.earlyBirdOfferMaxClaims,
          claimed: earlyBirdStats.claimed,
          remaining: earlyBirdStats.remaining,
          active: earlyBirdStats.active
        }
      }
    };
  }

  async getStripePricingSnapshot() {
    if (!this.stripeService?.getPriceSnapshot) {
      return null;
    }

    const cacheKey = buildStripePricingSnapshotKey(
      this.env.billingCurrency,
      this.env.stripeNormalPriceId,
      this.env.stripeEarlyPriceId
    );
    const cachedSnapshot = await this.cacheService.getJson(cacheKey);

    if (cachedSnapshot) {
      return cachedSnapshot;
    }

    const snapshot = await this.stripeService.getPriceSnapshot({
      normalPriceId: this.env.stripeNormalPriceId,
      earlyPriceId: this.env.stripeEarlyPriceId
    });

    if (!snapshot) {
      return null;
    }

    await this.cacheService.setJson(
      cacheKey,
      snapshot,
      STRIPE_PRICE_SNAPSHOT_TTL_SECONDS
    );

    return snapshot;
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
    let entitlement = ownerUserId
      ? (await this.cacheService.getJson(buildEntitlementKey(ownerUserId))) ?? null
      : null;
    const account = userId && this.accountService ? await this.accountService.getAccountByUserId(userId) : null;

    if (!entitlement && ownerUserId?.startsWith("acct_") && account?.email) {
      entitlement = await this.migrateLegacyEntitlementToAccount({
        accountId: ownerUserId,
        email: account.email
      });
    }

    if (!entitlement && ownerUserId?.startsWith("acct_")) {
      entitlement = await this.migrateLinkedBrowserEntitlementToAccount({
        accountId: ownerUserId
      });
    }

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
      status:
        session.payment_status === "paid" || session.payment_status === "no_payment_required"
          ? "active"
          : "reserved"
    });

    return {
      processed: true,
      userId,
      entitlement
    };
  }

  async handleStripeInvoicePaid(invoice) {
    const userId =
      (invoice.subscription ? await this.lookupUserIdBySubscription(String(invoice.subscription)) : "") ||
      (invoice.customer ? await this.lookupUserIdByCustomer(String(invoice.customer)) : "");

    if (!userId) {
      return {
        processed: false,
        reason: "missing_user_id"
      };
    }

    const entitlement = await this.activateEntitlement({
      userId,
      email: invoice.customer_email ?? "",
      customerId: invoice.customer ? String(invoice.customer) : "",
      subscriptionId: invoice.subscription ? String(invoice.subscription) : "",
      priceId: invoice.lines?.data?.[0]?.price?.id || "",
      offerId: null,
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

  async migrateLegacyEntitlementToAccount({ accountId, email }) {
    const normalizedEmail = String(email ?? "").trim().toLowerCase();

    if (!accountId || !normalizedEmail) {
      return null;
    }

    const entitlementKeys = await this.cacheService.listKeysByPrefix(entitlementKeyPrefix());

    for (const key of entitlementKeys) {
      if (key === buildEntitlementKey(accountId)) {
        continue;
      }

      const entitlement = await this.cacheService.getJson(key);

      if (!entitlement?.email || String(entitlement.email).trim().toLowerCase() !== normalizedEmail) {
        continue;
      }

      const legacyUserId = key.slice(entitlementKeyPrefix().length);

      await this.cacheService.setJson(
        buildEntitlementKey(accountId),
        {
          ...entitlement,
          updatedAt: new Date().toISOString(),
          source: entitlement.source === "stripe" ? "stripe_account_migrated" : entitlement.source
        },
        BILLING_COUNTER_TTL_SECONDS
      );

      if (this.accountService && legacyUserId && legacyUserId !== accountId) {
        await this.accountService.linkUserToAccount(legacyUserId, accountId);
      }

      if (entitlement.stripeSubscriptionId) {
        await this.cacheService.setJson(
          buildSubscriptionKey(entitlement.stripeSubscriptionId),
          { userId: accountId },
          BILLING_COUNTER_TTL_SECONDS
        );
      }

      if (entitlement.stripeCustomerId) {
        await this.cacheService.setJson(
          buildCustomerKey(entitlement.stripeCustomerId),
          { userId: accountId },
          BILLING_COUNTER_TTL_SECONDS
        );
      }

      return {
        ...entitlement,
        updatedAt: new Date().toISOString(),
        source: entitlement.source === "stripe" ? "stripe_account_migrated" : entitlement.source
      };
    }

    return null;
  }

  async migrateLinkedBrowserEntitlementToAccount({ accountId }) {
    if (!accountId) {
      return null;
    }

    const browserLinkKeys = await this.cacheService.listKeysByPrefix(browserLinkKeyPrefix());
    let candidate = null;

    for (const key of browserLinkKeys) {
      const browserUserId = key.slice(browserLinkKeyPrefix().length);

      if (!browserUserId || browserUserId === accountId) {
        continue;
      }

      const link = await this.cacheService.getJson(key);

      if (link?.accountId !== accountId) {
        continue;
      }

      const entitlement = await this.cacheService.getJson(buildEntitlementKey(browserUserId));

      if (!entitlement || entitlement.plan !== "pro") {
        continue;
      }

      if (
        !candidate ||
        entitlementMigrationScore(entitlement) > entitlementMigrationScore(candidate.entitlement)
      ) {
        candidate = {
          browserUserId,
          entitlement
        };
      }
    }

    if (!candidate) {
      return null;
    }

    const migratedEntitlement = {
      ...candidate.entitlement,
      updatedAt: new Date().toISOString(),
      source:
        candidate.entitlement.source === "stripe"
          ? "stripe_browser_link_migrated"
          : candidate.entitlement.source
    };

    await this.cacheService.setJson(
      buildEntitlementKey(accountId),
      migratedEntitlement,
      BILLING_COUNTER_TTL_SECONDS
    );

    if (candidate.entitlement.stripeSubscriptionId) {
      await this.cacheService.setJson(
        buildSubscriptionKey(candidate.entitlement.stripeSubscriptionId),
        { userId: accountId },
        BILLING_COUNTER_TTL_SECONDS
      );
    }

    if (candidate.entitlement.stripeCustomerId) {
      await this.cacheService.setJson(
        buildCustomerKey(candidate.entitlement.stripeCustomerId),
        { userId: accountId },
        BILLING_COUNTER_TTL_SECONDS
      );
    }

    return migratedEntitlement;
  }

  async recoverEntitlementByEmail({ userId, email }) {
    const normalizedEmail = String(email ?? "").trim().toLowerCase();

    if (!normalizedEmail || !this.stripeService?.findRecoverableSubscriptionByEmail) {
      return {
        entitlement: null,
        debug: {
          attempted: false,
          reason: "stripe_lookup_unavailable",
          email: normalizedEmail
        }
      };
    }

    const subscription = await this.stripeService.findRecoverableSubscriptionByEmail(normalizedEmail);

    if (!subscription?.subscriptionId) {
      return {
        entitlement: null,
        debug: {
          attempted: true,
          recovered: false,
          email: normalizedEmail,
          stripe: subscription ?? {
            found: false,
            lookupSource: "none",
            email: normalizedEmail
          }
        }
      };
    }

    const offerId =
      subscription.metadata?.offerId ||
      (subscription.priceId === this.env.stripeEarlyPriceId
        ? BILLING_OFFERS.early_bird_lifetime.id
        : null);

    const entitlement = await this.activateEntitlement({
      userId,
      email: normalizedEmail,
      customerId: subscription.customerId || "",
      subscriptionId: subscription.subscriptionId,
      priceId: subscription.priceId || "",
      offerId,
      status: subscription.status || "active"
    });

    return {
      entitlement,
      debug: {
        attempted: true,
        recovered: true,
        email: normalizedEmail,
        stripe: subscription
      }
    };
  }

  async getWebhookStatus() {
    return (
      (await this.cacheService.getJson(buildWebhookStatusKey())) ?? {
        ok: false,
        lastEventType: "",
        lastEventAt: "",
        lastProcessedAt: "",
        lastError: ""
      }
    );
  }

  async recordWebhookStatus(status) {
    await this.cacheService.setJson(
      buildWebhookStatusKey(),
      {
        ok: Boolean(status?.ok),
        lastEventType: status?.lastEventType ?? "",
        lastEventAt: status?.lastEventAt ?? "",
        lastProcessedAt: new Date().toISOString(),
        lastError: status?.lastError ?? ""
      },
      BILLING_COUNTER_TTL_SECONDS
    );
  }

  async getEntitlementForOwner(ownerId) {
    if (!ownerId) {
      return null;
    }

    return this.cacheService.getJson(buildEntitlementKey(ownerId));
  }

  async getSupportSnapshot({ email = "", userId = "", accountId = "" }) {
    const requestedEmail = String(email ?? "").trim().toLowerCase();
    const normalizedUserId = userId || "";
    let resolvedAccount = null;

    if (accountId) {
      resolvedAccount = this.accountService
        ? await this.accountService.getAccountById(accountId)
        : null;
    } else if (requestedEmail && this.accountService) {
      resolvedAccount = await this.accountService.findAccountByEmail(requestedEmail);
    } else if (normalizedUserId && this.accountService) {
      resolvedAccount = await this.accountService.getAccountByUserId(normalizedUserId);
    }

    const resolvedAccountId = resolvedAccount?.accountId ?? accountId ?? "";
    const linkedBrowserIds =
      resolvedAccountId && this.accountService
        ? await this.accountService.listLinkedBrowserIds(resolvedAccountId)
        : [];
    const browserLinkedAccountId =
      normalizedUserId && this.accountService
        ? await this.accountService.getLinkedAccountIdForUser(normalizedUserId)
        : "";
    const ownerId =
      resolvedAccountId ||
      (normalizedUserId ? await this.resolveBillingOwnerId(normalizedUserId) : "");
    const entitlement = ownerId ? await this.getEntitlementForOwner(ownerId) : null;
    const billingStatus =
      normalizedUserId
        ? await this.getBillingStatus({ userId: normalizedUserId })
        : resolvedAccountId
          ? {
              ...(await this.getBillingStatus({ userId: resolvedAccountId })),
              userId: resolvedAccountId
            }
          : null;
    const normalizedEmail =
      requestedEmail ||
      resolvedAccount?.email ||
      billingStatus?.account?.email ||
      "";
    const stripeRecovery =
      normalizedEmail && this.stripeService?.findRecoverableSubscriptionByEmail
        ? await this.stripeService.findRecoverableSubscriptionByEmail(normalizedEmail)
        : null;
    const webhookStatus = await this.getWebhookStatus();

    return {
      lookup: {
        email: normalizedEmail,
        userId: normalizedUserId,
        accountId: resolvedAccountId
      },
      account: resolvedAccount
        ? {
            ...resolvedAccount,
            linkedBrowserIds
          }
        : null,
      browser: normalizedUserId
        ? {
            userId: normalizedUserId,
            linkedAccountId: browserLinkedAccountId,
            resolvedOwnerId: ownerId
          }
        : null,
      entitlement: entitlement
        ? {
            ...entitlement,
            ownerId
          }
        : null,
      billingStatus,
      stripe: stripeRecovery,
      webhooks: webhookStatus
    };
  }
}
