(function initLmiConfig(globalScope) {
  const releaseChannel = "staging";
  const backendUrls = {
    staging: "https://footballextension-staging.up.railway.app",
    production: "https://footballextension.up.railway.app"
  };

  globalScope.LMI_CONFIG = {
    releaseChannel,
    backendUrls,
    backendUrl: backendUrls[releaseChannel] || backendUrls.staging
  };
})(globalThis);
