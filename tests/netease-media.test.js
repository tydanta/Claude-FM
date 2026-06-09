import assert from "node:assert/strict";
import {
  buildCoverPreloadPlan,
  buildNeteaseAudioPreloadItems,
  getNeteaseAudioProxyUrl,
  getNeteaseCoverProxyUrl,
  getNeteaseCoverSize,
  preloadNeteaseAudio,
  preloadNeteaseCoverSlice,
  getNeteaseThumbnailUrl,
  shouldPreloadMoreCovers
} from "../public/modules/netease/neteaseMedia.js";

const cover = "https://p1.music.126.net/example.jpg?param=1000y1000";
const previousCordova = globalThis.cordova;

assert.equal(getNeteaseCoverSize("list"), 200);
assert.equal(getNeteaseCoverSize("list-small"), 140);
assert.equal(getNeteaseCoverSize("grid-small"), 240);
assert.equal(getNeteaseCoverSize("player"), 800);
assert.equal(getNeteaseCoverSize("player-large"), 1000);

assert.equal(
  getNeteaseCoverProxyUrl(cover, "list"),
  `/api/media/cover?url=${encodeURIComponent(cover)}&size=200`
);

assert.equal(
  getNeteaseAudioProxyUrl({ sourceId: "123", src: "https://m701.music.126.net/song.mp3" }),
  `/api/media/audio?songId=123&url=${encodeURIComponent("https://m701.music.126.net/song.mp3")}`
);

assert.equal(getNeteaseAudioProxyUrl({ sourceId: "123" }), "/api/media/audio?songId=123");

globalThis.cordova = {};
assert.equal(getNeteaseCoverSize("list"), 120);
assert.equal(getNeteaseCoverSize("grid"), 180);
assert.equal(getNeteaseCoverSize("detail"), 360);
assert.equal(
  getNeteaseCoverProxyUrl("http://p1.music.126.net/android.jpg?param=100y100", "list"),
  "https://p1.music.126.net/android.jpg?param=120y120"
);
assert.equal(
  getNeteaseThumbnailUrl("https://p1.music.126.net/android.jpg", "grid"),
  "https://p1.music.126.net/android.jpg?param=180y180"
);
assert.equal(
  getNeteaseAudioProxyUrl({ sourceId: "123", src: "http://m701.music.126.net/song.mp3" }),
  `http://127.0.0.1:3011/claude/media/audio?url=${encodeURIComponent("https://m701.music.126.net/song.mp3")}&songId=123`
);
assert.equal(getNeteaseAudioProxyUrl({ sourceId: "123" }), "");
if (previousCordova === undefined) delete globalThis.cordova;
else globalThis.cordova = previousCordova;

const tracks = Array.from({ length: 55 }, (_, index) => ({
  cover: `https://p1.music.126.net/${index}.jpg`
}));
assert.deepEqual(buildCoverPreloadPlan(tracks, "list"), [
  { target: "list", start: 0, end: 20, priority: "high", items: 20 },
  { target: "list", start: 20, end: 40, priority: "low", items: 20 }
]);
assert.equal(shouldPreloadMoreCovers({ scrollTop: 760, clientHeight: 300, scrollHeight: 1200 }), true);
assert.equal(shouldPreloadMoreCovers({ scrollTop: 100, clientHeight: 300, scrollHeight: 1200 }), false);

assert.deepEqual(
  buildNeteaseAudioPreloadItems([
    { source: "netease", sourceId: "1", src: "https://m701.music.126.net/1.mp3" },
    { source: "netease", sourceId: "2", src: "https://m701.music.126.net/2.mp3" },
    { source: "netease", sourceId: "3" },
    { source: "netease", sourceId: "4" }
  ], 10).map((item) => item.songId),
  ["1", "2", "3"]
);

{
  const calls = [];
  globalThis.cordova = {};
  preloadNeteaseCoverSlice([
    { cover: "https://p1.music.126.net/a.jpg" }
  ], {
    api: (path, options) => {
      calls.push({ path, options });
      return Promise.resolve({});
    },
    limit: 10,
    target: "grid"
  });
  preloadNeteaseAudio([
    { source: "netease", sourceId: "1", src: "https://m701.music.126.net/1.mp3" }
  ], 3, {
    api: (path, options) => {
      calls.push({ path, options });
      return Promise.resolve({});
    }
  });
  assert.deepEqual(calls, []);
  if (previousCordova === undefined) delete globalThis.cordova;
  else globalThis.cordova = previousCordova;
}

{
  const calls = [];
  preloadNeteaseCoverSlice([
    { cover: "https://p1.music.126.net/a.jpg" },
    { cover: "https://cdn.example/a.jpg" }
  ], {
    api: (path, options) => {
      calls.push({ path, options });
      return Promise.resolve({});
    },
    limit: 10,
    priority: "low",
    target: "grid"
  });
  assert.equal(calls[0].path, "/api/media/preload-covers");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    items: [{ url: "https://p1.music.126.net/a.jpg", size: 300 }],
    priority: "low"
  });
}

{
  const calls = [];
  preloadNeteaseAudio([
    { source: "netease", sourceId: "1", src: "https://m701.music.126.net/1.mp3" }
  ], 3, {
    api: (path, options) => {
      calls.push({ path, options });
      return Promise.resolve({});
    }
  });
  assert.equal(calls[0].path, "/api/media/preload-audio");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    items: [{ songId: "1", url: "https://m701.music.126.net/1.mp3" }]
  });
}

console.log("netease-media tests passed");
