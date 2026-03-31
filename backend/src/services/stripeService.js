import Stripe from "stripe";

function createConfigurationError(message, code = "STRIPE_NOT_CONFIGURED") {
  const error = new Error(message);
  error.statusCode = 503;
  error.code = code;
  error.source = "billing";
  error.recoverable = false;
  return error;
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function isRecoverableSubscriptionStatus(status) {
  return ["active", "trialing", "past_due", "unpaid"].includes(status);
}

export class StripeService {
  constructor({ env }) {
    this.env = env;
    this.enabled = Boolean(env.stripeSecretKey);
    this.client = this.enabled ? new Stripe(env.stripeSecretKey) : null;
  }

  getStatus() {
    return {
      enabled: this.enabled,
      pricesConfigured: Boolean(this.env.stripeNormalPriceId && this.env.stripeEarlyPriceId),
      webhookConfigured: Boolean(this.env.stripeWebhookSecret),
      successUrlConfigured: Boolean(this.env.stripeSuccessUrl),
      cancelUrlConfigured: Boolean(this.env.stripeCancelUrl)
    };
  }

  assertCheckoutReady() {
    if (!this.enabled || !this.client) {
      throw createConfigurationError("Stripe is not configured.");
    }

    if (!this.env.stripeSuccessUrl || !this.env.stripeCancelUrl) {
      throw createConfigurationError(
        "Stripe checkout URLs are not configured.",
        "STRIPE_URLS_NOT_CONFIGURED"
      );
    }
  }

  assertWebhookReady() {
    if (!this.enabled || !this.client) {
      throw createConfigurationError("Stripe is not configured.");
    }

    if (!this.env.stripeWebhookSecret) {
      throw createConfigurationError(
        "Stripe webhook secret is not configured.",
        "STRIPE_WEBHOOK_NOT_CONFIGURED"
      );
    }
  }

  async createCheckoutSession({ priceId, userId, email, offerId, planId }) {
    this.assertCheckoutReady();

    if (!priceId) {
      throw createConfigurationError("Stripe price ID is missing.", "STRIPE_PRICE_NOT_CONFIGURED");
    }

    const metadata = {
      userId,
      offerId: offerId ?? "",
      planId,
      priceId
    };

    const session = await this.client.checkout.sessions.create({
      mode: "subscription",
      success_url: this.env.stripeSuccessUrl,
      cancel_url: this.env.stripeCancelUrl,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      allow_promotion_codes: false,
      client_reference_id: userId,
      customer_email: email || undefined,
      metadata,
      subscription_data: {
        metadata: {
          ...metadata,
          priceId
        }
      }
    });

    return {
      id: session.id,
      url: session.url,
      priceId
    };
  }

  constructWebhookEvent(payload, signature) {
    this.assertWebhookReady();

    return this.client.webhooks.constructEvent(
      payload,
      signature,
      this.env.stripeWebhookSecret
    );
  }

  async findRecoverableSubscriptionByEmail(email) {
    const normalizedEmail = normalizeEmail(email);

    if (!this.enabled || !this.client || !normalizedEmail) {
      return null;
    }

    const customers = await this.client.customers.list({
      email: normalizedEmail,
      limit: 10
    });
    const customerCount = customers.data.length;

    for (const customer of customers.data) {
      const subscriptions = await this.client.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 10
      });

      const recoverableSubscription = subscriptions.data.find((subscription) =>
        isRecoverableSubscriptionStatus(subscription.status)
      );

      if (recoverableSubscription) {
        return {
          found: true,
          lookupSource: "customer",
          email: normalizedEmail,
          customerCount,
          sessionCount: 0,
          customerId: customer.id,
          subscriptionId: recoverableSubscription.id,
          status: recoverableSubscription.status,
          priceId: recoverableSubscription.items?.data?.[0]?.price?.id || "",
          metadata: recoverableSubscription.metadata ?? {}
        };
      }
    }

    const sessions = await this.client.checkout.sessions.list({
      limit: 25
    });
    const sessionCount = sessions.data.length;

    for (const session of sessions.data) {
      const sessionEmail = normalizeEmail(
        session.customer_details?.email ?? session.customer_email ?? ""
      );

      if (session.mode !== "subscription" || sessionEmail !== normalizedEmail || !session.subscription) {
        continue;
      }

      const subscription = await this.client.subscriptions.retrieve(String(session.subscription));

      if (!isRecoverableSubscriptionStatus(subscription.status)) {
        continue;
      }

      return {
        found: true,
        lookupSource: "checkout_session",
        email: normalizedEmail,
        customerCount,
        sessionCount,
        subscriptionCount: 0,
        customerId: subscription.customer ? String(subscription.customer) : "",
        subscriptionId: subscription.id,
        status: subscription.status,
        priceId: subscription.items?.data?.[0]?.price?.id || "",
        metadata: subscription.metadata ?? {}
      };
    }

    const subscriptions = await this.client.subscriptions.list({
      status: "all",
      limit: 100
    });
    const subscriptionCount = subscriptions.data.length;

    for (const subscription of subscriptions.data) {
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id || "";

      if (!customerId) {
        continue;
      }

      const customer = await this.client.customers.retrieve(customerId);
      const customerEmail = normalizeEmail(customer?.email ?? "");

      if (customerEmail !== normalizedEmail || !isRecoverableSubscriptionStatus(subscription.status)) {
        continue;
      }

      return {
        found: true,
        lookupSource: "subscription_scan",
        email: normalizedEmail,
        customerCount,
        sessionCount,
        subscriptionCount,
        customerId,
        subscriptionId: subscription.id,
        status: subscription.status,
        priceId: subscription.items?.data?.[0]?.price?.id || "",
        metadata: subscription.metadata ?? {}
      };
    }

    return {
      found: false,
      lookupSource: "none",
      email: normalizedEmail,
      customerCount,
      sessionCount,
      subscriptionCount
    };
  }
}
