import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

const blockMatch = css.match(/\/\* Bottom true background \*\/(?<block>[\s\S]*)$/);
assert.ok(blockMatch, "styles.css should include a bottom true background block");

const block = blockMatch.groups.block;

assert.ok(block.includes('body:not([data-page="settings"])::after'), "bottom true background should be painted by a viewport-fixed body layer");
assert.ok(block.includes(".app-bottom-chrome"), "bottom navigation shell should be covered");
assert.ok(block.includes(".liquid-nav-content"), "liquid navigation content should be covered");
assert.match(block, /position:\s*fixed\s*!important/i, "bottom background layer should be fixed to the viewport");
assert.match(block, /background:\s*inherit\s*!important/i, "bottom background layer should inherit the real page background");
assert.match(block, /background-attachment:\s*inherit\s*!important/i, "bottom background layer should use the page background attachment");
assert.match(block, /clip-path:\s*inset\(calc\(100%\s*-\s*var\(--app-bottom-mask-height\)\)\s*0\s*0\s*0\)\s*!important/i, "bottom background layer should reveal only the bottom band");
assert.match(block, /background:\s*transparent\s*!important/i, "bottom navigation controls should not repaint their own cropped background");
assert.doesNotMatch(block, /\.app-bottom-chrome\s*\{[^}]*background:\s*inherit/i, "bottom navigation shell should not inherit and repaint background");
assert.match(css, /--app-bottom-mask-height:\s*calc\(40px\s*\+\s*env\(safe-area-inset-bottom\)\)/i, "bottom background layer should match the compact bottom navigation height");
assert.doesNotMatch(css, /--app-bottom-mask-height:\s*calc\(74px\s*\+\s*env\(safe-area-inset-bottom\)\)/i, "bottom background layer should not expose the old tall band");

console.log("css bottom true background tests passed");
