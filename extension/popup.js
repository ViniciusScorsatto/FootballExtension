const DEFAULT_BACKEND_URL = "http://localhost:3000";

const fixtureIdInput = document.getElementById("fixtureId");
const backendUrlInput = document.getElementById("backendUrl");
const liveMatchesSelect = document.getElementById("liveMatches");
const upcomingMatchesSelect = document.getElementById("upcomingMatches");
const refreshMatchesButton = document.getElementById("refreshMatches");
const startButton = document.getElementById("startTracking");
const stopButton = document.getElementById("stopTracking");
const statusMessage = document.getElementById("statusMessage");

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
  const suffix =
    match.impactMode === "score-only" ? " · Live score only - no table impact" : "";

  return `${match.teams.home.shortName} ${match.score.home}-${match.score.away} ${match.teams.away.shortName} · ${match.status.minute || 0}' · ${match.league.name}${suffix}`;
}

function buildUpcomingLabel(match) {
  return `${match.teams.home.shortName} vs ${match.teams.away.shortName} · ${formatKickoff(match.startsAt)} · ${match.league.name}`;
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

async function refreshMatchLists(preferredFixtureId = null) {
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

    const liveMatches = livePayload.matches || [];
    const upcomingMatches = upcomingPayload.matches || [];

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

    setStatus("Match lists updated.");
  } catch (error) {
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
  const result = await chrome.storage.sync.get(["fixtureId", "backendUrl", "trackingEnabled"]);
  const storedFixtureId = result.fixtureId ?? null;

  backendUrlInput.value = result.backendUrl ?? DEFAULT_BACKEND_URL;
  fixtureIdInput.value = storedFixtureId ?? "";

  await refreshMatchLists(storedFixtureId);

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
  await refreshMatchLists(getSelectedFixtureId());
});

backendUrlInput.addEventListener("change", async () => {
  await refreshMatchLists(getSelectedFixtureId());
});

startButton.addEventListener("click", handleStartTracking);
stopButton.addEventListener("click", handleStopTracking);

loadSettings().catch(() => {
  setStatus("Could not load saved settings.", true);
});
