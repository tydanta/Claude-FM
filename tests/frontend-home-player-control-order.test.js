import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const controls = html.match(/<div class="controls">(?<content>[\s\S]*?)<\/div>\s*<div id="queuePopover"/);

assert.ok(controls, "home player controls block should exist");

const buttonIds = [...controls.groups.content.matchAll(/<button\s+id="([^"]+)"/g)].map((match) => match[1]);

assert.deepEqual(
  buttonIds,
  ["likeBtn", "fmBtn", "prevBtn", "playBtn", "nextBtn", "playModeBtn", "queueToggle"],
  "home player controls should be ordered as like, FM, previous, play, next, mode, queue"
);

const recommendGrid = html.match(/<div class="radio-recommend-grid">(?<content>[\s\S]*?)<\/div>\s*<div id="radioRecommendPanel"/);

assert.ok(recommendGrid, "home recommend grid should exist");
assert.deepEqual(
  [...recommendGrid.groups.content.matchAll(/<button\s+id="([^"]+)"/g)].map((match) => match[1]),
  ["dailyRecommendCard", "claudeRecommendCard"],
  "home recommend grid should keep both recommendation cards"
);

assert.equal(html.includes('<header class="topbar">'), false, "home should not render the top Claude FM title block");

console.log("frontend home player control order tests passed");
