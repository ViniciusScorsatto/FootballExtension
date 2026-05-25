import { createFootballSdk } from "../../../packages/sdk-football/src/index.js";

const params = new URLSearchParams(window.location.search);
const backendUrl = params.get("backend") || "/api";
const pollMs = Math.max(Number(params.get("poll") || 10000), 5000);
const demoMode = params.get("demo") === "1";
const sdk = createFootballSdk({
  baseUrl: backendUrl,
  userId: "obs-brasileirao",
  plan: "pro"
});

const demoSnapshot = {
  competition: {
    name: "Brasileirão Série A",
    season: 2026,
    round: "Rodada 12"
  },
  status: {
    liveMatches: 5,
    lastUpdated: new Date().toISOString()
  },
  matches: [
    { teams: { home: { name: "Palmeiras", shortName: "PAL" }, away: { name: "Santos", shortName: "SAN" } }, score: { home: 1, away: 0 }, status: { minute: 82 } },
    { teams: { home: { name: "Botafogo", shortName: "BOT" }, away: { name: "Grêmio", shortName: "GRE" } }, score: { home: 2, away: 1 }, status: { minute: 81 } },
    { teams: { home: { name: "Flamengo", shortName: "FLA" }, away: { name: "Atlético-MG", shortName: "CAM" } }, score: { home: 0, away: 0 }, status: { minute: 82 } },
    { teams: { home: { name: "São Paulo", shortName: "SAO" }, away: { name: "Internacional", shortName: "INT" } }, score: { home: 1, away: 1 }, status: { minute: 82 } },
    { teams: { home: { name: "Vasco", shortName: "VAS" }, away: { name: "Fortaleza", shortName: "FOR" } }, score: { home: 0, away: 2 }, status: { minute: 80 } }
  ],
  standings: [
    { name: "Palmeiras", shortName: "PALMEIRAS", rank: 1, points: 68, played: 32, goalsDiff: 29, movement: 1, zone: "leader" },
    { name: "Botafogo", shortName: "BOTAFOGO", rank: 2, points: 65, played: 32, goalsDiff: 24, movement: -1, zone: "libertadores" },
    { name: "Flamengo", shortName: "FLAMENGO", rank: 3, points: 64, played: 32, goalsDiff: 20, movement: 0, zone: "libertadores" },
    { name: "São Paulo", shortName: "SÃO PAULO", rank: 4, points: 56, played: 32, goalsDiff: 9, movement: 1, zone: "libertadores" },
    { name: "Atlético-MG", shortName: "ATLÉTICO-MG", rank: 5, points: 53, played: 32, goalsDiff: 10, movement: -1, zone: "neutral" },
    { name: "Internacional", shortName: "INTERNACIONAL", rank: 6, points: 52, played: 32, goalsDiff: 7, movement: 0, zone: "neutral" },
    { name: "Grêmio", shortName: "GRÊMIO", rank: 7, points: 47, played: 32, goalsDiff: 2, movement: 0, zone: "neutral" },
    { name: "Athletico-PR", shortName: "ATHLETICO-PR", rank: 8, points: 46, played: 32, goalsDiff: -1, movement: 0, zone: "neutral" },
    { name: "Cruzeiro", shortName: "CRUZEIRO", rank: 9, points: 45, played: 32, goalsDiff: 3, movement: 0, zone: "neutral" },
    { name: "Vasco", shortName: "VASCO", rank: 17, points: 34, played: 32, goalsDiff: -12, movement: -2, zone: "relegation" }
  ],
  events: [
    { type: "impact", title: "Palmeiras assume a liderança", line1: "Botafogo cai para 2º lugar" },
    { type: "impact", title: "São Paulo entra no G4", line1: "Atlético-MG cai para 5º" },
    { type: "impact", title: "Vasco permanece no Z4", line1: "Resultado parcial aumenta a pressão" }
  ]
};

function normalizeForm(form) {
  return String(form || "")
    .toUpperCase()
    .replace(/[^WDLVDE]/g, "")
    .slice(-5);
}

function formResultClass(result) {
  if (result === "W" || result === "V") {
    return "win";
  }

  if (result === "D" || result === "E") {
    return "draw";
  }

  return "loss";
}

function renderForm(form) {
  const normalized = normalizeForm(form);

  if (!normalized) {
    return `<span class="form-dots form-dots--empty">--</span>`;
  }

  return `
    <span class="form-dots">
      ${[...normalized]
        .map((result) => `<i class="form-dot form-dot--${formResultClass(result)}">${result}</i>`)
        .join("")}
    </span>
  `;
}

