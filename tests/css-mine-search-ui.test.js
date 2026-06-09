import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");
const compactCss = css.replace(/\s+/g, " ");

assert.match(
  compactCss,
  /body\[data-page="mine"\]\[data-mine-view="search"\] \.search-result-top-back \{ position: absolute !important; left: 12px !important; top: var\(--app-top-control-top\) !important; z-index: 12 !important; width: 42px !important; height: 42px !important;/i,
  "search result back button should share the same inset as the artist detail back button"
);

assert.match(
  compactCss,
  /\.app-top-mine \.mine-search-wrap, body\.mine-title-pinned \.app-top-mine \.mine-search-wrap \{ position: absolute !important; left: 58px !important; top: var\(--app-top-control-top\) !important; z-index: 5 !important; grid-column: auto !important; width: calc\(var\(--app-shell-width\) - 154px\) !important; max-width: calc\(var\(--app-shell-width\) - 154px\) !important;/i,
  "mine search bar should be narrower so it does not collide with the top actions"
);

assert.match(
  compactCss,
  /\.app-top-mine\.is-search-open \.mine-search-wrap, body\.mine-title-pinned \.app-top-mine\.is-search-open \.mine-search-wrap \{ max-height: 42px !important; padding-top: 0px !important; opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; transform: translateX\(0px\) scaleX\(1\) !important; \}/i,
  "mine search bar should animate open as a compact slide-out"
);

console.log("css mine search ui tests passed");
