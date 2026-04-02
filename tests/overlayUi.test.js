import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

async function readProjectFile(relativePath) {
  return readFile(path.join(rootDir, relativePath), "utf8");
}

test("collapsed overlay card includes home and away badge slots", async () => {
  const contentScript = await readProjectFile("extension/content.js");

  assert.match(
    contentScript,
    /lmi-collapsed-card__badge lmi-collapsed-card__badge--home is-hidden/
  );
  assert.match(
    contentScript,
    /lmi-collapsed-card__badge lmi-collapsed-card__badge--away is-hidden/
  );
  assert.match(contentScript, /collapsedHomeBadge:\s*root\.querySelector\("\.lmi-collapsed-card__badge--home"\)/);
  assert.match(contentScript, /collapsedAwayBadge:\s*root\.querySelector\("\.lmi-collapsed-card__badge--away"\)/);
});

test("collapsed overlay render populates badge logos from the tracked teams", async () => {
  const contentScript = await readProjectFile("extension/content.js");

  assert.match(
    contentScript,
    /setBadge\(elements\.collapsedHomeBadge,\s*payload\.teams\.home\.logo,\s*payload\.teams\.home\.name\);/
  );
  assert.match(
    contentScript,
    /setBadge\(elements\.collapsedAwayBadge,\s*payload\.teams\.away\.logo,\s*payload\.teams\.away\.name\);/
  );
});

test("collapsed overlay badge styling keeps the compact layout intact", async () => {
  const stylesheet = await readProjectFile("extension/styles.css");

  assert.match(
    stylesheet,
    /\.lmi-collapsed-card__score\s*\{[\s\S]*display:\s*flex;[\s\S]*align-items:\s*center;[\s\S]*gap:\s*8px;[\s\S]*\}/
  );
  assert.match(
    stylesheet,
    /\.lmi-collapsed-card__badge\s*\{[\s\S]*width:\s*16px;[\s\S]*height:\s*16px;[\s\S]*object-fit:\s*contain;[\s\S]*\}/
  );
});

test("finished matches switch momentum sections into final-stats mode", async () => {
  const contentScript = await readProjectFile("extension/content.js");
  const sidepanelScript = await readProjectFile("extension/sidepanel.js");
  const i18n = await readProjectFile("extension/i18n.js");

  assert.match(
    contentScript,
    /momentumSection\.classList\.toggle\("is-hidden", isPrematch \|\| \(isFinished && !hasStatistics\)\);/
  );
  assert.match(contentScript, /momentumMeter\.classList\.toggle\("is-hidden", isFinished\);/);
  assert.match(
    contentScript,
    /momentumLabel\.textContent = isFinished\s*\?\s*translate\("panel\.matchStats"\)\s*:\s*translate\("panel\.momentum"\);/
  );
  assert.match(contentScript, /const insightRows = isFinished\s*\?\s*""/);

  assert.match(
    sidepanelScript,
    /momentumSection\.classList\.toggle\("is-hidden", isPrematch \|\| \(isFinished && !hasStatistics\)\);/
  );
  assert.match(sidepanelScript, /momentumMeter\.classList\.toggle\("is-hidden", isFinished\);/);
  assert.match(
    sidepanelScript,
    /momentumLabel\.textContent = isFinished\s*\?\s*translate\("panel\.matchStats"\)\s*:\s*translate\("panel\.momentum"\);/
  );
  assert.match(sidepanelScript, /const insightRows = isFinished\s*\?\s*""/);

  assert.match(i18n, /matchStats:\s*"Match Stats"/);
  assert.match(i18n, /matchStats:\s*"Estatísticas da partida"/);
});

