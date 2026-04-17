const DEFAULT_BACKEND_URL =
  (window.LMI_CONFIG?.backendUrl || "https://footballextension-staging.up.railway.app")
    .trim()
    .replace(/\/$/, "");
const DEFAULT_LANGUAGE = window.LMI_I18N.detectBrowserLanguage();
const RESTORE_AUTO_REFRESH_WINDOW_MS = 45000;
const { normalizeLanguage, t } = window.LMI_I18N;
const captureAnalytics = window.LMI_ANALYTICS?.capture ?? (() => {});
const updateAnalyticsConfig = window.LMI_ANALYTICS?.updateConfig ?? (() => {});

const fixtureIdInput = document.getElementById("fixtureId");
const languageSelect = document.getElementById("language");
const notificationsToggleButton = document.getElementById("notificationsToggle");
const notificationsCloseButton = document.getElementById("notificationsClose");
const notificationsCard = document.getElementById("notificationsCard");
const scenarioPreviewSection = document.getElementById("scenarioPreviewSection");
const scenarioModeToggle = document.getElementById("scenarioModeToggle");
const scenarioVariantSelect = document.getElementById("scenarioVariant");
const scenarioPreviewSummary = document.getElementById("scenarioPreviewSummary");
const notifyGoalsToggle = document.getElementById("notifyGoals");
const notifyTableChangesToggle = document.getElementById("notifyTableChanges");
const billingActionButton = document.getElementById("billingAction");
const billingRefreshButton = document.getElementById("billingRefresh");
const accountRestoreButton = document.getElementById("accountRestore");
const accountToggleButton = document.getElementById("accountToggle");
const billingPlanLabel = document.getElementById("billingPlanLabel");
const billingPlanBadge = document.getElementById("billingPlanBadge");
const billingEyebrow = document.getElementById("billingEyebrow");
const billingSummary = document.getElementById("billingSummary");
const billingOffer = document.getElementById("billingOffer");
const billingStateNote = document.getElementById("billingStateNote");
const billingCard = document.querySelector(".lmi-billing-card");
const accountEmailInput = document.getElementById("accountEmail");
const accountEyebrow = document.getElementById("accountEyebrow");
const accountTitle = document.getElementById("accountTitle");
const accountCompactSummary = document.getElementById("accountCompactSummary");
const accountContent = document.getElementById("accountContent");
const accountStatusPill = document.getElementById("accountStatusPill");
const accountChevron = document.getElementById("accountChevron");
const accountEmailLabel = document.getElementById("accountEmailLabel");
const accountSummary = document.getElementById("accountSummary");
const advancedToggleButton = document.getElementById("advancedToggle");
const advancedOptionsCard = document.getElementById("advancedOptionsCard");
const advancedEyebrow = document.getElementById("advancedEyebrow");
const advancedTitle = document.getElementById("advancedTitle");
const advancedSummary = document.getElementById("advancedSummary");
const advancedContent = document.getElementById("advancedContent");
const advancedChevron = document.getElementById("advancedChevron");
const topPlanPill = document.getElementById("topPlanPill");
const planHint = document.getElementById("planHint");
const leagueFilterSelect = document.getElementById("leagueFilter");
const liveMatchesSelect = document.getElementById("liveMatches");
const upcomingMatchesSelect = document.getElementById("upcomingMatches");
const refreshMatchesButton = document.getElementById("refreshMatches");
const startButton = document.getElementById("startTracking");
const openSidePanelButton = document.getElementById("openSidePanel");
const statusMessage = document.getElementById("statusMessage");

let currentLiveMatches = [];
let currentUpcomingMatches = [];
let currentLeagueFilter = {
  featuredLeagueIds: [],
  supportedLeagueIds: [],
  availableLeagues: []
};
let currentLanguage = DEFAULT_LANGUAGE;
let accountCardExpanded = true;
let notificationsCardExpanded = false;
let advancedOptionsExpanded = false;
let scenarioPreviewEnabled = false;
let currentScenarioCatalog = [];
let currentPricingCatalog = {
  plans: {
    free: {
      priceMonthlyUsd: 0
    },
    pro: {
      priceMonthlyUsd: null
    }
  },
  offers: {
    early_bird_lifetime: {
      priceMonthlyUsd: 3.99
    }
  }
};
let currentBilling = {
  userId: "",
  plan: "free",
  status: "inactive",
  offerId: null,
  earlyBirdEligible: false,
  earlyBirdRemaining: 0,
  earlyBirdActive: false,
  accountLinked: false,
  accountEmail: "",
  restorePending: false,
  restoreStartedAt: null,
  checkoutPending: false,
  checkoutStartedAt: null,
  recentlyUnlocked: false
};
let lastBillingDebug = null;
let popupOpenedTracked = false;
let currentTrackingEnabled = false;
let currentNotifications = {
  notifyGoals: true,
  notifyTableChanges: true
};

const popupTextElements = {
  eyebrow: document.getElementById("popupEyebrow"),
  subhead: document.getElementById("popupSubhead"),
  title: document.getElementById("popupTitle"),
  description: document.getElementById("popupDescription"),
  languageLabel: document.getElementById("languageLabel"),
  notificationsToggleLabel: document.getElementById("notificationsToggleLabel"),
  notificationsLabel: document.getElementById("notificationsLabel"),
  scenarioPreviewEyebrow: document.getElementById("scenarioPreviewEyebrow"),
  scenarioPreviewTitle: document.getElementById("scenarioPreviewTitle"),
  scenarioModeLabel: document.getElementById("scenarioModeLabel"),
  scenarioModeHint: document.getElementById("scenarioModeHint"),
  scenarioVariantLabel: document.getElementById("scenarioVariantLabel"),
  notifyGoalsLabel: document.getElementById("notifyGoalsLabel"),
  notifyGoalsHint: document.getElementById("notifyGoalsHint"),
  notifyTableChangesLabel: document.getElementById("notifyTableChangesLabel"),
  notifyTableChangesHint: document.getElementById("notifyTableChangesHint"),
  leagueFocusLabel: document.getElementById("leagueFocusLabel"),
  liveMatchesLabel: document.getElementById("liveMatchesLabel"),
  upcomingMatchesLabel: document.getElementById("upcomingMatchesLabel"),
  manualFixtureLabel: document.getElementById("manualFixtureLabel")
};

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.dataset.error = String(isError);
}

function getPopupErrorMessage(error, fallbackKey) {
  const fallbackMessage = translate(fallbackKey);
  const message = String(error?.data?.error || error?.message || "").trim();

  if (!message || message === fallbackMessage) {
    return fallbackMessage;
  }

  return `${fallbackMessage} ${message}`;
}

