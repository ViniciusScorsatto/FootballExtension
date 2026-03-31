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

function buildRegistryInfo(override, fixture) {
  if (!override) {
    return null;
  }

  return {
    leagueId: override.leagueId ?? fixture?.league?.id ?? null,
    leagueName: override.leagueName ?? fixture?.league?.name ?? "",
    routing: override.routing ?? "dynamic"
  };
}

function findGroupsForTeam(groups, teamId) {
  if (!teamId) {
    return [];
  }

  return groups.filter((group) => group.table.some((row) => row.teamId === teamId));
}

function findTeamPosition(groups, teamId) {
  for (const group of groups) {
    const row = group.table.find((entry) => entry.teamId === teamId);

    if (row) {
      return {
        group: group.name,
        position: row.liveRank || row.rank,
        teamId: row.teamId,
        teamName: row.name
      };
    }
  }

  return null;
}

export function classifyCompetitionFormat({ fixture, standingsPayload }) {
  const override = findCompetitionOverride(fixture);
  const registry = buildRegistryInfo(override, fixture);
  const forcedOverride =
    override?.format && override?.impactMode ? override : null;

  if (fixture?.league?.standings !== true || !standingsPayload) {
    return {
      format: "no_standings",
      impactMode: "score-only",
      selectedGroup: null,
      groups: [],
      source: "coverage",
      registry
    };
  }

  const groups = normalizeStandingsGroups(standingsPayload);
  const homeTeamId = fixture?.teams?.home?.id;
  const awayTeamId = fixture?.teams?.away?.id;
  const homeTeamPosition = findTeamPosition(groups, homeTeamId);
  const awayTeamPosition = findTeamPosition(groups, awayTeamId);
  const sharedGroup = groups.find(
    (group) =>
      group.table.some((row) => row.teamId === homeTeamId) &&
      group.table.some((row) => row.teamId === awayTeamId)
  );

  if (forcedOverride) {
    return {
      format: forcedOverride.format,
      impactMode: forcedOverride.impactMode,
      selectedGroup: sharedGroup ?? null,
      groups,
      teamPositions: {
        home: homeTeamPosition,
        away: awayTeamPosition
      },
      teamGroups: {
        home: findGroupsForTeam(groups, homeTeamId).map((group) => group.name),
        away: findGroupsForTeam(groups, awayTeamId).map((group) => group.name)
      },
      source: "override",
      registry
    };
  }

  if (groups.length === 1) {
    return {
      format: "single_table",
      impactMode: "full",
      selectedGroup: groups[0],
      groups,
      teamPositions: {
        home: homeTeamPosition,
        away: awayTeamPosition
      },
      source: "standings",
      registry
    };
  }

  if (sharedGroup) {
    return {
      format: "grouped_same_group",
      impactMode: "group",
      selectedGroup: sharedGroup,
      groups,
      teamPositions: {
        home: homeTeamPosition,
        away: awayTeamPosition
      },
      source: "standings",
      registry
    };
  }

  return {
    format: "grouped_cross_play",
    impactMode: "limited",
    selectedGroup: null,
    groups,
    teamPositions: {
      home: homeTeamPosition,
      away: awayTeamPosition
    },
    teamGroups: {
      home: findGroupsForTeam(groups, homeTeamId).map((group) => group.name),
      away: findGroupsForTeam(groups, awayTeamId).map((group) => group.name)
    },
    source: "standings",
    registry
  };
}
