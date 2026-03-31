(function initLmiConfig(globalScope) {
  const releaseChannel = "staging";
  const backendUrls = {
    staging: "https://footballextension-staging.up.railway.app",
    production: "https://footballextension.up.railway.app"
  };

  globalScope.LMI_CONFIG = {
    releaseChannel,
    backendUrls,
    backendUrl: backendUrls[releaseChannel] || backendUrls.staging,
    posthog: {
      enabled: true,
      host: "https://us.i.posthog.com",
      apiKey: "phc_qxYrzMeh9rgjqHZ2LXQTVLQrrsYifB7kCj4bpZ9i8f4a"
    }
  };
})(globalThis);
