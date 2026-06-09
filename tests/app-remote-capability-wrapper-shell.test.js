import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const appSource = fs.readFileSync(path.join(repoRoot, "src/server/app.js"), "utf8");

assert.doesNotMatch(
  appSource,
  /(?:async\s+)?function\s+proxyCapabilityRequest\s*\(/,
  "app.js should destructure proxyCapabilityRequest from remoteCapabilityService instead of redeclaring a thin wrapper"
);

assert.match(
  appSource,
  /const\s*\{[\s\S]*proxyCapabilityRequest[\s\S]*\}\s*=\s*remoteCapabilityService;/,
  "app.js should expose remote capability helpers by destructuring remoteCapabilityService"
);

console.log("app-remote-capability-wrapper-shell tests passed");
