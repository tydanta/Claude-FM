import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

assert.equal(css.includes("[Truncated]"), false, "styles.css should not contain truncated selector fragments");

const cleanupBlockMatch = css.match(/\/\* Flat content cards \*\/(?<block>[\s\S]*)$/);
assert.ok(cleanupBlockMatch, "styles.css should end with a flat content card shadow cleanup block");

const cleanupBlock = cleanupBlockMatch.groups.block;
const selectors = [
  ".app-top-chrome",
  ".stage",
  ".player-row",
  ".player-row .round-btn",
  ".player-row .play-btn",
  ".radio-recommend-panel",
  ".radio-recommend-card",
  ".insight-card",
  ".playlist-hero",
  ".artist-hero",
  ".artist-profile-panel",
  ".playlist-card",
  ".mine-track-item",
  ".settings-panel",
  ".settings-item",
  ".settings-topbar .playlist-back-btn",
  ".northern-choice",
  ".api-settings-form fieldset"
];

for (const selector of selectors) {
  assert.ok(cleanupBlock.includes(selector), `${selector} should be covered by the flat card cleanup`);
}

assert.match(cleanupBlock, /box-shadow:\s*none\s*!important/i, "flat content cards should remove shadow with final priority");
assert.doesNotMatch(cleanupBlock, /\.queue-popover|\.track-menu|\.music-search-results/, "floating popovers should keep their shadows");

console.log("css card shadow cleanup tests passed");
