import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const appSource = fs.readFileSync(path.join(repoRoot, "src/server/app.js"), "utf8");

const trackCatalogWrapperNames = [
  "getTrackById",
  "getTrackCount",
  "getCurrentTrack",
  "getIntegrations"
];

for (const name of trackCatalogWrapperNames) {
  assert.doesNotMatch(
    appSource,
    new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`),
    `app.js should destructure ${name} from trackCatalogService instead of redeclaring a thin wrapper`
  );
}

assert.match(
  appSource,
  /\(\s*\{[\s\S]*getTrackById[\s\S]*getTrackCount[\s\S]*getCurrentTrack[\s\S]*getIntegrations[\s\S]*\}\s*=\s*trackCatalogService\s*\);/,
  "app.js should expose track catalog helpers by destructuring trackCatalogService"
);

assert.match(
  appSource,
  /getTrackCount:\s*\(\.\.\.args\)\s*=>\s*getTrackCount\(\.\.\.args\)/,
  "app.js should pass a deferred getTrackCount callback into persistedStateService until trackCatalogService is initialized"
);

console.log("app-track-catalog-wrapper-shell tests passed");
