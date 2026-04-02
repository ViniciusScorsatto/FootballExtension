# Live Match Impact

Product validation brief for `Foot Analysis / Live Match Impact`

Last updated: April 3, 2026

## What This Product Is

`Live Match Impact` is a Chrome extension plus Node.js backend that explains what a football score means right now.

Core promise:

> Instant understanding of what a goal means.

This is not meant to be a full stats dashboard. It is a fast, glanceable interpretation layer that tells a fan:

- who is moving in the table
- who enters or leaves key zones
- what changed after a goal
- what the confrontation means in cups
- what matters before kickoff

## Product Hypothesis

Primary hypothesis:

- Football fans want a faster, simpler way to understand the consequence of a score than opening multiple apps, checking standings manually, or reading live threads.

Secondary hypotheses:

- A lightweight overlay is more useful than a full stats dashboard for this use case.
- Users care more about `meaning` than raw volume of stats.
- Competition and table-impact framing increases retention versus generic score tracking.
- Curated league support creates a better first product than trying to support every competition equally.
- A bilingual product (`English` and `pt-BR`) fits the current audience mix well.
- There is room for a paid tier once recurring matchday value is obvious.

## Current Product State

The product is a working beta with Railway staging deployed.

### Implemented

- Chrome extension (Manifest V3)
- Node.js + Express backend
- API-Football backend integration
- Redis-preferred cache with in-memory fallback
- Shared request deduplication per tracked fixture
- Live and upcoming match discovery endpoints
- Overlay mode and side-panel mode
- Goal/event enrichment
- Goal timeline after the temporary goal banner fades
- Live momentum / final stats module
- Pre-match mode with predictions, lineups, and injuries
- Competition registry for special league / cup routing
- Cup / aggregate / penalty logic
- Group-position projection for grouped competitions
- Provisional live standings correction using finished same-round fixtures
- Finished-match table impact that stays provisional until official standings catch up
- English + Portuguese-BR localization
- Stripe billing + entitlement refresh / restore flow
- Stripe-priced plan catalog shared by the site and extension
- Stripe activation gated on successful invoice payment
- Goal and table-impact notifications
- PostHog analytics + internal support/admin tooling

### Current User Experience

Popup:

- language selector
- league focus selector
- live and upcoming match pickers
- notification settings
- single toggle tracking button
- open side panel
- Pro-only manual fixture fallback
- Pro / restore / refresh membership card

Overlay:

- collapsed glance card
- expanded live panel
- score card with full team names and logos
- goal banner + persistent scorer timeline
- table impact
- competition impact
- momentum / final stats
- pre-match prediction / lineup / injury blocks
- other matches this round

Side panel:

- follows the tracked fixture
- viewer-first layout
- same core payload as the overlay
- roomier pre-match and round-context view

## What The Product Does Today

### Live Match Tracking

- polls the backend every 15 seconds for live matches
- uses server-side caching for heavier resources
- auto-expands when a goal is detected
- shows table impact where reliable
- shows cup/tie impact where table logic does not apply
- stops showing live momentum once a match is finished
- prevents overlay and side panel from actively polling at the same time
- preserves side-panel mode only while the side panel is actually open

### Table Impact Logic

- simulates standings movement from the tracked score
- computes position movement for both teams
- detects key zone changes such as title race, top 4, promotion, relegation
- avoids table claims before kickoff
- corrects stale official standings with already-finished fixtures from the same round
- keeps finished match impact provisional until the upstream standings rows show a newer update timestamp

### Cup / Knockout Logic

- supports single-leg knockouts
- supports first and second legs of two-leg ties
- supports aggregate state and progression language
- supports direct-penalties vs extra-time competition overrides
- supports live and finished penalty shootouts

### Pre-Match Logic

- shows local kickoff time
- shows prediction/model card when prediction coverage exists
- shows lineup pitch when lineup data is rich enough
- shows coaches and injury blocks
- uses kickoff-aware refresh cadence
- does not claim live table movement until kickoff

## Current League / Competition Strategy

Current staging support is curated rather than open-ended.

Core supported competitions include:

- Premier League
- La Liga
- Serie A
- Bundesliga
- Ligue 1
- Brasileirão Série A
- Brasileirão Série B
- Copa do Brasil
- Brasileiro U20 A
- Copa do Nordeste
- Copa Sudamericana
- Copa Libertadores

Notes:

- actual availability is still controlled by environment variables
- featured-vs-Pro league access is also environment-driven
- Pro means all configured supported leagues, not every API-Football league

## Current Free vs Pro Reality

### What Is Actually Shipped Today

Free:

- track 1 live match at a time
- featured / curated league access
- score card + core live match state
- basic table impact when reliable
- competition impact when meaningful
- goal timeline
- round-context strip
- popup pricing pulled from the shared billing catalog
- English + Portuguese-BR

Pro:

- all configured supported leagues
- manual fixture fallback in the popup
- pre-match model / prediction card
- lineup pitch + lineup cards
- injuries context
- side-panel format-context explainer
- deeper grouped / knockout / penalty interpretation

### Product Evaluation

The current billing split is now much clearer, but still leaves room to sharpen richer round-context value later.

What feels correct:

- Free should remain genuinely useful.
- League access is a strong, simple premium lever.
- Manual fixture fallback belongs in Pro.
- Pro should feel deeper, not just less restricted.
- Prematch and format-analysis depth now being Pro-only makes the live reading layer clearer.

What still feels too loose:

