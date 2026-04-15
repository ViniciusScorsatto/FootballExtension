function withLeadingSlash(path) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function normalizeBaseUrl(baseUrl) {
  return String(baseUrl ?? "").trim().replace(/\/$/, "");
}

export function buildIdentityHeaders({ userId = "anonymous", plan = "free" } = {}) {
  return {
    "Content-Type": "application/json",
    "x-live-impact-user": userId || "anonymous",
    "x-live-impact-plan": plan || "free"
  };
}

export function createSdkError(message, status = 0, data = null) {
  const error = new Error(message || "Request failed");
  error.status = status;
  error.data = data;
  return error;
}

function buildQueryString(query = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    params.set(key, String(value));
  }

  const output = params.toString();
  return output ? `?${output}` : "";
}

function createPath(path, query) {
  return `${withLeadingSlash(path)}${buildQueryString(query)}`;
}

async function defaultRequester({ method, url, headers, body }) {
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw createSdkError(
      payload?.error || `Request failed with ${response.status}`,
      response.status,
      payload
    );
  }

  return payload;
}

function createSdk({ baseUrl, getHeaders, requester }) {
  const resolvedRequester = requester || defaultRequester;

  async function request(method, path, { query, body, headers } = {}) {
    const mergedHeaders = {
      ...(typeof getHeaders === "function" ? getHeaders() : {}),
      ...(headers || {})
    };

    return resolvedRequester({
      method,
      url: `${normalizeBaseUrl(baseUrl)}${createPath(path, query)}`,
      headers: mergedHeaders,
      body
    });
  }

  return {
    getPublicConfig() {
      return request("GET", "/public-config");
    },
    getBillingPlans() {
      return request("GET", "/billing/plans");
    },
    getBillingStatus({ userId } = {}) {
      return request("GET", "/billing/status", {
        query: {
          user_id: userId
        }
      });
    },
    refreshBillingStatus(body) {
      return request("POST", "/billing/status/refresh", {
        body
      });
    },
    claimEarlyBird(body) {
      return request("POST", "/billing/early-bird/claim", {
        body
      });
    },
    createCheckoutSession(body) {
      return request("POST", "/billing/checkout-session", {
        body
      });
    },
    requestMagicLink(body) {
      return request("POST", "/auth/magic-link/request", {
        body
      });
    },
    getLiveMatches() {
      return request("GET", "/matches/live");
    },
    getUpcomingMatches(query = {}) {
      return request("GET", "/matches/upcoming", {
        query
      });
    },
    getMatchImpact({ fixtureId }) {
      return request("GET", "/match-impact", {
        query: {
          fixture_id: fixtureId
        }
      });
    },
    trackUsage(body) {
      return request("POST", "/track/usage", {
        body
      });
    },
    trackSession(body) {
      return request("POST", "/track/session", {
        body
      });
    }
  };
}

export function createFootballSdk({ baseUrl, userId, plan, requester }) {
  return createSdk({
    baseUrl,
    requester,
    getHeaders: () => buildIdentityHeaders({ userId, plan })
  });
}

export function createRequesterBackedSdk({ baseUrl, getHeaders, requester }) {
  return createSdk({
    baseUrl,
    getHeaders,
    requester
  });
}
