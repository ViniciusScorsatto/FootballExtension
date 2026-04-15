export class AnalyticsService {
  constructor({ cacheService }) {
    this.cacheService = cacheService;
  }

  async trackFixtureUsage({ fixtureId, leagueId, leagueName }) {
    await this.cacheService.incrementScore("analytics:fixture_usage", String(fixtureId), 1);

    if (leagueId) {
      const leagueMember = leagueName ? `${leagueId}:${leagueName}` : String(leagueId);
      await this.cacheService.incrementScore("analytics:league_usage", leagueMember, 1);
    }
  }

  async trackSession({ fixtureId, durationMs, leagueId, leagueName }) {
    if (fixtureId) {
      await this.cacheService.incrementScore(
        "analytics:session_duration_ms",
        String(fixtureId),
        durationMs
      );
      await this.cacheService.incrementScore("analytics:session_count", String(fixtureId), 1);
    }

    if (leagueId) {
      const leagueMember = leagueName ? `${leagueId}:${leagueName}` : String(leagueId);
      await this.cacheService.incrementScore("analytics:league_session_count", leagueMember, 1);
    }
  }

  async getSummary() {
    const [topFixtures, topLeagues, sessionDurations, sessionCounts] = await Promise.all([
      this.cacheService.getTopScores("analytics:fixture_usage", 10),
      this.cacheService.getTopScores("analytics:league_usage", 10),
      this.cacheService.getTopScores("analytics:session_duration_ms", 10),
      this.cacheService.getTopScores("analytics:session_count", 10)
    ]);

    const averageSessionDurationMs = sessionDurations.map((entry) => {
      const count =
        sessionCounts.find((sessionCount) => sessionCount.member === entry.member)?.score ?? 1;

      return {
        fixtureId: Number(entry.member),
        averageDurationMs: Math.round(entry.score / count)
      };
    });

    return {
      topFixtures,
      topLeagues,
      averageSessionDurationMs
    };
  }
}
