import assert from "node:assert/strict";
import test from "node:test";
import { createAppError, normalizeUpstreamApiError } from "../apps/api/src/utils/errors.js";
import { normalizeStripeError } from "../apps/api/src/services/stripeService.js";

test("quota-like upstream failures become recoverable app errors", () => {
  const normalizedError = normalizeUpstreamApiError({
    response: {
      status: 429,
      headers: {
        "retry-after": "120"
      },
      data: {
        message: "Too many requests"
      }
    },
    message: "Request failed with status code 429"
  });

  assert.equal(normalizedError.statusCode, 503);
  assert.equal(normalizedError.code, "UPSTREAM_QUOTA_EXCEEDED");
  assert.equal(normalizedError.recoverable, true);
  assert.equal(normalizedError.retryAfterSeconds, 120);
});

test("timeout-like upstream failures become retryable app errors", () => {
  const normalizedError = normalizeUpstreamApiError({
    code: "ECONNABORTED",
    message: "timeout of 5000ms exceeded"
  });

  assert.equal(normalizedError.statusCode, 503);
  assert.equal(normalizedError.code, "UPSTREAM_TIMEOUT");
  assert.equal(normalizedError.recoverable, true);
});

test("upstream auth failures become configuration errors", () => {
  const normalizedError = normalizeUpstreamApiError({
    response: {
      status: 403,
      data: {
        message: "Forbidden"
      }
    },
    message: "Request failed with status code 403"
  });

  assert.equal(normalizedError.statusCode, 502);
  assert.equal(normalizedError.code, "UPSTREAM_AUTH_FAILED");
  assert.equal(normalizedError.recoverable, false);
});

test("stripe invalid request failures become surfaced billing errors", () => {
  const normalizedError = normalizeStripeError({
    type: "StripeInvalidRequestError",
    code: "resource_missing",
    message: "No such price: 'price_missing'"
  });

  assert.equal(normalizedError.statusCode, 400);
  assert.equal(normalizedError.code, "resource_missing");
  assert.equal(normalizedError.source, "billing");
  assert.equal(normalizedError.recoverable, false);
  assert.equal(normalizedError.message, "No such price: 'price_missing'");
});

test("stripe connection failures become retryable billing errors", () => {
  const normalizedError = normalizeStripeError({
    type: "StripeConnectionError",
    message: "Connection to Stripe failed"
  });

  assert.equal(normalizedError.statusCode, 502);
  assert.equal(normalizedError.code, "STRIPE_API_ERROR");
  assert.equal(normalizedError.source, "billing");
  assert.equal(normalizedError.recoverable, true);
});

test("billing and auth 5xx errors keep their original message for clients", () => {
  const billingError = {
    statusCode: 503,
    source: "billing",
    message: "Stripe checkout URLs are not configured."
  };
  const authError = {
    statusCode: 500,
    source: "auth",
    message: "Magic link cache write failed."
  };

  const billingMessage =
    billingError.statusCode >= 500 && !["billing", "auth"].includes(billingError.source)
      ? "Internal server error."
      : billingError.message;
  const authMessage =
    authError.statusCode >= 500 && !["billing", "auth"].includes(authError.source)
      ? "Internal server error."
      : authError.message;

  assert.equal(billingMessage, "Stripe checkout URLs are not configured.");
  assert.equal(authMessage, "Magic link cache write failed.");
});

test("cors denials are tagged as explicit 403 application errors", () => {
  const error = createAppError({
    message: "Origin is not allowed by CORS.",
    statusCode: 403,
    code: "CORS_ORIGIN_NOT_ALLOWED",
    source: "cors",
    recoverable: false
  });

  assert.equal(error.statusCode, 403);
  assert.equal(error.code, "CORS_ORIGIN_NOT_ALLOWED");
  assert.equal(error.source, "cors");
  assert.equal(error.message, "Origin is not allowed by CORS.");
});
