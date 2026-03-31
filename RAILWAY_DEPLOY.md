# Railway Deploy Guide

This backend is ready to deploy to Railway with the included [railway.toml](/Users/viniciusscorsatto/Desktop/AI Projects/Football Extension/railway.toml) config.

## Recommended Setup

- Create one Railway project for `Live Match Impact`.
- Use two Railway environments:
  - `staging`
  - `production`
- Add a Redis service in the same project for shared caching and shared rate-limit counters.
- Connect the GitHub repo and enable autodeploys from `main`.

## Railway Config

The included config sets:

- `npm start` as the start command
- `/health` as the deployment healthcheck
- `ON_FAILURE` restart policy

## Required Variables

Set these in both environments:

```env
NODE_ENV=production
ADMIN_TOKEN=choose_a_long_random_value
API_FOOTBALL_KEY=your_real_key
TRUST_PROXY=1
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_FREE_READS_PER_WINDOW=120
RATE_LIMIT_PRO_READS_PER_WINDOW=600
RATE_LIMIT_FREE_ANALYTICS_PER_WINDOW=60
RATE_LIMIT_PRO_ANALYTICS_PER_WINDOW=300
RATE_LIMIT_ADMIN_PER_WINDOW=30
SUPPORTED_LEAGUE_IDS=
FEATURED_LEAGUE_IDS=
STANDINGS_CACHE_TTL_SECONDS=3600
STATISTICS_CACHE_TTL_SECONDS=60
INJURIES_CACHE_TTL_SECONDS=14400
EVENTS_CACHE_TTL_SECONDS=60
LEAGUE_CONTEXT_LIVE_CACHE_TTL_SECONDS=60
LEAGUE_CONTEXT_UPCOMING_CACHE_TTL_SECONDS=300
LEAGUE_CONTEXT_FINISHED_CACHE_TTL_SECONDS=3600
LEAGUE_CONTEXT_MAX_FIXTURES=9
LEAGUE_CONTEXT_SAME_WINDOW_MINUTES=30
LINEUPS_PENDING_CACHE_TTL_SECONDS=300
LINEUPS_CONFIRMED_CACHE_TTL_SECONDS=21600
BETA_MODE_ENABLED=true
BILLING_CURRENCY=USD
PRO_MONTHLY_PRICE_USD=5.99
EARLY_BIRD_PRO_MONTHLY_PRICE_USD=3.99
EARLY_BIRD_OFFER_ENABLED=true
EARLY_BIRD_OFFER_MAX_CLAIMS=100
SUPPORT_EMAIL=support@footanalysis.com
STRIPE_SECRET_KEY=sk_live_or_sk_test
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_NORMAL_PRICE_ID=price_...
STRIPE_EARLY_PRICE_ID=price_...
STRIPE_SUCCESS_URL=https://your-site.com/billing/success
STRIPE_CANCEL_URL=https://your-site.com/billing/cancel
```

Set `REDIS_URL` by attaching the Railway Redis service.

## Staging Variables

Use your current Railway staging domain and the unpacked extension ID you are testing with:

```env
ALLOWED_ORIGINS=https://your-staging-service.up.railway.app
ALLOWED_EXTENSION_IDS=your_unpacked_extension_id
```

## Production Variables

Use your final production domain and the published Chrome extension ID:

```env
ALLOWED_ORIGINS=https://your-production-service.up.railway.app,https://yourdomain.com
ALLOWED_EXTENSION_IDS=your_published_extension_id
```

## First Deploy Checklist

1. Deploy `staging` first.
2. Open `https://your-staging-service.up.railway.app/health`.
3. Confirm `GET /matches/live` and `GET /match-impact?fixture_id=...` return successfully.
4. Point the extension popup backend URL to the Railway staging URL.
5. Verify tracking from the extension on a live, upcoming, and non-standings fixture.
6. After that, copy the variables into `production` and swap in the published extension ID.

## Notes

- Railway injects `PORT`, and the backend already listens on it.
- Keep `ALLOWED_ORIGINS` narrow in production. Do not leave it as `*`.
- Redis is strongly recommended in Railway so all backend instances share cache and throttling state.
- Configure a Stripe webhook that points to `https://your-service.up.railway.app/billing/webhooks/stripe`.
