import test from "node:test";
import assert from "node:assert/strict";

import { renderMarketingPage } from "../backend/src/views/marketingPage.js";

const pricing = {
  currency: "USD",
  supportEmail: "hello@example.com",
  plans: {
    free: {
      name: "Free",
      priceMonthlyUsd: 0
    },
    pro: {
      name: "Pro",
      priceMonthlyUsd: 9.9
    }
  },
  offers: {
    early_bird_lifetime: {
      name: "Early Bird Pro",
      badge: "Beta",
      active: true,
      priceMonthlyUsd: 4.9,
      remaining: 12,
      maxClaims: 100
    }
  }
};

test("marketing page renders English by default with language switcher", () => {
  const html = renderMarketingPage({ pricing });

  assert.match(html, /<html lang="en">/);
  assert.match(html, />🇺🇸 EN</);
  assert.match(html, />🇧🇷 PT-BR</);
  assert.match(html, /href="\/\?lang=en"/);
  assert.match(html, /href="\/\?lang=pt-BR"/);
  assert.match(html, /Instant understanding of what a goal changes\./);
  assert.match(html, /Pricing API/);
});

test("marketing page renders pt-BR copy when requested", () => {
  const html = renderMarketingPage({ pricing, language: "pt-BR" });

  assert.match(html, /<html lang="pt-BR">/);
  assert.match(html, /Entenda na hora o que um gol muda\./);
  assert.match(html, /Preços da API/);
  assert.match(html, /Acompanhe uma partida de liga em destaque/);
  assert.match(html, /Garantir Early Bird/);
});
