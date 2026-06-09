import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const appSource = fs.readFileSync(path.join(repoRoot, "src/server/app.js"), "utf8");

const remoteSyncWrapperNames = [
  "getStoredNeteaseUserId",
  "extractRemotePlaylistTrackIds",
  "getRemoteLikedIds",
  "getRemotePlaylistTrackIds",
  "syncRemoteLikeState",
  "syncRemotePlaylistTracks",
  "syncNeteaseUserPlaylists",
  "syncNeteasePlaylistDetail",
  "syncAllNeteasePlaylistDetails",
  "scheduleNeteaseFullSync"
];

for (const name of remoteSyncWrapperNames) {
  assert.doesNotMatch(
    appSource,
    new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`),
    `app.js should destructure ${name} from neteaseRemoteSyncService instead of redeclaring a thin wrapper`
  );
}

assert.match(
  appSource,
  /const\s*\{[\s\S]*getStoredNeteaseUserId[\s\S]*extractRemotePlaylistTrackIds[\s\S]*getRemoteLikedIds[\s\S]*getRemotePlaylistTrackIds[\s\S]*syncRemoteLikeState[\s\S]*syncRemotePlaylistTracks[\s\S]*syncNeteaseUserPlaylists[\s\S]*syncNeteasePlaylistDetail[\s\S]*syncAllNeteasePlaylistDetails[\s\S]*scheduleNeteaseFullSync[\s\S]*\}\s*=\s*neteaseRemoteSyncService;/,
  "app.js should expose Netease remote sync helpers by destructuring neteaseRemoteSyncService"
);

console.log("app-netease-remote-sync-wrapper-shell tests passed");
