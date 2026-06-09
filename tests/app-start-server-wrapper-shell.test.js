import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const appSource = fs.readFileSync(path.join(repoRoot, "src/server/app.js"), "utf8");

assert.doesNotMatch(
  appSource,
  /export\s+async\s+function\s+startServer\s*\(/,
  "app.js should export startServer from appHttpService instead of redeclaring a thin wrapper"
);

assert.match(
  appSource,
  /export\s+const\s+startServer\s*=\s*appHttpService\.startServer\s*;/,
  "app.js should keep the startServer export contract as a direct appHttpService binding"
);

console.log("app-start-server-wrapper-shell tests passed");