test("pre-match prediction cards use graphical comparison bars instead of text-only compare lines", async () => {
  const contentScript = await readProjectFile("extension/content.js");
  const sidepanelScript = await readProjectFile("extension/sidepanel.js");
  const stylesheet = await readProjectFile("extension/styles.css");
  const i18n = await readProjectFile("extension/i18n.js");

  assert.match(contentScript, /function renderPredictionCard\(payload, prediction\)/);
  assert.match(contentScript, /lmi-prediction-card__summary/);
  assert.match(contentScript, /lmi-prediction-card__comparisons/);
  assert.match(contentScript, /lmi-prediction-compare__track/);
  assert.match(contentScript, /translate\(`prematch\.predictionMetric\.\$\{entry\.key\}`\)/);
  assert.match(contentScript, /translate\("prematch\.predictionGoalsChip"/);
  assert.match(contentScript, /translate\("prematch\.predictionAdviceChip"/);

  assert.match(sidepanelScript, /function renderPredictionCard\(payload, prediction\)/);
  assert.match(sidepanelScript, /lmi-prediction-card__summary/);
  assert.match(sidepanelScript, /lmi-prediction-card__comparisons/);
  assert.match(sidepanelScript, /lmi-prediction-compare__track/);

  assert.match(stylesheet, /\.lmi-prediction-card__comparisons\s*\{/);
  assert.match(stylesheet, /\.lmi-prediction-compare__track\s*\{/);
  assert.match(stylesheet, /\.lmi-prediction-card__chips\s*\{/);
  assert.match(stylesheet, /\.lmi-prediction-chip\s*\{/);

  assert.match(i18n, /predictionMetric:\s*\{/);
  assert.match(i18n, /predictionGoalsChip:\s*"Goals \{value\}"/);
  assert.match(i18n, /predictionGoalsChip:\s*"Gols \{value\}"/);
});

test("prediction chips avoid duplicating the goal line when advice already includes it", async () => {
  const contentScript = await readProjectFile("extension/content.js");
  const sidepanelScript = await readProjectFile("extension/sidepanel.js");

  assert.match(contentScript, /predictionAdviceMentionsGoals\(prediction\.advice, prediction\.underOver\)/);
  assert.match(contentScript, /const normalizedPhrase = direction === "-" \? `under \$\{value\}` : `over \$\{value\}`;/);
  assert.match(contentScript, /if \(prediction\.underOver && !adviceIncludesGoals\)/);

  assert.match(sidepanelScript, /predictionAdviceMentionsGoals\(prediction\.advice, prediction\.underOver\)/);
  assert.match(sidepanelScript, /const normalizedPhrase = direction === "-" \? `under \$\{value\}` : `over \$\{value\}`;/);
  assert.match(sidepanelScript, /if \(prediction\.underOver && !adviceIncludesGoals\)/);
});

test("pre-match sections no longer duplicate summary text above the cards", async () => {
  const contentScript = await readProjectFile("extension/content.js");
  const sidepanelScript = await readProjectFile("extension/sidepanel.js");

  assert.match(contentScript, /elements\.prematchList\.innerHTML = "";/);
  assert.doesNotMatch(contentScript, /function buildPrematchItems\(payload\)/);

  assert.match(sidepanelScript, /elements\.prematchList\.innerHTML = "";/);
  assert.doesNotMatch(sidepanelScript, /function buildPrematchItems\(payload\)/);
});

test("lineup cards render the full starting XI instead of a short preview", async () => {
  const contentScript = await readProjectFile("extension/content.js");
  const sidepanelScript = await readProjectFile("extension/sidepanel.js");

  assert.match(contentScript, /\(entry\.startXI \|\| \[\]\)\.map\(getLineupPlayerName\)\.filter\(Boolean\)\.join\(", "\)/);
  assert.doesNotMatch(contentScript, /slice\(0,\s*4\)\.join\(", "\)/);

  assert.match(sidepanelScript, /\(entry\.startXI \|\| \[\]\)\.map\(getLineupPlayerName\)\.filter\(Boolean\)\.join\(", "\)/);
  assert.doesNotMatch(sidepanelScript, /slice\(0,\s*4\)\.join\(", "\)/);
});

test("lineup cards render a formation pitch when the XI and shape are available", async () => {
  const contentScript = await readProjectFile("extension/content.js");
  const sidepanelScript = await readProjectFile("extension/sidepanel.js");
  const stylesheet = await readProjectFile("extension/styles.css");
  const i18n = await readProjectFile("extension/i18n.js");

  assert.match(contentScript, /function buildFormationPitch\(entry\)/);
  assert.match(contentScript, /buildGridPitchLayout\(players\) \|\| buildFormationPitchLayout\(entry\.formation, players\)/);
  assert.match(contentScript, /parseGridCoordinates\(player\.grid\)/);
  assert.match(contentScript, /getLineupPlayerDotColor\(player, entry\)/);
  assert.match(contentScript, /outfieldRows:\s*rows/);
  assert.match(contentScript, /lmi-lineup-pitch/);
  assert.match(contentScript, /translate\("prematch\.lineupPitchAria"/);
  assert.match(contentScript, /normalizeHexColor\(rawColor\)/);
  assert.match(contentScript, /\$\{layout\.goalkeeperRows[\s\S]*\$\{layout\.outfieldRows/);

  assert.match(sidepanelScript, /function buildFormationPitch\(entry\)/);
  assert.match(sidepanelScript, /buildGridPitchLayout\(players\) \|\| buildFormationPitchLayout\(entry\.formation, players\)/);
  assert.match(sidepanelScript, /parseGridCoordinates\(player\.grid\)/);
  assert.match(sidepanelScript, /getLineupPlayerDotColor\(player, entry\)/);
  assert.match(sidepanelScript, /outfieldRows:\s*rows/);
  assert.match(sidepanelScript, /lmi-lineup-pitch/);
  assert.match(sidepanelScript, /translate\("prematch\.lineupPitchAria"/);
  assert.match(sidepanelScript, /normalizeHexColor\(rawColor\)/);
  assert.match(sidepanelScript, /\$\{layout\.goalkeeperRows[\s\S]*\$\{layout\.outfieldRows/);

  assert.match(stylesheet, /\.lmi-lineup-pitch\s*\{/);
  assert.match(stylesheet, /\.lmi-lineup-pitch__marking--midline\s*\{/);
  assert.match(stylesheet, /\.lmi-lineup-pitch__player\s*\{/);
  assert.match(stylesheet, /\.lmi-lineup-pitch__dot\s*\{/);

  assert.match(i18n, /lineupPitchAria:\s*"Formation layout \{value\}"/);
  assert.match(i18n, /lineupPitchAria:\s*"Esquema da formação \{value\}"/);
});

test("lineup cards include explicit coach labels and own the injuries content", async () => {
  const contentScript = await readProjectFile("extension/content.js");
  const sidepanelScript = await readProjectFile("extension/sidepanel.js");
  const stylesheet = await readProjectFile("extension/styles.css");
  const i18n = await readProjectFile("extension/i18n.js");

  assert.match(contentScript, /translate\("prematch\.coachLabel"/);
  assert.match(contentScript, /function renderLineupCardInjuries\(teamName, injuries\)/);
  assert.match(contentScript, /elements\.injuriesGrid\.innerHTML = "";/);
  assert.doesNotMatch(contentScript, /lmi-mini-card__title lmi-mini-card__title--icon/);

  assert.match(sidepanelScript, /translate\("prematch\.coachLabel"/);
  assert.match(sidepanelScript, /function renderLineupCardInjuries\(teamName, injuries\)/);
  assert.match(sidepanelScript, /elements\.injuriesGrid\.innerHTML = "";/);
  assert.doesNotMatch(sidepanelScript, /lmi-mini-card__title lmi-mini-card__title--icon/);

  assert.match(stylesheet, /\.lmi-lineup-card__injuries\s*\{/);

  assert.match(i18n, /coachLabel:\s*"Coach \{name\}"/);
  assert.match(i18n, /coachLabel:\s*"Técnico \{name\}"/);
});

test("overlay and side panel localize league and country display names through shared helpers", async () => {
  const contentScript = await readProjectFile("extension/content.js");
  const sidepanelScript = await readProjectFile("extension/sidepanel.js");
  const i18n = await readProjectFile("extension/i18n.js");

  assert.match(contentScript, /const localizedLeagueName = translateLeagueName\(state\.language, payload\.league\?\.name\);/);
  assert.match(contentScript, /const localizedHomeName = translateDisplayName\(state\.language, payload\.teams\.home\.name\);/);
  assert.match(contentScript, /const localizedAwayName = translateDisplayName\(state\.language, payload\.teams\.away\.name\);/);

  assert.match(sidepanelScript, /const localizedLeagueName = translateLeagueName\(state\.language, payload\.league\?\.name\);/);
  assert.match(sidepanelScript, /const localizedHomeName = translateDisplayName\(state\.language, payload\.teams\.home\.name\);/);
  assert.match(sidepanelScript, /const localizedAwayName = translateDisplayName\(state\.language, payload\.teams\.away\.name\);/);

  assert.match(i18n, /translateLeagueName/);
  assert.match(i18n, /\["Friendlies", "Amistosos"\]/);
  assert.match(i18n, /\["Brazil", "Brasil"\]/);
  assert.match(i18n, /scoreOnlyCompetitionDetail:/);
});

test("goal banners fall back to backend event messages when scorer fragments are missing", async () => {
  const contentScript = await readProjectFile("extension/content.js");
  const sidepanelScript = await readProjectFile("extension/sidepanel.js");

  assert.match(contentScript, /const label = pieces\.filter\(Boolean\)\.join\(" · "\);/);
  assert.match(contentScript, /return event\.message \|\| "";/);

  assert.match(sidepanelScript, /const label = pieces\.filter\(Boolean\)\.join\(" · "\);/);
  assert.match(sidepanelScript, /return event\.message \|\| "";/);
});
