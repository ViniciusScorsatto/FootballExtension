# Live Match Impact

Live Match Impact is a production-minded Chrome extension plus Node.js backend that explains what a live football score means in the table right now.

## What it does

- Uses a backend-only API-Football integration so the API key never reaches the browser.
- Aggressively caches match responses with phase-aware TTLs.
- Deduplicates concurrent requests per fixture so thousands of users can share one upstream API call.
- Simulates the live table, detects position swings, and generates short consequence summaries.
- Injects a glanceable floating panel onto any page and auto-expands on goal events.
- Shows other fixtures from the same round in a compact league-context strip, capped for glanceability.
- Tracks fixture usage, popular leagues, and session duration for future monetization work.

## Project structure

- `backend/` Node.js + Express API, cache layer, analytics, and match-impact computation.
- `extension/` Manifest V3 popup and content script UI.
- `api/index.js` Vercel-compatible export.
- `tests/` Core unit tests for the standings simulation.

## Backend setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

3. Add your API-Football key in `.env`.

4. Start the backend:

   ```bash
   npm run dev
   ```

The backend exposes:

- `GET /`
- `GET /health`
- `GET /admin/health`
- `GET /billing/plans`
- `GET /billing/status`
- `POST /billing/early-bird/claim`
- `GET /matches/live`
- `GET /matches/upcoming`
- `GET /match-impact?fixture_id=12345`
- `POST /track/usage`
- `POST /track/session`
- `GET /analytics/summary`

## Cache strategy

- Live fixtures: 15 seconds
- Upcoming fixtures: 120 seconds
- Finished fixtures: 1 hour
- Standings cache: 1 hour per league + season
- Statistics cache: 60 seconds per fixture
- Injuries cache: 4 hours per fixture
- Events cache: 60 seconds per fixture unless a score change forces a refresh
- League context cache: 60 seconds live, 5 minutes upcoming, 1 hour finished per league + season + round
- Lineups: short polling before confirmation, then long-lived once the XI is available
- Pre-match cadence tightens automatically as kickoff approaches so lineups and injuries refresh more often near match time
- Shared request dedupe: one upstream request per fixture while a refresh is in flight
- Long-lived fixture state: stored separately to preserve previous score and baseline standings
- Same-round league context is limited to 9 fixtures and prefers matches kicking off near the tracked game

## Extension setup

1. Open Chrome and go to `chrome://extensions`.
2. Enable Developer Mode.
3. Choose **Load unpacked** and select the `extension/` folder.
4. Open the popup, set a fixture ID and backend URL, then click **Start Tracking**.

## Deployment notes

- Railway / Render: set the root command to `npm start`.
- Vercel: the included `vercel.json` routes requests to `api/index.js`.
- Redis is optional. If `REDIS_URL` is missing or unavailable, the backend falls back to in-memory caching.
- For Chrome extension access in production, set `ALLOWED_EXTENSION_IDS` to your published extension ID and set `ALLOWED_ORIGINS` to your deployed site domains only.
- Railway can use the included [railway.toml](/Users/viniciusscorsatto/Desktop/AI Projects/Football Extension/railway.toml) config file with `/health` as the healthcheck. See [RAILWAY_DEPLOY.md](/Users/viniciusscorsatto/Desktop/AI Projects/Football Extension/RAILWAY_DEPLOY.md) for the staging and production variable checklist.

## Production considerations

- Add a real auth layer before enabling paid tiers.
- Use Stripe Checkout or your own billing backend later; the current billing structure is pricing-ready but not payment-enabled yet.
- Tune the rate-limit env vars for your expected traffic and plan tiers before launch.
- Configure `ALLOWED_ORIGINS` with your deployed extension/web origins in production.
- Run Redis in production so all backend instances share the same cache and analytics counters.

## Billing and Launch Offer

- `GET /` now serves a one-page marketing site for beta launch messaging.
- `GET /billing/plans` returns the public plan catalog and Early Bird availability.
- `GET /billing/status` returns the current plan state for a given user or request context.
- `POST /billing/early-bird/claim` reserves the lifetime-discount Early Bird offer for a user identifier.
- The current billing model is:
  - `Free`
  - `Pro`
  - `Early Bird Pro` at a discounted lifetime monthly price for the first configured users

Key env vars:

```env
BETA_MODE_ENABLED=true
BILLING_CURRENCY=USD
PRO_MONTHLY_PRICE_USD=5.99
EARLY_BIRD_PRO_MONTHLY_PRICE_USD=3.99
EARLY_BIRD_OFFER_ENABLED=true
EARLY_BIRD_OFFER_MAX_CLAIMS=100
SUPPORT_EMAIL=support@footanalysis.com
```

## Rate limiting

- The backend throttles per `x-live-impact-user` when present, or per client IP otherwise.
- `GET` match data routes use the read bucket, `POST /track/*` uses the analytics bucket, and `GET /analytics/summary` uses a stricter admin bucket.
- Redis-backed deployments share counters across instances automatically. Without Redis, the limiter falls back to per-instance in-memory counters.
- When a bucket is exhausted the API returns `429` plus `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers.

## League policy

- `SUPPORTED_LEAGUE_IDS` lets you restrict discovery to a curated allowlist of league IDs.
- `FEATURED_LEAGUE_IDS` lets you prioritize key leagues in backend discovery and in the extension popup.
- Unsupported leagues are filtered out of `/matches/live` and `/matches/upcoming`, which keeps the product focused and helps control API usage.

## Admin Health

- `GET /admin/health` returns backend readiness, cache mode, API-Football status, rate-limit config, and current league policy.
- Add `ADMIN_TOKEN` in staging or production to protect it.
- Send the token as `x-admin-token: ...` or `Authorization: Bearer ...`.

## CORS and Allowed Origins

- `ALLOWED_ORIGINS` accepts a comma-separated list of exact web origins such as `https://liveimpact.yourdomain.com`.
- `ALLOWED_EXTENSION_IDS` accepts Chrome extension IDs and converts them into `chrome-extension://...` origins automatically.
- Requests without an `Origin` header, like health checks and server-to-server traffic, are still allowed.
- Avoid `ALLOWED_ORIGINS=*` in production. The backend will now warn at boot if wildcard CORS is still enabled while `NODE_ENV=production`.

Example production config:

```env
NODE_ENV=production
ALLOWED_ORIGINS=https://liveimpact.yourdomain.com,https://api-liveimpact.up.railway.app
ALLOWED_EXTENSION_IDS=yourpublishedextensionidhere
```