function summarizeBillingDebug(debug) {
  if (!debug) {
    return "";
  }

  const parts = [];

  if (debug.accountId) {
    parts.push(`account=${debug.accountId}`);
  }

  if (debug.initialPlan || debug.finalPlan) {
    parts.push(`plan=${debug.initialPlan || "?"}->${debug.finalPlan || "?"}`);
  }

  if (debug.recovery?.stripe?.lookupSource) {
    parts.push(`stripe=${debug.recovery.stripe.lookupSource}`);
  }

  if (typeof debug.recovery?.recovered === "boolean") {
    parts.push(`recovered=${String(debug.recovery.recovered)}`);
  }

  return parts.join(" | ");
}

function translate(key, values = {}) {
  return t(currentLanguage, key, values);
}

function trackAnalytics(eventName, properties = {}) {
  captureAnalytics(eventName, {
    distinctId: currentBilling.userId || "anonymous",
    properties: {
      plan: currentBilling.plan || "free",
      planStatus: currentBilling.status || "inactive",
      language: currentLanguage,
      releaseChannel: window.LMI_CONFIG?.releaseChannel || "staging",
      ...properties
    }
  });
}

function getSelectedFixtureSource() {
  if (liveMatchesSelect.value) {
    return "live";
  }

  if (upcomingMatchesSelect.value) {
    return "upcoming";
  }

  if (isManualFixtureTestingAvailable() && fixtureIdInput.value) {
    return "manual";
  }

  return "unknown";
}

function buildMatchAnalyticsProperties(match) {
  return {
    fixtureId: match?.fixtureId || getSelectedFixtureId(),
    leagueId: match?.league?.id || getSelectedLeagueId(),
    leagueName: match?.league?.name,
    country: match?.league?.country,
    homeTeam: match?.teams?.home?.name || match?.teams?.home?.shortName,
    awayTeam: match?.teams?.away?.name || match?.teams?.away?.shortName,
    matchState: match?.status?.phase || getSelectedFixtureSource(),
    source: getSelectedFixtureSource()
  };
}

function buildLeagueSelectionAnalyticsProperties() {
  const selectedLeagueId = getSelectedLeagueId();
  const selectedLeague = currentLeagueFilter.availableLeagues.find(
    (league) => league.id === selectedLeagueId
  );

  return {
    selectedLeagueId,
    selectedLeagueName: selectedLeague?.name,
    selectedLeagueCountry: selectedLeague?.country
  };
}

function buildPopupOpenedAnalyticsProperties(trackingEnabled) {
  return {
    accountLinked: currentBilling.accountLinked,
    trackingEnabled: Boolean(trackingEnabled),
    activeViewMode: trackingEnabled ? "overlay" : "idle",
    scenarioPreviewEnabled,
    hasLiveMatches: currentLiveMatches.length > 0,
    hasUpcomingMatches: currentUpcomingMatches.length > 0,
    liveMatchesCount: currentLiveMatches.length,
    upcomingMatchesCount: currentUpcomingMatches.length,
    ...buildLeagueSelectionAnalyticsProperties()
  };
}

function getBillingRefreshResult() {
  if (isProPlan()) {
    return "pro_active";
  }

  if (currentBilling.accountLinked) {
    return "linked_no_pro";
  }

  return "still_free";
}

function setLanguage(language) {
  currentLanguage = normalizeLanguage(language);
  languageSelect.value = currentLanguage;
  applyStaticTranslations();
  renderBillingCard();
  updatePlanHint();
}

function applyStaticTranslations() {
  document.title = translate("popup.subhead");
  popupTextElements.eyebrow.textContent = translate("popup.eyebrow");
  popupTextElements.subhead.textContent = translate("popup.subhead");
  popupTextElements.title.textContent = translate("popup.title");
  popupTextElements.description.textContent = translate("popup.description");
  popupTextElements.languageLabel.textContent = translate("language.label");
  popupTextElements.notificationsToggleLabel.textContent = translate("popup.notifications");
  popupTextElements.notificationsLabel.textContent = translate("popup.notifications");
  popupTextElements.scenarioPreviewEyebrow.textContent = translate("popup.scenarioPreviewEyebrow");
  popupTextElements.scenarioPreviewTitle.textContent = translate("popup.scenarioPreviewTitle");
  popupTextElements.scenarioModeLabel.textContent = translate("popup.scenarioModeLabel");
  popupTextElements.scenarioModeHint.textContent = translate("popup.scenarioModeHint");
  popupTextElements.scenarioVariantLabel.textContent = translate("popup.scenarioVariantLabel");
  popupTextElements.notifyGoalsLabel.textContent = translate("popup.notifyGoalsLabel");
  popupTextElements.notifyGoalsHint.textContent = translate("popup.notifyGoalsHint");
  popupTextElements.notifyTableChangesLabel.textContent = translate("popup.notifyTableChangesLabel");
  popupTextElements.notifyTableChangesHint.textContent = translate("popup.notifyTableChangesHint");
  notificationsCloseButton.textContent = translate("common.close");
  popupTextElements.leagueFocusLabel.textContent = translate("popup.leagueFocus");
  popupTextElements.liveMatchesLabel.textContent = translate("popup.liveMatches");
  popupTextElements.upcomingMatchesLabel.textContent = translate("popup.upcomingMatches");
  popupTextElements.manualFixtureLabel.textContent = translate("popup.manualFixtureId");
  advancedEyebrow.textContent = translate("popup.advancedOptions");
  advancedTitle.textContent = translate("popup.manualFixtureTitle");
  advancedSummary.textContent = translate("popup.manualFixtureSummary");
  billingEyebrow.textContent = translate("popup.billingEyebrow");
  fixtureIdInput.placeholder = translate("popup.manualFixturePlaceholder");
  refreshMatchesButton.textContent = translate("popup.refreshMatches");
  renderTrackingButton();
  openSidePanelButton.textContent = translate("popup.openSidePanel");
  billingRefreshButton.textContent = translate("popup.refreshPlan");
  accountEyebrow.textContent = translate("popup.restoreEyebrow");
  accountTitle.textContent = translate("popup.restoreTitle");
  accountCompactSummary.textContent = translate("popup.restoreSummary");
  accountEmailLabel.textContent = translate("popup.restoreEmailLabel");
  accountEmailInput.placeholder = translate("popup.restoreEmailPlaceholder");
  accountRestoreButton.textContent = translate("popup.restoreAction");

  languageSelect.querySelector('option[value="en"]').textContent = translate("language.english");
  languageSelect.querySelector('option[value="pt-BR"]').textContent = translate(
    "language.portugueseBrazil"
  );
  renderAdvancedOptions();
  renderScenarioPreviewState();
}

