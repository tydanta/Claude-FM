import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

assert.match(
  css,
  /body\[data-page="mine"\]\[data-mine-view="search"\]\s+\.music-search-page\s*\{[^}]*scrollbar-width:\s*none\s*!important/i,
  "search results page should hide its scrollbar"
);

assert.match(
  css,
  /body\[data-page="mine"\]\[data-mine-view="search"\]\s+\.music-search-page::-webkit-scrollbar\s*\{[^}]*display:\s*none\s*!important/i,
  "search results page should hide WebKit scrollbars"
);

assert.match(
  css,
  /body\[data-page="mine"\]\[data-mine-view="search"\]\s+#musicSearchPageList\s*\{[^}]*margin-top:\s*-?\d+px\s*!important/i,
  "search results list should sit closer to the search input area"
);

assert.match(
  css,
  /#musicSearchPageList\s+\.mine-track-item\.no-cover\s+\.mine-track-play[\s\S]*grid-template-columns:\s*30px\s+minmax\(0px,\s*1fr\)\s+auto\s*!important/i,
  "search result rows without covers should use the no-cover grid"
);

console.log("frontend search results layout tests passed");
