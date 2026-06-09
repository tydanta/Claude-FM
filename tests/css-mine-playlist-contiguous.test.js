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

console.log("css mine playlist contiguous tests passed");