function renderTrackingButton() {
  startButton.textContent = currentTrackingEnabled
    ? translate("popup.stopTracking")
    : translate("popup.startTracking");
  startButton.classList.toggle("lmi-button--primary", !currentTrackingEnabled);
  startButton.classList.toggle("lmi-button--ghost", currentTrackingEnabled);
  startButton.dataset.trackingEnabled = currentTrackingEnabled ? "true" : "false";
}

function createBillingUserId() {
  if (typeof crypto?.randomUUID === "function") {
    return `lmi_${crypto.randomUUID()}`;
  }

  return `lmi_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureBillingUserId() {
  if (currentBilling.userId && currentBilling.userId !== "anonymous") {
    return currentBilling.userId;
  }

  currentBilling.userId = createBillingUserId();

  await chrome.storage.sync.set({
    billingUserId: currentBilling.userId
  });

  return currentBilling.userId;
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

async function pingContentScript(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "LMI_PING"
    });
    if (!response?.ok) {
      return false;
    }

    return response.version === chrome.runtime.getManifest().version;
  } catch {
    return false;
  }
}

async function ensureContentScriptInjected() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!activeTab?.id) {
    return;
  }

  if (!activeTab.url || !/^https?:/i.test(activeTab.url)) {
    return;
  }

  const alreadyInjected = await pingContentScript(activeTab.id);

  if (alreadyInjected) {
    return;
  }

  await chrome.scripting.insertCSS({
    target: { tabId: activeTab.id },
    files: ["styles.css"]
  });

  await chrome.scripting.executeScript({
    target: { tabId: activeTab.id },
    files: ["config.js", "i18n.js", "sdk-football.js", "content.js"]
  });
}

function normalizeBackendUrl() {
  return DEFAULT_BACKEND_URL;
}

function validateBackendUrl(backendUrl) {
  try {
    new URL(backendUrl);
    return true;
  } catch {
    return false;
  }
}

function getRequestHeaders() {
  return window.LMI_SDK.buildIdentityHeaders({
    userId: currentBilling.userId || "anonymous",
    plan: currentBilling.plan || "free"
  });
}

function isNetworkFetchError(error) {
  const message = String(error?.message || "").trim().toLowerCase();
  return message === "failed to fetch" || message.includes("networkerror");
}

function createPopupSdkClient(backendUrl) {
  return window.LMI_SDK.createRequesterBackedSdk({
    baseUrl: backendUrl,
    getHeaders: getRequestHeaders,
    requester: async (request) => {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body ? JSON.stringify(request.body) : undefined
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw window.LMI_SDK.createSdkError(
            payload?.error || `Request failed with ${response.status}`,
            response.status,
            payload
          );
        }

        return payload;
      } catch (error) {
        if (!isNetworkFetchError(error)) {
          throw error;
        }

        const fallbackRequester = window.LMI_SDK.createChromeRuntimeRequester();
        return fallbackRequester(request);
      }
    }
  });
}

function formatKickoff(match) {
  const locale = currentLanguage === "pt-BR" ? "pt-BR" : "en-US";
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

function formatMatchTeamLabel(team) {
  const shortName = String(team?.shortName ?? "").trim();
  const fullName = String(team?.name ?? "").trim();

  if (shortName && shortName.length > 3) {
    return shortName;
  }

  return fullName || shortName || "Team";
}

function shouldIncludeLeagueInMatchLabel() {
  return !getSelectedLeagueId();
}

function formatPrice(price) {
  const numericPrice = Number(price);

  if (!Number.isFinite(numericPrice)) {
    return String(price ?? "");
  }

  return new Intl.NumberFormat(currentLanguage === "pt-BR" ? "pt-BR" : "en-US", {
    style: "currency",
    currency: "USD"
  }).format(numericPrice);
}

function getEarlyBirdDisplayPrice() {
  return currentPricingCatalog?.offers?.early_bird_lifetime?.priceMonthlyUsd ?? 3.99;
}

function isProPlan() {
  return currentBilling.plan === "pro" && currentBilling.status === "active";
}

function isLinkedWithoutPro() {
  return currentBilling.accountLinked && !isProPlan();
}

function isLeagueAvailableForCurrentPlan(leagueId) {
  if (!leagueId || isProPlan()) {
    return true;
  }

  return currentLeagueFilter.featuredLeagueIds.includes(leagueId);
}

function renderBillingCard() {
  const proActive = isProPlan();
  const currentPlanName = proActive
    ? translate("popup.proPlan")
    : translate("popup.freePlan");

  billingPlanLabel.textContent = proActive
    ? translate("popup.proActiveTitle")
    : translate("popup.currentPlan", {
        plan: currentPlanName
      });
  billingPlanBadge.textContent = currentPlanName;
  billingPlanBadge.dataset.plan = proActive ? "pro" : "free";
  billingSummary.textContent = proActive
    ? translate("popup.proActiveSummary")
    : translate("popup.billingSummaryFree");
  billingCard.hidden = proActive;
  topPlanPill.hidden = !proActive;
  topPlanPill.textContent = currentPlanName;

  if (currentBilling.recentlyUnlocked) {
    billingEyebrow.textContent = translate("popup.proUnlockedTitle");
  } else if (proActive) {
    billingEyebrow.textContent = translate("popup.proActiveEyebrow");
  } else {
    billingEyebrow.textContent = translate("popup.billingEyebrow");
  }

  if (!proActive && currentBilling.checkoutPending) {
    billingOffer.textContent = translate("popup.checkoutPending");
  } else if (
    !proActive &&
    currentBilling.earlyBirdActive &&
    currentBilling.earlyBirdRemaining > 0
  ) {
    billingOffer.textContent = translate("popup.earlyBirdOffer", {
      price: formatPrice(getEarlyBirdDisplayPrice()),
      remaining: currentBilling.earlyBirdRemaining
    });
  } else if (!proActive) {
    billingOffer.textContent = translate("popup.earlyBirdClosed");
  } else {
    billingOffer.textContent = "";
  }

  billingStateNote.textContent = currentBilling.recentlyUnlocked
    ? translate("popup.proUnlockedBody")
    : isLinkedWithoutPro()
      ? translate("popup.linkedNoProBody")
      : "";

  billingActionButton.hidden = proActive;
  billingActionButton.textContent = translate("popup.upgradeToPro");
  renderAccountCard();
}

function updatePlanHint() {
  if (isManualFixtureTestingAvailable()) {
    fixtureIdInput.disabled = false;
    planHint.textContent = translate("popup.manualFixtureEnabled");
    return;
  }

  fixtureIdInput.disabled = true;
  planHint.textContent = translate("popup.manualFixtureLocked");
}

function renderAdvancedOptions() {
  advancedOptionsCard.hidden = !isManualFixtureTestingAvailable();

  if (!isManualFixtureTestingAvailable()) {
    advancedOptionsExpanded = false;
    advancedContent.hidden = true;
    advancedToggleButton.setAttribute("aria-expanded", "false");
    advancedChevron.textContent = "+";
    return;
  }

  advancedToggleButton.setAttribute("aria-expanded", String(advancedOptionsExpanded));
  advancedContent.hidden = !advancedOptionsExpanded;
  advancedChevron.textContent = advancedOptionsExpanded ? "−" : "+";
}

function isManualFixtureTestingAvailable() {
  return window.LMI_CONFIG?.releaseChannel !== "production";
}

function isScenarioPreviewAvailable() {
  return window.LMI_CONFIG?.releaseChannel !== "production";
}

function getSelectedScenarioEntry() {
  const selectedPath = String(scenarioVariantSelect.value || "").trim();

  if (!selectedPath) {
    return null;
  }

  return currentScenarioCatalog.find((entry) => entry.path === selectedPath) ?? null;
}

function renderScenarioPreviewState() {
  if (!scenarioPreviewSection) {
    return;
  }

  scenarioPreviewSection.hidden = !isScenarioPreviewAvailable();

  if (!isScenarioPreviewAvailable()) {
    return;
  }

  scenarioModeToggle.checked = scenarioPreviewEnabled;
  scenarioVariantSelect.disabled = !scenarioPreviewEnabled || currentScenarioCatalog.length === 0;

  const selectedScenario = getSelectedScenarioEntry();
  scenarioPreviewSummary.textContent = scenarioPreviewEnabled && selectedScenario
    ? translate("popup.scenarioPreviewSelected", { label: selectedScenario.label })
    : translate("popup.scenarioPreviewOff");
}

async function loadScenarioCatalog() {
  if (!isScenarioPreviewAvailable()) {
    currentScenarioCatalog = [];
    renderScenarioPreviewState();
    return;
  }

  try {
    const response = await fetch(chrome.runtime.getURL("scenarios/index.json"));

    if (!response.ok) {
      throw new Error(`Scenario index failed with ${response.status}`);
    }

    const payload = await response.json();
    const families = Array.isArray(payload?.families) ? payload.families : [];
    currentScenarioCatalog = families.flatMap((family) =>
      (family.variants || []).map((variant) => ({
        familyId: family.id,
        familyLabel: family.label,
        fixtureId: family.fixtureId ?? variant.fixtureId ?? null,
        id: variant.id,
        label: variant.label,
        path: variant.path
      }))
    );

    scenarioVariantSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = translate("popup.scenarioVariantPlaceholder");
    scenarioVariantSelect.appendChild(placeholder);

    families.forEach((family) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = family.label;

      (family.variants || []).forEach((variant) => {
        const option = document.createElement("option");
        option.value = variant.path;
        option.textContent = variant.label;
        optgroup.appendChild(option);
      });

      scenarioVariantSelect.appendChild(optgroup);
    });
  } catch {
    currentScenarioCatalog = [];
    scenarioVariantSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = translate("popup.scenarioVariantPlaceholder");
    scenarioVariantSelect.appendChild(placeholder);
  }

  renderScenarioPreviewState();
}

function renderAccountCard() {
  const linkedEmail = currentBilling.accountEmail || accountEmailInput.value.trim();

  if (currentBilling.accountEmail && accountEmailInput.value.trim() !== currentBilling.accountEmail) {
    accountEmailInput.value = currentBilling.accountEmail;
  }

  accountStatusPill.textContent = isProPlan()
    ? translate("popup.restoreLinkedPill")
    : currentBilling.accountLinked
      ? translate("popup.restoreLinkedNoProPill")
      : translate("popup.restorePill");
  accountStatusPill.dataset.plan = isProPlan() ? "pro" : "free";
  accountToggleButton.setAttribute("aria-expanded", String(accountCardExpanded));
  accountContent.hidden = !accountCardExpanded;
  accountChevron.textContent = accountCardExpanded ? "−" : "+";

  if (isLinkedWithoutPro() && linkedEmail) {
    accountSummary.textContent = translate("popup.restoreLinkedNoPro", {
      email: linkedEmail
    });
    accountCompactSummary.textContent = translate("popup.restoreLinkedNoProCompact", {
      email: linkedEmail
    });
  } else if (currentBilling.accountLinked && linkedEmail) {
    accountSummary.textContent = translate("popup.restoreLinked", {
      email: linkedEmail
    });
    accountCompactSummary.textContent = translate("popup.restoreLinkedCompact", {
      email: linkedEmail
    });
  } else {
    accountSummary.textContent = translate("popup.restoreSummary");
    accountCompactSummary.textContent = translate("popup.restoreSummary");
  }
}

function buildLiveLabel(match) {
  const featuredPrefix = !isProPlan() && match.league?.featured
    ? `${translate("popup.featuredLeaguePrefix")} · `
    : "";
  const suffix =
    match.impactMode === "score-only" ? ` · ${translate("popup.scoreOnlySuffix")}` : "";
  const leagueSuffix = shouldIncludeLeagueInMatchLabel() ? ` · ${match.league.name}` : "";

  return `${featuredPrefix}${formatMatchTeamLabel(match.teams.home)} ${match.score.home}-${match.score.away} ${formatMatchTeamLabel(match.teams.away)} · ${match.status.minute || 0}'${leagueSuffix}${suffix}`;
}

