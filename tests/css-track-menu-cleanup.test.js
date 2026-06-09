import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

const obsoleteSelectors = [
  ".track-playlist-picker",
  ".track-menu-empty"
];

for (const selector of obsoleteSelectors) {
  assert.equal(css.includes(selector), false, `${selector} should not remain in styles.css`);
}

const retainedSelectors = [
  ".track-menu",
  ".track-more-btn",
  ".collect-playlist-card"
];

for (const selector of retainedSelectors) {
  assert.equal(css.includes(selector), true, `${selector} should remain styled`);
}

console.log("css track menu cleanup tests passed");
