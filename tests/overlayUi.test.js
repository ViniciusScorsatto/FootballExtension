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
  const contentScript = await readProjectFile("apps/extension/content.js");

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
  const contentScript = await readProjectFile("apps/extension/content.js");

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
  const stylesheet = await readProjectFile("apps/extension/styles.css");

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
  const contentScript = await readProjectFile("apps/extension/content.js");
  const sidepanelScript = await readProjectFile("apps/extension/sidepanel.js");
  const i18n = await readProjectFile("apps/extension/i18n.js");

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
  const contentScript = await readProjectFile("apps/extension/content.js");
  const sidepanelScript = await readProjectFile("apps/extension/sidepanel.js");
  const stylesheet = await readProjectFile("apps/extension/styles.css");
  const i18n = await readProjectFile("apps/extension/i18n.js");

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
  const contentScript = await readProjectFile("apps/extension/content.js");
  const sidepanelScript = await readProjectFile("apps/extension/sidepanel.js");

  assert.match(contentScript, /predictionAdviceMentionsGoals\(localizedAdvice, prediction\.underOver\)/);
  assert.match(contentScript, /const normalizedPhrase = direction === "-" \? `under \$\{value\}` : `over \$\{value\}`;/);
  assert.match(contentScript, /if \(prediction\.underOver && !adviceIncludesGoals\)/);

  assert.match(sidepanelScript, /predictionAdviceMentionsGoals\(localizedAdvice, prediction\.underOver\)/);
  assert.match(sidepanelScript, /const normalizedPhrase = direction === "-" \? `under \$\{value\}` : `over \$\{value\}`;/);
  assert.match(sidepanelScript, /if \(prediction\.underOver && !adviceIncludesGoals\)/);
});

test("pre-match sections no longer duplicate summary text above the cards", async () => {
  const contentScript = await readProjectFile("apps/extension/content.js");
  const sidepanelScript = await readProjectFile("apps/extension/sidepanel.js");

  assert.match(contentScript, /elements\.prematchList\.innerHTML = "";/);
  assert.doesNotMatch(contentScript, /function buildPrematchItems\(payload\)/);

  assert.match(sidepanelScript, /elements\.prematchList\.innerHTML = "";/);
  assert.doesNotMatch(sidepanelScript, /function buildPrematchItems\(payload\)/);
});

test("lineup cards render the full starting XI instead of a short preview", async () => {
  const contentScript = await readProjectFile("apps/extension/content.js");
  const sidepanelScript = await readProjectFile("apps/extension/sidepanel.js");

  assert.match(contentScript, /\(entry\.startXI \|\| \[\]\)\.map\(getLineupPlayerName\)\.filter\(Boolean\)\.join\(", "\)/);
  assert.doesNotMatch(contentScript, /slice\(0,\s*4\)\.join\(", "\)/);

  assert.match(sidepanelScript, /\(entry\.startXI \|\| \[\]\)\.map\(getLineupPlayerName\)\.filter\(Boolean\)\.join\(", "\)/);
  assert.doesNotMatch(sidepanelScript, /slice\(0,\s*4\)\.join\(", "\)/);
});

test("lineup cards render a formation pitch when the XI and shape are available", async () => {
  const contentScript = await readProjectFile("apps/extension/content.js");
  const sidepanelScript = await readProjectFile("apps/extension/sidepanel.js");
  const stylesheet = await readProjectFile("apps/extension/styles.css");
  const i18n = await readProjectFile("apps/extension/i18n.js");

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
  const contentScript = await readProjectFile("apps/extension/content.js");
  const sidepanelScript = await readProjectFile("apps/extension/sidepanel.js");
  const stylesheet = await readProjectFile("apps/extension/styles.css");
  const i18n = await readProjectFile("apps/extension/i18n.js");

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
  const contentScript = await readProjectFile("apps/extension/content.js");
  const sidepanelScript = await readProjectFile("apps/extension/sidepanel.js");
  const i18n = await readProjectFile("apps/extension/i18n.js");

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
  const contentScript = await readProjectFile("apps/extension/content.js");
  const sidepanelScript = await readProjectFile("apps/extension/sidepanel.js");

  assert.match(contentScript, /const label = pieces\.filter\(Boolean\)\.join\(" · "\);/);
  assert.match(contentScript, /return event\.message \|\| "";/);

  assert.match(sidepanelScript, /const label = pieces\.filter\(Boolean\)\.join\(" · "\);/);
  assert.match(sidepanelScript, /return event\.message \|\| "";/);
});

