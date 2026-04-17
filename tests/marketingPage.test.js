import test from "node:test";
import assert from "node:assert/strict";

import { renderMarketingPage } from "../apps/api/src/views/marketingPage.js";

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
  assert.doesNotMatch(html, /Pricing API/);
});

test("marketing page renders pt-BR copy when requested", () => {
  const html = renderMarketingPage({ pricing, language: "pt-BR" });

  assert.match(html, /<html lang="pt-BR">/);
  assert.match(html, /Entenda na hora o que um gol muda\./);
  assert.doesNotMatch(html, /Preços da API/);
  assert.match(html, /Acompanhe uma partida de liga em destaque/);
  assert.match(html, /Garantir Early Bird/);
});

test("marketing page features Early Bird between Free and Pro", () => {
  const html = renderMarketingPage({ pricing, language: "pt-BR" });
  const freeIndex = html.indexOf("<h3>Free</h3>");
  const earlyBirdIndex = html.indexOf("<h3>Early Bird Pro</h3>");
  const proIndex = html.lastIndexOf("<h3>Pro</h3>");

  assert.ok(freeIndex >= 0, "expected Free card");
  assert.ok(earlyBirdIndex > freeIndex, "expected Early Bird after Free");
  assert.ok(proIndex > earlyBirdIndex, "expected Pro after Early Bird");
});

test("marketing page includes a free vs pro matrix without implying side panel is pro-only", () => {
  const html = renderMarketingPage({ pricing });

  assert.match(html, /What Free includes and what Pro adds/);
  assert.match(html, /<th>Area<\/th>/);
  assert.match(html, /<td>League access<\/td>/);
  assert.match(html, /<td>Featured leagues<\/td>/);
  assert.match(html, /<td>All supported leagues<\/td>/);
  assert.doesNotMatch(html, /Manual fixture fallback/);
  assert.doesNotMatch(html, /Fallback por fixture manual/);
  assert.doesNotMatch(html, /Side panel deep-view mode/);
  assert.match(html, /Deeper pre-match and competition reading/);
});
