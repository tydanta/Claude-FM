import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const appSource = fs.readFileSync(path.join(repoRoot, "src/server/app.js"), "utf8");

const nowPayloadWrapperNames = [
  "buildBasePayload",
  "buildNowPayload"
];

for (const name of nowPayloadWrapperNames) {
  assert.doesNotMatch(
    appSource,
    new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`),
    `app.js should destructure ${name} from nowPayloadService instead of redeclaring a thin wrapper`
  );
}

assert.match(
  appSource,
  /const\s*\{[\s\S]*buildBasePayload[\s\S]*buildNowPayload[\s\S]*\}\s*=\s*nowPayloadService;/,
  "app.js should expose now payload helpers by destructuring nowPayloadService"
);

console.log("app-now-payload-wrapper-shell tests passed");
