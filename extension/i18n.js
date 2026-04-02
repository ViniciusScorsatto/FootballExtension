(function initLiveMatchImpactI18n(globalScope) {
  const dictionaries = {
    en: {
      language: {
        label: "Language",
        english: "English",
        portugueseBrazil: "Portuguese (Brazil)"
      },
      common: {
        close: "Close"
      },
      popup: {
        eyebrow: "Foot Analysis",
        subhead: "Live Match Impact",
        title: "Track what a goal changes",
        description:
          "Pick a supported league and the overlay will explain the live match impact in seconds.",
        notifications: "Notifications",
        scenarioPreviewEyebrow: "Scenario preview",
        scenarioPreviewTitle: "Test saved match states",
        scenarioModeLabel: "Use scenario preview",
        scenarioModeHint: "Load a bundled payload instead of a live backend match.",
        scenarioVariantLabel: "Scenario",
        scenarioVariantPlaceholder: "Choose a scenario",
        scenarioPreviewOff: "Live backend mode is active.",
        scenarioPreviewSelected: "Previewing {label}.",
        statusChooseScenario: "Choose a scenario to start preview mode.",
        notifyGoalsLabel: "Goal happened",
        notifyGoalsHint: "Get notified when the tracked match has a goal.",
        notifyTableChangesLabel: "Goal changed table position",
        notifyTableChangesHint: "Send a richer alert when a goal moves a team in the table.",
        billingEyebrow: "Beta Access",
        proActiveEyebrow: "Pro",
        currentPlan: "Current plan: {plan}",
        freePlan: "Free",
        proPlan: "Pro",
        billingSummaryFree:
          "Featured launch leagues only. Unlock Pro for all configured leagues and premium insights.",
        billingSummaryPro:
          "Pro is active. You can use every supported league and the manual fixture fallback.",
        restoreEyebrow: "Restore Pro",
        restoreTitle: "Use your billing email",
        restoreEmailLabel: "Billing email",
        restoreEmailPlaceholder: "you@example.com",
        restorePill: "Restore",
        restoreLinkedPill: "Linked",
        restoreLinkedNoProPill: "Email linked",
        restoreSummary: "Restore Pro on this browser.",
        restoreLinked: "This browser is linked to {email}.",
        restoreLinkedCompact: "Linked to {email}.",
        restoreLinkedNoPro:
          "This browser is linked to {email}, but no active Pro subscription was found for that email yet.",
        restoreLinkedNoProCompact: "Linked to {email}, but Pro was not found yet.",
        restoreAction: "Send Restore Link",
        proActiveTitle: "All configured leagues unlocked",
        proActiveSummary:
          "This browser is on Pro. You can track any configured league and use manual fixture tracking.",
        earlyBirdOffer:
          "Early Bird Pro is live: {price}/month forever for the first {remaining} users.",
        earlyBirdClosed: "Early Bird Pro is now closed.",
        checkoutPending: "Finish checkout and reopen the extension to unlock Pro automatically.",
        proUnlockedTitle: "Pro unlocked",
        proUnlockedBody:
          "Your payment was confirmed. All configured leagues and manual fixture tracking are now active.",
        linkedNoProBody:
          "This browser is linked to the billing email, but we still did not find an active Pro subscription for it.",
        upgradeToPro: "Unlock Pro",
        managePlan: "Refresh Plan",
        refreshPlan: "Refresh status",
        upgradeInProgress: "Opening Stripe Checkout...",
        statusPlanUpdated: "Plan status refreshed.",
        statusPlanLoadFailed: "Could not load billing status.",
        statusUpgradeFailed: "Could not start Stripe checkout.",
        statusRestoreEmailInvalid: "Enter the billing email for your Pro account.",
        statusRestoreSent: "Restore link sent.",
        statusRestorePreviewOpened:
          "Restore link opened in a new tab. Finish the link there, then refresh your plan.",
        statusRestoreLinked:
          "This browser is linked. We are checking whether a Pro entitlement should be restored.",
        statusRestoreFailed: "Could not create a restore link.",
        statusCheckoutPending: "Checkout opened. We will refresh your plan when you return.",
        statusProUnlocked: "Pro unlocked successfully.",
        statusProActive: "Pro is active on this browser.",
        backendUrl: "Backend URL",
        refreshMatches: "Refresh matches",
        leagueFocus: "League Focus",
        allSupportedLeagues: "All configured leagues",
        liveMatches: "Live Matches",
        upcomingMatches: "Upcoming Matches",
        advancedOptions: "Advanced options",
        manualFixtureTitle: "Manual fixture fallback",
        manualFixtureSummary: "Use a fixture ID only when the match does not show up in the lists.",
        manualFixtureId: "Manual Fixture ID",
        manualFixturePlaceholder: "Optional fallback",
        manualFixtureEnabled: "Manual fixture fallback is available on Pro.",
        manualFixtureLocked: "Manual fixture fallback is part of Pro.",
        startTracking: "Track this match",
        stopTracking: "Stop tracking",
        openSidePanel: "Open side panel",
        livePlaceholder: "Choose a live match",
        liveEmpty: "No live matches found",
        liveLoadError: "Could not load live matches",
        upcomingPlaceholder: "Choose an upcoming match",
        upcomingEmpty: "No upcoming matches found",
        upcomingLoadError: "Could not load upcoming matches",
        featuredLeaguePrefix: "Featured",
        noMatchesRightNow: "No matches right now",
        noMatchesInCurrentWindow: "No live or next 12h matches",
        scoreOnlySuffix: "Live score only - no table impact",
        featuredLeaguesOnly: "Free plan: featured leagues only",
        proUnlocksAllLeagues: "Pro unlocks all configured leagues and manual fixture tracking.",
        statusUpgradeRequiredLeague:
          "This league is part of Pro. Choose a featured league or upgrade.",
        statusUpgradeRequiredManual:
          "Manual fixture tracking is part of Pro during beta.",
        statusEnterBackend: "Enter a valid backend URL.",
        statusLoadingMatches: "Loading matches...",
        statusMatchesUpdated: "Match lists updated.",
        statusMatchesFailed: "Could not load matches from the backend.",
        statusTrackingActive: "Tracking is active on this browser.",
        statusPickMatch: "Pick a match to start.",
        statusChooseFixture: "Choose a live or upcoming match, or enter a fixture ID.",
        statusTrackingStarted: "Tracking started.",
        statusTrackingStopped: "Tracking stopped.",
        statusSidePanelOpened: "Side panel opened.",
        statusSidePanelFailed: "Could not open the side panel in this browser window.",
        statusSettingsFailed: "Could not load saved settings.",
        statusNotificationsUpdated: "Notification settings saved."
      },
      notifications: {
        goalTitle: "Goal: {scoreline}",
        tableImpactTitle: "Goal impact: {scoreline}",
        goalHappened: "A goal changed the match.",
        goalChangedTable: "A goal changed the live table."
      },
      sidepanel: {
        documentTitle: "Live Match Impact Side Panel",
        eyebrow: "Side Panel",
        emptyTitle: "Open a tracked match here",
        emptyBody:
          "Start tracking a fixture from the popup and this side panel will follow the same live match automatically.",
        refresh: "Refresh",
        refreshing: "Refreshing live match impact...",
        stopTracking: "Stop tracking",
        notTracking: "No tracked match yet",
        trackMatch: "Track Match",
        matchApplied: "Tracked fixture updated in the side panel.",
        formatContext: "Format Context",
        groupedSameGroupContext:
          "This competition uses groups. Live movement is being evaluated inside {group}.",
        groupedCrossPlayContext:
          "This is a cross-group fixture. We project each team inside its own group instead of claiming one shared table move.",
        cupSingleLegContext:
          "This is a single-leg knockout tie. Winner advances from this match.",
        cupTwoLegContext:
          "This is a two-leg knockout tie. Aggregate score decides who goes through.",
        cupFirstLegContext:
          "This is the first leg of a two-leg tie. The return leg will decide the aggregate outcome.",
        limitedFormatContext:
          "This competition uses a special format, so we keep the insight focused on score and group context instead of risky qualification claims.",
        scoreOnlyFormatContext:
          "This fixture does not have reliable standings coverage, so this view stays focused on live score context."
      },
      panel: {
        eyebrow: "Live Impact",
        waitingImpact: "Waiting for live impact",
        waitingMatch: "Waiting for a tracked match",
        goalImpact: "Goal Impact",
        collapse: "Collapse",
        close: "Close",
        scrollControls: "Scroll controls",
        scrollTop: "Jump to top",
        scrollBottom: "Jump to bottom",
        offline: "Offline",
        limited: "Limited",
        config: "Config",
        matchTracker: "Match Tracker",
        tableImpact: "Table Impact",
        tieImpact: "Tie Impact",
        competitionImpact: "Competition Impact",
        groupPositions: "Group Positions",
        limitedCompetition: "Why impact is limited",
        momentum: "Momentum",
        matchStats: "Match Stats",
        preMatch: "Pre-Match",
        otherMatches: "Other Matches This Round",
        connecting: "Connecting...",
        live: "Live",
        preMatchStatus: "Pre-match",
        finished: "Match finished",
        finishedShort: "FT",
        updatedAt: "Updated {time}",
        noCompetitionSwing: "No major competition swing yet.",
        preMatchTableHome: "{team} is being tracked before kickoff",
        preMatchTableAway: "Live table impact starts when the match kicks off",
        preMatchCompetitionDetail: "Live table impact will start once the match kicks off.",
        momentumFallback: "Momentum is currently based on score and table movement.",
        scoreOnlyHome: "{team} live score tracked",
        scoreOnlyAway: "Table impact unavailable for this competition",
        limitedHome: "Cross-group fixture or special format",
        limitedAway: "Reliable live position movement is unavailable here",
        groupPosition: "{team} is {position} in {group}",
        projectedGroupPosition: "{team} is {currentPosition} in {group} · live {projectedPosition} if scores hold",
        limitedCompetitionDetail:
          "We track the score, but this competition format makes live classification claims unreliable for this fixture.",
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
        automaticPromotion: "{team} moves into the automatic promotion spots",
        playoffSpots: "{team} moves into the playoff spots",
        climbsPlayoffSpots: "{team} climbs into the playoff spots",
        dropsPlayoffSpots: "{team} drops into the playoff spots",
        dropsOutPlayoffSpots: "{team} drops out of the playoff spots",
        roundOf16Spots: "{team} moves into the round of 16 spots",
        knockoutPlayoffSpots: "{team} moves into the knockout play-off spots",
        climbsKnockoutPlayoffSpots: "{team} climbs into the knockout play-off spots",
        dropsKnockoutPlayoffSpots: "{team} drops into the knockout play-off spots",
        dropsOutKnockoutPlayoffSpots: "{team} drops out of the knockout play-off spots",
        eliminationZone: "{team} falls into the elimination zone",
        qualificationSpots: "{team} moves into the qualification spots",
        dropsQualificationSpots: "{team} drops out of the qualification spots",
        promotionGroupSpots: "{team} moves into the promotion group spots",
        dropsPromotionGroupSpots: "{team} drops out of the promotion group spots",
        climbsOutRelegation: "{team} climbs out of the relegation zone",
        fallsIntoRelegation: "{team} falls into the relegation zone",
        betterChances: "{team} is creating the better chances",
        pinningBack: "{team} is pinning the other side back",
        extraPlayer: "{team} has the extra player",
        aggregateScore: "{homeTeam} {homeGoals}-{awayGoals} {awayTeam} on aggregate",
        aggregateLevel: "Aggregate score is level",
        nextGoalThrough: "Next goal would put a side through",
        currentlyAdvancing: "{team} is currently going through",
        needsOneMoreAggregate: "{team} needs one more goal to level the aggregate",
        oneGoalFromExtraTime: "{team} is one goal from forcing extra time",
        needsMoreGoalsExtraTime: "{team} still needs {count} more goals to force extra time",
        needsOneMoreTie: "{team} needs one goal to level the tie",
        penaltyShootoutScore: "{homeTeam} {homeGoals}-{awayGoals} {awayTeam} on penalties",
        winsOnPenalties: "{team} wins on penalties",
        shootoutDecidedTie: "Penalty shootout decided the tie",
        shootoutInProgress: "Penalty shootout in progress",
        shootoutScore: "Penalty shootout: {homeGoals}-{awayGoals}",
        shootoutScored: "{name} scores in the shootout",
        shootoutMissed: "{name} misses in the shootout",
        shootoutMustScore: "{team} must score to stay alive",
        shootoutScoreToWin: "{team} scores the next penalty to win",
        winnerAdvances: "Winner advances from this tie.",
        tieToPenalties: "Level score would send this tie to penalties.",
        headingPenalties: "This tie is currently heading to penalties",
        firstLegTie: "This is the first leg of a two-leg tie.",
        firstLegAdvantage: "{team} takes a first-leg advantage",
        returnLegLevel: "The tie is level heading into the return leg",
        specialFormatLimited: "Special competition format - table impact limited",
        scoreOnly: "Live score only",
        goal: "Goal",
        penaltyGoal: "Penalty goal",
        ownGoal: "Own goal",
        missedPenalty: "Missed penalty"
      },
      prematch: {
        predictionTitle: "Model outlook",
        predictionChip: "Model",
        predictionWinner: "Model leans {team}",
        predictionWinOrDraw: "Model likes {team} or draw",
        predictionGoals: "Goal line: {value}",
        predictionAdvice: "Advice: {value}",
        predictionGoalsChip: "Goals {value}",
        predictionAdviceChip: "{value}",
        predictionUnavailable: "No model projection available yet.",
        predictionMetric: {
          form: "Form",
          att: "Attack",
          def: "Defence",
          poisson_distribution: "Poisson",
          h2h: "H2H"
        },
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
      common: {
        close: "Fechar"
      },
      popup: {
        eyebrow: "Foot Analysis",
        subhead: "Live Match Impact",
        title: "Acompanhe o que um gol muda",
        description:
          "Escolha uma liga suportada e a sobreposição explica o impacto ao vivo em segundos.",
        notifications: "Notificações",
        scenarioPreviewEyebrow: "Preview de cenários",
        scenarioPreviewTitle: "Teste estados salvos de jogo",
        scenarioModeLabel: "Usar preview de cenário",
        scenarioModeHint: "Carrega um payload empacotado em vez de um jogo ao vivo do backend.",
        scenarioVariantLabel: "Cenário",
        scenarioVariantPlaceholder: "Escolha um cenário",
        scenarioPreviewOff: "O modo backend ao vivo está ativo.",
        scenarioPreviewSelected: "Em preview: {label}.",
        statusChooseScenario: "Escolha um cenário para iniciar o modo preview.",
        notifyGoalsLabel: "Gol aconteceu",
        notifyGoalsHint: "Receba um aviso quando o jogo acompanhado tiver um gol.",
        notifyTableChangesLabel: "Gol mudou a posição na tabela",
        notifyTableChangesHint: "Envia um alerta mais rico quando um gol mexe na tabela.",
        billingEyebrow: "Acesso beta",
        proActiveEyebrow: "Pro",
        currentPlan: "Plano atual: {plan}",
        freePlan: "Free",
        proPlan: "Pro",
        billingSummaryFree:
          "Somente ligas em destaque. Desbloqueie o Pro para todas as ligas suportadas e insights premium.",
        billingSummaryPro:
          "O Pro está ativo. Você pode usar todas as ligas suportadas e o fallback por fixture manual.",
        restoreEyebrow: "Restaurar Pro",
        restoreTitle: "Use o email da cobrança",
        restoreEmailLabel: "Email da cobrança",
        restoreEmailPlaceholder: "voce@exemplo.com",
        restorePill: "Restaurar",
        restoreLinkedPill: "Vinculado",
        restoreLinkedNoProPill: "Email vinculado",
        restoreSummary: "Restaure o Pro neste navegador.",
        restoreLinked: "Este navegador está vinculado a {email}.",
        restoreLinkedCompact: "Vinculado a {email}.",
        restoreLinkedNoPro:
          "Este navegador está vinculado a {email}, mas ainda não encontramos um Pro ativo nesse email.",
        restoreLinkedNoProCompact: "Vinculado a {email}, mas o Pro ainda não foi encontrado.",
        restoreAction: "Enviar link de restauração",
        proActiveTitle: "Todas as ligas configuradas desbloqueadas",
        proActiveSummary:
          "Este navegador está no Pro. Você pode acompanhar qualquer liga configurada e usar o acompanhamento manual por fixture.",
        earlyBirdOffer:
          "Early Bird Pro ativo: {price}/mês para sempre para os próximos {remaining} usuários.",
        earlyBirdClosed: "O Early Bird Pro já encerrou.",
        checkoutPending: "Conclua o checkout e reabra a extensão para desbloquear o Pro automaticamente.",
        proUnlockedTitle: "Pro desbloqueado",
        proUnlockedBody:
          "O pagamento foi confirmado. Todas as ligas configuradas e o acompanhamento manual por fixture já estão ativos.",
        linkedNoProBody:
          "Este navegador está vinculado ao email de cobrança, mas ainda não encontramos um Pro ativo para ele.",
        upgradeToPro: "Desbloquear Pro",
        managePlan: "Atualizar plano",
        refreshPlan: "Atualizar status",
        upgradeInProgress: "Abrindo o Stripe Checkout...",
        statusPlanUpdated: "Status do plano atualizado.",
        statusPlanLoadFailed: "Não foi possível carregar o status de cobrança.",
        statusUpgradeFailed: "Não foi possível iniciar o checkout no Stripe.",
        statusRestoreEmailInvalid: "Informe o email de cobrança da sua conta Pro.",
        statusRestoreSent: "Link de restauração enviado.",
        statusRestorePreviewOpened:
          "O link de restauração foi aberto em uma nova aba. Conclua o processo ali e depois atualize o plano.",
        statusRestoreLinked:
          "Este navegador já está vinculado. Estamos verificando se um Pro deve ser restaurado aqui.",
        statusRestoreFailed: "Não foi possível criar o link de restauração.",
        statusCheckoutPending:
          "Checkout aberto. Vamos atualizar o plano quando você voltar.",
        statusProUnlocked: "Pro desbloqueado com sucesso.",
        statusProActive: "O Pro está ativo neste navegador.",
        backendUrl: "URL do backend",
        refreshMatches: "Atualizar jogos",
        leagueFocus: "Foco de ligas",
        allSupportedLeagues: "Todas as ligas configuradas",
        liveMatches: "Jogos ao vivo",
        upcomingMatches: "Próximos jogos",
        advancedOptions: "Opções avançadas",
        manualFixtureTitle: "Fallback por fixture manual",
        manualFixtureSummary: "Use um fixture ID apenas quando o jogo não aparecer nas listas.",
        manualFixtureId: "Fixture ID manual",
        manualFixturePlaceholder: "Fallback opcional",
        manualFixtureEnabled: "O fallback por fixture manual está disponível no Pro.",
        manualFixtureLocked: "O fallback por fixture manual faz parte do Pro.",
        startTracking: "Acompanhar este jogo",
        stopTracking: "Parar acompanhamento",
        openSidePanel: "Abrir painel lateral",
        livePlaceholder: "Escolha um jogo ao vivo",
        liveEmpty: "Nenhum jogo ao vivo encontrado",
        liveLoadError: "Não foi possível carregar jogos ao vivo",
        upcomingPlaceholder: "Escolha um próximo jogo",
        upcomingEmpty: "Nenhum próximo jogo encontrado",
        upcomingLoadError: "Não foi possível carregar próximos jogos",
        featuredLeaguePrefix: "Destaque",
        noMatchesRightNow: "Sem jogos agora",
        noMatchesInCurrentWindow: "Sem jogos ao vivo ou nas próximas 12h",
        scoreOnlySuffix: "Somente placar ao vivo - sem impacto na tabela",
        featuredLeaguesOnly: "Plano Free: apenas ligas em destaque",
        proUnlocksAllLeagues:
          "O Pro desbloqueia todas as ligas configuradas e o acompanhamento manual por fixture.",
        statusUpgradeRequiredLeague:
          "Esta liga faz parte do Pro. Escolha uma liga em destaque ou faça upgrade.",
        statusUpgradeRequiredManual:
          "O acompanhamento manual por fixture faz parte do Pro durante o beta.",
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
        statusSidePanelOpened: "Painel lateral aberto.",
        statusSidePanelFailed: "Não foi possível abrir o painel lateral nesta janela.",
        statusSettingsFailed: "Não foi possível carregar as configurações salvas.",
        statusNotificationsUpdated: "Configurações de notificação salvas."
      },
      notifications: {
        goalTitle: "Gol: {scoreline}",
        tableImpactTitle: "Impacto do gol: {scoreline}",
        goalHappened: "Um gol mudou o jogo.",
        goalChangedTable: "Um gol mudou a tabela ao vivo."
      },
      sidepanel: {
        documentTitle: "Painel lateral do Live Match Impact",
        eyebrow: "Painel lateral",
        emptyTitle: "Abra um jogo acompanhado aqui",
        emptyBody:
          "Comece a acompanhar um fixture no popup e este painel lateral seguirá automaticamente o mesmo jogo ao vivo.",
        refresh: "Atualizar",
        refreshing: "Atualizando impacto ao vivo...",
        stopTracking: "Parar acompanhamento",
        notTracking: "Nenhum jogo acompanhado ainda",
        trackMatch: "Acompanhar jogo",
        matchApplied: "Fixture acompanhado atualizado no painel lateral.",
        formatContext: "Contexto do formato",
        groupedSameGroupContext:
          "Esta competição usa grupos. O movimento ao vivo está sendo avaliado dentro do {group}.",
        groupedCrossPlayContext:
          "Este é um confronto entre grupos. Projetamos cada time dentro do próprio grupo em vez de afirmar uma única mudança compartilhada na tabela.",
        cupSingleLegContext:
          "Este é um confronto de mata-mata em jogo único. Quem vencer avança.",
        cupTwoLegContext:
          "Este é um mata-mata em dois jogos. O agregado decide quem avança.",
        cupFirstLegContext:
          "Este é o jogo de ida de um confronto em dois jogos. A volta vai decidir o agregado.",
        limitedFormatContext:
          "Esta competição usa um formato especial, então mantemos o insight focado em placar e contexto de grupo, sem forçar conclusões arriscadas de classificação.",
        scoreOnlyFormatContext:
          "Este fixture não tem cobertura confiável de tabela, então esta visão fica focada no contexto do placar ao vivo."
      },
      panel: {
        eyebrow: "Impacto ao vivo",
        waitingImpact: "Aguardando impacto ao vivo",
        waitingMatch: "Aguardando um jogo acompanhado",
        goalImpact: "Impacto do gol",
        collapse: "Recolher",
        close: "Fechar",
        scrollControls: "Controles de rolagem",
        scrollTop: "Ir para o topo",
        scrollBottom: "Ir para a parte inferior",
        offline: "Offline",
        limited: "Limitado",
        config: "Config",
        matchTracker: "Monitor de jogo",
        tableImpact: "Impacto na tabela",
        tieImpact: "Impacto no confronto",
        competitionImpact: "Impacto na competição",
        groupPositions: "Posições nos grupos",
        limitedCompetition: "Por que o impacto é limitado",
        momentum: "Momento",
        matchStats: "Estatísticas da partida",
        preMatch: "Pré-jogo",
        otherMatches: "Outros jogos da rodada",
        connecting: "Conectando...",
        live: "Ao vivo",
        preMatchStatus: "Pré-jogo",
        finished: "Jogo encerrado",
        finishedShort: "Final",
        updatedAt: "Atualizado {time}",
        noCompetitionSwing: "Ainda não houve grande mudança na competição.",
        preMatchTableHome: "{team} está sendo acompanhado antes do pontapé inicial",
        preMatchTableAway: "O impacto ao vivo na tabela começa quando a partida iniciar",
        preMatchCompetitionDetail: "O impacto ao vivo na tabela começa quando a partida iniciar.",
        momentumFallback: "O momento está sendo calculado com placar e movimento na tabela.",
        scoreOnlyHome: "{team} com placar ao vivo acompanhado",
        scoreOnlyAway: "Impacto na tabela indisponível para esta competição",
        limitedHome: "Jogo entre grupos ou formato especial",
        limitedAway: "Não dá para afirmar posições ao vivo com segurança aqui",
        groupPosition: "{team} está em {position} no {group}",
        projectedGroupPosition:
          "{team} está em {currentPosition} no {group} · ao vivo fica em {projectedPosition} se os placares seguirem assim",
        limitedCompetitionDetail:
          "Acompanhamos o placar, mas este formato de competição deixa a classificação ao vivo menos confiável para este confronto.",
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
        automaticPromotion: "{team} entra nas vagas de acesso direto",
        playoffSpots: "{team} entra na zona de playoff",
        climbsPlayoffSpots: "{team} sobe para a zona de playoff",
        dropsPlayoffSpots: "{team} cai para a zona de playoff",
        dropsOutPlayoffSpots: "{team} sai da zona de playoff",
        roundOf16Spots: "{team} entra nas vagas das oitavas",
        knockoutPlayoffSpots: "{team} entra nas vagas do play-off mata-mata",
        climbsKnockoutPlayoffSpots: "{team} sobe para as vagas do play-off mata-mata",
        dropsKnockoutPlayoffSpots: "{team} cai para as vagas do play-off mata-mata",
        dropsOutKnockoutPlayoffSpots: "{team} sai das vagas do play-off mata-mata",
        eliminationZone: "{team} cai para a zona de eliminação",
        qualificationSpots: "{team} entra nas vagas de classificação",
        dropsQualificationSpots: "{team} sai das vagas de classificação",
        promotionGroupSpots: "{team} entra nas vagas dos grupos de acesso",
        dropsPromotionGroupSpots: "{team} sai das vagas dos grupos de acesso",
        climbsOutRelegation: "{team} sai da zona de rebaixamento",
        fallsIntoRelegation: "{team} entra na zona de rebaixamento",
        betterChances: "{team} está criando as melhores chances",
        pinningBack: "{team} está empurrando o rival para trás",
        extraPlayer: "{team} está com um jogador a mais",
        aggregateScore: "{homeTeam} {homeGoals}-{awayGoals} {awayTeam} no agregado",
        aggregateLevel: "Agregado empatado",
        nextGoalThrough: "O próximo gol colocaria um lado em vantagem no confronto",
        currentlyAdvancing: "{team} vai avançando",
        needsOneMoreAggregate: "{team} precisa de mais um gol para empatar o agregado",
        oneGoalFromExtraTime: "{team} está a um gol de forçar a prorrogação",
        needsMoreGoalsExtraTime: "{team} ainda precisa de mais {count} gols para forçar a prorrogação",
        needsOneMoreTie: "{team} precisa de um gol para empatar o confronto",
        penaltyShootoutScore: "{homeTeam} {homeGoals}-{awayGoals} {awayTeam} nos pênaltis",
        winsOnPenalties: "{team} vence nos pênaltis",
        shootoutDecidedTie: "A disputa por pênaltis decidiu o confronto",
        shootoutInProgress: "Disputa por pênaltis em andamento",
        shootoutScore: "Pênaltis: {homeGoals}-{awayGoals}",
        shootoutScored: "{name} converte na disputa por pênaltis",
        shootoutMissed: "{name} perde na disputa por pênaltis",
        shootoutMustScore: "{team} precisa marcar para seguir vivo",
        shootoutScoreToWin: "{team} marca o próximo pênalti para vencer",
        winnerAdvances: "Quem vencer este confronto avança.",
        tieToPenalties: "Empate leva a decisão para os pênaltis.",
        headingPenalties: "No momento, este confronto vai para os pênaltis",
        firstLegTie: "Este é o jogo de ida de um confronto em dois jogos.",
        firstLegAdvantage: "{team} abre vantagem no jogo de ida",
        returnLegLevel: "O confronto fica empatado para a volta",
        specialFormatLimited: "Formato especial de competição - impacto limitado na tabela",
        scoreOnly: "Somente placar ao vivo",
        goal: "Gol",
        penaltyGoal: "Gol de pênalti",
        ownGoal: "Gol contra",
        missedPenalty: "Pênalti perdido"
      },
      prematch: {
        predictionTitle: "Projeção do modelo",
        predictionChip: "Modelo",
        predictionWinner: "Modelo pende para {team}",
        predictionWinOrDraw: "Modelo gosta de {team} ou empate",
        predictionGoals: "Linha de gols: {value}",
        predictionAdvice: "Conselho: {value}",
        predictionGoalsChip: "Gols {value}",
        predictionAdviceChip: "{value}",
        predictionUnavailable: "Ainda não há projeção do modelo.",
        predictionMetric: {
          form: "Forma",
          att: "Ataque",
          def: "Defesa",
          poisson_distribution: "Poisson",
          h2h: "H2H"
        },
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

  function translateInjuryReason(language, reason) {
    const normalizedReason = String(reason ?? "").trim();

    if (!normalizedReason) {
      return "";
    }

    if (language !== "pt-BR") {
      return normalizedReason;
    }

    const exactMatches = new Map([
      ["Injury", "Lesão"],
      ["Knee Injury", "Lesão no joelho"],
      ["Hamstring Injury", "Lesão na coxa"],
      ["Back Injury", "Lesão nas costas"],
      ["Foot Injury", "Lesão no pé"],
      ["Muscle Injury", "Lesão muscular"],
      ["Hip Injury", "Lesão no quadril"],
      ["Ankle Injury", "Lesão no tornozelo"],
      ["Calf Injury", "Lesão na panturrilha"],
      ["Thigh Injury", "Lesão na coxa"],
      ["Groin Injury", "Lesão na virilha"],
      ["Shoulder Injury", "Lesão no ombro"],
      ["Head Injury", "Lesão na cabeça"]
    ]);

    if (exactMatches.has(normalizedReason)) {
      return exactMatches.get(normalizedReason);
    }

    if (normalizedReason.endsWith(" Injury")) {
      const bodyPart = normalizedReason.slice(0, -7).trim();

      if (bodyPart) {
        return `Lesão em ${bodyPart.toLowerCase()}`;
      }
    }

    return normalizedReason;
  }

  function translateCompetitionMessage(language, message) {
    const patterns = [
      [/^(.+) goes top of the table$/, "impact.goesTop", ["team"]],
      [/^(.+) enters the title race$/, "impact.entersTitleRace", ["team"]],
      [/^(.+) loses ground in the title race$/, "impact.losesTitleRace", ["team"]],
      [/^(.+) breaks into the top (\d+)$/, "impact.breaksTop", ["team", "cutoff"]],
      [/^(.+) drops out of the top (\d+)$/, "impact.dropsOutTop", ["team", "cutoff"]],
      [/^(.+) moves into the automatic promotion spots$/, "impact.automaticPromotion", ["team"]],
      [/^(.+) moves into the playoff spots$/, "impact.playoffSpots", ["team"]],
      [/^(.+) climbs into the playoff spots$/, "impact.climbsPlayoffSpots", ["team"]],
      [/^(.+) drops into the playoff spots$/, "impact.dropsPlayoffSpots", ["team"]],
      [/^(.+) drops out of the playoff spots$/, "impact.dropsOutPlayoffSpots", ["team"]],
      [/^(.+) moves into the round of 16 spots$/, "impact.roundOf16Spots", ["team"]],
      [/^(.+) moves into the knockout play-off spots$/, "impact.knockoutPlayoffSpots", ["team"]],
      [/^(.+) climbs into the knockout play-off spots$/, "impact.climbsKnockoutPlayoffSpots", ["team"]],
      [/^(.+) drops into the knockout play-off spots$/, "impact.dropsKnockoutPlayoffSpots", ["team"]],
      [/^(.+) drops out of the knockout play-off spots$/, "impact.dropsOutKnockoutPlayoffSpots", ["team"]],
      [/^(.+) falls into the elimination zone$/, "impact.eliminationZone", ["team"]],
      [/^(.+) moves into the qualification spots$/, "impact.qualificationSpots", ["team"]],
      [/^(.+) drops out of the qualification spots$/, "impact.dropsQualificationSpots", ["team"]],
      [/^(.+) moves into the promotion group spots$/, "impact.promotionGroupSpots", ["team"]],
      [/^(.+) drops out of the promotion group spots$/, "impact.dropsPromotionGroupSpots", ["team"]],
      [/^(.+) climbs out of the relegation zone$/, "impact.climbsOutRelegation", ["team"]],
      [/^(.+) falls into the relegation zone$/, "impact.fallsIntoRelegation", ["team"]],
      [/^(.+) is creating the better chances$/, "impact.betterChances", ["team"]],
      [/^(.+) is pinning the other side back$/, "impact.pinningBack", ["team"]],
      [/^(.+) has the extra player$/, "impact.extraPlayer", ["team"]],
      [/^(.+) (\d+)-(\d+) (.+) on penalties$/, "impact.penaltyShootoutScore", ["homeTeam", "homeGoals", "awayGoals", "awayTeam"]],
      [/^(.+) wins on penalties$/, "impact.winsOnPenalties", ["team"]],
      [/^Penalty shootout decided the tie$/, "impact.shootoutDecidedTie", []],
      [/^Penalty shootout in progress$/, "impact.shootoutInProgress", []],
      [/^Penalty shootout: (\d+)-(\d+)$/, "impact.shootoutScore", ["homeGoals", "awayGoals"]],
      [/^(.+) scores in the shootout$/, "impact.shootoutScored", ["name"]],
      [/^(.+) misses in the shootout$/, "impact.shootoutMissed", ["name"]],
      [/^(.+) must score to stay alive$/, "impact.shootoutMustScore", ["team"]],
      [/^(.+) scores the next penalty to win$/, "impact.shootoutScoreToWin", ["team"]],
      [/^(.+) (\d+)-(\d+) (.+) on aggregate$/, "impact.aggregateScore", ["homeTeam", "homeGoals", "awayGoals", "awayTeam"]],
      [/^Aggregate score is level$/, "impact.aggregateLevel", []],
      [/^Next goal would put a side through$/, "impact.nextGoalThrough", []],
      [/^(.+) is currently going through$/, "impact.currentlyAdvancing", ["team"]],
      [/^(.+) needs one more goal to level the aggregate$/, "impact.needsOneMoreAggregate", ["team"]],
      [/^(.+) is one goal from forcing extra time$/, "impact.oneGoalFromExtraTime", ["team"]],
      [/^(.+) still needs (\d+) more goals to force extra time$/, "impact.needsMoreGoalsExtraTime", ["team", "count"]],
      [/^(.+) needs one goal to level the tie\.$/, "impact.needsOneMoreTie", ["team"]],
      [/^Winner advances from this tie\.$/, "impact.winnerAdvances", []],
      [/^Level score would send this tie to penalties\.$/, "impact.tieToPenalties", []],
      [/^This tie is currently heading to penalties$/, "impact.headingPenalties", []],
      [/^This is the first leg of a two-leg tie\.$/, "impact.firstLegTie", []],
      [/^(.+) takes a first-leg advantage$/, "impact.firstLegAdvantage", ["team"]],
      [/^The tie is level heading into the return leg$/, "impact.returnLegLevel", []],
      [
        /^Cross-group fixtures limit live table impact for this fixture\.$/,
        "impact.specialFormatLimited",
        []
      ],
      [/^Live score tracked - table impact limited for this fixture\.$/, "impact.specialFormatLimited", []],
      [/^Live table impact will start once the match kicks off\.$/, "panel.preMatchCompetitionDetail", []]
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
    if (impact?.mode === "cup") {
      return translateCompetitionMessage(language, impact.summary || "");
    }

    if (impact?.mode === "limited") {
      return t(language, "impact.specialFormatLimited");
    }

    if (impact?.mode === "score-only") {
      return t(language, "impact.scoreOnly");
    }

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
    translateInjuryReason,
    translateCompetitionMessage,
    buildImpactSummary
  };
})(globalThis);
