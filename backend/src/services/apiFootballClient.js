import axios from "axios";
import { getFixturePhase } from "../utils/impact.js";
import { normalizeUpstreamApiError } from "../utils/errors.js";

export class ApiFootballClient {
  constructor({ baseUrl, apiKey, timeoutMs }) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.lastRequestStatus = null;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: timeoutMs,
      headers: {
        "x-apisports-key": apiKey
      }
    });
  }

  buildRequestMetadata({ ok, endpoint, statusCode = null, errorCode = null, errorMessage = "" }) {
    return {
      ok,
      endpoint,
      statusCode,
      errorCode,
      errorMessage,
      timestamp: new Date().toISOString()
    };
  }

  async request(path, params = {}) {
    this.assertConfigured();

    try {
      const response = await this.client.get(path, {
        params
      });

      this.lastRequestStatus = this.buildRequestMetadata({
        ok: true,
        endpoint: path,
        statusCode: response.status
      });

      return response;
    } catch (error) {
      const statusCode = error.response?.status ?? null;
      const errorCode = error.response?.data?.errors?.requests ?? error.code ?? null;
      const errorMessage = error.response?.data?.message ?? error.message ?? "Upstream API request failed.";

      this.lastRequestStatus = this.buildRequestMetadata({
        ok: false,
        endpoint: path,
        statusCode,
        errorCode,
        errorMessage
      });

      throw normalizeUpstreamApiError(error);
    }
  }

  getStatus() {
    return {
      configured: Boolean(this.apiKey),
      baseUrl: this.baseUrl,
      lastRequestStatus: this.lastRequestStatus
    };
  }

  assertConfigured() {
    if (!this.apiKey) {
      const error = new Error("API_FOOTBALL_KEY is missing.");
      error.statusCode = 500;
      throw error;
    }
  }

  async getFixture(fixtureId) {
    const response = await this.request("/fixtures", {
      id: fixtureId
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
    const response = await this.request("/fixtures", params);

    return response.data?.response ?? [];
  }

  async getEvents(fixtureId) {
    const response = await this.request("/fixtures/events", {
      fixture: fixtureId
    });

    return response.data?.response ?? [];
  }

  async getStatistics(fixtureId) {
    const response = await this.request("/fixtures/statistics", {
      fixture: fixtureId
    });

    return response.data?.response ?? [];
  }

  async getLineups(fixtureId) {
    const response = await this.request("/fixtures/lineups", {
      fixture: fixtureId
    });

    return response.data?.response ?? [];
  }

  async getInjuries(fixtureId) {
    const response = await this.request("/injuries", {
      fixture: fixtureId
    });

    return response.data?.response ?? [];
  }

  async getStandings(leagueId, season) {
    const response = await this.request("/standings", {
      league: leagueId,
      season
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
