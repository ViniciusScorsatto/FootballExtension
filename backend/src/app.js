import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { createMatchImpactController } from "./controllers/matchImpactController.js";
import { attachMonetizationContext, requestLimitPlaceholder } from "./middleware/placeholderGuards.js";
import { registerRoutes } from "./routes/index.js";
import { AnalyticsService } from "./services/analyticsService.js";
import { ApiFootballClient } from "./services/apiFootballClient.js";
import { CacheService } from "./services/cacheService.js";
import { MatchImpactService } from "./services/matchImpactService.js";
import { MatchDiscoveryService } from "./services/matchDiscoveryService.js";

const cacheService = new CacheService({
  redisUrl: env.redisUrl
});

const analyticsService = new AnalyticsService({
  cacheService
});

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
  matchDiscoveryService
});

const app = express();

app.locals.bootstrapPromise = cacheService.connect();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.allowedOrigins.includes("*") || env.allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS."));
    }
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(attachMonetizationContext);
app.use(requestLimitPlaceholder);
app.use(async (_req, _res, next) => {
  try {
    await app.locals.bootstrapPromise;
    next();
  } catch (error) {
    next(error);
  }
});

registerRoutes(app, controller);

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode ?? 500;
  const message = statusCode >= 500 ? "Internal server error." : error.message;

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    error: message
  });
});

export default app;
