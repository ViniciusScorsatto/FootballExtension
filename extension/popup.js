const DEFAULT_BACKEND_URL = "http://localhost:3000";
const DEFAULT_LANGUAGE = window.LMI_I18N.detectBrowserLanguage();
const { normalizeLanguage, t } = window.LMI_I18N;

const fixtureIdInput = document.getElementById("fixtureId");
const backendUrlInput = document.getElementById("backendUrl");
const languageSelect = document.getElementById("language");
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
let currentLanguage = DEFAULT_LANGUAGE;

const popupTextElements = {
  eyebrow: document.getElementById("popupEyebrow"),
  subhead: document.getElementById("popupSubhead"),
  title: document.getElementById("popupTitle"),
  description: document.getElementById("popupDescription"),
  languageLabel: document.getElementById("languageLabel"),
  backendUrlLabel: document.getElementById("backendUrlLabel"),
  leagueFocusLabel: document.getElementById("leagueFocusLabel"),
  liveMatchesLabel: document.getElementById("liveMatchesLabel"),
  upcomingMatchesLabel: document.getElementById("upcomingMatchesLabel"),
  manualFixtureLabel: document.getElementById("manualFixtureLabel")
};

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.dataset.error = String(isError);
}

function translate(key, values = {}) {
  return t(currentLanguage, key, values);
}

function setLanguage(language) {
  currentLanguage = normalizeLanguage(language);
  languageSelect.value = currentLanguage;
  applyStaticTranslations();
}

function applyStaticTranslations() {
  document.title = translate("popup.subhead");
  popupTextElements.eyebrow.textContent = translate("popup.eyebrow");
  popupTextElements.subhead.textContent = translate("popup.subhead");
  popupTextElements.title.textContent = translate("popup.title");
  popupTextElements.description.textContent = translate("popup.description");
  popupTextElements.languageLabel.textContent = translate("language.label");
  popupTextElements.backendUrlLabel.textContent = translate("popup.backendUrl");
  popupTextElements.leagueFocusLabel.textContent = translate("popup.leagueFocus");
  popupTextElements.liveMatchesLabel.textContent = translate("popup.liveMatches");
  popupTextElements.upcomingMatchesLabel.textContent = translate("popup.upcomingMatches");
  popupTextElements.manualFixtureLabel.textContent = translate("popup.manualFixtureId");
  fixtureIdInput.placeholder = translate("popup.manualFixturePlaceholder");
  refreshMatchesButton.textContent = translate("popup.refreshMatches");
  startButton.textContent = translate("popup.startTracking");
  stopButton.textContent = translate("popup.stopTracking");

  languageSelect.querySelector('option[value="en"]').textContent = translate("language.english");
  languageSelect.querySelector('option[value="pt-BR"]').textContent = translate(
    "language.portugueseBrazil"
  );
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
    files: ["i18n.js", "content.js"]
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
  return new Date(dateString).toLocaleString(currentLanguage === "pt-BR" ? "pt-BR" : "en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit"
  });
}

function buildLiveLabel(match) {
  const featuredPrefix = match.league?.featured
    ? `${translate("popup.featuredLeaguePrefix")} · `
    : "";
  const suffix =
    match.impactMode === "score-only" ? ` · ${translate("popup.scoreOnlySuffix")}` : "";

  return `${featuredPrefix}${match.teams.home.shortName} ${match.score.home}-${match.score.away} ${match.teams.away.shortName} · ${match.status.minute || 0}' · ${match.league.name}${suffix}`;
}

function buildUpcomingLabel(match) {
  const featuredPrefix = match.league?.featured
    ? `${translate("popup.featuredLeaguePrefix")} · `
    : "";
  return `${featuredPrefix}${match.teams.home.shortName} vs ${match.teams.away.shortName} · ${formatKickoff(match.startsAt)} · ${match.league.name}`;
}

