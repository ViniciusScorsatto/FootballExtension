function formatPrice(value, currency, locale) {
  if (!value) {
    return "Free";
  }

  return new Intl.NumberFormat(locale === "pt-BR" ? "pt-BR" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2
  }).format(value);
}

function getLocalizedPlanContent(locale) {
  if (locale === "pt-BR") {
    return {
      free: {
        name: "Free",
        tagline: "Acompanhe uma partida de liga em destaque e entenda o impacto principal na hora.",
        features: [
          "Acompanhe 1 jogo ao vivo por vez",
          "Acesso às ligas em destaque",
          "Placar ao vivo e impacto principal na tabela",
          "Impacto na competição e linha dos gols",
          "Estatísticas finais após o apito final",
          "Inglês e português-BR"
        ]
      },
      pro: {
        name: "Pro",
        tagline: "Desbloqueie uma leitura mais profunda da partida em todas as ligas suportadas.",
        features: [
          "Todas as ligas suportadas",
          "Fallback por fixture manual",
          "Projeção pré-jogo do modelo",
          "Campo tático da escalação e lesões",
          "Contexto mais rico para grupos, mata-mata e pênaltis",
          "Modo de leitura profunda no painel lateral"
        ]
      }
    };
  }

  return {
    free: {
      name: "Free",
      tagline: "Track one featured-league match and understand the core impact instantly.",
      features: [
        "Track 1 live match at a time",
        "Featured league access",
        "Live score and core table impact",
        "Competition impact and scorer timeline",
        "Final stats after full time",
        "English and Portuguese-BR"
      ]
    },
    pro: {
      name: "Pro",
      tagline: "Unlock deeper match reading across every supported league.",
      features: [
        "All supported leagues",
        "Manual fixture fallback",
        "Pre-match model outlook",
        "Lineup pitch and injuries",
        "Richer grouped, knockout, and penalty context",
        "Side panel deep-view mode"
      ]
    }
  };
}