function buildUpcomingLabel(match) {
  const featuredPrefix = !isProPlan() && match.league?.featured
    ? `${translate("popup.featuredLeaguePrefix")} · `
    : "";
  const leagueSuffix = shouldIncludeLeagueInMatchLabel() ? ` · ${match.league.name}` : "";

  return `${featuredPrefix}${formatMatchTeamLabel(match.teams.home)} vs ${formatMatchTeamLabel(match.teams.away)} · ${formatKickoff(match)}${leagueSuffix}`;
}

function buildLeagueFilterLabel(league) {
  const featuredPrefix =
    !isProPlan() && league.featured ? `${translate("popup.featuredLeaguePrefix")} · ` : "";
  const availabilitySuffix =
    league.availableNow === false ? ` · ${translate("popup.noMatchesInCurrentWindow")}` : "";

  return `${featuredPrefix}${league.name}${availabilitySuffix}`;
}

function buildLeagueCountryGroups(leagueFilter) {
  const countryGroups = new Map();

  leagueFilter.availableLeagues.forEach((league) => {
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
        availableNow: existingLeague?.availableNow || league.availableNow === true,
        hasLiveMatch: existingLeague?.hasLiveMatch || league.hasLiveMatch === true,
        hasUpcomingMatch: existingLeague?.hasUpcomingMatch || league.hasUpcomingMatch === true
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

  buildLeagueCountryGroups(leagueFilter).forEach(([country, leagues]) => {
    const optgroup = document.createElement("optgroup");
    optgroup.label = country;

    leagues.forEach((league) => {
      const option = document.createElement("option");
      option.value = String(league.id);
      option.textContent = buildLeagueFilterLabel(league);
      option.disabled =
        league.availableNow === false ||
        (!isProPlan() && !league.featured);
      option.selected = Number(selectedLeagueId) === league.id;
      optgroup.appendChild(option);
    });

    leagueFilterSelect.appendChild(optgroup);
  });
}

function getSelectedLeagueId() {
  const selectedLeagueId = Number(leagueFilterSelect.value);
  return Number.isInteger(selectedLeagueId) && selectedLeagueId > 0 ? selectedLeagueId : null;
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

  if (
    isManualFixtureTestingAvailable() &&
    Number.isInteger(manualFixtureId) &&
    manualFixtureId > 0
  ) {
    return manualFixtureId;
  }

  return null;
}

function getSelectedMatch() {
  const selectedFixtureId = getSelectedFixtureId();

  if (!selectedFixtureId) {
    return null;
  }

  return [...currentLiveMatches, ...currentUpcomingMatches].find(
    (match) => match.fixtureId === selectedFixtureId
  ) ?? null;
}

async function fetchBillingStatus() {
  const backendUrl = normalizeBackendUrl();

  if (!validateBackendUrl(backendUrl) || !currentBilling.userId) {
    return;
  }

  const previouslyLinked = currentBilling.accountLinked;
  const previousWasPro = isProPlan();

  const payload = await createPopupSdkClient(backendUrl).getBillingStatus({
    userId: currentBilling.userId
  });

  currentBilling = {
    ...currentBilling,
    userId: payload.userId || currentBilling.userId,
    plan: payload.plan || "free",
    status: payload.status || "inactive",
    offerId: payload.offerId || null,
    accountLinked: Boolean(payload.account?.linked),
    accountEmail: payload.account?.email || currentBilling.accountEmail || "",
    earlyBirdEligible: Boolean(payload.offers?.earlyBirdEligible),
    earlyBirdRemaining: payload.offers?.earlyBirdRemaining ?? 0,
    earlyBirdActive: Boolean(payload.offers?.earlyBirdActive)
  };

  const nowPro = isProPlan();
  if (!previouslyLinked && currentBilling.accountLinked) {
    trackAnalytics("account_linked", {
      linkedVia: "status_poll"
    });
    if (!nowPro) {
      trackAnalytics("restore_linked_no_pro", {
        source: "status_poll"
      });
    }
  }
  if (!previouslyLinked && currentBilling.accountLinked && nowPro) {
    accountCardExpanded = false;
  }
  const justUnlocked = currentBilling.checkoutPending && nowPro && !previousWasPro;
  if (!previousWasPro && nowPro) {
    trackAnalytics("plan_became_pro", {
      source: currentBilling.checkoutPending ? "checkout_return" : "status_poll",
      offerId: currentBilling.offerId
    });
  }

  currentBilling.recentlyUnlocked = justUnlocked;
  if (currentBilling.accountLinked || nowPro) {
    currentBilling.restorePending = false;
    currentBilling.restoreStartedAt = null;
  }
  if (justUnlocked || nowPro) {
    currentBilling.checkoutPending = false;
    currentBilling.checkoutStartedAt = null;
  }

  await chrome.storage.sync.set({
    billingUserId: currentBilling.userId,
    billingPlan: currentBilling.plan,
    billingStatus: currentBilling.status,
    billingOfferId: currentBilling.offerId,
    accountEmail: currentBilling.accountEmail,
    restorePending: currentBilling.restorePending,
    restoreStartedAt: currentBilling.restoreStartedAt,
    billingCheckoutPending: currentBilling.checkoutPending,
    billingCheckoutStartedAt: currentBilling.checkoutStartedAt
  });

  renderBillingCard();
  updatePlanHint();
  renderAdvancedOptions();

  if (justUnlocked) {
    setStatus(translate("popup.statusProUnlocked"));
  }
}

async function fetchPricingCatalog() {
  const backendUrl = normalizeBackendUrl();

  if (!validateBackendUrl(backendUrl)) {
    return;
  }

  try {
    const payload = await createPopupSdkClient(backendUrl).getBillingPlans();
    currentPricingCatalog = payload || currentPricingCatalog;
    renderBillingCard();
  } catch {
    // Keep the last known or default catalog if pricing fetch fails.
  }
}

async function refreshBillingStatusWithRecovery() {
  const backendUrl = normalizeBackendUrl();

  if (!validateBackendUrl(backendUrl) || !currentBilling.userId) {
    return;
  }

  const recoveryEmail = validateEmailInput() || currentBilling.accountEmail;

  if (!recoveryEmail) {
    await fetchBillingStatus();
    return;
  }

  const previouslyLinked = currentBilling.accountLinked;
  const previousWasPro = isProPlan();
  const payload = await createPopupSdkClient(backendUrl).refreshBillingStatus({
    userId: currentBilling.userId,
    email: recoveryEmail
  });
  lastBillingDebug = payload.debug ?? null;
  console.info("LMI billing refresh debug", lastBillingDebug);

  currentBilling = {
    ...currentBilling,
    userId: payload.userId || currentBilling.userId,
    plan: payload.plan || "free",
    status: payload.status || "inactive",
    offerId: payload.offerId || null,
    accountLinked: Boolean(payload.account?.linked),
    accountEmail: payload.account?.email || recoveryEmail || currentBilling.accountEmail || "",
    earlyBirdEligible: Boolean(payload.offers?.earlyBirdEligible),
    earlyBirdRemaining: payload.offers?.earlyBirdRemaining ?? 0,
    earlyBirdActive: Boolean(payload.offers?.earlyBirdActive)
  };

  const nowPro = isProPlan();
  if (!previouslyLinked && currentBilling.accountLinked) {
    trackAnalytics("account_linked", {
      linkedVia: "manual_refresh"
    });
    if (!nowPro) {
      trackAnalytics("restore_linked_no_pro", {
        source: "manual_refresh",
        emailDomain: recoveryEmail.split("@")[1] || ""
      });
    }
  }
  if (!previouslyLinked && currentBilling.accountLinked && nowPro) {
    accountCardExpanded = false;
  }
  const justUnlocked = currentBilling.checkoutPending && nowPro && !previousWasPro;
  if (!previousWasPro && nowPro) {
    trackAnalytics("plan_became_pro", {
      source: "manual_refresh",
      offerId: currentBilling.offerId
    });
  }

  currentBilling.recentlyUnlocked = justUnlocked;
  if (currentBilling.accountLinked || nowPro) {
    currentBilling.restorePending = false;
    currentBilling.restoreStartedAt = null;
  }
  if (justUnlocked || nowPro) {
    currentBilling.checkoutPending = false;
    currentBilling.checkoutStartedAt = null;
  }

  await chrome.storage.sync.set({
    billingUserId: currentBilling.userId,
    billingPlan: currentBilling.plan,
    billingStatus: currentBilling.status,
    billingOfferId: currentBilling.offerId,
    accountEmail: currentBilling.accountEmail,
    restorePending: currentBilling.restorePending,
    restoreStartedAt: currentBilling.restoreStartedAt,
    billingCheckoutPending: currentBilling.checkoutPending,
    billingCheckoutStartedAt: currentBilling.checkoutStartedAt
  });

  renderBillingCard();
  updatePlanHint();
  renderAdvancedOptions();
  renderNotificationsCard();

  trackAnalytics("billing_refresh_result", {
    result: getBillingRefreshResult(),
    accountLinked: currentBilling.accountLinked,
    recovered: Boolean(lastBillingDebug?.recovery?.recovered),
    stripeLookupSource: lastBillingDebug?.recovery?.stripe?.lookupSource,
    emailDomain: recoveryEmail.split("@")[1] || "",
    ...buildLeagueSelectionAnalyticsProperties()
  });
}

function renderNotificationsCard() {
  notificationsCard.hidden = !notificationsCardExpanded;
  notificationsToggleButton.setAttribute("aria-expanded", String(notificationsCardExpanded));
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
      createPopupSdkClient(backendUrl).getLiveMatches(),
      createPopupSdkClient(backendUrl).getUpcomingMatches()
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
  } catch {
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
    "trackingEnabled",
    "activeViewMode",
    "scenarioModeEnabled",
    "scenarioPayloadPath",
    "leagueFilterId",
    "language",
    "billingUserId",
    "billingPlan",
    "billingStatus",
    "billingOfferId",
    "accountEmail",
    "restorePending",
    "restoreStartedAt",
    "billingCheckoutPending",
    "billingCheckoutStartedAt",
    "notifyGoals",
    "notifyTableChanges"
  ]);
  const storedFixtureId = result.fixtureId ?? null;
  const storedLeagueFilterId = result.leagueFilterId ?? null;
  const storedLanguage = result.language ?? DEFAULT_LANGUAGE;
  const storedScenarioPayloadPath = String(result.scenarioPayloadPath || "");

  setLanguage(storedLanguage);
  fixtureIdInput.value = isManualFixtureTestingAvailable() ? storedFixtureId ?? "" : "";
  advancedOptionsExpanded = isManualFixtureTestingAvailable() && Boolean(storedFixtureId);
  renderAdvancedOptions();
  scenarioPreviewEnabled = Boolean(result.scenarioModeEnabled) && isScenarioPreviewAvailable();
  currentBilling = {
    ...currentBilling,
    userId: result.billingUserId || createBillingUserId(),
    plan: result.billingPlan || "free",
    status: result.billingStatus || "inactive",
    offerId: result.billingOfferId || null,
    accountEmail: result.accountEmail || "",
    restorePending: Boolean(result.restorePending),
    restoreStartedAt: result.restoreStartedAt ?? null,
    checkoutPending: Boolean(result.billingCheckoutPending),
    checkoutStartedAt: result.billingCheckoutStartedAt ?? null,
    recentlyUnlocked: false
  };
  currentNotifications = {
    notifyGoals: result.notifyGoals ?? true,
    notifyTableChanges: result.notifyTableChanges ?? true
  };
  notifyGoalsToggle.checked = currentNotifications.notifyGoals;
  notifyTableChangesToggle.checked = currentNotifications.notifyTableChanges;

  await chrome.storage.sync.set({
    billingUserId: currentBilling.userId,
    activeViewMode: result.activeViewMode ?? "overlay",
    scenarioModeEnabled: scenarioPreviewEnabled,
    scenarioPayloadPath: storedScenarioPayloadPath,
    notifyGoals: currentNotifications.notifyGoals,
    notifyTableChanges: currentNotifications.notifyTableChanges
  });

  await chrome.storage.sync.remove("backendUrl");

  renderBillingCard();
  updatePlanHint();
  accountCardExpanded = !currentBilling.accountLinked || !isProPlan();

  await loadScenarioCatalog();
  if (storedScenarioPayloadPath) {
    scenarioVariantSelect.value = storedScenarioPayloadPath;
  }
  renderScenarioPreviewState();
  await loadRuntimePublicConfig();
  await fetchPricingCatalog();
  await fetchBillingStatus();
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
  currentTrackingEnabled = Boolean(result.trackingEnabled);
  renderTrackingButton();

  if (!popupOpenedTracked) {
    trackAnalytics("popup_opened", buildPopupOpenedAnalyticsProperties(result.trackingEnabled));
    popupOpenedTracked = true;
  }
}

