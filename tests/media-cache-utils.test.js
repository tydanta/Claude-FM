import assert from "node:assert/strict";
import {
  buildCoverSizedUrl,
  buildShardedCachePath,
  createMediaCacheKey,
  pickLruCacheVictims,
  parseRangeHeader
} from "../src/server/media-cache-utils.js";

assert.equal(
  buildCoverSizedUrl("https://p1.music.126.net/example.jpg?imageView=1", 200),
  "https://p1.music.126.net/example.jpg?param=200y200"
);

assert.equal(
  buildCoverSizedUrl("https://p1.music.126.net/example.jpg?param=1000y1000", 300),
  "https://p1.music.126.net/example.jpg?param=300y300"
);

const coverKey = createMediaCacheKey(["https://p1.music.126.net/example.jpg", 200]);
assert.match(coverKey, /^[a-f0-9]{40}$/);

assert.equal(
  buildShardedCachePath("D:/cache/covers", "abcdef123456", ".jpg").replaceAll("\\", "/"),
  "D:/cache/covers/ab/abcdef123456.jpg"
);

assert.deepEqual(parseRangeHeader("bytes=0-1023", 4096), {
  start: 0,
  end: 1023,
  chunkSize: 1024
});

assert.deepEqual(parseRangeHeader("bytes=1024-", 4096), {
  start: 1024,
  end: 4095,
  chunkSize: 3072
});

assert.equal(parseRangeHeader("items=0-1", 4096), null);

assert.deepEqual(
  pickLruCacheVictims([
    { cacheKey: "current", bytes: 100, lastAccessAt: 1, protected: true },
    { cacheKey: "old", bytes: 100, lastAccessAt: 2 },
    { cacheKey: "older", bytes: 100, lastAccessAt: 1 },
    { cacheKey: "new", bytes: 100, lastAccessAt: 3 }
  ], 250),
  ["older", "old"]
);

console.log("media-cache-utils tests passed");
