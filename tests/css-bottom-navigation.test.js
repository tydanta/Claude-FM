import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");
const compactCss = css.replace(/\s+/g, " ");

assert.match(css, /\.app-bottom-chrome\s*\{[^}]*position:\s*fixed/i, "bottom navigation should be fixed");
assert.match(css, /\.app-bottom-chrome\s*\{[^}]*bottom:\s*max\(/i, "bottom navigation should sit above the safe-area bottom");
assert.match(css, /\.app-bottom-chrome\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0px,\s*1fr\)\)/i, "bottom navigation should lay out the two tabs in a bottom bar");
assert.match(css, /\.app-bottom-chrome\s*\{[^}]*border-radius:\s*0px/i, "bottom navigation should use a flat top-chrome style instead of a rounded pill");
assert.match(css, /\.app-bottom-chrome\s*\{[^}]*box-shadow:\s*none/i, "bottom navigation should not float with a container shadow");
assert.match(css, /\.bottom-tab\s*\{[^}]*display:\s*grid/i, "bottom tabs should use the bottom navigation tab layout");
assert.match(css, /\.bottom-tab\s*\{[^}]*border-radius:\s*0px/i, "bottom tabs should not be rounded pills");
assert.match(css, /\.bottom-tab\.is-active\s*\{[^}]*background:\s*transparent/i, "active bottom tab should not use a selected background");
assert.match(css, /\.bottom-tab\.is-active\s*\{[^}]*box-shadow:\s*none/i, "active bottom tab should not use a selected shadow");
assert.match(compactCss, /body\[data-page="mine"\]\[data-mine-view="detail"\] \.mine-page, body\[data-page="mine"\]\[data-mine-view="artist"\] \.mine-page, body\[data-page="artist"\] \.artist-page \{ padding-bottom: 18px !important; \}/i, "secondary mine and artist pages should not reserve space for the bottom navigation");
assert.match(compactCss, /body\[data-page="mine"\]\[data-mine-view="detail"\] \.fm-shell, body\[data-page="mine"\]\[data-mine-view="search"\] \.fm-shell, body\[data-page="mine"\]\[data-mine-view="artist"\] \.fm-shell, body\[data-page="artist"\] \.fm-shell \{ bottom: 0px !important; \}/i, "secondary pages should extend the shell to the viewport bottom");
assert.match(compactCss, /body\[data-page="mine"\]\[data-mine-view="detail"\] \.app-bottom-chrome, body\[data-page="mine"\]\[data-mine-view="search"\] \.app-bottom-chrome, body\[data-page="mine"\]\[data-mine-view="artist"\] \.app-bottom-chrome, body\[data-page="artist"\] \.app-bottom-chrome, body\[data-page="album"\] \.app-bottom-chrome, body\[data-page="mine"\]\[data-mine-view="detail"\] \.liquid-nav-root, body\[data-page="mine"\]\[data-mine-view="search"\] \.liquid-nav-root, body\[data-page="mine"\]\[data-mine-view="artist"\] \.liquid-nav-root, body\[data-page="artist"\] \.liquid-nav-root, body\[data-page="album"\] \.liquid-nav-root \{ display: none !important; \}/i, "secondary pages should hide the bottom navigation");
assert.match(compactCss, /body\[data-page="mine"\]\[data-mine-view="search"\] \.music-search-page \{ padding-right: 0px !important; \}/i, "search results should keep their horizontal gutter reset");
assert.match(compactCss, /body\[data-page="mine"\]\[data-mine-view="search"\] \.music-search-page \{ gap: 10px !important; padding-bottom: 18px !important;/i, "search results should not reserve space for hidden bottom navigation");
assert.match(css, /\.liquid-nav-glass\s+\.glass\s*\{[^}]*border-radius:\s*0px\s*!important/i, "liquid bottom navigation should use a flat top-chrome shape");
assert.match(css, /\.liquid-nav-glass\s+\.glass\s*\{[^}]*box-shadow:\s*none\s*!important/i, "liquid bottom navigation should not use a floating shadow");
assert.match(css, /\.liquid-nav-content\s*\{[^}]*border-radius:\s*0px/i, "liquid bottom navigation content should not be rounded");
assert.match(css, /\.liquid-nav-indicator\s*\{[^}]*display:\s*none/i, "liquid bottom navigation should not use a rounded selected indicator");
assert.doesNotMatch(css, /body\[data-page="player"\]\s+\.app-bottom-chrome,\s*body\[data-page="player"\]\s+\.liquid-nav-root\s*\{[^}]*display:\s*none\s*!important/i, "player detail page should cover, not hide, the bottom navigation");
assert.match(css, /body\[data-page="player"\]::after\s*\{[^}]*z-index:\s*2147482400\s*!important/i, "player detail page should push the bottom true-background layer below the player page");
assert.match(compactCss, /body\[data-page="mine"\]\[data-mine-view="detail"\]::after, body\[data-page="mine"\]\[data-mine-view="search"\]::after, body\[data-page="mine"\]\[data-mine-view="artist"\]::after, body\[data-page="artist"\]::after, body\[data-page="album"\]::after \{ display: none !important; content: none !important; visibility: hidden !important; \}/i, "secondary pages should hide the bottom true-background mask with the navigation");
assert.match(css, /(?:^|\n)\[hidden\]\s*\{[^}]*display:\s*none\s*!important/i, "hidden controls should not be resurrected by button display rules");
assert.match(css, /\.app-top-layer\.app-top-mine\.mine-sticky-top\s*\{[^}]*background:\s*transparent\s*!important/i, "mine top navigation layer should stay transparent over the app top chrome background");

console.log("css bottom navigation tests passed");
