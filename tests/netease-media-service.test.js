import assert from "node:assert/strict";
import { createNeteaseMediaService } from "../src/server/netease-media-service.js";

const calls = [];
const urlCache = new Map();
const lyricsCache = new Map();
const updatedSrc = [];
const warnings = [];
const microtasks = [];

function createService() {
  return createNeteaseMediaService({
    config: {
      neteaseAudioLevel: "standard",
      neteaseUrlCacheTtlMinutes: 2
    },
    cacheRepository: {
      readNeteaseUrl: (songId, level, options) => {
        calls.push(["readUrl", songId, level, options]);
        return urlCache.get(`${songId}:${level}`) || null;
      },
      writeNeteaseUrl: (songId, level, url, options) => {
        calls.push(["writeUrl", songId, level, url, options]);
        urlCache.set(`${songId}:${level}`, {
          url,
          expiresAt: 5000,
          expired: false
        });
      },
      cleanupExpiredNeteaseUrls: () => {
        calls.push(["cleanupUrls"]);
        return 4;
      },
      readLyrics: (source, sourceId) => {
        calls.push(["readLyrics", source, sourceId]);
        return lyricsCache.get(`${source}:${sourceId}`) || null;
      },
      writeLyrics: (source, sourceId, payload) => {
        calls.push(["writeLyrics", source, sourceId, payload]);
        lyricsCache.set(`${source}:${sourceId}`, {
          ...payload,
          cached: true
        });
      }
    },
    neteaseRequest: async (pathname, params, options) => {
      calls.push(["request", pathname, params, options]);
      if (pathname === "/song/url/v1") {
        return { data: [{ url: `https://music.example/${params.id}-${params.level}.mp3` }] };
      }
      if (pathname === "/lyric/new") {
        if (params.id === "fallback") throw new Error("new lyric unavailable");
        if (params.id === "late") {
          return { lrc: { lyric: "[01:30.00]late line" } };
        }
        return {
          lrc: { lyric: "line" },
          tlyric: { lyric: "translation" },
          romalrc: { lyric: "roma" }
        };
      }
      if (pathname === "/lyric") {
        if (params.id === "late") {
          return { lrc: { lyric: "[00:03.00]early line\n[01:30.00]late line" } };
        }
        return { lrc: { lyric: "legacy" } };
      }
      return {};
    },
    normalizeNeteaseAudioLevel: (level) => String(level || "standard").toLowerCase(),
    trackRepository: {
      updateSrc: (id, src) => updatedSrc.push([id, src])
    },
    logger: {
      warn: (...args) => warnings.push(args)
    },
    now: () => 1000,
    queueMicrotaskFn: (fn) => microtasks.push(fn)
  });
}

const service = createService();

urlCache.set("100:hires", {
  url: "https://cache.example/100.mp3",
  expiresAt: 2000,
  expired: false
});
assert.deepEqual(await service.getNeteaseSongUrl("100", "HiRes", { metadata: true }), {
  url: "https://cache.example/100.mp3",
  cached: true,
  expiresAt: 2000
});
assert.equal(calls.some((call) => call[0] === "request"), false);

assert.deepEqual(await service.getNeteaseSongUrl("101", "Higher", { metadata: true, refresh: true }), {
  url: "https://music.example/101-higher.mp3",
  cached: false,
  expiresAt: 121000
});
assert.deepEqual(calls.find((call) => call[0] === "request"), [
  "request",
  "/song/url/v1",
  { id: "101", level: "higher" },
  { auth: true }
]);
assert.equal(urlCache.get("101:higher").url, "https://music.example/101-higher.mp3");

{
  const trialCalls = [];
  const trialService = createNeteaseMediaService({
    config: {
      neteaseAudioLevel: "standard",
      neteaseUrlCacheTtlMinutes: 2
    },
    cacheRepository: {
      readNeteaseUrl: () => null,
      writeNeteaseUrl: (...args) => trialCalls.push(["writeUrl", ...args]),
      cleanupExpiredNeteaseUrls: () => 0,
      readLyrics: () => null,
      writeLyrics: () => {}
    },
    neteaseRequest: async () => ({
      data: [{
        url: "https://music.example/trial.mp3",
        time: 30040,
        fee: 1,
        payed: 0,
        freeTrialInfo: { start: 0, end: 30 }
      }]
    }),
    normalizeNeteaseAudioLevel: (level) => String(level || "standard").toLowerCase(),
    trackRepository: { updateSrc: () => {} },
    now: () => 1000,
    queueMicrotaskFn: (fn) => microtasks.push(fn)
  });
  await assert.rejects(
    () => trialService.getNeteaseSongUrl("trial", "standard", { metadata: true, refresh: true }),
    /试听|trial/i
  );
  assert.equal(trialCalls.some((call) => call[0] === "writeUrl"), false);
}

lyricsCache.set("netease:200", {
  source: "netease",
  sourceId: "200",
  lyric: "cached",
  translatedLyric: "",
  romajiLyric: "",
  cached: true
});
assert.equal((await service.getNeteaseLyrics("200")).lyric, "cached");
assert.equal(calls.filter((call) => call[0] === "request" && call[1].startsWith("/lyric")).length, 0);

const freshLyrics = await service.getNeteaseLyrics("201", { refresh: true });
assert.deepEqual({
  source: freshLyrics.source,
  sourceId: freshLyrics.sourceId,
  lyric: freshLyrics.lyric,
  translatedLyric: freshLyrics.translatedLyric,
  romajiLyric: freshLyrics.romajiLyric,
  cached: freshLyrics.cached
}, {
  source: "netease",
  sourceId: "201",
  lyric: "line",
  translatedLyric: "translation",
  romajiLyric: "roma",
  cached: false
});
assert.equal(lyricsCache.get("netease:201").lyric, "line");

const fallbackLyrics = await service.getNeteaseLyrics("fallback", { refresh: true });
assert.equal(fallbackLyrics.lyric, "legacy");
assert.deepEqual(calls.find((call) => call[0] === "request" && call[1] === "/lyric" && call[2]?.id === "fallback"), [
  "request",
  "/lyric",
  { id: "fallback" },
  { auth: true }
]);

const lateLyrics = await service.getNeteaseLyrics("late", { refresh: true });
assert.equal(lateLyrics.lyric.startsWith("[00:03.00]early line"), true);

assert.equal(await service.getNeteaseLyrics(""), null);
assert.equal(service.cleanupNeteaseUrlCache(), 4);

urlCache.set("301:standard", { url: "cached", expiresAt: 2000, expired: false });
service.prefetchNeteaseSongUrls(["301", "", "302", "302", "303"], "standard", 3);
assert.equal(microtasks.length, 1);
await microtasks.shift()();
assert.equal(calls.some((call) => call[0] === "request" && call[2]?.id === "301"), false);
assert.equal(calls.some((call) => call[0] === "request" && call[2]?.id === "302"), true);
assert.equal(calls.some((call) => call[0] === "request" && call[2]?.id === "303"), true);

assert.deepEqual(await service.mapNeteaseTracksWithUrls([{ id: "a", sourceId: "401" }], { includeUrls: false }), [
  { id: "a", sourceId: "401" }
]);
const mapped = await service.mapNeteaseTracksWithUrls([
  { id: "a", sourceId: "401" },
  { id: "b", sourceId: "402", src: "existing.mp3" }
], { includeUrls: true });
assert.equal(mapped[0].src, "https://music.example/401-standard.mp3");
assert.equal(mapped[1].src, "existing.mp3");
assert.deepEqual(updatedSrc.at(-1), ["a", "https://music.example/401-standard.mp3"]);

console.log("netease-media-service tests passed");