async function loadRuntimePublicConfig() {
  const backendUrl = normalizeBackendUrl();

  if (!validateBackendUrl(backendUrl)) {
    return;
  }

  try {
    const payload = await createPopupSdkClient(backendUrl).getPublicConfig();
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
    // Analytics config should never block the popup.
  }
}

async function handleStartTracking() {
  const backendUrl = normalizeBackendUrl();
  const selectedMatch = getSelectedMatch();
  const selectedScenario = scenarioPreviewEnabled ? getSelectedScenarioEntry() : null;
  const fixtureId = selectedScenario?.fixtureId || getSelectedFixtureId();
  const currentSettings = await chrome.storage.sync.get([
    "activeViewMode",
    "sidepanelSessionActive"
  ]);
  const preferredViewMode =
    currentSettings.activeViewMode === "sidepanel" && currentSettings.sidepanelSessionActive
      ? "sidepanel"
      : "overlay";

  if (scenarioPreviewEnabled && !selectedScenario) {
    setStatus(translate("popup.statusChooseScenario"), true);
    return;
  }

  if (!scenarioPreviewEnabled && !fixtureId) {
    setStatus(translate("popup.statusChooseFixture"), true);
    return;
  }

  if (!validateBackendUrl(backendUrl)) {
    setStatus(translate("popup.statusEnterBackend"), true);
    return;
  }

  if (!isManualFixtureTestingAvailable() && fixtureIdInput.value) {
    setStatus(translate("popup.statusUpgradeRequiredManual"), true);
    return;
  }

  if (
    !isProPlan() &&
    selectedMatch?.league?.id &&
    !isLeagueAvailableForCurrentPlan(selectedMatch.league.id)
  ) {
    setStatus(translate("popup.statusUpgradeRequiredLeague"), true);
    return;
  }

  await ensureContentScriptInjected();

  await chrome.storage.sync.set({
    fixtureId,
    scenarioModeEnabled: Boolean(selectedScenario),
    scenarioPayloadPath: selectedScenario?.path || "",
    language: currentLanguage,
    activeViewMode: preferredViewMode,
    billingUserId: currentBilling.userId,
    billingPlan: currentBilling.plan,
    billingStatus: currentBilling.status,
    billingOfferId: currentBilling.offerId,
    notifyGoals: currentNotifications.notifyGoals,
    notifyTableChanges: currentNotifications.notifyTableChanges,
    trackingEnabled: true
  });
  currentTrackingEnabled = true;
  renderTrackingButton();

  trackAnalytics("tracking_started", {
    ...buildMatchAnalyticsProperties(selectedMatch),
    scenarioPreviewEnabled: Boolean(selectedScenario),
    scenarioLabel: selectedScenario?.label
  });
  setStatus(translate("popup.statusTrackingStarted"));
}

