const DEFAULT_BACKEND_URL = "http://localhost:3000";

const fixtureIdInput = document.getElementById("fixtureId");
const backendUrlInput = document.getElementById("backendUrl");
const leagueFilterSelect = document.getElementById("leagueFilter");
const liveMatchesSelect = document.getElementById("liveMatches");
const upcomingMatchesSelect = document.getElementById("upcomingMatches");
const refreshMatchesButton = document.getElementById("refreshMatches");
const startButton = document.getElementById("startTracking");
const stopButton = document.getElementById("stopTracking");
const statusMessage = document.getElementById("statusMessage");
let currentLiveMatches = [];
let currentUpcomingMatches = [];
let currentLeagueFilter = {
  featuredLeagueIds: [],
  supportedLeagueIds: [],
  availableLeagues: []
};

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.dataset.error = String(isError);
}

function notifyActiveTab(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTabId = tabs[0]?.id;

    if (!activeTabId) {
      return;
    }

    chrome.tabs.sendMessage(activeTabId, message, () => {
      void chrome.runtime.lastError;
    });
  });
}

async function ensureContentScriptInjected() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!activeTab?.id) {
    return;
  }

  if (!activeTab.url || !/^https?:/i.test(activeTab.url)) {
    return;
  }

  await chrome.scripting.insertCSS({
    target: { tabId: activeTab.id },
    files: ["styles.css"]
  });

  await chrome.scripting.executeScript({
    target: { tabId: activeTab.id },
    files: ["content.js"]
  });
}

function normalizeBackendUrl() {
  return (backendUrlInput.value || DEFAULT_BACKEND_URL).trim().replace(/\/$/, "");
}

function validateBackendUrl(backendUrl) {
  try {
    new URL(backendUrl);
    return true;
  } catch {
    return false;
  }
}

function formatKickoff(dateString) {
  return new Date(dateString).toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit"
  });
}

function buildLiveLabel(match) {
  const featuredPrefix = match.league?.featured ? "Featured · " : "";
  const suffix =
    match.impactMode === "score-only" ? " · Live score only - no table impact" : "";

  return `${featuredPrefix}${match.teams.home.shortName} ${match.score.home}-${match.score.away} ${match.teams.away.shortName} · ${match.status.minute || 0}' · ${match.league.name}${suffix}`;
}

function buildUpcomingLabel(match) {
  const featuredPrefix = match.league?.featured ? "Featured · " : "";
  return `${featuredPrefix}${match.teams.home.shortName} vs ${match.teams.away.shortName} · ${formatKickoff(match.startsAt)} · ${match.league.name}`;
}

function buildLeagueFilterLabel(league) {
  const featuredPrefix = league.featured ? "Featured · " : "";
  const countrySuffix = league.country ? ` · ${league.country}` : "";

  return `${featuredPrefix}${league.name}${countrySuffix}`;
}

function populateMatchSelect(selectElement, matches, placeholderLabel, labelBuilder, selectedFixtureId) {
  selectElement.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = placeholderLabel;
  selectElement.appendChild(placeholder);

  matches.forEach((match) => {
    const option = document.createElement("option");
    option.value = String(match.fixtureId);
    option.textContent = labelBuilder(match);
    option.selected = Number(selectedFixtureId) === match.fixtureId;
    selectElement.appendChild(option);
  });
}

