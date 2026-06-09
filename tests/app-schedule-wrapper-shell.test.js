import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const appSource = fs.readFileSync(path.join(repoRoot, "src/server/app.js"), "utf8");

const scheduleWrapperNames = [
  "getSchedule",
  "saveSchedule"
];

for (const name of scheduleWrapperNames) {
  assert.doesNotMatch(
    appSource,
    new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`),
    `app.js should destructure ${name} from scheduleService instead of redeclaring a thin wrapper`
  );
}

assert.match(
  appSource,
  /const\s*\{[\s\S]*getSchedule[\s\S]*saveSchedule[\s\S]*\}\s*=\s*scheduleService;/,
  "app.js should expose schedule helpers by destructuring scheduleService"
);

console.log("app-schedule-wrapper-shell tests passed");