const elements = {
  competitionName: document.getElementById("competitionName"),
  roundLabel: document.getElementById("roundLabel"),
  liveStatus: document.getElementById("liveStatus"),
  matchCount: document.getElementById("matchCount"),
  matchesList: document.getElementById("matchesList"),
  standingsTable: document.getElementById("standingsTable"),
  updatedAt: document.getElementById("updatedAt"),
  primaryClock: document.getElementById("primaryClock"),
  tickerTrack: document.getElementById("tickerTrack"),
  mainHeadline: document.getElementById("mainHeadline"),
  eventSpotlight: document.getElementById("eventSpotlight"),
  eventFeed: document.getElementById("eventFeed"),
  contextPanel: document.getElementById("contextPanel")
};

function formatClock(snapshot) {
  const value = snapshot?.status?.lastUpdated;

  if (!value) {
    return "--:--";
  }

  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatStatus(match) {
  if (match.status?.phase === "finished") {
    return "Final";
  }

  if (match.status?.phase === "upcoming") {
    return "Pré";
  }

  return `${match.status?.minute || 0}'`;
}

function formatRoundLabel(round, season) {
  const cleanRound = String(round || "")
    .replace(/^Regular Season\s*-\s*/i, "Rodada ")
    .replace(/^.*-\s*/, "Rodada ");

  return cleanRound || `Temporada ${season}`;
}

function getPrimaryClock(matches = [], snapshot) {
  const liveMinutes = matches
    .map((match) => Number(match.status?.minute || 0))
    .filter((minute) => minute > 0);

  if (liveMinutes.length) {
    return `${Math.max(...liveMinutes)}'`;
  }

  return formatClock(snapshot);
}

function movementLabel(movement) {
  const value = Number(movement || 0);

  if (value > 0) {
    return "↑";
  }

  if (value < 0) {
    return "↓";
  }

  return "•";
}

function getMatchCardClass(match) {
  const phase = match.status?.phase || "unknown";

  return `match-card match-card--${phase}`;
}

function getMatchBadgeLabel(match) {
  if (match.status?.phase === "live") {
    return "Ao vivo";
  }

  return formatStatus(match);
}

function renderTeamCrest(team) {
  if (team.logo) {
    return `<img class="team-crest" src="${team.logo}" alt="${team.name}" loading="lazy" />`;
  }

  return `<span class="team-crest team-crest--fallback">${team.shortName.slice(0, 1)}</span>`;
}

function renderStandingCrest(row) {
  const label = row.shortName || row.name || "?";

  if (row.logo) {
    return `<img class="standing-row__crest" src="${row.logo}" alt="${row.name}" loading="lazy" />`;
  }

  return `<span class="standing-row__crest standing-row__crest--fallback">${label.slice(0, 1)}</span>`;
}

function renderMatches(matches = []) {
  const liveCount = matches.filter((match) => match.status?.phase === "live").length;

  elements.matchCount.textContent = liveCount
    ? `${liveCount} ao vivo`
    : matches.length
      ? `${matches.length} jogos`
    : "Sem jogos";

  if (!matches.length) {
    elements.matchesList.innerHTML = `
      <div class="empty-state">
        Nenhum jogo encontrado para a rodada.
      </div>
    `;
    return;
  }

  elements.matchesList.innerHTML = matches
    .map((match) => `
      <article class="${getMatchCardClass(match)}">
        <span class="match-card__rail"></span>
        <div class="match-card__team">
          ${renderTeamCrest(match.teams.home)}
          <strong>${match.teams.home.shortName}</strong>
        </div>
        <div class="match-card__score">
          <strong>${match.score.home}</strong>
          <span>-</span>
          <strong>${match.score.away}</strong>
        </div>
        <div class="match-card__team match-card__team--away">
          <strong>${match.teams.away.shortName}</strong>
          ${renderTeamCrest(match.teams.away)}
        </div>
        <div class="match-card__meta">
          <span>${match.teams.home.name}</span>
          <span>${match.teams.away.name}</span>
        </div>
        <div class="match-card__badge">
          <span>${getMatchBadgeLabel(match)}</span>
        </div>
      </article>
    `)
    .join("");
}

function renderStandings(rows = []) {
  if (!rows.length) {
    elements.standingsTable.innerHTML = `
      <div class="empty-state">
        Tabela indisponível
      </div>
    `;
    return;
  }

  elements.standingsTable.innerHTML = rows
    .slice(0, 20)
    .map((row) => {
      const movement = Number(row.movement || 0);
      const direction = movement > 0 ? "up" : movement < 0 ? "down" : "flat";

      return `
        <div class="standing-row standing-row--${row.zone}" data-direction="${direction}">
          <span class="standing-row__rank">${row.rank}</span>
          ${renderStandingCrest(row)}
          <span class="standing-row__team">${row.shortName || row.name}</span>
          <span class="standing-row__points">${row.points}</span>
          <span class="standing-row__played">${row.played ?? "-"}</span>
          <span class="standing-row__wins">${row.won ?? "-"}</span>
          <span class="standing-row__gd">${Number(row.goalsDiff ?? 0) > 0 ? "+" : ""}${row.goalsDiff ?? 0}</span>
          <span class="standing-row__form">${renderForm(row.form)}</span>
          <span class="standing-row__movement">${movementLabel(movement)}</span>
        </div>
      `;
    })
    .join("");
}

function renderTicker(events = []) {
  const items = events.length
    ? events
    : [{ title: "Aguardando mudanças importantes na rodada", line1: "" }];

  elements.tickerTrack.innerHTML = items
    .map((event) => `
      <span class="ticker-item">
        <strong>${event.title}</strong>
        ${event.line1 ? `<small>${event.line1}</small>` : ""}
      </span>
    `)
    .join("");
}

function renderSpotlight(events = []) {
  const [event] = events;

  if (!event) {
    elements.mainHeadline.textContent = "Rodada monitorada em tempo real";
    elements.eventSpotlight.textContent = "Sem grande mudança na tabela agora.";
    elements.eventFeed.innerHTML = `
      <article class="impact-card impact-card--quiet">
        <strong>Sem alerta crítico no momento</strong>
        <span>O painel segue monitorando liderança, G4 e Z4.</span>
      </article>
    `;
    return;
  }

  elements.mainHeadline.textContent = event.title;
  elements.eventSpotlight.textContent = event.line1 || "Mudança importante detectada na rodada.";
  elements.eventFeed.innerHTML = events
    .slice(0, 4)
    .map((item, index) => `
      <article class="impact-card ${index === 0 ? "impact-card--primary" : ""}">
        <span>${index === 0 ? "🏆" : "⚡"}</span>
        <div>
          <strong>${item.title}</strong>
          ${item.line1 ? `<small>${item.line1}</small>` : ""}
        </div>
      </article>
    `)
    .join("");
}

function renderContext(snapshot) {
  const leader = snapshot.standings?.[0];
  const relegationRows = snapshot.standings?.filter((row) => row.zone === "relegation").slice(0, 4);
  const liveMatches = snapshot.matches?.length || 0;

  elements.contextPanel.innerHTML = `
    <article>
      <span>Líder ao vivo</span>
      <strong>${leader ? `${leader.name} · ${leader.points} pts` : "Tabela indisponível"}</strong>
    </article>
    <article>
      <span>Zona de queda</span>
      <strong>${relegationRows?.length ? relegationRows.map((row) => row.shortName || row.name).join(", ") : "Sem dados"}</strong>
    </article>
    <article>
      <span>Rodada em andamento</span>
      <strong>${liveMatches ? `${liveMatches} jogo${liveMatches === 1 ? "" : "s"} ao vivo` : "Monitoramento ativo"}</strong>
    </article>
  `;
}

function renderSnapshot(snapshot) {
  elements.competitionName.textContent = snapshot.competition.name.replace("Série A", "").trim();
  elements.roundLabel.textContent = formatRoundLabel(snapshot.competition.round, snapshot.competition.season);
  elements.liveStatus.textContent =
    snapshot.status.liveMatches > 0
      ? "Ao vivo"
      : "Monitorando";
  elements.updatedAt.textContent = formatClock(snapshot);
  elements.primaryClock.textContent = getPrimaryClock(snapshot.matches, snapshot);

  renderMatches(snapshot.matches);
  renderStandings(snapshot.standings);
  renderTicker(snapshot.events);
  renderSpotlight(snapshot.events);
  renderContext(snapshot);
}

function renderError(error) {
  elements.liveStatus.textContent = "Reconectando";
  elements.primaryClock.textContent = "--:--";
  elements.mainHeadline.textContent = "Sinal de dados temporariamente indisponível";
  elements.eventSpotlight.textContent =
    error?.message || "Reconectando ao backend de inteligência.";
}

async function refresh() {
  try {
    if (demoMode) {
      renderSnapshot({
        ...demoSnapshot,
        status: {
          ...demoSnapshot.status,
          lastUpdated: new Date().toISOString()
        }
      });
      return;
    }

    const snapshot = await sdk.getBrasileiraoOverlay();
    renderSnapshot(snapshot);
  } catch (error) {
    renderError(error);
  }
}

await refresh();
window.setInterval(refresh, pollMs);
