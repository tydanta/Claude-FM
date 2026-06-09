import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

const obsoleteSelectors = [
  ".volume-box",
  ".pixel-clock",
  ".voice-settings-panel"
];

for (const selector of obsoleteSelectors) {
  assert.equal(css.includes(selector), false, `${selector} should not remain in styles.css`);
}

const retainedSelectors = [
  ".stage-time",
  "input[type=\"range\"]",
  ".settings-panel",
  ".api-settings-form"
];

for (const selector of retainedSelectors) {
  assert.equal(css.includes(selector), true, `${selector} should remain styled`);
}

console.log("css singleton cleanup tests passed");
