import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

const blockMatch = css.match(/\/\* Artist and album detail back alignment \*\/(?<block>[\s\S]*?)(?:\/\* Artist album list mode \*\/|$)/);
assert.ok(blockMatch, "styles.css should include an artist and album detail back alignment block");

const block = blockMatch.groups.block;

assert.ok(block.includes('body[data-page="artist"] .artist-detail-topbar'), "artist detail topbar should have page-specific alignment");
assert.ok(block.includes('body[data-page="artist"] .artist-profile-back'), "artist back button should have page-specific alignment");
assert.ok(block.includes('body[data-page="artist"] .artist-profile-back span'), "artist back icon should have page-specific visual alignment");
assert.ok(block.includes('body[data-page="album"] .album-detail-topbar'), "album detail topbar should share secondary page alignment");
assert.ok(block.includes('body[data-page="album"] .album-back-btn'), "album back button should share secondary page alignment");
assert.ok(block.includes('body[data-page="album"] .album-back-btn span'), "album back icon should share secondary page visual alignment");
assert.match(block, /top:\s*0px\s*!important/i, "artist back row should move upward from the card");
assert.match(block, /margin-bottom:\s*18px\s*!important/i, "artist back row should leave more space before the artist profile card");
assert.match(block, /justify-content:\s*flex-start\s*!important/i, "artist back row should align to the left edge of the card");
assert.match(block, /place-items:\s*center\s+start\s*!important/i, "artist back button should align the icon to the left of its hit area");
assert.match(block, /transform:\s*translateX\(2px\)\s+rotate\(45deg\)\s*!important/i, "artist back chevron should keep the same chevron geometry");

console.log("css artist back alignment tests passed");
