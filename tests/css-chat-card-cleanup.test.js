import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

assert.equal(css.includes(".chat-card"), false, ".chat-card should not remain in styles.css");

const retainedSelectors = [
  ".insight-card",
  ".claudio-dialog",
  ".chat-log",
  ".chat-form"
];

for (const selector of retainedSelectors) {
  assert.equal(css.includes(selector), true, `${selector} should remain styled`);
}

console.log("css chat card cleanup tests passed");
