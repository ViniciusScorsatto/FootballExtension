(function initLiveMatchImpactI18n(globalScope) {
  const dictionaries = {
    en: {
      language: {
        label: "Language",
        english: "English",
        portugueseBrazil: "Portuguese (Brazil)"
      },
      popup: {
        eyebrow: "Foot Analysis",
        subhead: "Live Match Impact",
        title: "Track what a goal changes",
        description:
          "Pick a supported league and the overlay will explain the live match impact in seconds.",
        backendUrl: "Backend URL",
        refreshMatches: "Refresh Match List",
        leagueFocus: "League Focus",
        allSupportedLeagues: "All supported leagues",
        liveMatches: "Live Matches",
        upcomingMatches: "Upcoming Matches",
        manualFixtureId: "Manual Fixture ID",
        manualFixturePlaceholder: "Optional fallback",
        startTracking: "Start Tracking",
        stopTracking: "Stop Tracking",
        livePlaceholder: "Choose a live match",
        liveEmpty: "No live matches found",
        liveLoadError: "Could not load live matches",
        upcomingPlaceholder: "Choose an upcoming match",
        upcomingEmpty: "No upcoming matches found",
        upcomingLoadError: "Could not load upcoming matches",
        featuredLeaguePrefix: "Featured",
        noMatchesRightNow: "No matches right now",
        scoreOnlySuffix: "Live score only - no table impact",
        statusEnterBackend: "Enter a valid backend URL.",
        statusLoadingMatches: "Loading matches...",
        statusMatchesUpdated: "Match lists updated.",
        statusMatchesFailed: "Could not load matches from the backend.",
        statusTrackingActive: "Tracking is active on this browser.",
        statusPickMatch: "Pick a match to start.",
        statusChooseFixture: "Choose a live or upcoming match, or enter a fixture ID.",
        statusTrackingStarted: "Tracking started.",
        statusTrackingStopped: "Tracking stopped.",
        statusSettingsFailed: "Could not load saved settings."
      },
      panel: {
        eyebrow: "Live Impact",
        waitingImpact: "Waiting for live impact",
        waitingMatch: "Waiting for a tracked match",
        goalImpact: "Goal Impact",
        collapse: "Collapse",
        close: "Close",
        offline: "Offline",
        limited: "Limited",
        config: "Config",
        matchTracker: "Match Tracker",
        tableImpact: "Table Impact",
        competitionImpact: "Competition Impact",
        momentum: "Momentum",
        preMatch: "Pre-Match",
        otherMatches: "Other Matches This Round",
        connecting: "Connecting...",
        live: "Live",
        preMatchStatus: "Pre-match",
        finished: "Match finished",
        finishedShort: "FT",
        updatedAt: "Updated {time}",
        noCompetitionSwing: "No major competition swing yet.",
        momentumFallback: "Momentum is currently based on score and table movement.",
        scoreOnlyHome: "{team} live score tracked",
        scoreOnlyAway: "Table impact unavailable for this competition",
        eventAssist: "assist {name}",
        eventChangesTable: "{team} changes the table",
        liveFeedDelayed: "Live feed temporarily delayed",
        liveDataLimited: "Live data temporarily limited",
        footballApiSlowRetrying: "Football API slow. Retrying...",
        upstreamLimitRetrying: "Upstream limit reached. Retrying...",
        providerAuthIssue: "Provider auth issue",
        backendConnectionFailed: "Backend connection failed",
        footballApiSlowExplanation: "The upstream football API is responding slowly.",
        footballApiQuotaExplanation: "The football data provider hit its request cap.",
        footballApiQuotaDetail:
          "The backend is healthy, but the upstream football API quota is temporarily exhausted.",
        footballApiDelayedDetail:
          "Using a live retry loop until the upstream data provider responds again.",
        backendConfigIssue: "This is a backend configuration issue, not a match-tracking issue.",
        backendOfflineDetail: "The overlay could not fetch match data yet.",
        backendCredentialsFailed: "Backend provider credentials failed",
        providerRejectedCredentials: "Football data provider rejected credentials",
        backendOnlineCheck: "Check that the backend is online",
        backendApiKeyCheck: "Check the backend API_FOOTBALL_KEY configuration.",
        retrySoon: "We will retry automatically.{suffix}",
        retryAfter: " Retry in ~{seconds}s.",
        trackingResume: "Tracking will resume automatically.{suffix}"
      },
      stats: {
        possession: "Possession",
        shotsOnTarget: "Shots on target",
        totalShots: "Total shots",
        corners: "Corners"
      },
      impact: {
        noMovement: "No live table movement yet",
        movesTo: "{team} moves to {position} ({movement})",
        dropsTo: "{team} drops to {position} ({movement})",
        stays: "{team} stays {position}",
        goesTop: "{team} goes top of the table",
        entersTitleRace: "{team} enters the title race",
        losesTitleRace: "{team} loses ground in the title race",
        breaksTop: "{team} breaks into the top {cutoff}",
        dropsOutTop: "{team} drops out of the top {cutoff}",
        climbsOutRelegation: "{team} climbs out of the relegation zone",
        fallsIntoRelegation: "{team} falls into the relegation zone",
        goal: "Goal",
        penaltyGoal: "Penalty goal",
        ownGoal: "Own goal",
        missedPenalty: "Missed penalty"
      },
      prematch: {
        lineupsExpected: "Lineups expected closer to kickoff",
        lineupsSummary: "{home} {homeFormation} vs {away} {awayFormation}",
        noInjuries: "No injury reports surfaced for this fixture",
        injuriesCount: "{homeShort} injuries: {homeCount} · {awayShort} injuries: {awayCount}",
        formation: "Formation {value}",
        formationTbc: "Formation TBC",
        coachTbd: "Coach TBD",
        xiNotReleased: "XI not released",
        startingXiUnavailable: "Starting XIs are not available yet.",
        injuriesTitle: "{team} injuries",
        noneReported: "None reported"
      },
      ordinal: {
        suffixes: ["th", "st", "nd", "rd"]
      }
    },
    "pt-BR": {
      language: {
        label: "Idioma",
        english: "English",
        portugueseBrazil: "Português (Brasil)"
      },
      popup: {
        eyebrow: "Foot Analysis",
        subhead: "Live Match Impact",
        title: "Acompanhe o que um gol muda",
        description:
          "Escolha uma liga suportada e a sobreposição explica o impacto ao vivo em segundos.",
        backendUrl: "URL do backend",
        refreshMatches: "Atualizar lista de jogos",
        leagueFocus: "Foco de ligas",
        allSupportedLeagues: "Todas as ligas suportadas",
        liveMatches: "Jogos ao vivo",
        upcomingMatches: "Próximos jogos",
        manualFixtureId: "Fixture ID manual",
        manualFixturePlaceholder: "Fallback opcional",
        startTracking: "Começar a acompanhar",
        stopTracking: "Parar acompanhamento",
        livePlaceholder: "Escolha um jogo ao vivo",
        liveEmpty: "Nenhum jogo ao vivo encontrado",
        liveLoadError: "Não foi possível carregar jogos ao vivo",
        upcomingPlaceholder: "Escolha um próximo jogo",
        upcomingEmpty: "Nenhum próximo jogo encontrado",
        upcomingLoadError: "Não foi possível carregar próximos jogos",
        featuredLeaguePrefix: "Destaque",
        noMatchesRightNow: "Sem jogos agora",
        scoreOnlySuffix: "Somente placar ao vivo - sem impacto na tabela",
        statusEnterBackend: "Informe uma URL de backend válida.",
        statusLoadingMatches: "Carregando jogos...",
        statusMatchesUpdated: "Lista de jogos atualizada.",
        statusMatchesFailed: "Não foi possível carregar os jogos do backend.",
        statusTrackingActive: "O acompanhamento está ativo neste navegador.",
        statusPickMatch: "Escolha um jogo para começar.",
        statusChooseFixture:
          "Escolha um jogo ao vivo ou futuro, ou informe um fixture ID.",
        statusTrackingStarted: "Acompanhamento iniciado.",
        statusTrackingStopped: "Acompanhamento parado.",
        statusSettingsFailed: "Não foi possível carregar as configurações salvas."
      },
      panel: {
        eyebrow: "Impacto ao vivo",
        waitingImpact: "Aguardando impacto ao vivo",
        waitingMatch: "Aguardando um jogo acompanhado",
        goalImpact: "Impacto do gol",
        collapse: "Recolher",
        close: "Fechar",
        offline: "Offline",
        limited: "Limitado",
        config: "Config",
        matchTracker: "Monitor de jogo",
        tableImpact: "Impacto na tabela",
        competitionImpact: "Impacto na competição",
        momentum: "Momento",
        preMatch: "Pré-jogo",
        otherMatches: "Outros jogos da rodada",
        connecting: "Conectando...",
        live: "Ao vivo",
        preMatchStatus: "Pré-jogo",
        finished: "Jogo encerrado",
        finishedShort: "Final",
        updatedAt: "Atualizado {time}",
        noCompetitionSwing: "Ainda não houve grande mudança na competição.",
        momentumFallback: "O momento está sendo calculado com placar e movimento na tabela.",
        scoreOnlyHome: "{team} com placar ao vivo acompanhado",
        scoreOnlyAway: "Impacto na tabela indisponível para esta competição",
        eventAssist: "assistência {name}",
        eventChangesTable: "{team} muda a tabela",
        liveFeedDelayed: "Feed ao vivo temporariamente atrasado",
        liveDataLimited: "Dados ao vivo temporariamente limitados",
        footballApiSlowRetrying: "API de futebol lenta. Tentando novamente...",
        upstreamLimitRetrying: "Limite do provedor atingido. Tentando novamente...",
        providerAuthIssue: "Problema de autenticação do provedor",
        backendConnectionFailed: "Falha na conexão com o backend",
        footballApiSlowExplanation: "A API de futebol está respondendo lentamente.",
        footballApiQuotaExplanation: "O provedor de dados atingiu o limite de requisições.",
        footballApiQuotaDetail:
          "O backend está saudável, mas a cota da API de futebol foi temporariamente esgotada.",
        footballApiDelayedDetail:
          "Usando um ciclo de nova tentativa até o provedor de dados responder novamente.",
        backendConfigIssue: "Isto é um problema de configuração do backend, não do acompanhamento.",
        backendOfflineDetail: "A sobreposição ainda não conseguiu buscar os dados da partida.",
        backendCredentialsFailed: "As credenciais do provedor falharam no backend",
        providerRejectedCredentials: "O provedor de dados rejeitou as credenciais",
        backendOnlineCheck: "Verifique se o backend está online",
        backendApiKeyCheck: "Verifique a configuração de API_FOOTBALL_KEY no backend.",
        retrySoon: "Vamos tentar novamente automaticamente.{suffix}",
        retryAfter: " Tentar de novo em ~{seconds}s.",
        trackingResume: "O acompanhamento voltará automaticamente.{suffix}"
      },
      stats: {
        possession: "Posse",
        shotsOnTarget: "Chutes no alvo",
        totalShots: "Finalizações",
        corners: "Escanteios"
      },
      impact: {
        noMovement: "Ainda sem mudança importante na tabela",
        movesTo: "{team} sobe para {position} ({movement})",
        dropsTo: "{team} cai para {position} ({movement})",
        stays: "{team} segue em {position}",
        goesTop: "{team} assume a liderança",
        entersTitleRace: "{team} entra na briga pelo título",
        losesTitleRace: "{team} perde força na briga pelo título",
        breaksTop: "{team} entra no top {cutoff}",
        dropsOutTop: "{team} sai do top {cutoff}",
        climbsOutRelegation: "{team} sai da zona de rebaixamento",
        fallsIntoRelegation: "{team} entra na zona de rebaixamento",
        goal: "Gol",
        penaltyGoal: "Gol de pênalti",
        ownGoal: "Gol contra",
        missedPenalty: "Pênalti perdido"
      },
      prematch: {
        lineupsExpected: "Escalações esperadas mais perto do início",
        lineupsSummary: "{home} {homeFormation} x {away} {awayFormation}",
        noInjuries: "Nenhum reporte de lesão apareceu para este jogo",
        injuriesCount: "Lesões {homeShort}: {homeCount} · {awayShort}: {awayCount}",
        formation: "Formação {value}",
        formationTbc: "Formação a confirmar",
        coachTbd: "Técnico a confirmar",
        xiNotReleased: "Time titular ainda não divulgado",
        startingXiUnavailable: "Os times titulares ainda não estão disponíveis.",
        injuriesTitle: "Lesões de {team}",
        noneReported: "Nenhuma reportada"
      }
    }
  };

  function normalizeLanguage(language) {
    if (!language) {
      return "en";
    }

    const normalizedLanguage = String(language).trim().toLowerCase();

    if (normalizedLanguage === "pt-br" || normalizedLanguage === "pt_br" || normalizedLanguage === "pt") {
      return "pt-BR";
    }

    return "en";
  }

  function detectBrowserLanguage() {
    const browserLanguage =
      globalScope.navigator?.languages?.[0] ??
      globalScope.navigator?.language ??
      "en";

    return normalizeLanguage(browserLanguage);
  }

  function getValueByPath(object, path) {
    return path.split(".").reduce((value, segment) => value?.[segment], object);
  }

  function interpolate(template, values = {}) {
    return String(template).replace(/\{(\w+)\}/g, (_match, token) =>
      values[token] === undefined || values[token] === null ? "" : String(values[token])
    );
  }

  function t(language, key, values = {}) {
    const normalizedLanguage = normalizeLanguage(language);
    const languageValue =
      getValueByPath(dictionaries[normalizedLanguage], key) ?? getValueByPath(dictionaries.en, key);

    if (languageValue === undefined) {
      return key;
    }

    if (typeof languageValue !== "string") {
      return languageValue;
    }

    return interpolate(languageValue, values);
  }

  function formatOrdinal(language, value) {
    const rank = Number(value ?? 0);

    if (!Number.isFinite(rank) || rank <= 0) {
      return "--";
    }

    if (normalizeLanguage(language) === "pt-BR") {
      return `${rank}º`;
    }

    const mod100 = rank % 100;

    if (mod100 >= 11 && mod100 <= 13) {
      return `${rank}th`;
    }

    switch (rank % 10) {
      case 1:
        return `${rank}st`;
      case 2:
        return `${rank}nd`;
      case 3:
        return `${rank}rd`;
      default:
        return `${rank}th`;
    }
  }

  function formatMovement(value) {
    return Number(value) > 0 ? `+${value}` : String(value ?? 0);
  }

  function translateGoalType(language, typeLabel) {
    switch (typeLabel) {
      case "Goal":
        return t(language, "impact.goal");
      case "Penalty goal":
        return t(language, "impact.penaltyGoal");
      case "Own goal":
        return t(language, "impact.ownGoal");
      case "Missed penalty":
        return t(language, "impact.missedPenalty");
      default:
        return typeLabel || t(language, "impact.goal");
    }
  }

  function translateCompetitionMessage(language, message) {
    const patterns = [
      [/^(.+) goes top of the table$/, "impact.goesTop", ["team"]],
      [/^(.+) enters the title race$/, "impact.entersTitleRace", ["team"]],
      [/^(.+) loses ground in the title race$/, "impact.losesTitleRace", ["team"]],
      [/^(.+) breaks into the top (\d+)$/, "impact.breaksTop", ["team", "cutoff"]],
      [/^(.+) drops out of the top (\d+)$/, "impact.dropsOutTop", ["team", "cutoff"]],
      [/^(.+) climbs out of the relegation zone$/, "impact.climbsOutRelegation", ["team"]],
      [/^(.+) falls into the relegation zone$/, "impact.fallsIntoRelegation", ["team"]]
    ];

    for (const [pattern, key, fields] of patterns) {
      const match = String(message).match(pattern);

      if (!match) {
        continue;
      }

      const values = {};
      fields.forEach((field, index) => {
        values[field] = match[index + 1];
      });

      return t(language, key, values);
    }

    return message;
  }

  function buildImpactSummary(language, impact, teams) {
    if (!impact?.table?.home || !impact?.table?.away) {
      return t(language, "impact.noMovement");
    }

    const movementEntry =
      impact.table.home.movement > 0
        ? impact.table.home
        : impact.table.away.movement > 0
          ? impact.table.away
          : impact.biggestMovement || impact.table.home;

    if (!movementEntry) {
      return t(language, "impact.noMovement");
    }

    if (movementEntry.movement > 0) {
      return t(language, "impact.movesTo", {
        team: movementEntry.teamName,
        position: formatOrdinal(language, movementEntry.newPosition),
        movement: formatMovement(movementEntry.movement)
      });
    }

    if (movementEntry.movement < 0) {
      return t(language, "impact.dropsTo", {
        team: movementEntry.teamName,
        position: formatOrdinal(language, movementEntry.newPosition),
        movement: formatMovement(movementEntry.movement)
      });
    }

    const fallbackTeam = teams?.home?.name ?? movementEntry.teamName;

    return t(language, "impact.stays", {
      team: fallbackTeam,
      position: formatOrdinal(language, movementEntry.newPosition)
    });
  }

  globalScope.LMI_I18N = {
    dictionaries,
    normalizeLanguage,
    detectBrowserLanguage,
    t,
    formatOrdinal,
    formatMovement,
    translateGoalType,
    translateCompetitionMessage,
    buildImpactSummary
  };
})(globalThis);
