import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

assert.match(css, /\.player-back-btn,\s*\.player-icon-btn,\s*\.player-main-play\s*\{[^}]*color:\s*rgb\(255,\s*255,\s*255\)/i, "dark player buttons should render white icons");
assert.match(css, /\.player-back-btn\s*\{[^}]*border:\s*0px/i, "player back button should not render a border");
assert.match(css, /\.player-icon-btn\s*\{[^}]*border:\s*0px/i, "player icon buttons should not render borders");
assert.match(css, /\.player-main-play\s*\{[^}]*border:\s*0px/i, "player main play button should not render a border");
assert.match(css, /\.player-like-btn\.is-liked\s*\{[^}]*color:\s*rgb\(255,\s*255,\s*255\)/i, "liked player button should stay white on the detail page");
assert.doesNotMatch(css, /body\[data-theme="light"\][^{]*\.player-(?:back-btn|icon-btn|main-play)[\s\S]*?color:\s*rgb\(0,\s*0,\s*0\)/i, "player detail controls should ignore light theme color overrides");
assert.match(css, /\.mode-btn span,[\s\S]*--mode-icon/i, "mode buttons should render icon masks instead of text labels");
assert.match(css, /body\[data-page="player"\]\s+\.fm-shell\s*\{[^}]*inset:\s*0px\s*!important[^}]*width:\s*100vw\s*!important[^}]*height:\s*100dvh\s*!important/i, "player detail shell should fill the whole viewport");
assert.match(css, /body\[data-page="player"\]\s+\.fm-shell\s*\{[^}]*z-index:\s*2147483500\s*!important/i, "player detail shell should sit above the bottom navigation stacking layer");
assert.match(css, /body\[data-page="player"\]\s+#playerPage\.player-page\s*\{[^}]*width:\s*100vw\s*!important[^}]*height:\s*100dvh\s*!important/i, "player detail page should extend to the viewport bottom");

const playerPageZ = Number(css.match(/\.player-page\s*\{[^}]*z-index:\s*(\d+)/)?.[1] || 0);
const bottomChromeZ = Number(css.match(/\.app-bottom-chrome\s*\{[^}]*z-index:\s*(\d+)/)?.[1] || 0);
const liquidNavZ = Number(css.match(/\.liquid-nav-root\s*\{[^}]*z-index:\s*(\d+)/)?.[1] || 0);
assert.ok(playerPageZ > bottomChromeZ, "player detail page should cover the bottom chrome");
assert.ok(playerPageZ > liquidNavZ, "player detail page should cover the liquid bottom nav");

console.log("css player buttons theme tests passed");
