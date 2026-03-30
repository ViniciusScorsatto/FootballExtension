export function attachMonetizationContext(req, _res, next) {
  req.monetization = {
    plan: req.header("x-live-impact-plan") ?? "free",
    userId: req.header("x-live-impact-user") ?? "anonymous"
  };

  next();
}

export function requestLimitPlaceholder(req, _res, next) {
  req.requestLimit = {
    enabled: false,
    reason: "Placeholder for future per-user request throttling."
  };

  next();
}
