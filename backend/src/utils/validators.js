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
