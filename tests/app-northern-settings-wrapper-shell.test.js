import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const appSource = fs.readFileSync(path.join(repoRoot, "src/server/app.js"), "utf8");

const northernSettingsWrapperNames = [
  "getNorthernSettings",
  "saveNorthernSettings",
  "saveNorthernBackgroundImage"
];

for (const name of northernSettingsWrapperNames) {
  assert.doesNotMatch(
    appSource,
    new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`),
    `app.js should destructure ${name} from northernSettingsService instead of redeclaring a thin wrapper`
  );
}

assert.match(
  appSource,
  /const\s*\{[\s\S]*getNorthernSettings[\s\S]*saveNorthernBackgroundImage[\s\S]*\}\s*=\s*northernSettingsService;/,
  "app.js should expose northern settings helpers by destructuring northernSettingsService"
);

console.log("app-northern-settings-wrapper-shell tests passed");
