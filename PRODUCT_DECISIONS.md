# Product Decisions

This file records product decisions that should stay stable across:
- extension behavior
- landing page / website knowledge base
- support answers
- launch documentation

## Polling Cadence

### Match Discovery Window

The popup and side panel should only show upcoming matches in the next `12 hours`.

Why:
- more relevant to real viewing intent
- less clutter in the picker
- lower backend and upstream load
- better conversion from "I opened the extension" to "I started tracking"

What this means:
- live matches always appear when available
- upcoming matches appear only if kickoff is within the next `12 hours`
- leagues without live or next-12h matches show as unavailable in the selector

### Match Impact Polling

The extension uses different polling intervals depending on match state.

#### Live Matches

Poll every `15 seconds`.

Why:
- the product promise is live match meaning
- score, events, and table movement can change quickly

#### Upcoming Matches

Use kickoff-aware polling:

- within `90 minutes` of kickoff: poll every `2 minutes`
- within `6 hours` of kickoff: poll every `5 minutes`
- more than `6 hours` before kickoff: poll every `15 minutes`

Why:
- users do not need second-by-second updates long before kickoff
- lineups and meaningful pre-match changes usually matter closer to kickoff
- this protects API usage without hurting product value

### Single Active View

Only one live view should actively poll at a time.

Modes:
- `overlay`
- `sidepanel`

Rules:
- starting tracking from the popup makes the overlay the active view
- opening the side panel transfers active ownership to the side panel
- the inactive view should not keep polling in parallel

Why:
- avoids duplicate requests
- reduces unnecessary API usage
- prevents conflicting user experiences

## Pre-Match UX

Before kickoff, the extension should focus on:
- pre-match summary
- lineups
- injuries
- other matches in the round

Before kickoff, the extension should not show placeholder sections for:
- table impact
- competition impact
- momentum

Why:
- those sections imply live state that does not exist yet
- pre-match should feel intentional, not like an empty live screen

## Website / Support Language

When explaining the product publicly, we should describe polling in user terms:

- live matches update quickly
- pre-match tracking becomes more frequent closer to kickoff
- the extension avoids unnecessary refreshes far from kickoff

Avoid exposing overly technical wording on the website unless needed for support.
