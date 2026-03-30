function normalizeLeagueId(leagueId) {
  return Number.isInteger(leagueId) ? leagueId : Number(leagueId);
}

const KNOWN_LEAGUES = new Map([
  [39, { name: "Premier League", country: "England" }],
  [140, { name: "La Liga", country: "Spain" }],
  [135, { name: "Serie A", country: "Italy" }],
  [78, { name: "Bundesliga", country: "Germany" }],
  [61, { name: "Ligue 1", country: "France" }]
]);

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
  const configuredLeagueIds = new Set([
    ...env.supportedLeagueIds,
    ...env.featuredLeagueIds
  ]);

  configuredLeagueIds.forEach((leagueId) => {
    const knownLeague = KNOWN_LEAGUES.get(leagueId);

    availableLeagueMap.set(leagueId, {
      id: leagueId,
      name: knownLeague?.name ?? `League ${leagueId}`,
      country: knownLeague?.country ?? "",
      featured: isFeaturedLeague(leagueId, env.featuredLeagueIds),
      availableNow: false
    });
  });

  matches.forEach((match) => {
    if (!match?.league?.id) {
      return;
    }

    const existingLeague = availableLeagueMap.get(match.league.id);

    availableLeagueMap.set(match.league.id, {
      id: match.league.id,
      name: match.league.name,
      country: match.league.country,
      featured: isFeaturedLeague(match.league.id, env.featuredLeagueIds),
      availableNow: true,
      hasLiveMatch: existingLeague?.hasLiveMatch || match.status?.phase === "live",
      hasUpcomingMatch: existingLeague?.hasUpcomingMatch || match.status?.phase === "upcoming"
    });
  });

  const availableLeagues = [...availableLeagueMap.values()].sort((left, right) => {
    if (left.featured !== right.featured) {
      return left.featured ? -1 : 1;
    }

    if ((left.availableNow ?? false) !== (right.availableNow ?? false)) {
      return left.availableNow ? -1 : 1;
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
