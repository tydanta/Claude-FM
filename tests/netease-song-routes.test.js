import assert from "node:assert/strict";
import { registerNeteaseSongRoutes } from "../src/server/routes/netease-song-routes.js";
import { createRouter } from "../src/server/router.js";

function createHarness(overrides = {}) {
  const sent = [];
  const calls = [];
  const router = createRouter();
  const deps = {
    config: { neteaseAudioLevel: "standard" },
    normalizeNeteaseAudioLevel: (level) => String(level || "standard").toLowerCase(),
    getNeteaseSongUrl: async (id, level, options) => {
      calls.push(["songUrl", id, level, options]);
      return { url: `https://music.example/${id}-${level}.mp3`, cached: false, expiresAt: 123 };
    },
    readNeteaseUrlCache: () => null,
    getLocalTrackBySourceId: () => null,
    getNeteaseLyrics: async (id, options) => {
      calls.push(["lyrics", id, options]);
      return { source: "netease", sourceId: id, lyric: "lyric", translatedLyric: "", romajiLyric: "", cached: false };
    },
    prefetchNeteaseSongUrls: (ids, level, limit) => calls.push(["prefetch", ids, level, limit]),
    parseBody: async (req) => req.body,
    warn: (...args) => calls.push(["warn", ...args]),
    sendJson: (res, status, payload) => sent.push({ status, payload }),
    ...overrides
  };
  registerNeteaseSongRoutes(router, deps);
  return { router, sent, calls };
}

{
  const { router, sent, calls } = createHarness();
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/song/url?id=100&level=HiRes&refresh=1")
  });
  assert.deepEqual(sent, [{
    status: 200,
    payload: { ok: true, id: "100", src: "https://music.example/100-hires.mp3", cached: false, stale: false, expiresAt: 123 }
  }]);
  assert.deepEqual(calls[0], ["songUrl", "100", "hires", { metadata: true, refresh: true }]);
}

{
  const { router, sent } = createHarness();
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/song/url")
  });
  assert.deepEqual(sent, [{ status: 400, payload: { error: "Song id is required" } }]);
}

{
  const { router, sent, calls } = createHarness({
    getNeteaseSongUrl: async () => {
      throw new Error("remote down");
    },
    readNeteaseUrlCache: (id, level, options) => {
      calls.push(["readCache", id, level, options]);
      return { url: "https://cache.example/stale.mp3", expiresAt: 9 };
    }
  });
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/song/url?id=200")
  });
  assert.equal(sent[0].payload.src, "https://cache.example/stale.mp3");
  assert.equal(sent[0].payload.cached, true);
  assert.equal(sent[0].payload.stale, true);
  assert.deepEqual(calls.find((call) => call[0] === "readCache"), ["readCache", "200", "standard", { allowExpired: true }]);
}

{
  const error = new Error("trial only");
  error.code = "NETEASE_FREE_TRIAL_ONLY";
  error.songId = "250";
  error.trial = { freeTrialInfo: { start: 0, end: 30 } };
  const { router, sent, calls } = createHarness({
    getNeteaseSongUrl: async () => {
      throw error;
    },
    readNeteaseUrlCache: () => {
      calls.push(["readCache"]);
      return { url: "https://cache.example/stale.mp3", expiresAt: 9 };
    },
    getLocalTrackBySourceId: () => ({ src: "file:///local.mp3" })
  });
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/song/url?id=250")
  });
  assert.deepEqual(sent, [{
    status: 403,
    payload: {
      ok: false,
      code: "NETEASE_FREE_TRIAL_ONLY",
      error: "这首歌网易云只返回 30 秒试听，暂时无法播放完整版。",
      id: "250",
      trial: { freeTrialInfo: { start: 0, end: 30 } }
    }
  }]);
  assert.equal(calls.some((call) => call[0] === "readCache"), false);
}

{
  const { router, sent } = createHarness({
    getNeteaseSongUrl: async () => {
      throw new Error("remote down");
    },
    getLocalTrackBySourceId: () => ({ src: "file:///local.mp3" })
  });
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/song/url?id=300")
  });
  assert.deepEqual(sent[0], {
    status: 200,
    payload: { ok: true, id: "300", src: "file:///local.mp3", cached: true, stale: true, expiresAt: 0 }
  });
}

{
  const { router, sent, calls } = createHarness();
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/lyrics?source=local&id=abc")
  });
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/lyrics?source=netease&id=100&refresh=1")
  });
  assert.deepEqual(sent[0], {
    status: 200,
    payload: { ok: true, source: "local", sourceId: "abc", lyric: "", translatedLyric: "", romajiLyric: "", cached: true }
  });
  assert.deepEqual(sent[1], {
    status: 200,
    payload: { ok: true, source: "netease", sourceId: "100", lyric: "lyric", translatedLyric: "", romajiLyric: "", cached: false }
  });
  assert.deepEqual(calls.find((call) => call[0] === "lyrics"), ["lyrics", "100", { refresh: true }]);
}

{
  const { router, sent, calls } = createHarness();
  await router.handle({
    req: { method: "POST", body: { ids: ["1", "", "2", "3"], level: "LossLess", limit: 2 } },
    res: {},
    url: new URL("http://localhost/api/netease/song/url/prefetch")
  });
  assert.deepEqual(sent.at(-1), { status: 200, payload: { ok: true, count: 2 } });
  assert.deepEqual(calls.at(-1), ["prefetch", ["1", "", "2", "3"], "lossless", 2]);
}

console.log("netease-song-routes tests passed");
