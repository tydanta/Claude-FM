import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

const blockMatch = css.match(/\/\* Top control alignment \*\/(?<block>[\s\S]*)$/);
assert.ok(blockMatch, "styles.css should include a top control alignment cleanup block");

const block = blockMatch.groups.block;

const requiredSelectors = [
  ".playlist-back-btn",
  ".artist-profile-back",
  ".player-back-btn",
  ".playlist-back-btn span",
  ".player-back-btn span",
  ".playlist-back-btn[hidden]",
  ".player-back-btn[hidden]",
  ".artist-profile-back[hidden]",
  ".app-top-playlist .playlist-back-btn",
  ".app-top-playlist .playlist-search",
  ".app-top-playlist .playlist-search-toggle",
  ".app-top-playlist .playlist-search-toggle .search-icon",
  ".settings-topbar .playlist-back-btn"
];

for (const selector of requiredSelectors) {
  assert.ok(block.includes(selector), `${selector} should be covered by top control alignment`);
}

assert.match(block, /height:\s*42px\s*!important/i, "top controls should use the same 42px height");
assert.match(block, /\.playlist-back-btn,[\s\S]*?\.artist-profile-back,[\s\S]*?\.player-back-btn[\s\S]*?width:\s*42px\s*!important[\s\S]*?height:\s*42px\s*!important/i, "all back buttons should share the same 42px size");
assert.match(block, /\.playlist-back-btn,[\s\S]*?\.artist-profile-back,[\s\S]*?\.player-back-btn[\s\S]*?border:\s*0px\s*!important/i, "all back buttons should be borderless");
assert.match(block, /\.playlist-back-btn,[\s\S]*?\.artist-profile-back,[\s\S]*?\.player-back-btn[\s\S]*?border-radius:\s*0px\s*!important/i, "all back buttons should be bare instead of chip-shaped");
assert.match(block, /\.playlist-back-btn,[\s\S]*?\.artist-profile-back,[\s\S]*?\.player-back-btn[\s\S]*?background:\s*none\s+transparent\s*!important/i, "all back buttons should have no background");
assert.match(block, /\.playlist-back-btn,[\s\S]*?\.artist-profile-back,[\s\S]*?\.player-back-btn[\s\S]*?box-shadow:\s*none\s*!important/i, "all back buttons should have no shadow");
assert.match(block, /\.playlist-back-btn span,[\s\S]*?\.player-back-btn span[\s\S]*?width:\s*12px\s*!important[\s\S]*?height:\s*12px\s*!important/i, "all back button chevrons should use the same size");
assert.match(block, /\.playlist-back-btn span,[\s\S]*?\.player-back-btn span[\s\S]*?display:\s*block\s*!important/i, "all back button chevrons should allow transform to apply");
assert.match(block, /\.playlist-back-btn\[hidden\],[\s\S]*?\.artist-profile-back\[hidden\],[\s\S]*?\.player-back-btn\[hidden\][\s\S]*?display:\s*none\s*!important/i, "hidden back buttons should stay hidden after global display rules");
assert.match(block, /body\s+\.playlist-back-btn\[hidden\],[\s\S]*?body\s+\.artist-profile-back\[hidden\],[\s\S]*?body\s+\.player-back-btn\[hidden\][\s\S]*?display:\s*none\s*!important/i, "hidden back buttons should beat theme-qualified display rules");
assert.match(block, /align-self:\s*start\s*!important/i, "playlist detail controls should align from the same vertical origin");
assert.match(block, /transform:\s*translateX\(-1px\)\s*!important/i, "playlist search icon should not be vertically offset");
assert.match(block, /border:\s*0px\s*!important/i, "settings back button should be bare");
assert.match(block, /background:\s*none\s+transparent\s*!important/i, "settings back button should have no background");
assert.match(block, /backdrop-filter:\s*none\s*!important/i, "settings back button should not blur as a chip");
assert.match(block, /box-shadow:\s*none\s*!important/i, "settings back button should have no shadow");

console.log("css top controls alignment tests passed");
