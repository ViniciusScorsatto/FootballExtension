import assert from "node:assert/strict";
import test from "node:test";

await import("../extension/i18n.js");

const {
  normalizeLanguage,
  formatOrdinal,
  translateDisplayName,
  translateLeagueName,
  translateCompetitionMessage,
  buildImpactSummary
} = globalThis.LMI_I18N;

test("normalizeLanguage maps Portuguese variants to pt-BR", () => {
  assert.equal(normalizeLanguage("pt"), "pt-BR");
  assert.equal(normalizeLanguage("pt-br"), "pt-BR");
  assert.equal(normalizeLanguage("en-US"), "en");
});

test("formatOrdinal uses localized rank formats", () => {
  assert.equal(formatOrdinal("en", 2), "2nd");
  assert.equal(formatOrdinal("pt-BR", 2), "2º");
});

test("translateCompetitionMessage localizes known competition phrases", () => {
  assert.equal(
    translateCompetitionMessage("pt-BR", "Arsenal breaks into the top 4"),
    "Arsenal entra no top 4"
  );
  assert.equal(
    translateCompetitionMessage("pt-BR", "Leeds moves into the automatic promotion spots"),
    "Leeds entra nas vagas de acesso direto"
  );
  assert.equal(
    translateCompetitionMessage("pt-BR", "Bosnia & Herzegovina wins on penalties"),
    "Bósnia e Herzegovina vence nos pênaltis"
  );
  assert.equal(
    translateCompetitionMessage("pt-BR", "Italy must score to stay alive"),
    "Itália precisa marcar para seguir vivo"
  );
  assert.equal(
    translateCompetitionMessage("pt-BR", "Vitoria is one goal from forcing extra time"),
    "Vitoria está a um gol de forçar a prorrogação"
  );
  assert.equal(
    translateCompetitionMessage("pt-BR", "Live score only - no table impact for this competition."),
    "Somente placar ao vivo - sem impacto na tabela para esta competição."
  );
  assert.equal(
    translateCompetitionMessage("en", "Chelsea drops out of the top 4"),
    "Chelsea drops out of the top 4"
  );
});

test("translateDisplayName localizes supported country names for pt-BR", () => {
  assert.equal(translateDisplayName("pt-BR", "Brazil"), "Brasil");
  assert.equal(translateDisplayName("pt-BR", "Croatia"), "Croácia");
  assert.equal(translateDisplayName("pt-BR", "Bosnia and Herzegovina"), "Bósnia e Herzegovina");
  assert.equal(translateDisplayName("pt-BR", "USA"), "Estados Unidos");
  assert.equal(translateDisplayName("en", "Brazil"), "Brazil");
  assert.equal(translateDisplayName("pt-BR", "Cruzeiro"), "Cruzeiro");
});

test("translateLeagueName localizes supported league labels for pt-BR", () => {
  assert.equal(translateLeagueName("pt-BR", "Friendlies"), "Amistosos");
  assert.equal(
    translateLeagueName("pt-BR", "International Friendlies"),
    "Amistosos Internacionais"
  );
  assert.equal(translateLeagueName("en", "Friendlies"), "Friendlies");
});

test("buildImpactSummary renders localized movement summaries", () => {
  const summary = buildImpactSummary(
    "pt-BR",
    {
      table: {
        home: {
          teamName: "Arsenal",
          newPosition: 2,
          movement: 2
        },
        away: {
          teamName: "Chelsea",
          newPosition: 6,
          movement: -2
        }
      }
    },
    {
      home: {
        name: "Arsenal"
      },
      away: {
        name: "Chelsea"
      }
    }
  );

  assert.equal(summary, "Arsenal sobe para 2º (+2)");
});

test("buildImpactSummary uses safe localized summaries for limited and score-only modes", () => {
  assert.equal(
    buildImpactSummary("pt-BR", { mode: "limited" }, {}),
    "Formato especial de competição - impacto limitado na tabela"
  );
  assert.equal(buildImpactSummary("en", { mode: "score-only" }, {}), "Live score only");
});
