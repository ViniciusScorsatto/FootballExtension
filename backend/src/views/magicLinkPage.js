function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderMagicLinkPage({ email = "", plan = "free", status = "inactive" }) {
  const planLabel = plan === "pro" && status === "active" ? "Pro restored" : "Account linked";
  const bodyCopy =
    plan === "pro" && status === "active"
      ? "This browser is now linked to your paid account. You can close this tab and refresh the extension plan status."
      : "This browser is now linked to your account. You can close this tab and refresh the extension plan status.";

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Live Match Impact Restore</title>
      <style>
        body {
          margin: 0;
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: linear-gradient(145deg, #09111f 0%, #12213b 48%, #183054 100%);
          color: #f5f7fb;
          font-family: "Avenir Next", "Segoe UI", sans-serif;
        }
        .card {
          width: min(520px, calc(100vw - 32px));
          padding: 28px;
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(7, 14, 27, 0.9);
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
        }
        .eyebrow {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #9fb3cc;
        }
        h1 {
          margin: 10px 0 8px;
          font-size: 34px;
          line-height: 1.08;
        }
        p {
          color: #9fb3cc;
          line-height: 1.5;
        }
        .pill {
          display: inline-flex;
          margin-top: 12px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(109, 245, 193, 0.16);
          color: #6df5c1;
          font-weight: 700;
        }
        .actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 18px;
        }
        button {
          padding: 12px 16px;
          border-radius: 14px;
          border: 0;
          cursor: pointer;
          font-weight: 700;
          background: linear-gradient(135deg, #6df5c1 0%, #46c6ff 100%);
          color: #07121f;
        }
        .hint {
          margin-top: 14px;
          font-size: 13px;
        }
      </style>
    </head>
    <body>
      <main class="card">
        <div class="eyebrow">Foot Analysis</div>
        <h1>${escapeHtml(planLabel)}</h1>
        <p>${escapeHtml(bodyCopy)}</p>
        <p>${escapeHtml(email ? `Linked email: ${email}` : "")}</p>
        <div class="pill">${escapeHtml(plan === "pro" ? "Live Match Impact Pro" : "Live Match Impact")}</div>
        <div class="actions">
          <button type="button" onclick="window.close()">Close this tab</button>
        </div>
        <p class="hint">If the tab does not close automatically in your browser, you can close it manually.</p>
      </main>
    </body>
  </html>`;
}
