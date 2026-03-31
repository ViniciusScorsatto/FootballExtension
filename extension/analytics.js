(function initLmiAnalytics(globalScope) {
  function getPosthogConfig() {
    return globalScope.LMI_CONFIG?.posthog ?? {};
  }

  function sanitizeProperties(properties) {
    return Object.fromEntries(
      Object.entries(properties || {}).filter(([, value]) => {
        return value !== undefined && value !== null && value !== "";
      })
    );
  }

  function capture(eventName, options = {}) {
    const posthogConfig = getPosthogConfig();

    if (!posthogConfig.enabled || !posthogConfig.apiKey || !eventName) {
      return;
    }

    try {
      chrome.runtime.sendMessage(
        {
          type: "LMI_POSTHOG_CAPTURE",
          event: eventName,
          host: posthogConfig.host || "https://us.i.posthog.com",
          apiKey: posthogConfig.apiKey,
          distinctId: options.distinctId || "anonymous",
          properties: sanitizeProperties(options.properties)
        },
        () => {
          void chrome.runtime.lastError;
        }
      );
    } catch {
      // Analytics should never block extension behavior.
    }
  }

  function updateConfig(nextConfig = {}) {
    globalScope.LMI_CONFIG = {
      ...(globalScope.LMI_CONFIG || {}),
      posthog: {
        ...getPosthogConfig(),
        ...nextConfig
      }
    };
  }

  globalScope.LMI_ANALYTICS = {
    capture,
    updateConfig,
    isEnabled() {
      const posthogConfig = getPosthogConfig();
      return Boolean(posthogConfig.enabled && posthogConfig.apiKey);
    }
  };
})(globalThis);
