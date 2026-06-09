import assert from "node:assert/strict";
import {
  auditCssSelectors,
  extractCssSelectors,
  extractReferencedTokens
} from "../scripts/css-audit.js";

const sources = [
  '<div id="app" class="player-row is-active"></div>',
  'element.classList.toggle("queue-open", true); document.body.dataset.theme = "light";',
  'const active = index === currentIndex ? " now-playing" : "";',
  '<div class="mine-track-item${showCover ? "" : " no-cover"}"></div>',
  '<button className={`status-tab liquid-status-tab${active ? " is-active" : ""}`}></button>'
];
const css = `
  .player-row { display: block; }
  #app { color: red; }
  .unused-card { color: blue; }
  .is-active { opacity: 1; }
  body[data-theme="light"] .theme-panel { color: black; }
`;

assert.deepEqual([...extractReferencedTokens(sources).classes].sort(), [
  "is-active",
  "liquid-status-tab",
  "mine-track-item",
  "no-cover",
  "now-playing",
  "player-row",
  "queue-open",
  "status-tab",
  "theme"
]);
assert.deepEqual([...extractReferencedTokens(sources).ids], ["app"]);
assert.deepEqual(extractCssSelectors(css).map((item) => item.token), ["player-row", "app", "unused-card", "is-active", "theme-panel"]);

const result = auditCssSelectors({ css, sources, safelist: [/^is-/, /^theme-panel$/] });
assert.deepEqual(result.unused.map((item) => item.token), ["unused-card"]);
assert.equal(result.used.length, 4);

const dynamicCss = `
  .now-playing { color: green; }
  .mine-track-item.no-cover { display: grid; }
  .status-tab { display: block; }
  .liquid-status-tab { display: block; }
`;
const dynamicResult = auditCssSelectors({ css: dynamicCss, sources, safelist: [] });
assert.deepEqual(dynamicResult.unused.map((item) => item.token), []);

const liquidGeneratedCss = `
  .liquid-nav-root .relative { position: absolute; }
  .liquid-nav-root .pointer-events-none { pointer-events: none; }
  .liquid-theme-root .mix-blend-overlay { mix-blend-mode: overlay; }
  body[data-surface="liquid"] .topbar > #liquidThemeToggleRoot.liquid-theme-root { width: 128px; }
`;
const liquidGeneratedResult = auditCssSelectors({
  css: liquidGeneratedCss,
  sources: []
});
assert.deepEqual(liquidGeneratedResult.unused.map((item) => item.selector), []);

console.log("css-audit tests passed");