async function handleStopTracking() {
  const selectedMatch = getSelectedMatch();

  await chrome.storage.sync.set({
    trackingEnabled: false,
    activeViewMode: "overlay",
    billingPlan: currentBilling.plan,
    billingStatus: currentBilling.status,
    billingOfferId: currentBilling.offerId
  });
  currentTrackingEnabled = false;
  renderTrackingButton();

  trackAnalytics("tracking_stopped", buildMatchAnalyticsProperties(selectedMatch));
  setStatus(translate("popup.statusTrackingStopped"));
}

async function handleBillingAction() {
  if (isProPlan()) {
    try {
      currentBilling.recentlyUnlocked = false;
      await fetchBillingStatus();
      setStatus(translate("popup.statusPlanUpdated"));
    } catch (error) {
      setStatus(getPopupErrorMessage(error, "popup.statusPlanLoadFailed"), true);
    }
    return;
  }

  const backendUrl = normalizeBackendUrl();

  if (!validateBackendUrl(backendUrl)) {
    setStatus(translate("popup.statusEnterBackend"), true);
    return;
  }

  billingActionButton.disabled = true;
  setStatus(translate("popup.upgradeInProgress"));

  const userId = await ensureBillingUserId();

  trackAnalytics("upgrade_clicked", {
    offerId: currentBilling.earlyBirdEligible ? "early_bird_lifetime" : "standard_pro",
    fixtureId: getSelectedFixtureId(),
    source: getSelectedFixtureSource(),
    hasBillingEmail: Boolean(validateEmailInput() || currentBilling.accountEmail),
    ...buildLeagueSelectionAnalyticsProperties()
  });

  try {
    const payload = await createPopupSdkClient(backendUrl).createCheckoutSession({
      userId,
      email: accountEmailInput.value.trim() || undefined,
      offerId: currentBilling.earlyBirdEligible ? "early_bird_lifetime" : null
    });
    currentBilling.checkoutPending = true;
    currentBilling.checkoutStartedAt = Date.now();
    currentBilling.recentlyUnlocked = false;
    await chrome.storage.sync.set({
      billingCheckoutPending: true,
      billingCheckoutStartedAt: currentBilling.checkoutStartedAt,
      billingRecentlyUnlocked: false
    });
    renderBillingCard();
    await chrome.tabs.create({
      url: payload.checkoutUrl
    });
    setStatus(translate("popup.statusCheckoutPending"));
  } catch (error) {
    setStatus(getPopupErrorMessage(error, "popup.statusUpgradeFailed"), true);
  } finally {
    billingActionButton.disabled = false;
  }
}

