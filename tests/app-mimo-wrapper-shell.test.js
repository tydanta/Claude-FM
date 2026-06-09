import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const appSource = fs.readFileSync(path.join(repoRoot, "src/server/app.js"), "utf8");

const mimoWrapperNames = [
  "runProcess",
  "synthesizeWithMimoPowerShell"
];

for (const name of mimoWrapperNames) {
  assert.doesNotMatch(
    appSource,
    new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`),
    `app.js should destructure ${name} from mimoProcessService instead of redeclaring a thin wrapper`
  );
}

assert.match(
  appSource,
  /(?:let|const)\s+runProcess\s*;/,
  "app.js should keep runProcess as an assignable scope binding for services created after mimoProcessService"
);

assert.match(
  appSource,
  /(?:let|const)\s+synthesizeWithMimoPowerShell\s*;/,
  "app.js should keep synthesizeWithMimoPowerShell as an assignable scope binding for createAppContext fallback injection"
);

assert.match(
  appSource,
  /\(\{\s*[\s\S]*runProcess[\s\S]*synthesizeWithMimoPowerShell[\s\S]*\}\s*=\s*mimoProcessService\);/,
  "app.js should expose MiMo process helpers by assigning from mimoProcessService"
);

assert.match(
  appSource,
  /synthesizeWithMimoPowerShell:\s*\(\.\.\.args\)\s*=>\s*synthesizeWithMimoPowerShell\(\.\.\.args\)/,
  "app.js should inject MiMo fallback into createAppContext through a deferred callback"
);

console.log("app-mimo-wrapper-shell tests passed");
