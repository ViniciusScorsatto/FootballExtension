(function initLiveMatchImpactSidePanel() {
  const STORAGE_KEYS = [
    "fixtureId",
    "trackingEnabled",
    "activeViewMode",
    "scenarioModeEnabled",
    "scenarioPayloadPath",
    "language",
    "billingUserId",
    "billingPlan",
    "billingStatus"
  ];
  const DEFAULT_BACKEND_URL =
    (window.LMI_CONFIG?.backendUrl || "https://footballextension-staging.up.railway.app")
      .trim()
      .replace(/\/$/, "");
  const DEFAULT_LANGUAGE = window.LMI_I18N.detectBrowserLanguage();
  const BASE_POLL_INTERVAL_MS = 15000;
  const PREMATCH_MEDIUM_POLL_INTERVAL_MS = 120000;
  const PREMATCH_SLOW_POLL_INTERVAL_MS = 300000;
  const PREMATCH_FAR_POLL_INTERVAL_MS = 900000;
  const MAX_POLL_INTERVAL_MS = 120000;
  const captureAnalytics = window.LMI_ANALYTICS?.capture ?? (() => {});
  const updateAnalyticsConfig = window.LMI_ANALYTICS?.updateConfig ?? (() => {});

  const {
    normalizeLanguage,
    t,
    formatOrdinal,
    formatMovement,
    translateGoalType,
    translateInjuryReason,
    translateDisplayName,
    translateLeagueName,
    translateCompetitionMessage,
    translatePredictionAdvice,
    buildImpactSummary
  } = window.LMI_I18N;

  const state = {
    fixtureId: null,
    backendUrl: DEFAULT_BACKEND_URL,
    language: DEFAULT_LANGUAGE,
    billingUserId: "anonymous",
    billingPlan: "free",
    billingStatus: "inactive",
    trackingEnabled: false,
    activeViewMode: "overlay",
    scenarioModeEnabled: false,
    scenarioPayloadPath: "",
    pollTimer: null,
    backoffMs: BASE_POLL_INTERVAL_MS,
    lastPayload: null
  };
  let sidepanelOpenedTracked = false;

  const elements = {
    eyebrow: document.getElementById("sidepanelEyebrow"),
    subhead: document.getElementById("sidepanelSubhead"),
    planPill: document.getElementById("sidepanelPlanPill"),
    refreshButton: document.getElementById("sidepanelRefresh"),
    stopButton: document.getElementById("sidepanelStop"),
    emptyState: document.getElementById("sidepanelEmpty"),
    emptyEyebrow: document.getElementById("sidepanelEmptyEyebrow"),
    emptyTitle: document.getElementById("sidepanelEmptyTitle"),
    emptyBody: document.getElementById("sidepanelEmptyBody"),
    content: document.getElementById("sidepanelContent"),
    leagueName: document.getElementById("sidepanelLeagueName"),
    phasePill: document.getElementById("sidepanelPhasePill"),
    freshness: document.getElementById("sidepanelFreshness"),
    scoreboardCard: document.getElementById("sidepanelScoreboardCard"),
    scoreboard: document.getElementById("sidepanelScoreboard"),
    scoreValue: document.getElementById("sidepanelScoreValue"),
    scoreMinute: document.getElementById("sidepanelScoreMinute"),
    homeBadge: document.getElementById("sidepanelHomeBadge"),
    awayBadge: document.getElementById("sidepanelAwayBadge"),
    homeTeamName: document.getElementById("sidepanelHomeTeamName"),
    awayTeamName: document.getElementById("sidepanelAwayTeamName"),
    headline: document.getElementById("sidepanelHeadline"),
    goalTimeline: document.getElementById("sidepanelGoalTimeline"),
    summary: document.getElementById("sidepanelSummary"),
    eventBanner: document.getElementById("sidepanelEventBanner"),
    eventLabel: document.getElementById("sidepanelEventLabel"),
    eventText: document.getElementById("sidepanelEventText"),
    tableLabel: document.getElementById("sidepanelTableLabel"),
    competitionLabel: document.getElementById("sidepanelCompetitionLabel"),
    tableSection: document.getElementById("sidepanelTableLabel")?.closest(".lmi-section"),
    competitionSection: document.getElementById("sidepanelCompetitionLabel")?.closest(".lmi-section"),
    formatSection: document.getElementById("sidepanelFormatSection"),
    formatLabel: document.getElementById("sidepanelFormatLabel"),
    formatBody: document.getElementById("sidepanelFormatBody"),
    momentumLabel: document.getElementById("sidepanelMomentumLabel"),
    momentumSection: document.getElementById("sidepanelMomentumLabel")?.closest(".lmi-section"),
    momentumMeter: document.getElementById("sidepanelHomeMomentum")?.closest(".lmi-momentum"),
    prematchLabel: document.getElementById("sidepanelPrematchLabel"),
    leagueContextLabel: document.getElementById("sidepanelLeagueContextLabel"),
    homeRow: document.getElementById("sidepanelHomeRow"),
    awayRow: document.getElementById("sidepanelAwayRow"),
    competitionList: document.getElementById("sidepanelCompetitionList"),
    homeMomentum: document.getElementById("sidepanelHomeMomentum"),
    awayMomentum: document.getElementById("sidepanelAwayMomentum"),
    statsGrid: document.getElementById("sidepanelStatsGrid"),
    prematchSection: document.getElementById("sidepanelPrematchSection"),
    prematchList: document.getElementById("sidepanelPrematchList"),
    predictionsGrid: document.getElementById("sidepanelPredictionsGrid"),
    lineupsGrid: document.getElementById("sidepanelLineupsGrid"),
    injuriesGrid: document.getElementById("sidepanelInjuriesGrid"),
    leagueContextSection: document.getElementById("sidepanelLeagueContextSection"),
    leagueContextList: document.getElementById("sidepanelLeagueContextList"),
    statusRow: document.querySelector(".lmi-status-row--sidepanel"),
    connectionStatus: document.getElementById("sidepanelConnectionStatus"),
    lastUpdated: document.getElementById("sidepanelLastUpdated")
  };

  init();

  function translate(key, values = {}) {
    return t(state.language, key, values);
  }

  function trackAnalytics(eventName, properties = {}) {
    captureAnalytics(eventName, {
      distinctId: state.billingUserId || "anonymous",
      properties: {
        plan: state.billingPlan || "free",
        planStatus: state.billingStatus || "inactive",
        language: state.language,
        releaseChannel: window.LMI_CONFIG?.releaseChannel || "staging",
        ...properties
      }
    });
  }

  function buildMatchAnalyticsProperties(match) {
    return {
      fixtureId: match?.fixtureId || state.fixtureId,
      leagueId: match?.league?.id || state.lastPayload?.league?.id || null,
      leagueName: match?.league?.name,
      homeTeam: match?.teams?.home?.name || match?.teams?.home?.shortName,
      awayTeam: match?.teams?.away?.name || match?.teams?.away?.shortName
    };
  }

  function isProPlan() {
    return state.billingPlan === "pro" && state.billingStatus === "active";
  }

  function init() {
    elements.refreshButton.addEventListener("click", async () => {
      if (!state.trackingEnabled || !state.fixtureId) {
        return;
      }

      elements.connectionStatus.textContent = translate("sidepanel.refreshing");
      trackAnalytics("sidepanel_refreshed", {
        fixtureId: state.fixtureId
      });
      await fetchImpact();
    });

    elements.stopButton.addEventListener("click", async () => {
      trackAnalytics("tracking_stopped", {
        fixtureId: state.fixtureId,
        source: "sidepanel"
      });
      await chrome.storage.sync.set({
        trackingEnabled: false,
        activeViewMode: "overlay"
      });
      renderEmptyState();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") {
        return;
      }

      if (
        changes.fixtureId ||
        changes.trackingEnabled ||
        changes.activeViewMode ||
        changes.scenarioModeEnabled ||
        changes.scenarioPayloadPath ||
        changes.billingUserId ||
        changes.billingPlan ||
        changes.billingStatus
      ) {
        void syncSettings(true);
      }

      if (changes.language) {
        state.language = normalizeLanguage(changes.language.newValue ?? DEFAULT_LANGUAGE);
        if (state.lastPayload) {
          render(state.lastPayload);
        } else {
          renderStaticCopy();
        }
      }
    });

    void syncSettings(false);
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
    state.trackingEnabled = Boolean(settings.trackingEnabled);
    state.activeViewMode = settings.activeViewMode ?? "overlay";
    state.scenarioModeEnabled = Boolean(settings.scenarioModeEnabled);
    state.scenarioPayloadPath = String(settings.scenarioPayloadPath || "");

    renderStaticCopy();
    updatePlanHint();
    await loadRuntimePublicConfig();
    await fetchBillingStatus();
    renderStaticCopy();
    updatePlanHint();

    if (!sidepanelOpenedTracked) {
      trackAnalytics("sidepanel_opened", {
        trackingEnabled: state.trackingEnabled
      });
      sidepanelOpenedTracked = true;
    }

    if (
      !state.trackingEnabled ||
      (!state.fixtureId && !state.scenarioModeEnabled)
    ) {
      clearPollTimer();
      renderEmptyState();
      return;
    }

    renderTrackedShell();

    if (fetchImmediately) {
      await fetchImpact();
      return;
    }

    scheduleNextPoll(0);
  }

  async function loadRuntimePublicConfig() {
    if (!state.backendUrl) {
      return;
    }

    try {
      const payload = await fetchJson(`${state.backendUrl}/public-config`);
      const posthog = payload?.analytics?.posthog;

      if (!posthog) {
        return;
      }

      updateAnalyticsConfig({
        enabled: Boolean(posthog.enabled && posthog.apiKey),
        host: posthog.host || "https://us.i.posthog.com",
        apiKey: posthog.apiKey || ""
      });
    } catch {
      // Analytics config should never block the side panel.
    }
  }

  async function fetchBillingStatus() {
    if (!state.backendUrl || !state.billingUserId || state.billingUserId === "anonymous") {
      return;
    }

    try {
      const payload = await fetchJson(
        `${state.backendUrl}/billing/status?user_id=${encodeURIComponent(state.billingUserId)}`
      );

      state.billingPlan =
        payload.plan === "pro" && payload.status === "active" ? "pro" : "free";
      state.billingStatus = payload.status ?? "inactive";

      await chrome.storage.sync.set({
        billingPlan: state.billingPlan,
        billingStatus: state.billingStatus
      });
    } catch {
      // Keep last known billing state if the refresh fails.
    }
  }

  function renderStaticCopy() {
    document.title = translate("sidepanel.documentTitle");
    elements.eyebrow.textContent = translate("popup.eyebrow");
    elements.subhead.textContent = translate("popup.subhead");
    elements.planPill.textContent = translate("popup.proPlan");
    elements.planPill.hidden = !isProPlan();
    elements.refreshButton.textContent = translate("sidepanel.refresh");
    elements.stopButton.textContent = translate("sidepanel.stopTracking");
    elements.emptyEyebrow.textContent = translate("sidepanel.eyebrow");
    elements.emptyTitle.textContent = translate("sidepanel.emptyTitle");
    elements.emptyBody.textContent = translate("sidepanel.emptyBody");
    elements.eventLabel.textContent = translate("panel.goalImpact");
    elements.tableLabel.textContent = translate("panel.tableImpact");
    elements.competitionLabel.textContent = translate("panel.competitionImpact");
    elements.formatLabel.textContent = translate("sidepanel.formatContext");
    elements.momentumLabel.textContent = translate("panel.momentum");
    elements.prematchLabel.textContent = translate("panel.preMatch");
    elements.leagueContextLabel.textContent = translate("panel.otherMatches");
  }

  function renderEmptyState() {
    elements.emptyState.hidden = false;
    elements.content.hidden = true;
    elements.refreshButton.disabled = true;
    elements.stopButton.disabled = true;
    elements.phasePill.textContent = "";
    elements.freshness.textContent = "";
    elements.connectionStatus.textContent = translate("sidepanel.notTracking");
    elements.lastUpdated.textContent = "";
    elements.statusRow.classList.remove("is-hidden");
  }

  function renderTrackedShell() {
    elements.emptyState.hidden = true;
    elements.content.hidden = false;
    elements.refreshButton.disabled = false;
    elements.stopButton.disabled = false;
    elements.phasePill.textContent = "";
    elements.freshness.textContent = "";
    elements.connectionStatus.textContent = translate("panel.connecting");
    elements.lastUpdated.textContent = "";
    elements.statusRow.classList.remove("is-hidden");

    if (!state.lastPayload) {
      elements.leagueName.textContent = translate("panel.matchTracker");
      showHeroMessage(translate("panel.waitingMatch"));
      elements.summary.textContent = translate("panel.waitingImpact");
    }
  }

  function showHeroMessage(message) {
    elements.scoreboardCard.classList.add("is-hidden");
    elements.headline.classList.remove("is-hidden");
    elements.headline.textContent = message;
    elements.goalTimeline.classList.add("is-hidden");
    elements.goalTimeline.innerHTML = "";
  }

  function showHeroScoreboard({
    homeName,
    awayName,
    homeLogo,
    awayLogo,
    scoreline,
    minuteLabel
  }) {
    elements.scoreboardCard.classList.remove("is-hidden");
    elements.headline.classList.add("is-hidden");
    elements.homeTeamName.textContent = homeName;
    elements.awayTeamName.textContent = awayName;
    elements.scoreValue.textContent = scoreline;
    elements.scoreMinute.textContent = minuteLabel;
    setBadge(elements.homeBadge, homeLogo, homeName);
    setBadge(elements.awayBadge, awayLogo, awayName);
  }

  function updatePlanHint() {
    return undefined;
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

  async function fetchJson(url) {
    return extensionRequest(url, {
      method: "GET"
    });
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

    return kickoffDate.toLocaleString(locale, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit"
    });
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

  async function fetchImpact() {
    if (!state.trackingEnabled || (!state.fixtureId && !state.scenarioModeEnabled)) {
      return;
    }

    try {
      const payload = state.scenarioModeEnabled
        ? await fetchScenarioPayload()
        : await extensionRequest(
            `${state.backendUrl}/match-impact?fixture_id=${encodeURIComponent(state.fixtureId)}`
          );
      state.lastPayload = payload;
      state.backoffMs = BASE_POLL_INTERVAL_MS;
      render(payload);

      if (!state.scenarioModeEnabled && payload.status?.isFinished) {
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
      state.backoffMs = Math.min(state.backoffMs * 2, MAX_POLL_INTERVAL_MS);
      scheduleNextPoll(state.backoffMs);
    }
  }

  function renderErrorState(error) {
    const errorCode = error?.data?.code ?? "";
    const retryAfterSeconds = error?.data?.retryAfterSeconds ?? null;
    const retrySuffix = retryAfterSeconds ? ` Retry in ~${retryAfterSeconds}s.` : "";

    renderTrackedShell();
    elements.phasePill.textContent = translate("panel.offline");
    elements.freshness.textContent = "";

    if (errorCode === "UPSTREAM_QUOTA_EXCEEDED") {
      elements.connectionStatus.textContent = translate("panel.upstreamLimitRetrying");
      elements.summary.textContent = translate("panel.liveDataLimited");
      showHeroMessage(translate("panel.liveDataLimited"));
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
      elements.summary.textContent = translate("panel.liveFeedDelayed");
      showHeroMessage(translate("panel.liveFeedDelayed"));
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
      elements.summary.textContent = translate("panel.backendCredentialsFailed");
      showHeroMessage(translate("panel.providerRejectedCredentials"));
      elements.homeRow.textContent = translate("panel.backendApiKeyCheck");
      elements.awayRow.textContent = state.backendUrl;
      elements.competitionList.innerHTML =
        `<div class="lmi-empty">${escapeHtml(translate("panel.backendConfigIssue"))}</div>`;
      return;
    }

    elements.connectionStatus.textContent = translate("panel.backendConnectionFailed");
    elements.summary.textContent = translate("panel.backendConnectionFailed");
    showHeroMessage(translate("panel.backendConnectionFailed"));
    elements.homeRow.textContent = translate("panel.backendOnlineCheck");
    elements.awayRow.textContent = state.backendUrl;
    elements.competitionList.innerHTML =
      `<div class="lmi-empty">${escapeHtml(translate("panel.backendOfflineDetail"))}</div>`;
  }

  function render(payload) {
    renderTrackedShell();
    const hasTableImpact = payload.metadata?.tableImpactAvailable !== false;
    const isPrematch = payload.status.phase === "upcoming";
    const isFinished = payload.status.phase === "finished";
    const hasStatistics = Boolean(
      payload.statistics?.available && payload.statistics.home && payload.statistics.away
    );
    const clockLabel =
      payload.status.phase === "upcoming" ? formatKickoff(payload) : `${payload.status.minute || 0}'`;
    const eventLabel = buildEventLabel(payload.event);
    const competitionItems = payload.impact?.competition || [];
    const localizedImpactSummary = buildImpactSummary(state.language, payload.impact, payload.teams);
    const isLimitedImpact = payload.impact?.mode === "limited";
    const isCupImpact = payload.impact?.mode === "cup";
    const isScoreOnlyImpact = payload.impact?.mode === "score-only";
    const updatedLabel = translate("panel.updatedAt", {
      time: new Date(payload.last_updated).toLocaleTimeString(
        state.language === "pt-BR" ? "pt-BR" : "en-US"
      )
    });

    const localizedLeagueName = translateLeagueName(state.language, payload.league?.name);
    const localizedHomeName = translateDisplayName(state.language, payload.teams.home.name);
    const localizedAwayName = translateDisplayName(state.language, payload.teams.away.name);

    elements.leagueName.textContent = localizedLeagueName || translate("panel.matchTracker");
    showHeroScoreboard({
      homeName: localizedHomeName,
      awayName: localizedAwayName,
      homeLogo: payload.teams.home.logo,
      awayLogo: payload.teams.away.logo,
      scoreline: `${payload.score.home} - ${payload.score.away}`,
      minuteLabel:
        payload.status.phase === "live"
          ? clockLabel
          : payload.status.phase === "finished"
            ? translate("panel.finishedShort")
            : clockLabel
    });
    renderGoalTimeline(elements.goalTimeline, payload.goal_timeline);
    elements.summary.textContent = localizedImpactSummary;
    elements.tableSection.classList.toggle("is-hidden", isPrematch || isCupImpact || isScoreOnlyImpact);
    elements.competitionSection.classList.toggle("is-hidden", isPrematch || isScoreOnlyImpact);
    elements.momentumSection.classList.toggle("is-hidden", isPrematch || (isFinished && !hasStatistics));
    elements.momentumMeter.classList.toggle("is-hidden", isFinished);
    if (isPrematch) {
      elements.formatSection.classList.add("is-hidden");
    }

    elements.tableLabel.textContent = isLimitedImpact
      ? translate("panel.groupPositions")
      : translate("panel.tableImpact");
    elements.competitionLabel.textContent = isCupImpact
      ? translate("panel.tieImpact")
      : isLimitedImpact
      ? translate("panel.limitedCompetition")
      : translate("panel.competitionImpact");
    elements.momentumLabel.textContent = isFinished
      ? translate("panel.matchStats")
      : translate("panel.momentum");

    if (isCupImpact) {
      elements.homeRow.textContent = "";
      elements.awayRow.textContent = "";
    } else if (hasTableImpact && payload.impact?.table?.home && payload.impact?.table?.away) {
      renderTableImpactRow(elements.homeRow, localizedHomeName, payload.impact.table.home);
      renderTableImpactRow(elements.awayRow, localizedAwayName, payload.impact.table.away);
    } else if (payload.impact?.mode === "limited") {
      const homeGroupPosition = payload.metadata?.teamGroupPositions?.home;
      const awayGroupPosition = payload.metadata?.teamGroupPositions?.away;
      const homeProjectedGroupPosition = payload.metadata?.projectedTeamGroupPositions?.home;
      const awayProjectedGroupPosition = payload.metadata?.projectedTeamGroupPositions?.away;

      elements.homeRow.textContent = homeGroupPosition
        ? formatGroupPositionLine(localizedHomeName, homeGroupPosition, homeProjectedGroupPosition)
        : translate("panel.limitedHome");
      elements.awayRow.textContent = awayGroupPosition
        ? formatGroupPositionLine(localizedAwayName, awayGroupPosition, awayProjectedGroupPosition)
        : translate("panel.limitedAway");
    } else if (payload.status.phase === "upcoming") {
      elements.homeRow.textContent = translate("panel.preMatchTableHome", {
        team: localizedHomeName
      });
      elements.awayRow.textContent = translate("panel.preMatchTableAway");
    } else {
      elements.homeRow.textContent = translate("panel.scoreOnlyHome", {
        team: localizedHomeName
      });
      elements.awayRow.textContent = translate("panel.scoreOnlyAway");
    }

    elements.phasePill.textContent =
      payload.status.phase === "finished"
        ? translate("panel.finished")
        : payload.status.phase === "upcoming"
          ? translate("panel.preMatchStatus")
          : translate("panel.live");
    elements.freshness.textContent = updatedLabel;
    elements.connectionStatus.textContent = "";
    elements.lastUpdated.textContent = "";
    elements.statusRow.classList.add("is-hidden");
    if (!isFinished) {
      elements.homeMomentum.style.width = `${payload.impact.momentum.home}%`;
      elements.awayMomentum.style.width = `${payload.impact.momentum.away}%`;
    }

    renderCompetitionList(payload, competitionItems);
    renderFormatContext(payload);
    renderStatistics(payload.statistics, { isFinished });
    renderPrematch(payload);
    renderLeagueContext(payload);

    if (payload.event?.type === "GOAL") {
      elements.eventBanner.classList.remove("is-hidden");
      elements.eventText.textContent =
        eventLabel ||
        localizedImpactSummary ||
        translate("panel.eventChangesTable", {
          team: payload.event.teamName
        });
    } else {
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

    const label = pieces.filter(Boolean).join(" · ");

    if (label) {
      return label;
    }

    return event.message || "";
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
      <span class="lmi-impact-row__movement-badge ${directionClass}">${escapeHtml(
        formatMovement(tableImpact.movement)
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

  function renderGoalTimeline(element, goals) {
    if (!element) {
      return;
    }

    const timeline = Array.isArray(goals) ? goals.filter((goal) => goal?.playerName && goal?.minuteLabel) : [];

    if (!timeline.length) {
      element.innerHTML = "";
      element.classList.add("is-hidden");
      return;
    }

    const homeGoals = timeline.filter((goal) => goal.side === "home");
    const awayGoals = timeline.filter((goal) => goal.side === "away");

    const renderGoalItem = (goal) => {
      const suffix = goal.isPenalty ? " (P)" : goal.isOwnGoal ? " (OG)" : "";
      return `<div class="lmi-goal-timeline__item">${escapeHtml(
        `${goal.playerName} ${goal.minuteLabel}${suffix}`
      )}</div>`;
    };

    element.innerHTML = `
      <div class="lmi-goal-timeline__column lmi-goal-timeline__column--home">
        ${homeGoals.map(renderGoalItem).join("")}
      </div>
      <div class="lmi-goal-timeline__divider" aria-hidden="true">⚽</div>
      <div class="lmi-goal-timeline__column lmi-goal-timeline__column--away">
        ${awayGoals.map(renderGoalItem).join("")}
      </div>
    `;
    element.classList.remove("is-hidden");
  }

  function renderFormatContext(payload) {
    if (!isProPlan() || payload.status?.phase === "upcoming") {
      elements.formatSection.classList.add("is-hidden");
      elements.formatBody.textContent = "";
      return;
    }

    const format = payload.metadata?.competitionFormat ?? "unknown";
    const impactMode = payload.metadata?.impactMode ?? payload.impact?.mode ?? "score-only";
    const groupLabel = payload.metadata?.groupLabel ?? "";
    const hasGroupPositions =
      Boolean(payload.metadata?.teamGroupPositions?.home) || Boolean(payload.metadata?.teamGroupPositions?.away);

    let message = "";

    if (format === "grouped_same_group" && groupLabel) {
      message = translate("sidepanel.groupedSameGroupContext", {
        group: groupLabel
      });
    } else if (impactMode === "cup") {
      const tieType = payload.metadata?.knockoutContext?.type ?? "";
      if (tieType === "single_leg_knockout") {
        message = translate("sidepanel.cupSingleLegContext");
      } else if (tieType === "two_leg_first_leg") {
        message = translate("sidepanel.cupFirstLegContext");
      } else {
        message = translate("sidepanel.cupTwoLegContext");
      }
    } else if (format === "grouped_cross_play" && hasGroupPositions) {
      message = translate("sidepanel.groupedCrossPlayContext");
    } else if (impactMode === "limited") {
      message = translate("sidepanel.limitedFormatContext");
    } else if (impactMode === "score-only") {
      message = translate("sidepanel.scoreOnlyFormatContext");
    }

    if (!message) {
      elements.formatSection.classList.add("is-hidden");
      elements.formatBody.textContent = "";
      return;
    }

    elements.formatSection.classList.remove("is-hidden");
    elements.formatBody.textContent = message;
  }

  function renderStatistics(statistics, { isFinished = false } = {}) {
    if (!statistics?.available || !statistics.home || !statistics.away) {
      elements.statsGrid.innerHTML = isFinished
        ? ""
        : `<div class="lmi-empty">${escapeHtml(translate("panel.momentumFallback"))}</div>`;
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

    const insightRows = isFinished
      ? ""
      : (statistics.insights || [])
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
    if (!isProPlan() || payload.status.phase !== "upcoming" || !payload.prematch) {
      elements.prematchSection.classList.add("is-hidden");
      elements.predictionsGrid.innerHTML = "";
      elements.lineupsGrid.innerHTML = "";
      elements.injuriesGrid.innerHTML = "";
      return;
    }

    elements.prematchSection.classList.remove("is-hidden");
    elements.prematchList.innerHTML = "";

    const prediction = payload.prematch.prediction;

    if (prediction?.available) {
      elements.predictionsGrid.innerHTML = `
        ${renderPredictionCard(payload, prediction)}
      `;
    } else {
      elements.predictionsGrid.innerHTML = "";
    }

    const lineups = payload.prematch.lineups;
    const injuries = payload.prematch.injuries;

    if (lineups?.available) {
      elements.lineupsGrid.innerHTML = [lineups.home, lineups.away]
        .filter(Boolean)
        .map(
          (entry, index) =>
            renderLineupCard(
              index === 0 ? payload.teams.home.name : payload.teams.away.name,
              entry,
              injuries?.available
                ? index === 0
                  ? injuries.home || []
                  : injuries.away || []
                : null
            )
        )
        .join("");
    } else {
      elements.lineupsGrid.innerHTML =
        `<div class="lmi-empty">${escapeHtml(translate("prematch.startingXiUnavailable"))}</div>`;
    }

    elements.injuriesGrid.innerHTML = "";
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

  function renderInjuryItem(item) {
    const localizedReason = translateInjuryReason(state.language, item.reason);

    return `<div class="lmi-mini-card__line lmi-injury-line"><span class="lmi-injury-line__icon" aria-hidden="true">✚</span><span class="lmi-injury-line__text">${escapeHtml(item.player)}${localizedReason ? ` - ${escapeHtml(localizedReason)}` : ""}</span></div>`;
  }

  function renderPredictionCard(payload, prediction) {
    const localizedAdvice = translatePredictionAdvice(state.language, prediction.advice);
    const summary = prediction.winnerName
      ? translate(
          prediction.winOrDraw ? "prematch.predictionWinOrDraw" : "prematch.predictionWinner",
          { team: prediction.winnerName }
        )
      : translate("prematch.predictionUnavailable");
    const comparisonRows = renderPredictionComparisonRows(prediction.comparison || []);
    const metaChips = [];
    const adviceIncludesGoals =
      localizedAdvice &&
      prediction.underOver &&
      predictionAdviceMentionsGoals(localizedAdvice, prediction.underOver);

    if (prediction.underOver && !adviceIncludesGoals) {
      metaChips.push(
        `<span class="lmi-prediction-chip">${escapeHtml(
          translate("prematch.predictionGoalsChip", {
            value: prediction.underOver
          })
        )}</span>`
      );
    }

    if (localizedAdvice) {
      metaChips.push(
        `<span class="lmi-prediction-chip lmi-prediction-chip--wide">${escapeHtml(
          translate("prematch.predictionAdviceChip", {
            value: localizedAdvice
          })
        )}</span>`
      );
    }

    return `
      <div class="lmi-mini-card lmi-mini-card--prediction">
        <div class="lmi-mini-card__title-row">
          <div class="lmi-mini-card__title">${escapeHtml(translate("prematch.predictionTitle"))}</div>
          <div class="lmi-mini-card__chip">${escapeHtml(translate("prematch.predictionChip"))}</div>
        </div>
        <div class="lmi-prediction-card__summary">${escapeHtml(summary)}</div>
        ${comparisonRows
          ? `
            <div class="lmi-prediction-card__legend">
              <span>${escapeHtml(payload.teams.home.shortName || payload.teams.home.name)}</span>
              <span>${escapeHtml(payload.teams.away.shortName || payload.teams.away.name)}</span>
            </div>
            <div class="lmi-prediction-card__comparisons">${comparisonRows}</div>
          `
          : ""}
        ${metaChips.length ? `<div class="lmi-prediction-card__chips">${metaChips.join("")}</div>` : ""}
      </div>
    `;
  }

  function renderPredictionComparisonRows(entries) {
    return entries
      .map((entry) => {
        const homeValue = normalizePredictionMetric(entry.home);
        const awayValue = normalizePredictionMetric(entry.away);

        if (homeValue === null || awayValue === null) {
          return "";
        }

        const total = homeValue + awayValue;
        const homeWidth = total > 0 ? (homeValue / total) * 100 : 50;
        const awayWidth = total > 0 ? (awayValue / total) * 100 : 50;

        return `
          <div class="lmi-prediction-compare">
            <div class="lmi-prediction-compare__meta">
              <span>${escapeHtml(formatPredictionMetric(homeValue))}</span>
              <span>${escapeHtml(translate(`prematch.predictionMetric.${entry.key}`))}</span>
              <span>${escapeHtml(formatPredictionMetric(awayValue))}</span>
            </div>
            <div class="lmi-prediction-compare__track">
              <span class="lmi-prediction-compare__segment lmi-prediction-compare__segment--home" style="width:${homeWidth.toFixed(1)}%"></span>
              <span class="lmi-prediction-compare__segment lmi-prediction-compare__segment--away" style="width:${awayWidth.toFixed(1)}%"></span>
            </div>
          </div>
        `;
      })
      .filter(Boolean)
      .join("");
  }

  function normalizePredictionMetric(value) {
    if (value === null || value === undefined) {
      return null;
    }

    const numeric = Number.parseFloat(String(value).replace("%", "").trim());
    return Number.isFinite(numeric) ? numeric : null;
  }

  function formatPredictionMetric(value) {
    return `${Math.round(value)}%`;
  }

  function predictionAdviceMentionsGoals(advice, underOver) {
    const adviceText = String(advice || "").toLowerCase();
    const goalToken = String(underOver || "").trim().toLowerCase();

    if (!adviceText || !goalToken) {
      return false;
    }

    if (adviceText.includes(goalToken)) {
      return true;
    }

    const match = goalToken.match(/^([+-])\s*(\d+(?:\.\d+)?)$/);
    if (!match) {
      return false;
    }

    const [, direction, value] = match;
    const normalizedPhrase = direction === "-" ? `under ${value}` : `over ${value}`;
    return adviceText.includes(normalizedPhrase);
  }

  function renderLineupCard(teamName, entry, injuries) {
    const formationLabel = translate("prematch.formation", {
      value: entry.formation || translate("prematch.formationTbc")
    });
    const coachLabel = translate("prematch.coachLabel", {
      name: entry.coach || translate("prematch.coachTbd")
    });
    const pitchMarkup = buildFormationPitch(entry);
    const fallbackList = escapeHtml(
      (entry.startXI || []).map(getLineupPlayerName).filter(Boolean).join(", ") ||
        translate("prematch.xiNotReleased")
    );
    const injuriesMarkup = renderLineupCardInjuries(teamName, injuries);

    return `
      <div class="lmi-mini-card lmi-lineup-card">
        <div class="lmi-mini-card__title">${escapeHtml(teamName)}</div>
        <div class="lmi-mini-card__line">${escapeHtml(formationLabel)}</div>
        <div class="lmi-mini-card__line">${escapeHtml(coachLabel)}</div>
        ${pitchMarkup || `<div class="lmi-mini-card__line">${fallbackList}</div>`}
        ${injuriesMarkup}
      </div>
    `;
  }

  function renderLineupCardInjuries(teamName, injuries) {
    const items = Array.isArray(injuries) ? injuries : [];

    return `
      <div class="lmi-lineup-card__injuries">
        <div class="lmi-mini-card__title">${escapeHtml(
          translate("prematch.injuriesTitle", { team: teamName })
        )}</div>
        ${
          items.length
            ? items.map((item) => renderInjuryItem(item)).join("")
            : `<div class="lmi-mini-card__line">${escapeHtml(translate("prematch.noneReported"))}</div>`
        }
      </div>
    `;
  }

  function buildFormationPitch(entry) {
    const players = normalizeLineupPlayers(entry.startXI);
    const layout = buildGridPitchLayout(players) || buildFormationPitchLayout(entry.formation, players);

    if (!layout) {
      return "";
    }

    return renderPitch(layout, entry);
  }

  function parseFormationRows(formation) {
    const parts = String(formation || "")
      .split("-")
      .map((part) => Number.parseInt(part.trim(), 10))
      .filter((part) => Number.isInteger(part) && part > 0);

    return parts.length ? parts : null;
  }

  function renderPitchPlayer(player, entry) {
    const dotColor = getLineupPlayerDotColor(player, entry);
    const dotStyle = dotColor ? ` style="background:${escapeHtml(dotColor)}"` : "";

    return `
      <div class="lmi-lineup-pitch__player">
        <span class="lmi-lineup-pitch__dot" aria-hidden="true"${dotStyle}></span>
        <span class="lmi-lineup-pitch__name">${escapeHtml(compactPlayerName(getLineupPlayerName(player)))}</span>
      </div>
    `;
  }

  function compactPlayerName(playerName) {
    const parts = String(playerName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) {
      return "";
    }

    return parts[parts.length - 1];
  }

  function formationLabelForAria(formation) {
    return translate("prematch.lineupPitchAria", {
      value: formation || translate("prematch.formationTbc")
    });
  }

  function normalizeLineupPlayers(players) {
    return (Array.isArray(players) ? players : [])
      .slice(0, 11)
      .map((player) =>
        typeof player === "string"
          ? { name: player, position: "", grid: "" }
          : {
              name: player?.name ?? "",
              position: player?.position ?? "",
              grid: player?.grid ?? ""
            }
      )
      .filter((player) => player.name);
  }

  function buildGridPitchLayout(players) {
    const gridPlayers = players
      .map((player) => ({
        ...player,
        parsedGrid: parseGridCoordinates(player.grid)
      }))
      .filter((player) => player.parsedGrid);

    if (gridPlayers.length < 11) {
      return null;
    }

    const rowsMap = new Map();
    for (const player of gridPlayers) {
      const [row, col] = player.parsedGrid;
      if (!rowsMap.has(row)) {
        rowsMap.set(row, []);
      }
      rowsMap.get(row).push({ ...player, gridColumn: col });
    }

    const orderedRows = [...rowsMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, rowPlayers]) =>
        rowPlayers.sort((a, b) => a.gridColumn - b.gridColumn).map(({ parsedGrid, gridColumn, ...player }) => player)
      );

    const goalkeeperRows = orderedRows.filter((row) => row.some((player) => player.position === "G"));
    const outfieldRows = orderedRows.filter((row) => row.every((player) => player.position !== "G"));

    if (!goalkeeperRows.length || !outfieldRows.length) {
      return null;
    }

    return {
      outfieldRows,
      goalkeeperRows
    };
  }

  function buildFormationPitchLayout(formation, players) {
    const formationRows = parseFormationRows(formation);

    if (!formationRows || players.length < 11) {
      return null;
    }

    const goalkeeper = players[0];
    const outfield = players.slice(1, 11);
    const totalOutfieldSlots = formationRows.reduce((sum, count) => sum + count, 0);

    if (totalOutfieldSlots !== 10 || outfield.length < 10) {
      return null;
    }

    const rows = [];
    let cursor = 0;
    for (const count of formationRows) {
      rows.push(outfield.slice(cursor, cursor + count));
      cursor += count;
    }

    return {
      outfieldRows: rows,
      goalkeeperRows: [[goalkeeper]]
    };
  }

  function renderPitch(layout, entry) {
    return `
      <div class="lmi-lineup-pitch" aria-label="${escapeHtml(formationLabelForAria(entry.formation))}">
        <div class="lmi-lineup-pitch__marking lmi-lineup-pitch__marking--midline" aria-hidden="true"></div>
        <div class="lmi-lineup-pitch__marking lmi-lineup-pitch__marking--center-circle" aria-hidden="true"></div>
        ${layout.goalkeeperRows
          .map(
            (row) => `
              <div class="lmi-lineup-pitch__row lmi-lineup-pitch__row--goalkeeper">
                ${row.map((player) => renderPitchPlayer(player, entry)).join("")}
              </div>
            `
          )
          .join("")}
        ${layout.outfieldRows
          .map(
            (row) => `
              <div class="lmi-lineup-pitch__row">
                ${row.map((player) => renderPitchPlayer(player, entry)).join("")}
              </div>
            `
          )
          .join("")}
      </div>
    `;
  }

  function parseGridCoordinates(grid) {
    const match = String(grid || "").match(/^(\d+):(\d+)$/);
    if (!match) {
      return null;
    }

    return [Number.parseInt(match[1], 10), Number.parseInt(match[2], 10)];
  }

  function getLineupPlayerName(player) {
    return typeof player === "string" ? player : player?.name ?? "";
  }

  function getLineupPlayerDotColor(player, entry) {
    const rawColor =
      player.position === "G" ? entry?.colors?.goalkeeperPrimary : entry?.colors?.playerPrimary;

    return normalizeHexColor(rawColor);
  }

  function normalizeHexColor(value) {
    const normalized = String(value || "").trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
      return "";
    }

    return `#${normalized}`;
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