- richer round-context interpretation is still fairly similar between Free and Pro
- Pro value is clearer than before, but still strongest in the popup/prematch layer rather than the broader round-context layer

### Recommended Product Split

Keep on Free:

- score card
- live state / freshness
- scorer timeline
- core table impact when reliable
- core competition impact when reliable
- basic final stats
- featured leagues only

Move or keep on Pro:

- all configured leagues
- manual fixture fallback
- pre-match prediction/model card
- lineup pitch + richer lineup cards
- injuries cards
- advanced format-context explanations
- richer grouped / knockout nuance
- deeper “other matches this round” and context-heavy interpretation

Recommended principle:

- Free should answer: `What is happening?`
- Pro should answer: `Why does this matter, and what else around it matters too?`

## Product Decision: Free and Pro Going Forward

### Free should optimize for trust and simplicity

Free should feel like a complete basic product:

- one tracked match
- featured leagues
- fast consequence reading
- no clutter from locked controls or noisy premium reminders

### Pro should optimize for depth and matchday power

Pro should feel like the smart, richer version:

- broader competition access
- deeper prematch reading
- more complete competition-format nuance
- stronger alerts and richer round context

### What not to do

- Do not make free polling feel broken or stale just to upsell Pro.
- Do not gate so much that free stops feeling trustworthy.
- Do not rely only on league access if the live-reading surfaces still look mostly identical.

## Website-Ready Plan Story

This is the cleanest current-market story using only shipped features.

### Free

Headline:

- `Fast live match meaning on featured leagues`

Support points:

- `Track one live match`
- `Featured league access`
- `Live score and core match impact`
- `Scorer timeline and final stats`
- `English and Portuguese-BR`

### Pro

Headline:

- `Deeper match reading across every supported league`

Support points:

- `All supported leagues`
- `Manual fixture fallback`
- `Pre-match model outlook`
- `Lineup pitch and injuries`
- `Richer grouped, knockout, aggregate, and penalty context`
- `Side panel deep-view mode`

Recommended short framing:

- `Free tells you what is happening. Pro adds the deeper match context.`

## Planned But Not Fully Built Yet

### Product / UX

- first-run onboarding polish
- stronger brand/system polish
- more intentional Pro prompts
- persisted last-good payload in the extension
- richer side-panel workflows
- clearer premium differentiation inside live surfaces

### Growth / Monetization

- stronger in-product upgrade moments
- production billing rollout
- clearer feature packaging between Free and Pro

### Analytics / Ops

- richer PostHog dashboards
- more cache hit/miss visibility
- deeper support action audit trail
- more robust admin tooling

### Football Features

- richer competition narratives
- stronger momentum weighting
- smarter title / top-4 / relegation projection layers
- richer alerts
- multi-match tracking
- export / social workflows

## What Is Explicitly Not Built Yet

- full production email delivery for magic links
- true account dashboard
- database-backed analytics
- public production rollout with final extension distribution
- language expansion beyond `en` and `pt-BR`
- multi-match tracking as a user-facing shipped product
- advanced season probability models

## Known Limitations

### Product Limits

- some competitions still have poor standings / stats coverage
- some special formats still need more registry tuning
- pre-match data quality depends on API-Football coverage
- Pro differentiation inside the live reading surfaces is not fully mature yet

### Technical Limits

- upstream dependency on API-Football
- quota pressure on busy match windows
- extension still depends on backend availability
- analytics are still lightweight

### Operational Limits

- no full admin portal yet
- production billing/support flow still needs finishing
- staging is still the main working environment

## Cost Model We Know Today

### Railway

As of March 31, 2026:

- Hobby: `$5/month`
- RAM: `$10 / GB / month`
- CPU: `$20 / vCPU / month`
- Network egress: `$0.05 / GB`
- Volume storage: `$0.15 / GB / month`

### API-Football

As of March 31, 2026:

- Free: `100 requests/day`
- Pro: `$19/month`, `7,500 requests/day`
- Ultra: `$29/month`, `75,000 requests/day`
- Mega: `$39/month`, `150,000 requests/day`

Key implication:

- API cost is likely to become the first meaningful pressure point before Railway does

## Early Monetization Thinking

Current direction:

Free:

- featured leagues
- one tracked match
- core live meaning

Pro:

- all configured supported leagues
- manual fixture fallback
- deeper prematch and competition context
- richer premium reading layer over time

Rough intuition:

- a small number of paying users can cover an early stack because infra is still lightweight
- the real monetization question is not just `will users pay?`
- it is `what premium depth makes this feel meaningfully smarter than free?`

## Biggest Risks

### Market Risk

- users may like the idea but not return habitually
- users may still default to existing score apps
- too many competitions could dilute quality

### Technical Risk

- API-Football freshness / quota pressure during busy windows
- uneven competition coverage
- backend freshness under load

### Product Risk

- if the overlay is noisy, users may disable it
- if the value is not obvious within two seconds, the product loses its edge
- if free and Pro feel too similar inside the live surfaces, conversion may stay weak

## Why This Product Could Work

- it solves an interpretation problem, not just a data access problem
- it is fast to consume
- it is differentiated from generic score apps
- it fits the creator/media model well
- it naturally serves both English and Portuguese-BR audiences

## Best Validation Questions

- Do users return because of table/consequence reading?
- Which leagues actually drive repeat usage?
- Is overlay + side panel the right combination, or are notifications more important?
- Which premium layer feels most monetizable:
  - all leagues
  - prematch depth
  - richer competition context
  - alerts
- What makes a user say: `Free is nice, but Pro feels meaningfully smarter`?