function clearOtherInputs(source) {
  if (source !== "live") {
    liveMatchesSelect.value = "";
  }

  if (source !== "upcoming") {
    upcomingMatchesSelect.value = "";
  }

  if (source !== "manual") {
    fixtureIdInput.value = "";
  }
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
        featured: existingLeague?.featured || league.featured === true
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

function populateLeagueFilterSelect(leagueFilter, selectedLeagueId) {
  leagueFilterSelect.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All supported leagues";
  leagueFilterSelect.appendChild(allOption);

  leagueFilter.availableLeagues.forEach((league) => {
    const option = document.createElement("option");
    option.value = String(league.id);
    option.textContent = buildLeagueFilterLabel(league);
    option.selected = Number(selectedLeagueId) === league.id;
    leagueFilterSelect.appendChild(option);
  });
}

function getSelectedLeagueId() {
  const selectedLeagueId = Number(leagueFilterSelect.value);
  return Number.isInteger(selectedLeagueId) && selectedLeagueId > 0 ? selectedLeagueId : null;
}

function getFilteredMatches(matches, leagueId) {
  if (!leagueId) {
    return matches;
  }

  return matches.filter((match) => match.league?.id === leagueId);
}

function renderMatchLists(preferredFixtureId = null) {
  const selectedLeagueId = getSelectedLeagueId();
  const liveMatches = getFilteredMatches(currentLiveMatches, selectedLeagueId);
  const upcomingMatches = getFilteredMatches(currentUpcomingMatches, selectedLeagueId);

  populateMatchSelect(
    liveMatchesSelect,
    liveMatches,
    liveMatches.length ? "Choose a live match" : "No live matches found",
    buildLiveLabel,
    preferredFixtureId
  );

  populateMatchSelect(
    upcomingMatchesSelect,
    upcomingMatches,
    upcomingMatches.length ? "Choose an upcoming match" : "No upcoming matches found",
    buildUpcomingLabel,
    preferredFixtureId
  );

  if (!preferredFixtureId && liveMatches.length) {
    liveMatchesSelect.value = String(liveMatches[0].fixtureId);
  }

  if (!preferredFixtureId && !liveMatches.length && upcomingMatches.length) {
    upcomingMatchesSelect.value = String(upcomingMatches[0].fixtureId);
  }
}

function getSelectedFixtureId() {
  const liveFixtureId = Number(liveMatchesSelect.value);
  const upcomingFixtureId = Number(upcomingMatchesSelect.value);
  const manualFixtureId = Number(fixtureIdInput.value);

  if (Number.isInteger(liveFixtureId) && liveFixtureId > 0) {
    return liveFixtureId;
  }

  if (Number.isInteger(upcomingFixtureId) && upcomingFixtureId > 0) {
    return upcomingFixtureId;
  }

  if (Number.isInteger(manualFixtureId) && manualFixtureId > 0) {
    return manualFixtureId;
  }

  return null;
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json();
}

async function refreshMatchLists(preferredFixtureId = null, preferredLeagueId = null) {
  const backendUrl = normalizeBackendUrl();

  if (!validateBackendUrl(backendUrl)) {
    setStatus("Enter a valid backend URL.", true);
    return;
  }

  refreshMatchesButton.disabled = true;
  setStatus("Loading matches…");

  try {
    const [livePayload, upcomingPayload] = await Promise.all([
      fetchJson(`${backendUrl}/matches/live`),
      fetchJson(`${backendUrl}/matches/upcoming`)
    ]);

    currentLiveMatches = livePayload.matches || [];
    currentUpcomingMatches = upcomingPayload.matches || [];
    currentLeagueFilter = mergeLeagueFilterPayloads(livePayload, upcomingPayload);

    populateLeagueFilterSelect(currentLeagueFilter, preferredLeagueId);

    if (
      preferredLeagueId &&
      !leagueFilterSelect.querySelector(`option[value="${preferredLeagueId}"]`)
    ) {
      leagueFilterSelect.value = "";
    }

    renderMatchLists(preferredFixtureId);

    setStatus("Match lists updated.");
  } catch (error) {
    currentLiveMatches = [];
    currentUpcomingMatches = [];
    currentLeagueFilter = {
      featuredLeagueIds: [],
      supportedLeagueIds: [],
      availableLeagues: []
    };
    populateLeagueFilterSelect(currentLeagueFilter, null);
    populateMatchSelect(liveMatchesSelect, [], "Could not load live matches", buildLiveLabel);
    populateMatchSelect(
      upcomingMatchesSelect,
      [],
      "Could not load upcoming matches",
      buildUpcomingLabel
    );
    setStatus("Could not load matches from the backend.", true);
  } finally {
    refreshMatchesButton.disabled = false;
  }
}

async function loadSettings() {
  const result = await chrome.storage.sync.get([
    "fixtureId",
    "backendUrl",
    "trackingEnabled",
    "leagueFilterId"
  ]);
  const storedFixtureId = result.fixtureId ?? null;
  const storedLeagueFilterId = result.leagueFilterId ?? null;

  backendUrlInput.value = result.backendUrl ?? DEFAULT_BACKEND_URL;
  fixtureIdInput.value = storedFixtureId ?? "";

  await refreshMatchLists(storedFixtureId, storedLeagueFilterId);

  const isInLiveList = Boolean(
    storedFixtureId && liveMatchesSelect.querySelector(`option[value="${storedFixtureId}"]`)
  );
  const isInUpcomingList = Boolean(
    storedFixtureId && upcomingMatchesSelect.querySelector(`option[value="${storedFixtureId}"]`)
  );

  if (isInLiveList || isInUpcomingList) {
    fixtureIdInput.value = "";
  }

  setStatus(result.trackingEnabled ? "Tracking is active on this browser." : "Pick a match to start.");
}

async function handleStartTracking() {
  const fixtureId = getSelectedFixtureId();
  const backendUrl = normalizeBackendUrl();

  if (!fixtureId) {
    setStatus("Choose a live or upcoming match, or enter a fixture ID.", true);
    return;
  }

  if (!validateBackendUrl(backendUrl)) {
    setStatus("Enter a valid backend URL.", true);
    return;
  }

  await ensureContentScriptInjected();

  await chrome.storage.sync.set({
    fixtureId,
    backendUrl,
    trackingEnabled: true
  });

  notifyActiveTab({
    type: "LMI_TRACKING_UPDATED"
  });
  setStatus("Tracking started.");
}

async function handleStopTracking() {
  await chrome.storage.sync.set({
    trackingEnabled: false
  });

  notifyActiveTab({
    type: "LMI_TRACKING_STOPPED"
  });
  setStatus("Tracking stopped.");
}

liveMatchesSelect.addEventListener("change", () => {
  if (liveMatchesSelect.value) {
    clearOtherInputs("live");
  }
});

upcomingMatchesSelect.addEventListener("change", () => {
  if (upcomingMatchesSelect.value) {
    clearOtherInputs("upcoming");
  }
});

fixtureIdInput.addEventListener("input", () => {
  if (fixtureIdInput.value) {
    clearOtherInputs("manual");
  }
});

refreshMatchesButton.addEventListener("click", async () => {
  await refreshMatchLists(getSelectedFixtureId(), getSelectedLeagueId());
});

backendUrlInput.addEventListener("change", async () => {
  await refreshMatchLists(getSelectedFixtureId(), getSelectedLeagueId());
});

leagueFilterSelect.addEventListener("change", async () => {
  await chrome.storage.sync.set({
    leagueFilterId: getSelectedLeagueId()
  });

  clearOtherInputs("manual");
  renderMatchLists();
});

startButton.addEventListener("click", handleStartTracking);
stopButton.addEventListener("click", handleStopTracking);

loadSettings().catch(() => {
  setStatus("Could not load saved settings.", true);
});
