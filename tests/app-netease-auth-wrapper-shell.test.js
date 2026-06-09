import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const appSource = fs.readFileSync(path.join(repoRoot, "src/server/app.js"), "utf8");

const authWrapperNames = [
  "migrateNeteaseApiBaseUrl",
  "getNeteaseCookie",
  "hasNeteaseLoginCookie",
  "setNeteaseCookie",
  "getStoredNeteaseProfile"
];

for (const name of authWrapperNames) {
  assert.doesNotMatch(
    appSource,
    new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`),
    `app.js should assign ${name} from neteaseAuthService instead of redeclaring a thin wrapper`
  );
}

assert.match(
  appSource,
  /let\s+getNeteaseCookie\s*;/,
  "app.js should keep getNeteaseCookie as an assignable scope binding for createAppContext adapter injection"
);

assert.match(
  appSource,
  /let\s+setNeteaseCookie\s*;/,
  "app.js should keep setNeteaseCookie as an assignable scope binding for createAppContext adapter injection"
);

assert.match(
  appSource,
  /\(\{\s*[\s\S]*migrateNeteaseApiBaseUrl[\s\S]*getNeteaseCookie[\s\S]*hasNeteaseLoginCookie[\s\S]*setNeteaseCookie[\s\S]*getStoredNeteaseProfile[\s\S]*\}\s*=\s*neteaseAuthService\);/,
  "app.js should expose Netease auth helpers by assigning from neteaseAuthService"
);

assert.match(
  appSource,
  /clearNeteaseUrlCache:\s*\(\)\s*=>\s*cleanupNeteaseUrlCache\?\.\(\)\s*\|\|\s*0/,
  "app.js should let Netease auth migration clear stale song URL cache through a deferred callback"
);

assert.match(
  appSource,
  /beforeStart:\s*async\s*\(\)\s*=>\s*\{\s*await\s+neteaseLocalApiService\.ensureNeteaseLocalApi\(\);\s*migrateNeteaseApiBaseUrl\(\);\s*\}/,
  "app.js should start the local Netease API and migrate stale auth state before loading persisted state"
);

assert.match(
  appSource,
  /getNeteaseCookie:\s*\(\.\.\.args\)\s*=>\s*getNeteaseCookie\(\.\.\.args\)/,
  "app.js should inject getNeteaseCookie into createAppContext through a deferred callback"
);

assert.match(
  appSource,
  /setNeteaseCookie:\s*\(\.\.\.args\)\s*=>\s*setNeteaseCookie\(\.\.\.args\)/,
  "app.js should inject setNeteaseCookie into createAppContext through a deferred callback"
);

console.log("app-netease-auth-wrapper-shell tests passed");
