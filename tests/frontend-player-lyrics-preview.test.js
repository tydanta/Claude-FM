import assert from "node:assert/strict";
import fs from "node:fs";

const runtimeSource = fs.readFileSync(
  new URL("../public/modules/player/lyricsRuntimeController.js", import.meta.url),
  "utf8"
);
const mainSource = fs.readFileSync(new URL("../public/modules/main.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

assert.match(
  runtimeSource,
  /player-lyric-item\s+player-lyric-empty/,
  "player lyric loading/empty state should use a dedicated centered item class"
);

assert.match(
  css,
  /body\[data-page="player"\]\s+#playerPage\s+\.player-lyric-empty\s*\{[^}]*grid-template-columns:\s*minmax\(0px,\s*1fr\)[^}]*min-height:\s*calc\(58dvh - 8px\)\s*!important[^}]*place-items:\s*center\s*!important/i,
  "player lyric loading/empty state should sit in the center of the lyric viewport"
);

assert.match(
  css,
  /body\[data-page="player"\]\s+#playerPage\s+\.player-lyrics\s*\{[^}]*overflow-anchor:\s*none\s*!important/i,
  "player lyrics should disable browser scroll anchoring so long lyric lists do not keep stale scroll positions"
);

assert.match(
  runtimeSource,
  /function\s+previewPlayerLyricIndex\s*\(/,
  "lyrics runtime should expose a manual preview helper for clicked lyric rows"
);

assert.match(
  runtimeSource,
  /const\s+PLAYER_LYRIC_USER_IDLE_MS\s*=\s*2000/,
  "manual lyric preview should return to auto-follow after 2 seconds without user input"
);

assert.match(
  runtimeSource,
  /const\s+PLAYER_LYRIC_MANUAL_SCROLL_GRACE_MS\s*=\s*900/,
  "lyric preview should only be armed by a recent manual gesture"
);

assert.match(
  runtimeSource,
  /if\s*\(nowFn\(\)\s*>\s*playerLyricManualGestureUntil\)\s*return;/,
  "programmatic lyric scrolling should not show the manual preview frame"
);

assert.match(
  runtimeSource,
  /function\s+centerActivePlayerLyric\s*\(/,
  "player lyrics should use a shared current-line centering helper"
);

assert.match(
  runtimeSource,
  /function\s+schedulePlayerLyricAutoResume\s*\(/,
  "manual lyric scrolling should schedule an auto-follow resume instead of waiting for the next lyric change"
);

assert.match(
  runtimeSource,
  /schedulePlayerLyricAutoResume\(\)[\s\S]*centerActivePlayerLyric\(\{ animated: true \}\)/,
  "manual lyric auto-resume should actively center the current lyric after the idle timeout"
);

assert.match(
  runtimeSource,
  /handlePlayerLyricsPointerInteraction[\s\S]*playerLyricUserScrollUntil\s*=\s*nowFn\(\)\s*\+\s*PLAYER_LYRIC_USER_IDLE_MS[\s\S]*updatePlayerLyricPreviewFromScroll\(\)/,
  "manual lyric pointer interaction should arm preview without moving the scroll position first"
);

assert.doesNotMatch(
  runtimeSource,
  /anchorPlayerLyricsToCurrentHit\(\)/,
  "manual lyric pointer interaction should not force-scroll back to the current hit line"
);

assert.match(
  mainSource,
  /const\s+lyricItem\s*=\s*event\.target\.closest\("\[data-player-lyric-index\]"\)/,
  "player lyrics click handler should detect manual lyric row clicks"
);

assert.match(
  mainSource,
  /previewPlayerLyricIndex\(Number\(lyricItem\.dataset\.playerLyricIndex\)\)/,
  "manual lyric row clicks should mark the clicked line as the preview hit"
);

assert.match(
  mainSource,
  /if\s*\(!button\)\s*return;/,
  "manual lyric row clicks should not seek until the right-side play button is clicked"
);


assert.match(
  mainSource,
  /const\s+wasLyricSeekSelected\s*=\s*Boolean\([\s\S]*?classList\?\.contains\("is-preview"\)[\s\S]*?\)/,
  "player lyric seek should remember whether the row was selected before this click marks preview"
);

assert.match(
  mainSource,
  /if\s*\(button\s*&&\s*!wasLyricSeekSelected\)\s*return;/,
  "player lyric seek button should only seek after the lyric row was already selected"
);
console.log("frontend player lyrics preview tests passed");



