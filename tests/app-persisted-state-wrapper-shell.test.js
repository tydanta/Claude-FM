import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const appSource = fs.readFileSync(path.join(repoRoot, "src/server/app.js"), "utf8");

const persistedStateWrapperNames = [
  "loadPersistedState",
  "savePersistedState"
];

for (const name of persistedStateWrapperNames) {
  assert.doesNotMatch(
    appSource,
    new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`),
    `app.js should destructure ${name} from persistedStateService instead of redeclaring a thin wrapper`
  );
}

assert.match(
  appSource,
  /const\s*\{[\s\S]*loadPersistedState[\s\S]*savePersistedState[\s\S]*\}\s*=\s*persistedStateService;/,
  "app.js should expose persisted state helpers by destructuring persistedStateService"
);

console.log("app-persisted-state-wrapper-shell tests passed");
