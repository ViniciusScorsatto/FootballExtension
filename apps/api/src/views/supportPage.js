function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatValue(value, fallback = "—") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return escapeHtml(value);
}

function renderSummaryCards(snapshot) {
  if (!snapshot) {
    return `
      <div class="grid">
        <div class="panel">
          <h3>No lookup yet</h3>
          <p class="muted">Search by billing email, browser user ID, or account ID to inspect a user.</p>
        </div>
      </div>
    `;
  }

  const plan = snapshot.billingStatus?.plan || snapshot.entitlement?.plan || "free";
  const status = snapshot.billingStatus?.status || snapshot.entitlement?.status || "inactive";
  const account = snapshot.account;
  const browser = snapshot.browser;
  const stripe = snapshot.stripe;
  const webhooks = snapshot.webhooks;

  return `
    <div class="grid">
      <div class="panel">
        <h3>Billing</h3>
        <dl>
          <div><dt>Plan</dt><dd>${formatValue(plan)}</dd></div>
          <div><dt>Status</dt><dd>${formatValue(status)}</dd></div>
          <div><dt>Offer</dt><dd>${formatValue(snapshot.entitlement?.offerId)}</dd></div>
          <div><dt>Grandfathered</dt><dd>${formatValue(snapshot.entitlement?.grandfatheredPriceUsd ? `$${snapshot.entitlement.grandfatheredPriceUsd}` : "")}</dd></div>
          <div><dt>Owner ID</dt><dd>${formatValue(snapshot.entitlement?.ownerId || browser?.resolvedOwnerId)}</dd></div>
        </dl>
      </div>
      <div class="panel">
        <h3>Account</h3>
        <dl>
          <div><dt>Account ID</dt><dd>${formatValue(account?.accountId || snapshot.lookup?.accountId)}</dd></div>
          <div><dt>Email</dt><dd>${formatValue(account?.email || snapshot.lookup?.email)}</dd></div>
          <div><dt>Linked browsers</dt><dd>${formatValue(account?.linkedBrowserIds?.length ? account.linkedBrowserIds.join(", ") : "")}</dd></div>
          <div><dt>Browser lookup</dt><dd>${formatValue(browser?.userId)}</dd></div>
          <div><dt>Linked account</dt><dd>${formatValue(browser?.linkedAccountId)}</dd></div>
        </dl>
      </div>
      <div class="panel">
        <h3>Stripe</h3>
        <dl>
          <div><dt>Lookup source</dt><dd>${formatValue(stripe?.lookupSource)}</dd></div>
          <div><dt>Found</dt><dd>${formatValue(typeof stripe?.found === "boolean" ? String(stripe.found) : "")}</dd></div>
          <div><dt>Customer ID</dt><dd>${formatValue(stripe?.customerId || snapshot.entitlement?.stripeCustomerId)}</dd></div>
          <div><dt>Subscription ID</dt><dd>${formatValue(stripe?.subscriptionId || snapshot.entitlement?.stripeSubscriptionId)}</dd></div>
          <div><dt>Stripe status</dt><dd>${formatValue(stripe?.status)}</dd></div>
        </dl>
      </div>
      <div class="panel">
        <h3>Webhooks</h3>
        <dl>
          <div><dt>Last event</dt><dd>${formatValue(webhooks?.lastEventType)}</dd></div>
          <div><dt>Event time</dt><dd>${formatValue(webhooks?.lastEventAt)}</dd></div>
          <div><dt>Processed at</dt><dd>${formatValue(webhooks?.lastProcessedAt)}</dd></div>
          <div><dt>Healthy</dt><dd>${formatValue(typeof webhooks?.ok === "boolean" ? String(webhooks.ok) : "")}</dd></div>
          <div><dt>Last error</dt><dd>${formatValue(webhooks?.lastError)}</dd></div>
        </dl>
      </div>
    </div>
  `;
}

