import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

assert.match(
  css,
  /body\[data-page="radio"\]\s+\.player-row\s+\.round-btn,\s*body\[data-page="radio"\]\s+\.player-row\s+\.play-btn\s*\{[^}]*color:\s*rgb\(255,\s*255,\s*255\)[^}]*border:\s*1px\s+solid\s+currentcolor/i,
  "home player buttons should be white with circular borders in dark mode"
);

assert.match(
  css,
  /body\[data-theme="light"\]\[data-page="radio"\]\s+\.player-row\s+\.round-btn,\s*body\[data-theme="light"\]\[data-page="radio"\]\s+\.player-row\s+\.play-btn\s*\{[^}]*color:\s*rgb\(0,\s*0,\s*0\)/i,
  "home player buttons should be black in light mode"
);

assert.match(
  css,
  /body\[data-page="radio"\]\s+\.player-row\s+\.round-btn\.is-liked,[\s\S]*body\[data-page="radio"\]\s+\.player-row\s+\.queue-icon-btn\[aria-expanded="true"\]\s*\{[^}]*color:\s*rgb\(255,\s*255,\s*255\)/i,
  "home player active button states should stay white in dark mode"
);

assert.match(
  css,
  /body\[data-theme="light"\]\[data-page="radio"\]\s+\.player-row\s+\.round-btn\.is-liked,[\s\S]*body\[data-theme="light"\]\[data-page="radio"\]\s+\.player-row\s+\.queue-icon-btn\[aria-expanded="true"\]\s*\{[^}]*color:\s*rgb\(0,\s*0,\s*0\)/i,
  "home player active button states should stay black in light mode"
);

assert.match(
  css,
  /body\[data-page="radio"\]\s+\.player-row\s+#playIcon\s*\{[^}]*color:\s*currentcolor/i,
  "home player play icon should follow the play button color"
);

console.log("css home player buttons theme tests passed");
