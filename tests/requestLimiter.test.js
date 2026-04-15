import assert from "node:assert/strict";
import test from "node:test";
import { createRequestLimiter, requestLimiterInternals } from "../apps/api/src/middleware/requestLimiter.js";
import { CacheService } from "../apps/api/src/services/cacheService.js";

function createResponseMock() {
  return {
    statusCode: 200,
    headers: new Map(),
    body: null,
    sent: false,
    setHeader(name, value) {
      this.headers.set(name, value);
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.sent = true;
      return this;
    }
  };
}

function createRequestMock(overrides = {}) {
  return {
    method: "GET",
    path: "/match-impact",
    monetization: {
      plan: "free",
      userId: "anonymous"
    },
    ip: "203.0.113.10",
    socket: {
      remoteAddress: "203.0.113.10"
    },
    header(name) {
      return this.headers?.[name.toLowerCase()];
    },
    ...overrides
  };
}

test("request limiter uses user id when available", () => {
  const identifier = requestLimiterInternals.getClientIdentifier(
    createRequestMock({
      monetization: {
        plan: "pro",
        userId: "user-42"
      }
    })
  );

  assert.deepEqual(identifier, {
    type: "user",
    value: "user-42"
  });
});

test("request limiter falls back to forwarded ip", () => {
  const identifier = requestLimiterInternals.getClientIdentifier(
    createRequestMock({
      headers: {
        "x-forwarded-for": "198.51.100.20, 10.0.0.1"
      }
    })
  );

  assert.deepEqual(identifier, {
    type: "ip",
    value: "198.51.100.20"
  });
});

test("request limiter blocks requests after the configured limit", async () => {
  const cacheService = new CacheService({
    redisUrl: ""
  });
  const limiter = createRequestLimiter({
    cacheService,
    env: {
      rateLimitEnabled: true,
      rateLimitWindowSeconds: 60,
      freeReadLimitPerWindow: 2,
      proReadLimitPerWindow: 5,
      freeAnalyticsLimitPerWindow: 2,
      proAnalyticsLimitPerWindow: 4,
      adminLimitPerWindow: 1
    }
  });

  let nextCalls = 0;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const req = createRequestMock();
    const res = createResponseMock();

    await limiter(req, res, () => {
      nextCalls += 1;
    });

    assert.equal(res.sent, false);
    assert.equal(req.requestLimit.exceeded, false);
  }

  const blockedReq = createRequestMock();
  const blockedRes = createResponseMock();

  await limiter(blockedReq, blockedRes, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 2);
  assert.equal(blockedRes.statusCode, 429);
  assert.equal(blockedRes.sent, true);
  assert.equal(blockedReq.requestLimit.exceeded, true);
  assert.equal(blockedRes.body.error, "Rate limit exceeded.");
  assert.equal(blockedRes.headers.get("X-RateLimit-Limit"), "2");
  assert.equal(blockedRes.headers.get("X-RateLimit-Remaining"), "0");
  assert.ok(blockedRes.headers.get("Retry-After"));
});

test("analytics summary uses the admin bucket", () => {
  const limit = requestLimiterInternals.resolveLimit({
    bucket: "admin",
    plan: "pro",
    env: {
      adminLimitPerWindow: 7,
      proAnalyticsLimitPerWindow: 99,
      freeAnalyticsLimitPerWindow: 99,
      proReadLimitPerWindow: 99,
      freeReadLimitPerWindow: 99
    }
  });

  assert.equal(limit, 7);
});
