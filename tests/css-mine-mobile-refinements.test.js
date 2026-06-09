import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

const blockMatch = css.match(/\/\* Mine mobile refinements \*\/(?<block>[\s\S]*)$/);
assert.ok(blockMatch, "styles.css should include final mine mobile refinements");

const block = blockMatch.groups.block;

assert.match(
  block,
  /\.app-top-mine\s+\.search-page-btn,[\s\S]*?\.app-top-mine\s+\.settings-btn[\s\S]*?width:\s*42px\s*!important[\s\S]*?height:\s*42px\s*!important/i,
  "mine top search and settings buttons should share the same 42px touch size"
);
assert.match(block, /\.app-top-mine\s+\.search-page-btn\s*\{[\s\S]*?left:\s*12px\s*!important/i, "mine search button should be inset from the left edge");
assert.match(block, /\.app-top-mine\s+\.settings-btn\s*\{[\s\S]*?right:\s*12px\s*!important/i, "mine settings button should be inset from the right edge");
assert.doesNotMatch(block, /\.app-top-mine\s+\.search-page-btn\s*\{[\s\S]*?left:\s*-/i, "mine search button should not use negative left offset");
assert.doesNotMatch(block, /\.app-top-mine\s+\.settings-btn\s*\{[\s\S]*?right:\s*-/i, "mine settings button should not use negative right offset");

assert.match(
  block,
  /\.mine-page\s*>\s*\.profile-panel:not\(\.artist-profile-panel\)\s*>\s*\*[\s\S]*?transform:\s*translateY\(-14px\)\s*!important/i,
  "mine profile card content should move upward"
);

assert.match(
  block,
  /body\[data-page="artist"\]\s+\.artist-detail-topbar,[\s\S]*?body\[data-page="album"\]\s+\.album-detail-topbar[\s\S]*?padding-left:\s*12px\s*!important/i,
  "artist and album detail back topbars should be inset from the left edge"
);

const sharedTrackSelectors = /body\[data-page="mine"\]\[data-mine-view="detail"\]\s+#playlistTrackList,[\s\S]*?#artistSongList[\s\S]*?grid-auto-rows:\s*50px\s*!important/i;
assert.match(block, sharedTrackSelectors, "playlist detail and artist detail lists should share the compact row height");
assert.match(block, /#albumTrackList,[\s\S]*?grid-auto-rows:\s*50px\s*!important/i, "album detail list should share the compact row height");

assert.match(
  block,
  /body\[data-page="mine"\]\[data-mine-view="detail"\]\s+#playlistTrackList\s+\.mine-track-item,[\s\S]*?#artistSongList\s+\.mine-track-item[\s\S]*?height:\s*50px\s*!important[\s\S]*?min-height:\s*50px\s*!important/i,
  "playlist detail and artist detail track rows should share compact item height"
);
assert.match(
  block,
  /body\[data-page="mine"\]\[data-mine-view="detail"\]\s+#playlistTrackList\s+\.mine-track-play,[\s\S]*?#artistSongList\s+\.mine-track-play[\s\S]*?grid-template-columns:\s*26px\s+38px\s+minmax\(0px,\s*1fr\)\s+auto\s*!important[\s\S]*?gap:\s*7px\s*!important/i,
  "playlist detail and artist detail track content should use the same compact columns"
);
assert.match(
  block,
  /body\[data-page="mine"\]\[data-mine-view="detail"\]\s+#playlistTrackList\s+\.mine-track-cover,[\s\S]*?#artistSongList\s+\.mine-track-cover[\s\S]*?width:\s*38px\s*!important[\s\S]*?height:\s*38px\s*!important/i,
  "playlist detail and artist detail covers should share compact size"
);
assert.match(
  block,
  /body\[data-page="mine"\]\[data-mine-view="detail"\]\s+#playlistTrackList\s+\.mine-track-copy\s+strong,[\s\S]*?#artistSongList\s+\.mine-track-copy\s+strong[\s\S]*?font-size:\s*12\.5px\s*!important/i,
  "playlist detail and artist detail titles should share compact type"
);

console.log("css mine mobile refinement tests passed");
