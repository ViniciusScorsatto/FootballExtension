# API App

This app is the backend-owned football intelligence platform.

## Ownership

- Primary owner: backend
- Main responsibilities:
  - football intelligence
  - standings correction
  - competition and knockout logic
  - billing entitlement truth
  - analytics ingestion
  - public API responses consumed by frontend clients

## Key paths

- [src/app.js](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/api/src/app.js)
- [src/server.js](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/api/src/server.js)

## Run commands

From the repo root:

```bash
npm run dev
```

Starts the API app in watch mode using:

```bash
node --watch apps/api/src/server.js
```

Production start from the repo root:

```bash
npm start
```

## Contract relationship

- Public contracts live in [packages/contracts](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/packages/contracts).
- Frontend clients should consume this app through [packages/sdk-football](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/packages/sdk-football).
- If API payloads change, update:
  - backend behavior
  - contracts
  - SDK if needed
  - tests

## Coordination notes

- Frontends should not import code from this app directly.
- If a change affects client payloads, backend owns the contract update.
