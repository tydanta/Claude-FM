import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

assert.match(
  css,
  /body\[data-surface="liquid"\]\s+\.claudio-chat\s*\{[^}]*min-height:\s*200px[^}]*max-height:\s*min\(200px,\s*72vh\)/,
  "liquid chat panel should share the custom-background 200px sizing in dark, light, and custom modes"
);
assert.equal(
  /body\[data-northern="custom"\]\[data-surface="liquid"\]\s+\.claudio-chat\s*\{[^}]*min-height:\s*200px/.test(css),
  false,
  "chat panel sizing should not be scoped only to custom background"
);

console.log("css chat sizing tests passed");
