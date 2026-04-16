function normalizeOrigin(origin) {
  return typeof origin === "string" ? origin.trim() : "";
}

export function createAllowedOrigins({
  allowedOrigins = [],
  allowedExtensionIds = [],
  betaModeEnabled = false,
  nodeEnv = process.env.NODE_ENV ?? "development"
}) {
  const explicitOrigins = allowedOrigins
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

  const extensionOrigins = allowedExtensionIds
    .map((extensionId) => normalizeOrigin(extensionId))
    .filter(Boolean)
    .map((extensionId) => `chrome-extension://${extensionId}`);

  return {
    origins: [...new Set([...explicitOrigins, ...extensionOrigins])],
    allowAnyExtensionOrigin:
      Boolean(betaModeEnabled) || normalizeOrigin(nodeEnv) !== "production"
  };
}

export function isOriginAllowed(origin, allowedOriginConfig) {
  const normalizedOrigin = normalizeOrigin(origin);
  const config =
    Array.isArray(allowedOriginConfig)
      ? {
          origins: allowedOriginConfig,
          allowAnyExtensionOrigin: process.env.NODE_ENV !== "production"
        }
      : {
          origins: allowedOriginConfig?.origins ?? [],
          allowAnyExtensionOrigin: Boolean(allowedOriginConfig?.allowAnyExtensionOrigin)
        };

  if (!normalizedOrigin) {
    return true;
  }

  if (normalizedOrigin.startsWith("chrome-extension://") && !config.origins.includes("*") && config.allowAnyExtensionOrigin) {
    return true;
  }

  return config.origins.includes("*") || config.origins.includes(normalizedOrigin);
}
