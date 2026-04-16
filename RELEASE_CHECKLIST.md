# Release Checklist

## Tomorrow First

- Reload the unpacked extension in `chrome://extensions`.
- Run `npm run dev`.
- Sanity-check one live fixture, one upcoming fixture, and one non-standings fixture.
- Confirm popup selector, panel rendering, notifications, momentum, and pre-match sections still behave as expected.
- Deploy Railway `staging` and point the extension at it before touching production.

## Must Do Before Public Launch

- Tune backend rate-limit env vars for real production traffic and plan tiers.
- Lock down `ALLOWED_ORIGINS` and `ALLOWED_EXTENSION_IDS` for production values only.
- Add backend error logging and uptime monitoring.
- Add graceful UI handling for API-Football quota exhaustion and upstream failure states.
- Add integration tests for:
  - `GET /match-impact`
  - `GET /matches/live`
  - `GET /matches/upcoming`
  - non-standings fallback
  - pre-match payload shape
- Review extension permissions before publishing.
- Verify Redis-backed caching in a deployed environment.

## Should Do Soon

- Persist the last good payload in the extension for temporary backend outages.
- Add a notifications toggle in the popup.
- Improve dropdown search/filter for long match lists.
- Add a lightweight admin health endpoint for cache mode, Redis status, and API readiness.
- Refine pre-match copy when lineups or injuries are unavailable.

## Nice To Have

- Better momentum weighting from more live statistics.
- Team and league search instead of plain dropdown browsing.
- Stored analytics in a real database instead of cache-only counters.
- Multi-match tracking.
- Monte Carlo/title-race projections.

## Pre-Deploy Commands

```bash
npm test
npm run check:extension-sdk
node --check apps/extension/background.js
node --check apps/extension/content.js
node --check apps/extension/popup.js
node --check apps/api/src/app.js
```

## Publish Notes

- Do not commit `.env`.
- Confirm `FOOTBALL_API_KEY` and `FOOTBALL_API_HOST` are set in production.
- Load the extension from the `apps/extension/` folder.
- Backend is deployable to Vercel, Railway, or Render.
