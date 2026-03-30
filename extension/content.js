(function bootstrapLiveMatchImpact() {
  const existingRoot = document.getElementById("lmi-root");

  if (existingRoot) {
    existingRoot.remove();
  }

  const STORAGE_KEYS = ["fixtureId", "backendUrl", "trackingEnabled"];
  const DEFAULT_BACKEND_URL = "http://localhost:3000";
  const BASE_POLL_INTERVAL_MS = 15000;
  const MAX_POLL_INTERVAL_MS = 120000;
  const GOAL_MODE_DURATION_MS = 7000;
  const RENDER_DEBOUNCE_MS = 80;

  const state = {
    fixtureId: null,
    backendUrl: DEFAULT_BACKEND_URL,
    trackingEnabled: false,
    pollTimer: null,
    renderTimer: null,
    backoffMs: BASE_POLL_INTERVAL_MS,
    isExpanded: false,
    lastSignature: "",
    lastNotifiedGoalKey: "",
    lastPayload: null,
    sessionStartedAt: null,
    usageTracked: false,
    pageDismissed: false
  };

  const elements = createPanel();
  wireUi();
  init();

  function init() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === "LMI_TRACKING_UPDATED") {
        state.pageDismissed = false;
        syncSettings(true);
      }

      if (message?.type === "LMI_TRACKING_STOPPED") {
        stopTracking();
      }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") {
        return;
      }

      if (changes.fixtureId || changes.backendUrl || changes.trackingEnabled) {
        syncSettings(true);
      }
    });

    window.addEventListener("beforeunload", flushSession);
    syncSettings(false);
  }

  function createPanel() {
    const logoUrl = chrome.runtime.getURL("assets/footanalysislogo.png");
    const root = document.createElement("section");
    root.id = "lmi-root";
    root.className = "lmi-panel is-hidden is-collapsed";
    root.innerHTML = `
      <button class="lmi-card lmi-collapsed-card" type="button">
        <div class="lmi-collapsed-card__brand">
          <div class="lmi-collapsed-card__brand-copy">
            <div class="lmi-collapsed-card__score">--</div>
          </div>
        </div>
        <div class="lmi-collapsed-card__impact">Waiting for live impact</div>
      </button>
      <div class="lmi-expanded">
        <div class="lmi-expanded__header">
          <div>
            <div class="lmi-expanded__brand">
              <div>
                <div class="lmi-expanded__eyebrow">Live Impact</div>
                <div class="lmi-expanded__brand-subhead lmi-expanded__league-name"></div>
              </div>
            </div>
            <div class="lmi-expanded__media-row">
              <img alt="" class="lmi-badge lmi-badge--team lmi-badge--home" />
              <div class="lmi-badge-divider">vs</div>
              <img alt="" class="lmi-badge lmi-badge--team lmi-badge--away" />
            </div>
            <div class="lmi-expanded__headline">Waiting for a tracked match</div>
          </div>
          <div class="lmi-expanded__actions">
            <button data-action="collapse" class="lmi-icon-button" type="button">Collapse</button>
            <button data-action="close" class="lmi-icon-button" type="button">Close</button>
          </div>
        </div>

        <div class="lmi-event-banner is-hidden">
          <div class="lmi-event-banner__label">Goal Impact</div>
          <div class="lmi-event-banner__text">A goal changes the table.</div>
        </div>

        <div class="lmi-section">
          <div class="lmi-section__label">Table Impact</div>
          <div class="lmi-impact-row lmi-impact-row--home"></div>
          <div class="lmi-impact-row lmi-impact-row--away"></div>
        </div>

        <div class="lmi-section">
          <div class="lmi-section__label">Competition Impact</div>
          <div class="lmi-competition-list"></div>
        </div>

        <div class="lmi-section">
          <div class="lmi-section__label">Momentum</div>
          <div class="lmi-momentum">
            <div class="lmi-momentum__bar lmi-momentum__bar--home"></div>
            <div class="lmi-momentum__bar lmi-momentum__bar--away"></div>
          </div>
          <div class="lmi-stats-grid"></div>
        </div>

        <div class="lmi-section lmi-prematch-section is-hidden">
          <div class="lmi-section__label">Pre-Match</div>
          <div class="lmi-prematch-list"></div>
          <div class="lmi-lineups-grid"></div>
          <div class="lmi-injuries-grid"></div>
        </div>

        <div class="lmi-status-row">
          <span class="lmi-connection-status">Connecting…</span>
          <span class="lmi-last-updated"></span>
        </div>
        <div class="lmi-panel-footer">
          <img src="${logoUrl}" alt="Foot Analysis logo" class="lmi-wordmark lmi-wordmark--footer" />
        </div>
      </div>
    `;

    document.documentElement.appendChild(root);

    return {
      root,
      collapsedCard: root.querySelector(".lmi-collapsed-card"),
      collapsedScore: root.querySelector(".lmi-collapsed-card__score"),
      collapsedImpact: root.querySelector(".lmi-collapsed-card__impact"),
      headline: root.querySelector(".lmi-expanded__headline"),
      eventBanner: root.querySelector(".lmi-event-banner"),
      eventText: root.querySelector(".lmi-event-banner__text"),
      leagueName: root.querySelector(".lmi-expanded__league-name"),
      homeBadge: root.querySelector(".lmi-badge--home"),
      awayBadge: root.querySelector(".lmi-badge--away"),
      homeRow: root.querySelector(".lmi-impact-row--home"),
      awayRow: root.querySelector(".lmi-impact-row--away"),
      competitionList: root.querySelector(".lmi-competition-list"),
      homeMomentum: root.querySelector(".lmi-momentum__bar--home"),
      awayMomentum: root.querySelector(".lmi-momentum__bar--away"),
      statsGrid: root.querySelector(".lmi-stats-grid"),
      prematchSection: root.querySelector(".lmi-prematch-section"),
      prematchList: root.querySelector(".lmi-prematch-list"),
      lineupsGrid: root.querySelector(".lmi-lineups-grid"),
      injuriesGrid: root.querySelector(".lmi-injuries-grid"),
      connectionStatus: root.querySelector(".lmi-connection-status"),
      lastUpdated: root.querySelector(".lmi-last-updated")
    };
  }

  function wireUi() {
    elements.collapsedCard.addEventListener("click", () => {
      if (!state.lastPayload) {
        return;
      }

      setExpanded(true);
    });

    elements.root.addEventListener("click", (event) => {
      const action = event.target?.dataset?.action;

      if (action === "collapse") {
        setExpanded(false);
      }

      if (action === "close") {
        state.pageDismissed = true;
        flushSession();
        clearPollTimer();
        elements.root.classList.add("is-hidden");
      }
    });
  }

  async function syncSettings(fetchImmediately) {
    const settings = await chrome.storage.sync.get(STORAGE_KEYS);
    state.fixtureId = settings.fixtureId ?? null;
    state.backendUrl = (settings.backendUrl || DEFAULT_BACKEND_URL).replace(/\/$/, "");
    state.trackingEnabled = Boolean(settings.trackingEnabled);

    if (!state.trackingEnabled || !state.fixtureId || state.pageDismissed) {
      stopTracking();
      return;
    }

    elements.root.classList.remove("is-hidden");
    elements.connectionStatus.textContent = "Connecting…";

    if (!state.sessionStartedAt) {
      state.sessionStartedAt = Date.now();
      state.usageTracked = false;
    }

    if (fetchImmediately) {
      fetchImpact();
      return;
    }

    scheduleNextPoll(0);
  }

  function stopTracking() {
    flushSession();
    clearPollTimer();
    state.fixtureId = null;
    state.trackingEnabled = false;
    state.usageTracked = false;
    state.lastPayload = null;
    state.lastSignature = "";
    state.lastNotifiedGoalKey = "";
    state.backoffMs = BASE_POLL_INTERVAL_MS;
    state.sessionStartedAt = null;
    elements.root.classList.add("is-hidden");
  }

  function clearPollTimer() {
    if (state.pollTimer) {
      clearTimeout(state.pollTimer);
      state.pollTimer = null;
    }
  }

  function scheduleNextPoll(delayMs) {
    clearPollTimer();
    state.pollTimer = window.setTimeout(fetchImpact, delayMs);
  }

  function extensionRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "LMI_HTTP_REQUEST",
          url,
          method: options.method || "GET",
          headers: options.headers || {
            "Content-Type": "application/json"
          },
          body: options.body
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!response?.ok) {
            const requestError = new Error(
              response?.error ||
                response?.data?.error ||
                `Request failed with ${response?.status ?? "unknown"}`
            );
            requestError.status = response?.status ?? 0;
            requestError.data = response?.data ?? null;
            reject(requestError);
            return;
          }

          resolve(response.data);
        }
      );
    });
  }

  async function fetchImpact() {
    if (!state.trackingEnabled || !state.fixtureId || state.pageDismissed) {
      return;
    }

    try {
      const payload = await extensionRequest(
        `${state.backendUrl}/match-impact?fixture_id=${encodeURIComponent(state.fixtureId)}`
      );
      state.backoffMs = BASE_POLL_INTERVAL_MS;
      handlePayload(payload);

      if (payload.status?.isFinished) {
        flushSession(payload);
        clearPollTimer();
        return;
      }

      scheduleNextPoll(BASE_POLL_INTERVAL_MS);
    } catch (error) {
      renderErrorState(error);
      elements.lastUpdated.textContent = "";
      elements.homeMomentum.style.width = "50%";
      elements.awayMomentum.style.width = "50%";
      state.backoffMs = Math.min(state.backoffMs * 2, MAX_POLL_INTERVAL_MS);
      scheduleNextPoll(state.backoffMs);
    }
  }

  function handlePayload(payload) {
    state.lastPayload = payload;

    if (!state.usageTracked) {
      void postJson("/track/usage", {
        fixtureId: payload.fixture_id,
        leagueId: payload.league?.id,
        leagueName: payload.league?.name
      });
      state.usageTracked = true;
    }

    const signature = JSON.stringify({
      score: payload.score,
      minute: payload.status?.minute,
      summary: payload.impact?.summary,
      competition: payload.impact?.competition,
      event: payload.event?.type,
      eventImpact: payload.event?.impactSummary
    });

    if (signature === state.lastSignature) {
      elements.connectionStatus.textContent =
        payload.status.phase === "finished"
          ? "Match finished"
          : payload.status.phase === "upcoming"
            ? "Pre-match"
            : "Live";
      return;
    }

    state.lastSignature = signature;

    if (state.renderTimer) {
      clearTimeout(state.renderTimer);
    }

    state.renderTimer = window.setTimeout(() => {
      render(payload);
    }, RENDER_DEBOUNCE_MS);
  }

  function renderErrorState(error) {
    const errorCode = error?.data?.code ?? "";
    const retryAfterSeconds = error?.data?.retryAfterSeconds ?? null;
    const retrySuffix = retryAfterSeconds ? ` Retry in ~${retryAfterSeconds}s.` : "";

    if (errorCode === "UPSTREAM_QUOTA_EXCEEDED") {
      elements.connectionStatus.textContent = "Upstream limit reached. Retrying…";
      elements.collapsedScore.textContent = "Limited";
      elements.collapsedImpact.textContent = "Football API quota reached";
      elements.headline.textContent = "Live data temporarily limited";
      elements.homeRow.textContent = "The football data provider hit its request cap.";
      elements.awayRow.textContent = `Tracking will resume automatically.${retrySuffix}`;
      elements.competitionList.innerHTML =
        '<div class="lmi-empty">The backend is healthy, but the upstream football API quota is temporarily exhausted.</div>';
      return;
    }

    if (errorCode === "UPSTREAM_TIMEOUT" || errorCode === "UPSTREAM_UNAVAILABLE") {
      elements.connectionStatus.textContent = "Football API slow. Retrying…";
      elements.collapsedScore.textContent = "Delayed";
      elements.collapsedImpact.textContent = "Waiting for fresh football data";
      elements.headline.textContent = "Live feed temporarily delayed";
      elements.homeRow.textContent = "The upstream football API is responding slowly.";
      elements.awayRow.textContent = `We will retry automatically.${retrySuffix}`;
      elements.competitionList.innerHTML =
        '<div class="lmi-empty">Using a live retry loop until the upstream data provider responds again.</div>';
      return;
    }

    if (errorCode === "UPSTREAM_AUTH_FAILED") {
      elements.connectionStatus.textContent = "Provider auth issue";
      elements.collapsedScore.textContent = "Config";
      elements.collapsedImpact.textContent = "Backend provider credentials failed";
      elements.headline.textContent = "Football data provider rejected credentials";
      elements.homeRow.textContent = "Check the backend API_FOOTBALL_KEY configuration.";
      elements.awayRow.textContent = state.backendUrl;
      elements.competitionList.innerHTML =
        '<div class="lmi-empty">This is a backend configuration issue, not a match-tracking issue.</div>';
      return;
    }

    elements.connectionStatus.textContent = "Connection lost. Retrying…";
    elements.collapsedScore.textContent = "Offline";
    elements.collapsedImpact.textContent = "Could not reach backend";
    elements.headline.textContent = "Backend connection failed";
    elements.homeRow.textContent = "Check that the backend is online";
    elements.awayRow.textContent = state.backendUrl;
    elements.competitionList.innerHTML =
      '<div class="lmi-empty">The overlay could not fetch match data yet.</div>';
  }

  function render(payload) {
    const hasTableImpact = payload.metadata?.tableImpactAvailable !== false;
    const clockLabel = payload.status.phase === "upcoming" ? "KO" : `${payload.status.minute || 0}'`;
    const scoreline = `${payload.teams.home.shortName} ${payload.score.home}-${payload.score.away} ${payload.teams.away.shortName} · ${clockLabel}`;
    const eventLabel = buildEventLabel(payload.event);
    const competitionItems = payload.impact?.competition || [];

    elements.collapsedScore.textContent = scoreline;
    elements.collapsedImpact.textContent =
      eventLabel || payload.impact?.summary || "No live table movement yet";
    elements.leagueName.textContent = payload.league?.name || "Match Tracker";
    elements.headline.textContent = `${payload.teams.home.name} ${payload.score.home}-${payload.score.away} ${payload.teams.away.name} · ${clockLabel}`;
    setBadge(elements.homeBadge, payload.teams.home.logo, payload.teams.home.name);
    setBadge(elements.awayBadge, payload.teams.away.logo, payload.teams.away.name);

    if (hasTableImpact && payload.impact?.table?.home && payload.impact?.table?.away) {
      elements.homeRow.textContent = `${payload.teams.home.name} → ${ordinal(
        payload.impact.table.home.newPosition
      )} (${formatMovement(payload.impact.table.home.movement)})`;
      elements.awayRow.textContent = `${payload.teams.away.name} → ${ordinal(
        payload.impact.table.away.newPosition
      )} (${formatMovement(payload.impact.table.away.movement)})`;
    } else {
      elements.homeRow.textContent = `${payload.teams.home.name} live score tracked`;
      elements.awayRow.textContent = "Table impact unavailable for this competition";
    }

    elements.connectionStatus.textContent =
      payload.status.phase === "finished"
        ? "Match finished"
        : payload.status.phase === "upcoming"
          ? "Pre-match"
          : "Live";
    elements.lastUpdated.textContent = `Updated ${new Date(payload.last_updated).toLocaleTimeString()}`;
    elements.homeMomentum.style.width = `${payload.impact.momentum.home}%`;
    elements.awayMomentum.style.width = `${payload.impact.momentum.away}%`;

    renderCompetitionList(competitionItems);
    renderStatistics(payload.statistics);
    renderPrematch(payload);
    setExpanded(state.isExpanded);

    if (payload.event?.type === "GOAL") {
      elements.eventBanner.classList.remove("is-hidden");
      elements.eventText.textContent =
        eventLabel ||
        payload.event.impactSummary ||
        `${payload.event.teamName} changes the table`;
      notifyGoal(payload, eventLabel);
      setExpanded(true);
      window.setTimeout(() => {
        if (state.lastPayload?.fixture_id === payload.fixture_id) {
          elements.eventBanner.classList.add("is-hidden");
          setExpanded(false);
        }
      }, GOAL_MODE_DURATION_MS);
    } else if (payload.event?.type !== "GOAL") {
      elements.eventBanner.classList.add("is-hidden");
    }
  }

  function buildEventLabel(event) {
    if (!event || event.type !== "GOAL") {
      return "";
    }

    const pieces = [];

    if (event.typeLabel) {
      pieces.push(event.typeLabel);
    }

    if (event.scorer) {
      pieces.push(event.scorer);
    } else if (event.teamName) {
      pieces.push(event.teamName);
    }

    if (event.assist) {
      pieces.push(`assist ${event.assist}`);
    }

    if (event.minuteLabel) {
      pieces.push(event.minuteLabel);
    }

    return pieces.join(" · ");
  }

  function setBadge(element, src, alt) {
    if (!src) {
      element.classList.add("is-hidden");
      element.removeAttribute("src");
      return;
    }

    element.src = src;
    element.alt = alt;
    element.classList.remove("is-hidden");
  }

  function renderCompetitionList(items) {
    if (!items?.length) {
      elements.competitionList.innerHTML = '<div class="lmi-empty">No major competition swing yet.</div>';
      return;
    }

    elements.competitionList.innerHTML = items
      .map((item) => `<div class="lmi-competition-item">${escapeHtml(item)}</div>`)
      .join("");
  }

  function renderStatistics(statistics) {
    if (!statistics?.available || !statistics.home || !statistics.away) {
      elements.statsGrid.innerHTML =
        '<div class="lmi-empty">Momentum is currently based on score and table movement.</div>';
      return;
    }

    const rows = [
      {
        label: "Possession",
        home: formatStat(statistics.home.possession, "%"),
        away: formatStat(statistics.away.possession, "%")
      },
      {
        label: "Shots on target",
        home: formatStat(statistics.home.shotsOnTarget),
        away: formatStat(statistics.away.shotsOnTarget)
      },
      {
        label: "Total shots",
        home: formatStat(statistics.home.totalShots),
        away: formatStat(statistics.away.totalShots)
      },
      {
        label: "Corners",
        home: formatStat(statistics.home.corners),
        away: formatStat(statistics.away.corners)
      }
    ];

    elements.statsGrid.innerHTML = rows
      .map(
        (row) => `
          <div class="lmi-stat-row">
            <span>${escapeHtml(row.home)}</span>
            <span>${escapeHtml(row.label)}</span>
            <span>${escapeHtml(row.away)}</span>
          </div>
        `
      )
      .join("");
  }

  function renderPrematch(payload) {
    if (payload.status.phase !== "upcoming" || !payload.prematch) {
      elements.prematchSection.classList.add("is-hidden");
      return;
    }

    elements.prematchSection.classList.remove("is-hidden");
    elements.prematchList.innerHTML = (payload.prematch.items || [])
      .map((item) => `<div class="lmi-prematch-item">${escapeHtml(item)}</div>`)
      .join("");

    const lineups = payload.prematch.lineups;

    if (lineups?.available) {
      elements.lineupsGrid.innerHTML = [lineups.home, lineups.away]
        .filter(Boolean)
        .map(
          (entry, index) => `
            <div class="lmi-mini-card">
              <div class="lmi-mini-card__title">${escapeHtml(index === 0 ? payload.teams.home.name : payload.teams.away.name)}</div>
              <div class="lmi-mini-card__line">Formation ${escapeHtml(entry.formation || "TBC")}</div>
              <div class="lmi-mini-card__line">${escapeHtml(entry.coach || "Coach TBD")}</div>
              <div class="lmi-mini-card__line">${escapeHtml((entry.startXI || []).slice(0, 4).join(", ") || "XI not released")}</div>
            </div>
          `
        )
        .join("");
    } else {
      elements.lineupsGrid.innerHTML =
        '<div class="lmi-empty">Starting XIs are not available yet.</div>';
    }

    const injuries = payload.prematch.injuries;

    if (injuries?.available) {
      const homeItems = (injuries.home || []).map(
        (item) =>
          `<div class="lmi-mini-card__line">${escapeHtml(item.player)}${item.reason ? ` - ${escapeHtml(item.reason)}` : ""}</div>`
      );
      const awayItems = (injuries.away || []).map(
        (item) =>
          `<div class="lmi-mini-card__line">${escapeHtml(item.player)}${item.reason ? ` - ${escapeHtml(item.reason)}` : ""}</div>`
      );

      elements.injuriesGrid.innerHTML = `
        <div class="lmi-mini-card">
          <div class="lmi-mini-card__title">${escapeHtml(payload.teams.home.name)} injuries</div>
          ${homeItems.length ? homeItems.join("") : '<div class="lmi-mini-card__line">None reported</div>'}
        </div>
        <div class="lmi-mini-card">
          <div class="lmi-mini-card__title">${escapeHtml(payload.teams.away.name)} injuries</div>
          ${awayItems.length ? awayItems.join("") : '<div class="lmi-mini-card__line">None reported</div>'}
        </div>
      `;
    } else {
      elements.injuriesGrid.innerHTML =
        '<div class="lmi-empty">No injury reports surfaced for this fixture.</div>';
    }
  }

  function notifyGoal(payload, eventLabel) {
    const goalKey = JSON.stringify({
      fixtureId: payload.fixture_id,
      score: payload.score,
      minute: payload.event?.minuteLabel,
      scorer: payload.event?.scorer
    });

    if (goalKey === state.lastNotifiedGoalKey) {
      return;
    }

    state.lastNotifiedGoalKey = goalKey;

    chrome.runtime.sendMessage({
      type: "LMI_GOAL_NOTIFICATION",
      title: `${payload.teams.home.shortName} ${payload.score.home}-${payload.score.away} ${payload.teams.away.shortName}`,
      message: [eventLabel, payload.event?.impactSummary].filter(Boolean).join("\n")
    });
  }

  function setExpanded(expanded) {
    state.isExpanded = expanded;
    elements.root.classList.toggle("is-collapsed", !expanded);
    elements.root.classList.toggle("is-expanded", expanded);
  }

  async function postJson(path, payload) {
    if (!state.backendUrl) {
      return;
    }

    try {
      await extensionRequest(`${state.backendUrl}${path}`, {
        method: "POST",
        body: payload
      });
    } catch {
      // Analytics should never block the UI.
    }
  }

  function flushSession(payload = state.lastPayload) {
    if (!state.sessionStartedAt || !payload) {
      return;
    }

    const durationMs = Date.now() - state.sessionStartedAt;
    state.sessionStartedAt = null;

    void postJson("/track/session", {
      fixtureId: payload.fixture_id,
      leagueId: payload.league?.id,
      leagueName: payload.league?.name,
      durationMs
    });
  }

  function ordinal(value) {
    const rank = Number(value ?? 0);
    const mod100 = rank % 100;

    if (mod100 >= 11 && mod100 <= 13) {
      return `${rank}th`;
    }

    switch (rank % 10) {
      case 1:
        return `${rank}st`;
      case 2:
        return `${rank}nd`;
      case 3:
        return `${rank}rd`;
      default:
        return `${rank}th`;
    }
  }

  function formatMovement(value) {
    if (value > 0) {
      return `+${value}`;
    }

    return String(value);
  }

  function formatStat(value, suffix = "") {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "--";
    }

    return `${value}${suffix}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();
