import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

const blockMatch = css.match(/\/\* Artist album list mode \*\/(?<block>[\s\S]*)$/);
assert.ok(blockMatch, "styles.css should include artist album list mode overrides");

const block = blockMatch.groups.block;

assert.match(
  block,
  /\.artist-album-list[\s\S]*?grid-template-columns:\s*1fr\s*!important/i,
  "artist albums should render as one-column list"
);
assert.doesNotMatch(block, /repeat\(3/i, "artist albums should not use a 3-column grid");
assert.match(
  block,
  /\.artist-album-card[\s\S]*?grid-template-columns:\s*48px\s+minmax\(0px,\s*1fr\)/i,
  "artist album cards should use compact list-row columns"
);
assert.match(block, /\.artist-album-cover[\s\S]*?width:\s*48px\s*!important[\s\S]*?height:\s*48px\s*!important/i, "artist album covers should be row thumbnails");
assert.match(block, /\.artist-album-card[\s\S]*?min-height:\s*58px\s*!important/i, "artist album rows should have stable touch height");

console.log("css artist album list layout tests passed");
