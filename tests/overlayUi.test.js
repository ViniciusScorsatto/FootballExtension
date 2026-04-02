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
