import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { createMatchImpactController } from "./controllers/matchImpactController.js";
import { attachMonetizationContext } from "./middleware/placeholderGuards.js";
import { createRequestLimiter } from "./middleware/requestLimiter.js";
import { registerRoutes } from "./routes/index.js";
import { AnalyticsService } from "./services/analyticsService.js";
import { AccountService } from "./services/accountService.js";
import { ApiFootballClient } from "./services/apiFootballClient.js";
import { BillingService } from "./services/billingService.js";
import { CacheService } from "./services/cacheService.js";
import { MatchImpactService } from "./services/matchImpactService.js";
import { MatchDiscoveryService } from "./services/matchDiscoveryService.js";
import { StripeService } from "./services/stripeService.js";
import { createAllowedOrigins, isOriginAllowed } from "./utils/origins.js";

const cacheService = new CacheService({
  redisUrl: env.redisUrl
});

const analyticsService = new AnalyticsService({
  cacheService
});

const accountService = new AccountService({
  cacheService,
  env
});

const billingService = new BillingService({
  cacheService,
  accountService,
  stripeService: null,
  env
});

const stripeService = new StripeService({
  env
});

billingService.stripeService = stripeService;

const apiFootballClient = new ApiFootballClient({
  baseUrl: env.apiFootballBaseUrl,
  apiKey: env.apiFootballKey,
  timeoutMs: env.requestTimeoutMs
});

const matchImpactService = new MatchImpactService({
  apiFootballClient,
  cacheService,
  analyticsService,
  env
});

const matchDiscoveryService = new MatchDiscoveryService({
  apiFootballClient,
  cacheService,
  env
});

const controller = createMatchImpactController({
  matchImpactService,
  matchDiscoveryService,
  billingService,
  accountService,
  stripeService,
  cacheService,
  apiFootballClient,
  env
});

const app = express();
const requestLimiter = createRequestLimiter({
  cacheService,
  env
});
const allowedOrigins = createAllowedOrigins(env);

app.locals.bootstrapPromise = cacheService.connect();
app.set("trust proxy", env.trustProxy);

async function ensureBootstrap(_req, _res, next) {
  try {
    await app.locals.bootstrapPromise;
    next();
  } catch (error) {
    next(error);
  }
}

if (env.nodeEnv === "production" && allowedOrigins.includes("*")) {
  console.warn("ALLOWED_ORIGINS is set to '*' in production. Restrict it before public launch.");
}

app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS."));
    }
  })
);
app.post(
  "/billing/webhooks/stripe",
  express.raw({ type: "application/json" }),
  ensureBootstrap,
  controller.handleStripeWebhook
);
app.use(express.json({ limit: "100kb" }));
app.use(attachMonetizationContext);
app.use(ensureBootstrap);
app.use(requestLimiter);

registerRoutes(app, controller);

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode ?? 500;
  const message = statusCode >= 500 ? "Internal server error." : error.message;

  if (error.retryAfterSeconds) {
    res.setHeader("Retry-After", String(error.retryAfterSeconds));
  }

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    error: message,
    code: error.code ?? "INTERNAL_ERROR",
    source: error.source ?? "backend",
    recoverable: Boolean(error.recoverable),
    retryAfterSeconds: error.retryAfterSeconds ?? null
  });
});

export default app;
