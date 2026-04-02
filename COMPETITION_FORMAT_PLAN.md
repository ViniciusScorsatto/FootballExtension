# Competition Format Plan

Last updated: April 3, 2026

This document defines how `Live Match Impact` should reason about league and cup structures, and how it should behave when official standings lag behind real match results.

It also records adjacent product decisions that affect trust in live interpretation, especially around billing activation and which surfaces should expose deeper analysis.

## Goal

Keep live impact trustworthy.

When a competition format is unclear or the standings feed is stale, the product should degrade gracefully instead of showing precise but misleading claims.

## Product Principles

- Prefer correct-but-limited over detailed-but-wrong.
- Use deterministic runtime logic, not AI-in-the-loop live decisions.
- Keep the UI quiet about complexity unless it materially helps the user.
- Treat standings as a baseline that may need temporary correction during and just after matchdays.
- Do not unlock paid product states before the payment source of truth confirms success.

## Competition Classes

We currently classify competitions into these buckets:

1. `single_table`
- Standard domestic league.
- One standings table.
- Full table-impact logic is enabled.

2. `grouped_same_group`
- Competition has multiple groups.
- Fixture teams are in the same group.
- Group-impact logic can be enabled.

3. `grouped_cross_play`
- Competition has multiple groups.
- Fixture teams are not in the same group, or cross-group play exists.
- Position-change claims should be limited.

4. `knockout`
- Cup / elimination competition.
- No table impact.
- Use cup/tie progression language instead.

5. `hybrid`
- Competition mixes league phase, groups, playoffs, or later knockout rounds.
- Use registry-specific routing where available.

6. `unknown`
- We do not have enough confidence.
- Fall back to limited-impact or score-only safely.

## Impact Modes

Each competition class maps to a safe product mode:

1. `full`
- Full position changes.
- Title / top-4 / relegation consequences.

2. `group`
- Position changes only within the relevant group.
- Group-context messaging instead of league-wide claims.

3. `limited`
- Avoid exact table-movement claims.
- Use messages like:
  - `Special competition format`
  - `Live score tracked - table impact limited for this fixture`

4. `score_only`
- No table claims.
- Score, events, stats, and pre-match only.

5. `cup`
- Knockout tie / aggregate / penalties logic.
- No league-table claims.

## Runtime Classification Strategy

### Step 1: Registry Override

Check the local registry first.

If a competition is known, use explicit routing and impact policy from `backend/src/config/competitionFormats.js`.

### Step 2: Deterministic Inference

If no registry rule exists:

1. If `league.standings !== true`
- use `score_only`

2. If `/standings` returns exactly one table
- classify as `single_table`

3. If `/standings` returns multiple groups
- find whether both teams are in the same group
- if yes, classify as `grouped_same_group`
- if not, classify as `grouped_cross_play`

4. If round naming and registry indicate knockout routing
- use cup/tie logic instead of table logic

5. If anything is ambiguous
- use `limited`

## Standings Freshness Strategy

### Problem

API-Football standings often lag behind live or recently-finished matchdays by hours.

If we trust those standings blindly:

- live table movement can be wrong
- finished match impact can look stale
- the user can see a score consequence that does not match what just happened elsewhere in the round

### Decision

We now treat official standings as a **baseline**, not always as the final source of truth.

For standings-enabled league/group competitions:

1. Start from the official table for the selected league/group.
2. Correct that baseline using already-finished fixtures from the same round.
3. Simulate the tracked fixture on top of that corrected baseline.

This gives us a provisional live/final table state even when `/standings` has not caught up yet.

### Scope

Current correction scope is intentionally narrow:

- same league
- same season
- same round
- only finished fixtures
- exclude the tracked fixture itself

If correction inputs are incomplete or unsafe, fall back to the official baseline.

### Group / Subset Safety

For grouped competitions:

- only apply same-round finished fixtures that affect teams in the selected group/table
- skip finished fixtures whose teams are outside the relevant table slice

This prevents cross-group matches from contaminating group-only projections.

## Finished Match Table Impact

### Decision

For standings-enabled matches, `Impacto na Tabela` should **stay visible after full time**.