function validateEmailInput() {
  const email = accountEmailInput.value.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "";
  }

  return email;
}

async function handleRestoreAccess() {
  const backendUrl = normalizeBackendUrl();
  const email = validateEmailInput();

  if (!validateBackendUrl(backendUrl)) {
    setStatus(translate("popup.statusEnterBackend"), true);
    return;
  }

  if (!email) {
    trackAnalytics("restore_failed", {
      reason: "invalid_email"
    });
    setStatus(translate("popup.statusRestoreEmailInvalid"), true);
    return;
  }

  accountRestoreButton.disabled = true;

  try {
    const userId = await ensureBillingUserId();

    trackAnalytics("restore_started", {
      emailDomain: email.split("@")[1] || ""
    });

    const payload = await createPopupSdkClient(backendUrl).requestMagicLink({
      userId,
      email
    });
    currentBilling.accountEmail = payload.account?.email || email;
    currentBilling.restorePending = true;
    currentBilling.restoreStartedAt = Date.now();
    accountEmailInput.value = currentBilling.accountEmail;
    renderAccountCard();

    await chrome.storage.sync.set({
      accountEmail: currentBilling.accountEmail,
      restorePending: true,
      restoreStartedAt: currentBilling.restoreStartedAt
    });

    if (payload.previewUrl) {
      await chrome.tabs.create({
        url: payload.previewUrl
      });
    setStatus(translate("popup.statusRestorePreviewOpened"));
    return;
    }

    setStatus(translate("popup.statusRestoreSent"));
  } catch (error) {
    trackAnalytics("restore_failed", {
      reason: "request_failed",
      emailDomain: email.split("@")[1] || ""
    });
    setStatus(getPopupErrorMessage(error, "popup.statusRestoreFailed"), true);
  } finally {
    accountRestoreButton.disabled = false;
  }
}

function shouldAutoRefreshRestore() {
  if (!currentBilling.restorePending) {
    return false;
  }

  if (!currentBilling.restoreStartedAt) {
    return true;
  }

  return Date.now() - Number(currentBilling.restoreStartedAt) <= RESTORE_AUTO_REFRESH_WINDOW_MS;
}

