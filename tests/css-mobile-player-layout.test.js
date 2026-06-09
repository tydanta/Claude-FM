import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");
const blockMatch = css.match(/\/\* Mobile player layout \*\/(?<block>[\s\S]*)$/);

assert.ok(blockMatch, "styles.css should include a mobile player layout override block");

const block = blockMatch.groups.block;

assert.match(
  block,
  /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*body\[data-page="radio"\]\s+\.player-row\s*\{[^}]*grid-template-columns:\s*minmax\(0px,\s*1fr\)\s*!important/i,
  "home player card should become single-column on local preview and phone width"
);

assert.match(
  block,
  /body\[data-page="radio"\]\s+\.player-row\s+\.controls\s*\{[^}]*grid-column:\s*1\s*\/\s*-1\s*!important[^}]*justify-content:\s*space-between\s*!important/i,
  "home player buttons should move to a full-width second row"
);

assert.match(
  block,
  /body\[data-page="radio"\]\s+#queuePopover\s*\{[^}]*top:\s*calc\(100%\s*\+\s*8px\)\s*!important/i,
  "home queue popover should open below the two-row mobile player card"
);

assert.match(
  block,
  /body\[data-page="player"\]\s+#playerPage\.player-page\s*\{[^}]*--player-mobile-gutter:\s*clamp\(16px,\s*5vw,\s*22px\)/i,
  "player page should define a reusable mobile gutter"
);

assert.match(
  block,
  /body\[data-page="player"\]\s+#playerPage\s+\.player-lyrics\s*\{[^}]*max-height:\s*58dvh\s*!important[^}]*padding:\s*4px\s+0px\s*!important/i,
  "player lyrics should use a taller phone viewport with minimal edge padding"
);

assert.match(
  block,
  /body\[data-page="player"\]\s+#playerPage\s+\.player-lyric-track\s*\{[^}]*gap:\s*12px\s*!important/i,
  "player lyric track should keep compact mobile row spacing"
);

assert.match(
  block,
  /body\[data-page="player"\]\s+#playerPage\s+\.player-lyric-item\s*\{[^}]*font-size:\s*clamp\(14px,\s*4vw,\s*18px\)\s*!important[^}]*line-height:\s*1\.18\s*!important/i,
  "player lyric text should be smaller with tighter line height"
);

assert.match(
  block,
  /body\[data-page="player"\]\s+#playerPage\s+\.player-lyric-empty\s*\{[^}]*min-height:\s*calc\(58dvh - 8px\)\s*!important[^}]*place-items:\s*center\s*!important/i,
  "player lyric loading state should stay centered on phone layouts"
);

assert.match(
  block,
  /body\[data-page="player"\]\s+#playerPage\s+\.player-detail-timeline\s*\{[^}]*width:\s*calc\(100vw\s*-\s*var\(--player-mobile-gutter\)\s*\*\s*2\)\s*!important/i,
  "player timeline should align to the shared mobile gutter"
);

console.log("css mobile player layout tests passed");


