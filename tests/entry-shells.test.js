import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");

function readLines(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8").trim().split(/\r?\n/);
}

const serverLines = readLines("server.js");
const browserLines = readLines("public/app.js");

assert.ok(serverLines.length <= 20, `server.js should stay a thin entry shell, found ${serverLines.length} lines`);
assert.ok(browserLines.length <= 20, `public/app.js should stay a thin entry shell, found ${browserLines.length} lines`);
assert.match(serverLines.join("\n"), /startServer/, "server.js should delegate startup to src/server/app.js");
assert.match(browserLines.join("\n"), /bootstrap/, "public/app.js should delegate startup to public/modules/main.js");

console.log("entry-shells tests passed");
