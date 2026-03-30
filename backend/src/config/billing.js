export const BILLING_PLANS = {
  free: {
    id: "free",
    name: "Free",
    priceMonthlyUsd: 0,
    tagline: "Follow one match and feel the core impact instantly.",
    features: [
      "Track 1 live match at a time",
      "Curated league access",
      "Live score and basic table impact",
      "Goal event cards",
      "Round context strip",
      "English and Portuguese-BR"
    ]
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthlyUsd: null,
    tagline: "Unlock deeper live meaning, more leagues, and premium alerts.",
    features: [
      "All supported leagues",
      "Track up to 3 matches at once",
      "Projected group positions when scores hold",
      "Richer pre-match context",
      "Advanced competition-impact explanations",
      "Meaningful goal and zone-change alerts"
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
