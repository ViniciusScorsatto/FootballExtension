(function bootstrapLiveMatchImpact() {
  const existingRoot = document.getElementById("lmi-root");

  if (existingRoot) {
    existingRoot.remove();
  }

  const STORAGE_KEYS = ["fixtureId", "backendUrl", "trackingEnabled", "language"];
  const DEFAULT_BACKEND_URL = "http://localhost:3000";
  const DEFAULT_LANGUAGE = globalThis.LMI_I18N.detectBrowserLanguage();
  const BASE_POLL_INTERVAL_MS = 15000;
  const MAX_POLL_INTERVAL_MS = 120000;
  const GOAL_MODE_DURATION_MS = 7000;
  const RENDER_DEBOUNCE_MS = 80;

  const {
    normalizeLanguage,
    t,
    formatOrdinal,
    formatMovement,
    translateGoalType,
    translateCompetitionMessage,
    buildImpactSummary
  } = globalThis.LMI_I18N;

  const state = {
    fixtureId: null,
    backendUrl: DEFAULT_BACKEND_URL,
    language: DEFAULT_LANGUAGE,
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

  function translate(key, values = {}) {
    return t(state.language, key, values);
  }

  function setLanguage(language) {
    state.language = normalizeLanguage(language);

    if (state.lastPayload) {
      render(state.lastPayload);
      return;
    }

    updateStaticCopy();
  }

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

      if (changes.language) {
        setLanguage(changes.language.newValue ?? DEFAULT_LANGUAGE);
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
        <div class="lmi-collapsed-card__impact">${escapeHtml(translate("panel.waitingImpact"))}</div>
      </button>
      <div class="lmi-expanded">
        <div class="lmi-expanded__header">
          <div>
            <div class="lmi-expanded__brand">
              <div>
                <div class="lmi-expanded__eyebrow">${escapeHtml(translate("panel.eyebrow"))}</div>
                <div class="lmi-expanded__brand-subhead lmi-expanded__league-name"></div>
              </div>
            </div>
            <div class="lmi-expanded__media-row">
              <img alt="" class="lmi-badge lmi-badge--team lmi-badge--home" />
              <div class="lmi-badge-divider">vs</div>
              <img alt="" class="lmi-badge lmi-badge--team lmi-badge--away" />
            </div>
            <div class="lmi-expanded__headline">${escapeHtml(translate("panel.waitingMatch"))}</div>
          </div>
          <div class="lmi-expanded__actions">
            <button data-action="collapse" class="lmi-icon-button" type="button">${escapeHtml(translate("panel.collapse"))}</button>
            <button data-action="close" class="lmi-icon-button" type="button">${escapeHtml(translate("panel.close"))}</button>
          </div>
        </div>

        <div class="lmi-event-banner is-hidden">
          <div class="lmi-event-banner__label">${escapeHtml(translate("panel.goalImpact"))}</div>
          <div class="lmi-event-banner__text">A goal changes the table.</div>
        </div>

        <div class="lmi-section">
          <div class="lmi-section__label">${escapeHtml(translate("panel.tableImpact"))}</div>
          <div class="lmi-impact-row lmi-impact-row--home"></div>
          <div class="lmi-impact-row lmi-impact-row--away"></div>
        </div>

        <div class="lmi-section">
          <div class="lmi-section__label">${escapeHtml(translate("panel.competitionImpact"))}</div>
          <div class="lmi-competition-list"></div>
        </div>

        <div class="lmi-section">
          <div class="lmi-section__label">${escapeHtml(translate("panel.momentum"))}</div>
          <div class="lmi-momentum">
            <div class="lmi-momentum__bar lmi-momentum__bar--home"></div>
            <div class="lmi-momentum__bar lmi-momentum__bar--away"></div>
          </div>
          <div class="lmi-stats-grid"></div>
        </div>

        <div class="lmi-section lmi-prematch-section is-hidden">
          <div class="lmi-section__label">${escapeHtml(translate("panel.preMatch"))}</div>
          <div class="lmi-prematch-list"></div>
          <div class="lmi-lineups-grid"></div>
          <div class="lmi-injuries-grid"></div>
        </div>

        <div class="lmi-section lmi-league-context-section is-hidden">
          <div class="lmi-section__label lmi-league-context-label">${escapeHtml(translate("panel.otherMatches"))}</div>
          <div class="lmi-league-context-list"></div>
        </div>

        <div class="lmi-status-row">
          <span class="lmi-connection-status">${escapeHtml(translate("panel.connecting"))}</span>
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
      eventBannerLabel: root.querySelector(".lmi-event-banner__label"),
      eventText: root.querySelector(".lmi-event-banner__text"),
      leagueName: root.querySelector(".lmi-expanded__league-name"),
      homeBadge: root.querySelector(".lmi-badge--home"),
      awayBadge: root.querySelector(".lmi-badge--away"),
      tableLabel: root.querySelectorAll(".lmi-section__label")[0],
      competitionLabel: root.querySelectorAll(".lmi-section__label")[1],
      momentumLabel: root.querySelectorAll(".lmi-section__label")[2],
      preMatchLabel: root.querySelectorAll(".lmi-section__label")[3],
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
      leagueContextSection: root.querySelector(".lmi-league-context-section"),
      leagueContextLabel: root.querySelector(".lmi-league-context-label"),
      leagueContextList: root.querySelector(".lmi-league-context-list"),
      connectionStatus: root.querySelector(".lmi-connection-status"),
      lastUpdated: root.querySelector(".lmi-last-updated"),
      eyebrow: root.querySelector(".lmi-expanded__eyebrow"),
      headlineLabel: root.querySelector(".lmi-expanded__headline"),
      collapseButton: root.querySelector('[data-action="collapse"]'),
      closeButton: root.querySelector('[data-action="close"]')
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
    state.language = normalizeLanguage(settings.language ?? DEFAULT_LANGUAGE);
    state.trackingEnabled = Boolean(settings.trackingEnabled);
    updateStaticCopy();

    if (!state.trackingEnabled || !state.fixtureId || state.pageDismissed) {
      stopTracking();
      return;
    }

    elements.root.classList.remove("is-hidden");
    elements.connectionStatus.textContent = translate("panel.connecting");

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

  function updateStaticCopy() {
    elements.collapsedImpact.textContent = state.lastPayload
      ? elements.collapsedImpact.textContent
      : translate("panel.waitingImpact");
    elements.eyebrow.textContent = translate("panel.eyebrow");
    elements.headline.textContent = state.lastPayload
      ? elements.headline.textContent
      : translate("panel.waitingMatch");
    elements.eventBannerLabel.textContent = translate("panel.goalImpact");
    elements.collapseButton.textContent = translate("panel.collapse");
    elements.closeButton.textContent = translate("panel.close");

    if (elements.tableLabel) elements.tableLabel.textContent = translate("panel.tableImpact");
    if (elements.competitionLabel) {
      elements.competitionLabel.textContent = translate("panel.competitionImpact");
    }
    if (elements.momentumLabel) elements.momentumLabel.textContent = translate("panel.momentum");
    if (elements.preMatchLabel) elements.preMatchLabel.textContent = translate("panel.preMatch");
    if (elements.leagueContextLabel) {
      elements.leagueContextLabel.textContent = translate("panel.otherMatches");
    }
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
      eventImpact: payload.event?.impactSummary,
      leagueContext: payload.league_context?.fixtures?.map((fixture) => [
        fixture.fixtureId,
        fixture.score?.home,
        fixture.score?.away,
        fixture.status?.phase,
        fixture.status?.minute
      ])
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
      elements.connectionStatus.textContent = translate("panel.upstreamLimitRetrying");
      elements.collapsedScore.textContent = translate("panel.limited");
      elements.collapsedImpact.textContent = translate("panel.liveDataLimited");
      elements.headline.textContent = translate("panel.liveDataLimited");
      elements.homeRow.textContent = translate("panel.footballApiQuotaExplanation");
      elements.awayRow.textContent = translate("panel.trackingResume", {
        suffix: retryAfterSeconds
          ? translate("panel.retryAfter", { seconds: retryAfterSeconds })
          : ""
      });
      elements.competitionList.innerHTML =
        `<div class="lmi-empty">${escapeHtml(translate("panel.footballApiQuotaDetail"))}</div>`;
      return;
    }

    if (errorCode === "UPSTREAM_TIMEOUT" || errorCode === "UPSTREAM_UNAVAILABLE") {
      elements.connectionStatus.textContent = translate("panel.footballApiSlowRetrying");
      elements.collapsedScore.textContent = translate("panel.live");
      elements.collapsedImpact.textContent = translate("panel.liveFeedDelayed");
      elements.headline.textContent = translate("panel.liveFeedDelayed");
      elements.homeRow.textContent = translate("panel.footballApiSlowExplanation");
      elements.awayRow.textContent = translate("panel.retrySoon", {
        suffix: retryAfterSeconds
          ? translate("panel.retryAfter", { seconds: retryAfterSeconds })
          : ""
      });
      elements.competitionList.innerHTML =
        `<div class="lmi-empty">${escapeHtml(translate("panel.footballApiDelayedDetail"))}</div>`;
      return;
    }

    if (errorCode === "UPSTREAM_AUTH_FAILED") {
      elements.connectionStatus.textContent = translate("panel.providerAuthIssue");
      elements.collapsedScore.textContent = translate("panel.config");
      elements.collapsedImpact.textContent = translate("panel.backendCredentialsFailed");
      elements.headline.textContent = translate("panel.providerRejectedCredentials");
      elements.homeRow.textContent = translate("panel.backendApiKeyCheck");
      elements.awayRow.textContent = state.backendUrl;
      elements.competitionList.innerHTML =
        `<div class="lmi-empty">${escapeHtml(translate("panel.backendConfigIssue"))}</div>`;
      return;
    }

    elements.connectionStatus.textContent = translate("panel.backendConnectionFailed");
    elements.collapsedScore.textContent = translate("panel.offline");
    elements.collapsedImpact.textContent = translate("panel.backendConnectionFailed");
    elements.headline.textContent = translate("panel.backendConnectionFailed");
    elements.homeRow.textContent = translate("panel.backendOnlineCheck");
    elements.awayRow.textContent = state.backendUrl;
    elements.competitionList.innerHTML =
      `<div class="lmi-empty">${escapeHtml(translate("panel.backendOfflineDetail"))}</div>`;
  }

  function render(payload) {
    const hasTableImpact = payload.metadata?.tableImpactAvailable !== false;
    const clockLabel = payload.status.phase === "upcoming" ? "KO" : `${payload.status.minute || 0}'`;
    const scoreline = `${payload.teams.home.shortName} ${payload.score.home}-${payload.score.away} ${payload.teams.away.shortName} · ${clockLabel}`;
    const eventLabel = buildEventLabel(payload.event);
    const competitionItems = payload.impact?.competition || [];
    const localizedImpactSummary = buildImpactSummary(state.language, payload.impact, payload.teams);
    const isLimitedImpact = payload.impact?.mode === "limited";

    elements.collapsedScore.textContent = scoreline;
    elements.collapsedImpact.textContent = eventLabel || localizedImpactSummary;
    elements.leagueName.textContent = payload.league?.name || translate("panel.matchTracker");
    elements.headline.textContent = `${payload.teams.home.name} ${payload.score.home}-${payload.score.away} ${payload.teams.away.name} · ${clockLabel}`;
    setBadge(elements.homeBadge, payload.teams.home.logo, payload.teams.home.name);
    setBadge(elements.awayBadge, payload.teams.away.logo, payload.teams.away.name);

    elements.tableLabel.textContent = isLimitedImpact
      ? translate("panel.groupPositions")
      : translate("panel.tableImpact");
    elements.competitionLabel.textContent = isLimitedImpact
      ? translate("panel.limitedCompetition")
      : translate("panel.competitionImpact");

    if (hasTableImpact && payload.impact?.table?.home && payload.impact?.table?.away) {
      elements.homeRow.textContent = `${payload.teams.home.name} → ${formatOrdinal(
        state.language,
        payload.impact.table.home.newPosition
      )} (${formatMovement(payload.impact.table.home.movement)})`;
      elements.awayRow.textContent = `${payload.teams.away.name} → ${formatOrdinal(
        state.language,
        payload.impact.table.away.newPosition
      )} (${formatMovement(payload.impact.table.away.movement)})`;
    } else if (payload.impact?.mode === "limited") {
      const homeGroupPosition = payload.metadata?.teamGroupPositions?.home;
      const awayGroupPosition = payload.metadata?.teamGroupPositions?.away;
      const homeProjectedGroupPosition = payload.metadata?.projectedTeamGroupPositions?.home;
      const awayProjectedGroupPosition = payload.metadata?.projectedTeamGroupPositions?.away;

      elements.homeRow.textContent = homeGroupPosition
        ? formatGroupPositionLine(payload.teams.home.name, homeGroupPosition, homeProjectedGroupPosition)
        : translate("panel.limitedHome");
      elements.awayRow.textContent = awayGroupPosition
        ? formatGroupPositionLine(payload.teams.away.name, awayGroupPosition, awayProjectedGroupPosition)
        : translate("panel.limitedAway");
    } else {
      elements.homeRow.textContent = translate("panel.scoreOnlyHome", {
        team: payload.teams.home.name
      });
      elements.awayRow.textContent = translate("panel.scoreOnlyAway");
    }

    elements.connectionStatus.textContent =
      payload.status.phase === "finished"
        ? translate("panel.finished")
        : payload.status.phase === "upcoming"
          ? translate("panel.preMatchStatus")
          : translate("panel.live");
    elements.lastUpdated.textContent = translate("panel.updatedAt", {
      time: new Date(payload.last_updated).toLocaleTimeString(
        state.language === "pt-BR" ? "pt-BR" : "en-US"
      )
    });
    elements.homeMomentum.style.width = `${payload.impact.momentum.home}%`;
    elements.awayMomentum.style.width = `${payload.impact.momentum.away}%`;

    renderCompetitionList(payload, competitionItems);
    renderStatistics(payload.statistics);
    renderPrematch(payload);
    renderLeagueContext(payload);
    setExpanded(state.isExpanded);

    if (payload.event?.type === "GOAL") {
      elements.eventBanner.classList.remove("is-hidden");
      elements.eventText.textContent =
        eventLabel ||
        localizedImpactSummary ||
        translate("panel.eventChangesTable", {
          team: payload.event.teamName
        });
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
      pieces.push(translateGoalType(state.language, event.typeLabel));
    }

    if (event.scorer) {
      pieces.push(event.scorer);
    } else if (event.teamName) {
      pieces.push(event.teamName);
    }

    if (event.assist) {
      pieces.push(
        translate("panel.eventAssist", {
          name: event.assist
        })
      );
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

  function renderCompetitionList(payload, items) {
    if (payload?.impact?.mode === "limited") {
      elements.competitionList.innerHTML = `<div class="lmi-empty">${escapeHtml(
        translate("panel.limitedCompetitionDetail")
      )}</div>`;
      return;
    }

    if (!items?.length) {
      elements.competitionList.innerHTML = `<div class="lmi-empty">${escapeHtml(translate("panel.noCompetitionSwing"))}</div>`;
      return;
    }

    elements.competitionList.innerHTML = items
      .map(
        (item) =>
          `<div class="lmi-competition-item">${escapeHtml(
            translateCompetitionMessage(state.language, item)
          )}</div>`
      )
      .join("");
  }

  function renderStatistics(statistics) {
    if (!statistics?.available || !statistics.home || !statistics.away) {
      elements.statsGrid.innerHTML =
        `<div class="lmi-empty">${escapeHtml(translate("panel.momentumFallback"))}</div>`;
      return;
    }

    const rows = [
      {
        label: translate("stats.possession"),
        home: formatStat(statistics.home.possession, "%"),
        away: formatStat(statistics.away.possession, "%")
      },
      {
        label: translate("stats.shotsOnTarget"),
        home: formatStat(statistics.home.shotsOnTarget),
        away: formatStat(statistics.away.shotsOnTarget)
      },
      {
        label: translate("stats.totalShots"),
        home: formatStat(statistics.home.totalShots),
        away: formatStat(statistics.away.totalShots)
      },
      {
        label: translate("stats.corners"),
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
    const prematchItems = buildPrematchItems(payload);
    elements.prematchList.innerHTML = prematchItems
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
              <div class="lmi-mini-card__line">${escapeHtml(
                translate("prematch.formation", {
                  value: entry.formation || translate("prematch.formationTbc")
                })
              )}</div>
              <div class="lmi-mini-card__line">${escapeHtml(entry.coach || translate("prematch.coachTbd"))}</div>
              <div class="lmi-mini-card__line">${escapeHtml(
                (entry.startXI || []).slice(0, 4).join(", ") || translate("prematch.xiNotReleased")
              )}</div>
            </div>
          `
        )
        .join("");
    } else {
      elements.lineupsGrid.innerHTML =
        `<div class="lmi-empty">${escapeHtml(translate("prematch.startingXiUnavailable"))}</div>`;
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
          <div class="lmi-mini-card__title">${escapeHtml(
            translate("prematch.injuriesTitle", { team: payload.teams.home.name })
          )}</div>
          ${homeItems.length ? homeItems.join("") : `<div class="lmi-mini-card__line">${escapeHtml(translate("prematch.noneReported"))}</div>`}
        </div>
        <div class="lmi-mini-card">
          <div class="lmi-mini-card__title">${escapeHtml(
            translate("prematch.injuriesTitle", { team: payload.teams.away.name })
          )}</div>
          ${awayItems.length ? awayItems.join("") : `<div class="lmi-mini-card__line">${escapeHtml(translate("prematch.noneReported"))}</div>`}
        </div>
      `;
    } else {
      elements.injuriesGrid.innerHTML =
        `<div class="lmi-empty">${escapeHtml(translate("prematch.noInjuries"))}</div>`;
    }
  }

  function renderLeagueContext(payload) {
    const context = payload.league_context;
    const fixtures = context?.fixtures || [];

    if (!fixtures.length) {
      elements.leagueContextSection.classList.add("is-hidden");
      elements.leagueContextList.innerHTML = "";
      return;
    }

    elements.leagueContextSection.classList.remove("is-hidden");
    elements.leagueContextList.innerHTML = fixtures
      .map(
        (fixture) => `
          <div class="lmi-league-context-card">
            <div class="lmi-league-context-card__teams">
              <span class="lmi-league-context-card__team lmi-league-context-card__team--home">
                ${renderLeagueContextBadge(fixture.teams.home.logo, fixture.teams.home.name)}
                <span class="lmi-league-context-card__team-name">${escapeHtml(
                  fixture.teams.home.shortName
                )}</span>
              </span>
              <span class="lmi-league-context-card__team lmi-league-context-card__team--away">
                <span class="lmi-league-context-card__team-name">${escapeHtml(
                  fixture.teams.away.shortName
                )}</span>
                ${renderLeagueContextBadge(fixture.teams.away.logo, fixture.teams.away.name)}
              </span>
            </div>
            <div class="lmi-league-context-card__score">${escapeHtml(
              `${fixture.score.home}-${fixture.score.away}`
            )}</div>
            <div class="lmi-league-context-card__meta">
              <span>${escapeHtml(formatLeagueContextStatus(fixture.status, fixture.startsAt))}</span>
            </div>
          </div>
        `
      )
      .join("");
  }

  function buildPrematchItems(payload) {
    const items = [];
    const lineups = payload.prematch?.lineups;
    const injuries = payload.prematch?.injuries;

    if (lineups?.available && lineups.home?.formation && lineups.away?.formation) {
      items.push(
        translate("prematch.lineupsSummary", {
          home: payload.teams.home.name,
          homeFormation: lineups.home.formation,
          away: payload.teams.away.name,
          awayFormation: lineups.away.formation
        })
      );
    } else {
      items.push(translate("prematch.lineupsExpected"));
    }

    if (injuries?.available) {
      items.push(
        translate("prematch.injuriesCount", {
          homeShort: payload.teams.home.shortName,
          homeCount: injuries.home?.length ?? 0,
          awayShort: payload.teams.away.shortName,
          awayCount: injuries.away?.length ?? 0
        })
      );
    } else {
      items.push(translate("prematch.noInjuries"));
    }

    return items;
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
      message: [eventLabel, buildImpactSummary(state.language, payload.impact, payload.teams)]
        .filter(Boolean)
        .join("\n")
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

  function formatStat(value, suffix = "") {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "--";
    }

    return `${value}${suffix}`;
  }

  function formatLeagueContextStatus(status, startsAt) {
    if (status?.phase === "live") {
      return `${status.minute || 0}'`;
    }

    if (status?.phase === "finished") {
      return translate("panel.finishedShort");
    }

    if (!startsAt) {
      return "KO";
    }

    return new Date(startsAt).toLocaleTimeString(state.language === "pt-BR" ? "pt-BR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatGroupPositionLine(teamName, currentPosition, projectedPosition) {
    if (
      projectedPosition?.projectedPosition &&
      projectedPosition.projectedPosition !== currentPosition.position
    ) {
      return translate("panel.projectedGroupPosition", {
        team: teamName,
        currentPosition: formatOrdinal(state.language, currentPosition.position),
        projectedPosition: formatOrdinal(state.language, projectedPosition.projectedPosition),
        group: currentPosition.group
      });
    }

    return translate("panel.groupPosition", {
      team: teamName,
      position: formatOrdinal(state.language, currentPosition.position),
      group: currentPosition.group
    });
  }

  function renderLeagueContextBadge(src, alt) {
    if (!src) {
      return "";
    }

    return `<img class="lmi-league-context-card__badge" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />`;
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
