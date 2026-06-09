import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../public/modules/main.js", import.meta.url), "utf8");

assert.match(
  source,
  /function\s+syncCurrentTrackLikeState\s*\(\)\s*\{[\s\S]*?setCurrentTrackLiked\(isTrackLiked\(model\.track\)\)/,
  "main.js should expose a single helper that reapplies the current track liked state from loaded playlists"
);

const loadMatch = source.match(/async function loadNeteasePlaylists[\s\S]*?\n\}/);
assert.ok(loadMatch, "main.js should keep a loadNeteasePlaylists wrapper");
assert.match(
  loadMatch[0],
  /const data = await mineController\?\.loadNeteasePlaylists/,
  "loadNeteasePlaylists should keep delegating to mineController"
);
assert.match(
  loadMatch[0],
  /syncCurrentTrackLikeState\(\)/,
  "loadNeteasePlaylists should refresh the current heart after playlists are loaded"
);
assert.match(
  loadMatch[0],
  /return data/,
  "loadNeteasePlaylists should still return the playlist payload"
);

const snapshotMatch = source.match(/function applyNeteaseDbSnapshot[\s\S]*?\n\}/);
assert.ok(snapshotMatch, "main.js should keep an applyNeteaseDbSnapshot wrapper");
assert.match(
  snapshotMatch[0],
  /syncCurrentTrackLikeState\(\)/,
  "applyNeteaseDbSnapshot should refresh the current heart after liked playlist snapshots change"
);

const detailMatch = source.match(/async function loadNeteasePlaylistDetail[\s\S]*?\n\}/);
assert.ok(detailMatch, "main.js should keep a loadNeteasePlaylistDetail helper");
assert.match(
  detailMatch[0],
  /replaceNeteasePlaylist\(playlist\.id,\s*nextPlaylist\)/,
  "loadNeteasePlaylistDetail should still merge loaded playlist detail"
);
assert.match(
  detailMatch[0],
  /syncCurrentTrackLikeState\(\)/,
  "loadNeteasePlaylistDetail should refresh the current heart after async liked playlist detail loads"
);

console.log("frontend like state refresh tests passed");
