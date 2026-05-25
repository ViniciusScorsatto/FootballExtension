# OBS Overlay App

This app is the OBS-oriented frontend client for league-centric live streams.
The first target is a Brasileirão Série A control-room overlay.

## Ownership

- Primary owner: Codex
- Main responsibilities:
  - scene-friendly overlay layouts
  - broadcast-safe typography and spacing
  - frontend presentation only

## Current status

- first local Browser Source implementation
- uses the shared backend intelligence API through the SDK
- designed for `http://localhost:3200/apps/obs-overlay/`

## Run

From the repo root:

```bash
npm run dev:obs
```

Then add this URL as an OBS Browser Source:

```text
http://localhost:3200/apps/obs-overlay/
```

Useful query params:

- `poll=10000` controls refresh cadence in milliseconds.
- `backend=https://...` bypasses the local proxy and calls a backend directly.
- `demo=1` uses a static Brasileirão scenario for layout checks before the backend route is deployed.

Visual preview URL:

```text
http://localhost:3200/apps/obs-overlay/?demo=1
```

By default, the local server proxies `/api/*` to:

```text
https://footballextension-staging.up.railway.app
```

Override that with:

```bash
OBS_BACKEND_URL=https://your-backend.example npm run dev:obs
```

## Intended backend access rule

- Consume backend routes through:
  - [packages/sdk-football](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/packages/sdk-football)
- Do not import code from:
  - [apps/api](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/api)

## Goal

Use the same backend intelligence platform as the extension while keeping OBS-specific rendering concerns in this app.

That means:
- backend owns football meaning
- this app owns screen presentation
