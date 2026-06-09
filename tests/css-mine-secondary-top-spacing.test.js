import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

const blockMatch = css.match(/\/\* Mine secondary top spacing \*\/(?<block>[\s\S]*)$/);
assert.ok(blockMatch, "styles.css should include mine secondary top spacing overrides");

const block = blockMatch.groups.block;

assert.match(
  block,
  /body\[data-page="mine"\]\[data-mine-view="detail"\]\s+\.mine-page,[\s\S]*?body\[data-page="mine"\]\[data-mine-view="search"\]\s+\.mine-page[\s\S]*?padding-top:\s*calc\(var\(--app-top-mask-height\)\s*\+\s*2px\)\s*!important/i,
  "playlist detail and search result pages should share the same top fixed bar offset as mine"
);

assert.doesNotMatch(
  block,
  /body\[data-page="mine"\]\[data-mine-view="detail"\]\s+\.mine-page,[\s\S]*?body\[data-page="mine"\]\[data-mine-view="search"\]\s+\.mine-page[\s\S]*?padding-top:\s*calc\(var\(--app-top-mask-height\)\s*\+\s*8px\)/i,
  "secondary page top spacing should not keep the older large gap"
);

assert.doesNotMatch(
  block,
  /body\[data-page="mine"\]\[data-mine-view="search"\]\s+\.mine-page\s*{[\s\S]*?padding-top:\s*calc\(var\(--app-top-mask-height\)\s*-\s*10px\)\s*!important/i,
  "search result page should not keep a separate top offset from the mine page"
);

assert.doesNotMatch(
  block,
  /padding-top:\s*calc\(var\(--app-top-mask-height\)\s*-\s*4px\)\s*!important/i,
  "secondary pages should not use a shorter top fixed bar height than mine"
);

assert.match(
  block,
  /body\[data-page="mine"\]\[data-mine-view="search"\]\s+\.search-result-hero[\s\S]*?margin-top:\s*0px\s*!important/i,
  "search result hero should not add extra top margin after the page spacing"
);

assert.match(
  block,
  /body\[data-page="mine"\]\[data-mine-view="search"\]\s+\.music-search-page\s*{[\s\S]*?gap:\s*8px\s*!important/i,
  "search result page contents should use a compact vertical gap"
);

assert.match(
  block,
  /body\[data-page="mine"\]\[data-mine-view="search"\]\s+\.music-search-page\s*>\s*\.playlist-detail-topbar\s*{[\s\S]*?display:\s*none\s*!important/i,
  "search result page should hide the empty playlist topbar placeholder"
);

assert.match(
  block,
  /body\[data-page="mine"\]\[data-mine-view="search"\]\s+\.search-result-hero\s*{[\s\S]*?padding:\s*14px 16px\s*!important/i,
  "search result hero should be shorter after the fixed top bar was tightened"
);

assert.match(
  block,
  /body\[data-page="mine"\]\[data-mine-view="detail"\]\s+\.playlist-hero[\s\S]*?margin-top:\s*0px\s*!important/i,
  "playlist detail hero should not add extra top margin after the page spacing"
);

console.log("css mine secondary top spacing tests passed");
