import Stripe from "stripe";

function createConfigurationError(message, code = "STRIPE_NOT_CONFIGURED") {
  const error = new Error(message);
  error.statusCode = 503;
  error.code = code;
  error.source = "billing";
  error.recoverable = false;
  return error;
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
    if (!this.enabled || !this.client || !email) {
      return null;
    }

    const customers = await this.client.customers.list({
      email,
      limit: 10
    });

    for (const customer of customers.data) {
      const subscriptions = await this.client.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 10
      });

      const recoverableSubscription = subscriptions.data.find((subscription) =>
        ["active", "trialing", "past_due", "unpaid"].includes(subscription.status)
      );

      if (recoverableSubscription) {
        return {
          email,
          customerId: customer.id,
          subscriptionId: recoverableSubscription.id,
          status: recoverableSubscription.status,
          priceId: recoverableSubscription.items?.data?.[0]?.price?.id || "",
          metadata: recoverableSubscription.metadata ?? {}
        };
      }
    }

    return null;
  }
}