async function autoRefreshAfterReturn() {
  if (!shouldAutoRefreshRestore() && !currentBilling.checkoutPending) {
    return;
  }

  try {
    await fetchBillingStatus();

    if (isProPlan()) {
      setStatus(translate("popup.statusProUnlocked"));
      return;
    }

    if (currentBilling.accountLinked) {
      setStatus(translate("popup.statusRestoreLinked"));
    }
  } catch {
    // Quiet on passive resume checks.
  }
}

async function handleOpenSidePanel() {
  if (!chrome.sidePanel?.open) {
    setStatus(translate("popup.statusSidePanelFailed"), true);
    return;
  }

  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (activeTab?.id) {
      await chrome.sidePanel.setOptions({
        tabId: activeTab.id,
        path: "sidepanel.html",
        enabled: true
      });
      await chrome.storage.sync.set({
        activeViewMode: "sidepanel"
      });
      await chrome.sidePanel.open({ tabId: activeTab.id });
    } else if (activeTab?.windowId) {
      await chrome.storage.sync.set({
        activeViewMode: "sidepanel"
      });
      await chrome.sidePanel.open({ windowId: activeTab.windowId });
    } else {
      throw new Error("No active tab available");
    }

    setStatus(translate("popup.statusSidePanelOpened"));
    trackAnalytics("sidepanel_opened");
    window.close();
  } catch {
    setStatus(translate("popup.statusSidePanelFailed"), true);
  }
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
    if (!advancedOptionsExpanded) {
      advancedOptionsExpanded = true;
      renderAdvancedOptions();
    }
  }
});

advancedToggleButton.addEventListener("click", () => {
  advancedOptionsExpanded = !advancedOptionsExpanded;
  renderAdvancedOptions();
});

scenarioModeToggle.addEventListener("change", async () => {
  scenarioPreviewEnabled = scenarioModeToggle.checked && isScenarioPreviewAvailable();
  renderScenarioPreviewState();
  await chrome.storage.sync.set({
    scenarioModeEnabled: scenarioPreviewEnabled
  });
});

scenarioVariantSelect.addEventListener("change", async () => {
  renderScenarioPreviewState();
  await chrome.storage.sync.set({
    scenarioPayloadPath: scenarioVariantSelect.value || ""
  });
});

refreshMatchesButton.addEventListener("click", async () => {
  trackAnalytics("match_list_refreshed", {
    selectedLeagueId: getSelectedLeagueId()
  });
  await refreshMatchLists(getSelectedFixtureId(), getSelectedLeagueId());
});

languageSelect.addEventListener("change", async () => {
  const previousLanguage = currentLanguage;
  setLanguage(languageSelect.value);
  await chrome.storage.sync.set({
    language: currentLanguage
  });

  if (currentLanguage !== previousLanguage) {
    trackAnalytics("language_selected", {
      selectedLanguage: currentLanguage
    });
  }
  await refreshMatchLists(getSelectedFixtureId(), getSelectedLeagueId());
});

leagueFilterSelect.addEventListener("change", async () => {
  const selectedLeagueId = getSelectedLeagueId();
  const selectedLeague = currentLeagueFilter.availableLeagues.find(
    (league) => league.id === selectedLeagueId
  );

  await chrome.storage.sync.set({
    leagueFilterId: selectedLeagueId
  });

  trackAnalytics("league_focus_selected", {
    selectedLeagueId,
    selectedLeagueName: selectedLeague?.name
  });

  clearOtherInputs("manual");
  renderMatchLists();
});

startButton.addEventListener("click", () => {
  if (currentTrackingEnabled) {
    void handleStopTracking();
    return;
  }

  void handleStartTracking();
});
openSidePanelButton.addEventListener("click", handleOpenSidePanel);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync" || !changes.trackingEnabled) {
    return;
  }

  currentTrackingEnabled = Boolean(changes.trackingEnabled.newValue);
  renderTrackingButton();
});
billingActionButton.addEventListener("click", handleBillingAction);
billingRefreshButton.addEventListener("click", async () => {
  try {
    currentBilling.recentlyUnlocked = false;
    trackAnalytics("billing_refresh_clicked", {
      hasAccountEmail: Boolean(validateEmailInput() || currentBilling.accountEmail)
    });
    await fetchPricingCatalog();
    await refreshBillingStatusWithRecovery();
    if (isProPlan()) {
      setStatus(translate("popup.statusPlanUpdated"));
    } else {
      const debugSummary = summarizeBillingDebug(lastBillingDebug);
      setStatus(
        debugSummary
          ? `${translate("popup.statusPlanUpdated")} Debug: ${debugSummary}`
          : `${translate("popup.statusPlanUpdated")} Debug logged to console.`,
        true
      );
    }
    await refreshMatchLists(getSelectedFixtureId(), getSelectedLeagueId());
  } catch (error) {
    setStatus(getPopupErrorMessage(error, "popup.statusPlanLoadFailed"), true);
  }
});

accountRestoreButton.addEventListener("click", handleRestoreAccess);
accountToggleButton.addEventListener("click", () => {
  accountCardExpanded = !accountCardExpanded;
  renderAccountCard();
});

notifyGoalsToggle.addEventListener("change", async () => {
  currentNotifications.notifyGoals = notifyGoalsToggle.checked;
  await chrome.storage.sync.set({
    notifyGoals: currentNotifications.notifyGoals
  });
  trackAnalytics("notification_setting_changed", {
    setting: "goal_happened",
    enabled: currentNotifications.notifyGoals
  });
  setStatus(translate("popup.statusNotificationsUpdated"));
});

notifyTableChangesToggle.addEventListener("change", async () => {
  currentNotifications.notifyTableChanges = notifyTableChangesToggle.checked;
  await chrome.storage.sync.set({
    notifyTableChanges: currentNotifications.notifyTableChanges
  });
  trackAnalytics("notification_setting_changed", {
    setting: "goal_changed_table_position",
    enabled: currentNotifications.notifyTableChanges
  });
  setStatus(translate("popup.statusNotificationsUpdated"));
});

notificationsToggleButton.addEventListener("click", () => {
  notificationsCardExpanded = !notificationsCardExpanded;
  if (notificationsCardExpanded) {
    trackAnalytics("notifications_panel_opened");
  }
  renderNotificationsCard();
});

notificationsCloseButton.addEventListener("click", () => {
  notificationsCardExpanded = false;
  renderNotificationsCard();
});

window.addEventListener("focus", () => {
  void autoRefreshAfterReturn();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    void autoRefreshAfterReturn();
  }
});

loadSettings().catch(() => {
  setStatus(translate("popup.statusSettingsFailed"), true);
});
