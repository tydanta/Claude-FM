import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const appSource = fs.readFileSync(path.join(repoRoot, "src/server/app.js"), "utf8");

const runtimeSettingsWrapperNames = [
  "maskSecret",
  "secretFingerprint",
  "getEditableSettings",
  "normalizeRuntimeSetting",
  "updateEnvFile",
  "saveRuntimeSettings"
];

for (const name of runtimeSettingsWrapperNames) {
  assert.doesNotMatch(
    appSource,
    new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`),
    `app.js should destructure ${name} from runtimeSettingsService instead of redeclaring a thin wrapper`
  );
}

assert.match(
  appSource,
  /const\s*\{[\s\S]*maskSecret[\s\S]*saveRuntimeSettings[\s\S]*\}\s*=\s*runtimeSettingsService;/,
  "app.js should expose runtime settings helpers by destructuring runtimeSettingsService"
);

console.log("app-runtime-settings-wrapper-shell tests passed");
