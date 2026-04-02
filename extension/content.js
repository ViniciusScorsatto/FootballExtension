(function bootstrapLiveMatchImpact() {
  const existingRoot = document.getElementById("lmi-root");

  if (existingRoot) {
    existingRoot.remove();
  }

  const STORAGE_KEYS = [
    "fixtureId",
    "trackingEnabled",
    "activeViewMode",
    "scenarioModeEnabled",
    "scenarioPayloadPath",
    "language",
    "billingUserId",
    "billingPlan",
    "billingStatus",
    "notifyGoals",
    "notifyTableChanges"
  ];
  const DEFAULT_BACKEND_URL =
    (globalThis.LMI_CONFIG?.backendUrl || "https://footballextension-staging.up.railway.app")
      .trim()
      .replace(/\/$/, "");
  const DEFAULT_LANGUAGE = globalThis.LMI_I18N.detectBrowserLanguage();
  const BASE_POLL_INTERVAL_MS = 15000;
  const PREMATCH_MEDIUM_POLL_INTERVAL_MS = 120000;
  const PREMATCH_SLOW_POLL_INTERVAL_MS = 300000;
  const PREMATCH_FAR_POLL_INTERVAL_MS = 900000;
  const MAX_POLL_INTERVAL_MS = 120000;
  const GOAL_MODE_DURATION_MS = 7000;
  const RENDER_DEBOUNCE_MS = 80;

  const {
    normalizeLanguage,
    t,
    formatOrdinal,
    formatMovement,
    translateGoalType,
    translateInjuryReason,
    translateCompetitionMessage,
    buildImpactSummary
  } = globalThis.LMI_I18N;

  const state = {
    fixtureId: null,
    backendUrl: DEFAULT_BACKEND_URL,
    language: DEFAULT_LANGUAGE,
    billingUserId: "anonymous",
    billingPlan: "free",
    billingStatus: "inactive",
    notifyGoals: true,
    notifyTableChanges: true,
    trackingEnabled: false,
    activeViewMode: "overlay",
    scenarioModeEnabled: false,
    scenarioPayloadPath: "",
    pollTimer: null,
    renderTimer: null,
    backoffMs: BASE_POLL_INTERVAL_MS,
    isExpanded: false,
    lastSignature: "",
    lastNotifiedGoalKey: "",
    lastNotifiedImpactKey: "",
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

      if (
        changes.fixtureId ||
        changes.trackingEnabled ||
        changes.activeViewMode ||
        changes.billingUserId ||
        changes.billingPlan ||
        changes.billingStatus ||
        changes.notifyGoals ||
        changes.notifyTableChanges
      ) {
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
            <div class="lmi-collapsed-card__score">
              <img alt="" class="lmi-collapsed-card__badge lmi-collapsed-card__badge--home is-hidden" />
              <span class="lmi-collapsed-card__scoreline">--</span>
              <img alt="" class="lmi-collapsed-card__badge lmi-collapsed-card__badge--away is-hidden" />
            </div>
          </div>
        </div>
        <div class="lmi-collapsed-card__impact">${escapeHtml(translate("panel.waitingImpact"))}</div>
      </button>
      <div class="lmi-expanded">
        <div class="lmi-expanded__header">
          <div class="lmi-expanded__summary">
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
            <div class="lmi-surface-meta">
              <span class="lmi-surface-pill lmi-header-phase"></span>
              <span class="lmi-surface-freshness lmi-header-freshness"></span>
            </div>
          </div>
          <div class="lmi-expanded__actions">
            <button
              data-action="collapse"
              class="lmi-overlay-action"
              type="button"
              aria-label="${escapeHtml(translate("panel.collapse"))}"
              title="${escapeHtml(translate("panel.collapse"))}"
            >
              <span aria-hidden="true">−</span>
            </button>
            <button
              data-action="close"
              class="lmi-overlay-action"
              type="button"
              aria-label="${escapeHtml(translate("panel.close"))}"
              title="${escapeHtml(translate("panel.close"))}"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </div>

        <div class="lmi-scroll-controls" aria-label="${escapeHtml(translate("panel.scrollControls"))}">
          <button
            data-action="scroll-top"
            class="lmi-overlay-action lmi-overlay-action--scroll"
            type="button"
            aria-label="${escapeHtml(translate("panel.scrollTop"))}"
            title="${escapeHtml(translate("panel.scrollTop"))}"
          >
            <span aria-hidden="true">↑</span>
          </button>
          <button
            data-action="scroll-bottom"
            class="lmi-overlay-action lmi-overlay-action--scroll"
            type="button"
            aria-label="${escapeHtml(translate("panel.scrollBottom"))}"
            title="${escapeHtml(translate("panel.scrollBottom"))}"
          >
            <span aria-hidden="true">↓</span>
          </button>
        </div>

        <div class="lmi-event-banner is-hidden">
          <div class="lmi-event-banner__label">${escapeHtml(translate("panel.goalImpact"))}</div>
          <div class="lmi-event-banner__text">A goal changes the table.</div>
        </div>

        <div class="lmi-section lmi-table-section">
          <div class="lmi-section__label">${escapeHtml(translate("panel.tableImpact"))}</div>
          <div class="lmi-impact-row lmi-impact-row--home"></div>
          <div class="lmi-impact-row lmi-impact-row--away"></div>
        </div>

        <div class="lmi-section lmi-competition-section">
          <div class="lmi-section__label">${escapeHtml(translate("panel.competitionImpact"))}</div>
          <div class="lmi-competition-list"></div>
        </div>

        <div class="lmi-section lmi-momentum-section">
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
          <div class="lmi-predictions-grid"></div>
          <div class="lmi-lineups-grid"></div>
          <div class="lmi-injuries-grid"></div>
        </div>

        <div class="lmi-section lmi-league-context-section is-hidden">
          <div class="lmi-section__label lmi-league-context-label">${escapeHtml(translate("panel.otherMatches"))}</div>
          <div class="lmi-league-context-list"></div>
        </div>

        <div class="lmi-status-row is-hidden">
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
      expandedPanel: root.querySelector(".lmi-expanded"),
      collapsedScore: root.querySelector(".lmi-collapsed-card__scoreline"),
      collapsedHomeBadge: root.querySelector(".lmi-collapsed-card__badge--home"),
      collapsedAwayBadge: root.querySelector(".lmi-collapsed-card__badge--away"),
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
      tableSection: root.querySelector(".lmi-table-section"),
      competitionSection: root.querySelector(".lmi-competition-section"),
      momentumSection: root.querySelector(".lmi-momentum-section"),
      homeRow: root.querySelector(".lmi-impact-row--home"),
      awayRow: root.querySelector(".lmi-impact-row--away"),
      competitionList: root.querySelector(".lmi-competition-list"),
      homeMomentum: root.querySelector(".lmi-momentum__bar--home"),
      awayMomentum: root.querySelector(".lmi-momentum__bar--away"),
      statsGrid: root.querySelector(".lmi-stats-grid"),
      prematchSection: root.querySelector(".lmi-prematch-section"),
      prematchList: root.querySelector(".lmi-prematch-list"),
      predictionsGrid: root.querySelector(".lmi-predictions-grid"),
      lineupsGrid: root.querySelector(".lmi-lineups-grid"),
      injuriesGrid: root.querySelector(".lmi-injuries-grid"),
      leagueContextSection: root.querySelector(".lmi-league-context-section"),
      leagueContextLabel: root.querySelector(".lmi-league-context-label"),
      leagueContextList: root.querySelector(".lmi-league-context-list"),
      headerPhase: root.querySelector(".lmi-header-phase"),
      headerFreshness: root.querySelector(".lmi-header-freshness"),
      statusRow: root.querySelector(".lmi-status-row"),
      connectionStatus: root.querySelector(".lmi-connection-status"),
      lastUpdated: root.querySelector(".lmi-last-updated"),
      eyebrow: root.querySelector(".lmi-expanded__eyebrow"),
      headlineLabel: root.querySelector(".lmi-expanded__headline"),
      collapseButton: root.querySelector('[data-action="collapse"]'),
      closeButton: root.querySelector('[data-action="close"]'),
      scrollTopButton: root.querySelector('[data-action="scroll-top"]'),
      scrollBottomButton: root.querySelector('[data-action="scroll-bottom"]')
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
      const actionElement = event.target?.closest?.("[data-action]");
      const action = actionElement?.dataset?.action;

      if (action === "collapse") {
        setExpanded(false);
      }

      if (action === "close") {
        state.pageDismissed = true;
        flushSession();
        clearPollTimer();
        elements.root.classList.add("is-hidden");
      }

      if (action === "scroll-top") {
        elements.expandedPanel.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }

      if (action === "scroll-bottom") {
        elements.expandedPanel.scrollTo({
          top: elements.expandedPanel.scrollHeight,
          behavior: "smooth"
        });
      }
    });
  }

  async function syncSettings(fetchImmediately) {
    const settings = await chrome.storage.sync.get(STORAGE_KEYS);
    state.fixtureId = settings.fixtureId ?? null;
    state.backendUrl = DEFAULT_BACKEND_URL;
    state.language = normalizeLanguage(settings.language ?? DEFAULT_LANGUAGE);
    state.billingUserId = settings.billingUserId ?? "anonymous";
    state.billingPlan =
      settings.billingPlan === "pro" && settings.billingStatus === "active" ? "pro" : "free";
    state.billingStatus = settings.billingStatus ?? "inactive";
    state.notifyGoals = settings.notifyGoals ?? true;
    state.notifyTableChanges = settings.notifyTableChanges ?? true;
    state.trackingEnabled = Boolean(settings.trackingEnabled);
    state.activeViewMode = settings.activeViewMode ?? "overlay";
    state.scenarioModeEnabled = Boolean(settings.scenarioModeEnabled);
    state.scenarioPayloadPath = String(settings.scenarioPayloadPath || "");
    updateStaticCopy();

    if (
      !state.trackingEnabled ||
      (!state.fixtureId && !state.scenarioModeEnabled) ||
      state.pageDismissed ||
      state.activeViewMode === "sidepanel"
    ) {
      stopTracking();
      return;
    }

    elements.root.classList.remove("is-hidden");
    elements.headerPhase.textContent = "";
    elements.headerFreshness.textContent = "";
    elements.statusRow.classList.remove("is-hidden");
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
    state.lastNotifiedImpactKey = "";
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
    elements.collapseButton.setAttribute("aria-label", translate("panel.collapse"));
    elements.collapseButton.setAttribute("title", translate("panel.collapse"));
    elements.closeButton.setAttribute("aria-label", translate("panel.close"));
    elements.closeButton.setAttribute("title", translate("panel.close"));
    elements.scrollTopButton.setAttribute("aria-label", translate("panel.scrollTop"));
    elements.scrollTopButton.setAttribute("title", translate("panel.scrollTop"));
    elements.scrollBottomButton.setAttribute("aria-label", translate("panel.scrollBottom"));
    elements.scrollBottomButton.setAttribute("title", translate("panel.scrollBottom"));

    if (elements.tableLabel) elements.tableLabel.textContent = translate("panel.tableImpact");
    if (elements.competitionLabel) {
      elements.competitionLabel.textContent = translate("panel.competitionImpact");
    }
    if (elements.momentumLabel) elements.momentumLabel.textContent = translate("panel.momentum");
    if (elements.preMatchLabel) elements.preMatchLabel.textContent = translate("panel.preMatch");
    if (elements.leagueContextLabel) {
      elements.leagueContextLabel.textContent = translate("panel.otherMatches");
    }
    if (!state.lastPayload) {
      elements.headerPhase.textContent = "";
      elements.headerFreshness.textContent = "";
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

  function getPollingIntervalMs(payload) {
    if (payload?.status?.phase !== "upcoming") {
      return BASE_POLL_INTERVAL_MS;
    }

    const startsAt = payload?.startsAt ?? null;

    if (!startsAt) {
      return PREMATCH_MEDIUM_POLL_INTERVAL_MS;
    }

    const kickoffMs = new Date(startsAt).getTime();

    if (!Number.isFinite(kickoffMs)) {
      return PREMATCH_MEDIUM_POLL_INTERVAL_MS;
    }

    const minutesToKickoff = (kickoffMs - Date.now()) / (60 * 1000);

    if (minutesToKickoff <= 90) {
      return PREMATCH_MEDIUM_POLL_INTERVAL_MS;
    }

    if (minutesToKickoff <= 360) {
      return PREMATCH_SLOW_POLL_INTERVAL_MS;
    }

    return PREMATCH_FAR_POLL_INTERVAL_MS;
  }

  function extensionRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "LMI_HTTP_REQUEST",
          url,
          method: options.method || "GET",
          headers: {
            "Content-Type": "application/json",
            "x-live-impact-user": state.billingUserId || "anonymous",
            "x-live-impact-plan": state.billingPlan || "free",
            ...(options.headers || {})
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
    if (
      !state.trackingEnabled ||
      (!state.fixtureId && !state.scenarioModeEnabled) ||
      state.pageDismissed
    ) {
      return;
    }

    try {
      const payload = state.scenarioModeEnabled
        ? await fetchScenarioPayload()
        : await extensionRequest(
            `${state.backendUrl}/match-impact?fixture_id=${encodeURIComponent(state.fixtureId)}`
          );
      state.backoffMs = BASE_POLL_INTERVAL_MS;
      handlePayload(payload);

      if (!state.scenarioModeEnabled && payload.status?.isFinished) {
        flushSession(payload);
        clearPollTimer();
        return;
      }

      if (state.scenarioModeEnabled) {
        clearPollTimer();
      } else {
        scheduleNextPoll(getPollingIntervalMs(payload));
      }
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

    if (!state.scenarioModeEnabled && !state.usageTracked) {
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
      elements.headerPhase.textContent =
        payload.status.phase === "finished"
          ? translate("panel.finished")
          : payload.status.phase === "upcoming"
            ? translate("panel.preMatchStatus")
            : translate("panel.live");
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

    elements.statusRow.classList.remove("is-hidden");
    elements.headerPhase.textContent = translate("panel.offline");
    elements.headerFreshness.textContent = "";
    elements.lastUpdated.textContent = "";

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
    const isPrematch = payload.status.phase === "upcoming";
    const clockLabel =
      payload.status.phase === "upcoming" ? formatKickoff(payload) : `${payload.status.minute || 0}'`;
    const scoreline = `${payload.teams.home.shortName} ${payload.score.home}-${payload.score.away} ${payload.teams.away.shortName} · ${clockLabel}`;
    const eventLabel = buildEventLabel(payload.event);
    const competitionItems = payload.impact?.competition || [];
    const localizedImpactSummary = buildImpactSummary(state.language, payload.impact, payload.teams);
    const isLimitedImpact = payload.impact?.mode === "limited";
    const isCupImpact = payload.impact?.mode === "cup";
    const updatedLabel = translate("panel.updatedAt", {
      time: new Date(payload.last_updated).toLocaleTimeString(
        state.language === "pt-BR" ? "pt-BR" : "en-US"
      )
    });

    elements.collapsedScore.textContent = scoreline;
    setBadge(elements.collapsedHomeBadge, payload.teams.home.logo, payload.teams.home.name);
    setBadge(elements.collapsedAwayBadge, payload.teams.away.logo, payload.teams.away.name);
    elements.collapsedImpact.textContent = eventLabel || localizedImpactSummary;
    elements.leagueName.textContent = payload.league?.name || translate("panel.matchTracker");
    elements.headline.textContent = `${payload.teams.home.name} ${payload.score.home}-${payload.score.away} ${payload.teams.away.name} · ${clockLabel}`;
    setBadge(elements.homeBadge, payload.teams.home.logo, payload.teams.home.name);
    setBadge(elements.awayBadge, payload.teams.away.logo, payload.teams.away.name);
    elements.tableSection.classList.toggle("is-hidden", isPrematch || isCupImpact);
    elements.competitionSection.classList.toggle("is-hidden", isPrematch);
    elements.momentumSection.classList.toggle("is-hidden", isPrematch);

    elements.tableLabel.textContent = isLimitedImpact
      ? translate("panel.groupPositions")
      : translate("panel.tableImpact");
    elements.competitionLabel.textContent = isCupImpact
      ? translate("panel.tieImpact")
      : isLimitedImpact
      ? translate("panel.limitedCompetition")
      : translate("panel.competitionImpact");

    if (isCupImpact) {
      elements.homeRow.textContent = "";
      elements.awayRow.textContent = "";
    } else if (hasTableImpact && payload.impact?.table?.home && payload.impact?.table?.away) {
      renderTableImpactRow(elements.homeRow, payload.teams.home.name, payload.impact.table.home);
      renderTableImpactRow(elements.awayRow, payload.teams.away.name, payload.impact.table.away);
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
    } else if (payload.status.phase === "upcoming") {
      elements.homeRow.textContent = translate("panel.preMatchTableHome", {
        team: payload.teams.home.name
      });
      elements.awayRow.textContent = translate("panel.preMatchTableAway");
    } else {
      elements.homeRow.textContent = translate("panel.scoreOnlyHome", {
        team: payload.teams.home.name
      });
      elements.awayRow.textContent = translate("panel.scoreOnlyAway");
    }

    elements.headerPhase.textContent =
      payload.status.phase === "finished"
        ? translate("panel.finished")
        : payload.status.phase === "upcoming"
          ? translate("panel.preMatchStatus")
          : translate("panel.live");
    elements.headerFreshness.textContent = updatedLabel;
    elements.statusRow.classList.add("is-hidden");
    elements.connectionStatus.textContent = "";
    elements.lastUpdated.textContent = "";
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
      void notifyGoal(payload, eventLabel);
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

  function renderTableImpactRow(element, teamName, tableImpact) {
    if (!element || !tableImpact) {
      return;
    }

    const movement = Number(tableImpact.movement || 0);
    const directionClass =
      movement > 0 ? "is-up" : movement < 0 ? "is-down" : "is-flat";
    const directionSymbol = movement > 0 ? "↑" : movement < 0 ? "↓" : "•";

    element.innerHTML = `
      <span class="lmi-impact-row__team">${escapeHtml(teamName)}</span>
      <span class="lmi-impact-row__direction ${directionClass}">${directionSymbol}</span>
      <span class="lmi-impact-row__position">${escapeHtml(
        formatOrdinal(state.language, tableImpact.newPosition)
      )}</span>
      <span class="lmi-impact-row__movement ${directionClass}">${escapeHtml(
        `(${formatMovement(tableImpact.movement)})`
      )}</span>
    `;
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

    const insightRows = (statistics.insights || [])
      .map(
        (insight) => `
          <div class="lmi-stat-insight">${escapeHtml(
            translateCompetitionMessage(state.language, insight)
          )}</div>
        `
      )
      .join("");

    const statRows = rows
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

    elements.statsGrid.innerHTML = `${insightRows}${statRows}`;
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

    const prediction = payload.prematch.prediction;

    if (prediction?.available) {
      elements.predictionsGrid.innerHTML = `
        <div class="lmi-mini-card lmi-mini-card--prediction">
          <div class="lmi-mini-card__title-row">
            <div class="lmi-mini-card__title">${escapeHtml(translate("prematch.predictionTitle"))}</div>
            <div class="lmi-mini-card__chip">${escapeHtml(translate("prematch.predictionChip"))}</div>
          </div>
          ${renderPredictionLines(payload, prediction).join("")}
        </div>
      `;
    } else {
      elements.predictionsGrid.innerHTML = "";
    }

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
      const homeItems = (injuries.home || []).map((item) => renderInjuryItem(item));
      const awayItems = (injuries.away || []).map((item) => renderInjuryItem(item));

      elements.injuriesGrid.innerHTML = `
        <div class="lmi-mini-card">
          <div class="lmi-mini-card__title lmi-mini-card__title--icon"><span class="lmi-mini-card__title-icon" aria-hidden="true">✚</span><span>${escapeHtml(
            translate("prematch.injuriesTitle", { team: payload.teams.home.name })
          )}</span></div>
          ${homeItems.length ? homeItems.join("") : `<div class="lmi-mini-card__line">${escapeHtml(translate("prematch.noneReported"))}</div>`}
        </div>
        <div class="lmi-mini-card">
          <div class="lmi-mini-card__title lmi-mini-card__title--icon"><span class="lmi-mini-card__title-icon" aria-hidden="true">✚</span><span>${escapeHtml(
            translate("prematch.injuriesTitle", { team: payload.teams.away.name })
          )}</span></div>
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
                  compactLeagueContextTeamName(fixture.teams.home)
                )}</span>
              </span>
              <span class="lmi-league-context-card__team lmi-league-context-card__team--away">
                <span class="lmi-league-context-card__team-name">${escapeHtml(
                  compactLeagueContextTeamName(fixture.teams.away)
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
    const prediction = payload.prematch?.prediction;
    const lineups = payload.prematch?.lineups;
    const injuries = payload.prematch?.injuries;

    if (prediction?.available) {
      if (prediction.winnerName) {
        items.push(
          translate(
            prediction.winOrDraw ? "prematch.predictionWinOrDraw" : "prematch.predictionWinner",
            {
              team: prediction.winnerName
            }
          )
        );
      } else if (prediction.underOver) {
        items.push(
          translate("prematch.predictionGoals", {
            value: prediction.underOver
          })
        );
      }
    }

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

  function renderInjuryItem(item) {
    const localizedReason = translateInjuryReason(state.language, item.reason);

    return `<div class="lmi-mini-card__line lmi-injury-line"><span class="lmi-injury-line__icon" aria-hidden="true">✚</span><span class="lmi-injury-line__text">${escapeHtml(item.player)}${localizedReason ? ` - ${escapeHtml(localizedReason)}` : ""}</span></div>`;
  }

  function renderPredictionLines(payload, prediction) {
    const lines = [];

    if (prediction.winnerName) {
      lines.push(
        `<div class="lmi-mini-card__line">${escapeHtml(
          translate(
            prediction.winOrDraw ? "prematch.predictionWinOrDraw" : "prematch.predictionWinner",
            { team: prediction.winnerName }
          )
        )}</div>`
      );
    }

    if (prediction.underOver) {
      lines.push(
        `<div class="lmi-mini-card__line">${escapeHtml(
          translate("prematch.predictionGoals", {
            value: prediction.underOver
          })
        )}</div>`
      );
    }

    if (prediction.advice) {
      lines.push(
        `<div class="lmi-mini-card__line">${escapeHtml(
          translate("prematch.predictionAdvice", {
            value: prediction.advice
          })
        )}</div>`
      );
    }

    if (Array.isArray(prediction.comparison) && prediction.comparison.length) {
      const comparisonLine = prediction.comparison
        .map((entry) =>
          translate(`prematch.predictionCompare.${entry.key}`, {
            home: entry.home,
            away: entry.away
          })
        )
        .join(" · ");

      lines.push(`<div class="lmi-mini-card__line">${escapeHtml(comparisonLine)}</div>`);
    }

    if (!lines.length) {
      lines.push(
        `<div class="lmi-mini-card__line">${escapeHtml(
          translate("prematch.predictionUnavailable")
        )}</div>`
      );
    }

    return lines;
  }

  async function notifyGoal(payload, eventLabel) {
    if (state.scenarioModeEnabled) {
      return;
    }

    const goalKey = JSON.stringify({
      fixtureId: payload.fixture_id,
      score: payload.score,
      minute: payload.event?.minuteLabel,
      scorer: payload.event?.scorer
    });

    if (goalKey === state.lastNotifiedGoalKey) {
      return;
    }

    const hasImpactChange = hasTableChangeNotification(payload);
    const shouldSendImpactNotification = state.notifyTableChanges && hasImpactChange;
    const shouldSendGoalNotification = state.notifyGoals && !shouldSendImpactNotification;
    const notificationKey = shouldSendImpactNotification
      ? `impact:${goalKey}`
      : `goal:${goalKey}`;

    if (!(await shouldNotifyKey("lastMatchNotificationKey", notificationKey))) {
      return;
    }

    state.lastNotifiedGoalKey = goalKey;

    if (shouldSendImpactNotification) {
      state.lastNotifiedImpactKey = goalKey;
      chrome.runtime.sendMessage({
        type: "LMI_SHOW_NOTIFICATION",
        notificationId: `impact-${payload.fixture_id}-${payload.status?.minute || 0}`,
        title: translate("notifications.tableImpactTitle", {
          scoreline: `${payload.teams.home.shortName} ${payload.score.home}-${payload.score.away} ${payload.teams.away.shortName}`
        }),
        message:
          buildImpactSummary(state.language, payload.impact, payload.teams) ||
          payload.event?.impactSummary ||
          translate("notifications.goalChangedTable")
      });
      return;
    }

    if (!shouldSendGoalNotification) {
      return;
    }

    chrome.runtime.sendMessage({
      type: "LMI_SHOW_NOTIFICATION",
      notificationId: `goal-${payload.fixture_id}-${payload.status?.minute || 0}`,
      title: translate("notifications.goalTitle", {
        scoreline: `${payload.teams.home.shortName} ${payload.score.home}-${payload.score.away} ${payload.teams.away.shortName}`
      }),
      message:
        eventLabel ||
        payload.event?.impactSummary ||
        translate("notifications.goalHappened")
    });
  }

  function hasTableChangeNotification(payload) {
    const homeMovement = Number(payload.impact?.table?.home?.movement ?? 0);
    const awayMovement = Number(payload.impact?.table?.away?.movement ?? 0);

    if (homeMovement !== 0 || awayMovement !== 0) {
      return true;
    }

    const currentHome = payload.metadata?.teamGroupPositions?.home;
    const currentAway = payload.metadata?.teamGroupPositions?.away;
    const projectedHome = payload.metadata?.projectedTeamGroupPositions?.home;
    const projectedAway = payload.metadata?.projectedTeamGroupPositions?.away;

    return (
      Number(projectedHome?.projectedPosition ?? currentHome?.position ?? 0) !==
        Number(currentHome?.position ?? 0) ||
      Number(projectedAway?.projectedPosition ?? currentAway?.position ?? 0) !==
        Number(currentAway?.position ?? 0)
    );
  }

  async function shouldNotifyKey(storageKey, nextKey) {
    if (!nextKey) {
      return false;
    }

    try {
      const result = await chrome.storage.local.get(storageKey);
      if (result?.[storageKey] === nextKey) {
        return false;
      }

      await chrome.storage.local.set({
        [storageKey]: nextKey
      });
      return true;
    } catch {
      return true;
    }
  }

  function setExpanded(expanded) {
    state.isExpanded = expanded;
    elements.root.classList.toggle("is-collapsed", !expanded);
    elements.root.classList.toggle("is-expanded", expanded);
  }

  async function postJson(path, payload) {
    if (!state.backendUrl || state.scenarioModeEnabled) {
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
    if (!state.sessionStartedAt || !payload || state.scenarioModeEnabled) {
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

  async function fetchScenarioPayload() {
    if (!state.scenarioPayloadPath) {
      throw new Error("Scenario payload is not configured");
    }

    const response = await fetch(chrome.runtime.getURL(state.scenarioPayloadPath));

    if (!response.ok) {
      throw new Error(`Scenario payload failed with ${response.status}`);
    }

    return response.json();
  }

  function formatKickoff(match) {
    const locale = state.language === "pt-BR" ? "pt-BR" : "en-US";
    const kickoffDate =
      Number.isFinite(Number(match?.timestamp))
        ? new Date(Number(match.timestamp) * 1000)
        : new Date(match?.startsAt);

    if (!Number.isFinite(kickoffDate.getTime())) {
      return "KO";
    }

    return kickoffDate.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit"
    });
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

    const locale = state.language === "pt-BR" ? "pt-BR" : "en-US";
    const kickoff = new Date(startsAt);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const timeLabel = kickoff.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit"
    });

    if (kickoff.toDateString() === now.toDateString()) {
      return timeLabel;
    }

    const weekdayLabel = kickoff
      .toLocaleDateString(locale, {
        weekday: "short"
      })
      .replace(/\.$/, "");

    if (kickoff.toDateString() === tomorrow.toDateString()) {
      return `${weekdayLabel} · ${timeLabel}`;
    }

    const dayMonthLabel = kickoff
      .toLocaleDateString(locale, {
        day: "2-digit",
        month: "short"
      })
      .replace(/\.$/, "");

    return `${weekdayLabel} ${dayMonthLabel} · ${timeLabel}`;
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

  function compactLeagueContextTeamName(team) {
    const shortName = String(team?.shortName ?? "").trim();

    if (shortName && shortName.length <= 4 && !/\s/.test(shortName)) {
      return shortName.toUpperCase();
    }

    const parts = String(team?.name ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length >= 2) {
      return parts
        .slice(0, 3)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
    }

    const fallback = shortName || String(team?.name ?? "");
    return fallback.slice(0, 3).toUpperCase() || "---";
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
