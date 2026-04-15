import assert from "node:assert/strict";
import test from "node:test";
import { normalizeUpstreamApiError } from "../apps/api/src/utils/errors.js";

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
