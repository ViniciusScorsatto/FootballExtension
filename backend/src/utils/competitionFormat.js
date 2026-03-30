import { competitionFormatOverrides } from "../config/competitionFormats.js";
import { normalizeStandingsGroups } from "./table.js";

function normalizeLeagueName(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase();
}

function findCompetitionOverride(fixture) {
  const leagueId = fixture?.league?.id ?? null;
  const leagueName = normalizeLeagueName(fixture?.league?.name);

  return (
    competitionFormatOverrides.find((entry) => entry.leagueId && entry.leagueId === leagueId) ??
    competitionFormatOverrides.find(
      (entry) => entry.leagueName && normalizeLeagueName(entry.leagueName) === leagueName
    ) ??
    null
  );
}

function findGroupsForTeam(groups, teamId) {
  if (!teamId) {
    return [];
  }

  return groups.filter((group) => group.table.some((row) => row.teamId === teamId));
}

export function classifyCompetitionFormat({ fixture, standingsPayload }) {
  const override = findCompetitionOverride(fixture);

  if (override) {
    return {
      format: override.format,
      impactMode: override.impactMode,
      selectedGroup: null,
      groups: [],
      source: "override"
    };
  }

  if (fixture?.league?.standings !== true || !standingsPayload) {
    return {
      format: "no_standings",
      impactMode: "score-only",
      selectedGroup: null,
      groups: [],
      source: "coverage"
    };
  }

  const groups = normalizeStandingsGroups(standingsPayload);

  if (groups.length === 1) {
    return {
      format: "single_table",
      impactMode: "full",
      selectedGroup: groups[0],
      groups,
      source: "standings"
    };
  }

  const homeTeamId = fixture?.teams?.home?.id;
  const awayTeamId = fixture?.teams?.away?.id;
  const sharedGroup = groups.find(
    (group) =>
      group.table.some((row) => row.teamId === homeTeamId) &&
      group.table.some((row) => row.teamId === awayTeamId)
  );

  if (sharedGroup) {
    return {
      format: "grouped_same_group",
      impactMode: "group",
      selectedGroup: sharedGroup,
      groups,
      source: "standings"
    };
  }

  return {
    format: "grouped_cross_play",
    impactMode: "limited",
    selectedGroup: null,
    groups,
    teamGroups: {
      home: findGroupsForTeam(groups, homeTeamId).map((group) => group.name),
      away: findGroupsForTeam(groups, awayTeamId).map((group) => group.name)
    },
    source: "standings"
  };
}
