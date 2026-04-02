# Scenario Preview

This folder lets the extension preview saved `match-impact` payloads without waiting for real matches.

## How It Works

- `index.json` defines scenario families and the selectable variants inside each family.
- Each variant points to one JSON payload file.
- The popup can switch into **Scenario preview** mode in non-production builds.
- When preview mode is active, the overlay and side panel load the selected JSON payload directly from the extension bundle instead of calling the backend.

## Current Structure

- `index.json`
- `cruzeiro-vitoria-quarter-finals/`
  - `prematch.json`
  - `aggregate-level.json`
  - `home-leading.json`
  - `away-needs-two.json`
  - `penalties-live.json`
  - `penalties-finished.json`

## How To Use

1. Open the popup in the staging/dev build.
2. Turn on **Use scenario preview**.
3. Pick a scenario variant.
4. Click **Track this match**.
5. View it in the overlay or open the side panel.

## How To Edit One Match With Many Variants

Use one match family and keep the same fixture identity across multiple payloads.

Example:

- same fixture: `Cruzeiro vs Vitoria`
- different variants:
  - `prematch`
  - `aggregate-level`
  - `home-leading`
  - `away-needs-two`
  - `penalties-live`

That way you only change the fields that matter for the state you want to test:

- `status`
- `score`
- `impact.summary`
- `impact.competition`
- `statistics`
- `prematch`
- `metadata.penaltyContext`

## Adding A New Variant

1. Duplicate one existing JSON file in the same family folder.
2. Update the payload fields for the new state.
3. Add the new variant entry to `index.json`.
4. Reload the extension.

## Adding A New Match Family

1. Create a new folder under `extension/scenarios/`.
2. Add one or more variant JSON files.
3. Add a new family entry in `index.json`.

## Payload Shape

Each scenario file should mimic the backend `/match-impact` response shape closely enough for the UI:

- `fixture_id`
- `startsAt`
- `last_updated`
- `league`
- `teams`
- `score`
- `status`
- `event`
- `impact`
- `statistics`
- `prematch`
- `league_context`
- `metadata`

The closer the payload is to real backend output, the more trustworthy the visual QA will be.
