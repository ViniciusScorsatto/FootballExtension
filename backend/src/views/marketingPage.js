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
        --bg: #08101f;
        --bg-soft: #101b2f;
        --card: rgba(255, 255, 255, 0.05);
        --card-strong: rgba(255, 255, 255, 0.08);
        --line: rgba(255, 255, 255, 0.08);
        --text: #eef4ff;
        --muted: #a4b3d1;
        --accent: #6df5c1;
        --accent-2: #46c6ff;
        --warning: #ffcc7c;
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Avenir Next", Avenir, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(70, 198, 255, 0.22), transparent 35%),
          radial-gradient(circle at bottom right, rgba(109, 245, 193, 0.14), transparent 28%),
          var(--bg);
        color: var(--text);
      }

      a { color: inherit; text-decoration: none; }
      .page {
        width: min(1120px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 32px 0 72px;
      }

      .hero,
      .section,
      .pricing-grid {
        display: grid;
        gap: 24px;
      }

      .nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 36px;
      }

      .brand {
        display: flex;
        gap: 14px;
        align-items: center;
      }

      .brand__mark {
        width: 48px;
        height: 48px;
        border-radius: 16px;
        background: linear-gradient(135deg, rgba(109, 245, 193, 0.2), rgba(70, 198, 255, 0.18));
        display: grid;
        place-items: center;
        border: 1px solid var(--line);
      }

      .brand__ball {
        width: 22px;
        height: 22px;
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
        border: 1px solid rgba(238, 244, 255, 0.6);
      }

      .brand__ball::before { width: 14px; height: 14px; }
      .brand__ball::after { width: 6px; height: 6px; background: var(--text); border: 0; }

      .brand__copy small {
        display: block;
        color: var(--muted);
        letter-spacing: 0.16em;
        text-transform: uppercase;
        font-size: 11px;
      }

      .brand__copy strong {
        display: block;
        font-size: 18px;
      }

      .hero {
        grid-template-columns: 1.1fr 0.9fr;
        align-items: center;
        padding: 28px;
        border-radius: 28px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02));
        border: 1px solid var(--line);
      }

      .eyebrow {
        color: var(--accent);
        letter-spacing: 0.16em;
        text-transform: uppercase;
        font-size: 12px;
        font-weight: 700;
      }

      h1 {
        margin: 12px 0 14px;
        font-size: clamp(36px, 6vw, 60px);
        line-height: 0.98;
      }

      .hero p,
      .section p,
      .pricing-card__copy,
      .bullet {
        color: var(--muted);
        line-height: 1.55;
      }

      .cta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 24px;
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
        color: #05101f;
      }

      .button--ghost {
        background: rgba(255, 255, 255, 0.04);
      }

      .hero-card {
        padding: 20px;
        border-radius: 24px;
        background: var(--bg-soft);
        border: 1px solid var(--line);
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
      }

      .hero-card__line {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }

      .hero-card__line:last-child { border-bottom: 0; }
      .hero-card__value { color: var(--accent); font-weight: 700; }

      .section {
        margin-top: 32px;
      }

      .section h2 {
        margin: 0;
        font-size: 28px;
      }

      .feature-grid,
      .pricing-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .feature-card,
      .pricing-card {
        padding: 22px;
        border-radius: 22px;
        background: var(--card);
        border: 1px solid var(--line);
      }

      .feature-card h3,
      .pricing-card h3 {
        margin: 0 0 10px;
        font-size: 20px;
      }

      .pricing-card--accent {
        background: linear-gradient(180deg, rgba(109, 245, 193, 0.12), rgba(70, 198, 255, 0.08));
        border-color: rgba(109, 245, 193, 0.28);
      }

      .pricing-badge {
        display: inline-flex;
        margin-bottom: 14px;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(255, 204, 124, 0.12);
        color: var(--warning);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .price {
        font-size: 36px;
        font-weight: 800;
        margin: 10px 0 6px;
      }

      .price small {
        font-size: 14px;
        color: var(--muted);
        font-weight: 500;
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
        margin-top: 14px;
        padding: 12px 14px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.04);
        color: var(--muted);
      }

      .footer {
        margin-top: 44px;
        padding-top: 20px;
        border-top: 1px solid var(--line);
        color: var(--muted);
        font-size: 14px;
      }

      @media (max-width: 900px) {
        .hero,
        .feature-grid,
        .pricing-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="nav">
        <div class="brand">
          <div class="brand__mark"><div class="brand__ball"></div></div>
          <div class="brand__copy">
            <small>Foot Analysis</small>
            <strong>Live Match Impact</strong>
          </div>
        </div>
        <a class="button button--ghost" href="/billing/plans">Pricing API</a>
      </div>

      <section class="hero">
        <div>
          <div class="eyebrow">Beta Launch</div>
          <h1>Instant understanding of what a goal means.</h1>
          <p>
            Live Match Impact turns football scores into consequences: table swings, group-position
            changes, title-race pressure, top-four movement, and relegation context in seconds.
          </p>
          <div class="cta-row">
            <a class="button button--primary" href="/billing/plans">See Plans</a>
            <a class="button button--ghost" href="mailto:${pricing.supportEmail}?subject=Live%20Match%20Impact%20Beta">
              Join Beta
            </a>
          </div>
        </div>

        <div class="hero-card">
          <div class="hero-card__line">
            <span>Free</span>
            <span class="hero-card__value">${formatPrice(freePlan.priceMonthlyUsd, pricing.currency)}</span>
          </div>
          <div class="hero-card__line">
            <span>Pro</span>
            <span class="hero-card__value">${regularPrice}<small>/month</small></span>
          </div>
          <div class="hero-card__line">
            <span>Early Bird Pro</span>
            <span class="hero-card__value">${earlyBirdPrice}<small>/month forever</small></span>
          </div>
          <div class="hero-card__line">
            <span>Early Bird spots left</span>
            <span class="hero-card__value">${earlyBird.remaining}</span>
          </div>
        </div>
      </section>

      <section class="section">
        <h2>Built for one promise</h2>
        <p>
          Not a stats dashboard. Not a data dump. Live Match Impact is built to answer one question
          fast: what does this score change right now?
        </p>
        <div class="feature-grid">
          <div class="feature-card">
            <h3>Glanceable live context</h3>
            <p>One floating panel. One tracked match. Meaning in under two seconds.</p>
          </div>
          <div class="feature-card">
            <h3>Trust-first match logic</h3>
            <p>Single-table leagues, grouped competitions, and edge-case fallbacks are handled explicitly.</p>
          </div>
          <div class="feature-card">
            <h3>Fast and cache-aware</h3>
            <p>Shared Redis-backed caching keeps the backend fast while protecting API-Football usage.</p>
          </div>
          <div class="feature-card">
            <h3>English + Portuguese-BR</h3>
            <p>Built from the start for your English and Brazilian football audiences.</p>
          </div>
        </div>
      </section>

      <section class="section">
        <h2>Pricing</h2>
        <p>One strong premium tier. No feature maze. Early supporters get rewarded for helping shape the beta.</p>
        <div class="pricing-grid">
          <article class="pricing-card">
            <h3>${freePlan.name}</h3>
            <div class="price">Free</div>
            <div class="pricing-card__copy">${freePlan.tagline}</div>
            <div class="bullet-list">
              ${freePlan.features.map((feature) => `<div class="bullet">${feature}</div>`).join("")}
            </div>
          </article>
          <article class="pricing-card pricing-card--accent">
            ${earlyBird.active ? `<div class="pricing-badge">${earlyBird.badge}</div>` : ""}
            <h3>${proPlan.name}</h3>
            <div class="price">${regularPrice}<small>/month</small></div>
            <div class="pricing-card__copy">${proPlan.tagline}</div>
            <div class="bullet-list">
              ${proPlan.features.map((feature) => `<div class="bullet">${feature}</div>`).join("")}
            </div>
            <div class="offer-note">
              <strong>Early Bird Pro:</strong> ${earlyBirdPrice}/month forever for the first
              ${earlyBird.maxClaims} paying users. ${earlyBird.remaining} spots currently available.
            </div>
          </article>
        </div>
      </section>

      <section class="section">
        <h2>What beta means</h2>
        <p>
          We are actively refining league logic, grouped competition insights, and alert quality.
          Early Bird users help validate what matters most while locking in a lifetime discounted Pro price.
        </p>
      </section>

      <div class="footer">
        Live Match Impact is currently in beta. For support or early access questions:
        <a href="mailto:${pricing.supportEmail}">${pricing.supportEmail}</a>
      </div>
    </div>
  </body>
</html>`;
}
