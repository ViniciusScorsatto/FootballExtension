function normalizeOrigin(origin) {
  return typeof origin === "string" ? origin.trim() : "";
}

export function createAllowedOrigins({ allowedOrigins = [], allowedExtensionIds = [] }) {
  const explicitOrigins = allowedOrigins
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

  const extensionOrigins = allowedExtensionIds
    .map((extensionId) => normalizeOrigin(extensionId))
    .filter(Boolean)
    .map((extensionId) => `chrome-extension://${extensionId}`);

  return [...new Set([...explicitOrigins, ...extensionOrigins])];
}

export function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) {
    return true;
  }

  return allowedOrigins.includes("*") || allowedOrigins.includes(origin);
}

