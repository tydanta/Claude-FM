import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const appSource = fs.readFileSync(path.join(repoRoot, "src/server/app.js"), "utf8");

const weatherContextWrapperNames = [
  "getTimeBlock",
  "normalizeWeatherLocation",
  "getWeatherLocationFromSearch",
  "getWeather"
];

for (const name of weatherContextWrapperNames) {
  assert.doesNotMatch(
    appSource,
    new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`),
    `app.js should destructure ${name} from weatherContextService instead of redeclaring a thin wrapper`
  );
}

assert.match(
  appSource,
  /const\s*\{[\s\S]*getTimeBlock[\s\S]*normalizeWeatherLocation[\s\S]*getWeatherLocationFromSearch[\s\S]*getWeather[\s\S]*\}\s*=\s*weatherContextService;/,
  "app.js should expose weather context helpers by destructuring weatherContextService"
);

console.log("app-weather-context-wrapper-shell tests passed");
