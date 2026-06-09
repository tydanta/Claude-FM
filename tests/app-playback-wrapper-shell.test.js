import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const appSource = fs.readFileSync(path.join(repoRoot, "src/server/app.js"), "utf8");

const playbackWrapperNames = [
  "normalizePlaybackTrack",
  "normalizePlaybackPlaylist",
  "isRealNeteasePlaylist",
  "replacePlaybackQueueItems",
  "readPlaybackQueueItems",
  "savePlaybackState",
  "readPlaybackState"
];

for (const name of playbackWrapperNames) {
  assert.doesNotMatch(
    appSource,
    new RegExp(`function\\s+${name}\\s*\\(`),
    `app.js should destructure ${name} from playbackStateService instead of redeclaring a thin wrapper`
  );
}

assert.match(
  appSource,
  /const\s*\{[\s\S]*normalizePlaybackTrack[\s\S]*readPlaybackState[\s\S]*\}\s*=\s*playbackStateService;/,
  "app.js should expose playback state helpers by destructuring playbackStateService"
);

console.log("app-playback-wrapper-shell tests passed");
