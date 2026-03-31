(function initLiveMatchImpactSidePanel() {
  const STORAGE_KEYS = [
    "fixtureId",
    "backendUrl",
    "trackingEnabled",
    "language",
    "billingUserId",
    "billingPlan",
    "billingStatus"
  ];
  const DEFAULT_BACKEND_URL = "http://localhost:3000";
  const DEFAULT_LANGUAGE = window.LMI_I18N.detectBrowserLanguage();
  const BASE_POLL_INTERVAL_MS = 15000;
  const MAX_POLL_INTERVAL_MS = 120000;

  const {
    normalizeLanguage,
    t,
    formatOrdinal,
    formatMovement,
    translateGoalType,
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
    pollTimer: null,
    backoffMs: BASE_POLL_INTERVAL_MS,
    lastPayload: null
  };

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
    momentumLabel: document.getElementById("sidepanelMomentumLabel"),
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

  function isProPlan() {
    return state.billingPlan === "pro" && state.billingStatus === "active";
  }

  function init() {
    elements.refreshButton.addEventListener("click", async () => {
      if (!state.trackingEnabled || !state.fixtureId) {
        return;
      }

      elements.connectionStatus.textContent = translate("sidepanel.refreshing");
      await fetchImpact();
    });

    elements.stopButton.addEventListener("click", async () => {
      await chrome.storage.sync.set({
        trackingEnabled: false
      });
      renderEmptyState();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") {
        return;
      }

      if (
        changes.fixtureId ||
        changes.backendUrl ||
        changes.trackingEnabled ||
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
    state.backendUrl = (settings.backendUrl || DEFAULT_BACKEND_URL).replace(/\/$/, "");
    state.language = normalizeLanguage(settings.language ?? DEFAULT_LANGUAGE);
    state.billingUserId = settings.billingUserId ?? "anonymous";
    state.billingPlan =
      settings.billingPlan === "pro" && settings.billingStatus === "active" ? "pro" : "free";
    state.billingStatus = settings.billingStatus ?? "inactive";
    state.trackingEnabled = Boolean(settings.trackingEnabled);

    renderStaticCopy();

    if (!state.trackingEnabled || !state.fixtureId) {
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
    elements.leagueEyebrow.textContent = translate("panel.eyebrow");
    elements.eventLabel.textContent = translate("panel.goalImpact");
    elements.tableLabel.textContent = translate("panel.tableImpact");
    elements.competitionLabel.textContent = translate("panel.competitionImpact");
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

      scheduleNextPoll(BASE_POLL_INTERVAL_MS);
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
