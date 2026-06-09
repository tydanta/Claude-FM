import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const appSource = fs.readFileSync(path.join(repoRoot, "src/server/app.js"), "utf8");

const playlistMetadataWrapperNames = [
  "ensurePlaybackPlaylist",
  "refreshNeteasePlaylistMetadata"
];

for (const name of playlistMetadataWrapperNames) {
  assert.doesNotMatch(
    appSource,
    new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`),
    `app.js should destructure ${name} from neteasePlaylistMetadataService instead of redeclaring a thin wrapper`
  );
}

assert.match(
  appSource,
  /const\s*\{[\s\S]*ensurePlaybackPlaylist[\s\S]*refreshNeteasePlaylistMetadata[\s\S]*\}\s*=\s*neteasePlaylistMetadataService;/,
  "app.js should expose playlist metadata helpers by destructuring neteasePlaylistMetadataService"
);

console.log("app-playlist-metadata-wrapper-shell tests passed");
