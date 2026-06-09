import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");
const compactCss = css.replace(/\s+/g, " ");

const lastValueFor = (name) => {
  const matches = [...css.matchAll(new RegExp(`${name}:\\s*([^;]+);`, "g"))];
  assert.ok(matches.length > 0, `${name} should be declared`);
  return matches.at(-1)[1].trim();
};

assert.match(
  compactCss,
  /--app-top-mask-height:\s*calc\(52px \+ env\(safe-area-inset-top\)\)/i,
  "top fixed bar should use a tighter mask height with a little extra room"
);

assert.match(
  compactCss,
  /--app-top-chrome-height:\s*calc\(52px \+ env\(safe-area-inset-top\)\)/i,
  "mine fixed top chrome should share the same tighter height"
);

assert.equal(
  lastValueFor("--app-top-mask-height"),
  "calc(52px + env(safe-area-inset-top))",
  "the effective top mask height should not be overwritten by a later taller declaration"
);

assert.equal(
  lastValueFor("--app-top-chrome-height"),
  "calc(52px + env(safe-area-inset-top))",
  "the effective mine top chrome height should match the top mask"
);

assert.match(
  compactCss,
  /--app-top-control-top:\s*max\(5px, env\(safe-area-inset-top\)\)/i,
  "top controls should sit closer to the top edge while still respecting the safe area"
);

assert.match(
  compactCss,
  /\.mine-sticky-top, \.mine-playlist-detail \.playlist-detail-topbar \{[^}]*padding:\s*var\(--app-top-control-top\) var\(--app-shell-left\) 5px !important;/i,
  "the fixed top chrome should not keep the old 24px top padding"
);

assert.match(
  compactCss,
  /\.app-top-layer, \.app-top-layer\.mine-sticky-top \{[^}]*padding:\s*var\(--app-top-control-top\) 8px 5px !important;/i,
  "the app top layer should keep only a small bottom reserve below the 42px controls"
);

assert.match(
  compactCss,
  /body\[data-page="mine"\] \.mine-page \{ padding-top:\s*calc\(var\(--app-top-mask-height\) \+ 2px\) !important;/i,
  "mine content should not keep the old 8px gap under the fixed top bar"
);

console.log("css top fixed bar height tests passed");
