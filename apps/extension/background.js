chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "LMI_POSTHOG_CAPTURE") {
    void (async () => {
      try {
        await fetch(`${String(message.host || "https://us.i.posthog.com").replace(/\/$/, "")}/capture/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            api_key: message.apiKey,
            event: message.event,
            distinct_id: message.distinctId || "anonymous",
            properties: {
              ...message.properties,
              $lib: "live-match-impact-extension",
              $lib_version: chrome.runtime.getManifest().version
            }
          })
        });

        sendResponse({
          ok: true
        });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error?.message || "PostHog capture failed"
        });
      }
    })();

    return true;
  }

  if (message?.type === "LMI_HTTP_REQUEST") {
    void (async () => {
      try {
        const response = await fetch(message.url, {
          method: message.method || "GET",
          headers: message.headers || {},
          body: message.body ? JSON.stringify(message.body) : undefined
        });

        const text = await response.text();
        let data = null;

        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = text;
        }

        sendResponse({
          ok: response.ok,
          status: response.status,
          data
        });
      } catch (error) {
        sendResponse({
          ok: false,
          status: 0,
          error: error?.message || "Unknown request error"
        });
      }
    })();

    return true;
  }

  if (message?.type === "LMI_SHOW_NOTIFICATION" || message?.type === "LMI_GOAL_NOTIFICATION") {
    const notificationId =
      message.notificationId ||
      `${message?.type === "LMI_GOAL_NOTIFICATION" ? "goal" : "lmi"}-${Date.now()}`;

    chrome.notifications.create(notificationId, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/footanalysislogo.png"),
      title: message.title || "Goal Impact",
      message: message.message || "A goal changed the match."
    });

    sendResponse({
      ok: true
    });

    return false;
  }

  return false;
});
