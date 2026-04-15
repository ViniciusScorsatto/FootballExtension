# Contracts

Backend-owned public contracts for `Live Match Impact`.

Rules:

- `openapi/live-match-impact.openapi.yaml` is the canonical public contract.
- `schemas/*.json` define reusable payload shapes referenced by the OpenAPI document.
- `generated/*` are derived artifacts and should not be hand-edited.
- Backend changes to public responses should update contracts in the same change.