function buildLeagueFilterLabel(league) {
  const featuredPrefix = league.featured ? `${translate("popup.featuredLeaguePrefix")} · ` : "";
  const countrySuffix = league.country ? ` · ${league.country}` : "";
  const availabilitySuffix =
    league.availableNow === false ? ` · ${translate("popup.noMatchesRightNow")}` : "";

  return `${featuredPrefix}${league.name}${countrySuffix}${availabilitySuffix}`;
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

function populateLeagueFilterSelect(leagueFilter, selectedLeagueId) {
  leagueFilterSelect.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = translate("popup.allSupportedLeagues");
  leagueFilterSelect.appendChild(allOption);

  leagueFilter.availableLeagues.forEach((league) => {
    const option = document.createElement("option");
    option.value = String(league.id);
    option.textContent = buildLeagueFilterLabel(league);
    option.disabled = league.availableNow === false;
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
    liveMatches.length ? translate("popup.livePlaceholder") : translate("popup.liveEmpty"),
    buildLiveLabel,
    preferredFixtureId
  );

  populateMatchSelect(
    upcomingMatchesSelect,
    upcomingMatches,
    upcomingMatches.length
      ? translate("popup.upcomingPlaceholder")
      : translate("popup.upcomingEmpty"),
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
    setStatus(translate("popup.statusEnterBackend"), true);
    return;
  }

  refreshMatchesButton.disabled = true;
  setStatus(translate("popup.statusLoadingMatches"));

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

    setStatus(translate("popup.statusMatchesUpdated"));
  } catch (error) {
    currentLiveMatches = [];
    currentUpcomingMatches = [];
    currentLeagueFilter = {
      featuredLeagueIds: [],
      supportedLeagueIds: [],
      availableLeagues: []
    };
    populateLeagueFilterSelect(currentLeagueFilter, null);
    populateMatchSelect(
      liveMatchesSelect,
      [],
      translate("popup.liveLoadError"),
      buildLiveLabel
    );
    populateMatchSelect(
      upcomingMatchesSelect,
      [],
      translate("popup.upcomingLoadError"),
      buildUpcomingLabel
    );
    setStatus(translate("popup.statusMatchesFailed"), true);
  } finally {
    refreshMatchesButton.disabled = false;
  }
}

async function loadSettings() {
  const result = await chrome.storage.sync.get([
    "fixtureId",
    "backendUrl",
    "trackingEnabled",
    "leagueFilterId",
    "language"
  ]);
  const storedFixtureId = result.fixtureId ?? null;
  const storedLeagueFilterId = result.leagueFilterId ?? null;
  const storedLanguage = result.language ?? DEFAULT_LANGUAGE;

  setLanguage(storedLanguage);
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

  setStatus(
    result.trackingEnabled
      ? translate("popup.statusTrackingActive")
      : translate("popup.statusPickMatch")
  );
}

async function handleStartTracking() {
  const fixtureId = getSelectedFixtureId();
  const backendUrl = normalizeBackendUrl();

  if (!fixtureId) {
    setStatus(translate("popup.statusChooseFixture"), true);
    return;
  }

  if (!validateBackendUrl(backendUrl)) {
    setStatus(translate("popup.statusEnterBackend"), true);
    return;
  }

  await ensureContentScriptInjected();

  await chrome.storage.sync.set({
    fixtureId,
    backendUrl,
    language: currentLanguage,
    trackingEnabled: true
  });

  notifyActiveTab({
    type: "LMI_TRACKING_UPDATED"
  });
  setStatus(translate("popup.statusTrackingStarted"));
}

async function handleStopTracking() {
  await chrome.storage.sync.set({
    trackingEnabled: false
  });

  notifyActiveTab({
    type: "LMI_TRACKING_STOPPED"
  });
  setStatus(translate("popup.statusTrackingStopped"));
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

languageSelect.addEventListener("change", async () => {
  setLanguage(languageSelect.value);
  await chrome.storage.sync.set({
    language: currentLanguage
  });
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
  setStatus(translate("popup.statusSettingsFailed"), true);
});
