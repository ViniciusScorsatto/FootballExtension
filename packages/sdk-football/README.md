# SDK Football

Thin shared client for frontend apps that consume the backend intelligence API.

Responsibilities:

- typed endpoint wrappers
- shared request header creation
- browser fetch and Chrome-runtime request transports
- consistent error parsing
- no UI state
- no football rules logic

Primary entry points:

- `createFootballSdk(...)` for standard fetch-based clients
- `createChromeRuntimeSdk(...)` for extension surfaces that proxy requests through the background worker
