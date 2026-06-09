import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const readText = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

const main = readText("public/modules/main.js");
const mediaSession = readText("public/modules/androidMediaSession.js");

assert.match(main, /from "\.\/androidMediaSession\.js"/);
assert.match(main, /createAndroidMediaSessionController/);
assert.match(main, /syncAndroidMediaSession\(/);
assert.match(main, /bindAndroidMediaSessionEvents\(/);
assert.match(main, /function getAndroidMediaPosition\(/);
assert.match(main, /position:\s*getAndroidMediaPosition\(\)/);
assert.match(mediaSession, /ClaudeMedia/);
assert.match(mediaSession, /mediaAction/);
assert.match(mediaSession, /update\(/);
assert.match(mediaSession, /requestNotificationPermission/);
assert.match(mediaSession, /previous/);
assert.match(mediaSession, /playPause/);
assert.match(mediaSession, /next/);
assert.match(mediaSession, /like/);

console.log("frontend android media session tests passed");
