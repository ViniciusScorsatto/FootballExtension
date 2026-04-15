function createAppError({
  message,
  statusCode,
  code,
  source = "application",
  retryAfterSeconds = null,
  recoverable = false,
  details = null
}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.source = source;
  error.retryAfterSeconds = retryAfterSeconds;
  error.recoverable = recoverable;
  error.details = details;
  return error;
}

function readRetryAfterSeconds(error) {
  const retryAfterHeader = error.response?.headers?.["retry-after"];
  const parsedRetryAfter = Number(retryAfterHeader);

  if (Number.isFinite(parsedRetryAfter) && parsedRetryAfter > 0) {
    return parsedRetryAfter;
  }

  return null;
}

export function normalizeUpstreamApiError(error) {
  if (error?.statusCode && error?.code) {
    return error;
  }

  const statusCode = error?.response?.status ?? null;
  const upstreamMessage =
    error?.response?.data?.message ??
    error?.response?.data?.errors?.requests ??
    error?.message ??
    "Upstream API request failed.";
  const retryAfterSeconds = readRetryAfterSeconds(error);
  const lowerMessage = String(upstreamMessage).toLowerCase();

  if (
    statusCode === 429 ||
    lowerMessage.includes("limit") ||
    lowerMessage.includes("quota") ||
    lowerMessage.includes("too many")
  ) {
    return createAppError({
      message: "Live data is temporarily limited by the upstream football API.",
      statusCode: 503,
      code: "UPSTREAM_QUOTA_EXCEEDED",
      source: "api-football",
      retryAfterSeconds: retryAfterSeconds ?? 300,
      recoverable: true,
      details: {
        upstreamStatusCode: statusCode,
        upstreamMessage
      }
    });
  }

  if (error?.code === "ECONNABORTED" || lowerMessage.includes("timeout")) {
    return createAppError({
      message: "The upstream football API timed out.",
      statusCode: 503,
      code: "UPSTREAM_TIMEOUT",
      source: "api-football",
      retryAfterSeconds: retryAfterSeconds ?? 30,
      recoverable: true,
      details: {
        upstreamStatusCode: statusCode,
        upstreamMessage
      }
    });
  }

  if (statusCode === 401 || statusCode === 403) {
    return createAppError({
      message: "The football data provider rejected the server credentials.",
      statusCode: 502,
      code: "UPSTREAM_AUTH_FAILED",
      source: "api-football",
      recoverable: false,
      details: {
        upstreamStatusCode: statusCode,
        upstreamMessage
      }
    });
  }

  if (statusCode && statusCode >= 500) {
    return createAppError({
      message: "The upstream football API is temporarily unavailable.",
      statusCode: 503,
      code: "UPSTREAM_UNAVAILABLE",
      source: "api-football",
      retryAfterSeconds: retryAfterSeconds ?? 30,
      recoverable: true,
      details: {
        upstreamStatusCode: statusCode,
        upstreamMessage
      }
    });
  }

  if (error?.request && !statusCode) {
    return createAppError({
      message: "The backend could not reach the upstream football API.",
      statusCode: 503,
      code: "UPSTREAM_UNREACHABLE",
      source: "api-football",
      retryAfterSeconds: retryAfterSeconds ?? 30,
      recoverable: true,
      details: {
        upstreamStatusCode: statusCode,
        upstreamMessage
      }
    });
  }

  return error;
}

export { createAppError };
