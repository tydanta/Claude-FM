import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

assert.match(
  css,
  /\.round-btn\s+svg,\s*\.play-btn\s+svg\s*\{[^}]*stroke:\s*currentcolor/i,
  "home player svg icons should follow the button color"
);

assert.match(
  css,
  /\.search-page-btn\s+span\s*\{[^}]*border:\s*2px\s+solid\s+currentcolor/i,
  "search page icon ring should follow the button color"
);

assert.match(
  css,
  /\.search-page-btn\s+span::before\s*\{[^}]*background:\s*currentcolor/i,
  "search page icon handle should follow the button color"
);

assert.match(
  css,
  /\.search-icon\s*\{[^}]*border:\s*2px\s+solid\s+currentcolor/i,
  "shared search icon ring should follow the surrounding color"
);

assert.match(
  css,
  /\.search-icon::after\s*\{[^}]*background:\s*currentcolor/i,
  "shared search icon handle should follow the surrounding color"
);

console.log("css icon control tests passed");
