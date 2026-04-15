import test from "node:test";
import assert from "node:assert/strict";

import {
  buildIdentityHeaders,
  createFootballSdk,
  createRequesterBackedSdk,
  normalizeBaseUrl
} from "../packages/sdk-football/src/index.js";

test("sdk builds normalized identity headers", () => {
  assert.deepEqual(buildIdentityHeaders({ userId: "abc", plan: "pro" }), {
    "Content-Type": "application/json",
    "x-live-impact-user": "abc",
    "x-live-impact-plan": "pro"
  });
});

test("sdk normalizes base URLs", () => {
  assert.equal(normalizeBaseUrl("https://example.com/"), "https://example.com");
});

test("sdk builds match-impact requests with query params and shared headers", async () => {
  const calls = [];
  const sdk = createFootballSdk({
    baseUrl: "https://example.com/",
    userId: "user-1",
    plan: "free",
    requester: async (request) => {
      calls.push(request);
      return { ok: true };
    }
  });

  await sdk.getMatchImpact({ fixtureId: 1234 });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[0].url, "https://example.com/match-impact?fixture_id=1234");
  assert.equal(calls[0].headers["x-live-impact-user"], "user-1");
  assert.equal(calls[0].headers["x-live-impact-plan"], "free");
});

test("sdk sends POST bodies through the shared requester", async () => {
  const calls = [];
  const sdk = createRequesterBackedSdk({
    baseUrl: "https://example.com",
    getHeaders: () => ({
      "Content-Type": "application/json",
      "x-live-impact-user": "user-2",
      "x-live-impact-plan": "pro"
    }),
    requester: async (request) => {
      calls.push(request);
      return { accepted: true };
    }
  });

  await sdk.trackSession({
    fixtureId: 10,
    durationMs: 5000
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].url, "https://example.com/track/session");
  assert.deepEqual(calls[0].body, {
    fixtureId: 10,
    durationMs: 5000
  });
});
