(function initLiveMatchImpactSidePanel() {
  const STORAGE_KEYS = [
    "fixtureId",
    "trackingEnabled",
    "activeViewMode",
    "language",
    "billingUserId",
    "billingPlan",
    "billingStatus",
    "leagueFilterId"
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
    translateCompetitionMessage,
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
    currentLiveMatches: [],
    currentUpcomingMatches: [],
    currentLeagueFilter: {
      featuredLeagueIds: [],
      supportedLeagueIds: [],
      availableLeagues: []
    },
    selectedLeagueId: null,
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
    leagueLabel: document.getElementById("sidepanelLeagueLabel"),
    leagueFilter: document.getElementById("sidepanelLeagueFilter"),
    liveLabel: document.getElementById("sidepanelLiveLabel"),
    liveMatches: document.getElementById("sidepanelLiveMatches"),
    upcomingLabel: document.getElementById("sidepanelUpcomingLabel"),
    upcomingMatches: document.getElementById("sidepanelUpcomingMatches"),
    applyMatchButton: document.getElementById("sidepanelApplyMatch"),
    refreshMatchesButton: document.getElementById("sidepanelRefreshMatches"),
    planHint: document.getElementById("sidepanelPlanHint"),
    emptyState: document.getElementById("sidepanelEmpty"),
    emptyEyebrow: document.getElementById("sidepanelEmptyEyebrow"),
    emptyTitle: document.getElementById("sidepanelEmptyTitle"),
    emptyBody: document.getElementById("sidepanelEmptyBody"),
    content: document.getElementById("sidepanelContent"),
    leagueEyebrow: document.getElementById("sidepanelLeagueEyebrow"),
    leagueName: document.getElementById("sidepanelLeagueName"),
    homeBadge: document.getElementById("sidepanelHomeBadge"),
    awayBadge: document.getElementById("sidepanelAwayBadge"),
    headline: document.getElementById("sidepanelHeadline"),
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
    lineupsGrid: document.getElementById("sidepanelLineupsGrid"),
    injuriesGrid: document.getElementById("sidepanelInjuriesGrid"),
    leagueContextSection: document.getElementById("sidepanelLeagueContextSection"),
    leagueContextList: document.getElementById("sidepanelLeagueContextList"),
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
      leagueId: match?.league?.id || getSelectedLeagueId(),
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

    elements.liveMatches.addEventListener("change", () => {
      if (elements.liveMatches.value) {
        elements.upcomingMatches.value = "";
      }
    });

    elements.upcomingMatches.addEventListener("change", () => {
      if (elements.upcomingMatches.value) {
        elements.liveMatches.value = "";
      }
    });

    elements.leagueFilter.addEventListener("change", async () => {
      state.selectedLeagueId = getSelectedLeagueId();
      await chrome.storage.sync.set({
        leagueFilterId: state.selectedLeagueId
      });
      const selectedLeague = state.currentLeagueFilter.availableLeagues.find(
        (league) => league.id === state.selectedLeagueId
      );
      trackAnalytics("sidepanel_league_focus_selected", {
        selectedLeagueId: state.selectedLeagueId,
        selectedLeagueName: selectedLeague?.name
      });
      renderMatchLists();
    });

    elements.applyMatchButton.addEventListener("click", async () => {
      await handleApplyMatch();
    });

    elements.refreshMatchesButton.addEventListener("click", async () => {
      elements.connectionStatus.textContent = translate("popup.statusLoadingMatches");
      trackAnalytics("sidepanel_match_list_refreshed", {
        selectedLeagueId: getSelectedLeagueId()
      });
      await refreshMatchLists();
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
    state.selectedLeagueId = settings.leagueFilterId ?? null;

    renderStaticCopy();
    updatePlanHint();
    await loadRuntimePublicConfig();
    await refreshMatchLists();

    if (!sidepanelOpenedTracked) {
      trackAnalytics("sidepanel_opened", {
        trackingEnabled: state.trackingEnabled
      });
      sidepanelOpenedTracked = true;
    }

    if (!state.trackingEnabled || !state.fixtureId || state.activeViewMode !== "sidepanel") {
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

  function renderStaticCopy() {
    document.title = translate("sidepanel.documentTitle");
    elements.eyebrow.textContent = translate("popup.eyebrow");
    elements.subhead.textContent = translate("popup.subhead");
    elements.planPill.textContent = translate("popup.proPlan");
    elements.planPill.hidden = !isProPlan();
    elements.refreshButton.textContent = translate("sidepanel.refresh");
    elements.stopButton.textContent = translate("sidepanel.stopTracking");
    elements.leagueLabel.textContent = translate("popup.leagueFocus");
    elements.liveLabel.textContent = translate("popup.liveMatches");
    elements.upcomingLabel.textContent = translate("popup.upcomingMatches");
    elements.applyMatchButton.textContent = translate("sidepanel.trackMatch");
    elements.refreshMatchesButton.textContent = translate("popup.refreshMatches");
    elements.emptyEyebrow.textContent = translate("sidepanel.eyebrow");
    elements.emptyTitle.textContent = translate("sidepanel.emptyTitle");
    elements.emptyBody.textContent = translate("sidepanel.emptyBody");
    elements.leagueEyebrow.textContent = translate("panel.eyebrow");
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
    elements.connectionStatus.textContent = translate("sidepanel.notTracking");
    elements.lastUpdated.textContent = "";
  }

  function renderTrackedShell() {
    elements.emptyState.hidden = true;
    elements.content.hidden = false;
    elements.connectionStatus.textContent = translate("panel.connecting");

    if (!state.lastPayload) {
      elements.leagueName.textContent = translate("panel.matchTracker");
      elements.headline.textContent = translate("panel.waitingMatch");
      elements.summary.textContent = translate("panel.waitingImpact");
    }
  }

  function updatePlanHint() {
    elements.planHint.textContent = isProPlan()
      ? translate("popup.statusProActive")
      : translate("popup.proUnlocksAllLeagues");
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

  function buildLeagueFilterLabel(league) {
    const featuredPrefix =
      !isProPlan() && league.featured ? `${translate("popup.featuredLeaguePrefix")} · ` : "";
    const availabilitySuffix =
      league.availableNow === false ? ` · ${translate("popup.noMatchesInCurrentWindow")}` : "";

    return `${featuredPrefix}${league.name}${availabilitySuffix}`;
  }

  function buildLeagueCountryGroups() {
    const countryGroups = new Map();

    state.currentLeagueFilter.availableLeagues.forEach((league) => {
      const country = String(league.country || "Other").trim() || "Other";

      if (!countryGroups.has(country)) {
        countryGroups.set(country, []);
      }

      countryGroups.get(country).push(league);
    });

    return [...countryGroups.entries()].sort(([leftCountry], [rightCountry]) =>
      leftCountry.localeCompare(rightCountry)
    );
  }

  function mergeLeagueFilterPayloads(...payloads) {
    const featuredLeagueIds = new Set();
    const supportedLeagueIds = new Set();
    const availableLeagues = new Map();

    payloads.forEach((payload) => {
      const leagueFilter = payload?.leagueFilter ?? {};

      (leagueFilter.featuredLeagueIds ?? []).forEach((leagueId) => featuredLeagueIds.add(leagueId));
      (leagueFilter.supportedLeagueIds ?? []).forEach((leagueId) => supportedLeagueIds.add(leagueId));
      (leagueFilter.availableLeagues ?? []).forEach((league) => {
        if (!league?.id) {
          return;
        }

        const existingLeague = availableLeagues.get(league.id);

        availableLeagues.set(league.id, {
          id: league.id,
          name: league.name,
          country: league.country,
          featured: existingLeague?.featured || league.featured === true,
          availableNow: existingLeague?.availableNow || league.availableNow === true
        });
      });
    });

    return {
      featuredLeagueIds: [...featuredLeagueIds],
      supportedLeagueIds: [...supportedLeagueIds],
      availableLeagues: [...availableLeagues.values()].sort((left, right) => {
        if (left.featured !== right.featured) {
          return left.featured ? -1 : 1;
        }

        return buildLeagueFilterLabel(left).localeCompare(buildLeagueFilterLabel(right));
      })
    };
  }

  function populateLeagueFilterSelect() {
    elements.leagueFilter.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = translate("popup.allSupportedLeagues");
    elements.leagueFilter.appendChild(allOption);

    buildLeagueCountryGroups().forEach(([country, leagues]) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = country;

      leagues.forEach((league) => {
        const option = document.createElement("option");
        option.value = String(league.id);
        option.textContent = buildLeagueFilterLabel(league);
        option.disabled = league.availableNow === false || (!isProPlan() && !league.featured);
        option.selected = Number(state.selectedLeagueId) === league.id;
        optgroup.appendChild(option);
      });

      elements.leagueFilter.appendChild(optgroup);
    });
  }

  function getSelectedLeagueId() {
    const leagueId = Number(elements.leagueFilter.value);
    return Number.isInteger(leagueId) && leagueId > 0 ? leagueId : null;
  }

  function buildLiveLabel(match) {
    const featuredPrefix = !isProPlan() && match.league?.featured
      ? `${translate("popup.featuredLeaguePrefix")} · `
      : "";
    const suffix =
      match.impactMode === "score-only" ? ` · ${translate("popup.scoreOnlySuffix")}` : "";

    return `${featuredPrefix}${match.teams.home.shortName} ${match.score.home}-${match.score.away} ${match.teams.away.shortName} · ${match.status.minute || 0}' · ${match.league.name}${suffix}`;
  }

  function buildUpcomingLabel(match) {
    const featuredPrefix = !isProPlan() && match.league?.featured
      ? `${translate("popup.featuredLeaguePrefix")} · `
      : "";

    return `${featuredPrefix}${match.teams.home.shortName} vs ${match.teams.away.shortName} · ${formatKickoff(match.startsAt)} · ${match.league.name}`;
  }

  function formatKickoff(dateString) {
    return new Date(dateString).toLocaleString(state.language === "pt-BR" ? "pt-BR" : "en-US", {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function getFilteredMatches(matches, leagueId) {
    const planFilteredMatches = isProPlan()
      ? matches
      : matches.filter((match) => match.league?.featured);

    if (!leagueId) {
      return planFilteredMatches;
    }

    return planFilteredMatches.filter((match) => match.league?.id === leagueId);
  }

  function populateMatchSelect(selectElement, matches, placeholderLabel, labelBuilder) {
    selectElement.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = placeholderLabel;
    selectElement.appendChild(placeholder);

    matches.forEach((match) => {
      const option = document.createElement("option");
      option.value = String(match.fixtureId);
      option.textContent = labelBuilder(match);
      option.selected = state.fixtureId === match.fixtureId;
      selectElement.appendChild(option);
    });
  }

  function renderMatchLists() {
    const selectedLeagueId = getSelectedLeagueId();
    const liveMatches = getFilteredMatches(state.currentLiveMatches, selectedLeagueId);
    const upcomingMatches = getFilteredMatches(state.currentUpcomingMatches, selectedLeagueId);

    populateMatchSelect(
      elements.liveMatches,
      liveMatches,
      liveMatches.length ? translate("popup.livePlaceholder") : translate("popup.liveEmpty"),
      buildLiveLabel
    );

    populateMatchSelect(
      elements.upcomingMatches,
      upcomingMatches,
      upcomingMatches.length ? translate("popup.upcomingPlaceholder") : translate("popup.upcomingEmpty"),
      buildUpcomingLabel
    );
  }

  async function refreshMatchLists() {
    if (!state.backendUrl) {
      return;
    }

    try {
      const [livePayload, upcomingPayload] = await Promise.all([
        fetchJson(`${state.backendUrl}/matches/live`),
        fetchJson(`${state.backendUrl}/matches/upcoming`)
      ]);

      state.currentLiveMatches = livePayload.matches || [];
      state.currentUpcomingMatches = upcomingPayload.matches || [];
      state.currentLeagueFilter = mergeLeagueFilterPayloads(livePayload, upcomingPayload);
      populateLeagueFilterSelect();
      renderMatchLists();
    } catch {
      state.currentLiveMatches = [];
      state.currentUpcomingMatches = [];
      state.currentLeagueFilter = {
        featuredLeagueIds: [],
        supportedLeagueIds: [],
        availableLeagues: []
      };
      populateLeagueFilterSelect();
      renderMatchLists();
    }
  }

  async function handleApplyMatch() {
    const liveFixtureId = Number(elements.liveMatches.value);
    const upcomingFixtureId = Number(elements.upcomingMatches.value);
    const fixtureId =
      (Number.isInteger(liveFixtureId) && liveFixtureId > 0 && liveFixtureId) ||
      (Number.isInteger(upcomingFixtureId) && upcomingFixtureId > 0 && upcomingFixtureId) ||
      null;

    if (!fixtureId) {
      elements.connectionStatus.textContent = translate("popup.statusChooseFixture");
      return;
    }

    await chrome.storage.sync.set({
      fixtureId,
      trackingEnabled: true,
      activeViewMode: "sidepanel",
      leagueFilterId: getSelectedLeagueId(),
      billingPlan: state.billingPlan,
      billingStatus: state.billingStatus
    });

    state.fixtureId = fixtureId;
    state.trackingEnabled = true;
    elements.connectionStatus.textContent = translate("sidepanel.matchApplied");
    const selectedMatch = [...state.currentLiveMatches, ...state.currentUpcomingMatches].find(
      (match) => match.fixtureId === fixtureId
    );
    trackAnalytics("tracking_started", {
      ...buildMatchAnalyticsProperties(selectedMatch),
      source: "sidepanel"
    });
    await fetchImpact();
  }

  async function fetchImpact() {
    if (!state.trackingEnabled || !state.fixtureId) {
      return;
    }

    try {
      const payload = await extensionRequest(
        `${state.backendUrl}/match-impact?fixture_id=${encodeURIComponent(state.fixtureId)}`
      );
      state.lastPayload = payload;
      state.backoffMs = BASE_POLL_INTERVAL_MS;
      render(payload);

      if (payload.status?.isFinished) {
        clearPollTimer();
        return;
      }

      scheduleNextPoll(getPollingIntervalMs(payload));
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

    if (errorCode === "UPSTREAM_QUOTA_EXCEEDED") {
      elements.connectionStatus.textContent = translate("panel.upstreamLimitRetrying");
      elements.summary.textContent = translate("panel.liveDataLimited");
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
      elements.summary.textContent = translate("panel.liveFeedDelayed");
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
      elements.summary.textContent = translate("panel.backendCredentialsFailed");
      elements.headline.textContent = translate("panel.providerRejectedCredentials");
      elements.homeRow.textContent = translate("panel.backendApiKeyCheck");
      elements.awayRow.textContent = state.backendUrl;
      elements.competitionList.innerHTML =
        `<div class="lmi-empty">${escapeHtml(translate("panel.backendConfigIssue"))}</div>`;
      return;
    }

    elements.connectionStatus.textContent = translate("panel.backendConnectionFailed");
    elements.summary.textContent = translate("panel.backendConnectionFailed");
    elements.headline.textContent = translate("panel.backendConnectionFailed");
    elements.homeRow.textContent = translate("panel.backendOnlineCheck");
    elements.awayRow.textContent = state.backendUrl;
    elements.competitionList.innerHTML =
      `<div class="lmi-empty">${escapeHtml(translate("panel.backendOfflineDetail"))}</div>`;
  }

  function render(payload) {
    renderTrackedShell();
    const hasTableImpact = payload.metadata?.tableImpactAvailable !== false;
    const isPrematch = payload.status.phase === "upcoming";
    const clockLabel = payload.status.phase === "upcoming" ? "KO" : `${payload.status.minute || 0}'`;
    const eventLabel = buildEventLabel(payload.event);
    const competitionItems = payload.impact?.competition || [];
    const localizedImpactSummary = buildImpactSummary(state.language, payload.impact, payload.teams);
    const isLimitedImpact = payload.impact?.mode === "limited";

    elements.leagueName.textContent = payload.league?.name || translate("panel.matchTracker");
    elements.headline.textContent = `${payload.teams.home.name} ${payload.score.home}-${payload.score.away} ${payload.teams.away.name} · ${clockLabel}`;
    elements.summary.textContent = eventLabel || localizedImpactSummary;
    setBadge(elements.homeBadge, payload.teams.home.logo, payload.teams.home.name);
    setBadge(elements.awayBadge, payload.teams.away.logo, payload.teams.away.name);
    elements.tableSection.classList.toggle("is-hidden", isPrematch);
    elements.competitionSection.classList.toggle("is-hidden", isPrematch);
    elements.momentumSection.classList.toggle("is-hidden", isPrematch);
    if (isPrematch) {
      elements.formatSection.classList.add("is-hidden");
    }

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
    renderFormatContext(payload);
    renderStatistics(payload.statistics);
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

  function renderFormatContext(payload) {
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

  function renderInjuryItem(item) {
    const localizedReason = translateInjuryReason(state.language, item.reason);

    return `<div class="lmi-mini-card__line lmi-injury-line"><span class="lmi-injury-line__icon" aria-hidden="true">✚</span><span class="lmi-injury-line__text">${escapeHtml(item.player)}${localizedReason ? ` - ${escapeHtml(localizedReason)}` : ""}</span></div>`;
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
