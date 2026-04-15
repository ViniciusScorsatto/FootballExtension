export const BILLING_PLANS = {
  free: {
    id: "free",
    name: "Free",
    priceMonthlyUsd: 0,
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
    id: "pro",
    name: "Pro",
    priceMonthlyUsd: null,
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

export const BILLING_OFFERS = {
  early_bird_lifetime: {
    id: "early_bird_lifetime",
    name: "Early Bird Pro",
    badge: "Beta",
    description: "Lifetime discounted Pro pricing for the first paying users.",
    appliesToPlan: "pro",
    kind: "lifetime_discount"
  }
};