function getMarketingCopy(locale) {
  if (locale === "pt-BR") {
    return {
      htmlLang: "pt-BR",
      title: "Foot Analysis · Live Match Impact",
      description: "Entendimento instantâneo do que um gol muda. Live Match Impact transforma placares em consequências de título, G4, rebaixamento e posições de grupo.",
      brandTitle: "Live Match Impact",
      navPricing: "Preços da API",
      navJoinBeta: "Entrar no beta",
      navSeePlans: "Ver planos",
      languageEnglish: "🇺🇸 EN",
      languagePortuguese: "🇧🇷 PT-BR",
      heroEyebrow: "Lançamento beta para fãs de dia de jogo",
      heroTitle: "Entenda na hora o que um gol muda.",
      heroSubcopy: "Live Match Impact transforma placares em significado: pressão na briga pelo título, mudanças no G4, risco de rebaixamento, movimentação em grupos e contexto da rodada em segundos.",
      heroPrimaryCta: "Desbloquear Early Bird Pro",
      heroSecondaryCta: "Falar com a gente",
      proofLanguages: "Inglês + português-BR",
      proofInfra: "Extensão Chrome + cache no backend",
      proofSpeed: "Criado para significado ao vivo",
      mockupGoalImpact: "Impacto do gol",
      mockupGoalImpactLine: "Gol do Saka muda a corrida imediatamente.",
      mockupTableImpact: "Impacto na tabela",
      mockupCompetitionImpact: "Impacto na competição",
      mockupCompetitionNote: "Arsenal entra na zona de Champions League. Chelsea sai do top 4.",
      mockupRoundContext: "Outros jogos da rodada",
      whyEyebrow: "Por que isso existe",
      whyTitle: "Feito para uma pergunta, não para sobrecarga de dashboard.",
      whyBody: "Quando sai um gol, o torcedor não precisa de mais uma parede de estatísticas. Precisa de uma resposta limpa: o que esse resultado muda agora?",
      story1Title: "Acompanhe um jogo",
      story1Body: "Foque na partida que importa para você em vez de ficar pulando entre dez apps diferentes.",
      story2Title: "Veja a consequência",
      story2Body: "Mudanças na tabela, posições de grupo e impacto na competição aparecem traduzidos na hora.",
      story3Title: "Mantenha a rodada no radar",
      story3Body: "Outros jogos da mesma rodada continuam visíveis para a história nunca perder contexto.",
      feelEyebrow: "Como a experiência funciona",
      feelTitle: "Não é um dump de estatísticas. É uma camada de leitura ao vivo do futebol.",
      feature1Title: "Entendível em menos de dois segundos",
      feature1Body: "O painel flutuante é feito para compreensão instantânea, não para exploração profunda.",
      feature2Title: "Lógica ao vivo focada em confiança",
      feature2Body: "Ligas de tabela única, competições em grupos e formatos especiais são tratados com fallbacks explícitos.",
      feature3Title: "Backend rápido e consciente de cache",
      feature3Body: "O cache compartilhado mantém o produto responsivo enquanto protege o uso de chamadas da API-Football.",
      feature4Title: "Feito para a sua mistura de audiência",
      feature4Body: "Inglês e português-BR já saem prontos para o produto crescer com os dois canais.",
      differenceEyebrow: "Veja a diferença",
      differenceTitle: "Free explica o que está acontecendo. Pro adiciona o contexto mais profundo da partida.",
      differenceBody: "A versão gratuita entrega a leitura principal ao vivo nas ligas em destaque. O Pro mantém essa velocidade e adiciona mais ligas e mais contexto pré-jogo e de competição.",
      freeTierTitle: "Significado rápido da partida nas ligas em destaque",
      proTierTitle: "Leitura mais profunda da partida em todas as ligas suportadas",
      demoTableImpact: "Impacto na tabela",
      demoCompetitionImpact: "Impacto na competição",
      demoCompetitionNote: "Arsenal entra na zona de Champions League.",
      demoWhatProAdds: "O que o Pro adiciona",
      demoProAddsNote: "Todas as ligas suportadas, fallback por fixture manual e leitura pré-jogo mais profunda",
      demoGroupPosition: "Posição no grupo",
      demoGroupPositionNote: "America-RN está em 2º no Grupo C e sobe para 1º se o placar continuar assim.",
      demoPreMatchDepth: "Profundidade pré-jogo",
      demoPreMatchDepthNote: "Projeção do modelo, forma da escalação e contexto de lesões antes do início.",
      demoCompetitionReading: "Leitura da competição",
      demoCompetitionReadingNote: "Interpretação mais rica de grupos, mata-mata, agregado e pênaltis na visão ao vivo.",
      pricingEyebrow: "Preços",
      pricingTitle: "Uma camada premium clara, com recompensa beta para quem chega cedo.",
      pricingBody: "O Free continua realmente útil para a leitura principal ao vivo. O Pro desbloqueia todas as ligas suportadas e o contexto mais profundo da partida que já existe hoje no produto. Usuários Early Bird travam o melhor preço para sempre.",
      pricingFreeLabel: "Comece no free",
      pricingProLabel: "Para quem vive o matchday",
      pricingEarlyLabel: "Melhor oferta do beta",
      pricePerMonth: "/mês",
      pricePerMonthForever: "/mês para sempre",
      earlyBirdCopy: "Preço Pro com desconto vitalício para os primeiros apoiadores que ajudarem a moldar o beta.",
      earlyBirdAvailability: "vagas disponíveis no momento de",
      claimEarlyBird: "Garantir Early Bird",
      betaEyebrow: "Por que o beta importa",
      betaTitle: "Estamos refinando a lógica das ligas, a qualidade dos insights ao vivo e o que os fãs realmente pagam.",
      betaUsersTitle: "O que os usuários beta recebem",
      betaUsersBullet1: "Acesso ao produto enquanto a lógica das partidas continua melhorando",
      betaUsersBullet2: "A chance de moldar o que Free e Pro serão antes do lançamento público",
      betaUsersBullet3: "Visibilidade antecipada sobre novas ligas, insights em grupos e ideias de alertas",
      betaRefiningTitle: "O que ainda estamos refinando",
      betaRefiningBullet1: "Formatos de competição com casos de borda e lógica específica de copas",
      betaRefiningBullet2: "Os melhores ganchos premium para alertas, comportamento multi-jogo e interpretação mais profunda",
      betaRefiningBullet3: "Integração de marca mais forte com os canais Foot Analysis em inglês e PT-BR",
      footerLead: "Live Match Impact está em beta no momento. Para suporte, parcerias ou acesso antecipado:",
      freeLabel: "Free",
      proLabel: "Pro",
      freePrice: "Grátis"
    };
  }

  return {
    htmlLang: "en",
    title: "Foot Analysis · Live Match Impact",
    description: "Instant understanding of what a goal means. Live Match Impact turns football scores into title-race, top-4, relegation, and group-position consequences.",
    brandTitle: "Live Match Impact",
    navPricing: "Pricing API",
    navJoinBeta: "Join Beta",
    navSeePlans: "See plans",
    languageEnglish: "🇺🇸 EN",
    languagePortuguese: "🇧🇷 PT-BR",
    heroEyebrow: "Beta launch for matchday fans",
    heroTitle: "Instant understanding of what a goal changes.",
    heroSubcopy: "Live Match Impact turns football scores into meaning: title race pressure, top-four swings, relegation danger, group-position movement, and round context in seconds.",
    heroPrimaryCta: "Unlock Early Bird Pro",
    heroSecondaryCta: "Talk to us",
    proofLanguages: "English + Portuguese-BR",
    proofInfra: "Chrome extension + backend cache",
    proofSpeed: "Built for fast live meaning",
    mockupGoalImpact: "Goal Impact",
    mockupGoalImpactLine: "Saka goal changes the race immediately.",
    mockupTableImpact: "Table Impact",
    mockupCompetitionImpact: "Competition Impact",
    mockupCompetitionNote: "Arsenal moves into the Champions League places. Chelsea drops out of the top four.",
    mockupRoundContext: "Other Matches This Round",
    whyEyebrow: "Why this exists",
    whyTitle: "Built for one question, not for dashboard overload.",
    whyBody: "Fans do not need another wall of stats when a goal goes in. They need one clean answer: what does this result change right now?",
    story1Title: "Track one match",
    story1Body: "Stay focused on the fixture you care about instead of scanning ten different apps.",
    story2Title: "See the consequence",
    story2Body: "Table movement, group-position shifts, and competition consequences are translated instantly.",
    story3Title: "Keep the round in view",
    story3Body: "Other matches from the same round stay visible so the story never loses context.",
    feelEyebrow: "How it feels",
    feelTitle: "Not a stats dump. A live football reading layer.",
    feature1Title: "Glanceable in under two seconds",
    feature1Body: "The floating panel is built for instant comprehension, not deep exploration.",
    feature2Title: "Trust-first live logic",
    feature2Body: "Single-table leagues, grouped competitions, and special formats are handled with explicit fallbacks.",
    feature3Title: "Fast, cache-aware backend",
    feature3Body: "Shared caching keeps the product responsive while protecting API-Football request usage.",
    feature4Title: "Made for your audience mix",
    feature4Body: "English and Portuguese-BR are supported from day one so the product can grow with both channels.",
    differenceEyebrow: "See the difference",
    differenceTitle: "Free explains what is happening. Pro adds the deeper match context.",
    differenceBody: "The free tier gives the core live-reading experience on featured leagues. Pro keeps that speed, then adds broader league access and deeper pre-match and competition context.",
    freeTierTitle: "Fast match meaning on featured leagues",
    proTierTitle: "Deeper match reading across every supported league",
    demoTableImpact: "Table Impact",
    demoCompetitionImpact: "Competition Impact",
    demoCompetitionNote: "Arsenal enters the Champions League places.",
    demoWhatProAdds: "What Pro adds",
    demoProAddsNote: "All supported leagues, manual fixture fallback, and deeper pre-match reading",
    demoGroupPosition: "Group Position",
    demoGroupPositionNote: "America-RN is 2nd in Group C and moves into 1st if scores hold.",
    demoPreMatchDepth: "Pre-match depth",
    demoPreMatchDepthNote: "Model outlook, lineup shape, and injury context before kickoff.",
    demoCompetitionReading: "Competition reading",
    demoCompetitionReadingNote: "Richer grouped, knockout, aggregate, and penalty interpretation in the live view.",
    pricingEyebrow: "Pricing",
    pricingTitle: "One clear premium tier, plus a beta reward for early believers.",
    pricingBody: "Free stays genuinely useful for the core live-reading job. Pro unlocks every supported league plus the deeper match context that already exists in the product today. Early Bird users lock in the best price forever.",
    pricingFreeLabel: "Start free",
    pricingProLabel: "For matchday power users",
    pricingEarlyLabel: "Best beta offer",
    pricePerMonth: "/month",
    pricePerMonthForever: "/month forever",
    earlyBirdCopy: "Lifetime discounted Pro pricing for early adopters who help shape the beta.",
    earlyBirdAvailability: "spots currently available out of",
    claimEarlyBird: "Claim Early Bird",
    betaEyebrow: "Why beta matters",
    betaTitle: "We are refining league logic, live insight quality, and what fans actually pay for.",
    betaUsersTitle: "What beta users get",
    betaUsersBullet1: "Access to the product while the match logic keeps improving",
    betaUsersBullet2: "The chance to shape what Free and Pro become before public launch",
    betaUsersBullet3: "Early visibility into new league support, grouped insights, and alert ideas",
    betaRefiningTitle: "What we are still refining",
    betaRefiningBullet1: "Edge-case competition formats and cup-specific live consequence logic",
    betaRefiningBullet2: "The best premium hooks for alerts, multi-match behavior, and deeper interpretation",
    betaRefiningBullet3: "Tighter brand integration with the Foot Analysis English and PT-BR channels",
    footerLead: "Live Match Impact is currently in beta. For support, partnerships, or early access:",
    freeLabel: "Free",
    proLabel: "Pro",
    freePrice: "Free"
  };
}

