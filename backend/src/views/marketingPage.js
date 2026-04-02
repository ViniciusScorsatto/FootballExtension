function formatPrice(value, currency) {
  if (!value) {
    return "Free";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2
  }).format(value);
}

export function renderMarketingPage({ pricing }) {
  const freePlan = pricing.plans.free;
  const proPlan = pricing.plans.pro;
  const earlyBird = pricing.offers.early_bird_lifetime;
  const regularPrice = formatPrice(proPlan.priceMonthlyUsd, pricing.currency);
  const earlyBirdPrice = formatPrice(earlyBird.priceMonthlyUsd, pricing.currency);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Foot Analysis · Live Match Impact</title>
    <meta
      name="description"
      content="Instant understanding of what a goal means. Live Match Impact turns football scores into title-race, top-4, relegation, and group-position consequences."
    />
    <style>
      :root {
        color-scheme: dark;
        --bg: #07101d;
        --bg-deep: #091629;
        --panel: rgba(10, 18, 33, 0.84);
        --panel-strong: rgba(255, 255, 255, 0.08);
        --line: rgba(255, 255, 255, 0.1);
        --text: #f4f7fe;
        --muted: #a1b4cf;
        --accent: #72f0c2;
        --accent-2: #59c8ff;
        --accent-3: #ffd177;
        --danger: #ff8d7b;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        font-family: "Avenir Next", Avenir, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(89, 200, 255, 0.2), transparent 32%),
          radial-gradient(circle at 80% 0%, rgba(114, 240, 194, 0.14), transparent 22%),
          linear-gradient(180deg, #07101d 0%, #081425 45%, #091629 100%);
        color: var(--text);
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      .page {
        width: min(1180px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 28px 0 80px;
      }

      .nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 30px;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .brand__mark {
        width: 52px;
        height: 52px;
        border-radius: 18px;
        border: 1px solid var(--line);
        background:
          radial-gradient(circle at top left, rgba(114, 240, 194, 0.22), transparent 45%),
          rgba(255, 255, 255, 0.04);
        display: grid;
        place-items: center;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
      }

      .brand__ball {
        width: 24px;
        height: 24px;
        border-radius: 999px;
        border: 2px solid var(--text);
        position: relative;
      }

      .brand__ball::before,
      .brand__ball::after {
        content: "";
        position: absolute;
        inset: 50%;
        transform: translate(-50%, -50%);
        border-radius: 999px;
      }

      .brand__ball::before {
        width: 14px;
        height: 14px;
        border: 1px solid rgba(244, 247, 254, 0.55);
      }

      .brand__ball::after {
        width: 5px;
        height: 5px;
        background: var(--text);
      }

      .brand__copy small,
      .eyebrow,
      .section__eyebrow,
      .mini-label {
        display: block;
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .brand__copy strong {
        display: block;
        font-size: 18px;
      }

      .nav__links {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 46px;
        padding: 0 18px;
        border-radius: 999px;
        border: 1px solid var(--line);
        font-weight: 700;
      }

      .button--primary {
        background: linear-gradient(135deg, var(--accent), var(--accent-2));
        color: #05111f;
      }

      .button--ghost {
        background: rgba(255, 255, 255, 0.05);
      }

      .button--soft {
        background: rgba(255, 255, 255, 0.04);
      }

      .hero {
        display: grid;
        grid-template-columns: 1.05fr 0.95fr;
        gap: 26px;
        align-items: center;
        padding: 34px;
        border-radius: 30px;
        border: 1px solid var(--line);
        background:
          radial-gradient(circle at top left, rgba(114, 240, 194, 0.14), transparent 28%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.025));
        overflow: hidden;
        position: relative;
      }

      .hero::after {
        content: "";
        position: absolute;
        inset: auto -10% -30% auto;
        width: 260px;
        height: 260px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(89, 200, 255, 0.14), transparent 70%);
        pointer-events: none;
      }

      .eyebrow {
        color: var(--accent);
        font-weight: 700;
      }

      h1 {
        margin: 12px 0 14px;
        font-size: clamp(42px, 7vw, 72px);
        line-height: 0.94;
        letter-spacing: -0.04em;
      }

      .hero__copy p,
      .section p,
      .pricing-card__copy,
      .bullet,
      .mockup-note {
        color: var(--muted);
        line-height: 1.6;
      }

      .hero__subcopy {
        max-width: 610px;
        font-size: 17px;
      }

      .hero__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 24px;
      }

      .hero__proof {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 18px;
      }

      .proof-pill {
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.04);
        color: var(--muted);
        font-size: 13px;
      }

      .mockup-shell {
        padding: 20px;
        border-radius: 28px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background:
          linear-gradient(180deg, rgba(9, 20, 37, 0.88), rgba(10, 19, 35, 0.72));
        box-shadow: 0 28px 70px rgba(0, 0, 0, 0.38);
      }

      .mockup-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 16px;
      }

      .mockup-header__copy strong {
        display: block;
        font-size: 18px;
      }

      .mockup-score {
        margin-top: 10px;
        font-size: 31px;
        line-height: 1.05;
        font-weight: 700;
      }

      .mockup-minute {
        color: var(--accent);
        font-weight: 700;
      }

      .mockup-banner {
        margin: 18px 0 14px;
        padding: 12px 14px;
        border-radius: 18px;
        background: linear-gradient(135deg, rgba(114, 240, 194, 0.16), rgba(89, 200, 255, 0.14));
      }

      .mockup-banner strong {
        display: block;
        margin-top: 4px;
        font-size: 17px;
      }

      .mockup-grid {
        display: grid;
        gap: 12px;
      }

      .mockup-card {
        padding: 14px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .mockup-card__row {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        margin-top: 8px;
      }

      .mockup-card__row strong {
        color: var(--accent);
      }

      .mockup-round {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin-top: 8px;
      }

      .mockup-round__item {
        padding: 10px 8px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.05);
        text-align: center;
        font-size: 13px;
      }

      .mockup-round__item strong {
        display: block;
        margin-bottom: 4px;
        font-size: 15px;
      }

      .sections {
        display: grid;
        gap: 28px;
        margin-top: 32px;
      }

      .section {
        padding: 28px;
        border-radius: 28px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.03);
      }

      .section h2 {
        margin: 8px 0 12px;
        font-size: 30px;
      }

      .story-grid,
      .feature-grid,
      .demo-grid,
      .pricing-grid,
      .comparison-grid {
        display: grid;
        gap: 18px;
      }

      .story-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .feature-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .demo-grid {
        grid-template-columns: 1fr 1fr;
      }

      .pricing-grid {
        grid-template-columns: 0.9fr 1.05fr 1.05fr;
        align-items: stretch;
      }

      .comparison-grid {
        grid-template-columns: 1fr 1fr;
      }

      .story-card,
      .feature-card,
      .demo-card,
      .pricing-card,
      .comparison-card {
        padding: 20px;
        border-radius: 22px;
        background: var(--panel);
        border: 1px solid var(--line);
      }

      .story-card h3,
      .feature-card h3,
      .demo-card h3,
      .pricing-card h3,
      .comparison-card h3 {
        margin: 8px 0 10px;
        font-size: 21px;
      }

      .story-number {
        display: inline-grid;
        place-items: center;
        width: 34px;
        height: 34px;
        border-radius: 999px;
        background: rgba(114, 240, 194, 0.14);
        color: var(--accent);
        font-weight: 800;
      }

      .demo-card--pro {
        background:
          radial-gradient(circle at top left, rgba(114, 240, 194, 0.14), transparent 36%),
          rgba(255, 255, 255, 0.05);
        border-color: rgba(114, 240, 194, 0.22);
      }

      .tier-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.06);
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .demo-card--pro .tier-pill {
        background: rgba(114, 240, 194, 0.12);
        color: var(--accent);
      }

      .demo-phone {
        margin-top: 16px;
        padding: 14px;
        border-radius: 24px;
        background: linear-gradient(180deg, rgba(8, 18, 33, 0.92), rgba(9, 21, 38, 0.78));
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .demo-phone__top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
      }

      .demo-phone__title {
        margin-top: 6px;
        font-size: 22px;
        font-weight: 700;
        line-height: 1.1;
      }

      .demo-phone__status {
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.06);
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
      }

      .demo-block {
        margin-top: 14px;
        padding: 14px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.06);
      }

      .demo-block--locked {
        background:
          linear-gradient(180deg, rgba(255, 141, 123, 0.08), rgba(255, 255, 255, 0.04));
        border-color: rgba(255, 141, 123, 0.16);
      }

      .demo-line {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-top: 8px;
      }

      .demo-line strong {
        color: var(--accent);
      }

      .demo-note {
        margin-top: 10px;
        color: var(--muted);
        font-size: 14px;
        line-height: 1.5;
      }

      .demo-lock {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 12px;
        background: rgba(255, 141, 123, 0.1);
        color: #ffc0b4;
        font-size: 13px;
        font-weight: 700;
      }

      .pricing-card--pro {
        background:
          radial-gradient(circle at top left, rgba(89, 200, 255, 0.12), transparent 40%),
          rgba(255, 255, 255, 0.05);
      }

      .pricing-card--early {
        background:
          radial-gradient(circle at top left, rgba(114, 240, 194, 0.18), transparent 38%),
          linear-gradient(180deg, rgba(114, 240, 194, 0.08), rgba(89, 200, 255, 0.08));
        border-color: rgba(114, 240, 194, 0.3);
        transform: translateY(-10px);
      }

      .pricing-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 12px;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(255, 209, 119, 0.12);
        color: var(--accent-3);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .price {
        margin: 6px 0;
        font-size: 42px;
        line-height: 1;
        font-weight: 800;
        letter-spacing: -0.04em;
      }

      .price small {
        font-size: 15px;
        font-weight: 500;
        color: var(--muted);
      }

      .pricing-card__copy {
        min-height: 48px;
      }

      .bullet-list {
        display: grid;
        gap: 10px;
        margin-top: 16px;
      }

      .bullet::before {
        content: "• ";
        color: var(--accent);
      }

      .offer-note {
        margin-top: 16px;
        padding: 14px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.05);
        color: var(--muted);
      }

      .offer-note strong {
        color: var(--text);
      }

      .comparison-card {
        min-height: 100%;
      }

      .comparison-card ul {
        margin: 14px 0 0;
        padding-left: 18px;
        color: var(--muted);
        line-height: 1.7;
      }

      .footer {
        margin-top: 34px;
        padding-top: 20px;
        border-top: 1px solid var(--line);
        color: var(--muted);
        font-size: 14px;
      }

      @media (max-width: 980px) {
        .hero,
        .story-grid,
        .feature-grid,
        .demo-grid,
        .pricing-grid,
        .comparison-grid {
          grid-template-columns: 1fr;
        }

        .pricing-card--early {
          transform: none;
        }
      }

      @media (max-width: 640px) {
        .page {
          width: min(100vw - 20px, 1180px);
          padding-top: 16px;
        }

        .nav {
          flex-direction: column;
          align-items: flex-start;
        }

        .hero,
        .section {
          padding: 22px;
        }

        h1 {
          font-size: 42px;
        }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <header class="nav">
        <div class="brand">
          <div class="brand__mark"><div class="brand__ball"></div></div>
          <div class="brand__copy">
            <small>Foot Analysis</small>
            <strong>Live Match Impact</strong>
          </div>
        </div>
        <div class="nav__links">
          <a class="button button--soft" href="/billing/plans">Pricing API</a>
          <a class="button button--ghost" href="mailto:${pricing.supportEmail}?subject=Live%20Match%20Impact%20Beta">
            Join Beta
          </a>
          <a class="button button--primary" href="/billing/plans">See plans</a>
        </div>
      </header>

      <section class="hero">
        <div class="hero__copy">
          <span class="eyebrow">Beta launch for matchday fans</span>
          <h1>Instant understanding of what a goal changes.</h1>
          <p class="hero__subcopy">
            Live Match Impact turns football scores into meaning: title race pressure, top-four
            swings, relegation danger, group-position movement, and round context in seconds.
          </p>
          <div class="hero__actions">
            <a class="button button--primary" href="/billing/plans">Unlock Early Bird Pro</a>
            <a class="button button--ghost" href="mailto:${pricing.supportEmail}?subject=Live%20Match%20Impact%20Beta">
              Talk to us
            </a>
          </div>
          <div class="hero__proof">
            <span class="proof-pill">English + Portuguese-BR</span>
            <span class="proof-pill">Chrome extension + backend cache</span>
            <span class="proof-pill">Built for fast live meaning</span>
          </div>
        </div>

        <div class="mockup-shell">
          <div class="mockup-header">
            <div class="mockup-header__copy">
              <span class="mini-label">Foot Analysis</span>
              <strong>Live Match Impact</strong>
            </div>
            <span class="proof-pill">67'</span>
          </div>

          <div class="mockup-score">ARS 1-0 CHE</div>
          <div class="mockup-note">Arsenal enters the top four and Chelsea falls out of it.</div>

          <div class="mockup-banner">
            <span class="mini-label">Goal Impact</span>
            <strong>Saka goal changes the race immediately.</strong>
          </div>

          <div class="mockup-grid">
            <div class="mockup-card">
              <span class="mini-label">Table Impact</span>
              <div class="mockup-card__row">
                <span>Arsenal</span>
                <strong>4th (+1)</strong>
              </div>
              <div class="mockup-card__row">
                <span>Chelsea</span>
                <strong>5th (-1)</strong>
              </div>
            </div>

            <div class="mockup-card">
              <span class="mini-label">Competition Impact</span>
              <div class="mockup-note">
                Arsenal moves into the Champions League places. Chelsea drops out of the top four.
              </div>
            </div>

            <div class="mockup-card">
              <span class="mini-label">Other Matches This Round</span>
              <div class="mockup-round">
                <div class="mockup-round__item"><strong>LIV 2-1 TOT</strong> 73'</div>
                <div class="mockup-round__item"><strong>AVL 0-0 NEW</strong> HT</div>
                <div class="mockup-round__item"><strong>FUL 1-1 BHA</strong> Final</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="sections">
        <section class="section">
          <span class="section__eyebrow">Why this exists</span>
          <h2>Built for one question, not for dashboard overload.</h2>
          <p>
            Fans do not need another wall of stats when a goal goes in. They need one clean answer:
            what does this result change right now?
          </p>
          <div class="story-grid">
            <article class="story-card">
              <div class="story-number">1</div>
              <h3>Track one match</h3>
              <p>Stay focused on the fixture you care about instead of scanning ten different apps.</p>
            </article>
            <article class="story-card">
              <div class="story-number">2</div>
              <h3>See the consequence</h3>
              <p>Table movement, group-position shifts, and competition consequences are translated instantly.</p>
            </article>
            <article class="story-card">
              <div class="story-number">3</div>
              <h3>Keep the round in view</h3>
              <p>Other matches from the same round stay visible so the story never loses context.</p>
            </article>
          </div>
        </section>

        <section class="section">
          <span class="section__eyebrow">How it feels</span>
          <h2>Not a stats dump. A live football reading layer.</h2>
          <div class="feature-grid">
            <article class="feature-card">
              <h3>Glanceable in under two seconds</h3>
              <p>The floating panel is built for instant comprehension, not deep exploration.</p>
            </article>
            <article class="feature-card">
              <h3>Trust-first live logic</h3>
              <p>Single-table leagues, grouped competitions, and special formats are handled with explicit fallbacks.</p>
            </article>
            <article class="feature-card">
              <h3>Fast, cache-aware backend</h3>
              <p>Shared caching keeps the product responsive while protecting API-Football request usage.</p>
            </article>
            <article class="feature-card">
              <h3>Made for your audience mix</h3>
              <p>English and Portuguese-BR are supported from day one so the product can grow with both channels.</p>
            </article>
          </div>
        </section>

        <section class="section">
          <span class="section__eyebrow">See the difference</span>
          <h2>Free explains what is happening. Pro adds the deeper match context.</h2>
          <p>
            The free tier gives the core live-reading experience on featured leagues. Pro keeps that
            speed, then adds broader league access and deeper pre-match and competition context.
          </p>
          <div class="demo-grid">
            <article class="demo-card">
              <span class="tier-pill">Free</span>
              <h3>Fast match meaning on featured leagues</h3>
              <div class="demo-phone">
                <div class="demo-phone__top">
                  <div>
                    <span class="mini-label">Live Match Impact</span>
                    <div class="demo-phone__title">ARS 1-0 CHE</div>
                  </div>
                  <span class="demo-phone__status">67'</span>
                </div>
                <div class="demo-block">
                  <span class="mini-label">Table Impact</span>
                  <div class="demo-line"><span>Arsenal</span><strong>4th (+1)</strong></div>
                  <div class="demo-line"><span>Chelsea</span><strong>5th (-1)</strong></div>
                </div>
                <div class="demo-block">
                  <span class="mini-label">Competition Impact</span>
                  <div class="demo-note">
                    Arsenal enters the Champions League places.
                  </div>
                </div>
                <div class="demo-block demo-block--locked">
                  <span class="mini-label">What Pro adds</span>
                  <div class="demo-lock">All supported leagues, manual fixture fallback, and deeper pre-match reading</div>
                </div>
              </div>
            </article>

            <article class="demo-card demo-card--pro">
              <span class="tier-pill">Pro</span>
              <h3>Deeper match reading across every supported league</h3>
              <div class="demo-phone">
                <div class="demo-phone__top">
                  <div>
                    <span class="mini-label">Live Match Impact</span>
                    <div class="demo-phone__title">America-RN 1-0 Sport</div>
                  </div>
                  <span class="demo-phone__status">74'</span>
                </div>
                <div class="demo-block">
                  <span class="mini-label">Group Position</span>
                  <div class="demo-note">
                    America-RN is 2nd in Group C and moves into 1st if scores hold.
                  </div>
                </div>
                <div class="demo-block">
                  <span class="mini-label">Pre-match depth</span>
                  <div class="demo-note">
                    Model outlook, lineup shape, and injury context before kickoff.
                  </div>
                </div>
                <div class="demo-block">
                  <span class="mini-label">Competition reading</span>
                  <div class="demo-note">
                    Richer grouped, knockout, aggregate, and penalty interpretation in the live view.
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section class="section">
          <span class="section__eyebrow">Pricing</span>
          <h2>One clear premium tier, plus a beta reward for early believers.</h2>
          <p>
            Free stays genuinely useful for the core live-reading job. Pro unlocks every supported
            league plus the deeper match context that already exists in the product today.
            Early Bird users lock in the best price forever.
          </p>
          <div class="pricing-grid">
            <article class="pricing-card">
              <span class="mini-label">Start free</span>
              <h3>${freePlan.name}</h3>
              <div class="price">Free</div>
              <div class="pricing-card__copy">${freePlan.tagline}</div>
              <div class="bullet-list">
                ${freePlan.features.map((feature) => `<div class="bullet">${feature}</div>`).join("")}
              </div>
            </article>

            <article class="pricing-card pricing-card--pro">
              <span class="mini-label">For matchday power users</span>
              <h3>${proPlan.name}</h3>
              <div class="price">${regularPrice}<small>/month</small></div>
              <div class="pricing-card__copy">${proPlan.tagline}</div>
              <div class="bullet-list">
                ${proPlan.features.map((feature) => `<div class="bullet">${feature}</div>`).join("")}
              </div>
            </article>

            <article class="pricing-card pricing-card--early">
              ${earlyBird.active ? `<div class="pricing-badge">${earlyBird.badge}</div>` : ""}
              <span class="mini-label">Best beta offer</span>
              <h3>${earlyBird.name}</h3>
              <div class="price">${earlyBirdPrice}<small>/month forever</small></div>
              <div class="pricing-card__copy">
                Lifetime discounted Pro pricing for early adopters who help shape the beta.
              </div>
              <div class="offer-note">
                <strong>${earlyBird.remaining}</strong> spots currently available out of
                <strong>${earlyBird.maxClaims}</strong>.
              </div>
              <div class="hero__actions" style="margin-top:16px;">
                <a class="button button--primary" href="/billing/plans">Claim Early Bird</a>
              </div>
            </article>
          </div>
        </section>

        <section class="section">
          <span class="section__eyebrow">Why beta matters</span>
          <h2>We are refining league logic, live insight quality, and what fans actually pay for.</h2>
          <div class="comparison-grid">
            <article class="comparison-card">
              <h3>What beta users get</h3>
              <ul>
                <li>Access to the product while the match logic keeps improving</li>
                <li>The chance to shape what Free and Pro become before public launch</li>
                <li>Early visibility into new league support, grouped insights, and alert ideas</li>
              </ul>
            </article>
            <article class="comparison-card">
              <h3>What we are still refining</h3>
              <ul>
                <li>Edge-case competition formats and cup-specific live consequence logic</li>
                <li>The best premium hooks for alerts, multi-match behavior, and deeper interpretation</li>
                <li>Tighter brand integration with the Foot Analysis English and PT-BR channels</li>
              </ul>
            </article>
          </div>
        </section>
      </div>

      <footer class="footer">
        Live Match Impact is currently in beta. For support, partnerships, or early access:
        <a href="mailto:${pricing.supportEmail}">${pricing.supportEmail}</a>
      </footer>
    </div>
  </body>
</html>`;
}
