chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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

  if (message?.type === "LMI_GOAL_NOTIFICATION") {
    chrome.notifications.create(`goal-${Date.now()}`, {
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
