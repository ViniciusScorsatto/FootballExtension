import axios from "axios";
import { getFixturePhase } from "../utils/impact.js";

export class ApiFootballClient {
  constructor({ baseUrl, apiKey, timeoutMs }) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: timeoutMs,
      headers: {
        "x-apisports-key": apiKey
      }
    });
  }

  assertConfigured() {
    if (!this.apiKey) {
      const error = new Error("API_FOOTBALL_KEY is missing.");
      error.statusCode = 500;
      throw error;
    }
  }

  async getFixture(fixtureId) {
    this.assertConfigured();

    const response = await this.client.get("/fixtures", {
      params: {
        id: fixtureId
      }
    });

    const fixture = response.data?.response?.[0];

    if (!fixture) {
      const error = new Error(`Fixture ${fixtureId} was not found.`);
      error.statusCode = 404;
      throw error;
    }

    return fixture;
  }

  async getFixtures(params = {}) {
    this.assertConfigured();

    const response = await this.client.get("/fixtures", {
      params
    });

    return response.data?.response ?? [];
  }

  async getEvents(fixtureId) {
    const response = await this.client.get("/fixtures/events", {
      params: {
        fixture: fixtureId
      }
    });

    return response.data?.response ?? [];
  }

  async getStatistics(fixtureId) {
    const response = await this.client.get("/fixtures/statistics", {
      params: {
        fixture: fixtureId
      }
    });

    return response.data?.response ?? [];
  }

  async getLineups(fixtureId) {
    const response = await this.client.get("/fixtures/lineups", {
      params: {
        fixture: fixtureId
      }
    });

    return response.data?.response ?? [];
  }

  async getInjuries(fixtureId) {
    const response = await this.client.get("/injuries", {
      params: {
        fixture: fixtureId
      }
    });

    return response.data?.response ?? [];
  }

  async getStandings(leagueId, season) {
    const response = await this.client.get("/standings", {
      params: {
        league: leagueId,
        season
      }
    });

    return response.data;
  }

  async getLiveFixtures() {
    return this.getFixtures({
      live: "all"
    });
  }

  async getFixturesByDate(date) {
    return this.getFixtures({
      date
    });
  }

  async fetchFixtureBundle(fixtureId) {
    const fixture = await this.getFixture(fixtureId);
    const phase = getFixturePhase(fixture);
    const leagueId = fixture?.league?.id;
    const season = fixture?.league?.season;
    const hasStandings = fixture?.league?.standings === true;

    const shouldFetchStatistics = phase !== "upcoming";
    const [events, standings, statistics, lineups, injuries] = await Promise.all([
      phase === "upcoming" ? Promise.resolve([]) : this.getEvents(fixtureId),
      hasStandings ? this.getStandings(leagueId, season) : Promise.resolve(null),
      shouldFetchStatistics ? this.getStatistics(fixtureId).catch(() => []) : Promise.resolve([]),
      this.getLineups(fixtureId).catch(() => []),
      this.getInjuries(fixtureId).catch(() => [])
    ]);

    return {
      fixture,
      events,
      standings,
      statistics,
      lineups,
      injuries
    };
  }
}
