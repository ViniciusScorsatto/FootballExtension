# Contracts

Backend-owned public contracts for `Live Match Impact`.

Rules:

- `openapi/live-match-impact.openapi.yaml` is the canonical public contract.
- `schemas/*.json` define reusable payload shapes referenced by the OpenAPI document.
- `generated/*` are derived artifacts and should not be hand-edited.
- Backend changes to public responses should update contracts in the same change.

## Contract versioning

- The OpenAPI `info.version` is the public contract version, not the internal app release number.
- Additive changes are preferred:
  - adding optional fields is allowed in a minor contract revision
  - widening nullable fields is allowed when clients already tolerate `null`
- Breaking changes require a coordinated change across:
  - `packages/contracts`
  - `packages/sdk-football`
  - all active clients under `apps/*`
- `match-impact` is the highest-sensitivity payload. Any change to fields used by clients in:
  - score rendering
  - event banners / goal timeline
  - table impact
  - prematch cards
  - league context
  must update the schema and regression tests in the same commit.

## Change workflow

1. Update backend behavior in `apps/api`.
2. Update the affected schema or OpenAPI route in `packages/contracts`.
3. Update the SDK only if the public request/response interface changed.
4. Update frontend clients only through `packages/sdk-football`.
5. Run `npm test` before merging.
