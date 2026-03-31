export function parseFixtureId(value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function assertFixtureId(value) {
  const fixtureId = parseFixtureId(value);

  if (!fixtureId) {
    const error = new Error("fixture_id must be a positive integer.");
    error.statusCode = 400;
    throw error;
  }

  return fixtureId;
}

export function validateSessionPayload(payload = {}) {
  const fixtureId = payload.fixtureId ? assertFixtureId(payload.fixtureId) : null;
  const durationMs = Number(payload.durationMs ?? 0);
  const leagueId = payload.leagueId ? parseFixtureId(payload.leagueId) : null;
  const leagueName =
    typeof payload.leagueName === "string" ? payload.leagueName.trim() : "";

  if (!Number.isFinite(durationMs) || durationMs < 0) {
    const error = new Error("durationMs must be a non-negative number.");
    error.statusCode = 400;
    throw error;
  }

  return {
    fixtureId,
    durationMs,
    leagueId,
    leagueName
  };
}

export function validateBillingIdentity(value, fieldName = "userId") {
  const userId = typeof value === "string" ? value.trim() : "";

  if (!userId || userId === "anonymous") {
    const error = new Error(`${fieldName} must be a non-empty identifier.`);
    error.statusCode = 400;
    throw error;
  }

  if (!/^[a-zA-Z0-9._:@-]{3,120}$/.test(userId)) {
    const error = new Error(`${fieldName} contains unsupported characters.`);
    error.statusCode = 400;
    throw error;
  }

  return userId;
}

export function validateEarlyBirdClaimPayload(payload = {}) {
  const userId = validateBillingIdentity(payload.userId, "userId");
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error("email must be a valid email address.");
    error.statusCode = 400;
    throw error;
  }

  return {
    userId,
    email
  };
}

export function validateCheckoutPayload(payload = {}, fallbackUserId = "") {
  const userId = validateBillingIdentity(payload.userId ?? fallbackUserId, "userId");
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const offerId = typeof payload.offerId === "string" ? payload.offerId.trim() : "";

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error("email must be a valid email address.");
    error.statusCode = 400;
    throw error;
  }

  if (offerId && offerId !== "early_bird_lifetime") {
    const error = new Error("offerId is not supported.");
    error.statusCode = 400;
    throw error;
  }

  return {
    userId,
    email,
    offerId: offerId || null
  };
}

export function validateMagicLinkRequestPayload(payload = {}, fallbackUserId = "") {
  const userId = validateBillingIdentity(payload.userId ?? fallbackUserId, "userId");
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error("email must be a valid email address.");
    error.statusCode = 400;
    throw error;
  }

  return {
    userId,
    email
  };
}

export function validateMagicLinkToken(value) {
  const token = typeof value === "string" ? value.trim() : "";

  if (!token || !/^[a-f0-9]{32,96}$/i.test(token)) {
    const error = new Error("token must be a valid magic link token.");
    error.statusCode = 400;
    throw error;
  }

  return token;
}