The product should behave like this:

1. Immediately after FT:
- show the final computed table impact from the corrected provisional table

2. After the official standings feed catches up:
- switch from provisional finished impact to official finished impact

### Catch-up Rule

We use the standings row `update` timestamp from API-Football when available.

Implementation rule:

- capture the tracked teams’ standings-row update timestamps when the match finishes
- on later refreshes, compare them against fresh standings responses
- if they changed, treat the official table as caught up
- then switch the finished match to official table impact

If no standings row update timestamp exists:

- keep the provisional finished impact
- do not guess catch-up based on time alone

## Billing Trust Principle

### Decision

Stripe checkout completion alone is **not** enough to mark Pro active.

We now treat billing state like standings state:

- `checkout.session.completed` can link a user to the Stripe customer / subscription
- real Pro activation should wait for a successful paid invoice signal

### Why

Stripe can complete a hosted checkout session before the invoice/customer spend summaries fully reflect a paid amount.

If we unlock Pro too early:

- the product can say the user is Pro while Stripe still appears unpaid
- support/debugging becomes confusing
- the dashboard and the extension feel out of sync

### Implementation Rule

- `checkout.session.completed`
  - reserve/link the entitlement unless Stripe already marks payment as paid
- `invoice.paid`
  - activate the entitlement

This keeps the app closer to Stripe’s true financial source of truth.

## Surface Gating Principle

### Decision

Free users should keep the core live match answer, while Pro users get the deeper reading layer.

Implemented live-surface split today:

- Free keeps:
  - score card
  - live state / freshness
  - scorer timeline
  - core table impact
  - core competition impact
  - final stats
- Pro adds:
  - pre-match model
  - lineup pitch / lineup cards
  - injuries
  - side-panel format-context explainer

This should stay consistent as we add richer round-context interpretation later.

### UI Behavior

- silent correction by default
- no extra badge or warning in the main UI for now
- keep provenance in payload metadata for debugging and future admin tooling

## Metadata / Provenance

The backend should keep explicit source information internally.

Current useful source states:

- `official-baseline`
- `corrected-round-baseline`
- `finished-provisional`
- `finished-official`
- existing non-table states like:
  - `prematch-no-table-impact`
  - `no-standings-coverage`
  - `special-competition-format`
  - `knockout-tie`

This should remain backend/debug metadata for now, not primary UI copy.

## Suggested User-Facing Fallbacks

For limited-impact competitions:

- `Special competition format`
- `Live score tracked - table impact limited for this fixture`
- `Group structure makes live table movement less reliable here`

For group-impact competitions:

- `Group impact`
- `Moves to 2nd in Group B`

For prematch league fixtures:

- do not show misleading “coverage unreliable” warnings
- simply wait until kickoff to start live table impact

## Where AI Helps

AI should help us:

- research unusual league and cup formats
- summarize official competition rules
- propose registry entries
- identify likely format edge cases

AI should not:

- make live per-request table decisions
- sit in the critical request path
- override deterministic standings logic at runtime

## Pre-Launch / Ongoing Review List

Core domestic leagues:

- Premier League
- La Liga
- Serie A
- Bundesliga
- Ligue 1
- Brasileirão Série A
- Brasileirão Série B

Grouped / split / hybrid competitions:

- Copa do Nordeste
- MLS
- Belgian Pro League
- Scottish Premiership split
- Liga MX phases
- Brazilian youth / regional competitions as needed

Cups and tournaments:

- Copa do Brasil
- FA Cup
- EFL Cup
- Copa del Rey
- Champions League
- Europa League
- Libertadores
- Sudamericana

## Rollout Recommendation

1. Keep registry entries for the major competitions we actively support.
2. Use deterministic inference for unknown competitions.
3. Default to `limited` when confidence is low.
4. Use provisional standings correction only for standings-enabled league/group contexts.
5. Expand registry and edge-case coverage from real observed usage.

## Why This Matters

This protects the core product promise:

`Instant understanding of what a goal means`

That only works if the product knows:

- when not to overclaim
- when cup logic replaces table logic
- when official standings are temporarily stale
