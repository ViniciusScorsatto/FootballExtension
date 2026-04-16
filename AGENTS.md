# AGENTS

This repo is split so backend and frontend boundaries stay clean even though the project now has a single developer.

Current working setup:

- solo developer: Codex
- product owner: user

## Ownership

- Product owner:
  - decides product behavior, rollout order, and client priorities
- Developer:
  - owns the full stack across backend, frontend, contracts, and SDK
- Backend boundary:
  - [apps/api](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/api)
  - [packages/contracts](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/packages/contracts)
  - [packages/sdk-football](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/packages/sdk-football)
- Frontend boundary:
  - [apps/extension](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/extension)
  - [apps/obs-overlay](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/obs-overlay)

## Boundary Rules

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

## Contract Rules

- Public client contracts live in [packages/contracts](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/packages/contracts).
- Frontends must consume backend routes through [packages/sdk-football](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/packages/sdk-football).
- Frontends must not import code from [apps/api](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/api).
- Backend changes to public payloads must update:
  - the schema/OpenAPI contract
  - SDK behavior if needed
  - tests

## Working Model

- Backend-first change:
  1. update backend behavior
  2. update contracts
  3. update SDK if request/response handling changed
  4. update frontend consumers if visible payload behavior changed
- Frontend-first change:
  1. stay within existing contracts whenever possible
  2. if blocked by contract shape, change the backend contract instead of reaching into backend internals
  3. use the SDK, not ad hoc fetch helpers

## File Coordination

- If a task touches:
  - [apps/api](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/api)
  - [packages/contracts](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/packages/contracts)
  - [packages/sdk-football](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/packages/sdk-football)
  treat it as backend/platform work.
- If a task touches:
  - [apps/extension](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/extension)
  - [apps/obs-overlay](/Users/viniciusscorsatto/Desktop/AI%20Projects/Football%20Extension/apps/obs-overlay)
  treat it as frontend/app work unless it requires a contract change.

## Handoff Checklist

- Before moving from backend work to frontend work:
  - contracts updated
  - SDK updated if needed
  - tests green
  - note any new required/nullable fields
- Before finishing a frontend change:
  - no direct backend imports added
  - no duplicated endpoint logic added outside the SDK
  - UI still tolerates optional/null contract fields

## Conflict Avoidance

- Prefer small commits.
- Avoid editing the same file at the same time.
- If a file in shared ownership is already changing, pause and realign before stacking more edits on top.
