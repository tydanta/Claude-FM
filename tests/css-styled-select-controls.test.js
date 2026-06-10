import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

assert.match(css, /\.native-select-hidden\s*\{[\s\S]*?position:\s*absolute/i, "native select should be visually hidden after enhancement");
assert.match(css, /\.styled-select-shell\s*\{[\s\S]*?position:\s*relative[\s\S]*?display:\s*block/i, "styled select shell should provide a positioned block container");
assert.match(
  css,
  /\.styled-select-trigger\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0px,\s*1fr\)\s+18px[\s\S]*?padding:\s*0px\s+16px\s*0px\s+18px/i,
  "styled select trigger should reserve a fixed right arrow column"
);
assert.match(css, /\.styled-select-value\s*\{[\s\S]*?text-align:\s*left/i, "styled select text should align to the left");
assert.match(
  css,
  /\.styled-select-arrow\s*\{[\s\S]*?justify-self:\s*center[\s\S]*?border-right:\s*2px\s+solid/i,
  "styled select arrow should be centered in its own right column"
);
assert.match(
  css,
  /\.styled-select-menu\s*\{[\s\S]*?position:\s*absolute[\s\S]*?right:\s*0px[\s\S]*?max-height:\s*220px/i,
  "styled select menu should be a custom bounded popover aligned to the control"
);
assert.match(
  css,
  /\.settings-item\.has-open-select\s*\{[\s\S]*?overflow:\s*visible\s*!important/i,
  "open styled select menus should be allowed to escape settings cards"
);
assert.match(
  css,
  /\.api-settings-form\s+fieldset:has\(\.styled-select-shell\.is-open\)\s*\{[\s\S]*?z-index:\s*260\s*!important[\s\S]*?overflow:\s*visible\s*!important/i,
  "the fieldset with an open styled select should layer above following save buttons"
);

console.log("css styled select control tests passed");