export function renderSupportPage({ lookup = {}, snapshot = null, adminToken = "" }) {
  const snapshotJson = snapshot ? JSON.stringify(snapshot, null, 2) : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Support Ops</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #09111d;
        --panel: #121d33;
        --panel-soft: #0d1729;
        --border: rgba(255,255,255,.12);
        --text: #f5f7fb;
        --muted: #aebbd1;
        --accent: #6df5c1;
        --accent-2: #55d8ff;
        --danger: #ff9b95;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: radial-gradient(circle at top left, rgba(85,216,255,.14), transparent 28%), var(--bg);
        color: var(--text);
      }
      main { max-width: 1200px; margin: 0 auto; padding: 24px; }
      h1 { margin: 0 0 8px; font-size: 30px; }
      h2, h3 { margin: 0 0 12px; }
      p, label, .muted { color: var(--muted); }
      .card, .panel {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 18px;
        padding: 16px;
      }
      .stack { display: grid; gap: 16px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
      .toolbar { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
      label { display: block; font-size: 13px; margin-bottom: 6px; }
      input {
        width: 100%;
        padding: 12px 14px;
        border-radius: 12px;
        border: 1px solid var(--border);
        background: var(--panel-soft);
        color: var(--text);
        font: inherit;
      }
      .button-row { display: flex; gap: 12px; flex-wrap: wrap; }
      button {
        appearance: none;
        border: 0;
        border-radius: 12px;
        padding: 12px 16px;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }
      .primary { background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #07111b; }
      .secondary { background: #24324d; color: var(--text); }
      .ghost { background: transparent; border: 1px solid var(--border); color: var(--muted); }
      .pill {
        display: inline-flex;
        align-items: center;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(109,245,193,.14);
        color: var(--accent);
        font-size: 12px;
        font-weight: 700;
      }
      .danger { color: var(--danger); }
      .hint { font-size: 13px; }
      dl { display: grid; gap: 10px; margin: 0; }
      dl div { display: grid; gap: 4px; }
      dt { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
      dd { margin: 0; word-break: break-word; }
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        background: var(--panel-soft);
        padding: 14px;
        border-radius: 14px;
        overflow: auto;
        max-height: 520px;
      }
      .status-line {
        min-height: 22px;
        font-size: 14px;
      }
      @media (max-width: 900px) {
        .grid, .toolbar { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main class="stack">
      <section class="card">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
          <div>
            <h1>Support Ops</h1>
            <p class="hint">Internal billing support for lookup, relink, and Stripe resync.</p>
          </div>
          <span class="pill">${adminToken ? "Admin token attached" : "Header auth or admin_token query required"}</span>
        </div>
      </section>

      <section class="card stack">
        <div class="toolbar">
          <div>
            <label for="email">Billing email</label>
            <input id="email" type="email" value="${escapeHtml(lookup.email || "")}" placeholder="user@example.com" />
          </div>
          <div>
            <label for="user-id">Browser user ID</label>
            <input id="user-id" value="${escapeHtml(lookup.userId || "")}" placeholder="lmi_..." />
          </div>
          <div>
            <label for="account-id">Account ID</label>
            <input id="account-id" value="${escapeHtml(lookup.accountId || "")}" placeholder="acct_..." />
          </div>
        </div>

        <div class="button-row">
          <button class="primary" id="lookup-button" type="button">Lookup</button>
          <button class="secondary" id="resync-button" type="button">Resync from Stripe</button>
          <button class="secondary" id="relink-button" type="button">Relink browser</button>
          <button class="ghost" id="clear-button" type="button">Clear form</button>
        </div>

        <div id="status-line" class="status-line muted"></div>
      </section>

      ${renderSummaryCards(snapshot)}

      <section class="card stack">
        <div>
          <h2>Raw snapshot</h2>
          <p class="hint">Useful when a restore or Stripe sync goes sideways and you need the full state quickly.</p>
        </div>
        <pre id="snapshot-json">${escapeHtml(snapshotJson || "No lookup yet.")}</pre>
      </section>
    </main>

    <script>
      const adminToken = ${JSON.stringify(adminToken)};
      const emailInput = document.getElementById("email");
      const userIdInput = document.getElementById("user-id");
      const accountIdInput = document.getElementById("account-id");
      const statusLine = document.getElementById("status-line");
      const snapshotPre = document.getElementById("snapshot-json");

      function getLookupPayload() {
        return {
          email: emailInput.value.trim(),
          user_id: userIdInput.value.trim(),
          account_id: accountIdInput.value.trim()
        };
      }

      function getRelinkPayload() {
        return {
          email: emailInput.value.trim(),
          userId: userIdInput.value.trim(),
          admin_token: adminToken
        };
      }

      function hasLookupValue(payload) {
        return Boolean(payload.email || payload.user_id || payload.account_id);
      }

      function setStatus(message, isError = false) {
        statusLine.textContent = message;
        statusLine.className = "status-line " + (isError ? "danger" : "muted");
      }

      function updateQuery(payload) {
        const url = new URL(window.location.href);
        url.searchParams.delete("email");
        url.searchParams.delete("user_id");
        url.searchParams.delete("account_id");

        if (adminToken) {
          url.searchParams.set("admin_token", adminToken);
        }

        if (payload.email) url.searchParams.set("email", payload.email);
        if (payload.user_id) url.searchParams.set("user_id", payload.user_id);
        if (payload.account_id) url.searchParams.set("account_id", payload.account_id);

        window.history.replaceState({}, "", url);
      }

      async function requestJson(path, options = {}) {
        const response = await fetch(path, options);
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body.error || "Request failed.");
        }

        return body;
      }

      async function runLookup() {
        const payload = getLookupPayload();

        if (!hasLookupValue(payload)) {
          setStatus("Enter an email, browser user ID, or account ID first.", true);
          return;
        }

        setStatus("Loading support snapshot...");
        const params = new URLSearchParams(payload);
        if (adminToken) {
          params.set("admin_token", adminToken);
        }

        const snapshot = await requestJson("/admin/support/lookup?" + params.toString());
        snapshotPre.textContent = JSON.stringify(snapshot, null, 2);
        updateQuery(payload);
        setStatus("Support snapshot refreshed.");
      }

      async function runResync() {
        const payload = getLookupPayload();

        if (!hasLookupValue(payload)) {
          setStatus("Enter an email, browser user ID, or account ID first.", true);
          return;
        }

        setStatus("Resyncing from Stripe...");
        const response = await requestJson("/admin/support/resync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ...payload,
            admin_token: adminToken
          })
        });

        snapshotPre.textContent = JSON.stringify(response.snapshot, null, 2);
        if (response.snapshot?.lookup?.email && !emailInput.value.trim()) {
          emailInput.value = response.snapshot.lookup.email;
        }
        if (response.snapshot?.lookup?.accountId && !accountIdInput.value.trim()) {
          accountIdInput.value = response.snapshot.lookup.accountId;
        }
        setStatus(response.recovery?.recovered ? "Stripe resync rebuilt entitlement." : "Stripe resync finished. No recoverable Pro found.");
      }

      async function runRelink() {
        const payload = getRelinkPayload();

        if (!payload.email || !payload.userId) {
          setStatus("Relink needs both billing email and browser user ID.", true);
          return;
        }

        setStatus("Relinking browser to account...");
        const response = await requestJson("/admin/support/relink", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        snapshotPre.textContent = JSON.stringify(response.snapshot, null, 2);
        accountIdInput.value = response.accountId || accountIdInput.value;
        setStatus("Browser relinked to account.");
      }

      document.getElementById("lookup-button").addEventListener("click", () => {
        runLookup().catch((error) => setStatus(error.message, true));
      });
      document.getElementById("resync-button").addEventListener("click", () => {
        runResync().catch((error) => setStatus(error.message, true));
      });
      document.getElementById("relink-button").addEventListener("click", () => {
        runRelink().catch((error) => setStatus(error.message, true));
      });
      document.getElementById("clear-button").addEventListener("click", () => {
        emailInput.value = "";
        userIdInput.value = "";
        accountIdInput.value = "";
        snapshotPre.textContent = "No lookup yet.";
        updateQuery({});
        setStatus("Form cleared.");
      });
    </script>
  </body>
</html>`;
}
