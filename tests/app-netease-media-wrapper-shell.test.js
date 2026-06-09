import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const appSource = fs.readFileSync(path.join(repoRoot, "src/server/app.js"), "utf8");

const neteaseMediaWrapperNames = [
  "getNeteaseUrlCacheTtlMs",
  "readNeteaseUrlCache",
  "writeNeteaseUrlCache",
  "cleanupNeteaseUrlCache",
  "readLyricsCache",
  "writeLyricsCache",
  "getNeteaseLyrics",
  "getNeteaseSongUrl",
  "prefetchNeteaseSongUrls",
  "mapNeteaseTracksWithUrls"
];

for (const name of neteaseMediaWrapperNames) {
  assert.doesNotMatch(
    appSource,
    new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`),
    `app.js should destructure ${name} from neteaseMediaService instead of redeclaring a thin wrapper`
  );
}

assert.match(
  appSource,
  /\(\s*\{[\s\S]*getNeteaseUrlCacheTtlMs[\s\S]*mapNeteaseTracksWithUrls[\s\S]*\}\s*=\s*neteaseMediaService\s*\);/,
  "app.js should expose netease media helpers by destructuring neteaseMediaService"
);

assert.match(
  appSource,
  /getNeteaseSongUrl:\s*\(\.\.\.args\)\s*=>\s*getNeteaseSongUrl\(\.\.\.args\)/,
  "app.js should pass a deferred getNeteaseSongUrl callback into createAppContext until neteaseMediaService is initialized"
);

console.log("app-netease-media-wrapper-shell tests passed");
