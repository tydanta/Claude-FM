import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

assert.doesNotMatch(css, /background-image:\s*!important/i, "custom background rules must not contain empty background-image declarations");
assert.doesNotMatch(css, /background-repeat:\s*!important/i, "custom background rules must not contain empty background-repeat declarations");
assert.doesNotMatch(css, /background-origin:\s*!important/i, "custom background rules must not contain empty background-origin declarations");
assert.doesNotMatch(css, /background-clip:\s*!important/i, "custom background rules must not contain empty background-clip declarations");
assert.doesNotMatch(css, /background-color:\s*!important/i, "custom background rules must not contain empty background-color declarations");
assert.match(css, /body\[data-northern="custom"\][^{]*\{[^}]*var\(--northern-bg-image\)/i, "custom background should use the uploaded image CSS variable");

console.log("css northern custom background tests passed");
