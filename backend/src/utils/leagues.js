function normalizeLeagueId(leagueId) {
  return Number.isInteger(leagueId) ? leagueId : Number(leagueId);
}

export function isLeagueSupported(leagueId, supportedLeagueIds = []) {
  const normalizedLeagueId = normalizeLeagueId(leagueId);

  if (!Number.isInteger(normalizedLeagueId) || normalizedLeagueId <= 0) {
    return false;
  }

  if (!supportedLeagueIds.length) {
    return true;
  }

  return supportedLeagueIds.includes(normalizedLeagueId);
}

export function isFeaturedLeague(leagueId, featuredLeagueIds = []) {
  const normalizedLeagueId = normalizeLeagueId(leagueId);

  if (!Number.isInteger(normalizedLeagueId) || normalizedLeagueId <= 0) {
    return false;
  }

  return featuredLeagueIds.includes(normalizedLeagueId);
}

export function buildLeagueFilterPayload(matches, env) {
  const availableLeagueMap = new Map();

  matches.forEach((match) => {
    if (!match?.league?.id) {
      return;
    }

    availableLeagueMap.set(match.league.id, {
      id: match.league.id,
      name: match.league.name,
      country: match.league.country,
      featured: isFeaturedLeague(match.league.id, env.featuredLeagueIds)
    });
  });

  const availableLeagues = [...availableLeagueMap.values()].sort((left, right) => {
    if (left.featured !== right.featured) {
      return left.featured ? -1 : 1;
    }

    const leftLabel = `${left.country} ${left.name}`.trim();
    const rightLabel = `${right.country} ${right.name}`.trim();

    return leftLabel.localeCompare(rightLabel);
  });

  return {
    supportedLeagueIds: env.supportedLeagueIds,
    featuredLeagueIds: env.featuredLeagueIds,
    availableLeagues
  };
}
