import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

const blockMatch = css.match(/\/\* Mine playlist continuous list \*\/(?<block>[\s\S]*)$/);
assert.ok(blockMatch, "styles.css should end with a mine playlist continuous list cleanup block");

const block = blockMatch.groups.block;

assert.ok(block.includes('body[data-page="mine"][data-mine-view="list"] .mine-playlist-list'), "mine playlist list should be covered");
assert.ok(block.includes('body[data-page="mine"][data-mine-view="list"] .mine-playlist-list .playlist-card'), "mine playlist cards should be covered");
assert.match(block, /gap:\s*0px\s*!important/i, "mine playlist list should not have row gaps");
assert.match(block, /padding-bottom:\s*0px\s*!important/i, "mine playlist list should not add bottom spacing between rows");
assert.match(block, /border-radius:\s*0px\s*!important/i, "mine playlist cards should not create rounded gaps");
assert.match(block, /border:\s*0px\s*!important/i, "mine playlist cards should not draw border lines");
assert.match(block, /box-shadow:\s*none\s*!important/i, "mine playlist cards should not have shadows");
assert.match(block, /margin-top:\s*0px\s*!important/i, "mine playlist cards should not overlap borders to hide gaps");
assert.match(block, /transform:\s*none\s*!important/i, "mine playlist card hover should not lift rows apart");
assert.match(
  block,
  /\.mine-playlist-list\s+\.playlist-card[\s\S]*?grid-template-columns:\s*62px\s+minmax\(0px,\s*1fr\)\s+78px\s*!important/i,
  "mine playlist cards should reserve a fixed right column for song counts"
);
assert.match(
  block,
  /\.mine-playlist-list\s+\.playlist-count[\s\S]*?justify-self:\s*end\s*!important[\s\S]*?text-align:\s*right\s*!important/i,
  "mine playlist counts should stay right aligned"
);
assert.match(
  block,
  /\.mine-playlist-list\s+\.playlist-count[\s\S]*?font-variant-numeric:\s*tabular-nums/i,
  "mine playlist counts should keep stable numeric width"
);

console.log("css mine playlist contiguous tests passed");
