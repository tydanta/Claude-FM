import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.resolve(import.meta.dirname, "../public/styles.css"), "utf8");

assert.match(css, /\.queue-panel-item\s*\{[^}]*min-height:\s*44px/s);
assert.match(css, /\.queue-panel-item\s*\{[^}]*grid-template-columns:\s*22px minmax\(0px, 1fr\) 50px/s);
assert.match(css, /\.queue-panel-copy strong\s*\{[^}]*font-size:\s*12px/s);
assert.match(css, /#playerQueuePanel \.queue-panel-item\s*\{[^}]*height:\s*46px/s);
assert.match(css, /#playerQueuePanel \.queue-panel-index\s*\{[^}]*color:\s*rgb\(255, 255, 255\)\s*!important/s, "player queue index should be white");
assert.match(css, /#playerQueuePanel \.queue-panel-index\s*\{[^}]*display:\s*grid\s*!important[^}]*place-items:\s*center\s*!important[^}]*text-align:\s*center\s*!important/s, "player queue index should center its number");
assert.match(css, /body\[data-page="radio"\] #queuePopover \.queue-panel-item\s*\{[^}]*grid-template-columns:\s*22px minmax\(0px, 1fr\) 62px/s);
assert.match(css, /\.playlist-card\s*\{[^}]*grid-template-columns:\s*52px minmax\(0px, 1fr\) 48px/s, "playlist count should use a fixed right column");
assert.match(css, /\.playlist-count\s*\{[^}]*min-width:\s*48px[^}]*text-align:\s*right/s, "playlist count should align to the right edge");
assert.match(css, /body\[data-page="mine"\]\[data-mine-view="list"\] \.mine-playlist-list \.playlist-card[^}]*grid-template-columns:\s*42px minmax\(0px, 1fr\) 48px\s*!important/s, "compact playlist count should keep the same fixed column");
assert.match(css, /body\[data-page="player"\] #playerPage \.player-lyric-seek-btn:focus,[\s\S]*?body\[data-page="player"\] #playerPage \.player-lyric-seek-btn:focus-visible,[\s\S]*?body\[data-page="player"\] #playerPage \.player-lyric-seek-btn:active\s*\{[^}]*outline:\s*none\s*!important[^}]*box-shadow:\s*none\s*!important[^}]*-webkit-tap-highlight-color:\s*transparent\s*!important/s, "player lyric seek button should not show a blue focus box");
assert.match(css, /body\[data-page="mine"\]\[data-mine-view="detail"\] #playlistTrackList \.mine-track-item:active,[\s\S]*?#artistSongList \.mine-track-item:active,[\s\S]*?#albumTrackList \.mine-track-item:active,[\s\S]*?#musicSearchPageList \.mine-track-item:active,[\s\S]*?\.radio-recommend-panel \.playlist-track-list \.mine-track-item:active,[\s\S]*?body\[data-surface="liquid"\] #musicSearchPageList \.mine-track-item:active,[\s\S]*?body\[data-surface="liquid"\] \.radio-recommend-panel \.playlist-track-list \.mine-track-item:active\s*\{[^}]*background:\s*rgba\(255, 255, 255, 0\.08\)\s*!important[^}]*box-shadow:\s*inset 0 0 0 1px rgba\(255, 255, 255, 0\.14\)\s*!important/s, "compact track rows should show the translucent frame only while pressed");
assert.doesNotMatch(css, /#playlistTrackList \.mine-track-item\.is-current,[\s\S]*?background:\s*rgba\(255, 255, 255, 0\.08\)/, "compact current track rows should not keep the pressed frame after release");
assert.doesNotMatch(css, /\.mine-track-item:hover,\s*\.mine-track-item\.is-current\s*\{[^}]*background:\s*rgba\(97, 242, 143, 0\.09\)/, "base track row visual feedback should not persist on is-current");
assert.doesNotMatch(css, /body\[data-theme="light"\]\s+body\[data-page="mine"\]/, "light current row selector should not target a nested body");

console.log("css global queue density tests passed");






