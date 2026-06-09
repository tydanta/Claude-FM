import assert from "node:assert/strict";
import fs from "node:fs";

const platform = fs.readFileSync(new URL("../public/modules/runtime/platform.js", import.meta.url), "utf8");
const main = fs.readFileSync(new URL("../public/modules/main.js", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const androidMain = fs.readFileSync(new URL("../android-node/main.js", import.meta.url), "utf8");
const prepareScript = fs.readFileSync(new URL("../scripts/prepare-android-node-api.js", import.meta.url), "utf8");

assert.match(platform, /androidCapabilityBaseUrl\s*=\s*"http:\/\/127\.0\.0\.1:3012"/);
assert.match(main, /localCapabilityBaseUrl:\s*isAndroidRuntime\(\)\s*\?\s*androidCapabilityBaseUrl\s*:\s*""/);
assert.match(main, /async function refreshWeather\(/);
assert.match(main, /function refreshWeatherUntilReady\(/);
assert.match(main, /window\.setTimeout\(refreshWeatherUntilReady,\s*1800\)/);
assert.match(app, /modules\/androidNodeApi\.js\?v=20260608-android-api1/);
assert.match(app, /modules\/main\.js\?v=20260608-android-api1/);
assert.doesNotMatch(app, /lyrics-scroll1/);
assert.match(androidMain, /createClaudeCapabilityServer/);
assert.match(prepareScript, /"api-service\.js"/);

console.log("android api routing shell tests passed");
