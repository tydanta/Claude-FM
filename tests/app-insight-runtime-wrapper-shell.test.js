import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const appSource = fs.readFileSync(path.join(repoRoot, "src/server/app.js"), "utf8");

const insightRuntimeWrapperNames = [
  "getInsightForTrack",
  "warmTrackAssets",
  "prewarmQueue"
];

for (const name of insightRuntimeWrapperNames) {
  assert.doesNotMatch(
    appSource,
    new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`),
    `app.js should destructure ${name} from insightRuntimeService instead of redeclaring a thin wrapper`
  );
}

assert.match(
  appSource,
  /const\s*\{[\s\S]*getInsightForTrack[\s\S]*warmTrackAssets[\s\S]*prewarmQueue[\s\S]*\}\s*=\s*insightRuntimeService;/,
  "app.js should expose insight runtime helpers by destructuring insightRuntimeService"
);

console.log("app-insight-runtime-wrapper-shell tests passed");
