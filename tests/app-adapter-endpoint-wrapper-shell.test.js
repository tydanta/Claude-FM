import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const appSource = fs.readFileSync(path.join(repoRoot, "src/server/app.js"), "utf8");

const adapterWrapperNames = [
  "getOpenAIChatUrl",
  "neteaseRequest"
];

for (const name of adapterWrapperNames) {
  assert.doesNotMatch(
    appSource,
    new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`),
    `app.js should assign ${name} from appAdapterEndpointService instead of redeclaring a thin wrapper`
  );
}

assert.match(
  appSource,
  /let\s+getOpenAIChatUrl\s*;/,
  "app.js should keep getOpenAIChatUrl as an assignable scope binding for createAppContext adapter injection"
);

assert.match(
  appSource,
  /let\s+neteaseRequest\s*;/,
  "app.js should keep neteaseRequest as an assignable scope binding for service initialization order"
);

assert.match(
  appSource,
  /\(\{\s*[\s\S]*getOpenAIChatUrl[\s\S]*neteaseRequest[\s\S]*\}\s*=\s*appAdapterEndpointService\);/,
  "app.js should expose adapter endpoint helpers by assigning from appAdapterEndpointService"
);

assert.match(
  appSource,
  /getOpenAIChatUrl:\s*\(\.\.\.args\)\s*=>\s*getOpenAIChatUrl\(\.\.\.args\)/,
  "app.js should inject getOpenAIChatUrl into createAppContext through a deferred callback"
);

console.log("app-adapter-endpoint-wrapper-shell tests passed");
