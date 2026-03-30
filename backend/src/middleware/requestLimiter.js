function clampLimit(limit) {
  return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 1;
}

function getNormalizedPlan(plan) {
  const normalizedPlan = typeof plan === "string" ? plan.trim().toLowerCase() : "free";
  return normalizedPlan === "pro" ? "pro" : "free";
}

function getRequestBucket(req) {
  if (req.method === "POST" && req.path.startsWith("/track/")) {
    return "analytics";
  }

  if (req.path === "/analytics/summary" || req.path === "/admin/health") {
    return "admin";
  }

  return "read";
}

function getClientIdentifier(req) {
  const monetizedUserId = req.monetization?.userId;

  if (monetizedUserId && monetizedUserId !== "anonymous") {
    return {
      type: "user",
      value: monetizedUserId
    };
  }

  const forwardedForHeader = req.header("x-forwarded-for");
  const forwardedIp = forwardedForHeader?.split(",")[0]?.trim();
  const ipAddress = forwardedIp || req.ip || req.socket?.remoteAddress || "unknown";

  return {
    type: "ip",
    value: ipAddress
  };
}

function resolveLimit({ bucket, plan, env }) {
  if (bucket === "admin") {
    return clampLimit(env.adminLimitPerWindow);
  }

  if (bucket === "analytics") {
    return clampLimit(plan === "pro" ? env.proAnalyticsLimitPerWindow : env.freeAnalyticsLimitPerWindow);
  }

  return clampLimit(plan === "pro" ? env.proReadLimitPerWindow : env.freeReadLimitPerWindow);
}

function formatRequestLimitState({ enabled, bucket, plan, identifier, limit, remaining, resetAt, exceeded }) {
  return {
    enabled,
    bucket,
    plan,
    identifier,
    limit,
    remaining,
    resetAt,
    exceeded
  };
}

export function createRequestLimiter({ cacheService, env }) {
  return async function requestLimiter(req, res, next) {
    if (!env.rateLimitEnabled || req.path === "/health") {
      req.requestLimit = formatRequestLimitState({
        enabled: false,
        bucket: getRequestBucket(req),
        plan: getNormalizedPlan(req.monetization?.plan),
        identifier: getClientIdentifier(req),
        limit: null,
        remaining: null,
        resetAt: null,
        exceeded: false
      });
      next();
      return;
    }

    const plan = getNormalizedPlan(req.monetization?.plan);
    const bucket = getRequestBucket(req);
    const identifier = getClientIdentifier(req);
    const limit = resolveLimit({ bucket, plan, env });
    const windowSeconds = Math.max(1, env.rateLimitWindowSeconds);
    const key = `ratelimit:${bucket}:${plan}:${identifier.type}:${identifier.value}`;

    try {
      const counter = await cacheService.incrementCounter(key, windowSeconds);
      const remaining = Math.max(limit - counter.count, 0);
      const retryAfterSeconds = Math.max(1, Math.ceil((counter.expiresAt - Date.now()) / 1000));

      req.requestLimit = formatRequestLimitState({
        enabled: true,
        bucket,
        plan,
        identifier,
        limit,
        remaining,
        resetAt: new Date(counter.expiresAt).toISOString(),
        exceeded: counter.count > limit
      });

      res.setHeader("X-RateLimit-Limit", String(limit));
      res.setHeader("X-RateLimit-Remaining", String(remaining));
      res.setHeader("X-RateLimit-Reset", String(Math.floor(counter.expiresAt / 1000)));

      if (counter.count > limit) {
        res.setHeader("Retry-After", String(retryAfterSeconds));
        res.status(429).json({
          error: "Rate limit exceeded.",
          bucket,
          plan,
          retryAfterSeconds,
          resetAt: req.requestLimit.resetAt
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requestLimiterInternals = {
  getRequestBucket,
  getClientIdentifier,
  getNormalizedPlan,
  resolveLimit
};
