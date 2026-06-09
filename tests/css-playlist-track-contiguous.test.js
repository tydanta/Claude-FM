import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

const blockMatch = css.match(/\/\* Playlist detail continuous tracks \*\/(?<block>[\s\S]*)$/);
assert.ok(blockMatch, "styles.css should end with a playlist detail continuous tracks cleanup block");

const block = blockMatch.groups.block;

const requiredSelectors = [
  ".playlist-track-list",
  ".playlist-track-list .mine-track-item",
  ".playlist-track-list .mine-track-cover",
  ".playlist-track-list .mine-track-play",
  ".playlist-track-list .mine-track-copy strong"
];

for (const selector of requiredSelectors) {
  assert.ok(block.includes(selector), `${selector} should be covered by playlist detail sizing`);
}

assert.match(block, /gap:\s*0px\s*!important/i, "playlist detail tracks should not have row gaps");
assert.match(block, /grid-auto-rows:\s*54px\s*!important/i, "playlist detail rows should use the playlist-list row height");
assert.match(block, /height:\s*54px\s*!important/i, "playlist detail track items should be 54px tall");
assert.match(block, /border-radius:\s*0px\s*!important/i, "playlist detail track items should not create rounded gaps");
assert.match(block, /border:\s*0px\s*!important/i, "playlist detail track items should not draw border lines");
assert.match(block, /margin-top:\s*0px\s*!important/i, "playlist detail track items should not overlap borders to hide gaps");
assert.match(block, /width:\s*42px\s*!important/i, "playlist detail covers should match playlist-list cover width");
assert.match(block, /height:\s*42px\s*!important/i, "playlist detail covers should match playlist-list cover height");
assert.match(block, /font-size:\s*13px\s*!important/i, "playlist detail title size should match playlist-list title size");
assert.match(block, /font-size:\s*11px\s*!important/i, "playlist detail meta size should match playlist-list meta size");
assert.match(block, /transform:\s*none\s*!important/i, "playlist detail track hover should not lift rows apart");

console.log("css playlist track contiguous tests passed");