export function renderMarketingPage({ pricing, language = "en" }) {
  const locale = language === "pt-BR" ? "pt-BR" : "en";
  const copy = getMarketingCopy(locale);
  const localizedPlans = getLocalizedPlanContent(locale);
  const freePlan = pricing.plans.free;
  const proPlan = pricing.plans.pro;
  const earlyBird = pricing.offers.early_bird_lifetime;
  const regularPrice = formatPrice(proPlan.priceMonthlyUsd, pricing.currency, locale);
  const earlyBirdPrice = formatPrice(earlyBird.priceMonthlyUsd, pricing.currency, locale);
  const freePlanName = localizedPlans.free.name || freePlan.name;
  const proPlanName = localizedPlans.pro.name || proPlan.name;
  const activeEnClass = locale === "en" ? " language-pill--active" : "";
  const activePtClass = locale === "pt-BR" ? " language-pill--active" : "";

  return `<!DOCTYPE html>
<html lang="${copy.htmlLang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${copy.title}</title>
    <meta
      name="description"
      content="${copy.description}"
    />
    <style>
      :root {
        color-scheme: dark;
        --bg: #07101d;
        --bg-deep: #091629;
        --panel: rgba(10, 18, 33, 0.84);
        --panel-strong: rgba(255, 255, 255, 0.08);
        --line: rgba(255, 255, 255, 0.1);
        --text: #f4f7fe;
        --muted: #a1b4cf;
        --accent: #72f0c2;
        --accent-2: #59c8ff;
        --accent-3: #ffd177;
        --danger: #ff8d7b;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        font-family: "Avenir Next", Avenir, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(89, 200, 255, 0.2), transparent 32%),
          radial-gradient(circle at 80% 0%, rgba(114, 240, 194, 0.14), transparent 22%),
          linear-gradient(180deg, #07101d 0%, #081425 45%, #091629 100%);
        color: var(--text);
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      .page {
        width: min(1180px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 28px 0 80px;
      }

      .nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 30px;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .brand__mark {
        width: 52px;
        height: 52px;
        border-radius: 18px;
        border: 1px solid var(--line);
        background:
          radial-gradient(circle at top left, rgba(114, 240, 194, 0.22), transparent 45%),
          rgba(255, 255, 255, 0.04);
        display: grid;
        place-items: center;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
      }

      .brand__ball {
        width: 24px;
        height: 24px;
        border-radius: 999px;
        border: 2px solid var(--text);
        position: relative;
      }

      .brand__ball::before,
      .brand__ball::after {
        content: "";
        position: absolute;
        inset: 50%;
        transform: translate(-50%, -50%);
        border-radius: 999px;
      }

      .brand__ball::before {
        width: 14px;
        height: 14px;
        border: 1px solid rgba(244, 247, 254, 0.55);
      }

      .brand__ball::after {
        width: 5px;
        height: 5px;
        background: var(--text);
      }

      .brand__copy small,
      .eyebrow,
      .section__eyebrow,
      .mini-label {
        display: block;
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .brand__copy strong {
        display: block;
        font-size: 18px;
      }

      .nav__links {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .language-switch {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 4px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.04);
      }

      .language-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 38px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid transparent;
        color: var(--muted);
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.01em;
      }

      .language-pill--active {
        border-color: rgba(114, 240, 194, 0.34);
        background: rgba(114, 240, 194, 0.12);
        color: var(--text);
      }

      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 46px;
        padding: 0 18px;
        border-radius: 999px;
        border: 1px solid var(--line);
        font-weight: 700;
      }

      .button--primary {
        background: linear-gradient(135deg, var(--accent), var(--accent-2));
        color: #05111f;
      }

      .button--ghost {
        background: rgba(255, 255, 255, 0.05);
      }

      .button--soft {
        background: rgba(255, 255, 255, 0.04);
      }

      .hero {
        display: grid;
        grid-template-columns: 1.05fr 0.95fr;
        gap: 26px;
        align-items: center;
        padding: 34px;
        border-radius: 30px;
        border: 1px solid var(--line);
        background:
          radial-gradient(circle at top left, rgba(114, 240, 194, 0.14), transparent 28%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.025));
        overflow: hidden;
        position: relative;
      }

      .hero::after {
        content: "";
        position: absolute;
        inset: auto -10% -30% auto;
        width: 260px;
        height: 260px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(89, 200, 255, 0.14), transparent 70%);
        pointer-events: none;
      }

      .eyebrow {
        color: var(--accent);
        font-weight: 700;
      }

      h1 {
        margin: 12px 0 14px;
        font-size: clamp(42px, 7vw, 72px);
        line-height: 0.94;
        letter-spacing: -0.04em;
      }

      .hero__copy p,
      .section p,
      .pricing-card__copy,
      .bullet,
      .mockup-note {
        color: var(--muted);
        line-height: 1.6;
      }

      .hero__subcopy {
        max-width: 610px;
        font-size: 17px;
      }

      .hero__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 24px;
      }

      .hero__proof {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 18px;
      }

      .proof-pill {
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.04);
        color: var(--muted);
        font-size: 13px;
      }

      .mockup-shell {
        padding: 20px;
        border-radius: 28px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background:
          linear-gradient(180deg, rgba(9, 20, 37, 0.88), rgba(10, 19, 35, 0.72));
        box-shadow: 0 28px 70px rgba(0, 0, 0, 0.38);
      }

      .mockup-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 16px;
      }

      .mockup-header__copy strong {
        display: block;
        font-size: 18px;
      }

      .mockup-score {
        margin-top: 10px;
        font-size: 31px;
        line-height: 1.05;
        font-weight: 700;
      }

      .mockup-minute {
        color: var(--accent);
        font-weight: 700;
      }

      .mockup-banner {
        margin: 18px 0 14px;
        padding: 12px 14px;
        border-radius: 18px;
        background: linear-gradient(135deg, rgba(114, 240, 194, 0.16), rgba(89, 200, 255, 0.14));
      }

      .mockup-banner strong {
        display: block;
        margin-top: 4px;
        font-size: 17px;
      }

      .mockup-grid {
        display: grid;
        gap: 12px;
      }

      .mockup-card {
        padding: 14px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .mockup-card__row {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        margin-top: 8px;
      }

      .mockup-card__row strong {
        color: var(--accent);
      }

      .mockup-round {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin-top: 8px;
      }

      .mockup-round__item {
        padding: 10px 8px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.05);
        text-align: center;
        font-size: 13px;
      }

      .mockup-round__item strong {
        display: block;
        margin-bottom: 4px;
        font-size: 15px;
      }

      .sections {
        display: grid;
        gap: 28px;
        margin-top: 32px;
      }

      .section {
        padding: 28px;
        border-radius: 28px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.03);
      }

      .section h2 {
        margin: 8px 0 12px;
        font-size: 30px;
      }

      .story-grid,
      .feature-grid,
      .demo-grid,
      .pricing-grid,
      .comparison-grid {
        display: grid;
        gap: 18px;
      }

      .story-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .feature-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .demo-grid {
        grid-template-columns: 1fr 1fr;
      }

      .pricing-grid {
        grid-template-columns: 0.9fr 1.05fr 1.05fr;
        align-items: stretch;
      }

      .comparison-grid {
        grid-template-columns: 1fr 1fr;
      }

      .story-card,
      .feature-card,
      .demo-card,
      .pricing-card,
      .comparison-card {
        padding: 20px;
        border-radius: 22px;
        background: var(--panel);
        border: 1px solid var(--line);
      }

      .story-card h3,
      .feature-card h3,
      .demo-card h3,
      .pricing-card h3,
      .comparison-card h3 {
        margin: 8px 0 10px;
        font-size: 21px;
      }

      .story-number {
        display: inline-grid;
        place-items: center;
        width: 34px;
        height: 34px;
        border-radius: 999px;
        background: rgba(114, 240, 194, 0.14);
        color: var(--accent);
        font-weight: 800;
      }

      .demo-card--pro {
        background:
          radial-gradient(circle at top left, rgba(114, 240, 194, 0.14), transparent 36%),
          rgba(255, 255, 255, 0.05);
        border-color: rgba(114, 240, 194, 0.22);
      }

      .tier-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.06);
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .demo-card--pro .tier-pill {
        background: rgba(114, 240, 194, 0.12);
        color: var(--accent);
      }

      .demo-phone {
        margin-top: 16px;
        padding: 14px;
        border-radius: 24px;
        background: linear-gradient(180deg, rgba(8, 18, 33, 0.92), rgba(9, 21, 38, 0.78));
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .demo-phone__top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
      }

      .demo-phone__title {
        margin-top: 6px;
        font-size: 22px;
        font-weight: 700;
        line-height: 1.1;
      }

      .demo-phone__status {
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.06);
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
      }

      .demo-block {
        margin-top: 14px;
        padding: 14px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.06);
      }

      .demo-block--locked {
        background:
          linear-gradient(180deg, rgba(255, 141, 123, 0.08), rgba(255, 255, 255, 0.04));
        border-color: rgba(255, 141, 123, 0.16);
      }

      .demo-line {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-top: 8px;
      }

      .demo-line strong {
        color: var(--accent);
      }

      .demo-note {
        margin-top: 10px;
        color: var(--muted);
        font-size: 14px;
        line-height: 1.5;
      }

      .demo-lock {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 12px;
        background: rgba(255, 141, 123, 0.1);
        color: #ffc0b4;
        font-size: 13px;
        font-weight: 700;
      }

      .pricing-card--pro {
        background:
          radial-gradient(circle at top left, rgba(89, 200, 255, 0.12), transparent 40%),
          rgba(255, 255, 255, 0.05);
      }

      .pricing-card--early {
        background:
          radial-gradient(circle at top left, rgba(114, 240, 194, 0.18), transparent 38%),
          linear-gradient(180deg, rgba(114, 240, 194, 0.08), rgba(89, 200, 255, 0.08));
        border-color: rgba(114, 240, 194, 0.3);
        transform: translateY(-10px);
      }

      .pricing-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 12px;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(255, 209, 119, 0.12);
        color: var(--accent-3);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .price {
        margin: 6px 0;
        font-size: 42px;
        line-height: 1;
        font-weight: 800;
        letter-spacing: -0.04em;
      }

      .price small {
        font-size: 15px;
        font-weight: 500;
        color: var(--muted);
      }

      .pricing-card__copy {
        min-height: 48px;
      }

      .bullet-list {
        display: grid;
        gap: 10px;
        margin-top: 16px;
      }

      .bullet::before {
        content: "• ";
        color: var(--accent);
      }

      .offer-note {
        margin-top: 16px;
        padding: 14px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.05);
        color: var(--muted);
      }

      .offer-note strong {
        color: var(--text);
      }

      .comparison-card {
        min-height: 100%;
      }

      .comparison-card ul {
        margin: 14px 0 0;
        padding-left: 18px;
        color: var(--muted);
        line-height: 1.7;
      }

      .footer {
        margin-top: 34px;
        padding-top: 20px;
        border-top: 1px solid var(--line);
        color: var(--muted);
        font-size: 14px;
      }

      @media (max-width: 980px) {
        .hero,
        .story-grid,
        .feature-grid,
        .demo-grid,
        .pricing-grid,
        .comparison-grid {
          grid-template-columns: 1fr;
        }

        .pricing-card--early {
          transform: none;
        }
      }

      @media (max-width: 640px) {
        .page {
          width: min(100vw - 20px, 1180px);
          padding-top: 16px;
        }

        .nav {
          flex-direction: column;
          align-items: flex-start;
        }

        .hero,
        .section {
          padding: 22px;
        }

        h1 {
          font-size: 42px;
        }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <header class="nav">
        <div class="brand">
          <div class="brand__mark"><div class="brand__ball"></div></div>
          <div class="brand__copy">
            <small>Foot Analysis</small>
            <strong>${copy.brandTitle}</strong>
          </div>
        </div>
        <div class="nav__links">
          <div class="language-switch">
            <a class="language-pill${activeEnClass}" href="/?lang=en">${copy.languageEnglish}</a>
            <a class="language-pill${activePtClass}" href="/?lang=pt-BR">${copy.languagePortuguese}</a>
          </div>
        </div>
      </header>

      <section class="hero">
        <div class="hero__copy">
          <span class="eyebrow">${copy.heroEyebrow}</span>
          <h1>${copy.heroTitle}</h1>
          <p class="hero__subcopy">
            ${copy.heroSubcopy}
          </p>
          <div class="hero__actions">
            <a class="button button--primary" href="/billing/plans">${copy.heroPrimaryCta}</a>
            <a class="button button--ghost" href="mailto:${pricing.supportEmail}?subject=Live%20Match%20Impact%20Beta">
              ${copy.heroSecondaryCta}
            </a>
          </div>
          <div class="hero__proof">
            <span class="proof-pill">${copy.proofLanguages}</span>
            <span class="proof-pill">${copy.proofInfra}</span>
            <span class="proof-pill">${copy.proofSpeed}</span>
          </div>
        </div>

        <div class="mockup-shell">
          <div class="mockup-header">
            <div class="mockup-header__copy">
              <span class="mini-label">Foot Analysis</span>
              <strong>Live Match Impact</strong>
            </div>
            <span class="proof-pill">67'</span>
          </div>

          <div class="mockup-score">ARS 1-0 CHE</div>
          <div class="mockup-note">${locale === "pt-BR" ? "Arsenal entra no top 4 e Chelsea sai dele." : "Arsenal enters the top four and Chelsea falls out of it."}</div>

          <div class="mockup-banner">
            <span class="mini-label">${copy.mockupGoalImpact}</span>
            <strong>${copy.mockupGoalImpactLine}</strong>
          </div>

          <div class="mockup-grid">
            <div class="mockup-card">
              <span class="mini-label">${copy.mockupTableImpact}</span>
              <div class="mockup-card__row">
                <span>Arsenal</span>
                <strong>4th (+1)</strong>
              </div>
              <div class="mockup-card__row">
                <span>Chelsea</span>
                <strong>5th (-1)</strong>
              </div>
            </div>

            <div class="mockup-card">
              <span class="mini-label">${copy.mockupCompetitionImpact}</span>
              <div class="mockup-note">${copy.mockupCompetitionNote}</div>
            </div>

            <div class="mockup-card">
              <span class="mini-label">${copy.mockupRoundContext}</span>
              <div class="mockup-round">
                <div class="mockup-round__item"><strong>LIV 2-1 TOT</strong> 73'</div>
                <div class="mockup-round__item"><strong>AVL 0-0 NEW</strong> HT</div>
                <div class="mockup-round__item"><strong>FUL 1-1 BHA</strong> Final</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="sections">
        <section class="section">
          <span class="section__eyebrow">${copy.whyEyebrow}</span>
          <h2>${copy.whyTitle}</h2>
          <p>${copy.whyBody}</p>
          <div class="story-grid">
            <article class="story-card">
              <div class="story-number">1</div>
              <h3>${copy.story1Title}</h3>
              <p>${copy.story1Body}</p>
            </article>
            <article class="story-card">
              <div class="story-number">2</div>
              <h3>${copy.story2Title}</h3>
              <p>${copy.story2Body}</p>
            </article>
            <article class="story-card">
              <div class="story-number">3</div>
              <h3>${copy.story3Title}</h3>
              <p>${copy.story3Body}</p>
            </article>
          </div>
        </section>

        <section class="section">
          <span class="section__eyebrow">${copy.feelEyebrow}</span>
          <h2>${copy.feelTitle}</h2>
          <div class="feature-grid">
            <article class="feature-card">
              <h3>${copy.feature1Title}</h3>
              <p>${copy.feature1Body}</p>
            </article>
            <article class="feature-card">
              <h3>${copy.feature2Title}</h3>
              <p>${copy.feature2Body}</p>
            </article>
            <article class="feature-card">
              <h3>${copy.feature3Title}</h3>
              <p>${copy.feature3Body}</p>
            </article>
            <article class="feature-card">
              <h3>${copy.feature4Title}</h3>
              <p>${copy.feature4Body}</p>
            </article>
          </div>
        </section>

        <section class="section">
          <span class="section__eyebrow">${copy.differenceEyebrow}</span>
          <h2>${copy.differenceTitle}</h2>
          <p>${copy.differenceBody}</p>
          <div class="demo-grid">
            <article class="demo-card">
              <span class="tier-pill">${copy.freeLabel}</span>
              <h3>${copy.freeTierTitle}</h3>
              <div class="demo-phone">
                <div class="demo-phone__top">
                  <div>
                    <span class="mini-label">Live Match Impact</span>
                    <div class="demo-phone__title">ARS 1-0 CHE</div>
                  </div>
                  <span class="demo-phone__status">67'</span>
                </div>
                <div class="demo-block">
                  <span class="mini-label">${copy.demoTableImpact}</span>
                  <div class="demo-line"><span>Arsenal</span><strong>4th (+1)</strong></div>
                  <div class="demo-line"><span>Chelsea</span><strong>5th (-1)</strong></div>
                </div>
                <div class="demo-block">
                  <span class="mini-label">${copy.demoCompetitionImpact}</span>
                  <div class="demo-note">${copy.demoCompetitionNote}</div>
                </div>
                <div class="demo-block demo-block--locked">
                  <span class="mini-label">${copy.demoWhatProAdds}</span>
                  <div class="demo-lock">${copy.demoProAddsNote}</div>
                </div>
              </div>
            </article>

            <article class="demo-card demo-card--pro">
              <span class="tier-pill">${copy.proLabel}</span>
              <h3>${copy.proTierTitle}</h3>
              <div class="demo-phone">
                <div class="demo-phone__top">
                  <div>
                    <span class="mini-label">Live Match Impact</span>
                    <div class="demo-phone__title">America-RN 1-0 Sport</div>
                  </div>
                  <span class="demo-phone__status">74'</span>
                </div>
                <div class="demo-block">
                  <span class="mini-label">${copy.demoGroupPosition}</span>
                  <div class="demo-note">${copy.demoGroupPositionNote}</div>
                </div>
                <div class="demo-block">
                  <span class="mini-label">${copy.demoPreMatchDepth}</span>
                  <div class="demo-note">${copy.demoPreMatchDepthNote}</div>
                </div>
                <div class="demo-block">
                  <span class="mini-label">${copy.demoCompetitionReading}</span>
                  <div class="demo-note">${copy.demoCompetitionReadingNote}</div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section class="section">
          <span class="section__eyebrow">${copy.pricingEyebrow}</span>
          <h2>${copy.pricingTitle}</h2>
          <p>${copy.pricingBody}</p>
          <div class="pricing-grid">
            <article class="pricing-card">
              <span class="mini-label">${copy.pricingFreeLabel}</span>
              <h3>${freePlanName}</h3>
              <div class="price">${copy.freePrice}</div>
              <div class="pricing-card__copy">${localizedPlans.free.tagline}</div>
              <div class="bullet-list">
                ${localizedPlans.free.features.map((feature) => `<div class="bullet">${feature}</div>`).join("")}
              </div>
            </article>

            <article class="pricing-card pricing-card--early">
              ${earlyBird.active ? `<div class="pricing-badge">${earlyBird.badge}</div>` : ""}
              <span class="mini-label">${copy.pricingEarlyLabel}</span>
              <h3>${earlyBird.name}</h3>
              <div class="price">${earlyBirdPrice}<small>${copy.pricePerMonthForever}</small></div>
              <div class="pricing-card__copy">${copy.earlyBirdCopy}</div>
              <div class="offer-note">
                <strong>${earlyBird.remaining}</strong> ${copy.earlyBirdAvailability}
                <strong>${earlyBird.maxClaims}</strong>.
              </div>
              <div class="hero__actions" style="margin-top:16px;">
                <a class="button button--primary" href="/billing/plans">${copy.claimEarlyBird}</a>
              </div>
            </article>

            <article class="pricing-card pricing-card--pro">
              <span class="mini-label">${copy.pricingProLabel}</span>
              <h3>${proPlanName}</h3>
              <div class="price">${regularPrice}<small>${copy.pricePerMonth}</small></div>
              <div class="pricing-card__copy">${localizedPlans.pro.tagline}</div>
              <div class="bullet-list">
                ${localizedPlans.pro.features.map((feature) => `<div class="bullet">${feature}</div>`).join("")}
              </div>
            </article>
          </div>
        </section>

        <section class="section">
          <span class="section__eyebrow">${copy.betaEyebrow}</span>
          <h2>${copy.betaTitle}</h2>
          <div class="comparison-grid">
            <article class="comparison-card">
              <h3>${copy.betaUsersTitle}</h3>
              <ul>
                <li>${copy.betaUsersBullet1}</li>
                <li>${copy.betaUsersBullet2}</li>
                <li>${copy.betaUsersBullet3}</li>
              </ul>
            </article>
            <article class="comparison-card">
              <h3>${copy.betaRefiningTitle}</h3>
              <ul>
                <li>${copy.betaRefiningBullet1}</li>
                <li>${copy.betaRefiningBullet2}</li>
                <li>${copy.betaRefiningBullet3}</li>
              </ul>
            </article>
          </div>
        </section>
      </div>

      <footer class="footer">
        ${copy.footerLead}
        <a href="mailto:${pricing.supportEmail}">${pricing.supportEmail}</a>
      </footer>
    </div>
  </body>
</html>`;
}