test("goal timeline renders scorer history while the sidepanel summary stays focused on impact", async () => {
  const contentScript = await readProjectFile("apps/extension/content.js");
  const sidepanelScript = await readProjectFile("apps/extension/sidepanel.js");
  const sidepanelHtml = await readProjectFile("apps/extension/sidepanel.html");
  const stylesheet = await readProjectFile("apps/extension/styles.css");

  assert.match(contentScript, /<div class="lmi-goal-timeline is-hidden"><\/div>/);
  assert.match(contentScript, /renderGoalTimeline\(elements\.goalTimeline, payload\.goal_timeline\);/);
  assert.match(contentScript, /elements\.collapsedImpact\.textContent = localizedImpactSummary;/);

  assert.match(sidepanelHtml, /id="sidepanelGoalTimeline" class="lmi-goal-timeline is-hidden"/);
  assert.match(sidepanelScript, /goalTimeline: document\.getElementById\("sidepanelGoalTimeline"\)/);
  assert.match(sidepanelScript, /renderGoalTimeline\(elements\.goalTimeline, payload\.goal_timeline\);/);
  assert.match(sidepanelScript, /elements\.summary\.textContent = localizedImpactSummary;/);

  assert.match(stylesheet, /\.lmi-goal-timeline\s*\{/);
  assert.match(stylesheet, /\.lmi-goal-timeline__column--away\s*\{/);
  assert.match(stylesheet, /\.lmi-goal-timeline__item\s*\{/);
});

test("overlay and sidepanel share the branded top header while keeping the league label near the scoreboard", async () => {
  const contentScript = await readProjectFile("apps/extension/content.js");
  const sidepanelScript = await readProjectFile("apps/extension/sidepanel.js");
  const sidepanelHtml = await readProjectFile("apps/extension/sidepanel.html");
  const stylesheet = await readProjectFile("apps/extension/styles.css");

  assert.match(contentScript, /<div class="lmi-overlay-topbar">/);
  assert.match(contentScript, /lmi-overlay-brand-eyebrow/);
  assert.match(contentScript, /lmi-overlay-brand-subhead/);
  assert.match(contentScript, /lmi-overlay-plan-pill/);
  assert.match(contentScript, /elements\.topbarEyebrow\.textContent = translate\("popup\.eyebrow"\);/);
  assert.match(contentScript, /elements\.topbarSubhead\.textContent = translate\("popup\.subhead"\);/);
  assert.match(contentScript, /elements\.topbarPlanPill\.textContent = state\.billingPlan === "pro" \? translate\("popup\.proPlan"\) : translate\("popup\.freePlan"\);/);

  assert.match(contentScript, /<div class="lmi-scoreboard">/);
  assert.match(contentScript, /<div class="lmi-scoreboard-card">/);
  assert.match(contentScript, /lmi-scoreboard__team-name lmi-scoreboard__team-name--home/);
  assert.match(contentScript, /lmi-scoreboard__score/);
  assert.match(contentScript, /lmi-scoreboard__minute/);
  assert.match(contentScript, /showHeroScoreboard\(\{/);
  assert.match(contentScript, /scoreline: `\$\{payload\.score\.home\} - \$\{payload\.score\.away\}`/);

  assert.doesNotMatch(sidepanelHtml, /id="sidepanelLeagueEyebrow"/);
  assert.match(sidepanelHtml, /class="lmi-brand__copy lmi-brand__copy--surface"/);
  assert.match(sidepanelHtml, /class="lmi-panel-footer lmi-panel-footer--sidepanel"/);
  assert.match(sidepanelHtml, /id="sidepanelScoreboardCard" class="lmi-scoreboard-card"/);
  assert.match(sidepanelHtml, /id="sidepanelScoreboard" class="lmi-scoreboard"/);
  assert.match(sidepanelHtml, /id="sidepanelHomeTeamName" class="lmi-scoreboard__team-name lmi-scoreboard__team-name--home"/);
  assert.match(sidepanelHtml, /id="sidepanelScoreValue" class="lmi-scoreboard__score"/);
  assert.match(sidepanelHtml, /id="sidepanelScoreMinute" class="lmi-scoreboard__minute"/);
  assert.doesNotMatch(sidepanelScript, /leagueEyebrow/);
  assert.match(sidepanelScript, /showHeroScoreboard\(\{/);
  assert.match(sidepanelScript, /scoreline: `\$\{payload\.score\.home\} - \$\{payload\.score\.away\}`/);

  assert.match(stylesheet, /\.lmi-scoreboard\s*\{/);
  assert.match(stylesheet, /\.lmi-scoreboard-card\s*\{/);
  assert.match(stylesheet, /\.lmi-overlay-topbar\s*\{/);
  assert.match(stylesheet, /\.lmi-overlay-topbar__actions\s*\{/);
  assert.match(stylesheet, /\.lmi-brand__copy--surface\s*\{/);
  assert.match(stylesheet, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(74px,\s*auto\)\s*minmax\(0,\s*1fr\);/);
  assert.match(stylesheet, /width:\s*100%;/);
  assert.match(stylesheet, /\.lmi-scoreboard-card\s*\{[\s\S]*box-sizing:\s*border-box;/);
  assert.match(stylesheet, /\.lmi-scoreboard__team\s*\{[\s\S]*gap:\s*6px;[\s\S]*width:\s*100%;/);
  assert.match(stylesheet, /\.lmi-scoreboard__team--home\s*\{[\s\S]*align-items:\s*flex-start;/);
  assert.match(stylesheet, /\.lmi-scoreboard__team--away\s*\{[\s\S]*align-items:\s*flex-end;/);
  assert.match(stylesheet, /\.lmi-scoreboard__team-name\s*\{[\s\S]*font-size:\s*13px;[\s\S]*overflow-wrap:\s*anywhere;/);
  assert.match(stylesheet, /\.lmi-scoreboard__score\s*\{/);
  assert.match(stylesheet, /font-size:\s*28px;/);
  assert.match(stylesheet, /font-variant-numeric:\s*tabular-nums;/);
  assert.match(stylesheet, /white-space:\s*nowrap;/);
  assert.match(stylesheet, /\.lmi-scoreboard__minute\s*\{/);
  assert.match(stylesheet, /\.lmi-surface-meta\s*\{[\s\S]*flex-wrap:\s*nowrap;/);
  assert.match(stylesheet, /\.lmi-surface-pill,[\s\S]*\.lmi-surface-freshness\s*\{[\s\S]*font-size:\s*10px;[\s\S]*white-space:\s*nowrap;/);
  assert.match(stylesheet, /\.lmi-expanded__header\s*\{[\s\S]*flex-direction:\s*column;/);
});

test("table impact rows render movement as a badge instead of inline parenthetical text", async () => {
  const contentScript = await readProjectFile("apps/extension/content.js");
  const sidepanelScript = await readProjectFile("apps/extension/sidepanel.js");
  const stylesheet = await readProjectFile("apps/extension/styles.css");

  assert.match(contentScript, /lmi-impact-row__movement-badge/);
  assert.match(contentScript, /formatMovement\(tableImpact\.movement\)/);
  assert.doesNotMatch(contentScript, /`\(\\?\$\{formatMovement\(tableImpact\.movement\)\}\\?\)`/);

  assert.match(sidepanelScript, /lmi-impact-row__movement-badge/);
  assert.match(sidepanelScript, /formatMovement\(tableImpact\.movement\)/);
  assert.doesNotMatch(sidepanelScript, /`\(\\?\$\{formatMovement\(tableImpact\.movement\)\}\\?\)`/);

  assert.match(stylesheet, /\.lmi-impact-row\s*\{[\s\S]*display:\s*flex;[\s\S]*flex-wrap:\s*wrap;/);
  assert.match(stylesheet, /\.lmi-impact-row__team\s*\{[\s\S]*margin-right:\s*auto;/);
  assert.match(stylesheet, /\.lmi-impact-row__movement-badge\s*\{[\s\S]*border-radius:\s*999px;[\s\S]*font-size:\s*12px;/);
  assert.match(stylesheet, /\.lmi-impact-row__movement-badge\.is-up\s*\{/);
  assert.match(stylesheet, /\.lmi-impact-row__movement-badge\.is-down\s*\{/);
  assert.match(stylesheet, /\.lmi-impact-row__movement-badge\.is-flat\s*\{/);
});

test("competition and momentum insights use semantic accent rows instead of muted structural borders", async () => {
  const stylesheet = await readProjectFile("apps/extension/styles.css");

  assert.match(
    stylesheet,
    /\.lmi-competition-item\s*\{[\s\S]*border-left:\s*3px solid rgba\(31,\s*230,\s*194,\s*0\.95\);[\s\S]*background:\s*rgba\(18,\s*116,\s*104,\s*0\.22\);/
  );
  assert.match(
    stylesheet,
    /\.lmi-stat-insight\s*\{[\s\S]*border-left:\s*3px solid rgba\(61,\s*219,\s*137,\s*0\.95\);[\s\S]*background:\s*rgba\(43,\s*122,\s*88,\s*0\.22\);/
  );
});

test("score-only matches hide table and competition sections instead of showing fallback copy", async () => {
  const contentScript = await readProjectFile("apps/extension/content.js");
  const sidepanelScript = await readProjectFile("apps/extension/sidepanel.js");

  assert.match(contentScript, /const isScoreOnlyImpact = payload\.impact\?\.mode === "score-only";/);
  assert.match(
    contentScript,
    /elements\.tableSection\.classList\.toggle\("is-hidden", isPrematch \|\| isCupImpact \|\| isScoreOnlyImpact\);/
  );
  assert.match(
    contentScript,
    /elements\.competitionSection\.classList\.toggle\("is-hidden", isPrematch \|\| isScoreOnlyImpact\);/
  );

  assert.match(sidepanelScript, /const isScoreOnlyImpact = payload\.impact\?\.mode === "score-only";/);
  assert.match(
    sidepanelScript,
    /elements\.tableSection\.classList\.toggle\("is-hidden", isPrematch \|\| isCupImpact \|\| isScoreOnlyImpact\);/
  );
  assert.match(
    sidepanelScript,
    /elements\.competitionSection\.classList\.toggle\("is-hidden", isPrematch \|\| isScoreOnlyImpact\);/
  );
});

test("sidepanel does not show format-context warnings for prematch league fixtures", async () => {
  const sidepanelScript = await readProjectFile("apps/extension/sidepanel.js");

  assert.match(
    sidepanelScript,
    /if \(!isProPlan\(\) \|\| payload\.status\?\.phase === "upcoming"\) \{\s*elements\.formatSection\.classList\.add\("is-hidden"\);/
  );
});

test("free plan hides pro-only prematch and format analysis in the live surfaces", async () => {
  const contentScript = await readProjectFile("apps/extension/content.js");
  const sidepanelScript = await readProjectFile("apps/extension/sidepanel.js");

  assert.match(contentScript, /function isProPlan\(\) \{\s*return state\.billingPlan === "pro" && state\.billingStatus === "active";\s*\}/);
  assert.match(
    contentScript,
    /if \(!isProPlan\(\) \|\| payload\.status\.phase !== "upcoming" \|\| !payload\.prematch\) \{\s*elements\.prematchSection\.classList\.add\("is-hidden"\);[\s\S]*elements\.predictionsGrid\.innerHTML = "";\s*elements\.lineupsGrid\.innerHTML = "";\s*elements\.injuriesGrid\.innerHTML = "";\s*return;\s*\}/
  );

  assert.match(sidepanelScript, /function isProPlan\(\) \{\s*return state\.billingPlan === "pro" && state\.billingStatus === "active";\s*\}/);
  assert.match(
    sidepanelScript,
    /if \(!isProPlan\(\) \|\| payload\.status\?\.phase === "upcoming"\) \{\s*elements\.formatSection\.classList\.add\("is-hidden"\);[\s\S]*elements\.formatBody\.textContent = "";\s*return;\s*\}/
  );
  assert.match(
    sidepanelScript,
    /if \(!isProPlan\(\) \|\| payload\.status\.phase !== "upcoming" \|\| !payload\.prematch\) \{\s*elements\.prematchSection\.classList\.add\("is-hidden"\);[\s\S]*elements\.predictionsGrid\.innerHTML = "";\s*elements\.lineupsGrid\.innerHTML = "";\s*elements\.injuriesGrid\.innerHTML = "";\s*return;\s*\}/
  );
});

test("popup hides the advanced manual-fixture card on free and only expands it for pro", async () => {
  const popupHtml = await readProjectFile("apps/extension/popup.html");
  const popupScript = await readProjectFile("apps/extension/popup.js");

  assert.match(popupHtml, /<section id="advancedOptionsCard" class="lmi-advanced-card">/);
  assert.match(popupScript, /const advancedOptionsCard = document\.getElementById\("advancedOptionsCard"\);/);
  assert.match(popupScript, /advancedOptionsCard\.hidden = !isProPlan\(\);/);
  assert.match(
    popupScript,
    /if \(!isProPlan\(\)\) \{[\s\S]*advancedOptionsExpanded = false;[\s\S]*advancedContent\.hidden = true;/
  );
  assert.match(popupScript, /advancedOptionsExpanded = isProPlan\(\) && Boolean\(storedFixtureId\);/);
  assert.match(popupScript, /renderBillingCard\(\);\s*[\r\n]+\s*updatePlanHint\(\);\s*[\r\n]+\s*renderAdvancedOptions\(\);/);
});

test("popup billing card uses the shared pricing catalog instead of a hardcoded Early Bird price", async () => {
  const popupScript = await readProjectFile("apps/extension/popup.js");

  assert.match(popupScript, /let currentPricingCatalog = \{/);
  assert.match(popupScript, /function getEarlyBirdDisplayPrice\(\) \{/);
  assert.match(popupScript, /async function fetchPricingCatalog\(\) \{/);
  assert.match(popupScript, /function createPopupSdkClient\(backendUrl\) \{/);
  assert.match(popupScript, /const payload = await createPopupSdkClient\(backendUrl\)\.getBillingPlans\(\);/);
  assert.match(popupScript, /price: formatPrice\(getEarlyBirdDisplayPrice\(\)\),/);
  assert.doesNotMatch(popupScript, /price: formatPrice\(3\.99\)/);
  assert.match(popupScript, /await fetchPricingCatalog\(\);\s*[\r\n]+\s*await fetchBillingStatus\(\);/);
  assert.match(popupScript, /await fetchPricingCatalog\(\);\s*[\r\n]+\s*await refreshBillingStatusWithRecovery\(\);/);
});

test("popup uses a text-first topbar and moves the Foot Analysis logo to the footer", async () => {
  const popupHtml = await readProjectFile("apps/extension/popup.html");
  const stylesheet = await readProjectFile("apps/extension/styles.css");

  assert.match(popupHtml, /<div class="lmi-popup__topbar">/);
  assert.match(popupHtml, /class="lmi-brand__copy lmi-brand__copy--surface"/);
  assert.doesNotMatch(popupHtml, /<div class="lmi-brand__mark">/);
  assert.match(popupHtml, /class="lmi-panel-footer lmi-panel-footer--popup"/);
  assert.match(stylesheet, /\.lmi-popup__topbar\s*\{/);
  assert.match(stylesheet, /\.lmi-panel-footer--popup\s*\{/);
});

test("popup uses a single toggle button for start and stop tracking", async () => {
  const popupHtml = await readProjectFile("apps/extension/popup.html");
  const popupScript = await readProjectFile("apps/extension/popup.js");

  assert.match(popupHtml, /<button id="startTracking" class="lmi-button lmi-button--primary" type="button">/);
  assert.doesNotMatch(popupHtml, /id="stopTracking"/);

  assert.match(popupScript, /let currentTrackingEnabled = false;/);
  assert.match(popupScript, /function renderTrackingButton\(\) \{/);
  assert.match(popupScript, /startButton\.textContent = currentTrackingEnabled\s*\?\s*translate\("popup\.stopTracking"\)\s*:\s*translate\("popup\.startTracking"\);/);
  assert.match(popupScript, /startButton\.classList\.toggle\("lmi-button--primary", !currentTrackingEnabled\);/);
  assert.match(popupScript, /startButton\.classList\.toggle\("lmi-button--ghost", currentTrackingEnabled\);/);
  assert.match(popupScript, /startButton\.addEventListener\("click", \(\) => \{/);
  assert.match(popupScript, /if \(currentTrackingEnabled\) \{\s*void handleStopTracking\(\);/);
  assert.match(popupScript, /chrome\.storage\.onChanged\.addListener\(\(changes, area\) => \{/);
});

test("popup pings existing overlay before reinjecting and relies on storage changes for tracking updates", async () => {
  const popupScript = await readProjectFile("apps/extension/popup.js");
  const contentScript = await readProjectFile("apps/extension/content.js");

  assert.match(popupScript, /async function pingContentScript\(tabId\)/);
  assert.match(popupScript, /type:\s*"LMI_PING"/);
  assert.match(popupScript, /const alreadyInjected = await pingContentScript\(activeTab\.id\);/);
  assert.match(popupScript, /if \(alreadyInjected\) \{\s*return;\s*\}/);
  assert.doesNotMatch(popupScript, /notifyActiveTab\(\{\s*type:\s*"LMI_TRACKING_UPDATED"/);
  assert.doesNotMatch(popupScript, /notifyActiveTab\(\{\s*type:\s*"LMI_TRACKING_STOPPED"/);

  assert.match(contentScript, /if \(message\?\.type === "LMI_PING"\) \{/);
  assert.match(contentScript, /sendResponse\(\{\s*ok:\s*true\s*\}\);/);
});

test("starting tracking preserves sidepanel mode only when the sidepanel session is active", async () => {
  const popupScript = await readProjectFile("apps/extension/popup.js");
  const sidepanelScript = await readProjectFile("apps/extension/sidepanel.js");

  assert.match(
    popupScript,
    /const currentSettings = await chrome\.storage\.sync\.get\(\[\s*"activeViewMode",\s*"sidepanelSessionActive"\s*\]\);/
  );
  assert.match(
    popupScript,
    /currentSettings\.activeViewMode === "sidepanel" && currentSettings\.sidepanelSessionActive/
  );
  assert.match(popupScript, /activeViewMode:\s*preferredViewMode,/);
  assert.match(sidepanelScript, /sidepanelSessionActive:\s*true/);
  assert.match(sidepanelScript, /sidepanelSessionActive:\s*false/);
});

test("open sidepanel follows the tracked fixture even when popup writes overlay as active view", async () => {
  const sidepanelScript = await readProjectFile("apps/extension/sidepanel.js");

  assert.match(
    sidepanelScript,
    /if \(\s*!state\.trackingEnabled \|\|\s*\(!state\.fixtureId && !state\.scenarioModeEnabled\)\s*\) \{/
  );
  assert.doesNotMatch(sidepanelScript, /state\.activeViewMode !== "sidepanel"/);
});

test("overlay and sidepanel resync immediately when scenario mode settings change", async () => {
  const contentScript = await readProjectFile("apps/extension/content.js");
  const sidepanelScript = await readProjectFile("apps/extension/sidepanel.js");

  assert.match(contentScript, /changes\.scenarioModeEnabled \|\|/);
  assert.match(contentScript, /changes\.scenarioPayloadPath \|\|/);

  assert.match(sidepanelScript, /changes\.scenarioModeEnabled \|\|/);
  assert.match(sidepanelScript, /changes\.scenarioPayloadPath \|\|/);
});

test("prediction cards localize API advice text through the shared helper", async () => {
  const contentScript = await readProjectFile("apps/extension/content.js");
  const sidepanelScript = await readProjectFile("apps/extension/sidepanel.js");
  const i18n = await readProjectFile("apps/extension/i18n.js");

  assert.match(contentScript, /const localizedAdvice = translatePredictionAdvice\(state\.language, prediction\.advice\);/);
  assert.match(contentScript, /predictionAdviceMentionsGoals\(localizedAdvice, prediction\.underOver\)/);

  assert.match(sidepanelScript, /const localizedAdvice = translatePredictionAdvice\(state\.language, prediction\.advice\);/);
  assert.match(sidepanelScript, /predictionAdviceMentionsGoals\(localizedAdvice, prediction\.underOver\)/);

  assert.match(i18n, /function translatePredictionAdvice\(language, advice\)/);
  assert.match(i18n, /Double chance/);
});

test("popup ensures a billing user id exists before restore and checkout requests", async () => {
  const popupScript = await readProjectFile("apps/extension/popup.js");

  assert.match(popupScript, /window\.LMI_SDK\.createChromeRuntimeSdk\(\{/);
  assert.match(popupScript, /async function ensureBillingUserId\(\) \{/);
  assert.match(popupScript, /currentBilling\.userId = createBillingUserId\(\);/);
  assert.match(popupScript, /await chrome\.storage\.sync\.set\(\{\s*billingUserId:\s*currentBilling\.userId\s*\}\);/);
  assert.match(popupScript, /const userId = await ensureBillingUserId\(\);/);
  assert.match(popupScript, /createCheckoutSession\(\{\s*userId,/s);
  assert.match(popupScript, /requestMagicLink\(\{\s*userId,/s);
});
