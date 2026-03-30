# Live Match Impact

Live Match Impact is a production-minded Chrome extension plus Node.js backend that explains what a live football score means in the table right now.

## What it does

- Uses a backend-only API-Football integration so the API key never reaches the browser.
- Aggressively caches match responses with phase-aware TTLs.
- Deduplicates concurrent requests per fixture so thousands of users can share one upstream API call.
- Simulates the live table, detects position swings, and generates short consequence summaries.
- Injects a glanceable floating panel onto any page and auto-expands on goal events.
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

- `GET /health`
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
- Shared request dedupe: one upstream request per fixture while a refresh is in flight
- Long-lived fixture state: stored separately to preserve previous score and baseline standings

## Extension setup

1. Open Chrome and go to `chrome://extensions`.
2. Enable Developer Mode.
3. Choose **Load unpacked** and select the `extension/` folder.
4. Open the popup, set a fixture ID and backend URL, then click **Start Tracking**.

## Deployment notes

- Railway / Render: set the root command to `npm start`.
- Vercel: the included `vercel.json` routes requests to `api/index.js`.
- Redis is optional. If `REDIS_URL` is missing or unavailable, the backend falls back to in-memory caching.

## Production considerations

- Add a real auth layer before enabling paid tiers.
- Replace the placeholder request-limit middleware with quota enforcement.
- Configure `ALLOWED_ORIGINS` with your deployed extension/web origins in production.
- Run Redis in production so all backend instances share the same cache and analytics counters.
