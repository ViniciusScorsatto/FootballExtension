# Working Agreement

This repo is split so backend and frontend can move fast without stepping on each other.

Current working setup:

- backend owner: Codex
- frontend owner: Claude
- product owner: you

## Ownership

- Product owner:
  - decides product behavior, rollout order, and client priorities
- Backend owner:
  - [apps/api](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/api)
  - [packages/contracts](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/packages/contracts)
  - [packages/sdk-football](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/packages/sdk-football) initial ownership
- Frontend owner:
  - [apps/extension](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/extension)
  - [apps/obs-overlay](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/obs-overlay)

## Boundary rules

- Backend owns:
  - football intelligence
  - caching
  - competition rules
  - billing entitlement truth
  - analytics ingestion
  - public API contracts
- Frontend owns:
  - rendering
  - UX and onboarding
  - app-local view state
  - client-specific interactions
  - localized presentation copy around backend meaning

## Contract rules

- Public client contracts live in [packages/contracts](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/packages/contracts).
- Frontends must consume backend routes through [packages/sdk-football](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/packages/sdk-football).
- Frontends must not import code from [apps/api](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/api).
- Backend changes to public payloads must update:
  - the schema/OpenAPI contract
  - SDK behavior if needed
  - tests

## Working model

- Backend-first change:
  1. update backend behavior
  2. update contracts
  3. update SDK if request/response handling changed
  4. notify frontend owner of any visible payload changes
- Frontend-first change:
  1. stay within existing contracts whenever possible
  2. if blocked by contract shape, request a backend contract change instead of reaching into backend internals
  3. use the SDK, not ad hoc fetch helpers

## File coordination

- If a task touches:
  - [apps/api](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/api)
  - [packages/contracts](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/packages/contracts)
  - [packages/sdk-football](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/packages/sdk-football)
  backend should own or review it.
- If a task touches:
  - [apps/extension](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/extension)
  - [apps/obs-overlay](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/obs-overlay)
  frontend should own it unless it requires a contract change.

## Handoff checklist

- Before handing a backend change to frontend:
  - contracts updated
  - SDK updated if needed
  - tests green
  - note any new required/nullable fields
- Before handing a frontend change back:
  - no direct backend imports added
  - no duplicated endpoint logic added outside the SDK
  - UI still tolerates optional/null contract fields

## Conflict avoidance

- Prefer small commits.
- Avoid editing the same file at the same time.
- If a file in shared ownership is already changing, pause and realign before stacking more edits on top.
